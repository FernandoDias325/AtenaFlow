import { emit } from '../../store/app-store';
import {
  getCurrentVersion,
  markCurrentReleaseSeen,
  RELEASE_NOTES
} from '../../core/release-notes/release-notes';

const STYLES = `
  .release-view{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--color-bg)}
  .release-view__header{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border)}
  .release-view__back{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-sm);color:var(--color-text-secondary)}
  .release-view__back:hover{background:var(--color-bg-tertiary);color:var(--color-text)}
  .release-view__title{font-size:var(--font-size-xl);font-weight:var(--font-weight-semibold);color:var(--color-text)}
  .release-view__content{flex:1;overflow-y:auto;padding:var(--space-4);background:var(--color-bg-secondary)}
  .release-hero{padding:var(--space-4);margin-bottom:var(--space-3);border-radius:var(--radius-lg);background:var(--color-primary-soft);border:1px solid color-mix(in srgb,var(--color-primary) 25%,var(--color-border))}
  .release-hero__badge{display:inline-block;padding:3px 8px;border-radius:var(--radius-full);background:var(--color-primary);color:var(--color-primary-text);font-size:10px;font-weight:var(--font-weight-semibold)}
  .release-hero h2{margin:var(--space-2) 0 3px;color:var(--color-text);font-size:var(--font-size-lg)}
  .release-hero p{margin:0;color:var(--color-text-secondary);font-size:var(--font-size-xs);line-height:1.45}
  .release-item{padding:var(--space-3);margin-bottom:var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg)}
  .release-item h3{margin:0 0 4px;color:var(--color-text);font-size:var(--font-size-sm)}
  .release-item p{margin:0;color:var(--color-text-secondary);font-size:var(--font-size-xs);line-height:1.45}
  .release-footer{padding-top:var(--space-3);text-align:center;color:var(--color-text-tertiary);font-size:10px}
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

export function createReleaseNotesView(): HTMLElement {
  injectStyles();
  const version = getCurrentVersion();
  const notes = RELEASE_NOTES[version] ?? [];
  void markCurrentReleaseSeen();

  const container = document.createElement('div');
  container.className = 'release-view';
  const header = document.createElement('header');
  header.className = 'release-view__header';
  const back = document.createElement('button');
  back.className = 'release-view__back';
  back.setAttribute('aria-label', 'Voltar para configurações');
  back.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>';
  back.addEventListener('click', () => emit('view-changed', { view: 'settings' }));
  const title = document.createElement('span');
  title.className = 'release-view__title';
  title.textContent = 'Novidades';
  header.append(back, title);

  const content = document.createElement('main');
  content.className = 'release-view__content';
  const hero = document.createElement('section');
  hero.className = 'release-hero';
  const badge = document.createElement('span');
  badge.className = 'release-hero__badge';
  badge.textContent = `VERSÃO ${version}`;
  const heading = document.createElement('h2');
  heading.textContent = 'O AtenaFlow ficou ainda mais completo';
  const intro = document.createElement('p');
  intro.textContent = 'Confira as principais melhorias disponíveis nesta atualização.';
  hero.append(badge, heading, intro);
  content.appendChild(hero);

  notes.forEach((note) => {
    const card = document.createElement('article');
    card.className = 'release-item';
    const noteTitle = document.createElement('h3');
    noteTitle.textContent = note.title;
    const description = document.createElement('p');
    description.textContent = note.description;
    card.append(noteTitle, description);
    content.appendChild(card);
  });
  const footer = document.createElement('div');
  footer.className = 'release-footer';
  footer.textContent = 'Você pode rever esta tela em Configurações.';
  content.appendChild(footer);
  container.append(header, content);
  return container;
}
