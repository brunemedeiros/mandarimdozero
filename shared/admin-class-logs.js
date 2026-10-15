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

let ADMIN_CLASS_LOGS_STATE = { studentIds: new Set(), classroomIds: new Set(), langFilter: 'all', editingId: null, _studentsCache: [], _classroomsCache: [],
  view: 'register', cal: null, calSelected: null, calEditingId: null };

// 094: turmas da professora (as mesmas do Mural), em todos os idiomas em que ela tem aluno.
async function fetchClassLogClassrooms(langs){
  const lists = await Promise.all(langs.map(async lang => {
    const { data, error } = await supabaseClient.rpc('mural_list', { p_lang: lang });
    if (error || !data || !data.as_teacher) return [];
    return (data.as_teacher.classrooms || []).map(c => ({ id: c.id, name: c.name, language_app_key: lang, members: c.members || [] }));
  }));
  return lists.flat();
}

function classLogSelectedClassrooms(){
  return ADMIN_CLASS_LOGS_STATE._classroomsCache.filter(c => ADMIN_CLASS_LOGS_STATE.classroomIds.has(String(c.id)));
}

function classLogLabelById(id){
  return (CLASS_ATTENDANCE_LABELS || []).find(l => String(l.id) === String(id)) || null;
}

// Presença no estilo do Notion (pedido da autora, 2026-10-14): sem seção separada. No próprio
// campo: clicar escolhe, digitar um nome + Enter cria, "⋯" no rótulo renomeia, troca a cor e
// arquiva (arquivado some da lista; aulas antigas continuam com ele). O rótulo atual da aula
// aparece mesmo se arquivado. Mexer num rótulo atualiza só os seletores (DOM), nunca o formulário.
function attChoicesHTML(prefix, current){
  const labels = (CLASS_ATTENDANCE_LABELS || []).filter(l => !l.archived || String(l.id) === current);
  return `
    <label class="att-pill att-choice" data-color="gray"><input type="radio" name="${prefix}-att" value="" ${current ? '' : 'checked'}> ${t('panel.classLog.attendanceNone')}</label>
    ${labels.map(l => `<span class="att-chip-wrap"><label class="att-pill att-choice" data-color="${escapeHTML(l.color)}"><input type="radio" name="${prefix}-att" value="${l.id}" ${String(l.id) === current ? 'checked' : ''}> ${escapeHTML(l.name)}</label><button type="button" class="att-more" data-att-more="${l.id}" aria-label="${escapeHTML(t('panel.classLog.labels.edit', { name: l.name }))}" title="${escapeHTML(t('panel.classLog.labels.edit', { name: l.name }))}">⋯</button></span>`).join('')}`;
}

function classLogExtrasFormHTML(prefix, log){
  const current = log && log.attendance_label_id != null ? String(log.attendance_label_id) : '';
  const skills = new Set((log && log.skills) || []);
  return `
    <fieldset class="class-log-extras" data-class-log-extras="${prefix}">
      <legend class="profile-edit-label">${t('panel.classLog.attendance')}</legend>
      <div class="att-choices" data-att-choices="${prefix}">${attChoicesHTML(prefix, current)}</div>
      <input type="text" class="profile-edit-input att-new" data-att-new="${prefix}" maxlength="40" autocomplete="off" placeholder="${t('panel.classLog.labels.createPlaceholder')}" aria-label="${t('panel.classLog.labels.createPlaceholder')}">
      <div class="att-menu" data-att-menu="${prefix}" hidden></div>
      <legend class="profile-edit-label">${t('panel.classLog.skills')}</legend>
      <div class="skill-toggles">
        ${CLASS_LOG_SKILLS.map(k => `<label class="skill-toggle"><input type="checkbox" data-skill value="${k}" ${skills.has(k) ? 'checked' : ''}> ${escapeHTML(classLogSkillLabel(k))}</label>`).join('')}
      </div>
    </fieldset>`;
}

function readClassLogExtras(root, prefix){
  const box = root.querySelector(`[data-class-log-extras="${prefix}"]`);
  if (!box) return { attendanceLabelId: null, skills: [] };
  const att = box.querySelector(`input[name="${prefix}-att"]:checked`);
  return { attendanceLabelId: att && att.value ? att.value : null, skills: [...box.querySelectorAll('input[data-skill]:checked')].map(i => i.value) };
}

function classLogRowBadgesHTML(log){
  const label = log.attendance_label_id != null ? classLogLabelById(log.attendance_label_id) : null;
  return classLogBadgesHTML({ attendanceName: label && label.name, attendanceColor: label && label.color, skills: log.skills, classroomName: log.__classroomName });
}

// Re-renderiza só os chips de Presença (todos os formulários abertos), mantendo a escolha de cada um.
function refreshAttendanceChoices(selectIn){
  document.querySelectorAll('[data-att-choices]').forEach(box => {
    const prefix = box.dataset.attChoices;
    const checked = box.querySelector(`input[name="${prefix}-att"]:checked`);
    let current = checked ? checked.value : '';
    if (selectIn && selectIn.prefix === prefix) current = String(selectIn.id);
    // Aula nova não nasce com rótulo arquivado; aula já registrada mantém o dela.
    if (prefix === 'new' && current && classLogLabelById(current)?.archived) current = '';
    box.innerHTML = attChoicesHTML(prefix, current);
  });
  const listBox = document.getElementById('admin-classlogs-list-box');
  if (listBox && ADMIN_CLASS_LOGS_STATE.editingId == null) refreshClassLogsListBox(listBox);
}

