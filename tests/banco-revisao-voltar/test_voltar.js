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
  for (const [lang, theme, width] of [['fr', 'light', 390], ['fr', 'dark', 1200], ['zh', 'light', 1200], ['zh', 'dark', 390]]) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(`${lang}-${theme}-${width}: ${e.message}`));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
    const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
    const ev = (fn, a) => page.evaluate(fn, a);
    const shot = async (name) => { if (SHOTS){ await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png` }); } };
    await ev(([theme]) => {
      document.documentElement.setAttribute('data-theme', theme);
      saveState = async () => {}; CLASS_ACTIVE_TEACHER_ID = 'A'; window.__bankLog = [];
      logBankHomeStudy = (c, g) => window.__bankLog.push([c.rowId, g]);
    }, [theme]);
    await ev(([lang]) => {
      const target = lang, words = lang === 'fr' ? ['carte','pain','fromage','marché','maison','livre','chat','chien'] : ['卡片','面包','奶酪','市场','房子','书','猫','狗'];
      isCardLessonCompleted = () => true;
      words.forEach((w, i) => { const row = { id: 900 + i, teacher_id: 'A', student_id: 'S1', language_app_key: APP_KEY, status: 'active', revision: 0, note: i === 0 ? 'dica da professora' : '', tags: [], front: 'x', back_trans: 'y', card_generation_mode: 'normal', deck_id: null, fields: [
        { id: 'a', lang: 'pt', role: null, content: { value: 'palavra ' + (i + 1) }, audio: null, image: null, pinyinFieldId: null }, { id: 'b', lang: target, role: null, content: { value: w }, audio: null, image: null, pinyinFieldId: null }] };
        buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c)); });
      const past = Date.now() - 86400000;
      STATE.cards.filter(c => c.origin === 'teacher').forEach(c => Object.assign(c, { state: 'review', reps: 3, fsrsReps: 3, stability: 6, difficulty: 5, lastReview: past - 6 * 86400000, due: past, interval: 6 }));
      switchTab('review'); startClassReviewSession();
    }, [lang]);
    await page.waitForSelector('#review-content .review-progress', { timeout: 5000 });
    L('link do topo é "Sair"', await ev(() => document.getElementById('review-back-to-modes').textContent === t('review.exitSession') && /Sair|Exit/.test(t('review.exitSession'))));
    L('1º cartão: sem botão Voltar', await ev(() => !document.getElementById('review-prev-btn')));
    const xp0 = await ev(() => STATE.xp), q0 = await ev(() => STATE.reviewQueue.length);
    const first = await ev(() => STATE.reviewQueue[0].id);
    await ev(() => gradeCurrentCard(2));
    await page.waitForSelector('#review-prev-btn', { timeout: 3000 });
    L('2º cartão: botão Voltar com 44px, abaixo do cartão e na esquerda', await ev(() => { const b = document.getElementById('review-prev-btn').getBoundingClientRect(), c = document.querySelector('#review-content').getBoundingClientRect(); return b.height >= 44 && b.top >= c.bottom - 1 && b.left <= c.left + 16; }));
    await ev(() => document.querySelector('#review-content .review-card, #review-content .flashcard, #review-content [class*=card]').click());
    L('Voltar continua ali depois de virar o cartão', await ev(() => !!document.getElementById('review-prev-btn')));
    L('Bom deu 4 XP', await ev(() => STATE.xp) === xp0 + 4);
    const dueGood = await ev(() => STATE.reviewQueue[0].due);
    await shot('segundo-cartao');
    await page.click('#review-prev-btn');
    await page.waitForSelector('.review-peek', { timeout: 3000 });
    L('mostra o cartão anterior com a resposta e a observação', await ev(() => { const t0 = document.querySelector('.review-peek').textContent; return t0.includes('dica da professora') && !!document.querySelector('.review-peek .is-answer'); }));
    L('sem ⋯ de pedido no cartão anterior', await ev(() => !document.querySelector('.rq-open')));
    L('nota atual (Bom) marcada', await ev(() => document.querySelector('.review-peek [data-peek-grade="2"]').getAttribute('aria-pressed') === 'true'));
    L('sem rolagem lateral', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    L('botões de nota com 44px', await ev(() => [...document.querySelectorAll('[data-peek-grade]')].every(b => b.offsetHeight >= 44)));
    await shot('cartao-anterior');
    await page.click('[data-peek-grade="0"]');
    await page.waitForSelector('.review-peek', { timeout: 3000 });
    const r1 = await ev(() => ({ xp: STATE.xp, ql: STATE.reviewQueue.length, g: STATE.reviewHistory[0].grade, log: window.__bankLog.slice(), due: STATE.reviewHistory[0].card.due, reps: STATE.reviewHistory[0].card.reps }));
    L('Errei: XP volta ao que era e o cartão reaparece no fim da fila', r1.xp === xp0 && r1.ql === q0 + 1 && r1.g === 0, r1);
    L('Errei: agendamento refeito a partir do estado original (não 2x)', r1.due !== dueGood && r1.reps !== undefined, r1);
    L('Errei: enviado ao Banco como correção', r1.log.length === 2 && r1.log[1][1] === 0, r1.log);
    await page.click('[data-peek-grade="3"]');
    await page.waitForSelector('.review-peek', { timeout: 3000 });
    const r2 = await ev(() => ({ xp: STATE.xp, ql: STATE.reviewQueue.length, g: STATE.reviewHistory[0].grade }));
    L('Fácil: +8 XP no total e o reforço sai da fila', r2.xp === xp0 + 8 && r2.ql === q0 && r2.g === 3, r2);
    await page.click('[data-peek-grade="1"]');
    await page.waitForSelector('.review-peek', { timeout: 3000 });
    L('Difícil: +2 XP no total (XP desce de 8 para 2)', await ev(() => STATE.xp) === xp0 + 2);
    await page.click('#review-peek-newer');
    await page.waitForSelector('.review-progress-count', { timeout: 3000 });
    L('volta ao cartão atual (2 / N), sem refazer', await ev(() => STATE.reviewIndex === 1 && STATE.reviewPeek === null && document.querySelector('.review-progress-count').textContent.trim().startsWith('2 /')));
    // reforço de Errei: nota mais antiga fica travada
    await ev(() => gradeCurrentCard(0));
    await ev(() => { while (STATE.reviewIndex < STATE.reviewQueue.length - 1) gradeCurrentCard(2); });
    const lastIsRepeat = await ev(() => STATE.reviewQueue[STATE.reviewIndex] === STATE.reviewHistory[1].card);
    L('o Errei voltou como reforço no fim', lastIsRepeat);
    await ev(() => gradeCurrentCard(2));
    L('nota do Errei original fica travada quando o reforço já foi respondido', await ev(() => reviewEntryLocked(1) && !reviewEntryLocked(STATE.reviewHistory.length - 1)));
    // sessão acabou: Voltar não existe na tela final
    L('tela final sem Voltar', await ev(() => !document.getElementById('review-prev-btn')));
    // XP nunca negativo
    await ev(() => { STATE.reviewSessionClassReview = true; STATE.reviewHistory = [{ card: STATE.reviewQueue[0], snap: { stability: 6, difficulty: 5, state: 'review', reps: 3, due: 1, interval: 6 }, grade: 3, xp: 8, requeued: false, local: null }]; STATE.xp = 3; STATE.reviewIndex = 1; regradeReviewEntry(0, 0); });
    L('XP não passa de zero', await ev(() => STATE.xp >= 0 && STATE.periodXp.amount >= 0 && STATE.daily.xp >= 0));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passed}/${passed + failed} checks; pageerrors: ${errors.length}`); errors.forEach(e => console.log('  ' + e));
  process.exit(failed || errors.length ? 1 : 0);
})();
