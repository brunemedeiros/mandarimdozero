// Fase 6 -- pular pelo Ponto de verificação (fr), Chromium real.
// Rodar: node tests/trilha/test_skip_checkpoint_ui.js
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
async function boot(browser, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { ctx, page, errors };
}
// responde a prova inteira pela interface; correctFn decide o texto digitado
async function runExam(page, correct){
  const total = await page.evaluate(() => CHECKPOINT_STATE.queue.length);
  for (let i = 0; i < total; i++){
    const ans = await page.evaluate(() => CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index].answer);
    await page.fill('#checkpoint-input', correct ? ans : 'zzzz');
    await page.click('#checkpoint-verify-btn');
    await page.click('.btn.btn-secondary.btn-block');
  }
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const { ctx, page, errors } = await boot(browser, port);

  // ---- prova com palavra, frase, escuta e gramática
  await page.evaluate(() => { renderUnitsGrid(); openCheckpoint('A1-m1'); });
  let r = await page.evaluate(() => ({ kinds: CHECKPOINT_STATE.queue.reduce((a, i) => (a[i.kind] = (a[i.kind] || 0) + 1, a), {}), n: CHECKPOINT_STATE.queue.length }));
  check('prova: 12 itens com os 4 tipos', r.n === 12 && ['word', 'phrase', 'listen', 'grammar'].every(k => r.kinds[k] >= 1), r);
  // item de escuta: mostra botão de áudio e placeholder certo
  r = await page.evaluate(() => { const i = CHECKPOINT_STATE.queue.findIndex(x => x.kind === 'listen'); CHECKPOINT_STATE.index = i; renderCheckpointQuizStep();
    return { btn: !!document.querySelector('.gram-exercise-prompt .audio-btn'), ph: document.getElementById('checkpoint-input').placeholder, prompt: document.querySelector('.gram-exercise-prompt').textContent }; });
  check('escuta: botão de áudio e "Escreva o que ouviu"', r.btn && r.ph === 'Escreva o que ouviu' && /Ouça/.test(r.prompt), r);
  // frase: prompt pede a frase inteira
  r = await page.evaluate(() => { const i = CHECKPOINT_STATE.queue.findIndex(x => x.kind === 'phrase'); CHECKPOINT_STATE.index = i; renderCheckpointQuizStep(); return document.querySelector('.gram-exercise-prompt').textContent; });
  check('frase: pede "Escreva em francês"', /Escreva em francês/.test(r), r);

  // ---- reprovar não pula nada
  await page.evaluate(() => { openCheckpoint('A1-m1'); });
  await runExam(page, false);
  r = await page.evaluate(() => ({ cp: STATE.checkpointProgress['A1-m1'].completed, skipped: MODULES[0].unitIds.some(id => STATE.unitProgress[id].completed) }));
  check('reprovado: nada é pulado', !r.cp && !r.skipped, r);

  // ---- aprovar: pula sem XP, sem FSRS "Bom", sem selo; libera elegibilidade
  const before = await page.evaluate(() => ({ xp: STATE.xp, stars: STATE.daily.stars + '|' + STATE.daily.lessons, repsSum: STATE.cards.reduce((a, c) => a + (c.reps || 0), 0) }));
  await page.evaluate(() => { openCheckpoint('A1-m1'); });
  await runExam(page, true);
  await page.click('#step-next-btn'); // "Concluir seção ✓"
  r = await page.evaluate(() => { const m = MODULES[0]; const ids = m.unitIds;
    const u0 = ids[0];
    const cards = STATE.cards.filter(c => ids.includes(c.unitId));
    return { cp: STATE.checkpointProgress['A1-m1'].completed, best: STATE.checkpointProgress['A1-m1'].bestScore,
      allSkipped: ids.every(id => STATE.unitProgress[id].completed && STATE.unitProgress[id].completedVia === 'skip_test'),
      state: unitBlockState(UNITS.find(u => u.id === u0)), xp: STATE.xp, stars: STATE.daily.stars + '|' + STATE.daily.lessons,
      repsSum: STATE.cards.reduce((a, c) => a + (c.reps || 0), 0), allNew: cards.every(c => (c.state || 'new') === 'new' && !c.reps),
      eligible: cards.filter(c => isCardLessonCompleted(c)).length, total: cards.length,
      badge1: BADGES.find(b => b.id === 'unit_1').check(STATE), nextUnit: nextTrailItem(trailGroups(), STATE.unitProgress).unitId, nextLocked: !ids.includes(nextTrailItem(trailGroups(), STATE.unitProgress).unitId) };
  });
  check('aprovado: checkpoint concluído com nota', r.cp && r.best >= 70, r);
  check('aprovado: todas as unidades viram "skipped"', r.allSkipped && r.state === 'skipped', r);
  check('aprovado: SEM XP e sem estrelas', r.xp === before.xp && r.stars === before.stars, [r.xp, before.xp]);
  check('aprovado: nenhum cartão recebeu nota (continuam New)', r.repsSum === before.repsSum && r.allNew, r);
  check('aprovado: cartões elegíveis para a Revisão (entram como novos)', r.eligible === r.total && r.total > 0, r);
  check('aprovado: pulada não dá selo de unidade', r.badge1 === false, r.badge1);
  check('aprovado: a próxima unidade é a 1ª depois do módulo', r.nextLocked, r.nextUnit);

  // ---- bloqueio por plano (flag desligada por padrão; ligar nos testes)
  const off = await page.evaluate(() => TRAIL_SKIP_PAYWALL_ENABLED);
  check('flag de bloqueio nasce desligada', off === false);
  const g = await page.evaluate(() => {
    TRAIL_SKIP_PAYWALL_ENABLED = true; TRAIL_TEACHER_LINK = null;
    const out = {};
    // Free (PROFILE_CACHE sem plano) -> bloqueado
    PROFILE_CACHE = { plan_tier: 'free' };
    renderUnitsGrid();
    const row = document.querySelector('.unit-block.checkpoint');
    out.freeAllowed = trailSkipAllowed(); out.lockedClass = row.classList.contains('skip-locked'); out.lockText = row.textContent;
    STEP_STATE.onCheckpoint = null; openCheckpoint('A1-m2'); out.freeOpened = STEP_STATE.onCheckpoint === 'A1-m2';
    openLevelTest('A1-final'); out.freeLevelOpened = STEP_STATE.onLevelTest === 'A1-final';
    // Premium -> liberado
    PROFILE_CACHE = { plan_tier: 'premium' }; out.premiumAllowed = trailSkipAllowed();
    // aluno vinculado -> liberado
    PROFILE_CACHE = { plan_tier: 'free' }; TRAIL_TEACHER_LINK = true; out.linkedAllowed = trailSkipAllowed();
    TRAIL_TEACHER_LINK = false; out.freeAgain = trailSkipAllowed();
    TRAIL_SKIP_PAYWALL_ENABLED = false;
    return out; });
  check('free: pular bloqueado e sinalizado', g.freeAllowed === false && g.lockedClass && /Premium/.test(g.lockText), g);
  check('free: nem o ponto nem o teste de nível abrem', !g.freeOpened && !g.freeLevelOpened, g);
  check('premium e aluno vinculado podem pular', g.premiumAllowed && g.linkedAllowed && g.freeAgain === false, g);

  // ---- verificador (fase 7): Teste de Nível com escuta e módulo bloqueado
  {
    const r2 = await page.evaluate(() => {
      const lt = LEVEL_TESTS.find(t => t.id === 'A1-final') || LEVEL_TESTS[0]; LEVEL_TEST_STATE.queue = buildLevelTestQueue(lt); LEVEL_TEST_STATE.index = 0; LEVEL_TEST_STATE.score = 0; LEVEL_TEST_STATE.levelId = 'A1-final';
      const i = LEVEL_TEST_STATE.queue.findIndex(x => x.kind === 'listen');
      if (i < 0) return { noListen: true };
      LEVEL_TEST_STATE.index = i; renderLevelTestQuizStep();
      return { btn: !!document.querySelector('.gram-exercise-prompt .audio-btn'), ph: document.getElementById('leveltest-input').placeholder };
    });
    check('teste de nível: item de escuta tem áudio e placeholder', !r2.noListen && r2.btn && r2.ph === 'Escreva o que ouviu', r2);
    const r3 = await page.evaluate(() => { TRAIL_SKIP_PAYWALL_ENABLED = false; STEP_STATE.onCheckpoint = null; openCheckpoint('A1-m3'); return STEP_STATE.onCheckpoint; });
    check('openCheckpoint ignora módulo bloqueado', r3 !== 'A1-m3', r3);
  }
  check('sem erro de página', errors.length === 0, errors);
  await ctx.close(); await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
