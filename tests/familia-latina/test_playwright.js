// Família latina, fase 2: o fr de verdade no navegador (Chromium), com shared/core/familias/latina.js e a
// configuração de fr/lang-hooks.js carregados pelo fr/index.html. Confere as telas que mudaram com as
// decisões da dona (2026-10-15):
//  (a) "oe" por "œ" = Quase no "Digite o que ouviu" e na lacuna digitada (meio ponto, mostra a forma certa);
//  (c) apóstrofo curvo do celular aceito na lacuna digitada;
// e que nada mais mudou nesses exercícios (acerto e erro de sempre).
// Supabase do CDN trocado por um stub; boot em modo convidado. Rodar: node tests/familia-latina/test_playwright.js
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
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); if (p === 'single' || p === 'maybeSingle') return () => Promise.resolve({ data: null, error: null }); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function boot(browser, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('frances_cloze_mode', 'type'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  return { page, errors, ctx };
}

// Monta o exercício numa caixa própria, digita, verifica e devolve o que a tela mostrou.
async function vocabType(page, typed){
  return page.evaluate(async (typed) => {
    const u = UNITS.find(x => (x.vocab || []).some(v => /œ/.test(v.f)));
    const item = u.vocab.find(v => /œ/.test(v.f));
    STATE.currentUnitId = u.id;
    STEP_STATE.exerciseScore = 0; STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseIndex = 0;
    const box = document.createElement('div'); box.id = 'fl-box'; document.body.appendChild(box);
    const next = document.createElement('button');
    renderVocabTypeExercise({ format: 'type', item }, box, next, 5);
    const input = document.getElementById('vocab-type-input');
    input.value = typed.replace('{f}', item.f).replace('{oe}', item.f.replace(/œ/g, 'oe'));
    document.getElementById('vocab-type-verify-btn').click();
    await new Promise(r => setTimeout(r, 700));
    const out = { f: item.f, score: STEP_STATE.exerciseScore, almost: !!box.querySelector('.review-almost'), almostText: box.querySelector('.review-almost')?.textContent || '',
      correctPanel: !!box.querySelector('.correct-feedback'), wrongPanel: !!box.querySelector('.wrong-answer, .answer-panel, .feedback-wrong, .wrong-feedback') || !box.querySelector('.correct-feedback') };
    box.remove();
    return out;
  }, typed);
}
async function clozeType(page, blockF, typed){
  return page.evaluate(async ([blockF, typed]) => {
    STEP_STATE.exerciseScore = 0; STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseIndex = 0;
    const box = document.createElement('div'); box.id = 'fl-box'; document.body.appendChild(box);
    const next = document.createElement('button');
    const correctBlock = { f: blockF };
    const ex = { format: 'cloze', phrase: { blocks: [{ f: 'Voilà' }, correctBlock], f: 'Voilà ' + blockF, t: 'Aqui está' }, blankIdx: 1, correctBlock, options: [correctBlock, { f: 'chat' }] };
    renderClozeExercise(ex, box, next, 5);
    document.getElementById('cloze-input').value = typed;
    document.getElementById('cloze-verify-btn').click();
    await new Promise(r => setTimeout(r, 700));
    const out = { score: STEP_STATE.exerciseScore, almost: !!box.querySelector('.review-almost'), correctPanel: !!box.querySelector('.correct-feedback'),
      blankClass: document.getElementById('cloze-blank').className };
    box.remove();
    return out;
  }, [blockF, typed]);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const { page, errors, ctx } = await boot(browser, port);

  check('módulo carregado na página (FamiliaLatina e LANG_HOOKS.familiaLatina)', await page.evaluate(() => typeof FamiliaLatina === 'object' && LANG_HOOKS.familiaLatina.id === 'fr' && typeof latinaFr() === 'object'));

  // ---- (a) "Digite o que ouviu"
  let r = await vocabType(page, '{f}');
  check('vocab: forma exata com œ = acerto (1 ponto, sem "Quase")', r.score === 1 && !r.almost && r.correctPanel, r);
  r = await vocabType(page, '{oe}');
  check('vocab (a): "oe" no lugar de "œ" = Quase (meio ponto, painel de acerto com "Quase lá")', r.score === 0.5 && r.almost && r.correctPanel && /Quase/.test(r.almostText), r);
  r = await vocabType(page, 'xyz');
  check('vocab: palavra errada continua erro (0 ponto, sem painel de acerto)', r.score === 0 && !r.correctPanel, r);

  // ---- (a) e (c) lacuna digitada
  r = await clozeType(page, 'sœur', 'soeur');
  check('lacuna (a): "soeur" por "sœur" = Quase (meio ponto)', r.score === 0.5 && r.almost && r.correctPanel, r);
  r = await clozeType(page, 'sœur', 'sœur');
  check('lacuna: "sœur" = acerto', r.score === 1 && !r.almost, r);
  r = await clozeType(page, "l'école", 'l’école');
  check('lacuna (c): apóstrofo curvo do celular = acerto (antes: erro)', r.score === 1 && !r.almost && /correct/.test(r.blankClass), r);
  r = await clozeType(page, 'école', 'ecole');
  check('lacuna: sem acento continua acerto (acento não conta)', r.score === 1 && !r.almost, r);
  r = await clozeType(page, 'école', 'chat');
  check('lacuna: palavra errada = erro', r.score === 0 && /incorrect/.test(r.blankClass), r);

  check('sem erro de página', errors.length === 0, errors);
  await ctx.close();
  await browser.close(); server.close();
  console.log(`família latina no navegador: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
