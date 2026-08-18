// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markCurrentReleaseSeen,
  RELEASE_NOTES_STORAGE_KEY,
  shouldShowCurrentRelease
} from '../../src/core/release-notes/release-notes';
import { createReleaseNotesView } from '../../src/ui/views/ReleaseNotesView';

describe('Novidades da versão', () => {
  let stored: Record<string, unknown>;

  beforeEach(() => {
    stored = {};
    vi.stubGlobal('chrome', {
      runtime: { getManifest: () => ({ version: '1.6.0' }) },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: stored[key] })),
          set: vi.fn(async (values: Record<string, unknown>) => Object.assign(stored, values))
        }
      }
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('é exibida somente enquanto a versão atual ainda não foi vista', async () => {
    expect(await shouldShowCurrentRelease()).toBe(true);
    await markCurrentReleaseSeen();
    expect(stored[RELEASE_NOTES_STORAGE_KEY]).toBe('1.6.0');
    expect(await shouldShowCurrentRelease()).toBe(false);
  });

  it('mostra as principais mudanças da versão 1.6.0', () => {
    const view = createReleaseNotesView();

    expect(view.textContent).toContain('VERSÃO 1.6.0');
    expect(view.textContent).toContain('Backup completo e seguro');
    expect(view.textContent).toContain('Comparação de duplicidades');
    expect(view.textContent).toContain('Ações em lote');
    expect(view.textContent).toContain('Categorias reorganizáveis');
    expect(view.textContent).toContain('Captura de texto nos sites');
    expect(view.textContent).toContain('Manual de uso completo');
    expect(view.textContent).toContain('Lembretes visuais');
    expect(view.textContent).toContain('Recorrências flexíveis');
    expect(view.textContent).toContain('Concluir ou adiar');
  });
});
