// Núcleo de internacionalização da INTERFACE (i18n, Etapa 2 -- piloto).
//
// Script global (sem build, sem módulo), carregado antes de pt-BR.js e de
// qualquer script que use t(). Ver docs/i18n/auditoria-textos.md (seção 3) e
// docs/i18n/etapa2-notas.md.
//
// Idioma de INTERFACE é um eixo SEPARADO do idioma ESTUDADO: nunca derivar
// de APP_KEY, Field.lang, language_app_key nem currentLearningLanguage.
// Neste piloto o idioma vem de:
//   (1) query ?ui=en|es|pt-BR (salva em localStorage 'ui-language');
//   (2) localStorage 'ui-language';
//   (3) padrão 'pt-BR'.
// TODO (fase seguinte): persistir na conta em progress.data._meta.uiLanguage
// (mesma linha/RLS de _meta.currentLearningLanguage, sem migração), lido
// antes do localStorage. NÃO gravamos em Supabase/progress neste piloto.
//
// Regras:
//   - t() nunca lança e nunca devolve vazio: en/es -> pt-BR -> a própria chave.
//   - pt-BR é a fonte da verdade e é IDÊNTICO ao texto que já está no HTML;
//     por isso applyDomI18n() não mexe no DOM enquanto o idioma for pt-BR
//     (o HTML continua com o português escrito, sem flash, funcionando mesmo
//     se este script falhar).
//   - en.js/es.js só são carregados sob demanda (injeção de <script>).

