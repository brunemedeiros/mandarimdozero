// Recomeçar o curso (migration 123): (A) regras puras de shared/recomecar-curso.js; (B) integração com os arquivos de PRODUÇÃO
// (shared/auth.js loadState/saveState + shared/core/estado-salvar.js + shared/lang-card-memory.js), banco simulado em memória:
// aba antiga barrada pela época, aba nova grava a época, conta sem recomeço grava o bloco igual ao de antes, recarregar quando a
// época muda, "uma vez por retorno" da retomada guiada.
// Uso: node tests/recomecar-curso/test_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const clone = o => JSON.parse(JSON.stringify(o));
let pass = 0, fail = 0;
function check(name, ok){ if (ok){ pass++; console.log('ok   ' + name); } else { fail++; console.log('FALHOU ' + name); } }

// ---------- (A) puras ----------
const RC = require(path.join(ROOT, 'shared/recomecar-curso.js'));
check('epochOf: sem bloco/sem campo/lixo = 0', RC.epochOf(null) === 0 && RC.epochOf({}) === 0 && RC.epochOf({ restartEpoch: 'x' }) === 0 && RC.epochOf({ restartEpoch: -2 }) === 0);
check('epochOf: número', RC.epochOf({ restartEpoch: 3 }) === 3);
check('isStaleSave: servidor com época maior = barrar', RC.isStaleSave({ restartEpoch: 1 }, 0) && RC.isStaleSave({ restartEpoch: 3 }, 2));
check('isStaleSave: mesma época ou servidor sem época = gravar', !RC.isStaleSave({ restartEpoch: 2 }, 2) && !RC.isStaleSave({ xp: 9 }, 0) && !RC.isStaleSave(undefined, 0));
const p0 = { xp: 1 };
check('stampBlock: sem recomeço devolve o MESMO objeto', RC.stampBlock(p0, 0, null) === p0);
const p1 = RC.stampBlock(p0, 2, '2026-10-30T10:00:00Z');
check('stampBlock: com recomeço leva época e data sem mexer no original', p1.restartEpoch === 2 && p1.restartedAt === '2026-10-30T10:00:00Z' && p1.xp === 1 && !('restartEpoch' in p0));
check('daysBetween', RC.daysBetween('2026-08-31', '2026-10-30') === 60 && RC.daysBetween('2026-10-30', '2026-10-30') === 0 && RC.daysBetween('x', '2026-10-30') === 0);
check('retomada: 60 dias parado aparece', RC.shouldShowComeback('2026-08-31', '2026-10-30', null));
check('retomada: 59 dias não aparece', !RC.shouldShowComeback('2026-09-01', '2026-10-30', null));
check('retomada: uma vez por retorno (já mostrada para esse último dia)', !RC.shouldShowComeback('2026-08-31', '2026-10-30', '2026-08-31'));
check('retomada: novo retorno depois de outra parada aparece de novo', RC.shouldShowComeback('2026-08-31', '2026-10-30', '2026-05-01'));
check('retomada: curso nunca estudado não aparece', !RC.shouldShowComeback(null, '2026-10-30', null));
const now = Date.parse('2026-10-30T12:00:00Z');
check('activeBackup: a mais recente válida', RC.activeBackup([{ id: 1, created_at: '2026-10-01T00:00:00Z', expires_at: '2026-10-31T00:00:00Z' }, { id: 2, created_at: '2026-10-20T00:00:00Z', expires_at: '2026-11-19T00:00:00Z' }], now).id === 2);
check('activeBackup: desfeita/substituída/vencida/esvaziada = nenhuma',
  RC.activeBackup([{ id: 1, created_at: 'a', expires_at: '2026-11-19T00:00:00Z', restored_at: 'x' }], now) === null
  && RC.activeBackup([{ id: 1, created_at: 'a', expires_at: '2026-11-19T00:00:00Z', superseded_at: 'x' }], now) === null
  && RC.activeBackup([{ id: 1, created_at: 'a', expires_at: '2026-10-29T00:00:00Z' }], now) === null
  && RC.activeBackup([{ id: 1, created_at: 'a', expires_at: '2026-11-19T00:00:00Z', purged_at: 'x' }], now) === null
  && RC.activeBackup([], now) === null);
check('shortDate: pt-BR DD/MM, en "Oct 30"', RC.shortDate('2026-10-30T15:00:00', 'pt-BR') === '30/10' && RC.shortDate('2026-10-30T15:00:00', 'en') === 'Oct 30');

