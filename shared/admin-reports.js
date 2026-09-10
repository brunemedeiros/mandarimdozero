// ---------- Painel de Admin: Reports (bandeira ⚑) ----------
// Quarta seção do Painel de Admin (Badges / Analytics / Notificações /
// Reports -- troca gerida por shared/admin-analytics.js:switchAdminPanelSection).
// Lista + edita a tabela `reports` (ver shared/supabase_migrations/
// 020_create_reports_table.sql) -- reports de bug/sugestão enviados pela
// bandeira ⚑ (shared/reports.js), tanto de contas logadas quanto de
// convidados.
//
// A autora dá aqui só STATUS/PRIORIDADE/NOTA INTERNA -- a gravidade
// (severity_reported) é só o que o usuário PERCEBEU ao enviar, nunca
// sobrescrita por aqui (ver a distinção na auditoria que motivou o
// sistema: usuário nunca escolhe a prioridade técnica final).
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/toast.js           (showToast)
//   - shared/utils.js           (loadingHTML)
//   - shared/profile.js         (escapeHTML)
//   - shared/reports.js         (REPORT_CATEGORIES, REPORT_SEVERITIES -- pra reaproveitar os mesmos rótulos do formulário, nunca duplicar)
//   - languages/<lang>/app.js   (isAdminUser)

const REPORT_STATUS_LABELS = {
  novo: 'Novo',
  em_analise: 'Em análise',
  confirmado: 'Confirmado',
  em_desenvolvimento: 'Em desenvolvimento',
  resolvido: 'Resolvido',
  nao_reproduzido: 'Não reproduzido',
  recusado: 'Recusado',
  duplicado: 'Duplicado',
};
const REPORT_PRIORITY_LABELS = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const REPORT_CATEGORY_LABELS_BY_ID = Object.fromEntries(REPORT_CATEGORIES.map(c => [c.id, c.label]));
const REPORT_SEVERITY_LABELS_BY_ID = Object.fromEntries(REPORT_SEVERITIES.map(s => [s.id, s.label]));

const ADMIN_REPORTS_STATE = { statusFilter: 'all', kindFilter: 'all' };
let ADMIN_REPORTS_CACHE = [];

async function fetchAdminReports(){
  let query = supabaseClient.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
  if (ADMIN_REPORTS_STATE.statusFilter !== 'all') query = query.eq('status', ADMIN_REPORTS_STATE.statusFilter);
  if (ADMIN_REPORTS_STATE.kindFilter !== 'all') query = query.eq('kind', ADMIN_REPORTS_STATE.kindFilter);
  const { data, error } = await query;
  if (error){ console.error('Erro ao carregar reports:', error); return []; }
  return data || [];
}

async function updateReportAdminFields(id, fields){
  const { error } = await supabaseClient.from('reports').update(fields).eq('id', id);
  if (error){ console.error('Erro ao atualizar report:', error); return { ok: false }; }
  return { ok: true };
}

function reportDetailContextLines(context){
  const ctx = context || {};
  const keys = Object.keys(ctx);
  if (!keys.length) return '<div>(sem contexto adicional)</div>';
  return keys.map(k => {
    const val = typeof ctx[k] === 'object' ? JSON.stringify(ctx[k]) : String(ctx[k]);
    return `<div><strong>${escapeHTML(k)}:</strong> ${escapeHTML(val)}</div>`;
  }).join('');
}

