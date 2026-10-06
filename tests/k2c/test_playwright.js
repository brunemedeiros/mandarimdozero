// Fase E -- Playwright (Chromium real), FR + ZH, modo convidado com o
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
    // Study Trail nativa no app real
    const s = await ev(() => { const a = STATE.cards.find(c => c.id === STATE.cards[0].id); const b = STATE.cards.find(c => c.id === a.id + '-b');
      return { n: STATE.cards.length, hasB: !!b, sameNote: a.note === b.note, ciA: !!a.cardInstance, origin: a.origin + '/' + b.origin,
        legacy: a.front !== undefined || a.back_trans !== undefined, unit: a.unitId === b.unitId && a.vocabIdx === b.vocabIdx }; });
    check(lang + ' boot: cards nativos A/B, mesma Note, sem campos legados', s.hasB && s.sameNote && s.ciA && !s.legacy && s.unit && s.origin === 'study/study', s);
    check(lang + ' trilha renderiza (renderUnitsGrid) sem erro', await ev(() => { renderUnitsGrid(); return document.querySelectorAll('#units-grid > *').length > 0; }));
    // Course Deck aparece (bootstrap autenticado simulado)
    await ev(() => { window.__AUTH = true; CURRENT_USER = { id: 'u-test' }; });
    const d = await ev(async () => { await ensureDecksLoadedForReview(); const A = STATE.cards[0], B = STATE.cards.find(c => c.id === A.id + '-b'); return { a: A.deckId, b: B.deckId }; });
    check(lang + ' Course Deck: A e B no mesmo Deck', d.a != null && d.a === d.b, d);
    // conclui a primeira unidade e abre o Review (sem exigir B na fila)
    const rv = await ev(() => { const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length);
      STATE.unitProgress[u.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} };
      startReviewSession(); const c = STATE.reviewQueue[STATE.reviewIndex];
      return { queue: STATE.reviewQueue.length, html: document.getElementById('review-content').innerHTML.length, hasCard: !!c }; });
    check(lang + ' Review abre e renderiza sem crash', rv.queue > 0 && rv.html > 0 && rv.hasCard, rv);
    // grade real + save/reload: só id+progresso, estrutura reconstruída
    const sv = await ev(() => {
      const card = STATE.reviewQueue[STATE.reviewIndex]; const id = card.id;
      gradeCurrentCard(2);
      const data = JSON.parse(JSON.stringify(serializeState()));
      const saved = data.cards.find(c => c.id === id);
      const study = data.cards.filter(c => c.origin === 'study' || c.note || c.cardInstance);
      const before = STATE.cards.find(c => c.id === id);
      const snap = { reps: before.reps, due: before.due };
      STATE.cards = buildCardsFromUnits(UNITS);
      applySerializedState({ cards: data.cards, unitProgress: STATE.unitProgress });
      const after = STATE.cards.find(c => c.id === id);
      return { keys: Object.keys(saved), leaks: study.length, restored: after.reps === snap.reps && after.due === snap.due && after.reps > 0,
        structure: !!after.note && !!after.cardInstance && after.origin === 'study', size: JSON.stringify(data.cards).length }; });
    check(lang + ' save real: study serializa só id+progresso', sv.leaks === 0 && !sv.keys.some(k => ['note', 'cardInstance', 'origin', 'deckId', 'unitId', 'front', 'lastDirection'].includes(k)), sv);
    check(lang + ' reload real: progresso restaurado e estrutura reconstruída', sv.restored && sv.structure, sv);
    check(lang + ' sem pageerror', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K2-C playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();
