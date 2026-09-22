// ---------- Material de apoio (admin) -- Fase 8b do sistema de alunos
// particulares (ver CLAUDE.md) ----------
// Autoria de material de apoio pela professora (texto + link + arquivo,
// todos opcionais individualmente, pelo menos 1 exigido -- ver
// shared/teacher-support-materials.js), atribuído a 1+ alunos de uma vez
// (multi-seleção, mesmo padrão recém-adicionado a "📇 Flashcards" --
// grillado desde já, não copiado depois). Diferente de "📇 Flashcards"/
// "📝 Aulas": este conteúdo NUNCA entra em STATE.cards/FSRS, e o aluno TEM
// uma tela pra ver o que foi atribuído a ele (shared/support-materials-
// view.js) -- grillado, "não-revisável" mas visível, ao contrário de
// "📝 Aulas" (Fase 7, só a professora vê).
//
// UX-fix / UX-fix 2/3: histórico de correções de bug + terminologia +
// busca -- ver CLAUDE.md. UX-fix 5 (mesmo bug crítico de admin-flashcards.js,
// ver comentário detalhado lá): mudar a seleção de alunos NUNCA mais chama
// renderAdminSupportMaterialsView() completo -- só
// updateMaterialsSelectionDependentUI(), que atualiza contador/subtítulo/
// botão/lista de materiais via DOM direto, sem recriar #admin-create-
// material-form (onde o título/descrição/link digitados vivem). Busca
// agora casa por nome também (data-searchtext), rótulo do checkbox mostra
// "Nome (@usuário)", e um filtro de idioma (pills) foi adicionado --
// mesmo padrão exato de admin-flashcards.js, não reinventado aqui.
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de
// app.js):
//   - shared/roles.js                     (fetchMyStudents)
//   - shared/teacher-support-materials.js (fetchSupportMaterialsForStudent, createSupportMaterial, updateSupportMaterial, deleteSupportMaterial, uploadSupportMaterialFile)
//   - shared/admin-students.js            (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js                     (showToast)
//   - languages/<lang>/app.js             (isAdminUser)

let ADMIN_MATERIALS_STATE = { studentIds: new Set(), langFilter: 'all', editingId: null, _studentsCache: [] };

function materialStudentLabel(s){
  return s.display_name
    ? `${escapeHTML(s.display_name)} (@${escapeHTML(s.username || '?')})`
    : `@${escapeHTML(s.username || '(usuário removido)')}`;
}

function materialFormatBadgesHTML(m){
  return [
    m.link_url ? '🔗 link' : '',
    m.file_url ? '📎 arquivo' : '',
  ].filter(Boolean).join(' · ');
}

function materialEditFormHTML(m){
  return `
    <form class="profile-edit-form" data-edit-material-form="${m.id}" style="margin-top:8px;">
      <label class="profile-edit-label" for="edit-material-title-${m.id}">Título</label>
      <input type="text" id="edit-material-title-${m.id}" class="profile-edit-input" value="${escapeHTML(m.title)}">
      <label class="profile-edit-label" for="edit-material-desc-${m.id}">Descrição (opcional)</label>
      <textarea id="edit-material-desc-${m.id}" class="profile-edit-input" rows="3">${escapeHTML(m.description || '')}</textarea>
      <label class="profile-edit-label" for="edit-material-link-${m.id}">Link (opcional)</label>
      <input type="url" id="edit-material-link-${m.id}" class="profile-edit-input" value="${escapeHTML(m.link_url || '')}">
      <p class="profile-edit-error" data-edit-material-error="${m.id}"></p>
      <div style="display:flex; gap:8px;">
        <button type="submit" class="btn btn-primary">Salvar</button>
        <button type="button" class="btn" data-cancel-edit-material="${m.id}">Cancelar</button>
      </div>
    </form>
  `;
}

