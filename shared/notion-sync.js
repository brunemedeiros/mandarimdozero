// ---------- Conectar Notion -> site (migration 128, Edge Function notion-sync) ----------
// Caixa em Professora > Mural > Aulas e materiais (acima de Registrar | Calendário). Sincronização em UM sentido: o site lê o
// banco de aulas do Notion da professora; nunca escreve lá. Conectar, escolher o banco e as colunas, ler agora, e a caixa com
// "Para aprovar" (aulas de antes da ligação: entram sem aviso no Mural nem sino), "Para revisar" (nome não reconhecido) e
// "Esperando conta". Visual e classes da caixa do Google Agenda (shared/google-calendar.js). Grátis, plano Professora.

const NOTION_FIELDS = ['date', 'student', 'topic', 'homework', 'attendance', 'skills', 'language'];
const NOTION_REQUIRED = ['date', 'student'];
const NOTION_PAGE = 10;
// setup: null | { step: 'databases', list } | { step: 'columns', database_id, title, properties, suggested, field_types }
const NOTION_STATE = { status: null, items: [], bank: null, open: null, busy: false, tab: 'approval', shown: NOTION_PAGE, setup: null };

async function notionCall(action, extra){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'not_authorized' };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/notion-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(Object.assign({ action }, extra || {})),
    });
    return await r.json().catch(() => ({ ok: false, error: 'http_' + r.status }));
  } catch (e) {
    return { ok: false, error: 'network' };
  }
}

async function notionLoad(){
  const [{ data: status, error }, { data: items }] = await Promise.all([
    supabaseClient.rpc('notion_status'),
    supabaseClient.rpc('notion_review_items'),
  ]);
  if (error || !status || status.error){ NOTION_STATE.status = null; return; }
  NOTION_STATE.status = status;
  NOTION_STATE.items = (items && Array.isArray(items.data)) ? items.data : [];
  if (NOTION_STATE.bank === null){
    const { data } = await supabaseClient.from('review_bank_students')
      .select('id,name,language_app_key,linked_student_id,classroom_id').eq('status', 'ativo').order('name');
    NOTION_STATE.bank = (data || []).filter(b => !b.linked_student_id && !b.classroom_id);
  }
}

