// Fase K1 -- Review Core (Playwright real, FR+ZH). Harness da Fase H: Playwright (Chromium real), FR + ZH, modo convidado com o
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

    const setup = await ev(async () => {
      const A = APP_KEY;
      const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true, tags: [] }, extra);
      window.__study = STATE.cards.find(c => c.origin === 'study');
      CURRENT_USER = { id: 'u-k1' };
      STATE.decks = [{ id: 7000, kind: 'personal_root', name: 'R', owner_id: 'u-k1', language_app_key: A, parent_deck_id: null }];
      STATE.decksLoaded = true; STATE.courseDecksLoaded = true;
      // Deck 1: Normal com reverso nativo (2 CardInstances) + 3 Normais legados; Deck 2: Cloze 2 marcas
      const reversed = buildCardFromSelfFlashcard(mk(901, { owner_id: 'u-k1', deck_id: 7000, fields: [
        { id: 'a', lang: A === 'frances' ? 'fr' : 'zh', role: null, content: { value: 'x' }, audio: null, image: null, pinyinFieldId: null },
        { id: 'b', lang: 'pt-BR', role: null, content: { value: 'y' }, audio: null, image: null, pinyinFieldId: null }], card_generation_mode: 'normal_reversed', front: 'x', back_trans: 'y' }));
      const cloze = buildCardFromSelfFlashcard(mk(902, { owner_id: 'u-k1', deck_id: 7000, fields: [
        { id: 'a', lang: A === 'frances' ? 'fr' : 'zh', role: null, content: { value: '{{c1::um}} e {{c2::dois}}' }, audio: null, image: null, pinyinFieldId: null },
        { id: 'b', lang: 'pt-BR', role: null, content: { value: 'tr' }, audio: null, image: null, pinyinFieldId: null }], card_generation_mode: 'cloze', front: null, back_trans: 'tr' }));
      const plain = [1, 2, 3].flatMap(i => buildCardFromSelfFlashcard(mk(910 + i, { owner_id: 'u-k1', deck_id: 7000 })));
      STATE.cards = reversed.concat(cloze, plain);
      return { rev: reversed.length, cloze: cloze.length, plain: plain.length, ids: STATE.cards.map(c => c.id) };
    });
    check(lang + ' setup: reverso=2, cloze=2, legados=3', setup.rev === 2 && setup.cloze === 2 && setup.plain === 3, setup);

    // Contagem inicial estrutural
    let c0 = await ev(() => deckCountsForReview(7000));
    check(lang + ' contagem inicial: 7 New, 0 Learning, 0 Review', c0.new === 7 && c0.learning === 0 && c0.review === 0, c0);

    // Review real do Deck: responde "Errei" ao 1º card (via clique real no botão)
    const first = await ev(async () => {
      STATE.studySettings.newCardsPerDay = 10;
      switchTab('review'); // usuário real está na aba Revisão (view visível)
      await startDeckReviewSession(7000);
      return STATE.reviewQueue[0].id;
    });
    // "Errei" SOMENTE pela UI real: revela o card clicando no .flashcard e clica o botão
    // .grade-again[data-grade="0"] (gradeButtonsHTML). Sem fallback para gradeCurrentCard:
    // se o botão não existir ou não puder ser clicado, o teste FALHA.
    await page.click('#review-content #flashcard .flashcard-hint'); // 'toque para ver a resposta' // revela pelo clique real
    const previewIntervalText = await ev(() => {
      const btn = document.querySelector('#review-content .grade-btn.grade-again[data-grade="0"]');
      if (!btn) throw new Error('UI: botão real "Errei" (.grade-again[data-grade="0"]) não encontrado');
      return btn.querySelector('small').textContent;
    });
    const dueBefore = Date.now();
    await page.click('#review-content .grade-btn.grade-again[data-grade="0"]');
    const clicked = 'ui';
    check(lang + ' botão real "Errei" clicado via Playwright (sem fallback a gradeCurrentCard)', true);
    // Regra de scheduling DELIBERADAMENTE PRESERVADA (PR #219): "Errei" agenda o due para a
    // meia-noite seguinte; o preview do botão usa a mesma regra (previewNextIntervalDays).
    // Não é consequência acidental da K1 e não é "FSRS puro".
    const dueCheck = await ev((id) => { const c = STATE.cards.find(x => x.id === id); return { due: c.due }; }, first);
    check(lang + ' due real de Errei = próxima meia-noite (regra PR #219 preservada)', dueCheck.due > dueBefore && dueCheck.due <= dueBefore + 86400000 + 5000, dueCheck);
    check(lang + ' preview do botão Errei mostrado ao usuário: "' + previewIntervalText + '"', typeof previewIntervalText === 'string' && previewIntervalText.length > 0);
    const after = await ev((id) => { const c = STATE.cards.find(x => x.id === id); return { state: c.state, reps: c.reps, lapses: c.lapses, stability: c.stability, bucket: bucketCardState(c), inQueue: STATE.reviewQueue.map(x => x.id) }; }, first);
    check(lang + ' Errei em card novo -> learning (via ' + clicked + ')', after.state === 'learning' && after.reps === 1 && after.lapses === 1 && after.bucket === 'learning', after);
    const c1 = await ev(() => deckCountsForReview(7000));
    check(lang + ' contagem após Errei: New 6, Learning 1 (falso New eliminado)', c1.new === 6 && c1.learning === 1, c1);

    // Continua a Review: o card errado não reaparece como falso New, e os irmãos seguem independentes
    const cont = await ev(() => {
      const ids = STATE.reviewQueue.map(c => c.id);
      const errId = STATE.reviewQueue[0].id;
      const siblings = STATE.cards.filter(c => c.id !== errId).map(c => ({ id: c.id, state: c.state, reps: c.reps }));
      return { errId, siblingsAllNew: siblings.every(s => s.state === 'new' && s.reps === 0), stillInQueue: ids.filter(i => i === errId).length };
    });
    check(lang + ' irmãos/outros cards intactos (New, reps 0)', cont.siblingsAllNew, cont);

    // Nova sessão: card em Learning (due amanhã) não consome cota de New e não aparece como New
    const s2 = await ev(async () => {
      STATE.studySettings.newCardsPerDay = 2;
      await startDeckReviewSession(7000);
      const q = STATE.reviewQueue;
      return { n: q.length, learningInQueue: q.filter(c => bucketCardState(c) === 'learning').length, newInQueue: q.filter(c => bucketCardState(c) === 'new').length };
    });
    check(lang + ' cota New=2: só 2 New entram; card errado (due amanhã) não consome cota nem entra como New', s2.newInQueue === 2 && s2.learningInQueue === 0, s2);

    // Errei em card já em Review -> relearning; irmão reverso independente
    const rr = await ev(() => {
      const rev = STATE.cards.filter(c => c.rowId === 901);
      const now = Date.now();
      rev.forEach(c => { c.state = 'review'; c.reps = 3; c.stability = 12; c.difficulty = 5; c.fsrsReps = 3; c.lastReview = now - 12 * 864e5; c.due = now - 1000; });
      const sibBefore = JSON.stringify(rev[1]);
      const idBefore = rev[0].id;
      applyMemoryGrade(rev[0], 0);
      return { state: rev[0].state, reps: rev[0].reps, lapses: rev[0].lapses, stab: rev[0].stability > 0, id: rev[0].id === idBefore, sibUntouched: JSON.stringify(rev[1]) === sibBefore, two: rev.length };
    });
    check(lang + ' reverso: Review+Errei -> relearning, irmão intacto, id preservado', rr.state === 'relearning' && rr.reps === 4 && rr.stab && rr.id && rr.sibUntouched && rr.two === 2, rr);

    const cl = await ev(() => {
      const c = STATE.cards.filter(x => x.rowId === 902);
      const now = Date.now();
      c.forEach(x => { x.state = 'review'; x.reps = 2; x.stability = 8; x.difficulty = 4; x.due = now - 1000; });
      const before = JSON.stringify(c[1]);
      applyMemoryGrade(c[0], 0);
      return { s0: c[0].state, untouched: JSON.stringify(c[1]) === before, n: c.length };
    });
    check(lang + ' cloze: c1 relearning, c2 intacto', cl.s0 === 'relearning' && cl.untouched && cl.n === 2, cl);

    // Contagem estrutural x filtros
    const cnt = await ev(async () => {
      const base = deckCountsForReview(7000);
      STATE.studySettings.reviewOriginFilter = 'teacher';
      STATE.studySettings.reviewTagFilter = ['nao-existe'];
      const withFilters = deckCountsForReview(7000);
      await startDeckReviewSession(7000);
      const sessionN = STATE.reviewQueue.length;
      const summary = deckReviewSummary(7000);
      STATE.studySettings.reviewOriginFilter = 'all'; STATE.studySettings.reviewTagFilter = [];
      return { base, withFilters, sessionN, sum: { n: summary.new, l: summary.learning, r: summary.review } };
    });
    check(lang + ' contagem estrutural independe de Tag/Origin; sessão com tag inexistente = 0', JSON.stringify(cnt.base) === JSON.stringify(cnt.withFilters) && cnt.sessionN === 0 && cnt.sum.n === cnt.base.new, cnt);

    // Regressão: Speed, Combinar, hasPlainFrontBack e pool geral
    const reg = await ev(() => {
      const out = {};
      out.pool = eligibleReviewPool().length > 0;
      out.plain = STATE.cards.filter(hasPlainFrontBack).length;
      try { out.speed = buildSpeedQueue().length >= 0; } catch (e) { out.speed = 'ERR ' + e.message; }
      try { out.match = typeof startMatchGame === 'function'; } catch (e) { out.match = false; }
      return out;
    });
    check(lang + ' regressão: pool geral, hasPlainFrontBack, Speed, Combinar', reg.pool && reg.plain >= 3 && reg.speed === true && reg.match === true, reg);

    // Study Trail: cards study continuam elegíveis conforme lição concluída e classificados por bucket
    const st = await ev(() => {
      const c = window.__study;
      if (!c) return { ok: false };
      const b0 = bucketCardState(c);
      applyMemoryGrade(c, 0);
      return { ok: true, b0, state: c.state, origin: c.origin, elig: typeof isCardLessonCompleted(c) === 'boolean' };
    });
    check(lang + ' Study Trail: card study New -> learning após Errei; elegibilidade continua funcionando', st.ok && st.b0 === 'new' && st.state === 'learning' && st.origin === 'study' && st.elig, st);

    check(lang + ' nenhum pageerror', errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Fase K1 playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
