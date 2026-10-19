// Sino (etapa 2 do plano "Voz da Prof. Brune", 2026-10-19): "+XP" (xp_earned) e "Sequência mantida" (streak_completed)
// aparecem só na hora e não são gravados no sino; o evento bruto continua em notification_events; os outros eventos
// (ex.: conquista) seguem iguais. Rodar: node tests/notificacoes/test_sino_so_na_hora.js
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
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']){
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.goto(`${base}/${app}/index.html`);
    await page.waitForFunction(() => typeof fireNotificationEvent === 'function' && CURRENT_USER === false, null, { timeout: 20000 });
    const r = await page.evaluate(async () => {
      const inserts = [];
      supabaseClient.from = (table) => ({ insert: (row) => { inserts.push([table, row.event_type]); return Promise.resolve({ error: null }); } });
      CURRENT_USER = { id: 'u1' };
      ensureNotificationPreferencesLoaded = async () => {};
      notificationCategoryAllowsInApp = () => true;
      notificationCategoryAllowsPush = () => false;
      passesAntiSpam = async () => true;
      pickNotificationTemplate = async () => ({ title: 'Título', body: 'Corpo' });
      await fireNotificationEvent('xp_earned', 'gamificacao', { amount: 20 });
      await fireNotificationEvent('streak_completed', 'streak', { days: 3 });
      await fireNotificationEvent('achievement_unlocked', 'gamificacao', { badge: 'x' });
      await new Promise(res => setTimeout(res, 50));
      return inserts;
    });
    const sino = r.filter(x => x[0] === 'notifications').map(x => x[1]);
    const eventos = r.filter(x => x[0] === 'notification_events').map(x => x[1]);
    check(`${app}: +XP e Sequência mantida não vão para o sino`, sino.indexOf('xp_earned') < 0 && sino.indexOf('streak_completed') < 0, sino);
    check(`${app}: conquista continua indo para o sino`, sino.join() === 'achievement_unlocked', sino);
    check(`${app}: os três eventos brutos continuam registrados`, eventos.join() === 'xp_earned,streak_completed,achievement_unlocked', eventos);
    check(`${app}: sem erro de página`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`sino só na hora: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})();
