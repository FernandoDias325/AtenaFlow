// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { filterPopupScripts, mountPopupSearchInput } from '../../src/core/search/popup-search';

const scripts = [
  { id: '1', title: 'Cancelamento de compra', body: 'A' },
  { id: '2', title: 'Auditoria 1', body: 'B' }
];

describe('popup injetado de scripts', () => {
  it('filtra títulos ignorando maiúsculas e acentos', () => {
    expect(filterPopupScripts(scripts, 'CANCELAMENTO')).toEqual([scripts[0]]);
    expect(
      filterPopupScripts([{ id: '3', title: 'Informação', body: '' }], 'informacao')
    ).toHaveLength(1);
  });

  it('mantém a pesquisa dentro do Shadow DOM e oculta o input do site', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const view = document.createElement('div');
    const input = document.createElement('input');
    shadow.appendChild(view);
    document.body.appendChild(host);

    mountPopupSearchInput(view, input);

    expect(host.querySelector('input')).toBeNull();
    expect(input.parentElement).toBe(view);
  });
});
