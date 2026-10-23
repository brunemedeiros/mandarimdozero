// Lembrete de revisão acumulada (banner de rodapé), 2026-10-23: o dia só é gravado quando o banner foi visto
// (visível por alguns segundos, aba à frente, fora de lição) ou clicado; não é mostrado nem gasta o dia dentro de
// uma lição; é reavaliado ao voltar para a aba e ao sair da lição. fr e zh.
// Rodar: node tests/lembrete-revisao/test_playwright.js
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function boot(browser, lang, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1000, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
  // 20 cartões vencidos de lições concluídas
  await page.evaluate(() => {
    UNITS.slice(0, 3).forEach(u => { STATE.unitProgress[u.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
    let n = 0;
    STATE.cards.forEach(c => { if (n < 20 && isCardLessonCompleted(c)){ c.reps = 3; c.state = 2; c.due = Date.now() - 86400000; c.stability = 5; c.difficulty = 5; n++; } });
    STATE.lastReviewReminderDay = null;
    document.getElementById('review-reminder-banner').style.display = 'none';
  });
  return { page, ctx, errors };
}
const estado = (page) => page.evaluate(() => ({
  visivel: getComputedStyle(document.getElementById('review-reminder-banner')).display !== 'none',
  dia: STATE.lastReviewReminderDay, hoje: todayStr(),
}));

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  for (const lang of ['fr', 'zh']){
    const { page, ctx, errors } = await boot(browser, lang, port);
    let s;

    // 1) Mostra o banner, mas o dia NÃO é gravado na hora
    await page.evaluate(() => maybeShowReviewReminder());
    s = await estado(page);
    check(`${lang}: banner aparece com 20 vencidos`, s.visivel, s);
    check(`${lang}: o dia não é gravado na hora de mostrar`, s.dia === null, s);
    // 2) Depois de alguns segundos visível, o dia é gravado
    await wait(4400);
    s = await estado(page);
    check(`${lang}: visível por alguns segundos grava o dia`, s.dia === s.hoje, s);
    await page.evaluate(() => { document.getElementById('review-reminder-banner').style.display = 'none'; });
    await page.evaluate(() => maybeShowReviewReminder());
    s = await estado(page);
    check(`${lang}: já visto hoje, não volta`, !s.visivel, s);

    // 3) Dentro de uma lição: não mostra e não gasta o dia
    await page.evaluate(() => { STATE.lastReviewReminderDay = null; setLessonFocusMode(true); maybeShowReviewReminder(); });
    s = await estado(page);
    check(`${lang}: em lição não aparece nem grava o dia`, !s.visivel && s.dia === null, s);
    // 4) Ao sair da lição, reavalia e mostra
    await page.evaluate(() => setLessonFocusMode(false));
    s = await estado(page);
    check(`${lang}: ao sair da lição o banner aparece`, s.visivel && s.dia === null, s);
    // 5) Clicar grava o dia na hora e abre a Revisão
    await page.click('#review-reminder-cta-btn');
    s = await estado(page);
    const aba = await page.evaluate(() => document.getElementById('app').dataset.activeTab);
    check(`${lang}: clicar grava o dia e abre a Revisão`, s.dia === s.hoje && !s.visivel && aba === 'review', { s, aba });

    // 6) Dispensar grava o dia na hora
    await page.evaluate(() => { document.body.classList.remove('lesson-focus'); document.getElementById('app').classList.remove('lesson-focus'); STATE.lastReviewReminderDay = null; maybeShowReviewReminder(); });
    await page.click('#review-reminder-dismiss-btn');
    s = await estado(page);
    check(`${lang}: dispensar grava o dia`, s.dia === s.hoje && !s.visivel, s);

    // 7) Voltar para a aba num dia novo mostra o banner (sem recarregar)
    await page.evaluate(() => { STATE.lastReviewReminderDay = '2000-01-01'; document.dispatchEvent(new Event('visibilitychange')); });
    s = await estado(page);
    check(`${lang}: voltar para a aba num dia novo mostra o banner`, s.visivel, s);

    // 8) Aba em segundo plano no fim da contagem não grava o dia
    await page.evaluate(() => { document.getElementById('review-reminder-banner').style.display = 'none'; STATE.lastReviewReminderDay = null; });
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      maybeShowReviewReminder();
    });
    await wait(4400);
    s = await estado(page);
    check(`${lang}: aba escondida no fim da contagem não grava o dia`, s.dia === null, s);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(4400);
    s = await estado(page);
    check(`${lang}: ao voltar à aba e ficar visível, grava o dia`, s.dia === s.hoje, s);

    // 9) Poucos vencidos: nada
    await page.evaluate(() => { document.getElementById('review-reminder-banner').style.display = 'none'; STATE.lastReviewReminderDay = null; STATE.cards.forEach(c => { c.due = Date.now() + 86400000; }); maybeShowReviewReminder(); });
    s = await estado(page);
    check(`${lang}: sem 15 vencidos não aparece`, !s.visivel && s.dia === null, s);

    check(`${lang}: 0 pageerrors`, errors.filter(e => !/createClient|Failed to fetch|NetworkError/.test(e)).length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  console.log(`lembrete de revisão no navegador: ${passed} passaram, ${failed} falharam`);
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
});
