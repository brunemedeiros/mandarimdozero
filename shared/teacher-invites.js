// ---------- Convite de aluno pela professora (migration 077) ----------
// Plano: docs/plano-professora-privacidade.md (decisões da autora 2026-10-12).
//
// Lado da professora (Painel da professora > Alunos):
//   * "Convidar aluno": busca por nome ou @usuário (mesmo jeito da aba Planos)
//     e o idioma; teacher_invite_student manda o convite (vale 14 dias, 30
//     por dia) e avisa o aluno no sino.
//   * Link de convite: um por professora e idioma (teacher_invite_link), com
//     Copiar, WhatsApp e "Gerar outro link" (o antigo para de funcionar).
//   * Convites pendentes: cancelar (status 'removed') ou reenviar o vencido.
// Lado do aluno:
//   * Faixa no topo da Trilha com os convites pendentes (Aceitar / Recusar).
//   * Link ?convite=CODIGO: guardado no aparelho (como o ?amigo=), abre o
//     cartão do convite. Sem login o cartão aparece mesmo assim
//     (invite_code_info é liberado para anon) com "Entrar para aceitar".
//   * O aluno não sai sozinho: quem encerra o vínculo é a professora.
// Quem barra de verdade é o banco (RPCs security definer da 077).
//
// Depende de: shared/supabase-client.js, shared/auth.js (CURRENT_USER,
// goToNeutralGate), shared/permissions.js, shared/profile.js (escapeHTML,
// avatarInitials, avatarColor), shared/toast.js, fr/zh app.js (APP_KEY, switchTab).

const TINVITE_CODE_KEY = 'pendingTeacherInvite';
const TINVITE_CODE_RE = /^[a-z0-9]{10}$/;
const TINVITE_DAYS = 14;
const TINVITE_LANG_DIR = { frances: 'fr', mandarim: 'zh' };
const TINVITE_STATE = { lang: null, query: '', results: [], active: -1, selected: null, timer: null, seq: 0, links: {} };

(function captureTeacherInviteParam(){
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('convite')) return;
    const code = (params.get('convite') || '').trim().toLowerCase();
    if (TINVITE_CODE_RE.test(code)) window.localStorage.setItem(TINVITE_CODE_KEY, code);
    params.delete('convite');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch (e) { /* storage bloqueado: o convite simplesmente não é lembrado */ }
})();

function tinviteLangLabel(lang){
  return typeof STUDENT_LANGUAGE_LABELS !== 'undefined' && STUDENT_LANGUAGE_LABELS[lang] ? STUDENT_LANGUAGE_LABELS[lang] : lang;
}

// No meio da frase o idioma vai em minúscula ("aulas de francês").
function tinviteLangWord(lang){
  return ['frances', 'mandarim', 'portugues'].includes(lang) ? t(`tinvite.lang.${lang}`) : lang;
}

function tinviteAvatarHTML(p, seed, cls){
  const name = p?.display_name || p?.teacher_name || p?.username || p?.teacher_username || '?';
  const url = p?.avatar_url || p?.teacher_avatar;
  return url
    ? `<img class="${cls}" src="${escapeHTML(url)}" alt="">`
    : `<span class="${cls}" style="background:${avatarColor(seed || name)};" aria-hidden="true">${escapeHTML(avatarInitials(name))}</span>`;
}

function tinviteErrorText(code){
  const known = ['not_authorized', 'invalid_language', 'invalid_target', 'not_found', 'student_has_teacher', 'already_student',
    'already_invited', 'daily_invite_limit', 'no_pending_invite', 'invalid_code', 'not_authenticated'];
  return t(`tinvite.err.${known.includes(code) ? code : 'generic'}`);
}

function tinviteDaysLeft(invitedAt){
  const ms = new Date(invitedAt).getTime() + TINVITE_DAYS * 86400000 - Date.now();
  return ms > 0 ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
}

// ---------- Professora: seção "Convidar aluno" (Design System do painel) ----------
// Confirmação do painel (PainelUI.confirmar); sem o painel na tela cai no confirm() do navegador.
async function tinviteConfirm(titulo, confirmar){
  const opts = { titulo, confirmar, cancelar: t('students.dialog.cancel'), perigo: true };
  return (window.PainelUI && PainelUI.confirmar) ? PainelUI.confirmar(opts) : confirm(titulo);
}

