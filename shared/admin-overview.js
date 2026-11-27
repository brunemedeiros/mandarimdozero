// ---------- Visão Geral (Painel de Admin, Central de Controle): dados e eventos ----------
// Primeira aba do Painel de Admin desde 2026-11-24 (substituiu Badges). Só a admin vê: a tela esconde, e quem barra de verdade são
// as RPCs da migration 146 (admin_overview_stats / admin_overview_reviews, not_authorized para quem não é admin).
// A Situação (Em dia/Atenção/Parado/Sem estudo) NÃO vem do banco: reaproveita as linhas da aba Alunos (studentLoadRows + tsuRowData,
// shared/admin-students.js), então o número bate com a aba Alunos. Peças de HTML: shared/admin-overview-ui.js.
// Plano e decisões: docs/central-de-controle-plano.md.
//
// Depende de: shared/supabase-client.js (supabaseClient), shared/roles.js (fetchMyStudents), shared/admin-students.js (studentLoadRows,
// STUDENT_VIEW, openStudentFicha), shared/teacher-panel.js (switchTeacherPanelSection), languages/<lang>/app.js (isAdminUser, switchTab).

const ADMIN_OVERVIEW = {
  days: 30, scope: 'mine', language: 'all',
  stats: null, statsError: false, reviews: null, reviewsError: false, situation: null, xpAlerts: null, exitSummary: null,
  openBand: null, openSit: null,
  token: 0, bound: false,
};

function adminOverviewWrap(){ return document.getElementById('admin-overview-content'); }

// Só as contas com vínculo ativo com a admin (Meus alunos) têm ficha para abrir.
function adminOverviewOpenable(p){ return ADMIN_OVERVIEW.scope === 'mine' && !!p && !!p.user_id; }

function adminOverviewRenderBody(){
  const wrap = adminOverviewWrap(), body = wrap && wrap.querySelector('[data-aov="corpo"]');
  if (body) body.innerHTML = aovBodyHTML(ADMIN_OVERVIEW, adminOverviewOpenable);
}
function adminOverviewRenderFilters(){
  const wrap = adminOverviewWrap(), box = wrap && wrap.querySelector('[data-aov="filtros"]');
  if (box) box.outerHTML = aovFiltersHTML(ADMIN_OVERVIEW);
}

async function adminOverviewFetchStats(){
  const st = ADMIN_OVERVIEW;
  const { data, error } = await supabaseClient.rpc('admin_overview_stats', { p_days: st.days, p_scope: st.scope, p_language: st.language });
  if (error || !data || typeof data !== 'object') return null;
  return data;
}
async function adminOverviewFetchReviews(){
  const st = ADMIN_OVERVIEW;
  const { data, error } = await supabaseClient.rpc('admin_overview_reviews', { p_days: st.days, p_language: st.language });
  if (error || !data || typeof data !== 'object') return null;
  return data;
}

// XP fora do normal (migration 152): falha aqui nunca derruba a Visão Geral (sem lista = sem aviso).
async function adminOverviewFetchXpAlerts(){
  try {
    const { data, error } = await supabaseClient.rpc('admin_xp_alerts');
    if (error || !data || typeof data !== 'object') return null;
    return data;
  } catch (e) { return null; }
}

// Motivos de saída do e-mail de cartões (migration 149, função cards_digest_exit_summary: só admin/professora). Falha = sem bloco.
async function adminOverviewFetchExitSummary(){
  try {
    const { data, error } = await supabaseClient.rpc('cards_digest_exit_summary');
    if (error || !data || typeof data !== 'object') return null;
    return data;
  } catch (e) { return null; }
}

// Situação dos alunos pela mesma rotina da aba Alunos (cache da sessão compartilhado com ela).
async function adminOverviewLoadSituation(token){
  const st = ADMIN_OVERVIEW;
  let links = typeof fetchMyStudents === 'function' ? await fetchMyStudents() : [];
  if (token !== st.token) return;
  links = (links || []).filter(l => st.language === 'all' || l.language_app_key === st.language);
  st.situation = { loading: true, done: 0, total: links.length, rows: [] };
  adminOverviewRenderBody();
  const rows = links.length ? await studentLoadRows(links, (n) => {
    if (token !== st.token || !st.situation) return;
    st.situation.done = n;
    const el = adminOverviewWrap() && adminOverviewWrap().querySelector('[data-aov="situacao"] .p-carregando span:last-child');
    if (el) el.textContent = `${t('analytics.loading')} ${t('students.loading.count', { done: n, total: links.length })}`;
  }) : [];
  if (token !== st.token) return;
  st.situation = { loading: false, rows };
  adminOverviewRenderBody();
}

