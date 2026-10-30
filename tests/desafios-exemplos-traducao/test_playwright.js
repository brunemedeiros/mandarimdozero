// Lote de exemplos das Expressões (2026-10-30): "Veja em frases" com a expressão em destaque e "Ver tradução", "Monte a frase" com a
// tradução de apoio, e "Tradução literal" (+ nota de origem) no painel da resposta. pt-BR vem do banco (example.pt/mark, literal.pt/note);
// o site em outro idioma vem do overlay (fr/challenges.<lang>.js: example, secondExample, literal, literalNote). Tudo opcional.
// Rodar: node tests/desafios-exemplos-traducao/test_playwright.js [pasta-de-capturas]
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
const base = (id, extra) => ({ id, type: 'expression', level: 'A1', status: 'published', data: Object.assign({ canonicalExpression: 'pas de bol', register: 'familiar', question: 'Q ?', options: ['Pas de chance', 'Beaucoup', 'Un bol', 'Rien'], correctAnswer: 'Pas de chance',
  meaning: { fr: 'Pas de chance.', pt: 'Que azar.' }, explanation: 'Familier.', microActivity: { prompt: 'Oh, __________ !', answer: 'pas de bol' } }, extra) });
const ROWS = [
  // completo: destaque, tradução com dois falantes (quebra de linha), literal e nota
  base('ch-full', { example: { text: "J'ai raté le bus de deux minutes. — Pas de bol !", mark: 'Pas de bol', pt: '— Perdi o ônibus por dois minutos.\n— Que azar!' }, secondExample: { text: 'Pas de bol, il pleut.', mark: 'Pas de bol', pt: 'Que azar, está chovendo.' },
    literal: { pt: 'sem tigela', note: 'Na gíria antiga, "bol" era a bunda.' } }),
  // sem nenhum campo novo (como antes do lote): nada muda
  base('ch-old', { example: { text: 'Oh, pas de bol !' }, secondExample: { text: 'Pas de bol hier.' } }),
  // marca que não está no texto e texto com HTML: sem destaque, sem quebrar, escapado
  base('ch-odd', { example: { text: 'Quel <b>bol</b> !', mark: 'inexistente', pt: 'Que <i>sorte</i>!' }, secondExample: { text: 'Ça va.', mark: 'Ça va', pt: 'Tudo bem.' }, literal: { pt: 'x <u>y</u>' } }),
];
const STUB = `(function(){ const ROWS = ${JSON.stringify(ROWS)};
  function builder(table){ const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok, ko) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok, ko); return () => b; } }); return b; }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) }, functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client }; })();`;
const EN = {
  'ch-full': { meaning: 'Bad luck.', example: "— I missed the bus by two minutes.\n— Bad luck!", secondExample: "Bad luck, it's raining.", literal: 'no bowl', literalNote: 'In old slang, "bol" meant the backside.' },
  'ch-old': { meaning: 'Bad luck.' },
  'ch-odd': { meaning: 'Bad luck.', example: 'What <i>luck</i>!' },
};
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
async function boot(browser, port, { lang, theme, vw, vh }){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(([th, lg]) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); localStorage.setItem('ui-language', lg); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, [theme, lang]);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  await page.evaluate(en => { window.CHALLENGES_I18N = window.CHALLENGES_I18N || {}; window.CHALLENGES_I18N.en = en; }, EN);
  await page.evaluate(() => { CURRENT_USER = { id: 'u-t' }; progressLoadedOk = true; ensureProfileLoaded = async () => ({ plan_tier: 'premium' }); });
  await page.evaluate(async () => { await loadChallengesFromDB(true); switchTab && switchTab('challenges'); });
  await page.waitForSelector('#challenges-categories .challenge-category-card', { timeout: 8000 });
  return { page, ctx, errors };
}
const open = async (page, id) => { await page.evaluate(i => openChallengePlayer(i), id); await page.waitForSelector('#expr-see-options-btn'); await page.waitForTimeout(100); };
// até o painel da resposta (acerto) e depois até "Veja em frases"
const ateResposta = async page => { await page.click('#expr-see-options-btn'); await page.waitForSelector('.exercise-option');
  await page.evaluate(() => { const c = EXPR_RUN.c; [...document.querySelectorAll('.exercise-option')].find(e => c.options[+e.dataset.origIdx] === c.correctAnswer).click(); }); await page.waitForSelector('#expr-continue-btn'); };
