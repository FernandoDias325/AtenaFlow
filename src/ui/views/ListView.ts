/**
 * ListView.ts — View da lista principal de scripts.
 *
 * Compõe o Toolbar + SearchBar + Barra unificada (chips de categoria
 * + contador + ordenação) + ScriptList. Carrega os scripts ativos
 * do repositório e re-renderiza quando o estado muda.
 *
 * Referência: ARQUITETURA.md — Seção 7 (Lista principal)
 */

import { createToolbar } from '../components/Toolbar';
import { createSearchBar } from '../components/SearchBar';
import {
  createCategoryFilter,
  categoryColorMap,
  UNCATEGORIZED_CATEGORY_ID
} from '../components/CategoryFilter';
import { createScriptList } from '../components/ScriptList';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as CategoriesRepo from '../../core/db/categories.repository';
import { filterScripts, sortScripts } from '../../core/search/search-index';
import type { Script, Category } from '../../core/models/types';
import { updateScriptCardUsage } from '../components/ScriptCard';
import { showConfirmModal } from '../components/ConfirmModal';
import { isUncategorized } from '../../core/categories/uncategorized-order';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .list-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .list-view__filters {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .list-view__filters .category-chips {
    padding-bottom: var(--space-1);
  }

  .list-view__meta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    justify-content: flex-end;
    padding: 0 var(--space-4) var(--space-2);
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
    box-sizing: border-box;
  }

  .list-view__meta--selection {
    display: grid;
    grid-template-columns: auto auto minmax(90px, 1fr) auto;
    width: 100%;
    justify-content: stretch;
  }
  .list-view__meta--selection .list-view__meta-sort { width: 100%; min-width: 0; }

  .list-view__density-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    color: var(--color-text-tertiary);
  }
  .list-view__density-btn:hover { background: var(--color-bg-tertiary); color: var(--color-text); }

  .list-view__meta-sort {
    font-size: var(--font-size-xs);
    padding: 2px 4px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    outline: none;
    cursor: pointer;
    font-family: var(--font-ui);
  }

  .list-view__bulk-btn {
    padding: 3px 7px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    font-size: var(--font-size-xs);
  }
  .list-view__bulk-btn:disabled { opacity: .45; cursor: default; }
  .list-view__bulk-btn--danger { color: var(--color-error); }
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

// ─── View ────────────────────────────────────────────────────────────────────

/** Referência do container para permitir refresh sem recriação completa. */
let listContainer: HTMLElement | null = null;
let viewContainer: HTMLElement | null = null;
let filterBarContainer: HTMLElement | null = null;

/** Cache de scripts ativos carregado do banco. */
let cachedScripts: Script[] = [];
/** Cache de categorias ativas. */
let cachedCategories: Category[] = [];

/** Termo de busca atual. */
let currentQuery = '';
/** Categoria atual selecionada (null = Todas) */
let currentCategory: string | null = null;
/** Modo de ordenação. */
let currentSortMode: 'recent' | 'usage' = 'recent';
let compactMode = localStorage.getItem('atenaflow-list-density') === 'compact';
let selectionMode = false;
const selectedScriptIds = new Set<string>();

/**
 * Cria a view da lista principal.
 * @returns O elemento raiz da ListView.
 */
export async function createListView(): Promise<HTMLElement> {
  injectStyles();

  viewContainer = document.createElement('div');
  viewContainer.className = `list-view${compactMode ? ' list-view--compact' : ''}`;

  // Toolbar
  const toolbar = createToolbar();
  viewContainer.appendChild(toolbar);

  // SearchBar
  const searchBar = createSearchBar({
    initialValue: currentQuery,
    onSearch: (query) => {
      currentQuery = query;
      renderFilterBarAndList();
    }
  });
  viewContainer.appendChild(searchBar);

  // Carrega do banco inicial (scripts e categorias)
  await loadDataFromDB();

  return viewContainer;
}

/**
 * Recarrega os dados do banco e re-renderiza.
 * Chamado no refresh após ações de CRUD.
 */
export async function refreshListView(): Promise<void> {
  await loadDataFromDB();
}

export function updateListUsageCount(scriptId: string, usageCount: number): void {
  const script = cachedScripts.find((item) => item.id === scriptId);
  if (script) {
    script.usageCount = usageCount;
  }
  updateScriptCardUsage(scriptId, usageCount);
}

/** Carrega os dados do IndexedDB para a memória. */
async function loadDataFromDB(): Promise<void> {
  cachedScripts = await ScriptsRepo.getAllActiveScripts();
  cachedCategories = await CategoriesRepo.getAllCategories();

  // Renderiza a barra unificada + lista
  renderFilterBarAndList();
}

/**
 * Renderiza a barra unificada (chips + contador + ordenação) e a lista.
 * Chamada sempre que filtro, busca ou ordenação mudam.
 */