async function adminOverviewLoad(){
  const st = ADMIN_OVERVIEW;
  const token = ++st.token;
  st.stats = null; st.statsError = false; st.reviews = null; st.reviewsError = false; st.situation = null; st.xpAlerts = null; st.exitSummary = null;
  st.openBand = null; st.openSit = null;
  adminOverviewRenderBody();
  const mine = st.scope === 'mine';
  const [stats, reviews, xpAlerts, exitSummary] = await Promise.all([adminOverviewFetchStats(), mine ? adminOverviewFetchReviews() : Promise.resolve(null), adminOverviewFetchXpAlerts(), adminOverviewFetchExitSummary()]);
  if (token !== st.token) return;
  st.stats = stats; st.statsError = !stats; st.xpAlerts = xpAlerts; st.exitSummary = exitSummary;
  if (mine){ st.reviews = reviews; st.reviewsError = !reviews; }
  if (mine && stats) st.situation = { loading: true, done: 0, total: 0 };
  adminOverviewRenderBody();
  if (mine && stats) adminOverviewLoadSituation(token);
}

// Atalho para a ficha do aluno (aba Alunos do painel da professora). A ficha abre pelo vínculo: espera a lista carregar (até ~3 s),
// como o atalho do Mural (shared/mural.js).
function adminOverviewOpenFicha(studentId, lang){
  if (typeof switchTab === 'function') switchTab('teacher-panel');
  if (typeof switchTeacherPanelSection === 'function') switchTeacherPanelSection('students');
  let tries = 0;
  const tryOpen = () => {
    const links = (typeof STUDENT_VIEW !== 'undefined' && STUDENT_VIEW.links) || [];
    const link = links.find(l => l.student_id === studentId && (!lang || l.language_app_key === lang)) || links.find(l => l.student_id === studentId);
    if (link && typeof openStudentFicha === 'function') return openStudentFicha(link.id);
    if (++tries < 30) setTimeout(tryOpen, 100);
  };
  setTimeout(tryOpen, 100);
}

function adminOverviewBind(wrap){
  if (ADMIN_OVERVIEW.bound) return;
  ADMIN_OVERVIEW.bound = true;
  wrap.addEventListener('click', (e) => {
    const st = ADMIN_OVERVIEW;
    const q = (sel) => e.target.closest(sel);
    let el;
    if ((el = q('[data-aov-periodo]'))){ const v = Number(el.dataset.aovPeriodo); if (v !== st.days){ st.days = v; adminOverviewRenderFilters(); adminOverviewLoad(); } return; }
    if ((el = q('[data-aov-quem]'))){ const v = el.dataset.aovQuem; if (v !== st.scope){ st.scope = v; adminOverviewRenderFilters(); adminOverviewLoad(); } return; }
    if ((el = q('[data-aov-idioma]'))){ const v = el.dataset.aovIdioma; if (v !== st.language){ st.language = v; adminOverviewRenderFilters(); adminOverviewLoad(); } return; }
    if ((el = q('[data-aov-tentar]'))){ adminOverviewLoad(); return; }
    if ((el = q('[data-aov-ficha]'))){ adminOverviewOpenFicha(el.dataset.aovFicha, el.dataset.aovFichaLang || ''); return; }
    if ((el = q('[data-aov-faixa]'))){
      const b = el.dataset.aovFaixa;
      st.openBand = st.openBand === b ? null : b;
      adminOverviewRenderBody();
      const again = adminOverviewWrap().querySelector(`[data-aov-faixa="${b}"]`); if (again) again.focus();
      return;
    }
    if ((el = q('[data-aov-sit]'))){
      const s = el.dataset.aovSit;
      st.openSit = st.openSit === s ? null : s;
      adminOverviewRenderBody();
      const again = adminOverviewWrap().querySelector(`[data-aov-sit="${s}"]`); if (again) again.focus();
    }
  });
}

function renderAdminOverviewView(){
  const wrap = adminOverviewWrap();
  if (!wrap) return;
  if (typeof isAdminUser !== 'function' || !isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  adminOverviewBind(wrap);
  wrap.innerHTML = aovPageHTML(ADMIN_OVERVIEW, adminOverviewOpenable);
  adminOverviewLoad();
}
