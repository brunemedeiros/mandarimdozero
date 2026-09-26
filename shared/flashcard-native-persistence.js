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
//   - shared/flashcard-model.js (validateNativeNoteRow, contentFieldIndices,
//     isNoteFieldsPresent, isCardGenerationModePresent, STUDY_LANG_FOR_APP_KEY,
//     isStudyLanguageField -- Fase 6D.8, ver abaixo)
//   - shared/flashcard-mc-editor.js       (validateNativeMultipleChoiceStructure)
//   - shared/flashcard-typeanswer-editor.js (validateNativeTypeAnswerStructure)
//   - shared/flashcard-cloze-editor.js    (validateNativeClozeStructure)

// ---------- Fase 6D.8 -- classificação do modelo de uma linha (Seção 15) ----------
//
// Nome explícito pro padrão que já era usado implicitamente em 4 pontos
// (shared/admin-flashcards.js/shared/my-flashcards.js: decidir se um
// cartão já carregado é nativo, legado, ou um estado híbrido nunca
// esperado). O CHECK constraint da migration 045 (fields/card_generation_mode
// sempre pareados) já torna 'invalid' estruturalmente impossível numa linha
// real vinda do Supabase -- mas esta função existe mesmo assim como ponto
// único, auditável, de checagem defensiva no cliente (Seção 15 pede
// explicitamente que o front-end NUNCA aceite silenciosamente um estado
// híbrido como se fosse nativo válido) -- nunca reimplementa
// validateNativeNoteRow(), só decide qual dos 3 buckets uma linha cai antes
// de qualquer decisão de UI (mostrar form legado vs. nativo).
function classifyFlashcardRowModel(row){
  const hasFields = isNoteFieldsPresent(row);
  const hasMode = isCardGenerationModePresent(row);
  if (hasFields && hasMode) return 'native';
  if (!hasFields && !hasMode) return 'legacy';
  return 'invalid';
}

