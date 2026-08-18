import { describe, expect, it } from 'vitest';
import {
  calculateNextTrigger,
  describeRecurrence
} from '../../src/core/reminders/reminder.schedule';

const stamp = (year: number, month: number, day: number, hour: number, minute: number) =>
  new Date(year, month - 1, day, hour, minute).getTime();

describe('agenda de lembretes', () => {
  it('agenda uma ocorrência única futura e rejeita uma passada', () => {
    const schedule = {
      recurrence: 'once' as const,
      date: '2026-08-20',
      time: '14:30',
      daysOfWeek: []
    };
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 20, 14, 0))).toBe(
      stamp(2026, 8, 20, 14, 30)
    );
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 20, 15, 0))).toBeNull();
  });

  it('move um lembrete diário para o dia seguinte depois do horário', () => {
    const schedule = { recurrence: 'daily' as const, date: null, time: '10:00', daysOfWeek: [] };
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 18, 9, 0))).toBe(
      stamp(2026, 8, 18, 10, 0)
    );
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 18, 10, 1))).toBe(
      stamp(2026, 8, 19, 10, 0)
    );
  });

  it('pula o fim de semana em lembretes de dias úteis', () => {
    const schedule = { recurrence: 'weekdays' as const, date: null, time: '09:00', daysOfWeek: [] };
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 21, 10, 0))).toBe(
      stamp(2026, 8, 24, 9, 0)
    );
  });

  it('respeita os dias da semana escolhidos', () => {
    const schedule = {
      recurrence: 'custom' as const,
      date: null,
      time: '16:00',
      daysOfWeek: [2, 4]
    };
    expect(calculateNextTrigger(schedule, new Date(2026, 7, 18, 17, 0))).toBe(
      stamp(2026, 8, 20, 16, 0)
    );
    expect(describeRecurrence('custom', [4, 2])).toBe('Ter, Qui');
  });

  it('não agenda horários ou dias inválidos', () => {
    expect(
      calculateNextTrigger({ recurrence: 'daily', date: null, time: '25:00', daysOfWeek: [] })
    ).toBeNull();
    expect(
      calculateNextTrigger({ recurrence: 'custom', date: null, time: '10:00', daysOfWeek: [] })
    ).toBeNull();
    expect(
      calculateNextTrigger({
        recurrence: 'once',
        date: '2026-02-31',
        time: '10:00',
        daysOfWeek: []
      })
    ).toBeNull();
  });
});
