// E3 / C3: notification-cron lê a sequência da CONTA (_account) e entrega os avisos da conta uma vez só, pelo idioma principal.
// Carrega o código REAL de supabase/functions/notification-cron/index.ts (recorte withAccountProgress..processUserLanguage, types
// removidos pelo Node 22) com stubs de rede. Rodar: node tests/curso-progresso/test_cron_account.js
const fs = require('fs'), vm = require('vm'), path = require('path'), mod = require('module');
const src = fs.readFileSync(process.env.CRON_SRC || path.join(__dirname, '../../supabase/functions/notification-cron/index.ts'), 'utf8');
const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const pick = (re) => src.match(re)[0];
const code = [
  pick(/const LANGUAGES = \[[\s\S]*?\];/),
  pick(/const DAY_KEY_BY_UTC_INDEX[^\n]*/),
  pick(/function todayDateKeyUTC\(\)[\s\S]*?\n}\n/),
  pick(/function daysSince\([\s\S]*?\n}\n/),
  cut('// E3/C5: o bloco de um idioma', 'async function processWeeklyRankingResults('),
].join('\n');
const js = mod.stripTypeScriptTypes(code);
let notified = [];
const ctx = { console, Date, Object, Number, Array, Promise,
  REVIEW_OVERDUE_MIN_COUNT: 3,
  computeReviewOverdueCount: (cards) => (cards && cards.overdue) || 0,
  computeMissionProgress: () => null,
  maybeNotify: async (_s, _r, _p, _e, userId, lang, event) => { notified.push(`${lang}:${event}`); return true; },
};
vm.createContext(ctx);
vm.runInContext(js + '\nthis.B = blockForLanguage; this.W = withAccountProgress; this.P = primaryLanguageAppKey; this.U = processUserLanguage;', ctx);
let pass = 0, fail = 0;
const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FALHOU', n, x !== undefined ? JSON.stringify(x) : ''); } };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const run = async (lang, state, account, isPrimary) => { notified = []; await ctx.U({}, new Map(), new Map(), new Map(), 'u1', lang, state, account, isPrimary); return notified.slice(); };
const rules = new Map([['reengajamento', { schedule_days: [1, 2, 3] }]]);
const run2 = async (lang, state, account, isPrimary) => { notified = []; await ctx.U({}, rules, new Map(), new Map(), 'u1', lang, state, account, isPrimary); return notified.slice(); };

