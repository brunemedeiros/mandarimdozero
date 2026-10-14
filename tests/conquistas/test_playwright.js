// Conquistas com níveis (shared/badge-tracks.js + shared/badge-tracks-app.js) no app real.
// Playwright (Chromium), FR + ZH, claro/escuro e celular. Supabase stubado em memória; "logado" = CURRENT_USER
// setado depois do boot de convidado. Rodar: node tests/conquistas/test_playwright.js  (SHOTS_DIR=... salva prints)
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

// Stub do Supabase: tabelas em window.__DB, RPCs em window.__RPC, upserts gravados em window.__upserts.
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

// Aluna no meio do caminho: 8 dias de estudo (com um fim de semana), 120 revisões, 2.100 XP, metade das unidades
// (uma pulada pelo ponto de verificação), 2 amigos. Conquistas antigas: 'streak_7' e 'multitasker' (fr), 'unit_1' (zh).
async function setup(page, lang){
  await page.evaluate((lang) => {
    CURRENT_USER = { id: 'me' };
    window.__DB.profiles = [{ user_id: 'me', username: 'eu', display_name: 'Eu Mesma' }];
    window.__DB.friendships = [
      { id: 4, requester_id: 'me', addressee_id: 'bia', status: 'accepted' },
      { id: 5, requester_id: 'caio', addressee_id: 'me', status: 'accepted' },
      { id: 6, requester_id: 'dani', addressee_id: 'me', status: 'pending' },
    ];
    window.__DB.earned_badges = [
      { user_id: 'me', language_app_key: 'frances', badge_id: 'streak_7' },
      { user_id: 'me', language_app_key: 'frances', badge_id: 'multitasker' },
      { user_id: 'me', language_app_key: 'mandarim', badge_id: 'unit_1' },
      { user_id: 'me', language_app_key: 'frances', badge_id: 'podium.1' },
    ];
    // Pódio (092): 2 semanas em 1º; o nível 1 já estava gravado, então abrir o site não comemora de novo.
    window.__PODIUM = 2;
    window.__RPC.my_podium_weeks = () => window.__PODIUM;
    const days = ['2026-10-03', '2026-10-04', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-10', '2026-10-12', '2026-10-13'];
    STATE.activityLog = Object.fromEntries(days.map(d => [d, 1]));
    STATE.totalReviews = 120; STATE.xp = 2100; STATE.streak = 2; STATE.totalAudioPlays = 40;
    STATE.everUsedSpeedReview = true; STATE.everUsedMatchGame = false;
    const half = Math.ceil(UNITS.length / 2);
    UNITS.slice(0, half).forEach((u, i) => { const p = STATE.unitProgress[u.id]; p.completed = true; p.completedVia = i === 1 ? 'skip_test' : 'lessons'; });
    if (lang === 'fr'){
      STATE.completedChallenges = Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['c' + i, true]));
      STATE.dictations = { d1: { bestScore: 95, attempts: 1 }, d2: { bestScore: 92, attempts: 2 } };
    }
    PROFILE_PRIVATE_CACHE = null;
    seedEarnedBadges();
  }, lang);
  await page.waitForFunction(() => typeof FRIENDS_ACCEPTED_COUNT !== 'undefined' && FRIENDS_ACCEPTED_COUNT !== null, null, { timeout: 5000 });
  await page.waitForTimeout(150);
}

const levelOf = (page, id) => page.evaluate((id) => (badgeTrackViews(STATE).find(v => v.id === id) || {}).level, id);

