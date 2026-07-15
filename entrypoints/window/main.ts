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

async function main(): Promise<void> {
  try {
    // 1. Inicializa o tema
    const savedTheme = localStorage.getItem('atenaflow-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Opcional: checar preferência do sistema, mas manteremos o light como padrão
    }

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

    console.log('AtenaFlow: Janela dedicada inicializada com sucesso.');
  } catch (error) {
    console.error('AtenaFlow: Erro na inicialização:', error);
  }
}

// Executa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', main);
