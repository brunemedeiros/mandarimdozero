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
const { normalizeDictationWord, evaluateDictation, frenchNumberWords, classifyDictationError, updateDictationRecord, sanitizeDictationRecord, dictationWrongWords, splitDictationSentences, dictationSentenceErrorFlags } = runBlockAndExport(
  extractBlock('// BEGIN dictation-answer-logic', '// END dictation-answer-logic'),
  ['normalizeDictationWord', 'evaluateDictation', 'frenchNumberWords', 'classifyDictationError', 'updateDictationRecord', 'sanitizeDictationRecord', 'dictationWrongWords', 'splitDictationSentences', 'dictationSentenceErrorFlags']
);
const { isAccentAnswerCorrect, accentAnswerOutcome } = runBlockAndExport(
  extractBlock('// BEGIN accent-challenge-logic', '// END accent-challenge-logic'),
  ['isAccentAnswerCorrect', 'accentAnswerOutcome']
);
const { listenTranslateOutcome, translationHasPersonMismatch, analyzeTranslation } = runBlockAndExport(
  extractBlock('// BEGIN challenge-translation-logic', '// END challenge-translation-logic'),
  ['listenTranslateOutcome', 'translationHasPersonMismatch', 'analyzeTranslation']
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

console.log('\n=== Ditado (Fatia 2) -- tipo de erro (só explicativo) ===\n');
const kind = (a, b) => classifyDictationError(a, b).kind;
check('et/est → homófono', kind('est', 'et'), 'homophone');
check('son/sont → homófono', kind('sont', 'son'), 'homophone');
check("c'est/ses → homófono (com pontuação colada)", kind("c'est,", 'ses'), 'homophone');
check('a/à → homófono', kind('à', 'a'), 'homophone');
check('mes/mais → homófono', kind('mais', 'mes'), 'homophone');
check('quel/quelle → homófono', kind('quelle', 'quel'), 'homophone');
check('petit/petite → concordância', kind('petite', 'petit'), 'agreement');
check('ami/amis → concordância', kind('amis.', 'ami'), 'agreement');
check('beau/beaux → concordância', kind('beaux', 'beau'), 'agreement');
check('française/français → concordância', kind('française', 'français'), 'agreement');
check('le/les → NÃO inventa concordância (curta demais)', kind('les', 'le'), 'other');
check('de/des → outro', kind('des', 'de'), 'other');
check('Sophie/Marie → outro', kind('Sophie', 'Marie'), 'other');
check('outro: texto genérico, sem regra gramatical inventada', /palavra diferente da esperada/.test(classifyDictationError('chat', 'chien').noteText), true);
check('classificação não muda a nota (sub continua errado)', evaluateDictation('Il est ici.', 'Il et ici.').score < 100, true);

console.log('\n=== Ditado (Fatia 2) -- registro de progresso ===\n');
const ev70 = evaluateDictation('Il est petit et gentil.', 'Il et petite et gentil');
const r1 = updateDictationRecord(undefined, ev70, new Date('2026-10-03T10:00:00Z'));
check('1ª tentativa: attempts = 1', r1.attempts, 1);
check('1ª tentativa: bestScore = lastScore = nota', r1.bestScore === ev70.score && r1.lastScore === ev70.score, true);
check('lastAt em ISO', r1.lastAt, '2026-10-03T10:00:00.000Z');
check('wrongWords lista as palavras do texto erradas', JSON.stringify(r1.wrongWords), JSON.stringify(['est', 'petit']));
const r2 = updateDictationRecord(r1, evaluateDictation('Il est petit.', 'abc'), Date.UTC(2026, 9, 4));
check('nota pior não reduz bestScore', r2.bestScore, r1.bestScore);
check('lastScore reflete a última', r2.lastScore < r1.bestScore, true);
check('attempts soma', r2.attempts, 2);
const r3 = updateDictationRecord(r2, evaluateDictation('Il est petit.', 'Il est petit.'), new Date());
check('nota 100 sobe bestScore e limpa wrongWords', r3.bestScore === 100 && r3.wrongWords.length === 0, true);
check('save antigo / registro ausente não quebra', JSON.stringify(sanitizeDictationRecord(undefined)), JSON.stringify({ bestScore: 0, attempts: 0, lastScore: 0, lastAt: null, wrongWords: [] }));
check('registro malformado é saneado', (r => r.bestScore === 0 && r.attempts === 0 && r.wrongWords.length === 1)(sanitizeDictationRecord({ bestScore: 'x', attempts: -3, wrongWords: ['ok', 5, null] })), true);
check('update sobre registro malformado não gera NaN', updateDictationRecord({ bestScore: NaN, attempts: 'a' }, ev70, 0).attempts, 1);
check('wrongWords deduplicado (sem diferenciar maiúscula)', dictationWrongWords(evaluateDictation('Le chat et le chat.', 'x x x x x')).filter(w => w.toLowerCase() === 'chat').length, 1);
check('wrongWords limitado a 30', dictationWrongWords(evaluateDictation(Array.from({ length: 50 }, (_, i) => 'mot' + i).join(' '), 'zzz')).length, 30);

console.log('\n=== Ditado (Fatia 3) -- divisão em frases igual ao Python (dictation_sentences.py) ===\n');
const J = x => JSON.stringify(x);
check('split: simples', J(splitDictationSentences('Bonjour ! Comment ça va ?')), J(['Bonjour !', 'Comment ça va ?']));
check('split: M. não encerra', J(splitDictationSentences('M. Dupont habite à Lyon. Il rit.')), J(['M. Dupont habite à Lyon.', 'Il rit.']));
check('split: Mme e inicial J.', J(splitDictationSentences('Mme Martin et J. Dupont parlent.')), J(['Mme Martin et J. Dupont parlent.']));
check('split: reticências', J(splitDictationSentences('Alors... je pars. Salut')), J(['Alors...', 'je pars.', 'Salut']));
check('split: reticência unicode', J(splitDictationSentences('Alors… je pars.')), J(['Alors…', 'je pars.']));
check('split: aspas fechando anexadas', J(splitDictationSentences('Il dit : « Oui. » Puis il part.')), J(['Il dit : « Oui. »', 'Puis il part.']));
check('split: número decimal', J(splitDictationSentences('Il a 3.5 euros. Merci')), J(['Il a 3.5 euros.', 'Merci']));
check('split: vazio', J(splitDictationSentences('   ')), J([]));
{
  const flags = dictationSentenceErrorFlags('Bonjour ! Je suis Paul. Il rit.', evaluateDictation('Bonjour ! Je suis Paul. Il rit.', 'Bonjour ! Je sui Paul. Il rit.'));
  check('flags: só a frase com erro é marcada', J(flags), J([false, true, false]));
  const ok = dictationSentenceErrorFlags('Bonjour ! Il rit.', evaluateDictation('Bonjour ! Il rit.', 'Bonjour ! Il rit.'));
  check('flags: sem erro, nenhuma marcada', J(ok), J([false, false]));
  const miss = dictationSentenceErrorFlags('Bonjour ! Il rit.', evaluateDictation('Bonjour ! Il rit.', 'Bonjour !'));
  check('flags: palavras faltando na 2ª frase', J(miss), J([false, true]));
}
{
  // Todos os ditados reais: mesma divisão que o Python.
  const dsSrc = fs.readFileSync(path.join(__dirname, '..', 'dictations.js'), 'utf8');
  const box = {}; vm.createContext(box);
  vm.runInContext(dsSrc + '\n;this.__d = DICTATIONS;', box);
  const ds = box.__d.map(d => ({ id: d.id, text: d.text }));
  const jsSplit = Object.fromEntries(ds.map(d => [d.id, splitDictationSentences(d.text)]));
  const jsTotal = Object.values(jsSplit).reduce((a, s) => a + s.length, 0);
  let py = null;
  try {
    const { execFileSync } = require('child_process');
    py = JSON.parse(execFileSync('python3', ['-c',
      'import json,sys; sys.path.insert(0, sys.argv[1]); from dictation_sentences import split_sentences; ' +
      'd = json.loads(sys.stdin.read()); print(json.dumps({x["id"]: split_sentences(x["text"]) for x in d}))',
      __dirname], { input: JSON.stringify(ds), encoding: 'utf8' }));
  } catch (e){ console.log('  (python3 indisponível -- comparação com o Python pulada)'); }
  if (py){
    const pyTotal = Object.values(py).reduce((a, s) => a + s.length, 0);
    check(`ditados reais: total de frases JS (${jsTotal}) = Python (${pyTotal})`, jsTotal, pyTotal);
    const diffIds = ds.filter(d => J(jsSplit[d.id]) !== J(py[d.id])).map(d => d.id);
    check('ditados reais: frases idênticas JS x Python em todos os ditados', J(diffIds), J([]));
  }
  check('ditados reais: total de frases = 92', jsTotal, 92);
}

console.log('\n=== Desafio "Acentuação\" -- deve continuar EXIGINDO acento correto (isAccentAnswerCorrect nunca removeu diacrítico) ===\n');
check('"étudiant" vs "etudiant" (sem acento) → incorreto (é literalmente o que o desafio testa)', isAccentAnswerCorrect('etudiant', 'étudiant'), false);
check('"étudiant" vs "étudiant" → correto', isAccentAnswerCorrect('étudiant', 'étudiant'), true);
check('espaço extra não afeta: " étudiant " vs "étudiant" → correto', isAccentAnswerCorrect(' étudiant ', 'étudiant'), true);

console.log('\n=== Regra de conclusão dos Desafios (acerto / erro leve / erro total) ===\n');
check('Acentuação: igual → ok', accentAnswerOutcome('étudiant', 'étudiant'), 'ok');
check('Acentuação: sem acento → partial (erro leve, conclui)', accentAnswerOutcome('etudiant', 'étudiant'), 'partial');
check('Acentuação: acento trocado → partial', accentAnswerOutcome('ètudiant', 'étudiant'), 'partial');
check('Acentuação: cedilha faltando → partial', accentAnswerOutcome('francais', 'français'), 'partial');
check('Acentuação: palavra diferente → fail (não conclui)', accentAnswerOutcome('professeur', 'étudiant'), 'fail');
check('Acentuação: vazio → fail', accentAnswerOutcome('', 'étudiant'), 'fail');
const refs = ['Hoje está chovendo.'];
check('Traduzir: idêntico → ok', listenTranslateOutcome('Hoje está chovendo', refs, null), 'ok');
check('Traduzir: vazio → fail', listenTranslateOutcome('  ', refs, null), 'fail');
check('Traduzir: sem relação → fail', listenTranslateOutcome('Eu gosto de café', refs, null), 'fail');
check('Traduzir: alerta de concordância força partial', listenTranslateOutcome('Hoje está chovendo', refs, { pronoun: 'eu', verb: 'comprou' }), 'partial');
check('Traduzir: similaridade média (0,55 a 0,8) → partial', listenTranslateOutcome('Hoje chove muito forte aqui', ['Hoje está chovendo forte aqui'] , null) !== 'ok', true);

console.log('\n=== Fase 3: negação, número, mustInclude/mustExclude, palavras faltantes ===\n');
const types = an => an.alerts.map(a => a.type).join(',');
check('negação: "Hoje não está chovendo" vs "Hoje está chovendo" → partial', listenTranslateOutcome('Hoje não está chovendo', refs, null), 'partial');
check('negação: alerta registrado', types(analyzeTranslation('Hoje não está chovendo', refs)), 'negation');
check('negação nos dois lados não alerta', types(analyzeTranslation('Eu não gosto de café', ['Eu não gosto de café.'])), '');
check('número: "três maçãs" vs "duas maçãs" → partial', listenTranslateOutcome('Eu como três maçãs', ['Eu como duas maçãs.'], null), 'partial');
check('número: dígito equivale à palavra (2 = duas)', types(analyzeTranslation('Eu como 2 maçãs', ['Eu como duas maçãs.'])), '');
check('número: "um"/"uma" não conta (artigo)', types(analyzeTranslation('Eu como uma maçã', ['Eu como 1 maçã.'])), '');
check('mustInclude ausente → partial', listenTranslateOutcome('Eu como uma maçã vermelha', ['Eu como uma maçã vermelha.'], null, { mustInclude: [['maçã', 'maca']] }), 'ok');
check('mustInclude: grupo não atendido → alerta', types(analyzeTranslation('Eu como uma laranja vermelha', ['Eu como uma maçã vermelha.'], { mustInclude: [['maçã']] })), 'mustInclude');
check('mustExclude presente → alerta', types(analyzeTranslation('Eu como uma pera vermelha', ['Eu como uma maçã vermelha.'], { mustExclude: ['pera'] })), 'mustExclude');
check('palavras faltantes listadas', analyzeTranslation('Eu como maçã', ['Eu como uma maçã vermelha.']).missingWords.join(','), 'vermelha');
check('acerto limpo continua ok', listenTranslateOutcome('Hoje está chovendo', refs, null, {}), 'ok');
check('frase sem relação continua fail', listenTranslateOutcome('Gosto de gatos azuis', refs, null), 'fail');

console.log(`\n${passed} passaram, ${failed} falharam.`);
if (failed > 0){
  console.log('\nFalhas:');
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
