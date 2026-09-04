// ---------- Badges (admin) -- criar badges e concedê-los a contas ----------
// Tela só visível/alcançável pra conta da autora (isAdminUser). Cria
// entradas em badge_catalog (definição do badge) e badge_grants (quem
// recebeu), ambas lidas por shared/profile.js pra montar a lista de
// "badges especiais" de cada Perfil -- ver computeEarnedSpecialBadges().
//
// Depende de (todos carregados antes deste arquivo, mesma posição de
// shared/profile.js -- antes de app.js, só referenciado dentro de função):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
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
  if (cleanId.length < 2) return { ok: false, error: 'ID do badge precisa ter pelo menos 2 caracteres (letras minúsculas, números ou _).' };
  if (!name?.trim()) return { ok: false, error: 'Dê um nome pro badge.' };
  if (!icon?.trim()) return { ok: false, error: 'Escolha um emoji pro badge.' };
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
    if (error.code === '23505') return { ok: false, error: `Já existe um badge com o id "${cleanId}".` };
    console.error('Erro ao criar badge:', error);
    return { ok: false, error: 'Não foi possível criar o badge agora.' };
  }
  return { ok: true, badge: data };
}

async function deleteCatalogBadge(badgeId){
  // Apaga o badge do catálogo E todas as concessões dele -- sem isso, uma
  // concessão "órfã" (apontando pra um badge que não existe mais)
  // continuaria contando como earned pra quem já tinha recebido.
  await supabaseClient.from('badge_grants').delete().eq('badge_id', badgeId);
  const { error } = await supabaseClient.from('badge_catalog').delete().eq('id', badgeId);
  return { ok: !error };
}

async function grantBadgeByUsername(badgeId, username, note){
  const target = await resolveProfileByUsername(username);
  if (!target) return { ok: false, error: 'Não achei ninguém com esse @username. Confira a grafia.' };
  const { error } = await supabaseClient
    .from('badge_grants')
    .insert({ user_id: target.user_id, badge_id: badgeId, granted_by: CURRENT_USER?.email || null, note: note?.trim() || null });
  if (error){
    if (error.code === '23505') return { ok: false, error: `@${target.username} já tem esse badge.` };
    console.error('Erro ao conceder badge:', error);
    return { ok: false, error: 'Não foi possível conceder agora.' };
  }
  return { ok: true, target };
}

async function revokeBadgeGrant(userId, badgeId){
  const { error } = await supabaseClient.from('badge_grants').delete().eq('user_id', userId).eq('badge_id', badgeId);
  return { ok: !error };
}

