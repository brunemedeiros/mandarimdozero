// (servidor e stub copiados do teste de Amigos em dupla)
// Amigos em dupla (102): sequência com amigo, cutucar e missão em dupla (shared/friends.js). Playwright, FR + ZH,
// claro/escuro e celular. Supabase stubado em memória. Rodar: node tests/amigos-dupla/test_playwright.js  (SHOTS_DIR=... salva prints)
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
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  if (ui) await page.addInitScript((ui) => { try { localStorage.setItem('ui-language', ui); } catch (e) {} }, ui);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

// Conta logada com @ aleatório. taken = @ já em uso; pending = precisa escolher
async function setup(page, { pending = true, name = 'Raíssa Lima', taken = ['raissa.lima'] } = {}){
  await page.evaluate(({ pending, name, taken }) => {
    CURRENT_USER = { id: 'me', email: 'raissa.lima@example.invalid', user_metadata: {} };
    PROFILE_CACHE = { user_id: 'me', username: 'u20db052f77', display_name: name || null };
    window.__claims = [];
    window.__RPC.my_username_choice_pending = () => pending;
    window.__RPC.check_username = ({ p_username }) => taken.includes(p_username) ? 'taken' : (p_username === 'admin' ? 'reserved' : 'ok');
    window.__RPC.claim_my_username = (a) => { window.__claims.push(a); return taken.includes(a.p_username) ? { error: 'taken' } : { ok: true, username: a.p_username, display_name: a.p_display_name.trim() }; };
  }, { pending, name, taken });
}

const val = (page, sel) => page.$eval(sel, e => e.value);
const txt = (page, sel) => page.$eval(sel, e => e.textContent.trim());

async function run(browser, port, lang){
  const L = lang;
  // 1. sugestão a partir do nome: raissa.lima está em uso -> raissalima
  let { page, errors, ctx } = await boot(browser, lang, port);
  await setup(page);
  await page.evaluate(() => maybeAskUsernameChoice());
  await page.waitForSelector('#username-choice-modal');
  await page.waitForFunction(() => document.getElementById('uchoice-user').value !== '');
  check(`${L}: nome vem preenchido`, await val(page, '#uchoice-name') === 'Raíssa Lima');
  check(`${L}: @ sugerido pula o que está em uso (raissa.lima) -> raissalima`, await val(page, '#uchoice-user') === 'raissalima', await val(page, '#uchoice-user'));
  await page.waitForFunction(() => /livre/.test(document.getElementById('uchoice-status').textContent));
  check(`${L}: aviso de que só pode escolher agora`, /só pode ser escolhido agora/.test(await txt(page, '.uchoice-warn')));
  check(`${L}: janela sem botão de fechar`, await page.$('#username-choice-modal .app-modal-close') === null);
  // digitação é limpa: maiúscula, acento, espaço, @
  await page.fill('#uchoice-user', '');
  await page.type('#uchoice-user', '@Raí Ssa');
  check(`${L}: campo limpa o que é digitado`, await val(page, '#uchoice-user') === 'raissa', await val(page, '#uchoice-user'));
  await page.fill('#uchoice-user', 'ra');
  await page.dispatchEvent('#uchoice-user', 'input');
  check(`${L}: curto demais avisa na hora`, /3 a 24/.test(await txt(page, '#uchoice-status')));
  await page.fill('#uchoice-user', 'raissa.lima');
  await page.dispatchEvent('#uchoice-user', 'input');
  await page.waitForFunction(() => /em uso/.test(document.getElementById('uchoice-status').textContent));
  check(`${L}: @ em uso avisa`, true);
  // nome vazio
  await page.fill('#uchoice-name', '');
  await page.fill('#uchoice-user', 'raissa.l');
  await page.dispatchEvent('#uchoice-user', 'input');
  await page.click('#uchoice-save');
  check(`${L}: nome obrigatório`, /nome/i.test(await txt(page, '.uchoice-error')));
  // salva
  await page.fill('#uchoice-name', 'Raissa Lima');
  await page.click('#uchoice-save');
  await page.waitForSelector('#username-choice-modal', { state: 'detached' });
  const claim = await page.evaluate(() => window.__claims.slice(-1)[0]);
  check(`${L}: salva @ e nome`, claim && claim.p_username === 'raissa.l' && claim.p_display_name === 'Raissa Lima', claim);
  check(`${L}: cache atualizado`, await page.evaluate(() => PROFILE_CACHE.username === 'raissa.l' && PROFILE_CACHE.display_name === 'Raissa Lima'));
  check(`${L}: sem erros`, errors.length === 0, errors);
  await ctx.close();

  // 2. já escolheu (ou conta antiga): nada aparece
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { pending: false });
  await page.evaluate(() => maybeAskUsernameChoice());
  await page.waitForTimeout(300);
  check(`${L}: quem já escolheu não vê a janela`, await page.$('#username-choice-modal') === null);
  await ctx.close();

  // 3. sem a 111 no banco (RPC ausente): nada aparece e nada quebra
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page);
  await page.evaluate(() => { delete window.__RPC.my_username_choice_pending; });
  await page.evaluate(() => maybeAskUsernameChoice());
  await page.waitForTimeout(300);
  check(`${L}: sem a 111, nada aparece`, await page.$('#username-choice-modal') === null);
  check(`${L}: sem a 111, sem erros`, errors.length === 0, errors);
  await ctx.close();

  // 4. espera outra janela fechar antes de aparecer
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page);
  await page.evaluate(() => { const o = document.createElement('div'); o.className = 'app-modal-overlay'; o.id = 'outra'; document.body.appendChild(o); maybeAskUsernameChoice(); });
  await page.waitForTimeout(700);
  check(`${L}: espera a outra janela`, await page.$('#username-choice-modal') === null);
  await page.evaluate(() => document.getElementById('outra').remove());
  await page.waitForSelector('#username-choice-modal', { timeout: 3000 });
  check(`${L}: aparece depois que a outra fecha`, true);
  await ctx.close();

  // 5. sem nome: começa vazio e sugere quando a pessoa digita
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { name: '' });
  await page.evaluate(() => maybeAskUsernameChoice());
  await page.waitForSelector('#username-choice-modal');
  check(`${L}: sem nome, @ começa vazio`, await val(page, '#uchoice-user') === '');
  await page.type('#uchoice-name', 'José da Silva');
  await page.waitForFunction(() => document.getElementById('uchoice-user').value === 'jose.da.silva', null, { timeout: 4000 }).catch(() => {});
  check(`${L}: sugere ao digitar o nome`, await val(page, '#uchoice-user') === 'jose.da.silva', await val(page, '#uchoice-user'));
  await ctx.close();
}

