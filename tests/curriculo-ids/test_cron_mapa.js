// Etapa 0b do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.4 e 2.6 item 7): o notification-cron conta
// "N palavras prontas para revisar" pelo mapa GERADO STUDY_ITEM_GATE (scripts/gerar_mapa_cron.js), não mais por regex no
// id + LESSON_VOCAB_MAP feito à mão.
//   1. o trecho gerado dos dois arquivos (repo e cópia do painel) está em dia com o conteúdo (--conferir)
//   2. ANTES x DEPOIS: a contagem nova é igual à da v25 (cópia congelada em cron_v25_referencia.js) para os saves
//      simulados (fr e zh), em vários "agora", com o save cru, o save depois de uma ida e volta (com `released`) e o
//      formato antigo (objeto inteiro com unitId/vocabIdx)
//   3. a contagem nova bate com o que o CLIENTE mostra (isCardLessonCompleted + atraso de 48h, uma por palavra)
//   4. conteúdo v2 de teste (seção 5 do 04): item movido conta pela unidade nova, `released` respeitado, aposentado fora,
//      chave fundida conta uma vez só
// Rodar: node tests/curriculo-ids/test_cron_mapa.js
const fs = require('fs'), path = require('path'), vm = require('vm'), mod = require('module');
const { check, summary } = require('../fase-e/harness');
const L = require('./lib');
const G = require('../../scripts/gerar_mapa_cron.js');

const ROOT = L.ROOT;
const SOURCES = [
  ['repo', 'supabase/functions/notification-cron/index.ts'],
  ['painel', 'docs/deploy/notification-cron-para-colar-no-painel.ts'],
];
const DAY = 86400000;
const NOWS = [Date.UTC(2026, 9, 10), Date.UTC(2026, 10, 1), Date.UTC(2027, 5, 1)];

// Relógio controlado: o cron usa Date.now().
function clockCtx(){
  let now = NOWS[0];
  class FakeDate extends Date { static now(){ return now; } }
  const ctx = vm.createContext({ Date: FakeDate, Object, Number, Array, Set, Map, String, JSON, Math });
  ctx.__setNow = (n) => { now = n; };
  return ctx;
}
function loadNew(file){
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const consts = src.match(/const REVIEW_OVERDUE_STALE_MS[^\n]*\nconst REVIEW_OVERDUE_MIN_COUNT[^\n]*/)[0];
  const body = src.slice(src.indexOf(G.BEGIN), src.indexOf('function fillPlaceholders('));
  const ctx = clockCtx();
  vm.runInContext(mod.stripTypeScriptTypes(consts + '\n' + body) +
    '\nthis.count = computeReviewOverdueCount; this.gate = studyWordGate; this.GATE = STUDY_ITEM_GATE;' +
    '\nthis.setGate = (g) => { Object.keys(STUDY_ITEM_GATE).forEach(k => delete STUDY_ITEM_GATE[k]); Object.assign(STUDY_ITEM_GATE, JSON.parse(JSON.stringify(g))); };', ctx);
  return ctx;
}
function loadOld(){
  const ctx = clockCtx();
  ctx.module = { exports: {} };
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'cron_v25_referencia.js'), 'utf8') + '\nthis.count = computeReviewOverdueCount;', ctx);
  return ctx;
}
const at = (ctx, now, cards, up, app) => { ctx.__setNow(now); return ctx.count(cards, up, app); };

