// Paridade fr x zh, itens C2, C3, C4, C5 e D6 (docs/auditoria-paridade-fr-zh.md), código comum em
// shared/core/licao-feedback.js. Carrega os arquivos de PRODUÇÃO num VM (nada copiado à mão).
//  C2 fr: typedAttemptHTML comum devolve EXATAMENTE o mesmo HTML que o fr/app.js antigo (commit REF), num corpus
//         com todo o vocabulário e frases do fr/content.js e erros gerados.
//  C2 zh: o veredito dos exercícios de digitar não mudou (a forma de comparar é a mesma de antes) e a marcação
//         concorda com ele: resposta errada sempre tem letra marcada; pinyin numerado certo não marca nada.
//  C3: dica do V ou F cita o conceito já visto (fr e zh) e cai na geral sem conceito.
//  C4: Ordenar com erro deixa verdes os blocos no lugar certo (fr e zh, mesma função).
//  C5: LANG_HOOKS.pregenRate() = 0,9 nos dois sites e o speakXAudioOnly repassa esse valor ao mp3.
//  D6: o zh não tem mais "⏭ 跳过" nem "pts" fixos; usa as chaves do fr.
// Rodar: node tests/paridade-sites/test_licao_feedback.js
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Commit de referência = main antes desta mudança (2026-10-23). Trocar só de propósito.
const REF = process.env.PARIDADE_C2_REF || '93bbd071';
const gitShow = (f) => execFileSync('git', ['show', REF + ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

// Declaração de topo pelo nome (function X(...) {...} até o "}" da coluna 0).
function declaracao(src, nome){
  const m = new RegExp('^function ' + nome + '\\(', 'm').exec(src);
  if (!m) throw new Error('declaração ' + nome + ' não encontrada');
  const resto = src.slice(m.index);
  const fim = /\n\}[^\n]*/.exec(resto);
  return resto.slice(0, fim.index + fim[0].length);
}
const between = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i < 0 || j < 0) throw new Error('marcadores ' + a); return src.slice(i, j); };

const coreEstado = read('shared/core/estado-trilha-desafios.js');
// escapeHTML da página usa o DOM; aqui, o mesmo escape sem DOM (igual nos dois lados da comparação).
const ESC = "function escapeHTML(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;'); }";
const comum = [ESC, declaracao(coreEstado, 'acceptedForms'),
  declaracao(coreEstado, 'acceptedFormsTyped'), declaracao(coreEstado, 'slashSpacing'), declaracao(coreEstado, 'typedVariants')].join('\n');
const hooks = (site) => read(site + '/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS');
const feedback = read('shared/core/licao-feedback.js');