async function renderAdminReportsView(){
  const wrap = document.getElementById('admin-reports-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  ADMIN_REPORTS_CACHE = await fetchAdminReports();

  const statusOptionsHTML = ['all', ...Object.keys(REPORT_STATUS_LABELS)].map(s =>
    `<option value="${s}" ${ADMIN_REPORTS_STATE.statusFilter === s ? 'selected' : ''}>${s === 'all' ? 'Todos os status' : REPORT_STATUS_LABELS[s]}</option>`
  ).join('');
  const kindOptionsHTML = [
    ['all', 'Problemas e sugestões'], ['problema', 'Só problemas'], ['sugestao', 'Só sugestões'],
  ].map(([k, label]) => `<option value="${k}" ${ADMIN_REPORTS_STATE.kindFilter === k ? 'selected' : ''}>${label}</option>`).join('');

  const rowsHTML = ADMIN_REPORTS_CACHE.length ? ADMIN_REPORTS_CACHE.map(r => {
    const catLabel = REPORT_CATEGORY_LABELS_BY_ID[r.category] || r.category;
    const dateLabel = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const who = r.user_id ? 'conta logada' : 'convidada';
    const snippet = (r.description || '').slice(0, 90) + ((r.description || '').length > 90 ? '…' : '');
    return `
      <div class="admin-badge-row" data-report-row="${r.id}">
        <span class="admin-badge-icon">${r.kind === 'sugestao' ? '💡' : '⚑'}</span>
        <div class="admin-badge-info">
          <div class="admin-badge-name">${escapeHTML(catLabel)} -- ${escapeHTML(snippet)}</div>
          <div class="admin-badge-desc">${dateLabel} · ${who} · <span class="admin-report-status-pill" data-status="${r.status}">${REPORT_STATUS_LABELS[r.status] || r.status}</span></div>
        </div>
        <button class="admin-badge-edit-btn" data-report-detail="${r.id}" title="Ver detalhes">✏️</button>
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">Nenhum report encontrado com esse filtro.</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">⚑ Reports de bugs e sugestões</div>
      <p class="profile-edit-hint">Enviados pela bandeira ⚑ (menu do usuário ou dentro dos exercícios). Convidados também podem reportar -- reports sem conta aparecem como "convidada", sem e-mail associado.</p>
      <div class="admin-report-filters">
        <select id="admin-report-status-filter" class="profile-edit-input">${statusOptionsHTML}</select>
        <select id="admin-report-kind-filter" class="profile-edit-input">${kindOptionsHTML}</select>
      </div>
    </div>
    <div class="profile-section">
      ${rowsHTML}
    </div>
  `;

  document.getElementById('admin-report-status-filter').addEventListener('change', (e) => {
    ADMIN_REPORTS_STATE.statusFilter = e.target.value;
    renderAdminReportsView();
  });
  document.getElementById('admin-report-kind-filter').addEventListener('change', (e) => {
    ADMIN_REPORTS_STATE.kindFilter = e.target.value;
    renderAdminReportsView();
  });
  wrap.querySelectorAll('[data-report-detail]').forEach(btn => {
    btn.addEventListener('click', () => openAdminReportDetail(btn.dataset.reportDetail));
  });
}

function openAdminReportDetail(reportId){
  const report = ADMIN_REPORTS_CACHE.find(r => String(r.id) === String(reportId));
  const modal = document.getElementById('admin-report-detail-modal');
  if (!report || !modal) return;

  document.getElementById('admin-report-detail-category').textContent = `${report.kind === 'sugestao' ? '💡 Sugestão' : '⚑ Problema'} -- ${REPORT_CATEGORY_LABELS_BY_ID[report.category] || report.category}`;
  document.getElementById('admin-report-detail-description').textContent = report.description || '';
  document.getElementById('admin-report-detail-expected').textContent = report.expected_behavior || '(não informado)';
  document.getElementById('admin-report-detail-severity').textContent = REPORT_SEVERITY_LABELS_BY_ID[report.severity_reported] || '(não informado)';
  document.getElementById('admin-report-detail-context').innerHTML = reportDetailContextLines(report.context);

  const screenshotWrap = document.getElementById('admin-report-detail-screenshot');
  screenshotWrap.innerHTML = report.screenshot_url
    ? `<a href="${report.screenshot_url}" target="_blank" rel="noopener">📎 Ver captura de tela anexada</a>`
    : '(sem captura anexada)';

  document.getElementById('admin-report-detail-status').value = report.status || 'novo';
  document.getElementById('admin-report-detail-priority').value = report.priority || '';
  document.getElementById('admin-report-detail-note').value = report.internal_note || '';
  document.getElementById('admin-report-detail-error').textContent = '';
  document.getElementById('admin-report-detail-save-btn').dataset.reportId = report.id;

  modal.style.display = 'flex';
}

function closeAdminReportDetail(){
  const modal = document.getElementById('admin-report-detail-modal');
  if (modal) modal.style.display = 'none';
}

function wireAdminReportDetailModal(){
  const modal = document.getElementById('admin-report-detail-modal');
  if (!modal) return;
  document.getElementById('admin-report-detail-modal-close')?.addEventListener('click', closeAdminReportDetail);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAdminReportDetail(); });

  document.getElementById('admin-report-detail-save-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const id = btn.dataset.reportId;
    const errorEl = document.getElementById('admin-report-detail-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await updateReportAdminFields(id, {
      status: document.getElementById('admin-report-detail-status').value,
      priority: document.getElementById('admin-report-detail-priority').value || null,
      internal_note: document.getElementById('admin-report-detail-note').value.trim() || null,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = 'Não foi possível salvar agora.'; return; }
    showToast('✓ Report atualizado.');
    closeAdminReportDetail();
    renderAdminReportsView();
  });
}
wireAdminReportDetailModal();