// Aplica de uma vez as mudanças feitas no modal "Gerenciar badge": concede
// pra quem ficou marcado e não tinha, revoga de quem ficou desmarcado e
// tinha. Sequencial (não Promise.all) de propósito -- lista de membros
// tende a ser curta, e sequencial deixa mais fácil saber exatamente onde
// parou se algo falhar no meio.
async function applyBadgeMembership(badgeId, adds, removes){
  for (const userId of adds){
    await supabaseClient.from('badge_grants').insert({ user_id: userId, badge_id: badgeId, granted_by: CURRENT_USER?.email || null });
  }
  for (const userId of removes){
    await supabaseClient.from('badge_grants').delete().eq('user_id', userId).eq('badge_id', badgeId);
  }
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

async function renderAdminBadgesView(){
  const wrap = document.getElementById('admin-badges-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = `<p class="profile-loading">Carregando...</p>`;

  const [catalog, grants, profiles] = await Promise.all([fetchBadgeCatalog(), fetchAllGrantsWithUsernames(), fetchAllProfiles()]);

  const catalogOptionsHTML = catalog.map(b => `<option value="${b.id}">${b.icon} ${b.name}</option>`).join('');
  // <datalist> nativo -- some idiomas/navegadores mostram como uma lista
  // "toggle" ao clicar no campo, filtrando conforme digita, sem precisar
  // de nenhum JS de dropdown customizado.
  const usernameDatalistHTML = profiles.map(p => `<option value="${p.username}">${p.display_name ? escapeHTML(p.display_name) : ''}</option>`).join('');

  const builtInHTML = SPECIAL_BADGES.map(b => `
    <div class="admin-badge-row">
      <span class="admin-badge-icon">${b.icon}</span>
      <div class="admin-badge-info">
        <div class="admin-badge-name">${b.name}</div>
        <div class="admin-badge-desc">${b.desc} · automático, não editável aqui</div>
      </div>
    </div>
  `).join('');

  const catalogHTML = catalog.length ? catalog.map(b => {
    const memberCount = grants.filter(g => g.badge_id === b.id).length;
    return `
    <div class="admin-badge-row clickable" data-manage-badge-id="${b.id}">
      <span class="admin-badge-icon">${b.icon}</span>
      <div class="admin-badge-info">
        <div class="admin-badge-name">${b.name}</div>
        <div class="admin-badge-desc">${b.description ? b.description + ' · ' : ''}${memberCount} ${memberCount === 1 ? 'pessoa' : 'pessoas'} · clique pra gerenciar</div>
      </div>
      <button class="admin-badge-delete-btn" data-badge-id="${b.id}" title="Excluir badge (e todas as concessões dele)">🗑️</button>
    </div>
  `;
  }).join('') : `<p class="profile-empty-note">Nenhum badge criado ainda.</p>`;

  const grantsHTML = grants.length ? grants.map(g => {
    const badge = catalog.find(b => b.id === g.badge_id) || SPECIAL_BADGES.find(b => b.id === g.badge_id);
    return `
      <div class="admin-grant-row">
        <span class="admin-badge-icon">${badge?.icon || '🏅'}</span>
        <div class="admin-badge-info">
          <div class="admin-badge-name">@${g.username || '(usuário removido)'} <span class="admin-grant-badge-name">— ${badge?.name || g.badge_id}</span></div>
          <div class="admin-badge-desc">${g.note ? escapeHTML(g.note) + ' · ' : ''}concedido em ${new Date(g.granted_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <button class="admin-badge-delete-btn" data-revoke-user="${g.user_id}" data-revoke-badge="${g.badge_id}" title="Revogar">✕</button>
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">Nenhum badge concedido ainda.</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Criar novo badge</div>
      <form id="admin-create-badge-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-badge-id">ID (só letras minúsculas/números/_)</label>
        <input type="text" id="admin-badge-id" class="profile-edit-input" maxlength="32" placeholder="ex: colaboradora">
        <label class="profile-edit-label" for="admin-badge-name">Nome</label>
        <input type="text" id="admin-badge-name" class="profile-edit-input" maxlength="40" placeholder="ex: Colaboradora">
        <label class="profile-edit-label" for="admin-badge-icon">Emoji</label>
        <input type="text" id="admin-badge-icon" class="profile-edit-input" maxlength="8" placeholder="🛠️">
        <label class="profile-edit-label" for="admin-badge-desc">Descrição (opcional)</label>
        <input type="text" id="admin-badge-desc" class="profile-edit-input" maxlength="120" placeholder="ex: Ajudou a sugerir melhorias no app">
        <p class="profile-edit-error" id="admin-create-badge-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-badge-btn">Criar badge</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Conceder badge</div>
      <form id="admin-grant-badge-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-grant-badge-select">Badge</label>
        <select id="admin-grant-badge-select" class="profile-edit-input">${catalogOptionsHTML || '<option value="">Crie um badge primeiro</option>'}</select>
        <label class="profile-edit-label" for="admin-grant-username">@username de quem vai receber</label>
        <div class="profile-edit-username-wrap">
          <span class="profile-edit-at">@</span>
          <input type="text" id="admin-grant-username" class="profile-edit-input" maxlength="24" placeholder="username" list="admin-username-datalist" autocomplete="off">
        </div>
        <datalist id="admin-username-datalist">${usernameDatalistHTML}</datalist>
        <label class="profile-edit-label" for="admin-grant-note">Nota (opcional, só pra você)</label>
        <input type="text" id="admin-grant-note" class="profile-edit-input" maxlength="120" placeholder="ex: reportou o bug do streak">
        <p class="profile-edit-error" id="admin-grant-badge-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-grant-badge-btn" ${catalog.length ? '' : 'disabled'}>Conceder</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Badges automáticos</div>
      ${builtInHTML}
    </div>

    <div class="profile-section">
      <div class="section-label">Catálogo (criados por você)</div>
      ${catalogHTML}
    </div>

    <div class="profile-section">
      <div class="section-label">Concessões atuais</div>
      ${grantsHTML}
    </div>
  `;

  document.getElementById('admin-create-badge-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-badge-btn');
    const errorEl = document.getElementById('admin-create-badge-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await createCatalogBadge({
      id: document.getElementById('admin-badge-id').value,
      name: document.getElementById('admin-badge-name').value,
      icon: document.getElementById('admin-badge-icon').value,
      description: document.getElementById('admin-badge-desc').value,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(`✓ Badge "${result.badge.name}" criado.`);
    renderAdminBadgesView();
  });

  document.getElementById('admin-grant-badge-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-grant-badge-btn');
    const errorEl = document.getElementById('admin-grant-badge-error');
    errorEl.textContent = '';
    const badgeId = document.getElementById('admin-grant-badge-select').value;
    if (!badgeId){ errorEl.textContent = 'Crie um badge antes de conceder.'; return; }
    btn.disabled = true;
    const result = await grantBadgeByUsername(
      badgeId,
      document.getElementById('admin-grant-username').value,
      document.getElementById('admin-grant-note').value
    );
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(`✓ Badge concedido a @${result.target.username}.`);
    renderAdminBadgesView();
  });

  wrap.querySelectorAll('[data-badge-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // não deixa o clique "vazar" pro data-manage-badge-id da linha por baixo
      if (!confirm('Excluir este badge e todas as concessões dele?')) return;
      await deleteCatalogBadge(btn.dataset.badgeId);
      renderAdminBadgesView();
    });
  });

  wrap.querySelectorAll('[data-revoke-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await revokeBadgeGrant(btn.dataset.revokeUser, btn.dataset.revokeBadge);
      renderAdminBadgesView();
    });
  });

  wrap.querySelectorAll('[data-manage-badge-id]').forEach(row => {
    row.addEventListener('click', () => openManageBadgeMembersModal(row.dataset.manageBadgeId, catalog, profiles, grants));
  });
}

