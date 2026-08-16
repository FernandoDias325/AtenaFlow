/**
 * scripts.repository.ts — Repositório CRUD para Scripts de Atendimento.
 *
 * Implementa operações de leitura, escrita, exclusão lógica (soft delete)
 * e exclusão física (hard delete) sobre o Object Store `scripts`.
 *
 * Princípios:
 *  - SRP: Este módulo trata exclusivamente da persistência de scripts.
 *  - DIP: Depende da abstração getDB(), não de uma instância concreta.
 *
 * Referência: ARQUITETURA.md — Seções 4.2 e 5
 */

import { getDB } from './schema';
import type { Script, ScriptHistoryEntry } from '../models/types';
import { MAX_SCRIPT_HISTORY_ENTRIES } from '../models/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera um UUID v4 usando a API nativa do navegador ou do Node. */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
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

// ─── Repositório de Scripts ──────────────────────────────────────────────────

/**
 * Busca um script pelo ID.
 * @returns O script encontrado, ou undefined se não existir.
 */
export async function getScript(id: string): Promise<Script | undefined> {
  const db = await getDB();
  return db.get('scripts', id);
}

/**
 * Retorna todos os scripts ativos (não excluídos logicamente).
 * Scripts ativos possuem `deletedAt === null`.
 */
export async function getAllActiveScripts(): Promise<Script[]> {
  const db = await getDB();
  const allScripts = await db.getAll('scripts');
  return allScripts.filter((script) => script.deletedAt === null);
}

/**
 * Retorna todos os scripts na lixeira (excluídos logicamente).
 * Scripts na lixeira possuem `deletedAt !== null`.
 */
export async function getAllDeletedScripts(): Promise<Script[]> {
  const db = await getDB();
  const allScripts = await db.getAll('scripts');
  return allScripts.filter((script) => script.deletedAt !== null);
}

/**
 * Retorna todos os scripts associados a uma determinada categoria.
 * Filtra apenas scripts ativos (não excluídos).
 */
export async function getScriptsByCategory(categoryId: string): Promise<Script[]> {
  const db = await getDB();
  const scripts = await db.getAllFromIndex('scripts', 'by-categoryId', categoryId);
  return scripts.filter((script) => script.deletedAt === null);
}

/**
 * Cria um novo script no banco de dados.
 *
 * @param data - Dados parciais do script. Os campos `id`, `createdAt`,
 *   `updatedAt`, `deletedAt`, `usageCount`, `isFavorite` e `isPinned`
 *   são preenchidos automaticamente caso não fornecidos.
 * @returns O script completo inserido no banco.
 */
export async function createScript(
  data: Pick<Script, 'title' | 'body'> & Partial<Omit<Script, 'title' | 'body'>>
): Promise<Script> {
  const db = await getDB();
  const timestamp = now();

  const script: Script = {
    id: data.id ?? generateId(),
    title: data.title,
    categoryId: data.categoryId ?? null,
    body: data.body,
    tags: data.tags ?? [],
    colorTag: data.colorTag,
    isFavorite: data.isFavorite ?? false,
    isPinned: data.isPinned ?? false,
    usageCount: data.usageCount ?? 0,
    notes: data.notes,
    createdAt: data.createdAt ?? timestamp,
    updatedAt: data.updatedAt ?? timestamp,
    deletedAt: data.deletedAt ?? null,
    history: data.history ?? []
  };

  await db.put('scripts', script);
  return script;
}

/**
 * Atualiza um script existente.
 *
 * Antes de aplicar as alterações, salva o corpo anterior no histórico
 * de versões (limitado às últimas N entradas).
 *
 * @param id - ID do script a atualizar.
 * @param changes - Campos a serem atualizados.
 * @returns O script atualizado, ou undefined se o script não existir.
 */
export async function updateScript(
  id: string,
  changes: Partial<Omit<Script, 'id' | 'createdAt'>>
): Promise<Script | undefined> {
  const db = await getDB();
  const existing = await db.get('scripts', id);

  if (!existing) {
    return undefined;
  }

  // Se o corpo foi alterado, registra a versão anterior no histórico
  const history = [...(existing.history ?? [])];
  if (changes.body !== undefined && changes.body !== existing.body) {
    const entry: ScriptHistoryEntry = {
      body: existing.body,
      editedAt: now()
    };
    history.push(entry);

    // Mantém apenas as últimas N versões
    while (history.length > MAX_SCRIPT_HISTORY_ENTRIES) {
      history.shift();
    }
  }

  const updated: Script = {
    ...existing,
    ...changes,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now(),
    history
  };

  await db.put('scripts', updated);
  return updated;
}

/**
 * Exclusão lógica (soft delete): move o script para a lixeira.
 * Define o campo `deletedAt` com o timestamp atual.
 *
 * @returns true se o script foi encontrado e movido, false caso contrário.
 */
export async function softDeleteScript(id: string): Promise<boolean> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return false;
  }

  script.deletedAt = now();
  script.updatedAt = now();
  await db.put('scripts', script);
  return true;
}

/**
 * Exclusão física (hard delete): remove permanentemente o script do banco.
 *
 * @returns true se o script existia e foi removido, false caso contrário.
 */
export async function hardDeleteScript(id: string): Promise<boolean> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return false;
  }

  await db.delete('scripts', id);
  return true;
}

/**
 * Restaura um script da lixeira: define `deletedAt` como null.
 *
 * @returns true se o script foi encontrado e restaurado, false caso contrário.
 */
export async function restoreScript(id: string): Promise<boolean> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return false;
  }

  script.deletedAt = null;
  script.updatedAt = now();
  await db.put('scripts', script);
  return true;
}

/**
 * Incrementa o contador de uso (`usageCount`) de um script.
 * Chamado toda vez que o script é copiado para a área de transferência.
 *
 * @returns O novo valor do contador, ou undefined se o script não existir.
 */
export async function incrementUsageCount(id: string): Promise<number | undefined> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return undefined;
  }

  script.usageCount = (Number.isFinite(script.usageCount) ? script.usageCount : 0) + 1;
  script.updatedAt = now();
  await db.put('scripts', script);
  return script.usageCount;
}

/**
 * Alterna o estado de favorito de um script.
 *
 * @returns O novo estado de favorito, ou undefined se o script não existir.
 */
export async function toggleFavorite(id: string): Promise<boolean | undefined> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return undefined;
  }

  script.isFavorite = !script.isFavorite;
  script.updatedAt = now();
  await db.put('scripts', script);
  return script.isFavorite;
}

/**
 * Alterna o estado de fixado (pinned) de um script.
 *
 * @returns O novo estado de fixado, ou undefined se o script não existir.
 */
export async function togglePinned(id: string): Promise<boolean | undefined> {
  const db = await getDB();
  const script = await db.get('scripts', id);

  if (!script) {
    return undefined;
  }

  script.isPinned = !script.isPinned;
  script.updatedAt = now();
  await db.put('scripts', script);
  return script.isPinned;
}
