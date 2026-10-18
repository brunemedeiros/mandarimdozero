// Etapa 0b do currículo, navegador real: (1) duas unidades novas inseridas no fr depois da A1-3 (atrás de um aluno que
// está na A1-5) aparecem ABERTAS e NÃO concluídas na trilha; (2) Course Deck de unidade que não existe mais fica fora da
// tabela de Decks da Revisão; (3) zh carrega igual (a regra não roda lá). Conteúdo novo só nesta página de teste (o
// content.js servido ganha as duas unidades no fim do arquivo); nada é gravado em disco.
// Rodar: node tests/curriculo-ids/test_playwright_0b.js [pasta-para-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv[2] || null;
const shot = async (page, n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n), fullPage: false }); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const INSERT = `
;(function(){ // teste 0b: duas unidades novas depois da A1-3
  const mk = (id, title, f, t) => ({ id, level: 'A1', title, goal: 'Unidade inserida no teste.', vocab: [{ k: id + '-v0', f, t }], phrases: [], concepts: [],
    lessons: [{ id: 'nova', vocabIdx: [0], title: 'Lição nova' }, { id: 'checkpoint', vocabIdx: [], isCheckpoint: true, title: 'Ponto de verificação' }] });
  const at = UNITS.findIndex(u => u.id === 'A1-3');
  UNITS.splice(at + 1, 0, mk('A1-3n', 'Unidade nova um (teste)', 'le chat', 'o gato'), mk('A1-3o', 'Unidade nova dois (teste)', 'le chien', 'o cachorro'));
  const m = MODULES.find(x => x.unitIds.includes('A1-3'));
  m.unitIds.splice(m.unitIds.indexOf('A1-3') + 1, 0, 'A1-3n', 'A1-3o');
})();
`;
function server(withInsert){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    if (withInsert && p === '/fr/content.js') return res.end(fs.readFileSync(f, 'utf8') + INSERT);
    fs.createReadStream(f).pipe(res);
  });
}
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
const check = (n, c, x) => { if (c) { pass++; console.log('ok  ', n); } else { fail++; console.log('FALHOU', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const done = { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {}, completedVia: 'lessons' };

async function openApp(browser, port, lang, save, theme){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage(); const errs = [], cons = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) cons.push(m.text()); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript((s) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); if (!sessionStorage.getItem('__progress')) sessionStorage.setItem('__progress', JSON.stringify(s)); } catch (e) {} }, save);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof loadState === 'function', null, { timeout: 20000 });
  await page.evaluate(async () => { CURRENT_USER = { id: 'u-nav' }; progressLoadedOk = false; await loadStateAndRender(); });
  await page.waitForTimeout(300);
  return { ctx, page, errs, cons };
}

