// Auditoria de 2026-11-14 (docs/historico/35-volta-para-a-aba.md): simula a volta para a aba (o supabase-js dispara SIGNED_IN a cada
// visibilitychange para 'visible' com a sessão válida) e mostra o efeito na trilha, no meio de uma lição e na Revisão.
// Hoje (antes do conserto) a lição RECOMEÇA do 1º passo. Rodar: SITE=fr|zh node tests/volta-aba/auditoria_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..'), SITE = process.env.SITE || 'fr';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
const STUB = `(function(){
  window.__srv = { progress: null, reads: 0, writes: 0, rpcs: 0, froms: {} }; window.__authCb = null;
  const mk = (table) => { let single = false, op = 'select', payload = null; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => { const S = window.__srv; S.froms[table] = (S.froms[table] || 0) + 1;
        if (table === 'progress' && (op === 'upsert' || op === 'update')){ S.writes++; S.progress = JSON.parse(JSON.stringify(payload.data || payload)); return Promise.resolve({ data: null, error: null }).then(ok, ko); }
        let data = single ? null : [];
        if (table === 'progress' && single){ S.reads++; data = { data: S.progress ? JSON.parse(JSON.stringify(S.progress)) : {} }; }
        return Promise.resolve({ data, error: null }).then(ok, ko); };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      if (p === 'upsert' || p === 'update') return (v) => { op = p; payload = v; return b; };
      return () => b; } }); return b; };
  const user = { id: 'u-volta', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana' }, created_at: new Date().toISOString() };
  window.__session = { user, access_token: 'x' };
  const client = { auth: { getSession: async () => ({ data: { session: window.__session } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: (cb) => { window.__authCb = cb; return { data: { subscription: { unsubscribe(){} } } }; }, signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => { window.__srv.rpcs++; return { data: null, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await page.addInitScript(() => { localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('ui-language-gate', 'pt-BR'); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`http://127.0.0.1:${server.address().port}/${SITE}/index.html`);
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && progressLoadedOk, null, { timeout: 25000 });
  await page.waitForTimeout(1200);
  // fecha janelas de boas-vindas/escolha de @ que aparecem no 1º acesso
  await page.keyboard.press('Escape').catch(() => {});
  const voltar = async () => { await page.evaluate(async () => { await window.__authCb('SIGNED_IN', window.__session); }); await page.waitForTimeout(1200); };
  const foto = () => page.evaluate(() => ({ hash: location.hash, emLicao: document.getElementById('app').classList.contains('lesson-focus'),
    acq: STEP_STATE.acq ? { unit: STEP_STATE.acq.unitId, phase: STEP_STATE.acq.phase, introIdx: STEP_STATE.acq.introIdx, blockIdx: STEP_STATE.acq.blockIdx } : null,
    tela: (document.getElementById('step-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 70), xp: STATE.xp, srv: JSON.parse(JSON.stringify(window.__srv, (k, v) => k === 'progress' ? undefined : v)) }));
  console.log('TRILHA antes:', JSON.stringify(await foto()));
  await voltar(); console.log('TRILHA depois de voltar à aba:', JSON.stringify(await foto()));
  // abre a 1ª unidade como o clique na trilha faz e avança alguns passos com o botão principal
  await page.evaluate(() => { const u = UNITS[0]; if (typeof navigateTo === 'function') navigateTo({ type: 'unit', unitId: u.id }); else openUnitDetail(u.id); });
  await page.waitForTimeout(800);
  for (let i = 0; i < 4; i++){ const b = page.locator('#step-next-btn:visible'); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(400); } }
  const antes = await foto(); console.log('LIÇÃO antes:', JSON.stringify(antes));
  await voltar(); const depois = await foto(); console.log('LIÇÃO depois de voltar à aba:', JSON.stringify(depois));
  // Revisão: sai da lição, abre a sessão de cartões e responde 1
  await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('review'); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (typeof navigateTo === 'function') navigateTo({ type: 'reviewSession', mode: 'flashcard' }); else openReviewSession('flashcard'); });
  await page.waitForTimeout(800);
  const rv = () => page.evaluate(() => ({ hash: location.hash, idx: (typeof REVIEW_STATE !== 'undefined' && REVIEW_STATE) ? (REVIEW_STATE.idx ?? REVIEW_STATE.index ?? null) : null,
    fila: (typeof REVIEW_STATE !== 'undefined' && REVIEW_STATE && REVIEW_STATE.queue) ? REVIEW_STATE.queue.length : null,
    tela: (document.querySelector('#view-review .active, #review-session, #flashcard-review-content, .review-card') || {}).innerText?.replace(/\s+/g, ' ').slice(0, 60) || null }));
  const showBtn = page.locator('button:visible', { hasText: /Mostrar|resposta/i }).first(); if (await showBtn.count()) { await showBtn.click().catch(() => {}); await page.waitForTimeout(400); }
  const good = page.locator('button:visible', { hasText: /^\s*Bom/ }).first(); if (await good.count()) { await good.click().catch(() => {}); await page.waitForTimeout(700); }
  const r1 = await rv(); console.log('REVISÃO antes:', JSON.stringify(r1));
  await voltar(); const r2 = await rv(); console.log('REVISÃO depois de voltar à aba:', JSON.stringify(r2));
  console.log('erros:', JSON.stringify(errs));
  await browser.close(); server.close();
})().catch(e => { console.error('FALHOU', e.message); process.exit(1); });
