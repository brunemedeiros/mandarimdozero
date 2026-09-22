// ---------- Flashcards (admin) -- Fase 2/3 do sistema de alunas particulares ----------
// Autoria de flashcard pela professora, atribuído a uma aluna específica.
// Desde a Fase 3, o cartão criado aqui é mesclado em STATE.cards da aluna
// (fr/zh app.js, mergeTeacherFlashcardsIntoState) e passa a ser revisável
// via getStudyQueue()/FSRS -- ver CLAUDE.md.
//
// Fase 8a: 3 novos formatos, todos opcionais e independentes entre si --
// imagem, áudio próprio (upload real, diferente do TTS automático que o
// app já tem pra pronúncia) e múltipla escolha (grillado: o cartão vira
// quiz em QUALQUER modo de revisão quando tem respostas erradas
// cadastradas, não só Speed Review -- render em fr/zh app.js).
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-flashcards.js (fetchFlashcardsForStudent, createFlashcard, setFlashcardStatus, uploadFlashcardMedia)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_FLASHCARDS_STATE = { studentId: null };

async function renderAdminFlashcardsView(){
  const wrap = document.getElementById('admin-flashcards-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const students = await fetchMyStudents();
  if (!students.length){
    wrap.innerHTML = `<p class="profile-empty-note">Vincule uma aluna primeiro, na aba "🎓 Alunos", pra poder criar flashcards pra ela.</p>`;
    return;
  }

  if (!ADMIN_FLASHCARDS_STATE.studentId || !students.some(s => s.student_id === ADMIN_FLASHCARDS_STATE.studentId)){
    ADMIN_FLASHCARDS_STATE.studentId = students[0].student_id;
  }
  const current = students.find(s => s.student_id === ADMIN_FLASHCARDS_STATE.studentId);

  const studentOptionsHTML = students.map(s => `<option value="${s.student_id}" ${s.student_id === ADMIN_FLASHCARDS_STATE.studentId ? 'selected' : ''}>@${s.username || '(usuário removido)'} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}</option>`).join('');

  const cards = await fetchFlashcardsForStudent(ADMIN_FLASHCARDS_STATE.studentId);
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');

  // Fase 8a -- badges curtos indicando os formatos extras do cartão, só
  // quando presentes (cartão comum não ganha nenhum badge novo).
  const formatBadgesHTML = (c) => [
    c.image_url ? '🖼️ imagem' : '',
    c.audio_url ? '🎧 áudio' : '',
    (c.choices && c.choices.length) ? '🔤 múltipla escolha' : '',
  ].filter(Boolean).join(' · ');

  const cardRowHTML = (c) => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}${formatBadgesHTML(c) ? ' · ' + formatBadgesHTML(c) : ''}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
    </div>
  `;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Aluna</div>
      <select id="admin-flashcard-student-select" class="profile-edit-input">${studentOptionsHTML}</select>
    </div>

    <div class="profile-section">
      <div class="section-label">Novo flashcard${current ? ` -- ${STUDENT_LANGUAGE_LABELS[current.language_app_key] || current.language_app_key}` : ''}</div>
      <form id="admin-create-flashcard-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-flashcard-front">Frente (no idioma estudado)</label>
        <input type="text" id="admin-flashcard-front" class="profile-edit-input" placeholder="${current && current.language_app_key === 'mandarim' ? 'ex: 图书馆' : 'ex: la bibliothèque'}" autocomplete="off">
        ${current && current.language_app_key === 'mandarim' ? `
        <label class="profile-edit-label" for="admin-flashcard-pinyin">Pinyin</label>
        <input type="text" id="admin-flashcard-pinyin" class="profile-edit-input" placeholder="ex: túshūguǎn" autocomplete="off">
        ` : ''}
        <label class="profile-edit-label" for="admin-flashcard-back">Verso (tradução)</label>
        <input type="text" id="admin-flashcard-back" class="profile-edit-input" placeholder="ex: a biblioteca" autocomplete="off">
        <label class="profile-edit-label" for="admin-flashcard-note">Nota (opcional)</label>
        <input type="text" id="admin-flashcard-note" class="profile-edit-input" placeholder="contexto, dica de uso..." autocomplete="off">
        <label class="profile-edit-label" for="admin-flashcard-image">Imagem (opcional)</label>
        <input type="file" id="admin-flashcard-image" class="profile-edit-input" accept="image/*">
        <label class="profile-edit-label" for="admin-flashcard-audio">Áudio próprio (opcional, além da pronúncia automática)</label>
        <input type="file" id="admin-flashcard-audio" class="profile-edit-input" accept="audio/*">
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="admin-flashcard-mc-toggle">
          Múltipla escolha (o cartão vira quiz de opções em vez de virar cartão)
        </label>
        <div id="admin-flashcard-mc-fields" style="display:none;">
          <label class="profile-edit-label" for="admin-flashcard-mc-1">Opção errada 1</label>
          <input type="text" id="admin-flashcard-mc-1" class="profile-edit-input" autocomplete="off">
          <label class="profile-edit-label" for="admin-flashcard-mc-2">Opção errada 2 (opcional)</label>
          <input type="text" id="admin-flashcard-mc-2" class="profile-edit-input" autocomplete="off">
          <label class="profile-edit-label" for="admin-flashcard-mc-3">Opção errada 3 (opcional)</label>
          <input type="text" id="admin-flashcard-mc-3" class="profile-edit-input" autocomplete="off">
        </div>
        <p class="profile-edit-error" id="admin-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-flashcard-btn">Criar cartão</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Cartões ativos (${activeCards.length})</div>
      ${activeCards.length ? activeCards.map(cardRowHTML).join('') : `<p class="profile-empty-note">Nenhum cartão ainda pra esta aluna.</p>`}
    </div>

    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados (${archivedCards.length})</div>
      ${archivedCards.map(cardRowHTML).join('')}
    </div>` : ''}
  `;

  document.getElementById('admin-flashcard-student-select').addEventListener('change', (e) => {
    ADMIN_FLASHCARDS_STATE.studentId = e.target.value;
    renderAdminFlashcardsView();
  });

  document.getElementById('admin-flashcard-mc-toggle').addEventListener('change', (e) => {
    document.getElementById('admin-flashcard-mc-fields').style.display = e.target.checked ? '' : 'none';
  });

  document.getElementById('admin-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-flashcard-btn');
    const errorEl = document.getElementById('admin-create-flashcard-error');
    errorEl.textContent = '';
    btn.disabled = true;

    // Fase 8a -- upload de imagem/áudio ANTES de criar o cartão (a URL
    // pública precisa existir pra gravar junto no insert). Se um upload
    // falhar, aborta sem criar um cartão pela metade.
    const imageFile = document.getElementById('admin-flashcard-image').files[0];
    const audioFile = document.getElementById('admin-flashcard-audio').files[0];
    let imageUrl = null, audioUrl = null;
    if (imageFile){
      const up = await uploadFlashcardMedia(imageFile, 'image');
      if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
      imageUrl = up.url;
    }
    if (audioFile){
      const up = await uploadFlashcardMedia(audioFile, 'audio');
      if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
      audioUrl = up.url;
    }

    const isMC = document.getElementById('admin-flashcard-mc-toggle').checked;
    const choices = isMC ? [
      document.getElementById('admin-flashcard-mc-1').value,
      document.getElementById('admin-flashcard-mc-2').value,
      document.getElementById('admin-flashcard-mc-3').value,
    ] : [];
    if (isMC && !choices.some(c => c.trim())){
      btn.disabled = false;
      errorEl.textContent = 'Digite pelo menos 1 opção errada pra ativar múltipla escolha.';
      return;
    }

    const result = await createFlashcard({
      studentId: ADMIN_FLASHCARDS_STATE.studentId,
      languageAppKey: current.language_app_key,
      front: document.getElementById('admin-flashcard-front').value,
      backTrans: document.getElementById('admin-flashcard-back').value,
      note: document.getElementById('admin-flashcard-note').value,
      frontPinyin: document.getElementById('admin-flashcard-pinyin')?.value,
      imageUrl, audioUrl, choices,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast('✓ Cartão criado.');
    renderAdminFlashcardsView();
  });

  wrap.querySelectorAll('[data-toggle-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setFlashcardStatus(btn.dataset.toggleFlashcard, btn.dataset.nextStatus);
      renderAdminFlashcardsView();
    });
  });
}
