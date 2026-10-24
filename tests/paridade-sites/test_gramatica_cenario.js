// Paridade C6 (docs/auditoria-paridade-fr-zh.md): unidade de gramática e exercício de cenário em
// shared/core/gramatica-cenario.js. Prova que o fr devolve EXATAMENTE o mesmo resultado que o fr/app.js antigo
// (commit REF = main antes da mudança), com o conteúdo real do fr (base + camada pt-BR):
//  - explicação de cada bloco de cada unidade de gramática (HTML, botão, texto do botão);
//  - tabela de cada bloco que tem tabela;
//  - exercício de cada unidade (HTML) e veredito de várias respostas (certa, sem acento, separador trocado, alt,
//    errada): classe do quadro, texto "Quase!"/"→", pontuação, botão seguinte;
//  - tela de resultado no fim dos exercícios;
//  - exercício de cenário (HTML) para cada frase com cenário, e o painel de explicação dele;
//  - montagem dos exercícios (buildExerciseSet) de todas as unidades com a mesma semente do sorteio;
//  - dica do cenário.
// E confere o zh: carrega o core e os ganchos do zh, e roda unidade de gramática + cenário FALSOS (pinyin, tom).
// Rodar: node tests/paridade-sites/test_gramatica_cenario.js
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const REF = process.env.PARIDADE_C6_REF || '9b616494';
const gitShow = (f) => execFileSync('git', ['show', REF + ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const { load } = require(path.join(ROOT, 'scripts/lib/course-content.js'));

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

function declaracao(src, nome){
  const m = new RegExp('^(?:const|function) ' + nome + '\\b', 'm').exec(src);
  if (!m) throw new Error('declaração ' + nome + ' não encontrada');
  const resto = src.slice(m.index);
  const fim = /\n\}[^\n]*/.exec(resto);
  return resto.slice(0, fim.index + fim[0].length);
}

// DOM mínimo: elementos por id/seletor, com eventos, classes e o HTML escrito.
function fakeDom(){
  const els = {};
  const mk = (key) => {
    const handlers = {};
    const cls = new Set();
    return els[key] = {
      key, value: '', disabled: false, style: {}, textContent: '', innerHTML: '', className: '', dataset: {}, children: [],
      classList: { add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), contains: (c) => cls.has(c), list: () => [...cls].sort() },
      addEventListener: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); },
      click(){ (handlers.click || []).forEach(f => f({})); },
      focus(){}, appendChild(c){ this.children.push(c); }, querySelector: (s) => els[s] || mk(s), querySelectorAll: () => [],
    };
  };
  const document = { getElementById: (id) => els['#' + id] || mk('#' + id), createElement: (tag) => mk('new:' + tag + ':' + Object.keys(els).length) };
  return { els, mk, document };
}

const coreEstado = read('shared/core/estado-trilha-desafios.js');
const COMUM = [declaracao(coreEstado, 'shuffle')].join('\n');

function ctxBase(){
  const dom = fakeDom();
  const log = [];
  const ctx = {
    console, document: dom.document, __dom: dom, __log: log,
    t: (k, p) => k + (p ? JSON.stringify(p) : ''),
    audioBtnHTML: (s) => `<button class="audio-btn" data-text="${s}">🔊</button>`,
    wireAudioButtons(){}, wireKeyboardOptions(){}, wireDontKnowButton(){}, renderStepProgress(){},
    playFeedbackSound: (ok) => log.push('som:' + ok),
    renderLessonCompleteScreen: (u, l, o) => log.push('fim:' + u.id + ':' + JSON.stringify(o)),
    buildConsolidationVocabExercises: () => [], reorderDistractorCount: () => 0, buildReorderDistractors: () => [],
    findMatchingPhrase: () => null, noteOrConceptReviewHTML: () => '', clozeFeedbackDetailHTML: () => 'CLOZE',
    trueFalseHint: () => 'TF', maskWordInText: (a) => a,
  };
  vm.createContext(ctx);
  vm.runInContext(COMUM, ctx);
  return ctx;
}
// O app.js do fr declara STATE/STEP_STATE/UNITS com const; aqui são globais simples, iguais nos dois lados.
function estado(ctx, UNITS){
  vm.runInContext('var STATE = { currentUnitId: null, xp: 0 }; var STEP_STATE = { explanationIndex: 0, gramExerciseIndex: 0, gramExerciseScore: 0, exerciseIndex: 0, exerciseScore: 0, exerciseList: [], checkpointXpAtStart: null, conceptsShown: new Set() };', ctx);
  ctx.UNITS = UNITS;
}

