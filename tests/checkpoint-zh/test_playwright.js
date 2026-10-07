// Checkpoint do chinês (2026-10-07): lição atual abre pelo próprio título e conta progresso;
// Enter numa resposta digitada errada mostra o painel (não pula); teclas de tom quebram
// linha; opções de "Complete a frase" com pinyin em cima; "Selecione a frase correta"
// sem áudio nas opções e com a pontuação final só no fim. Rodar: node tests/checkpoint-zh/test_playwright.js
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
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/zh/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  await page.evaluate(() => { [1, 2, 3].forEach(id => { STATE.unitProgress[id].completed = true; STATE.unitProgress[id].started = true; });
    const u = UNITS.find(x => x.id === 4); STATE.unitProgress[4].started = true; STATE.unitProgress[4].lessonIdx = u.lessons.length - 1; renderUnitsGrid(); });

  // 1. A lição atual (Ponto de verificação) abre pelo próprio título, de verdade.
  const row = await page.evaluate(() => { const b = [...document.querySelectorAll('.unit-block')].find(x => x.querySelector('.ub-title').textContent === 'Família');
    const r = b.querySelector('.ub-lesson-row.current'); return r ? { open: r.dataset.lessonOpen, clickable: r.classList.contains('clickable') } : null; });
  check('linha da lição atual clicável e abre de verdade', row && row.clickable && row.open === '1', row);
  await page.click('.ub-lesson-row[data-lesson-open="1"]');
  await page.waitForFunction(() => STEP_STATE.checkpointUnitId === 4, null, { timeout: 5000 });
  check('abriu sem modo revisão (conta progresso)', await page.evaluate(() => !STEP_STATE.lessonReview));

  const show = (fmt) => page.evaluate((fmt) => { let i = STEP_STATE.exerciseList.findIndex(e => e.format === fmt);
    if (i < 0 && fmt === 'type'){ i = STEP_STATE.exerciseList.findIndex(e => e.format === 'listen' && e.item); STEP_STATE.exerciseList[i] = Object.assign({}, STEP_STATE.exerciseList[i], { format: 'type' }); }
    STEP_STATE.exerciseIndex = i; renderExerciseStep(); return i; }, fmt);

  // 2. Enter numa resposta digitada errada mostra o painel.
  for (const typed of ['zzz', 'TONELESS']){
    const i = await show('type'); await page.waitForTimeout(200);
    const word = typed === 'TONELESS' ? await page.evaluate(() => pinyinWithoutTones(STEP_STATE.exerciseList[STEP_STATE.exerciseIndex].item.p)) : typed;
    await page.fill('#vocab-type-input', word); await page.press('#vocab-type-input', 'Enter'); await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ idx: STEP_STATE.exerciseIndex, panel: (document.querySelector('.wrong-feedback .wrong-feedback-header') || {}).textContent }));
    check(`Enter com "${typed}": painel aparece e não pula`, r.idx === i && !!r.panel, r);
  }
  // 3. Teclas de tom quebram linha.
  await show('type'); await page.waitForTimeout(200);
  const picker = await page.evaluate(() => { const p = document.querySelector('.pinyin-tone-picker'); const cs = getComputedStyle(p); return { wrap: cs.flexWrap, overflow: p.scrollWidth > p.clientWidth + 1 }; });
  check('teclas de tom quebram linha sem rolagem', picker.wrap === 'wrap' && !picker.overflow, picker);

  // 4. Complete a frase: pinyin em cima do hanzi.
  if (await show('cloze') >= 0){
    await page.waitForTimeout(200);
    const lay = await page.evaluate(() => { const o = document.querySelector('.cloze-option'); if (!o) return null; const p = o.querySelector('.cloze-option-pinyin').getBoundingClientRect(), h = o.querySelector('.cloze-option-hanzi').getBoundingClientRect(); return { above: p.bottom <= h.top + 1, sameLeft: Math.abs(p.left - h.left) < 2 }; });
    check('Complete a frase: pinyin em cima do hanzi', !lay || (lay.above && lay.sameLeft), lay);
  }
  // 5. Selecione a frase correta: sem áudio nas opções, pontuação final só no fim.
  for (let k = 0; k < 6; k++){
    await page.evaluate(() => { const u = UNITS.find(x => x.id === 4); const exs = buildFullSentenceExercises(u); const i = STEP_STATE.exerciseList.findIndex(e => e.format === 'fullsentence');
      STEP_STATE.exerciseList[i >= 0 ? i : 0] = exs[0]; STEP_STATE.exerciseIndex = i >= 0 ? i : 0; renderExerciseStep(); });
    const r = await page.evaluate(() => ({ audio: document.querySelectorAll('.exercise-option-sentence .audio-btn').length,
      hz: [...document.querySelectorAll('.opt-hanzi-sentence')].map(e => e.textContent), py: [...document.querySelectorAll('.opt-pinyin-sentence')].map(e => e.textContent) }));
    check('frase correta: sem áudio nas opções', r.audio === 0, r);
    check('frase correta: 。！？ só no fim', r.hz.every(h => !/[。！？]./.test(h)), r.hz);
    check('frase correta: pinyin começa com maiúscula', r.py.every(p => /^[A-ZĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/.test(p)), r.py);
  }
  check('sem erros de página', errors.length === 0, errors);
  console.log(`\n${passed} ok, ${failed} falhas`);
  await browser.close(); server.close(); process.exit(failed ? 1 : 0);
})();