function teacherInviteSectionHTML(){
  if (!TINVITE_STATE.lang) TINVITE_STATE.lang = TINVITE_LANG_DIR[typeof APP_KEY !== 'undefined' ? APP_KEY : ''] ? APP_KEY : 'frances';
  TINVITE_STATE.selected = null;
  const langs = Object.keys(TINVITE_LANG_DIR);
  return `
    <article aria-labelledby="tinv-title-h" data-tinv-secao>
      <header><h3 id="tinv-title-h">${t('tinvite.title')}</h3></header>
      <p class="p-subtitulo" style="margin-top:0">${t('tinvite.hint')}</p>
      <div class="p-seg" role="toolbar" aria-label="${escapeHTML(t('tinvite.langLabel'))}" style="margin-bottom:1rem">
        ${langs.map(l => `<button type="button" data-tinv-lang="${l}" aria-pressed="${l === TINVITE_STATE.lang}">${escapeHTML(tinviteLangLabel(l))}</button>`).join('')}
      </div>
      <div class="p-grade-2">
        <div>
          <h4 style="margin:0 0 .5rem">${t('tinvite.search.title')}</h4>
          <div class="p-busca" id="tinv-search-box">
            <label class="p-so-leitor" for="tinv-search-input">${t('plans.search.label')}</label>
            <input type="search" id="tinv-search-input" role="combobox" aria-expanded="false" aria-controls="tinv-search-list" aria-autocomplete="list" aria-haspopup="listbox"
              placeholder="${escapeHTML(t('plans.search.placeholder'))}" autocomplete="off" spellcheck="false">
            <ul class="p-combo-lista" id="tinv-search-list" role="listbox" aria-label="${escapeHTML(t('plans.search.label'))}" hidden></ul>
            <small id="tinv-search-status" aria-live="polite"></small>
          </div>
          <div id="tinv-picked" aria-live="polite"></div>
        </div>
        <div>
          <h4 style="margin:0 0 .5rem">${t('tinvite.link.title')}</h4>
          <p class="p-subtitulo" style="margin:0 0 .5rem">${t('tinvite.link.hint')}</p>
          <div id="tinv-link"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span></div></div>
        </div>
      </div>
    </article>`;
}

function teacherPendingInvitesHTML(invites){
  if (!invites || !invites.length) return '';
  return `
    <article aria-labelledby="tinv-pending-h" data-tinv-pendentes>
      <header><h3 id="tinv-pending-h">${t('tinvite.pending.title', { n: invites.length })}</h3></header>
      <ul class="p-convites">
        ${invites.map(i => {
          const left = tinviteDaysLeft(i.invited_at);
          return `
          <li class="tinv-pending-row${left ? '' : ' is-expired'}">
            ${tinviteAvatarHTML(i, i.student_id, 'p-avatar')}
            <span class="p-op-texto"><b>${escapeHTML(i.display_name || i.username || t('admin.common.removedUser'))}</b>
              <small>@${escapeHTML(i.username || '')} · ${escapeHTML(tinviteLangLabel(i.language_app_key))} · ${left ? tp('tinvite.pending.daysLeft', left) : t('tinvite.pending.expired')}</small></span>
            <span class="p-acoes">${left ? '' : `<button type="button" class="outline p-pequeno" data-tinv-resend="${escapeHTML(i.student_id)}" data-tinv-resend-lang="${escapeHTML(i.language_app_key)}">${t('tinvite.pending.resend')}</button>`}<button type="button" class="outline secondary p-pequeno" data-tinv-cancel="${i.id}">${t('tinvite.pending.cancel')}</button></span>
          </li>`;
        }).join('')}
      </ul>
    </article>`;
}

