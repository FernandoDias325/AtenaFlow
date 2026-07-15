/**
 * CategoryFilter.ts — Filtro horizontal de categorias.
 *
 * Renderiza uma barra com chips roláveis para filtrar scripts
 * por categoria rapidamente. O último item é um botão para gerenciar categorias.
 *
 * Referência: ARQUITETURA.md — Fase 4
 */

import type { Category } from '../../core/models/types';
import { emit } from '../../store/app-store';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .category-filter {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-5);
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
  }

  .category-filter__select {
    flex: 1;
    font-size: var(--font-size-sm);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
    outline: none;
    cursor: pointer;
    font-family: var(--font-ui);
    height: 32px;
  }
  
  .category-filter__select:hover,
  .category-filter__select:focus {
    border-color: var(--color-primary);
  }

  .category-filter__manage {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    color: var(--color-text-tertiary);
    background-color: transparent;
    border: 1px dashed var(--color-border);
    cursor: pointer;
    flex-shrink: 0;
    margin-left: auto; /* Empurra para o final se houver espaço */
    transition: all var(--transition-fast);
  }

  .category-filter__manage:hover {
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
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
 * Cria a barra de filtro de categorias.
 */
export function createCategoryFilter(options: CategoryFilterOptions): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'category-filter';

  const { categories, selectedCategoryId, onSelect } = options;

  // Dropdown de categorias
  const select = document.createElement('select');
  select.className = 'category-filter__select';
  
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = 'Filtro: Todas as categorias';
  if (selectedCategoryId === null) allOption.selected = true;
  select.appendChild(allOption);

  for (const cat of categories) {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `Categoria: ${cat.name}`;
    if (selectedCategoryId === cat.id) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    onSelect(val === 'ALL' ? null : val);
  });
  
  container.appendChild(select);

  // Se não houver categorias, mostramos um aviso sutil ou nada
  // O botão de gerenciar sempre fica
  const manageBtn = document.createElement('button');
  manageBtn.className = 'category-filter__manage';
  manageBtn.type = 'button';
  manageBtn.title = 'Gerenciar Categorias';
  manageBtn.setAttribute('aria-label', 'Gerenciar Categorias');
  manageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
  manageBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'categories' });
  });

  container.appendChild(manageBtn);

  return container;
}
