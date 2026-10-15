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

const MISSION = { id: 7, week_start: '2026-10-12', goal_xp: 300, started_by_me: true, my_xp: 120, partner_xp: 60, completed_at: null,
  partner: { user_id: 'bia', username: 'bia', display_name: 'Bia Lima', avatar_url: null } };

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

// opt: mission (null = sem missão), noRpc (sem a 102 no banco)
async function setup(page, opt){
  await page.evaluate((opt) => {
    CURRENT_USER = { id: 'me' };
    PROFILE_CACHE = { user_id: 'me', username: 'eu', display_name: 'Eu Mesma' };
    window.__DB.profiles = [{ user_id: 'me', username: 'eu', display_name: 'Eu Mesma' }, { user_id: 'bia', username: 'bia', display_name: 'Bia Lima' },
      { user_id: 'caio', username: 'caio', display_name: 'Caio Reis' }, { user_id: 'duda', username: 'duda', display_name: 'Duda Melo' }];
    window.__DB.friendships = [{ id: 1, requester_id: 'me', addressee_id: 'bia', status: 'accepted' }, { id: 2, requester_id: 'caio', addressee_id: 'me', status: 'accepted' },
      { id: 3, requester_id: 'me', addressee_id: 'duda', status: 'accepted' }];
    window.__DB.friend_settings = [];
    window.__mission = opt.mission || null;
    window.__RPC.friend_suggestions = () => [];
    window.__RPC.profile_cards = ({ p_ids }) => window.__DB.profiles.filter(p => (p_ids || []).includes(p.user_id));
    window.__RPC.friends_duo = () => [
      { user_id: 'bia', joint_streak: 12, studied_today: false, can_nudge: true, nudged_today: false, in_mission: !!window.__mission },
      { user_id: 'caio', joint_streak: 1, studied_today: true, can_nudge: false, nudged_today: false, in_mission: false },
      { user_id: 'duda', joint_streak: 0, studied_today: false, can_nudge: false, nudged_today: false, in_mission: true },
    ];
    window.__RPC.my_duo_mission = () => window.__mission;
    window.__RPC.nudge_friend = () => ({ ok: true, status: 'sent' });
    window.__RPC.start_duo_mission = ({ p_friend, p_goal }) => {
      window.__mission = Object.assign({}, { id: 8, week_start: '2026-10-12', goal_xp: p_goal, started_by_me: true, my_xp: 0, partner_xp: 0, completed_at: null,
        partner: { user_id: p_friend, username: p_friend, display_name: p_friend === 'bia' ? 'Bia Lima' : 'Caio Reis', avatar_url: null } });
      return { ok: true, id: 8 };
    };
    window.__RPC.my_duo_missions_done = () => 0;
    if (opt.noRpc) ['friends_duo', 'my_duo_mission', 'nudge_friend', 'start_duo_mission', 'my_duo_missions_done'].forEach(k => delete window.__RPC[k]);
  }, opt);
}

async function openFriends(page){
  await page.evaluate(() => switchTab('profile'));
  await page.click('#profile-content .profile-subnav [data-tab="friends"]');
  await page.waitForSelector('#friends-content .friends-title', { timeout: 8000 });
  await page.waitForTimeout(300);
}

const text = (page, sel) => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);

