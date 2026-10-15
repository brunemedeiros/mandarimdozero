// Node/VM -- cálculos puros do Analytics (shared/admin-analytics-calc.js): período, delta, sequência, baldes, retenção por coorte,
// estatística técnica e computeAnalytics (o agregador de todas as sub-abas). Fixa o comportamento que existia antes da divisão do
// arquivo: se um número mudar sem querer, aqui aparece. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_analytics_calc_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Infinity, Intl, APP_KEY: 'frances', UNITS: [{ id: 'A1-1', level: 'A1' }, { id: 'A2-1', level: 'A2' }] };
installT(ctx); ctx.fmtDate = (d) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(d)); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-analytics-calc.js'), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const J = (x) => JSON.stringify(x);

// ---- delta ----
check('delta: sobe 50%', J(run('analyticsDelta(15, 10)')) === '{"kind":"up","pct":50}');
check('delta: cai 20%', J(run('analyticsDelta(8, 10)')) === '{"kind":"down","pct":20}');
check('delta: igual', J(run('analyticsDelta(10, 10)')) === '{"kind":"flat"}');
check('delta: saindo de zero é "novo", nunca infinito', J(run('analyticsDelta(5, 0)')) === '{"kind":"new"}');
check('delta: zero com zero não mostra nada', run('analyticsDelta(0, 0)') === null);
check('delta: nulo (taxa sem tipo rastreável) não gera delta', run('analyticsDelta(null, 5)') === null && run('analyticsDelta(5, null)') === null);

// ---- sequência e baldes ----
check('sequência: dias seguidos 3', run('analyticsLongestStreak(new Set(["2026-10-01","2026-10-02","2026-10-03","2026-10-07"]))') === 3);
check('sequência: dias soltos 1, vazio 0', run('analyticsLongestStreak(new Set(["2026-10-01","2026-10-05"]))') === 1 && run('analyticsLongestStreak(new Set())') === 0);
check('sequência: vira o mês', run('analyticsLongestStreak(new Set(["2026-09-30","2026-10-01"]))') === 2);
const b = run('analyticsBucketizeByUsers(["a","b","c","d"], [{label:"0",min:0,max:0},{label:"1-2",min:1,max:2},{label:"3+",min:3,max:Infinity}], u => ({a:0,b:2,c:3,d:9})[u]).map(x => x.count).join()');
check('baldes: distribui por faixa', b === '1,1,2', b);
check('minutos: 0, só minutos, horas e minutos', run('analyticsFormatMinutes(0)') === '0min' && run('analyticsFormatMinutes(45)') === '45min' && run('analyticsFormatMinutes(125)') === '2h 5min');
check('semana começa na segunda (quarta 2026-10-07 → 2026-10-05; domingo 2026-10-11 → 2026-10-05)', run('analyticsWeekStartKey("2026-10-07T12:00:00")') === '2026-10-05' && run('analyticsWeekStartKey("2026-10-11T12:00:00")') === '2026-10-05');
check('dia do evento: corta a data', run('analyticsDayKey("2026-09-07T10:00:00Z")') === '2026-09-07' && run('analyticsDayKey(null)') === '');

// ---- período ----
const p7 = run('(() => { const p = ANALYTICS_PERIOD_PRESETS.last7(); return { days: Math.round((p.until - p.since) / 86400000), startH: p.since.getHours(), endH: p.until.getHours() }; })()');
check('últimos 7 dias: 7 dias cheios, do começo ao fim do dia', p7.days === 7 && p7.startH === 0 && p7.endH === 23, p7);
check('hoje: começa 0h e termina 23h59', run('(() => { const p = ANALYTICS_PERIOD_PRESETS.today(); return p.since.getHours() === 0 && p.until.getHours() === 23 && p.until.getMinutes() === 59; })()'));
check('mês passado: do dia 1 ao último dia do mês anterior', run('(() => { const p = ANALYTICS_PERIOD_PRESETS.lastMonth(); const n = new Date(); return p.since.getDate() === 1 && p.since.getMonth() === ((n.getMonth() + 11) % 12) && p.until.getMonth() === p.since.getMonth() && new Date(p.until.getTime() + 86400000).getDate() === 1; })()'));
const prev = run('(() => { const s = new Date("2026-10-10T00:00:00"), u = new Date("2026-10-16T23:59:59"); const p = analyticsPreviousPeriod(s, u); return { gapMs: s - p.until, same: (u - s) === (p.until - p.since) }; })()');
check('período anterior: mesma duração, colado no atual', prev.same && prev.gapMs === 1, prev);
check('data formatada', run('analyticsFormatDate(new Date("2026-10-05T12:00:00Z"))') === '05/10/2026');
check('actor types de aluno: user e student legado', J(run('ANALYTICS_STUDENT_ACTOR_TYPES')) === '["user","student"]');

