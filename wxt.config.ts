import { defineConfig } from 'wxt';

// Configuração do WXT (wxt.dev)
export default defineConfig({
  manifest: {
    name: 'AtenaFlow',
    description: 'Seu segundo cérebro de scripts de atendimento. Cadastre, busque e copie em segundos.',
    version: '1.1.0',
    permissions: [
      'storage',
      'unlimitedStorage'
    ],
    icons: {
      '128': 'icon.png'
    },
    action: {
      default_title: 'Abrir AtenaFlow',
      default_icon: 'icon.png'
    },
    web_accessible_resources: [
      {
        resources: ['icon.png'],
        matches: ['<all_urls>']
      }
    ]
  }
});
