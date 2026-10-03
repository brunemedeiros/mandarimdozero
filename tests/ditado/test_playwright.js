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
  for (const [vp, theme] of [[{ width: 390, height: 844 }, 'light'], [{ width: 1200, height: 900 }, 'dark']]){
    const { page, errors, ctx } = await boot(browser, port, theme);
    await page.setViewportSize(vp);
    const ev = (fn, a) => page.evaluate(fn, a);
    const tag = `${vp.width}/${theme}`;
    await ev(() => { switchTab('dictation'); openDictationPlayer('d1'); });
    let r = await ev(() => { const t = document.getElementById('dictation-input'); return { ac: t.getAttribute('autocapitalize'), acorr: t.getAttribute('autocorrect'), sp: t.getAttribute('spellcheck'), au: t.getAttribute('autocomplete'), al: t.getAttribute('aria-label'), ml: +t.getAttribute('maxlength') }; });
    check(`${tag}: textarea sem autocorreção/capitalização`, r.ac === 'off' && r.acorr === 'off' && r.sp === 'false' && r.au === 'off' && r.al && r.ml >= 400, r);
    // campo vazio: não corrige, não mostra resultado
    await ev(() => document.getElementById('dictation-check-btn').click());
    r = await ev(() => ({ res: document.getElementById('dictation-result-wrap').innerHTML.trim(), btn: getComputedStyle(document.getElementById('dictation-check-btn')).display }));
    check(`${tag}: campo vazio não gera resultado`, r.res === '' && r.btn !== 'none', r);
    // tecla de acento não rouba o foco
    r = await ev(() => { const k = document.querySelector('.fr-accent-key'); const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true }); k.dispatchEvent(e); return e.defaultPrevented; });
    check(`${tag}: mousedown na tecla de acento é cancelado (foco fica no campo)`, r === true);
    // teclas de acento visíveis (sem rolagem horizontal escondendo teclas)
    r = await ev(() => { const p = document.querySelector('.fr-accent-picker'); return { sw: p.scrollWidth, cw: p.clientWidth }; });
    check(`${tag}: seletor de acentos sem rolagem horizontal`, r.sw <= r.cw + 1, r);
    // digita com vários desvios
    await page.fill('#dictation-input', "bonjour a tous ! Je m'appelle Sophie. J'ai 25 ans et je suis francaise virgule J'habite a Lyon. Et vous comment vous appelez vous");
    await ev(() => document.getElementById('dictation-check-btn').click());
    r = await ev(() => ({
      near: document.querySelectorAll('.dictation-word-near').length,
      notes: [...document.querySelectorAll('.dictation-notes li')].map(l => l.textContent),
      missing: document.querySelectorAll('.dictation-punct-missing').length,
      score: +document.querySelector('.dictation-score-badge').textContent,
    }));
    check(`${tag}: erros leves aparecem como "quase"`, r.near >= 3, r);
    check(`${tag}: dígito mostra a escrita por extenso`, r.notes.some(n => n.includes('vingt-cinq')), r.notes);
    check(`${tag}: "virgule" por extenso é avisado`, r.notes.some(n => n.includes('virgule')), r.notes);
    check(`${tag}: pontuação faltando é marcada`, r.missing > 0 && r.notes.some(n => n.startsWith('Pontuação')), r);
    check(`${tag}: nota entre 0 e 100`, r.score > 0 && r.score < 100, r);
    const inView = await ev(() => { const b = document.querySelector('.dictation-result').getBoundingClientRect(); return b.top < innerHeight; });
    check(`${tag}: resultado entra na tela depois de verificar`, inView);
    await page.waitForTimeout(400);
    await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/ditado-${vp.width}-${theme}.png` : '/dev/null', fullPage: true });
    // áudio inexistente (d3 sem mp3 no repo) desabilita o botão
    await ev(() => { openDictationPlayer('d3'); });
    await page.waitForFunction(() => document.getElementById('dictation-play-btn').disabled, null, { timeout: 5000 }).catch(() => {});
    r = await ev(() => document.getElementById('dictation-play-btn').disabled);
    check(`${tag}: áudio ausente desabilita o botão de ouvir`, r === true);
    check(`${tag}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Ditado playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
