import { emit } from '../../store/app-store';
import * as LinksRepo from '../../core/db/links.repository';
import type { Link } from '../../core/models/types';
import { showConfirmModal } from '../components/ConfirmModal';
import { createSearchBar } from '../components/SearchBar';
import { normalizeHttpUrl } from '../../core/validation/url';

const STYLES = `
  .links-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-app, var(--color-bg));
  }

  .links-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-bg) 84%, transparent);
    backdrop-filter: blur(14px);
  }

  .links-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .links-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .links-view__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    flex: 1;
  }

  .links-view__add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
    color: #fff;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    border: none;
    box-shadow: 0 5px 14px color-mix(in srgb, var(--color-primary) 24%, transparent);
    transition: all var(--transition-fast);
  }

  .links-view__add-btn:hover {
    background: var(--bg-primary-hover);
    transform: translateY(-1px);
  }

  .links-view__select-btn {
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
  }
  .links-view__select-btn--danger { color: var(--color-error); }
  .links-view__select-btn:disabled { opacity: .45; }

  .link-item__select { width: 16px; height: 16px; min-width: 16px; max-width: 16px; min-height: 16px; max-height: 16px; aspect-ratio: 1 / 1; padding: 0; box-sizing: border-box; margin-right: 9px; appearance: none; border: 1.5px solid var(--color-border-hover); border-radius: 4px; background: var(--color-bg-secondary); display: grid; place-content: center; cursor: pointer; flex-shrink: 0; }
  .link-item__select::before { content: ''; width: 8px; height: 4px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg) scale(0); transition: transform var(--transition-fast); }
  .link-item__select:checked { border-color: transparent; background: var(--bg-primary, var(--color-primary)); }
  .link-item__select:checked::before { transform: rotate(-45deg) scale(1); }
  .link-item__select:hover { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }

  .links-view__content {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    overflow-y: auto;
    background: transparent;
  }

  .link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 10px;
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .link-item:hover {
    border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    transform: translateY(-1px);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .link-item__info {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 3px 8px;
    flex: 1;
    overflow: hidden;
  }

  .link-item__title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    grid-column: 1 / -1;
  }

  .link-item__url {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-item__usage {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 9px;
    font-weight: var(--font-weight-medium);
  }

  .link-item__actions {
    display: flex;
    gap: 2px;
    margin-left: var(--space-2);
  }

  .link-btn {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .link-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }
  
  .link-btn--danger:hover {
    color: var(--color-error);
    background: var(--color-error-soft);
  }

  .link-modal {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .link-modal__content {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }

  .link-modal__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .link-modal__input {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    box-sizing: border-box;
  }

  .link-modal__input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .link-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .link-modal__btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }

  .link-modal__btn--cancel {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .link-modal__btn--save {
    background: var(--color-primary);
    border: none;
    color: #fff;
  }
`;