function attMenuHTML(l){
  return `
    <div class="att-menu-box" data-att-menu-label="${l.id}">
      <input type="text" class="profile-edit-input" data-att-rename maxlength="40" value="${escapeHTML(l.name)}" aria-label="${escapeHTML(t('panel.classLog.labels.name'))}">
      <div class="att-colors" role="group" aria-label="${escapeHTML(t('panel.classLog.labels.color'))}">
        ${CLASS_ATTENDANCE_COLORS.map(c => `<button type="button" class="att-pill att-swatch" data-color="${c}" data-att-color="${c}" aria-pressed="${l.color === c}">${escapeHTML(t('panel.classLog.color.' + c))}</button>`).join('')}
      </div>
      <div class="att-menu-actions">
        <button type="button" class="admin-select-link" data-att-archive style="background:none; border:none; cursor:pointer; padding:0;">${t('panel.classLog.labels.archive')}</button>
        <button type="button" class="btn btn-secondary" data-att-close>${t('panel.classLog.labels.done')}</button>
      </div>
      <p class="profile-edit-error" data-att-error></p>
    </div>`;
}

// Cor do rótulo novo: a primeira da lista que a professora ainda não usa (como o Notion, que varia as cores).
function nextAttendanceColor(){
  const used = new Set((CLASS_ATTENDANCE_LABELS || []).filter(l => !l.archived).map(l => l.color));
  return CLASS_ATTENDANCE_COLORS.find(c => !used.has(c)) || CLASS_ATTENDANCE_COLORS[(CLASS_ATTENDANCE_LABELS || []).length % CLASS_ATTENDANCE_COLORS.length];
}

// Delegação no container da aba (ligada uma vez): vale para "Nova aula" e para as aulas em edição.
function wireAttendancePicker(wrap){
  if (wrap.dataset.attWired) return;
  wrap.dataset.attWired = '1';
  const menuOf = (el) => el.closest('[data-class-log-extras]')?.querySelector('[data-att-menu]');
  const saveLabel = async (l, patch, errEl) => {
    const res = await saveAttendanceLabel(Object.assign({ id: l.id, name: l.name, color: l.color, countsAs: l.counts_as, archived: l.archived }, patch));
    if (!res.ok){ if (errEl) errEl.textContent = res.error; return false; }
    refreshAttendanceChoices();
    return true;
  };
  wrap.addEventListener('click', async (e) => {
    const more = e.target.closest('[data-att-more]');
    if (more){
      const l = classLogLabelById(more.dataset.attMore);
      const menu = menuOf(more);
      if (!l || !menu) return;
      menu.innerHTML = attMenuHTML(l);
      menu.hidden = false;
      menu.querySelector('[data-att-rename]').focus();
      return;
    }
    const box = e.target.closest('[data-att-menu-label]');
    if (!box) return;
    const l = classLogLabelById(box.dataset.attMenuLabel);
    const menu = box.closest('[data-att-menu]');
    const errEl = box.querySelector('[data-att-error]');
    const sw = e.target.closest('[data-att-color]');
    if (sw && l){
      if (await saveLabel(l, { color: sw.dataset.attColor }, errEl)){
        box.querySelectorAll('[data-att-color]').forEach(b => b.setAttribute('aria-pressed', String(b === sw)));
      }
    } else if (e.target.closest('[data-att-archive]') && l){
      if (await saveLabel(l, { archived: true }, errEl)){ menu.hidden = true; menu.innerHTML = ''; }
    } else if (e.target.closest('[data-att-close]')){
      const input = box.querySelector('[data-att-rename]');
      if (l && input.value.trim() && input.value.trim() !== l.name && !(await saveLabel(l, { name: input.value }, errEl))) return;
      menu.hidden = true; menu.innerHTML = '';
    }
  });
  wrap.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const rename = e.target.closest('[data-att-rename]');
    if (rename){
      e.preventDefault();
      const box = rename.closest('[data-att-menu-label]');
      const l = classLogLabelById(box.dataset.attMenuLabel);
      if (l && rename.value.trim() && rename.value.trim() !== l.name) await saveLabel(l, { name: rename.value }, box.querySelector('[data-att-error]'));
      return;
    }
    const create = e.target.closest('[data-att-new]');
    if (!create) return;
    e.preventDefault(); // Enter no campo cria o rótulo, nunca envia o formulário da aula
    const name = create.value.trim();
    if (!name) return;
    const prefix = create.dataset.attNew;
    const existing = (CLASS_ATTENDANCE_LABELS || []).find(l => l.name.toLowerCase() === name.toLowerCase());
    if (existing){
      if (existing.archived && !(await saveLabel(existing, { archived: false }))) return;
      create.value = '';
      refreshAttendanceChoices({ prefix, id: existing.id });
      return;
    }
    const res = await saveAttendanceLabel({ name, color: nextAttendanceColor(), countsAs: 'other', sortOrder: (CLASS_ATTENDANCE_LABELS || []).length + 1 });
    if (!res.ok){ showToast(res.error); return; }
    create.value = '';
    const made = (CLASS_ATTENDANCE_LABELS || []).find(l => l.name === name.slice(0, 40));
    refreshAttendanceChoices(made ? { prefix, id: made.id } : null);
  });
}

