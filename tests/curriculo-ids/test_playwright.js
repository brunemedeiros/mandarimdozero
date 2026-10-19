// Etapa 0a do currículo, navegador real: a trilha do fr carrega um save (progresso por chave, órfão vai para o arquivo),
// a unidade abre, a lição 1 roda com cliques reais, o save leva released/arquivo/versão/lessonId e tudo volta ao recarregar.
// Rodar: node tests/curriculo-ids/test_playwright.js [pasta-para-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv[2] || null;
const shot = async (page, n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n) }); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const db = window.__db = { progress: JSON.parse(sessionStorage.getItem('__progress') || 'null') };
  const empty = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => empty; } });
  function from(table){
    if (table === 'progress'){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.progress ? { data: JSON.parse(JSON.stringify(db.progress)) } : null, error: null }; },
        async upsert(p){ db.progress = JSON.parse(JSON.stringify(p.data)); sessionStorage.setItem('__progress', JSON.stringify(db.progress)); return { error: null }; } };
      return q;
    }
    return empty;
  }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('ok  ', n); } else { fail++; console.log('FALHOU', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errs = [], cons = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) cons.push(m.text()); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  // save inicial: palavra estudada + órfão antigo + cartão da professora
  const save = { frances: { xp: 50, cards: [
    { id: 'uA1-1-v0', reps: 3, stability: 12.5, difficulty: 4, state: 'review', lastReview: 1790000000000, due: 1791000000000, fsrsMigrated: true },
    { id: 'uA1-1-v99', reps: 2, stability: 7, state: 'review', lastReview: 1780000000000, due: 1781000000000, fsrsMigrated: true },
  ], unitProgress: { 'A1-1': { started: true, completed: false, unlocked: true, lessonIdx: 0, lessonMisses: {} } } } };
  await page.addInitScript((s) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); if (!sessionStorage.getItem('__progress')) sessionStorage.setItem('__progress', JSON.stringify(s)); } catch (e) {} }, save);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof loadState === 'function', null, { timeout: 20000 });
  const r1 = await page.evaluate(async () => {
    CURRENT_USER = { id: 'u-nav' }; progressLoadedOk = false;
    await loadStateAndRender();
    const c = STATE.cards.find(x => x.id === 'uA1-1-v0');
    return { reps: c.reps, stab: c.stability, studyKey: c.studyKey, archive: Object.keys(STATE.retiredStudyCards), unitCards: (document.getElementById('path-list-wrap').innerText.match(/Cumprimentar e se despedir/g) || []).length, pathVisible: getComputedStyle(document.getElementById('path-list-wrap')).display !== 'none' };
  });
  check('trilha visível com unidades', r1.pathVisible && r1.unitCards > 0, r1);
  check('progresso do cartão salvo voltou (reps 3, stability 12.5) com chave', r1.reps === 3 && r1.stab === 12.5 && r1.studyKey === 'A1-1-v0', r1);
  check('órfão antigo foi para o arquivo', JSON.stringify(r1.archive) === '["uA1-1-v99"]', r1.archive);
  await shot(page, 'nav-1-trilha.png');

  // abre a unidade A1-1 com clique real no cartão da unidade, se houver; senão pela função
  const opened = await page.evaluate(() => { const el = document.querySelector('#path-list-wrap [data-unit-id="A1-1"]'); if (el){ el.click(); return 'clique'; } openUnitDetail('A1-1'); return 'função'; });
  await page.waitForTimeout(500);
  const r2 = await page.evaluate(() => ({ detail: getComputedStyle(document.getElementById('unit-detail-wrap')).display, know: [...document.querySelectorAll('.know-btn')].map(b => b.dataset.cardId) }));
  check(`unidade A1-1 abriu (${opened})`, r2.detail !== 'none', r2);
  await shot(page, 'nav-2-unidade.png');

  // roda a lição com cliques reais: Continuar; nos exercícios, tenta a opção certa (texto da resposta) e senão a 1ª
  let steps = 0, lessonDone = false;
  for (; steps < 120; steps++){
    const st = await page.evaluate(() => ({ idx: STATE.unitProgress['A1-1'].lessonIdx, boundary: !!STEP_STATE.onLessonBoundaryScreen }));
    if (st.idx >= 1){ lessonDone = true; break; }
    const clickIf = async (sel) => { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); return true; } return false; };
    if (await clickIf('#correct-continue-btn:visible, #wrong-continue-btn:visible, #mc-continue-btn:visible, #cloze-continue-btn:visible')) continue;
    if (await clickIf('#step-next-btn:visible:enabled')) continue;
    if (await clickIf('#unit-detail-wrap .exercise-option:visible:enabled')) continue;
    if (await clickIf('#exercise-dontknow-btn:visible:enabled')) continue;
    const input = page.locator('#unit-detail-wrap input[type="text"]:visible:enabled');
    if (await input.count()) { await input.first().fill('bonjour'); await input.first().press('Enter'); await page.waitForTimeout(200); continue; }
    await clickIf('#unit-detail-wrap button.btn-primary:visible:enabled');
  }
  check(`lição 1 do A1-1 concluída com cliques reais (${steps} passos)`, lessonDone);
  await shot(page, 'nav-3-licao.png');
  const r3 = await page.evaluate(async () => {
    const u = UNITS.find(x => x.id === 'A1-1');
    const l0 = u.lessons[0].vocabIdx.map(i => STATE.cards.find(c => c.id === studyWordCardId(u, i)));
    const elig = l0.every(c => isCardLessonCompleted(c));
    await saveState();
    const b = window.__db.progress.frances;
    return { elig, released: b.cards.filter(c => c.released).map(c => c.id), archive: Object.keys(b.retiredStudyCards || {}), v: b._curriculumVersion, lessonId: b.unitProgress['A1-1'].lessonId };
  });
  check('palavras da lição 1 entram na Revisão e ganham released no save', r3.elig && ['uA1-1-v0', 'uA1-1-v1', 'uA1-1-v2'].every(id => r3.released.includes(id)), r3);
  check('save leva arquivo, versão do currículo e lessonId', JSON.stringify(r3.archive) === '["uA1-1-v99"]' && r3.v === 1 && r3.lessonId === 'informal-agradecer', r3);

  // recarrega a página: tudo volta
  await page.reload();
  await page.waitForFunction(() => typeof STATE !== 'undefined' && typeof loadState === 'function', null, { timeout: 20000 });
  const r4 = await page.evaluate(async () => { CURRENT_USER = { id: 'u-nav' }; progressLoadedOk = false; await loadStateAndRender();
    return { released: STATE.cards.filter(c => c.released).length, archive: Object.keys(STATE.retiredStudyCards), lessonIdx: STATE.unitProgress['A1-1'].lessonIdx }; });
  check('depois de recarregar: released, arquivo e lição voltam', r4.released >= 6 && JSON.stringify(r4.archive) === '["uA1-1-v99"]' && r4.lessonIdx === 1, r4);
  check('sem erro de página', errs.length === 0, errs);
  check('sem erro de console inesperado', cons.length === 0, cons.slice(0, 5));
  await browser.close(); server.close();
  console.log(`navegador fr: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
