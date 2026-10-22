// Banco de Revisão da professora (Professora > Cartões > Banco de Revisão). Migrations 081 a 085 e 096 (Turma).
// Lista de alunos do Banco (com ou sem conta), itens (pendente/aprovado/cortado), Récap, estatísticas do Modo aula,
// Visão geral e Manual. Aprovar item de aluno vinculado gera o cartão em "Cartões da professora" (RPC atômica).
// Modo aula (tela cheia): shared/review-bank-class.js. Modelo puro: shared/review-bank-model.js.
// Depende de: supabaseClient, CURRENT_USER, hasPermission (shared/permissions.js), fetchMyStudents (shared/roles.js),
// escapeHTML, t, todayStr (shared/srs.js), showToast, loadingHTML, openFlashcardPreviewFromRow (shared/flashcard-preview.js).

const RB = {
  ready: false, loading: false,
  students: [], settings: { auto_generate: true, manual_markdown: '' }, links: [], classrooms: [],
  summary: null, itemsBy: {}, reviewsBy: {}, recapBy: {}, reqBy: {},
  view: 'students', tab: 'aulas', cur: null, filter: 'pendente', type: '', q: '', limit: 60,
  editingId: null, adding: false, studentForm: null, manualEditing: false, importPlan: null, importOpen: false,
  overview: { ord: { k: 'pending', dir: -1 }, f: { lg: 'todos', att: '0', aula: '0', q: '' }, data: null, loading: false, at: null },
};
const rbt = (k, p) => t('rb.' + k, p);
const rbH = s => escapeHTML(s == null ? '' : s);
const rbLs = {
  get(k){ try { return localStorage.getItem('rb-' + k); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem('rb-' + k, v); } catch (e) {} },
};
const rbDateFmt = d => { if (!d) return ''; const [, m, dd] = String(d).split('-'); return `${dd}/${m}`; };
const rbDateFull = d => { if (!d) return ''; const [y, m, dd] = String(d).split('-'); return `${dd}/${m}/${y}`; };
const rbStudentById = id => RB.students.find(s => s.id === id) || null;
const rbLangLabel = k => rbt('lang.' + k);
const rbErrMsg = e => (e && e.message) ? e.message : String(e || '');

