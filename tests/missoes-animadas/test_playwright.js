// Missões do dia animadas (dona, 2026-11-27; prévia aprovada: velocidade média, selo "✓ Concluída!" sem número).
// Abre fr e zh de verdade (Supabase de mentira que nunca responde), troca todaysChallenges() por 3 missões conhecidas e
// confere: a barra começa no valor do começo da lição e enche até o novo; a missão completada agora ganha .dc-done-now
// (borda verde, selo no lugar do número); a que não mudou fica parada; voltar à tela (sem a foto) mostra o final sem
// animar; com menos movimento, tudo já no final. Também tira as capturas fr/zh claro/escuro.
// Rodar: node tests/missoes-animadas/test_playwright.js
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'); const OUT = process.env.SHOTS_DIR || path.join(require('os').tmpdir(), 'missoes-animadas'); fs.mkdirSync(OUT, { recursive: true });
const types = { '.js':'application/javascript', '.css':'text/css', '.html':'text/html', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.json':'application/json', '.wasm':'application/wasm' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(8790);
const STUB = `(function(){ const pend = () => new Promise(()=>{}); const mk = () => new Proxy(function(){}, { get: (t,k) => k==='then' ? undefined : mk(), apply: () => pend() }); window.supabase = { createClient: () => mk() }; })();`;
let n = 0, fails = 0; const ok = (c, m, x) => { n++; if (!c) { fails++; console.log('  FALHOU:', m, x !== undefined ? JSON.stringify(x) : ''); } };

async function abrir(b, site, scheme, rm){
  const ctx = await b.newContext({ ...devices['Pixel 7'], colorScheme: scheme, reducedMotion: rm, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/supabase\.co|googletagmanager/, r => r.abort());
  await p.route(/vendor\/supabase-js[^/]*\/supabase\.js/, r => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  await p.goto(`http://localhost:8790/${site}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof renderDailyChallengesScreen === 'function' && typeof missionsProgressSnapshot === 'function');
  await p.evaluate(({ site }) => {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const pv = document.getElementById('view-path'); if (pv) { pv.classList.add('active'); pv.style.display = 'block'; }
    document.getElementById('path-list-wrap').style.display = 'none';
    document.getElementById('unit-detail-wrap').style.display = 'block';
    window.__agora = { streak: 1, conj: 0, perfect: 1 };
    const M = (id, icon, label, target) => ({ id, icon, label, target, get: () => window.__agora[id] });
    window.todaysChallenges = () => [M('streak', '🔥', 'Mantenha sua sequência de dias viva hoje', 1), M('conj', '🔤', 'Pratique conjugação em 2 tempos verbais diferentes', 2), M('perfect', '🎯', 'Complete uma lição sem errar', 1)];
    window.routerNavigate = () => {};
  }, { site });
  return { p, ctx, errs };
}
const estado = p => p.evaluate(() => [...document.querySelectorAll('.daily-challenge-card')].map(c => ({
  w: c.querySelector('.daily-challenge-progress-fill').style.width, frac: c.querySelector('.daily-challenge-fraction').textContent,
  fracVisivel: getComputedStyle(c.querySelector('.daily-challenge-fraction')).display !== 'none',
  feita: c.classList.contains('dc-done-now'), selo: getComputedStyle(c.querySelector('.dc-done-pill')).display !== 'none' ? c.querySelector('.dc-done-pill').textContent : '' })));

(async () => {
  const b = await chromium.launch();
  for (const site of ['fr', 'zh']) {
    // 1) animação normal: antes 0/0/0, agora 1/0/1
    const { p, ctx, errs } = await abrir(b, site, 'light', 'no-preference');
    await p.evaluate(() => { STEP_STATE.missionsAtStart = { streak: 0, conj: 0, perfect: 0 }; renderDailyChallengesScreen(); });
    const e0 = await estado(p);
    ok(e0.every(c => c.w === '0%' && !c.feita), `${site}: barras começam no valor do começo da lição`, e0);
    ok(e0[0].frac === '0/1' && e0[2].frac === '0/1', `${site}: número começa no valor antigo`, e0);
    await p.waitForTimeout(250); const e1 = await estado(p);
    ok(e1[0].w === '0%', `${site}: espera ~0,4 s antes de começar`, e1[0]);
    await p.waitForTimeout(2200); const e2 = await estado(p);
    ok(e2[0].w === '100%' && e2[2].w === '100%' && e2[1].w === '0%', `${site}: enche até o valor novo; a que não mudou fica parada`, e2);
    ok(e2[0].feita && e2[2].feita && !e2[1].feita, `${site}: só as completadas agora ganham o destaque`, e2);
    ok(e2[0].selo === t(site, 'pt') && !e2[0].fracVisivel, `${site}: selo "✓ Concluída!" no lugar do número`, e2[0]);
    ok(e2[1].fracVisivel && e2[1].frac === '0/2' && !e2[1].selo, `${site}: a que não mudou mantém o número e sem selo`, e2[1]);
    await p.locator('#step-content').screenshot({ path: path.join(OUT, `${site}-claro.png`) });
    // 2) voltar à tela (sem foto): final, sem animar nem destacar
    await p.evaluate(() => renderDailyChallengesScreen()); const e3 = await estado(p);
    ok(e3[0].w === '100%' && !e3[0].feita && e3[0].fracVisivel && e3[0].frac === '1/1', `${site}: voltar à tela mostra o final sem animação`, e3[0]);
    // 3) avançou sem completar: 18 -> 32 de 50
    await p.evaluate(() => { window.__agora = { streak: 1, conj: 1, perfect: 1 }; STEP_STATE.missionsAtStart = { streak: 1, conj: 0, perfect: 1 }; renderDailyChallengesScreen(); });
    await p.waitForTimeout(1600); const e4 = await estado(p);
    ok(e4[1].w === '50%' && e4[1].frac === '1/2' && !e4[1].feita && e4[1].fracVisivel, `${site}: avançou sem completar: enche até a metade, sem selo`, e4[1]);
    ok(e4[0].w === '100%' && !e4[0].feita, `${site}: completa de antes aparece cheia, sem destaque`, e4[0]);
    ok(errs.length === 0, `${site}: sem erro de página`, errs);
    await ctx.close();
    // 4) escuro (captura) e menos movimento
    for (const [scheme, rm] of [['dark', 'no-preference'], ['light', 'reduce']]) {
      const o = await abrir(b, site, scheme, rm);
      await o.p.evaluate(() => { STEP_STATE.missionsAtStart = { streak: 0, conj: 0, perfect: 0 }; renderDailyChallengesScreen(); });
      if (rm === 'reduce') { await o.p.waitForTimeout(50); const r = await estado(o.p);
        ok(r[0].w === '100%' && r[0].feita && r[2].feita, `${site}: com menos movimento já aparece no final`, r); }
      else { await o.p.waitForTimeout(2500); await o.p.locator('#step-content').screenshot({ path: path.join(OUT, `${site}-escuro.png`) }); }
      ok(o.errs.length === 0, `${site} ${scheme} ${rm}: sem erro de página`, o.errs);
      await o.ctx.close();
    }
  }
  // Card "Missões do dia" da Trilha (2026-11-28): anima quando a missão andou desde a última vez que o card apareceu.
  const card = p => p.evaluate(() => [...document.querySelectorAll('#daily-challenges-strip .dcs-card[data-dc]')].map(c => ({
    w: c.querySelector('.dcs-fill').style.width, frac: c.querySelector('.dcs-fraction').textContent,
    fracVisivel: getComputedStyle(c.querySelector('.dcs-fraction')).display !== 'none', feita: c.classList.contains('dc-done-now'), done: c.classList.contains('done') })));
  for (const site of ['fr', 'zh']) {
    const { p, ctx, errs } = await abrir(b, site, 'light', 'no-preference');
    await p.evaluate(() => { localStorage.setItem(CHALLENGES_STRIP_COLLAPSE_KEY, '0'); sessionStorage.removeItem('dcs-seen'); document.getElementById('path-list-wrap').style.display = 'block'; document.getElementById('unit-detail-wrap').style.display = 'none'; const s = document.getElementById('daily-challenges-strip'); s.style.display = 'block';
      window.__agora = { streak: 0, conj: 0, perfect: 0 }; renderDailyChallengesStrip(); });
    let k = await card(p);
    ok(k.length === 3 && k.every(c => c.w === '0%' && !c.feita), `${site} card: 1ª vez na sessão não anima`, k);
    await p.evaluate(() => { window.__agora = { streak: 1, conj: 1, perfect: 0 }; renderDailyChallengesStrip(); });
    k = await card(p); ok(k[0].w === '0%' && k[1].w === '0%', `${site} card: missão que andou começa no valor de antes`, k);
    await p.waitForTimeout(2000); k = await card(p);
    ok(k[0].w === '100%' && k[0].feita && k[0].done && !k[0].fracVisivel, `${site} card: completada agora enche, fica verde e mostra o selo`, k[0]);
    ok(k[1].w === '50%' && !k[1].feita && k[1].frac === '1/2', `${site} card: avançou sem completar enche até a metade`, k[1]);
    ok(k[2].w === '0%' && !k[2].feita, `${site} card: a que não mudou fica parada`, k[2]);
    await p.evaluate(() => renderDailyChallengesStrip()); k = await card(p);
    ok(k[0].w === '100%' && !k[0].feita && k[0].done && k[0].fracVisivel, `${site} card: na volta seguinte, verde com o número (sem selo)`, k[0]);
    // depois da tela do fim da lição, o card não repete
    await p.evaluate(() => { STEP_STATE.missionsAtStart = { streak: 1, conj: 1, perfect: 0 }; window.__agora = { streak: 1, conj: 2, perfect: 1 }; renderDailyChallengesScreen(); renderDailyChallengesStrip(); });
    k = await card(p); ok(k[1].w === '100%' && k[2].w === '100%' && !k[2].feita, `${site} card: não repete o que a tela do fim da lição mostrou`, k);
    // recolhido não anima; ao abrir mostra o final
    await p.evaluate(() => { localStorage.setItem(CHALLENGES_STRIP_COLLAPSE_KEY, '1'); renderDailyChallengesStrip(); window.__agora = { streak: 1, conj: 2, perfect: 1 }; });
    await p.evaluate(() => { localStorage.setItem(CHALLENGES_STRIP_COLLAPSE_KEY, '0'); renderDailyChallengesStrip(); }); k = await card(p);
    ok(k.every(c => c.w === '100%' && !c.feita), `${site} card: recolhido não anima`, k);
    ok(errs.length === 0, `${site} card: sem erro de página`, errs);
    await p.evaluate(() => { localStorage.setItem(CHALLENGES_STRIP_COLLAPSE_KEY, '0'); sessionStorage.removeItem('dcs-seen'); window.__agora = { streak: 0, conj: 0, perfect: 0 }; renderDailyChallengesStrip(); window.__agora = { streak: 1, conj: 1, perfect: 0 }; renderDailyChallengesStrip(); });
    await p.waitForTimeout(900);
    await p.locator('#daily-challenges-strip').screenshot({ path: path.join(OUT, `${site}-card-meio.png`) });
    await p.waitForTimeout(1300);
    await p.locator('#daily-challenges-strip').screenshot({ path: path.join(OUT, `${site}-card-fim.png`) });
    await ctx.close();
    const o = await abrir(b, site, 'light', 'reduce');
    await o.p.evaluate(() => { localStorage.setItem(CHALLENGES_STRIP_COLLAPSE_KEY, '0'); sessionStorage.removeItem('dcs-seen'); const s = document.getElementById('daily-challenges-strip'); s.style.display = 'block';
      window.__agora = { streak: 0, conj: 0, perfect: 0 }; renderDailyChallengesStrip(); window.__agora = { streak: 1, conj: 0, perfect: 0 }; renderDailyChallengesStrip(); });
    await o.p.waitForTimeout(50); k = await card(o.p);
    ok(k[0].w === '100%' && k[0].feita, `${site} card: com menos movimento já no final`, k[0]);
    await o.ctx.close();
  }
  // inglês: texto do selo
  {
    const { p, ctx } = await abrir(b, 'fr', 'light', 'reduce');
    const en = await p.evaluate(() => (window.I18N_CATALOG && I18N_CATALOG.en ? I18N_CATALOG.en['trail.dailyMissions.doneNow'] : null));
    ok(en === null || en === '✓ Done!', 'inglês: "✓ Done!"', en);
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(`missoes-animadas: ${n - fails}/${n} ok`); process.exit(fails ? 1 : 0);
})();
function t(){ return '✓ Concluída!'; }
