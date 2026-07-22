import { emit } from '../../store/app-store';

const STYLES = `
  .notepad-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .notepad-view__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
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
    background-color: var(--color-bg-secondary);
  }

  .notepad-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-2) var(--space-5);
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .notepad-toolbar__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
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
    background-color: var(--color-primary);
    color: var(--color-white);
    border-color: var(--color-primary);
  }

  .notepad-toolbar__btn:hover.active {
    background-color: var(--color-primary-hover);
  }

  .notepad-toolbar__divider {
    width: 1px;
    height: 16px;
    background-color: var(--color-border);
    margin: 0 var(--space-2);
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

  const container = document.createElement('div');
  container.className = 'notepad-view';

  // ─── Header ─────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'notepad-view__header';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'notepad-view__header-left';

  const backBtn = document.createElement('button');
  backBtn.className = 'notepad-view__back-btn';
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
  const iconTable = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
  const iconRowDown = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V3"/><path d="m8 17 4 4 4-4"/><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
  const iconRowUp = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m8 7 4-4 4 4"/><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
  const iconColRight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="m17 8 4 4-4 4"/><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
  const iconColLeft = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3"/><path d="m7 8-4 4 4 4"/><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`;
  const iconCode = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
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
  toolbar.appendChild(createBtn(iconCode, 'custom_codeBlock', undefined, 'Bloco de Código'));

  toolbar.appendChild(createDivider());
  toolbar.appendChild(createBtn(iconTable, 'insertTable', undefined, 'Inserir Tabela 2x2'));
  toolbar.appendChild(createBtn(iconRowDown, 'custom_addRow', undefined, 'Adicionar Linha'));
  toolbar.appendChild(createBtn(iconRowUp, 'custom_removeRow', undefined, 'Remover Linha'));
  toolbar.appendChild(createBtn(iconColRight, 'custom_addCol', undefined, 'Adicionar Coluna'));
  toolbar.appendChild(createBtn(iconColLeft, 'custom_removeCol', undefined, 'Remover Coluna'));

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

  // Carregar conteúdo inicial
  try {
    const data = await chrome.storage.local.get('atenaflow-notepad');
    if (data['atenaflow-notepad']) {
      editor.innerHTML = data['atenaflow-notepad'];
    }
  } catch (err) {
    console.error('Erro ao carregar bloco de notas:', err);
  }

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
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let statusTimeout: ReturnType<typeof setTimeout> | null = null;

  editor.addEventListener('input', () => {
    updateToolbarState();

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    status.textContent = 'Salvando...';
    status.classList.add('visible');

    saveTimeout = setTimeout(async () => {
      try {
        await chrome.storage.local.set({ 'atenaflow-notepad': editor.innerHTML });
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
