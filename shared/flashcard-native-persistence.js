// ---------- Persistência nativa do editor -- Fase 6D.6 da reestruturação
// Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Único arquivo que liga Editor State (6D.1-6D.5) -> validação ->
// Supabase. Nenhum outro ponto do editor monta `fields`/`card_generation_mode`
// à mão -- shared/teacher-flashcards.js/shared/own-flashcards.js só
// recebem o payload já pronto por este arquivo
// (nativeContentColumnsFromEditorState) e fazem o MESMO INSERT/UPDATE de
// sempre, com as colunas nativas misturadas no MESMO objeto que já grava
// teacher_id/student_id/owner_id/language_app_key/status -- atomicidade
// vem de ser 1 ÚNICA chamada supabase-js (1 statement SQL), nunca 2
// chamadas separadas pra fields e card_generation_mode (Seção 12).
//
// LEGACY ABERTO != AUTOMATICAMENTE MIGRADO (regra central desta fase,
// Seção 6) -- nada neste arquivo é chamado sozinho. Um cartão legado só
// vira nativo quando shared/admin-flashcards.js/shared/my-flashcards.js
// decidem explicitamente chamar nativeNoteEditorStateFromLegacyRow() (ação
// do usuário -- "Usar o novo editor de campos") E o usuário confirma
// salvando o formulário nativo resultante. Ler+cancelar nunca grava nada.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- depois de
// shared/flashcard-cloze-editor.js, antes de shared/teacher-flashcards.js):
//   - shared/flashcard-editor-state.js (noteEditorStateToRow,
//     isNativeNoteEditorState, createNativeNoteEditorState, createFieldState)
//   - shared/flashcard-model.js (validateNativeNoteRow, contentFieldIndices)
//   - shared/flashcard-mc-editor.js       (validateNativeMultipleChoiceStructure)
//   - shared/flashcard-typeanswer-editor.js (validateNativeTypeAnswerStructure)
//   - shared/flashcard-cloze-editor.js    (validateNativeClozeStructure)

// ---------- Validação central (dispatcher único, reutilizado por
// shared/admin-flashcards.js e shared/my-flashcards.js, e pelos testes) ----------
//
// Reaproveita, sem duplicar, os validadores já construídos por Card Type
// nas Fases 6D.4a/6D.4b/6D.5 -- este arquivo NUNCA reimplementa a lógica
// de cardinalidade/estrutura, só decide qual validador chamar.
// normal/normal_reversed nunca ganharam validador próprio em nenhuma fase
// anterior (nunca precisaram -- 6D.2/6D.3 só editam Fields soltos, sem
// exigir conteúdo preenchido pra "testar livremente") -- validados aqui
// direto, com a MESMA disciplina das outras 3: validateNativeNoteRow
// estrutural (via noteEditorStateToRow, o mesmo transform usado pra
// persistir) + checagem de conteúdo não-vazio que a engine nunca fez.
function validateNoteEditorStateForSave(editorState){
  if (!isNativeNoteEditorState(editorState)){
    return { ok: false, error: 'Estado não é nativo -- nada a validar aqui.' };
  }
  const mode = editorState.cardGenerationMode;
  if (mode === 'multiple_choice') return validateNativeMultipleChoiceStructure(editorState);
  if (mode === 'type_answer') return validateNativeTypeAnswerStructure(editorState);
  if (mode === 'cloze') return validateNativeClozeStructure(editorState);
  if (mode === 'normal' || mode === 'normal_reversed'){
    const row = noteEditorStateToRow(editorState);
    const structural = validateNativeNoteRow(row);
    if (!structural.ok) return structural;
    const slots = contentFieldIndices(editorState.fields || []);
    const isEmptyField = (f) => !f || !((f.content && f.content.value) || '').trim();
    if (isEmptyField(editorState.fields[slots[0]]) || isEmptyField(editorState.fields[slots[1]])){
      return { ok: false, error: 'Os dois campos de conteúdo (frente/verso) precisam ter texto.' };
    }
    return { ok: true };
  }
  return { ok: false, error: `Card Type desconhecido: "${mode}".` };
}

