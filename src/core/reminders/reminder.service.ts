import { calculateNextTrigger } from './reminder.schedule';
import type { Reminder, ReminderDraft } from './reminder.types';

export const REMINDERS_STORAGE_KEY = 'atenaflow-reminders';
export const REMINDER_ALARM_PREFIX = 'atenaflow-reminder:';
export const REMINDER_SNOOZE_PREFIX = 'atenaflow-reminder-snooze:';

// A janela da extensão e o worker podem gravar ao mesmo tempo.
// O lock protege todo o ciclo ler → alterar → salvar entre esses contextos.
let mutationQueue: Promise<unknown> = Promise.resolve();
async function mutate<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return await navigator.locks.request('atenaflow-reminders-write', task);
  }
  const result = mutationQueue.then(task, task);
  mutationQueue = result.catch(() => undefined);
  return result;
}

function timestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

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
      nextTriggerAt: timestamp(item.nextTriggerAt),
      lastTriggeredAt: timestamp(item.lastTriggeredAt),
      pendingSince: timestamp(item.pendingSince),
      lastDisplayedAt: timestamp(item.lastDisplayedAt),
      snoozedUntil: timestamp(item.snoozedUntil)
    }));
}

async function writeReminders(reminders: Reminder[]): Promise<void> {
  await chrome.storage.local.set({ [REMINDERS_STORAGE_KEY]: reminders });
}

async function saveReminderUnlocked(draft: ReminderDraft, id?: string): Promise<Reminder> {
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
    nextTriggerAt: enabled
      ? existing?.enabled && !scheduleChanged && existing.nextTriggerAt !== null
        ? existing.nextTriggerAt
        : calculateNextTrigger(schedule, new Date(now))
      : null,
    lastTriggeredAt: existing?.lastTriggeredAt ?? null,
    pendingSince: scheduleChanged || !enabled ? null : (existing?.pendingSince ?? null),
    lastDisplayedAt: scheduleChanged || !enabled ? null : (existing?.lastDisplayedAt ?? null),
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

async function deleteReminderUnlocked(id: string): Promise<void> {
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
  if (reminder.snoozedUntil && reminder.snoozedUntil > Date.now()) {
    await chrome.alarms.create(snoozeAlarmName, { when: reminder.snoozedUntil });
  }
}

async function reconcileReminderAlarmsUnlocked(): Promise<void> {
  const alarmsApi = (chrome as unknown as { alarms?: typeof chrome.alarms }).alarms;
  if (!alarmsApi) {
    return;
  }
  const now = Date.now();
  const reminders = await getReminders();
  const existing = await alarmsApi.getAll();
  const expected = new Map<string, number>();
  let changed = false;
  for (const reminder of reminders) {
    const snoozeDue =
      reminder.snoozedUntil !== null &&
      reminder.snoozedUntil !== undefined &&
      reminder.snoozedUntil <= now;
    const regularDue =
      reminder.enabled && reminder.nextTriggerAt !== null && reminder.nextTriggerAt <= now;
    if (snoozeDue || regularDue) {
      triggerReminder(reminder, now, snoozeDue, regularDue);
      changed = true;
    }
    // Recalcula os horários futuros no fuso local atual, inclusive após troca de fuso.
    if (reminder.enabled && (reminder.nextTriggerAt === null || reminder.nextTriggerAt > now)) {
      const next = calculateNextTrigger(reminder, new Date(now));
      if (next !== reminder.nextTriggerAt) {
        reminder.nextTriggerAt = next;
        changed = true;
      }
      if (next === null) {
        reminder.enabled = false;
        changed = true;
      }
    }
    if (reminder.enabled && reminder.nextTriggerAt !== null) {
      expected.set(`${REMINDER_ALARM_PREFIX}${reminder.id}`, reminder.nextTriggerAt);
    }
    if (reminder.snoozedUntil && reminder.snoozedUntil > now) {
      expected.set(`${REMINDER_SNOOZE_PREFIX}${reminder.id}`, reminder.snoozedUntil);
    }
  }
  if (changed) {
    await writeReminders(reminders);
  }
  for (const alarm of existing) {
    if (
      (alarm.name.startsWith(REMINDER_ALARM_PREFIX) ||
        alarm.name.startsWith(REMINDER_SNOOZE_PREFIX)) &&
      !expected.has(alarm.name)
    ) {
      await alarmsApi.clear(alarm.name);
    }
  }
  for (const [name, when] of expected) {
    if (!existing.some((alarm) => alarm.name === name && alarm.scheduledTime === when)) {
      await alarmsApi.create(name, { when });
    }
  }
}

function triggerReminder(
  reminder: Reminder,
  now: number,
  snoozed: boolean,
  regular: boolean
): void {
  const dueAt = snoozed ? reminder.snoozedUntil : reminder.nextTriggerAt;
  reminder.pendingSince = reminder.pendingSince ?? dueAt ?? now;
  reminder.lastTriggeredAt = now;
  reminder.lastDisplayedAt = null;
  if (snoozed) {
    reminder.snoozedUntil = null;
  }
  if (regular) {
    reminder.nextTriggerAt = calculateNextTrigger(reminder, new Date(now));
    if (reminder.nextTriggerAt === null) {
      reminder.enabled = false;
    }
  }
  reminder.updatedAt = now;
}

async function processReminderAlarmUnlocked(
  id: string,
  snoozed = false,
  scheduledTime?: number
): Promise<Reminder | null> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder || (!snoozed && !reminder.enabled)) {
    return null;
  }
  const now = Date.now();
  const dueAt = snoozed ? reminder.snoozedUntil : reminder.nextTriggerAt;
  // Ignore um alarme antigo após edição/pausa, ou entregue antes do horário salvo.
  if (
    dueAt === null ||
    dueAt === undefined ||
    dueAt > now ||
    (scheduledTime !== undefined && scheduledTime !== dueAt)
  ) {
    return null;
  }
  triggerReminder(reminder, now, snoozed, !snoozed);
  await writeReminders(reminders);
  await syncReminderAlarm(reminder);
  return reminder;
}

