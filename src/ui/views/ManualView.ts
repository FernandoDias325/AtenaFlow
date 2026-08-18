import { normalizeText } from '../../core/search/search-index';
import { emit } from '../../store/app-store';
import type { ProductFeatureId } from '../../core/product/feature-catalog';

export interface ManualSection {
  id: ProductFeatureId;
  title: string;
  summary: string;
  items: string[];
  tip?: string;
}

/** Fonte única do conteúdo do manual, também usada para garantir sua cobertura em testes. */
export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'navigation',
    title: 'Visão geral e navegação',
    summary: 'Onde encontrar cada área do AtenaFlow.',
    items: [
      'A tela inicial reúne seus scripts, a busca, os filtros de categoria e o botão para criar um novo script.',
      'Na barra superior ficam os atalhos para Links, Bloco de notas, Estatísticas e Configurações.',
      'Use a seta de voltar no cabeçalho de uma tela para retornar à área anterior.'
    ]
  },
  {
    id: 'scripts',
    title: 'Scripts: criar, editar e utilizar',
    summary: 'Cadastre respostas e reutilize textos com rapidez.',
    items: [
      'Clique em Novo, informe assunto, conteúdo, categoria opcional e observações. Ao editar, as alterações substituem o cadastro atual.',
      'A busca localiza termos no assunto, no conteúdo e nas observações, ignorando diferenças de maiúsculas e acentos.',
      'Ao passar o mouse sobre um cartão, use as ações para copiar, editar, excluir, favoritar ou fixar. Fixados e favoritos recebem prioridade na lista.',
      'O contador aumenta quando o script é copiado ou inserido em um site. Você pode ordenar por mais recentes ou mais usados e escolher a densidade da lista.',
      'Excluir envia o script à Lixeira; a exclusão só é definitiva quando feita dentro dela.'
    ]
  },
  {
    id: 'categories',
    title: 'Categorias e “Sem categoria”',
    summary: 'Organize scripts em grupos e controle a ordem dos filtros.',
    items: [
      'Crie uma categoria no editor de scripts ou em Gerenciar categorias. Cada categoria pode ter nome e cor.',
      'Em Gerenciar categorias, arraste os itens para definir a ordem exibida nos filtros. “Sem categoria” também pode ser reposicionado.',
      'O filtro “Sem categoria” mostra todo script que não pertence a uma categoria.',
      'Na seleção múltipla, use Mover para transferir vários scripts para uma categoria ou retirar a categoria deles.',
      'Ao excluir uma categoria, os scripts permanecem salvos e passam para “Sem categoria”.'
    ]
  },
  {
    id: 'bulk-actions',
    title: 'Seleção e ações em lote',
    summary: 'Edite grupos de scripts e links de uma só vez.',
    items: [
      'Clique em Selecionar e marque os quadrados dos itens desejados. O contador da barra informa quantos estão selecionados.',
      'Nos scripts, é possível mover os selecionados para uma categoria, deixá-los sem categoria ou enviá-los à Lixeira.',
      'Nos links, a ação em lote envia todos os selecionados à Lixeira.',
      'Dentro da Lixeira, você pode selecionar vários itens para restaurar ou excluir definitivamente.'
    ]
  },
  {
    id: 'variables',
    title: 'Variáveis nos scripts',
    summary: 'Crie modelos que pedem informações no momento do uso.',
    items: [
      'Escreva variáveis entre chaves duplas, como {{nome}}, ou use Inserir variável no editor.',
      'Ao usar um script com variáveis no botão flutuante, o AtenaFlow solicita cada valor antes de inserir o texto.',
      'Se a mesma variável aparecer mais de uma vez, o valor informado será aplicado em todas as ocorrências.'
    ],
    tip: 'Use nomes curtos e claros, por exemplo {{cliente}}, {{protocolo}} e {{data}}.'
  },
  {
    id: 'site-popup',
    title: 'Botão flutuante dentro dos sites',
    summary: 'Pesquise e insira scripts sem sair do campo de texto.',
    items: [
      'Ao focar um campo de texto compatível, o botão do AtenaFlow aparece próximo ao campo. Clique nele para abrir a pesquisa.',
      'Digite assunto ou parte do conteúdo, escolha o script e ele será inserido no campo que estava ativo.',
      'Você pode revisar e editar o texto antes de inserir. Variáveis são preenchidas durante esse fluxo.',
      'O funcionamento depende de o site expor um campo editável compatível. Depois de instalar ou atualizar a extensão, recarregue as páginas já abertas.',
      'Em Configurações, “Botão flutuante por site” permite informar um domínio por linha para desativar a integração nele e em seus subdomínios.'
    ]
  },
  {
    id: 'field-capture',
    title: 'Salvar o texto que está sendo escrito',
    summary: 'Transforme uma resposta do site em um novo script.',
    items: [
      'Abra o botão flutuante enquanto estiver escrevendo e clique em “Salvar texto atual”.',
      'Se houver um trecho selecionado, somente a seleção será capturada; caso contrário, será usado todo o conteúdo do campo.',
      'Revise o assunto, o conteúdo e a categoria antes de confirmar o novo script.',
      'Antes de salvar, a extensão procura conteúdos iguais ou semelhantes e apresenta uma comparação quando necessário.'
    ]
  },
  {
    id: 'duplicates',
    title: 'Detecção e comparação de duplicidades',
    summary: 'Evite cópias acidentais sem bloquear cadastros legítimos.',
    items: [
      'A comparação normaliza maiúsculas, acentos, espaços e pontuação e calcula a semelhança entre título e conteúdo.',
      'O aviso mostra o percentual, o item existente e o novo. É possível expandir os textos para conferi-los por completo.',
      'No cadastro, escolha manter o existente, atualizar/substituir quando oferecido ou salvar mesmo assim como outro script.',
      'Na importação, a decisão pode ser feita individualmente para cada possível duplicidade. Nomes parecidos, como “Auditoria 1” e “Auditoria 2”, não são automaticamente tratados como iguais apenas pelo título.'
    ]
  },
  {
    id: 'links',
    title: 'Links úteis',
    summary: 'Centralize endereços usados no dia a dia.',
    items: [
      'Na tela Links, crie um item com título e endereço, pesquise, edite, copie, abra ou exclua.',
      'O contador de acesso aumenta tanto ao abrir quanto ao copiar o link.',
      'A seleção múltipla permite enviar vários links à Lixeira, onde podem ser restaurados ou apagados definitivamente.'
    ]
  },
  {
    id: 'reminders',
    title: 'Lembretes e avisos nas páginas',
    summary: 'Programe pausas, reuniões e atividades recorrentes.',
    items: [
      'Abra Lembretes pelo ícone de sino na barra superior. Cadastre título, descrição opcional, horário e recorrência.',
      'Os lembretes podem ocorrer uma única vez, todos os dias, somente em dias úteis ou nos dias da semana escolhidos.',
      'No horário programado, um cartão com as cores do AtenaFlow aparece no canto superior direito da página ativa por 10 segundos, sem interromper a digitação.',
      'No cartão, escolha Concluir, Adiar 5 minutos ou Fechar. Ao adiar, a tela mostra o estado “Adiado +5” e o horário exato do novo aviso. Se o cartão desaparecer sozinho, continuará pendente e poderá reaparecer posteriormente.',
      'A tela mostra lembretes ativos e pendentes. Também permite concluir, pausar, reativar, editar ou excluir cada cadastro.',
      'O aviso precisa que o Chrome esteja aberto em uma página comum. Em páginas internas protegidas, ele permanece pendente até existir uma página compatível.',
      'Os lembretes fazem parte do backup completo. Depois de importar ou restaurar, os horários são agendados novamente automaticamente.'
    ],
    tip: 'Alarmes não acordam um computador suspenso; um aviso atrasado será tratado quando o Chrome voltar a funcionar.'
  },
  {
    id: 'notepad',
    title: 'Bloco de notas',
    summary: 'Anotações em abas com formatação e salvamento automático.',
    items: [
      'Crie várias abas, alterne entre elas e renomeie uma aba com duplo clique. A busca ajuda a localizar texto nas anotações.',
      'A barra de ferramentas oferece negrito, itálico, sublinhado, riscado, marca-texto, alinhamento e listas com marcadores ou números.',
      'A barra de formatação pode ser recolhida para aumentar a área de escrita. As alterações são salvas automaticamente no navegador.'
    ]
  },
  {
    id: 'statistics',
    title: 'Estatísticas e contadores',
    summary: 'Acompanhe o uso da extensão.',
    items: [
      'Estatísticas mostra totais de scripts, usos de scripts, links, acessos a links e uma estimativa de tempo economizado.',
      'A área “Mais utilizados” combina scripts e links em um ranking.',
      'A estimativa considera 15 segundos economizados por uso de script; ela é apenas uma referência de produtividade.'
    ]
  },
  {
    id: 'trash',
    title: 'Lixeira e restauração',
    summary: 'Recupere itens apagados ou remova-os definitivamente.',
    items: [
      'Scripts e links excluídos normalmente vão para a Lixeira, acessível em Configurações.',
      'Restaure um item individualmente ou use a seleção múltipla para restaurar vários.',
      'Excluir dentro da Lixeira ou usar “Esvaziar lixeira” é definitivo e não pode ser desfeito pelo próprio sistema.'
    ]
  },
  {
    id: 'backup',
    title: 'Backup, importação e desfazer',
    summary: 'Proteja e transfira todos os dados da extensão.',
    items: [
      'Exportar gera um arquivo JSON com scripts, categorias, links, bloco de notas e preferências.',
      'Importar mescla o arquivo com os dados atuais e abre a revisão de possíveis duplicidades antes de concluir.',
      'Imediatamente antes de cada importação, a extensão cria uma cópia local automática do estado atual. Somente a cópia da última importação é mantida.',
      '“Desfazer última importação” restaura essa cópia, incluindo scripts, links, categorias, notas e preferências.',
      'O backup automático fica dentro do armazenamento da extensão. Exporte um arquivo antes de desinstalar, limpar os dados do navegador ou trocar de computador.'
    ],
    tip: 'Guarde periodicamente o JSON exportado em um local seguro.'
  },
  {
    id: 'appearance',
    title: 'Aparência e preferências',
    summary: 'Adapte cores, espaço da lista e integração por domínio.',
    items: [
      'Em Configurações, escolha um dos temas disponíveis; a preferência continua aplicada nas próximas aberturas.',
      'Na lista de scripts, altere a densidade para exibir cartões mais compactos ou mais confortáveis.',
      'A ordem das categorias, o tema, as abas do bloco e os sites desativados fazem parte das preferências incluídas no backup.'
    ]
  },
  {
    id: 'privacy',
    title: 'Dados, privacidade e capacidade',
    summary: 'Entenda onde as informações ficam armazenadas.',
    items: [
      'Scripts, links, categorias e notas ficam no armazenamento local da extensão neste perfil do navegador; não são enviados a uma conta ou nuvem pelo AtenaFlow.',
      'A capacidade prática depende do espaço disponível no dispositivo. Textos ocupam pouco espaço, portanto normalmente é possível manter milhares de itens.',
      'Desinstalar a extensão ou limpar seus dados pode remover tudo. O arquivo exportado é a proteção para recuperar os dados depois.'
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Solução de problemas',
    summary: 'Verificações rápidas quando algo não funcionar como esperado.',
    items: [
      'Após instalar uma nova versão, recarregue a extensão na página de extensões e atualize as abas dos sites que já estavam abertas.',
      'Se o botão flutuante não aparecer, confirme se o domínio não está desativado nas Configurações e clique novamente no campo de texto.',
      'Se o site usa um editor incomum, a inserção pode depender da compatibilidade desse campo. Copiar o script pela tela principal continua sendo uma alternativa.',
      'Se a pesquisa do botão abrir mas não aceitar digitação, feche e abra novamente com o campo focado; depois atualize a página. Persistindo, registre o site e o navegador para análise.',
      'Antes de reinstalar ou fazer uma correção mais ampla, exporte um backup completo.'
    ]
  }
];

