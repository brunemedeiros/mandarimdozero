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

const FRIENDS_STATE = { pendingCount: 0, searchSeq: 0, rankScope: 'all', rankSeq: 0, inviteUsername: null, extras: null };

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
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return t('friends.timeNow');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tp('friends.timeHours', hours);
  const days = Math.floor(hours / 24);
  return tp('friends.timeDays', days);
}

const FRIENDS_ERROR_LABELS = {
  not_authenticated: () => t('friends.error.not_authenticated'),
  invalid_target: () => t('friends.error.invalid_target'),
  not_found: () => t('friends.error.not_found'),
  already_friends: () => t('friends.error.already_friends'),
  already_sent: () => t('friends.error.already_sent'),
  declined_recently: () => t('friends.error.declined_recently'),
  daily_request_limit: () => t('friends.error.daily_request_limit'),
  friend_limit_reached: () => t('friends.error.friend_limit_reached'),
  target_friend_limit: () => t('friends.error.target_friend_limit'),
  no_pending_request: () => t('friends.error.no_pending_request'),
  not_friends: () => t('friends.error.not_friends'),
  not_accepting_requests: () => t('friends.error.not_accepting_requests'),
  daily_congrats_limit: () => t('friends.error.daily_congrats_limit'),
  target_not_found: () => t('friends.error.target_not_found'),
};

function friendsErrorMessage(code){
  return FRIENDS_ERROR_LABELS[code] ? FRIENDS_ERROR_LABELS[code]() : t('friends.error.generic');
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
    // 080: pedido de quem tem perfil privado também mostra o nome (profile_cards).
    const profiles = await fetchProfileCards(ids);
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
    el.setAttribute('aria-label', n > 0 ? tp('friends.ariaNewRequests', n) : t('friends.mode.friends'));
  });
}

// ---------- tela: Perfil > Amigos ----------
function friendAvatarHTML(profile, userId){
  const name = profile?.display_name || profile?.username || t('leaderboard.anonymous');
  return profile?.avatar_url
    ? `<img class="friends-avatar" src="${escapeAttr(profile.avatar_url)}" alt="">`
    : `<div class="friends-avatar" style="background:${avatarColor(userId)};" aria-hidden="true">${avatarInitials(name)}</div>`;
}

function friendPersonHTML(profile, userId){
  const name = profile?.display_name || profile?.username || t('leaderboard.anonymous');
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
  if (relation === 'friends') return `<span class="friends-chip">✓ ${t('friends.mode.friends')}</span>`;
  if (relation === 'declined_recently') return `<span class="friends-chip">${t('friends.chip.unavailable')}</span>`;
  if (relation === 'sent') return `<span class="friends-chip">${t('friends.chip.sent')}</span>${friendActionButtonHTML(t('friends.btn.cancel'), 'cancel', userId)}`;
  if (relation === 'received') return friendActionButtonHTML(t('friends.btn.accept'), 'accept', userId, 'btn-primary') + friendActionButtonHTML(t('friends.btn.decline'), 'decline', userId);
  return friendActionButtonHTML(t('friends.btn.add'), 'add', userId, 'btn-primary');
}

function friendsSectionHTML(title, count, bodyHTML, id){
  return `
    <section class="friends-section" ${id ? `id="${id}"` : ''}>
      <h3 class="section-label">${title}${count != null ? ` (${count})` : ''}</h3>
      ${bodyHTML}
    </section>`;
}

