// ---------- Editor nativo de Type Answer ("Digite a resposta") -- Fase
// 6D.4b da reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Type Answer, construída EM CIMA do Field
// editor genérico da Fase 6D.3 (shared/flashcard-field-editor.js) -- nunca
// reimplementa edição de conteúdo/idioma de Field, só organiza os Fields de
// um Note `type_answer` em 2 grupos semânticos (Pergunta/Resposta esperada)
// e oferece as ações estruturais próprias desse Card Type (criar prompt/
// answer quando ainda não existem).
//
// Mesmo padrão arquitetural da Fase 6D.4a (Multiple Choice,
// shared/flashcard-mc-editor.js) -- reutilizado deliberadamente, não
// reinventado. Diferenças reais em relação a Multiple Choice:
//   - Só 2 roles (`prompt`/`answer`), nunca distractors -- Type Answer é
//     estruturalmente idêntico a `normal` (2 slots de conteúdo), só que o
//     Card Type muda como a aluna responde (digita, em vez de virar o
//     cartão). Por isso `role` aqui é METADADO informativo pro editor --
//     o motor (shared/flashcard-model.js) gera o CardInstance de Type
//     Answer de forma POSICIONAL (promptFieldIndex/answerFieldIndex vêm de
//     contentFieldIndices/slots, o MESMO mecanismo de `normal`), nunca
//     consultando `field.role` pra esse Card Type -- confirmado por
//     leitura do motor antes de codar esta subfase (interpretNativeNoteFromRow,
//     ramo `type_answer`). Marcar os 2 Fields com role:'prompt'/'answer'
//     nesta camada de EDITOR é seguro e não-destrutivo -- não muda em nada
//     como o motor gera o CardInstance (que continua olhando só a posição/
//     índice dos Fields de conteúdo), só dá ao editor um jeito estável de
//     saber "qual Field já é a pergunta, qual já é a resposta" entre
//     re-renders, exatamente como a Fase 6B já trava: "role é apenas
//     semântico; nunca determina direção". Nenhuma mudança foi feita no
//     motor por causa disso -- ver nota de arquitetura no relatório da
//     Fase 6D.4b em CLAUDE.md.
//   - Sem distractors/promote -- não existe 3º papel pra promover, então
//     não há necessidade de nenhuma UX de reatribuição (restrição 4 da
//     6D.4b: "não invente uma nova UX complexa").
//   - Suporte a Field satélite de pinyin (pinyinFieldId) associado ao Field
//     de resposta, pro caso chinês (restrição 5) -- a Fase 6D.3 já decidiu
//     não construir UI de ATRIBUIR pinyin ainda (só preservar o que já
//     existe, reconstruído de uma linha nativa real via
//     createNativeNoteEditorStateFromRow) -- esta subfase segue a mesma
//     decisão: mostra o Field satélite se ele já existir no estado, nunca
//     conta ele como um 3º prompt/answer, mas não introduz um botão novo
//     de "associar pinyin" (fora de escopo, mesmo critério já usado pela
//     6D.3).
//
// Substitui conceitualmente os campos flat legados `front`/`back_trans`/
// `front_pinyin` quando usados no papel de "type answer" -- não existe
// NENHUMA estrutura paralela (`answer`/`expectedAnswer`/`correctAnswer`/
// `typeAnswerAnswer`/`pinyinAnswer`) aqui: a única fonte de verdade
// continua sendo `editorState.fields` (Field state da 6D.1).
//
// Depende de (mesma posição de shared/flashcard-mc-editor.js -- antes de
// shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-model.js       (validateNativeNoteRow, CARD_GENERATION_MODES)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox)
//   - shared/flashcard-mc-editor.js    (refreshNativeCardTypeBox -- dispatcher
//                                        estendido aqui embaixo com o branch type_answer)
//   - escapeHTML (fr/zh app.js)

// Os 2 roles reconhecidos por Type Answer -- os únicos que este editor
// atribui/exibe. `role` continua sendo metadado semântico puro -- NUNCA
// decide direção (ver nota de arquitetura no topo do arquivo).
const TYPE_ANSWER_ROLES = ['prompt', 'answer'];

