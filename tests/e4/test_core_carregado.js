// C0 da E3: o zh grava STATE.hanziCards no save e precisa RESTAURAR o progresso ao carregar
// (a restauração foi removida por engano na K2-C, commit 49692ff). Também confere o texto do portão
// para convidado. Rodar: node tests/curso-progresso/test_hanzi_restore.js
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
// E4: tudo que está em shared/core/*.js precisa estar definido (como função global) em fr e zh, carregado antes do app.js,
// e nenhum app.js pode ter a mesma função de novo (a cópia do app.js venceria em silêncio).
(async () => {
  const coreDir = path.join(ROOT, 'shared/core');
  const files = fs.existsSync(coreDir) ? fs.readdirSync(coreDir).filter(f => f.endsWith('.js')) : [];
  const names = [];
  files.forEach(f => { const src = fs.readFileSync(path.join(coreDir, f), 'utf8'); for (const m of src.matchAll(/^(?:async )?function (\w+)\(/gm)) names.push({ f, n: m[1] }); });
  check('há funções no core', names.length >= 60, names.length);
  for (const lang of ['fr', 'zh']) {
    const app = fs.readFileSync(path.join(ROOT, lang, 'app.js'), 'utf8');
    const dup = names.filter(x => new RegExp('^(?:async )?function ' + x.n + '\\(', 'm').test(app)).map(x => x.n);
    check(`${lang}: nenhuma função do core repetida no app.js`, dup.length === 0, dup);
    const html = fs.readFileSync(path.join(ROOT, lang, 'index.html'), 'utf8');
    files.forEach(f => {
      const tag = html.indexOf(`shared/core/${f}`), appTag = html.indexOf('<script src="app.js">');
      check(`${lang}: ${f} carregado antes do app.js`, tag > 0 && tag < appTag);
    });
  }
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    const missing = await page.evaluate((ns) => ns.filter(n => { try { return typeof (0, eval)(n) !== 'function'; } catch (e) { return true; } }), names.map(x => x.n));
    check(`${lang}: todas as funções do core existem como função global`, missing.length === 0, missing);
    check(`${lang}: sem erro de página no carregamento`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`core compartilhado: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
