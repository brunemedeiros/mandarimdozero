// Banco de Revisão: modelo puro (item -> cartão nativo com o motor real, geração automática, Récap, agendamento, estatísticas, markdown).
// Rodar: node tests/banco-revisao/test_model.js
const vm = require('vm');
const { load, check, summary, read } = require('../fase-h/harness');
const { ctx } = load('frances', 'teacher-1');
ctx.escapeHTML = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
['shared/flashcard-cloze-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/review-bank-model.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
const R = (src, vars) => { Object.entries(vars || {}).forEach(([k, v]) => { ctx['__' + k] = v; }); return vm.runInContext(src, ctx); };
const J = x => JSON.parse(JSON.stringify(x));

const frAluna = { id: 's1', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', linked_student_id: 'u1' };
const ptAluno = { id: 's2', language_app_key: 'portugues', reference_language: 'en', status: 'ativo', linked_student_id: 'u2' };
const zhAluno = { id: 's3', language_app_key: 'mandarim', reference_language: 'pt', status: 'ativo', linked_student_id: 'u3' };
const semConta = { id: 's4', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', linked_student_id: null };
const vocab = { item_type: 'vocabulario', question: 'to run (code)', answer: 'rodar', explanation: 'Nesse momento, a IA está rodando no meu telefone. = In this moment, the AI is running on my phone.', class_date: '2026-10-07', status: 'pendente' };
const erro = { item_type: 'erro', question: '1 million dollars', wrong_form: '1 milhão dólares', answer: '1 milhão de dólares', explanation: 'milhão/milhões + de + noun', class_date: '2026-09-11', status: 'pendente' };
const estrutura = { item_type: 'estrutura', question: 'Besides being cheap, the course is also fast.', answer: 'Além de barato, o curso também é rápido.', gap_word: 'Além de', status: 'pendente' };

// --- tipo de cartão
check('vocabulário vira "ver resposta" (normal)', R('rbCardMode(__i)', { i: vocab }) === 'normal');
check('erro vira digitar (type_answer)', R('rbCardMode(__i)', { i: erro }) === 'type_answer');
check('estrutura com frase e lacuna vira completar (cloze)', R('rbCardMode(__i)', { i: estrutura }) === 'cloze');
check('lacuna que não está na frase não vira cloze', R('rbCardMode(__i)', { i: { ...estrutura, gap_word: 'zzz' } }) === 'normal');
check('frase curta (menos de 3 palavras) não vira cloze', R('rbCardMode(__i)', { i: { item_type: 'estrutura', answer: 'valer pena', gap_word: 'valer', question: 'q' } }) === 'normal');
check('lacuna com alternativas usa a que aparece', R('rbMakeCloze(__a, __g)', { a: 'Eu estava animado hoje', g: 'estive / estava' }) === 'Eu {{c1::estava}} animado hoje');

// --- cartão nativo com o motor real
const b1 = J(R('rbBuildCard(__i, __s)', { i: vocab, s: frAluna }));
check('vocabulário: monta cartão normal válido', b1.ok && b1.mode === 'normal' && b1.fields.length === 2, JSON.stringify(b1).slice(0, 200));
check('vocabulário: frente = pergunta (língua de referência), verso = resposta (língua estudada)', b1.fields[0].content.value === 'to run (code)' && b1.fields[0].lang === 'pt' && b1.fields[1].content.value === 'rodar' && b1.fields[1].lang === 'fr');
check('observação vai para a nota do cartão', b1.note === vocab.explanation);
check('tags: banco, tipo e aula', JSON.stringify(b1.tags) === JSON.stringify(['banco-de-revisao', 'tipo-vocabulario', 'aula-2026-10-07']), JSON.stringify(b1.tags));
const b2 = J(R('rbBuildCard(__i, __s)', { i: erro, s: frAluna }));
check('erro: digitar, prompt com "Corrija:" na língua de referência e a forma errada', b2.ok && b2.mode === 'type_answer' && b2.fields[0].content.value.startsWith('Corrija: 1 milhão dólares') && b2.fields[0].lang === 'pt' && b2.fields[1].content.value === '1 milhão de dólares', JSON.stringify(b2.fields));
const b2en = J(R('rbBuildCard(__i, __s)', { i: erro, s: ptAluno }));
check('erro para aluno que lê em inglês usa "Fix it:"', b2en.ok && b2en.fields[0].content.value.startsWith('Fix it: ') && b2en.fields[0].lang === 'en' && b2en.fields[1].lang === 'pt');
const b3 = J(R('rbBuildCard(__i, __s)', { i: estrutura, s: frAluna }));
check('estrutura: completar com {{c1::Além de}} e tradução no 2º campo', b3.ok && b3.mode === 'cloze' && b3.fields[0].content.value === '{{c1::Além de}} barato, o curso também é rápido.' && b3.fields[1].content.value === estrutura.question, JSON.stringify(b3.fields));
check('mandarim não gera automático (pinyin)', J(R('rbBuildCard(__i, __s)', { i: vocab, s: zhAluno })).ok === false);
check('item incompleto não gera', J(R('rbBuildCard(__i, __s)', { i: { item_type: 'erro', question: 'q', answer: 'a' }, s: frAluna })).ok === false);

// o cartão montado vira CardInstances no motor (o mesmo caminho do aluno)
const row = (b, id) => ({ id, teacher_id: 't', student_id: 'u1', language_app_key: 'frances', status: 'active', revision: 0, fields: b.fields, card_generation_mode: b.mode, note: b.note, tags: b.tags, front: b.front, back_trans: b.back_trans });
const cards1 = J(R("buildEngineCardsFromRow(__r, { origin: 'teacher', appKey: 'frances', idPrefix: 't' }).map(c => ({ id: c.id, teacherNote: c.teacherNote, type: c.cardInstance.cardTypeId }))", { r: row(b1, 501) }));
check('vocabulário vira 1 CardInstance normal com a observação', cards1.length === 1 && cards1[0].id === 't501' && cards1[0].type === 'normal' && cards1[0].teacherNote === vocab.explanation, JSON.stringify(cards1));
const cards2 = J(R("buildEngineCardsFromRow(__r, { origin: 'teacher', appKey: 'frances', idPrefix: 't' }).map(c => ({ id: c.id, type: c.cardInstance.cardTypeId }))", { r: row(b2, 502) }));
check('erro vira 1 CardInstance de digitar', cards2.length === 1 && cards2[0].type === 'type_answer', JSON.stringify(cards2));
const cards3 = J(R("buildEngineCardsFromRow(__r, { origin: 'teacher', appKey: 'frances', idPrefix: 't' }).map(c => ({ id: c.id, type: c.cardInstance.cardTypeId }))", { r: row(b3, 503) }));
check('estrutura vira 1 CardInstance cloze (id com marca)', cards3.length === 1 && cards3[0].type === 'cloze' && cards3[0].id === 't503-c1', JSON.stringify(cards3));

// --- geração automática
const ready = (i, s, st) => J(R('rbReadyForAuto(__i, __s, __st)', { i, s, st: st || { auto_generate: true } }));
check('pronto: sem dúvida, completo, aluno vinculado', ready(vocab, frAluna).ok === true);
check('com "Para conferir" fica em Pendentes', ready({ ...vocab, check_note: 'conferir' }, frAluna).reason === 'has_doubt');
check('com proposta de revisão fica em Pendentes', ready({ ...vocab, proposal: { acao: 'editar' } }, frAluna).reason === 'has_proposal');
check('erro sem forma errada não é automático', ready({ ...erro, wrong_form: '' }, frAluna).reason === 'incomplete');
check('aluno sem conta não gera cartão', ready(vocab, semConta).reason === 'not_linked');
check('aluno ligado a uma Turma (096) também gera', ready(vocab, { ...semConta, language_app_key: 'frances', classroom_id: 51 }).ok === true);
check('mandarim não é automático', ready(vocab, zhAluno).reason === 'needs_pinyin');
check('aluno arquivado não gera', ready(vocab, { ...frAluna, status: 'arquivado' }).reason === 'archived');
check('configuração desligada para tudo', ready(vocab, frAluna, { auto_generate: false }).reason === 'auto_off');
check('item sensível nunca é automático', ready({ ...vocab, sensitive: true }, frAluna).reason === 'sensitive');
check('item já aprovado/cortado não é reaprovado', ready({ ...vocab, status: 'aprovado' }, frAluna).reason === 'not_pending' && ready({ ...vocab, status: 'cortado' }, frAluna).reason === 'not_pending');

// --- agendamento e récap
const S = (lv, o) => J(R('rbNextSchedule(__lv, __o, "2026-10-12")', { lv, o }));
check('acertou sobe de nível e agenda mais longe', S(0, 'acertou').level === 1 && S(0, 'acertou').due_date === '2026-10-15' && S(3, 'acertou').due_date === '2026-11-11');
check('ajuda mantém o nível', S(2, 'ajuda').level === 2 && S(2, 'ajuda').due_date === '2026-10-19');
check('errou volta ao nível 0, amanhã', S(5, 'errou').level === 0 && S(5, 'errou').due_date === '2026-10-13');
check('nível máximo 9', S(9, 'acertou').level === 9);
const it = (id, extra) => ({ id, status: 'aprovado', level: 0, due_date: null, last_result: null, class_date: '2026-07-01', ...extra });
const pool = [it('a', { due_date: '2026-10-20' }), it('b', { due_date: '2026-10-01' }), it('c', { due_date: '2026-10-05', last_result: 'errou' }), it('d'), it('e', { status: 'pendente' }), it('f', { status: 'cortado' }), it('g', { due_date: '2026-09-01', level: 3 })];
const rc = J(R('rbSelectRecap(__p, "2026-10-14", 8).map(i => i.id)', { p: pool }));
check('récap: só aprovados vencidos até a aula, errados primeiro, depois nunca revistos e os mais atrasados', JSON.stringify(rc) === JSON.stringify(['c', 'd', 'g', 'b']), JSON.stringify(rc));
check('récap respeita o tamanho', J(R('rbSelectRecap(__p, "2026-12-31", 2).length', { p: pool })) === 2);

// --- estatísticas
const rev = [
  { review_date: '2026-10-10', outcome: 'acertou', reason: null, mode: 'recap' }, { review_date: '2026-10-10', outcome: 'errou', reason: 'ordem', mode: 'recap' },
  { review_date: '2026-10-12', outcome: 'ajuda', reason: null, mode: 'erros' }, { review_date: '2026-10-12', outcome: 'errou', reason: 'ordem', mode: 'erros' }, { review_date: '2026-10-12', outcome: 'errou', reason: 'conjugacao', mode: 'erros' },
];
const st = J(R('rbStatsFromReviews(__r)', { r: rev }));
check('estatísticas: total, dias e porcentagens', st.total === 5 && st.days === 2 && st.okPct === 20 && st.helpPct === 20 && st.wrongPct === 60, JSON.stringify(st));
check('estatísticas: motivos de erro ordenados', JSON.stringify(st.byReason) === JSON.stringify([['ordem', 2], ['conjugacao', 1]]));
check('estatísticas: acerto por aula', st.byDay.length === 2 && st.byDay[0].date === '2026-10-10' && st.byDay[0].pct === 50);
check('estatísticas sem respostas não quebram', J(R('rbStatsFromReviews([])')).total === 0);
const ov = J(R('rbOverviewRow(__s, __i, __r, __rc, "2026-10-12")', { s: { id: 's1', name: 'Evan', language_app_key: 'portugues', status: 'ativo', linked_student_id: 'u', lesson_dates: ['2026-10-12', '2026-10-14'], last_entry_read: '2026-10-07' }, i: pool, r: rev, rc: { class_date: '2026-10-09' } }));
check('visão geral: próxima aula, pendentes, aprovados, dias desde o caderno, acerto 30d', ov.nextLesson === '2026-10-12' && ov.pending === 1 && ov.approved === 5 && ov.daysSinceEntry === 5 && ov.accuracy === 20 && ov.errors30 === 3 && ov.topReason === 'ordem' && ov.recapUsed === '2026-10-10' && ov.recapGenerated === '2026-10-09', JSON.stringify(ov));

// --- texto da pergunta no Modo aula
const pt = J(R('rbPromptText(__i, { say: "Como se diz:", fix: "Corrija:" })', { i: erro }));
check('pergunta de erro: Corrija + forma errada + sentido', pt.prefix === 'Corrija:' && pt.wrong === true && pt.text === erro.wrong_form && pt.hint === erro.question);
check('pergunta de pronúncia é o próprio texto', J(R('rbPromptText(__i, {}).prefix', { i: { item_type: 'pronuncia', question: "How do you pronounce 'significado'?" } })) === '');

// --- motivos por tipo (os do Banco antigo)
check('motivos por tipo de item', JSON.stringify(J(R('RB_REASONS_BY_TYPE.erro'))) === '["repetiu","corrigiu_parte"]' && J(R('RB_REASONS_BY_TYPE.estrutura')).includes('preposicao') && J(R('RB_REASONS')).length === 14);
// --- markdown do Manual (tudo escapado)
const md = R('rbMarkdownToHTML(__m)', { m: '# Manual\n\nTexto com **negrito**, `código` e <script>x</script>.\n\n- um\n- dois\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n1. primeiro\n2. segundo\n\n```\n<b>cru</b>\n```\n---' });
check('markdown: títulos, listas, tabela, código, negrito', md.includes('<h2>Manual</h2>') && md.includes('<strong>negrito</strong>') && md.includes('<ul><li>um</li><li>dois</li></ul>') && md.includes('<th>a</th>') && md.includes('<td>2</td>') && md.includes('<ol>') && md.includes('<hr>'));
check('markdown nunca deixa HTML cru passar', !md.includes('<script>') && md.includes('&lt;script&gt;') && md.includes('&lt;b&gt;cru&lt;/b&gt;'));
summary();
