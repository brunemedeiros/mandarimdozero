// i18n Etapa 2 -- Playwright (Chromium real), FR + ZH.
// Modal "Reportar problema ou sugestão" + pontos de entrada:
//   - pt-BR: texto/atributos idênticos ao BASELINE ORIGINAL (árvore do commit
//     e88fabb extraída com git archive e servida lado a lado);
//   - ?ui=en e ?ui=es: textos, placeholders, aria-label/title, botões e
//     rótulos de categoria/gravidade (gerados em JS) traduzidos;
//   - enviar um relato continua funcionando (stub de supabase.from('reports'));
//   - idioma ESTUDADO não muda (APP_KEY, language_app_key do relato).
// Passo "modais pequenos + seletor" (I18N_PREV, padrão 96558b7): os 3 modais
// (#premium-challenges-modal só no fr, #flashcard-limit-modal,
// #flashcard-reset-confirm-modal) idênticos ao commit anterior em pt-BR e em
// inglês com ?ui=en ou pelo seletor de Configurações (inclusive o texto que o
// JS injeta no preflight do limite); seletor persiste após reload, voltar para
// Português restaura o original; idioma estudado e conta nunca mudam; layout
// a 390px sem estouro.
// Rodar: node tests/i18n/test_playwright.js   (I18N_BASELINE sobrescreve o commit)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.I18N_BASELINE || 'e88fabb';
const BASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-base-'));
execSync(`git archive ${BASE} fr zh shared languages icons | tar -x -C ${BASE_DIR}`, { cwd: ROOT });
const PREV = process.env.I18N_PREV || '96558b7';
const PREV_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-prev-'));
execSync(`git archive ${PREV} fr zh shared languages icons | tar -x -C ${PREV_DIR}`, { cwd: ROOT });
// Mudança DELIBERADA de texto em português (aprovada pela dona do projeto) desde PREV:
// aplicada aos arquivos antigos servidos como referência. Qualquer outra diferença falha.
for (const rel of ['fr/index.html', 'zh/index.html', 'shared/i18n/pt-BR.js']) {
  const p = path.join(PREV_DIR, rel);
  if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split('arquive algum cartão que já não usa, ou peça').join('apague algum cartão, ou peça'));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
function makeServer(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}

const STUB = `
(function(){
  window.__reports = [];
  function builder(table){
    const st = { op: null, payload: null, head: false };
    const run = () => {
      if (table === 'reports' && st.op === 'insert'){ (st.payload || []).forEach(r => window.__reports.push(r)); return { data: null, error: null }; }
      if (st.head) return { data: null, count: 0, error: null };
      return { data: [], error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'select') return (_c, o) => { if (o && o.head) st.head = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

function loadCat(lang){
  const s = { window: {} }; vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'i18n', lang + '.js'), 'utf8'), s);
  return s.window.I18N_CATALOG[lang];
}
const CAT = { 'pt-BR': loadCat('pt-BR'), en: loadCat('en'), es: loadCat('es') };

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function boot(browser, port, lang, query){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html${query || ''}`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  return { ctx, page, errors };
}

// Snapshot de tudo que o usuário vê/ouve no recorte.
async function snapshot(page){
  return page.evaluate(() => {
    document.getElementById('report-topbar-btn').click();
    const m = document.getElementById('report-modal');
    const attrs = [...m.querySelectorAll('[placeholder],[aria-label],[title]')].map(e => [e.id, e.getAttribute('placeholder'), e.getAttribute('aria-label'), e.getAttribute('title')]);
    const entry = ['report-topbar-btn', 'report-flag-lesson-btn'].map(id => { const e = document.getElementById(id); return [id, e.getAttribute('aria-label'), e.getAttribute('title')]; });
    const menu = document.getElementById('report-menu-btn').textContent;
    const formText = document.getElementById('report-form-view').textContent.replace(/\s+/g, ' ').trim();
    const title = m.querySelector('.app-modal-header h3').textContent;
    const succ = document.getElementById('report-success-view').textContent.replace(/\s+/g, ' ').trim();
    const cats = [...m.querySelectorAll('.report-option-btn')].map(b => b.textContent);
    const sevs = [...m.querySelectorAll('.report-severity-btn')].map(b => b.textContent);
    return { attrs, entry, menu, formText, title, succ, cats, sevs, displayGuest: document.getElementById('report-guest-email-wrap').style.display };
  });
}

