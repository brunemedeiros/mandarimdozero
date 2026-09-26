// ---------- Editor de Fields nativos, reutilizável -- Fase 6D.3 da
// reestruturação Note/CardType/CardInstance (ver CLAUDE.md) ----------
//
// Camada de UI que opera DIRETAMENTE sobre o Field state já definido na
// Fase 6D.1 (shared/flashcard-editor-state.js: createFieldState() ->
// {id, lang, role, content:{value}, audio, image, pinyinFieldId}) --
// nunca uma estrutura paralela (frontText/backText/fieldValue/etc.).
// Reutilizado por shared/admin-flashcards.js e shared/my-flashcards.js,
// conectado ao `editorState.nativeCardState` que a Fase 6D.2 já
// introduziu nos dois (ADMIN_FLASHCARDS_STATE.nativeCardState/
// MY_FLASHCARDS_STATE.nativeCardState).
//
// Escopo estrito desta subfase (ver relatório completo no CLAUDE.md):
// - Editor de Field genérico (conteúdo + idioma), sem UI de rich text.
// - IDs de Field são ESTÁVEIS -- editar conteúdo/idioma NUNCA cria um id
//   novo; só clonar um Field deliberadamente cria um id novo
//   (cloneFieldIntoEditorState).
// - `fields` continua sendo só ORDEM ESTRUTURAL do Note -- este módulo
//   nunca interpreta fields[0]/fields[1] como frente/verso; isso é
//   trabalho do resolver/renderer (shared/flashcard-model.js, Fase 6C),
//   nunca deste editor.
// - `lang` descreve o Field, nunca decide direção/CardType/áudio
//   automaticamente -- não recria frontIsTargetLanguage/isReverse.
// - `role` fica de fora da UI nesta subfase (Multiple Choice/Type Answer
//   ganham UI de role só nas Fases 6D.4a/6D.4b) -- mas é PRESERVADO ao
//   editar o resto do Field (nunca apagado por updateFieldInEditorState).
// - `audio`/`image`/`pinyinFieldId`: preservados através de qualquer
//   edição de texto/idioma; sem upload/TTS/player/UI de pinyin completa
//   ainda (só um indicador textual de que já existem, se existirem).
// - Não persiste nada (sem chamada de rede aqui) -- só muta o
//   editorState em memória; a gravação nativa é a Fase 6D.6.
// - Não cria CardInstance nem chama buildEngineCardsFromRow/
//   interpretNoteFromRow -- isso é do motor, nunca do editor.
//
// Depende de (mesma posição de shared/flashcard-editor-state.js -- antes
// de shared/admin-flashcards.js/shared/my-flashcards.js):
//   - shared/flashcard-editor-state.js (createFieldState, normalizeFieldContent)
//   - escapeHTML (fr/zh app.js -- já carregado antes de qualquer *-flashcards.js)

// Conjunto de idiomas conhecidos hoje pelo motor (ver STUDY_LANG_FOR_APP_KEY/
// isStudyLanguageField em shared/flashcard-model.js: 'fr'/'zh' pro idioma
// estudado, 'zh-pinyin' pro Field satélite de pinyin, 'pt-BR' pra
// tradução). Lista fechada mas ESTENDÍVEL -- quando um novo idioma de site
// existir (ex: português), um novo valor entra aqui, nunca inferido a
// partir de APP_KEY/direção (isso seria recriar frontIsTargetLanguage).
const FIELD_LANG_OPTIONS = [
  { value: 'fr', label: 'Francês' },
  { value: 'zh', label: 'Mandarim (chinês)' },
  { value: 'zh-pinyin', label: 'Pinyin' },
  { value: 'pt-BR', label: 'Português' },
];

function fieldLangLabel(lang){
  const found = FIELD_LANG_OPTIONS.find(o => o.value === lang);
  return found ? found.label : (lang ? lang : '(idioma não definido)');
}

