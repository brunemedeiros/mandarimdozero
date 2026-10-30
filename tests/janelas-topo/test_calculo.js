// Janelas do topo (2026-10-30): contas puras, sem navegador. Carrega os arquivos de PRODUÇÃO.
//  - TopPopCalc (shared/janelas-topo.js): semana de segunda a domingo, estados da sequência, recorde, amigos, frase do XP;
//  - AccountProgress (shared/account-progress.js): recorde (bestStreak) guardado na conta, nasce do histórico e só sobe;
//  - buildStreakWeekData (shared/core/gamificacao.js): janela depois da lição também de segunda a domingo.
// Rodar: node tests/janelas-topo/test_calculo.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) pass++; else { fail++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

global.LanguageRegistry = { isKnownAppKey: k => ['frances', 'mandarim', 'portugues'].includes(k) };
const AP = require(path.join(ROOT, 'shared/account-progress.js'));
global.AccountProgress = AP;
const C = require(path.join(ROOT, 'shared/janelas-topo.js'));

function range(a, b){ const o = {}; const d = new Date(a + 'T12:00:00'), e = new Date(b + 'T12:00:00'); for (; d <= e; d.setDate(d.getDate() + 1)) o[d.toISOString().slice(0, 10)] = 3; return o; }
const WED = new Date(2026, 9, 28, 11); // quarta 28/10/2026
const SUN = new Date(2026, 10, 1, 20); // domingo 01/11/2026
const MON = new Date(2026, 9, 26, 8);

// ---- semana de segunda a domingo ----
{
  const log = Object.assign(range('2026-10-24', '2026-10-28'));
  const w = C.weekDays(WED, log);
  check('quarta: 7 dias de seg 26/10 a dom 01/11', w.length === 7 && w[0].key === '2026-10-26' && w[6].key === '2026-11-01', w.map(d => d.key));
  check('quarta: seg..dom em ordem (jsDay 1..6,0)', w.map(d => d.jsDay).join() === '1,2,3,4,5,6,0');
  check('quarta: hoje é o 3º (idx 2)', w.filter(d => d.today).map(d => d.idx).join() === '2');
  check('quarta: estudou seg, ter, qua (sáb/dom da semana anterior não entram)', w.filter(d => d.done).map(d => d.key).join() === '2026-10-26,2026-10-27,2026-10-28');
  check('quarta: qui a dom são futuros', w.filter(d => d.future).length === 4 && w.slice(3).every(d => d.future));
  const s = C.weekDays(SUN, log);
  check('domingo: a semana ainda começa na segunda 26/10 (não vira a próxima)', s[0].key === '2026-10-26' && s[6].today && !s.some(d => d.future));
  const m = C.weekDays(MON, {});
  check('segunda: hoje é o 1º dia, 6 futuros', m[0].today && m.filter(d => d.future).length === 6);
}

// ---- estados da sequência ----
check('sequência viva e feita hoje = done', JSON.stringify(C.streakState(5, '2026-10-28', '2026-10-28')) === '{"n":5,"state":"done"}');
check('sequência viva, hoje ainda não = pending', C.streakState(4, '2026-10-27', '2026-10-28').state === 'pending');
check('sequência zerada = zero, sem número', JSON.stringify(C.streakState(0, '2026-10-24', '2026-10-28')) === '{"n":0,"state":"zero"}');

