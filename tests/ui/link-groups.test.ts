// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLinksView } from '../../src/ui/views/LinksView';
import * as repo from '../../src/core/db/links.repository';
import { openLinkGroup } from '../../src/core/links/open-group';

vi.mock('../../src/core/db/links.repository', () => ({
  getAllLinks: vi.fn(),
  normalizeLinkTitle: (name: string) => name.trim(),
  saveLinkGroup: vi.fn(async () => undefined),
  incrementUsageCount: vi.fn()
}));
vi.mock('../../src/core/links/open-group', () => ({
  openLinkGroup: vi.fn(async () => ({ opened: 2, failed: 0 }))
}));

const links = [
  {
    id: 'a',
    title: 'CRM',
    url: 'https://crm.example/',
    groupName: 'Atendimento',
    order: 0,
    createdAt: 1
  },
  {
    id: 'b',
    title: 'Painel',
    url: 'https://panel.example/',
    groupName: 'Atendimento',
    order: 1,
    createdAt: 1
  },
  { id: 'c', title: 'Avulso', url: 'https://other.example/', order: 2, createdAt: 1 }
];
const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
};

describe('tela de grupos de links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
    vi.mocked(repo.getAllLinks).mockResolvedValue(links);
  });
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('organiza grupos e avulsos e abre todos os membros do grupo', async () => {
    const view = await createLinksView();
    document.body.appendChild(view);
    expect(view.querySelectorAll('.link-group')).toHaveLength(2);
    expect(view.querySelectorAll('.link-item')).toHaveLength(3);
    (view.querySelector('.link-group__open') as HTMLButtonElement).click();
    await settle();
    expect(openLinkGroup).toHaveBeenCalledWith(links.slice(0, 2));
    expect(view.querySelectorAll('.link-item')).toHaveLength(3);
  });

  it('filtra links sem grupo e permite criar um grupo escolhendo links existentes', async () => {
    const view = await createLinksView();
    document.body.appendChild(view);
    const filter = view.querySelector('select')!;
    filter.value = '';
    filter.dispatchEvent(new Event('change'));
    await settle();
    expect(view.querySelectorAll('.link-item')).toHaveLength(1);
    (view.querySelector('[title="Criar grupo de links"]') as HTMLButtonElement).click();
    await settle();
    const name = view.querySelector('[aria-label="Nome do grupo"]') as HTMLInputElement;
    name.value = 'Rotina';
    (view.querySelector('.link-group-picker input') as HTMLInputElement).click();
    (view.querySelector('.link-modal__btn--save') as HTMLButtonElement).click();
    await settle();
    expect(repo.saveLinkGroup).toHaveBeenCalledWith('Rotina', ['a'], undefined);
    expect(view.querySelector('.link-modal')).toBeNull();
  });
});
