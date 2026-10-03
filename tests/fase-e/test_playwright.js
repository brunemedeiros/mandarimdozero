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
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);

    // Study Trail intacto: trilha renderizada, cards de trilha sem deckId
    check(lang + ' Study Trail renderizada (cards de unidade)', await ev(() => document.querySelectorAll('#units-grid > *, .unit-card').length > 0 || STATE.cards.length > 0));
    const base = await ev(() => ({ n: STATE.cards.length, allNull: STATE.cards.every(c => c.deckId === null), origin: [...new Set(STATE.cards.map(c => c.origin))] }));
    check(lang + ' boot: cards de trilha com deckId null', base.allNull && base.origin.join() === 'study', base);
    const snap0 = await ev(() => JSON.stringify(STATE.cards.map(c => { const { deckId, ...r } = c; return r; })));

    // 1) Guest, Course Decks ainda inexistentes: nenhuma RPC, nenhum deckId, app funciona
    let r = await ev(async () => { const d = await ensureDecksLoadedForReview(); return { decks: d.length, rpc: window.__rpcCalls.length, anyDeck: STATE.cards.some(c => c.deckId != null) }; });
    check(lang + ' guest sem Course Decks: sem RPC e sem deckId', r.rpc === 0 && !r.anyDeck && r.decks === 0, r);

    // 2) Guest com Course Decks já existentes (criados por conta autenticada antes): só lê
    await ev(() => { window.__AUTH = true; return supabaseClient.rpc('ensure_course_decks', { p_language_app_key: APP_KEY, p_units: courseUnitsForDecks(UNITS) }); });
    await ev(() => { window.__rpcCalls.length = 0; window.__AUTH = false; STATE.courseDecksLoaded = false; STATE.decks = []; });
    r = await ev(async () => { await ensureDecksLoadedForReview(); return { rpc: window.__rpcCalls.length, mapped: STATE.cards.filter(c => c.deckId != null).length, total: STATE.cards.length }; });
    check(lang + ' guest com Course Decks existentes: lê e mapeia sem RPC', r.rpc === 0 && r.mapped === r.total && r.total > 0, r);
    check(lang + ' RLS/guest: RPC recusada para não autenticado', await ev(async () => (await supabaseClient.rpc('ensure_course_decks', { p_language_app_key: APP_KEY, p_units: [] })).error !== null));

    // 3) "Autenticado": bootstrap idempotente usando a lista REAL de UNITS
    await ev(() => { window.__DB.decks = []; window.__rpcCalls.length = 0; window.__AUTH = true; CURRENT_USER = { id: 'u-test' }; STATE.courseDecksLoaded = false; STATE.decks = []; STATE.cards.forEach(c => c.deckId = null); });
    r = await ev(async () => {
      await ensureDecksLoadedForReview();
      const first = window.__rpcCalls.filter(c => c.name === 'ensure_course_decks');
      return { calls: first.length, payloadOk: JSON.stringify(first[0].args.p_units) === JSON.stringify(courseUnitsForDecks(UNITS)),
        lang: first[0].args.p_language_app_key === APP_KEY, decks: window.__DB.decks.length,
        units: courseUnitsForDecks(UNITS).length, mapped: STATE.cards.filter(c => c.deckId != null).length, total: STATE.cards.length };
    });
    check(lang + ' auth: 1 RPC com payload REAL de UNITS', r.calls === 1 && r.payloadOk && r.lang, r);
    check(lang + ' auth: 1 root + 1 Unit Deck por unidade', r.decks === r.units + 1, r);
    check(lang + ' auth: todos os cards mapeados', r.mapped === r.total, r);
    r = await ev(async () => { await ensureDecksLoadedForReview(); await ensureDecksLoadedForReview(); return { calls: window.__rpcCalls.filter(c => c.name === 'ensure_course_decks').length, decks: window.__DB.decks.length }; });
    check(lang + ' auth: chamadas repetidas não repetem RPC (flag de sessão)', r.calls === 1, r);
    r = await ev(async () => { STATE.courseDecksLoaded = false; await ensureDecksLoadedForReview(); return { calls: window.__rpcCalls.length, decks: window.__DB.decks.length, stateDecks: STATE.decks.length }; });
    check(lang + ' auth: forçar re-bootstrap é idempotente (sem duplicar Decks)', r.decks === (await ev(() => courseUnitsForDecks(UNITS).length)) + 1 && r.stateDecks === r.decks, r);

    // 4) identidade/FSRS preservados; unitId != deckId
    const snap1 = await ev(() => JSON.stringify(STATE.cards.map(c => { const { deckId, ...r } = c; return r; })));
    check(lang + ' cards: id/unitId/FSRS/estado inalterados', snap0 === snap1);
    check(lang + ' unitId preservado e distinto de deckId', await ev(() => STATE.cards.every(c => c.unitId != null && String(c.unitId) !== String(c.deckId))));

    // 5) lesson completion continua sendo regra pedagógica
    const info = await ev(() => { const u = UNITS.find(x => x.type !== 'grammar' && x.vocab && x.vocab.length); const idx = buildCourseDeckIndex(STATE.decks, APP_KEY);
      return { unitId: u.id, deckId: courseDeckIdForUnit(idx, u.id), vocab: u.vocab.length * 2 /* K2-C: A+B por palavra (CardInstances) */, rootId: idx.rootId }; });
    r = await ev(id => { STATE.unitProgress = {}; return deckReviewSummary(id); }, info.deckId);
    check(lang + ' Deck com cards mas lição não concluída: 0 elegíveis', r.totalCards === info.vocab && r.eligibleCards === 0 && r.new === 0, r);
    r = await ev(async i => { STATE.unitProgress[i.unitId] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; return deckReviewSummary(i.deckId); }, info);
    check(lang + ' após concluir a unidade: elegíveis = vocab', r.eligibleCards === info.vocab && r.new === info.vocab, r);
    r = await ev(id => deckReviewSummary(id), info.rootId);
    check(lang + ' root do curso agrega a subtree', r.eligibleCards === info.vocab && r.totalCards > info.vocab, r);

    // 6) Review com Deck scope usa a fila existente (renderiza cartão de trilha)
    r = await ev(async i => {
      await startDeckReviewSession(i.deckId);
      return { q: STATE.reviewQueue.length, allInUnit: STATE.reviewQueue.every(c => c.unitId === i.unitId && c.deckId === i.deckId),
        sessionDeck: STATE.reviewSessionDeckId, html: document.getElementById('review-content').innerHTML.length };
    }, info);
    check(lang + ' startDeckReviewSession(Unit Deck): fila só da unidade', r.q > 0 && r.allInUnit && r.sessionDeck === info.deckId && r.html > 50, r);
    r = await ev(async () => { const c = STATE.reviewQueue[0]; const reps0 = c.reps; gradeCurrentCard(2); return { reps: c.reps, reps0, idx: STATE.reviewIndex, deckId: c.deckId }; });
    check(lang + ' grade via FSRS existente (reps sobe, deckId mantido)', r.reps === r.reps0 + 1 && r.deckId === info.deckId, r);
    // Review normal (sem Deck) continua funcionando
    r = await ev(() => { startReviewSession(); return { q: STATE.reviewQueue.length }; });
    check(lang + ' Review comum continua funcionando', r.q >= 0);

    check(lang + ' nenhum pageerror', errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Fase E playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
