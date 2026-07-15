/**
 * categories.repository.ts — Repositório CRUD para Categorias.
 *
 * Gerencia a criação, leitura, atualização, exclusão e reordenação
 * de categorias de scripts.
 *
 * Princípios:
 *  - SRP: Trata exclusivamente da persistência de categorias.
 *  - DIP: Depende da abstração getDB(), não de instância concreta.
 *
 * Referência: ARQUITETURA.md — Seções 4.2 e 5
 */

import { getDB } from './schema';
import type { Category } from '../models/types';

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

// ─── Repositório de Categorias ───────────────────────────────────────────────

/**
 * Busca uma categoria pelo ID.
 * @returns A categoria encontrada, ou undefined se não existir.
 */
export async function getCategory(id: string): Promise<Category | undefined> {
  const db = await getDB();
  return db.get('categories', id);
}

/**
 * Retorna todas as categorias, ordenadas pelo campo `order` (ascendente).
 */
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAllFromIndex('categories', 'by-order');
}

/**
 * Cria uma nova categoria.
 *
 * Se o campo `order` não for fornecido, a categoria é adicionada
 * no final da lista (último order + 1).
 *
 * @param data - Dados parciais da categoria. `id` e `createdAt` são gerados automaticamente.
 * @returns A categoria completa inserida no banco.
 */
export async function createCategory(
  data: Pick<Category, 'name' | 'color'> & Partial<Omit<Category, 'name' | 'color'>>
): Promise<Category> {
  const db = await getDB();

  // Determina a próxima posição de ordenação caso não fornecida
  let order = data.order;
  if (order === undefined) {
    const allCategories = await db.getAllFromIndex('categories', 'by-order');
    if (allCategories.length > 0) {
      const lastCategory = allCategories[allCategories.length - 1];
      order = (lastCategory?.order ?? 0) + 1;
    } else {
      order = 0;
    }
  }

  const category: Category = {
    id: data.id ?? generateId(),
    name: data.name,
    color: data.color,
    order,
    createdAt: data.createdAt ?? now()
  };

  await db.put('categories', category);
  return category;
}

/**
 * Atualiza uma categoria existente.
 *
 * @param id - ID da categoria.
 * @param changes - Campos a serem atualizados (name, color, order).
 * @returns A categoria atualizada, ou undefined se não existir.
 */
export async function updateCategory(
  id: string,
  changes: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<Category | undefined> {
  const db = await getDB();
  const existing = await db.get('categories', id);

  if (!existing) {
    return undefined;
  }

  const updated: Category = {
    ...existing,
    ...changes,
    id: existing.id,
    createdAt: existing.createdAt
  };

  await db.put('categories', updated);
  return updated;
}

/**
 * Exclui uma categoria permanentemente.
 *
 * IMPORTANTE: Esta operação NÃO remove os scripts associados.
 * Os scripts que referenciavam esta categoria terão seu `categoryId`
 * "órfão" — a camada de UI pode tratar isso exibindo-os como "Sem categoria".
 *
 * @returns true se a categoria existia e foi removida, false caso contrário.
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('categories', id);

  if (!existing) {
    return false;
  }

  await db.delete('categories', id);
  return true;
}

/**
 * Reordena as categorias com base em um array de IDs na nova ordem desejada.
 *
 * @param orderedIds - Array de IDs de categorias na ordem desejada.
 */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');
  const store = tx.objectStore('categories');

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) {
      continue;
    }

    const category = await store.get(id);
    if (category) {
      category.order = i;
      await store.put(category);
    }
  }

  await tx.done;
}
