// Menu "⋯" do cartão da professora na Revisão da aluna: pedir para cortar, sugerir correção ou avisar que parece errado.
// A aluna nunca altera o Banco: o pedido vai para a professora (RPC request_bank_item_change, migration 114).
// Cortar e "parece errado" pausam o cartão só para quem pediu até a professora responder; correção não pausa.

function rqCard(){
  try {
    const c = STATE.reviewQueue && STATE.reviewQueue[STATE.reviewIndex];
    return c && c.origin === 'teacher' && c.rowId != null && !c.__isPreviewCard ? c : null;
  } catch (e) { return null; }
}

function rqClose(){
  document.getElementById('rq-pop')?.remove();
  document.getElementById('rq-veil')?.remove();
  const b = document.getElementById('rq-open'); if (b) b.setAttribute('aria-expanded', 'false');
}

function rqOptionsHTML(){
  const opt = (k, ico) => `<button type="button" class="rq-opt" data-rq="${k}"><span class="rq-ico" aria-hidden="true">${ico}</span><span class="rq-txt"><strong>${escapeHTML(t('reqChange.opt.' + k))}</strong><small>${escapeHTML(t('reqChange.opt.' + k + 'Sub'))}</small></span></button>`;
  return opt('cortar', '✂') + opt('corrigir', '✎') + opt('errado', '?');
}

function rqPanelHTML(kind){
  const area = (id, label, rows) => `<label class="rq-f">${escapeHTML(label)}<textarea id="${id}" rows="${rows}" maxlength="500"></textarea></label>`;
  const body = kind === 'corrigir' ? area('rq-fix', t('reqChange.fixLabel'), 2) + area('rq-why', t('reqChange.whyFix'), 2) : area('rq-why', t('reqChange.whyOpt'), 2);
  return `<h3 class="rq-h">${escapeHTML(t('reqChange.title.' + kind))}</h3><p class="rq-hint">${escapeHTML(t('reqChange.hint.' + kind))}</p>${body}
    <div class="rq-actions"><button type="button" class="rb-btn rb-btn-blue" data-rq="send" data-kind="${kind}">${escapeHTML(t('reqChange.send'))}</button><button type="button" class="rb-btn" data-rq="back">${escapeHTML(t('reqChange.cancel'))}</button><span class="rq-msg" id="rq-msg" role="status" aria-live="polite"></span></div>`;
}

function rqOpenMenu(){
  rqClose();
  const host = document.getElementById('review-content'); if (!host) return;
  const veil = document.createElement('div'); veil.id = 'rq-veil'; veil.className = 'rq-veil';
  const pop = document.createElement('div'); pop.id = 'rq-pop'; pop.className = 'rq-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', t('reqChange.menuAria'));
  pop.innerHTML = `<div class="rq-opts" id="rq-body">${rqOptionsHTML()}</div>`;
  document.body.appendChild(veil); document.body.appendChild(pop);
  document.getElementById('rq-open')?.setAttribute('aria-expanded', 'true');
  veil.addEventListener('click', rqClose);
  pop.addEventListener('click', rqPopClick);
  pop.addEventListener('keydown', e => { if (e.key === 'Escape'){ e.stopPropagation(); rqClose(); document.getElementById('rq-open')?.focus(); } });
  pop.querySelector('.rq-opt')?.focus();
}

async function rqPopClick(e){
  const b = e.target.closest('[data-rq]'); if (!b) return;
  const a = b.dataset.rq, body = document.getElementById('rq-body');
  if (a === 'cortar' || a === 'corrigir' || a === 'errado'){ body.innerHTML = rqPanelHTML(a); body.querySelector('textarea')?.focus(); }
  else if (a === 'back'){ body.innerHTML = rqOptionsHTML(); body.querySelector('.rq-opt')?.focus(); }
  else if (a === 'send') await rqSend(b);
}

async function rqSend(btn){
  const card = rqCard(), kind = btn.dataset.kind, msg = document.getElementById('rq-msg');
  if (!card) return rqClose();
  const why = (document.getElementById('rq-why')?.value || '').trim();
  const fix = (document.getElementById('rq-fix')?.value || '').trim();
  if (kind === 'corrigir' && !fix){ if (msg) msg.textContent = t('reqChange.needFix'); return; }
  btn.disabled = true;
  const { error } = await supabaseClient.rpc('request_bank_item_change', {
    p_teacher_flashcard_id: Number(card.rowId), p_kind: kind, p_proposal: kind === 'corrigir' ? { answer: fix } : null, p_reason: why || null,
  });
  if (error){ btn.disabled = false; if (msg) msg.textContent = /not_authorized/.test(error.message || '') ? t('reqChange.notBank') : t('reqChange.error'); return; }
  rqClose();
  if (kind === 'corrigir'){ showToast(t('reqChange.sent')); return; }
  // Pausado: sai da fila de hoje (e não volta até a professora responder).
  const rowId = String(card.rowId);
  (STATE.cards || []).forEach(c => { if (c.origin === 'teacher' && String(c.rowId) === rowId) c.flashcardStatus = 'archived'; });
  STATE.reviewQueue = STATE.reviewQueue.filter(c => !(c.origin === 'teacher' && String(c.rowId) === rowId));
  STATE.reviewCardState = null;
  showToast(t('reqChange.sentPaused'));
  renderReviewView();
}

// Chamado depois de cada renderização da Revisão: coloca o botão "⋯" só em cartão da professora.
function mountBankRequestMenu(){
  document.getElementById('rq-open')?.remove();
  const host = document.getElementById('review-content'); if (!host || !rqCard()) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'rq-open'; b.className = 'rq-open'; b.textContent = '⋯';
  b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', t('reqChange.menuAria'));
  b.addEventListener('click', rqOpenMenu);
  host.appendChild(b);
}
