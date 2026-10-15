// ---------- Painel da professora + painel do Aluno (Mural, Aulas, Material) ----------
// Etapa 1 do plano Professora (docs/plano-professora-privacidade.md).
// O painel depende do PAPEL Professora (isTeacherUser, shared/permissions.js),
// nunca do Admin Mode. As abas reaproveitam os renders que já existiam
// (shared/admin-students.js, admin-flashcards.js, admin-class-logs.js,
// admin-support-materials.js); este arquivo só cuida da navegação.
//
// Lado do aluno: "Minhas aulas" (RPC get_my_class_logs, 076, sem o campo de
// notas privadas da professora) e "Material de apoio" (RLS da 076). Os dois
// itens de menu só aparecem para quem tem vínculo ativo E pelo menos 1 item.
//
// Depende de: shared/permissions.js, shared/supabase-client.js, shared/auth.js,
// fr/zh app.js (switchTab, APP_KEY) e os renders das abas acima.

const TEACHER_PANEL_SECTIONS = ['students', 'flashcards', 'classlogs', 'materials', 'mural'];
const TEACHER_PANEL_STATE = { section: 'students', cardsSub: 'cards' };

function switchTeacherPanelSection(section){
  if (!TEACHER_PANEL_SECTIONS.includes(section)) section = 'students';
  TEACHER_PANEL_STATE.section = section;
  document.querySelectorAll('[data-teacher-section]').forEach(btn => {
    const on = btn.dataset.teacherSection === section;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  TEACHER_PANEL_SECTIONS.forEach(s => {
    const el = document.getElementById(`admin-${s}-content`);
    if (el) el.style.display = s === section ? '' : 'none';
  });
  // Cartões tem 2 partes: Cartões e Banco de Revisão (só com a permissão review_bank, plano Professora).
  const subnav = document.getElementById('admin-cards-subnav');
  const bankOk = typeof hasPermission === 'function' && hasPermission('review_bank');
  const bank = section === 'flashcards' && bankOk && TEACHER_PANEL_STATE.cardsSub === 'bank';
  if (subnav) subnav.style.display = section === 'flashcards' && bankOk ? '' : 'none';
  const cardsEl = document.getElementById('admin-flashcards-content');
  const bankEl = document.getElementById('admin-reviewbank-content');
  if (cardsEl) cardsEl.style.display = section === 'flashcards' && !bank ? '' : 'none';
  if (bankEl) bankEl.style.display = bank ? '' : 'none';
  document.querySelectorAll('[data-cards-sub]').forEach(btn => {
    const on = btn.dataset.cardsSub === (bank ? 'bank' : 'cards');
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (section === 'students') renderAdminStudentsView();
  else if (section === 'flashcards') (bank ? renderReviewBankView() : renderAdminFlashcardsView());
  else if (section === 'classlogs') renderAdminClassLogsView();
  else if (section === 'mural') renderTeacherMuralSection();
  else renderAdminSupportMaterialsView();
}

async function renderTeacherPanelView(){
  await loadMyPermissions();
  switchTeacherPanelSection(TEACHER_PANEL_STATE.section);
}

document.querySelectorAll('[data-teacher-section]').forEach(btn => {
  btn.addEventListener('click', () => switchTeacherPanelSection(btn.dataset.teacherSection));
});
document.querySelectorAll('[data-cards-sub]').forEach(btn => {
  btn.addEventListener('click', () => {
    TEACHER_PANEL_STATE.cardsSub = btn.dataset.cardsSub === 'bank' ? 'bank' : 'cards';
    switchTeacherPanelSection('flashcards');
  });
});

// ---------- Lado do aluno ----------
const STUDENT_TEACHER_NAV = { logs: 0, materials: 0 };

async function fetchMyClassLogs(languageAppKey){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return [];
  // 101: com horário (get_my_class_schedule); 094: Presença e Competências; sem as duas, a RPC antiga.
  const missing = (err) => err && /PGRST202|42883|Could not find the function/.test(`${err.code} ${err.message}`);
  let { data, error } = await supabaseClient.rpc('get_my_class_schedule', { p_language_app_key: languageAppKey });
  if (missing(error)) ({ data, error } = await supabaseClient.rpc('get_my_class_log_entries', { p_language_app_key: languageAppKey }));
  if (missing(error)) ({ data, error } = await supabaseClient.rpc('get_my_class_logs', { p_language_app_key: languageAppKey }));
  if (error){ console.error('Erro ao carregar aulas:', error); return []; }
  return Array.isArray(data) ? data : [];
}

async function refreshStudentTeacherNav(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    STUDENT_TEACHER_NAV.logs = 0; STUDENT_TEACHER_NAV.materials = 0;
    applyStudentNavVisibility();
    return;
  }
  const [logs, materials] = await Promise.all([
    hasPermission('class_logs_view') ? fetchMyClassLogs(APP_KEY) : Promise.resolve([]),
    hasPermission('support_materials_view') && typeof fetchSupportMaterialsForCurrentStudent === 'function'
      ? fetchSupportMaterialsForCurrentStudent(APP_KEY) : Promise.resolve([]),
    typeof muralLoadList === 'function' ? muralLoadList() : Promise.resolve(null),
  ]);
  STUDENT_TEACHER_NAV.logs = logs.length;
  STUDENT_TEACHER_NAV.materials = (materials || []).length;
  if (typeof muralApplyBadges === 'function') muralApplyBadges(); else applyStudentNavVisibility();
}

// Item "Aluno" (barra lateral + menu Mais): quem tem professora neste idioma (mural) ou já recebeu aula/material.
function applyStudentNavVisibility(){
  const logged = typeof CURRENT_USER !== 'undefined' && !!CURRENT_USER;
  const hasTeacher = typeof MURAL_STATE !== 'undefined' && !!(MURAL_STATE.list && MURAL_STATE.list.as_student);
  const on = logged && (hasTeacher || STUDENT_TEACHER_NAV.logs > 0 || STUDENT_TEACHER_NAV.materials > 0 || studentHasClassReviewCards());
  document.querySelectorAll('#student-panel-btn, .student-only-nav').forEach(el => { el.style.display = on ? '' : 'none'; });
}

// Cartões da professora (Banco de Revisão) no idioma atual -- a aba Aluno > Revisão existe por causa deles.
function studentHasClassReviewCards(){
  return typeof STATE !== 'undefined' && Array.isArray(STATE.cards) && typeof isActiveClassReviewCard === 'function'
    && STATE.cards.some(c => isActiveClassReviewCard(c) && c.flashcardStatus === 'active');
}

// ---------- Aluno: Mural | Aulas | Material de apoio | Revisão (decisões da autora, 2026-10-13 e 14) ----------
const STUDENT_PANEL_SECTIONS = ['mural', 'classlogs', 'materials', 'revisao'];
const STUDENT_PANEL_STATE = { section: 'mural' };

function switchStudentPanelSection(section){
  if (!STUDENT_PANEL_SECTIONS.includes(section)) section = 'mural';
  STUDENT_PANEL_STATE.section = section;
  document.querySelectorAll('[data-student-section]').forEach(btn => {
    const on = btn.dataset.studentSection === section;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const ids = { mural: 'my-mural-content', classlogs: 'my-class-logs-content', materials: 'support-materials-content', revisao: 'my-class-review-content' };
  STUDENT_PANEL_SECTIONS.forEach(s => { const el = document.getElementById(ids[s]); if (el) el.style.display = s === section ? '' : 'none'; });
  if (section === 'mural') renderMyMuralView();
  else if (section === 'classlogs') renderMyClassLogsView();
  else if (section === 'revisao') renderClassReviewView();
  else renderSupportMaterialsView();
}

// ---------- Aluno > Revisão (2026-10-14) ----------
// Cartões que a professora preparou a partir das aulas (Banco de Revisão). Saíram da
// Revisão geral: aqui ficam as contagens de hoje e o botão que abre a MESMA sessão de
// Flashcard (modos de resposta e observações do Banco), só com esses cartões.
function renderClassReviewView(){
  const wrap = document.getElementById('my-class-review-content');
  if (!wrap) return;
  const pool = typeof classReviewPool === 'function' ? classReviewPool() : [];
  if (!pool.length){
    wrap.innerHTML = `<p class="profile-empty-note">${escapeHTML(t('studentPanel.review.empty'))}</p>`;
    if (typeof muralApplyBadges === 'function') muralApplyBadges();
    return;
  }
  const queue = getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
  const split = { new: 0, learning: 0, review: 0 };
  queue.forEach(c => { split[cardStudyBucket(c)]++; });
  const n = queue.length;
  const num = (v, cls, label) => `<div class="review-today-col"><div class="review-today-count ${v ? cls : 'is-zero'}">${v}</div><div class="review-today-col-label">${escapeHTML(label)}</div></div>`;
  wrap.innerHTML = `
    <div class="class-review">
      <p class="profile-edit-hint">${escapeHTML(t('studentPanel.review.hint'))}</p>
      <div class="review-today-strip">
        <div class="review-today-split" aria-label="${escapeHTML(t('review.today.aria', split))}">
          ${num(split.new, 'is-new', t('review.count.new'))}${num(split.learning, 'is-learning', t('review.count.learning'))}${num(split.review, 'is-review', t('review.count.review'))}
        </div>
        <div class="review-today-go">
          ${n ? `<button class="btn btn-primary" id="class-review-start-btn">${escapeHTML(t('studentPanel.review.start', { n }))}</button>`
            : `<span class="review-today-done">${escapeHTML(t('review.today.upToDate'))}</span>`}
        </div>
      </div>
      <p class="profile-edit-hint class-review-total">${escapeHTML(tp('studentPanel.review.total', pool.length))}</p>
    </div>`;
  document.getElementById('class-review-start-btn')?.addEventListener('click', () => startClassReviewSession());
  if (typeof muralApplyBadges === 'function') muralApplyBadges();
}

function renderStudentPanelView(){
  switchStudentPanelSection(STUDENT_PANEL_STATE.section);
}

document.querySelectorAll('[data-student-section]').forEach(btn => {
  btn.addEventListener('click', () => switchStudentPanelSection(btn.dataset.studentSection));
});

// class_date é só data ('AAAA-MM-DD'): monta no fuso local, senão vira o dia
// anterior no Brasil (meia-noite UTC).
function classLogLocalDate(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
}

// Data e hora no fuso de quem vê (101); aula sem horário mostra só o dia.
function myClassLogWhen(log){
  const slot = typeof classLogViewerSlot === 'function' ? classLogViewerSlot(log) : { date: String(log.class_date), time: '' };
  return { slot, label: fmtDate(classLogLocalDate(slot.date), { day: 'numeric', month: 'short', year: 'numeric' }) + (slot.time ? ` · ${slot.time}` : '') };
}

function classLogEntryHTML(log){
  const rows = [
    [t('myClassLogs.topic'), log.topic],
    [t('myClassLogs.homework'), log.homework],
    [t('myClassLogs.observations'), log.observations],
  ].filter(([, v]) => v && String(v).trim());
  return `
    <li class="class-log-entry">
      <time class="class-log-date" datetime="${escapeHTML(String(log.class_date || ''))}">${escapeHTML(myClassLogWhen(log).label)}</time>
      <div class="class-log-body">
        ${typeof classLogBadgesHTML === 'function' ? classLogBadgesHTML({ attendanceName: log.attendance_name, attendanceColor: log.attendance_color, skills: log.skills, classroomName: log.classroom_name }) : ''}
        <dl class="class-log-fields">
          ${rows.map(([k, v]) => `<div class="class-log-field"><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd></div>`).join('')}
        </dl>
      </div>
    </li>`;
}

async function renderMyClassLogsView(){
  const wrap = document.getElementById('my-class-logs-content');
  if (!wrap) return;
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">${t('supportMaterials.loginRequired')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();
  const logs = await fetchMyClassLogs(APP_KEY);
  MY_CLASS_LOGS_STATE.logs = logs;
  // Link de agenda (103) fora do corpo que se redesenha (Lista | Calendário), para não fechar a cada clique.
  if (!logs.length){ renderMyClassLogsBody(wrap); return; }
  wrap.innerHTML = `${calendarFeedBoxHTML()}<div data-my-class-logs-body></div>`;
  wireCalendarFeedBox(wrap);
  renderMyClassLogsBody(wrap.querySelector('[data-my-class-logs-body]'));
}

// Aluno > Aulas (101): próximas aulas no topo + Lista | Calendário.
const MY_CLASS_LOGS_STATE = { logs: [], view: 'list', cal: null, selected: null };
function renderMyClassLogsBody(wrap){
  const logs = MY_CLASS_LOGS_STATE.logs;
  if (!logs.length){ wrap.innerHTML = `<p class="profile-empty-note">${t('myClassLogs.empty')}</p>`; return; }
  const today = todayStr();
  const withSlot = logs.map(l => ({ log: l, slot: myClassLogWhen(l).slot }));
  const upcoming = withSlot.filter(x => x.slot.date > today || (x.slot.date === today && x.slot.at && x.slot.at > new Date()))
    .sort((a, b) => (a.slot.date + (a.slot.time || '')).localeCompare(b.slot.date + (b.slot.time || '')));
  const past = withSlot.filter(x => !upcoming.includes(x)).map(x => x.log);
  const now = new Date();
  const cal = MY_CLASS_LOGS_STATE.cal || (MY_CLASS_LOGS_STATE.cal = { y: now.getFullYear(), m: now.getMonth() });
  const entries = withSlot.map(x => ({ id: x.log.id, date: x.slot.date, time: x.slot.time, color: x.log.attendance_color || '',
    label: x.log.classroom_name || x.log.topic || t('myClassLogs.classLabel') }));
  const sel = MY_CLASS_LOGS_STATE.selected;
  const view = MY_CLASS_LOGS_STATE.view;
  wrap.innerHTML = `
    ${upcoming.length ? `<div class="profile-section my-upcoming">
      <div class="section-label">${t('myClassLogs.upcoming')}</div>
      <ul class="my-upcoming-list">${upcoming.slice(0, 5).map(x => `<li><b>${escapeHTML(fmtDate(classLogLocalDate(x.slot.date), { weekday: 'short', day: 'numeric', month: 'short' }))}${x.slot.time ? ` · ${escapeHTML(x.slot.time)}` : ''}</b>${x.log.classroom_name ? ` · 👥 ${escapeHTML(x.log.classroom_name)}` : ''}${x.log.topic ? ` · ${escapeHTML(x.log.topic)}` : ''}</li>`).join('')}</ul>
    </div>` : ''}
    <div class="deck-topbar panel-nav class-log-views" role="tablist" aria-label="${t('panel.classLog.views')}">
      <button type="button" class="deck-topbar-btn ${view === 'list' ? 'is-active' : ''}" role="tab" aria-selected="${view === 'list'}" data-my-classlog-view="list">${t('myClassLogs.view.list')}</button>
      <button type="button" class="deck-topbar-btn ${view === 'calendar' ? 'is-active' : ''}" role="tab" aria-selected="${view === 'calendar'}" data-my-classlog-view="calendar">${t('panel.classLog.view.calendar')}</button>
    </div>
    ${view === 'calendar'
      ? `${classCalendarHTML(cal.y, cal.m, entries, { selected: sel })}
         ${sel ? `<ol class="class-log-list">${withSlot.filter(x => x.slot.date === sel).map(x => classLogEntryHTML(x.log)).join('') || `<li class="profile-empty-note">${t('panel.classLog.cal.empty')}</li>`}</ol>` : ''}`
      : (past.length ? `<ol class="class-log-list">${past.map(classLogEntryHTML).join('')}</ol>` : `<p class="profile-empty-note">${t('myClassLogs.empty')}</p>`)}`;
  wrap.querySelectorAll('[data-my-classlog-view]').forEach(b => b.addEventListener('click', () => { MY_CLASS_LOGS_STATE.view = b.dataset.myClasslogView; renderMyClassLogsBody(wrap); }));
  wrap.querySelectorAll('[data-cal-nav]').forEach(b => b.addEventListener('click', () => {
    const step = Number(b.dataset.calNav);
    if (step === 0){ const n = new Date(); cal.y = n.getFullYear(); cal.m = n.getMonth(); }
    else { const d = new Date(cal.y, cal.m + step, 1); cal.y = d.getFullYear(); cal.m = d.getMonth(); }
    MY_CLASS_LOGS_STATE.selected = null; renderMyClassLogsBody(wrap);
  }));
  wrap.querySelectorAll('[data-cal-day]').forEach(b => b.addEventListener('click', () => { MY_CLASS_LOGS_STATE.selected = b.dataset.calDay; renderMyClassLogsBody(wrap); }));
}

document.getElementById('teacher-panel-btn')?.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown')?.classList.remove('open');
  switchTab('teacher-panel');
});
document.getElementById('student-panel-btn')?.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown')?.classList.remove('open');
  switchTab('student-panel');
});
