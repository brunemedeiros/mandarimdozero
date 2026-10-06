// Fase 3 da trilha (06/10/2026) -- shell mobile: barra inferior com 5 itens
// (Estudo|Revisão|Desafios|Perfil|Mais), alvos de toque de 44px, Missões
// recolhidas por padrão no celular, sem overflow horizontal. FR + ZH, claro/escuro.
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
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    for (const scheme of ['light', 'dark']){
      console.log('== ' + lang + ' ' + scheme);
      const L = (n, c, x) => check(`${lang}/${scheme} ${n}`, c, x);
      const open = async (w, h) => {
        const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: w < 900 });
        const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
        await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
        await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
        await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
        await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
        await page.evaluate(() => renderUnitsGrid());
        return { ctx, page, errors };
      };
      for (const w of [360, 390]){
        const { ctx, page, errors } = await open(w, 800);
        const r = await page.evaluate(() => {
          const nav = document.getElementById('app-bottom-nav');
          const items = [...nav.querySelectorAll('.tab-btn')].map(b => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim(), w: r.width, h: r.height, tab: b.dataset.tab || b.id }; });
          const chev = document.querySelector('.ub-chevron'); const cr = chev && chev.getBoundingClientRect();
          const hit = chev ? document.elementFromPoint(cr.left - 8, cr.top + cr.height / 2) : null;
          const lang = document.querySelector('.lang-switcher-btn'); const lr = lang.getBoundingClientRect();
          const lhit = null;
          const lvl = document.getElementById('level-toggle-btn');
          const strip = document.querySelector('#daily-challenges-strip .dcs-cards');
          const mais = [...document.querySelectorAll('#user-menu-dropdown .mais-promoted-tab')].map(e => getComputedStyle(e).display);
          return { items, chevHit: !!(hit && hit.closest('.ub-chevron')), langW: lr.width, langH: lr.height,
            lvlH: lvl ? lvl.getBoundingClientRect().height : null, stripCollapsed: strip ? strip.style.display === 'none' : null,
            capH: document.querySelector('#daily-challenges-strip .dcs-caption-btn').getBoundingClientRect().height,
            overflow: document.documentElement.scrollWidth > window.innerWidth, mais };
        });
        L(`${w}px: 5 itens na barra`, r.items.length === 5, r.items.map(i => i.label));
        L(`${w}px: ordem Estudo|Revisão|Desafios|Perfil|Mais`, r.items.map(i => i.label).join('|') === (lang === 'zh' ? 'Estudo|Revisão|汉字|Perfil|Mais' : 'Estudo|Revisão|Desafios|Perfil|Mais'), r.items.map(i => i.label));
        L(`${w}px: cada item >= 44px de alto e >= 60 de largura`, r.items.every(i => i.h >= 44 && i.w >= 60), r.items);
        L(`${w}px: chevron tem área de toque ampliada`, lang === 'zh' || r.chevHit, r);
        L(`${w}px: seletor de idioma >= 44px`, r.langW >= 43.9 && r.langH >= 43.9, r);
        L(`${w}px: botão de nível >= 44px`, lang === 'zh' || r.lvlH >= 43.9, r.lvlH);
        L(`${w}px: botão das Missões >= 44px`, r.capH >= 43.9, r.capH);
        L(`${w}px: Missões recolhidas por padrão`, r.stripCollapsed === true, r.stripCollapsed);
        L(`${w}px: item promovido some do Mais`, r.mais.length === 1 && r.mais.every(d => d === 'none'), r.mais);
        L(`${w}px: sem overflow horizontal`, !r.overflow);
        // Desafios navega e destaca
        const pr = await page.evaluate(() => { const b = document.querySelector('#app-bottom-nav .tab-btn:nth-child(3)'); b.click();
          return { tab: b.dataset.tab, active: b.classList.contains('active'), view: [...document.querySelectorAll('.view')].find(v => getComputedStyle(v).display !== 'none') && [...document.querySelectorAll('.view')].find(v => getComputedStyle(v).display !== 'none').id }; });
        L(`${w}px: Desafios abre a tela certa`, pr.active && pr.view === 'view-' + pr.tab, pr);
        if (process.env.SHOTS && w === 390) await page.screenshot({ path: path.join(process.env.SHOTS, `mobile-${lang}-${scheme}.png`) });
        L(`${w}px: sem erro de página`, errors.length === 0, errors);
        await ctx.close();
      }
      // desktop: Missões abertas e item promovido continua oculto (mais-extra-tab) e nav escondida
      const { ctx, page, errors } = await open(1280, 900);
      const d = await page.evaluate(() => ({ strip: getComputedStyle(document.getElementById('app-bottom-nav')).display,
        side: (document.querySelector('#side-missions-body .dcs-cards') || {}).style && document.querySelector('#side-missions-body .dcs-cards').style.display }));
      L('desktop: barra inferior oculta', d.strip === 'none', d);
      L('desktop: Missões abertas por padrão', d.side !== 'none', d);
      L('desktop: sem erro de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
