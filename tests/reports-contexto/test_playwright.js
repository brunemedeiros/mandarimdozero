// Contexto automático do report (bandeira ⚑): cada tela grava só o que é dela.
// Caso real: report 37 (2026-10-24), cartão da professora "Digite a resposta" em #/review/class chegou com a lição
// da trilha (onde a aluna tinha parado) e SEM o texto do cartão. fr e zh.
// Rodar: node tests/reports-contexto/test_playwright.js
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
const TRAIL_KEYS = ['level', 'unit_id', 'unit_title', 'module_id', 'module_title', 'lesson_id', 'lesson_title', 'exercise_format', 'exercise_position'];
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
    await ev(() => { saveState = async () => {}; CLASS_ACTIVE_TEACHER_ID = 'A'; STATE.currentUnitId = UNITS[0].id; });

    // 1) Na aba Estudo, o contexto da trilha continua vindo.
    await ev(() => switchTab('path'));
    await page.waitForTimeout(200);
    const onPath = await ev(() => captureReportContext({ source: 'menu' }));
    L('Estudo: tela = path e unidade/lição da trilha presentes', onPath.screen === 'path' && onPath.unit_id != null && !!onPath.lesson_id, onPath);

    // 2) Cartões da professora: 3 tipos (Digite a resposta = o caso real, Cloze, Normal).
    const target = lang === 'fr' ? 'fr' : 'zh';
    await ev(([target]) => {
      const base = { teacher_id: 'A', student_id: 'S1', language_app_key: APP_KEY, status: 'active', revision: 0, note: 'obs', tags: [], deck_id: 341 };
      const f = (id, l, role, v) => ({ id, lang: l, role, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
      const rows = [
        Object.assign({ id: 628, card_generation_mode: 'type_answer', fields: [f('p', 'pt', 'prompt', 'Corrija: Je n’ai besoin de payer.'), f('a', target, 'answer', 'Je n’ai pas eu besoin de payer.')] }, base),
        Object.assign({ id: 629, card_generation_mode: 'cloze', fields: [f('t', target, null, 'Je {{c1::mange}} une pomme.'), f('tr', 'pt', null, 'Eu como uma maçã.')] }, base),
        Object.assign({ id: 630, card_generation_mode: 'normal', fields: [f('a', 'pt', null, 'pão'), f('b', target, null, 'pain')] }, base),
      ];
      rows.forEach(row => buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c)));
    }, [target]);
    await ev(() => startClassReviewSession());
    await page.waitForFunction(() => STATE.reviewSessionClassReview === true && STATE.reviewQueue.length > 0, null, { timeout: 5000 });
    const byType = await ev(() => {
      const out = {};
      STATE.reviewQueue.forEach((c, i) => { STATE.reviewIndex = i; out[c.cardInstance.cardTypeId] = captureReportContext({ source: 'exercise' }); });
      return out;
    });
    const ta = byType.type_answer, cz = byType.cloze, nm = byType.normal;
    L('os 3 tipos estão na fila', !!ta && !!cz && !!nm, Object.keys(byType));
    for (const [nome, c] of [['Digite a resposta', ta], ['Cloze', cz], ['Normal', nm]]) {
      if (!c) continue;
      L(`${nome}: nenhum campo da trilha (lição onde a aluna parou) no report da Revisão`, TRAIL_KEYS.every(k => !(k in c)), TRAIL_KEYS.filter(k => k in c));
      L(`${nome}: tela review, sessão da professora, posição`, c.screen === 'review' && c.review_scope === 'class' && /^\d+\/\d+$/.test(c.review_position || ''), c);
      L(`${nome}: identidade do cartão (origem, linha, deck, tipo)`, c.review_card_origin === 'teacher' && [628, 629, 630].includes(c.review_card_row_id) && c.review_card_deck_id === 341 && !!c.review_card_type, c);
    }
    L('Digite a resposta: frente e resposta gravadas (o que faltou no report 37)', ta && ta.review_card_front === 'Corrija: Je n’ai besoin de payer.' && ta.review_card_snippet === 'Je n’ai pas eu besoin de payer.', ta);
    L('Cloze: frase com a lacuna preenchida e a resposta', cz && cz.review_card_front === 'Je mange une pomme.' && cz.review_card_snippet === 'mange', cz);
    L('Normal: frente e verso', nm && !!nm.review_card_front && !!nm.review_card_snippet, nm);

    // 3) Voltou para o Estudo: nada da Revisão vaza, e a trilha volta.
    await ev(() => { STATE.reviewSessionClassReview = false; switchTab('path'); });
    await page.waitForTimeout(200);
    const back = await ev(() => captureReportContext({ source: 'menu' }));
    L('de volta ao Estudo: sem campos da Revisão, com a trilha', !Object.keys(back).some(k => k.startsWith('review_')) && back.unit_id != null, back);

    // 4) Outra aba (Perfil): nem trilha, nem Revisão.
    await ev(() => switchTab('profile'));
    await page.waitForTimeout(200);
    const prof = await ev(() => captureReportContext({ source: 'menu' }));
    L('Perfil: só a tela, sem trilha', prof.screen === 'profile' && TRAIL_KEYS.every(k => !(k in prof)), prof);
    await ctx.close();
  }
  await browser.close(); server.close();
  if (errors.length) console.log('pageerrors:', errors.slice(0, 5));
  check('sem erros de página', errors.length === 0, errors);
  console.log(`contexto do report: ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