function wireTeacherInviteSection(){
  const input = document.getElementById('tinv-search-input');
  if (!input) return;
  document.querySelectorAll('[data-tinv-lang]').forEach(btn => btn.addEventListener('click', () => {
    TINVITE_STATE.lang = btn.dataset.tinvLang;
    document.querySelectorAll('[data-tinv-lang]').forEach(b => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    if (TINVITE_STATE.selected) renderTinvPicked(TINVITE_STATE.selected);
    loadTinvLink(false);
  }));
  input.addEventListener('input', () => {
    clearTimeout(TINVITE_STATE.timer);
    TINVITE_STATE.timer = setTimeout(() => runTinvSearch(input.value), 220);
  });
  input.addEventListener('keydown', (e) => {
    const n = TINVITE_STATE.results.length;
    if (e.key === 'ArrowDown' && n){ e.preventDefault(); setTinvActive((TINVITE_STATE.active + 1) % n); }
    else if (e.key === 'ArrowUp' && n){ e.preventDefault(); setTinvActive((TINVITE_STATE.active - 1 + n) % n); }
    else if (e.key === 'Enter'){
      e.preventDefault();
      clearTimeout(TINVITE_STATE.timer);
      const pick = TINVITE_STATE.results[TINVITE_STATE.active >= 0 ? TINVITE_STATE.active : 0];
      if (pick && TINVITE_STATE.query === input.value.trim()) pickTinvAccount(pick);
      else runTinvSearch(input.value, true);
    } else if (e.key === 'Escape'){ closeTinvList(); }
  });
  input.addEventListener('blur', () => setTimeout(closeTinvList, 120));
  document.querySelectorAll('[data-tinv-cancel]').forEach(btn => btn.addEventListener('click', async () => {
    if (!(await tinviteConfirm(t('tinvite.pending.cancelConfirm'), t('tinvite.pending.cancel')))) return;
    btn.disabled = true;
    await removeStudentLink(Number(btn.dataset.tinvCancel));
    renderAdminStudentsView();
  }));
  document.querySelectorAll('[data-tinv-resend]').forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    const ok = await sendTeacherInvite(btn.dataset.tinvResend, btn.dataset.tinvResendLang);
    if (ok) renderAdminStudentsView(); else btn.disabled = false;
  }));
  loadTinvLink(false);
}

async function runTinvSearch(raw, pickFirst){
  const status = document.getElementById('tinv-search-status');
  if (!status) return;
  const q = plnSearchTerm(raw);
  TINVITE_STATE.query = String(raw || '').trim();
  if (q.length < 2){
    TINVITE_STATE.results = [];
    closeTinvList();
    status.textContent = q.length ? t('plans.search.short') : '';
    return;
  }
  const seq = ++TINVITE_STATE.seq;
  // 080: search_accounts (conta privada só pelo @ exato). Sem a RPC, busca na tabela.
  let { data, error } = await supabaseClient.rpc('search_accounts', { p_query: q, p_limit: 8 });
  if (error || !Array.isArray(data)){
    ({ data, error } = await supabaseClient
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .order('username', { ascending: true })
      .limit(8));
  }
  if (seq !== TINVITE_STATE.seq) return;
  if (error){ status.textContent = t('plans.search.error'); closeTinvList(); return; }
  const lc = q.toLowerCase();
  const rows = (data || []).filter(p => p.user_id !== CURRENT_USER?.id).sort((a, b) => {
    const sa = String(a.username || '').toLowerCase().startsWith(lc) ? 0 : 1;
    const sb = String(b.username || '').toLowerCase().startsWith(lc) ? 0 : 1;
    return sa - sb;
  });
  TINVITE_STATE.results = rows;
  TINVITE_STATE.active = rows.length ? 0 : -1;
  status.textContent = rows.length ? '' : t('plans.search.none', { q: TINVITE_STATE.query });
  if (pickFirst && rows.length === 1){ pickTinvAccount(rows[0]); return; }
  renderTinvList();
}

function renderTinvList(){
  const list = document.getElementById('tinv-search-list');
  const box = document.getElementById('tinv-search-input');
  const rows = TINVITE_STATE.results;
  if (!list || !rows.length){ closeTinvList(); return; }
  list.innerHTML = rows.map((p, i) => `
    <li role="option" id="tinv-opt-${i}" data-tinv-opcao data-i="${i}" aria-selected="${i === TINVITE_STATE.active}"${i === TINVITE_STATE.active ? ' class="p-ativo"' : ''}>
      ${tinviteAvatarHTML(p, p.user_id, 'p-avatar')}
      <span class="p-op-texto"><b>${escapeHTML(p.display_name || p.username)}</b><small data-opcao-usuario>@${escapeHTML(p.username || '')}</small></span>
    </li>`).join('');
  list.hidden = false;
  box.setAttribute('aria-expanded', 'true');
  list.querySelectorAll('[data-tinv-opcao]').forEach(li => {
    li.addEventListener('mousedown', (e) => { e.preventDefault(); pickTinvAccount(TINVITE_STATE.results[+li.dataset.i]); });
  });
}

