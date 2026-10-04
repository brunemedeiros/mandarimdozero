// K.7 -- Student Analytics (próprio aluno): Progresso, lembrete de revisão,
// progresso de unidade, Decks. Playwright (Chromium real), FR + ZH, código real.
// Rodar: node tests/k7/test_k7_student_analytics.js
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
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const ev = (fn, a) => page.evaluate(fn, a);

    // helpers no navegador
    await ev(() => {
      window.PAST = 1000; window.FUT = 99999999999999;
      window.mk = (o, id, row, over) => Object.assign({ id, origin: o, rowId: row, flashcardStatus: 'active', reps: 1, lapses: 0, interval: 10, state: 'learning', due: window.PAST, unitId: null, vocabIdx: null }, over || {});
      window.NEWC = { reps: 0, state: 'new', due: 0, interval: 0 };
      window.stat = (k) => { const e = document.querySelector(`#stat-cards [data-stat="${k}"] .num`); return e ? e.textContent : null; };
      window.learnedLabel = () => [...document.querySelectorAll('#stat-cards .stat-card')].find(c => c.querySelector('.label').textContent === 'Palavras aprendidas').querySelector('.num').textContent;
      window.setCards = (extra) => { STATE.cards = buildCardsFromUnits(UNITS).concat(extra); STATE.studySettings.reviewOriginFilter = 'all'; STATE.studySettings.reviewTagFilter = []; };
      window.progress = () => { renderProgressView(); };
    });
    const totalWords = await ev(() => studyTrailWordProgress(buildCardsFromUnits(UNITS)).total);

    // 1) Study: A/B = 1 palavra; denominador = curso inteiro
    await ev(() => { setCards([]); const a = STATE.cards.find(c => c.origin === 'study'); const b = STATE.cards.find(c => c.id === a.id + '-b'); Object.assign(a, { reps: 2, state: 'review', interval: 10, due: FUT }); Object.assign(b, { reps: 2, state: 'review', interval: 10, due: FUT }); progress(); });
    L('1 Study: A e B estudados = 1 palavra / curso inteiro', (await ev(() => learnedLabel())) === `1/${totalWords}`, await ev(() => learnedLabel()));

    // 2) Mistura: Teacher e Self não contaminam "Palavras aprendidas", ficam separados
    await ev(() => { setCards([mk('teacher', 't1', 1), mk('teacher', 't1-b', 1, NEWC), mk('self', 's1', 1), mk('self', 's2', 2, NEWC)]); progress(); });
    L('2 palavras aprendidas ignora Teacher/Self', (await ev(() => learnedLabel())) === `0/${totalWords}`);
    L('2 conteúdos Teacher: 1 de 1 (2 cartões = 1 Note)', (await ev(() => stat('content-teacher'))) === '1/1');
    L('2 conteúdos Self: 1 de 2, separado do Teacher', (await ev(() => stat('content-self'))) === '1/2');
    L('2 rótulos distintos Teacher x Self', await ev(() => document.querySelector('[data-stat="content-teacher"] .label').textContent !== document.querySelector('[data-stat="content-self"] .label').textContent));

    // 3) Sem conteúdo Teacher/Self: cards não aparecem
    await ev(() => { setCards([]); progress(); });
    L('3 sem Teacher/Self: sem cartões de conteúdo', (await ev(() => stat('content-teacher'))) === null && (await ev(() => stat('content-self'))) === null);

    // 4) Reverse 2 cards/1 conteúdo; Cloze N cards/1 conteúdo; -rN agrupa por rowId; arquivado fora
    await ev(() => { setCards([
      mk('teacher', 't1', 1), mk('teacher', 't1-b', 1, NEWC),
      mk('teacher', 't2-c1', 2), mk('teacher', 't2-c2', 2), mk('teacher', 't2-c3', 2, NEWC),
      mk('teacher', 't3-r2', 3, NEWC), mk('teacher', 't3-r2-b', 3, NEWC),
      mk('teacher', 't4', 4, { flashcardStatus: 'archived' })]); progress(); });
    L('4 Teacher: 3 conteúdos (Reverse, Cloze, -rN), arquivado fora; 2 estudados', (await ev(() => stat('content-teacher'))) === '2/3', await ev(() => stat('content-teacher')));
    const c4 = await ev(() => ({ n: stat('new'), l: stat('learning'), r: stat('review'), d: stat('due') }));
    L('4 N/L/R/D por CardInstance (7 ativos): 4 novos, 3 aprendendo, 3 devidos', c4.n === '4' && c4.l === '3' && c4.r === '0' && c4.d === '3', c4);

    // 5) Review vencido x não vencido
    await ev(() => { setCards([mk('teacher', 'ta', 1, { state: 'review', due: PAST }), mk('teacher', 'tb', 2, { state: 'review', due: FUT })]); progress(); });
    const c5 = await ev(() => ({ r: stat('review'), d: stat('due') }));
    L('5 Review não vencido conta em Para revisar mas não em Devidos', c5.r === '2' && c5.d === '1', c5);

    // 6) Para estudar hoje = regra do Review; respeita filtro; Novos/Devidos ignoram o filtro
    await ev(() => { setCards([mk('teacher', 'ta', 1, { state: 'review', due: PAST }), mk('self', 'sa', 2, { state: 'review', due: PAST })]); progress(); });
    const today1 = await ev(() => ({ ui: stat('today'), rule: String(trueDueReviewCount(eligibleReviewPool())) }));
    L('6 Para estudar hoje = trueDueReviewCount(eligibleReviewPool())', today1.ui === today1.rule && today1.ui === '2', today1);
    await ev(() => { STATE.studySettings.reviewOriginFilter = 'teacher'; progress(); });
    const today2 = await ev(() => ({ ui: stat('today'), rule: String(trueDueReviewCount(eligibleReviewPool())), d: stat('due') }));
    L('6 filtro de origem muda Para estudar hoje (1) mas não Devidos (2)', today2.ui === '1' && today2.rule === '1' && today2.d === '2', today2);

    // 7) Strength Note-level: Não iniciada separada de Fraca; weakest; New não rebaixa
    const st = await ev(() => {
      STATE.studySettings.reviewOriginFilter = 'all';
      const only = (extra) => { STATE.cards = extra; return vocabStrengthBuckets(); };
      return {
        notStarted: only([mk('teacher', 'a', 1, NEWC), mk('teacher', 'a-b', 1, NEWC)]),
        newSibling: only([mk('teacher', 'a', 1, { interval: 90, state: 'review', due: FUT }), mk('teacher', 'a-b', 1, NEWC)]),
        weakest: only([mk('teacher', 'a', 1, { interval: 90, state: 'review', due: FUT }), mk('teacher', 'a-b', 1, { lapses: 2 })]),
      };
    });
    L('7 nenhuma irmã estudada = Não iniciada, não Fraca', st.notStarted.notStarted === 1 && st.notStarted.weak === 0, st.notStarted);
    L('7 irmã New não rebaixa (Forte)', st.newSibling.strong === 1 && st.newSibling.weak === 0, st.newSibling);
    L('7 weakest entre estudadas (Fraca)', st.weakest.weak === 1 && st.weakest.strong === 0, st.weakest);

    // 8) Lembrete de revisão: New (due=0) NÃO conta como pendente
    const rem = await ev(() => {
      const banner = document.getElementById('review-reminder-banner'); const out = {};
      saveState = () => {};
      STATE.lastReviewReminderDay = null; banner.style.display = 'none';
      STATE.cards = Array.from({ length: 20 }, (_, i) => mk('self', 's' + i, i + 1, NEWC));
      maybeShowReviewReminder(); out.newOnly = { shown: banner.style.display !== 'none', day: STATE.lastReviewReminderDay };
      STATE.lastReviewReminderDay = null; banner.style.display = 'none';
      STATE.cards = Array.from({ length: 15 }, (_, i) => mk('self', 's' + i, i + 1, { state: 'review' })).concat(Array.from({ length: 5 }, (_, i) => mk('self', 'n' + i, 100 + i, NEWC)));
      maybeShowReviewReminder(); out.due15 = { shown: banner.style.display !== 'none', n: document.getElementById('review-reminder-count').textContent };
      return out;
    });
    L('8 20 cartões New não disparam o lembrete', rem.newOnly.shown === false && rem.newOnly.day === null, rem.newOnly);
    L('8 15 vencidos + 5 New: lembrete com 15 (só Devidos)', rem.due15.shown === true && rem.due15.n === '15', rem.due15);

    // 9) Progresso da unidade: dueForReview = Devido estrutural (New fora)
    const unit = await ev(() => {
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab && x.vocab.length);
      STATE.cards = buildCardsFromUnits(UNITS); const before = unitCardCounts(u.id).dueForReview;
      const a = STATE.cards.find(c => c.id === `u${u.id}-v0`); Object.assign(a, { reps: 2, state: 'review', interval: 5, due: PAST });
      return { before, after: unitCardCounts(u.id).dueForReview };
    });
    L('9 unidade: tudo New = 0 devidos; 1 Review vencido = 1', unit.before === 0 && unit.after === 1, unit);

    // 10) Decks: contadores iguais ao K5 (structuralCounts do escopo da subárvore)
    const deck = await ev(() => {
      STATE.decks = [{ id: 1, kind: 'root', owner_id: 'u', parent_deck_id: null, language_app_key: APP_KEY, name: 'r' },
                     { id: 2, kind: 'personal_root', owner_id: 'u', parent_deck_id: 1, language_app_key: APP_KEY, name: 'Meus Decks' },
                     { id: 3, kind: 'personal', owner_id: 'u', parent_deck_id: 2, language_app_key: APP_KEY, name: 'A' }];
      STATE.cards = [mk('self', 's1', 1, { deckId: 3, state: 'review', due: PAST }), mk('self', 's1-b', 1, { deckId: 3, ...NEWC }),
                     mk('self', 's2', 2, { deckId: 2, state: 'review', due: FUT }), mk('self', 's3', 3, { deckId: null })];
      const c = deckCountsForReview(2); const sc = structuralCounts(getStudyScopeForDeck(STATE.decks, 2, eligibleDeckReviewPool()));
      return { c, sc };
    });
    L('10 Deck (subárvore) = structuralCounts do mesmo escopo', deck.c.total === deck.sc.cards && deck.c.new === deck.sc.new && deck.c.learning === deck.sc.learning && deck.c.review === deck.sc.review && deck.c.due === deck.sc.due && deck.c.total === 3 && deck.c.due === 1, deck);

    // 11) estatísticas não expõem dados de professora administrativos
    L('11 Progresso não exibe campos administrativos', await ev(() => { progress(); return !/arquivad|rowId|teacher_id/i.test(document.getElementById('stat-cards').innerText); }));
    L('nenhum erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`K.7 student analytics: ${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
