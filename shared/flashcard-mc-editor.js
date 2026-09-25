// ---------- Editor nativo de Multiple Choice -- Fase 6D.4a da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI ESPECÍFICA de Multiple Choice, construída EM CIMA do Field
// editor genérico da Fase 6D.3 (shared/flashcard-field-editor.js) -- nunca
// reimplementa edição de conteúdo/idioma de Field, só organiza os Fields
// de um Note `multiple_choice` em 3 grupos semânticos (Pergunta/Resposta
// certa/Distratores) e oferece as ações estruturais próprias desse Card
// Type (criar prompt/answer, adicionar/remover/promover distrator).
//
// Substitui conceitualmente o campo flat legado `choices` -- não existe
// NENHUMA estrutura paralela (`choices[]`/`multipleChoiceOptions`/
// `correctChoice`/`promptText`/`answerText`) aqui: a única fonte de
// verdade continua sendo `editorState.fields` (Field state da 6D.1),
// exatamente como o Field editor genérico já trabalha.
//
// Depende de (mesma posição de shared/flashcard-field-editor.js -- antes
// de shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-model.js       (validateNativeNoteRow, CARD_GENERATION_MODES)
//   - shared/flashcard-editor-state.js (noteEditorStateToRow, createNativeNoteEditorState)
//   - shared/flashcard-field-editor.js (renderFieldEditorHTML, wireFieldEditorList,
//                                        addFieldToEditorState, removeFieldFromEditorState,
//                                        updateFieldInEditorState, refreshNativeFieldsBox)
//   - escapeHTML (fr/zh app.js)

// Os 3 roles reconhecidos por Multiple Choice -- os únicos que este editor
// atribui/exibe (restrição explícita: "não introduzir outros roles nesta
// subfase"). `role` continua sendo metadado semântico puro -- NUNCA decide
// direção (a engine, shared/flashcard-model.js, já garante isso desde a
// Fase 6B: promptFieldIndex/correctFieldIndex vêm de ÍNDICE, não de role
// interpretado como front/back).
const MC_ROLES = ['prompt', 'answer', 'distractor'];
const MC_MAX_DISTRACTORS = 3;
const MC_MIN_DISTRACTORS = 1;

// ---------- Validação (reutilizável pela 6D.6) ----------
//
// Reaproveita, sem duplicar, a MESMA validação estrutural que o motor já
// roda antes de gerar CardInstances (validateNativeNoteRow, que por sua
// vez chama validateMultipleChoiceFields internamente quando
// card_generation_mode==='multiple_choice') -- nunca uma segunda
// implementação da regra de cardinalidade/pareamento/ids únicos/
// pinyinFieldId. `noteEditorStateToRow()` (Fase 6D.1) já produz o shape
// exato que o motor consome -- é literalmente o mesmo transform que a
// 6D.6 vai usar pra persistir, então esta função já valida contra o
// caminho real, não uma cópia dele.
//
// Duas checagens A MAIS que o motor não faz (porque são preocupação de
// TEMPO DE EDIÇÃO, não de geração de CardInstance -- validateNativeNoteRow
// nunca olhou conteúdo de Field, só estrutura/ids):
//   - "todos os roles reconhecidos" -- um Field com role fora de
//     prompt/answer/distractor (ou sem role nenhuma) deixado numa Note
//     multiple_choice é tratado como AMBÍGUO, não silenciosamente
//     ignorado (isso costuma acontecer ao trocar normal->multiple_choice
//     com 3+ Fields, ver transitionToMultipleChoice abaixo -- o Field
//     "sobrando" fica sem papel e bloqueia a validação até o usuário
//     decidir o que fazer com ele).
//   - "conteúdo válido" -- pergunta/resposta/todo distrator precisam ter
//     texto não-vazio; a engine nunca validou isso (um Field vazio é
//     estruturalmente válido pra ela), mas um cartão de múltipla escolha
//     com uma opção em branco não faz sentido pedagógico nenhum.
function validateNativeMultipleChoiceStructure(editorState){
  if (!editorState || editorState.kind !== 'native'){
    return { ok: false, error: 'Este Note não é nativo.' };
  }
  if (editorState.cardGenerationMode !== 'multiple_choice'){
    return { ok: false, error: 'Este Note não está no modo Múltipla escolha.' };
  }

  const row = noteEditorStateToRow(editorState);
  const structural = validateNativeNoteRow(row);
  if (!structural.ok) return structural;

  const fields = editorState.fields || [];
  const unrecognized = fields.filter(f => !MC_ROLES.includes(f.role));
  if (unrecognized.length){
    return { ok: false, error: `Múltipla escolha não aceita Field sem papel definido (${unrecognized.length} campo(s) sem prompt/resposta/distrator) -- atribua um papel ou remova.` };
  }

  const isEmptyField = f => !(f.content && (f.content.value || '').trim());
  if (fields.some(isEmptyField)){
    return { ok: false, error: 'Todo campo de múltipla escolha (pergunta, resposta certa, distratores) precisa ter conteúdo.' };
  }

  return { ok: true };
}

