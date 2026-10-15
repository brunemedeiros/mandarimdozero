// ---------- Painel de Admin: Reports (bandeira ⚑) ----------
// Quarta seção do Painel de Admin (troca gerida por shared/admin-panel.js:switchAdminPanelSection). Visual no Design System do
// painel (shared/admin-reports-ui.js): filtros e busca, tabela com status em cor, janela de detalhe com status/prioridade/nota e
// resposta por e-mail. Enviar a resposta pede confirmação (o e-mail sai na hora e não volta).
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
//   - shared/admin-reports-ui.js, shared/painel/painel-ui.js (PainelUI.confirmar)
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

const ADMIN_REPORTS_STATE = { statusFilter: 'all', kindFilter: 'all', languageFilter: 'all', busca: '' };
let ADMIN_REPORTS_CACHE = [];
// user_id -> { username, display_name }. `profiles` é publicamente legível
// (ver profiles_public_read, migration 001 -- não guarda nada sensível), só
// pra mostrar QUEM enviou cada report na lista/detalhe -- nunca o e-mail em
// si, que continua só resolvido sob demanda pela Edge Function ao responder.
let ADMIN_REPORTS_PROFILES = {};

const ADMIN_REPORTS_LIMIT = 200;   // a tela avisa quando chega nele (há mais reports do que os mostrados)
async function fetchAdminReports(){
  let query = supabaseClient.from('reports').select('*').order('created_at', { ascending: false }).limit(ADMIN_REPORTS_LIMIT);
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

const ADMIN_REPORTS_VIEW = { token: 0, ligado: false, truncated: false, enviando: false };

// Rótulos para as peças de tela (a partir das tabelas de rótulos acima e de shared/reports.js).
const ADMIN_REPORTS_LABELS = {
  statusKeys: ['novo', 'em_analise', 'confirmado', 'em_desenvolvimento', 'resolvido', 'nao_reproduzido', 'recusado', 'duplicado'],
  priorityKeys: ['baixa', 'media', 'alta', 'critica'],
  status: (s) => REPORT_STATUS_LABELS[s] || s,
  priority: (p) => REPORT_PRIORITY_LABELS[p] || p,
  category: (id) => reportCategoryLabel(id),
  severity: (id) => reportSeverityLabel(id),
  lang: (k) => REPORT_LANGUAGE_LABELS[k] || k || '?',
  screen: (k) => REPORT_SCREEN_LABELS[k] || k,
  reporter: (r) => reporterLabel(r),
};

function reportsWrap(){ return document.getElementById('admin-reports-content'); }

function reportsRefreshList(){
  const box = document.querySelector('[data-reports-lista]');
  if (!box) return;
  const L = ADMIN_REPORTS_LABELS;
  box.innerHTML = trpListHTML(trpFilterReports(ADMIN_REPORTS_CACHE, ADMIN_REPORTS_STATE.busca, L), ADMIN_REPORTS_CACHE.length, L, ADMIN_REPORTS_VIEW.truncated);
}

// Busca de novo no servidor (filtros de status, tipo e idioma) e atualiza só a lista, sem refazer a página (mantém o foco e a busca).
async function reportsReload(){
  const token = ++ADMIN_REPORTS_VIEW.token;
  ADMIN_REPORTS_CACHE = await fetchAdminReports();
  await fetchReporterProfiles(ADMIN_REPORTS_CACHE);
  if (token !== ADMIN_REPORTS_VIEW.token) return;
  ADMIN_REPORTS_VIEW.truncated = ADMIN_REPORTS_CACHE.length >= ADMIN_REPORTS_LIMIT;
  reportsRefreshList();
}

async function renderAdminReportsView(){
  const wrap = reportsWrap();
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  reportsBind(wrap);
  wrap.innerHTML = trpLoadingHTML();
  const token = ++ADMIN_REPORTS_VIEW.token;
  const reports = await fetchAdminReports();
  await fetchReporterProfiles(reports);
  if (token !== ADMIN_REPORTS_VIEW.token) return;
  ADMIN_REPORTS_CACHE = reports;
  ADMIN_REPORTS_VIEW.truncated = reports.length >= ADMIN_REPORTS_LIMIT;
  wrap.innerHTML = trpPageHTML({ reports, filtros: ADMIN_REPORTS_STATE, L: ADMIN_REPORTS_LABELS, languageKeys: Object.keys(REPORT_LANGUAGE_LABELS), truncated: ADMIN_REPORTS_VIEW.truncated });
}

function reportsOpenDetail(id){
  const r = ADMIN_REPORTS_CACHE.find(x => String(x.id) === String(id)); const wrap = reportsWrap(); if (!r || !wrap) return;
  const old = document.getElementById('dlg-report'); if (old) old.remove();
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', trpDetailDialogHTML(r, ADMIN_REPORTS_LABELS));
  const d = document.getElementById('dlg-report');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function reportsSaveFields(form){
  const errorEl = document.getElementById('report-erro'); errorEl.textContent = '';
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  const result = await updateReportAdminFields(form.dataset.id, {
    status: document.getElementById('report-status').value, priority: document.getElementById('report-prioridade').value || null,
    internal_note: document.getElementById('report-nota').value.trim() || null,
  });
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = t('teacherMaterials.err.saveFailed'); return; }
  document.getElementById('dlg-report').close();
  showToast(t('admin.reports.toast.updated'));
  await reportsReload();
}

// Responder por e-mail: pede confirmação antes (o e-mail sai na hora e não dá para desfazer).
async function reportsSendReply(id){
  if (ADMIN_REPORTS_VIEW.enviando) return;
  const r = ADMIN_REPORTS_CACHE.find(x => String(x.id) === String(id)); if (!r) return;
  const errorEl = document.getElementById('report-resp-erro'), btn = document.getElementById('report-resp-enviar');
  errorEl.textContent = '';
  const subject = document.getElementById('report-resp-assunto').value.trim(), body = document.getElementById('report-resp-msg').value.trim();
  if (!subject || !body){ errorEl.textContent = t('admin.reports.reply.err.missing_fields'); return; }
  const opts = { titulo: t('reports.reply.confirm.title', { who: reporterLabel(r) }), descricao: t('reports.reply.confirm.text', { subject }), confirmar: t('reports.reply.confirm.ok'), cancelar: t('reports.reply.confirm.cancel'), perigo: false };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(opts.descricao);
  if (!ok) return;
  ADMIN_REPORTS_VIEW.enviando = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  const result = await sendAdminReportReply(id, subject, body);
  ADMIN_REPORTS_VIEW.enviando = false; btn.removeAttribute('aria-busy'); btn.disabled = false;
  if (!result.ok){ errorEl.textContent = result.error; return; }
  document.getElementById('dlg-report').close();
  showToast(t('admin.reports.toast.replySent', { to: result.to }));
  await reportsReload();
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function reportsBind(wrap){
  if (ADMIN_REPORTS_VIEW.ligado) return;
  ADMIN_REPORTS_VIEW.ligado = true;
  const S = ADMIN_REPORTS_STATE;
  wrap.addEventListener('click', (e) => {
    let el;
    if ((el = e.target.closest('[data-ver-report]'))) return reportsOpenDetail(el.dataset.verReport);
    if ((el = e.target.closest('[data-enviar-resposta]'))) return reportsSendReply(el.dataset.enviarResposta);
  });
  wrap.addEventListener('input', (e) => { if (e.target.matches('[data-reports-busca]')){ S.busca = e.target.value; reportsRefreshList(); } });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-reports-status]')){ S.statusFilter = e.target.value; reportsReload(); }
    else if (e.target.matches('[data-reports-tipo]')){ S.kindFilter = e.target.value; reportsReload(); }
    else if (e.target.matches('[data-reports-idioma]')){ S.languageFilter = e.target.value; reportsReload(); }
  });
  wrap.addEventListener('submit', (e) => { if (e.target.id === 'form-report'){ e.preventDefault(); reportsSaveFields(e.target); } });
}
