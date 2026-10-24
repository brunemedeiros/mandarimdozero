// Harness dos testes de segurança/robustez da revisão do código compartilhado (2026-10-24, achados C1, A1, A2, A3 de
// docs/revisao-codigo-compartilhado-erros.md). Sobe um servidor estático da árvore do repositório (ou de REPO_ROOT, para
// rodar contra a origin/main num worktree), abre fr/ ou zh/ no Chromium com o Supabase de mentira (sem rede) e o modo
// convidado. Carrega os arquivos de PRODUÇÃO; só a rede é stubada.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules', __dirname] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
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
let browser = null;
async function withPage(site, fn, opts = {}){
  await new Promise(r => srv.listening ? r() : srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  if (!browser) browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: opts.viewport || { width: 1200, height: 900 }, colorScheme: 'light' });
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(`http://127.0.0.1:${port}`)) return route.continue();
    if (/supabase-js/.test(u)) return route.fulfill({ body: STUB, contentType: 'text/javascript' });
    if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) && opts.fakeImages) return route.fulfill({ body: opts.fakeImages, contentType: 'image/png' });
    return route.abort();
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', 'light'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${site}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && typeof switchTab === 'function', null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  try { return await fn(page, errs); } finally { await ctx.close(); }
}
// Erros de página que não são de rede bloqueada (o sandbox não tem CDN; ERR_* é esperado).
function realErrors(errs){ return errs.filter(e => !/ERR_|Failed to load resource|net::/.test(e)); }
async function close(){ if (browser) await browser.close(); browser = null; srv.close(); }

let passed = 0, failed = 0;
function check(name, ok, extra){
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FALHA ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); }
}
function summary(label){
  console.log(`\n${label}: ${passed}/${passed + failed}`);
  process.exitCode = failed ? 1 : 0;
}
module.exports = { withPage, realErrors, close, check, summary, ROOT };
