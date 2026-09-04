// ---------- Tema claro/escuro ----------
// Compartilhado entre todos os idiomas -- é preferência de quem está usando
// o app, não do conteúdo/idioma sendo estudado, por isso uma chave única
// (antes cada site tinha a sua: 'frances_theme' / 'mandarim_theme'; como os
// dois ainda vivem em origens/domínios separados nesta etapa da migração,
// trocar a chave agora não perde preferência de ninguém -- só já fica
// correto pro dia em que os dois idiomas passarem a ser a mesma origem).
//
// data-theme ausente = segue o sistema (ver @media prefers-color-scheme no
// CSS de cada idioma). 'light'/'dark' explícito no localStorage força o
// tema independente do SO. Depende de localStorageSafeGet/Set (shared/utils.js,
// carregado antes deste arquivo).
const THEME_STORAGE_KEY = 'app_theme';

function isDarkThemeActive(){
  const saved = localStorageSafeGet(THEME_STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Antes era um pill de ícone (sol/lua) direto na topbar; passou a viver
// dentro de Preferências (Configurações), mesmo switch on/off que as
// outras preferências (cloze/som) -- a topbar tinha pouco espaço e um
// toggle de tema não precisa de acesso de um clique só. Sem ícone
// customizado aqui: o próprio título "Modo escuro" já diz o que é.
function updateThemePrefSwitch(){
  const btn = document.getElementById('theme-pref-switch');
  if (btn) btn.setAttribute('aria-checked', isDarkThemeActive() ? 'true' : 'false');
}

function toggleTheme(){
  const next = isDarkThemeActive() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorageSafeSet(THEME_STORAGE_KEY, next);
  updateThemePrefSwitch();
}

document.getElementById('theme-pref-switch').addEventListener('click', toggleTheme);
updateThemePrefSwitch();
