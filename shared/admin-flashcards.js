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
// Pós-Fase 8a: campo "Aluna" virou multi-seleção (checkboxes) -- pedido da
// autora pra poder atribuir o MESMO cartão a várias alunas de uma vez, sem
// repetir o formulário. Um clique em "Criar cartão" cria uma linha em
// teacher_flashcards POR aluna selecionada (mesmo front/back/note/mídia/
// choices, cada linha com o language_app_key da PRÓPRIA aluna -- uma turma
// pode misturar francês e mandarim na mesma seleção). A lista de cartões
// abaixo do formulário passou a agregar as alunas selecionadas (antes era
// só a aluna do <select> único), com o @username prefixado em cada linha
// quando há mais de uma selecionada, pra não confundir de quem é o quê.
//
// Fase 8c: quarto formato, "Completar a frase" (grillado: a aluna digita a
// palavra que falta numa frase escrita pela professora). Mutuamente
// exclusivo com "Múltipla escolha" (marcar um desmarca o outro) -- os dois
// mudam a MECÂNICA de revisão do cartão, não faz sentido os dois juntos.
//
// Depende de (mesma posição de shared/admin-students.js -- antes de app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-flashcards.js (fetchFlashcardsForStudent, createFlashcard, setFlashcardStatus, uploadFlashcardMedia)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_FLASHCARDS_STATE = { studentIds: new Set() };

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

  // Descarta seleções de alunas que não existem mais (vínculo removido
  // entre um render e outro) e, se nada sobrou selecionado, cai de volta
  // pro comportamento antigo de "a primeira aluna já vem marcada".
  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_FLASHCARDS_STATE.studentIds = new Set([...ADMIN_FLASHCARDS_STATE.studentIds].filter(id => validIds.has(id)));
  if (!ADMIN_FLASHCARDS_STATE.studentIds.size){
    ADMIN_FLASHCARDS_STATE.studentIds.add(students[0].student_id);
  }

  const selectedStudents = students.filter(s => ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id));
  const anyMandarim = selectedStudents.some(s => s.language_app_key === 'mandarim');

  const studentCheckboxesHTML = students.map(s => `
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
      <input type="checkbox" data-student-checkbox value="${s.student_id}" ${ADMIN_FLASHCARDS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      @${escapeHTML(s.username || '(usuário removido)')} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  // Fase 8a -- badges curtos indicando os formatos extras do cartão, só
  // quando presentes (cartão comum não ganha nenhum badge novo).
  const formatBadgesHTML = (c) => [
    c.image_url ? '🖼️ imagem' : '',
    c.audio_url ? '🎧 áudio' : '',
    (c.choices && c.choices.length) ? '🔤 múltipla escolha' : '',
    c.cloze_sentence ? '📝 completar frase' : '',
  ].filter(Boolean).join(' · ');

  const cardRowHTML = (c) => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${selectedStudents.length > 1 ? `<span style="opacity:.6">@${escapeHTML(c.__studentUsername || '?')}</span> · ` : ''}${escapeHTML(c.front)}${c.front_pinyin ? ` (${escapeHTML(c.front_pinyin)})` : ''} → ${escapeHTML(c.back_trans)}</div>
        <div class="admin-badge-desc">${c.note ? escapeHTML(c.note) + ' · ' : ''}criado em ${new Date(c.created_at).toLocaleDateString('pt-BR')}${formatBadgesHTML(c) ? ' · ' + formatBadgesHTML(c) : ''}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-flashcard="${c.id}" data-next-status="${c.status === 'active' ? 'archived' : 'active'}" title="${c.status === 'active' ? 'Arquivar' : 'Reativar'}">${c.status === 'active' ? '🗃' : '↺'}</button>
    </div>
  `;

  // Cartões de TODAS as alunas selecionadas, agregados numa lista só --
  // antes era sempre 1 fetch (select único); agora reflete a mesma
  // seleção usada pra atribuir o próximo cartão.
  const cardLists = await Promise.all(selectedStudents.map(s => fetchFlashcardsForStudent(s.student_id)));
  const cards = cardLists.flatMap((list, i) => list.map(c => ({ ...c, __studentUsername: selectedStudents[i].username })));
  cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const activeCards = cards.filter(c => c.status === 'active');
  const archivedCards = cards.filter(c => c.status === 'archived');

  const newCardSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${selectedStudents.length} alunas selecionadas`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Alunas (selecione 1 ou mais)</div>
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-flashcard-select-all" style="font-size:13px;">Selecionar todas</a>
        <a href="#" id="admin-flashcard-select-none" style="font-size:13px;">Limpar seleção</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:block;">
        ${studentCheckboxesHTML}
      </div>
    </div>

    <div class="profile-section">
      <div class="section-label">Novo flashcard${newCardSubtitle}</div>
      <form id="admin-create-flashcard-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-flashcard-front">Frente (no idioma estudado)</label>
        <input type="text" id="admin-flashcard-front" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 图书馆' : 'ex: la bibliothèque'}" autocomplete="off">
        ${anyMandarim ? `
        <label class="profile-edit-label" for="admin-flashcard-pinyin">Pinyin (usado só nas alunas de mandarim selecionadas)</label>
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
        <label class="profile-edit-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="admin-flashcard-cloze-toggle">
          Completar a frase (a aluna digita a palavra que falta)
        </label>
        <div id="admin-flashcard-cloze-fields" style="display:none;">
          <label class="profile-edit-label" for="admin-flashcard-cloze-sentence">Frase com lacuna (use ___ pra marcar o espaço)</label>
          <input type="text" id="admin-flashcard-cloze-sentence" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 我 ___ 巴西人。' : 'ex: Je ___ de Paris.'}" autocomplete="off">
          <label class="profile-edit-label" for="admin-flashcard-cloze-answer">Resposta certa</label>
          <input type="text" id="admin-flashcard-cloze-answer" class="profile-edit-input" placeholder="${anyMandarim ? 'ex: 是' : 'ex: viens'}" autocomplete="off">
          ${anyMandarim ? `
          <label class="profile-edit-label" for="admin-flashcard-cloze-pinyin">Pinyin da resposta (é o que a aluna vai digitar)</label>
          <input type="text" id="admin-flashcard-cloze-pinyin" class="profile-edit-input" placeholder="ex: shì" autocomplete="off">
          ` : ''}
        </div>
        <p class="profile-edit-error" id="admin-create-flashcard-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-flashcard-btn">Criar cartão${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunas` : ''}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Cartões ativos (${activeCards.length})</div>
      ${activeCards.length ? activeCards.map(cardRowHTML).join('') : `<p class="profile-empty-note">Nenhum cartão ainda pra${selectedStudents.length > 1 ? 's essas alunas' : ' esta aluna'}.</p>`}
    </div>

    ${archivedCards.length ? `
    <div class="profile-section">
      <div class="section-label">Arquivados (${archivedCards.length})</div>
      ${archivedCards.map(cardRowHTML).join('')}
    </div>` : ''}
  `;

  wrap.querySelectorAll('[data-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_FLASHCARDS_STATE.studentIds.add(cb.value);
      else ADMIN_FLASHCARDS_STATE.studentIds.delete(cb.value);
      renderAdminFlashcardsView();
    });
  });

  document.getElementById('admin-flashcard-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_FLASHCARDS_STATE.studentIds = new Set(students.map(s => s.student_id));
    renderAdminFlashcardsView();
  });
  document.getElementById('admin-flashcard-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    // O topo da função nunca deixa a seleção vazia (recai pra primeira
    // aluna) -- limpar aqui e deixar esse fallback agir é mais simples do
    // que duplicar a mesma regra dos dois lados.
    ADMIN_FLASHCARDS_STATE.studentIds = new Set();
    renderAdminFlashcardsView();
  });

  // Múltipla escolha e Completar a frase são mutuamente exclusivos (os
  // dois mudam a MECÂNICA de revisão do cartão) -- marcar um desmarca e
  // esconde o outro, em vez de deixar os dois campos preenchidos ao mesmo
  // tempo e só validar no submit.
  document.getElementById('admin-flashcard-mc-toggle').addEventListener('change', (e) => {
    document.getElementById('admin-flashcard-mc-fields').style.display = e.target.checked ? '' : 'none';
    if (e.target.checked){
      document.getElementById('admin-flashcard-cloze-toggle').checked = false;
      document.getElementById('admin-flashcard-cloze-fields').style.display = 'none';
    }
  });
  document.getElementById('admin-flashcard-cloze-toggle').addEventListener('change', (e) => {
    document.getElementById('admin-flashcard-cloze-fields').style.display = e.target.checked ? '' : 'none';
    if (e.target.checked){
      document.getElementById('admin-flashcard-mc-toggle').checked = false;
      document.getElementById('admin-flashcard-mc-fields').style.display = 'none';
    }
  });

  document.getElementById('admin-create-flashcard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-flashcard-btn');
    const errorEl = document.getElementById('admin-create-flashcard-error');
    errorEl.textContent = '';

    if (!selectedStudents.length){
      errorEl.textContent = 'Selecione ao menos uma aluna.';
      return;
    }
    btn.disabled = true;

    // Fase 8a -- upload de imagem/áudio ANTES de criar o(s) cartão(ões) (a
    // URL pública precisa existir pra gravar junto no insert). Feito UMA
    // vez só, mesmo com várias alunas selecionadas -- o arquivo é o mesmo
    // pra todas, reenviar por aluna seria desperdício de banda/Storage.
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

    const front = document.getElementById('admin-flashcard-front').value;
    const backTrans = document.getElementById('admin-flashcard-back').value;
    const note = document.getElementById('admin-flashcard-note').value;
    const pinyinValue = document.getElementById('admin-flashcard-pinyin')?.value;

    const isCloze = document.getElementById('admin-flashcard-cloze-toggle').checked;
    const clozeSentence = isCloze ? document.getElementById('admin-flashcard-cloze-sentence').value : '';
    const clozeAnswer = isCloze ? document.getElementById('admin-flashcard-cloze-answer').value : '';
    const clozeAnswerPinyin = isCloze ? document.getElementById('admin-flashcard-cloze-pinyin')?.value : '';

    // Uma linha em teacher_flashcards POR aluna selecionada -- mesmo
    // conteúdo, cada uma com o language_app_key da PRÓPRIA aluna (nunca o
    // de outra, mesmo numa seleção mista fr+zh). Pinyin (front E cloze) só
    // vai junto pras que são de mandarim -- gravar pinyin numa linha de
    // francês seria dado morto (nada no fr lê esses campos), então evita
    // sujar o registro à toa.
    const results = await Promise.all(selectedStudents.map(s => createFlashcard({
      studentId: s.student_id,
      languageAppKey: s.language_app_key,
      front,
      backTrans,
      note,
      frontPinyin: s.language_app_key === 'mandarim' ? pinyinValue : '',
      imageUrl, audioUrl, choices,
      clozeSentence, clozeAnswer,
      clozeAnswerPinyin: s.language_app_key === 'mandarim' ? clozeAnswerPinyin : '',
    })));
    btn.disabled = false;

    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length){
      errorEl.textContent = failed[0].error;
      return;
    }
    const okCount = results.length - failed.length;
    if (failed.length){
      showToast(`✓ ${okCount} cartão(ões) criado(s), ${failed.length} falharam.`);
    } else {
      showToast(results.length > 1 ? `✓ ${okCount} cartões criados.` : '✓ Cartão criado.');
    }
    renderAdminFlashcardsView();
  });

  wrap.querySelectorAll('[data-toggle-flashcard]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setFlashcardStatus(btn.dataset.toggleFlashcard, btn.dataset.nextStatus);
      renderAdminFlashcardsView();
    });
  });
}
