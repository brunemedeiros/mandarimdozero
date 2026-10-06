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

  const done = id => ev(i => !!STATE.completedChallenges[i], id);

  // ---- Acentuação ----
  await ev(() => { switchTab && switchTab('challenges'); openChallengePlayer('accent-old-001'); });
  await page.fill('#accent-answer-input', 'professeur');
  await page.click('#accent-verify-btn');
  check('acento: erro total mostra Tentar de novo', await page.isVisible('#challenge-retry-btn'));
  check('acento: erro total mostra Tentar mais tarde', await page.isVisible('#challenge-later-btn'));
  check('acento: erro total NÃO tem Concluir', !(await page.isVisible('#challenge-complete-btn')));
  check('acento: erro total não conclui', !(await done('accent-old-001')));
  await page.click('#challenge-retry-btn');
  check('acento: Tentar de novo reabre a pergunta', await page.isVisible('#accent-answer-input'));
  await page.fill('#accent-answer-input', 'ecole');
  await page.click('#accent-verify-btn');
  check('acento: erro leve tem Concluir', await page.isVisible('#challenge-complete-btn'));
  check('acento: erro leve sem Tentar de novo', !(await page.isVisible('#challenge-retry-btn')));
  check('acento: erro leve marcado como parcial', await page.isVisible('.accent-feedback.partial'));
  await page.click('#challenge-complete-btn');
  check('acento: erro leve conclui', await done('accent-old-001'));

  // ---- Ouça e traduza ----
  await ev(() => openChallengePlayer('lt-old-001'));
  await page.fill('#lt-answer-input', 'Gosto de gatos azuis');
  await page.click('#lt-verify-btn');
  check('traduzir: erro total mostra os 2 botões', (await page.isVisible('#challenge-retry-btn')) && (await page.isVisible('#challenge-later-btn')));
  await page.click('#challenge-later-btn');
  check('traduzir: Tentar mais tarde sai sem concluir', !(await done('lt-old-001')));
  check('traduzir: volta para a lista', await page.isVisible('#challenges-list-wrap'));
  await ev(() => openChallengePlayer('lt-old-001'));
  await page.fill('#lt-answer-input', 'Eu como uma maçã');
  await page.click('#lt-verify-btn');
  check('traduzir: acerto tem Concluir', await page.isVisible('#challenge-complete-btn'));
  await page.click('#challenge-complete-btn');
  check('traduzir: acerto conclui', await done('lt-old-001'));

  // ---- Expressões (binário) ----
  await ev(() => openChallengePlayer('expr-old-001'));
  await page.click('#challenge-reveal-btn');
  const wrong = await ev(() => { const c = CHALLENGES.find(x => x.id === 'expr-old-001'); return c.options.findIndex(o => o !== c.correctAnswer); });
  await page.click(`.challenge-choice-btn[data-orig-idx="${wrong}"]`);
  check('expressão: errar mostra Tentar de novo', await page.isVisible('#challenge-retry-btn'));
  check('expressão: errar não conclui', !(await done('expr-old-001')));
  await page.click('#challenge-retry-btn');
  check('expressão: Tentar de novo reabre a pergunta', await page.isVisible('#challenge-reveal-btn'));
  await page.click('#challenge-reveal-btn');
  const right = await ev(() => { const c = CHALLENGES.find(x => x.id === 'expr-old-001'); return c.options.findIndex(o => o === c.correctAnswer); });
  await page.click(`.challenge-choice-btn[data-orig-idx="${right}"]`);
  await page.click('#challenge-complete-btn');
  check('expressão: acertar conclui', await done('expr-old-001'));

  check('sem erros de JS', errors.length === 0, errors);
  await browser.close(); server.close();
  console.log(`Conclusão dos Desafios playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
