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
// `released` (Etapa 0 do currículo, docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 item 8): o cartão já
// passou pelo portão de lição uma vez; passa sempre daí em diante (mover a palavra para uma unidade nova não a
// tira da Revisão). Só os itens com chave estável (`k`; fr e zh desde o C1 da paridade) ganham a marca.
const STUDY_PROGRESS_FIELDS = [
  'ef', 'interval', 'reps', 'due', 'lapses',
  'stability', 'difficulty', 'state', 'lastReview',
  'fsrsReps', 'fsrsLapses', 'fsrsMigrated', 'firstLearnedDate', 'released',
];

// ============================================================
// Etapa 0 do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, seção 2): o cartão é identificado
// pelo ITEM, nunca pelo lugar. Cada palavra/frase/fala do <site>/content.js (fr; zh desde o C1 da paridade) tem uma
// chave congelada `k` (valor inicial = id de hoje sem o "u", então nenhum id mudou). Item SEM `k` usa a regra antiga
// por posição: `u{unidade}-{v|p|d}{posição}`.
// ============================================================
function studyItemKey(item){
  return item && typeof item.k === 'string' && item.k !== '' ? item.k : null;
}
// Id (base, cartão A) de um item da trilha. kind: 'v' palavra, 'p' frase, 'd' fala do diálogo.
// unitId/idx só servem para o item sem chave. O cartão B da palavra é este id + '-b'.
function studyItemCardId(unitId, kind, idx, item){
  const k = studyItemKey(item);
  return k ? 'u' + k : `u${unitId}-${kind}${idx}`;
}
// Atalho para a palavra `idx` da unidade (o que os exercícios e a introdução da palavra usam).
function studyWordCardId(unit, idx){
  return studyItemCardId(unit.id, 'v', idx, unit.vocab ? unit.vocab[idx] : null);
}

