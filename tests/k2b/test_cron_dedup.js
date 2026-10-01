// K2-B -- dedup de "palavras prontas pra revisar" (notification-cron).
// Carrega o código REAL de supabase/functions/notification-cron/index.ts
// (recorte de LESSON_VOCAB_MAP até computeReviewOverdueCount), transpilado
// por type-stripping do Node 22. Uso: node tests/k2b/test_cron_dedup.js
const fs = require('fs'), vm = require('vm'), path = require('path'), ts = require('module');
const src = fs.readFileSync(path.join(__dirname, '../../supabase/functions/notification-cron/index.ts'), 'utf8');
const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const consts = src.match(/const REVIEW_OVERDUE_STALE_MS[^\n]*\nconst REVIEW_OVERDUE_MIN_COUNT[^\n]*/)[0];
const body = cut('const LESSON_VOCAB_MAP', 'function fillPlaceholders(');
const js = ts.stripTypeScriptTypes ? ts.stripTypeScriptTypes(consts + '\n' + body) : null;
if (!js) throw new Error('Node sem stripTypeScriptTypes');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(js + '\nthis.count=computeReviewOverdueCount;this.MIN=REVIEW_OVERDUE_MIN_COUNT;this.STALE=REVIEW_OVERDUE_STALE_MS;', ctx);
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : (fail++, console.log('FAIL', n)); };
const OLD = Date.now() - ctx.STALE - 3600e3, FRESH = Date.now() - 3600e3;
const S = (id, o = {}) => { const m = /^u(.+)-v(\d+)/.exec(id); return { id, origin: 'study', unitId: m[1], vocabIdx: +m[2], reps: 1, due: OLD, ...o }; };
const prog = (u) => ({ [u]: { started: true, completed: true, lessonIdx: 9 } });
const P = { ...prog('A1-1'), ...prog('A1-2') };
const n = (cards, lang = 'frances') => ctx.count(cards, P, lang);

