// ---------- Aulas (histórico) -- Fase 7 do sistema de alunos particulares ----------
// Diário de bordo da professora: registra, por aluno, o que foi trabalhado
// numa aula (tópico/lição de casa/observações/texto livre, todos
// opcionais individualmente, pelo menos 1 exigido -- ver
// shared/teacher-class-logs.js). Só a professora vê isto (RLS, migration
// 031) -- diferente de "🎓 Alunos"/"📇 Flashcards", não existe NENHUM
// caminho pro aluno enxergar este conteúdo.
//
// UX-fix 4: mesmo padrão de multi-seleção (checkboxes + busca) já usado em
// admin-flashcards.js/admin-support-materials.js, mesmo rótulo "Alunos"
// nas 3 telas. Registrar uma aula com vários alunos marcados cria UMA
// linha em teacher_class_logs POR aluno selecionado (mesma aula em grupo).
//
// UX-fix 5 (mesmo bug crítico de admin-flashcards.js, ver comentário
// detalhado lá): mudar a seleção de alunos NUNCA mais chama
// renderAdminClassLogsView() completo -- só
// updateClassLogsSelectionDependentUI(), que atualiza contador/subtítulo/
// botão/lista de aulas via DOM direto, sem recriar #admin-create-class-
// log-form (onde tópico/lição de casa/observações/notas digitados vivem).
// Busca agora casa por nome também, rótulo do checkbox mostra
// "Nome (@usuário)", e um filtro de idioma (pills) foi adicionado -- mesmo
// padrão exato de admin-flashcards.js.
//
// Depende de (mesma posição de shared/admin-flashcards.js -- antes de
// app.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-class-logs.js (fetchClassLogs, createClassLog, updateClassLog, deleteClassLog)
//   - shared/admin-students.js     (STUDENT_LANGUAGE_LABELS -- reaproveitado)
//   - shared/toast.js              (showToast)
//   - shared/srs.js                (todayStr)
//   - languages/<lang>/app.js      (isAdminUser)

let ADMIN_CLASS_LOGS_STATE = { studentIds: new Set(), langFilter: 'all', editingId: null, _studentsCache: [] };

function classLogStudentLabel(s){
  return s.display_name
    ? `${escapeHTML(s.display_name)} (@${escapeHTML(s.username || '?')})`
    : `@${escapeHTML(s.username || t('admin.common.removedUser'))}`;
}

function classLogFieldRowsHTML(log){
  const rows = [
    [t('admin.classLogs.fieldTopic'), log.topic],
    [t('admin.classLogs.fieldHomework'), log.homework],
    [t('admin.classLogs.fieldObservations'), log.observations],
    [t('admin.classLogs.fieldNotes'), log.notes],
  ].filter(([, value]) => !!value);
  if (!rows.length) return '';
  return rows.map(([label, value]) => `<div><strong>${label}:</strong> <span style="white-space:pre-wrap;">${escapeHTML(value)}</span></div>`).join('');
}

function classLogEditFormHTML(log){
  return `
    <form class="profile-edit-form" data-edit-class-log-form="${log.id}" style="margin-top:8px;">
      <label class="profile-edit-label" for="edit-class-log-date-${log.id}">${t('admin.common.date')}</label>
      <input type="date" id="edit-class-log-date-${log.id}" class="profile-edit-input" value="${log.class_date}">
      <label class="profile-edit-label" for="edit-class-log-topic-${log.id}">${t('admin.classLogs.topicOpt')}</label>
      <input type="text" id="edit-class-log-topic-${log.id}" class="profile-edit-input" value="${escapeHTML(log.topic || '')}">
      <label class="profile-edit-label" for="edit-class-log-homework-${log.id}">${t('admin.classLogs.homeworkOpt')}</label>
      <input type="text" id="edit-class-log-homework-${log.id}" class="profile-edit-input" value="${escapeHTML(log.homework || '')}">
      <label class="profile-edit-label" for="edit-class-log-observations-${log.id}">${t('admin.classLogs.observationsOpt')}</label>
      <input type="text" id="edit-class-log-observations-${log.id}" class="profile-edit-input" value="${escapeHTML(log.observations || '')}">
      <label class="profile-edit-label" for="edit-class-log-notes-${log.id}">${t('admin.classLogs.notesOpt')}</label>
      <textarea id="edit-class-log-notes-${log.id}" class="profile-edit-input" rows="3">${escapeHTML(log.notes || '')}</textarea>
      <p class="profile-edit-error" data-edit-class-log-error="${log.id}"></p>
      <div style="display:flex; gap:8px;">
        <button type="submit" class="btn btn-primary">${t('profile.save')}</button>
        <button type="button" class="btn" data-cancel-edit-log="${log.id}">${t('myFlashcards.edit.cancel')}</button>
      </div>
    </form>
  `;
}

