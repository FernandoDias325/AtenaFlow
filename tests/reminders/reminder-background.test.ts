import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import background from '../../entrypoints/background';
import * as service from '../../src/core/reminders/reminder.service';
import type { Reminder } from '../../src/core/reminders/reminder.types';

vi.mock('wxt/sandbox', () => ({ defineBackground: (callback: () => void) => callback }));
vi.mock('../../src/core/reminders/reminder.service', () => ({
  completeReminder: vi.fn(async () => undefined),
  getPendingReminders: vi.fn(async () => []),
  getReminders: vi.fn(async () => []),
  markReminderDisplayed: vi.fn(async () => undefined),
  processReminderAlarm: vi.fn(async () => null),
  reconcileReminderAlarms: vi.fn(async () => undefined),
  snoozeReminder: vi.fn(async () => undefined),
  REMINDER_ALARM_PREFIX: 'atenaflow-reminder:',
  REMINDER_SNOOZE_PREFIX: 'atenaflow-reminder-snooze:'
}));

const reminder: Reminder = {
  id: 'a',
  title: 'Pausa',
  description: 'Beber água',
  time: '10:00',
  recurrence: 'daily',
  date: null,
  daysOfWeek: [],
  enabled: true,
  nextTriggerAt: 2000,
  lastTriggeredAt: 1000,
  pendingSince: 1000,
  lastDisplayedAt: null,
  createdAt: 1,
  updatedAt: 1000
};
const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe('worker de lembretes', () => {
  let onAlarm: (alarm: chrome.alarms.Alarm) => Promise<void>;
  let onMessage: (
    message: Record<string, unknown>,
    sender: chrome.runtime.MessageSender,
    response: (value: unknown) => void
  ) => boolean | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.getPendingReminders).mockResolvedValue([]);
    vi.mocked(service.getReminders).mockResolvedValue([]);
    vi.stubGlobal('chrome', {
      alarms: {
        onAlarm: {
          addListener: vi.fn((callback) => {
            onAlarm = callback;
          })
        }
      },
      runtime: {
        onStartup: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: vi.fn((callback) => {
            onMessage = callback;
          })
        },
        sendMessage: vi.fn(async () => ({ accepted: false }))
      },
      storage: {
        session: {
          get: vi.fn(async () => ({ 'atenaflow-last-reminder-page-tab': 1 })),
          set: vi.fn(async () => undefined)
        }
      },
      tabs: {
        sendMessage: vi.fn(async (id: number) => ({ accepted: id === 2 })),
        query: vi.fn(async () => [{ id: 2 }])
      },
      windows: { onRemoved: { addListener: vi.fn() } },
      action: { onClicked: { addListener: vi.fn() } }
    });
    (background as unknown as () => void)();
  });
  afterEach(async () => {
    await settle();
    vi.unstubAllGlobals();
  });

  it('reconcilia alarmes sempre que o worker inicia, sem depender de onStartup', async () => {
    await settle();
    expect(service.reconcileReminderAlarms).toHaveBeenCalledTimes(1);
    expect(service.getPendingReminders).toHaveBeenCalledTimes(1);
  });

  it('entrega o conteúdo completo à aba compatível e só confirma após o cartão aparecer', async () => {
    await settle();
    vi.mocked(service.processReminderAlarm).mockResolvedValue(reminder);
    await onAlarm({ name: `${service.REMINDER_ALARM_PREFIX}a`, scheduledTime: 1000 });
    expect(service.processReminderAlarm).toHaveBeenCalledWith('a', false, 1000);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: 'SHOW_REMINDER_ALERT',
      reminder
    });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, {
      type: 'SHOW_REMINDER_ALERT',
      reminder
    });
    expect(service.markReminderDisplayed).not.toHaveBeenCalled();
    const response = vi.fn();
    onMessage({ type: 'REMINDER_DISPLAYED', reminderId: 'a', occurrence: 1000 }, {}, response);
    await settle();
    expect(service.markReminderDisplayed).toHaveBeenCalledWith('a', 1000);
    expect(response).toHaveBeenCalledWith({ success: true });
  });

  it('não entrega um cartão que já foi concluído enquanto aguardava na fila', async () => {
    await settle();
    vi.mocked(service.getReminders).mockResolvedValue([{ ...reminder, pendingSince: null }]);
    const response = vi.fn();
    onMessage({ type: 'GET_REMINDER_TO_DISPLAY', reminderId: 'a', occurrence: 1000 }, {}, response);
    await settle();
    expect(response).toHaveBeenCalledWith({ reminder: null });
  });

  it('permite entrega na própria janela do AtenaFlow quando ela está em foco', async () => {
    await settle();
    vi.mocked(service.processReminderAlarm).mockResolvedValue(reminder);
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ accepted: true });
    await onAlarm({ name: `${service.REMINDER_ALARM_PREFIX}a`, scheduledTime: 1000 });
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});
