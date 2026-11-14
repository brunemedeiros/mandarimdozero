// Volta para a aba (decisão da autora, opção A, 2026-11-14; docs/historico/35-volta-para-a-aba.md).
// O supabase-js avisa SIGNED_IN toda vez que a aba volta a ficar visível com a sessão válida. Antes, o site tratava isso
// como login novo e reaplicava a rota: no meio de uma lição a lição voltava ao 1º passo. Agora, mesma conta = nada muda.
// Playwright/Chromium real, fr e zh, arquivos de PRODUÇÃO; só o Supabase é trocado por um stub que GUARDA o que é salvo
// (como um servidor) e entrega o callback do onAuthStateChange, chamado aqui do mesmo jeito que o supabase-js chama.
// Prova, em cada site:
//   1. trilha: voltar à aba não relê o progresso nem reaplica a rota; tela igual;
//   2. lição no 3º passo: voltar à aba (2 vezes) mantém o mesmo passo e a mesma tela;
//   3. sessão de Revisão aberta: voltar à aba não abre a sessão de novo;
//   4. progresso não confirmado (leitura falhou, ex.: sem internet): voltar à aba relê o progresso, sem reaplicar a rota;
//   5. troca de conta na mesma aba (SIGNED_IN de outro id): continua recarregando tudo;
//   6. outro aparelho estudou no meio-tempo (servidor com mais XP): o salvamento recusa gravar por cima e relê sozinho;
//   7. 0 erro de página.
// SHOTS=<pasta> salva a lição antes e depois de voltar à aba. REPO_ROOT=<árvore> roda contra outra versão.
// Rodar: node tests/volta-aba/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `(function(){
  window.__srv = { progress: null, reads: 0, writes: 0, failReads: false };
  window.__authCb = null;
  const mk = (table) => { let single = false, op = 'select', payload = null; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => { const S = window.__srv;
        if (table === 'progress' && (op === 'upsert' || op === 'update')){ S.writes++; S.progress = JSON.parse(JSON.stringify(payload.data || payload)); return Promise.resolve({ data: null, error: null }).then(ok, ko); }
        if (table === 'progress' && single){ S.reads++;
          if (S.failReads) return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } }).then(ok, ko);
          return Promise.resolve({ data: { data: S.progress ? JSON.parse(JSON.stringify(S.progress)) : {} }, error: null }).then(ok, ko); }
        return Promise.resolve({ data: single ? null : [], error: null }).then(ok, ko); };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      if (p === 'upsert' || p === 'update') return (v) => { op = p; payload = v; return b; };
      return () => b; } }); return b; };
  const user = { id: 'u-volta', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana' }, created_at: new Date().toISOString() };
  window.__session = { user, access_token: 'x' };
  const client = { auth: { getSession: async () => ({ data: { session: window.__session } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: (cb) => { window.__authCb = cb; return { data: { subscription: { unsubscribe(){} } } }; }, signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let pass = 0, fail = 0;
const check = (label, cond, extra) => { if (cond) pass++; else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } };

async function abrir(browser, base, site){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { try { localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('ui-language-gate', 'pt-BR'); } catch (e) {} });
  // A última rota registrada vence: primeiro o bloqueio geral, depois o stub do Supabase.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`${base}/${site}/index.html`);
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && progressLoadedOk, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape').catch(() => {});
  // Espiões: quantas vezes a rota é reaplicada / a unidade ou a Revisão são abertas de novo.
  await page.evaluate(() => {
    window.__spy = { route: 0, unit: 0, review: 0 };
    const wrap = (name, key) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function(){ window.__spy[key]++; return f.apply(this, arguments); }; };
    wrap('applyInitialRoute', 'route'); wrap('openUnitDetail', 'unit'); wrap('openReviewSession', 'review');
  });
  return { page, errs };
}

// O que o supabase-js faz ao voltar para a aba: chama o callback com SIGNED_IN e a sessão da mesma conta.
const voltarParaAba = async (page, user) => { await page.evaluate(async (u) => { await window.__authCb('SIGNED_IN', u ? { user: u, access_token: 'y' } : window.__session); }, user || null); await page.waitForTimeout(1200); };
const foto = (page) => page.evaluate(() => ({
  hash: location.hash, emLicao: document.getElementById('app').classList.contains('lesson-focus'),
  passo: STEP_STATE.acq ? STEP_STATE.acq.introIdx : null, unidade: STEP_STATE.acq ? STEP_STATE.acq.unitId : null,
  tela: (document.getElementById('step-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 60),
  reads: window.__srv.reads, spy: Object.assign({}, window.__spy), user: CURRENT_USER && CURRENT_USER.id, ok: progressLoadedOk, xp: STATE.xp,
}));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const site of ['fr', 'zh']){
      const { page, errs } = await abrir(browser, base, site);

      // 1. trilha
      const t0 = await foto(page);
      await voltarParaAba(page);
      const t1 = await foto(page);
      check(`${site}: trilha, voltar à aba não relê o progresso`, t1.reads === t0.reads, { antes: t0.reads, depois: t1.reads });
      check(`${site}: trilha, voltar à aba não reaplica a rota`, t1.spy.route === 0, t1.spy);

      // 2. lição no 3º passo
      await page.evaluate(() => { const u = UNITS[0]; if (typeof navigateTo === 'function') navigateTo({ type: 'unit', unitId: u.id }); else openUnitDetail(u.id); });
      await page.waitForTimeout(800);
      for (let i = 0; i < 4; i++){ const b = page.locator('#step-next-btn:visible'); if (await b.count()){ await b.click().catch(() => {}); await page.waitForTimeout(400); } }
      await page.evaluate(() => { window.__spy = { route: 0, unit: 0, review: 0 }; });
      const l0 = await foto(page);
      check(`${site}: preparação, a lição está andando (passo > 0)`, l0.emLicao && l0.passo > 0, l0);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `licao-${site}-antes.png`) });
      await voltarParaAba(page);
      await voltarParaAba(page);
      const l1 = await foto(page);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `licao-${site}-depois.png`) });
      check(`${site}: lição, voltar à aba (2 vezes) mantém o mesmo passo e a mesma tela`, l1.emLicao && l1.passo === l0.passo && l1.unidade === l0.unidade && l1.tela === l0.tela, { antes: l0, depois: l1 });
      check(`${site}: lição, a unidade não é aberta de novo`, l1.spy.unit === 0 && l1.spy.route === 0, l1.spy);

      // 3. sessão de Revisão aberta
      await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('review'); if (typeof navigateTo === 'function') navigateTo({ type: 'reviewSession', mode: 'flashcard' }); else openReviewSession('flashcard'); });
      await page.waitForTimeout(800);
      await page.evaluate(() => { window.__spy = { route: 0, unit: 0, review: 0 }; });
      await voltarParaAba(page);
      const r1 = await foto(page);
      check(`${site}: Revisão, voltar à aba não abre a sessão de novo`, r1.spy.review === 0 && r1.spy.route === 0 && r1.hash === '#/review/flashcard', r1);

      // 4. progresso não confirmado: relê, sem reaplicar a rota
      await page.evaluate(() => { progressLoadedOk = false; window.__spy = { route: 0, unit: 0, review: 0 }; });
      const p0 = await foto(page);
      await voltarParaAba(page);
      await page.waitForFunction(() => progressLoadedOk === true, null, { timeout: 15000 }).catch(() => {});
      const p1 = await foto(page);
      check(`${site}: progresso não confirmado, voltar à aba relê e confirma`, p1.ok === true && p1.reads > p0.reads, { antes: p0.reads, depois: p1.reads, ok: p1.ok });
      check(`${site}: progresso não confirmado, a releitura não reaplica a rota`, p1.spy.route === 0 && p1.spy.review === 0, p1.spy);

      // 6. outro aparelho estudou no meio-tempo: o salvamento não grava por cima e relê
      const blockKey = await page.evaluate(() => Object.keys(window.__srv.progress || {}).find(k => !k.startsWith('_')));
      check(`${site}: preparação, o servidor tem o bloco do curso`, !!blockKey, blockKey);
      if (blockKey){
        const xpLocal = await page.evaluate(() => STATE.xp);
        await page.evaluate((k) => { window.__srv.progress[k].xp = (Number(window.__srv.progress[k].xp) || 0) + 500; }, blockKey);
        await page.evaluate(() => saveState());
        await page.waitForFunction((x) => STATE.xp >= x + 500, xpLocal, { timeout: 15000 }).catch(() => {});
        const s1 = await foto(page);
        check(`${site}: outro aparelho mais adiantado, salvar recusa gravar por cima e relê (XP do servidor)`, s1.xp >= xpLocal + 500, { xpLocal, depois: s1.xp });
      }

      // 5. troca de conta na mesma aba
      const c0 = await foto(page);
      await voltarParaAba(page, { id: 'u-outra-conta', email: 'bia@exemplo.com', user_metadata: { full_name: 'Bia' }, aud: 'authenticated' });
      await page.waitForFunction(() => CURRENT_USER && CURRENT_USER.id === 'u-outra-conta' && progressLoadedOk, null, { timeout: 15000 }).catch(() => {});
      const c1 = await foto(page);
      check(`${site}: troca de conta na mesma aba continua recarregando tudo`, c1.user === 'u-outra-conta' && c1.reads > c0.reads && c1.ok === true, { antes: c0.reads, depois: c1.reads, user: c1.user });

      check(`${site}: 0 erro de página`, errs.length === 0, errs);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log(`Volta para a aba: ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