const frUnits = load('fr').UNITS;
const gramUnits = frUnits.filter(u => u.type === 'grammar');
check('fr tem unidades de gramática', gramUnits.length >= 5, gramUnits.length);

// ---------------------------------------------------------------- fr: antigo x novo
const antigoSrc = gitShow('fr/app.js');
// paridade 5d: answerExplanationHTML, buildExerciseHint e buildExerciseSet são comuns (shared/core/licao-exercicios.js)
const novoSrc = read('fr/app.js') + '\n' + require('../e4/app-source.js').coreText();
const latina = read('shared/core/familias/latina.js');
const LATINA_FR = "let _latinaFr = null; function latinaFr(){ return _latinaFr || (_latinaFr = FamiliaLatina.criar(LANG_HOOKS.familiaLatina)); }";

function ctxAntigo(){
  const ctx = ctxBase();
  vm.runInContext(latina + '\n' + gitShow('fr/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS') + '\n' + LATINA_FR, ctx);
  estado(ctx, frUnits);
  const nomes = ['SCENARIO_FLAG_SVG', 'scenarioSceneHTML', 'renderGramTableHTML', 'renderGrammarExplanationStep', 'renderGrammarExerciseStep',
    'renderScenarioExercise', 'answerExplanationHTML', 'buildExerciseHint', 'buildExerciseSet', 'getStepDefsGrammar'];
  vm.runInContext(nomes.map(n => declaracao(antigoSrc, n)).join('\n').replace('const SCENARIO_FLAG_SVG', 'var SCENARIO_FLAG_SVG'), ctx);
  return ctx;
}
function ctxNovo(site){
  const ctx = ctxBase();
  const hooks = read(site + '/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS');
  vm.runInContext((site === 'fr' ? latina + '\n' : '') + hooks + '\n' + (site === 'fr' ? LATINA_FR : ''), ctx);
  estado(ctx, site === 'fr' ? frUnits : []);
  vm.runInContext(read('shared/core/gramatica-cenario.js').replace('const SCENARIO_FLAG_SVG', 'var SCENARIO_FLAG_SVG'), ctx);
  if (site === 'fr') vm.runInContext(['answerExplanationHTML', 'buildExerciseHint', 'buildExerciseSet'].map(n => declaracao(novoSrc, n)).join('\n'), ctx);
  return ctx;
}
const A = ctxAntigo(), B = ctxNovo('fr');

// Explicação + tabela
{
  let n = 0, diff = [];
  for (const u of gramUnits) u.grammar.blocks.forEach((b, i) => {
    const r = [A, B].map(ctx => {
      ctx.STEP_STATE.explanationIndex = i;
      const content = ctx.__dom.mk('content'), next = ctx.__dom.mk('next');
      ctx.renderGrammarExplanationStep(u, content, next);
      return JSON.stringify([content.innerHTML, next.style.display, next.textContent]);
    });
    n++;
    if (r[0] !== r[1] && diff.length < 3) diff.push({ u: u.id, i, a: r[0].slice(0, 300), b: r[1].slice(0, 300) });
  });
  check(`fr: explicação igual ao antigo em ${n} blocos de ${gramUnits.length} unidades`, n > 15 && !diff.length, diff);
  const tabelas = gramUnits.flatMap(u => u.grammar.blocks.filter(b => b.table));
  const tdiff = tabelas.filter(b => A.renderGramTableHTML(b.table) !== B.renderGramTableHTML(b.table));
  check(`fr: tabela igual ao antigo em ${tabelas.length} tabelas`, tabelas.length >= 3 && !tdiff.length);
  console.log(`  fr: ${n} blocos de explicação e ${tabelas.length} tabelas comparados`);
}

