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

const FRIENDS_STATE = { pendingCount: 0, searchSeq: 0, rankScope: 'all', rankSeq: 0, inviteUsername: null };

// ---------- convite por link (?amigo=usuario) ----------
// O link de convite abre o site com ?amigo=<usuario>. Guardamos o usuário no
// aparelho (a pessoa pode ainda precisar criar conta/entrar) e limpamos o
// endereço. Depois do login, friendsConsumePendingInvite() abre a aba Amigos
// com esse usuário já buscado -- NUNCA envia o pedido sozinho.
const FRIENDS_INVITE_KEY = 'pendingFriendInvite';
const FRIENDS_INVITE_RE = /^[a-z0-9._-]{2,40}$/;
(function captureFriendInviteParam(){
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('amigo')) return;
    const u = (params.get('amigo') || '').trim().toLowerCase();
    if (FRIENDS_INVITE_RE.test(u)) window.localStorage.setItem(FRIENDS_INVITE_KEY, u);
    params.delete('amigo');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch (e) { /* storage bloqueado: o convite simplesmente não é lembrado */ }
})();

function friendsConsumePendingInvite(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  let u = null;
  try { u = window.localStorage.getItem(FRIENDS_INVITE_KEY); window.localStorage.removeItem(FRIENDS_INVITE_KEY); } catch (e) { return; }
  if (!u || !FRIENDS_INVITE_RE.test(u)) return;
  if (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE && PROFILE_CACHE.username === u) return; // convite do próprio link
  FRIENDS_STATE.inviteUsername = u;
  if (typeof switchTab === 'function') switchTab('friends');
}

async function friendsMyInviteLink(){
  let username = (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE && PROFILE_CACHE.username) || null;
  if (!username && typeof ensureProfileLoaded === 'function'){
    try { const p = await ensureProfileLoaded(); username = p && p.username; } catch (e) { /* segue sem */ }
  }
  if (!username) return null;
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  return `${base}?amigo=${encodeURIComponent(username)}`;
}

