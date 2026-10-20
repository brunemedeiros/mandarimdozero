// Modo aula do Banco de Revisão (tela cheia, a tela da professora). Migrations 081 a 083.
// Cada resposta (Errei, Difícil, Bom, Fácil: FSRS, o mesmo do site) vira uma linha em review_bank_reviews e atualiza o agendamento do item
// (nível, próxima data, último resultado), que serve para montar o próximo Récap. Se o aluno tem conta vinculada e o
// item virou cartão, o app dele aplica a nota no FSRS (shared/review-bank-student.js). Sem conta: só fica o registro.
// Depende de shared/review-bank.js (RB, rbt, rbH, helpers) e shared/review-bank-model.js.

const RBC = { open: false, sid: null, mode: 'recap', slides: [], idx: 0, shown: false, results: {}, reasonFor: null, drawer: false, done: false, busy: false, editing: false };

function rbcItemsFor(s, mode){
  const items = (RB.itemsBy[s.id] || []).filter(i => i.status === 'aprovado');
  if (mode === 'recap'){
    const rc = RB.recapBy[s.id];
    return rc ? (rc.item_ids || []).map(id => items.find(x => x.id === id)).filter(Boolean) : [];
  }
  if (mode === 'ultima'){
    const last = items.map(i => i.class_date).filter(Boolean).sort().pop();
    return last ? items.filter(i => i.class_date === last) : [];
  }
  return items.filter(i => i.last_result === 'errou').sort((a, b) => String(b.last_review_date || '').localeCompare(String(a.last_review_date || ''))).slice(0, 30);
}

async function rbcEnsureRecap(s){
  if (RB.recapBy[s.id]) return;
  const date = rbNextLesson(s), pick = rbSelectRecap(RB.itemsBy[s.id] || [], date, RB_RECAP_SIZE);
  if (!pick.length) return;
  const { data } = await supabaseClient.from('review_bank_recaps').upsert({ teacher_id: CURRENT_USER.id, bank_student_id: s.id, language_app_key: s.language_app_key, class_date: date, item_ids: pick.map(i => i.id), student_id: s.linked_student_id || null }, { onConflict: 'bank_student_id,class_date' }).select().maybeSingle();
  if (data) RB.recapBy[s.id] = data;
}

async function openReviewBankClass(studentId, mode){
  RBC.open = true; RBC.drawer = false; RBC.editing = false;
  await rbcLoadStudent(studentId, mode || 'recap');
  if (!document.getElementById('rb-class')){
    const el = document.createElement('div'); el.id = 'rb-class'; el.className = 'rb-class'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', rbt('openClass'));
    document.body.appendChild(el);
    el.addEventListener('click', rbcClick);
    document.addEventListener('keydown', rbcKey);
    document.body.style.overflow = 'hidden';
  }
  rbcRender();
}

async function rbcLoadStudent(sid, mode){
  const s = rbStudentById(sid); if (!s) return;
  if (!RB.itemsBy[sid]) await rbLoadStudentData(sid);
  if (mode === 'recap') await rbcEnsureRecap(s);
  Object.assign(RBC, { sid, mode, slides: rbcItemsFor(s, mode), idx: 0, shown: false, results: {}, reasonFor: null, done: false });
}

function rbcClose(){
  RBC.open = false;
  const el = document.getElementById('rb-class'); if (el) el.remove();
  document.removeEventListener('keydown', rbcKey);
  document.body.style.overflow = '';
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  if (typeof rbRender === 'function' && document.getElementById('admin-reviewbank-content')) rbRender();
}

