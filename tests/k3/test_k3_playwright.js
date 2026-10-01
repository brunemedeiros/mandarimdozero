// K.3 -- Playwright (Chromium real), FR + ZH, modo convidado com o
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
    await ev(() => {
      UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length >= 5);
      const NOW = Date.now(), DAY = 86400e3;
      const mk = (id, o) => Object.assign(STATE.cards.find(c => c.id === id), { reps: 3, state: 'review', stability: 8, difficulty: 5, interval: 10, lapses: 0 }, o);
      mk(`u${u.id}-v0`, { due: NOW - DAY });            // Review devido
      mk(`u${u.id}-v1`, { due: NOW + 5 * DAY });        // Review NÃO devido
      mk(`u${u.id}-v2`, { state: 'learning', due: NOW - 1000 }); // Learning devido
      mk(`u${u.id}-v3`, { state: 'relearning', due: NOW + DAY, reps: 4 }); // Relearning (= Learning), não devido
      // Self: 1 Note com reverso (2 cards), só um estudado, + 1 arquivada estudada; Teacher: 1 Note estudada
      const base = { origin: 'self', deckId: null, unitId: null, vocabIdx: null, interval: 0, lapses: 0, stability: 0, difficulty: 0 };
      STATE.cards.push(
        Object.assign({}, base, { id: 's1', rowId: 1, flashcardStatus: 'active', reps: 2, state: 'review', due: NOW - DAY, interval: 90 }),
        Object.assign({}, base, { id: 's1-b', rowId: 1, flashcardStatus: 'active', reps: 0, state: 'new', due: 0 }),
        Object.assign({}, base, { id: 's2', rowId: 2, flashcardStatus: 'archived', reps: 3, state: 'review', due: NOW - DAY }),
        Object.assign({}, base, { id: 't1', rowId: 1, origin: 'teacher', flashcardStatus: 'active', reps: 1, state: 'review', due: NOW + DAY, firstLearnedDate: '2026-02-01' }));
      switchTab('progress');
    });
    const r = await ev(() => {
      const stat = {}; document.querySelectorAll('#stat-cards .stat-card[data-stat]').forEach(e => { stat[e.dataset.stat] = parseInt(e.querySelector('.num').innerText); });
      const learned = [...document.querySelectorAll('#stat-cards .stat-card')].find(e => /Palavras aprendidas/.test(e.innerText)).querySelector('.num').innerText;
      const vs = [...document.querySelectorAll('#vocab-strength-widget .vs-count')].map(e => parseInt(e.innerText));
      const exp = {
        structural: structuralCounts(eligibleDeckReviewPool()),
        words: studyTrailWordProgress(STATE.cards),
        own: ownContentProgress(STATE.cards, 'self'), teacher: ownContentProgress(STATE.cards, 'teacher'),
        archived: archivedCounts(STATE.cards, 'self'),
      };
      const dots = document.querySelectorAll('#progress-line-chart-wrap .chart-dot').length;
      return { stat, learned, vs, exp, dots };
    });
    const e = r.exp;
    check(lang + ' Review sem due NÃO é Devido; Review vencido é Devido', r.stat.due === e.structural.due && e.structural.due === 3 /* v0 review, v2 learning, s1 */, r);
    check(lang + ' Para revisar = estado Review (inclui o não vencido)', r.stat.review === e.structural.review && e.structural.review === 4 /* v0,v1,s1,t1 */, r.stat);
    check(lang + ' Aprendendo = learning + relearning', r.stat.learning === 2, r.stat);
    check(lang + ' Reverso = 2 CardInstances / 1 conteúdo (self)', e.own.total === 1 && e.own.studied === 1 && e.structural.new >= 1, e.own);
    check(lang + ' Self: arquivado fora de ativos e só informativo', e.archived.cards === 1 && e.archived.notes === 1);
    check(lang + ' Self e Teacher separados (1 conteúdo estudado cada)', e.own.studied === 1 && e.teacher.studied === 1 && e.teacher.total === 1);
    check(lang + ' Palavras aprendidas só Study Trail (4 palavras), Teacher/Self fora', r.learned.startsWith('4/') && e.words.learned === 4, r.learned);
    check(lang + ' Força: Self(1) entra no widget junto da trilha como Note; irmã New não rebaixa', r.vs.length === 4 && r.vs[3] >= 1, r.vs);
    check(lang + ' K.4: gráfico de palavras ignora Teacher/Self (data do Teacher não vira ponto)', r.dots === 0, r.dots);
    check(lang + ' sem erro de página', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K.3 playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
