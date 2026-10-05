// Fase 9: comparador de "Ouça e traduza" por idioma.
// 1) pt-BR: idêntico ao código ORIGINAL (extraído do fr/app.js do commit anterior)
//    em um corpus grande (traduções de referência reais + respostas mutadas).
// 2) en: casos de aceitação, erro e concordância.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.CMP_BASE || '3fec163';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

const orig = execSync(`git show ${BASE}:fr/app.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const a = orig.indexOf('function normalizeForTranslationCompare'), b = orig.indexOf('function openListenTranslatePlayer');
const O = {}; vm.runInNewContext(orig.slice(a, b) + ';this.sim=translationSimilarity;this.acc=isTranslationAcceptable;this.mis=translationHasPersonMismatch;', O);
const W = { window: {} }; W.window = W; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'shared', 'translation-compare.js'), 'utf8'), W);
const PT = W.TranslationCompare.forLang('pt-BR'), EN = W.TranslationCompare.forLang('en');

// corpus pt: referências reais dos lotes + mutações
const refs = [];
for (const f of fs.readdirSync(path.join(ROOT, 'fr/scripts/challenges_import')).filter(x => /^lote-a1-m\d\.json$/.test(x))){
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import', f), 'utf8')); const arr = Array.isArray(j) ? j : (j.challenges || Object.values(j)[0]);
  (arr || []).forEach(c => { if (c.referenceTranslations) refs.push(c.referenceTranslations); });
}
const answers = ['eu comprou um livro', 'ele estou aqui', 'nós vamos ao cinema', '', '   ', 'a gente foi ao mercado ontem', 'tu fala francês', 'eles come muito', 'eu sou brasileiro', 'Eu comprei um livro novo ontem'];
refs.forEach(rs => rs.forEach(r => answers.push(r, r.toUpperCase(), r.split(' ').slice(0, 3).join(' '), r.replace(/\b(eu|ele|ela)\b/gi, 'eles'))));
let diff = 0, total = 0;
answers.forEach(ans => { total++; if (O.mis(ans) !== null ? JSON.stringify(O.mis(ans)) !== JSON.stringify(PT.personMismatch(ans)) : PT.personMismatch(ans) !== null) diff++;
  refs.slice(0, 40).forEach(rs => { total++; if (O.acc(ans, rs) !== PT.isAcceptable(ans, rs)) diff++; rs.forEach(r => { total++; if (O.sim(ans, r) !== PT.similarity(ans, r)) diff++; }); }); });
check(`pt-BR idêntico ao original em ${total} comparações`, diff === 0 && refs.length > 10, { diff, refs: refs.length });

// en
const ok = (s, r) => EN.isAcceptable(s, r);
check('en: igual', ok('I bought a new book yesterday and I already finished it.', ['I bought a new book yesterday and I have already finished it.', 'Yesterday I bought a new book and already finished it.']));
check('en: contrações = formas longas', ok("I'm very tired today", ['I am very tired today']) && ok("She doesn't work today", ['She does not work today']));
check('en: pontuação/maiúsculas ignoradas', ok('WE ARE GOING TO THE MUSEUM!', ['We are going to the museum.']));
check('en: palavra de conteúdo errada reprova', !ok('I bought a red car on Monday', ['I bought a new book yesterday and I already finished it.']));
check('en: "not" não é ignorado', !ok('I am not tired', ['I am tired']), EN.similarity('I am not tired', 'I am tired'));
check('en: vazio reprova', !ok('', ['x']) && !ok('   ', ['x']));
check('en: concordância ok', EN.personMismatch('I am tired and she is happy') === null && EN.personMismatch('We are here, they have time') === null);
const m = EN.personMismatch('I is tired'); check('en: "I is" detecta', m && m.pronoun === 'i' && m.verb === 'is', m);
check('en: "he have" detecta', !!EN.personMismatch('he have a book'));
check('en: "they is" detecta', !!EN.personMismatch('they is late'));
check('en: "she are" detecta', !!EN.personMismatch('She are ready'));
check('en: subjuntivo "if I were" não é erro', EN.personMismatch('if I were you') === null);
check('en: não atravessa outro pronome', EN.personMismatch('I think he is right') === null);
check('en: "I does" detecta, "I do" não', !!EN.personMismatch('I does it') && EN.personMismatch('I do it') === null);
check('forLang desconhecido cai em pt-BR', W.TranslationCompare.forLang('xx').lang === 'pt-BR');
console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
