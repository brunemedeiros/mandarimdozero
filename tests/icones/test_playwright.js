// Troca geral de ícones (shared/emoji-icons.js, docs/icones-fluent.md). Playwright, FR + ZH, claro/escuro e celular.
// Rodar: node tests/icones/test_playwright.js  (SHOTS_DIR=... salva prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const served = new Set(), missing = new Set();
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ if (p.includes('/icons/')) missing.add(p); res.writeHead(404); return res.end(); }
  if (p.includes('/shared/icons/')) served.add(p);
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `window.supabase={createClient(){const q=new Proxy({},{get(_,p){if(p==='then')return r=>r({data:[],error:null});if(p==='maybeSingle'||p==='single')return async()=>({data:null,error:null});return()=>q;}});return{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({})},from(){return q},rpc:async()=>({data:null,error:null}),channel(){return{on(){return this},subscribe(){return this}}},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})},functions:{invoke:async()=>({data:null,error:null})}}}};`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function boot(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1280, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  return { page, errors, ctx };
}

async function run(browser, port, lang){
  const { page, errors, ctx } = await boot(browser, lang, port);
  const L = lang;
  check(`${L}: script carregado com o mapa`, await page.evaluate(() => !!window.EmojiIcons && Object.keys(EmojiIcons.MAP).length >= 200));
  const nEmo = await page.evaluate(() => document.querySelectorAll('.emo').length);
  check(`${L}: emojis da tela viraram ícone`, nEmo > 5, nEmo);
  // texto preservado
  const r = await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'emo-test';
    d.innerHTML = '<p id="t1">Muito bem 🔥 e ✓</p><input id="t2" value="🔥"><textarea id="t3">🎉</textarea><code id="t4">⭐</code><p id="t5">🫠</p><p id="t6" data-no-emoji-icons>🎯</p>';
    document.body.appendChild(d);
    return new Promise(res => setTimeout(() => res({
      t1: document.getElementById('t1').textContent, t1n: document.querySelectorAll('#t1 .emo').length,
      t2: document.getElementById('t2').value, t3: document.querySelectorAll('#t3 .emo').length, t4: document.querySelectorAll('#t4 .emo').length,
      t5: document.querySelectorAll('#t5 .emo').length, t6: document.querySelectorAll('#t6 .emo').length,
      label: document.querySelector('#t1 .emo').getAttribute('aria-label'),
      color: getComputedStyle(document.querySelector('#t1 .emo')).color }), 50));
  });
  check(`${L}: texto continua com o emoji (textContent)`, r.t1 === 'Muito bem 🔥 e ✓', r);
  check(`${L}: dois ícones no parágrafo (🔥 e ✓)`, r.t1n === 2, r);
  check(`${L}: campo de texto e <code> intactos`, r.t2 === '🔥' && r.t3 === 0 && r.t4 === 0, r);
  check(`${L}: emoji fora do mapa fica como está`, r.t5 === 0, r);
  check(`${L}: data-no-emoji-icons respeitado`, r.t6 === 0, r);
  check(`${L}: leitor de tela lê o emoji`, r.label === '🔥', r);
  check(`${L}: caractere transparente`, /rgba\(0, 0, 0, 0\)|transparent/.test(r.color), r.color);
  // conteúdo que muda depois (toast) também vira ícone
  await page.evaluate(() => showToast('Teste ⭐'));
  await page.waitForTimeout(100);
  check(`${L}: aviso criado depois também vira ícone`, await page.evaluate(() => [...document.querySelectorAll('.emo')].some(e => e.textContent === '⭐')));
  // menus
  const nav = await page.$$eval('img.tab-icon', els => els.map(e => ({ ok: e.complete && e.naturalWidth > 0, src: e.getAttribute('src') })));
  check(`${L}: ícones do menu são do Fluent`, nav.length >= 15, nav.length);
  // todos os arquivos usados existem
  const urls = await page.evaluate(() => [...new Set([...document.querySelectorAll('.emo')].map(e => e.style.getPropertyValue('--emo').replace(/^url\("|"\)$/g, '')))]);
  const st = await page.evaluate(async (us) => Promise.all(us.map(u => fetch(u).then(r => r.status))), urls);
  check(`${L}: arquivos dos ícones existem (${urls.length})`, st.every(s => s === 200), urls.filter((u, i) => st[i] !== 200));
  check(`${L}: sem erros`, errors.length === 0, errors);
  await ctx.close();
}

async function visual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    const { page, errors, ctx } = await boot(browser, lang, port, theme, vp);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${lang} ${theme} ${vp.width}: sem rolagem lateral`, over <= 0, over);
    if (SHOTS){
      await page.screenshot({ path: path.join(SHOTS, `icones-trilha-${lang}-${theme}-${vp.width}.png`) });
      await page.evaluate(() => switchTab('profile')); await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, `icones-perfil-${lang}-${theme}-${vp.width}.png`) });
    }
    check(`${lang} ${theme} ${vp.width}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { await run(browser, port, 'fr'); await run(browser, port, 'zh'); await visual(browser, port); }
  catch (e) { failed++; console.log('  ERRO:', e.message); }
  check('nenhum ícone pedido ficou sem arquivo', missing.size === 0, [...missing]);
  await browser.close(); server.close();
  console.log(`Ícones (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
