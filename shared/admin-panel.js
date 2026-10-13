// ---------- Painel de Admin: navegação entre as abas ----------
// Alterna entre as seções do Painel de Admin (Badges, Analytics, Notificações, Reports, Planos). Antes morava dentro de
// shared/admin-analytics.js. Cada seção renderiza no seu próprio contêiner (#admin-<seção>-content); só um fica visível.
// O Admin Mode tem UM ponto de acesso só: o botão 🔒 Admin da barra de cima (applyAdminModeUI, shared/auth.js).
// Alunos/Cartões/Aulas/Material de apoio ficam no Painel da professora (shared/teacher-panel.js), que depende do PAPEL
// Professora e não do Admin Mode.
//
// Depende de (carregar antes de app.js): as funções renderAdmin*View das abas (resolvidas só na hora do clique),
// switchTab/isAdminUser/isTeacherUser de languages/<lang>/app.js (idem).

const ADMIN_PANEL_STATE = { section: 'badges' };

const ADMIN_PANEL_SECTIONS = ['badges', 'analytics', 'notifications', 'reports', 'premium'];
function switchAdminPanelSection(section){
  if (!ADMIN_PANEL_SECTIONS.includes(section)) section = 'badges';
  ADMIN_PANEL_STATE.section = section;
  document.querySelectorAll('[data-admin-section]').forEach(btn => {
    const on = btn.dataset.adminSection === section;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  ADMIN_PANEL_SECTIONS.forEach(s => {
    const el = document.getElementById(`admin-${s}-content`);
    if (el) el.style.display = s === section ? '' : 'none';
  });
  if (section === 'badges') renderAdminBadgesView();
  else if (section === 'notifications') renderAdminNotificationsView();
  else if (section === 'reports') renderAdminReportsView();
  else if (section === 'premium') renderAdminPremiumView();
  else renderAdminAnalyticsView();
}

// tabHandlers['admin-badges'] chama esta função (em vez de
// renderAdminBadgesView direto) pra sempre reabrir na seção que a autora
// deixou selecionada da última vez. Quem é só professora (sem ser admin) e
// chega aqui por um link antigo (ex.: notificação de supervisão com rota
// 'admin-badges') vai para o Painel da professora.
function renderAdminPanelView(){
  const admin = typeof isAdminUser === 'function' && isAdminUser();
  if (!admin && typeof isTeacherUser === 'function' && isTeacherUser()){ switchTab('teacher-panel'); return; }
  switchAdminPanelSection(ADMIN_PANEL_STATE.section);
}

function wireAdminPanelTabs(){
  document.querySelectorAll('[data-admin-section]').forEach(btn => {
    btn.addEventListener('click', () => switchAdminPanelSection(btn.dataset.adminSection));
  });
}
wireAdminPanelTabs();
