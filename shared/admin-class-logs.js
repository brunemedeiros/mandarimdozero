// ---------- Aulas (histórico) -- Fase 7 do sistema de alunas particulares ----------
// Diário de bordo da professora: registra, por aluna, o que foi trabalhado
// numa aula (tópico/lição de casa/observações/texto livre, todos
// opcionais individualmente, pelo menos 1 exigido -- ver
// shared/teacher-class-logs.js). Só a professora vê isto (RLS, migration
// 031) -- diferente de "🎓 Alunos"/"📇 Flashcards", não existe NENHUM
// caminho pra aluna enxergar este conteúdo.
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de
// app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-class-logs.js (fetchClassLogs, createClassLog, updateClassLog, deleteClassLog)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - shared/srs.js                (todayStr)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_CLASS_LOGS_STATE = { studentId: null, editingId: null };

function classLogFieldRowsHTML(log){
  const rows = [
    ['📌 Tópico', log.topic],
    ['📝 Lição de casa', log.homework],
    ['🔎 Observações', log.observations],
    ['💬 Notas', log.notes],
  ].filter(([, value]) => !!value);
  if (!rows.length) return '';
  return rows.map(([label, value]) => `<div><strong>${label}:</strong> <span style="white-space:pre-wrap;">${escapeHTML(value)}</span></div>`).join('');
}

function classLogEditFormHTML(log){
  return `
    <form class="profile-edit-form" data-edit-class-log-form="${log.id}" style="margin-top:8px;">
      <label class="profile-edit-label" for="edit-class-log-date-${log.id}">Data</label>
      <input type="date" id="edit-class-log-date-${log.id}" class="profile-edit-input" value="${log.class_date}">
      <label class="profile-edit-label" for="edit-class-log-topic-${log.id}">Tópico (opcional)</label>
      <input type="text" id="edit-class-log-topic-${log.id}" class="profile-edit-input" value="${escapeHTML(log.topic || '')}">
      <label class="profile-edit-label" for="edit-class-log-homework-${log.id}">Lição de casa (opcional)</label>
      <input type="text" id="edit-class-log-homework-${log.id}" class="profile-edit-input" value="${escapeHTML(log.homework || '')}">
      <label class="profile-edit-label" for="edit-class-log-observations-${log.id}">Observações (opcional)</label>
      <input type="text" id="edit-class-log-observations-${log.id}" class="profile-edit-input" value="${escapeHTML(log.observations || '')}">
      <label class="profile-edit-label" for="edit-class-log-notes-${log.id}">Notas / texto livre (opcional)</label>
      <textarea id="edit-class-log-notes-${log.id}" class="profile-edit-input" rows="3">${escapeHTML(log.notes || '')}</textarea>
      <p class="profile-edit-error" data-edit-class-log-error="${log.id}"></p>
      <div style="display:flex; gap:8px;">
        <button type="submit" class="btn btn-primary">Salvar</button>
        <button type="button" class="btn" data-cancel-edit-log="${log.id}">Cancelar</button>
      </div>
    </form>
  `;
}

function classLogRowHTML(log){
  const isEditing = ADMIN_CLASS_LOGS_STATE.editingId === log.id;
  return `
    <div class="admin-badge-row" style="align-items:flex-start;">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${new Date(`${log.class_date}T00:00:00`).toLocaleDateString('pt-BR')}</div>
        ${!isEditing ? `<div class="admin-badge-desc">${classLogFieldRowsHTML(log) || '<em>(sem campos preenchidos)</em>'}</div>` : classLogEditFormHTML(log)}
      </div>
      ${!isEditing ? `
      <button class="admin-badge-delete-btn" data-edit-class-log="${log.id}" title="Editar">✏️</button>
      <button class="admin-badge-delete-btn" data-delete-class-log="${log.id}" title="Apagar">✕</button>
      ` : ''}
    </div>
  `;
}

