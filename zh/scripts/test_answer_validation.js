// Teste de regressão pra validação de resposta digitada (pinyin), motivado
// por uma auditoria (grilling, 2026-09-16) que encontrou normalizeLoose()
// removendo diacríticos de tom antes de comparar -- copiado quase literal
// do normalizeLoose() do francês, correto lá (acento é tolerado), errado
// aqui (tom é parte da palavra, mā/má/mǎ/mà/ma são 5 respostas diferentes).
//
// Não duplica a lógica: extrai o bloco real de zh/app.js (marcado por
// "// BEGIN pinyin-answer-logic" / "// END pinyin-answer-logic") e roda
// ele mesmo, pra nunca divergir silenciosamente do que o app de verdade
// executa. Se os marcadores sumirem (renomeados/movidos sem atualizar
// aqui), o teste falha alto em vez de testar código morto.
//
// Uso: node zh/scripts/test_answer_validation.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_JS_PATH = path.join(__dirname, '..', 'app.js');
const BEGIN_MARKER = '// BEGIN pinyin-answer-logic';
const END_MARKER = '// END pinyin-answer-logic';

function loadPinyinAnswerLogic(){
  const src = fs.readFileSync(APP_JS_PATH, 'utf8');
  const start = src.indexOf(BEGIN_MARKER);
  const end = src.indexOf(END_MARKER);
  if (start === -1 || end === -1){
    throw new Error(
      `Marcadores ${BEGIN_MARKER} / ${END_MARKER} não encontrados em zh/app.js -- ` +
      'o bloco de lógica de comparação de pinyin foi movido/renomeado. Atualize este teste.'
    );
  }
  const block = src.slice(start, end + END_MARKER.length);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(block + '\n;this.__exports = { normalizePinyinAnswer, convertNumberedPinyin, convertNumberedPinyinSyllable, pinyinToneVowelIndex, acceptedForms };', sandbox);
  return sandbox.__exports;
}

const { normalizePinyinAnswer, convertNumberedPinyinSyllable, acceptedForms } = loadPinyinAnswerLogic();

// Mesma lógica de strip() usada nos dois call sites reais (renderVocabTypeExercise/
// renderClozeExercise em zh/app.js) -- replicada aqui só porque é uma linha
// inline, não uma função nomeada extraível; se ela mudar no app.js, mude aqui também.
function strip(s){
  return normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
}

function pinyinAnswerCorrect(typed, expected){
  return acceptedForms(expected).some(form => strip(form) === strip(typed));
}

let passed = 0;
let failed = 0;
const failures = [];

function check(desc, actual, expected){
  const ok = actual === expected;
  if (ok) passed++;
  else { failed++; failures.push({ desc, actual, expected }); }
  console.log(`${ok ? '✓' : '✗ FALHOU'} ${desc}`);
  if (!ok) console.log(`    esperado: ${JSON.stringify(expected)}  obtido: ${JSON.stringify(actual)}`);
}

console.log('=== Requisito 2: tons são semanticamente relevantes, não removidos ===\n');

check('mā vs mā → correto', pinyinAnswerCorrect('mā', 'mā'), true);
check('mā vs má → incorreto', pinyinAnswerCorrect('má', 'mā'), false);
check('mā vs mǎ → incorreto', pinyinAnswerCorrect('mǎ', 'mā'), false);
check('mā vs mà → incorreto', pinyinAnswerCorrect('mà', 'mā'), false);
check('mā vs ma (sem tom) → incorreto quando o tom é obrigatório', pinyinAnswerCorrect('ma', 'mā'), false);

console.log('\n=== Tolerância que deve continuar existindo (maiúscula/espaço/pontuação) ===\n');
check('maiúscula não afeta: Mā vs mā → correto', pinyinAnswerCorrect('Mā', 'mā'), true);
check('espaço extra não afeta: " mā " vs mā → correto', pinyinAnswerCorrect(' mā ', 'mā'), true);
check('pontuação solta não afeta: "mā." vs mā → correto', pinyinAnswerCorrect('mā.', 'mā'), true);
check('tom neutro correto sozinho: "ma" (partícula) vs "ma" → correto', pinyinAnswerCorrect('ma', 'ma'), true);
check('múltiplas sílabas com tom certo: "nǐ hǎo" vs "nǐ hǎo" → correto', pinyinAnswerCorrect('nǐ hǎo', 'nǐ hǎo'), true);
check('múltiplas sílabas com 1 tom errado: "nǐ hāo" vs "nǐ hǎo" → incorreto', pinyinAnswerCorrect('nǐ hāo', 'nǐ hǎo'), false);