function rbcRender(){
  const el = document.getElementById('rb-class'); if (!el) return;
  const s = rbStudentById(RBC.sid); if (!s) return;
  const modes = ['recap', 'ultima', 'erros'];
  const bar = `<div class="rb-class-bar">
    <button class="rb-ico" data-c="drawer" aria-label="${rbH(rbt('chooseStudent'))}" aria-expanded="${RBC.drawer}">☰</button>
    <span class="rb-class-who">${rbH(s.name)} <b>· ${rbH(rbt('openClass'))}</b></span><span class="rb-sp"></span>
    <div class="rb-modes" role="group" aria-label="${rbH(rbt('modesAria'))}">${modes.map(m => `<button data-c="mode" data-m="${m}" aria-pressed="${RBC.mode === m}">${rbH(rbt('mode.' + m))}</button>`).join('')}</div>
    <button class="rb-ico" data-c="fs" aria-label="${rbH(rbt('fullscreen'))}">⛶</button>
    <button class="rb-ico" data-c="close" aria-label="${rbH(rbt('backToPanel'))}">✕</button></div>`;
  const dots = RBC.slides.length ? `<div class="rb-dots">${RBC.slides.map((it, k) => `<span class="rb-dot ${k === RBC.idx && !RBC.done ? 'is-cur' : (RBC.results[it.id] ? 'is-' + ({ acertou: 'ok', ajuda: 'help', errou: 'bad' }[RBC.results[it.id].outcome]) : '')}"></span>`).join('')}</div>` : '';
  el.innerHTML = bar + dots + `<main class="rb-stage" aria-live="polite">${rbcStageHTML(s)}</main>` + (RBC.drawer ? rbcDrawerHTML() : '') + (RBC.editing ? rbcEditHTML() : '');
}

function rbcStageHTML(s){
  if (!RBC.slides.length) return `<div class="rb-hidden">${rbH(rbt('classEmpty.' + RBC.mode))}</div>`;
  if (RBC.done) return rbcEndHTML();
  const it = RBC.slides[RBC.idx], p = rbPromptText(it, rbPromptLabels());
  const q = `<div class="rb-sq${p.wrong ? ' is-wrong' : ''}">${p.prefix ? `<span class="rb-pre">${rbH(p.prefix)}</span>` : ''}${p.wrong ? '✕ ' : ''}${rbH(p.text)}</div>${p.hint ? `<div class="rb-sh">${rbH(p.hint)}</div>` : ''}`;
  let ctrl;
  if (RBC.reasonFor === it.id){
    ctrl = `<div class="rb-reasons"><h3 class="rb-h">${rbH(rbt('whyMissed'))}</h3><div class="chips">${(RB_REASONS_BY_TYPE[it.item_type] || RB_REASONS_BY_TYPE.vocabulario).map((r, k) => `<button data-c="reason" data-r="${r}">${k + 1} · ${rbH(rbt('reason.' + r))}</button>`).join('')}<button class="is-none" data-c="reason" data-r="">${rbH(rbt('noReason'))}</button></div></div>`;
  } else if (RBC.shown){
    const pv = rbGradePreviews(it), GB = [['again', 'is-bad'], ['hard', 'is-help'], ['good', 'is-good'], ['easy', 'is-ok']];
    ctrl = `<div class="rb-ctrl">${GB.map((g, k) => `<button class="rb-big ${g[1]}" data-c="ans" data-g="${k}">${rbH(t('review.grade.' + g[0]))}<small>${rbH(formatReviewInterval(pv[k]))}</small></button>`).join('')}</div>`;
  } else {
    ctrl = `<div class="rb-ctrl"><button class="rb-big is-blue" data-c="show">${rbH(rbt('showAnswer'))}</button><button class="rb-big" data-c="skip">${rbH(rbt('skip'))}</button></div>`;
  }
  return `<div class="rb-kind"><span class="rb-tag">${rbH(rbt('type.' + it.item_type))}</span>${it.class_date ? `<span>${rbH(rbt('classOf', { d: rbDateFmt(it.class_date) }))}</span>` : ''}<span>${RBC.idx + 1} / ${RBC.slides.length}</span><button class="rb-btn rb-edit-open" data-c="edit">${rbH(rbt('edit'))}</button></div>
    <div class="rb-slide">${q}${RBC.shown ? `<div class="rb-sa">${rbH(it.answer)}</div>${it.explanation ? `<div class="rb-sn">${rbH(it.explanation)}</div>` : ''}` : `<div class="rb-hidden">${rbH(rbt('answerHidden'))}</div>`}</div>
    ${ctrl}<div class="rb-keys">${rbH(rbt('keys'))}</div>
    ${rbHasTarget(s) ? '' : `<div class="rb-keys">${rbH(rbt('classNoAccount'))}</div>`}`;
}

