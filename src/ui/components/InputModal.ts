const STYLES = `
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background-color: var(--color-overlay);
  }
  .modal {
    width: 100%;
    max-width: 340px;
    box-sizing: border-box;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-bg);
    box-shadow: var(--shadow-xl);
  }
  .modal__title {
    margin: 0 0 var(--space-2);
    color: var(--color-text);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }
  .modal__message {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
  }
  .modal__actions { display: flex; justify-content: flex-end; gap: var(--space-3); }
  .modal__btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .modal__btn--cancel {
    border: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }
  .modal__btn--cancel:hover { background-color: var(--color-bg-tertiary); color: var(--color-text); }
  .input-modal__field {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-3);
    margin: var(--space-2) 0 var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-sm);
  }
  .input-modal__field:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }
  .input-modal__confirm {
    background: var(--bg-primary);
    color: var(--color-primary-text);
    border: 1px solid var(--color-primary);
  }
  .input-modal__confirm:hover { background: var(--bg-primary-hover); }
`;

let styleInjected = false;

export interface InputModalOptions {
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  initialValue?: string;
}

export function showInputModal(options: InputModalOptions): Promise<string | null> {
  if (!styleInjected) {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    styleInjected = true;
  }

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal';
    const title = document.createElement('h2');
    title.className = 'modal__title';
    title.textContent = options.title;
    const message = document.createElement('p');
    message.className = 'modal__message';
    message.style.marginBottom = '0';
    message.textContent = options.message;
    const input = document.createElement('input');
    input.className = 'input-modal__field';
    input.type = 'text';
    input.placeholder = options.placeholder ?? '';
    input.value = options.initialValue ?? '';
    input.setAttribute('aria-label', options.title);

    const actions = document.createElement('div');
    actions.className = 'modal__actions';
    const cancel = document.createElement('button');
    cancel.className = 'modal__btn modal__btn--cancel';
    cancel.type = 'button';
    cancel.textContent = 'Cancelar';
    const confirm = document.createElement('button');
    confirm.className = 'modal__btn input-modal__confirm';
    confirm.type = 'button';
    confirm.textContent = options.confirmLabel ?? 'Inserir';
    actions.append(cancel, confirm);
    modal.append(title, message, input, actions);
    backdrop.appendChild(modal);

    let closed = false;
    const close = (value: string | null) => {
      if (closed) {
        return;
      }
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(value);
    };
    const submit = () => {
      const value = input.value.trim();
      if (value) {
        close(value);
      } else {
        input.focus();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close(null);
      }
      if (event.key === 'Enter') {
        submit();
      }
    };
    cancel.addEventListener('click', () => close(null));
    confirm.addEventListener('click', submit);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        close(null);
      }
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(backdrop);
    input.focus();
  });
}
