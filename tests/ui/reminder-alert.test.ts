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
  beforeEach(() => {
    document.documentElement
      .querySelectorAll('[data-atenaflow-reminder]')
      .forEach((node) => node.remove());
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      storage: { local: { get: vi.fn(async () => ({ 'atenaflow-theme': 'dark' })) } }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('mostra um cartão isolado e o remove após dez segundos', async () => {
    const controller = createReminderAlertController(vi.fn(), 10_000);
    controller.enqueue(reminder('1'));
    await vi.runAllTicks();
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).toBeNull();
    controller.destroy();
  });

  it('exibe os avisos simultâneos em fila', async () => {
    const controller = createReminderAlertController(vi.fn(), 100);
    controller.enqueue(reminder('1'));
    controller.enqueue(reminder('2'));
    await vi.runAllTicks();
    expect(document.querySelector('[data-atenaflow-reminder="1"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelector('[data-atenaflow-reminder="2"]')).not.toBeNull();
    controller.destroy();
  });
});