async function english(browser, port){
  for (const lang of ['fr', 'zh']){
    const { page, errors, ctx } = await boot(browser, lang, port, 'light', null, 'en');
    await setup(page);
    await page.evaluate(() => maybeAskUsernameChoice());
    await page.waitForSelector('#username-choice-modal');
    await page.waitForFunction(() => document.getElementById('uchoice-status').textContent.trim() !== '' && !/Checking/.test(document.getElementById('uchoice-status').textContent));
    const all = await page.$eval('#username-choice-modal', e => e.innerText + ' ' + [...e.querySelectorAll('input')].map(i => i.placeholder).join(' '));
    const pt = all.match(/\b(Escolha|Seu|nome|Salvar|livre|Atenção|agora|letras|minúsculas)\b/gi);
    check(`${lang} en: sem português na janela`, !pt, pt);
    check(`${lang} en: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
}

async function visual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    const { page, errors, ctx } = await boot(browser, lang, port, theme, vp, null, { touch: vp.width < 600 });
    await setup(page);
    await page.evaluate(() => maybeAskUsernameChoice());
    await page.waitForSelector('#username-choice-modal');
    await page.waitForFunction(() => /livre/.test(document.getElementById('uchoice-status').textContent));
    const tag = `${lang} ${theme} ${vp.width}`;
    const c = await page.$eval('.uchoice-card', el => { const s = getComputedStyle(el); return [s.backgroundColor, getComputedStyle(el.querySelector('.uchoice-title')).color, getComputedStyle(el.querySelector('.uchoice-warn')).backgroundColor, getComputedStyle(el.querySelector('.uchoice-warn')).color]; });
    check(`${tag}: título legível`, c[0] !== c[1], c);
    check(`${tag}: aviso legível`, c[2] !== c[3], c);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${tag}: sem rolagem lateral`, over <= 0, over);
    if (vp.width < 600){
      const small = await page.$$eval('#username-choice-modal button, #username-choice-modal input', els => els.filter(e => e.getBoundingClientRect().height < 44).length);
      check(`${tag}: alvos de toque >= 44px`, small === 0, small);
    }
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `uchoice-${lang}-${theme}-${vp.width}.png`) });
    check(`${tag}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { await run(browser, port, 'fr'); await run(browser, port, 'zh'); await english(browser, port); await visual(browser, port); }
  catch (e) { failed++; console.log('  ERRO:', e.message); }
  await browser.close(); server.close();
  console.log(`Escolher o @ (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
