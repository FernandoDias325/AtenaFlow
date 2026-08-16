import { describe, expect, it } from 'vitest';
import {
  isSiteDisabled,
  normalizeSite,
  normalizeSiteList
} from '../../src/core/settings/site-access';

describe('controle por site', () => {
  it('normaliza domínios e remove duplicados', () => {
    expect(normalizeSite('https://www.Exemplo.com/pagina')).toBe('exemplo.com');
    expect(normalizeSiteList(['exemplo.com', 'https://www.exemplo.com', ' outro.com '])).toEqual([
      'exemplo.com',
      'outro.com'
    ]);
  });

  it('desativa o domínio e seus subdomínios, mas não domínios parecidos', () => {
    expect(isSiteDisabled('app.exemplo.com', ['exemplo.com'])).toBe(true);
    expect(isSiteDisabled('exemplo.com', ['exemplo.com'])).toBe(true);
    expect(isSiteDisabled('falsoexemplo.com', ['exemplo.com'])).toBe(false);
  });
});
