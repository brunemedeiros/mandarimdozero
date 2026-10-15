// E4: capturas de tela dos 4 cenários (fr/zh x claro/escuro) de uma árvore de arquivos, para comparar ANTES e DEPOIS de um lote.
// Uso: node tests/e4/capturas.js <pasta-da-árvore> <pasta-de-saída>   (grava PNG + hashes.json). Tempo congelado, animações desligadas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/e4-capturas');
fs.mkdirSync(OUT, { recursive: true });
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
const TABS = ['path', 'review', 'progress', 'goals', 'challenges'];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const hashes = {};
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {} Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); }, theme);
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    for (const tab of TABS) {
      try { await page.evaluate((t) => switchTab(t), tab); } catch (e) { continue; }
      await page.waitForTimeout(500);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.screenshot({ fullPage: false }); await page.waitForTimeout(300);
      const buf = await page.screenshot({ fullPage: false });
      const name = `${lang}-${theme}-${tab}`;
      fs.writeFileSync(path.join(OUT, name + '.png'), buf);
      hashes[name] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  await browser.close(); server.close();
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
