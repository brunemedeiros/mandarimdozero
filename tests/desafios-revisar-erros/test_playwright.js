// "Revisar erros" nos Desafios (fr): ao abrir o exercício pela fila, as categorias NÃO podem ficar
// visíveis junto do player (bug: modo foco escondia o menu mas as categorias ficavam empilhadas).
// Rodar: node tests/desafios-revisar-erros/test_playwright.js [pasta-de-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `
(function(){
  const ROWS = [{ id: 'ch-t1', type: 'accent', level: 'A1', status: 'published', data: { audioFile: 'x.mp3', text: 'ete', answer: 'été' } },
                { id: 'ch-t2', type: 'accent', level: 'A1', status: 'published', data: { audioFile: 'y.mp3', text: 'cafe', answer: 'café' } }];
  function builder(table){
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok, ko);
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const shown = (page, id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== 'none' && e.offsetHeight > 0; }, id);

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 900, 'desktop'], [390, 800, 'celular']]){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    await page.evaluate(() => {
      CURRENT_USER = { id: 'u-t' };
      ensureProfileLoaded = async () => ({ plan_tier: 'premium' });
      const old = Date.now() - 5 * 86400000;
      STATE.challengeReviews = { 'ch-t1': { id: 'ch-t1', lastErrorAt: old, lastSeenAt: old, box: 1 }, 'ch-t2': { id: 'ch-t2', lastErrorAt: old, lastSeenAt: old, box: 1 } };
      switchTab('challenges');
    });
    const label = `${theme}-${tag}`;
    await page.waitForSelector('#challenges-review-card', { timeout: 8000 });
    check(label + ' categorias visíveis antes', await shown(page, 'challenges-categories-wrap'));
    await page.click('#challenges-review-card');
    await page.waitForSelector('#accent-answer-input', { timeout: 8000 });
    await page.waitForTimeout(300);
    check(label + ' player visível', await shown(page, 'challenge-player-wrap'));
    check(label + ' categorias ESCONDIDAS no player', !(await shown(page, 'challenges-categories-wrap')));
    check(label + ' lista escondida', !(await shown(page, 'challenges-list-wrap')));
    check(label + ' modo foco ligado', await page.evaluate(() => document.getElementById('app').classList.contains('lesson-focus') && document.body.dataset.activityFocus === 'challenges'));
    check(label + ' sem rolagem horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    if (OUT) await page.screenshot({ path: path.join(OUT, `player-${label}.png`) });
    // voltar: categorias reaparecem, foco sai
    await page.click('#challenge-back-to-list');
    await page.waitForSelector('#challenges-review-card', { timeout: 8000 });
    await page.waitForTimeout(300);
    check(label + ' voltou às categorias', await shown(page, 'challenges-categories-wrap') && !(await shown(page, 'challenge-player-wrap')));
    check(label + ' foco desligado ao voltar', await page.evaluate(() => !document.getElementById('app').classList.contains('lesson-focus')));
    check(label + ' pageerrors = 0', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
