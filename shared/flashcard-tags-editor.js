// Fase I (Tags) -- editor de Tags reutilizável do editor NATIVO de Note.
//
// Tags pertencem à NOTE (nunca ao CardInstance): esta UI só lê/escreve
// `editorState.tags` (Fase 6D.1), que já é normalizada por
// createNativeNoteEditorState() e persistida pelo pipeline nativo existente
// (nativeContentColumnsFromEditorState). NENHUMA regra de normalização,
// limite ou validação vive aqui -- tudo vem de shared/flashcard-model.js
// (normalizeNoteTags / validateNoteTags / TAG_MAX_*). Tag fica num mount
// PRÓPRIO (irmão da caixa de Campos), então trocar de Card Type ou
// adicionar/remover Field nunca recria nem perde as tags digitadas.
//
// Depende de: shared/flashcard-model.js, shared/profile.js (escapeHTML).

// Textos vêm do idioma do site (shared/i18n); sem o núcleo i18n (testes
// Node), devolve a chave.
function tagsEditorT(key, params){ return typeof t === 'function' ? t(key, params) : key; }

function noteTagChipsHTML(tags, opts){
  const o = opts || {};
  const list = Array.isArray(tags) ? tags : [];
  if (!list.length) return o.emptyText ? `<span class="profile-edit-hint" style="margin:0;">${escapeHTML(o.emptyText)}</span>` : '';
  // Tag de SISTEMA (criado-por-*): atribuição permanente, nunca removível
  // aqui (o servidor também recusa) e marcada com 🔒.
  return list.map(tag => `<span class="pill note-tag-chip" data-tag="${escapeHTML(tag)}"${isAttributionTag(tag) ? ` data-system-tag="1" title="${escapeHTML(tagsEditorT('review.tags.systemTagTitle'))}"` : ''}>${isAttributionTag(tag) ? '🔒 ' : ''}#${escapeHTML(tag)}${(o.removable && !isAttributionTag(tag)) ? ` <button type="button" class="note-tag-remove" data-tag-remove="${escapeHTML(tag)}" aria-label="${tagsEditorT('review.tags.removeAria', { tag: escapeHTML(tag) })}" style="background:none;border:none;cursor:pointer;color:inherit;padding:0 0 0 4px;">✕</button>` : ''}</span>`).join(' ');
}

// Monta (ou remonta) o editor de tags dentro de mountEl. `onChange` é
// opcional (chamado depois de cada add/remove bem-sucedido).
function mountNoteTagsEditor(mountEl, editorState, opts){
  if (!mountEl || !editorState) return;
  const o = opts || {};
  if (!Array.isArray(editorState.tags)) editorState.tags = [];

  function render(msg){
    const n = editorState.tags.length;
    mountEl.innerHTML = `
      <div class="section-label" style="margin:14px 0 4px;">${escapeHTML(tagsEditorT('review.panel.tags'))} <span class="profile-edit-hint" style="margin:0;" data-tags-counter>(${n}/${TAG_MAX_PER_NOTE})</span></div>
      <div data-tags-chips style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">${noteTagChipsHTML(editorState.tags, { removable: true, emptyText: tagsEditorT('review.panel.noTags') })}</div>
      <div style="display:flex; gap:8px;">
        <input type="text" class="profile-edit-input" data-tags-input maxlength="80" placeholder="${escapeHTML(tagsEditorT('review.tags.placeholder'))}" style="flex:1;">
        <button type="button" class="btn btn-secondary" data-tags-add>${escapeHTML(tagsEditorT('review.deck.add'))}</button>
      </div>
      <p class="profile-edit-field-error" data-tags-error>${msg ? escapeHTML(msg) : ''}</p>
      <p class="profile-edit-hint" style="margin:0;">${escapeHTML(tagsEditorT('review.tags.hint', { max: TAG_MAX_PER_NOTE, len: TAG_MAX_LENGTH }))}</p>`;
    const input = mountEl.querySelector('[data-tags-input]');
    const addBtn = mountEl.querySelector('[data-tags-add]');
    const commit = () => {
      const raw = input.value;
      if (!raw.trim()) return;
      // Aceita várias de uma vez separadas por vírgula.
      const parts = raw.split(',').map(x => x.trim()).filter(Boolean);
      let next = editorState.tags.slice();
      const notes = [];
      for (const part of parts){
        const slug = normalizeNoteTags([part])[0];
        if (!slug){ notes.push(tagsEditorT('review.tags.invalid', { tag: part })); continue; }
        if (isAttributionTag(slug)){ notes.push(tagsEditorT('review.tags.systemNotAllowed')); continue; }
        if (next.includes(slug)){ notes.push(tagsEditorT('review.tags.exists', { tag: slug })); continue; }
        const check = validateNoteTags(next.concat(slug));
        if (!check.ok){ notes.push(check.error); continue; }
        next = check.tags;
      }
      editorState.tags = next;
      render(notes.join(' '));
      if (typeof o.onChange === 'function') o.onChange(editorState.tags);
    };
    addBtn.addEventListener('click', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); commit(); } });
    mountEl.querySelectorAll('[data-tag-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        editorState.tags = editorState.tags.filter(x => x !== btn.dataset.tagRemove);
        render('');
        if (typeof o.onChange === 'function') o.onChange(editorState.tags);
      });
    });
  }
  render('');
}
