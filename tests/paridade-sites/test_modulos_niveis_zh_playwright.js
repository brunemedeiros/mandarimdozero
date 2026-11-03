// Paridade B2 (docs/auditoria-paridade-fr-zh.md; registro docs/historico/26-paridade-b2-modulos-niveis.md): o motor de
// módulos e níveis (shared/core/modulos-niveis.js) no zh, no navegador de verdade.
//  1. Sem módulos (o zh de hoje): nada de módulo na trilha, o save não ganha campo novo, o Mapa não oferece pular, e as
//     funções que o zh/app.js chamava sem ter (trailSkipAllowed, openCheckpoint) agora existem (risco da seção 9).
//  2. Com MODULES/LEVEL_TESTS FALSOS injetados na página (sem mexer no zh/content.js), claro e escuro, 390px: a trilha
//     mostra módulos (com as histórias no lugar), o Mapa tem as seções, o Ponto de verificação abre com a prova em pinyin
//     (teclado de tons, escuta pela voz do zh, correção com hanzi + pinyin, tom errado = "quase", pinyin numerado vale),
//     aprova, pula as unidades, salva e carrega; Revisão do módulo e Teste de Nível concluem; sem rolagem horizontal.
// Rodar: node tests/paridade-sites/test_modulos_niveis_zh_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

