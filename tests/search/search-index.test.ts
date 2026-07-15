import { describe, it, expect } from 'vitest';
import { normalizeText, sortScripts, filterScripts } from '../../src/core/search/search-index';
import type { Script } from '../../src/core/models/types';

describe('Search Index', () => {
  describe('normalizeText', () => {
    it('deve converter para minúsculas', () => {
      expect(normalizeText('TeStE')).toBe('teste');
    });

    it('deve remover acentos', () => {
      expect(normalizeText('João, Atenção, Árvore')).toBe('joao, atencao, arvore');
    });

    it('deve lidar com strings vazias', () => {
      expect(normalizeText('')).toBe('');
      // @ts-expect-error testando runtime safe
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('sortScripts', () => {
    const mockScript = (id: string, overrides: Partial<Script>): Script => ({
      id,
      title: 'T',
      body: '',
      createdAt: 1,
      updatedAt: 1,
      isFavorite: false,
      isPinned: false,
      categoryId: null,
      usageCount: 0,
      ...overrides
    });

    it('deve priorizar scripts fixados, depois favoritos, depois data recente (default)', () => {
      const s1 = mockScript('1', { updatedAt: 100 });
      const s2 = mockScript('2', { updatedAt: 200, isFavorite: true });
      const s3 = mockScript('3', { updatedAt: 150, isPinned: true });
      const s4 = mockScript('4', { updatedAt: 300 });

      const sorted = sortScripts([s1, s2, s3, s4]);
      
      expect(sorted[0]?.id).toBe('3'); // Fixado
      expect(sorted[1]?.id).toBe('2'); // Favorito
      expect(sorted[2]?.id).toBe('4'); // Mais recente entre os restantes
      expect(sorted[3]?.id).toBe('1'); // Mais antigo
    });

    it('deve priorizar uso se mode for usage', () => {
      const s1 = mockScript('1', { updatedAt: 100, usageCount: 50 });
      const s2 = mockScript('2', { updatedAt: 200, usageCount: 10 });
      const s3 = mockScript('3', { updatedAt: 150, isPinned: true, usageCount: 0 }); // Fixado sempre ganha
      
      const sorted = sortScripts([s1, s2, s3], 'usage');
      
      expect(sorted[0]?.id).toBe('3'); // Fixado ganha
      expect(sorted[1]?.id).toBe('1'); // usage = 50
      expect(sorted[2]?.id).toBe('2'); // usage = 10
    });

    it('não deve mutar o array original', () => {
      const s1 = mockScript('1', {});
      const s2 = mockScript('2', {});
      const scripts = [s1, s2];
      sortScripts(scripts);
      expect(scripts[0]?.id).toBe('1');
    });
  });

  describe('filterScripts', () => {
    const scripts: Script[] = [
      { id: '1', title: 'Saudação Manhã', body: 'Bom dia cliente', createdAt: 1, updatedAt: 1, isFavorite: false, isPinned: false, categoryId: null, usageCount: 0 },
      { id: '2', title: 'Despedida', body: 'Até logo João', createdAt: 1, updatedAt: 1, isFavorite: false, isPinned: false, categoryId: null, usageCount: 0 },
      { id: '3', title: 'Erro de Pagamento', body: 'Tente novamente', notes: 'Usar com atenção', createdAt: 1, updatedAt: 1, isFavorite: false, isPinned: false, categoryId: null, usageCount: 0 },
    ];

    it('deve retornar todos se query vazia', () => {
      expect(filterScripts(scripts, '').length).toBe(3);
      expect(filterScripts(scripts, '   ').length).toBe(3);
    });

    it('deve buscar no título (case-insensitive e sem acentos)', () => {
      const res = filterScripts(scripts, 'saudacao');
      expect(res.length).toBe(1);
      expect(res[0]?.id).toBe('1');
    });

    it('deve buscar no corpo', () => {
      const res = filterScripts(scripts, 'joao'); // "João" no body do id 2
      expect(res.length).toBe(1);
      expect(res[0]?.id).toBe('2');
    });

    it('deve buscar nas notas', () => {
      const res = filterScripts(scripts, 'atençao'); // "atenção" nas notas do id 3
      expect(res.length).toBe(1);
      expect(res[0]?.id).toBe('3');
    });
  });
});
