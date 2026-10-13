// ---------- Painel da professora + telas do aluno (Minhas aulas, Material) ----------
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

const TEACHER_PANEL_SECTIONS = ['students', 'flashcards', 'classlogs', 'materials'];
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
  const { data, error } = await supabaseClient.rpc('get_my_class_logs', { p_language_app_key: languageAppKey });
  if (error){ console.error('Erro ao carregar aulas:', error); return []; }
  return Array.isArray(data) ? data : [];
}

async function refreshStudentTeacherNav(){
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){ show('my-class-logs-btn', false); show('support-materials-btn', false); return; }
  const [logs, materials] = await Promise.all([
    hasPermission('class_logs_view') ? fetchMyClassLogs(APP_KEY) : Promise.resolve([]),
    hasPermission('support_materials_view') && typeof fetchSupportMaterialsForCurrentStudent === 'function'
      ? fetchSupportMaterialsForCurrentStudent(APP_KEY) : Promise.resolve([]),
  ]);
  STUDENT_TEACHER_NAV.logs = logs.length;
  STUDENT_TEACHER_NAV.materials = (materials || []).length;
  show('my-class-logs-btn', STUDENT_TEACHER_NAV.logs > 0);
  show('support-materials-btn', STUDENT_TEACHER_NAV.materials > 0);
}

// class_date é só data ('AAAA-MM-DD'): monta no fuso local, senão vira o dia
// anterior no Brasil (meia-noite UTC).
function classLogLocalDate(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
}

function classLogEntryHTML(log){
  const rows = [
    [t('myClassLogs.topic'), log.topic],
    [t('myClassLogs.homework'), log.homework],
    [t('myClassLogs.observations'), log.observations],
  ].filter(([, v]) => v && String(v).trim());
  return `
    <li class="class-log-entry">
      <time class="class-log-date" datetime="${escapeHTML(String(log.class_date || ''))}">${escapeHTML(fmtDate(classLogLocalDate(log.class_date), { day: 'numeric', month: 'short', year: 'numeric' }))}</time>
      <dl class="class-log-fields">
        ${rows.map(([k, v]) => `<div class="class-log-field"><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd></div>`).join('')}
      </dl>
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
  wrap.innerHTML = logs.length
    ? `<ol class="class-log-list">${logs.map(classLogEntryHTML).join('')}</ol>`
    : `<p class="profile-empty-note">${t('myClassLogs.empty')}</p>`;
}

document.getElementById('teacher-panel-btn')?.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown')?.classList.remove('open');
  switchTab('teacher-panel');
});
document.getElementById('my-class-logs-btn')?.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown')?.classList.remove('open');
  switchTab('my-class-logs');
});
