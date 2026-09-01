// Configuração central de idiomas da plataforma -- a lista que a página de
// seleção (index.html da raiz) e, futuramente, qualquer seletor de idioma
// dentro do app já logado leem pra saber o que existe. Adicionar um novo
// idioma é acrescentar um item aqui (+ a pasta languages/<id>/) -- nunca um
// novo if/else espalhado pelo código.
const AVAILABLE_LANGUAGES = [
  {
    id: 'fr',
    name: 'Francês',
    nativeName: 'Français',
    flagEmoji: '🇫🇷',
    path: 'languages/fr/index.html',
    accent: '#3498D6',
    icon: 'languages/fr/icons/icon-192.png',
    enabled: true,
  },
  {
    id: 'zh',
    name: 'Chinês',
    nativeName: '中文',
    flagEmoji: '🇨🇳',
    path: 'languages/zh/index.html',
    accent: '#C0231F',
    icon: 'languages/zh/icons/icon-192.png',
    enabled: true,
  },
];

const LAST_LANGUAGE_KEY = 'last_language';
