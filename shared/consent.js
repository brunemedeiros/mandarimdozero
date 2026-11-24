// ---------- Aviso de cookies + Google Analytics 4 com consentimento (Fase 3 do projeto GA4) ----------
// Decisões da dona (docs/historico/35-google-analytics-consentimento.md):
// - GA4 `G-CE3282C1FB`, só em app.profbrune.com.br, MODO BÁSICO: o código do Google só é baixado depois de "Aceitar todos"
//   (ou da chave "Medição de visitas" ligada em Preferências). Sem aceite, nenhum pedido vai ao Google.
// - Aviso "B1 nova" em formato compacto ("C2", 2026-11-16): sem título, ícone pequeno ao lado do texto, fundo claro; no
//   computador vira faixa larga e baixa. Botões "Recusar opcionais" e "Aceitar todos" do
//   mesmo tamanho e destaque, link "Política de cookies" e link discreto "Preferências" (janela com "Necessários, sempre
//   ativos" e a chave "Medição de visitas", que nasce DESLIGADA). A mesma janela abre pelo link "Preferências de cookies"
//   do rodapé e das Configurações (qualquer elemento com [data-consent-open]).
// - Nada de dado pessoal no Google: sem user_id, endereço limpo (só o caminho + utm_*; convite, token e outros parâmetros
//   nunca saem) na configuração e em todo evento (gtag('set') a cada página), sem Sinais do Google nem anúncios. Só mede
//   em app.profbrune.com.br. Cookies do GA4 com 13 meses (como diz a política).
// - Professora e admin não são medidas: no app, o GA4 só começa depois de saber quem está logado (setContext); se for
//   professora/admin, este aparelho fica marcado como "não contar" (também nas páginas abertas) e o GA4 nem carrega.
// - Recusar depois de aceitar apaga os cookies do GA4 e desliga o envio na hora.
// - App: telas viram páginas virtuais (tab_switch) e lições/recomeço viram eventos (trackEvent, shared/analytics.js chama
//   mirror()). Painéis de Admin e Professora nunca. Cadastro concluído = evento sign_up (index.html).
// - Os links com UTM: os utm_* da chegada ficam guardados nesta aba (sessionStorage) até a pessoa escolher; com o aceite, vão
//   na primeira visita medida; com a recusa, são apagados.
// Textos: chaves consent.* em shared/i18n (pt-BR e en) quando o catálogo existe (app e entrada); nas páginas sem catálogo
// (Sobre, privacidade, testes de nivelamento) vale o dicionário daqui, igual nas duas línguas.
// Uso: <script src=".../shared/consent.js" data-page="app|public"></script> + <link rel="stylesheet" href=".../shared/consent.css">.
// Grátis x Premium: vale igual para todos.
(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.ProfBruneConsent) return;

  var GA_ID = 'G-CE3282C1FB';
  var STORE_KEY = 'cookie-consent';      // { v, analytics, at }
  var STORE_VERSION = 1;                 // subir quando a política mudar de verdade: o aviso volta para todos
  var IGNORE_KEY = 'ga-ignore-device';   // '1' = aparelho de professora/admin: nunca medir
  var UTM_KEY = 'consent-utm';
  var COOKIE_EXPIRES = 34128000;         // 395 dias, cerca de 13 meses
  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var BLOCKED_TAB = /admin|teacher/i;    // Painel de Admin e Painel da Professora nunca viram página no GA4
  // Só mede no endereço de verdade (revisão diária, 2026-11-24): cópia local, prévia ou outro domínio nunca enviam nada.
  // O teste do aviso (tests/consentimento/) liga com window.__CONSENT_TEST__ = true.
  var MEASURE_HOST = 'app.profbrune.com.br';
  function hostAllowed(){ return location.hostname === MEASURE_HOST || !!window.__CONSENT_TEST__; }

  var me = document.currentScript;
  var PAGE = (me && me.dataset && me.dataset.page) || 'public';
  var ROOT = (function(){ try { return new URL('..', me.src).href; } catch (e) { return '/'; } })();
  var POLICY_URL = ROOT + 'privacidade-cookies.html';

  var TEXTS = {
    'pt-BR': {
      title: 'Cookies',
      text: 'Este site usa cookies para melhorar a sua experiência e medir as visitas.',
      policy: 'Política de cookies',
      reject: 'Recusar opcionais',
      accept: 'Aceitar todos',
      prefs: 'Preferências',
      prefsTitle: 'Preferências de cookies',
      prefsSub: 'Escolha o que o site pode usar. Dá para mudar quando quiser.',
      necTitle: 'Necessários',
      necText: 'Login, idioma, tema e funcionamento sem internet. Sem eles o site não funciona.',
      necAlways: 'Sempre ativos',
      anaTitle: 'Medição de visitas',
      anaText: 'Google Analytics: quantas pessoas visitam e de onde vêm. Sem nome nem e-mail.',
      save: 'Salvar escolha',
      close: 'Fechar'
    },
    en: {
      title: 'Cookies',
      text: 'This site uses cookies to improve your experience and measure visits.',
      policy: 'Cookie policy',
      reject: 'Reject optional',
      accept: 'Accept all',
      prefs: 'Preferences',
      prefsTitle: 'Cookie preferences',
      prefsSub: 'Choose what the site can use. You can change it any time.',
      necTitle: 'Necessary',
      necText: 'Sign-in, language, theme and the offline screen. The site doesn\'t work without them.',
      necAlways: 'Always on',
      anaTitle: 'Visit measurement',
      anaText: 'Google Analytics: how many people visit and where they come from. No name or email.',
      save: 'Save choice',
      close: 'Close'
    }
  };

  // ---------- idioma ----------
  function lang(){
    try { if (typeof getUiLang === 'function') return getUiLang() === 'en' ? 'en' : 'pt-BR'; } catch (e) {}
    var html = document.documentElement;
    if (html.getAttribute('data-consent-lang') === 'auto'){
      var stored = null;
      try { stored = localStorage.getItem('ui-language'); } catch (e) {}
      var nav = (navigator.language || '').toLowerCase();
      return stored ? (stored === 'en' ? 'en' : 'pt-BR') : (nav.indexOf('pt') === 0 ? 'pt-BR' : 'en');
    }
    return /^en/i.test(html.lang || '') ? 'en' : 'pt-BR';
  }
  function tx(k){
    try {
      if (typeof t === 'function'){ var v = t('consent.' + k); if (v && v !== 'consent.' + k) return v; }
    } catch (e) {}
    return TEXTS[lang()][k];
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- escolha guardada ----------
  function readChoice(){
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!v || v.v !== STORE_VERSION || typeof v.analytics !== 'boolean') return null;
      return v;
    } catch (e) { return null; }
  }
  function saveChoice(analytics){
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: STORE_VERSION, analytics: !!analytics, at: new Date().toISOString() })); } catch (e) {}
  }
  function deviceIgnored(){ try { return localStorage.getItem(IGNORE_KEY) === '1'; } catch (e) { return false; } }

  // ---------- endereço limpo (nada de convite, token, e-mail) ----------
  function readUtm(search){
    var out = {};
    try {
      var p = new URLSearchParams(search || '');
      UTM_PARAMS.forEach(function(k){ var v = p.get(k); if (v) out[k] = v.slice(0, 100); });
    } catch (e) {}
    return out;
  }
  function cleanLocation(pathOverride, utm){
    var u = new URL(location.href);
    var path = pathOverride || u.pathname;
    var q = new URLSearchParams();
    var src = utm || readUtm(u.search);
    UTM_PARAMS.forEach(function(k){ if (src[k]) q.set(k, src[k]); });
    var qs = q.toString();
    return u.origin + path + (qs ? '?' + qs : '');
  }
  function cleanReferrer(){
    try {
      if (!document.referrer) return '';
      var r = new URL(document.referrer);
      return r.origin + r.pathname;   // de fora: só de onde veio; de dentro: sem parâmetros
    } catch (e) { return ''; }
  }
  // utm_* da chegada: guardados só nesta aba, até a escolha
  (function rememberUtm(){
    var u = readUtm(location.search);
    if (Object.keys(u).length){ try { sessionStorage.setItem(UTM_KEY, JSON.stringify(u)); } catch (e) {} }
  })();
  function takeStoredUtm(){
    try { var v = JSON.parse(sessionStorage.getItem(UTM_KEY) || 'null'); sessionStorage.removeItem(UTM_KEY); return v; } catch (e) { return null; }
  }
  function dropStoredUtm(){ try { sessionStorage.removeItem(UTM_KEY); } catch (e) {} }

  // ---------- Google Analytics ----------
  var gaLoaded = false, gaOn = false, firstHit = true;
  var appContext = null;          // no app: null até saber quem está logado
  var pendingAppPage = null;      // página virtual que chegou antes do contexto

  function canMeasure(){
    var c = readChoice();
    if (!c || !c.analytics) return false;
    if (!hostAllowed()) return false;
    if (deviceIgnored()) return false;
    if (PAGE === 'app' && (!appContext || appContext.staff)) return false;
    return true;
  }
  function gtag(){ window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  function loadGA(){
    if (gaLoaded) return;
    gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    // Endereço e referência limpos já na configuração: TODO evento (lição, cadastro, clique de saída, os automáticos do
    // Google) sai com eles, não só o page_view (revisão diária, 2026-11-24). sendPage atualiza a cada página com gtag('set').
    var settings = {
      send_page_view: false,
      cookie_expires: COOKIE_EXPIRES,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: cleanLocation(null, {}),
      page_referrer: cleanReferrer()
    };
    // As mesmas regras com gtag('set') ANTES do 'js': a tag do Google desta propriedade se configura sozinha ao carregar e
    // ignora o gtag('config') da página (teste com o gtag.js real, 2026-11-24: sem isto saía um page_view automático com o
    // endereço completo, cookie de 400 dias e npa=0). O 'config' fica também, para o caso de o Google voltar a lê-lo.
    gtag('set', settings);
    gtag('js', new Date());
    gtag('config', GA_ID, settings);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }
  function startMeasuring(){
    if (!canMeasure()) return;
    loadGA();
    window['ga-disable-' + GA_ID] = false;
    gaOn = true;
    if (PAGE === 'app'){
      sendPage(pendingAppPage || null);
      pendingAppPage = null;
    } else sendPage(null);
  }
  function stopMeasuring(){
    gaOn = false;
    window['ga-disable-' + GA_ID] = true;
    deleteGaCookies();
  }
  function sendPage(virtualPath, title){
    if (!gaOn) return;
    var utm = firstHit ? (readUtm(location.search)) : null;
    if (firstHit && (!utm || !Object.keys(utm).length)) utm = takeStoredUtm() || {};
    else if (firstHit) dropStoredUtm();
    firstHit = false;
    var fields = {
      page_location: cleanLocation(virtualPath, utm || {}),
      page_referrer: cleanReferrer(),
      page_title: title || document.title
    };
    gtag('set', fields);                 // vale para os próximos eventos desta página (lição, cliques de saída...)
    gtag('event', 'page_view', fields);
  }
  function deleteGaCookies(){
    var names = document.cookie.split(';').map(function(c){ return c.split('=')[0].trim(); })
      .filter(function(n){ return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid'; });
    var host = location.hostname, parts = host.split('.'), domains = [''];
    for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    names.forEach(function(n){
      domains.forEach(function(d){
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  // ---------- telas ----------
  var banner = null, prefs = null;

  function bannerHTML(){
    // "C2" da dona (2026-11-16): sem o título, ícone pequeno ao lado do texto, fundo claro; no computador, faixa larga e baixa.
    return '<div class="cc-pop cc-banner" role="region" aria-label="' + esc(tx('title')) + '">'
      + '<div class="cc-head"><span class="cc-art" aria-hidden="true">📊</span><p class="cc-sub">' + esc(tx('text')) + '</p></div>'
      + '<div class="cc-body">'
      + '<p class="cc-policy"><a href="' + esc(POLICY_URL + (lang() === 'en' ? '#en' : '')) + '">' + esc(tx('policy')) + '</a></p>'
      + '<div class="cc-row"><button type="button" class="cc-btn" data-cc="reject">' + esc(tx('reject')) + '</button>'
      + '<button type="button" class="cc-btn cc-main" data-cc="accept">' + esc(tx('accept')) + '</button></div>'
      + '<p class="cc-more"><button type="button" class="cc-link" data-cc="prefs">' + esc(tx('prefs')) + '</button></p>'
      + '</div></div>';
  }
  function prefsHTML(on){
    return '<div class="cc-overlay" id="cc-prefs"><div class="cc-pop cc-modal" role="dialog" aria-modal="true" aria-labelledby="cc-prefs-title">'
      + '<div class="cc-head"><p class="cc-title" id="cc-prefs-title">' + esc(tx('prefsTitle')) + '</p>'
      + '<p class="cc-sub">' + esc(tx('prefsSub')) + '</p><span class="cc-art" aria-hidden="true">📊</span>'
      + '<button type="button" class="cc-x" data-cc="close" aria-label="' + esc(tx('close')) + '"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg></button></div>'
      + '<div class="cc-body">'
      + '<div class="cc-card"><div class="cc-cat"><div><p class="cc-cat-t">' + esc(tx('necTitle')) + '</p><p class="cc-cat-s">' + esc(tx('necText')) + '</p></div>'
      + '<span class="cc-always">' + esc(tx('necAlways')) + '</span></div></div>'
      + '<div class="cc-card"><label class="cc-cat" for="cc-analytics"><div><p class="cc-cat-t">' + esc(tx('anaTitle')) + '</p><p class="cc-cat-s">' + esc(tx('anaText')) + '</p></div>'
      + '<span class="cc-switch"><input type="checkbox" role="switch" id="cc-analytics"' + (on ? ' checked' : '') + '><span aria-hidden="true"></span></span></label></div>'
      + '<p class="cc-policy"><a href="' + esc(POLICY_URL + (lang() === 'en' ? '#en' : '')) + '">' + esc(tx('policy')) + '</a></p>'
      + '<div class="cc-row cc-row3"><button type="button" class="cc-btn" data-cc="reject">' + esc(tx('reject')) + '</button>'
      + '<button type="button" class="cc-btn" data-cc="save">' + esc(tx('save')) + '</button>'
      + '<button type="button" class="cc-btn cc-main" data-cc="accept">' + esc(tx('accept')) + '</button></div>'
      + '</div></div></div>';
  }
  function choose(analytics){
    var before = readChoice();
    saveChoice(analytics);
    closeBanner(); closePrefs();
    if (analytics) startMeasuring();
    else { dropStoredUtm(); if (gaLoaded || (before && before.analytics)) stopMeasuring(); else deleteGaCookies(); }
  }
  function onClick(e){
    var b = e.target.closest('[data-cc]');
    if (!b) return;
    var a = b.getAttribute('data-cc');
    if (a === 'accept') choose(true);
    else if (a === 'reject') choose(false);
    else if (a === 'prefs') openPrefs();
    else if (a === 'save'){ var sw = document.getElementById('cc-analytics'); choose(!!(sw && sw.checked)); }
    else if (a === 'close') closePrefs();
  }
  function showBanner(){
    if (banner || readChoice()) return;
    var wrap = document.createElement('div');
    wrap.id = 'cc-banner';
    wrap.className = 'cc-banner-wrap' + (PAGE === 'app' ? ' cc-in-app' : '');
    wrap.innerHTML = bannerHTML();
    wrap.addEventListener('click', onClick);
    document.body.appendChild(wrap);
    banner = wrap;
  }
  function closeBanner(){ if (banner){ banner.remove(); banner = null; } }
  function openPrefs(){
    closePrefs();
    var c = readChoice();
    var wrap = document.createElement('div');
    wrap.innerHTML = prefsHTML(!!(c && c.analytics));
    prefs = wrap.firstChild;
    prefs.addEventListener('click', function(e){ if (e.target === prefs) closePrefs(); else onClick(e); });
    prefs.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePrefs(); });
    document.body.appendChild(prefs);
    var sw = document.getElementById('cc-analytics');
    if (sw) try { sw.focus({ preventScroll: true }); } catch (e) {}
  }
  function closePrefs(){ if (prefs){ prefs.remove(); prefs = null; } }
  function repaint(){
    if (banner){ banner.innerHTML = bannerHTML(); }
    if (prefs){ var on = !!(document.getElementById('cc-analytics') || {}).checked; closePrefs(); openPrefs(); var sw = document.getElementById('cc-analytics'); if (sw) sw.checked = on; }
  }

  // ---------- ganchos para o site ----------
  // Chamado pelo app quando sabe quem está logado (shared/auth.js).
  function setContext(ctx){
    appContext = { staff: !!(ctx && ctx.staff) };
    if (appContext.staff){
      try { localStorage.setItem(IGNORE_KEY, '1'); } catch (e) {}
      if (gaOn) stopMeasuring();
      return;
    }
    if (!gaOn) startMeasuring();
  }
  // Espelho da medição própria (shared/analytics.js trackEvent): lista fechada de nomes, sem dado pessoal.
  function courseFromPath(){ var m = /^\/([a-z]{2})\//.exec(location.pathname); return m ? m[1] : ''; }
  function mirror(eventType, eventName){
    if (eventType === 'tab_switch'){
      var tab = String(eventName || '');
      if (!tab || BLOCKED_TAB.test(tab)) return;
      // Só nome de tela que existe de verdade (#view-<aba>): texto vindo do link (#qualquer-coisa) nunca vira página.
      if (!/^[a-z][a-z0-9-]{0,40}$/.test(tab) || !document.getElementById('view-' + tab)) return;
      var vpath = location.pathname.replace(/[^/]*$/, '') + tab;
      if (!gaOn){ if (PAGE === 'app') pendingAppPage = vpath; return; }
      sendPage(vpath, tab);
      return;
    }
    if (!gaOn) return;
    if (eventType === 'lesson_start' || eventType === 'lesson_complete'){
      gtag('event', eventType, { lesson_type: String(eventName || '').slice(0, 40), course: courseFromPath() });
    } else if (eventType === 'course_restart'){
      gtag('event', 'course_restart', { course: courseFromPath() });
    }
  }
  // Cadastro concluído (index.html). method: 'email' ou 'google'; course: 'fr', 'zh'...
  function signUp(method, course){
    if (!gaOn) return;
    gtag('event', 'sign_up', { method: method === 'google' ? 'google' : 'email', course: String(course || '').slice(0, 5) });
  }

  window.ProfBruneConsent = {
    open: openPrefs, setContext: setContext, mirror: mirror, signUp: signUp,
    choice: readChoice, measuring: function(){ return gaOn; },
    _cleanLocation: cleanLocation
  };

  function boot(){
    document.addEventListener('click', function(e){
      var o = e.target.closest && e.target.closest('[data-consent-open]');
      if (o){ e.preventDefault(); openPrefs(); }
    });
    try { window.addEventListener('i18n:change', repaint); } catch (e) {}
    var c = readChoice();
    // Navegador automático (testes do repositório, robôs: navigator.webdriver) não vê o aviso sozinho, senão ele cobre os
    // botões que os outros testes clicam. Sem escolha, o GA4 também não carrega ali. O teste do aviso liga com
    // window.__CONSENT_TEST__ = true (tests/consentimento/). Pessoas de verdade nunca têm navigator.webdriver.
    var automated = !!(navigator.webdriver && !window.__CONSENT_TEST__);
    if (!c){ if (!automated) showBanner(); }
    else if (c.analytics && PAGE !== 'app') startMeasuring();
    else if (!c.analytics) deleteGaCookies();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
