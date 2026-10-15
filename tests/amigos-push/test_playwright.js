// Convite para ativar as notificações dos amigos (shared/friends.js, 102). Playwright, FR + ZH, claro/escuro, celular.
// Supabase stubado em memória; push stubado. Rodar: node tests/amigos-push/test_playwright.js  (SHOTS_DIR=... salva prints)
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
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

async function boot(browser, lang, port, opt = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: opt.viewport || { width: 1280, height: 900 }, colorScheme: opt.theme || 'light',
    ...(opt.ua ? { userAgent: opt.ua } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

// push: 'off' (suportado, não ativado), 'on' (já ativado neste aparelho), 'none' (sem suporte)
async function setup(page, push, perm = 'default'){
  await page.evaluate(({ push, perm }) => {
    try { Object.defineProperty(Notification, 'permission', { get: () => perm, configurable: true }); } catch (e) {}
    CURRENT_USER = { id: 'me' };
    PROFILE_CACHE = { user_id: 'me', username: 'eu', display_name: 'Eu Mesma' };
    window.__DB.profiles = [{ user_id: 'me', username: 'eu', display_name: 'Eu Mesma' }, { user_id: 'bia', username: 'bia', display_name: 'Bia Lima' }];
    window.__DB.friendships = [{ id: 1, requester_id: 'me', addressee_id: 'bia', status: 'accepted' }];
    window.__DB.friend_settings = [];
    window.__RPC.profile_cards = ({ p_ids }) => window.__DB.profiles.filter(p => (p_ids || []).includes(p.user_id));
    window.__RPC.friend_suggestions = () => [];
    window.__RPC.friends_duo = () => [];
    window.__RPC.my_duo_mission = () => null;
    pushSupported = () => push !== 'none';
    getLocalPushSubscription = async () => (push === 'on' ? { endpoint: 'x' } : null);
    window.__subscribed = 0; window.__setCat = null;
    subscribeToPush = async () => { window.__subscribed++; return window.__subResult || { ok: true }; };
    setCategoryChannel = async (...a) => { window.__setCat = a; };
    try { localStorage.removeItem('friendsPushInviteSnoozedAt'); localStorage.removeItem('friendsPushInviteFirstFriendShown'); } catch (e) {}
  }, { push, perm });
}

async function openFriends(page){
  await page.evaluate(() => switchTab('profile'));
  await page.click('#profile-content .profile-subnav [data-tab="friends"]');
  await page.waitForSelector('#friends-content .friends-title', { timeout: 8000 });
  await page.waitForTimeout(350);
}
const text = (page, sel) => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);

async function run(browser, port, lang){
  const L = lang;
  // 1. faixa: Ativar
  let { page, errors, ctx } = await boot(browser, lang, port);
  await setup(page, 'off');
  await openFriends(page);
  await page.waitForSelector('#friends-push-invite:not([hidden]) [data-push-invite="enable"]', { timeout: 5000 });
  const t1 = await text(page, '#friends-push-invite');
  check(`${L}: faixa com o convite`, /Ative as notificações neste aparelho/.test(t1) && /Agora não/.test(t1), t1);
  check(`${L}: faixa antes da missão em dupla`, await page.evaluate(() => { const a = document.getElementById('friends-push-invite'), b = document.getElementById('friends-duo'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); }));
  await page.click('#friends-push-invite [data-push-invite="enable"]');
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => ({ sub: window.__subscribed, cat: window.__setCat, hidden: document.getElementById('friends-push-invite').hidden }));
  check(`${L}: Ativar pede o push e liga Amigos por push`, st.sub === 1 && JSON.stringify(st.cat) === JSON.stringify(['amigos', 'push', true]) && st.hidden, st);
  // erro de permissão: some e adia
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} window.__subResult = { ok: false, reason: 'denied' }; return loadFriendsPushInvite(); });
  await page.click('#friends-push-invite [data-push-invite="enable"]');
  await page.waitForTimeout(250);
  check(`${L}: permissão negada: faixa some e fica adiada`, await page.evaluate(() => document.getElementById('friends-push-invite').hidden && !!localStorage.getItem('friendsPushInviteSnoozedAt')));
  check(`${L}: sem erros (Ativar)`, errors.length === 0, errors);
  await ctx.close();

  // 2. Agora não: some e não volta ao reabrir
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, 'off');
  await openFriends(page);
  await page.waitForSelector('#friends-push-invite:not([hidden]) [data-push-invite="later"]', { timeout: 5000 });
  await page.click('#friends-push-invite [data-push-invite="later"]');
  await page.waitForTimeout(150);
  check(`${L}: Agora não esconde`, await page.$eval('#friends-push-invite', e => e.hidden));
  await page.evaluate(() => renderFriendsView());
  await page.waitForTimeout(400);
  check(`${L}: Agora não vale por 14 dias (não volta ao reabrir)`, await page.$eval('#friends-push-invite', e => e.hidden));
  check(`${L}: Agora não não pede permissão`, await page.evaluate(() => window.__subscribed) === 0);
  await ctx.close();

  // 3. já ativado / sem suporte (computador): nada
  for (const push of ['on', 'none']){
    ({ page, errors, ctx } = await boot(browser, lang, port));
    await setup(page, push);
    await openFriends(page);
    await page.waitForTimeout(300);
    check(`${L}: push ${push}: sem faixa`, await page.$eval('#friends-push-invite', e => e.hidden));
    check(`${L}: push ${push}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }

  // 3b. notificações bloqueadas no navegador: o clique não resolveria, então não mostra
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, 'off', 'denied');
  await openFriends(page);
  await page.waitForTimeout(300);
  check(`${L}: bloqueado no navegador: sem faixa`, await page.evaluate(() => Notification.permission === 'denied' && document.getElementById('friends-push-invite').hidden));
  await ctx.close();

  // 4. iPhone sem a Tela de Início: explica como adicionar
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: IPHONE_UA, viewport: { width: 390, height: 844 } }));
  await setup(page, 'none');
  await openFriends(page);
  await page.waitForSelector('#friends-push-invite:not([hidden])', { timeout: 5000 });
  const t4 = await text(page, '#friends-push-invite');
  check(`${L}: iPhone: explica a Tela de Início, sem botão de ativar`, /Adicionar à Tela de Início/.test(t4) && /Entendi/.test(t4) && !(await page.$('#friends-push-invite [data-push-invite="enable"]')), t4);
  check(`${L}: sem erros (iPhone)`, errors.length === 0, errors);
  await ctx.close();

  // 5. primeiro amigo: janela uma vez, depois da comemoração
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, 'off');
  await page.evaluate(() => { badgeCelebrationShowing = true; FRIENDS_ACCEPTED_COUNT = 0; return loadFriendsAcceptedCount(); });
  await page.waitForTimeout(800);
  check(`${L}: 1º amigo: espera a comemoração terminar`, !(await page.$('#friends-push-modal')));
  await page.evaluate(() => { badgeCelebrationShowing = false; badgeCelebrationQueue.length = 0; document.querySelectorAll('.app-modal-overlay').forEach(e => e.remove()); });
  await page.waitForSelector('#friends-push-modal', { timeout: 3000 });
  check(`${L}: 1º amigo: janela "Você ganhou um amigo!"`, /Você ganhou um amigo!/.test(await text(page, '#friends-push-modal')));
  if (process.env.SHOTS_DIR) await page.screenshot({ path: path.join(SHOTS, `push-modal-${L}.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check(`${L}: Esc fecha (conta como Agora não)`, !(await page.$('#friends-push-modal')));
  await page.evaluate(() => { localStorage.removeItem('friendsPushInviteSnoozedAt'); return friendsMaybeOfferPushFirstFriend(); });
  await page.waitForTimeout(300);
  check(`${L}: 1º amigo: só uma vez`, !(await page.$('#friends-push-modal')));
  check(`${L}: sem erros (1º amigo)`, errors.length === 0, errors);
  await ctx.close();
}

async function visual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    const { page, errors, ctx } = await boot(browser, lang, port, { theme, viewport: vp });
    await setup(page, 'off');
    await openFriends(page);
    await page.waitForSelector('#friends-push-invite:not([hidden])', { timeout: 5000 });
    const tag = `${lang} ${theme} ${vp.width}`;
    check(`${tag}: sem rolagem lateral`, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
    const c = await page.$eval('.friends-push-card', el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.querySelector('strong')).color]);
    if (vp.width === 390) check(`${tag}: campos da missão em dupla sem buraco`, await page.$$eval('#friends-duo .friends-duo-field', fs => fs.every(f => f.getBoundingClientRect().height < 90)));
    check(`${tag}: texto legível`, c[0] !== c[1], c);
    if (vp.width === 390) check(`${tag}: botões >= 44px`, await page.$$eval('#friends-push-invite button', bs => bs.every(b => b.getBoundingClientRect().height >= 44)));
    if (SHOTS){ await page.$eval('#friends-push-invite', e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `push-${lang}-${theme}-${vp.width}.png`) }); }
    check(`${tag}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { await run(browser, port, 'fr'); await run(browser, port, 'zh'); await visual(browser, port); }
  catch (e) { failed++; console.log('  ERRO:', e.message); }
  await browser.close(); server.close();
  console.log(`Convite de notificações (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
