// Etapa 2 (migration 143) no navegador: a Revisão entrega à fila do Banco o que a aluna digitou (nota e Voltar).
// fr e zh. Rodar: node tests/banco-revisao-resposta-digitada/test_navegador.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const browser = await chromium.launch(); const errors = [];
  for (const lang of ['fr', 'zh']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(`${lang}: ${e.message}`));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
    const L = (n, c, x) => check(`${lang} ${n}`, c, x);
    const ev = (fn, a) => page.evaluate(fn, a);
    const target = lang === 'fr' ? 'fr' : 'zh';
    await ev(([target]) => {
      saveState = async () => {}; CLASS_ACTIVE_TEACHER_ID = 'A';
      window.__bankLog = [];
      logBankHomeStudy = (c, g, typed, opts) => window.__bankLog.push({ row: c.rowId, g, typed, text: opts && opts.typedText, fix: !!(opts && opts.correction) });
      const base = { teacher_id: 'A', student_id: 'S1', language_app_key: APP_KEY, status: 'active', revision: 0, note: '', tags: [], deck_id: 1 };
      const f = (id, l, role, v) => ({ id, lang: l, role, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
      [Object.assign({ id: 700, card_generation_mode: 'type_answer', fields: [f('p', 'pt', 'prompt', 'Corrija: Je n’ai besoin de payer.'), f('a', target, 'answer', 'Je n’ai pas besoin de payer.')] }, base),
       Object.assign({ id: 701, card_generation_mode: 'normal', fields: [f('a', 'pt', null, 'pão'), f('b', target, null, 'pain')] }, base)]
        .forEach(row => buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c)));
      startClassReviewSession();
    }, [target]);
    await page.waitForFunction(() => STATE.reviewSessionClassReview === true && STATE.reviewQueue.length > 0, null, { timeout: 5000 });
    // Cartão de digitar, resposta errada, nota automática (Errei)
    await ev(() => { STATE.reviewIndex = STATE.reviewQueue.findIndex(c => c.cardInstance.cardTypeId === 'type_answer'); STATE.reviewCardState = null; renderReviewView(); });
    await page.waitForSelector('#cloze-review-input', { timeout: 3000 });
    await page.fill('#cloze-review-input', 'Je n’ai besoin de payer.');
    await page.click('#cloze-review-verify-btn');
    await page.waitForTimeout(150);
    await ev(() => gradeCurrentCard(0));
    const log1 = await ev(() => window.__bankLog.slice());
    L('Errei num cartão de digitar: a fila recebe o texto digitado', log1.length === 1 && log1[0].row === 700 && log1[0].g === 0 && log1[0].typed === true && log1[0].text === 'Je n’ai besoin de payer.', log1);
    // Voltar e corrigir a nota: a correção também leva o texto daquele cartão
    await ev(() => { reviewGoBack(); regradeReviewEntry(STATE.reviewPeek, 2); STATE.reviewPeek = null; });
    const log2 = await ev(() => window.__bankLog.slice());
    L('Voltar e corrigir: a correção leva o texto do cartão (a fila decide se guarda)', log2.length === 2 && log2[1].fix && log2[1].row === 700 && log2[1].g === 2 && log2[1].text === 'Je n’ai besoin de payer.', log2);
    // Cartão Normal (de virar): não é de digitar
    await ev(() => { STATE.reviewIndex = STATE.reviewQueue.findIndex(c => c.cardInstance.cardTypeId === 'normal'); STATE.reviewCardState = null; renderReviewView(); gradeCurrentCard(0); });
    const log3 = await ev(() => window.__bankLog.slice(-1)[0]);
    L('cartão Normal: vai como não digitado', log3 && log3.row === 701 && log3.typed === false, log3);
    await ctx.close();
  }
  await browser.close(); server.close();
  if (errors.length) console.log('pageerrors:', errors.slice(0, 5));
  check('sem erros de página', errors.length === 0, errors);
  console.log(`resposta digitada (navegador): ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
