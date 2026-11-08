// Caso da Rachel (2026-11-06): (A) "novas por dia" desconta os cartões da professora já estreados hoje;
// (C) verbo com várias formas vira cartão Normal só em cartão NOVO (cartão já entregue mantém o tipo).
// Rodar: node tests/banco-revisao-limites/test_modelo_e_fila.js
const vm = require('vm');
const { load, check, summary, read } = require('../fase-h/harness');
const { ctx } = load('frances', 'teacher-1');
ctx.escapeHTML = x => String(x == null ? '' : x);
['shared/flashcard-cloze-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/review-bank-model.js', 'shared/srs.js', 'shared/study-queue.js'].forEach(f => { try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { /* srs.js já carregado pelo harness */ } });
const R = (src, vars) => { Object.entries(vars || {}).forEach(([k, v]) => { ctx['__' + k] = v; }); return vm.runInContext(src, ctx); };

// ---- C: tipo de cartão
const aller = { item_type: 'verbo', question: 'Conjugue ALLER (ir) no presente', answer: 'je vais, tu vas, il/elle/on va, nous allons, vous allez, ils/elles vont', gap_word: 'je vais, tu vas, il/elle/on va, nous allons, vous allez, ils/elles vont' };
const verboFrase = { item_type: 'verbo', question: 'Ontem eu comi pão', answer: "Hier j'ai mangé du pain", gap_word: 'ai mangé' };
const estruturaVirgulas = { item_type: 'estrutura', question: 'q', answer: 'Je veux du pain, du fromage, du vin', gap_word: 'du fromage' };
check('verbo com várias formas (ALLER) em cartão novo vira Normal', R('rbCardMode(__i)', { i: aller }) === 'normal');
check('verbo com várias formas: cartão já entregue como Completar continua Completar', R('rbCardMode(__i, "cloze")', { i: aller }) === 'cloze');
check('verbo com várias formas: cartão já entregue como Normal continua Normal', R('rbCardMode(__i, "normal")', { i: aller }) === 'normal');
check('verbo numa frase só (sem lista) continua Completar', R('rbCardMode(__i)', { i: verboFrase }) === 'cloze');
check('estrutura com vírgulas continua Completar (regra é só de verbo)', R('rbCardMode(__i)', { i: estruturaVirgulas }) === 'cloze');
check('erro continua Digite a resposta', R('rbCardMode(__i)', { i: { item_type: 'erro', question: 'q', wrong_form: 'x', answer: 'y' } }) === 'type_answer');
const frAluna = { id: 's1', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', linked_student_id: 'u1' };
const b = JSON.parse(JSON.stringify(R('rbBuildCard(__i, __s)', { i: aller, s: frAluna })));
check('rbBuildCard de ALLER novo: cartão Normal com 2 campos (pergunta e resposta inteira)', b.ok && b.mode === 'normal' && b.fields.length === 2 && b.fields[1].content.value === aller.answer, JSON.stringify(b).slice(0, 200));
const b2 = JSON.parse(JSON.stringify(R('rbBuildCard(__i, __s, { existingMode: "cloze" })', { i: aller, s: frAluna })));
check('rbBuildCard de ALLER já entregue como Completar: continua Completar', b2.ok && b2.mode === 'cloze', JSON.stringify(b2).slice(0, 160));

// ---- A: cartões da professora não têm limite diário de novos
const hoje = R('todayStr()'), ontem = '2000-01-01';
const mk = (id, over) => Object.assign({ id, origin: 'teacher', state: 'new', reps: 0, due: 0 }, over || {});
const novosT = Array.from({ length: 28 }, (_, i) => mk('n' + i));
const novosTrilha = Array.from({ length: 28 }, (_, i) => mk('s' + i, { origin: 'study' }));
const estreados = (n, data, origin) => Array.from({ length: n }, (_, i) => mk('e' + i, { origin: origin || 'teacher', state: 'review', reps: 1, due: Date.now() + 86400000, firstLearnedDate: data }));
const fila = (pool, lim) => R('getStudyQueue(__p, { scope: "due", newCardsLimit: __l })', { p: pool, l: lim }).length;
check('A: 28 cartões novos de uma aula (professora), limite 10: entrega os 28', fila(novosT, 10) === 28);
check('A: contador diminui conforme a aluna estuda (24 já estreados hoje, 14 novos sobrando: mostra os 14)', fila(novosT.slice(0, 14).concat(estreados(24, hoje)), 10) === 14);
check('A: cartões vencidos continuam entrando junto com os novos', fila(novosT.slice(0, 12).concat([mk('v1', { state: 'review', reps: 2, due: 1 })]), 10) === 13);
check('A: cartão da TRILHA continua com o limite de novos por dia (10)', fila(novosTrilha, 10) === 10);
check('A: pool misto (trilha e professora) continua com o limite', fila(novosTrilha.concat(novosT), 10) === 10);
check('A: pool vazio não quebra', fila([], 10) === 0);
summary('Banco: limites (Rachel) -- modelo e fila');
