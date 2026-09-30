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
// 6 mistura: teacher/self mantem (sem unitId nao passa o gate, como sempre)
const T = { id: 't12', origin: 'teacher', reps: 1, due: OLD, unitId: null, vocabIdx: null };
const T2 = { id: 't12-b', origin: 'teacher', reps: 1, due: OLD, unitId: null, vocabIdx: null };
const Sf = { id: 's5-b', origin: 'self', reps: 1, due: OLD };
t('6 teacher/self como antes (0) + study dedup', n([S('uA1-1-v0'), S('uA1-1-v0-b'), T, T2, Sf]) === 1);
// 6b: mesmo se teacher/self passassem o gate, NAO deduplica por -b
const P2 = { ...P, X: { started: true, completed: true, lessonIdx: 9 } };
const TT = [{ id: 't1', origin: 'teacher', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }, { id: 't1-b', origin: 'teacher', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }];
t('6b teacher t1 + t1-b contam 2 (sem dedup)', ctx.count(TT, P2, 'frances') === 2);
// origin explicito teacher com id "u..-b" nunca vira study
t('6c origin teacher com id u.. nao deduplica', ctx.count([{ id: 'uX-v0', origin: 'teacher', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }, { id: 'uX-v0-b', origin: 'teacher', unitId: 'X', vocabIdx: 0, reps: 1, due: OLD }], P2, 'frances') === 2);
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
console.log(`${pass} ok, ${fail} falhas`); process.exit(fail ? 1 : 0);
