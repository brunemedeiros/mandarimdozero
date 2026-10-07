// ---------- Amigos (pedido + aceite) e contador "+N" ----------
// Dados: tabela friendships (migration 073). Leitura direta pela RLS (cada um
// vê só as próprias linhas); toda ESCRITA passa pelas funções SECURITY
// DEFINER send_friend_request / respond_friend_request / cancel_friend_request
// / remove_friend, que também aplicam os limites (20 pedidos por dia, 100
// amigos) e criam as notificações do outro lado. Busca: search_profiles_for_friends
// (mínimo 3 letras, no máximo 20 resultados, por @username ou nome).
//
// Tela: aba "Amigos" do Perfil (#view-friends, rota #/friends). O ranking de
// amigos mora em shared/leaderboard.js (mesma tela do Ranking Geral).
//
// Depende de (carregados antes): shared/supabase-client.js (supabaseClient),
// shared/auth.js (CURRENT_USER), shared/profile.js (escapeHTML, escapeAttr,
// avatarInitials, avatarColor), shared/utils.js (loadingHTML), shared/toast.js
// (showToast). openPublicProfileModalForUsername/switchTab são só chamados
// dentro de funções.

const FRIENDS_STATE = { pendingCount: 0, searchSeq: 0 };

const FRIENDS_ERROR_LABELS = {
  not_authenticated: 'Entre na sua conta para usar os amigos.',
  invalid_target: 'Não dá para adicionar a si mesmo.',
  not_found: 'Não encontramos essa pessoa.',
  already_friends: 'Vocês já são amigos.',
  already_sent: 'Você já enviou um pedido para essa pessoa.',
  declined_recently: 'Esse pedido foi recusado recentemente. Tente de novo em alguns dias.',
  daily_request_limit: 'Você atingiu o limite de 20 pedidos por dia. Tente de novo amanhã.',
  friend_limit_reached: 'Você atingiu o limite de 100 amigos.',
  target_friend_limit: 'Essa pessoa atingiu o limite de amigos.',
  no_pending_request: 'Esse pedido não existe mais.',
  not_friends: 'Vocês não são mais amigos.',
};

function friendsErrorMessage(code){
  return FRIENDS_ERROR_LABELS[code] || 'Não foi possível concluir agora. Tente de novo.';
}

// Chama uma função e normaliza: { ok:true, data } ou { ok:false, error:<código> }.
async function friendsRpc(name, args){
  const { data, error } = await supabaseClient.rpc(name, args);
  if (error){ console.error(`Erro em ${name}:`, error); return { ok: false, error: 'network' }; }
  if (data && data.error) return { ok: false, error: data.error };
  return { ok: true, data };
}

const sendFriendRequest = (userId) => friendsRpc('send_friend_request', { p_addressee: userId });
const respondFriendRequest = (userId, accept) => friendsRpc('respond_friend_request', { p_requester: userId, p_accept: !!accept });
const cancelFriendRequest = (userId) => friendsRpc('cancel_friend_request', { p_addressee: userId });
const removeFriend = (userId) => friendsRpc('remove_friend', { p_friend: userId });

async function searchFriendProfiles(query){
  const { data, error } = await supabaseClient.rpc('search_profiles_for_friends', { p_query: query });
  if (error){ console.error('Erro na busca de amigos:', error); return null; }
  return data || [];
}

// Pedidos e amizades da conta, já com o perfil (nome/foto) de cada pessoa.
async function fetchFriendshipOverview(){
  const empty = { friends: [], incoming: [], outgoing: [] };
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return empty;
  const me = CURRENT_USER.id;
  const { data: rows, error } = await supabaseClient
    .from('friendships')
    .select('id, requester_id, addressee_id, status, requested_at, responded_at')
    .neq('status', 'declined');
  if (error){ console.error('Erro ao carregar amizades:', error); return null; }
  const otherId = (r) => (r.requester_id === me ? r.addressee_id : r.requester_id);
  const ids = [...new Set((rows || []).map(otherId))];
  let byId = {};
  if (ids.length){
    const { data: profiles } = await supabaseClient
      .from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', ids);
    byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  }
  const out = { friends: [], incoming: [], outgoing: [] };
  (rows || []).forEach(r => {
    const item = { userId: otherId(r), profile: byId[otherId(r)] || null, at: r.responded_at || r.requested_at };
    if (r.status === 'accepted') out.friends.push(item);
    else if (r.addressee_id === me) out.incoming.push(item);
    else out.outgoing.push(item);
  });
  const nameOf = (i) => (i.profile?.display_name || i.profile?.username || '').toLowerCase();
  out.friends.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  out.incoming.sort((a, b) => new Date(b.at) - new Date(a.at));
  out.outgoing.sort((a, b) => new Date(b.at) - new Date(a.at));
  return out;
}

