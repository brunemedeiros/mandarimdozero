// ---------- Badges (admin) -- criar badges e concedê-los a contas ----------
// Tela só visível/alcançável pra conta da autora (isAdminUser), no Design System do painel (shared/admin-badges-ui.js: catálogo em
// cartões, concessões em tabela com filtro, formulários ao lado, janelas de editar e de gerenciar pessoas). Cria
// entradas em badge_catalog (definição do badge) e badge_grants (quem
// recebeu), ambas lidas por shared/profile.js pra montar a lista de
// "badges especiais" de cada Perfil -- ver computeEarnedSpecialBadges().
//
// Depende de (todos carregados antes deste arquivo, mesma posição de
// shared/profile.js -- antes de app.js, só referenciado dentro de função):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
//   - shared/admin-badges-ui.js, shared/painel/painel-ui.js (PainelUI.confirmar)
//   - languages/<lang>/app.js   (isAdminUser, switchTab)

// Resolve um @username pra { user_id, username, display_name } -- usado
// tanto na hora de conceder um badge quanto (futuramente) em qualquer
// outra ação admin que precise mirar uma conta específica por username.
async function resolveProfileByUsername(username){
  const clean = slugifyUsername(username);
  if (!clean) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name')
    .eq('username', clean)
    .maybeSingle();
  if (error){ console.error('Erro ao buscar usuário:', error); return null; }
  return data;
}

// Lista completa de perfis -- alimenta tanto o autocomplete de @username
// (campo "Conceder badge") quanto a lista de membros do modal "Gerenciar
// badge". Não pagina: o público desta plataforma ainda é pequeno o
// suficiente pra uma lista só; se crescer muito, isso é o primeiro lugar
// a revisitar (busca no servidor em vez de trazer tudo).
async function fetchAllProfiles(){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name')
    .order('username', { ascending: true });
  if (error){ console.error('Erro ao carregar lista de usuários:', error); return []; }
  return data || [];
}