// Janela de edição durante a aula: corrige o item (vale para todos) ou corta, sem sair da aula.
function rbcEditHTML(){
  const it = RBC.slides[RBC.idx]; if (!it) return '';
  const delivered = !!it.teacher_flashcard_id;
  return `<div class="rb-cedit-veil" data-c="edit-veil"><div class="rb-cedit" role="dialog" aria-modal="true" aria-label="${rbH(rbt('editTitle'))}" data-id="${rbH(it.id)}">
    <h3 class="rb-h">${rbH(rbt('editTitle'))}</h3>
    <label>${rbH(rbt('fQuestion'))}<textarea rows="2" data-e="question">${rbH(it.question)}</textarea></label>
    <label>${rbH(rbt('fAnswer'))}<textarea rows="2" data-e="answer">${rbH(it.answer)}</textarea></label>
    <label>${rbH(rbt('fObservation'))}<textarea rows="2" data-e="explanation">${rbH(it.explanation || '')}</textarea></label>
    ${delivered ? `<label class="rb-check" style="flex-direction:row;align-items:center;gap:6px;"><input type="checkbox" data-e="reset"> ${rbH(rbt('fReset'))}</label><p class="rb-hint">${rbH(rbt('fResetHint'))}</p>` : ''}
    <div class="rb-cedit-actions"><button class="rb-btn rb-btn-blue" data-c="edit-save">${rbH(rbt('save'))}</button><button class="rb-btn" data-c="edit-cancel">${rbH(rbt('cancel'))}</button><span class="rb-meta" id="rb-cedit-msg" role="status" aria-live="polite"></span></div>
    <div class="rb-cedit-cutbox"><span class="rb-meta">${rbH(rbt('cutWarnAll'))}</span><button class="rb-btn rb-btn-cut" data-c="edit-cut">${rbH(rbt('cutThis'))}</button></div></div></div>`;
}
async function rbcEditSave(){
  const it = RBC.slides[RBC.idx], box = document.querySelector('.rb-cedit'), msg = document.getElementById('rb-cedit-msg');
  if (!it || !box) return;
  const g = k => { const e = box.querySelector('[data-e=' + k + ']'); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; };
  const cols = { question: g('question'), answer: g('answer'), explanation: g('explanation') || null, updated_at: new Date().toISOString() };
  if (!cols.question || !cols.answer){ if (msg) msg.textContent = rbt('missing', { f: [!cols.question ? rbt('field.question') : '', !cols.answer ? rbt('field.answer') : ''].filter(Boolean).join(', ') }); return; }
  const { data, error } = await supabaseClient.from('review_bank_items').update(cols).eq('id', it.id).select().maybeSingle();
  if (error){ if (msg) msg.textContent = rbt('error') + ' ' + rbErrMsg(error); return; }
  Object.assign(it, data || cols);
  const s = rbStudentById(it.bank_student_id);
  if (it.teacher_flashcard_id){ const sync = await rbSyncDeliveredCard(it, s, !!g('reset')); if (!sync.ok) showToast(rbt('error') + ' ' + sync.error); }
  RBC.editing = false; rbcRender(); showToast(rbt('saved'));
}
async function rbcEditCut(){
  const it = RBC.slides[RBC.idx]; if (!it) return;
  const { error } = await supabaseClient.rpc('set_review_bank_item_status', { p_item_id: it.id, p_status: 'cortado' });
  if (error){ showToast(rbt('error') + ' ' + rbErrMsg(error)); return; }
  it.status = 'cortado';
  RBC.slides.splice(RBC.idx, 1); RBC.editing = false; RBC.shown = false;
  if (RBC.idx >= RBC.slides.length) RBC.done = true;
  rbcRender(); showToast(rbt('cutDone'));
}