// Stub mais rico (mesmo contrato do tests/fase-f): decks/own_flashcards em
// memória + ensure_user_decks, para exercitar o preflight real do limite.
const STUB2 = `
(function(){
  let seq = 500;
  window.__DB = { decks: [], own_flashcards: [], teacher_students: [], reports: [] };
  function builder(table){
    const st = { filters: [], op: null, payload: null, single: false, head: false };
    const run = () => {
      const T = window.__DB[table] || (window.__DB[table] = []);
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        const created = list.map(r => Object.assign({ id: ++seq, status: 'active', revision: 0, created_at: new Date().toISOString(), tags: [] }, r));
        created.forEach(c => T.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      if (st.head) return { data: null, count: 0, error: null };
      const out = T.filter(r => st.filters.every(([k, v]) => r[k] === v));
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'select') return (_c, o) => { if (o && o.head) st.head = true; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      if (name !== 'ensure_user_decks') return { data: null, error: null };
      const D = window.__DB.decks, uid = args.p_owner_id, lang = args.p_language_app_key;
      let root = D.find(d => d.kind === 'root' && d.owner_id === uid && d.language_app_key === lang);
      if (!root){ root = { id: ++seq, kind: 'root', owner_id: uid, parent_deck_id: null, language_app_key: lang, name: 'root' }; D.push(root); }
      let pr = D.find(d => d.kind === 'personal_root' && d.owner_id === uid && d.language_app_key === lang);
      if (!pr){ pr = { id: ++seq, kind: 'personal_root', owner_id: uid, parent_deck_id: root.id, language_app_key: lang, name: 'Meus Decks' }; D.push(pr); }
      return { data: [{ root_deck_id: root.id, personal_root_deck_id: pr.id }], error: null };
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

async function boot2(ctx, port, lang, query){
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB2 }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html${query || ''}`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(() => window.i18nReady);
  return { page, errors };
}