// ---- computeAnalytics ----
const ev = (user, type, name, day, o) => Object.assign({ user_id: user, language_app_key: 'frances', event_type: type, event_name: name, meta: {}, created_at: `2026-10-${day}`, session_id: null, device_type: null, browser: null, os: null }, o || {});
const EVENTS = [
  ev('u1', 'lesson_start', 'flashcard_review', '05T10:00:00Z', { session_id: 's1', device_type: 'mobile', browser: 'Chrome', os: 'Android' }),
  ev('u1', 'lesson_complete', 'flashcard_review', '05T10:10:00Z', { session_id: 's1', device_type: 'mobile', browser: 'Chrome', os: 'Android' }),
  ev('u1', 'lesson_complete', 'vocab_lesson', '05T10:20:00Z', { session_id: 's1', meta: { scorePct: 90, unitId: 'A1-1', lessonIdx: 0 } }),
  ev('u1', 'lesson_complete', 'unit_checkpoint', '06T09:00:00Z', { session_id: 's2', meta: { scorePct: 70, unitId: 'A1-1' } }),
  ev('u2', 'lesson_start', 'flashcard_review', '05T11:00:00Z', { session_id: 's3', device_type: 'desktop', browser: 'Firefox', os: 'Linux' }),
  ev('u2', 'tab_switch', 'review', '05T11:01:00Z', { session_id: 's3' }),
  ev('u2', 'tab_switch', 'leaderboard', '07T11:00:00Z', { session_id: 's4' }),
  ev('u3', 'lesson_complete', 'dictation', '08T08:00:00Z', { language_app_key: 'mandarim', meta: { score: 60 } }),
  ev('u3', 'lesson_complete', 'challenge', '09T08:00:00Z'),
];
const profiles = [{ user_id: 'u1', created_at: '2026-10-05T09:00:00Z' }, { user_id: 'u2', created_at: '2026-09-01T09:00:00Z' }, { user_id: 'u3', created_at: '2026-10-08T07:00:00Z' }];
const S = run('computeAnalytics(E, [{user_id:"u1"},{user_id:"u3"}], P, "2026-10-01T00:00:00Z")', { E: EVENTS, P: profiles });
check('alunos ativos: 3, novos no período 2 (perfis), novos ativos 2 e recorrentes 1', S.activeStudents === 3 && S.newStudents === 2 && S.newActiveCount === 2 && S.returningActiveCount === 1, [S.activeStudents, S.newStudents, S.newActiveCount, S.returningActiveCount]);
check('sessões: 4 (eventos sem sessão não contam)', S.sessions === 4);
check('exercícios: iniciados contam só tipos com início (2), concluídos 5', S.exercisesStarted === 2 && S.exercisesCompleted === 5, [S.exercisesStarted, S.exercisesCompleted]);
check('taxa geral: conclusões de todos os tipos com evento de início (revisão + ditado = 2) sobre os iniciados (2) = 100%', S.overallCompletionRate === 100, S.overallCompletionRate);
const fr = S.exerciseRows.find(r => r.name === 'flashcard_review'), vl = S.exerciseRows.find(r => r.name === 'vocab_lesson'), di = S.exerciseRows.find(r => r.name === 'dictation');
check('revisão de cartões: 2 iniciados, 1 concluído, taxa 50%, sem nota', fr.started === 2 && fr.completed === 1 && fr.completionRate === 50 && fr.avgScore === null && fr.uniqueStudents === 1, fr);
check('lição de vocabulário: sem evento de início (null), nota média 90', vl.started === null && vl.completionRate === null && vl.avgScore === 90, vl);
check('ditado: nota vem do campo score (60) e tem evento de início (0 iniciados)', di.avgScore === 60 && di.started === 0, di);
check('checkpoint: nota 70 pelo scorePct', S.exerciseRows.find(r => r.name === 'unit_checkpoint').avgScore === 70);
check('taxa de conclusão nunca passa de 100%', run('computeAnalytics(E, [], [], "2026-10-01T00:00:00Z").overallCompletionRate', { E: [ev('u1', 'lesson_complete', 'flashcard_review', '05T10:00:00Z'), ev('u1', 'lesson_complete', 'flashcard_review', '05T10:01:00Z'), ev('u1', 'lesson_start', 'flashcard_review', '05T10:00:00Z')] }) === 100);
check('sem nenhum tipo com início a taxa é nula (nunca 0%)', run('computeAnalytics(E, [], [], "2026-10-01T00:00:00Z").overallCompletionRate', { E: [ev('u1', 'lesson_complete', 'vocab_lesson', '05T10:00:00Z')] }) === null);
check('áreas (tab_switch): review 1 e leaderboard 1', S.areaRows.length === 2 && S.areaRows.every(r => r.count === 1 && r.uniqueStudents === 1));
check('funcionalidades: soma iniciados + concluídos (revisão = 3)', S.featureRows[0].name === 'flashcard_review' && S.featureRows[0].count === 3, S.featureRows[0]);
check('ativos por dia: 05→2, 06→1, 07→1, 08→1, 09→1', J(S.activeByDayRows.map(r => r.day + ':' + r.count)) === '["2026-10-05:2","2026-10-06:1","2026-10-07:1","2026-10-08:1","2026-10-09:1"]', S.activeByDayRows);
check('sessões por dia: 05→2 (s1, s3)', S.sessionsByDayRows[0].day === '2026-10-05' && S.sessionsByDayRows[0].count === 2);
check('frequência: u1 2 dias, u2 2 dias, u3 2 dias → balde 2–4 tem 3', S.freqBuckets.map(b => b.count).join() === '0,3,0,0', S.freqBuckets.map(b => b.count));
check('tempo estimado: soma do intervalo de cada sessão (s1 20 min + s3 1 min + sessões de um evento só 0)', S.estimatedStudyMinutes === 21, S.estimatedStudyMinutes);
check('por idioma: 8 eventos em francês, 1 em chinês', S.byLanguageCounts.frances === 8 && S.byLanguageCounts.mandarim === 1);
check('níveis (só do idioma do app): A1 com 1 aluno; o de outro idioma e sem unidade cai em "desconhecido"', S.levelRows.find(r => r.name === 'A1').count === 1 && S.levelRows.some(r => r.name === 'nível desconhecido' || /desconhec/i.test(r.name)), S.levelRows);
check('unidades concluídas por aluno: 1 aluno com 1 unidade (balde 1–2)', S.unitsCompletedBuckets.map(b => b.count).join() === '2,1,0,0', S.unitsCompletedBuckets.map(b => b.count));
check('lições concluídas: 1 aluno com 1 lição (balde 1–3)', S.lessonsCompletedBuckets.map(b => b.count).join() === '2,1,0,0');
check('dispositivos: mobile 2, desktop 1 e o resto "desconhecido"', S.deviceRows.find(r => r.name === 'mobile').count === 2 && S.deviceRows.find(r => r.name === 'desktop').count === 1 && S.deviceRows.some(r => /desconhec/i.test(r.name)));
check('navegador e sistema: Chrome 2, Firefox 1, Android 2, Linux 1', S.browserRows.find(r => r.name === 'Chrome').count === 2 && S.browserRows.find(r => r.name === 'Firefox').count === 1 && S.osRows.find(r => r.name === 'Android').count === 2 && S.osRows.find(r => r.name === 'Linux').count === 1);
check('exercícios por sessão: 5 concluídos / 4 sessões = 1,3', S.exercisesPerSession === 1.3, S.exercisesPerSession);
check('sequência (proxy): maior 2 e média numérica', S.maxLongestStreak === 2 && typeof S.avgLongestStreak === 'number', [S.avgLongestStreak, S.maxLongestStreak]);
check('total de eventos', S.totalEvents === 9);
const vazio = run('computeAnalytics([], [], [], "2026-10-01T00:00:00Z")');
check('sem eventos: tudo zerado, taxa nula, exercícios por sessão nulo, sem quebrar', vazio.activeStudents === 0 && vazio.sessions === 0 && vazio.overallCompletionRate === null && vazio.exercisesPerSession === null && vazio.avgLongestStreak === 0 && vazio.totalEvents === 0 && vazio.exerciseRows.length === 0);

