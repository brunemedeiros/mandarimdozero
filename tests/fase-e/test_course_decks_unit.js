// Fase E -- testes Node/VM (unitId -> deckId, Review/Deck scope, FSRS...).
// Rodar: node tests/fase-e/test_course_decks_unit.js
const { loadLang, fakeEnsureCourseDecks, check, summary } = require('./harness');

function setupCourse(lang){
  const ctx = loadLang(lang);
  const store = [];
  const payload = ctx.courseUnitsForDecks(ctx.UNITS);
  const decks = fakeEnsureCourseDecks(store, ctx.APP_KEY, payload);
  return { ctx, store, payload, decks };
}

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const { ctx, store, payload, decks } = setupCourse(lang);
  const run = code => require('vm').runInContext(code, ctx);

  // --- payload: só Units que geram cards; unit_id sempre String ---
  const grammar = ctx.UNITS.filter(u => u.type === 'grammar').length;
  const withVocab = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  check(lang + ' payload = units com vocab', payload.length === withVocab.length, [payload.length, withVocab.length]);
  check(lang + ' payload exclui grammar', payload.every(p => !String(p.unit_id).includes('-g')) && grammar === ctx.UNITS.length - withVocab.length);
  check(lang + ' unit_id é string', payload.every(p => typeof p.unit_id === 'string'));
  check(lang + ' unit_ids únicos', new Set(payload.map(p => p.unit_id)).size === payload.length);

  // --- Course root + Unit Decks ---
  const root = decks.find(d => d.course_unit_id == null);
  check(lang + ' 1 root de curso', decks.filter(d => d.course_unit_id == null).length === 1);
  check(lang + ' 1 Unit Deck por unidade', decks.filter(d => d.course_unit_id != null).length === payload.length);
  check(lang + ' Unit Deck sob o root', decks.filter(d => d.course_unit_id != null).every(d => d.parent_deck_id === root.id));
  check(lang + ' kind=course/owner+teacher nulos/is_public false', decks.every(d => d.kind === 'course' && d.owner_id === null && d.teacher_id === null && d.is_public === false));

  // --- idempotência (fake do contrato) ---
  const before = store.length;
  fakeEnsureCourseDecks(store, ctx.APP_KEY, payload);
  check(lang + ' idempotente (2a chamada não cria)', store.length === before);

  // --- cards de trilha: identidade/FSRS antes vs. depois ---
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const snapshot = JSON.stringify(ctx.STATE.cards.map(c => { const { deckId, ...rest } = c; return rest; }));
  check(lang + ' cards nascem com deckId null', ctx.STATE.cards.every(c => c.deckId === null));
  const index = ctx.buildCourseDeckIndex(decks, ctx.APP_KEY);
  const n1 = ctx.assignCourseDeckIds(ctx.STATE.cards, index);
  check(lang + ' todos os cards de trilha ganharam deckId', n1 === ctx.STATE.cards.length && n1 > 0, [n1, ctx.STATE.cards.length]);
  const after = JSON.stringify(ctx.STATE.cards.map(c => { const { deckId, ...rest } = c; return rest; }));
  check(lang + ' NADA além de deckId mudou (id/unitId/FSRS/estado)', snapshot === after);
  check(lang + ' unitId preservado (não virou deckId)', ctx.STATE.cards.every(c => c.unitId != null && c.unitId !== c.deckId || typeof c.unitId === 'string'));
  // mapeamento correto por unidade
  const okMap = ctx.STATE.cards.every(c => {
    const d = decks.find(x => x.id === c.deckId);
    return d && String(d.course_unit_id) === String(c.unitId);
  });
  check(lang + ' unitId -> course_unit_id -> deck correto', okMap);
  // determinismo
  const ids1 = ctx.STATE.cards.map(c => c.deckId).join(',');
  ctx.assignCourseDeckIds(ctx.STATE.cards, ctx.buildCourseDeckIndex(decks, ctx.APP_KEY));
  check(lang + ' determinístico/idempotente', ids1 === ctx.STATE.cards.map(c => c.deckId).join(','));
  // não identifica por nome: renomear Deck não muda o mapeamento
  const renamed = decks.map(d => ({ ...d, name: 'X' + d.id }));
  const idxRenamed = ctx.buildCourseDeckIndex(renamed, ctx.APP_KEY);
  check(lang + ' mapeamento independe do nome visível', ctx.courseDeckIdForUnit(idxRenamed, ctx.UNITS.find(u => u.vocab && u.vocab.length).id) === ctx.courseDeckIdForUnit(index, ctx.UNITS.find(u => u.vocab && u.vocab.length).id));
  // Unit sem Course Deck -> null, sem quebrar
  const partial = ctx.buildCourseDeckIndex(decks.filter(d => d.course_unit_id == null || d.course_unit_id === payload[0].unit_id), ctx.APP_KEY);
  ctx.assignCourseDeckIds(ctx.STATE.cards, partial);
  check(lang + ' compat: Unit sem Deck fica deckId null', ctx.STATE.cards.some(c => c.deckId === null) && ctx.STATE.cards.some(c => c.deckId != null));
  ctx.assignCourseDeckIds(ctx.STATE.cards, index);

  // outros idiomas/kinds nunca vazam no índice
  const mixed = decks.concat([
    { id: 900, kind: 'personal', language_app_key: ctx.APP_KEY, course_unit_id: payload[0].unit_id, owner_id: 'u' },
    { id: 901, kind: 'course', language_app_key: 'portugues', course_unit_id: payload[0].unit_id },
  ]);
  check(lang + ' índice ignora Deck pessoal e de outro idioma', ctx.courseDeckIdForUnit(ctx.buildCourseDeckIndex(mixed, ctx.APP_KEY), payload[0].unit_id) === index.byUnitId.get(payload[0].unit_id));

  // --- Deck Engine: escopo / contagens / lesson completion ---
  const unit0 = withVocab[0];
  const d0 = decks.find(d => d.course_unit_id === String(unit0.id));
  ctx.STATE.decks = decks;
  ctx.STATE.unitProgress = {};
  const scopeAll = ctx.getStudyScopeForDeck(decks, d0.id, ctx.STATE.cards);
  // Cartões "Na frase" da unidade (1 por frase de exemplo) somam aos A+B das palavras.
  const nPh = ctx.STATE.cards.filter(c => c.unitId === unit0.id && ctx.isStudyTrailPhraseCard(c)).length;
  const unitCards = unit0.vocab.length * 2 + nPh;
  check(lang + ' escopo do Unit Deck = cards da unidade', scopeAll.length === unitCards && scopeAll.every(c => c.unitId === unit0.id));
  const rootScope = ctx.getStudyScopeForDeck(decks, root.id, ctx.STATE.cards);
  check(lang + ' escopo do root = subtree (todos os cards)', rootScope.length === ctx.STATE.cards.length);
  // lesson completion: pertencer ao Deck NÃO torna elegível
  check(lang + ' sem lição concluída: nada elegível', ctx.eligibleReviewPool().length === 0);
  const sumBefore = ctx.deckReviewSummary(d0.id);
  check(lang + ' summary: total>0 mas elegíveis=0 e counts=0', sumBefore.totalCards === unitCards && sumBefore.eligibleCards === 0 && sumBefore.new === 0);
  // conclui a unidade -> passa a valer
  ctx.STATE.unitProgress[unit0.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} };
  const sumAfter = ctx.deckReviewSummary(d0.id);
  check(lang + ' unidade concluída: elegíveis = vocab da unidade', sumAfter.eligibleCards === unitCards, sumAfter);
  check(lang + ' contagem por CardInstance (K2-C: A+B por palavra): new = 2 x vocab', sumAfter.new === unitCards);
  // lição parcial: só as palavras das lições já concluídas
  ctx.STATE.unitProgress[unit0.id] = { started: true, completed: false, lessonIdx: 1, lessonMisses: {} };
  const lesson0 = (unit0.lessons || [])[0];
  if (lesson0 && lesson0.vocabIdx){
    const partialSum = ctx.deckReviewSummary(d0.id);
    check(lang + ' lição parcial: só vocab da lição 1', partialSum.eligibleCards === lesson0.vocabIdx.length * 2 + ctx.STATE.cards.filter(c => c.unitId === unit0.id && ctx.isStudyTrailPhraseCard(c) && lesson0.vocabIdx.includes(c.gateVocabIdx)).length, [partialSum.eligibleCards, lesson0.vocabIdx.length]);
  }
  // FSRS preservado: estado do card não é tocado pelo escopo/contagem
  const fs0 = JSON.stringify(ctx.STATE.cards.map(c => [c.stability, c.difficulty, c.state, c.reps, c.due, c.lapses]));
  ctx.deckReviewSummary(root.id); ctx.deckCountsForReview(root.id);
  check(lang + ' FSRS intacto após escopo/contagem', fs0 === JSON.stringify(ctx.STATE.cards.map(c => [c.stability, c.difficulty, c.state, c.reps, c.due, c.lapses])));

  // --- Course Deck não é personal ---
  check(lang + ' Course Deck não aceita Note própria', ctx.canPlaceOwnNoteInDeck({ owner_id: 'u', language_app_key: ctx.APP_KEY }, d0).reason === 'wrong_kind');
  check(lang + ' Course Deck não aceita Note de professora', ctx.canPlaceTeacherNoteInDeck({}, d0).ok === false);
  check(lang + ' Course Deck não é movível', ctx.canMoveDeck(decks, d0, root).ok === false);
  check(lang + ' Course Deck não é deletável', ctx.validateDeckDeletion({ deck: d0, hasChildren: false, hasNotes: false }).ok === false);

  // --- applySerializedState: deckId derivado vence save defasado; progresso restaurado ---
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.assignCourseDeckIds(ctx.STATE.cards, index);
  const target = ctx.STATE.cards[0];
  const freshDeckId = target.deckId;
  const saved = JSON.parse(JSON.stringify(ctx.STATE.cards));
  saved[0].deckId = 987654; saved[0].reps = 7; saved[0].due = 12345; saved[0].stability = 3.5; saved[0].fsrsMigrated = true;
  ctx.STATE.unitProgress = {};
  ctx.applySerializedState({ cards: saved });
  check(lang + ' save defasado não sobrescreve deckId', target.deckId === freshDeckId);
  check(lang + ' progresso FSRS restaurado normalmente', target.reps === 7 && target.due === 12345 && target.stability === 3.5, [target.reps, target.due, target.stability]);
  check(lang + ' ids estáveis (u<unit>-v<idx>)', ctx.STATE.cards.every(c => ctx.isStudyTrailPhraseCard(c) ? /^u.+-[pd]\d+$/.test(c.id) : (c.id === `u${c.unitId}-v${c.vocabIdx}` || c.id === `u${c.unitId}-v${c.vocabIdx}-b`)));
  // compat: save antigo sem nenhum deckId
  const old = JSON.parse(JSON.stringify(ctx.STATE.cards)).map(c => { delete c.deckId; return c; });
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.applySerializedState({ cards: old });
  check(lang + ' compat: save antigo sem deckId -> null', ctx.STATE.cards.every(c => c.deckId === null));

  // --- Deck-scoped Review usa a fila existente (nenhuma fila paralela) ---
  check(lang + ' sem 2o scheduler: só getStudyQueue via reviewFilterQueue', typeof ctx.getStudyQueue === 'function' && !('startCourseReview' in ctx));
}