function friendsSubnavHTML(active){
  const tabs = [['profile', t('profile.tabOverview')], ['goals', t('profile.tabGoals')], ['progress', t('profile.tabProgress')], ['friends', t('profile.tabFriends')]];
  return `<div class="leaderboard-tabs profile-subnav" role="tablist" aria-label="${t('profile.subnavAria')}">
    ${tabs.map(([k, l]) => `<button class="leaderboard-tab ${k === active ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
  </div>`;
}

// Um único botão de convite: abre o compartilhar do aparelho quando existe,
// senão copia o link (friendsInviteAction decide).
function friendsInviteButtonHTML(extraClass){
  return `<button type="button" class="btn btn-primary ${extraClass || ''}" data-friends-invite="${navigator.share ? 'share' : 'copy'}">${t('friends.inviteBtn')}</button>`;
}

// Campo de busca + (opcional) aviso de convite e resultados. Na lista com
// amigos o campo fica à direita do título e o resto vai para a largura toda
// (friendsSearchExtrasHTML), para os resultados não ficarem espremidos.
function friendsSearchFieldHTML(keepQuery, label){
  return `
    <div class="friends-search">
      <label class="sr-only" for="friends-search-input">${t('friends.searchLabel')}</label>
      <span class="friends-search-icon" aria-hidden="true">🔍</span>
      <input type="search" id="friends-search-input" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" placeholder="${escapeAttr(label)}" value="${escapeAttr(keepQuery)}">
    </div>`;
}

function friendsSearchExtrasHTML(inviteUser){
  const banner = inviteUser
    ? `<p class="friends-invite-banner" role="status">👋 ${t('friends.inviteBanner', { user: '<strong>@' + escapeHTML(inviteUser) + '</strong>' })}</p>`
    : '';
  return `${banner}<div id="friends-search-results" aria-live="polite"></div>`;
}

// Cartão de amigo: avatar grande, nome, XP da semana (preenchido pelo
// ranking) e menu ⋯ com "Desfazer amizade" (fica fora da vista de propósito).
function friendCardHTML(item){
  const p = item.profile;
  const name = p?.display_name || p?.username || t('leaderboard.anonymous');
  const username = p?.username || '';
  const id = escapeAttr(item.userId);
  return `
    <div class="friend-card" data-friend-row="${id}">
      <button type="button" class="friend-card-more" data-friend-menu="${id}" aria-haspopup="true" aria-expanded="false" aria-label="${escapeAttr(t('friends.card.more', { name }))}">⋯</button>
      <div class="friend-card-menu" role="menu" hidden>
        ${username ? `<button type="button" role="menuitem" data-open-profile="${escapeAttr(username)}">${t('friends.card.viewProfile')}</button>` : ''}
        <button type="button" role="menuitem" class="friends-danger" data-friend-action="remove" data-user-id="${id}">${t('friends.btn.remove')}</button>
      </div>
      <span class="friend-card-flags" data-friend-flags="${id}"></span>
      <button type="button" class="friend-card-person" data-open-profile="${escapeAttr(username)}" ${username ? '' : 'disabled'}>
        <span class="friend-avatar-wrap" data-friend-avatar="${id}">${friendAvatarHTML(p, item.userId)}</span>
        <span class="friend-card-name">${escapeHTML(name)}</span>
        <span class="friend-card-user">@${escapeHTML(username)}</span>
      </button>
      <span class="friend-card-xp" data-friend-xp="${id}">…</span>
    </div>`;
}

function friendPendingCardHTML(item){
  const p = item.profile;
  const name = p?.display_name || p?.username || t('leaderboard.anonymous');
  const username = p?.username || '';
  return `
    <div class="friend-card is-pending" data-friend-row="${escapeAttr(item.userId)}">
      <button type="button" class="friend-card-person" data-open-profile="${escapeAttr(username)}" ${username ? '' : 'disabled'}>
        ${friendAvatarHTML(p, item.userId)}
        <span class="friend-card-name">${escapeHTML(name)}</span>
        <span class="friend-card-wait">${t('friends.chip.sent')}</span>
      </button>
      ${friendActionButtonHTML(t('friends.btn.cancel'), 'cancel', item.userId, 'btn-secondary btn-sm')}
    </div>`;
}

function friendsRequestsHTML(incoming){
  if (!incoming.length) return '';
  return `
    <section class="friends-requests" id="friends-incoming">
      <h3 class="friends-requests-title"><span class="friends-dot" aria-hidden="true"></span>${tp('friends.requests.title', incoming.length)}</h3>
      ${incoming.map(i => `
        <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
          ${friendPersonHTML(i.profile, i.userId)}
          <div class="friends-row-actions">
            ${friendActionButtonHTML(t('friends.btn.accept'), 'accept', i.userId, 'btn-primary')}
            ${friendActionButtonHTML(t('friends.btn.notNow'), 'decline', i.userId)}
          </div>
        </div>`).join('')}
    </section>`;
}

function friendsWeekHTML(){
  const days = (typeof leaderboardDaysRemaining === 'function' && typeof leaderboardCurrentWeekStart === 'function')
    ? leaderboardDaysRemaining(leaderboardCurrentWeekStart()) : null;
  return `
    <section class="friends-week" id="friends-rank">
      <div class="friends-week-top">
        <h3 class="friends-week-title">${t('friends.week.title')}</h3>
        ${days != null ? `<span class="friends-week-days">${tp('friends.week.endsIn', days)}</span>` : ''}
      </div>
      <div id="friends-mini-rank"></div>
      <div class="friends-feed" id="friends-activity"></div>
      <button type="button" class="friends-link" data-friends-rank-more="1">${t('friends.rank.seeFull')} →</button>
    </section>`;
}

function friendsEmptyHTML(keepQuery, inviteUser){
  const me = (typeof PROFILE_CACHE !== 'undefined' && PROFILE_CACHE) || {};
  const myName = me.display_name || me.username || '';
  const meAvatar = me.avatar_url
    ? `<img class="friends-avatar friends-crowd-me" src="${escapeAttr(me.avatar_url)}" alt="">`
    : `<div class="friends-avatar friends-crowd-me" aria-hidden="true">${myName ? avatarInitials(myName) : '🙂'}</div>`;
  return `
    <section class="friends-empty" id="friends-invite">
      <div class="friends-crowd" aria-hidden="true">
        <div class="friends-avatar friends-crowd-other" style="background:${avatarColor('a')};">?</div>
        ${meAvatar}
        <div class="friends-avatar friends-crowd-other" style="background:${avatarColor('b')};">?</div>
      </div>
      <h3 class="friends-empty-title">${t('friends.empty.title')}</h3>
      <p class="friends-empty-text">${t('friends.empty.text')}</p>
      ${friendsInviteButtonHTML('btn-block')}
      <div class="friends-empty-search">${friendsSearchFieldHTML(keepQuery, t('friends.empty.searchLabel'))}${friendsSearchExtrasHTML(inviteUser)}</div>
      <ul class="friends-empty-steps">
        <li><span aria-hidden="true">🏆</span>${t('friends.empty.step1')}</li>
        <li><span aria-hidden="true">🔔</span>${t('friends.empty.step2')}</li>
        <li><span aria-hidden="true">🎉</span>${t('friends.empty.step3')}</li>
      </ul>
    </section>`;
}

async function renderFriendsView(){
  const wrap = document.getElementById('friends-content');
  if (!wrap) return;
  const subnav = friendsSubnavHTML('friends');
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    wrap.innerHTML = `${subnav}<p class="profile-empty-note">${t('friends.guestNote')}</p>`;
    renderFriendsBadges();
    return;
  }
  // Mantém o que a pessoa está digitando na busca durante re-renders.
  const inviteUser = FRIENDS_STATE.inviteUsername;
  FRIENDS_STATE.inviteUsername = null;
  const keepQuery = inviteUser || document.getElementById('friends-search-input')?.value || '';
  wrap.innerHTML = `${subnav}${loadingHTML(t('friends.loading'))}`;
  const ov = await fetchFriendshipOverview();
  if (!ov){
    wrap.innerHTML = `${subnav}<p class="profile-empty-note">${t('friends.loadError')}</p><button type="button" class="btn btn-secondary" id="friends-retry">${t('friends.retry')}</button>`;
    wrap.querySelector('#friends-retry').addEventListener('click', renderFriendsView);
    return;
  }
  FRIENDS_STATE.pendingCount = ov.incoming.length;
  const hasFriends = ov.friends.length > 0;

  // Ordem: o que pede ação (pedidos), a disputa da semana e os amigos.
  const headHTML = `
    <div class="friends-head">
      <h2 class="friends-title">${t('friends.title')}</h2>
      ${hasFriends ? friendsInviteButtonHTML('friends-head-invite') : ''}
    </div>`;

  let bodyHTML;
  if (hasFriends){
    const cards = ov.friends.map(friendCardHTML).join('') + ov.outgoing.map(friendPendingCardHTML).join('');
    bodyHTML = `
      ${friendsWeekHTML()}
      <section class="friends-section" id="friends-list">
        <div class="friends-list-head">
          <h3 class="section-label">${t('friends.section.friends')} (${ov.friends.length})</h3>
          <div class="friends-list-search">${friendsSearchFieldHTML(keepQuery, t('friends.searchLabel'))}</div>
        </div>
        ${friendsSearchExtrasHTML(inviteUser)}
        <div class="friends-grid">${cards}</div>
      </section>`;
  } else {
    const pending = ov.outgoing.length
      ? friendsSectionHTML(t('friends.section.outgoing'), ov.outgoing.length, `<div class="friends-grid">${ov.outgoing.map(friendPendingCardHTML).join('')}</div>`, 'friends-outgoing')
      : '';
    bodyHTML = friendsEmptyHTML(keepQuery, inviteUser) + pending;
  }

  wrap.innerHTML = `${subnav}${headHTML}${friendsRequestsHTML(ov.incoming)}<section class="friends-received" id="friends-received" hidden></section>${bodyHTML}`;
  renderFriendsBadges();
  wireFriendsView(wrap);
  if (hasFriends){ loadFriendsMiniRank(); loadFriendsActivity(); loadFriendsExtras(); }
  loadFriendsReceivedCongrats();
  if (keepQuery.trim().length >= 3) runFriendsSearch(keepQuery);
}

async function loadFriendsMiniRank(){
  const box = document.getElementById('friends-mini-rank');
  if (!box) return;
  if (typeof fetchFriendsLeaderboard !== 'function' || typeof leaderboardCurrentWeekStart !== 'function') return;
  const seq = ++FRIENDS_STATE.rankSeq;
  const scope = FRIENDS_STATE.rankScope;
  const langs = (typeof AVAILABLE_LANGUAGES !== 'undefined' ? AVAILABLE_LANGUAGES.filter(l => l.enabled) : []);
  const scopes = [{ key: 'all', label: t('friends.scopeAll') }, ...langs.map(l => ({ key: l.appKey, label: l.name }))];
  const chips = `<div class="leaderboard-tabs friends-rank-scopes" role="tablist" aria-label="${t('friends.scopeAria')}">${scopes.map(sc =>
    `<button type="button" class="leaderboard-tab ${sc.key === scope ? 'active' : ''}" role="tab" aria-selected="${sc.key === scope}" data-friends-rank-scope="${escapeAttr(sc.key)}">${escapeHTML(sc.label)}</button>`).join('')}</div>`;
  box.innerHTML = `${chips}<div id="friends-mini-rank-rows">${loadingHTML(t('friends.loadingShort'))}</div>`;
  const rows = await fetchFriendsLeaderboard(scope, leaderboardCurrentWeekStart());
  if (seq !== FRIENDS_STATE.rankSeq) return;
  const rowsBox = document.getElementById('friends-mini-rank-rows');
  if (!rowsBox) return;
  if (rows == null){ rowsBox.innerHTML = `<p class="profile-edit-error">${t('friends.rank.miniError')}</p>`; return; }
  const me = CURRENT_USER && CURRENT_USER.id;
  rowsBox.innerHTML = leaderboardPodiumHTML(rows, me) + leaderboardDuelHTML(rows, me);
  // XP da semana (mesmo escopo) nos cartões dos amigos.
  const byId = Object.fromEntries(rows.map(r => [r.user_id, Number(r.amount || 0)]));
  document.querySelectorAll('[data-friend-xp]').forEach(el => {
    el.textContent = `${byId[el.dataset.friendXp] || 0} XP`;
  });
  friendsDecorateExtras();
}

// ---------- foguinho e bandeiras (migration 086: friends_extras) ----------
// Sequência efetiva (zera se a pessoa pulou um dia) de você + amigos, se estudou
// hoje e os idiomas que estuda. Amigos veem mesmo quem tem perfil privado.
async function loadFriendsExtras(){
  const { data, error } = await supabaseClient.rpc('friends_extras');
  if (error){ console.error('Erro ao carregar sequência dos amigos:', error); return; }
  FRIENDS_STATE.extras = Object.fromEntries((data || []).map(r => [r.user_id, r]));
  friendsDecorateExtras();
}

function friendsStreakChipHTML(x){
  const n = Number(x?.streak || 0);
  if (!n) return '';
  const label = tp('friends.streak.aria', n) + (x.studied_today ? ` · ${t('friends.streak.today')}` : '');
  return `<span class="friend-streak ${x.studied_today ? 'is-today' : ''}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">🔥${n}</span>`;
}

function friendsLangFlagsHTML(langs){
  const all = (typeof AVAILABLE_LANGUAGES !== 'undefined') ? AVAILABLE_LANGUAGES : [];
  return (langs || []).map(k => all.find(l => l.appKey === k)).filter(Boolean)
    .map(l => `<span class="friend-flag" title="${escapeAttr(l.name)}">${l.flagSvg}</span>`).join('');
}

// Põe o foguinho nos avatares (cartões e pódio) e as bandeiras nos cartões.
// Idempotente: roda quando chegam os extras e de novo quando o pódio é redesenhado.
function friendsDecorateExtras(){
  const map = FRIENDS_STATE.extras;
  if (!map) return;
  document.querySelectorAll('#friends-content [data-friend-avatar]').forEach(el => {
    el.querySelector('.friend-streak')?.remove();
    const x = map[el.dataset.friendAvatar];
    el.classList.toggle('is-today', !!x?.studied_today && !!x?.streak);
    el.insertAdjacentHTML('beforeend', friendsStreakChipHTML(x));
  });
  document.querySelectorAll('#friends-content [data-friend-flags]').forEach(el => {
    el.innerHTML = friendsLangFlagsHTML(map[el.dataset.friendFlags]?.languages);
  });
  document.querySelectorAll('#friends-rank .lb-pod[data-podium-user]').forEach(el => {
    el.querySelector('.friend-streak')?.remove();
    const chip = friendsStreakChipHTML(map[el.dataset.podiumUser]);
    if (chip) el.querySelector('.lb-pod-avatar')?.insertAdjacentHTML('afterend', chip);
  });
}

// ---------- marco de sequência (chamado por registerStudyToday em fr/zh app.js) ----------
// O servidor registra só o maior marco ainda não registrado nesta sequência
// (5, 10, 15, 25, 50... 365) e é ele que aparece para os amigos.
function friendsRecordStreakMilestone(streak, lastDay){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || !(Number(streak) >= 5) || !lastDay) return;
  try {
    Promise.resolve(supabaseClient.rpc('record_streak_milestone', { p_streak: Number(streak), p_last_day: lastDay }))
      .then(({ error } = {}) => { if (error) console.error('Erro ao registrar marco de sequência:', error); })
      .catch(e => console.error('Erro ao registrar marco de sequência:', e));
  } catch (e) { console.error('Erro ao registrar marco de sequência:', e); }
}

// ---------- atividade dos amigos: marcos de sequência + conquistas (últimos 7 dias) ----------
const FRIENDS_REACTIONS = ['🎉', '👏', '💪', '❤️'];
const FRIENDS_FEED_DAYS = 7;

function friendsCheerHTML(item){
  const picker = `<div class="friends-reactions" role="group" aria-label="${escapeAttr(t('friends.cheer.aria'))}" hidden>
      ${FRIENDS_REACTIONS.map(r => `<button type="button" class="friends-reaction ${item.my_reaction === r ? 'is-mine' : ''}" data-cheer-reaction="${r}" aria-label="${r}">${r}</button>`).join('')}
    </div>`;
  const btn = item.my_reaction
    ? `<button type="button" class="friends-cheer is-done" data-cheer-open="1" aria-expanded="false">${t('friends.cheer.done', { r: item.my_reaction })}</button>`
    : `<button type="button" class="btn btn-secondary btn-sm friends-cheer" data-cheer-open="1" aria-expanded="false">${t('friends.cheer.btn')}</button>`;
  return `<div class="friends-cheer-wrap">${btn}${picker}</div>`;
}

async function loadFriendsActivity(){
  const box = document.getElementById('friends-activity');
  if (!box) return;
  if (!box.children.length) box.innerHTML = loadingHTML(t('friends.loadingShort'));
  const appKey = (typeof APP_KEY !== 'undefined') ? APP_KEY : LanguageRegistry.defaultAppKey();
  // Conquistas: friends_badge_feed (091, com Parabéns); sem ela, a lista antiga (friends_activity, sem botão).
  let [badgesRes, streakRes] = await Promise.all([
    supabaseClient.rpc('friends_badge_feed', { p_limit: 30 }),
    supabaseClient.rpc('friends_streak_feed', { p_limit: 20 }),
  ]);
  const badgeCheers = !badgesRes.error && Array.isArray(badgesRes.data);
  if (!badgeCheers) badgesRes = await supabaseClient.rpc('friends_activity', { p_language: appKey, p_limit: 20 });
  const el = document.getElementById('friends-activity');
  if (!el) return;
  if (badgesRes.error && streakRes.error){
    console.error('Erro ao carregar atividade dos amigos:', badgesRes.error, streakRes.error);
    el.innerHTML = `<p class="profile-edit-error">${t('friends.activity.error')}</p>`;
    return;
  }
  const since = Date.now() - FRIENDS_FEED_DAYS * 86400000;
  const nameOf = (r) => r.display_name || r.username || t('friends.activity.aFriend');
  // Conquistas com níveis: no feed só ouro e nível máximo (bronze e prata ficam no perfil). Conquista de curso só
  // aparece no site do mesmo idioma. Nome na forma neutra (o gênero do amigo é privado).
  const describe = (id) => (typeof describeBadgeId === 'function' ? describeBadgeId(id) : null);
  const seen = new Set();
  const badgeItems = (badgesRes.data || [])
    .map(r => ({ r, d: describe(r.badge_id), at: new Date(r.earned_at).getTime() }))
    .filter(x => x.d && !x.d.classic && x.at >= since && (x.d.tier === 'gold' || x.d.tier === 'max'))
    .filter(x => BadgeTracks.isAccountId(x.r.badge_id) || !x.r.langs || x.r.langs.includes(appKey))
    .filter(x => { const k = x.r.user_id + '|' + x.r.badge_id; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ r, d, at }) => {
      const cheer = badgeCheers && BadgeTracks.allowsCongrats(d.track, d.tier);
      return { at, html: `<div class="friends-activity-row is-badge"${cheer ? ` data-cheer-friend="${escapeAttr(r.user_id)}" data-cheer-kind="badge" data-cheer-ref="${escapeAttr(r.badge_id)}"` : ''}>
      ${badgeMedalHTML(d, { size: 'xs' })}
      <span class="friends-activity-text">${t('friends.feed.badgeLevel', { name: `<strong>${escapeHTML(nameOf(r))}</strong>`, badge: `<strong>${escapeHTML(d.name)}</strong>` })}
        <span class="friends-activity-when">· ${escapeHTML(friendsTimeAgo(r.earned_at))}</span>
        ${Number(r.total_reactions) > 0 ? `<span class="friends-cheer-count">${tp('friends.cheer.count', Number(r.total_reactions))}</span>` : ''}
        ${r.my_congrats_thanked ? `<span class="friends-cheer-thanked">${t('friends.cheer.thanked', { name: escapeHTML(leaderboardFirstName(r)) })}</span>` : ''}
      </span>
      ${cheer ? friendsCheerHTML(r) : ''}
    </div>` };
    });
  // Marcos de sequência: com "Parabenizar" (as conquistas ganham o botão quando o critério for definido).
  const streakItems = (streakRes.data || []).map(r => ({ at: new Date(r.reached_at).getTime(), html: `
    <div class="friends-activity-row is-streak" data-cheer-friend="${escapeAttr(r.user_id)}" data-cheer-ref="${escapeAttr(r.ref)}">
      <span class="friends-medal is-fire" aria-hidden="true">🔥</span>
      <span class="friends-activity-text">${t('friends.feed.streak', { name: `<strong>${escapeHTML(nameOf(r))}</strong>`, n: Number(r.days) })}
        <span class="friends-activity-when">· ${escapeHTML(friendsTimeAgo(r.reached_at))}</span>
        ${Number(r.total_reactions) > 0 ? `<span class="friends-cheer-count">${tp('friends.cheer.count', Number(r.total_reactions))}</span>` : ''}
        ${r.my_congrats_thanked ? `<span class="friends-cheer-thanked">${t('friends.cheer.thanked', { name: escapeHTML(leaderboardFirstName(r)) })}</span>` : ''}
      </span>
      ${friendsCheerHTML(r)}
    </div>` }));
  const items = [...streakItems, ...badgeItems].sort((a, b) => b.at - a.at).slice(0, 6);
  el.innerHTML = items.length ? items.map(i => i.html).join('') : `<p class="friends-feed-empty">${t('friends.activity.empty')}</p>`;
}

async function friendsSendCheer(row, reaction, btn){
  if (btn) btn.disabled = true;
  const res = await friendsRpc('congratulate_friend', { p_friend: row.dataset.cheerFriend, p_kind: row.dataset.cheerKind || 'streak', p_ref: row.dataset.cheerRef, p_reaction: reaction });
  if (!res.ok){ showToast(friendsErrorMessage(res.error)); if (btn) btn.disabled = false; return; }
  showToast(t('friends.toast.cheered', { r: reaction }));
  await loadFriendsActivity();
}

// ---------- parabéns que eu recebi (com "Agradecer") ----------
async function loadFriendsReceivedCongrats(){
  const box = document.getElementById('friends-received');
  if (!box) return;
  const { data, error } = await supabaseClient.rpc('my_received_congrats', { p_limit: 20 });
  const el = document.getElementById('friends-received');
  if (!el) return;
  if (error){ console.error('Erro ao carregar parabéns recebidos:', error); el.hidden = true; return; }
  const rows = data || [];
  if (!rows.length){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<h3 class="friends-received-title">🎉 ${t('friends.received.title')}</h3>` + rows.map(r => {
    const name = r.display_name || r.username || t('friends.activity.aFriend');
    const days = Number(String(r.target_ref || '').split('@')[0]) || 0;
    // Parabéns por conquista: o nome do nível vem do catálogo, no gênero da própria pessoa (ela está vendo).
    const own = r.target_kind === 'badge' && typeof describeBadgeId === 'function' ? describeBadgeId(r.target_ref) : null;
    const ownName = own ? (BadgeTracks.levelName(t, own.track, own.level, badgeOwnGender(), badgeNameVars(evaluateBadgeTracks(STATE).m)) || own.name) : '';
    const text = own
      ? t('friends.received.rowBadge', { name: `<strong>${escapeHTML(name)}</strong>`, r: escapeHTML(r.reaction), badge: `<strong>${escapeHTML(ownName)}</strong>` })
      : t('friends.received.row', { name: `<strong>${escapeHTML(name)}</strong>`, r: escapeHTML(r.reaction), n: days });
    return `<div class="friends-received-row" data-congrats-id="${escapeAttr(String(r.id))}">
      ${friendAvatarHTML({ username: r.username, display_name: r.display_name, avatar_url: r.avatar_url }, r.from_user)}
      <span class="friends-activity-text">${text}
        <span class="friends-activity-when">· ${escapeHTML(friendsTimeAgo(r.created_at))}</span></span>
      ${r.thanked
        ? `<span class="friends-thanked-chip">${t('friends.received.thanked')}</span>`
        : `<button type="button" class="btn btn-primary btn-sm friends-thank" data-thank-congrats="${escapeAttr(String(r.id))}">${t('friends.received.thank')}</button>`}
    </div>`;
  }).join('');
}

