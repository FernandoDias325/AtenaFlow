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
    padding: 14px var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-bg) 82%, transparent);
    backdrop-filter: blur(14px);
    flex-shrink: 0;
  }

  .toolbar__brand {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .toolbar__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 6px;
    color: var(--color-primary-text);
    background: var(--bg-primary);
    border-radius: 10px;
    box-shadow: 0 5px 14px color-mix(in srgb, var(--color-primary) 30%, transparent);
    box-sizing: border-box;
  }

  .toolbar__logo svg {
    width: 100%;
    height: 100%;
  }

  .toolbar__title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    letter-spacing: -0.025em;
  }

  .toolbar__actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }

  .toolbar__nav {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding: 2px;
    border: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-bg-secondary) 72%, transparent);
    flex-shrink: 0;
  }

  .toolbar__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: 36px;
    padding: var(--space-2) 13px;
    background: var(--bg-primary);
    color: #fff;
    border-radius: 10px;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    box-shadow: 0 5px 14px color-mix(in srgb, var(--color-primary) 24%, transparent);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    border: none;
    cursor: pointer;
    white-space: nowrap;
  }

  .toolbar__btn:hover {
    background: var(--bg-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--color-primary) 34%, transparent);
  }

  .toolbar__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 29px;
    background-color: transparent;
    color: var(--color-text-secondary);
    border-radius: 7px;
    transition: all var(--transition-fast);
    border: none;
    cursor: pointer;
  }

  .toolbar__icon-btn:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-primary);
  }

  .toolbar__btn svg, .toolbar__icon-btn svg {
    flex-shrink: 0;
  }

  /* Compensa diferenças de escala do Windows e da moldura da janela. */
  @media (max-width: 355px) {
    .toolbar { padding-inline: 10px; }
    .toolbar__actions { gap: 5px; }
    .toolbar__btn { width: 36px; padding-inline: 0; }
    .toolbar__btn span { display: none; }
    .toolbar__icon-btn { width: 27px; height: 27px; }
  }

  @media (max-width: 305px) {
    .toolbar__title { display: none; }
    .toolbar__brand { gap: 0; }
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
  logo.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.002 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`;
  brand.appendChild(logo);

  const title = document.createElement('span');
  title.className = 'toolbar__title';
  title.textContent = 'AtenaFlow';
  brand.appendChild(title);

  toolbar.appendChild(brand);

  // ─── Ações ─────────────────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'toolbar__actions';

  const nav = document.createElement('div');
  nav.className = 'toolbar__nav';
  nav.setAttribute('aria-label', 'Navegação rápida');

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'toolbar__icon-btn';
  settingsBtn.type = 'button';
  settingsBtn.setAttribute('aria-label', 'Configurações');
  settingsBtn.title = 'Configurações';
  settingsBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  settingsBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'settings' });
  });

  const statsBtn = document.createElement('button');
  statsBtn.className = 'toolbar__icon-btn';
  statsBtn.type = 'button';
  statsBtn.setAttribute('aria-label', 'Estatísticas');
  statsBtn.title = 'Estatísticas';
  statsBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;
  statsBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'dashboard' });
  });

  const linksBtn = document.createElement('button');
  linksBtn.className = 'toolbar__icon-btn';
  linksBtn.type = 'button';
  linksBtn.setAttribute('aria-label', 'Links Úteis');
  linksBtn.title = 'Links Úteis';
  linksBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  linksBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'links' });
  });

  const notepadBtn = document.createElement('button');
  notepadBtn.className = 'toolbar__icon-btn';
  notepadBtn.type = 'button';
  notepadBtn.setAttribute('aria-label', 'Bloco de Notas');
  notepadBtn.title = 'Bloco de Notas';
  notepadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/></svg>`;
  notepadBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'notepad' });
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

  nav.appendChild(notepadBtn);
  nav.appendChild(linksBtn);
  nav.appendChild(statsBtn);
  nav.appendChild(settingsBtn);
  actions.appendChild(nav);
  actions.appendChild(createBtn);
  toolbar.appendChild(actions);

  return toolbar;
}
