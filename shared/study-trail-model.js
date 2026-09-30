// K2-C (ver docs/K2-decisoes.md): a Study Trail deixa de gerar cards
// legados soltos e passa a gerar a representação NATIVA em memória:
//
//   1 palavra do content.js = 1 Note sintética (`normal_reversed`)
//     -> CardInstance A  `u{unitId}-v{idx}`     (frente -> verso; ID legado)
//     -> CardInstance B  `u{unitId}-v{idx}-b`   (verso -> frente; nasce New)
//
// Nada disto é persistido como conteúdo: content.js é a fonte da verdade e
// tudo é reconstruído a cada carregamento. O save guarda só id + progresso
// (whitelist abaixo). Reaproveita o motor existente (buildEngineCardsFromRow),
// sem uma 2ª implementação de CardInstance/direção/FSRS.
//
// Depende de shared/flashcard-model.js (buildEngineCardsFromRow) e de
// flashcardIdForRow (fr/app.js, zh/app.js), resolvidos em tempo de chamada.

// Campos de PROGRESSO (o que applyMemoryGrade/scheduleReview/"Já sei"
// realmente escrevem no card) -- única coisa que o save pode devolver a um
// card da trilha. Nada de conteúdo, Note, CardInstance, Deck, origin,
// unitId/vocabIdx/unitTitle, tags ou direção (lastDirection, se vier em
// save antigo, é ignorado por não estar aqui).
const STUDY_PROGRESS_FIELDS = [
  'ef', 'interval', 'reps', 'due', 'lapses',
  'stability', 'difficulty', 'state', 'lastReview',
  'fsrsReps', 'fsrsLapses', 'fsrsMigrated', 'firstLearnedDate',
];

// Linha sintética (mesmo shape que o motor interpreta pra uma Note nativa)
// de UMA palavra. Ids de Field determinísticos. Texto exatamente como está
// em content.js (AUDIO_MANIFEST procura o texto literal).
function studyNoteRowForWord(unit, vocab, idx, appKey){
  const base = `u${unit.id}-v${idx}`;
  const f = (n, lang, value) => ({
    id: `${base}-f${n}`, lang, role: null,
    content: { value }, audio: null, image: null, pinyinFieldId: null,
  });
  let fields;
  if (appKey === 'mandarim'){
    fields = [f(0, 'zh', vocab.c), f(1, 'zh-pinyin', vocab.p), f(2, 'pt-BR', vocab.t)];
    fields[0].pinyinFieldId = fields[1].id;
  } else {
    fields = [f(0, 'fr', vocab.f), f(1, 'pt-BR', vocab.t)];
  }
  return {
    id: idx, revision: 0, status: 'active', note: null, tags: [], deck_id: null,
    fields, card_generation_mode: 'normal_reversed',
  };
}

// Devolve [A, B] já com os metadados da trilha.
function buildStudyWordCards(unit, vocab, idx, appKey){
  const row = studyNoteRowForWord(unit, vocab, idx, appKey);
  const cards = buildEngineCardsFromRow(row, { origin: 'study', appKey, idPrefix: `u${unit.id}-v` });
  cards.forEach(c => {
    c.origin = 'study';
    c.unitId = unit.id;
    c.vocabIdx = idx;
    c.unitTitle = unit.title;
    c.deckId = null; // preenchido por assignCourseDeckIds (Course Deck da unidade)
  });
  return cards;
}

// Save: card da trilha vira só {id, ...progresso}; demais origens
// (professora/aluna) continuam serializando o objeto inteiro, como antes.
function pickStudyProgress(card){
  const out = { id: card.id };
  STUDY_PROGRESS_FIELDS.forEach(k => { if (card[k] !== undefined) out[k] = card[k]; });
  return out;
}
function serializeCardsForSave(cards){
  return (cards || []).map(c => (c && c.origin === 'study') ? pickStudyProgress(c) : c);
}

// Load: aplica o save sobre os cards recém-reconstruídos, POR ID.
//  - origin 'study': só a whitelist. Aceita save no formato antigo (objeto
//    completo) e no novo (id+progresso) sem detecção de formato: o que não
//    está na whitelist simplesmente nunca é copiado.
//  - demais origens: comportamento anterior (Object.assign inteiro, deckId
//    fresco vence -- é dado derivado do banco).
function mergeSavedCards(cards, savedCards){
  const byId = {};
  (savedCards || []).forEach(s => { if (s && s.id != null) byId[s.id] = s; });
  cards.forEach(c => {
    const saved = byId[c.id];
    if (!saved) return;
    if (c.origin === 'study'){
      STUDY_PROGRESS_FIELDS.forEach(k => {
        if (Object.prototype.hasOwnProperty.call(saved, k) && saved[k] !== undefined) c[k] = saved[k];
      });
      return;
    }
    const freshDeckId = c.deckId;
    Object.assign(c, saved);
    c.deckId = freshDeckId === undefined ? null : freshDeckId;
  });
}
