// ---------- Google Agenda -> site (migration 117, Edge Function google-calendar) ----------
// Bloco em Professora > Aulas > Calendário. Sincronização em UM sentido: o site lê o Google; nunca escreve lá.
// Conectar (consentimento do Google), escolher agendas e o modo de cada uma, ler agora, caixa "Eventos para revisar" e
// "esperando conta no site". Grátis, dentro do plano Professora.

// tab: 'open' (para revisar) | 'skipped' (pulados); sort: 'recent' | 'oldest'; shown: quantos itens aparecem (10 por vez).
const GCAL_STATE = { status: null, review: [], bank: null, open: null, busy: false, tab: 'open', sort: 'recent', shown: 10 };
const GCAL_PAGE = 10;

async function gcalCall(action, extra){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'not_authorized' };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(Object.assign({ action }, extra || {})),
    });
    return await r.json().catch(() => ({ ok: false, error: 'http_' + r.status }));
  } catch (e) {
    return { ok: false, error: 'network' };
  }
}

async function gcalLoad(){
  const [{ data: status, error }, items] = await Promise.all([
    supabaseClient.rpc('google_calendar_status'),
    supabaseClient.rpc('google_calendar_review_items'),
  ]);
  if (error){ console.error('google_calendar_status falhou:', error.message); GCAL_STATE.status = null; return; }
  GCAL_STATE.status = status;
  let review = items && !items.error ? items.data : null;
  // Antes da 119: lista antiga (até 300, sem "pulados").
  if (!Array.isArray(review)){ const old = await supabaseClient.rpc('google_calendar_review_list'); review = (old && old.data) || []; }
  GCAL_STATE.review = review;
  if (GCAL_STATE.bank === null){
    const { data } = await supabaseClient.from('review_bank_students')
      .select('id,name,language_app_key,linked_student_id,classroom_id').eq('status', 'ativo').order('name');
    GCAL_STATE.bank = (data || []).filter(b => !b.linked_student_id && !b.classroom_id);
  }
}

