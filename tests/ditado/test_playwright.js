// Ditados (fr) -- Playwright (Chromium real). Fatia 1: campo de digitar e
// correção. Fatia 2: progresso por ditado (STATE.dictations, melhor nota,
// tentativas, palavras para revisar) e explicação do tipo de erro.
// Supabase do CDN trocado por um stub em memória; boot em modo convidado
// (saveState() não grava nada pra convidado, então a "recarga" é simulada
// com serializeState() -> JSON -> applySerializedState(), o mesmo caminho do
// save/load real).
// Rodar: node tests/ditado/test_playwright.js  (NODE_PATH e CHROMIUM_PATH opcionais)
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
    await page.fill('#dictation-input', "bonjour a tous ! Je m'appelle Sophie. J'ai 25 ans est je suis francaise virgule J'habite a Lyon. Et vous comment vous appelez vous");
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
    // Fatia 2: explicação do tipo de erro (et/est = homófono)
    check(`${tag}: troca et/est explicada como homófono`, r.notes.some(n => n.includes('soam parecido') && n.includes('verbo être')), r.notes);
    r = await ev(() => ({
      rec: STATE.dictations.d1,
      line: (document.querySelector('.dictation-record-line') || {}).textContent || '',
      review: (document.querySelector('.dictation-review-words') || {}).textContent || '',
    }));
    check(`${tag}: tentativa gravada em STATE.dictations`, r.rec && r.rec.attempts === 1 && r.rec.bestScore > 0 && r.rec.lastScore === r.rec.bestScore && typeof r.rec.lastAt === 'string', r.rec);
    check(`${tag}: resultado mostra "Melhor nota"`, r.line.includes('Melhor nota') && r.line.includes(String(r.rec.bestScore)), r.line);
    check(`${tag}: resultado mostra "Palavras para revisar"`, r.review.includes('Palavras para revisar') && r.rec.wrongWords.length > 0 && r.review.includes('et'), r.review);
    const best1 = r.rec.bestScore;
    // 2ª tentativa pior: bestScore não cai
    await ev(() => document.getElementById('dictation-retry-btn').click());
    await page.fill('#dictation-input', 'bonjour');
    await ev(() => document.getElementById('dictation-check-btn').click());
    r = await ev(() => STATE.dictations.d1);
    check(`${tag}: 2ª tentativa pior não reduz a melhor nota`, r.attempts === 2 && r.bestScore === best1 && r.lastScore < best1, r);
    // "recarga": serializa, zera e restaura (mesmo caminho do save/load)
    r = await ev(() => {
      const saved = JSON.parse(JSON.stringify(serializeState()));
      STATE.dictations = {};
      applySerializedState(saved);
      let oldOk = true;
      try { applySerializedState({ xp: STATE.xp }); } catch (e){ oldOk = false; } // save antigo sem o campo
      return { rec: STATE.dictations.d1, oldOk };
    });
    check(`${tag}: progresso do ditado sobrevive à recarga`, r.rec && r.rec.attempts === 2 && r.rec.bestScore === best1, r);
    check(`${tag}: save antigo sem "dictations" não quebra nem apaga`, r.oldOk && r.rec.attempts === 2, r);
    r = await ev(() => { renderDictationList(); const c = document.querySelector('.dictation-card[data-dict-id="d1"] .dictation-card-progress'); const o = document.querySelector('.dictation-card[data-dict-id="d2"] .dictation-card-progress'); return { t: c && c.textContent, other: !!o }; });
    check(`${tag}: lista mostra melhor nota e tentativas`, r.t && r.t.includes('Melhor nota: ' + best1) && r.t.includes('2 tentativas') && !r.other, r);
    await ev(() => openDictationPlayer('d1'));
    await page.fill('#dictation-input', "bonjour a tous ! Je m'appelle Sophie. J'ai 25 ans est je suis francaise virgule J'habite a Lyon. Et vous comment vous appelez vous");
    await ev(() => document.getElementById('dictation-check-btn').click());
    const inView = await ev(() => { const b = document.querySelector('.dictation-result').getBoundingClientRect(); return b.top < innerHeight; });
    check(`${tag}: resultado entra na tela depois de verificar`, inView);
    await page.waitForTimeout(400);
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/ditado-${vp.width}-${theme}.png`, fullPage: true });
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
