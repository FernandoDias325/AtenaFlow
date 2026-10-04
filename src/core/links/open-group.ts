import type { Link } from '../models/types';
import { normalizeHttpUrl } from '../validation/url';
import { incrementUsageCount } from '../db/links.repository';

/** Abre cada link ativo uma vez, mantendo a janela atual em foco. */
export async function openLinkGroup(links: Link[]): Promise<{ opened: number; failed: number }> {
  let opened = 0;
  let failed = 0;
  const seen = new Set<string>();
  let windowId: number | undefined;
  try {
    windowId = (await chrome.windows.getLastFocused({ windowTypes: ['normal'] })).id;
  } catch {
    // Sem janela normal aberta, o primeiro link cria uma janela do navegador.
  }
  for (const link of links) {
    if (link.deletedAt || seen.has(link.id)) {
      continue;
    }
    seen.add(link.id);
    const url = normalizeHttpUrl(link.url);
    if (!url) {
      failed++;
      continue;
    }
    try {
      if (windowId === undefined) {
        const created = await chrome.windows.create({ url, type: 'normal', focused: false });
        if (created?.id === undefined) {
          throw new Error('Não foi possível criar uma janela para o grupo.');
        }
        windowId = created.id;
      } else {
        await chrome.tabs.create({ url, active: false, windowId });
      }
      opened++;
    } catch {
      failed++;
      continue;
    }
    // Uma falha no contador não deve impedir a abertura dos próximos links.
    await incrementUsageCount(link.id).catch(() => undefined);
  }
  return { opened, failed };
}
