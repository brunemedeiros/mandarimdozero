// Teste de regressão pra validação de resposta digitada em francês --
// motivado pela mesma auditoria (grilling, 2026-09-16) que corrigiu o bug
// de tom no pinyin do chinês. Objetivo AQUI é o oposto: provar que o
// comportamento já existente do francês (acento tolerado nos exercícios de
// vocabulário/cloze/conjugação, acento EXIGIDO no ditado e no desafio de
// Acentuação) continua exatamente como estava -- nada nesta auditoria
// pedia pra mudar o francês, só confirmar que não há o mesmo bug lá.
//
// Não duplica a lógica: extrai os blocos reais de fr/app.js (marcados por
// "// BEGIN ... -logic" / "// END ... -logic") e roda eles mesmos, pra
// nunca divergir silenciosamente do que o app de verdade executa.
//
// Uso: node fr/scripts/test_answer_validation.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_JS_PATH = path.join(__dirname, '..', 'app.js');
const SRC = fs.readFileSync(APP_JS_PATH, 'utf8');

function extractBlock(beginMarker, endMarker){
  const start = SRC.indexOf(beginMarker);
  const end = SRC.indexOf(endMarker);
  if (start === -1 || end === -1){
    throw new Error(
      `Marcadores ${beginMarker} / ${endMarker} não encontrados em fr/app.js -- ` +
      'o bloco de lógica foi movido/renomeado. Atualize este teste.'
    );
  }
  return SRC.slice(start, end + endMarker.length);
}

function runBlockAndExport(block, names){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(block + `\n;this.__exports = { ${names.join(', ')} };`, sandbox);
  return sandbox.__exports;
}

const { normalizeLoose, acceptedForms } = runBlockAndExport(
  extractBlock('// BEGIN accent-answer-logic', '// END accent-answer-logic'),
  ['normalizeLoose', 'acceptedForms']
);
const { normalizeDictationWord, evaluateDictation, frenchNumberWords } = runBlockAndExport(
  extractBlock('// BEGIN dictation-answer-logic', '// END dictation-answer-logic'),
  ['normalizeDictationWord', 'evaluateDictation', 'frenchNumberWords']
);
const { isAccentAnswerCorrect } = runBlockAndExport(
  extractBlock('// BEGIN accent-challenge-logic', '// END accent-challenge-logic'),
  ['isAccentAnswerCorrect']
);

let passed = 0;
let failed = 0;
const failures = [];

function check(desc, actual, expected){
  const ok = actual === expected;
  if (ok) passed++;
  else { failed++; failures.push(desc); }
  console.log(`${ok ? '✓' : '✗ FALHOU'} ${desc}`);
  if (!ok) console.log(`    esperado: ${JSON.stringify(expected)}  obtido: ${JSON.stringify(actual)}`);
}

console.log('=== Requisito 1: francês -- preservar comportamento atual (acento tolerado nos exercícios digitados de vocabulário/cloze/conjugação) ===\n');

