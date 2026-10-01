// K.2 -- contrato de metricas de Analytics (shared/analytics-metrics.js).
// Node/VM com o codigo REAL (shared/ + cards construidos pelo motor real
// buildEngineCardsFromRow / buildCardsFromUnits). Rodar: node tests/k2/test_analytics_metrics.js
const { loadLang, read, check, summary } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = c => vm.runInContext(c, ctx);
  run(read('shared/analytics-metrics.js'));
  const appKey = lang === 'fr' ? 'frances' : 'mandarim';
  const NOW = Date.now(), PAST = NOW - 86400e3, FUT = NOW + 86400e3 * 5;

  const F = (id, l, v, extra) => Object.assign({ id, lang: l, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null }, extra || {});
  const row = (id, mode, fields, extra) => Object.assign({ id, revision: 0, status: 'active', note: null, tags: [], deck_id: null, fields, card_generation_mode: mode }, extra || {});
  const build = (r, origin) => ctx.buildEngineCardsFromRow(r, { origin, appKey, idPrefix: origin === 'teacher' ? 't' : 's' });
  const textFields = (a, b) => [F('f0', lang === 'fr' ? 'fr' : 'zh', a), F('f1', 'pt-BR', b)];
  const study = (c, o) => Object.assign(c, { reps: 2, state: 'review', stability: 8, difficulty: 5, interval: 10, lapses: 0, due: PAST }, o || {});
  const T = (id, mode, f, ex) => build(row(id, mode, f, ex), 'teacher');
  const S = (id, mode, f, ex) => build(row(id, mode, f, ex), 'self');
  const clozeFields = () => [F('f0', lang === 'fr' ? 'fr' : 'zh', 'Je {{c1::suis}} {{c2::ici}} {{c3::la}}'), F('f1', 'pt-BR', 'Eu estou aqui')];

  // 1. Normal: 1 Note / 1 CardInstance
  let cs = T(1, 'normal', textFields('a', 'b'));
  let m = ctx.analyticsSummaryByOrigin(cs, 'teacher', NOW);
  check(lang + ' 1 Normal: 1 cartao, 1 conteudo', m.structural.cards === 1 && m.content.notes === 1, m);

  // 2. Reverso: 1 Note / 2 CardInstances, estados FSRS independentes
  cs = T(2, 'normal_reversed', textFields('a', 'b'));
  study(cs[0], { state: 'review' });                      // A: Review devido
  cs[1].state = 'learning'; cs[1].reps = 1; cs[1].due = FUT; // B: Learning, nao devido
  m = ctx.analyticsSummaryByOrigin(cs, 'teacher', NOW);
  check(lang + ' 2 Reverso: 2 cartoes, 1 conteudo', m.structural.cards === 2 && m.content.notes === 1, m);
  check(lang + ' 2 Reverso: A Review devido + B Learning (estados independentes)', m.structural.review === 1 && m.structural.learning === 1 && m.structural.due === 1 && m.structural.reviewDue === 1, m.structural);

  // 3. Cloze: 1 Note / N CardInstances (nao N conteudos)
  cs = T(3, 'cloze', clozeFields());
  m = ctx.analyticsSummaryByOrigin(cs, 'teacher', NOW);
  check(lang + ' 3 Cloze 3 marcas: 3 cartoes, 1 conteudo', cs.length === 3 && m.structural.cards === 3 && m.content.notes === 1, m);

  // 4. Teacher: dois siblings, um estudado e outro New
  cs = T(4, 'normal_reversed', textFields('a', 'b'));
  study(cs[0], { lapses: 0, interval: 80 });             // forte
  m = ctx.analyticsSummaryByOrigin(cs, 'teacher', NOW);
  check(lang + ' 4 Teacher A estudado/B New: conteudo estudado=1, nao iniciado=0', m.content.studied === 1 && m.content.notStarted === 0 && m.content.notes === 1, m.content);
  check(lang + ' 4 Teacher: forca usa so o sibling estudado (B New nao rebaixa) = strong', m.content.strength.strong === 1 && m.content.strength.weak === 0 && m.content.strength.not_started === 0, m.content.strength);
  check(lang + ' 4 Teacher: estrutural New=1 Review=1 (B nao some)', m.structural.new === 1 && m.structural.review === 1, m.structural);

  // 5. Self: mesma regra
  cs = S(5, 'normal_reversed', textFields('a', 'b'));
  study(cs[1], { interval: 80 });
  m = ctx.analyticsSummaryByOrigin(cs, 'self', NOW);
  check(lang + ' 5 Self B estudado/A New: estudado=1, strong', m.content.studied === 1 && m.content.strength.strong === 1 && m.content.strength.not_started === 0, m.content);

  // 6. Study Trail: A estudado/B New => palavra = 1, aprendida
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const u0 = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length)[0];
  const sA = cards.find(c => c.id === `u${u0.id}-v0`), sB = cards.find(c => c.id === `u${u0.id}-v0-b`);
  const courseWords = cards.length / 2;
  let wp = ctx.studyTrailWordProgress(cards);
  check(lang + ' 6 Study: nada estudado = 0 aprendidas; total = curso inteiro (palavras, nao cartoes)', wp.learned === 0 && wp.total === courseWords, wp);
  study(sA);
  wp = ctx.studyTrailWordProgress(cards);
  check(lang + ' 6 Study: A estudado/B New => palavra aprendida = 1; B nao cria segunda palavra', wp.learned === 1 && wp.total === courseWords, wp);
  study(sB);
  check(lang + ' 6 Study: A e B estudados = ainda 1 palavra', ctx.studyTrailWordProgress(cards).learned === 1);
  check(lang + ' 6 Study: courseWordTotal explicito prevalece como denominador', ctx.studyTrailWordProgress(cards, 800).total === 800);
  check(lang + ' 6 Study: conteudo futuro sem evidencia nunca entra no numerador', ctx.studyTrailWordProgress(cards).learned <= 1);
  Object.assign(sA, { reps: 0, state: 'new' }); Object.assign(sB, { reps: 0, state: 'new' });

  // 7. Nenhum sibling estudado => Nao iniciada, nao Fraca
  cs = T(7, 'normal_reversed', textFields('a', 'b'));
  m = ctx.analyticsSummaryByOrigin(cs, 'teacher', NOW);
  check(lang + ' 7 nenhum estudado: not_started=1, weak=0', m.content.strength.not_started === 1 && m.content.strength.weak === 0 && m.content.notStarted === 1, m.content);

  // 8. Dois siblings estudados: usa o MAIS FRACO
  cs = T(8, 'normal_reversed', textFields('a', 'b'));
  study(cs[0], { interval: 80, lapses: 0 });             // forte
  study(cs[1], { interval: 5, lapses: 0 });              // mediana
  check(lang + ' 8 forte+mediana => medium (mais fraco)', ctx.noteStrengthBucket(cs) === 'medium');
  study(cs[1], { interval: 5, lapses: 3 });              // fraca
  check(lang + ' 8 forte+fraca => weak', ctx.noteStrengthBucket(cs) === 'weak');
  study(cs[0], { interval: 80 }); study(cs[1], { interval: 90 });
  check(lang + ' 8 forte+forte => strong', ctx.noteStrengthBucket(cs) === 'strong');

  // 9. Arquivado fora de numeradores/denominadores ativos
  const ts = [...T(9, 'normal_reversed', textFields('a', 'b'), { status: 'archived' }), ...T(10, 'normal', textFields('c', 'd'))];
  ts.forEach(c => study(c));
  m = ctx.analyticsSummaryByOrigin(ts, 'teacher', NOW);
  check(lang + ' 9 arquivado fora: 1 cartao, 1 conteudo, 1 estudado', m.structural.cards === 1 && m.content.notes === 1 && m.content.studied === 1, m);
  check(lang + ' 9 arquivado contado so como informativo (2 cartoes, 1 note)', m.archived.cards === 2 && m.archived.notes === 1, m.archived);
  check(lang + ' 9 arquivado nao entra em ownContentProgress', ctx.ownContentProgress(ts, 'teacher').total === 1);

  // 10. New/Learning/Review: classificacao compartilhada K1
  const mk = (o) => Object.assign({ origin: 'teacher', flashcardStatus: 'active', id: 'x', rowId: 1, reps: 0, state: 'new', due: 0, lapses: 0, interval: 0 }, o);
  const agree = [mk({}), mk({ reps: 2, state: 'new', due: PAST }), mk({ reps: 1, state: 'learning' }), mk({ reps: 1, state: 'relearning' }), mk({ reps: 3, state: 'review' })];
  check(lang + ' 10 cardNLR == cardStudyBucket (K1) para todos', agree.every(c => ctx.cardNLR(c) === ctx.cardStudyBucket(c)));
  check(lang + ' 10 save antigo state=new reps>0 = learning (nao New)', ctx.cardNLR(agree[1]) === 'learning' && ctx.cardNLR(agree[0]) === 'new');
  const sc = ctx.structuralCounts(agree, NOW);
  check(lang + ' 10 contagens estruturais N=1 L=3 R=1', sc.new === 1 && sc.learning === 3 && sc.review === 1, sc);

  // 11. Review vs Due
  const rv = [mk({ reps: 3, state: 'review', due: FUT }), mk({ reps: 3, state: 'review', due: PAST }), mk({ reps: 0, state: 'new', due: 0 })];
  const rc = ctx.structuralCounts(rv, NOW);
  check(lang + ' 11 Review nao implica Devido: 2 Review, 1 devido; New com due=0 nunca devido', rc.review === 2 && rc.reviewDue === 1 && rc.due === 1, rc);
  check(lang + ' 11 isCardDue: New due=0 = false', ctx.isCardDue(rv[2], NOW) === false && ctx.isCardDue(rv[1], NOW) === true && ctx.isCardDue(rv[0], NOW) === false);
  // paridade com o Deck Engine (mesma semantica de "Para revisar")
  check(lang + ' 11 reviewDue == countReviewCards do Deck; learning/new idem', rc.reviewDue === ctx.countReviewCards(rv) && sc.learning === ctx.countLearningCards(agree) && sc.new === ctx.countNewCards(agree));

  // 12. unitId null nao exclui Teacher/Self
  cs = T(11, 'normal', textFields('a', 'b')); study(cs[0]);
  check(lang + ' 12 unitId null: card teacher entra', cs[0].unitId == null && ctx.ownContentProgress(cs, 'teacher').studied === 1);

  // 13. Mistura de origens: sem contaminacao
  const mix = [...ctx.buildCardsFromUnits(ctx.UNITS).slice(0, 4), ...T(20, 'normal_reversed', textFields('a', 'b')), ...S(20, 'normal_reversed', textFields('a', 'b'))];
  study(mix[0]); study(mix[4]); study(mix[6]);
  const mT = ctx.analyticsSummaryByOrigin(mix, 'teacher', NOW), mS = ctx.analyticsSummaryByOrigin(mix, 'self', NOW), mTr = ctx.analyticsSummaryByOrigin(mix, 'study', NOW);
  check(lang + ' 13 teacher e self com mesmo rowId=20 sao Notes distintas', mT.content.notes === 1 && mS.content.notes === 1 && mT.content.studied === 1 && mS.content.studied === 1, { mT: mT.content, mS: mS.content });
  check(lang + ' 13 study nao conta teacher/self', mTr.structural.cards === 4 && mTr.content.notes === 2, mTr);
  check(lang + ' 13 palavras aprendidas ignora teacher/self', ctx.studyTrailWordProgress(mix).learned === 1);
  check(lang + ' 13 ownContentProgress valida origem', (() => { try { ctx.ownContentProgress(mix, 'study'); return false; } catch (e){ return true; } })());

  // 14. Revisoes -rN nao quebram o agrupamento por Note
  const rev = T(30, 'normal_reversed', textFields('a', 'b'), { revision: 2 });
  check(lang + ' 14 ids -rN: ' + rev.map(c => c.id).join(','), rev.every(c => /-r2/.test(c.id)) && new Set(rev.map(ctx.analyticsNoteKey)).size === 1);
  const revC = T(31, 'cloze', clozeFields(), { revision: 3 });
  check(lang + ' 14 Cloze -rN-cN: 3 cartoes, 1 chave de Note', revC.length === 3 && new Set(revC.map(ctx.analyticsNoteKey)).size === 1);
  check(lang + ' 14 geracoes diferentes da mesma linha NAO se misturam (so a atual existe)', ctx.analyticsNoteKey(rev[0]) === 'teacher:30');

  // 15. Sem inferencia por sufixo/direcao: card sem rowId vira Note propria
  const noRow = [mk({ id: 't9', rowId: undefined }), mk({ id: 't9-b', rowId: undefined })];
  check(lang + ' 15 sem rowId: nao funde por sufixo de id (2 Notes)', new Set(noRow.map(ctx.analyticsNoteKey)).size === 2);
  const src = read('shared/analytics-metrics.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  check(lang + ' 15 codigo nao usa reviewDirection/lastDirection/isReverse/regex de id', !/reviewDirection|lastDirection|isReverse|\.test\(.*\.id|\.match\(.*\.id|endsWith\(['"]-b/.test(src));
  check(lang + ' 15 modulo sem rede/estado global/FSRS', !/supabase|fetch\(|STATE\b|applyMemoryGrade|scheduleReview|localStorage/.test(src));
  check(lang + ' 15 nao inclui lastActivity nem historico por Note', !/firstLearnedDate|lastActivity/.test(src));

  // Origem desconhecida/arquivada nao entra; entradas invalidas nao quebram
  check(lang + ' entradas invalidas', ctx.structuralCounts(undefined).cards === 0 && ctx.contentMetrics([null, {}, { origin: 'x' }]).notes === 0);
  // Pureza: nao muta os cards
  const snap = JSON.stringify(cards); ctx.analyticsSummaryByOrigin(cards, 'study', NOW); ctx.studyTrailWordProgress(cards);
  check(lang + ' funcoes puras: nao mutam cards', snap === JSON.stringify(cards));
}
summary();