// ---------- Fase 6D.8 -- preflight de conversão (Seção 6/8/18) ----------
//
// Chamado ANTES de nativeNoteEditorStateFromLegacyRow(), só pra bloquear os
// 2 casos em que o MAPEAMENTO em si é genuinamente indeterminável -- nunca
// pra exigir conteúdo completo (isso já é responsabilidade de
// validateNoteEditorStateForSave(), rodada dentro do editor nativo depois
// da conversão, com a MESMA disciplina de "a UI pode apresentar os dados
// existentes pra correção manual" que a Seção 18 já autoriza). A distinção
// importa: um cartão MC sem 3ª opção errada, ou um Cloze sem tradução
// ainda, são casos de CONTEÚDO INCOMPLETO -- convertem normalmente, o
// usuário vê os campos já preenchidos e corrige o que falta antes de
// salvar. Os 2 casos abaixo são diferentes: não há ONDE colocar a
// informação, então converter de qualquer jeito produziria uma Nota nativa
// que PARECE válida mas está errada (exatamente o que a Seção 18 proíbe).
//
// 1. Cloze sem exatamente 1 "___" na frase -- sem isso, não dá pra saber
//    ONDE a lacuna fica. Achado real (não hipotético): o código de
//    conversão antigo usava `sentence.replace('___', markup)`, que
//    SILENCIOSAMENTE não faz nada se "___" não existir -- o Field
//    resultante teria a frase crua, zero marcas {{cN::...}}, e só seria
//    pego por acaso pela validação genérica "pelo menos 1 marca" (mensagem
//    que não explica a causa real: a frase nunca teve onde marcar).
// 2. Múltipla escolha sem resposta certa (back_trans vazio) -- o schema
//    legado é inequívoco sobre QUEM é a resposta certa (sempre back_trans,
//    nunca ambíguo entre choices[]), mas se essa coluna estiver vazia não
//    há nenhuma resposta certa pra promover a `role:'answer'` -- bloquear
//    em vez de criar um Field de resposta vazio que passaria despercebido
//    até o clique em Salvar.
function legacyFlashcardConversionPreflight(row){
  const isCloze = !!row.cloze_sentence;
  if (isCloze){
    const blankMatches = (row.cloze_sentence.match(/___/g) || []).length;
    if (blankMatches !== 1){
      return { ok: false, error: blankMatches === 0
        ? 'Esta frase de completar não tem nenhum "___" marcando a lacuna -- não dá pra saber onde a resposta entra. Corrija a frase pelo formulário de sempre antes de usar o editor novo.'
        : 'Esta frase de completar tem mais de um "___" -- o formulário legado só suporta 1 lacuna por cartão, então não dá pra determinar automaticamente qual delas vira a marca nativa. Corrija a frase pelo formulário de sempre antes de usar o editor novo.' };
    }
    return { ok: true };
  }
  const isMC = !!(row.choices && row.choices.length);
  if (isMC && !(row.back_trans || '').trim()){
    return { ok: false, error: 'Este cartão de múltipla escolha não tem uma resposta certa definida (verso vazio) -- não dá pra determinar qual é a resposta certa. Preencha o verso pelo formulário de sempre antes de usar o editor novo.' };
  }
  return { ok: true };
}

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
// Fase 6D.8 (Seção 4/9/10) -- anexa audio_url/image_url legados ao Field
// certo, na MESMA heurística que interpretNoteFromRow() (motor, ramo
// legado) já usa pra interpretar esse dado histórico: o campo cujo `lang`
// é o idioma ESTUDADO (isStudyLanguageField). Nunca inventa um lado --
// se `targetField` não existir (nunca deveria acontecer, os 2 branches
// abaixo sempre montam um Field de idioma estudado antes de chamar isto),
// simplesmente não anexa nada, sem lançar erro.
//
// Ressalva IMPORTANTE sobre imagem (documentada aqui, não escondida): o
// pipeline de LEITURA nativo (resolveCardField()/buildEngineCardsFromRow(),
// shared/flashcard-model.js) só resolve imagem no nível da NOTE
// (note.image), nunca a partir de field.image -- gap arquitetural já
// identificado na auditoria da Fase 6D ("Fase 6D -- EDITOR: auditoria",
// seção 6) e explicitamente fora do escopo desta fase (Seção 26 proíbe
// estender resolveCardField()/renderers aqui). Por isso: field.image É
// preenchido (a URL nunca é descartada -- fica visível no indicador
// textual do Field editor, Fase 6D.3, e pronta pra quando um projeto
// futuro estender o pipeline de leitura), mas a imagem NÃO vai aparecer
// de fato na tela de Revisão depois da conversão até essa extensão
// existir -- limitação conhecida, não um bug desta fase, sinalizada de
// volta pro usuário no próprio fluxo de conversão (ver Seção 27/relatório).
function attachLegacyMediaToFields(fields, row, languageAppKey){
  const targetField = fields.find(f => isStudyLanguageField(f, languageAppKey));
  if (!targetField) return;
  // Fase 7b (ver CLAUDE.md) -- discriminador canônico de Field.audio é
  // `type`, não `source` (ver shared/flashcard-model.js) -- nada em
  // produção jamais leu `.source`, então esta troca não tem efeito
  // funcional sobre dado já persistido (resolveFieldAudioUrl() só olha
  // `.url`), só alinha toda escrita nova ao contrato único.
  if (row.audio_url) targetField.audio = { url: row.audio_url, type: 'upload' };
  if (row.image_url) targetField.image = { url: row.image_url };
}

