// Menu "Meus cursos" (bandeira) quando o login termina DEPOIS de o menu ser pintado (relato da dona, 2026-10-18):
// o fr mostrava só o curso atual até trocar o idioma do site. Ao abrir, o menu precisa reler a conta.
// Rodar: node tests/curso-progresso/test_menu_cursos_login_tardio.js
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
    for (const how of ['hover', 'click']) {
      const tag = `${app} ${how}`;
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, serviceWorkers: 'block', hasTouch: how === 'click' });
      await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('courses-per-site-language', '1'); } catch (e) {} });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof paintCourseMenu === 'function' && CURRENT_USER === false, null, { timeout: 20000 });
      const before = await page.evaluate(() => document.querySelectorAll('#lang-switcher-dropdown .course-menu-item').length);
      check(`${tag}: antes do login o menu só tem o curso atual`, before === 1, before);
      // O login resolve depois: a conta tem o outro idioma (pt-BR) e o mesmo idioma em inglês.
      await page.evaluate((app) => {
        const other = app === 'fr' ? 'zh' : 'fr';
        const key = (id, site) => CourseStorage.courseStorageKey(LanguageRegistry.courseIdOf(LanguageRegistry.appKeyOf(id), site), null);
        const raw = {}; raw[key(app, 'pt-BR')] = { xp: 10 }; raw[key(other, 'pt-BR')] = { xp: 5 }; raw[key(app, 'en')] = { xp: 3 };
        CURRENT_USER = { id: 'u1', user_metadata: {} };
        OTHER_LANGUAGES_RAW_CACHE = raw;
      }, app);
      if (how === 'hover') await page.hover('#lang-switcher-btn');
      else await page.evaluate(() => document.getElementById('lang-switcher-btn').click());
      await page.waitForFunction(() => document.querySelectorAll('#lang-switcher-dropdown .course-menu-item').length > 1, null, { timeout: 3000 }).catch(() => {});
      const names = await page.evaluate(() => [...document.querySelectorAll('#lang-switcher-dropdown .course-menu-item .course-name')].map(e => e.textContent));
      const want = app === 'fr' ? ['Francês', 'Chinês', 'French'] : ['Chinês', 'Francês', 'Chinese'];
      check(`${tag}: ao abrir depois do login aparecem os 3 cursos`, want.every(w => names.includes(w)) && names.length === 3, names);
      check(`${tag}: o curso atual vem primeiro`, names[0] === want[0], names);
      const open = await page.evaluate(() => document.getElementById('lang-switcher-dropdown').classList.contains('open'));
      check(`${tag}: o menu fica aberto`, open);
      check(`${tag}: sem erro de página`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`menu de cursos com login tardio: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})();