// ---------- (B) integração ----------
function makeSession({ db, withRc = true }){
  const STATE = { cards: [], xp: 0, totalReviews: 0, totalAudioPlays: 0, streak: 0, lastStudyDay: null, activityLog: {}, hadStreakComeback: false, dailyLessonsLog: {}, lastReviewReminderDay: null,
    unitProgress: {}, studyGoal: {}, studySettings: {}, dailyMinutesLog: {}, reviewRecords: { hardSeenIds: [] }, reviewTimeStats: { cards: 0, ms: 0 }, modesUsed: {}, everUsedSpeedReview: false,
    everUsedMatchGame: false, periodXp: { weekStart: '2026-10-26', amount: 0 }, daily: {}, retiredStudyCards: {}, cardVariants: {} };
  const toasts = [], reloads = [];
  const supabaseClient = {
    from(table){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.row ? { data: clone(db.row) } : null, error: null }; },
        async upsert(payload){ if (table === 'progress'){ db.row = clone(payload.data); db.saves = (db.saves || 0) + 1; } if (table === 'weekly_xp') db.weekly = (db.weekly || 0) + 1; return { error: null }; } };
      return q;
    },
    async rpc(){ return { data: null, error: { message: 'stub' } }; },
  };
  const sb = { console: { error(){}, log(){}, warn(){} }, supabaseClient, URLSearchParams, Promise, Object, JSON, Number, String, Array, Math, Set, Map, WeakSet, Date,
    setTimeout: f => f(), location: { search: '', reload(){ reloads.push(1); } }, localStorage: { getItem(){ return null; }, setItem(){} }, sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    document: { getElementById: () => ({ addEventListener(){}, style: { removeProperty(){} }, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, textContent: '' }), addEventListener(){}, querySelectorAll: () => [], visibilityState: 'visible', readyState: 'complete' },
    APP_KEY: 'frances', STATE, UNITS: [], ensurePeriodXp(){}, showToast: m => toasts.push(m), t: k => k, getUiLang: () => 'pt-BR', setUiLang: async l => l,
    trailGroups: () => [], moduleSaveFields: () => ({}), moduleLoadApply(){}, computeProgressSummary: () => ({ pct: 0 }), isCardLessonCompleted(){ return false; },
    CardVariants: { normalizeCardVariants: v => v || {} } };
  sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  ['languages/registry.js', 'shared/course-storage.js', 'shared/account-progress.js', 'shared/lang-card-memory.js']
    .concat(withRc ? ['shared/recomecar-curso.js'] : [])
    .concat(['shared/language-pref.js', 'shared/auth.js', 'shared/srs.js', 'shared/fsrs.js', 'shared/study-trail-model.js', 'shared/trail-state-model.js', 'shared/core/curriculo-progresso.js', 'shared/core/estado-salvar.js'])
    .forEach(f => vm.runInContext(read(f), sb, { filename: f }));
  vm.runInContext('let PRESERVED_SAVED_CARDS = []; function cardOriginsWithFailedFetch(){ return []; }', sb);
  sb.run = c => vm.runInContext(c, sb);
  sb.run("CURRENT_USER = { id: 'u1' };");
  sb.S = STATE; sb.toasts = toasts; sb.reloads = reloads;
  return sb;
}
const baseRow = () => ({
  _meta: { uiLanguage: 'pt-BR' },
  _account: { streak: 3, lastStudyDay: '2026-08-20', bestStreak: 9, activityLog: { '2026-08-20': 2 } },
  frances: { xp: 500, totalReviews: 40, totalAudioPlays: 10, cards: [], unitProgress: { 1: { completed: true, lessonIdx: 0, lessonMisses: {} } }, lastStudyDay: '2026-08-20', streak: 3, activityLog: { '2026-08-20': 2 } },
});
// O que a RPC restart_course grava no bloco (mesma regra de shared/supabase_migrations/123_restart_course.sql).
function serverRestart(row, epoch){
  const b = row.frances;
  row.frances = { cards: (b.cards || []).filter(c => c.origin === 'teacher' || c.origin === 'self'), restartEpoch: epoch, restartedAt: '2026-10-30T12:00:00Z',
    streak: b.streak, lastStudyDay: b.lastStudyDay, activityLog: b.activityLog };
}