function setTinvActive(i){
  TINVITE_STATE.active = i;
  document.querySelectorAll('#tinv-search-list [data-tinv-opcao]').forEach(li => { li.setAttribute('aria-selected', String(+li.dataset.i === i)); li.classList.toggle('p-ativo', +li.dataset.i === i); });
  document.getElementById('tinv-search-input')?.setAttribute('aria-activedescendant', `tinv-opt-${i}`);
  document.getElementById(`tinv-opt-${i}`)?.scrollIntoView({ block: 'nearest' });
}

function closeTinvList(){
  const list = document.getElementById('tinv-search-list');
  if (list){ list.hidden = true; list.innerHTML = ''; }
  document.getElementById('tinv-search-input')?.setAttribute('aria-expanded', 'false');
}

function pickTinvAccount(profile){
  if (!profile) return;
  closeTinvList();
  const input = document.getElementById('tinv-search-input');
  input.value = `@${profile.username || ''}`;
  TINVITE_STATE.query = input.value;
  TINVITE_STATE.selected = profile;
  renderTinvPicked(profile);
}

// Atualiza só o cartão da pessoa escolhida (não re-renderiza a busca).
function renderTinvPicked(profile){
  const box = document.getElementById('tinv-picked');
  if (!box) return;
  box.innerHTML = `
    <div class="p-conta p-pessoa" style="gap:.7rem;padding:.6rem;border:1px solid var(--p-linha);border-radius:12px;margin-top:.5rem">
      ${tinviteAvatarHTML(profile, profile.user_id, 'p-avatar')}
      <span class="p-op-texto"><b>${escapeHTML(profile.display_name || profile.username)}</b><small>@${escapeHTML(profile.username || '')}</small></span>
    </div>
    <button type="button" id="tinv-send-btn" style="margin-top:.7rem">${t('tinvite.send', { lang: tinviteLangWord(TINVITE_STATE.lang) })}</button>
    <p class="profile-edit-error" id="tinv-send-error" role="alert"></p>`;
  document.getElementById('tinv-send-btn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    const ok = await sendTeacherInvite(profile.user_id, TINVITE_STATE.lang, document.getElementById('tinv-send-error'));
    if (ok) renderAdminStudentsView(); else e.target.disabled = false;
  });
}

async function sendTeacherInvite(studentId, lang, errorEl){
  const { data, error } = await supabaseClient.rpc('teacher_invite_student', { p_student: studentId, p_lang: lang });
  const code = error ? 'generic' : data?.error;
  if (error || code){
    if (error) console.error('Erro ao convidar aluno:', error);
    if (errorEl) errorEl.textContent = tinviteErrorText(code);
    else showToast(tinviteErrorText(code));
    return false;
  }
  showToast(t('tinvite.sentToast'));
  return true;
}

// ---------- Professora: link de convite ----------
function teacherInviteURL(code, lang){
  const dir = TINVITE_LANG_DIR[lang] || 'fr';
  const root = window.location.pathname.replace(/(?:fr|zh)\/(?:index\.html)?$/, '');
  return `${window.location.origin}${root}${dir}/?convite=${encodeURIComponent(code)}`;
}

async function loadTinvLink(reset){
  const box = document.getElementById('tinv-link');
  if (!box) return;
  const lang = TINVITE_STATE.lang;
  let code = !reset && TINVITE_STATE.links[lang];
  if (!code){
    box.innerHTML = '<div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span></div>';
    const { data, error } = await supabaseClient.rpc('teacher_invite_link', { p_lang: lang, p_reset: !!reset });
    if (error || !data?.code){
      if (error) console.error('Erro ao gerar link de convite:', error);
      box.innerHTML = `<p class="profile-edit-error">${tinviteErrorText(data?.error)}</p>`;
      return;
    }
    code = TINVITE_STATE.links[lang] = data.code;
  }
  if (TINVITE_STATE.lang !== lang) return;
  const url = teacherInviteURL(code, lang);
  const msg = t('tinvite.link.whatsText', { lang: tinviteLangWord(lang), url });
  box.innerHTML = `
    <label class="p-so-leitor" for="tinv-link-input">${t('tinvite.link.title')}</label>
    <input id="tinv-link-input" readonly value="${escapeHTML(url)}" style="margin-bottom:.5rem">
    <div class="p-acoes" style="justify-content:flex-start">
      <button type="button" class="outline" id="tinv-copy-btn">${t('tinvite.link.copy')}</button>
      <a role="button" class="outline" id="tinv-whats-btn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${t('tinvite.link.whatsapp')}</a>
      <button type="button" class="outline secondary" id="tinv-reset-btn">${t('tinvite.link.reset')}</button>
    </div>`;
  document.getElementById('tinv-link-input').addEventListener('focus', (e) => e.target.select());
  document.getElementById('tinv-copy-btn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); showToast(t('tinvite.link.copied')); }
    catch (e) { const el = document.getElementById('tinv-link-input'); el.focus(); el.select(); }
  });
  document.getElementById('tinv-reset-btn').addEventListener('click', async () => {
    if (!(await tinviteConfirm(t('tinvite.link.resetConfirm'), t('tinvite.link.reset')))) return;
    loadTinvLink(true);
  });
}

