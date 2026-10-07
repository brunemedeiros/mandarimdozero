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
    id: idx, revision: 0, status: 'active', note: null,
    tags: studyTrailTags(unit, appKey, { kind: 'palavra', vocabIdx: idx }), deck_id: null,
    fields, card_generation_mode: 'normal_reversed',
  };
}

// ============================================================
// Tags automáticas da trilha (doc arquitetura §11.1). DERIVADAS do
// currículo (content.js) a cada carregamento -- nunca persistidas (o save
// da trilha guarda só id + progresso, ver STUDY_PROGRESS_FIELDS). Pertencem
// à Note sintética, então A e B (irmãs) têm a MESMA lista. Normalizadas
// pela função canônica normalizeNoteTags (shared/flashcard-model.js).
//
//   estudo, <idioma>-geral, nivel-<nível>, modulo-N, unidade-<título>,
//   licao-N, palavra | na-frase
//
// - <idioma>-geral: 'frances-geral'/'mandarim-geral' (exemplo do doc §11.1;
//   o Course Deck se chama "<Idioma> — Curso", mas a tag segue o doc).
// - nivel-*: extra (não está no exemplo do doc): modulo-N é numerado DENTRO
//   do nível (igual ao rótulo "Módulo N" da trilha), então sem o nível
//   "modulo-1" do A1 e do A2 seriam a mesma tag.
// - modulo-N: só quando existe MODULES (fr). zh não tem módulos -> omitido.
// - unidade-<slug do título>; se o slug passar de 50 caracteres, usa o id.
// - licao-N: posição (1-based) da lição que ensina a palavra em unit.lessons.
//   "Na frase" ganha a licao-N da palavra que a apresenta primeiro.
// Como reverter: devolver `tags: []` em studyNoteRowForWord.
// ============================================================
function studyTrailCourseTag(appKey){
  return normalizeTagSlug(String(appKey || 'frances') + '-geral');
}
function studyTrailModuleTag(unit){
  const mods = (typeof MODULES !== 'undefined' && Array.isArray(MODULES)) ? MODULES : null;
  if (!mods) return null;
  const mod = mods.find(m => (m.unitIds || []).some(id => String(id) === String(unit.id)));
  if (!mod) return null;
  const sameLevel = mods.filter(m => m.level === mod.level);
  return 'modulo-' + (sameLevel.indexOf(mod) + 1);
}
function studyTrailUnitTag(unit){
  const byTitle = 'unidade-' + normalizeTagSlug(unit.title);
  if (byTitle !== 'unidade-' && byTitle.length <= TAG_MAX_LENGTH) return byTitle;
  return 'unidade-' + normalizeTagSlug(unit.id);
}
// item: { kind: 'palavra', vocabIdx } | { kind: 'na-frase', phraseIdx }
function studyTrailTags(unit, appKey, item){
  const tags = ['estudo', studyTrailCourseTag(appKey)];
  if (unit.level) tags.push('nivel-' + unit.level);
  const mod = studyTrailModuleTag(unit);
  if (mod) tags.push(mod);
  tags.push(studyTrailUnitTag(unit));
  // "Na frase" usa a lição da palavra que a apresenta (gateVocabIdx).
  const lessonVocabIdx = item ? (item.kind === 'palavra' ? item.vocabIdx : item.gateVocabIdx) : null;
  if (lessonVocabIdx != null){
    const li = (unit.lessons || []).findIndex(l => (l.vocabIdx || []).includes(lessonVocabIdx));
    if (li >= 0) tags.push('licao-' + (li + 1));
  }
  tags.push(item && item.kind === 'na-frase' ? 'na-frase' : 'palavra');
  return normalizeNoteTags(tags);
}