// Fase 7b (ver CLAUDE.md) -- indicador textual (ainda 100% read-only,
// nenhuma UI de edição/upload/geração nova nesta fase) agora reflete o
// `type` canônico de Field.audio em vez de um "tem áudio vinculado"
// genérico -- deixa visível, mesmo sem poder editar ainda, a diferença
// entre um link externo, um upload, uma configuração de TTS ainda sem
// áudio gerado, e uma gravação futura. Shape legado/desconhecido (ex:
// `{url, source:'upload'}` de dado já persistido antes desta fase) cai
// no fallback genérico -- nunca quebra a tela por causa de um `type`
// ausente.
function fieldAudioIndicatorText(audio){
  if (!audio) return null;
  if (audio.type === 'tts') return audio.generatedUrl ? '🎧 áudio TTS gerado' : '🎧 TTS configurado (áudio ainda não gerado)';
  if (audio.type === 'recording') return audio.url ? '🎙️ gravação vinculada' : '🎙️ gravação configurada (ainda sem arquivo)';
  if (audio.type === 'url') return '🎧 áudio (link externo)';
  if (audio.type === 'upload') return '🎧 áudio (upload)';
  return '🎧 tem áudio vinculado';
}

// ---------- Validação básica (Fase 6D.3 -- só o Field, não o Card Type
// inteiro; validação de cardinalidade por tipo, como Múltipla Escolha,
// continua sendo trabalho de fase futura/do motor, nunca deste módulo) ----------
// Não é chamada por nenhum fluxo de submit nesta subfase (submit continua
// 100% legacy, ver shared/admin-flashcards.js/shared/my-flashcards.js) --
// existe pronta pra quando 6D.6+ precisar dela.
function isValidFieldState(field){
  if (!field || typeof field !== 'object') return false;
  if (typeof field.id !== 'string' || !field.id) return false;
  if (!field.content || typeof field.content.value !== 'string') return false;
  return true;
}

// ---------- Render ----------

