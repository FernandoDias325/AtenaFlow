import type { ReminderRecurrence } from './reminder.types';

export interface ReminderSchedule {
  time: string;
  recurrence: ReminderRecurrence;
  date: string | null;
  daysOfWeek: number[];
}

function parseTime(time: string): [number, number] | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? [hour, minute] : null;
}

function atLocalTime(date: Date, hour: number, minute: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

export function calculateNextTrigger(
  schedule: ReminderSchedule,
  after = new Date()
): number | null {
  const parsed = parseTime(schedule.time);
  if (!parsed) {
    return null;
  }
  const [hour, minute] = parsed;

  if (schedule.recurrence === 'once') {
    if (!schedule.date || !/^\d{4}-\d{2}-\d{2}$/.test(schedule.date)) {
      return null;
    }
    const [year, month, day] = schedule.date.split('-').map(Number) as [number, number, number];
    const candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== month - 1 ||
      candidate.getDate() !== day
    ) {
      return null;
    }
    return candidate.getTime() > after.getTime() ? candidate.getTime() : null;
  }

  const allowedDays =
    schedule.recurrence === 'daily'
      ? [0, 1, 2, 3, 4, 5, 6]
      : schedule.recurrence === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : [...new Set(schedule.daysOfWeek)].filter((day) => day >= 0 && day <= 6);

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(after.getFullYear(), after.getMonth(), after.getDate() + offset);
    if (!allowedDays.includes(day.getDay())) {
      continue;
    }
    const candidate = atLocalTime(day, hour, minute);
    if (candidate.getTime() > after.getTime()) {
      return candidate.getTime();
    }
  }
  return null;
}

export function describeRecurrence(recurrence: ReminderRecurrence, daysOfWeek: number[]): string {
  if (recurrence === 'once') {
    return 'Uma vez';
  }
  if (recurrence === 'daily') {
    return 'Todos os dias';
  }
  if (recurrence === 'weekdays') {
    return 'Dias úteis';
  }
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((day) => labels[day])
    .join(', ');
}