const STYLES = `
  .manual-view{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--color-bg)}
  .manual-view__header{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border);flex-shrink:0}
  .manual-view__back{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-sm);color:var(--color-text-secondary)}
  .manual-view__back:hover{background:var(--color-bg-tertiary);color:var(--color-text)}
  .manual-view__title{font-size:var(--font-size-xl);font-weight:var(--font-weight-semibold);color:var(--color-text)}
  .manual-view__content{flex:1;overflow-y:auto;padding:var(--space-4);background:var(--color-bg-secondary)}
  .manual-view__intro{margin:0 0 var(--space-3);color:var(--color-text-secondary);font-size:var(--font-size-xs);line-height:1.45}
  .manual-search{position:sticky;top:0;z-index:2;padding-bottom:var(--space-3);background:var(--color-bg-secondary)}
  .manual-search input{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg);color:var(--color-text);outline:none}
  .manual-search input:focus{border-color:var(--color-primary);box-shadow:0 0 0 2px var(--color-primary-soft)}
  .manual-tools{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);color:var(--color-text-tertiary);font-size:11px}
  .manual-tools button{color:var(--color-primary);font-size:11px;font-weight:var(--font-weight-medium)}
  .manual-section{margin-bottom:var(--space-2);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg);overflow:hidden}
  .manual-section summary{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);cursor:pointer;list-style:none}
  .manual-section summary::-webkit-details-marker{display:none}
  .manual-section summary::after{content:'›';margin-left:auto;color:var(--color-text-tertiary);font-size:20px;transition:transform var(--transition-fast)}
  .manual-section[open] summary::after{transform:rotate(90deg)}
  .manual-section__heading{min-width:0}
  .manual-section__title{display:block;color:var(--color-text);font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold)}
  .manual-section__summary{display:block;margin-top:2px;color:var(--color-text-tertiary);font-size:10px;line-height:1.35}
  .manual-section__body{padding:0 var(--space-3) var(--space-3);border-top:1px solid var(--color-border)}
  .manual-section__body ol{margin:var(--space-3) 0 0;padding-left:20px;color:var(--color-text-secondary);font-size:var(--font-size-xs);line-height:1.5}
  .manual-section__body li+li{margin-top:6px}
  .manual-section__tip{margin:var(--space-3) 0 0;padding:8px 10px;border-radius:var(--radius-sm);background:var(--color-primary-soft);color:var(--color-text-secondary);font-size:11px;line-height:1.4}
  .manual-empty{display:none;padding:var(--space-5);text-align:center;color:var(--color-text-tertiary);font-size:var(--font-size-xs)}
  .manual-version{text-align:center;padding:var(--space-4) 0 var(--space-2);color:var(--color-text-tertiary);font-size:10px}
`;

