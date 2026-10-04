// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markCurrentReleaseSeen,
  RELEASE_NOTES_STORAGE_KEY,
  shouldShowCurrentRelease
} from '../../src/core/release-notes/release-notes';
import { createReleaseNotesView } from '../../src/ui/views/ReleaseNotesView';
import { subscribe } from '../../src/store/app-store';

describe('Novidades da versão', () => {
  let stored: Record<string, unknown>;

  beforeEach(() => {
    stored = {};
    vi.stubGlobal('chrome', {
      runtime: { getManifest: () => ({ version: '1.7.0' }) },
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
    expect(stored[RELEASE_NOTES_STORAGE_KEY]).toBe('1.7.0');
    expect(await shouldShowCurrentRelease()).toBe(false);
  });

  it('exibe novamente as novidades após atualizar uma versão já vista', async () => {
    stored[RELEASE_NOTES_STORAGE_KEY] = '1.6.0';
    expect(await shouldShowCurrentRelease()).toBe(true);
    await markCurrentReleaseSeen();
    expect(await shouldShowCurrentRelease()).toBe(false);
  });

  it('permite seguir diretamente para a lista de scripts', () => {
    const listener = vi.fn();
    const subscription = subscribe('view-changed', listener);
    const view = createReleaseNotesView();
    view.querySelector<HTMLButtonElement>('.release-view__continue')!.click();
    expect(listener).toHaveBeenCalledWith({ view: 'list' });
    subscription.unsubscribe();
  });

  it('mostra as principais mudanças da versão 1.7.0', () => {
    const view = createReleaseNotesView();

    expect(view.textContent).toContain('VERSÃO 1.7.0');
    expect(view.textContent).toContain('Grupos de links');
    expect(view.textContent).toContain('Links com uma visualização mais clara');
    expect(view.textContent).toContain('Bloco de notas mais prático');
    expect(view.textContent).toContain('Correções nos lembretes');
    expect(view.textContent).toContain('Interface principal mais organizada');
  });
});
