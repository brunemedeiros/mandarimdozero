// Banco de Revisão (lado do aluno): Observação depois de responder e veredito "quase lá".
// Rodar: node tests/banco-revisao/test_answer_extras.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const ctx = vm.createContext({ acceptedForms: (e) => (e || '').split('/').map(x => x.trim()).filter(Boolean), escapeHTML: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), t: k => ({ 'review.observation': 'Observação', 'review.almost': 'Quase lá' }[k] || k) });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../shared/review-answer-extras.js'), 'utf8'), ctx);
const R = (src) => vm.runInContext(src, ctx);

// Observação: só cartão da professora, só com texto, com escape
R("var T1 = { origin: 'teacher', teacherNote: 'Use <b>de</b> antes do substantivo.' }");
check('observação aparece para cartão da professora', R('reviewObservationHTML(T1)').includes('Observação') && R('reviewObservationHTML(T1)').includes('Use &lt;b&gt;de&lt;/b&gt; antes'));
check('sem texto não desenha nada', R("reviewObservationHTML({ origin: 'teacher', teacherNote: '  ' })") === '' && R("reviewObservationHTML({ origin: 'teacher', teacherNote: null })") === '');
check('cartão próprio e da trilha nunca mostram observação da professora', R("reviewObservationHTML({ origin: 'self', teacherNote: 'x' })") === '' && R("reviewObservationHTML({ origin: 'study', teacherNote: 'x' })") === '');
check('card nulo não quebra', R('reviewObservationHTML(null)') === '');

// Veredito de digitar
const V = (typed, forms) => R(`typedAnswerVerdict(${JSON.stringify(typed)}, ${JSON.stringify(forms)})`);
check('igual = ok', V('Je suis allée', ['Je suis allée']) === 'ok');
check('maiúscula e pontuação não importam = ok', V('je suis allée.', ['Je suis allée']) === 'ok');
check('uma das formas aceitas = ok', V('une', ['un', 'une']) === 'ok');
check('falta acento = quase', V('Je suis allee', ['Je suis allée']) === 'quase');
check('acento a mais = quase', V('éléve', ['élève']) === 'quase');
check('uma letra faltando em palavra de 5+ = quase', V('choisr', ['choisir']) === 'quase');
check('uma letra trocada em palavra de 5+ = quase', V('choisor', ['choisir']) === 'quase');
check('uma letra errada em palavra curta = errou', V('chat', ['chut']) === 'errou');
check('duas letras erradas = errou', V('choisxx', ['choisir']) === 'errou');
check('vazio = errou', V('', ['choisir']) === 'errou' && V('   ', ['choisir']) === 'errou');
check('resposta totalmente errada = errou', V('bonjour', ['choisir']) === 'errou');
check('notas: ok 2, quase 1, errou 0', R("typedAnswerGrade('ok')") === 2 && R("typedAnswerGrade('quase')") === 1 && R("typedAnswerGrade('errou')") === 0);
check('rótulo "Quase lá" só quando almost', R("reviewAlmostHTML({ almost: true })").includes('Quase lá') && R("reviewAlmostHTML({ almost: false })") === '' && R('reviewAlmostHTML(null)') === '');
// Cartão com duas formas ("allemand / allemande"): uma só, o texto inteiro ou sem espaço na barra (2026-10-16)
const E = (typed, expected) => R(`typedAnswerVerdictForExpected(${JSON.stringify(typed)}, ${JSON.stringify(expected)})`);
check('duas formas: texto inteiro = ok', E('allemand / allemande', 'allemand / allemande') === 'ok');
check('duas formas: barra sem espaço = ok', E('allemand/allemande', 'allemand / allemande') === 'ok');
check('duas formas: só uma forma = ok', E('allemande', 'allemand / allemande') === 'ok' && E('allemand', 'allemand / allemande') === 'ok');
check('duas formas: sem acento no texto inteiro = quase', E('francais / francaise', 'français / française') === 'quase');
check('duas formas: errada = errou', E('allemand / italien', 'allemand / allemande') === 'errou');
check('uma forma só continua igual', E('bonjour', 'bonjour') === 'ok' && E('', 'bonjour') === 'errou');
summary();
