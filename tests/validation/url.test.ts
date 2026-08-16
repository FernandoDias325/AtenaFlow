import { describe, expect, it } from 'vitest';
import { normalizeHttpUrl } from '../../src/core/validation/url';

describe('normalizeHttpUrl', () => {
  it('adiciona HTTPS quando o protocolo não foi informado', () => {
    expect(normalizeHttpUrl('app.exemplo.com/caminho')).toBe('https://app.exemplo.com/caminho');
  });

  it('mantém URLs HTTP e HTTPS válidas', () => {
    expect(normalizeHttpUrl('https://exemplo.com')).toBe('https://exemplo.com/');
    expect(normalizeHttpUrl('http://localhost:3000')).toBe('http://localhost:3000/');
  });

  it('rejeita protocolos perigosos e endereços inválidos', () => {
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeHttpUrl('data:text/html,x')).toBeNull();
    expect(normalizeHttpUrl('http://')).toBeNull();
    expect(normalizeHttpUrl('endereco-errado')).toBeNull();
    expect(normalizeHttpUrl('apenas uma palavra')).toBeNull();
    expect(normalizeHttpUrl('http://999.999.999.999')).toBeNull();
    expect(normalizeHttpUrl('')).toBeNull();
  });
});