async function runFr(browser, port){
  const { page, errors, ctx } = await bootPage(browser, 'fr', port);
  await setup(page, 'fr');

  // 1. Níveis calculados (métrica + conquistas antigas)
  check('fr: Primeiro Passo (8 dias) nível 2', await levelOf(page, 'days') === 2);
  check('fr: Revisão (120) nível 2', await levelOf(page, 'review') === 2);
  check('fr: Sequência vem da antiga streak_7 (nível 2)', await levelOf(page, 'streak') === 2);
  check('fr: XP 2.100 nível 3', await levelOf(page, 'xp') === 3);
  check('fr: Nível A1 (metade, com unidade pulada) nível 2', await levelOf(page, 'course1') === 2);
  check('fr: Fim de Semana (sáb 3 + dom 4) nível 1', await levelOf(page, 'weekend') === 1);
  check('fr: Explorar (revisão, rápida, desafios, ditado = 4) nível 1', await levelOf(page, 'explore') === 1);
  check('fr: Desafios 12 concluídos (lista ainda não carregada) nível 1', await levelOf(page, 'challenge') === 1);
  check('fr: Ditado 2 (90%+) nível 0', await levelOf(page, 'dictation') === 0);
  check('fr: Amigos (2 aceitos, pendente não conta) nível 1', await levelOf(page, 'friends') === 1);
  await page.waitForFunction(() => PODIUM_WEEKS !== null, null, { timeout: 5000 });
  check('fr: Pódio (2 semanas) nível 1', await levelOf(page, 'podium') === 1);
  check('fr: unit_1 do zh não vale no fr (curso)', await levelOf(page, 'course1') === 2);
  const ids = await page.evaluate(() => [...earnedBadgeIds]);
  check('fr: earnedBadgeIds tem review.1 e review.2', ids.includes('review.1') && ids.includes('review.2'));
  check('fr: earnedBadgeIds tem streak.2 (da antiga)', ids.includes('streak.2'));
  check('fr: earnedBadgeIds tem friends.1', ids.includes('friends.1'));
  check('fr: nada comemorado ao semear', await page.evaluate(() => !document.querySelector('.badge-unlock-toast')));

  // 2. Gravação: níveis já existentes entram com data no passado, sem sobrescrever
  const ups = await page.evaluate(() => window.__upserts.filter(u => u.table === 'earned_badges'));
  const rows = ups.flatMap(u => u.row);
  check('fr: semear grava com earned_at no passado', rows.some(r => r.badge_id === 'review.2' && r.earned_at === '2026-10-01T00:00:00Z'));
  check('fr: semear usa ignoreDuplicates', ups.every(u => u.opts && u.opts.ignoreDuplicates));

  // 3. Tela Progresso
  await page.evaluate(() => switchTab('progress'));
  await page.waitForTimeout(300);
  const cards = await page.$$eval('#badge-grid .track-card', els => els.map(e => e.dataset.track));
  check('fr: 15 trilhas no Progresso (inclui Ditado, Desafios e Pódio)', cards.length === 15, cards);
  check('fr: clássica Multitarefa aparece', await page.$('#badge-grid [data-track-chip="multitasker"]') !== null);
  const reviewCard = await page.$eval('#badge-grid .track-card[data-track="review"]', e => e.innerText);
  check('fr: cartão Revisão mostra nível, nome neutro e barra', /Nível 2 de 4/.test(reviewCard) && /Revisor\(a\) Júnior/.test(reviewCard) && /120\/200/.test(reviewCard) && /Faça 200 revisões/.test(reviewCard), reviewCard);
  const courseCard = await page.$eval('#badge-grid .track-card[data-track="course1"]', e => e.innerText);
  check('fr: cartão Nível A1 cita o A1', /Nível A1/.test(courseCard) && /Metade do A1/.test(courseCard), courseCard);
  check('fr: trilha bloqueada mostra cadeado', await page.$('#badge-grid .track-card[data-track="ear"].is-locked .track-medal-lock') !== null);
  check('fr: contador de níveis', /de \d+ níveis/.test(await page.$eval('#badge-grid-count', e => e.textContent)));
  const imgsOk = await page.$$eval('#badge-grid img.badge-ico', els => els.length > 0 && els.every(i => i.complete && i.naturalWidth > 0));
  check('fr: ícones do Fluent carregam', imgsOk);
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'fr-progresso-claro.png'), fullPage: false, clip: await page.$eval('#badge-grid', e => { const r = e.getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 60), width: 1280, height: Math.min(900, r.height + 80) }; }) });

  // 4. Subir de nível comemora com o nome novo, no gênero do perfil
  await page.evaluate(() => { PROFILE_PRIVATE_CACHE = { gender: 'feminine' }; STATE.totalReviews = 205; checkAndCelebrateBadges(); });
  await page.waitForSelector('.badge-unlock-toast', { timeout: 3000 });
  const toast = await page.$eval('.badge-unlock-toast', e => e.innerText);
  check('fr: comemoração "Subiu de nível!" com Revisora Sênior', /Subiu de nível!/i.test(toast) && /Revisora Sênior/.test(toast), toast);
  const notif = await page.evaluate(() => window.__rpc.filter(r => /notif|event/i.test(r.name)).length);
  const lastUp = await page.evaluate(() => window.__upserts.filter(u => u.table === 'earned_badges').pop());
  check('fr: nível novo gravado com a hora real (sem earned_at)', lastUp && lastUp.row.some(r => r.badge_id === 'review.3' && !r.earned_at) && !(lastUp.opts && lastUp.opts.ignoreDuplicates), lastUp);
  await page.evaluate(() => { PROFILE_PRIVATE_CACHE = { gender: 'masculine' }; });
  check('fr: masculino vira Revisor Sênior', await page.evaluate(() => badgeTrackViews(STATE).find(v => v.id === 'review').name) === 'Revisor Sênior');
  await page.evaluate(() => { PROFILE_PRIVATE_CACHE = { gender: 'other' }; });
  check('fr: outro vira Revisor(a) Sênior', await page.evaluate(() => badgeTrackViews(STATE).find(v => v.id === 'review').name) === 'Revisor(a) Sênior');
  // Pódio: semana fechada em 1º sobe o nível e comemora (nome no gênero do perfil).
  await page.evaluate(async () => { document.querySelectorAll('.badge-unlock-toast').forEach(e => e.remove()); PROFILE_PRIVATE_CACHE = { gender: 'feminine' }; window.__PODIUM = 5; await loadPodiumWeeks(); });
  await page.waitForFunction(() => [...document.querySelectorAll('.badge-unlock-toast')].some(e => /Dona da Semana/.test(e.innerText)), null, { timeout: 15000 });
  check('fr: Pódio 5 semanas comemora "Dona da Semana"', true);
  await page.evaluate(() => { PROFILE_PRIVATE_CACHE = { gender: 'other' }; });

  // 5. Perfil: vitrine com uma medalha por trilha ganha
  await page.evaluate(() => switchTab('profile'));
  await page.waitForSelector('.profile-track-showcase', { timeout: 5000 });
  const chips = await page.$$eval('.profile-track-showcase .track-chip', els => els.map(e => e.dataset.trackChip));
  check('fr: perfil mostra trilhas ganhas + clássica', chips.includes('review') && chips.includes('multitasker') && !chips.includes('ear'), chips);

  // 6. Atividade dos amigos: só ouro/máximo, conquista de curso só no idioma certo, Parabéns manda kind=badge
  await page.evaluate(() => {
    const now = new Date().toISOString();
    window.__RPC.friends_streak_feed = () => [];
    window.__RPC.my_received_congrats = () => [{ id: 9, from_user: 'bia', username: 'ubia', display_name: 'Bia Lima', target_kind: 'badge', target_ref: 'review.4', reaction: '🎉', created_at: now, thanked: false }];
    window.__RPC.friends_badge_feed = () => [
      { user_id: 'bia', username: 'ubia', display_name: 'Bia Lima', badge_id: 'review.3', langs: ['frances'], earned_at: now, my_reaction: null, my_congrats_thanked: false, total_reactions: 1 },
      { user_id: 'caio', username: 'ucaio', display_name: 'Caio Reis', badge_id: 'review.1', langs: ['frances'], earned_at: now, my_reaction: null, my_congrats_thanked: false, total_reactions: 0 },
      { user_id: 'caio', username: 'ucaio', display_name: 'Caio Reis', badge_id: 'course1.3', langs: ['mandarim'], earned_at: now, my_reaction: null, my_congrats_thanked: false, total_reactions: 0 },
      { user_id: 'caio', username: 'ucaio', display_name: 'Caio Reis', badge_id: 'friends.3', langs: ['frances'], earned_at: now, my_reaction: null, my_congrats_thanked: false, total_reactions: 0 },
      { user_id: 'bia', username: 'ubia', display_name: 'Bia Lima', badge_id: 'comeback.1', langs: ['frances'], earned_at: now, my_reaction: '👏', my_congrats_thanked: true, total_reactions: 2 },
    ];
    window.__RPC.congratulate_friend = (a) => ({ ok: true, status: 'sent' });
  });
  await page.evaluate(() => switchTab('profile'));
  await page.click('#profile-content .profile-subnav [data-tab="friends"]');
  await page.waitForSelector('#friends-activity .friends-activity-row.is-badge', { timeout: 8000 });
  await page.waitForTimeout(200);
  const feed = await page.$$eval('#friends-activity .friends-activity-row.is-badge', els => els.map(e => ({ ref: e.dataset.cheerRef || null, text: e.innerText })));
  check('fr: feed mostra só ouro/máximo (review.3, friends.3, comeback.1)', feed.length === 3, feed);
  check('fr: bronze (review.1) não aparece', !feed.some(f => /Aprendiz/.test(f.text)));
  check('fr: conquista de curso do zh não aparece no fr', !feed.some(f => /HSK|Completo/.test(f.text)));
  check('fr: nome neutro do amigo (Revisor(a) Sênior)', feed.some(f => /Bia Lima chegou a Revisor\(a\) Sênior/.test(f.text)), feed);
  check('fr: Amigos sem botão de Parabéns', feed.some(f => /Galera de Estudo/.test(f.text) && f.ref === null));
  check('fr: comeback com reação já dada', feed.some(f => /De Volta ao Jogo/.test(f.text) && f.ref === 'comeback.1'));
  await page.click('#friends-activity [data-cheer-ref="review.3"] [data-cheer-open]');
  await page.click('#friends-activity [data-cheer-ref="review.3"] [data-cheer-reaction="💪"]');
  await page.waitForTimeout(200);
  const call = await page.evaluate(() => window.__rpc.filter(r => r.name === 'congratulate_friend').pop());
  check('fr: Parabéns manda p_kind badge e o id do nível', call && call.args.p_kind === 'badge' && call.args.p_ref === 'review.3' && call.args.p_reaction === '💪', call);
  const rec = await page.$eval('#friends-received', e => e.innerText).catch(() => '');
  check('fr: parabéns recebido por conquista mostra o nome no meu gênero', /Bia Lima reagiu 🎉 à sua conquista Mestre da Revisão/.test(rec), rec);

  // 7. Perfil público de outra pessoa: uma medalha por trilha, ids antigos viram nível
  const pub = await page.evaluate(() => summarizeBadgeIds(['streak_3', 'streak.4', 'xp_100', 'unit_all', 'multitasker', 'founder']).map(d => d.id));
  check('fr: público agrupa por trilha (maior nível) e ignora especiais', JSON.stringify(pub) === JSON.stringify(['streak.4', 'xp_100', 'unit_all', 'multitasker']), pub);

  check('fr: sem erros de página', errors.length === 0, errors);
  await ctx.close();
}

