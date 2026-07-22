import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB, closeDB } from '../../src/core/db/schema';
import { generateExportData, importBackup } from '../../src/core/backup/backup.service';
import type { Category, Script } from '../../src/core/models/types';

describe('Backup Service', () => {
  beforeEach(async () => {
    // Banco limpo por padrão através do closeDB + fake-indexeddb
  });

  afterEach(async () => {
    await closeDB();
    const req = indexedDB.deleteDatabase('scriptdesk-db');
    await new Promise((resolve) => {
      req.onsuccess = resolve;
      req.onerror = resolve;
    });
  });

  describe('generateExportData', () => {
    it('deve exportar versão, timestamp, scripts e categorias', async () => {
      const db = await getDB();
      const cat: Category = { id: 'c1', name: 'Cat 1', order: 0 } as Category;
      const script: Script = {
        id: 's1',
        title: 'Script 1',
        body: 'body',
        createdAt: 1,
        updatedAt: 1,
        isFavorite: false,
        isPinned: false,
        categoryId: null,
        usageCount: 0,
        deletedAt: null
      } as unknown as Script;

      await db.put('categories', cat);
      await db.put('scripts', script);

      const data = await generateExportData();
      expect(data.version).toBe(2);
      expect(data.categories.length).toBe(1);
      expect(data.categories[0]?.id).toBe('c1');
      expect(data.scripts.length).toBe(1);
      expect(data.scripts[0]?.id).toBe('s1');
      expect(typeof data.timestamp).toBe('number');
    });
  });

  describe('importBackup', () => {
    it('deve falhar se JSON inválido', async () => {
      await expect(importBackup('invalid json')).rejects.toThrow('Arquivo JSON inválido');
    });

    it('deve falhar se estrutura incorreta', async () => {
      await expect(importBackup('{}')).rejects.toThrow('Arquivo de backup incompatível');
      await expect(importBackup('{"version": 1}')).rejects.toThrow(
        'Arquivo de backup incompatível'
      );
    });

    it('deve mesclar dados validos', async () => {
      const backupJson = JSON.stringify({
        version: 1,
        timestamp: 123,
        categories: [{ id: 'c1', name: 'Cat 1', order: 0 }],
        scripts: [
          {
            id: 's1',
            title: 'Script Importado',
            body: 'novo',
            createdAt: 1,
            updatedAt: 1,
            isFavorite: false,
            isPinned: false,
            categoryId: null,
            usageCount: 0,
            deletedAt: null
          } as unknown as Script
        ]
      });

      await importBackup(backupJson);

      const db = await getDB();
      const cats = await db.getAll('categories');
      const scripts = await db.getAll('scripts');

      expect(cats.length).toBe(1);
      expect(cats[0]?.name).toBe('Cat 1');
      expect(scripts.length).toBe(1);
      expect(scripts[0]?.title).toBe('Script Importado');
    });
  });
});
