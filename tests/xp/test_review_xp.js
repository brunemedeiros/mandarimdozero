// XP da Revisão (decisão da autora, 2026-10-15): Errei 0, Difícil 1, Bom 2, Fácil 4, sem redução por maturidade.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) pass++; else { fail++; console.log('FALHOU:', name, info === undefined ? '' : JSON.stringify(info)); } };

const srs = fs.readFileSync(path.join(root, 'shared/srs.js'), 'utf8');
const deck = fs.readFileSync(path.join(root, 'shared/core/revisao-decks.js'), 'utf8');
const m = deck.match(/function reviewXP\([^)]*\)\{[\s\S]*?\n\}/);
check('reviewXP existe em revisao-decks.js', !!m);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(srs.match(/const XP_PER_GRADE = [^;]+;/)[0].replace('const ', 'var '), ctx);
vm.runInContext(m[0], ctx);

check('tabela XP_PER_GRADE', JSON.stringify(ctx.XP_PER_GRADE) === JSON.stringify({ 0: 0, 1: 1, 2: 2, 3: 4 }), ctx.XP_PER_GRADE);
for (const interval of [0, 1, 20, 21, 59, 60, 365]) {
  check(`intervalo ${interval}: Errei=0 Difícil=1 Bom=2 Fácil=4`,
    ctx.reviewXP(interval, 0) === 0 && ctx.reviewXP(interval, 1) === 1 && ctx.reviewXP(interval, 2) === 2 && ctx.reviewXP(interval, 3) === 4,
    [0, 1, 2, 3].map(g => ctx.reviewXP(interval, g)));
}
check('nota inválida não gera XP', ctx.reviewXP(0, 9) === 0 && ctx.reviewXP(0, undefined) === 0);
console.log(`xp revisão: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
