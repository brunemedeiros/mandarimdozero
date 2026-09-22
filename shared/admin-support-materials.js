// ---------- Material de apoio (admin) -- Fase 8b do sistema de alunas
// particulares (ver CLAUDE.md) ----------
// Autoria de material de apoio pela professora (texto + link + arquivo,
// todos opcionais individualmente, pelo menos 1 exigido -- ver
// shared/teacher-support-materials.js), atribuído a 1+ alunas de uma vez
// (multi-seleção, mesmo padrão recém-adicionado a "📇 Flashcards" --
// grillado desde já, não copiado depois). Diferente de "📇 Flashcards"/
// "📝 Aulas": este conteúdo NUNCA entra em STATE.cards/FSRS, e a aluna TEM
// uma tela pra ver o que foi atribuído a ela (shared/support-materials-
// view.js) -- grillado, "não-revisável" mas visível, ao contrário de
// "📝 Aulas" (Fase 7, só a professora vê).
//
// UX-fix (mesmo dia da Fase 8c): mesmo bug de estado encontrado e
// corrigido em shared/admin-flashcards.js (ver comentário lá, seção
// "UX-fix") existia aqui também -- a seleção nunca podia ficar vazia
// (caía de volta pra "primeira aluna"), o que fazia "Limpar seleção" não
// limpar de verdade. Corrigido do mesmo jeito: seleção pode ficar
// genuinamente vazia, "Enviar material" fica desabilitado nesse estado,
// com contador visível acima do form.
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de
// app.js):
//   - shared/roles.js                     (fetchMyStudents)
//   - shared/teacher-support-materials.js (fetchSupportMaterialsForStudent, createSupportMaterial, updateSupportMaterial, deleteSupportMaterial, uploadSupportMaterialFile)
//   - shared/admin-students.js            (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js                     (showToast)
//   - languages/<lang>/app.js             (isAdminUser)

let ADMIN_MATERIALS_STATE = { studentIds: new Set(), editingId: null };

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
    wrap.innerHTML = `<p class="profile-empty-note">Vincule uma aluna primeiro, na aba "🎓 Alunos", pra poder enviar material de apoio pra ela.</p>`;
    return;
  }

  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_MATERIALS_STATE.studentIds = new Set([...ADMIN_MATERIALS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_MATERIALS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhuma aluna selecionada'
    : selectedStudents.length === 1
      ? '1 aluna selecionada'
      : `${selectedStudents.length} alunas selecionadas`;

  const studentCheckboxesHTML = students.map(s => `
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
      <input type="checkbox" data-material-student-checkbox value="${s.student_id}" ${ADMIN_MATERIALS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      @${escapeHTML(s.username || '(usuário removido)')} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const materialLists = await Promise.all(selectedStudents.map(s => fetchSupportMaterialsForStudent(s.student_id)));
  const materials = materialLists.flatMap((list, i) => list.map(m => ({ ...m, __studentUsername: selectedStudents[i].username })));
  materials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const newMaterialSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${selectedStudents.length} alunas selecionadas`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Alunas (selecione 1 ou mais)</div>
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-material-select-all" style="font-size:13px;">Selecionar todas</a>
        <a href="#" id="admin-material-select-none" style="font-size:13px;">Limpar seleção</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:block;">
        ${studentCheckboxesHTML}
      </div>
      <p class="profile-edit-hint" style="font-weight:700; margin-top:6px;">${selectionCountLabel}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Novo material${newMaterialSubtitle}</div>
      ${selectedStudents.length ? '' : `<p class="profile-edit-hint">Selecione ao menos uma aluna acima pra poder enviar o material.</p>`}
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
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-material-btn" ${selectedStudents.length ? '' : 'disabled'}>Enviar material${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunas` : ''}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Materiais enviados (${materials.length})</div>
      ${materials.length ? materials.map(m => materialRowHTML(m, selectedStudents.length > 1)).join('') : `<p class="profile-empty-note">Nenhum material ainda pra${selectedStudents.length > 1 ? 's essas alunas' : selectedStudents.length === 1 ? ' esta aluna' : ' nenhuma aluna selecionada'}.</p>`}
    </div>
  `;

  wrap.querySelectorAll('[data-material-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_MATERIALS_STATE.studentIds.add(cb.value);
      else ADMIN_MATERIALS_STATE.studentIds.delete(cb.value);
      renderAdminSupportMaterialsView();
    });
  });

  document.getElementById('admin-material-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_MATERIALS_STATE.studentIds = new Set(students.map(s => s.student_id));
    renderAdminSupportMaterialsView();
  });
  document.getElementById('admin-material-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    // Seleção vazia é um estado válido (ver comentário no topo do
    // arquivo) -- limpa de verdade, sem cair de volta pra uma aluna default.
    ADMIN_MATERIALS_STATE.studentIds = new Set();
    renderAdminSupportMaterialsView();
  });

  document.getElementById('admin-create-material-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-material-btn');
    const errorEl = document.getElementById('admin-create-material-error');
    errorEl.textContent = '';

    if (!selectedStudents.length){
      errorEl.textContent = 'Selecione ao menos uma aluna.';
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

    // Uma linha em teacher_support_materials POR aluna selecionada --
    // mesmo padrão recém-adicionado aos flashcards (ver CLAUDE.md):
    // mesmo conteúdo/arquivo (upload feito 1 vez só acima), cada linha
    // com o language_app_key da PRÓPRIA aluna.
    const results = await Promise.all(selectedStudents.map(s => createSupportMaterial({
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
    showToast(results.length > 1 ? `✓ Material enviado pra ${results.length - failed.length} alunas.` : '✓ Material enviado.');
    renderAdminSupportMaterialsView();
  });

  wrap.querySelectorAll('[data-edit-material]').forEach(btn => {
    btn.addEventListener('click', () => {
      ADMIN_MATERIALS_STATE.editingId = Number(btn.dataset.editMaterial);
      renderAdminSupportMaterialsView();
    });
  });
  wrap.querySelectorAll('[data-cancel-edit-material]').forEach(btn => {
    btn.addEventListener('click', () => {
      ADMIN_MATERIALS_STATE.editingId = null;
      renderAdminSupportMaterialsView();
    });
  });
  wrap.querySelectorAll('[data-delete-material]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Apagar este material de apoio? Essa ação não pode ser desfeita.')) return;
      await deleteSupportMaterial(btn.dataset.deleteMaterial);
      showToast('✓ Material apagado.');
      renderAdminSupportMaterialsView();
    });
  });
  wrap.querySelectorAll('[data-edit-material-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.editMaterialForm;
      const errorEl = wrap.querySelector(`[data-edit-material-error="${id}"]`);
      errorEl.textContent = '';
      const result = await updateSupportMaterial(id, {
        title: document.getElementById(`edit-material-title-${id}`).value,
        description: document.getElementById(`edit-material-desc-${id}`).value,
        linkUrl: document.getElementById(`edit-material-link-${id}`).value,
      });
      if (!result.ok){ errorEl.textContent = result.error; return; }
      ADMIN_MATERIALS_STATE.editingId = null;
      showToast('✓ Material atualizado.');
      renderAdminSupportMaterialsView();
    });
  });
}
