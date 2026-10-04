import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeReminder,
  getPendingReminders,
  getReminders,
  markReminderDisplayed,
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 9, 0));
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

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const fire = async (id: string) => {
    const reminder = (await getReminders()).find((item) => item.id === id)!;
    vi.setSystemTime(reminder.nextTriggerAt!);
    return processReminderAlarm(id, false, reminder.nextTriggerAt!);
  };

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
    const fired = await fire(reminder.id);
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
    await fire(reminder.id);
    expect(await getPendingReminders()).toHaveLength(1);
    await markReminderDisplayed(reminder.id);
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
    await fire(reminder.id);
    await snoozeReminder(reminder.id, 5);
    const snoozed = (await getReminders())[0]!;
    expect(snoozed.snoozedUntil).toEqual(expect.any(Number));
    expect(snoozed.pendingSince).toBeNull();
    expect(alarmCreate).toHaveBeenLastCalledWith(`${REMINDER_SNOOZE_PREFIX}${reminder.id}`, {
      when: expect.any(Number)
    });
    vi.setSystemTime(snoozed.snoozedUntil!);
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
    await fire(reminder.id);
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
  const draft = {
    title: 'Pausa',
    description: '',
    time: '10:00',
    recurrence: 'daily' as const,
    date: null,
    daysOfWeek: [],
    enabled: true
  };

  it('não dispara antes do horário e ignora eventos antigos após uma edição', async () => {
    const reminder = await saveReminder(draft);
    expect(await processReminderAlarm(reminder.id)).toBeNull();
    const edited = await saveReminder({ ...draft, time: '11:00' }, reminder.id);
    vi.setSystemTime(edited.nextTriggerAt!);
    expect(await processReminderAlarm(reminder.id, false, reminder.nextTriggerAt!)).toBeNull();
    expect((await getReminders())[0]!.pendingSince).toBeNull();
    expect(await processReminderAlarm(reminder.id, false, edited.nextTriggerAt!)).not.toBeNull();
  });

  it('editar apenas o título não pula um aviso já vencido para amanhã', async () => {
    const reminder = await saveReminder(draft);
    vi.setSystemTime(new Date(2026, 7, 18, 10, 1));
    const edited = await saveReminder({ ...draft, title: 'Beber água' }, reminder.id);
    expect(edited.nextTriggerAt).toBe(reminder.nextTriggerAt);
    await reconcileReminderAlarms();
    const recovered = (await getReminders())[0]!;
    expect(recovered.pendingSince).toBe(reminder.nextTriggerAt);
    expect(recovered.nextTriggerAt).toBe(new Date(2026, 7, 19, 10, 0).getTime());
  });

  it('consultar pendências não marca o aviso como apresentado', async () => {
    const reminder = await saveReminder(draft);
    const fired = (await fire(reminder.id))!;
    expect(await getPendingReminders()).toHaveLength(1);
    expect(await getPendingReminders()).toHaveLength(1);
    expect((await getReminders())[0]!.lastDisplayedAt).toBeNull();
    await markReminderDisplayed(reminder.id, fired.lastTriggeredAt!);
    expect(await getPendingReminders()).toHaveLength(0);
    vi.setSystemTime(Date.now() + 5 * 60_000);
    expect(await getPendingReminders()).toHaveLength(1);
  });

  it('permite adiar uma ocorrência única mesmo depois de encerrar o agendamento principal', async () => {
    const reminder = await saveReminder({ ...draft, recurrence: 'once', date: '2026-08-18' });
    await fire(reminder.id);
    expect((await getReminders())[0]!.enabled).toBe(false);
    await snoozeReminder(reminder.id);
    const snoozed = (await getReminders())[0]!;
    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_SNOOZE_PREFIX}${reminder.id}`, {
      when: snoozed.snoozedUntil
    });
    expect(await processReminderAlarm(reminder.id, true)).toBeNull();
    vi.setSystemTime(snoozed.snoozedUntil!);
    expect(await processReminderAlarm(reminder.id, true)).not.toBeNull();
    expect((await getPendingReminders())[0]!.id).toBe(reminder.id);
  });

  it('recupera adiamentos vencidos ao reiniciar, inclusive de lembretes únicos', async () => {
    const reminder = await saveReminder({ ...draft, recurrence: 'once', date: '2026-08-18' });
    await fire(reminder.id);
    await snoozeReminder(reminder.id);
    const snoozed = (await getReminders())[0]!;
    vi.setSystemTime(snoozed.snoozedUntil! + 60_000);
    await reconcileReminderAlarms();
    const recovered = (await getReminders())[0]!;
    expect(recovered.pendingSince).toBe(snoozed.snoozedUntil);
    expect(recovered.snoozedUntil).toBeNull();
    expect(await getPendingReminders()).toHaveLength(1);
  });

  it('mantém alarmes corretos e recria somente alarmes ausentes', async () => {
    const reminder = await saveReminder(draft);
    vi.mocked(chrome.alarms.getAll).mockResolvedValue([
      { name: `${REMINDER_ALARM_PREFIX}${reminder.id}`, scheduledTime: reminder.nextTriggerAt! }
    ]);
    alarmClear.mockClear();
    alarmCreate.mockClear();
    await reconcileReminderAlarms();
    expect(alarmClear).not.toHaveBeenCalled();
    expect(alarmCreate).not.toHaveBeenCalled();
    vi.mocked(chrome.alarms.getAll).mockResolvedValue([]);
    await reconcileReminderAlarms();
    expect(alarmCreate).toHaveBeenCalledWith(`${REMINDER_ALARM_PREFIX}${reminder.id}`, {
      when: reminder.nextTriggerAt
    });
  });

  it('não perde dois cadastros concorrentes nem atualizações simultâneas de pendência', async () => {
    const [a, b] = await Promise.all([
      saveReminder(draft),
      saveReminder({ ...draft, title: 'Reunião' })
    ]);
    expect(await getReminders()).toHaveLength(2);
    vi.setSystemTime(a.nextTriggerAt!);
    await Promise.all([processReminderAlarm(a.id), processReminderAlarm(b.id)]);
    expect(await getPendingReminders()).toHaveLength(2);
    await Promise.all([markReminderDisplayed(a.id), completeReminder(b.id)]);
    const reminders = await getReminders();
    expect(reminders.find((item) => item.id === a.id)!.lastDisplayedAt).not.toBeNull();
    expect(reminders.find((item) => item.id === b.id)!.pendingSince).toBeNull();
  });

  it('pausar remove a pendência e o adiamento e ignora o alarme antigo', async () => {
    const reminder = await saveReminder(draft);
    await fire(reminder.id);
    const paused = await saveReminder({ ...draft, enabled: false }, reminder.id);
    expect(paused.pendingSince).toBeNull();
    expect(await getPendingReminders()).toHaveLength(0);
    expect(await processReminderAlarm(reminder.id)).toBeNull();
  });

  it('uma confirmação atrasada não marca a próxima ocorrência como exibida', async () => {
    const reminder = await saveReminder(draft);
    const first = (await fire(reminder.id))!;
    await completeReminder(reminder.id);
    const second = (await fire(reminder.id))!;
    await markReminderDisplayed(reminder.id, first.lastTriggeredAt!);
    expect((await getReminders())[0]!.lastDisplayedAt).toBeNull();
    await markReminderDisplayed(reminder.id, second.lastTriggeredAt!);
    expect((await getReminders())[0]!.lastDisplayedAt).not.toBeNull();
  });

  it('normaliza timestamps legados ausentes sem criar pendências falsas', async () => {
    storage[REMINDERS_STORAGE_KEY] = [{ ...draft, id: 'legacy' }];
    expect(await getPendingReminders()).toHaveLength(0);
    await reconcileReminderAlarms();
    expect((await getReminders())[0]!.nextTriggerAt).toBe(new Date(2026, 7, 18, 10, 0).getTime());
  });

  it('realinha um horário futuro divergente com o horário local cadastrado', async () => {
    const reminder = await saveReminder(draft);
    storage[REMINDERS_STORAGE_KEY] = [
      { ...reminder, nextTriggerAt: new Date(2026, 7, 18, 12, 0).getTime() }
    ];
    await reconcileReminderAlarms();
    expect((await getReminders())[0]!.nextTriggerAt).toBe(new Date(2026, 7, 18, 10, 0).getTime());
  });
});
