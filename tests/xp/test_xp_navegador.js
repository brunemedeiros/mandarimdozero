// Rodar: node tests/xp/test_xp_navegador.js
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
// Cliente falso do Supabase com a tabela `progress` em memória (select/eq/maybeSingle/upsert); o resto devolve vazio.
const STUB = `(function(){
  const db = window.__db = { progress: null, weekly: [] };
  const empty = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => empty; } });
  function from(table){
    if (table === 'progress'){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.progress ? { data: JSON.parse(JSON.stringify(db.progress)) } : null, error: null }; },
        async upsert(p){ db.progress = JSON.parse(JSON.stringify(p.data)); return { error: null }; } };
      return q;
    }
    return empty;
  }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
// XP da trilha e da Revisão no app real (fr e zh): constantes carregadas, exerciseXP e addXP somando de verdade.
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof saveState === 'function', null, { timeout: 20000 });
    const r = await page.evaluate(() => {
      STEP_STATE.lessonReview = null;
      const out = { consts: [EXERCISE_XP_RECOGNIZE, EXERCISE_XP_PRODUCE, EXERCISE_XP_ALMOST, LESSON_CLOSE_XP], grades: [0, 1, 2, 3].map(g => reviewXP(0, g)), grades60: [0, 1, 2, 3].map(g => reviewXP(90, g)) };
      const x0 = STATE.xp;
      addXP(exerciseXP({ format: 'meaning' }, EXERCISE_XP_RECOGNIZE)); const a = STATE.xp - x0;
      addXP(exerciseXP({ format: 'type' }, EXERCISE_XP_PRODUCE)); const b = STATE.xp - x0 - a;
      addXP(reviewXP(0, 0)); const c = STATE.xp - x0 - a - b;
      addXP(reviewXP(0, 3)); const d = STATE.xp - x0 - a - b - c;
      out.delta = [a, b, c, d]; return out;
    });
    check(`${lang}: constantes 1/2/1/4`, JSON.stringify(r.consts) === '[1,2,1,4]', r.consts);
    check(`${lang}: revisão 0/2/4/8`, JSON.stringify(r.grades) === '[0,2,4,8]', r.grades);
    check(`${lang}: revisão sem redução (intervalo 90)`, JSON.stringify(r.grades60) === '[0,2,4,8]', r.grades60);
    check(`${lang}: addXP soma 1, 2, 0 e 8`, JSON.stringify(r.delta) === '[1,2,0,8]', r.delta);
    check(`${lang}: sem pageerror`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`xp no navegador: ${passed}/${passed + failed}`);
  process.exit(failed ? 1 : 0);
})();
