// Aba Turma no Ranking (shared/leaderboard.js, migration 124). Playwright, fr e zh, claro/escuro e celular; Supabase stubado.
// Rodar: node tests/ranking-turma/test_playwright.js  (SHOTS_DIR=pasta para salvar capturas). Harness copiado de tests/amigos/test_playwright.js.
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

async function setup(page, opts){
  await page.evaluate((o) => {
    CURRENT_USER = { id: 'me' };
    const prof = (id, username, name) => ({ user_id: id, username, display_name: name, avatar_url: null, featured_badge_id: null, public_profile: true });
    window.__DB.profiles = [['me', 'u1me', 'Eu Mesma'], ['bia', 'ubia', 'Bia Lima'], ['caio', 'ucaio', 'Caio Reis'], ['joao', 'ujoao', 'João Pereira']].map(([i, u, n]) => prof(i, u, n));
    const wk = leaderboardCurrentWeekStart();
    window.__DB.weekly_xp = [['me', 100], ['joao', 400]].map(([u, a]) => ({ user_id: u, week_start: wk, language_app_key: APP_KEY, amount: a }));
    window.__RPC.friends_leaderboard = () => [];
    window.__RPC.classroom_ranking_rooms = () => o.rooms;
    window.__RPC.classroom_leaderboard = ({ p_classroom_id }) => (o.boards[p_classroom_id] || []).map(([id, amt]) => {
      const p = window.__DB.profiles.find(x => x.user_id === id);
      return { user_id: id, amount: amt, username: p.username, display_name: p.display_name, avatar_url: null, featured_badge_id: null, is_me: id === 'me' };
    });
    PROFILE_CACHE = { user_id: 'me', username: 'u1me', display_name: 'Eu Mesma' };
    window.__rpc.length = 0;
  }, opts);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] })).chromium.launch();
  for (const [lang, theme, viewport] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark', { width: 390, height: 844 }], ['fr', 'light', { width: 390, height: 844 }]]){
    const L = `${lang}/${theme}/${viewport ? viewport.width : 1280}`;
    const { page, errors, ctx } = await bootPage(browser, lang, port, theme, viewport);
    const appKey = await page.evaluate(() => APP_KEY);

    // 1) Sem turma: só Amigos e Geral
    await setup(page, { rooms: [], boards: {} });
    await page.evaluate(() => switchTab('leaderboard'));
    await page.waitForSelector('#leaderboard-content .leaderboard-mode-tabs');
    check(`${L}: sem turma, sem a aba Turma`, (await page.locator('#leaderboard-content [data-mode="classroom"]').count()) === 0);

    // 2) Aluna com duas turmas
    await setup(page, { rooms: [{ id: 11, name: 'Turma de quinta', language_app_key: appKey, is_teacher: false }, { id: 12, name: 'Conversação', language_app_key: appKey, is_teacher: false }],
      boards: { 11: [['bia', 180], ['me', 100], ['caio', 0]], 12: [['me', 100]] } });
    await page.evaluate(() => switchTab('leaderboard'));
    await page.waitForSelector('#leaderboard-content [data-mode="classroom"]');
    check(`${L}: abre no Geral, com a aba Turma por último`, await page.evaluate(() => [...document.querySelectorAll('#leaderboard-content .leaderboard-mode-tabs [data-mode]')].map(b => b.dataset.mode).join() === 'friends,all,classroom'
      && document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active').dataset.mode === 'all'));
    await page.click('#leaderboard-content [data-mode="classroom"]');
    await page.waitForFunction(() => document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active')?.dataset.mode === 'classroom' && document.querySelector('#leaderboard-content .leaderboard-row'));
    const ids = await page.locator('#leaderboard-content .leaderboard-row').evaluateAll(els => els.map(e => e.dataset.userId));
    check(`${L}: Turma lista os colegas na ordem do XP, com quem tem 0 no fim`, ids.join() === 'bia,me,caio', ids);
    check(`${L}: chamou classroom_leaderboard da 1ª turma com a semana`, await page.evaluate(() => __rpc.some(r => r.name === 'classroom_leaderboard' && r.args.p_classroom_id === 11 && /^\d{4}-\d{2}-\d{2}$/.test(r.args.p_week))));
    check(`${L}: na Turma não aparecem as abas Geral/idiomas`, (await page.locator('#leaderboard-content [data-scope]').count()) === 0);
    check(`${L}: escolha da turma com as 2 turmas`, (await page.locator('#leaderboard-content [data-classroom]').count()) === 2);
    check(`${L}: nota de rodapé fala da turma e do idioma`, await page.evaluate(() => { const f = document.querySelector('#leaderboard-content .leaderboard-footnote').textContent; return f.includes('Turma de quinta') && f.includes(languageDisplayName(AVAILABLE_LANGUAGES.find(l => l.appKey === APP_KEY))); }));
    check(`${L}: pódio aparece na Turma`, (await page.locator('#leaderboard-content .lb-game').count()) === 1);
    check(`${L}: minha linha destacada`, (await page.locator('#leaderboard-content .leaderboard-row.me').getAttribute('data-user-id')) === 'me');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/turma-${lang}-${theme}-${viewport ? viewport.width : 1280}.png`, fullPage: false });
    await page.click('#leaderboard-content [data-classroom="12"]');
    await page.waitForFunction(() => document.querySelector('#leaderboard-content [data-classroom].active')?.dataset.classroom === '12');
    check(`${L}: trocar de turma recarrega a lista`, (await page.locator('#leaderboard-content .leaderboard-row').count()) === 1);
    await page.click('#leaderboard-content [data-mode="all"]');
    await page.waitForFunction(() => document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active')?.dataset.mode === 'all');
    check(`${L}: volta ao Geral com as abas de idioma`, (await page.locator('#leaderboard-content [data-scope]').count()) >= 2);

    // 3) Turma vazia (professora com turma sem alunos)
    await setup(page, { rooms: [{ id: 21, name: 'Turma nova', language_app_key: appKey, is_teacher: true }], boards: {} });
    await page.evaluate(() => { LEADERBOARD_PENDING_MODE = 'classroom'; switchTab('leaderboard'); });
    await page.waitForFunction(() => document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active')?.dataset.mode === 'classroom');
    check(`${L}: turma sem alunos mostra o aviso, sem escolha de turma (só 1)`, await page.evaluate(() => document.querySelector('#leaderboard-content .review-empty h3')?.textContent === t('leaderboard.classroom.emptyTitle')
      && !document.querySelector('#leaderboard-content [data-classroom]')));
    // 4) Turma sumiu (vínculo encerrado): volta ao Geral sozinho
    await setup(page, { rooms: [], boards: {} });
    await page.evaluate(() => { LEADERBOARD_PENDING_MODE = 'classroom'; switchTab('leaderboard'); });
    await page.waitForFunction(() => document.querySelector('#leaderboard-content .leaderboard-mode-tabs .active')?.dataset.mode === 'all');
    check(`${L}: sem turma, o pedido de abrir na Turma cai no Geral`, true);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(`${L}: sem rolagem horizontal`, !overflow);
    check(`${L}: sem erros de página`, errors.filter(e => !/Failed to fetch|ERR_/.test(e)).length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`ranking-turma (navegador): ${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
