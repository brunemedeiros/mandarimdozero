// Paridade, etapa 5a (docs/historico/27-paridade-conjugacao.md): capturas da tela da Conjugação do fr, para comparar
// ANTES (origin/main num worktree) e DEPOIS da mudança para shared/conjugacao.js + fr/conj-config.js + shared/conjugacao.css.
// Uso: node tests/paridade-sites/capturas_conjugacao.js <pasta-da-árvore> <pasta-de-saída>
// Compare com: node tests/e4/comparar-capturas.js <antes> <depois> 0
// Cenas (claro/escuro, 390px e 1200px): escolha, busca "comer" com a lista aberta, chips, prática (2 tempos, teclado de
// letras), correção com erro, "quase" de acento e letras marcadas, dica, resultado com a revisão, aba Jogos, um jogo
// respondido (com a explicação) e o resultado do jogo. Tempo congelado, Math.random com semente, animações desligadas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/5a-capturas');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const hashes = {};
  for (const theme of ['light', 'dark']) for (const width of [390, 1200]) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => {
      try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {}
      let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; window.__seed = (n) => { s = n; };
    }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
    const shot = async (name, keepFocus) => {
      await page.clock.runFor(4000);
      await page.evaluate((kf) => {
        document.querySelectorAll('#streak-modal-overlay, .toast, .toast-container, #toast, .badge-unlock-toast, .confetti-piece').forEach(e => e.remove());
        if (!kf && document.activeElement && document.activeElement.blur) document.activeElement.blur();
        window.scrollTo(0, 0); return document.fonts && document.fonts.ready;
      }, keepFocus);
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ fullPage: true });
      const full = `fr-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    // a janela da sequência do dia (aberta por timer no fim da sessão) não é desta tela: fica fora das capturas
    await page.evaluate(() => { showStreakCelebration = () => {}; switchTab('conjugaison'); });
    await shot('escolha');
    await page.click('#conj-search-input');
    await page.keyboard.type('comer');
    await shot('busca-comer', true);
    await page.keyboard.press('Enter');
    await page.keyboard.type('prendre'); await page.keyboard.press('Enter');
    await page.evaluate(() => { document.querySelector('#conj-tense-list input[data-tense="passeCompose"]').click(); });
    await shot('chips');
    await click('#conj-start-btn');
    await shot('pratica');
    // erro, "quase" (acento) e letras marcadas; feminino com être
    await page.evaluate(() => {
      const v = { presente: ['mange', 'manges', 'mangé', 'mangeons', 'mangéz', 'mangez'], passeCompose: ['ai mange', 'as mangé', 'a mangé', '', 'avez mangées', 'ont mangé'] };
      document.querySelectorAll('.conj-field input[data-idx]').forEach((inp) => { inp.value = v[inp.dataset.tense][Number(inp.dataset.idx)]; });
    });
    await click('#conj-verify-btn');
    await shot('erro-acentos');
    await click('#conj-next-verb-btn');
    await click('#conj-hint-btn'); await click('#conj-hint-btn');
    await shot('dica');
    await click('#conj-verify-btn');
    await click('#conj-next-verb-btn');
    await shot('resultado');
    // aba Jogos e um jogo respondido
    await click('#conj-restart-btn');
    await click('#conj-mode-games');
    await shot('jogos');
    await page.evaluate(() => __seed(7));
    await click('.cg-play[data-game="pc-imparfait"]');
    await shot('jogo-pergunta'); // (o shot avança o relógio 4 s: o 1º clique vale)
    await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[0]; document.querySelector('.cg-choice[data-k="' + (it.ans === 'a' ? 'b' : 'a') + '"]').click(); });
    await shot('jogo-resposta');
    for (let i = 1; i < 10; i++){
      await page.clock.runFor(400);
      await click('#cg-next');
      await page.clock.runFor(900); // o jogo ignora clique nos primeiros 350 ms da frase (mostrada depois de uma transição)
      await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
    }
    await page.clock.runFor(400);
    await click('#cg-next');
    await shot('jogo-resultado');
    if (errors.length) console.log(`  erros de página (${theme} ${width}):`, errors.slice(0, 3));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  await browser.close(); server.close();
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