// ---------- Revisar do Notion (importação de 2026-10-15) ----------
// Tópicos que podiam ter anotação pessoal entraram SÓ nas Anotações (privadas), marcados com
// "[Notion] ". Aqui a professora edita o texto e decide: "Mostrar ao aluno" (vira Tópico ou Para
// a próxima aula; o original continua nas Anotações, sem a marca) ou "Deixar só para mim".
const NOTION_MARK = '[Notion] ';
const NOTION_HW_MARK = '[Notion] Para a próxima aula: ';

function notionReviewParts(notes){
  return String(notes || '').split('\n').filter(l => l.startsWith(NOTION_MARK)).map(l => l.startsWith(NOTION_HW_MARK)
    ? { field: 'homework', text: l.slice(NOTION_HW_MARK.length) }
    : { field: 'topic', text: l.slice(NOTION_MARK.length) });
}
function notionCleanNotes(notes){
  return String(notes || '').split('\n').map(l => l.startsWith(NOTION_HW_MARK) ? `Para a próxima aula: ${l.slice(NOTION_HW_MARK.length)}` : l.startsWith(NOTION_MARK) ? l.slice(NOTION_MARK.length) : l).join('\n').trim() || null;
}

async function fetchNotionReviewLogs(){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient.from('teacher_class_logs')
    .select('id, student_id, classroom_id, class_date, topic, homework, notes')
    .eq('teacher_id', CURRENT_USER.id).like('notes', '[Notion]%')
    .order('class_date', { ascending: true });
  if (error){ console.error('Erro ao carregar aulas para revisar:', error); return []; }
  return (data || []).filter(l => String(l.notes || '').startsWith('[Notion]'));
}

function notionReviewWho(log){
  if (log.classroom_id){
    const c = ADMIN_CLASS_LOGS_STATE._classroomsCache.find(x => String(x.id) === String(log.classroom_id));
    return `👥 ${escapeHTML(c ? c.name : '?')}`;
  }
  const st = ADMIN_CLASS_LOGS_STATE._studentsCache.find(x => x.student_id === log.student_id);
  return st ? classLogStudentLabel(st) : '?';
}

function notionReviewItemHTML(log){
  return `
    <div class="notion-review-item" data-notion-review="${log.id}">
      <div class="admin-badge-name">${notionReviewWho(log)} · ${fmtDate(new Date(`${log.class_date}T00:00:00`))}</div>
      ${notionReviewParts(log.notes).map((p, i) => `
        <label class="profile-edit-label" for="notion-rv-${log.id}-${i}">${p.field === 'homework' ? t('panel.classLog.review.toHomework') : t('panel.classLog.review.toTopic')}</label>
        <textarea id="notion-rv-${log.id}-${i}" class="profile-edit-input" rows="2" data-notion-field="${p.field}">${escapeHTML(p.text)}</textarea>`).join('')}
      <div class="notion-review-actions">
        <button type="button" class="btn btn-primary" data-notion-show="${log.id}">${t('panel.classLog.review.show')}</button>
        <button type="button" class="btn btn-secondary" data-notion-keep="${log.id}">${t('panel.classLog.review.keep')}</button>
      </div>
    </div>`;
}

async function renderNotionReviewBox(host){
  if (!host) return;
  const logs = await fetchNotionReviewLogs();
  if (!logs.length){ host.innerHTML = ''; return; }
  host.innerHTML = `
    <details class="profile-section notion-review" ${host.dataset.open === '0' ? '' : 'open'}>
      <summary class="section-label">${escapeHTML(tp('panel.classLog.review.title', logs.length))}</summary>
      <p class="profile-edit-hint">${t('panel.classLog.review.hint')}</p>
      ${logs.map(notionReviewItemHTML).join('')}
    </details>`;
  host.querySelector('details').addEventListener('toggle', (e) => { host.dataset.open = e.target.open ? '1' : '0'; });
  const finish = async (log, showToStudent, item) => {
    const patch = { notes: notionCleanNotes(log.notes), updated_at: new Date().toISOString() };
    if (showToStudent){
      item.querySelectorAll('[data-notion-field]').forEach(tx => {
        const v = tx.value.trim();
        if (!v) return;
        const f = tx.dataset.notionField;
        const cur = (f === 'topic' ? log.topic : log.homework) || '';
        patch[f] = cur ? `${cur}\n${v}` : v;
      });
    }
    const { error } = await supabaseClient.from('teacher_class_logs').update(patch).eq('id', log.id);
    if (error){ console.error('Erro ao revisar aula:', error); showToast(t('teacherLogs.err.saveFailed')); return; }
    showToast(showToStudent ? t('panel.classLog.review.shown') : t('panel.classLog.review.kept'));
    await renderNotionReviewBox(host);
    const listBox = document.getElementById('admin-classlogs-list-box');
    if (listBox && ADMIN_CLASS_LOGS_STATE.editingId == null) refreshClassLogsListBox(listBox);
  };
  logs.forEach(log => {
    const item = host.querySelector(`[data-notion-review="${log.id}"]`);
    item.querySelector('[data-notion-show]').addEventListener('click', () => finish(log, true, item));
    item.querySelector('[data-notion-keep]').addEventListener('click', () => finish(log, false, item));
  });
}

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

