// Guarda: toda resposta digitada que compara com um cartão de DUAS FORMAS ("allemand / allemande") tem de passar
// pelos helpers que aceitam uma forma, o texto inteiro e a vírgula. Quem comparar direto com acceptedForms()
// aceita só uma forma por vez (o bug do "Digite o que ouviu" de 2026-10-17). Rodar: node tests/respostas-digitadas/test_guarda.js
const fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const ROOT = path.resolve(__dirname, '../..');
const lines = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').map((l, i) => ({ l, n: i + 1 }));

// 1) zh: nenhuma comparação digitada usa acceptedForms() cru
const zh = lines('zh/app.js').filter(x => /\bacceptedForms\(/.test(x.l) && !/^\s*\/\//.test(x.l));
check('zh/app.js não compara resposta digitada com acceptedForms() cru (use acceptedFormsTyped + typedVariants)', zh.length === 0, zh.map(x => x.n));
// 2) fr: a Revisão/Cloze usa typedAnswerVerdictForExpected, nunca typedAnswerVerdict direto
const fr = lines('fr/app.js').filter(x => /\btypedAnswerVerdict\(/.test(x.l) && !/^\s*\/\//.test(x.l));
check('fr/app.js usa typedAnswerVerdictForExpected (não typedAnswerVerdict direto)', fr.length === 0, fr.map(x => x.n));
// 3) fr: acceptedForms() cru só na Conjugação (conjExpectedInfo: a lista de formas, que tem regra própria)
// typedAlmostKind(typed, acceptedForms(...)) só explica o "quase" (acento ou letra) e já trata o texto inteiro por dentro.
// Etapa 5a da paridade (2026-10-23): a Conjugação saiu do fr/app.js para shared/conjugacao.js. O fr/app.js fica sem
// nenhum acceptedForms() cru, e o motor comum só com o da lista de formas da Conjugação (conjExpectedInfo).
const frAF = lines('fr/app.js').filter(x => /\bacceptedForms\(/.test(x.l) && !/^\s*\/\//.test(x.l) && !/typedAlmostKind\(/.test(x.l));
check('fr/app.js: nenhum acceptedForms() cru (a Conjugação foi para shared/conjugacao.js)', frAF.length === 0, frAF.map(x => x.n));
const conjAF = lines('shared/conjugacao.js').filter(x => /\bacceptedForms\(/.test(x.l) && !/^\s*\/\//.test(x.l));
const conjSrc = fs.readFileSync(path.join(ROOT, 'shared/conjugacao.js'), 'utf8');
check('shared/conjugacao.js: acceptedForms() cru só na lista de formas (conjExpectedInfo)', conjAF.length === 1
  && /function conjExpectedInfo\([^)]*\)\{\n[^\n]*\n\s+const plain = \{ display: expected, accepted: acceptedForms\(expected\) \};/.test(conjSrc), conjAF.map(x => x.n));
// 4) as telas de digitar do fr passam pelo avaliador da família latina
const src = fs.readFileSync(path.join(ROOT, 'fr/app.js'), 'utf8');
// Paridade 5d: os dois exercícios são comuns (shared/core/licao-exercicios.js) e corrigem pelo gancho do site; o do fr é
// lessonTypedAnswerResult (família latina).
const exSrc = fs.readFileSync(path.join(ROOT, 'shared/core/licao-exercicios.js'), 'utf8');
const frHooks = fs.readFileSync(path.join(ROOT, 'fr/lang-hooks.js'), 'utf8');
check('trilha: "Digite o que ouviu" e lacuna digitada usam lessonTypedAnswerResult', (exSrc.match(/LANG_HOOKS\.typedAnswer\.verdict\(inputEl\.value/g) || []).length === 2
  && /verdict: \(given, x\) => \{ const r = lessonTypedAnswerResult\(given, x\.f\);/.test(frHooks));
// A tela da Acentuação foi para shared/desafios-telas.js na etapa 5c da paridade (docs/historico/29-*).
const desafiosTelas = fs.readFileSync(path.join(ROOT, 'shared/desafios-telas.js'), 'utf8');
check('Desafio Acentuação usa accentAnswerOutcome (família latina)', /accentAnswerOutcome\(studentAnswer, c\.targetText\)/.test(desafiosTelas));
summary();
