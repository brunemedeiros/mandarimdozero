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
      <div class="section-label">${title}${count != null ? ` (${count})` : ''}</div>
      ${bodyHTML}
    </section>`;
}

function friendsSubnavHTML(active){
  const tabs = [['profile', t('profile.tabOverview')], ['goals', t('profile.tabGoals')], ['progress', t('profile.tabProgress')], ['friends', t('profile.tabFriends')]];
  return `<div class="leaderboard-tabs profile-subnav" role="tablist" aria-label="${t('profile.subnavAria')}">
    ${tabs.map(([k, l]) => `<button class="leaderboard-tab ${k === active ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
  </div>`;
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

  const incomingHTML = ov.incoming.length ? friendsSectionHTML(t('friends.section.incoming'), ov.incoming.length, ov.incoming.map(i => `
    <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
      ${friendPersonHTML(i.profile, i.userId)}
      <div class="friends-row-actions">${friendsRelationActionsHTML('received', i.userId)}</div>
    </div>`).join(''), 'friends-incoming') : '';

  const inviteBannerHTML = inviteUser
    ? `<p class="friends-invite-banner" role="status">👋 ${t('friends.inviteBanner', { user: '<strong>@' + escapeHTML(inviteUser) + '</strong>' })}</p>`
    : '';
  const searchHTML = friendsSectionHTML(t('friends.section.add'), null, `
    ${inviteBannerHTML}
    <label class="profile-edit-label" for="friends-search-input">${t('friends.searchLabel')}</label>
    <input type="search" class="profile-edit-input" id="friends-search-input" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40" placeholder="${t('friends.searchPlaceholder')}" value="${escapeAttr(keepQuery)}">
    <div id="friends-search-results" aria-live="polite"></div>`, 'friends-add');

  const friendsHTML = friendsSectionHTML(t('friends.section.friends'), ov.friends.length, ov.friends.length
    ? ov.friends.map(i => `
      <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
        ${friendPersonHTML(i.profile, i.userId)}
        <div class="friends-row-actions">${friendActionButtonHTML(t('friends.btn.remove'), 'remove', i.userId, 'btn-secondary friends-danger')}</div>
      </div>`).join('')
    : `<p class="profile-empty-note">${t('friends.empty')}</p>`, 'friends-list');

  const outgoingHTML = ov.outgoing.length ? friendsSectionHTML(t('friends.section.outgoing'), ov.outgoing.length, ov.outgoing.map(i => `
    <div class="friends-row" data-friend-row="${escapeAttr(i.userId)}">
      ${friendPersonHTML(i.profile, i.userId)}
      <div class="friends-row-actions">${friendsRelationActionsHTML('sent', i.userId)}</div>
    </div>`).join(''), 'friends-outgoing') : '';

  const rankHTML = ov.friends.length ? friendsSectionHTML(t('friends.section.rank'), null, '<div id="friends-mini-rank"></div>', 'friends-rank') : '';
  const activityHTML = ov.friends.length ? friendsSectionHTML(t('friends.section.activity'), null, '<div id="friends-activity"></div>', 'friends-activity') : '';
  const inviteHTML = friendsSectionHTML(t('friends.section.invite'), null, `
    <p class="profile-edit-hint">${t('friends.inviteHint')}</p>
    <div class="friends-invite-actions">
      <button type="button" class="btn btn-secondary friends-action" data-friends-invite="copy">🔗 ${t('friends.inviteCopy')}</button>
      <button type="button" class="btn btn-secondary friends-action" data-friends-invite="share" ${navigator.share ? '' : 'hidden'}>📤 ${t('friends.inviteShare')}</button>
    </div>`, 'friends-invite');
  const prefsHTML = friendsSectionHTML(t('friends.section.prefs'), null, `
    <details class="friends-prefs" id="friends-prefs">
      <summary>${t('friends.prefsSummary')}</summary>
      <div id="friends-prefs-body">${loadingHTML(t('friends.loadingShort'))}</div>
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
  const top = rows.slice(0, 5);
  const meRow = rows.find(r => r.user_id === me);
  const shown = (meRow && !top.includes(meRow)) ? [...top, meRow] : top;
  rowsBox.innerHTML = shown.map(r => {
    const name = r.profile?.display_name || r.profile?.username || 'Aluno(a)';
    const isMe = r.user_id === me;
    return `<div class="friends-row friends-rank-row ${isMe ? 'is-me' : ''}">
      <span class="friends-rank-pos">${typeof leaderboardRankBadge === 'function' ? leaderboardRankBadge(r.rank) : r.rank}</span>
      ${friendAvatarHTML(r.profile, r.user_id)}
      <span class="friends-person-text"><span class="friends-person-name">${escapeHTML(name)}${isMe ? ' ' + t('leaderboard.youTag') : ''}</span></span>
      <span class="friends-rank-xp">${Number(r.amount || 0)} XP</span>
    </div>`;
  }).join('') + `<button type="button" class="btn btn-secondary friends-action friends-rank-more" data-friends-rank-more="1">${t('friends.rank.seeFull')}</button>`;
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
  if (!items.length){ el.innerHTML = `<p class="profile-empty-note">${t('friends.activity.empty')}</p>`; return; }
  el.innerHTML = items.slice(0, 10).map(({ r, badge }) => {
    const name = r.display_name || r.username || t('friends.activity.aFriend');
    return `<div class="friends-row friends-activity-row">
      ${friendAvatarHTML({ username: r.username, display_name: r.display_name, avatar_url: r.avatar_url }, r.user_id)}
      <span class="friends-person-text">
        <span class="friends-person-name">${t('friends.activity.earned', { name: escapeHTML(name), badge: escapeHTML(badge.icon || '🏅') + ' ' + escapeHTML(badge.name || '') })}</span>
        <span class="friends-person-user">${escapeHTML(friendsTimeAgo(r.earned_at))}</span>
      </span>
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

async function loadFriendsPrefs(){
  const body = document.getElementById('friends-prefs-body');
  if (!body || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
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
