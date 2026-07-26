import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[AtenaFlow] Content Script carregado.');

    let currentFocusedElement: HTMLElement | null = null;
    let iconElement: HTMLElement | null = null;
    let popupElement: HTMLElement | null = null;
    let positionInterval: number | null = null;

    // Remove ícone e popup se existirem
    function cleanupUI() {
      if (positionInterval) {
        clearInterval(positionInterval);
        positionInterval = null;
      }
      if (iconElement) {
        iconElement.remove();
        iconElement = null;
      }
      if (popupElement) {
        popupElement.remove();
        popupElement = null;
      }
    }

    // Injeta o texto no elemento focado e dispara os eventos necessários
    async function injectText(text: string, scriptId: string) {
      if (!currentFocusedElement) {
        return;
      }

      const el = currentFocusedElement;

      // Se for input ou textarea
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        // Tenta usar execCommand primeiro para manter o histórico de "Desfazer" (Ctrl+Z)
        el.focus();
        const success = document.execCommand('insertText', false, text);
        if (!success) {
          // Fallback para atribuição direta
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const currentValue = el.value;
          el.value = currentValue.substring(0, start) + text + currentValue.substring(end);
          el.selectionStart = el.selectionEnd = start + text.length;
        }
      } else if (el.isContentEditable) {
        el.focus();

        // Na Hi Platform, o insertText com \n cria <div>s separados que quebram o layout (flex row).
        // Usar insertHTML com <br> mantém o texto no mesmo container e resolve o problema.
        const escapeHTML = (str: string) =>
          str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const htmlText = escapeHTML(text).replace(/\n/g, '<br>');

        let success = document.execCommand('insertHTML', false, htmlText);
        if (!success) {
          success = document.execCommand('insertText', false, text);
        }
        if (!success) {
          // Fallback
          el.textContent = (el.textContent || '') + text;
        }
      }

      // Dispara eventos nativos para que React/Vue/Angular (WhatsApp Web etc) percebam a mudança
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      // Tenta acionar o React especificamente se ele estiver guardando estado no input
      const tracker = (el as any)._valueTracker;
      if (tracker) {
        tracker.setValue((el as HTMLInputElement).value || el.textContent || '');
      }

      // Registra que o script foi usado
      chrome.runtime.sendMessage({ type: 'INCREMENT_USAGE_COUNT', scriptId });

      cleanupUI();
      currentFocusedElement.focus();
    }

    function createPopup() {
      if (popupElement) {
        popupElement.remove();
      }

      const rect = currentFocusedElement!.getBoundingClientRect();

      popupElement = document.createElement('div');
      popupElement.style.position = 'absolute';
      popupElement.style.zIndex = '2147483647'; // Max z-index

      // Evita que sites hospedeiros (ex: WhatsApp Web) roubem o foco ao digitar
      const stopAll = (e: Event) => e.stopPropagation();
      ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click'].forEach((evt) => {
        popupElement!.addEventListener(evt, stopAll);
      });

      // Verifica se há espaço para abrir para baixo (altura max do popup é 300px)
      const maxPopupHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;

      let topPos: number;
      if (spaceBelow >= maxPopupHeight || spaceBelow > rect.top) {
        // Abre para baixo
        topPos = window.scrollY + rect.bottom + 5;
      } else {
        // Abre para cima (se não houver espaço embaixo, e houver mais espaço em cima)
        topPos = window.scrollY + rect.top - maxPopupHeight - 5;

        // Se ainda assim sair da tela pelo topo, alinha no topo da tela
        if (topPos < window.scrollY) {
          topPos = window.scrollY + 5;
        }
      }

      let leftPos = window.scrollX + rect.right - 250; // Largura do popup
      if (leftPos < window.scrollX) {
        leftPos = window.scrollX + rect.left;
      } // Evita sair da tela

      popupElement.style.top = `${topPos}px`;
      popupElement.style.left = `${leftPos}px`;

      const shadow = popupElement.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `;
      shadow.appendChild(style);

      const container = document.createElement('div');
      container.style.cssText = `
        background: rgba(30, 30, 30, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        width: 250px;
        max-height: 300px;
        overflow-y: auto;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #fff;
        padding: 8px;
        box-sizing: border-box;
      `;

      const loading = document.createElement('div');
      loading.textContent = 'Carregando scripts...';
      loading.style.padding = '8px';
      loading.style.fontSize = '12px';
      loading.style.color = '#888';
      container.appendChild(loading);

      shadow.appendChild(container);
      document.body.appendChild(popupElement);

      // Busca os scripts do background
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SCRIPTS' }, (response) => {
        container.innerHTML = ''; // Limpa o loading

        const scripts = response?.scripts || [];

        if (scripts.length === 0) {
          const empty = document.createElement('div');
          empty.textContent = 'Nenhum script encontrado.';
          empty.style.padding = '8px';
          empty.style.fontSize = '12px';
          empty.style.color = '#888';
          container.appendChild(empty);
          return;
        }

        const viewList = document.createElement('div');
        viewList.style.display = 'block';

        const viewEdit = document.createElement('div');
        viewEdit.style.display = 'none';
        viewEdit.style.flexDirection = 'column';
        viewEdit.style.height = '100%';

        const title = document.createElement('div');
        title.textContent = 'AtenaFlow Scripts';
        title.style.fontSize = '11px';
        title.style.fontWeight = '600';
        title.style.color = '#888';
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '0.5px';
        title.style.marginBottom = '6px';
        title.style.padding = '0 4px';
        viewList.appendChild(title);

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.slot = 'search-input';
        searchInput.placeholder = 'Pesquisar script...';
        searchInput.style.cssText = `
          width: 100%;
          padding: 6px 8px;
          margin-bottom: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          color: #fff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        `;
        searchInput.onfocus = () =>
          (searchInput.style.border = '1px solid rgba(255, 255, 255, 0.3)');
        searchInput.onblur = () =>
          (searchInput.style.border = '1px solid rgba(255, 255, 255, 0.15)');

        // Evita que clicar no input feche o popup (se tivermos lógica global de click)
        searchInput.onclick = (e) => {
          e.stopPropagation();
        };
        searchInput.onmousedown = (e) => {
          e.stopPropagation();
          setTimeout(() => searchInput.focus(), 10);
        };

        popupElement!.appendChild(searchInput);

        const searchSlot = document.createElement('slot');
        searchSlot.name = 'search-input';
        viewList.appendChild(searchSlot);

        const listContainer = document.createElement('div');
        viewList.appendChild(listContainer);

        container.appendChild(viewList);
        container.appendChild(viewEdit);

        const showEditModal = (script: any) => {
          viewList.style.display = 'none';
          viewEdit.style.display = 'flex';
          viewEdit.innerHTML = '';

          const editTitle = document.createElement('div');
          editTitle.textContent = 'Editar e Injetar';
          editTitle.style.fontSize = '12px';
          editTitle.style.fontWeight = '600';
          editTitle.style.color = '#fff';
          editTitle.style.marginBottom = '8px';
          viewEdit.appendChild(editTitle);

          // Limpa slots antigos da textarea, se houver
          const oldTextarea = popupElement!.querySelector('textarea[slot="edit-textarea"]');
          if (oldTextarea) oldTextarea.remove();

          const textarea = document.createElement('textarea');
          textarea.slot = 'edit-textarea';
          textarea.value = script.body;
          textarea.style.cssText = `
            width: 100%;
            min-height: 120px;
            padding: 8px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: rgba(0,0,0,0.3);
            color: #fff;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 12px;
          `;
          textarea.onfocus = () =>
            (textarea.style.border = '1px solid var(--color-primary-soft, #5a9)');
          textarea.onblur = () => (textarea.style.border = '1px solid rgba(255,255,255,0.2)');

          textarea.onclick = (e) => e.stopPropagation();
          textarea.onmousedown = (e) => {
            e.stopPropagation();
            setTimeout(() => textarea.focus(), 10);
          };

          popupElement!.appendChild(textarea);

          const textareaSlot = document.createElement('slot');
          textareaSlot.name = 'edit-textarea';
          viewEdit.appendChild(textareaSlot);

          const btnRow = document.createElement('div');
          btnRow.style.display = 'flex';
          btnRow.style.justifyContent = 'flex-end';
          btnRow.style.gap = '8px';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancelar';
          cancelBtn.style.cssText = `
            padding: 6px 12px;
            border: 1px solid rgba(255,255,255,0.2);
            background: transparent;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          `;
          cancelBtn.onclick = (e) => {
            e.stopPropagation();
            viewEdit.style.display = 'none';
            viewList.style.display = 'block';
            setTimeout(() => searchInput.focus(), 50);
          };

          const okBtn = document.createElement('button');
          okBtn.textContent = 'OK';
          okBtn.style.cssText = `
            padding: 6px 16px;
            border: none;
            background: #25D366;
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
          `;
          okBtn.onclick = (e) => {
            e.stopPropagation();
            injectText(textarea.value, script.id);
          };

          btnRow.appendChild(cancelBtn);
          btnRow.appendChild(okBtn);
          viewEdit.appendChild(btnRow);

          setTimeout(() => textarea.focus(), 50);
        };

        const renderList = (filterText: string) => {
          listContainer.innerHTML = '';
          const filtered = scripts.filter((s: any) =>
            s.title.toLowerCase().includes(filterText.toLowerCase())
          );

          if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'Nenhum script encontrado.';
            empty.style.padding = '8px 4px';
            empty.style.fontSize = '12px';
            empty.style.color = '#888';
            listContainer.appendChild(empty);
            return;
          }

          filtered.forEach((script: any) => {
            const item = document.createElement('div');
            item.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 4px 8px;
              cursor: pointer;
              border-radius: 6px;
              font-size: 13px;
              margin-bottom: 2px;
              transition: background 0.15s ease;
              color: #eee;
            `;
            item.onmouseenter = () => (item.style.background = 'rgba(255, 255, 255, 0.1)');
            item.onmouseleave = () => (item.style.background = 'transparent');

            const titleSpan = document.createElement('span');
            titleSpan.textContent = script.title;
            titleSpan.style.cssText = `
              flex: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 4px 0;
            `;
            titleSpan.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              injectText(script.body, script.id);
            };

            const editBtn = document.createElement('button');
            editBtn.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
            editBtn.style.cssText = `
              background: transparent;
              border: none;
              color: rgba(255,255,255,0.5);
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              margin-left: 8px;
            `;
            editBtn.onmouseenter = () => (editBtn.style.color = '#fff');
            editBtn.onmouseleave = () => (editBtn.style.color = 'rgba(255,255,255,0.5)');
            editBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              showEditModal(script);
            };

            item.appendChild(titleSpan);
            item.appendChild(editBtn);

            listContainer.appendChild(item);
          });
        };

        searchInput.oninput = (e) => renderList((e.target as HTMLInputElement).value);
        renderList('');

        setTimeout(() => searchInput.focus(), 50);
      });
    }

    function createIcon(target: HTMLElement) {
      cleanupUI();
      currentFocusedElement = target;

      iconElement = document.createElement('div');
      // Obtém URL do ícone
      const iconUrl = chrome.runtime.getURL('icon.png');

      iconElement.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background-image: url('${iconUrl}');
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        cursor: pointer;
        z-index: 2147483646;
        opacity: 0.5;
        transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        background-color: #fff;
      `;

      let isDragging = false;

      iconElement.onmouseenter = () => {
        if (isDragging) return;
        iconElement!.style.opacity = '1';
        iconElement!.style.transform = 'scale(1.1)';
        iconElement!.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      };
      iconElement.onmouseleave = () => {
        if (isDragging) return;
        iconElement!.style.opacity = '0.5';
        iconElement!.style.transform = 'scale(1)';
        iconElement!.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      };

      let customOffsetX = 28;
      let customOffsetY = 28;
      let lastTop = 0,
        lastLeft = 0;

      // Posiciona o ícone
      const updatePosition = () => {
        if (!currentFocusedElement || !iconElement || isDragging) {
          return;
        }
        const rect = currentFocusedElement.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          iconElement.style.display = 'none';
          return;
        }
        iconElement.style.display = 'block';

        const top = window.scrollY + rect.bottom - customOffsetY;
        const left = window.scrollX + rect.right - customOffsetX;

        if (Math.abs(top - lastTop) > 1 || Math.abs(left - lastLeft) > 1) {
          iconElement.style.top = `${top}px`;
          iconElement.style.left = `${left}px`;
          lastTop = top;
          lastLeft = left;
        }
      };

      updatePosition();
      positionInterval = window.setInterval(updatePosition, 100);

      let startX = 0,
        startY = 0,
        initialLeft = 0,
        initialTop = 0;

      iconElement.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(iconElement!.style.left || '0', 10);
        initialTop = parseInt(iconElement!.style.top || '0', 10);

        iconElement!.style.opacity = '1';
        iconElement!.style.transform = 'scale(1.1)';

        const onMouseMove = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            isDragging = true;
          }
          if (isDragging && iconElement) {
            iconElement.style.left = `${initialLeft + dx}px`;
            iconElement.style.top = `${initialTop + dy}px`;
          }
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          if (iconElement) {
            iconElement.style.opacity = '0.5';
            iconElement.style.transform = 'scale(1)';
          }

          if (isDragging && iconElement && currentFocusedElement) {
            // Salva o novo offset
            const rect = currentFocusedElement.getBoundingClientRect();
            const currentLeft = parseInt(iconElement.style.left || '0', 10);
            const currentTop = parseInt(iconElement.style.top || '0', 10);

            customOffsetX = window.scrollX + rect.right - currentLeft;
            customOffsetY = window.scrollY + rect.bottom - currentTop;

            setTimeout(() => {
              isDragging = false;
            }, 50);
          } else if (!isDragging) {
            // Foi apenas um clique
            if (popupElement) {
              cleanupUI(); // Fecha se já estiver aberto
            } else {
              createPopup();
            }
          }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      document.body.appendChild(iconElement);
    }

    document.addEventListener(
      'focusin',
      (e) => {
        const target = e.target as HTMLElement;
        if (!target) {
          return;
        }

        // Ignora focos dentro do nosso próprio popup (agora que os inputs estão no Light DOM)
        if (popupElement && (popupElement === target || popupElement.contains(target))) {
          return;
        }

        const isTextInput =
          target.tagName === 'INPUT' &&
          ['text', 'search', 'email', 'url', 'tel', 'number'].includes(
            (target as HTMLInputElement).type
          );
        const isTextArea = target.tagName === 'TEXTAREA';
        const isContentEditable = target.isContentEditable;

        if (isTextInput || isTextArea || isContentEditable) {
          createIcon(target);
        }
      },
      true
    );

    document.addEventListener(
      'mousedown',
      (e) => {
        const target = e.target as HTMLElement;
        if (iconElement && (iconElement === target || iconElement.contains(target))) {
          return;
        }
        if (popupElement && (popupElement === target || popupElement.contains(target))) {
          return;
        }
        if (
          currentFocusedElement &&
          (currentFocusedElement === target || currentFocusedElement.contains(target))
        ) {
          return;
        }

        cleanupUI();
      },
      true
    );
  }
});
