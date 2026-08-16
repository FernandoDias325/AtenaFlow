import { emit } from '../../store/app-store';
import { sanitizeNotepadHtml } from '../../core/security/sanitize-html';
import { showInputModal } from '../components/InputModal';
import { showConfirmModal } from '../components/ConfirmModal';

interface NotepadTab {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
}

interface NotepadTabsState {
  version: 1;
  activeTabId: string;
  tabs: NotepadTab[];
}

const NOTEPAD_KEY = 'atenaflow-notepad-tabs';
const LEGACY_NOTEPAD_KEY = 'atenaflow-notepad';

function createTab(title: string, html = ''): NotepadTab {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    html,
    createdAt: now,
    updatedAt: now
  };
}

function normalizeTabTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!title) {
    return 'Sem título';
  }
  return title.charAt(0).toLocaleUpperCase('pt-BR') + title.slice(1);
}

const STYLES = `
  .notepad-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-app, var(--color-bg));
  }

  .notepad-view__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-bg) 84%, transparent);
    backdrop-filter: blur(14px);
  }

  .notepad-view__header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .notepad-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .notepad-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .notepad-view__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .notepad-view__status {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    transition: opacity 0.3s;
    opacity: 0;
  }

  .notepad-view__status.visible {
    opacity: 1;
  }

  .notepad-view__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: color-mix(in srgb, var(--color-bg-secondary) 78%, transparent);
  }

  .notepad-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px var(--space-4);
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
    scrollbar-width: none;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-bg) 72%, transparent);
  }

  .notepad-tabs-wrap { position: relative; flex-shrink: 0; }

  .notepad-tabs__scroll-btn {
    position: absolute;
    top: 50%;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    transform: translateY(-50%);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    color: var(--color-text-secondary);
    background: var(--color-bg);
    box-shadow: var(--shadow-sm);
  }

  .notepad-tabs__scroll-btn:first-of-type { left: 4px; }
  .notepad-tabs__scroll-btn:last-of-type { right: 4px; }
  .notepad-tabs__scroll-btn--hidden { opacity: 0; visibility: hidden; pointer-events: none; }
  .notepad-tabs__scroll-btn:hover { color: var(--color-primary); background: var(--color-bg-hover); }

  .notepad-tabs::-webkit-scrollbar { display: none; }

  .notepad-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 150px;
    padding: 5px 8px 5px 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    white-space: nowrap;
    cursor: pointer;
  }

  .notepad-tab--active {
    color: var(--color-text);
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    font-weight: var(--font-weight-semibold);
  }

  .notepad-tab--dragging { opacity: .45; }

  .notepad-tab__title { overflow: hidden; text-overflow: ellipsis; }

  .notepad-tab__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    color: var(--color-text-tertiary);
  }

  .notepad-tab__close:hover { color: var(--color-error); background: var(--color-error-soft); }

  .notepad-tabs__add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 27px;
    height: 27px;
    flex-shrink: 0;
    border-radius: 50%;
    color: var(--color-primary-text);
    background: var(--bg-primary);
    box-shadow: 0 4px 10px color-mix(in srgb, var(--color-primary) 22%, transparent);
  }

  .notepad-tabs__empty { padding: 4px 8px; color: var(--color-text-tertiary); font-size: var(--font-size-xs); white-space: nowrap; }

  .notepad-search {
    position: relative;
    display: flex;
    align-items: center;
    padding: 7px var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-bg) 68%, transparent);
  }

  .notepad-search__icon {
    position: absolute;
    left: 25px;
    display: flex;
    color: var(--color-primary);
    pointer-events: none;
  }

  .notepad-search__input {
    width: 100%;
    height: 31px;
    padding: 5px 34px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    outline: none;
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-bg-secondary) 86%, transparent);
    font: inherit;
    font-size: var(--font-size-xs);
  }

  .notepad-search__input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }

  .notepad-search__count {
    position: absolute;
    right: 25px;
    color: var(--color-text-tertiary);
    font-size: 10px;
    pointer-events: none;
  }

  .notepad-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 7px var(--space-3);
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: nowrap;
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .notepad-toolbar::-webkit-scrollbar { display: none; }

  .notepad-toolbar__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .notepad-toolbar__btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .notepad-toolbar__btn.active {
    background: var(--bg-primary);
    color: var(--color-white);
    border-color: var(--color-primary);
  }

  .notepad-toolbar__btn:hover.active {
    background: var(--bg-primary-hover);
  }

  .notepad-toolbar__divider {
    width: 1px;
    height: 16px;
    background-color: var(--color-border);
    margin: 0 3px;
    flex-shrink: 0;
  }

  .notepad-view__editor {
    flex: 1;
    width: auto;
    margin: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    font-family: inherit;
    font-size: var(--font-size-md);
    line-height: 1.6;
    color: var(--color-text);
    background-color: var(--color-bg);
    overflow-y: auto;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .notepad-view__editor:focus {
    outline: none;
  }

  /* Formatação dentro do editor */
  .notepad-view__editor ul, .notepad-view__editor ol {
    margin: 0 0 1rem 1.5rem;
  }
  
  .notepad-view__editor table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
  }

  .notepad-view__editor table, .notepad-view__editor th, .notepad-view__editor td {
    border: 1px solid var(--color-border);
  }

  .notepad-view__editor th, .notepad-view__editor td {
    padding: 8px;
    text-align: left;
    min-width: 50px;
  }

  .notepad-code-block {
    position: relative;
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-4) var(--space-3) var(--space-3);
    font-family: monospace;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    overflow-x: auto;
    white-space: pre-wrap;
    margin-bottom: 1rem;
  }

  .copy-code-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
    font-size: 10px;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;
  }
  
  .copy-code-btn:hover {
    opacity: 1;
    background: var(--color-primary);
    color: var(--color-white);
    border-color: var(--color-primary);
  }

  .notepad-toolbar.collapsed .notepad-toolbar__btn:not(.toggle-toolbar-btn) {
    display: none;
  }
  
  .notepad-toolbar.collapsed .notepad-toolbar__divider {
    display: none;
  }
  
  .notepad-toolbar__btn.toggle-toolbar-btn {
    margin-left: auto; /* Joga pro final */
  }
`;

