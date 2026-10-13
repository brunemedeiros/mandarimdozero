// ---------- Mural da professora (migration 087, Etapa 4 do plano) ----------
// Plano e decisões da autora: docs/plano-professora-privacidade.md ("Etapa 4").
//
// Professora (Painel da professora > Mural): seletor Turmas | Alunos. Turmas lista as turmas (criar, alunos, link,
// nome, apagar); Alunos lista só quem NÃO está em turma (mural individual). Em cada mural: escrever, anexar PDF ou
// imagem, "Para" a turma toda ou um aluno só, editar/apagar os próprios recados, apagar qualquer post/comentário.
// Aluno (menu Mais > Mural, "+N" no Perfil): o mural individual com a professora e o de cada turma. Posta, comenta e
// só apaga o que é dele. Link ?turma=CODIGO: cartão para entrar na turma (vira aluno se ainda não for).
// Quem barra de verdade é o banco (RPCs security definer da 087 e as policies do bucket privado 'mural').
//
// Depende de: shared/supabase-client.js, shared/auth.js (CURRENT_USER, goToNeutralGate), shared/permissions.js,
// shared/profile.js (escapeHTML, avatarInitials, avatarColor), shared/toast.js, shared/utils.js (loadingHTML),
// shared/i18n (t, tp), shared/teacher-invites.js (tinviteLangWord), fr/zh app.js (APP_KEY, switchTab).

const MURAL_MAX_FILES = 5;
const MURAL_MAX_BYTES = 10 * 1024 * 1024;
const MURAL_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MURAL_CODE_KEY = 'pendingClassroomCode';
const MURAL_CODE_RE = /^[a-z0-9]{10}$/;
const MURAL_LANG_DIR = { frances: 'fr', mandarim: 'zh' };
const MURAL_STATE = {
  list: null,
  teacher: { mode: 'classrooms', classroomId: null, studentId: null, links: {} },
  student: { key: null },
  files: new Map(),     // composer (elemento) -> [{ blob, name, type, size }]
  badgeTimer: null,
};

(function captureClassroomCodeParam(){
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('turma')) return;
    const code = (params.get('turma') || '').trim().toLowerCase();
    if (MURAL_CODE_RE.test(code)) window.localStorage.setItem(MURAL_CODE_KEY, code);
    params.delete('turma');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch (e) { /* storage bloqueado: o link simplesmente não é lembrado */ }
})();

// ---------- Utilidades ----------
async function muralRpc(name, args){
  const { data, error } = await supabaseClient.rpc(name, args || {});
  if (error){ console.error(`Erro em ${name}:`, error); return { error: 'generic' }; }
  return data && typeof data === 'object' ? data : { error: 'generic' };
}

function muralErrorText(code){
  const known = ['not_authorized', 'not_member', 'empty', 'too_long', 'daily_limit', 'invalid_attachments', 'invalid_name',
    'classroom_limit', 'not_found', 'no_teacher', 'upload', 'invalid_code', 'student_has_teacher', 'invalid_target'];
  return t(`mural.err.${known.includes(code) ? code : 'generic'}`);
}

function muralAvatarHTML(person, cls){
  const name = person?.name || person?.username || '?';
  return person?.avatar
    ? `<img class="${cls || 'mural-avatar'}" src="${escapeHTML(person.avatar)}" alt="">`
    : `<span class="${cls || 'mural-avatar'}" style="background:${avatarColor(person?.id || name)};" aria-hidden="true">${escapeHTML(avatarInitials(name))}</span>`;
}

function muralCountHTML(n){
  return n > 0 ? `<span class="mural-count" aria-label="${escapeHTML(tp('mural.newCount', n))}">${n > 99 ? '99+' : n}</span>` : '';
}

