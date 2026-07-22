/**
 * CategoriesView.ts — Tela de gerenciamento de categorias.
 *
 * Permite criar, editar, excluir e reordenar categorias.
 *
 * Referência: ARQUITETURA.md — Fase 4
 */

import { emit } from '../../store/app-store';
import * as CategoriesRepo from '../../core/db/categories.repository';
import type { Category } from '../../core/models/types';
import { showConfirmModal } from '../components/ConfirmModal';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .cat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .cat-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .cat-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .cat-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .cat-view__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .cat-view__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cat-view__create {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
    flex-shrink: 0;
  }

  .cat-view__input {
    flex: 1;
    min-width: 0;
  }

  .cat-view__add-btn {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary);
    color: var(--color-primary-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast);
  }

  .cat-view__add-btn:hover {
    background-color: var(--color-primary-hover);
  }

  .cat-view__add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cat-view__list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 0;
  }

  .cat-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    transition: background-color var(--transition-fast);
  }

  .cat-item:hover {
    background-color: var(--color-bg-hover);
  }

  .cat-item__name {
    flex: 1;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .cat-item__actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .cat-item__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .cat-item__btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .cat-item__btn:disabled {
    opacity: 0.3;
    pointer-events: none;
  }

  .cat-item__btn--delete:hover {
    color: var(--color-error);
    background-color: var(--color-error-soft);
  }

  .cat-item__edit-input {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-sm);
    font-family: var(--font-ui);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    outline: none;
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

export async function createCategoriesView(): Promise<HTMLElement> {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'cat-view';

  // ─── Header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'cat-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'cat-view__back-btn';
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  header.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'cat-view__title';
  title.textContent = 'Gerenciar Categorias';
  header.appendChild(title);

  container.appendChild(header);

  // ─── Conteúdo ──────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'cat-view__content';

  // Formulário de Criação
  const createForm = document.createElement('div');
  createForm.className = 'cat-view__create';

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.className = 'cat-view__input input'; // reaproveita input base do tokens
  inputEl.placeholder = 'Nova categoria...';

  const addBtn = document.createElement('button');
  addBtn.className = 'cat-view__add-btn';
  addBtn.textContent = 'Adicionar';
  addBtn.disabled = true;

  inputEl.addEventListener('input', () => {
    addBtn.disabled = inputEl.value.trim().length === 0;
  });

  addBtn.addEventListener('click', async () => {
    const name = inputEl.value.trim();
    if (!name) {
      return;
    }

    try {
      await CategoriesRepo.createCategory({ name, color: '#6366f1' }); // Cor primária padrão
      inputEl.value = '';
      addBtn.disabled = true;
      emit('toast', { message: 'Categoria criada', type: 'success' });
      await renderList();
      emit('categories-changed', undefined);
    } catch (e) {
      console.error(e);
      emit('toast', { message: 'Erro ao criar', type: 'error' });
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !addBtn.disabled) {
      addBtn.click();
    }
  });

  createForm.appendChild(inputEl);
  createForm.appendChild(addBtn);
  content.appendChild(createForm);

  // Lista de Categorias
  const listContainer = document.createElement('div');
  listContainer.className = 'cat-view__list';
  content.appendChild(listContainer);

  container.appendChild(content);

  // ─── Lógica da Lista ───────────────────────────────────────────────

  let categories: Category[] = [];

  async function renderList() {
    listContainer.innerHTML = '';
    categories = await CategoriesRepo.getAllCategories();

    if (categories.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--space-12) var(--space-6);
        gap: var(--space-3);
      `;

      const iconEl = document.createElement('div');
      iconEl.style.color = 'var(--color-text-tertiary)';
      iconEl.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
      empty.appendChild(iconEl);

      const titleEl = document.createElement('div');
      titleEl.style.cssText = `
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text);
      `;
      titleEl.textContent = 'Nenhuma categoria ainda';
      empty.appendChild(titleEl);

      const descEl = document.createElement('div');
      descEl.style.cssText = `
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        max-width: 240px;
        line-height: var(--line-height-base);
      `;
      descEl.textContent = 'Use o campo acima para criar sua primeira categoria.';
      empty.appendChild(descEl);

      listContainer.appendChild(empty);
      return;
    }

    categories.forEach((cat, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cat-item';

      // Modo Visualização
      const nameEl = document.createElement('span');
      nameEl.className = 'cat-item__name';
      nameEl.textContent = cat.name;

      // Ações
      const actionsEl = document.createElement('div');
      actionsEl.className = 'cat-item__actions';

      const upBtn = document.createElement('button');
      upBtn.className = 'cat-item__btn';
      upBtn.disabled = index === 0;
      upBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;
      upBtn.addEventListener('click', async () => {
        await handleReorder(index, index - 1);
      });

      const downBtn = document.createElement('button');
      downBtn.className = 'cat-item__btn';
      downBtn.disabled = index === categories.length - 1;
      downBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
      downBtn.addEventListener('click', async () => {
        await handleReorder(index, index + 1);
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'cat-item__btn';
      editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;

      const delBtn = document.createElement('button');
      delBtn.className = 'cat-item__btn cat-item__btn--delete';
      delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

      actionsEl.appendChild(upBtn);
      actionsEl.appendChild(downBtn);
      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(delBtn);

      // Modo Edição
      const editInput = document.createElement('input');
      editInput.className = 'cat-item__edit-input';
      editInput.type = 'text';
      editInput.value = cat.name;

      const saveBtn = document.createElement('button');
      saveBtn.className = 'cat-item__btn';
      saveBtn.style.color = 'var(--color-success)';
      saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cat-item__btn';
      cancelBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

      let isEditing = false;

      function toggleEdit() {
        isEditing = !isEditing;
        itemEl.innerHTML = '';
        actionsEl.innerHTML = '';

        if (isEditing) {
          itemEl.appendChild(editInput);
          actionsEl.appendChild(saveBtn);
          actionsEl.appendChild(cancelBtn);
          itemEl.appendChild(actionsEl);
          editInput.focus();
        } else {
          itemEl.appendChild(nameEl);
          actionsEl.appendChild(upBtn);
          actionsEl.appendChild(downBtn);
          actionsEl.appendChild(editBtn);
          actionsEl.appendChild(delBtn);
          itemEl.appendChild(actionsEl);
        }
      }

      editBtn.addEventListener('click', toggleEdit);
      cancelBtn.addEventListener('click', toggleEdit);

      saveBtn.addEventListener('click', async () => {
        const newName = editInput.value.trim();
        if (!newName || newName === cat.name) {
          toggleEdit();
          return;
        }
        try {
          await CategoriesRepo.updateCategory(cat.id, { name: newName });
          emit('toast', { message: 'Categoria atualizada', type: 'success' });
          await renderList();
          emit('categories-changed', undefined);
        } catch (e) {
          console.error(e);
          emit('toast', { message: 'Erro ao atualizar', type: 'error' });
        }
      });

      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveBtn.click();
        }
        if (e.key === 'Escape') {
          cancelBtn.click();
        }
      });

      delBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal({
          title: 'Excluir Categoria',
          message: `Deseja excluir a categoria "${cat.name}"? Os scripts pertencentes a ela não serão apagados, apenas ficarão "Sem categoria".`,
          confirmLabel: 'Excluir',
          cancelLabel: 'Cancelar'
        });

        if (confirmed) {
          await CategoriesRepo.deleteCategory(cat.id);
          emit('toast', { message: 'Categoria excluída', type: 'info' });
          await renderList();
          emit('categories-changed', undefined);
        }
      });

      itemEl.appendChild(nameEl);
      itemEl.appendChild(actionsEl);
      listContainer.appendChild(itemEl);
    });
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= categories.length) {
      return;
    }

    // Clona o array original
    const newOrder = [...categories];
    // Troca
    const temp = newOrder[fromIndex];
    newOrder[fromIndex] = newOrder[toIndex] as Category;
    newOrder[toIndex] = temp as Category;

    // Extrai os IDs na nova ordem
    const orderedIds = newOrder.map((c) => c.id);

    try {
      await CategoriesRepo.reorderCategories(orderedIds);
      await renderList();
      emit('categories-changed', undefined);
    } catch (e) {
      console.error(e);
      emit('toast', { message: 'Erro ao reordenar', type: 'error' });
    }
  }

  // Render inicial
  await renderList();

  return container;
}
