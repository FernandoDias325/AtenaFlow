import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  const STORAGE_KEY = 'dedicatedWindowId';

  chrome.action.onClicked.addListener(async () => {
    // Busca o ID na sessão (não se perde se o Service Worker dormir)
    const data = await chrome.storage.session.get(STORAGE_KEY);
    const dedicatedWindowId = data[STORAGE_KEY];

    // Tenta focar a janela se achamos que ela existe
    if (dedicatedWindowId) {
      try {
        const win = await chrome.windows.get(dedicatedWindowId);
        if (win) {
          await chrome.windows.update(dedicatedWindowId, { focused: true });
          return; // A janela já estava aberta e foi focada
        }
      } catch (e) {
        // A janela foi fechada, mas o ID ainda estava na sessão. Limpamos a seguir.
        await chrome.storage.session.remove(STORAGE_KEY);
      }
    }

    // Se chegou aqui, não existe janela aberta. Cria uma nova Janela Dedicada.
    const newWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('window.html'),
      type: 'popup',
      width: 380,
      height: 600,
      focused: true
    });

    if (newWindow && newWindow.id) {
      await chrome.storage.session.set({ [STORAGE_KEY]: newWindow.id });
    }
  });

  // Limpa a referência da sessão se o usuário fechar a janela
  chrome.windows.onRemoved.addListener(async (windowId) => {
    const data = await chrome.storage.session.get(STORAGE_KEY);
    if (data[STORAGE_KEY] === windowId) {
      await chrome.storage.session.remove(STORAGE_KEY);
    }
  });

  // Listener para mensagens do Content Script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ACTIVE_SCRIPTS') {
      // Usamos import dinâmico para não quebrar a inicialização síncrona
      import('../src/core/db/scripts.repository').then((repo) => {
        repo.getAllActiveScripts().then((scripts) => {
          sendResponse({ scripts });
        });
      });
      return true; // Indica que a resposta será assíncrona
    }

    if (message.type === 'INCREMENT_USAGE_COUNT' && message.scriptId) {
      import('../src/core/db/scripts.repository')
        .then((repo) => repo.incrementUsageCount(message.scriptId))
        .then((usageCount) => {
          sendResponse({ success: usageCount !== undefined, usageCount });
          if (usageCount !== undefined) {
            // Avisa a janela aberta para atualizar o contador sem exigir uma ação manual.
            void chrome.runtime
              .sendMessage({
                type: 'USAGE_COUNT_UPDATED',
                scriptId: message.scriptId,
                usageCount
              })
              .catch(() => {
                // A janela dedicada pode estar fechada; o contador já foi persistido no banco.
              });
          }
        })
        .catch((error) => {
          console.error('[AtenaFlow] Erro ao contabilizar uso:', error);
          sendResponse({ success: false });
        });
      return true;
    }

    return false;
  });
});
