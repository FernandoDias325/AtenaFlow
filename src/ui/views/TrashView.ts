/**
 * TrashView.ts — Tela de lixeira.
 *
 * Exibe scripts excluídos logicamente.
 * Permite restaurar ou apagar permanentemente (com confirmação).
 *
 * Referência: ARQUITETURA.md — Fase 6
 */

import { emit } from '../../store/app-store';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as LinksRepo from '../../core/db/links.repository';
import type { Script, Link } from '../../core/models/types';
import { showConfirmModal } from '../components/ConfirmModal';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .trash-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .trash-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .trash-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .trash-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .trash-view__title {
    flex: 1;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .trash-view__empty-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-error);
    background-color: var(--color-error-soft);
    border: none;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .trash-view__empty-btn:hover {
    background-color: var(--color-error);
    color: var(--color-bg);
  }

  .trash-view__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 0;
  }

  .trash-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    transition: background-color var(--transition-fast);
  }

  .trash-item:hover {
    background-color: var(--color-bg-hover);
  }

  .trash-item__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .trash-item__title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trash-item__date {
    font-size: 10px;
    color: var(--color-text-tertiary);
  }

  .trash-item__actions {
    display: flex;
    gap: var(--space-1);
  }

  .trash-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: transparent;
    transition: all var(--transition-fast);
  }

  .trash-btn--restore {
    color: var(--color-primary);
  }

  .trash-btn--restore:hover {
    background-color: var(--color-primary-soft);
  }

  .trash-btn--delete {
    color: var(--color-error);
  }

  .trash-btn--delete:hover {
    background-color: var(--color-error-soft);
  }

  .trash-empty-state {
    padding: var(--space-5);
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: var(--font-size-sm);
  }

  .trash-item__badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    margin-left: 8px;
    vertical-align: middle;
  }
  .trash-item__badge--script {
    background-color: var(--color-primary-soft);
    color: var(--color-primary);
  }
  .trash-item__badge--link {
    background-color: #e0f2fe;
    color: #0284c7;
  }
`;

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

export async function createTrashView(): Promise<HTMLElement> {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'trash-view';

  // ─── Header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'trash-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'trash-view__back-btn';
  backBtn.setAttribute('aria-label', 'Voltar para configurações');
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    // Retorna para configurações pois é de onde viemos
    emit('view-changed', { view: 'settings' });
  });
  header.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'trash-view__title';
  title.textContent = 'Lixeira';
  header.appendChild(title);

  const emptyAllBtn = document.createElement('button');
  emptyAllBtn.className = 'trash-view__empty-btn';
  emptyAllBtn.textContent = 'Esvaziar';
  emptyAllBtn.style.display = 'none'; // oculto se vazia
  header.appendChild(emptyAllBtn);

  container.appendChild(header);

  // ─── Conteúdo ──────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'trash-view__content';
  container.appendChild(content);

  // ─── Lógica ────────────────────────────────────────────────────────
  // ─── Lógica ────────────────────────────────────────────────────────
  type TrashItem =
    | { type: 'script'; item: Script; deletedAt: number }
    | { type: 'link'; item: Link; deletedAt: number };

  let deletedItems: TrashItem[] = [];

  async function renderList() {
    content.innerHTML = '';
    const deletedScripts = await ScriptsRepo.getAllDeletedScripts();
    const deletedLinks = await LinksRepo.getAllDeletedLinks();

    deletedItems = [
      ...deletedScripts.map((s) => ({
        type: 'script' as const,
        item: s,
        deletedAt: s.deletedAt || 0
      })),
      ...deletedLinks.map((l) => ({ type: 'link' as const, item: l, deletedAt: l.deletedAt || 0 }))
    ];

    // Ordena pelo momento de exclusão (mais recentes primeiro)
    deletedItems.sort((a, b) => b.deletedAt - a.deletedAt);

    if (deletedItems.length === 0) {
      emptyAllBtn.style.display = 'none';
      const emptyState = document.createElement('div');
      emptyState.className = 'trash-empty-state';
      emptyState.textContent = 'A lixeira está vazia.';
      content.appendChild(emptyState);
      return;
    }

    emptyAllBtn.style.display = 'block';

    for (const trashObj of deletedItems) {
      const { type, item, deletedAt } = trashObj;

      const itemEl = document.createElement('div');
      itemEl.className = 'trash-item';

      const infoEl = document.createElement('div');
      infoEl.className = 'trash-item__info';

      const titleEl = document.createElement('div');
      titleEl.className = 'trash-item__title';
      const titleText = document.createTextNode(item.title);
      const badge = document.createElement('span');
      badge.className = `trash-item__badge trash-item__badge--${type}`;
      badge.textContent = type === 'script' ? 'Script' : 'Link';
      titleEl.append(titleText, badge);
      infoEl.appendChild(titleEl);

      const dateEl = document.createElement('div');
      dateEl.className = 'trash-item__date';
      const dateStr = new Date(deletedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      dateEl.textContent = `Apagado em ${dateStr}`;
      infoEl.appendChild(dateEl);

      itemEl.appendChild(infoEl);

      const actionsEl = document.createElement('div');
      actionsEl.className = 'trash-item__actions';

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'trash-btn trash-btn--restore';
      restoreBtn.title = 'Restaurar';
      restoreBtn.setAttribute('aria-label', `Restaurar ${item.title}`);
      restoreBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
      restoreBtn.addEventListener('click', async () => {
        if (type === 'script') {
          await ScriptsRepo.restoreScript(item.id);
        } else {
          await LinksRepo.restoreLink(item.id);
        }
        emit('toast', {
          message: `${type === 'script' ? 'Script' : 'Link'} restaurado!`,
          type: 'success'
        });
        await renderList();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'trash-btn trash-btn--delete';
      delBtn.title = 'Excluir Definitivamente';
      delBtn.setAttribute('aria-label', `Excluir definitivamente ${item.title}`);
      delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="14" y1="11" y2="17"/><line x1="14" x2="10" y1="11" y2="17"/></svg>`;
      delBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal({
          title: 'Excluir Definitivamente',
          message: `Atenção: A exclusão de "${item.title}" não pode ser desfeita. Confirmar exclusão física?`,
          confirmLabel: 'Excluir',
          cancelLabel: 'Cancelar'
        });
        if (confirmed) {
          if (type === 'script') {
            await ScriptsRepo.hardDeleteScript(item.id);
          } else {
            await LinksRepo.hardDeleteLink(item.id);
          }
          emit('toast', {
            message: `${type === 'script' ? 'Script' : 'Link'} apagado`,
            type: 'info'
          });
          await renderList();
        }
      });

      actionsEl.appendChild(restoreBtn);
      actionsEl.appendChild(delBtn);
      itemEl.appendChild(actionsEl);

      content.appendChild(itemEl);
    }
  }

  emptyAllBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Esvaziar Lixeira',
      message: 'Todos os itens da lixeira serão perdidos para sempre. Deseja continuar?',
      confirmLabel: 'Esvaziar',
      cancelLabel: 'Cancelar'
    });

    if (confirmed) {
      for (const trashObj of deletedItems) {
        if (trashObj.type === 'script') {
          await ScriptsRepo.hardDeleteScript(trashObj.item.id);
        } else {
          await LinksRepo.hardDeleteLink(trashObj.item.id);
        }
      }
      emit('toast', { message: 'Lixeira esvaziada', type: 'success' });
      await renderList();
    }
  });

  await renderList();

  return container;
}