// Exercícios de digitar
function respostas(ex){
  const a = ex.answer;
  const out = [a, a.toUpperCase(), a.normalize('NFD').replace(/[̀-ͯ]/g, ''), a.replace(/-/g, ' '), a.replace(/ /g, '-'),
    a.replace(/'/g, '’'), a + 'x', 'xyz', '', ' ' + a + ' ', ...(ex.alt || [])];
  return [...new Set(out)];
}
{
  let n = 0, diff = [];
  for (const u of gramUnits) u.grammar.exercises.forEach((ex, i) => {
    for (const typed of respostas(ex)) {
      const r = [A, B].map(ctx => {
        const dom = fakeDom(); ctx.document = dom.document; ctx.__dom = dom;
        vm.runInContext('STEP_STATE.gramExerciseIndex = ' + i + '; STEP_STATE.gramExerciseScore = 0;', ctx);
        const content = dom.mk('content'), next = dom.mk('next');
        ctx.__log.length = 0;
        ctx.renderGrammarExerciseStep(u, content, next);
        const html = content.innerHTML;
        dom.document.getElementById('gram-exercise-input').value = typed;
        dom.document.getElementById('gram-exercise-verify-btn').click();
        const wrap = dom.els['.gram-exercise'];
        return JSON.stringify([html, next.style.display, wrap.classList.list(), dom.els['#gram-exercise-expected'].textContent,
          ctx.STEP_STATE.gramExerciseScore, content.children.map(c => [c.className, c.textContent]), ctx.__log]);
      });
      n++;
      if (r[0] !== r[1] && diff.length < 3) diff.push({ u: u.id, i, typed, a: r[0].slice(0, 400), b: r[1].slice(0, 400) });
    }
  });
  check(`fr: exercício de gramática igual ao antigo em ${n} respostas`, n > 200 && !diff.length, diff);
  console.log(`  fr: ${n} respostas de exercício de gramática comparadas`);
  // Fim dos exercícios -> tela de resultado com a mesma nota
  const u = gramUnits[0];
  const fim = [A, B].map(ctx => { vm.runInContext(`STEP_STATE.gramExerciseIndex = ${u.grammar.exercises.length}; STEP_STATE.gramExerciseScore = 3.5;`, ctx); ctx.__log.length = 0; ctx.renderGrammarExerciseStep(u, ctx.__dom.mk('c'), ctx.__dom.mk('n')); return JSON.stringify(ctx.__log); });
  check('fr: tela de resultado no fim dos exercícios igual', fim[0] === fim[1] && /fim:/.test(fim[0]), fim);
}

// Cenário
{
  const comCenario = frUnits.filter(u => (u.phrases || []).filter(p => p.scenario).length >= 3);
  let n = 0, diff = [];
  for (const u of comCenario) {
    const sc = u.phrases.filter(p => p.scenario);
    sc.forEach((p, i) => {
      const ex = { format: 'scenario', phrase: p, options: [sc[(i + 1) % sc.length], p, sc[(i + 2) % sc.length]] };
      const r = [A, B].map(ctx => {
        const content = ctx.__dom.mk('content'), next = ctx.__dom.mk('next');
        ctx.STEP_STATE.exerciseIndex = 2; ctx.STATE.currentUnitId = u.id;
        ctx.renderScenarioExercise(ex, content, next, 9);
        return JSON.stringify([content.innerHTML, next.style.display, ctx.answerExplanationHTML(ex), ctx.buildExerciseHint(ex, u)]);
      });
      n++;
      if (r[0] !== r[1] && diff.length < 3) diff.push({ u: u.id, i, a: r[0].slice(0, 400), b: r[1].slice(0, 400) });
    });
  }
  check(`fr: cenário (tela, explicação, dica) igual ao antigo em ${n} frases de ${comCenario.length} unidades`, n >= 40 && !diff.length, diff);
  console.log(`  fr: ${n} exercícios de cenário comparados`);
  const flags = ['🇧🇷', '🇫🇷', '🇵🇹', '🎉', undefined].filter(e => A.scenarioSceneHTML(e) !== B.scenarioSceneHTML(e));
  check('fr: cena (bandeira em SVG ou emoji) igual', !flags.length, flags);
}

// Montagem dos exercícios (buildExerciseSet), mesma semente nos dois lados
{
  const semente = (ctx, s) => { let x = s; ctx.Math = Object.create(Math); ctx.Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647; };
  let n = 0, diff = [], cenarios = 0;
  for (const u of frUnits.filter(u => u.type !== 'grammar')) for (const s of [1, 7, 12345]) {
    const r = [A, B].map(ctx => {
      semente(ctx, s);
      vm.runInContext('var __set = buildExerciseSet(UNITS.find(x => x.id === ' + JSON.stringify(u.id) + '));', ctx);
      return JSON.stringify(ctx.__set.map(e => [e.format, e.mode, e.phrase && e.phrase.f, (e.options || []).map(o => o.f), (e.shuffledBlocks || []).map(b => b.f), e.blankIdx]));
    });
    n++;
    cenarios += (r[1].match(/"scenario"/g) || []).length;
    if (r[0] !== r[1] && diff.length < 2) diff.push({ u: u.id, s, a: r[0].slice(0, 300), b: r[1].slice(0, 300) });
  }
  check(`fr: buildExerciseSet igual ao antigo em ${n} montagens (${cenarios} exercícios de cenário sorteados)`, n > 50 && cenarios > 20 && !diff.length, diff);
  console.log(`  fr: ${n} montagens de exercícios comparadas, ${cenarios} cenários`);
}

// fr/app.js não tem mais as funções movidas
for (const nome of ['renderGramTableHTML', 'renderGrammarExplanationStep', 'renderGrammarExerciseStep', 'renderScenarioExercise', 'scenarioSceneHTML', 'getStepDefsGrammar']) {
  check(`fr/app.js sem ${nome} próprio`, !new RegExp('^function ' + nome + '\\(', 'm').test(read('fr/app.js')));
}
check('fr/app.js sem SCENARIO_FLAG_SVG próprio', !/^const SCENARIO_FLAG_SVG/m.test(read('fr/app.js')));

// ---------------------------------------------------------------- zh: unidade de gramática e cenário falsos
{
  const zhApp = read('zh/app.js');
  const ctx = ctxNovo('zh');
  // Funções do zh que os ganchos usam (as de verdade, do zh/app.js e do core).
  const zhFns = ['convertNumberedPinyinSyllable', 'pinyinToneVowelIndex', 'convertNumberedPinyin', 'normalizePinyinAnswer', 'pinyinAnswerCompareForm', 'pinyinWithoutTones', 'isToneOnlyMiss', 'phraseForExercise'];
  const extra = [];
  for (const f of zhFns) { try { extra.push(declaracao(zhApp, f)); } catch (e) { extra.push(declaracao(read('shared/core/quase-iguais-pinyin.js') + '\n' + coreEstado, f)); } }
  ['acceptedForms', 'acceptedFormsTyped', 'slashSpacing', 'typedVariants'].forEach(f => extra.push(declaracao(coreEstado, f)));
  // Constantes usadas por convertNumberedPinyin/pinyinWithoutTones, se houver.
  for (const m of zhApp.matchAll(/^const (PINYIN_TONE_MARKS)\s*=/gm)) extra.push(declaracao(zhApp, m[1]).replace(/^const /, 'var '));
  vm.runInContext(extra.join('\n'), ctx);
  vm.runInContext('function pinyinTonePickerHTML(){ return "<div class=\\"pinyin-tone-picker\\"></div>"; } function wirePinyinTonePicker(){ __log.push("tons ligados"); }', ctx);
  const unit = { id: 'ZZ-g1', type: 'grammar', title: 'Teste', grammar: {
    blocks: [{ title: 'O verbo 是', body: 'Liga duas coisas.', examples: [{ c: '我是学生。', p: 'Wǒ shì xuésheng.', t: 'Eu sou estudante.' }] },
      { title: 'Tabela', body: 'Resumo.', examples: [], table: { '是': [{ pronoun: '我', form: '是' }, { pronoun: '你', form: '是' }] }, wrapup: true }],
    exercises: [{ prompt: '我___学生。', hint: 'ser', answer: 'shì' }, { prompt: '你___老师。', answer: '是' }] } };
  ctx.UNITS = [unit];
  check('zh: getStepDefsGrammar = explicação + exercícios', JSON.stringify(ctx.getStepDefsGrammar().map(s => s.key)) === '["explanation","gramExercises"]');
  const content = ctx.__dom.mk('content'), next = ctx.__dom.mk('next');
  ctx.STEP_STATE.explanationIndex = 0;
  ctx.renderGrammarExplanationStep(unit, content, next);
  check('zh: exemplo da explicação com hanzi, som e pinyin', /class="hanzi">我是学生。 <button class="audio-btn" data-text="我是学生。">/.test(content.innerHTML) && /class="pinyin">Wǒ shì xuésheng\./.test(content.innerHTML), content.innerHTML);
  ctx.STEP_STATE.explanationIndex = 1;
  ctx.renderGrammarExplanationStep(unit, content, next);
  check('zh: tabela na explicação', /gram-table-title">是</.test(content.innerHTML) && /gram-table-pronoun">我</.test(content.innerHTML));
  const verdict = (i, typed) => {
    const dom = fakeDom(); ctx.document = dom.document; ctx.__dom = dom;
    vm.runInContext(`STEP_STATE.gramExerciseIndex = ${i}; STEP_STATE.gramExerciseScore = 0;`, ctx);
    ctx.__log.length = 0;
    const c = dom.mk('content');
    ctx.renderGrammarExerciseStep(unit, c, dom.mk('next'));
    const html = c.innerHTML;
    dom.document.getElementById('gram-exercise-input').value = typed;
    dom.document.getElementById('gram-exercise-verify-btn').click();
    return { cls: dom.els['.gram-exercise'].classList.list().join(','), score: ctx.STEP_STATE.gramExerciseScore, html, log: ctx.__log.slice() };
  };
  const ok1 = verdict(0, 'shì'), ok2 = verdict(0, 'shi4'), ok3 = verdict(0, 'Shì.'), q = verdict(0, 'shi'), w = verdict(0, 'xyz'), h = verdict(1, '是');
  check('zh: teclado de tons no exercício de gramática', /pinyin-tone-picker/.test(ok1.html) && ok1.log.includes('tons ligados'), ok1);
  check('zh: "shì" certo', ok1.cls === 'ok' && ok1.score === 1, ok1);
  check('zh: "shi4" (pinyin numerado) certo', ok2.cls === 'ok', ok2);
  check('zh: maiúscula e pontuação não contam', ok3.cls === 'ok', ok3);
  check('zh: tom faltando = quase (meio ponto)', q.cls === 'almost' && q.score === 0.5, q);
  check('zh: resposta errada', w.cls === 'wrong' && w.score === 0, w);
  check('zh: resposta em hanzi certa', h.cls === 'ok', h);
  // Cenário falso
  const ph = [
    { p: 'Nǐ hǎo!', c: '你好！', t: 'Oi!', scenario: 'Você encontra alguém.', scenarioEmoji: '🇧🇷' },
    { p: 'Xiè xie.', c: '谢谢。', t: 'Obrigada.', scenario: 'Alguém te ajuda.', scenarioEmoji: '🤝' },
    { p: 'Zài jiàn.', c: '再见。', t: 'Tchau.', scenario: 'Você vai embora.', scenarioEmoji: '👋' }];
  const ex = { format: 'scenario', phrase: ph[0], options: [ph[1], ph[0], ph[2]] };
  const c2 = ctx.__dom.mk('content2');
  vm.runInContext('LANG_HOOKS.uiKey = LANG_HOOKS.uiKey', ctx);
  ctx.renderScenarioExercise(ex, c2, ctx.__dom.mk('next2'), 5);
  check('zh: cenário com pinyin em cima do hanzi nas opções', /opt-pinyin-sentence">Nǐ hǎo!<\/span><span class="opt-hanzi-sentence">你好！/.test(c2.innerHTML), c2.innerHTML);
  check('zh: cenário usa o contador do zh e a bandeira em SVG', /zh\.exercise\.counter\{"i":1,"n":5\}/.test(c2.innerHTML) && /scenario-flag"><svg/.test(c2.innerHTML));
  const expl = ctx.scenarioExplanationHTML(ex);
  check('zh: explicação do cenário com hanzi, som e pinyin', /<strong>你好！<\/strong> <button class="audio-btn" data-text="你好！">.*<span class="pinyin">\(Nǐ hǎo!\)<\/span>.*Oi!/.test(expl), expl);
  const sets = [];
  for (let i = 0; i < 3; i++) { const r = ctx.buildScenarioExercise(ph[i], i, ph); if (r) sets.push(r); }
  check('zh: montagem do cenário (frase ímpar, 3 opções com a certa)', sets.length === 1 && sets[0].options.length === 3 && sets[0].options.includes(ph[1]), sets);
  check('zh: frase sem cenário não sorteia nada', ctx.buildScenarioExercise({ p: 'a', c: 'b' }, 1, ph) === null);
  // zh/app.js liga as peças
  [['currentStepDefs desvia para gramática', /if \(isGrammarUnit\(u\)\) return getStepDefsGrammar\(\);/],
   ['renderStep desvia para gramática', /if \(renderGrammarUnitStep\(u, stepKey, contentEl, nextBtn\)\) return;/],
   ['Voltar e Continuar da explicação', /grammarStepBack\(stepKey\)[\s\S]*grammarStepNext\(u, stepKey\)/],
   ['nota final da unidade de gramática', /const \{ total, correct \} = unitFinalScore\(u\);/],
   ['exercício de cenário montado', /buildScenarioExercise\(p, i, phrasesWithScenario\)/],
   ['exercício de cenário desenhado', /renderScenarioExercise\(ex, contentEl, nextBtn, total\)/],
   ['dica e explicação do cenário', /scenarioHint\(\)[\s\S]*scenarioExplanationHTML\(ex\)/]]
    // paridade 5d: currentStepDefs, finishCurrentLesson e renderExerciseStep do zh estão em shared/core/ (comuns aos sites)
    .forEach(([n, re]) => check('zh/app.js: ' + n, re.test(zhApp) || re.test(require('../e4/app-source.js').coreText())));
}

// zh: sem frase com cenário (o conteúdo de hoje), buildExerciseSet do zh sorteia EXATAMENTE o mesmo de antes
{
  const zhUnits = load('zh').UNITS;
  const mk = (src) => {
    const ctx = ctxBase();
    vm.runInContext('var buildFullSentenceExercises = () => [];', ctx);
    // paridade 5d: o buildExerciseSet comum lê o idioma pelos ganchos do zh (textOf, fullSentenceExercises)
    vm.runInContext(read('zh/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS'), ctx);
    estado(ctx, zhUnits);
    vm.runInContext(read('shared/core/gramatica-cenario.js').replace('const SCENARIO_FLAG_SVG', 'var SCENARIO_FLAG_SVG') + '\n' + declaracao(src, 'buildExerciseSet'), ctx);
    return ctx;
  };
  const ZA = mk(gitShow('zh/app.js')), ZB = mk(read('zh/app.js') + '\n' + require('../e4/app-source.js').coreText());
  let n = 0, diff = [];
  for (const u of zhUnits) for (const sd of [3, 99]) {
    const r = [ZA, ZB].map(ctx => { let x = sd; ctx.Math = Object.create(Math); ctx.Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;
      vm.runInContext('var __set = buildExerciseSet(UNITS.find(x => x.id === ' + JSON.stringify(u.id) + '));', ctx);
      return JSON.stringify(ctx.__set.map(e => [e.format, e.mode, e.phrase && e.phrase.c, (e.options || []).map(o => o.c), (e.shuffledBlocks || []).map(b => b.c), e.blankIdx])); });
    n++;
    if (r[0] !== r[1] && diff.length < 2) diff.push({ u: u.id, a: r[0].slice(0, 300), b: r[1].slice(0, 300) });
  }
  check(`zh: buildExerciseSet igual ao antigo em ${n} montagens (conteúdo real, sem cenário)`, n >= 30 && !diff.length, diff);
  check('zh: nenhuma frase do zh/content.js tem cenário hoje', !zhUnits.some(u => (u.phrases || []).some(p => p.scenario)));
}

// ---------------------------------------------------------------- CSS e carregamento
for (const site of ['fr', 'zh']) {
  const html = read(site + '/index.html');
  check(`${site}: carrega shared/gramatica-cenario.css`, html.includes('<link rel="stylesheet" href="../shared/gramatica-cenario.css">'));
  check(`${site}: carrega shared/core/gramatica-cenario.js antes do app.js`, html.indexOf('shared/core/gramatica-cenario.js') > 0 && html.indexOf('shared/core/gramatica-cenario.js') < html.indexOf('<script src="app.js">'));
  check(`${site}: index.html sem cópia de .scenario-option/.gram-exercise/.gram-table`, !/^\.(scenario-option|gram-exercise|gram-table)\{/m.test(html));
}
const css = read('shared/gramatica-cenario.css');
check('CSS: cabeçalho da tabela usa token do site ou --brand-fill/--on-brand-fill', /\.gram-table-title\{ background: var\(--gram-table-head, var\(--brand-fill\)\); color: var\(--on-gram-table-head, var\(--on-brand-fill\)\);/.test(css));

console.log(`\n${passed}/${passed + failed} verificações passaram`);
process.exit(failed ? 1 : 0);