// 'self' | 'none' | 'friends' | 'sent' | 'received' -- usado no perfil público.
async function fetchFriendshipWith(userId){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return null;
  if (userId === CURRENT_USER.id) return 'self';
  const me = CURRENT_USER.id;
  const { data, error } = await supabaseClient
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`)
    .limit(1);
  if (error){ console.error('Erro ao carregar amizade:', error); return null; }
  const r = (data || [])[0];
  if (!r || r.status === 'declined') return 'none';
  if (r.status === 'accepted') return 'friends';
  return r.requester_id === me ? 'sent' : 'received';
}

// ---------- contador "+N" (pedidos recebidos pendentes) ----------
async function refreshFriendRequestCount(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    FRIENDS_STATE.pendingCount = 0;
    renderFriendsBadges();
    return;
  }
  const { count, error } = await supabaseClient
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('addressee_id', CURRENT_USER.id)
    .eq('status', 'pending');
  FRIENDS_STATE.pendingCount = error ? 0 : (count || 0);
  renderFriendsBadges();
}

// Coloca o selo "+N" no item Perfil (sidebar e barra inferior) e na sub-aba
// Amigos do Perfil. Idempotente; chamada de novo sempre que o contador muda
// ou o Perfil é redesenhado (a sub-aba é reinjetada a cada render).
function renderFriendsBadges(){
  const n = FRIENDS_STATE.pendingCount;
  const label = n > 9 ? '9+' : `+${n}`;
  const targets = [
    ...document.querySelectorAll('.tab-btn[data-tab="profile"]'),
    ...document.querySelectorAll('.profile-subnav [data-tab="friends"]'),
  ];
  targets.forEach(el => {
    let badge = el.querySelector(':scope > .friends-badge');
    if (n <= 0){ badge?.remove(); return; }
    if (!badge){
      badge = document.createElement('span');
      badge.className = 'friends-badge';
      badge.setAttribute('aria-hidden', 'true');
      el.appendChild(badge);
    }
    badge.textContent = label;
  });
  document.querySelectorAll('.profile-subnav [data-tab="friends"]').forEach(el => {
    el.setAttribute('aria-label', n > 0 ? `Amigos, ${n} ${n === 1 ? 'pedido novo' : 'pedidos novos'}` : 'Amigos');
  });
}

// ---------- tela: Perfil > Amigos ----------
function friendAvatarHTML(profile, userId){
  const name = profile?.display_name || profile?.username || 'Aluno(a)';
  return profile?.avatar_url
    ? `<img class="friends-avatar" src="${escapeAttr(profile.avatar_url)}" alt="">`
    : `<div class="friends-avatar" style="background:${avatarColor(userId)};" aria-hidden="true">${avatarInitials(name)}</div>`;
}

function friendPersonHTML(profile, userId){
  const name = profile?.display_name || profile?.username || 'Aluno(a)';
  const username = profile?.username || '';
  return `
    <button type="button" class="friends-person" data-open-profile="${escapeAttr(username)}" ${username ? '' : 'disabled'}>
      ${friendAvatarHTML(profile, userId)}
      <span class="friends-person-text">
        <span class="friends-person-name">${escapeHTML(name)}</span>
        <span class="friends-person-user">@${escapeHTML(username)}</span>
      </span>
    </button>`;
}

function friendActionButtonHTML(label, action, userId, kind){
  return `<button type="button" class="btn ${kind || 'btn-secondary'} friends-action" data-friend-action="${action}" data-user-id="${escapeAttr(userId)}">${label}</button>`;
}

function friendsRelationActionsHTML(relation, userId){
  if (relation === 'friends') return `<span class="friends-chip">✓ Amigos</span>`;
  if (relation === 'sent') return `<span class="friends-chip">Pedido enviado</span>${friendActionButtonHTML('Cancelar', 'cancel', userId)}`;
  if (relation === 'received') return friendActionButtonHTML('Aceitar', 'accept', userId, 'btn-primary') + friendActionButtonHTML('Recusar', 'decline', userId);
  return friendActionButtonHTML('Adicionar', 'add', userId, 'btn-primary');
}

function friendsSectionHTML(title, count, bodyHTML, id){
  return `
    <section class="friends-section" ${id ? `id="${id}"` : ''}>
      <div class="section-label">${title}${count != null ? ` (${count})` : ''}</div>
      ${bodyHTML}
    </section>`;
}

function friendsSubnavHTML(active){
  const tabs = [['profile', 'Visão geral'], ['goals', 'Metas'], ['progress', 'Progresso'], ['friends', 'Amigos']];
  return `<div class="leaderboard-tabs profile-subnav" role="tablist" aria-label="Seção do Perfil">
    ${tabs.map(([k, l]) => `<button class="leaderboard-tab ${k === active ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
  </div>`;
}

async function renderFriendsView(){
  const wrap = document.getElementById('friends-content');
  if (!wrap) return;
  const subnav = friendsSubnavHTML('friends');
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    wrap.innerHTML = `${subnav}<p class="profile-empty-note">Entre na sua conta para adicionar amigos e ver o ranking entre vocês.</p>`;
    renderFriendsBadges();
    return;
  }
  // Mantém o que a pessoa está digitando na busca durante re-renders.
  const keepQuery = document.getElementById('friends-search-input')?.value || '';
  wrap.innerHTML = `${subnav}${loadingHTML('Carregando amigos...')}`;
  const ov = await fetchFriendshipOverview();
  if (!ov){
    wrap.innerHTML = `${subnav}<p class="profile-empty-note">Não foi possível carregar seus amigos agora.</p><button type="button" class="btn btn-secondary" id="friends-retry">Tentar de novo</button>`;
    wrap.querySelector('#friends-retry').addEventListener('click', renderFriendsView);
    return;
  }
  FRIENDS_STATE.pendingCount = ov.incoming.length;

  const incomingHTML = ov.incoming.length ? friendsSectionHTML('Pedidos recebidos', ov.incoming.length, ov.incoming.map(i => `
    <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
      ${friendPersonHTML(i.profile, i.userId)}
      <div class="friends-row-actions">${friendsRelationActionsHTML('received', i.userId)}</div>
    </div>`).join(''), 'friends-incoming') : '';

  const searchHTML = friendsSectionHTML('Adicionar amigo', null, `
    <label class="profile-edit-label" for="friends-search-input">Buscar por nome ou @usuário</label>
    <input type="search" class="profile-edit-input" id="friends-search-input" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" placeholder="Digite pelo menos 3 letras" value="${escapeAttr(keepQuery)}">
    <div id="friends-search-results" aria-live="polite"></div>`, 'friends-add');

  const friendsHTML = friendsSectionHTML('Seus amigos', ov.friends.length, ov.friends.length
    ? ov.friends.map(i => `
      <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
        ${friendPersonHTML(i.profile, i.userId)}
        <div class="friends-row-actions">${friendActionButtonHTML('Desfazer amizade', 'remove', i.userId, 'btn-secondary friends-danger')}</div>
      </div>`).join('')
    : `<p class="profile-empty-note">Você ainda não tem amigos. Busque alguém acima para enviar um pedido.</p>`, 'friends-list');

  const outgoingHTML = ov.outgoing.length ? friendsSectionHTML('Pedidos enviados', ov.outgoing.length, ov.outgoing.map(i => `
    <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
      ${friendPersonHTML(i.profile, i.userId)}
      <div class="friends-row-actions">${friendsRelationActionsHTML('sent', i.userId)}</div>
    </div>`).join(''), 'friends-outgoing') : '';

  wrap.innerHTML = `${subnav}${incomingHTML}${searchHTML}${friendsHTML}${outgoingHTML}`;
  renderFriendsBadges();
  wireFriendsView(wrap);
  if (keepQuery.trim().length >= 3) runFriendsSearch(keepQuery);
}

async function runFriendsSearch(rawQuery){
  const box = document.getElementById('friends-search-results');
  if (!box) return;
  const q = (rawQuery || '').trim();
  const seq = ++FRIENDS_STATE.searchSeq;
  if (q.length < 3){ box.innerHTML = q ? `<p class="profile-edit-hint">Digite pelo menos 3 letras.</p>` : ''; return; }
  box.innerHTML = `<p class="profile-edit-hint">Buscando...</p>`;
  const rows = await searchFriendProfiles(q);
  if (seq !== FRIENDS_STATE.searchSeq) return; // chegou uma busca mais nova
  if (rows == null){ box.innerHTML = `<p class="profile-edit-error">Não foi possível buscar agora.</p>`; return; }
  if (!rows.length){ box.innerHTML = `<p class="profile-empty-note">Ninguém encontrado. Confira o nome ou o @usuário.</p>`; return; }
  box.innerHTML = rows.map(r => `
    <div class="friends-row" data-friend-row="${escapeAttr(r.user_id)}">
      ${friendPersonHTML({ username: r.username, display_name: r.display_name, avatar_url: r.avatar_url }, r.user_id)}
      <div class="friends-row-actions">${friendsRelationActionsHTML(r.relation, r.user_id)}</div>
    </div>`).join('');
}

function wireFriendsView(wrap){
  const input = wrap.querySelector('#friends-search-input');
  let timer = null;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runFriendsSearch(input.value), 350);
  });
  // Delegação única: cobre as listas e os resultados da busca (reinjetados).
  wrap.addEventListener('click', async (e) => {
    const person = e.target.closest('[data-open-profile]');
    if (person && person.dataset.openProfile && !e.target.closest('[data-friend-action]')){
      if (typeof openPublicProfileModalForUsername === 'function') openPublicProfileModalForUsername(person.dataset.openProfile);
      return;
    }
    const btn = e.target.closest('[data-friend-action]');
    if (!btn || btn.disabled) return;
    await handleFriendAction(btn.dataset.friendAction, btn.dataset.userId, btn);
  });
}

