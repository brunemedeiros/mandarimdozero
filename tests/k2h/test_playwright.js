// K2-H -- "Estudar este Deck" (Playwright real, FR+ZH). Base: harness da Fase K1. Harness da Fase H: Playwright (Chromium real), FR + ZH, modo convidado com o
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
      const A = APP_KEY, L = A === 'frances' ? 'fr' : 'zh';
      const fld = (id, lang, v) => ({ id, lang, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
      const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true, tags: [] }, extra);
      CURRENT_USER = { id: 'u-h2' };
      STATE.decksLoaded = true; STATE.courseDecksLoaded = true;
      STATE.decks = [
        { id: 7000, kind: 'personal_root', name: 'R', owner_id: 'u-h2', language_app_key: A, parent_deck_id: null },
        { id: 7001, kind: 'personal', name: 'Sub', owner_id: 'u-h2', language_app_key: A, parent_deck_id: 7000 },
        { id: 7002, kind: 'personal', name: 'Vazio', owner_id: 'u-h2', language_app_key: A, parent_deck_id: 7000 },
        { id: 7003, kind: 'personal_root', name: 'Outro', owner_id: 'u-h2', language_app_key: A, parent_deck_id: null },
        { id: 7100, kind: 'teacher_root', name: 'T', owner_id: 'u-h2', teacher_id: 't-1', language_app_key: A, parent_deck_id: null },
      ];
      window.__decks = STATE.decks.slice();
      const o = { owner_id: 'u-h2' };
      const rev = buildCardFromSelfFlashcard(mk(901, Object.assign({ deck_id: 7000, fields: [fld('a', L, 'AAA'), fld('b', 'pt-BR', 'BBB')], card_generation_mode: 'normal_reversed', front: 'AAA', back_trans: 'BBB' }, o)));
      const cloze = buildCardFromSelfFlashcard(mk(902, Object.assign({ deck_id: 7001, fields: [fld('a', L, '{{c1::um}} e {{c2::dois}}'), fld('b', 'pt-BR', 'tr')], card_generation_mode: 'cloze', front: null, back_trans: 'tr' }, o)));
      const other = buildCardFromSelfFlashcard(mk(903, Object.assign({ deck_id: 7003 }, o)));
      const arch = buildCardFromSelfFlashcard(mk(904, Object.assign({ deck_id: 7000, status: 'archived' }, o)));
      const teach = buildCardFromTeacherFlashcard(mk(905, { teacher_id: 't-1', student_id: 'u-h2', deck_id: 7100 }));
      const study = STATE.cards.find(c => c.origin === 'study');
      STATE.cards = [].concat(rev, cloze, other, arch, teach, [study]);
      STATE.studySettings.newCardsPerDay = 50; STATE.studySettings.reviewOriginFilter = 'all'; STATE.studySettings.reviewTagFilter = [];
      return { rev: rev.map(c => c.id), cloze: cloze.map(c => c.id), other: other.map(c => c.id), teach: teach.map(c => c.id), study: study.id };
    });
    check(lang + ' setup A+B=2, cloze=2', setup.rev.length === 2 && setup.cloze.length === 2, setup);

    // estado stale de uma sessão anterior não pode contaminar
    await ev(() => { STATE.reviewSessionDeckId = 9999; STATE.reviewCardState = { kind: 'x' }; });
    // usuário REAL está em "Meus Cartões" (view do botão), não na Review
    await ev(() => switchTab('my-flashcards'));
    await page.waitForTimeout(300);
    await ev(() => { STATE.decks = window.__decks.slice(); }); // a view real recarrega Decks do backend (stub vazio)
    const pre = await ev(() => ({ reviewActive: document.getElementById('view-review').classList.contains('active') }));
    check(lang + ' pré: view Review NÃO ativa (condição do bug)', pre.reviewActive === false);

    await ev(() => startDeckReviewSession(7000));
    const s1 = await ev(() => ({
      reviewActive: document.getElementById('view-review').classList.contains('active'),
      tab: document.getElementById('app').dataset.activeTab,
      sessionVisible: getComputedStyle(document.getElementById('review-session-wrap')).display !== 'none',
      modeHidden: getComputedStyle(document.getElementById('review-mode-select-wrap')).display === 'none',
      hasFlashcard: !!document.querySelector('#review-content #flashcard'),
      ids: STATE.reviewQueue.map(c => c.id), deckId: STATE.reviewSessionDeckId, hash: location.hash,
    }));
    check(lang + ' Deck: aba Review ativa', s1.reviewActive && s1.tab === 'review', s1);
    check(lang + ' Deck: sessão visível e primeiro card renderizado', s1.sessionVisible && s1.modeHidden && s1.hasFlashcard, s1);
    const expect = new Set([...setup.rev, ...setup.cloze]);
    check(lang + ' escopo: subtree (A,B,c1,c2); sem outro deck/arquivado/teacher/trilha', s1.ids.length === expect.size && s1.ids.every(i => expect.has(i)), s1.ids);
    check(lang + ' deckId na sessão e hash da rota', s1.deckId === 7000 && s1.hash === '#/review/deck/7000', s1);

    // direção estrutural: A mostra AAA na frente, B mostra BBB
    const dirs = await ev((ids) => ids.map(id => { const c = STATE.cards.find(x => x.id === id); const v = resolveCardContentView(c); return { id, front: v.front && v.front.text }; }), setup.rev);
    check(lang + ' A frente=AAA, B frente=BBB (estrutural)', dirs[0].front === 'AAA' && dirs[1].front === 'BBB', dirs);

    // responde via UI real o 1º card, avança ao 2º
    const firstId = s1.ids[0];
    const card0 = await ev((id) => { const c = STATE.cards.find(x => x.id === id); return { type: c.cardInstance.cardTypeId }; }, firstId);
    if (card0.type === 'normal'){
      await page.click('#review-content #flashcard .flashcard-hint');
      await page.click('#review-content .grade-btn.grade-good[data-grade="2"]');
    } else {
      await ev(() => gradeCurrentCard(2));
    }
    const s2 = await ev((id) => ({ idx: STATE.reviewIndex, reps: STATE.cards.find(x => x.id === id).reps, rendered: !!document.querySelector('#review-content .flashcard, #review-content .cloze-sentence, #review-content .mc-options') }), firstId);
    check(lang + ' grade aplicada e avançou ao 2º CardInstance', s2.idx === 1 && s2.reps === 1 && s2.rendered, s2);
    const indep = await ev((ids) => ids.map(id => STATE.cards.find(x => x.id === id).reps), setup.rev);
    check(lang + ' FSRS independente: irmão não-avaliado segue reps=0', indep.filter(r => r === 0).length >= 1, indep);

    // restauração (Voltar/recarregar): mesma rota recria o escopo do Deck
    const rs = await ev(async () => {
      STATE.reviewQueue = []; STATE.reviewSessionDeckId = null;
      const before = history.length;
      renderRoute(hashToRoute(location.hash));
      await new Promise(r => setTimeout(r, 300));
      return { deckId: STATE.reviewSessionDeckId, n: STATE.reviewQueue.length, pushed: history.length - before };
    });
    check(lang + ' restauração mantém escopo do Deck e não empilha histórico', rs.deckId === 7000 && rs.n > 0 && rs.pushed === 0, rs);

    // subdeck sozinho
    const sub = await ev(async () => { await startDeckReviewSession(7001); return STATE.reviewQueue.map(c => c.id); });
    check(lang + ' subdeck: só os clozes', sub.length === setup.cloze.length && sub.every(i => setup.cloze.includes(i)), sub);
    // Deck só com subdeck (nenhuma Note direta) e Deck vazio
    const empty = await ev(async () => { await startDeckReviewSession(7002); return { n: STATE.reviewQueue.length, txt: document.getElementById('review-content').textContent, active: document.getElementById('view-review').classList.contains('active') }; });
    check(lang + ' Deck vazio: estado vazio do Deck', empty.n === 0 && empty.active && /Nenhum cartão neste Deck/.test(empty.txt), empty);
    // Teacher Deck
    const t = await ev(async () => { await startDeckReviewSession(7100); return STATE.reviewQueue.map(c => c.origin); });
    check(lang + ' Teacher Deck estuda cartão da professora', t.length === 1 && t[0] === 'teacher', t);

    // sair da sessão
    await ev(async () => { await startDeckReviewSession(7000); });
    await page.click('#review-back-to-modes');
    const ex = await ev(() => ({ deckId: STATE.reviewSessionDeckId, mode: getComputedStyle(document.getElementById('review-mode-select-wrap')).display !== 'none', sess: getComputedStyle(document.getElementById('review-session-wrap')).display === 'none' }));
    check(lang + ' sair: volta ao seletor e limpa escopo de Deck', ex.deckId === null && ex.mode && ex.sess, ex);

    check(lang + ' sem pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\nK2-H Playwright: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
