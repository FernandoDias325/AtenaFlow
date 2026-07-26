/**
 * SearchBar.ts — Componente do campo de busca.
 *
 * Inclui ícone de lupa, botão para limpar (quando há texto),
 * e suporte a debounce. Intercepta o atalho '/' globalmente.
 *
 * Referência: ARQUITETURA.md — Fase 3
 */

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .search-container {
    padding: var(--space-3) var(--space-5);
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-box__icon {
    position: absolute;
    left: var(--space-3);
    color: var(--color-text-tertiary);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .search-box__input {
    width: 100%;
    padding: var(--space-2) var(--space-4);
    padding-left: calc(var(--space-3) * 2 + 16px);
    padding-right: calc(var(--space-3) * 2 + 16px);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .search-box__input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    background-color: var(--color-bg);
    box-shadow: 0 0 0 3px var(--color-primary-soft);
  }

  .search-box__input::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .search-box__input::placeholder {
    color: var(--color-text-tertiary);
  }

  .search-box__clear {
    position: absolute;
    right: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    color: var(--color-text-tertiary);
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: all var(--transition-fast);
  }

  .search-box__clear--visible {
    opacity: 1;
    pointer-events: auto;
  }

  .search-box__clear:hover {
    color: var(--color-text);
    background-color: var(--color-border);
  }

  .search-box__shortcut {
    position: absolute;
    right: var(--space-3);
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--color-text-tertiary);
    background-color: var(--color-border);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    pointer-events: none;
    transition: opacity var(--transition-fast);
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

// ─── Debounce ────────────────────────────────────────────────────────────────

function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ─── Componente ──────────────────────────────────────────────────────────────

export interface SearchBarOptions {
  onSearch: (query: string) => void;
  debounceMs?: number;
  initialValue?: string;
  placeholder?: string;
}

/**
 * Cria o componente de barra de busca.
 */
export function createSearchBar(options: SearchBarOptions): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'search-container';

  const box = document.createElement('div');
  box.className = 'search-box';

  // Ícone de Lupa
  const icon = document.createElement('div');
  icon.className = 'search-box__icon';
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
  box.appendChild(icon);

  // Input
  const input = document.createElement('input');
  input.className = 'search-box__input';
  input.type = 'search';
  input.placeholder = options.placeholder || 'Buscar scripts...';
  input.setAttribute('aria-label', options.placeholder || 'Buscar scripts');
  if (options.initialValue) {
    input.value = options.initialValue;
  }
  box.appendChild(input);

  // Badge do Atalho '/'
  const shortcut = document.createElement('div');
  shortcut.className = 'search-box__shortcut';
  shortcut.textContent = '/';
  box.appendChild(shortcut);

  // Botão Limpar
  const clearBtn = document.createElement('button');
  clearBtn.className = 'search-box__clear';
  if (options.initialValue) {
    clearBtn.classList.add('search-box__clear--visible');
  }
  clearBtn.type = 'button';
  clearBtn.setAttribute('aria-label', 'Limpar busca');
  clearBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  box.appendChild(clearBtn);

  container.appendChild(box);

  // ─── Lógica ────────────────────────────────────────────────────────

  if (options.initialValue) {
    shortcut.style.opacity = '0';
  }

  const handleSearch = debounce(() => {
    options.onSearch(input.value);
  }, options.debounceMs ?? 150);

  input.addEventListener('input', () => {
    const hasText = input.value.length > 0;

    if (hasText) {
      clearBtn.classList.add('search-box__clear--visible');
      shortcut.style.opacity = '0';
    } else {
      clearBtn.classList.remove('search-box__clear--visible');
      shortcut.style.opacity = '1';
    }

    handleSearch();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('search-box__clear--visible');
    shortcut.style.opacity = '1';
    input.focus();
    options.onSearch('');
  });

  // Listener global para o atalho '/'
  const onKeyDown = (e: KeyboardEvent) => {
    // Se não for a tecla '/' ou estiver pressionando ctrl/cmd
    if (e.key !== '/' || e.ctrlKey || e.metaKey) {
      return;
    }

    // Se o foco já estiver em um input/textarea, não interrompe
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        (active as HTMLElement).isContentEditable)
    ) {
      return;
    }

    e.preventDefault();
    input.focus();
  };

  document.addEventListener('keydown', onKeyDown);

  // Se o container for removido do DOM, limpamos o listener global
  // Usamos um MutationObserver simples no parent
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      document.removeEventListener('keydown', onKeyDown);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return container;
}
