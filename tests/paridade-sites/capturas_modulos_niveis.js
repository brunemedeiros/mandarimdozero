// Paridade B2 (docs/auditoria-paridade-fr-zh.md): capturas do sistema de módulos e níveis do fr, para comparar ANTES
// (origin/main num worktree) e DEPOIS da mudança para shared/core/modulos-niveis.js + shared/modulos-niveis.css.
// Uso: node tests/paridade-sites/capturas_modulos_niveis.js <pasta-da-árvore> <pasta-de-saída>
// Compare com: node tests/e4/comparar-capturas.js <antes> <depois> 0
// Cenas (fr, claro/escuro, 390px e 1200px): trilha em lista com módulos (unidade concluída, pulada, Revisão do módulo
// feita, Ponto de verificação aprovado, Teste de Nível), janela do seletor de nível, trilha no Mapa com o painel do
// Ponto de verificação, pergunta do Ponto de verificação, resposta errada e "quase", tela de módulo concluído, tela de
// "Quase lá", pergunta do Teste de Nível, tela de nível concluído e o 1º cartão da Revisão do módulo.
// zh (sem módulos, tem de ficar igual): trilha em lista, Mapa com painel de unidade, lição aberta e aba Revisão.
// Tempo congelado, Math.random com semente, animações desligadas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/b2-capturas');
fs.mkdirSync(OUT, { recursive: true });
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

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const hashes = {};
  for (const theme of ['light', 'dark']) for (const width of [390, 1200]) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => {
      try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); localStorage.setItem('frances_trail_view', 'list'); } catch (e) {}
      let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; window.__seed = (n) => { s = n; };
    }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
    const shot = async (name) => {
      await page.clock.runFor(4000);
      await page.evaluate(() => {
        document.querySelectorAll('#streak-modal-overlay, .toast, .toast-container, #toast, .badge-unlock-toast, .confetti-piece').forEach(e => e.remove());
        document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); return document.fonts && document.fonts.ready;
      });
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ fullPage: true });
      const full = `fr-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    // ---- estado: A1-1 concluída, A1-2 pulada, Revisão do módulo 1 feita, Ponto de verificação 1 aprovado, A1-3 atual
    await page.evaluate(() => {
      switchTab('path');
      const ids = MODULES[0].unitIds;
      STATE.unitProgress[ids[0]].completed = true; STATE.unitProgress[ids[0]].started = true; STATE.unitProgress[ids[0]].completedVia = 'lessons';
      STATE.unitProgress[ids[1]].completed = true; STATE.unitProgress[ids[1]].started = true; STATE.unitProgress[ids[1]].completedVia = 'skip_test';
      STATE.checkpointProgress[MODULES[0].id] = { completed: true, bestScore: 83 };
      STATE.reviewMilestones[MODULES[0].id] = { lastDate: '2026-10-12', lastCount: 12 };
      recalculateUnlockedUnits(); renderUnitsGrid();
    });
    await shot('trilha-lista');
    await click('#level-toggle-btn');
    await shot('seletor-nivel');
    await click('#level-modal-close');
    // ---- Mapa com o painel do Ponto de verificação do módulo 1
    await page.evaluate(() => { try { localStorage.setItem('frances_trail_view', 'map'); } catch (e) {} renderUnitsGrid();
      const n = document.querySelector('#units-grid [data-key="c:' + MODULES[0].id + '"]'); n && n.click(); });
    await shot('mapa-checkpoint');
    await page.evaluate(() => { try { localStorage.setItem('frances_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); });
    // ---- Ponto de verificação do módulo 1
    await page.evaluate(() => { __seed(99); openCheckpoint(MODULES[0].id); });
    await shot('checkpoint-pergunta');
    await page.fill('#checkpoint-input', 'resposta errada');
    await click('#checkpoint-verify-btn');
    await shot('checkpoint-errado');
    // uma "quase": a próxima pergunta cuja resposta tem acento, sem o acento
    await page.evaluate(() => {
      const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
      const i = CHECKPOINT_STATE.queue.findIndex((x, k) => k > 0 && strip(x.answer) !== x.answer);
      CHECKPOINT_STATE.index = i < 0 ? 1 : i; renderCheckpointQuizStep();
      document.getElementById('checkpoint-input').value = strip(CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index].answer);
      document.getElementById('checkpoint-verify-btn').click();
    });
    await shot('checkpoint-quase');
    // fim aprovado
    await page.evaluate(() => { CHECKPOINT_STATE.index = CHECKPOINT_STATE.queue.length; CHECKPOINT_STATE.score = CHECKPOINT_STATE.queue.length - 1; renderCheckpointQuizStep(); });
    await shot('modulo-concluido');
    await click('#step-next-btn');
    // fim reprovado (módulo 2)
    await page.evaluate(() => { STATE.unitProgress[MODULES[1].unitIds[0]].unlocked = true; __seed(5); openCheckpoint(MODULES[1].id);
      CHECKPOINT_STATE.index = CHECKPOINT_STATE.queue.length; CHECKPOINT_STATE.score = 2; renderCheckpointQuizStep(); });
    await shot('modulo-quase-la');
    await click('#step-next-btn');
    // ---- Teste de Nível
    await page.evaluate(() => { __seed(2024); openLevelTest(LEVEL_TESTS[0].id); });
    await shot('teste-nivel-pergunta');
    await page.evaluate(() => { LEVEL_TEST_STATE.index = LEVEL_TEST_STATE.queue.length; LEVEL_TEST_STATE.score = LEVEL_TEST_STATE.queue.length; renderLevelTestQuizStep(); });
    await shot('nivel-concluido');
    await click('#step-next-btn');
    await shot('trilha-depois-do-nivel');
    // ---- Revisão do módulo 1 (1º cartão)
    await page.evaluate(() => { __seed(31); startModuleReviewSession(MODULES[0].id); });
    await shot('revisao-do-modulo');
    if (errors.length) console.log(`  erros de página (${theme} ${width}):`, errors.slice(0, 3));
    await ctx.close();
    // ---- zh (sem módulos): trilha em lista, Mapa, lição aberta e Revisão têm de ficar iguais às de antes
    const ctz = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    const pz = await ctz.newPage();
    const errz = [];
    pz.on('pageerror', e => errz.push(String(e)));
    await pz.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
    await pz.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await pz.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await pz.addInitScript((th) => {
      try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); localStorage.setItem('mandarim_trail_view', 'list'); } catch (e) {}
      let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    }, theme);
    await pz.goto(`http://127.0.0.1:${port}/zh/index.html`);
    await pz.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await pz.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await pz.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    await pz.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const shotz = async (name) => {
      await pz.clock.runFor(4000);
      await pz.evaluate(() => { document.querySelectorAll('#streak-modal-overlay, .toast, .toast-container, #toast, .badge-unlock-toast, .confetti-piece').forEach(e => e.remove());
        document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); return document.fonts && document.fonts.ready; });
      await pz.waitForTimeout(200);
      const buf = await pz.screenshot({ fullPage: true });
      const full = `zh-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    await pz.evaluate(() => { switchTab('path'); STATE.unitProgress[UNITS[0].id].completed = true; STATE.unitProgress[UNITS[0].id].started = true; recalculateUnlockedUnits(); renderUnitsGrid(); });
    await shotz('trilha-lista');
    await pz.evaluate(() => { try { localStorage.setItem('mandarim_trail_view', 'map'); } catch (e) {} renderUnitsGrid();
      const n = document.querySelector('#units-grid [data-key^="u:"]'); n && n.click(); });
    await shotz('mapa');
    await pz.evaluate(() => { try { localStorage.setItem('mandarim_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); openUnitDetail(UNITS[1].id); });
    await shotz('licao');
    await pz.evaluate(() => { exitToPath(); switchTab('review'); });
    await shotz('revisao');
    if (errz.length) console.log(`  erros de página zh (${theme} ${width}):`, errz.slice(0, 3));
    await ctz.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  await browser.close(); server.close();
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
