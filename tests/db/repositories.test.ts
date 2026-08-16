/**
 * repositories.test.ts — Testes unitários para os repositórios do Core.
 *
 * Utiliza `fake-indexeddb` para emular o IndexedDB em memória no ambiente
 * de testes do Vitest (Node.js), sem precisar de navegador real.
 *
 * Cobertura:
 *  - ScriptsRepository: CRUD, soft delete, hard delete, restore, favoritos, pinned, uso, histórico
 *  - CategoriesRepository: CRUD, reordenação
 *  - HistoryRepository: registro, leitura, trim, limpeza
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { closeDB } from '../../src/core/db/schema';
import * as ScriptsRepo from '../../src/core/db/scripts.repository';
import * as CategoriesRepo from '../../src/core/db/categories.repository';
import * as HistoryRepo from '../../src/core/db/history.repository';
import * as LinksRepo from '../../src/core/db/links.repository';
import { MAX_COPY_HISTORY_ENTRIES } from '../../src/core/models/types';

// ─── Setup e Teardown ────────────────────────────────────────────────────────

/**
 * Antes de cada teste, fecha e limpa o banco para garantir isolamento.
 * O `fake-indexeddb/auto` registra o polyfill globalmente.
 */
beforeEach(async () => {
  await closeDB();
  // Limpa o banco anterior do fake-indexeddb
  const databases = await indexedDB.databases();
  for (const dbInfo of databases) {
    if (dbInfo.name) {
      indexedDB.deleteDatabase(dbInfo.name);
    }
  }
});

afterEach(async () => {
  await closeDB();
});

// ═════════════════════════════════════════════════════════════════════════════
//  SCRIPTS REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════

