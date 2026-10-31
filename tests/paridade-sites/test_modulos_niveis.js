// Paridade B2 (docs/auditoria-paridade-fr-zh.md; registro docs/historico/26-paridade-b2-modulos-niveis.md): o sistema
// de módulos e níveis saiu do fr/app.js para shared/core/modulos-niveis.js. Este teste prova que o fr faz EXATAMENTE o
// mesmo que antes, rodando a mesma sequência no fr de REF (main antes da mudança, num worktree temporário) e no fr
// desta árvore, no navegador de verdade (Playwright), e comparando tudo:
//  - HTML da trilha (lista e Mapa, com painéis do Mapa abertos), do título e da janela do seletor de nível, em vários
//    estados (zerado, com unidades concluídas, puladas, Ponto de verificação e Revisão do módulo feitos, nível A2 vazio);
//  - fila da prova de cada módulo e do Teste de Nível (mesma semente do sorteio);
//  - Ponto de verificação aprovado (certas, uma "quase", uma errada) e reprovado: HTML de cada pergunta e da correção,
//    tela final, estado salvo (serializeState) e trilha depois do "Continuar";
//  - Teste de Nível aprovado: perguntas, tela final, estado salvo;
//  - Revisão do módulo: fila, tela de fim, marco gravado, estado salvo;
//  - regras de bloqueio (flag de Premium ligada x desligada, plano, módulo bloqueado) e a unidade pulada estudada depois.
// Rodar: node tests/paridade-sites/test_modulos_niveis.js   (REF padrão adf10b82; PARIDADE_B2_REF=<commit> para outro)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const { etapa7 } = require('./etapa7-neutro.js'); // Etapa 7 (2026-10-31): vocabulário aprovado pela dona
const REF = process.env.PARIDADE_B2_REF || 'adf10b82';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 700) : ''); } };

