// Fase J (Painel de Tags) -- gerenciamento GLOBAL de Tags (renomear/excluir).
//
// Modelo (ver CLAUDE.md): NÃO existe tabela/entidade Tag. Tag é um slug dentro
// de `tags text[]` das Notes (own_flashcards / teacher_flashcards). "Global"
// significa global DENTRO DO UNIVERSO DE PROPRIEDADE de quem gerencia:
//   scope 'own'     -> Tags de own_flashcards da própria conta (aluna/usuária);
//   scope 'teacher' -> Tags de teacher_flashcards da professora (admin), em
//                      TODOS os alunos e idiomas -- sem escolher aluno.
// Nunca cruza a fronteira: a aluna não altera Tags de Teacher Cards (a RLS de
// teacher_flashcards é admin-only e as RPCs filtram por teacher_id/owner_id).
//
// A operação em lote é feita por RPC SECURITY INVOKER transacional (migration
// 057: list_note_tags / rename_note_tag / delete_note_tag) -- este arquivo
// NUNCA lê linhas, reescreve arrays em JS nem faz vários UPDATEs. Tags são
// metadata da Note: as RPCs alteram SÓ `tags` (sem revision, sem FSRS, sem
// Deck). A normalização do nome novo usa a função canônica de
// shared/flashcard-model.js (normalizeNoteTags/validateNoteTags).
//
// Depende de: shared/flashcard-model.js, shared/profile.js (escapeHTML),
// shared/flashcard-tags-editor.js (noteTagChipsHTML) e do `supabaseClient`.

// ---------- helpers PUROS (testáveis) ----------

// Planeja um rename a partir do texto digitado. `counts` = { slug: notas }.
// Nunca chama o banco. Normaliza pela função canônica (não há 2ª normalização).
function planTagRename(oldSlug, rawNew, counts){
  const c = counts || {};
  // Tag de SISTEMA (criado-por-*): nem origem nem destino de rename (o
  // servidor também recusa -- migration 060).
  if (isAttributionTag(oldSlug)) return { ok: false, error: 'Tags de atribuição (criado-por-…) são de sistema e não podem ser renomeadas.' };
  const norm = normalizeNoteTags([rawNew]);
  if (norm.length && isAttributionTag(norm[0])) return { ok: false, error: 'Nomes que começam com "criado-por" são reservados ao sistema.', newSlug: norm[0] };
  if (!norm.length) return { ok: false, error: 'Digite um nome de tag válido (letras, números e hífen).' };
  const newSlug = norm[0];
  const v = validateNoteTags([newSlug]);
  if (!v.ok) return { ok: false, error: v.error, newSlug };
  if (newSlug === oldSlug) return { ok: true, unchanged: true, newSlug, affected: 0, collision: 0 };
  return {
    ok: true,
    unchanged: false,
    newSlug,
    affected: c[oldSlug] || 0,
    collision: c[newSlug] || 0, // Notas que já usam o destino (serão unificadas)
  };
}

// Espelho LOCAL (só para manter STATE.cards já carregado coerente sem recarregar;
// a persistência é sempre a RPC). Fusão: 1 ocorrência do destino, na posição da
// 1ª ocorrência, ordem das demais preservada.
function renameTagInTagList(tags, oldTag, newTag){
  const out = [];
  (Array.isArray(tags) ? tags : []).forEach(t => {
    const x = t === oldTag ? newTag : t;
    if (!out.includes(x)) out.push(x);
  });
  return out;
}
function removeTagFromTagList(tags, tag){
  return (Array.isArray(tags) ? tags : []).filter(t => t !== tag);
}

// Filtro de Review (STATE.studySettings.reviewTagFilter): devolve o novo array,
// ou null se nada mudou (quem chama só persiste se != null).
function reviewTagFilterAfterRename(filter, oldTag, newTag){
  const f = Array.isArray(filter) ? filter : [];
  if (!f.includes(oldTag)) return null;
  return renameTagInTagList(f, oldTag, newTag);
}
function reviewTagFilterAfterDelete(filter, tag){
  const f = Array.isArray(filter) ? filter : [];
  if (!f.includes(tag)) return null;
  return removeTagFromTagList(f, tag);
}

// ---------- dados (RPCs) ----------

