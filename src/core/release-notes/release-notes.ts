export const RELEASE_NOTES_STORAGE_KEY = 'atenaflow-last-seen-release';

export interface ReleaseNote {
  title: string;
  description: string;
}

export const RELEASE_NOTES: Record<string, ReleaseNote[]> = {
  '1.6.0': [
    {
      title: 'Backup completo e seguro',
      description:
        'Exportação de todos os dados, cópia automática antes de importar e opção para desfazer a última importação.'
    },
    {
      title: 'Comparação de duplicidades',
      description:
        'Avisos ao cadastrar ou importar scripts semelhantes, com comparação completa antes de decidir.'
    },
    {
      title: 'Ações em lote',
      description:
        'Selecione vários scripts ou links para mover, excluir e restaurar com menos cliques.'
    },
    {
      title: 'Categorias reorganizáveis',
      description: 'Reordene categorias, inclusive “Sem categoria”, e mova scripts entre elas.'
    },
    {
      title: 'Captura de texto nos sites',
      description:
        'Salve como script o texto selecionado ou escrito no campo atual usando o botão flutuante.'
    },
    {
      title: 'Manual de uso completo',
      description:
        'Guia pesquisável nas Configurações, com todas as funções e soluções para dúvidas comuns.'
    },
    {
      title: 'Lembretes visuais',
      description:
        'Programe pausas, reuniões e avisos recorrentes exibidos diretamente no canto da página ativa.'
    },
    {
      title: 'Recorrências flexíveis',
      description:
        'Escolha uma ocorrência única, todos os dias, dias úteis ou dias específicos da semana.'
    },
    {
      title: 'Concluir ou adiar',
      description:
        'Confirme o lembrete, adie por cinco minutos ou acompanhe avisos pendentes pela nova tela.'
    }
  ]
};

export function getCurrentVersion(): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : '1.6.0';
}

export async function shouldShowCurrentRelease(): Promise<boolean> {
  const version = getCurrentVersion();
  if (!RELEASE_NOTES[version]) {
    return false;
  }
  const stored = await chrome.storage.local.get(RELEASE_NOTES_STORAGE_KEY);
  return stored[RELEASE_NOTES_STORAGE_KEY] !== version;
}

export async function markCurrentReleaseSeen(): Promise<void> {
  const version = getCurrentVersion();
  await chrome.storage.local.set({ [RELEASE_NOTES_STORAGE_KEY]: version });
}
