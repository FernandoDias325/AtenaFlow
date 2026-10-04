// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installReminderDelivery } from '../../src/core/content/reminder-delivery';
import type { Reminder } from '../../src/core/reminders/reminder.types';

const reminder: Reminder = {
  id: 'a',
  title: 'Pausa',
  description: '',
  time: '10:00',
  recurrence: 'daily',
  date: null,
  daysOfWeek: [],
  enabled: true,
  nextTriggerAt: 1000,
  lastTriggeredAt: 1,
  pendingSince: 1,
  lastDisplayedAt: null,
  createdAt: 1,
  updatedAt: 1
};

describe('entrega de lembretes nas páginas e na janela da extensão', () => {
  let focused: boolean;
  let pending: Reminder[];
  let dispose: (() => void) | undefined;
  let listener: (message: unknown, sender: unknown, respond: (response: unknown) => void) => void;
  const send = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    focused = true;
    pending = [];
    send.mockReset();
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => focused });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible'
    });
    send.mockImplementation(async (message: { type: string }) => {
      if (message.type === 'GET_PENDING_REMINDERS') {
        return { reminders: pending };
      }
      if (message.type === 'GET_REMINDER_TO_DISPLAY') {
        return { reminder };
      }
      return { success: true };
    });
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: send,
        onMessage: {
          addListener: vi.fn((callback) => {
            listener = callback;
          }),
          removeListener: vi.fn()
        }
      },
      storage: { local: { get: vi.fn(async () => ({})) } }
    });
  });
  afterEach(() => {
    dispose?.();
    dispose = undefined;
    Reflect.deleteProperty(document, 'hasFocus');
    Reflect.deleteProperty(document, 'visibilityState');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('recusa entrega fora de foco e não envia confirmação de exibição', async () => {
    focused = false;
    dispose = installReminderDelivery();
    const respond = vi.fn();
    listener({ type: 'SHOW_REMINDER_ALERT', reminder }, {}, respond);
    await vi.advanceTimersByTimeAsync(0);
    expect(respond).toHaveBeenCalledWith({ accepted: false });
    expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'REMINDER_DISPLAYED' }));
  });

  it('recupera pendências novas em retornos posteriores à mesma página', async () => {
    dispose = installReminderDelivery();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[data-atenaflow-reminder]')).toBeNull();
    pending = [reminder];
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(
      send.mock.calls.filter(([message]) => message.type === 'GET_PENDING_REMINDERS')
    ).toHaveLength(2);
    expect(document.querySelector('[data-atenaflow-reminder="a"]')).not.toBeNull();
    expect(send).toHaveBeenCalledWith({
      type: 'REMINDER_DISPLAYED',
      reminderId: 'a',
      occurrence: 1
    });
  });

  it('recusa mensagens antigas que contêm somente o ID, sem conteúdo do lembrete', async () => {
    dispose = installReminderDelivery();
    const respond = vi.fn();
    listener({ type: 'SHOW_REMINDER_ALERT', reminder: { id: 'a' } }, {}, respond);
    expect(respond).toHaveBeenCalledWith({ accepted: false });
  });
});
