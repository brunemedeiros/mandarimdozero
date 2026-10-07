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
// Responder por e-mail (migration 022 + Edge Function report-reply-send):
// motivado pelo pedido "quero poder agradecer/explicar o que foi feito com
// o report, mesmo sem ter o e-mail à mão" -- a Edge Function resolve o
// e-mail (reporter_email de convidado, ou via Admin API pra conta logada)
// e envia via Resend, a mesma infra já usada nos e-mails de notificação.
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/toast.js           (showToast)
//   - shared/utils.js           (loadingHTML)
//   - shared/profile.js         (escapeHTML)
//   - shared/reports.js         (REPORT_CATEGORIES, REPORT_SEVERITIES -- pra reaproveitar os mesmos rótulos do formulário, nunca duplicar)
//   - languages/<lang>/app.js   (isAdminUser)

const REPORT_STATUS_LABELS = {
  get novo(){ return t('admin.reports.status.novo'); },
  get em_analise(){ return t('admin.reports.status.em_analise'); },
  get confirmado(){ return t('admin.reports.status.confirmado'); },
  get em_desenvolvimento(){ return t('admin.reports.status.em_desenvolvimento'); },
  get resolvido(){ return t('admin.reports.status.resolvido'); },
  get nao_reproduzido(){ return t('admin.reports.status.nao_reproduzido'); },
  get recusado(){ return t('admin.reports.status.recusado'); },
  get duplicado(){ return t('admin.reports.status.duplicado'); },
};
const REPORT_PRIORITY_LABELS = {
  get baixa(){ return t('admin.reports.priority.baixa'); },
  get media(){ return t('admin.reports.priority.media'); },
  get alta(){ return t('admin.reports.priority.alta'); },
  get critica(){ return t('admin.reports.priority.critica'); },
};
function reportCategoryLabel(id){ const c = REPORT_CATEGORIES.find(x => x.id === id); return c ? t(c.labelKey) : undefined; }
function reportSeverityLabel(id){ const s = REPORT_SEVERITIES.find(x => x.id === id); return s ? t(s.labelKey) : undefined; }

// Fase 7 do projeto "Report global": idioma vem de `language_app_key`
// (o APP_KEY de cada languages/<lang>/app.js) -- valores fixos hoje, mas
// um idioma novo no futuro só cai no fallback abaixo (mostra a key crua),
// nunca quebra a lista.
const REPORT_LANGUAGE_LABELS = {
  get frances(){ return t('admin.reports.lang.frances'); },
  get mandarim(){ return t('admin.reports.lang.mandarim'); },
};

// Fase 7: rótulo amigável pra `context.screen` (a aba ativa no momento do
// report, ver captureReportContext em shared/reports.js) -- cobre as abas
// dos dois idiomas; uma tela nova cai no fallback (mostra o id cru) sem
// quebrar a lista.
const REPORT_SCREEN_LABELS = {
  get path(){ return t('admin.reports.screen.path'); },
  get review(){ return t('admin.reports.screen.review'); },
  hanzi: '汉字',
  get conjugaison(){ return t('admin.reports.screen.conjugaison'); },
  get challenges(){ return t('admin.reports.screen.challenges'); },
  get dictation(){ return t('admin.reports.screen.dictation'); },
  get profile(){ return t('admin.reports.screen.profile'); },
  get progress(){ return t('admin.reports.screen.progress'); },
  get goals(){ return t('admin.reports.screen.goals'); },
  get leaderboard(){ return t('admin.reports.screen.leaderboard'); },
  get settings(){ return t('admin.reports.screen.settings'); },
  get 'admin-badges'(){ return t('admin.reports.screen.admin_badges'); },
};

const ADMIN_REPORTS_STATE = { statusFilter: 'all', kindFilter: 'all', languageFilter: 'all' };
let ADMIN_REPORTS_CACHE = [];
// user_id -> { username, display_name }. `profiles` é publicamente legível
// (ver profiles_public_read, migration 001 -- não guarda nada sensível), só
// pra mostrar QUEM enviou cada report na lista/detalhe -- nunca o e-mail em
// si, que continua só resolvido sob demanda pela Edge Function ao responder.
let ADMIN_REPORTS_PROFILES = {};

