import { defineContentScript } from 'wxt/sandbox';
import {
  DISABLED_SITES_KEY,
  isSiteDisabled,
  normalizeSiteList
} from '../src/core/settings/site-access';
import { extractTemplateVariables, renderTemplateVariables } from '../src/core/templates/variables';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    console.log('[AtenaFlow] Content Script carregado.');

    let currentFocusedElement: HTMLElement | null = null;
    let iconElement: HTMLElement | null = null;
    let popupElement: HTMLElement | null = null;
    let stopPositionTracking: (() => void) | null = null;
    const storedSites = await chrome.storage.local.get(DISABLED_SITES_KEY);
    let integrationEnabled = !isSiteDisabled(
      window.location.hostname,
      normalizeSiteList(storedSites[DISABLED_SITES_KEY] ?? [])
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[DISABLED_SITES_KEY]) {
        integrationEnabled = !isSiteDisabled(
          window.location.hostname,
          normalizeSiteList(changes[DISABLED_SITES_KEY].newValue ?? [])
        );
        if (!integrationEnabled) {
          cleanupUI();
        }
      }
    });

    // Remove ícone e popup se existirem
    function cleanupUI() {
      if (stopPositionTracking) {
        stopPositionTracking();
        stopPositionTracking = null;
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
      const formattedText = text.replace(/\r\n?/g, '\n');

      // Se for input ou textarea
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        // Tenta usar execCommand primeiro para manter o histórico de "Desfazer" (Ctrl+Z)
        el.focus();
        const success = document.execCommand('insertText', false, formattedText);
        if (!success) {
          // Fallback para atribuição direta
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const currentValue = el.value;
          el.value = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
          el.selectionStart = el.selectionEnd = start + formattedText.length;
        }
      } else if (el.isContentEditable) {
        el.focus();

        // Na Hi Platform, o insertText com \n cria <div>s separados que quebram o layout (flex row).
        // Usar insertHTML com <br> mantém o texto no mesmo container e resolve o problema.
        const escapeHTML = (str: string) =>
          str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const htmlText = escapeHTML(formattedText).replace(/\n/g, '<br>');

        const success = document.execCommand('insertHTML', false, htmlText);
        if (!success) {
          // Nunca usar insertText aqui: em editores com display:flex ele pode criar
          // uma <div> por linha e posicionar os parágrafos lado a lado.
          const fragment = document.createDocumentFragment();
          let lastNode: Node | null = null;
          formattedText.split('\n').forEach((line, index) => {
            if (index > 0) {
              lastNode = document.createElement('br');
              fragment.appendChild(lastNode);
            }
            if (line) {
              lastNode = document.createTextNode(line);
              fragment.appendChild(lastNode);
            }
          });

          const selection = window.getSelection();
          const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
          const range =
            selectedRange && el.contains(selectedRange.commonAncestorContainer)
              ? selectedRange
              : document.createRange();
          if (!selectedRange || !el.contains(selectedRange.commonAncestorContainer)) {
            range.selectNodeContents(el);
            range.collapse(false);
          }
          range.deleteContents();
          range.insertNode(fragment);
          if (lastNode && selection) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }

      // Dispara eventos nativos para que React/Vue/Angular (WhatsApp Web etc) percebam a mudança
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      // Tenta acionar o React especificamente se ele estiver guardando estado no input
      const tracker = (el as HTMLElement & { _valueTracker?: { setValue: (v: string) => void } })
        ._valueTracker;
      if (tracker) {
        tracker.setValue((el as HTMLInputElement).value || el.textContent || '');
      }

      // Registra que o script foi usado e aguarda a persistência antes de fechar o popup.
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'INCREMENT_USAGE_COUNT',
          scriptId
        });
        if (!response?.success) {
          console.warn('[AtenaFlow] Não foi possível contabilizar o uso do script.');
        }
      } catch (error) {
        console.warn('[AtenaFlow] Falha ao contabilizar o uso do script:', error);
      }

      cleanupUI();
      currentFocusedElement.focus();
    }

    async function createPopup() {
      if (popupElement) {
        popupElement.remove();
      }

      const res = await chrome.storage.local.get(['atenaflow-theme']);
      const themeId = res['atenaflow-theme'] || 'light';
      const isLight = ['light', 'emerald-gradient', 'sunset-gradient', 'pink-gradient'].includes(
        themeId
      );

      const getPrimary = (tid: string) => {
        const map: Record<string, string> = {
          light: 'hsl(230, 65%, 55%)',
          dark: 'hsl(230, 70%, 65%)',
          'purple-gradient': 'linear-gradient(135deg, hsl(260, 80%, 65%), hsl(290, 80%, 60%))',
          'pink-gradient': 'linear-gradient(135deg, hsl(320, 80%, 60%), hsl(350, 80%, 60%))',
          'ocean-gradient': 'linear-gradient(135deg, hsl(190, 85%, 50%), hsl(220, 85%, 55%))',
          'emerald-gradient': 'linear-gradient(135deg, hsl(145, 80%, 42%), hsl(175, 80%, 38%))',
          'sunset-gradient': 'linear-gradient(135deg, hsl(35, 95%, 55%), hsl(10, 90%, 60%))',
          'crimson-gradient': 'linear-gradient(135deg, hsl(350, 85%, 55%), hsl(15, 85%, 50%))'
        };
        return map[tid] || map['light'];
      };

      const primaryColor = getPrimary(themeId);
      const containerBg = isLight ? 'rgba(250, 250, 250, 0.85)' : 'rgba(30, 30, 30, 0.85)';
      const textColor = isLight ? '#1a1a1a' : '#fff';
      const textSecondary = isLight ? '#666' : '#888';
      const borderColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      const inputBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)';
      const hoverBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)';
      const scrollThumb = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)';
      const scrollThumbHover = isLight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';

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
        ::-webkit-scrollbar-thumb { background: ${scrollThumb}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${scrollThumbHover}; }
      `;
      shadow.appendChild(style);

      const container = document.createElement('div');
      container.style.cssText = `
        background: ${containerBg};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid ${borderColor};
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        width: 250px;
        max-height: 300px;
        overflow-y: auto;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: ${textColor};
        padding: 8px;
        box-sizing: border-box;
      `;

      const loading = document.createElement('div');
      loading.textContent = 'Carregando scripts...';
      loading.style.padding = '8px';
      loading.style.fontSize = '12px';
      loading.style.color = textSecondary;
      container.appendChild(loading);

      shadow.appendChild(container);
      document.body.appendChild(popupElement);

      // Busca os scripts do background
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SCRIPTS' }, (response) => {
        container.innerHTML = ''; // Limpa o loading

        if (chrome.runtime.lastError || !response) {
          const errorMessage = document.createElement('div');
          errorMessage.textContent = 'Não foi possível carregar os scripts.';
          errorMessage.style.padding = '8px';
          errorMessage.style.fontSize = '12px';
          errorMessage.style.color = textSecondary;

          const retryButton = document.createElement('button');
          retryButton.textContent = 'Tentar novamente';
          retryButton.setAttribute('aria-label', 'Tentar carregar scripts novamente');
          retryButton.style.cssText = `
            margin: 0 8px 8px;
            padding: 6px 8px;
            border: 1px solid ${borderColor};
            border-radius: 6px;
            background: ${inputBg};
            color: ${textColor};
            cursor: pointer;
          `;
          retryButton.onclick = () => createPopup();
          container.append(errorMessage, retryButton);
          return;
        }

        const scripts = response?.scripts || [];

        if (scripts.length === 0) {
          const empty = document.createElement('div');
          empty.textContent = 'Nenhum script encontrado.';
          empty.style.padding = '8px';
          empty.style.fontSize = '12px';
          empty.style.color = textSecondary;
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
        title.style.color = textSecondary;
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
          border: 1px solid ${borderColor};
          border-radius: 6px;
          background: ${inputBg};
          color: ${textColor};
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        `;
        searchInput.onfocus = () =>
          (searchInput.style.border = `1px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}`);
        searchInput.onblur = () => (searchInput.style.border = `1px solid ${borderColor}`);

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

        const prepareInjection = (
          script: { id: string; title: string; body: string },
          text: string
        ) => {
          const variables = extractTemplateVariables(text);
          if (variables.length === 0) {
            void injectText(text, script.id);
            return;
          }

          viewList.style.display = 'none';
          viewEdit.style.display = 'flex';
          viewEdit.innerHTML = '';
          const formTitle = document.createElement('div');
          formTitle.textContent = 'Preencher variáveis';
          formTitle.style.cssText = `font-size: 12px; font-weight: 600; color: ${textColor}; margin-bottom: 8px;`;
          viewEdit.appendChild(formTitle);

          const inputs = new Map<string, HTMLInputElement>();
          for (const variable of variables) {
            const label = document.createElement('label');
            label.textContent = variable;
            label.style.cssText = `font-size: 11px; color: ${textSecondary}; margin: 4px 0 2px;`;
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Valor para ${variable}`;
            input.style.cssText = `width:100%;padding:6px 8px;border:1px solid ${borderColor};border-radius:6px;background:${inputBg};color:${textColor};box-sizing:border-box;`;
            inputs.set(variable, input);
            viewEdit.append(label, input);
          }

          const buttons = document.createElement('div');
          buttons.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:10px;';
          const back = document.createElement('button');
          back.textContent = 'Voltar';
          back.style.cssText = `padding:6px 12px;border:1px solid ${borderColor};background:transparent;color:${textColor};border-radius:4px;cursor:pointer;`;
          back.onclick = () => {
            viewEdit.style.display = 'none';
            viewList.style.display = 'block';
          };
          const insert = document.createElement('button');
          insert.textContent = 'Inserir';
          insert.style.cssText = `padding:6px 14px;border:0;background:${primaryColor};color:#fff;border-radius:4px;cursor:pointer;font-weight:600;`;
          insert.onclick = () => {
            const values = Object.fromEntries(
              [...inputs].map(([name, input]) => [name, input.value])
            );
            void injectText(renderTemplateVariables(text, values), script.id);
          };
          buttons.append(back, insert);
          viewEdit.appendChild(buttons);
          setTimeout(() => inputs.values().next().value?.focus(), 50);
        };

        const showEditModal = (script: { id: string; title: string; body: string }) => {
          viewList.style.display = 'none';
          viewEdit.style.display = 'flex';
          viewEdit.innerHTML = '';

          const editTitle = document.createElement('div');
          editTitle.textContent = 'Editar e Injetar';
          editTitle.style.fontSize = '12px';
          editTitle.style.fontWeight = '600';
          editTitle.style.color = textColor;
          editTitle.style.marginBottom = '8px';
          viewEdit.appendChild(editTitle);

          // Limpa slots antigos da textarea, se houver
          const oldTextarea = popupElement!.querySelector('textarea[slot="edit-textarea"]');
          if (oldTextarea) {
            oldTextarea.remove();
          }

          const textarea = document.createElement('textarea');
          textarea.slot = 'edit-textarea';
          textarea.value = script.body;
          textarea.style.cssText = `
            width: 100%;
            min-height: 120px;
            padding: 8px;
            border: 1px solid ${borderColor};
            border-radius: 6px;
            background: ${inputBg};
            color: ${textColor};
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 12px;
          `;
          textarea.onfocus = () =>
            (textarea.style.border = `1px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}`);
          textarea.onblur = () => (textarea.style.border = `1px solid ${borderColor}`);

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
            border: 1px solid ${borderColor};
            background: transparent;
            color: ${textColor};
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
            background: ${primaryColor};
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
          `;
          okBtn.onclick = (e) => {
            e.stopPropagation();
            prepareInjection(script, textarea.value);
          };

          btnRow.appendChild(cancelBtn);
          btnRow.appendChild(okBtn);
          viewEdit.appendChild(btnRow);

          setTimeout(() => textarea.focus(), 50);
        };

        const renderList = (filterText: string) => {
          listContainer.innerHTML = '';
          const filtered = scripts.filter((s: { title: string; id: string; body: string }) =>
            s.title.toLowerCase().includes(filterText.toLowerCase())
          );

          if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'Nenhum script encontrado.';
            empty.style.padding = '8px 4px';
            empty.style.fontSize = '12px';
            empty.style.color = textSecondary;
            listContainer.appendChild(empty);
            return;
          }

          filtered.forEach((script: { id: string; title: string; body: string }) => {
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
              color: ${textColor};
            `;
            item.onmouseenter = () => (item.style.background = hoverBg);
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
              prepareInjection(script, script.body);
            };

            const editBtn = document.createElement('button');
            editBtn.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
            editBtn.style.cssText = `
              background: transparent;
              border: none;
              color: ${textSecondary};
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              margin-left: 8px;
            `;
            editBtn.onmouseenter = () => (editBtn.style.color = textColor);
            editBtn.onmouseleave = () => (editBtn.style.color = textSecondary);
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
        if (isDragging) {
          return;
        }
        iconElement!.style.opacity = '1';
        iconElement!.style.transform = 'scale(1.1)';
        iconElement!.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      };
      iconElement.onmouseleave = () => {
        if (isDragging) {
          return;
        }
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

      let animationFrame: number | null = null;
      const schedulePositionUpdate = () => {
        if (animationFrame !== null) {
          return;
        }
        animationFrame = requestAnimationFrame(() => {
          animationFrame = null;
          updatePosition();
        });
      };
      const resizeObserver = new ResizeObserver(schedulePositionUpdate);
      resizeObserver.observe(target);
      window.addEventListener('scroll', schedulePositionUpdate, true);
      window.addEventListener('resize', schedulePositionUpdate);
      stopPositionTracking = () => {
        resizeObserver.disconnect();
        window.removeEventListener('scroll', schedulePositionUpdate, true);
        window.removeEventListener('resize', schedulePositionUpdate);
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
      };
      updatePosition();

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
        if (!integrationEnabled) {
          return;
        }
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
