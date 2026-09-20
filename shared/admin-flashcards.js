// ---------- Flashcards (admin) -- Fase 2/3 do sistema de alunas particulares ----------
// Autoria de flashcard pela professora, atribuído a uma aluna específica.
// Desde a Fase 3, o cartão criado aqui é mesclado em STATE.cards da aluna
// (fr/zh app.js, mergeTeacherFlashcardsIntoState) e passa a ser revisável
// via getStudyQueue()/FSRS -- ver CLAUDE.md.
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-flashcards.js (fetchFlashcardsForStudent, createFlashcard, setFlashcardStatus)
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

  const cardRowHTML = (c) => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
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

  document.getElementById('admin-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-flashcard-btn');
    const errorEl = document.getElementById('admin-create-flashcard-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await createFlashcard({
      studentId: ADMIN_FLASHCARDS_STATE.studentId,
      languageAppKey: current.language_app_key,
      front: document.getElementById('admin-flashcard-front').value,
      backTrans: document.getElementById('admin-flashcard-back').value,
      note: document.getElementById('admin-flashcard-note').value,
      frontPinyin: document.getElementById('admin-flashcard-pinyin')?.value,
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
