/**
 * CategoriesView.ts — Tela de gerenciamento de categorias.
 *
 * Permite criar, editar, excluir e reordenar categorias.
 *
 * Referência: ARQUITETURA.md — Fase 4
 */

import { emit } from '../../store/app-store';
import * as CategoriesRepo from '../../core/db/categories.repository';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import type { Category } from '../../core/models/types';
import { showConfirmModal } from '../components/ConfirmModal';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .cat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-app, var(--color-bg));
  }

  .cat-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-bg) 84%, transparent);
    backdrop-filter: blur(14px);
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

  .cat-view__heading { display: flex; flex-direction: column; gap: 2px; }
  .cat-view__subtitle { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

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
    background: color-mix(in srgb, var(--color-bg) 74%, transparent);
    flex-shrink: 0;
  }

  .cat-view__input {
    flex: 1;
    min-width: 0;
  }

  .cat-view__add-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--bg-primary);
    color: var(--color-primary-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast);
    box-shadow: 0 5px 14px color-mix(in srgb, var(--color-primary) 24%, transparent);
  }

  .cat-view__add-btn:hover {
    background: var(--bg-primary-hover);
  }

  .cat-view__add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cat-view__list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3) var(--space-4);
  }

  .cat-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 44px;
    padding: var(--space-2) var(--space-3);
    margin-bottom: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-bg) 90%, transparent);
    transition: background-color var(--transition-fast);
  }

  .cat-item:hover {
    background-color: var(--color-bg-hover);
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  }

  .cat-item__dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent);
  }

  .cat-item__name {
    flex: 1;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .cat-item__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 58px;
    padding: 3px 8px;
    border-radius: var(--radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 10px;
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
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
  backBtn.setAttribute('aria-label', 'Voltar para scripts');
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  header.appendChild(backBtn);

  const heading = document.createElement('div');
  heading.className = 'cat-view__heading';
  const title = document.createElement('span');
  title.className = 'cat-view__title';
  title.textContent = 'Gerenciar Categorias';
  heading.appendChild(title);
  const subtitle = document.createElement('span');
  subtitle.className = 'cat-view__subtitle';
  subtitle.textContent = 'Organize e reordene seus scripts';
  heading.appendChild(subtitle);
  header.appendChild(heading);

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
    const name = CategoriesRepo.normalizeCategoryName(inputEl.value);
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
      emit('toast', {
        message:
          e instanceof CategoriesRepo.CategoryNameConflictError
            ? 'Essa categoria já existe'
            : 'Erro ao criar',
        type: 'error'
      });
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
    const [loadedCategories, activeScripts] = await Promise.all([
      CategoriesRepo.getAllCategories(),
      ScriptsRepo.getAllActiveScripts()
    ]);
    categories = loadedCategories;
    const scriptCountByCategory = new Map<string, number>();
    activeScripts.forEach((script) => {
      if (script.categoryId) {
        scriptCountByCategory.set(
          script.categoryId,
          (scriptCountByCategory.get(script.categoryId) ?? 0) + 1
        );
      }
    });

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

      const dotEl = document.createElement('span');
      dotEl.className = 'cat-item__dot';
      dotEl.style.backgroundColor = cat.color;
      dotEl.style.color = cat.color;

      // Modo Visualização
      const nameEl = document.createElement('span');
      nameEl.className = 'cat-item__name';
      nameEl.textContent = CategoriesRepo.normalizeCategoryName(cat.name);

      const count = scriptCountByCategory.get(cat.id) ?? 0;
      const countEl = document.createElement('span');
      countEl.className = 'cat-item__count';
      countEl.textContent = `${count} ${count === 1 ? 'script' : 'scripts'}`;
      countEl.title = `${count} ${count === 1 ? 'script vinculado' : 'scripts vinculados'}`;

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
          itemEl.appendChild(dotEl);
          itemEl.appendChild(nameEl);
          itemEl.appendChild(countEl);
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
        const newName = CategoriesRepo.normalizeCategoryName(editInput.value);
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
          emit('toast', {
            message:
              e instanceof CategoriesRepo.CategoryNameConflictError
                ? 'Essa categoria já existe'
                : 'Erro ao atualizar',
            type: 'error'
          });
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

      itemEl.appendChild(dotEl);
      itemEl.appendChild(nameEl);
      itemEl.appendChild(countEl);
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