async function renderAdminClassLogsView(){
  const wrap = document.getElementById('admin-classlogs-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const students = await fetchMyStudents();
  if (!students.length){
    wrap.innerHTML = `<p class="profile-empty-note">Vincule uma aluna primeiro, na aba "🎓 Alunos", pra poder registrar aulas pra ela.</p>`;
    return;
  }

  if (!ADMIN_CLASS_LOGS_STATE.studentId || !students.some(s => s.student_id === ADMIN_CLASS_LOGS_STATE.studentId)){
    ADMIN_CLASS_LOGS_STATE.studentId = students[0].student_id;
  }
  const current = students.find(s => s.student_id === ADMIN_CLASS_LOGS_STATE.studentId);

  const studentOptionsHTML = students.map(s => `<option value="${s.student_id}" ${s.student_id === ADMIN_CLASS_LOGS_STATE.studentId ? 'selected' : ''}>@${s.username || '(usuário removido)'} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}</option>`).join('');

  const logs = await fetchClassLogs(ADMIN_CLASS_LOGS_STATE.studentId, current.language_app_key);

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Aluna</div>
      <select id="admin-classlog-student-select" class="profile-edit-input">${studentOptionsHTML}</select>
    </div>

    <div class="profile-section">
      <div class="section-label">Nova aula${current ? ` -- ${STUDENT_LANGUAGE_LABELS[current.language_app_key] || current.language_app_key}` : ''}</div>
      <form id="admin-create-class-log-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-class-log-date">Data</label>
        <input type="date" id="admin-class-log-date" class="profile-edit-input" value="${todayStr()}">
        <label class="profile-edit-label" for="admin-class-log-topic">Tópico (opcional)</label>
        <input type="text" id="admin-class-log-topic" class="profile-edit-input" placeholder="ex: passé composé" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-homework">Lição de casa (opcional)</label>
        <input type="text" id="admin-class-log-homework" class="profile-edit-input" placeholder="ex: exercícios 1-3 da página 24" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-observations">Observações (opcional)</label>
        <input type="text" id="admin-class-log-observations" class="profile-edit-input" placeholder="material usado, página do livro..." autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-notes">Notas / texto livre (opcional)</label>
        <textarea id="admin-class-log-notes" class="profile-edit-input" rows="3" placeholder="vocabulário e gramática trabalhados na aula..."></textarea>
        <p class="profile-edit-error" id="admin-create-class-log-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-class-log-btn">Registrar aula</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Aulas registradas (${logs.length})</div>
      ${logs.length ? logs.map(classLogRowHTML).join('') : `<p class="profile-empty-note">Nenhuma aula registrada ainda pra esta aluna.</p>`}
    </div>
  `;

  document.getElementById('admin-classlog-student-select').addEventListener('change', (e) => {
    ADMIN_CLASS_LOGS_STATE.studentId = e.target.value;
    ADMIN_CLASS_LOGS_STATE.editingId = null;
    renderAdminClassLogsView();
  });

  document.getElementById('admin-create-class-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-class-log-btn');
    const errorEl = document.getElementById('admin-create-class-log-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await createClassLog({
      studentId: ADMIN_CLASS_LOGS_STATE.studentId,
      languageAppKey: current.language_app_key,
      classDate: document.getElementById('admin-class-log-date').value,
      topic: document.getElementById('admin-class-log-topic').value,
      homework: document.getElementById('admin-class-log-homework').value,
      observations: document.getElementById('admin-class-log-observations').value,
      notes: document.getElementById('admin-class-log-notes').value,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast('✓ Aula registrada.');
    renderAdminClassLogsView();
  });

  wrap.querySelectorAll('[data-edit-class-log]').forEach(btn => {
    btn.addEventListener('click', () => {
      ADMIN_CLASS_LOGS_STATE.editingId = Number(btn.dataset.editClassLog);
      renderAdminClassLogsView();
    });
  });

  wrap.querySelectorAll('[data-cancel-edit-log]').forEach(btn => {
    btn.addEventListener('click', () => {
      ADMIN_CLASS_LOGS_STATE.editingId = null;
      renderAdminClassLogsView();
    });
  });

  wrap.querySelectorAll('[data-delete-class-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Apagar este registro de aula? Essa ação não pode ser desfeita.')) return;
      await deleteClassLog(btn.dataset.deleteClassLog);
      showToast('✓ Registro apagado.');
      renderAdminClassLogsView();
    });
  });

  wrap.querySelectorAll('[data-edit-class-log-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.editClassLogForm;
      const errorEl = wrap.querySelector(`[data-edit-class-log-error="${id}"]`);
      errorEl.textContent = '';
      const result = await updateClassLog(id, {
        classDate: document.getElementById(`edit-class-log-date-${id}`).value,
        topic: document.getElementById(`edit-class-log-topic-${id}`).value,
        homework: document.getElementById(`edit-class-log-homework-${id}`).value,
        observations: document.getElementById(`edit-class-log-observations-${id}`).value,
        notes: document.getElementById(`edit-class-log-notes-${id}`).value,
      });
      if (!result.ok){ errorEl.textContent = result.error; return; }
      ADMIN_CLASS_LOGS_STATE.editingId = null;
      showToast('✓ Aula atualizada.');
      renderAdminClassLogsView();
    });
  });
}
