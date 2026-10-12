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

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']) {
    for (const flag of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      await ctx.addInitScript(({ flag }) => { try { sessionStorage.setItem('guest_mode', '1'); if (flag) localStorage.setItem('courses-per-site-language', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} }, { flag });
      const page = await ctx.newPage();
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof renderMyCourses === 'function' && typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 }).catch(async e => { console.log('ERRS', errs, await page.evaluate(() => typeof LanguageRegistry + typeof CourseStorage + typeof t)); throw e; });
      await page.evaluate(() => { renderMyCourses(); });
      const tag = `${app} flag=${flag}`;
      const state = await page.evaluate(() => { const b = document.getElementById('my-courses'); return { exists: !!b, display: b && b.style.display, buttons: b ? b.querySelectorAll('button.my-course').length : 0, text: b ? b.textContent : '' }; });
      if (!flag) {
        check(`${tag}: "Meus cursos" escondido com a flag desligada`, state.exists && state.display === 'none' && state.buttons === 0, state);
      } else {
        check(`${tag}: "Meus cursos" aparece com a flag ligada`, state.display !== 'none' && state.buttons >= 3, state);
        check(`${tag}: mostra o título`, /Meus cursos/.test(state.text), state.text.slice(0, 80));
        const cur = await page.evaluate(() => [...document.querySelectorAll('button.my-course[aria-current]')].map(b => b.textContent.trim()));
        check(`${tag}: exatamente um curso atual (pt-BR)`, cur.length === 1 && /^(Francês|Chinês)\s+ATUAL$/i.test(cur[0].replace(/\s+/g,' ')), cur);
        // abrir o aviso ao escolher o curso em inglês do mesmo idioma
        await page.evaluate(() => { document.getElementById('my-courses').scrollIntoView(); });
        const target = await page.$(`button.my-course[data-app="${app === 'fr' ? 'frances' : 'mandarim'}"][data-site="en"]`);
        check(`${tag}: há botão do curso em inglês`, !!target);
        if (target) {
          await page.evaluate((sel) => document.querySelector(sel).click(), `button.my-course[data-app="${app === 'fr' ? 'frances' : 'mandarim'}"][data-site="en"]`);
          const modal = await page.evaluate(() => ({ disp: document.getElementById('ui-language-confirm-modal').style.display, body: document.getElementById('ui-language-confirm-body').textContent }));
          check(`${tag}: aviso novo aparece com o nome do curso`, modal.disp === 'flex' && /curso novo, com progresso próprio/.test(modal.body) && /(French|Chinese)/.test(modal.body), modal);
          await page.evaluate(() => document.getElementById('ui-language-confirm-no').click());
          const closed = await page.evaluate(() => document.getElementById('ui-language-confirm-modal').style.display);
          check(`${tag}: Cancelar fecha sem trocar`, closed === 'none');
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        check(`${tag}: sem rolagem horizontal em 390px`, !overflow);
        if (process.env.SHOTS) {
          await page.evaluate(() => { switchTab('settings'); renderMyCourses(); });
          for (const theme of ['light', 'dark']) {
            await page.evaluate((th) => { document.documentElement.setAttribute('data-theme', th); }, theme);
            await page.waitForTimeout(800);
            await page.evaluate(() => document.getElementById('my-courses').scrollIntoView({ block: 'center' }));
            await page.waitForTimeout(300);
            const vis = await page.evaluate(() => { const r = document.getElementById('my-courses').getBoundingClientRect(); return [r.width, r.height]; });
            check(`${app} ${theme}: bloco visível com tamanho`, vis[0] > 100 && vis[1] > 60, vis);
            await page.screenshot({ path: `${process.env.SHOTS}/${app}-${theme}-meus-cursos.png` });
          }
        }
      }
      check(`${tag}: sem erro de script`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`meus cursos (navegador): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
