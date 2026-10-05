// i18n Etapa 2 -- testes Node/vm: t/tp/fallback/interpolação/PluralRules,
// t nunca lança, paridade de chaves, e REGRESSÃO: cada string pt-BR existe
// byte a byte no texto ORIGINAL (git show <baseline>:<arquivo>).
// Baseline padrão = e88fabb (último commit antes da Etapa 2); I18N_BASELINE
// sobrescreve. Passo "modais pequenos + seletor": I18N_PREV (padrão 96558b7,
// último commit antes desse passo) é a referência byte a byte do HTML/JS.
// Espanhol CONGELADO: só exigimos que es não tenha órfãs; en == pt-BR.
// Rodar: node tests/i18n/test_i18n_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const I18N = path.join(ROOT, 'shared', 'i18n');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function makeEnv({ search = '', stored = null, debug = false } = {}){
  const store = {}; if (stored) store['ui-language'] = stored;
  const warns = [];
  const htmlAttrs = {};
  const sandbox = {
    console: { warn: (m) => warns.push(m), log(){} },
    URLSearchParams, Intl, Promise, Object, String, Number, CustomEvent: function(n, o){ this.type = n; this.detail = o && o.detail; },
  };
  sandbox.window = sandbox;
  sandbox.I18N_DEBUG = debug;
  sandbox.location = { search };
  sandbox.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const events = [];
  sandbox.dispatchEvent = (e) => events.push(e);
  sandbox.document = {
    currentScript: { src: 'http://x/shared/i18n/i18n.js' },
    readyState: 'complete',
    documentElement: { setAttribute: (k, v) => { htmlAttrs[k] = v; } },
    head: { appendChild: (s) => {
      const lang = s.src.match(/([\w-]+)\.js$/)[1];
      vm.runInContext(fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8'), sandbox);
      setTimeout(() => s.onload && s.onload(), 0);
    } },
    createElement: () => ({}),
    querySelectorAll: () => [],
    addEventListener(){},
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(I18N, 'i18n.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(I18N, 'pt-BR.js'), 'utf8'), sandbox);
  return { w: sandbox, store, warns, htmlAttrs, events };
}

(async () => {
  // ---- detecção de idioma ----
  let e = makeEnv();
  check('padrão pt-BR', e.w.getUiLang() === 'pt-BR');
  check('html lang pt-BR', e.htmlAttrs.lang === 'pt-BR');
  e = makeEnv({ search: '?ui=en' });
  check('?ui=en -> en', e.w.getUiLang() === 'en');
  check('?ui=en salvo em localStorage', e.store['ui-language'] === 'en');
  check('html lang en', e.htmlAttrs.lang === 'en');
  await e.w.i18nReady;
  check('en.js carregado sob demanda', !!e.w.I18N_CATALOG.en);
  check('t em en', e.w.t('common.close') === 'Close');
  check('evento i18n:change disparado', e.events.some(x => x.type === 'i18n:change' && x.detail.lang === 'en'));
  e = makeEnv({ stored: 'es' });
  check('localStorage es -> es', e.w.getUiLang() === 'es');
  e = makeEnv({ search: '?ui=xx', stored: 'es' });
  check('?ui inválido cai no localStorage', e.w.getUiLang() === 'es');
  e = makeEnv({ stored: 'klingon' });
  check('localStorage inválido -> pt-BR', e.w.getUiLang() === 'pt-BR');
  e = makeEnv({ search: '?ui=pt-br' });
  check('?ui=pt-br normalizado', e.w.getUiLang() === 'pt-BR');
  check('pt-BR não injeta catálogo', !e.w.I18N_CATALOG.en && !e.w.I18N_CATALOG.es);

  // ---- t / fallback / interpolação ----
  e = makeEnv();
  const W = e.w;
  check('t pt-BR', W.t('report.modal.submit') === 'Enviar');
  check('t chave inexistente devolve a própria chave', W.t('nao.existe') === 'nao.existe');
  check('t nunca vazio com chave vazia', W.t('') === '' ? false : true, W.t(''));
  let threw = false;
  try { [undefined, null, 42, {}, [], 'a.b'].forEach(k => { const r = W.t(k); if (typeof r !== 'string') throw new Error('nao string'); }); } catch (x) { threw = true; }
  check('t nunca lança, sempre string', !threw);
  W.I18N_CATALOG['pt-BR']['test.hello'] = 'Olá, {nome}! Você tem {n} itens. {faltando}';
  check('interpolação', W.t('test.hello', { nome: 'Ana', n: 3 }) === 'Olá, Ana! Você tem 3 itens. {faltando}');
  check('interpolação sem params mantém placeholders', W.t('test.hello') === 'Olá, {nome}! Você tem {n} itens. {faltando}');
  await W.setUiLang('en');
  check('setUiLang en', W.getUiLang() === 'en' && e.store['ui-language'] === 'en' && e.htmlAttrs.lang === 'en');
  check('fallback en -> pt-BR (chave só em pt-BR)', W.t('test.hello', { nome: 'X', n: 1 }) === 'Olá, X! Você tem 1 itens. {faltando}');
  W.I18N_CATALOG.en['test.empty'] = '';
  W.I18N_CATALOG['pt-BR']['test.empty'] = 'vazio pt';
  check('valor vazio em en cai em pt-BR', W.t('test.empty') === 'vazio pt');
  check('chave inexistente em en devolve a chave', W.t('nada.aqui') === 'nada.aqui');
  e.warns.length = 0; W.t('nada.aqui');
  check('sem I18N_DEBUG não há console.warn', e.warns.length === 0);
  const ed = makeEnv({ debug: true }); ed.w.t('nada.aqui');
  check('com I18N_DEBUG há console.warn', ed.warns.length > 0);

  // ---- tp / Intl.PluralRules ----
  const PL = { one: '{n} cartão', other: '{n} cartões' };
  const PLen = { one: '{n} card', other: '{n} cards' };
  const PLes = { one: '{n} tarjeta', other: '{n} tarjetas' };
  for (const [lang, obj, cases] of [
    ['pt-BR', PL, [[0, '0 cartão'], [1, '1 cartão'], [2, '2 cartões'], [5, '5 cartões']]],
    ['en', PLen, [[0, '0 cards'], [1, '1 card'], [2, '2 cards']]],
    ['es', PLes, [[0, '0 tarjetas'], [1, '1 tarjeta'], [2, '2 tarjetas']]],
  ]){
    const env = makeEnv();
    if (lang !== 'pt-BR'){ await env.w.setUiLang(lang); }
    env.w.I18N_CATALOG[lang]['test.cards'] = obj;
    for (const [n, exp] of cases){
      const got = env.w.tp('test.cards', n);
      check(`tp ${lang} n=${n}`, got === exp, got);
    }
    check(`PluralRules ${lang} 1=one`, new Intl.PluralRules(lang).select(1) === 'one');
  }
  check('tp chave inexistente', W.tp('nada', 3) === 'nada');
  check('tp em string simples', W.tp('report.modal.submit', 2) === 'Send');
  check('t em objeto plural usa other', (() => { W.I18N_CATALOG.en['test.p'] = { one: 'a', other: 'b' }; return W.t('test.p') === 'b'; })());
  check('fmtNumber en', W.fmtNumber(1234.5) === '1,234.5');
  await W.setUiLang('pt-BR');
  check('fmtNumber pt-BR', W.fmtNumber(1234.5) === '1.234,5');
  check('fmtDate pt-BR', W.fmtDate(new Date(Date.UTC(2026, 0, 15, 12)), { timeZone: 'UTC' }) === '15/01/2026');
  check('fmtDate nunca lança', typeof W.fmtDate('lixo') === 'string');

  // ---- paridade de chaves ----
  const cat = (lang) => { const s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8'), s); return s.window.I18N_CATALOG[lang]; };
  const pt = cat('pt-BR'), en = cat('en'), es = cat('es');
  const ptKeys = Object.keys(pt).sort();
  check('en tem as mesmas chaves de pt-BR', JSON.stringify(Object.keys(en).sort()) === JSON.stringify(ptKeys), ptKeys.filter(k => !(k in en)));
  check('es (congelado) não tem chaves órfãs', Object.keys(es).every(k => k in pt), Object.keys(es).filter(k => !(k in pt)));
  const nonEmpty = (v) => typeof v === 'string' ? v.trim() !== '' : (v && typeof v === 'object' && Object.values(v).length > 0 && Object.values(v).every(x => typeof x === 'string' && x.trim() !== ''));
  check('nenhum valor vazio', [pt, en, es].every(c => Object.values(c).every(nonEmpty)));
  // Valores legitimamente iguais nos dois idiomas (nomes próprios, abreviações, números).
  const EN_SAME_AS_PT_OK = ['myFlashcards.badge.premium', 'myFlashcards.edit.pinyin', 'myFlashcards.native.cardType', 'notif.pref.matrix.app', 'notif.pref.matrix.push', 'notif.pref.titleMatrixPush', 'notif.time.day', 'notif.time.hour', 'notif.time.min', 'review.mode.flashcard.name', 'review.mode.speed.name', 'review.speed.points', 'toast.pointsGain', 'toast.xpGain', 'trail.premiumBadge', 'preview.err.detail', 'review.interval.min', 'review.interval.hour', 'leaderboard.rowBadge', 'publicProfile.labelPinyin', 'publicProfile.sectionFlashcards', 'fieldEditor.lang.zhPinyin', 'fieldEditor.audio.rate.normal', 'taEditor.pinyinLabel', 'admin.analytics.tech.perf', 'admin.badges.create.icon', 'admin.badges.grant.badge', 'admin.badges.grant.usernamePh', 'admin.modal.report.status', 'admin.modal.report.title', 'admin.mode.off', 'admin.mode.on', 'admin.mode.pillLabel', 'admin.mode.title', 'admin.panel.tab.analytics', 'admin.panel.tab.flashcards', 'admin.panel.tab.premium', 'admin.panel.tab.badges', 'admin.panel.tab.reports', 'adminChallenges.import.itemN', 'admin.flashcards.cardType.normal', 'admin.flashcards.dest.countSubdecks', 'admin.flashcards.dest.deckFallback', 'admin.flashcards.dest.newSub', 'admin.materials.badgeLink'];
  const sameKeys = ptKeys.filter(k => !EN_SAME_AS_PT_OK.includes(k) && JSON.stringify(en[k]) === JSON.stringify(pt[k]));
  check('en difere de pt-BR (traduzido)', sameKeys.length === 0, sameKeys);
  // comentário de confiança em cada linha de chave de en/es
  for (const lang of ['en', 'es']){
    const lines = fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8').split('\n').filter(l => /^\s*'[\w.-]+':/.test(l));
    const expected = lang === 'en' ? ptKeys.length : Object.keys(es).length;
    check(`${lang}: toda chave tem comentário de confiança`, lines.length === expected && lines.every(l => /\/\/ (ALTA|MÉDIA|BAIXA)/.test(l)), [lines.length, expected]);
  }
  check('seletor oferece só pt-BR e en (es congelado)', JSON.stringify(W.I18N_SELECTABLE_UI_LANGS) === JSON.stringify(['pt-BR', 'en']));
  // es congelado: chave nova cai em pt-BR
  { const ee = makeEnv(); await ee.w.setUiLang('es');
    check('es: chave sem tradução cai em pt-BR', ee.w.t('flashcardReset.modal.confirm') === 'Sim' && ee.w.t('common.close') === 'Cerrar'); }
  // plural real em en; pt-BR idêntico ao template original com n cru
  { const pe = makeEnv();
    check('pt-BR wouldGenerate idêntico ao original', pe.w.tp('flashcardLimit.wouldGenerate', 1234, { n: 1234, remaining: 2 }) === 'Este cartão geraria 1234 cartão(ões) de estudo, mas restam só 2 no plano grátis.');
    await pe.w.setUiLang('en');
    check('en wouldGenerate n=1 (singular)', pe.w.tp('flashcardLimit.wouldGenerate', 1, { n: 1, remaining: 0 }) === 'This card would create 1 study card, but you only have 0 left on the free plan.');
    check('en wouldGenerate n=3 (plural)', pe.w.tp('flashcardLimit.wouldGenerate', 3, { n: 3, remaining: 2 }) === 'This card would create 3 study cards, but you only have 2 left on the free plan.'); }

  // ---- REGRESSÃO contra o texto original ----
  const BASE = process.env.I18N_BASELINE || 'e88fabb';
  const orig = (f) => execSync(`git show ${BASE}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const origFr = orig('fr/index.html'), origZh = orig('zh/index.html'), origRep = orig('shared/reports.js');
  const PREV = process.env.I18N_PREV || '96558b7';
  // Mudanças DELIBERADAS de texto em português (aprovadas pela dona do projeto) desde o
  // commit PREV: aplicadas ao texto antigo antes de comparar. Qualquer outra diferença falha.
  const DELIBERATE_PT_CHANGES = [['arquive algum cartão que já não usa, ou peça', 'apague algum cartão, ou peça']];
  const prev = (f) => DELIBERATE_PT_CHANGES.reduce((acc, [o, n]) => acc.split(o).join(n), execSync(`git show ${PREV}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }));
  const prevFr = prev('fr/index.html'), prevZh = prev('zh/index.html');
  const prevJs = ['shared/my-flashcards.js', 'shared/public-profile.js', 'shared/anki-import-ui.js', 'fr/app.js', 'zh/app.js', 'shared/flashcard-model.js', 'shared/own-flashcards.js', 'shared/flashcard-preview.js', 'shared/notifications.js', 'shared/notification-preferences.js', 'shared/deck-data.js', 'shared/admin-students.js', 'shared/profile.js', 'shared/leaderboard.js', 'shared/auth.js', 'shared/support-materials-view.js', 'shared/anki-export.js', 'shared/flashcard-field-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/flashcard-cloze-editor.js', 'shared/admin-flashcards.js', 'shared/admin-class-logs.js', 'shared/admin-support-materials.js', 'shared/admin-premium.js', 'shared/teacher-flashcards.js', 'shared/teacher-class-logs.js', 'shared/teacher-support-materials.js', 'shared/admin-analytics.js', 'shared/admin-badges.js', 'shared/admin-notifications.js', 'shared/admin-reports.js', 'shared/flashcard-field-audio-recorder.js', 'shared/wizard.js', 'shared/language-switcher.js', 'shared/fsrs.js'].map(prev).join('\n');
  const all = origFr + origZh + origRep + prevFr + prevZh + prevJs;
  // Textos NOVOS (não existiam antes): só o seletor de idioma.
  const NEW_KEYS = ['settings.uiLanguage.title', 'settings.uiLanguage.sub', 'content.untranslatedNotice', 'fr.challenge.lt.placeholder' /* Fase 9: "{lang}" parametriza o idioma da tradução; com lang=português o texto final é idêntico ao original "Sua tradução em português..." */]; // Fase 8: aviso novo (só aparece fora do pt-BR)
  const NESTED_TEMPLATE_KEYS = ['admin.reports.reply.lastSent', 'admin.reports.reply.lastSentTo'];
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const k of ptKeys){
    if (NEW_KEYS.includes(k)) continue;
    const v = pt[k];
    // Plural por categoria ({one, other}): no original o plural era montado por código (módulo${n===1?'':'s'}).
    if (v && typeof v === 'object'){ check(`regressão: pt-BR '${k}' (plural) tem one e other`, typeof v.one === 'string' && typeof v.other === 'string'); continue; }
    // Mustache literal ({{amount}}) é texto, não placeholder: byte a byte. Templates com
    // expressão aninhada no original (`${a}${b ? `...${c}` : ''}`) checam cada fragmento.
    if (/\{\{\w+\}\}/.test(v)){ check(`regressão: pt-BR '${k}' (mustache literal) existe byte a byte no original`, all.includes(v), v); continue; }
    if (NESTED_TEMPLATE_KEYS.includes(k)){ check(`regressão: pt-BR '${k}' (template aninhado) fragmentos existem no original`, v.split(/\{\w+\}/).map(x => x.trim()).filter(Boolean).every(x => all.includes(x)), v); continue; }
    if (/\{\w+\}/.test(v)){
      // placeholder {x} <-> ${...} do template literal original
      const re = new RegExp(v.split(/\{\w+\}/).map(escRe).join('\\$\\{[^}]+\\}'));
      check(`regressão: pt-BR '${k}' (template) existe no original`, re.test(all), v);
    } else {
      check(`regressão: pt-BR '${k}' existe byte a byte no original`, all.includes(v), v);
    }
  }
  // HTML atual: o texto padrão continua escrito (data-i18n não removeu texto)
  for (const lang of ['fr', 'zh']){
    const cur = fs.readFileSync(path.join(ROOT, lang, 'index.html'), 'utf8');
    const o = lang === 'fr' ? origFr : origZh;
    // Fase 8: linhas novas deliberadas (aviso de lição sem tradução + script do overlay).
    const strip = (s) => s.replace(/ data-i18n(-attr|-html)?="[^"]*"/g, '').replace(/\n[ ]*<p class="lesson-unit-goal" id="ud-lang-notice"[^\n]*<\/p>/, '').replace(/<script src="..\/shared\/content-i18n.js"><\/script>\n/, '').replace(/<script src="..\/shared\/translation-compare.js"><\/script>\n/, '');
    const modal = (s) => s.slice(s.indexOf('<!-- ===== MODAL: REPORTAR'), s.indexOf('<div id="streak-modal-overlay"'));
    check(`${lang}: modal atual sem data-i18n == modal original`, strip(modal(cur)) === modal(o));
    // Passo "modais pequenos + seletor": contra o commit anterior (PREV), a
    // única diferença além dos atributos data-i18n* é o bloco do seletor.
    const p = lang === 'fr' ? prevFr : prevZh;
    const selStart = cur.indexOf('      <div class="pref-row">\n        <div class="pref-row-text">\n          <div class="pref-row-title" data-i18n="settings.uiLanguage.title">');
    const selEnd = cur.indexOf('</select>\n      </div>\n', selStart) + '</select>\n      </div>\n'.length;
    check(`${lang}: bloco do seletor encontrado`, selStart > 0 && selEnd > selStart);
    const curNoSel = cur.slice(0, selStart) + cur.slice(selEnd);
    check(`${lang}: HTML inteiro sem data-i18n* e sem o seletor == commit anterior (${PREV})`, strip(curNoSel) === strip(p));
    check(`${lang}: seletor só oferece pt-BR e English`, /<option value="pt-BR" lang="pt-BR">Português \(Brasil\)<\/option>\s*<option value="en" lang="en">English<\/option>\s*<\/select>/.test(cur.slice(selStart, selEnd)));
    const usedHtml = [...cur.matchAll(/data-i18n-html="([^"]+)"/g)].map(m => m[1]);
    check(`${lang}: todo data-i18n-html existe em pt-BR`, usedHtml.every(k => k in pt));
    // o innerHTML original do elemento == valor pt-BR (byte a byte)
    for (const k of usedHtml){
      const m = cur.match(new RegExp('data-i18n-html="' + escRe(k) + '">([\\s\\S]*?)</p>'));
      check(`${lang}: innerHTML de ${k} == pt-BR`, m && m[1] === pt[k]);
    }
    const used = [...cur.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
    check(`${lang}: todo data-i18n existe em pt-BR`, used.every(k => k in pt), used.filter(k => !(k in pt)));
  }
  // reports.js: rótulos literais preservados (admin-reports.js lê c.label)
  const sb = { window: {}, document: { getElementById: () => null, addEventListener(){}, querySelectorAll: () => [] }, localStorageSafeGet: () => null, localStorageSafeSet(){}, fetch: () => Promise.reject(), addEventListener(){} };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'reports.js'), 'utf8') + '\n;window.__C = REPORT_CATEGORIES; window.__S = REPORT_SEVERITIES; window.__RT = reportT;', sb);
  check('categorias: ids e ordem iguais', sb.__C.map(c => c.id).join() === 'bug_tecnico,erro_conteudo,traducao,audio,visual,comportamento_inesperado,sugestao_melhoria,outro');
  check('categorias: label pt-BR == catálogo', sb.__C.every(c => pt[c.labelKey] === c.label));
  check('gravidades: label pt-BR == catálogo', sb.__S.every(s => pt[s.labelKey] === s.label));
  check('reportT sem núcleo i18n cai no texto original', sb.__RT('report.modal.submit', 'Enviar') === 'Enviar');

  console.log(`\n${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
