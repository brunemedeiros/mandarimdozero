// K2-D -- janela transitória criada pela K2-C: Note -> A (histórico) + B (New)
// convivendo no Review/Deck enquanto consumidores pedagógicos ainda assumem
// "1 palavra = 1 card" (K2-E). Node/VM, código real.
// Rodar: node tests/k2d/test_transitional_window.js
const { loadLang, read, check, summary, fakeEnsureCourseDecks } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = c => vm.runInContext(c, ctx);
  const units = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  const u0 = units[0];
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.STATE.unitProgress = {};
  ctx.UNITS.forEach(u => { ctx.STATE.unitProgress[u.id] = { started: true, completed: true, lessonIdx: 99 }; });
  const store = [];
  const decks = fakeEnsureCourseDecks(store, ctx.APP_KEY, ctx.courseUnitsForDecks(ctx.UNITS));
  ctx.assignCourseDeckIds(ctx.STATE.cards, ctx.buildCourseDeckIndex(decks, ctx.APP_KEY));
  ctx.STATE.decks = decks; ctx.STATE.courseDecksLoaded = true;
  ctx.STATE.studySettings.newCardsPerDay = 1000;
  ctx.STATE.studySettings.sessionIntensity = 'all';

  const A = ctx.STATE.cards.find(c => c.id === `u${u0.id}-v0`);
  const B = ctx.STATE.cards.find(c => c.id === `u${u0.id}-v0-b`);
  const other = ctx.STATE.cards.filter(c => c.unitId === u0.id && c !== A && c !== B);
  const deckId = A.deckId;

  // Uma Note gera A+B (mesma Note, direções opostas)
  check(lang + ': uma Note gera A e B', !!A && !!B && A.note === B.note);
  check(lang + ': direções independentes (A e B invertidos)',
    A.cardInstance.frontFieldIndex === B.cardInstance.backFieldIndex &&
    A.cardInstance.backFieldIndex === B.cardInstance.frontFieldIndex);

  // A tem histórico (Review vencido); B continua New
  const past = Date.now() - 86400000;
  Object.assign(A, { reps: 4, lapses: 1, stability: 8, difficulty: 5, state: 'review', due: past, lastReview: past - 86400000 });
  const snapshotA = JSON.stringify({ reps: A.reps, due: A.due, stability: A.stability, difficulty: A.difficulty, lapses: A.lapses, state: A.state });
  const snapshotB = () => JSON.stringify({ reps: B.reps, due: B.due, stability: B.stability, difficulty: B.difficulty, lapses: B.lapses, state: B.state });
  const b0 = snapshotB();
  check(lang + ': B nasce New sem herdar nada de A',
    B.reps === 0 && B.due === 0 && B.stability === 0 && B.difficulty === 0 && B.lapses === 0 && B.state === 'new');

  // B entra na estrutura de Review/New; nada é escondido
  const pool = ctx.eligibleDeckReviewPool();
  check(lang + ': A e B estão no pool elegível (nenhum é filtrado)', pool.includes(A) && pool.includes(B));
  const counts = ctx.deckCountsForReview(deckId);
  const unitTotal = 2 + other.length;
  check(lang + ': Deck conta CardInstances (B como New, A como Review)',
    counts.new >= 1 && counts.review >= 1 && counts.new + counts.learning + counts.review >= 2, counts);
  const queue = ctx.reviewFilterQueue('oldest', pool.filter(c => c.deckId === deckId));
  check(lang + ': B entra na fila via New', queue.includes(B));
  check(lang + ': A entra na fila via Review vencido', queue.includes(A));

  // newCardsPerDay pode limitar B (nenhuma regra especial)
  ctx.STATE.studySettings.newCardsPerDay = 0;
  const limited = ctx.reviewFilterQueue('oldest', pool.filter(c => c.deckId === deckId));
  check(lang + ': newCardsPerDay=0 exclui B mas mantém A', !limited.includes(B) && limited.includes(A));
  ctx.STATE.studySettings.newCardsPerDay = 1000;

  // FSRS independente: graduar B não toca A; graduar A não toca B
  const b1 = snapshotB();
  ctx.applyMemoryGrade(A, 3);
  check(lang + ': graduar A não altera B', snapshotB() === b1 && b1 === b0);
  const a2 = JSON.stringify({ reps: A.reps, due: A.due, stability: A.stability, difficulty: A.difficulty, lapses: A.lapses, state: A.state });
  ctx.applyMemoryGrade(B, 3);
  check(lang + ': graduar B não altera A', JSON.stringify({ reps: A.reps, due: A.due, stability: A.stability, difficulty: A.difficulty, lapses: A.lapses, state: A.state }) === a2);
  check(lang + ': B tem FSRS próprio após grade (reps 1, state != new)', B.reps === 1 && B.state !== 'new');

  // Nenhuma regra "B só depois de A" / cardinalidade preservada
  const all = ctx.STATE.cards.filter(c => c.unitId === u0.id);
  check(lang + ': cardinalidade final 2 CardInstances por palavra', all.length === u0.vocab.length * 2);

  // Consumidores K2-E: identificados, NÃO corrigidos (o comportamento atual é o esperado hoje)
  const fresh = ctx.buildCardsFromUnits(ctx.UNITS); ctx.STATE.cards = fresh;
  const fa = fresh.find(c => c.id === `u${u0.id}-v0`); fa.reps = 1;
  const uc = ctx.unitCardCounts ? ctx.unitCardCounts(u0.id) : null;
  if (uc){
    check(lang + ' [K2-E pendente]: unitCardCounts ainda conta por CardInstance (total = 2 x palavras)', uc.total === u0.vocab.length * 2, uc);
  } else {
    console.log('  (unitCardCounts não extraído no harness -- coberto por leitura em app.js)');
  }
}

// Documenta, por leitura do código real, que os consumidores K2-E continuam por CardInstance.
for (const lang of ['fr', 'zh']){
  const src = read(lang + '/app.js');
  check(lang + ' [K2-E migrado]: checkUnitCompletion opera por palavra (não exige reps>0 em todo card)', /studyWordGroups\(pool\)\.every\(studyWordHasEvidence\)/.test(src) && !/pool\.every\(c => c\.reps > 0\)/.test(src));
  check(lang + ' [K2-E]: unitCardCounts parte de STATE.cards por unitId (contagem de palavras via wordLevelLearnedCounts)', /function unitCardCounts[\s\S]{0,200}c\.unitId === unitId/.test(src));
  check(lang + ': nextCardDirection/reviewDirection/lastDirection ainda existem (saem só em K2-G)',
    /nextCardDirection/.test(src) && /reviewDirection/.test(src) && /lastDirection/.test(src));
}
summary('K2-D janela transitória');
