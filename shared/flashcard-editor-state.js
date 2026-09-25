// ---------- Fase 6D.1 do prompt-mestre "reestruturação Note/CardType/
// CardInstance" (ver CLAUDE.md) -- ESTADO/MODELO NATIVO DO EDITOR ----------
//
// Fundação de estado pro editor de flashcards (shared/admin-flashcards.js/
// shared/my-flashcards.js) migrar pro modelo Note/Field da Fase 6B --
// só a REPRESENTAÇÃO INTERNA, sem nenhuma UI nova, sem persistência, sem
// mudar o formulário atual. Nada aqui é chamado ainda pelo editor real
// (ver "O que fica pra 6D.2+" no relatório desta fase em CLAUDE.md).
//
// Separação de responsabilidade, 4 baldes distintos (pedido explícito da
// autora nesta fase):
//   1. Note editor state (este arquivo) -- o que É persistível: fields,
//      card_generation_mode, revision, identidade.
//   2. "Note" o conceito (fields/cardGenerationMode) -- vive DENTRO do
//      Note editor state, nunca confundido com #3.
//   3. Estado de UI efêmero (createEditorUiState) -- objeto SEPARADO,
//      nunca mesclado no Note editor state, nunca comparado por
//      noteEditorStateChanged()/...RequiresNewRevision(). Campo
//      selecionado, foco, seleção de texto pro Cloze etc. pertencem aqui
//      quando as subfases 6D.2+ precisarem deles -- hoje só o esqueleto.
//   4. Legacy row -- um cartão que ainda usa as 12 colunas antigas
//      (front/back_trans/cloze_sentence/etc.) nunca é convertido
//      automaticamente pra native por este arquivo (decisão travada
//      nesta fase, ver CLAUDE.md) -- fica embrulhado como
//      `{kind:'legacy', legacyRow:{...}}`, opaco pra quem só lida com
//      Note/Field. A conversão de verdade (quando/como) é decisão da
//      Fase 6D.8, não daqui.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- depois de
// shared/flashcard-model.js, antes do editor real):
//   - shared/flashcard-model.js (CARD_GENERATION_MODES,
//     isNoteFieldsPresent, isCardGenerationModePresent,
//     validateNativeNoteRow)
//
// Convenção de "revision" nesta fase (decisão 4, travada pela autora):
// QUALQUER alteração de conteúdo persistível -- Fields, idioma de um
// Field, Card Type, resposta/alternativas, imagem, áudio, pinyinFieldId,
// inclusive a nota privada da professora (`privateNote`) -- conta como
// "mudou" pra fins de nova revision. De propósito NÃO existe ainda uma
// taxonomia fina que distinga "só corrigi um erro de digitação" de "troquei
// a estrutura" -- é o MESMO nível de rigor que o editor legado já tinha
// (updateFlashcardContent/updateOwnFlashcardContent sempre incrementam
// `revision` a cada save, não importa o que mudou). Quando uma taxonomia
// mais fina existir, só noteEditorStateRequiresNewRevision() muda -- o
// resto do editor não precisa saber.

// ---------- Field state ----------

