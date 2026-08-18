// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCategoryFilter,
  UNCATEGORIZED_ORDER_KEY
} from '../../src/ui/components/CategoryFilter';
import { showDuplicateReviewModal } from '../../src/ui/components/DuplicateReviewModal';
import type { Category, Script } from '../../src/core/models/types';
import type { ImportDuplicate } from '../../src/core/backup/backup.service';

describe('interfaces de categorias e duplicados', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    localStorage.clear();
  });

  it('renderiza Sem categoria na posição escolhida', () => {
    localStorage.setItem(UNCATEGORIZED_ORDER_KEY, '1');
    const categories = [
      { id: 'a', name: 'Primeira', color: '#111', order: 0, createdAt: 1 },
      { id: 'b', name: 'Segunda', color: '#222', order: 1, createdAt: 1 }
    ] satisfies Category[];
    const filter = createCategoryFilter({
      categories,
      selectedCategoryId: null,
      onSelect: () => undefined
    });
    const labels = [...filter.querySelectorAll<HTMLButtonElement>('.category-chip')].map((button) =>
      button.textContent?.trim()
    );
    expect(labels).toEqual(['Todas', 'Primeira', 'Sem categoria', 'Segunda']);
  });

  it('expande e recolhe o conteúdo completo na revisão', () => {
    const base: Script = {
      id: 'existing',
      title: 'Existente',
      body: 'Conteúdo completo do script existente',
      tags: [],
      categoryId: null,
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null
    };
    const duplicate: ImportDuplicate = {
      key: 'duplicate',
      type: 'script',
      existing: base,
      incoming: { ...base, id: 'incoming', title: 'Novo' },
      similarity: 0.9
    };
    void showDuplicateReviewModal([duplicate]);
    const expand = document.querySelector<HTMLButtonElement>('.duplicate-review__expand');
    const body = document.querySelector<HTMLElement>('.duplicate-review__body');
    expand?.click();
    expect(body?.classList.contains('duplicate-review__body--expanded')).toBe(true);
    expect(expand?.textContent).toBe('Recolher');
    expand?.click();
    expect(body?.classList.contains('duplicate-review__body--expanded')).toBe(false);
  });
});
