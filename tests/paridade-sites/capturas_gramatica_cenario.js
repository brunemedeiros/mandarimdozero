// Paridade C6 (docs/auditoria-paridade-fr-zh.md): capturas da unidade de gramática e do exercício de cenário do fr,
// para comparar ANTES (origin/main num worktree) e DEPOIS da mudança para shared/core/gramatica-cenario.js.
// Uso: node tests/paridade-sites/capturas_gramatica_cenario.js <pasta-da-árvore> <pasta-de-saída>
// Compare com: node tests/e4/comparar-capturas.js <antes> <depois> 0
// Cenas (fr, claro/escuro, 390px e 1200px): explicação (1º bloco), bloco final com tabela, exercício vazio, exercício
// errado, exercício "quase", exercício certo, cenário (com bandeira) e cenário respondido errado com o painel.
// Tempo congelado, Math.random com semente, animações desligadas.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/c6-capturas');
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
const GRAM_UNIT = 'A1-g1', SCEN_UNIT = 'A1-2';

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
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {} Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    // Sem áudio de verdade (o botão de som não pode mudar de estado entre as capturas).
    await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const shot = async (name) => {
      await page.waitForTimeout(250);
      await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); return document.fonts && document.fonts.ready; });
      const buf = await page.screenshot({ fullPage: true });
      const full = `fr-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    // ---- Unidade de gramática
    await page.evaluate((id) => { switchTab('path'); STATE.unitProgress[id] = STATE.unitProgress[id] || {}; openUnitDetail(id); }, GRAM_UNIT);
    await shot('gram-explicacao-1');
    await page.evaluate(() => { const u = UNITS.find(x => x.id === STATE.currentUnitId); STEP_STATE.explanationIndex = u.grammar.blocks.length - 1; renderStep(); });
    await shot('gram-explicacao-tabela');
    await page.click('#step-next-btn');
    await shot('gram-exercicio');
    await page.fill('#gram-exercise-input', 'xyz');
    await page.click('#gram-exercise-verify-btn');
    await shot('gram-exercicio-errado');
    // Exercício "quase": "êtes" (índice 4) digitado sem acento.
    await page.evaluate(() => { STEP_STATE.gramExerciseIndex = 4; renderStep(); });
    await page.fill('#gram-exercise-input', 'etes');
    await page.click('#gram-exercise-verify-btn');
    await shot('gram-exercicio-quase');
    await page.evaluate(() => { STEP_STATE.gramExerciseIndex = 0; renderStep(); });
    await page.fill('#gram-exercise-input', 'suis');
    await page.click('#gram-exercise-verify-btn');
    await shot('gram-exercicio-certo');
    // ---- Exercício de cenário (frase com bandeira), montado à mão para ser igual nos dois lados
    await page.evaluate((id) => {
      exitToPath && exitToPath();
      STATE.unitProgress[id] = STATE.unitProgress[id] || {};
      openUnitDetail(id);
      const u = UNITS.find(x => x.id === id);
      const sc = u.phrases.filter(p => p.scenario);
      const alvo = sc.find(p => p.scenarioEmoji === '🇧🇷') || sc[0];
      const outras = sc.filter(p => p !== alvo).slice(0, 2);
      STEP_STATE.exerciseList = [{ format: 'scenario', phrase: alvo, options: [outras[0], alvo, outras[1]] }];
      STEP_STATE.exerciseIndex = 0; STEP_STATE.exerciseScore = 0;
      renderExerciseStep();
    }, SCEN_UNIT);
    await shot('cenario');
    await page.click('.scenario-option[data-idx="0"]');
    await page.waitForTimeout(900);
    await shot('cenario-errado');
    if (errors.length) console.log(`  erros de página (${theme} ${width}):`, errors.slice(0, 3));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  await browser.close(); server.close();
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
