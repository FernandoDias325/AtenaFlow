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
import { createCategoryFilter, categoryColorMap } from '../components/CategoryFilter';
import { createScriptList } from '../components/ScriptList';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as CategoriesRepo from '../../core/db/categories.repository';
import { filterScripts, sortScripts } from '../../core/search/search-index';
import type { Script, Category } from '../../core/models/types';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .list-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .list-view__filter-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .list-view__filter-bar::-webkit-scrollbar {
    display: none;
  }

  .list-view__meta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }

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

/**
 * Cria a view da lista principal.
 * @returns O elemento raiz da ListView.
 */
export async function createListView(): Promise<HTMLElement> {
  injectStyles();

  viewContainer = document.createElement('div');
  viewContainer.className = 'list-view';

  // Toolbar
  const toolbar = createToolbar();
  viewContainer.appendChild(toolbar);

  // SearchBar
  const searchBar = createSearchBar({
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
  if (!viewContainer) return;

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
  if (currentCategory) {
    filtered = filtered.filter(s => s.categoryId === currentCategory);
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
  meta.className = 'list-view__meta';

  const countText = document.createElement('span');
  countText.textContent = `${sorted.length} script${sorted.length !== 1 ? 's' : ''}`;
  meta.appendChild(countText);

  const dot = document.createElement('span');
  dot.textContent = '·';
  meta.appendChild(dot);

  const sortSelect = document.createElement('select');
  sortSelect.className = 'list-view__meta-sort';
  sortSelect.innerHTML = `
    <option value="recent" ${currentSortMode === 'recent' ? 'selected' : ''}>recentes</option>
    <option value="usage" ${currentSortMode === 'usage' ? 'selected' : ''}>mais usados</option>
  `;
  sortSelect.addEventListener('change', (e) => {
    currentSortMode = (e.target as HTMLSelectElement).value as 'recent' | 'usage';
    renderFilterBarAndList();
  });
  meta.appendChild(sortSelect);

  chipBar.appendChild(meta);
  filterBarContainer = chipBar;
  viewContainer.appendChild(filterBarContainer);

  // ─── Lista de scripts ─────────────────────────────────────────────

  listContainer = createScriptList({
    scripts: sorted,
    onRefresh: () => {
      refreshListView();
    },
    categoryColors: categoryColorMap,
  });

  viewContainer.appendChild(listContainer);
}
