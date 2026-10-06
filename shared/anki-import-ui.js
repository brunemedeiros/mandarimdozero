// ---------- Fase 7j (ver CLAUDE.md) -- Anki IMPORT: UI (parse -> resumo/
// preview -> confirmação -> resultado) ----------
//
// Fluxo em 5 telas dentro do MESMO modal, nunca persiste nada antes da
// confirmação explícita (Section 26 -- "Preview/Dry Run": Parse -> Normalize
// -> Validate -> Preview summary -> Persist, cada seta só avança depois de
// um clique da pessoa; nunca reaproveita shared/flashcard-preview.js, que é
// o Preview do EDITOR de cartão, um conceito totalmente diferente):
//   1. Escolher .apkg (shared/my-flashcards.js, input#anki-import-file)
//   2. Carregando (parse + classificação + dedup, shared/anki-parser.js +
//      shared/anki-import.js -- nenhuma escrita de rede ainda)
//   3. Resumo/preview -- contagem, avisos, lista com checkbox por Note
//      (Section 25) -- mídia NUNCA é buscada/enviada aqui (Section 26)
//   4. Confirmar -- checa limite de coleção (Section 23, bloqueia ANTES de
//      escrever), resolve+sobe mídia só das Notes selecionadas, persiste em
//      lotes (shared/anki-import.js, atômico por lote)
//   5. Resultado -- quantas importadas, quantas puladas, avisos
//
// Depende de (mesma posição de shared/my-flashcards.js -- depois de
// shared/anki-import.js):
//   - shared/anki-parser.js  (parseApkgFile)
//   - shared/anki-import.js  (buildAnkiImportPlan, resolveAndAttachAnkiMedia,
//                              persistAnkiImportBatches, computeAnkiImportRemainingSlots)
//   - shared/own-flashcards.js (fetchMyOwnFlashcards, uploadOwnFlashcardMedia)
//   - shared/roles.js        (hasActiveTeacherLink)
//   - fr/zh app.js           (APP_KEY, addSelfFlashcardToState)
//   - shared/toast.js        (showToast)

const ANKI_IMPORT_CARD_TYPE_LABELS = {
  normal: 'Normal',
  normal_reversed: 'Normal com reverso',
  cloze: 'Completar a frase (Cloze)',
  type_answer: 'Digite a resposta',
};

// Limite de linhas efetivamente desenhadas na lista (performance/DOM --
// decks muito grandes não travam a tela) -- a SELEÇÃO em si (Selecionar
// todos/Limpar/contador) sempre opera sobre o plano INTEIRO, nunca só sobre
// o que está visível.
const ANKI_IMPORT_MAX_VISIBLE_ROWS = 500;

const ANKI_IMPORT_STATE = {
  plan: null,
  parseResult: null,
  selectedIds: new Set(),
  existingRows: [],
  hasLink: false,
  mediaCache: null,
};