async function markReminderDisplayedUnlocked(id: string, occurrence?: number): Promise<void> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (
    !reminder ||
    reminder.pendingSince === null ||
    (occurrence !== undefined && reminder.lastTriggeredAt !== occurrence)
  ) {
    return;
  }
  reminder.lastDisplayedAt = Date.now();
  reminder.updatedAt = Date.now();
  await writeReminders(reminders);
}

async function completeReminderUnlocked(id: string): Promise<void> {
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

async function snoozeReminderUnlocked(id: string, minutes = 5): Promise<void> {
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder || reminder.pendingSince === null || !Number.isFinite(minutes) || minutes <= 0) {
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
      !reminder.snoozedUntil &&
      (reminder.lastDisplayedAt === null || now - reminder.lastDisplayedAt >= repeatAfterMs)
  );
  return pending;
}

export function saveReminder(draft: ReminderDraft, id?: string): Promise<Reminder> {
  return mutate(() => saveReminderUnlocked(draft, id));
}
export function deleteReminder(id: string): Promise<void> {
  return mutate(() => deleteReminderUnlocked(id));
}
export function reconcileReminderAlarms(): Promise<void> {
  return mutate(reconcileReminderAlarmsUnlocked);
}
export function processReminderAlarm(
  id: string,
  snoozed = false,
  scheduledTime?: number
): Promise<Reminder | null> {
  return mutate(() => processReminderAlarmUnlocked(id, snoozed, scheduledTime));
}
export function markReminderDisplayed(id: string, occurrence?: number): Promise<void> {
  return mutate(() => markReminderDisplayedUnlocked(id, occurrence));
}
export function completeReminder(id: string): Promise<void> {
  return mutate(() => completeReminderUnlocked(id));
}
export function snoozeReminder(id: string, minutes = 5): Promise<void> {
  return mutate(() => snoozeReminderUnlocked(id, minutes));
}
