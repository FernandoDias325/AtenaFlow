/**
 * ToastNotification.ts — Componente de notificação temporária.
 *
 * Exibe feedback visual flutuante ("Copiado!", "Salvo", etc.)
 * que desaparece automaticamente após um tempo configurável.
 *
 * Referência: ARQUITETURA.md — Seção 6 (Componentes da Interface)
 */

import { subscribe } from '../../store/app-store';
import type { ToastPayload } from '../../store/app-store';

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_DURATION_MS = 2000;

// ─── Ícones SVG (Lucide) ─────────────────────────────────────────────────────

const ICONS: Record<ToastPayload['type'], string> = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
};

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    animation: toast-in var(--transition-slow) ease forwards;
    max-width: 320px;
  }

  .toast--success {
    background-color: var(--color-success-soft);
    color: var(--color-success);
    border: 1px solid var(--color-success);
  }

  .toast--error {
    background-color: var(--color-error-soft);
    color: var(--color-error);
    border: 1px solid var(--color-error);
  }

  .toast--info {
    background-color: var(--color-info-soft);
    color: var(--color-info);
    border: 1px solid var(--color-info);
  }

  .toast--exit {
    animation: toast-out var(--transition-base) ease forwards;
  }

  .toast__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .toast__message {
    flex: 1;
    line-height: var(--line-height-tight);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes toast-out {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-4px) scale(0.96);
    }
  }
`;

// ─── Componente ──────────────────────────────────────────────────────────────

let containerEl: HTMLElement | null = null;
let styleInjected = false;

/** Injeta os estilos do toast no <head> (uma única vez). */
function injectStyles(): void {
  if (styleInjected) {
    return;
  }
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

/** Retorna (ou cria) o container fixo dos toasts. */
function getContainer(): HTMLElement {
  if (containerEl && document.body.contains(containerEl)) {
    return containerEl;
  }
  containerEl = document.createElement('div');
  containerEl.className = 'toast-container';
  containerEl.setAttribute('role', 'status');
  containerEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(containerEl);
  return containerEl;
}

/** Exibe um toast individual. */
function showToast(payload: ToastPayload): void {
  injectStyles();
  const container = getContainer();
  const duration = payload.durationMs ?? DEFAULT_DURATION_MS;

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast--${payload.type}`;

  // Ícone
  const iconEl = document.createElement('span');
  iconEl.className = 'toast__icon';
  iconEl.innerHTML = ICONS[payload.type];
  toastEl.appendChild(iconEl);

  // Mensagem
  const msgEl = document.createElement('span');
  msgEl.className = 'toast__message';
  msgEl.textContent = payload.message;
  toastEl.appendChild(msgEl);

  container.appendChild(toastEl);

  // Auto-remoção após a duração
  setTimeout(() => {
    toastEl.classList.add('toast--exit');

    // Tenta remover via evento de animação
    toastEl.addEventListener(
      'animationend',
      () => {
        toastEl.remove();
      },
      { once: true }
    );

    // Fallback de segurança para garantir remoção da DOM caso a animação falhe (ex: aba oculta)
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        toastEl.remove();
      }
    }, 500); // 500ms é o tempo suficiente para a animação de saída terminar
  }, duration);
}

/**
 * Inicializa o sistema de toasts.
 * Inscreve-se no evento 'toast' do store para exibir notificações automaticamente.
 *
 * @returns Função de cleanup que remove o listener.
 */
export function initToastSystem(): () => void {
  const sub = subscribe('toast', showToast);
  return sub.unsubscribe;
}