function nativeNoteEditorStateFromLegacyRow(row){
  const isCloze = !!row.cloze_sentence;
  const isMC = !isCloze && !!(row.choices && row.choices.length);
  const isZh = row.language_app_key === 'mandarim';
  const studyLang = STUDY_LANG_FOR_APP_KEY[row.language_app_key] || null;
  const base = {
    noteId: row.id,
    revision: row.revision || 0,
    languageAppKey: row.language_app_key,
    origin: row.origin || null,
    privateNote: row.note || null,
  };

  if (isMC){
    // Seção 6 -- legado nunca é ambíguo sobre quem é a resposta certa
    // (sempre back_trans, nunca choices[]) -- mapeamento 1:1 direto, sem
    // adivinhação. front_is_target_language decide só o IDIOMA de cada
    // Field (nunca a posição/papel -- prompt continua sempre o Field do
    // "front" legado, answer sempre o de "back_trans"), mesma leitura já
    // usada pelo branch normal abaixo e pelo motor legado
    // (shared/flashcard-model.js:497-511) -- nunca vira um mecanismo de
    // direção nativo (Seção 4/5): depois de convertido, os 2 Fields só
    // têm `lang`, nunca um flag de direção salvo.
    const frontIsTarget = row.front_is_target_language !== false;
    const promptLang = isZh ? 'zh' : (frontIsTarget ? studyLang : 'pt-BR');
    const answerLang = isZh ? 'pt-BR' : (frontIsTarget ? 'pt-BR' : studyLang);
    const promptField = createFieldState({ role: 'prompt', lang: promptLang, content: { value: row.front || '' } });
    const answerField = createFieldState({ role: 'answer', lang: answerLang, content: { value: row.back_trans || '' } });
    const distractorFields = (row.choices || []).slice(0, 3).map(c => createFieldState({ role: 'distractor', content: { value: c || '' } }));
    const fields = [promptField, answerField].concat(distractorFields);
    // Seção 6 -- ZH também preserva pinyin do prompt (front_pinyin já era
    // um campo genérico, mostrado pro modo MC no formulário legado --
    // conferido em shared/admin-flashcards.js antes de escrever isto,
    // nunca presumido). Field satélite, nunca conta como 4ª opção.
    if (isZh && row.front_pinyin){
      const pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: row.front_pinyin } });
      promptField.pinyinFieldId = pinyinField.id;
      fields.splice(1, 0, pinyinField);
    }
    attachLegacyMediaToFields(fields, row, row.language_app_key);
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'multiple_choice',
      fields,
    }));
  }

  if (isCloze){
    // legacyFlashcardConversionPreflight() já garantiu, ANTES desta função
    // ser chamada, que cloze_sentence tem EXATAMENTE 1 "___" -- o
    // `.replace()` abaixo nunca mais é um no-op silencioso (Seção 6/18).
    const pinyinSuffix = (isZh && row.cloze_answer_pinyin) ? `|${row.cloze_answer_pinyin}` : '';
    const markedSentence = row.cloze_sentence.replace('___', `{{c1::${row.cloze_answer || ''}${pinyinSuffix}}}`);
    const textField = createFieldState({ lang: isZh ? 'zh' : studyLang, content: { value: markedSentence } });
    const translationField = createFieldState({ lang: 'pt-BR', content: { value: row.back_trans || '' } });
    const fields = [textField, translationField];
    attachLegacyMediaToFields(fields, row, row.language_app_key);
    return createNativeNoteEditorState(Object.assign({}, base, {
      cardGenerationMode: 'cloze',
      fields,
    }));
  }

  // normal -- caso mais comum. Preserva o par hanzi/pinyin como 2 Fields
  // relacionados (frontField.pinyinFieldId -> pinyinField.id) quando o
  // cartão legado é de mandarim e tem front_pinyin -- mesmo shape que
  // contentFieldIndices() já sabe pular (o Field de pinyin nunca conta
  // como um 3º slot de conteúdo). fr/pt: front_is_target_language decide
  // qual dos 2 Fields é o idioma estudado -- interpretado só AQUI, na
  // conversão (Seção 4/5), nunca persistido como mecanismo nativo: depois
  // de convertido, a direção do cartão vem só de `lang`/posição de cada
  // Field, igual a qualquer outro cartão nativo criado do zero pelo
  // editor -- mesma leitura exata do motor legado
  // (shared/flashcard-model.js:497-511), nunca reinventada aqui.
  let frontField, backField;
  if (isZh){
    frontField = createFieldState({ lang: 'zh', content: { value: row.front || '' } });
    backField = createFieldState({ lang: 'pt-BR', content: { value: row.back_trans || '' } });
  } else {
    const frontIsTarget = row.front_is_target_language !== false;
    frontField = createFieldState({ lang: frontIsTarget ? studyLang : 'pt-BR', content: { value: row.front || '' } });
    backField = createFieldState({ lang: frontIsTarget ? 'pt-BR' : studyLang, content: { value: row.back_trans || '' } });
  }
  let pinyinField = null;
  if (isZh && row.front_pinyin){
    pinyinField = createFieldState({ lang: 'zh-pinyin', content: { value: row.front_pinyin } });
    frontField.pinyinFieldId = pinyinField.id;
  }
  const fields = pinyinField ? [frontField, pinyinField, backField] : [frontField, backField];
  attachLegacyMediaToFields(fields, row, row.language_app_key);
  return createNativeNoteEditorState(Object.assign({}, base, {
    cardGenerationMode: 'normal',
    fields,
  }));
}