function gcalAgo(iso){
  if (!iso) return t('panel.gcal.never');
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return t('panel.gcal.justNow');
  if (min < 60) return t('panel.gcal.minAgo', { n: min });
  return fmtDate(new Date(iso), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function gcalWhen(ev){
  if (!ev.start_at) return '';
  const d = new Date(ev.start_at);
  return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + fmtDate(d, { hour: '2-digit', minute: '2-digit' });
}

// Opções do seletor "de quem é esta aula": alunos com vínculo, turmas e alunos do Banco ainda sem conta.
function gcalTargetOptionsHTML(){
  const students = (ADMIN_CLASS_LOGS_STATE._studentsCache || []);
  const rooms = (ADMIN_CLASS_LOGS_STATE._classroomsCache || []);
  const bank = GCAL_STATE.bank || [];
  const lang = k => STUDENT_LANGUAGE_LABELS[k] || k;
  return `<option value="">${t('panel.gcal.pick')}</option>
    ${students.length ? `<optgroup label="${escapeHTML(t('admin.common.students'))}">${students.map(s =>
      `<option value="student|${escapeHTML(s.student_id)}|${escapeHTML(s.language_app_key)}">${escapeHTML(s.display_name || s.username || '?')} · ${escapeHTML(lang(s.language_app_key))}</option>`).join('')}</optgroup>` : ''}
    ${rooms.length ? `<optgroup label="${escapeHTML(t('panel.classLog.classrooms'))}">${rooms.map(c =>
      `<option value="classroom|${c.id}|${escapeHTML(c.language_app_key)}">👥 ${escapeHTML(c.name)}</option>`).join('')}</optgroup>` : ''}
    ${bank.length ? `<optgroup label="${escapeHTML(t('panel.gcal.noAccountGroup'))}">${bank.map(b =>
      `<option value="bank_student|${escapeHTML(b.id)}|${escapeHTML(b.language_app_key)}">${escapeHTML(b.name)} · ${escapeHTML(lang(b.language_app_key))}</option>`).join('')}</optgroup>` : ''}`;
}

function gcalReviewItemHTML(ev){
  const cancelled = ev.match_state === 'cancelled';
  const who = (ev.attendees || []).map(a => a.name || a.email).filter(Boolean).join(', ');
  return `<li class="gcal-review-item" data-gcal-event="${ev.id}">
    <div class="gcal-review-head"><b>${escapeHTML(ev.title || t('panel.gcal.noTitle'))}</b>
      <span class="profile-edit-hint">${escapeHTML(gcalWhen(ev))}${ev.calendar_summary ? ' · ' + escapeHTML(ev.calendar_summary) : ''}${who ? ' · ' + escapeHTML(who) : ''}</span></div>
    ${cancelled
      ? `<p class="profile-edit-hint">${t('panel.gcal.cancelledHint')}</p>
         <div class="gcal-review-actions">
           <button type="button" class="btn btn-secondary mural-small-btn" data-gcal-do="keep">${t('panel.gcal.keep')}</button>
           <button type="button" class="btn tinv-ghost mural-small-btn" data-gcal-do="unlink">${t('panel.gcal.unlink')}</button>
         </div>`
      : `<div class="gcal-review-actions">
           <select class="profile-edit-input" data-gcal-target aria-label="${escapeHTML(t('panel.gcal.pick'))}">${gcalTargetOptionsHTML()}</select>
           <button type="button" class="btn btn-primary mural-small-btn" data-gcal-do="assign">${t('panel.gcal.assign')}</button>
         </div>
         <div class="gcal-review-actions gcal-review-more">
           <button type="button" class="btn tinv-ghost mural-small-btn" data-gcal-do="ignore">${t('panel.gcal.ignore')}</button>
           <button type="button" class="btn tinv-ghost mural-small-btn" data-gcal-do="outside" title="${escapeHTML(t('panel.gcal.outsideTitle'))}">${t('panel.gcal.outside')}</button>
         </div>
         <label class="gcal-remember"><input type="checkbox" data-gcal-remember checked> ${t('panel.gcal.remember')}</label>`}
    <div class="gcal-review-actions">
      <button type="button" class="admin-select-link gcal-skip" data-gcal-do="${ev.skipped_at ? 'unskip' : 'skip'}">${t(ev.skipped_at ? 'panel.gcal.unskip' : 'panel.gcal.skip')}</button>
    </div>
  </li>`;
}

function gcalBoxHTML(){
  const st = GCAL_STATE.status;
  if (!st) return `<p class="profile-empty-note">${t('panel.gcal.loadError')}</p>`;
  const intro = `<p class="profile-edit-hint gcal-oneway">${t('panel.gcal.oneWay')}</p>`;
  if (!st.connected){
    return `${intro}<p class="profile-edit-hint">${t('panel.gcal.howItWorks')}</p>
      <button type="button" class="btn btn-primary mural-small-btn" data-gcal-connect>${t('panel.gcal.connect')}</button>`;
  }
  const c = st.counts || {};
  const sources = st.sources || [];
  const anyOn = sources.some(s => s.enabled);
  const err = st.last_error === 'reconnect' ? t('panel.gcal.errReconnect') : (st.last_error ? t('panel.gcal.errGeneric') : '');
  return `${intro}
    <p class="gcal-account">${t('panel.gcal.connectedAs', { email: escapeHTML(st.google_email || '?') })} · ${t('panel.gcal.lastRead', { when: escapeHTML(gcalAgo(st.last_sync_at)) })}</p>
    ${err ? `<p class="gcal-error" role="alert">${err}</p>` : ''}
    <div class="section-label">${t('panel.gcal.calendars')}</div>
    <p class="profile-edit-hint">${t('panel.gcal.calendarsHint')}</p>
    <ul class="gcal-sources">${sources.map(s => `<li data-gcal-source="${escapeHTML(s.calendar_id)}">
      <label class="gcal-source-name"><input type="checkbox" data-gcal-enabled ${s.enabled ? 'checked' : ''}> ${escapeHTML(s.summary || s.calendar_id)}${s.is_primary ? ` <span class="profile-edit-hint">(${t('panel.gcal.primary')})</span>` : ''}</label>
      <select class="profile-edit-input" data-gcal-mode ${s.enabled ? '' : 'disabled'}>
        <option value="all" ${s.mode === 'all' ? 'selected' : ''}>${t('panel.gcal.modeAll')}</option>
        <option value="matched" ${s.mode === 'matched' ? 'selected' : ''}>${t('panel.gcal.modeMatched')}</option>
      </select></li>`).join('') || `<li class="profile-empty-note">${t('panel.gcal.noCalendars')}</li>`}</ul>
    <div class="gcal-actions">
      <button type="button" class="btn btn-secondary mural-small-btn" data-gcal-sync ${anyOn ? '' : 'disabled'}>${t('panel.gcal.syncNow')}</button>
      <button type="button" class="btn tinv-ghost mural-small-btn" data-gcal-refresh>${t('panel.gcal.refreshList')}</button>
      <a href="#" class="admin-select-link" data-gcal-disconnect>${t('panel.gcal.disconnect')}</a>
    </div>
    <p class="gcal-counts">${t('panel.gcal.counts', { linked: c.linked || 0, review: c.review || 0, waiting: c.no_account || 0 })}</p>
    ${(st.waiting || []).length ? `<details class="gcal-waiting"><summary>${t('panel.gcal.waitingTitle')}</summary>
      <p class="profile-edit-hint">${t('panel.gcal.waitingHint')}</p>
      <ul>${st.waiting.map(w => `<li>${escapeHTML(w.name)}: ${w.n}</li>`).join('')}</ul></details>` : ''}
    ${GCAL_STATE.review.length ? gcalReviewHTML() : ''}`;
}

// Caixa "Eventos para revisar": abas Para revisar / Pulados, ordem e 10 por vez.
function gcalReviewHTML(){
  const all = GCAL_STATE.review;
  const open = all.filter(e => !e.skipped_at);
  const skipped = all.filter(e => e.skipped_at);
  const tab = GCAL_STATE.tab === 'skipped' ? 'skipped' : 'open';
  const time = e => (e.start_at ? new Date(e.start_at).getTime() : 0);
  const list = (tab === 'skipped' ? skipped : open).slice()
    .sort((a, b) => GCAL_STATE.sort === 'oldest' ? time(a) - time(b) : time(b) - time(a));
  const shown = list.slice(0, GCAL_STATE.shown);
  const rest = list.length - shown.length;
  const tabBtn = (key, label) => `<button type="button" class="gcal-tab${tab === key ? ' is-active' : ''}" data-gcal-tab="${key}" aria-pressed="${tab === key}">${label}</button>`;
  return `<div class="section-label">${t('panel.gcal.reviewTitle', { n: open.length })}</div>
    <p class="profile-edit-hint">${t('panel.gcal.reviewHint')}</p>
    <div class="gcal-review-bar">
      <div class="gcal-tabs">${tabBtn('open', t('panel.gcal.tabOpen', { n: open.length }))}${tabBtn('skipped', t('panel.gcal.tabSkipped', { n: skipped.length }))}</div>
      <select class="profile-edit-input" data-gcal-sort aria-label="${escapeHTML(t('panel.gcal.sortLabel'))}">
        <option value="recent" ${GCAL_STATE.sort !== 'oldest' ? 'selected' : ''}>${t('panel.gcal.sortRecent')}</option>
        <option value="oldest" ${GCAL_STATE.sort === 'oldest' ? 'selected' : ''}>${t('panel.gcal.sortOldest')}</option>
      </select>
    </div>
    ${tab === 'skipped' ? `<p class="profile-edit-hint">${t('panel.gcal.skippedHint')}</p>` : ''}
    ${shown.length ? `<ul class="gcal-review">${shown.map(gcalReviewItemHTML).join('')}</ul>`
      : `<p class="profile-empty-note">${t(tab === 'skipped' ? 'panel.gcal.emptySkipped' : 'panel.gcal.emptyOpen')}</p>`}
    ${rest > 0 ? `<button type="button" class="btn tinv-ghost mural-small-btn gcal-more" data-gcal-more>${t('panel.gcal.showMore', { n: Math.min(rest, GCAL_PAGE), rest })}</button>` : ''}`;
}

// Troca de aba/ordem/"mostrar mais": só redesenha (sem buscar de novo).
function gcalRepaint(){
  const host = document.getElementById('admin-gcal-box');
  const body = host && host.querySelector('[data-gcal-body]');
  if (body) body.innerHTML = gcalBoxHTML();
}

// quiet: atualização depois de um botão. Não troca a caixa por "carregando" (isso encolhia a página e jogava a tela para
// baixo); troca o conteúdo de uma vez quando os dados chegam.
async function renderGoogleCalendarBox(opts){
  const host = document.getElementById('admin-gcal-box');
  if (!host) return;
  const body = host.querySelector('[data-gcal-body]');
  if (!(opts && opts.quiet)) body.innerHTML = typeof loadingHTML === 'function' ? loadingHTML() : '…';
  await gcalLoad();
  body.innerHTML = gcalBoxHTML();
  const n = GCAL_STATE.review.filter(e => !e.skipped_at).length;
  const badge = host.querySelector('[data-gcal-badge]');
  if (badge){ badge.textContent = n ? String(n) : ''; badge.hidden = !n; }
  // Primeira vez: aberto se há algo para revisar ou se ainda não conectou; depois, mantém o que a professora escolheu.
  host.open = GCAL_STATE.open === null ? (!!n || !(GCAL_STATE.status && GCAL_STATE.status.connected)) : GCAL_STATE.open;
}

function googleCalendarBoxShellHTML(){
  return `<details class="profile-section gcal-box" id="admin-gcal-box">
    <summary class="section-label">📅 ${t('panel.gcal.title')} <span class="gcal-badge" data-gcal-badge hidden></span></summary>
    <div class="gcal-body" data-gcal-body></div>
  </details>`;
}

// Depois de um botão: a tela fica onde estava (decisão da autora, 2026-10-23: nada de pular ao salvar).
// doneEl: item da caixa "Eventos para revisar" já resolvido, que sai na hora sem esperar a lista nova.
async function gcalAfter(promise, okMsg, doneEl){
  GCAL_STATE.busy = true;
  const y = window.scrollY;
  const res = await promise;
  GCAL_STATE.busy = false;
  const failed = !!(res && res.error);
  if (failed){ showToast(t('panel.gcal.errGeneric')); console.error('Google Agenda:', res.error.message || res.error); }
  else if (okMsg) showToast(okMsg);
  if (doneEl && !failed) doneEl.remove();
  await renderGoogleCalendarBox({ quiet: true });
  if (ADMIN_CLASS_LOGS_STATE.view === 'calendar' && typeof renderTeacherClassCalendar === 'function') await renderTeacherClassCalendar();
  window.scrollTo({ top: y, behavior: 'instant' });
}

function wireGoogleCalendarBox(root){
  const host = root && root.querySelector('#admin-gcal-box');
  if (!host || host.dataset.wired) return;
  host.dataset.wired = '1';
  host.addEventListener('toggle', () => { GCAL_STATE.open = host.open; });
  host.addEventListener('change', async (e) => {
    if (e.target.closest('[data-gcal-sort]')){ GCAL_STATE.sort = e.target.value; GCAL_STATE.shown = GCAL_PAGE; gcalRepaint(); return; }
    const li = e.target.closest('[data-gcal-source]');
    if (!li || GCAL_STATE.busy) return;
    const enabled = li.querySelector('[data-gcal-enabled]').checked;
    const mode = li.querySelector('[data-gcal-mode]').value;
    await gcalAfter(supabaseClient.rpc('google_calendar_set_source', { p_calendar_id: li.dataset.gcalSource, p_enabled: enabled, p_mode: mode }));
    if (enabled){ showToast(t('panel.gcal.reading')); await gcalAfter(gcalCall('sync'), t('panel.gcal.synced')); }
  });
  host.addEventListener('click', async (e) => {
    if (GCAL_STATE.busy) return;
    const tabBtn = e.target.closest('[data-gcal-tab]');
    if (tabBtn){ GCAL_STATE.tab = tabBtn.dataset.gcalTab; GCAL_STATE.shown = GCAL_PAGE; gcalRepaint(); return; }
    if (e.target.closest('[data-gcal-more]')){ GCAL_STATE.shown += GCAL_PAGE; gcalRepaint(); return; }
    if (e.target.closest('[data-gcal-connect]')){
      const ret = location.href.replace(/([?&])gcal=[^&#]*&?/, '$1').replace(/[?&]$/, '');
      const res = await gcalCall('start', { return_url: ret });
      if (res && res.url) location.href = res.url; else showToast(t('panel.gcal.errGeneric'));
    } else if (e.target.closest('[data-gcal-sync]')){
      showToast(t('panel.gcal.reading'));
      await gcalAfter(gcalCall('sync'), t('panel.gcal.synced'));
    } else if (e.target.closest('[data-gcal-refresh]')){
      await gcalAfter(gcalCall('calendars'));
    } else if (e.target.closest('[data-gcal-disconnect]')){
      e.preventDefault();
      if (!confirm(t('panel.gcal.disconnectConfirm'))) return;
      await gcalAfter(supabaseClient.rpc('google_calendar_disconnect'), t('panel.gcal.disconnected'));
    } else {
      const btn = e.target.closest('[data-gcal-do]');
      const li = btn && btn.closest('[data-gcal-event]');
      if (!li) return;
      const id = Number(li.dataset.gcalEvent);
      const act = btn.dataset.gcalDo;
      const remember = !!(li.querySelector('[data-gcal-remember]') || {}).checked;
      if (act === 'assign'){
        const v = (li.querySelector('[data-gcal-target]') || {}).value || '';
        if (!v){ showToast(t('panel.gcal.pickFirst')); return; }
        const [kind, target, lang] = v.split('|');
        await gcalAfter(supabaseClient.rpc('google_calendar_resolve', { p_event_id: id, p_action: kind, p_target: target, p_language: lang || null, p_remember: remember }), t('panel.gcal.saved'), li);
      } else {
        const msg = act === 'skip' ? t('panel.gcal.skipped') : act === 'unskip' ? t('panel.gcal.unskipped') : t('panel.gcal.saved');
        await gcalAfter(supabaseClient.rpc('google_calendar_resolve', { p_event_id: id, p_action: act, p_remember: (act === 'ignore' || act === 'outside') ? remember : false }), msg, li);
      }
    }
  });
  // Volta do consentimento do Google (?gcal=ok|erro|cancelado).
  const m = /[?&]gcal=(ok|erro|cancelado)/.exec(location.search + location.hash);
  if (m){
    showToast(m[1] === 'ok' ? t('panel.gcal.connectedToast') : m[1] === 'erro' ? t('panel.gcal.errGeneric') : t('panel.gcal.cancelledToast'));
    try { const u = new URL(location.href); u.searchParams.delete('gcal'); history.replaceState(null, '', u.toString()); } catch {}
    GCAL_STATE.open = true; host.open = true;
  }
}
