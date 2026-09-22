// ---------- Aulas (histórico) -- Fase 7 do sistema de alunos particulares ----------
// Diário de bordo da professora: registra, por aluno, o que foi trabalhado
// numa aula (tópico/lição de casa/observações/texto livre, todos
// opcionais individualmente, pelo menos 1 exigido -- ver
// shared/teacher-class-logs.js). Só a professora vê isto (RLS, migration
// 031) -- diferente de "🎓 Alunos"/"📇 Flashcards", não existe NENHUM
// caminho pro aluno enxergar este conteúdo.
//
// UX-fix 4 (pedido direto da autora): esta tela usava um <select> de aluno
// único (nunca tinha o mesmo bug de seleção nunca-vazia das outras duas,
// já que um <select> sempre carrega um valor por natureza do elemento) --
// mas a autora pediu unificação: mesmo padrão de multi-seleção (checkboxes
// + busca por @usuário) já usado em admin-flashcards.js/admin-support-
// materials.js, e o mesmo rótulo "Alunos" nas 3 telas (era "Destinatários"
// nas outras duas, "Aluno" aqui -- unificado). Registrar uma aula com
// vários alunos marcados cria UMA linha em teacher_class_logs POR aluno
// selecionado (mesmo conteúdo -- faz sentido pra aula em grupo, mesmo
// padrão já usado em flashcards/material de apoio), e a lista "Aulas
// registradas" agrega os logs de todos os alunos selecionados, com
// @username prefixado quando há mais de um.
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de
// app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-class-logs.js (fetchClassLogs, createClassLog, updateClassLog, deleteClassLog)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - shared/srs.js                (todayStr)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_CLASS_LOGS_STATE = { studentIds: new Set(), editingId: null };

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

function classLogRowHTML(log, showUsername){
  const isEditing = ADMIN_CLASS_LOGS_STATE.editingId === log.id;
  return `
    <div class="admin-badge-row" style="align-items:flex-start;">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(log.__studentUsername || '?')}</span> · ` : ''}${new Date(`${log.class_date}T00:00:00`).toLocaleDateString('pt-BR')}</div>
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
    wrap.innerHTML = `<p class="profile-empty-note">Vincule um aluno primeiro, na aba "🎓 Alunos", pra poder registrar aulas pra ele.</p>`;
    return;
  }

  // Mesmo padrão de admin-flashcards.js/admin-support-materials.js: seleção
  // vazia é um estado válido, nunca cai de volta pro primeiro aluno.
  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_CLASS_LOGS_STATE.studentIds = new Set([...ADMIN_CLASS_LOGS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = selectedStudents.length === 0
    ? 'Nenhum aluno selecionado'
    : selectedStudents.length === 1
      ? '1 aluno selecionado'
      : `${selectedStudents.length} alunos selecionados`;

  // Busca é só um filtro de DOM (mesmo padrão de admin-flashcards.js) --
  // nunca dispara renderAdminClassLogsView() de novo.
  const studentCheckboxesHTML = students.map(s => `
    <label data-student-row data-username="${escapeHTML((s.username || '').toLowerCase())}" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
      <input type="checkbox" data-classlog-student-checkbox value="${s.student_id}" ${ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      @${escapeHTML(s.username || '(usuário removido)')} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const logLists = await Promise.all(selectedStudents.map(s => fetchClassLogs(s.student_id, s.language_app_key)));
  const logs = logLists.flatMap((list, i) => list.map(log => ({ ...log, __studentUsername: selectedStudents[i].username })));
  logs.sort((a, b) => (b.class_date.localeCompare(a.class_date)) || (new Date(b.created_at) - new Date(a.created_at)));

  const newLogSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${selectedStudents.length} alunos selecionados`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Alunos</div>
      <p class="profile-edit-hint">Selecione os alunos desta aula.</p>
      <input type="text" id="admin-classlog-search" class="profile-edit-input" placeholder="Buscar por @usuário..." autocomplete="off" style="margin-bottom:8px;">
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-classlog-select-all" style="font-size:13px;">Selecionar todos</a>
        <a href="#" id="admin-classlog-select-none" style="font-size:13px;">Limpar seleção</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:block;">
        ${studentCheckboxesHTML}
      </div>
      <p class="profile-edit-hint" style="font-weight:700; margin-top:6px;">${selectionCountLabel}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Nova aula${newLogSubtitle}</div>
      ${selectedStudents.length ? '' : `<p class="profile-edit-hint">Selecione ao menos um aluno acima pra poder registrar a aula.</p>`}
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
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-class-log-btn" ${selectedStudents.length ? '' : 'disabled'}>Registrar aula${selectedStudents.length > 1 ? ` pra ${selectedStudents.length} alunos` : ''}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Aulas registradas (${logs.length})</div>
      ${logs.length ? logs.map(log => classLogRowHTML(log, selectedStudents.length > 1)).join('') : `<p class="profile-empty-note">Nenhuma aula registrada ainda pra${selectedStudents.length > 1 ? ' esses alunos' : selectedStudents.length === 1 ? ' este aluno' : ' nenhum aluno selecionado'}.</p>`}
    </div>
  `;

  wrap.querySelectorAll('[data-classlog-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_CLASS_LOGS_STATE.studentIds.add(cb.value);
      else ADMIN_CLASS_LOGS_STATE.studentIds.delete(cb.value);
      renderAdminClassLogsView();
    });
  });

  document.getElementById('admin-classlog-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_CLASS_LOGS_STATE.studentIds = new Set(students.map(s => s.student_id));
    renderAdminClassLogsView();
  });
  document.getElementById('admin-classlog-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    // Seleção vazia é um estado válido -- limpa de verdade, sem cair de
    // volta pra um aluno default.
    ADMIN_CLASS_LOGS_STATE.studentIds = new Set();
    renderAdminClassLogsView();
  });

  document.getElementById('admin-classlog-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    wrap.querySelectorAll('[data-student-row]').forEach(row => {
      row.style.display = !q || row.dataset.username.includes(q) ? '' : 'none';
    });
  });

  document.getElementById('admin-create-class-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-class-log-btn');
    const errorEl = document.getElementById('admin-create-class-log-error');
    errorEl.textContent = '';

    if (!selectedStudents.length){
      errorEl.textContent = 'Selecione ao menos um aluno.';
      return;
    }
    btn.disabled = true;

    const classDate = document.getElementById('admin-class-log-date').value;
    const topic = document.getElementById('admin-class-log-topic').value;
    const homework = document.getElementById('admin-class-log-homework').value;
    const observations = document.getElementById('admin-class-log-observations').value;
    const notes = document.getElementById('admin-class-log-notes').value;

    // Uma linha em teacher_class_logs POR aluno selecionado -- mesmo
    // conteúdo pra todos, mesmo padrão já usado em flashcards/material de
    // apoio (faz sentido pra uma aula em grupo com o mesmo tópico/lição de
    // casa pra todo mundo).
    const results = await Promise.all(selectedStudents.map(s => createClassLog({
      studentId: s.student_id,
      languageAppKey: s.language_app_key,
      classDate, topic, homework, observations, notes,
    })));
    btn.disabled = false;

    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length){
      errorEl.textContent = failed[0].error;
      return;
    }
    showToast(results.length > 1 ? `✓ Aula registrada pra ${results.length - failed.length} alunos.` : '✓ Aula registrada.');
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