export async function createNotepadView(): Promise<HTMLElement> {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const stored = await chrome.storage.local.get([NOTEPAD_KEY, LEGACY_NOTEPAD_KEY]);
  const savedState = stored[NOTEPAD_KEY] as Partial<NotepadTabsState> | undefined;
  let tabsState: NotepadTabsState;
  if (savedState?.version === 1 && Array.isArray(savedState.tabs) && savedState.tabs.length > 0) {
    const tabs = savedState.tabs
      .filter((tab): tab is NotepadTab => Boolean(tab && typeof tab.id === 'string'))
      .map((tab) => ({
        ...tab,
        title: normalizeTabTitle(String(tab.title ?? 'Notas')),
        html: sanitizeNotepadHtml(String(tab.html ?? ''))
      }));
    tabsState = {
      version: 1,
      tabs: tabs.length > 0 ? tabs : [createTab('Notas')],
      activeTabId: String(savedState.activeTabId ?? tabs[0]?.id ?? '')
    };
    if (!tabsState.tabs.some((tab) => tab.id === tabsState.activeTabId)) {
      tabsState.activeTabId = tabsState.tabs[0]!.id;
    }
  } else {
    const legacyHtml = sanitizeNotepadHtml(String(stored[LEGACY_NOTEPAD_KEY] ?? ''));
    const firstTab = createTab('Notas', legacyHtml);
    tabsState = { version: 1, activeTabId: firstTab.id, tabs: [firstTab] };
    await chrome.storage.local.set({ [NOTEPAD_KEY]: tabsState });
  }

  const container = document.createElement('div');
  container.className = 'notepad-view';

  // ─── Header ─────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'notepad-view__header';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'notepad-view__header-left';

  const backBtn = document.createElement('button');
  backBtn.className = 'notepad-view__back-btn';
  backBtn.setAttribute('aria-label', 'Voltar para scripts');
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  leftGroup.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'notepad-view__title';
  title.textContent = 'Bloco de Notas';
  leftGroup.appendChild(title);

  header.appendChild(leftGroup);

  const status = document.createElement('span');
  status.className = 'notepad-view__status';
  status.textContent = 'Salvo';
  header.appendChild(status);

  container.appendChild(header);

  // ─── Toolbar & Editor Container ─────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'notepad-view__content';

  const tabsWrap = document.createElement('div');
  tabsWrap.className = 'notepad-tabs-wrap';

  const previousTabsBtn = document.createElement('button');
  previousTabsBtn.className = 'notepad-tabs__scroll-btn notepad-tabs__scroll-btn--hidden';
  previousTabsBtn.type = 'button';
  previousTabsBtn.setAttribute('aria-label', 'Abas anteriores');
  previousTabsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>`;

  const nextTabsBtn = document.createElement('button');
  nextTabsBtn.className = 'notepad-tabs__scroll-btn notepad-tabs__scroll-btn--hidden';
  nextTabsBtn.type = 'button';
  nextTabsBtn.setAttribute('aria-label', 'Próximas abas');
  nextTabsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>`;

  const tabsBar = document.createElement('div');
  tabsBar.className = 'notepad-tabs';
  tabsBar.setAttribute('role', 'tablist');
  tabsWrap.append(previousTabsBtn, tabsBar, nextTabsBtn);
  content.appendChild(tabsWrap);

  const searchRow = document.createElement('div');
  searchRow.className = 'notepad-search';
  const searchIcon = document.createElement('span');
  searchIcon.className = 'notepad-search__icon';
  searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`;
  const searchInput = document.createElement('input');
  searchInput.className = 'notepad-search__input';
  searchInput.type = 'search';
  searchInput.placeholder = 'Buscar nas anotações...';
  searchInput.setAttribute('aria-label', 'Buscar nas anotações');
  const searchCount = document.createElement('span');
  searchCount.className = 'notepad-search__count';
  searchRow.append(searchIcon, searchInput, searchCount);
  content.appendChild(searchRow);

  // ─── Toolbar ────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'notepad-toolbar';

  // Guardar botões para atualizar estado ativo
  const formatButtons: Record<string, HTMLButtonElement> = {};

  const createBtn = (
    icon: string,
    command: string,
    arg: string | undefined = undefined,
    title: string = ''
  ) => {
    const btn = document.createElement('button');
    btn.className = 'notepad-toolbar__btn';
    btn.innerHTML = icon;
    btn.title = title;
    if (title) {
      btn.setAttribute('aria-label', title);
    }

    if (command && !command.startsWith('custom_')) {
      formatButtons[command] = btn;
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault(); // Evita perder o foco do editor

      if (command === 'insertTable') {
        const tableHTML =
          '<table style="width:100%;border-collapse:collapse;" border="1"><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><br>';
        document.execCommand('insertHTML', false, tableHTML);
      } else if (command === 'hiliteColor') {
        // Lógica inteligente de marca-texto (toggle)
        const isHighlighted =
          document.queryCommandState('hiliteColor') ||
          document.queryCommandValue('hiliteColor') === 'rgb(254, 240, 138)' ||
          document.queryCommandValue('backColor') === 'rgb(254, 240, 138)';
        if (isHighlighted) {
          // Remove a cor de fundo (transparente ou branco dependendo do navegador, removeFormat é mais seguro)
          document.execCommand('hiliteColor', false, 'transparent');
          // Fallback para navegadores que não suportam transparente bem
          document.execCommand('backColor', false, 'transparent');
        } else {
          document.execCommand('hiliteColor', false, '#fef08a');
        }
      } else if (command === 'custom_codeBlock') {
        const codeHTML =
          '<div class="notepad-code-block"><button class="copy-code-btn" contenteditable="false">Copiar</button><code><br></code></div><br>';
        document.execCommand('insertHTML', false, codeHTML);
      } else if (command === 'custom_addRow') {
        // Encontrar a linha atual e adicionar uma nova
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node: Node | null = sel.getRangeAt(0).startContainer;
          while (node && node.nodeName !== 'TR' && node.nodeName !== 'DIV') {
            node = node.parentNode;
          }
          if (node && node.nodeName === 'TR') {
            const tr = node as HTMLTableRowElement;
            const cols = tr.cells.length;
            const newTr = document.createElement('tr');
            for (let i = 0; i < cols; i++) {
              newTr.innerHTML += '<td><br></td>';
            }
            tr.parentNode?.insertBefore(newTr, tr.nextSibling);
          }
        }
      } else if (command === 'custom_addCol') {
        // Encontrar a célula atual e adicionar uma nova na mesma posição em todas as linhas
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node: Node | null = sel.getRangeAt(0).startContainer;
          while (
            node &&
            node.nodeName !== 'TD' &&
            node.nodeName !== 'TH' &&
            node.nodeName !== 'DIV'
          ) {
            node = node.parentNode;
          }
          if (node && (node.nodeName === 'TD' || node.nodeName === 'TH')) {
            const td = node as HTMLTableCellElement;
            const tr = td.parentNode as HTMLTableRowElement;
            const index = Array.from(tr.cells).indexOf(td);
            const table = tr.closest('table');
            if (table) {
              Array.from(table.rows).forEach((row) => {
                const newCell = document.createElement(node!.nodeName.toLowerCase());
                newCell.innerHTML = '<br>';
                const refCell = row.cells[index];
                row.insertBefore(newCell, refCell ? refCell.nextSibling : null);
              });
            }
          }
        }
      } else if (command === 'custom_removeRow') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node: Node | null = sel.getRangeAt(0).startContainer;
          while (node && node.nodeName !== 'TR' && node.nodeName !== 'DIV') {
            node = node.parentNode;
          }
          if (node && node.nodeName === 'TR') {
            const tr = node as HTMLTableRowElement;
            const table = tr.closest('table');
            tr.remove();
            if (table && table.rows.length === 0) {
              table.remove();
            }
          }
        }
      } else if (command === 'custom_removeCol') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node: Node | null = sel.getRangeAt(0).startContainer;
          while (
            node &&
            node.nodeName !== 'TD' &&
            node.nodeName !== 'TH' &&
            node.nodeName !== 'DIV'
          ) {
            node = node.parentNode;
          }
          if (node && (node.nodeName === 'TD' || node.nodeName === 'TH')) {
            const td = node as HTMLTableCellElement;
            const tr = td.parentNode as HTMLTableRowElement;
            const index = Array.from(tr.cells).indexOf(td);
            const table = tr.closest('table');
            if (table) {
              Array.from(table.rows).forEach((row) => {
                if (row.cells[index]) {
                  row.cells[index].remove();
                }
              });
              if (table.rows.length > 0 && table.rows[0]?.cells?.length === 0) {
                table.remove();
              }
            }
          }
        }
      } else if (command === 'custom_toggleToolbar') {
        toolbar.classList.toggle('collapsed');
        const isCollapsed = toolbar.classList.contains('collapsed');
        btn.innerHTML = isCollapsed
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;
      } else {
        document.execCommand(command, false, arg);
      }

      updateToolbarState();
    });
    return btn;
  };

  const createDivider = () => {
    const div = document.createElement('div');
    div.className = 'notepad-toolbar__divider';
    return div;
  };

  // Ícones (SVG)
  const iconBold = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`;
  const iconItalic = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`;
  const iconUnderline = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`;
  const iconStrike = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`;

  const iconAlignLeft = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`;
  const iconAlignCenter = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="17" y1="18" x2="7" y2="18"/></svg>`;
  const iconAlignRight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`;

  const iconUl = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
  const iconOl = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`;

  const iconHighlight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`;
  const iconChevronUp = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`;

  toolbar.appendChild(createBtn(iconBold, 'bold', undefined, 'Negrito'));
  toolbar.appendChild(createBtn(iconItalic, 'italic', undefined, 'Itálico'));
  toolbar.appendChild(createBtn(iconUnderline, 'underline', undefined, 'Sublinhado'));
  toolbar.appendChild(createBtn(iconStrike, 'strikeThrough', undefined, 'Riscado'));
  toolbar.appendChild(createBtn(iconHighlight, 'hiliteColor', undefined, 'Marca-texto Amarelo'));

  toolbar.appendChild(createDivider());
  toolbar.appendChild(createBtn(iconAlignLeft, 'justifyLeft', undefined, 'Alinhar à Esquerda'));
  toolbar.appendChild(createBtn(iconAlignCenter, 'justifyCenter', undefined, 'Centralizar'));
  toolbar.appendChild(createBtn(iconAlignRight, 'justifyRight', undefined, 'Alinhar à Direita'));

  toolbar.appendChild(createDivider());
  toolbar.appendChild(createBtn(iconUl, 'insertUnorderedList', undefined, 'Lista com Marcadores'));
  toolbar.appendChild(createBtn(iconOl, 'insertOrderedList', undefined, 'Lista Numerada'));

  const toggleBtn = createBtn(
    iconChevronUp,
    'custom_toggleToolbar',
    undefined,
    'Minimizar/Expandir'
  );
  toggleBtn.classList.add('toggle-toolbar-btn');
  toolbar.appendChild(toggleBtn);

  content.appendChild(toolbar);

  // ─── Editor ─────────────────────────────────────────────────────────
  const editor = document.createElement('div');
  editor.className = 'notepad-view__editor';
  editor.contentEditable = 'true';
  editor.spellcheck = false;
  // Fallback se estiver vazio
  editor.setAttribute(
    'placeholder',
    'Digite suas anotações rápidas aqui... elas são salvas automaticamente.'
  );

  // Estilo placeholder para div contenteditable
  const placeholderStyle = document.createElement('style');
  placeholderStyle.textContent = `
    .notepad-view__editor:empty:before {
      content: attr(placeholder);
      color: var(--color-text-tertiary);
      pointer-events: none;
      display: block; /* For Firefox */
    }
  `;
  document.head.appendChild(placeholderStyle);

  const getActiveTab = () =>
    tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId) ?? tabsState.tabs[0]!;
  editor.innerHTML = getActiveTab().html;

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let statusTimeout: ReturnType<typeof setTimeout> | null = null;

  const persistTabs = async () => {
    await chrome.storage.local.set({ [NOTEPAD_KEY]: tabsState });
  };

  const saveActiveTab = async () => {
    const activeTab = getActiveTab();
    activeTab.html = sanitizeNotepadHtml(editor.innerHTML);
    activeTab.updatedAt = Date.now();
    await persistTabs();
  };

  let tabSearchQuery = '';
  let draggedTabId: string | null = null;

  const updateTabArrows = () => {
    const maxScroll = tabsBar.scrollWidth - tabsBar.clientWidth;
    previousTabsBtn.classList.toggle('notepad-tabs__scroll-btn--hidden', tabsBar.scrollLeft <= 1);
    nextTabsBtn.classList.toggle(
      'notepad-tabs__scroll-btn--hidden',
      maxScroll <= 1 || tabsBar.scrollLeft >= maxScroll - 1
    );
  };

  const renderTabs = () => {
    tabsBar.innerHTML = '';
    const normalizedSearch = tabSearchQuery.trim().toLocaleLowerCase('pt-BR');
    const visibleTabs = normalizedSearch
      ? tabsState.tabs.filter((tab) => {
          const textContainer = document.createElement('div');
          textContainer.innerHTML = tab.html;
          return `${tab.title} ${textContainer.textContent ?? ''}`
            .toLocaleLowerCase('pt-BR')
            .includes(normalizedSearch);
        })
      : tabsState.tabs;
    searchCount.textContent = normalizedSearch
      ? `${visibleTabs.length}/${tabsState.tabs.length}`
      : '';

    if (visibleTabs.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'notepad-tabs__empty';
      empty.textContent = 'Nenhuma aba encontrada';
      tabsBar.appendChild(empty);
    }

    visibleTabs.forEach((tab) => {
      const tabBtn = document.createElement('button');
      tabBtn.className = `notepad-tab${tab.id === tabsState.activeTabId ? ' notepad-tab--active' : ''}`;
      tabBtn.type = 'button';
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('aria-selected', String(tab.id === tabsState.activeTabId));
      tabBtn.title = `${tab.title} — duplo clique para renomear`;
      tabBtn.draggable = true;

      const tabTitle = document.createElement('span');
      tabTitle.className = 'notepad-tab__title';
      tabTitle.textContent = tab.title;
      tabBtn.appendChild(tabTitle);

      if (tabsState.tabs.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.className = 'notepad-tab__close';
        closeBtn.setAttribute('role', 'button');
        closeBtn.setAttribute('aria-label', `Excluir aba ${tab.title}`);
        closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
        closeBtn.addEventListener('click', async (event) => {
          event.stopPropagation();
          const confirmed = await showConfirmModal({
            title: 'Excluir aba',
            message: `Excluir a aba "${tab.title}" e todas as anotações dela?`,
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar'
          });
          if (!confirmed) {
            return;
          }
          tabsState.tabs = tabsState.tabs.filter((item) => item.id !== tab.id);
          if (tabsState.activeTabId === tab.id) {
            tabsState.activeTabId = tabsState.tabs[0]!.id;
            editor.innerHTML = getActiveTab().html;
          }
          await persistTabs();
          renderTabs();
        });
        tabBtn.appendChild(closeBtn);
      }

      tabBtn.addEventListener('click', async () => {
        if (tab.id === tabsState.activeTabId) {
          return;
        }
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        await saveActiveTab();
        tabsState.activeTabId = tab.id;
        editor.innerHTML = tab.html;
        await persistTabs();
        renderTabs();
        editor.focus();
      });

      tabBtn.addEventListener('dblclick', async () => {
        const newTitle = await showInputModal({
          title: 'Renomear aba',
          message: 'Escolha um nome curto para esta aba.',
          initialValue: tab.title,
          confirmLabel: 'Renomear'
        });
        if (!newTitle) {
          return;
        }
        tab.title = normalizeTabTitle(newTitle);
        tab.updatedAt = Date.now();
        await persistTabs();
        renderTabs();
      });

      tabBtn.addEventListener('dragstart', (event) => {
        draggedTabId = tab.id;
        tabBtn.classList.add('notepad-tab--dragging');
        event.dataTransfer?.setData('text/plain', tab.id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
        }
      });
      tabBtn.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      });
      tabBtn.addEventListener('drop', async (event) => {
        event.preventDefault();
        if (!draggedTabId || draggedTabId === tab.id) {
          return;
        }
        const fromIndex = tabsState.tabs.findIndex((item) => item.id === draggedTabId);
        const targetIndex = tabsState.tabs.findIndex((item) => item.id === tab.id);
        if (fromIndex < 0 || targetIndex < 0) {
          return;
        }
        const [movedTab] = tabsState.tabs.splice(fromIndex, 1);
        if (!movedTab) {
          return;
        }
        const adjustedTarget = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        tabsState.tabs.splice(adjustedTarget, 0, movedTab);
        draggedTabId = null;
        await persistTabs();
        renderTabs();
      });
      tabBtn.addEventListener('dragend', () => {
        draggedTabId = null;
        tabBtn.classList.remove('notepad-tab--dragging');
      });

      tabsBar.appendChild(tabBtn);
    });

    const addTabBtn = document.createElement('button');
    addTabBtn.className = 'notepad-tabs__add';
    addTabBtn.type = 'button';
    addTabBtn.title = 'Criar nova aba';
    addTabBtn.setAttribute('aria-label', 'Criar nova aba');
    addTabBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;
    addTabBtn.addEventListener('click', async () => {
      const title = await showInputModal({
        title: 'Nova aba',
        message: 'Dê um nome para organizar suas anotações.',
        placeholder: 'Ex.: Lembretes',
        confirmLabel: 'Criar'
      });
      if (!title) {
        return;
      }
      await saveActiveTab();
      const newTab = createTab(normalizeTabTitle(title));
      tabsState.tabs.push(newTab);
      tabsState.activeTabId = newTab.id;
      editor.innerHTML = '';
      await persistTabs();
      renderTabs();
      editor.focus();
    });
    tabsBar.appendChild(addTabBtn);
    requestAnimationFrame(updateTabArrows);
  };

  previousTabsBtn.addEventListener('click', () => {
    tabsBar.scrollBy({ left: -Math.max(140, tabsBar.clientWidth * 0.65), behavior: 'smooth' });
  });
  nextTabsBtn.addEventListener('click', () => {
    tabsBar.scrollBy({ left: Math.max(140, tabsBar.clientWidth * 0.65), behavior: 'smooth' });
  });
  tabsBar.addEventListener('scroll', updateTabArrows, { passive: true });
  new ResizeObserver(updateTabArrows).observe(tabsBar);
  searchInput.addEventListener('input', () => {
    getActiveTab().html = sanitizeNotepadHtml(editor.innerHTML);
    tabSearchQuery = searchInput.value;
    renderTabs();
  });

  renderTabs();

  // Update toolbar active states
  const updateToolbarState = () => {
    const activeCommands = [
      'bold',
      'italic',
      'underline',
      'strikeThrough',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      'insertUnorderedList',
      'insertOrderedList'
    ];
    for (const cmd of activeCommands) {
      const btn = formatButtons[cmd];
      if (btn) {
        if (document.queryCommandState(cmd)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    // Highlight special check
    const highlightBtn = formatButtons['hiliteColor'];
    if (highlightBtn) {
      const isHighlighted =
        document.queryCommandState('hiliteColor') ||
        document.queryCommandValue('hiliteColor') === 'rgb(254, 240, 138)' ||
        document.queryCommandValue('backColor') === 'rgb(254, 240, 138)';
      if (isHighlighted) {
        highlightBtn.classList.add('active');
      } else {
        highlightBtn.classList.remove('active');
      }
    }
  };

  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);
  editor.addEventListener('paste', (event) => {
    event.preventDefault();
    const clipboard = event.clipboardData;
    const html = clipboard?.getData('text/html');
    const text = clipboard?.getData('text/plain') ?? '';
    const safeContent = html
      ? sanitizeNotepadHtml(html)
      : text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r?\n/g, '<br>');
    document.execCommand('insertHTML', false, safeContent);
  });
  editor.addEventListener('click', (e) => {
    updateToolbarState();

    // Delegação de evento para o botão "Copiar" de blocos de código
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('copy-code-btn')) {
      const codeBlock = target.nextElementSibling;
      if (codeBlock && codeBlock.tagName === 'CODE') {
        const textToCopy = codeBlock.textContent || '';
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            target.textContent = 'Copiado!';
            target.style.background = 'var(--color-primary)';
            target.style.color = 'white';

            setTimeout(() => {
              target.textContent = 'Copiar';
              target.style.background = '';
              target.style.color = '';
              // Força o salvamento para limpar o DOM (dispara o evento de input no editor)
              editor.dispatchEvent(new Event('input', { bubbles: true }));
            }, 2000);
          })
          .catch((err) => {
            console.error('Falha ao copiar:', err);
          });
      }
    }
  });

  // Auto-save com debounce
  editor.addEventListener('input', () => {
    updateToolbarState();

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    status.textContent = 'Salvando...';
    status.classList.add('visible');

    saveTimeout = setTimeout(async () => {
      try {
        await saveActiveTab();
        status.textContent = 'Salvo';

        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        statusTimeout = setTimeout(() => {
          status.classList.remove('visible');
        }, 2000);
      } catch (err) {
        console.error('Erro ao salvar bloco de notas:', err);
      }
    }, 500); // 500ms debounce
  });

  content.appendChild(editor);
  container.appendChild(content);

  // Foca no editor automaticamente ao abrir
  setTimeout(() => {
    editor.focus();
    updateToolbarState();
  }, 50);

  return container;
}
