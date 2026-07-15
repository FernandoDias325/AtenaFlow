/**
 * ScriptCard.ts — Card individual de um script na lista.
 *
 * Exibe título, prévia truncada do corpo, botão de copiar rápido
 * e botão de editar. Usa textContent para prevenir XSS.
 *
 * Referência: ARQUITETURA.md — Seção 6 (ScriptCard)
 */

import type { Script } from '../../core/models/types';
import { emit } from '../../store/app-store';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import { recordCopy } from '../../core/db/history.repository';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PREVIEW_MAX_LENGTH = 90;

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .script-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .script-card--pinned {
    border-left-color: var(--color-primary);
  }

  .script-card:hover {
    background-color: var(--color-bg-hover);
  }

  .script-card:active {
    background-color: var(--color-bg-active);
  }

  .script-card__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .script-card__title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--line-height-tight);
  }

  .script-card__preview {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: var(--line-height-base);
  }

  .script-card__actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .script-card:hover .script-card__actions {
    opacity: 1;
  }

  .script-card__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .script-card__action-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .script-card__action-btn--active {
    color: var(--color-warning); /* Dourado para favorito, etc */
  }
  
  .script-card__action-btn--pinned.script-card__action-btn--active {
    color: var(--color-primary); /* Azul para fixado */
  }

  .script-card__action-btn--copy:hover {
    color: var(--color-primary);
  }

  .script-card__usage {
    font-size: 10px;
    font-weight: var(--font-weight-medium);
    color: var(--color-warning);
    background-color: var(--color-warning-soft);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    margin-right: auto;
    display: inline-flex;
    align-items: center;
    gap: 2px;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Trunca o texto para exibição como prévia. */
function truncate(text: string, maxLength: number): string {
  const singleLine = text.replace(/\n/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return singleLine.substring(0, maxLength).trim() + '…';
}

// ─── Componente ──────────────────────────────────────────────────────────────

export interface ScriptCardOptions {
  script: Script;
  onRefresh: () => void;
}

/**
 * Cria um card de script para a lista principal.
 * Clique no card abre o editor; botão de copiar copia o corpo direto.
 */
export function createScriptCard(options: ScriptCardOptions): HTMLElement {
  injectStyles();

  const { script, onRefresh } = options;
  const card = document.createElement('div');
  card.className = 'script-card';
  if (script.isPinned) {
    card.classList.add('script-card--pinned');
  }
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Script: ${script.title}`);

  // ─── Conteúdo ──────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'script-card__content';

  const titleEl = document.createElement('div');
  titleEl.className = 'script-card__title';
  titleEl.textContent = script.title;
  content.appendChild(titleEl);

  const previewEl = document.createElement('div');
  previewEl.className = 'script-card__preview';
  previewEl.textContent = truncate(script.body, PREVIEW_MAX_LENGTH);
  content.appendChild(previewEl);

  card.appendChild(content);

  // ─── Ações ─────────────────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'script-card__actions';

  // Badge de Uso (se houver)
  if (script.usageCount && script.usageCount > 0) {
    const usageBadge = document.createElement('span');
    usageBadge.className = 'script-card__usage';
    usageBadge.title = `Copiado ${script.usageCount} vezes`;
    usageBadge.innerHTML = `🔥 ${script.usageCount}`;
    actions.appendChild(usageBadge);
  }

  // Botão Fixar (Pin)
  const pinBtn = document.createElement('button');
  pinBtn.className = `script-card__action-btn script-card__action-btn--pinned ${script.isPinned ? 'script-card__action-btn--active' : ''}`;
  pinBtn.type = 'button';
  pinBtn.setAttribute('aria-label', script.isPinned ? 'Desfixar script' : 'Fixar script');
  pinBtn.title = script.isPinned ? 'Desfixar' : 'Fixar';
  pinBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${script.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`;
  pinBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await ScriptsRepo.togglePinned(script.id);
    onRefresh();
  });

  // Botão Favoritar
  const favBtn = document.createElement('button');
  favBtn.className = `script-card__action-btn ${script.isFavorite ? 'script-card__action-btn--active' : ''}`;
  favBtn.type = 'button';
  favBtn.setAttribute('aria-label', script.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
  favBtn.title = script.isFavorite ? 'Remover Favorito' : 'Favoritar';
  favBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${script.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  favBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await ScriptsRepo.toggleFavorite(script.id);
    onRefresh();
  });

  // Botão Copiar
  const copyBtn = document.createElement('button');
  copyBtn.className = 'script-card__action-btn script-card__action-btn--copy';
  copyBtn.type = 'button';
  copyBtn.setAttribute('aria-label', 'Copiar script');
  copyBtn.title = 'Copiar';
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(script.body);
      await ScriptsRepo.incrementUsageCount(script.id);
      await recordCopy(script.id);
      emit('toast', { message: 'Copiado!', type: 'success' });
      onRefresh();
    } catch (error) {
      console.error('Erro ao copiar:', error);
      emit('toast', { message: 'Erro ao copiar', type: 'error' });
    }
  });

  // Botão Editar
  const editBtn = document.createElement('button');
  editBtn.className = 'script-card__action-btn';
  editBtn.type = 'button';
  editBtn.setAttribute('aria-label', 'Editar script');
  editBtn.title = 'Editar';
  editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emit('view-changed', { view: 'editor', scriptId: script.id });
  });

  actions.appendChild(pinBtn);
  actions.appendChild(favBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  card.appendChild(actions);

  // ─── Clique no card inteiro → editar ───────────────────────────────
  card.addEventListener('click', () => {
    emit('view-changed', { view: 'editor', scriptId: script.id });
  });

  // ─── Suporte a teclado (Enter/Space) ───────────────────────────────
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      emit('view-changed', { view: 'editor', scriptId: script.id });
    }
  });

  return card;
}