async function createCatalogBadge({ id, name, icon, description }){
  const cleanId = String(id || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
  if (cleanId.length < 2) return { ok: false, error: t('admin.badges.err.idShort') };
  if (!name?.trim()) return { ok: false, error: t('admin.badges.err.name') };
  if (!icon?.trim()) return { ok: false, error: t('admin.badges.err.icon') };
  const { data, error } = await supabaseClient
    .from('badge_catalog')
    .insert({
      id: cleanId,
      name: name.trim().slice(0, 40),
      icon: icon.trim().slice(0, 8),
      description: (description || '').trim().slice(0, 120) || null,
      created_by: CURRENT_USER?.email || null,
    })
    .select()
    .single();
  if (error){
    if (error.code === '23505') return { ok: false, error: t('admin.badges.err.idExists', { id: cleanId }) };
    console.error('Erro ao criar badge:', error);
    return { ok: false, error: t('admin.badges.err.createFailed') };
  }
  return { ok: true, badge: data };
}

// Edita um badge já existente. Se o id mudou, não existe "renomear a
// chave primária" automático -- badge_grants.badge_id não tem FK pro
// catálogo (é só texto comparado por igualdade, ver 002/003) -- então a
// troca é feita manualmente NESSA ordem (cria a linha nova → migra as
// concessões → só então apaga a linha antiga) pra uma concessão nunca
// ficar órfã mesmo se algo falhar no meio.
async function updateCatalogBadge({ oldId, newId, name, icon, description }){
  const cleanId = String(newId || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
  if (cleanId.length < 2) return { ok: false, error: t('admin.badges.err.idShort') };
  if (!name?.trim()) return { ok: false, error: t('admin.badges.err.name') };
  if (!icon?.trim()) return { ok: false, error: t('admin.badges.err.icon') };

  const payload = {
    name: name.trim().slice(0, 40),
    icon: icon.trim().slice(0, 8),
    description: (description || '').trim().slice(0, 120) || null,
  };

  if (cleanId === oldId){
    const { data, error } = await supabaseClient
      .from('badge_catalog')
      .update(payload)
      .eq('id', oldId)
      .select()
      .single();
    if (error){ console.error('Erro ao editar badge:', error); return { ok: false, error: t('teacherMaterials.err.saveFailed') }; }
    return { ok: true, badge: data };
  }

  const { data: clash } = await supabaseClient.from('badge_catalog').select('id').eq('id', cleanId).maybeSingle();
  if (clash) return { ok: false, error: t('admin.badges.err.idExists', { id: cleanId }) };

  const { data: created, error: insertError } = await supabaseClient
    .from('badge_catalog')
    .insert({ id: cleanId, ...payload, created_by: CURRENT_USER?.email || null })
    .select()
    .single();
  if (insertError){ console.error('Erro ao trocar id do badge:', insertError); return { ok: false, error: t('admin.badges.err.idChangeFailed') }; }

  const { error: migrateError } = await supabaseClient.from('badge_grants').update({ badge_id: cleanId }).eq('badge_id', oldId);
  if (migrateError){
    console.error('Erro ao migrar concessões pro novo id:', migrateError);
    return { ok: false, error: t('admin.badges.err.migrateFailed') };
  }

  await supabaseClient.from('badge_catalog').delete().eq('id', oldId);
  return { ok: true, badge: created };
}

async function updateGrantNote(userId, badgeId, note){
  const { error } = await supabaseClient
    .from('badge_grants')
    .update({ note: note?.trim() || null })
    .eq('user_id', userId)
    .eq('badge_id', badgeId);
  return { ok: !error };
}

async function deleteCatalogBadge(badgeId){
  // Apaga o badge do catálogo E todas as concessões dele -- sem isso, uma
  // concessão "órfã" (apontando pra um badge que não existe mais)
  // continuaria contando como earned pra quem já tinha recebido. Se as
  // concessões não puderem ser apagadas, o catálogo fica como está.
  const { error: grantsError } = await supabaseClient.from('badge_grants').delete().eq('badge_id', badgeId);
  if (grantsError){ console.error('Erro ao apagar concessões do badge:', grantsError); return { ok: false }; }
  const { error } = await supabaseClient.from('badge_catalog').delete().eq('id', badgeId);
  return { ok: !error };
}

async function grantBadgeByUsername(badgeId, username, note){
  const target = await resolveProfileByUsername(username);
  if (!target) return { ok: false, error: t('admin.premium.notFound') };
  const { error } = await supabaseClient
    .from('badge_grants')
    .insert({ user_id: target.user_id, badge_id: badgeId, granted_by: CURRENT_USER?.email || null, note: note?.trim() || null });
  if (error){
    if (error.code === '23505') return { ok: false, error: t('admin.badges.err.alreadyHas', { username: target.username }) };
    console.error('Erro ao conceder badge:', error);
    return { ok: false, error: t('admin.badges.err.grantFailed') };
  }
  return { ok: true, target };
}

async function revokeBadgeGrant(userId, badgeId){
  const { error } = await supabaseClient.from('badge_grants').delete().eq('user_id', userId).eq('badge_id', badgeId);
  return { ok: !error };
}

// Aplica de uma vez as mudanças feitas no modal "Gerenciar badge": concede
// pra quem ficou marcado e não tinha (com a nota que a autora já digitou
// pra essa pessoa), revoga de quem ficou desmarcado e tinha, e atualiza a
// nota de quem continuou marcado mas mudou o texto. Sequencial (não
// Promise.all) de propósito -- lista de membros tende a ser curta, e
// sequencial deixa mais fácil saber exatamente onde parou se algo falhar
// no meio.
async function applyBadgeMembership(badgeId, adds, removes, noteChanges){
  let failed = 0;
  for (const add of adds){
    const { error } = await supabaseClient.from('badge_grants').insert({ user_id: add.userId, badge_id: badgeId, granted_by: CURRENT_USER?.email || null, note: add.note?.trim() || null });
    if (error) failed++;
  }
  for (const userId of removes){
    const { error } = await supabaseClient.from('badge_grants').delete().eq('user_id', userId).eq('badge_id', badgeId);
    if (error) failed++;
  }
  for (const change of (noteChanges || [])){
    const r = await updateGrantNote(change.userId, badgeId, change.note);
    if (!r.ok) failed++;
  }
  return { ok: failed === 0, failed };
}

// Junta badge_grants com profiles num só JS (as duas tabelas referenciam
// auth.users de forma independente, sem FK direta entre si -- não dá pra
// pedir ao PostgREST pra embutir profiles.username automaticamente aqui).
async function fetchAllGrantsWithUsernames(){
  const { data: grants, error } = await supabaseClient
    .from('badge_grants')
    .select('*')
    .order('granted_at', { ascending: false });
  if (error || !grants?.length) return [];
  const userIds = [...new Set(grants.map(g => g.user_id))];
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name')
    .in('user_id', userIds);
  const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  return grants.map(g => ({ ...g, username: byId[g.user_id]?.username, display_name: byId[g.user_id]?.display_name }));
}

const BADGES_VIEW = { catalog: [], grants: [], profiles: [], filtros: { badge: '', busca: '' }, token: 0, ligado: false };

function badgesWrap(){ return document.getElementById('admin-badges-content'); }

function badgesRefreshGrants(){
  const box = document.querySelector('[data-badges-concessoes]');
  if (!box) return;
  const V = BADGES_VIEW;
  box.innerHTML = tbdGrantsTableHTML(tbdFilterGrants(V.grants, V.filtros, V.catalog, SPECIAL_BADGES), V.grants.length, V.catalog, SPECIAL_BADGES);
}

// Busca tudo de novo e atualiza só as partes que dependem dos dados (catálogo, concessões, filtro e opções do formulário de
// conceder), sem refazer os formulários (apagaria o que foi digitado).
async function badgesReload(){
  const V = BADGES_VIEW;
  const [catalog, grants, profiles] = await Promise.all([fetchBadgeCatalog(), fetchAllGrantsWithUsernames(), fetchAllProfiles()]);
  V.catalog = catalog; V.grants = grants; V.profiles = profiles;
  if (V.filtros.badge && !tbdFindBadge(V.filtros.badge, catalog, SPECIAL_BADGES)) V.filtros.badge = '';
  const cat = document.querySelector('[data-badges-catalogo]'); if (cat) cat.innerHTML = tbdCatalogHTML(catalog, grants);
  const filtro = document.querySelector('[data-badges-filtro]');
  if (filtro){
    const used = new Set(grants.map(g => g.badge_id));
    filtro.innerHTML = `<option value="">${escapeHTML(t('badges.filter.all'))}</option>` + catalog.concat(SPECIAL_BADGES.filter(b => used.has(b.id))).map(b => `<option value="${escapeHTML(b.id)}"${V.filtros.badge === b.id ? ' selected' : ''}>${escapeHTML(tbdIconText(b))} ${escapeHTML(b.name)}</option>`).join('');
  }
  const sel = document.getElementById('conceder-badge');
  if (sel){
    const keep = sel.value;
    sel.innerHTML = catalog.length ? catalog.map(b => `<option value="${escapeHTML(b.id)}">${escapeHTML(b.icon)} ${escapeHTML(b.name)}</option>`).join('') : `<option value="">${escapeHTML(t('admin.badges.grant.createFirst'))}</option>`;
    if (catalog.some(b => b.id === keep)) sel.value = keep;
    const btn = document.getElementById('conceder-enviar'); if (btn) btn.disabled = !catalog.length;
  }
  const dl = document.getElementById('conceder-usuarios');
  if (dl) dl.innerHTML = profiles.map(p => `<option value="${escapeHTML(p.username)}">${escapeHTML(p.display_name || '')}</option>`).join('');
  badgesRefreshGrants();
}

async function renderAdminBadgesView(){
  const wrap = badgesWrap();
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  badgesBind(wrap);
  const token = ++BADGES_VIEW.token;
  wrap.innerHTML = tbdLoadingHTML();
  const [catalog, grants, profiles] = await Promise.all([fetchBadgeCatalog(), fetchAllGrantsWithUsernames(), fetchAllProfiles()]);
  if (token !== BADGES_VIEW.token) return;
  const V = BADGES_VIEW;
  V.catalog = catalog; V.grants = grants; V.profiles = profiles;
  if (V.filtros.badge && !tbdFindBadge(V.filtros.badge, catalog, SPECIAL_BADGES)) V.filtros.badge = '';
  wrap.innerHTML = tbdPageHTML({ catalog, grants, profiles, builtin: SPECIAL_BADGES, filtros: V.filtros });
}

async function badgesCreate(form){
  const btn = document.getElementById('badge-criar'), errorEl = document.getElementById('badge-criar-erro');
  errorEl.textContent = '';
  btn.disabled = true;
  const result = await createCatalogBadge({
    id: document.getElementById('badge-id').value, name: document.getElementById('badge-nome').value,
    icon: document.getElementById('badge-icone').value, description: document.getElementById('badge-desc').value,
  });
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = result.error; return; }
  showToast(t('admin.badges.toast.created', { name: result.badge.name }));
  form.reset();
  await badgesReload();
}

async function badgesGrant(form){
  const btn = document.getElementById('conceder-enviar'), errorEl = document.getElementById('conceder-erro');
  errorEl.textContent = '';
  const badgeId = document.getElementById('conceder-badge').value;
  if (!badgeId){ errorEl.textContent = t('admin.badges.grant.createBefore'); return; }
  btn.disabled = true;
  const result = await grantBadgeByUsername(badgeId, document.getElementById('conceder-usuario').value, document.getElementById('conceder-nota').value);
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = result.error; return; }
  showToast(t('admin.badges.toast.granted', { username: result.target.username }));
  document.getElementById('conceder-usuario').value = ''; document.getElementById('conceder-nota').value = '';
  await badgesReload();
}

