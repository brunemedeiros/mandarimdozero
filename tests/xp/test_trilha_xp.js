// XP da trilha (decisão da autora, 2026-10-15): reconhecer 1, produzir 2, "quase" 1, fechar lição 4; "Não sei" tira 1 (mín. 1); refazer lição = 0.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) pass++; else { fail++; console.log('FALHOU:', name, info === undefined ? '' : JSON.stringify(info)); } };
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const ctx = { STEP_STATE: { lessonReview: null }, STATE: { currentUnitId: 'u1' }, registerDailyExerciseFormat() {} };
vm.createContext(ctx);
const consts = read('shared/srs.js').match(/const (EXERCISE_XP_[A-Z]+|LESSON_CLOSE_XP) = \d+;/g);
check('constantes de XP da trilha existem', consts && consts.length === 4, consts);
vm.runInContext(consts.map(c => c.replace('const ', 'var ')).join('\n'), ctx);
vm.runInContext(read('shared/core/exercicios-licao.js').match(/function exerciseXP\([^)]*\)\{[\s\S]*?\n\}/)[0], ctx);

check('valores: reconhecer 1, produzir 2, quase 1, fechar lição 4',
  ctx.EXERCISE_XP_RECOGNIZE === 1 && ctx.EXERCISE_XP_PRODUCE === 2 && ctx.EXERCISE_XP_ALMOST === 1 && ctx.LESSON_CLOSE_XP === 4,
  [ctx.EXERCISE_XP_RECOGNIZE, ctx.EXERCISE_XP_PRODUCE, ctx.EXERCISE_XP_ALMOST, ctx.LESSON_CLOSE_XP]);
check('reconhecer = 1', ctx.exerciseXP({ format: 'meaning' }, ctx.EXERCISE_XP_RECOGNIZE) === 1);
check('produzir = 2', ctx.exerciseXP({ format: 'type' }, ctx.EXERCISE_XP_PRODUCE) === 2);
check('quase = 1', ctx.exerciseXP({ format: 'type' }, ctx.EXERCISE_XP_ALMOST) === 1);
check('"Não sei" no produzir = 1', ctx.exerciseXP({ askedDontKnow: true }, ctx.EXERCISE_XP_PRODUCE) === 1);
check('"Não sei" no reconhecer = 1 (mínimo)', ctx.exerciseXP({ askedDontKnow: true }, ctx.EXERCISE_XP_RECOGNIZE) === 1);
ctx.STEP_STATE.lessonReview = { unitId: 'u1' };
check('refazer lição concluída = 0', ctx.exerciseXP({ format: 'type' }, ctx.EXERCISE_XP_PRODUCE) === 0);

// nenhum valor fixo sobrou nos chamadores (fr, zh e módulos compartilhados)
for (const f of ['fr/app.js', 'zh/app.js', 'shared/core/quase-iguais-pinyin.js', 'shared/core/quase-iguais-textos.js', 'shared/core/licao-base.js']) {
  const src = read(f);
  check(`${f}: sem exerciseXP(ex, número)`, !/exerciseXP\(ex,\s*\d/.test(src));
  check(`${f}: sem addXP(8) de fechar lição`, !/addXP\(8\)/.test(src));
}
// paridade 5d: finishCurrentLesson (fecha a lição) é comum aos sites, em shared/core/licao-base.js
for (const f of ['shared/core/licao-base.js']) check(`${f}: fecha lição com LESSON_CLOSE_XP`, /addXP\(LESSON_CLOSE_XP\)/.test(read(f)));
console.log(`xp trilha: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