// 101: horário (opcional) e duração. Aula sem horário vale para o dia inteiro.
// Duração: padrão 60 min, a professora muda para qualquer valor de 5 a 600 (pedido da autora, 2026-10-15).
// Duração (decisão da autora, 2026-10-15): seletor de 30 em 30 min, de 30 min a 5h, padrão 1h. Um valor fora da
// lista (aula antiga ou importada) entra como opção extra para não se perder ao editar.
const CLASS_LOG_DEFAULT_TIME = '07:00';
const CLASS_LOG_DURATIONS = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
function classLogDurationLabel(min){
  const m = Number(min) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}
function classLogDurationOptionsHTML(current){
  const cur = Number(current) || 60;
  const list = CLASS_LOG_DURATIONS.includes(cur) ? CLASS_LOG_DURATIONS : [...CLASS_LOG_DURATIONS, cur].sort((a, b) => a - b);
  return list.map(m => `<option value="${m}"${m === cur ? ' selected' : ''}>${classLogDurationLabel(m)}</option>`).join('');
}

function classLogWhenFieldsHTML(timeId, durId, log){
  // Padrão da autora (2026-10-15): aula sem horário = 7h, 1h de duração (o mesmo que o link de agenda usa).
  const time = log && log.start_time ? String(log.start_time).slice(0, 5) : CLASS_LOG_DEFAULT_TIME;
  const dur = (log && log.duration_minutes) || 60;
  return `
    <div class="class-log-when">
      <div><label class="profile-edit-label" for="${timeId}">${t('panel.classLog.time')}</label>
        <input type="time" id="${timeId}" class="profile-edit-input" value="${time}"></div>
      <div><label class="profile-edit-label" for="${durId}">${t('panel.classLog.durationMin')}</label>
        <select id="${durId}" class="profile-edit-input">${classLogDurationOptionsHTML(dur)}</select></div>
    </div>`;
}
function classLogTimeLabel(log){
  return log && log.start_time ? ` · ${String(log.start_time).slice(0, 5)}` : '';
}

function classLogEditFormHTML(log){
  return `
    <form class="profile-edit-form" data-edit-class-log-form="${log.id}" style="margin-top:8px;">
      <label class="profile-edit-label" for="edit-class-log-date-${log.id}">${t('admin.common.date')}</label>
      <input type="date" id="edit-class-log-date-${log.id}" class="profile-edit-input" value="${log.class_date}">
      ${classLogWhenFieldsHTML(`edit-class-log-time-${log.id}`, `edit-class-log-duration-${log.id}`, log)}
      <label class="profile-edit-label" for="edit-class-log-topic-${log.id}">${t('admin.classLogs.topicOpt')}</label>
      <input type="text" id="edit-class-log-topic-${log.id}" class="profile-edit-input" value="${escapeHTML(log.topic || '')}">
      <label class="profile-edit-label" for="edit-class-log-homework-${log.id}">${t('admin.classLogs.homeworkOpt')}</label>
      <input type="text" id="edit-class-log-homework-${log.id}" class="profile-edit-input" value="${escapeHTML(log.homework || '')}">
      <label class="profile-edit-label" for="edit-class-log-observations-${log.id}">${t('admin.classLogs.observationsOpt')}</label>
      <input type="text" id="edit-class-log-observations-${log.id}" class="profile-edit-input" value="${escapeHTML(log.observations || '')}">
      <label class="profile-edit-label" for="edit-class-log-notes-${log.id}">${t('admin.classLogs.notesOpt')}</label>
      <textarea id="edit-class-log-notes-${log.id}" class="profile-edit-input" rows="3">${escapeHTML(log.notes || '')}</textarea>
      ${classLogExtrasFormHTML(`edit-${log.id}`, log)}
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
        <div class="admin-badge-name">${showUsername && log.__studentUsername ? `<span style="opacity:.6">@${escapeHTML(log.__studentUsername)}</span> · ` : ''}${fmtDate(new Date(`${log.class_date}T00:00:00`))}${classLogTimeLabel(log)}</div>
        ${!isEditing ? `${classLogRowBadgesHTML(log)}<div class="admin-badge-desc">${classLogFieldRowsHTML(log) || (classLogRowBadgesHTML(log) ? '' : `<em>${t('admin.classLogs.noFields')}</em>`)}</div>` : classLogEditFormHTML(log)}
      </div>
      ${!isEditing ? `
      <button class="admin-badge-delete-btn" data-edit-class-log="${log.id}" title="${t('myFlashcards.row.editTitle')}">✏️</button>
      <button class="admin-badge-delete-btn" data-delete-class-log="${log.id}" title="${t('admin.common.delete')}">✕</button>
      ` : ''}
    </div>
  `;
}

