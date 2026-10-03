// Desafios do Módulo (Premium) -- Playwright (Chromium real), só fr (o zh não
// tem Desafios). Supabase do CDN trocado por um stub em memória; a tabela
// `challenges` devolve o lote real (fr/scripts/challenges_import/lote-a1-m1.json)
// + 3 desafios "antigos" sem moduleId. Free = convidado; Premium = PROFILE_CACHE.
// Rodar: node tests/desafios-modulo/test_playwright.js
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

const lote = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m1.json'), 'utf8'));
const expr80 = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-expressoes-80.json'), 'utf8'));
const toRow = (it, status = 'published') => { const { id, type, level, ...data } = it; return { id, type, level, status, data: { ...data, status } }; };
const legacy = [
  toRow({ ...expr80[0], id: 'expr-old-001', level: 'A1' }),
  toRow({ id: 'lt-old-001', type: 'listen_translate', level: 'A1', sentenceFr: 'Je mange une pomme.', audioFile: 'x.mp3', hintText: 'Je ______ une pomme.', referenceTranslations: ['Eu como uma maçã.'], explanation: '' }),
  toRow({ id: 'accent-old-001', type: 'accent', level: 'A1', targetText: 'école', audioFile: 'y.mp3', explanation: '' }),
];
const ROWS = [...legacy, ...lote.map(i => toRow(i))];