// ---------- Transição de outro Card Type pra multiple_choice ----------
//
// Reaproveita, DE FORMA DETERMINÍSTICA, os Fields que já existiam (ex:
// vindos de `normal`) -- nunca inventa conteúdo novo. Só atribui role a
// Fields que AINDA NÃO TÊM NENHUMA role (nunca sobrescreve um role já
// definido -- um Field que já era 'distractor' de uma edição MC anterior
// permanece distractor mesmo se o usuário sair e voltar pro modo). Ordem:
// o primeiro Field sem role vira 'prompt' (se ainda não houver nenhum), o
// segundo vira 'answer' (se ainda não houver nenhum) -- espelha a mesma
// convenção posicional que `normal` já usa (slot 0/slot 1), só que agora
// expressa como role em vez de índice.
//
// NUNCA cria distractors automaticamente -- se não sobrar nenhum Field
// pra virar distrator, a estrutura fica EXPLICITAMENTE incompleta
// (validateNativeMultipleChoiceStructure reporta isso) até o usuário
// adicionar pelo menos 1 via "+ Adicionar distrator".
function transitionToMultipleChoice(editorState){
  editorState.cardGenerationMode = 'multiple_choice';
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

// ---------- Ações estruturais (restrições 5/7/15) ----------

// Cria o Field de pergunta -- só chamada pela UI quando nenhum já existe
// (ver renderMultipleChoiceEditorHTML: o botão "+ Criar campo de
// pergunta" só é renderizado quando promptField é falsy).
function addMultipleChoicePromptField(editorState){
  return addFieldToEditorState(editorState, { role: 'prompt' });
}
function addMultipleChoiceAnswerField(editorState){
  return addFieldToEditorState(editorState, { role: 'answer' });
}
// Distrator novo -- id novo (restrição 15: "adicionar distractor cria
// novo ID"), nunca reaproveita/renumera Fields existentes.
function addMultipleChoiceDistractorField(editorState){
  return addFieldToEditorState(editorState, { role: 'distractor' });
}
// Remove SÓ o Field pedido -- restrição 15 ("remover distractor remove
// somente aquele Field", "não renumerar IDs") já é a garantia do próprio
// removeFieldFromEditorState (6D.3, remove por id, nunca por índice).
function removeMultipleChoiceDistractorField(editorState, fieldId){
  removeFieldFromEditorState(editorState, fieldId);
}

// Restrição 7 -- "ao trocar answer<->distractor, isso altera apenas a
// semântica do Field... não deve criar/deletar CardInstances." Promove um
// distrator a resposta certa, rebaixando a resposta atual (se existir) a
// distrator -- os DOIS Fields preservam seus próprios ids/conteúdo/lang/
// audio/image/pinyinFieldId intactos, só `role` muda. Se ainda não houver
// nenhuma resposta certa, funciona como "usar este distrator como
// resposta" direto, sem rebaixar nada.
function promoteDistractorToAnswer(editorState, distractorFieldId){
  const currentAnswer = (editorState.fields || []).find(f => f.role === 'answer');
  if (currentAnswer && currentAnswer.id !== distractorFieldId){
    updateFieldInEditorState(editorState, currentAnswer.id, { role: 'distractor' });
  }
  updateFieldInEditorState(editorState, distractorFieldId, { role: 'answer' });
}

// ---------- Render ----------

function renderMultipleChoiceEditorHTML(editorState, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'mc-editor';
  const fields = editorState.fields || [];
  const promptField = fields.find(f => f.role === 'prompt');
  const answerField = fields.find(f => f.role === 'answer');
  const distractorFields = fields.filter(f => f.role === 'distractor');
  // Fields que sobraram de outro Card Type (ex: um 3º Field zh de pinyin
  // ao trocar normal->multiple_choice) -- nunca escondidos silenciosamente
  // (isso faria a mensagem de validação parecer incompreensível): mostrados
  // numa seção própria, com remoção via o botão GENÉRICO do Field editor
  // (data-field-remove, já wireado por wireFieldEditorList dentro de
  // wireMultipleChoiceEditor abaixo).
  const otherFields = fields.filter(f => !MC_ROLES.includes(f.role));
  const validation = validateNativeMultipleChoiceStructure(editorState);

  const promptHTML = promptField
    ? renderFieldEditorHTML(promptField, 0, { namePrefix, label: 'Pergunta/Prompt', removable: false })
    : `<p class="profile-edit-hint">Nenhum campo de pergunta ainda.</p><button type="button" class="admin-select-link" data-mc-add-prompt>+ Criar campo de pergunta</button>`;

  const answerHTML = answerField
    ? renderFieldEditorHTML(answerField, 0, { namePrefix, label: 'Resposta correta', removable: false })
    : `<p class="profile-edit-hint">Nenhum campo de resposta certa ainda.</p><button type="button" class="admin-select-link" data-mc-add-answer>+ Criar campo de resposta certa</button>`;

  const distractorsHTML = distractorFields.length
    ? distractorFields.map((f, i) => `
        ${renderFieldEditorHTML(f, i, { namePrefix, label: `Distrator ${i + 1}`, removable: false })}
        <div style="display:flex; gap:14px; margin:-6px 0 10px;">
          <button type="button" class="admin-select-link" data-mc-promote-distractor="${f.id}">✓ Marcar como resposta certa</button>
          <button type="button" class="admin-select-link" data-mc-remove-distractor="${f.id}">🗑 Remover distrator</button>
        </div>
      `).join('')
    : `<p class="profile-edit-hint">Nenhum distrator ainda -- adicione pelo menos 1.</p>`;

  const addDistractorHTML = distractorFields.length < MC_MAX_DISTRACTORS
    ? `<button type="button" class="admin-select-link" data-mc-add-distractor>+ Adicionar distrator</button>`
    : `<p class="profile-edit-hint">Máximo de ${MC_MAX_DISTRACTORS} distratores atingido.</p>`;

  const otherFieldsHTML = otherFields.length ? `
    <div class="section-label" style="margin:14px 0 4px;">Outros campos (sem papel definido nesta múltipla escolha)</div>
    <p class="profile-edit-hint">Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os ou atribua um papel pra estrutura ficar válida.</p>
    ${otherFields.map((f, i) => renderFieldEditorHTML(f, i, { namePrefix, label: `Campo sem papel ${i + 1}`, removable: true })).join('')}
  ` : '';

  const validationHTML = validation.ok
    ? `<p class="profile-edit-hint" style="margin-top:10px; color:var(--jade);">✓ Estrutura de múltipla escolha completa.</p>`
    : `<p class="profile-edit-error" style="margin-top:10px;">${escapeHTML(validation.error)}</p>`;

  return `
    <div data-mc-editor>
      <div class="section-label" style="margin:0 0 4px;">Pergunta/Prompt</div>
      ${promptHTML}
      <div class="section-label" style="margin:14px 0 4px;">Resposta correta</div>
      ${answerHTML}
      <div class="section-label" style="margin:14px 0 4px;">Distratores (${distractorFields.length}/${MC_MAX_DISTRACTORS})</div>
      ${distractorsHTML}
      ${addDistractorHTML}
      ${otherFieldsHTML}
      ${validationHTML}
    </div>
  `;
}

// ---------- Wiring ----------
//
// `onChange(kind, fieldId)` -- 'content'/'lang' (reaproveitados do Field
// editor genérico, nunca disparam re-render, mesma disciplina da 6D.3) ou
// 'structure' (add/remove/promote -- disparam re-render, porque o CONJUNTO
// de linhas visíveis ou a mensagem de validação mudou).
function wireMultipleChoiceEditor(container, editorState, onChange){
  if (!container) return;
  // Reaproveita o wiring de conteúdo/idioma do Field editor genérico (6D.3)
  // pra TODO Field mostrado aqui (prompt/answer/distractors/outros) -- e
  // também o remove genérico (data-field-remove), usado só pelos "outros
  // campos" (prompt/answer nunca têm esse botão, distratores usam o botão
  // próprio data-mc-remove-distractor abaixo).
  wireFieldEditorList(container, editorState, (kind, fieldId) => {
    if (onChange) onChange(kind, fieldId);
  });

  const addPromptBtn = container.querySelector('[data-mc-add-prompt]');
  if (addPromptBtn) addPromptBtn.addEventListener('click', () => {
    addMultipleChoicePromptField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addAnswerBtn = container.querySelector('[data-mc-add-answer]');
  if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => {
    addMultipleChoiceAnswerField(editorState);
    if (onChange) onChange('structure', null);
  });
  const addDistractorBtn = container.querySelector('[data-mc-add-distractor]');
  if (addDistractorBtn) addDistractorBtn.addEventListener('click', () => {
    addMultipleChoiceDistractorField(editorState);
    if (onChange) onChange('structure', null);
  });
  container.querySelectorAll('[data-mc-remove-distractor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldId = btn.dataset.mcRemoveDistractor;
      removeMultipleChoiceDistractorField(editorState, fieldId);
      if (onChange) onChange('structure', fieldId);
    });
  });
  container.querySelectorAll('[data-mc-promote-distractor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldId = btn.dataset.mcPromoteDistractor;
      promoteDistractorToAnswer(editorState, fieldId);
      if (onChange) onChange('structure', fieldId);
    });
  });
}

