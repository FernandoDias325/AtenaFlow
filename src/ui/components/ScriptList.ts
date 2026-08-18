/**
 * ScriptList.ts — Lista de ScriptCards.
 *
 * Renderiza todos os scripts ativos em uma lista scrollável
 * com cards separados e espaçados. Exibe EmptyState quando não há scripts.
 *
 * Referência: ARQUITETURA.md — Seção 6 (ScriptList)
 */

import type { Script } from '../../core/models/types';
import { createScriptCard } from './ScriptCard';
import { createEmptyState } from './EmptyState';
import { emit } from '../../store/app-store';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .script-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg-list, var(--color-bg-list, var(--color-bg-secondary)));
  }

  .script-list__cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
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

export interface ScriptListOptions {
  scripts: Script[];
  onRefresh: () => void;
  /** Mapa de categoryId → cor CSS para o dot de cada card. */
  categoryColors?: Map<string, string>;
  searchQuery?: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (scriptId: string, selected: boolean) => void;
}

/**
 * Cria o container da lista de scripts.
 * Exibe EmptyState se a lista estiver vazia.
 */
export function createScriptList(options: ScriptListOptions): HTMLElement {
  injectStyles();

  const {
    scripts,
    onRefresh,
    categoryColors,
    searchQuery,
    selectionMode,
    selectedIds,
    onSelectionChange
  } = options;
  const container = document.createElement('div');
  container.className = 'script-list';

  // Estado vazio
  if (scripts.length === 0) {
    const emptyState = createEmptyState({
      onCreateFirst: () => {
        emit('view-changed', { view: 'editor', scriptId: null });
      }
    });
    container.appendChild(emptyState);
    return container;
  }

  // Container dos cards com gap e padding
  const cardsWrapper = document.createElement('div');
  cardsWrapper.className = 'script-list__cards';

  // Renderiza os cards
  for (const script of scripts) {
    const color =
      script.categoryId && categoryColors ? categoryColors.get(script.categoryId) : undefined;
    const card = createScriptCard({
      script,
      onRefresh,
      categoryColor: color,
      searchQuery,
      selectionMode,
      selected: selectedIds?.has(script.id),
      onSelectionChange
    });
    cardsWrapper.appendChild(card);
  }

  container.appendChild(cardsWrapper);

  return container;
}
