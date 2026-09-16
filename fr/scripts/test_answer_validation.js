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
const { normalizeDictationWord } = runBlockAndExport(
  extractBlock('// BEGIN dictation-answer-logic', '// END dictation-answer-logic'),
  ['normalizeDictationWord']
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
