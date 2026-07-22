/**
 * SettingsView.ts — Tela de configurações da extensão.
 *
 * Contém a seção de Dados e Backup (Exportação/Importação em JSON).
 *
 * Referência: ARQUITETURA.md — Fase 5
 */

import { emit } from '../../store/app-store';
import { exportBackup, importBackup } from '../../core/backup/backup.service';

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
    padding: var(--space-5);
    overflow-y: auto;
  }

  .settings-section {
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .settings-section__title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-bottom: var(--space-2);
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
    background-color: var(--color-primary);
    color: var(--color-primary-text);
    border: 1px solid var(--color-primary);
  }

  .settings-btn--primary:hover {
    background-color: var(--color-primary-hover);
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

export async function createSettingsView(): Promise<HTMLElement> {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'settings-view';

  // ─── Header ────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'settings-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'settings-view__back-btn';
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
  themeTitle.textContent = 'Aparência';
  themeSection.appendChild(themeTitle);

  const themeDesc = document.createElement('p');
  themeDesc.className = 'settings-section__desc';
  themeDesc.textContent = 'Alterne entre o tema claro e escuro.';
  themeSection.appendChild(themeDesc);

  const currentTheme = localStorage.getItem('atenaflow-theme') || 'light';

  const themeBtn = document.createElement('button');
  themeBtn.className = 'settings-btn settings-btn--outline';
  // Configura ícone baseado no tema atual
  const setBtnIcon = (theme: string) => {
    if (theme === 'dark') {
      themeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> Mudar para Claro`;
    } else {
      themeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Mudar para Escuro`;
    }
  };
  setBtnIcon(currentTheme);

  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('atenaflow-theme', newTheme);
    setBtnIcon(newTheme);
  });

  themeSection.appendChild(themeBtn);
  content.appendChild(themeSection);

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
      } catch (err: any) {
        emit('toast', { message: err.message || 'Falha ao importar', type: 'error' });
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

  content.appendChild(trashSection);
  content.appendChild(backupSection);
  container.appendChild(content);

  return container;
}