// 1 legado
t('1 legado 3 study = 3', n([S('uA1-1-v0'), S('uA1-1-v1'), S('uA1-1-v2')]) === 3);
// 2-4 A/B
t('2 A+B atrasados = 1', n([S('uA1-1-v0'), S('uA1-1-v0-b')]) === 1);
t('3 A atrasado, B nao = 1', n([S('uA1-1-v0'), S('uA1-1-v0-b', { due: FRESH })]) === 1);
t('4 A nao, B atrasado = 1', n([S('uA1-1-v0', { due: FRESH }), S('uA1-1-v0-b')]) === 1);
t('3b nenhum atrasado = 0', n([S('uA1-1-v0', { due: FRESH }), S('uA1-1-v0-b', { due: FRESH })]) === 0);
t('4b B New (reps 0) + A atrasado = 1', n([S('uA1-1-v0'), S('uA1-1-v0-b', { reps: 0, due: 0 })]) === 1);
// 5
t('5 duas palavras 4 cards = 2', n([S('uA1-1-v0'), S('uA1-1-v0-b'), S('uA1-1-v1'), S('uA1-1-v1-b')]) === 2);
// mesma idx em unidades diferentes nao colide
t('5b mesmo idx unidades diferentes = 2', n([S('uA1-1-v0'), S('uA1-2-v0-b')]) === 2);
// 6 (K.0-C, mudanca LEGITIMA de comportamento): teacher/self ATIVOS agora
// entram (antes eram descartados pelo gate de unitId); cada CardInstance conta.
const T = { id: 't12', origin: 'teacher', flashcardStatus: 'active', reps: 1, due: OLD, unitId: null, vocabIdx: null };
const T2 = { id: 't12-b', origin: 'teacher', flashcardStatus: 'active', reps: 1, due: OLD, unitId: null, vocabIdx: null };
const Sf = { id: 's5-b', origin: 'self', flashcardStatus: 'active', reps: 1, due: OLD };
t('6 study dedup (1) + teacher t12/t12-b (2) + self (1) = 4', n([S('uA1-1-v0'), S('uA1-1-v0-b'), T, T2, Sf]) === 4);
// 6b/6c: teacher com unitId e ids u../-b nunca deduplicam como trilha (agora com flashcardStatus ativo)
const P2 = { ...P, X: { started: true, completed: true, lessonIdx: 9 } };
const TT = [{ id: 't1', origin: 'teacher', flashcardStatus: 'active', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }, { id: 't1-b', origin: 'teacher', flashcardStatus: 'active', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }];
t('6b teacher t1 + t1-b contam 2 (sem dedup)', ctx.count(TT, P2, 'frances') === 2);
t('6c origin teacher com id u.. nao deduplica', ctx.count([{ id: 'uX-v0', origin: 'teacher', flashcardStatus: 'active', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }, { id: 'uX-v0-b', origin: 'teacher', flashcardStatus: 'active', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }], P2, 'frances') === 2);
// 7 threshold sobre palavras distintas
const cards3 = [S('uA1-1-v0'), S('uA1-1-v0-b'), S('uA1-1-v1'), S('uA1-1-v1-b')];
t('7 4 cards/2 palavras < threshold', n(cards3) < ctx.MIN);
t('7b 3 palavras distintas (6 cards) = 3 >= threshold', n([0, 1, 2].flatMap(i => [S(`uA1-1-v${i}`), S(`uA1-1-v${i}-b`)])) === 3 && 3 >= ctx.MIN);
// 8 retrocompat: save sem origin (antigo) segue igual
t('8 sem origin (save antigo) = 3', n([S('uA1-1-v0', { origin: undefined }), S('uA1-1-v1', { origin: undefined }), S('uA1-1-v2', { origin: undefined })]) === 3);
// gate de licao intacto: unidade nao iniciada nao conta
t('9 unidade nao iniciada = 0', ctx.count([S('uA1-9-v0'), S('uA1-9-v0-b')], P, 'frances') === 0);
t('9b janela 48h intacta', n([S('uA1-1-v0', { due: Date.now() - ctx.STALE + 60e3 })]) === 0);
// K2-C: save que serializa so id+progresso (sem unitId/vocabIdx) continua contando
const slim = (id) => ({ id, reps: 1, due: OLD });
t('10 save so id+progresso: A+B = 1', n([slim('uA1-1-v0'), slim('uA1-1-v0-b')]) === 1);
t('10b save so id+progresso: 2 palavras = 2', n([slim('uA1-1-v0'), slim('uA1-1-v0-b'), slim('uA1-1-v1')]) === 2);
// zh (unidade numerica)
const Z = (id, o = {}) => ({ id, origin: 'study', unitId: +/^u(\d+)/.exec(id)[1], vocabIdx: +/-v(\d+)/.exec(id)[1], reps: 1, due: OLD, ...o });
t('11 zh A+B = 1', ctx.count([Z('u1-v0'), Z('u1-v0-b')], { 1: { started: true, completed: true, lessonIdx: 9 } }, 'mandarim') === 1);
t('11b zh so id+progresso', ctx.count([slim('u1-v0'), slim('u1-v0-b')], { 1: { started: true, completed: true, lessonIdx: 9 } }, 'mandarim') === 1);
// entradas invalidas nao quebram
t('12 undefined/null/lixo', ctx.count(undefined, P, 'frances') === 0 && n([null, {}, { id: 5 }]) === 0);

