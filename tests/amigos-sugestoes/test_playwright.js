// Sugestões de amigos (095) e QR code do convite (shared/friends.js). Playwright, FR + ZH, claro/escuro e celular.
// Supabase stubado em memória. Rodar: node tests/amigos-sugestoes/test_playwright.js  (SHOTS_DIR=... salva prints)
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

const SUGGESTIONS = [
  { user_id: 'ana', username: 'ana', display_name: 'Ana Souza', avatar_url: null, reason: 'invite', mutual_count: 0, language_app_key: null },
  { user_id: 'davi', username: 'davi', display_name: 'Davi Lima', avatar_url: null, reason: 'classmate', mutual_count: 0, language_app_key: null },
  { user_id: 'caio', username: 'caio', display_name: 'Caio Reis', avatar_url: null, reason: 'mutual', mutual_count: 2, language_app_key: null },
  { user_id: 'gabi', username: 'gabi', display_name: 'Gabi Prado', avatar_url: null, reason: 'partner', mutual_count: 0, language_app_key: 'frances' },
  { user_id: 'ivo', username: 'ivo', display_name: 'Ivo Nunes', avatar_url: null, reason: 'ranking', mutual_count: 0, language_app_key: null },
  { user_id: 'olga', username: 'olga', display_name: 'Olga Dias', avatar_url: null, reason: 'invited_by', mutual_count: 0, language_app_key: null },
];