// Tags "finas" da trilha (uma por unidade/lição + o tipo do item): úteis no
// Painel/Anki, mas poluiriam os chips do filtro de Review (dezenas). O
// filtro mostra só as tags "grossas" da trilha (estudo, curso, nível,
// módulo) + todas as tags de cartões próprios/da professora.
function isStudyTrailFineTag(tag){
  return /^unidade-/.test(tag) || /^licao-\d+$/.test(tag) || tag === 'palavra' || tag === 'na-frase';
}
function reviewFilterVisibleTags(cards){
  const set = new Set();
  (cards || []).forEach(c => {
    const own = Array.isArray(c && c.tags) ? c.tags : [];
    const isTrail = c && c.origin === 'study';
    own.forEach(t => { if (!isTrail || !isStudyTrailFineTag(t)) set.add(t); });
  });
  return Array.from(set).sort();
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

// ============================================================
// Cartões "Na frase" (doc §11.1; decisão da autora, 06/10/2026).
// "Na frase" = a frase de exemplo mostrada no cartão de cada palavra nova
// (mesma busca de findMatchingPhrase em fr/zh app.js: frases + falas do
// diálogo da unidade, depois das unidades anteriores). Toda frase de
// exemplo vira UM cartão (1 por frase, nunca 1 por palavra: a palavra já
// tem os cartões A/B próprios; o objetivo aqui é lembrar o exemplo real).
//   - id estável pela posição da frase no conteúdo: `u{unidade}-p{idx}`
//     (unit.phrases) ou `u{unidade}-d{idx}` (dialogue.lines).
//   - pertence à unidade da PRIMEIRA palavra (em ordem de curso) que usa a
//     frase como exemplo: mesmo Course Deck dessa unidade.
//   - gateVocabIdx = índice dessa palavra: entra na revisão quando a lição
//     dela é concluída (isCardLessonCompleted).
//   - vocabIdx = null: não é palavra (métricas por palavra, Speed/Combinar e
//     a projeção A a ignoram); phraseIdx = posição na lista da unidade-fonte.
//   - Note `normal` (1 CardInstance): frase no idioma estudado -> tradução.
// ============================================================
function studyExamplePhraseKey(appKey){
  return appKey === 'mandarim' ? 'c' : 'f';
}
// Espelho exato de findMatchingPhrase (fr/app.js e zh/app.js), mas sobre a
// lista `units` recebida e devolvendo também a posição da frase.
// fr: compara sem caixa e ignora "(de)" do vocabulário; zh: hanzi contido.
function findStudyExamplePhrase(units, word, unit, appKey){
  const key = studyExamplePhraseKey(appKey);
  const needle = String((word && word[key]) || '').replace(/\s*\([^()]*\)/g, '').trim().toLowerCase();
  if (!needle) return null;
  const search = u2 => {
    const phrases = u2.phrases || [];
    for (let i = 0; i < phrases.length; i++){
      if (String(phrases[i][key] || '').toLowerCase().includes(needle)) return { phrase: phrases[i], unitId: u2.id, kind: 'p', idx: i };
    }
    const lines = (u2.dialogue && u2.dialogue.lines) || [];
    for (let i = 0; i < lines.length; i++){
      if (String(lines[i][key] || '').toLowerCase().includes(needle)) return { phrase: lines[i], unitId: u2.id, kind: 'd', idx: i };
    }
    return null;
  };
  const own = search(unit);
  if (own) return own;
  const unitIdx = units.findIndex(u2 => u2.id === unit.id);
  for (let i = 0; i < unitIdx; i++){
    const m = search(units[i]);
    if (m) return m;
  }
  return null;
}
function studyNoteRowForPhrase(unit, phrase, idx, appKey, gateVocabIdx){
  const base = `ph${idx}`;
  const f = (n, lang, value) => ({
    id: `${base}-f${n}`, lang, role: null,
    content: { value }, audio: null, image: null, pinyinFieldId: null,
  });
  let fields;
  if (appKey === 'mandarim'){
    fields = [f(0, 'zh', phrase.c), f(1, 'zh-pinyin', phrase.p), f(2, 'pt-BR', phrase.t)];
    fields[0].pinyinFieldId = fields[1].id;
  } else {
    fields = [f(0, 'fr', phrase.f), f(1, 'pt-BR', phrase.t)];
  }
  return {
    id: idx, revision: 0, status: 'active', note: null,
    tags: studyTrailTags(unit, appKey, { kind: 'na-frase', gateVocabIdx }), deck_id: null,
    fields, card_generation_mode: 'normal',
  };
}
// Cartões "Na frase" de TODO o curso (uma passada, em ordem de curso, para
// cada frase ser atribuída à primeira palavra que a usa).
function buildStudyPhraseCards(units, appKey){
  const cards = [];
  const seen = new Set();
  (units || []).forEach(unit => {
    if (unit.type === 'grammar') return;
    (unit.vocab || []).forEach((word, vIdx) => {
      const m = findStudyExamplePhrase(units, word, unit, appKey);
      if (!m) return;
      const loc = `u${m.unitId}-${m.kind}`;
      if (seen.has(loc + m.idx)) return;
      seen.add(loc + m.idx);
      const ph = m.phrase;
      const hasText = appKey === 'mandarim' ? (ph.c && ph.t) : (ph.f && ph.t);
      if (!hasText) return;
      const row = studyNoteRowForPhrase(unit, ph, m.idx, appKey, vIdx);
      buildEngineCardsFromRow(row, { origin: 'study', appKey, idPrefix: loc }).forEach(c => {
        c.origin = 'study';
        c.unitId = unit.id;
        c.vocabIdx = null;
        c.gateVocabIdx = vIdx;
        c.phraseIdx = m.idx;
        c.phraseSource = { unitId: m.unitId, kind: m.kind };
        c.unitTitle = studyPhraseCardTitle(unit.title); // etiqueta do cartão na Revisão
        c.deckId = null;
        cards.push(c);
      });
    });
  });
  return cards;
}
function isStudyTrailPhraseCard(c){
  return !!c && c.origin === 'study' && c.phraseIdx != null;
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

// Data de "primeira vez aprendida" da palavra = a mais antiga entre as irmãs.
function wordFirstLearnedDate(wordCards){
  const ds = (wordCards || []).map(c => c.firstLearnedDate).filter(Boolean).sort();
  return ds.length ? ds[0] : null;
}
// K.4: SÓ palavras da Study Trail (Teacher/Self nunca entram no gráfico de
// palavras). Continua sendo a data da CardInstance mais antiga entre as irmãs
// (aproximação já existente -- não é histórico Note-level confiável).
function wordLevelFirstLearnedDates(cards){
  return studyWordGroups(cards).map(wordFirstLearnedDate).filter(Boolean);
}

// Força de UMA CardInstance -- a mesma regra que sempre existiu em
// vocabStrengthBuckets (reps===0||lapses>=2 fraca; reps>0&&lapses<2&&
// interval>=60 forte; resto mediana).
function cardStrengthBucket(c){
  if (c.reps === 0 || c.lapses >= 2) return 'weak';
  if (c.reps > 0 && c.lapses < 2 && c.interval >= 60) return 'strong';
  return 'medium';
}
// K.3: a força da PALAVRA/conteúdo (Note) agora vive em
// shared/analytics-metrics.js (noteStrengthBucket/contentMetrics), com
// 'não iniciada' como categoria própria. Aqui fica só a regra por CardInstance.

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
  // Cartões "Na frase" não são palavras: ficam fora dos exercícios de
  // vocabulário (Speed/Combinar). Review/Deck/Anki continuam vendo-os.
  return (cards || []).filter(c => !isStudyTrailPhraseCard(c) && isStudyWordProjectionCard(c));
}

// Nome amigável de uma tag para os filtros (Configurar e Painel). As tags
// automáticas da trilha ganham nome por extenso ("Módulo 1", "Francês
// (geral)"); qualquer outra tag continua aparecendo como "#tag". Só muda o
// que se lê na tela: o filtro continua usando o slug.
// Nomes vêm do idioma do site (shared/i18n) quando t() existe; sem ele
// (testes Node), cai no português de sempre.
const STUDY_TRAIL_TAG_LABEL_PT = {
  'review.deck.lang.frances': 'Francês', 'review.deck.lang.mandarim': 'Mandarim', 'review.deck.lang.portugues': 'Português',
  'review.tagLabel.studyPath': 'Trilha de Estudo', 'review.tagLabel.word': 'Palavra', 'review.tagLabel.inPhrase': 'Na frase',
  'review.tagLabel.general': ' (geral)', 'review.tagLabel.level': 'Nível', 'review.tagLabel.module': 'Módulo', 'review.tagLabel.lesson': 'Lição',
};
// Etiqueta do cartão "Na frase" na Revisão (segue o idioma do site).
function studyPhraseCardTitle(unitTitle){ return `${studyTrailTagText('review.tagLabel.inPhrase')} · ${unitTitle}`; }
function studyTrailTagText(key){ return typeof t === 'function' ? t(key) : STUDY_TRAIL_TAG_LABEL_PT[key]; }
function friendlyTagLabel(tag){
  const s = String(tag || '');
  if (s === 'estudo') return studyTrailTagText('review.tagLabel.studyPath');
  if (s === 'palavra') return studyTrailTagText('review.tagLabel.word');
  if (s === 'na-frase') return studyTrailTagText('review.tagLabel.inPhrase');
  let m = s.match(/^(frances|mandarim|portugues)-geral$/);
  if (m) return studyTrailTagText('review.deck.lang.' + m[1]) + studyTrailTagText('review.tagLabel.general');
  m = s.match(/^nivel-([a-z0-9]+)$/);
  if (m) return studyTrailTagText('review.tagLabel.level') + ' ' + m[1].toUpperCase();
  m = s.match(/^modulo-(\d+)$/);
  if (m) return studyTrailTagText('review.tagLabel.module') + ' ' + m[1];
  m = s.match(/^licao-(\d+)$/);
  if (m) return studyTrailTagText('review.tagLabel.lesson') + ' ' + m[1];
  return '#' + s;
}
