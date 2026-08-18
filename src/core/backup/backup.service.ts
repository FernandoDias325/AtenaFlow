/**
 * backup.service.ts — Serviço de exportação e importação manual.
 *
 * Exporta a base (Scripts e Categorias) como arquivo JSON.
 * Importa usando uma transação atômica do IndexedDB para garantir
 * integridade referencial.
 *
 * Estratégia de importação: Merge/Upsert (Mesclar).
 * - Scripts com mesmo ID são atualizados.
 * - Scripts novos são adicionados.
 * - Scripts existentes na extensão mas não no arquivo SÃO MANTIDOS.
 */

import { getDB } from '../db/schema';
import type { Script, Category, Link } from '../models/types';
import { normalizeHttpUrl } from '../validation/url';
import { reconcileReminderAlarms } from '../reminders/reminder.service';

export interface ExportData {
  version: 1 | 2 | 3;
  timestamp: number;
  categories: Category[];
  scripts: Script[];
  links?: Link[];
  preferences?: BackupPreferences;
}

export interface BackupPreferences {
  chromeStorage: Record<string, unknown>;
  localStorage: Record<string, string>;
}

export interface ImportDuplicate {
  key: string;
  type: 'script' | 'link';
  existing: Script | Link;
  incoming: Script | Link;
  similarity: number;
}

export type DuplicateDecision = 'keep-existing' | 'replace-existing' | 'keep-both';

export interface ImportOptions {
  duplicateDecisions?: Record<string, DuplicateDecision>;
}

interface SafetySnapshot {
  createdAt: number;
  categories: Category[];
  scripts: Script[];
  links: Link[];
  preferences: BackupPreferences;
}

