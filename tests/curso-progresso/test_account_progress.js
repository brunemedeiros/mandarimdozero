// E3 / C2: progresso da CONTA (sequência de dias etc.) somado entre os blocos de curso. (A) regras puras e propriedades;
// (B) integração com shared/auth.js (load/save com supabase falso): conta de 1 idioma, de 2 idiomas, formato antigo na raiz, conta
// nova, duas abas salvando ao mesmo tempo. Rodar: node tests/curso-progresso/test_account_progress.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const clone = o => JSON.parse(JSON.stringify(o));
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const canon = o => Array.isArray(o) ? o.map(canon) : (o && typeof o === 'object') ? Object.fromEntries(Object.keys(o).sort().map(k => [k, canon(o[k])])) : o;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

global.LanguageRegistry = require(path.join(ROOT, 'languages/registry.js')).LanguageRegistry;
const AP = require(path.join(ROOT, 'shared/account-progress.js'));
const day = (n) => { const d = new Date(Date.UTC(2026, 9, 12)); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }; // 0 = 2026-10-12

// ---------- (A) regras ----------
{
  const fr = { streak: 2, lastStudyDay: day(-5), activityLog: { [day(-6)]: 3, [day(-5)]: 2 }, dailyLessonsLog: { [day(-5)]: 1 }, hadStreakComeback: false };
  const zh = { streak: 1, lastStudyDay: day(-13), activityLog: { [day(-13)]: 4 }, hadStreakComeback: true };
  const m = AP.mergeAccount(fr, zh);
  check('último dia = o maior', m.lastStudyDay === day(-5));
  check('log = união dos dias', eq(Object.keys(m.activityLog).sort(), [day(-13), day(-6), day(-5)].sort()));
  check('streak = dias seguidos terminando no último dia (2)', m.streak === 2);
  check('comeback = OU', m.hadStreakComeback === true);
  check('lições do dia somadas por dia', m.dailyLessonsLog[day(-5)] === 1);
  // estudar em idiomas diferentes em dias seguidos soma na MESMA sequência
  const a = { streak: 1, lastStudyDay: day(-2), activityLog: { [day(-2)]: 1 } };
  const b = { streak: 1, lastStudyDay: day(-1), activityLog: { [day(-1)]: 1 } };
  check('dia 1 no francês + dia 2 no chinês = sequência 2', AP.mergeAccount(a, b).streak === 2);
  check('mesmo dia nos dois idiomas não dobra a sequência', AP.mergeAccount({ streak: 3, lastStudyDay: day(0), activityLog: { [day(-2)]: 1, [day(-1)]: 1, [day(0)]: 2 } }, { streak: 1, lastStudyDay: day(0), activityLog: { [day(0)]: 5 } }).streak === 3);
  check('streak vivo maior que o log vence (log curto em conta antiga)', AP.mergeAccount({ streak: 9, lastStudyDay: day(0), activityLog: { [day(0)]: 1 } }, {}).streak === 9);
  check('streak de bloco parado não infla a conta', AP.mergeAccount({ streak: 7, lastStudyDay: day(-30), activityLog: { [day(-30)]: 1 } }, { streak: 1, lastStudyDay: day(0), activityLog: { [day(0)]: 1 } }).streak === 1);
  check('entradas vazias/lixo não quebram', eq(AP.mergeAccount(null, undefined), {}) && AP.mergeAccount({ lastStudyDay: 'lixo', activityLog: { x: 'y' } }, {}).lastStudyDay === undefined);
  check('pickAccount só pega campos da conta (nunca xp, cards, studyGoal)', eq(Object.keys(AP.pickAccount({ xp: 5, cards: [], studyGoal: {}, streak: 2, lastStudyDay: day(0) })).sort(), ['lastStudyDay', 'streak']));

  // propriedades com dados aleatórios (semente fixa): nunca perde dia, idempotente, independe da ordem
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const gen = () => { const log = {}; const n = Math.floor(rnd() * 8); for (let i = 0; i < n; i++) log[day(-Math.floor(rnd() * 20))] = 1 + Math.floor(rnd() * 5);
    const ds = Object.keys(log).sort(); const last = ds[ds.length - 1];
    return last ? { activityLog: log, lastStudyDay: last, streak: AP.consecutiveEndingAt(log, last), hadStreakComeback: rnd() > 0.7 } : {}; };
  let okLoss = true, okIdem = true, okComm = true, okLast = true, okStreak = true;
  for (let i = 0; i < 300; i++){
    const x = gen(), y = gen(), m1 = AP.mergeAccount(x, y), m2 = AP.mergeAccount(y, x);
    [x, y].forEach(s => Object.keys(s.activityLog || {}).forEach(d => { if (!(m1.activityLog[d] >= s.activityLog[d])) okLoss = false; }));
    if (!eq(AP.mergeAccount(m1, m1), m1)) okIdem = false;
    if (!eq(m1, m2)) okComm = false;
    [x, y].forEach(s => { if (s.lastStudyDay && !(m1.lastStudyDay >= s.lastStudyDay)) okLast = false; if (s.lastStudyDay && m1.lastStudyDay === s.lastStudyDay && !(m1.streak >= s.streak)) okStreak = false; });
  }
  check('propriedade (300 casos): nenhum dia do log se perde na união', okLoss);
  check('propriedade: unir duas vezes dá o mesmo (idempotente)', okIdem);
  check('propriedade: a ordem de união não muda o resultado', okComm);
  check('propriedade: o último dia nunca diminui', okLast);
  check('propriedade: o streak nunca é menor que um streak vivo do mesmo último dia', okStreak);
}