async function run(browser, port, lang){
  const L = lang;
  // 1. sem missão: convite; sequência juntos; cutucar
  let { page, errors, ctx } = await boot(browser, lang, port);
  await setup(page, { mission: null });
  await openFriends(page);
  await page.waitForSelector('#friends-duo:not([hidden]) [data-duo-start]', { timeout: 5000 });
  const opts = await page.$$eval('#friends-duo [data-duo-friend] option', os => os.map(o => o.value));
  check(`${L}: convite lista só quem está livre (Bia e Caio, sem Duda)`, opts.join(',') === 'bia,caio', opts);
  check(`${L}: meta padrão 300`, await page.$eval('#friends-duo [data-duo-goal]', s => s.value) === '300');
  check(`${L}: texto do convite`, /Chame um amigo para juntar XP até domingo/.test(await text(page, '#friends-duo')));
  const bia = await text(page, '[data-friend-duo="bia"]');
  check(`${L}: Bia: 12 dias juntos + Cutucar`, /12 dias juntos/.test(bia) && /Cutucar/.test(bia), bia);
  const caio = await text(page, '[data-friend-duo="caio"]');
  check(`${L}: Caio: 1 dia não mostra chip; estudou hoje: sem Cutucar`, caio === '', caio);
  check(`${L}: Duda: sem cutucar (desligou)`, (await text(page, '[data-friend-duo="duda"]')) === '');
  check(`${L}: dica de sequência em risco no botão`, /acaba se Bia Lima não estudar hoje/.test(await page.$eval('[data-friend-nudge="bia"]', b => b.title)));
  await page.click('[data-friend-nudge="bia"]');
  await page.waitForTimeout(250);
  const nud = await page.evaluate(() => window.__rpc.filter(r => r.name === 'nudge_friend').pop());
  check(`${L}: Cutucar chama nudge_friend`, nud && nud.args.p_friend === 'bia', nud);
  check(`${L}: depois vira "Cutucado"`, /Cutucado/.test(await text(page, '[data-friend-duo="bia"]')) && !(await page.$('[data-friend-nudge="bia"]')));
  // erro: já estudou -> botão some
  await page.evaluate(() => { window.__RPC.nudge_friend = () => ({ error: 'already_studied' }); FRIENDS_STATE.duo.duda.can_nudge = true; friendsDecorateDuo(); });
  await page.click('[data-friend-nudge="duda"]');
  await page.waitForTimeout(250);
  check(`${L}: erro "já estudou hoje" tira o botão`, !(await page.$('[data-friend-nudge="duda"]')));
  // começar missão com Caio, 600
  await page.selectOption('#friends-duo [data-duo-friend]', 'caio');
  await page.selectOption('#friends-duo [data-duo-goal]', '600');
  await page.click('#friends-duo [data-duo-start]');
  await page.waitForSelector('#friends-duo .friends-duo-bar', { timeout: 5000 });
  const st = await page.evaluate(() => window.__rpc.filter(r => r.name === 'start_duo_mission').pop());
  check(`${L}: Começar chama start_duo_mission(caio, 600)`, st && st.args.p_friend === 'caio' && st.args.p_goal === 600, st);
  check(`${L}: cartão mostra a missão nova`, /Você e Caio/.test(await text(page, '#friends-duo')) && /0 de 600 XP/.test(await text(page, '#friends-duo')));
  check(`${L}: sem erros`, errors.length === 0, errors);
  await ctx.close();

  // 2. missão em andamento e cumprida
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { mission: MISSION });
  await openFriends(page);
  await page.waitForSelector('#friends-duo .friends-duo-bar', { timeout: 5000 });
  const t1 = await text(page, '#friends-duo');
  check(`${L}: andamento: 180 de 300 XP`, /180 de 300 XP/.test(t1), t1);
  check(`${L}: andamento: legenda dos dois`, /Você: 120 XP/.test(t1) && /Bia: 60 XP/.test(t1), t1);
  check(`${L}: andamento: termina em/hoje`, /Termina (em \d+ dias?|hoje)/.test(t1), t1);
  const bar = await page.$eval('#friends-duo .friends-duo-bar', b => ({ now: b.getAttribute('aria-valuenow'), max: b.getAttribute('aria-valuemax'),
    mine: b.querySelector('.friends-duo-bar-mine').style.width, theirs: b.querySelector('.friends-duo-bar-theirs').style.width }));
  check(`${L}: barra 40% + 20%`, bar.now === '180' && bar.max === '300' && bar.mine === '40%' && bar.theirs === '20%', bar);
  await page.evaluate(() => { window.__mission = Object.assign({}, window.__mission, { my_xp: 200, partner_xp: 150, completed_at: '2026-10-15T12:00:00Z' }); window.__RPC.my_duo_missions_done = () => 1; return loadFriendsDuo(); });
  await page.waitForTimeout(300);
  const t2 = await text(page, '#friends-duo');
  check(`${L}: cumprida: "Missão cumprida!" e barra cheia`, /Missão cumprida!/.test(t2) && /300 de 300 XP/.test(t2), t2);
  check(`${L}: cumprida: recarrega a conquista`, await page.evaluate(() => window.__rpc.some(r => r.name === 'my_duo_missions_done')));
  check(`${L}: conquista Missões em Dupla nível 1`, await page.evaluate(async () => { await new Promise(r => setTimeout(r, 200)); return (evaluateBadgeTracks(STATE).tracks.find(x => x.id === 'duo') || {}).level; }) === 1);
  check(`${L}: sem erros (missão)`, errors.length === 0, errors);
  await ctx.close();

  // 3. sem a 102 no banco: nada aparece, sem erro de página
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { noRpc: true });
  await openFriends(page);
  await page.waitForTimeout(300);
  check(`${L}: sem 102: cartão da missão escondido`, await page.$eval('#friends-duo', e => e.hidden));
  check(`${L}: sem 102: nada nos cartões`, (await text(page, '[data-friend-duo="bia"]')) === '');
  check(`${L}: sem 102: sem erros`, errors.length === 0, errors);
  // preferências novas
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="friends-prefs-body"></div>'); return loadFriendsPrefs(); });
  for (const k of ['accept_nudges', 'notify_missions']){
    const el = await page.$(`#friends-prefs-body [data-friends-pref="${k}"]`);
    check(`${L}: preferência ${k} existe e vem ligada`, el && await el.isChecked());
  }
  await page.uncheck('#friends-prefs-body [data-friends-pref="accept_nudges"]');
  await page.waitForTimeout(200);
  const up = await page.evaluate(() => window.__upserts.filter(u => u.table === 'friend_settings').pop());
  check(`${L}: desligar grava accept_nudges=false`, up && up.row.accept_nudges === false, up);
  // matriz de Configurações > Notificações: Amigos agora tem push (padrão ligado) e continua sem e-mail
  await page.evaluate(() => { window.__DB.notification_preferences = [{ user_id: 'me', channels: {}, quiet_hours_start: null, quiet_hours_end: null }];
    getLocalPushSubscription = async () => null; switchTab('settings'); switchSettingsSection('notifications'); });
  await page.waitForSelector('#settings-notifications-content [data-pref-category="amigos"][data-pref-channel="push"]', { state: 'attached', timeout: 8000 });
  const mx = await page.evaluate(() => { const q = (ch) => document.querySelector(`[data-pref-category="amigos"][data-pref-channel="${ch}"]`);
    return { push: q('push').checked, pushOff: q('push').disabled, email: q('email').checked, emailOff: q('email').disabled, title: q('email').title }; });
  check(`${L}: matriz: push de Amigos ligado e liberado`, mx.push && !mx.pushOff, mx);
  check(`${L}: matriz: e-mail de Amigos desligado e travado`, !mx.email && mx.emailOff && /e-mail/.test(mx.title), mx);
  await ctx.close();
}

