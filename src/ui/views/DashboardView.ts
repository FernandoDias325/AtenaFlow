import { emit } from '../../store/app-store';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as LinksRepo from '../../core/db/links.repository';

const STYLES = `
  .dashboard-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .dashboard-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .dashboard-view__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .dashboard-view__back-btn:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .dashboard-view__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .dashboard-view__content {
    flex: 1;
    padding: var(--space-5);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .stat-card {
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-card__title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-card__value {
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }

  .stat-card__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .top-scripts {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .top-scripts__title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-2);
  }

  .top-scripts__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .top-script-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .top-script-item__name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .top-script-item__usage {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    background-color: var(--color-bg-tertiary);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }
`;

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

export async function createDashboardView(): Promise<HTMLElement> {
  injectStyles();

  const container = document.createElement('div');
  container.className = 'dashboard-view';

  // Header
  const header = document.createElement('div');
  header.className = 'dashboard-view__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'dashboard-view__back-btn';
  backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  backBtn.addEventListener('click', () => {
    emit('view-changed', { view: 'list' });
  });
  header.appendChild(backBtn);

  const title = document.createElement('span');
  title.className = 'dashboard-view__title';
  title.textContent = 'Estatísticas';
  header.appendChild(title);

  container.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'dashboard-view__content';

  // Fetch data
  const scripts = await ScriptsRepo.getAllActiveScripts();
  const totalScripts = scripts.length;
  const totalUsages = scripts.reduce((sum, script) => sum + (script.usageCount || 0), 0);

  const links = await LinksRepo.getAllLinks();
  const totalLinks = links.length;

  // Estimate: 15 seconds saved per usage
  const totalSecondsSaved = totalUsages * 15;
  const minutesSaved = Math.floor(totalSecondsSaved / 60);
  const hoursSaved = Math.floor(minutesSaved / 60);

  let timeSavedText = `${minutesSaved} minutos`;
  if (hoursSaved > 0) {
    timeSavedText = `${hoursSaved}h ${minutesSaved % 60}m`;
  }

  // Stats Grid
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const card1 = document.createElement('div');
  card1.className = 'stat-card';
  card1.innerHTML = `
    <div class="stat-card__title">Total de Scripts</div>
    <div class="stat-card__value">${totalScripts}</div>
    <div class="stat-card__desc">Scripts cadastrados</div>
  `;
  statsGrid.appendChild(card1);

  const card2 = document.createElement('div');
  card2.className = 'stat-card';
  card2.innerHTML = `
    <div class="stat-card__title">Usos Totais</div>
    <div class="stat-card__value">${totalUsages}</div>
    <div class="stat-card__desc">Vezes que os scripts foram colados</div>
  `;
  statsGrid.appendChild(card2);

  const cardLinks = document.createElement('div');
  cardLinks.className = 'stat-card';
  cardLinks.innerHTML = `
    <div class="stat-card__title">Links Úteis</div>
    <div class="stat-card__value">${totalLinks}</div>
    <div class="stat-card__desc">Links salvos na aba</div>
  `;
  statsGrid.appendChild(cardLinks);

  const card3 = document.createElement('div');
  card3.className = 'stat-card';
  card3.style.gridColumn = '1 / -1';
  card3.innerHTML = `
    <div class="stat-card__title">Tempo Economizado</div>
    <div class="stat-card__value">${timeSavedText}</div>
    <div class="stat-card__desc">Baseado na média de 15s por digitação manual</div>
  `;
  statsGrid.appendChild(card3);

  content.appendChild(statsGrid);

  // Top 5 Scripts
  const topScripts = [...scripts]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5);

  if (topScripts.length > 0 && (topScripts[0]?.usageCount || 0) > 0) {
    const topList = document.createElement('div');
    topList.className = 'top-scripts';

    const topTitle = document.createElement('div');
    topTitle.className = 'top-scripts__title';
    topTitle.textContent = 'Top 5 Scripts Mais Usados';
    topList.appendChild(topTitle);

    const list = document.createElement('div');
    list.className = 'top-scripts__list';

    for (const s of topScripts) {
      if (!s.usageCount || s.usageCount === 0) {
        continue;
      }
      const item = document.createElement('div');
      item.className = 'top-script-item';
      item.innerHTML = `
        <span class="top-script-item__name">${s.title}</span>
        <span class="top-script-item__usage">${s.usageCount} usos</span>
      `;
      list.appendChild(item);
    }

    topList.appendChild(list);
    content.appendChild(topList);
  }

  container.appendChild(content);

  return container;
}
