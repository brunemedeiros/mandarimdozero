// P1 (docs/p1-memoria-por-idioma.md): memória FSRS dos cartões da professora e próprios por IDIOMA ESTUDADO.
// (A) regras puras de shared/lang-card-memory.js; (B) integração com os arquivos de produção (shared/auth.js loadState/saveState,
// shared/core/estado-salvar.js, shared/study-trail-model.js, shared/fsrs.js, shared/review-bank-student.js) com um supabase falso;
// (C) leitores do servidor: blockForLanguage + computeReviewOverdueCount do notification-cron REAL e a regra de _progress_block.
// Rodar: node tests/p1-memoria-por-idioma/test_memoria_por_idioma.js
const fs = require('fs'), path = require('path'), vm = require('vm'), mod = require('module');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const clone = o => JSON.parse(JSON.stringify(o));
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const canon = o => Array.isArray(o) ? o.map(canon) : (o && typeof o === 'object') ? Object.fromEntries(Object.keys(o).sort().map(k => [k, canon(o[k])])) : o;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const without = (o, k) => { const c = clone(o); delete c[k]; return c; };

const LCM = require(path.join(ROOT, 'shared/lang-card-memory.js'));
const DAY = 86400000, T0 = Date.UTC(2026, 9, 1);

// ---------- (A) regras puras ----------
{
  const a = { id: 't1', origin: 'teacher', reps: 5, lastReview: T0, stability: 3 };
  const b = { id: 't1', origin: 'teacher', reps: 2, lastReview: T0 + 9 * DAY, stability: 9 };
  check('mais revisões vence a revisão mais recente (5 reps antigas x 2 reps novas)', LCM.compareHistory(a, b) > 0);
  check('mesmo reps: revisão mais recente vence', LCM.compareHistory({ reps: 3, lastReview: T0 + DAY }, { reps: 3, lastReview: T0 }) > 0);
  check('mesmo reps e data: maior stability vence', LCM.compareHistory({ reps: 3, lastReview: T0, stability: 5 }, { reps: 3, lastReview: T0, stability: 4 }) > 0);
  check('empate total = 0 (vence a 1ª da lista)', LCM.compareHistory({ reps: 3, lastReview: T0, stability: 5 }, { reps: 3, lastReview: T0, stability: 5 }) === 0);
  check('lastReview em texto (ISO) também conta', LCM.compareHistory({ reps: 1, lastReview: new Date(T0 + DAY).toISOString() }, { reps: 1, lastReview: T0 }) > 0);
  const m = LCM.mergeLists([[{ id: 't1', origin: 'teacher', reps: 1, firstLearnedDate: '2026-10-05' }], [{ id: 't1', origin: 'teacher', reps: 4, firstLearnedDate: '2026-10-09' }]]);
  check('fusão: vence o de mais reps', m.byId.t1.reps === 4);
  check('fusão: firstLearnedDate = a mais antiga', m.byId.t1.firstLearnedDate === '2026-10-05');
  const tie = LCM.mergeLists([[{ id: 's1', origin: 'self', reps: 2, lastReview: T0, stability: 1, x: 'A' }], [{ id: 's1', origin: 'self', reps: 2, lastReview: T0, stability: 1, x: 'B' }]]);
  check('fusão: empate total fica com a 1ª lista', tie.byId.s1.x === 'A');
  check('origem pelo prefixo do id (save sem origin)', LCM.isMemoryEntry({ id: 't12-r2-b' }) && LCM.isMemoryEntry({ id: 's3' }) && !LCM.isMemoryEntry({ id: 'u1-v0' }) && !LCM.isMemoryEntry({ id: 't1', origin: 'study' }));
  check('blocos do idioma: só frances e frances@..., nunca _lang/_meta/mandarim', eq(LCM.languageBlockKeys({ frances: {}, 'frances@en': {}, mandarim: {}, _lang: {}, _meta: {}, francesx: {} }, 'frances').sort(), ['frances', 'frances@en']));

  // propriedade: nunca perde histórico, idempotente (semente fixa)
  let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const ids = ['t1', 't1-b', 't2', 's1', 's2-r1', 't3-c1'];
  const genBlock = () => ({ cards: [{ id: 'u1-v0', reps: Math.floor(rnd() * 4) }].concat(ids.filter(() => rnd() > 0.3).map(id => {
    const reps = rnd() > 0.4 ? Math.floor(rnd() * 9) : 0;
    return { id, origin: id[0] === 't' ? 'teacher' : 'self', rowId: 1, flashcardStatus: 'active', reps, lastReview: reps ? T0 + Math.floor(rnd() * 20) * DAY : null, stability: reps ? rnd() * 30 : 0, due: reps ? T0 + 30 * DAY : 0, state: reps ? 'review' : 'new', note: { big: 'conteúdo' } };
  })) });
  let okLoss = true, okIdem = true, okTrail = true;
  for (let i = 0; i < 300; i++){
    const data = { frances: genBlock(), 'frances@en': genBlock(), mandarim: genBlock() };
    if (rnd() > 0.5) data._lang = { frances: { cards: genBlock().cards.filter(LCM.isMemoryEntry) } };
    const payload = { xp: 1, cards: genBlock().cards };
    const r = LCM.prepareSave(data, 'frances', 'frances@en', payload, 'now');
    const maxReps = {};
    [data.frances.cards, data['frances@en'].cards, payload.cards, LCM.storedLanguageCards(data, 'frances')].forEach(list => list.filter(LCM.isMemoryEntry).forEach(e => { maxReps[e.id] = Math.max(maxReps[e.id] || 0, e.reps || 0); }));
    const got = {}; r.lang.frances.cards.forEach(e => { got[e.id] = e.reps; });
    Object.keys(maxReps).forEach(id => { if (maxReps[id] > 0 && got[id] !== maxReps[id]) okLoss = false; });
    // o bloco gravado de cada curso tem, para cada cartão que ele já tinha, pelo menos o reps de antes
    const after = Object.assign({}, data, r.otherBlocks, { 'frances@en': r.payload, _lang: r.lang });
    ['frances', 'frances@en'].forEach(k => {
      const before = k === 'frances@en' ? payload.cards : data[k].cards;
      before.filter(LCM.isMemoryEntry).forEach(e => { const n = after[k].cards.find(x => x.id === e.id); if (!n || (n.reps || 0) < (e.reps || 0)) okLoss = false; });
      const tb = before.filter(e => !LCM.isMemoryEntry(e)), ta = after[k].cards.filter(e => !LCM.isMemoryEntry(e));
      if (!eq(tb, ta)) okTrail = false;
    });
    if (!eq(after.mandarim, data.mandarim)) okTrail = false;
    const r2 = LCM.prepareSave(after, 'frances', 'frances@en', r.payload, 'now');
    if (!eq(r2.lang, r.lang) || r2.payload !== r.payload || Object.keys(r2.otherBlocks).length) okIdem = false;
  }
  check('propriedade (300 casos): todo cartão com histórico fica em _lang com o MAIOR reps visto', okLoss);
  check('propriedade: salvar de novo não muda nada (idempotente)', okIdem);
  check('propriedade: cartões da trilha e o outro idioma (mandarim) nunca mudam', okTrail);
}

