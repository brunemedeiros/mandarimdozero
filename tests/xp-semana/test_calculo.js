// Conta do XP da semana (shared/xp-semana.js, parte sem DOM): semana de segunda a domingo igual ao Ranking, soma de todos
// os idiomas (Ranking "Geral"), local até o servidor responder, XP ganho depois da leitura, servidor atrasado, troca de semana.
// Rodar: node tests/xp-semana/test_calculo.js
const path = require('path');
const C = require(path.resolve(__dirname, '..', '..', 'shared', 'xp-semana.js'));
let pass = 0, fail = 0;
function eq(label, got, want){ const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; if (!ok) console.log('  FALHOU:', label, 'obtido', JSON.stringify(got), 'esperado', JSON.stringify(want)); }

// Mesma conta de currentWeekStart() (shared/core/estado-trilha-desafios.js) e leaderboardCurrentWeekStart().
function legacyWeekStart(d){ const diff = d.getDay() === 0 ? -6 : 1 - d.getDay(); const m = new Date(d); m.setDate(d.getDate() + diff);
  return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`; }
for (let i = 0; i < 400; i++){
  const d = new Date(2026, 0, 1, (i * 7) % 24, (i * 13) % 60); d.setDate(d.getDate() + i);
  if (C.weekStartOf(d) !== legacyWeekStart(d)){ eq('semana igual à do Ranking em ' + d.toISOString(), C.weekStartOf(d), legacyWeekStart(d)); break; }
  if (i === 399) eq('semana igual à do Ranking em 400 dias seguidos', true, true);
}
eq('quinta 29/10/2026 -> segunda 26/10', C.weekStartOf(new Date(2026, 9, 29, 15)), '2026-10-26');
eq('domingo 01/11 23h -> segunda 26/10', C.weekStartOf(new Date(2026, 10, 1, 23, 59)), '2026-10-26');
eq('segunda 02/11 00h01 -> semana nova', C.weekStartOf(new Date(2026, 10, 2, 0, 1)), '2026-11-02');
eq('3 semanas antes', C.shiftWeek('2026-10-26', 3), '2026-10-05');
eq('virada de ano', C.shiftWeek('2026-01-05', 1), '2025-12-29');

const now = new Date(2026, 9, 29, 12);
const rows = [
  { week_start: '2026-10-26', language_app_key: 'frances', amount: 40 },
  { week_start: '2026-10-26', language_app_key: 'mandarim', amount: 25 },
  { week_start: '2026-10-19', language_app_key: 'frances', amount: 90 },
  { week_start: '2026-10-05', language_app_key: 'mandarim', amount: 15 },
];
const weeks = C.groupRows(rows);
eq('agrupa por semana somando idiomas', weeks['2026-10-26'], { total: 65, byLang: { frances: 40, mandarim: 25 } });
const s = (local, server) => C.series({ now, local, server, appKey: 'frances' }).map(x => x.amount);
const local40 = { weekStart: '2026-10-26', amount: 40 };
eq('sem servidor: só o local na semana atual', s(local40, null)[0], 40);
eq('servidor: Geral (todos os idiomas) e 4 semanas', s(local40, { weeks, localAtFetch: 40, weekAtFetch: '2026-10-26' }), [65, 90, 0, 15]);
eq('XP ganho depois da leitura soma (+5)', s({ weekStart: '2026-10-26', amount: 45 }, { weeks, localAtFetch: 40, weekAtFetch: '2026-10-26' })[0], 70);
eq('servidor atrasado (local 60, servidor 40 lido com local 60): nunca menos que o local + outros idiomas', s({ weekStart: '2026-10-26', amount: 60 }, { weeks, localAtFetch: 60, weekAtFetch: '2026-10-26' })[0], 85);
eq('outro curso do mesmo idioma (servidor 40 > local 10): fica o servidor', s({ weekStart: '2026-10-26', amount: 10 }, { weeks, localAtFetch: 10, weekAtFetch: '2026-10-26' })[0], 65);
eq('periodXp de semana antiga não conta', s({ weekStart: '2026-10-19', amount: 300 }, null)[0], 0);
const next = C.series({ now: new Date(2026, 10, 2, 9), local: { weekStart: '2026-11-02', amount: 4 }, server: { weeks, localAtFetch: 40, weekAtFetch: '2026-10-26' }, appKey: 'frances' });
eq('virou a semana sem nova leitura: atual = local; passada = 65', next.map(x => x.amount), [4, 65, 90, 0]);
const ser = C.series({ now, local: local40, server: null, appKey: 'frances' });
eq('marca a atual e as datas', ser.map(x => [x.current, x.weekStart, x.weekEnd]), [[true, '2026-10-26', '2026-11-01'], [false, '2026-10-19', '2026-10-25'], [false, '2026-10-12', '2026-10-18'], [false, '2026-10-05', '2026-10-11']]);

console.log(`xp-semana (cálculo): ${pass}/${pass + fail} ok`);
process.exit(fail ? 1 : 0);
