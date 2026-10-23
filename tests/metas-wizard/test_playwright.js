// Janela "Minha meta de estudo" (shared/wizard.js) com estilo nos dois sites (2026-10-23): no zh faltavam as
// regras .wizard-level-* e os botões de nível e de lições por dia saíam com a cara padrão do navegador.
// Rodar: node tests/metas-wizard/test_playwright.js  (SHOTS=dir para prints)
// sessão, topo/menu/cartões somem (como nas lições) e aparece a ⚑ ao lado do link de voltar;
// ao sair, tudo volta. O foco de uma lição da trilha não é mexido. fr e zh (Revisão).
// Harness do navegador de Decks (convidado + Supabase stubado).
// Rodar: node tests/modo-foco/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { decks: [], own_flashcards: [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return row[k] === v; }
    const exec = () => {
      const rows = (window.__DB[table] || []);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.patch));
        window.__writes.push({ table, op: 'update', patch: st.patch, ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (st.op === 'delete'){
        const hit = rows.filter(match);
        window.__DB[table] = rows.filter(r => !hit.includes(r));
        window.__writes.push({ table, op: 'delete', ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (table === 'decks') return rows.filter(match);
      return rows.filter(match);
    };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => Promise.resolve({ data: exec(), error: null }).then(ok, ko);
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
      if (prop === 'update') return (p) => { st.op = 'update'; st.patch = p; return b; };
      if (prop === 'delete') return () => { st.op = 'delete'; return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
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

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}


const state = (page) => page.evaluate(() => {
  const vis = sel => Array.from(document.querySelectorAll(sel)).some(el => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
  return { focus: document.body.classList.contains('lesson-focus'), owner: document.body.dataset.activityFocus || null,
    topbar: vis('.topbar'), sidebar: vis('.sidebar'), cards: vis('.right-cards'), flag: vis('.activity-report-btn') };
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const SHOTS = process.env.SHOTS;
  for (const lang of ['fr', 'zh']) for (const [theme, w] of [['light', 1200], ['dark', 1200], ['light', 390]]){
    const tag = `${lang} ${theme}/${w}`;
    const { page, errors, ctx } = await bootPage(browser, lang, port, theme, { width: w, height: 900 });
    await page.evaluate(() => openStudyPlanModal());
    for (const step of ['level', 'lessons']){
      await page.evaluate(s => { STUDY_WIZARD.step = STUDY_WIZARD_STEPS.indexOf(s); renderStudyWizardStep(); }, step);
      await page.waitForSelector('.wizard-level-row');
      const r = await page.evaluate(() => { const b = document.querySelector('.wizard-level-row'); const c = getComputedStyle(b);
        const circ = getComputedStyle(document.querySelector('.wizard-level-circle'));
        return { rows: document.querySelectorAll('.wizard-level-row').length, border: c.borderTopStyle, bg: c.backgroundColor, display: c.display,
          circleRadius: circ.borderTopLeftRadius, circleW: circ.width, overflow: document.documentElement.scrollWidth <= innerWidth + 1 }; });
      check(`${tag} ${step}: linhas com estilo (sem borda de botão, flex, círculo redondo de 40px)`,
        r.rows >= 1 && r.border === 'none' && r.display === 'flex' && r.circleRadius === '50%' && r.circleW === '40px' && r.overflow, r);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/meta-${lang}-${theme}-${w}-${step}.png` });
    }
    check(`${tag}: zero pageerror`, errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Meta de estudo playwright: ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
