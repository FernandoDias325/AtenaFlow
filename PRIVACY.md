# Política de Privacidade

A extensão **AtenaFlow** (também conhecida na Chrome Web Store como **Atena Productivity Hub**) foi construída visando a segurança, autonomia e a **total privacidade** dos nossos usuários.

Nesta página, explicamos como os seus dados são gerenciados pela nossa ferramenta.

## 1. Armazenamento 100% Local (Offline)

Todo e qualquer dado, script, link, anotação de bloco de notas ou configuração inserido na extensão é gravado **única e exclusivamente no armazenamento local do seu próprio navegador**. Utilizamos tecnologias nativas do navegador, como o IndexedDB e o `chrome.storage`, para persistir seus dados.

- Nós não possuímos servidores em nuvem.
- Nós não temos acesso ao seu banco de dados.

## 2. Nenhuma Coleta de Dados

Nós **não coletamos**, não rastreamos, não interceptamos e não compartilhamos nenhum tipo de dado.

- Nada do que você digita é enviado para fora da sua máquina.
- Não utilizamos sistemas de métricas e analytics de terceiros dentro da extensão que rastreiem o seu comportamento.
- Não temos acesso a PII (Informações de Identificação Pessoal) ou dados financeiros.

## 3. Execução Offline e Fechada

O AtenaFlow roda inteiramente dentro da máquina do usuário (Client-side). Nenhum código remoto externo (como CDNs, scripts de rastreamento de terceiros ou injeções dinâmicas de código via servidores externos) é carregado. O pacote da extensão é fechado e autossuficiente.

### Integração com campos de texto

Para disponibilizar o botão flutuante de scripts, a extensão executa um componente local nas páginas visitadas. Esse componente identifica quando um campo de texto recebe foco e insere um script somente após uma ação do usuário. O conteúdo digitado na página não é armazenado, transmitido ou analisado pela extensão.

## 4. Uso de Permissões (Manifest V3)

Solicitamos apenas as permissões estritamente necessárias para o funcionamento dos recursos principais:

- `storage` e `unlimitedStorage`: Usadas apenas para que a extensão possa guardar seus textos e links localmente na sua própria máquina sem limites rígidos de cota que impeçam o uso do sistema.

## 5. Propriedade dos Dados

Você é o único dono dos seus dados.
O recurso de "Backup" integrado na extensão exporta um arquivo `.json` estritamente local (para o seu computador), permitindo que apenas você faça a portabilidade dos seus dados para outra máquina se desejar. Nós não fazemos o intermédio dessa transferência.

## 6. Alterações na Política de Privacidade

Como a extensão roda offline e não coleta dados, nossa postura sobre privacidade é permanente. Qualquer atualização de recursos na extensão que mude o comportamento de armazenamento será refletida diretamente aqui e nas permissões da loja.

---

_Se tiver alguma dúvida sobre o manuseio de dados ou quiser inspecionar o nosso código-fonte para auditoria, por favor abra uma Issue no nosso repositório oficial no GitHub._
