// Paridade C6 no navegador: o zh (que hoje não tem unidade de gramática nem cenário) consegue ABRIR uma unidade
// type:"grammar" e montar/desenhar um exercício de cenário, com pinyin e a voz do zh. O conteúdo é FALSO, injetado na
// página (zh/content.js não muda). Também confere que o fr segue abrindo a unidade de gramática real (A1-g1).
// Rodar: node tests/paridade-sites/test_gramatica_cenario_zh_playwright.js [pasta-para-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };

// Unidade de gramática e frases com cenário FALSAS (só nesta página de teste).
const FAKE = () => {
  const unit = { id: 'ZZ-g1', type: 'grammar', title: 'O verbo 是', goal: 'Usar 是 para dizer quem você é.', grammar: {
    blocks: [
      { title: 'O verbo 是', body: '是 liga duas coisas: "eu sou estudante".', examples: [{ c: '我是学生。', p: 'Wǒ shì xuésheng.', t: 'Eu sou estudante.' }, { c: '她是老师。', p: 'Tā shì lǎoshī.', t: 'Ela é professora.' }] },
      { title: 'Muito bem! 🎉', body: 'Resumo:', examples: [], wrapup: true, table: { '是 (shì)': [{ pronoun: '我', form: '是' }, { pronoun: '你', form: '是' }, { pronoun: '他 / 她', form: '是' }] } }],
    exercises: [{ prompt: '我___学生。', hint: 'ser (pinyin)', answer: 'shì' }, { prompt: '你___老师吗？', hint: 'ser (pinyin)', answer: 'shì' }, { prompt: '他___中国人。', hint: 'ser (hanzi)', answer: '是' }] } };
  UNITS.push(unit);
  STATE.unitProgress[unit.id] = { started: false, completed: false };
  // Cenário: 4 frases da Unidade 1 ganham situação + emoji (só em memória).
  const u1 = UNITS[0];
  const comBlocos = u1.phrases.filter(p => p.blocks && p.blocks.length >= 2);
  const situacoes = [['Você conhece alguém e quer se apresentar.', '🇧🇷'], ['Um amigo te ajuda. Como você agradece?', '🤝'], ['Você vai embora da festa.', '👋'], ['Você quer saber o nome da pessoa.', '🙂']];
  comBlocos.slice(0, 4).forEach((p, i) => { p.scenario = situacoes[i][0]; p.scenarioEmoji = situacoes[i][1]; });
  return { gramId: unit.id, u1Id: u1.id, n: comBlocos.length };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {} Math.random = (() => { let s = 4242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); }, theme);
    await page.goto(`http://127.0.0.1:${port}/zh/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important}' });
    const info = await page.evaluate(`(${FAKE.toString()})()`);
    // Espia a voz do zh (sem tocar som de verdade).
    await page.evaluate(() => { window.__falas = []; speakChinese = (txt) => { window.__falas.push(txt); }; speakChineseAudioOnly = (txt) => { window.__falas.push(txt); };
      showStreakCelebration = () => {}; }); // a comemoração da sequência (fora do escopo) cobriria a tela
    const shot = async (name) => { if (!SHOTS) return; await page.waitForTimeout(200); await page.screenshot({ path: path.join(SHOTS, `zh-${theme}-390-${name}.png`), fullPage: true }); };
    const tag = `zh ${theme}:`;

    // ---- Unidade de gramática
    await page.evaluate((id) => { switchTab('path'); openUnitDetail(id); }, info.gramId);
    const g1 = await page.evaluate(() => ({ eyebrow: document.getElementById('ud-eyebrow').textContent, counter: document.querySelector('.gram-block-counter')?.textContent,
      hanzi: document.querySelector('.gram-block-example .hanzi')?.textContent.trim(), pinyin: document.querySelector('.gram-block-example .pinyin')?.textContent.trim(),
      next: document.getElementById('step-next-btn').textContent, back: getComputedStyle(document.getElementById('step-back-btn')).display,
      manual: getComputedStyle(document.getElementById('unit-manual-btn')).display }));
    check(`${tag} sem "Manual da unidade" na unidade de gramática`, g1.manual === 'none', g1);
    check(`${tag} unidade de gramática abre na explicação`, /Gramática/.test(g1.eyebrow) && g1.counter === 'Passo 1 de 2', g1);
    check(`${tag} exemplo com hanzi e pinyin`, g1.hanzi && g1.hanzi.startsWith('我是学生。') && g1.pinyin === 'Wǒ shì xuésheng.', g1);
    check(`${tag} sem "Voltar" no 1º bloco`, g1.back === 'none', g1);
    await page.click('.gram-block-example .audio-btn');
    check(`${tag} botão de som usa a voz do zh`, (await page.evaluate(() => window.__falas)).includes('我是学生。'));
    await shot('gram-explicacao-1');
    await page.click('#step-next-btn');
    const g2 = await page.evaluate(() => { const h = document.querySelector('.gram-table-title'); const cs = h && getComputedStyle(h);
      return { counter: document.querySelector('.gram-block-counter')?.textContent, rows: document.querySelectorAll('.gram-table-row').length, bg: cs && cs.backgroundColor, color: cs && cs.color,
        brand: getComputedStyle(document.documentElement).getPropertyValue('--brand-fill').trim(), next: document.getElementById('step-next-btn').textContent,
        back: getComputedStyle(document.getElementById('step-back-btn')).display, fill: document.getElementById('step-progress-fill').style.width }; });
    check(`${tag} bloco final com tabela`, g2.counter === 'Passo 2 de 2' && g2.rows === 3 && /Ir para os exercícios/.test(g2.next), g2);
    check(`${tag} cabeçalho da tabela na cor da marca do zh com texto branco`, g2.bg === 'rgb(192, 35, 31)' && g2.color === 'rgb(255, 255, 255)', g2);
    check(`${tag} "Voltar" aparece no 2º bloco e a barra anda`, g2.back !== 'none' && parseFloat(g2.fill) > 0, g2);
    await shot('gram-explicacao-tabela');
    await page.click('#step-back-btn');
    check(`${tag} "Voltar" volta um bloco`, (await page.textContent('.gram-block-counter')) === 'Passo 1 de 2');
    await page.click('#step-next-btn'); await page.click('#step-next-btn');
    const e1 = await page.evaluate(() => ({ counter: document.querySelector('.conj-progress')?.textContent, picker: !!document.querySelector('.gram-exercise .pinyin-tone-picker'),
      bgEx: getComputedStyle(document.querySelector('.gram-exercise')).backgroundColor }));
    check(`${tag} exercício com teclado de tons`, e1.counter === 'Frase 1 de 3' && e1.picker, e1);
    check(`${tag} CSS do exercício carregado (fundo do quadro)`, e1.bgEx && e1.bgEx !== 'rgba(0, 0, 0, 0)', e1);
    await shot('gram-exercicio');
    // Teclado de tons escreve no campo: "sh" + "ì"
    await page.fill('#gram-exercise-input', 'sh');
    await page.evaluate(() => { const k = [...document.querySelectorAll('.gram-exercise .pinyin-tone-key')].find(b => b.textContent === 'ì'); k && k.click(); });
    check(`${tag} teclado de tons insere no campo`, (await page.inputValue('#gram-exercise-input')) === 'shì');
    await page.click('#gram-exercise-verify-btn');
    check(`${tag} "shì" certo`, await page.evaluate(() => document.querySelector('.gram-exercise').classList.contains('ok')));
    await shot('gram-exercicio-certo');
    await page.click('.btn-secondary.btn-block');
    await page.fill('#gram-exercise-input', 'shi');
    await page.click('#gram-exercise-verify-btn');
    const e2 = await page.evaluate(() => ({ almost: document.querySelector('.gram-exercise').classList.contains('almost'), exp: document.getElementById('gram-exercise-expected').textContent }));
    check(`${tag} tom faltando = "Quase"`, e2.almost && /Quase/.test(e2.exp), e2);
    await shot('gram-exercicio-quase');
    await page.click('.btn-secondary.btn-block');
    await page.fill('#gram-exercise-input', '不');
    await page.click('#gram-exercise-verify-btn');
    check(`${tag} hanzi errado = errou, mostra a resposta`, await page.evaluate(() => document.querySelector('.gram-exercise').classList.contains('wrong') && document.getElementById('gram-exercise-expected').textContent === '→ 是'));
    await shot('gram-exercicio-errado');
    await page.click('.btn-secondary.btn-block'); // ver resultado
    await page.waitForTimeout(300);
    const fim = await page.evaluate(() => ({ txt: document.getElementById('step-content').textContent.slice(0, 200), next: getComputedStyle(document.getElementById('step-next-btn')).display }));
    check(`${tag} tela de resultado no fim`, fim.next !== 'none' && fim.txt.length > 0, fim);
    await shot('gram-resultado');
    // "Continuar" fecha a unidade (nota 1,5 de 3 = 50%).
    await page.click('#step-next-btn');
    await page.waitForTimeout(400);
    const done = await page.evaluate((id) => ({ completed: !!STATE.unitProgress[id].completed, txt: document.getElementById('step-content').textContent.slice(0, 120) }), info.gramId);
    check(`${tag} concluir a unidade de gramática marca como concluída`, done.completed, done);

    // ---- Cenário
    // A conclusão da unidade abre a comemoração da sequência; fecha antes de seguir.
    await page.evaluate(() => document.querySelectorAll('.streak-modal-overlay').forEach(el => { el.style.display = 'none'; }));
    const sc = await page.evaluate((id) => {
      exitToPath();
      openUnitDetail(id);
      const u = UNITS.find(x => x.id === id);
      const set = buildExerciseSet(u);
      const scen = set.filter(e => e.format === 'scenario');
      const alvo = scen[0];
      STEP_STATE.exerciseList = [alvo]; STEP_STATE.exerciseIndex = 0; STEP_STATE.exerciseScore = 0;
      renderExerciseStep();
      return { manual: getComputedStyle(document.getElementById('unit-manual-btn')).display, n: scen.length, options: alvo && alvo.options.length, hint: buildExerciseHint(alvo, u),
        opts: [...document.querySelectorAll('.scenario-option')].map(b => ({ py: b.querySelector('.opt-pinyin-sentence')?.textContent, hz: b.querySelector('.opt-hanzi-sentence')?.textContent })),
        q: document.querySelector('.scenario-question')?.textContent, counter: document.querySelector('.exercise-counter')?.textContent,
        correctIdx: alvo ? alvo.options.indexOf(alvo.phrase) : -1, phrase: alvo && alvo.phrase.c };
    }, info.u1Id);
    check(`${tag} "Manual da unidade" volta numa unidade comum`, sc.manual !== 'none', sc.manual);
    check(`${tag} buildExerciseSet do zh monta exercício de cenário`, sc.n >= 1 && sc.options === 3, sc);
    check(`${tag} opções com pinyin e hanzi`, sc.opts.length === 3 && sc.opts.every(o => o.py && o.hz), sc);
    check(`${tag} pergunta, contador e dica do cenário`, !!sc.q && /Exercício 1 de 1/.test(sc.counter) && /Releia a situação/.test(sc.hint), sc);
    await shot('cenario');
    const wrongIdx = sc.correctIdx === 0 ? 1 : 0;
    await page.click(`.scenario-option[data-idx="${wrongIdx}"]`);
    await page.waitForTimeout(800);
    const painel = await page.evaluate(() => ({ html: document.getElementById('step-content').innerHTML, correct: !!document.querySelector('.scenario-option.correct'), incorrect: !!document.querySelector('.scenario-option.incorrect') }));
    check(`${tag} errar marca certa e errada`, painel.correct && painel.incorrect, painel.html.slice(0, 200));
    check(`${tag} painel mostra a resposta certa com hanzi e pinyin`, painel.html.includes('<strong>' + sc.phrase + '</strong>') && /class="pinyin">\(/.test(painel.html), sc.phrase);
    await page.evaluate(() => { window.__falas = []; const b = [...document.querySelectorAll('#step-content .feedback-correct-line .audio-btn')][0]; b && b.click(); });
    check(`${tag} som do painel usa a voz do zh`, (await page.evaluate(() => window.__falas)).length > 0);
    await shot('cenario-errado');
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(`${tag} sem rolagem horizontal em 390px`, !hscroll);
    const reais = errors.filter(e => !/ERR_TUNNEL|Failed to fetch|NetworkError/.test(e));
    check(`${tag} sem erro de página`, reais.length === 0, reais);
    await ctx.close();
  }

  // ---- fr: a unidade de gramática real continua abrindo
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.evaluate(() => { switchTab('path'); STATE.unitProgress['A1-g1'] = STATE.unitProgress['A1-g1'] || {}; openUnitDetail('A1-g1'); });
    for (let i = 0; i < 4; i++) await page.click('#step-next-btn');
    await page.fill('#gram-exercise-input', 'suis');
    await page.click('#gram-exercise-verify-btn');
    check('fr: A1-g1 abre, pagina a explicação e corrige o exercício', await page.evaluate(() => document.querySelector('.gram-exercise').classList.contains('ok')));
    const reais = errors.filter(e => !/ERR_TUNNEL|Failed to fetch|NetworkError/.test(e));
    check('fr: sem erro de página', reais.length === 0, reais);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passed}/${passed + failed} verificações passaram`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
