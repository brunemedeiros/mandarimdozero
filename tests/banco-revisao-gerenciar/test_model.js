// Banco de Revisão, gerenciar alunos e itens (migration 137): funções puras do modelo.
// Rodar: node tests/banco-revisao-gerenciar/test_model.js
const vm = require('vm');
const { load, check, summary, read } = require('../fase-h/harness');
const { ctx } = load('frances', 'teacher-1');
ctx.escapeHTML = x => String(x == null ? '' : x);
['shared/flashcard-cloze-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/review-bank-model.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
const R = (src, vars) => { Object.entries(vars || {}).forEach(([k, v]) => { ctx['__' + k] = v; }); return vm.runInContext(src, ctx); };
const J = x => JSON.parse(JSON.stringify(x));

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
check('id do caderno a partir do link /edit', R('rbNotebookIdFromInput(__x)', { x: 'https://docs.google.com/document/d/' + ID + '/edit?tab=t.0' }) === ID);
check('id do caderno a partir do link com /u/0/', R('rbNotebookIdFromInput(__x)', { x: 'https://docs.google.com/document/u/0/d/' + ID + '/edit' }) === ID);
check('id puro vale', R('rbNotebookIdFromInput(__x)', { x: '  ' + ID + ' ' }) === ID);
check('texto sem cara de caderno recusa', R('rbNotebookIdFromInput(__x)', { x: 'meu caderno novo' }) === null && R('rbNotebookIdFromInput(__x)', { x: '' }) === null);
check('link do caderno', R('rbNotebookUrl(__x)', { x: ID }) === 'https://docs.google.com/document/d/' + ID + '/edit' && R('rbNotebookUrl(__x)', { x: null }) === '');

const S = (id, name, extra) => Object.assign({ id, name, language_app_key: 'frances', status: 'ativo', notebook_id: null, linked_student_id: null, classroom_id: null }, extra || {});
const pairs = (list, dis) => J(R('rbDuplicatePairs(__l, __d)', { l: list, d: dis || [] })).map(p => p.keep.id + '<-' + p.drop.id);
check('nome que começa pelo outro é duplicado (Luana / Luana Baionne)', pairs([S('a', 'Luana Baionne', { linked_student_id: 'u' }), S('b', 'Luana')]).join() === 'a<-b');
check('mesmo caderno é duplicado mesmo com nomes diferentes', pairs([S('a', 'Bea', { notebook_id: ID }), S('b', 'Beatriz Souza', { notebook_id: ID })]).length === 1);
check('nomes só parecidos por letras não contam (Ana x Anabela)', pairs([S('a', 'Ana'), S('b', 'Anabela')]).length === 0);
check('idiomas diferentes não são duplicados', pairs([S('a', 'Maxi'), S('b', 'Maxi', { language_app_key: 'portugues' })]).length === 0);
check('acentos e maiúsculas são ignorados', pairs([S('a', 'Raíssa'), S('b', 'raissa silva')]).length === 1);
check('"Não é duplicado" some da lista', pairs([S('a', 'Luana Baionne'), S('b', 'Luana')], ['b|a']).length === 0);
check('fica quem tem conta/turma, depois quem está ativo', pairs([S('a', 'Luana', { status: 'arquivado' }), S('b', 'Luana Baionne')]).join() === 'b<-a' && pairs([S('a', 'Sandra'), S('b', 'Sandra e Eduardo', { classroom_id: 3 })]).join() === 'b<-a');

const it = (o) => Object.assign({ id: 'i', bank_student_id: 'a', language_app_key: 'frances', status: 'pendente', sensitive: false }, o || {});
check('lote: pendente limpo entra', R('rbBatchSelectable(__i, [])', { i: it() }) === true);
check('lote: sensível não entra', R('rbBatchSelectable(__i, [])', { i: it({ sensitive: true }) }) === false);
check('lote: aprovado ou cortado não entra', R('rbBatchSelectable(__i, [])', { i: it({ status: 'aprovado' }) }) === false && R('rbBatchSelectable(__i, [])', { i: it({ status: 'cortado' }) }) === false);
check('lote: com pedido aberto da aluna não entra', R('rbBatchSelectable(__i, [{id:1}])', { i: it() }) === false);

const stu = [S('a', 'A'), S('b', 'B'), S('c', 'C', { status: 'arquivado' }), S('d', 'D', { language_app_key: 'portugues' })];
check('mover: só alunos ativos do mesmo idioma, menos o próprio', J(R('rbMoveTargets(__s, __i)', { s: stu, i: it() })).map(x => x.id).join() === 'b');
check('erros das RPCs viram chave de texto', R("rbManageErrKey('ERROR: has_card_other_recipient')") === 'err.has_card_other_recipient' && R("rbManageErrKey('has_card')") === 'err.has_card' && R("rbManageErrKey('boom')") === null);
check('has_card_other_recipient não é confundido com has_card', R("rbManageErrKey('has_card_other_recipient')") === 'err.has_card_other_recipient');
summary();