// ---------- (B) integração ----------
function fakeEl(){ return { addEventListener(){}, style: { removeProperty(){} }, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, textContent: '' }; }
const teacherCard = (row, suffix) => ({ id: 't' + row + (suffix || ''), origin: 'teacher', rowId: row, teacherId: 'prof', flashcardStatus: 'active', deckId: 9, tags: [], note: { fields: ['bonjour', 'olá'] }, cardInstance: { k: 1 },
  ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0 });
const selfCard = (row) => ({ id: 's' + row, origin: 'self', rowId: row, flashcardStatus: 'active', deckId: 8, tags: [], note: { fields: ['chat', 'gato'] }, cardInstance: { k: 2 }, ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0 });
const trailCard = (id) => ({ id, origin: 'study', studyKey: null, unitId: 1, ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0 });
const studied = (id, reps, dayN, extra) => Object.assign({ id, reps, lapses: 0, interval: 10, due: T0 + (dayN + 10) * DAY, stability: 10 + reps, difficulty: 5, state: 'review', lastReview: T0 + dayN * DAY, fsrsReps: reps, fsrsLapses: 0, fsrsMigrated: true, ef: 2.5, firstLearnedDate: '2026-10-01' }, extra || {});

// db.row = progress.data da conta. opts.lcm=false simula uma ABA ANTIGA (código de antes da P1: sem shared/lang-card-memory.js).
function makeSession({ db, appKey = 'frances', uiLang = 'pt-BR', lcm = true, teacherRows = [1, 2], selfRows = [1], trail = ['u1-v0', 'u1-v1'], fetchFails = {}, bankEvents = [] }){
  const STATE = { cards: [], xp: 0, totalReviews: 0, totalAudioPlays: 0, streak: 0, lastStudyDay: null, activityLog: {}, hadStreakComeback: false, dailyLessonsLog: {}, lastReviewReminderDay: null,
    unitProgress: {}, studyGoal: {}, studySettings: {}, dailyMinutesLog: {}, reviewRecords: { hardSeenIds: [] }, reviewTimeStats: { cards: 0, ms: 0 }, modesUsed: {}, everUsedSpeedReview: false,
    everUsedMatchGame: false, periodXp: { weekStart: '2026-10-26', amount: 0 }, daily: {}, retiredStudyCards: {}, cardVariants: {} };
  // O curso da página é o idioma do site da CONTA (_meta.uiLanguage), fixado no 1º carregamento (shared/auth.js pageSiteLanguage).
  if (db.row && db.row._meta) db.row._meta.uiLanguage = uiLang;
  const acks = [];
  const supabaseClient = {
    from(table){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.row ? { data: clone(db.row) } : null, error: null }; },
        async upsert(payload){ if (table === 'progress'){ db.row = clone(payload.data); db.saves = (db.saves || 0) + 1; } return { error: null }; } };
      return q;
    },
    async rpc(name, args){
      if (name === 'get_my_pending_bank_grades') return { data: bankEvents, error: null };
      if (name === 'ack_my_bank_reviews'){ acks.push(...args.p_ids); return { data: null, error: null }; }
      return { data: null, error: { message: 'stub' } };
    },
  };
  const sb = { console: { error(){}, log(){}, warn(){} }, supabaseClient, URLSearchParams, Promise, Object, JSON, Number, String, Array, Math, Set, Map, WeakSet, setTimeout, Date,
    location: { search: '' }, localStorage: { getItem(){ return null; }, setItem(){} },
    document: { getElementById: () => fakeEl(), addEventListener(){}, querySelectorAll: () => [], visibilityState: 'visible' },
    APP_KEY: appKey, STATE, UNITS: [], ensurePeriodXp(){}, showToast(){}, t: k => k, getUiLang: () => uiLang, setUiLang: async l => l,
    trailGroups: () => [], moduleSaveFields: () => ({}), moduleLoadApply(){}, computeProgressSummary: () => ({ pct: 0 }), isCardLessonCompleted(){ return false; },
    CardVariants: { normalizeCardVariants: v => v || {} } };
  sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  const files = ['languages/registry.js', 'shared/course-storage.js', 'shared/account-progress.js'].concat(lcm ? ['shared/lang-card-memory.js'] : [])
    .concat(['shared/language-pref.js', 'shared/auth.js', 'shared/srs.js', 'shared/fsrs.js', 'shared/study-trail-model.js', 'shared/trail-state-model.js', 'shared/core/curriculo-progresso.js', 'shared/core/estado-salvar.js', 'shared/review-bank-student.js']);
  files.forEach(f => vm.runInContext(read(f), sb, { filename: f }));
  // Mesma A2 de shared/core/estado-trilha-desafios.js (o arquivo inteiro depende do DOM da trilha).
  vm.runInContext(`let PRESERVED_SAVED_CARDS = []; const CARD_FETCH_FAILED = ${JSON.stringify({ teacher: !!fetchFails.teacher, self: !!fetchFails.self })};
    function cardOriginsWithFailedFetch(){ return Object.keys(CARD_FETCH_FAILED).filter(k => CARD_FETCH_FAILED[k]); }`, sb);
  if (!lcm) check('aba antiga: LangCardMemory ausente', vm.runInContext('typeof LangCardMemory', sb) === 'undefined');
  trail.forEach(id => STATE.cards.push(trailCard(id)));
  if (!fetchFails.teacher) teacherRows.forEach(r => STATE.cards.push(teacherCard(r)));
  if (!fetchFails.self) selfRows.forEach(r => STATE.cards.push(selfCard(r)));
  sb.run = c => vm.runInContext(c, sb);
  sb.run("CURRENT_USER = { id: 'u1' };");
  sb.S = STATE; sb.acks = acks;
  sb.card = id => STATE.cards.find(c => c.id === id);
  sb.grade = (id, g, dayN) => sb.run(`applyMemoryGrade(STATE.cards.find(c => c.id === ${JSON.stringify(id)}), ${g}, ${T0 + dayN * DAY})`);
  return sb;
}
const memOf = (block, id) => (block && block.cards || []).find(c => c.id === id);
const twoCourseRow = () => ({
  _meta: { uiLanguage: 'pt-BR', courses: { 'frances@pt-BR': { storageKey: 'frances', startedAt: null }, 'frances@en': { storageKey: 'frances@en', startedAt: '2026-10-15T00:00:00Z' } } },
  frances: { xp: 300, totalReviews: 50, totalAudioPlays: 0, cards: [studied('u1-v0', 4, 3), Object.assign(teacherCard(1), studied('t1', 6, 10)), Object.assign(teacherCard(2), studied('t2', 2, 5)), Object.assign(selfCard(1), studied('s1', 3, 8))] },
  'frances@en': { xp: 20, totalReviews: 3, totalAudioPlays: 0, cards: [trailCard('u1-v0'), teacherCard(1), teacherCard(2), selfCard(1)] },
});

