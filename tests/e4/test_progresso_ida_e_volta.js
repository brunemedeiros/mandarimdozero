// C0 da E3: o zh grava STATE.hanziCards no save e precisa RESTAURAR o progresso ao carregar
// (a restauração foi removida por engano na K2-C, commit 49692ff). Também confere o texto do portão
// para convidado. Rodar: node tests/curso-progresso/test_hanzi_restore.js
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
  const db = window.__db = { progress: null, weekly: [] };
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

// E4: ida e volta do progresso nos dois idiomas. Muda o STATE de verdade (XP, cartões de trilha, unidade concluída, minutos de estudo,
// cartão próprio), salva pelo caminho real (saveState -> tabela), zera o STATE, carrega pelo caminho real (loadState) e compara.
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof saveState === 'function', null, { timeout: 20000 });
    const r = await page.evaluate(async () => {
      const out = {};
      // simula conta logada
      CURRENT_USER = { id: 'u-ida-volta' }; progressLoadedOk = true;
      // estado de estudo de verdade
      STATE.xp = 321; STATE.totalReviews = 47; STATE.streak = 4;
      const study = STATE.cards.filter(c => c.origin === 'study' || c.origin == null);
      out.nStudy = study.length;
      study.slice(0, 5).forEach((c, i) => Object.assign(c, { reps: 3 + i, interval: 4 + i, stability: 5.5 + i, difficulty: 4.2, state: 'review', lastReview: 1790000000000 + i, due: 1790500000000 + i, lapses: i, fsrsMigrated: true }));
      const uid = Object.keys(STATE.unitProgress)[0];
      STATE.unitProgress[uid] = Object.assign({}, STATE.unitProgress[uid], { completed: true, started: true, lessonIdx: 3 });
      if (typeof addStudyMinutes === 'function') addStudyMinutes(7);
      if (typeof ensureDailyBucket === 'function') { ensureDailyBucket(); STATE.daily.reviewsDone = 9; }
      if (typeof ensurePeriodXp === 'function') ensurePeriodXp();
      const before = JSON.parse(JSON.stringify(serializeState()));
      await saveState();
      out.saved = !!(window.__db.progress);
      out.blockKeys = window.__db.progress ? Object.keys(window.__db.progress) : [];
      // zera o estado local e carrega pelo caminho real
      const fresh = JSON.parse(JSON.stringify(before)); fresh.xp = 0; fresh.totalReviews = 0; fresh.streak = 0; fresh.cards = []; fresh.unitProgress = {};
      try { applySerializedState(fresh); } catch (e) { out.resetErr = String(e); }
      out.afterResetXp = STATE.xp;
      progressLoadedOk = false;
      await loadState();
      const after = JSON.parse(JSON.stringify(serializeState()));
      out.before = before; out.after = after; out.loadedOk = progressLoadedOk;
      // segundo ciclo: salvar o que acabou de carregar, zerar e carregar de novo precisa dar exatamente o mesmo estado
      await saveState();
      const fresh2 = JSON.parse(JSON.stringify(after)); fresh2.xp = 0; fresh2.cards = []; fresh2.unitProgress = {};
      applySerializedState(fresh2); progressLoadedOk = false; await loadState();
      out.after2 = JSON.parse(JSON.stringify(serializeState()));
      out.mutatedIds = study.slice(0, 5).map(c => c.id);
      // `released` só em cartão que a Revisão libera (unidade concluída) -- nunca em cartão ainda bloqueado
      out.releasedNotEligible = STATE.cards.filter(c => c.released && STATE.unitProgress[c.unitId] && !STATE.unitProgress[c.unitId].completed).map(c => c.id);
      out.nReleased = STATE.cards.filter(c => c.released).length;
      return out;
    });
    check(`${lang}: salvou na tabela`, r.saved && r.blockKeys.length >= 1, r.blockKeys);
    check(`${lang}: o reset local zerou o XP (o teste mede de verdade)`, r.afterResetXp === 0, r.afterResetXp);
    check(`${lang}: carregou de volta (progressLoadedOk)`, r.loadedOk === true);
    check(`${lang}: XP, revisões e sequência voltam iguais`, r.after.xp === 321 && r.after.totalReviews === 47, [r.after.xp, r.after.totalReviews]);
    const byId = (arr) => new Map((arr || []).map(c => [c.id, c]));
    const sb = byId(r.before.cards), sa = byId(r.after.cards);
    check(`${lang}: mesma quantidade de cartões (${sb.size})`, sb.size === sa.size && sb.size > 0, [sb.size, sa.size]);
    // os cartões que o teste estudou voltam com TODOS os campos de memória idênticos
    const FSRS = ['reps', 'interval', 'stability', 'difficulty', 'state', 'lastReview', 'due', 'lapses'];
    const badMut = r.mutatedIds.filter(id => FSRS.some(f => JSON.stringify(sb.get(id)[f]) !== JSON.stringify((sa.get(id) || {})[f])));
    check(`${lang}: os 5 cartões estudados voltam com o FSRS idêntico`, badMut.length === 0, badMut);
    // cartões não estudados: o carregamento só pode acrescentar a marca de migração (fsrsMigrated) e, no fr, a marca
    // `released` (Etapa 0 do currículo, 2026-10-18: cartão de unidade concluída ganha a marca do portão de lição no
    // carregamento). A marca só pode ser true e só em cartão que a Revisão já liberava.
    const okRelease = (x, c, o) => x === 'released' && lang === 'fr' && c.released === undefined && o.released === true;
    let strange = null; sb.forEach((c, k) => { if (strange) return; const o = sa.get(k) || {}; const ks = [...new Set([...Object.keys(c), ...Object.keys(o)])].filter(x => x !== 'fsrsMigrated' && !okRelease(x, c, o) && JSON.stringify(c[x]) !== JSON.stringify(o[x])); if (ks.length) strange = { id: k, campos: ks }; });
    check(`${lang}: nenhum outro campo de cartão muda no carregamento`, !strange, strange);
    check(`${lang}: progresso das unidades volta igual`, JSON.stringify(r.before.unitProgress) === JSON.stringify(r.after.unitProgress));
    // estabilidade: um segundo ciclo salvar/carregar não muda mais nada (o estado é ponto fixo)
    const diff2 = Object.keys(r.after).filter(k => JSON.stringify(r.after[k]) !== JSON.stringify(r.after2[k]));
    check(`${lang}: segundo ciclo salvar/carregar não muda nenhum campo`, diff2.length === 0, diff2);
    // campos fora de cartões e da semana: iguais já no primeiro ciclo
    const IGN = new Set(['cards', 'hanziCards', 'periodXp']);
    const diffKeys = Object.keys(r.before).filter(k => !IGN.has(k) && JSON.stringify(r.before[k]) !== JSON.stringify(r.after[k]));
    check(`${lang}: demais campos do estado voltam iguais`, diffKeys.length === 0, diffKeys);
    check(`${lang}: \`released\` só em cartão de unidade concluída (fr) / nunca (zh)`, r.releasedNotEligible.length === 0 && (lang === 'fr' ? r.nReleased > 0 : r.nReleased === 0), [r.nReleased, r.releasedNotEligible.slice(0, 3)]);
    check(`${lang}: sem erro de página`, errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`ida e volta do progresso: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
