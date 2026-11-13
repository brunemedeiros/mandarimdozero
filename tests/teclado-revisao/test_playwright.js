// Teclado na Revisão da aluna (2026-11-05): Espaço/Enter mostram a resposta do cartão Normal; 1 a 4 avaliam pela POSIÇÃO do botão
// (4 botões: Errei, Difícil, Bom, Fácil; digitar com acerto em cheio: 1 Bom, 2 Fácil); múltipla escolha: 1 a 4 nas opções;
// Enter aciona o "Continuar". Espaço/Enter nunca avaliam. Tecla segurada e os primeiros 300 ms de cada cartão são ignorados.
// O Preview do editor e a tela escondida nunca respondem. Playwright (Chromium), fr + zh, convidado com Supabase stubado.
// Rodar: node tests/teclado-revisao/test_playwright.js
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
  const b = () => new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok);
    if (p === 'single' || p === 'maybeSingle') return () => Promise.resolve({ data: null, error: null }); return () => b(); } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: b, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function boot(browser, lang, port, opts){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, colorScheme: 'light', ...(opts || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { ctx, page, errors };
}

// Monta um cartão nativo do tipo pedido (mesmo caminho da Revisão: buildEngineCardsFromRow) e abre a tela da Revisão com ele.
async function openCard(page, kind, preview){
  await page.evaluate(({ kind, preview }) => {
    window.__grades = [];
    window.gradeCurrentCard = (g) => { window.__grades.push(g); };
    const zh = APP_KEY === 'mandarim';
    const fld = (id, l, v, extra) => Object.assign({ id, lang: l, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null }, extra || {});
    const ST = zh ? '你好' : 'bonjour', PY = 'nǐ hǎo', TR = 'bom dia', L = zh ? 'zh' : 'fr';
    const study = (extra) => zh ? [fld('h', 'zh', ST, Object.assign({ pinyinFieldId: 'p' }, extra || {})), fld('p', 'zh-pinyin', PY), fld('t', 'pt-BR', TR)] : [fld('s', L, ST, extra), fld('t', 'pt-BR', TR)];
    let fields, mode = kind;
    if (kind === 'normal') fields = study();
    else if (kind === 'multiple_choice') fields = zh
      ? [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'zh', ST, { role: 'answer', pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY), fld('d1', 'zh', '再见', { role: 'distractor' }), fld('d2', 'zh', '谢谢', { role: 'distractor' }), fld('d3', 'zh', '对不起', { role: 'distractor' })]
      : [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', L, ST, { role: 'answer' }), fld('d1', L, 'au revoir', { role: 'distractor' }), fld('d2', L, 'merci', { role: 'distractor' }), fld('d3', L, 'salut', { role: 'distractor' })];
    else if (kind === 'type_answer') fields = zh
      ? [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'zh', ST, { role: 'answer', pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY)]
      : [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', L, ST, { role: 'answer' })];
    const card = buildEngineCardsFromRow({ id: 900, language_app_key: APP_KEY, fields, card_generation_mode: mode, status: 'active', revision: 0 }, { origin: 'self', appKey: APP_KEY, idPrefix: 's' })[0];
    if (preview) card.__isPreviewCard = true;
    switchTab('review');
    document.getElementById('review-mode-select-wrap').style.display = 'none';
    document.getElementById('review-session-wrap').style.display = 'block';
    document.getElementById('review-content').style.display = 'block';
    STATE.reviewActiveMode = 'flashcard';
    STATE.reviewQueue = [card]; STATE.reviewIndex = 0; STATE.reviewCardState = null;
    renderReviewViewInner();
  }, { kind, preview: !!preview });
}
const grades = (page) => page.evaluate(() => window.__grades.slice());
const press = async (page, k) => { await page.keyboard.press(k); await wait(40); };
const SH = 350; // acima do atraso de 300 ms

async function suite(browser, lang, port){
  const L = lang.toUpperCase();
  const { ctx, page, errors } = await boot(browser, lang, port);

  // ---------- Cartão Normal ----------
  await openCard(page, 'normal');
  check(L + ' Normal: dica de teclado existe ao lado do "toque para revelar"', await page.evaluate(() => !!document.querySelector('.flashcard-hint .hint-kbd') && !!document.querySelector('.flashcard-hint .hint-touch')));
  check(L + ' Normal: com mouse e teclado só a dica do teclado aparece', await page.evaluate(() => getComputedStyle(document.querySelector('.hint-kbd')).display !== 'none' && getComputedStyle(document.querySelector('.hint-touch')).display === 'none'));
  await press(page, ' ');
  check(L + ' Normal: Espaço nos primeiros 300 ms é ignorado', await page.evaluate(() => !document.querySelector('.grade-btn')));
  await wait(SH);
  await press(page, '3');
  check(L + ' Normal: número antes de revelar não avalia', (await grades(page)).length === 0);
  await press(page, ' ');
  check(L + ' Normal: Espaço revela a resposta', await page.evaluate(() => document.querySelectorAll('.grade-btn').length === 4));
  check(L + ' Normal: Espaço não avalia', (await grades(page)).length === 0);
  const badges = await page.evaluate(() => [...document.querySelectorAll('.grade-btn .kbd-hint')].map(b => b.textContent));
  check(L + ' Normal revelado: números 1 a 4 nos botões', JSON.stringify(badges) === '["1","2","3","4"]', badges);
  check(L + ' Normal revelado: número visível (mouse e teclado)', await page.evaluate(() => getComputedStyle(document.querySelector('.grade-btn .kbd-hint')).display !== 'none'));
  const gl = await page.evaluate(() => [...document.querySelectorAll('.grade-btn')].map(b => { const r = b.getBoundingClientRect(), k = b.querySelector('.kbd-hint').getBoundingClientRect(); return { dentro: k.left >= r.left && k.right <= r.right, esquerda: k.left - r.left < 16, meio: Math.abs((k.top + k.bottom) / 2 - (r.top + r.bottom) / 2) < 2, posicao: getComputedStyle(b.querySelector('.kbd-hint')).position }; }));
  check(L + ' Normal revelado: quadrado do número à esquerda, dentro do botão, no meio da altura', gl.length === 4 && gl.every(g => g.dentro && g.esquerda && g.meio && g.posicao === 'absolute'), gl);
  await press(page, '3');
  check(L + ' Normal: número nos primeiros 300 ms depois de revelar é ignorado', (await grades(page)).length === 0);
  await wait(SH);
  await press(page, ' '); await press(page, 'Enter');
  check(L + ' Normal revelado: Espaço e Enter não avaliam', (await grades(page)).length === 0);
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', repeat: true, bubbles: true })));
  check(L + ' Normal: tecla segurada (repeat) é ignorada', (await grades(page)).length === 0);
  for (const k of ['1', '2', '3', '4']) await press(page, k);
  check(L + ' Normal: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil (graus 0, 1, 2, 3)', JSON.stringify(await grades(page)) === '[0,1,2,3]', await grades(page));
  await press(page, '5'); await press(page, 'ArrowRight'); await press(page, 'h');
  check(L + ' Normal: 5, seta e h não fazem nada', (await grades(page)).length === 4);

  // Enter também revela
  await openCard(page, 'normal'); await wait(SH);
  await press(page, 'Enter');
  check(L + ' Normal: Enter revela a resposta', await page.evaluate(() => document.querySelectorAll('.grade-btn').length === 4));

  // Tela escondida (saiu da Revisão): nenhuma tecla responde
  await wait(SH);
  await page.evaluate(() => switchTab('path'));
  await press(page, '3'); await press(page, ' ');
  check(L + ' Normal: com a Revisão escondida, as teclas não avaliam', (await grades(page)).length === 0);

  // Preview do editor nunca ganha atalhos
  await openCard(page, 'normal', true); await wait(SH);
  await press(page, ' '); await press(page, 'Enter');
  check(L + ' Preview: Espaço e Enter não revelam', await page.evaluate(() => !document.querySelector('.grade-btn')));
  check(L + ' Preview: sem mapa de teclas', await page.evaluate(() => KEYBOARD_OPTION_MAP === null && REVIEW_KEYS.reveal === null));

  // ---------- Digitar a resposta ----------
  await openCard(page, 'type_answer'); await wait(SH);
  const typed = lang === 'zh' ? 'nǐ hǎo' : 'bonjour';
  const solution = await page.evaluate(() => resolveCardContentView(STATE.reviewQueue[0]).compareAnswerText);
  await page.fill('#cloze-review-input', solution);
  await page.keyboard.press('Enter'); await wait(SH);
  check(L + ' Digitar certo: só Bom e Fácil', await page.evaluate(() => [...document.querySelectorAll('.typed-grade .grade-btn')].map(b => b.dataset.grade).join() === '2,3'));
  const tb = await page.evaluate(() => [...document.querySelectorAll('.typed-grade .grade-btn .kbd-hint')].map(b => b.textContent));
  check(L + ' Digitar certo: números 1 e 2 (pela posição)', JSON.stringify(tb) === '["1","2"]', tb);
  await press(page, '3'); await press(page, '4');
  check(L + ' Digitar certo: 3 e 4 não fazem nada', (await grades(page)).length === 0);
  await press(page, '1'); await press(page, '2');
  check(L + ' Digitar certo: 1 = Bom (grau 2), 2 = Fácil (grau 3)', JSON.stringify(await grades(page)) === '[2,3]', await grades(page));

  await openCard(page, 'type_answer'); await wait(SH);
  await page.fill('#cloze-review-input', 'xxxxxx');
  await page.keyboard.press('Enter'); await wait(SH);
  check(L + ' Digitar errado: aparece Continuar com a etiqueta Enter', await page.evaluate(() => !!document.querySelector('#cloze-continue-btn .key-enter-hint') && getComputedStyle(document.querySelector('.key-enter-hint')).display !== 'none'));
  await press(page, ' '); await press(page, '1');
  check(L + ' Digitar errado: Espaço e número não fazem nada', (await grades(page)).length === 0);
  await press(page, 'Enter');
  check(L + ' Digitar errado: Enter aciona o Continuar (nota automática Errei)', JSON.stringify(await grades(page)) === '[0]', await grades(page));

  // ---------- Múltipla escolha ----------
  await openCard(page, 'multiple_choice'); await wait(SH);
  const mb = await page.evaluate(() => [...document.querySelectorAll('.mc-option .kbd-hint')].map(b => b.textContent));
  check(L + ' Múltipla escolha: números 1 a 4 nas opções', JSON.stringify(mb) === '["1","2","3","4"]', mb);
  const mcl = await page.evaluate(() => [...document.querySelectorAll('.mc-option')].map(o => { const r = o.getBoundingClientRect(), k = o.querySelector('.kbd-hint').getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(o.childNodes[0]); const tr = t.getBoundingClientRect(); return { esquerda: k.left - r.left < 16, centro: Math.abs((tr.left + tr.right) / 2 - (r.left + r.right) / 2) < 2, alinha: getComputedStyle(o).textAlign }; }));
  check(L + ' Múltipla escolha: texto centralizado na opção e quadrado à esquerda', mcl.length === 4 && mcl.every(m => m.esquerda && m.centro && m.alinha === 'center'), mcl);
  await press(page, '2');
  check(L + ' Múltipla escolha: 2 escolhe a segunda opção', await page.evaluate(() => STATE.reviewCardState.answered === true && STATE.reviewCardState.selectedIndex === 1));
  check(L + ' Múltipla escolha: depois de responder aparece Continuar com Enter', await page.evaluate(() => !!document.querySelector('#mc-continue-btn .key-enter-hint')));
  await press(page, ' ');
  check(L + ' Múltipla escolha: Espaço no Continuar não faz nada', (await grades(page)).length === 0);
  await wait(SH);
  await press(page, 'Enter');
  check(L + ' Múltipla escolha: Enter continua (nota Errei ou Bom)', (await grades(page)).length === 1 && [0, 2].includes((await grades(page))[0]), await grades(page));

  // Celular (toque): sem números nem dica de teclado
  const m = await boot(browser, lang, port, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });
  await openCard(m.page, 'normal');
  check(L + ' celular: aparece o "toque para ver" e não a dica do teclado', await m.page.evaluate(() => getComputedStyle(document.querySelector('.hint-touch')).display !== 'none' && getComputedStyle(document.querySelector('.hint-kbd')).display === 'none'));
  await wait(SH); await m.page.evaluate(() => document.getElementById('flashcard').click());
  check(L + ' celular: sem números nos botões de nota', await m.page.evaluate(() => [...document.querySelectorAll('.grade-btn .kbd-hint')].every(b => getComputedStyle(b).display === 'none')));
  await openCard(m.page, 'multiple_choice'); await wait(SH);
  const mcm = await m.page.evaluate(() => [...document.querySelectorAll('.mc-option')].map(o => { const r = o.getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(o.childNodes[0]); const tr = t.getBoundingClientRect(); return { alinha: getComputedStyle(o).textAlign, centro: Math.abs((tr.left + tr.right) / 2 - (r.left + r.right) / 2) < 2, numero: getComputedStyle(o.querySelector('.kbd-hint')).display }; }));
  check(L + ' celular: múltipla escolha com texto centralizado e sem número', mcm.length === 4 && mcm.every(x => x.alinha === 'center' && x.centro && x.numero === 'none'), mcm);
  check(L + ' celular: sem rolagem horizontal', await m.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await m.ctx.close();

  check(L + ' sem erros de JS', errors.length === 0, errors);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { for (const lang of ['fr', 'zh']) await suite(browser, lang, port); }
  finally { await browser.close(); server.close(); }
  console.log(`\nteclado-revisao: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