// ---- retenção ----
const dayAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const C = run('computeRetentionCohorts(P, E)', {
  P: [{ user_id: 'a', created_at: dayAgo(40) }, { user_id: 'b', created_at: dayAgo(40) }, { user_id: 'c', created_at: dayAgo(3) }],
  E: [{ user_id: 'a', created_at: dayAgo(39) }, { user_id: 'a', created_at: dayAgo(33) }, { user_id: 'b', created_at: dayAgo(39) }, { user_id: 'c', created_at: dayAgo(3) }],
});
const old = C.find(c => c.size === 2), nova = C.find(c => c.size === 1);
check('retenção: coortes por semana, ordenadas', C.length >= 1 && C.map(c => c.week).join() === C.map(c => c.week).sort().join());
check('retenção dia 1: 2 de 2 voltaram = 100%', old.retention[1].pct === 100 && old.retention[1].eligible === 2 && old.retention[1].returned === 2, old.retention[1]);
check('retenção dia 7: só a voltou exatamente no dia 7 = 50%', old.retention[7].pct === 50 && old.retention[7].returned === 1 && old.retention[7].eligible === 2, old.retention[7]);
check('retenção dia 30: nenhum evento no dia 30 = 0% com 2 elegíveis', old.retention[30].eligible === 2);
check('coorte nova (3 dias): dia 7, 14 e 30 ainda não completaram: "—" (null), nunca 0%', nova.retention[7] === null && nova.retention[14] === null && nova.retention[30] === null);
check('coorte vazia não quebra', J(run('computeRetentionCohorts([], [])')) === '[]');