function notionDay(iso){
  return iso ? fmtDate(new Date(`${String(iso).slice(0, 10)}T00:00:00`), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function notionTargetOptionsHTML(){
  const students = (ADMIN_CLASS_LOGS_STATE._studentsCache || []);
  const rooms = (ADMIN_CLASS_LOGS_STATE._classroomsCache || []);
  const bank = NOTION_STATE.bank || [];
  const lang = k => STUDENT_LANGUAGE_LABELS[k] || k;
  return `<option value="">${t('panel.notion.pick')}</option>
    ${students.length ? `<optgroup label="${escapeHTML(t('admin.common.students'))}">${students.map(s =>
      `<option value="student|${escapeHTML(s.student_id)}|${escapeHTML(s.language_app_key)}">${escapeHTML(s.display_name || s.username || '?')} · ${escapeHTML(lang(s.language_app_key))}</option>`).join('')}</optgroup>` : ''}
    ${rooms.length ? `<optgroup label="${escapeHTML(t('panel.classLog.classrooms'))}">${rooms.map(c =>
      `<option value="classroom|${c.id}|${escapeHTML(c.language_app_key)}">👥 ${escapeHTML(c.name)}</option>`).join('')}</optgroup>` : ''}
    ${bank.length ? `<optgroup label="${escapeHTML(t('panel.gcal.noAccountGroup'))}">${bank.map(b =>
      `<option value="bank_student|${escapeHTML(b.id)}|${escapeHTML(b.language_app_key)}">${escapeHTML(b.name)} · ${escapeHTML(lang(b.language_app_key))}</option>`).join('')}</optgroup>` : ''}`;
}

function notionItemHTML(it){
  const lines = [
    it.topic ? `<span><b>${t('panel.notion.f.topic')}:</b> ${escapeHTML(it.topic)}</span>` : '',
    it.homework ? `<span><b>${t('panel.notion.f.homework')}:</b> ${escapeHTML(it.homework)}</span>` : '',
    it.attendance ? `<span><b>${t('panel.notion.f.attendance')}:</b> ${escapeHTML(it.attendance)}</span>` : '',
  ].filter(Boolean).join('');
  const head = `<div class="gcal-review-head"><b>${escapeHTML(it.target || it.name || t('panel.notion.noName'))}</b>
      <span class="profile-edit-hint">${escapeHTML(notionDay(it.class_date))}${it.start_time ? ' · ' + escapeHTML(String(it.start_time).slice(0, 5)) : ''}${it.target && it.name ? ' · ' + t('panel.notion.inNotion', { name: escapeHTML(it.name) }) : ''}</span></div>
    ${lines ? `<div class="notion-item-lines">${lines}</div>` : ''}`;
  if (it.state === 'approval'){
    return `<li class="gcal-review-item" data-notion-item="${it.id}">${head}
      <div class="gcal-review-actions">
        <button type="button" class="btn btn-primary mural-small-btn" data-notion-do="approve">${t('panel.notion.approve')}</button>
        <button type="button" class="btn tinv-ghost mural-small-btn" data-notion-do="discard">${t('panel.notion.discard')}</button>
      </div></li>`;
  }
  if (it.state === 'review'){
    return `<li class="gcal-review-item" data-notion-item="${it.id}" data-notion-name="${escapeHTML(it.name || '')}">${head}
      <p class="profile-edit-hint">${escapeHTML(notionReason(it.reason))}</p>
      ${it.name ? `<div class="gcal-review-actions">
        <select class="profile-edit-input" data-notion-target aria-label="${escapeHTML(t('panel.notion.pick'))}">${notionTargetOptionsHTML()}</select>
        <button type="button" class="btn btn-primary mural-small-btn" data-notion-do="link">${t('panel.notion.link')}</button>
        <button type="button" class="btn tinv-ghost mural-small-btn" data-notion-do="ignore">${t('panel.notion.ignoreName')}</button>
      </div>
      <p class="profile-edit-hint">${t('panel.notion.linkHint', { name: escapeHTML(it.name) })}</p>` : ''}</li>`;
  }
  return `<li class="gcal-review-item" data-notion-item="${it.id}">${head}<p class="profile-edit-hint">${t('panel.notion.waitingHint')}</p></li>`;
}

function notionReason(r){
  const map = { 'nome não reconhecido': 'panel.notion.r.unknown', 'mais de um aluno com esse nome': 'panel.notion.r.many',
    'aluno com mais de um idioma': 'panel.notion.r.lang', 'sem data': 'panel.notion.r.noDate', 'sem aluno': 'panel.notion.r.noName' };
  return map[r] ? t(map[r]) : '';
}

function notionReviewHTML(){
  const by = s => NOTION_STATE.items.filter(i => i.state === s);
  const lists = { approval: by('approval'), review: by('review'), no_account: by('no_account') };
  if (!lists.approval.length && !lists.review.length && !lists.no_account.length) return '';
  let tab = NOTION_STATE.tab;
  if (!lists[tab] || !lists[tab].length) tab = ['approval', 'review', 'no_account'].find(k => lists[k].length) || 'approval';
  const list = lists[tab];
  const shown = list.slice(0, NOTION_STATE.shown);
  const rest = list.length - shown.length;
  const tabBtn = (key, label) => lists[key].length ? `<button type="button" class="gcal-tab${tab === key ? ' is-active' : ''}" data-notion-tab="${key}" aria-pressed="${tab === key}">${label}</button>` : '';
  return `<div class="section-label">${t('panel.notion.reviewTitle')}</div>
    <div class="gcal-review-bar"><div class="gcal-tabs">
      ${tabBtn('approval', t('panel.notion.tabApproval', { n: lists.approval.length }))}
      ${tabBtn('review', t('panel.notion.tabReview', { n: lists.review.length }))}
      ${tabBtn('no_account', t('panel.notion.tabWaiting', { n: lists.no_account.length }))}
    </div></div>
    <p class="profile-edit-hint">${t(tab === 'approval' ? 'panel.notion.approvalHint' : tab === 'review' ? 'panel.notion.reviewHint' : 'panel.notion.waitingTabHint')}</p>
    ${tab === 'approval' ? `<div class="gcal-actions"><button type="button" class="btn btn-secondary mural-small-btn" data-notion-approve-all>${t('panel.notion.approveAll', { n: list.length })}</button></div>` : ''}
    <ul class="gcal-review">${shown.map(notionItemHTML).join('')}</ul>
    ${rest > 0 ? `<button type="button" class="btn tinv-ghost mural-small-btn gcal-more" data-notion-more>${t('panel.gcal.showMore', { n: Math.min(rest, NOTION_PAGE), rest })}</button>` : ''}`;
}

function notionSetupHTML(){
  const s = NOTION_STATE.setup;
  if (s && s.step === 'databases'){
    return `<div class="section-label">${t('panel.notion.pickDatabase')}</div>
      ${s.list.length ? `<ul class="gcal-sources">${s.list.map(d => `<li><span>${escapeHTML(d.title)}</span>
        <button type="button" class="btn btn-secondary mural-small-btn" data-notion-db="${escapeHTML(d.id)}" data-notion-db-title="${escapeHTML(d.title)}">${t('panel.notion.useThis')}</button></li>`).join('')}</ul>`
        : `<p class="profile-empty-note">${t('panel.notion.noDatabases')}</p>`}
      <p class="profile-edit-hint">${t('panel.notion.noDatabasesHint')}</p>
      <div class="gcal-actions"><button type="button" class="btn tinv-ghost mural-small-btn" data-notion-cancel-setup>${t('panel.notion.cancel')}</button></div>`;
  }
  if (s && s.step === 'columns'){
    const current = (NOTION_STATE.status.source && NOTION_STATE.status.source.database_id === s.database_id) ? NOTION_STATE.status.source.column_map : s.suggested;
    const from = (NOTION_STATE.status.source && NOTION_STATE.status.source.import_from)
      || new Date(Date.now() - 30 * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const row = (f) => {
      const ok = (s.field_types && s.field_types[f]) || [];
      const opts = s.properties.filter(p => ok.includes(p.type));
      return `<label class="notion-map-row"><span>${t('panel.notion.f.' + f)}${NOTION_REQUIRED.includes(f) ? ' *' : ''}</span>
        <select class="profile-edit-input" data-notion-col="${f}">
          <option value="">${t(NOTION_REQUIRED.includes(f) ? 'panel.notion.pickColumn' : 'panel.notion.noColumn')}</option>
          ${opts.map(p => `<option value="${escapeHTML(p.id)}" ${current && current[f] === p.id ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}
        </select></label>`;
    };
    return `<div class="section-label">${t('panel.notion.columnsTitle', { title: escapeHTML(s.title || '') })}</div>
      <p class="profile-edit-hint">${t('panel.notion.columnsHint')}</p>
      <div class="notion-map">${NOTION_FIELDS.map(row).join('')}
        <label class="notion-map-row"><span>${t('panel.notion.importFrom')}</span>
          <input type="date" class="profile-edit-input" data-notion-from value="${escapeHTML(from)}"></label>
      </div>
      <p class="profile-edit-hint">${t('panel.notion.importFromHint')}</p>
      <p class="gcal-error" data-notion-setup-error role="alert" hidden></p>
      <div class="gcal-actions">
        <button type="button" class="btn btn-primary mural-small-btn" data-notion-save-source="${escapeHTML(s.database_id)}" data-notion-db-title="${escapeHTML(s.title || '')}">${t('panel.notion.saveSource')}</button>
        <button type="button" class="btn tinv-ghost mural-small-btn" data-notion-cancel-setup>${t('panel.notion.cancel')}</button>
      </div>`;
  }
  return '';
}

function notionBoxHTML(){
  const st = NOTION_STATE.status;
  if (!st) return `<p class="profile-empty-note">${t('panel.notion.loadError')}</p>`;
  const intro = `<p class="profile-edit-hint gcal-oneway">${t('panel.notion.oneWay')}</p>`;
  if (!st.connected){
    return `${intro}<p class="profile-edit-hint">${t('panel.notion.howItWorks')}</p>
      <button type="button" class="btn btn-primary mural-small-btn" data-notion-connect>${t('panel.notion.connect')}</button>`;
  }
  if (NOTION_STATE.setup) return intro + notionSetupHTML();
  const src = st.source;
  const c = st.counts || {};
  const err = st.last_error === 'reconnect' ? t('panel.notion.errReconnect') : (st.last_error ? t('panel.notion.errGeneric') : '');
  if (!src || !src.enabled){
    return `${intro}<p class="gcal-account">${t('panel.notion.connectedTo', { name: escapeHTML(st.workspace || 'Notion') })}</p>
      <p class="profile-edit-hint">${t('panel.notion.nextPick')}</p>
      <div class="gcal-actions">
        <button type="button" class="btn btn-primary mural-small-btn" data-notion-pick>${t('panel.notion.pickDatabaseBtn')}</button>
        <a href="#" class="admin-select-link" data-notion-disconnect>${t('panel.notion.disconnect')}</a>
      </div>`;
  }
  return `${intro}
    <p class="gcal-account">${t('panel.notion.sourceLine', { title: escapeHTML(src.title || '?'), name: escapeHTML(st.workspace || 'Notion') })} · ${t('panel.gcal.lastRead', { when: escapeHTML(gcalAgo(st.last_sync_at)) })}</p>
    ${err ? `<p class="gcal-error" role="alert">${err}</p>` : ''}
    ${st.last_error === 'reconnect' ? `<button type="button" class="btn btn-primary mural-small-btn" data-notion-connect>${t('panel.notion.reconnect')}</button>` : ''}
    ${c.recent ? `<p class="notion-recent">${tp('panel.notion.recent', c.recent, { n: c.recent })}</p>` : ''}
    <p class="gcal-counts">${t('panel.notion.counts', { linked: c.linked || 0, approval: c.approval || 0, review: c.review || 0, waiting: c.no_account || 0 })}</p>
    <div class="gcal-actions">
      <button type="button" class="btn btn-secondary mural-small-btn" data-notion-sync>${t('panel.notion.syncNow')}</button>
      <button type="button" class="btn tinv-ghost mural-small-btn" data-notion-edit-columns>${t('panel.notion.editColumns')}</button>
      <button type="button" class="admin-select-link gcal-skip" data-notion-pick>${t('panel.notion.otherDatabase')}</button>
      <a href="#" class="admin-select-link" data-notion-disconnect>${t('panel.notion.disconnect')}</a>
    </div>
    ${notionReviewHTML()}`;
}

function notionBoxShellHTML(){
  return `<details class="profile-section gcal-box notion-box" id="admin-notion-box">
    <summary class="section-label">📝 ${t('panel.notion.title')} <span class="gcal-badge" data-notion-badge hidden></span></summary>
    <div class="gcal-body" data-notion-body></div>
  </details>`;
}

function notionRepaint(){
  const host = document.getElementById('admin-notion-box');
  const body = host && host.querySelector('[data-notion-body]');
  if (body) body.innerHTML = notionBoxHTML();
}

async function renderNotionBox(opts){
  const host = document.getElementById('admin-notion-box');
  if (!host) return;
  const body = host.querySelector('[data-notion-body]');
  if (!(opts && opts.quiet)) body.innerHTML = typeof loadingHTML === 'function' ? loadingHTML() : '…';
  await notionLoad();
  body.innerHTML = notionBoxHTML();
  const n = NOTION_STATE.items.filter(i => i.state === 'approval' || i.state === 'review').length;
  const badge = host.querySelector('[data-notion-badge]');
  if (badge){ badge.textContent = n ? String(n) : ''; badge.hidden = !n; }
  host.open = NOTION_STATE.open === null ? !!n : NOTION_STATE.open;
}

// Depois de um botão: a tela fica onde estava (mesma regra da caixa do Google).
async function notionAfter(promise, okMsg, doneEl){
  NOTION_STATE.busy = true;
  const y = window.scrollY;
  const res = await promise;
  NOTION_STATE.busy = false;
  const err = res && (res.error || (res.data && res.data.error));
  if (err){ showToast(t('panel.notion.errGeneric')); console.error('Notion:', err.message || err); }
  else if (okMsg) showToast(okMsg);
  if (doneEl && !err) doneEl.remove();
  await renderNotionBox({ quiet: true });
  if (!err && typeof refreshClassLogsListBox === 'function'){
    const lb = document.getElementById('admin-classlogs-list-box');
    if (lb && ADMIN_CLASS_LOGS_STATE.editingId == null) await refreshClassLogsListBox(lb);
  }
  window.scrollTo({ top: y, behavior: 'instant' });
  return res;
}

async function notionOpenColumns(databaseId, title){
  NOTION_STATE.busy = true;
  const res = await notionCall('columns', { database_id: databaseId });
  NOTION_STATE.busy = false;
  if (!res || !res.ok){ showToast(t(res && res.error === 'reconnect' ? 'panel.notion.errReconnect' : 'panel.notion.errGeneric')); return; }
  NOTION_STATE.setup = { step: 'columns', database_id: databaseId, title: res.title || title, properties: res.properties || [], suggested: res.suggested || {}, field_types: res.field_types || {} };
  notionRepaint();
}

function wireNotionBox(root){
  const host = root && root.querySelector('#admin-notion-box');
  if (!host || host.dataset.wired) return;
  host.dataset.wired = '1';
  host.addEventListener('toggle', () => { NOTION_STATE.open = host.open; });
  host.addEventListener('click', async (e) => {
    if (NOTION_STATE.busy) return;
    const tabBtn = e.target.closest('[data-notion-tab]');
    if (tabBtn){ NOTION_STATE.tab = tabBtn.dataset.notionTab; NOTION_STATE.shown = NOTION_PAGE; notionRepaint(); return; }
    if (e.target.closest('[data-notion-more]')){ NOTION_STATE.shown += NOTION_PAGE; notionRepaint(); return; }
    if (e.target.closest('[data-notion-connect]')){
      const ret = location.href.replace(/([?&])notion=[^&#]*&?/, '$1').replace(/[?&]$/, '');
      const res = await notionCall('start', { return_url: ret });
      if (res && res.url) location.href = res.url; else showToast(t('panel.notion.errGeneric'));
      return;
    }
    if (e.target.closest('[data-notion-pick]')){
      NOTION_STATE.busy = true;
      const res = await notionCall('databases');
      NOTION_STATE.busy = false;
      if (!res || !res.ok){ showToast(t(res && res.error === 'reconnect' ? 'panel.notion.errReconnect' : 'panel.notion.errGeneric')); return; }
      NOTION_STATE.setup = { step: 'databases', list: res.databases || [] };
      notionRepaint();
      return;
    }
    if (e.target.closest('[data-notion-edit-columns]')){
      const src = NOTION_STATE.status && NOTION_STATE.status.source;
      if (src) await notionOpenColumns(src.database_id, src.title);
      return;
    }
    const dbBtn = e.target.closest('[data-notion-db]');
    if (dbBtn){ await notionOpenColumns(dbBtn.dataset.notionDb, dbBtn.dataset.notionDbTitle); return; }
    if (e.target.closest('[data-notion-cancel-setup]')){ NOTION_STATE.setup = null; notionRepaint(); return; }
    const save = e.target.closest('[data-notion-save-source]');
    if (save){
      const map = {};
      host.querySelectorAll('[data-notion-col]').forEach(sel => { if (sel.value) map[sel.dataset.notionCol] = sel.value; });
      const errEl = host.querySelector('[data-notion-setup-error]');
      if (!map.date || !map.student){ errEl.textContent = t('panel.notion.needDateStudent'); errEl.hidden = false; return; }
      const from = (host.querySelector('[data-notion-from]') || {}).value;
      const res = await supabaseClient.rpc('notion_save_source', { p_database_id: save.dataset.notionSaveSource, p_title: save.dataset.notionDbTitle || null, p_column_map: map, p_import_from: from || null });
      if (res.error || (res.data && res.data.error)){ errEl.textContent = t('panel.notion.errSave'); errEl.hidden = false; return; }
      NOTION_STATE.setup = null;
      showToast(t('panel.notion.reading'));
      await notionAfter(notionCall('sync'), t('panel.notion.synced'));
      return;
    }
    if (e.target.closest('[data-notion-sync]')){ showToast(t('panel.notion.reading')); await notionAfter(notionCall('sync'), t('panel.notion.synced')); return; }
    if (e.target.closest('[data-notion-disconnect]')){
      e.preventDefault();
      if (!confirm(t('panel.notion.disconnectConfirm'))) return;
      await notionAfter(supabaseClient.rpc('notion_disconnect'), t('panel.notion.disconnected'));
      return;
    }
    if (e.target.closest('[data-notion-approve-all]')){
      await notionAfter(supabaseClient.rpc('notion_approve', { p_ids: null, p_approve: true }), t('panel.notion.approvedAll'));
      return;
    }
    const btn = e.target.closest('[data-notion-do]');
    const li = btn && btn.closest('[data-notion-item]');
    if (!li) return;
    const id = Number(li.dataset.notionItem);
    const act = btn.dataset.notionDo;
    if (act === 'approve' || act === 'discard'){
      await notionAfter(supabaseClient.rpc('notion_approve', { p_ids: [id], p_approve: act === 'approve' }), t(act === 'approve' ? 'panel.notion.approved' : 'panel.notion.discarded'), li);
    } else if (act === 'link' || act === 'ignore'){
      const name = li.dataset.notionName;
      let args = { p_name: name, p_action: 'ignore' };
      if (act === 'link'){
        const v = (li.querySelector('[data-notion-target]') || {}).value || '';
        if (!v){ showToast(t('panel.notion.pickFirst')); return; }
        const [kind, target, lang] = v.split('|');
        args = { p_name: name, p_action: kind, p_student: kind === 'student' ? target : null, p_classroom: kind === 'classroom' ? Number(target) : null,
          p_bank: kind === 'bank_student' ? target : null, p_lang: lang || null };
      }
      await notionAfter(supabaseClient.rpc('notion_link_name', args), t('panel.notion.linked'), li);
    }
  });
  // Volta do consentimento do Notion (?notion=ok|erro|cancelado): já abre a escolha do banco.
  const m = /[?&]notion=(ok|erro|cancelado)/.exec(location.search + location.hash);
  if (m){
    showToast(m[1] === 'ok' ? t('panel.notion.connectedToast') : m[1] === 'erro' ? t('panel.notion.errGeneric') : t('panel.notion.cancelledToast'));
    try { const u = new URL(location.href); u.searchParams.delete('notion'); history.replaceState(null, '', u.toString()); } catch {}
    NOTION_STATE.open = true; host.open = true;
  }
}