// Renderiza UM Field -- textarea de conteúdo + select de idioma + um
// indicador textual (não editável) de áudio/imagem/pinyin já vinculados,
// se existirem. `opts.namePrefix` evita colisão de id quando o mesmo
// componente aparece 2x na mesma página (admin + my-flashcards).
function renderFieldEditorHTML(field, index, opts){
  opts = opts || {};
  const namePrefix = opts.namePrefix || 'field-editor';
  const removable = opts.removable !== false;
  const label = opts.label || `Campo ${index + 1}`;
  const contentValue = field.content && typeof field.content.value === 'string' ? field.content.value : '';
  const mediaNotes = [];
  const audioIndicator = fieldAudioIndicatorText(field.audio);
  if (audioIndicator) mediaNotes.push(audioIndicator);
  if (field.image) mediaNotes.push('🖼️ tem imagem vinculada');
  if (field.pinyinFieldId) mediaNotes.push('🔤 tem um campo de pinyin vinculado');
  return `
    <div class="field-editor-row" data-field-editor data-field-id="${field.id}" data-field-index="${index}" style="border:1px solid var(--paper-line); border-radius:var(--radius); padding:10px; margin-bottom:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
        <span class="section-label" style="margin:0;">${escapeHTML(label)}</span>
        ${removable ? `<button type="button" class="admin-badge-delete-btn" data-field-remove="${field.id}" title="Remover campo">🗑</button>` : ''}
      </div>
      <label class="profile-edit-label" for="${namePrefix}-content-${field.id}">Conteúdo</label>
      <textarea id="${namePrefix}-content-${field.id}" class="profile-edit-input profile-edit-textarea" rows="2" data-field-content="${field.id}">${escapeHTML(contentValue)}</textarea>
      <label class="profile-edit-label" for="${namePrefix}-lang-${field.id}">Idioma</label>
      <select id="${namePrefix}-lang-${field.id}" class="profile-edit-input" data-field-lang="${field.id}">
        <option value="" ${!field.lang ? 'selected' : ''}>(não definido)</option>
        ${FIELD_LANG_OPTIONS.map(o => `<option value="${o.value}" ${field.lang === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      ${mediaNotes.length ? `<p class="profile-edit-hint" style="margin-top:6px;">${mediaNotes.join(' · ')} (edição de mídia/pinyin ainda não implementada nesta fase -- preservados como estão).</p>` : ''}
    </div>
  `;
}

// Renderiza a lista completa de Fields de um editorState nativo + botão de
// "adicionar campo". Puramente descritivo -- wireFieldEditorList() precisa
// rodar depois de inserir este HTML no DOM pra mutação de verdade acontecer.
function renderFieldEditorListHTML(editorState, opts){
  opts = opts || {};
  const fields = editorState.fields || [];
  return `
    <div data-field-editor-list>
      ${fields.length ? fields.map((f, i) => renderFieldEditorHTML(f, i, opts)).join('') : `<p class="profile-edit-hint">Nenhum campo ainda -- use "Adicionar campo" abaixo.</p>`}
    </div>
    ${opts.allowAdd !== false ? `<button type="button" class="admin-select-link" data-field-add>+ Adicionar campo</button>` : ''}
  `;
}

// ---------- Mutadores puros (Field state -- nunca tocam CardInstance/FSRS/
// nunca chamam rede) ----------

// Fase 6D.8 -- os Fields que são satélite de pinyin de outro Field (alvo
// de ALGUM field.pinyinFieldId na mesma Note) nunca contam como candidato
// a "campo sem papel ainda" -- mesmo critério que contentFieldIndices()
// (motor, shared/flashcard-model.js) já usa pra nunca tratar um satélite
// de pinyin como um slot de conteúdo próprio. Achado real durante a Fase
// 6D.8: transitionToMultipleChoice()/transitionToTypeAnswer() (6D.4a/6D.4b)
// nunca excluíam o satélite ao escolher `unroled[cursor]` -- inofensivo
// enquanto nenhum estado convertido de legado carregava um satélite de
// pinyin antes de trocar de Card Type, mas quebrava de verdade nesse
// cenário real (ex: converter um Normal zh com front_pinyin, depois trocar
// pra "Digite a resposta" -- o Field de pinyin virava `answer` por engano,
// perdendo a tradução real). Corrigido aqui, reutilizado pelos 2
// transitionTo*, nunca duplicado.
function fieldIsPinyinSatellite(field, fields){
  return fields.some(f => f.pinyinFieldId === field.id);
}

// Cria um Field NOVO (id gerado por createFieldState, Fase 6D.1) e o
// adiciona ao FIM de editorState.fields. `fields` continua sendo só a
// ordem estrutural/editorial -- nunca interpretado como frente/verso por
// este módulo.
function addFieldToEditorState(editorState, overrides){
  const field = createFieldState(overrides || {});
  editorState.fields = editorState.fields.concat([field]);
  return field;
}

// Remove um Field pelo ID -- nunca por índice (índice não é identidade,
// restrição 4 da Fase 6D.3). Os Fields restantes preservam seus próprios
// ids/conteúdo/lang/role/audio/image/pinyinFieldId intactos.
function removeFieldFromEditorState(editorState, fieldId){
  editorState.fields = editorState.fields.filter(f => f.id !== fieldId);
}

// Atualiza SÓ os campos passados em `patch` de um Field já existente,
// casando por id -- NUNCA cria um Field novo, NUNCA gera um id novo pro
// Field editado. Campos de `patch` não mencionados (audio/image/role/
// pinyinFieldId quando o patch só mexe em content/lang, por exemplo)
// continuam exatamente como estavam -- é isso que garante que editar
// texto/idioma nunca apaga áudio/imagem/pinyinFieldId já vinculados
// (restrições 8/9/10 da Fase 6D.3).
function updateFieldInEditorState(editorState, fieldId, patch){
  editorState.fields = editorState.fields.map(f => {
    if (f.id !== fieldId) return f;
    const next = Object.assign({}, f, patch);
    if (patch && patch.content !== undefined) next.content = normalizeFieldContent(patch.content);
    return next;
  });
}

// Clonagem DELIBERADA de um Field -- o único caso em que um ID NOVO é
// esperado (restrição 4). Copia lang/role/content/audio/image do
// original, mas NUNCA copia pinyinFieldId -- um pinyinFieldId apontaria
// pro Field ORIGINAL, não faria sentido no clone (e criaria uma referência
// cruzada entre dois Fields que o usuário não pediu).
function cloneFieldIntoEditorState(editorState, fieldId){
  const original = (editorState.fields || []).find(f => f.id === fieldId);
  if (!original) return null;
  const clone = createFieldState({
    lang: original.lang,
    role: original.role,
    content: { value: original.content && typeof original.content.value === 'string' ? original.content.value : '' },
    audio: original.audio,
    image: original.image,
    pinyinFieldId: null,
  });
  editorState.fields = editorState.fields.concat([clone]);
  return clone;
}

// ---------- Wiring: liga o DOM (data-field-*) aos mutadores acima ----------
// `onChange(kind, fieldId)` é chamado depois de QUALQUER mutação --
// `kind` é 'content'/'lang'/'remove'/'add'. Quem integra decide o que
// fazer: mutação de texto/idioma não precisa de re-render (o próprio
// input/select já reflete a mudança, e re-renderizar apagaria o que a
// pessoa está digitando -- mesma disciplina de
// updateFlashcardsSelectionDependentUI(), ver "UX-fix 5" no CLAUDE.md);
// add/remove SIM precisam de re-render (a lista de linhas mudou).
function wireFieldEditorList(container, editorState, onChange){
  if (!container) return;
  container.querySelectorAll('[data-field-content]').forEach(el => {
    el.addEventListener('input', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldContent, { content: { value: el.value } });
      if (onChange) onChange('content', el.dataset.fieldContent);
    });
  });
  container.querySelectorAll('[data-field-lang]').forEach(el => {
    el.addEventListener('change', () => {
      updateFieldInEditorState(editorState, el.dataset.fieldLang, { lang: el.value || null });
      if (onChange) onChange('lang', el.dataset.fieldLang);
    });
  });
  container.querySelectorAll('[data-field-remove]').forEach(el => {
    el.addEventListener('click', () => {
      const fieldId = el.dataset.fieldRemove;
      removeFieldFromEditorState(editorState, fieldId);
      if (onChange) onChange('remove', fieldId);
    });
  });
  const addBtn = container.querySelector('[data-field-add]');
  if (addBtn){
    addBtn.addEventListener('click', () => {
      const field = addFieldToEditorState(editorState, {});
      if (onChange) onChange('add', field.id);
    });
  }
}

// Helper de integração reutilizado pelos dois editores (admin/my-flashcards)
// -- re-renderiza SÓ a caixa de Fields nativos (nunca o form inteiro) e
// rewire, mas só quando a MUDANÇA foi estrutural (add/remove); edição de
// texto/idioma já está refletida no próprio DOM sem precisar de nada extra.
// `boxEl` é o container que recebe renderFieldEditorListHTML(); `opts` é
// repassado pra renderFieldEditorHTML (namePrefix/label/removable/allowAdd).
function refreshNativeFieldsBox(boxEl, editorState, opts){
  if (!boxEl) return;
  boxEl.innerHTML = renderFieldEditorListHTML(editorState, opts);
  wireFieldEditorList(boxEl, editorState, (kind) => {
    if (kind === 'add' || kind === 'remove') refreshNativeFieldsBox(boxEl, editorState, opts);
  });
}