(async () => {
  // 1. Aba aberta ANTES do recomeço: não grava por cima (o guarda-corpo de XP sozinho deixaria: 500 > 0).
  {
    const db = { row: baseRow() };
    const a = makeSession({ db }); await a.run('loadState()');
    check('aba A carregou o curso (xp 500, época 0)', a.S.xp === 500 && a.run('RecomecarCurso._state.epoch') === 0);
    serverRestart(db.row, 1);
    const before = JSON.stringify(db.row);
    a.S.xp = 510; await a.run('saveState()');
    check('aba antiga: saveState recusa (o bloco recomeçado fica igual)', JSON.stringify(db.row) === before && !db.saves);
    check('aba antiga: não grava o XP da semana (Ranking)', !db.weekly);
    check('aba antiga: avisa e recarrega', a.toasts.includes('restart.staleTab') && a.reloads.length === 1);
  }
  // 2. Aba aberta DEPOIS do recomeço: grava normalmente e leva a época.
  {
    const db = { row: baseRow() }; serverRestart(db.row, 1);
    const b = makeSession({ db }); await b.run('loadState()');
    check('aba nova: começa do zero (xp 0, trilha vazia) e a sequência da conta continua', b.S.xp === 0 && Object.keys(b.S.unitProgress).length === 0 && b.S.streak === 3);
    check('aba nova: lembra a época 1 e pede um 1º salvar (bloco sem resumo)', b.run('RecomecarCurso._state.epoch') === 1 && b.run('RecomecarCurso._state.needsSave') === true);
    b.S.xp = 8; await b.run('saveState()');
    check('aba nova: grava com restartEpoch 1 e restartedAt', db.saves === 1 && db.row.frances.restartEpoch === 1 && db.row.frances.restartedAt === '2026-10-30T12:00:00Z' && db.row.frances.xp === 8);
    check('aba nova: _account intacto (recorde 9)', db.row._account.bestStreak >= 9);
    // desfazer em outro lugar (época 2) -> esta aba é barrada
    db.row.frances = Object.assign(baseRow().frances, { restartEpoch: 2 });
    b.S.xp = 9; await b.run('saveState()');
    check('aba que carregou o recomeço é barrada depois do desfazer (época 2)', db.saves === 1 && db.row.frances.xp === 500);
  }
  // 3. Conta sem recomeço: o bloco gravado é igual ao do código sem o recomeço (diff zero).
  {
    const db1 = { row: baseRow() }, db2 = { row: baseRow() };
    const x = makeSession({ db: db1 }), y = makeSession({ db: db2, withRc: false });
    await x.run('loadState()'); await y.run('loadState()');
    x.S.xp = 501; y.S.xp = 501; await x.run('saveState()'); await y.run('saveState()');
    check('sem recomeço: bloco gravado idêntico ao do código antigo', JSON.stringify(db1.row.frances) === JSON.stringify(db2.row.frances) && !('restartEpoch' in db1.row.frances));
    const strip = r => { const o = clone(r); Object.values(o._lang || {}).forEach(m => { delete m.updatedAt; }); return o; };
    check('sem recomeço: linha inteira idêntica (sem _meta.comebackSeen; só a hora de _lang.updatedAt muda)', JSON.stringify(strip(db1.row)) === JSON.stringify(strip(db2.row)));
  }
  // 4. loadState de novo (ex.: guarda-corpo de XP) com a época mudada: recarrega a página.
  {
    const db = { row: baseRow() };
    const a = makeSession({ db }); await a.run('loadState()');
    serverRestart(db.row, 1);
    await a.run('loadState()');
    check('2º carregamento com época nova: recarrega a página', a.reloads.length === 1);
  }
  // 5. Retomada guiada: dia mostrado vai para _meta.comebackSeen[curso].
  {
    const db = { row: baseRow() };
    const a = makeSession({ db }); await a.run('loadState()');
    check('retomada: último dia NESTE curso vem do bloco (2026-08-20)', a.run('RecomecarCurso._state.ownLastDay') === '2026-08-20' && a.run("RecomecarCurso._state.courseId") === 'frances@pt-BR');
    a.run("RecomecarCurso._state.pendingSeen = '2026-08-20'");
    await a.run('saveState()');
    check('retomada: grava _meta.comebackSeen["frances@pt-BR"]', db.row._meta.comebackSeen && db.row._meta.comebackSeen['frances@pt-BR'] === '2026-08-20');
    const b = makeSession({ db }); await b.run('loadState()');
    check('retomada: próxima abertura lê o dia já mostrado (não repete)', b.run('RecomecarCurso._state.seenFor') === '2026-08-20'
      && !b.run("RecomecarCurso.shouldShowComeback(RecomecarCurso._state.ownLastDay, '2026-10-30', RecomecarCurso._state.seenFor)"));
  }
  console.log(`\nRESULTADO recomecar-curso unit: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