const TAG_MANAGER_ERROR_LABELS = {
  invalid_tag: 'Nome de tag inválido.',
  invalid_scope: 'Escopo inválido.',
  system_tag_protected: 'Tags de atribuição (criado-por-…) são de sistema e não podem ser criadas, renomeadas ou excluídas.',
};
function tagManagerErrorMessage(err){
  const msg = (err && (err.message || err.code)) || '';
  for (const k of Object.keys(TAG_MANAGER_ERROR_LABELS)) if (msg.includes(k)) return TAG_MANAGER_ERROR_LABELS[k];
  return 'Não foi possível concluir agora. Tente novamente.';
}

async function fetchNoteTags(scope){
  const { data, error } = await supabaseClient.rpc('list_note_tags', { p_scope: scope });
  if (error){ console.error('list_note_tags:', error); return { ok: false, error: tagManagerErrorMessage(error) }; }
  return { ok: true, tags: (data || []).map(r => ({ tag: r.tag, notes: Number(r.notes) })) };
}

async function renameNoteTag(scope, oldSlug, newSlug){
  const { data, error } = await supabaseClient.rpc('rename_note_tag', { p_scope: scope, p_old: oldSlug, p_new: newSlug });
  if (error){ console.error('rename_note_tag:', error); return { ok: false, error: tagManagerErrorMessage(error) }; }
  return { ok: true, affected: Number(data && data.affected) || 0, merged: Number(data && data.merged) || 0, unchanged: !!(data && data.unchanged) };
}

async function deleteNoteTag(scope, slug){
  const { data, error } = await supabaseClient.rpc('delete_note_tag', { p_scope: scope, p_tag: slug });
  if (error){ console.error('delete_note_tag:', error); return { ok: false, error: tagManagerErrorMessage(error) }; }
  return { ok: true, affected: Number(data && data.affected) || 0 };
}

// Depois de um rename/delete bem-sucedido no scope 'own': mantém o estado local
// coerente. Só cards de origem 'self' (nunca 'teacher': a Tag do Teacher Card
// é de outra propriedade) e o filtro de Review da PRÓPRIA conta. Não toca FSRS,
// Deck nem revision. Persistência do filtro via updateStudySetting (já salva).
function applyTagChangeToLocalState(scope, kind, oldTag, newTag){
  if (scope !== 'own' || typeof STATE === 'undefined') return;
  (STATE.cards || []).forEach(c => {
    if (c.origin !== 'self' || !Array.isArray(c.tags) || !c.tags.includes(oldTag)) return;
    c.tags = kind === 'rename' ? renameTagInTagList(c.tags, oldTag, newTag) : removeTagFromTagList(c.tags, oldTag);
  });
  const cur = STATE.studySettings && STATE.studySettings.reviewTagFilter;
  const next = kind === 'rename' ? reviewTagFilterAfterRename(cur, oldTag, newTag) : reviewTagFilterAfterDelete(cur, oldTag);
  if (next && typeof updateStudySetting === 'function') updateStudySetting({ reviewTagFilter: next });
}

// ---------- UI ----------

function renameInfoHTML(plan){
  if (!plan.ok) return `<span class="profile-edit-field-error">${escapeHTML(plan.error)}</span>`;
  if (plan.unchanged) return `<span class="profile-edit-hint">Nenhuma alteração.</span>`;
  return `<span class="profile-edit-hint">Novo nome: <strong>#${escapeHTML(plan.newSlug)}</strong> · ${plan.affected} ${plan.affected === 1 ? 'nota será alterada' : 'notas serão alteradas'}.</span>`
    + (plan.collision ? `<br><span class="profile-edit-hint" data-tag-collision>⚠️ ${plan.collision} ${plan.collision === 1 ? 'nota já usa' : 'notas já usam'} <strong>#${escapeHTML(plan.newSlug)}</strong>: as duas tags serão unificadas (sem duplicar).</span>` : '');
}

