// Janelas do topo (sequência 🔥 e XP da semana ⭐), decisões da dona de 2026-10-30 (docs/janelas-topo-proposta.md).
// Playwright/Chromium real, fr e zh, arquivos de PRODUÇÃO; só o Supabase é trocado por um stub (linha de progresso,
// weekly_xp, friends_duo_state, profile_cards e friendships). Data fixa: quarta-feira 28/10/2026, 11h (Brasília).
// Cobre:
//  - sequência nos 3 estados (viva e feita hoje / viva, hoje ainda não / zerada "Hoje pode ser o dia 1", sem número);
//  - semana de segunda a domingo na janela do topo E na janela que aparece depois da lição;
//  - recorde: nasce do histórico, recorde guardado na conta (_account.bestStreak) aparece, e é gravado/atualizado no save;
//  - cartão de amigos com sequências ativas, com amigos sem sequência e sem amigos ("Chamar amigos" -> aba Amigos com o
//    convite em foco);
//  - janela do XP: frase "+N XP a mais que na semana passada" só quando a atual é maior; "Ver ranking" abre o Ranking;
//  - mouse, clique, teclado (Enter, Tab, Esc), toque, clique fora; uma janela por vez; não abre durante a lição;
//  - site em inglês sem português nas janelas; 44px no celular; sem rolagem horizontal; 0 erros de página.
// Rodar: node tests/janelas-topo/test_playwright.js   (SHOTS=dir salva capturas fr/zh x claro/escuro x 390/1280)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const NOW = '2026-10-28T11:00:00-03:00'; // quarta
function range(a, b){ const o = {}; const d = new Date(a + 'T12:00:00Z'), e = new Date(b + 'T12:00:00Z'); for (; d <= e; d.setUTCDate(d.getUTCDate() + 1)) o[d.toISOString().slice(0, 10)] = 3; return o; }
const FRIENDS = [{ user_id: 'f-bia', joint_streak: 12 }, { user_id: 'f-leo', joint_streak: 3 }, { user_id: 'f-ana', joint_streak: 0 }];
const CARDS = [{ user_id: 'f-bia', display_name: 'Bia', username: 'bia' }, { user_id: 'f-leo', display_name: 'Léo', username: 'leo' }];
const STATES = {
  ativa:    { streak: 5, last: '2026-10-28', log: Object.assign(range('2026-10-05', '2026-10-13'), range('2026-10-24', '2026-10-28')), duo: FRIENDS },
  pendente: { streak: 4, last: '2026-10-27', log: Object.assign(range('2026-10-05', '2026-10-13'), range('2026-10-24', '2026-10-27')), duo: [{ user_id: 'f-bia', joint_streak: 11 }] },
  zerada:   { streak: 5, last: '2026-10-24', log: Object.assign(range('2026-10-05', '2026-10-13'), range('2026-10-20', '2026-10-24')), duo: [] },
};
// XP: [semana atual (idioma da página), outro idioma na atual, passada, 2 atrás, 3 atrás]
const XP_BETTER = [40, 25, 40, 35, 210];   // atual 65 > passada 40 -> "+25"
const XP_WORSE = [40, 25, 90, 35, 210];    // atual 65 < passada 90 -> sem frase