// ---------- Aluno: convites pendentes (faixa no topo da Trilha) ----------
async function refreshTeacherInviteBanner(){
  const view = document.getElementById('view-path');
  if (!view) return;
  let banner = document.getElementById('teacher-invite-banner');
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){ if (banner) banner.hidden = true; return; }
  const { data, error } = await supabaseClient.rpc('my_teacher_invites');
  const invites = !error && Array.isArray(data) ? data : [];
  if (!invites.length){ if (banner) banner.hidden = true; return; }
  if (!banner){
    banner = document.createElement('div');
    banner.id = 'teacher-invite-banner';
    view.prepend(banner);
  }
  banner.hidden = false;
  banner.innerHTML = invites.map(i => `
    <div class="tinv-banner" role="region" aria-label="${escapeHTML(t('tinvite.card.kicker'))}">
      ${tinviteAvatarHTML(i, i.teacher_id, 'tinv-avatar')}
      <div class="tinv-banner-text">
        <span class="tinv-banner-title">${escapeHTML(t('tinvite.banner.title', { name: i.teacher_name, lang: tinviteLangWord(i.language_app_key) }))}</span>
        <span class="tinv-pending-meta">@${escapeHTML(i.teacher_username || '')} · ${tp('tinvite.pending.daysLeft', tinviteDaysLeft(i.invited_at) || 1)}</span>
      </div>
      <div class="tinv-banner-actions">
        <button type="button" class="btn btn-secondary tinv-small-btn" data-tinv-open="${i.link_id}">${t('tinvite.banner.see')}</button>
      </div>
    </div>`).join('');
  banner.querySelectorAll('[data-tinv-open]').forEach(btn => btn.addEventListener('click', () => {
    const inv = invites.find(x => String(x.link_id) === btn.dataset.tinvOpen);
    if (inv) openTeacherInviteCard({ kind: 'link', invite: inv, info: inv });
  }));
}

