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
//   4. Confirmar -- limite do plano grátis "corta e avisa" (só as primeiras
//      Notes que cabem), cria os Decks das pastas do Anki abaixo do Deck de
//      destino escolhido (só agora, nunca no preview), resolve+sobe mídia só
//      das Notes que serão criadas, persiste em lotes (atômico por lote)
//   5. Resultado -- quantas importadas, quantas puladas, avisos
//
// Depende de (mesma posição de shared/my-flashcards.js -- depois de
// shared/anki-import.js):
//   - shared/anki-parser.js  (parseApkgFile)
//   - shared/anki-import.js  (buildAnkiImportPlan, resolveAndAttachAnkiMedia,
//                              persistAnkiImportBatches, planAnkiDeckDestinations,
//                              executeAnkiDeckCreations, ankiNoteDeckKey)
//   - shared/deck-engine.js  (planOwnCardInstanceCut, ownCardInstanceCutMessage)
//   - shared/deck-data.js    (ensureDecksForCurrentUser, fetchDecksForLanguage,
//                              resolveOwnCreationDeck, createPersonalDeck)
//   - shared/my-flashcards.js (personalDeckOptionsHTML, openFlashcardLimitModal)
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
  // Destino em Deck (seções 5.3/22/23 da arquitetura): Deck escolhido em
  // Meus Decks, recriar ou não as pastas do Anki, e a escolha única pros
  // conflitos de nome ('suffix' | 'merge' | null = ainda não escolhida).
  decks: [],
  destDeckId: null,
  keepFolders: true,
  conflictMode: null,
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
        <h3>📥 Importar do Anki</h3>
        <button class="app-modal-close" id="anki-import-close" aria-label="Fechar">✕</button>
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
  body.innerHTML = loadingHTML('Lendo o arquivo .apkg...');

  ANKI_IMPORT_STATE.plan = null;
  ANKI_IMPORT_STATE.parseResult = null;
  ANKI_IMPORT_STATE.selectedIds = new Set();
  ANKI_IMPORT_STATE.mediaCache = new Map();

  let arrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (e) {
    body.innerHTML = ankiImportErrorHTML('Não foi possível ler o arquivo escolhido.');
    return;
  }

  let SQL;
  try {
    SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
  } catch (e) {
    body.innerHTML = ankiImportErrorHTML('Não foi possível carregar o leitor de banco de dados agora. Tente novamente em instantes.');
    return;
  }
  if (typeof JSZip === 'undefined'){
    body.innerHTML = ankiImportErrorHTML('Não foi possível carregar o leitor de .zip agora. Tente novamente em instantes.');
    return;
  }

  const parseResult = await parseApkgFile(arrayBuffer, { SQL, JSZipCtor: JSZip });
  if (!parseResult.ok){
    body.innerHTML = ankiImportErrorHTML(parseResult.error);
    return;
  }
  ANKI_IMPORT_STATE.parseResult = parseResult;

  body.innerHTML = loadingHTML('Analisando os cartões...');
  const [existingRows, hasLink, boot] = await Promise.all([
    fetchMyOwnFlashcards(APP_KEY),
    hasUnlimitedOwnCards(),
    ensureDecksForCurrentUser(APP_KEY),
  ]);
  ANKI_IMPORT_STATE.existingRows = existingRows;
  ANKI_IMPORT_STATE.hasLink = hasLink;
  // Só LEITURA dos Decks aqui (o bootstrap root/personal_root é idempotente
  // e já é feito por Meus Cartões) -- nenhum Deck do .apkg é criado antes
  // da confirmação.
  ANKI_IMPORT_STATE.decks = await fetchDecksForLanguage(APP_KEY);
  ANKI_IMPORT_STATE.destDeckId = (boot && boot.ok) ? boot.personalRootDeckId : null;
  ANKI_IMPORT_STATE.keepFolders = true;
  ANKI_IMPORT_STATE.conflictMode = null;

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
          <div class="admin-badge-name">🚫 ${escapeHTML(note.deckName || 'Sem baralho')}</div>
          <div class="admin-badge-desc">${escapeHTML(note.warning)}</div>
        </div>
      </label>`;
  }
  const typeLabel = ANKI_IMPORT_CARD_TYPE_LABELS[note.cardTypeLabel] || note.cardTypeLabel;
  const tagPills = (note.normalizedTags || []).map(t => `<span class="pill" style="font-size:10px;">#${escapeHTML(t)}</span>`).join(' ');
  const badges = [
    `<span class="pill" style="font-size:11px;">${escapeHTML(typeLabel)}</span>`,
    note.hasMedia ? `<span class="pill" style="font-size:11px;">🎧🖼️ mídia</span>` : '',
    note.isDuplicate ? `<span class="pill" style="font-size:11px;">⚠️ possível duplicata</span>` : '',
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

// Lista indentada da hierarquia de Decks encontrada no .apkg (pra a pessoa
// conferir o que será recriado abaixo do Deck de destino).
function ankiDeckTreeRowsHTML(node, depth){
  return node.children.map(child => {
    const indent = depth * 16;
    const childRows = ankiDeckTreeRowsHTML(child, depth + 1);
    return `<div style="padding-left:${indent}px; font-size:13px; color:var(--ink-soft);">📁 ${escapeHTML(child.name)} <span style="opacity:.75;">(${child.count})</span></div>${childRows}`;
  }).join('');
}

// Notes importáveis (ok) -- base pra detectar conflitos de nome antes da
// confirmação. Na confirmação o plano é refeito só com as Notes que serão
// de fato criadas (seleção + corte do plano grátis).
function ankiImportOkNotes(){
  return ANKI_IMPORT_STATE.plan.notes.filter(n => n.ok);
}

function ankiImportDestinationHTML(plan){
  const hasFolders = plan.deckTree && plan.deckTree.children.length > 0;
  const options = (typeof personalDeckOptionsHTML === 'function') ? personalDeckOptionsHTML(ANKI_IMPORT_STATE.decks) : '';
  return `
    <div class="profile-edit-hint" style="margin-top:8px;">
      <label class="profile-edit-label" for="anki-import-dest-deck"><strong>📚 Importar para o Deck:</strong></label>
      <select id="anki-import-dest-deck" class="profile-edit-input">${options}</select>
      ${hasFolders ? `
        <label style="display:flex; gap:6px; align-items:center; margin-top:6px;">
          <input type="checkbox" id="anki-import-keep-folders" ${ANKI_IMPORT_STATE.keepFolders ? 'checked' : ''}>
          Manter as pastas do Anki (recriar como Decks dentro do Deck escolhido)
        </label>
        <div style="margin-top:4px; max-height:120px; overflow-y:auto;">${ankiDeckTreeRowsHTML(plan.deckTree, 0)}</div>` : ''}
      <div id="anki-import-conflicts"></div>
    </div>`;
}

// Recalcula e desenha os conflitos de nome para o destino/opção atuais.
function refreshAnkiImportConflicts(body){
  const box = body.querySelector('#anki-import-conflicts');
  if (!box) return;
  const st = ANKI_IMPORT_STATE;
  const plan = planAnkiDeckDestinations({ decks: st.decks, destDeckId: st.destDeckId, notes: ankiImportOkNotes(), keepFolders: st.keepFolders, conflictMode: null });
  st._conflictCount = plan.conflicts.length;
  if (!plan.conflicts.length){ box.innerHTML = ''; updateAnkiImportCounter(body); return; }
  const names = plan.conflicts.slice(0, 8).map(c => `<li>${escapeHTML(c.path.join(' › '))}</li>`).join('');
  box.innerHTML = `
    <div style="margin-top:8px; padding:8px 10px; border:1px solid var(--paper-line); border-radius:8px;">
      <strong>Um deck com este nome já existe. O que você deseja fazer?</strong>
      <ul style="padding-left:18px; margin:4px 0;">${names}${plan.conflicts.length > 8 ? `<li>+ ${plan.conflicts.length - 8} outro(s)</li>` : ''}</ul>
      <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="anki-import-conflict" value="suffix" ${st.conflictMode === 'suffix' ? 'checked' : ''}> Criar com sufixo (2)</label>
      <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="anki-import-conflict" value="merge" ${st.conflictMode === 'merge' ? 'checked' : ''}> Inserir no Deck existente</label>
      <span class="profile-edit-hint">A escolha vale para todos os decks repetidos desta importação. Ao inserir no Deck existente, cartões que parecem já existir continuam desmarcados.</span>
    </div>`;
  box.querySelectorAll('input[name="anki-import-conflict"]').forEach(r => r.addEventListener('change', () => {
    st.conflictMode = r.value;
    updateAnkiImportCounter(body);
  }));
  updateAnkiImportCounter(body);
}

function ankiImportTagsSummaryHTML(plan){
  if (!plan.tagsPresent) return '';
  const shown = plan.uniqueTags.slice(0, 20);
  const pills = shown.map(t => `<span class="pill" style="font-size:11px;">#${escapeHTML(t)}</span>`).join(' ');
  return `
    <div class="profile-edit-hint" style="margin-top:8px;">
      <strong>🏷️ Tags encontradas (${plan.uniqueTags.length}):</strong>
      <div style="margin-top:4px;">${pills}${plan.uniqueTags.length > shown.length ? ' …' : ''}</div>
      As tags serão salvas em cada cartão (Note) exatamente como no Anki (normalizadas -- minúsculas, sem acento, espaços viram "-") e ficarão disponíveis pra filtro quando o Painel existir.
    </div>`;
}

function renderAnkiImportSummary(body){
  const plan = ANKI_IMPORT_STATE.plan;
  const visibleNotes = plan.notes.slice(0, ANKI_IMPORT_MAX_VISIBLE_ROWS);
  const truncatedCount = plan.notes.length - visibleNotes.length;

  body.innerHTML = `
    <p class="profile-edit-hint">
      <strong>${plan.totalNotes}</strong> cartão(ões) encontrado(s) no arquivo --
      <strong>${plan.okCount}</strong> podem ser importados nativamente,
      <strong>${plan.skippedCount}</strong> não puderam ser reconhecidos com segurança (ver avisos abaixo, ficam de fora).
      ${plan.duplicateCount ? `<br>⚠️ ${plan.duplicateCount} parecem já existir na sua conta (desmarcados por padrão, mas você pode marcar mesmo assim).` : ''}
      ${plan.mediaCount ? `<br>🎧🖼️ ${plan.mediaCount} têm áudio/imagem -- só é baixado/enviado dos cartões que você de fato confirmar.` : ''}
    </p>
    ${ankiImportDestinationHTML(plan)}
    ${ankiImportTagsSummaryHTML(plan)}
    <div class="admin-recipients-summary">
      <span class="pill" id="anki-import-counter">Nenhum cartão selecionado</span>
      <div class="admin-recipients-actions">
        <a href="#" class="admin-select-link" id="anki-import-select-all">Selecionar todos</a>
        <a href="#" class="admin-select-link" id="anki-import-clear">Limpar seleção</a>
      </div>
    </div>
    <div id="anki-import-list" style="max-height:320px; overflow-y:auto;">
      ${visibleNotes.map(ankiImportNoteRowHTML).join('')}
      ${truncatedCount > 0 ? `<p class="profile-edit-hint">+ ${truncatedCount} outro(s) cartão(ões) não mostrados aqui (a seleção "Selecionar todos" inclui todos mesmo assim).</p>` : ''}
    </div>
    <button type="button" class="btn btn-primary btn-block" id="anki-import-confirm-btn" style="margin-top:10px;">Confirmar importação</button>
    <p class="profile-edit-error" id="anki-import-confirm-error"></p>
  `;
  wireAnkiImportSummary(body);
  updateAnkiImportCounter(body);
}

function updateAnkiImportCounter(body){
  const n = ANKI_IMPORT_STATE.selectedIds.size;
  const counter = body.querySelector('#anki-import-counter');
  if (counter) counter.textContent = n === 0 ? 'Nenhum cartão selecionado' : `${n} cartão(ões) selecionado(s)`;
  const btn = body.querySelector('#anki-import-confirm-btn');
  // Com conflito de nome pendente (pastas mantidas), a pessoa precisa
  // escolher sufixo ou inserir no existente antes de confirmar.
  const needsChoice = ANKI_IMPORT_STATE.keepFolders && (ANKI_IMPORT_STATE._conflictCount || 0) > 0 && !ANKI_IMPORT_STATE.conflictMode;
  if (btn) btn.disabled = n === 0 || needsChoice;
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
  const destSel = body.querySelector('#anki-import-dest-deck');
  if (destSel){
    if (ANKI_IMPORT_STATE.destDeckId != null) destSel.value = String(ANKI_IMPORT_STATE.destDeckId);
    destSel.addEventListener('change', () => {
      ANKI_IMPORT_STATE.destDeckId = Number(destSel.value);
      ANKI_IMPORT_STATE.conflictMode = null;
      refreshAnkiImportConflicts(body);
    });
  }
  body.querySelector('#anki-import-keep-folders')?.addEventListener('change', (e) => {
    ANKI_IMPORT_STATE.keepFolders = !!e.target.checked;
    ANKI_IMPORT_STATE.conflictMode = null;
    refreshAnkiImportConflicts(body);
  });
  refreshAnkiImportConflicts(body);
}

async function confirmAnkiImport(body){
  const errorEl = body.querySelector('#anki-import-confirm-error');
  if (errorEl) errorEl.textContent = '';
  const selectedNotes = ANKI_IMPORT_STATE.plan.notes.filter(n => n.ok && ANKI_IMPORT_STATE.selectedIds.has(n.ankiNoteId));
  if (!selectedNotes.length) return;

  const st = ANKI_IMPORT_STATE;
  // "Corta e avisa" (arquitetura seção 17): no plano grátis, só as
  // primeiras Notes cujos CardInstances cabem no teto são criadas (nunca
  // uma Note pela metade); o resto fica de fora e a pessoa é avisada.
  // Regra única por CardInstance em shared/deck-engine.js.
  const cutPlan = planOwnCardInstanceCut({
    activeRows: st.existingRows,
    hasTeacherLink: st.hasLink,
    editorStates: selectedNotes.map(n => n.editorState),
    languageAppKey: APP_KEY,
    limit: FREE_OWN_FLASHCARD_LIMIT,
  });
  const cutMessage = cutPlan.cut ? ownCardInstanceCutMessage({
    requested: cutPlan.requested, keptInstances: cutPlan.keptInstances,
    limit: FREE_OWN_FLASHCARD_LIMIT, used: cutPlan.used, what: 'Este Deck',
  }) : null;
  if (cutPlan.keepCount === 0){
    if (typeof openFlashcardLimitModal !== 'function' || !openFlashcardLimitModal({ cutMessage })){
      if (errorEl) errorEl.textContent = cutMessage;
    }
    return;
  }
  const notesToCreate = selectedNotes.slice(0, cutPlan.keepCount);

  const btn = body.querySelector('#anki-import-confirm-btn');
  const resetBtn = () => { if (btn){ btn.disabled = false; btn.textContent = 'Confirmar importação'; } };
  if (btn){ btn.disabled = true; btn.textContent = 'Importando...'; }

  // Deck de destino escolhido (padrão: Meus Decks), validado antes de
  // qualquer escrita; sem destino válido nada é criado (nem mídia enviada).
  const dest = await resolveOwnCreationDeck({ languageAppKey: APP_KEY, deckId: st.destDeckId, decks: st.decks });
  if (!dest.ok){
    if (errorEl) errorEl.textContent = dest.error;
    resetBtn();
    return;
  }

  // Pastas do Anki: planejadas só com as Notes que serão criadas e
  // criadas AGORA (depois da confirmação). Falha num Deck = as Notes
  // daquele ramo não são importadas.
  // Política conservadora (seção 23): se houver Deck de mesmo nome e a
  // pessoa ainda não escolheu "sufixo" ou "inserir" (ex.: o preview não
  // conseguiu detectar o conflito), não decide por ela -- para e pergunta.
  if (st.keepFolders && !st.conflictMode){
    const check = planAnkiDeckDestinations({ decks: dest.decks, destDeckId: dest.deckId, notes: notesToCreate, keepFolders: true, conflictMode: null });
    if (check.conflicts.length){
      st.decks = dest.decks;
      st.destDeckId = dest.deckId;
      resetBtn();
      refreshAnkiImportConflicts(body); // mostra a pergunta e trava o botão até a escolha
      if (errorEl) errorEl.textContent = 'Já existem Decks com estes nomes. Escolha acima o que fazer antes de importar.';
      return;
    }
  }
  const destPlan = planAnkiDeckDestinations({
    decks: dest.decks, destDeckId: dest.deckId, notes: notesToCreate,
    keepFolders: st.keepFolders, conflictMode: st.conflictMode,
  });
  if (btn && destPlan.creations.length) btn.textContent = 'Criando Decks...';
  const deckExec = await executeAnkiDeckCreations(destPlan, {
    createFn: createPersonalDeck, decks: dest.decks, languageAppKey: APP_KEY,
  });
  if (typeof STATE !== 'undefined' && deckExec.createdDecks.length) STATE.decks = deckExec.decks;
  const entries = [];
  let deckFailedCount = 0;
  notesToCreate.forEach(n => {
    const key = ankiNoteDeckKey(n, destPlan);
    const deckId = deckExec.idByKey.get(key);
    if (deckId == null || deckExec.failedKeys.has(key)){ deckFailedCount++; return; }
    entries.push({ note: n, deckId });
  });

  const mediaWarnings = [];
  let doneCount = 0;
  for (const { note } of entries){
    doneCount++;
    if (btn) btn.textContent = `Importando ${doneCount}/${entries.length}...`;
    if (note.hasMedia){
      const { warnings } = await resolveAndAttachAnkiMedia(note.mediaRefs, {
        parseResult: st.parseResult,
        uploadFn: uploadOwnFlashcardMedia,
        mediaCache: st.mediaCache,
      });
      mediaWarnings.push(...warnings);
    }
  }

  const identity = { owner_id: CURRENT_USER.id, language_app_key: APP_KEY, deck_id: dest.deckId };
  const persistResult = entries.length
    ? await persistAnkiImportBatches(entries.map(e => ({ editorState: e.note.editorState, deckId: e.deckId })), {
        identity,
        onBatchDone: (info) => {
          if (btn) btn.textContent = info.ok ? `Salvando... (${info.batchIndex + 1} lote(s) ok)` : 'Erro ao salvar.';
        },
      })
    : { ok: true, createdRows: [] };

  if (persistResult.createdRows && persistResult.createdRows.length && typeof addSelfFlashcardToState === 'function'){
    persistResult.createdRows.forEach(row => addSelfFlashcardToState(row));
  }

  renderAnkiImportResult(body, {
    requested: selectedNotes.length,
    imported: persistResult.createdRows.length,
    ok: persistResult.ok,
    error: persistResult.error,
    skippedNotes: st.plan.notes.filter(n => !n.ok),
    mediaWarnings,
    deckErrors: deckExec.errors,
    deckFailedCount,
    createdDeckCount: deckExec.createdDecks.length,
    cutMessage,
    cutCount: selectedNotes.length - notesToCreate.length,
  });
  if (cutMessage && typeof openFlashcardLimitModal === 'function') openFlashcardLimitModal({ cutMessage });
}

function renderAnkiImportResult(body, result){
  const skippedList = result.skippedNotes.slice(0, 50).map(n => `<li>${escapeHTML(n.warning || 'Cartão pulado.')}</li>`).join('');
  body.innerHTML = `
    <p class="profile-edit-hint">
      ${result.ok
        ? `✓ <strong>${result.imported}</strong> de ${result.requested} cartão(ões) selecionados foram importados com sucesso.${result.createdDeckCount ? ` ${result.createdDeckCount} Deck(s) criado(s) a partir das pastas do Anki.` : ''}`
        : `⚠️ A importação parou no meio -- <strong>${result.imported}</strong> de ${result.requested} cartões já foram salvos com sucesso antes da falha. Os já importados NÃO serão duplicados se você tentar de novo (essa mesma tentativa vai detectar os que já existem).`}
    </p>
    ${result.cutMessage ? `<p class="profile-edit-hint">🔒 ${escapeHTML(result.cutMessage)} (${result.cutCount} cartão(ões) do Anki ficaram de fora.)</p>` : ''}
    ${result.deckErrors && result.deckErrors.length ? `<p class="profile-edit-error" style="display:block;">⚠️ ${result.deckErrors.slice(0, 5).map(escapeHTML).join(' ')} (${result.deckFailedCount} cartão(ões) não importados.)</p>` : ''}
    ${result.mediaWarnings.length ? `<p class="profile-edit-hint">⚠️ ${result.mediaWarnings.length} mídia(s) não puderam ser incluídas (o texto do cartão foi importado normalmente): ${result.mediaWarnings.slice(0, 5).map(escapeHTML).join('; ')}${result.mediaWarnings.length > 5 ? '...' : ''}</p>` : ''}
    ${skippedList ? `<div class="section-label" style="margin-top:10px;">Cartões pulados (${result.skippedNotes.length})</div><ul class="profile-edit-hint" style="padding-left:18px;">${skippedList}</ul>` : ''}
    <button type="button" class="btn btn-secondary btn-block" id="anki-import-done-btn" style="margin-top:10px;">Fechar</button>
  `;
  body.querySelector('#anki-import-done-btn')?.addEventListener('click', () => {
    document.getElementById('anki-import-modal').style.display = 'none';
    if (typeof myFlashcardsAfterChange === 'function') myFlashcardsAfterChange();
  });
}
