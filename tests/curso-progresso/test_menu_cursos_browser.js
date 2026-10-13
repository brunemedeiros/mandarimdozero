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
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, serviceWorkers: 'block' });
      await ctx.addInitScript(({ flag }) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('courses-per-site-language', flag ? '1' : '0'); } catch (e) {} }, { flag });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof paintCourseMenu === 'function' && CURRENT_USER === false, null, { timeout: 20000 });
      await page.hover('#lang-switcher-btn');
      await page.waitForTimeout(300);
      const dd = await page.evaluate(() => { const d = document.getElementById('lang-switcher-dropdown'); return { open: d.classList.contains('open'), text: d.textContent.replace(/\s+/g, ' ').trim(), items: d.querySelectorAll('.course-menu-item').length, add: !!d.querySelector('.course-menu-add') }; });
      if (!flag) {
        check(`${tag}: sem a flag o menu da bandeira é o de antes (abre só no clique)`, !dd.open && !dd.add);
        await page.click('#lang-switcher-btn'); 
        const old = await page.evaluate(() => document.getElementById('lang-switcher-dropdown').textContent);
        check(`${tag}: menu antigo continua ("Você está estudando")`, /Você está estudando/.test(old), old);
      } else {
        check(`${tag}: passar o mouse na bandeira abre o menu`, dd.open, dd);
        check(`${tag}: mostra "Meus cursos", o curso atual e "Adicionar curso"`, /Meus cursos/.test(dd.text) && dd.items === 1 && dd.add && /Adicionar curso/.test(dd.text), dd);
        check(`${tag}: nome direto do curso`, new RegExp(app === 'fr' ? '^Meus cursos Francês' : '^Meus cursos Chinês').test(dd.text), dd.text);
        if (process.env.SHOTS) { await page.screenshot({ path: `${process.env.SHOTS}/${app}-menu-bandeira.png`, clip: { x: 500, y: 0, width: 500, height: 260 } }); }
        await page.mouse.move(10, 400); await page.waitForTimeout(600);
        check(`${tag}: tirar o mouse fecha o menu`, !(await page.evaluate(() => document.getElementById('lang-switcher-dropdown').classList.contains('open'))));
        await page.hover('#lang-switcher-btn'); await page.waitForTimeout(200);
        await page.click('.course-menu-add');
        await page.waitForSelector('#add-course-overlay .add-course-card');
        let ov = await page.evaluate(() => ({ disp: document.getElementById('add-course-overlay').style.display, cards: [...document.querySelectorAll('.add-course-card')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), sel: document.querySelector('.add-course-speak button[aria-pressed="true"]').dataset.site, opts: [...document.querySelectorAll('.add-course-speak button')].map(o => o.textContent) }));
        check(`${tag}: "Adicionar curso" abre a tela com "Eu falo português" e os cursos`, ov.disp === 'flex' && ov.sel === 'pt-BR' && ov.cards.length === 2 && ov.cards.some(c => /^✓?\s*Francês/.test(c)) && ov.cards.some(c => /Chinês/.test(c)) && ov.opts.join('|') === 'Eu falo português|Eu falo inglês', ov);
        if (process.env.SHOTS) { await page.screenshot({ path: `${process.env.SHOTS}/${app}-adicionar-curso-pt.png` }); }
        await page.click('.add-course-speak button[data-site="en"]');
        await page.waitForTimeout(200);
        ov = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.add-course-card')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), head: document.querySelector('#add-course-overlay .add-course-group').textContent }));
        check(`${tag}: "Eu falo inglês" mostra French e Chinese`, ov.cards.length === 2 && ov.cards.some(c => /French/.test(c)) && ov.cards.some(c => /Chinese/.test(c)) && /falantes de inglês/.test(ov.head), ov);
        if (process.env.SHOTS) { await page.screenshot({ path: `${process.env.SHOTS}/${app}-adicionar-curso-en.png` }); }
        await page.evaluate(() => document.querySelector('.add-course-card').click());
        const modal = await page.evaluate(() => ({ disp: document.getElementById('ui-language-confirm-modal').style.display, body: document.getElementById('ui-language-confirm-body').textContent, add: document.getElementById('add-course-overlay').style.display }));
        check(`${tag}: escolher um curso abre o aviso de curso novo e fecha a tela`, modal.disp === 'flex' && /curso novo, com progresso próprio/.test(modal.body) && modal.add === 'none', modal);
        await page.evaluate(() => document.getElementById('ui-language-confirm-no').click());
      }
      check(`${tag}: sem erro de script`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  // celular 390px: sem rolagem horizontal na tela Adicionar curso
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('courses-per-site-language', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.goto(`${base}/fr/index.html`);
    await page.waitForFunction(() => typeof openAddCourse === 'function' && CURRENT_USER === false);
    await page.evaluate(() => openAddCourse()); await page.waitForSelector('.add-course-card');
    check('390px: Adicionar curso sem rolagem horizontal', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    const h = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.add-course-card, .add-course-speak')].map(e => e.getBoundingClientRect().height)));
    check('390px: alvos de toque >= 44px', h >= 44, h);
    if (process.env.SHOTS) {
      for (const theme of ['light', 'dark']) { await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.screenshot({ path: `${process.env.SHOTS}/fr-${theme}-adicionar-curso-390.png` }); }
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`menu de cursos (navegador): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
