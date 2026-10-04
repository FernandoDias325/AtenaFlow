import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReminderDraft } from '../../src/core/reminders/reminder.types';

describe('gravação de lembretes entre a janela e o worker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it('usa um lock compartilhado para preservar alterações de dois contextos independentes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 9, 0));
    let queue: Promise<unknown> = Promise.resolve();
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => {
      const result = queue.then(task);
      queue = result.catch(() => undefined);
      return result;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    const storage: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => structuredClone({ [key]: storage[key] })),
          set: vi.fn(async (data: Record<string, unknown>) => {
            Object.assign(storage, structuredClone(data));
          })
        }
      },
      alarms: { clear: vi.fn(async () => true), create: vi.fn(async () => undefined) }
    });
    vi.resetModules();
    const windowService = await import('../../src/core/reminders/reminder.service');
    vi.resetModules();
    const workerService = await import('../../src/core/reminders/reminder.service');
    const draft: ReminderDraft = {
      title: 'Pausa',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    };
    await Promise.all([
      windowService.saveReminder(draft),
      workerService.saveReminder({ ...draft, title: 'Reunião' })
    ]);
    expect((await windowService.getReminders()).map((item) => item.title)).toEqual([
      'Pausa',
      'Reunião'
    ]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.every(([name]) => name === 'atenaflow-reminders-write')).toBe(true);
  });
});
