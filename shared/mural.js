// ---------- Mural da professora (migration 087, Etapa 4 do plano) ----------
// Plano e decisões da autora: docs/plano-professora-privacidade.md ("Etapa 4").
//
// Professora (Painel da professora > Mural): seletor Turmas | Alunos. Turmas lista as turmas (criar, alunos, link,
// nome, apagar); Alunos lista só quem NÃO está em turma (mural individual). Em cada mural: escrever, anexar PDF ou
// imagem, "Para" a turma toda ou um aluno só, editar/apagar os próprios recados, apagar qualquer post/comentário.
// Aluno (item "Aluno" > Mural, "+N" no item Aluno e no Mais): o mural individual com a professora e o de cada turma. Posta, comenta e
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
  teacher: { tab: 'mural', sel: null, links: {} },
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
  if (error){
    console.error(`Erro em ${name}:`, error);
    // 094: turma com aula registrada não se apaga (o histórico de aulas fica).
    if (name === 'mural_delete_classroom' && error.code === '23503') return { error: 'has_class_logs' };
    return { error: 'generic' };
  }
  return data && typeof data === 'object' ? data : { error: 'generic' };
}

function muralErrorText(code){
  const known = ['not_authorized', 'not_member', 'empty', 'too_long', 'daily_limit', 'invalid_attachments', 'invalid_name',
    'classroom_limit', 'not_found', 'no_teacher', 'upload', 'invalid_code', 'student_has_teacher', 'invalid_target', 'has_class_logs'];
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

function muralSetPill(el, n, labelKey){
  if (!el) return;
  let pill = el.querySelector(':scope > .mural-count');
  if (n > 0){
    if (!pill){ pill = document.createElement('span'); pill.className = 'mural-count'; el.appendChild(pill); }
    pill.textContent = n > 99 ? '99+' : String(n);
    pill.setAttribute('aria-label', tp(labelKey || 'mural.newCount', n));
  } else if (pill) pill.remove();
}

// "+N" do aluno: no item Aluno (barra lateral e menu Mais), no botão Mais do celular e na aba Mural do Aluno.
// O Perfil não mostra mais o número (decisão da autora, 2026-10-13). Quem mostra/esconde o item Aluno é
// applyStudentNavVisibility (shared/teacher-panel.js).
function muralApplyBadges(){
  const list = MURAL_STATE.list;
  const sN = muralStudentUnread(list);
  const tN = muralTeacherUnread(list);
  // Aluno (2026-10-14): o item soma tudo; dentro, Mural = mensagens novas e Revisão = cartões para hoje.
  const rN = typeof classReviewTodayCount === 'function' ? classReviewTodayCount() : 0;
  document.querySelectorAll('#student-panel-btn, .student-only-nav[data-tab="student-panel"]').forEach(el => muralSetPill(el, sN + rN, 'studentPanel.newCount'));
  document.querySelectorAll('[data-student-section="mural"]').forEach(el => muralSetPill(el, sN));
  document.querySelectorAll('[data-student-section="revisao"]').forEach(el => muralSetPill(el, rN, 'studentPanel.review.dueCount'));
  muralSetPill(document.getElementById('mais-btn'), sN + rN, 'studentPanel.newCount');
  document.querySelectorAll('#teacher-panel-btn, .teacher-only-nav[data-tab="teacher-panel"], [data-teacher-section="mural"]').forEach(el => muralSetPill(el, tN));
  if (typeof applyStudentNavVisibility === 'function') applyStudentNavVisibility();
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
  if (p.kind === 'lesson' || p.kind === 'material') return muralAutoPostHTML(p);
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
  const coverSlot = board.querySelector('.mc-cover-slot');
  if (coverSlot){ coverSlot.innerHTML = muralCoverHTML(ctx, data); muralFillCoverPhoto(coverSlot); wireMuralCover(coverSlot, ctx, data, reload); }
  const side = board.querySelector('.mc-side');
  if (side && !side.dataset.loaded){
    side.dataset.loaded = '1';
    side.innerHTML = loadingHTML();
    muralSideHTML(ctx, data).then(html => {
      side.innerHTML = html;
      side.querySelectorAll('[data-mural-open-lesson]').forEach(b => b.addEventListener('click', () => muralOpenLesson(ctx)));
      side.querySelector('[data-mural-open-people]')?.addEventListener('click', () => { MURAL_STATE.teacher.tab = 'pessoas'; renderTeacherMuralSection(); });
      side.querySelector('[data-mural-review]')?.addEventListener('click', () => { if (typeof startClassReviewSession === 'function') startClassReviewSession(); });
    }).catch(e => { console.error('Erro na coluna do mural:', e); side.innerHTML = ''; });
  }
  feed.querySelectorAll('[data-mural-open-lesson]').forEach(b => b.addEventListener('click', () => muralOpenLesson(ctx)));
  feed.querySelectorAll('[data-mural-open-material]').forEach(b => b.addEventListener('click', () => muralOpenMaterial(ctx)));
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

// ---------- Professora ----------
function muralChipHTML(attrs, label, unread, active, avatar){
  return `<button type="button" class="mural-chip${active ? ' is-active' : ''}" ${attrs} aria-pressed="${active ? 'true' : 'false'}">
    ${avatar || ''}<span class="mural-chip-label">${escapeHTML(label)}</span>${muralCountHTML(unread)}</button>`;
}

// ---------- Mural estilo Classroom (121; decisões da autora, 2026-10-26 a 29) ----------
// Capa (cor do site, outra cor ou foto: só a professora troca, só em turma), coluna ao lado (próximas aulas; aluno: revisão
// de hoje), caixa de escrever fechada e avisos automáticos de aula e material (kind 'lesson' / 'material', texto ao vivo).
const MURAL_COVER_COLORS = ['#2879B3', '#A83226', '#2F6B50', '#6B3FA0', '#9A4A12', '#2E3A59', '#8A2E5C'];

function muralIsoToday(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function muralLessonWhen(log){
  if (typeof myClassLogWhen === 'function') return myClassLogWhen(log).label;
  return String(log.class_date || '') + (log.start_time ? ` · ${String(log.start_time).slice(0, 5)}` : '');
}

function muralSafeLink(url){ return /^https?:\/\//i.test(String(url || '')) ? String(url) : ''; }

// Aviso automático (aula registrada / material novo): linha com ícone; o texto vem da aula ou do material.
function muralAutoPostHTML(p){
  const ref = p.ref || {};
  const who = escapeHTML(p.author?.name || '');
  let icon, head, title, meta, open;
  if (p.kind === 'lesson'){
    icon = '📅';
    head = t('mural.auto.lesson', { name: who });
    title = escapeHTML(ref.topic || ref.homework || '');
    meta = [escapeHTML(muralLessonWhen(ref)), ref.homework && ref.topic ? escapeHTML(t('mural.auto.homework', { hw: ref.homework })) : ''].filter(Boolean).join(' · ');
    open = `<button type="button" class="mural-text-btn mc-auto-open" data-mural-open-lesson>${t('mural.auto.openLesson')}</button>`;
  } else {
    icon = '📎';
    head = t('mural.auto.material', { name: who });
    title = escapeHTML(ref.title || '');
    meta = escapeHTML(muralTimeLabel(p.created_at));
    const link = muralSafeLink(ref.link_url);
    open = link
      ? `<a class="mural-text-btn mc-auto-open" href="${escapeHTML(link)}" target="_blank" rel="noopener">${t('mural.auto.openMaterial')}</a>`
      : `<button type="button" class="mural-text-btn mc-auto-open" data-mural-open-material>${t('mural.auto.openMaterial')}</button>`;
  }
  return `
    <article class="mural-post mc-auto mc-auto-${p.kind}" data-post-id="${p.id}">
      <div class="mc-auto-row">
        <span class="mc-auto-ico" aria-hidden="true">${icon}</span>
        <div class="mc-auto-text">
          <p class="mc-auto-title"><strong>${head}</strong> ${title}</p>
          ${meta ? `<p class="mural-meta">${meta}</p>` : ''}
        </div>
        <div class="mural-post-actions">${open}
          ${p.can_delete ? `<button type="button" class="mural-text-btn is-danger" data-mural-del-post="${p.id}">${t('mural.delete')}</button>` : ''}</div>
      </div>
      <ul class="mural-comments">${(p.comments || []).map(muralCommentHTML).join('')}</ul>
      <form class="mural-comment-form" data-mural-comment-form="${p.id}">
        <label class="sr-only" for="mural-c-${p.id}">${t('mural.comment.label')}</label>
        <input id="mural-c-${p.id}" class="profile-edit-input" maxlength="2000" autocomplete="off" placeholder="${escapeHTML(t('mural.comment.placeholder'))}">
        <button type="submit" class="btn btn-secondary mural-small-btn">${t('mural.comment.send')}</button>
      </form>
    </article>`;
}

// Capa: turma = nome da turma; mural individual = nome do aluno (professora) ou "Com {professora}" (aluno).
function muralCoverHTML(ctx, data){
  const c = data.classroom;
  const isTeacher = !!data.is_teacher;
  const lang = escapeHTML(muralLangWord(APP_KEY));
  let title, sub;
  if (c){
    title = escapeHTML(c.name);
    const n = (ctx.members || []).length;
    sub = isTeacher ? `${lang} · ${escapeHTML(tp('mural.cover.members', n, { n }))}` : `${lang} · ${escapeHTML(t('mural.cover.with', { name: data.teacher?.name || '' }))}`;
  } else if (isTeacher){
    title = escapeHTML(data.student?.name || '');
    sub = `${lang} · ${escapeHTML(t('mural.cover.individual'))}`;
  } else {
    title = escapeHTML(t('mural.individualChip', { name: data.teacher?.name || '' }));
    sub = `${lang} · ${escapeHTML(t('mural.cover.individualStudent'))}`;
  }
  const color = c && c.cover_color ? ` style="background-color:${escapeHTML(c.cover_color)};"` : '';
  const photo = c && c.cover_path ? ` data-mural-cover-path="${escapeHTML(c.cover_path)}"` : '';
  const edit = isTeacher && c ? `
    <button type="button" class="mc-cover-edit" data-mural-cover-edit aria-expanded="false">🖼️ ${t('mural.cover.change')}</button>` : '';
  return `
    <div class="mc-cover${c && c.cover_path ? ' has-photo' : ''}"${color}${photo}>
      <div class="mc-cover-text"><h3 class="mc-cover-title">${title}</h3><p class="mc-cover-sub">${sub}</p></div>
      ${edit}
    </div>
    ${isTeacher && c ? `
    <div class="mc-cover-editor" hidden>
      <p class="panel-h">${t('mural.cover.title')}</p>
      <div class="mc-swatches" role="group" aria-label="${escapeHTML(t('mural.cover.colors'))}">
        <button type="button" class="mc-swatch mc-swatch-site${!c.cover_color ? ' is-active' : ''}" data-mural-cover-color="" aria-label="${escapeHTML(t('mural.cover.siteColor'))}" title="${escapeHTML(t('mural.cover.siteColor'))}"></button>
        ${MURAL_COVER_COLORS.map((hex, i) => `<button type="button" class="mc-swatch${c.cover_color === hex ? ' is-active' : ''}" style="background:${hex};" data-mural-cover-color="${hex}" aria-label="${escapeHTML(t('mural.cover.colorN', { n: i + 1 }))}"></button>`).join('')}
      </div>
      <div class="mc-cover-actions">
        <label class="btn btn-secondary mural-small-btn">${t('mural.cover.upload')}
          <input type="file" data-mural-cover-file accept="image/jpeg,image/png,image/webp" hidden></label>
        ${c.cover_path ? `<button type="button" class="btn tinv-ghost mural-small-btn" data-mural-cover-nophoto>${t('mural.cover.removePhoto')}</button>` : ''}
      </div>
      <p class="mural-composer-hint">${t('mural.cover.hint')}</p>
    </div>` : ''}`;
}

async function muralFillCoverPhoto(slot){
  const el = slot.querySelector('[data-mural-cover-path]');
  if (!el) return;
  const { data, error } = await supabaseClient.storage.from('mural').createSignedUrl(el.dataset.muralCoverPath, 3600);
  if (error || !data?.signedUrl){ if (error) console.error('Erro ao abrir a capa:', error); return; }
  el.style.backgroundImage = `url("${data.signedUrl.replace(/"/g, '%22')}")`;
}

function wireMuralCover(slot, ctx, data, reload){
  const c = data.classroom;
  if (!data.is_teacher || !c) return;
  const btn = slot.querySelector('[data-mural-cover-edit]');
  const box = slot.querySelector('.mc-cover-editor');
  btn?.addEventListener('click', () => { box.hidden = !box.hidden; btn.setAttribute('aria-expanded', String(!box.hidden)); });
  const save = async (color, path) => {
    const res = await muralRpc('mural_set_cover', { p_id: c.id, p_color: color, p_path: path });
    if (res.error){ showToast(muralErrorText(res.error)); return false; }
    if (res.old_path && res.old_path !== path) await muralRemoveFiles([res.old_path]);
    showToast(t('mural.cover.saved'));
    reload();
    return true;
  };
  slot.querySelectorAll('[data-mural-cover-color]').forEach(b => b.addEventListener('click', () => save(b.dataset.muralCoverColor || null, c.cover_path || null)));
  slot.querySelector('[data-mural-cover-nophoto]')?.addEventListener('click', () => save(c.cover_color || null, null));
  slot.querySelector('[data-mural-cover-file]')?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)){ showToast(t('mural.cover.badFile')); return; }
    const prepared = await muralPrepareFile(file);
    if (prepared.error){ showToast(prepared.error); return; }
    const me = CURRENT_USER.id;
    const path = `${me}/${me}/capa-${c.id}-${Date.now()}.${prepared.type === 'image/png' ? 'png' : prepared.type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { error } = await supabaseClient.storage.from('mural').upload(path, prepared.blob, { contentType: prepared.type, upsert: false });
    if (error){ console.error('Erro ao enviar a capa:', error); showToast(muralErrorText('upload')); return; }
    if (!(await save(c.cover_color || null, path))) await muralRemoveFiles([path]);
  });
}

// Coluna ao lado: próximas aulas (professora: desta turma/aluno; aluno: as suas) e, para o aluno, a revisão de hoje.
async function muralSideHTML(ctx, data){
  const parts = [];
  let next = [];
  const today = muralIsoToday();
  if (data.is_teacher){
    let q = supabaseClient.from('teacher_class_logs').select('id, class_date, start_time, time_zone, topic')
      .eq('teacher_id', CURRENT_USER.id).eq('language_app_key', APP_KEY).gte('class_date', today);
    q = ctx.classroomId ? q.eq('classroom_id', ctx.classroomId) : q.eq('student_id', ctx.studentId);
    const { data: rows, error } = await q.order('class_date').order('start_time', { nullsFirst: false }).limit(3);
    if (!error && Array.isArray(rows)) next = rows;
  } else if (typeof fetchMyClassLogs === 'function'){
    const rows = await fetchMyClassLogs(APP_KEY);
    next = rows.filter(r => String(r.class_date) >= today)
      .sort((a, b) => (String(a.class_date) + (a.start_time || '')).localeCompare(String(b.class_date) + (b.start_time || ''))).slice(0, 2);
  }
  parts.push(`
    <section class="mc-card">
      <h4 class="mc-card-title">${t(data.is_teacher ? 'mural.side.next' : 'mural.side.nextOne')}</h4>
      ${next.length ? `<ul class="mc-next">${next.map(l => `<li><span class="mc-next-when">${escapeHTML(muralLessonWhen(l))}</span>${l.topic ? `<span class="mural-meta">${escapeHTML(l.topic)}</span>` : ''}</li>`).join('')}</ul>`
        : `<p class="mural-meta">${t('mural.side.noNext')}</p>`}
      <button type="button" class="mural-text-btn mc-card-link" data-mural-open-lesson>${t('mural.side.seeAll')}</button>
    </section>`);
  if (data.is_teacher && ctx.classroomId){
    const n = (ctx.members || []).length;
    parts.push(`
      <section class="mc-card">
        <h4 class="mc-card-title">${t('mural.tab.people')}</h4>
        <p class="mural-meta">${escapeHTML(tp('mural.cover.members', n, { n }))}</p>
        <button type="button" class="mural-text-btn mc-card-link" data-mural-open-people>${t('mural.side.peopleCta')}</button>
      </section>`);
  }
  if (!data.is_teacher){
    let n = 0;
    try { n = typeof classReviewTodayCount === 'function' ? classReviewTodayCount() : 0; } catch (e) { n = 0; }
    parts.push(`
      <section class="mc-card">
        <h4 class="mc-card-title">${t('mural.side.review')}</h4>
        <p class="mural-meta">${n ? escapeHTML(tp('mural.side.reviewN', n, { n })) : t('mural.side.reviewNone')}</p>
        ${n ? `<button type="button" class="btn btn-primary mural-small-btn" data-mural-review>${t('mural.side.reviewCta')}</button>` : ''}
      </section>`);
  }
  return parts.join('');
}

function muralOpenLesson(ctx){
  if (ctx.role === 'teacher'){ muralOpenTeacherTab('aulas'); renderTeacherMuralSection(); }
  else if (typeof switchStudentPanelSection === 'function') switchStudentPanelSection('classlogs');
}
function muralOpenMaterial(ctx){
  if (ctx.role === 'teacher'){ muralOpenTeacherTab('aulas'); renderTeacherMuralSection(); }
  else if (typeof switchStudentPanelSection === 'function') switchStudentPanelSection('materials');
}

// Quadro = capa + coluna + (escrever fechado) + lista. teacherId: dono da pasta dos anexos.
function mountMuralBoard(host, ctx, teacherId){
  const me = typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE ? { id: CURRENT_USER?.id, name: PROFILE_CACHE.display_name || PROFILE_CACHE.username, avatar: PROFILE_CACHE.avatar_url } : { id: CURRENT_USER?.id, name: '?' };
  const ph = ctx.role === 'teacher'
    ? (ctx.classroomId ? t('mural.composer.openClassroom') : t('mural.composer.openStudent', { name: ctx.studentName || '' }))
    : t('mural.composer.placeholderStudent');
  host.innerHTML = `
    <div class="mc-cover-slot"></div>
    <div class="mc-layout">
      <aside class="mc-side" aria-label="${escapeHTML(t('mural.side.aria'))}"></aside>
      <div class="mc-stream">
        <button type="button" class="mc-composer-open">${muralAvatarHTML(me)}<span>${escapeHTML(ph)}</span></button>
        <div class="mc-composer-wrap" hidden>${muralComposerHTML(ctx)}</div>
        <div class="mural-feed"></div>
      </div>
    </div>`;
  const board = host;
  const openBtn = host.querySelector('.mc-composer-open');
  const wrap = host.querySelector('.mc-composer-wrap');
  const collapse = () => { wrap.hidden = true; openBtn.hidden = false; };
  openBtn.addEventListener('click', () => { openBtn.hidden = true; wrap.hidden = false; wrap.querySelector('textarea').focus(); });
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'btn tinv-ghost mural-small-btn'; cancel.textContent = t('mural.cancel');
  cancel.addEventListener('click', collapse);
  wrap.querySelector('.mural-composer-bar').insertBefore(cancel, wrap.querySelector('.mural-publish'));
  wireMuralComposer(wrap.querySelector('.mural-composer'), ctx, teacherId, () => { collapse(); renderMuralFeed(board, ctx); });
  renderMuralFeed(board, ctx);
}

// ---------- Professora: Mural | Aulas e materiais | Pessoas ----------
// sel: 'all' | 'c:<turma>' | 's:<aluno>'. "Todos" só existe em Aulas e materiais e em Pessoas (o mural é sempre de alguém).
function muralOpenTeacherTab(tab, fromSection){
  const st = MURAL_STATE.teacher;
  st.tab = ['mural', 'aulas', 'pessoas'].includes(tab) ? tab : 'mural';
  if (fromSection === 'classlogs' && typeof ADMIN_CLASS_LOGS_STATE !== 'undefined' && ADMIN_CLASS_LOGS_STATE.studentIds.size === 1){
    st.sel = 's:' + [...ADMIN_CLASS_LOGS_STATE.studentIds][0];
  }
}

function muralShowTeacherBox(ids){
  ['mural', 'classlogs', 'materials', 'people'].forEach(s => {
    const el = document.getElementById(`admin-${s}-content`);
    if (el) el.style.display = ids.includes(s) ? '' : 'none';
  });
}

function muralApplyAulasScope(sel){
  const scope = sel && sel.startsWith('c:') ? { classroomId: Number(sel.slice(2)) } : sel && sel.startsWith('s:') ? { studentId: sel.slice(2) } : null;
  if (typeof ADMIN_CLASS_LOGS_STATE !== 'undefined'){
    ADMIN_CLASS_LOGS_STATE.scope = scope;
    if (scope?.studentId){ ADMIN_CLASS_LOGS_STATE.studentIds = new Set([scope.studentId]); ADMIN_CLASS_LOGS_STATE.classroomIds = new Set(); }
    else if (scope?.classroomId){ ADMIN_CLASS_LOGS_STATE.classroomIds = new Set([String(scope.classroomId)]); ADMIN_CLASS_LOGS_STATE.studentIds = new Set(); }
  }
  if (typeof MATERIALS_VIEW !== 'undefined') MATERIALS_VIEW.filtros.aluno = scope?.studentId || '';
}

async function renderTeacherMuralSection(){
  const shell = document.getElementById('admin-mural-shell');
  const wrap = document.getElementById('admin-mural-content');
  if (!wrap) return;
  if (shell) shell.style.display = '';
  const list = await muralLoadList();
  muralApplyBadges();
  const tch = list?.as_teacher;
  if (!tch){ muralShowTeacherBox(['mural']); wrap.innerHTML = `<p class="profile-empty-note">${muralErrorText('not_authorized')}</p>`; return; }
  const st = MURAL_STATE.teacher;
  const classrooms = tch.classrooms || [];
  const roster = tch.roster || [];
  const valid = new Set(['all', ...classrooms.map(c => 'c:' + c.id), ...roster.map(s => 's:' + s.id)]);
  if (!st.sel || !valid.has(st.sel)) st.sel = 'all';
  if (st.tab === 'mural' && st.sel === 'all') st.sel = classrooms.length ? 'c:' + classrooms[0].id : (roster.length ? 's:' + roster[0].id : 'all');
  const cUnread = (c) => c.unread || 0;
  const studentSel = st.sel.startsWith('s:') ? st.sel.slice(2) : '';
  const tabBtn = (key, label, n) => `<button type="button" class="deck-topbar-btn${st.tab === key ? ' is-active' : ''}" role="tab" aria-selected="${st.tab === key}" data-mural-tab="${key}">${label}${muralCountHTML(n || 0)}</button>`;
  const allUnread = classrooms.reduce((a, c) => a + cUnread(c), 0) + roster.reduce((a, s) => a + (s.unread || 0), 0);
  if (shell){
    shell.innerHTML = `
      <div class="mc-shell">
        <div class="deck-topbar panel-subnav mc-tabs" role="tablist" aria-label="${escapeHTML(t('mural.title'))}">
          ${tabBtn('mural', t('mural.tab.mural'), allUnread)}${tabBtn('aulas', t('mural.tab.aulas'))}${tabBtn('pessoas', t('mural.tab.people'))}
        </div>
        <div class="mc-picker">
          <span class="mc-picker-label">${t('mural.pick.label')}</span>
          ${st.tab !== 'mural' ? muralChipHTML('data-mural-sel="all"', t('mural.pick.all'), 0, st.sel === 'all') : ''}
          ${classrooms.map(c => muralChipHTML(`data-mural-sel="c:${c.id}"`, c.name, cUnread(c), st.sel === 'c:' + c.id)).join('')}
          ${roster.length ? `<label class="mc-student-pick"><span class="sr-only">${t('mural.pick.student')}</span>
            <select class="profile-edit-input${studentSel ? ' is-active' : ''}" data-mural-student-select>
              <option value="">${t('mural.pick.student')}</option>
              ${roster.map(s => `<option value="${escapeHTML(s.id)}"${s.id === studentSel ? ' selected' : ''}>${escapeHTML(s.name || '')}${s.unread ? ` (${s.unread})` : ''}</option>`).join('')}
            </select></label>` : ''}
          <button type="button" class="mural-chip mural-chip-new" data-mural-new>${t('mural.newClassroom')}</button>
        </div>
        <form class="mural-new-form" hidden>
          <label class="sr-only" for="mural-new-name">${t('mural.newClassroomPh')}</label>
          <input id="mural-new-name" class="profile-edit-input" maxlength="60" placeholder="${escapeHTML(t('mural.newClassroomPh'))}">
          <button type="submit" class="btn btn-primary mural-small-btn">${t('mural.create')}</button>
          <button type="button" class="btn tinv-ghost mural-small-btn" data-mural-new-cancel>${t('mural.cancel')}</button>
          <p class="profile-edit-error" role="alert"></p>
        </form>
      </div>`;
    shell.querySelectorAll('[data-mural-tab]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.muralTab; renderTeacherMuralSection(); }));
    shell.querySelectorAll('[data-mural-sel]').forEach(b => b.addEventListener('click', () => { st.sel = b.dataset.muralSel; renderTeacherMuralSection(); }));
    shell.querySelector('[data-mural-student-select]')?.addEventListener('change', (e) => {
      if (!e.target.value) return;
      st.sel = 's:' + e.target.value; renderTeacherMuralSection();
    });
    const newForm = shell.querySelector('.mural-new-form');
    shell.querySelector('[data-mural-new]').addEventListener('click', () => { newForm.hidden = false; newForm.querySelector('input').focus(); });
    newForm.querySelector('[data-mural-new-cancel]').addEventListener('click', () => { newForm.hidden = true; });
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const res = await muralRpc('mural_save_classroom', { p_lang: APP_KEY, p_id: null, p_name: newForm.querySelector('input').value });
      if (res.error){ newForm.querySelector('.profile-edit-error').textContent = muralErrorText(res.error); return; }
      st.sel = 'c:' + res.id; st.tab = 'pessoas';
      renderTeacherMuralSection();
    });
  }

  if (st.tab === 'aulas'){
    muralShowTeacherBox(['classlogs', 'materials']);
    muralApplyAulasScope(st.sel);
    renderAdminClassLogsView();
    renderAdminSupportMaterialsView();
    return;
  }
  if (st.tab === 'pessoas'){
    muralShowTeacherBox(['people']);
    renderMuralPeople(document.getElementById('admin-people-content'), st, classrooms, roster);
    return;
  }
  muralShowTeacherBox(['mural']);
  if (st.sel === 'all'){ wrap.innerHTML = `<p class="profile-empty-note">${roster.length ? t('mural.pickClassroom') : t('mural.noStudents')}</p>`; return; }
  if (st.sel.startsWith('c:')){
    const c = classrooms.find(x => 'c:' + x.id === st.sel);
    const members = (c.members || []).map(id => roster.find(s => s.id === id)).filter(Boolean);
    mountMuralBoard(wrap, { role: 'teacher', classroomId: c.id, members }, CURRENT_USER.id);
  } else {
    const s = roster.find(x => 's:' + x.id === st.sel);
    mountMuralBoard(wrap, { role: 'teacher', studentId: s.id, studentName: s.name }, CURRENT_USER.id);
  }
}

// Pessoas: turma = nome, alunos, link e apagar; aluno = ficha curta; Todos = turmas e alunos.
function renderMuralPeople(host, st, classrooms, roster){
  if (!host) return;
  if (st.sel.startsWith('c:')){
    const c = classrooms.find(x => 'c:' + x.id === st.sel);
    host.innerHTML = '<div class="mc-people"></div>';
    renderMuralManage(host.querySelector('.mc-people'), c, roster, true);
    return;
  }
  const inRooms = (id) => classrooms.filter(c => (c.members || []).includes(id)).map(c => c.name);
  if (st.sel.startsWith('s:')){
    const s = roster.find(x => 's:' + x.id === st.sel);
    const rooms = inRooms(s.id);
    host.innerHTML = `
      <div class="mc-people">
        <div class="mc-person">${muralAvatarHTML(s)}<div><p class="mural-author">${escapeHTML(s.name || '')}</p>
          ${s.username ? `<p class="mural-meta">@${escapeHTML(s.username)}</p>` : ''}
          <p class="mural-meta">${rooms.length ? escapeHTML(t('mural.people.rooms', { list: rooms.join(', ') })) : t('mural.people.noRoom')}</p></div></div>
        <button type="button" class="btn btn-secondary mural-small-btn" data-mural-ficha="${escapeHTML(s.id)}">${t('mural.people.openFicha')}</button>
      </div>`;
  } else {
    host.innerHTML = `
      <div class="mc-people">
        ${classrooms.length ? `<p class="panel-h">${t('mural.mode.classrooms')}</p>
        <ul class="mc-people-list">${classrooms.map(c => `<li><button type="button" class="mural-text-btn" data-mural-sel-go="c:${c.id}">👥 ${escapeHTML(c.name)}</button>
          <span class="mural-meta">${escapeHTML(tp('mural.cover.members', (c.members || []).length, { n: (c.members || []).length }))}</span></li>`).join('')}</ul>` : ''}
        <p class="panel-h">${t('mural.mode.students')}</p>
        ${roster.length ? `<ul class="mc-people-list">${roster.map(s => `<li><button type="button" class="mural-text-btn mc-person-btn" data-mural-sel-go="s:${escapeHTML(s.id)}">${muralAvatarHTML(s, 'mural-avatar mural-avatar-xs')} ${escapeHTML(s.name || '')}</button>
          <span class="mural-meta">${inRooms(s.id).length ? escapeHTML(inRooms(s.id).join(', ')) : t('mural.people.noRoom')}</span></li>`).join('')}</ul>`
          : `<p class="profile-empty-note">${t('mural.noStudents')}</p>`}
      </div>`;
  }
  host.querySelectorAll('[data-mural-sel-go]').forEach(b => b.addEventListener('click', () => { st.sel = b.dataset.muralSelGo; renderTeacherMuralSection(); }));
  host.querySelector('[data-mural-ficha]')?.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.muralFicha;
    switchTeacherPanelSection('students');
    // A ficha abre pelo vínculo; espera a lista de alunos carregar (até ~3 s).
    let tries = 0;
    const tryOpen = () => {
      const link = typeof STUDENT_VIEW !== 'undefined' && (STUDENT_VIEW.links || []).find(l => l.student_id === id && l.language_app_key === APP_KEY);
      if (link && typeof openStudentFicha === 'function') return openStudentFicha(link.id);
      if (++tries < 30) setTimeout(tryOpen, 100);
    };
    setTimeout(tryOpen, 100);
  });
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
    MURAL_STATE.teacher.sel = 'all';
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