function tagManagerRowsHTML(list, ui){
  return list.map(({ tag, notes }) => {
    const e = escapeHTML(tag);
    const noteLabel = `${notes} ${notes === 1 ? 'nota' : 'notas'}`;
    let extra = '';
    if (ui.renaming === tag){
      const plan = planTagRename(tag, ui.renameValue, ui.counts);
      const info = renameInfoHTML(plan);
      const can = plan.ok && !plan.unchanged && !ui.busy;
      extra = `<div class="tag-manager-panel" data-tag-rename-panel="${e}" style="width:100%; margin-top:6px;">
        <input type="text" class="profile-edit-input" data-tag-rename-input="${e}" value="${escapeHTML(ui.renameValue)}" maxlength="80" aria-label="Novo nome da tag ${e}">
        <div style="margin:4px 0;" data-tag-rename-info>${info}</div>
        <button type="button" class="btn btn-primary" data-tag-rename-confirm="${e}" ${can ? '' : 'disabled'}>Confirmar renomeação</button>
        <button type="button" class="btn btn-secondary" data-tag-rename-cancel ${ui.busy ? 'disabled' : ''}>Cancelar</button>
      </div>`;
    } else if (ui.deleting === tag){
      extra = `<div class="tag-manager-panel" data-tag-delete-panel="${e}" style="width:100%; margin-top:6px;">
        <p class="profile-edit-hint" style="margin:0 0 6px;">Excluir <strong>#${e}</strong>? Essa Tag será removida de ${noteLabel}. A remoção é global no seu escopo e não pode ser desfeita.</p>
        <button type="button" class="btn btn-primary" data-tag-delete-confirm="${e}" ${ui.busy ? 'disabled' : ''}>Excluir Tag</button>
        <button type="button" class="btn btn-secondary" data-tag-delete-cancel ${ui.busy ? 'disabled' : ''}>Cancelar</button>
      </div>`;
    }
    if (isAttributionTag(tag)){
      return `<div class="admin-badge-row" data-tag-row="${e}" data-system-tag="1" style="flex-wrap:wrap;">
      <span style="flex:1; min-width:120px;"><span class="pill note-tag-chip">🔒 #${e}</span> <span class="profile-edit-hint">${noteLabel} · atribuição permanente (sistema)</span></span>
    </div>`;
    }
    return `<div class="admin-badge-row" data-tag-row="${e}" style="flex-wrap:wrap;">
      <span style="flex:1; min-width:120px;"><span class="pill note-tag-chip">#${e}</span> <span class="profile-edit-hint">${noteLabel}</span></span>
      <button type="button" class="btn btn-secondary" data-tag-rename="${e}" ${ui.busy ? 'disabled' : ''}>Renomear</button>
      <button type="button" class="admin-badge-delete-btn" data-tag-delete="${e}" title="Excluir tag" aria-label="Excluir tag ${e}" ${ui.busy ? 'disabled' : ''}>🗑</button>
      ${extra}
    </div>`;
  }).join('');
}