async function buildClassLogsListBoxHTML(selectedStudents, selectedClassrooms){
  selectedClassrooms = selectedClassrooms || classLogSelectedClassrooms();
  const logLists = await Promise.all(selectedStudents.map(s => fetchClassLogs(s.student_id, s.language_app_key)));
  const roomLists = await Promise.all(selectedClassrooms.map(c => fetchClassroomLogs(c.id)));
  const logs = logLists.flatMap((list, i) => list.map(log => ({ ...log, __studentUsername: selectedStudents[i].username })))
    .concat(roomLists.flatMap((list, i) => list.map(log => ({ ...log, __classroomName: selectedClassrooms[i].name }))));
  logs.sort((a, b) => (b.class_date.localeCompare(a.class_date)) || (new Date(b.created_at) - new Date(a.created_at)));
  const showUsername = selectedStudents.length + selectedClassrooms.length > 1;
  selectedStudents = selectedStudents.concat(selectedClassrooms);

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
        startTime: document.getElementById(`edit-class-log-time-${id}`).value,
        durationMinutes: document.getElementById(`edit-class-log-duration-${id}`).value,
        topic: document.getElementById(`edit-class-log-topic-${id}`).value,
        homework: document.getElementById(`edit-class-log-homework-${id}`).value,
        observations: document.getElementById(`edit-class-log-observations-${id}`).value,
        notes: document.getElementById(`edit-class-log-notes-${id}`).value,
        ...readClassLogExtras(form, `edit-${id}`),
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
  const selectedRooms = classLogSelectedClassrooms();
  const selectionCountLabel = adminSelectionCountLabel(selectedStudents.length) + (selectedRooms.length ? ` · ${tp('panel.classLog.classroomsSelected', selectedRooms.length)}` : '');

  const counterEl = document.getElementById('admin-classlog-selection-counter');
  if (counterEl) counterEl.textContent = selectionCountLabel;

  const subtitleEl = document.getElementById('admin-classlog-content-subtitle');
  if (subtitleEl) subtitleEl.textContent = selectedStudents.length === 1
    ? ` · ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1 ? ` · ${tp('admin.common.selectedCount', selectedStudents.length)}` : '';

  const contentHint = document.getElementById('admin-classlog-content-hint');
  if (contentHint) contentHint.style.display = selectedStudents.length || selectedRooms.length ? 'none' : '';

  const btn = document.getElementById('admin-create-class-log-btn');
  if (btn){
    btn.disabled = !selectedStudents.length && !selectedRooms.length;
    btn.textContent = `${t('admin.classLogs.register')}${adminForStudentsSuffix(selectedStudents.length)}${selectedRooms.length ? ` · ${tp('panel.classLog.classroomsSelected', selectedRooms.length)}` : ''}`;
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

// Datas semanais a partir de `from` até `until` (inclusive), no máximo 52 aulas. Sem `until`: só `from`.
function classLogRepeatDates(from, until){
  const out = [from];
  if (!until || until <= from) return out;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  if (!m) return out;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  while (out.length < 52){
    d.setDate(d.getDate() + 7);
    const key = classLogLocalYMD(d);
    if (key > until) break;
    out.push(key);
  }
  return out;
}

// ---------- Calendário da professora (101): todas as aulas do mês, alunos e turmas ----------
function classLogWhoShort(log){
  if (log.classroom_id){
    const c = ADMIN_CLASS_LOGS_STATE._classroomsCache.find(x => String(x.id) === String(log.classroom_id));
    return c ? c.name : '?';
  }
  const st = ADMIN_CLASS_LOGS_STATE._studentsCache.find(x => x.student_id === log.student_id);
  const name = st ? (st.display_name || st.username || '?') : '?';
  return String(name).split(/\s+/)[0];
}

async function renderTeacherClassCalendar(){
  const host = document.getElementById('admin-classlogs-calendar');
  if (!host) return;
  const now = new Date();
  const cal = ADMIN_CLASS_LOGS_STATE.cal || (ADMIN_CLASS_LOGS_STATE.cal = { y: now.getFullYear(), m: now.getMonth() });
  const range = classCalendarMonthRange(cal.y, cal.m);
  const logs = await fetchTeacherClassLogsRange(range.from, range.to);
  const entries = logs.map(l => {
    const label = l.attendance_label_id != null ? classLogLabelById(l.attendance_label_id) : null;
    return { id: l.id, date: String(l.class_date), time: l.start_time ? String(l.start_time).slice(0, 5) : '', label: classLogWhoShort(l), color: label ? label.color : '', log: l };
  });
  const sel = ADMIN_CLASS_LOGS_STATE.calSelected;
  const dayList = sel ? entries.filter(e => e.date === sel).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')) : [];
  host.innerHTML = `
    ${classCalendarHTML(cal.y, cal.m, entries, { selected: sel })}
    <p class="profile-edit-hint cal-legend">${t('panel.classLog.cal.legend')}</p>
    ${sel ? `
      <div class="profile-section cal-day" data-cal-day-panel="${sel}">
        <div class="section-label">${escapeHTML(fmtDate(new Date(`${sel}T00:00:00`), { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
        ${dayList.length ? dayList.map(e => {
          const l = e.log;
          const editing = ADMIN_CLASS_LOGS_STATE.calEditingId === l.id;
          return `<div class="admin-badge-row" style="align-items:flex-start;" data-cal-log="${l.id}">
            <div class="admin-badge-info">
              <div class="admin-badge-name">${e.time ? `${escapeHTML(e.time)} · ` : ''}${l.classroom_id ? '👥 ' : ''}${escapeHTML(classLogWhoShort(l))}</div>
              ${editing ? classLogEditFormHTML(l) : `${classLogRowBadgesHTML(l)}<div class="admin-badge-desc">${classLogFieldRowsHTML(l)}</div>`}
            </div>
            ${editing ? '' : `<button class="admin-badge-delete-btn" data-cal-edit="${l.id}" title="${t('myFlashcards.row.editTitle')}">✏️</button>
            <button class="admin-badge-delete-btn" data-cal-delete="${l.id}" title="${t('admin.common.delete')}">✕</button>`}
          </div>`;
        }).join('') : `<p class="profile-empty-note">${t('panel.classLog.cal.empty')}</p>`}
        <button type="button" class="btn btn-secondary" data-cal-schedule="${sel}">${t('panel.classLog.cal.schedule')}</button>
      </div>` : ''}`;
  host.querySelectorAll('[data-cal-nav]').forEach(b => b.addEventListener('click', () => {
    const step = Number(b.dataset.calNav);
    if (step === 0){ const n = new Date(); cal.y = n.getFullYear(); cal.m = n.getMonth(); }
    else { const d = new Date(cal.y, cal.m + step, 1); cal.y = d.getFullYear(); cal.m = d.getMonth(); }
    ADMIN_CLASS_LOGS_STATE.calSelected = null; ADMIN_CLASS_LOGS_STATE.calEditingId = null;
    renderTeacherClassCalendar();
  }));
  host.querySelectorAll('[data-cal-day]').forEach(b => b.addEventListener('click', () => {
    ADMIN_CLASS_LOGS_STATE.calSelected = b.dataset.calDay; ADMIN_CLASS_LOGS_STATE.calEditingId = null;
    renderTeacherClassCalendar();
  }));
  host.querySelectorAll('[data-cal-edit]').forEach(b => b.addEventListener('click', () => {
    ADMIN_CLASS_LOGS_STATE.calEditingId = Number(b.dataset.calEdit); renderTeacherClassCalendar();
  }));
  host.querySelectorAll('[data-cal-delete]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(t('admin.classLogs.deleteConfirm'))) return;
    await deleteClassLog(b.dataset.calDelete);
    showToast(t('admin.classLogs.deleted'));
    renderTeacherClassCalendar();
  }));
  host.querySelectorAll('[data-cancel-edit-log]').forEach(b => b.addEventListener('click', () => {
    ADMIN_CLASS_LOGS_STATE.calEditingId = null; renderTeacherClassCalendar();
  }));
  host.querySelectorAll('[data-edit-class-log-form]').forEach(form => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = form.dataset.editClassLogForm;
    const res = await updateClassLog(id, {
      classDate: form.querySelector(`#edit-class-log-date-${id}`).value,
      startTime: form.querySelector(`#edit-class-log-time-${id}`).value,
      durationMinutes: form.querySelector(`#edit-class-log-duration-${id}`).value,
      topic: form.querySelector(`#edit-class-log-topic-${id}`).value,
      homework: form.querySelector(`#edit-class-log-homework-${id}`).value,
      observations: form.querySelector(`#edit-class-log-observations-${id}`).value,
      notes: form.querySelector(`#edit-class-log-notes-${id}`).value,
      ...readClassLogExtras(form, `edit-${id}`),
    });
    if (!res.ok){ form.querySelector(`[data-edit-class-log-error="${id}"]`).textContent = res.error; return; }
    ADMIN_CLASS_LOGS_STATE.calEditingId = null;
    showToast(t('admin.classLogs.updated'));
    renderTeacherClassCalendar();
  }));
  host.querySelector('[data-cal-schedule]')?.addEventListener('click', (e) => {
    switchClassLogsView('register');
    const input = document.getElementById('admin-class-log-date');
    if (input){ input.value = e.currentTarget.dataset.calSchedule; input.scrollIntoView({ block: 'center' }); input.focus(); }
  });
}