// ---------- Mirror legado (write-only, nunca lido de volta) ----------
//
// `back_trans` continua `not null` em teacher_flashcards/own_flashcards
// (nunca relaxado -- 6D.6 não altera schema, Seção 28/migration 026) --
// alguma coisa PRECISA ocupar essa coluna pra um INSERT nativo passar.
// `front` é mirrorado por consistência de leitura na lista "Cartões
// ativos" (flashcardCardRowHTML, shared/admin-flashcards.js) e no export
// Anki, que continuam lendo a linha crua sem nenhuma mudança nesta fase
// (Seção 26 -- não tocar legado desnecessariamente).
//
// NUNCA um segundo caminho de LEITURA de conteúdo: interpretNoteFromRow()
// (shared/flashcard-model.js) checa fields/card_generation_mode ANTES de
// qualquer lógica legada e nunca cai no ramo que lê front/back_trans/
// choices/cloze_sentence quando fields está presente (confirmado por
// leitura do motor antes de escrever este arquivo) -- este mirror é
// genuinamente write-only/decorativo pro motor, só serve às telas que
// ainda leem a linha crua (lista do admin), nunca é usado por
// resolveCardContentView()/renderReviewView() pra um cartão nativo.
function deriveLegacyMirrorFromNoteEditorState(editorState){
  const fields = editorState.fields || [];
  const mode = editorState.cardGenerationMode;
  const textOf = (f) => (f && f.content && f.content.value) ? f.content.value.trim() : '';
  if (mode === 'multiple_choice'){
    const prompt = fields.find(f => f.role === 'prompt');
    const answer = fields.find(f => f.role === 'answer');
    return { front: textOf(prompt) || null, back_trans: textOf(answer) || '(múltipla escolha)' };
  }
  const slots = contentFieldIndices(fields);
  if (mode === 'cloze'){
    // slots[0] carrega a sintaxe {{cN::...}} -- front fica vazio (mesmo
    // convênio do cloze legado, que nunca exibe front em nenhuma tela de
    // revisão); back_trans mostra a tradução (slots[1]), mesmo papel que
    // já tinha no cloze legado (texto revelado depois de responder).
    return { front: null, back_trans: textOf(fields[slots[1]]) || '(completar a frase)' };
  }
  // normal/normal_reversed/type_answer -- par posicional direto.
  return {
    front: textOf(fields[slots[0]]) || null,
    back_trans: textOf(fields[slots[1]]) || '(sem tradução)',
  };
}

// Colunas de CONTEÚDO nativo -- nunca inclui identidade (teacher_id/
// student_id/owner_id/language_app_key/status), que cada chamador decide
// por fora (a professora pode escolher vários alunos com idiomas
// diferentes; a aluna sempre usa APP_KEY -- não é responsabilidade deste
// módulo, que só sabe de Note/Field). Chamado só DEPOIS de
// validateNoteEditorStateForSave() já ter confirmado `ok:true` -- este
// transform nunca valida nada sozinho.
function nativeContentColumnsFromEditorState(editorState){
  const row = noteEditorStateToRow(editorState);
  const mirror = deriveLegacyMirrorFromNoteEditorState(editorState);
  return {
    fields: row.fields,
    card_generation_mode: row.card_generation_mode,
    note: row.note,
    front: mirror.front,
    back_trans: mirror.back_trans,
    // Colunas legadas explicitamente NUNCA usadas pelo caminho nativo --
    // gravadas como null pra nunca ficarem com lixo de uma edição legada
    // anterior (ex: converter um cartão que já foi múltipla escolha
    // legada pro editor novo não pode deixar `choices` velho por trás --
    // um fantasma que interpretNoteFromRow() ignora, mas que confundiria
    // quem olhasse a linha crua/exportasse os dados).
    front_pinyin: null,
    choices: null,
    cloze_sentence: null,
    cloze_answer: null,
    cloze_answer_pinyin: null,
    front_is_target_language: true,
    // image_url/audio_url NÃO tocados aqui (chave ausente) -- Seção 15:
    // mídia nativa vive só em field.audio/field.image, e o caminho
    // nativo do motor (interpretNativeNoteFromRow) nunca lê image_url/
    // audio_url da linha (note.image é sempre null no ramo nativo,
    // confirmado por leitura antes de escrever este arquivo) -- gravar/
    // zerar essas 2 colunas não teria nenhum efeito funcional pro
    // cartão nativo, então este objeto nem as menciona (o chamador só
    // sobrescreve uma coluna quando ela está explicitamente presente no
    // patch, mesmo padrão defensivo já usado por updateFlashcardContent/
    // updateOwnFlashcardContent pra imageUrl/audioUrl === undefined).
  };
}