async function openZh(browser, theme, withModules){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(({ th, mods }) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); localStorage.setItem('mandarim_trail_view', 'list'); } catch (e) {}
    let s = 4242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    // Módulos e Teste de Nível FALSOS, só nesta página (o zh/content.js não tem e não muda).
    if (mods){
      window.MODULES = [
        { id: 'HSK1-m1', level: 'HSK1', unitIds: [1, 2, 3], title: 'Primeiros contatos' },
        { id: 'HSK1-m2', level: 'HSK1', unitIds: [4, 5, 6], title: 'Família e números' },
        { id: 'HSK1-m3', level: 'HSK1', unitIds: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], title: 'Dia a dia' },
      ];
      window.LEVEL_TESTS = [{ id: 'HSK1-final', level: 'HSK1', nextLevel: 'HSK2', title: 'Teste de Nível HSK1' }];
    }
  }, { th: theme, mods: withModules });
  await page.goto(`http://127.0.0.1:${server.address().port}/zh/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
  await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
  // Espião da voz do zh (a escuta tem de tocar o HANZI pela voz do zh).
  await page.evaluate(() => { window.__falou = []; const orig = speakChinese; speakChinese = function(txt){ window.__falou.push(txt); }; window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; switchTab('path'); });
  const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('sem ' + s); e.click(); }, sel);
  return { ctx, page, errors, click };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---------- 1. zh de hoje, sem módulos
  {
    const { ctx, page, errors } = await openZh(browser, 'light', false);
    const r = await page.evaluate(() => {
      renderUnitsGrid();
      const grid = document.getElementById('units-grid');
      const saved = serializeState();
      const u = UNITS[3]; // bloqueada
      const d = mapUnitDescribe(u, null);
      return { mods: trailHasModules(), labels: grid.querySelectorAll('.module-label').length, cps: grid.querySelectorAll('.unit-block.checkpoint').length,
        units: grid.querySelectorAll('.unit-block').length, stories: grid.querySelectorAll('.story-checkpoint-card').length,
        keys: ['checkpointProgress', 'reviewMilestones', 'levelTestProgress'].filter(k => k in saved),
        fns: ['trailSkipAllowed', 'openCheckpoint', 'openLevelTest', 'startModuleReviewSession', 'handleModuleStepNext'].filter(n => typeof window[n] !== 'function'),
        skipAction: d.actions.length, state: d.status, next: handleModuleStepNext() };
    });
    check('sem módulos: trilha sem rótulo de módulo nem Ponto de verificação do módulo', !r.mods && r.labels === 0 && r.cps === 0, r);
    check('sem módulos: as 18 unidades e as histórias continuam na trilha', r.units === 18 && r.stories > 0, r);
    check('sem módulos: o save não ganha campo de módulo', r.keys.length === 0, r.keys);
    check('funções que o zh chamava sem ter agora existem (risco da seção 9)', r.fns.length === 0, r.fns);
    check('sem módulos: Mapa não oferece pular unidade bloqueada', r.skipAction === 0, r);
    check('sem módulos: "Continuar" não é desviado para o fim de prova', r.next === false);
    check('sem módulos: sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }

  // ---------- 2. zh com módulos falsos
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors, click } = await openZh(browser, theme, true);
    const tag = `[${theme}] `;
    // trilha em lista
    const t1 = await page.evaluate(() => {
      renderUnitsGrid();
      const grid = document.getElementById('units-grid');
      const lists = [...grid.querySelectorAll('.module-units-list')];
      return { labels: [...grid.querySelectorAll('.module-label .ml-text')].map(e => e.textContent.trim()),
        reviews: grid.querySelectorAll('.unit-block.review-milestone').length, cps: grid.querySelectorAll('.unit-block.checkpoint').length,
        lt: grid.querySelectorAll('.level-test-card').length, ltSub: (grid.querySelector('.level-test-sub') || {}).textContent || '',
        storiesInModules: lists.reduce((a, l) => a + l.querySelectorAll('.story-checkpoint-card').length, 0),
        lockedLists: lists.map(l => l.classList.contains('locked')),
        cpBg: getComputedStyle(grid.querySelector('.unit-block.checkpoint')).backgroundColor,
        labelDisplay: getComputedStyle(grid.querySelector('.module-label')).display,
        overflow: document.documentElement.scrollWidth - window.innerWidth };
    });
    check(tag + 'trilha mostra os 3 módulos com título', t1.labels.length === 3 && /Módulo 1 · Primeiros contatos/.test(t1.labels[0]), t1.labels);
    check(tag + 'cada módulo tem Revisão do módulo e Ponto de verificação', t1.reviews === 3 && t1.cps === 3, t1);
    check(tag + 'Teste de Nível no fim, com o texto do chinês', t1.lt === 1 && /chinês/.test(t1.ltSub) && !/francês/.test(t1.ltSub), t1.ltSub);
    check(tag + 'histórias continuam logo depois da unidade, dentro do módulo', t1.storiesInModules > 0, t1);
    check(tag + 'só o 1º módulo aberto', t1.lockedLists.join() === 'false,true,true', t1.lockedLists);
    check(tag + 'CSS de módulos carregado no zh (shared/modulos-niveis.css)', t1.labelDisplay === 'flex' && t1.cpBg !== 'rgba(0, 0, 0, 0)', t1);
    check(tag + 'trilha sem rolagem horizontal em 390px', t1.overflow <= 0, t1.overflow);

    // Mapa
    const t2 = await page.evaluate(() => {
      try { localStorage.setItem('mandarim_trail_view', 'map'); } catch (e) {}
      renderUnitsGrid();
      const grid = document.getElementById('units-grid');
      const keys = [...grid.querySelectorAll('[data-key]')].map(n => n.dataset.key);
      grid.querySelector('[data-key="c:HSK1-m1"]').click();
      const panelCp = grid.textContent;
      grid.querySelector('[data-key="u:2"]').click();
      const panelU2 = grid.textContent;
      try { localStorage.setItem('mandarim_trail_view', 'list'); } catch (e) {}
      return { cps: keys.filter(k => k.startsWith('c:')).length, revs: keys.filter(k => k.startsWith('r:')).length, stories: keys.filter(k => k.startsWith('s:')).length,
        units: keys.filter(k => k.startsWith('u:')).length, panelCp: /Fazer o Ponto de verificação/.test(panelCp), panelU2: /Pular|pular/.test(panelU2) };
    });
    check(tag + 'Mapa: seções com unidades, histórias, Revisão e Ponto de verificação', t2.units === 18 && t2.stories > 0 && t2.cps === 3 && t2.revs === 3, t2);
    check(tag + 'Mapa: painel do Ponto de verificação oferece fazer; unidade bloqueada do módulo aberto oferece pular', t2.panelCp && t2.panelU2, t2);

    // Ponto de verificação do módulo 1
    await page.evaluate(() => { renderUnitsGrid(); document.querySelector('.unit-block.checkpoint .ub-header').click(); });
    const t3 = await page.evaluate(() => ({ on: STEP_STATE.onCheckpoint, title: document.getElementById('ud-title').textContent, eyebrow: document.getElementById('ud-eyebrow').textContent,
      n: CHECKPOINT_STATE.queue.length, kinds: CHECKPOINT_STATE.queue.map(x => x.kind), sample: CHECKPOINT_STATE.queue.slice(0, 3),
      prompt: document.querySelector('.gram-exercise-prompt').textContent, picker: !!document.querySelector('#step-content .pinyin-tone-picker'),
      focus: document.body.classList.contains('lesson-focus'), manual: document.getElementById('unit-manual-btn').style.display }));
    check(tag + 'na prova o botão "Manual da unidade" some', t3.manual === 'none', t3.manual);
    check(tag + 'Ponto de verificação abre pela linha da trilha', t3.on === 'HSK1-m1' && t3.title === 'Primeiros contatos' && /Ponto de verificação/.test(t3.eyebrow) && t3.focus, t3);
    check(tag + 'prova com 12 perguntas de palavra, frase e escuta', t3.n === 12 && ['word', 'phrase', 'listen'].every(k => t3.kinds.includes(k)), t3.kinds);
    check(tag + 'itens pedem pinyin e guardam o hanzi', t3.sample.every(x => x.hanzi && x.shown === `${x.hanzi} (${x.answer})` && !/[一-鿿]/.test(x.answer)), t3.sample);
    check(tag + 'enunciado fala de chinês/pinyin, nunca de francês', /chinês|pinyin/.test(t3.prompt) && !/francês/.test(t3.prompt), t3.prompt);
    check(tag + 'campo tem o teclado de tons do pinyin', t3.picker);

    let sawListen = false, sawAlmost = false, sawNumbered = false, sawWrong = false;
    for (let i = 0; i < 20; i++){
      const st = await page.evaluate(() => ({ i: CHECKPOINT_STATE.index, n: CHECKPOINT_STATE.queue.length, ex: CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index] }));
      if (st.i >= st.n) break;
      let ans = st.ex.answer, mode = 'ok';
      if (st.ex.kind === 'listen' && !sawListen){
        const r = await page.evaluate((h) => ({ btn: !!document.querySelector('.gram-exercise-prompt .audio-btn'), falou: window.__falou.slice(-1)[0], ph: document.getElementById('checkpoint-input').placeholder }), st.ex.hanzi);
        check(tag + 'escuta: botão de som e a voz do zh fala o hanzi', r.btn && r.falou === st.ex.audioText && r.falou === st.ex.hanzi, r);
        sawListen = true;
      } else if (!sawAlmost && /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(ans)){
        ans = ans.normalize('NFD').replace(/[̀-ͯ]/g, ''); mode = 'almost'; sawAlmost = true;
      } else if (!sawNumbered && st.ex.answer === 'nǐ hǎo'){
        ans = 'ni3 hao3'; sawNumbered = true;
      } else if (!sawWrong && i === 3){ ans = 'bu dui'; mode = 'wrong'; sawWrong = true; }
      await page.fill('#checkpoint-input', ans);
      await click('#checkpoint-verify-btn');
      const res = await page.evaluate(() => ({ cls: document.querySelector('.gram-exercise').className, exp: document.getElementById('checkpoint-expected').textContent }));
      if (mode === 'almost') check(tag + 'sem tom = "quase", com hanzi + pinyin na correção', /almost/.test(res.cls) && res.exp.includes(st.ex.hanzi) && res.exp.includes(st.ex.answer), res);
      else if (mode === 'wrong') check(tag + 'errada: correção com hanzi + pinyin', /wrong/.test(res.cls) && res.exp === `→ ${st.ex.hanzi} (${st.ex.answer})`, res);
      else check(tag + `certa (${ans})`, /\bok\b/.test(res.cls), [res, st.ex]);
      await click('#step-content .btn-secondary');
    }
    check(tag + 'a prova passou por escuta, "quase" e erro', sawListen && sawAlmost && sawWrong, { sawListen, sawAlmost, sawWrong });
    const t4 = await page.evaluate(() => ({ pct: CHECKPOINT_STATE.lastPct, html: document.getElementById('step-content').textContent, btn: document.getElementById('step-next-btn').textContent,
      goals: document.querySelectorAll('.module-skill-item').length }));
    // Etapa 6 (2026-10-26): Estrelas aposentadas; pular não dá recompensa, a tela mostra só a nota e o que a aluna já sabe.
    check(tag + 'tela de módulo concluído com a nota e o que a aluna já sabe, sem Estrelas nem XP', t4.pct >= 70 && /Módulo concluído/.test(t4.html) && !/Estrelas|XP/.test(t4.html) && /Pontuação/.test(t4.html) && t4.goals === 3 && /Concluir seção/.test(t4.btn), t4);
    const xp0 = await page.evaluate(() => STATE.xp);
    await click('#step-next-btn');
    const t5 = await page.evaluate(() => {
      const saved = serializeState();
      return { cp: STATE.checkpointProgress['HSK1-m1'], via: [1, 2, 3].map(id => STATE.unitProgress[id].completedVia), xp: STATE.xp,
        next: unitBlockState(UNITS[3]), back: document.getElementById('path-list-wrap').style.display, focus: document.body.classList.contains('lesson-focus'),
        savedCp: saved.checkpointProgress && saved.checkpointProgress['HSK1-m1'], savedKeys: ['checkpointProgress', 'reviewMilestones', 'levelTestProgress'].filter(k => k in saved), saved: JSON.stringify(saved) };
    });
    check(tag + 'aprovado: Ponto de verificação concluído e unidades puladas', t5.cp.completed && t5.cp.bestScore >= 70 && t5.via.every(v => v === 'skip_test'), t5);
    check(tag + 'aprovado: pulo não dá XP e a próxima unidade abre', t5.xp === xp0 && t5.next === 'current', [t5.xp, xp0, t5.next]);
    check(tag + 'volta para a trilha, fora do modo foco', t5.back === 'block' && !t5.focus, t5);
    check(tag + 'save com módulos grava os três campos', t5.savedKeys.length === 3 && t5.savedCp && t5.savedCp.completed, t5.savedKeys);
    // ida e volta: zera e carrega pelo applySerializedState
    const t6 = await page.evaluate((json) => {
      const data = JSON.parse(json);
      STATE.checkpointProgress['HSK1-m1'] = { completed: false, bestScore: 0 };
      applySerializedState(data);
      return STATE.checkpointProgress['HSK1-m1'];
    }, t5.saved);
    check(tag + 'carregar o save devolve o Ponto de verificação', t6.completed === true && t6.bestScore === t5.cp.bestScore, t6);

    // Revisão do módulo 1 (cartões das unidades puladas entram como novos)
    await page.evaluate(() => { renderUnitsGrid(); document.querySelector('.unit-block.review-milestone .ub-header').click(); });
    const t7 = await page.evaluate(() => ({ ms: STATE.reviewSessionMilestone, n: STATE.reviewQueue.length, tab: document.getElementById('review-content').style.display }));
    check(tag + 'Revisão do módulo abre a Revisão com os cartões do módulo', t7.ms && t7.ms.moduleId === 'HSK1-m1' && t7.n > 0 && t7.tab === 'block', t7);
    const t8 = await page.evaluate(() => { STATE.reviewIndex = STATE.reviewQueue.length; renderReviewView(); return { rec: STATE.reviewMilestones['HSK1-m1'], txt: document.getElementById('review-content').textContent }; });
    check(tag + 'fim da Revisão do módulo grava o marco', t8.rec && t8.rec.lastCount > 0 && /Revisão concluída/.test(t8.txt), t8);
    await page.evaluate(() => { document.getElementById('review-again').click(); });
    const t9 = await page.evaluate(() => ({ ms: STATE.reviewSessionMilestone, row: document.querySelector('.unit-block.review-milestone').className }));
    check(tag + 'trilha mostra a Revisão do módulo feita', t9.ms === null && /done/.test(t9.row), t9);

    // Teste de Nível (todas certas)
    await page.evaluate(() => { document.querySelector('.level-test-card').click(); });
    const t10 = await page.evaluate(() => ({ on: STEP_STATE.onLevelTest, goal: document.getElementById('ud-goal').textContent, n: LEVEL_TEST_STATE.queue.length }));
    check(tag + 'Teste de Nível abre, com o texto do chinês', t10.on === 'HSK1-final' && /chinês/.test(t10.goal) && t10.n === 15, t10);
    for (let i = 0; i < 20; i++){
      const st = await page.evaluate(() => ({ i: LEVEL_TEST_STATE.index, n: LEVEL_TEST_STATE.queue.length, ex: LEVEL_TEST_STATE.queue[LEVEL_TEST_STATE.index] }));
      if (st.i >= st.n) break;
      await page.fill('#leveltest-input', i === 0 ? st.ex.hanzi : st.ex.answer); // a 1ª respondida em hanzi também vale
      await click('#leveltest-verify-btn');
      if (i === 0) check(tag + 'Teste de Nível: resposta em hanzi vale', await page.evaluate(() => /\bok\b/.test(document.querySelector('.gram-exercise').className)));
      await click('#step-content .btn-secondary');
    }
    const t11 = await page.evaluate(() => ({ pct: LEVEL_TEST_STATE.lastPct, txt: document.getElementById('step-content').textContent }));
    check(tag + 'tela de nível concluído', t11.pct === 100 && /Nível HSK1 concluído/.test(t11.txt), t11);
    await click('#step-next-btn');
    const t12 = await page.evaluate(() => ({ lt: STATE.levelTestProgress['HSK1-final'], all: UNITS.every(u => STATE.unitProgress[u.id].completed), cps: Object.values(STATE.checkpointProgress).every(c => c.completed),
      badge: document.getElementById('level-done-badge').style.display, overflow: document.documentElement.scrollWidth - window.innerWidth }));
    check(tag + 'aprovado no Teste de Nível: nível inteiro concluído', t12.lt.completed && t12.all && t12.cps && t12.badge === '', t12);
    check(tag + 'sem rolagem horizontal depois de tudo', t12.overflow <= 0, t12.overflow);
    check(tag + 'sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`zh com módulos (motor comum): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