const MODALS = [
  { id: 'premium-challenges-modal', frOnly: true },
  { id: 'flashcard-limit-modal' },
  { id: 'flashcard-reset-confirm-modal' },
];
// Snapshot do que o usuário vê em cada modal (abre, lê, fecha).
async function modalSnapshot(page, lang){
  return page.evaluate((ids) => ids.map(id => {
    const m = document.getElementById(id);
    if (!m) return [id, null];
    const prev = m.style.display; m.style.display = 'flex';
    const r = { title: m.querySelector('h3').textContent, closeAria: m.querySelector('.app-modal-close').getAttribute('aria-label'),
      ps: [...m.querySelectorAll('.app-modal-body p')].map(p => p.innerHTML), btns: [...m.querySelectorAll('.app-modal-body button')].map(b => b.textContent) };
    m.style.display = prev;
    return [id, r];
  }), MODALS.filter(x => !(x.frOnly && lang !== 'fr')).map(x => x.id));
}
function expectedModals(C, lang){
  const out = [];
  if (lang === 'fr') out.push(['premium-challenges-modal', { title: C['premium.challenges.title'], closeAria: C['common.close'], ps: [C['premium.challenges.bodyHtml'], C['premium.challenges.howToActivate']], btns: [] }]);
  out.push(['flashcard-limit-modal', { title: C['flashcardLimit.modal.title'], closeAria: C['common.close'], ps: [C['flashcardLimit.modal.bodyHtml']], btns: [] }]);
  out.push(['flashcard-reset-confirm-modal', { title: C['flashcardReset.modal.title'], closeAria: C['common.close'], ps: [C['flashcardReset.modal.body']], btns: [C['flashcardReset.modal.discard'], C['flashcardReset.modal.confirm']] }]);
  return out;
}
// Layout a ~390px: nenhum elemento do modal estoura a largura da tela.
async function modalOverflow(page, ids){
  return page.evaluate((ids) => ids.filter(id => document.getElementById(id)).map(id => {
    const m = document.getElementById(id); m.style.display = 'flex';
    const vw = document.documentElement.clientWidth;
    const bad = [...m.querySelectorAll('.app-modal, .app-modal *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5 || e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible' && e.tagName !== 'BUTTON'); }).map(e => e.tagName + '.' + e.className);
    const docOver = document.documentElement.scrollWidth > vw + 1;
    m.style.display = 'none';
    return [id, bad, docOver];
  }), ids);
}
async function otherStorage(page){
  return page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k !== 'ui-language') o[k] = localStorage.getItem(k); } return JSON.stringify(o); });
}
async function triggerWouldGenerate(page){
  // Premium com 19 cartões ativos: "Normal com reverso" geraria 2 -> preflight
  // bloqueia, injeta o texto em #my-create-flashcard-error e abre o modal.
  await page.evaluate(() => {
    CURRENT_USER = { id: 'u-i18n' };
    ensureProfileLoaded = async () => ({ plan_tier: 'premium' });
    window.__DB.own_flashcards = [];
    for (let i = 0; i < 19; i++) window.__DB.own_flashcards.push({ id: 9000 + i, owner_id: 'u-i18n', language_app_key: APP_KEY, status: 'active', deck_id: null, front: 'a' + i, back_trans: 'b', fields: null, card_generation_mode: null, revision: 0, tags: [], created_at: new Date().toISOString() });
    switchTab('my-flashcards');
  });
  await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
  await page.selectOption('#my-flashcard-card-type-preview', 'normal_reversed');
  const before = await page.locator('#my-flashcard-native-fields [data-field-content]').count();
  for (let i = before; i < 2; i++) await page.click('#my-flashcard-native-fields [data-field-add]');
  const inputs = page.locator('#my-flashcard-native-fields [data-field-content]');
  await inputs.nth(0).fill('x'); await inputs.nth(1).fill('y');
  const n0 = await page.evaluate(() => window.__DB.own_flashcards.length);
  await page.click('#my-create-flashcard-btn');
  await page.waitForFunction(() => document.getElementById('flashcard-limit-modal').style.display === 'flex', null, { timeout: 8000 });
  const r = await page.evaluate(() => ({ err: document.getElementById('my-create-flashcard-error').textContent, n: window.__DB.own_flashcards.length,
    title: document.querySelector('#flashcard-limit-modal h3').textContent }));
  await page.evaluate(() => { document.getElementById('flashcard-limit-modal').style.display = 'none'; CURRENT_USER = false; });
  return Object.assign(r, { n0 });
}

