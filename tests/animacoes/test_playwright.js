// Animações (pedido da dona, 2026-11-25; docs/historico/38-animacoes.md), nos dois sites, com os arquivos de produção e a rede stubada:
// "menos movimento" desliga tudo menos a rodinha; "+N" perto da barra na lição (e o aviso de sempre fora dela ou com menos movimento);
// conquista no último nível com anel e confete; carimbo da unidade recém-liberada uma vez só; janelas que fecham deixam por 0,15 s
// uma cópia só de desenho (sem id, inert, sem clique) e a janela real some na hora; com menos movimento, nenhuma cópia.
// Rodar: node tests/animacoes/test_playwright.js
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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function abrir(browser, port, site, { width = 390, reduce = false } = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 844 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\/shared\/vendor\/supabase-js/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${site}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 20000 });
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  return { ctx, page, errors };
}
// Abre a tela da lição (modo foco) com um exercício de múltipla escolha, como o renderExerciseStep faz.
async function licao(page){
  await page.evaluate(() => {
    const u = UNITS[0]; STATE.currentUnitId = u.id;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('step-content'); el.closest('.view').classList.add('active');
    document.getElementById('unit-detail-wrap').style.display = 'block';
    setLessonFocusMode(true);
    STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseIndex = 0; STEP_STATE.exerciseList = [1, 2, 3, 4];
    document.getElementById('step-progress-fill').style.width = '40%';
    const items = (u.vocab || []).slice(0, 4);
    renderMultipleChoiceExercise({ format: 'meaning', item: items[0], options: [items[1], items[0], items[2], items[3]] }, el, document.getElementById('step-next-btn'), 4);
    document.querySelectorAll('.toast').forEach(t => t.remove());
    document.getElementById('step-progress-wrap').scrollIntoView({ block: 'center' });
  });
}

