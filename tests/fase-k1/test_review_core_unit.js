// Fase K1 -- Review Core: estados, fila e contagens (Node/VM, arquivos REAIS).
// Rodar: node tests/fase-k1/test_review_core_unit.js
const vm = require('vm');
const g = require('../fase-g/harness');
const { check, summary } = g;
const DAY = 864e5;

for (const appKey of ['frances', 'mandarim']){
  const label = appKey === 'frances' ? 'fr' : 'zh';
  const { ctx } = g.load(appKey, 'u-1');
  ctx.STATE = { cards: [], studySettings: { newCardsPerDay: 10 } };
  const run = (expr) => vm.runInContext(expr, ctx);
  ctx.__mk = (o) => Object.assign({ id: 'c', reps: 0, lapses: 0, due: 0, interval: 0, stability: 0, difficulty: 0, state: 'new', fsrsReps: 0, fsrsLapses: 0, lastReview: null, deckId: 1, flashcardStatus: 'active' }, o);
  const mk = ctx.__mk;
  const now = Date.now();
  const bucket = c => run('bucketCardState')(c);
  const queue = (pool, extra) => run('getStudyQueue')(pool, Object.assign({ scope: 'due', newCardsLimit: 10 }, extra));

  // ---- 1) Estado: Errei em cada estado
  let c = mk({}); run('applyMemoryGrade')(c, 0);
  check(label + ' New+Errei -> learning (1ª resposta do scheduler)', c.state === 'learning' && c.reps === 1 && c.lapses === 1 && c.fsrsLapses === 1, c);
  check(label + ' New+Errei: stability/difficulty do scheduler (não zerados)', c.stability > 0 && c.difficulty > 0);
  check(label + ' New+Errei: due = próxima meia-noite (regra de produto mantida)', c.due > Date.now() && c.due <= Date.now() + DAY + 1000);

  c = mk({ state: 'review', reps: 5, lapses: 1, stability: 30, difficulty: 5, fsrsReps: 5, fsrsLapses: 1, lastReview: now - 30 * DAY, due: now - DAY, interval: 30 });
  const before = { reps: c.reps, lapses: c.lapses, fl: c.fsrsLapses, fr: c.fsrsReps, id: c.id, deckId: c.deckId };
  run('applyMemoryGrade')(c, 0);
  check(label + ' Review+Errei -> relearning, nunca new', c.state === 'relearning' && bucket(c) === 'learning', c);
  check(label + ' Review+Errei: reps/lapses/fsrsReps/fsrsLapses acumulam', c.reps === before.reps + 1 && c.lapses === before.lapses + 1 && c.fsrsLapses === before.fl + 1 && c.fsrsReps === before.fr + 1, c);
  check(label + ' Review+Errei: stability não zerada, mas reduzida pelo lapso', c.stability > 0 && c.stability < 30, c.stability);
  check(label + ' Review+Errei: difficulty > 0 e id/deck preservados', c.difficulty > 0 && c.id === before.id && c.deckId === before.deckId);

  c = mk({ state: 'learning', reps: 1, lapses: 1, stability: 1, difficulty: 6, fsrsReps: 1, fsrsLapses: 1, lastReview: now - DAY, due: now - 1000 });
  run('applyMemoryGrade')(c, 0);
  check(label + ' Learning+Errei -> relearning (semântica do scheduler)', c.state === 'relearning' && c.reps === 2 && c.fsrsLapses === 2, c);
  run('applyMemoryGrade')(c, 0);
  check(label + ' Relearning+Errei -> relearning, reps cresce', c.state === 'relearning' && c.reps === 3, c);
  check(label + ' nenhum Errei cria falso New quando reps>0', bucket(c) === 'learning');

  // Review -> Learning/Relearning e volta a Review com Bom
  run('applyMemoryGrade')(c, 2);
  check(label + ' Relearning+Bom -> review', c.state === 'review' && bucket(c) === 'review');

  // ---- 2) Save legado: state='new' com reps>0 (Errei da versão antiga)
  const legacy = mk({ state: 'new', reps: 3, lapses: 3, due: now - 1000 });
  check(label + ' legado state=new reps>0 -> Learning (nunca New)', bucket(legacy) === 'learning');
  check(label + ' legado: newCards() não conta', run('newCards')([legacy]).length === 0);
  check(label + ' legado: fila trata como devido (não consome cota de New)', queue([legacy], { newCardsLimit: 0 }).length === 1);

  // ---- 3) Consistência bucket x fila x newCards, por estado
  const matrix = {
    new: mk({ id: 'n' }),
    learning: mk({ id: 'l', state: 'learning', reps: 1, due: now - 1000 }),
    relearning: mk({ id: 'r', state: 'relearning', reps: 2, due: now - 1000 }),
    reviewDue: mk({ id: 'rd', state: 'review', reps: 4, due: now - 1000 }),
    reviewNotDue: mk({ id: 'rn', state: 'review', reps: 4, due: now + 5 * DAY }),
    archived: mk({ id: 'a', state: 'review', reps: 4, due: now - 1000, flashcardStatus: 'archived' }),
  };
  const expectB = { new: 'new', learning: 'learning', relearning: 'learning', reviewDue: 'review', reviewNotDue: 'review', archived: 'review' };
  for (const k of Object.keys(matrix)){
    const card = matrix[k];
    check(label + ' bucket ' + k, bucket(card) === expectB[k]);
    const inNew = run('newCards')([card]).length === 1;
    check(label + ' newCards() concorda com bucket (' + k + ')', inNew === (expectB[k] === 'new'));
    const inQueue = queue([card], { newCardsLimit: 0 }).length === 1; // sem cota de New: só devidos
    const expectDue = expectB[k] !== 'new' && card.due <= now;
    check(label + ' fila sem cota: ' + k + ' entra sse não-New e vencido', inQueue === expectDue);
  }
  // cota de New: 'new' entra via fresh, Learning/Review não consomem
  const q = queue(Object.values(matrix).filter(x => x.id !== 'a'), { newCardsLimit: 1 });
  check(label + ' cota=1: 1 New + devidos (learning, relearning, reviewDue)', q.length === 4 && q.filter(x => x.id === 'n').length === 1, q.map(x => x.id));
  check(label + ' Errei não consome cota de New', run('newCards')([matrix.learning, matrix.relearning]).length === 0);

  // ---- 4) Matriz de contagem do Deck (estrutural) + filtros
  const decks = [{ id: 1, kind: 'personal_root', owner_id: 'u-1', language_app_key: appKey, parent_deck_id: null, name: 'R' }];
  ctx.__decks = decks;
  const pool = [matrix.new, matrix.learning, matrix.relearning, matrix.reviewDue, matrix.reviewNotDue, mk({ id: 'inc', flashcardStatus: 'active' })]
    .map(x => Object.assign({ origin: 'self', tags: ['a'] }, x));
  pool[4].tags = ['b']; pool[1].origin = 'teacher';
  ctx.__pool = pool;
  const counts = () => JSON.parse(JSON.stringify(run('getDeckCounts(__decks, 1, __pool)')));
  const base = counts();
  check(label + ' contagem estrutural: new=2 (n + inc), learning=2, review=1 (só devidos)', base.new === 2 && base.learning === 2 && base.review === 1, base);
  // 'archived' e lição incompleta ficam fora do pool elegível (fora do escopo desta função pura)
  // Filtros de sessão não alteram a contagem estrutural:
  ctx.__filtered = pool.filter(x => x.tags.includes('b'));
  const sessionCounts = JSON.parse(JSON.stringify(run('getDeckCounts(__decks, 1, __filtered)')));
  check(label + ' contagem estrutural (pool completo) independe do filtro; a da sessão (pool filtrado) pode diferir', JSON.stringify(counts()) === JSON.stringify(base) && sessionCounts.review === 0 && sessionCounts.new === 0 && sessionCounts.learning === 0 && base.review === 1, { base, sessionCounts });
  ctx.__origin = pool.filter(x => x.origin === 'teacher');
  const orig = JSON.parse(JSON.stringify(run('getDeckCounts(__decks, 1, __origin)')));
  check(label + ' filtro de origem reduz só a contagem da sessão', orig.learning === 1 && JSON.stringify(counts()) === JSON.stringify(base), orig);

  // fila e contagem concordam: New/Learning da fila == contagem (sem limites)
  const qAll = queue(pool, { newCardsLimit: 99 });
  const qNew = qAll.filter(x => run('bucketCardState')(x) === 'new').length;
  const qLearn = qAll.filter(x => run('bucketCardState')(x) === 'learning').length;
  const qRev = qAll.filter(x => run('bucketCardState')(x) === 'review').length;
  check(label + ' fila (sem limites) == contagens do Deck', qNew === base.new && qLearn === base.learning && qRev === base.review, { qNew, qLearn, qRev, base });

  // ---- 5) Reverse / Cloze: irmãos independentes
  const sib = [mk({ id: 't1', state: 'review', reps: 3, stability: 20, difficulty: 5, fsrsReps: 3, lastReview: now - 20 * DAY, due: now - 1000 }),
               mk({ id: 't1-b', state: 'review', reps: 3, stability: 20, difficulty: 5, fsrsReps: 3, lastReview: now - 20 * DAY, due: now - 1000 })];
  const sib2 = JSON.stringify(sib[1]);
  run('applyMemoryGrade')(sib[0], 0);
  check(label + ' reverse: só o irmão errado muda', sib[0].state === 'relearning' && JSON.stringify(sib[1]) === sib2);
  const cl = [mk({ id: 'k-c1', state: 'review', reps: 2, stability: 9, difficulty: 4, due: now - 1000 }), mk({ id: 'k-c2', state: 'review', reps: 2, stability: 9, difficulty: 4, due: now - 1000 })];
  const cl2 = JSON.stringify(cl[1]);
  run('applyMemoryGrade')(cl[0], 0);
  check(label + ' cloze: c1 errado não altera c2', cl[0].state === 'relearning' && JSON.stringify(cl[1]) === cl2);

  // ---- 6) Regressões: "Já sei?" (grade 3) continua review; preview de Errei == due real
  const fresh = mk({}); run('applyMemoryGrade')(fresh, 3);
  check(label + ' Fácil em novo -> review', fresh.state === 'review');
  const p = mk({ state: 'review', reps: 2, stability: 10, difficulty: 5, lastReview: now - 10 * DAY });
  const prev = run('previewNextIntervalDays')(p, 0, now);
  const real = JSON.parse(JSON.stringify(p)); ctx.__c = real; run('applyMemoryGrade(__c, 0, ' + now + ')');
  check(label + ' preview de Errei == due real', Math.abs(real.due - (now + prev * DAY)) < 1000);
  // hasPlainFrontBack/elegibilidade não dependem de state
  check(label + ' cardStudyBucket global disponível', typeof run('cardStudyBucket') === 'function');
}
summary('K1 review core unit');
