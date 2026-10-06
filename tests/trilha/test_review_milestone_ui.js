// Fase 5 -- marco de Revisão do módulo, em Chromium real (fr). zh não ganha o marco
// (sem módulos ainda). Rodar: node tests/trilha/test_review_milestone_ui.js
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
async function boot(browser, port, lang, scheme){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { ctx, page, errors };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const scheme of ['light', 'dark']){
    console.log('== fr ' + scheme);
    const L = (n, c, x) => check(`fr/${scheme} ${n}`, c, x);
    const { ctx, page, errors } = await boot(browser, port, 'fr', scheme);
    let r = await page.evaluate(() => { renderUnitsGrid(); const rows = [...document.querySelectorAll('.review-milestone')];
      return { n: rows.length, mods: MODULES.length, empty: rows[0].classList.contains('empty') && !rows[0].classList.contains('locked'), txt: rows[0].textContent }; });
    L('uma faixa de Revisão por módulo', r.n === r.mods, r);
    L('sem cartões elegíveis: estado vazio, não clicável', r.empty && /Nada para revisar ainda/.test(r.txt), r);

    // conclui a 1ª unidade do módulo 1 (pelo estado real) e deixa alguns cartões em estados diferentes
    r = await page.evaluate(() => {
      const m = MODULES[0]; const u0 = m.unitIds[0];
      STATE.unitProgress[u0].started = true; STATE.unitProgress[u0].completed = true; STATE.unitProgress[u0].completedVia = 'lessons';
      const cs = STATE.cards.filter(c => c.unitId === u0);
      cs[0].state = 'learning'; cs[0].reps = 1; cs[0].lapses = 1; cs[0].due = Date.now() - 1000;
      cs[1].state = 'review'; cs[1].reps = 3; cs[1].due = Date.now() - 86400000; cs[1].stability = 5;
      renderUnitsGrid();
      const row = document.querySelector('.review-milestone');
      const before = trailGroups().flat().map(u => unitBlockState(u)).join();
      return { cls: row.className, txt: row.textContent, cards: cs.length, before, otherModuleUnits: MODULES[1].unitIds.length };
    });
    L('com unidade concluída a faixa fica pronta (não vazia)', !/locked/.test(r.cls), r.cls);
    L('texto: recomendado, opcional e o porquê', /Recomendado antes de seguir \(opcional\)/.test(r.txt) && /\d+ itens?: 1 com erros recentes, 1 vencendo hoje/.test(r.txt), r.txt);
    L('teto de 20 respeitado no texto', (() => { const n = parseInt(r.txt.match(/(\d+) itens?:/)[1], 10); return n <= 20 && n === Math.min(20, r.cards); })(), r.txt);

    // clicar abre a Revisão existente com recorte do módulo
    const s = await page.evaluate(() => {
      document.querySelector('.review-milestone .ub-header').click();
      const ids = new Set(MODULES[0].unitIds);
      return { ms: STATE.reviewSessionMilestone && STATE.reviewSessionMilestone.moduleId, len: STATE.reviewQueue.length,
        inScope: STATE.reviewQueue.every(c => ids.has(c.unitId)), cap: STATE.reviewQueue.length <= 20,
        tab: document.getElementById('app').dataset.activeTab, sessionVisible: getComputedStyle(document.getElementById('review-session-wrap')).display !== 'none',
        rendering: document.getElementById('review-content').innerHTML.length > 50 };
    });
    L('abre a Revisão do módulo', s.ms === 'A1-m1' && s.tab === 'review' && s.sessionVisible && s.rendering, s);
    L('só cartões das unidades do módulo e até 20', s.inScope && s.cap && s.len > 0, s);

    // concluir a sessão registra a data; meta carrega moduleId/unitIds; não bloqueia nada
    const e = await page.evaluate(() => {
      window.__events = []; const orig = trackEvent; window.trackEvent = (a, b, c) => { window.__events.push([a, b, c]); return orig(a, b, c); };
      STATE.reviewIndex = STATE.reviewQueue.length; renderReviewView();
      const ev = window.__events.find(x => x[0] === 'lesson_complete');
      return { rec: STATE.reviewMilestones['A1-m1'], meta: ev && ev[2], txt: document.getElementById('review-content').textContent };
    });
    L('data da última sessão gravada', e.rec && e.rec.lastDate === new Date().toLocaleDateString('sv-SE'), e.rec);
    L('meta do evento tem moduleId e unitIds', e.meta && e.meta.moduleId === 'A1-m1' && Array.isArray(e.meta.unitIds) && e.meta.count > 0, e.meta);
    L('mensagem de conclusão', /Revisão concluída/.test(e.txt));
    const after = await page.evaluate(() => { document.getElementById('review-again').click(); renderUnitsGrid();
      const row = document.querySelector('.review-milestone');
      return { ms: STATE.reviewSessionMilestone, txt: row.textContent, cls: row.className, states: trailGroups().flat().map(u => unitBlockState(u)).join(),
        persisted: JSON.stringify(serializeState()).includes('reviewMilestones') }; });
    L('Voltar limpa o escopo do marco', after.ms === null, after);
    L('faixa mostra "Revisada em" e continua reabrível', /Revisada em \d\d\/\d\d\/\d{4}/.test(after.txt) && !/locked/.test(after.cls), after.txt);
    L('estados da trilha não mudam por causa do marco (nunca bloqueia)', after.states === r.before, [after.states, r.before]);
    L('é salvo junto do progresso', after.persisted);

    // sessão normal depois não herda o escopo
    const n = await page.evaluate(() => { openReviewSession('flashcard'); return STATE.reviewSessionMilestone; });
    L('Revisão normal não herda o marco', n === null, n);
    L('sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  console.log('== zh');
  { const { ctx, page, errors } = await boot(browser, port, 'zh', 'light');
    const z = await page.evaluate(() => { renderUnitsGrid(); return document.querySelectorAll('.review-milestone').length; });
    check('zh: sem marco (sem módulos ainda)', z === 0, z); check('zh: sem erro de página', errors.length === 0, errors); await ctx.close(); }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