function vocabAnswerCorrect(typed, expected){
  const strip = s => normalizeLoose(s).replace(/[.,!?;:'"’]/g, '').trim();
  return acceptedForms(expected).some(form => strip(form) === strip(typed));
}

check('"étudiant" vs "etudiant" (sem acento) → correto -- comportamento já existente, preservado', vocabAnswerCorrect('etudiant', 'étudiant'), true);
check('"où" vs "ou" (sem acento) → correto -- mesmo motivo', vocabAnswerCorrect('ou', 'où'), true);
check('maiúscula não afeta: "Étudiant" vs "étudiant" → correto', vocabAnswerCorrect('Étudiant', 'étudiant'), true);
check('erro de verdade continua errado: "prennons" vs "prenons" → incorreto', vocabAnswerCorrect('prennons', 'prenons'), false);
check('forma dupla aceita: "un" vs "un / une" → correto (uma das formas basta)', vocabAnswerCorrect('un', 'un / une'), true);

console.log('\n=== Ditado -- deve continuar EXIGINDO acento correto (normalizeDictationWord nunca removeu diacrítico) ===\n');
check('"étudiant" vs "etudiant" (sem acento) → diferentes (ditado é estrito)', normalizeDictationWord('étudiant') === normalizeDictationWord('etudiant'), false);
check('"étudiant" vs "étudiant" → iguais', normalizeDictationWord('étudiant') === normalizeDictationWord('étudiant'), true);
check('maiúscula não afeta: "Étudiant" vs "étudiant" → iguais', normalizeDictationWord('Étudiant') === normalizeDictationWord('étudiant'), true);


console.log('\n=== Ditado -- nota, erro leve, pontuação, números (Fatia 1) ===\n');
const REF = "Bonjour à tous ! Je m'appelle Sophie. J'ai vingt-cinq ans et je suis française. Comment vous appelez-vous ?";
const sc = t => evaluateDictation(REF, t).score;
check('resposta perfeita → 100', sc(REF), 100);
check('maiúsculas/minúsculas e CAIXA ALTA não contam', sc(REF.toUpperCase()), 100);
check('apóstrofo curvo ’ → 100', sc(REF.replace(/'/g, '’')), 100);
check('apóstrofo ʼ (U+02BC) → 100', sc(REF.replace(/'/g, 'ʼ')), 100);
check('sem nenhuma pontuação → 100 (não desconta)', sc(REF.replace(/[.!?]/g, '')), 100);
check('sem pontuação marca "faltou pontuação"', evaluateDictation(REF, REF.replace(/[.!?]/g, '')).missingMarks > 0, true);
check('com pontuação completa não marca falta', evaluateDictation(REF, REF).missingMarks, 0);
check('"j\' ai" (espaço após apóstrofo) → 100', sc(REF.replace("J'ai", "J' ai")), 100);
check('"Sophie.J\'ai" (ponto sem espaço) → 100', sc(REF.replace('Sophie. J', 'Sophie.J')), 100);
check('espaço invisível U+200B no meio → 100', sc(REF.replace('Je m', 'Je​ m')), 100);
check('espaço não separável U+00A0 → 100', sc(REF.replace(' tous', ' tous')), 100);
const noAccent = evaluateDictation(REF, REF.replace('à', 'a').replace('française', 'francaise'));
check('sem acento = erro leve (2 palavras), não erro total', noAccent.light, 2);
check('sem acento vale meio ponto cada (nota < 100 e > erro total)', noAccent.score < 100 && noAccent.score > sc(REF.replace('à', 'xx').replace('française', 'yy')), true);
check('"vingt cinq" (sem hífen) → erro leve único, sem palavras extras', (r => r.light === 1 && r.extras === 0)(evaluateDictation(REF, REF.replace('vingt-cinq', 'vingt cinq'))), true);
check('"appelezvous" / hífen especial U+2011 → sem erro grave', evaluateDictation(REF, REF.replace('vingt-cinq', 'vingt‑cinq')).score, 100);
check('œ digitado como "oe" → erro leve', (r => r.light === 1)(evaluateDictation("Ma sœur est ici.", "Ma soeur est ici.")), true);
check('"jai" sem apóstrofo → erro leve (não acerto silencioso)', (r => r.light === 1 && r.exact === r.total - 1)(evaluateDictation("J'ai faim.", "Jai faim")), true);
check('palavra a mais penaliza', sc(REF + ' blabla') < 100, true);
check('colar o texto 2 vezes não dá 100', sc(REF + ' ' + REF) < 100, true);
check('campo em branco → 0', sc('   '), 0);
check('texto de referência vazio não gera NaN', evaluateDictation('', 'abc').score, 0);
check('palavra errada continua errada', sc(REF.replace('Sophie', 'Marie')) < 100, true);
const dig = evaluateDictation(REF, REF.replace('vingt-cinq', '25'));
check('"25" no lugar de "vingt-cinq" → sem erro (nota 100)', dig.score, 100);
check('"25" gera nota com a escrita por extenso', dig.digitNotes.length === 1 && dig.digitNotes[0].words === 'vingt-cinq', true);
const spoken = evaluateDictation("Bonjour, je m'appelle Marc.", "Bonjour virgule je m'appelle Marc point");
check('"virgule"/"point" escritos por extenso → erro leve (nota < 100)', spoken.spokenPunct.length === 2 && spoken.score < 100, true);
check('"virgule"/"point" por extenso NÃO viram palavra errada nem extra', spoken.extras, 0);
check('palavra "point" que faz parte do texto não é confundida', evaluateDictation('Le point est ici.', 'Le point est ici').score, 100);
check('números: 21 = vingt et un', frenchNumberWords(21), 'vingt et un');
check('números: 71 = soixante et onze', frenchNumberWords(71), 'soixante et onze');
check('números: 80 = quatre-vingts', frenchNumberWords(80), 'quatre-vingts');
check('números: 97 = quatre-vingt-dix-sept', frenchNumberWords(97), 'quatre-vingt-dix-sept');
check('números: 16 = seize / 17 = dix-sept', frenchNumberWords(16) + '/' + frenchNumberWords(17), 'seize/dix-sept');
check('"21" no lugar de "vingt et un" → 100', evaluateDictation('Il a vingt et un ans.', 'Il a 21 ans.').score, 100);

console.log('\n=== Desafio "Acentuação" -- deve continuar EXIGINDO acento correto (isAccentAnswerCorrect nunca removeu diacrítico) ===\n');
check('"étudiant" vs "etudiant" (sem acento) → incorreto (é literalmente o que o desafio testa)', isAccentAnswerCorrect('etudiant', 'étudiant'), false);
check('"étudiant" vs "étudiant" → correto', isAccentAnswerCorrect('étudiant', 'étudiant'), true);
check('espaço extra não afeta: " étudiant " vs "étudiant" → correto', isAccentAnswerCorrect(' étudiant ', 'étudiant'), true);

console.log(`\n${passed} passaram, ${failed} falharam.`);
if (failed > 0){
  console.log('\nFalhas:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