(async () => {
  const srvFr = server(true), srvZh = server(false);
  await new Promise(r => srvFr.listen(0, '127.0.0.1', r)); await new Promise(r => srvZh.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---------- fr ----------
  const upFr = { 'A1-1': done, 'A1-2': done, 'A1-3': done, 'A1-g1': done, 'A1-4': done, 'A1-g2': done,
    'A1-5': { started: true, completed: false, unlocked: true, lessonIdx: 1, lessonMisses: {} } };
  const saveFr = { frances: { xp: 300, cards: [{ id: 'uA1-1-v0', reps: 3, stability: 12, state: 'review', lastReview: 1790000000000, due: 1791000000000, fsrsMigrated: true }], unitProgress: upFr } };
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errs, cons } = await openApp(browser, srvFr.address().port, 'fr', saveFr, theme);
    const r = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('#path-list-wrap .unit-block')];
      const cls = (title) => { const b = blocks.find(x => x.innerText.includes(title)); return b ? b.className : null; };
      return { n1: cls('Unidade nova um (teste)'), n2: cls('Unidade nova dois (teste)'), a6: cls(UNITS.find(u => u.id === 'A1-6').title),
        p1: STATE.unitProgress['A1-3n'], p2: STATE.unitProgress['A1-3o'], a5: STATE.unitProgress['A1-5'] };
    });
    check(`fr ${theme}: as duas unidades novas aparecem na trilha`, !!r.n1 && !!r.n2, r);
    check(`fr ${theme}: abertas (sem "locked") e não concluídas (sem "done")`, !/locked|done/.test(r.n1) && !/locked|done/.test(r.n2), [r.n1, r.n2]);
    check(`fr ${theme}: progresso das novas: aberta, não começada, não concluída`, r.p1.unlocked && r.p2.unlocked && !r.p1.completed && !r.p2.completed && !r.p1.started && !r.p2.started, [r.p1, r.p2]);
    check(`fr ${theme}: o aluno continua onde estava (A1-5 lição 1) e a A1-6 continua trancada`, r.a5.lessonIdx === 1 && !r.a5.completed && /locked/.test(r.a6 || ''), [r.a5, r.a6]);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#path-list-wrap .unit-block')].find(x => x.innerText.includes('Unidade nova um (teste)')); if (b) b.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(1200);
    await shot(page, `0b-fr-${theme}-trilha.png`);
    if (theme === 'light') {
      // salva e recarrega: continua igual (idempotente) e a marca de aberta foi para o save
      await page.evaluate(async () => { await saveState(); });
      const saved = await page.evaluate(() => window.__db.progress.frances.unitProgress);
      check('fr: o save leva as novas como abertas (não concluídas)', saved['A1-3n'].unlocked && saved['A1-3o'].unlocked && !saved['A1-3n'].completed && !saved['A1-3o'].completed);
      await page.reload();
      await page.waitForFunction(() => typeof STATE !== 'undefined' && typeof loadState === 'function', null, { timeout: 20000 });
      const again = await page.evaluate(async () => { CURRENT_USER = { id: 'u-nav' }; progressLoadedOk = false; await loadStateAndRender(); return STATE.unitProgress; });
      check('fr: depois de recarregar, igual', JSON.stringify(['A1-3n', 'A1-3o', 'A1-5', 'A1-6'].map(k => again[k])) === JSON.stringify(['A1-3n', 'A1-3o', 'A1-5', 'A1-6'].map(k => saved[k])));
      // Course Deck de unidade que não existe mais
      const d = await page.evaluate(async () => {
        try { localStorage.setItem(deckBrowserCollapsedKey(), '[]'); } catch (e) {}
        const decks = [{ id: 1, kind: 'course', name: 'Francês', language_app_key: 'frances', course_unit_id: null, parent_deck_id: null, owner_id: null }];
        courseUnitsForDecks(UNITS).forEach((u, i) => decks.push({ id: 10 + i, kind: 'course', name: u.title, language_app_key: 'frances', course_unit_id: u.unit_id, parent_deck_id: 1, owner_id: null }));
        decks.push({ id: 999, kind: 'course', name: 'Unidade que saiu', language_app_key: 'frances', course_unit_id: 'A1-99', parent_deck_id: 1, owner_id: null });
        STATE.decks = decks; STATE.courseDecksLoaded = true;
        STATE.unitProgress['A1-99'] = { started: true, completed: true, unlocked: true, lessonIdx: 0 };
        const html = deckBrowserTableHTML();
        const box = document.getElementById('review-decks-table'); if (box) box.innerHTML = html;
        return { gone: html.includes('data-deck-row="999"'), a1: html.includes('data-deck-row="10"'), rows: (html.match(/data-deck-row=/g) || []).length };
      });
      check('fr: deck da unidade que saiu fora da tabela de Decks; o da A1-1 continua', !d.gone && d.a1, d);
    }
    check(`fr ${theme}: sem erro de página`, errs.length === 0, errs);
    check(`fr ${theme}: sem erro de console inesperado`, cons.length === 0, cons.slice(0, 5));
    await ctx.close();
  }

  // ---------- zh ----------
  const upZh = { 1: done, 2: done, 3: { started: true, completed: false, unlocked: true, lessonIdx: 1, lessonMisses: {} } };
  const saveZh = { mandarim: { xp: 100, cards: [{ id: 'u1-v0', reps: 2, stability: 6, state: 'review', lastReview: 1790000000000, due: 1791000000000 }], unitProgress: upZh } };
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errs, cons } = await openApp(browser, srvZh.address().port, 'zh', saveZh, theme);
    const r = await page.evaluate(() => ({ up: STATE.unitProgress, blocks: document.querySelectorAll('#path-list-wrap .unit-block').length, locked: document.querySelectorAll('#path-list-wrap .unit-block.locked').length,
      c: STATE.cards.find(c => c.id === 'u1-v0').reps }));
    check(`zh ${theme}: trilha com unidades e progresso de volta`, r.blocks > 0 && r.c === 2, r);
    check(`zh ${theme}: unidades depois da atual continuam trancadas (sem regra nova)`, r.up['4'].unlocked === false && r.locked >= 15, [r.up['4'], r.locked]);
    await shot(page, `0b-zh-${theme}-trilha.png`);
    check(`zh ${theme}: sem erro de página`, errs.length === 0, errs);
    check(`zh ${theme}: sem erro de console inesperado`, cons.length === 0, cons.slice(0, 5));
    await ctx.close();
  }
  await browser.close(); srvFr.close(); srvZh.close();
  console.log(`navegador 0b: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
