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
// 3) fr: acceptedForms() cru só na Conjugação (conjEvaluate e a lista de formas, que tem regra própria)
const frAF = lines('fr/app.js').filter(x => /\bacceptedForms\(/.test(x.l) && !/^\s*\/\//.test(x.l));
check('fr/app.js: acceptedForms() cru só nas 2 funções da Conjugação', frAF.length <= 2, frAF.map(x => x.n));
// 4) as telas de digitar do fr passam pelo avaliador da família latina
const src = fs.readFileSync(path.join(ROOT, 'fr/app.js'), 'utf8');
check('trilha: "Digite o que ouviu" e lacuna digitada usam lessonTypedAnswerResult', (src.match(/lessonTypedAnswerResult\(inputEl\.value/g) || []).length === 2);
check('Desafio Acentuação usa accentAnswerOutcome (família latina)', /accentAnswerOutcome\(studentAnswer, c\.targetText\)/.test(src));
summary();