// ---- K.0-C: Teacher/Self ----
const TS = (o, extra = {}) => ({ origin: o, flashcardStatus: 'active', unitId: null, vocabIdx: null, reps: 1, due: OLD, ...extra });
for (const o of ['teacher', 'self']) {
  const id = (x) => (o === 'teacher' ? 't' : 's') + x;
  t(`K ${o} normal ativo >48h = 1`, n([TS(o, { id: id('1'), state: 'review' })]) === 1);
  t(`K ${o} normal <48h = 0`, n([TS(o, { id: id('1'), due: FRESH })]) === 0);
  t(`K ${o} exatamente na borda 48h = 0`, n([TS(o, { id: id('1'), due: Date.now() - ctx.STALE + 60e3 })]) === 0);
  t(`K ${o} New (reps0, due0) = 0`, n([TS(o, { id: id('1'), reps: 0, due: 0, state: 'new' })]) === 0);
  t(`K ${o} learning vencido = 1`, n([TS(o, { id: id('1'), state: 'learning' })]) === 1);
  t(`K ${o} relearning vencido = 1`, n([TS(o, { id: id('1'), state: 'relearning' })]) === 1);
  t(`K ${o} review vencido = 1`, n([TS(o, { id: id('1'), state: 'review' })]) === 1);
  t(`K ${o} arquivado vencido reps>0 = 0`, n([TS(o, { id: id('1'), flashcardStatus: 'archived' })]) === 0);
  t(`K ${o} sem flashcardStatus = 0`, n([TS(o, { id: id('1'), flashcardStatus: undefined })]) === 0);
  t(`K ${o} reverso: A e B vencidos = 2`, n([TS(o, { id: id('3') }), TS(o, { id: id('3-b') })]) === 2);
  t(`K ${o} reverso: so A vencido = 1`, n([TS(o, { id: id('3') }), TS(o, { id: id('3-b'), due: FRESH })]) === 1);
  t(`K ${o} reverso: so B vencido = 1`, n([TS(o, { id: id('3'), due: FRESH }), TS(o, { id: id('3-b') })]) === 1);
  t(`K ${o} cloze 1 marca vencida = 1`, n([TS(o, { id: id('4-c1') }), TS(o, { id: id('4-c2'), due: FRESH })]) === 1);
  t(`K ${o} cloze 3 marcas vencidas = 3`, n([1, 2, 3].map(k => TS(o, { id: id('4-c' + k) }))) === 3);
  t(`K ${o} cloze marca New nao conta`, n([TS(o, { id: id('4-c1') }), TS(o, { id: id('4-c2'), reps: 0, due: 0, state: 'new' })]) === 1);
  t(`K ${o} revisao -rN com sufixos`, n([TS(o, { id: id('5-r2-b') }), TS(o, { id: id('5-r2-c1') })]) === 2);
  t(`K ${o} sem unitId nem unitProgress`, ctx.count([TS(o, { id: id('9') })], undefined, 'frances') === 1);
  t(`K ${o} zh tambem entra`, ctx.count([TS(o, { id: id('9') })], {}, 'mandarim') === 1);
}
// Mistura: trilha + teacher + self, ativos/arquivados/New/learning/review, A/B
const mix = [
  S('uA1-1-v0'), S('uA1-1-v0-b'),                       // trilha: 1 palavra
  S('uA1-1-v1', { due: FRESH }),                         // trilha <48h: 0
  S('uA1-9-v0'),                                         // trilha unidade nao iniciada: 0
  S('uA1-1-v2', { reps: 0, due: 0 }),                    // trilha New: 0
  TS('teacher', { id: 't1', state: 'review' }), TS('teacher', { id: 't1-b', state: 'learning' }),  // 2
  TS('teacher', { id: 't2', flashcardStatus: 'archived' }),                                       // 0
  TS('teacher', { id: 't3', reps: 0, due: 0, state: 'new' }),                                     // 0
  TS('self', { id: 's1', state: 'review' }), TS('self', { id: 's2', due: FRESH }),                // 1
  TS('self', { id: 's3', flashcardStatus: 'archived' }), TS('self', { id: 's4', reps: 0, due: 0 }) // 0
];
t('M mistura = 1 trilha + 2 teacher + 1 self = 4', n(mix) === 4);
t('M nenhuma duplicacao (ids repetidos contam por card, trilha dedup)', n([...mix, S('uA1-1-v0'), S('uA1-1-v0-b')]) === 4);
t('M threshold: 3 teacher ativos disparam notificacao', n([1, 2, 3].map(k => TS('teacher', { id: 't' + k }))) >= ctx.MIN);
console.log(`${pass} ok, ${fail} falhas`); process.exit(fail ? 1 : 0);
