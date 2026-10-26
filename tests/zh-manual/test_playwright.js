// "📖 Manual da unidade" do zh mostra SÓ o que a aluna já viu (pedido da dona, 2026-10-26; registro em
// docs/historico/32-manual-da-unidade-so-o-visto.md). Regra pura em shared/core/trilha-licao.js (unitSeenContent),
// lida do estado por unitSeenContentNow; o zh/app.js (renderUnitSummaryHTML) só desenha.
//  1. regra pura (Node, conteúdo real do zh): nada visto, lições concluídas, palavras introduzidas, diálogo, tudo.
//  2. navegador: unidade nova (frase "Ainda não tem nada aqui"), meio da 1ª lição (só as palavras introduzidas), lição
//     concluída, diálogo feito (e ainda não feito), unidade concluída, revisão de lição, site em inglês sem português.
//  3. capturas claro/escuro em 390 e 1200px (pasta SHOTS, ou o argumento 1).
// Rodar: node tests/zh-manual/test_playwright.js [pasta-das-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv[2] || process.env.SHOTS || '';
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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

// ---------- 1. regra pura, com o conteúdo de produção do zh
{
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'zh/content.js'), 'utf8').replace(/^const /mg, 'var '), ctx);
  const src = fs.readFileSync(path.join(ROOT, 'shared/core/trilha-licao.js'), 'utf8');
  const fn = src.slice(src.indexOf('function unitSeenContent('), src.indexOf('// Lê o estado do app'));
  vm.runInContext(fn, ctx);
  const ph = (w) => (p) => p.c.includes(w.c);
  const u1 = ctx.UNITS[0];
  const r0 = ctx.unitSeenContent(u1, { lessonsDone: 0, phraseHasWord: ph });
  check('regra: nada visto = nada', r0.vocabIdx.length === 0 && r0.phraseIdx.length === 0 && !r0.dialogue, r0);
  const r1 = ctx.unitSeenContent(u1, { lessonsDone: 0, introducedIdx: [0, 1], phraseHasWord: ph });
  check('regra: meio da 1ª lição = só as palavras introduzidas', r1.vocabIdx.join() === '0,1' && !r1.dialogue, r1);
  check('regra: frase só se contém palavra vista', r1.phraseIdx.every(pi => [0, 1].some(i => u1.phrases[pi].c.includes(u1.vocab[i].c))), r1);
  const r2 = ctx.unitSeenContent(u1, { lessonsDone: 1, phraseHasWord: ph });
  check('regra: 1ª lição concluída = as 3 palavras dela', r2.vocabIdx.join() === u1.lessons[0].vocabIdx.join() && !r2.dialogue, r2);
  const r3 = ctx.unitSeenContent(u1, { lessonsDone: 2, dialogueDone: true, phraseHasWord: ph });
  check('regra: passo do diálogo feito = diálogo entra', r3.dialogue, r3);
  const r4 = ctx.unitSeenContent(u1, { lessonsDone: 3, phraseHasWord: ph });
  check('regra: lição com diálogo concluída = diálogo entra, todas as palavras', r4.dialogue && r4.vocabIdx.length === u1.vocab.length, r4);
  check('regra: frase que só aparece no Ponto de verificação ainda não entra', r4.phraseIdx.length < u1.phrases.length, r4);
  const r5 = ctx.unitSeenContent(u1, { all: true });
  check('regra: unidade concluída = tudo', r5.vocabIdx.length === u1.vocab.length && r5.phraseIdx.length === u1.phrases.length && r5.dialogue, r5);
  const r6 = ctx.unitSeenContent(u1, { lessonsDone: 0, extraWordIdx: [5, 99, -1] });
  check('regra: palavra com evidência entra; índice inválido não', r6.vocabIdx.join() === '5', r6);
  // todas as unidades: a soma das lições concluídas cobre o vocabulário inteiro (nenhuma palavra fica de fora no fim)
  const gaps = [...ctx.UNITS].filter(u => Array.isArray(u.lessons) && u.lessons.length).filter(u => ctx.unitSeenContent(u, { lessonsDone: u.lessons.length }).vocabIdx.length !== u.vocab.length).map(u => u.id);
  check('regra: em toda unidade, todas as lições concluídas = todo o vocabulário', gaps.length === 0, gaps);
}

