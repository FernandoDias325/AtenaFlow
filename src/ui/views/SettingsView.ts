/**
 * SettingsView.ts — Tela de configurações da extensão.
 *
 * Contém a seção de Dados e Backup (Exportação/Importação em JSON).
 *
 * Referência: ARQUITETURA.md — Fase 5
 */

import { emit } from '../../store/app-store';
import { exportBackup, importBackup } from '../../core/backup/backup.service';
import { DISABLED_SITES_KEY, normalizeSiteList } from '../../core/settings/site-access';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .settings-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .settings-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .settings-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .settings-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .settings-view__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .settings-view__content {
    flex: 1;
    padding: var(--space-4);
    overflow-y: auto;
    background: var(--color-bg-secondary);
  }

  .settings-section {
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-3);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .settings-section__title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .settings-section__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    list-style: none;
  }

  .settings-section__summary::-webkit-details-marker { display: none; }

  .settings-section__summary::after {
    content: '›';
    color: var(--color-text-tertiary);
    font-size: 20px;
    transform: rotate(90deg);
    transition: transform var(--transition-fast);
  }

  details[open] > .settings-section__summary::after { transform: rotate(-90deg); }

  .settings-section__summary .settings-section__title { margin: 0; }

  .settings-section__badge {
    margin-left: auto;
    margin-right: var(--space-3);
    padding: 2px 7px;
    border-radius: var(--radius-full);
    background: var(--color-bg-tertiary);
    color: var(--color-text-tertiary);
    font-size: 10px;
  }

  .settings-section__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-4);
    line-height: var(--line-height-base);
  }

  .settings-section__actions {
    display: flex;
    gap: var(--space-3);
  }

  .settings-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .settings-btn--outline {
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .settings-btn--outline:hover {
    background-color: var(--color-bg-tertiary);
  }

  .settings-btn--primary {
    background: var(--bg-primary);
    color: var(--color-primary-text);
    border: 1px solid var(--color-primary);
  }

  .settings-btn--primary:hover {
    background: var(--bg-primary-hover);
  }

  .settings-theme-btn[aria-pressed='true'] {
    background: var(--color-primary-soft) !important;
    box-shadow: inset 0 0 0 1px var(--color-primary);
  }

  .settings-sites-input {
    width: 100%;
    min-height: 68px;
    box-sizing: border-box;
    padding: var(--space-3);
    margin-bottom: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
  }

  .settings-data-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--color-border);
  }

  .settings-data-row:first-of-type { border-top: 0; }

  .settings-data-row__copy { flex: 1; min-width: 0; }
  .settings-data-row__title {
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    margin-bottom: 2px;
  }
  .settings-data-row__desc {
    color: var(--color-text-tertiary);
    font-size: 11px;
    line-height: 1.35;
  }
  .settings-data-row .settings-section__actions { flex-shrink: 0; }
  .settings-data-row .settings-btn { padding: var(--space-2) var(--space-3); }
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

