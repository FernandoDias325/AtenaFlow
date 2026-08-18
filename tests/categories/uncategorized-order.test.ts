import { describe, expect, it } from 'vitest';
import {
  buildCategoryOrder,
  isUncategorized,
  moveCategoryOrder,
  UNCATEGORIZED_CATEGORY_ID
} from '../../src/core/categories/uncategorized-order';

describe('ordem de Sem categoria', () => {
  it('insere na posição salva e limita posições inválidas', () => {
    expect(buildCategoryOrder(['a', 'b'], 1)).toEqual(['a', UNCATEGORIZED_CATEGORY_ID, 'b']);
    expect(buildCategoryOrder(['a'], -10)).toEqual([UNCATEGORIZED_CATEGORY_ID, 'a']);
    expect(buildCategoryOrder(['a'], 99)).toEqual(['a', UNCATEGORIZED_CATEGORY_ID]);
    expect(buildCategoryOrder(['a'], Number.NaN)).toEqual([UNCATEGORIZED_CATEGORY_ID, 'a']);
  });

  it('move o grupo virtual sem enviá-lo ao repositório de categorias', () => {
    const result = moveCategoryOrder(['a', UNCATEGORIZED_CATEGORY_ID, 'b'], 1, 2);
    expect(result).toEqual({ categoryIds: ['a', 'b'], uncategorizedPosition: 2 });
    expect(moveCategoryOrder(['a'], 0, 2)).toBeNull();
  });

  it('considera nulo e categoria excluída como Sem categoria', () => {
    const validIds = new Set(['categoria-valida']);
    expect(isUncategorized(null, validIds)).toBe(true);
    expect(isUncategorized('categoria-excluida', validIds)).toBe(true);
    expect(isUncategorized('categoria-valida', validIds)).toBe(false);
  });
});