const STUB = (spec) => `(function(){
  window.__SPEC = ${JSON.stringify(spec)};
  window.__upserts = []; window.__rpcs = [];
  function monday(ago){ const d = new Date(); const diff = d.getDay() === 0 ? -6 : 1 - d.getDay(); const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff - 7 * ago, 12);
    return m.getFullYear() + '-' + String(m.getMonth()+1).padStart(2,'0') + '-' + String(m.getDate()).padStart(2,'0'); }
  function row(){
    const S = window.__SPEC;
    const first = (typeof UNITS !== 'undefined' && UNITS[0]) ? UNITS[0].id : 1;
    const b = { unitProgress: { [first]: { unlocked: true, started: true, completed: false, lessonIdx: 0, lessonMisses: {} } },
      xp: 1840, streak: S.streak, lastStudyDay: S.last, activityLog: S.log, welcome: { a: '2026-10-01', b: '2026-10-01' },
      periodXp: { weekStart: monday(0), amount: S.xp[0] } };
    const out = { _meta: { uiLanguage: S.lang }, [S.blockKey]: b };
    if (S.account) out._account = S.account;
    return out;
  }
  const mk = (table) => { let single = false; let op = 'select'; let payload = null; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => {
        const S = window.__SPEC;
        let data = single ? null : [];
        if (table === 'progress' && op === 'upsert'){ window.__upserts.push(payload); return Promise.resolve({ data: null, error: null }).then(ok, ko); }
        if (table === 'progress' && single) data = { data: row() };
        if (table === 'weekly_xp'){ const pl = (typeof APP_KEY !== 'undefined') ? APP_KEY : 'x';
          data = [{ week_start: monday(0), language_app_key: pl, amount: S.xp[0] }, { week_start: monday(0), language_app_key: 'outro', amount: S.xp[1] },
            { week_start: monday(1), language_app_key: pl, amount: S.xp[2] }, { week_start: monday(2), language_app_key: pl, amount: S.xp[3] },
            { week_start: monday(3), language_app_key: 'outro', amount: S.xp[4] }]; }
        return Promise.resolve({ data, error: null }).then(ok, ko);
      };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      if (p === 'upsert') return (v) => { op = 'upsert'; payload = v; return b; };
      return () => b; } }); return b; };
  const user = { id: 'u-jt', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana Souza' }, created_at: new Date().toISOString() };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'x' } } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name, args) => { window.__rpcs.push(name); const S = window.__SPEC;
      if (name === 'friends_duo_state') return { data: S.duo, error: null };
      if (name === 'profile_cards') return { data: S.cards.filter(c => (args.p_ids || []).includes(c.user_id)), error: null };
      return { data: null, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;

let pass = 0, fail = 0;
function check(label, cond, extra){ if (cond) pass++; else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra) : ''); } }
const BLOCK = { fr: 'frances', zh: 'mandarim' };
const PT_WORDS = /\b(semana|semanas|Esta|passada|Hoje|dias|seguidos|Maior|sequência|amigos|Chamar|Ver|ativas?|seg|ter|qua|qui|sex|sáb|dom|Carregando|somando|cursos)\b/;

async function openApp(browser, base, app, o){
  const mobile = o.width < 600;
  const ctx = await browser.newContext({ viewport: { width: o.width, height: mobile ? 844 : 860 }, deviceScaleFactor: o.dpr || 1, serviceWorkers: 'block',
    locale: o.lang, timezoneId: 'America/Sao_Paulo', hasTouch: mobile, isMobile: mobile });
  await ctx.addInitScript(({ lang }) => { try { localStorage.setItem('ui-language', lang); localStorage.setItem('ui-language-gate', lang); } catch (e) {} }, { lang: o.lang });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.clock.setFixedTime(new Date(NOW));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  const st = STATES[o.state || 'ativa'];
  const spec = { blockKey: o.lang === 'en' ? BLOCK[app] + '@en' : BLOCK[app], lang: o.lang, streak: st.streak, last: st.last, log: st.log,
    duo: o.duo || st.duo, cards: CARDS, xp: o.xp || XP_BETTER, account: o.account || null };
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB(spec) }));
  await page.goto(`${base}/${app}/index.html`);
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id && progressLoadedOk, null, { timeout: 25000 });
  await page.waitForTimeout(900);
  if (o.theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  else await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  return { ctx, page, errs };
}

// Troca o estado sem recarregar (mesmos campos que o load preenche).
async function setState(page, name, extra){
  const st = STATES[name];
  await page.evaluate(({ st, extra }) => {
    STATE.streak = st.streak; STATE.lastStudyDay = st.last; STATE.activityLog = Object.assign({}, st.log);
    if (extra && 'bestStreak' in extra) STATE.bestStreak = extra.bestStreak;
    window.__SPEC.duo = (extra && extra.duo) || st.duo;
    TopPop.closeAll(); TopPop._resetFriends(); renderTopbarStats();
  }, { st, extra: extra || null });
  await page.waitForTimeout(250);
}

const popInfo = (page, id) => page.evaluate((id) => {
  const pop = document.getElementById(id);
  const btn = document.getElementById(id === 'streak-pop' ? 'streak-btn' : 'xp-week-btn');
  const open = !!pop && !pop.hidden && pop.getClientRects().length > 0;
  const r = pop && open ? pop.getBoundingClientRect() : null;
  const q = (s) => pop ? pop.querySelector(s) : null;
  return {
    open, expanded: btn.getAttribute('aria-expanded'), role: pop && pop.getAttribute('role'), labelled: pop && !!document.getElementById(pop.getAttribute('aria-labelledby') || 'x'),
    text: pop ? pop.innerText.replace(/\s+/g, ' ').trim() : '',
    title: q('#' + id + '-title') ? q('#' + id + '-title').innerText.replace(/\s+/g, ' ').trim() : '',
    sub: q('.tpop-sub') ? q('.tpop-sub').innerText.trim() : '',
    days: pop ? [...pop.querySelectorAll('.tpop-day')].map(d => ({ key: d.dataset.day, label: d.querySelector('.tpop-dlabel').innerText, done: d.classList.contains('is-done'), today: d.classList.contains('is-today'), future: d.classList.contains('is-future'), cur: d.getAttribute('aria-current') })) : [],
    weekCount: q('.tpop-sec-aside') ? q('.tpop-sec-aside').innerText : '',
    best: q('.tpop-line') ? q('.tpop-line').dataset.best : null, bestText: q('.tpop-line') ? q('.tpop-line').innerText.replace(/\s+/g, ' ') : '',
    chip: !!q('.tpop-chip'),
    friendsSub: q('.tpop-card-sub') ? q('.tpop-card-sub').innerText : '', friendsState: q('[data-friends-state]') ? q('[data-friends-state]').dataset.friendsState : '',
    action: q('[data-tpop-action]') ? { a: q('[data-tpop-action]').dataset.tpopAction, text: q('[data-tpop-action]').innerText, h: Math.round(q('[data-tpop-action]').getBoundingClientRect().height) } : null,
    better: q('.tpop-better') ? q('.tpop-better').innerText : '',
    bars: pop ? [...pop.querySelectorAll('.tpop-bar')].map(b => ({ val: b.querySelector('.tpop-bar-val').innerText, label: b.querySelector('.tpop-bar-label').innerText, cur: b.getAttribute('aria-current') })) : [],
    artOff: !!q('.tpop-art.is-off'), artWait: !!q('.tpop-art.is-wait'),
    headBg: q('.tpop-head') ? getComputedStyle(q('.tpop-head')).backgroundColor : '', headColor: q('.tpop-head') ? getComputedStyle(q('.tpop-head')).color : '',
    focusIn: !!pop && pop.contains(document.activeElement), focusOnBtn: document.activeElement === btn,
    focusAction: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.tpopAction || '' : '',
    inView: r ? (r.left >= 0 && r.right <= document.documentElement.clientWidth + 0.5 && r.top >= 0) : false,
    rect: r ? { l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width) } : null,
  };
}, id);

async function shotPop(page, name, id){
  if (!SHOTS) return;
  const r = await page.evaluate((id) => { const p = document.getElementById(id); return p && !p.hidden ? p.getBoundingClientRect().toJSON() : null; }, id);
  const vp = page.viewportSize();
  const h = r ? Math.min(Math.ceil(r.bottom) + 24, vp.height) : vp.height;
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), clip: { x: 0, y: 0, width: vp.width, height: h } });
}

const EXPECT = {
  'pt-BR': { days: 'seg,ter,qua,qui,sex,sáb,dom', ativa: '5 dias seguidos', ativaSub: 'Hoje já contou. Amanhã vem o dia 6!', pendSub: 'Uma lição ou revisão hoje e são 5 dias.',
    zero: 'Hoje pode ser o dia 1', zeroSub: 'Uma lição ou revisão já começa uma sequência nova.', count3: '3 de 7 dias', best9: '9 dias',
    many: '2 ativas. A maior: 12 dias com Bia', one: '1 ativa: 11 dias com Bia', none: 'Estudem no mesmo dia e a sequência de vocês começa.',
    noFriends: 'Estudar junto com alguém ajuda a manter o ritmo.', see: 'Ver amigos', invite: 'Chamar amigos', better: '+25 XP a mais que na semana passada', ranking: 'Ver ranking',
    aria5: 'Sequência: 5 dias seguidos. Ver detalhes', ariaZero: 'Sequência: hoje pode ser o dia 1. Ver detalhes' },
  en: { days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', ativa: '5 day streak', ativaSub: 'Today counts. Day 6 is tomorrow!', pendSub: 'One lesson or review today makes it 5 days.',
    zero: 'Today can be day 1', zeroSub: 'One lesson or review starts a new streak.', count3: '3 of 7 days', best9: '9 days',
    many: '2 active. Longest: 12 days with Bia', one: '1 active: 11 days with Bia', none: 'Study on the same day and your streak together begins.',
    noFriends: 'Studying with someone helps you keep the rhythm.', see: 'See friends', invite: 'Invite friends', better: '+25 XP more than last week', ranking: 'See leaderboard',
    aria5: 'Streak: 5 days in a row. See details', ariaZero: 'Streak: today can be day 1. See details' },
};

async function openStreak(page, mobile){
  if (mobile) await page.tap('#streak-btn'); else await page.click('#streak-btn');
  await page.waitForTimeout(350);
}
async function openXp(page, mobile){
  if (mobile) await page.tap('#xp-week-btn'); else await page.click('#xp-week-btn');
  await page.waitForTimeout(350);
}

// ---------- comportamento completo (fr e zh, pt-BR, claro, 1280 e 390) e inglês ----------
async function behaviour(browser, base, app, o){
  const tag = `${app}/${o.lang}/${o.width}`;
  const mobile = o.width < 600;
  const E = EXPECT[o.lang];
  const { ctx, page, errs } = await openApp(browser, base, app, Object.assign({ state: 'ativa', theme: 'light' }, o));
  // Botão 🔥
  const btn = await page.evaluate(() => { const b = document.getElementById('streak-btn'); const r = b.getBoundingClientRect(); return { tag: b.tagName, type: b.type, popup: b.getAttribute('aria-haspopup'), controls: b.getAttribute('aria-controls'), label: b.getAttribute('aria-label'), h: Math.round(r.height), pill: !!b.querySelector('.pill.streak #streak-count'), count: document.getElementById('streak-count').textContent }; });
  check(`${tag}: 🔥 é <button> com aria-haspopup/aria-controls`, btn.tag === 'BUTTON' && btn.type === 'button' && btn.popup === 'dialog' && btn.controls === 'streak-pop' && btn.pill, btn);
  check(`${tag}: rótulo do 🔥 diz o número`, btn.label === E.aria5, btn.label);
  if (mobile) check(`${tag}: 🔥 com 44px no celular`, btn.h >= 44, btn.h);

  // Estado 1: viva e feita hoje
  await openStreak(page, mobile);
  let s = await popInfo(page, 'streak-pop');
  check(`${tag}: ${mobile ? 'toque' : 'clique'} abre a janela da sequência`, s.open && s.expanded === 'true' && s.role === 'dialog' && s.labelled, s);
  check(`${tag}: ativa: "${E.ativa}" + "${E.ativaSub}"`, s.title === E.ativa && s.sub === E.ativaSub, [s.title, s.sub]);
  check(`${tag}: ativa: chama acesa`, !s.artOff && !s.artWait);
  check(`${tag}: semana seg a dom`, s.days.map(d => d.label).join() === E.days && s.days[0].key === '2026-10-26' && s.days[6].key === '2026-11-01', s.days.map(d => d.label + d.key));
  check(`${tag}: semana: seg/ter/qua estudados, quarta = hoje (aria-current), qui a dom futuros`, s.days.map(d => d.done ? 1 : 0).join('') === '1110000' && s.days[2].today && s.days[2].cur === 'date' && s.days.filter(d => d.future).length === 4, s.days);
  check(`${tag}: "${E.count3}"`, s.weekCount === E.count3, s.weekCount);
  check(`${tag}: maior sequência = 9 (histórico), sem selo "é agora"`, s.best === '9' && s.bestText.includes(E.best9) && !s.chip, s.bestText);
  await page.waitForFunction(() => { const x = document.querySelector('#streak-pop .tpop-card-sub'); return x && /Bia/.test(x.innerText); }, null, { timeout: 4000 }).catch(() => {});
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: amigos: "${E.many}" e "${E.see}"`, s.friendsSub === E.many && s.action && s.action.a === 'friends' && s.action.text === E.see, [s.friendsSub, s.action]);
  if (mobile) check(`${tag}: "${E.see}" com 44px no celular`, s.action && s.action.h >= 44, s.action);
  check(`${tag}: cabeçalho na cor da marca com texto branco`, s.headBg !== 'rgba(0, 0, 0, 0)' && /255, 255, 255/.test(s.headColor), [s.headBg, s.headColor]);
  check(`${tag}: janela dentro da tela`, s.inView, s.rect);
  if (mobile) check(`${tag}: janela com 16px de margem no celular`, s.rect && s.rect.l === 16 && s.rect.w === o.width - 32, s.rect);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(`${tag}: sem rolagem horizontal`, !overflow);
  if (o.lang === 'en') check(`${tag}: janela da sequência sem português`, !PT_WORDS.test(s.text), s.text.match(PT_WORDS));

  // Uma janela por vez
  await openXp(page, mobile);
  let x = await popInfo(page, 'xp-week-pop');
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: abrir o XP fecha a sequência (uma por vez)`, x.open && !s.open && s.expanded === 'false', [x.open, s.open]);
  await page.waitForFunction(() => !!document.querySelector('#xp-week-pop .tpop-better'), null, { timeout: 4000 }).catch(() => {});
  x = await popInfo(page, 'xp-week-pop');
  check(`${tag}: XP: cabeçalho 65`, /^65\b/.test(x.title), x.title);
  check(`${tag}: XP: frase "${E.better}"`, x.better === E.better, x.better);
  check(`${tag}: XP: 4 colunas, a mais antiga à esquerda e esta semana à direita (aria-current)`, x.bars.length === 4 && x.bars[3].cur === 'date' && x.bars.slice(0, 3).every(b => !b.cur) &&
    x.bars.map(b => b.val.replace(/\D/g, '')).join() === '210,35,40,65', x.bars);
  check(`${tag}: XP: botão "${E.ranking}"`, x.action && x.action.a === 'ranking' && x.action.text === E.ranking, x.action);
  check(`${tag}: XP: total do curso`, /1840/.test(x.text));
  if (o.lang === 'en') check(`${tag}: janela do XP sem português`, !PT_WORDS.test(x.text), x.text.match(PT_WORDS));
  await page.evaluate(() => { const b = document.querySelector('#xp-week-pop [data-tpop-action="ranking"]'); b.scrollIntoView({ block: 'nearest' }); });
  await page.click('#xp-week-pop [data-tpop-action="ranking"]');
  await page.waitForTimeout(500);
  const tab = await page.evaluate(() => document.getElementById('app').dataset.activeTab);
  x = await popInfo(page, 'xp-week-pop');
  check(`${tag}: "${E.ranking}" abre o Ranking e fecha a janela`, tab === 'leaderboard' && !x.open, tab);
  await page.evaluate(() => switchTab('path'));
  await page.waitForTimeout(300);

  // Frase só quando melhor
  await page.evaluate(() => { window.__SPEC.xp = [40, 25, 90, 35, 210]; XpSemana._reset(); return XpSemana.refresh(true); });
  await page.waitForTimeout(300);
  await openXp(page, mobile);
  x = await popInfo(page, 'xp-week-pop');
  check(`${tag}: XP: semana atual menor que a passada -> sem frase`, x.open && !x.better && x.bars.map(b => b.val.replace(/\D/g, '')).join() === '210,35,90,65', [x.better, x.bars]);
  await page.evaluate(() => { window.__SPEC.xp = [40, 0, 40, 35, 210]; XpSemana._reset(); return XpSemana.refresh(true); });
  await page.waitForTimeout(300);
  x = await popInfo(page, 'xp-week-pop');
  check(`${tag}: XP: semana igual à passada -> sem frase`, !x.better, x.better);
  await page.evaluate(() => { window.__SPEC.xp = [40, 25, 40, 35, 210]; XpSemana._reset(); return XpSemana.refresh(true); });
  await page.waitForTimeout(300);
  if (mobile){ await page.tap('#xp-week-btn'); await page.waitForTimeout(250); x = await popInfo(page, 'xp-week-pop'); check(`${tag}: tocar de novo fecha`, !x.open && x.expanded === 'false'); }
  else { await page.mouse.click(30, 820); await page.waitForTimeout(250); x = await popInfo(page, 'xp-week-pop'); check(`${tag}: clique fora fecha`, !x.open); }

  // Estado 2: viva, hoje ainda não
  await setState(page, 'pendente');
  await openStreak(page, mobile);
  await page.waitForFunction(() => { const x = document.querySelector('#streak-pop .tpop-card-sub'); return x && /Bia/.test(x.innerText); }, null, { timeout: 4000 }).catch(() => {});
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: pendente: "4" + "${E.pendSub}", chama meio apagada`, /^4\b/.test(s.title) && s.sub === E.pendSub && s.artWait, [s.title, s.sub]);
  check(`${tag}: pendente: hoje sem ✓ e com aria-current`, !s.days[2].done && s.days[2].today && s.days[2].cur === 'date');
  check(`${tag}: pendente: "${E.one}"`, s.friendsSub === E.one, s.friendsSub);
  if (mobile){ await page.touchscreen.tap(30, 820); } else { await page.keyboard.press('Escape'); }
  await page.waitForTimeout(250);

  // Estado 3: zerada, com amigos sem sequência juntos
  await setState(page, 'zerada', { duo: [{ user_id: 'f-ana', joint_streak: 0 }] });
  const z = await page.evaluate(() => ({ label: document.getElementById('streak-btn').getAttribute('aria-label'), count: document.getElementById('streak-count').textContent }));
  check(`${tag}: zerada: rótulo do 🔥 sem número`, z.label === E.ariaZero, z);
  await openStreak(page, mobile);
  await page.waitForFunction(() => { const x = document.querySelector('#streak-pop [data-friends-state]'); return x && !/\.\.\./.test(x.innerText); }, null, { timeout: 4000 }).catch(() => {});
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: zerada: "${E.zero}" (sem número) + "${E.zeroSub}"`, s.title === E.zero && !/^\d/.test(s.title) && s.sub === E.zeroSub && s.artOff, [s.title, s.sub]);
  check(`${tag}: zerada: amigos sem sequência juntos: "${E.none}" e "${E.see}"`, s.friendsSub === E.none && s.action.a === 'friends', [s.friendsSub, s.action]);
  check(`${tag}: zerada: recorde 9 continua`, s.best === '9');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Sem amigos: "Chamar amigos" -> aba Amigos com o convite em foco
  await setState(page, 'zerada', { duo: [] });
  await openStreak(page, mobile);
  await page.waitForFunction(() => { const x = document.querySelector('#streak-pop [data-friends-state="none"]'); return !!x; }, null, { timeout: 4000 }).catch(() => {});
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: sem amigos: "${E.noFriends}" e "${E.invite}"`, s.friendsSub === E.noFriends && s.friendsState === 'none' && s.action.a === 'invite' && s.action.text === E.invite, [s.friendsSub, s.action]);
  await page.evaluate(() => document.querySelector('#streak-pop [data-tpop-action="invite"]').scrollIntoView({ block: 'nearest' }));
  if (mobile) await page.tap('#streak-pop [data-tpop-action="invite"]'); else await page.click('#streak-pop [data-tpop-action="invite"]');
  await page.waitForFunction(() => !!document.querySelector('#friends-invite [data-friends-invite]'), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  const inv = await page.evaluate(() => {
    const sec = document.getElementById('friends-invite');
    const r = sec ? sec.getBoundingClientRect() : null;
    const a = document.activeElement;
    return { tab: document.getElementById('app').dataset.activeTab, has: !!sec, qr: !!(sec && sec.querySelector('[data-friends-qr]')), search: !!(sec && sec.querySelector('#friends-search-input')),
      focus: !!(a && a.matches && a.matches('#friends-invite [data-friends-invite]')), top: r ? Math.round(r.top) : null, popOpen: !document.getElementById('streak-pop').hidden,
      title: sec ? sec.querySelector('.friends-empty-title').innerText : '' };
  });
  check(`${tag}: "${E.invite}" abre Amigos com o convite (link + QR code + busca) e o foco no botão de convite`, inv.tab === 'friends' && inv.has && inv.qr && inv.search && inv.focus && !inv.popOpen, inv);
  check(`${tag}: convite visível na tela`, inv.top !== null && inv.top >= -2 && inv.top < (mobile ? 844 : 860), inv.top);
  if (SHOTS && o.shotInvite) await page.screenshot({ path: path.join(SHOTS, `depois-chamar-amigos-${app}-${o.lang}-${o.width}.png`) });
  await page.evaluate(() => switchTab('path'));
  await page.waitForTimeout(300);

  // Teclado (computador): Enter abre com foco dentro, Tab vai ao botão, Tab sai e fecha, Esc fecha e devolve o foco
  if (!mobile){
    await setState(page, 'ativa');
    await page.focus('#streak-btn');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: Enter abre com o foco na janela`, s.open && s.focusIn, s);
    await page.waitForTimeout(300);
    await page.keyboard.press('Tab');
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: Tab vai ao "${E.see}"`, s.open && s.focusAction === 'friends', s.focusAction);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: Tab depois do último botão fecha e volta ao 🔥`, !s.open && s.focusOnBtn, s);
    await page.keyboard.press(' ');
    await page.waitForTimeout(250);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: Espaço abre`, s.open && s.focusIn);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: Esc fecha e devolve o foco ao 🔥`, !s.open && s.focusOnBtn && s.expanded === 'false');
    // Mouse: passar por cima abre; sair fecha; clique fixa
    await page.hover('#streak-btn');
    await page.waitForTimeout(300);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: mouse por cima abre`, s.open);
    await page.mouse.move(5, 820);
    await page.waitForTimeout(450);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: mouse sai, fecha`, !s.open);
    await page.hover('#streak-btn');
    await page.waitForTimeout(250);
    await page.click('#streak-btn');
    await page.mouse.move(5, 820);
    await page.waitForTimeout(450);
    s = await popInfo(page, 'streak-pop');
    check(`${tag}: clique fixa (mouse sai e continua aberta)`, s.open);
    await page.hover('#xp-week-btn');
    await page.waitForTimeout(300);
    x = await popInfo(page, 'xp-week-pop'); s = await popInfo(page, 'streak-pop');
    check(`${tag}: mouse no ⭐ troca de janela (uma por vez)`, x.open && !s.open);
    await page.mouse.click(30, 820);
    await page.waitForTimeout(200);
  }

  // Não abre durante a lição
  await page.evaluate(() => { document.getElementById('app').classList.add('lesson-focus'); TopPop.open('streak', 'click'); TopPop.open('xp', 'click'); });
  await page.waitForTimeout(150);
  const les = await page.evaluate(() => ({ s: TopPop.isOpen('streak'), x: TopPop.isOpen('xp') }));
  check(`${tag}: durante a lição nenhuma janela abre`, !les.s && !les.x, les);
  await page.evaluate(() => document.getElementById('app').classList.remove('lesson-focus'));

  // Janela da sequência depois da lição: seg a dom
  await setState(page, 'ativa');
  await page.evaluate(() => showStreakCelebration());
  await page.waitForTimeout(400);
  const cel = await page.evaluate(() => [...document.querySelectorAll('#streak-week-row .streak-day-item')].map(d => ({ label: d.querySelector('.streak-day-label').innerText, done: d.classList.contains('done'), today: d.classList.contains('today'), future: d.classList.contains('future') })));
  check(`${tag}: janela depois da lição: seg a dom`, cel.map(d => d.label).join() === E.days, cel.map(d => d.label));
  check(`${tag}: janela depois da lição: seg/ter/qua ✓, quarta = hoje, qui a dom futuros`, cel.map(d => d.done ? 1 : 0).join('') === '1110000' && cel[2].today && cel.filter(d => d.future).length === 4, cel);
  await page.evaluate(() => { document.getElementById('streak-modal-overlay').style.display = 'none'; });

  check(`${tag}: 0 erros de página`, errs.length === 0, errs);
  await ctx.close();
}

// ---------- recorde guardado na conta ----------
async function record(browser, base, app){
  const tag = `${app}/recorde`;
  const { ctx, page, errs } = await openApp(browser, base, app, { lang: 'pt-BR', width: 1280, state: 'ativa', account: { bestStreak: 30, streak: 5, lastStudyDay: '2026-10-28' } });
  const loaded = await page.evaluate(() => STATE.bestStreak);
  check(`${tag}: recorde guardado (_account.bestStreak 30) chega ao STATE`, loaded === 30, loaded);
  await page.click('#streak-btn');
  await page.waitForTimeout(300);
  let s = await popInfo(page, 'streak-pop');
  check(`${tag}: janela mostra "30 dias" (guardado, maior que o histórico 9)`, s.best === '30' && /30 dias/.test(s.bestText), s.bestText);
  await page.keyboard.press('Escape');
  // Salvar grava o recorde na conta e no bloco
  await page.evaluate(() => { window.__upserts.length = 0; return saveState(); });
  await page.waitForTimeout(300);
  let up = await page.evaluate(() => { const u = window.__upserts[window.__upserts.length - 1]; return u ? { acc: u.data._account && u.data._account.bestStreak, block: u.data[Object.keys(u.data).find(k => !k.startsWith('_'))].bestStreak } : null; });
  check(`${tag}: save grava _account.bestStreak = 30 e o espelho do bloco`, up && up.acc === 30 && up.block === 30, up);
  // Sequência passa do recorde: registerStudyToday sobe o recorde, a janela mostra "é agora!" e o save grava 31.
  await page.evaluate(() => { STATE.streak = 30; STATE.lastStudyDay = dateStrDaysAgo(1); registerStudyToday(); STATE.pendingStreakCelebration = false; renderTopbarStats(); });
  await page.click('#streak-btn');
  await page.waitForTimeout(300);
  s = await popInfo(page, 'streak-pop');
  check(`${tag}: sequência 31 passa o recorde: "31 dias" com o selo "é agora!"`, /^31\b/.test(s.title) && s.best === '31' && s.chip, [s.title, s.bestText]);
  if (SHOTS) await shotPop(page, `sequencia-recorde-${app}-claro-1280`, 'streak-pop');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__upserts.length = 0; return saveState(); });
  await page.waitForTimeout(300);
  up = await page.evaluate(() => { const u = window.__upserts[window.__upserts.length - 1]; return u ? u.data._account.bestStreak : null; });
  check(`${tag}: save atualiza o recorde para 31`, up === 31, up);
  await ctx.close();
  // Conta sem recorde guardado: nasce do histórico (9) no primeiro save.
  const second = await openApp(browser, base, app, { lang: 'pt-BR', width: 1280, state: 'pendente' });
  await second.page.evaluate(() => { window.__upserts.length = 0; return saveState(); });
  await second.page.waitForTimeout(300);
  const first = await second.page.evaluate(() => { const u = window.__upserts[window.__upserts.length - 1]; return u ? u.data._account.bestStreak : null; });
  check(`${tag}: conta sem recorde: o 1º save grava o maior bloco do histórico (9)`, first === 9, first);
  check(`${tag}: 0 erros de página`, errs.length === 0 && second.errs.length === 0, errs.concat(second.errs));
  await second.ctx.close();
}

// ---------- capturas (fr/zh x claro/escuro x 390/1280) ----------
async function captures(browser, base, app, theme, width){
  const mobile = width < 600;
  const th = theme === 'dark' ? 'escuro' : 'claro';
  const { ctx, page, errs } = await openApp(browser, base, app, { lang: 'pt-BR', width, theme, state: 'ativa', dpr: 2 });
  for (const st of ['ativa', 'pendente', 'zerada']){
    await setState(page, st, st === 'zerada' ? { duo: [] } : null);
    await openStreak(page, mobile);
    await page.waitForFunction(() => { const x = document.querySelector('#streak-pop .tpop-card-sub'); return x && !/\.\.\./.test(x.innerText); }, null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(250);
    await shotPop(page, `sequencia-${st}-${app}-${th}-${width}`, 'streak-pop');
    await page.evaluate(() => TopPop.closeAll());
  }
  await setState(page, 'ativa');
  await openXp(page, mobile);
  await page.waitForFunction(() => !!document.querySelector('#xp-week-pop .tpop-better'), null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);
  await shotPop(page, `xp-${app}-${th}-${width}`, 'xp-week-pop');
  await page.evaluate(() => TopPop.closeAll());
  await page.evaluate(() => showStreakCelebration());
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(SHOTS, `depois-da-licao-${app}-${th}-${width}.png`) });
  await page.evaluate(() => { document.getElementById('streak-modal-overlay').style.display = 'none'; });
  // "Chamar amigos"
  await setState(page, 'zerada', { duo: [] });
  await openStreak(page, mobile);
  await page.waitForFunction(() => !!document.querySelector('#streak-pop [data-tpop-action="invite"]'), null, { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#streak-pop [data-tpop-action="invite"]').click());
  await page.waitForFunction(() => !!document.querySelector('#friends-invite [data-friends-invite]'), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SHOTS, `depois-chamar-amigos-${app}-${th}-${width}.png`) });
  check(`capturas ${app}/${th}/${width}: 0 erros de página`, errs.length === 0, errs);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const runs = [['fr', { lang: 'pt-BR', width: 1280 }], ['zh', { lang: 'pt-BR', width: 1280 }], ['fr', { lang: 'pt-BR', width: 390 }], ['zh', { lang: 'pt-BR', width: 390 }],
    ['fr', { lang: 'en', width: 1280 }], ['zh', { lang: 'en', width: 390 }]];
  for (const [app, o] of runs){
    const before = fail;
    await behaviour(browser, base, app, o);
    console.log(`${app}/${o.lang}/${o.width}: ${fail === before ? 'ok' : 'com falhas'}`);
  }
  for (const app of ['fr', 'zh']){ const before = fail; await record(browser, base, app); console.log(`${app}/recorde: ${fail === before ? 'ok' : 'com falhas'}`); }
  if (SHOTS){
    for (const app of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const width of [390, 1280]) await captures(browser, base, app, theme, width);
    console.log('capturas em ' + SHOTS);
  }
  await browser.close(); server.close();
  console.log(`\njanelas-topo (navegador): ${pass}/${pass + fail} ok`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