export async function createLinksView(): Promise<HTMLElement> {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.className = 'links-view';

  // ─── Header ─────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'links-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'links-view__back-btn';
  backBtn.setAttribute('aria-label', 'Voltar para scripts');
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  header.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'links-view__title';
  title.textContent = 'Links Úteis';
  header.appendChild(title);

  const addBtn = document.createElement('button');
  addBtn.className = 'links-view__add-btn';
  addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Novo Link`;
  addBtn.addEventListener('click', () => showModal());
  header.appendChild(addBtn);

  let selectionMode = false;
  const selectedLinkIds = new Set<string>();

  const selectBtn = document.createElement('button');
  selectBtn.className = 'links-view__select-btn';
  selectBtn.textContent = 'Selecionar';
  header.appendChild(selectBtn);

  const deleteSelectedBtn = document.createElement('button');
  deleteSelectedBtn.className = 'links-view__select-btn links-view__select-btn--danger';
  deleteSelectedBtn.style.display = 'none';
  header.appendChild(deleteSelectedBtn);

  container.appendChild(header);

  let currentQuery = '';

  const searchBar = createSearchBar({
    initialValue: currentQuery,
    placeholder: 'Buscar links...',
    onSearch: (query) => {
      currentQuery = query;
      renderLinks();
    }
  });
  container.appendChild(searchBar);

  // ─── Content ─────────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'links-view__content';
  container.appendChild(content);

  let allLinks: Link[] = [];

  const updateSelectionHeader = () => {
    selectBtn.textContent = selectionMode ? 'Cancelar' : 'Selecionar';
    addBtn.style.display = selectionMode ? 'none' : '';
    deleteSelectedBtn.style.display = selectionMode ? '' : 'none';
    deleteSelectedBtn.textContent = `Excluir (${selectedLinkIds.size})`;
    deleteSelectedBtn.disabled = selectedLinkIds.size === 0;
  };

  selectBtn.addEventListener('click', () => {
    selectionMode = !selectionMode;
    selectedLinkIds.clear();
    updateSelectionHeader();
    void renderLinks();
  });

  deleteSelectedBtn.addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Excluir links selecionados',
      message: `${selectedLinkIds.size} link(s) serão enviados para a lixeira.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar'
    });
    if (!confirmed) {
      return;
    }
    await Promise.all([...selectedLinkIds].map((id) => LinksRepo.deleteLink(id)));
    selectedLinkIds.clear();
    selectionMode = false;
    updateSelectionHeader();
    await renderLinks();
  });

  const renderLinks = async () => {
    content.innerHTML = '';
    allLinks = await LinksRepo.getAllLinks();

    const filteredLinks = allLinks.filter(
      (link) =>
        link.title.toLowerCase().includes(currentQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(currentQuery.toLowerCase())
    );

    if (allLinks.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.style.textAlign = 'center';
      emptyState.style.color = 'var(--color-text-secondary)';
      emptyState.style.padding = 'var(--space-6) 0';
      emptyState.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4; margin-bottom:16px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <div style="font-size: var(--font-size-md); font-weight: 500; margin-bottom: 8px; color: var(--color-text)">Nenhum link salvo</div>
        <div style="font-size: var(--font-size-sm)">Adicione links para sistemas, CRM e sites úteis que você acessa toda hora.</div>
      `;
      content.appendChild(emptyState);
      return;
    }

    if (filteredLinks.length === 0) {
      const emptySearch = document.createElement('div');
      emptySearch.style.textAlign = 'center';
      emptySearch.style.color = 'var(--color-text-secondary)';
      emptySearch.style.padding = 'var(--space-4) 0';
      emptySearch.textContent = 'Nenhum link encontrado para a sua busca.';
      content.appendChild(emptySearch);
      return;
    }

    filteredLinks.forEach((link) => {
      const item = document.createElement('div');
      item.className = 'link-item';

      if (selectionMode) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'link-item__select';
        checkbox.checked = selectedLinkIds.has(link.id);
        checkbox.setAttribute('aria-label', `Selecionar ${link.title}`);
        checkbox.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedLinkIds.add(link.id);
          } else {
            selectedLinkIds.delete(link.id);
          }
          updateSelectionHeader();
        });
        item.appendChild(checkbox);
      }

      const info = document.createElement('div');
      info.className = 'link-item__info';

      const titleEl = document.createElement('div');
      titleEl.className = 'link-item__title';
      titleEl.textContent = LinksRepo.normalizeLinkTitle(link.title);
      info.appendChild(titleEl);

      const urlEl = document.createElement('div');
      urlEl.className = 'link-item__url';
      urlEl.textContent = link.url;
      info.appendChild(urlEl);

      const usageEl = document.createElement('span');
      usageEl.className = 'link-item__usage';
      const updateUsageLabel = (count: number) => {
        usageEl.textContent = `${count} ${count === 1 ? 'uso' : 'usos'}`;
      };
      const recordUsage = async () => {
        const count = await LinksRepo.incrementUsageCount(link.id);
        if (count !== undefined) {
          link.usageCount = count;
          updateUsageLabel(count);
        }
      };
      updateUsageLabel(link.usageCount ?? 0);
      info.appendChild(usageEl);

      item.appendChild(info);

      item.addEventListener('click', () => {
        if (selectionMode) {
          if (selectedLinkIds.has(link.id)) {
            selectedLinkIds.delete(link.id);
          } else {
            selectedLinkIds.add(link.id);
          }
          updateSelectionHeader();
          void renderLinks();
          return;
        }
        const finalUrl = normalizeHttpUrl(link.url);
        if (finalUrl) {
          window.open(finalUrl, '_blank', 'noopener,noreferrer');
          void recordUsage();
        }
      });

      const actions = document.createElement('div');
      actions.className = 'link-item__actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'link-btn';
      copyBtn.setAttribute('aria-label', `Copiar link ${link.title}`);
      copyBtn.title = 'Copiar link';
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      copyBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const url = normalizeHttpUrl(link.url);
        if (!url) {
          emit('toast', { message: 'Este link possui uma URL inválida', type: 'error' });
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          await recordUsage();
          emit('toast', { message: 'Link copiado!', type: 'success' });
        } catch {
          emit('toast', { message: 'Não foi possível copiar o link', type: 'error' });
        }
      });
      actions.appendChild(copyBtn);

      const editBtn = document.createElement('button');
      editBtn.className = 'link-btn';
      editBtn.setAttribute('aria-label', `Editar link ${link.title}`);
      editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showModal(link);
      });
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'link-btn link-btn--danger';
      delBtn.setAttribute('aria-label', `Excluir link ${link.title}`);
      delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const confirmed = await showConfirmModal({
          title: 'Excluir Link',
          message: `Tem certeza que deseja enviar "${link.title}" para a lixeira?`,
          confirmLabel: 'Excluir',
          cancelLabel: 'Cancelar'
        });

        if (confirmed) {
          await LinksRepo.deleteLink(link.id);
          emit('toast', { message: 'Link movido para a lixeira', type: 'info' });
          renderLinks();
        }
      });
      actions.appendChild(delBtn);

      if (!selectionMode) {
        item.appendChild(actions);
      }
      content.appendChild(item);
    });
  };

  // ─── Modal ─────────────────────────────────────────────────────────
  const showModal = (linkToEdit?: Link) => {
    const modal = document.createElement('div');
    modal.className = 'link-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    const closeModal = () => {
      modal.remove();
      document.removeEventListener('keydown', closeOnEscape);
    };

    const modalContent = document.createElement('div');
    modalContent.className = 'link-modal__content';

    const modalTitle = document.createElement('div');
    modalTitle.className = 'link-modal__title';
    modalTitle.id = 'link-modal-title';
    modal.setAttribute('aria-labelledby', modalTitle.id);
    modalTitle.textContent = linkToEdit ? 'Editar Link' : 'Novo Link';
    modalContent.appendChild(modalTitle);

    const titleInput = document.createElement('input');
    titleInput.className = 'link-modal__input';
    titleInput.placeholder = 'Nome do site (ex: CRM Vendas)';
    titleInput.setAttribute('aria-label', 'Nome do link');
    titleInput.value = linkToEdit?.title || '';
    modalContent.appendChild(titleInput);

    const urlInput = document.createElement('input');
    urlInput.className = 'link-modal__input';
    urlInput.placeholder = 'URL (ex: app.crm.com)';
    urlInput.type = 'url';
    urlInput.setAttribute('aria-label', 'Endereço do link');
    urlInput.value = linkToEdit?.url || '';
    modalContent.appendChild(urlInput);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'link-modal__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'link-modal__btn link-modal__btn--cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = closeModal;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'link-modal__btn link-modal__btn--save';
    saveBtn.textContent = 'Salvar';
    saveBtn.onclick = async () => {
      const title = LinksRepo.normalizeLinkTitle(titleInput.value);
      const rawUrl = urlInput.value.trim();
      if (!title || !rawUrl) {
        emit('toast', { message: 'Preencha título e URL', type: 'error' });
        return;
      }
      const url = normalizeHttpUrl(rawUrl);
      if (!url) {
        urlInput.setAttribute('aria-invalid', 'true');
        urlInput.focus();
        emit('toast', { message: 'Informe uma URL HTTP ou HTTPS válida', type: 'error' });
        return;
      }

      try {
        if (linkToEdit) {
          await LinksRepo.updateLink(linkToEdit.id, { title, url });
          emit('toast', { message: 'Link atualizado', type: 'success' });
        } else {
          await LinksRepo.createLink({ title, url });
          emit('toast', { message: 'Link adicionado', type: 'success' });
        }
        closeModal();
        renderLinks();
      } catch (err) {
        emit('toast', { message: 'Erro ao salvar link', type: 'error' });
      }
    };

    actionsRow.appendChild(cancelBtn);
    actionsRow.appendChild(saveBtn);
    modalContent.appendChild(actionsRow);

    modal.appendChild(modalContent);
    container.appendChild(modal);

    document.addEventListener('keydown', closeOnEscape);

    setTimeout(() => titleInput.focus(), 50);
  };

  await renderLinks();
  updateSelectionHeader();
  return container;
}
