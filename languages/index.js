// Configuração central de idiomas da plataforma -- a lista que a página de
// seleção (index.html da raiz) e, futuramente, qualquer seletor de idioma
// dentro do app já logado leem pra saber o que existe. Adicionar um novo
// idioma é acrescentar um item aqui (+ a pasta languages/<id>/) -- nunca um
// novo if/else espalhado pelo código.
// flagSvg existe porque o emoji de bandeira (par de "regional indicator
// symbols" Unicode) depende de o SO ter uma fonte de emoji com glifos de
// bandeira -- o Windows deliberadamente NÃO inclui bandeiras na fonte padrão
// (Segoe UI Emoji), então navegadores que usam a fonte do sistema (Edge,
// Firefox) mostram só o código de 2 letras ("FR"/"CN") em vez da bandeira;
// só o Chrome (que embute sua própria fonte de emoji) renderiza certo. Um
// SVG inline sempre desenha igual, em qualquer navegador/SO.
const AVAILABLE_LANGUAGES = [
  {
    id: 'fr',
    name: 'Francês',
    nativeName: 'Français',
    flagSvg: '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bandeira da França"><rect width="1" height="2" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#FFFFFF"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>',
    path: 'languages/fr/index.html',
    accent: '#3498D6',
    icon: 'languages/fr/icons/icon-192.png',
    enabled: true,
  },
  {
    id: 'zh',
    name: 'Chinês',
    nativeName: '中文',
    flagSvg: '<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bandeira da China"><rect width="30" height="20" fill="#DE2910"/><polygon points="5,2 5.67,4.08 7.85,4.07 6.08,5.35 6.76,7.43 5,6.14 3.24,7.43 3.92,5.35 2.15,4.07 4.33,4.08" fill="#FFDE00"/><polygon points="10,1 10.22,1.69 10.95,1.69 10.36,2.12 10.59,2.81 10,2.38 9.41,2.81 9.64,2.12 9.05,1.69 9.78,1.69" fill="#FFDE00"/><polygon points="12,3 12.22,3.69 12.95,3.69 12.36,4.12 12.59,4.81 12,4.38 11.41,4.81 11.64,4.12 11.05,3.69 11.78,3.69" fill="#FFDE00"/><polygon points="12,6 12.22,6.69 12.95,6.69 12.36,7.12 12.59,7.81 12,7.38 11.41,7.81 11.64,7.12 11.05,6.69 11.78,6.69" fill="#FFDE00"/><polygon points="10,8 10.22,8.69 10.95,8.69 10.36,9.12 10.59,9.81 10,9.38 9.41,9.81 9.64,9.12 9.05,8.69 9.78,8.69" fill="#FFDE00"/></svg>',
    path: 'languages/zh/index.html',
    accent: '#C0231F',
    icon: 'languages/zh/icons/icon-192.png',
    enabled: true,
  },
];

const LAST_LANGUAGE_KEY = 'last_language';
