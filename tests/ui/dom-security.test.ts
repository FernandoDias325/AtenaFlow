// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { sanitizeNotepadHtml } from '../../src/core/security/sanitize-html';
import { createScriptCard, updateScriptCardUsage } from '../../src/ui/components/ScriptCard';
import type { Script } from '../../src/core/models/types';

describe('segurança e atualização do DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('remove fundo branco e código perigoso do bloco de notas', () => {
    const result = sanitizeNotepadHtml(
      '<p style="background:white;color:black" onclick="alert(1)"><b>Texto</b></p><script>alert(1)</script>'
    );
    expect(result).toContain('<b>Texto</b>');
    expect(result).not.toContain('background');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('script');
  });

  it('atualiza apenas o badge do card sem substituir o card', () => {
    const script: Script = {
      id: 'script-1',
      title: 'Teste',
      body: 'Conteúdo',
      tags: [],
      categoryId: null,
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null
    };
    const card = createScriptCard({ script, onRefresh: () => undefined });
    document.body.appendChild(card);

    updateScriptCardUsage(script.id, 3);

    expect(document.body.firstElementChild).toBe(card);
    expect(card.querySelector('.script-card__usage span')?.textContent).toBe('3');
  });

  it('permite selecionar um card sem abrir a edição', () => {
    const script: Script = {
      id: 'script-selection',
      title: 'Selecionável',
      body: 'Conteúdo',
      tags: [],
      categoryId: null,
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null
    };
    let selectedId = '';
    const card = createScriptCard({
      script,
      onRefresh: () => undefined,
      selectionMode: true,
      onSelectionChange: (id) => {
        selectedId = id;
      }
    });

    card.click();

    expect(selectedId).toBe(script.id);
    expect(card.querySelector<HTMLInputElement>('.script-card__select')).toBeTruthy();
  });
});
