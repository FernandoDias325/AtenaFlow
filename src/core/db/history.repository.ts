/**
 * history.repository.ts — Repositório para o Histórico de Cópias.
 *
 * Gerencia o registro de cada vez que um script é copiado para a
 * área de transferência. Mantém uma lista limitada de entradas
 * (últimas MAX_COPY_HISTORY_ENTRIES), descartando as mais antigas
 * automaticamente.
 *
 * Princípios:
 *  - SRP: Trata exclusivamente do histórico de cópias.
 *  - DIP: Depende da abstração getDB().
 *
 * Referência: ARQUITETURA.md — Seção 4.2
 */

import { getDB } from './schema';
import type { CopyHistoryEntry } from '../models/types';
import { MAX_COPY_HISTORY_ENTRIES } from '../models/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera um UUID v4. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Retorna o timestamp atual em milissegundos. */
function now(): number {
  return Date.now();
}

// ─── Repositório de Histórico de Cópias ──────────────────────────────────────

/**
 * Registra uma cópia de script no histórico.
 *
 * Após inserir, verifica se o limite de entradas foi atingido.
 * Se sim, remove as entradas mais antigas para manter o tamanho
 * dentro do limite definido em MAX_COPY_HISTORY_ENTRIES.
 *
 * @param scriptId - ID do script copiado.
 * @returns A entrada criada no histórico.
 */
export async function recordCopy(scriptId: string): Promise<CopyHistoryEntry> {
  const db = await getDB();

  const entry: CopyHistoryEntry = {
    id: generateId(),
    scriptId,
    copiedAt: now()
  };

  await db.put('copyHistory', entry);

  // Rotação: remove as entradas mais antigas se ultrapassar o limite
  await trimHistory();

  return entry;
}

/**
 * Retorna todas as entradas do histórico de cópias,
 * ordenadas da mais recente para a mais antiga.
 */
export async function getAllCopyHistory(): Promise<CopyHistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('copyHistory', 'by-copiedAt');
  // O índice retorna em ordem crescente; invertemos para exibir as mais recentes primeiro
  return entries.reverse();
}

/**
 * Retorna as últimas N entradas do histórico de cópias.
 *
 * @param limit - Número máximo de entradas a retornar.
 */
export async function getRecentCopyHistory(limit: number): Promise<CopyHistoryEntry[]> {
  const all = await getAllCopyHistory();
  return all.slice(0, limit);
}

/**
 * Limpa todo o histórico de cópias.
 */
export async function clearCopyHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('copyHistory');
}

/**
 * Remove as entradas mais antigas do histórico para manter
 * apenas MAX_COPY_HISTORY_ENTRIES registros.
 */
async function trimHistory(): Promise<void> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('copyHistory', 'by-copiedAt');

  if (entries.length <= MAX_COPY_HISTORY_ENTRIES) {
    return;
  }

  // Entradas ordenadas por copiedAt crescente; as primeiras são as mais antigas
  const excessCount = entries.length - MAX_COPY_HISTORY_ENTRIES;
  const entriesToRemove = entries.slice(0, excessCount);

  const tx = db.transaction('copyHistory', 'readwrite');
  const store = tx.objectStore('copyHistory');

  for (const entry of entriesToRemove) {
    await store.delete(entry.id);
  }

  await tx.done;
}
