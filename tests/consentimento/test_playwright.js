// Aviso de cookies + GA4 com consentimento (Fase 3 do projeto GA4; shared/consent.js e .css). Confere o pedido da dona:
// nada vai ao Google antes da escolha nem depois de recusar; aceitar carrega o GA4 com endereço limpo (só utm_*); recusar
// depois de aceitar apaga os cookies; textos em pt-BR e en; professora/admin não medidas; telas do app como páginas;
// Preferências pelo rodapé e pelas Configurações; links ?origem= dos testes intactos. Servidor e stub do app copiados de
// tests/escolher-usuario/test_playwright.js; stub da entrada de tests/login-obrigatorio/test_playwright.js.
// Rodar: node tests/consentimento/test_playwright.js  (SHOTS_DIR=... salva prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const GATE_STUB = /const GATE_STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/login-obrigatorio/test_playwright.js'), 'utf8'))[1];
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { friendships: [], profiles: [], earned_badges: [] };
  window.__rpc = []; window.__RPC = {}; window.__upserts = [];
  function builder(table){
    const st = { f: [], or: null, head: false };
    const matchOr = (row) => !st.or || st.or.split(',').some(p => { const [k, , v] = p.split('.'); return row[k] === v; });
    const rows = () => (window.__DB[table] || []).filter(r => st.f.every(([k, v]) => r[k] === v) && matchOr(r));
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => { const r = rows(); return Promise.resolve(st.head ? { count: r.length, data: null, error: null } : { data: r, error: null }).then(ok, ko); };
      if (prop === 'select') return (c, opts) => { if (opts && opts.head) st.head = true; return b; };
      if (prop === 'eq') return (k, v) => { st.f.push([k, v]); return b; };
      if (prop === 'or') return (s) => { st.or = s; return b; };
      if (prop === 'upsert') return (row, opts) => { window.__upserts.push({ table, row, opts }); return Promise.resolve({ data: null, error: null }); };
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: rows()[0] || null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => { window.__rpc.push({ name, args }); const h = window.__RPC[name]; return h ? { data: h(args), error: null } : { data: null, error: { message: 'missing ' + name } }; },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;



let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
async function boot(browser, lang, port, theme, viewport, ui, opts){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1280, height: 900 }, colorScheme: theme || 'light', hasTouch: !!(opts && opts.touch), isMobile: !!(opts && opts.touch) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.addInitScript(() => { window.__CONSENT_TEST__ = true; });
  if (ui) await page.addInitScript((ui) => { try { localStorage.setItem('ui-language', ui); } catch (e) {} }, ui);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

const GOOGLE = /google-analytics\.com|googletagmanager\.com|doubleclick\.net/;

async function openPage(browser, port, url, { locale = 'pt-BR', theme = 'light', viewport = { width: 390, height: 844 }, init, gate = false } = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport, colorScheme: theme, locale });
  const page = await ctx.newPage();
  const errors = [], google = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (GOOGLE.test(r.url())) google.push(r.url()); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.addInitScript(() => { window.__CONSENT_TEST__ = true; });
  if (gate) await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: GATE_STUB }));
  if (init) await page.addInitScript(init);
  await page.goto(`http://127.0.0.1:${port}/${url}`);
  return { ctx, page, errors, google };
}
const bannerOn = (page) => page.evaluate(() => !!document.querySelector('#cc-banner .cc-banner'));
const prefsOn = (page) => page.evaluate(() => !!document.querySelector('#cc-prefs [role="dialog"]'));
const choice = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('cookie-consent') || 'null'));
const hits = (page) => page.evaluate(() => (window.dataLayer || []).map(a => Array.from(a)).filter(a => a[0] === 'event').map(a => ({ name: a[1], p: a[2] })));
const cfg = (page) => page.evaluate(() => (window.dataLayer || []).map(a => Array.from(a)).find(a => a[0] === 'config'));