function materialRowHTML(m, showUsername){
  const isEditing = ADMIN_MATERIALS_STATE.editingId === m.id;
  return `
    <div class="admin-badge-row" style="align-items:flex-start;">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(m.__studentUsername || '?')}</span> · ` : ''}${escapeHTML(m.title)}</div>
        ${!isEditing ? `
        <div class="admin-badge-desc">
          ${m.description ? `<span style="white-space:pre-wrap;">${escapeHTML(m.description)}</span><br>` : ''}
          criado em ${new Date(m.created_at).toLocaleDateString('pt-BR')}${materialFormatBadgesHTML(m) ? ' · ' + materialFormatBadgesHTML(m) : ''}
        </div>` : materialEditFormHTML(m)}
      </div>
      ${!isEditing ? `
      <button class="admin-badge-delete-btn" data-edit-material="${m.id}" title="Editar">✏️</button>
      <button class="admin-badge-delete-btn" data-delete-material="${m.id}" title="Apagar">✕</button>
      ` : ''}
    </div>
  `;
}

async function buildMaterialsListBoxHTML(selectedStudents){
  const materialLists = await Promise.all(selectedStudents.map(s => fetchSupportMaterialsForStudent(s.student_id)));
  const materials = materialLists.flatMap((list, i) => list.map(m => ({ ...m, __studentUsername: selectedStudents[i].username })));
  materials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const showUsername = selectedStudents.length > 1;

  return `
    <div class="section-label">Materiais enviados (${materials.length})</div>
    ${materials.length ? materials.map(m => materialRowHTML(m, showUsername)).join('') : `<p class="profile-empty-note">Nenhum material ainda pra${selectedStudents.length > 1 ? ' esses alunos' : selectedStudents.length === 1 ? ' este aluno' : ' nenhum aluno selecionado'}.</p>`}
  `;
}

function wireMaterialsListBox(listBox){
  listBox.querySelectorAll('[data-edit-material]').forEach(btn => {
    btn.addEventListener('click', async () => {
      ADMIN_MATERIALS_STATE.editingId = Number(btn.dataset.editMaterial);
      await refreshMaterialsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-cancel-edit-material]').forEach(btn => {
    btn.addEventListener('click', async () => {
      ADMIN_MATERIALS_STATE.editingId = null;
      await refreshMaterialsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-delete-material]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Apagar este material de apoio? Essa ação não pode ser desfeita.')) return;
      await deleteSupportMaterial(btn.dataset.deleteMaterial);
      showToast('✓ Material apagado.');
      await refreshMaterialsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-edit-material-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.editMaterialForm;
      const errorEl = listBox.querySelector(`[data-edit-material-error="${id}"]`);
      errorEl.textContent = '';
      const result = await updateSupportMaterial(id, {
        title: document.getElementById(`edit-material-title-${id}`).value,
        description: document.getElementById(`edit-material-desc-${id}`).value,
        linkUrl: document.getElementById(`edit-material-link-${id}`).value,
      });
      if (!result.ok){ errorEl.textContent = result.error; return; }
      ADMIN_MATERIALS_STATE.editingId = null;
      showToast('✓ Material atualizado.');
      await refreshMaterialsListBox(listBox);
    });
  });
}

async function refreshMaterialsListBox(listBox){
  const selectedStudents = ADMIN_MATERIALS_STATE._studentsCache.filter(s => ADMIN_MATERIALS_STATE.studentIds.has(s.student_id));
  listBox.innerHTML = await buildMaterialsListBoxHTML(selectedStudents);
  wireMaterialsListBox(listBox);
}

// Atualiza tudo que depende da seleção de alunos SEM recriar o <form> de
// "Novo material" (onde título/descrição/link digitados vivem) -- mesmo
// princípio de updateFlashcardsSelectionDependentUI() em
// admin-flashcards.js (ver comentário lá pro porquê).
async function updateMaterialsSelectionDependentUI(){
  const students = ADMIN_MATERIALS_STATE._studentsCache;
  const selectedStudents = students.filter(s => ADMIN_MATERIALS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhum aluno selecionado'
    : selectedStudents.length === 1
      ? '1 aluno selecionado'
      : `${selectedStudents.length} alunos selecionados`;

  const counterEl = document.getElementById('admin-material-selection-counter');
  if (counterEl) counterEl.textContent = selectionCountLabel;

  const subtitleEl = document.getElementById('admin-material-content-subtitle');
  if (subtitleEl) subtitleEl.textContent = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1 ? ` -- ${selectedStudents.length} alunos selecionados` : '';

  const contentHint = document.getElementById('admin-material-content-hint');
  if (contentHint) contentHint.style.display = selectedStudents.length ? 'none' : '';

  const btn = document.getElementById('admin-create-material-btn');
  if (btn){
    btn.disabled = !selectedStudents.length;
    btn.textContent = `Enviar material${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}`;
  }

  const listBox = document.getElementById('admin-materials-list-box');
  if (listBox) await refreshMaterialsListBox(listBox);

  return selectedStudents;
}

function applyMaterialPickerFilters(wrap){
  const q = (document.getElementById('admin-material-search')?.value || '').trim().toLowerCase();
  const lang = ADMIN_MATERIALS_STATE.langFilter;
  wrap.querySelectorAll('[data-student-row]').forEach(row => {
    const matchesText = !q || row.dataset.searchtext.includes(q);
    const matchesLang = lang === 'all' || row.dataset.lang === lang;
    row.style.display = (matchesText && matchesLang) ? '' : 'none';
  });
}

async function renderAdminSupportMaterialsView(){
  const wrap = document.getElementById('admin-materials-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const students = await fetchMyStudents();
  if (!students.length){
    wrap.innerHTML = `<p class="profile-empty-note">Vincule um aluno primeiro, na aba "🎓 Alunos", pra poder enviar material de apoio pra ele.</p>`;
    return;
  }
  ADMIN_MATERIALS_STATE._studentsCache = students;

  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_MATERIALS_STATE.studentIds = new Set([...ADMIN_MATERIALS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_MATERIALS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhum aluno selecionado'
    : selectedStudents.length === 1
      ? '1 aluno selecionado'
      : `${selectedStudents.length} alunos selecionados`;

  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  const langFilterHTML = langsPresent.length > 1 ? `
    <div class="leaderboard-tabs" role="tablist" aria-label="Filtrar por idioma" style="justify-content:flex-start; margin-bottom:8px;">
      <button type="button" class="leaderboard-tab ${ADMIN_MATERIALS_STATE.langFilter === 'all' ? 'active' : ''}" data-lang-filter="all">Todos (${students.length})</button>
      ${langsPresent.map(key => `<button type="button" class="leaderboard-tab ${ADMIN_MATERIALS_STATE.langFilter === key ? 'active' : ''}" data-lang-filter="${key}">${STUDENT_LANGUAGE_LABELS[key] || key} (${students.filter(s => s.language_app_key === key).length})</button>`).join('')}
    </div>
  ` : '';

  // Busca casa por nome E @usuário (mesmo padrão de admin-flashcards.js).
  const studentCheckboxesHTML = students.map(s => `
    <label data-student-row data-lang="${s.language_app_key}" data-searchtext="${escapeHTML(`${s.display_name || ''} ${s.username || ''}`.toLowerCase())}" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
      <input type="checkbox" data-material-student-checkbox value="${s.student_id}" ${ADMIN_MATERIALS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      ${materialStudentLabel(s)} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const newMaterialSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${selectedStudents.length} alunos selecionados`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Alunos</div>
      <p class="profile-edit-hint">Selecione os alunos que vão receber este material.</p>
      ${langFilterHTML}
      <input type="text" id="admin-material-search" class="profile-edit-input" placeholder="Buscar por nome ou @usuário..." autocomplete="off" style="margin-bottom:8px;">
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-material-select-all" style="font-size:13px;">Selecionar todos</a>
        <a href="#" id="admin-material-select-none" style="font-size:13px;">Limpar seleção</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:block;">
        ${studentCheckboxesHTML}
      </div>
      <p class="profile-edit-hint" id="admin-material-selection-counter" style="font-weight:700; margin-top:6px;">${selectionCountLabel}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Novo material<span id="admin-material-content-subtitle">${newMaterialSubtitle}</span></div>
      <p class="profile-edit-hint" id="admin-material-content-hint" style="${selectedStudents.length ? 'display:none;' : ''}">Selecione ao menos um aluno acima pra poder enviar o material.</p>
      <form id="admin-create-material-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-material-title">Título</label>
        <input type="text" id="admin-material-title" class="profile-edit-input" placeholder="ex: Resumo do passé composé" autocomplete="off">
        <label class="profile-edit-label" for="admin-material-desc">Descrição (opcional)</label>
        <textarea id="admin-material-desc" class="profile-edit-input" rows="3" placeholder="explicação, contexto de uso..."></textarea>
        <label class="profile-edit-label" for="admin-material-link">Link (opcional)</label>
        <input type="url" id="admin-material-link" class="profile-edit-input" placeholder="https://..." autocomplete="off">
        <label class="profile-edit-label" for="admin-material-file">Arquivo (opcional)</label>
        <input type="file" id="admin-material-file" class="profile-edit-input">
        <p class="profile-edit-error" id="admin-create-material-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-material-btn" ${selectedStudents.length ? '' : 'disabled'}>Enviar material${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}</button>
      </form>
    </div>

    <div class="profile-section" id="admin-materials-list-box">
      ${await buildMaterialsListBoxHTML(selectedStudents)}
    </div>
  `;

  wireMaterialsListBox(document.getElementById('admin-materials-list-box'));

  wrap.querySelectorAll('[data-material-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_MATERIALS_STATE.studentIds.add(cb.value);
      else ADMIN_MATERIALS_STATE.studentIds.delete(cb.value);
      updateMaterialsSelectionDependentUI();
    });
  });

  document.getElementById('admin-material-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_MATERIALS_STATE.studentIds = new Set(students.map(s => s.student_id));
    wrap.querySelectorAll('[data-material-student-checkbox]').forEach(cb => { cb.checked = true; });
    updateMaterialsSelectionDependentUI();
  });
  document.getElementById('admin-material-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_MATERIALS_STATE.studentIds = new Set();
    wrap.querySelectorAll('[data-material-student-checkbox]').forEach(cb => { cb.checked = false; });
    updateMaterialsSelectionDependentUI();
  });

  wrap.querySelectorAll('[data-lang-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      ADMIN_MATERIALS_STATE.langFilter = pill.dataset.langFilter;
      wrap.querySelectorAll('[data-lang-filter]').forEach(p => p.classList.toggle('active', p === pill));
      applyMaterialPickerFilters(wrap);
    });
  });

  document.getElementById('admin-material-search').addEventListener('input', () => applyMaterialPickerFilters(wrap));

  document.getElementById('admin-create-material-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-material-btn');
    const errorEl = document.getElementById('admin-create-material-error');
    errorEl.textContent = '';

    const selectedNow = ADMIN_MATERIALS_STATE._studentsCache.filter(s => ADMIN_MATERIALS_STATE.studentIds.has(s.student_id));
    if (!selectedNow.length){
      errorEl.textContent = 'Selecione ao menos um aluno.';
      return;
    }
    btn.disabled = true;

    const file = document.getElementById('admin-material-file').files[0];
    let fileUrl = null, fileName = null;
    if (file){
      const up = await uploadSupportMaterialFile(file);
      if (!up.ok){ btn.disabled = false; errorEl.textContent = up.error; return; }
      fileUrl = up.url;
      fileName = up.fileName;
    }

    const title = document.getElementById('admin-material-title').value;
    const description = document.getElementById('admin-material-desc').value;
    const linkUrl = document.getElementById('admin-material-link').value;

    // Uma linha em teacher_support_materials POR aluno selecionado --
    // mesmo padrão recém-adicionado aos flashcards (ver CLAUDE.md):
    // mesmo conteúdo/arquivo (upload feito 1 vez só acima), cada linha
    // com o language_app_key do PRÓPRIO aluno.
    const results = await Promise.all(selectedNow.map(s => createSupportMaterial({
      studentId: s.student_id,
      languageAppKey: s.language_app_key,
      title, description, linkUrl, fileUrl, fileName,
    })));
    btn.disabled = false;

    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length){
      errorEl.textContent = failed[0].error;
      return;
    }
    showToast(results.length > 1 ? `✓ Material enviado pra ${results.length - failed.length} alunos.` : '✓ Material enviado.');
    // Único ponto de re-render COMPLETO por causa da seleção -- intencional
    // aqui, um submit bem sucedido deve mesmo limpar o formulário.
    renderAdminSupportMaterialsView();
  });
}