async function site(browser, port, s){
  // 1. +N perto da barra (lição) e aviso de sempre fora dela
  {
    const { ctx, page, errors } = await abrir(browser, port, s);
    await licao(page);
    await page.evaluate(() => addXP(2));
    const r = await page.evaluate(() => ({ perto: [...document.querySelectorAll('.xp-perto-barra')].map(e => e.textContent), toasts: document.querySelectorAll('.toast').length, label: (document.querySelector('.xp-perto-barra') || {}).getAttribute?.('aria-label') }));
    check(`${s}: na lição, +N perto da barra e nenhum aviso no topo`, r.perto.length === 1 && r.perto[0] === '+2' && r.toasts === 0, r);
    check(`${s}: o +N tem o texto completo para o leitor de tela`, /2/.test(r.label || '') && /XP/.test(r.label || ''), r);
    await page.evaluate(() => addXP(1));
    check(`${s}: acertos seguidos não empilham +N`, await page.evaluate(() => document.querySelectorAll('.xp-perto-barra').length) === 1);
    await sleep(1100);
    check(`${s}: o +N some sozinho em ~1 s`, await page.evaluate(() => document.querySelectorAll('.xp-perto-barra').length) === 0);
    await page.evaluate(() => { setLessonFocusMode(false); addXP(3); });
    check(`${s}: fora da lição, o aviso de sempre`, await page.evaluate(() => document.querySelectorAll('.toast').length >= 1 && !document.querySelector('.xp-perto-barra')));

    // 2. Conquista no último nível (tier max) x nível comum
    const b = await page.evaluate(async () => {
      document.getElementById('badge-unlock-layer').innerHTML = '';
      showBadgeUnlockCelebration({ name: 'Teste', desc: '', icon: '🏆', tier: 'gold', level: 2 }, () => {});
      const comum = document.querySelector('.badge-unlock-toast').classList.contains('is-topo');
      document.getElementById('badge-unlock-layer').innerHTML = '';
      showBadgeUnlockCelebration({ name: 'Teste', desc: '', icon: '🏆', tier: 'max', level: 5 }, () => {});
      const topo = document.querySelector('.badge-unlock-toast').classList.contains('is-topo');
      await new Promise(r => setTimeout(r, 500));
      return { comum, topo, conf: document.querySelectorAll('.confete-faisca').length };
    });
    check(`${s}: conquista comum sem festa extra`, b.comum === false, b);
    check(`${s}: último nível com anel e confete do ícone`, b.topo === true && b.conf > 0, b);

    // 3. Unidade recém-liberada: carimbo uma vez só
    const u = await page.evaluate(() => {
      const us = unitsOfLevel(UNITS[0].level); const a = us[0], prox = us[1];
      if (!prox) return { pulou: true };
      STATE.unitProgress[prox.id].unlocked = false; STATE.unitProgress[prox.id].completed = false;
      STATE.unitProgress[a.id].completed = false;
      markUnitCompleted(a.id, 100, { skipToast: true });
      const marcado = UNIDADE_RECEM_LIBERADA;
      exitToPath ? exitToPath() : renderUnitsGrid();
      return { marcado: String(marcado) === String(prox.id), id: prox.id };
    });
    if (!u.pulou){
      await sleep(150);
      const v = await page.evaluate(() => ({ el: document.querySelectorAll('.mov-liberada').length, flag: UNIDADE_RECEM_LIBERADA }));
      check(`${s}: concluir a unidade marca a próxima`, u.marcado, u);
      check(`${s}: a trilha mostra o carimbo e esquece a marca`, v.el === 1 && v.flag === null, v);
      await page.evaluate(() => renderUnitsGrid()); await sleep(100);
      check(`${s}: o carimbo não volta na próxima vez`, await page.evaluate(() => document.querySelectorAll('.mov-liberada').length) === 0);
    }

    // 4. Janelas: a real some na hora e fica uma cópia só de desenho por ~0,15 s
    await page.evaluate(() => { document.querySelectorAll('.toast,.badge-unlock-toast').forEach(t => t.remove()); });
    await page.evaluate(() => document.getElementById('lang-switcher-btn').click());
    await sleep(250);
    const aberto = await page.evaluate(() => getComputedStyle(document.getElementById('lang-switcher-dropdown')).animationName);
    check(`${s}: menu da bandeira entra animado`, /mov-(menu|gaveta)-in/.test(aberto), aberto);
    await page.keyboard.press('Escape');
    const f = await page.evaluate(() => {
      const real = document.getElementById('lang-switcher-dropdown');
      const g = document.querySelector('.mov-fantasma');
      return { realFechado: !real.classList.contains('open'), g: !!g, gId: g && (g.id || g.querySelector('[id]') ? 'tem id' : ''), inert: g && g.inert, aria: g && g.getAttribute('aria-hidden'), pe: g && getComputedStyle(g).pointerEvents };
    });
    check(`${s}: ao fechar, a janela real fecha na hora`, f.realFechado, f);
    check(`${s}: e fica uma cópia só de desenho (sem id, inert, aria-hidden, sem clique)`, f.g && !f.gId && f.inert && f.aria === 'true' && f.pe === 'none', f);
    await sleep(260);
    check(`${s}: a cópia é apagada sozinha`, await page.evaluate(() => !document.querySelector('.mov-fantasma')));
    check(`${s}: 0 erros de página`, errors.filter(e => !/createClient|Failed to fetch|NetworkError/.test(e)).length === 0, errors.slice(0, 3));
    await ctx.close();
  }
  // 5. Menos movimento
  {
    const { ctx, page, errors } = await abrir(browser, port, s, { reduce: true });
    await licao(page);
    await page.evaluate(() => addXP(2));
    check(`${s} menos movimento: na lição, aviso de sempre (o +N sumiria sem ser visto)`, await page.evaluate(() => !document.querySelector('.xp-perto-barra') && document.querySelectorAll('.toast').length >= 1));
    const r = await page.evaluate(() => {
      const sp = document.createElement('span'); sp.className = 'loading-spinner'; document.body.appendChild(sp);
      const st = getComputedStyle(sp), w = getComputedStyle(document.querySelector('.exercise-wrap'));
      return { wrap: w.animationDuration, spin: st.animationName + ' ' + st.animationIterationCount };
    });
    check(`${s} menos movimento: animações terminam na hora`, r.wrap === '0.001s', r);
    check(`${s} menos movimento: a rodinha continua girando`, /loadingSpin infinite/.test(r.spin), r);
    await page.evaluate(() => document.getElementById('lang-switcher-btn').click()); await sleep(50); await page.keyboard.press('Escape');
    check(`${s} menos movimento: nenhuma cópia ao fechar janela`, await page.evaluate(() => !document.querySelector('.mov-fantasma')));
    check(`${s} menos movimento: 0 erros de página`, errors.filter(e => !/createClient|Failed to fetch|NetworkError/.test(e)).length === 0, errors.slice(0, 3));
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const s of ['fr', 'zh']) await site(browser, port, s);
  console.log(`Animações (fr, zh): ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
})();