// Faz a ação, mostra o resultado e redesenha a tela. Botão fica desabilitado
// durante a chamada (evita duplo clique).
async function handleFriendAction(action, userId, btn){
  if (action === 'remove' && !window.confirm('Desfazer a amizade? Vocês deixam de aparecer no ranking um do outro.')) return;
  if (btn) btn.disabled = true;
  let res;
  if (action === 'add') res = await sendFriendRequest(userId);
  else if (action === 'accept') res = await respondFriendRequest(userId, true);
  else if (action === 'decline') res = await respondFriendRequest(userId, false);
  else if (action === 'cancel') res = await cancelFriendRequest(userId);
  else if (action === 'remove') res = await removeFriend(userId);
  else return;

  if (!res.ok){
    showToast(friendsErrorMessage(res.error));
  } else if (action === 'add'){
    showToast(res.data?.status === 'accepted' ? 'Vocês agora são amigos! 🎉' : 'Pedido enviado!');
  } else if (action === 'accept'){
    showToast('Amizade aceita! 🎉');
  } else if (action === 'remove'){
    showToast('Amizade desfeita.');
  }
  await renderFriendsView();
  refreshFriendRequestCount();
  if (typeof refreshFriendsRankingViews === 'function') refreshFriendsRankingViews();
}

// ---------- botão no perfil público (modal do Ranking / #/user/x) ----------
// Só para quem está logado e não é a própria pessoa.
async function renderFriendProfileAction(bodyEl, profile){
  if (!bodyEl || !profile) return;
  const slot = bodyEl.querySelector('#public-profile-friend-slot');
  if (!slot) return;
  const relation = await fetchFriendshipWith(profile.user_id);
  if (!relation || relation === 'self'){ slot.innerHTML = ''; return; }
  slot.innerHTML = `<div class="friends-profile-actions">${friendsRelationActionsHTML(relation, profile.user_id)}</div>`;
  slot.querySelectorAll('[data-friend-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const action = btn.dataset.friendAction;
      let res;
      if (action === 'add') res = await sendFriendRequest(profile.user_id);
      else if (action === 'accept') res = await respondFriendRequest(profile.user_id, true);
      else if (action === 'decline') res = await respondFriendRequest(profile.user_id, false);
      else if (action === 'cancel') res = await cancelFriendRequest(profile.user_id);
      if (res && !res.ok) showToast(friendsErrorMessage(res.error));
      else if (action === 'add') showToast(res?.data?.status === 'accepted' ? 'Vocês agora são amigos! 🎉' : 'Pedido enviado!');
      await renderFriendProfileAction(bodyEl, profile);
      refreshFriendRequestCount();
    });
  });
}
