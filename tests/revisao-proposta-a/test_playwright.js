// Revisão: Proposta A + partes da B (aprovadas em 07/10/2026). Playwright,
// FR + ZH: total de hoje no topo, "Estudar tudo (N)", sessão de 5 minutos,
// semana de revisão com meta de 5 dias, recordes nos modos e força da
// memória na tela do Deck. Harness copiado de tests/deck-browser.
// Rodar: node tests/revisao-proposta-a/test_playwright.js
// Harness da Fase H: convidado + Supabase stubado em memória; "autenticado"
// = CURRENT_USER setado depois do boot. O stub grava as escritas em
// own_flashcards/decks para conferir o que foi enviado ao banco.
// Rodar: node tests/deck-browser/test_playwright.js
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
  window.__DB = { decks: [], own_flashcards: [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return row[k] === v; }
    const exec = () => {
      const rows = (window.__DB[table] || []);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.patch));
        window.__writes.push({ table, op: 'update', patch: st.patch, ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (st.op === 'delete'){
        const hit = rows.filter(match);
        window.__DB[table] = rows.filter(r => !hit.includes(r));
        window.__writes.push({ table, op: 'delete', ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (table === 'decks') return rows.filter(match);
      return rows.filter(match);
    };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => Promise.resolve({ data: exec(), error: null }).then(ok, ko);
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
      if (prop === 'update') return (p) => { st.op = 'update'; st.patch = p; return b; };
      if (prop === 'delete') return () => { st.op = 'delete'; return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1200, height: 900 }, colorScheme: theme || 'light' });
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

// Árvore: root(9000) > Meus Decks(9001) > Verbos(9002) > Irregulares(9003); Comida(9004)
//         root > Cartões da professora(9100)
//         Curso (9200, sem parent) > unidade (9201, ligada à 1ª unidade de UNITS)
async function setup(page){
  return page.evaluate(() => {
    const A = APP_KEY, U = 'u-db';
    CURRENT_USER = { id: U };
    const unit = UNITS.find(u => (u.vocab || []).length);
    STATE.unitProgress = STATE.unitProgress || {};
    STATE.unitProgress[unit.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} };
    STATE.decks = [
      { id: 9000, kind: 'root', name: A === 'frances' ? 'Francês' : 'Mandarim', owner_id: U, language_app_key: A, parent_deck_id: null },
      { id: 9001, kind: 'personal_root', name: 'Meus Decks', owner_id: U, language_app_key: A, parent_deck_id: 9000 },
      { id: 9002, kind: 'personal', name: 'Verbos', owner_id: U, language_app_key: A, parent_deck_id: 9001 },
      { id: 9003, kind: 'personal', name: 'Irregulares', owner_id: U, language_app_key: A, parent_deck_id: 9002 },
      { id: 9004, kind: 'personal', name: 'Comida', owner_id: U, language_app_key: A, parent_deck_id: 9001 },
      { id: 9100, kind: 'teacher_root', name: 'Cartões da professora', owner_id: U, teacher_id: 't', language_app_key: A, parent_deck_id: 9000 },
      { id: 9200, kind: 'course', name: 'Curso', owner_id: null, language_app_key: A, parent_deck_id: null, course_unit_id: null },
      { id: 9201, kind: 'course', name: unit.title, owner_id: null, language_app_key: A, parent_deck_id: 9200, course_unit_id: String(unit.id) },
    ];
    STATE.courseDecksLoaded = true;
    assignCourseDeckIds(STATE.cards, buildCourseDeckIndex(STATE.decks, A));
    const rows = [
      { id: 501, deck_id: 9002, front: 'aller', back_trans: 'ir', tags: ['verbo'] },
      { id: 502, deck_id: 9003, front: 'être', back_trans: 'ser', tags: ['verbo', 'irregular'] },
      { id: 503, deck_id: 9004, front: 'pain', back_trans: 'pão', tags: ['comida'] },
      { id: 504, deck_id: 9004, front: 'eau', back_trans: 'água', tags: [] },
    ].map(r => Object.assign({ owner_id: U, language_app_key: A, status: 'active', revision: 0, front_is_target_language: true }, r));
    window.__DB.own_flashcards = rows.map(r => Object.assign({}, r));
    window.__DB.decks = STATE.decks.map(d => Object.assign({}, d));
    // Aluno vinculado à professora neste idioma (senão "Cartões da professora" some).
    window.__DB.teacher_students = [{ id: 1, teacher_id: 't', student_id: U, language_app_key: A, status: 'active' }];
    DECK_BROWSER.teacherLink = {};
    rows.forEach(r => buildCardFromSelfFlashcard(r).forEach(c => STATE.cards.push(c)));
    // 1 cartão da professora no teacher_root
    buildCardFromTeacherFlashcard({ id: 601, teacher_id: 't', student_id: U, language_app_key: A, status: 'active', revision: 0, front: 'prof', back_trans: 'p', front_is_target_language: true, tags: ['aula'], deck_id: 9100 }).forEach(c => STATE.cards.push(c));
    try { localStorage.removeItem('deckBrowserCollapsed:' + A); } catch (e) {}
    return { unitTitle: unit.title, courseCards: STATE.cards.filter(c => c.deckId === 9201).length };
  });
}



const SHOTS = process.env.SHOT_DIR || require('os').tmpdir();

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    await setup(page);
    // Estados controlados: 501 forte, 502 fraca e difícil, 503 média e vencida, 504 nova.
    await page.evaluate(() => {
      const day = 86400000, now = Date.now();
      const byRow = id => STATE.cards.filter(c => c.rowId === id);
      byRow(501).forEach(c => Object.assign(c, { reps: 4, lapses: 0, interval: 90, state: 'review', due: now + 30 * day, difficulty: 3, stability: 90 }));
      byRow(502).forEach(c => Object.assign(c, { reps: 3, lapses: 2, interval: 2, state: 'review', due: now - day, difficulty: 8, stability: 2 }));
      byRow(503).forEach(c => Object.assign(c, { reps: 1, lapses: 0, interval: 5, state: 'review', due: now - 2 * day, difficulty: 4, stability: 5 }));
      STATE.studySettings.newCardsPerDay = 10;
      STATE.activityLog = {};
      STATE.reviewRecords = { speedBestScore: 0, matchBestMs: null, hardSeenIds: [] };
      STATE.reviewTimeStats = { cards: 0, ms: 0 };
      switchTab('review');
    });
    await page.waitForSelector('#review-decks-table table.deck-table', { timeout: 8000 });

    // ---- 1) Total de hoje no topo ----
    const top = await page.evaluate(() => {
      const q = getStudyQueue(eligibleReviewPool(), { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
      const exp = { new: 0, learning: 0, review: 0 }; q.forEach(c => exp[cardStudyBucket(c)]++);
      const w = document.getElementById('review-today-widget');
      return { exp: [exp.new, exp.learning, exp.review], got: Array.from(w.querySelectorAll('.review-today-count')).map(x => Number(x.textContent)),
        btn: document.getElementById('review-study-all-btn').textContent.trim(), n: q.length,
        eta: w.querySelector('.review-today-eta'), etaText: /cerca de/.test(w.textContent),
        short: (document.getElementById('review-short-btn') || {}).textContent,
        before: !!(document.getElementById('review-decks-table').compareDocumentPosition(w) & Node.DOCUMENT_POSITION_PRECEDING) };
    });
    check(lang + ' topo: Novo/Aprendendo/Revisar iguais à fila de Estudar tudo', top.got.join() === top.exp.join(), top);
    check(lang + ' botão "Estudar tudo (N)" com N da fila', top.btn === `Estudar tudo (${top.n})`, top);
    check(lang + ' sem estimativa de tempo no topo', !top.eta && !top.etaText, top);
    check(lang + ' botão "⏱ 5 minutos" ao lado, faixa acima da tabela', /5 minutos/.test(top.short || '') && top.before, top);

    // ---- 2) Sessão de 5 minutos ----
    await page.evaluate(() => { STATE.reviewTimeStats = { cards: 20, ms: 20 * 60000 }; renderReviewModeSelect(); }); // 60 s/cartão -> 5 cartões
    await page.click('#review-short-btn');
    const short = await page.evaluate(() => ({ len: STATE.reviewQueue.length, first: STATE.reviewQueue.slice(0, 2).map(c => c.rowId), buckets: STATE.reviewQueue.map(c => cardStudyBucket(c)) }));
    const firstNew = short.buckets.indexOf('new');
    check(lang + ' 5 minutos: fila cortada pelo tempo médio (60 s -> 5 cartões)', short.len === 5, short);
    check(lang + ' 5 minutos: mais erros primeiro, novos por último', short.first[0] === 502 && (firstNew === -1 || short.buckets.slice(firstNew).every(b => b === 'new')), short);
    await page.evaluate(() => backToReviewModeSelect());
    await page.click('#review-study-all-btn');
    const full = await page.evaluate(() => STATE.reviewQueue.length);
    check(lang + ' Estudar tudo continua com a fila inteira', full === top.n || full === Math.min(top.n, sessionIntensityToLimit(STATE.studySettings.sessionIntensity)), { full, n: top.n });
    // terminar a sessão grava o tempo
    const timed = await page.evaluate(() => { STATE.reviewTimeStats = { cards: 0, ms: 0 }; STATE.reviewSessionStartedAt = Date.now() - 30000; STATE.reviewIndex = STATE.reviewQueue.length; renderReviewView(); return STATE.reviewTimeStats; });
    check(lang + ' fim da sessão soma o tempo na média', timed.cards === full && timed.ms > 25000, timed);
    await page.evaluate(() => backToReviewModeSelect());

    // ---- 3) Semana e meta ----
    const week = await page.evaluate(() => {
      const dates = reviewWeekDates(new Date());
      const key = d => reviewDateKey(d);
      const today = key(new Date());
      const past = dates.filter(d => key(d) < today);
      STATE.activityLog = {};
      if (past.length) STATE.activityLog[key(past[0])] = 3;
      STATE.activityLog[today] = 1;
      const tomorrow = dates.find(d => key(d) > today);
      if (tomorrow){ STATE.cards.filter(c => c.rowId === 501).forEach(c => { c.due = tomorrow.getTime() + 3600000; }); }
      renderReviewModeSelect();
      const el = document.getElementById('review-week');
      const days = Array.from(el.querySelectorAll('.week-day'));
      const modes = document.getElementById('review-mode-cards-praticar');
      return { n: days.length, labels: days.map(d => d.querySelector('.week-day-label').textContent),
        pastDone: past.length ? days[0].querySelector('.week-check.is-done') !== null : null,
        pastOther: past.length > 1 ? days[1].querySelector('.week-check.is-done') === null : null,
        todayIdx: days.findIndex(d => d.classList.contains('is-today')), expIdx: dates.findIndex(d => key(d) === today),
        goal: el.querySelector('.review-week-goal').textContent, expDone: (past.length ? 1 : 0) + 1,
        tomorrowTotal: tomorrow ? Number(days[dates.indexOf(tomorrow)].querySelector('.week-total').textContent) : null,
        tomorrowDue: tomorrow ? days[dates.indexOf(tomorrow)].querySelector('.week-bar-due') !== null : null,
        afterModes: !!(modes.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
        streakPill: !!document.getElementById('streak-count') };
    });
    check(lang + ' semana de segunda a domingo, hoje marcado', week.n === 7 && week.labels[0] === (week.expIdx === 0 ? 'Hoje' : 'Seg') && week.todayIdx === week.expIdx, week);
    if (week.pastDone !== null) check(lang + ' dia que passou com estudo tem ✓; sem estudo fica vazio', week.pastDone && (week.pastOther === null || week.pastOther), week);
    check(lang + ' meta da semana: dias estudados de 5', week.goal.includes(`${week.expDone} de 5`), week);
    if (week.tomorrowTotal !== null) check(lang + ' dia seguinte mostra os cartões que vencem (barra verde)', week.tomorrowTotal >= 1 && week.tomorrowDue, week);
    check(lang + ' semana fica abaixo dos modos; 🔥 do topo continua', week.afterModes && week.streakPill, week);

    // ---- 4) Recordes ----
    const rec = await page.evaluate(() => {
      const a = recordSpeedReviewScore(30), b = recordSpeedReviewScore(20);
      const c = recordMatchTime(41000), d = recordMatchTime(60000);
      const t1 = recordSpeedReviewTime(3000, 3), t2 = recordSpeedReviewTime(24000, 10), t3 = recordSpeedReviewTime(30000, 10);
      renderReviewModeSelect();
      const hardBefore = document.querySelector('#mode-card-hard .desc').textContent;
      // 502 sai da lista de difíceis
      STATE.cards.filter(x => x.rowId === 502).forEach(x => Object.assign(x, { lapses: 0, difficulty: 3 }));
      renderReviewModeSelect();
      const ser = serializeState();
      return { a, b, c, d, t1, t2, t3, speed: document.querySelector('#mode-card-speed .desc').textContent, match: document.querySelector('#mode-card-match .desc').textContent,
        hardBefore, hardAfter: document.querySelector('#mode-card-hard .desc').textContent,
        saved: JSON.stringify(ser.reviewRecords || null), savedTime: !!ser.reviewTimeStats };
    });
    check(lang + ' recorde do Speed Review só sobe', rec.a === true && rec.b === false && /Seu recorde: 30 pts/.test(rec.speed), rec);
    check(lang + ' Speed Review também guarda tempo (média por palavra, rodada de 5+)', rec.t1 === false && rec.t2 === true && rec.t3 === false && /30 pts · 2,4 s por palavra/.test(rec.speed), rec);
    check(lang + ' recorde do Combinar só desce (melhor tempo)', rec.c === true && rec.d === false && /Seu recorde: 41 s/.test(rec.match), rec);
    check(lang + ' "Já saíram da lista" conta quem saiu de Palavras difíceis', !/saíram/.test(rec.hardBefore) && /Já saíram da lista: \d+/.test(rec.hardAfter), rec);
    check(lang + ' recordes e tempo vão no progresso salvo', /"speedBestScore":30/.test(rec.saved) && /"speedBestMsPerCard":2400/.test(rec.saved) && /"matchBestMs":41000/.test(rec.saved) && rec.savedTime, rec);
    const restored = await page.evaluate(() => { const ser = serializeState(); STATE.reviewRecords = null; applySerializedState(JSON.parse(JSON.stringify(ser))); return reviewRecords(); });
    check(lang + ' recordes voltam ao recarregar', restored.speedBestScore === 30 && restored.speedBestMsPerCard === 2400 && restored.matchBestMs === 41000, restored);
    const matchStart = await page.evaluate(() => { startMatchGame(); const m = typeof MATCH_STATE.startedAt === 'number'; startSpeedReview(); const sp = typeof SPEED_STATE.startedAt === 'number'; stopSpeedTimer(); SPEED_STATE.active = false; return m && sp; });
    check(lang + ' Combinar e Speed Review marcam o início para medir o tempo', matchStart, matchStart);

    // ---- 5) Força da memória na tela do Deck ----
    await page.evaluate(() => { STATE.cards.filter(c => c.rowId === 502).forEach(c => Object.assign(c, { lapses: 2 })); openDeckDetail(9001); });
    await page.waitForSelector('#review-deck-wrap .deck-overview', { timeout: 5000 });
    const mem = await page.evaluate(() => {
      const w = document.querySelector('#review-deck-wrap .deck-memory');
      const study = document.querySelector('#review-deck-wrap [data-deck-study]');
      const exp = deckMemoryStrength(getStudyScopeForDeck(STATE.decks, 9001, eligibleDeckReviewPool()));
      return { has: !!w, after: !!(w && study && (study.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)),
        legend: w ? Array.from(w.querySelectorAll('.mem-legend b')).map(b => Number(b.textContent)) : [], exp: [exp.weak, exp.medium, exp.strong],
        segs: w ? Array.from(w.querySelectorAll('.mem-bar-seg')).map(s => s.dataset.tier) : [],
        color: w ? getComputedStyle(w.querySelector('.mem-bar-seg[data-tier="strong"]')).backgroundColor : null };
    });
    check(lang + ' Deck mostra a força da memória abaixo de "Estudar agora"', mem.has && mem.after, mem);
    check(lang + ' força = mesma conta de "Suas palavras" (fraca 1, média 1, forte 1)', mem.legend.join() === mem.exp.join() && mem.exp.join() === '1,1,1', mem);
    check(lang + ' barra em tons de azul, uma faixa por nível', mem.segs.join() === 'weak,mid,strong' && /rgb\(29, 90, 130\)/.test(mem.color || ''), mem);
    await page.evaluate(() => openDeckDetail(9100));
    const noMem = await page.evaluate(() => !document.querySelector('#review-deck-wrap .deck-memory'));
    check(lang + ' Deck sem cartões estudados não mostra a barra', noMem, noMem);
    await page.evaluate(() => backToDeckTable());

    // ---- 6) Visual (claro, escuro, celular) ----
    await page.screenshot({ path: path.join(SHOTS, `pa-${lang}-claro.png`), fullPage: true });
    for (const [theme, vp, tag] of [['dark', { width: 1200, height: 900 }, 'escuro'], ['light', { width: 390, height: 844 }, 'celular']]){
      const b = await bootPage(browser, lang, port, theme, vp);
      await setup(b.page);
      await b.page.evaluate(() => { const day = 86400000; STATE.cards.filter(c => c.rowId === 501).forEach(c => Object.assign(c, { reps: 4, interval: 90, state: 'review', due: Date.now() + day })); STATE.activityLog[reviewDateKey(new Date())] = 1; switchTab('review'); });
      await b.page.waitForSelector('#review-week .week-day', { timeout: 8000 });
      const over = await b.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${lang} ${tag}: sem rolagem lateral`, over <= 0, over);
      await b.page.screenshot({ path: path.join(SHOTS, `pa-${lang}-${tag}.png`), fullPage: true });
      await b.page.evaluate(() => openDeckDetail(9001));
      await b.page.screenshot({ path: path.join(SHOTS, `pa-${lang}-${tag}-deck.png`) });
      check(`${lang} ${tag}: sem erro de página`, b.errors.length === 0, b.errors);
      await b.ctx.close();
    }
    check(lang + ' sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
