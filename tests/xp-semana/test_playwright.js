// XP da semana no topo + janelinha das últimas semanas + avisos "+N XP" fora das telas de conclusão
// (decisões da dona, 2026-10-29). Playwright/Chromium real, fr e zh, arquivos de produção; só o Supabase é trocado por
// um stub (linha de progresso + linhas de weekly_xp da conta). Cobre:
//  - topo "⭐ N XP" igual no fr e no zh (com "XP" também no celular), N = XP DA SEMANA (não o total), mesma soma do
//    Ranking "Geral" (weekly_xp de todos os idiomas da conta na semana de segunda a domingo);
//  - mostra o local até o servidor responder e depois sobe para o valor do servidor; XP ganho depois soma na hora;
//  - leitura de weekly_xp só da própria conta e só das 4 semanas;
//  - janelinha: 4 semanas (atual destacada, com aria-current), datas, abre com mouse (hover), clique, Enter, Espaço e
//    toque; fecha com Esc (foco volta ao botão) e clique fora; foco dentro ao abrir por teclado; alvo de 44px no celular;
//  - site em inglês sem português na janelinha;
//  - tela "Lição concluída!": nenhum aviso "+N XP" visível; aviso de XP pendente some quando a tela de conclusão abre.
// Rodar: node tests/xp-semana/test_playwright.js   (SHOTS=dir salva capturas: claro/escuro x 390/1280 x fr/zh)
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

