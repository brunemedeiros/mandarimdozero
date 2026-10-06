// Fase 2: unitTypeOf e trailLessonCounts (shared/trail-state-model.js).
const fs = require('fs'), vm = require('vm'), path = require('path');
const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../shared/trail-state-model.js'), 'utf8'), c);
let ok = 0, bad = 0; const t = (n, x) => x ? ok++ : (bad++, console.log('FALHOU', n));
t('tipo grammar', c.unitTypeOf({ type: 'grammar' }) === 'grammar');
t('tipo padrão comunicativa', c.unitTypeOf({}) === 'communicative');
t('unitType explícito vence', c.unitTypeOf({ unitType: 'review', type: 'grammar' }) === 'review');
const g = [[{ id: 'a', lessons: [1, 2, 3, 4] }, { id: 'b', lessons: [1, 2] }, { id: 'c' }]];
const r = c.trailLessonCounts(g, { a: { completed: true, lessonIdx: 0 }, b: { lessonIdx: 1 }, c: { completed: true, completedVia: 'skip_test' } });
t('contagem: concluída inteira + parcial + sem lições = 1', r.done === 6 && r.total === 7);
t('lessonIdx fora da faixa é limitado', c.trailLessonCounts([[{ id: 'x', lessons: [1, 2] }]], { x: { lessonIdx: 99 } }).done === 2);
t('sem progresso = 0', c.trailLessonCounts([[{ id: 'x', lessons: [1, 2] }]], {}).done === 0);
console.log(`Fase 2 helpers: ${ok}/${ok + bad} verificações — ${bad ? 'FALHOU' : 'OK'}`); process.exit(bad ? 1 : 0);
