// K2-D -- Playwright (Chromium real), FR + ZH, modo convidado com o
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
    await ev(() => { window.__AUTH = true; CURRENT_USER = { id: 'u-test' }; });
    const setup = await ev(async () => {
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length);
      UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      STATE.studySettings.newCardsPerDay = 1000; STATE.studySettings.sessionIntensity = 'all';
      await ensureDecksLoadedForReview();
      const A = STATE.cards.find(c => c.id === `u${u.id}-v0`), B = STATE.cards.find(c => c.id === A.id + '-b');
      // legado "envenenado": não pode influenciar a direção nativa
      A.reviewDirection = 'back-to-front'; A.lastDirection = 'front-to-back'; B.reviewDirection = 'front-to-back'; B.lastDirection = 'back-to-front';
      const past = Date.now() - 86400000;
      Object.assign(A, { reps: 3, state: 'review', stability: 6, difficulty: 5, due: past, lastReview: past });
      const isZh = APP_KEY === 'mandarim', v = u.vocab[0];
      return { id: A.id, deckId: A.deckId, bDeck: B.deckId, study: isZh ? v.c : v.f, trans: v.t, pinyin: v.p || null };
    });
    check(lang + ' A e B no mesmo Course Deck', setup.deckId != null && setup.deckId === setup.bDeck, setup);
    await ev(id => { window.__ids = id; }, setup.id);
    await ev(() => switchTab('review'));
    const started = await ev(async id => { await startDeckReviewSession(STATE.cards.find(c => c.id === id).deckId);
      return { ids: STATE.reviewQueue.map(c => c.id), hasA: STATE.reviewQueue.some(c => c.id === id), hasB: STATE.reviewQueue.some(c => c.id === id + '-b') }; }, setup.id);
    check(lang + ' Review por Deck contém A e B', started.hasA && started.hasB, started.ids.slice(0, 6));
    const seen = {};
    for (let i = 0; i < 80 && !(seen.A && seen.B); i++){
      const cur = await ev(() => { const c = STATE.reviewQueue[STATE.reviewIndex]; return c ? c.id : null; });
      if (!cur) break;
      const which = cur === setup.id ? 'A' : cur === setup.id + '-b' ? 'B' : null;
      const frontEl = () => page.$eval('#flashcard', el => el.innerText);
      if (which){
        const t1 = await frontEl();
        const hasHintBefore = await page.$('#flashcard .flashcard-hint') !== null;
        const audioBefore = await page.$$eval('#review-content .audio-btn', els => els.length);
        await page.click('#flashcard');
        const t2 = await frontEl();
        const audioAfter = await page.$$eval('#review-content .audio-btn', els => els.length);
        const audioNextTo = await page.$$eval('#review-content .audio-btn', els => els.map(e => e.parentElement.innerText.replace('🔊', '').trim()));
        const pinyinShown = await page.$$eval('#review-content .flashcard-pinyin', els => els.map(e => e.innerText.trim()));
        seen[which] = { t1, t2, hasHintBefore, audioBefore, audioAfter, audioNextTo, pinyinShown };
      } else { await page.click('#flashcard'); }
      const before = await ev(() => STATE.cards.map(c => c.id + '|' + c.reps));
      await page.click('.grade-btn[data-grade="2"]');
      await ev(() => null);
    }
    check(lang + ' A e B foram exibidos', !!seen.A && !!seen.B, Object.keys(seen));
    if (seen.A && seen.B){
      const has = (t, x) => t.includes(x);
      check(lang + ' A: frente mostra idioma estudado (não a tradução)', has(seen.A.t1, setup.study) && !has(seen.A.t1, setup.trans), seen.A.t1);
      check(lang + ' A: verso revela a tradução', has(seen.A.t2, setup.trans), seen.A.t2);
      check(lang + ' B: frente mostra a tradução (direção oposta, apesar do legado envenenado)', has(seen.B.t1, setup.trans) && !has(seen.B.t1, setup.study), seen.B.t1);
      check(lang + ' B: verso revela o idioma estudado', has(seen.B.t2, setup.study), seen.B.t2);
      check(lang + ' A: botão de áudio junto do idioma estudado', seen.A.audioAfter >= 1 && seen.A.audioNextTo.some(x => x.includes(setup.study)), seen.A.audioNextTo);
      check(lang + ' B: botão de áudio junto do idioma estudado (só após revelar)', seen.B.audioBefore === 0 && seen.B.audioNextTo.some(x => x.includes(setup.study)), seen.B);
      if (lang === 'zh'){
        check('zh A: pinyin exibido com o hanzi', seen.A.pinyinShown.some(p => p.includes(setup.pinyin)), seen.A.pinyinShown);
        check('zh B: pinyin exibido com o hanzi no verso', seen.B.pinyinShown.some(p => p.includes(setup.pinyin)), seen.B.pinyinShown);
      }
    }
    // FSRS: só o card estudado mudou; save sem lastDirection; 2ª rodada mantém a direção
    const fs = await ev(id => { const A = STATE.cards.find(c => c.id === id), B = STATE.cards.find(c => c.id === id + '-b');
      const data = JSON.parse(JSON.stringify(serializeState())); const sa = data.cards.find(c => c.id === id);
      return { aReps: A.reps, bReps: B.reps, aLast: A.lastDirection, bLast: B.lastDirection, saved: Object.keys(sa) }; }, setup.id);
    check(lang + ' grade real alterou A e B de forma independente (ambos estudados uma vez, A partiu de 3)', fs.aReps === 4 && fs.bReps === 1, fs);
    check(lang + ' gradeCurrentCard não reescreveu lastDirection do card nativo', fs.aLast === 'front-to-back' && fs.bLast === 'back-to-front', fs);
    check(lang + ' save da trilha não inclui reviewDirection/lastDirection', !fs.saved.includes('lastDirection') && !fs.saved.includes('reviewDirection'), fs.saved);
    const again = await ev(async id => { const A = STATE.cards.find(c => c.id === id); A.due = Date.now() - 1000;
      switchTab('review'); await startDeckReviewSession(A.deckId); const i = STATE.reviewQueue.findIndex(c => c.id === id); STATE.reviewIndex = i; STATE.reviewCardState = null; renderReviewView();
      return document.getElementById('flashcard').innerText; }, setup.id);
    check(lang + ' 2ª revisão de A mantém a direção A', again.includes(setup.study) && !again.includes(setup.trans), again);
    check(lang + ' sem pageerror', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K2-D playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();