// ============ 1. trecho gerado em dia ============
console.log('== mapa gerado');
{
  const block = G.currentText();
  SOURCES.forEach(([label, file]) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    check(`${label}: trecho gerado em dia (node scripts/gerar_mapa_cron.js --conferir)`, G.replaceBlock(src, block, file) === src);
    check(`${label}: sem LESSON_VOCAB_MAP nem regex de id`, !/const LESSON_VOCAB_MAP|STUDY_CARD_ID_RE/.test(src));
  });
  const ctx = L.frContext();
  const gate = loadNew(SOURCES[0][1]).GATE;
  const words = ctx.STATE.cards.filter(c => c.origin === 'study' && c.vocabIdx != null);
  check('fr: toda palavra (A e B) do conteúdo tem entrada no mapa', words.every(c => gate.frances[c.id.replace(/-b$/, '')]), words.length);
  check('fr: unidade e lição do mapa = as do cliente', words.every(c => {
    const e = gate.frances[c.id.replace(/-b$/, '')];
    const u = ctx.UNITS.find(x => x.id === c.unitId);
    return e[0] === String(c.unitId) && e[1] === ctx.lessonIndexForVocabIdx(u, c.vocabIdx);
  }));
  check('fr: frases ("Na frase") fora do mapa', ctx.STATE.cards.filter(c => c.phraseIdx != null).every(c => !gate.frances[c.id]));
  check('fr: 204 palavras no mapa', Object.keys(gate.frances).length === 204, Object.keys(gate.frances).length);
  const zctx = require('../fase-e/harness').loadLang('zh');
  const zwords = zctx.buildCardsFromUnits(zctx.UNITS).filter(c => c.origin === 'study' && c.vocabIdx != null);
  check('zh: toda palavra tem entrada (regra antiga de id)', zwords.length > 0 && zwords.every(c => gate.mandarim[c.id.replace(/-b$/, '')] && gate.mandarim[c.id.replace(/-b$/, '')][0] === String(c.unitId)));
  check('pt: sem mapa (sem trilha publicada)', !gate.portugues);
  check('mapa igual nos dois arquivos', JSON.stringify(loadNew(SOURCES[1][1]).GATE) === JSON.stringify(gate));
}

// ============ 2. antes x depois ============
console.log('== antes (v25) x depois (mapa gerado)');
const OLD = loadOld();
const NEWS = SOURCES.map(([label, file]) => [label, loadNew(file)]);
const isOrphan = (gateApp) => (c) => c && typeof c.id === 'string' && /^u/.test(c.id) && !c.origin && !gateApp[c.id.replace(/-b$/, '')] && /-v\d+(-b)?$/.test(c.id);

function unitProgressVariants(up, ctxUnits){
  const out = [['save', up]];
  const started = Object.keys(up || {}).find(id => up[id].started && !up[id].completed);
  if (started) for (let li = 0; li <= 5; li++) out.push([`${started} lição ${li}`, Object.assign({}, up, { [started]: Object.assign({}, up[started], { lessonIdx: li }) })]);
  // todas as unidades de lições começadas na lição 2 (portão parcial em toda parte)
  const all = {}; ctxUnits.forEach(u => { all[u.id] = { started: true, completed: false, lessonIdx: 2 }; });
  out.push(['tudo na lição 2', all]);
  out.push(['nada começado', {}]);
  return out;
}