function ctxNovo(site, extra){
  const ctx = Object.assign({ console, STEP_STATE: { conceptsShown: new Set() }, t: (k, p) => k + (p ? JSON.stringify(p) : '') }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(comum + '\n' + hooks(site) + '\n' + feedback, ctx);
  return ctx;
}

// Corpus do fr: cada "f" do conteúdo, mais erros gerados (letra a menos, trocada, a mais, maiúscula, barra).
const frTexts = [...new Set([...read('fr/content.js').matchAll(/"f":\s*"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse('"' + m[1] + '"')))];
function erros(s){
  const out = [s, s.toUpperCase(), s.slice(1), s.slice(0, -1), s + 'e', s.replace(/[aeiou]/, 'x'), s.replace(/é/g, 'e'),
    s.split('').reverse().join(''), s.replace(/\s*\/\s*/g, '/'), s.split('/')[0], (s.split('/')[1] || '').trim() + ' / ' + s.split('/')[0], '', '   '];
  if (s.length > 3) out.push(s.slice(0, 2) + s.slice(3));
  return out;
}

// ---------------------------------------------------------------- C2 fr: igual ao antigo
{
  const antigoSrc = gitShow('fr/app.js');
  const antigo = { console };
  vm.createContext(antigo);
  vm.runInContext(gitShow('shared/core/familias/latina.js'), antigo);
  vm.runInContext(comum + '\n' + declaracao(antigoSrc, 'conjAlign') + '\n' + declaracao(antigoSrc, 'typedAttemptHTML'), antigo);
  const novo = ctxNovo('fr');
  let n = 0, diff = [];
  for (const alvo of frTexts){
    for (const typed of erros(alvo).concat(erros(alvo.toLowerCase()))){
      n++;
      const a = antigo.typedAttemptHTML(typed, alvo), b = novo.typedAttemptHTML(typed, alvo);
      if (a !== b && diff.length < 5) diff.push({ typed, alvo, a, b });
    }
  }
  check(`C2 fr: typedAttemptHTML comum = fr antigo (${REF}) em ${n} casos (${frTexts.length} textos do fr/content.js)`, diff.length === 0 && n > 1000, diff);
  console.log(`  C2 fr: ${n} comparações com o fr antigo, ${diff.length} diferenças`);
  check('C2 fr: "allemand / allemand" marca o "e" que faltou', /conj-gap/.test(novo.typedAttemptHTML('allemand / allemand', 'allemand / allemande')));
  check('C2 fr: conjAlign do fr/app.js usa alinharLetras comum', /function conjAlign\(a, b\)\{\n\s+return alinharLetras\(a, b\);/.test(read('fr/app.js')));
  check('C2 fr: fr/app.js não tem mais typedAttemptHTML próprio', !/^function typedAttemptHTML\(/m.test(read('fr/app.js')));
}

// ---------------------------------------------------------------- C2 zh: veredito igual e marcação coerente
{
  const zhSrc = read('zh/app.js'), zhAntigo = gitShow('zh/app.js');
  const logica = between(zhSrc, '// BEGIN pinyin-answer-logic', '// END pinyin-answer-logic');
  const zh = ctxNovo('zh');
  vm.runInContext([logica, declaracao(zhSrc, 'pinyinAnswerCompareForm'), declaracao(zhSrc, 'pinyinWithoutTones'), declaracao(zhSrc, 'isToneOnlyMiss')].join('\n'), zh);
  // Forma de comparar ANTIGA (a seta "strip" que os dois exercícios tinham), tirada do zh/app.js de REF.
  const setas = zhAntigo.split('\n').filter(l => /const strip = s => normalizePinyinAnswer\(s\)/.test(l)).map(l => l.trim());
  check('C2 zh: o zh antigo tinha a seta de comparação nos exercícios de digitar', setas.length >= 2, setas.length);
  vm.runInContext('var __stripAntigo = (function(){ ' + setas[0] + ' return strip; })();', zh);
  // Veredito como o clique de "Verificar" faz (renderVocabTypeExercise / lacuna digitada).
  vm.runInContext(`function __veredito(raw, p, strip){
    const typedAll = typedVariants(raw, p).map(strip), typed = typedAll[0];
    const forms = acceptedFormsTyped(p);
    const ok = forms.some(form => typedAll.includes(strip(form)));
    return { ok, tone: !ok && isToneOnlyMiss(typed, forms, strip) };
  }`, zh);
  const zhP = [...new Set([...read('zh/content.js').matchAll(/"p":\s*"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse('"' + m[1] + '"')))];
  const TONS = { 'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],
    'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['v',1],'ǘ':['v',2],'ǚ':['v',3],'ǜ':['v',4] };
  // "nǐ hǎo" -> "ni3 hao3" (pinyin numerado, como quem digita sem a teclinha de tons)
  const numerado = (s) => s.replace(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+/g, w => {
    let tom = 0; const base = [...w].map(ch => { if (TONS[ch]){ tom = TONS[ch][1]; return TONS[ch][0]; } return ch === 'ü' ? 'v' : ch; }).join('');
    return tom ? base + tom : base;
  });
  const trocaTom = (s) => { for (const ch of s) if (TONS[ch]){ const [v, n] = TONS[ch]; const alvo = Object.keys(TONS).find(k => TONS[k][0] === v && TONS[k][1] === (n % 4) + 1); return s.replace(ch, alvo); } return s + 'x'; };
  let n = 0, mudou = [], incoerente = [], numeradoMarcado = [];
  for (const p of zhP){
    const casos = [p, p.toUpperCase(), numerado(p), vm.runInContext('pinyinWithoutTones', zh)(p), trocaTom(p), p.slice(1), p + 'n', p.replace(/\s+/g, ''), p + '。', p.replace(/[aeiou]/, 'x'), ''];
    for (const raw of casos){
      n++;
      const novo = zh.__veredito(raw, p, zh.pinyinAnswerCompareForm), antigo = zh.__veredito(raw, p, zh.__stripAntigo);
      if ((novo.ok !== antigo.ok || novo.tone !== antigo.tone) && mudou.length < 5) mudou.push({ raw, p, novo, antigo });
      const html = zh.typedAttemptHTML(raw, p);
      const marcou = /conj-x|conj-gap/.test(html);
      if (!novo.ok && raw.trim() && !marcou && incoerente.length < 5) incoerente.push({ raw, p, html });
      if (raw === numerado(p) && novo.ok && marcou && numeradoMarcado.length < 5) numeradoMarcado.push({ raw, p, html });
    }
  }
  console.log(`  C2 zh: ${n} respostas em ${zhP.length} pinyins do zh/content.js`);
  check(`C2 zh: veredito (certo/errado e aviso de tom) igual ao de antes em ${n} respostas`, mudou.length === 0, mudou);
  check('C2 zh: toda resposta errada tem letra marcada em vermelho ou traço', incoerente.length === 0, incoerente);
  check('C2 zh: pinyin numerado certo ("ni3 hao3") não marca nada', numeradoMarcado.length === 0, numeradoMarcado);
  const h = zh.typedAttemptHTML('ni3 hao', 'nǐ hǎo');
  check('C2 zh: "ni3 hao" por "nǐ hǎo" mostra "nǐ" convertido e marca só o "a" sem tom', h === '<div class="typed-attempt">nǐ h<span class="conj-x">a</span>o</div>', h);
  check('C2 zh: "Digite o que ouviu" e a lacuna digitada passam attemptHTML ao painel',
    (zhSrc.match(/attemptHTML: typedAttemptHTML\(typedRaw, ex\.(item|correctBlock)\.p\)/g) || []).length === 2);
  check('C2: shared/licao-feedback.css carregado pelos dois sites e com .typed-attempt/.conj-x/.conj-gap',
    ['fr', 'zh'].every(s => read(s + '/index.html').includes('href="../shared/licao-feedback.css"') && read(s + '/index.html').includes('src="../shared/core/licao-feedback.js"'))
    && ['.typed-attempt', '.conj-x', '.conj-gap'].every(c => read('shared/licao-feedback.css').includes(c)));
}

// ---------------------------------------------------------------- C3 dica do V ou F
for (const site of ['fr', 'zh']){
  const c = ctxNovo(site);
  const unit = { concepts: [{ id: 'k1', blocks: [{ title: 'Título A' }, { title: 'Título B' }] }] };
  const keys = c.LANG_HOOKS.trueFalseHintKeys;
  check(`C3 ${site}: sem conceito visto = dica geral`, c.trueFalseHint(unit) === keys.generic);
  c.STEP_STATE.conceptsShown.add('k1');
  check(`C3 ${site}: conceito visto = cita o título`, c.trueFalseHint(unit) === keys.seen + JSON.stringify({ title: 'Título A' }));
  check(`C3 ${site}: unidade sem concepts = dica geral`, c.trueFalseHint({}) === keys.generic);
  check(`C3 ${site}: buildExerciseHint usa trueFalseHint`, /if \(ex\.format === 'trueFalse'\)\{\n\s+return trueFalseHint\(unit\);/.test(read(site + '/app.js')));
}
{
  // Texto: as chaves dos dois sites dizem o mesmo (pt-BR e en).
  const sb = { window: {} }; sb.window = sb;
  vm.runInNewContext(read('shared/i18n/pt-BR.js'), sb); vm.runInNewContext(read('shared/i18n/en.js'), sb);
  for (const l of ['pt-BR', 'en']){
    const cat = sb.I18N_CATALOG[l];
    check(`C3 ${l}: dica com conceito igual no fr e no zh`, cat['fr.hint.trueFalseExplanation'] === cat['zh.hint.trueFalseUsage']);
    check(`C3 ${l}: dica geral igual no fr e no zh`, cat['fr.hint.trueFalseGeneric'] === cat['zh.hint.trueFalseDefault']);
  }
  check('C3 zh: o zh/app.js não usa mais unit.usageNote na dica', !/unit\.usageNote/.test(read('zh/app.js')));
}

// ---------------------------------------------------------------- C4 Ordenar
for (const site of ['fr', 'zh']){
  const c = ctxNovo(site);
  const A = { f: 'a' }, B = { f: 'b' }, C = { f: 'c' }, X = { f: 'isca' };
  const correctOrder = [A, B, C], shuffled = [C, A, X, B];
  const mk = (n) => { const slots = Array.from({ length: n }, () => ({ cls: [], classList: { add(x){ this.owner.cls.push(x); } } })); slots.forEach(s => s.classList.owner = s); return { slots, el: { querySelectorAll: () => slots } }; };
  // resposta: A, X, C -> A e C no lugar certo, X errado
  let m = mk(3); c.markReorderSlots(m.el, [1, 2, 0], shuffled, correctOrder, false);
  check(`C4 ${site}: erro deixa verdes os blocos no lugar certo`, m.slots.map(s => s.cls[0]).join() === 'correct,incorrect,correct', m.slots.map(s => s.cls));
  m = mk(3); c.markReorderSlots(m.el, [1, 3, 0], shuffled, correctOrder, true);
  check(`C4 ${site}: acerto deixa tudo verde`, m.slots.every(s => s.cls[0] === 'correct'));
  check(`C4 ${site}: estado do bloco ok/near/bad`, [c.reorderBlockStatus(A, 0, correctOrder), c.reorderBlockStatus(B, 0, correctOrder), c.reorderBlockStatus(X, 1, correctOrder)].join() === 'ok,near,bad');
  check(`C4 ${site}: checkReorderAnswer chama markReorderSlots`, /markReorderSlots\(slotsEl, chosenSequence, ex\.shuffledBlocks, correctOrder, isCorrect\)/.test(read(site + '/app.js')));
}

// ---------------------------------------------------------------- C5 velocidade do mp3
for (const [site, fn] of [['fr', 'speakFrenchAudioOnly'], ['zh', 'speakChineseAudioOnly']]){
  const calls = [];
  const c = ctxNovo(site, { PREGEN_AUDIO_RATE: 0.9, AUDIO_MANIFEST: { 'olá': 'x.mp3' }, playPregeneratedAudio: (...a) => calls.push(a) });
  check(`C5 ${site}: LANG_HOOKS.pregenRate() = 0.9`, c.LANG_HOOKS.pregenRate() === 0.9);
  vm.runInContext(declaracao(read(site + '/app.js'), fn), c);
  c[fn]('olá', null, false);
  check(`C5 ${site}: ${fn} toca o mp3 com a velocidade do gancho (0.9)`, calls.length === 1 && calls[0][3] === 0.9, calls);
}

// ---------------------------------------------------------------- D6 textos fixos do zh
{
  const zhSrc = read('zh/app.js');
  check('D6 zh: sem "⏭ 跳过" fixo', !zhSrc.includes('跳过'));
  check('D6 zh: selo de pulada usa trail.unit.skippedBadge', zhSrc.includes("${t('trail.unit.skippedBadge')}</span>"));
  for (const site of ['fr', 'zh']){
    const src = read(site + '/app.js');
    check(`D6 ${site}: Revisão rápida sem "pts" fixo`, !/\$\{SPEED_STATE\.score\} pts/.test(src));
    check(`D6 ${site}: Revisão rápida usa review.speed.points (3 lugares)`, (src.match(/t\('review\.speed\.points', \{ n: SPEED_STATE\.score \}\)/g) || []).length === 3);
  }
}

console.log(`Paridade da lição (C2, C3, C4, C5, D6): ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
process.exit(failed ? 1 : 0);