(async () => {
  const srvCur = makeServer(ROOT), srvBase = makeServer(BASE_DIR);
  await new Promise(r => srvCur.listen(0, '127.0.0.1', r));
  await new Promise(r => srvBase.listen(0, '127.0.0.1', r));
  const srvPrev = makeServer(PREV_DIR);
  await new Promise(r => srvPrev.listen(0, '127.0.0.1', r));
  const portCur = srvCur.address().port, portBase = srvBase.address().port, portPrev = srvPrev.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';

    // ---- baseline original ----
    const b = await boot(browser, portBase, lang, '');
    const baseSnap = await snapshot(b.page);
    const baseErrors = b.errors.slice();
    await b.ctx.close();

    // ---- pt-BR (padrão, sem query) ----
    const p = await boot(browser, portCur, lang, '');
    const ptSnap = await snapshot(p.page);
    L('pt-BR: snapshot idêntico ao baseline original', JSON.stringify(ptSnap) === JSON.stringify(baseSnap), { ptSnap, baseSnap });
    L('pt-BR: getUiLang = pt-BR, html lang = pt-BR', await p.page.evaluate(() => getUiLang() === 'pt-BR' && document.documentElement.lang === 'pt-BR'));
    L('pt-BR: en/es não carregados', await p.page.evaluate(() => !I18N_CATALOG.en && !I18N_CATALOG.es && !document.querySelector('script[src*="i18n/en.js"],script[src*="i18n/es.js"]')));
    L('pt-BR: nenhum elemento marcado como traduzido', await p.page.evaluate(() => document.querySelectorAll('[data-i18n-applied]').length === 0));
    L('pt-BR: zero pageerror novo vs baseline', p.errors.filter(e => !baseErrors.includes(e)).length === 0, p.errors);
    await p.ctx.close();

    for (const ui of ['en', 'es']){
      const C = CAT[ui];
      const s = await boot(browser, portCur, lang, '?ui=' + ui);
      const page = s.page;
      await page.waitForFunction(u => typeof I18N_CATALOG !== 'undefined' && !!I18N_CATALOG[u], ui);
      await page.waitForFunction(() => document.querySelectorAll('[data-i18n-applied]').length > 0);
      const snap = await snapshot(page);
      const U = (n, c, x) => L(`${ui}: ${n}`, c, x);
      U('getUiLang e html lang', await page.evaluate(u => getUiLang() === u && document.documentElement.lang === u, ui));
      U('localStorage ui-language salvo', await page.evaluate(u => localStorage.getItem('ui-language') === u, ui));
      U('título', snap.title === C['report.modal.title'], snap.title);
      U('aria-label do fechar', snap.attrs.some(a => a[0] === 'report-modal-close' && a[2] === C['common.close']), snap.attrs);
      U('placeholder descrição', snap.attrs.some(a => a[0] === 'report-description' && a[1] === C['report.modal.describePlaceholder']));
      U('placeholder e-mail', snap.attrs.some(a => a[0] === 'report-guest-email' && a[1] === C['report.modal.guestEmailPlaceholder']));
      U('pontos de entrada aria-label/title', snap.entry.every(e => e[1] === C['report.entry.label'] && e[2] === C['report.entry.label']), snap.entry);
      U('item do menu', snap.menu === C['report.entry.menuItem'], snap.menu);
      for (const k of ['report.modal.whatHappened', 'report.modal.howMuch', 'report.modal.optional', 'report.modal.describeLabel', 'report.modal.expectedLabel', 'report.modal.guestEmailLabel', 'report.modal.guestEmailOptional', 'report.modal.attachButton', 'report.modal.privacyNote', 'report.modal.submit'])
        U('texto ' + k, snap.formText.includes(C[k]), snap.formText);
      U('sucesso + fechar', snap.succ.includes(C['report.modal.successText']) && snap.succ.includes(C['common.close']));
      const expCats = ['bug_tecnico', 'erro_conteudo', 'traducao', 'audio', 'visual', 'comportamento_inesperado', 'sugestao_melhoria', 'outro'].map((id, i) => `${i + 1}. ${C['report.category.' + id]}`);
      U('rótulos de categoria (JS)', JSON.stringify(snap.cats) === JSON.stringify(expCats), snap.cats);
      U('rótulos de gravidade (JS)', JSON.stringify(snap.sevs) === JSON.stringify(['impede', 'dificulta', 'pequeno', 'sugestao'].map(id => C['report.severity.' + id])), snap.sevs);
      const ptLeft = Object.entries(CAT['pt-BR']).filter(([k, v]) => C[k] !== v && !k.startsWith('report.error') && !k.startsWith('report.toast') && k !== 'report.modal.sending' && v.length > 6 && (snap.formText + snap.title + snap.succ).includes(v)).map(([k]) => k);
      U('nenhum texto pt-BR sobrando no modal', ptLeft.length === 0, ptLeft);
      U('ids de categoria intactos', await page.evaluate(() => [...document.querySelectorAll('.report-option-btn')].map(b => b.dataset.category).join() === 'bug_tecnico,erro_conteudo,traducao,audio,visual,comportamento_inesperado,sugestao_melhoria,outro'));

      // erro de validação traduzido
      await page.click('#report-submit-btn');
      U('erro "escolha uma categoria" traduzido', (await page.textContent('#report-error')) === C['report.error.chooseCategory']);
      await page.click('.report-option-btn[data-category="traducao"]');
      await page.click('#report-submit-btn');
      U('erro "descreva" traduzido', (await page.textContent('#report-error')) === C['report.error.describe']);
      // envio
      const before = await page.evaluate(() => ({ appKey: APP_KEY, htmlLang: document.documentElement.lang }));
      await page.click('.report-severity-btn[data-severity="pequeno"]');
      await page.fill('#report-description', 'teste i18n ' + ui);
      await page.fill('#report-guest-email', 'a@b.co');
      await page.click('#report-submit-btn');
      await page.waitForFunction(() => document.getElementById('report-success-view').style.display === '');
      const sent = await page.evaluate(() => window.__reports.slice());
      U('relato enviado (1 insert)', sent.length === 1, sent);
      U('relato: categoria/gravidade por id estável', sent[0] && sent[0].category === 'traducao' && sent[0].severity_reported === 'pequeno' && sent[0].kind === 'problema');
      U('relato: idioma ESTUDADO preservado', sent[0] && sent[0].language_app_key === appKey);
      U('relato: e-mail do convidado', sent[0] && sent[0].reporter_email === 'a@b.co');
      U('toast de sucesso traduzido', await page.evaluate(m => [...document.querySelectorAll('*')].some(e => e.children.length === 0 && e.textContent === m), C['report.toast.success']));
      U('APP_KEY não mudou', await page.evaluate(k => APP_KEY === k, appKey) && before.appKey === appKey);
      // reenviar o mesmo -> duplicata traduzida
      await page.evaluate(() => document.getElementById('report-topbar-btn').click());
      await page.click('.report-option-btn[data-category="traducao"]');
      await page.fill('#report-description', 'teste i18n ' + ui);
      await page.click('#report-submit-btn');
      U('erro de duplicata traduzido', (await page.textContent('#report-error')) === C['report.error.duplicate']);
      // voltar pra pt-BR em tempo de execução restaura o português
      await page.evaluate(() => setUiLang('pt-BR'));
      const back = await page.evaluate(() => ({ title: document.querySelector('#report-modal h3').textContent, ph: document.getElementById('report-description').placeholder, cat: document.querySelector('.report-option-btn').textContent, lang: document.documentElement.lang }));
      U('setUiLang(pt-BR) restaura português', back.title === CAT['pt-BR']['report.modal.title'] && back.ph === CAT['pt-BR']['report.modal.describePlaceholder'] && back.cat === '1. ' + CAT['pt-BR']['report.category.bug_tecnico'] && back.lang === 'pt-BR', back);
      U('zero pageerror novo vs baseline', s.errors.filter(e => !baseErrors.includes(e)).length === 0, s.errors);
      await s.ctx.close();
    }

    // pt-BR: envio também funciona
    const q = await boot(browser, portCur, lang, '');
    await q.page.evaluate(() => document.getElementById('report-topbar-btn').click());
    await q.page.click('.report-option-btn[data-category="bug_tecnico"]');
    await q.page.fill('#report-description', 'teste pt');
    await q.page.click('#report-submit-btn');
    await q.page.waitForFunction(() => document.getElementById('report-success-view').style.display === '');
    L('pt-BR: relato enviado, idioma estudado preservado', await q.page.evaluate(k => window.__reports.length === 1 && window.__reports[0].language_app_key === k, appKey));
    await q.ctx.close();
  }

  // ================= modais pequenos + seletor de idioma =================
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang + ' (modais pequenos + seletor)');
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const ids = MODALS.filter(x => !(x.frOnly && lang !== 'fr')).map(x => x.id);

    // ---- referência: commit anterior (PREV), pt-BR ----
    const ctxP = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const pv = await boot2(ctxP, portPrev, lang, '');
    const prevSnap = await modalSnapshot(pv.page, lang);
    const prevWould = await triggerWouldGenerate(pv.page);
    const prevErrors = pv.errors.slice();
    await ctxP.close();
    L('referência: premium só no fr', lang === 'fr' ? prevSnap.length === 3 : prevSnap.length === 2);

    // ---- pt-BR atual == commit anterior ----
    const ctxA = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const a = await boot2(ctxA, portCur, lang, '');
    const ptSnap = await modalSnapshot(a.page, lang);
    L('pt-BR: 3 modais idênticos ao commit anterior', JSON.stringify(ptSnap) === JSON.stringify(prevSnap), { ptSnap, prevSnap });
    L('pt-BR: modais == catálogo pt-BR', JSON.stringify(ptSnap) === JSON.stringify(expectedModals(CAT['pt-BR'], lang)), ptSnap);
    const ptWould = await triggerWouldGenerate(a.page);
    L('pt-BR: texto do preflight (JS) idêntico ao commit anterior', ptWould.err === prevWould.err && ptWould.err === 'Este cartão geraria 2 cartão(ões) de estudo, mas restam só 1 no plano grátis.', [ptWould.err, prevWould.err]);
    L('pt-BR: preflight não gravou nada', ptWould.n === ptWould.n0);
    L('pt-BR: zero pageerror novo vs commit anterior', a.errors.filter(e => !prevErrors.includes(e)).length === 0, a.errors);

    // ---- seletor em Configurações ----
    const ev = (fn, arg) => a.page.evaluate(fn, arg);
    const before = { appKey: await ev(() => APP_KEY), user: await ev(() => CURRENT_USER), storage: await otherStorage(a.page) };
    await ev(() => switchTab('settings'));
    await a.page.waitForSelector('#ui-language-select', { state: 'visible', timeout: 8000 });
    const selInfo = await ev(() => { const s = document.getElementById('ui-language-select'); return { opts: [...s.options].map(o => [o.value, o.textContent]), value: s.value, title: s.closest('.pref-row').querySelector('.pref-row-title').textContent, inGeral: !!s.closest('#settings-geral-content') }; });
    L('seletor: em Configurações > Geral, ao lado das preferências', selInfo.inGeral && selInfo.title === CAT['pt-BR']['settings.uiLanguage.title'], selInfo);
    L('seletor: só Português (Brasil) e English, nomes no próprio idioma', JSON.stringify(selInfo.opts) === JSON.stringify([['pt-BR', 'Português (Brasil)'], ['en', 'English']]), selInfo.opts);
    L('seletor: valor inicial pt-BR', selInfo.value === 'pt-BR');
    await a.page.selectOption('#ui-language-select', 'en');
    await a.page.click('#ui-language-confirm-yes'); // aviso novo ao trocar o idioma do site
    await a.page.waitForFunction(() => getUiLang() === 'en' && !!I18N_CATALOG.en && document.querySelectorAll('[data-i18n-applied]').length > 0);
    const C = CAT.en;
    L('seletor -> en: html lang, localStorage', await ev(() => document.documentElement.lang === 'en' && localStorage.getItem('ui-language') === 'en'));
    L('seletor -> en: rótulos do seletor em inglês', await ev(([t1, t2]) => { const r = document.getElementById('ui-language-select').closest('.pref-row'); return r.querySelector('.pref-row-title').textContent === t1 && r.querySelector('.pref-row-sub').textContent === t2 && document.getElementById('ui-language-select').getAttribute('aria-label') === t1; }, [C['settings.uiLanguage.title'], C['settings.uiLanguage.sub']]));
    L('seletor -> en: nomes de idioma não traduzidos', await ev(() => [...document.getElementById('ui-language-select').options].map(o => o.textContent).join('|') === 'Português (Brasil)|English'));
    const enSnap = await modalSnapshot(a.page, lang);
    L('seletor -> en: modais em inglês', JSON.stringify(enSnap) === JSON.stringify(expectedModals(C, lang)), enSnap);
    L('en: <strong> preservado e sem HTML extra', await ev(() => { const p = document.querySelector('#flashcard-limit-modal .app-modal-body p'); return p.querySelectorAll('*').length === 1 && p.querySelector('strong') && p.querySelector('strong').textContent === '20 active cards of your own'; }));
    const enWould = await triggerWouldGenerate(a.page);
    L('en: texto do preflight (JS) em inglês, plural', enWould.err === 'This card would create 2 study cards, but you only have 1 left on the free plan.' && enWould.title === C['flashcardLimit.modal.title'], enWould);
    L('en: preflight não gravou nada', enWould.n === enWould.n0);
    // modal de reinício pelo caminho real (openFlashcardResetConfirm) e "Discard changes" fecha sem confirmar
    const reset = await ev(() => { let ok = 0; openFlashcardResetConfirm(() => { ok++; }); const m = document.getElementById('flashcard-reset-confirm-modal'); const shown = m.style.display; const txt = document.getElementById('flashcard-reset-confirm-discard').textContent; document.getElementById('flashcard-reset-confirm-discard').click(); return { shown, txt, closed: m.style.display, ok }; });
    L('en: confirmação de reinício abre em inglês e "Discard changes" fecha sem confirmar', reset.shown === 'flex' && reset.txt === 'Discard changes' && reset.closed === 'none' && reset.ok === 0, reset);
    if (lang === 'fr'){
      const pm = await ev(() => { openPremiumChallengesModal(); const m = document.getElementById('premium-challenges-modal'); const r = { shown: m.style.display, title: m.querySelector('h3').textContent }; document.getElementById('premium-challenges-modal-close').click(); r.closed = m.style.display; return r; });
      L('en: modal Premium (openPremiumChallengesModal) em inglês e fecha', pm.shown === 'flex' && pm.title === C['premium.challenges.title'] && pm.closed === 'none', pm);
    }
    L('en: idioma estudado e conta intactos', await ev(() => APP_KEY) === before.appKey && before.appKey === appKey && JSON.stringify(await ev(() => CURRENT_USER)) === JSON.stringify(before.user) && (await otherStorage(a.page)) === before.storage);

    // ---- reload: persiste ----
    const b2 = await boot2(ctxA, portCur, lang, '');
    await b2.page.waitForFunction(() => getUiLang() === 'en' && document.querySelectorAll('[data-i18n-applied]').length > 0, null, { timeout: 10000 });
    await b2.page.evaluate(() => switchTab('settings'));
    const reload = await b2.page.evaluate(() => ({ lang: document.documentElement.lang, val: document.getElementById('ui-language-select').value, title: document.querySelector('#flashcard-limit-modal h3').textContent, app: APP_KEY }));
    L('reload: idioma en persiste (html lang, seletor, modal)', reload.lang === 'en' && reload.val === 'en' && reload.title === C['flashcardLimit.modal.title'] && reload.app === appKey, reload);
    // voltar para Português restaura o original
    await b2.page.selectOption('#ui-language-select', 'pt-BR');
    await b2.page.click('#ui-language-confirm-yes');
    await b2.page.waitForFunction(() => getUiLang() === 'pt-BR' && document.documentElement.lang === 'pt-BR');
    const backSnap = await modalSnapshot(b2.page, lang);
    L('voltar para Português: modais idênticos ao commit anterior', JSON.stringify(backSnap) === JSON.stringify(prevSnap), backSnap);
    L('voltar para Português: rótulo do seletor original', await b2.page.evaluate(t => document.getElementById('ui-language-select').closest('.pref-row').querySelector('.pref-row-title').textContent === t && localStorage.getItem('ui-language') === 'pt-BR', CAT['pt-BR']['settings.uiLanguage.title']));
    const backWould = await triggerWouldGenerate(b2.page);
    L('voltar para Português: preflight (JS) volta ao texto original', backWould.err === prevWould.err, backWould.err);
    L('voltar para Português: idioma estudado intacto', await b2.page.evaluate(() => APP_KEY) === appKey);
    L('zero pageerror novo (seletor/en/reload)', [...a.errors, ...b2.errors].filter(e => !prevErrors.includes(e)).length === 0, [...a.errors, ...b2.errors]);
    await ctxA.close();

    // ---- ?ui=en também funciona sem o seletor ----
    const ctxQ = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const q = await boot2(ctxQ, portCur, lang, '?ui=en');
    await q.page.waitForFunction(() => document.querySelectorAll('[data-i18n-applied]').length > 0);
    L('?ui=en: modais em inglês', JSON.stringify(await modalSnapshot(q.page, lang)) === JSON.stringify(expectedModals(C, lang)));
    // tradução maliciosa: data-i18n-html só permite <strong>/<b>/<em>
    const xss = await q.page.evaluate(() => { I18N_CATALOG.en['flashcardLimit.modal.bodyHtml'] = 'a <strong>b</strong> <img src=x onerror="window.__x=1"> <em>c</em>'; applyDomI18n(document); const p = document.querySelector('#flashcard-limit-modal .app-modal-body p'); return { tags: [...p.querySelectorAll('*')].map(e => e.tagName).join(','), x: window.__x }; });
    L('data-i18n-html escapa tags fora da lista curta', xss.tags === 'STRONG,EM' && xss.x === undefined, xss);
    await ctxQ.close();

    // ---- celular ~390px: en não quebra o layout (claro e escuro) ----
    for (const theme of ['light', 'dark']){
      const ctxM = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme });
      const mb = await boot2(ctxM, portCur, lang, '?ui=en');
      await mb.page.waitForFunction(() => document.querySelectorAll('[data-i18n-applied]').length > 0);
      await mb.page.evaluate(th => document.documentElement.setAttribute('data-theme', th), theme);
      const ov = await modalOverflow(mb.page, ids);
      L(`390px ${theme}: modais em inglês sem estouro`, ov.every(([, bad, doc]) => bad.length === 0 && !doc), ov);
      await mb.page.evaluate(() => switchTab('settings'));
      await mb.page.waitForSelector('#ui-language-select', { state: 'visible' });
      const sl = await mb.page.evaluate(() => { const s = document.getElementById('ui-language-select'), row = s.closest('.pref-row'); const rs = s.getBoundingClientRect(), rr = row.getBoundingClientRect(); const cs = getComputedStyle(s); return { inside: rs.right <= rr.right + 0.5 && rs.left >= rr.left - 0.5, docOver: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, color: cs.color, bg: cs.backgroundColor }; });
      L(`390px ${theme}: seletor dentro da linha, sem estouro, cor do texto != fundo`, sl.inside && !sl.docOver && sl.color !== sl.bg, sl);
      await mb.page.screenshot({ path: path.join(os.tmpdir(), `i18n-${lang}-${theme}-settings.png`) });
      await ctxM.close();
    }
  }
  await browser.close(); srvCur.close(); srvBase.close(); srvPrev.close();
  fs.rmSync(PREV_DIR, { recursive: true, force: true });
  fs.rmSync(BASE_DIR, { recursive: true, force: true });
  console.log(`\n${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