function muralTimeLabel(iso){
  const d = new Date(iso);
  if (Date.now() - d.getTime() < 7 * 86400000 && typeof notificationTimeAgoLabel === 'function') return notificationTimeAgoLabel(iso);
  return fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Texto do usuário: escapa tudo e só depois transforma URLs em link.
function muralBodyHTML(text){
  return escapeHTML(text || '').replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}

function muralFileSize(n){
  return n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function muralSafeName(name){
  const base = String(name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return (base || 'arquivo').slice(-80);
}

function muralLangWord(lang){
  return typeof tinviteLangWord === 'function' ? tinviteLangWord(lang) : lang;
}

// ---------- Lista e "+N" ----------
async function muralLoadList(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) { MURAL_STATE.list = null; return null; }
  const data = await muralRpc('mural_list', { p_lang: APP_KEY });
  MURAL_STATE.list = data.error ? null : data;
  return MURAL_STATE.list;
}

function muralStudentUnread(list){
  const s = list?.as_student;
  if (!s) return 0;
  return (s.individual_unread || 0) + (s.classrooms || []).reduce((a, c) => a + (c.unread || 0), 0);
}

function muralTeacherUnread(list){
  const tch = list?.as_teacher;
  if (!tch) return 0;
  return (tch.classrooms || []).reduce((a, c) => a + (c.unread || 0), 0) + (tch.roster || []).reduce((a, s) => a + (s.unread || 0), 0);
}

function muralSetPill(el, n){
  if (!el) return;
  let pill = el.querySelector(':scope > .mural-count');
  if (n > 0){
    if (!pill){ pill = document.createElement('span'); pill.className = 'mural-count'; el.appendChild(pill); }
    pill.textContent = n > 99 ? '99+' : String(n);
    pill.setAttribute('aria-label', tp('mural.newCount', n));
  } else if (pill) pill.remove();
}

function muralApplyBadges(){
  const list = MURAL_STATE.list;
  const sN = muralStudentUnread(list);
  const tN = muralTeacherUnread(list);
  const btn = document.getElementById('my-mural-btn');
  if (btn){ btn.style.display = list?.as_student ? '' : 'none'; muralSetPill(btn, sN); }
  document.querySelectorAll('.tab-btn[data-tab="profile"]').forEach(el => muralSetPill(el, sN));
  muralSetPill(document.getElementById('mais-btn'), sN);
  document.querySelectorAll('#teacher-panel-btn, .teacher-only-nav[data-tab="teacher-panel"], [data-teacher-section="mural"]').forEach(el => muralSetPill(el, tN));
  const entry = document.getElementById('profile-mural-entry');
  if (entry){
    entry.innerHTML = list?.as_student ? `
      <button type="button" class="mural-profile-entry" data-mural-open>
        <span class="mural-profile-entry-icon" aria-hidden="true">📌</span>
        <span class="mural-profile-entry-text"><strong>${t('mural.title')}</strong>
          <span>${sN > 0 ? escapeHTML(tp('mural.newCount', sN)) : escapeHTML(t('mural.profileEntrySub'))}</span></span>
        ${muralCountHTML(sN)}
      </button>` : '';
    entry.querySelector('[data-mural-open]')?.addEventListener('click', () => switchTab('my-mural'));
  }
}

async function refreshMuralBadges(){
  await muralLoadList();
  muralApplyBadges();
}

function scheduleMuralBadgeRefresh(){
  clearInterval(MURAL_STATE.badgeTimer);
  MURAL_STATE.badgeTimer = setInterval(() => { if (document.visibilityState === 'visible') refreshMuralBadges(); }, 180000);
}

// ---------- Arquivos ----------
async function muralPrepareFile(file){
  if (!MURAL_TYPES.includes(file.type)) return { error: t('mural.file.badType', { name: file.name }) };
  if (file.type !== 'application/pdf'){
    // Foto de celular: reduz para no máximo 1600 px e JPEG antes de subir (fica com centenas de KB).
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.82));
      if (blob && blob.size < file.size){
        return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', size: blob.size };
      }
    } catch (e) { /* navegador sem createImageBitmap: sobe o original */ }
  }
  if (file.size > MURAL_MAX_BYTES) return { error: t('mural.file.tooBig', { name: file.name }) };
  return { blob: file, name: file.name, type: file.type, size: file.size };
}

