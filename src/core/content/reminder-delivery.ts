import { createReminderAlertController } from './reminder-alert';
import type { Reminder } from '../reminders/reminder.types';

/** Compartilha a entrega entre páginas compatíveis e a própria janela da extensão. */
export function installReminderDelivery(): () => void {
  const visible = () => document.visibilityState === 'visible' && document.hasFocus();
  const controller = createReminderAlertController(
    (type, reminderId) => chrome.runtime.sendMessage({ type, reminderId }),
    10_000,
    {
      onDisplayed: (reminder) =>
        chrome.runtime.sendMessage({
          type: 'REMINDER_DISPLAYED',
          reminderId: reminder.id,
          occurrence: reminder.lastTriggeredAt
        }),
      resolveReminder: async (reminder) => {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_REMINDER_TO_DISPLAY',
          reminderId: reminder.id,
          occurrence: reminder.lastTriggeredAt
        });
        return response?.reminder ?? null;
      }
    }
  );
  const onMessage = (
    message: { type?: string; reminder?: Reminder },
    _sender: chrome.runtime.MessageSender,
    respond: (value: unknown) => void
  ) => {
    if (message?.type === 'SHOW_REMINDER_ALERT') {
      const reminder = message.reminder;
      const valid =
        reminder &&
        typeof reminder.id === 'string' &&
        typeof reminder.title === 'string' &&
        reminder.pendingSince !== null &&
        reminder.pendingSince !== undefined;
      respond({ accepted: Boolean(valid && visible() && controller.enqueue(reminder)) });
    }
  };
  let recovering = false;
  const recover = () => {
    if (!visible() || recovering) {
      return;
    }
    recovering = true;
    void chrome.runtime.sendMessage({ type: 'REMINDER_PAGE_ACTIVE' }).catch(() => undefined);
    void chrome.runtime
      .sendMessage({ type: 'GET_PENDING_REMINDERS' })
      .then((response) => {
        if (visible()) {
          (response?.reminders ?? []).forEach((reminder: Reminder) => controller.enqueue(reminder));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        recovering = false;
      });
  };
  chrome.runtime.onMessage.addListener(onMessage);
  document.addEventListener('visibilitychange', recover);
  window.addEventListener('focus', recover);
  recover();
  return () => {
    chrome.runtime.onMessage.removeListener(onMessage);
    document.removeEventListener('visibilitychange', recover);
    window.removeEventListener('focus', recover);
    controller.destroy();
  };
}