// ---------- dados ----------
async function rbFetchAll(makeQuery){
  const out = [];
  for (let from = 0; ; from += 1000){
    const { data, error } = await makeQuery().range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function rbLoadBase(){
  const [students, settingsRes, links, summaryItems] = await Promise.all([
    rbFetchAll(() => supabaseClient.from('review_bank_students').select('*').order('name')),
    supabaseClient.from('review_bank_settings').select('*').eq('teacher_id', CURRENT_USER.id).maybeSingle(),
    fetchMyStudents(),
    rbFetchAll(() => supabaseClient.from('review_bank_items').select('id,bank_student_id,status,teacher_flashcard_id').order('id')),
  ]);
  RB.students = students;
  RB.settings = Object.assign({ auto_generate: true, manual_markdown: '' }, settingsRes && settingsRes.data ? settingsRes.data : {});
  RB.links = (links || []).filter(l => l.status === 'active');
  RB.classrooms = await rbLoadClassrooms(students);
  RB.summary = {};
  summaryItems.forEach(i => {
    const s = RB.summary[i.bank_student_id] || (RB.summary[i.bank_student_id] = { total: 0, pendente: 0, aprovado: 0, cortado: 0 });
    s.total++; s[i.status]++;
  });
  RB.ready = true;
}
// Turmas da professora (as do Mural) nos idiomas dos alunos do Banco. Membros só com vínculo ativo (mural_list).
async function rbLoadClassrooms(students){
  const langs = [...new Set((students || []).map(s => s.language_app_key))];
  const out = [];
  await Promise.all(langs.map(async lang => {
    try {
      const { data } = await supabaseClient.rpc('mural_list', { p_lang: lang });
      const list = data && data.as_teacher && data.as_teacher.classrooms;
      (list || []).forEach(c => out.push({ id: c.id, name: c.name, language_app_key: lang, members: c.members || [] }));
    } catch (e) {}
  }));
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
const rbClassroomById = id => RB.classrooms.find(c => String(c.id) === String(id)) || null;
const rbPersonLabel = (sid, lang) => {
  const l = RB.links.find(x => x.student_id === sid && x.language_app_key === lang);
  return l ? (l.display_name || '@' + (l.username || '?')) : '?';
};

async function rbLoadStudentData(id){
  const [items, reviews, recaps] = await Promise.all([
    rbFetchAll(() => supabaseClient.from('review_bank_items').select('*').eq('bank_student_id', id).order('class_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })),
    supabaseClient.from('review_bank_reviews').select('*').eq('bank_student_id', id).order('created_at', { ascending: false }).limit(1000),
    supabaseClient.from('review_bank_recaps').select('*').eq('bank_student_id', id).order('class_date', { ascending: false }).limit(1),
  ]);
  RB.itemsBy[id] = items;
  // Pedidos abertos das alunas (114); falha (banco sem a migration) = sem pedidos.
  try {
    const rq = await supabaseClient.from('review_bank_requests').select('*').eq('bank_student_id', id).eq('status', 'pendente').order('created_at');
    RB.reqBy[id] = rq && !rq.error && rq.data ? rq.data : [];
  } catch (e) { RB.reqBy[id] = []; }
  RB.reviewsBy[id] = (reviews && reviews.data) || [];
  RB.recapBy[id] = (recaps && recaps.data && recaps.data[0]) || null;
  const s = RB.summary[id] = { total: items.length, pendente: 0, aprovado: 0, cortado: 0 };
  items.forEach(i => { s[i.status]++; });
}
function rbNextLesson(student){
  const today = todayStr();
  return (student.lesson_dates || []).filter(d => d >= today).sort()[0] || today;
}

// ---------- entrada ----------
async function renderReviewBankView(){
  const wrap = document.getElementById('admin-reviewbank-content');
  if (!wrap) return;
  if (!hasPermission('review_bank')){
    wrap.innerHTML = `<p class="profile-empty-note">${rbH(rbt('noPermission'))}</p>`;
    return;
  }
  if (!wrap.dataset.rbWired){ wrap.dataset.rbWired = '1'; rbWire(wrap); }
  if (!RB.ready){
    wrap.innerHTML = loadingHTML();
    try { await rbLoadBase(); }
    catch (e){ console.error('Banco de Revisão:', e); wrap.innerHTML = `<p class="profile-empty-note">${rbH(rbt('loadError'))}</p>`; return; }
    const saved = rbLs.get('cur');
    const active = RB.students.filter(s => s.status !== 'arquivado');
    RB.cur = (RB.students.find(s => s.id === saved) || active[0] || RB.students[0] || {}).id || null;
    RB.view = ['students', 'overview', 'manual'].includes(rbLs.get('view')) ? rbLs.get('view') : 'students';
    RB.tab = ['desempenho', 'aulas', 'itens'].includes(rbLs.get('student-tab')) ? rbLs.get('student-tab') : 'aulas';
    try { const f = JSON.parse(rbLs.get('ov-filters') || 'null'); if (f) Object.assign(RB.overview.f, f, { q: '' }); } catch (e) {}
  }
  if (RB.cur && !RB.itemsBy[RB.cur]) { try { await rbLoadStudentData(RB.cur); } catch (e) { console.error(e); } }
  rbRender();
}

function rbRender(){
  const wrap = document.getElementById('admin-reviewbank-content');
  if (!wrap) return;
  const tabs = [['students', 'tabStudents'], ['overview', 'tabOverview'], ['manual', 'tabManual']];
  wrap.innerHTML = `<div class="rb">
    <div class="rb-topline">
      <div class="leaderboard-tabs rb-tabs" role="tablist" style="margin:0;">${tabs.map(([v, k]) => `<button class="leaderboard-tab${RB.view === v ? ' active' : ''}" role="tab" aria-selected="${RB.view === v}" data-rb="view" data-v="${v}">${rbH(rbt(k))}</button>`).join('')}</div>
      <div class="rb-head-actions"><label class="rb-meta" style="display:inline-flex;gap:6px;align-items:center;"><input type="checkbox" id="rb-auto" ${RB.settings.auto_generate !== false ? 'checked' : ''}> ${rbH(rbt('autoLabel'))}</label></div>
    </div>
    <p class="rb-hint">${rbH(rbt('intro'))}</p>
    <div id="rb-main">${RB.view === 'students' ? rbStudentsHTML() : RB.view === 'overview' ? rbOverviewShell() : rbManualHTML()}</div>
  </div>`;
  if (RB.view === 'overview') rbLoadOverview(false);
  if (RB.view === 'students') rbAfterStudentsRender();
}

// ---------- aba Alunos ----------
function rbStudentsHTML(){
  if (!RB.students.length) return `<div class="rb-empty">${rbH(rbt('noStudents'))}<br><br><button class="rb-btn rb-btn-blue" data-rb="student-new">${rbH(rbt('addStudent'))}</button></div>${RB.studentForm ? rbStudentFormHTML() : ''}${rbImportHTML()}`;
  const groups = ['frances', 'portugues', 'mandarim'].map(lg => ({ lg, list: RB.students.filter(s => s.language_app_key === lg).sort((a, b) => (a.status === 'arquivado') - (b.status === 'arquivado') || a.name.localeCompare(b.name)) })).filter(g => g.list.length);
  const roster = groups.map(g => `<div class="rb-group"><span class="rb-group-lbl">${rbH(rbLangLabel(g.lg))}</span>${g.list.map(s => {
    const pend = (RB.summary[s.id] || {}).pendente || 0;
    return `<button class="rb-stu${s.status === 'arquivado' ? ' is-archived' : ''}" data-rb="select" data-id="${rbH(s.id)}" aria-pressed="${RB.cur === s.id}">${rbH(s.name)}${pend ? `<span class="rb-pend" title="${rbH(rbt('toCheck'))}">${pend}</span>` : ''}</button>`;
  }).join('')}</div>`).join('');
  const s = rbStudentById(RB.cur);
  return `<nav class="rb-roster" aria-label="${rbH(rbt('studentsAria'))}">${roster}<div><button class="rb-link" data-rb="student-new">${rbH(rbt('addStudent'))}</button></div></nav>
    ${RB.studentForm ? rbStudentFormHTML() : ''}
    <div id="rb-student">${s ? rbStudentPanelHTML(s) : ''}</div>${rbImportHTML()}`;
}

function rbImportHTML(){
  return `<details class="rb-import rb-newbox" id="rb-import"${RB.importOpen ? ' open' : ''}><summary class="rb-h" style="cursor:pointer;">${rbH(rbt('imp.title'))}</summary>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
      <p class="rb-hint">${rbH(rbt('imp.hint'))}</p>
      <input type="file" id="rb-import-file" accept="application/json,.json" aria-label="${rbH(rbt('imp.title'))}">
      <div id="rb-import-box" aria-live="polite">${RB.importPlan ? rbImportBoxHTML() : ''}</div>
    </div></details>`;
}
function rbImportBoxHTML(){
  const P = RB.importPlan;
  if (!P) return '';
  if (!P.ok) return `<p class="rb-wrong" style="margin:0;">${rbH(rbt('imp.err.' + P.error))}</p>`;
  const m = P.summary;
  return `<div class="rb-counts" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));">${[[m.students, 'imp.cStudents'], [m.items, 'imp.cItems'], [m.pending, 'imp.cPending'], [m.recaps, 'imp.cRecaps'], [m.reviews, 'imp.cReviews']].map(([v, k]) => `<div class="rb-count"><b>${v}</b><span>${rbH(rbt(k))}</span></div>`).join('')}</div>
    ${P.warnings.length ? `<p class="rb-hint">${rbH(rbt('imp.warn', { n: P.warnings.length }))}</p>` : ''}
    <p class="rb-hint">${rbH(rbt('imp.note'))}</p>
    ${m.manual ? `<label class="rb-check" style="display:flex;gap:8px;align-items:center;font-weight:700;font-size:14px;"><input type="checkbox" id="rb-import-manual"> ${rbH(rbt('imp.manual'))}</label>` : ''}
    <div class="rb-edit-actions" style="display:flex;gap:8px;align-items:center;"><button class="rb-btn rb-btn-blue" data-rb="import-run">${rbH(rbt('imp.run'))}</button><span class="rb-meta" id="rb-import-msg" role="status" aria-live="polite"></span></div>`;
}
async function rbImportRead(file){
  RB.importOpen = true;
  let text = '';
  try { text = await file.text(); } catch (e) { text = ''; }
  RB.importPlan = rbiParse(text);
  const box = document.getElementById('rb-import-box'); if (box) box.innerHTML = rbImportBoxHTML();
}
async function rbImportRunNow(btn){
  const P = RB.importPlan; if (!P || !P.ok) return;
  const msg = document.getElementById('rb-import-msg'), manual = document.getElementById('rb-import-manual');
  btn.disabled = true;
  const r = await rbiRun(P.data, { replaceManual: !!(manual && manual.checked) }, (m) => { if (msg) msg.textContent = m; });
  if (!r.ok){ if (msg) msg.textContent = rbt('imp.errRun') + ' ' + r.error; btn.disabled = false; return; }
  const keep = RB.cur;
  await rbLoadBase();
  RB.itemsBy = {}; RB.reviewsBy = {}; RB.recapBy = {}; RB.overview.data = null;
  RB.cur = RB.students.find(x => x.id === keep) ? keep : ((RB.students.find(x => x.status !== 'arquivado') || RB.students[0] || {}).id || null);
  if (RB.cur) await rbLoadStudentData(RB.cur);
  RB.importPlan = null; RB.importOpen = false;
  rbRender();
  showToast(rbt('imp.done', { s: r.counts.students, i: r.counts.items }));
}

function rbLinkLineHTML(s){
  if (s.classroom_id){
    const c = rbClassroomById(s.classroom_id);
    const names = c ? c.members.map(m => rbPersonLabel(m, s.language_app_key)) : [];
    const who = c ? `${rbH(c.name)} <span class="rb-meta">${rbH(names.length ? rbt('classMembers', { n: names.length, names: names.join(', ') }) : rbt('classEmpty'))}</span>` : rbH(rbt('linkedClass'));
    return `<span class="rb-pill is-ok">${rbH(rbt('linkedClass'))}</span> <span>${who}</span> <button class="rb-link" data-rb="unlink" data-id="${rbH(s.id)}">${rbH(rbt('unlink'))}</button>`;
  }
  if (s.linked_student_id){
    const l = RB.links.find(x => x.student_id === s.linked_student_id && x.language_app_key === s.language_app_key);
    const who = l ? (l.display_name ? `${rbH(l.display_name)} (@${rbH(l.username || '?')})` : `@${rbH(l.username || '?')}`) : rbH(rbt('linkedAccount'));
    return `<span class="rb-pill is-ok">${rbH(rbt('linked'))}</span> <span>${who}</span> <button class="rb-link" data-rb="unlink" data-id="${rbH(s.id)}">${rbH(rbt('unlink'))}</button>`;
  }
  const taken = new Set(RB.students.filter(x => x.linked_student_id && x.language_app_key === s.language_app_key).map(x => x.linked_student_id));
  const cands = RB.links.filter(l => l.language_app_key === s.language_app_key && !taken.has(l.student_id));
  const pick = cands.length
    ? `<select id="rb-link-pick" aria-label="${rbH(rbt('linkPick'))}">${cands.map(l => `<option value="${rbH(l.student_id)}">${l.display_name ? rbH(l.display_name) + ' ' : ''}@${rbH(l.username || '?')}</option>`).join('')}</select> <button class="rb-btn" data-rb="link" data-id="${rbH(s.id)}">${rbH(rbt('link'))}</button>`
    : `<span>${rbH(rbt('noLinkable'))}</span>`;
  const rooms = RB.classrooms.filter(c => c.language_app_key === s.language_app_key);
  const classPick = rooms.length
    ? `<select id="rb-class-pick" aria-label="${rbH(rbt('classPick'))}">${rooms.map(c => `<option value="${rbH(c.id)}">${rbH(c.name)} (${c.members.length})</option>`).join('')}</select> <button class="rb-btn" data-rb="link-class" data-id="${rbH(s.id)}">${rbH(rbt('linkClass'))}</button>`
    : `<span class="rb-meta">${rbH(rbt('noClassrooms'))}</span>`;
  return `<span class="rb-pill">${rbH(rbt('noAccount'))}</span> ${pick}<span class="rb-linkline-or">${rbH(rbt('orClass'))}</span>${classPick}`;
}

function rbReadyItems(s){
  const items = RB.itemsBy[s.id] || [];
  return items.filter(i => rbReadyToDeliver(i, s, RB.settings));
}

function rbStudentPanelHTML(s){
  const sum = RB.summary[s.id] || { total: 0, pendente: 0, aprovado: 0, cortado: 0 };
  const ready = rbReadyItems(s);
  const counts = [[sum.total, 'cItems'], [sum.aprovado, 'cApproved'], [sum.pendente, 'cToCheck'], [sum.cortado, 'cCut']];
  return `<div style="display:flex;flex-direction:column;gap:14px;">
    <div class="rb-head"><h3>${rbH(s.name)} <span class="rb-pill">${rbH(rbLangLabel(s.language_app_key))}${s.status === 'arquivado' ? ' · ' + rbH(rbt('archived')) : ''}</span></h3>
      <div class="rb-head-actions"><button class="rb-link" data-rb="student-edit" data-id="${rbH(s.id)}">${rbH(rbt('editStudent'))}</button><button class="rb-btn rb-btn-blue" data-rb="class" data-id="${rbH(s.id)}">${rbH(rbt('openClass'))}</button></div></div>
    <div class="rb-linkline">${rbLinkLineHTML(s)}</div>
    ${ready.length && rbHasTarget(s) ? `<div class="rb-ready"><span>${rbH(rbt('readyBanner', { n: ready.length }))}</span><button class="rb-btn rb-btn-blue" data-rb="generate-ready" data-id="${rbH(s.id)}">${rbH(rbt('generateReady'))}</button></div>` : ''}
    <div class="rb-counts" aria-live="polite">${counts.map(([v, k]) => `<div class="rb-count"><b>${v}</b><span>${rbH(rbt(k))}</span></div>`).join('')}</div>
    <div class="rb-tabs" role="tablist" aria-label="${rbH(rbt('tabsAria'))}">${['desempenho', 'aulas', 'itens'].map(k => `<button class="rb-fchip" role="tab" data-rb="tab" data-t="${k}" aria-selected="${RB.tab === k}" aria-pressed="${RB.tab === k}">${rbH(rbt('tab.' + k))}</button>`).join('')}</div>
    ${RB.tab === 'desempenho' ? rbStatsHTML(s) : ''}
    ${RB.tab === 'aulas' ? rbRecapHTML(s) + rbLessonsHTML(s) : ''}
    ${RB.tab !== 'itens' ? '' : `<section style="display:flex;flex-direction:column;gap:12px;">
      <div class="rb-toolbar" role="group" aria-label="${rbH(rbt('filterAria'))}">
        ${['pendente', 'aprovado', 'cortado', 'todos'].map(f => `<button class="rb-fchip" data-rb="filter" data-f="${f}" aria-pressed="${RB.filter === f}">${rbH(rbt('f.' + f))}</button>`).join('')}
        <button class="rb-btn rb-btn-blue rb-new" data-rb="item-new">${rbH(rbt('newItem'))}</button>
      </div>
      <div class="rb-toolbar">
        <input type="search" id="rb-search" placeholder="${rbH(rbt('search'))}" aria-label="${rbH(rbt('search'))}" value="${rbH(RB.q)}">
        <select id="rb-type" aria-label="${rbH(rbt('typeAria'))}"><option value="">${rbH(rbt('allTypes'))}</option>${RB_ITEM_TYPES.map(k => `<option value="${k}"${RB.type === k ? ' selected' : ''}>${rbH(rbt('type.' + k))}</option>`).join('')}</select>
      </div>
      <div id="rb-newbox">${RB.adding ? rbItemFormHTML(null, s) : ''}</div>
      <div class="rb-list" id="rb-list">${rbListHTML(s)}</div>
    </section>`}</div>`;
}

// Aba Aulas: os itens do aluno agrupados pela data da aula (a mais recente aberta), com os mesmos botões da lista.
function rbLessonsHTML(s){
  const items = RB.itemsBy[s.id] || [];
  if (!items.length) return `<div class="rb-empty">${rbH(rbt('emptyStudent'))}</div>`;
  const groups = {};
  items.forEach(i => { const d = i.class_date || ''; (groups[d] = groups[d] || []).push(i); });
  const dates = Object.keys(groups).sort((x, y) => (y || '').localeCompare(x || ''));
  return `<div class="rb-lessons">${dates.map((d, k) => {
    const g = groups[d], n = st => g.filter(i => i.status === st).length;
    const pill = (v, key, cls) => v ? `<span class="rb-pill${cls ? ' ' + cls : ''}">${rbH(rbt(key))} ${v}</span>` : '';
    return `<details class="rb-lesson"${k === 0 ? ' open' : ''}><summary><strong>${d ? rbH(rbt('lessonOf', { d: rbDateFmt(d) })) : rbH(rbt('lessonNoDate'))}</strong>
      <span class="rb-lesson-pills">${pill(n('aprovado'), 'cApproved', 'is-ok')}${pill(n('pendente'), 'cToCheck', 'is-pend')}${pill(n('cortado'), 'cCut', '')}</span></summary>
      <div class="rb-list">${g.map(i => rbItemHTML(i, s)).join('')}</div></details>`;
  }).join('')}</div>`;
}

function rbFilteredItems(s){
  const q = RB.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return (RB.itemsBy[s.id] || []).filter(i =>
    (RB.filter === 'todos' || i.status === RB.filter) && (!RB.type || i.item_type === RB.type) &&
    (!q || [i.question, i.answer, i.wrong_form, i.explanation].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
}
function rbListHTML(s){
  const all = rbFilteredItems(s);
  if (!all.length) return `<div class="rb-empty">${rbH((RB.itemsBy[s.id] || []).length ? rbt('emptyFilter') : rbt('emptyStudent'))}</div>`;
  const shown = all.slice(0, RB.limit);
  return shown.map(i => rbItemHTML(i, s)).join('') + (all.length > shown.length ? `<button class="rb-btn" data-rb="more" style="align-self:center;">${rbH(rbt('more'))}</button>` : '');
}

function rbItemHTML(i, s){
  if (RB.editingId === i.id) return `<article class="rb-item" data-item="${rbH(i.id)}">${rbItemFormHTML(i, s)}</article>`;
  const prop = i.proposal && typeof i.proposal === 'object' && Object.keys(i.proposal).length ? i.proposal : null;
  return `<article class="rb-item${i.status === 'cortado' ? ' is-cut' : ''}" data-item="${rbH(i.id)}">
    <div class="rb-body">
      <div class="rb-tags"><span class="rb-tag">${rbH(rbt('type.' + i.item_type))}</span>
        ${i.class_date ? `<span class="rb-meta">${rbH(rbt('classOf', { d: rbDateFmt(i.class_date) }))}</span>` : ''}
        ${i.status === 'pendente' ? `<span class="rb-tag is-pend">${rbH(rbt('st.pendente'))}</span>` : i.status === 'cortado' ? `<span class="rb-tag">${rbH(rbt('st.cortado'))}</span>` : ''}
        ${i.sensitive ? `<span class="rb-tag is-pend" title="${rbH(rbt('sensitiveHint'))}">${rbH(rbt('sensitiveTag'))}</span>` : ''}
        ${i.teacher_flashcard_id ? `<span class="rb-tag is-card" title="${rbH(rbt('cardDelivered'))}">${rbH(rbt('cardTag'))}</span>` : ''}</div>
      <div class="rb-q">${rbH(i.question)}</div>
      ${i.wrong_form ? `<div class="rb-wrong">${rbH(i.wrong_form)}</div>` : ''}
      <div class="rb-a">${rbH(i.answer)}</div>
      ${i.explanation ? `<div class="rb-obs">${rbH(i.explanation)}</div>` : ''}
      ${i.check_note ? `<div class="rb-doubt"><strong>${rbH(rbt('toCheckColon'))}</strong> ${rbH(i.check_note)}</div>` : ''}
      ${prop ? rbProposalHTML(i, prop) : ''}
      ${rbRequestsHTML(i)}
    </div>
    <div class="rb-actions">
      ${i.status !== 'aprovado' ? `<button class="rb-btn rb-btn-ok" data-rb="approve" data-id="${rbH(i.id)}">${rbH(rbt('approve'))}</button>` : `<button class="rb-btn" data-rb="unapprove" data-id="${rbH(i.id)}">${rbH(rbt('backToPending'))}</button>`}
      ${i.status !== 'cortado' ? `<button class="rb-btn rb-btn-cut" data-rb="cut" data-id="${rbH(i.id)}">${rbH(rbt('cut'))}</button>` : `<button class="rb-btn" data-rb="unapprove" data-id="${rbH(i.id)}">${rbH(rbt('restore'))}</button>`}
      <button class="rb-btn" data-rb="item-edit" data-id="${rbH(i.id)}">${rbH(rbt('edit'))}</button>
      <button class="rb-btn" data-rb="preview" data-id="${rbH(i.id)}">${rbH(rbt('preview'))}</button>
    </div></article>`;
}

// Pedidos das alunas (114): cada um com as ações certas para o tipo. Cortar vale para todos; recusar devolve o cartão dela.
function rbRequestsOf(i){ return (RB.reqBy[i.bank_student_id] || []).filter(r => r.item_id === i.id); }
function rbRequestsHTML(i){
  return rbRequestsOf(i).map(r => {
    const who = rbPersonLabel(r.requester_id, i.language_app_key);
    const sug = r.kind === 'corrigir' && r.proposal ? `<div class="rb-req-sug"><strong>${rbH(rbt('reqSuggestion'))}</strong> ${r.proposal.question ? rbH(r.proposal.question) : ''}${r.proposal.question && r.proposal.answer ? ' → ' : ''}${r.proposal.answer ? rbH(r.proposal.answer) : ''}${r.proposal.note ? ` <span class="rb-obs">${rbH(r.proposal.note)}</span>` : ''}</div>` : '';
    const btn = (a, cls, k) => `<button class="rb-btn ${cls}" data-rb="${a}" data-id="${rbH(r.id)}" data-item="${rbH(i.id)}">${rbH(rbt(k))}</button>`;
    const acts = r.kind === 'cortar' ? btn('req-cut', 'rb-btn-cut', 'reqApproveCut') + btn('req-decline', '', 'reqDecline') + btn('req-edit', '', 'edit')
      : r.kind === 'corrigir' ? btn('req-apply', 'rb-btn-ok', 'reqApplySug') + btn('req-edit', '', 'reqEditApprove') + btn('req-decline', '', 'reqDecline')
      : btn('req-decline', 'rb-btn-ok', 'reqKeep') + btn('req-edit', '', 'edit') + btn('req-cut', 'rb-btn-cut', 'cut');
    return `<div class="rb-req" data-req="${rbH(r.id)}"><strong>${rbH(rbt('reqTitle'))}</strong> <span>${rbH(rbt('reqKind.' + r.kind, { n: who }))}</span>
      ${r.reason ? `<div class="rb-req-why"><strong>${rbH(rbt('reqReason'))}</strong> ${rbH(r.reason)}</div>` : ''}${sug}
      <div class="rb-actions" style="flex-direction:row;flex-wrap:wrap;">${acts}</div></div>`;
  }).join('');
}
async function rbDecideRequest(reqId, decision){
  const { data, error } = await supabaseClient.rpc('decide_bank_request', { p_request_id: reqId, p_decision: decision });
  if (error){ rbToastErr(error); return false; }
  return data || true;
}
// Depois de salvar uma correção no item, os pedidos de correção e de "parece errado" dele ficam resolvidos.
async function rbResolveRequestsFor(item){
  for (const r of rbRequestsOf(item).filter(x => x.kind !== 'cortar')) await supabaseClient.rpc('decide_bank_request', { p_request_id: r.id, p_decision: 'resolver' });
}
async function rbRequestApply(reqId, itemId){
  const item = rbFindItem(itemId), s = item && rbStudentById(item.bank_student_id);
  const r = (RB.reqBy[item && item.bank_student_id] || []).find(x => x.id === reqId);
  if (!item || !s || !r || !r.proposal) return;
  const cols = { question: r.proposal.question || item.question, answer: r.proposal.answer || item.answer, explanation: r.proposal.note || item.explanation || null, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseClient.from('review_bank_items').update(cols).eq('id', item.id).select().maybeSingle();
  if (error) return rbToastErr(error);
  if (data && data.teacher_flashcard_id) await rbSyncDeliveredCard(data, s, false);
  await rbDecideRequest(reqId, 'resolver');
  await rbReloadCur(); rbRender(); showToast(rbt('reqApplied'));
}

function rbProposalHTML(i, p){
  const cards = Array.isArray(p.cartoes) ? p.cartoes : [];
  return `<div class="rb-prop"><strong>${rbH(rbt('proposal'))}</strong>${p.resumo ? `<span>${rbH(p.resumo)}</span>` : ''}
    ${cards.length ? `<ol>${cards.map(c => `<li><strong>${rbH(c.q)}</strong> → ${rbH(c.a)}${c.errado ? ` <span class="rb-wrong">${rbH(c.errado)}</span>` : ''}${c.nota ? ` <span class="rb-obs">${rbH(c.nota)}</span>` : ''}</li>`).join('')}</ol>` : ''}
    <div class="rb-actions" style="flex-direction:row;flex-wrap:wrap;"><button class="rb-btn rb-btn-blue" data-rb="proposal-apply" data-id="${rbH(i.id)}">${rbH(rbt('proposalApply'))}</button><button class="rb-btn" data-rb="proposal-dismiss" data-id="${rbH(i.id)}">${rbH(rbt('proposalDismiss'))}</button></div></div>`;
}

function rbItemFormHTML(item, s){
  const i = item || { item_type: 'vocabulario', class_date: todayStr(), question: '', answer: '', wrong_form: '', gap_word: '', explanation: '', check_note: '', status: 'pendente' };
  const delivered = !!(item && item.teacher_flashcard_id);
  return `<div class="rb-edit" data-form="item" data-id="${rbH(item ? item.id : '')}">
    <label>${rbH(rbt('fType'))}<select data-f="item_type">${RB_ITEM_TYPES.map(k => `<option value="${k}"${i.item_type === k ? ' selected' : ''}>${rbH(rbt('type.' + k))}</option>`).join('')}</select></label>
    <label>${rbH(rbt('fDate'))}<input type="date" data-f="class_date" value="${rbH(i.class_date || '')}"></label>
    <label class="rb-wide">${rbH(rbt('fQuestion'))}<textarea rows="2" data-f="question">${rbH(i.question)}</textarea></label>
    <label class="rb-wide">${rbH(rbt('fAnswer'))}<textarea rows="2" data-f="answer">${rbH(i.answer)}</textarea></label>
    <label data-only="erro" ${i.item_type === 'erro' ? '' : 'hidden'}>${rbH(rbt('fWrong'))}<input type="text" data-f="wrong_form" value="${rbH(i.wrong_form)}"></label>
    <label>${rbH(rbt('fGap'))}<input type="text" data-f="gap_word" value="${rbH(i.gap_word)}"></label>
    <label class="rb-wide">${rbH(rbt('fObservation'))}<textarea rows="2" data-f="explanation">${rbH(i.explanation)}</textarea></label>
    <label class="rb-wide">${rbH(rbt('fCheck'))}<input type="text" data-f="check_note" value="${rbH(i.check_note)}"></label>
    <label class="rb-wide rb-check"><input type="checkbox" data-f="sensitive"${i.sensitive ? ' checked' : ''}> ${rbH(rbt('fSensitive'))}</label>
    ${delivered ? `<label class="rb-wide rb-check"><input type="checkbox" data-f="reset_progress"> ${rbH(rbt('fReset'))}</label><p class="rb-hint rb-wide">${rbH(rbt('fResetHint'))}</p>` : ''}
    <div class="rb-edit-actions">
      ${(!item || item.status === 'pendente') ? `<button class="rb-btn rb-btn-ok" data-rb="item-save" data-approve="1">${rbH(rbt('saveApprove'))}</button>` : ''}
      <button class="rb-btn${(item && item.status !== 'pendente') ? ' rb-btn-blue' : ''}" data-rb="item-save">${rbH(rbt('save'))}</button>
      <button class="rb-btn" data-rb="item-cancel">${rbH(rbt('cancel'))}</button>
      <span class="rb-meta" id="rb-form-msg" role="status" aria-live="polite"></span>
    </div></div>`;
}

function rbStatsHTML(s){
  const st = rbStatsFromReviews(RB.reviewsBy[s.id] || []);
  const open = rbLs.get('stats-open') === '1';
  const label = k => (RB_REASONS.includes(k) ? rbt('reason.' + k) : k === 'sem' ? rbt('noReason') : k);
  let body;
  if (!st.total) body = `<p class="rb-meta" style="margin:0;">${rbH(rbt('statsEmpty'))}</p>`;
  else {
    const hb = (list, lab) => { const mx = Math.max(...list.map(x => x[1]), 1); return `<div class="rb-hbars">${list.map(([k, v]) => `<div class="rb-hb"><span class="t">${rbH(lab(k))}</span><span class="b"><i style="width:${Math.max(4, v * 100 / mx)}%"></i></span><span class="v">${v}</span></div>`).join('')}</div>`; };
    const wrongs = (RB.reviewsBy[s.id] || []).filter(r => r.outcome === 'errou');
    const byType = {}; const items = RB.itemsBy[s.id] || [];
    wrongs.forEach(r => { const it = items.find(x => x.id === r.item_id); if (it) byType[it.item_type] = (byType[it.item_type] || 0) + 1; });
    const typeList = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const perItem = {}; wrongs.forEach(r => { perItem[r.item_id] = (perItem[r.item_id] || 0) + 1; });
    const top = Object.entries(perItem).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => [items.find(x => x.id === id), n]).filter(x => x[0]);
    body = `<div class="rb-tiles">
      <div class="rb-tile"><b>${st.total}</b><span>${rbH(rbt('sTotal'))}</span></div><div class="rb-tile"><b>${st.days}</b><span>${rbH(rbt('sDays'))}</span></div><div class="rb-tile"><b>${st.inClass}</b><span>${rbH(rbt('sInClass'))}</span></div><div class="rb-tile"><b>${st.atHome}</b><span>${rbH(rbt('sAtHome'))}</span></div>
      <div class="rb-tile is-ok"><b>${st.okPct}%</b><span>${rbH(rbt('sOk'))}</span></div><div class="rb-tile"><b>${st.helpPct}%</b><span>${rbH(rbt('sHelp'))}</span></div><div class="rb-tile is-bad"><b>${st.wrongPct}%</b><span>${rbH(rbt('sWrong'))}</span></div></div>
      <p class="rb-meta rb-stats-note">${rbH(rbt('sNote'))}</p>
      <div class="rb-grid">
        <div><h5>${rbH(rbt('sByClass'))}</h5><div class="rb-cols">${st.byDay.map(d => `<div class="c" title="${rbH(rbt('sTip', { d: rbDateFmt(d.date), a: d.ok, h: d.help, e: d.wrong }))}"><em>${d.pct}%</em><i style="height:${Math.max(2, d.pct)}%"></i></div>`).join('')}</div><div class="rb-cols-x">${st.byDay.map(d => `<span>${rbDateFmt(d.date)}</span>`).join('')}</div></div>
        <div><h5>${rbH(rbt('sByType'))}</h5>${typeList.length ? hb(typeList, k => rbt('type.' + k)) : `<p class="rb-meta">${rbH(rbt('sNoMiss'))}</p>`}</div>
        <div><h5>${rbH(rbt('sReasons'))}</h5>${st.byReason.length ? hb(st.byReason, label) : `<p class="rb-meta">${rbH(rbt('sNoReason'))}</p>`}</div></div>
      <div><h5 class="rb-h" style="font-size:13px;color:var(--ink-soft);margin-bottom:8px;">${rbH(rbt('sTop'))}</h5>${top.length ? `<div class="rb-list">${top.map(([it, n]) => `<div class="rb-enditem"><span class="rb-q">${it.wrong_form ? '✕ ' + rbH(it.wrong_form) : rbH(it.question)}</span> <strong>×${n}</strong><br><span class="rb-a" style="font-size:14px;">${rbH(it.answer)}</span></div>`).join('')}</div>` : `<p class="rb-meta">${rbH(rbt('sNoMiss'))}</p>`}</div>`;
  }
  return `<details class="rb-stats" id="rb-stats"${open ? ' open' : ''}><summary><span>${rbH(rbt('sTitle'))}</span><span class="rb-meta">${st.total ? rbH(rbt('sHint')) : ''}</span></summary><div class="rb-stats-body">${body}</div></details>`;
}

function rbRecapHTML(s){
  const rc = RB.recapBy[s.id], items = RB.itemsBy[s.id] || [];
  const lessonDate = rbNextLesson(s);
  const list = rc ? (rc.item_ids || []).map(id => items.find(x => x.id === id)).filter(Boolean) : [];
  const head = rc ? rbt('recapTitle', { d: rbDateFmt(rc.class_date) }) : rbt('recapNext');
  return `<section class="rb-recap" aria-label="${rbH(head)}"><h4>${rbH(head)}</h4>
    ${list.length ? `<ol>${list.map(i => { const p = rbPromptText(i, rbPromptLabels()); return `<li><span class="rb-q">${p.prefix ? rbH(p.prefix) + ' ' : ''}${p.wrong ? '✕ ' : ''}${rbH(p.text)}</span><br><span class="rb-a">${rbH(i.answer)}</span></li>`; }).join('')}</ol><p class="rb-hint">${rbH(rbt('recapHint'))}</p>` : `<p class="rb-hint" style="margin:0;">${rbH(rbt('recapEmpty'))}</p>`}
    <div class="rb-recap-actions"><button class="rb-btn rb-btn-blue" data-rb="recap-make" data-id="${rbH(s.id)}">${rbH(rc ? rbt('recapRemake', { d: rbDateFmt(lessonDate) }) : rbt('recapMake', { d: rbDateFmt(lessonDate) }))}</button>
      ${list.length ? `<button class="rb-btn" data-rb="recap-print" data-id="${rbH(s.id)}" data-answers="1">${rbH(rbt('printAnswers'))}</button><button class="rb-btn" data-rb="recap-print" data-id="${rbH(s.id)}">${rbH(rbt('printStudent'))}</button>` : ''}</div></section>`;
}
function rbPromptLabels(){ return { say: rbt('say'), fix: rbt('fix') }; }

function rbAfterStudentsRender(){
  const det = document.getElementById('rb-stats');
  if (det) det.addEventListener('toggle', () => rbLs.set('stats-open', det.open ? '1' : '0'));
}

// ---------- formulários do aluno do Banco ----------
function rbStudentFormHTML(){
  const f = RB.studentForm, edit = !!f.id;
  return `<div class="rb-newbox rb-edit" data-form="student">
    <label>${rbH(rbt('sfName'))}<input type="text" data-f="name" value="${rbH(f.name)}"></label>
    <label>${rbH(rbt('sfLang'))}<select data-f="language_app_key" ${edit && (RB.itemsBy[f.id] || []).length ? 'disabled' : ''}>${['frances', 'portugues', 'mandarim'].map(k => `<option value="${k}"${f.language_app_key === k ? ' selected' : ''}>${rbH(rbLangLabel(k))}</option>`).join('')}</select></label>
    <label>${rbH(rbt('sfRef'))}<select data-f="reference_language">${['pt', 'en', 'fr'].map(k => `<option value="${k}"${f.reference_language === k ? ' selected' : ''}>${rbH(rbt('ref.' + k))}</option>`).join('')}</select></label>
    ${edit ? `<label>${rbH(rbt('sfStatus'))}<select data-f="status"><option value="ativo"${f.status === 'ativo' ? ' selected' : ''}>${rbH(rbt('active'))}</option><option value="arquivado"${f.status === 'arquivado' ? ' selected' : ''}>${rbH(rbt('archived'))}</option></select></label>` : ''}
    <label class="rb-wide rb-check"><input type="checkbox" data-f="agent_managed"${f.agent_managed ? ' checked' : ''}> <span><b>${rbH(rbt('sfAgent'))}</b><br><span class="rb-meta">${rbH(rbt('sfAgentHint'))}</span></span></label>
    <div class="rb-wide"><span class="rb-meta" style="font-weight:800;">${rbH(rbt('sfDates'))}</span>
      <div class="rb-datechips" id="rb-datechips">${rbDateChipsHTML(f.lesson_dates)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:6px;"><input type="date" id="rb-date-add" aria-label="${rbH(rbt('sfDateAdd'))}"><button class="rb-btn" data-rb="date-add" type="button">${rbH(rbt('sfDateAdd'))}</button></div></div>
    <div class="rb-edit-actions"><button class="rb-btn rb-btn-blue" data-rb="student-save">${rbH(rbt('save'))}</button><button class="rb-btn" data-rb="student-cancel">${rbH(rbt('cancel'))}</button><span class="rb-meta" id="rb-form-msg" role="status" aria-live="polite"></span></div></div>`;
}
function rbDateChipsHTML(dates){
  const d = (dates || []).slice().sort();
  return d.length ? d.map(x => `<span class="rb-datechip">${rbH(rbDateFull(x))}<button type="button" data-rb="date-del" data-d="${rbH(x)}" aria-label="${rbH(rbt('sfDateDel'))}">×</button></span>`).join('') : `<span class="rb-meta">${rbH(rbt('sfNoDates'))}</span>`;
}

// ---------- ações ----------
function rbToastErr(e){ showToast(rbt('error') + ' ' + rbErrMsg(e)); }
function rbFindItem(id){ for (const k of Object.keys(RB.itemsBy)){ const f = RB.itemsBy[k].find(i => i.id === id); if (f) return f; } return null; }

async function rbApproveItem(item){
  const s = rbStudentById(item.bank_student_id);
  if (!s) return { ok: false, error: 'student' };
  if (!rbHasTarget(s)){
    const { error } = await supabaseClient.rpc('set_review_bank_item_status', { p_item_id: item.id, p_status: 'aprovado' });
    return error ? { ok: false, error: error.message } : { ok: true, card: false };
  }
  const card = rbBuildCard(item, s);
  if (!card.ok) return { ok: false, error: card.error };
  const { error } = await supabaseClient.rpc('approve_review_bank_item', { p_item_id: item.id, p_front: card.front, p_back_trans: card.back_trans, p_fields: card.fields, p_mode: card.mode, p_tags: card.tags, p_note: card.note });
  if (error && /no_recipients/.test(error.message || '')) return { ok: false, error: rbt('noRecipients') };
  return error ? { ok: false, error: error.message } : { ok: true, card: true };
}

async function rbReloadCur(){ if (RB.cur) await rbLoadStudentData(RB.cur); }

// Atualiza o cartão já entregue com o conteúdo corrigido do item, nas cópias de TODOS (aluno de Turma: uma por membro;
// RPC sync_review_bank_item_cards, 096). Mesmo id (corrige sem zerar o progresso); só muda de tipo de cartão ou
// "reiniciar progresso" marcado sobem a revisão (cartão novo, FSRS do zero). Ids dos campos vêm do cartão de referência.
async function rbSyncDeliveredCard(item, s, resetProgress){
  if (!item.teacher_flashcard_id || !s || s.language_app_key === 'mandarim') return { ok: true, skipped: true };
  const card = rbBuildCard(item, s);
  if (!card.ok) return { ok: false, error: card.error };
  const { data: row, error: e1 } = await supabaseClient.from('teacher_flashcards').select('id,fields,card_generation_mode,revision').eq('id', item.teacher_flashcard_id).maybeSingle();
  if (e1 || !row) return { ok: false, error: e1 ? e1.message : 'card' };
  const oldIds = (row.fields || []).map(f => f.id);
  const fields = card.fields.map((f, k) => (oldIds.length === card.fields.length ? Object.assign({}, f, { id: oldIds[k] }) : f));
  const modeChanged = row.card_generation_mode !== card.mode;
  const bump = modeChanged || !!resetProgress;
  const { error } = await supabaseClient.rpc('sync_review_bank_item_cards', { p_item_id: item.id, p_front: card.front, p_back_trans: card.back_trans, p_fields: fields, p_mode: card.mode, p_tags: card.tags, p_note: card.note, p_bump_revision: bump });
  return error ? { ok: false, error: error.message } : { ok: true, reset: bump };
}

function rbReadForm(box){
  const v = {}; box.querySelectorAll('[data-f]').forEach(el => { v[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
  return v;
}

async function rbSaveItem(box, approve){
  const s = rbStudentById(RB.cur); const msg = document.getElementById('rb-form-msg');
  const id = box.dataset.id || null, existing = id ? rbFindItem(id) : null;
  const f = rbReadForm(box); const n = rbNormalizeItem(f);
  if (n.item_type !== 'erro') n.wrong_form = '';
  const issues = rbItemIssues(n);
  if (issues.length){ if (msg) msg.textContent = rbt('missing', { f: issues.map(k => rbt('field.' + k)).join(', ') }); return; }
  if (approve) n.check_note = '';
  const cols = { item_type: n.item_type, class_date: n.class_date, question: n.question, answer: n.answer, wrong_form: n.wrong_form || null, gap_word: n.gap_word || null, explanation: n.explanation || null, check_note: n.check_note || null, sensitive: !!f.sensitive, updated_at: new Date().toISOString() };
  let saved = existing, err;
  if (existing){
    const r = await supabaseClient.from('review_bank_items').update(cols).eq('id', existing.id).select().maybeSingle(); err = r.error; saved = r.data || Object.assign({}, existing, cols);
  } else {
    const r = await supabaseClient.from('review_bank_items').insert(Object.assign({ teacher_id: CURRENT_USER.id, bank_student_id: s.id, language_app_key: s.language_app_key, student_id: s.classroom_id ? null : (s.linked_student_id || null), status: 'pendente' }, cols)).select().maybeSingle(); err = r.error; saved = r.data;
  }
  if (err || !saved){ if (msg) msg.textContent = rbt('error') + ' ' + rbErrMsg(err); return; }
  let note = '';
  if (existing && existing.teacher_flashcard_id){
    const sync = await rbSyncDeliveredCard(saved, s, !!f.reset_progress);
    if (!sync.ok){ rbToastErr(sync.error); } else if (sync.reset) note = rbt('savedReset');
  }
  let delivered = false;
  if (saved.status === 'pendente' && (approve || rbReadyForAuto(saved, s, RB.settings).ok)){
    const r = await rbApproveItem(saved);
    if (!r.ok) rbToastErr(r.error); else delivered = r.card;
  }
  if (existing) await rbResolveRequestsFor(existing);
  RB.editingId = null; RB.adding = false;
  await rbReloadCur(); rbRender();
  showToast(note || (delivered ? rbt('savedDelivered') : rbt('saved')));
}

async function rbGenerateReady(sId){
  const s = rbStudentById(sId); if (!s) return;
  const list = rbReadyItems(s); let ok = 0, fail = 0, last = '';
  for (const i of list){ const r = await rbApproveItem(i); if (r.ok) ok++; else { fail++; last = r.error; } }
  await rbReloadCur(); rbRender();
  showToast(fail ? rbt('generatedPartial', { ok, fail }) + ' ' + last : rbt('generated', { n: ok }));
}

async function rbSaveStudent(box){
  const f = rbReadForm(box), msg = document.getElementById('rb-form-msg'), cur = RB.studentForm;
  const name = (f.name || '').trim();
  if (!name){ if (msg) msg.textContent = rbt('sfNeedName'); return; }
  const cols = { name, reference_language: f.reference_language, agent_managed: !!f.agent_managed, lesson_dates: cur.lesson_dates || [], updated_at: new Date().toISOString() };
  let r;
  if (cur.id){ cols.status = f.status || 'ativo'; if (!box.querySelector('[data-f=language_app_key]').disabled) cols.language_app_key = f.language_app_key; r = await supabaseClient.from('review_bank_students').update(cols).eq('id', cur.id).select().maybeSingle(); }
  else r = await supabaseClient.from('review_bank_students').insert(Object.assign({ teacher_id: CURRENT_USER.id, language_app_key: f.language_app_key }, cols)).select().maybeSingle();
  if (r.error || !r.data){ if (msg) msg.textContent = rbt('error') + ' ' + rbErrMsg(r.error); return; }
  const idx = RB.students.findIndex(x => x.id === r.data.id);
  if (idx >= 0) RB.students[idx] = r.data; else RB.students.push(r.data);
  RB.students.sort((a, b) => a.name.localeCompare(b.name));
  RB.studentForm = null; RB.cur = r.data.id; rbLs.set('cur', RB.cur);
  if (!RB.itemsBy[RB.cur]) await rbLoadStudentData(RB.cur);
  rbRender(); showToast(rbt('saved'));
}

async function rbRecapMake(sId){
  const s = rbStudentById(sId); if (!s) return;
  const items = RB.itemsBy[s.id] || [], date = rbNextLesson(s);
  const pick = rbSelectRecap(items, date, RB_RECAP_SIZE);
  const { data, error } = await supabaseClient.from('review_bank_recaps').upsert({ teacher_id: CURRENT_USER.id, bank_student_id: s.id, language_app_key: s.language_app_key, class_date: date, item_ids: pick.map(i => i.id), student_id: s.linked_student_id || null }, { onConflict: 'bank_student_id,class_date' }).select().maybeSingle();
  if (error){ rbToastErr(error); return; }
  RB.recapBy[s.id] = data; rbRender();
  showToast(pick.length ? rbt('recapDone', { n: pick.length }) : rbt('recapNone'));
}

function rbPrintRecap(sId, withAnswers){
  const s = rbStudentById(sId), rc = RB.recapBy[sId]; if (!s || !rc) return;
  const items = (rc.item_ids || []).map(id => (RB.itemsBy[sId] || []).find(x => x.id === id)).filter(Boolean);
  const w = window.open('', '_blank'); if (!w){ showToast(rbt('popupBlocked')); return; }
  const rows = items.map((i, k) => { const p = rbPromptText(i, rbPromptLabels()); return `<li><div class="q">${rbH(p.prefix ? p.prefix + ' ' : '')}${p.wrong ? '✕ ' : ''}${rbH(p.text)}</div>${withAnswers ? `<div class="a">${rbH(i.answer)}</div>` : '<div class="line"></div>'}</li>`; }).join('');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${rbH(rbt('recapTitle', { d: rbDateFmt(rc.class_date) }))}</title><style>body{font:16px/1.5 Nunito,system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#201335}h1{font-size:22px}li{margin:0 0 18px}.q{font-weight:700}.a{font-weight:800;color:#1D5A82}.line{border-bottom:1px solid #999;height:26px}</style><h1>${rbH(s.name)} · ${rbH(rbt('recapTitle', { d: rbDateFmt(rc.class_date) }))}</h1><ol>${rows}</ol>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
}

function rbPreview(id){
  const item = rbFindItem(id), s = item && rbStudentById(item.bank_student_id);
  if (!item || !s) return;
  const card = rbBuildCard(item, s);
  if (!card.ok){ showToast(card.error); return; }
  if (typeof openFlashcardPreviewFromRow !== 'function') return;
  openFlashcardPreviewFromRow({ id: 0, teacher_id: CURRENT_USER.id, student_id: s.linked_student_id || CURRENT_USER.id, language_app_key: s.language_app_key, status: 'active', revision: 0, fields: card.fields, card_generation_mode: card.mode, note: card.note, tags: card.tags, front: card.front, back_trans: card.back_trans });
}

async function rbProposalApply(id){
  const item = rbFindItem(id); if (!item || !item.proposal) return;
  const p = item.proposal, s = rbStudentById(item.bank_student_id);
  if (p.acao === 'cortar'){
    const { error } = await supabaseClient.rpc('set_review_bank_item_status', { p_item_id: id, p_status: 'cortado' });
    if (!error) await supabaseClient.from('review_bank_items').update({ proposal: null }).eq('id', id);
    else return rbToastErr(error);
  } else {
    const c = (Array.isArray(p.cartoes) ? p.cartoes : [])[0];
    if (!c) return;
    const cols = { item_type: RB_ITEM_TYPES.includes(c.tipo) ? c.tipo : item.item_type, question: c.q || item.question, answer: c.a || item.answer, wrong_form: c.errado || null, gap_word: c.lacuna || null, explanation: c.nota || null, check_note: null, proposal: null, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseClient.from('review_bank_items').update(cols).eq('id', id).select().maybeSingle();
    if (error) return rbToastErr(error);
    if (data && data.teacher_flashcard_id) await rbSyncDeliveredCard(data, s, false);
    const extra = (Array.isArray(p.cartoes) ? p.cartoes : []).slice(1);
    for (const x of extra){
      await supabaseClient.from('review_bank_items').insert({ teacher_id: CURRENT_USER.id, bank_student_id: item.bank_student_id, language_app_key: item.language_app_key, student_id: item.student_id || null, status: 'pendente', class_date: item.class_date,
        item_type: RB_ITEM_TYPES.includes(x.tipo) ? x.tipo : item.item_type, question: x.q || '', answer: x.a || '', wrong_form: x.errado || null, gap_word: x.lacuna || null, explanation: x.nota || null });
    }
  }
  await rbReloadCur(); rbRender(); showToast(rbt('proposalApplied'));
}

// ---------- Visão geral ----------
function rbOverviewShell(){ return `<div class="rb-filters" id="rb-ov-filters"></div><div class="rb-tiles" id="rb-ov-tiles"></div><div class="rb-topline"><span class="rb-meta" id="rb-ov-meta"></span><button class="rb-btn" data-rb="ov-refresh">${rbH(rbt('refresh'))}</button></div><div class="rb-tablewrap"><table class="rb-table" id="rb-ov-table"></table></div>`; }
async function rbLoadOverview(force){
  const O = RB.overview;
  if (O.loading) return;
  if (O.data && !force){ rbRenderOverview(); return; }
  O.loading = true;
  const meta = document.getElementById('rb-ov-meta'); if (meta) meta.textContent = rbt('loading');
  try {
    const lim = rbAddDays(todayStr(), -30);
    const [items, reviews, recaps, recapReviews] = await Promise.all([
      rbFetchAll(() => supabaseClient.from('review_bank_items').select('id,bank_student_id,status').order('id')),
      rbFetchAll(() => supabaseClient.from('review_bank_reviews').select('id,bank_student_id,outcome,reason,mode,review_date').gte('review_date', lim).order('id')),
      rbFetchAll(() => supabaseClient.from('review_bank_recaps').select('id,bank_student_id,class_date').order('class_date', { ascending: false })),
      rbFetchAll(() => supabaseClient.from('review_bank_reviews').select('id,bank_student_id,review_date').eq('mode', 'recap').order('id')),
    ]);
    const lastRecap = {}; recaps.forEach(r => { if (!lastRecap[r.bank_student_id]) lastRecap[r.bank_student_id] = r; });
    O.data = RB.students.map(s => {
      const row = rbOverviewRow(s, items.filter(i => i.bank_student_id === s.id), reviews.filter(r => r.bank_student_id === s.id), lastRecap[s.id] || null, todayStr());
      row.recapUsed = recapReviews.filter(r => r.bank_student_id === s.id).map(r => r.review_date).sort().pop() || '';
      return row;
    });
    O.at = new Date();
  } catch (e){ console.error(e); O.data = O.data || []; }
  O.loading = false; rbRenderOverview();
}
function rbRenderOverview(){
  const O = RB.overview, box = document.getElementById('rb-ov-table'); if (!box || !O.data) return;
  const F = O.f, today = todayStr(), week = rbAddDays(today, 6);
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(F.q);
  const rows = O.data.filter(x => (F.lg === 'todos' || x.language === F.lg) && (!q || norm(x.name).includes(q))
    && (F.att === '0' || (F.att === '1' && x.pending > 0) || (F.att === '2' && !x.archived && x.daysSinceEntry !== null && x.daysSinceEntry >= 21) || (F.att === '3' && x.accuracy !== null && x.accuracy < 60) || (F.att === '4' && x.recapGenerated && x.recapGenerated < today && x.recapGenerated > (x.recapUsed || '')))
    && (F.aula === '0' || (F.aula === '1' && x.nextLesson === today) || (F.aula === '2' && x.nextLesson && x.nextLesson <= week)));
  const active = rows.filter(x => !x.archived), withAcc = active.filter(x => x.accuracy !== null);
  const avg = withAcc.length ? Math.round(withAcc.reduce((a, x) => a + x.accuracy * x.n30, 0) / withAcc.reduce((a, x) => a + x.n30, 0)) : null;
  const stale = active.filter(x => x.daysSinceEntry !== null && x.daysSinceEntry >= 21).length;
  const tiles = [[active.length, 'oStudents'], [active.reduce((a, x) => a + x.pending, 0), 'oPending'], [stale, 'oStale'], [avg === null ? rbt('none') : avg + '%', 'oAccuracy']];
  document.getElementById('rb-ov-tiles').innerHTML = tiles.map(([v, k], i) => `<div class="rb-tile${i === 2 && v > 0 ? ' is-bad' : ''}"><b>${rbH(v)}</b><span>${rbH(rbt(k))}</span></div>`).join('');
  document.getElementById('rb-ov-meta').textContent = O.at ? rbt('updatedAt', { d: O.at.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }) : '';
  const cols = [['name', 0], ['nextLesson', 0], ['pending', 1], ['approved', 1], ['daysSinceEntry', 1], ['recapGenerated', 0], ['accuracy', 1], ['errors30', 1], ['topReason', 0]];
  const { k, dir } = O.ord, val = x => (x[k] === null || x[k] === '' ? (dir > 0 ? Infinity : -Infinity) : x[k]);
  const sorted = rows.slice().sort((a, b) => (a.archived - b.archived) || (typeof val(a) === 'string' ? String(val(a)).localeCompare(String(val(b))) * dir : (val(a) - val(b)) * dir));
  const label = x => (RB_REASONS.includes(x) ? rbt('reason.' + x) : x);
  const fl = document.getElementById('rb-ov-filters');
  if (!fl.childElementCount){
    fl.innerHTML = `<div class="rb-seg" role="group">${['todos', 'frances', 'portugues', 'mandarim'].map(v => `<button data-rb="ov-lg" data-lg="${v}" aria-pressed="${F.lg === v}">${rbH(v === 'todos' ? rbt('all') : rbLangLabel(v))}</button>`).join('')}</div>
      <label>${rbH(rbt('oAtt'))} <select id="rb-ov-att">${[0, 1, 2, 3, 4].map(n => `<option value="${n}">${rbH(rbt('oAttOpt' + n))}</option>`).join('')}</select></label>
      <label>${rbH(rbt('oLesson'))} <select id="rb-ov-aula">${[0, 1, 2].map(n => `<option value="${n}">${rbH(rbt('oLessonOpt' + n))}</option>`).join('')}</select></label>
      <input type="search" id="rb-ov-q" placeholder="${rbH(rbt('searchStudent'))}" aria-label="${rbH(rbt('searchStudent'))}">`;
  }
  fl.querySelectorAll('.rb-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lg === F.lg));
  document.getElementById('rb-ov-att').value = F.att; document.getElementById('rb-ov-aula').value = F.aula;
  const heads = ['colName', 'colNext', 'colPending', 'colApproved', 'colEntry', 'colRecap', 'colAccuracy', 'colErrors', 'colReason'];
  box.innerHTML = `<thead><tr>${cols.map(([c, n], i) => `<th data-k="${c}" class="${n ? 'n' : ''}" aria-sort="${c === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}" tabindex="0">${rbH(rbt(heads[i]))}</th>`).join('')}</tr></thead>
    <tbody>${sorted.length ? sorted.map(x => `<tr class="${x.archived ? 'is-archived' : ''}"><td><button class="rb-name" data-rb="ov-open" data-id="${rbH(x.id)}">${rbH(x.name)}</button> <span class="rb-meta">${rbH((RB_LANG_SHORT[x.language] || '').toUpperCase())}${x.linked ? '' : ' · ' + rbH(rbt('noAccount'))}</span></td>
      <td>${x.nextLesson ? (x.nextLesson === today ? `<strong>${rbH(rbt('today'))}</strong>` : rbDateFmt(x.nextLesson)) : rbH(rbt('none'))}</td>
      <td class="n">${x.pending ? `<span class="rb-pill">${x.pending}</span>` : '0'}</td><td class="n">${x.approved}</td>
      <td class="n${x.daysSinceEntry !== null && x.daysSinceEntry >= 21 && !x.archived ? ' rb-alert' : ''}">${x.lastEntry ? `${rbDateFmt(x.lastEntry)} · ${rbH(rbt('daysAgo', { n: x.daysSinceEntry }))}` : rbH(rbt('none'))}</td>
      <td>${x.recapUsed ? rbDateFmt(x.recapUsed) : rbH(rbt('none'))}${x.recapGenerated && x.recapGenerated < today && x.recapGenerated > (x.recapUsed || '') ? ` <span class="rb-meta">· ${rbH(rbt('recapUnused', { d: rbDateFmt(x.recapGenerated) }))}</span>` : ''}</td>
      <td class="n">${x.accuracy === null ? rbH(rbt('none')) : `<span class="rb-acc">${x.accuracy}% <i><b style="width:${x.accuracy}%"></b></i></span>`}</td>
      <td class="n">${x.n30 ? x.errors30 : rbH(rbt('none'))}</td><td>${x.topReason ? rbH(label(x.topReason)) : rbH(rbt('none'))}</td></tr>`).join('') : `<tr><td colspan="9" class="rb-meta" style="text-align:center;padding:22px;">${rbH(rbt('oEmpty'))}</td></tr>`}</tbody>`;
}

// ---------- Manual ----------
function rbManualHTML(){
  const md = RB.settings.manual_markdown || '';
  if (RB.manualEditing) return `<p class="rb-hint">${rbH(rbt('manualHint'))}</p><textarea id="rb-manual-text" spellcheck="false" aria-label="${rbH(rbt('tabManual'))}">${rbH(md)}</textarea><div class="rb-edit-actions" style="display:flex;gap:8px;align-items:center;margin-top:8px;"><button class="rb-btn rb-btn-blue" data-rb="manual-save">${rbH(rbt('save'))}</button><button class="rb-btn" data-rb="manual-cancel">${rbH(rbt('cancel'))}</button><span class="rb-meta" id="rb-form-msg" role="status" aria-live="polite"></span></div>`;
  return `<div class="rb-toolbar"><button class="rb-btn rb-btn-blue" data-rb="manual-edit">${rbH(rbt('manualEdit'))}</button></div><article class="rb-manual">${md.trim() ? rbMarkdownToHTML(md) : `<p class="rb-meta">${rbH(rbt('manualEmpty'))}</p>`}</article>`;
}
async function rbSaveSettings(patch){
  const next = Object.assign({}, RB.settings, patch);
  const { error } = await supabaseClient.from('review_bank_settings').upsert({ teacher_id: CURRENT_USER.id, auto_generate: next.auto_generate !== false, manual_markdown: next.manual_markdown || '', updated_at: new Date().toISOString() }, { onConflict: 'teacher_id' });
  if (error){ rbToastErr(error); return false; }
  RB.settings = next; return true;
}

// ---------- eventos ----------
function rbWire(wrap){
  wrap.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rb]'); if (!b) return;
    const a = b.dataset.rb, id = b.dataset.id;
    try {
      if (a === 'view'){ RB.view = b.dataset.v; rbLs.set('view', RB.view); rbRender(); }
      else if (a === 'select'){ RB.cur = id; rbLs.set('cur', id); RB.editingId = null; RB.adding = false; RB.limit = 60; if (!RB.itemsBy[id]) await rbLoadStudentData(id); rbRender(); }
      else if (a === 'tab'){ RB.tab = b.dataset.t; rbLs.set('student-tab', RB.tab); RB.editingId = null; RB.adding = false; rbRender(); }
      else if (a === 'filter'){ RB.filter = b.dataset.f; RB.limit = 60; rbRender(); }
      else if (a === 'more'){ RB.limit += 60; document.getElementById('rb-list').innerHTML = rbListHTML(rbStudentById(RB.cur)); }
      else if (a === 'item-new'){ RB.adding = true; RB.editingId = null; rbRender(); }
      else if (a === 'item-edit'){ RB.editingId = id; RB.adding = false; rbRender(); }
      else if (a === 'item-cancel'){ RB.editingId = null; RB.adding = false; rbRender(); }
      else if (a === 'item-save'){ b.disabled = true; await rbSaveItem(b.closest('[data-form=item]'), !!b.dataset.approve); }
      else if (a === 'approve'){ b.disabled = true; const it = rbFindItem(id); const r = await rbApproveItem(it); if (!r.ok) { rbToastErr(r.error); b.disabled = false; return; } await rbReloadCur(); rbRender(); showToast(r.card ? rbt('savedDelivered') : rbt('approved')); }
      else if (a === 'req-cut'){ b.disabled = true; if (await rbDecideRequest(id, 'cortar')){ await rbReloadCur(); rbRender(); showToast(rbt('cutDone')); } else b.disabled = false; }
      else if (a === 'req-decline'){ b.disabled = true; if (await rbDecideRequest(id, 'recusar')){ await rbReloadCur(); rbRender(); showToast(rbt('reqDeclined')); } else b.disabled = false; }
      else if (a === 'req-apply'){ b.disabled = true; await rbRequestApply(id, b.dataset.item); }
      else if (a === 'req-edit'){ RB.editingId = b.dataset.item; RB.adding = false; rbRender(); }
      else if (a === 'cut' && rbRequestsOf(rbFindItem(id) || {}).length){ b.disabled = true; if (await rbDecideRequest(rbRequestsOf(rbFindItem(id))[0].id, 'cortar')){ await rbReloadCur(); rbRender(); showToast(rbt('cutDone')); } else b.disabled = false; }
      else if (a === 'cut' || a === 'unapprove'){ b.disabled = true; const { error } = await supabaseClient.rpc('set_review_bank_item_status', { p_item_id: id, p_status: a === 'cut' ? 'cortado' : 'pendente' }); if (error) { rbToastErr(error); b.disabled = false; return; } await rbReloadCur(); rbRender(); showToast(a === 'cut' ? rbt('cutDone') : rbt('restored')); }
      else if (a === 'preview'){ rbPreview(id); }
      else if (a === 'proposal-apply'){ b.disabled = true; await rbProposalApply(id); }
      else if (a === 'proposal-dismiss'){ await supabaseClient.from('review_bank_items').update({ proposal: null }).eq('id', id); await rbReloadCur(); rbRender(); }
      else if (a === 'generate-ready'){ b.disabled = true; await rbGenerateReady(id); }
      else if (a === 'link'){ const pick = document.getElementById('rb-link-pick'); if (!pick) return; const { error } = await supabaseClient.rpc('link_review_bank_student', { p_bank_student_id: id, p_student_id: pick.value }); if (error) { rbToastErr(error); return; } const s = rbStudentById(id); s.linked_student_id = pick.value; await rbReloadCur(); rbRender(); showToast(rbt('linkedDone')); }
      else if (a === 'link-class'){ const pick = document.getElementById('rb-class-pick'); if (!pick) return; const { data, error } = await supabaseClient.rpc('link_review_bank_classroom', { p_bank_student_id: id, p_classroom_id: Number(pick.value) }); if (error) { rbToastErr(error); return; } const s = rbStudentById(id); s.classroom_id = Number(pick.value); s.linked_student_id = null; await rbReloadCur(); rbRender(); showToast(rbt('linkedClassDone', { n: data || 0 })); }
      else if (a === 'unlink'){ const { error } = await supabaseClient.rpc('unlink_review_bank_student', { p_bank_student_id: id }); if (error) { rbToastErr(error); return; } const s = rbStudentById(id); s.linked_student_id = null; s.classroom_id = null; rbRender(); showToast(rbt('unlinkedDone')); }
      else if (a === 'student-new'){ RB.studentForm = { id: null, name: '', language_app_key: 'portugues', reference_language: 'en', agent_managed: false, lesson_dates: [] }; rbRender(); }
      else if (a === 'student-edit'){ const s = rbStudentById(id); RB.studentForm = { id: s.id, name: s.name, language_app_key: s.language_app_key, reference_language: s.reference_language, status: s.status, agent_managed: !!s.agent_managed, lesson_dates: (s.lesson_dates || []).slice() }; rbRender(); }
      else if (a === 'student-cancel'){ RB.studentForm = null; rbRender(); }
      else if (a === 'student-save'){ b.disabled = true; await rbSaveStudent(b.closest('[data-form=student]')); }
      else if (a === 'date-add'){ const inp = document.getElementById('rb-date-add'); if (inp && inp.value && !RB.studentForm.lesson_dates.includes(inp.value)){ RB.studentForm.lesson_dates.push(inp.value); document.getElementById('rb-datechips').innerHTML = rbDateChipsHTML(RB.studentForm.lesson_dates); inp.value = ''; } }
      else if (a === 'date-del'){ RB.studentForm.lesson_dates = RB.studentForm.lesson_dates.filter(d => d !== b.dataset.d); document.getElementById('rb-datechips').innerHTML = rbDateChipsHTML(RB.studentForm.lesson_dates); }
      else if (a === 'recap-make'){ b.disabled = true; await rbRecapMake(id); }
      else if (a === 'recap-print'){ rbPrintRecap(id, !!b.dataset.answers); }
      else if (a === 'class'){ if (typeof openReviewBankClass === 'function') openReviewBankClass(id, 'recap'); }
      else if (a === 'ov-refresh'){ rbLoadOverview(true); }
      else if (a === 'ov-lg'){ RB.overview.f.lg = b.dataset.lg; rbLs.set('ov-filters', JSON.stringify(RB.overview.f)); rbRenderOverview(); }
      else if (a === 'ov-open'){ RB.view = 'students'; RB.cur = id; rbLs.set('view', 'students'); rbLs.set('cur', id); if (!RB.itemsBy[id]) await rbLoadStudentData(id); rbRender(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (a === 'import-run'){ await rbImportRunNow(b); }
      else if (a === 'manual-edit'){ RB.manualEditing = true; rbRender(); }
      else if (a === 'manual-cancel'){ RB.manualEditing = false; rbRender(); }
      else if (a === 'manual-save'){ b.disabled = true; const ok = await rbSaveSettings({ manual_markdown: document.getElementById('rb-manual-text').value }); if (ok){ RB.manualEditing = false; rbRender(); showToast(rbt('saved')); } else b.disabled = false; }
    } catch (err){ console.error('Banco de Revisão:', err); rbToastErr(err); }
  });
  wrap.addEventListener('input', (e) => {
    if (e.target.id === 'rb-search'){ RB.q = e.target.value; const s = rbStudentById(RB.cur); if (s) document.getElementById('rb-list').innerHTML = rbListHTML(s); }
    else if (e.target.id === 'rb-ov-q'){ RB.overview.f.q = e.target.value; rbRenderOverview(); }
  });
  wrap.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'rb-import-file'){ if (el.files && el.files[0]) await rbImportRead(el.files[0]); }
    else if (el.id === 'rb-type'){ RB.type = el.value; const s = rbStudentById(RB.cur); if (s) document.getElementById('rb-list').innerHTML = rbListHTML(s); }
    else if (el.id === 'rb-auto'){ const ok = await rbSaveSettings({ auto_generate: el.checked }); if (!ok) el.checked = !el.checked; else showToast(el.checked ? rbt('autoOn') : rbt('autoOff')); }
    else if (el.id === 'rb-ov-att'){ RB.overview.f.att = el.value; rbLs.set('ov-filters', JSON.stringify(RB.overview.f)); rbRenderOverview(); }
    else if (el.id === 'rb-ov-aula'){ RB.overview.f.aula = el.value; rbLs.set('ov-filters', JSON.stringify(RB.overview.f)); rbRenderOverview(); }
    else if (el.dataset && el.dataset.f === 'item_type'){ const box = el.closest('[data-form=item]'); const w = box.querySelector('[data-only=erro]'); if (w) w.hidden = el.value !== 'erro'; }
  });
  wrap.addEventListener('keydown', (e) => {
    const th = e.target.closest && e.target.closest('#rb-ov-table th'); if (!th) return;
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); th.click(); }
  });
  wrap.addEventListener('click', (e) => {
    const th = e.target.closest('#rb-ov-table th'); if (!th) return;
    const c = th.dataset.k, O = RB.overview;
    O.ord = O.ord.k === c ? { k: c, dir: -O.ord.dir } : { k: c, dir: ['name', 'nextLesson', 'recapGenerated', 'topReason'].includes(c) ? 1 : -1 };
    rbRenderOverview();
  });
}
