// K2-E -- consumidores pedagógicos em nível de PALAVRA (Note); Review/FSRS/Deck
// seguem por CardInstance. Node/VM, código real de shared/ e <lang>/app.js.
// Rodar: node tests/k2e/test_word_level.js
const { loadLang, read, extractFunction, check, summary } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = c => vm.runInContext(c, ctx);
  const src = read(lang + '/app.js');
  ['unitCardCounts', 'checkUnitCompletion', 'pickVocabFormat', 'vocabStrengthBuckets'].forEach(fn => run(extractFunction(src, fn)));
  const completed = [];
  ctx.markUnitCompleted = id => completed.push(id);
  ctx.shuffle = a => a.slice().sort(() => Math.random() - 0.5);
  run('this.STEP_STATE = { acq: { wordMisses: {} } };');
  run(`this.eligibleReviewPool = function(){ return STATE.cards; };`); // pool = todos (gate de lição é da Review, não desta fase)

  const units = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  const u0 = units.find(u => u.vocab.length >= 3), N = u0.vocab.length;
  const fresh = () => { ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS); completed.length = 0; return ctx.STATE.cards; };
  const A = (i) => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}`);
  const B = (i) => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}-b`);
  const study = (c, o) => Object.assign(c, { reps: 3, state: 'review', stability: 8, difficulty: 5, interval: 10, lapses: 0, firstLearnedDate: '2026-01-05' }, o || {});

  // A. cardinalidade pedagógica x estrutural
  fresh();
  let uc = ctx.unitCardCounts(u0.id);
  check(lang + ' A: N palavras = N Notes, 2N CardInstances', uc.total === N && uc.totalCards === 2 * N + ctx.STATE.cards.filter(c => c.unitId === u0.id && ctx.isStudyTrailPhraseCard(c)).length && uc.learned === 0, uc);
  check(lang + ' A: cada palavra tem exatamente 2 CardInstances irmãs', Array.from({ length: N }, (_, i) => ctx.studyWordCardsFor(ctx.STATE.cards, u0.id, i).length).every(n => n === 2));
  check(lang + ' A: STATE.cards segue com 2 CardInstances por palavra (nada escondido)', ctx.STATE.cards.filter(c => c.unitId === u0.id && !ctx.isStudyTrailPhraseCard(c)).length === 2 * N);

  // B/D. estados A/B
  fresh(); study(A(0));
  uc = ctx.unitCardCounts(u0.id);
  check(lang + ' D: A estudado + B New = 1 palavra aprendida (não 2, não 0.5)', uc.learned === 1 && uc.total === N, uc);
  fresh(); study(B(0));
  check(lang + ' D: A New + B estudado = 1 palavra aprendida', ctx.unitCardCounts(u0.id).learned === 1);
  fresh(); study(A(0)); study(B(0));
  check(lang + ' D: ambos estudados = 1 palavra (sem duplicar)', ctx.unitCardCounts(u0.id).learned === 1);
  fresh();
  check(lang + ' D: nenhum estudado = 0', ctx.unitCardCounts(u0.id).learned === 0);
  // dueForReview continua por CardInstance
  fresh(); study(A(0), { due: 1 }); study(B(0), { due: 1 });
  check(lang + ' D: dueForReview segue por CardInstance (A e B devidas = 2)', ctx.unitCardCounts(u0.id).dueForReview === 2);

  // B. checkUnitCompletion
  fresh(); for (let i = 0; i < N; i++) study(A(i));   // só A estudado, todos os B New
  ctx.checkUnitCompletion(u0.id);
  check(lang + ' B: A estudado em todas as palavras + B New => unidade concluída (B não bloqueia)', completed.includes(u0.id), completed);
  fresh(); for (let i = 0; i < N - 1; i++) study(A(i));
  ctx.checkUnitCompletion(u0.id);
  check(lang + ' B: falta uma palavra sem nenhum card estudado => não conclui', completed.length === 0);
  fresh(); for (let i = 0; i < N - 1; i++) study(A(i)); study(B(N - 1));   // última só via B
  ctx.checkUnitCompletion(u0.id);
  check(lang + ' B: palavra estudada só pela irmã B conta', completed.includes(u0.id));
  fresh(); ctx.checkUnitCompletion(u0.id);
  check(lang + ' B: unidade sem estudo não conclui', completed.length === 0);

  // E. força
  const bk = () => ctx.vocabStrengthBuckets();
  fresh(); let b = bk();
  const nW = ctx.studyWordGroups(ctx.STATE.cards).length, totalWords = nW, tot = x => x.notStarted + x.weak + x.medium + x.strong;
  // K.3: nenhuma irmã estudada = NÃO INICIADA (nunca "fraca")
  check(lang + ' E: tudo New = todas as palavras NÃO INICIADAS (N palavras, não 2N), nenhuma fraca', b.notStarted === nW && b.weak === 0 && tot(b) === nW, b);
  study(A(0), { interval: 90 });  // A forte, B New
  b = bk();
  check(lang + ' E: A forte + B New = 1 palavra forte (B New não rebaixa)', b.strong === 1 && b.weak === 0 && b.notStarted === nW - 1 && tot(b) === nW, b);
  study(B(0), { interval: 10 });  // B mediana estudada
  b = bk();
  check(lang + ' E: A forte + B mediana estudada = 1 palavra mediana (a mais fraca entre as estudadas)', b.medium === 1 && b.strong === 0 && tot(b) === nW, b);
  study(B(0), { interval: 90, lapses: 2 });
  b = bk();
  check(lang + ' E: direção estudada com lapses>=2 => palavra fraca; as demais não iniciadas', b.weak === 1 && b.strong === 0 && b.medium === 0 && b.notStarted === nW - 1, b);
  fresh(); study(B(1), { interval: 90 });
  check(lang + ' E: A New + B forte = 1 palavra forte', bk().strong === 1);
  // Teacher/Self: agrupados por Note (rowId), arquivados fora
  fresh(); ctx.STATE.cards.push(
    { id: 't1', origin: 'teacher', rowId: 1, flashcardStatus: 'active', reps: 0, lapses: 0, interval: 0 },
    { id: 't2', origin: 'teacher', rowId: 2, flashcardStatus: 'active', reps: 5, lapses: 0, interval: 100 },
    { id: 't2-b', origin: 'teacher', rowId: 2, flashcardStatus: 'active', reps: 0, lapses: 0, interval: 0 },
    { id: 't3', origin: 'teacher', rowId: 3, flashcardStatus: 'archived', reps: 5, lapses: 0, interval: 100 });
  b = bk();
  check(lang + ' E: teacher agrupado por Note (t2+t2-b = 1 forte; t1 não iniciada; arquivado fora)', b.strong === 1 && b.notStarted === nW + 1 && tot(b) === nW + 2, b);

  // F/G. alreadyKnown / pickVocabFormat (nível de palavra)
  fresh();
  const sample = f => { const s = new Set(); for (let i = 0; i < 200; i++) s.add(f()); return s; };
  const unexposed = sample(() => ctx.pickVocabFormat(u0, 0, 'practice'));
  check(lang + ' G: palavra sem estudo nunca vai para produção (type)', !unexposed.has('type'), [...unexposed]);
  study(B(0));                       // só a irmã B estudada
  const viaB = sample(() => ctx.pickVocabFormat(u0, 0, 'practice'));
  check(lang + ' G: palavra exposta só via B é tratada como exposta (type possível)', viaB.has('type'), [...viaB]);
  fresh(); study(A(0));
  check(lang + ' G: exposta via A também', sample(() => ctx.pickVocabFormat(u0, 0, 'practice')).has('type'));
  check(lang + ' G: retorna sempre UM formato por palavra (string única)', typeof ctx.pickVocabFormat(u0, 0, 'practice') === 'string');
  fresh(); study(B(0));
  check(lang + ' F: alreadyKnown (nível palavra) via B', ctx.studyWordHasEvidence(ctx.studyWordCardsFor(ctx.STATE.cards, u0.id, 0)) === true);
  check(lang + ' F: palavra não estudada não é conhecida', ctx.studyWordHasEvidence(ctx.studyWordCardsFor(ctx.STATE.cards, u0.id, 1)) === false);

  // Progresso/gráfico: contagem total e datas
  fresh(); study(A(0), { firstLearnedDate: '2026-01-05' }); study(B(0), { firstLearnedDate: '2026-01-09' }); study(A(1), { firstLearnedDate: '2026-01-07' });
  const dates = ctx.wordLevelFirstLearnedDates(ctx.STATE.cards).sort();
  check(lang + ' gráfico: 1 data por palavra (A+B não dobram), vale a mais antiga', dates.length === 2 && dates[0] === '2026-01-05' && dates[1] === '2026-01-07', dates);
  const lc = ctx.studyTrailWordProgress(ctx.STATE.cards);
  check(lang + ' "Palavras aprendidas": learned=2, total = nº de palavras da trilha', lc.learned === 2 && lc.total === totalWords, lc);
  check(lang + ' total de CardInstances continua 2x palavras', ctx.STATE.cards.filter(c => !ctx.isStudyTrailPhraseCard(c)).length === totalWords * 2);
  fresh(); ctx.STATE.cards.push({ id: 't1', origin: 'teacher', reps: 1, firstLearnedDate: '2026-02-01' });
  const lc2 = ctx.studyTrailWordProgress(ctx.STATE.cards);
  check(lang + ' K.4: teacher/self NÃO entram em palavras aprendidas nem no gráfico', lc2.total === totalWords && lc2.learned === 0 && ctx.wordLevelFirstLearnedDates(ctx.STATE.cards).length === 0, lc2);

  // Não muta FSRS / não colapsa
  fresh(); study(A(0)); const snap = JSON.stringify(ctx.STATE.cards.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state]));
  ctx.unitCardCounts(u0.id); ctx.vocabStrengthBuckets(); ctx.studyTrailWordProgress(ctx.STATE.cards); ctx.checkUnitCompletion(u0.id);
  check(lang + ' helpers só leem: FSRS/cards inalterados', snap === JSON.stringify(ctx.STATE.cards.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state])));
  check(lang + ' A e B continuam CardInstances distintas', A(0) !== B(0) && A(0).note === B(0).note);

  // H. independência de legado (fonte)
  const model = read('shared/study-trail-model.js').split('K2-E -- unidade PEDAGÓGICA')[1].split('K2-F -- PROJEÇÃO')[0];
  check(lang + ' H: helpers K2-E não usam lastDirection/reviewDirection/nextCardDirection', !/lastDirection|reviewDirection|nextCardDirection/.test(model));
  const fnSrc = ['unitCardCounts', 'checkUnitCompletion', 'pickVocabFormat', 'vocabStrengthBuckets'].map(f => extractFunction(src, f)).join('\n');
  check(lang + ' H: consumidores migrados não dependem de direção nem de quantidade bruta de cards', !/lastDirection|reviewDirection|nextCardDirection|pool\.length/.test(fnSrc.replace(/dueForReview[^\n]*/g, '').replace(/totalCards: pool\.length/g, '')));
}
summary('K2-E word-level');
