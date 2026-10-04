export const RELEASE_NOTES_STORAGE_KEY = 'atenaflow-last-seen-release';

export interface ReleaseNote {
  title: string;
  description: string;
}

export const RELEASE_NOTES: Record<string, ReleaseNote[]> = {
  '1.7.0': [
    {
      title: 'Grupos de links',
      description:
        'Organize seus links em grupos e use “Abrir todos” para acessar os links de um grupo com um clique.'
    },
    {
      title: 'Links com uma visualização mais clara',
      description:
        'Identificação dos sites, filtros por grupo e controles com mais espaço para facilitar o acesso aos links.'
    },
    {
      title: 'Bloco de notas mais prático',
      description:
        'O botão de nova nota fica sempre acessível à esquerda, as abas têm melhor contraste e recolher a barra de edição libera espaço para escrever.'
    },
    {
      title: 'Correções nos lembretes',
      description:
        'Ajustes no agendamento, nas recorrências e no adiamento. Avisos pendentes são recuperados ao retomar o uso e aparecem na página ou janela da extensão em foco.'
    },
    {
      title: 'Interface principal mais organizada',
      description:
        'Estatísticas e Configurações estão no menu “Mais opções”. As categorias e os controles da lista ganharam mais espaço.'
    }
  ],
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
    : '1.7.0';
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