function badgesOpenEdit(id){
  const b = BADGES_VIEW.catalog.find(x => x.id === id); const wrap = badgesWrap(); if (!b || !wrap) return;
  const old = document.getElementById('dlg-editar-badge'); if (old) old.remove();
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', tbdEditDialogHTML(b));
  const d = document.getElementById('dlg-editar-badge');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function badgesSaveEdit(form){
  const errorEl = document.getElementById('editar-berro'); errorEl.textContent = '';
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  const result = await updateCatalogBadge({
    oldId: form.dataset.id, newId: document.getElementById('editar-bid').value, name: document.getElementById('editar-bnome').value,
    icon: document.getElementById('editar-bicone').value, description: document.getElementById('editar-bdesc').value,
  });
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = result.error; return; }
  document.getElementById('dlg-editar-badge').close();
  showToast(t('admin.badges.toast.updated', { name: result.badge.name }));
  await badgesReload();
}

function badgesOpenMembers(id){
  const b = BADGES_VIEW.catalog.find(x => x.id === id); const wrap = badgesWrap(); if (!b || !wrap) return;
  const old = document.getElementById('dlg-membros-badge'); if (old) old.remove();
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', tbdMembersDialogHTML(b, BADGES_VIEW.profiles, BADGES_VIEW.grants));
  const d = document.getElementById('dlg-membros-badge');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function badgesSaveMembers(form){
  const badgeId = form.dataset.id, errorEl = document.getElementById('membros-erro'); errorEl.textContent = '';
  const adds = [], removes = [], noteChanges = [];
  form.querySelectorAll('input[type="checkbox"][data-user]').forEach(cb => {
    const userId = cb.dataset.user, was = cb.dataset.tinha === '1';
    const noteInput = form.querySelector(`[data-nota-membro="${CSS.escape(userId)}"]`);
    const note = noteInput ? noteInput.value : '';
    if (cb.checked && !was) adds.push({ userId, note });
    else if (!cb.checked && was) removes.push(userId);
    else if (cb.checked && was && noteInput && note !== noteInput.dataset.notaOriginal) noteChanges.push({ userId, note });
  });
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  const r = await applyBadgeMembership(badgeId, adds, removes, noteChanges);
  btn.disabled = false;
  await badgesReload();
  if (!r.ok){ errorEl.textContent = t('badges.members.partial', { n: r.failed }); return; }
  document.getElementById('dlg-membros-badge').close();
  showToast(t('admin.badges.toast.members'));
}

async function badgesDelete(id){
  const b = BADGES_VIEW.catalog.find(x => x.id === id); if (!b) return;
  const n = BADGES_VIEW.grants.filter(g => g.badge_id === id).length;
  const opts = { titulo: t('badges.delete.title', { name: b.name }), descricao: n ? tp('badges.delete.textWith', n === 1 ? 1 : 2, { n }) : t('badges.delete.textNone', { n }), confirmar: t('badges.delete.confirm'), cancelar: t('badges.edit.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(t('admin.badges.confirm.delete'));
  if (!ok) return;
  const r = await deleteCatalogBadge(id);
  if (!r.ok) showToast(t('plans.failed'));
  await badgesReload();
}

async function badgesRevoke(userId, badgeId){
  const r = await revokeBadgeGrant(userId, badgeId);
  if (!r.ok){ showToast(t('plans.failed')); return; }
  showToast(t('badges.toast.revoked'));
  await badgesReload();
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function badgesBind(wrap){
  if (BADGES_VIEW.ligado) return;
  BADGES_VIEW.ligado = true;
  const V = BADGES_VIEW;
  wrap.addEventListener('click', (e) => {
    let el;
    if ((el = e.target.closest('[data-gerenciar-badge]'))) return badgesOpenMembers(el.dataset.gerenciarBadge);
    if ((el = e.target.closest('[data-editar-badge]'))){ el.closest('details')?.removeAttribute('open'); return badgesOpenEdit(el.dataset.editarBadge); }
    if ((el = e.target.closest('[data-apagar-badge]'))){ el.closest('details')?.removeAttribute('open'); return badgesDelete(el.dataset.apagarBadge); }
    if ((el = e.target.closest('[data-revogar]'))){ const tr = el.closest('[data-concessao]'); return badgesRevoke(tr.dataset.user, tr.dataset.badgeId); }
  });
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('[data-badges-busca]')){ V.filtros.busca = e.target.value; badgesRefreshGrants(); }
    else if (e.target.matches('[data-buscar-membro]')){
      const q = e.target.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      wrap.querySelectorAll('[data-membro]').forEach(m => { m.hidden = !!q && !m.dataset.busca.includes(q); });
    }
  });
  wrap.addEventListener('change', (e) => { if (e.target.matches('[data-badges-filtro]')){ V.filtros.badge = e.target.value; badgesRefreshGrants(); } });
  wrap.addEventListener('submit', (e) => {
    if (e.target.id === 'form-criar-badge'){ e.preventDefault(); badgesCreate(e.target); }
    else if (e.target.id === 'form-conceder-badge'){ e.preventDefault(); badgesGrant(e.target); }
    else if (e.target.id === 'form-editar-badge'){ e.preventDefault(); badgesSaveEdit(e.target); }
    else if (e.target.id === 'form-membros-badge'){ e.preventDefault(); badgesSaveMembers(e.target); }
  });
}
