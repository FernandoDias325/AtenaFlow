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
});
