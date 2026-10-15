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
  partner: { user_id: 'bia', username: 'bia', display_name: 'Bia Lima', avatar_url: null } }; // missão antiga de XP (102)
// Missão de dias (109): montada na página a partir de hoje (segunda da semana; você 3 dias antes de hoje, Bia 2).
const DAYS = 'days';

async function boot(browser, lang, port, theme, viewport, ui){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1280, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript((ui) => { try { sessionStorage.setItem('guest_mode', '1'); if (ui) localStorage.setItem('ui-language', ui); } catch (e) {} }, ui || null);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

// opt: mission (null = sem missão, DAYS = missão de dias montada a partir de hoje, objeto = XP antiga), noRpc, off (saiu das missões)
async function setup(page, opt){
  await page.evaluate((opt) => {
    CURRENT_USER = { id: 'me' };
    PROFILE_CACHE = { user_id: 'me', username: 'eu', display_name: 'Eu Mesma' };
    window.__DB.profiles = [{ user_id: 'me', username: 'eu', display_name: 'Eu Mesma' }, { user_id: 'bia', username: 'bia', display_name: 'Bia Lima' },
      { user_id: 'caio', username: 'caio', display_name: 'Caio Reis' }, { user_id: 'duda', username: 'duda', display_name: 'Duda Melo' }];
    window.__DB.friendships = [{ id: 1, requester_id: 'me', addressee_id: 'bia', status: 'accepted' }, { id: 2, requester_id: 'caio', addressee_id: 'me', status: 'accepted' },
      { id: 3, requester_id: 'me', addressee_id: 'duda', status: 'accepted' }];
    window.__DB.friend_settings = opt.off ? [{ user_id: 'me', join_duo_missions: false }] : [];
    const iso = (d) => d.toISOString().slice(0, 10);
    const today = todayStr();
    const t0 = new Date(today + 'T12:00:00Z');
    const monday = new Date(t0.getTime() - ((t0.getUTCDay() + 6) % 7) * 86400000);
    const days = []; for (let d = new Date(monday); iso(d) < today; d = new Date(d.getTime() + 86400000)) days.push(iso(d));
    window.__daysMission = { id: 9, kind: 'days', auto: true, week_start: iso(monday), start_day: iso(monday), today, goal_days: 4, completed_at: null,
      my_days: days.slice(-3), partner_days: days.slice(-2),
      partner: { user_id: 'bia', username: 'bia', display_name: 'Bia Lima', avatar_url: null } };
    window.__mission = opt.mission === 'days' ? window.__daysMission : (opt.mission || null);
    window.__RPC.friend_suggestions = () => [];
    window.__RPC.profile_cards = ({ p_ids }) => window.__DB.profiles.filter(p => (p_ids || []).includes(p.user_id));
    window.__RPC.friends_duo_state = () => [
      { user_id: 'bia', joint_streak: 12, studied_today: false, can_nudge: true, nudged_today: false, in_mission: !!window.__mission, can_invite: !window.__mission },
      { user_id: 'caio', joint_streak: 1, studied_today: true, can_nudge: false, nudged_today: false, in_mission: false, can_invite: !window.__mission },
      { user_id: 'duda', joint_streak: 0, studied_today: false, can_nudge: false, nudged_today: false, in_mission: true, can_invite: false },
    ];
    window.__RPC.friends_duo = window.__RPC.friends_duo_state;
    window.__RPC.my_duo_mission = () => window.__mission;
    window.__RPC.nudge_friend = () => ({ ok: true, status: 'sent' });
    window.__RPC.start_duo_mission = ({ p_friend }) => {
      window.__mission = Object.assign({}, window.__daysMission, { id: 10, auto: false, start_day: today, my_days: [], partner_days: [],
        partner: { user_id: p_friend, username: p_friend, display_name: p_friend === 'bia' ? 'Bia Lima' : 'Caio Reis', avatar_url: null } });
      return { ok: true, id: 10, goal_days: 4 };
    };
    window.__RPC.my_duo_missions_done = () => 0;
    if (opt.noRpc) ['friends_duo', 'friends_duo_state', 'my_duo_mission', 'nudge_friend', 'start_duo_mission', 'my_duo_missions_done'].forEach(k => delete window.__RPC[k]);
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
  // 1. sem missão: texto da dupla automática, "Chamar para missão" no cartão do amigo livre
  let { page, errors, ctx } = await boot(browser, lang, port);
  await setup(page, { mission: null });
  await openFriends(page);
  await page.waitForSelector('#friends-duo:not([hidden])', { timeout: 5000 });
  check(`${L}: sem missão: explica a dupla automática`, /Toda segunda o site forma uma dupla/.test(await text(page, '#friends-duo')));
  check(`${L}: sem formulário (sem seletor de amigo ou de meta)`, !(await page.$('#friends-duo select')));
  const bia = await text(page, '[data-friend-duo="bia"]');
  check(`${L}: Bia: 12 dias juntos, Cutucar e Chamar para missão`, /12 dias juntos/.test(bia) && /Cutucar/.test(bia) && /Chamar para missão/.test(bia), bia);
  check(`${L}: Duda (em missão ou fora): sem Chamar`, !(await page.$('[data-duo-invite="duda"]')));
  check(`${L}: Caio: Chamar sem chip (1 dia) e sem Cutucar (estudou hoje)`, (await text(page, '[data-friend-duo="caio"]')) === 'Chamar para missão');
  await page.click('[data-friend-nudge="bia"]');
  await page.waitForTimeout(250);
  check(`${L}: Cutucar chama nudge_friend`, (await page.evaluate(() => window.__rpc.filter(r => r.name === 'nudge_friend').pop()))?.args?.p_friend === 'bia');
  check(`${L}: depois vira "Cutucado"`, /Cutucado/.test(await text(page, '[data-friend-duo="bia"]')));
  await page.click('[data-duo-invite="caio"]');
  await page.waitForSelector('#friends-duo .duo-week', { timeout: 5000 });
  const st = await page.evaluate(() => window.__rpc.filter(r => r.name === 'start_duo_mission').pop());
  check(`${L}: Chamar chama start_duo_mission(caio)`, st && st.args.p_friend === 'caio', st);
  check(`${L}: cartão mostra a dupla nova`, /Sua dupla da semana: Caio/.test(await text(page, '#friends-duo')));
  check(`${L}: com missão, os botões Chamar somem`, !(await page.$('[data-duo-invite]')));
  check(`${L}: sem erros (1)`, errors.length === 0, errors);
  await ctx.close();

  // 2. missão de dias: grade da semana, meta, cutucar dentro do cartão
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { mission: DAYS });
  await openFriends(page);
  await page.waitForSelector('#friends-duo .duo-week', { timeout: 5000 });
  const t2 = await text(page, '#friends-duo');
  const exp = await page.evaluate(() => ({ mine: Math.min(window.__daysMission.my_days.length, 4), theirs: Math.min(window.__daysMission.partner_days.length, 4) }));
  check(`${L}: título "Sua dupla da semana: Bia"`, /Sua dupla da semana: Bia/.test(t2), t2);
  check(`${L}: contagem dos dois`, t2.includes(`${exp.mine}/4`) && t2.includes(`${exp.theirs}/4`), [t2, exp]);
  check(`${L}: meta "Cada um estuda 4 dias até domingo"`, /Cada um estuda 4 dias até domingo/.test(t2));
  check(`${L}: 7 bolinhas por pessoa`, await page.$$eval('#friends-duo .duo-week-row:not(.duo-week-head)', rs => rs.every(r => r.querySelectorAll('.duo-dot').length === 7)));
  check(`${L}: dias estudados marcados`, await page.$$eval('#friends-duo .duo-week-row:not(.duo-week-head)', rs => rs.map(r => r.querySelectorAll('.duo-dot.is-on').length)).then(a => a[0] === exp.mine && a[1] === exp.theirs));
  check(`${L}: hoje destacado`, (await page.$$('#friends-duo .duo-dot.is-today')).length === 2);
  check(`${L}: Cutucar a Bia dentro do cartão`, !!(await page.$('#friends-duo [data-friend-nudge="bia"]')));
  check(`${L}: grade com descrição para leitor de tela`, /Você estudou \d de 4 dias e Bia, \d de 4/.test(await page.$eval('#friends-duo .duo-week', e => e.getAttribute('aria-label'))));
  // cumprida
  await page.evaluate(() => { window.__mission = Object.assign({}, window.__daysMission, { completed_at: '2026-10-15T12:00:00Z' }); window.__RPC.my_duo_missions_done = () => 1; return loadFriendsDuo(); });
  await page.waitForTimeout(250);
  const t3 = await text(page, '#friends-duo');
  check(`${L}: cumprida: "Missão cumprida!" e dupla nova na segunda`, /Missão cumprida!/.test(t3) && /Segunda tem dupla nova/.test(t3), t3);
  check(`${L}: cumprida: recarrega a conquista`, await page.evaluate(() => window.__rpc.some(r => r.name === 'my_duo_missions_done')));

  // 3. quadro "Missões do dia": linha da dupla e missões clicáveis
  await page.evaluate(() => { window.__mission = window.__daysMission; FRIENDS_STATE.mission = window.__daysMission; switchTab('path'); renderDailyChallengesStrip(); });
  await page.waitForTimeout(150);
  const row = await page.$('.dcs-cards [data-mission-go="duo"]:visible');
  check(`${L}: quadro: linha "Missão em dupla com Bia"`, row && /Missão em dupla com Bia/.test(await row.innerText()));
  check(`${L}: quadro: missões são botões`, await page.$$eval('.dcs-cards .dcs-card', cs => cs.length >= 2 && cs.every(c => c.tagName === 'BUTTON' && c.dataset.missionGo)));
  const activeTab = () => page.evaluate(() => document.getElementById('app').dataset.activeTab);
  await page.locator('.dcs-cards [data-mission-go="duo"]:visible').first().click();
  await page.waitForTimeout(300);
  check(`${L}: tocar na dupla abre Amigos`, (await activeTab()) === 'friends', await activeTab());
  const firstId = await page.$eval('.dcs-cards [data-mission-go]:not([data-mission-go="duo"])', b => b.dataset.missionGo).catch(() => null);
  if (firstId){
    await page.evaluate(() => { switchTab('friends'); renderDailyChallengesStrip(); });
    await page.locator(`.dcs-cards [data-mission-go="${firstId}"]:visible`).first().click();
    await page.waitForTimeout(300);
    const want = await page.evaluate((id) => (DAILY_MISSION_TARGETS[id] || 'path').split(':')[0], firstId);
    check(`${L}: tocar em "${firstId}" abre ${want}`, (await activeTab()) === want, [await activeTab(), want]);
  }
  const mapOk = await page.evaluate(() => ['reviews15', 'overdue3', 'speedReview1', 'matchGame1'].every(k => DAILY_MISSION_TARGETS[k].startsWith('review'))
    && (typeof APP_KEY === 'undefined' || DAILY_MISSION_TARGETS.conj1 === 'conjugaison'));
  check(`${L}: destinos de Revisão e Conjugação`, mapOk);
  // 4. faixa do fim da lição: só no 1º estudo do dia
  const strip1 = await page.evaluate(() => { FRIENDS_STATE.mission = JSON.parse(JSON.stringify(window.__daysMission)); return duoLessonStripHTML(); });
  check(`${L}: fim da lição: "Dia N de 4 na missão com Bia ✓"`, /Dia \d de 4 na missão com Bia ✓/.test(strip1), strip1);
  const strip2 = await page.evaluate(() => duoLessonStripHTML());
  check(`${L}: fim da lição: na 2ª lição do dia não repete`, strip2 === '');
  const strip3 = await page.evaluate(() => { const m = JSON.parse(JSON.stringify(window.__daysMission)); m.my_days = ['a','b','c']; m.partner_days = ['a','b','c','d']; FRIENDS_STATE.mission = m; return duoLessonStripHTML(); });
  check(`${L}: fim da lição: 4º dia dos dois = cumprida`, /cumprida/.test(strip3), strip3);
  check(`${L}: tela de lição concluída usa a faixa`, await page.evaluate(() => String(renderLessonCompleteScreen).includes('duoLessonStripHTML')));
  check(`${L}: sem erros (2-4)`, errors.length === 0, errors);
  await ctx.close();

  // 5. missão antiga de XP ainda aparece; saiu das missões; sem a 109 no banco
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { mission: MISSION });
  await openFriends(page);
  await page.waitForSelector('#friends-duo .friends-duo-bar', { timeout: 5000 });
  check(`${L}: missão antiga de XP: 180 de 300 XP`, /180 de 300 XP/.test(await text(page, '#friends-duo')));
  await ctx.close();
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { mission: null, off: true });
  await openFriends(page);
  await page.waitForSelector('#friends-duo:not([hidden])', { timeout: 5000 });
  check(`${L}: saiu das missões: explica como voltar`, /não está participando das missões em dupla/.test(await text(page, '#friends-duo')));
  await ctx.close();
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, { noRpc: true });
  await openFriends(page);
  await page.waitForTimeout(300);
  check(`${L}: sem banco: cartão escondido`, await page.$eval('#friends-duo', e => e.hidden));
  check(`${L}: sem banco: nada nos cartões`, (await text(page, '[data-friend-duo="bia"]')) === '');
  check(`${L}: sem banco: sem erros`, errors.length === 0, errors);
  await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="friends-prefs-body"></div>'); return loadFriendsPrefs(); });
  for (const k of ['accept_nudges', 'notify_missions', 'join_duo_missions']){
    const el = await page.$(`#friends-prefs-body [data-friends-pref="${k}"]`);
    check(`${L}: preferência ${k} existe e vem ligada`, el && await el.isChecked());
  }
  await ctx.close();
}

