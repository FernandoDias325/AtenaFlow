import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDB, getDB } from '../../src/core/db/schema';
import type { Script } from '../../src/core/models/types';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe('migração do banco', () => {
  afterEach(async () => {
    await closeDB();
    await requestResult(indexedDB.deleteDatabase('scriptdesk-db'));
  });

  it('atualiza da versão 1 para 2 preservando scripts existentes', async () => {
    const oldDb = await requestResult(indexedDB.open('scriptdesk-db', 1));
    oldDb.close();

    // Cria o formato real da versão 1 em uma segunda tentativa limpa.
    await requestResult(indexedDB.deleteDatabase('scriptdesk-db'));
    const openV1 = indexedDB.open('scriptdesk-db', 1);
    openV1.onupgradeneeded = () => {
      const db = openV1.result;
      db.createObjectStore('scripts', { keyPath: 'id' });
      db.createObjectStore('categories', { keyPath: 'id' });
      db.createObjectStore('copyHistory', { keyPath: 'id' });
      db.createObjectStore('backups', { keyPath: 'id' });
    };
    const v1Db = await requestResult(openV1);
    const script = {
      id: 'script-antigo',
      title: 'Script preservado',
      body: 'Conteúdo existente',
      tags: [],
      categoryId: null,
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null
    } satisfies Script;
    const transaction = v1Db.transaction('scripts', 'readwrite');
    transaction.objectStore('scripts').put(script);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    v1Db.close();

    const currentDb = await getDB();
    expect(currentDb.version).toBe(2);
    expect(currentDb.objectStoreNames.contains('links')).toBe(true);
    expect((await currentDb.get('scripts', script.id))?.body).toBe('Conteúdo existente');
  });
});