function ensureAnkiImportModal(){
  let modal = document.getElementById('anki-import-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'anki-import-modal';
  modal.className = 'app-modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="app-modal">
      <div class="app-modal-header">
        <h3>${t('ankiImport.title')}</h3>
        <button class="app-modal-close" id="anki-import-close" aria-label="${t('common.close')}">✕</button>
      </div>
      <div class="app-modal-body" id="anki-import-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('anki-import-close').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  return modal;
}

async function handleAnkiImportFileSelected(file){
  if (!file) return;
  const modal = ensureAnkiImportModal();
  const body = document.getElementById('anki-import-body');
  modal.style.display = 'flex';
  body.innerHTML = loadingHTML(t('ankiImport.loadingFile'));

  ANKI_IMPORT_STATE.plan = null;
  ANKI_IMPORT_STATE.parseResult = null;
  ANKI_IMPORT_STATE.selectedIds = new Set();
  ANKI_IMPORT_STATE.mediaCache = new Map();

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (e) {
    body.innerHTML = ankiImportErrorHTML(t('ankiImport.err.readFile'));
    return;
  }

  let SQL;
  try {
    SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
  } catch (e) {
    body.innerHTML = ankiImportErrorHTML(t('ankiImport.err.loadDb'));
    return;
  }
  if (typeof JSZip === 'undefined'){
    body.innerHTML = ankiImportErrorHTML(t('ankiImport.err.loadZip'));
    return;
  }

  const parseResult = await parseApkgFile(arrayBuffer, { SQL, JSZipCtor: JSZip });
  if (!parseResult.ok){
    body.innerHTML = ankiImportErrorHTML(parseResult.error);
    return;
  }
  ANKI_IMPORT_STATE.parseResult = parseResult;

  body.innerHTML = loadingHTML(t('ankiImport.loadingPlan'));
  const [existingRows, hasLink] = await Promise.all([
    fetchMyOwnFlashcards(APP_KEY),
    hasUnlimitedOwnCards(),
  ]);
  ANKI_IMPORT_STATE.existingRows = existingRows;
  ANKI_IMPORT_STATE.hasLink = hasLink;

  const plan = buildAnkiImportPlan(parseResult, { languageAppKey: APP_KEY, existingRows });
  ANKI_IMPORT_STATE.plan = plan;
  // Seleção inicial: tudo que é importável e NÃO parece duplicata (Section
  // 11 -- nunca sobrescrever/pular silenciosamente, mas também nunca
  // marcar uma provável duplicata como selecionada por padrão; a pessoa
  // decide, o checkbox continua disponível pra ela marcar se quiser mesmo
  // assim).
  plan.notes.forEach(n => { if (n.ok && !n.isDuplicate) ANKI_IMPORT_STATE.selectedIds.add(n.ankiNoteId); });

  renderAnkiImportSummary(body);
}

function ankiImportErrorHTML(message){
  return `<p class="profile-edit-error" style="display:block;">${escapeHTML(message)}</p>`;
}

function ankiImportNoteRowHTML(note){
  const checked = ANKI_IMPORT_STATE.selectedIds.has(note.ankiNoteId);
  if (!note.ok){
    return `
      <label class="admin-badge-row" data-anki-note-row="${note.ankiNoteId}" style="opacity:.65;">
        <input type="checkbox" disabled>
        <div class="admin-badge-info">
          <div class="admin-badge-name">🚫 ${escapeHTML(note.deckName || t('ankiImport.noDeck'))}</div>
          <div class="admin-badge-desc">${escapeHTML(note.warning)}</div>
        </div>
      </label>`;
  }
  const typeLabel = ANKI_IMPORT_CARD_TYPE_LABELS[note.cardTypeLabel] || note.cardTypeLabel;
  const tagPills = (note.normalizedTags || []).map(tag => `<span class="pill" style="font-size:10px;">#${escapeHTML(tag)}</span>`).join(' ');
  const badges = [
    `<span class="pill" style="font-size:11px;">${escapeHTML(typeLabel)}</span>`,
    note.hasMedia ? `<span class="pill" style="font-size:11px;">${t('ankiImport.pillMedia')}</span>` : '',
    note.isDuplicate ? `<span class="pill" style="font-size:11px;">${t('ankiImport.pillDuplicate')}</span>` : '',
    tagPills,
  ].filter(Boolean).join(' ');
  const preview = (note.editorState.fields[0].content.value || '').slice(0, 80);
  return `
    <label class="admin-badge-row" data-anki-note-row="${note.ankiNoteId}">
      <input type="checkbox" class="anki-import-note-check" data-anki-note-id="${note.ankiNoteId}" ${checked ? 'checked' : ''}>
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(preview)}${note.deckName ? ` <span style="font-weight:400; color:var(--ink-soft);">· ${escapeHTML(note.deckName)}</span>` : ''}</div>
        <div class="admin-badge-desc">${badges}${note.warnings.length ? `<br>⚠️ ${note.warnings.map(escapeHTML).join(' · ')}` : ''}</div>
      </div>
    </label>`;
}

// Gap 1 (Fase 7j fechamento, ver CLAUDE.md) -- lista indentada, SÓ
// LEITURA, da hierarquia de Decks encontrada no .apkg -- nunca um
// controle de destino de verdade (nenhum Deck existe neste app ainda,
// ver comentário de buildAnkiDeckTree em shared/anki-import.js). Existe
// só pra a pessoa CONFERIR que a estrutura foi reconhecida (nunca
// descartada silenciosamente), mesmo sem poder direcioná-la ainda.
function ankiDeckTreeRowsHTML(node, depth){
  return node.children.map(child => {
    const indent = depth * 16;
    const childRows = ankiDeckTreeRowsHTML(child, depth + 1);
    return `<div style="padding-left:${indent}px; font-size:13px; color:var(--ink-soft);">📁 ${escapeHTML(child.name)} <span style="opacity:.75;">(${child.count})</span></div>${childRows}`;
  }).join('');
}

function ankiImportDeckSummaryHTML(plan){
  const tree = plan.deckTree;
  if (!tree || !tree.children.length) return '';
  return `
    <div class="profile-edit-hint" style="margin-top:8px;">
      <strong>${t('ankiImport.decks.title')}</strong>
      <div style="margin-top:4px; max-height:120px; overflow-y:auto;">${ankiDeckTreeRowsHTML(tree, 0)}</div>
      ${t('ankiImport.decks.note')}
    </div>`;
}

function ankiImportTagsSummaryHTML(plan){
  if (!plan.tagsPresent) return '';
  const shown = plan.uniqueTags.slice(0, 20);
  const pills = shown.map(tag => `<span class="pill" style="font-size:11px;">#${escapeHTML(tag)}</span>`).join(' ');
  return `
    <div class="profile-edit-hint" style="margin-top:8px;">
      <strong>${t('ankiImport.tags.title', { n: plan.uniqueTags.length })}</strong>
      <div style="margin-top:4px;">${pills}${plan.uniqueTags.length > shown.length ? ' …' : ''}</div>
      ${t('ankiImport.tags.note')}
    </div>`;
}

function renderAnkiImportSummary(body){
  const plan = ANKI_IMPORT_STATE.plan;
  const visibleNotes = plan.notes.slice(0, ANKI_IMPORT_MAX_VISIBLE_ROWS);
  const truncatedCount = plan.notes.length - visibleNotes.length;

  body.innerHTML = `
    <p class="profile-edit-hint">
      ${tp('ankiImport.summary.found', plan.totalNotes)}
      ${t('ankiImport.summary.ok', { n: plan.okCount })}
      ${t('ankiImport.summary.skipped', { n: plan.skippedCount })}
      ${plan.duplicateCount ? `<br>${t('ankiImport.summary.duplicates', { n: plan.duplicateCount })}` : ''}
      ${plan.mediaCount ? `<br>${t('ankiImport.summary.media', { n: plan.mediaCount })}` : ''}
    </p>
    ${ankiImportDeckSummaryHTML(plan)}
    ${ankiImportTagsSummaryHTML(plan)}
    <div class="admin-recipients-summary">
      <span class="pill" id="anki-import-counter">${t('ankiImport.counterNone')}</span>
      <div class="admin-recipients-actions">
        <a href="#" class="admin-select-link" id="anki-import-select-all">${t('ankiImport.selectAll')}</a>
        <a href="#" class="admin-select-link" id="anki-import-clear">${t('ankiImport.clear')}</a>
      </div>
    </div>
    <div id="anki-import-list" style="max-height:320px; overflow-y:auto;">
      ${visibleNotes.map(ankiImportNoteRowHTML).join('')}
      ${truncatedCount > 0 ? `<p class="profile-edit-hint">${tp('ankiImport.truncated', truncatedCount)}</p>` : ''}
    </div>
    <button type="button" class="btn btn-primary btn-block" id="anki-import-confirm-btn" style="margin-top:10px;">${t('ankiImport.confirm')}</button>
    <p class="profile-edit-error" id="anki-import-confirm-error"></p>
  `;
  wireAnkiImportSummary(body);
  updateAnkiImportCounter(body);
}

function updateAnkiImportCounter(body){
  const n = ANKI_IMPORT_STATE.selectedIds.size;
  const counter = body.querySelector('#anki-import-counter');
  if (counter) counter.textContent = n === 0 ? t('ankiImport.counterNone') : tp('ankiImport.counter', n);
  const btn = body.querySelector('#anki-import-confirm-btn');
  if (btn) btn.disabled = n === 0;
}

function wireAnkiImportSummary(body){
  body.querySelectorAll('.anki-import-note-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.ankiNoteId);
      if (cb.checked) ANKI_IMPORT_STATE.selectedIds.add(id);
      else ANKI_IMPORT_STATE.selectedIds.delete(id);
      updateAnkiImportCounter(body);
    });
  });
  body.querySelector('#anki-import-select-all')?.addEventListener('click', (e) => {
    e.preventDefault();
    ANKI_IMPORT_STATE.selectedIds = new Set(ANKI_IMPORT_STATE.plan.notes.filter(n => n.ok).map(n => n.ankiNoteId));
    body.querySelectorAll('.anki-import-note-check').forEach(cb => { cb.checked = true; });
    updateAnkiImportCounter(body);
  });
  body.querySelector('#anki-import-clear')?.addEventListener('click', (e) => {
    e.preventDefault();
    ANKI_IMPORT_STATE.selectedIds = new Set();
    body.querySelectorAll('.anki-import-note-check').forEach(cb => { cb.checked = false; });
    updateAnkiImportCounter(body);
  });
  body.querySelector('#anki-import-confirm-btn')?.addEventListener('click', () => confirmAnkiImport(body));
}

