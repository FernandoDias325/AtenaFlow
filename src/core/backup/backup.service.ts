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

export interface ExportData {
  version: 1 | 2;
  timestamp: number;
  categories: Category[];
  scripts: Script[];
  links?: Link[];
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
  const activeLinks = allLinks.filter((l) => l.deletedAt === null);

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

  // Validação super básica da estrutura (duck typing)
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

  const data = parsed as ExportData;
  const db = await getDB();

  // Iniciar transação de escrita para as tabelas
  const tx = db.transaction(['categories', 'scripts', 'links'], 'readwrite');
  const categoriesStore = tx.objectStore('categories');
  const scriptsStore = tx.objectStore('scripts');
  const linksStore = tx.objectStore('links');

  try {
    // 1. Upsert das Categorias
    for (const cat of data.categories) {
      if (typeof cat.id === 'string' && typeof cat.name === 'string') {
        await categoriesStore.put(cat);
      }
    }

    // 2. Upsert dos Scripts
    for (const script of data.scripts) {
      if (
        typeof script.id === 'string' &&
        typeof script.title === 'string' &&
        typeof script.body === 'string'
      ) {
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
    }

    // 3. Upsert dos Links
    const linksToImport = data.links || [];
    for (const link of linksToImport) {
      if (
        typeof link.id === 'string' &&
        typeof link.title === 'string' &&
        typeof link.url === 'string'
      ) {
        await linksStore.put(link);
      }
    }

    await tx.done;
  } catch (e) {
    // tx abortada em caso de erro automaticamente (idb)
    console.error('Erro na transação de importação:', e);
    throw new Error('Erro ao gravar no banco de dados.');
  }
}
