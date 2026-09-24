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
// Devolve { note, cards }:
//   - note: Note (Fase 2 v2)
//   - cards: array de CardInstance (sempre 1 elemento pra dado legado --
//     Cloze com múltiplas lacunas nunca ocorre aqui, porque cloze_sentence
//     só suporta um "___" por natureza da coluna antiga)
// Fase 4d (ver CLAUDE.md): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// removida -- o fluxo real agora é sempre Note+CardInstance ->
// resolveCardField() -> renderer/feature (ver seção "Fase 4b" abaixo),
// nunca mais um objeto legado intermediário.
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
    return { note, cards };
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
  return { note, cards };
}

// ============================================================
// Fase 4 do prompt-mestre "reestruturação inspirada no Anki" (ver
// CLAUDE.md) -- MOTOR DE TIPOS/TEMPLATES.
//
// 4d (concluída): a ponte pro shape legado plano
// (bridgeNoteCardsToLegacyShape/legacyFlashcardRowToCard/legacyRaw) foi
// REMOVIDA -- não existe mais nenhum objeto legado intermediário em
// nenhum ponto do sistema. buildCardFromTeacherFlashcard/
// buildCardFromSelfFlashcard (fr/zh app.js) chamam buildEngineCardsFromRow()
// diretamente; todo consumidor (renderizadores de Revisão, Speed Review,
// Combinar, export Anki) lê `note`/`cardInstance` via
// resolveCardField()/resolveCardContentView(), nunca um campo de conteúdo
// solto tipo `card.front`/`card.choices`/`card.clozeSentence`.
//
// Princípio central, travado pela autora (Fase 4, restrições 2-5): o fluxo
// final é
//     Note + CardInstance -> resolveCardField() -> renderer/feature
// nunca
//     Note + CardInstance -> objeto legado/shape intermediário -> renderer
// resolveCardField() é o ÚNICO ponto que projeta um Field pra texto/áudio
// exibível -- nenhum renderer (ou Speed Review/Combinar/export Anki, a
// partir de 4c) deve ler `note.fields[i]` direto.
// ============================================================

// Catálogo dos 5 tipos previstos nesta fase -- só documentação/referência,
// não uma tabela de despacho (o despacho de verdade mora em cada
// renderer/feature, olhando `cardInstance.cardTypeId`). "Normal com
// reverso" NÃO tem um cardTypeId próprio -- ver buildReversedCardInstancePair()
// logo abaixo pra explicação de por quê.
const CARD_TYPE_IDS = Object.freeze({
  NORMAL: 'normal',
  TYPE_ANSWER: 'type_answer',
  CLOZE: 'cloze',
  MULTIPLE_CHOICE: 'multiple_choice',
});

// ---------- resolveCardField() -- o único ponto de projeção Field->exibição ----------
// Devolve o texto/pinyin/áudio/imagem de UM Field, dado seu índice dentro
// de note.fields. Nunca decide direção (isso já foi decidido antes, por
// quem escolheu QUAL índice passar aqui -- o CardInstance) nem lê `lang`
// pra inferir front/back/template -- só devolve o que o Field já carrega.
// `field.pinyinFieldIndex` (zh) é resolvido aqui pra nenhum chamador
// precisar saber que hanzi/pinyin são 2 Fields relacionados.
function resolveCardField(note, fieldIndex){
  if (fieldIndex === null || fieldIndex === undefined) return null;
  const field = note.fields[fieldIndex];
  if (!field) return null;
  const pinyinField = field.pinyinFieldIndex !== undefined && field.pinyinFieldIndex !== null
    ? note.fields[field.pinyinFieldIndex] : null;
  return {
    text: field.text,
    lang: field.lang,
    pinyinText: pinyinField ? pinyinField.text : null,
    audioUrl: (field.audio && field.audio.url) || null,
  };
}

// ---------- Elegibilidade de pronúncia automática (TTS) ----------
// Ressalva importante, sinalizada explicitamente no checkpoint da Fase 4a
// (não decidida em silêncio): a restrição da autora ("lang nunca decide se
// deve existir áudio") é sobre usar `lang` pra inventar DIREÇÃO/estrutura
// (ex: "este campo é lang==studyLang, então ele É o front") -- isso
// continua proibido, e resolveCardField() acima não faz isso em nenhum
// caso. Esta função aqui é uma categoria DIFERENTE de decisão: o motor de
// pronúncia do app (speakFrench()/AUDIO_MANIFEST, fr/app.js -- não
// reconstruído nesta fase, restrição 7) só sabe falar UM idioma real;
// chamá-lo sobre texto que não está nesse idioma produziria pronúncia
// errada (voz francesa lendo português), não uma escolha de
// apresentação. `lang` aqui é consultado como propriedade INTRÍNSECA do
// próprio Field (o mesmo tipo de checagem que já se faz sobre `field.text`
// em si), nunca pra decidir qual campo É o front/back -- isso o
// CardInstance já decidiu antes de resolveCardField() ser chamado.
// audio_url explícito (upload) sempre conta como "tem áudio", em
// QUALQUER idioma -- só a tentativa de TTS AUTOMÁTICO depende do idioma
// real do campo.
function fieldHasAudio(resolvedField, appKey){
  if (!resolvedField) return false;
  if (resolvedField.audioUrl) return true;
  return resolvedField.lang === STUDY_LANG_FOR_APP_KEY[appKey];
}