(async () => {
  // 1. ida e volta pt <-> en com a mesma memória
  {
    const db = { row: twoCourseRow() };
    const en = makeSession({ db, uiLang: 'en' }); await en.loadState();
    check('en: carrega a memória do bloco pt (t1 reps 6, t2 reps 2, s1 reps 3)', en.card('t1').reps === 6 && en.card('t2').reps === 2 && en.card('s1').reps === 3);
    check('en: trilha continua do curso en (u1-v0 sem histórico)', en.card('u1-v0').reps === 0);
    check('en: conteúdo do cartão vem do banco, não da cópia salva', en.card('t1').deckId === 9 && en.card('t1').note.fields[0] === 'bonjour');
    en.grade('t1', 2, 20); en.grade('s1', 3, 20);
    await en.saveState();
    check('en salvou: _lang.frances tem t1 reps 7 e s1 reps 4', memOf(db.row._lang.frances, 't1').reps === 7 && memOf(db.row._lang.frances, 's1').reps === 4);
    check('en salvou: bloco en (espelho) com t1 reps 7', memOf(db.row['frances@en'], 't1').reps === 7);
    check('en salvou: espelho do bloco pt também subiu (t1 reps 7) e manteve o conteúdo da entrada', memOf(db.row.frances, 't1').reps === 7 && memOf(db.row.frances, 't1').note.fields[0] === 'bonjour');
    check('en salvou: trilha do bloco pt intacta', eq(db.row.frances.cards.filter(c => c.id[0] === 'u'), twoCourseRow().frances.cards.filter(c => c.id[0] === 'u')));
    check('en salvou: campos do curso pt intactos (xp, totalReviews)', db.row.frances.xp === 300 && db.row.frances.totalReviews === 50);
    const pt = makeSession({ db, uiLang: 'pt-BR' }); await pt.loadState();
    check('volta ao pt: t1 reps 7, s1 reps 4 (revisões feitas no en)', pt.card('t1').reps === 7 && pt.card('s1').reps === 4);
    check('volta ao pt: trilha do pt (u1-v0 reps 4)', pt.card('u1-v0').reps === 4);
    pt.grade('t2', 2, 21); await pt.saveState();
    const en2 = makeSession({ db, uiLang: 'en' }); await en2.loadState();
    check('de novo no en: t2 reps 3 (revisão feita no pt)', en2.card('t2').reps === 3 && en2.card('t1').reps === 7);
    check('de novo no en: trilha do en segue sem histórico', en2.card('u1-v0').reps === 0);
  }
  // 2. migração escolhe o registro com mais histórico (por cartão), sem depender de qual curso está aberto
  {
    const row = twoCourseRow();
    row['frances@en'].cards[1] = Object.assign(teacherCard(1), studied('t1', 2, 25)); // en: menos revisões, porém mais recente
    row['frances@en'].cards[2] = Object.assign(teacherCard(2), studied('t2', 5, 12)); // en: mais revisões
    const db = { row };
    const s = makeSession({ db, uiLang: 'pt-BR' }); await s.loadState();
    check('migração: t1 fica com o pt (6 reps > 2 reps mais recentes)', s.card('t1').reps === 6);
    check('migração: t2 fica com o en (5 reps > 2)', s.card('t2').reps === 5 && s.card('t2').lastReview === T0 + 12 * DAY);
    await s.saveState();
    check('migração gravada: _lang tem t1 6 e t2 5', memOf(db.row._lang.frances, 't1').reps === 6 && memOf(db.row._lang.frances, 't2').reps === 5);
    check('migração: a cópia de menos histórico do en não foi apagada (só subiu o t1? não: 2 reps < 6 -> sobe para 6)', memOf(db.row['frances@en'], 't1').reps === 6 && memOf(db.row['frances@en'], 't2').reps === 5);
    const s2 = makeSession({ db, uiLang: 'en' }); await s2.loadState();
    check('migração: o en vê o mesmo', s2.card('t1').reps === 6 && s2.card('t2').reps === 5);
  }
  // 3. aba antiga (código de antes) não apaga a memória nova
  {
    const db = { row: twoCourseRow() };
    const oldEn = makeSession({ db, uiLang: 'en', lcm: false }); await oldEn.loadState(); // abriu antes da publicação
    check('aba antiga en: começa com t1 sem histórico (o bug de hoje)', oldEn.card('t1').reps === 0);
    const pt = makeSession({ db, uiLang: 'pt-BR' }); await pt.loadState(); pt.grade('t1', 2, 20); await pt.saveState();
    oldEn.S.xp = 25; oldEn.grade('t2', 2, 21); await oldEn.saveState(); // grava o bloco en com o t1 velho
    check('aba antiga salvou: _lang continua lá (t1 reps 7)', db.row._lang && memOf(db.row._lang.frances, 't1').reps === 7);
    check('aba antiga salvou: bloco en ficou com a cópia velha (esperado)', memOf(db.row['frances@en'], 't1').reps === 0);
    const en = makeSession({ db, uiLang: 'en' }); await en.loadState();
    check('próxima carga (código novo): t1 volta com reps 7', en.card('t1').reps === 7);
    check('próxima carga: t2 fica com o pt (2 reps antes da migração) -- a revisão isolada da aba antiga (1 rep do zero) perde', en.card('t2').reps === 2);
    await en.saveState();
    check('depois de salvar: bloco en corrigido (t1 7)', memOf(db.row['frances@en'], 't1').reps === 7);
    // aba antiga do MESMO curso, também nunca apaga _lang
    const oldPt = makeSession({ db, uiLang: 'pt-BR', lcm: false }); await oldPt.loadState(); oldPt.S.xp = 400; await oldPt.saveState();
    check('aba antiga do pt: _lang preservado', memOf(db.row._lang.frances, 't1').reps === 7);
  }
  // 4. duas abas novas (pt e en) ao mesmo tempo: a de estado velho não regride a outra
  {
    const db = { row: twoCourseRow() };
    const a = makeSession({ db, uiLang: 'pt-BR' }); await a.loadState();
    const b = makeSession({ db, uiLang: 'en' }); await b.loadState();
    a.grade('t1', 2, 20); a.grade('t1', 2, 30); await a.saveState(); // t1 = 8
    b.grade('s1', 2, 22); await b.saveState(); // b ainda acha que t1 = 6
    check('2 abas: t1 = 8 (a) sobrevive ao save de b', memOf(db.row._lang.frances, 't1').reps === 8 && memOf(db.row['frances@en'], 't1').reps === 8 && memOf(db.row.frances, 't1').reps === 8);
    check('2 abas: s1 = 4 (b) também entrou', memOf(db.row._lang.frances, 's1').reps === 4 && memOf(db.row.frances, 's1').reps === 4);
  }
  // 5. conta com um curso só: o bloco gravado é igual ao do código antigo (diff zero), só aparece _lang
  {
    const row = { _meta: { uiLanguage: 'pt-BR' }, frances: twoCourseRow().frances };
    const dbNew = { row: clone(row) }, dbOld = { row: clone(row) };
    for (const [db, lcm] of [[dbNew, true], [dbOld, false]]){
      const s = makeSession({ db, uiLang: 'pt-BR', lcm }); await s.loadState(); s.grade('t1', 2, 20); s.grade('u1-v0', 2, 20); await s.saveState();
      const s2 = makeSession({ db, uiLang: 'pt-BR', lcm }); await s2.loadState(); s2.grade('s1', 1, 21); await s2.saveState();
    }
    check('1 curso: tudo igual ao código antigo, fora o _lang', eq(without(dbNew.row, '_lang'), dbOld.row), { novo: Object.keys(dbNew.row), antigo: Object.keys(dbOld.row) });
    check('1 curso: _lang.frances tem 3 cartões (t1, t2, s1), sem os da trilha', eq(dbNew.row._lang.frances.cards.map(c => c.id).sort(), ['s1', 't1', 't2']));
    check('1 curso: _lang guarda só id/origem/progresso (sem conteúdo)', !('note' in dbNew.row._lang.frances.cards[0]) && !('cardInstance' in dbNew.row._lang.frances.cards[0]) && dbNew.row._lang.frances.cards[0].rowId === 1);
    check('1 curso: _lang não tem campos de bloco que o servidor confunde com curso (xp, streak, progressSummary)', !['xp', 'streak', 'progressSummary', 'lastStudyDay'].some(k => k in dbNew.row._lang || k in dbNew.row._lang.frances));
    check('1 curso: progressAccountIsNew continua false', makeSession({ db: dbNew }).run('progressAccountIsNew') === false);
  }
  // 6. curso novo sem bloco ainda: já começa com a memória
  {
    const row = twoCourseRow(); delete row['frances@en']; delete row._meta.courses['frances@en'];
    const db = { row };
    const en = makeSession({ db, uiLang: 'en' }); await en.loadState();
    check('curso novo: t1/t2/s1 com a memória do pt', en.card('t1').reps === 6 && en.card('t2').reps === 2 && en.card('s1').reps === 3);
    check('curso novo: trilha zerada (é outro curso)', en.card('u1-v0').reps === 0);
    await en.saveState();
    check('curso novo: bloco en criado já com a memória', memOf(db.row['frances@en'], 't1').reps === 6 && db.row['frances@en'].xp === 0);
    check('curso novo: bloco pt intacto', eq(db.row.frances, twoCourseRow().frances));
    const empty = makeSession({ db: { row: null }, uiLang: 'en' }); await empty.loadState();
    check('conta nova: nada quebra', empty.card('t1').reps === 0 && empty.run('progressAccountIsNew') === true);
  }
  // 7. busca dos cartões da professora falhou: a memória não some (A2 + _lang)
  {
    const db = { row: twoCourseRow() };
    const s = makeSession({ db, uiLang: 'en', fetchFails: { teacher: true } }); await s.loadState();
    check('falha na busca: nenhum cartão da professora no STATE', !s.card('t1'));
    await s.saveState();
    check('falha na busca: _lang guarda t1 reps 6', memOf(db.row._lang.frances, 't1').reps === 6);
    check('falha na busca: bloco pt intacto', memOf(db.row.frances, 't1').reps === 6);
    const s2 = makeSession({ db, uiLang: 'en' }); await s2.loadState();
    check('próxima busca boa: t1 reps 6', s2.card('t1').reps === 6);
  }
  // 8. Banco de Revisão (aluno vinculado): nota do Modo aula cai no cartão com a memória do idioma
  {
    const db = { row: twoCourseRow() };
    const s = makeSession({ db, uiLang: 'en', bankEvents: [{ id: 77, teacher_flashcard_id: 1, grade: 2, created_at: new Date(T0 + 20 * DAY).toISOString() }] });
    await s.loadState();
    check('banco: bankReviewTargetCard acha o t1 com a memória (6)', s.run('bankReviewTargetCard(1).reps') === 6);
    const n = await s.run('applyPendingBankReviews()');
    check('banco: nota aplicada e confirmada', n === 1 && s.acks[0] === 77 && s.card('t1').reps === 7);
    check('banco: gravado no idioma e nos dois cursos', memOf(db.row._lang.frances, 't1').reps === 7 && memOf(db.row.frances, 't1').reps === 7 && memOf(db.row['frances@en'], 't1').reps === 7);
  }
  // 9. outro idioma (mandarim) nunca é tocado
  {
    const row = twoCourseRow(); row.mandarim = { xp: 9, cards: [Object.assign(teacherCard(1), studied('t1', 1, 2))] };
    const db = { row };
    const s = makeSession({ db, uiLang: 'en' }); await s.loadState(); await s.saveState();
    check('mandarim intacto e sem _lang.mandarim', eq(db.row.mandarim, row.mandarim) && !db.row._lang.mandarim);
    const z = makeSession({ db, appKey: 'mandarim', uiLang: 'pt-BR' }); await z.loadState();
    check('mandarim: t1 do chinês não recebe a memória do francês', z.card('t1').reps === 1);
  }

  // ---------- (C) leitores do servidor ----------
  {
    let src = read('supabase/functions/notification-cron/index.ts').replace(/^import .*$/mg, '');
    const js = mod.stripTypeScriptTypes(src);
    const ctx = { console: { log(){}, error(){} }, Date, Object, Number, Array, Promise, Map, Set, JSON, String, Math, Response: class {}, fetch: async () => ({ ok: true }),
      webpush: { setVapidDetails(){}, sendNotification: async () => {} }, Deno: { env: { get: () => 'x' }, serve(){} }, createClient: () => ({}) };
    vm.createContext(ctx);
    vm.runInContext(js + '\nthis.__B = blockForLanguage; this.__C = computeReviewOverdueCount;', ctx);
    const db = { row: twoCourseRow() };
    // vencidos há muito tempo (REVIEW_OVERDUE_STALE_MS): datas antigas
    db.row.frances.cards.forEach(c => { if (c.reps) c.due = Date.now() - 30 * DAY; });
    // Hoje (antes da P1): com o curso atual = en, o cron lê o bloco en, em que os cartões da professora não têm histórico.
    const rowBefore = clone(db.row); rowBefore._meta.currentCourse = 'frances@en';
    const before = ctx.__C(ctx.__B(rowBefore, 'frances').cards, {}, 'frances');
    const legacyCount = ctx.__C(db.row.frances.cards, {}, 'frances');
    const s = makeSession({ db, uiLang: 'en' }); await s.loadState(); await s.saveState();
    const cronBlock = ctx.__B(db.row, 'frances');
    check('cron: lê o bloco do curso atual (en), como antes', db.row._meta.currentCourse === 'frances@en' && cronBlock === db.row['frances@en']);
    check('cron: antes da P1 o curso en não contava nenhum vencido da professora/próprios (0); agora conta os 3 do idioma', before === 0 && legacyCount === 3 && ctx.__C(cronBlock.cards, {}, 'frances') === 3, { before, legacyCount, after: ctx.__C(cronBlock.cards, {}, 'frances') });
    check('cron: o bloco pt continua com os mesmos 3', ctx.__C(db.row.frances.cards, {}, 'frances') === 3);
    check('cron: _lang não é confundido com bloco', ctx.__B({ _lang: { frances: {} } }, 'frances') == null);
    // painel da professora: _progress_block(data, appKey) lê o bloco de _meta.currentCourse -> o espelho tem a memória
    const panelBlock = db.row['frances@en'];
    const studiedTeacher = panelBlock.cards.filter(c => c.origin === 'teacher' && c.reps > 0).length;
    check('painel: bloco do curso atual (en) tem os 2 cartões da professora com histórico', studiedTeacher === 2);
  }

  console.log(`p1-memoria-por-idioma: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