function friendsTimeAgo(iso){
  const t = new Date(iso).getTime();
  if (!t) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return 'agora há pouco';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

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
  not_accepting_requests: 'Essa pessoa não está aceitando novos pedidos de amizade no momento.',
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
  if (relation === 'declined_recently') return `<span class="friends-chip">Indisponível por enquanto</span>`;
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
  const inviteUser = FRIENDS_STATE.inviteUsername;
  FRIENDS_STATE.inviteUsername = null;
  const keepQuery = inviteUser || document.getElementById('friends-search-input')?.value || '';
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

  const inviteBannerHTML = inviteUser
    ? `<p class="friends-invite-banner" role="status">👋 Você abriu o convite de <strong>@${escapeHTML(inviteUser)}</strong>. Toque em "Adicionar" para enviar o pedido.</p>`
    : '';
  const searchHTML = friendsSectionHTML('Adicionar amigo', null, `
    ${inviteBannerHTML}
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

  const rankHTML = ov.friends.length ? friendsSectionHTML('Ranking dos amigos (semana)', null, '<div id="friends-mini-rank"></div>', 'friends-rank') : '';
  const activityHTML = ov.friends.length ? friendsSectionHTML('Atividade dos amigos', null, '<div id="friends-activity"></div>', 'friends-activity') : '';
  const inviteHTML = friendsSectionHTML('Convidar amigos', null, `
    <p class="profile-edit-hint">Quer estudar com alguém? Mande seu link: quem abrir já encontra seu perfil para pedir amizade.</p>
    <div class="friends-invite-actions">
      <button type="button" class="btn btn-secondary friends-action" data-friends-invite="copy">🔗 Copiar link de convite</button>
      <button type="button" class="btn btn-secondary friends-action" data-friends-invite="share" ${navigator.share ? '' : 'hidden'}>📤 Compartilhar</button>
    </div>`, 'friends-invite');
  const prefsHTML = friendsSectionHTML('Preferências', null, `
    <details class="friends-prefs" id="friends-prefs">
      <summary>Avisos e pedidos de amizade</summary>
      <div id="friends-prefs-body">${loadingHTML('Carregando...')}</div>
    </details>`, 'friends-prefs-section');

  wrap.innerHTML = `${subnav}${incomingHTML}${rankHTML}${searchHTML}${friendsHTML}${activityHTML}${outgoingHTML}${inviteHTML}${prefsHTML}`;
  renderFriendsBadges();
  wireFriendsView(wrap);
  if (ov.friends.length){ loadFriendsMiniRank(); loadFriendsActivity(); }
  loadFriendsPrefs();
  if (keepQuery.trim().length >= 3) runFriendsSearch(keepQuery);
}

// ---------- ranking dos amigos (resumo no topo da aba) ----------
async function loadFriendsMiniRank(){
  const box = document.getElementById('friends-mini-rank');
  if (!box) return;
  if (typeof fetchFriendsLeaderboard !== 'function' || typeof leaderboardCurrentWeekStart !== 'function') return;
  const seq = ++FRIENDS_STATE.rankSeq;
  const scope = FRIENDS_STATE.rankScope;
  const langs = (typeof AVAILABLE_LANGUAGES !== 'undefined' ? AVAILABLE_LANGUAGES.filter(l => l.enabled) : []);
  const scopes = [{ key: 'all', label: 'Todos' }, ...langs.map(l => ({ key: l.appKey, label: l.name }))];
  const chips = `<div class="leaderboard-tabs friends-rank-scopes" role="tablist" aria-label="Idioma do ranking dos amigos">${scopes.map(t =>
    `<button type="button" class="leaderboard-tab ${t.key === scope ? 'active' : ''}" role="tab" aria-selected="${t.key === scope}" data-friends-rank-scope="${escapeAttr(t.key)}">${escapeHTML(t.label)}</button>`).join('')}</div>`;
  box.innerHTML = `${chips}<div id="friends-mini-rank-rows">${loadingHTML('Carregando...')}</div>`;
  const rows = await fetchFriendsLeaderboard(scope, leaderboardCurrentWeekStart());
  if (seq !== FRIENDS_STATE.rankSeq) return;
  const rowsBox = document.getElementById('friends-mini-rank-rows');
  if (!rowsBox) return;
  if (rows == null){ rowsBox.innerHTML = '<p class="profile-edit-error">Não foi possível carregar o ranking agora.</p>'; return; }
  const me = CURRENT_USER && CURRENT_USER.id;
  const top = rows.slice(0, 5);
  const meRow = rows.find(r => r.user_id === me);
  const shown = (meRow && !top.includes(meRow)) ? [...top, meRow] : top;
  rowsBox.innerHTML = shown.map(r => {
    const name = r.profile?.display_name || r.profile?.username || 'Aluno(a)';
    const isMe = r.user_id === me;
    return `<div class="friends-row friends-rank-row ${isMe ? 'is-me' : ''}">
      <span class="friends-rank-pos">${typeof leaderboardRankBadge === 'function' ? leaderboardRankBadge(r.rank) : r.rank}</span>
      ${friendAvatarHTML(r.profile, r.user_id)}
      <span class="friends-person-text"><span class="friends-person-name">${escapeHTML(name)}${isMe ? ' (você)' : ''}</span></span>
      <span class="friends-rank-xp">${Number(r.amount || 0)} XP</span>
    </div>`;
  }).join('') + `<button type="button" class="btn btn-secondary friends-action friends-rank-more" data-friends-rank-more="1">Ver ranking completo</button>`;
}

// ---------- atividade dos amigos (conquistas dos últimos 30 dias) ----------
async function loadFriendsActivity(){
  const box = document.getElementById('friends-activity');
  if (!box) return;
  box.innerHTML = loadingHTML('Carregando...');
  const appKey = (typeof APP_KEY !== 'undefined') ? APP_KEY : 'frances';
  const { data, error } = await supabaseClient.rpc('friends_activity', { p_language: appKey, p_limit: 20 });
  const el = document.getElementById('friends-activity');
  if (!el) return;
  if (error){ console.error('Erro ao carregar atividade dos amigos:', error); el.innerHTML = '<p class="profile-edit-error">Não foi possível carregar a atividade agora.</p>'; return; }
  const catalog = (typeof BADGES !== 'undefined' && Array.isArray(BADGES)) ? BADGES : [];
  const items = (data || []).map(r => ({ r, badge: catalog.find(b => b.id === r.badge_id) })).filter(x => x.badge);
  if (!items.length){ el.innerHTML = '<p class="profile-empty-note">Nada de novo nos últimos 30 dias. Quando seus amigos ganharem conquistas, elas aparecem aqui.</p>'; return; }
  el.innerHTML = items.slice(0, 10).map(({ r, badge }) => {
    const name = r.display_name || r.username || 'Um amigo';
    return `<div class="friends-row friends-activity-row">
      ${friendAvatarHTML({ username: r.username, display_name: r.display_name, avatar_url: r.avatar_url }, r.user_id)}
      <span class="friends-person-text">
        <span class="friends-person-name">${escapeHTML(name)} ganhou ${escapeHTML(badge.icon || '🏅')} ${escapeHTML(badge.name || '')}</span>
        <span class="friends-person-user">${escapeHTML(friendsTimeAgo(r.earned_at))}</span>
      </span>
    </div>`;
  }).join('');
}

// ---------- preferências (avisos + "aceitar novos pedidos") ----------
const FRIENDS_PREF_FIELDS = [
  { key: 'notify_requests', label: 'Avisar quando alguém me enviar um pedido de amizade' },
  { key: 'notify_accepts', label: 'Avisar quando aceitarem meu pedido' },
  { key: 'notify_overtakes', label: 'Avisar quando um amigo me passar no ranking' },
  { key: 'accept_requests', label: 'Aceitar novos pedidos de amizade' },
];

async function loadFriendsPrefs(){
  const body = document.getElementById('friends-prefs-body');
  if (!body || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  const { data, error } = await supabaseClient.from('friend_settings').select('*').eq('user_id', CURRENT_USER.id).maybeSingle();
  const box = document.getElementById('friends-prefs-body');
  if (!box) return;
  if (error){ console.error('Erro ao carregar preferências de amigos:', error); box.innerHTML = '<p class="profile-edit-error">Não foi possível carregar as preferências agora.</p>'; return; }
  const cur = data || {};
  box.innerHTML = FRIENDS_PREF_FIELDS.map(f => `
    <label class="friends-pref-row">
      <input type="checkbox" data-friends-pref="${f.key}" ${cur[f.key] === false ? '' : 'checked'}>
      <span>${escapeHTML(f.label)}</span>
    </label>`).join('') + '<p class="profile-edit-hint">Se você desligar "Aceitar novos pedidos", quem tentar te adicionar vê que você não está aceitando pedidos agora. Seus amigos atuais não mudam.</p>';
}

async function saveFriendsPref(key, value, input){
  if (!FRIENDS_PREF_FIELDS.some(f => f.key === key)) return;
  input.disabled = true;
  const { error } = await supabaseClient.from('friend_settings')
    .upsert({ user_id: CURRENT_USER.id, [key]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  input.disabled = false;
  if (error){
    console.error('Erro ao salvar preferência de amigos:', error);
    input.checked = !value;
    showToast('Não foi possível salvar agora. Tente de novo.');
    return;
  }
  showToast('✓ Preferência salva.');
}

async function friendsInviteAction(kind){
  const link = await friendsMyInviteLink();
  if (!link){ showToast('Não foi possível gerar seu link agora.'); return; }
  const text = 'Quer estudar comigo? Entre aqui e me adicione como amigo:';
  if (kind === 'share' && navigator.share){
    try { await navigator.share({ title: 'Estudar comigo', text, url: link }); } catch (e) { /* cancelado */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    showToast('✓ Link copiado!');
  } catch (e) {
    window.prompt('Copie seu link de convite:', link);
  }
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
  // Delegação única, ligada UMA vez só: #friends-content nunca é recriado, só o
  // conteúdo dele -- ligar de novo a cada render acumularia listeners (confirm()
  // repetido, ações em dobro). Cobre as listas e os resultados da busca.
  if (wrap.dataset.friendsWired === '1') return;
  wrap.dataset.friendsWired = '1';
  wrap.addEventListener('click', async (e) => {
    const person = e.target.closest('[data-open-profile]');
    if (person && person.dataset.openProfile && !e.target.closest('[data-friend-action]')){
      if (typeof openPublicProfileModalForUsername === 'function') openPublicProfileModalForUsername(person.dataset.openProfile);
      return;
    }
    const chip = e.target.closest('[data-friends-rank-scope]');
    if (chip){ FRIENDS_STATE.rankScope = chip.dataset.friendsRankScope; loadFriendsMiniRank(); return; }
    if (e.target.closest('[data-friends-rank-more]')){
      if (typeof LEADERBOARD_PENDING_MODE !== 'undefined') LEADERBOARD_PENDING_MODE = 'friends';
      if (typeof switchTab === 'function') switchTab('leaderboard');
      return;
    }
    const invite = e.target.closest('[data-friends-invite]');
    if (invite){ friendsInviteAction(invite.dataset.friendsInvite); return; }
    const btn = e.target.closest('[data-friend-action]');
    if (!btn || btn.disabled) return;
    await handleFriendAction(btn.dataset.friendAction, btn.dataset.userId, btn);
  });
  wrap.addEventListener('change', (e) => {
    const pref = e.target.closest('[data-friends-pref]');
    if (pref) saveFriendsPref(pref.dataset.friendsPref, pref.checked, pref);
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
