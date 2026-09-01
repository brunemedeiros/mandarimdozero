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

// Ícones em SVG (fill: currentColor) em vez de emoji ☀️/🌙 — o emoji da lua
// rendeva quase invisível (é só um risco fino) em cima do fundo claro do
// pill, mesmo problema de contraste que já resolvemos nas bandeiras.
const THEME_ICON_SUN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M2.5 12h3M18.5 12h3M6.6 17.4l-2.1 2.1M19.5 4.5l-2.1 2.1"/></svg>';
const THEME_ICON_MOON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.35 15.35A9 9 0 0 1 8.65 3.65 9.003 9.003 0 1 0 20.35 15.35Z"/></svg>';

function updateThemeToggleIcon(){
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = isDarkThemeActive() ? THEME_ICON_SUN : THEME_ICON_MOON;
}

function toggleTheme(){
  const next = isDarkThemeActive() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorageSafeSet(THEME_STORAGE_KEY, next);
  updateThemeToggleIcon();
}

document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
updateThemeToggleIcon();