function classLogRowHTML(log, showUsername){
  const isEditing = ADMIN_CLASS_LOGS_STATE.editingId === log.id;
  return `
    <div class="admin-badge-row" style="align-items:flex-start;">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${showUsername ? `<span style="opacity:.6">@${escapeHTML(log.__studentUsername || '?')}</span> · ` : ''}${fmtDate(new Date(`${log.class_date}T00:00:00`))}</div>
        ${!isEditing ? `<div class="admin-badge-desc">${classLogFieldRowsHTML(log) || `<em>${t('admin.classLogs.noFields')}</em>`}</div>` : classLogEditFormHTML(log)}
      </div>
      ${!isEditing ? `
      <button class="admin-badge-delete-btn" data-edit-class-log="${log.id}" title="${t('myFlashcards.row.editTitle')}">✏️</button>
      <button class="admin-badge-delete-btn" data-delete-class-log="${log.id}" title="${t('admin.common.delete')}">✕</button>
      ` : ''}
    </div>
  `;
}

async function buildClassLogsListBoxHTML(selectedStudents){
  const logLists = await Promise.all(selectedStudents.map(s => fetchClassLogs(s.student_id, s.language_app_key)));
  const logs = logLists.flatMap((list, i) => list.map(log => ({ ...log, __studentUsername: selectedStudents[i].username })));
  logs.sort((a, b) => (b.class_date.localeCompare(a.class_date)) || (new Date(b.created_at) - new Date(a.created_at)));
  const showUsername = selectedStudents.length > 1;

  return `
    <div class="section-label">${t('admin.classLogs.listTitle', { n: logs.length })}</div>
    ${logs.length ? logs.map(log => classLogRowHTML(log, showUsername)).join('') : `<p class="profile-empty-note">${t('admin.classLogs.emptyFor')}${adminEmptyForSuffix(selectedStudents.length)}.</p>`}
  `;
}

function wireClassLogsListBox(listBox){
  listBox.querySelectorAll('[data-edit-class-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      ADMIN_CLASS_LOGS_STATE.editingId = Number(btn.dataset.editClassLog);
      await refreshClassLogsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-cancel-edit-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      ADMIN_CLASS_LOGS_STATE.editingId = null;
      await refreshClassLogsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-delete-class-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('admin.classLogs.deleteConfirm'))) return;
      await deleteClassLog(btn.dataset.deleteClassLog);
      showToast(t('admin.classLogs.deleted'));
      await refreshClassLogsListBox(listBox);
    });
  });
  listBox.querySelectorAll('[data-edit-class-log-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.editClassLogForm;
      const errorEl = listBox.querySelector(`[data-edit-class-log-error="${id}"]`);
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
      showToast(t('admin.classLogs.updated'));
      await refreshClassLogsListBox(listBox);
    });
  });
}

async function refreshClassLogsListBox(listBox){
  const selectedStudents = ADMIN_CLASS_LOGS_STATE._studentsCache.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
  listBox.innerHTML = await buildClassLogsListBoxHTML(selectedStudents);
  wireClassLogsListBox(listBox);
}

