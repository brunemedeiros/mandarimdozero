// ---------- Fase 3 do prompt-mestre "reestruturação de flashcards inspirada
// no Anki" (ver CLAUDE.md) -- camada de compatibilidade ----------
//
// Este arquivo é o ÚNICO lugar do app, daqui pra frente, com permissão de
// ler as colunas legadas de teacher_flashcards/own_flashcards:
//   front, back_trans, front_pinyin, front_is_target_language, choices,
//   cloze_sentence, cloze_answer, cloze_answer_pinyin, audio_url, image_url
// Tudo que consome um flashcard (buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard em fr/zh app.js, e tudo depois deles) passa
// primeiro por interpretNoteFromRow() -- nunca lê `row.*` direto de novo.
//
// Modelo Note/Field/CardInstance conforme especificado na Fase 2 v2
// (aprovada pela autora, ver CLAUDE.md):
//   - Field só sabe seu idioma REAL (`lang`) e conteúdo -- nunca carrega
//     "target"/"native" nem posição.
//   - Note.fieldOrder é só a ordem de edição/exibição no editor -- NUNCA
//     interpretado como frente/verso (ressalva explícita da autora).
//   - Quem decide frente/verso (ou pergunta/resposta, ou qual campo é a
//     lacuna) é o CardInstance -- frontFieldIndex/backFieldIndex,
//     promptFieldIndex/correctFieldIndex, textFieldIndex, conforme o tipo.
//   - isStudyLanguageField() é só um helper pra regras que genuinamente
//     dependem do idioma do app -- nunca decide direção, áudio automático
//     ou apresentação (ressalva explícita da autora). Usado nesta fase só
//     UMA vez, como heurística de INTERPRETAÇÃO de dado histórico (ver
//     comentário em interpretNoteFromRow), não como regra de runtime.
//
// Depende de (já definido em fr/app.js e zh/app.js antes deste script ser
// efetivamente CHAMADO em runtime -- ordem de <script> não importa aqui
// porque nada neste arquivo roda no top-level, só declara funções):
//   - flashcardIdForRow(prefix, row)

const STUDY_LANG_FOR_APP_KEY = { frances: 'fr', mandarim: 'zh' };

