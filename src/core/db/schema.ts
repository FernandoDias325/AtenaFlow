/**
 * schema.ts — Definição do schema do IndexedDB e inicialização do banco.
 *
 * Utiliza a biblioteca `idb` (Jake Archibald) para tipagem estática do schema
 * via DBSchema e promissificação das operações do IndexedDB.
 *
 * Referência: ARQUITETURA.md — Seção 4.2 (Schema / Object Stores)
 */

import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { Script, Category, CopyHistoryEntry, BackupSnapshot, Link } from '../models/types';

// ─── Nome e versão do banco ──────────────────────────────────────────────────

export const DB_NAME = 'scriptdesk-db';
export const DB_VERSION = 2;

// ─── DBSchema tipado ─────────────────────────────────────────────────────────

/**
 * Interface que mapeia os Object Stores do IndexedDB para tipos TypeScript.
 * Cada propriedade corresponde a um Object Store, com chave primária e índices.
 */
export interface ScriptDeskDB extends DBSchema {
  scripts: {
    key: string;
    value: Script;
    indexes: {
      'by-categoryId': string;
      'by-isFavorite': number;
      'by-isPinned': number;
      'by-updatedAt': number;
      'by-deletedAt': number;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      'by-order': number;
    };
  };
  copyHistory: {
    key: string;
    value: CopyHistoryEntry;
    indexes: {
      'by-copiedAt': number;
    };
  };
  backups: {
    key: string;
    value: BackupSnapshot;
    indexes: {
      'by-createdAt': number;
    };
  };
  links: {
    key: string;
    value: Link;
    indexes: {
      'by-order': number;
    };
  };
}

// ─── Inicialização e migrations ──────────────────────────────────────────────

/** Referência singleton do banco de dados aberto. */
let dbInstance: IDBPDatabase<ScriptDeskDB> | null = null;

/**
 * Abre (ou retorna a instância já aberta) o banco de dados ScriptDesk.
 *
 * Na versão 1, cria os Object Stores e índices iniciais.
 * Futuras versões incrementarão o número da versão e adicionarão
 * lógica de migração no callback `upgrade`.
 */
export async function getDB(): Promise<IDBPDatabase<ScriptDeskDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<ScriptDeskDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── Versão 0 → 1: criação inicial ──────────────────────────────────
      if (oldVersion < 1) {
        // Object Store: scripts
        const scriptsStore = db.createObjectStore('scripts', { keyPath: 'id' });
        scriptsStore.createIndex('by-categoryId', 'categoryId');
        scriptsStore.createIndex('by-isFavorite', 'isFavorite');
        scriptsStore.createIndex('by-isPinned', 'isPinned');
        scriptsStore.createIndex('by-updatedAt', 'updatedAt');
        scriptsStore.createIndex('by-deletedAt', 'deletedAt');

        // Object Store: categories
        const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoriesStore.createIndex('by-order', 'order');

        // Object Store: copyHistory
        const historyStore = db.createObjectStore('copyHistory', { keyPath: 'id' });
        historyStore.createIndex('by-copiedAt', 'copiedAt');

        // Object Store: backups
        const backupsStore = db.createObjectStore('backups', { keyPath: 'id' });
        backupsStore.createIndex('by-createdAt', 'createdAt');
      }

      // ── Versão 1 → 2: Adicionando links ────────────────────────────────
      if (oldVersion < 2) {
        const linksStore = db.createObjectStore('links', { keyPath: 'id' });
        linksStore.createIndex('by-order', 'order');
      }
    }
  });

  return dbInstance;
}

/**
 * Fecha a conexão com o banco de dados e limpa a referência singleton.
 * Útil para testes automatizados que precisam reiniciar o banco entre execuções.
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
