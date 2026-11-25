// ---------- Painel de Admin: navegação entre as abas ----------
// Alterna entre as seções do Painel de Admin (Visão Geral, Analytics, Notificações, Reports, Planos, Privacidade). Antes morava dentro de
// shared/admin-analytics.js. A Visão Geral (Central de Controle, shared/admin-overview.js) substituiu a aba Badges em 2026-11-24
// (decisão da autora; docs/central-de-controle-plano.md). O contêiner #admin-badges-content e o script admin-badges.js continuam
// (fetchAllProfiles é usada pela aba Alunos), só sem botão. Cada seção renderiza no seu próprio contêiner (#admin-<seção>-content); só um fica visível.
// O Admin Mode tem UM ponto de acesso só: o botão 🔒 Admin da barra de cima (applyAdminModeUI, shared/auth.js).
// Alunos/Cartões/Aulas/Material de apoio ficam no Painel da professora (shared/teacher-panel.js), que depende do PAPEL
// Professora e não do Admin Mode.
//
// Depende de (carregar antes de app.js): as funções renderAdmin*View das abas (resolvidas só na hora do clique),
// switchTab/isAdminUser/isTeacherUser de languages/<lang>/app.js (idem).

const ADMIN_PANEL_STATE = { section: 'overview' };

const ADMIN_PANEL_SECTIONS = ['overview', 'analytics', 'notifications', 'reports', 'premium', 'privacy'];
// Contêineres escondidos ao trocar de seção (inclui o antigo de Badges, que ficou sem botão).
const ADMIN_PANEL_CONTAINERS = ADMIN_PANEL_SECTIONS.concat(['badges']);
function switchAdminPanelSection(section){
  if (!ADMIN_PANEL_SECTIONS.includes(section)) section = 'overview';
  ADMIN_PANEL_STATE.section = section;
  document.querySelectorAll('[data-admin-section]').forEach(btn => {
    const on = btn.dataset.adminSection === section;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  ADMIN_PANEL_CONTAINERS.forEach(s => {
    const el = document.getElementById(`admin-${s}-content`);
    if (el) el.style.display = s === section ? '' : 'none';
  });
  if (section === 'overview') renderAdminOverviewView();
  else if (section === 'notifications') renderAdminNotificationsView();
  else if (section === 'reports') renderAdminReportsView();
  else if (section === 'premium') renderAdminPremiumView();
  else if (section === 'privacy') renderAdminPrivacyView();
  else renderAdminAnalyticsView();
}

// tabHandlers['admin-badges'] chama esta função (em vez de
// renderizar uma aba direto) pra sempre reabrir na seção que a autora
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
