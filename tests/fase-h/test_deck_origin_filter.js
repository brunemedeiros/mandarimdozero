// Fase H hardening -- precedencia do Deck sobre reviewOriginFilter. Base copiada do harness da Fase E: Playwright (Chromium real), FR + ZH, modo convidado com o
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
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
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

    // Cenário: 1 Course Deck (trilha), 1 Deck pessoal (cards self), 1 Teacher Deck (cards teacher).
    // Cards nativos construídos pelo motor REAL (buildEngineCardsFromRow) e postos em STATE.cards.
    const setup = await ev(async () => {
      const A = APP_KEY;
      const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true, tags: [] }, extra);
      // Course: usa o bootstrap real de Course Decks (stub em memória)
      window.__AUTH = true; CURRENT_USER = { id: 'u-h' }; STATE.courseDecksLoaded = false; STATE.decks = [];
      await ensureDecksLoadedForReview();
      const course = STATE.decks.find(d => d.kind === 'course' && d.course_unit_id != null);
      const unit = UNITS.find(u => String(u.id) === course.course_unit_id);
      STATE.unitProgress = STATE.unitProgress || {};
      STATE.unitProgress[unit.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} };
      // Decks pessoal e do professor (linhas de dado; ids fora da faixa 1000+ do stub de Course)
      STATE.decks.push({ id: 7001, kind: 'personal', name: 'P', owner_id: 'u-h', language_app_key: A, parent_deck_id: 7000 });
      STATE.decks.push({ id: 7100, kind: 'teacher_root', name: 'T', owner_id: 'u-h', teacher_id: 't-1', language_app_key: A, parent_deck_id: null });
      STATE.decks.push({ id: 7101, kind: 'teacher', name: 'T1', owner_id: 'u-h', teacher_id: 't-1', language_app_key: A, parent_deck_id: 7100 });
      const selfCards = [1, 2].flatMap(i => buildCardFromSelfFlashcard(mk(900 + i, { owner_id: 'u-h', deck_id: 7001 })));
      const teacherCards = [1, 2, 3].flatMap(i => buildCardFromTeacherFlashcard(mk(800 + i, { teacher_id: 't-1', student_id: 'u-h', deck_id: 7101 })));
      STATE.cards = STATE.cards.concat(selfCards, teacherCards);
      return { courseId: course.id, unitId: unit.id, courseCards: STATE.cards.filter(c => c.deckId === course.id).length, selfN: selfCards.length, teacherN: teacherCards.length };
    });
    check(lang + ' setup: cards em Course/Pessoal/Teacher Deck', setup.courseCards > 0 && setup.selfN === 2 && setup.teacherN === 3, setup);

    const fastIds = () => STATE.reviewQueue.map(c => c.id);
    const run = async (filter, deckId) => ev(async ([f, d]) => {
      STATE.studySettings.reviewOriginFilter = f;
      await startDeckReviewSession(d);
      return { n: STATE.reviewQueue.length, origins: [...new Set(STATE.reviewQueue.map(c => c.origin))].sort(), allInDeck: STATE.reviewQueue.every(c => c.deckId != null), deckSession: STATE.reviewSessionDeckId, persisted: STATE.studySettings.reviewOriginFilter,
        sumCounts: (() => { const s = deckReviewSummary(d); return { total: s.totalCards, elig: s.eligibleCards }; })() };
    }, [filter, deckId]);

    // 1-4) Teacher Deck x todos os filtros
    for (const [f, label] of [['all', 'todos'], ['self', 'meus cartoes'], ['teacher', 'da professora'], ['study', 'da trilha']]){
      const r = await run(f, 7101);
      check(`${lang} Teacher Deck + filtro ${label}: 3 Teacher Cards entram`, r.n === 3 && r.origins.join() === 'teacher' && r.deckSession === 7101 && r.persisted === f, r);
      check(`${lang} Teacher Deck + filtro ${label}: resumo/contagem = escopo do Deck`, r.sumCounts.total === 3 && r.sumCounts.elig === 3, r.sumCounts);
    }
    // Teacher root (subtree) idem
    let r = await run('self', 7100);
    check(lang + ' Teacher root + filtro self: subtree inteira entra', r.n === 3 && r.origins.join() === 'teacher', r);
    // 5) Deck pessoal com filtro incompatível
    r = await run('teacher', 7001);
    check(lang + ' Deck pessoal + filtro teacher: 2 cards self entram', r.n === 2 && r.origins.join() === 'self', r);
    r = await run('study', 7001);
    check(lang + ' Deck pessoal + filtro study: 2 cards self entram', r.n === 2 && r.origins.join() === 'self', r);
    // 6) Course Deck com filtro incompatível
    for (const f of ['self', 'teacher']){
      r = await run(f, setup.courseId);
      check(`${lang} Course Deck + filtro ${f}: cards da trilha entram`, r.n > 0 && r.origins.join() === 'study', r);
    }
    // 4b) filtro study nao amplia: escopo do Deck continua so o do Deck
    r = await run('study', 7101);
    check(lang + ' filtro study não altera escopo: nada de fora do Deck', r.n === 3 && r.origins.join() === 'teacher', r);

    // 7) Review geral fora de Deck: filtro continua funcionando
    for (const [f, origin] of [['teacher', 'teacher'], ['self', 'self'], ['study', 'study']]){
      const g = await ev(([f]) => { STATE.studySettings.reviewOriginFilter = f; const p = eligibleReviewPool(); STATE.reviewSessionUnitFilter = null; STATE.reviewSessionDeckId = null; /* mesma entrada de openReviewSession */ startReviewSession(); return { pool: [...new Set(p.map(c => c.origin))].sort(), queue: [...new Set(STATE.reviewQueue.map(c => c.origin))].sort(), deckSession: STATE.reviewSessionDeckId }; }, [f]);
      check(`${lang} Review geral filtro ${f}: só origem ${origin}`, g.pool.join() === origin && g.queue.every(o => o === origin) && g.deckSession === null, g);
    }
    const gAll = await ev(() => { STATE.studySettings.reviewOriginFilter = 'all'; return [...new Set(eligibleReviewPool().map(c => c.origin))].sort(); });
    check(lang + ' Review geral filtro all: todas as origens', gAll.join() === 'self,study,teacher', gAll);

    // 8) valor persistido intacto entrar/sair de Deck (inclusive serializado)
    r = await ev(async () => {
      STATE.studySettings.reviewOriginFilter = 'self';
      await startDeckReviewSession(7101);
      const during = STATE.studySettings.reviewOriginFilter;
      STATE.reviewSessionDeckId = null; startReviewSession();
      const gq = [...new Set(STATE.reviewQueue.map(c => c.origin))].sort();
      const ser = JSON.stringify(serializeState()).includes('"reviewOriginFilter":"self"');
      return { during, after: STATE.studySettings.reviewOriginFilter, gq, ser };
    });
    check(lang + ' reviewOriginFilter persistido intacto (sessão de Deck e volta ao geral)', r.during === 'self' && r.after === 'self' && r.ser && r.gq.every(o => o === 'self'), r);

    // 10) Deck continua respeitando elegibilidade/FSRS/estado/arquivo/permissão
    r = await ev(async () => {
      STATE.studySettings.reviewOriginFilter = 'self';
      const tc = STATE.cards.filter(c => c.deckId === 7101);
      tc[0].flashcardStatus = 'archived';               // arquivado sai (elegibilidade)
      const due = Date.now() + 5 * 864e5; tc[1].reps = 3; tc[1].state = 'review'; tc[1].due = due; // review nao-vencido: sai da fila due
      await startDeckReviewSession(7101);
      const ids = STATE.reviewQueue.map(c => c.id);
      const out = { ids: ids.length, hasArchived: ids.includes(tc[0].id), hasFuture: ids.includes(tc[1].id), hasNew: ids.includes(tc[2].id), counts: deckCountsForReview(7101), sum: deckReviewSummary(7101) };
      tc[0].flashcardStatus = 'active'; tc[1].reps = 0; tc[1].state = 'new';
      return out;
    });
    check(lang + ' Deck: arquivado fora, review não-vencido fora, novo dentro', !r.hasArchived && !r.hasFuture && r.hasNew, r);
    check(lang + ' Deck: contagens New/Learning/Review por estado (não por origem)', r.counts.new === 1 && r.counts.review === 1 && r.counts.reviewDue === 0 && r.counts.due === 0 /* K.5: review = estado; due separado */ && r.sum.archivedCards === 1 && r.sum.eligibleCards === 2, r);
    // FSRS: grade dentro de sessão de Deck com filtro incompatível
    r = await ev(async () => { STATE.studySettings.reviewOriginFilter = 'study'; await startDeckReviewSession(7101); const c = STATE.reviewQueue[0]; const reps0 = c.reps; gradeCurrentCard(2); return { reps: c.reps, reps0, deckId: c.deckId, origin: c.origin, filter: STATE.studySettings.reviewOriginFilter }; });
    check(lang + ' FSRS: grade funciona; deckId/origem preservados; filtro persistido', r.reps === r.reps0 + 1 && r.deckId === 7101 && r.origin === 'teacher' && r.filter === 'study', r);
    // Permissão: Deck sem cards do usuário (deck alheio) continua vazio -- Deck Engine/RLS mandam
    r = await ev(async () => { STATE.studySettings.reviewOriginFilter = 'all'; await startDeckReviewSession(99999); return { n: STATE.reviewQueue.length }; });
    check(lang + ' Deck inexistente/alheio: nada entra', r.n === 0, r);
    // Estrutura: eligibleReviewPool geral inalterada e eligibleDeckReviewPool sem origem
    r = await ev(() => { STATE.studySettings.reviewOriginFilter = 'teacher'; return { gen: eligibleReviewPool().every(c => c.origin === 'teacher'), deck: [...new Set(eligibleDeckReviewPool().map(c => c.origin))].sort() }; });
    check(lang + ' estrutura: geral filtra, pool do Deck não filtra origem', r.gen && r.deck.join() === 'self,study,teacher', r);

    check(lang + ' nenhum pageerror', errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Fase H (origin filter) playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
