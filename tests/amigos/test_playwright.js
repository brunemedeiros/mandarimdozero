// Amigos + Ranking de Amigos (shared/friends.js, shared/leaderboard.js).
// Playwright (Chromium real), FR + ZH, claro/escuro e celular. Supabase stubado
// em memória (CDN bloqueado no sandbox); "logado" = CURRENT_USER setado após o
// boot de convidado. As RPCs são simuladas e gravam as chamadas em __rpc.
// Rodar: node tests/amigos/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { friendships: [], profiles: [], weekly_xp: [], notifications: [] };
  window.__rpc = [];
  window.__RPC = {};
  function builder(table){
    const st = { f: [], ne: [], inn: [], or: null, head: false, count: false };
    const matchOr = (row) => {
      if (!st.or) return true;
      // formato: and(requester_id.eq.A,addressee_id.eq.B),and(requester_id.eq.B,addressee_id.eq.A)
      return st.or.split('),and(').some(chunk => {
        const parts = chunk.replace(/^and\\(/, '').replace(/\\)$/, '').split(',');
        return parts.every(p => { const [k, , v] = p.split('.'); return row[k] === v; });
      });
    };
    const rows = () => (window.__DB[table] || []).filter(r =>
      st.f.every(([k, v]) => r[k] === v) && st.ne.every(([k, v]) => r[k] !== v) &&
      st.inn.every(([k, vs]) => vs.includes(r[k])) && matchOr(r));
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => { const r = rows(); return Promise.resolve(st.head ? { count: r.length, data: null, error: null } : { data: r, error: null }).then(ok, ko); };
      if (prop === 'select') return (c, opts) => { if (opts && opts.head) st.head = true; return b; };
      if (prop === 'eq') return (k, v) => { st.f.push([k, v]); return b; };
      if (prop === 'neq') return (k, v) => { st.ne.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.inn.push([k, vs]); return b; };
      if (prop === 'or') return (s) => { st.or = s; return b; };
      if (prop === 'upsert') return (row) => {
        (window.__upserts = window.__upserts || []).push({ table, row });
        const arr = (window.__DB[table] = window.__DB[table] || []);
        const i = arr.findIndex(r => r.user_id === row.user_id);
        if (i >= 0) Object.assign(arr[i], row); else arr.push({ ...row });
        return Promise.resolve({ data: null, error: null });
      };
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: rows()[0] || null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => { window.__rpc.push({ name, args }); const h = window.__RPC[name]; return h ? { data: h(args), error: null } : { data: null, error: null }; },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
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

// Mundo: eu (me), amigos Bia e Caio (amigos), Dani e Edu (pedidos recebidos),
// Fabi (pedido enviado por mim), Gabi/João (desconhecidos). Gabi é privada.
async function setup(page, opts){
  await page.evaluate((o) => {
    CURRENT_USER = { id: 'me' };
    const prof = (id, username, name) => ({ user_id: id, username, display_name: name, avatar_url: null, featured_badge_id: null, public_profile: id !== 'gabi' });
    const people = [['me', 'u1me', 'Eu Mesma'], ['bia', 'ubia', 'Bia Lima'], ['caio', 'ucaio', 'Caio Reis'], ['dani', 'udani', 'Dani Alves'], ['edu', 'uedu', 'Edu Costa'], ['fabi', 'ufabi', 'Fabi Nunes'], ['gabi', 'ugabi', 'Gabi Prado'], ['joao', 'ujoao', 'João Pereira']];
    window.__DB.profiles = people.map(([i, u, n]) => prof(i, u, n));
    window.__DB.friendships = o.noFriends ? [
      { id: 1, requester_id: 'dani', addressee_id: 'me', status: 'pending', requested_at: '2026-10-06T10:00:00Z', responded_at: null },
    ] : [
      { id: 1, requester_id: 'dani', addressee_id: 'me', status: 'pending', requested_at: '2026-10-06T10:00:00Z', responded_at: null },
      { id: 2, requester_id: 'edu', addressee_id: 'me', status: 'pending', requested_at: '2026-10-06T11:00:00Z', responded_at: null },
      { id: 3, requester_id: 'me', addressee_id: 'fabi', status: 'pending', requested_at: '2026-10-05T11:00:00Z', responded_at: null },
      { id: 4, requester_id: 'me', addressee_id: 'bia', status: 'accepted', requested_at: '2026-10-01T11:00:00Z', responded_at: '2026-10-01T12:00:00Z' },
      { id: 5, requester_id: 'caio', addressee_id: 'me', status: 'accepted', requested_at: '2026-10-01T11:00:00Z', responded_at: '2026-10-01T12:00:00Z' },
    ];
    const wk = leaderboardCurrentWeekStart();
    window.__DB.weekly_xp = [['me', 100], ['bia', 180], ['caio', 0], ['joao', 400], ['gabi', 90]].filter(([, a]) => a > 0)
      .map(([u, a]) => ({ user_id: u, week_start: wk, language_app_key: APP_KEY, amount: a }));
    window.__RPC.search_profiles_for_friends = ({ p_query }) => {
      const q = p_query.toLowerCase().replace(/^@+/, '');
      return window.__DB.profiles.filter(p => p.user_id !== 'me' && ((p.display_name || '').toLowerCase().includes(q) || p.username.includes(q)))
        .map(p => {
          const f = window.__DB.friendships.find(x => (x.requester_id === 'me' && x.addressee_id === p.user_id) || (x.requester_id === p.user_id && x.addressee_id === 'me'));
          const relation = !f ? 'none' : f.status === 'accepted' ? 'friends' : (f.requester_id === 'me' ? 'sent' : 'received');
          return { user_id: p.user_id, username: p.username, display_name: p.display_name, avatar_url: null, relation };
        });
    };
    window.__RPC.send_friend_request = ({ p_addressee }) => {
      window.__DB.friendships.push({ id: Date.now(), requester_id: 'me', addressee_id: p_addressee, status: 'pending', requested_at: new Date().toISOString(), responded_at: null });
      return { ok: true, status: 'sent' };
    };
    window.__RPC.respond_friend_request = ({ p_requester, p_accept }) => {
      const f = window.__DB.friendships.find(x => x.requester_id === p_requester && x.addressee_id === 'me' && x.status === 'pending');
      if (!f) return { error: 'no_pending_request' };
      f.status = p_accept ? 'accepted' : 'declined'; f.responded_at = new Date().toISOString();
      return { ok: true, status: f.status };
    };
    window.__RPC.cancel_friend_request = ({ p_addressee }) => {
      const i = window.__DB.friendships.findIndex(x => x.requester_id === 'me' && x.addressee_id === p_addressee && x.status === 'pending');
      if (i < 0) return { error: 'no_pending_request' }; window.__DB.friendships.splice(i, 1); return { ok: true };
    };
    window.__RPC.remove_friend = ({ p_friend }) => {
      const i = window.__DB.friendships.findIndex(x => x.status === 'accepted' && [x.requester_id, x.addressee_id].includes(p_friend));
      if (i < 0) return { error: 'not_friends' }; window.__DB.friendships.splice(i, 1); return { ok: true };
    };
    window.__RPC.friends_leaderboard = ({ p_scope, p_week }) => {
      const ids = new Set(['me']);
      window.__DB.friendships.filter(f => f.status === 'accepted').forEach(f => { ids.add(f.requester_id); ids.add(f.addressee_id); });
      return [...ids].map(id => {
        const amt = window.__DB.weekly_xp.filter(w => w.user_id === id && w.week_start === p_week && (p_scope === 'all' || w.language_app_key === p_scope)).reduce((a, w) => a + w.amount, 0);
        const p = window.__DB.profiles.find(x => x.user_id === id);
        return { user_id: id, amount: amt, username: p.username, display_name: p.display_name, avatar_url: null, featured_badge_id: null, is_me: id === 'me' };
      }).sort((a, b) => b.amount - a.amount);
    };
    window.__RPC.friends_activity = () => ([
      { user_id: 'bia', username: 'ubia', display_name: 'Bia Lima', avatar_url: null, language_app_key: APP_KEY, badge_id: BADGES[0].id, earned_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { user_id: 'caio', username: 'ucaio', display_name: 'Caio Reis', avatar_url: null, language_app_key: APP_KEY, badge_id: 'badge-que-nao-existe-aqui', earned_at: new Date(Date.now() - 3600000).toISOString() },
    ]);
    window.__DB.friend_settings = [];
    PROFILE_CACHE = { user_id: 'me', username: 'u1me', display_name: 'Eu Mesma' };
    window.__rpc.length = 0;
  }, opts || {});
}

async function run(browser, lang, port){
  const { page, errors, ctx } = await bootPage(browser, lang, port);
  const L = lang;
  await setup(page);

  // ---- contador +N e sub-aba ----
  await page.evaluate(() => refreshFriendRequestCount());
  await page.waitForFunction(() => document.querySelector('.tab-btn[data-tab="profile"] .friends-badge'));
  check(`${L}: selo +2 no item Perfil`, (await page.locator('.tab-btn[data-tab="profile"] .friends-badge').first().textContent()) === '+2');
  await page.evaluate(() => switchTab('profile'));
  await page.waitForSelector('.profile-subnav [data-tab="friends"]');
  check(`${L}: sub-aba Amigos no Perfil`, (await page.locator('#profile-content .profile-subnav [data-tab="friends"]').count()) === 1);
  await page.waitForFunction(() => document.querySelector('#profile-content .profile-subnav [data-tab="friends"] .friends-badge'));
  check(`${L}: selo +2 na sub-aba Amigos`, (await page.locator('#profile-content .profile-subnav [data-tab="friends"] .friends-badge').textContent()) === '+2');
  for (const v of ['goals', 'progress']){
    check(`${L}: sub-aba Amigos também em ${v}`, (await page.locator(`#view-${v} .profile-subnav [data-tab="friends"]`).count()) === 1);
  }

  // ---- tela Amigos ----
  await page.click('#profile-content .profile-subnav [data-tab="friends"]');
  await page.waitForSelector('#friends-list');
  check(`${L}: hash #/friends`, (await page.evaluate(() => location.hash)) === '#/friends');
  check(`${L}: 2 pedidos recebidos`, (await page.locator('#friends-incoming .friends-row').count()) === 2);
  check(`${L}: 2 amigos listados`, (await page.locator('#friends-list .friends-row').count()) === 2);
  check(`${L}: 1 pedido enviado`, (await page.locator('#friends-outgoing .friends-row').count()) === 1);
  check(`${L}: view Amigos ativa`, await page.evaluate(() => document.getElementById('view-friends').classList.contains('active')));

  // render repetido NÃO acumula listeners: um clique em 'Desfazer' = 1 confirm e 1 RPC
  await page.evaluate(() => renderFriendsView()); await page.waitForSelector('#friends-list');
  await page.evaluate(() => renderFriendsView()); await page.waitForSelector('#friends-list');
  await page.evaluate(() => { window.__confirms = 0; window.confirm = () => { window.__confirms++; return false; }; });
  await page.click('#friends-list [data-friend-row="caio"] [data-friend-action="remove"]');
  await page.waitForTimeout(150);
  check(`${L}: 3 renders seguidos -> 1 confirm só`, (await page.evaluate(() => window.__confirms)) === 1);
  await page.evaluate(() => { window.confirm = () => true; });
  // aceitar Dani
  await page.click('#friends-incoming [data-friend-row="dani"] [data-friend-action="accept"]');
  await page.waitForFunction(() => document.querySelectorAll('#friends-list .friends-row').length === 3);
  check(`${L}: aceitar chamou respond_friend_request(accept)`, await page.evaluate(() => __rpc.some(r => r.name === 'respond_friend_request' && r.args.p_requester === 'dani' && r.args.p_accept === true)));
  await page.waitForFunction(() => document.querySelector('.tab-btn[data-tab="profile"] .friends-badge')?.textContent === '+1');
  check(`${L}: contador cai para +1`, true);
  // recusar Edu
  await page.click('#friends-incoming [data-friend-row="edu"] [data-friend-action="decline"]');
  await page.waitForFunction(() => !document.getElementById('friends-incoming'));
  check(`${L}: sem pedidos, seção some`, true);
  await page.waitForFunction(() => !document.querySelector('.tab-btn[data-tab="profile"] .friends-badge'));
  check(`${L}: selo some quando zera`, true);

  // ---- busca ----
  await page.evaluate(() => { __rpc.length = 0; });
  await page.fill('#friends-search-input', 'jo');
  await page.waitForTimeout(600);
  check(`${L}: 2 letras não chamam a busca`, await page.evaluate(() => !__rpc.some(r => r.name === 'search_profiles_for_friends')));
  await page.fill('#friends-search-input', 'joão');
  await page.waitForSelector('#friends-search-results [data-friend-row="joao"]');
  check(`${L}: busca por nome acha João`, true);
  check(`${L}: busca debounced (1 chamada)`, (await page.evaluate(() => __rpc.filter(r => r.name === 'search_profiles_for_friends').length)) === 1);
  await page.click('#friends-search-results [data-friend-action="add"]');
  await page.waitForFunction(() => __rpc.some(r => r.name === 'send_friend_request' && r.args.p_addressee === 'joao'));
  check(`${L}: Adicionar chama send_friend_request`, true);
  await page.waitForFunction(() => document.querySelectorAll('#friends-outgoing .friends-row').length === 2);
  check(`${L}: pedido aparece em enviados`, true);
  await page.waitForSelector('#friends-search-results [data-friend-row="joao"] .friends-chip');
  check(`${L}: resultado vira 'Pedido enviado'`, (await page.locator('#friends-search-results [data-friend-row="joao"] .friends-chip').textContent()).includes('Pedido enviado'));
  // busca por @username
  await page.fill('#friends-search-input', '@ugabi');
  await page.waitForSelector('#friends-search-results [data-friend-row="gabi"]');
  check(`${L}: perfil privado também aparece na busca`, true);
  // cancelar enviado
  await page.click('#friends-outgoing [data-friend-row="fabi"] [data-friend-action="cancel"]');
  await page.waitForFunction(() => document.querySelectorAll('#friends-outgoing .friends-row').length === 1);
  check(`${L}: cancelar pedido enviado`, true);
  // desfazer amizade
  await page.click('#friends-list [data-friend-row="caio"] [data-friend-action="remove"]');
  await page.waitForFunction(() => document.querySelectorAll('#friends-list .friends-row').length === 2);
  check(`${L}: desfazer amizade chamou remove_friend`, await page.evaluate(() => __rpc.some(r => r.name === 'remove_friend' && r.args.p_friend === 'caio')));

  // ---- Ranking: unificado, abre sempre em Geral ----
  await page.evaluate(() => { LEADERBOARD_MODE = 'friends'; switchTab('leaderboard'); });
  await page.waitForSelector('#leaderboard-content .leaderboard-mode-tabs');
  const activeMode = await page.locator('#leaderboard-content .leaderboard-mode-tabs .active').getAttribute('data-mode');
  check(`${L}: Ranking abre em Geral mesmo se a sessão estava em Amigos`, activeMode === 'all');
  check(`${L}: Geral lista quem tem XP (João 400 em 1º, sem amigos obrigatórios)`, (await page.locator('#leaderboard-content .leaderboard-row').first().getAttribute('data-user-id')) === 'joao');
  await page.click('#leaderboard-content [data-mode="friends"]');
  await page.waitForFunction(() => document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active')?.dataset.mode === 'friends');
  const ids = await page.locator('#leaderboard-content .leaderboard-row').evaluateAll(els => els.map(e => e.dataset.userId));
  check(`${L}: Amigos = eu + amigos, por XP (Bia 180, Eu 100, Dani 0)`, ids[0] === 'bia' && ids[1] === 'me' && !ids.includes('joao') && !ids.includes('gabi'), ids);
  check(`${L}: ranking de amigos chamou RPC com a semana`, await page.evaluate(() => __rpc.some(r => r.name === 'friends_leaderboard' && r.args.p_scope === 'all' && /^\d{4}-\d{2}-\d{2}$/.test(r.args.p_week))));
  // por idioma continua funcionando dentro de Amigos
  await page.click(`#leaderboard-content [data-scope="${await page.evaluate(() => APP_KEY)}"]`);
  await page.waitForSelector('#leaderboard-content .leaderboard-row');
  check(`${L}: Amigos + idioma mantém o modo`, (await page.locator('#leaderboard-content .leaderboard-mode-tabs .active').getAttribute('data-mode')) === 'friends');
  await page.evaluate(() => { LEADERBOARD_SCOPE = 'all'; });
  // voltar ao Geral e reabrir: sempre Geral? (estado atual = friends durante a sessão; abrir pelo menu reseta?)
  // Card da lateral
  await page.evaluate(() => { SIDE_RANKING_MODE = 'all'; return renderSideRankingCard(); });
  await page.waitForSelector('#side-ranking-body .side-ranking-tab');
  check(`${L}: card lateral começa em Geral`, (await page.locator('#side-ranking-body .side-ranking-tab.active').getAttribute('data-side-mode')) === 'all');
  await page.click('#side-ranking-body [data-side-mode="friends"]');
  await page.waitForFunction(() => document.querySelector('#side-ranking-body .side-ranking-tab.active')?.dataset.sideMode === 'friends');
  const sideNames = await page.locator('#side-ranking-body .side-ranking-name').allTextContents();
  check(`${L}: card lateral Amigos mostra amigos`, sideNames.some(n => n.includes('Bia')) && !sideNames.some(n => n.includes('João')), sideNames);

  // ---- sem amigos: convite ----
  await setup(page, { noFriends: true });
  await page.evaluate(() => { LEADERBOARD_PENDING_MODE = 'friends'; switchTab('leaderboard'); });
  await page.waitForSelector('#leaderboard-add-friends');
  check(`${L}: sem amigos mostra convite`, true);
  await page.click('#leaderboard-add-friends');
  await page.waitForSelector('#friends-search-input');
  check(`${L}: convite leva à tela Amigos`, (await page.evaluate(() => location.hash)) === '#/friends');
  await page.evaluate(() => { SIDE_RANKING_MODE = 'friends'; return renderSideRankingCard(); });
  await page.waitForFunction(() => /Adicionar amigo/.test(document.querySelector('#side-ranking-body .side-card-link')?.textContent || ''));
  check(`${L}: card lateral sem amigos tem 'Adicionar amigo'`, true);

  // ---- botão no perfil público ----
  const relCases = [['bia', 'friends', '✓ Amigos'], ['fabi', 'sent', 'Pedido enviado'], ['joao', 'none', 'Adicionar']];
  await setup(page);
  for (const [uid, , text] of relCases){
    const html = await page.evaluate(async (u) => {
      const slot = document.createElement('div'); slot.innerHTML = '<div id="public-profile-friend-slot"></div>';
      document.body.appendChild(slot);
      await renderFriendProfileAction(slot, { user_id: u });
      const t = slot.textContent; slot.remove(); return t;
    }, uid);
    check(`${L}: perfil público de ${uid}: ${text}`, html.includes(text), html);
  }
  const selfHtml = await page.evaluate(async () => {
    const slot = document.createElement('div'); slot.innerHTML = '<div id="public-profile-friend-slot"></div>'; document.body.appendChild(slot);
    await renderFriendProfileAction(slot, { user_id: 'me' }); const t = slot.textContent; slot.remove(); return t;
  });
  check(`${L}: perfil público da própria pessoa sem botão`, selfHtml.trim() === '');

  // ---- convidado ----
  await page.evaluate(() => { CURRENT_USER = false; FRIENDS_STATE.pendingCount = 0; });
  await page.evaluate(() => switchTab('friends'));
  await page.waitForSelector('#friends-content .profile-empty-note');
  check(`${L}: convidado vê aviso de login`, /Entre na sua conta/.test(await page.locator('#friends-content').textContent()));
  await page.evaluate(() => { LEADERBOARD_PENDING_MODE = 'friends'; switchTab('leaderboard'); });
  await page.waitForSelector('#leaderboard-content .leaderboard-list');
  check(`${L}: convidado não tem aba Amigos no ranking`, (await page.locator('#leaderboard-content .leaderboard-mode-tabs').count()) === 0);

  check(`${L}: sem erro de página`, errors.length === 0, errors);
  await ctx.close();
}

// Novidades da 074: ranking dos amigos no topo, atividade, convite, preferências.
async function runNew(browser, lang, port){
  const L = lang;
  const { page, errors, ctx } = await bootPage(browser, lang, port);
  await setup(page);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await page.evaluate(() => switchTab('friends'));
  await page.waitForSelector('#friends-mini-rank-rows .friends-rank-row');
  const rankIds = await page.locator('#friends-mini-rank-rows .friends-rank-row .friends-person-name').allTextContents();
  check(`${L}: mini ranking mostra eu + amigos (3 linhas)`, rankIds.length === 3, rankIds);
  check(`${L}: mini ranking: Bia (180 XP) em 1º`, /Bia/.test(rankIds[0] || ''), rankIds);
  check(`${L}: mini ranking marca "(você)"`, rankIds.some(n => /você/.test(n)), rankIds);
  const appKey = await page.evaluate(() => APP_KEY);
  await page.evaluate(() => { __rpc.length = 0; });
  await page.click(`#friends-mini-rank [data-friends-rank-scope="${appKey}"]`);
  await page.waitForFunction((k) => __rpc.some(r => r.name === 'friends_leaderboard' && r.args.p_scope === k), appKey);
  check(`${L}: seletor de idioma do mini ranking chama a RPC com o idioma`, true);
  await page.waitForSelector('#friends-mini-rank-rows .friends-rank-row');
  check(`${L}: chip do idioma fica ativo`, (await page.locator('#friends-mini-rank .leaderboard-tab.active').getAttribute('data-friends-rank-scope')) === appKey);
  await page.click('#friends-mini-rank [data-friends-rank-scope="all"]');
  await page.waitForFunction(() => document.querySelector('#friends-mini-rank .leaderboard-tab.active')?.dataset.friendsRankScope === 'all');
  // atividade
  await page.waitForSelector('#friends-activity .friends-activity-row');
  const act = await page.locator('#friends-activity .friends-activity-row').allTextContents();
  check(`${L}: atividade mostra 1 conquista (a desconhecida é ignorada)`, act.length === 1, act);
  check(`${L}: atividade cita o amigo, a conquista e "há 2 dias"`, /Bia Lima ganhou/.test(act[0]) && /há 2 dias/.test(act[0]), act[0]);
  // "Ver ranking completo" abre o ranking na aba Amigos
  await page.click('#friends-mini-rank [data-friends-rank-more]');
  await page.waitForSelector('#leaderboard-content .leaderboard-mode-tabs');
  check(`${L}: "Ver ranking completo" abre Ranking em Amigos`, (await page.locator('#leaderboard-content .leaderboard-mode-tabs .active').getAttribute('data-mode')) === 'friends');
  // preferências
  await page.evaluate(() => switchTab('friends'));
  await page.waitForSelector('#friends-prefs-body [data-friends-pref]', { state: 'attached' });
  check(`${L}: 4 interruptores, todos ligados por padrão`, (await page.locator('#friends-prefs-body [data-friends-pref]:checked').count()) === 4);
  await page.evaluate(() => { document.getElementById('friends-prefs').open = true; });
  await page.uncheck('#friends-prefs-body [data-friends-pref="accept_requests"]');
  await page.waitForFunction(() => (window.__upserts || []).length === 1);
  const up = await page.evaluate(() => window.__upserts[0]);
  check(`${L}: desligar "aceitar pedidos" grava em friend_settings`, up.table === 'friend_settings' && up.row.user_id === 'me' && up.row.accept_requests === false, up);
  await page.evaluate(() => renderFriendsView());
  await page.waitForSelector('#friends-prefs-body [data-friends-pref]', { state: 'attached' });
  check(`${L}: preferência persiste ao recarregar a aba`, (await page.locator('#friends-prefs-body [data-friends-pref="accept_requests"]').isChecked()) === false);
  check(`${L}: os outros 3 continuam ligados`, (await page.locator('#friends-prefs-body [data-friends-pref]:checked').count()) === 3);
  // convite: copiar link
  await page.click('[data-friends-invite="copy"]');
  await page.waitForFunction(() => !!window.__copied);
  const copied = await page.evaluate(() => window.__copied);
  check(`${L}: link de convite traz ?amigo=<meu usuário>`, /\?amigo=u1me$/.test(copied), copied);
  check(`${L}: link de convite não carrega index.html`, !/index\.html/.test(copied), copied);
  // convite: consumir link (abre Amigos já buscando, sem enviar nada)
  await page.evaluate(() => { __rpc.length = 0; localStorage.setItem('pendingFriendInvite', 'ujoao'); friendsConsumePendingInvite(); });
  await page.waitForSelector('#friends-search-results [data-friend-row="joao"]');
  check(`${L}: convite abre Amigos com a pessoa já buscada`, (await page.inputValue('#friends-search-input')) === 'ujoao');
  check(`${L}: banner de convite aparece`, (await page.locator('.friends-invite-banner').textContent()).includes('@ujoao'));
  check(`${L}: convite NÃO envia pedido sozinho`, await page.evaluate(() => !__rpc.some(r => r.name === 'send_friend_request')));
  check(`${L}: convite foi consumido do aparelho`, await page.evaluate(() => localStorage.getItem('pendingFriendInvite') === null));
  await page.evaluate(() => { localStorage.setItem('pendingFriendInvite', 'u1me'); friendsConsumePendingInvite(); });
  check(`${L}: convite do próprio link é ignorado`, await page.evaluate(() => FRIENDS_STATE.inviteUsername === null));
  // erro específico de "não aceita pedidos"
  check(`${L}: mensagem de pedido não aceito`, await page.evaluate(() => /não está aceitando/.test(friendsErrorMessage('not_accepting_requests'))));
  // sem amigos: sem ranking/atividade, mas convite e preferências ficam
  await setup(page, { noFriends: true });
  await page.evaluate(() => renderFriendsView());
  await page.waitForSelector('#friends-invite');
  check(`${L}: sem amigos: sem mini ranking nem atividade`, (await page.locator('#friends-rank').count()) === 0 && (await page.locator('#friends-activity').count()) === 0);
  check(`${L}: sem amigos: convite e preferências continuam`, (await page.locator('#friends-invite').count()) === 1 && (await page.locator('#friends-prefs').count()) === 1);
  check(`${L}: sem erro de página (novidades)`, errors.length === 0, errors);
  await ctx.close();

  // captura do ?amigo= ao abrir o site
  const b = await bootPage(browser, lang, port);
  await b.page.goto(`http://127.0.0.1:${port}/${lang}/index.html?amigo=UJoao`);
  await b.page.waitForFunction(() => typeof friendsConsumePendingInvite === 'function');
  check(`${L}: ?amigo= é guardado em minúsculas`, await b.page.evaluate(() => localStorage.getItem('pendingFriendInvite') === 'ujoao'));
  check(`${L}: endereço fica limpo (sem ?amigo=)`, await b.page.evaluate(() => !/amigo=/.test(location.search)));
  await b.page.goto(`http://127.0.0.1:${port}/${lang}/index.html?amigo=%3Cscript%3E`);
  await b.page.waitForFunction(() => typeof friendsConsumePendingInvite === 'function');
  check(`${L}: valor inválido em ?amigo= não é guardado por cima do válido`, await b.page.evaluate(() => localStorage.getItem('pendingFriendInvite') === 'ujoao'));
  await b.ctx.close();
}

// Visual: tema escuro e celular (sem estouro horizontal, selo visível).
async function visual(browser, lang, port){
  for (const [theme, vp, tag] of [['dark', { width: 1280, height: 900 }, 'dark'], ['light', { width: 390, height: 800 }, 'mobile'], ['dark', { width: 390, height: 800 }, 'mobile-dark']]){
    const { page, errors, ctx } = await bootPage(browser, lang, port, theme, vp);
    await setup(page);
    await page.evaluate(() => refreshFriendRequestCount());
    await page.evaluate(() => switchTab('friends'));
    await page.waitForSelector('#friends-list');
    await page.waitForSelector('#friends-mini-rank-rows .friends-rank-row');
    await page.waitForSelector('#friends-activity .friends-activity-row');
    await page.fill('#friends-search-input', 'joão');
    await page.waitForSelector('#friends-search-results [data-friend-row="joao"]');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${lang}/${tag}: Amigos sem rolagem horizontal`, overflow <= 1, overflow);
    const colors = await page.evaluate(() => {
      const b = document.querySelector('.friends-badge'); if (!b) return null;
      const cs = getComputedStyle(b); return { bg: cs.backgroundColor, fg: cs.color };
    });
    check(`${lang}/${tag}: selo +N com cor própria`, !!colors && colors.bg !== colors.fg, colors);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `amigos-${lang}-${tag}.png`), fullPage: false });
    await page.evaluate(() => { LEADERBOARD_PENDING_MODE = 'friends'; switchTab('leaderboard'); });
    await page.waitForSelector('#leaderboard-content .leaderboard-row');
    const o2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${lang}/${tag}: Ranking de amigos sem rolagem horizontal`, o2 <= 1, o2);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `ranking-amigos-${lang}-${tag}.png`), fullPage: false });
    check(`${lang}/${tag}: sem erro de página`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    for (const lang of ['fr', 'zh']){ await run(browser, lang, port); await runNew(browser, lang, port); await visual(browser, lang, port); }
  } finally { await browser.close(); server.close(); }
  console.log(`\nAmigos: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
