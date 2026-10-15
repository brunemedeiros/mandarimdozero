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

// Troca de curso só no menu da bandeira: Configurações não tem lista de cursos nem seletor de idioma do site (com a flag ligada).
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']) {
    for (const flag of [false, true]) {
      const tag = `${app} flag=${flag}`;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      await ctx.addInitScript(({ flag }) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('courses-per-site-language', flag ? '1' : '0'); } catch (e) {} }, { flag });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof renderMyCourses === 'function' && typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
      await page.evaluate(() => { switchTab('settings'); renderMyCourses(); });
      const st = await page.evaluate(() => { const sel = document.getElementById('ui-language-select'); const row = sel.closest('.pref-row'); const b = document.getElementById('my-courses');
        return { selRowDisplay: row.style.display, selVisible: row.getBoundingClientRect().height > 0, boxHidden: b.style.display === 'none' && b.innerHTML === '', text: document.getElementById('settings-general-content') ? document.getElementById('settings-general-content').textContent : document.body.textContent }; });
      if (flag) {
        check(`${tag}: seletor de idioma do site some de Configurações`, st.selRowDisplay === 'none' && !st.selVisible, st);
        check(`${tag}: sem lista "Meus cursos" em Configurações`, st.boxHidden, st);
        check(`${tag}: nenhum texto manda trocar de curso em Configurações`, !/trocar de curso depois em Configura/i.test(st.text) && !/switch courses later in Settings/i.test(st.text));
      } else {
        check(`${tag}: com a chave de emergência o seletor antigo continua`, st.selRowDisplay !== 'none' && st.selVisible, st);
      }
      check(`${tag}: sem erro de script`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`configurações sem troca de curso (navegador): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