async function openZh(browser, { theme = 'light', lang = 'pt-BR', width = 390 } = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(({ th, lg }) => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lg); localStorage.setItem('theme', th); localStorage.setItem('mandarim_trail_view', 'list'); } catch (e) {}
  }, { th: theme, lg: lang });
  await page.goto(`http://127.0.0.1:${server.address().port}/zh/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate((th) => { document.documentElement.setAttribute('data-theme', th); window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; switchTab('path'); }, theme);
  await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
  return { ctx, page, errors };
}

// Abre o manual pelo próprio botão e devolve o que ficou no modal.
const READ = () => {
  document.getElementById('unit-manual-btn').click();
  const body = document.getElementById('unit-manual-body');
  const labels = [...body.querySelectorAll('.section-label')].map(e => e.textContent.trim());
  const r = { labels, vocab: [...body.querySelectorAll('.vocab-row .hanzi')].map(e => e.childNodes[0].textContent.trim()),
    phrases: [...body.querySelectorAll('.phrase-item .hanzi')].map(e => e.childNodes[0].textContent.trim()),
    dialogue: body.querySelectorAll('.dialogue-line').length, empty: (body.querySelector('.unit-manual-empty') || {}).textContent || '',
    text: document.getElementById('unit-manual-modal').innerText, shown: document.getElementById('unit-manual-modal').style.display };
  return r;
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  {
    const { ctx, page, errors } = await openZh(browser);
    const U = await page.evaluate(() => { const u = UNITS[0]; return { vocab: u.vocab.map(v => v.c), phrases: u.phrases.map(p => p.c), lines: u.dialogue.lines.length, lessons: u.lessons.map(l => l.vocabIdx) }; });

    // a) unidade nova, nada visto
    const a = await page.evaluate((READ) => { STATE.currentUnitId = 1; const r = (0, eval)('(' + READ + ')')(); return r; }, READ.toString());
    check('nova: modal abre', a.shown === 'flex', a.shown);
    check('nova: nenhum título de seção', a.labels.length === 0, a.labels);
    check('nova: frase de manual vazio', a.empty === 'Ainda não tem nada aqui: o manual vai sendo preenchido conforme você avança na unidade.', a.empty);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());

    // b) meio da 1ª lição: abre a unidade (1º cartão na tela) e avança para o 2º cartão
    const b = await page.evaluate((READ) => {
      openUnitDetail(1);
      STEP_STATE.acq.introIdx = 1; renderStep();
      return (0, eval)('(' + READ + ')')();
    }, READ.toString());
    check('meio da lição: só as 2 palavras já apresentadas', b.vocab.join() === U.vocab.slice(0, 2).join(), b.vocab);
    check('meio da lição: frases só com palavra vista', b.phrases.every(p => U.vocab.slice(0, 2).some(w => p.includes(w))), b.phrases);
    check('meio da lição: sem diálogo e sem título vazio', b.dialogue === 0 && !b.labels.some(l => /Diálogo/.test(l)) && b.labels.length === (b.phrases.length ? 2 : 1), b.labels);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());

    // c) 1ª lição concluída (fora da lição)
    const c = await page.evaluate((READ) => {
      exitToPath();
      STATE.unitProgress[1].lessonIdx = 1;
      STATE.currentUnitId = 1;
      STEP_STATE.acq = { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {}, lessonScore: { correct: 0, total: 0 }, xpAtLessonStart: STATE.xp };
      return (0, eval)('(' + READ + ')')();
    }, READ.toString());
    check('lição concluída: as palavras da 1ª lição', c.vocab.join() === U.lessons[0].map(i => U.vocab[i]).join(), c.vocab);
    check('lição concluída: sem diálogo', c.dialogue === 0, c);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());

    // d) lição do diálogo em andamento: no passo do diálogo ainda não entra; depois dele, entra
    const d = await page.evaluate((READ) => {
      const read = (0, eval)('(' + READ + ')');
      STATE.unitProgress[1].lessonIdx = 2;
      openUnitDetail(1);
      const defs = currentStepDefs(UNITS[0]);
      const di = defs.findIndex(s => s.key === 'dialogue');
      STEP_STATE.currentStep = di; renderStep();
      const during = read(); document.getElementById('unit-manual-close').click();
      STEP_STATE.currentStep = di + 1; renderStep();
      const after = read();
      return { during, after, keys: defs.map(s => s.key) };
    }, READ.toString());
    check('diálogo: no próprio passo do diálogo ainda não aparece', d.during.dialogue === 0, d.during);
    check('diálogo: depois do passo do diálogo aparece inteiro', d.after.dialogue === U.lines && d.after.labels.some(l => /Diálogo/.test(l)), d.after.labels);
    check('diálogo: palavras das 2 lições concluídas + as da lição atual já apresentadas', U.lessons[0].concat(U.lessons[1]).every(i => d.after.vocab.includes(U.vocab[i])), d.after.vocab);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());

    // e) unidade concluída: tudo
    const e = await page.evaluate((READ) => {
      exitToPath();
      STATE.unitProgress[1].completed = true; STATE.unitProgress[1].lessonIdx = 0; STATE.currentUnitId = 1;
      return (0, eval)('(' + READ + ')')();
    }, READ.toString());
    check('concluída: todo o vocabulário, todas as frases e o diálogo', e.vocab.length === U.vocab.length && e.phrases.length === U.phrases.length && e.dialogue === U.lines && e.labels.length === 3, e);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());

    // f) revisão de lição (unidade 2 ainda em andamento): mostra tudo
    const f = await page.evaluate((READ) => {
      STATE.unitProgress[2] = Object.assign(STATE.unitProgress[2] || {}, { unlocked: true, started: true, lessonIdx: 1, completed: false });
      STATE.currentUnitId = 2; STEP_STATE.lessonReview = { unitId: 2, reviewIdx: 0 };
      const r = (0, eval)('(' + READ + ')')();
      STEP_STATE.lessonReview = null;
      return Object.assign(r, { n: UNITS[1].vocab.length });
    }, READ.toString());
    check('revisão de lição: mostra tudo', f.vocab.length === f.n && f.dialogue > 0, f);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());
    check('pt: sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }

  // g) site em inglês: frase vazia em inglês e nada em português no manual
  {
    const { ctx, page, errors } = await openZh(browser, { lang: 'en' });
    const a = await page.evaluate((READ) => { STATE.currentUnitId = 1; return (0, eval)('(' + READ + ')')(); }, READ.toString());
    check('en: frase de manual vazio em inglês', a.empty === 'Nothing here yet: the manual fills in as you work through the unit.', a.empty);
    await page.evaluate(() => document.getElementById('unit-manual-close').click());
    const b = await page.evaluate((READ) => { openUnitDetail(1); STEP_STATE.acq.introIdx = 1; renderStep(); return (0, eval)('(' + READ + ')')(); }, READ.toString());
    const PT = /[ãõçáéíóúâêô]|Vocabulário|Frases|Diálogo|Ainda|você|unidade/i;
    const latin = b.text.replace(/[　-鿿＀-￯]/g, ' ').replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/gi, ' ');
    check('en: manual no meio da lição em inglês, sem português', b.vocab.length === 2 && !PT.test(latin) && /Vocabulary/.test(b.text), latin.slice(0, 300));
    check('en: sem erro de página', errors.length === 0, errors);
    await ctx.close();
  }

  // h) capturas: meio da 1ª lição e unidade nova, claro/escuro, 390 e 1200
  if (SHOTS){
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const theme of ['light', 'dark']) for (const width of [390, 1200]) {
      const { ctx, page, errors } = await openZh(browser, { theme, width });
      const r = await page.evaluate((READ) => { STATE.currentUnitId = 1; return (0, eval)('(' + READ + ')')(); }, READ.toString());
      await page.screenshot({ path: path.join(SHOTS, `vazio-${theme}-${width}.png`) });
      await page.evaluate(() => document.getElementById('unit-manual-close').click());
      const m = await page.evaluate((READ) => { openUnitDetail(1); STEP_STATE.acq.introIdx = 1; renderStep(); const x = (0, eval)('(' + READ + ')')(); x.overflow = document.documentElement.scrollWidth - window.innerWidth; return x; }, READ.toString());
      await page.screenshot({ path: path.join(SHOTS, `meio-licao-${theme}-${width}.png`) });
      check(`[${theme} ${width}] sem rolagem horizontal`, m.overflow <= 0, m.overflow);
      check(`[${theme} ${width}] sem erro de página`, errors.length === 0 && r.empty, errors);
      await ctx.close();
    }
  }

  await browser.close(); server.close();
  console.log(`zh manual da unidade: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
