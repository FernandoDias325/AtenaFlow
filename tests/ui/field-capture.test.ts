// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { captureTextFromField } from '../../src/core/content/field-capture';

describe('captura de texto do campo atual', () => {
  it('captura somente o trecho selecionado de input e textarea', () => {
    const input = document.createElement('input');
    input.value = 'Olá, este é o texto completo';
    input.setSelectionRange(5, 13);
    expect(captureTextFromField(input)).toBe('este é o');

    const textarea = document.createElement('textarea');
    textarea.value = 'Primeira linha\nSegunda linha';
    textarea.setSelectionRange(0, 0);
    expect(captureTextFromField(textarea)).toBe('Primeira linha\nSegunda linha');
  });

  it('captura todo o conteúdo de um editor contenteditable', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = '<p>Resposta criada durante o atendimento</p>';
    document.body.appendChild(editor);
    expect(captureTextFromField(editor)).toContain('Resposta criada durante o atendimento');
  });

  it('não captura elementos que não são campos editáveis', () => {
    const div = document.createElement('div');
    div.textContent = 'Texto comum da página';
    expect(captureTextFromField(div)).toBe('');
  });
});
