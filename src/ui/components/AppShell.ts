/**
 * AppShell.ts — Container raiz da aplicação.
 *
 * Gerencia o roteamento entre views (Lista ↔ Editor) através do
 * sistema Pub/Sub. Monta e desmonta views automaticamente conforme
 * o evento 'view-changed' é emitido.
 *
 * Referência: ARQUITETURA.md — Seção 6 (AppShell)
 */

import { subscribe } from '../../store/app-store';
import type { ViewState } from '../../store/app-store';
import { createListView, refreshListView } from '../views/ListView';
import { createEditorView } from '../views/EditorView';
import { createCategoriesView } from '../views/CategoriesView';
import { createSettingsView } from '../views/SettingsView';
import { createTrashView } from '../views/TrashView';
import { createDashboardView } from '../views/DashboardView';
import { createLinksView } from '../views/LinksView';
import { createNotepadView } from '../views/NotepadView';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const STYLES = `
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: var(--bg-app, var(--color-bg));
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
 * Inicializa o AppShell e monta no elemento DOM fornecido.
 *
 * @param rootEl - Elemento raiz (#app) onde a aplicação será montada.
 * @returns Função de cleanup que remove listeners.
 */
export async function initAppShell(rootEl: HTMLElement): Promise<() => void> {
  injectStyles();

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  rootEl.appendChild(shell);

  /** Renderiza uma view dentro do shell. */
  async function renderView(state: ViewState): Promise<void> {
    // Limpa o conteúdo atual
    shell.innerHTML = '';

    switch (state.view) {
      case 'list': {
        const listView = await createListView();
        shell.appendChild(listView);
        break;
      }
      case 'editor': {
        const editorView = await createEditorView(state.scriptId);
        shell.appendChild(editorView);
        break;
      }
      case 'categories': {
        const catView = await createCategoriesView();
        shell.appendChild(catView);
        break;
      }
      case 'settings': {
        const settingsView = await createSettingsView();
        shell.appendChild(settingsView);
        break;
      }
      case 'trash': {
        const trashView = await createTrashView();
        shell.appendChild(trashView);
        break;
      }
      case 'dashboard': {
        const dashboardView = await createDashboardView();
        shell.appendChild(dashboardView);
        break;
      }
      case 'links': {
        const linksView = await createLinksView();
        shell.appendChild(linksView);
        break;
      }
      case 'notepad': {
        const notepadView = await createNotepadView();
        shell.appendChild(notepadView);
        break;
      }
    }
  }

  // Inscreve-se no evento de mudança de view
  const viewSub = subscribe('view-changed', async (state) => {
    // Se está voltando para a lista, faz refresh dos dados
    if (state.view === 'list') {
      await refreshListView();
    }
    await renderView(state);
  });

  // Renderiza a view inicial (lista)
  await renderView({ view: 'list' });

  // Retorna cleanup
  return () => {
    viewSub.unsubscribe();
    shell.innerHTML = '';
  };
}