// ---------- Cartão do convite (link ou convite pendente) ----------
// kind: "code" (veio do link; com guest=true, sem login: "Entrar para aceitar")
// ou "link" (convite pendente da busca: Aceitar / Recusar).
function openTeacherInviteCard({ kind, info, code, invite, guest }){
  closeTeacherInviteCard();
  const name = info.teacher_name || info.teacher_username || '';
  const lang = tinviteLangWord(info.language_app_key);
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay tinv-overlay';
  overlay.id = 'teacher-invite-modal';
  overlay.innerHTML = `
    <div class="app-modal tinv-card" role="dialog" aria-modal="true" aria-labelledby="tinv-card-title">
      <button type="button" class="app-modal-close tinv-card-close" aria-label="${escapeHTML(t('common.close'))}">✕</button>
      <div class="tinv-hero" aria-hidden="true"><span class="tinv-hero-seal">🎓</span></div>
      <div class="tinv-card-avatar">${tinviteAvatarHTML(info, info.teacher_id || name, 'tinv-avatar-lg')}</div>
      <div class="tinv-card-body">
        <p class="tinv-kicker">${t('tinvite.card.kicker')}</p>
        <h3 id="tinv-card-title" class="tinv-card-title">${escapeHTML(t('tinvite.card.title', { name, lang }))}</h3>
        ${info.teacher_username ? `<p class="tinv-card-user">@${escapeHTML(info.teacher_username)}</p>` : ''}
        <ul class="tinv-perks">
          <li><span aria-hidden="true">📊</span>${escapeHTML(t('tinvite.card.perkProgress', { lang }))}</li>
          <li><span aria-hidden="true">🗂️</span>${escapeHTML(t('tinvite.card.perkCards'))}</li>
          <li><span aria-hidden="true">🎖️</span>${escapeHTML(t('tinvite.card.perkBadge'))}</li>
        </ul>
        <p class="profile-edit-error tinv-card-error" role="alert"></p>
        <div class="tinv-card-actions">
          <button type="button" class="btn btn-primary btn-block" data-tinv-act="accept">${guest ? t('tinvite.card.loginToAccept') : t('tinvite.card.accept')}</button>
          <button type="button" class="btn tinv-ghost btn-block" data-tinv-act="${kind === 'link' ? 'decline' : 'later'}">${kind === 'link' ? t('tinvite.card.decline') : t('tinvite.card.later')}</button>
        </div>
        <p class="tinv-card-foot">${t('tinvite.card.foot')}</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { closeTeacherInviteCard(); if (guest) goToNeutralGate(); };
  overlay.querySelector('.tinv-card-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const errEl = overlay.querySelector('.tinv-card-error');
  overlay.querySelectorAll('[data-tinv-act]').forEach(btn => btn.addEventListener('click', async () => {
    const act = btn.dataset.tinvAct;
    if (guest){
      // O código continua guardado no aparelho: depois do login o cartão volta.
      if (act !== 'accept') tinviteForgetCode();
      goToNeutralGate();
      return;
    }
    if (act === 'later'){ tinviteForgetCode(); closeTeacherInviteCard(); return; }
    btn.disabled = true;
    const { data, error } = kind === 'link'
      ? await supabaseClient.rpc('respond_teacher_invite', { p_link_id: invite.link_id, p_accept: act === 'accept' })
      : await supabaseClient.rpc('accept_invite_code', { p_code: code });
    if (error || data?.error){
      if (error) console.error('Erro ao responder convite:', error);
      errEl.textContent = tinviteErrorText(error ? 'generic' : data.error);
      btn.disabled = false;
      if (kind === 'code' && ['invalid_code', 'already_student', 'student_has_teacher', 'invalid_target'].includes(data?.error)) tinviteForgetCode();
      return;
    }
    if (kind === 'code') tinviteForgetCode();
    closeTeacherInviteCard();
    showToast(act === 'accept' ? t('tinvite.acceptedToast', { name, lang }) : t('tinvite.declinedToast'));
    if (act === 'accept' && typeof loadMyPermissions === 'function'){
      await loadMyPermissions(true);
      if (typeof applyRoleNavUI === 'function') applyRoleNavUI();
    }
    refreshTeacherInviteBanner();
  }));
  overlay.querySelector('[data-tinv-act="accept"]').focus();
}

function closeTeacherInviteCard(){ document.getElementById('teacher-invite-modal')?.remove(); }

function tinviteStoredCode(){
  try { const c = window.localStorage.getItem(TINVITE_CODE_KEY); return c && TINVITE_CODE_RE.test(c) ? c : null; } catch (e) { return null; }
}
function tinviteForgetCode(){ try { window.localStorage.removeItem(TINVITE_CODE_KEY); } catch (e) { /* nada */ } }

async function tinviteCodeInfo(code){
  const { data, error } = await supabaseClient.rpc('invite_code_info', { p_code: code });
  if (error || !data || data.error) return null;
  return data;
}

// Sem login: mostra o cartão antes de mandar para o portão de entrada.
// Devolve true se o cartão apareceu (quem chamou não redireciona).
async function teacherInviteGateIfPending(){
  const code = tinviteStoredCode();
  if (!code) return false;
  const info = await tinviteCodeInfo(code);
  if (!info){ tinviteForgetCode(); return false; }
  document.getElementById('login-screen')?.style.setProperty('display', 'none');
  openTeacherInviteCard({ kind: 'code', info, code, guest: true });
  return true;
}

// Depois do login: link guardado abre o cartão; senão, só a faixa da Trilha.
async function teacherInvitesAfterLogin(){
  const code = tinviteStoredCode();
  if (code){
    const info = await tinviteCodeInfo(code);
    if (info) openTeacherInviteCard({ kind: 'code', info, code });
    else { tinviteForgetCode(); showToast(t('tinvite.err.invalid_code')); }
  }
  refreshTeacherInviteBanner();
}