async function friendsThank(id, btn){
  if (btn) btn.disabled = true;
  const res = await friendsRpc('thank_friend_congrats', { p_congrats_id: Number(id) });
  if (!res.ok){ showToast(friendsErrorMessage(res.error)); if (btn) btn.disabled = false; return; }
  showToast(t('friends.toast.thanked'));
  await loadFriendsReceivedCongrats();
}

// ---------- preferências (avisos + "aceitar novos pedidos") ----------
const FRIENDS_PREF_FIELDS = [
  { key: 'notify_requests', label: () => t('friends.pref.notify_requests') },
  { key: 'notify_accepts', label: () => t('friends.pref.notify_accepts') },
  { key: 'notify_overtakes', label: () => t('friends.pref.notify_overtakes') },
  { key: 'notify_congrats', label: () => t('friends.pref.notify_congrats') },
  { key: 'accept_requests', label: () => t('friends.pref.accept_requests') },
];

// Mora em Configurações > Notificações (shared/notification-preferences.js
// chama esta função depois de desenhar a aba). O contêiner é recriado a cada
// render de lá, então o listener é ligado de novo junto com ele.
async function loadFriendsPrefs(){
  const body = document.getElementById('friends-prefs-body');
  if (!body || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  body.innerHTML = loadingHTML(t('friends.loadingShort'));
  const { data, error } = await supabaseClient.from('friend_settings').select('*').eq('user_id', CURRENT_USER.id).maybeSingle();
  const box = document.getElementById('friends-prefs-body');
  if (!box) return;
  if (error){ console.error('Erro ao carregar preferências de amigos:', error); box.innerHTML = `<p class="profile-edit-error">${t('friends.prefs.error')}</p>`; return; }
  const cur = data || {};
  box.innerHTML = FRIENDS_PREF_FIELDS.map(f => `
    <label class="friends-pref-row">
      <input type="checkbox" data-friends-pref="${f.key}" ${cur[f.key] === false ? '' : 'checked'}>
      <span>${escapeHTML(f.label())}</span>
    </label>`).join('') + `<p class="profile-edit-hint">${t('friends.prefs.hint')}</p>`;
  if (box.dataset.friendsPrefsWired !== '1'){
    box.dataset.friendsPrefsWired = '1';
    box.addEventListener('change', (e) => {
      const pref = e.target.closest('[data-friends-pref]');
      if (pref) saveFriendsPref(pref.dataset.friendsPref, pref.checked, pref);
    });
  }
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
    showToast(t('friends.toast.saveError'));
    return;
  }
  showToast(t('friends.toast.prefSaved'));
}