async function muralUploadFiles(files, teacherId){
  const done = [];
  for (const f of files){
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${teacherId}/${CURRENT_USER.id}/${Date.now().toString(36)}-${rand}-${muralSafeName(f.name)}`;
    const { error } = await supabaseClient.storage.from('mural').upload(path, f.blob, { contentType: f.type, upsert: false });
    if (error){
      console.error('Erro ao enviar anexo do mural:', error);
      await muralRemoveFiles(done.map(d => d.path));
      return null;
    }
    done.push({ path, name: String(f.name).slice(0, 200), type: f.type, size: f.size });
  }
  return done;
}

async function muralRemoveFiles(paths){
  const list = (paths || []).filter(Boolean);
  if (!list.length) return;
  const { error } = await supabaseClient.storage.from('mural').remove(list);
  if (error) console.error('Erro ao apagar anexos do mural:', error);
}

async function muralFillSignedUrls(root){
  const nodes = [...root.querySelectorAll('[data-mural-path]')];
  const paths = [...new Set(nodes.map(n => n.dataset.muralPath))];
  if (!paths.length) return;
  const { data, error } = await supabaseClient.storage.from('mural').createSignedUrls(paths, 3600);
  if (error || !Array.isArray(data)){ if (error) console.error('Erro ao abrir anexos do mural:', error); return; }
  const byPath = new Map(data.filter(d => d && d.signedUrl).map(d => [d.path, d.signedUrl]));
  nodes.forEach(n => {
    const url = byPath.get(n.dataset.muralPath);
    if (!url) return;
    if (n.tagName === 'IMG') n.src = url; else n.href = url;
  });
}

// ---------- Post, comentários e escrever ----------
function muralAttachmentsHTML(list){
  if (!list || !list.length) return '';
  return `<div class="mural-files">${list.map(a => a.type === 'application/pdf'
    ? `<a class="mural-file" data-mural-path="${escapeHTML(a.path)}" target="_blank" rel="noopener">
         <span aria-hidden="true">📄</span><span class="mural-file-name">${escapeHTML(a.name)}</span>
         <span class="mural-file-size">${muralFileSize(a.size)}</span></a>`
    : `<a class="mural-file-img" data-mural-path="${escapeHTML(a.path)}" target="_blank" rel="noopener" aria-label="${escapeHTML(a.name)}">
         <img data-mural-path="${escapeHTML(a.path)}" alt="${escapeHTML(a.name)}" loading="lazy"></a>`).join('')}</div>`
}

function muralCommentHTML(c){
  return `
    <li class="mural-comment" data-comment-id="${c.id}">
      ${muralAvatarHTML(c.author, 'mural-avatar mural-avatar-sm')}
      <div class="mural-comment-main">
        <div class="mural-comment-head">
          <span class="mural-author">${escapeHTML(c.author?.name || '')}</span>
          ${c.by_teacher ? `<span class="mural-tag">${t('mural.teacherTag')}</span>` : ''}
          <span class="mural-meta">${escapeHTML(muralTimeLabel(c.created_at))}</span>
          ${c.can_delete ? `<button type="button" class="mural-icon-btn" data-mural-del-comment="${c.id}" aria-label="${escapeHTML(t('mural.delete'))}" title="${escapeHTML(t('mural.delete'))}">✕</button>` : ''}
        </div>
        <p class="mural-comment-body">${muralBodyHTML(c.body)}</p>
      </div>
    </li>`;
}

function muralPostHTML(p){
  return `
    <article class="mural-post${p.by_teacher ? ' is-teacher' : ''}" data-post-id="${p.id}">
      <header class="mural-post-head">
        ${muralAvatarHTML(p.author)}
        <div class="mural-post-who">
          <span class="mural-author">${escapeHTML(p.author?.name || '')}</span>
          ${p.by_teacher ? `<span class="mural-tag">${t('mural.teacherTag')}</span>` : ''}
          <span class="mural-meta">${escapeHTML(muralTimeLabel(p.created_at))}${p.edited_at ? ` · ${t('mural.edited')}` : ''}</span>
        </div>
        <div class="mural-post-actions">
          ${p.can_edit ? `<button type="button" class="mural-text-btn" data-mural-edit="${p.id}">${t('mural.edit')}</button>` : ''}
          ${p.can_delete ? `<button type="button" class="mural-text-btn is-danger" data-mural-del-post="${p.id}">${t('mural.delete')}</button>` : ''}
        </div>
      </header>
      ${p.target ? `<p class="mural-post-target">${escapeHTML(t('mural.onlyFor', { name: p.target.name }))}</p>` : ''}
      <div class="mural-post-content">
        ${p.body ? `<p class="mural-post-body">${muralBodyHTML(p.body)}</p>` : ''}
        ${muralAttachmentsHTML(p.attachments)}
      </div>
      <ul class="mural-comments">${(p.comments || []).map(muralCommentHTML).join('')}</ul>
      <form class="mural-comment-form" data-mural-comment-form="${p.id}">
        <label class="sr-only" for="mural-c-${p.id}">${t('mural.comment.label')}</label>
        <input id="mural-c-${p.id}" class="profile-edit-input" maxlength="2000" autocomplete="off" placeholder="${escapeHTML(t('mural.comment.placeholder'))}">
        <button type="submit" class="btn btn-secondary mural-small-btn">${t('mural.comment.send')}</button>
      </form>
    </article>`;
}

// ctx: { role: 'teacher'|'student', classroomId, studentId, members: [{id,name}] }
function muralComposerHTML(ctx){
  const target = ctx.role === 'teacher' && ctx.classroomId && (ctx.members || []).length ? `
    <label class="mural-target-wrap"><span>${t('mural.composer.toLabel')}</span>
      <select class="profile-edit-input mural-target">
        <option value="">${t('mural.composer.toAll')}</option>
        ${ctx.members.map(m => `<option value="${escapeHTML(m.id)}">${escapeHTML(t('mural.composer.toOne', { name: m.name }))}</option>`).join('')}
      </select></label>` : '';
  return `
    <form class="mural-composer">
      <label class="sr-only" for="mural-composer-text-${ctx.role}">${t('mural.composer.label')}</label>
      <textarea id="mural-composer-text-${ctx.role}" class="profile-edit-input mural-composer-text" maxlength="5000" rows="3"
        placeholder="${escapeHTML(t(ctx.role === 'teacher' ? 'mural.composer.placeholderTeacher' : 'mural.composer.placeholderStudent'))}"></textarea>
      <ul class="mural-composer-files"></ul>
      <div class="mural-composer-bar">
        <label class="btn tinv-ghost mural-small-btn mural-attach">${t('mural.composer.attach')}
          <input type="file" class="mural-file-input" multiple accept=".pdf,application/pdf,image/jpeg,image/png,image/webp" hidden></label>
        ${target}
        <button type="submit" class="btn btn-primary mural-small-btn mural-publish">${t('mural.composer.publish')}</button>
      </div>
      <p class="mural-composer-hint">${t('mural.composer.attachHint')}</p>
      <p class="profile-edit-error mural-composer-error" role="alert"></p>
    </form>`;
}

function muralRenderComposerFiles(form){
  const ul = form.querySelector('.mural-composer-files');
  const files = MURAL_STATE.files.get(form) || [];
  ul.innerHTML = files.map((f, i) => `
    <li class="mural-composer-file"><span aria-hidden="true">${f.type === 'application/pdf' ? '📄' : '🖼️'}</span>
      <span class="mural-file-name">${escapeHTML(f.name)}</span><span class="mural-file-size">${muralFileSize(f.size)}</span>
      <button type="button" class="mural-icon-btn" data-mural-unfile="${i}" aria-label="${escapeHTML(t('mural.composer.removeFile', { name: f.name }))}">✕</button></li>`).join('');
  ul.querySelectorAll('[data-mural-unfile]').forEach(b => b.addEventListener('click', () => {
    files.splice(Number(b.dataset.muralUnfile), 1);
    muralRenderComposerFiles(form);
  }));
}

function wireMuralComposer(form, ctx, teacherId, reload){
  MURAL_STATE.files.set(form, []);
  const err = form.querySelector('.mural-composer-error');
  form.querySelector('.mural-file-input').addEventListener('change', async (e) => {
    err.textContent = '';
    const files = MURAL_STATE.files.get(form);
    for (const file of [...e.target.files]){
      if (files.length >= MURAL_MAX_FILES){ err.textContent = t('mural.file.tooMany'); break; }
      const prepared = await muralPrepareFile(file);
      if (prepared.error){ err.textContent = prepared.error; continue; }
      files.push(prepared);
    }
    e.target.value = '';
    muralRenderComposerFiles(form);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const text = form.querySelector('.mural-composer-text');
    const body = text.value.trim();
    const files = MURAL_STATE.files.get(form) || [];
    if (!body && !files.length){ err.textContent = muralErrorText('empty'); return; }
    const btn = form.querySelector('.mural-publish');
    btn.disabled = true; btn.textContent = t('mural.composer.sending');
    const finish = () => { btn.disabled = false; btn.textContent = t('mural.composer.publish'); };
    const uploaded = files.length ? await muralUploadFiles(files, teacherId) : [];
    if (!uploaded){ err.textContent = muralErrorText('upload'); finish(); return; }
    const target = form.querySelector('.mural-target')?.value || null;
    const res = await muralRpc('mural_create_post', {
      p_lang: APP_KEY, p_classroom_id: ctx.classroomId || null,
      p_student_id: ctx.role === 'teacher' ? (ctx.classroomId ? target : ctx.studentId) : null,
      p_body: body, p_attachments: uploaded,
    });
    if (res.error){ await muralRemoveFiles(uploaded.map(u => u.path)); err.textContent = muralErrorText(res.error); finish(); return; }
    text.value = '';
    const targetSel = form.querySelector('.mural-target');
    if (targetSel) targetSel.value = '';  // o próximo recado volta a ser para a turma toda
    MURAL_STATE.files.set(form, []);
    muralRenderComposerFiles(form);
    finish();
    reload();
  });
}

async function renderMuralFeed(board, ctx){
  const feed = board.querySelector('.mural-feed');
  feed.innerHTML = loadingHTML();
  const data = await muralRpc('mural_feed', { p_lang: APP_KEY, p_classroom_id: ctx.classroomId || null, p_student_id: ctx.role === 'teacher' ? (ctx.studentId || null) : null });
  if (data.error){ feed.innerHTML = `<p class="profile-empty-note">${escapeHTML(muralErrorText(data.error))}</p>`; return; }
  const posts = Array.isArray(data.posts) ? data.posts : [];
  feed.innerHTML = posts.length ? posts.map(muralPostHTML).join('') : `<p class="profile-empty-note">${t('mural.empty')}</p>`;
  const reload = () => renderMuralFeed(board, ctx);
  feed.querySelectorAll('[data-mural-comment-form]').forEach(form => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const body = input.value.trim();
    if (!body) return;
    const btn = form.querySelector('button'); btn.disabled = true;
    const res = await muralRpc('mural_add_comment', { p_post_id: Number(form.dataset.muralCommentForm), p_body: body });
    btn.disabled = false;
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    reload();
  }));
  feed.querySelectorAll('[data-mural-del-comment]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(t('mural.deleteCommentConfirm'))) return;
    const res = await muralRpc('mural_delete_comment', { p_comment_id: Number(b.dataset.muralDelComment) });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    reload();
  }));
  feed.querySelectorAll('[data-mural-del-post]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(t('mural.deletePostConfirm'))) return;
    const res = await muralRpc('mural_delete_post', { p_post_id: Number(b.dataset.muralDelPost) });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    await muralRemoveFiles(res.removed_paths);
    reload();
  }));
  feed.querySelectorAll('[data-mural-edit]').forEach(b => b.addEventListener('click', () => {
    const post = posts.find(p => String(p.id) === b.dataset.muralEdit);
    if (post) openMuralEdit(feed.querySelector(`[data-post-id="${post.id}"]`), post, reload);
  }));
  muralFillSignedUrls(feed);
  refreshMuralBadges();
}

function openMuralEdit(article, post, reload){
  const content = article.querySelector('.mural-post-content');
  const keep = new Set((post.attachments || []).map(a => a.path));
  content.innerHTML = `
    <form class="mural-edit-form">
      <label class="sr-only" for="mural-edit-${post.id}">${t('mural.edit')}</label>
      <textarea id="mural-edit-${post.id}" class="profile-edit-input mural-composer-text" maxlength="5000" rows="4">${escapeHTML(post.body || '')}</textarea>
      <ul class="mural-composer-files">${(post.attachments || []).map(a => `
        <li class="mural-composer-file"><span aria-hidden="true">${a.type === 'application/pdf' ? '📄' : '🖼️'}</span>
          <span class="mural-file-name">${escapeHTML(a.name)}</span>
          <button type="button" class="mural-icon-btn" data-mural-drop="${escapeHTML(a.path)}" aria-label="${escapeHTML(t('mural.composer.removeFile', { name: a.name }))}">✕</button></li>`).join('')}</ul>
      <div class="mural-composer-bar">
        <button type="button" class="btn tinv-ghost mural-small-btn" data-mural-edit-cancel>${t('mural.cancel')}</button>
        <button type="submit" class="btn btn-primary mural-small-btn">${t('mural.save')}</button>
      </div>
      <p class="profile-edit-error" role="alert"></p>
    </form>`;
  const form = content.querySelector('form');
  form.querySelectorAll('[data-mural-drop]').forEach(b => b.addEventListener('click', () => { keep.delete(b.dataset.muralDrop); b.closest('li').remove(); }));
  form.querySelector('[data-mural-edit-cancel]').addEventListener('click', reload);
  form.querySelector('textarea').focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await muralRpc('mural_update_post', { p_post_id: post.id, p_body: form.querySelector('textarea').value,
      p_attachments: (post.attachments || []).filter(a => keep.has(a.path)) });
    if (res.error){ form.querySelector('.profile-edit-error').textContent = muralErrorText(res.error); return; }
    await muralRemoveFiles(res.removed_paths);
    reload();
  });
}

// Quadro = escrever + lista. teacherId: dono da pasta dos anexos.
function mountMuralBoard(host, ctx, teacherId){
  host.innerHTML = `${muralComposerHTML(ctx)}<div class="mural-feed"></div>`;
  const board = host;
  wireMuralComposer(host.querySelector('.mural-composer'), ctx, teacherId, () => renderMuralFeed(board, ctx));
  renderMuralFeed(board, ctx);
}

// ---------- Professora ----------
function muralChipHTML(attrs, label, unread, active, avatar){
  return `<button type="button" class="mural-chip${active ? ' is-active' : ''}" ${attrs} aria-pressed="${active ? 'true' : 'false'}">
    ${avatar || ''}<span class="mural-chip-label">${escapeHTML(label)}</span>${muralCountHTML(unread)}</button>`;
}

async function renderTeacherMuralSection(){
  const wrap = document.getElementById('admin-mural-content');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML();
  const list = await muralLoadList();
  muralApplyBadges();
  const tch = list?.as_teacher;
  if (!tch){ wrap.innerHTML = `<p class="profile-empty-note">${muralErrorText('not_authorized')}</p>`; return; }
  const st = MURAL_STATE.teacher;
  const classrooms = tch.classrooms || [];
  const roster = tch.roster || [];
  const solo = roster.filter(s => !s.in_classroom);
  if (st.classroomId && !classrooms.some(c => c.id === st.classroomId)) st.classroomId = null;
  if (st.studentId && !solo.some(s => s.id === st.studentId)) st.studentId = null;
  const cUnread = classrooms.reduce((a, c) => a + (c.unread || 0), 0);
  const sUnread = solo.reduce((a, s) => a + (s.unread || 0), 0);
  const picker = st.mode === 'classrooms'
    ? `${classrooms.map(c => muralChipHTML(`data-mural-classroom="${c.id}"`, c.name, c.unread, c.id === st.classroomId)).join('')}
       <button type="button" class="mural-chip mural-chip-new" data-mural-new>${t('mural.newClassroom')}</button>`
    : solo.map(s => muralChipHTML(`data-mural-student="${escapeHTML(s.id)}"`, s.name, s.unread, s.id === st.studentId, muralAvatarHTML(s, 'mural-avatar mural-avatar-xs'))).join('');
  const empty = st.mode === 'classrooms'
    ? (classrooms.length ? t('mural.pickClassroom') : t('mural.noClassrooms'))
    : (!roster.length ? t('mural.noStudents') : (!solo.length ? t('mural.allInClassrooms') : t('mural.pickStudent')));
  wrap.innerHTML = `
    <div class="mural-wrap">
      <p class="mural-intro">${t('mural.teacherIntro')}</p>
      <div class="deck-topbar panel-subnav mural-mode" role="tablist" aria-label="${escapeHTML(t('mural.title'))}">
        <button type="button" class="deck-topbar-btn${st.mode === 'classrooms' ? ' is-active' : ''}" role="tab" aria-selected="${st.mode === 'classrooms'}" data-mural-mode="classrooms">${t('mural.mode.classrooms')}${muralCountHTML(cUnread)}</button>
        <button type="button" class="deck-topbar-btn${st.mode === 'students' ? ' is-active' : ''}" role="tab" aria-selected="${st.mode === 'students'}" data-mural-mode="students">${t('mural.mode.students')}${muralCountHTML(sUnread)}</button>
      </div>
      <div class="mural-picker">${picker}</div>
      <form class="mural-new-form" hidden>
        <label class="sr-only" for="mural-new-name">${t('mural.newClassroomPh')}</label>
        <input id="mural-new-name" class="profile-edit-input" maxlength="60" placeholder="${escapeHTML(t('mural.newClassroomPh'))}">
        <button type="submit" class="btn btn-primary mural-small-btn">${t('mural.create')}</button>
        <button type="button" class="btn tinv-ghost mural-small-btn" data-mural-new-cancel>${t('mural.cancel')}</button>
        <p class="profile-edit-error" role="alert"></p>
      </form>
      <div class="mural-manage-host"></div>
      <div class="mural-board-host">${(st.mode === 'classrooms' ? st.classroomId : st.studentId) ? '' : `<p class="profile-empty-note">${empty}</p>`}</div>
    </div>`;
  wrap.querySelectorAll('[data-mural-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.muralMode; renderTeacherMuralSection(); }));
  wrap.querySelectorAll('[data-mural-classroom]').forEach(b => b.addEventListener('click', () => { st.classroomId = Number(b.dataset.muralClassroom); renderTeacherMuralSection(); }));
  wrap.querySelectorAll('[data-mural-student]').forEach(b => b.addEventListener('click', () => { st.studentId = b.dataset.muralStudent; renderTeacherMuralSection(); }));
  const newForm = wrap.querySelector('.mural-new-form');
  wrap.querySelector('[data-mural-new]')?.addEventListener('click', () => { newForm.hidden = false; newForm.querySelector('input').focus(); });
  newForm.querySelector('[data-mural-new-cancel]').addEventListener('click', () => { newForm.hidden = true; });
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await muralRpc('mural_save_classroom', { p_lang: APP_KEY, p_id: null, p_name: newForm.querySelector('input').value });
    if (res.error){ newForm.querySelector('.profile-edit-error').textContent = muralErrorText(res.error); return; }
    st.classroomId = res.id;
    st.openManage = true;
    renderTeacherMuralSection();
  });
  const boardHost = wrap.querySelector('.mural-board-host');
  if (st.mode === 'classrooms' && st.classroomId){
    const c = classrooms.find(x => x.id === st.classroomId);
    const members = (c.members || []).map(id => roster.find(s => s.id === id)).filter(Boolean);
    renderMuralManage(wrap.querySelector('.mural-manage-host'), c, roster, !!st.openManage);
    st.openManage = false;
    mountMuralBoard(boardHost, { role: 'teacher', classroomId: c.id, members }, CURRENT_USER.id);
  } else if (st.mode === 'students' && st.studentId){
    mountMuralBoard(boardHost, { role: 'teacher', studentId: st.studentId }, CURRENT_USER.id);
  }
}

function muralClassroomURL(code){
  const dir = MURAL_LANG_DIR[APP_KEY] || 'fr';
  const root = window.location.pathname.replace(/(?:fr|zh)\/(?:index\.html)?$/, '');
  return `${window.location.origin}${root}${dir}/?turma=${encodeURIComponent(code)}`;
}

function renderMuralManage(host, c, roster, open){
  const memberSet = new Set(c.members || []);
  host.innerHTML = `
    <details class="mural-manage"${open ? ' open' : ''}>
      <summary>${escapeHTML(t('mural.manage.summary', { n: memberSet.size }))}</summary>
      <div class="mural-manage-body">
        <form class="mural-manage-name">
          <label class="panel-h" for="mural-rename-${c.id}">${t('mural.manage.name')}</label>
          <div class="mural-inline">
            <input id="mural-rename-${c.id}" class="profile-edit-input" maxlength="60" value="${escapeHTML(c.name)}">
            <button type="submit" class="btn btn-secondary mural-small-btn">${t('mural.manage.saveName')}</button>
          </div>
        </form>
        <div class="mural-manage-members">
          <p class="panel-h">${t('mural.manage.members')}</p>
          <p class="mural-composer-hint">${t('mural.manage.membersHint')}</p>
          ${roster.length ? `
            <label class="sr-only" for="mural-member-filter-${c.id}">${t('mural.manage.filter')}</label>
            <input id="mural-member-filter-${c.id}" class="profile-edit-input mural-member-filter" placeholder="${escapeHTML(t('mural.manage.filter'))}" autocomplete="off">
            <ul class="mural-member-list">${roster.map(s => `
              <li data-member-name="${escapeHTML(((s.name || '') + ' ' + (s.username || '')).toLowerCase())}">
                <label class="mural-member"><input type="checkbox" value="${escapeHTML(s.id)}"${memberSet.has(s.id) ? ' checked' : ''}>
                  ${muralAvatarHTML(s, 'mural-avatar mural-avatar-xs')}<span>${escapeHTML(s.name || '')}</span>
                  ${s.username ? `<span class="mural-meta">@${escapeHTML(s.username)}</span>` : ''}</label></li>`).join('')}</ul>
            <button type="button" class="btn btn-primary mural-small-btn" data-mural-save-members>${t('mural.manage.saveMembers')}</button>`
          : `<p class="profile-empty-note">${t('mural.noStudents')}</p>`}
        </div>
        <div class="mural-manage-link">
          <p class="panel-h">${t('mural.manage.link')}</p>
          <p class="mural-composer-hint">${t('mural.manage.linkHint')}</p>
          <div class="mural-link-box"><button type="button" class="btn btn-secondary mural-small-btn" data-mural-link>${t('mural.manage.linkCreate')}</button></div>
        </div>
        <button type="button" class="btn tinv-ghost mural-small-btn is-danger" data-mural-del-classroom>${t('mural.manage.delete')}</button>
      </div>
    </details>`;
  host.querySelector('.mural-manage-name').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await muralRpc('mural_save_classroom', { p_lang: APP_KEY, p_id: c.id, p_name: host.querySelector(`#mural-rename-${c.id}`).value });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    showToast(t('mural.manage.saved'));
    renderTeacherMuralSection();
  });
  host.querySelector('.mural-member-filter')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase().replace(/^@/, '');
    host.querySelectorAll('[data-member-name]').forEach(li => { li.hidden = !!q && !li.dataset.memberName.includes(q); });
  });
  host.querySelector('[data-mural-save-members]')?.addEventListener('click', async () => {
    const ids = [...host.querySelectorAll('.mural-member-list input:checked')].map(i => i.value);
    const res = await muralRpc('mural_set_classroom_members', { p_id: c.id, p_student_ids: ids });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    showToast(t('mural.manage.saved'));
    renderTeacherMuralSection();
  });
  const linkBox = host.querySelector('.mural-link-box');
  const showLink = (code) => {
    const url = muralClassroomURL(code);
    const msg = t('mural.manage.linkWhatsText', { name: c.name, url });
    linkBox.innerHTML = `
      <div class="tinv-link-field"><label class="sr-only" for="mural-link-${c.id}">${t('mural.manage.link')}</label>
        <input id="mural-link-${c.id}" class="profile-edit-input" readonly value="${escapeHTML(url)}"></div>
      <div class="tinv-link-actions">
        <button type="button" class="btn btn-primary tinv-small-btn" data-mural-link-copy>${t('tinvite.link.copy')}</button>
        <a class="btn btn-secondary tinv-small-btn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${t('tinvite.link.whatsapp')}</a>
        <button type="button" class="btn tinv-ghost tinv-small-btn" data-mural-link-reset>${t('tinvite.link.reset')}</button>
      </div>`;
    linkBox.querySelector('input').addEventListener('focus', (e) => e.target.select());
    linkBox.querySelector('[data-mural-link-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); showToast(t('tinvite.link.copied')); }
      catch (e) { const el = linkBox.querySelector('input'); el.focus(); el.select(); }
    });
    linkBox.querySelector('[data-mural-link-reset]').addEventListener('click', async () => {
      if (!confirm(t('tinvite.link.resetConfirm'))) return;
      const res = await muralRpc('mural_classroom_link', { p_id: c.id, p_reset: true });
      if (res.error){ showToast(muralErrorText(res.error)); return; }
      MURAL_STATE.teacher.links[c.id] = res.code; showLink(res.code);
    });
  };
  if (MURAL_STATE.teacher.links[c.id]) showLink(MURAL_STATE.teacher.links[c.id]);
  else linkBox.querySelector('[data-mural-link]').addEventListener('click', async () => {
    const res = await muralRpc('mural_classroom_link', { p_id: c.id, p_reset: false });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    MURAL_STATE.teacher.links[c.id] = res.code; showLink(res.code);
  });
  host.querySelector('[data-mural-del-classroom]').addEventListener('click', async () => {
    if (!confirm(t('mural.manage.deleteConfirm', { name: c.name }))) return;
    const res = await muralRpc('mural_delete_classroom', { p_id: c.id });
    if (res.error){ showToast(muralErrorText(res.error)); return; }
    await muralRemoveFiles(res.removed_paths);
    MURAL_STATE.teacher.classroomId = null;
    renderTeacherMuralSection();
  });
}

