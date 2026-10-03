// K2-E -- Playwright (Chromium real), FR + ZH, modo convidado com o
// Supabase do CDN substituído por um stub em memória (o proxy do sandbox
// bloqueia o CDN). "Autenticado" é simulado setando CURRENT_USER após o
// boot (o stub de rpc/select respeita o mesmo contrato da migration 051/052).
// Rodar: node tests/fase-e/test_playwright.js   (usa o playwright global)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { decks: [] };
  window.__rpcCalls = [];
  window.__AUTH = false; // muda pra true = "conta autenticada" no stub
  function builder(table){
    const st = { table, filters: [] };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => {
        let data = [];
        if (table === 'decks'){
          data = window.__DB.decks.filter(d => st.filters.every(([k, v]) => d[k] === v));
          // RLS simulada: convidado/autenticado só veem kind=course (decks_course_select)
          data = data.filter(d => d.kind === 'course');
        }
        return Promise.resolve({ data, error: null }).then(ok);
      };
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      window.__rpcCalls.push({ name, args });
      if (name === 'ensure_course_decks'){
        if (!window.__AUTH) return { data: null, error: { message: 'permission denied for function ensure_course_decks' } };
        const lang = args.p_language_app_key, D = window.__DB.decks;
        let root = D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id == null);
        if (!root){ root = { id: 1000 + D.length, kind: 'course', name: lang, language_app_key: lang, course_unit_id: null, parent_deck_id: null, owner_id: null, teacher_id: null, is_public: false }; D.push(root); }
        args.p_units.forEach(u => { if (!D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id === u.unit_id))
          D.push({ id: 1000 + D.length, kind: 'course', name: u.title, language_app_key: lang, course_unit_id: u.unit_id, parent_deck_id: root.id, owner_id: null, teacher_id: null, is_public: false }); });
        return { data: D.filter(d => d.kind === 'course' && d.language_app_key === lang), error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // a última rota registrada tem precedência: bloqueia externos primeiro, stub do CDN depois
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  if (process.env.DBG) console.log('url', page.url());
  page.on('console', m => { if (process.env.DBG) console.log('console:', m.text().slice(0,200)); });
  try {
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  } catch (e) {
    console.log('boot falhou; erros:', errors, 'estado:', await page.evaluate(() => ({ st: typeof STATE, cu: typeof CURRENT_USER !== 'undefined' ? CURRENT_USER : 'undef', guest: sessionStorage.getItem('guest_mode'), login: document.getElementById('login-screen') && document.getElementById('login-screen').style.display })));
    throw e;
  }
  return { page, errors, ctx };
}



