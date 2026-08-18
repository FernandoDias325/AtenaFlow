import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB, closeDB } from '../../src/core/db/schema';
import {
  analyzeImportDuplicates,
  findSimilarScript,
  generateExportData,
  importBackup,
  restorePreImportSnapshot
} from '../../src/core/backup/backup.service';
import type { Category, Link, Script } from '../../src/core/models/types';

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
    vi.unstubAllGlobals();
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
      expect(data.version).toBe(3);
      expect(data.categories.length).toBe(1);
      expect(data.categories[0]?.id).toBe('c1');
      expect(data.scripts.length).toBe(1);
      expect(data.scripts[0]?.id).toBe('s1');
      expect(typeof data.timestamp).toBe('number');
    });

    it('deve exportar links ativos antigos mesmo sem deletedAt', async () => {
      const db = await getDB();
      const legacyLink = {
        id: 'l1',
        title: 'Portal',
        url: 'https://example.com/',
        order: 0,
        createdAt: 1
      } as Link;
      await db.put('links', legacyLink);

      const data = await generateExportData();

      expect(data.links).toHaveLength(1);
      expect(data.links?.[0]?.id).toBe('l1');
    });

    it('inclui bloco de notas e preferências no backup completo', async () => {
      const stored: Record<string, unknown> = {
        'atenaflow-notepad-tabs': { version: 1, activeTabId: 'tab-1', tabs: [] },
        'atenaflow-theme': 'light',
        'atenaflow-reminders': [{ id: 'r1', title: 'Pausa' }]
      };
      vi.stubGlobal('chrome', {
        storage: {
          local: {
            get: async () => ({ ...stored }),
            clear: async () => Object.keys(stored).forEach((key) => delete stored[key]),
            set: async (values: Record<string, unknown>) => Object.assign(stored, values)
          }
        }
      });

      const data = await generateExportData();

      expect(data.preferences?.chromeStorage['atenaflow-notepad-tabs']).toBeTruthy();
      expect(data.preferences?.chromeStorage['atenaflow-theme']).toBe('light');
      expect(data.preferences?.chromeStorage['atenaflow-reminders']).toEqual([
        { id: 'r1', title: 'Pausa' }
      ]);
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

    it('deve restaurar links exportados durante a importação', async () => {
      const sourceDb = await getDB();
      await sourceDb.put('links', {
        id: 'l1',
        title: 'Portal seguro',
        url: 'https://example.com/',
        order: 0,
        createdAt: 1,
        deletedAt: null
      });
      const exported = await generateExportData();

      await sourceDb.clear('links');
      await importBackup(JSON.stringify(exported));

      const importedLinks = await sourceDb.getAll('links');
      expect(importedLinks).toHaveLength(1);
      expect(importedLinks[0]?.title).toBe('Portal seguro');
      expect(importedLinks[0]?.deletedAt).toBeNull();
    });

    it('deve rejeitar registros malformados sem gravar parcialmente', async () => {
      const backupJson = JSON.stringify({
        version: 2,
        timestamp: 123,
        categories: [{ id: 'c1', name: 'Categoria válida' }],
        scripts: [{ id: 's1', title: '<img src=x>', body: '' }],
        links: []
      });

      await expect(importBackup(backupJson)).rejects.toThrow('scripts.body');
      const db = await getDB();
      expect(await db.count('categories')).toBe(0);
      expect(await db.count('scripts')).toBe(0);
    });

    it('deve rejeitar URLs perigosas', async () => {
      const backupJson = JSON.stringify({
        version: 2,
        timestamp: 123,
        categories: [],
        scripts: [],
        links: [{ id: 'l1', title: 'Perigoso', url: 'javascript:alert(1)' }]
      });

      await expect(importBackup(backupJson)).rejects.toThrow('URL inválida ou insegura');
    });

    it('detecta conteúdo semelhante sem confundir apenas títulos numerados', async () => {
      const db = await getDB();
      await db.put('scripts', {
        id: 'existing',
        title: 'Auditoria 1',
        body: 'Solicite o protocolo e confirme todos os dados do atendimento',
        tags: [],
        categoryId: null,
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null
      });
      const similar = JSON.stringify({
        version: 3,
        timestamp: 1,
        categories: [],
        scripts: [
          {
            id: 'new',
            title: 'Auditoria 2',
            body: 'Solicite o protocolo e confirme todos os dados do atendimento agora',
            createdAt: 1,
            updatedAt: 1
          }
        ],
        links: []
      });
      expect(await analyzeImportDuplicates(similar)).toHaveLength(1);

      const different = JSON.stringify({
        version: 3,
        timestamp: 1,
        categories: [],
        scripts: [{ id: 'other', title: 'Auditoria 2', body: 'Texto completamente diferente' }],
        links: []
      });
      expect(await analyzeImportDuplicates(different)).toHaveLength(0);
    });

    it('detecta duplicado no cadastro e respeita o ID excluído da comparação', async () => {
      const db = await getDB();
      await db.put('scripts', {
        id: 'existing',
        title: 'Resposta atual',
        body: 'Confirme o protocolo e todos os dados informados pelo consumidor',
        tags: [],
        categoryId: null,
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null
      });

      const duplicate = await findSimilarScript(
        'Nova resposta',
        'Confirme o protocolo e todos os dados informados pelo consumidor agora'
      );
      expect(duplicate?.existing.id).toBe('existing');
      expect(duplicate?.similarity).toBeGreaterThanOrEqual(0.82);
      expect(
        await findSimilarScript(
          'Edição',
          'Confirme o protocolo e todos os dados informados pelo consumidor',
          'existing'
        )
      ).toBeNull();
    });

    it('restaura o estado imediatamente anterior à importação', async () => {
      const db = await getDB();
      await db.put('scripts', {
        id: 'original',
        title: 'Original',
        body: 'Antes',
        tags: [],
        categoryId: null,
        isFavorite: false,
        isPinned: false,
        usageCount: 0,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null
      });
      await importBackup(
        JSON.stringify({
          version: 3,
          timestamp: 1,
          categories: [],
          scripts: [{ id: 'imported', title: 'Importado', body: 'Depois' }],
          links: []
        })
      );
      expect(await db.get('scripts', 'imported')).toBeTruthy();
      expect(await restorePreImportSnapshot()).toBe(true);
      expect(await db.get('scripts', 'original')).toBeTruthy();
      expect(await db.get('scripts', 'imported')).toBeUndefined();
    });

    it('aplica as três decisões possíveis para conteúdos duplicados', async () => {
      const db = await getDB();
      const existing: Script = {
        id: 'existing',
        title: 'Script atual',
        body: 'Solicite o protocolo e confirme todos os dados do atendimento',
        tags: [],
        categoryId: null,
        isFavorite: false,
        isPinned: false,
        usageCount: 4,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null
      };
      const json = JSON.stringify({
        version: 3,
        timestamp: 1,
        categories: [],
        scripts: [
          {
            id: 'incoming',
            title: 'Script novo',
            body: 'Solicite o protocolo e confirme todos os dados do atendimento agora'
          }
        ],
        links: []
      });

      for (const [decision, expectedCount, expectedBody] of [
        ['keep-existing', 1, existing.body],
        [
          'replace-existing',
          1,
          'Solicite o protocolo e confirme todos os dados do atendimento agora'
        ],
        ['keep-both', 2, existing.body]
      ] as const) {
        await db.clear('scripts');
        await db.clear('backups');
        await db.put('scripts', existing);
        const [duplicate] = await analyzeImportDuplicates(json);
        expect(duplicate).toBeTruthy();
        await importBackup(json, {
          duplicateDecisions: { [duplicate!.key]: decision }
        });
        const scripts = await db.getAll('scripts');
        expect(scripts).toHaveLength(expectedCount);
        expect((await db.get('scripts', 'existing'))?.body).toBe(expectedBody);
      }
    });

    it('mantém somente o estado anterior à importação mais recente', async () => {
      const db = await getDB();
      const firstImport = JSON.stringify({
        version: 3,
        timestamp: 1,
        categories: [],
        scripts: [{ id: 'first', title: 'Primeiro', body: 'Conteúdo inicial' }],
        links: []
      });
      const secondImport = JSON.stringify({
        version: 3,
        timestamp: 2,
        categories: [],
        scripts: [{ id: 'second', title: 'Segundo', body: 'Outro conteúdo' }],
        links: []
      });

      await importBackup(firstImport);
      await importBackup(secondImport);
      expect(await db.count('backups')).toBe(1);
      await restorePreImportSnapshot();

      expect(await db.get('scripts', 'first')).toBeTruthy();
      expect(await db.get('scripts', 'second')).toBeUndefined();
    });

    it('restaura bloco de notas e preferências anteriores à importação', async () => {
      const stored: Record<string, unknown> = {
        'atenaflow-notepad-tabs': { version: 1, activeTabId: 'original', tabs: [] },
        'atenaflow-theme': 'light'
      };
      vi.stubGlobal('chrome', {
        storage: {
          local: {
            get: async () => ({ ...stored }),
            clear: async () => Object.keys(stored).forEach((key) => delete stored[key]),
            set: async (values: Record<string, unknown>) => Object.assign(stored, values)
          }
        }
      });
      const importedPreferences = {
        chromeStorage: {
          'atenaflow-notepad-tabs': { version: 1, activeTabId: 'imported', tabs: [] },
          'atenaflow-theme': 'midnight'
        },
        localStorage: {}
      };

      await importBackup(
        JSON.stringify({
          version: 3,
          timestamp: 1,
          categories: [],
          scripts: [],
          links: [],
          preferences: importedPreferences
        })
      );
      expect(stored['atenaflow-theme']).toBe('midnight');
      await restorePreImportSnapshot();
      expect(stored['atenaflow-theme']).toBe('light');
      expect((stored['atenaflow-notepad-tabs'] as { activeTabId: string }).activeTabId).toBe(
        'original'
      );
    });
  });
});