// Site em inglês não tem NADA em português (CLAUDE.md): nome do idioma (filtros da disputa da semana, bandeira do
// amigo, Ranking, troca de idioma, Perfil, perfil público) e o rótulo "Convidado" do topo. Claro e escuro.
const PT_WORDS = /Francês|Chinês|Português|Mandarim|Convidado|\bConta\b/; // com acento: "Chinese" contém "Chines"
async function english(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']){
    const { page, errors, ctx } = await boot(browser, lang, port, theme, null, 'en');
    const tag = `${lang} en ${theme}`;
    await page.waitForFunction(() => getUiLang() === 'en' && t('auth.guestLabel') === 'Guest', null, { timeout: 8000 });
    check(`${tag}: topo do convidado em inglês`, (await text(page, '#user-label')) === 'Guest', await text(page, '#user-label'));
    check(`${tag}: aria-label da conta em inglês`, !PT_WORDS.test(await page.$eval('#user-menu-btn', e => e.getAttribute('aria-label') + ' ' + e.title)));
    await setup(page, { mission: null });
    await page.evaluate(() => { window.__RPC.friends_extras = () => [{ user_id: 'bia', streak: 2, studied_today: true, languages: ['frances', 'mandarim'] }]; });
    await openFriends(page);
    await page.waitForSelector('#friends-mini-rank .friends-rank-scopes', { timeout: 5000 });
    await page.waitForSelector('#friends-content .friend-flag', { timeout: 5000 });
    const chips = await text(page, '#friends-mini-rank .friends-rank-scopes');
    check(`${tag}: filtros da disputa da semana em inglês`, /French/.test(chips) && /Chinese/.test(chips) && !PT_WORDS.test(chips), chips);
    const flags = await page.$$eval('#friends-content .friend-flag', els => els.map(e => e.title).join(' '));
    check(`${tag}: bandeira do amigo em inglês`, /French/.test(flags) && !PT_WORDS.test(flags), flags);
    const out = await page.evaluate(async () => {
      const r = {};
      document.getElementById('leaderboard-content').innerHTML = '';
      await renderLeaderboardView();
      r.rank = document.querySelector('#leaderboard-content')?.innerText || '';
      const per = CourseStorage.isPerSiteLanguage;
      CourseStorage.isPerSiteLanguage = () => false;
      try { paintLanguageSwitcher(); r.switcher = document.getElementById('lang-switcher-dropdown').innerHTML; } finally { CourseStorage.isPerSiteLanguage = per; }
      r.profile = (await buildLanguagesSummary()).map(l => l.name).join(' ');
      r.publicCard = publicProfileLangCardHTML({ languageAppKey: 'mandarim', streak: 1, lastStudyDay: todayStr() });
      r.name = languageDisplayName('frances') + ' ' + languageDisplayName('mandarim');
      return r;
    });
    check(`${tag}: abas do Ranking em inglês`, /French/.test(out.rank) && !PT_WORDS.test(out.rank), out.rank.slice(0, 200));
    check(`${tag}: menu de troca de idioma em inglês`, /French|Chinese/.test(out.switcher) && !PT_WORDS.test(out.switcher));
    check(`${tag}: idiomas do Perfil em inglês`, /French|Chinese/.test(out.profile) && !PT_WORDS.test(out.profile), out.profile);
    check(`${tag}: perfil público em inglês`, /Chinese/.test(out.publicCard) && !PT_WORDS.test(out.publicCard));
    check(`${tag}: helper com maiúscula`, out.name === 'French Chinese', out.name);
    if (SHOTS){ await page.evaluate(() => switchTab('profile')); await page.click('#profile-content .profile-subnav [data-tab="friends"]'); await page.waitForTimeout(400);
      await page.$eval('#friends-mini-rank', e => e.scrollIntoView({ block: 'start' })); await page.screenshot({ path: path.join(SHOTS, `en-amigos-${lang}-${theme}.png`) }); }
    check(`${tag}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
  // Em português continua "Francês"/"Chinês" (o helper só troca o idioma, não o conteúdo pt).
  const { page, ctx } = await boot(browser, 'fr', port);
  check('pt-BR: helper segue em português', (await page.evaluate(() => languageDisplayName('frances') + ' ' + languageDisplayName('mandarim'))) === 'Francês Chinês');
  await ctx.close();
}

async function visual(browser, port){
  for (const ui of ['pt-BR', 'en']) for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    for (const mission of [null, DAYS]){
      const { page, errors, ctx } = await boot(browser, lang, port, theme, vp, ui);
      const sfx = ui === 'en' ? '-en' : '';
      await setup(page, { mission });
      await openFriends(page);
      await page.waitForSelector('#friends-duo:not([hidden])', { timeout: 5000 });
      const tag = `${ui} ${lang} ${theme} ${vp.width} ${mission ? 'missão' : 'convite'}`;
      if (ui === 'en'){
        // site em inglês: nada em português no cartão da dupla, nos cartões dos amigos e na linha das Missões do dia
        const pt = await page.evaluate(() => [...document.querySelectorAll('#friends-duo, #friends-list, .dcs-duo')].map(e => e.innerText).join(' ').match(/\b(Você|dupla|dias|semana|Cutucar|Chamar|missão|juntos|Termina|até domingo)\b/gi));
        check(`${tag}: sem português`, !pt, pt);
      }
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(`${tag}: sem rolagem lateral da página`, over <= 0, over);
      // contraste mínimo: texto do cartão não pode ter a mesma cor do fundo
      const c = await page.$eval('.friends-duo-card', el => { const s = getComputedStyle(el); const h = el.querySelector('.friends-duo-title'); return [s.backgroundColor, getComputedStyle(h).color]; });
      check(`${tag}: título legível`, c[0] !== c[1], c);
      if (vp.width === 390){
        const small = await page.$$eval('#friends-duo button, .friend-nudge, .friend-duo-invite', els => els.filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).length);
        check(`${tag}: alvos de toque >= 44px`, small === 0, small);
      }
      if (SHOTS){ await page.$eval('#friends-duo', e => { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -110); }); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `dupla-${lang}-${theme}-${vp.width}-${mission ? 'missao' : 'convite'}${sfx}.png`) }); }
      if (SHOTS && !mission){ await page.$eval('#friends-list', e => e.scrollIntoView({ block: 'start' })); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `dupla-cards-${lang}-${theme}-${vp.width}${sfx}.png`) }); }
      if (mission === DAYS && vp.width === 1280){
        // faixa do fim da lição + linha do quadro, desenhadas num canto da página para o print
        await page.evaluate(() => {
          FRIENDS_STATE.mission = JSON.parse(JSON.stringify(window.__daysMission));
          const box = document.createElement('div');
          box.id = 'tst-duo'; box.style.cssText = 'position:fixed;left:240px;top:110px;z-index:9999;width:460px;background:var(--paper);padding:16px;border-radius:16px';
          box.innerHTML = `<div class="lesson-complete">${duoLessonStripHTML()}</div><div class="dcs-cards" style="margin-top:12px">${duoDailyStripRowHTML()}</div>`;
          document.body.appendChild(box);
        });
        const c2 = await page.$eval('#tst-duo .duo-lesson-strip', el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
        check(`${tag}: faixa do fim da lição legível`, c2[0] !== c2[1], c2);
        if (SHOTS) await page.$eval('#tst-duo', e => e).then(() => page.locator('#tst-duo').screenshot({ path: path.join(SHOTS, `dupla-faixa-${lang}-${theme}${sfx}.png`) }));
      }
      check(`${tag}: sem erros`, errors.length === 0, errors);
      await ctx.close();
    }
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { await run(browser, port, 'fr'); await run(browser, port, 'zh'); await english(browser, port); await visual(browser, port); }
  catch (e) { failed++; console.log('  ERRO:', e.message); }
  await browser.close(); server.close();
  console.log(`Amigos em dupla (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
