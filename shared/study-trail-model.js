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

// ============================================================
// K2-E -- unidade PEDAGÓGICA (palavra = Note) x unidade de ESTUDO
// (CardInstance). Uma palavra da trilha = 1 Note = 2 CardInstances (A e B).
// Métricas que falam de PALAVRAS (aprendida, conhecida, força, gráfico,
// conclusão de unidade) agrupam as CardInstances irmãs pela identidade da
// palavra (unitId + vocabIdx, a mesma que gera os ids u{unit}-v{idx}[-b]);
// Review/FSRS/Deck/fila continuam por CardInstance. Nada aqui muda FSRS,
// direção ou cardinalidade -- só LÊ os dados de progresso já existentes.
// Só a trilha (origin 'study') é agrupada; cards teacher/self continuam
// contando 1 por CardInstance, como antes.
// ============================================================
function isStudyTrailWordCard(c){
  return !!c && c.origin === 'study' && c.unitId != null && c.vocabIdx != null;
}
function studyWordKey(c){ return String(c.unitId) + ':' + String(c.vocabIdx); }

// Agrupa os cards da trilha por palavra (ordem da 1ª aparição).
function studyWordGroups(cards){
  const map = new Map();
  (cards || []).forEach(c => {
    if (!isStudyTrailWordCard(c)) return;
    const k = studyWordKey(c);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(c);
  });
  return Array.from(map.values());
}

// CardInstances irmãs (A e B) de uma palavra específica.
function studyWordCardsFor(cards, unitId, vocabIdx){
  return (cards || []).filter(c => isStudyTrailWordCard(c) && c.unitId === unitId && c.vocabIdx === vocabIdx);
}

// "Evidência de estudo" da palavra: a regra de sempre (reps > 0) aplicada
// ao nível certo -- basta UMA CardInstance irmã ter sido estudada.
function studyWordHasEvidence(wordCards){
  return (wordCards || []).some(c => c.reps > 0);
}

// Unidades pedagógicas de uma lista de cards: cada palavra da trilha vira
// UM grupo; qualquer outro card (teacher/self) continua sozinho.
function wordLevelUnits(cards){
  const out = studyWordGroups(cards);
  (cards || []).forEach(c => { if (!isStudyTrailWordCard(c)) out.push([c]); });
  return out;
}

// {total, learned} em PALAVRAS (trilha) + cards avulsos (demais origens).
function wordLevelLearnedCounts(cards){
  const units = wordLevelUnits(cards);
  return { total: units.length, learned: units.filter(studyWordHasEvidence).length };
}

// Data de "primeira vez aprendida" da palavra = a mais antiga entre as irmãs.
function wordFirstLearnedDate(wordCards){
  const ds = (wordCards || []).map(c => c.firstLearnedDate).filter(Boolean).sort();
  return ds.length ? ds[0] : null;
}
function wordLevelFirstLearnedDates(cards){
  return wordLevelUnits(cards).map(wordFirstLearnedDate).filter(Boolean);
}

// Força de UMA CardInstance -- a mesma regra que sempre existiu em
// vocabStrengthBuckets (reps===0||lapses>=2 fraca; reps>0&&lapses<2&&
// interval>=60 forte; resto mediana).
function cardStrengthBucket(c){
  if (c.reps === 0 || c.lapses >= 2) return 'weak';
  if (c.reps > 0 && c.lapses < 2 && c.interval >= 60) return 'strong';
  return 'medium';
}
// Força da PALAVRA: só as CardInstances COM evidência de estudo contam
// (B New não puxa a palavra para "fraca"); sem nenhuma estudada = fraca
// (equivale ao reps===0 de antes); com estudadas = a mais fraca entre elas
// (a palavra só é "forte" se toda direção já estudada for forte).
function studyWordStrengthBucket(wordCards){
  const studied = (wordCards || []).filter(c => c.reps > 0);
  if (!studied.length) return 'weak';
  const rank = { weak: 0, medium: 1, strong: 2 };
  return studied.map(cardStrengthBucket).reduce((a, b) => rank[b] < rank[a] ? b : a);
}
function wordLevelStrengthBuckets(pool){
  const b = { weak: 0, medium: 0, strong: 0 };
  studyWordGroups(pool).forEach(g => { b[studyWordStrengthBucket(g)]++; });
  (pool || []).forEach(c => { if (!isStudyTrailWordCard(c)) b[cardStrengthBucket(c)]++; });
  return b;
}

// ============================================================
// K2-F -- PROJEÇÃO PEDAGÓGICA (word-level / direção A) para exercícios de
// vocabulário (Speed, Combinar). Uma palavra da trilha = 1 Note = 2
// CardInstances; o exercício trabalha sobre a PALAVRA, então usa só a
// CardInstance cuja FRENTE precede o verso na ordem de Fields da Note (A:
// idioma estudado → tradução; B tem a ordem inversa). É estrutural
// (frontFieldIndex < backFieldIndex), nunca por sufixo de id, e não lê
// lastDirection/reviewDirection. Somente leitura, sem estado novo. Cards
// fora da trilha (teacher/self) passam intactos -- sem agrupamento.
// Review/FSRS/Deck/Anki continuam por CardInstance.
// ============================================================
function isStudyWordProjectionCard(card){
  if (!isStudyTrailWordCard(card)) return true; // teacher/self passam intactos (sem agrupamento)
  return card.cardInstance.frontFieldIndex < card.cardInstance.backFieldIndex;
}
function projectStudyWordsToA(cards){
  return (cards || []).filter(isStudyWordProjectionCard);
}