// Atualiza tudo que depende da seleção de alunos SEM recriar o <form> de
// "Nova aula" (onde tópico/lição de casa/observações/notas digitados
// vivem) -- mesmo princípio de updateFlashcardsSelectionDependentUI() em
// admin-flashcards.js (ver comentário lá pro porquê).
async function updateClassLogsSelectionDependentUI(){
  const students = ADMIN_CLASS_LOGS_STATE._studentsCache;
  const selectedStudents = students.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = adminSelectionCountLabel(selectedStudents.length);

  const counterEl = document.getElementById('admin-classlog-selection-counter');
  if (counterEl) counterEl.textContent = selectionCountLabel;

  const subtitleEl = document.getElementById('admin-classlog-content-subtitle');
  if (subtitleEl) subtitleEl.textContent = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1 ? ` -- ${tp('admin.common.selectedCount', selectedStudents.length)}` : '';

  const contentHint = document.getElementById('admin-classlog-content-hint');
  if (contentHint) contentHint.style.display = selectedStudents.length ? 'none' : '';

  const btn = document.getElementById('admin-create-class-log-btn');
  if (btn){
    btn.disabled = !selectedStudents.length;
    btn.textContent = `${t('admin.classLogs.register')}${adminForStudentsSuffix(selectedStudents.length)}`;
  }

  const listBox = document.getElementById('admin-classlogs-list-box');
  if (listBox) await refreshClassLogsListBox(listBox);

  return selectedStudents;
}

function applyClassLogPickerFilters(wrap){
  const q = (document.getElementById('admin-classlog-search')?.value || '').trim().toLowerCase();
  const lang = ADMIN_CLASS_LOGS_STATE.langFilter;
  wrap.querySelectorAll('[data-student-row]').forEach(row => {
    const matchesText = !q || row.dataset.searchtext.includes(q);
    const matchesLang = lang === 'all' || row.dataset.lang === lang;
    row.style.display = (matchesText && matchesLang) ? '' : 'none';
  });
}