async function confirmAnkiImport(body){
  const errorEl = body.querySelector('#anki-import-confirm-error');
  if (errorEl) errorEl.textContent = '';
  const selectedNotes = ANKI_IMPORT_STATE.plan.notes.filter(n => n.ok && ANKI_IMPORT_STATE.selectedIds.has(n.ankiNoteId));
  if (!selectedNotes.length) return;

  // Section 23 -- bloqueia ANTES de escrever qualquer coisa (nunca uma
  // importação parcial silenciosa por causa do limite), mesmo padrão de
  // shared/public-profile.js (importSelectedPublicFlashcards).
  // Fase F -- regra única por CardInstance (Normal com reverso=2, Cloze=N).
  const pre = preflightOwnCardInstanceCreation({
    activeRows: ANKI_IMPORT_STATE.existingRows,
    hasTeacherLink: ANKI_IMPORT_STATE.hasLink,
    editorStates: selectedNotes.map(n => n.editorState),
    languageAppKey: APP_KEY,
    limit: FREE_OWN_FLASHCARD_LIMIT,
  });
  if (!pre.ok){
    const limitModal = document.getElementById('flashcard-limit-modal');
    if (limitModal) limitModal.style.display = 'flex';
    else if (errorEl) errorEl.textContent = (typeof window.t === 'function') ? window.t('flashcardLimit.fallbackError') : 'Você atingiu o limite de cartões do plano grátis.';
    return;
  }

  const btn = body.querySelector('#anki-import-confirm-btn');
  if (btn){ btn.disabled = true; btn.textContent = t('ankiImport.importing'); }

  // Fase F -- Deck padrão (personal_root) resolvido antes de qualquer
  // escrita; sem destino válido nada é criado (nem mídia enviada).
  const dest = await resolveOwnCreationDeck({ languageAppKey: APP_KEY });
  if (!dest.ok){
    if (errorEl) errorEl.textContent = dest.error;
    if (btn){ btn.disabled = false; btn.textContent = t('ankiImport.confirm'); }
    return;
  }
  const mediaWarnings = [];
  let doneCount = 0;
  for (const note of selectedNotes){
    doneCount++;
    if (btn) btn.textContent = t('ankiImport.importingProgress', { done: doneCount, total: selectedNotes.length });
    if (note.hasMedia){
      const { warnings } = await resolveAndAttachAnkiMedia(note.mediaRefs, {
        parseResult: ANKI_IMPORT_STATE.parseResult,
        uploadFn: uploadOwnFlashcardMedia,
        mediaCache: ANKI_IMPORT_STATE.mediaCache,
      });
      mediaWarnings.push(...warnings);
    }
  }

  const identity = { owner_id: CURRENT_USER.id, language_app_key: APP_KEY, deck_id: dest.deckId };
  const persistResult = await persistAnkiImportBatches(selectedNotes, {
    identity,
    onBatchDone: (info) => {
      if (btn) btn.textContent = info.ok ? t('ankiImport.savingBatches', { n: info.batchIndex + 1 }) : t('ankiImport.saveError');
    },
  });

  if (persistResult.createdRows && persistResult.createdRows.length && typeof addSelfFlashcardToState === 'function'){
    persistResult.createdRows.forEach(row => addSelfFlashcardToState(row));
  }

  renderAnkiImportResult(body, {
    requested: selectedNotes.length,
    imported: persistResult.createdRows.length,
    ok: persistResult.ok,
    error: persistResult.error,
    skippedNotes: ANKI_IMPORT_STATE.plan.notes.filter(n => !n.ok),
    mediaWarnings,
  });
}

