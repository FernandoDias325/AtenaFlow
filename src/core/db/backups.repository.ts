/**
 * backups.repository.ts — Repositório para Snapshots de Backup.
 *
 * Gerencia a criação, leitura e rotação de snapshots de backup
 * armazenados dentro do próprio IndexedDB. Isso funciona como
 * uma camada de segurança silenciosa que roda automaticamente
 * via chrome.alarms no Service Worker.
 *
 * Princípios:
 *  - SRP: Trata exclusivamente dos snapshots de backup.
 *  - DIP: Depende da abstração getDB().
 *
 * Referência: ARQUITETURA.md — Seção 4.1 (Estratégia de Persistência e Backup)
 */

import { getDB } from './schema';
import type { BackupSnapshot } from '../models/types';
import { MAX_BACKUP_SNAPSHOTS, CURRENT_SCHEMA_VERSION } from '../models/types';

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

// ─── Repositório de Backups ──────────────────────────────────────────────────

/**
 * Cria um novo snapshot de backup.
 *
 * @param data - String JSON contendo o export completo (scripts + categorias).
 * @returns O snapshot de backup criado.
 */
export async function createBackup(data: string): Promise<BackupSnapshot> {
  const db = await getDB();

  const snapshot: BackupSnapshot = {
    id: generateId(),
    createdAt: now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sizeBytes: new Blob([data]).size,
    data
  };

  await db.put('backups', snapshot);

  // Rotação: mantém apenas as últimas N cópias
  await trimBackups();

  return snapshot;
}

/**
 * Retorna todos os snapshots de backup, ordenados do mais recente
 * para o mais antigo.
 */
export async function getAllBackups(): Promise<BackupSnapshot[]> {
  const db = await getDB();
  const backups = await db.getAllFromIndex('backups', 'by-createdAt');
  return backups.reverse();
}

/**
 * Busca um snapshot de backup pelo ID.
 *
 * @returns O snapshot encontrado, ou undefined se não existir.
 */
export async function getBackup(id: string): Promise<BackupSnapshot | undefined> {
  const db = await getDB();
  return db.get('backups', id);
}

/**
 * Remove um snapshot de backup pelo ID.
 *
 * @returns true se o backup existia e foi removido, false caso contrário.
 */
export async function deleteBackup(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('backups', id);

  if (!existing) {
    return false;
  }

  await db.delete('backups', id);
  return true;
}

/**
 * Remove os snapshots mais antigos para manter apenas
 * MAX_BACKUP_SNAPSHOTS no banco.
 */
async function trimBackups(): Promise<void> {
  const db = await getDB();
  const backups = await db.getAllFromIndex('backups', 'by-createdAt');

  if (backups.length <= MAX_BACKUP_SNAPSHOTS) {
    return;
  }

  // Backups ordenados por createdAt crescente; os primeiros são os mais antigos
  const excessCount = backups.length - MAX_BACKUP_SNAPSHOTS;
  const backupsToRemove = backups.slice(0, excessCount);

  const tx = db.transaction('backups', 'readwrite');
  const store = tx.objectStore('backups');

  for (const backup of backupsToRemove) {
    await store.delete(backup.id);
  }

  await tx.done;
}
