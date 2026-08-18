import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeReminder,
  getPendingReminders,
  getReminders,
  processReminderAlarm,
  reconcileReminderAlarms,
  REMINDERS_STORAGE_KEY,
  REMINDER_ALARM_PREFIX,
  REMINDER_SNOOZE_PREFIX,
  saveReminder,
  snoozeReminder
} from '../../src/core/reminders/reminder.service';

describe('serviço de lembretes', () => {
  let storage: Record<string, unknown>;
  const alarmCreate = vi.fn();
  const alarmClear = vi.fn();

  beforeEach(() => {
    storage = {};
    alarmCreate.mockReset();
    alarmClear.mockReset();
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
          set: vi.fn(async (value: Record<string, unknown>) => Object.assign(storage, value))
        }
      },
      alarms: { create: alarmCreate, clear: alarmClear, getAll: vi.fn(async () => []) }
    });
  });

  it('salva e agenda um lembrete ativo', async () => {
    const reminder = await saveReminder({
      title: 'Pausa',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    expect(storage[REMINDERS_STORAGE_KEY] as unknown[]).toHaveLength(1);
    expect(reminder.nextTriggerAt).not.toBeNull();
    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}${reminder.id}`, {
      when: reminder.nextTriggerAt
    });
  });

  it('normaliza o título com inicial maiúscula e espaços consistentes', async () => {
    const reminder = await saveReminder({
      title: '  pausa   para café ',
      description: 'Descrição',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });

    expect(reminder.title).toBe('Pausa para café');
  });

  it('marca como pendente, calcula a próxima ocorrência e permite concluir', async () => {
    const reminder = await saveReminder({
      title: 'Reunião',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    const fired = await processReminderAlarm(reminder.id);
    expect(fired?.pendingSince).not.toBeNull();
    expect(fired?.lastTriggeredAt).not.toBeNull();
    await completeReminder(reminder.id);
    expect((await getReminders())[0]?.pendingSince).toBeNull();
  });

  it('não repete imediatamente um aviso pendente já apresentado', async () => {
    const reminder = await saveReminder({
      title: 'Água',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    await processReminderAlarm(reminder.id);
    expect(await getPendingReminders()).toHaveLength(1);
    expect(await getPendingReminders()).toHaveLength(0);
    expect(await getPendingReminders(0)).toHaveLength(1);
  });

  it('agenda adiamento sem alterar a recorrência principal', async () => {
    const reminder = await saveReminder({
      title: 'Pausa',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    await snoozeReminder(reminder.id, 5);
    const snoozed = (await getReminders())[0]!;
    expect(snoozed.snoozedUntil).toEqual(expect.any(Number));
    expect(snoozed.pendingSince).toBeNull();
    expect(alarmCreate).toHaveBeenLastCalledWith(`${REMINDER_SNOOZE_PREFIX}${reminder.id}`, {
      when: expect.any(Number)
    });
    await processReminderAlarm(reminder.id, true);
    expect((await getReminders())[0]?.snoozedUntil).toBeNull();
  });

  it('ignora dados inválidos e remove alarmes órfãos após restauração', async () => {
    storage[REMINDERS_STORAGE_KEY] = [{ id: 'inválido' }];
    (chrome.alarms.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: `${REMINDER_ALARM_PREFIX}antigo`, scheduledTime: Date.now() }
    ]);

    expect(await getReminders()).toEqual([]);
    await reconcileReminderAlarms();

    expect(alarmClear).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}antigo`);
  });

  it('preserva o adiamento pertencente a um lembrete existente', async () => {
    const reminder = await saveReminder({
      title: 'Pausa',
      description: '',
      time: '10:00',
      recurrence: 'daily',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    await snoozeReminder(reminder.id, 5);
    const snoozedUntil = (await getReminders())[0]!.snoozedUntil;
    alarmClear.mockClear();
    alarmCreate.mockClear();
    (chrome.alarms.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: `${REMINDER_SNOOZE_PREFIX}${reminder.id}`, scheduledTime: Date.now() }
    ]);

    await reconcileReminderAlarms();

    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_SNOOZE_PREFIX}${reminder.id}`, {
      when: snoozedUntil
    });
  });

  it('reativa e reagenda um lembrete concluído quando seu horário é alterado', async () => {
    const future = new Date(Date.now() + 86_400_000);
    const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    const reminder = await saveReminder({
      title: 'Reunião',
      description: '',
      time: '10:00',
      recurrence: 'once',
      date,
      daysOfWeek: [],
      enabled: true
    });
    const firedState = await getReminders();
    firedState[0]!.enabled = false;
    firedState[0]!.nextTriggerAt = null;
    firedState[0]!.pendingSince = Date.now();
    storage[REMINDERS_STORAGE_KEY] = firedState;
    expect((await getReminders())[0]?.enabled).toBe(false);
    alarmCreate.mockClear();

    const rescheduled = await saveReminder(
      { ...reminder, time: '11:00', enabled: false },
      reminder.id
    );

    expect(rescheduled.enabled).toBe(true);
    expect(rescheduled.pendingSince).toBeNull();
    expect(rescheduled.nextTriggerAt).not.toBeNull();
    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}${reminder.id}`, {
      when: rescheduled.nextTriggerAt
    });
  });

  it('substitui o alarme de um lembrete ativo de dias úteis ao editar o horário', async () => {
    const reminder = await saveReminder({
      title: 'Pausa',
      description: '',
      time: '10:00',
      recurrence: 'weekdays',
      date: null,
      daysOfWeek: [],
      enabled: true
    });
    alarmClear.mockClear();
    alarmCreate.mockClear();

    const edited = await saveReminder({ ...reminder, time: '11:00' }, reminder.id);

    expect(edited.enabled).toBe(true);
    expect(edited.time).toBe('11:00');
    expect(alarmClear).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}${reminder.id}`);
    expect(alarmCreate).toHaveBeenCalledTimes(1);
    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}${reminder.id}`, {
      when: edited.nextTriggerAt
    });
  });
});
