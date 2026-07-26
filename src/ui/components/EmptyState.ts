/**
 * EmptyState.ts — Tela de estado vazio.
 *
 * Exibida quando não há scripts cadastrados. Fornece um CTA claro
 * para criar o primeiro script, nunca deixando o usuário sem ação.
 *
 * Referência: ARQUITETURA.md — Seção 6 (EmptyState)
 */

// ─── Ícone SVG (Lucide: FileText) ────────────────────────────────────────────

const ICON_FILE_TEXT = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M16 13h-2"/></svg>`;

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-12) var(--space-6);
    flex: 1;
    gap: var(--space-4);
  }

  .empty-state__icon {
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-2);
  }

  .empty-state__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .empty-state__description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    max-width: 280px;
    line-height: var(--line-height-base);
  }

  .empty-state__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--bg-primary);
    color: var(--color-primary-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast);
    margin-top: var(--space-2);
  }

  .empty-state__btn:hover {
    background: var(--bg-primary-hover);
  }

  .empty-state__btn svg {
    flex-shrink: 0;
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

// ─── Componente ──────────────────────────────────────────────────────────────

export interface EmptyStateOptions {
  onCreateFirst: () => void;
}

/**
 * Cria o elemento de estado vazio com CTA para criar o primeiro script.
 */
export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'empty-state';

  // Ícone decorativo
  const iconEl = document.createElement('div');
  iconEl.className = 'empty-state__icon';
  iconEl.innerHTML = ICON_FILE_TEXT;
  container.appendChild(iconEl);

  // Título
  const titleEl = document.createElement('h2');
  titleEl.className = 'empty-state__title';
  titleEl.textContent = 'Nenhum script ainda';
  container.appendChild(titleEl);

  // Descrição
  const descEl = document.createElement('p');
  descEl.className = 'empty-state__description';
  descEl.textContent =
    'Crie seu primeiro script de atendimento e tenha tudo organizado em um só lugar.';
  container.appendChild(descEl);

  // Botão CTA
  const btnEl = document.createElement('button');
  btnEl.className = 'empty-state__btn';
  btnEl.type = 'button';
  btnEl.setAttribute('aria-label', 'Criar primeiro script');
  btnEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;

  const btnText = document.createElement('span');
  btnText.textContent = 'Criar primeiro script';
  btnEl.appendChild(btnText);

  btnEl.addEventListener('click', options.onCreateFirst);
  container.appendChild(btnEl);

  return container;
}