// ---------- Legacy -> Native (conversão explícita, nunca automática) ----------
//
// Seção 7/21 (ver CLAUDE.md) -- quando a professora/aluna pede
// EXPLICITAMENTE pra editar um cartão LEGADO com o editor novo, o
// conteúdo já existente é preservado -- nunca uma tela em branco forçando
// redigitar tudo. Mesma leitura de shape que interpretNoteFromRow() já
// faz no ramo legado (shared/flashcard-model.js) pra decidir qual Card
// Type um cartão legado representa -- só que aqui constrói um EDITOR
// STATE (pra revisão/edição antes de salvar), nunca grava nada sozinho:
// é chamada só quando o usuário clica em "Usar o novo editor de campos",
// e o resultado só vira linha real no banco se ele confirmar clicando
// Salvar no formulário nativo que aparece em seguida.
function nativeNoteEditorStateFromLegacyRow(row){
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const base = {
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key,
    origin: row.origin || null,
    privateNote: row.note || null,
  };

  if (isMC){
    const promptField = createFieldState({ role: 'prompt', content: { value: row.front || '' } });
    const answerField = createFieldState({ role: 'answer', content: { value: row.back_trans || '' } });
    const distractorFields = (row.choices || []).slice(0, 3).map(c => createFieldState({ role: 'distractor', content: { value: c || '' } }));
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'multiple_choice',
      fields: [promptField, answerField].concat(distractorFields),
    }));
  }

  if (isCloze){
    const isZh = row.language_app_key === 'mandarim';
    const pinyinSuffix = (isZh && row.cloze_answer_pinyin) ? `|${row.cloze_answer_pinyin}` : '';
    const markedSentence = (row.cloze_sentence || '').replace('___', `{{c1::${row.cloze_answer || ''}${pinyinSuffix}}}`);
    const textField = createFieldState({ content: { value: markedSentence } });
    const translationField = createFieldState({ content: { value: row.back_trans || '' } });
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'cloze',
      fields: [textField, translationField],
    }));
  }

  // normal -- caso mais comum. Preserva o par hanzi/pinyin como 2 Fields
  // relacionados (frontField.pinyinFieldId -> pinyinField.id) quando o
  // cartão legado é de mandarim e tem front_pinyin -- mesmo shape que
  // contentFieldIndices() já sabe pular (o Field de pinyin nunca conta
  // como um 3º slot de conteúdo).
  const isZh = row.language_app_key === 'mandarim';
  const frontField = createFieldState({ lang: isZh ? 'zh' : null, content: { value: row.front || '' } });
  let pinyinField = null;
  if (isZh && row.front_pinyin){
    pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: row.front_pinyin } });
    frontField.pinyinFieldId = pinyinField.id;
  }
  const backField = createFieldState({ content: { value: row.back_trans || '' } });
  const fields = pinyinField ? [frontField, pinyinField, backField] : [frontField, backField];
  return createNativeNoteEditorState(Object.assign({}, base, {
    cardGenerationMode: 'normal',
    fields,
  }));
}