// ---------- Validação (reutilizável pela 6D.6) ----------
//
// Mesmo padrão de validateNativeMultipleChoiceStructure (6D.4a): reaproveita,
// sem duplicar, a validação estrutural que o motor já roda antes de gerar
// CardInstances (validateNativeNoteRow, via noteEditorStateToRow -- o MESMO
// transform que a 6D.6 vai usar pra persistir). Checagens A MAIS, que o
// motor não faz (tempo de edição, não geração de CardInstance):
//   - self-reference de pinyinFieldId -- validateNativeNoteRow só confirma
//     que o ID referenciado existe NA NOTE (`ids.includes(f.pinyinFieldId)`),
//     que é verdade também quando um Field aponta pra SI MESMO (seu próprio
//     id também está em `ids`) -- então essa checagem é só nossa.
//   - "todos os roles reconhecidos" (excluindo Fields satélite de pinyin,
//     que nunca precisam de role) -- um Field com role fora de
//     prompt/answer (ou sem role nenhuma) que não seja satélite de pinyin
//     de outro Field é tratado como AMBÍGUO, não silenciosamente ignorado.
//   - exatamente 1 prompt, exatamente 1 answer.
//   - "conteúdo válido" -- pergunta e resposta precisam ter texto não-vazio;
//     a engine nunca validou isso (um Field vazio é estruturalmente válido
//     pra ela).
function validateNativeTypeAnswerStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: 'Este Note não é nativo.' };
  }
  if (editorState.cardGenerationMode !== 'type_answer'){
    return { ok: false, error: 'Este Note não está no modo Digite a resposta.' };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];

  const selfReferencing = fields.filter(f => f.pinyinFieldId != null && f.pinyinFieldId === f.id);
  if (selfReferencing.length){
    return { ok: false, error: 'Um campo não pode apontar pra si mesmo como pinyin.' };
  }

  // Fields satélite de pinyin (apontados por pinyinFieldId de outro Field)
  // nunca contam como prompt/answer/campo sem papel -- são complemento de
  // outro Field, não uma pergunta/resposta adicional.
  const pinyinTargetIds = new Set(fields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const isPinyinSatellite = f => pinyinTargetIds.has(f.id);
  const roledFields = fields.filter(f => !isPinyinSatellite(f));

  const unrecognized = roledFields.filter(f => f.role !== 'prompt' && f.role !== 'answer');
  if (unrecognized.length){
    return { ok: false, error: `Digite a resposta não aceita Field sem papel definido (${unrecognized.length} campo(s) sem prompt/resposta) -- atribua um papel ou remova.` };
  }

  const promptFields = roledFields.filter(f => f.role === 'prompt');
  const answerFields = roledFields.filter(f => f.role === 'answer');
  if (promptFields.length === 0) return { ok: false, error: 'Falta o campo de pergunta.' };
  if (promptFields.length > 1) return { ok: false, error: 'Só pode haver 1 campo de pergunta.' };
  if (answerFields.length === 0) return { ok: false, error: 'Falta o campo de resposta.' };
  if (answerFields.length > 1) return { ok: false, error: 'Só pode haver 1 campo de resposta.' };

  const isEmptyField = f => !(f.content && (f.content.value || '').trim());
  if (isEmptyField(promptFields[0]) || isEmptyField(answerFields[0])){
    return { ok: false, error: 'Pergunta e resposta precisam ter conteúdo.' };
  }

  return { ok: true };
}

// ---------- Transição de outro Card Type pra type_answer ----------
//
// Mesmo padrão de transitionToMultipleChoice (6D.4a): reaproveita, DE FORMA
// DETERMINÍSTICA, os Fields que já existiam (ex: vindos de `normal`) --
// nunca inventa conteúdo novo, nunca copia o mesmo texto pros dois lados só
// pra "tornar o estado válido". Só atribui role a Fields que AINDA NÃO TÊM
// NENHUMA role (nunca sobrescreve um role já definido). Ordem: o primeiro
// Field sem role vira 'prompt' (se ainda não houver nenhum), o segundo vira
// 'answer' (se ainda não houver nenhum) -- espelha a mesma convenção
// posicional que `normal`/o motor já usam (slot 0/slot 1).
//
// Se não sobrar Field suficiente pra virar prompt/answer, a estrutura fica
// EXPLICITAMENTE incompleta (validateNativeTypeAnswerStructure reporta
// isso) até o usuário adicionar via "+ Criar campo de pergunta"/"+ Criar
// campo de resposta".
function transitionToTypeAnswer(editorState){
  editorState.cardGenerationMode = 'type_answer';
  const fields = editorState.fields || [];
  const hasPrompt = fields.some(f => f.role === 'prompt');
  const hasAnswer = fields.some(f => f.role === 'answer');
  const unroled = fields.filter(f => !f.role);
  let cursor = 0;
  if (!hasPrompt && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'prompt' });
    cursor++;
  }
  if (!hasAnswer && unroled[cursor]){
    updateFieldInEditorState(editorState, unroled[cursor].id, { role: 'answer' });
  }
}

// ---------- Ações estruturais ----------
//
// Só criar prompt/answer quando ainda não existem (ver
// renderTypeAnswerEditorHTML: os botões só aparecem quando o Field
// correspondente é falsy). Sem remoção dedicada de prompt/answer -- mesmo
// critério de "não invente uma nova UX complexa" (restrição 4) já aplicado
// por Multiple Choice aos seus próprios prompt/answer (removable:false).
function addTypeAnswerPromptField(editorState){
  return addFieldToEditorState(editorState, { role: 'prompt' });
}
function addTypeAnswerAnswerField(editorState){
  return addFieldToEditorState(editorState, { role: 'answer' });
}

// ---------- Render ----------

function renderTypeAnswerEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'type-answer-editor';
  const fields = editorState.fields || [];
  const pinyinTargetIds = new Set(fields.filter(f => f.pinyinFieldId != null).map(f => f.pinyinFieldId));
  const isPinyinSatellite = f => pinyinTargetIds.has(f.id);

  const promptField = fields.find(f => f.role === 'prompt' && !isPinyinSatellite(f));
  const answerField = fields.find(f => f.role === 'answer' && !isPinyinSatellite(f));
  const satelliteFields = fields.filter(isPinyinSatellite);
  const otherFields = fields.filter(f => f !== promptField && f !== answerField && !isPinyinSatellite(f));
  const validation = validateNativeTypeAnswerStructure(editorState);

  const promptHTML = promptField
    ? renderFieldEditorHTML(promptField, 0, { namePrefix, label: 'Pergunta/Prompt', removable: false })
    : `<p class="profile-edit-hint">Nenhum campo de pergunta ainda.</p><button type="button" class="admin-select-link" data-ta-add-prompt>+ Criar campo de pergunta</button>`;

  const answerHTML = answerField
    ? renderFieldEditorHTML(answerField, 0, { namePrefix, label: 'Resposta esperada', removable: false })
    : `<p class="profile-edit-hint">Nenhum campo de resposta ainda.</p><button type="button" class="admin-select-link" data-ta-add-answer>+ Criar campo de resposta</button>`;

  // Field satélite de pinyin (pinyinFieldId apontando pra outro Field --
  // hoje só chega aqui reconstruído de uma linha nativa já existente, ver
  // comentário de arquitetura no topo -- esta subfase não constrói UI pra
  // ASSOCIAR um novo pinyin, só preserva/exibe o que já existir).
  const satelliteHTML = satelliteFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">Pinyin (satélite de outro campo)</div>
    <p class="profile-edit-hint">Associado a outro campo via pinyinFieldId -- editável normalmente, nunca conta como um 3º campo de pergunta/resposta.</p>
    ${satelliteFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: `Pinyin ${i + 1}`, removable: true })).join('')}
  ` : '';

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">Outros campos (sem papel definido em Digite a resposta)</div>
    <p class="profile-edit-hint">Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os ou atribua um papel pra estrutura ficar válida.</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: `Campo sem papel ${i + 1}`, removable: true })).join('')}
  ` : '';

  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">✓ Estrutura de Digite a resposta completa.</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-type-answer-editor>
      <div class="section-label" style="margin:0 0 4px;">Pergunta/Prompt</div>
      ${promptHTML}
      <div class="section-label" style="margin:14px 0 4px;">Resposta esperada</div>
      ${answerHTML}
      ${satelliteHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ---------- Wiring ----------
//
// `onChange(kind, fieldId)` -- 'content'/'lang' (reaproveitados do Field
// editor genérico, nunca disparam re-render) ou 'structure' (criar prompt/
// answer -- dispara re-render, porque o CONJUNTO de linhas visíveis ou a
// mensagem de validação mudou).
function wireTypeAnswerEditor(container, editorState, onChange){
  if (!container) return;
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  });

  const addPromptBtn = container.querySelector('[data-ta-add-prompt]');
  if (addPromptBtn) addPromptBtn.addEventListener('click', () => {
    addTypeAnswerPromptField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addAnswerBtn = container.querySelector('[data-ta-add-answer]');
  if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => {
    addTypeAnswerAnswerField(editorState);
    if (onChange) onChange('structure', null);
  });
}

// Helper de integração, mesmo padrão de refreshMultipleChoiceEditorBox
// (6D.4a) -- re-renderiza só quando a mudança é 'structure' (nunca em
// edição de texto/idioma, pra não apagar o que a professora/aluna está
// digitando).
function refreshTypeAnswerEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderTypeAnswerEditorHTML(editorState, opts);
  wireTypeAnswerEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  });
}

// ---------- Extensão do dispatcher por Card Type (shared/flashcard-mc-editor.js) ----------
//
// refreshNativeCardTypeBox() (Fase 6D.4a) é o ponto único que os 2 editores
// chamam pra desenhar a caixa "Campos nativos". Esta subfase adiciona o
// branch de `type_answer` SEM remover o branch de `multiple_choice` já
// existente -- reatribuir a função inteira aqui (em vez de editar o
// arquivo da 6D.4a) mantém cada subfase no seu próprio arquivo, mas ainda
// assim um ÚNICO dispatcher/nome de função em tempo de execução (a última
// definição de `function refreshNativeCardTypeBox` vence, e como este
// arquivo carrega DEPOIS de flashcard-mc-editor.js -- ver ordem de
// <script> em fr/zh index.html -- é esta versão, que já inclui os dois
// branches, que os 2 editores acabam chamando).
function refreshNativeCardTypeBox(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else if (editorState && editorState.cardGenerationMode === 'type_answer'){
    refreshTypeAnswerEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}
