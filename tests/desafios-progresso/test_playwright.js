// Desafios (fr) -- Fase 6: progresso por categoria, selos Free/Premium e
// revisão espaçada dos erros. Playwright (Chromium real), modo convidado.
// Rodar: node tests/desafios-progresso/test_playwright.js
// (stub do Supabase igual ao de tests/desafios-conclusao).
// Base original: Desafios do Módulo (Premium) -- só fr (o zh não
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

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(async () => { await loadChallengesFromDB(true); });


  const DAY = 86400000;
  const catProgress = type => ev(t => { const el = document.querySelector(`.challenge-category-card[data-category="${t}"] .challenge-progress`); return el ? { done: +el.dataset.done, total: +el.dataset.total, text: el.textContent.trim() } : null; }, type);
  await ev(() => switchTab('challenges'));
  await page.waitForSelector('.challenge-category-card[data-category="accent"] .challenge-progress');

  // ---- (a) progresso por categoria ----
  const expected = await ev(() => ({ accent: listedChallenges().filter(c => c.type === 'accent').length, lt: listedChallenges().filter(c => c.type === 'listen_translate').length }));
  let p = await catProgress('accent');
  check('progresso: Acentuação mostra 0 de Y', p && p.done === 0 && p.total === expected.accent, p);
  check('progresso: texto "X de Y concluídos"', p && /0 de \d+ concluíd/.test(p.text), p);
  check('progresso: barra existe', await page.isVisible('.challenge-category-card[data-category="accent"] .challenge-progress-track'));
  check('progresso: card de Ditados tem progresso', await page.isVisible('#challenges-dictation-card .challenge-progress'));

  // concluir 1 acentuação (erro leve) e ver o contador subir
  await ev(() => openChallengePlayer('accent-old-001'));
  await page.fill('#accent-answer-input', 'ecole');
  await page.click('#accent-verify-btn');
  await page.click('#challenge-complete-btn');
  await ev(() => renderChallengeCategories());
  await page.waitForSelector('.challenge-category-card[data-category="accent"] .challenge-progress');
  p = await catProgress('accent');
  check('progresso: concluir sobe para 1', p && p.done === 1, p);

  // na lista da categoria
  await ev(() => renderChallengesList('accent'));
  const lp = await ev(() => { const el = document.querySelector('#challenges-list-progress .challenge-progress'); return el ? +el.dataset.done : null; });
  check('progresso: topo da lista mostra 1 concluído', lp === 1, lp);

  // ditado: registrar uma tentativa e ver na lista de ditados
  const dictId = await ev(() => dictationsVisible(null)[0].id);
  await ev(id => { STATE.dictations[id] = { bestScore: 80, attempts: 1, lastScore: 80, lastAt: Date.now(), wrongWords: [] }; switchTab('dictation'); }, dictId);
  await page.waitForSelector('#dictation-list-progress .challenge-progress');
  const dp = await ev(() => +document.querySelector('#dictation-list-progress .challenge-progress').dataset.done);
  check('progresso: lista de ditados conta o ditado feito', dp === 1, dp);

  // ---- (b) selos Free/Premium ----
  const dictBadges = await ev(() => [...document.querySelectorAll('.dictation-card')].every(c => c.querySelectorAll('.tier-badge').length === 1));
  check('selos: todo card de ditado tem 1 selo', dictBadges);
  await ev(() => { switchTab('challenges'); });
  await page.waitForSelector('.challenge-category-card[data-category="expression"]');
  await ev(() => renderChallengesList('expression'));
  const exprBadges = await ev(() => [...document.querySelectorAll('.challenge-card')].every(c => c.querySelectorAll('.tier-badge').length === 1));
  check('selos: todo card de expressão tem 1 selo', exprBadges);
  await ev(() => renderChallengesList('listen_translate'));
  const lvlBadges = await ev(() => [...document.querySelectorAll('.challenge-queue-level-card')].every(c => c.querySelector('.tier-badge')));
  check('selos: cards de nível (Ouça e traduza) têm selo', lvlBadges);
  const badgeNotStretched = await ev(() => { const b = document.querySelector('.tier-badge'); const r = b.getBoundingClientRect(); return r.width < 120 && r.height < 30; });
  check('selos: não esticam', badgeNotStretched);

  // ---- (c) revisão espaçada ----
  await ev(() => openChallengePlayer('lt-old-001'));
  await page.fill('#lt-answer-input', 'Gosto de gatos azuis');
  await page.click('#lt-verify-btn');
  let rev = await ev(() => STATE.challengeReviews['lt-old-001']);
  check('revisão: erro total registra caixa 1', rev && rev.box === 1, rev);
  await page.click('#challenge-later-btn');
  await ev(() => renderChallengeCategories());
  await page.waitForSelector('.challenge-category-card[data-category="accent"]');
  check('revisão: erro de hoje ainda não aparece como devido', !(await page.isVisible('#challenges-review-card')));
  // erro leve também entra
  await ev(() => openChallengePlayer('accent-old-001'));
  await page.fill('#accent-answer-input', 'ecole');
  await page.click('#accent-verify-btn');
  check('revisão: erro leve registra caixa 1', (await ev(() => STATE.challengeReviews['accent-old-001'])).box === 1);
  await page.click('#challenge-complete-btn');

  // simular que os erros foram ontem
  await ev(D => { Object.values(STATE.challengeReviews).forEach(e => { e.lastErrorAt -= D; e.lastSeenAt -= D; }); renderChallengeCategories(); }, DAY);
  await page.waitForSelector('#challenges-review-card');
  const title = await page.textContent('#challenges-review-card .challenge-category-title');
  check('revisão: cartão "Revisar erros (2)"', /Revisar erros \(2\)/.test(title), title);
  check('revisão: estado persiste no save', await ev(() => !!serializeState().challengeReviews['lt-old-001']));
  await page.click('#challenges-review-card');
  // fila: o erro mais antigo primeiro (lt-old-001)
  await page.waitForSelector('#lt-answer-input');
  check('revisão: abre o player do desafio devido', await ev(() => CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id === 'lt-old-001'));
  await page.fill('#lt-answer-input', 'Eu como uma maçã');
  await page.click('#lt-verify-btn');
  rev = await ev(() => STATE.challengeReviews['lt-old-001']);
  check('revisão: acerto devido sobe para caixa 2', rev && rev.box === 2, rev);
  await page.click('#challenge-complete-btn');
  await page.waitForSelector('#accent-answer-input');
  check('revisão: segue para o próximo devido', await ev(() => CURRENT_CHALLENGE_PLAYER.id === 'accent-old-001'));
  await page.fill('#accent-answer-input', 'professeur');
  await page.click('#accent-verify-btn');
  check('revisão: errar volta à caixa 1', (await ev(() => STATE.challengeReviews['accent-old-001'])).box === 1);
  await page.click('#challenge-later-btn');
  check('revisão: Tentar mais tarde volta às categorias', await page.isVisible('#challenges-categories-wrap'));
  await page.waitForSelector('.challenge-category-card[data-category="accent"]');
  check('revisão: nada mais devido hoje', !(await page.isVisible('#challenges-review-card')));

  check('sem erros de JS', errors.length === 0, errors);
  await browser.close(); server.close();
  console.log(`Progresso/revisão dos Desafios playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