// ---------- (B) integração com shared/auth.js ----------
function fakeEl(){ return { addEventListener(){}, style: { removeProperty(){} }, classList: { add(){}, remove(){}, toggle(){} }, textContent: '' }; }
const freshState = (extra) => Object.assign({ xp: 0, totalReviews: 0, totalAudioPlays: 0, streak: 0, lastStudyDay: null, activityLog: {}, hadStreakComeback: false, dailyLessonsLog: {}, lastReviewReminderDay: null,
  periodXp: { weekStart: '2026-10-05', amount: 0 } }, extra || {});
function makeSession({ db, appKey, uiLang = 'pt-BR' }){
  const STATE = freshState();
  const supabaseClient = { from(table){
    const q = { select(){ return q; }, eq(){ return q; },
      async maybeSingle(){ return { data: db.row ? { data: clone(db.row) } : null, error: null }; },
      async upsert(payload){ if (table === 'progress') db.row = clone(payload.data); return { error: null }; } };
    return q; } };
  const sb = { console: { error(){}, log(){}, warn(){} }, supabaseClient, URLSearchParams, Promise, Object, JSON, Number, String, setTimeout, Date,
    location: { search: '' }, document: { getElementById: () => fakeEl(), addEventListener(){}, querySelectorAll: () => [] },
    APP_KEY: appKey, STATE, ensurePeriodXp(){}, showToast(){}, t: k => k, getUiLang: () => uiLang, setUiLang: async l => l,
    serializeState: () => clone(STATE),
    applySerializedState(d){ ['xp', 'totalReviews', 'totalAudioPlays', 'streak', 'lastStudyDay', 'lastReviewReminderDay'].forEach(k => { if (d[k] !== undefined && d[k] !== null) STATE[k] = d[k]; });
      if (d.activityLog) Object.assign(STATE.activityLog, d.activityLog); if (d.dailyLessonsLog) Object.assign(STATE.dailyLessonsLog, d.dailyLessonsLog); if (d.hadStreakComeback) STATE.hadStreakComeback = true; } };
  sb.window = sb; vm.createContext(sb);
  ['languages/registry.js', 'shared/course-storage.js', 'shared/account-progress.js', 'shared/language-pref.js', 'shared/auth.js'].forEach(f => vm.runInContext(read(f), sb));
  sb.run = c => vm.runInContext(c, sb);
  sb.run("CURRENT_USER = { id: 'u1' };");
  sb.S = STATE;
  return sb;
}
const frBlock = () => ({ xp: 120, totalReviews: 40, totalAudioPlays: 3, streak: 2, lastStudyDay: day(-1), activityLog: { [day(-2)]: 3, [day(-1)]: 2 }, dailyLessonsLog: { [day(-1)]: 2 }, hadStreakComeback: false, cards: [{ id: 'u1-v0', reps: 2 }] });
const zhBlock = () => ({ xp: 80, totalReviews: 10, totalAudioPlays: 0, streak: 1, lastStudyDay: day(-8), activityLog: { [day(-8)]: 1 }, dailyLessonsLog: {}, hadStreakComeback: true });

