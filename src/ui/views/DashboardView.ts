import { emit } from '../../store/app-store';
import * as ScriptsRepo from '../../core/db/scripts.repository';
import * as LinksRepo from '../../core/db/links.repository';

const STYLES = `
  .dashboard-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-app, var(--color-bg));
  }

  .dashboard-view__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-bg) 84%, transparent);
    backdrop-filter: blur(14px);
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
    padding: var(--space-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 88px;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    box-sizing: border-box;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--color-primary) 6%, transparent);
  }

  .stat-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .stat-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 7px;
    color: var(--color-primary);
    background: var(--color-primary-soft);
  }

  .stat-card__title {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-card__value {
    font-size: 24px;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
  }

  .stat-card__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .stat-card--wide {
    grid-column: 1 / -1;
    min-height: auto;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 4px var(--space-3);
  }

  .stat-card--wide .stat-card__value { grid-column: 2; grid-row: 1 / 3; font-size: 22px; white-space: nowrap; }

  .top-scripts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
  }

  .top-scripts__title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    padding-bottom: var(--space-1);
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
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
  }

  .top-script-item__identity { display: flex; align-items: center; gap: 7px; min-width: 0; }
  .top-script-item__position { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; border-radius: 6px; color: var(--color-primary); background: var(--color-primary-soft); font-size: 10px; font-weight: var(--font-weight-semibold); }
  .top-script-item__copy { min-width: 0; }
  .top-script-item__kind { display: block; margin-top: 1px; color: var(--color-text-tertiary); font-size: 9px; }

  .top-script-item__name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  backBtn.setAttribute('aria-label', 'Voltar para scripts');
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
  const totalLinkAccesses = links.reduce((sum, link) => sum + (link.usageCount ?? 0), 0);

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

  const createStatCard = (
    label: string,
    value: string | number,
    description: string,
    icon: string,
    wide = false
  ) => {
    const card = document.createElement('div');
    card.className = `stat-card${wide ? ' stat-card--wide' : ''}`;
    const headerEl = document.createElement('div');
    headerEl.className = 'stat-card__header';
    const labelEl = document.createElement('span');
    labelEl.className = 'stat-card__title';
    labelEl.textContent = label;
    const iconEl = document.createElement('span');
    iconEl.className = 'stat-card__icon';
    iconEl.innerHTML = icon;
    headerEl.append(labelEl, iconEl);
    const valueEl = document.createElement('div');
    valueEl.className = 'stat-card__value';
    valueEl.textContent = String(value);
    const descEl = document.createElement('div');
    descEl.className = 'stat-card__desc';
    descEl.textContent = description;
    card.append(headerEl, valueEl, descEl);
    return card;
  };

  const scriptIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h6"/></svg>`;
  const usageIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 2-9 12h8l-1 8 9-12h-8z"/></svg>`;
  const linkIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/></svg>`;
  const openIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6H5V6h6"/></svg>`;
  const clockIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

  statsGrid.append(
    createStatCard('Scripts', totalScripts, 'cadastrados', scriptIcon),
    createStatCard('Usos de scripts', totalUsages, 'inserções realizadas', usageIcon),
    createStatCard('Links úteis', totalLinks, 'links salvos', linkIcon),
    createStatCard('Links abertos', totalLinkAccesses, 'acessos realizados', openIcon),
    createStatCard('Tempo economizado', timeSavedText, 'Estimativa de 15s por uso', clockIcon, true)
  );

  content.appendChild(statsGrid);

  const ranking = [
    ...scripts.map((script) => ({
      name: script.title,
      count: script.usageCount ?? 0,
      kind: 'Script'
    })),
    ...links.map((link) => ({
      name: link.title,
      count: link.usageCount ?? 0,
      kind: 'Link'
    }))
  ]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (ranking.length > 0) {
    const topList = document.createElement('div');
    topList.className = 'top-scripts';

    const topTitle = document.createElement('div');
    topTitle.className = 'top-scripts__title';
    topTitle.textContent = 'Mais utilizados';
    topList.appendChild(topTitle);

    const list = document.createElement('div');
    list.className = 'top-scripts__list';

    ranking.forEach((rankedItem, index) => {
      const item = document.createElement('div');
      item.className = 'top-script-item';
      const identity = document.createElement('div');
      identity.className = 'top-script-item__identity';
      const position = document.createElement('span');
      position.className = 'top-script-item__position';
      position.textContent = String(index + 1);
      const copy = document.createElement('div');
      copy.className = 'top-script-item__copy';
      const name = document.createElement('span');
      name.className = 'top-script-item__name';
      name.textContent = rankedItem.name;
      const kind = document.createElement('span');
      kind.className = 'top-script-item__kind';
      kind.textContent = rankedItem.kind;
      copy.append(name, kind);
      identity.append(position, copy);
      const usage = document.createElement('span');
      usage.className = 'top-script-item__usage';
      usage.textContent = `${rankedItem.count} ${rankedItem.count === 1 ? 'uso' : 'usos'}`;
      item.append(identity, usage);
      list.appendChild(item);
    });

    topList.appendChild(list);
    content.appendChild(topList);
  }

  container.appendChild(content);

  return container;
}
