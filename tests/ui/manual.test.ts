// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllListeners, subscribe } from '../../src/store/app-store';
import { createManualView, MANUAL_SECTIONS } from '../../src/ui/views/ManualView';
import { PRODUCT_FEATURE_IDS } from '../../src/core/product/feature-catalog';

describe('Manual de uso', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.stubGlobal('chrome', {
      runtime: { getManifest: () => ({ version: '1.6.0' }) }
    });
  });

  afterEach(() => {
    clearAllListeners();
    vi.unstubAllGlobals();
  });

  it('cobre todas as áreas funcionais da extensão', () => {
    const corpus = MANUAL_SECTIONS.map((section) =>
      [section.title, section.summary, ...section.items].join(' ')
    ).join(' ');

    [
      'Scripts',
      'Categorias',
      'ações em lote',
      'Variáveis',
      'Botão flutuante',
      'Salvar o texto',
      'duplicidades',
      'Links',
      'Bloco de notas',
      'Estatísticas',
      'Lixeira',
      'Backup',
      'Aparência',
      'privacidade',
      'Solução de problemas'
    ].forEach((feature) => expect(corpus.toLowerCase()).toContain(feature.toLowerCase()));
  });

  it('possui exatamente um tópico para cada área do catálogo do produto', () => {
    const documentedIds = MANUAL_SECTIONS.map((section) => section.id);

    expect(new Set(documentedIds).size).toBe(documentedIds.length);
    expect([...documentedIds].sort()).toEqual([...PRODUCT_FEATURE_IDS].sort());
  });

  it('renderiza todos os tópicos e a versão instalada', () => {
    const view = createManualView();
    document.body.appendChild(view);

    expect(view.querySelectorAll('.manual-section')).toHaveLength(MANUAL_SECTIONS.length);
    expect(view.textContent).toContain('AtenaFlow 1.6.0');
    expect(view.textContent).toContain('Manual de uso');
  });

  it('descreve somente as ferramentas disponíveis no bloco de notas', () => {
    const notepad = MANUAL_SECTIONS.find((section) => section.title === 'Bloco de notas')!;
    const content = notepad.items.join(' ').toLowerCase();

    expect(content).toContain('marca-texto');
    expect(content).toContain('listas');
    expect(content).toContain('salvas automaticamente');
    expect(content).not.toContain('tabelas');
    expect(content).not.toContain('blocos de código');
  });

  it('filtra sem diferenciar acentos e abre os resultados', () => {
    const view = createManualView();
    document.body.appendChild(view);
    const input = view.querySelector<HTMLInputElement>('[aria-label="Buscar no manual"]')!;

    input.value = 'importacao';
    input.dispatchEvent(new Event('input'));

    const visible = [...view.querySelectorAll<HTMLDetailsElement>('.manual-section')].filter(
      (section) => !section.hidden
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((section) => section.open)).toBe(true);
    expect(visible.some((section) => section.textContent?.includes('Backup'))).toBe(true);
  });

  it('informa quando a pesquisa não encontra tópico', () => {
    const view = createManualView();
    const input = view.querySelector<HTMLInputElement>('[aria-label="Buscar no manual"]')!;
    input.value = 'termo que nao existe xyz';
    input.dispatchEvent(new Event('input'));

    expect(view.querySelectorAll('.manual-section:not([hidden])')).toHaveLength(0);
    expect((view.querySelector('.manual-empty') as HTMLElement).style.display).toBe('block');
  });

  it('volta para as configurações pelo cabeçalho', () => {
    const handler = vi.fn();
    subscribe('view-changed', handler);
    const view = createManualView();

    view.querySelector<HTMLButtonElement>('[aria-label="Voltar para configurações"]')!.click();

    expect(handler).toHaveBeenCalledWith({ view: 'settings' });
  });
});
