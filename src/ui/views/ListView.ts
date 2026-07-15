/**
 * ListView.ts — View da lista principal de scripts.
 *
 * Compõe o Toolbar + ScriptList, carregando os scripts ativos
 * do repositório e re-renderizando quando o estado muda.
 *
 * Referência: ARQUITETURA.md — Seção 7 (Lista principal)
 */

import { createToolbar } from '../components/Toolbar';
import { createSearchBar } from '../components/SearchBar';
import { createCategoryFilter } from '../components/CategoryFilter';
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

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-5);
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .list-header__count {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .list-header__sort {
    font-size: var(--font-size-xs);
    padding: 2px 4px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    outline: none;
    cursor: pointer;
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
let categoryFilterContainer: HTMLElement | null = null;

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

let listHeaderContainer: HTMLElement | null = null;

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
      renderScriptList();
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
  
  // Renderiza a barra de filtro de categorias
  renderCategoryFilter();
  // Renderiza a lista
  await renderScriptList();
}

/** Renderiza a barra de categorias. */
function renderCategoryFilter(): void {
  if (!viewContainer) return;

  if (categoryFilterContainer && viewContainer.contains(categoryFilterContainer)) {
    viewContainer.removeChild(categoryFilterContainer);
  }

  categoryFilterContainer = createCategoryFilter({
    categories: cachedCategories,
    selectedCategoryId: currentCategory,
    onSelect: (categoryId) => {
      currentCategory = categoryId;
      renderCategoryFilter(); // Atualiza a seleção visual do chip
      renderScriptList();     // Filtra a lista
    }
  });

  // Insere logo após o SearchBar (filho no índice 2)
  viewContainer.insertBefore(categoryFilterContainer, viewContainer.children[2]);
}

/** Aplica busca e ordenação no cache e renderiza a lista. */
async function renderScriptList(): Promise<void> {
  if (!viewContainer) {
    return;
  }

  // Remove a lista anterior se existir
  if (listContainer && viewContainer.contains(listContainer)) {
    viewContainer.removeChild(listContainer);
  }

  // Aplica filtro de categoria
  let filtered = cachedScripts;
  if (currentCategory) {
    filtered = filtered.filter(s => s.categoryId === currentCategory);
  }

  // Aplica filtro de busca (se houver texto)
  filtered = filterScripts(filtered, currentQuery);

  // Aplica ordenação
  const sorted = sortScripts(filtered, currentSortMode);

  // Renderiza o List Header (contador e select)
  if (listHeaderContainer && viewContainer.contains(listHeaderContainer)) {
    viewContainer.removeChild(listHeaderContainer);
  }

  listHeaderContainer = document.createElement('div');
  listHeaderContainer.className = 'list-header';
  
  const countEl = document.createElement('span');
  countEl.className = 'list-header__count';
  countEl.textContent = `${sorted.length} script${sorted.length !== 1 ? 's' : ''}`;
  listHeaderContainer.appendChild(countEl);

  const sortSelect = document.createElement('select');
  sortSelect.className = 'list-header__sort';
  sortSelect.innerHTML = `
    <option value="recent" ${currentSortMode === 'recent' ? 'selected' : ''}>Mais Recentes</option>
    <option value="usage" ${currentSortMode === 'usage' ? 'selected' : ''}>Mais Usados</option>
  `;
  sortSelect.addEventListener('change', (e) => {
    currentSortMode = (e.target as HTMLSelectElement).value as 'recent' | 'usage';
    renderScriptList();
  });
  listHeaderContainer.appendChild(sortSelect);

  viewContainer.appendChild(listHeaderContainer);

  listContainer = createScriptList({
    scripts: sorted,
    onRefresh: () => {
      refreshListView();
    }
  });

  viewContainer.appendChild(listContainer);
}