// Roda a sequência inteira numa árvore e devolve { nome: valor }.
async function fingerprint(browser, root){
  const server = serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {}
    let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    window.__seed = (n) => { s = n; };
  });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; switchTab('path'); });
  const out = {};
  const grab = async (name, fn, arg) => { out[name] = await page.evaluate(fn, arg); };
  // Clique pelo DOM (a janela de sequência do dia pode cobrir a tela; aqui só importa o que o clique faz).
  const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('sem ' + s); e.click(); }, sel);
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerHTML : null; }, sel);
  // estado salvo sem o carimbo de tempo do save (o relógio está congelado, mas não depende de nada disto)
  const saved = () => page.evaluate(() => JSON.stringify(serializeState()));

  // ---- 1. trilha zerada (lista), título e janela do seletor de nível
  await page.evaluate(() => { try { localStorage.setItem('frances_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); });
  out.grid_zerada = await html('#units-grid');
  out.titulo_nivel = await html('#path-level-title');
  await click('#level-toggle-btn');
  out.janela_nivel = await html('#level-modal-list');
  out.janela_visivel = await page.evaluate(() => document.getElementById('level-modal').style.display);
  await click('#level-modal-close');
  // escolher o A2 pela janela (nível sem conteúdo)
  await click('#level-toggle-btn');
  await click('.level-list-item[data-level="A2"]');
  out.grid_a2 = await html('#units-grid');
  out.titulo_a2 = await html('#path-level-title');
  await page.evaluate(() => { STATE.currentLevel = 'A1'; renderUnitsGrid(); });

  // ---- 2. filas da prova (mesma semente)
  await grab('filas', () => MODULES.map(m => { __seed(777); return buildCheckpointQueue(m); }));
  await grab('fila_teste_nivel', () => { __seed(4242); return buildLevelTestQueue(LEVEL_TESTS[0]); });
  await grab('helpers', () => ({
    mods: LEVELS.map(l => modulesOfLevel(l.id).map(m => m.id)), units: LEVELS.map(l => unitsOfLevel(l.id).map(u => u.id)),
    ordinal: UNITS.filter(u => u.level === 'A1').map(u => unitOrdinalInfo(u, unitsOfLevel('A1'))),
    first: UNITS.map(u => isFirstOfLevel(u)), tests: LEVELS.map(l => levelTestsOfLevel(l.id).map(t => t.id)),
    pct: MODULES.map(moduleProgressPct), done: MODULES.map(moduleCompleted), open: MODULES.map(moduleUnlocked),
    lvl: LEVELS.map(l => levelCompleted(l.id)), stars: [0, 10, 33, 50, 69, 70, 99, 100].map(lessonStars),
    skip: trailSkipAllowed(), cpState: JSON.stringify(STATE.checkpointProgress), ltState: JSON.stringify(STATE.levelTestProgress),
  }));

  // ---- 3. Ponto de verificação APROVADO do módulo 1: certas, uma "quase" (sem acento) e uma errada
  await page.evaluate(() => { __seed(99); openCheckpoint('A1-m1'); });
  out.cp_ud = await page.evaluate(() => ['ud-eyebrow', 'ud-title', 'ud-goal'].map(id => document.getElementById(id).textContent).join('|'));
  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (let i = 0; ; i++){
    const st = await page.evaluate(() => ({ i: CHECKPOINT_STATE.index, n: CHECKPOINT_STATE.queue.length, ex: CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index] }));
    if (st.i >= st.n) break;
    out['cp_q' + i] = await html('#step-content');
    let ans = st.ex.answer;
    if (i === 1) ans = 'resposta errada';
    else if (i === 2 && strip(ans) !== ans) ans = strip(ans);
    await page.fill('#checkpoint-input', ans);
    await click('#checkpoint-verify-btn');
    out['cp_r' + i] = await html('#step-content');
    await click('#step-content .btn-secondary');
  }
  out.cp_fim = await html('#step-content');
  out.cp_fim_btn = await page.evaluate(() => document.getElementById('step-next-btn').textContent + '|' + document.getElementById('step-next-btn').style.display);
  out.cp_fim_pct = await page.evaluate(() => CHECKPOINT_STATE.lastPct);
  await click('#step-next-btn');
  out.cp_estado = await saved();
  out.cp_grid = await html('#units-grid');
  out.cp_step = await page.evaluate(() => JSON.stringify({ a: STEP_STATE.onCheckpoint, b: STEP_STATE.onLevelTest, f: document.body.classList.contains('lesson-focus') }));

  // ---- 4. Ponto de verificação REPROVADO do módulo 2 (tudo errado)
  await page.evaluate(() => { STATE.unitProgress[MODULES[1].unitIds[0]].unlocked = true; __seed(5); openCheckpoint('A1-m2'); });
  for (let i = 0; ; i++){
    const st = await page.evaluate(() => ({ i: CHECKPOINT_STATE.index, n: CHECKPOINT_STATE.queue.length }));
    if (st.i >= st.n) break;
    await page.fill('#checkpoint-input', 'x');
    await click('#checkpoint-verify-btn');
    if (i === 0) out.cp2_r0 = await html('#step-content');
    await click('#step-content .btn-secondary');
  }
  out.cp2_fim = await html('#step-content');
  await click('#step-next-btn');
  out.cp2_estado = await saved();

  // ---- 5. Revisão do módulo 1 (cartões das unidades puladas entram como novos)
  await page.evaluate(() => { __seed(31); startModuleReviewSession('A1-m1'); });
  out.rev_fila = await page.evaluate(() => STATE.reviewQueue.map(c => c.id));
  out.rev_marco = await page.evaluate(() => JSON.stringify(STATE.reviewSessionMilestone));
  await page.evaluate(() => { STATE.reviewIndex = STATE.reviewQueue.length; renderReviewView(); });
  out.rev_fim = await html('#review-content');
  out.rev_estado = await saved();
  await click('#review-again');
  out.rev_grid = await html('#units-grid');

  // ---- 6. Mapa: trilha e painéis (unidade concluída, bloqueada, Revisão do módulo, Ponto de verificação)
  await page.evaluate(() => { try { localStorage.setItem('frances_trail_view', 'map'); } catch (e) {} renderUnitsGrid(); });
  out.mapa = await html('#units-grid');
  const nodes = await page.evaluate(() => [...document.querySelectorAll('#units-grid [data-key]')].map(n => n.dataset.key));
  out.mapa_chaves = nodes;
  for (const key of nodes.filter((k, i) => i < 4 || /^[rc]:/.test(k) || k === nodes[nodes.length - 1])){
    await page.evaluate((k) => { const n = document.querySelector(`#units-grid [data-key="${k}"]`); n && n.click(); }, key);
    out['mapa_painel_' + key] = await html('#units-grid');
  }
  await page.evaluate(() => { try { localStorage.setItem('frances_trail_view', 'list'); } catch (e) {} renderUnitsGrid(); });

  // ---- 7. Teste de Nível aprovado (todas certas)
  await page.evaluate(() => { __seed(2024); openLevelTest(LEVEL_TESTS[0].id); });
  out.lt_ud = await page.evaluate(() => ['ud-eyebrow', 'ud-title', 'ud-goal'].map(id => document.getElementById(id).textContent).join('|'));
  for (let i = 0; ; i++){
    const st = await page.evaluate(() => ({ i: LEVEL_TEST_STATE.index, n: LEVEL_TEST_STATE.queue.length, ex: LEVEL_TEST_STATE.queue[LEVEL_TEST_STATE.index] }));
    if (st.i >= st.n) break;
    if (i < 3) out['lt_q' + i] = await html('#step-content');
    await page.fill('#leveltest-input', st.ex.answer);
    await click('#leveltest-verify-btn');
    if (i < 3) out['lt_r' + i] = await html('#step-content');
    await click('#step-content .btn-secondary');
  }
  out.lt_fim = await html('#step-content');
  await click('#step-next-btn');
  out.lt_estado = await saved();
  out.lt_grid = await html('#units-grid');

  // ---- 8. regras de bloqueio
  await grab('bloqueio', () => {
    const perms = (skip, roles) => ({ roles, admin: false, permissions: { trail_skip_locked: { enabled: skip, limit: null } }, free: {} });
    const o = { off: trailSkipAllowed() };
    TRAIL_SKIP_PAYWALL_ENABLED = true; TRAIL_PERMS_REQUESTED = true;
    MY_PERMISSIONS = perms(false, ['user']);
    renderUnitsGrid();
    o.free = trailSkipAllowed(); o.freeGrid = document.getElementById('units-grid').innerHTML;
    STEP_STATE.onCheckpoint = null; openCheckpoint('A1-m2'); o.freeOpen = STEP_STATE.onCheckpoint;
    STEP_STATE.onLevelTest = null; openLevelTest('A1-final'); o.freeLt = STEP_STATE.onLevelTest;
    MY_PERMISSIONS = perms(true, ['user', 'premium_basic']); o.premium = trailSkipAllowed();
    MY_PERMISSIONS = perms(true, ['user', 'student']); o.aluno = trailSkipAllowed();
    MY_PERMISSIONS = null; TRAIL_SKIP_PAYWALL_ENABLED = false;
    STEP_STATE.onCheckpoint = null; openCheckpoint('A1-m4'); o.lockedModule = STEP_STATE.onCheckpoint;
    exitToPath();
    return o;
  });

  // ---- 9. unidade pulada estudada de verdade depois
  await grab('pulada_estudada', () => {
    const id = MODULES[0].unitIds[1];
    const xp0 = STATE.xp;
    markUnitCompleted(id, 90, { skipToast: true });
    return JSON.stringify({ p: STATE.unitProgress[id], dxp: STATE.xp - xp0 });
  });
  out.estado_final = await saved();
  out.erros = errors.filter(e => !/ERR_TUNNEL|Failed to fetch|NetworkError/.test(e));
  await ctx.close();
  server.close();
  return out;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-b2-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    const antes = await fingerprint(browser, wt);
    const depois = await fingerprint(browser, ROOT);
    check('a sequência rodou no fr de antes', Object.keys(antes).length > 40, Object.keys(antes).length);
    check('fr de antes: sem erro de página', antes.erros.length === 0, antes.erros);
    check('fr de agora: sem erro de página', depois.erros.length === 0, depois.erros);
    check('mesmas cenas', JSON.stringify(Object.keys(antes)) === JSON.stringify(Object.keys(depois)), [Object.keys(antes).length, Object.keys(depois).length]);
    let iguais = 0;
    for (const k of Object.keys(antes)){
      if (k === 'erros') continue;
      // a porta do servidor de teste aparece nas URLs dos ícones, e o "tc-sticky" do cartão "Continue de onde parou" vem
      // de um IntersectionObserver (depende de quando ele dispara, não do código testado): não contam
      const norm = (v) => JSON.stringify(v).replace(/127\.0\.0\.1:\d+/g, 'HOST').replace(/ tc-sticky/g, '');
      // Etapa 6 (decisões da dona, 2026-10-26; docs/i18n/etapa6-boas-vindas-proposta.md, seção 7): mudanças de propósito
      // aplicadas ao fr de ANTES, para a comparação provar que o resto não mudou: a tela de módulo/nível concluído não tem
      // mais "Estrelas"; unidade pulada mostra só o selo "Pulada" (sem "N de N lições" ao lado, na trilha e no painel do Mapa).
      const etapa6 = (v) => v
        .replace(/<div class=\\"lc-stat\\"><div class=\\"lc-stat-label\\">Estrelas<\/div>.*?<\/div><\/div>\\n\s*/g, '')
        .replace(/(class=\\"unit-block[^"\\]*\bskipped\b[\s\S]*?<div class=\\"ub-frac\\">)[^<]*(<\/div>)/g, '$1$2')
        .replace(/(tm-status\\">Pulada<\/div>[\s\S]*?)<p class=\\"tm-line\\">\d+ de \d+ lições? concluídas?<\/p>/g, '$1');
      const a = etapa7(etapa6(norm(antes[k]))), b = norm(depois[k]); // etapa7: vocabulário (2026-10-31)
      if (a === b){ iguais++; passed++; continue; }
      let i = 0; while (i < a.length && a[i] === b[i]) i++;
      check('igual ao fr de antes: ' + k, false, { antes: a.slice(Math.max(0, i - 120), i + 200), depois: (b || '').slice(Math.max(0, i - 120), i + 200) });
    }
    // sanidade: as cenas mostram o que deviam (não é só "vazio igual a vazio")
    check('trilha tem módulos, Revisão do módulo e Ponto de verificação', /module-label/.test(depois.grid_zerada) && /review-milestone/.test(depois.grid_zerada) && /unit-block checkpoint/.test(depois.grid_zerada));
    check('trilha tem o Teste de Nível', /level-test-card/.test(depois.grid_zerada));
    check('ponto aprovado: nota >= 70 e unidades puladas', depois.cp_fim_pct >= 70 && /skip_test/.test(depois.cp_estado), depois.cp_fim_pct);
    check('ponto reprovado mostra "Quase lá"', /Quase lá/.test(depois.cp2_fim));
    check('revisão do módulo teve fila e gravou o marco', depois.rev_fila.length > 0 && /reviewMilestones":\{"A1-m1":\{"lastDate":"2026-10-14"/.test(depois.rev_estado), depois.rev_fila.length);
    check('teste de nível aprovado', /"A1-final":\{"completed":true/.test(depois.lt_estado));
    check('bloqueio: free não pula nem abre o ponto/teste; Premium e aluno pulam', depois.bloqueio.free === false && depois.bloqueio.premium && depois.bloqueio.aluno && depois.bloqueio.freeOpen === null && depois.bloqueio.freeLt === null, depois.bloqueio);
    console.log(`  cenas iguais ao fr de antes: ${iguais}/${Object.keys(antes).length - 1}`);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`módulos e níveis (fr antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
