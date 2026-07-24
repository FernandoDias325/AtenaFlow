/**
 * ScriptEditor.ts — Formulário de criação e edição de scripts.
 *
 * Campos: título, corpo (textarea com auto-resize), observações.
 * Ações: Salvar, Cancelar, Excluir (com modal de confirmação).
 * Usa textContent para prevenir XSS em todos os campos.
 *
 * Referência: ARQUITETURA.md — Seção 6 (ScriptEditor)
 */

import type { Script } from '../../core/models/types';
import { emit } from '../../store/app-store';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as CategoriesRepo from '../../core/db/categories.repository';
import { showConfirmModal } from './ConfirmModal';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg);
    flex-shrink: 0;
  }

  .editor__header-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .editor__close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .editor__close-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .editor__form {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-5);
    gap: var(--space-4);
    overflow-y: auto;
  }

  .editor__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .editor__label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .editor__input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg);
    color: var(--color-text);
    transition: border-color var(--transition-fast);
  }

  .editor__input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }

  .editor__select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-family: var(--font-ui);
    font-weight: var(--font-weight-medium);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--transition-fast);
  }

  .editor__select:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }

  .editor__category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .editor__category-new-btn {
    font-size: var(--font-size-xs);
    color: var(--color-primary);
    cursor: pointer;
    background: transparent;
    font-weight: var(--font-weight-medium);
  }
  .editor__category-new-btn:hover {
    text-decoration: underline;
  }

  .editor__category-create-row {
    display: none;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .editor__category-create-row--visible {
    display: flex;
  }

  .editor__category-create-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    outline: none;
  }

  .editor__category-create-save {
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-primary);
    color: var(--color-primary-text);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }

  .editor__textarea {
    width: 100%;
    min-height: 160px;
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
    transition: border-color var(--transition-fast);
  }

  .editor__textarea:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }

  .editor__textarea-footer {
    display: flex;
    justify-content: flex-end;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-top: calc(-1 * var(--space-2));
  }

  .editor__notes-textarea {
    width: 100%;
    min-height: 60px;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
    transition: border-color var(--transition-fast);
  }

  .editor__notes-textarea:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }

  .editor__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-bg);
    flex-shrink: 0;
  }

  .editor__footer-left {
    display: flex;
    gap: var(--space-2);
  }

  .editor__footer-right {
    display: flex;
    gap: var(--space-2);
  }

  .editor__btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .editor__btn--save {
    background-color: var(--color-primary);
    color: var(--color-primary-text);
  }

  .editor__btn--save:hover {
    background-color: var(--color-primary-hover);
  }

  .editor__btn--save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .editor__btn--cancel {
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .editor__btn--cancel:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .editor__btn--delete {
    background-color: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
  }

  .editor__btn--delete:hover {
    background-color: var(--color-error-soft);
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

export interface ScriptEditorOptions {
  /** Script existente para edição, ou null para criação. */
  script: Script | null;
}

/**
 * Cria o formulário de editor de script.
 * Gerencia salvar (create ou update), cancelar e excluir.
 */
export async function createScriptEditor(options: ScriptEditorOptions): Promise<HTMLElement> {
  injectStyles();

  const { script } = options;
  const isEditing = script !== null;
  const categories = await CategoriesRepo.getAllCategories();

  const container = document.createElement('div');
  container.className = 'editor';

  // ─── Header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'editor__header';

  const headerTitle = document.createElement('span');
  headerTitle.className = 'editor__header-title';
  headerTitle.textContent = isEditing ? 'Editar Script' : 'Novo Script';
  header.appendChild(headerTitle);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'editor__close-btn';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Fechar editor');
  closeBtn.title = 'Fechar';
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  closeBtn.addEventListener('click', goBack);
  header.appendChild(closeBtn);

  container.appendChild(header);

  // ─── Formulário ────────────────────────────────────────────────────
  const form = document.createElement('div');
  form.className = 'editor__form';

  // Campo: Título
  const titleField = document.createElement('div');
  titleField.className = 'editor__field';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'editor__label';
  titleLabel.textContent = 'Assunto';
  titleLabel.htmlFor = 'editor-title';
  titleField.appendChild(titleLabel);

  const titleInput = document.createElement('input');
  titleInput.className = 'editor__input';
  titleInput.id = 'editor-title';
  titleInput.type = 'text';
  titleInput.placeholder = 'Ex: Saudação inicial';
  titleInput.value = script?.title ?? '';
  titleInput.setAttribute('autocomplete', 'off');
  titleField.appendChild(titleInput);

  form.appendChild(titleField);

  // Campo: Categoria
  const categoryField = document.createElement('div');
  categoryField.className = 'editor__field';

  const categoryHeader = document.createElement('div');
  categoryHeader.className = 'editor__category-header';

  const categoryLabel = document.createElement('label');
  categoryLabel.className = 'editor__label';
  categoryLabel.textContent = 'Categoria';
  categoryLabel.htmlFor = 'editor-category';
  categoryHeader.appendChild(categoryLabel);

  const newCategoryBtn = document.createElement('button');
  newCategoryBtn.className = 'editor__category-new-btn';
  newCategoryBtn.type = 'button';
  newCategoryBtn.textContent = '+ Nova categoria';
  categoryHeader.appendChild(newCategoryBtn);
  
  categoryField.appendChild(categoryHeader);

  const categorySelect = document.createElement('select');
  categorySelect.className = 'editor__select';
  categorySelect.id = 'editor-category';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Sem categoria';
  categorySelect.appendChild(defaultOption);

  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    if (script?.categoryId === cat.id) {
      opt.selected = true;
    }
    categorySelect.appendChild(opt);
  }
  categoryField.appendChild(categorySelect);

  // Linha de criação inline
  const createRow = document.createElement('div');
  createRow.className = 'editor__category-create-row';

  const createInput = document.createElement('input');
  createInput.className = 'editor__category-create-input';
  createInput.type = 'text';
  createInput.placeholder = 'Nome da categoria...';
  createRow.appendChild(createInput);

  const createSaveBtn = document.createElement('button');
  createSaveBtn.className = 'editor__category-create-save';
  createSaveBtn.type = 'button';
  createSaveBtn.textContent = 'Criar';
  createRow.appendChild(createSaveBtn);

  categoryField.appendChild(createRow);

  newCategoryBtn.addEventListener('click', () => {
    createRow.classList.toggle('editor__category-create-row--visible');
    if (createRow.classList.contains('editor__category-create-row--visible')) {
      createInput.focus();
    }
  });

  createSaveBtn.addEventListener('click', async () => {
    const name = createInput.value.trim();
    if (!name) return;

    // Evitar duplicadas
    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      emit('toast', { message: 'Categoria já existe!', type: 'error' });
      return;
    }

    try {
      const newCat = await CategoriesRepo.createCategory({ name, color: '#6366f1' });
      categories.push(newCat);
      
      const opt = document.createElement('option');
      opt.value = newCat.id;
      opt.textContent = newCat.name;
      opt.selected = true;
      categorySelect.appendChild(opt);

      createInput.value = '';
      createRow.classList.remove('editor__category-create-row--visible');
      emit('toast', { message: 'Categoria criada!', type: 'success' });
    } catch (e) {
      emit('toast', { message: 'Erro ao criar', type: 'error' });
    }
  });

  createInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createSaveBtn.click();
    }
  });

  form.appendChild(categoryField);

  // Campo: Corpo do script
  const bodyField = document.createElement('div');
  bodyField.className = 'editor__field';

  const bodyLabel = document.createElement('label');
  bodyLabel.className = 'editor__label';
  bodyLabel.textContent = 'Script';
  bodyLabel.htmlFor = 'editor-body';
  bodyField.appendChild(bodyLabel);

  const bodyTextarea = document.createElement('textarea');
  bodyTextarea.className = 'editor__textarea';
  bodyTextarea.id = 'editor-body';
  bodyTextarea.placeholder = 'Cole ou escreva o texto do script aqui...';
  bodyTextarea.value = script?.body ?? '';
  bodyField.appendChild(bodyTextarea);

  // Contador de caracteres
  const charCount = document.createElement('div');
  charCount.className = 'editor__textarea-footer';
  charCount.textContent = `${bodyTextarea.value.length} caracteres`;
  bodyField.appendChild(charCount);

  bodyTextarea.addEventListener('input', () => {
    charCount.textContent = `${bodyTextarea.value.length} caracteres`;
    updateSaveButtonState();
  });

  form.appendChild(bodyField);

  // Campo: Observações
  const notesField = document.createElement('div');
  notesField.className = 'editor__field';

  const notesLabel = document.createElement('label');
  notesLabel.className = 'editor__label';
  notesLabel.textContent = 'Observações (opcional)';
  notesLabel.htmlFor = 'editor-notes';
  notesField.appendChild(notesLabel);

  const notesTextarea = document.createElement('textarea');
  notesTextarea.className = 'editor__notes-textarea';
  notesTextarea.id = 'editor-notes';
  notesTextarea.placeholder = 'Anotações internas sobre quando usar este script...';
  notesTextarea.value = script?.notes ?? '';
  notesField.appendChild(notesTextarea);

  form.appendChild(notesField);

  container.appendChild(form);

  // ─── Footer com ações ──────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'editor__footer';

  const footerLeft = document.createElement('div');
  footerLeft.className = 'editor__footer-left';

  // Botão Excluir (só aparece ao editar)
  if (isEditing) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'editor__btn editor__btn--delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Excluir script',
        message: `Tem certeza que deseja excluir "${script.title}"? Ele será movido para a lixeira.`,
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar'
      });

      if (confirmed) {
        await ScriptsRepo.softDeleteScript(script.id);
        emit('toast', { message: 'Script movido para a lixeira', type: 'info' });
        goBack();
      }
    });
    footerLeft.appendChild(deleteBtn);
  }

  footer.appendChild(footerLeft);

  const footerRight = document.createElement('div');
  footerRight.className = 'editor__footer-right';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'editor__btn editor__btn--cancel';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', goBack);
  footerRight.appendChild(cancelBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'editor__btn editor__btn--save';
  saveBtn.type = 'button';
  saveBtn.id = 'btn-save-script';
  saveBtn.textContent = 'Salvar';
  saveBtn.addEventListener('click', handleSave);
  footerRight.appendChild(saveBtn);

  footer.appendChild(footerRight);
  container.appendChild(footer);

  // ─── Estado do botão Salvar ────────────────────────────────────────

  titleInput.addEventListener('input', updateSaveButtonState);

  function updateSaveButtonState(): void {
    const hasTitle = titleInput.value.trim().length > 0;
    const hasBody = bodyTextarea.value.trim().length > 0;
    saveBtn.disabled = !(hasTitle && hasBody);
  }

  // Validação inicial
  updateSaveButtonState();

  // ─── Handlers ──────────────────────────────────────────────────────

  async function handleSave(): Promise<void> {
    const title = titleInput.value.trim();
    const body = bodyTextarea.value.trim();
    const notes = notesTextarea.value.trim() || undefined;
    const categoryId = categorySelect.value || null;

    if (!title || !body) {
      emit('toast', { message: 'Preencha o assunto e o script', type: 'error' });
      return;
    }

    try {
      if (isEditing) {
        await ScriptsRepo.updateScript(script.id, { title, body, notes, categoryId });
        emit('toast', { message: 'Script atualizado!', type: 'success' });
      } else {
        await ScriptsRepo.createScript({ title, body, notes, categoryId });
        emit('toast', { message: 'Script criado!', type: 'success' });
      }
      goBack();
    } catch (error) {
      console.error('Erro ao salvar script:', error);
      emit('toast', { message: 'Erro ao salvar', type: 'error' });
    }
  }

  function goBack(): void {
    emit('view-changed', { view: 'list' });
  }

  // ─── Foco inicial ─────────────────────────────────────────────────
  requestAnimationFrame(() => {
    titleInput.focus();
  });

  return container;
}
