import { emit } from '../../store/app-store';
import {
  completeReminder,
  deleteReminder,
  getReminders,
  saveReminder
} from '../../core/reminders/reminder.service';
import { calculateNextTrigger, describeRecurrence } from '../../core/reminders/reminder.schedule';
import type {
  Reminder,
  ReminderDraft,
  ReminderRecurrence
} from '../../core/reminders/reminder.types';
import { showConfirmModal } from '../components/ConfirmModal';

const STYLES = `
  .reminders-view{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--color-bg)}
  .reminders-header{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)}
  .reminders-back{display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-sm);color:var(--color-text-secondary)}
  .reminders-title{font-size:var(--font-size-xl);font-weight:var(--font-weight-semibold);color:var(--color-text)}
  .reminders-add{margin-left:auto;padding:7px 10px;border-radius:var(--radius-md);background:var(--bg-primary);color:#fff;font-size:var(--font-size-xs);font-weight:600}
  .reminders-content{flex:1;overflow-y:auto;padding:var(--space-3) var(--space-4);background:var(--color-bg-secondary)}
  .reminders-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-3)}
  .reminders-stat{padding:10px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg)}
  .reminders-stat strong{display:block;color:var(--color-primary);font-size:18px}.reminders-stat span{color:var(--color-text-tertiary);font-size:10px}
  .reminder-card{display:flex;align-items:center;gap:10px;padding:11px;margin-bottom:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg)}
  .reminder-card--pending{border-color:var(--color-primary);box-shadow:0 0 0 2px var(--color-primary-soft)}
  .reminder-time{flex-shrink:0;width:45px;color:var(--color-primary);font-size:14px;font-weight:700}
  .reminder-copy{min-width:0;flex:1}.reminder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-text);font-size:var(--font-size-sm);font-weight:600}.reminder-meta{margin-top:2px;color:var(--color-text-tertiary);font-size:10px}.reminder-pending{color:var(--color-primary);font-weight:600}
  .reminder-actions{display:flex;gap:2px}.reminder-action{display:grid;place-items:center;width:27px;height:27px;border-radius:6px;color:var(--color-text-secondary);font-size:12px}.reminder-action:hover{background:var(--color-bg-tertiary)}
  .reminder-switch{appearance:none;width:28px;height:16px;border-radius:10px;background:var(--color-border-hover);position:relative;cursor:pointer;flex-shrink:0}.reminder-switch:after{content:'';position:absolute;width:12px;height:12px;top:2px;left:2px;border-radius:50%;background:#fff;transition:.15s}.reminder-switch:checked{background:var(--color-primary)}.reminder-switch:checked:after{left:14px}
  .reminders-empty{text-align:center;padding:var(--space-6) var(--space-3);color:var(--color-text-secondary);font-size:var(--font-size-sm)}
  .reminder-modal{position:absolute;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.55)}
  .reminder-form{width:100%;max-height:100%;overflow-y:auto;padding:16px;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-bg);box-shadow:var(--shadow-xl)}
  .reminder-form h2{margin:0 0 13px;color:var(--color-text);font-size:var(--font-size-lg)}
  .reminder-field{display:block;margin-bottom:10px}.reminder-field span{display:block;margin-bottom:4px;color:var(--color-text-secondary);font-size:10px;font-weight:600}.reminder-field input,.reminder-field textarea,.reminder-field select{width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-secondary);color:var(--color-text);font:12px inherit}.reminder-field textarea{min-height:54px;resize:vertical}
  .reminder-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}.reminder-days{display:flex;justify-content:space-between;gap:3px;margin-bottom:12px}.reminder-day{position:relative}.reminder-day input{position:absolute;opacity:0}.reminder-day span{display:grid;place-items:center;width:31px;height:29px;border:1px solid var(--color-border);border-radius:7px;color:var(--color-text-secondary);font-size:9px;cursor:pointer}.reminder-day input:checked+span{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary);font-weight:700}
  .reminder-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}.reminder-form-actions button{padding:8px 11px;border-radius:var(--radius-md);font-size:var(--font-size-xs)}.reminder-cancel{border:1px solid var(--color-border);color:var(--color-text)}.reminder-save{background:var(--bg-primary);color:#fff}
  .reminders-summary{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:3px 5px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg);margin-bottom:8px}
  .reminders-summary__item{display:flex;align-items:center;gap:4px;color:var(--color-text-tertiary);font-size:10px}.reminders-summary__item strong{color:var(--color-primary);font-size:12px}.reminders-summary__dot{color:var(--color-border-hover)}
  .reminders-filters{display:flex;gap:5px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none}.reminders-filter{padding:5px 9px;border:1px solid var(--color-border);border-radius:var(--radius-full);color:var(--color-text-secondary);font-size:10px;white-space:nowrap}.reminders-filter[aria-pressed='true']{border-color:var(--color-primary);background:var(--color-primary-soft);color:var(--color-primary);font-weight:600}
  .reminder-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:8px;height:88px;box-sizing:border-box;padding:10px;margin-bottom:8px;overflow:hidden}
  .reminder-time{width:auto;padding:4px 7px;border-radius:7px;background:var(--color-primary-soft);font-size:11px;line-height:1.2}
  .reminder-copy{min-width:0}.reminder-name{font-size:12px;line-height:1.25}.reminder-description{display:-webkit-box;height:2.8em;overflow:hidden;margin-top:4px;color:var(--color-text-secondary);font-size:10px;line-height:1.4;white-space:pre-line;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}.reminder-description--empty{color:var(--color-text-tertiary);font-style:italic}
  .reminder-schedule{display:flex;gap:2px 5px;margin-top:5px;color:var(--color-text-tertiary);font-size:9px;line-height:1.35;white-space:nowrap;overflow:hidden}.reminder-schedule span{overflow:hidden;text-overflow:ellipsis}.reminder-schedule span+span::before{content:'•';margin-right:5px;color:var(--color-border-hover)}.reminder-next{flex:1;min-width:0}
  .reminder-side{display:flex;flex-direction:column;align-items:flex-end;gap:7px;min-width:31px}.reminder-actions{display:flex;justify-content:flex-end;gap:1px;opacity:.35;transition:opacity var(--transition-fast)}.reminder-card:hover .reminder-actions,.reminder-card--pending .reminder-actions{opacity:1}.reminder-action{width:22px;height:22px;font-size:11px}
  .reminder-status{display:inline-flex;align-items:center;padding:2px 6px;border-radius:var(--radius-full);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}.reminder-status--pending{background:var(--color-primary-soft);color:var(--color-primary)}.reminder-status--paused{background:var(--color-bg-tertiary);color:var(--color-text-tertiary)}.reminder-status--snoozed{background:color-mix(in srgb,var(--color-warning,#f59e0b) 16%,transparent);color:var(--color-warning,#d97706)}
  .reminder-form-section{margin-bottom:12px;padding-bottom:4px;border-bottom:1px solid var(--color-border)}.reminder-form-section:last-of-type{border-bottom:0}.reminder-form-section__title{margin:0 0 9px;color:var(--color-primary);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
  .reminder-active-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0 10px;color:var(--color-text-secondary);font-size:11px}.reminder-preview{margin:2px 0 12px;padding:8px 10px;border-radius:var(--radius-md);background:var(--color-primary-soft);color:var(--color-text-secondary);font-size:10px;line-height:1.4}.reminder-preview strong{color:var(--color-primary)}
`;

