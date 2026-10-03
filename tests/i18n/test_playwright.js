// i18n Etapa 2 -- Playwright (Chromium real), FR + ZH.
// Modal "Reportar problema ou sugestão" + pontos de entrada:
//   - pt-BR: texto/atributos idênticos ao BASELINE ORIGINAL (árvore do commit
//     e88fabb extraída com git archive e servida lado a lado);
//   - ?ui=en e ?ui=es: textos, placeholders, aria-label/title, botões e
//     rótulos de categoria/gravidade (gerados em JS) traduzidos;
//   - enviar um relato continua funcionando (stub de supabase.from('reports'));
//   - idioma ESTUDADO não muda (APP_KEY, language_app_key do relato).
// Rodar: node tests/i18n/test_playwright.js   (I18N_BASELINE sobrescreve o commit)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.I18N_BASELINE || 'e88fabb';
const BASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-base-'));
execSync(`git archive ${BASE} fr zh shared languages icons | tar -x -C ${BASE_DIR}`, { cwd: ROOT });

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

(async () => {
  const srvCur = makeServer(ROOT), srvBase = makeServer(BASE_DIR);
  await new Promise(r => srvCur.listen(0, '127.0.0.1', r));
  await new Promise(r => srvBase.listen(0, '127.0.0.1', r));
  const portCur = srvCur.address().port, portBase = srvBase.address().port;
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
  await browser.close(); srvCur.close(); srvBase.close();
  fs.rmSync(BASE_DIR, { recursive: true, force: true });
  console.log(`\n${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