// Modal "Gerenciar badge": lista todo mundo que já tem @username criado,
// pré-marcado quem já tem o badge. Salvar concede pra quem passou a
// marcar e revoga de quem passou a desmarcar -- é o "clicar no badge e
// desselecionar o nome" pedido, sem precisar sair da lista de badges.
function openManageBadgeMembersModal(badgeId, catalog, profiles, grants){
  const badge = catalog.find(b => b.id === badgeId);
  if (!badge) return;
  const holderIds = new Set(grants.filter(g => g.badge_id === badgeId).map(g => g.user_id));

  const modal = document.getElementById('admin-manage-badge-modal');
  document.getElementById('admin-manage-badge-title').textContent = `${badge.icon} ${badge.name}`;
  document.getElementById('admin-manage-badge-list').innerHTML = profiles.length ? profiles.map(p => `
    <label class="admin-member-row">
      <input type="checkbox" data-user-id="${p.user_id}" ${holderIds.has(p.user_id) ? 'checked data-was-checked="1"' : ''}>
      <span>@${p.username}${p.display_name ? ` <span class="admin-member-name">${escapeHTML(p.display_name)}</span>` : ''}</span>
    </label>
  `).join('') : `<p class="profile-empty-note">Ninguém criou um perfil ainda.</p>`;
  modal.dataset.badgeId = badgeId;
  modal.style.display = 'flex';
}

function closeManageBadgeMembersModal(){
  document.getElementById('admin-manage-badge-modal').style.display = 'none';
}

function wireManageBadgeMembersModal(){
  const modal = document.getElementById('admin-manage-badge-modal');
  if (!modal) return;

  document.getElementById('admin-manage-badge-modal-close').addEventListener('click', closeManageBadgeMembersModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeManageBadgeMembersModal(); });

  document.getElementById('admin-manage-badge-save-btn').addEventListener('click', async () => {
    const badgeId = modal.dataset.badgeId;
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    const adds = [], removes = [];
    checkboxes.forEach(cb => {
      const wasChecked = cb.dataset.wasChecked === '1';
      if (cb.checked && !wasChecked) adds.push(cb.dataset.userId);
      if (!cb.checked && wasChecked) removes.push(cb.dataset.userId);
    });
    const btn = document.getElementById('admin-manage-badge-save-btn');
    btn.disabled = true;
    await applyBadgeMembership(badgeId, adds, removes);
    btn.disabled = false;
    closeManageBadgeMembersModal();
    showToast('✓ Membros do badge atualizados.');
    renderAdminBadgesView();
  });
}

wireManageBadgeMembersModal();