// ---------- Aluno ----------
async function renderMyMuralView(){
  const wrap = document.getElementById('my-mural-content');
  if (!wrap) return;
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">${t('supportMaterials.loginRequired')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();
  const list = await muralLoadList();
  muralApplyBadges();
  const s = list?.as_student;
  if (!s){ wrap.innerHTML = `<p class="profile-empty-note">${t('mural.noTeacher')}</p>`; return; }
  const murals = [
    ...(s.classrooms || []).map(c => ({ key: `c:${c.id}`, label: c.name, unread: c.unread || 0, ctx: { role: 'student', classroomId: c.id } })),
    { key: 'i', label: t('mural.individualChip', { name: s.teacher?.name || '' }), unread: s.individual_unread || 0, ctx: { role: 'student' } },
  ];
  const st = MURAL_STATE.student;
  if (!murals.some(m => m.key === st.key)) st.key = (murals.find(m => m.unread > 0) || murals[0]).key;
  const cur = murals.find(m => m.key === st.key);
  wrap.innerHTML = `
    <div class="mural-wrap">
      <div class="mural-teacher-line">${muralAvatarHTML(s.teacher, 'mural-avatar mural-avatar-sm')}
        <span>${escapeHTML(t('mural.studentIntro', { name: s.teacher?.name || '', lang: muralLangWord(APP_KEY) }))}</span></div>
      ${murals.length > 1 ? `<div class="mural-picker">${murals.map(m => muralChipHTML(`data-mural-key="${escapeHTML(m.key)}"`, m.label, m.unread, m.key === st.key)).join('')}</div>` : ''}
      <div class="mural-board-host"></div>
    </div>`;
  wrap.querySelectorAll('[data-mural-key]').forEach(b => b.addEventListener('click', () => { st.key = b.dataset.muralKey; renderMyMuralView(); }));
  mountMuralBoard(wrap.querySelector('.mural-board-host'), cur.ctx, s.teacher.id);
}