async function fetchAdminReports(){
  let query = supabaseClient.from('reports').select('*').order('created_at', { ascending: false }).limit(200);
  if (ADMIN_REPORTS_STATE.statusFilter !== 'all') query = query.eq('status', ADMIN_REPORTS_STATE.statusFilter);
  if (ADMIN_REPORTS_STATE.kindFilter !== 'all') query = query.eq('kind', ADMIN_REPORTS_STATE.kindFilter);
  if (ADMIN_REPORTS_STATE.languageFilter !== 'all') query = query.eq('language_app_key', ADMIN_REPORTS_STATE.languageFilter);
  const { data, error } = await query;
  if (error){ console.error('Erro ao carregar reports:', error); return []; }
  return data || [];
}

async function fetchReporterProfiles(reports){
  const ids = [...new Set(reports.filter(r => r.user_id).map(r => r.user_id))];
  if (!ids.length) return;
  const { data, error } = await supabaseClient.from('profiles').select('user_id, username, display_name').in('user_id', ids);
  if (error){ console.error('Erro ao carregar perfis dos reports:', error); return; }
  ADMIN_REPORTS_PROFILES = Object.fromEntries((data || []).map(p => [p.user_id, p]));
}

// Rótulo de "quem enviou" -- nome/username pra conta logada (via profiles,
// nunca o e-mail em si, que só a Edge Function resolve), e-mail se o
// convidado informou um, ou só "convidada" se não informou nada.
function reporterLabel(report){
  if (report.user_id){
    const p = ADMIN_REPORTS_PROFILES[report.user_id];
    if (p) return p.display_name || p.username;
    return t('admin.reports.reporter.loggedNoProfile');
  }
  return report.reporter_email || t('admin.reports.reporter.guest');
}

async function updateReportAdminFields(id, fields){
  const { error } = await supabaseClient.from('reports').update(fields).eq('id', id);
  if (error){ console.error('Erro ao atualizar report:', error); return { ok: false }; }
  return { ok: true };
}

function reportDetailContextLines(context){
  const ctx = context || {};
  const keys = Object.keys(ctx);
  if (!keys.length) return `<div>${t('admin.reports.ctx.none')}</div>`;
  return keys.map(k => {
    const val = typeof ctx[k] === 'object' ? JSON.stringify(ctx[k]) : String(ctx[k]);
    return `<div><strong>${escapeHTML(k)}:</strong> ${escapeHTML(val)}</div>`;
  }).join('');
}