(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const info = await ev(() => {
      const words = new Set(STATE.cards.filter(c => c.origin === 'study').map(c => c.unitId + ':' + c.vocabIdx)).size;
      return { words, cards: STATE.cards.length };
    });
    check(lang + ' boot: palavras = cards/2 (1 Note = 2 CardInstances)', info.cards === info.words * 2, info);
    // estuda SÓ o card A de 3 palavras (B fica New) e o B de uma 4ª (A New)
    const setup = await ev(() => {
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length >= 5);
      const mk = (id, extra) => Object.assign(STATE.cards.find(c => c.id === id), { reps: 3, state: 'review', stability: 8, difficulty: 5, interval: 10, lapses: 0 }, extra);
      mk(`u${u.id}-v0`, { firstLearnedDate: '2026-01-05' });
      mk(`u${u.id}-v0-b`, { firstLearnedDate: '2026-01-09' });   // mesma palavra, estudada nos 2 lados
      mk(`u${u.id}-v1`, { interval: 90, firstLearnedDate: '2026-01-07' });
      mk(`u${u.id}-v2-b`, { firstLearnedDate: '2026-01-08' });  // só via B
      return { uid: u.id };
    });
    await ev(() => { UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; }); switchTab('progress'); });
    const ui = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#stat-cards .stat-card')].map(e => e.innerText.replace(/\s+/g, ' ').trim());
      const learned = cards.find(t => /Palavras aprendidas/.test(t));
      const chart = document.querySelector('#progress-line-chart-wrap .chart-total');
      const dots = document.querySelectorAll('#progress-line-chart-wrap .chart-dot').length;
      const vs = [...document.querySelectorAll('#vocab-strength-widget .vs-count')].map(e => parseInt(e.innerText));
      const stat = {}; document.querySelectorAll('#stat-cards .stat-card[data-stat]').forEach(e => { stat[e.dataset.stat] = { n: parseInt(e.querySelector('.num').innerText), label: e.querySelector('.label').innerText }; });
      return { learned, chart: chart && chart.innerText, dots, vs, stat, hasPend: cards.some(t => /Pendentes agora/.test(t)) };
    });
    const totalWords = info.words;
    check(lang + ' UI: "Palavras aprendidas" mostra 3/' + totalWords + ' (palavras, não cards)', ui.learned && ui.learned.startsWith('3/' + totalWords + ' '), ui.learned);
    check(lang + ' UI: gráfico total acumulado = 3 palavras (A+B da mesma palavra não dobram)', ui.chart && /\b3\b/.test(ui.chart), ui.chart);
    check(lang + ' UI: gráfico com 3 datas (uma por palavra)', ui.dots === 3, ui.dots);
    check(lang + ' UI: "Suas palavras" tem 4 grupos (Não iniciadas/Fracas/Medianas/Fortes) e soma = palavras (não 2x)', ui.vs.length === 4 && ui.vs.reduce((a, b) => a + b, 0) === totalWords, ui.vs);
    check(lang + ' UI: não iniciadas = palavras sem estudo, nenhuma fraca', ui.vs[0] === totalWords - 3 && ui.vs[1] === 0, ui.vs);
    check(lang + ' UI: 1 palavra forte, 2 medianas', ui.vs[3] === 1 && ui.vs[2] === 2, ui.vs);
    check(lang + ' UI: "Pendentes agora" aposentado', ui.hasPend === false);
    check(lang + ' UI: rótulos Novos/Aprendendo/Para revisar/Devidos/Para estudar hoje', ['Novos','Aprendendo','Para revisar','Devidos','Para estudar hoje'].every((l, i) => ui.stat[['new','learning','review','due','today'][i]] && ui.stat[['new','learning','review','due','today'][i]].label === l), ui.stat);
    check(lang + ' UI: Novos = cartões sem histórico (CardInstance), Para revisar = 4 cartões estudados', ui.stat.new && ui.stat.new.n === info.cards - 4 - 0 && ui.stat.review && ui.stat.review.n === 4, ui.stat);
    // Deck/Review continuam por CardInstance
    const cs = await ev(async () => {
      UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      window.CURRENT_USER = window.CURRENT_USER; CURRENT_USER = { id: 'u-test' }; window.__AUTH = true;
      STATE.studySettings.newCardsPerDay = 1000; STATE.studySettings.sessionIntensity = 'all';
      await ensureDecksLoadedForReview();
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length >= 5);
      const s = deckReviewSummary(STATE.cards.find(c => c.id === `u${u.id}-v0`).deckId);
      return { total: s.totalCards, wordsInUnit: u.vocab.length };
    });
    check(lang + ' Deck segue por CardInstance (unidade: 2 x palavras)', cs.total === cs.wordsInUnit * 2, cs);
    // conclusão da unidade (A estudado em todas as palavras, B New) e botão "Já sei" real
    const done = await ev(async uid => {
      const u = UNITS.find(x => x.id === uid);
      STATE.unitProgress[uid] = { started: true, completed: false, lessonIdx: 0, lessonMisses: {} };
      u.vocab.forEach((_, i) => Object.assign(STATE.cards.find(c => c.id === `u${uid}-v${i}`), { reps: 2, state: 'review', due: 1 }));
      checkUnitCompletion(uid);
      return { completed: STATE.unitProgress[uid].completed, bNew: STATE.cards.filter(c => c.unitId === uid && c.id.endsWith('-b') && c.reps === 0).length };
    }, setup.uid);
    check(lang + ' checkUnitCompletion na UI real: A estudado + B New conclui a unidade', done.completed === true && done.bNew > 0, done);
    // Já sei: palavra estudada só via B mostra ✓ e não regrava A
    const ks = await page.evaluate(async uid => {
      const u = UNITS.find(x => x.id === uid);
      STATE.cards.forEach(c => { if (c.unitId === uid){ c.reps = 0; c.state = 'new'; c.due = 0; } });
      Object.assign(STATE.cards.find(c => c.id === `u${uid}-v3-b`), { reps: 2, state: 'review' });
      const host = document.createElement('div'); host.id = 'k2e-host';
      host.innerHTML = `<button class="know-btn" data-card-id="u${uid}-v3">Já sei?</button>`; document.body.appendChild(host);
      wireKnowButtons(host); host.querySelector('.know-btn').click();
      const A = STATE.cards.find(c => c.id === `u${uid}-v3`);
      return { aReps: A.reps, txt: host.innerText };
    }, setup.uid);
    check(lang + ' "Já sei" numa palavra já estudada via B não regrava o card A', ks.aReps === 0, ks);
    check(lang + ' sem pageerror', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K2-E playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();
