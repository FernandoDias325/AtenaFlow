export type ReminderRecurrence = 'once' | 'daily' | 'weekdays' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  time: string;
  recurrence: ReminderRecurrence;
  date: string | null;
  daysOfWeek: number[];
  enabled: boolean;
  nextTriggerAt: number | null;
  lastTriggeredAt: number | null;
  pendingSince: number | null;
  lastDisplayedAt: number | null;
  snoozedUntil?: number | null;
  createdAt: number;
  updatedAt: number;
}

export type ReminderDraft = Pick<
  Reminder,
  'title' | 'description' | 'time' | 'recurrence' | 'date' | 'daysOfWeek' | 'enabled'
> & { preserveEnabled?: boolean };
