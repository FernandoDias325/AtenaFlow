import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { closeDB, DB_NAME, getDB } from '../../src/core/db/schema';
import * as repo from '../../src/core/db/links.repository';
import { openLinkGroup } from '../../src/core/links/open-group';
import { generateExportData, importBackup } from '../../src/core/backup/backup.service';

describe('grupos de links', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      tabs: { create: vi.fn(async () => ({ id: 1 })) },
      windows: {
        getLastFocused: vi.fn(async () => ({ id: 42 })),
        create: vi.fn(async () => ({ id: 43 }))
      }
    });
  });
  afterEach(async () => {
    await closeDB();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    vi.unstubAllGlobals();
  });

  it('cria, renomeia e altera participantes sem excluir links ou perder estatísticas', async () => {
    const a = await repo.createLink({ title: 'CRM', url: 'https://crm.example/' });
    const b = await repo.createLink({ title: 'Painel', url: 'https://panel.example/' });
    await repo.incrementUsageCount(a.id);
    await repo.saveLinkGroup(' Atendimento ', [a.id, b.id]);
    expect((await repo.getLink(a.id))?.groupName).toBe('Atendimento');
    await repo.saveLinkGroup('Rotina', [b.id], 'Atendimento');
    expect((await repo.getLink(a.id))?.groupName).toBeNull();
    expect((await repo.getLink(a.id))?.usageCount).toBe(1);
    expect((await repo.getLink(b.id))?.groupName).toBe('Rotina');
    await repo.removeLinkGroup('Rotina');
    expect(await repo.getAllLinks()).toHaveLength(2);
    expect((await repo.getLink(b.id))?.groupName).toBeNull();
  });

  it('rejeita grupos sem nome ou sem participantes', async () => {
    await expect(repo.saveLinkGroup('', ['a'])).rejects.toThrow();
    await expect(repo.saveLinkGroup('Rotina', [])).rejects.toThrow();
  });

  it('abre somente links ativos e válidos, sem duplicar IDs e conta só aberturas bem-sucedidas', async () => {
    const a = await repo.createLink({ title: 'CRM', url: 'https://crm.example/' });
    const b = await repo.createLink({ title: 'Painel', url: 'https://panel.example/' });
    const c = await repo.createLink({ title: 'Antigo', url: 'https://old.example/' });
    await repo.deleteLink(c.id);
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(new Error('Falha'));
    const result = await openLinkGroup([
      a,
      a,
      b,
      (await repo.getLink(c.id))!,
      { ...b, id: 'invalid', url: 'javascript:alert(1)' }
    ]);
    expect(result).toEqual({ opened: 1, failed: 2 });
    expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.create).toHaveBeenLastCalledWith({
      url: b.url,
      active: false,
      windowId: 42
    });
    expect((await repo.getLink(a.id))?.usageCount).toBe(0);
    expect((await repo.getLink(b.id))?.usageCount).toBe(1);
  });

  it('cria uma janela normal quando somente a janela da extensão está aberta', async () => {
    const a = await repo.createLink({ title: 'CRM', url: 'https://crm.example/' });
    const b = await repo.createLink({ title: 'Painel', url: 'https://panel.example/' });
    vi.mocked(chrome.windows.getLastFocused).mockRejectedValueOnce(new Error('Sem janela normal'));
    expect(await openLinkGroup([a, b])).toEqual({ opened: 2, failed: 0 });
    expect(chrome.windows.create).toHaveBeenCalledWith({
      url: a.url,
      type: 'normal',
      focused: false
    });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: b.url, active: false, windowId: 43 });
  });

  it('preserva o grupo ao exportar e importar e aceita links de backups antigos', async () => {
    const link = await repo.createLink({
      title: 'CRM',
      url: 'https://crm.example/',
      groupName: 'Atendimento'
    });
    const backup = await generateExportData();
    expect(backup.links?.[0]?.groupName).toBe('Atendimento');
    const db = await getDB();
    await db.clear('links');
    await importBackup(JSON.stringify(backup));
    expect((await repo.getLink(link.id))?.groupName).toBe('Atendimento');
    await importBackup(
      JSON.stringify({
        version: 2,
        categories: [],
        scripts: [],
        links: [{ id: 'old', title: 'Antigo', url: 'https://old.example/', order: 1, createdAt: 1 }]
      })
    );
    expect((await repo.getLink('old'))?.groupName).toBeNull();
  });
});