function renderFilterBarAndList(): void {
  if (!viewContainer) {
    return;
  }

  // Remove barra anterior
  if (filterBarContainer && viewContainer.contains(filterBarContainer)) {
    viewContainer.removeChild(filterBarContainer);
  }

  // Remove lista anterior
  if (listContainer && viewContainer.contains(listContainer)) {
    viewContainer.removeChild(listContainer);
  }

  // ─── Filtragem e ordenação ────────────────────────────────────────
  let filtered = cachedScripts;
  if (currentCategory === UNCATEGORIZED_CATEGORY_ID) {
    const validCategoryIds = new Set(cachedCategories.map((category) => category.id));
    filtered = filtered.filter((script) => isUncategorized(script.categoryId, validCategoryIds));
  } else if (currentCategory) {
    filtered = filtered.filter((s) => s.categoryId === currentCategory);
  }
  filtered = filterScripts(filtered, currentQuery);
  const sorted = sortScripts(filtered, currentSortMode);

  // ─── Barra unificada ──────────────────────────────────────────────

  // Cria o CategoryFilter (preenche categoryColorMap como efeito colateral)
  const chipBar = createCategoryFilter({
    categories: cachedCategories,
    selectedCategoryId: currentCategory,
    onSelect: (categoryId) => {
      currentCategory = categoryId;
      renderFilterBarAndList();
    }
  });

  // Adiciona metadados (contagem + ordenação) ao final da barra de chips
  const meta = document.createElement('span');
  meta.className = `list-view__meta${selectionMode ? ' list-view__meta--selection' : ''}`;

  const countText = document.createElement('span');
  countText.textContent = `${sorted.length} script${sorted.length !== 1 ? 's' : ''}`;
  if (!selectionMode) {
    meta.appendChild(countText);
  }

  const selectModeBtn = document.createElement('button');
  selectModeBtn.className = 'list-view__bulk-btn';
  selectModeBtn.textContent = selectionMode ? 'Cancelar' : 'Selecionar';
  selectModeBtn.addEventListener('click', () => {
    selectionMode = !selectionMode;
    selectedScriptIds.clear();
    renderFilterBarAndList();
  });
  meta.appendChild(selectModeBtn);

  if (selectionMode) {
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'list-view__bulk-btn';
    selectAllBtn.textContent = selectedScriptIds.size === sorted.length ? 'Desmarcar' : 'Todos';
    selectAllBtn.addEventListener('click', () => {
      if (selectedScriptIds.size === sorted.length) {
        selectedScriptIds.clear();
      } else {
        sorted.forEach((script) => selectedScriptIds.add(script.id));
      }
      renderFilterBarAndList();
    });
    meta.appendChild(selectAllBtn);

    const moveSelect = document.createElement('select');
    moveSelect.className = 'list-view__meta-sort';
    moveSelect.disabled = selectedScriptIds.size === 0;
    moveSelect.innerHTML =
      '<option value="">Mover para…</option><option value="__none__">Sem categoria</option>';
    for (const category of cachedCategories) {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      moveSelect.appendChild(option);
    }
    moveSelect.addEventListener('change', async () => {
      if (!moveSelect.value) {
        return;
      }
      const categoryId = moveSelect.value === '__none__' ? null : moveSelect.value;
      await Promise.all(
        [...selectedScriptIds].map((id) => ScriptsRepo.updateScript(id, { categoryId }))
      );
      selectedScriptIds.clear();
      selectionMode = false;
      await loadDataFromDB();
    });
    meta.appendChild(moveSelect);

    const deleteSelectedBtn = document.createElement('button');
    deleteSelectedBtn.className = 'list-view__bulk-btn list-view__bulk-btn--danger';
    deleteSelectedBtn.textContent = `Excluir (${selectedScriptIds.size})`;
    deleteSelectedBtn.disabled = selectedScriptIds.size === 0;
    deleteSelectedBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Excluir scripts selecionados',
        message: `${selectedScriptIds.size} script(s) serão enviados para a lixeira.`,
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar'
      });
      if (!confirmed) {
        return;
      }
      await Promise.all([...selectedScriptIds].map((id) => ScriptsRepo.softDeleteScript(id)));
      selectedScriptIds.clear();
      selectionMode = false;
      await loadDataFromDB();
    });
    meta.appendChild(deleteSelectedBtn);
  }

  if (!selectionMode) {
    const dot = document.createElement('span');
    dot.textContent = '·';
    meta.appendChild(dot);

    const sortSelect = document.createElement('select');
    sortSelect.className = 'list-view__meta-sort';
    sortSelect.innerHTML = `
      <option value="recent" ${currentSortMode === 'recent' ? 'selected' : ''}>Recentes</option>
      <option value="usage" ${currentSortMode === 'usage' ? 'selected' : ''}>Mais usados</option>
    `;
    sortSelect.addEventListener('change', (e) => {
      currentSortMode = (e.target as HTMLSelectElement).value as 'recent' | 'usage';
      renderFilterBarAndList();
    });
    meta.appendChild(sortSelect);

    const densityBtn = document.createElement('button');
    densityBtn.className = 'list-view__density-btn';
    densityBtn.type = 'button';
    densityBtn.title = compactMode ? 'Visualização confortável' : 'Visualização compacta';
    densityBtn.setAttribute('aria-label', densityBtn.title);
    densityBtn.innerHTML = compactMode
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    densityBtn.addEventListener('click', () => {
      compactMode = !compactMode;
      localStorage.setItem('atenaflow-list-density', compactMode ? 'compact' : 'comfortable');
      viewContainer?.classList.toggle('list-view--compact', compactMode);
      renderFilterBarAndList();
    });
    meta.appendChild(densityBtn);
  }

  const filters = document.createElement('div');
  filters.className = 'list-view__filters';
  filters.append(chipBar, meta);
  filterBarContainer = filters;
  viewContainer.appendChild(filterBarContainer);

  // ─── Lista de scripts ─────────────────────────────────────────────

  listContainer = createScriptList({
    scripts: sorted,
    onRefresh: () => {
      refreshListView();
    },
    categoryColors: categoryColorMap,
    searchQuery: currentQuery,
    selectionMode,
    selectedIds: selectedScriptIds,
    onSelectionChange: (scriptId, selected) => {
      if (selected) {
        selectedScriptIds.add(scriptId);
      } else {
        selectedScriptIds.delete(scriptId);
      }
      renderFilterBarAndList();
    }
  });

  viewContainer.appendChild(listContainer);
}
