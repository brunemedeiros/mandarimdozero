// Janela de confirmação de idade (Fase P, "A1 nova" da dona, migration 136; shared/age-ack.js). Servidor e stub copiados de
// tests/escolher-usuario/test_playwright.js. FR + ZH, pt-BR e en, claro/escuro e celular. Supabase stubado em memória.
// Rodar: node tests/privacidade-padrao/test_janela_idade_playwright.js  (SHOTS_DIR=... salva prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
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
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\/shared\/vendor\/supabase-js/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  if (ui) await page.addInitScript((ui) => { try { localStorage.setItem('ui-language', ui); } catch (e) {} }, ui);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}


async function setup(page, { role = 'user', email = 'aluna@example.invalid', acked = false, rpcFails = false } = {}){
  await page.evaluate(({ role, email, acked, rpcFails }) => {
    CURRENT_USER = { id: 'me', email, user_metadata: {} };
    PROFILE_CACHE = { user_id: 'me', username: 'aluna', display_name: 'Aluna', role };
    window.__DB.profile_private = acked ? [{ user_id: 'me', age_ack_at: '2026-11-15T10:00:00Z' }] : [{ user_id: 'outra', age_ack_at: null }];
    if (rpcFails) delete window.__RPC.ack_my_age;
    else window.__RPC.ack_my_age = () => '2026-11-15T21:00:00Z';
    document.getElementById('age-ack-modal')?.remove();
    try { sessionStorage.removeItem('age-ack-later'); } catch (e) {}
  }, { role, email, acked, rpcFails });
}
const has = (page) => page.evaluate(() => !!document.querySelector('#age-ack-modal .tpop.age-ack-pop[role="dialog"]'));

async function run(browser, port, lang){
  // 1) conta sem a data: a janela aparece, "Confirmar" travado até marcar, grava, agradece e fecha
  {
    const { page, errors, ctx } = await boot(browser, lang, port, 'light', { width: 390, height: 844 }, 'pt-BR', { touch: true });
    await setup(page);
    await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: sem a data, a janela aparece`, await has(page));
    const t1 = await page.$eval('#age-ack-modal', e => e.innerText);
    check(`${lang}: textos em pt-BR`, /Uma confirmação rápida/.test(t1) && /Leva um segundo/.test(t1) && /Tenho 18 anos ou mais, ou tenho autorização do meu responsável/.test(t1) && /Agora não/.test(t1) && /Confirmar/.test(t1), t1);
    // Confirmar sempre ligado (decisão da autora, 2026-11-27): sem a caixinha, avisa, marca em vermelho e não grava nada.
    check(`${lang}: nada marcado de antemão e Confirmar ligado`, await page.evaluate(() => !document.getElementById('age-ack-check').checked && !document.getElementById('age-ack-confirm').disabled));
    await page.click('#age-ack-confirm');
    const semMarcar = await page.evaluate(() => ({ note: document.getElementById('age-ack-note').textContent, red: document.querySelector('.age-ack-label').classList.contains('is-invalid'), rpc: window.__rpc.some(r => r.name === 'ack_my_age'), open: !!document.getElementById('age-ack-modal') }));
    check(`${lang}: Confirmar sem marcar: avisa, caixinha vermelha, não grava e a janela fica`, /Marque a caixinha para continuar/.test(semMarcar.note) && semMarcar.red && !semMarcar.rpc && semMarcar.open, semMarcar);
    await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: chamar de novo não duplica`, await page.evaluate(() => document.querySelectorAll('#age-ack-modal').length === 1));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${lang}-ptBR-claro-celular.png` });
    await page.check('#age-ack-check');
    check(`${lang}: marcar tira o aviso e o vermelho`, await page.evaluate(() => !document.querySelector('.age-ack-label').classList.contains('is-invalid') && document.getElementById('age-ack-note').textContent === ''));
    await page.uncheck('#age-ack-check');
    check(`${lang}: desmarcar deixa o Confirmar ligado (avisa ao tocar)`, await page.evaluate(() => !document.getElementById('age-ack-confirm').disabled));
    await page.check('#age-ack-check');
    await page.click('#age-ack-confirm');
    await page.waitForFunction(() => window.__rpc.some(r => r.name === 'ack_my_age'));
    check(`${lang}: Confirmar grava pela ack_my_age`, true);
    const thanks = await page.$eval('#age-ack-modal', e => e.innerText).catch(() => '');
    check(`${lang}: agradece`, /Obrigada! Tudo certo\./.test(thanks), thanks);
    await page.waitForFunction(() => !document.getElementById('age-ack-modal'), null, { timeout: 5000 });
    check(`${lang}: a janela fecha depois`, !(await has(page)));
    check(`${lang}: sem erro de página`, errors.length === 0, errors);
    await ctx.close();
  }
  // 2) "Agora não" e Esc: fecha nesta visita e não volta até abrir o site de novo
  {
    const { page, ctx } = await boot(browser, lang, port, 'light', null, 'pt-BR');
    await setup(page); await page.evaluate(() => maybeShowAgeAckBanner());
    await page.click('#age-ack-later');
    check(`${lang}: "Agora não" fecha`, !(await has(page)));
    await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: não volta na mesma visita`, !(await has(page)));
    check(`${lang}: nada foi gravado`, await page.evaluate(() => !window.__rpc.some(r => r.name === 'ack_my_age')));
    await page.evaluate(() => { sessionStorage.removeItem('age-ack-later'); return maybeShowAgeAckBanner(); });
    check(`${lang}: numa visita nova, volta`, await has(page));
    await page.keyboard.press('Escape');
    check(`${lang}: Esc também fecha`, !(await has(page)));
    // já confirmou, professora, admin: não aparece
    await setup(page, { acked: true }); await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: quem já confirmou não vê`, !(await has(page)));
    await setup(page, { role: 'teacher' }); await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: professora não vê`, !(await has(page)));
    await setup(page, { role: 'user', email: 'brunemed1310@gmail.com' }); await page.evaluate(() => maybeShowAgeAckBanner());
    check(`${lang}: admin não vê`, !(await has(page)));
    await ctx.close();
  }
  // 3) falha ao gravar: avisa e deixa tentar de novo; inglês e tema escuro
  {
    const { page, errors, ctx } = await boot(browser, lang, port, 'dark', { width: 1280, height: 900 }, 'en');
    await page.waitForFunction(() => getUiLang() === 'en');
    await setup(page, { rpcFails: true });
    await page.evaluate(() => maybeShowAgeAckBanner());
    const t2 = await page.$eval('#age-ack-modal', e => e.innerText);
    check(`${lang}: textos em inglês, sem português`, /A quick check/.test(t2) && /I'm 18 or older, or I have my parent or guardian's permission/.test(t2) && /Not now/.test(t2) && /Confirm/.test(t2) && !/Tenho|anos|responsável|Agora|Confirmar/.test(t2), t2);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${lang}-en-escuro-computador.png` });
    await page.check('#age-ack-check'); await page.click('#age-ack-confirm');
    await page.waitForFunction(() => /couldn't save/.test(document.getElementById('age-ack-note').textContent));
    check(`${lang}: falha avisa e deixa tentar de novo`, await page.evaluate(() => document.getElementById('age-ack-check').checked && !document.getElementById('age-ack-confirm').disabled && !!document.getElementById('age-ack-modal')));
    check(`${lang}: sem erro de página (en)`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try { for (const lang of ['fr', 'zh']) await run(browser, port, lang); }
  finally { await browser.close(); server.close(); }
  console.log(`janela de idade: ${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
