// Fase 7 -- modo Mapa (fr e zh), Chromium real.
// Rodar: node tests/trilha/test_trail_map.js
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
async function boot(browser, port, lang, vp, dark){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: vp || { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.addInitScript((d) => { try { if (d) localStorage.setItem('theme_pref','dark'); } catch (e) {} }, dark);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { ctx, page, errors };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    const key = lang === 'fr' ? 'frances_trail_view' : 'mandarim_trail_view';
    for (const [vpName, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 800 }]]){
      const tag = `[${lang} ${vpName}] `;
      const { ctx, page, errors } = await boot(browser, port, lang, vp);
      await page.evaluate(() => renderUnitsGrid());
      check(tag + 'padrão = Trilha, sem mapa', await page.evaluate(() => !document.querySelector('.trail-map')));
      check(tag + 'alternador existe', (await page.locator('.tvt-btn').count()) === 2);
      await page.click('.tvt-btn[data-view="map"]');
      check(tag + 'mapa aparece', (await page.locator('.trail-map').count()) === 1);
      check(tag + 'preferência salva', await page.evaluate(k => localStorage.getItem(k) === 'map', key));
      const info = await page.evaluate(() => ({ nodes: document.querySelectorAll('.tm-node').length, cur: document.querySelectorAll('.tm-node[aria-current="step"]').length,
        labels: [...document.querySelectorAll('.tm-node')].every(n => n.getAttribute('aria-label')), pressed: document.querySelector('.tvt-btn[data-view="map"]').getAttribute('aria-pressed') }));
      check(tag + 'tem nós, no máx. 1 atual, aria-label em todos', info.nodes > 3 && info.cur <= 1 && info.labels && info.pressed === 'true', info);
      // abrir painel
      const first = page.locator('.tm-node.tm-unit').first();
      await first.click();
      check(tag + 'painel abre', await page.evaluate(() => !document.querySelector('.tm-panel').hidden && !!document.querySelector('.tm-title').textContent));
      check(tag + 'foco vai para o título do painel (Fase 8)', await page.evaluate(() => document.activeElement === document.querySelector('.tm-title')));
      check(tag + 'botão de ação no painel', (await page.locator('.tm-actions button').count()) >= 1);
      if (vpName === 'mobile'){
        const pos = await page.evaluate(() => { const r = document.querySelector('.tm-panel').getBoundingClientRect(); return { position: getComputedStyle(document.querySelector('.tm-panel')).position, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, w: Math.round(r.width) }; });
        check(tag + 'painel é bottom sheet', pos.bottom >= pos.vh - 2 && pos.w >= 380, pos);
        check(tag + 'backdrop visível', await page.evaluate(() => !document.querySelector('.tm-backdrop').hidden));
      }
      await page.keyboard.press('Escape');
      check(tag + 'ESC fecha', await page.evaluate(() => document.querySelector('.tm-panel').hidden));
      // ação abre a unidade
      await first.click();
      const label = await page.locator('.tm-actions button').first().textContent();
      await page.locator('.tm-actions button').first().click();
      check(tag + 'ação do painel funciona (' + label.trim() + ')', await page.evaluate(() => !!document.querySelector('#view-unit-detail.active, .view.active#view-unit') || location.hash.includes('unit') || document.querySelector('.view.active') != null));
      // persistência após recarregar
      await page.reload();
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
      await page.evaluate(() => { try { location.hash=''; switchTab('path'); } catch(e){} renderUnitsGrid(); });
      check(tag + 'mapa persiste após recarregar', (await page.locator('.trail-map').count()) === 1);
      await page.click('.tvt-btn[data-view="trail"]');
      check(tag + 'volta para Trilha', (await page.locator('.trail-map').count()) === 0);
      check(tag + 'sem erros de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  // fr: unidade bloqueada só oferece pular se permitido; revisão/ponto de verificação nos nós
  {
    const { ctx, page, errors } = await boot(browser, port, 'fr');
    await page.evaluate(() => { localStorage.setItem('frances_trail_view', 'map'); renderUnitsGrid(); });
    const kinds = await page.evaluate(() => [...new Set([...document.querySelectorAll('.tm-node')].map(n => n.className.split(' ')[1]))]);
    check('fr: mapa tem nós de unidade e ponto de verificação', kinds.includes('tm-unit') && kinds.includes('tm-checkpoint'), kinds);
    const lockedBtn = page.locator('.tm-node.locked').first();
    if (await lockedBtn.count()){
      await lockedBtn.click();
      const acts = await page.evaluate(() => [...document.querySelectorAll('.tm-actions button')].map(b => b.textContent));
      const allowed = await page.evaluate(() => (typeof trailSkipAllowed === 'function') ? !!trailSkipAllowed() : false);
      check('fr: nó bloqueado explica; ação de pular só se permitido', allowed ? acts.length >= 1 : acts.every(a => !/pular/i.test(a)), { acts, allowed });
    }
    check('fr: sem erros', errors.length === 0, errors);
    await ctx.close();
  }
  // tema escuro: contraste do painel/nós
  for (const lang of ['fr', 'zh']){
    const { ctx, page } = await boot(browser, port, lang, { width: 1280, height: 900 }, true);
    await page.evaluate(k => { localStorage.setItem(k, 'map'); document.documentElement.setAttribute('data-theme','dark'); renderUnitsGrid(); }, lang === 'fr' ? 'frances_trail_view' : 'mandarim_trail_view');
    await page.locator('.tm-node').first().click();
    const c = await page.evaluate(() => { const p = document.querySelector('.tm-panel'); const s = getComputedStyle(p); const n = getComputedStyle(document.querySelector('.tm-node')); return { pbg: s.backgroundColor, pc: getComputedStyle(document.querySelector('.tm-title')).color, nbg: n.backgroundColor, nc: n.color }; });
    check(`${lang} escuro: texto difere do fundo`, c.pbg !== c.pc && c.nbg !== c.nc, c);
    await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/map-${lang}-dark.png` : '/tmp/map.png' });
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\nFase 7 mapa: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