(function(){
  var UI_LANGS = ['pt-BR', 'en', 'es'];
  var DEFAULT_UI_LANG = 'pt-BR';
  var STORAGE_KEY = 'ui-language';

  window.I18N_CATALOG = window.I18N_CATALOG || {};

  function normalizeLang(v){
    if (!v) return null;
    var s = String(v).trim();
    for (var i = 0; i < UI_LANGS.length; i++){
      if (UI_LANGS[i].toLowerCase() === s.toLowerCase()) return UI_LANGS[i];
    }
    if (s.toLowerCase() === 'pt' || s.toLowerCase() === 'pt-br') return 'pt-BR';
    return null;
  }

  function storageGet(){ try { return window.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function storageSet(v){ try { window.localStorage.setItem(STORAGE_KEY, v); } catch (e) {} }

  function debugWarn(msg){
    try { if (window.I18N_DEBUG && window.console) console.warn('[i18n] ' + msg); } catch (e) {}
  }

  // Base de URL dos catálogos: mesma pasta deste arquivo.
  var BASE_URL = (function(){
    try {
      var cs = document.currentScript;
      if (cs && cs.src) return cs.src.replace(/[^\/]*$/, '');
    } catch (e) {}
    return '../shared/i18n/';
  })();

  function detectInitialLang(){
    var fromQuery = null;
    try {
      var q = new URLSearchParams(window.location.search).get('ui');
      fromQuery = normalizeLang(q);
    } catch (e) {}
    if (fromQuery){ storageSet(fromQuery); return fromQuery; }
    var stored = normalizeLang(storageGet());
    if (stored) return stored;
    return DEFAULT_UI_LANG;
  }

  var currentLang = detectInitialLang();

  function setHtmlLang(lang){
    try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
  }

  function getUiLang(){ return currentLang; }

  function lookup(lang, key){
    var cat = window.I18N_CATALOG[lang];
    if (cat && Object.prototype.hasOwnProperty.call(cat, key)) return cat[key];
    return undefined;
  }

  // Resolve a chave no idioma ativo com fallback -> pt-BR -> undefined.
  function resolve(key){
    var v = lookup(currentLang, key);
    if (v !== undefined && v !== null && v !== '') return { value: v, lang: currentLang };
    if (currentLang !== DEFAULT_UI_LANG){
      debugWarn('chave sem tradução em ' + currentLang + ': ' + key);
      v = lookup(DEFAULT_UI_LANG, key);
      if (v !== undefined && v !== null && v !== '') return { value: v, lang: DEFAULT_UI_LANG };
    }
    debugWarn('chave inexistente: ' + key);
    return null;
  }

  // Nunca devolve vazio: chave vazia/nula vira um marcador visível.
  function keyFallback(key){
    var s = (key === undefined || key === null) ? '' : String(key);
    return s || '[i18n]';
  }

  function interpolate(str, params){
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, function(m, name){
      return Object.prototype.hasOwnProperty.call(params, name) && params[name] !== undefined && params[name] !== null
        ? String(params[name]) : m;
    });
  }

  function t(key, params){
    try {
      var r = resolve(key);
      if (!r) return keyFallback(key);
      var v = r.value;
      if (typeof v === 'object') v = (v.other !== undefined ? v.other : v.one);
      if (v === undefined || v === null || v === '') return keyFallback(key);
      var out = interpolate(String(v), params);
      return out === '' ? keyFallback(key) : out;
    } catch (e) {
      return keyFallback(key);
    }
  }

  function pluralCategory(lang, n){
    try { return new Intl.PluralRules(lang).select(Number(n)); }
    catch (e) { return Number(n) === 1 ? 'one' : 'other'; }
  }

  // Plural: valor no catálogo é { one: '...', other: '...' } (ou outras
  // categorias de Intl.PluralRules). {n} é interpolado automaticamente.
  function tp(key, n, params){
    try {
      var r = resolve(key);
      if (!r) return keyFallback(key);
      var v = r.value;
      var p = Object.assign({ n: fmtNumber(n) }, params || {});
      if (typeof v !== 'object') return interpolate(String(v), p) || keyFallback(key);
      var cat = pluralCategory(r.lang, n);
      var chosen = v[cat] !== undefined ? v[cat] : (v.other !== undefined ? v.other : v.one);
      if (chosen === undefined || chosen === null || chosen === '') return keyFallback(key);
      return interpolate(String(chosen), p);
    } catch (e) {
      return keyFallback(key);
    }
  }

  function fmtNumber(n, opts){
    try { return new Intl.NumberFormat(currentLang, opts).format(n); }
    catch (e) { return String(n); }
  }

  function fmtDate(d, opts){
    try { return new Intl.DateTimeFormat(currentLang, opts).format(d instanceof Date ? d : new Date(d)); }
    catch (e) { return String(d); }
  }

  // Substitui só o primeiro nó de texto não-vazio direto do elemento,
  // preservando espaços nas pontas e elementos filhos (ex.:
  // "Quanto isso atrapalhou? <span>(opcional)</span>").
  function setElementText(el, text){
    var hasElementChild = false;
    for (var i = 0; i < el.childNodes.length; i++){
      if (el.childNodes[i].nodeType === 1){ hasElementChild = true; break; }
    }
    if (!hasElementChild){ el.textContent = text; return; }
    for (var j = 0; j < el.childNodes.length; j++){
      var node = el.childNodes[j];
      if (node.nodeType === 3 && node.nodeValue.trim() !== ''){
        var m = node.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
        node.nodeValue = (m ? m[1] : '') + text + (m ? m[2] : '');
        return;
      }
    }
    el.insertBefore(document.createTextNode(text + ' '), el.firstChild);
  }

  // Marcação mínima permitida em data-i18n-html: o texto é escapado e só
  // <strong>/<b>/<em> (sem atributos) voltam a ser tags. O catálogo é
  // código estático do próprio app, mas a lista curta evita que uma
  // tradução futura injete HTML arbitrário.
  var ALLOWED_INLINE_TAGS = /&lt;(\/?)(strong|b|em)&gt;/g;
  function safeInlineHtml(str){
    var esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return esc.replace(ALLOWED_INLINE_TAGS, '<$1$2>');
  }

  // data-i18n="chave", data-i18n-html="chave" (texto com <strong>/<b>/<em>)
  // e data-i18n-attr="placeholder:chave;aria-label:chave2".
  // Enquanto o idioma for pt-BR, só toca em elementos que já foram
  // traduzidos antes (para voltar ao português depois de um setUiLang).
  function applyDomI18n(root){
    try {
      root = root || document;
      var nodes = [];
      if (root.nodeType === 1 && (root.hasAttribute('data-i18n') || root.hasAttribute('data-i18n-attr') || root.hasAttribute('data-i18n-html'))) nodes.push(root);
      var found = root.querySelectorAll ? root.querySelectorAll('[data-i18n],[data-i18n-attr],[data-i18n-html]') : [];
      for (var i = 0; i < found.length; i++) nodes.push(found[i]);
      var isDefault = currentLang === DEFAULT_UI_LANG;
      nodes.forEach(function(el){
        if (isDefault && !el.hasAttribute('data-i18n-applied')) return;
        var key = el.getAttribute('data-i18n');
        if (key) setElementText(el, t(key));
        var htmlKey = el.getAttribute('data-i18n-html');
        if (htmlKey) el.innerHTML = safeInlineHtml(t(htmlKey));
        var attrSpec = el.getAttribute('data-i18n-attr');
        if (attrSpec){
          attrSpec.split(';').forEach(function(pair){
            var idx = pair.indexOf(':');
            if (idx < 0) return;
            var attr = pair.slice(0, idx).trim(), k = pair.slice(idx + 1).trim();
            if (attr && k) el.setAttribute(attr, t(k));
          });
        }
        if (!isDefault) el.setAttribute('data-i18n-applied', '1');
      });
    } catch (e) {
      debugWarn('applyDomI18n falhou: ' + (e && e.message));
    }
  }

  var loading = {};
  function loadCatalog(lang){
    if (lang === DEFAULT_UI_LANG || window.I18N_CATALOG[lang]) return Promise.resolve(true);
    if (loading[lang]) return loading[lang];
    loading[lang] = new Promise(function(resolveP){
      try {
        var s = document.createElement('script');
        s.src = BASE_URL + lang + '.js';
        s.async = true;
        s.onload = function(){ resolveP(true); };
        s.onerror = function(){ debugWarn('falha ao carregar catálogo ' + lang); delete loading[lang]; resolveP(false); };
        (document.head || document.documentElement).appendChild(s);
      } catch (e) { resolveP(false); }
    });
    return loading[lang];
  }

  function announce(){
    applyDomI18n(document);
    try { window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: currentLang } })); } catch (e) {}
  }

  function setUiLang(lang){
    var norm = normalizeLang(lang) || DEFAULT_UI_LANG;
    currentLang = norm;
    storageSet(norm);
    setHtmlLang(norm);
    return loadCatalog(norm).then(function(){
      if (currentLang === norm) announce();
      return norm;
    });
  }

  // Promise que resolve quando o catálogo do idioma inicial está pronto.
  var ready = (function(){
    setHtmlLang(currentLang);
    if (currentLang === DEFAULT_UI_LANG) return Promise.resolve(currentLang);
    return loadCatalog(currentLang).then(function(){
      var run = function(){ announce(); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
      else run();
      return currentLang;
    });
  })();

  // Seletor "Idioma da interface" (Configurações, fr/zh index.html,
  // #ui-language-select). Só existe no navegador: setUiLang() grava em
  // localStorage['ui-language']; NUNCA toca em APP_KEY, no idioma estudado
  // nem na conta (TODO acima: progress.data._meta.uiLanguage).
  // Espanhol está congelado: o núcleo ainda entende ?ui=es, mas o seletor
  // só oferece pt-BR e en.
  var SELECTABLE_UI_LANGS = ['pt-BR', 'en'];
  function syncUiLanguageSelect(){
    try {
      var sel = document.getElementById('ui-language-select');
      if (!sel) return;
      if (SELECTABLE_UI_LANGS.indexOf(currentLang) >= 0) sel.value = currentLang;
    } catch (e) {}
  }
  function wireUiLanguageSelect(){
    try {
      var sel = document.getElementById('ui-language-select');
      if (!sel || sel.getAttribute('data-i18n-wired')) return;
      sel.setAttribute('data-i18n-wired', '1');
      syncUiLanguageSelect();
      sel.addEventListener('change', function(){
        if (SELECTABLE_UI_LANGS.indexOf(sel.value) >= 0) setUiLang(sel.value);
      });
    } catch (e) {}
  }
  try {
    window.addEventListener('i18n:change', syncUiLanguageSelect);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUiLanguageSelect);
    else wireUiLanguageSelect();
  } catch (e) {}

  window.I18N_UI_LANGS = UI_LANGS.slice();
  window.I18N_SELECTABLE_UI_LANGS = SELECTABLE_UI_LANGS.slice();
  window.getUiLang = getUiLang;
  window.setUiLang = setUiLang;
  window.t = t;
  window.tp = tp;
  window.fmtDate = fmtDate;
  window.fmtNumber = fmtNumber;
  window.applyDomI18n = applyDomI18n;
  window.i18nReady = ready;
})();
