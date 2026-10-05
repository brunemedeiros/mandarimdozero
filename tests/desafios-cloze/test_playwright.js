// Desafios "Complete a frase" (cloze_grammar, Fase 7) -- Playwright (Chromium
// real), só fr. Supabase do CDN trocado por um stub em memória; a tabela
// `challenges` devolve o lote real lote-a1-m6-cloze.json + o lote do módulo 1.
// Modo convidado. Rodar: node tests/desafios-cloze/test_playwright.js
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
const cloze = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m6-cloze.json'), 'utf8'));
const ROWS = [...legacy, ...lote.map(i => toRow(i)), ...cloze.map(i => toRow(i))];

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
  const done = id => ev(i => !!STATE.completedChallenges[i], id);

  // ---- categoria na aba Desafios ----
  await ev(() => switchTab('challenges'));
  await page.waitForSelector('.challenge-category-card[data-category="cloze_grammar"]');
  const cardText = await page.textContent('.challenge-category-card[data-category="cloze_grammar"]');
  check('card da categoria existe com título', cardText.includes('Complete a frase'), cardText);
  check('ícone próprio (🧠), distinto dos demais', cardText.includes('🧠') && !cardText.includes('🧩'));
  check('progresso por categoria 0 de 6', cardText.includes('0 de 6'), cardText);

  // ---- lista (fila por nível) ----
  await page.click('.challenge-category-card[data-category="cloze_grammar"]');
  await page.waitForSelector('#challenges-cards [data-level="A1"]');
  check('lista mostra selo Premium', await page.isVisible('#challenges-cards .tier-badge.tier-premium'));
  await page.click('#challenges-cards [data-level="A1"]');
  await page.waitForSelector('.cloze-grammar-sentence');
  const firstId = await ev(() => CURRENT_CHALLENGE_PLAYER && CURRENT_CHALLENGE_PLAYER.id);
  check('Começar abre o 1º desafio cloze', firstId === 'cloze-a1m6-001', firstId);
  check('frase mostra a lacuna ___', (await page.textContent('.cloze-grammar-sentence')).includes('___'));
  check('2 opções na lacuna', (await page.$$('.cloze-grammar-group .challenge-choice-btn')).length === 2);

  // ---- verificar sem escolher ----
  await page.click('#cloze-grammar-verify-btn');
  check('verificar sem escolher pede a escolha', (await page.textContent('#cloze-grammar-msg')).length > 0);
  check('verificar sem escolher não abre feedback', !(await page.isVisible('#challenge-retry-btn')) && !(await page.isVisible('#challenge-complete-btn')));

  // ---- erro = fail ----
  await page.click('.challenge-choice-btn[data-value="sommes"]');
  check('escolha preenche a lacuna', (await page.textContent('.cloze-grammar-slot')).trim() === 'sommes');
  await page.click('#cloze-grammar-verify-btn');
  check('erro mostra Tentar de novo', await page.isVisible('#challenge-retry-btn'));
  check('erro mostra Tentar mais tarde', await page.isVisible('#challenge-later-btn'));
  check('erro não tem Concluir', !(await page.isVisible('#challenge-complete-btn')));
  check('erro mostra explicação', (await page.textContent('.challenge-explanation')).includes('avoir'));
  check('erro mostra a resposta certa', (await page.textContent('.challenge-feedback-chosen')).includes('nous avons mangé'));
  check('erro marca a opção certa e a errada', await page.isVisible('.challenge-choice-btn.correct') && await page.isVisible('.challenge-choice-btn.incorrect'));
  check('erro não conclui', !(await done('cloze-a1m6-001')));
  check('erro entra na revisão espaçada (caixa 1)', await ev(() => STATE.challengeReviews['cloze-a1m6-001'] && STATE.challengeReviews['cloze-a1m6-001'].box === 1));

  // ---- Tentar de novo + acerto ----
  await page.click('#challenge-retry-btn');
  await page.waitForSelector('#cloze-grammar-verify-btn');
  await page.click('.challenge-choice-btn[data-value="avons"]');
  await page.click('#cloze-grammar-verify-btn');
  check('acerto tem Concluir', await page.isVisible('#challenge-complete-btn'));
  check('acerto sem Tentar de novo', !(await page.isVisible('#challenge-retry-btn')));
  check('acerto mostra tradução', (await page.textContent('#cloze-grammar-feedback-wrap')).includes('Ontem, nós comemos'));
  await page.click('#challenge-complete-btn');
  check('acerto conclui', await done('cloze-a1m6-001'));
  check('fila segue para o próximo', await page.isVisible('#queue-continue-btn'));

  // ---- 2 lacunas ----
  await ev(() => openChallengePlayer('cloze-a1m6-006'));
  await page.waitForSelector('.cloze-grammar-group-label');
  check('2 lacunas mostram 2 grupos rotulados', (await page.$$('.cloze-grammar-group')).length === 2);
  await page.click('.challenge-choice-btn[data-blank="0"][data-value="sommes"]');
  await page.click('#cloze-grammar-verify-btn');
  check('2 lacunas: só uma escolhida pede as duas', !(await page.isVisible('#challenge-complete-btn')) && (await page.textContent('#cloze-grammar-msg')).length > 0);
  await page.click('.challenge-choice-btn[data-blank="1"][data-value="allé"]');
  await page.click('#cloze-grammar-verify-btn');
  check('2 lacunas: uma errada = fail', await page.isVisible('#challenge-retry-btn'));
  check('2 lacunas: slot certo verde, errado vermelho', await page.isVisible('.cloze-grammar-slot.correct') && await page.isVisible('.cloze-grammar-slot.incorrect'));
  await page.click('#challenge-retry-btn');
  await page.waitForSelector('#cloze-grammar-verify-btn');
  await page.click('.challenge-choice-btn[data-blank="0"][data-value="sommes"]');
  await page.click('.challenge-choice-btn[data-blank="1"][data-value="allés"]');
  await page.click('#cloze-grammar-verify-btn');
  await page.click('#challenge-complete-btn');
  check('2 lacunas: acerto conclui', await done('cloze-a1m6-006'));

  // ---- progresso por categoria atualizado ----
  await ev(() => renderChallengeCategories());
  await page.waitForSelector('.challenge-category-card[data-category="cloze_grammar"]');
  check('progresso por categoria 2 de 6', (await page.textContent('.challenge-category-card[data-category="cloze_grammar"]')).includes('2 de 6'));
  check('erro de hoje ainda não aparece em Revisar erros (devido amanhã)', !(await page.isVisible('#challenges-review-card')));

  // ---- importação e admin (funções puras, sem rede real) ----
  const imp = await ev(async () => {
    const r = await importChallengesFromJSON(JSON.stringify([{ id: 'cloze-new-1', type: 'cloze_grammar', level: 'A1', sentenceFr: 'Il ___ mangé.', blanks: [{ options: ['a', 'est'], answer: 'a' }], explanation: 'x' }]));
    return r;
  });
  check('importação aceita type cloze_grammar', imp.insertedCount === 1 && imp.skipped.length === 0, imp);
  const admin = await ev(() => {
    const c = CHALLENGES.find(x => x.id === 'cloze-a1m6-006');
    const items = challengeQualityChecklist(c);
    const bad = challengeQualityChecklist({ ...c, blanks: [c.blanks[0]] });
    return { read: challengeAdminReadView(c), edit: challengeAdminEditView(c), title: challengeAdminCardTitle(c), ok: items.every(i => i.ok), badBlocks: bad.some(i => !i.ok && i.blocking), label: CHALLENGE_TYPE_LABELS.cloze_grammar };
  });
  check('admin: leitura mostra as opções', admin.read.includes('allés') && admin.read.includes('Lacuna 2'));
  check('admin: edição tem campo blanks com * na certa', admin.edit.includes('data-field="blanks"') && admin.edit.includes('*sommes'));
  check('admin: título do card', admin.title.includes('🧠'));
  check('admin: checklist ok para item válido', admin.ok);
  check('admin: checklist bloqueia lacuna sem opções', admin.badBlocks);
  check('admin: rótulo no filtro', admin.label === 'Complete a frase');

  check('sem erros de JS', errors.length === 0, errors);
  await browser.close(); server.close();
  console.log(`Complete a frase playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