(async () => {
  // 1. conta de um idioma só: nada muda para ela (sequência, log, espelho)
  {
    const db = { row: { frances: frBlock(), _meta: { currentLearningLanguage: 'fr' } } };
    const s = makeSession({ db, appKey: 'frances' }); await s.loadState();
    check('1 idioma: STATE igual ao bloco (streak, último dia, log)', s.S.streak === 2 && s.S.lastStudyDay === day(-1) && eq(s.S.activityLog, frBlock().activityLog));
    await s.saveState();
    check('1 idioma: espelho no bloco inalterado nos campos da conta', db.row.frances.streak === 2 && db.row.frances.lastStudyDay === day(-1) && eq(db.row.frances.activityLog, frBlock().activityLog));
    check('1 idioma: _account criado igual ao bloco', db.row._account.streak === 2 && db.row._account.lastStudyDay === day(-1) && eq(db.row._account.activityLog, frBlock().activityLog) && db.row._account.hadStreakComeback === undefined);
    check('1 idioma: _meta preservado', db.row._meta.currentLearningLanguage === 'fr');
    check('_account não leva campos de bloco (xp, cards, progressSummary)', !('xp' in db.row._account) && !('cards' in db.row._account) && !('progressSummary' in db.row._account));
  }
  // 2. conta de dois idiomas: abrir o chinês continua a sequência do francês
  {
    const db = { row: { frances: frBlock(), mandarim: zhBlock(), _meta: { currentLearningLanguage: 'zh' } } };
    const s = makeSession({ db, appKey: 'mandarim' }); await s.loadState();
    check('2 idiomas: no chinês a sequência do francês continua (2, último dia ontem)', s.S.streak === 2 && s.S.lastStudyDay === day(-1));
    check('2 idiomas: log do chinês recebe os dias do francês', s.S.activityLog[day(-1)] === 2 && s.S.activityLog[day(-8)] === 1);
    check('2 idiomas: comeback do chinês vale para a conta', s.S.hadStreakComeback === true);
    s.S.xp = 90; await s.saveState();
    check('2 idiomas: salvar no chinês não toca no bloco do francês', eq(db.row.frances, frBlock()));
    check('2 idiomas: bloco do chinês ganha o espelho da conta', db.row.mandarim.streak === 2 && db.row.mandarim.xp === 90);
    check('2 idiomas: _account = união', db.row._account.streak === 2 && db.row._account.lastStudyDay === day(-1) && Object.keys(db.row._account.activityLog).length === 3);
  }
  // 3. formato antigo do chinês (campos na raiz): a sequência não se perde
  {
    const db = { row: { xp: 55, cards: [], streak: 4, lastStudyDay: day(-1), activityLog: { [day(-4)]: 1, [day(-3)]: 1, [day(-2)]: 1, [day(-1)]: 1 } } };
    const s = makeSession({ db, appKey: 'frances' }); await s.loadState();
    check('formato antigo na raiz: o francês herda a sequência (4)', s.S.streak === 4 && s.S.lastStudyDay === day(-1));
    await s.saveState();
    check('formato antigo na raiz: raiz preservada e _account criado', db.row.xp === 55 && db.row._account.streak === 4 && Object.keys(db.row._account.activityLog).length === 4);
  }
  // 4. conta nova
  {
    const db = { row: null };
    const s = makeSession({ db, appKey: 'frances' }); await s.loadState();
    check('conta nova: STATE intacto', s.S.streak === 0 && s.S.lastStudyDay === null);
    check('conta nova: progressAccountIsNew', s.run('progressAccountIsNew') === true);
    const db2 = { row: { _meta: { currentLearningLanguage: 'fr' }, _account: { streak: 1, lastStudyDay: day(0) } } };
    const s2 = makeSession({ db: db2, appKey: 'frances' }); await s2.loadState();
    check('só _meta e _account continua sendo conta nova', s2.run('progressAccountIsNew') === true);
    check('conta só com _account entrega a sequência ao STATE', s2.S.streak === 1 && s2.S.lastStudyDay === day(0));
  }
  // 5. duas abas (fr e zh) salvando ao mesmo tempo: nenhum dia se perde
  {
    const db = { row: { frances: frBlock(), mandarim: zhBlock(), _meta: {} } };
    const a = makeSession({ db, appKey: 'frances' }), b = makeSession({ db, appKey: 'mandarim' });
    await Promise.all([a.loadState(), b.loadState()]);
    a.S.xp = 130; a.S.activityLog[day(0)] = 1; a.S.lastStudyDay = day(0); a.S.streak = 3;
    b.S.xp = 95; b.S.activityLog[day(-9)] = 1;
    await a.saveState(); await b.saveState();
    const log = db.row._account.activityLog;
    check('2 abas: dia novo do francês sobrevive ao salvar do chinês', log[day(0)] === 1 && db.row._account.lastStudyDay === day(0));
    check('2 abas: dia novo do chinês também entrou', log[day(-9)] === 1);
    check('2 abas: sequência da conta = 3 (hoje, ontem, anteontem)', db.row._account.streak === 3);
    check('2 abas: cada bloco guarda só o seu xp', db.row.frances.xp === 130 && db.row.mandarim.xp === 95);
  }
  console.log(`conta: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
