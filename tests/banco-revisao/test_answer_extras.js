// Banco de Revisão (lado do aluno): Observação depois de responder e veredito "quase lá".
// Rodar: node tests/banco-revisao/test_answer_extras.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const ctx = vm.createContext({ previewNextIntervalDays: (c, g) => g === 2 ? 4 : 9, formatReviewInterval: d => d + ' dias', acceptedForms: (e) => (e || '').split('/').map(x => x.trim()).filter(Boolean), escapeHTML: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), t: k => ({ 'review.observation': 'Observação', 'review.almost': 'Quase lá', 'review.almost.accent': 'Quase lá: confira os acentos', 'review.almost.letter': 'Quase lá: confira as letras', 'review.grade.good': 'Bom', 'review.grade.easy': 'Fácil', 'common.continue': 'Continuar' }[k] || k) });
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
// --- motivo do "quase" e botões do resultado digitado
const K = (typed, forms) => R(`typedAlmostKind(${JSON.stringify(typed)}, ${JSON.stringify(forms)})`);
check('"cete" para "cette" é letra (não acento)', V('cete', ['cette']) === 'quase' && K('cete', ['cette']) === 'letter');
check('"allee" para "allée" é acento', K('allee', ['allée']) === 'accent');
check('duas formas sem acento = acento; oe por œ = acento', K('francais / francaise', ['français', 'française']) === 'accent' && K('soeur', ['sœur']) === 'accent' && K('allemend', ['allemand', 'allemande']) === 'letter');
check('mensagem de acento e de letra são diferentes', R("reviewAlmostHTML({ almost: true, almostKind: 'accent' })").includes('acentos') && R("reviewAlmostHTML({ almost: true, almostKind: 'letter' })").includes('letras') && R("reviewAlmostHTML({ almost: false })") === '');
const acc = R("typedResultActionsHTML({}, { wasCorrect: true, almost: false })");
check('acerto em cheio mostra Bom e Fácil com o intervalo', acc.includes('data-grade="2"') && acc.includes('data-grade="3"') && acc.includes('4 dias') && acc.includes('9 dias') && !acc.includes('cloze-continue-btn'));
check('quase e erro mostram só Continuar (nota automática)', R("typedResultActionsHTML({}, { wasCorrect: true, almost: true })").includes('cloze-continue-btn') && R("typedResultActionsHTML({}, { wasCorrect: false, almost: false })").includes('cloze-continue-btn'));
// Cartão com duas formas ("allemand / allemande"): uma só, o texto inteiro ou sem espaço na barra (2026-10-16)
const E = (typed, expected) => R(`typedAnswerVerdictForExpected(${JSON.stringify(typed)}, ${JSON.stringify(expected)})`);
check('duas formas: texto inteiro = ok', E('allemand / allemande', 'allemand / allemande') === 'ok');
check('duas formas: barra sem espaço = ok', E('allemand/allemande', 'allemand / allemande') === 'ok');
check('duas formas: só uma forma = ok', E('allemande', 'allemand / allemande') === 'ok' && E('allemand', 'allemand / allemande') === 'ok');
check('duas formas: sem acento no texto inteiro = quase', E('francais / francaise', 'français / française') === 'quase');
check('duas formas: errada = errou', E('allemand / italien', 'allemand / allemande') === 'errou');
check('duas formas: segunda forma incompleta = errou (não vira "quase")', E('allemand / allemand', 'allemand / allemande') === 'errou' && E('allemand / allemandes', 'allemand / allemande') === 'errou');
check('duas formas: vírgula no lugar da barra = ok', E('allemand, allemande', 'allemand / allemande') === 'ok' && E('allemand , allemande', 'allemand / allemande') === 'ok');
check('duas formas: ordem trocada = errou', E('allemande / allemand', 'allemand / allemande') === 'errou' && E('allemande, allemand', 'allemand / allemande') === 'errou');
check('duas formas: só espaço entre elas = errou', E('allemand allemande', 'allemand / allemande') === 'errou');
check('duas formas: uma letra errada numa forma sozinha continua quase', E('allemend', 'allemand / allemande') === 'quase');
check('vírgula dentro de uma forma só não é separador', E('bonjour, madame', 'bonjour, madame / salut') === 'ok');
check('uma forma só continua igual', E('bonjour', 'bonjour') === 'ok' && E('', 'bonjour') === 'errou');
// "oe" no lugar de "œ" = quase (mesma regra da trilha, 2026-10-18)
check('oe por œ = quase', V('soeur', ['sœur']) === 'quase' && V('Coeur', ['cœur']) === 'quase');
check('ae por æ = quase', V('curriculum vitae', ['curriculum vitæ']) === 'quase');
check('œ digitado certo = ok', V('sœur', ['sœur']) === 'ok');
check('oe por œ numa das duas formas = quase', E('soeur / frere', 'sœur / frère') === 'quase');
check('oe por œ com outra letra errada = errou', V('soeor', ['sœur']) === 'errou');
summary();