async function friendsInviteAction(kind){
  const link = await friendsMyInviteLink();
  if (!link){ showToast(t('friends.toast.linkError')); return; }
  const text = t('friends.shareText');
  if (kind === 'share' && navigator.share){
    try { await navigator.share({ title: t('friends.shareTitle'), text, url: link }); } catch (e) { /* cancelado */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    showToast(t('friends.toast.linkCopied'));
  } catch (e) {
    window.prompt(t('friends.promptCopy'), link);
  }
}

async function runFriendsSearch(rawQuery){
  const box = document.getElementById('friends-search-results');
  if (!box) return;
  const q = (rawQuery || '').trim();
  const seq = ++FRIENDS_STATE.searchSeq;
  if (q.length < 3){ box.innerHTML = q ? `<p class="profile-edit-hint">${t('friends.searchMin')}</p>` : ''; return; }
  box.innerHTML = `<p class="profile-edit-hint">${t('friends.searching')}</p>`;
  const rows = await searchFriendProfiles(q);
  if (seq !== FRIENDS_STATE.searchSeq) return; // chegou uma busca mais nova
  if (rows == null){ box.innerHTML = `<p class="profile-edit-error">${t('friends.searchError')}</p>`; return; }
  if (!rows.length){ box.innerHTML = `<p class="profile-empty-note">${t('friends.searchEmpty')}</p>`; return; }
  box.innerHTML = rows.map(r => `
    <div class="friends-row" data-friend-row="${escapeAttr(r.user_id)}">
      ${friendPersonHTML({ username: r.username, display_name: r.display_name, avatar_url: r.avatar_url }, r.user_id)}
      <div class="friends-row-actions">${friendsRelationActionsHTML(r.relation, r.user_id)}</div>
    </div>`).join('');
}

function friendsCloseMenus(refocus){
  document.querySelectorAll('.friends-reactions:not([hidden])').forEach(p => {
    p.hidden = true;
    const btn = p.parentElement.querySelector('[data-cheer-open]');
    btn?.setAttribute('aria-expanded', 'false');
    if (refocus) btn?.focus();
  });
  document.querySelectorAll('.friend-card-menu:not([hidden])').forEach(m => {
    m.hidden = true;
    const btn = m.parentElement.querySelector('[data-friend-menu]');
    btn?.setAttribute('aria-expanded', 'false');
    if (refocus) btn?.focus();
  });
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
    const menuBtn = e.target.closest('[data-friend-menu]');
    if (menuBtn){
      const menu = menuBtn.parentElement.querySelector('.friend-card-menu');
      const opening = menu.hidden;
      friendsCloseMenus();
      menu.hidden = !opening;
      menuBtn.setAttribute('aria-expanded', String(opening));
      if (opening) menu.querySelector('button')?.focus();
      return;
    }
    if (e.target.closest('.friend-card-menu')) friendsCloseMenus();
    const person = e.target.closest('[data-open-profile]');
    if (person && person.dataset.openProfile && !e.target.closest('[data-friend-action]')){
      if (typeof openPublicProfileModalForUsername === 'function') openPublicProfileModalForUsername(person.dataset.openProfile);
      return;
    }
    const cheerOpen = e.target.closest('[data-cheer-open]');
    if (cheerOpen){
      const picker = cheerOpen.parentElement.querySelector('.friends-reactions');
      const opening = picker.hidden;
      document.querySelectorAll('#friends-content .friends-reactions:not([hidden])').forEach(p => { p.hidden = true; p.parentElement.querySelector('[data-cheer-open]')?.setAttribute('aria-expanded', 'false'); });
      picker.hidden = !opening;
      cheerOpen.setAttribute('aria-expanded', String(opening));
      if (opening) picker.querySelector('button')?.focus();
      return;
    }
    const reactionBtn = e.target.closest('[data-cheer-reaction]');
    if (reactionBtn){ friendsSendCheer(reactionBtn.closest('[data-cheer-ref]'), reactionBtn.dataset.cheerReaction, reactionBtn); return; }
    const thankBtn = e.target.closest('[data-thank-congrats]');
    if (thankBtn){ friendsThank(thankBtn.dataset.thankCongrats, thankBtn); return; }
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
  // Fecha o menu ⋯ aberto ao clicar fora dele ou apertar Esc.
  document.addEventListener('click', (e) => { if (!e.target.closest('.friend-card-more, .friend-card-menu, .friends-cheer-wrap')) friendsCloseMenus(); });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') friendsCloseMenus(true); });
}

// Faz a ação, mostra o resultado e redesenha a tela. Botão fica desabilitado
// durante a chamada (evita duplo clique).
async function handleFriendAction(action, userId, btn){
  if (action === 'remove' && !window.confirm(t('friends.confirmRemove'))) return;
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
    showToast(res.data?.status === 'accepted' ? t('friends.toast.nowFriends') : t('friends.toast.sent'));
  } else if (action === 'accept'){
    showToast(t('friends.toast.accepted'));
  } else if (action === 'remove'){
    showToast(t('friends.toast.removed'));
  }
  // Trilha Amigos (conquistas com níveis): recontar depois de aceitar ou desfazer amizade.
  if (res.ok && typeof loadFriendsAcceptedCount === 'function') loadFriendsAcceptedCount();
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
      else if (action === 'add') showToast(res?.data?.status === 'accepted' ? t('friends.toast.nowFriends') : t('friends.toast.sent'));
      await renderFriendProfileAction(bodyEl, profile);
      refreshFriendRequestCount();
    });
  });
}
