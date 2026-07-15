/**
 * ScriptList.ts — Lista de ScriptCards.
 *
 * Renderiza todos os scripts ativos em uma lista scrollável.
 * Exibe EmptyState quando não há scripts.
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
  }

  .script-list__count {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
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
}

/**
 * Cria o container da lista de scripts.
 * Exibe EmptyState se a lista estiver vazia.
 */
export function createScriptList(options: ScriptListOptions): HTMLElement {
  injectStyles();

  const { scripts, onRefresh } = options;
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

  // Contador de scripts
  const countBar = document.createElement('div');
  countBar.className = 'script-list__count';
  countBar.textContent = `${scripts.length} script${scripts.length !== 1 ? 's' : ''}`;
  container.appendChild(countBar);

  // Renderiza os cards
  for (const script of scripts) {
    const card = createScriptCard({ script, onRefresh });
    container.appendChild(card);
  }

  return container;
}
