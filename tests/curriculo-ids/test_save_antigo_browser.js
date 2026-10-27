// C1 da paridade: save antigo nos dois sites (ver o comentário abaixo).
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
// Cliente falso do Supabase com a tabela `progress` em memória (select/eq/maybeSingle/upsert); o resto devolve vazio.
const STUB = `(function(){
  const db = window.__db = { progress: window.__seedProgress ? JSON.parse(JSON.stringify(window.__seedProgress)) : null, weekly: [] };
  const empty = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => empty; } });
  function from(table){
    if (table === 'progress'){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.progress ? { data: JSON.parse(JSON.stringify(db.progress)) } : null, error: null }; },
        async upsert(p){ db.progress = JSON.parse(JSON.stringify(p.data)); return { error: null }; } };
      return q;
    }
    return empty;
  }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const FSRS = ['reps', 'interval', 'stability', 'difficulty', 'state', 'lastReview', 'due', 'lapses', 'fsrsReps', 'fsrsLapses', 'firstLearnedDate'];

// C1 da paridade (2026-10-23): save ANTIGO (de antes da chave estável: sem _curriculumVersion, sem retiredStudyCards, sem
// lessonId, sem `released`) carrega pelo caminho real (loadState -> applySerializedState) numa página NOVA, nos dois sites:
// nada some, FSRS intacto, órfão vai para o arquivo; salvar e recarregar (outra página nova) dá exatamente o mesmo estado.
// Rodar: node tests/curriculo-ids/test_save_antigo_browser.js
async function openPage(browser, port, lang, seed){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript((s) => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} if (s) window.__seedProgress = s; }, seed || null);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof saveState === 'function', null, { timeout: 20000 });
  return { ctx, page, errs };
}
const login = async (page) => page.evaluate(async () => { CURRENT_USER = { id: 'u-save-antigo' }; progressLoadedOk = false; await loadState(); return progressLoadedOk; });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']) {
    // 1) monta um save de verdade (saveState) com progresso e o deixa no formato ANTIGO
    const p1 = await openPage(browser, port, lang);
    const old = await p1.page.evaluate(async (lang) => {
      CURRENT_USER = { id: 'u-save-antigo' }; progressLoadedOk = true;
      const u0 = UNITS.find(u => (u.vocab || []).length && u.type !== 'grammar'), u1 = UNITS.filter(u => (u.vocab || []).length && u.type !== 'grammar')[1];
      const study = STATE.cards.filter(c => c.origin === 'study');
      let i = 0;
      study.filter(c => c.unitId === u0.id || c.unitId === u1.id).forEach(c => { i++; Object.assign(c, { reps: 1 + i % 5, interval: 2 + i, stability: 1.5 + i * 0.37, difficulty: 3 + (i % 7) * 0.5, state: i % 4 ? 'review' : 'relearning', lastReview: 1790000000000 + i * 7777, due: 1790500000000 + i * 7777, lapses: i % 3, fsrsReps: 1 + i % 5, fsrsLapses: i % 3, fsrsMigrated: true, firstLearnedDate: '2026-09-' + String(10 + i % 18) }); });
      STATE.unitProgress[u0.id] = Object.assign({}, STATE.unitProgress[u0.id], { started: true, completed: true, unlocked: true, lessonIdx: 0 });
      STATE.unitProgress[u1.id] = Object.assign({}, STATE.unitProgress[u1.id], { started: true, completed: false, unlocked: true, lessonIdx: 1 });
      STATE.xp = 777;
      await saveState();
      const data = JSON.parse(JSON.stringify(window.__db.progress));
      const keys = Object.keys(data).filter(k => data[k] && Array.isArray(data[k].cards));
      keys.forEach(k => {
        const b = data[k];
        delete b._curriculumVersion; delete b.retiredStudyCards;
        Object.values(b.unitProgress || {}).forEach(p => { delete p.lessonId; });
        b.cards.forEach(c => { delete c.released; });
        b.cards.push({ id: lang === 'fr' ? 'u' + u0.id + '-v99' : 'u' + u0.id + '-v99', reps: 4, stability: 12.5, state: 'review', lastReview: 1790000000000, due: 1791000000000 });
      });
      return { data, keys, studied: study.filter(c => c.reps > 0).length, nStudy: study.length };
    }, lang);
    check(`${lang}: save antigo montado (${old.studied} cartões com progresso de ${old.nStudy}; bloco ${old.keys.join(',')})`, old.keys.length >= 1 && old.studied > 10);
    check(`${lang}: sem erro de página (montagem)`, p1.errs.length === 0, p1.errs);
    await p1.ctx.close();
    const oldBlock = old.data[old.keys[0]];

    // 2) página NOVA carrega o save antigo
    const p2 = await openPage(browser, port, lang, old.data);
    check(`${lang}: carregou (progressLoadedOk)`, await login(p2.page) === true);
    const r2 = await p2.page.evaluate(async () => {
      const s = JSON.parse(JSON.stringify(serializeState()));
      await saveState();
      return { s, data: JSON.parse(JSON.stringify(window.__db.progress)), retired: JSON.parse(JSON.stringify(STATE.retiredStudyCards)) };
    });
    const oldById = new Map(oldBlock.cards.map(c => [c.id, c]));
    const newById = new Map(r2.s.cards.map(c => [c.id, c]));
    const orphanId = oldBlock.cards[oldBlock.cards.length - 1].id;
    const lost = oldBlock.cards.filter(c => c.id !== orphanId && !newById.has(c.id)).map(c => c.id);
    check(`${lang}: nenhum cartão do save sumiu (${oldBlock.cards.length - 1} cartões)`, lost.length === 0, lost.slice(0, 5));
    const badFsrs = [...oldById.values()].filter(c => c.id !== orphanId && newById.has(c.id) && FSRS.some(f => JSON.stringify(c[f]) !== JSON.stringify(newById.get(c.id)[f]))).map(c => c.id);
    check(`${lang}: FSRS intacto em todos os cartões`, badFsrs.length === 0, badFsrs.slice(0, 5));
    check(`${lang}: órfão (${orphanId}) foi para o arquivo com o progresso`, r2.retired[orphanId] && r2.retired[orphanId].stability === 12.5, Object.keys(r2.retired));
    check(`${lang}: XP e unidades voltam`, r2.s.xp === 777 && JSON.stringify(Object.keys(r2.s.unitProgress).sort()) === JSON.stringify(Object.keys(oldBlock.unitProgress).sort()));
    check(`${lang}: save novo grava _curriculumVersion = 1`, r2.s._curriculumVersion === 1, r2.s._curriculumVersion);
    const startedId = Object.keys(oldBlock.unitProgress).find(k => oldBlock.unitProgress[k].started && !oldBlock.unitProgress[k].completed);
    check(`${lang}: save novo grava o lessonId da unidade começada (lessonIdx igual)`, typeof r2.s.unitProgress[startedId].lessonId === 'string' && r2.s.unitProgress[startedId].lessonIdx === 1, r2.s.unitProgress[startedId]);
    const otherDiff = Object.keys(oldBlock).filter(k => !['cards', 'hanziCards', 'unitProgress', 'progressSummary', 'periodXp'].includes(k) && JSON.stringify(oldBlock[k]) !== JSON.stringify(r2.s[k]));
    if (oldBlock.hanziCards){
      // hanzi (zh): só a marca fsrsMigrated pode entrar no carregamento (migrateCardToFSRS, comportamento de antes)
      const strip = arr => JSON.stringify((arr || []).map(c => { const o = Object.assign({}, c); delete o.fsrsMigrated; return o; }));
      check(`${lang}: hanzi voltam iguais (${oldBlock.hanziCards.length})`, strip(oldBlock.hanziCards) === strip(r2.s.hanziCards));
    }
    check(`${lang}: demais campos do bloco iguais ao save antigo`, otherDiff.length === 0, otherDiff);
    check(`${lang}: sem erro de página (carregar)`, p2.errs.length === 0, p2.errs);
    await p2.ctx.close();

    // 3) outra página NOVA carrega o que a 2 salvou: mesmo estado (ponto fixo)
    const p3 = await openPage(browser, port, lang, r2.data);
    check(`${lang}: recarregou`, await login(p3.page) === true);
    const s3 = await p3.page.evaluate(() => JSON.parse(JSON.stringify(serializeState())));
    const diff = Object.keys(r2.s).filter(k => k !== 'periodXp' && JSON.stringify(r2.s[k]) !== JSON.stringify(s3[k]));
    check(`${lang}: salvar e recarregar dá o mesmo bloco`, diff.length === 0, diff);
    check(`${lang}: sem erro de página (recarregar)`, p3.errs.length === 0, p3.errs);
    await p3.ctx.close();
  }
  await browser.close(); server.close();
  console.log(`save antigo no navegador: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
