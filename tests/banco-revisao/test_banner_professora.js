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
  for (const [lang, theme, width] of [['fr', 'light', 1200], ['fr', 'light', 390], ['fr', 'dark', 1200], ['zh', 'light', 1200], ['zh', 'dark', 390]]) {
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
    await ev(([lang, theme]) => {
      document.documentElement.setAttribute('data-theme', theme);
      saveState = async () => {}; CLASS_ACTIVE_TEACHER_ID = 'A';
    }, [lang, theme]);
    // sem cartões da professora: nenhuma faixa
    await ev(() => { switchTab('review'); });
    await page.waitForTimeout(300);
    L('Revisão sem cartões da professora: nenhuma faixa', await ev(() => !document.getElementById('class-review-banner')));
    await ev(() => { switchTab('path'); });
    await page.waitForTimeout(300);
    L('Estudo sem cartões da professora: sem linha dupla e sem caixa extra', await ev(() => !document.querySelector('.trail-continue-row') && !document.querySelector('.tc-teacher')));
    // com 12 cartões da professora
    const n = await ev(([lang]) => {
      const target = lang === 'fr' ? 'fr' : 'zh', words = lang === 'fr' ? ['carte','pain','fromage','marché','maison','livre','chat','chien','eau','ville','rue','ami'] : ['卡片','面包','奶酪','市场','房子','书','猫','狗','水','城市','街','朋友'];
      isCardLessonCompleted = () => true;
      words.forEach((w, i) => { const row = { id: 900 + i, teacher_id: 'A', student_id: 'S1', language_app_key: APP_KEY, status: 'active', revision: 0, note: '', tags: [], front: 'x', back_trans: 'y', card_generation_mode: 'normal', deck_id: null, fields: [
        { id: 'a', lang: 'pt', role: null, content: { value: 'palavra ' + (i + 1) }, audio: null, image: null, pinyinFieldId: null }, { id: 'b', lang: target, role: null, content: { value: w }, audio: null, image: null, pinyinFieldId: null }] };
        buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c)); });
      switchTab('review'); return classReviewTodayCount();
    }, [lang]);
    await page.waitForTimeout(300);
    L('há cartões da professora para hoje', n >= 1, n);
    const rv = await ev(() => { const b = document.getElementById('class-review-banner'), w = document.getElementById('review-today-widget'); return { has: !!b, txt: b ? b.textContent : '', before: !!b && !!(b.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING), btn: b ? b.querySelector('.crb-cta').offsetHeight : 0, ov: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    L('Revisão: faixa com o número certo, acima do resumo, botão de 44px, sem rolagem lateral', rv.has && rv.txt.includes(String(n)) && rv.before && rv.btn >= 44 && rv.ov, rv);
    await shot('revisao');
    await page.click('#class-review-banner .crb-cta');
    await page.waitForFunction(() => STATE.reviewSessionClassReview === true, null, { timeout: 5000 });
    L('Revisão: "Revisar agora" abre a sessão só com cartões da professora', await ev(() => STATE.reviewQueue.length > 0 && STATE.reviewQueue.every(c => c.origin === 'teacher')));
    await ev(() => { STATE.reviewSessionClassReview = false; switchTab('path'); });
    await page.waitForTimeout(400);
    const tr = await ev(() => { const row = document.querySelector('.trail-continue-row'); if (!row) return null; const [a, b] = [...row.children].map(e => e.getBoundingClientRect()); return { kids: row.children.length, sameRow: Math.abs(a.top - b.top) < 4, stacked: b.top >= a.bottom - 1, txt: row.textContent, ov: document.documentElement.scrollWidth <= window.innerWidth + 1, btn: row.querySelector('.tc-teacher .tc-cta').offsetHeight }; });
    L('Estudo: "Continue de onde parou" e a faixa da professora na mesma linha (celular: uma abaixo da outra)', tr && tr.kids === 2 && (width >= 900 ? tr.sameRow : tr.stacked), tr);
    L('Estudo: faixa com o número certo, botão de 44px, sem rolagem lateral', tr && tr.txt.includes(String(n)) && tr.btn >= 44 && tr.ov, tr);
    await shot('estudo');
    await page.click('.trail-continue-row .tc-teacher .tc-cta');
    await page.waitForFunction(() => STATE.reviewSessionClassReview === true, null, { timeout: 5000 });
    L('Estudo: "Revisar agora" abre a sessão da professora', await ev(() => STATE.reviewQueue.length > 0 && STATE.reviewQueue.every(c => c.origin === 'teacher')));
    await ctx.close();
  }
  await browser.close(); server.close();
  if (errors.length) console.log('pageerrors:', errors.slice(0, 5));
  check('sem erros de página', errors.length === 0, errors);
  console.log(`faixa da professora (navegador): ${passed}/${passed + failed} verificações${failed ? ' — ' + failed + ' FALHAS' : ' — OK'}`);
  process.exit(failed ? 1 : 0);
})();