// Id estável de Field -- gerado só quando um Field NOVO é criado (nunca
// regenerado ao carregar um Field já persistido, nem ao clonar/comparar
// estado -- ver createFieldState abaixo). Mesmo padrão de "componente
// aleatório" já usado em paths de Storage neste repo (ex:
// uploadFlashcardMedia), só que aqui o id em si é o dado persistido
// (pinyinFieldId referencia por ele), não um path de arquivo.
function generateFieldId(){
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Normaliza `content` pra sempre `{value: string}` -- mesmo shape que
// buildNativeRuntimeFields() (shared/flashcard-model.js) já lê
// (`(f.content && f.content.value) || ''`). Aceita string solta como
// atalho de conveniência pro chamador, mas o estado guardado é sempre o
// objeto -- nunca uma segunda representação paralela de conteúdo (rich
// text fica pra decisão futura, ver CLAUDE.md seção 7 da auditoria; este
// arquivo não fecha nem abre essa porta, só não INVENTA uma estrutura
// nova que a decisão futura teria que desfazer).
function normalizeFieldContent(content){
  if (typeof content === 'string') return { value: content };
  if (content && typeof content.value === 'string') return { value: content.value };
  return { value: '' };
}

// Field state -- shape EXATO que o motor já valida/consome
// (validateNativeNoteRow/buildNativeRuntimeFields, shared/flashcard-model.js):
// id, lang, role (só usado por multiple_choice), content, audio, image,
// pinyinFieldId. Nenhuma propriedade a mais -- em particular, NUNCA
// `frontIsTargetLanguage`/`isReverse`/qualquer booleano de "direção":
// direção não é propriedade de Field, é decidida pelo CardInstance (via
// frontFieldIndex/backFieldIndex/promptFieldIndex/... -- responsabilidade
// do motor, não do editor).
function createFieldState(overrides){
  const o = overrides || {};
  return {
    id: (typeof o.id === 'string' && o.id) ? o.id : generateFieldId(),
    lang: o.lang || null,
    role: o.role || null,
    content: normalizeFieldContent(o.content),
    // audio/image: {url, source} | {source:'tts', enabled:true} | null --
    // passados através sem transformação, mesmo shape que
    // buildNativeRuntimeFields() já espera. Upload/TTS de verdade são
    // fora do escopo desta subfase (ver instrução 5/12 do pedido) -- este
    // construtor só garante que a PROPRIEDADE existe no Field certo,
    // nunca em note.audio/note.image/card.audio/card.image.
    audio: o.audio || null,
    image: o.image || null,
    pinyinFieldId: (typeof o.pinyinFieldId === 'string' && o.pinyinFieldId) ? o.pinyinFieldId : null,
  };
}

// ---------- Note editor state (native) ----------

// Estado NATIVO do editor pra um Note -- o que precisa existir pra
// interpretNativeNoteFromRow() gerar CardInstances de verdade quando a
// 6D.6 (persistência) existir. `noteId`/`revision`/`languageAppKey`/
// `origin` são identidade/proveniência (nunca fazem parte da COMPARAÇÃO
// de conteúdo -- ver noteEditorStateContentForComparison abaixo, senão a
// própria revision incrementando invalidaria a comparação que decide se
// ela deveria incrementar). `privateNote` é a nota privada da professora
// (coluna `note` legada, nunca mostrada ao aluno) -- mora aqui, não em
// nenhum Field, porque não pertence ao conteúdo pedagógico do cartão.
function createNativeNoteEditorState(overrides){
  const o = overrides || {};
  const mode = o.cardGenerationMode || 'normal';
  if (typeof CARD_GENERATION_MODES !== 'undefined' && !CARD_GENERATION_MODES.includes(mode)){
    throw new Error(`createNativeNoteEditorState: cardGenerationMode desconhecido: "${mode}".`);
  }
  return {
    kind: 'native',
    noteId: o.noteId != null ? o.noteId : null, // null = cartão ainda não existe no banco
    revision: o.revision || 0,
    languageAppKey: o.languageAppKey || null,
    origin: o.origin || null, // 'teacher' | 'self' -- proveniência (qual tabela), não parte do modelo Note/Field em si
    privateNote: o.privateNote || null,
    cardGenerationMode: mode,
    fields: (o.fields || []).map(f => createFieldState(f)),
  };
}

// Constrói o estado native a partir de uma linha JÁ nativa (fields +
// card_generation_mode presentes e pareados) -- ids de Field preservados
// EXATAMENTE como persistidos (createFieldState só gera um id novo
// quando `f.id` está ausente/vazio -- nunca é o caso aqui). Reaproveita
// validateNativeNoteRow() do motor pra rejeitar dado corrompido com o
// MESMO critério que interpretNoteFromRow() usaria -- nunca reimplementa
// a checagem aqui.
function createNativeNoteEditorStateFromRow(row){
  if (typeof isNoteFieldsPresent === 'function' && typeof isCardGenerationModePresent === 'function'){
    if (!isNoteFieldsPresent(row) || !isCardGenerationModePresent(row)){
      throw new Error('createNativeNoteEditorStateFromRow() exige uma linha nativa (fields + card_generation_mode presentes e pareados).');
    }
  }
  if (typeof validateNativeNoteRow === 'function'){
    const v = validateNativeNoteRow(row);
    if (!v.ok) throw new Error(`createNativeNoteEditorStateFromRow(): ${v.error}`);
  }
  return createNativeNoteEditorState({
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key || null,
    origin: row.origin || null,
    privateNote: row.note || null,
    cardGenerationMode: row.card_generation_mode,
    fields: row.fields,
  });
}

// ---------- Note editor state (legacy) ----------

// Embrulha uma linha LEGADA (front/back_trans/cloze_sentence/etc., sem
// fields/card_generation_mode) sem convertê-la -- decisão travada nesta
// fase: abrir um cartão legado NUNCA muda nada sozinho, só olhar (e
// cancelar) nunca grava nada. `legacyRow` guarda uma CÓPIA das 10 colunas
// legadas relevantes (nunca a linha inteira -- id/teacher_id/student_id/
// created_at/status não são "conteúdo do editor", continuam vivendo na
// linha real do banco, geridos por fora deste estado). A conversão de
// verdade pra native (quando uma edição efetivamente precisar do modelo
// novo) é trabalho da Fase 6D.8, não deste construtor.
function createLegacyNoteEditorStateFromRow(row){
  return {
    kind: 'legacy',
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key || null,
    origin: row.origin || null,
    legacyRow: {
      front: row.front != null ? row.front : null,
      front_pinyin: row.front_pinyin != null ? row.front_pinyin : null,
      back_trans: row.back_trans != null ? row.back_trans : null,
      front_is_target_language: row.front_is_target_language !== false,
      note: row.note != null ? row.note : null,
      image_url: row.image_url != null ? row.image_url : null,
      audio_url: row.audio_url != null ? row.audio_url : null,
      choices: Array.isArray(row.choices) ? row.choices.slice() : null,
      cloze_sentence: row.cloze_sentence != null ? row.cloze_sentence : null,
      cloze_answer: row.cloze_answer != null ? row.cloze_answer : null,
      cloze_answer_pinyin: row.cloze_answer_pinyin != null ? row.cloze_answer_pinyin : null,
    },
  };
}

// Dispatcher único -- mesmo critério de pareamento que o motor usa
// (interpretNoteFromRow, shared/flashcard-model.js) pra decidir qual dos
// dois ramos gerar. Ponto de entrada que uma tela de edição real (Fase
// 6D.8+) vai chamar, sem precisar saber de antemão se a linha é nativa
// ou legada.
function createNoteEditorStateFromRow(row){
  const native = typeof isNoteFieldsPresent === 'function' && typeof isCardGenerationModePresent === 'function'
    ? (isNoteFieldsPresent(row) && isCardGenerationModePresent(row))
    : (row.fields != null && row.card_generation_mode != null);
  return native ? createNativeNoteEditorStateFromRow(row) : createLegacyNoteEditorStateFromRow(row);
}

function isNativeNoteEditorState(state){
  return !!state && state.kind === 'native';
}
function isLegacyNoteEditorState(state){
  return !!state && state.kind === 'legacy';
}

// ---------- Estado de UI efêmero (balde #3) ----------

// Reservado pras subfases 6D.2+ (seleção de Card Type, campo com foco,
// seleção de texto pro Cloze, popover de marca aberto etc.) --
// deliberadamente mínimo aqui, NUNCA implementado como parte do Note
// editor state acima: é um objeto TOTALMENTE SEPARADO, nunca mesclado
// nele. É essa separação ESTRUTURAL (não uma convenção de "não olhar
// esses campos ao comparar") que garante que mudar seleção/foco nunca
// afeta noteEditorStateChanged()/...RequiresNewRevision() -- os dois
// objetos não têm nenhuma referência cruzada.
function createEditorUiState(overrides){
  const o = overrides || {};
  return {
    selectedFieldId: o.selectedFieldId || null,
    focusedFieldId: o.focusedFieldId || null,
  };
}

// ---------- Clonagem / snapshot / comparação ----------

// Clone profundo -- via round-trip JSON, seguro porque todo Note editor
// state (native OU legacy) é dado 100% plano (nunca funções/referências
// de DOM). Preserva noteId/revision/ids de Field exatamente -- nunca
// regenera nada.
function cloneNoteEditorState(state){
  return JSON.parse(JSON.stringify(state));
}

// Recorte SÓ do que conta como "conteúdo" pra fins de comparação --
// exclui `noteId`/`revision`/`origin` de propósito: são identidade/
// versão/proveniência, não conteúdo. Comparar incluindo `revision`
// tornaria a comparação circular (o valor que estamos decidindo se deve
// incrementar já estaria dentro do que compara pra decidir isso).
function noteEditorStateContentForComparison(state){
  if (isNativeNoteEditorState(state)){
    return {
      kind: 'native',
      languageAppKey: state.languageAppKey,
      privateNote: state.privateNote,
      cardGenerationMode: state.cardGenerationMode,
      fields: state.fields.map(f => ({
        id: f.id,
        lang: f.lang,
        role: f.role,
        content: { value: f.content.value },
        audio: f.audio,
        image: f.image,
        pinyinFieldId: f.pinyinFieldId,
      })),
    };
  }
  return {
    kind: 'legacy',
    languageAppKey: state.languageAppKey,
    legacyRow: state.legacyRow,
  };
}

// Snapshot estável (string) do CONTEÚDO -- nunca por referência de
// objeto JS (dois estados com o mesmo conteúdo mas objetos/arrays
// diferentes devem comparar iguais). `createFieldState`/
// `createNativeNoteEditorState` sempre constroem as propriedades na
// MESMA ordem sintática, então `JSON.stringify` produz a mesma string
// pra conteúdo equivalente independente de como o chamador passou os
// dados -- não precisa de um deep-equal customizado.
function snapshotNoteEditorState(state){
  return JSON.stringify(noteEditorStateContentForComparison(state));
}

function noteEditorStatesEqual(stateA, stateB){
  return snapshotNoteEditorState(stateA) === snapshotNoteEditorState(stateB);
}

function noteEditorStateChanged(originalState, currentState){
  return !noteEditorStatesEqual(originalState, currentState);
}

// Decisão 4 (ver CLAUDE.md, travada pela autora) -- hoje é EXATAMENTE
// `noteEditorStateChanged()`, exposta com nome próprio pra o call site
// futuro (6D.6, incremento de `revision` no submit) já poder chamar a
// função "certa" sem precisar saber que as duas são idênticas agora.
// Quando uma taxonomia mais fina existir (ex: só nota privada mudou =
// não reseta progresso), só esta função muda -- nenhum outro ponto do
// editor precisa ser tocado.
function noteEditorStateRequiresNewRevision(originalState, currentState){
  return noteEditorStateChanged(originalState, currentState);
}

// ---------- Preparação pra 6D.6 (persistência) / 6D.7 (Preview) ----------

// Transform de dado PURO -- nenhuma chamada de rede, nenhum
// INSERT/UPDATE. Devolve o shape de linha que interpretNoteFromRow()/
// buildEngineCardsFromRow() (shared/flashcard-model.js) já sabem
// interpretar, pra um estado native poder ser testado contra o motor
// REAL sem precisar salvar primeiro (Preview, 6D.7) ou pra servir de
// base ao INSERT/UPDATE de verdade quando a 6D.6 existir. Só se aplica a
// estado NATIVE -- um estado legacy grava pelas colunas antigas
// (createFlashcard()/createOwnFlashcard(), shared/teacher-flashcards.js/
// shared/own-flashcards.js), nunca por aqui.
function noteEditorStateToRow(state, extra){
  if (!isNativeNoteEditorState(state)){
    throw new Error('noteEditorStateToRow() só se aplica a estado native -- estado legacy usa createFlashcard()/createOwnFlashcard() (colunas legadas), não este transform.');
  }
  return Object.assign({
    id: state.noteId,
    revision: state.revision,
    language_app_key: state.languageAppKey,
    origin: state.origin,
    note: state.privateNote,
    fields: state.fields.map(f => ({
      id: f.id,
      lang: f.lang,
      role: f.role,
      content: { value: f.content.value },
      audio: f.audio,
      image: f.image,
      pinyinFieldId: f.pinyinFieldId,
    })),
    card_generation_mode: state.cardGenerationMode,
  }, extra || {});
}