async function renderAdminClassLogsView(){
  const wrap = document.getElementById('admin-classlogs-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const students = await fetchMyStudents();
  if (!students.length){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.classLogs.linkFirst')}</p>`;
    return;
  }
  ADMIN_CLASS_LOGS_STATE._studentsCache = students;

  // Mesmo padrão de admin-flashcards.js/admin-support-materials.js: seleção
  // vazia é um estado válido, nunca cai de volta pro primeiro aluno.
  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_CLASS_LOGS_STATE.studentIds = new Set([...ADMIN_CLASS_LOGS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = adminSelectionCountLabel(selectedStudents.length);

  const langsPresent = [...new Set(students.map(s => s.language_app_key))];
  const langFilterHTML = langsPresent.length > 1 ? `
    <div class="leaderboard-tabs" role="tablist" aria-label="${t('admin.common.langFilterAria')}" style="justify-content:flex-start; margin-bottom:8px;">
      <button type="button" class="leaderboard-tab ${ADMIN_CLASS_LOGS_STATE.langFilter === 'all' ? 'active' : ''}" data-lang-filter="all">${t('admin.common.all')} (${students.length})</button>
      ${langsPresent.map(key => `<button type="button" class="leaderboard-tab ${ADMIN_CLASS_LOGS_STATE.langFilter === key ? 'active' : ''}" data-lang-filter="${key}">${STUDENT_LANGUAGE_LABELS[key] || key} (${students.filter(s => s.language_app_key === key).length})</button>`).join('')}
    </div>
  ` : '';

  // Busca casa por nome E @usuário (mesmo padrão de admin-flashcards.js).
  const studentCheckboxesHTML = students.map(s => `
    <label data-student-row data-lang="${s.language_app_key}" data-searchtext="${escapeHTML(`${s.display_name || ''} ${s.username || ''}`.toLowerCase())}" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0; width:100%; box-sizing:border-box;">
      <input type="checkbox" data-classlog-student-checkbox value="${s.student_id}" ${ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id) ? 'checked' : ''}>
      ${classLogStudentLabel(s)} -- ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const newLogSubtitle = selectedStudents.length === 1
    ? ` -- ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` -- ${tp('admin.common.selectedCount', selectedStudents.length)}`
      : '';

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">${t('admin.common.students')}</div>
      <p class="profile-edit-hint">${t('admin.classLogs.pickStudentsHint')}</p>
      ${langFilterHTML}
      <input type="text" id="admin-classlog-search" class="profile-edit-input" placeholder="${t('admin.common.searchPlaceholder')}" autocomplete="off" style="margin-bottom:8px;">
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-classlog-select-all" style="font-size:13px;">${t('publicProfile.selectAll')}</a>
        <a href="#" id="admin-classlog-select-none" style="font-size:13px;">${t('publicProfile.clear')}</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:flex; flex-direction:column;">
        ${studentCheckboxesHTML}
      </div>
      <p class="profile-edit-hint" id="admin-classlog-selection-counter" style="font-weight:700; margin-top:6px;">${selectionCountLabel}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.classLogs.newTitle')}<span id="admin-classlog-content-subtitle">${newLogSubtitle}</span></div>
      <p class="profile-edit-hint" id="admin-classlog-content-hint" style="${selectedStudents.length ? 'display:none;' : ''}">${t('admin.classLogs.needStudent')}</p>
      <form id="admin-create-class-log-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-class-log-date">${t('admin.common.date')}</label>
        <input type="date" id="admin-class-log-date" class="profile-edit-input" value="${todayStr()}">
        <label class="profile-edit-label" for="admin-class-log-topic">${t('admin.classLogs.topicOpt')}</label>
        <input type="text" id="admin-class-log-topic" class="profile-edit-input" placeholder="${t('admin.classLogs.topicPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-homework">${t('admin.classLogs.homeworkOpt')}</label>
        <input type="text" id="admin-class-log-homework" class="profile-edit-input" placeholder="${t('admin.classLogs.homeworkPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-observations">${t('admin.classLogs.observationsOpt')}</label>
        <input type="text" id="admin-class-log-observations" class="profile-edit-input" placeholder="${t('admin.classLogs.observationsPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-notes">${t('admin.classLogs.notesOpt')}</label>
        <textarea id="admin-class-log-notes" class="profile-edit-input" rows="3" placeholder="${t('admin.classLogs.notesPlaceholder')}"></textarea>
        <p class="profile-edit-error" id="admin-create-class-log-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-class-log-btn" ${selectedStudents.length ? '' : 'disabled'}>${t('admin.classLogs.register')}${adminForStudentsSuffix(selectedStudents.length)}</button>
      </form>
    </div>

    <div class="profile-section" id="admin-classlogs-list-box">
      ${await buildClassLogsListBoxHTML(selectedStudents)}
    </div>
  `;

  wireClassLogsListBox(document.getElementById('admin-classlogs-list-box'));

  wrap.querySelectorAll('[data-classlog-student-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_CLASS_LOGS_STATE.studentIds.add(cb.value);
      else ADMIN_CLASS_LOGS_STATE.studentIds.delete(cb.value);
      updateClassLogsSelectionDependentUI();
    });
  });

  document.getElementById('admin-classlog-select-all').addEventListener('click', (e) => {
    e.preventDefault();
    ADMIN_CLASS_LOGS_STATE.studentIds = new Set(students.map(s => s.student_id));
    wrap.querySelectorAll('[data-classlog-student-checkbox]').forEach(cb => { cb.checked = true; });
    updateClassLogsSelectionDependentUI();
  });
  document.getElementById('admin-classlog-select-none').addEventListener('click', (e) => {
    e.preventDefault();
    // Seleção vazia é um estado válido -- limpa de verdade, sem cair de
    // volta pra um aluno default.
    ADMIN_CLASS_LOGS_STATE.studentIds = new Set();
    wrap.querySelectorAll('[data-classlog-student-checkbox]').forEach(cb => { cb.checked = false; });
    updateClassLogsSelectionDependentUI();
  });

  wrap.querySelectorAll('[data-lang-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      ADMIN_CLASS_LOGS_STATE.langFilter = pill.dataset.langFilter;
      wrap.querySelectorAll('[data-lang-filter]').forEach(p => p.classList.toggle('active', p === pill));
      applyClassLogPickerFilters(wrap);
    });
  });

  document.getElementById('admin-classlog-search').addEventListener('input', () => applyClassLogPickerFilters(wrap));

  document.getElementById('admin-create-class-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-class-log-btn');
    const errorEl = document.getElementById('admin-create-class-log-error');
    errorEl.textContent = '';

    const selectedNow = ADMIN_CLASS_LOGS_STATE._studentsCache.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
    if (!selectedNow.length){
      errorEl.textContent = t('admin.common.selectAtLeastOne');
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
    const results = await Promise.all(selectedNow.map(s => createClassLog({
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
    showToast(results.length > 1 ? t('admin.classLogs.registeredN', { n: results.length - failed.length }) : t('admin.classLogs.registered'));
    // Único ponto de re-render COMPLETO por causa da seleção -- intencional
    // aqui, um submit bem sucedido deve mesmo limpar o formulário.
    renderAdminClassLogsView();
  });
}