async function boot(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1280, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function setup(page, list){
  await page.evaluate((list) => {
    CURRENT_USER = { id: 'me' };
    PROFILE_CACHE = { user_id: 'me', username: 'eu', display_name: 'Eu Mesma' };
    window.__DB.profiles = [{ user_id: 'me', username: 'eu', display_name: 'Eu Mesma' }, { user_id: 'bia', username: 'bia', display_name: 'Bia Lima' }];
    window.__DB.friendships = list.withFriend ? [{ id: 1, requester_id: 'me', addressee_id: 'bia', status: 'accepted' }] : [];
    window.__DB.friend_settings = [];
    window.__RPC.friend_suggestions = () => list.items;
    window.__RPC.dismiss_friend_suggestion = () => ({ ok: true });
    window.__RPC.send_friend_request = () => ({ ok: true, status: 'sent' });
    window.__RPC.record_friend_invite = () => ({ ok: true });
    window.__RPC.profile_cards = ({ p_ids }) => window.__DB.profiles.filter(p => (p_ids || []).includes(p.user_id));
    if (list.noRpc) delete window.__RPC.friend_suggestions;
  }, list);
}

async function openFriends(page){
  await page.evaluate(() => switchTab('profile'));
  await page.click('#profile-content .profile-subnav [data-tab="friends"]');
  await page.waitForSelector('#friends-content .friends-title', { timeout: 8000 });
  await page.waitForTimeout(250);
}

async function run(browser, port, lang){
  const L = lang;
  const { page, errors, ctx } = await boot(browser, lang, port);
  await setup(page, { items: SUGGESTIONS, withFriend: true });
  await openFriends(page);
  await page.waitForSelector('#friends-suggest:not([hidden]) .friend-suggest-card', { timeout: 5000 });
  const cards = await page.$$eval('#friends-suggest .friend-suggest-card', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  check(`${L}: 6 sugestões`, cards.length === 6, cards);
  const all = cards.join(' | ');
  check(`${L}: motivo convite`, /Ana Souza.*Entrou pelo seu convite/.test(cards[0]), cards[0]);
  check(`${L}: motivo me convidou`, /Te convidou para o site/.test(all));
  check(`${L}: motivo mesma professora`, /Estuda com a mesma professora/.test(all));
  check(`${L}: motivo amigos em comum (plural)`, /2 amigos em comum/.test(all));
  check(`${L}: motivo parceiro com idioma`, /Também estuda francês/.test(all));
  check(`${L}: motivo ranking`, /Perto de você no ranking da semana/.test(all));
  check(`${L}: X fica como texto (fora da troca de ícones)`, await page.$$eval('.friend-suggest-x .emo', e => e.length) === 0);
  // X dispensa
  await page.click('#friends-suggest [data-suggest-dismiss="davi"]');
  await page.waitForTimeout(150);
  check(`${L}: X tira o cartão`, await page.$('#friends-suggest [data-suggest-row="davi"]') === null);
  const dis = await page.evaluate(() => window.__rpc.filter(r => r.name === 'dismiss_friend_suggestion').pop());
  check(`${L}: X chama dismiss_friend_suggestion`, dis && dis.args.p_user === 'davi', dis);
  // Adicionar
  await page.click('#friends-suggest [data-friend-action="add"][data-user-id="caio"]');
  await page.waitForTimeout(400);
  const add = await page.evaluate(() => window.__rpc.filter(r => r.name === 'send_friend_request').pop());
  check(`${L}: Adicionar manda pedido`, add && add.args.p_addressee === 'caio', add);
  // QR code
  await page.click('[data-friends-qr]');
  await page.waitForSelector('#friends-qr-modal .friends-qr-box svg', { timeout: 8000 });
  const qr = await page.evaluate(() => ({ link: document.querySelector('.friends-qr-link').textContent, rects: document.querySelectorAll('.friends-qr-box svg path, .friends-qr-box svg rect').length }));
  check(`${L}: QR com o link de convite`, /\?amigo=eu$/.test(qr.link) && qr.rects > 0, qr);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `qr-${L}.png`) });
  await page.keyboard.press('Escape');
  check(`${L}: Esc fecha o QR`, await page.$('#friends-qr-modal') === null);
  // convite registrado
  await page.evaluate(() => { localStorage.setItem('pendingFriendInvite', 'ana'); friendsConsumePendingInvite(); });
  await page.waitForTimeout(100);
  const inv = await page.evaluate(() => window.__rpc.filter(r => r.name === 'record_friend_invite').pop());
  check(`${L}: link de convite grava de quem veio`, inv && inv.args.p_username === 'ana', inv);
  // preferência
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="friends-prefs-body"></div>'); return loadFriendsPrefs(); });
  const pref = await page.$('#friends-prefs-body [data-friends-pref="suggest_me"]');
  check(`${L}: opção "aparecer nas sugestões" existe e vem ligada`, pref && await pref.isChecked());
  await pref.uncheck();
  await page.waitForTimeout(200);
  const up = await page.evaluate(() => window.__upserts.filter(u => u.table === 'friend_settings').pop());
  check(`${L}: desligar grava suggest_me=false`, up && up.row.suggest_me === false, up);
  check(`${L}: sem erros`, errors.length === 0, errors);
  await ctx.close();

  // sem sugestões / sem a função no banco: seção some
  for (const variant of [{ items: [], withFriend: false, tag: 'vazia' }, { items: [], withFriend: true, noRpc: true, tag: 'sem 095' }]){
    const b = await boot(browser, lang, port);
    await setup(b.page, variant);
    await openFriends(b.page);
    await b.page.waitForTimeout(300);
    check(`${L}: ${variant.tag}: seção escondida`, await b.page.$eval('#friends-suggest', e => e.hidden));
    check(`${L}: ${variant.tag}: sem erros`, b.errors.length === 0, b.errors);
    await b.ctx.close();
  }
}

async function visual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    const { page, errors, ctx } = await boot(browser, lang, port, theme, vp);
    await setup(page, { items: SUGGESTIONS, withFriend: false });
    await openFriends(page);
    await page.waitForSelector('#friends-suggest .friend-suggest-card', { timeout: 5000 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${lang} ${theme} ${vp.width}: sem rolagem lateral da página`, over <= 0, over);
    if (SHOTS){ await page.$eval('#friends-suggest', e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `sugestoes-${lang}-${theme}-${vp.width}.png`) }); }
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
  await browser.close(); server.close();
  console.log(`Sugestões de amigos (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
