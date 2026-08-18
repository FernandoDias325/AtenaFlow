import { defineBackground } from 'wxt/sandbox';
import {
  completeReminder,
  getPendingReminders,
  markReminderDisplayed,
  processReminderAlarm,
  reconcileReminderAlarms,
  REMINDER_ALARM_PREFIX,
  REMINDER_SNOOZE_PREFIX,
  snoozeReminder
} from '../src/core/reminders/reminder.service';
import { createSerialTaskQueue } from '../src/core/reminders/reminder.queue';

const LAST_REMINDER_PAGE_TAB_KEY = 'atenaflow-last-reminder-page-tab';

async function rememberReminderPage(tabId: number): Promise<void> {
  await chrome.storage.session.set({ [LAST_REMINDER_PAGE_TAB_KEY]: tabId });
}

async function sendReminderToTab(tabId: number, reminder: { id: string }): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_REMINDER_ALERT',
      reminder
    });
    return response?.accepted === true;
  } catch {
    return false;
  }
}

async function showReminderOnActiveTab(reminder: { id: string }): Promise<boolean> {
  // Prioriza a última página compatível que esteve visível antes de o usuário
  // voltar para a janela dedicada do AtenaFlow.
  const storedTarget = await chrome.storage.session.get(LAST_REMINDER_PAGE_TAB_KEY);
  const preferredTabId = storedTarget[LAST_REMINDER_PAGE_TAB_KEY];
  if (typeof preferredTabId === 'number' && (await sendReminderToTab(preferredTabId, reminder))) {
    await markReminderDisplayed(reminder.id);
    return true;
  }

  // Se a página foi fechada, procura outra aba ativa que confirme explicitamente o recebimento.
  const tabs = await chrome.tabs.query({ active: true });
  const candidates = tabs
    .filter((tab) => tab.id !== undefined && tab.id !== preferredTabId)
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  for (const tab of candidates) {
    if (await sendReminderToTab(tab.id!, reminder)) {
      await rememberReminderPage(tab.id!);
      await markReminderDisplayed(reminder.id);
      return true;
    }
  }
  return false;
}

async function handleReminderAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  const isSnooze = alarm.name.startsWith(REMINDER_SNOOZE_PREFIX);
  const prefix = isSnooze ? REMINDER_SNOOZE_PREFIX : REMINDER_ALARM_PREFIX;
  if (!alarm.name.startsWith(prefix)) {
    return;
  }
  const reminder = await processReminderAlarm(alarm.name.slice(prefix.length), isSnooze);
  if (reminder) {
    await showReminderOnActiveTab(reminder);
    void chrome.runtime.sendMessage({ type: 'REMINDERS_CHANGED' }).catch(() => undefined);
  }
}

// Alarmes com o mesmo horário podem chegar no mesmo ciclo do service worker.
// A fila evita gravações concorrentes e garante a ordem visual dos cartões.
const enqueueReminderAlarm = createSerialTaskQueue(handleReminderAlarm, (error) =>
  console.error('[AtenaFlow] Falha ao processar lembrete:', error)
);

export default defineBackground(() => {
  const STORAGE_KEY = 'dedicatedWindowId';

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    await enqueueReminderAlarm(alarm);
  });

  chrome.runtime.onStartup.addListener(() => void reconcileReminderAlarms());
  chrome.runtime.onInstalled.addListener(() => void reconcileReminderAlarms());
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
    if (message.type === 'REMINDER_PAGE_ACTIVE' && _sender.tab?.id !== undefined) {
      rememberReminderPage(_sender.tab.id).then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.type === 'GET_PENDING_REMINDERS') {
      getPendingReminders(message.force === true ? 0 : undefined).then((reminders) =>
        sendResponse({ reminders })
      );
      return true;
    }

    if (message.type === 'COMPLETE_REMINDER' || message.type === 'DISMISS_REMINDER') {
      completeReminder(message.reminderId).then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.type === 'SNOOZE_REMINDER') {
      snoozeReminder(message.reminderId, 5).then(() => sendResponse({ success: true }));
      return true;
    }
    if (message.type === 'GET_ACTIVE_SCRIPTS') {
      // Usamos import dinâmico para não quebrar a inicialização síncrona
      import('../src/core/db/scripts.repository').then((repo) => {
        repo.getAllActiveScripts().then((scripts) => {
          sendResponse({ scripts });
        });
      });
      return true; // Indica que a resposta será assíncrona
    }

    if (message.type === 'GET_CATEGORIES') {
      import('../src/core/db/categories.repository').then((repo) => {
        repo.getAllCategories().then((categories) => sendResponse({ categories }));
      });
      return true;
    }

    if (message.type === 'FIND_SIMILAR_SCRIPT') {
      const title = typeof message.title === 'string' ? message.title.trim().slice(0, 500) : '';
      const body = typeof message.body === 'string' ? message.body.trim().slice(0, 1_000_000) : '';
      if (!title || !body) {
        sendResponse({ duplicate: null });
        return false;
      }
      import('../src/core/backup/backup.service')
        .then((service) => service.findSimilarScript(title, body))
        .then((duplicate) => sendResponse({ duplicate }))
        .catch(() => sendResponse({ duplicate: null }));
      return true;
    }

    if (message.type === 'SAVE_SCRIPT_FROM_PAGE') {
      const title = typeof message.title === 'string' ? message.title.trim().slice(0, 500) : '';
      const body = typeof message.body === 'string' ? message.body.trim().slice(0, 1_000_000) : '';
      const categoryId = typeof message.categoryId === 'string' ? message.categoryId : null;
      if (!title || !body) {
        sendResponse({ success: false });
        return false;
      }
      import('../src/core/db/scripts.repository')
        .then(async (repo) => {
          let safeCategoryId: string | null = null;
          if (categoryId) {
            const categoriesRepo = await import('../src/core/db/categories.repository');
            safeCategoryId = (await categoriesRepo.getCategory(categoryId)) ? categoryId : null;
          }
          if (message.replaceId && typeof message.replaceId === 'string') {
            await repo.updateScript(message.replaceId, { title, body, categoryId: safeCategoryId });
          } else {
            await repo.createScript({ title, body, categoryId: safeCategoryId });
          }
          sendResponse({ success: true });
        })
        .catch(() => sendResponse({ success: false }));
      return true;
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