// ---------- Link da turma (?turma=CODIGO) ----------
function muralStoredCode(){
  try { const c = window.localStorage.getItem(MURAL_CODE_KEY); return c && MURAL_CODE_RE.test(c) ? c : null; } catch (e) { return null; }
}
function muralForgetCode(){ try { window.localStorage.removeItem(MURAL_CODE_KEY); } catch (e) { /* nada */ } }

async function muralCodeInfo(code){
  const { data, error } = await supabaseClient.rpc('classroom_code_info', { p_code: code });
  if (error || !data || data.error) return null;
  return data;
}

function closeClassroomJoinCard(){ document.getElementById('classroom-join-modal')?.remove(); }

function openClassroomJoinCard(info, code, guest){
  closeClassroomJoinCard();
  const name = info.teacher_name || info.teacher_username || '';
  const lang = muralLangWord(info.language_app_key);
  const teacher = { id: info.teacher_id, name, avatar: info.teacher_avatar };
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay tinv-overlay';
  overlay.id = 'classroom-join-modal';
  overlay.innerHTML = `
    <div class="app-modal tinv-card" role="dialog" aria-modal="true" aria-labelledby="classroom-join-title">
      <button type="button" class="app-modal-close tinv-card-close" aria-label="${escapeHTML(t('common.close'))}">✕</button>
      <div class="tinv-hero" aria-hidden="true"><span class="tinv-hero-seal">🏫</span></div>
      <div class="tinv-card-avatar">${muralAvatarHTML(teacher, 'tinv-avatar-lg')}</div>
      <div class="tinv-card-body">
        <p class="tinv-kicker">${t('mural.join.kicker')}</p>
        <h3 id="classroom-join-title" class="tinv-card-title">${escapeHTML(t('mural.join.title', { classroom: info.classroom_name }))}</h3>
        <p class="tinv-card-user">${escapeHTML(t('mural.join.sub', { name, lang }))}</p>
        <ul class="tinv-perks">
          <li><span aria-hidden="true">📌</span>${escapeHTML(t('mural.join.perkMural'))}</li>
          <li><span aria-hidden="true">💬</span>${escapeHTML(t('mural.join.perkTalk'))}</li>
          <li><span aria-hidden="true">📊</span>${escapeHTML(t('mural.join.perkTeacher', { lang }))}</li>
        </ul>
        <p class="profile-edit-error tinv-card-error" role="alert"></p>
        <div class="tinv-card-actions">
          <button type="button" class="btn btn-primary btn-block" data-join-act="accept">${guest ? t('mural.join.login') : t('mural.join.accept')}</button>
          <button type="button" class="btn tinv-ghost btn-block" data-join-act="later">${t('mural.join.later')}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { closeClassroomJoinCard(); if (guest) goToNeutralGate(); };
  overlay.querySelector('.tinv-card-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const errEl = overlay.querySelector('.tinv-card-error');
  overlay.querySelectorAll('[data-join-act]').forEach(btn => btn.addEventListener('click', async () => {
    const act = btn.dataset.joinAct;
    if (guest){
      // O código continua guardado: depois do login o cartão volta.
      if (act !== 'accept') muralForgetCode();
      goToNeutralGate();
      return;
    }
    if (act === 'later'){ muralForgetCode(); closeClassroomJoinCard(); return; }
    btn.disabled = true;
    const res = await muralRpc('join_classroom_code', { p_code: code });
    if (res.error){
      errEl.textContent = muralErrorText(res.error);
      btn.disabled = false;
      if (['invalid_code', 'student_has_teacher', 'invalid_target'].includes(res.error)) muralForgetCode();
      return;
    }
    muralForgetCode();
    closeClassroomJoinCard();
    showToast(res.already_member ? t('mural.join.already') : t('mural.join.done', { classroom: res.classroom_name || info.classroom_name }));
    if (typeof loadMyPermissions === 'function'){
      await loadMyPermissions(true);
      if (typeof applyRoleNavUI === 'function') applyRoleNavUI();
    }
    MURAL_STATE.student.key = `c:${res.classroom_id}`;
    if (res.language_app_key === APP_KEY) switchTab('my-mural');
    else refreshMuralBadges();
  }));
  overlay.querySelector('[data-join-act="accept"]').focus();
}

// Sem login: mostra o cartão antes de mandar para o portão. Devolve true se o cartão apareceu.
async function muralClassroomGateIfPending(){
  const code = muralStoredCode();
  if (!code) return false;
  const info = await muralCodeInfo(code);
  if (!info){ muralForgetCode(); return false; }
  document.getElementById('login-screen')?.style.setProperty('display', 'none');
  openClassroomJoinCard(info, code, true);
  return true;
}

// Depois do login: link guardado abre o cartão; e o "+N" do mural aparece.
async function muralAfterLogin(){
  const code = muralStoredCode();
  if (code){
    const info = await muralCodeInfo(code);
    if (info) openClassroomJoinCard(info, code, false);
    else { muralForgetCode(); showToast(t('mural.err.invalid_code')); }
  }
  refreshMuralBadges();
  scheduleMuralBadgeRefresh();
}

document.getElementById('my-mural-btn')?.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown')?.classList.remove('open');
  switchTab('my-mural');
});