const STUB = `
(function(){
  const ROWS = ${JSON.stringify(ROWS)};
  function builder(table){
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function boot(browser, port, theme){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---------------- FREE ----------------
  {
    const { page, errors, ctx } = await boot(browser, port);
    const ev = (fn, a) => page.evaluate(fn, a);
    await ev(async () => { renderUnitsGrid(); await fillModuleChallengeRows(); });
    let r = await ev(() => ({
      rows: [...document.querySelectorAll('.module-challenges')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      inModule1: !!document.querySelector('.module-challenges-slot[data-module-id="A1-m1"] .module-challenges'),
      locked: !!document.querySelector('.module-challenges.premium-locked'),
      icon: (document.querySelector('.module-challenges .ub-icon') || {}).textContent,
      badge: (document.querySelector('.module-challenges .ub-badge-premium') || {}).textContent,
    }));
    check('Free: só o Módulo 1 tem a unidade de desafios', r.rows.length === 1 && r.inModule1, r);
    check('Free: título, cadeado e selo Premium', /Desafios do Módulo 1/.test(r.rows[0]) && r.locked && r.icon.trim() === '🔒' && r.badge === 'Premium', r);
    // posição: depois do Ponto de verificação
    r = await ev(() => { const list = document.querySelector('.module-challenges-slot[data-module-id="A1-m1"]').parentElement; const kids = [...list.children]; const cp = kids.findIndex(k => k.classList.contains('checkpoint')); const sl = kids.findIndex(k => k.classList.contains('module-challenges-slot')); return { cp, sl }; });
    check('unidade extra vem depois do Ponto de verificação', r.sl === r.cp + 1, r);
    await ev(() => document.querySelector('.module-challenges .ub-header').click());
    r = await ev(() => ({ modal: getComputedStyle(document.getElementById('premium-challenges-modal')).display, tab: STATE.currentTab || null, filter: challengesModuleFilter }));
    check('Free: clicar abre o aviso Premium (sem navegar)', r.modal === 'flex' && r.filter === null, r);
    await ev(() => document.getElementById('premium-challenges-modal-close').click());

    // aba Desafios, expressões
    await ev(async () => { switchTab('challenges'); await renderChallengeCategories(); renderChallengesList('expression'); });
    r = await ev(() => ({ total: document.querySelectorAll('.challenge-card').length, locked: document.querySelectorAll('.challenge-card.locked').length }));
    check('Free: expressões do módulo aparecem trancadas, a antiga não', r.total === 1 + 5 + 0 && r.locked === 5, r);
    await ev(() => document.querySelector('.challenge-card.locked').click());
    r = await ev(() => ({ modal: getComputedStyle(document.getElementById('premium-challenges-modal')).display, player: getComputedStyle(document.getElementById('challenge-player-wrap')).display }));
    check('Free: clicar no trancado abre o aviso e não abre o jogo', r.modal === 'flex' && r.player === 'none', r);
    await ev(() => document.getElementById('premium-challenges-modal-close').click());
    await ev(() => document.querySelector('.challenge-card:not(.locked)').click());
    r = await ev(() => getComputedStyle(document.getElementById('challenge-player-wrap')).display);
    check('Free: expressão sem módulo continua jogável', r === 'block', r);

    // fila Ouça e traduza
    await ev(async () => { renderChallengesList('listen_translate'); });
    r = await ev(() => document.getElementById('challenges-cards').textContent.replace(/\s+/g, ' '));
    check('Free: fila A1 só conta o desafio antigo e avisa dos trancados', /0\/1 concluído/.test(r) && /\+32 desafios de módulo no Premium/.test(r), r);
    r = await ev(() => { openChallengeQueueLevel('listen_translate', 'A1'); return CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id; });
    check('Free: a fila só entrega o desafio liberado', r === 'lt-old-001', r);
    // ditados: d1 é free -> segue aberto
    r = await ev(() => { dictationModuleFilter = null; renderDictationList(); return { locked: document.querySelectorAll('.dictation-card.locked').length, total: document.querySelectorAll('.dictation-card').length }; });
    check('Free: ditados existentes (free:true) seguem abertos', r.locked === 0 && r.total >= 2, r);
    check('Free: nenhum pageerror', errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }

  // ---------------- PREMIUM ----------------
  for (const theme of ['light', 'dark']){
    const { page, errors, ctx } = await boot(browser, port, theme);
    const ev = (fn, a) => page.evaluate(fn, a);
    await ev(() => { PROFILE_CACHE = { plan_tier: 'premium' }; });
    await ev(async () => { renderUnitsGrid(); await fillModuleChallengeRows(); });
    let r = await ev(() => ({ icon: (document.querySelector('.module-challenges .ub-icon') || {}).textContent, badge: (document.querySelector('.module-challenges .ub-badge') || {}).textContent, locked: !!document.querySelector('.module-challenges.premium-locked') }));
    check(`Premium(${theme}): sem cadeado, progresso 0/${lote.length}`, r.icon.trim() === '🧩' && r.badge === `0/${lote.length}` && !r.locked, r);
    if (theme === 'dark'){
      const colors = await ev(() => { const g = document.querySelector('.module-challenges'); const cs = getComputedStyle(g.querySelector('.ub-title')); return { fg: cs.color, bg: getComputedStyle(g).backgroundColor }; });
      check('dark: título legível (cor ≠ fundo)', colors.fg !== colors.bg, colors);
    }
    await ev(() => document.querySelector('.module-challenges .ub-header').click());
    await page.waitForFunction(() => challengesModuleFilter === 'A1-m1' && document.querySelectorAll('.challenge-category-card').length > 0);
    r = await ev(() => ({ title: document.getElementById('challenges-categories-title').textContent, back: getComputedStyle(document.getElementById('challenges-module-back')).display,
      cats: [...document.querySelectorAll('.challenge-category-card')].map(c => c.textContent.replace(/\s+/g, ' ').trim()) }));
    check(`Premium(${theme}): visão do módulo com 4 categorias recortadas`, r.title === 'Desafios do Módulo 1' && r.back !== 'none' && r.cats.length === 4
      && r.cats.some(c => /Expressões 5 desafios/.test(c)) && r.cats.some(c => /Ouça e traduza 32 desafios/.test(c)) && r.cats.some(c => /Acentuação 11 desafios/.test(c)) && r.cats.some(c => /Ditados 1 ditado/.test(c)), r);
    // entra em Ouça e traduza e abre o primeiro do módulo
    r = await ev(async () => { renderChallengesList('listen_translate'); const t = document.getElementById('challenges-cards').textContent.replace(/\s+/g, ' '); openChallengeQueueLevel('listen_translate', 'A1'); return { t, id: CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id, moduleOnly: !/old/.test(CURRENT_CHALLENGE_PLAYER.id) }; });
    check(`Premium(${theme}): fila recortada (0/32) e abre desafio do módulo`, /0\/32 concluído/.test(r.t) && r.id === 'lt-a1m1-001' && r.moduleOnly, r);
    // ditados recortados e volta
    await ev(async () => { await renderChallengeCategories(); document.getElementById('challenges-dictation-card').click(); });
    await page.waitForFunction(() => dictationModuleFilter === 'A1-m1');
    r = await ev(() => ({ cards: document.querySelectorAll('.dictation-card').length, locked: document.querySelectorAll('.dictation-card.locked').length }));
    check(`Premium(${theme}): ditados do módulo (1) sem cadeado`, r.cards === 1 && r.locked === 0, r);
    await ev(() => document.getElementById('dictation-back-to-challenges').click());
    await page.waitForFunction(() => challengesModuleFilter === 'A1-m1' && document.querySelectorAll('.challenge-category-card').length > 0);
    check(`Premium(${theme}): voltar do ditado mantém o recorte do módulo`, true);
    // voltar à trilha
    await ev(() => document.getElementById('challenges-module-back').click());
    r = await ev(() => ({ filter: challengesModuleFilter, trail: getComputedStyle(document.getElementById('view-path')).display !== 'none' }));
    check(`Premium(${theme}): "Voltar à trilha" limpa o recorte`, r.filter === null, r);
    // aba Desafios aberta direto = sem recorte
    await ev(async () => { switchTab('challenges'); });
    await page.waitForFunction(() => document.querySelectorAll('.challenge-category-card').length === 4 && challengesModuleFilter === null);
    r = await ev(() => document.getElementById('challenges-categories-title').textContent);
    check(`Premium(${theme}): aba Desafios direta continua geral`, r === 'Desafios', r);
    r = await ev(() => { renderChallengesList('expression'); return { total: document.querySelectorAll('.challenge-card').length, locked: document.querySelectorAll('.challenge-card.locked').length }; });
    check(`Premium(${theme}): na aba geral nada trancado`, r.total === 6 && r.locked === 0, r);
    check(`Premium(${theme}): nenhum pageerror`, errors.length === 0, errors.slice(0, 3));
    if (theme === 'light'){ await ev(async () => { switchTab('path'); renderUnitsGrid(); await fillModuleChallengeRows(); }); }
    await ctx.close();
  }

  // screenshots (trilha Free, 4 cenários: claro/escuro)
  for (const theme of ['light', 'dark']){
    const { page, ctx } = await boot(browser, port, theme);
    await page.evaluate(async () => { renderUnitsGrid(); await fillModuleChallengeRows(); });
    const el = await page.$('.module-challenges');
    await el.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/claude-0/-home-user-mandarimdozero/4c1eb048-5257-5fef-a1a8-50fce44b465c/scratchpad/trilha-free-${theme}.png`, clip: await (async () => { const b = await el.boundingBox(); return { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 60), width: Math.min(b.width + 40, 1100), height: b.height + 120 }; })() });
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`Desafios do Módulo playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
