/**
 * main.ts — Ponto de entrada da Janela Dedicada (Window).
 *
 * Inicializa o banco de dados, o sistema de toasts e monta o AppShell.
 *
 * Referência: ARQUITETURA.md — Seção 3 (Fluxograma da Aplicação)
 */

import '../../src/ui/theme/tokens.css';
import { getDB } from '../../src/core/db/schema';
import { initAppShell } from '../../src/ui/components/AppShell';
import { initToastSystem } from '../../src/ui/components/ToastNotification';
import { updateListUsageCount } from '../../src/ui/views/ListView';
import { emit } from '../../src/store/app-store';
import { shouldShowCurrentRelease } from '../../src/core/release-notes/release-notes';

async function main(): Promise<void> {
  try {
    // 1. Inicializa o tema
    const initTheme = () => {
      const savedTheme = localStorage.getItem('atenaflow-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        chrome.storage.local.set({ 'atenaflow-theme': savedTheme });
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        chrome.storage.local.set({ 'atenaflow-theme': 'light' });
      }
    };
    initTheme();

    // 2. Inicializa o banco de dados (cria object stores na primeira vez)
    await getDB();

    // 2. Inicializa o sistema de toasts (escuta eventos do store)
    initToastSystem();

    // 3. Monta o AppShell no elemento raiz
    const rootEl = document.getElementById('app');
    if (!rootEl) {
      throw new Error('Elemento #app não encontrado no DOM.');
    }

    await initAppShell(rootEl);

    // Mostra as novidades uma única vez por versão instalada.
    if (await shouldShowCurrentRelease()) {
      emit('view-changed', { view: 'release-notes' });
    }

    // Mantém a lista sincronizada quando um script é usado pelo popup injetado nas páginas.
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'USAGE_COUNT_UPDATED') {
        updateListUsageCount(message.scriptId, message.usageCount);
      }
    });

    console.log('AtenaFlow: Janela dedicada inicializada com sucesso.');
  } catch (error) {
    console.error('AtenaFlow: Erro na inicialização:', error);
  }
}

// Executa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', main);
