// K2-C -- Study Trail nativa (Note normal_reversed -> A + B). Node/VM, código real.
// Rodar: node tests/k2c/test_study_native_unit.js
const { loadLang, read, check, summary } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = c => vm.runInContext(c, ctx);
  const isZh = lang === 'zh';
  const units = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  const u0 = units[0], v0 = u0.vocab[0];
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const idA = `u${u0.id}-v0`, idB = idA + '-b';
  const A = cards.find(c => c.id === idA), B = cards.find(c => c.id === idB);
  const totalWords = units.reduce((n, u) => n + u.vocab.length, 0);

  // 1/2 Note + A + B; campos
  check(lang + ' 1: existe A e B', !!A && !!B);
  check(lang + ' 1: 2 cards por palavra em todo o conteúdo', cards.length === totalWords * 2, [cards.length, totalWords]);
  const f = A.note.fields;
  if (isZh){
    check('zh 2: 3 Fields hanzi/pinyin/trad', f.length === 3 && f[0].lang === 'zh' && f[1].lang === 'zh-pinyin' && f[2].lang === 'pt-BR');
    check('zh 2: textos idênticos ao content.js', f[0].text === v0.c && f[1].text === v0.p && f[2].text === v0.t);
    check('zh 2: pinyin ligado ao hanzi (pinyinFieldIndex)', f[0].pinyinFieldIndex === 1);
  } else {
    check('fr 2: 2 Fields fr/pt-BR', f.length === 2 && f[0].lang === 'fr' && f[1].lang === 'pt-BR');
    check('fr 2: textos idênticos ao content.js', f[0].text === v0.f && f[1].text === v0.t);
  }
  // 3 ids
  check(lang + ' 3: ids A/B', A.id === `u${u0.id}-v0` && B.id === `u${u0.id}-v0-b`);
  check(lang + ' 3: ids únicos (sem colisão)', new Set(cards.map(c => c.id)).size === cards.length);
  check(lang + ' 3: ids sem aleatoriedade (mesmos em 2 builds)', JSON.stringify(cards.map(c => c.id)) === JSON.stringify(ctx.buildCardsFromUnits(ctx.UNITS).map(c => c.id)));
  // 4 note compartilhada
  check(lang + ' 4: A.note === B.note', A.note === B.note && A.cardInstance.noteId === B.cardInstance.noteId);
  check(lang + ' 4: Note active, tags [], modo do motor normal_reversed', A.note.status === 'active' && A.tags.length === 0 && A.cardInstance.cardTypeId === 'normal' && B.cardInstance.cardTypeId === 'normal');
  // 5 direções (pinyin nunca é frente)
  const backIdx = isZh ? 2 : 1;
  check(lang + ' 5: A frente=0 verso=' + backIdx, A.cardInstance.frontFieldIndex === 0 && A.cardInstance.backFieldIndex === backIdx);
  check(lang + ' 5: B frente=' + backIdx + ' verso=0', B.cardInstance.frontFieldIndex === backIdx && B.cardInstance.backFieldIndex === 0);
  const vA = ctx.resolveCardContentView(A), vB = ctx.resolveCardContentView(B);
  check(lang + ' 5: view A frente = idioma estudado', vA.front.text === (isZh ? v0.c : v0.f) && vA.back.text === v0.t);
  check(lang + ' 5: view B frente = tradução (pinyin não vira frente)', vB.front.text === v0.t && vB.back.text === (isZh ? v0.c : v0.f));
  if (isZh) check('zh 5: pinyin acompanha o hanzi na view', vA.front.pinyinText === v0.p && vB.back.pinyinText === v0.p);
  // 6 FSRS independente
  A.reps = 5; A.stability = 9; A.due = 123; A.lapses = 2; A.state = 'review';
  check(lang + ' 6: mutar A não altera B', B.reps === 0 && B.stability === 0 && B.due === 0 && B.lapses === 0 && B.state === 'new');
  check(lang + ' 6: cardInstance sem campos FSRS (sem 2ª cópia)', !('reps' in A.cardInstance) && !('due' in B.cardInstance));
  // 7 deck
  const store = []; const { fakeEnsureCourseDecks } = require('../fase-e/harness');
  const decks = fakeEnsureCourseDecks(store, ctx.APP_KEY, ctx.courseUnitsForDecks(ctx.UNITS));
  ctx.assignCourseDeckIds(cards, ctx.buildCourseDeckIndex(decks, ctx.APP_KEY));
  const unitDeck = decks.find(d => d.course_unit_id === String(u0.id));
  check(lang + ' 7: A e B no mesmo Course Deck da unidade', A.deckId === unitDeck.id && B.deckId === unitDeck.id);
  check(lang + ' 7: todo card da trilha tem deck', cards.every(c => c.deckId != null));
  // 8/9
  check(lang + ' 8: origin study', A.origin === 'study' && B.origin === 'study');
  check(lang + ' 9: unitId/vocabIdx/unitTitle', [A, B].every(c => c.unitId === u0.id && c.vocabIdx === 0 && c.unitTitle === u0.title));
  check(lang + ' 9: todos os cards têm unitId/vocabIdx coerentes com o id', cards.every(c => c.id.startsWith(`u${c.unitId}-v${c.vocabIdx}`)));

  // ---- merge de save ----
  const legacySaved = (c, extra) => Object.assign({
    id: c.id, unitId: 'ERRADO', vocabIdx: 999, deckId: 777, unitTitle: 'velho', origin: 'teacher',
    type: 'vocab', front: 'texto velho', back_trans: 'velho', back_hanzi: 'velho', front_pinyin: 'velho',
    tags: ['x'], lastDirection: 'back-to-front', reviewDirection: 'back-to-front',
    cardInstance: { id: c.id, cardTypeId: 'cloze', frontFieldIndex: 9 }, note: { fields: [] },
    ef: 2.1, interval: 6, reps: 4, due: 555555, lapses: 1, stability: 7.5, difficulty: 4.2, state: 'review',
    lastReview: 111, fsrsReps: 4, fsrsLapses: 1, fsrsMigrated: true, firstLearnedDate: '2026-01-02',
  }, extra || {});
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.assignCourseDeckIds(ctx.STATE.cards, ctx.buildCourseDeckIndex(decks, ctx.APP_KEY));
  const a = ctx.STATE.cards.find(c => c.id === idA), b = ctx.STATE.cards.find(c => c.id === idB);
  const before = { note: a.note, ci: JSON.stringify(a.cardInstance), deckId: a.deckId };
  ctx.applySerializedState({ cards: [legacySaved(a)] });
  check(lang + ' 10: note/cardInstance não substituídos', a.note === before.note && JSON.stringify(a.cardInstance) === before.ci);
  check(lang + ' 11: unitId/vocabIdx/deckId/origin/unitTitle preservados', a.unitId === u0.id && a.vocabIdx === 0 && a.deckId === before.deckId && a.origin === 'study' && a.unitTitle === u0.title);
  check(lang + ' 12: lastDirection/reviewDirection do save ignorados', a.lastDirection === undefined && a.reviewDirection === undefined);
  check(lang + ' 13: conteúdo do content.js vence', ctx.resolveCardContentView(a).front.text === (isZh ? v0.c : v0.f) && a.front === undefined && a.back_trans === undefined && a.tags.length === 0);
  check(lang + ' 15: A preserva progresso', a.reps === 4 && a.lapses === 1 && a.stability === 7.5 && a.difficulty === 4.2 && a.due === 555555 && a.firstLearnedDate === '2026-01-02' && a.state === 'review' && a.interval === 6 && a.ef === 2.1);
  check(lang + ' 14: B (de card já estudado) começa New', b.reps === 0 && b.due === 0 && b.stability === 0 && b.difficulty === 0 && b.lapses === 0 && b.state === 'new' && !b.firstLearnedDate);
  // cards nunca estudados
  const other = ctx.STATE.cards.find(c => c.id === `u${u0.id}-v1`), otherB = ctx.STATE.cards.find(c => c.id === `u${u0.id}-v1-b`);
  check(lang + ' 16: nunca estudado: A e B New', other.reps === 0 && otherB.reps === 0 && other.state === 'new' && otherB.state === 'new');
  // 17 reconstrução dupla
  const again = ctx.buildCardsFromUnits(ctx.UNITS);
  check(lang + ' 17: reconstruir não duplica nem muda estrutura', again.length === cards.length && new Set(again.map(c => c.id)).size === again.length);
  ctx.applySerializedState({ cards: [legacySaved(a)] });
  check(lang + ' 17: aplicar o mesmo save 2x mantém tudo', ctx.STATE.cards.length === cards.length && a.reps === 4 && b.reps === 0);
  // save de B (formato novo) volta para B
  ctx.applySerializedState({ cards: [{ id: idB, reps: 2, stability: 3, due: 42, state: 'learning', unitId: 'X' }] });
  check(lang + ' save novo de B aplica só progresso', b.reps === 2 && b.stability === 3 && b.unitId === u0.id);
  // save só com campo desconhecido/undefined não zera defaults
  ctx.applySerializedState({ cards: [{ id: `u${u0.id}-v2`, reps: undefined }] });
  check(lang + ' campo undefined no save não sobrescreve', ctx.STATE.cards.find(c => c.id === `u${u0.id}-v2`).reps === 0);

  // ---- serialização ----
  const ser = ctx.serializeCardsForSave(ctx.STATE.cards);
  const sA = ser.find(c => c.id === idA);
  const WL = ['ef','interval','reps','due','lapses','stability','difficulty','state','lastReview','fsrsReps','fsrsLapses','fsrsMigrated','firstLearnedDate'];
  check(lang + ' whitelist exatamente a especificada', JSON.stringify(run('STUDY_PROGRESS_FIELDS')) === JSON.stringify(WL));
  const allowed = new Set(['id', ...WL]);
  check(lang + ' serialização: só id + whitelist', ser.every(c => Object.keys(c).every(k => allowed.has(k))), Object.keys(sA));
  check(lang + ' serialização: sem direção/note/cardInstance/deck/origin', !['lastDirection', 'reviewDirection', 'note', 'cardInstance', 'deckId', 'origin', 'unitId', 'front', 'tags'].some(k => k in sA));
  check(lang + ' serialização: progresso de A presente', sA.reps === 4 && sA.due === 555555);
  check(lang + ' serialização: A e B saem como entradas separadas', ser.some(c => c.id === idB) && ser.length === ctx.STATE.cards.length);
  const src = read(lang + '/app.js');
  check(lang + ' serializeState usa serializeCardsForSave', /cards: serializeCardsForSave\(STATE\.cards\)/.test(src));
  // round-trip: serializar -> reconstruir -> aplicar
  const json = JSON.parse(JSON.stringify(ser));
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.applySerializedState({ cards: json });
  const a2 = ctx.STATE.cards.find(c => c.id === idA), b2 = ctx.STATE.cards.find(c => c.id === idB);
  check(lang + ' round-trip: progresso volta, estrutura reconstruída', a2.reps === 4 && b2.reps === 2 && a2.note === b2.note && a2.origin === 'study');
  // teacher/self: caminho existente (objeto inteiro, deckId fresco vence)
  const t = { id: 't1', origin: 'teacher', deckId: 5, reps: 0, note: { x: 1 } };
  ctx.mergeSavedCards([t], [{ id: 't1', reps: 3, deckId: 99, foo: 'bar' }]);
  check(lang + ' teacher/self: Object.assign mantido e deckId fresco vence', t.reps === 3 && t.foo === 'bar' && t.deckId === 5);
  const passthru = ctx.serializeCardsForSave([t]);
  check(lang + ' teacher/self: serializado inteiro (inalterado)', passthru[0] === t);
  // legado: nenhum consumidor direto do shape antigo na construção
  check(lang + ' cards da trilha não têm mais front/back_* soltos', cards.every(c => c.front === undefined && c.back_trans === undefined && c.back_hanzi === undefined));
  // K2-G removeu os mecanismos de direção legados (ver tests/k2g)
  check(lang + ' nextCardDirection removido', typeof ctx.nextCardDirection === 'undefined');
  check(lang + ' app.js não referencia mais reviewDirection/lastDirection em código', !/reviewDirection|lastDirection/.test(src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')));
}
summary('K2-C unit');
