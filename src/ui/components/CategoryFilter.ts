/**
 * CategoryFilter.ts — Filtro horizontal de categorias.
 *
 * Renderiza uma barra com chips roláveis para filtrar scripts
 * por categoria rapidamente. Cada chip exibe um ponto de cor
 * da categoria. O chip ativo recebe destaque visual.
 *
 * Referência: ARQUITETURA.md — Fase 4
 */

import type { Category } from '../../core/models/types';
import { emit } from '../../store/app-store';

// ─── Paleta de cores de tag ──────────────────────────────────────────────────

/** Paleta fixa de cores para categorias (rotatória). */
const TAG_COLORS = [
  'var(--color-tag-blue)',
  'var(--color-tag-teal)',
  'var(--color-tag-coral)',
  'var(--color-tag-violet)',
  'var(--color-tag-amber)',
  'var(--color-tag-green)',
];

/** Retorna a cor de tag para um índice de categoria. */
export function getTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length] as string;
}

/** Mapa de ID de categoria → cor, preenchido durante o render. */
export const categoryColorMap = new Map<string, string>();

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .category-chips {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--color-scrollbar-thumb) transparent;
  }

  .category-chips::-webkit-scrollbar {
    height: 3px;
  }

  .category-chips::-webkit-scrollbar-track {
    background: transparent;
  }

  .category-chips::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: var(--radius-full);
  }

  .category-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid var(--color-border);
    background-color: transparent;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
    font-family: var(--font-ui);
    line-height: 1.4;
  }

  .category-chip:hover {
    border-color: var(--color-border-hover);
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .category-chip--active {
    border-color: var(--color-primary);
    background-color: var(--color-primary-soft);
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
  }

  .category-chip--active:hover {
    border-color: var(--color-primary);
    background-color: var(--color-primary-soft);
  }

  .category-chip__dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .category-chip__manage {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    cursor: pointer;
    border: 1px dashed var(--color-border);
    background-color: transparent;
    color: var(--color-text-tertiary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
    font-family: var(--font-ui);
    line-height: 1.4;
  }

  .category-chip__manage:hover {
    color: var(--color-text-secondary);
    background-color: var(--color-bg-hover);
    border-style: solid;
  }
`;

// ─── Injeção de estilos ──────────────────────────────────────────────────────

let styleInjected = false;

function injectStyles(): void {
  if (styleInjected) {
    return;
  }
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export interface CategoryFilterOptions {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

/**
 * Cria a barra de filtro de categorias com chips roláveis.
 */
export function createCategoryFilter(options: CategoryFilterOptions): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'category-chips';

  const { categories, selectedCategoryId, onSelect } = options;

  // Atualiza o mapa de cores
  categoryColorMap.clear();
  categories.forEach((cat, index) => {
    categoryColorMap.set(cat.id, getTagColor(index));
  });

  // Chip "Todas"
  const allChip = document.createElement('button');
  allChip.className = `category-chip${selectedCategoryId === null ? ' category-chip--active' : ''}`;
  allChip.type = 'button';
  allChip.textContent = 'Todas';
  allChip.addEventListener('click', () => onSelect(null));
  container.appendChild(allChip);

  // Chips de cada categoria
  categories.forEach((cat, index) => {
    const chip = document.createElement('button');
    chip.className = `category-chip${selectedCategoryId === cat.id ? ' category-chip--active' : ''}`;
    chip.type = 'button';

    // Ponto de cor
    const dot = document.createElement('span');
    dot.className = 'category-chip__dot';
    dot.style.backgroundColor = getTagColor(index);
    chip.appendChild(dot);

    // Nome
    const nameSpan = document.createElement('span');
    nameSpan.textContent = cat.name;
    chip.appendChild(nameSpan);

    chip.addEventListener('click', () => onSelect(cat.id));
    container.appendChild(chip);
  });

  // Botão "+ gerenciar"
  if (categories.length > 0) {
    const manageBtn = document.createElement('button');
    manageBtn.className = 'category-chip__manage';
    manageBtn.type = 'button';
    manageBtn.title = 'Gerenciar Categorias';
    manageBtn.setAttribute('aria-label', 'Gerenciar Categorias');
    manageBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
    const mText = document.createElement('span');
    mText.textContent = 'gerenciar';
    manageBtn.appendChild(mText);
    manageBtn.addEventListener('click', () => {
      emit('view-changed', { view: 'categories' });
    });
    container.appendChild(manageBtn);
  }

  // Scroll horizontal via roda do mouse (desktop)
  container.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  return container;
}
