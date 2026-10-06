// Fase 2 da trilha (06/10/2026) -- Playwright/Chromium real, FR + ZH.
// Estados visuais (done/skipped/current/available/locked), cartão "Continuar",
// selo de Gramática, "Pulada", abertura no nível da unidade atual (fr).
// Rodar: node tests/trilha/test_trail_ui.js   (SHOTS=dir para salvar prints)
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
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    for (const scheme of ['light', 'dark']){
      console.log('== ' + lang + ' ' + scheme);
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
      await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      const L = (n, c, x) => check(`${lang}/${scheme} ${n}`, c, x);

      // --- usuária nova ---
      let r = await page.evaluate(() => { renderUnitsGrid(); const g = document.getElementById('units-grid');
        return { cont: !!g.querySelector('.trail-continue'), cta: (g.querySelector('.tc-cta') || {}).textContent,
          current: g.querySelectorAll('.unit-block.current').length, sticky: getComputedStyle(g.querySelector('.trail-continue')).position,
          sub: (g.querySelector('.tc-sub') || {}).textContent }; });
      L('nova: cartão Continuar presente', r.cont);
      L('nova: botão "Começar"', r.cta === 'Começar', r);
      L('nova: exatamente 1 unidade atual', r.current === 1, r);
      L('nova: métrica em lições', /^0 de \d+ lições concluídas$/.test(r.sub), r.sub);
      // Fase 8: fica fixo só quando a unidade atual SAIU da tela; visível = fluxo normal.
      await page.evaluate(() => { const g = document.getElementById('units-grid'); g.querySelector('.unit-block.current').scrollIntoView({ block: 'center' }); });
      await page.waitForTimeout(400);
      let pos = await page.evaluate(() => getComputedStyle(document.querySelector('#units-grid .trail-continue')).position);
      L('desktop: atual visível -> cartão no fluxo (não fixo)', pos === 'static', pos);
      await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const g = document.getElementById('units-grid'); const last = g.lastElementChild; if (last) last.scrollIntoView({ block: 'end' }); });
      await page.waitForTimeout(400);
      const offscreen = await page.evaluate(() => { const b = document.querySelector('#units-grid .unit-block.current'); const r = b.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; });
      pos = await page.evaluate(() => getComputedStyle(document.querySelector('#units-grid .trail-continue')).position);
      L('desktop: atual fora da tela -> cartão fixo (sticky)', !offscreen || pos === 'sticky', { offscreen, pos });
      L('aria-current na unidade atual', await page.evaluate(() => document.querySelector('#units-grid .unit-block.current').getAttribute('aria-current') === 'step'));
      await page.evaluate(() => window.scrollTo(0, 0));

      // --- em andamento: 1ª concluída, 2ª pulada, 3ª é a atual ---
      r = await page.evaluate(() => {
        const ids = trailGroups().flat().map(u => u.id);
        const P = STATE.unitProgress;
        P[ids[0]].started = true; P[ids[0]].completed = true; P[ids[0]].completedVia = 'lessons';
        P[ids[1]].started = true; P[ids[1]].completed = true; P[ids[1]].completedVia = 'skip_test';
        window.__opened = null; window.openUnitDetail = (id) => { window.__opened = id; };
        renderUnitsGrid();
        const g = document.getElementById('units-grid');
        const byId = (id) => [...g.querySelectorAll('.unit-block')].find(b => b.querySelector('.ub-title') && b.querySelector('.ub-title').textContent === UNITS.find(u => u.id === id).title);
        const cls = (id) => { const b = byId(id); return b ? b.className : null; };
        g.querySelector('.tc-cta').click();
        return { ids, c0: cls(ids[0]), c1: cls(ids[1]), c2: cls(ids[2]),
          badge1: (byId(ids[1]).querySelector('.ub-badge') || {}).textContent, opened: window.__opened,
          title: g.querySelector('.tc-title').textContent, eyebrow: g.querySelector('.tc-eyebrow').textContent,
          cta: g.querySelector('.tc-cta').textContent, sub: g.querySelector('.tc-sub').textContent,
          nextTitle: UNITS.find(u => u.id === ids[2]).title, curCount: g.querySelectorAll('.unit-block.current').length };
      });
      L('concluída tem classe done', /\bdone\b/.test(r.c0), r.c0);
      L('pulada tem classe skipped e não done', /\bskipped\b/.test(r.c1) && !/\bdone\b/.test(r.c1), r.c1);
      L('pulada mostra selo "Pulada"', /Pulada|跳过/.test(r.badge1 || ''), r.badge1);
      L('3ª unidade é a atual', /\bcurrent\b/.test(r.c2), r.c2);
      L('só 1 atual', r.curCount === 1, r.curCount);
      L('cartão cita a unidade atual', r.title.includes(r.nextTitle), r.title);
      L('botão "Continuar" e abre a unidade atual', r.cta === 'Continuar' && r.opened === r.ids[2] && r.eyebrow.includes('onde parou'), r);
      L('métrica conta lições da concluída e da pulada', /^([1-9]\d*) de \d+ lições concluídas$/.test(r.sub), r.sub);

      // --- tema: contraste do texto do cartão contra o fundo ---
      const lum = await page.evaluate(() => {
        const parse = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const L = (rgb) => 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
        const card = document.querySelector('.trail-continue'); const bg = parse(getComputedStyle(card).backgroundColor);
        const out = {};
        ['.tc-title', '.tc-sub', '.tc-eyebrow'].forEach(s => { const fg = parse(getComputedStyle(card.querySelector(s)).color);
          const a = L(fg), b = L(bg); out[s] = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
        return out; });
      L('contraste título >= 4.5', lum['.tc-title'] >= 4.5, lum);
      L('contraste subtítulo >= 4.5', lum['.tc-sub'] >= 4.5, lum);
      L('contraste eyebrow >= 4.5', lum['.tc-eyebrow'] >= 4.5, lum);
      if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, `trilha-${lang}-${scheme}.png`) });

      // --- fr: abre no nível da atual; chip de Gramática ---
      if (lang === 'fr'){
        r = await page.evaluate(() => {
          const g0 = UNITS.filter(u => u.level === 'A1');
          // atual na 1ª unidade de gramática (sempre A1): conclui todas as anteriores
          const gi = UNITS.findIndex(u => u.type === 'grammar');
          UNITS.slice(0, gi).forEach(u => { STATE.unitProgress[u.id].completed = true; });
          STATE.levelUserPicked = false; STATE.currentLevel = 'A2';
          renderUnitsGrid();
          const g = document.getElementById('units-grid');
          return { level: STATE.currentLevel, chips: [...g.querySelectorAll('.ub-type-chip.grammar')].map(c => c.textContent),
            gramCur: !!g.querySelector('.unit-block.grammar.current'), a1: g0.length > 0 };
        });
        L('abre no nível da unidade atual', r.level === 'A1', r);
        L('chip Gramática nas unidades de gramática', r.chips.length > 0 && r.chips.every(t => t === 'Gramática'), r);
        r = await page.evaluate(() => { STATE.levelUserPicked = true; STATE.currentLevel = 'A2'; renderUnitsGrid(); return STATE.currentLevel; });
        L('escolha manual de nível é respeitada', r === 'A2', r);
      }

      // --- trilha concluída ---
      r = await page.evaluate(() => { UNITS.forEach(u => { STATE.unitProgress[u.id].completed = true; }); renderUnitsGrid();
        const c = document.querySelector('.trail-continue'); return { complete: c.classList.contains('complete'), btn: !!c.querySelector('.tc-cta'), txt: c.textContent }; });
      L('trilha concluída: mensagem sem botão', r.complete && !r.btn && /concluiu toda a trilha/.test(r.txt), r);
      L('sem erro de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