// Linhas de weekly_xp por "semanas atrás" (0 = atual), resolvidas na página com a mesma conta de segunda-feira.
// Ranking Geral desta semana = 40 (idioma da página) + 25 (outro idioma) = 65.
const WEEKLY = [
  { ago: 0, lang: 'PAGE', amount: 40 }, { ago: 0, lang: 'OTHER', amount: 25 },
  { ago: 1, lang: 'PAGE', amount: 90 },
  { ago: 3, lang: 'OTHER', amount: 15 },
];
const STUB = (spec) => `(function(){
  window.__weeklyCalls = [];
  const SPEC = ${JSON.stringify(spec)};
  function monday(ago){ const d = new Date(); const diff = d.getDay() === 0 ? -6 : 1 - d.getDay(); const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff - 7 * ago, 12);
    return m.getFullYear() + '-' + String(m.getMonth()+1).padStart(2,'0') + '-' + String(m.getDate()).padStart(2,'0'); }
  window.__monday = monday;
  function row(){
    const first = (typeof UNITS !== 'undefined' && UNITS[0]) ? UNITS[0].id : 1;
    const b = { unitProgress: { [first]: { unlocked: true, started: true, completed: false, lessonIdx: 0, lessonMisses: {} } },
      xp: 999, streak: 0, activityLog: {}, welcome: { a: '2026-10-01', b: '2026-10-01' }, periodXp: { weekStart: monday(0), amount: SPEC.localWeek } };
    return { _meta: {}, [SPEC.blockKey]: b };
  }
  const mk = (table) => { let single = false; const call = { table, eq: [], gte: [] }; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => {
        let data = single ? null : [];
        if (table === 'progress' && single) data = { data: row() };
        if (table === 'weekly_xp'){
          window.__weeklyCalls.push(call);
          const pageLang = (typeof APP_KEY !== 'undefined') ? APP_KEY : 'x';
          data = SPEC.weekly.map(r => ({ week_start: monday(r.ago), language_app_key: r.lang === 'PAGE' ? pageLang : 'outro', amount: r.amount }));
          return new Promise(res => setTimeout(() => res({ data, error: null }), SPEC.weeklyDelay || 0)).then(ok, ko);
        }
        return Promise.resolve({ data, error: null }).then(ok, ko);
      };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      if (p === 'eq') return (k, v) => { call.eq.push([k, v]); return b; };
      if (p === 'gte') return (k, v) => { call.gte.push([k, v]); return b; };
      return () => b; } }); return b; };
  const user = { id: 'u-xpw', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana Souza' }, created_at: new Date().toISOString() };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'x' } } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let pass = 0, fail = 0;
function check(label, cond, extra){
  if (cond){ pass++; } else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra) : ''); }
}

const BLOCK = { fr: 'frances', zh: 'mandarim' };
const PT_WORDS = /\b(semana|semanas|Esta|passada|atrás|Carregando|somando|cursos|igual|desta)\b/i;

async function openApp(browser, base, app, o){
  const mobile = o.width < 600;
  const ctx = await browser.newContext({ viewport: { width: o.width, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, serviceWorkers: 'block',
    colorScheme: o.theme, locale: o.lang, hasTouch: mobile, isMobile: mobile });
  await ctx.addInitScript(({ lang }) => { try { localStorage.setItem('ui-language', lang); localStorage.setItem('ui-language-gate', lang); } catch (e) {} }, { lang: o.lang });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  const blockKey = o.lang === 'en' ? BLOCK[app] + '@en' : BLOCK[app];
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript',
    body: STUB({ blockKey, localWeek: 40, weekly: WEEKLY, weeklyDelay: o.weeklyDelay || 0 }) }));
  await page.goto(`${base}/${app}/index.html`);
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id && progressLoadedOk, null, { timeout: 25000 });
  if (o.theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  return { ctx, page, errs };
}

async function shot(page, name){ if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
const topText = (page) => page.evaluate(() => document.querySelector('#xp-week-btn .pill.xp').innerText.replace(/\s+/g, ' ').trim());
const popState = (page) => page.evaluate(() => {
  const pop = document.getElementById('xp-week-pop'), btn = document.getElementById('xp-week-btn');
  const rows = pop ? [...pop.querySelectorAll('.xp-week-row')] : [];
  const r = pop ? pop.getBoundingClientRect() : null;
  return { open: !!pop && !pop.hidden && pop.getClientRects().length > 0, expanded: btn.getAttribute('aria-expanded'),
    rows: rows.map(x => ({ cur: x.classList.contains('is-current'), ariaCur: x.getAttribute('aria-current'), label: x.querySelector('.xp-week-label').innerText,
      amount: x.querySelector('.xp-week-amount').innerText, dates: x.querySelector('.xp-week-dates').innerText, week: x.dataset.week })),
    text: pop ? pop.innerText : '', focusInPop: !!pop && pop.contains(document.activeElement), focusOnBtn: document.activeElement === btn,
    inView: r ? (r.left >= 0 && r.right <= window.innerWidth + 0.5 && r.top >= 0) : false,
    curBg: rows[0] ? getComputedStyle(rows[0]).backgroundColor : '', otherBg: rows[1] ? getComputedStyle(rows[1]).backgroundColor : '' };
});

// Anda pela lição respondendo certo até a tela de conclusão (mesmo andador de tests/boas-vindas/).
async function walkLesson(page){
  let miss = 0;
  for (let i = 0; i < 700; i++){
    const done = await page.evaluate(() => !!document.querySelector('#step-content .lesson-complete'));
    if (done) return true;
    const acted = await page.evaluate(() => {
      const vis = el => el && el.getClientRects().length && getComputedStyle(el).display !== 'none';
      const c = document.getElementById('step-content');
      const next = document.getElementById('step-next-btn');
      if (vis(next) && !next.disabled){ next.click(); return 'next'; }
      const cont = [...document.querySelectorAll('#step-content button.btn-primary, #step-content button.wrong-feedback-continue, #step-content .correct-feedback button, #step-content button.btn-secondary')].filter(b => vis(b) && !b.disabled).pop();
      const ex = (typeof STEP_STATE !== 'undefined' && STEP_STATE.exerciseList) ? STEP_STATE.exerciseList[STEP_STATE.exerciseIndex] : null;
      const opts = [...c.querySelectorAll('.exercise-option:not(.disabled)')].filter(vis);
      if (opts.length && ex && ex.options){ const k = ex.options.findIndex(o => o === ex.item); const b = c.querySelector(`.exercise-option[data-idx="${k}"]`); if (b && !b.classList.contains('disabled')){ b.click(); return 'certa'; } }
      if (cont){ cont.click(); return 'cont'; }
      const idk = [...c.querySelectorAll('button')].find(b => vis(b) && !b.classList.contains('disabled') && /Não sei|I don.t know/i.test(b.innerText));
      if (idk){ idk.click(); return 'naosei'; }
      if (opts.length){ opts[0].click(); return 'opt'; }
      const any = [...c.querySelectorAll('button')].find(b => vis(b) && !b.disabled && !b.classList.contains('disabled') && !b.classList.contains('audio-btn') && (b.innerText || '').trim());
      if (any){ any.click(); return 'qualquer'; }
      return null;
    });
    if (!acted){ if (++miss > 6) return false; await page.waitForTimeout(600); continue; }
    miss = 0;
    await page.waitForTimeout(140);
  }
  return false;
}

async function scenario(browser, base, app, o){
  const tag = `${app}/${o.lang}/${o.theme}/${o.width}`;
  const mobile = o.width < 600;
  const { ctx, page, errs } = await openApp(browser, base, app, Object.assign({ weeklyDelay: 1500 }, o));
  await page.waitForTimeout(400);
  // Antes do servidor responder: local (40), nunca o total (999).
  const early = await topText(page);
  check(`${tag}: antes do servidor, topo mostra o XP local da semana ("⭐ 40 XP")`, early === '⭐ 40 XP', early);
  await page.waitForFunction(() => document.getElementById('xp-count').textContent === '65', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  const top = await topText(page);
  check(`${tag}: topo = XP da semana igual ao Ranking Geral ("⭐ 65 XP"), não o total 999`, top === '⭐ 65 XP', top);
  const suffixVisible = await page.evaluate(() => { const s = document.querySelector('#xp-week-btn .xp-suffix'); return !!s && s.getClientRects().length > 0 && getComputedStyle(s).display !== 'none'; });
  check(`${tag}: "XP" visível ao lado do número`, suffixVisible);
  // Outras leituras de weekly_xp (card do Ranking na lateral, por semana) ficam de fora: só a do contador filtra por conta.
  const calls = (await page.evaluate(() => window.__weeklyCalls)).filter(c => c.eq.some(([k]) => k === 'user_id'));
  const c0 = calls[0] || { eq: [], gte: [] };
  check(`${tag}: lê weekly_xp só da própria conta e só das 4 semanas`, calls.length >= 1 && c0.eq.some(([k, v]) => k === 'user_id' && v === 'u-xpw') &&
    c0.gte.length === 1 && c0.gte[0][0] === 'week_start', calls);
  const gteOk = await page.evaluate((c) => c.gte[0] && c.gte[0][1] === window.__monday(3), c0);
  check(`${tag}: a leitura começa 3 semanas antes da atual (segunda-feira)`, gteOk, c0.gte);
  const aria = await page.evaluate(() => document.getElementById('xp-week-btn').getAttribute('aria-label'));
  check(`${tag}: botão com aria-label que diz o número da semana`, /65/.test(aria) && (o.lang === 'en' ? /this week/.test(aria) : /nesta semana/.test(aria)), aria);
  const btnBox = await page.evaluate(() => { const r = document.getElementById('xp-week-btn').getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; });
  if (mobile) check(`${tag}: alvo de toque com 44px de altura no celular`, btnBox.h >= 44, btnBox);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(`${tag}: sem rolagem horizontal`, !overflow);
  await shot(page, `topo-${app}-${o.lang}-${o.theme}-${o.width}`);

  // Abrir: celular por toque; desktop por hover (mouse) e depois clique fixa.
  if (mobile){
    await page.tap('#xp-week-btn');
  } else {
    await page.hover('#xp-week-btn');
  }
  await page.waitForTimeout(300);
  let st = await popState(page);
  check(`${tag}: ${mobile ? 'toque' : 'mouse por cima'} abre a janelinha (aria-expanded=true)`, st.open && st.expanded === 'true', { open: st.open, exp: st.expanded });
  check(`${tag}: 4 semanas, a atual primeiro e destacada (aria-current)`, st.rows.length === 4 && st.rows[0].cur && st.rows[0].ariaCur === 'date' && st.rows.slice(1).every(r => !r.cur), st.rows);
  check(`${tag}: números das semanas (65, 90, 0, 15)`, st.rows.map(r => r.amount.replace(/\D/g, '')).join(',') === '65,90,0,15', st.rows.map(r => r.amount));
  const labels = o.lang === 'en' ? ['This week', 'Last week', '2 weeks ago', '3 weeks ago'] : ['Esta semana', 'Semana passada', '2 semanas atrás', '3 semanas atrás'];
  check(`${tag}: rótulos das semanas`, JSON.stringify(st.rows.map(r => r.label)) === JSON.stringify(labels), st.rows.map(r => r.label));
  check(`${tag}: cada semana com as datas (segunda a domingo)`, st.rows.every(r => /\d/.test(r.dates) && (o.lang === 'en' ? / to /.test(r.dates) : / a /.test(r.dates))), st.rows.map(r => r.dates));
  check(`${tag}: semana atual com fundo diferente das outras`, st.curBg && st.curBg !== st.otherBg, [st.curBg, st.otherBg]);
  check(`${tag}: janelinha dentro da tela`, st.inView);
  if (o.lang === 'en') check(`${tag}: janelinha sem português`, !PT_WORDS.test(st.text), st.text.match(PT_WORDS));
  await shot(page, `janelinha-${app}-${o.lang}-${o.theme}-${o.width}`);

  if (!mobile){
    // Mouse sai: fecha (aberta só por hover).
    await page.mouse.move(5, 600);
    await page.waitForTimeout(450);
    st = await popState(page);
    check(`${tag}: mouse sai, janelinha fecha`, !st.open && st.expanded === 'false');
    // Teclado: Enter abre com foco dentro; Esc fecha e devolve o foco.
    await page.focus('#xp-week-btn');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    st = await popState(page);
    check(`${tag}: Enter abre e o foco vai para dentro da janelinha`, st.open && st.focusInPop, st);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    st = await popState(page);
    check(`${tag}: Esc fecha e o foco volta ao botão`, !st.open && st.focusOnBtn && st.expanded === 'false');
    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    st = await popState(page);
    check(`${tag}: Espaço abre`, st.open && st.focusInPop);
    await page.mouse.click(30, 700);
    await page.waitForTimeout(200);
    st = await popState(page);
    check(`${tag}: clique fora fecha`, !st.open);
  } else {
    await page.tap('#xp-week-btn');
    await page.waitForTimeout(250);
    st = await popState(page);
    check(`${tag}: tocar de novo fecha`, !st.open && st.expanded === 'false');
    await page.tap('#xp-week-btn');
    await page.waitForTimeout(250);
    await page.touchscreen.tap(30, 700);
    await page.waitForTimeout(250);
    st = await popState(page);
    check(`${tag}: toque fora fecha`, !st.open);
  }

  // XP ganho depois da leitura soma na hora (sem esperar o servidor).
  // Mesmo caminho dos exercícios: addXP() e depois renderTopbarStats().
  await page.evaluate(() => { addXP(5); renderTopbarStats(); });
  await page.waitForTimeout(800);
  const after = await topText(page);
  check(`${tag}: +5 XP agora: topo vai para 70`, after === '⭐ 70 XP', after);

  // Tela "Lição concluída!": abre a lição, anda até o fim e confere que nenhum "+N XP" está por cima.
  await page.evaluate(() => { const u = UNITS[0]; const h = [...document.querySelectorAll('.unit-block .ub-header')].find(x => x.getClientRects().length && x.textContent.includes(u.title)); if (h) h.click(); else openUnitDetail(u.id); });
  await page.waitForTimeout(800);
  // Aviso de XP pendente logo antes da conclusão (o caso que cobria o título).
  const reached = await walkLesson(page);
  check(`${tag}: chegou à tela "Lição concluída!"`, reached);
  await page.waitForTimeout(250);
  const toasts = await page.evaluate(() => [...document.querySelectorAll('#toast-layer .toast')].filter(t => t.getClientRects().length).map(t => t.innerText));
  check(`${tag}: nenhum aviso "+N XP" na tela "Lição concluída!"`, !toasts.some(x => /^\+\d+ XP$/.test(x.trim())), toasts);
  // Aviso de XP disparado com a tela aberta não aparece; e um pendente some quando a tela de conclusão aparece.
  const synth = await page.evaluate(async () => {
    showToast('+3 XP', { kind: 'xp' });
    const blocked = document.querySelectorAll('#toast-layer .toast[data-kind="xp"]').length;
    const host = document.getElementById('step-content');
    const keep = host.innerHTML; host.innerHTML = '<p>exercício</p>';
    showToast('+2 XP', { kind: 'xp' });
    const shown = document.querySelectorAll('#toast-layer .toast[data-kind="xp"]').length;
    showToast('Missão concluída');
    host.innerHTML = keep;
    await new Promise(r => setTimeout(r, 120));
    const left = document.querySelectorAll('#toast-layer .toast[data-kind="xp"]').length;
    const others = [...document.querySelectorAll('#toast-layer .toast')].filter(t => !t.dataset.kind).map(t => t.innerText);
    return { blocked, shown, left, others };
  });
  check(`${tag}: com a conclusão aberta, aviso de XP não aparece`, synth.blocked === 0, synth);
  check(`${tag}: aviso de XP pendente some quando a conclusão abre (outros avisos ficam)`, synth.shown === 1 && synth.left === 0 && synth.others.includes('Missão concluída'), synth);
  await page.evaluate(() => document.querySelectorAll('#toast-layer .toast:not([data-kind])').forEach(t => t.remove()));
  await page.waitForTimeout(400);
  await shot(page, `conclusao-${app}-${o.lang}-${o.theme}-${o.width}`);
  check(`${tag}: 0 erros de página`, errs.length === 0, errs);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const combos = [];
  for (const app of ['fr', 'zh']) for (const theme of ['light', 'dark']) for (const width of [390, 1280]) combos.push([app, { lang: 'pt-BR', theme, width }]);
  combos.push(['fr', { lang: 'en', theme: 'light', width: 1280 }], ['zh', { lang: 'en', theme: 'light', width: 390 }]);
  for (const [app, o] of combos){
    const before = fail;
    await scenario(browser, base, app, o);
    console.log(`${app}/${o.lang}/${o.theme}/${o.width}: ${fail === before ? 'ok' : 'com falhas'}`);
  }
  await browser.close(); server.close();
  console.log(`\nxp-semana (navegador): ${pass}/${pass + fail} ok`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