let comparisons = 0, diffs = [];
function compare(name, cards, up, app, units, onlySave){
  (onlySave ? [['save', up]] : unitProgressVariants(up, units)).forEach(([vn, upv]) => NOWS.forEach(now => {
    const a = at(OLD, now, cards, upv, app);
    NEWS.forEach(([label, ctx]) => {
      comparisons++;
      const b = at(ctx, now, cards, upv, app);
      if (a !== b) diffs.push(`${label} ${name} / ${vn} / ${new Date(now).toISOString().slice(0, 10)}: antes ${a}, depois ${b}`);
    });
  }));
}
{
  const ctx = L.frContext();
  const gateFr = NEWS[0][1].GATE.frances;
  const saves = L.simulatedSaves(ctx).concat(L.realSaves());
  let orphanSeen = 0;
  saves.forEach(s => {
    // Órfão (id de palavra que não existe mais no conteúdo): a v25 contava se a unidade do id estivesse concluída; o
    // cliente (Etapa 0a) manda para o arquivo e não mostra. O cron novo segue o cliente; fica fora desta comparação e é
    // conferido à parte abaixo.
    const cards = s.block.cards.filter(c => !isOrphan(gateFr)(c));
    orphanSeen += s.block.cards.length - cards.length;
    compare(`fr "${s.name}" cru`, cards, s.block.unitProgress, 'frances', ctx.UNITS);
    // formato antigo: objeto inteiro (origin study + unitId/vocabIdx), como antes da K2-C (2026-09-30). Só palavras:
    // o cartão "Na frase" nasceu depois (2026-10-06), sempre no formato id + progresso.
    const full = cards.map(c => {
      const built = ctx.STATE.cards.find(x => x.id === c.id);
      return built && built.vocabIdx != null ? Object.assign({}, c, { origin: 'study', unitId: built.unitId, vocabIdx: built.vocabIdx }) : c;
    });
    compare(`fr "${s.name}" formato antigo`, full, s.block.unitProgress, 'frances', ctx.UNITS);
    // depois de carregar e salvar pelo caminho real (ganha `released`, lessonId, arquivo). Só com o unitProgress do
    // próprio save: baixar lessonIdx à mão faria o `released` (que a v25 não conhecia) valer, de propósito.
    const c2 = L.loadBlock(L.frContext(), s.block);
    const saved = L.saveBlock(c2);
    compare(`fr "${s.name}" ida e volta`, saved.cards.filter(c => !isOrphan(gateFr)(c)), saved.unitProgress, 'frances', ctx.UNITS, true);
    // e no idioma errado/sem mapa nada da trilha conta (igual antes: sem unidade concluída no outro idioma)
    compare(`fr "${s.name}" como mandarim`, cards, {}, 'mandarim', ctx.UNITS);
  });
  check('saves simulados do fr têm palavras atrasadas (a comparação não é trivial)',
    saves.some(s => NOWS.some(n => at(OLD, n, s.block.cards, s.block.unitProgress, 'frances') >= 3)));
  check('o save com órfãos antigos foi exercitado', orphanSeen === 1, orphanSeen);
}
{
  // zh: saves simulados a partir do conteúdo do zh (sem chave; ids pela regra antiga)
  const zctx = require('../fase-e/harness').loadLang('zh');
  const cards = zctx.serializeCardsForSave(zctx.buildCardsFromUnits(zctx.UNITS));
  const r = L.rng(4242);
  cards.forEach(e => { if (r() < 0.7){ const last = NOWS[0] - Math.floor(r() * 40) * DAY; Object.assign(e, { reps: 1 + Math.floor(r() * 5), state: 'review', lastReview: last, due: last + Math.floor(1 + r() * 30) * DAY, stability: 5 }); } });
  const up = {};
  zctx.UNITS.forEach((u, i) => { if (i < 6) up[u.id] = { started: true, completed: true, lessonIdx: 0 }; else if (i === 6) up[u.id] = { started: true, completed: false, lessonIdx: 2 }; });
  compare('zh simulado', cards, up, 'mandarim', zctx.UNITS);
  compare('zh simulado (unidade como número)', cards, Object.fromEntries(Object.entries(up).map(([k, v]) => [Number(k), v])), 'mandarim', zctx.UNITS);
  check('zh: há palavras atrasadas', NOWS.some(n => at(OLD, n, cards, up, 'mandarim') >= 3));
}
console.log(`  ${comparisons} comparações antes x depois, ${diffs.length} diferentes`);
check(`antes x depois: ${comparisons} comparações, todas iguais`, diffs.length === 0, diffs.slice(0, 10));

// Órfão: diferença de propósito (o cron passa a seguir o cliente).
{
  const up = { 'A1-1': { started: true, completed: true, lessonIdx: 0 } };
  const old = NOWS[2] - 10 * DAY;
  const orphan = [{ id: 'uA1-1-v99', reps: 2, due: old }, { id: 'uA1-1-v99-b', reps: 2, due: old }];
  check('órfão: a v25 contava (1), o cron novo não conta (0), como a tela Revisão', at(OLD, NOWS[2], orphan, up, 'frances') === 1 && at(NEWS[0][1], NOWS[2], orphan, up, 'frances') === 0);
}

// ============ 3. cron novo = o que o cliente mostra ============
console.log('== cron x cliente');
function clientCount(ctx, now){
  const seen = new Set();
  ctx.STATE.cards.forEach(c => {
    if (c.origin !== 'study' || c.vocabIdx == null) return;
    if (!(c.reps > 0 && c.due && now - c.due > 48 * 3600 * 1000)) return;
    if (!ctx.isCardLessonCompleted(c)) return;
    seen.add(c.id.replace(/-b$/, ''));
  });
  return seen.size;
}
{
  const ctx0 = L.frContext();
  let n = 0, bad = [];
  L.simulatedSaves(ctx0).forEach(s => {
    const c = L.loadBlock(L.frContext(), s.block);
    const saved = L.saveBlock(c);
    NOWS.forEach(now => {
      n++;
      const a = clientCount(c, now), b = at(NEWS[0][1], now, saved.cards, saved.unitProgress, 'frances');
      if (a !== b) bad.push(`${s.name} ${now}: cliente ${a}, cron ${b}`);
    });
  });
  check(`cron = cliente nos saves simulados (${n} casos)`, bad.length === 0, bad);
}