let styleInjected = false;
function injectStyles(): void {
  if (styleInjected) {
    return;
  }
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

function formatNext(timestamp: number | null): string {
  if (!timestamp) {
    return 'Sem próximo aviso';
  }
  return `Próximo: ${new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function createRemindersView(): Promise<HTMLElement> {
  injectStyles();
  const container = document.createElement('div');
  container.className = 'reminders-view';
  const header = document.createElement('header');
  header.className = 'reminders-header';
  const back = document.createElement('button');
  back.className = 'reminders-back';
  back.setAttribute('aria-label', 'Voltar para scripts');
  back.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>';
  back.addEventListener('click', () => emit('view-changed', { view: 'list' }));
  const title = document.createElement('span');
  title.className = 'reminders-title';
  title.textContent = 'Lembretes';
  const add = document.createElement('button');
  add.className = 'reminders-add';
  add.textContent = '+ Novo';
  header.append(back, title, add);
  const content = document.createElement('main');
  content.className = 'reminders-content';
  container.append(header, content);

  let renderVersion = 0;
  let currentFilter: 'all' | 'active' | 'pending' | 'snoozed' | 'paused' = 'all';

  const render = async () => {
    const currentRender = ++renderVersion;
    const reminders = (await getReminders()).sort((a, b) => {
      if (Boolean(a.pendingSince) !== Boolean(b.pendingSince)) {
        return a.pendingSince ? -1 : 1;
      }
      return (a.nextTriggerAt ?? Infinity) - (b.nextTriggerAt ?? Infinity);
    });
    if (currentRender !== renderVersion) {
      return;
    }
    content.replaceChildren();
    const summary = document.createElement('div');
    summary.className = 'reminders-summary';
    const active = reminders.filter((item) => item.enabled).length;
    const pending = reminders.filter((item) => item.pendingSince !== null).length;
    const snoozed = reminders.filter(
      (item) => item.snoozedUntil && item.snoozedUntil > Date.now()
    ).length;
    const paused = reminders.filter((item) => !item.enabled).length;
    summary.innerHTML = `<span class="reminders-summary__item"><strong>${active}</strong> ativos</span><span class="reminders-summary__dot">•</span><span class="reminders-summary__item"><strong>${pending}</strong> pendentes</span><span class="reminders-summary__dot">•</span><span class="reminders-summary__item"><strong>${snoozed}</strong> adiados</span><span class="reminders-summary__dot">•</span><span class="reminders-summary__item"><strong>${paused}</strong> pausados</span>`;
    content.appendChild(summary);
    const filters = document.createElement('div');
    filters.className = 'reminders-filters';
    const filterOptions = [
      ['all', 'Todos'],
      ['active', 'Ativos'],
      ['pending', 'Pendentes'],
      ['snoozed', 'Adiados'],
      ['paused', 'Pausados']
    ] as const;
    filterOptions.forEach(([id, label]) => {
      const button = document.createElement('button');
      button.className = 'reminders-filter';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(currentFilter === id));
      button.addEventListener('click', () => {
        currentFilter = id;
        void render();
      });
      filters.appendChild(button);
    });
    content.appendChild(filters);
    if (!reminders.length) {
      const empty = document.createElement('div');
      empty.className = 'reminders-empty';
      empty.textContent =
        'Nenhum lembrete cadastrado. Crie avisos para pausas, reuniões e outras atividades.';
      content.appendChild(empty);
      return;
    }
    const visibleReminders = reminders.filter((reminder) => {
      if (currentFilter === 'active') {
        return reminder.enabled;
      }
      if (currentFilter === 'pending') {
        return reminder.pendingSince !== null;
      }
      if (currentFilter === 'snoozed') {
        return Boolean(reminder.snoozedUntil && reminder.snoozedUntil > Date.now());
      }
      if (currentFilter === 'paused') {
        return !reminder.enabled;
      }
      return true;
    });
    if (!visibleReminders.length) {
      const empty = document.createElement('div');
      empty.className = 'reminders-empty';
      empty.textContent = 'Nenhum lembrete neste filtro.';
      content.appendChild(empty);
      return;
    }
    visibleReminders.forEach((reminder) => {
      const card = document.createElement('article');
      card.className = `reminder-card${reminder.pendingSince ? ' reminder-card--pending' : ''}`;
      const time = document.createElement('span');
      time.className = 'reminder-time';
      time.textContent = reminder.time;
      const copy = document.createElement('div');
      copy.className = 'reminder-copy';
      const name = document.createElement('div');
      name.className = 'reminder-name';
      name.textContent = reminder.title;
      const description = document.createElement('div');
      description.className = `reminder-description${reminder.description ? '' : ' reminder-description--empty'}`;
      description.textContent = reminder.description || 'Sem descrição';
      const schedule = document.createElement('div');
      schedule.className = 'reminder-schedule';
      const recurrence = document.createElement('span');
      recurrence.textContent = describeRecurrence(reminder.recurrence, reminder.daysOfWeek);
      const next = document.createElement('span');
      next.className = 'reminder-next';
      const isSnoozed = Boolean(reminder.snoozedUntil && reminder.snoozedUntil > Date.now());
      next.textContent = isSnoozed
        ? `Adiado +5 min · Novo aviso: ${new Date(reminder.snoozedUntil!).toLocaleTimeString(
            'pt-BR',
            { hour: '2-digit', minute: '2-digit' }
          )}`
        : formatNext(reminder.nextTriggerAt);
      schedule.append(recurrence, next);
      copy.append(name, description, schedule);
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'reminder-switch';
      toggle.checked = reminder.enabled;
      toggle.setAttribute(
        'aria-label',
        `${reminder.enabled ? 'Pausar' : 'Ativar'} ${reminder.title}`
      );
      toggle.addEventListener('change', async () => {
        await saveReminder({ ...reminder, enabled: toggle.checked }, reminder.id);
        await render();
      });
      const side = document.createElement('div');
      side.className = 'reminder-side';
      if (reminder.pendingSince || isSnoozed || !reminder.enabled) {
        const status = document.createElement('span');
        const statusKind = reminder.pendingSince ? 'pending' : isSnoozed ? 'snoozed' : 'paused';
        status.className = `reminder-status reminder-status--${statusKind}`;
        status.textContent = reminder.pendingSince
          ? 'Pendente'
          : isSnoozed
            ? 'Adiado +5'
            : 'Pausado';
        side.appendChild(status);
      }
      side.appendChild(toggle);
      const actions = document.createElement('div');
      actions.className = 'reminder-actions';
      if (reminder.pendingSince) {
        const done = document.createElement('button');
        done.className = 'reminder-action';
        done.title = 'Concluir';
        done.textContent = '✓';
        done.addEventListener('click', async () => {
          await completeReminder(reminder.id);
          await render();
        });
        actions.appendChild(done);
      }
      const edit = document.createElement('button');
      edit.className = 'reminder-action';
      edit.title = 'Editar';
      edit.textContent = '✎';
      edit.addEventListener('click', () => showForm(reminder));
      const remove = document.createElement('button');
      remove.className = 'reminder-action';
      remove.title = 'Excluir';
      remove.textContent = '×';
      remove.addEventListener('click', async () => {
        if (
          await showConfirmModal({
            title: 'Excluir lembrete',
            message: `Excluir “${reminder.title}”?`,
            confirmLabel: 'Excluir'
          })
        ) {
          await deleteReminder(reminder.id);
          await render();
        }
      });
      actions.append(edit, remove);
      side.appendChild(actions);
      card.append(time, copy, side);
      content.appendChild(card);
    });
  };

  const showForm = (existing?: Reminder) => {
    const modal = document.createElement('div');
    modal.className = 'reminder-modal';
    const form = document.createElement('form');
    form.className = 'reminder-form';
    const defaultDate = toLocalDateInput(new Date(Date.now() + 86_400_000));
    form.innerHTML = `<h2>${existing ? 'Editar lembrete' : 'Novo lembrete'}</h2>
      <section class="reminder-form-section"><h3 class="reminder-form-section__title">Informações</h3>
        <label class="reminder-field"><span>Título</span><input name="title" maxlength="120" placeholder="Ex.: Pausa para descanso" required></label>
        <label class="reminder-field"><span>Descrição</span><textarea name="description" maxlength="500" placeholder="Detalhes que aparecerão no cartão"></textarea></label>
      </section>
      <section class="reminder-form-section"><h3 class="reminder-form-section__title">Agendamento</h3>
        <div class="reminder-row"><label class="reminder-field"><span>Horário</span><input name="time" type="time" required></label><label class="reminder-field"><span>Recorrência</span><select name="recurrence"><option value="once">Uma vez</option><option value="daily">Todos os dias</option><option value="weekdays">Dias úteis</option><option value="custom">Dias específicos</option></select></label></div>
        <label class="reminder-field reminder-date"><span>Data</span><input name="date" type="date" required></label>
        <div class="reminder-days"></div>
        <label class="reminder-active-row"><span>Lembrete ativo</span><input class="reminder-switch" name="enabled" type="checkbox"></label>
        <div class="reminder-preview"><strong>Próximo aviso:</strong> <span></span></div>
      </section>
      <div class="reminder-form-actions"><button type="button" class="reminder-cancel">Cancelar</button><button class="reminder-save">Salvar lembrete</button></div>`;
    const titleInput = form.elements.namedItem('title') as HTMLInputElement;
    const descInput = form.elements.namedItem('description') as HTMLTextAreaElement;
    const timeInput = form.elements.namedItem('time') as HTMLInputElement;
    const recurrenceInput = form.elements.namedItem('recurrence') as HTMLSelectElement;
    const dateInput = form.elements.namedItem('date') as HTMLInputElement;
    const enabledInput = form.elements.namedItem('enabled') as HTMLInputElement;
    titleInput.value = existing?.title ?? '';
    descInput.value = existing?.description ?? '';
    timeInput.value = existing?.time ?? new Date().toTimeString().slice(0, 5);
    recurrenceInput.value = existing?.recurrence ?? 'once';
    dateInput.value = existing?.date ?? defaultDate;
    enabledInput.checked = existing?.enabled ?? true;
    const daysHost = form.querySelector('.reminder-days')!;
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((label, day) => {
      const dayLabel = document.createElement('label');
      dayLabel.className = 'reminder-day';
      dayLabel.innerHTML = `<input type="checkbox" value="${day}"${existing?.daysOfWeek.includes(day) ? ' checked' : ''}><span>${label}</span>`;
      daysHost.appendChild(dayLabel);
    });
    const previewText = form.querySelector<HTMLElement>('.reminder-preview span')!;
    const getSelectedDays = () =>
      [...daysHost.querySelectorAll<HTMLInputElement>('input:checked')].map((input) =>
        Number(input.value)
      );
    const updateFields = (reactivate = false) => {
      const once = recurrenceInput.value === 'once';
      (form.querySelector('.reminder-date') as HTMLElement).style.display = once ? '' : 'none';
      (daysHost as HTMLElement).style.display =
        recurrenceInput.value === 'custom' ? 'flex' : 'none';
      dateInput.required = once;
      if (reactivate) {
        enabledInput.checked = true;
      }
      const nextTrigger = enabledInput.checked
        ? calculateNextTrigger(
            {
              time: timeInput.value,
              recurrence: recurrenceInput.value as ReminderRecurrence,
              date: once ? dateInput.value : null,
              daysOfWeek: getSelectedDays()
            },
            new Date()
          )
        : null;
      previewText.textContent = enabledInput.checked
        ? nextTrigger
          ? new Date(nextTrigger).toLocaleString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Escolha um horário futuro válido'
        : 'Lembrete pausado';
    };
    recurrenceInput.addEventListener('change', () => updateFields(true));
    timeInput.addEventListener('change', () => updateFields(true));
    dateInput.addEventListener('change', () => updateFields(true));
    enabledInput.addEventListener('change', () => updateFields(false));
    daysHost.addEventListener('change', () => updateFields(true));
    updateFields(false);
    const close = () => modal.remove();
    form.querySelector('.reminder-cancel')!.addEventListener('click', close);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const days = getSelectedDays();
      if (recurrenceInput.value === 'custom' && !days.length) {
        emit('toast', { message: 'Selecione pelo menos um dia da semana', type: 'error' });
        return;
      }
      const draft: ReminderDraft = {
        title: titleInput.value,
        description: descInput.value,
        time: timeInput.value,
        recurrence: recurrenceInput.value as ReminderRecurrence,
        date: recurrenceInput.value === 'once' ? dateInput.value : null,
        daysOfWeek: days,
        enabled: enabledInput.checked,
        preserveEnabled: true
      };
      try {
        await saveReminder(draft, existing?.id);
        close();
        await render();
        emit('toast', { message: 'Lembrete salvo', type: 'success' });
      } catch (error) {
        emit('toast', {
          message: error instanceof Error ? error.message : 'Não foi possível salvar',
          type: 'error'
        });
      }
    });
    modal.appendChild(form);
    container.appendChild(modal);
    window.setTimeout(() => titleInput.focus(), 0);
  };
  add.addEventListener('click', () => showForm());
  const onStorageChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (!container.isConnected) {
      chrome.storage.onChanged.removeListener(onStorageChanged);
      return;
    }
    if (areaName === 'local' && changes['atenaflow-reminders']) {
      void render();
    }
  };
  chrome.storage.onChanged.addListener(onStorageChanged);
  await render();
  return container;
}
