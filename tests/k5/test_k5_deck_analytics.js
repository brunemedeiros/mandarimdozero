// K.5 -- Analytics de Deck: estrutural (CardInstance) x pedagógico (Note). Node/VM, código real.
// Rodar: node tests/k5/test_k5_deck_analytics.js
const { loadLang, check, summary } = require('../fase-e/harness');
for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const NOW = Date.now(), PAST = NOW - 86400e3, FUT = NOW + 5 * 86400e3;
  const D = (id, parent, kind, extra) => Object.assign({ id, parent_deck_id: parent, kind, owner_id: 'u1', language_app_key: lang === 'fr' ? 'frances' : 'mandarim' }, extra || {});
  // árvore: 1 raiz pessoal -> 2 (A) -> 4 (A.sub); 3 (B irmão); 10 teacher_root -> 11; 20 curso -> 21
  const decks = [D(1, null, 'personal_root'), D(2, 1, 'personal'), D(3, 1, 'personal'), D(4, 2, 'personal'),
    D(10, null, 'teacher_root', { teacher_id: 't1' }), D(11, 10, 'teacher', { teacher_id: 't1' }),
    D(20, null, 'course', { owner_id: null }), D(21, 20, 'course', { owner_id: null })];
  const mk = (id, o, deckId, row, extra) => Object.assign({ id, origin: o, deckId, rowId: row, unitId: null, vocabIdx: null, flashcardStatus: o === 'study' ? undefined : 'active', reps: 0, state: 'new', due: 0, interval: 0, lapses: 0 }, extra || {});
  const st = (extra) => Object.assign({ reps: 3, state: 'review', interval: 10, due: PAST }, extra);
  const cards = [
    mk('s1', 'self', 2, 1, st()), mk('s1-b', 'self', 2, 1),                                   // Reverse em A: review devido + New
    mk('s2-c1', 'self', 4, 2, st({ due: FUT })), mk('s2-c2', 'self', 4, 2), mk('s2-c3', 'self', 4, 2, { reps: 1, state: 'learning', due: PAST }), // Cloze 3 em A.sub
    mk('s3', 'self', 3, 3, st()),                                                             // B irmão
    mk('s4', 'self', 2, 4, st({ flashcardStatus: 'archived' })),                              // arquivado em A
    mk('t1', 'teacher', 11, 1, st()), mk('t1-b', 'teacher', 11, 1),                           // Teacher Deck
    mk('c1', 'study', 21, undefined, Object.assign(st(), { unitId: 'A1-1', vocabIdx: 0 })), mk('c1-b', 'study', 21, undefined, { unitId: 'A1-1', vocabIdx: 0 }),
  ];
  const elig = cards.filter(c => c.flashcardStatus !== 'archived'); // pool elegível (arquivado fora)
  const cnt = (id, pool) => ctx.getDeckCounts(decks, id, pool || elig, NOW);
  // 1/2: simples e subárvore
  check(lang + ' 1: Deck folha B = 1 CardInstance', cnt(3).total === 1);
  check(lang + ' 2: pai A agrega A.sub (A=2 + A.sub=3 = 5); filho A.sub não agrega irmão/pai', cnt(2).total === 5 && cnt(4).total === 3 && cnt(3).total === 1);
  check(lang + ' 2: raiz pessoal agrega A+A.sub+B = 6, sem Teacher nem Curso', cnt(1).total === 6);
  // 5/6: N/L/R/Due
  const a = cnt(2);
  check(lang + ' 5: A: new=2 (s1-b, s2-c2) learning=1 review=2', a.new === 2 && a.learning === 1 && a.review === 2, a);
  check(lang + ' 6: Review sem due não entra em Devidos; Review vencido entra', a.due === 2 /* s1 e s2-c3 */ && a.reviewDue === 1, a);
  // 3/12: Reverse independente
  const rev = ctx.getDeckCounts(decks, 2, elig.filter(c => c.rowId === 1 && c.origin === 'self'), NOW);
  check(lang + ' 3/12: Reverse = 2 cartões, um Review devido + um New, ambos contam', rev.total === 2 && rev.review === 1 && rev.new === 1 && rev.due === 1, rev);
  // 4: Cloze N cartões / 1 Note
  const cl = ctx.getDeckCounts(decks, 4, elig, NOW);
  check(lang + ' 4: Cloze = 3 cartões estruturais', cl.total === 3);
  // 13: conteúdo (Note)
  const cm = ctx.getDeckContentMetrics(decks, 4, elig);
  check(lang + ' 13: Cloze = 1 conteúdo; Reverse = 1 conteúdo', cm.self.notes === 1 && cm.self.studied === 1);
  const cmA = ctx.getDeckContentMetrics(decks, 2, elig);
  check(lang + ' 13: A = 2 Notes (s1 Reverse, s2 Cloze), nunca 5 cartões', cmA.self.notes === 2 && cmA.self.studied === 2, cmA.self);
  // 7/8/9: origens separadas
  const tm = ctx.getDeckContentMetrics(decks, 10, elig), cm2 = ctx.getDeckContentMetrics(decks, 20, elig), sm = ctx.getDeckContentMetrics(decks, 1, elig);
  check(lang + ' 7: Teacher Deck só Teacher (1 Note, 2 cartões)', tm.teacher.notes === 1 && tm.self === null && tm.study === null && cnt(10).total === 2);
  check(lang + ' 9: Course Deck só Study Trail (1 palavra, 2 cartões A/B)', cm2.study.notes === 1 && cm2.self === null && cm2.teacher === null && cnt(20).total === 2);
  check(lang + ' 8: Meus Decks só Self; sem total que misture origens', sm.self.notes === 3 && sm.teacher === null && sm.study === null);
  // 10: arquivado fora (pool elegível) e fora do conteúdo mesmo se passar no pool
  check(lang + ' 10: arquivado fora das contagens (pool elegível) e do conteúdo (mesmo no pool cru)', cnt(2, cards).total === 5 && ctx.getDeckContentMetrics(decks, 2, cards).self.notes === 2);
  // 14: força Note-level por origem (Reverse: um review forte-ish, outro New não rebaixa)
  check(lang + ' 14: força por Note; irmã New não rebaixa; Note sem estudo = não iniciada', (s => s.not_started === 0 && s.medium + s.strong + s.weak === 2)(cmA.self.strength) );
  // 15: mesmo universo contagem x sessão
  const scope = ctx.getStudyScopeForDeck(decks, 2, elig);
  check(lang + ' 15: contagem do Deck e escopo da sessão usam o mesmo universo', scope.length === cnt(2).total);
  // sem origens misturadas na estrutura: nenhuma chave de total de conteúdo geral
  check(lang + ' conteúdo só por origem (sem total geral)', Object.keys(cmA).sort().join() === 'self,study,teacher');
}
summary('K.5 deck analytics');
