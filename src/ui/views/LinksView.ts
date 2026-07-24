import { emit } from '../../store/app-store';
import * as LinksRepo from '../../core/db/links.repository';
import type { Link } from '../../core/models/types';
import { showConfirmModal } from '../components/ConfirmModal';
import { createSearchBar } from '../components/SearchBar';

const STYLES = `
  .links-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .links-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
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
    background-color: var(--color-primary);
    color: #fff;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    border: none;
    transition: background-color var(--transition-fast);
  }

  .links-view__add-btn:hover {
    background-color: var(--color-primary-hover);
  }

  .links-view__content {
    flex: 1;
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
  }

  .link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .link-item:hover {
    border-color: var(--color-primary-soft);
  }

  .link-item__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  }

  .link-item__url {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-item__actions {
    display: flex;
    gap: var(--space-2);
  }

  .link-btn {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 4px;
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

  const renderLinks = async () => {
    content.innerHTML = '';
    allLinks = await LinksRepo.getAllLinks();

    const filteredLinks = allLinks.filter(link => 
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

      const info = document.createElement('div');
      info.className = 'link-item__info';

      const titleEl = document.createElement('div');
      titleEl.className = 'link-item__title';
      titleEl.textContent = link.title;
      info.appendChild(titleEl);

      const urlEl = document.createElement('div');
      urlEl.className = 'link-item__url';
      urlEl.textContent = link.url;
      info.appendChild(urlEl);

      item.appendChild(info);

      item.addEventListener('click', () => {
        let finalUrl = link.url;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        window.open(finalUrl, '_blank');
      });

      const actions = document.createElement('div');
      actions.className = 'link-item__actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'link-btn';
      editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showModal(link);
      });
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'link-btn link-btn--danger';
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

      item.appendChild(actions);
      content.appendChild(item);
    });
  };

  // ─── Modal ─────────────────────────────────────────────────────────
  const showModal = (linkToEdit?: Link) => {
    const modal = document.createElement('div');
    modal.className = 'link-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'link-modal__content';

    const modalTitle = document.createElement('div');
    modalTitle.className = 'link-modal__title';
    modalTitle.textContent = linkToEdit ? 'Editar Link' : 'Novo Link';
    modalContent.appendChild(modalTitle);

    const titleInput = document.createElement('input');
    titleInput.className = 'link-modal__input';
    titleInput.placeholder = 'Nome do site (ex: CRM Vendas)';
    titleInput.value = linkToEdit?.title || '';
    modalContent.appendChild(titleInput);

    const urlInput = document.createElement('input');
    urlInput.className = 'link-modal__input';
    urlInput.placeholder = 'URL (ex: app.crm.com)';
    urlInput.value = linkToEdit?.url || '';
    modalContent.appendChild(urlInput);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'link-modal__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'link-modal__btn link-modal__btn--cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => modal.remove();

    const saveBtn = document.createElement('button');
    saveBtn.className = 'link-modal__btn link-modal__btn--save';
    saveBtn.textContent = 'Salvar';
    saveBtn.onclick = async () => {
      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      if (!title || !url) {
        emit('toast', { message: 'Preencha título e URL', type: 'error' });
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
        modal.remove();
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

    setTimeout(() => titleInput.focus(), 50);
  };

  await renderLinks();
  return container;
}