const ateExemplos = async page => { await ateResposta(page); await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-example'); await page.waitForTimeout(80); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  for (const lang of ['pt-BR', 'en']) for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 800, 'desktop'], [390, 800, 'celular']]){
    const label = `${lang}-${theme}-${tag}`, pt = lang === 'pt-BR';
    const { page, ctx, errors } = await boot(browser, port, { lang, theme, vw, vh });
    // ---- completo ----
    await open(page, 'ch-full'); await ateResposta(page);
    const lit = await page.evaluate(() => ({ label: (document.querySelector('.expr-literal-label') || {}).textContent, text: (document.querySelector('.expr-literal em') || {}).textContent, note: (document.querySelector('.expr-literal-note') || {}).textContent }));
    check(label + ' painel da resposta: rótulo, literal e nota no idioma do site', lit.label === (pt ? 'Tradução literal:' : 'Literal translation:') && lit.text === (pt ? 'sem tigela' : 'no bowl') && lit.note === (pt ? 'Na gíria antiga, "bol" era a bunda.' : 'In old slang, "bol" meant the backside.'), lit);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `1-resposta-${label}.png`) }); }
    await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-example'); await page.waitForTimeout(80);
    const ex = await page.evaluate(() => [...document.querySelectorAll('.expr-example')].map(e => ({ mark: (e.querySelector('.expr-mark') || {}).textContent || null, text: e.querySelector('.expr-example-text').textContent, btn: !!e.querySelector('.expr-tr-btn'),
      trHidden: e.querySelector('.expr-example-tr') ? e.querySelector('.expr-example-tr').hidden : null, btnLabel: (e.querySelector('.expr-tr-btn') || {}).textContent })));
    check(label + ' exemplos: expressão destacada e texto francês inteiro', ex.length === 2 && ex[0].mark === 'Pas de bol' && ex[1].mark === 'Pas de bol' && ex[0].text === "J'ai raté le bus de deux minutes. — Pas de bol !", ex);
    check(label + ' exemplos: botão "Ver tradução" no idioma do site e tradução escondida', ex[0].btn && ex[0].trHidden === true && ex[0].btnLabel === (pt ? 'Ver tradução' : 'See translation'), ex);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `2-exemplos-${label}.png`) }); }
    await page.click('#expr-ex0-trbtn');
    const tr = await page.evaluate(() => ({ shown: document.getElementById('expr-ex0-tr').hidden === false, btnHidden: document.getElementById('expr-ex0-trbtn').hidden, text: document.getElementById('expr-ex0-tr').innerText, lines: document.getElementById('expr-ex0-tr').getBoundingClientRect().height, second: document.getElementById('expr-ex1-tr').hidden }));
    check(label + ' "Ver tradução": mostra a tradução em duas falas (uma por linha), some o botão, o outro exemplo segue escondido', tr.shown && tr.btnHidden && tr.second === true && tr.text === (pt ? '— Perdi o ônibus por dois minutos.\n— Que azar!' : "— I missed the bus by two minutes.\n— Bad luck!"), tr);
    if (OUT) { await page.waitForTimeout(100); await page.screenshot({ path: path.join(OUT, `3-traducao-${label}.png`) }); }
    await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-order-tr, #expr-order-dontknow-btn'); await page.waitForTimeout(80);
    const ord = await page.evaluate(() => (document.querySelector('.expr-order-tr') || {}).innerText || null);
    check(label + ' Monte a frase: tradução do exemplo 1 como apoio', ord === (pt ? '— Perdi o ônibus por dois minutos.\n— Que azar!' : "— I missed the bus by two minutes.\n— Bad luck!"), ord);
    // ---- sem campos novos ----
    await open(page, 'ch-old'); await ateResposta(page);
    check(label + ' sem literal no dado: painel igual ao de antes', (await page.evaluate(() => !document.querySelector('.expr-literal'))));
    await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-example'); await page.waitForTimeout(60);
    const old = await page.evaluate(() => ({ marks: document.querySelectorAll('.expr-mark').length, btns: document.querySelectorAll('.expr-tr-btn').length, trs: document.querySelectorAll('.expr-example-tr').length }));
    check(label + ' sem tradução/marca no dado: sem destaque, sem botão', old.marks === 0 && old.btns === 0 && old.trs === 0, old);
    await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-order-tr, #expr-order-dontknow-btn');
    check(label + ' Monte a frase sem tradução: não cria a linha de apoio', (await page.evaluate(() => !document.querySelector('.expr-order-tr'))));
    // ---- marca fora do texto + HTML no dado ----
    await open(page, 'ch-odd'); await ateResposta(page);
    await page.evaluate(() => { document.getElementById('expr-continue-btn').click(); }); await page.waitForSelector('.expr-example'); await page.waitForTimeout(60);
    const odd = await page.evaluate(() => { const es = [...document.querySelectorAll('.expr-example')]; return { marks: es.map(e => (e.querySelector('.expr-mark') || {}).textContent || null), noHtml: !document.querySelector('.expr-example-text b') && !document.querySelector('.expr-example-tr i'), trBtns: es.map(e => !!e.querySelector('.expr-tr-btn')), t0: es[0].querySelector('.expr-example-text').textContent }; });
    check(label + ' marca fora do texto: sem destaque; marca válida no 2º; HTML do dado escapado', odd.marks[0] === null && odd.marks[1] === 'Ça va' && odd.noHtml && odd.t0 === 'Quel <b>bol</b> !', odd);
    const litOdd = await page.evaluate(() => { document.querySelector('#challenge-back-to-list, .lesson-close-btn'); return true; });
    check(label + ' sem erros de JS', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})();
