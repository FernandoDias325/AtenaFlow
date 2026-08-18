import type { DuplicateDecision, ImportDuplicate } from '../../core/backup/backup.service';

const STYLES = `
  .duplicate-review { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.55); }
  .duplicate-review__modal { width: min(620px, 100%); max-height: 86vh; display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-bg); box-shadow: var(--shadow-xl); }
  .duplicate-review__header { padding: var(--space-4); border-bottom: 1px solid var(--color-border); }
  .duplicate-review__title { margin: 0 0 4px; font-size: var(--font-size-lg); color: var(--color-text); }
  .duplicate-review__desc { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
  .duplicate-review__list { overflow-y: auto; padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
  .duplicate-review__item { padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-secondary); }
  .duplicate-review__meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 11px; color: var(--color-text-secondary); }
  .duplicate-review__columns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .duplicate-review__column { min-width: 0; padding: 8px; border-radius: var(--radius-sm); background: var(--color-bg); }
  .duplicate-review__label { display: block; margin-bottom: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--color-text-tertiary); }
  .duplicate-review__name { font-size: 12px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .duplicate-review__body { margin-top: 4px; font-size: 11px; color: var(--color-text-secondary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap; }
  .duplicate-review__body--expanded { display: block; max-height: 180px; overflow: auto; -webkit-line-clamp: unset; }
  .duplicate-review__expand { margin-top: 6px; padding: 0; color: var(--color-primary); font-size: 10px; font-weight: 600; }
  .duplicate-review__select { width: 100%; margin-top: 8px; padding: 7px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); }
  .duplicate-review__actions { display: flex; justify-content: flex-end; gap: 8px; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border); }
  .duplicate-review__btn { padding: 8px 14px; border-radius: var(--radius-md); font-size: 12px; }
  .duplicate-review__btn--cancel { border: 1px solid var(--color-border); color: var(--color-text); }
  .duplicate-review__btn--confirm { background: var(--color-primary); color: white; }
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

function itemDescription(item: ImportDuplicate['existing']): string {
  return 'body' in item ? item.body : item.url;
}

export function showDuplicateReviewModal(
  duplicates: ImportDuplicate[],
  options: {
    title?: string;
    description?: string;
    cancelLabel?: string;
    confirmLabel?: string;
  } = {}
): Promise<Record<string, DuplicateDecision> | null> {
  injectStyles();
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'duplicate-review';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'duplicate-review__modal';
    const header = document.createElement('div');
    header.className = 'duplicate-review__header';
    const title = document.createElement('h2');
    title.className = 'duplicate-review__title';
    title.textContent = options.title ?? `${duplicates.length} possível(is) duplicado(s)`;
    const desc = document.createElement('p');
    desc.className = 'duplicate-review__desc';
    desc.textContent =
      options.description ?? 'Compare o que já existe com o item novo e escolha o que fazer.';
    header.append(title, desc);

    const list = document.createElement('div');
    list.className = 'duplicate-review__list';
    const selects = new Map<string, HTMLSelectElement>();
    for (const duplicate of duplicates) {
      const row = document.createElement('div');
      row.className = 'duplicate-review__item';
      const meta = document.createElement('div');
      meta.className = 'duplicate-review__meta';
      meta.textContent = `${duplicate.type === 'script' ? 'Script' : 'Link'} · ${Math.round(duplicate.similarity * 100)}% semelhante`;
      const columns = document.createElement('div');
      columns.className = 'duplicate-review__columns';
      for (const [label, item] of [
        ['Já existente', duplicate.existing],
        ['Novo', duplicate.incoming]
      ] as const) {
        const column = document.createElement('div');
        column.className = 'duplicate-review__column';
        const labelEl = document.createElement('span');
        labelEl.className = 'duplicate-review__label';
        labelEl.textContent = label;
        const name = document.createElement('div');
        name.className = 'duplicate-review__name';
        name.textContent = item.title;
        const body = document.createElement('div');
        body.className = 'duplicate-review__body';
        const completeText = itemDescription(item);
        body.textContent = completeText;
        body.title = completeText;
        const expand = document.createElement('button');
        expand.type = 'button';
        expand.className = 'duplicate-review__expand';
        expand.textContent = 'Ver completo';
        expand.addEventListener('click', () => {
          const expanded = body.classList.toggle('duplicate-review__body--expanded');
          expand.textContent = expanded ? 'Recolher' : 'Ver completo';
        });
        column.append(labelEl, name, body, expand);
        columns.appendChild(column);
      }
      const select = document.createElement('select');
      select.className = 'duplicate-review__select';
      select.innerHTML = `
        <option value="keep-existing">Manter o que já existe</option>
        <option value="replace-existing">Substituir pelo novo</option>
        <option value="keep-both">Manter os dois</option>
      `;
      selects.set(duplicate.key, select);
      row.append(meta, columns, select);
      list.appendChild(row);
    }

    const actions = document.createElement('div');
    actions.className = 'duplicate-review__actions';
    const cancel = document.createElement('button');
    cancel.className = 'duplicate-review__btn duplicate-review__btn--cancel';
    cancel.textContent = options.cancelLabel ?? 'Cancelar importação';
    const confirm = document.createElement('button');
    confirm.className = 'duplicate-review__btn duplicate-review__btn--confirm';
    confirm.textContent = options.confirmLabel ?? 'Continuar importação';
    actions.append(cancel, confirm);
    modal.append(header, list, actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const close = (result: Record<string, DuplicateDecision> | null) => {
      backdrop.remove();
      resolve(result);
    };
    cancel.addEventListener('click', () => close(null));
    confirm.addEventListener('click', () => {
      close(
        Object.fromEntries(
          [...selects].map(([key, select]) => [key, select.value as DuplicateDecision])
        )
      );
    });
  });
}
