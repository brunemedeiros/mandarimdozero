// Etapa 3, lote A (a1/a2): a trilha e os cartões laterais são pintados no boot, antes de o catálogo en e o
// content.en.js chegarem. Este teste confere, em fr e zh (Chromium real):
//   1. boot com o site em inglês: a primeira pintura da trilha (sem re-render manual) já está em inglês;
//   2. troca de idioma com a trilha na tela: repinta na hora;
//   3. troca de idioma com OUTRA aba na frente: cartões laterais repintam; a trilha repinta ao voltar;
//   4. troca de idioma no meio de uma lição: a trilha NÃO é repintada e o que a pessoa digitou continua lá;
//      ao sair da lição a trilha volta no idioma novo.
// Rodar: node tests/i18n/test_trilha_repinta_idioma.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function boot(browser, port, app, lang){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((lang) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); localStorage.removeItem('frances_trail_view'); localStorage.removeItem('mandarim_trail_view'); } catch (e) {} }, lang);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`http://127.0.0.1:${port}/${app}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 30000 });
  await page.evaluate(() => window.i18nReady);
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const trailText = () => (document.getElementById('units-grid').innerText || '');
const sideText = () => (document.querySelector('.right-cards').textContent || ''); // textContent: a aba Configurações esconde Missões por CSS

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']){
    console.log('== ' + app);
    // 1. boot em inglês, sem re-render manual
    { const { ctx, page, errors } = await boot(browser, port, app, 'en');
      const r = await page.evaluate(() => ({ trail: document.getElementById('units-grid').innerText, side: document.querySelector('.right-cards').innerText, toggle: document.querySelector('.trail-view-toggle').getAttribute('aria-label') }));
      check(`${app}: boot en: cartão Continuar em inglês`, /Start here|Pick up where you left off/i.test(r.trail) && /lessons completed/.test(r.trail) && !/lições|Comece por aqui/.test(r.trail), r.trail.slice(0, 300));
      check(`${app}: boot en: unidades da trilha em inglês`, /Greeting and saying goodbye/.test(r.trail) && !/Cumprimentar e se despedir/.test(r.trail), r.trail.slice(0, 300));
      check(`${app}: boot en: cartões laterais em inglês`, /Daily missions/.test(r.side) && !/Missões do dia/.test(r.side), r.side);
      check(`${app}: boot en: alternador Trilha/Mapa em inglês`, r.toggle === 'Trail view mode', r.toggle);
      check(`${app}: boot en: sem erro de página`, errors.length === 0, errors);
      await ctx.close();
    }
    // 2-4. boot em português e troca de idioma
    { const { ctx, page, errors } = await boot(browser, port, app, 'pt-BR');
      check(`${app}: boot pt-BR: trilha em português`, /Comece por aqui|COMECE POR AQUI/i.test(await page.evaluate(trailText)));
      // 2. trilha na tela
      await page.evaluate(() => setUiLang('en')); await page.waitForTimeout(1200);
      let t = await page.evaluate(trailText);
      check(`${app}: troca com a trilha na tela: repinta em inglês`, /Start here/i.test(t) && /Greeting and saying goodbye/.test(t) && !/lições/.test(t), t.slice(0, 300));
      // 3. outra aba na frente
      await page.evaluate(() => setUiLang('pt-BR')); await page.waitForTimeout(600);
      await page.evaluate(() => switchTab('settings'));
      await page.evaluate(() => setUiLang('en')); await page.waitForTimeout(1000);
      const side = await page.evaluate(sideText);
      check(`${app}: troca em outra aba: cartões laterais repintam`, /Daily missions/.test(side) && !/Missões do dia/.test(side), side);
      await page.evaluate(() => switchTab('path')); await page.waitForTimeout(300);
      t = await page.evaluate(trailText);
      check(`${app}: volta para a trilha: em inglês`, /Start here/i.test(t) && !/lições/.test(t), t.slice(0, 300));
      // 4. no meio de uma lição
      await page.evaluate(() => setUiLang('pt-BR')); await page.waitForTimeout(600);
      await page.evaluate(() => openUnitDetail(UNITS[0].id)); await page.waitForTimeout(500);
      const before = await page.evaluate(() => {
        const g = document.getElementById('units-grid'); window.__gridMark = g.firstElementChild; // nó atual: se repintar, é trocado
        const inp = document.createElement('input'); inp.id = '__typed'; inp.value = 'bonjour tout le monde';
        document.getElementById('step-content').appendChild(inp);
        return { focus: document.getElementById('app').classList.contains('lesson-focus'), content: document.getElementById('step-content').innerHTML.length };
      });
      await page.evaluate(() => setUiLang('en')); await page.waitForTimeout(1000);
      const mid = await page.evaluate(() => ({ sameGrid: document.getElementById('units-grid').firstElementChild === window.__gridMark,
        typed: (document.getElementById('__typed') || {}).value, detail: document.getElementById('unit-detail-wrap').style.display }));
      check(`${app}: troca no meio da lição: trilha não repintada`, mid.sameGrid, mid);
      check(`${app}: troca no meio da lição: o que foi digitado continua`, mid.typed === 'bonjour tout le monde' && mid.detail !== 'none', [before, mid]);
      await page.evaluate(() => exitToPath()); await page.waitForTimeout(300);
      t = await page.evaluate(trailText);
      check(`${app}: sai da lição: trilha em inglês`, !/lições|Comece por aqui|Continue de onde parou/.test(t) && /lessons completed/.test(t), t.slice(0, 300));
      check(`${app}: sem erro de página`, errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
