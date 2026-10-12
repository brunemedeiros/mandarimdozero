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
      const tag = `${app} flag=${flag}`;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      await ctx.addInitScript(({ flag }) => { try { sessionStorage.setItem('guest_mode', '1'); if (flag) localStorage.setItem('courses-per-site-language', '1'); } catch (e) {} }, { flag });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof showFirstCoursePick === 'function' && typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
      // simula conta nova logada, sem idioma guardado
      await page.evaluate(() => { try { localStorage.removeItem('ui-language'); } catch (e) {} CURRENT_USER = { id: 'u-novo' }; pageCourseSiteLang = 'pt-BR'; progressLoadedOk = true; progressAccountIsNew = true; progressAccountUiLanguage = null; askUiLanguageOnFirstAccess(); });
      const m1 = await page.evaluate(() => document.getElementById('ui-language-first-modal').style.display);
      check(`${tag}: conta nova vê "Eu falo..." (idioma do site)`, m1 === 'flex');
      await page.evaluate(() => document.getElementById('ui-language-first-en').click());
      await page.waitForTimeout(400);
      const st = await page.evaluate(() => ({ disp: document.getElementById('ui-language-first-modal').style.display, box: document.getElementById('ui-language-first-courses').style.display,
        btns: [...document.querySelectorAll('#ui-language-first-courses button')].map(b => b.textContent.trim()), title: document.querySelector('#ui-language-first-modal h3').textContent }));
      if (!flag) {
        check(`${tag}: sem a flag, escolher o idioma fecha o portão (como antes)`, st.disp === 'none' && st.box === 'none', st);
      } else {
        check(`${tag}: com a flag, mostra a lista de cursos do idioma escolhido`, st.disp === 'flex' && st.box !== 'none' && st.btns.length === 2, st);
        check(`${tag}: lista no idioma escolhido, curso desta página primeiro`, /Which course/.test(st.title) && /^(French|Chinese)/.test(st.btns[0]) && st.btns[0].toLowerCase().startsWith(app === 'fr' ? 'french' : 'chinese'), st);
        const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        check(`${tag}: sem rolagem horizontal em 390px`, !over);
        const nav = page.waitForNavigation({ timeout: 8000 }).then(() => 'recarregou').catch(() => 'nao');
        await page.evaluate(() => document.querySelector('#ui-language-first-courses button').click());
        const navR = await nav;
        check(`${tag}: escolher o curso desta página em outro idioma do site recarrega`, navR === 'recarregou');
        if (process.env.SHOTS) {
          await page.goto(`${base}/${app}/index.html`);
          await page.waitForFunction(() => typeof showFirstCoursePick === 'function' && CURRENT_USER === false);
          for (const theme of ['light', 'dark']) {
            await page.evaluate((th) => { document.documentElement.setAttribute('data-theme', th); try { localStorage.removeItem('ui-language'); } catch (e) {} CURRENT_USER = { id: 'u' }; progressLoadedOk = true; progressAccountIsNew = true; progressAccountUiLanguage = null; askUiLanguageOnFirstAccess(); document.getElementById('ui-language-first-en').click(); }, theme);
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${process.env.SHOTS}/${app}-${theme}-primeiro-acesso.png` });
          }
        }
      }
      check(`${tag}: sem erro de script`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  // atalho ?cursos=1
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.goto(`${base}/fr/index.html?cursos=1`);
    await page.waitForFunction(() => typeof CourseStorage !== 'undefined');
    check('atalho ?cursos=1 liga só neste navegador', await page.evaluate(() => CourseStorage.isPerSiteLanguage()));
    await page.goto(`${base}/fr/index.html`);
    await page.waitForFunction(() => typeof CourseStorage !== 'undefined');
    check('continua ligado nas próximas aberturas', await page.evaluate(() => CourseStorage.isPerSiteLanguage()));
    await page.goto(`${base}/fr/index.html?cursos=0`);
    await page.waitForFunction(() => typeof CourseStorage !== 'undefined');
    check('?cursos=0 desliga', !(await page.evaluate(() => CourseStorage.isPerSiteLanguage())));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`portão do primeiro acesso (navegador): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