// Monta o gerenciador em mountEl. opts: { scope: 'own'|'teacher', onChanged() }.
async function renderTagManagerInto(mountEl, opts){
  if (!mountEl) return;
  const scope = opts.scope;
  const ui = { list: [], counts: {}, renaming: null, renameValue: '', deleting: null, busy: false, msg: '', msgKind: '' };
  mountEl.innerHTML = `<p class="profile-empty-note">Carregando tags…</p>`;

  const hint = scope === 'teacher'
    ? 'Tags dos seus cartões de aluno (todos os alunos e idiomas). Renomear ou excluir vale para todos eles.'
    : 'Tags dos seus próprios cartões. As tags dos cartões da professora não aparecem aqui e não podem ser alteradas por você.';

  async function load(){
    const res = await fetchNoteTags(scope);
    if (!res.ok){ ui.list = null; ui.msg = res.error; ui.msgKind = 'error'; return; }
    ui.list = res.tags;
    ui.counts = {};
    res.tags.forEach(t => { ui.counts[t.tag] = t.notes; });
  }

  function paint(){
    if (ui.list === null){
      mountEl.innerHTML = `<p class="profile-edit-error" data-tag-manager-error>${escapeHTML(ui.msg)}</p><button type="button" class="btn btn-secondary" data-tag-manager-retry>Tentar de novo</button>`;
      mountEl.querySelector('[data-tag-manager-retry]').addEventListener('click', async () => { ui.msg = ''; await load(); paint(); });
      return;
    }
    const body = ui.list.length
      ? tagManagerRowsHTML(ui.list, ui)
      : `<p class="profile-empty-note" data-tag-manager-empty>Você ainda não usa nenhuma tag.</p>`;
    mountEl.innerHTML = `<p class="profile-edit-hint">${escapeHTML(hint)}</p>
      <div data-tag-manager-list>${body}</div>
      <p class="${ui.msgKind === 'error' ? 'profile-edit-error' : 'profile-edit-hint'}" data-tag-manager-msg>${escapeHTML(ui.msg)}</p>`;
    wire();
  }

  async function finish(msg){
    ui.renaming = null; ui.deleting = null; ui.renameValue = ''; ui.busy = false; ui.msg = msg; ui.msgKind = 'ok';
    await load();
    paint();
    if (typeof showToast === 'function') showToast(msg);
    if (typeof opts.onChanged === 'function') opts.onChanged();
  }

  function wire(){
    mountEl.querySelectorAll('[data-tag-rename]').forEach(b => b.addEventListener('click', () => {
      ui.renaming = b.dataset.tagRename; ui.renameValue = b.dataset.tagRename; ui.deleting = null; ui.msg = ''; paint();
      const inp = mountEl.querySelector('[data-tag-rename-input]'); if (inp){ inp.focus(); inp.select(); }
    }));
    mountEl.querySelectorAll('[data-tag-delete]').forEach(b => b.addEventListener('click', () => {
      ui.deleting = b.dataset.tagDelete; ui.renaming = null; ui.msg = ''; paint();
    }));
    mountEl.querySelectorAll('[data-tag-rename-cancel],[data-tag-delete-cancel]').forEach(b => b.addEventListener('click', () => {
      ui.renaming = null; ui.deleting = null; paint();
    }));
    const inp = mountEl.querySelector('[data-tag-rename-input]');
    if (inp) inp.addEventListener('input', () => {
      // Atualiza só o resumo/botão (sem repintar o input: preserva foco e cursor).
      ui.renameValue = inp.value;
      const old = ui.renaming;
      const plan = planTagRename(old, ui.renameValue, ui.counts);
      mountEl.querySelector('[data-tag-rename-info]').innerHTML = renameInfoHTML(plan);
      mountEl.querySelector('[data-tag-rename-confirm]').disabled = !(plan.ok && !plan.unchanged && !ui.busy);
    });
    const rc = mountEl.querySelector('[data-tag-rename-confirm]');
    if (rc) rc.addEventListener('click', async () => {
      if (ui.busy) return;
      const old = rc.dataset.tagRenameConfirm;
      const plan = planTagRename(old, ui.renameValue, ui.counts);
      if (!plan.ok || plan.unchanged) return;
      ui.busy = true; rc.disabled = true; rc.textContent = 'Renomeando…';
      const res = await renameNoteTag(scope, old, plan.newSlug);
      if (!res.ok){ ui.busy = false; ui.msg = res.error; ui.msgKind = 'error'; paint(); return; }
      applyTagChangeToLocalState(scope, 'rename', old, plan.newSlug);
      await finish(`✓ #${old} → #${plan.newSlug} (${res.affected} ${res.affected === 1 ? 'nota' : 'notas'}${res.merged ? `, ${res.merged} unificada(s)` : ''}).`);
    });
    const dc = mountEl.querySelector('[data-tag-delete-confirm]');
    if (dc) dc.addEventListener('click', async () => {
      if (ui.busy) return;
      const tag = dc.dataset.tagDeleteConfirm;
      ui.busy = true; dc.disabled = true; dc.textContent = 'Excluindo…';
      const res = await deleteNoteTag(scope, tag);
      if (!res.ok){ ui.busy = false; ui.msg = res.error; ui.msgKind = 'error'; paint(); return; }
      applyTagChangeToLocalState(scope, 'delete', tag, null);
      await finish(`✓ #${tag} removida de ${res.affected} ${res.affected === 1 ? 'nota' : 'notas'}.`);
    });
  }

  await load();
  paint();
}

// Seção "🏷️ Tags" do Painel de Admin (professora): Tags dos Teacher Cards dela.
async function renderAdminTagsView(){
  const wrap = document.getElementById('admin-tags-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Só a administração pode acessar esta seção.</p>`;
    return;
  }
  wrap.innerHTML = `<div class="profile-section"><div class="section-label">🏷️ Tags dos cartões de alunos</div><div id="admin-tag-manager"></div></div>`;
  await renderTagManagerInto(document.getElementById('admin-tag-manager'), { scope: 'teacher' });
}