let styleInjected = false;
function injectStyles(): void {
  if (styleInjected) {
    return;
  }
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

export function createManualView(): HTMLElement {
  injectStyles();
  const container = document.createElement('div');
  container.className = 'manual-view';

  const header = document.createElement('header');
  header.className = 'manual-view__header';
  const back = document.createElement('button');
  back.className = 'manual-view__back';
  back.setAttribute('aria-label', 'Voltar para configurações');
  back.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>';
  back.addEventListener('click', () => emit('view-changed', { view: 'settings' }));
  const title = document.createElement('span');
  title.className = 'manual-view__title';
  title.textContent = 'Manual de uso';
  header.append(back, title);

  const content = document.createElement('main');
  content.className = 'manual-view__content';
  const intro = document.createElement('p');
  intro.className = 'manual-view__intro';
  intro.textContent =
    'Guia completo do AtenaFlow. Pesquise uma dúvida ou abra um tópico para ver todos os detalhes.';
  const searchWrap = document.createElement('div');
  searchWrap.className = 'manual-search';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Buscar no manual…';
  search.setAttribute('aria-label', 'Buscar no manual');
  searchWrap.appendChild(search);
  const tools = document.createElement('div');
  tools.className = 'manual-tools';
  const resultCount = document.createElement('span');
  const toggleAll = document.createElement('button');
  toggleAll.textContent = 'Expandir tudo';
  tools.append(resultCount, toggleAll);
  const sectionsHost = document.createElement('div');
  const sectionElements: HTMLDetailsElement[] = [];

  MANUAL_SECTIONS.forEach((section) => {
    const details = document.createElement('details');
    details.className = 'manual-section';
    details.dataset.search = normalizeText(
      [section.title, section.summary, ...section.items, section.tip ?? ''].join(' ')
    );
    const summary = document.createElement('summary');
    const heading = document.createElement('span');
    heading.className = 'manual-section__heading';
    const headingTitle = document.createElement('span');
    headingTitle.className = 'manual-section__title';
    headingTitle.textContent = section.title;
    const headingSummary = document.createElement('span');
    headingSummary.className = 'manual-section__summary';
    headingSummary.textContent = section.summary;
    heading.append(headingTitle, headingSummary);
    summary.appendChild(heading);
    const body = document.createElement('div');
    body.className = 'manual-section__body';
    const list = document.createElement('ol');
    section.items.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    body.appendChild(list);
    if (section.tip) {
      const tip = document.createElement('p');
      tip.className = 'manual-section__tip';
      tip.textContent = `Dica: ${section.tip}`;
      body.appendChild(tip);
    }
    details.append(summary, body);
    sectionElements.push(details);
    sectionsHost.appendChild(details);
  });

  const empty = document.createElement('p');
  empty.className = 'manual-empty';
  empty.textContent = 'Nenhum tópico encontrado. Tente outra palavra.';
  const updateCount = (count: number) => {
    resultCount.textContent = `${count} ${count === 1 ? 'tópico' : 'tópicos'}`;
    empty.style.display = count ? 'none' : 'block';
  };
  updateCount(sectionElements.length);
  search.addEventListener('input', () => {
    const query = normalizeText(search.value).trim();
    let count = 0;
    sectionElements.forEach((section) => {
      const visible = !query || section.dataset.search!.includes(query);
      section.hidden = !visible;
      section.open = Boolean(query && visible);
      if (visible) {
        count += 1;
      }
    });
    updateCount(count);
  });
  toggleAll.addEventListener('click', () => {
    const visible = sectionElements.filter((section) => !section.hidden);
    const shouldOpen = visible.some((section) => !section.open);
    visible.forEach((section) => (section.open = shouldOpen));
    toggleAll.textContent = shouldOpen ? 'Recolher tudo' : 'Expandir tudo';
  });

  const version = document.createElement('div');
  version.className = 'manual-version';
  const manifestVersion =
    typeof chrome !== 'undefined' && chrome.runtime?.getManifest
      ? chrome.runtime.getManifest().version
      : '1.6.0';
  version.textContent = `AtenaFlow ${manifestVersion}`;
  content.append(intro, searchWrap, tools, sectionsHost, empty, version);
  container.append(header, content);
  return container;
}