// ---------- Resolvers por Card Type ----------
// Cada um devolve só texto/áudio já resolvido (via resolveCardField) --
// nenhum HTML, nenhuma decisão de tela. O renderer (fr/zh app.js, Fase
// 4b/4c) decide como desenhar isso; este arquivo nunca sabe de DOM.

// Normal -- também usado pelas DUAS CardInstance de um par "Normal com
// reverso" (ver buildReversedCardInstancePair) -- mecanicamente idênticas,
// só com frontFieldIndex/backFieldIndex trocados entre si.
function resolveNormalCardView(note, cardInstance){
  return {
    front: resolveCardField(note, cardInstance.frontFieldIndex),
    back: resolveCardField(note, cardInstance.backFieldIndex),
  };
}

function resolveMultipleChoiceCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const correct = resolveCardField(note, cardInstance.correctFieldIndex);
  return {
    prompt,
    // `correct` (Field resolvido inteiro, com audioUrl) fica disponível pro
    // renderer buscar áudio próprio em qualquer um dos 2 lados -- a
    // heurística de interpretação (Fase 3) vincula o upload ao campo cujo
    // idioma é o estudado, que pode ser prompt OU correct dependendo da
    // direção do cartão. `correctText` continua exposto solto por
    // conveniência (é o que a maioria dos chamadores só precisa).
    correct,
    correctText: correct ? correct.text : '',
    distractorTexts: cardInstance.distractors || [],
  };
}

// "Digite a resposta" -- novo nesta fase, sem dado legado (nenhuma coluna
// de teacher_flashcards/own_flashcards jamais pediu este tipo). Estrutura
// deliberadamente próxima da de Cloze (promptFieldIndex/answerFieldIndex
// em vez de textFieldIndex/markId, porque não há lacuna embutida numa
// frase -- é pergunta inteira -> resposta digitada inteira) -- mesmo
// mecanismo de comparação (compareAnswer opcional, pro caso zh em que o
// que se digita, pinyin, difere do que se revela, hanzi).
function resolveTypeAnswerCardView(note, cardInstance){
  const prompt = resolveCardField(note, cardInstance.promptFieldIndex);
  const answer = resolveCardField(note, cardInstance.answerFieldIndex);
  const displayAnswerText = answer ? answer.text : '';
  return {
    prompt,
    displayAnswerText,
    compareAnswerText: cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined
      ? cardInstance.compareAnswer : displayAnswerText,
  };
}

// Cloze -- reaproveita parseClozeMarks/renderClozeText já existentes
// (sintaxe {{cN::...}}, nunca cloze_sentence/cloze_answer aqui). Devolve a
// frase com TODAS as marcações ainda embutidas (`rawSentenceText`) -- quem
// desenha decide se usa renderClozeText pra ocultar/revelar a lacuna alvo.
function resolveClozeCardView(note, cardInstance){
  const textField = note.fields[cardInstance.textFieldIndex];
  const translation = resolveCardField(note, cardInstance.translationFieldIndex);
  const marks = parseClozeMarks(textField.text);
  const mark = marks.find(m => m.id === cardInstance.markId) || marks[0];
  const displayAnswerText = mark ? mark.answer : '';
  return {
    rawSentenceText: textField.text,
    markId: cardInstance.markId,
    audioUrl: (textField.audio && textField.audio.url) || null,
    translation,
    displayAnswerText,
    compareAnswerText: cardInstance.compareAnswer !== null && cardInstance.compareAnswer !== undefined
      ? cardInstance.compareAnswer : displayAnswerText,
  };
}