function switchClassLogsView(view){
  ADMIN_CLASS_LOGS_STATE.view = view === 'calendar' ? 'calendar' : 'register';
  document.querySelectorAll('[data-classlog-view]').forEach(b => {
    const on = b.dataset.classlogView === ADMIN_CLASS_LOGS_STATE.view;
    b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const reg = document.getElementById('admin-classlogs-register'), calHost = document.getElementById('admin-classlogs-calendar-wrap');
  if (reg) reg.hidden = ADMIN_CLASS_LOGS_STATE.view !== 'register';
  if (calHost) calHost.hidden = ADMIN_CLASS_LOGS_STATE.view !== 'calendar';
  if (ADMIN_CLASS_LOGS_STATE.view === 'calendar') renderTeacherClassCalendar();
}

async function renderAdminClassLogsView(){
  const wrap = document.getElementById('admin-classlogs-content');
  if (!wrap) return;
  if (!isTeacherUser()){
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
  const [rooms] = await Promise.all([
    fetchClassLogClassrooms([...new Set(students.map(s => s.language_app_key))]),
    fetchAttendanceLabels(),
  ]);
  ADMIN_CLASS_LOGS_STATE._classroomsCache = rooms;
  const validRooms = new Set(rooms.map(c => String(c.id)));
  ADMIN_CLASS_LOGS_STATE.classroomIds = new Set([...ADMIN_CLASS_LOGS_STATE.classroomIds].filter(id => validRooms.has(id)));
  const selectedRooms = classLogSelectedClassrooms();

  // Mesmo padrão de admin-flashcards.js/admin-support-materials.js: seleção
  // vazia é um estado válido, nunca cai de volta pro primeiro aluno.
  const validIds = new Set(students.map(s => s.student_id));
  ADMIN_CLASS_LOGS_STATE.studentIds = new Set([...ADMIN_CLASS_LOGS_STATE.studentIds].filter(id => validIds.has(id)));

  const selectedStudents = students.filter(s => ADMIN_CLASS_LOGS_STATE.studentIds.has(s.student_id));
  const selectionCountLabel = adminSelectionCountLabel(selectedStudents.length) + (selectedRooms.length ? ` · ${tp('panel.classLog.classroomsSelected', selectedRooms.length)}` : '');

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
      ${classLogStudentLabel(s)} · ${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key}
    </label>
  `).join('');

  const newLogSubtitle = selectedStudents.length === 1
    ? ` · ${STUDENT_LANGUAGE_LABELS[selectedStudents[0].language_app_key] || selectedStudents[0].language_app_key}`
    : selectedStudents.length > 1
      ? ` · ${tp('admin.common.selectedCount', selectedStudents.length)}`
      : '';

  wrap.innerHTML = `
    <div class="deck-topbar panel-nav class-log-views" role="tablist" aria-label="${t('panel.classLog.views')}">
      <button type="button" class="deck-topbar-btn" role="tab" data-classlog-view="register">${t('panel.classLog.view.register')}</button>
      <button type="button" class="deck-topbar-btn" role="tab" data-classlog-view="calendar">${t('panel.classLog.view.calendar')}</button>
    </div>
    <div id="admin-classlogs-calendar-wrap" hidden>${calendarFeedBoxHTML()}<div id="admin-classlogs-calendar"></div></div>
    <div id="admin-classlogs-register">
    <div id="admin-notion-review"></div>
    <div class="profile-section">
      <div class="section-label">${t('admin.common.students')}</div>
      <p class="profile-edit-hint">${t('admin.classLogs.pickStudentsHint')}</p>
      ${langFilterHTML}
      <input type="text" id="admin-classlog-search" class="profile-edit-input" placeholder="${t('admin.common.searchPlaceholder')}" autocomplete="off" style="margin-bottom:8px;">
      <div style="display:flex; gap:12px; margin-bottom:4px;">
        <a href="#" id="admin-classlog-select-all" class="admin-select-link">${t('publicProfile.selectAll')}</a>
        <a href="#" id="admin-classlog-select-none" class="admin-select-link">${t('publicProfile.clear')}</a>
      </div>
      <div class="profile-edit-input" style="height:auto; max-height:180px; overflow-y:auto; display:flex; flex-direction:column;">
        ${studentCheckboxesHTML}
      </div>
      ${rooms.length ? `
      <div class="section-label" style="margin-top:12px;">${t('panel.classLog.classrooms')}</div>
      <p class="profile-edit-hint">${t('panel.classLog.classroomsHint')}</p>
      <div class="profile-edit-input" style="height:auto; max-height:140px; overflow-y:auto; display:flex; flex-direction:column;">
        ${rooms.map(c => `<label data-classroom-row data-lang="${c.language_app_key}" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
          <input type="checkbox" data-classlog-classroom-checkbox value="${c.id}" ${ADMIN_CLASS_LOGS_STATE.classroomIds.has(String(c.id)) ? 'checked' : ''}>
          👥 ${escapeHTML(c.name)} · ${STUDENT_LANGUAGE_LABELS[c.language_app_key] || c.language_app_key} · ${tp('panel.classLog.membersCount', c.members.length)}
        </label>`).join('')}
      </div>` : ''}
      <p class="profile-edit-hint" id="admin-classlog-selection-counter" style="font-weight:700; margin-top:6px;">${selectionCountLabel}</p>
    </div>


    <div class="profile-section">
      <div class="section-label">${t('admin.classLogs.newTitle')}<span id="admin-classlog-content-subtitle">${newLogSubtitle}</span></div>
      <p class="profile-edit-hint" id="admin-classlog-content-hint" style="${selectedStudents.length || selectedRooms.length ? 'display:none;' : ''}">${t('admin.classLogs.needStudent')}</p>
      <form id="admin-create-class-log-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-class-log-date">${t('admin.common.date')}</label>
        <input type="date" id="admin-class-log-date" class="profile-edit-input" value="${todayStr()}">
        ${classLogWhenFieldsHTML('admin-class-log-time', 'admin-class-log-duration', null)}
        <label class="skill-toggle class-log-repeat"><input type="checkbox" id="admin-class-log-repeat"> ${t('panel.classLog.repeatWeekly')}</label>
        <div id="admin-class-log-repeat-box" hidden>
          <label class="profile-edit-label" for="admin-class-log-repeat-until">${t('panel.classLog.repeatUntil')}</label>
          <input type="date" id="admin-class-log-repeat-until" class="profile-edit-input">
          <p class="profile-edit-hint">${t('panel.classLog.repeatHint')}</p>
        </div>
        <label class="profile-edit-label" for="admin-class-log-topic">${t('admin.classLogs.topicOpt')}</label>
        <input type="text" id="admin-class-log-topic" class="profile-edit-input" placeholder="${t('admin.classLogs.topicPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-homework">${t('admin.classLogs.homeworkOpt')}</label>
        <input type="text" id="admin-class-log-homework" class="profile-edit-input" placeholder="${t('admin.classLogs.homeworkPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-observations">${t('admin.classLogs.observationsOpt')}</label>
        <input type="text" id="admin-class-log-observations" class="profile-edit-input" placeholder="${t('admin.classLogs.observationsPlaceholder')}" autocomplete="off">
        <label class="profile-edit-label" for="admin-class-log-notes">${t('admin.classLogs.notesOpt')}</label>
        <textarea id="admin-class-log-notes" class="profile-edit-input" rows="3" placeholder="${t('admin.classLogs.notesPlaceholder')}"></textarea>
        ${classLogExtrasFormHTML('new', null)}
        <p class="profile-edit-error" id="admin-create-class-log-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-class-log-btn" ${selectedStudents.length || selectedRooms.length ? '' : 'disabled'}>${t('admin.classLogs.register')}${adminForStudentsSuffix(selectedStudents.length)}${selectedRooms.length ? ` · ${tp('panel.classLog.classroomsSelected', selectedRooms.length)}` : ''}</button>
      </form>
    </div>

    <div class="profile-section" id="admin-classlogs-list-box">
      ${await buildClassLogsListBoxHTML(selectedStudents, selectedRooms)}
    </div>
    </div>
  `;
  wrap.querySelectorAll('[data-classlog-view]').forEach(b => b.addEventListener('click', () => switchClassLogsView(b.dataset.classlogView)));
  wireCalendarFeedBox(wrap);
  const repeatCb = document.getElementById('admin-class-log-repeat');
  repeatCb?.addEventListener('change', () => { document.getElementById('admin-class-log-repeat-box').hidden = !repeatCb.checked; });
  switchClassLogsView(ADMIN_CLASS_LOGS_STATE.view);

  wireClassLogsListBox(document.getElementById('admin-classlogs-list-box'));
  wireAttendancePicker(wrap);
  renderNotionReviewBox(document.getElementById('admin-notion-review'));

  wrap.querySelectorAll('[data-classlog-classroom-checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) ADMIN_CLASS_LOGS_STATE.classroomIds.add(cb.value);
      else ADMIN_CLASS_LOGS_STATE.classroomIds.delete(cb.value);
      updateClassLogsSelectionDependentUI();
    });
  });

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
    const roomsNow = classLogSelectedClassrooms();
    if (!selectedNow.length && !roomsNow.length){
      errorEl.textContent = t('admin.common.selectAtLeastOne');
      return;
    }
    btn.disabled = true;

    const classDate = document.getElementById('admin-class-log-date').value;
    const startTime = document.getElementById('admin-class-log-time').value;
    const durationMinutes = document.getElementById('admin-class-log-duration').value;
    const dates = classLogRepeatDates(classDate || todayStr(), document.getElementById('admin-class-log-repeat').checked
      ? document.getElementById('admin-class-log-repeat-until').value : '');
    const topic = document.getElementById('admin-class-log-topic').value;
    const homework = document.getElementById('admin-class-log-homework').value;
    const observations = document.getElementById('admin-class-log-observations').value;
    const notes = document.getElementById('admin-class-log-notes').value;
    const extras = readClassLogExtras(wrap, 'new');

    // Uma linha em teacher_class_logs POR aluno selecionado -- mesmo
    // conteúdo pra todos, mesmo padrão já usado em flashcards/material de
    // apoio (faz sentido pra uma aula em grupo com o mesmo tópico/lição de
    // casa pra todo mundo).
    // Turma (094): UMA linha com classroom_id, vista por todos os membros da turma.
    // 101: "Repetir toda semana" cria uma aula por semana até a data escolhida (agenda).
    const results = await Promise.all(dates.flatMap(d => selectedNow.map(s => createClassLog({
      studentId: s.student_id,
      languageAppKey: s.language_app_key,
      classDate: d, startTime, durationMinutes, topic, homework, observations, notes, ...extras,
    })).concat(roomsNow.map(c => createClassLog({
      classroomId: c.id,
      languageAppKey: c.language_app_key,
      classDate: d, startTime, durationMinutes, topic, homework, observations, notes, ...extras,
    })))));
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
