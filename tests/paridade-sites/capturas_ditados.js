// Paridade, etapa 5b (docs/historico/28-paridade-ditados.md): capturas dos Ditados do fr, para comparar ANTES (origin/main
// num worktree) e DEPOIS da mudança para shared/ditados.js + fr/ditados-config.js + shared/ditados.css.
// Uso: node tests/paridade-sites/capturas_ditados.js <pasta-da-árvore> <pasta-de-saída>
// Compare com: node tests/e4/comparar-capturas.js <antes> <depois> 0
// Cenas (claro/escuro, 390px e 1200px): aba Desafios (cartão Ditados), lista geral, explicação aberta, cartão com o
// mouse em cima, lista do módulo com progresso, "Revisão do A1", player, campo com foco e letra do teclado, resultado com
// erros marcados (troca, falta, a mais, erro leve, pontuação, número), resultado perfeito, frase tocando, linha
// "Revisão do A1" na trilha. Tempo congelado, Math.random com semente, animações desligadas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/5b-capturas');
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
    // mp3 nunca responde: o player fica em 00:00 nas duas árvores (o tempo total chegava em momentos diferentes)
    await page.route(/\.mp3(\?|$)/, () => {});
    await page.addInitScript((th) => {
      try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {}
      let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; window.__seed = (n) => { s = n; };
    }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important;scroll-behavior:auto !important}' });
    // o resultado rola até a caixa com behavior smooth: sem animação, para a captura não pegar a rolagem no meio
    await page.evaluate(() => { const o = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function(){ return o.call(this, { block: 'start' }); }; });
    await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
    const shot = async (name, keepFocus) => {
      await page.clock.runFor(4000);
      await page.evaluate((kf) => {
        document.querySelectorAll('#streak-modal-overlay, .toast, .toast-container, #toast, .badge-unlock-toast, .confetti-piece').forEach(e => e.remove());
        if (!kf && document.activeElement && document.activeElement.blur) document.activeElement.blur();
        window.scrollTo(0, 0); return document.fonts && document.fonts.ready;
      }, keepFocus);
      // o tempo total do áudio guiado chega quando o mp3 carrega, e os ícones (Fluent) são <img>: espera os dois
      await page.waitForFunction(() => (typeof dictationAudioEl === 'undefined' || !dictationAudioEl || dictationAudioEl.readyState >= 1 || dictationAudioEl.error)
        && [...document.images].every(i => i.complete || i.loading === 'lazy'), null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(300);
      const buf = await page.screenshot({ fullPage: true });
      const full = `fr-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    await page.evaluate(() => { showStreakCelebration = () => {}; });
    await page.evaluate(() => switchTab('challenges'));
    await shot('desafios');
    await page.evaluate(() => switchTab('dictation'));
    await shot('lista');
    await click('#dictation-explainer-toggle');
    await shot('lista-explicacao');
    await click('#dictation-explainer-toggle');
    await page.hover('.dictation-card');
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.waitForTimeout(400);
    const hv = await page.screenshot({ fullPage: true });
    { const full = `fr-${theme}-${width}-lista-hover`; fs.writeFileSync(path.join(OUT, full + '.png'), hv); hashes[full] = crypto.createHash('sha256').update(hv).digest('hex').slice(0, 16); }
    await page.mouse.move(0, 0);
    // tentativas em 2 ditados do módulo 1 (registro e progresso na lista)
    await page.evaluate(() => { pendingDictationModuleFilter = 'A1-m1'; switchTab('dictation'); });
    await page.evaluate(() => { const d = DICTATIONS.find(x => x.moduleId === 'A1-m1'); openDictationPlayer(d.id); document.getElementById('dictation-input').value = d.text; document.getElementById('dictation-check-btn').click(); renderDictationList(); });
    await shot('lista-modulo');
    await page.evaluate(() => { pendingDictationModuleFilter = 'A1-revisao'; switchTab('dictation'); });
    await shot('lista-revisao');
    await page.evaluate(() => { pendingDictationModuleFilter = null; switchTab('dictation'); openDictationPlayer('d1'); });
    await shot('player');
    await page.click('#dictation-input');
    await page.keyboard.type("bonjour je mapelle sophie");
    await page.evaluate(() => { const b = document.querySelector('#dictation-player-content .fr-accent-picker button'); if (b) b.click(); document.getElementById('dictation-input').focus(); });
    await shot('player-foco', true);
    await page.evaluate(() => {
      document.getElementById('dictation-input').value = "Bonjour ! je mapelle Sofie. J'ai 25 ans et je suis tres francaise virgule Et toi comment tu t'appelle";
      document.getElementById('dictation-check-btn').click();
    });
    await shot('resultado-erros');
    await page.evaluate(() => { const b = document.querySelectorAll('.dictation-sentence-play')[1]; b.classList.add('speaking'); });
    await shot('resultado-frase-tocando');
    await click('#dictation-retry-btn');
    await page.evaluate(() => { openDictationPlayer('d3'); const d = DICTATIONS.find(x => x.id === 'd3'); document.getElementById('dictation-input').value = d.text; document.getElementById('dictation-check-btn').click(); });
    await shot('resultado-perfeito');
    await page.evaluate(() => { openDictationPlayer('d2'); document.getElementById('dictation-input').value = "Il est 8 heures du matin bonjour je voudrais du pain s'il vous plait et un croissant cest combien ? merci au-revoir"; document.getElementById('dictation-check-btn').click(); });
    await shot('resultado-leves');
    await page.evaluate(() => { STATE.currentLevel = 'A1'; switchTab('path'); });
    await page.evaluate(() => { const r = document.querySelector('.unit-block.level-review'); if (r) r.scrollIntoView(); });
    const row = await page.evaluate(() => { const r = document.querySelector('.unit-block.level-review'); return r ? r.outerHTML.length : 0; });
    if (row){
      const el = await page.$('.unit-block.level-review');
      const buf = await el.screenshot();
      const full = `fr-${theme}-${width}-trilha-revisao`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf); hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    }
    if (errors.length) console.log(`  erros de página (${theme} ${width}):`, errors.slice(0, 3));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  await browser.close(); server.close();
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