function rbcEndHTML(){
  const res = Object.values(RBC.results), ok = res.filter(r => r.outcome === 'acertou').length, wrong = RBC.slides.filter(i => RBC.results[i.id] && RBC.results[i.id].outcome === 'errou');
  const help = RBC.slides.filter(i => RBC.results[i.id] && RBC.results[i.id].outcome === 'ajuda');
  const list = (arr, title) => arr.length ? `<h3 class="rb-h">${rbH(title)}</h3>${arr.map(i => `<div class="rb-enditem"><span class="rb-q">${i.wrong_form ? '✕ ' + rbH(i.wrong_form) : rbH(i.question)}</span><br><span class="rb-a" style="font-size:18px;">${rbH(i.answer)}</span>${RBC.results[i.id].reason ? ` <span class="rb-meta">· ${rbH(rbt('reason.' + RBC.results[i.id].reason))}</span>` : ''}</div>`).join('')}` : '';
  return `<div class="rb-end"><div class="rb-kind">${rbH(rbt('endTitle'))}</div><div class="rb-score">${ok}/${RBC.slides.length}</div><div>${rbH(ok === RBC.slides.length ? rbt('endAll') : rbt('endSome', { n: wrong.length + help.length }))}</div>
    <div class="rb-endlist">${list(wrong, rbt('endMissed'))}${list(help, rbt('endHelped'))}</div>
    <div class="rb-ctrl">${wrong.length ? `<button class="rb-big is-blue" data-c="redo">${rbH(rbt('endRedo'))}</button>` : ''}<button class="rb-big" data-c="close">${rbH(rbt('backToPanel'))}</button></div></div>`;
}

