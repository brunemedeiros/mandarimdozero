// C0 da E3: o zh grava STATE.hanziCards no save e precisa RESTAURAR o progresso ao carregar
// (a restauração foi removida por engano na K2-C, commit 49692ff). Também confere o texto do portão
// para convidado. Rodar: node tests/curso-progresso/test_hanzi_restore.js
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
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  // texto do portão: convidado NÃO salva nada (auditoria 2026-10-12)
  const gate = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('portão: não afirma salvar o progresso do convidado no navegador', !/seu progresso fica salvo só neste navegador/.test(gate));
  check('portão: diz que o progresso do convidado não é salvo', /Como convidado\(a\), seu progresso não é salvo/.test(gate));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/zh/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.hanziCards && STATE.hanziCards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });

  const r = await page.evaluate(() => {
    const out = {};
    const n = STATE.hanziCards.length;
    out.total = n;
    // 1. estudar de verdade: dois cartões ganham progresso
    const a = STATE.hanziCards[0], b = STATE.hanziCards[7];
    Object.assign(a, { reps: 3, ef: 2.2, interval: 6, due: 1790000000000, lapses: 1, stability: 5.5, difficulty: 4.2, state: 'review', lastReview: 1789000000000, firstLearnedDate: '2026-10-01', fsrsMigrated: true, fsrsReps: 3, fsrsLapses: 1 });
    Object.assign(b, { reps: 1, state: 'learning', stability: 1.1, difficulty: 6, lastReview: 1789100000000, firstLearnedDate: '2026-10-02', fsrsMigrated: true, fsrsReps: 1, fsrsLapses: 0 });
    out.idA = a.id; out.idB = b.id;
    // 2. salvar (o que vai para o servidor) e recarregar: cartões novos, depois o apply do save
    const saved = JSON.parse(JSON.stringify(serializeState()));
    out.savedHasHanzi = Array.isArray(saved.hanziCards) && saved.hanziCards.length === n;
    STATE.hanziCards = buildHanziCards(HANZI_LESSONS);
    out.freshRepsBefore = STATE.hanziCards[0].reps;
    applySerializedState(saved);
    const A = STATE.hanziCards[0], B = STATE.hanziCards[7], C = STATE.hanziCards[3];
    out.A = { reps: A.reps, ef: A.ef, interval: A.interval, due: A.due, lapses: A.lapses, stability: A.stability, difficulty: A.difficulty, state: A.state, lastReview: A.lastReview, firstLearnedDate: A.firstLearnedDate, fsrsMigrated: A.fsrsMigrated, fsrsReps: A.fsrsReps, fsrsLapses: A.fsrsLapses };
    out.B = { reps: B.reps, state: B.state, stability: B.stability, firstLearnedDate: B.firstLearnedDate };
    out.C = { reps: C.reps, state: C.state };
    // 3. o texto do hanzi continua o da camada atual (o save não impõe texto antigo)
    out.textoOk = STATE.hanziCards.every(c => { const m = /^h(\d+)-c(\d+)$/.exec(c.id); const h = HANZI_LESSONS[+m[1]][+m[2]]; return c.char === h.char && c.pinyin === h.pinyin && c.meaning === h.meaning; });
    out.countDepois = STATE.hanziCards.length;
    return out;
  });
  check('save contém os 198 hanzi', r.savedHasHanzi && r.total === 198, r);
  check('cartões novos começam sem progresso', r.freshRepsBefore === 0, r);
  check('cartão estudado volta com todo o progresso (FSRS e SM-2)', r.A.reps === 3 && r.A.ef === 2.2 && r.A.interval === 6 && r.A.due === 1790000000000 && r.A.lapses === 1 && r.A.stability === 5.5 && r.A.difficulty === 4.2 && r.A.state === 'review' && r.A.lastReview === 1789000000000 && r.A.firstLearnedDate === '2026-10-01' && r.A.fsrsMigrated === true && r.A.fsrsReps === 3 && r.A.fsrsLapses === 1, r.A);
  check('segundo cartão estudado volta', r.B.reps === 1 && r.B.state === 'learning' && r.B.stability === 1.1 && r.B.firstLearnedDate === '2026-10-02', r.B);
  check('cartão não estudado continua novo', r.C.reps === 0 && r.C.state === 'new', r.C);
  check('texto dos hanzi continua o da camada atual', r.textoOk);
  check('mesma quantidade de cartões depois de carregar', r.countDepois === 198, r.countDepois);
  check('sem erros de página', errors.length === 0, errors);

  await browser.close(); server.close();
  console.log(`hanzi restore + portão: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
