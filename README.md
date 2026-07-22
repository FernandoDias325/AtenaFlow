<div align="center">
  <img src="public/icon.png" width="128" alt="AtenaFlow Logo" />

# AtenaFlow (Atena Productivity Hub)

**O seu segundo cérebro de scripts de atendimento, links rápidos e anotações produtivas.**
</div>

---

AtenaFlow é uma extensão para Google Chrome ultra-rápida (desenvolvida com o manifesto V3) focada em guardar e organizar seus roteiros, URLs importantes e anotações. Cadastre, classifique por categorias e copie em milissegundos sem perder o foco na aba principal!

## 🚀 Recursos Principais

- 📝 **Scripts e Templates**: Gerencie seus roteiros de atendimento por categorias. Copie textos em 1 clique com suporte a injeção nativa em plataformas como WhatsApp Web.
- 🔗 **Links Rápidos (Novo)**: Uma aba dedicada para salvar, categorizar e acessar seus links e URLs mais acessados do dia a dia.
- 📓 **Bloco de Notas Avançado (Novo)**: Um editor de texto rico integrado (Rich Text) com suporte a negrito, marca-texto, listas, tabelas e blocos de código. Suas notas são salvas automaticamente a cada tecla digitada!
- 🗂️ **Categorias Customizadas**: Organize tudo por área, departamento ou fase do funil.
- ⚡ **Pesquisa Instantânea**: Digite e veja os resultados filtrarem em tempo real.
- ♻️ **Lixeira Inteligente**: Recuperação de scripts e links apagados acidentalmente.
- 🌗 **Tema Escuro Nativo**: Alternância entre Light e Dark Mode fluida.
- 💾 **Backup Completo em JSON**: Exporte todos os seus dados (scripts, links, categorias) e importe-os com mesclagem inteligente.

## 🛠️ Tecnologias Utilizadas

- [WXT (Web Extension Tools)](https://wxt.dev)
- TypeScript Puro (Sem frameworks pesados)
- Vanilla JS & CSS Modules com Design Tokens
- Banco de Dados Local (IndexedDB via `idb`)
- Arquitetura de Eventos Customizada (Pub/Sub)

## 🔐 Política de Privacidade

O AtenaFlow é uma ferramenta 100% focada na **privacidade** e no armazenamento local (offline). Nós não possuímos servidores e não coletamos seus dados.

Leia nossa [Política de Privacidade completa aqui](PRIVACY.md).

## 🚀 Como instalar para desenvolvimento

1. Clone o repositório.
2. Instale as dependências com `npm install`.
3. Rode `npm run dev` para iniciar o ambiente de desenvolvimento em tempo real (WXT).
4. Para gerar o build de produção (arquivo ZIP para a Chrome Web Store), rode `npm run zip`.
