// Paridade fr x zh no navegador (C2, C4, C5, D6; docs/auditoria-paridade-fr-zh.md): mesmos arquivos de produção,
// rede stubada. Para cada site: "Digite o que ouviu" e lacuna digitada erradas mostram "Sua resposta" com as letras
// erradas marcadas; Ordenar errado deixa verdes os blocos no lugar certo; o mp3 pré-gravado toca a 0,9; no site em
// inglês do zh o selo de unidade pulada sai em inglês. Tira capturas (claro/escuro, 390px e 900px) se SHOTS=pasta.
// Rodar: node tests/paridade-sites/test_licao_feedback_playwright.js   (SHOTS=/caminho para salvar as capturas)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function abrir(browser, port, site, { lang = 'pt-BR', width = 390, theme = 'light' } = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 844 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(([lang, theme]) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); localStorage.setItem('theme', theme); } catch (e) {}
    // mp3: só registra a velocidade (o sandbox não toca som).
    window.__audioRates = [];
    const Real = window.Audio;
    window.Audio = function(src){ const a = new Real(); a.__src = src; a.play = function(){ window.__audioRates.push({ src, rate: a.playbackRate }); return Promise.resolve(); }; return a; };
  }, [lang, theme]);
  await page.goto(`http://127.0.0.1:${port}/${site}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 20000 });
  await page.evaluate((theme) => { document.documentElement.setAttribute('data-theme', theme); }, theme);
  return { ctx, page, errors };
}

// Monta um exercício direto na tela da lição (mesmo caminho do renderExerciseStep).
async function montar(page, site, kind){
  return page.evaluate(async ([site, kind]) => {
    const zh = site === 'zh';
    const u = UNITS.find(x => (x.phrases || []).some(p => p.blocks && p.blocks.length >= 3)) || UNITS[0];
    STATE.currentUnitId = u.id;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('step-content'), nb = document.getElementById('step-next-btn');
    const v = el.closest('.view'); if (v) v.classList.add('active');
    const wrap = document.getElementById('unit-detail-wrap'); if (wrap) wrap.style.display = 'block';
    const grid = document.getElementById('units-grid'); if (grid) grid.style.display = 'none';
    STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseIndex = 0; STEP_STATE.exerciseList = [1, 2, 3, 4];
    const phrase = u.phrases.find(p => p.blocks && p.blocks.length >= 3);
    if (kind === 'vocab'){
      const item = zh ? { c: '你好', p: 'nǐ hǎo', t: 'olá' } : { f: 'allemand / allemande', t: 'alemão' };
      renderVocabTypeExercise({ item, format: 'type' }, el, nb, 4);
      document.getElementById('vocab-type-input').value = zh ? 'ni3 hao' : 'allemand / alemande';
      document.getElementById('vocab-type-verify-btn').click();
      await new Promise(r => setTimeout(r, 300));
    } else if (kind === 'cloze'){
      localStorageSafeSet(CLOZE_MODE_KEY, 'type');
      const blankIdx = 0, correctBlock = phrase.blocks[blankIdx];
      renderClozeExercise({ format: 'cloze', phrase, blankIdx, correctBlock, options: [correctBlock] }, el, nb, 4);
      const certo = zh ? correctBlock.p : correctBlock.f;
      document.getElementById('cloze-input').value = certo.slice(0, -1) + 'x';
      document.getElementById('cloze-verify-btn').click();
      await new Promise(r => setTimeout(r, 900));
      return { certo, attempt: (el.querySelector('.typed-attempt') || {}).innerHTML || null, wrong: !!el.querySelector('.wrong-feedback') };
    } else {
      // Ordenar: o 1º bloco no lugar certo, os outros dois trocados.
      const b = phrase.blocks;
      const shuffledBlocks = [b[0], b[2], b[1], ...b.slice(3)];
      renderReorderExercise({ format: 'reorder', mode: 'order', phrase, shuffledBlocks }, el, nb, 4);
      const order = [0, 1, 2, ...b.slice(3).map((_, i) => i + 3)];
      for (const i of order){
        const btn = el.querySelector(`.reorder-block[data-block-idx="${i}"]:not(.used)`);
        if (btn) btn.click();
      }
      await new Promise(r => setTimeout(r, 900));
      const slots = [...el.querySelectorAll('.reorder-slot')].map(s => s.classList.contains('correct') ? 'correct' : s.classList.contains('incorrect') ? 'incorrect' : '?');
      return { slots, n: b.length, wrong: !!el.querySelector('.wrong-feedback') };
    }
    return { attempt: (el.querySelector('.typed-attempt') || {}).innerHTML || null, wrong: !!el.querySelector('.wrong-feedback') };
  }, [site, kind]);
}

async function captura(page, nome){
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const panel = await page.$('.wrong-feedback');
  if (panel) await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator('#step-content .exercise-wrap').screenshot({ path: path.join(SHOTS, nome + '.png') });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const site of ['fr', 'zh']){
    const { ctx, page, errors } = await abrir(browser, port, site);
    let r = await montar(page, site, 'vocab');
    check(`${site}: Digite o que ouviu errado mostra "Sua resposta"`, r.wrong && !!r.attempt, r);
    check(`${site}: só a letra errada/faltando marcada`, site === 'zh'
      ? r.attempt === 'nǐ h<span class="conj-x">a</span>o'
      : (r.attempt || '').replace('<span class="conj-gap"></span>', '') === 'allemand / alemande' && (r.attempt.match(/conj-gap/g) || []).length === 1 && !/conj-x/.test(r.attempt), r);
    const cor = await page.evaluate(() => { const x = document.querySelector('.typed-attempt .conj-x, .typed-attempt .conj-gap'); if (!x) return null; const s = getComputedStyle(x); return { color: s.color, border: s.borderBottomColor, fw: s.fontWeight }; });
    check(`${site}: CSS da marca carregado (vermelho de erro)`, cor && (/rgb\((2[0-9]{2}|1[5-9][0-9]), /.test(cor.color) || /rgb\((2[0-9]{2}|1[5-9][0-9]), /.test(cor.border)), cor);
    r = await montar(page, site, 'cloze');
    check(`${site}: lacuna digitada errada mostra "Sua resposta" com a última letra marcada`, r.wrong && r.attempt && /conj-x">x<\/span>$/.test(r.attempt), r);
    r = await montar(page, site, 'reorder');
    check(`${site}: Ordenar errado: bloco no lugar certo verde, os trocados vermelhos`, r.wrong && r.slots[0] === 'correct' && r.slots[1] === 'incorrect' && r.slots[2] === 'incorrect', r);
    // C5: o mp3 pré-gravado toca a 0,9.
    const rate = await page.evaluate(async (site) => {
      const key = Object.keys(AUDIO_MANIFEST)[0];
      window.__audioRates.length = 0;
      (site === 'zh' ? speakChineseAudioOnly : speakFrenchAudioOnly)(key, null, false);
      await new Promise(r => setTimeout(r, 50));
      return window.__audioRates.slice();
    }, site);
    check(`${site}: mp3 pré-gravado com playbackRate 0.9`, rate.length === 1 && Math.abs(rate[0].rate - 0.9) < 1e-6, rate);
    check(`${site}: 0 pageerrors (fora o esperado sem rede)`, errors.filter(e => !/createClient|Failed to fetch|NetworkError/.test(e)).length === 0, errors.slice(0, 3));
    await ctx.close();

    // Capturas: claro/escuro x 390/900 (painel de erro do digitar e do Ordenar).
    if (SHOTS){
      for (const theme of ['light', 'dark']) for (const width of [390, 900]){
        const o = await abrir(browser, port, site, { theme, width });
        await montar(o.page, site, 'vocab'); await captura(o.page, `${site}-${theme}-${width}-digitar`);
        await montar(o.page, site, 'reorder'); await captura(o.page, `${site}-${theme}-${width}-ordenar`);
        if (width === 390){ await montar(o.page, site, 'cloze'); await captura(o.page, `${site}-${theme}-${width}-lacuna`); }
        const largura = await o.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
        check(`${site} ${theme} ${width}px: sem rolagem horizontal`, largura);
        await o.ctx.close();
      }
    }
  }
  // D6: site em inglês do zh, selo de unidade pulada e pts sem português nem chinês fixo.
  {
    const { ctx, page } = await abrir(browser, port, 'zh', { lang: 'en' });
    const d = await page.evaluate(() => {
      unitBlockState = () => 'skipped';
      const html = buildUnitBlock(UNITS[0]).outerHTML;
      return { badge: (html.match(/ub-badge-skipped[^>]*>([^<]*)</) || [])[1], pts: t('review.speed.points', { n: 7 }), lang: typeof getUiLanguage === 'function' ? getUiLanguage() : null };
    });
    check('zh em inglês: selo de unidade pulada "⏭ Skipped"', d.badge === '⏭ Skipped', d);
    check('zh em inglês: pontos da Revisão rápida "7 pts"', d.pts === '7 pts', d);
    await ctx.close();
  }
  console.log(`Paridade da lição no navegador (fr, zh): ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
})();
