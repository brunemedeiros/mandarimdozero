// ---------- Reports (painel de Admin): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar, salvar, enviar
// a resposta, diálogos, eventos) fica em shared/admin-reports.js. Testado em tests/painel-admin/test_reports_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t() (chaves reports.* e admin.reports.*); links só viram href se
// forem http(s). Dados pessoais: aqui só aparece o nome/@usuário de conta logada ou o e-mail que o convidado deixou, nunca o e-mail de conta.
//
// Rótulos vêm de um objeto L montado pelo controlador (a partir de shared/reports.js e das tabelas de rótulos do admin):
//   L.status(s), L.priority(p), L.category(id), L.severity(id), L.lang(key), L.screen(key), L.reporter(report),
//   L.statusKeys[], L.priorityKeys[]
//
// Depende de: shared/i18n (t, fmtDate), shared/profile.js (escapeHTML).

function trpEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function trpSafeUrl(u){ return /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : ''; }
function trpDate(iso){ return fmtDate(iso, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function trpSnippet(text, n){ const s = String(text || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
// Cor do selo de status: novo/em andamento chamam atenção, resolvido é verde, o resto fica neutro.
function trpStatusClass(s){ return s === 'novo' ? 'p-selo--erro' : (s === 'em_analise' || s === 'confirmado') ? 'p-selo--aviso' : s === 'em_desenvolvimento' ? 'p-selo--info' : s === 'resolvido' ? 'p-selo--ok' : ''; }

// Busca no navegador (os filtros de status, tipo e idioma já vêm do servidor): descrição, categoria, pessoa, tela.
function trpFilterReports(reports, busca, L){
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(busca).trim();
  if (!q) return reports;
  return reports.filter(r => norm([r.description, r.expected_behavior, L.category(r.category), L.reporter(r), r.context && r.context.screen && L.screen(r.context.screen), r.internal_note].join(' ')).includes(q));
}

function trpRowHTML(r, L){
  const screenKey = r.context && r.context.screen;
  const langLabel = L.lang(r.language_app_key);
  return `<tr data-report-row="${trpEsc(r.id)}">
    <td><span aria-hidden="true">${r.kind === 'sugestao' ? '💡' : '⚑'}</span> <strong>${trpEsc(L.category(r.category) || r.category)}</strong><br><small>${trpEsc(trpSnippet(r.description, 90))}</small></td>
    <td>${trpEsc(L.reporter(r))}${r.admin_reply_sent_at ? ` <span class="p-selo p-selo--ok" title="${trpEsc(t('reports.row.repliedTitle'))}">${trpEsc(t('reports.row.replied'))}</span>` : ''}</td>
    <td class="p-oculta-movel">${trpEsc(langLabel)}${screenKey ? `<br><small>${trpEsc(L.screen(screenKey))}</small>` : ''}</td>
    <td class="p-oculta-movel">${trpEsc(trpDate(r.created_at))}</td>
    <td><span class="p-selo ${trpStatusClass(r.status)}" data-status="${trpEsc(r.status)}">${trpEsc(L.status(r.status))}</span>${r.priority ? `<br><small>${trpEsc(L.priority(r.priority))}</small>` : ''}</td>
    <td><button type="button" class="outline secondary p-pequeno" data-ver-report="${trpEsc(r.id)}" aria-label="${trpEsc(t('reports.row.openAria', { category: L.category(r.category) || r.category }))}">${trpEsc(t('admin.reports.row.details'))}</button></td></tr>`;
}

function trpListHTML(reports, total, L, truncated){
  if (!reports.length) return `<div class="p-vazio"><strong>${trpEsc(t(total ? 'reports.empty.search' : 'admin.reports.empty'))}</strong></div>`;
  return `<article class="p-tabela p-tabela--compacta p-tabela--fluida"><table class="striped"><thead><tr>
    <th scope="col">${trpEsc(t('reports.col.report'))}</th><th scope="col">${trpEsc(t('reports.col.who'))}</th><th scope="col" class="p-oculta-movel">${trpEsc(t('reports.col.where'))}</th><th scope="col" class="p-oculta-movel">${trpEsc(t('reports.col.date'))}</th><th scope="col">${trpEsc(t('reports.col.status'))}</th><th scope="col"><span class="p-so-leitor">${trpEsc(t('reports.menu'))}</span></th>
  </tr></thead><tbody>${reports.map(r => trpRowHTML(r, L)).join('')}</tbody></table></article>
  <small class="p-subtitulo" data-reports-contagem>${trpEsc(t(truncated ? 'reports.count.truncated' : 'reports.count', { n: reports.length }))}</small>`;
}

function trpFiltersHTML(f, L, languageKeys){
  const opt = (v, label, cur) => `<option value="${trpEsc(v)}"${cur === v ? ' selected' : ''}>${trpEsc(label)}</option>`;
  return `<div class="p-ferramentas">
    <select aria-label="${trpEsc(t('reports.filter.status.aria'))}" data-reports-status>${opt('all', t('admin.reports.filter.allStatus'), f.statusFilter)}${L.statusKeys.map(s => opt(s, L.status(s), f.statusFilter)).join('')}</select>
    <select aria-label="${trpEsc(t('reports.filter.kind.aria'))}" data-reports-tipo>${opt('all', t('admin.reports.filter.kindAll'), f.kindFilter)}${opt('problema', t('admin.reports.filter.kindProblems'), f.kindFilter)}${opt('sugestao', t('admin.reports.filter.kindSuggestions'), f.kindFilter)}</select>
    <select aria-label="${trpEsc(t('reports.filter.lang.aria'))}" data-reports-idioma>${opt('all', t('admin.reports.filter.allLanguages'), f.languageFilter)}${languageKeys.map(k => opt(k, L.lang(k), f.languageFilter)).join('')}</select>
    <input class="p-cresce" type="search" placeholder="${trpEsc(t('reports.search.placeholder'))}" aria-label="${trpEsc(t('reports.search.aria'))}" value="${trpEsc(f.busca || '')}" data-reports-busca>
  </div>`;
}

function trpContextHTML(ctx){
  const keys = Object.keys(ctx || {});
  if (!keys.length) return `<p class="p-subtitulo" style="margin:0">${trpEsc(t('admin.reports.ctx.none'))}</p>`;
  return `<dl class="p-contexto">${keys.map(k => { const v = ctx[k]; return `<dt>${trpEsc(k)}</dt><dd>${trpEsc(v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v))}</dd>`; }).join('')}</dl>`;
}

// Quem pode ser respondido: conta logada sempre (a Edge Function descobre o e-mail na hora); convidado só se deixou e-mail.
function trpCanReply(r){ return !!r.reporter_email || !!r.user_id; }

function trpReplyHTML(r){
  const history = r.admin_reply_sent_at
    ? `<div class="p-alerta p-alerta--info"><span><em>${trpEsc(r.reporter_email ? t('admin.reports.reply.lastSentTo', { date: trpDate(r.admin_reply_sent_at), email: r.reporter_email }) : t('admin.reports.reply.lastSent', { date: trpDate(r.admin_reply_sent_at) }))}</em><br>"${trpEsc(r.admin_reply_subject || '')}" ${trpEsc(r.admin_reply || '')}</span></div>` : '';
  if (!trpCanReply(r)) return `<h4>${trpEsc(t('admin.modal.report.replyByEmail'))}</h4>${history}<div class="p-alerta p-alerta--aviso"><span>${trpEsc(t('admin.modal.report.noEmail'))}</span></div>`;
  return `<h4>${trpEsc(t('admin.modal.report.replyByEmail'))}</h4>${history}
    <label>${trpEsc(t('admin.modal.report.subject'))}<input id="report-resp-assunto" maxlength="150" autocomplete="off"></label>
    <label>${trpEsc(t('admin.modal.report.message'))}<textarea id="report-resp-msg" rows="5" placeholder="${trpEsc(t('admin.modal.report.replyPh'))}"></textarea></label>
    <p class="profile-edit-error" id="report-resp-erro" role="alert"></p>
    <div class="p-acoes" style="justify-content:flex-end"><button type="button" id="report-resp-enviar" data-enviar-resposta="${trpEsc(r.id)}">${trpEsc(t('admin.reports.reply.send'))}</button></div>`;
}

function trpDetailDialogHTML(r, L){
  const shot = trpSafeUrl(r.screenshot_url);
  const block = (label, html) => `<div class="p-bloco"><small>${trpEsc(label)}</small><div>${html}</div></div>`;
  const notInformed = trpEsc(t('admin.reports.detail.notInformed'));
  return `<dialog id="dlg-report" class="p-dialogo p-dialogo--larga" aria-labelledby="dlg-report-t"><article>
    <header><button type="button" rel="prev" aria-label="${trpEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-report-t">${trpEsc(t(r.kind === 'sugestao' ? 'admin.reports.detail.suggestion' : 'admin.reports.detail.problem'))}: ${trpEsc(L.category(r.category) || r.category)}</h3></header>
    <div class="p-detalhe-report">
      <p class="p-subtitulo" style="margin:0">${trpEsc(L.reporter(r))} · ${trpEsc(trpDate(r.created_at))} · ${trpEsc(L.lang(r.language_app_key))}${r.context && r.context.screen ? ` · ${trpEsc(L.screen(r.context.screen))}` : ''}</p>
      ${block(t('admin.modal.report.description'), `<p style="white-space:pre-wrap;overflow-wrap:anywhere;margin:0">${trpEsc(r.description || '')}</p>`)}
      ${block(t('admin.modal.report.expected'), r.expected_behavior ? `<p style="white-space:pre-wrap;overflow-wrap:anywhere;margin:0">${trpEsc(r.expected_behavior)}</p>` : notInformed)}
      ${block(t('admin.modal.report.severity'), r.severity_reported && L.severity(r.severity_reported) ? trpEsc(L.severity(r.severity_reported)) : notInformed)}
      <details class="p-automaticos"><summary>${trpEsc(t('admin.modal.report.context'))}</summary>${trpContextHTML(r.context)}</details>
      <div>${shot ? `<a href="${trpEsc(shot)}" target="_blank" rel="noopener noreferrer">${trpEsc(t('admin.reports.detail.screenshotView'))}</a>` : `<small>${trpEsc(t('admin.reports.detail.screenshotNone'))}</small>`}</div>
      <form id="form-report" data-id="${trpEsc(r.id)}" novalidate>
        <div class="p-grade-2" style="gap:.75rem">
          <label>${trpEsc(t('admin.modal.report.status'))}<select id="report-status">${L.statusKeys.map(s => `<option value="${trpEsc(s)}"${(r.status || 'novo') === s ? ' selected' : ''}>${trpEsc(L.status(s))}</option>`).join('')}</select></label>
          <label>${trpEsc(t('admin.modal.report.priority'))}<select id="report-prioridade"><option value="">${trpEsc(t('admin.modal.report.priorityNone'))}</option>${L.priorityKeys.map(p => `<option value="${trpEsc(p)}"${r.priority === p ? ' selected' : ''}>${trpEsc(L.priority(p))}</option>`).join('')}</select></label>
        </div>
        <label>${trpEsc(t('admin.modal.report.note'))}<textarea id="report-nota" rows="3" placeholder="${trpEsc(t('admin.modal.report.notePh'))}">${trpEsc(r.internal_note || '')}</textarea></label>
        <p class="profile-edit-error" id="report-erro" role="alert"></p>
        <div class="p-acoes" style="justify-content:flex-end"><button type="submit">${trpEsc(t('profile.save'))}</button></div>
      </form>
      <section class="p-resposta" data-report-resposta>${trpReplyHTML(r)}</section>
    </div></article></dialog>`;
}

function trpLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${trpEsc(t('reports.loading'))}</span></div></div></div>`;
}

// Tela completa. st = { reports, filtros, L, languageKeys, truncated }
function trpPageHTML(st){
  const shown = trpFilterReports(st.reports, st.filtros.busca, st.L);
  return `<div class="painel"><div class="p-pagina" data-trp="pagina">
    <header class="p-cabecalho"><div><h2>${trpEsc(t('reports.title'))}</h2><span class="p-subtitulo">${trpEsc(t('admin.reports.hint'))}</span></div></header>
    ${trpFiltersHTML(st.filtros, st.L, st.languageKeys)}
    <div data-reports-lista style="display:grid;gap:.5rem">${trpListHTML(shown, st.reports.length, st.L, st.truncated)}</div>
  </div></div>`;
}
