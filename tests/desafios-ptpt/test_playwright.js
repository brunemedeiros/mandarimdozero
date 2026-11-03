// Regra da dona (2026-10-26): no site em pt-BR, resposta do Ouça e traduza em português de Portugal = "Quase", com a forma do
// Brasil na devolutiva. No site em inglês a regra não entra. Usa o lt-a1-001 do retrato da produção (já corrigido).
// Rodar: node tests/desafios-ptpt/test_playwright.js   (SHOT=arquivo.png guarda a tela da devolutiva)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const leva1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/challenges-producao-sem-fonte.json'), 'utf8')).challenges;
const toRow = (it, status = 'published') => { const { id, type, level, ...data } = it; return { id, type, level, status, data: { ...data, status } }; };
const ROWS = leva1.map(i => toRow(i));

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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };

async function boot(browser, port, lang){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript((lang) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); } catch (e) {} }, lang);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  if (lang === 'en') await page.waitForFunction(() => window.CHALLENGES_I18N && window.CHALLENGES_I18N.en && getUiLang() === 'en', null, { timeout: 15000 });
  return { page, errors, ctx };
}
async function answer(page, id, text){
  return page.evaluate(async ({ id, text }) => {
    switchTab('challenges'); await renderChallengeCategories(); renderChallengesList('listen_translate'); openChallengePlayer(id);
    document.getElementById('lt-answer-input').value = text;
    document.getElementById('lt-verify-btn').click();
    const w = document.getElementById('lt-feedback-wrap');
    return { text: w.innerText.replace(/\s+/g, ' '), html: w.innerHTML };
  }, { id, text });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    let { page, errors, ctx } = await boot(browser, port, 'pt-BR');
    let r = await answer(page, 'lt-a1-001', 'Eu estou a comer uma maçã.');
    check('pt-BR: "estou a comer" -> Quase, forma de Portugal', r.text.includes('Quase! Essa forma é de Portugal.'), r.text);
    check('pt-BR: devolutiva mostra a forma do Brasil', r.text.includes('No Brasil se diz: estou comendo (em vez de "estou a comer").') && r.html.includes('<strong>estou comendo</strong>'), r.text);
    check('pt-BR: resposta esperada é do Brasil', /Resposta esperada\s*(Eu e|E)stou comendo uma maçã/.test(r.text), r.text);
    await page.screenshot({ path: process.env.SHOT || '/tmp/ptpt-feedback.png', fullPage: false });
    r = await answer(page, 'lt-a1-001', 'Eu estou comendo uma maçã.');
    check('pt-BR: "estou comendo" -> certa, sem aviso de Portugal', r.text.includes('Tradução certa') && !r.text.includes('Portugal'), r.text);
    r = await answer(page, 'lt-a1-001', 'Eu como uma maçã');
    check('pt-BR: "Eu como uma maçã" -> certa', r.text.includes('Tradução certa'), r.text);
    check('pt-BR: sem erro de página', errors.filter(e => !/ERR_TUNNEL/.test(e)).length === 0, errors);
    await ctx.close();
    ({ page, errors, ctx } = await boot(browser, port, 'en'));
    r = await answer(page, 'lt-a1-001', "I'm eating an apple.");
    check('en: tradução em inglês certa, regra de Portugal não entra', r.text.includes('Correct translation') && !/Portugal|Brazil/.test(r.text), r.text);
    check('en: sem erro de página', errors.filter(e => !/ERR_TUNNEL/.test(e)).length === 0, errors);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
  console.log(`PT-PT na tela do Ouça e traduza: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