async function renderAdminReportsView(){
  const wrap = document.getElementById('admin-reports-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  ADMIN_REPORTS_CACHE = await fetchAdminReports();
  await fetchReporterProfiles(ADMIN_REPORTS_CACHE);

  const statusOptionsHTML = ['all', ...Object.keys(REPORT_STATUS_LABELS)].map(s =>
    `<option value="${s}" ${ADMIN_REPORTS_STATE.statusFilter === s ? 'selected' : ''}>${s === 'all' ? t('admin.reports.filter.allStatus') : REPORT_STATUS_LABELS[s]}</option>`
  ).join('');
  const kindOptionsHTML = [
    ['all', t('admin.reports.filter.kindAll')], ['problema', t('admin.reports.filter.kindProblems')], ['sugestao', t('admin.reports.filter.kindSuggestions')],
  ].map(([k, label]) => `<option value="${k}" ${ADMIN_REPORTS_STATE.kindFilter === k ? 'selected' : ''}>${label}</option>`).join('');
  // Fase 7: filtro de idioma -- a lista de opções vem do próprio mapa de
  // rótulos (nunca hardcoded em outro lugar), então um idioma novo só
  // precisa ser adicionado em REPORT_LANGUAGE_LABELS pra aparecer aqui.
  const languageOptionsHTML = ['all', ...Object.keys(REPORT_LANGUAGE_LABELS)].map(l =>
    `<option value="${l}" ${ADMIN_REPORTS_STATE.languageFilter === l ? 'selected' : ''}>${l === 'all' ? t('admin.reports.filter.allLanguages') : REPORT_LANGUAGE_LABELS[l]}</option>`
  ).join('');

  const rowsHTML = ADMIN_REPORTS_CACHE.length ? ADMIN_REPORTS_CACHE.map(r => {
    const catLabel = reportCategoryLabel(r.category) || r.category;
    const dateLabel = fmtDate(r.created_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const who = escapeHTML(reporterLabel(r));
    const snippet = (r.description || '').slice(0, 90) + ((r.description || '').length > 90 ? '…' : '');
    // Fase 7: idioma e origem/tela direto na linha da lista -- antes só
    // apareciam abrindo o detalhe (idioma nem aparecia lá, "screen" só
    // existe no context desde a Fase 3-4). Reports antigos sem
    // language_app_key/context.screen caem no fallback, nunca quebram.
    const langLabel = REPORT_LANGUAGE_LABELS[r.language_app_key] || r.language_app_key || '?';
    const screenKey = r.context?.screen;
    const screenLabel = screenKey ? (REPORT_SCREEN_LABELS[screenKey] || screenKey) : null;
    return `
      <div class="admin-badge-row" data-report-row="${r.id}">
        <span class="admin-badge-icon">${r.kind === 'sugestao' ? '💡' : '⚑'}</span>
        <div class="admin-badge-info">
          <div class="admin-badge-name">${escapeHTML(catLabel)} -- ${escapeHTML(snippet)}</div>
          <div class="admin-badge-desc">${dateLabel} · ${who} · ${escapeHTML(langLabel)}${screenLabel ? ` · ${escapeHTML(screenLabel)}` : ''} · <span class="admin-report-status-pill" data-status="${r.status}">${REPORT_STATUS_LABELS[r.status] || r.status}</span></div>
        </div>
        <button class="admin-badge-edit-btn" data-report-detail="${r.id}" title="${t('admin.reports.row.details')}">✏️</button>
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">${t('admin.reports.empty')}</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">${t('admin.reports.title')}</div>
      <p class="profile-edit-hint">${t('admin.reports.hint')}</p>
      <div class="admin-report-filters">
        <select id="admin-report-status-filter" class="profile-edit-input">${statusOptionsHTML}</select>
        <select id="admin-report-kind-filter" class="profile-edit-input">${kindOptionsHTML}</select>
        <select id="admin-report-language-filter" class="profile-edit-input">${languageOptionsHTML}</select>
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
  document.getElementById('admin-report-language-filter').addEventListener('change', (e) => {
    ADMIN_REPORTS_STATE.languageFilter = e.target.value;
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

  document.getElementById('admin-report-detail-category').textContent = `${report.kind === 'sugestao' ? t('admin.reports.detail.suggestion') : t('admin.reports.detail.problem')} -- ${reportCategoryLabel(report.category) || report.category}`;
  document.getElementById('admin-report-detail-reporter').textContent = reporterLabel(report);
  document.getElementById('admin-report-detail-description').textContent = report.description || '';
  document.getElementById('admin-report-detail-expected').textContent = report.expected_behavior || t('admin.reports.detail.notInformed');
  document.getElementById('admin-report-detail-severity').textContent = reportSeverityLabel(report.severity_reported) || t('admin.reports.detail.notInformed');
  document.getElementById('admin-report-detail-context').innerHTML = reportDetailContextLines(report.context);

  const screenshotWrap = document.getElementById('admin-report-detail-screenshot');
  screenshotWrap.innerHTML = report.screenshot_url
    ? `<a href="${report.screenshot_url}" target="_blank" rel="noopener">${t('admin.reports.detail.screenshotView')}</a>`
    : t('admin.reports.detail.screenshotNone');

  document.getElementById('admin-report-detail-status').value = report.status || 'novo';
  document.getElementById('admin-report-detail-priority').value = report.priority || '';
  document.getElementById('admin-report-detail-note').value = report.internal_note || '';
  document.getElementById('admin-report-detail-error').textContent = '';
  document.getElementById('admin-report-detail-save-btn').dataset.reportId = report.id;

  renderAdminReportReplySection(report);

  modal.style.display = 'flex';
}

// "Sem e-mail" só quando é convidado (sem user_id) que não deixou
// reporter_email -- conta logada SEMPRE pode ser respondida, mesmo que
// reporter_email ainda esteja null aqui: a Edge Function resolve o e-mail
// na hora via auth.admin.getUserById() (ver report-reply-send) e só
// grava de volta como cache depois do primeiro envio.
function renderAdminReportReplySection(report){
  const canReply = !!report.reporter_email || !!report.user_id;
  document.getElementById('admin-report-reply-composer').style.display = canReply ? '' : 'none';
  document.getElementById('admin-report-reply-noemail').style.display = canReply ? 'none' : '';

  const historyEl = document.getElementById('admin-report-reply-history');
  if (report.admin_reply_sent_at){
    const dateLabel = fmtDate(report.admin_reply_sent_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const lastSent = report.reporter_email
      ? t('admin.reports.reply.lastSentTo', { date: dateLabel, email: escapeHTML(report.reporter_email) })
      : t('admin.reports.reply.lastSent', { date: dateLabel });
    historyEl.innerHTML = `<em>${lastSent}</em><br>"${escapeHTML(report.admin_reply_subject || '')}" -- ${escapeHTML(report.admin_reply || '')}`;
    historyEl.style.display = '';
  } else {
    historyEl.innerHTML = '';
    historyEl.style.display = 'none';
  }

  document.getElementById('admin-report-reply-subject').value = '';
  document.getElementById('admin-report-reply-body').value = '';
  document.getElementById('admin-report-reply-error').textContent = '';
  document.getElementById('admin-report-reply-send-btn').dataset.reportId = report.id;
}

function closeAdminReportDetail(){
  const modal = document.getElementById('admin-report-detail-modal');
  if (modal) modal.style.display = 'none';
}

// Mensagens amigáveis pros erros que a Edge Function report-reply-send
// pode devolver (ver supabase/functions/report-reply-send/index.ts) --
// nunca mostra o código cru pra admin.
const REPORT_REPLY_ERROR_LABELS = {
  get forbidden(){ return t('admin.reports.reply.err.forbidden'); },
  get report_not_found(){ return t('admin.reports.reply.err.report_not_found'); },
  get no_email(){ return t('admin.reports.reply.err.no_email'); },
  get email_not_configured(){ return t('admin.reports.reply.err.email_not_configured'); },
  get resend_failed(){ return t('admin.reports.reply.err.resend_failed'); },
  get missing_fields(){ return t('admin.reports.reply.err.missing_fields'); },
};

// Chama a Edge Function report-reply-send (ver comentário no topo do
// arquivo) -- ela resolve o e-mail (reporter_email ou, pra conta logada,
// via auth.admin.getUserById(), service role) e envia via Resend. O front
// nunca sabe o e-mail de antemão pra uma conta logada -- só depois que a
// function confirma o envio (ver retorno `to`).
async function sendAdminReportReply(reportId, subject, body){
  const { data, error } = await supabaseClient.functions.invoke('report-reply-send', {
    body: { report_id: reportId, subject, body },
  });
  if (error || !data?.ok){
    const code = data?.error || error?.context?.error || null;
    return { ok: false, error: REPORT_REPLY_ERROR_LABELS[code] || t('admin.reports.reply.err.generic') };
  }
  return { ok: true, to: data.to };
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
    if (!result.ok){ errorEl.textContent = t('teacherMaterials.err.saveFailed'); return; }
    showToast(t('admin.reports.toast.updated'));
    closeAdminReportDetail();
    renderAdminReportsView();
  });

  document.getElementById('admin-report-reply-send-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const id = btn.dataset.reportId;
    const errorEl = document.getElementById('admin-report-reply-error');
    errorEl.textContent = '';
    const subject = document.getElementById('admin-report-reply-subject').value.trim();
    const body = document.getElementById('admin-report-reply-body').value.trim();
    if (!subject || !body){
      errorEl.textContent = t('admin.reports.reply.err.missing_fields');
      return;
    }
    btn.disabled = true;
    btn.textContent = t('report.modal.sending');
    const result = await sendAdminReportReply(id, subject, body);
    btn.disabled = false;
    btn.textContent = t('admin.reports.reply.send');
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(t('admin.reports.toast.replySent', { to: result.to }));
    closeAdminReportDetail();
    renderAdminReportsView();
  });
}
wireAdminReportDetailModal();