const MAX_IMPORT_ITEMS = 20_000;
const MAX_TITLE_LENGTH = 500;
const MAX_BODY_LENGTH = 1_000_000;
const PRE_IMPORT_SNAPSHOT_ID = 'pre-import-safety-snapshot';
const PREFERENCE_LOCAL_KEYS = [
  'atenaflow-theme',
  'atenaflow-list-density',
  'atenaflow-uncategorized-order'
];

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Campo inválido no backup: ${field}.`);
  }
  return value;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeCategory(value: unknown): Category {
  if (!value || typeof value !== 'object') {
    throw new Error('Categoria inválida no backup.');
  }
  const item = value as Record<string, unknown>;
  return {
    id: requiredString(item['id'], 'categories.id', 200),
    name: requiredString(item['name'], 'categories.name', MAX_TITLE_LENGTH),
    color:
      typeof item['color'] === 'string' && item['color'].length <= 100 ? item['color'] : '#64748b',
    order: finiteNumber(item['order'], 0),
    createdAt: finiteNumber(item['createdAt'], Date.now())
  };
}

function normalizeScript(value: unknown, categoryIds: Set<string>): Script {
  if (!value || typeof value !== 'object') {
    throw new Error('Script inválido no backup.');
  }
  const item = value as Record<string, unknown>;
  const now = Date.now();
  const categoryId =
    typeof item['categoryId'] === 'string' && categoryIds.has(item['categoryId'])
      ? item['categoryId']
      : null;
  return {
    id: requiredString(item['id'], 'scripts.id', 200),
    title: requiredString(item['title'], 'scripts.title', MAX_TITLE_LENGTH),
    body: requiredString(item['body'], 'scripts.body', MAX_BODY_LENGTH),
    categoryId,
    tags: Array.isArray(item['tags'])
      ? item['tags'].filter((tag): tag is string => typeof tag === 'string').slice(0, 100)
      : [],
    isFavorite: item['isFavorite'] === true,
    isPinned: item['isPinned'] === true,
    usageCount: 0,
    createdAt: finiteNumber(item['createdAt'], now),
    updatedAt: finiteNumber(item['updatedAt'], now),
    deletedAt: null,
    ...(typeof item['notes'] === 'string' && item['notes'].length <= MAX_BODY_LENGTH
      ? { notes: item['notes'] }
      : {}),
    ...(typeof item['colorTag'] === 'string' && item['colorTag'].length <= 100
      ? { colorTag: item['colorTag'] }
      : {})
  };
}

function normalizeLink(value: unknown): Link {
  if (!value || typeof value !== 'object') {
    throw new Error('Link inválido no backup.');
  }
  const item = value as Record<string, unknown>;
  const rawUrl = requiredString(item['url'], 'links.url', 4_096);
  const url = normalizeHttpUrl(rawUrl);
  if (!url) {
    throw new Error('URL inválida ou insegura encontrada no backup.');
  }
  return {
    id: requiredString(item['id'], 'links.id', 200),
    title: requiredString(item['title'], 'links.title', MAX_TITLE_LENGTH),
    url,
    order: finiteNumber(item['order'], 0),
    createdAt: finiteNumber(item['createdAt'], Date.now()),
    usageCount: finiteNumber(item['usageCount'], 0),
    deletedAt: null
  };
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textSimilarity(left: string, right: string): number {
  const a = normalizeComparableText(left);
  const b = normalizeComparableText(right);
  if (a === b) {
    return 1;
  }
  if (!a || !b) {
    return 0;
  }
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  let intersection = 0;
  for (const word of aWords) {
    if (bWords.has(word)) {
      intersection += 1;
    }
  }
  const union = new Set([...aWords, ...bWords]).size;
  return union ? intersection / union : 0;
}

function comparableWords(value: string): string[] {
  return [
    ...new Set(
      normalizeComparableText(value)
        .split(' ')
        .filter((word) => word.length > 2)
    )
  ];
}

async function readPreferences(): Promise<BackupPreferences> {
  const chromeStorage =
    typeof chrome !== 'undefined' && chrome.storage?.local
      ? ((await chrome.storage.local.get(null)) as Record<string, unknown>)
      : {};
  const localValues: Record<string, string> = {};
  if (typeof localStorage !== 'undefined') {
    for (const key of PREFERENCE_LOCAL_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        localValues[key] = value;
      }
    }
  }
  return { chromeStorage, localStorage: localValues };
}

async function writePreferences(preferences?: BackupPreferences): Promise<void> {
  if (!preferences) {
    return;
  }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.clear();
    await chrome.storage.local.set(preferences.chromeStorage);
    await reconcileReminderAlarms();
  }
  if (typeof localStorage !== 'undefined') {
    for (const key of PREFERENCE_LOCAL_KEYS) {
      localStorage.removeItem(key);
    }
    for (const [key, value] of Object.entries(preferences.localStorage)) {
      if (PREFERENCE_LOCAL_KEYS.includes(key) && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
  }
}

function normalizePreferences(value: unknown): BackupPreferences | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const item = value as Record<string, unknown>;
  const chromeStorage =
    item['chromeStorage'] && typeof item['chromeStorage'] === 'object'
      ? (item['chromeStorage'] as Record<string, unknown>)
      : {};
  const localStorageValue =
    item['localStorage'] && typeof item['localStorage'] === 'object'
      ? (item['localStorage'] as Record<string, unknown>)
      : {};
  const localValues = Object.fromEntries(
    Object.entries(localStorageValue).filter(
      ([key, entry]) => PREFERENCE_LOCAL_KEYS.includes(key) && typeof entry === 'string'
    )
  ) as Record<string, string>;
  return { chromeStorage, localStorage: localValues };
}

export async function createPreImportSnapshot(): Promise<void> {
  const db = await getDB();
  const snapshot: SafetySnapshot = {
    createdAt: Date.now(),
    categories: await db.getAll('categories'),
    scripts: await db.getAll('scripts'),
    links: await db.getAll('links'),
    preferences: await readPreferences()
  };
  const data = JSON.stringify(snapshot);
  await db.put('backups', {
    id: PRE_IMPORT_SNAPSHOT_ID,
    createdAt: snapshot.createdAt,
    schemaVersion: 2,
    sizeBytes: new Blob([data]).size,
    data
  });
}

export async function getPreImportSnapshotDate(): Promise<number | null> {
  const snapshot = await (await getDB()).get('backups', PRE_IMPORT_SNAPSHOT_ID);
  return snapshot?.createdAt ?? null;
}

export async function restorePreImportSnapshot(): Promise<boolean> {
  const db = await getDB();
  const stored = await db.get('backups', PRE_IMPORT_SNAPSHOT_ID);
  if (!stored) {
    return false;
  }
  const snapshot = JSON.parse(stored.data) as SafetySnapshot;
  const tx = db.transaction(['categories', 'scripts', 'links'], 'readwrite');
  await Promise.all([
    tx.objectStore('categories').clear(),
    tx.objectStore('scripts').clear(),
    tx.objectStore('links').clear()
  ]);
  for (const category of snapshot.categories) {
    await tx.objectStore('categories').put(category);
  }
  for (const script of snapshot.scripts) {
    await tx.objectStore('scripts').put(script);
  }
  for (const link of snapshot.links) {
    await tx.objectStore('links').put(link);
  }
  await tx.done;
  await writePreferences(snapshot.preferences);
  return true;
}

/**
 * Gera um objeto ExportData com todos os scripts e categorias ativos.
 */
export async function generateExportData(): Promise<ExportData> {
  const db = await getDB();

  // Buscar tudo
  const categories = await db.getAll('categories');
  const allScripts = await db.getAll('scripts');
  const activeScripts = allScripts.filter((s) => s.deletedAt === null);

  const allLinks = await db.getAll('links');
  // Links criados em versões anteriores podem não possuir `deletedAt`.
  // Ausente e null representam um link ativo; somente timestamps indicam exclusão.
  const activeLinks = allLinks.filter(
    (link) => link.deletedAt === null || link.deletedAt === undefined
  );

  return {
    version: 3,
    timestamp: Date.now(),
    categories,
    scripts: activeScripts,
    links: activeLinks,
    preferences: await readPreferences()
  };
}

/**
 * Dispara o download de um arquivo JSON no navegador.
 */
export async function exportBackup(): Promise<void> {
  const data = await generateExportData();
  const jsonStr = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Fake click
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `atenaflow-backup-${dateStr}.json`;
  a.click();

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Importa dados de uma string JSON.
 * Usa transação atômica para mesclar (upsert) categorias e scripts.
 */
function parseImportData(jsonString: string): {
  categories: Category[];
  scripts: Script[];
  links: Link[];
  preferences?: BackupPreferences;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Arquivo JSON inválido ou corrompido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('O formato do arquivo é inválido.');
  }

  const parsedObj = parsed as Record<string, unknown>;
  if (
    (parsedObj['version'] !== 1 && parsedObj['version'] !== 2 && parsedObj['version'] !== 3) ||
    !Array.isArray(parsedObj['categories']) ||
    !Array.isArray(parsedObj['scripts'])
  ) {
    throw new Error('Arquivo de backup incompatível ou mal formatado.');
  }
  if (
    parsedObj['categories'].length > MAX_IMPORT_ITEMS ||
    parsedObj['scripts'].length > MAX_IMPORT_ITEMS ||
    (parsedObj['links'] !== undefined && !Array.isArray(parsedObj['links'])) ||
    (Array.isArray(parsedObj['links']) && parsedObj['links'].length > MAX_IMPORT_ITEMS)
  ) {
    throw new Error('Arquivo de backup excede o limite permitido.');
  }

  const categories = parsedObj['categories'].map(normalizeCategory);
  const categoryIds = new Set(categories.map((category) => category.id));
  const scripts = parsedObj['scripts'].map((script) => normalizeScript(script, categoryIds));
  const links = Array.isArray(parsedObj['links']) ? parsedObj['links'].map(normalizeLink) : [];
  const preferences = normalizePreferences(parsedObj['preferences']);
  return { categories, scripts, links, ...(preferences ? { preferences } : {}) };
}

export async function analyzeImportDuplicates(jsonString: string): Promise<ImportDuplicate[]> {
  const { scripts, links } = parseImportData(jsonString);
  const db = await getDB();
  const existingScripts = (await db.getAll('scripts')).filter((item) => item.deletedAt === null);
  const existingLinks = (await db.getAll('links')).filter((item) => !item.deletedAt);
  const duplicates: ImportDuplicate[] = [];
  const scriptWordIndex = new Map<string, Set<number>>();
  existingScripts.forEach((script, index) => {
    for (const word of comparableWords(script.body)) {
      const matches = scriptWordIndex.get(word) ?? new Set<number>();
      matches.add(index);
      scriptWordIndex.set(word, matches);
    }
  });

  for (const incoming of scripts) {
    let best: { item: Script; similarity: number } | null = null;
    const candidateScores = new Map<number, number>();
    for (const word of comparableWords(incoming.body)) {
      for (const index of scriptWordIndex.get(word) ?? []) {
        candidateScores.set(index, (candidateScores.get(index) ?? 0) + 1);
      }
    }
    const candidates = [...candidateScores]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 100)
      .map(([index]) => existingScripts[index])
      .filter((item): item is Script => item !== undefined);
    for (const existing of candidates) {
      if (existing.id === incoming.id) {
        continue;
      }
      const bodySimilarity = textSimilarity(existing.body, incoming.body);
      if (bodySimilarity >= 0.82 && (!best || bodySimilarity > best.similarity)) {
        best = { item: existing, similarity: bodySimilarity };
      }
    }
    if (best) {
      duplicates.push({
        key: `script:${incoming.id}:${best.item.id}`,
        type: 'script',
        existing: best.item,
        incoming,
        similarity: best.similarity
      });
    }
  }

  const linksByUrl = new Map(existingLinks.map((link) => [link.url, link]));
  const linksByTitle = new Map(
    existingLinks.map((link) => [normalizeComparableText(link.title), link])
  );
  for (const incoming of links) {
    const existing =
      linksByUrl.get(incoming.url) ?? linksByTitle.get(normalizeComparableText(incoming.title));
    if (existing && existing.id !== incoming.id) {
      duplicates.push({
        key: `link:${incoming.id}:${existing.id}`,
        type: 'link',
        existing,
        incoming,
        similarity:
          existing.url === incoming.url ? 1 : textSimilarity(existing.title, incoming.title)
      });
    }
  }
  return duplicates;
}

export async function findSimilarScript(
  title: string,
  body: string,
  excludeId?: string
): Promise<ImportDuplicate | null> {
  const existingScripts = (await (await getDB()).getAll('scripts')).filter(
    (item) => item.deletedAt === null && item.id !== excludeId
  );
  let best: { script: Script; similarity: number } | null = null;
  for (const existing of existingScripts) {
    const similarity = textSimilarity(existing.body, body);
    if (similarity >= 0.82 && (!best || similarity > best.similarity)) {
      best = { script: existing, similarity };
    }
  }
  if (!best) {
    return null;
  }
  const now = Date.now();
  const incoming: Script = {
    id: 'new-script',
    title,
    body,
    categoryId: null,
    tags: [],
    isFavorite: false,
    isPinned: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  return {
    key: `script:new:${best.script.id}`,
    type: 'script',
    existing: best.script,
    incoming,
    similarity: best.similarity
  };
}

/**
 * Importa dados de uma string JSON.
 * Usa transação atômica para mesclar (upsert) categorias e scripts.
 */
export async function importBackup(jsonString: string, options: ImportOptions = {}): Promise<void> {
  const { categories, scripts, links, preferences } = parseImportData(jsonString);
  const duplicates = await analyzeImportDuplicates(jsonString);
  const decisions = options.duplicateDecisions ?? {};
  const scriptsToImport = [...scripts];
  const linksToImport = [...links];

  for (const duplicate of duplicates) {
    const decision = decisions[duplicate.key] ?? 'keep-existing';
    const collection = duplicate.type === 'script' ? scriptsToImport : linksToImport;
    const incomingIndex = collection.findIndex((item) => item.id === duplicate.incoming.id);
    if (incomingIndex < 0) {
      continue;
    }
    if (decision === 'keep-existing') {
      collection.splice(incomingIndex, 1);
    } else if (decision === 'replace-existing') {
      collection[incomingIndex] = {
        ...duplicate.incoming,
        id: duplicate.existing.id
      } as Script & Link;
    }
  }

  await createPreImportSnapshot();
  const db = await getDB();

  // Iniciar transação de escrita para as tabelas
  const tx = db.transaction(['categories', 'scripts', 'links'], 'readwrite');
  const categoriesStore = tx.objectStore('categories');
  const scriptsStore = tx.objectStore('scripts');
  const linksStore = tx.objectStore('links');

  try {
    // 1. Upsert das Categorias
    for (const cat of categories) {
      await categoriesStore.put(cat);
    }

    // 2. Upsert dos Scripts
    for (const script of scriptsToImport) {
      const existing = await scriptsStore.get(script.id);
      if (existing) {
        // Manter rigorosamente as estatísticas de uso locais!
        // O usuário reclamou que importar scripts trazia o uso e estragava a ordem local.
        script.usageCount = existing.usageCount || 0;
        script.updatedAt = Math.max(script.updatedAt || 0, existing.updatedAt || 0);
        script.isFavorite = existing.isFavorite; // Preservar favoritos locais
        script.isPinned = existing.isPinned; // Preservar fixados locais
      } else {
        // Script novo vindo do backup começa com 0 usos para não poluir os "Mais Usados"
        script.usageCount = 0;
      }
      await scriptsStore.put(script);
    }

    // 3. Upsert dos Links
    for (const link of linksToImport) {
      await linksStore.put(link);
    }

    await tx.done;
    await writePreferences(preferences);
  } catch (e) {
    // tx abortada em caso de erro automaticamente (idb)
    console.error('Erro na transação de importação:', e);
    throw new Error('Erro ao gravar no banco de dados.');
  }
}
