// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reminder } from '../../src/core/reminders/reminder.types';
import { createRemindersView } from '../../src/ui/views/RemindersView';

describe('tela de lembretes', () => {
  let storageListener: ((changes: Record<string, unknown>, areaName: string) => void) | undefined;

  beforeEach(() => {
    document.body.replaceChildren();
    const now = Date.now();
    const reminders: Reminder[] = ['1', '2'].map((id) => ({
      id,
      title: `Teste ${id}`,
      description: id === '1' ? 'Fazer uma pausa\nde dez minutos' : '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true,
      nextTriggerAt: now + 60_000,
      lastTriggeredAt: null,
      pendingSince: null,
      lastDisplayedAt: null,
      snoozedUntil: id === '1' ? now + 5 * 60_000 : null,
      createdAt: now,
      updatedAt: now
    }));
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: vi.fn(async () => ({ 'atenaflow-reminders': reminders })) },
        onChanged: {
          addListener: vi.fn((listener) => (storageListener = listener)),
          removeListener: vi.fn()
        }
      }
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('não duplica cartões quando duas atualizações chegam juntas', async () => {
    const view = await createRemindersView();
    document.body.appendChild(view);

    storageListener?.({ 'atenaflow-reminders': {} }, 'local');
    storageListener?.({ 'atenaflow-reminders': {} }, 'local');
    await Promise.resolve();
    await Promise.resolve();

    expect(view.querySelectorAll('.reminders-summary')).toHaveLength(1);
    expect(view.querySelectorAll('.reminder-card')).toHaveLength(2);
    expect(view.textContent).toContain('Fazer uma pausa\nde dez minutos');
    expect(view.textContent).toContain('Sem descrição');
    expect(view.textContent).toContain('Adiado +5 min');
    expect(view.textContent).toContain('Adiados');
    expect(view.querySelector('.reminder-side .reminder-actions')).not.toBeNull();
  });
});