describe('ScriptsRepository', () => {
  describe('createScript', () => {
    it('deve criar um script com campos obrigatórios e preencher os opcionais', async () => {
      const script = await ScriptsRepo.createScript({
        title: 'Saudação inicial',
        body: 'Olá! Meu nome é Fernando. Como posso ajudar?'
      });

      expect(script.id).toBeDefined();
      expect(script.title).toBe('Saudação inicial');
      expect(script.body).toBe('Olá! Meu nome é Fernando. Como posso ajudar?');
      expect(script.categoryId).toBeNull();
      expect(script.tags).toEqual([]);
      expect(script.isFavorite).toBe(false);
      expect(script.isPinned).toBe(false);
      expect(script.usageCount).toBe(0);
      expect(script.deletedAt).toBeNull();
      expect(script.createdAt).toBeGreaterThan(0);
      expect(script.updatedAt).toBeGreaterThan(0);
    });

    it('deve criar um script com campos opcionais fornecidos', async () => {
      const script = await ScriptsRepo.createScript({
        title: 'Encerramento',
        body: 'Obrigado pelo contato!',
        tags: ['finalização', 'cortesia'],
        isFavorite: true,
        isPinned: true,
        notes: 'Usar somente no final do atendimento'
      });

      expect(script.tags).toEqual(['finalização', 'cortesia']);
      expect(script.isFavorite).toBe(true);
      expect(script.isPinned).toBe(true);
      expect(script.notes).toBe('Usar somente no final do atendimento');
    });
  });

  describe('getScript', () => {
    it('deve retornar o script pelo ID', async () => {
      const created = await ScriptsRepo.createScript({
        title: 'Teste',
        body: 'Corpo do teste'
      });

      const found = await ScriptsRepo.getScript(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Teste');
    });

    it('deve retornar undefined para ID inexistente', async () => {
      const found = await ScriptsRepo.getScript('id-inexistente');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllActiveScripts', () => {
    it('deve retornar somente scripts ativos (não excluídos)', async () => {
      await ScriptsRepo.createScript({ title: 'Ativo 1', body: 'corpo' });
      await ScriptsRepo.createScript({ title: 'Ativo 2', body: 'corpo' });
      const toDelete = await ScriptsRepo.createScript({ title: 'Excluído', body: 'corpo' });
      await ScriptsRepo.softDeleteScript(toDelete.id);

      const active = await ScriptsRepo.getAllActiveScripts();
      expect(active.length).toBe(2);
      expect(active.every((s) => s.deletedAt === null)).toBe(true);
    });
  });

  describe('getAllDeletedScripts', () => {
    it('deve retornar somente scripts na lixeira', async () => {
      await ScriptsRepo.createScript({ title: 'Ativo', body: 'corpo' });
      const toDelete = await ScriptsRepo.createScript({ title: 'Excluído', body: 'corpo' });
      await ScriptsRepo.softDeleteScript(toDelete.id);

      const deleted = await ScriptsRepo.getAllDeletedScripts();
      expect(deleted.length).toBe(1);
      expect(deleted[0]?.title).toBe('Excluído');
      expect(deleted[0]?.deletedAt).not.toBeNull();
    });
  });

  describe('updateScript', () => {
    it('deve atualizar os campos fornecidos e manter os demais', async () => {
      const created = await ScriptsRepo.createScript({
        title: 'Original',
        body: 'Corpo original',
        tags: ['tag1']
      });

      const updated = await ScriptsRepo.updateScript(created.id, {
        title: 'Atualizado',
        tags: ['tag1', 'tag2']
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Atualizado');
      expect(updated?.body).toBe('Corpo original');
      expect(updated?.tags).toEqual(['tag1', 'tag2']);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    });

    it('deve salvar o corpo anterior no histórico ao alterar o body', async () => {
      const created = await ScriptsRepo.createScript({
        title: 'Script',
        body: 'Versão 1'
      });

      const updated = await ScriptsRepo.updateScript(created.id, { body: 'Versão 2' });
      expect(updated?.history?.length).toBe(1);
      expect(updated?.history?.[0]?.body).toBe('Versão 1');
      expect(updated?.body).toBe('Versão 2');
    });

    it('deve retornar undefined ao tentar atualizar script inexistente', async () => {
      const result = await ScriptsRepo.updateScript('id-fake', { title: 'Nada' });
      expect(result).toBeUndefined();
    });
  });

  describe('softDeleteScript', () => {
    it('deve marcar o script com deletedAt (exclusão lógica)', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      const result = await ScriptsRepo.softDeleteScript(created.id);

      expect(result).toBe(true);

      const found = await ScriptsRepo.getScript(created.id);
      expect(found?.deletedAt).not.toBeNull();
    });

    it('deve retornar false para ID inexistente', async () => {
      const result = await ScriptsRepo.softDeleteScript('id-fake');
      expect(result).toBe(false);
    });
  });

  describe('hardDeleteScript', () => {
    it('deve remover o script permanentemente', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      const result = await ScriptsRepo.hardDeleteScript(created.id);

      expect(result).toBe(true);

      const found = await ScriptsRepo.getScript(created.id);
      expect(found).toBeUndefined();
    });

    it('deve retornar false para ID inexistente', async () => {
      const result = await ScriptsRepo.hardDeleteScript('id-fake');
      expect(result).toBe(false);
    });
  });

  describe('restoreScript', () => {
    it('deve restaurar um script da lixeira (deletedAt volta a null)', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      await ScriptsRepo.softDeleteScript(created.id);
      const result = await ScriptsRepo.restoreScript(created.id);

      expect(result).toBe(true);

      const found = await ScriptsRepo.getScript(created.id);
      expect(found?.deletedAt).toBeNull();
    });
  });

  describe('incrementUsageCount', () => {
    it('deve incrementar o contador de uso', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      expect(created.usageCount).toBe(0);

      const count1 = await ScriptsRepo.incrementUsageCount(created.id);
      expect(count1).toBe(1);

      const count2 = await ScriptsRepo.incrementUsageCount(created.id);
      expect(count2).toBe(2);
    });

    it('deve retornar undefined para ID inexistente', async () => {
      const result = await ScriptsRepo.incrementUsageCount('id-fake');
      expect(result).toBeUndefined();
    });

    it('deve iniciar em 1 quando um script antigo não possui contador', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Legado', body: 'corpo' });
      const db = await import('../../src/core/db/schema').then((module) => module.getDB());
      await db.put('scripts', { ...created, usageCount: undefined as unknown as number });

      expect(await ScriptsRepo.incrementUsageCount(created.id)).toBe(1);
      expect((await ScriptsRepo.getScript(created.id))?.usageCount).toBe(1);
    });
  });

  describe('toggleFavorite', () => {
    it('deve alternar o estado de favorito', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      expect(created.isFavorite).toBe(false);

      const state1 = await ScriptsRepo.toggleFavorite(created.id);
      expect(state1).toBe(true);

      const state2 = await ScriptsRepo.toggleFavorite(created.id);
      expect(state2).toBe(false);
    });
  });

  describe('togglePinned', () => {
    it('deve alternar o estado de fixado', async () => {
      const created = await ScriptsRepo.createScript({ title: 'Script', body: 'corpo' });
      expect(created.isPinned).toBe(false);

      const state1 = await ScriptsRepo.togglePinned(created.id);
      expect(state1).toBe(true);

      const state2 = await ScriptsRepo.togglePinned(created.id);
      expect(state2).toBe(false);
    });
  });

  describe('getScriptsByCategory', () => {
    it('deve retornar somente scripts ativos da categoria especificada', async () => {
      const catId = 'cat-vendas';
      await ScriptsRepo.createScript({ title: 'Script A', body: 'a', categoryId: catId });
      await ScriptsRepo.createScript({ title: 'Script B', body: 'b', categoryId: catId });
      await ScriptsRepo.createScript({ title: 'Outra', body: 'c', categoryId: 'cat-suporte' });

      const deleted = await ScriptsRepo.createScript({
        title: 'Excluído',
        body: 'd',
        categoryId: catId
      });
      await ScriptsRepo.softDeleteScript(deleted.id);

      const scripts = await ScriptsRepo.getScriptsByCategory(catId);
      expect(scripts.length).toBe(2);
      expect(scripts.every((s) => s.categoryId === catId)).toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  CATEGORIES REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════

describe('CategoriesRepository', () => {
  describe('createCategory', () => {
    it('deve criar uma categoria com order automático', async () => {
      const cat1 = await CategoriesRepo.createCategory({ name: 'Vendas', color: '#3B82F6' });
      const cat2 = await CategoriesRepo.createCategory({ name: 'Suporte', color: '#EF4444' });

      expect(cat1.order).toBe(0);
      expect(cat2.order).toBe(1);
      expect(cat1.id).toBeDefined();
      expect(cat1.name).toBe('Vendas');
      expect(cat1.color).toBe('#3B82F6');
    });

    it('deve padronizar o nome e impedir categorias repetidas', async () => {
      const created = await CategoriesRepo.createCategory({ name: '  atenção  ', color: '#000' });

      expect(created.name).toBe('Atenção');
      await expect(
        CategoriesRepo.createCategory({ name: 'ATENCAO', color: '#111' })
      ).rejects.toBeInstanceOf(CategoriesRepo.CategoryNameConflictError);
    });
  });

  describe('getCategory', () => {
    it('deve retornar a categoria pelo ID', async () => {
      const created = await CategoriesRepo.createCategory({ name: 'Teste', color: '#000' });
      const found = await CategoriesRepo.getCategory(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Teste');
    });

    it('deve retornar undefined para ID inexistente', async () => {
      const found = await CategoriesRepo.getCategory('id-fake');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllCategories', () => {
    it('deve retornar categorias ordenadas pelo campo order', async () => {
      await CategoriesRepo.createCategory({ name: 'C', color: '#000' });
      await CategoriesRepo.createCategory({ name: 'A', color: '#111' });
      await CategoriesRepo.createCategory({ name: 'B', color: '#222' });

      const all = await CategoriesRepo.getAllCategories();
      expect(all.length).toBe(3);
      expect(all[0]?.name).toBe('C');
      expect(all[1]?.name).toBe('A');
      expect(all[2]?.name).toBe('B');
    });
  });

  describe('updateCategory', () => {
    it('deve atualizar nome e cor mantendo o ID e createdAt', async () => {
      const created = await CategoriesRepo.createCategory({ name: 'Original', color: '#000' });
      const updated = await CategoriesRepo.updateCategory(created.id, {
        name: 'Atualizado',
        color: '#FFF'
      });

      expect(updated?.name).toBe('Atualizado');
      expect(updated?.color).toBe('#FFF');
      expect(updated?.id).toBe(created.id);
      expect(updated?.createdAt).toBe(created.createdAt);
    });

    it('deve retornar undefined ao tentar atualizar categoria inexistente', async () => {
      const result = await CategoriesRepo.updateCategory('id-fake', { name: 'Nada' });
      expect(result).toBeUndefined();
    });

    it('deve impedir renomear uma categoria para um nome existente', async () => {
      await CategoriesRepo.createCategory({ name: 'Vendas', color: '#000' });
      const suporte = await CategoriesRepo.createCategory({ name: 'Suporte', color: '#111' });

      await expect(
        CategoriesRepo.updateCategory(suporte.id, { name: ' vendas ' })
      ).rejects.toBeInstanceOf(CategoriesRepo.CategoryNameConflictError);
    });
  });

  describe('deleteCategory', () => {
    it('deve excluir a categoria permanentemente', async () => {
      const created = await CategoriesRepo.createCategory({ name: 'Temp', color: '#000' });
      const result = await CategoriesRepo.deleteCategory(created.id);

      expect(result).toBe(true);

      const found = await CategoriesRepo.getCategory(created.id);
      expect(found).toBeUndefined();
    });

    it('deve retornar false para ID inexistente', async () => {
      const result = await CategoriesRepo.deleteCategory('id-fake');
      expect(result).toBe(false);
    });
  });

  describe('reorderCategories', () => {
    it('deve reordenar categorias conforme a nova ordem de IDs', async () => {
      const catA = await CategoriesRepo.createCategory({ name: 'A', color: '#000' });
      const catB = await CategoriesRepo.createCategory({ name: 'B', color: '#111' });
      const catC = await CategoriesRepo.createCategory({ name: 'C', color: '#222' });

      // Nova ordem: C, A, B
      await CategoriesRepo.reorderCategories([catC.id, catA.id, catB.id]);

      const all = await CategoriesRepo.getAllCategories();
      expect(all[0]?.name).toBe('C');
      expect(all[0]?.order).toBe(0);
      expect(all[1]?.name).toBe('A');
      expect(all[1]?.order).toBe(1);
      expect(all[2]?.name).toBe('B');
      expect(all[2]?.order).toBe(2);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  LINKS REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════

describe('LinksRepository', () => {
  it('deve padronizar o título e iniciar o contador de acessos', async () => {
    const link = await LinksRepo.createLink({
      title: '  portal   interno ',
      url: 'https://example.com/'
    });

    expect(link.title).toBe('Portal interno');
    expect(link.usageCount).toBe(0);
    expect(link.deletedAt).toBeNull();
  });

  it('deve incrementar o contador de acessos', async () => {
    const link = await LinksRepo.createLink({ title: 'Portal', url: 'https://example.com/' });

    expect(await LinksRepo.incrementUsageCount(link.id)).toBe(1);
    expect(await LinksRepo.incrementUsageCount(link.id)).toBe(2);
    expect((await LinksRepo.getLink(link.id))?.usageCount).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  HISTORY REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════

describe('HistoryRepository', () => {
  describe('recordCopy', () => {
    it('deve registrar uma cópia no histórico', async () => {
      const entry = await HistoryRepo.recordCopy('script-123');

      expect(entry.id).toBeDefined();
      expect(entry.scriptId).toBe('script-123');
      expect(entry.copiedAt).toBeGreaterThan(0);
    });
  });

  describe('getAllCopyHistory', () => {
    it('deve retornar todas as entradas registradas', async () => {
      await HistoryRepo.recordCopy('script-1');
      await HistoryRepo.recordCopy('script-2');
      await HistoryRepo.recordCopy('script-3');

      const all = await HistoryRepo.getAllCopyHistory();
      expect(all.length).toBe(3);

      const scriptIds = all.map((e) => e.scriptId);
      expect(scriptIds).toContain('script-1');
      expect(scriptIds).toContain('script-2');
      expect(scriptIds).toContain('script-3');
    });
  });

  describe('getRecentCopyHistory', () => {
    it('deve limitar o número de entradas retornadas', async () => {
      for (let i = 0; i < 10; i++) {
        await HistoryRepo.recordCopy(`script-${i}`);
      }

      const recent = await HistoryRepo.getRecentCopyHistory(3);
      expect(recent.length).toBe(3);
    });
  });

  describe('clearCopyHistory', () => {
    it('deve limpar todo o histórico', async () => {
      await HistoryRepo.recordCopy('script-1');
      await HistoryRepo.recordCopy('script-2');

      await HistoryRepo.clearCopyHistory();

      const all = await HistoryRepo.getAllCopyHistory();
      expect(all.length).toBe(0);
    });
  });

  describe('trimHistory (rotação automática)', () => {
    it(`deve manter no máximo ${MAX_COPY_HISTORY_ENTRIES} entradas`, async () => {
      // Insere entradas além do limite
      for (let i = 0; i < MAX_COPY_HISTORY_ENTRIES + 5; i++) {
        await HistoryRepo.recordCopy(`script-${i}`);
      }

      const all = await HistoryRepo.getAllCopyHistory();
      expect(all.length).toBe(MAX_COPY_HISTORY_ENTRIES);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  FIM DOS TESTES DE REPOSITÓRIOS
// ═════════════════════════════════════════════════════════════════════════════
