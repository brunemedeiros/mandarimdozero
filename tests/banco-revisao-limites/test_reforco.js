// Faixa "cartões da sua professora para hoje": Revisão (empilhada) e Estudo (ao lado do "Continue de onde parou"). fr e zh, claro e escuro, 1200 e 390.
// Rodar: node tests/banco-revisao/test_banner_professora.js   (SHOTS=dir para salvar prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), SHOTS = process.env.SHOTS || '';
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
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(lang + ': ' + e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
    const L = (n, c, x) => check(`${lang} ${n}`, c, x);
    await page.evaluate(() => {
      saveState = async () => {}; CLASS_ACTIVE_TEACHER_ID = 'A'; logBankHomeStudy = () => {}; isCardLessonCompleted = () => true;
      window.__answers = {};
      const t = APP_KEY === 'mandarim' ? 'zh' : 'fr';
      for (let i = 0; i < 6; i++) {
        const row = { id: 800 + i, teacher_id: 'A', student_id: 'S1', language_app_key: APP_KEY, status: 'active', revision: 0, note: '', tags: [], front: 'x', back_trans: 'y', card_generation_mode: 'type_answer', deck_id: null, fields: [
          { id: 'p', lang: 'pt', role: 'prompt', content: { value: 'Corrija ' + i }, audio: null, image: null, pinyinFieldId: null }, { id: 'q', lang: t, role: 'answer', content: { value: 'resposta ' + i }, audio: null, image: null, pinyinFieldId: null }] };
        buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c));
      }
      const orig = gradeCurrentCard;
      switchTab('review'); startClassReviewSession();
    });
    let n = 0, ended = false;
    for (; n < 40; n++) {
      await page.waitForTimeout(60);
      const st = await page.evaluate(() => ({ end: !!document.querySelector('.review-complete-actions'), input: !!document.querySelector('#cloze-review-input'), id: STATE.reviewQueue[STATE.reviewIndex] && STATE.reviewQueue[STATE.reviewIndex].id }));
      if (st.end) { ended = true; break; }
      if (!st.input) break;
      await page.evaluate(id => { window.__answers[id] = (window.__answers[id] || 0) + 1; }, st.id);
      await page.fill('#cloze-review-input', 'errado'); await page.click('#cloze-review-verify-btn'); await page.click('#cloze-continue-btn');
    }
    const r = await page.evaluate(() => ({ answers: window.__answers, queue: STATE.reviewQueue.length, req: Object.keys(STATE.reviewRequeued || {}).length }));
    const max = Math.max.apply(null, Object.values(r.answers));
    L('errando tudo, a sessão TERMINA (antes a fila crescia sem fim)', ended, { n, r });
    L('cada cartão aparece no máximo 2 vezes (a 1ª e um reforço)', max <= 2, r.answers);
    L('a fila final tem no máximo o dobro dos cartões', r.queue <= 12 && r.queue >= 6, r.queue);
    // Voltar: trocar para Errei um cartão que já teve o reforço não cria um 2º reforço
    const r2 = await page.evaluate(() => {
      STATE.reviewSessionClassReview = true; STATE.reviewRequeued = {};
      const card = STATE.reviewQueue[0];
      const snap = reviewCardSnapshot(card);
      STATE.reviewQueue = [card, STATE.reviewQueue[1], STATE.reviewQueue[2], STATE.reviewQueue[3], STATE.reviewQueue[4]];
      STATE.reviewIndex = 1; STATE.reviewRequeued[card.id] = true;
      STATE.reviewHistory = [{ card, snap, grade: 2, xp: 4, requeued: false, local: null }];
      const antes = STATE.reviewQueue.length; regradeReviewEntry(0, 0);
      return { antes, depois: STATE.reviewQueue.length };
    });
    L('Voltar: mudar para Errei um cartão que já teve reforço não cria outro', r2.antes === r2.depois, r2);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passed}/${passed + failed} checks; pageerrors: ${errors.length}`); errors.forEach(e => console.log('  ' + e));
  process.exit(failed || errors.length ? 1 : 0);
})();