async function run(browser, port){
  // 1) Entrada em pt-BR: aviso aparece, nada vai ao Google; Recusar guarda a escolha e nada é carregado
  {
    const { ctx, page, errors, google } = await openPage(browser, port, 'index.html', { gate: true });
    await page.waitForSelector('#cc-banner', { timeout: 8000 });
    const txt = await page.$eval('#cc-banner', e => e.innerText);
    check('entrada: aviso em pt-BR (G3, B1 nova)', /Cookies/.test(txt) && /Este site usa cookies para melhorar a sua experiência e medir as visitas\./.test(txt) && /Recusar opcionais/.test(txt) && /Aceitar todos/.test(txt) && /Preferências/.test(txt) && /Política de cookies/.test(txt), txt);
    const sizes = await page.$$eval('#cc-banner .cc-row .cc-btn', bs => bs.map(b => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]));
    check('entrada: Recusar e Aceitar do mesmo tamanho', sizes.length === 2 && Math.abs(sizes[0][0] - sizes[1][0]) <= 1 && sizes[0][1] === sizes[1][1], sizes);
    check('entrada: Recusar à esquerda', await page.$eval('#cc-banner .cc-row .cc-btn', b => b.dataset.cc === 'reject'));
    check('entrada: sem a fonte do Google', await page.evaluate(() => ![...document.querySelectorAll('link')].some(l => /fonts\.googleapis/.test(l.href))));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-ptBR-claro-celular.png` });
    check('entrada: nada vai ao Google antes da escolha', google.length === 0, google);
    await page.click('#cc-banner [data-cc="reject"]');
    const c = await choice(page);
    check('entrada: Recusar guarda analytics=false e fecha', !(await bannerOn(page)) && c && c.analytics === false && c.v === 1, c);
    await page.reload(); await page.waitForTimeout(800);
    check('entrada: depois de recusar, o aviso não volta', !(await bannerOn(page)));
    check('entrada: depois de recusar, nada vai ao Google', google.length === 0, google);
    // Preferências pelo link do pé da página: chave desligada
    await page.click('.gate-cookie-links [data-consent-open]');
    check('entrada: link abre as Preferências', await prefsOn(page));
    check('entrada: chave da medição desligada', !(await page.$eval('#cc-analytics', e => e.checked)));
    const ptxt = await page.$eval('#cc-prefs', e => e.innerText);
    check('entrada: Preferências em pt-BR', /Preferências de cookies/.test(ptxt) && /Necessários/.test(ptxt) && /Sempre ativos/.test(ptxt) && /Medição de visitas/.test(ptxt) && /Salvar escolha/.test(ptxt), ptxt);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/preferencias-ptBR-claro-celular.png` });
    await page.keyboard.press('Escape');
    check('entrada: Esc fecha as Preferências', !(await prefsOn(page)));
    check('entrada: sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  // 1b) navegador automático sem o sinal do teste: sem aviso (não cobre os outros testes) e sem GA4
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(); const google = [];
    page.on('request', r => { if (GOOGLE.test(r.url())) google.push(r.url()); });
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.goto(`http://127.0.0.1:${port}/sobre.html`); await page.waitForTimeout(600);
    check('navegador automático: sem aviso e sem Google', !(await bannerOn(page)) && google.length === 0, google);
    await page.click('footer [data-consent-open]');
    check('navegador automático: Preferências ainda abrem pelo rodapé', await prefsOn(page));
    await ctx.close();
  }
  // 2) Entrada com convite, token e UTM: aceitar carrega o GA4 e manda só o caminho + utm_*
  {
    const { ctx, page, google } = await openPage(browser, port, 'index.html?convite=ABC123&utm_source=instagram&utm_medium=bio&email=x%40y.com#access_token=segredo', { gate: true });
    await page.waitForSelector('#cc-banner', { timeout: 8000 });
    check('UTM: nada ao Google antes de aceitar', google.length === 0, google);
    await page.click('#cc-banner [data-cc="accept"]');
    await page.waitForFunction(() => (window.dataLayer || []).length > 0);
    await page.waitForTimeout(300);
    check('aceitar: pede o gtag.js com o ID G-CE3282C1FB', google.some(u => /googletagmanager\.com\/gtag\/js\?id=G-CE3282C1FB/.test(u)), google);
    const c = await cfg(page);
    check('aceitar: cookies de 13 meses, sem Sinais nem anúncios, sem page_view automático', c && c[1] === 'G-CE3282C1FB' && c[2].cookie_expires === 34128000 && c[2].allow_google_signals === false && c[2].allow_ad_personalization_signals === false && c[2].send_page_view === false && !('user_id' in c[2]), c);
    const pv = (await hits(page)).filter(h => h.name === 'page_view');
    const loc = pv[0] && pv[0].p.page_location;
    check('aceitar: 1 page_view', pv.length === 1, pv);
    check('aceitar: endereço com utm_source e utm_medium', /utm_source=instagram/.test(loc) && /utm_medium=bio/.test(loc), loc);
    check('aceitar: sem convite, e-mail nem token no endereço', !/convite|ABC123|email|access_token|segredo|#/.test(loc), loc);
    check('aceitar: escolha guardada', (await choice(page)).analytics === true);
    // Recusar depois de aceitar: apaga os cookies do GA4 e desliga o envio
    await page.evaluate(() => { document.cookie = '_ga=GA1.1.123.456; path=/'; document.cookie = '_ga_CE3282C1FB=GS1.1.1; path=/'; });
    await page.click('.gate-cookie-links [data-consent-open]');
    check('Preferências: chave ligada para quem aceitou', await page.$eval('#cc-analytics', e => e.checked));
    await page.click('#cc-analytics'); await page.click('#cc-prefs [data-cc="save"]');
    const after = await page.evaluate(() => ({ cookies: document.cookie, off: window['ga-disable-G-CE3282C1FB'] === true, c: JSON.parse(localStorage.getItem('cookie-consent')) }));
    check('revogar: apaga _ga e _ga_CE3282C1FB', !/_ga/.test(after.cookies), after.cookies);
    check('revogar: desliga o envio e guarda a recusa', after.off && after.c.analytics === false, after);
    await ctx.close();
  }
  // 3) UTM guardado na aba: chega com utm, navega, só aceita na segunda página
  {
    const { ctx, page } = await openPage(browser, port, 'sobre.html?utm_source=tiktok&utm_medium=video');
    await page.waitForSelector('#cc-banner');
    await page.goto(`http://127.0.0.1:${port}/privacidade-cookies.html`);
    await page.waitForSelector('#cc-banner');
    await page.click('#cc-banner [data-cc="accept"]');
    await page.waitForTimeout(200);
    const loc = ((await hits(page)).find(h => h.name === 'page_view') || { p: {} }).p.page_location || '';
    check('UTM da chegada vai na primeira visita medida', /\/privacidade-cookies\.html\?utm_source=tiktok&utm_medium=video$/.test(loc), loc);
    await ctx.close();
  }
  // 4) Páginas simples: idioma pelo navegador (en), link do rodapé
  {
    const { ctx, page, errors } = await openPage(browser, port, 'sobre.html', { locale: 'en-US', theme: 'dark', viewport: { width: 1280, height: 860 } });
    await page.waitForSelector('#cc-banner');
    const txt = await page.$eval('#cc-banner', e => e.innerText);
    check('sobre (en): aviso em inglês, sem português', /This site uses cookies to improve your experience and measure visits\./.test(txt) && /Reject optional/.test(txt) && /Accept all/.test(txt) && /Preferences/.test(txt) && /Cookie policy/.test(txt) && !/Recusar|Aceitar|Política|Preferências|cookies para/.test(txt), txt);
    check('sobre (en): link da política vai para #en', await page.$eval('#cc-banner .cc-policy a', a => /privacidade-cookies\.html#en$/.test(a.href)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sobre-en-escuro-computador.png` });
    await page.click('footer [data-consent-open]');
    check('sobre: rodapé abre as Preferências (en)', await prefsOn(page) && /Cookie preferences/.test(await page.$eval('#cc-prefs', e => e.innerText)));
    check('sobre: sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  // 5) Teste de nivelamento de português (página em inglês): aviso em inglês e ?origem= intacto
  {
    const { ctx, page, google } = await openPage(browser, port, 'teste-de-nivelamento-pt/?origem=instagram-bio&utm_source=instagram');
    await page.waitForSelector('#cc-banner');
    check('teste pt: aviso em inglês', /Accept all/.test(await page.$eval('#cc-banner', e => e.innerText)));
    const src = await page.$eval('#app', f => f.getAttribute('src'));
    check('teste pt: ?origem= continua indo para o Apps Script', /teste=pt&origem=instagram-bio/.test(src), src);
    check('teste pt: nada ao Google antes da escolha', google.length === 0, google);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/teste-pt-en-claro-celular.png` });
    await ctx.close();
  }
  {
    const { ctx, page } = await openPage(browser, port, 'teste-de-nivelamento-fr/?origem=tiktok');
    await page.waitForSelector('#cc-banner');
    check('teste fr: aviso em pt-BR', /Aceitar todos/.test(await page.$eval('#cc-banner', e => e.innerText)));
    check('teste fr: ?origem= intacto', /origem=tiktok/.test(await page.$eval('#app', f => f.getAttribute('src'))));
    await ctx.close();
  }
  // 6) App (fr e zh): telas como páginas, eventos de lição, professora/admin fora, Configurações
  for (const lang of ['fr', 'zh']){
    const accepted = () => { try { localStorage.setItem('cookie-consent', JSON.stringify({ v: 1, analytics: true, at: '2026-11-16T10:00:00Z' })); } catch (e) {} };
    // aluna que aceitou
    {
      const { page, ctx, errors } = await boot(browser, lang, port, 'light', { width: 390, height: 844 }, 'pt-BR', { touch: true });
      await page.evaluate(accepted);
      await page.evaluate(() => { window.dataLayer = []; });
      const google0 = await page.evaluate(() => (window.dataLayer || []).length);
      check(`${lang}: antes de saber quem está logado, nada é medido`, google0 === 0 && !(await page.evaluate(() => ProfBruneConsent.measuring())));
      await page.evaluate(() => { ProfBruneConsent.mirror('tab_switch', 'path'); ProfBruneConsent.setContext({ staff: false }); });
      await page.waitForTimeout(100);
      let pv = (await hits(page)).filter(h => h.name === 'page_view');
      check(`${lang}: depois do contexto, 1 página (a tela que já estava aberta)`, pv.length === 1 && new RegExp(`/${lang}/path$`).test(pv[0].p.page_location), pv);
      await page.evaluate(() => { trackEvent('tab_switch', 'review'); trackEvent('tab_switch', 'admin-badges'); trackEvent('tab_switch', 'teacher-panel'); trackEvent('lesson_complete', 'vocab_lesson'); trackEvent('review_answer', 'x'); });
      const hs = await hits(page);
      pv = hs.filter(h => h.name === 'page_view');
      check(`${lang}: troca de tela vira página (review)`, pv.some(h => new RegExp(`/${lang}/review$`).test(h.p.page_location)), pv);
      check(`${lang}: Painel de Admin e da Professora nunca viram página`, !pv.some(h => /admin|teacher/.test(h.p.page_location)), pv);
      check(`${lang}: lição concluída vira evento, sem dado pessoal`, hs.some(h => h.name === 'lesson_complete' && h.p.lesson_type === 'vocab_lesson' && h.p.course === lang && Object.keys(h.p).length === 2), hs);
      check(`${lang}: resposta da Revisão não vai ao GA4`, !hs.some(h => h.name === 'review_answer'));
      // Configurações: botão abre as Preferências
      await page.evaluate(() => { const b = document.querySelector('#settings-cookies-box [data-consent-open]'); b.click(); });
      check(`${lang}: Configurações abrem as Preferências`, await prefsOn(page));
      check(`${lang}: sem erro de página`, errors.length === 0, errors);
      await ctx.close();
    }
    // professora: nada medido e o aparelho fica marcado
    {
      const { page, ctx } = await boot(browser, lang, port, 'light', null, 'pt-BR');
      await page.evaluate(accepted);
      await page.evaluate(() => { window.dataLayer = []; ProfBruneConsent.setContext({ staff: true }); trackEvent('tab_switch', 'review'); });
      const r = await page.evaluate(() => ({ on: ProfBruneConsent.measuring(), dl: (window.dataLayer || []).length, ign: localStorage.getItem('ga-ignore-device') }));
      check(`${lang}: professora/admin não é medida e o aparelho fica marcado`, !r.on && r.dl === 0 && r.ign === '1', r);
      await ctx.close();
    }
    // aviso no app, sem escolha: acima do menu de baixo no celular; inglês no tema escuro
    {
      const { page, ctx } = await boot(browser, lang, port, 'light', { width: 390, height: 844 }, 'pt-BR', { touch: true });
      await page.waitForSelector('#cc-banner');
      const pos = await page.evaluate(() => { const b = document.querySelector('#cc-banner .cc-pop').getBoundingClientRect(); const nav = document.querySelector('.bottom-nav, .mobile-nav, nav.tabs, .tab-bar'); return { bottom: Math.round(b.bottom), navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null, vh: innerHeight }; });
      check(`${lang}: no celular o aviso fica acima do menu de baixo`, pos.navTop === null ? pos.bottom <= pos.vh - 60 : pos.bottom <= pos.navTop + 1, pos);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${lang}-app-ptBR-claro-celular.png` });
      await ctx.close();
      const b2 = await boot(browser, lang, port, 'dark', { width: 1280, height: 860 }, 'en');
      await b2.page.waitForFunction(() => getUiLang() === 'en');
      await b2.page.waitForSelector('#cc-banner');
      const t2 = await b2.page.$eval('#cc-banner', e => e.innerText);
      check(`${lang}: aviso do app em inglês`, /Accept all/.test(t2) && !/Aceitar|Recusar/.test(t2), t2);
      await b2.page.click('#cc-banner [data-cc="prefs"]');
      if (SHOTS) await b2.page.screenshot({ path: `${SHOTS}/${lang}-preferencias-en-escuro-computador.png` });
      await b2.ctx.close();
    }
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try { await run(browser, port); }
  finally { await browser.close(); server.close(); }
  console.log(`consentimento: ${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
