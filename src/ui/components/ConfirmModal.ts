/**
 * ConfirmModal.ts — Modal de confirmação para ações destrutivas.
 *
 * Bloqueia a interface até o usuário confirmar ou cancelar.
 * Previne exclusões acidentais, conforme requisito de segurança.
 *
 * Referência: ARQUITETURA.md — Seção 1.3 (Segurança contra ação destrutiva)
 */

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--color-overlay);
    z-index: var(--z-modal-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: modal-fade-in var(--transition-base) ease;
  }

  .modal {
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    padding: var(--space-6);
    max-width: 380px;
    width: 90%;
    z-index: var(--z-modal);
    animation: modal-scale-in var(--transition-base) ease;
  }

  .modal__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .modal__message {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
    margin-bottom: var(--space-6);
  }

  .modal__actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  .modal__btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .modal__btn--cancel {
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .modal__btn--cancel:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .modal__btn--confirm {
    background-color: var(--color-error);
    color: white;
    border: 1px solid var(--color-error);
  }

  .modal__btn--confirm:hover {
    background-color: var(--color-error-soft);
    color: var(--color-error);
  }

  .modal--exit .modal-backdrop,
  .modal--exit .modal {
    animation: modal-fade-out var(--transition-fast) ease forwards;
  }

  @keyframes modal-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modal-scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes modal-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

// ─── Injeção de estilos ──────────────────────────────────────────────────────

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

// ─── Interface pública ───────────────────────────────────────────────────────

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Exibe um modal de confirmação e retorna uma Promise
 * que resolve `true` se confirmado, `false` se cancelado.
 *
 * O modal é destruído automaticamente após a interação.
 * Suporta Escape para cancelar e foco automático no botão de cancelar
 * (prevenção contra cliques acidentais no botão destrutivo).
 */
export function showConfirmModal(options: ConfirmModalOptions): Promise<boolean> {
  injectStyles();

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'modal-title');
    backdrop.setAttribute('aria-describedby', 'modal-message');

    const modal = document.createElement('div');
    modal.className = 'modal';

    // Título
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal__title';
    titleEl.id = 'modal-title';
    titleEl.textContent = options.title;
    modal.appendChild(titleEl);

    // Mensagem
    const messageEl = document.createElement('p');
    messageEl.className = 'modal__message';
    messageEl.id = 'modal-message';
    messageEl.textContent = options.message;
    modal.appendChild(messageEl);

    // Ações
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal__btn modal__btn--cancel';
    cancelBtn.textContent = options.cancelLabel ?? 'Cancelar';
    cancelBtn.type = 'button';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal__btn modal__btn--confirm';
    confirmBtn.textContent = options.confirmLabel ?? 'Excluir';
    confirmBtn.type = 'button';

    actionsEl.appendChild(cancelBtn);
    actionsEl.appendChild(confirmBtn);
    modal.appendChild(actionsEl);
    backdrop.appendChild(modal);

    // ─── Handlers ────────────────────────────────────────────────────

    function close(result: boolean): void {
      backdrop.classList.add('modal--exit');
      backdrop.addEventListener('animationend', () => {
        backdrop.remove();
        document.removeEventListener('keydown', onKeyDown);
        resolve(result);
      }, { once: true });

      // Fallback caso a animação não dispare
      setTimeout(() => {
        if (document.body.contains(backdrop)) {
          backdrop.remove();
          document.removeEventListener('keydown', onKeyDown);
          resolve(result);
        }
      }, 300);
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
    }

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        close(false);
      }
    });
    document.addEventListener('keydown', onKeyDown);

    // ─── Montar ──────────────────────────────────────────────────────

    document.body.appendChild(backdrop);

    // Foco no cancelar por segurança (o usuário precisa ir ativamente até "Excluir")
    cancelBtn.focus();
  });
}
