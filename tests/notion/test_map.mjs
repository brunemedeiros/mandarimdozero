// Conectar Notion: peças puras (supabase/functions/notion-sync/map.mjs). Rodar: node tests/notion/test_map.mjs
import { mapRow, suggestColumns, propDate, propText } from '../../supabase/functions/notion-sync/map.mjs';
let ok = 0, fail = 0;
const check = (n, c, x) => { if (c) ok++; else { fail++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

// Colunas iguais às do Calendário de Aulas da autora (tipos reais do Notion).
const props = {
  'Tópico': { id: 'title', type: 'title' }, 'Aluno/a': { id: 'UnpncQ', type: 'select' }, 'Data': { id: 'Dt', type: 'date' },
  'Presença': { id: 'eVx6Yw', type: 'select' }, 'Para a próxima aula': { id: 'PxA', type: 'rich_text' },
  'Competências': { id: 'RFl7cw', type: 'multi_select' }, 'Idioma': { id: 'XklESw', type: 'select' },
  'Pontualidade': { id: 'S0FWPQ', type: 'select' }, 'Uso da L1': { id: 'dEhURA', type: 'select' },
  '👨🏽‍🎓 Ficha do Aluno': { id: 'Rel', type: 'relation' },
};
const sug = suggestColumns(props);
check('sugestão: Data, Aluno/a, Tópico, Para a próxima aula, Presença, Competências e Idioma',
  sug.date === 'Dt' && sug.student === 'UnpncQ' && sug.topic === 'title' && sug.homework === 'PxA' && sug.attendance === 'eVx6Yw'
  && sug.skills === 'RFl7cw' && sug.language === 'XklESw', sug);
check('sugestão não usa Pontualidade nem Uso da L1', !Object.values(sug).includes('S0FWPQ') && !Object.values(sug).includes('dEhURA'));

const other = suggestColumns({ 'Assunto': { id: 'a', type: 'title' }, 'Quando': { id: 'q', type: 'date' }, 'Estudante': { id: 'e', type: 'rich_text' }, 'Tarefa': { id: 't', type: 'rich_text' } });
check('outro Notion: Assunto e Quando reconhecidos; Estudante fica para a professora escolher', other.topic === 'a' && other.date === 'q' && other.homework === 't' && !other.student, other);

const page = {
  id: 'pg-1', last_edited_time: '2026-11-05T12:01:00.000Z', archived: false,
  properties: {
    'Tópico': { id: 'title', type: 'title', title: [{ plain_text: 'Passé ' }, { plain_text: 'composé' }] },
    'Aluno/a': { id: 'UnpncQ', type: 'select', select: { name: 'Carol 🇧🇷' } },
    'Data': { id: 'Dt', type: 'date', date: { start: '2026-11-05T16:00:00.000-03:00', end: null, time_zone: null } },
    'Presença': { id: 'eVx6Yw', type: 'select', select: { name: 'Aula dada✅' } },
    'Para a próxima aula': { id: 'PxA', type: 'rich_text', rich_text: [{ plain_text: 'Exercícios 3 e 4' }] },
    'Competências': { id: 'RFl7cw', type: 'multi_select', multi_select: [{ name: 'Gramática' }, { name: 'Escuta' }] },
    'Idioma': { id: 'XklESw', type: 'select', select: { name: 'Francês' } },
  },
};
const row = mapRow(page, sug, new Map());
check('linha: texto simples de cada coluna ligada', row.topic === 'Passé composé' && row.name === 'Carol 🇧🇷' && row.homework === 'Exercícios 3 e 4'
  && row.attendance === 'Aula dada✅' && row.skills.join() === 'Gramática,Escuta' && row.language === 'Francês', row);
check('linha: data e hora como escritas no Notion', row.date === '2026-11-05' && row.start_time === '16:00' && row.last_edited === '2026-11-05T12:01:00.000Z', row);
check('data sem hora', JSON.stringify(propDate({ type: 'date', date: { start: '2026-10-20' } })) === JSON.stringify({ date: '2026-10-20', start_time: null, time_zone: null }));
check('data vazia', propDate({ type: 'date', date: null }).date === null);
const noMap = mapRow(page, { date: 'Dt', student: 'UnpncQ' }, new Map());
check('coluna não ligada não é lida', noMap.topic === null && noMap.homework === null && noMap.skills.length === 0);
check('aluno numa coluna de relação usa o título da página relacionada',
  propText({ type: 'relation', relation: [{ id: 'r1' }] }, new Map([['r1', 'Carol Lima']])) === 'Carol Lima');
check('linha arquivada', mapRow({ ...page, archived: true }, sug, new Map()).archived === true);
console.log(`notion (peças): ${ok}/${ok + fail} ok`);
process.exit(fail ? 1 : 0);