// Fase 2 v2, ressalva da autora: helper de idioma, nunca de direção/áudio/
// apresentação. Único uso nesta fase: heurística de interpretação do
// audio_url legado (ver interpretNoteFromRow).
function isStudyLanguageField(field, appKey){
  return field.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

const FLASHCARD_MODEL_FSRS_DEFAULTS = Object.freeze({
  ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0,
  stability: 0, difficulty: 0, state: 'new', lastReview: null,
  fsrsReps: 0, fsrsLapses: 0,
});

// ---------- Sintaxe Cloze nova: {{cN::resposta}} ----------
// Puras -- só entendem a sintaxe NOVA, nunca cloze_sentence/cloze_answer.
const CLOZE_MARK_RE = /\{\{(c\d+)::(.*?)\}\}/g;

function parseClozeMarks(text){
  const marks = [];
  let m;
  CLOZE_MARK_RE.lastIndex = 0;
  while ((m = CLOZE_MARK_RE.exec(text))) marks.push({ id: m[1], answer: m[2] });
  return marks;
}

// Mostra `text` com a lacuna `targetMarkId` oculta (___) por padrão, e
// qualquer outra marcação da mesma nota já revelada como texto puro --
// relevante quando uma nota tiver c1+c2+c3 (não acontece em dado legado,
// que só tem 1 "___" por natureza da coluna antiga, mas a função já nasce
// pronta pra isso). `opts.reveal=true` também revela o alvo.
function renderClozeText(text, targetMarkId, opts){
  const reveal = !!(opts && opts.reveal);
  CLOZE_MARK_RE.lastIndex = 0;
  return text.replace(CLOZE_MARK_RE, (_, id, answer) => {
    if (id !== targetMarkId) return answer;
    return reveal ? answer : '___';
  });
}

// ---------- O adapter ----------
// row: linha crua de teacher_flashcards/own_flashcards.
// opts.origin: 'teacher' | 'self'
// opts.appKey: 'frances' | 'mandarim' (== APP_KEY do site)
// opts.idPrefix: 't' | 's' (mesmo prefixo que flashcardIdForRow já usa)
//
// Devolve { note, cards, legacyRaw }:
//   - note: Note (Fase 2 v2)
//   - cards: array de CardInstance (sempre 1 elemento pra dado legado --
//     Cloze com múltiplas lacunas nunca ocorre aqui, porque cloze_sentence
//     só suporta um "___" por natureza da coluna antiga)
//   - legacyRaw: valores que o modelo novo não tem onde guardar mas que
//     precisam sobreviver pra não quebrar consumidores que ainda leem o
//     shape antigo (ver bridgeNoteCardsToLegacyShape) -- nunca lido por
//     mais ninguém além da própria ponte desta fase.
function interpretNoteFromRow(row, opts){
  const { origin, appKey, idPrefix } = opts;
  const isZh = appKey === 'mandarim';
  const studyLang = STUDY_LANG_FOR_APP_KEY[appKey];
  const cardId = flashcardIdForRow(idPrefix, row);
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const cardTypeId = isCloze ? 'cloze' : isMC ? 'multiple_choice' : 'normal';

  const noteBase = {
    id: cardId,                 // legado: Note.id == id do CardInstance principal (ver ressalva de IDs abaixo)
    legacyRowId: row.id,        // numérico, cru -- mesma info que `rowId` já carregava antes desta fase
    origin,
    languageAppKey: appKey,
    status: row.status,
    note: row.note || null,
    // Achado desta fase (ver relatório): image_url legado NUNCA foi
    // vinculado a um lado específico -- é ilustração do conceito inteiro,
    // não de um Field. Fica no nível da Note, não de um Field individual
    // (Field.image continua existindo no modelo pra uso futuro do editor
    // novo, Fase 6+, só não é usado por este adapter).
    image: row.image_url ? { url: row.image_url } : null,
  };

  // Passthrough legado: front/front_pinyin de um cartão Cloze são dado
  // MORTO (nunca mostrado em revisão -- ver auditoria da Fase 0/1), mas
  // continuam existindo na linha (constraint só virou opcional na
  // migration 035, nada foi apagado retroativamente) e 3 consumidores
  // (Speed Review/Combinar/export Anki, via hasPlainFrontBack()) ainda
  // checam a PRESENÇA desse valor pra decidir elegibilidade. Preservado
  // aqui só pra ponte reconstruir o shape antigo sem regressão -- nenhuma
  // outra parte do sistema deve olhar pra isto.
  // fr-only: o shape legado plano sempre incluía frontIsTargetLanguage em
  // TODO cartão (inclusive cloze, onde vale sempre `true` -- cloze nunca
  // teve seletor de direção). Guardado aqui pra a ponte reconstruir sem
  // precisar reabrir `row`.
  const legacyRaw = {
    front: row.front,
    frontPinyin: row.front_pinyin,
    frontIsTargetLanguage: row.front_is_target_language !== false,
  };

  if (isCloze){
    // ÚNICO trecho que ainda conhece cloze_sentence/cloze_answer/
    // cloze_answer_pinyin -- reconstrói a sintaxe {{c1::...}} na hora.
    // zh: o que a aluna DIGITA é pinyin (cloze_answer_pinyin), o que está
    // de fato escrito na frase e é revelado depois é hanzi (cloze_answer)
    // -- por isso a marcação embute o hanzi (é o conteúdo real da frase)
    // e `compareAnswer` no CardInstance guarda separadamente o valor de
    // comparação quando ele difere do texto embutido (só acontece no zh).
    const text = row.cloze_sentence.replace('___', `{{c1::${row.cloze_answer}}}`);
    const textField = { lang: isZh ? 'zh' : studyLang, text };
    // Áudio próprio em cartão cloze é renderizado por renderClozeReviewCard
    // (confirmado na auditoria da Fase 0/1) -- precisa sobreviver à ponte
    // igual ao caso normal/MC abaixo, vinculado ao único Field que
    // representa o idioma estudado (o campo de texto com a lacuna).
    if (row.audio_url) textField.audio = { url: row.audio_url, source: 'upload' };
    const note = {
      ...noteBase,
      fields: [
        textField,
        { lang: 'pt-BR', text: row.back_trans },
      ],
      fieldOrder: [0, 1],
    };
    const cards = [{
      id: cardId, noteId: cardId, cardTypeId: 'cloze', markId: 'c1',
      textFieldIndex: 0, translationFieldIndex: 1,
      compareAnswer: isZh ? (row.cloze_answer_pinyin || '') : null,
      ...FLASHCARD_MODEL_FSRS_DEFAULTS,
    }];
    return { note, cards, legacyRaw };
  }

  // Normal / Múltipla escolha -- mesmo par de Fields (frente/verso); só o
  // CardInstance difere entre os dois tipos.
  let fields, frontFieldIndex, backFieldIndex;
  if (isZh){
    // zh nunca inverte (Fase 0/1 da auditoria: front_is_target_language
    // nunca é lido em zh/app.js) -- hanzi sempre no índice 0, junto do
    // pinyin (pinyinFieldIndex), tradução sempre no índice 2.
    fields = [
      { lang: 'zh', text: row.front, pinyinFieldIndex: 1 },
      { lang: 'zh-pinyin', text: row.front_pinyin || '' },
      { lang: 'pt-BR', text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 2;
  } else {
    // fr: a coluna `front` do banco sempre mapeia pro índice 0 (é
    // literalmente "o que a professora digitou na caixa Frente") --
    // front_is_target_language decide só o IDIOMA de cada índice, NUNCA
    // a posição (posição continua fixa: [0]=front,[1]=back, exatamente
    // como a coluna do banco já era).
    fields = [
      { lang: studyLang, text: row.front },
      { lang: 'pt-BR', text: row.back_trans },
    ];
    frontFieldIndex = 0; backFieldIndex = 1;
    if (row.front_is_target_language === false){
      fields[0].lang = 'pt-BR';
      fields[1].lang = studyLang;
    }
  }

  // Áudio -- heurística de INTERPRETAÇÃO de dado histórico, não uma regra
  // de runtime (ver ressalva da autora no topo do arquivo): audio_url
  // legado nunca foi explicitamente vinculado a um lado (Fase 0: era
  // renderizado fora da estrutura frente/verso, sempre visível). A única
  // leitura consistente com a intenção original (pronúncia do idioma
  // estrangeiro) é vincular ao campo cujo idioma é o estudado.
  // isStudyLanguageField() é usado aqui UMA vez, só pra interpretar este
  // dado histórico -- cartões autorados pelo editor novo (Fase 6+) vão
  // gravar o áudio explicitamente no Field certo, sem depender disto.
  if (row.audio_url){
    const studyIdx = fields.findIndex(f => isStudyLanguageField(f, appKey));
    if (studyIdx >= 0) fields[studyIdx].audio = { url: row.audio_url, source: 'upload' };
  }

  const note = { ...noteBase, fields, fieldOrder: fields.map((_, i) => i) };

  const cards = [{
    id: cardId, noteId: cardId, cardTypeId,
    frontFieldIndex, backFieldIndex,
    ...(isMC ? {
      promptFieldIndex: frontFieldIndex,
      correctFieldIndex: backFieldIndex,
      distractors: row.choices,
    } : {}),
    ...FLASHCARD_MODEL_FSRS_DEFAULTS,
  }];
  return { note, cards, legacyRaw };
}

// ---------- Ponte de compatibilidade pro motor de revisão atual ----------
// A Fase 3 NÃO reescreve renderReviewView()/renderMultipleChoiceReviewCard()/
// renderClozeReviewCard() -- isso é trabalho explícito da Fase 4 (motor de
// tipos/templates), fora do escopo desta fase. Esta ponte garante só que,
// daqui pra frente, SÓ interpretNoteFromRow() lê as colunas legadas --
// buildCardFromTeacherFlashcard/buildCardFromSelfFlashcard (fr/zh app.js)
// e tudo depois deles trabalham em cima do {note, cards} devolvido pelo
// adapter, nunca da linha crua de novo.
function bridgeNoteCardsToLegacyShape(note, cards, legacyRaw, appKey){
  const isZh = appKey === 'mandarim';
  const card = cards[0]; // legado: sempre 1 CardInstance por nota (Cloze multi-lacuna nunca ocorre em dado legado)
  const unitTitle = note.origin === 'teacher' ? 'Da sua professora' : 'Meus cartões';

  const {
    id, noteId, cardTypeId, frontFieldIndex, backFieldIndex,
    promptFieldIndex, correctFieldIndex, distractors,
    markId, textFieldIndex, translationFieldIndex, compareAnswer,
    ...fsrs
  } = card;

  const base = {
    id: card.id,
    rowId: note.legacyRowId,
    unitId: null,
    unitTitle,
    vocabIdx: null,
    type: 'vocab',
    origin: note.origin,
    teacherNote: note.note,
    flashcardStatus: note.status,
    imageUrl: note.image ? note.image.url : null,
    ...fsrs,
  };

  if (cardTypeId === 'cloze'){
    const textField = note.fields[textFieldIndex];
    const marks = parseClozeMarks(textField.text);
    const mark = marks.find(x => x.id === markId) || marks[0];
    const out = {
      ...base,
      back_trans: note.fields[translationFieldIndex].text,
      clozeSentence: renderClozeText(textField.text, markId, { reveal: false }),
      clozeAnswer: mark ? mark.answer : '',
      // O shape legado plano sempre incluía estas 3 chaves em TODO cartão,
      // inclusive cloze (onde choices é sempre null -- cloze/MC são
      // mutuamente exclusivos por construção desde a Fase 8c). Preservado
      // aqui pra fidelidade estrutural mesmo sem uso funcional em cloze.
      audioUrl: (textField.audio && textField.audio.url) || null,
      choices: null,
    };
    if (isZh){
      out.front_pinyin = legacyRaw.frontPinyin || '';
      out.back_hanzi = legacyRaw.front;   // dado morto, nunca mostrado -- só pra hasPlainFrontBack() continuar correto
      out.clozeAnswerPinyin = compareAnswer || '';
    } else {
      out.front = legacyRaw.front;        // idem -- dado morto, presença checada por hasPlainFrontBack()
      out.frontIsTargetLanguage = legacyRaw.frontIsTargetLanguage;
    }
    return out;
  }

  const frontField = note.fields[frontFieldIndex];
  const backField = note.fields[backFieldIndex];
  const audioUrl = (frontField.audio && frontField.audio.url) || (backField.audio && backField.audio.url) || null;

  if (isZh){
    const pinyinField = note.fields[frontField.pinyinFieldIndex];
    return {
      ...base,
      front_pinyin: pinyinField ? pinyinField.text : '',
      back_hanzi: frontField.text,
      back_trans: backField.text,
      audioUrl,
      choices: distractors || null,
      clozeSentence: null,
      clozeAnswer: null,
    };
  }
  return {
    ...base,
    front: frontField.text,
    back_trans: backField.text,
    frontIsTargetLanguage: frontField.lang !== 'pt-BR',
    audioUrl,
    choices: distractors || null,
    clozeSentence: null,
    clozeAnswer: null,
  };
}

// Atalho pros 2 call sites reais (buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard, fr/zh app.js) -- interpreta + já devolve no
// shape legado que o resto do app (ainda não migrado, Fase 4+) espera.
function legacyFlashcardRowToCard(row, opts){
  const { note, cards, legacyRaw } = interpretNoteFromRow(row, opts);
  return bridgeNoteCardsToLegacyShape(note, cards, legacyRaw, opts.appKey);
}