console.log('\n=== Requisito 2 (aprovado): pinyin numerado (ma1-ma5) equivale ao mesmo tom, só o mesmo tom ===\n');
check('ma1 vs mā → correto (mesmo tom, forma diferente)', pinyinAnswerCorrect('ma1', 'mā'), true);
check('ma2 vs má → correto', pinyinAnswerCorrect('ma2', 'má'), true);
check('ma3 vs mǎ → correto', pinyinAnswerCorrect('ma3', 'mǎ'), true);
check('ma4 vs mà → correto', pinyinAnswerCorrect('ma4', 'mà'), true);
check('ma5 vs ma (tom neutro) → correto', pinyinAnswerCorrect('ma5', 'ma'), true);
check('ma (sem número, tom neutro) vs ma5 → correto', pinyinAnswerCorrect('ma', 'ma5'), true);
check('ma3 vs má → INCORRETO (tom numerado 3 ≠ tom diacrítico 2)', pinyinAnswerCorrect('ma3', 'má'), false);
check('ma1 vs mǎ → INCORRETO (tom numerado 1 ≠ tom diacrítico 3)', pinyinAnswerCorrect('ma1', 'mǎ'), false);
check('resposta esperada em numerado, digitada em diacrítico: mǎ vs "ma3" → correto', pinyinAnswerCorrect('mǎ', 'ma3'), true);

console.log('\n=== convertNumberedPinyinSyllable: casos além de "ma" ===\n');
check('ni3 → nǐ', convertNumberedPinyinSyllable('ni3'), 'nǐ');
check('hao3 → hǎo (regra "a"/"e" tem prioridade, mas aqui só há "ao")', convertNumberedPinyinSyllable('hao3'), 'hǎo');
check('xian1 → xiān (marca no "a", não no "i" nem no "n")', convertNumberedPinyinSyllable('xian1'), 'xiān');
check('nv3 → nǚ ("v" é convenção de teclado pra "ü")', convertNumberedPinyinSyllable('nv3'), 'nǚ');
check('lu4 (sem contexto de ü) → lù', convertNumberedPinyinSyllable('lu4'), 'lù');
check('er2 →ér (vogal única "e")', convertNumberedPinyinSyllable('er2'), 'ér');
check('ma5 → ma (tom neutro, sem marca)', convertNumberedPinyinSyllable('ma5'), 'ma');
check('já diacrítico passa direto: mǎ → mǎ (não é sílaba numerada)', convertNumberedPinyinSyllable('mǎ'), 'mǎ');

console.log('\n=== Requisito: tecla virtual e teclado físico devem chegar com o mesmo valor ===\n');
// A teclinha (wirePinyinTonePicker/PINYIN_TONE_GROUPS) insere o MESMO glifo
// NFC que um teclado físico/IME produziria pra essa vogal com tom -- aqui
// simulamos os dois caminhos convergindo na mesma string antes da comparação.
const viaVirtualKey = 'm' + 'ǎ'; // glifo inserido pela tecla (igual ao de PINYIN_TONE_GROUPS em zh/app.js)
const viaPhysicalKeyboardNFC = 'mǎ'; // "m" + "ǎ" já precomposto (forma mais comum de IME/teclado)
const viaPhysicalKeyboardNFD = 'mǎ'; // "m" + "a" + combining caron (some IMEs compõem assim)
check('tecla virtual "mǎ" vs teclado físico NFC "mǎ" → mesmo resultado', pinyinAnswerCorrect(viaVirtualKey, viaPhysicalKeyboardNFC), true);
check('tecla virtual "mǎ" vs teclado físico NFD "mǎ" → mesmo resultado (normalize NFC resolve)', pinyinAnswerCorrect(viaVirtualKey, viaPhysicalKeyboardNFD), true);

console.log('\n=== Requisito 3: caracteres (hanzi) -- confirmação de que não há normalização aplicada ===\n');
// Não há função de comparação de hanzi digitado neste app (hanzi é sempre
// escolhido por opção com === exato -- ver renderClozeExercise/jogo
// Combinar em zh/app.js) -- este teste documenta a ausência, não testa uma
// função que não existe. Se algum dia isso mudar, este teste deve virar um
// teste real de comparação de hanzi.
check('placeholder documentando que hanzi não passa por normalização de texto', true, true);

console.log(`\n${passed} passaram, ${failed} falharam.`);
if (failed > 0){
  console.log('\nFalhas:');
  failures.forEach(f => console.log(`  - ${f.desc}`));
  process.exit(1);
}