export async function createSettingsView(): Promise<HTMLElement> {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'settings-view';

  // ─── Header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'settings-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'settings-view__back-btn';
  backBtn.setAttribute('aria-label', 'Voltar para scripts');
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  header.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'settings-view__title';
  title.textContent = 'Configurações';
  header.appendChild(title);

  container.appendChild(header);

  // ─── Conteúdo ──────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'settings-view__content';

  // Seção: Lixeira / Workspace
  const trashSection = document.createElement('div');
  trashSection.className = 'settings-section';

  const trashTitle = document.createElement('h3');
  trashTitle.className = 'settings-section__title';
  trashTitle.textContent = 'Lixeira';
  trashSection.appendChild(trashTitle);

  const trashDesc = document.createElement('p');
  trashDesc.className = 'settings-section__desc';
  trashDesc.textContent =
    'Visualize e restaure scripts que foram apagados acidentalmente, ou esvazie a lixeira para liberar espaço.';
  trashSection.appendChild(trashDesc);

  const trashActions = document.createElement('div');
  trashActions.className = 'settings-section__actions';

  const openTrashBtn = document.createElement('button');
  openTrashBtn.className = 'settings-btn settings-btn--outline';
  openTrashBtn.style.borderColor = 'var(--color-error)';
  openTrashBtn.style.color = 'var(--color-error)';
  openTrashBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Acessar Lixeira`;
  openTrashBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'trash' });
  });

  trashActions.appendChild(openTrashBtn);
  trashSection.appendChild(trashActions);

  // Seção: Aparência
  const themeSection = document.createElement('div');
  themeSection.className = 'settings-section';

  const themeTitle = document.createElement('h3');
  themeTitle.className = 'settings-section__title';
  themeTitle.textContent = 'Aparência e Cores';
  themeSection.appendChild(themeTitle);

  const themeDesc = document.createElement('p');
  themeDesc.className = 'settings-section__desc';
  themeDesc.textContent =
    'Personalize as cores e o tema da extensão para combinar com o seu estilo.';
  themeSection.appendChild(themeDesc);

  const themeGrid = document.createElement('div');
  themeGrid.style.display = 'flex';
  themeGrid.style.gap = 'var(--space-3)';
  themeGrid.style.flexWrap = 'wrap';

  const currentTheme = localStorage.getItem('atenaflow-theme') || 'light';

  const themes = [
    { id: 'light', name: 'Claro', color: 'hsl(230, 65%, 55%)', bg: 'hsl(40, 15%, 98%)' },
    { id: 'dark', name: 'Escuro', color: 'hsl(230, 70%, 65%)', bg: 'hsl(220, 14%, 12%)' },
    {
      id: 'purple-gradient',
      name: 'Roxo Místico',
      color: 'linear-gradient(135deg, hsl(260, 80%, 65%), hsl(290, 80%, 60%))',
      bg: 'hsl(260, 15%, 11%)'
    },
    {
      id: 'pink-gradient',
      name: 'Rosa Vibrante',
      color: 'linear-gradient(135deg, hsl(320, 80%, 60%), hsl(350, 80%, 60%))',
      bg: 'hsl(340, 45%, 96%)'
    },
    {
      id: 'ocean-gradient',
      name: 'Azul Oceano',
      color: 'linear-gradient(135deg, hsl(190, 85%, 50%), hsl(220, 85%, 55%))',
      bg: 'hsl(210, 20%, 10%)'
    },
    {
      id: 'emerald-gradient',
      name: 'Verde Esmeralda',
      color: 'linear-gradient(135deg, hsl(145, 80%, 42%), hsl(175, 80%, 38%))',
      bg: 'hsl(150, 30%, 96%)'
    },
    {
      id: 'sunset-gradient',
      name: 'Âmbar Solar',
      color: 'linear-gradient(135deg, hsl(35, 95%, 55%), hsl(10, 90%, 60%))',
      bg: 'hsl(30, 40%, 96%)'
    },
    {
      id: 'crimson-gradient',
      name: 'Carmim',
      color: 'linear-gradient(135deg, hsl(350, 85%, 55%), hsl(15, 85%, 50%))',
      bg: 'hsl(350, 15%, 11%)'
    }
  ];

  themes.forEach((theme) => {
    const btn = document.createElement('button');
    btn.className = 'settings-theme-btn';
    btn.setAttribute('aria-pressed', String(currentTheme === theme.id));
    btn.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      border: 2px solid ${currentTheme === theme.id ? 'var(--color-primary)' : 'var(--color-border)'};
      background-color: var(--color-bg);
      cursor: pointer;
      transition: all var(--transition-fast);
      width: calc(50% - 6px);
    `;

    const circle = document.createElement('div');

    // Check if theme.color is a gradient or a solid color
    // If it's a gradient, we can just use the solid base color for the split, or just use the gradient as the bottom half.
    // An elegant way is to use a container with overflow hidden and two halves.
    circle.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      position: relative;
      overflow: hidden;
      background: ${theme.bg};
      flex-shrink: 0;
    `;

    const accentHalf = document.createElement('div');
    accentHalf.style.cssText = `
      position: absolute;
      bottom: 0;
      right: 0;
      width: 100%;
      height: 100%;
      background: ${theme.color};
      clip-path: polygon(100% 0, 100% 100%, 0 100%);
    `;

    circle.appendChild(accentHalf);

    const label = document.createElement('span');
    label.textContent = theme.name;
    label.style.fontSize = 'var(--font-size-xs)';
    label.style.fontWeight =
      currentTheme === theme.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)';
    label.style.color =
      currentTheme === theme.id ? 'var(--color-text)' : 'var(--color-text-secondary)';
    label.style.textAlign = 'left';

    btn.appendChild(circle);
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', theme.id);
      localStorage.setItem('atenaflow-theme', theme.id);
      chrome.storage.local.set({ 'atenaflow-theme': theme.id });

      // Update UI state
      Array.from(themeGrid.children).forEach((child) => {
        (child as HTMLElement).style.borderColor = 'var(--color-border)';
        child.setAttribute('aria-pressed', 'false');
        (child.querySelector('span') as HTMLElement).style.fontWeight = 'var(--font-weight-medium)';
        (child.querySelector('span') as HTMLElement).style.color = 'var(--color-text-secondary)';
      });
      btn.style.borderColor = 'var(--color-primary)';
      btn.setAttribute('aria-pressed', 'true');
      label.style.fontWeight = 'var(--font-weight-semibold)';
      label.style.color = 'var(--color-text)';
    });

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      if (localStorage.getItem('atenaflow-theme') !== theme.id) {
        btn.style.borderColor = 'var(--color-border-hover)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (localStorage.getItem('atenaflow-theme') !== theme.id) {
        btn.style.borderColor = 'var(--color-border)';
      }
    });

    themeGrid.appendChild(btn);
  });

  themeSection.appendChild(themeGrid);
  content.appendChild(themeSection);

  // Seção: sites onde a integração fica desativada
  const sitesSection = document.createElement('details');
  sitesSection.className = 'settings-section';
  const sitesSummary = document.createElement('summary');
  sitesSummary.className = 'settings-section__summary';
  const sitesTitle = document.createElement('h3');
  sitesTitle.className = 'settings-section__title';
  sitesTitle.textContent = 'Botão flutuante por site';
  const sitesDesc = document.createElement('p');
  sitesDesc.className = 'settings-section__desc';
  sitesDesc.textContent =
    'Informe um domínio por linha para ocultar o botão flutuante nele e em seus subdomínios.';
  const sitesInput = document.createElement('textarea');
  sitesInput.className = 'settings-sites-input';
  sitesInput.setAttribute('aria-label', 'Sites com botão flutuante desativado');
  sitesInput.placeholder = 'exemplo.com\nbanco.com.br';
  const storedSites = await chrome.storage.local.get(DISABLED_SITES_KEY);
  const initialSites = normalizeSiteList(storedSites[DISABLED_SITES_KEY] ?? []);
  sitesInput.value = initialSites.join('\n');
  const sitesBadge = document.createElement('span');
  sitesBadge.className = 'settings-section__badge';
  sitesBadge.textContent = initialSites.length
    ? `${initialSites.length} bloqueado(s)`
    : 'Todos ativos';
  sitesSummary.append(sitesTitle, sitesBadge);
  const saveSitesBtn = document.createElement('button');
  saveSitesBtn.className = 'settings-btn settings-btn--primary';
  saveSitesBtn.textContent = 'Salvar sites';
  saveSitesBtn.addEventListener('click', async () => {
    const sites = normalizeSiteList(sitesInput.value.split(/\r?\n|,/));
    sitesInput.value = sites.join('\n');
    sitesBadge.textContent = sites.length ? `${sites.length} bloqueado(s)` : 'Todos ativos';
    await chrome.storage.local.set({ [DISABLED_SITES_KEY]: sites });
    emit('toast', { message: 'Preferências de sites atualizadas', type: 'success' });
  });
  sitesSection.append(sitesSummary, sitesDesc, sitesInput, saveSitesBtn);
  content.appendChild(sitesSection);

  // Seção: Backup
  const backupSection = document.createElement('div');
  backupSection.className = 'settings-section';

  const backupTitle = document.createElement('h3');
  backupTitle.className = 'settings-section__title';
  backupTitle.textContent = 'Backup de Dados';
  backupSection.appendChild(backupTitle);

  const backupDesc = document.createElement('p');
  backupDesc.className = 'settings-section__desc';
  backupDesc.textContent =
    'Exporte seus scripts, links e categorias para um arquivo seguro, ou importe de um arquivo existente. A importação irá mesclar os dados, preservando os itens que você já possui.';
  backupSection.appendChild(backupDesc);

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'settings-section__actions';

  // Botão Exportar
  const exportBtn = document.createElement('button');
  exportBtn.className = 'settings-btn settings-btn--outline';
  exportBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Exportar`;
  exportBtn.addEventListener('click', async () => {
    try {
      await exportBackup();
      emit('toast', { message: 'Backup exportado com sucesso', type: 'success' });
    } catch (e) {
      console.error(e);
      emit('toast', { message: 'Erro ao exportar backup', type: 'error' });
    }
  });

  // Botão Importar (usa input file oculto)
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json';
  importInput.style.display = 'none';

  importInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const result = evt.target?.result;
      if (typeof result !== 'string') {
        return;
      }

      try {
        await importBackup(result);
        emit('toast', { message: 'Backup importado com sucesso!', type: 'success' });
        // Reseta o input para permitir importar o mesmo arquivo
        importInput.value = '';
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Falha ao importar';
        emit('toast', { message: errorMsg, type: 'error' });
      }
    };
    reader.readAsText(file);
  });

  const importBtn = document.createElement('button');
  importBtn.className = 'settings-btn settings-btn--primary';
  importBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> Importar`;
  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  actionsContainer.appendChild(exportBtn);
  actionsContainer.appendChild(importBtn);
  actionsContainer.appendChild(importInput);
  backupSection.appendChild(actionsContainer);

  // Agrupa as ações de manutenção para reduzir a rolagem.
  const dataSection = document.createElement('section');
  dataSection.className = 'settings-section';
  const dataTitle = document.createElement('h3');
  dataTitle.className = 'settings-section__title';
  dataTitle.textContent = 'Dados e segurança';
  const dataDesc = document.createElement('p');
  dataDesc.className = 'settings-section__desc';
  dataDesc.textContent = 'Gerencie itens apagados e mantenha uma cópia segura dos seus dados.';
  dataSection.append(dataTitle, dataDesc);

  trashSection.className = 'settings-data-row';
  trashTitle.className = 'settings-data-row__title';
  trashDesc.className = 'settings-data-row__desc';
  trashDesc.textContent = 'Restaure ou exclua definitivamente scripts e links.';
  const trashCopy = document.createElement('div');
  trashCopy.className = 'settings-data-row__copy';
  trashCopy.append(trashTitle, trashDesc);
  trashSection.replaceChildren(trashCopy, trashActions);

  backupSection.className = 'settings-data-row';
  backupTitle.className = 'settings-data-row__title';
  backupTitle.textContent = 'Backup';
  backupDesc.className = 'settings-data-row__desc';
  backupDesc.textContent = 'Exporte ou importe scripts, links e categorias.';
  const backupCopy = document.createElement('div');
  backupCopy.className = 'settings-data-row__copy';
  backupCopy.append(backupTitle, backupDesc);
  backupSection.replaceChildren(backupCopy, actionsContainer);

  dataSection.append(trashSection, backupSection);
  content.appendChild(dataSection);
  container.appendChild(content);

  return container;
}
