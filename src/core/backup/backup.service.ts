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

export interface ExportData {
  version: 1 | 2;
  timestamp: number;
  categories: Category[];
  scripts: Script[];
  links?: Link[];
}

const MAX_IMPORT_ITEMS = 20_000;
const MAX_TITLE_LENGTH = 500;
const MAX_BODY_LENGTH = 1_000_000;

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
    version: 2,
    timestamp: Date.now(),
    categories,
    scripts: activeScripts,
    links: activeLinks
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
export async function importBackup(jsonString: string): Promise<void> {
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
    (parsedObj['version'] !== 1 && parsedObj['version'] !== 2) ||
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
    for (const script of scripts) {
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
    for (const link of links) {
      await linksStore.put(link);
    }

    await tx.done;
  } catch (e) {
    // tx abortada em caso de erro automaticamente (idb)
    console.error('Erro na transação de importação:', e);
    throw new Error('Erro ao gravar no banco de dados.');
  }
}