// --- Reverse / Cloze: contagem por CardInstance (motor real) ---
console.log('== CardInstances (contagem por instância)');
{
  const ctx = loadLang('fr');
  const base = { id: 1, status: 'active', language_app_key: 'frances', revision: 0, deck_id: 5, back_trans: 'x', front: 'y' };
  const norm = ctx.generatedCardInstanceCount(base);
  check('Normal = 1 CardInstance', norm === 1, norm);
  const rev = ctx.generatedCardInstanceCount({ ...base, card_generation_mode: 'normal_reversed', fields: [
    { id: 'a', lang: 'fr', role: null, content: { value: 'chat' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'gato' }, audio: null, image: null, pinyinFieldId: null }] });
  check('Normal reverso = 2 CardInstances independentes', rev === 2, rev);
  const clz = ctx.generatedCardInstanceCount({ ...base, card_generation_mode: 'cloze', fields: [
    { id: 'a', lang: 'fr', role: null, content: { value: '{{c1::Je}} {{c2::suis}} là' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'Eu estou aqui' }, audio: null, image: null, pinyinFieldId: null }] });
  check('Cloze com 2 marcas = 2 CardInstances', clz === 2, clz);
  // Deck scope conta por CardInstance (2 cards de reverso no mesmo deck)
  const cards = ctx.buildEngineCardsFromRow({ ...base, id: 9, card_generation_mode: 'normal_reversed', fields: [
    { id: 'a', lang: 'fr', role: null, content: { value: 'chat' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'gato' }, audio: null, image: null, pinyinFieldId: null }] },
    { origin: 'self', appKey: 'frances', idPrefix: 's' });
  const decks = [{ id: 5, kind: 'personal', parent_deck_id: null, owner_id: 'u', language_app_key: 'frances' }];
  const counts = ctx.getDeckCounts(decks, 5, cards);
  check('getDeckCounts conta 2 (por CardInstance) para Normal reverso', counts.new === 2, counts);
  check('reverso: ids distintos', new Set(cards.map(c => c.id)).size === 2);
}

summary('Fase E unit');
