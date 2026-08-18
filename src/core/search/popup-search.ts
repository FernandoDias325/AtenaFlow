import { normalizeText } from './search-index';

export interface PopupScriptItem {
  id: string;
  title: string;
  body: string;
}

export function filterPopupScripts<T extends PopupScriptItem>(scripts: T[], query: string): T[] {
  const normalizedQuery = normalizeText(query.trim());
  if (!normalizedQuery) {
    return scripts;
  }
  return scripts.filter((script) => normalizeText(script.title).includes(normalizedQuery));
}

export function mountPopupSearchInput(view: HTMLElement, input: HTMLInputElement): void {
  view.appendChild(input);
}