// Linha sintética (mesmo shape que o motor interpreta pra uma Note nativa)
// de UMA palavra. Ids de Field determinísticos. Texto exatamente como está
// em content.js (AUDIO_MANIFEST procura o texto literal).
function studyNoteRowForWord(unit, vocab, idx, appKey){
  const base = studyItemCardId(unit.id, 'v', idx, vocab);
  const f = (n, lang, value) => ({
    id: `${base}-f${n}`, lang, role: null,
    content: { value }, audio: null, image: null, pinyinFieldId: null,
  });
  let fields;
  if (LanguageRegistry.isCjk(appKey)){
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
  return normalizeTagSlug(String(appKey || LanguageRegistry.defaultAppKey()) + '-geral');
}
function studyTrailModuleTag(unit){
  const mods = (typeof MODULES !== 'undefined' && Array.isArray(MODULES)) ? MODULES : null;
  if (!mods) return null;
  const mod = mods.find(m => (m.unitIds || []).some(id => String(id) === String(unit.id)));
  if (!mod) return null;
  const sameLevel = mods.filter(m => m.level === mod.level);
  return 'modulo-' + (sameLevel.indexOf(mod) + 1);
}
// O slug sai SEMPRE do título original em português (`_originalTitle`, guardado por
// shared/content-i18n.js antes do overlay): no site em inglês o overlay troca
// `unit.title`, e o slug não pode mudar (filtros de tag salvos deixariam de casar).
function studyTrailUnitTag(unit){
  const sourceTitle = (unit && typeof unit._originalTitle === 'string') ? unit._originalTitle : unit.title;
  const byTitle = 'unidade-' + normalizeTagSlug(sourceTitle);
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
  // O id vem da chave do item (studyItemCardId); `rowId`/legacyRowId continuam sendo a posição, como antes.
  const cardId = studyItemCardId(unit.id, 'v', idx, vocab);
  const cards = buildEngineCardsFromRow(Object.assign({}, row, { id: cardId }), { origin: 'study', appKey, idPrefix: '' });
  const key = studyItemKey(vocab);
  cards.forEach(c => {
    c.rowId = idx;
    if (c.note) c.note.legacyRowId = idx;
    if (key) c.studyKey = key;
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
  return LanguageRegistry.isCjk(appKey) ? 'c' : 'f';
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
  if (LanguageRegistry.isCjk(appKey)){
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
      const cardId = studyItemCardId(m.unitId, m.kind, m.idx, m.phrase);
      if (seen.has(cardId)) return;
      seen.add(cardId);
      const ph = m.phrase;
      const hasText = LanguageRegistry.isCjk(appKey) ? (ph.c && ph.t) : (ph.f && ph.t);
      if (!hasText) return;
      const row = studyNoteRowForPhrase(unit, ph, m.idx, appKey, vIdx);
      const key = studyItemKey(ph);
      buildEngineCardsFromRow(Object.assign({}, row, { id: cardId }), { origin: 'study', appKey, idPrefix: '' }).forEach(c => {
        c.rowId = m.idx;
        if (c.note) c.note.legacyRowId = m.idx;
        if (key) c.studyKey = key;
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
// `preserved` (A2, revisão de 2026-10-24): entradas do save de cartões da professora/próprios cuja busca FALHOU neste
// carregamento (ver PRESERVED_SAVED_CARDS em shared/core/estado-trilha-desafios.js). Voltam para o save como estavam,
// para o progresso FSRS delas nunca sumir por uma falha de rede; um id já presente em `cards` vence.
function serializeCardsForSave(cards, preserved){
  const out = (cards || []).map(c => (c && c.origin === 'study') ? pickStudyProgress(c) : c);
  if (Array.isArray(preserved) && preserved.length){
    const ids = new Set(out.map(c => c && c.id));
    preserved.forEach(s => { if (s && s.id != null && !ids.has(s.id)){ out.push(s); ids.add(s.id); } });
  }
  return out;
}

// Origem de uma entrada SALVA de cartão: 'teacher' (id t...), 'self' (id s...) ou null (trilha e o resto).
// O save de professora/próprios guarda o objeto inteiro (com `origin`); o prefixo do id cobre save sem o campo.
function savedCardOrigin(s){
  if (!s || s.id == null) return null;
  if (s.origin === 'teacher' || s.origin === 'self') return s.origin;
  if (s.origin) return null;
  const id = String(s.id);
  if (/^t\d/.test(id)) return 'teacher';
  if (/^s\d/.test(id)) return 'self';
  return null;
}
// Entradas salvas das origens `origins` que não casaram com nenhum cartão de `cards` (A2): é o que mergeSavedCards
// deixaria cair. Só se guardam quando a busca daquela origem falhou; com busca bem-sucedida, sumir é sinal de cartão apagado.
function unmatchedSavedCardsOfOrigins(cards, savedCards, origins){
  if (!Array.isArray(savedCards) || !origins || !origins.length) return [];
  const ids = new Set((cards || []).map(c => c && c.id));
  return savedCards.filter(s => s && s.id != null && !ids.has(s.id) && origins.includes(savedCardOrigin(s)));
}

// Load: aplica o save sobre os cards recém-reconstruídos, POR ID.
//  - origin 'study': só a whitelist. Aceita save no formato antigo (objeto
//    completo) e no novo (id+progresso) sem detecção de formato: o que não
//    está na whitelist simplesmente nunca é copiado.
//  - demais origens: comportamento anterior (Object.assign inteiro, deckId
//    fresco vence -- é dado derivado do banco).
const NOTE_LEVEL_FRESH_FIELDS = [
  'flashcardStatus', 'teacherNote', 'tags', 'imageUrl', 'note', 'cardInstance', 'deckId',
  'rowId', 'unitTitle', 'unitTitleKey', 'origin', 'teacherId',
];
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
    // Teacher/Self: o save traz o objeto inteiro (progresso + cópia do conteúdo). O que é DERIVADO DO
    // BANCO (status, observação, tags, conteúdo, deck) tem de vencer a cópia velha do save; senão arquivar,
    // corrigir ou mudar a observação de um cartão já estudado nunca chega ao aluno. Só o progresso vem do save.
    const fresh = {};
    NOTE_LEVEL_FRESH_FIELDS.forEach(k => { fresh[k] = c[k]; });
    Object.assign(c, saved);
    NOTE_LEVEL_FRESH_FIELDS.forEach(k => { c[k] = fresh[k]; });
    if (c.deckId === undefined) c.deckId = null;
  });
}

// ============================================================
// Etapa 0 do currículo: fusões, aposentados e arquivo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 itens 6, 7).
// Tudo aqui é PURO (sem STATE/DOM): recebe o save e devolve o save ajustado. Idempotente: aplicar duas vezes dá o
// mesmo resultado. Só mexe em entradas da TRILHA (id `u...`, origem 'study' ou sem origem, que é o formato salvo);
// cartões da professora/próprios passam intactos.
// ============================================================
const STUDY_ARCHIVE_EXTRA_FIELDS = ['retiredAt', 'mergedInto'];

// Mudanças de currículo do idioma da página (<site>/curriculum-changes.js); sem o arquivo (testes) = nenhuma.
function studyCurriculumChanges(){
  return {
    merges: typeof STUDY_KEY_MERGES !== 'undefined' ? STUDY_KEY_MERGES : {},
    retiredKeys: typeof STUDY_RETIRED_KEYS !== 'undefined' ? STUDY_RETIRED_KEYS : [],
    unitMerges: typeof UNIT_MERGES !== 'undefined' ? UNIT_MERGES : {},
    moduleMerges: typeof MODULE_MERGES !== 'undefined' ? MODULE_MERGES : {},
    retiredLessonIds: typeof RETIRED_LESSON_IDS !== 'undefined' ? RETIRED_LESSON_IDS : [],
    version: typeof CURRICULUM_VERSION !== 'undefined' ? CURRICULUM_VERSION : null,
  };
}

function isStudySavedEntry(s){
  return !!s && s.id != null && /^u./.test(String(s.id)) && (s.origin == null || s.origin === 'study');
}
// `uA1-3-v5-b` -> { key: 'A1-3-v5', suffix: '-b' }; `uA1-3-p2` -> { key: 'A1-3-p2', suffix: '' }.
function studyCardIdParts(id){
  const s = String(id);
  const b = /-b$/.test(s);
  return { key: s.slice(1, b ? -2 : undefined), suffix: b ? '-b' : '' };
}
function studyProgressOnly(entry, extra){
  const out = { id: entry.id };
  STUDY_PROGRESS_FIELDS.concat(extra ? STUDY_ARCHIVE_EXTRA_FIELDS : []).forEach(k => {
    if (Object.prototype.hasOwnProperty.call(entry, k) && entry[k] !== undefined) out[k] = entry[k];
  });
  return out;
}
function studyReviewTime(entry){
  const v = entry && entry.lastReview;
  if (v == null || v === '') return -Infinity;
  const n = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(n) ? n : -Infinity;
}
// Regra de fusão FSRS: vence a revisão mais recente; empate -> maior stability; empate total -> `a` (o sobrevivente).
// firstLearnedDate = a mais antiga das duas; `released` se qualquer uma já tinha passado pelo portão.
// Devolve { winner, loser, aWon } (cópias; nada é mutado).
function mergeStudyProgress(a, b){
  let winner = a, loser = b;
  const ta = studyReviewTime(a), tb = studyReviewTime(b);
  if (tb > ta) { winner = b; loser = a; }
  else if (tb === ta && (Number(b.stability) || 0) > (Number(a.stability) || 0)) { winner = b; loser = a; }
  const w = Object.assign({}, winner);
  const dates = [a.firstLearnedDate, b.firstLearnedDate].filter(Boolean).sort();
  if (dates.length) w.firstLearnedDate = dates[0];
  if (a.released || b.released) w.released = true;
  return { winner: w, loser: Object.assign({}, loser), aWon: winner === a };
}
function resolveStudyKey(merges, key){
  const seen = new Set();
  let k = key;
  while (merges && Object.prototype.hasOwnProperty.call(merges, k) && merges[k] && !seen.has(k)){ seen.add(k); k = merges[k]; }
  return k;
}

// savedCards: data.cards do bloco. opts:
//   merges        { chaveAntiga: chaveSobrevivente } (STUDY_KEY_MERGES)
//   retiredKeys   [chave] (STUDY_RETIRED_KEYS)
//   currentIds    ids de cartão da trilha que existem AGORA (null = não arquiva órfão nem restaura)
//   archive       arquivo salvo (data.retiredStudyCards) { id: {...progresso, retiredAt, mergedInto?} }
//   today         'AAAA-MM-DD' gravado em retiredAt
// Devolve { cards, archive, renames: {idAntigo: idNovo}, archived: [ids], restored: [ids] }.
function applyStudyKeyChanges(savedCards, opts){
  const o = opts || {};
  const merges = o.merges || {};
  const retired = new Set(o.retiredKeys || []);
  const current = o.currentIds ? new Set(o.currentIds) : null;
  const today = o.today || null;
  const archive = {};
  const renames = {}, archived = [], restored = [];
  if (o.archive && typeof o.archive === 'object'){
    Object.keys(o.archive).forEach(id => {
      const e = o.archive[id];
      if (!e || typeof e !== 'object' || id === '__proto__' || id === 'constructor' || id === 'prototype') return;
      archive[id] = studyProgressOnly(Object.assign({}, e, { id }), true);
    });
  }
  const putArchive = (id, entry, extra) => {
    const src = Object.assign({}, entry, extra || {}, { id });
    if (src.retiredAt == null) src.retiredAt = today;
    const e = studyProgressOnly(src, true); // ordem de campos fixa: aplicar de novo grava os mesmos bytes
    if (archive[id]){
      // já havia uma cópia arquivada deste id: fica a de revisão mais recente (mesma regra da fusão)
      const m = mergeStudyProgress(archive[id], e);
      archive[id] = m.winner;
    } else archive[id] = e;
    archived.push(id);
  };

  // 1. renomeia pelas fusões e aplica a regra de fusão quando o save tem os dois (A com A, B com B: o sufixo vai junto)
  const slots = []; // entradas que não são da trilha (objeto) ou marcador { studyId } (posição da entrada da trilha)
  const marks = new WeakSet();
  const mark = studyId => { const m = { studyId }; marks.add(m); return m; };
  const groups = new Map(); // idNovo -> [{ origId, entry }]
  (savedCards || []).forEach(s => {
    if (!isStudySavedEntry(s)){ slots.push(s); return; }
    const origId = String(s.id);
    const parts = studyCardIdParts(origId);
    const newId = 'u' + resolveStudyKey(merges, parts.key) + parts.suffix;
    if (newId !== origId) renames[origId] = newId;
    if (!groups.has(newId)){ groups.set(newId, []); slots.push(mark(newId)); }
    const list = groups.get(newId);
    // o mesmo id repetido no save (sem fusão): vale o último, como sempre valeu em mergeSavedCards
    const dup = list.findIndex(x => x.origId === origId);
    if (dup >= 0) list.splice(dup, 1);
    list.push({ origId, entry: Object.assign({}, s, { id: newId }) });
  });
  const study = new Map();
  groups.forEach((list, newId) => {
    // o sobrevivente (id que já era o novo) começa como `a`, para vencer o empate total
    const ordered = list.filter(x => x.origId === newId).concat(list.filter(x => x.origId !== newId));
    let cur = ordered[0];
    for (let i = 1; i < ordered.length; i++){
      const other = ordered[i];
      const m = mergeStudyProgress(cur.entry, other.entry);
      const aWon = m.aWon;
      const loserOrig = aWon ? other.origId : cur.origId;
      putArchive(loserOrig, Object.assign(m.loser, { id: loserOrig }), { mergedInto: newId });
      cur = { origId: aWon ? cur.origId : other.origId, entry: Object.assign(m.winner, { id: newId }) };
    }
    study.set(newId, cur.entry);
  });

  // 2. aposentados e órfãos (id que não existe mais no conteúdo, por qualquer motivo) vão para o arquivo
  study.forEach((entry, id) => {
    const key = studyCardIdParts(id).key;
    if (retired.has(key) || (current && !current.has(id))){
      putArchive(id, entry);
      study.delete(id);
    }
  });

  // 3. arquivados cuja chave voltou (e que não estão ativos no save) voltam com o progresso
  if (current){
    Object.keys(archive).forEach(id => {
      const parts = studyCardIdParts(id);
      const key = resolveStudyKey(merges, parts.key);
      const targetId = 'u' + key + parts.suffix;
      if (retired.has(key) || !current.has(targetId) || study.has(targetId)) return;
      const back = studyProgressOnly(archive[id], false);
      back.id = targetId;
      study.set(targetId, back);
      slots.push(mark(targetId));
      delete archive[id];
      restored.push(targetId);
    });
  }

  const cards = [];
  slots.forEach(s => {
    if (marks.has(s)){
      const e = study.get(s.studyId);
      if (e){ cards.push(e); study.delete(s.studyId); }
    } else cards.push(s);
  });
  return { cards, archive, renames, archived, restored };
}

// Leva as gavetas de palavra (STATE.cardVariants) e os ids de "difíceis" (reviewRecords.hardSeenIds) junto com as
// fusões. Puro: devolve cópias. Na colisão de gaveta, a do sobrevivente vence.
function renameStudyIdsInRecords(renames, cardVariants, hardSeenIds){
  const r = renames || {};
  const cv = {};
  if (cardVariants && typeof cardVariants === 'object'){
    Object.keys(cardVariants).forEach(id => { if (!Object.prototype.hasOwnProperty.call(r, id)) cv[id] = cardVariants[id]; });
    Object.keys(cardVariants).forEach(id => {
      if (!Object.prototype.hasOwnProperty.call(r, id)) return;
      const to = r[id];
      cv[to] = Object.assign({}, cardVariants[id], cv[to] || {});
    });
  }
  let hs = Array.isArray(hardSeenIds) ? hardSeenIds.map(id => Object.prototype.hasOwnProperty.call(r, id) ? r[id] : id) : hardSeenIds;
  if (Array.isArray(hs)) hs = Array.from(new Set(hs));
  return { cardVariants: cardVariants && typeof cardVariants === 'object' ? cv : cardVariants, hardSeenIds: hs };
}

// UNIT_MERGES / MODULE_MERGES (2.3 item 10): unidade/módulo fundido leva o progresso para o novo (concluída se
// qualquer um dos dois estava; Ponto de verificação mantém aprovado e a melhor nota). Puro: devolve cópias.
// O registro antigo fica (o carregamento ignora unidade que não existe mais).
function applyUnitModuleMerges(unitProgress, checkpointProgress, unitMerges, moduleMerges){
  const up = unitProgress && typeof unitProgress === 'object' ? Object.assign({}, unitProgress) : unitProgress;
  const cp = checkpointProgress && typeof checkpointProgress === 'object' ? Object.assign({}, checkpointProgress) : checkpointProgress;
  const fold = (map, from, to, combine) => {
    if (!map || !map[from] || !to) return;
    map[to] = combine(map[from], map[to]);
  };
  Object.keys(unitMerges || {}).forEach(from => fold(up, from, unitMerges[from], (a, b) => {
    const out = Object.assign({}, a, b || {});
    ['started', 'completed', 'unlocked'].forEach(k => { out[k] = !!(a[k] || (b && b[k])); });
    return out;
  }));
  Object.keys(moduleMerges || {}).forEach(from => fold(cp, from, moduleMerges[from], (a, b) => ({
    completed: !!(a.completed || (b && b.completed)),
    bestScore: Math.max(Number(a.bestScore) || 0, Number(b && b.bestScore) || 0),
  })));
  return { unitProgress: up, checkpointProgress: cp };
}

// Lições (2.3 item 9): o save guarda também o id da lição atual (`lessonId`). Só para unidade começada e não
// concluída (concluída volta para lessonIdx 0). Muta `unitProgress` (é o próprio STATE.unitProgress no save).
function stampUnitLessonIds(unitProgress, units){
  (units || []).forEach(u => {
    const p = unitProgress && unitProgress[u.id];
    if (!p || !Array.isArray(u.lessons) || !u.lessons.length) return;
    if (!p.started || p.completed) return;
    const l = u.lessons[p.lessonIdx];
    if (l && l.id) p.lessonId = l.id;
  });
}
// No carregamento: se a lição salva mudou de posição, `lessonIdx` segue o id; se sumiu, volta para a 1ª lição que
// ainda tem palavra não liberada (isWordReleased(unit, vocabIdx)). Muta `unitProgress`.
function reconcileUnitLessonIdx(unitProgress, units, isWordReleased){
  (units || []).forEach(u => {
    const p = unitProgress && unitProgress[u.id];
    if (!p || typeof p.lessonId !== 'string' || !Array.isArray(u.lessons) || !u.lessons.length) return;
    if (!p.started || p.completed) return;
    const at = u.lessons.findIndex(l => l && l.id === p.lessonId);
    if (at >= 0){ if (at !== p.lessonIdx) p.lessonIdx = at; return; }
    let idx = u.lessons.findIndex(l => (l.vocabIdx || []).some(vi => !(isWordReleased && isWordReleased(u, vi))));
    if (idx < 0) idx = u.lessons.length - 1;
    p.lessonIdx = idx;
    const l = u.lessons[idx];
    if (l && l.id) p.lessonId = l.id;
  });
}

// Hanzi do zh (STATE.hanziCards, ids h<lição>-c<índice>): o save grava o objeto inteiro, mas ao carregar só o
// PROGRESSO volta (mesma whitelist da trilha). O texto (char, pinyin, significado, radicais) vem da camada do
// curso e é reaplicado por refreshStudyCardTexts. Sem isto o progresso dos hanzi zerava a cada carregamento
// (a restauração foi removida na K2-C, commit 49692ff; ver docs/i18n/auditoria-e3-progresso-por-curso.md).
function mergeSavedHanziCards(cards, savedCards){
  const byId = {};
  (savedCards || []).forEach(s => { if (s && s.id != null) byId[s.id] = s; });
  (cards || []).forEach(c => {
    const saved = byId[c.id];
    if (!saved) return;
    STUDY_PROGRESS_FIELDS.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(saved, k) && saved[k] !== undefined) c[k] = saved[k];
    });
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
  'review.tagLabel.unitPrefix': '#unidade-',
};
// Etiqueta do cartão "Na frase" na Revisão (segue o idioma do site).
function studyPhraseCardTitle(unitTitle){ return `${studyTrailTagText('review.tagLabel.inPhrase')} · ${unitTitle}`; }
function studyTrailTagText(key){ return typeof t === 'function' ? t(key) : STUDY_TRAIL_TAG_LABEL_PT[key]; }
function friendlyTagLabel(tag){
  const s = String(tag || '');
  if (s === 'estudo') return studyTrailTagText('review.tagLabel.studyPath');
  if (s === 'palavra') return studyTrailTagText('review.tagLabel.word');
  if (s === 'na-frase') return studyTrailTagText('review.tagLabel.inPhrase');
  let m = s.match(new RegExp('^(' + LanguageRegistry.appKeys().join('|') + ')-geral$'));
  if (m) return studyTrailTagText('review.deck.lang.' + m[1]) + studyTrailTagText('review.tagLabel.general');
  m = s.match(/^nivel-([a-z0-9]+)$/);
  if (m) return studyTrailTagText('review.tagLabel.level') + ' ' + m[1].toUpperCase();
  m = s.match(/^modulo-(\d+)$/);
  if (m) return studyTrailTagText('review.tagLabel.module') + ' ' + m[1];
  m = s.match(/^licao-(\d+)$/);
  if (m) return studyTrailTagText('review.tagLabel.lesson') + ' ' + m[1];
  // Tag da unidade (`unidade-<slug>`, ver studyTrailUnitTag): só o prefixo da etiqueta segue o idioma do site
  // (em pt-BR continua "#unidade-…"); o slug é lógica do filtro e não muda.
  m = s.match(/^unidade-(.+)$/);
  if (m) return studyTrailTagText('review.tagLabel.unitPrefix') + m[1];
  return '#' + s;
}