function renderAnkiImportResult(body, result){
  const skippedList = result.skippedNotes.slice(0, 50).map(n => `<li>${escapeHTML(n.warning || t('ankiImport.skippedFallback'))}</li>`).join('');
  body.innerHTML = `
    <p class="profile-edit-hint">
      ${result.ok
        ? tp('ankiImport.result.ok', result.requested, { imported: result.imported })
        : t('ankiImport.result.partial', { imported: result.imported, requested: result.requested })}
    </p>
    ${result.mediaWarnings.length ? `<p class="profile-edit-hint">${tp('ankiImport.result.mediaWarn', result.mediaWarnings.length, { list: result.mediaWarnings.slice(0, 5).map(escapeHTML).join('; '), more: result.mediaWarnings.length > 5 ? '...' : '' })}</p>` : ''}
    ${skippedList ? `<div class="section-label" style="margin-top:10px;">${t('ankiImport.result.skippedTitle', { n: result.skippedNotes.length })}</div><ul class="profile-edit-hint" style="padding-left:18px;">${skippedList}</ul>` : ''}
    <button type="button" class="btn btn-secondary btn-block" id="anki-import-done-btn" style="margin-top:10px;">${t('common.close')}</button>
  `;
  body.querySelector('#anki-import-done-btn')?.addEventListener('click', () => {
    document.getElementById('anki-import-modal').style.display = 'none';
    if (typeof renderMyFlashcardsView === 'function') renderMyFlashcardsView();
  });
}
