import { describe, expect, it } from 'vitest';
import {
  extractTemplateVariables,
  renderTemplateVariables
} from '../../src/core/templates/variables';

describe('variáveis de scripts', () => {
  it('encontra variáveis sem duplicar nomes', () => {
    expect(extractTemplateVariables('Olá {{nome}}, protocolo {{ protocolo }}. {{nome}}')).toEqual([
      'nome',
      'protocolo'
    ]);
  });

  it('substitui todas as ocorrências pelos valores informados', () => {
    expect(
      renderTemplateVariables('{{nome}} - {{nome}} - {{protocolo}}', {
        nome: 'Ana',
        protocolo: '123'
      })
    ).toBe('Ana - Ana - 123');
  });

  it('preserva parágrafos e normaliza quebras de linha', () => {
    expect(
      renderTemplateVariables('Olá {{nome}}!\r\n\r\nComo posso ajudar?', { nome: 'Ana' })
    ).toBe('Olá Ana!\n\nComo posso ajudar?');
  });
});
