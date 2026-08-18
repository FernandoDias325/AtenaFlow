import { calculateNextTrigger } from './reminder.schedule';
import type { Reminder, ReminderDraft } from './reminder.types';

export const REMINDERS_STORAGE_KEY = 'atenaflow-reminders';
export const REMINDER_ALARM_PREFIX = 'atenaflow-reminder:';
export const REMINDER_SNOOZE_PREFIX = 'atenaflow-reminder-snooze:';

function createId(): string {
  return crypto.randomUUID?.() ?? `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeReminderTitle(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1) : '';
}

export async function getReminders(): Promise<Reminder[]> {
  const stored = await chrome.storage.local.get(REMINDERS_STORAGE_KEY);
  const value = stored[REMINDERS_STORAGE_KEY];
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Reminder => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const candidate = item as Partial<Reminder>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.description === 'string' &&
        typeof candidate.time === 'string' &&
        ['once', 'daily', 'weekdays', 'custom'].includes(String(candidate.recurrence)) &&
        Array.isArray(candidate.daysOfWeek) &&
        typeof candidate.enabled === 'boolean'
      );
    })
    .map((item) => ({
      ...item,
      title: normalizeReminderTitle(item.title),
      snoozedUntil: typeof item.snoozedUntil === 'number' ? item.snoozedUntil : null
    }));
}

async function writeReminders(reminders: Reminder[]): Promise<void> {
  await chrome.storage.local.set({ [REMINDERS_STORAGE_KEY]: reminders });
}

export async function saveReminder(draft: ReminderDraft, id?: string): Promise<Reminder> {
  const reminders = await getReminders();
  const existing = id ? reminders.find((reminder) => reminder.id === id) : undefined;
  const now = Date.now();
  const normalizedDays = [...new Set(draft.daysOfWeek)].sort((a, b) => a - b);
  const existingDays = existing?.daysOfWeek.slice().sort((a, b) => a - b) ?? [];
  const scheduleChanged = Boolean(
    existing &&
    (existing.time !== draft.time ||
      existing.recurrence !== draft.recurrence ||
      existing.date !== draft.date ||
      existingDays.join(',') !== normalizedDays.join(','))
  );
  const enabled = scheduleChanged && !draft.preserveEnabled ? true : draft.enabled;
  const schedule = {
    time: draft.time,
    recurrence: draft.recurrence,
    date: draft.date,
    daysOfWeek: normalizedDays
  };
  const reminder: Reminder = {
    id: existing?.id ?? createId(),
    title: normalizeReminderTitle(draft.title).slice(0, 120),
    description: draft.description.trim().slice(0, 500),
    time: draft.time,
    recurrence: draft.recurrence,
    date: draft.date,
    daysOfWeek: normalizedDays,
    enabled,
    nextTriggerAt: enabled ? calculateNextTrigger(schedule, new Date(now)) : null,
    lastTriggeredAt: existing?.lastTriggeredAt ?? null,
    pendingSince: scheduleChanged ? null : (existing?.pendingSince ?? null),
    lastDisplayedAt: scheduleChanged ? null : (existing?.lastDisplayedAt ?? null),
    snoozedUntil: scheduleChanged || !enabled ? null : (existing?.snoozedUntil ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  if (!reminder.title || (!reminder.nextTriggerAt && reminder.enabled)) {
    throw new Error('Informe um título e um horário futuro válido.');
  }
  const updated = existing
    ? reminders.map((item) => (item.id === reminder.id ? reminder : item))
    : [...reminders, reminder];
  await writeReminders(updated);
  await syncReminderAlarm(reminder);
  return reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  await writeReminders((await getReminders()).filter((reminder) => reminder.id !== id));
  await chrome.alarms.clear(`${REMINDER_ALARM_PREFIX}${id}`);
  await chrome.alarms.clear(`${REMINDER_SNOOZE_PREFIX}${id}`);
}

export async function syncReminderAlarm(reminder: Reminder): Promise<void> {
  const alarmName = `${REMINDER_ALARM_PREFIX}${reminder.id}`;
  await chrome.alarms.clear(alarmName);
  if (reminder.enabled && reminder.nextTriggerAt) {
    await chrome.alarms.create(alarmName, { when: reminder.nextTriggerAt });
  }
  const snoozeAlarmName = `${REMINDER_SNOOZE_PREFIX}${reminder.id}`;
  await chrome.alarms.clear(snoozeAlarmName);
  if (reminder.enabled && reminder.snoozedUntil && reminder.snoozedUntil > Date.now()) {
    await chrome.alarms.create(snoozeAlarmName, { when: reminder.snoozedUntil });
  }
}

export async function reconcileReminderAlarms(): Promise<void> {
  const alarmsApi = (chrome as unknown as { alarms?: typeof chrome.alarms }).alarms;
  if (!alarmsApi) {
    return;
  }
  const reminders = await getReminders();
  const validNames = new Set(reminders.map((item) => `${REMINDER_ALARM_PREFIX}${item.id}`));
  const validSnoozeNames = new Set(reminders.map((item) => `${REMINDER_SNOOZE_PREFIX}${item.id}`));
  const existing = await alarmsApi.getAll();
  await Promise.all(
    existing
      .filter(
        (alarm) =>
          (alarm.name.startsWith(REMINDER_SNOOZE_PREFIX) && !validSnoozeNames.has(alarm.name)) ||
          (alarm.name.startsWith(REMINDER_ALARM_PREFIX) &&
            !alarm.name.startsWith(REMINDER_SNOOZE_PREFIX) &&
            !validNames.has(alarm.name))
      )
      .map((alarm) => alarmsApi.clear(alarm.name))
  );
  await Promise.all(reminders.map(syncReminderAlarm));
}

export async function processReminderAlarm(id: string, snoozed = false): Promise<Reminder | null> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder || !reminder.enabled) {
    return null;
  }
  const now = Date.now();
  reminder.pendingSince = reminder.pendingSince ?? now;
  reminder.lastTriggeredAt = now;
  // Só será preenchido depois que uma página confirmar que recebeu o cartão.
  reminder.lastDisplayedAt = null;
  if (snoozed) {
    reminder.snoozedUntil = null;
  }
  if (!snoozed) {
    reminder.nextTriggerAt = calculateNextTrigger(reminder, new Date(now + 1_000));
    if (!reminder.nextTriggerAt) {
      reminder.enabled = false;
    }
  }
  reminder.updatedAt = now;
  await writeReminders(reminders);
  await syncReminderAlarm(reminder);
  return reminder;
}

export async function markReminderDisplayed(id: string): Promise<void> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder || reminder.pendingSince === null) {
    return;
  }
  reminder.lastDisplayedAt = Date.now();
  reminder.updatedAt = Date.now();
  await writeReminders(reminders);
}

export async function completeReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) {
    return;
  }
  reminder.pendingSince = null;
  reminder.lastDisplayedAt = null;
  reminder.snoozedUntil = null;
  reminder.updatedAt = Date.now();
  await writeReminders(reminders);
  await chrome.alarms.clear(`${REMINDER_SNOOZE_PREFIX}${id}`);
}

export async function snoozeReminder(id: string, minutes = 5): Promise<void> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) {
    return;
  }
  reminder.pendingSince = null;
  reminder.lastDisplayedAt = null;
  reminder.snoozedUntil = Date.now() + minutes * 60_000;
  reminder.updatedAt = Date.now();
  await writeReminders(reminders);
  await syncReminderAlarm(reminder);
}

export async function getPendingReminders(repeatAfterMs = 5 * 60_000): Promise<Reminder[]> {
  const now = Date.now();
  const reminders = await getReminders();
  const pending = reminders.filter(
    (reminder) =>
      reminder.pendingSince !== null &&
      (reminder.lastDisplayedAt === null || now - reminder.lastDisplayedAt >= repeatAfterMs)
  );
  if (pending.length) {
    pending.forEach((reminder) => (reminder.lastDisplayedAt = now));
    await writeReminders(reminders);
  }
  return pending;
}