async function runZh(browser, port){
  const { page, errors, ctx } = await bootPage(browser, 'zh', port);
  await setup(page, 'zh');
  const views = await page.evaluate(() => badgeTrackViews(STATE).map(v => [v.id, v.goals, v.level]));
  const by = Object.fromEntries(views.map(([id, g, l]) => [id, { g, l }]));
  check('zh: sem Ditado e sem Desafios', !by.dictation && !by.challenge, Object.keys(by));
  check('zh: Explorar 3·4·5', JSON.stringify(by.explore && by.explore.g) === '[3,4,5]', by.explore);
  check('zh: Gabaritou 1·5·10·18', JSON.stringify(by.aced && by.aced.g) === '[1,5,10,18]', by.aced);
  check('zh: unit_1 antigo vale no zh', by.course1 && by.course1.l >= 1);
  check('zh: streak_7 (antiga do fr, da conta) vale no zh', by.streak && by.streak.l === 2);
  check('zh: multitarefa do fr não aparece no zh', await page.evaluate(() => !BADGES.find(b => b.id === 'multitasker').check(STATE)));
  await page.evaluate(() => switchTab('progress'));
  await page.waitForTimeout(300);
  const courseCard = await page.$eval('#badge-grid .track-card[data-track="course1"]', e => e.innerText);
  check('zh: cartão cita HSK 1', /Nível HSK 1/.test(courseCard) && /Metade do HSK 1/.test(courseCard), courseCard);
  check('zh: 13 trilhas (com Pódio)', (await page.$$('#badge-grid .track-card')).length === 13);
  check('zh: sem erros de página', errors.length === 0, errors);
  await ctx.close();
}

// Claro/escuro e celular: sem rolagem lateral, prints para a validação visual.
async function runVisual(browser, port){
  for (const lang of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]){
    const { page, errors, ctx } = await bootPage(browser, lang, port, theme, vp);
    await setup(page, lang);
    await page.evaluate(() => switchTab('progress'));
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${lang} ${theme} ${vp.width}: sem rolagem lateral`, over <= 0, over);
    const tag = `${lang}-${theme}-${vp.width}`;
    if (SHOTS){
      await page.$eval('#badge-grid', e => e.scrollIntoView());
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(SHOTS, `progresso-${tag}.png`) });
      await page.evaluate(() => switchTab('profile'));
      await page.waitForSelector('.profile-track-showcase', { timeout: 5000 });
      await page.$eval('.profile-track-showcase', e => e.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(SHOTS, `perfil-${tag}.png`) });
    }
    check(`${tag}: sem erros`, errors.length === 0, errors);
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
  try {
    await runFr(browser, port);
    await runZh(browser, port);
    await runVisual(browser, port);
  } catch (e) { failed++; console.log('  ERRO:', e.message); }
  await browser.close(); server.close();
  console.log(`Conquistas (navegador): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