async function visual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    for (const mission of [null, MISSION]){
      const { page, errors, ctx } = await boot(browser, lang, port, theme, vp);
      await setup(page, { mission });
      await openFriends(page);
      await page.waitForSelector('#friends-duo:not([hidden])', { timeout: 5000 });
      const tag = `${lang} ${theme} ${vp.width} ${mission ? 'missão' : 'convite'}`;
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(`${tag}: sem rolagem lateral da página`, over <= 0, over);
      // contraste mínimo: texto do cartão não pode ter a mesma cor do fundo
      const c = await page.$eval('.friends-duo-card', el => { const s = getComputedStyle(el); const h = el.querySelector('.friends-duo-title'); return [s.backgroundColor, getComputedStyle(h).color]; });
      check(`${tag}: título legível`, c[0] !== c[1], c);
      if (vp.width === 390){
        const small = await page.$$eval('#friends-duo button, #friends-duo select, .friend-nudge', els => els.filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).length);
        check(`${tag}: alvos de toque >= 44px`, small === 0, small);
      }
      if (SHOTS){ await page.$eval('#friends-duo', e => e.scrollIntoView({ block: 'start' })); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `dupla-${lang}-${theme}-${vp.width}-${mission ? 'missao' : 'convite'}.png`) }); }
      if (SHOTS && !mission){ await page.$eval('#friends-list', e => e.scrollIntoView({ block: 'start' })); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `dupla-cards-${lang}-${theme}-${vp.width}.png`) }); }
      check(`${tag}: sem erros`, errors.length === 0, errors);
      await ctx.close();
    }
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { await run(browser, port, 'fr'); await run(browser, port, 'zh'); await visual(browser, port); }
  catch (e) { failed++; console.log('  ERRO:', e.message); }
  await browser.close(); server.close();
  console.log(`Amigos em dupla (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