// ---- recorde ----
{
  const log = Object.assign(range('2026-10-05', '2026-10-13'), range('2026-10-24', '2026-10-28'));
  check('longestRun: maior bloco de dias seguidos (9)', AP.longestRun(log) === 9);
  check('longestRun ignora dia com 0 e chave inválida', AP.longestRun({ '2026-10-01': 1, '2026-10-02': 0, '2026-10-03': 2, lixo: 5 }) === 1);
  check('longestRun atravessa virada de mês', AP.longestRun(range('2026-10-30', '2026-11-02')) === 4);
  check('recorde mostrado = histórico quando nada guardado', C.bestStreak(0, 5, log, 5) === 9);
  check('recorde guardado maior que o histórico vale', C.bestStreak(30, 5, log, 5) === 30);
  check('recorde nunca menor que a sequência atual', C.bestStreak(3, 12, {}, 12) === 12);
  // mergeAccount: nasce do histórico, guarda o maior, só sobe
  const a = AP.mergeAccount({}, { streak: 5, lastStudyDay: '2026-10-28', activityLog: log });
  check('mergeAccount: bestStreak nasce do activityLog (9)', a.bestStreak === 9, a.bestStreak);
  const b = AP.mergeAccount({ bestStreak: 30 }, { streak: 5, lastStudyDay: '2026-10-28', activityLog: log });
  check('mergeAccount: recorde guardado (30) não cai', b.bestStreak === 30, b.bestStreak);
  const c = AP.mergeAccount({ bestStreak: 30, streak: 30, lastStudyDay: '2026-10-27' }, { streak: 31, lastStudyDay: '2026-10-28' });
  check('mergeAccount: sequência nova maior (31) atualiza o recorde', c.bestStreak === 31, c.bestStreak);
  const row = { _account: { bestStreak: 14 }, frances: { streak: 2, lastStudyDay: '2026-10-28', activityLog: range('2026-10-27', '2026-10-28') }, mandarim: { streak: 20, lastStudyDay: '2026-09-01', activityLog: {} } };
  const d = AP.deriveAccountFromRow(row);
  check('deriveAccountFromRow: recorde = maior entre _account (14) e blocos (streak 20 congelado)', d.bestStreak === 20, d.bestStreak);
  const st = { bestStreak: 25 };
  AP.applyAccountToState(st, { bestStreak: 14 });
  check('applyAccountToState: nunca baixa o recorde do STATE', st.bestStreak === 25);
  AP.applyAccountToState(st, { bestStreak: 40 });
  check('applyAccountToState: sobe para o da conta', st.bestStreak === 40);
  check('pickAccount leva bestStreak do bloco', AP.pickAccount({ bestStreak: 7, xp: 3 }).bestStreak === 7 && !('xp' in AP.pickAccount({ bestStreak: 7, xp: 3 })));
  check('conta sem nada não ganha bestStreak 0', !('bestStreak' in AP.mergeAccount({}, {})));
}

// ---- amigos ----
{
  const rows = [{ user_id: 'a', joint_streak: 3 }, { user_id: 'b', joint_streak: 12 }, { user_id: 'c', joint_streak: 1 }, { user_id: 'd', joint_streak: 0 }];
  const s = C.friendsSummary(rows);
  check('amigos: conta todos os amigos (4)', s.count === 4);
  check('amigos: ativas só com 2+ dias, maior primeiro', JSON.stringify(s.active) === '[{"userId":"b","days":12},{"userId":"a","days":3}]', s.active);
  check('sem amigos: count 0', C.friendsSummary([]).count === 0 && C.friendsSummary(null).count === 0);
}

// ---- frase do XP ----
{
  const ser = (a, b, known = true) => [{ amount: a, known: true, current: true }, { amount: b, known }];
  check('XP: +25 quando a atual (65) é maior que a passada (40)', C.xpBetterThanLast(ser(65, 40)) === 25);
  check('XP: nada quando igual', C.xpBetterThanLast(ser(40, 40)) === 0);
  check('XP: nada quando menor', C.xpBetterThanLast(ser(30, 90)) === 0);
  check('XP: nada enquanto a semana passada não carregou', C.xpBetterThanLast(ser(65, 0, false)) === 0);
}

// ---- janela depois da lição (gamificacao.js) ----
{
  const sb = { STATE: { activityLog: range('2026-10-24', '2026-10-28') }, STREAK_DAY_LABELS: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], Date, Number, String, Object, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/core/gamificacao.js'), 'utf8'), sb);
  const w = sb.buildStreakWeekData(WED);
  check('depois da lição: seg a dom', w.map(d => d.label).join() === 'seg,ter,qua,qui,sex,sáb,dom', w.map(d => d.label));
  check('depois da lição: hoje na quarta, futuros qui..dom', w[2].isToday && w.filter(d => d.isFuture).length === 4);
  check('depois da lição: dias estudados só seg, ter, qua', w.map(d => d.done ? 1 : 0).join('') === '1110000');
  check('depois da lição: mesmas chaves da janela do topo', w.map(d => d.key).join() === C.weekDays(WED, {}).map(d => d.key).join());
}

console.log(`janelas-topo (cálculo): ${pass}/${pass + fail} ok`);
process.exit(fail ? 1 : 0);
