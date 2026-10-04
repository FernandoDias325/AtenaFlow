// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReminderAlertController } from '../../src/core/content/reminder-alert';
import type { Reminder } from '../../src/core/reminders/reminder.types';

const reminder = (id: string): Reminder => ({
  id,
  title: `Lembrete ${id}`,
  description: 'Descrição',
  time: '10:00',
  recurrence: 'daily',
  date: null,
  daysOfWeek: [],
  enabled: true,
  nextTriggerAt: Date.now() + 1000,
  lastTriggeredAt: null,
  pendingSince: Date.now(),
  lastDisplayedAt: null,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

describe('aviso visual de lembrete', () => {
  let focused = true;
  let visibility: DocumentVisibilityState = 'visible';
  beforeEach(() => {
    document.documentElement
      .querySelectorAll('[data-atenaflow-reminder]')
      .forEach((node) => node.remove());
    vi.useFakeTimers();
    focused = true;
    visibility = 'visible';
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => focused });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility
    });
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn(async () => ({ 'atenaflow-theme': 'dark' })) } }
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'hasFocus');
    Reflect.deleteProperty(document, 'visibilityState');
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('mostra um cartão isolado e o remove após dez segundos', async () => {
    const controller = createReminderAlertController(vi.fn(), 10_000);
    controller.enqueue(reminder('1'));
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).toBeNull();
    controller.destroy();
  });

  it('exibe os avisos simultâneos em fila', async () => {
    const controller = createReminderAlertController(vi.fn(), 100);
    controller.enqueue(reminder('1'));
    controller.enqueue(reminder('2'));
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelector('[data-atenaflow-reminder="2"]')).not.toBeNull();
    controller.destroy();
  });
  it('não confirma exibição em uma página oculta e mostra ao voltar para ela', async () => {
    const displayed = vi.fn(async () => undefined);
    visibility = 'hidden';
    const controller = createReminderAlertController(vi.fn(), 100, { onDisplayed: displayed });
    controller.enqueue(reminder('1'));
    await vi.advanceTimersByTimeAsync(0);
    expect(displayed).not.toHaveBeenCalled();
    expect(document.querySelector('[data-atenaflow-reminder]')).toBeNull();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(displayed).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it('não duplica o lembrete enquanto prepara o cartão', async () => {
    const controller = createReminderAlertController(vi.fn(), 100);
    expect(controller.enqueue(reminder('1'))).toBe(true);
    expect(controller.enqueue(reminder('1'))).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelectorAll('[data-atenaflow-reminder]')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelectorAll('[data-atenaflow-reminder]')).toHaveLength(0);
    controller.destroy();
  });

  it('ignora cartões que foram concluídos antes de sair da fila', async () => {
    const resolveReminder = vi.fn(async (item: Reminder) => (item.id === '2' ? null : item));
    const controller = createReminderAlertController(vi.fn(), 100, { resolveReminder });
    controller.enqueue(reminder('1'));
    controller.enqueue(reminder('2'));
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelectorAll('[data-atenaflow-reminder]')).toHaveLength(0);
    expect(resolveReminder).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it('não deixa o aviso desaparecer sem leitura quando a pessoa troca de aba', async () => {
    const controller = createReminderAlertController(vi.fn(), 100);
    controller.enqueue(reminder('1'));
    await vi.advanceTimersByTimeAsync(0);
    focused = false;
    window.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[data-atenaflow-reminder]')).toBeNull();
    focused = true;
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).not.toBeNull();
    controller.destroy();
  });
});