// Helper de integração, mesmo padrão de refreshNativeFieldsBox (6D.3) --
// re-renderiza só quando a mudança é 'structure' (nunca em edição de
// texto/idioma, pra não apagar o que a professora/aluna está digitando).
function refreshMultipleChoiceEditorBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderMultipleChoiceEditorHTML(editorState, opts);
  wireMultipleChoiceEditor(boxEl, editorState, (kind) => {
    if (kind === 'structure') refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  });
}

// ---------- Dispatcher por Card Type ----------
//
// Ponto único que os 2 editores (admin-flashcards.js/my-flashcards.js)
// chamam pra desenhar a caixa "Campos nativos" -- decide entre a UI
// estruturada de Multiple Choice (esta subfase) e o Field editor genérico
// da 6D.3 (normal/normal_reversed/type_answer/cloze -- nenhum deles ganhou
// UI própria ainda, restrição 11: "garantir que o novo código não os
// quebra", nada além disso). Vive aqui (não em flashcard-field-editor.js)
// de propósito -- o Field editor genérico continua sem nenhum
// conhecimento de Card Type (restrição 14), é este arquivo MC-específico
// que sabe "pra multiple_choice, use a UI estruturada; pro resto, caia no
// genérico".
function refreshNativeCardTypeBox(boxEl, editorState, opts){
  if (editorState && editorState.cardGenerationMode === 'multiple_choice'){
    refreshMultipleChoiceEditorBox(boxEl, editorState, opts);
  } else {
    refreshNativeFieldsBox(boxEl, editorState, opts);
  }
}
