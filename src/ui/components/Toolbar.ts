/**
 * Toolbar.ts — Barra de ferramentas superior.
 *
 * Contém o título da aplicação e o botão "Novo Script".
 *
 * Referência: ARQUITETURA.md — Seção 6 (Componentes da Interface)
 */

import { emit } from '../../store/app-store';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg);
    flex-shrink: 0;
  }

  .toolbar__brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toolbar__logo {
    width: 22px;
    height: 22px;
    color: var(--color-primary);
  }

  .toolbar__title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: -0.01em;
  }

  .toolbar__actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toolbar__btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-primary);
    color: var(--color-primary-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    transition: background-color var(--transition-fast);
    white-space: nowrap;
  }

  .toolbar__btn:hover {
    background-color: var(--color-primary-hover);
  }

  .toolbar__btn svg {
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

/**
 * Cria a barra de ferramentas superior com o título e botão de novo script.
 */
export function createToolbar(): HTMLElement {
  injectStyles();

  const toolbar = document.createElement('header');
  toolbar.className = 'toolbar';

  // ─── Marca ─────────────────────────────────────────────────────────
  const brand = document.createElement('div');
  brand.className = 'toolbar__brand';

  const logo = document.createElement('div');
  logo.className = 'toolbar__logo';
  logo.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M16 13h-2"/></svg>`;
  brand.appendChild(logo);

  const title = document.createElement('span');
  title.className = 'toolbar__title';
  title.textContent = 'AtenaFlow';
  brand.appendChild(title);

  toolbar.appendChild(brand);

  // ─── Ações ─────────────────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'toolbar__actions';

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'toolbar__btn';
  settingsBtn.type = 'button';
  settingsBtn.setAttribute('aria-label', 'Configurações');
  settingsBtn.title = 'Configurações';
  settingsBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  settingsBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'settings' });
  });

  const statsBtn = document.createElement('button');
  statsBtn.className = 'toolbar__btn';
  statsBtn.type = 'button';
  statsBtn.setAttribute('aria-label', 'Estatísticas');
  statsBtn.title = 'Estatísticas';
  statsBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;
  statsBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'dashboard' });
  });

  const createBtn = document.createElement('button');
  createBtn.className = 'toolbar__btn';
  createBtn.type = 'button';
  createBtn.id = 'btn-new-script';
  createBtn.setAttribute('aria-label', 'Criar novo script');
  createBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;

  const btnText = document.createElement('span');
  btnText.textContent = 'Novo';
  createBtn.appendChild(btnText);

  createBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'editor', scriptId: null });
  });

  actions.appendChild(statsBtn);
  actions.appendChild(settingsBtn);
  actions.appendChild(createBtn);
  toolbar.appendChild(actions);

  return toolbar;
}
