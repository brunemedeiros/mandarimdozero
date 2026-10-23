// Etapa A (padrão das telas de exercício): comando das Expressões no idioma do site (rótulo da trilha, nunca o
// campo `question` em francês) e botão de verificar traduzido (pt-BR "Verificar", en "Check").
// Rodar: node tests/desafios-comando-idioma/test_playwright.js [pasta-de-capturas]
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
  const ROWS = [{ id: 'ch-e1', type: 'expression', level: 'A1', status: 'published', data: { canonicalExpression: 'avoir faim', question: "Que signifie 'avoir faim' ?", options: ['Être fatigué', 'Avoir très envie de manger', 'Être content', 'Avoir soif'], correctAnswer: 'Avoir très envie de manger', meaning: { fr: 'Avoir envie de manger.', pt: 'Estar com fome.' }, explanation: 'Expression courante.', example: { text: "J'ai faim." }, secondExample: { text: 'Il a faim.' } } },
                { id: 'ch-a1', type: 'accent', level: 'A1', status: 'published', data: { audioFile: 'x.mp3', targetText: 'été' } }];
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
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const EXPECT = { 'pt-BR': { label: 'O QUE SIGNIFICA?', verify: 'Verificar' }, en: { label: 'WHAT DOES IT MEAN?', verify: 'Check' } };
  for (const lang of ['pt-BR', 'en']) for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 800, 'desktop'], [390, 800, 'celular']]){
    const label = `${lang}-${theme}-${tag}`;
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(([th, lg]) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); localStorage.setItem('ui-language', lg); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, [theme, lang]);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    await page.evaluate(() => { CURRENT_USER = { id: 'u-t' }; ensureProfileLoaded = async () => ({ plan_tier: 'premium' }); switchTab('challenges'); });
    await page.waitForSelector('#challenges-categories .challenge-category-card', { timeout: 8000 });
    await page.evaluate(() => openChallengePlayer('ch-e1'));
    await page.waitForSelector('#challenge-reveal-btn', { timeout: 8000 });
    const info = await page.evaluate(() => ({
      label: (document.querySelector('#challenge-player-content > .exercise-prompt-label') || {}).textContent || '',
      hasQuestion: !!document.querySelector('#challenge-player-content .challenge-question'),
      text: document.getElementById('challenge-player-content').innerText
    }));
    check(label + ' rótulo no idioma do site', info.label.trim().toUpperCase() === EXPECT[lang].label, info.label);
    check(label + ' sem frase em francês do conteúdo', !info.hasQuestion && !/Que signifie/i.test(info.text), info.text);
    check(label + ' expressão continua visível', /avoir faim/.test(info.text));
    if (OUT) await page.screenshot({ path: path.join(OUT, `expressao-${label}.png`) });
    await page.evaluate(() => openChallengePlayer('ch-a1'));
    await page.waitForSelector('#accent-verify-btn', { timeout: 8000 });
    const verify = await page.textContent('#accent-verify-btn');
    check(label + ' botão verificar traduzido', verify.trim() === EXPECT[lang].verify, verify);
    check(label + ' sem rolagem horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    if (OUT) await page.screenshot({ path: path.join(OUT, `acentuacao-${label}.png`) });
    check(label + ' pageerrors = 0', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
