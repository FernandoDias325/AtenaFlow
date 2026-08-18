import type { Reminder } from '../reminders/reminder.types';

type ReminderAction = 'COMPLETE_REMINDER' | 'SNOOZE_REMINDER' | 'DISMISS_REMINDER';

const THEMES: Record<string, { primary: string; surface: string; text: string; muted: string }> = {
  light: { primary: '#596fe8', surface: '#ffffff', text: '#182033', muted: '#667085' },
  dark: { primary: '#7889f4', surface: '#171a24', text: '#f4f5f8', muted: '#abb1c0' },
  'purple-gradient': { primary: '#a45ee8', surface: '#21172a', text: '#faf5ff', muted: '#c9b8d4' },
  'pink-gradient': { primary: '#d93d8f', surface: '#fff5fa', text: '#361426', muted: '#80576b' },
  'ocean-gradient': { primary: '#23a8d8', surface: '#10232d', text: '#f1fbff', muted: '#a9c4cf' },
  'emerald-gradient': { primary: '#24a86b', surface: '#f3fff8', text: '#133526', muted: '#587568' },
  'sunset-gradient': { primary: '#ef7b2d', surface: '#fff9f1', text: '#3b2113', muted: '#806453' },
  'crimson-gradient': { primary: '#db3f58', surface: '#29151a', text: '#fff5f6', muted: '#d0adb3' }
};

export interface ReminderAlertController {
  enqueue: (reminder: Reminder) => void;
  destroy: () => void;
}

export function createReminderAlertController(
  sendAction: (action: ReminderAction, reminderId: string) => Promise<unknown>,
  durationMs = 10_000
): ReminderAlertController {
  const queue: Reminder[] = [];
  let currentHost: HTMLElement | null = null;
  let timeoutId: number | null = null;
  let preparing = false;

  const closeVisual = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    currentHost?.remove();
    currentHost = null;
    timeoutId = null;
    showNext();
  };

  const showNext = async () => {
    if (currentHost || preparing || !queue.length || document.visibilityState === 'hidden') {
      return;
    }
    preparing = true;
    const reminder = queue.shift()!;
    const stored = await chrome.storage.local.get('atenaflow-theme');
    const colors = THEMES[String(stored['atenaflow-theme'] ?? 'light')] ?? THEMES['light']!;
    const host = document.createElement('div');
    host.setAttribute('data-atenaflow-reminder', reminder.id);
    host.style.cssText = 'all:initial;position:fixed;top:18px;right:18px;z-index:2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box} .card{width:min(340px,calc(100vw - 36px));padding:15px;border:1px solid color-mix(in srgb,${colors.primary} 35%,transparent);border-radius:14px;background:${colors.surface};color:${colors.text};font:13px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 16px 42px rgba(0,0,0,.24);animation:in .22s ease-out;overflow:hidden}
        .head{display:flex;align-items:center;gap:8px}.bell{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:${colors.primary};color:#fff}.label{font-size:10px;font-weight:700;letter-spacing:.06em;color:${colors.primary}}.close{margin-left:auto;border:0;background:transparent;color:${colors.muted};font-size:20px;line-height:1;cursor:pointer}.title{margin:9px 0 3px;font-size:15px;font-weight:700}.description{margin:0 0 12px;color:${colors.muted};white-space:pre-wrap}.actions{display:flex;gap:7px}.actions button{padding:7px 10px;border-radius:8px;border:1px solid ${colors.primary};font:600 11px system-ui;cursor:pointer}.complete{background:${colors.primary};color:#fff}.snooze{background:transparent;color:${colors.primary}}.progress{height:3px;margin:13px -15px -15px;background:${colors.primary};transform-origin:left;animation:progress ${durationMs}ms linear forwards}@keyframes in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}@keyframes progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}@media(prefers-reduced-motion:reduce){.card{animation:none}}
      </style>
      <section class="card" role="status" aria-live="polite">
        <div class="head"><span class="bell">♢</span><span class="label">LEMBRETE ATENAFLOW</span><button class="close" aria-label="Fechar">×</button></div>
        <div class="title"></div><p class="description"></p>
        <div class="actions"><button class="complete">Concluir</button><button class="snooze">Adiar 5 min</button></div><div class="progress"></div>
      </section>`;
    shadow.querySelector('.title')!.textContent = reminder.title;
    const description = shadow.querySelector<HTMLElement>('.description')!;
    description.textContent = reminder.description || 'Este lembrete está programado para agora.';
    const act = async (action: ReminderAction) => {
      await sendAction(action, reminder.id).catch(() => undefined);
      closeVisual();
    };
    shadow.querySelector('.close')!.addEventListener('click', () => void act('DISMISS_REMINDER'));
    shadow
      .querySelector('.complete')!
      .addEventListener('click', () => void act('COMPLETE_REMINDER'));
    shadow.querySelector('.snooze')!.addEventListener('click', () => void act('SNOOZE_REMINDER'));
    document.documentElement.appendChild(host);
    currentHost = host;
    preparing = false;
    timeoutId = window.setTimeout(closeVisual, durationMs);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void showNext();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return {
    enqueue(reminder) {
      if (
        !queue.some((item) => item.id === reminder.id) &&
        currentHost?.dataset.atenaflowReminder !== reminder.id
      ) {
        queue.push(reminder);
        void showNext();
      }
    },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibility);
      queue.length = 0;
      closeVisual();
    }
  };
}