// ============ 4. conteúdo v2 de teste ============
console.log('== conteúdo v2 de teste (mover, fundir, aposentar)');
{
  const ctx = L.frContext();
  const changes = L.applyV2(ctx);
  const ch = ctx.__run('({ STUDY_KEY_MERGES, STUDY_RETIRED_KEYS })');
  const gate = G.buildGate(ctx.UNITS, ch, { studyWordCardId: ctx.studyWordCardId, lessonIndexForVocabIdx: ctx.lessonIndexForVocabIdx });
  const cron = loadNew(SOURCES[0][1]);
  cron.setGate({ frances: gate });
  check('v2: palavra movida mapeia para a unidade nova (uA1-10-v6 -> A1-28)', gate['uA1-10-v6'] && gate['uA1-10-v6'][0] === 'A1-28');
  check('v2: palavra reordenada mantém a unidade e ganha a lição nova', gate['uA1-3-v10'] && gate['uA1-3-v10'][0] === 'A1-3' && gate['uA1-3-v10'][1] === 1);
  check('v2: aposentado fora do mapa (uA1-20-v9)', !gate['uA1-20-v9'] && changes.retired.includes('A1-20-v9'));
  check('v2: chave fundida aponta para o sobrevivente', JSON.stringify(gate['uA1-9-v0']) === JSON.stringify([gate['uA1-2-v7'][0], gate['uA1-2-v7'][1], 'uA1-2-v7']));
  check('v2: o gerador acha o id repetido', (() => { try { G.buildGate([{ id: 'X', vocab: [{ k: 'X-v0' }, { k: 'X-v0' }], lessons: [] }], null, { studyWordCardId: ctx.studyWordCardId, lessonIndexForVocabIdx: ctx.lessonIndexForVocabIdx }); return false; } catch (e) { return /repetido/.test(e.message); } })());
  const now = NOWS[2], old = now - 10 * DAY;
  const W = (id, extra) => Object.assign({ id, reps: 2, due: old, state: 'review' }, extra);
  const up = { 'A1-10': { started: true, completed: true, lessonIdx: 0 }, 'A1-2': { started: true, completed: true, lessonIdx: 0 }, 'A1-9': { started: true, completed: true, lessonIdx: 0 }, 'A1-20': { started: true, completed: true, lessonIdx: 0 } };
  const n = (cards, u) => at(cron, now, cards, u || up, 'frances');
  check('v2: palavra movida para unidade não começada SEM released não conta (portão)', n([W('uA1-10-v6'), W('uA1-10-v6-b')]) === 0);
  check('v2: palavra movida COM released conta (continua na Revisão)', n([W('uA1-10-v6', { released: true }), W('uA1-10-v6-b', { released: true })]) === 1);
  check('v2: palavra movida conta quando a unidade nova é concluída', n([W('uA1-10-v6')], Object.assign({}, up, { 'A1-28': { started: true, completed: true, lessonIdx: 0 } })) === 1);
  check('v2: aposentado não conta', n([W('uA1-20-v9', { released: true }), W('uA1-20-v9-b', { released: true })]) === 0);
  check('v2: antiga + sobrevivente da fusão contam 1 palavra', n([W('uA1-9-v0'), W('uA1-9-v0-b'), W('uA1-2-v7'), W('uA1-2-v7-b')]) === 1);
  check('v2: só a antiga da fusão (aluno não abriu o app) conta 1', n([W('uA1-9-v0')]) === 1);
  // e bate com o cliente depois que o aluno abre o app com o conteúdo v2
  const ctxB = L.frContext();
  const s3 = L.simulatedSaves(ctxB)[3];
  L.applyV2(ctxB);
  L.loadBlock(ctxB, s3.block);
  const saved = L.saveBlock(ctxB);
  check('v2: cron = cliente depois do carregamento (save com 24 unidades concluídas)',
    NOWS.every(t => clientCount(ctxB, t) === at(cron, t, saved.cards, saved.unitProgress, 'frances')),
    NOWS.map(t => [clientCount(ctxB, t), at(cron, t, saved.cards, saved.unitProgress, 'frances')]));
}

summary('curriculo-ids cron');