// ---- técnico ----
const T = run('computeTechnicalStats(E)', { E: [
  { user_id: 'a', event_type: 'technical_error', event_name: 'js_error', meta: {} }, { user_id: 'a', event_type: 'technical_error', event_name: 'js_error', meta: {} },
  { user_id: 'b', event_type: 'technical_error', event_name: 'audio_load_failed', meta: {} },
  { user_id: 'a', event_type: 'technical_perf', event_name: 'page_load', meta: { loadMs: 1000 } }, { user_id: 'b', event_type: 'technical_perf', event_name: 'page_load', meta: { loadMs: 3000 } },
  { user_id: 'b', event_type: 'technical_perf', event_name: 'page_load', meta: { loadMs: 'x' } }, { user_id: 'b', event_type: 'technical_perf', event_name: 'outro', meta: { loadMs: 9 } }] });
check('técnico: 3 erros, 2 alunos afetados, js_error primeiro com 1 aluno', T.totalErrors === 3 && T.affectedStudents === 2 && T.errorRows[0].name === 'js_error' && T.errorRows[0].count === 2 && T.errorRows[0].uniqueStudents === 1, T);
check('técnico: carga média 2000 ms e mediana (de 2 amostras válidas)', T.avgLoadMs === 2000 && T.perfSampleCount === 2 && T.medianLoadMs === 3000, T);
check('técnico vazio', run('computeTechnicalStats([])').avgLoadMs === null && run('computeTechnicalStats([])').totalErrors === 0);

console.log(`painel-admin analytics (cálculos): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