(async () => {
  // withAccountProgress
  t('sem conta devolve o bloco', ctx.W({ streak: 2 }, null).streak === 2);
  t('conta com sequência e dia vale por cima do bloco', ctx.W({ streak: 1, lastStudyDay: day(-3) }, { streak: 4, lastStudyDay: day(0) }).streak === 4);
  t('conta atrás do bloco não vence', ctx.W({ streak: 5, lastStudyDay: day(0) }, { streak: 9, lastStudyDay: day(-1) }).streak === 5);
  t('conta incompleta (sem lastStudyDay) é ignorada', ctx.W({ streak: 2 }, { streak: 9 }).streak === 2);
  t('lições do dia: maior valor por dia', ctx.W({ dailyLessonsLog: { [day(0)]: 1 } }, { streak: 1, lastStudyDay: day(0), dailyLessonsLog: { [day(0)]: 2, [day(-1)]: 1 } }).dailyLessonsLog[day(0)] === 2);
  // primaryLanguageAppKey
  const blocks = { frances: { lastStudyDay: day(-2) }, mandarim: { lastStudyDay: day(-1) } };
  t('principal = idioma atual da conta (fr)', ctx.P({ ...blocks, _meta: { currentLearningLanguage: 'fr' } }) === 'frances');
  t('principal = idioma atual da conta (zh)', ctx.P({ ...blocks, _meta: { currentLearningLanguage: 'zh' } }) === 'mandarim');
  t('sem idioma atual: o estudado mais recentemente', ctx.P({ ...blocks }) === 'mandarim');
  t('um idioma só: ele', ctx.P({ frances: {} }) === 'frances');
  t('conta sem blocos: null', ctx.P({ _meta: {} }) === null);
  t('idioma atual sem bloco cai no mais recente', ctx.P({ frances: { lastStudyDay: day(-1) }, _meta: { currentLearningLanguage: 'zh' } }) === 'frances');

  // sem _account: igual a antes (um aviso por idioma)
  const old = { streak: 3, lastStudyDay: day(-1) };
  t('sem _account: francês avisa', (await run('frances', old, null, false)).includes('frances:streak_at_risk'));
  t('sem _account: chinês também avisa (como antes)', (await run('mandarim', old, null, false)).includes('mandarim:streak_at_risk'));
  // com _account: só o principal
  const acc = { streak: 3, lastStudyDay: day(-1) };
  t('com _account: o principal avisa', (await run('frances', old, acc, true)).includes('frances:streak_at_risk'));
  t('com _account: o outro idioma NÃO avisa a sequência', !(await run('mandarim', old, acc, false)).includes('mandarim:streak_at_risk'));
  // a pessoa estudou o outro idioma hoje: a conta tem hoje, o bloco está parado -> nada de aviso
  t('estudou hoje em outro idioma: sem "sequência em risco" mesmo com o bloco parado', !(await run('frances', { streak: 2, lastStudyDay: day(-2) }, { streak: 3, lastStudyDay: day(0) }, true)).includes('frances:streak_at_risk'));
  // reengajamento usa a data da conta
  t('reengajamento usa o último dia da CONTA (2 dias parada)', (await run2('frances', { lastStudyDay: day(-9) }, { streak: 1, lastStudyDay: day(-2) }, true)).includes('frances:user_inactive_2'));
  t('reengajamento não dispara no idioma não principal', !(await run2('mandarim', { lastStudyDay: day(-2) }, { streak: 1, lastStudyDay: day(-2) }, false)).some(e => e.includes('user_inactive')));
  // meta do dia: lições da conta contam
  const goalState = { streak: 0, lastStudyDay: day(-5), studyGoal: { dailyLessonsGoal: 2, days: Object.fromEntries(['sun','mon','tue','wed','thu','fri','sat'].map(d => [d, true])) }, dailyLessonsLog: { [day(0)]: 1 } };
  t('meta do dia não batida: avisa', (await run('frances', goalState, null, true)).includes('frances:study_goal_remaining'));
  t('meta do dia: lição feita no outro idioma conta (conta = 2 lições)', !(await run('frances', goalState, { streak: 1, lastStudyDay: day(0), dailyLessonsLog: { [day(0)]: 2 } }, true)).includes('frances:study_goal_remaining'));
  // eventos por idioma continuam nos dois
  const overdue = { streak: 0, cards: { overdue: 5 } };
  t('revisão atrasada continua por idioma (não principal também)', (await run('mandarim', { ...overdue }, acc, false)).includes('mandarim:review_overdue'));

  // C5: blocos de curso por idioma do site (frances@en)
  const B = ctx.B;
  t('bloco legado continua valendo', B({ frances: { a: 1 } }, 'frances').a === 1);
  t('sem bloco do idioma: null', B({ mandarim: { a: 1 } }, 'frances') === null && B(null, 'frances') === null);
  t('só curso @en: usa ele', B({ 'frances@en': { a: 2 } }, 'frances').a === 2);
  t('currentCourse @en vence o legado', B({ frances: { a: 1 }, 'frances@en': { a: 2 }, _meta: { currentCourse: 'frances@en', courses: { 'frances@en': { storageKey: 'frances@en' } } } }, 'frances').a === 2);
  t('currentCourse legado (pt-BR) usa a chave sem sufixo', B({ frances: { a: 1 }, 'frances@en': { a: 2 }, _meta: { currentCourse: 'frances@pt-BR', courses: { 'frances@pt-BR': { storageKey: 'frances' } } } }, 'frances').a === 1);
  t('currentCourse de outro idioma não interfere', B({ frances: { a: 1 }, mandarim: { a: 3 }, 'mandarim@en': { a: 4 }, _meta: { currentCourse: 'mandarim@en' } }, 'frances').a === 1);
  t('idioma principal enxerga conta só com curso @', ctx.P({ 'mandarim@en': { lastStudyDay: day(0) }, _meta: {} }) === 'mandarim');
  console.log(`cron conta: ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
