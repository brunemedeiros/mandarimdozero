// Banco de Revisão: leitura e validação do arquivo de importação (puro). Rodar: node tests/banco-revisao/test_import.js
const vm = require('vm');
const { load, check, summary, read } = require('../fase-h/harness');
const { ctx } = load('frances', 'teacher-1');
['shared/review-bank-model.js', 'shared/review-bank-import.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
const P = (obj) => JSON.parse(JSON.stringify(vm.runInContext('rbiParse(__t)', Object.assign(ctx, { __t: typeof obj === 'string' ? obj : JSON.stringify(obj) }))));
check('texto que não é JSON', P('{{').error === 'json');
check('JSON de outro formato', P({ foo: 1 }).error === 'format' && P({ version: 2, students: [] }).error === 'format');
check('sem alunos válidos', P({ version: 1, students: [] }).error === 'empty' && P({ version: 1, students: [{ key: 'a', name: 'A', language: 'klingon' }] }).error === 'empty');
const ok = P({ version: 1, manual: '  # M  ', students: [{ key: 'a', name: ' Ana ', language: 'portugues', reference: 'xx', items: [
  { key: 'i1', type: 'erro', q: ' q ', a: 'a', wrong: 'w', gap: '', note: 'n', doubt: '', status: 'aprovado', date: '2026-07-03', level: 3, due: '2026-10-10', last: 'não é data', lastResult: 'acertou' },
  { key: 'i2', type: 'vocabulario', q: 'q', a: 'a', wrong: 'ignorado em não-erro' },
  { key: 'i1', type: 'vocabulario', q: 'dup', a: 'dup' }, { key: '', q: 'x', a: 'y' }, { key: 'i3', q: '', a: 'y' }],
  recaps: [{ date: '2026-10-09', items: ['i1', 'zzz'] }, { date: 'ruim', items: [] }], reviews: [{ item: 'i1', outcome: 'errou', reason: 'acento', mode: 'recap', date: '2026-10-08' }, { item: 'i1', outcome: 'talvez', date: '2026-10-08' }, { item: 'nada', outcome: 'errou', date: '2026-10-08' }] }] });
const s = ok.data.students[0];
check('aluno normalizado (nome sem espaços, referência inválida vira pt)', ok.ok && s.name === 'Ana' && s.reference_language === 'pt' && s.language_app_key === 'portugues');
check('itens: 2 válidos (duplicado, sem chave e sem pergunta ignorados)', s.items.length === 2 && ok.warnings.filter(w => w.code === 'item_skipped').length === 3, ok.warnings);
check('item de erro mantém forma errada; outro tipo descarta', s.items[0].wrong_form === 'w' && s.items[1].wrong_form === null);
check('datas inválidas viram nulo, nível e status preservados', s.items[0].last_review_date === null && s.items[0].due_date === '2026-10-10' && s.items[0].level === 3 && s.items[0].status === 'aprovado' && s.items[0].last_result === 'acertou');
check('récap só com itens existentes e data válida', s.recaps.length === 1 && s.recaps[0].keys.length === 1);
check('respostas: só as válidas', s.reviews.length === 1 && s.reviews[0].reason === 'acento' && s.reviews[0].mode === 'recap');
check('resumo e manual', ok.summary.students === 1 && ok.summary.items === 2 && ok.summary.manual === true && ok.data.manual === '# M');
const big = P({ version: 1, students: [{ key: 'b', name: 'B', language: 'frances', items: [{ key: 'x', q: 'q'.repeat(9000), a: 'a' }] }] });
check('texto muito longo é cortado', big.data.students[0].items[0].question.length === 4000);
summary();
