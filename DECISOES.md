# Registro de Decisões Arquiteturais (DECISOES.md)

Este documento registra formalmente as decisões de arquitetura tomadas ao longo do projeto, detalhando o contexto, alternativas consideradas, decisões e seus impactos.

---

## [AD-001] Substituição do Popup por Janela Dedicada (Window)

- **Data:** 2026-07-14
- **Status:** Aprovado (Proposto por Diretrizes do Usuário)

### Contexto

Originalmente, a extensão foi planejada para ter um "Popup" como interface principal. No entanto, o comportamento padrão dos popups da extensão no Chrome/Edge é fechar automaticamente quando perdem o foco (ou seja, quando o usuário clica fora da janela do popup). Em fluxos de atendimento de suporte onde o atendente precisa clicar em diferentes campos de sistemas CRM, abas ou janelas externas, isso faria com que ele precisasse reabrir a extensão repetidas vezes.

### Alternativas Avaliadas

1. **Popup Tradicional do Chrome:**
   - _Prós:_ Simples de implementar, escopo nativo padrão.
   - _Contras:_ Fecha automaticamente ao clicar fora. Não permite redimensionar, maximizar ou manter aberto em segundo plano na barra de tarefas.

2. **Side Panel (Painel Lateral do Chrome):**
   - _Prós:_ Permanece aberto durante a navegação.
   - _Contras:_ Fica ancorado na lateral do navegador, não permitindo livre posicionamento em monitores secundários ou redimensionamento livre do layout independente do navegador.

3. **Janela Dedicada (`chrome.windows.create` com `type: "popup"`):**
   - _Prós:_ Abre como uma janela separada do navegador (sem barra de endereços), aparece na barra de tarefas do sistema operacional, permite maximizar/minimizar/redimensionar, permite alternância via Alt+Tab, permanece aberta ao clicar fora dela, e fecha automaticamente caso o navegador principal seja fechado.
   - _Contras:_ Requer gerenciamento cuidadoso do ciclo de vida no Service Worker (`background.ts`) para evitar a abertura de múltiplas janelas duplicadas quando o ícone for clicado.

### Decisão Tomada

Adotar a **Alternativa 3: Janela Dedicada (Window)**. Quando o usuário clica no ícone da extensão, o Service Worker verifica se a janela já está aberta. Se não estiver, cria uma nova. Se estiver aberta, apenas foca nela.

### Impactos

- **Interface e UI:** O entrypoint da interface principal muda de `entrypoints/popup/` para `entrypoints/window/`.
- **Service Worker (`background.ts`):** Deverá monitorar `chrome.action.onClicked` e manter uma referência do ID da janela aberta no `chrome.storage.local` ou memória (se o SW estiver ativo) para focar nela com `chrome.windows.update`.
- **Manifest:** Requer permissão `storage` (já planejada) e permissões de controle de janelas.