function rbcDrawerHTML(){
  const list = RB.students.filter(s => s.status !== 'arquivado').sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="rb-veil" data-c="drawer"></div><nav class="rb-drawer" aria-label="${rbH(rbt('studentsAria'))}"><h3 class="rb-h">${rbH(rbt('chooseStudent'))}</h3>${list.map(s => `<button class="rb-dst" data-c="student" data-id="${rbH(s.id)}" aria-current="${s.id === RBC.sid}"><span>${rbH(s.name)}</span><span class="rb-meta">${rbH((RB_LANG_SHORT[s.language_app_key] || '').toUpperCase())}</span></button>`).join('')}</nav>`;
}

// Mesmo FSRS do site (Revisão e Aluno > Revisão): a nota 0..3 da professora vira o estado de memória do item (112).
async function rbcSave(item, grade, reason){
  const s = rbStudentById(item.bank_student_id), today = todayStr();
  const sched = rbApplyGrade(item, grade, Date.now()), outcome = sched.outcome;
  const rec = { item_id: item.id, teacher_id: CURRENT_USER.id, bank_student_id: item.bank_student_id, student_id: s.linked_student_id || null, language_app_key: s.language_app_key, outcome, reason: reason || null, source: 'modo_aula', mode: RBC.mode, review_date: today };
  const cols = { level: sched.level, due_date: sched.due_date, last_result: outcome, last_review_date: today };
  const send = (full) => Promise.all([
    supabaseClient.from('review_bank_reviews').insert(full ? Object.assign({ grade, via: 'aula' }, rec) : rec).select().maybeSingle(),
    supabaseClient.from('review_bank_items').update(full ? Object.assign({ fsrs: sched.fsrs, last_source: 'aula' }, cols) : cols).eq('id', item.id),
  ]);
  let [r1, r2] = await send(true);
  // Banco ainda sem a migration 112 (colunas novas): grava só o formato antigo, para a aula nunca travar.
  if ((r1.error || r2.error) && /column|schema cache|42703|PGRST204/i.test(String((r1.error || r2.error).message || '') + String((r1.error || r2.error).code || ''))){
    [r1, r2] = await send(false);
  }
  if (r1.error || r2.error){ showToast(rbt('error') + ' ' + rbErrMsg(r1.error || r2.error)); return; }
  Object.assign(item, cols, { fsrs: sched.fsrs, last_source: 'aula' });
  (RB.reviewsBy[s.id] = RB.reviewsBy[s.id] || []).unshift(r1.data || rec);
}

async function rbcRecord(grade, reason){
  const it = RBC.slides[RBC.idx]; if (!it || RBC.busy) return;
  RBC.busy = true;
  RBC.results[it.id] = { outcome: rbGradeOutcome(grade), grade, reason: reason || null };
  RBC.reasonFor = null; RBC.shown = false;
  await rbcSave(it, grade, reason);
  RBC.busy = false;
  rbcAdvance();
}
function rbcAdvance(){
  if (RBC.idx + 1 >= RBC.slides.length) RBC.done = true; else RBC.idx++;
  rbcRender();
}

async function rbcClick(e){
  const b = e.target.closest('[data-c]'); if (!b) return;
  const c = b.dataset.c;
  if (c === 'edit-veil'){ if (e.target === b){ RBC.editing = false; rbcRender(); } return; }
  if (c === 'edit'){ RBC.editing = true; rbcRender(); }
  else if (c === 'edit-cancel'){ RBC.editing = false; rbcRender(); }
  else if (c === 'edit-save'){ b.disabled = true; await rbcEditSave(); }
  else if (c === 'edit-cut'){ b.disabled = true; await rbcEditCut(); }
  else if (c === 'close') rbcClose();
  else if (c === 'drawer'){ RBC.drawer = !RBC.drawer; rbcRender(); }
  else if (c === 'fs'){ try { const el = document.getElementById('rb-class'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); } catch (err) {} }
  else if (c === 'mode'){ await rbcLoadStudent(RBC.sid, b.dataset.m); rbcRender(); }
  else if (c === 'student'){ RBC.drawer = false; await rbcLoadStudent(b.dataset.id, RBC.mode); rbcRender(); }
  else if (c === 'show'){ RBC.shown = true; rbcRender(); }
  else if (c === 'skip'){ rbcAdvance(); }
  else if (c === 'ans'){ const g = Number(b.dataset.g); if (g === 0){ RBC.reasonFor = RBC.slides[RBC.idx].id; rbcRender(); } else rbcRecord(g); }
  else if (c === 'reason'){ rbcRecord(0, b.dataset.r || null); }
  else if (c === 'redo'){
    const wrong = RBC.slides.filter(i => RBC.results[i.id] && RBC.results[i.id].outcome === 'errou');
    Object.assign(RBC, { slides: wrong, idx: 0, shown: false, results: {}, reasonFor: null, done: false }); rbcRender();
  }
}

function rbcKey(e){
  if (!RBC.open) return;
  if (RBC.editing){ if (e.key === 'Escape'){ RBC.editing = false; rbcRender(); } return; }
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'Escape'){ if (RBC.drawer){ RBC.drawer = false; rbcRender(); } else rbcClose(); return; }
  if (RBC.done || !RBC.slides.length || RBC.busy) return;
  if (RBC.reasonFor){
    const n = Number(e.key), list = RB_REASONS_BY_TYPE[(RBC.slides[RBC.idx] || {}).item_type] || RB_REASONS_BY_TYPE.vocabulario;
    if (n >= 1 && n <= list.length){ e.preventDefault(); rbcRecord(0, list[n - 1]); }
    else if (e.key === '0'){ e.preventDefault(); rbcRecord(0, null); }
    return;
  }
  if (!RBC.shown){ if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); RBC.shown = true; rbcRender(); } return; }
  if (e.key === 'ArrowRight' || e.key === '3'){ e.preventDefault(); rbcRecord(2); }
  else if (e.key === 'ArrowLeft' || e.key === '1'){ e.preventDefault(); RBC.reasonFor = RBC.slides[RBC.idx].id; rbcRender(); }
  else if (e.key === '2' || e.key.toLowerCase() === 'h'){ e.preventDefault(); rbcRecord(1); }
  else if (e.key === '4'){ e.preventDefault(); rbcRecord(3); }
}
