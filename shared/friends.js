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

const friendFirstName = (profile) => {
  const full = profile?.display_name || profile?.username || t('leaderboard.anonymous');
  return full.split(/\s+/)[0];
};

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
      <button type="button" class="friend-card-person" data-open-profile="${escapeAttr(username)}" ${username ? '' : 'disabled'}>
        ${friendAvatarHTML(p, item.userId)}
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

  wrap.innerHTML = `${subnav}${headHTML}${friendsRequestsHTML(ov.incoming)}${bodyHTML}`;
  renderFriendsBadges();
  wireFriendsView(wrap);
  if (hasFriends){ loadFriendsMiniRank(); loadFriendsActivity(); }
  if (keepQuery.trim().length >= 3) runFriendsSearch(keepQuery);
}

// ---------- disputa da semana: pódio + "faltam X XP" ----------
function friendsPodiumHTML(rows, me){
  const top = rows.slice(0, 3);
  // Ordem visual de pódio: 2º, 1º, 3º.
  const order = top.length >= 2 ? [top[1], top[0], top[2]].filter(Boolean) : top;
  return `<div class="friends-podium" style="--pods:${order.length}">${order.map(r => {
    const isMe = r.user_id === me;
    const name = isMe ? t('friends.week.you') : friendFirstName(r.profile);
    return `<div class="friends-pod pos-${r.rank} ${isMe ? 'is-me' : ''}" data-podium-user="${escapeAttr(r.user_id)}">
      ${friendAvatarHTML(r.profile, r.user_id)}
      <span class="friends-pod-name">${escapeHTML(name)}</span>
      <span class="friends-pod-xp">${Number(r.amount || 0)} XP</span>
      <div class="friends-pod-step" aria-label="${escapeAttr(t('friends.week.place', { n: r.rank }))}">${r.rank}</div>
    </div>`;
  }).join('')}</div>`;
}

function friendsDuelHTML(rows, me){
  const i = rows.findIndex(r => r.user_id === me);
  if (i < 0 || rows.length < 2) return '';
  const mine = Number(rows[i].amount || 0);
  if (rows.every(r => !Number(r.amount))) return `<div class="friends-duel"><p>${t('friends.duel.noOne')}</p></div>`;
  if (i === 0){
    const second = rows[1];
    const lead = mine - Number(second.amount || 0);
    const secondName = `<strong>${escapeHTML(friendFirstName(second.profile))}</strong>`;
    const text = lead > 0 ? tp('friends.duel.ahead', lead, { name: secondName }) : t('friends.duel.tie', { name: secondName });
    return `<div class="friends-duel is-ahead"><p>${text}</p></div>`;
  }
  const above = rows[i - 1];
  const target = Number(above.amount || 0);
  const need = target - mine + 1;
  const pct = target > 0 ? Math.max(4, Math.min(100, Math.round((mine / target) * 100))) : 0;
  const aboveName = escapeHTML(friendFirstName(above.profile));
  return `<div class="friends-duel">
    <p>${tp('friends.duel.behind', need, { name: `<strong>${aboveName}</strong>` })}</p>
    <div class="friends-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${mine}"><i style="width:${pct}%"></i></div>
    <div class="friends-bar-labels"><span>${t('friends.week.you')} ${mine}</span><span>${aboveName} ${target}</span></div>
  </div>`;
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
  rowsBox.innerHTML = friendsPodiumHTML(rows, me) + friendsDuelHTML(rows, me);
  // XP da semana (mesmo escopo) nos cartões dos amigos.
  const byId = Object.fromEntries(rows.map(r => [r.user_id, Number(r.amount || 0)]));
  document.querySelectorAll('[data-friend-xp]').forEach(el => {
    el.textContent = `${byId[el.dataset.friendXp] || 0} XP`;
  });
}

// ---------- atividade dos amigos (conquistas dos últimos 30 dias) ----------
async function loadFriendsActivity(){
  const box = document.getElementById('friends-activity');
  if (!box) return;
  box.innerHTML = loadingHTML(t('friends.loadingShort'));
  const appKey = (typeof APP_KEY !== 'undefined') ? APP_KEY : 'frances';
  const { data, error } = await supabaseClient.rpc('friends_activity', { p_language: appKey, p_limit: 20 });
  const el = document.getElementById('friends-activity');
  if (!el) return;
  if (error){ console.error('Erro ao carregar atividade dos amigos:', error); el.innerHTML = `<p class="profile-edit-error">${t('friends.activity.error')}</p>`; return; }
  const catalog = (typeof BADGES !== 'undefined' && Array.isArray(BADGES)) ? BADGES : [];
  const items = (data || []).map(r => ({ r, badge: catalog.find(b => b.id === r.badge_id) })).filter(x => x.badge);
  if (!items.length){ el.innerHTML = `<p class="friends-feed-empty">${t('friends.activity.empty')}</p>`; return; }
  el.innerHTML = items.slice(0, 5).map(({ r, badge }) => {
    const name = r.display_name || r.username || t('friends.activity.aFriend');
    return `<div class="friends-activity-row">
      <span class="friends-medal" aria-hidden="true">${escapeHTML(badge.icon || '🏅')}</span>
      <span class="friends-activity-text">${t('friends.activity.earned', { name: `<strong>${escapeHTML(name)}</strong>`, badge: escapeHTML(badge.name || '') })}
        <span class="friends-activity-when">· ${escapeHTML(friendsTimeAgo(r.earned_at))}</span></span>
    </div>`;
  }).join('');
}

// ---------- preferências (avisos + "aceitar novos pedidos") ----------
const FRIENDS_PREF_FIELDS = [
  { key: 'notify_requests', label: () => t('friends.pref.notify_requests') },
  { key: 'notify_accepts', label: () => t('friends.pref.notify_accepts') },
  { key: 'notify_overtakes', label: () => t('friends.pref.notify_overtakes') },
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
  document.addEventListener('click', (e) => { if (!e.target.closest('.friend-card-more, .friend-card-menu')) friendsCloseMenus(); });
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