// ---------- "Normal com reverso" ----------
// Decisão arquitetural (reportada explicitamente no checkpoint 4a, não
// presumida): NÃO existe um cardTypeId `normal_reversed` -- uma Note
// reversível gera 2 CardInstance, cada uma com cardTypeId:'normal'
// (renderizadas pelo MESMO resolveNormalCardView acima), só com
// frontFieldIndex/backFieldIndex trocados entre si. É fiel ao Anki real
// (a note type "Basic and reversed card" gera Card 1 e Card 2, as duas
// usando o mesmo template "Card", só com Frente/Verso invertidos -- não
// um template distinto) e evita inventar uma 6ª forma de renderizar
// quando a lógica já é idêntica à de "Normal".
// Sufixo de id `-b` (nunca `-r{revision}`, que já significa "cartão
// editado" desde a Fase 8) -- garante que as 2 metades do par nunca
// colidem entre si nem com o mecanismo de reset-por-edição já existente.
// Pura/independente -- não chamada por interpretNoteFromRow() (nenhuma
// linha legada jamais pediu isto, não há coluna pra "reversível" em
// teacher_flashcards/own_flashcards) -- existe pronta pro editor futuro
// (Fase 6+, fora do escopo desta fase) poder gerar uma Note reversível.
function buildReversedCardInstancePair(noteId, frontFieldIndex, backFieldIndex){
  return [
    { id: noteId, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex, backFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
    { id: `${noteId}-b`, noteId, cardTypeId: CARD_TYPE_IDS.NORMAL, frontFieldIndex: backFieldIndex, backFieldIndex: frontFieldIndex, ...FLASHCARD_MODEL_FSRS_DEFAULTS },
  ];
}

// ============================================================
// Fase 4b -- caminho REAL de construção de STATE.cards (substitui
// legacyFlashcardRowToCard() como o que buildCardFromTeacherFlashcard()/
// buildCardFromSelfFlashcard() de fato chamam a partir de agora).
// ============================================================

// Constrói o(s) card(s) nativos pro STATE.cards a partir de uma linha
// legada. Diferença central em relação à ponte (Fase 3): NENHUM campo de
// conteúdo (front/back_trans/clozeSentence/choices/frontIsTargetLanguage/
// audioUrl de Field) é reconstruído solto no card -- `note`+`cardInstance`
// vão INTEIROS, e quem precisar de texto/áudio passa por
// resolveCardField()/resolveCardContentView() abaixo, nunca lendo
// `card.front` etc. (esse campo simplesmente não existe mais no objeto).
//
// Campos FSRS continuam FLAT no nível de topo do card -- mesmo lugar de
// sempre, porque shared/fsrs.js (não tocado nesta fase, restrição da
// autora) lê/escreve ali direto (`applyMemoryGrade(card, grade)` muta
// `card.due`/`card.stability`/etc. do objeto que se passa a ele). Por
// isso eles são DESTRUCTURADOS pra fora do CardInstance bruto aqui --
// `cardInstance` guardado no card carrega só identidade/apresentação
// (id/cardTypeId/índices de campo), nunca uma 2ª cópia dos campos FSRS
// que iria dessincronizar da cópia real assim que a 1ª revisão acontecer.
//
// Devolve um ARRAY -- hoje sempre 1 elemento pra dado legado (nenhuma
// linha jamais pediu "Normal com reverso"), mas o formato já é o que
// "Normal com reverso"/multi-CardInstance vai precisar quando o editor
// existir (Fase 6+).
function buildEngineCardsFromRow(row, opts){
  const { note, cards } = interpretNoteFromRow(row, opts);
  const unitTitle = note.origin === 'teacher' ? 'Da sua professora' : 'Meus cartões';
  return cards.map(rawCardInstance => {
    const {
      id, noteId, cardTypeId,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
      ...presentationFields
    } = rawCardInstance;
    const cardInstance = { id, noteId, cardTypeId, ...presentationFields };
    return {
      id,
      rowId: note.legacyRowId,
      unitId: null,
      unitTitle,
      vocabIdx: null,
      type: 'vocab',
      origin: note.origin,
      teacherNote: note.note,
      flashcardStatus: note.status,
      // Note-level (nunca de um Field específico -- achado da Fase 3,
      // confirmado de novo aqui): imagem ilustra o conceito inteiro.
      imageUrl: note.image ? note.image.url : null,
      note,
      cardInstance,
      ef, interval, reps, due, lapses, stability, difficulty, state, lastReview, fsrsReps, fsrsLapses,
    };
  });
}

// Dispatcher único -- dado um card de STATE.cards já construído por
// buildEngineCardsFromRow(), devolve a "view" de conteúdo certa pro tipo
// dele (ver resolvers acima). É o ponto de entrada que renderers/Speed
// Review/Combinar/export Anki (Fase 4b/4c) chamam -- nunca despacham por
// conta própria olhando `card.choices`/`card.clozeSentence` (esses campos
// não existem mais no card nativo).
function resolveCardContentView(card){
  const { note, cardInstance } = card;
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.MULTIPLE_CHOICE){
    return { kind: CARD_TYPE_IDS.MULTIPLE_CHOICE, ...resolveMultipleChoiceCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.TYPE_ANSWER){
    return { kind: CARD_TYPE_IDS.TYPE_ANSWER, ...resolveTypeAnswerCardView(note, cardInstance) };
  }
  if (cardInstance.cardTypeId === CARD_TYPE_IDS.CLOZE){
    return { kind: CARD_TYPE_IDS.CLOZE, ...resolveClozeCardView(note, cardInstance) };
  }
  return { kind: CARD_TYPE_IDS.NORMAL, ...resolveNormalCardView(note, cardInstance) };
}
