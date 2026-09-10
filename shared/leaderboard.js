// ---------- Ranking semanal (Leaderboard) ----------
// XP semanal por conta, escrito por shared/auth.js:saveState() a cada save
// bem-sucedido -- ver shared/supabase_migrations/006_create_weekly_xp_table.sql.
// Um ranking "Geral" (soma de todos os idiomas habilitados) e um por
// idioma, mesma granularidade do card "Idiomas & progresso" do Meu Perfil.
// Só entra na lista quem já ganhou pelo menos 1 XP na semana corrente --
// 0 XP não aparece no ranking, mas a pessoa ainda pode visualizar
// normalmente (decisão explícita da autora).
//
// Depende de (todos carregados antes deste arquivo, mesma posição de
// shared/profile.js -- só referenciado dentro de função, nunca no
// top-level):
//   - languages/index.js        (AVAILABLE_LANGUAGES)
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/profile.js         (avatarInitials, avatarColor, escapeHTML,
//                                 SPECIAL_BADGES, fetchBadgeCatalog)
//   - shared/utils.js           (localStorageSafeGet, localStorageSafeSet)

const LEADERBOARD_TOP_N = 50;
let LEADERBOARD_SCOPE = 'all'; // 'all' ou o appKey de um idioma específico

// Última posição vista pela PRÓPRIA pessoa, guardada localmente -- é o que
// permite animar "subiu/desceu" ao reabrir o Ranking (ver o final de
// renderLeaderboardView()). De propósito só local (localStorage, não uma
// coluna no banco): é sobre o que ESTE dispositivo viu da última vez,
// mesmo padrão de estado efêmero de UI já usado em CLOZE_MODE_KEY/
// THEME_STORAGE_KEY -- não precisa sincronizar entre aparelhos nem
// sobreviver a nada além da próxima visita.
const LEADERBOARD_LAST_RANK_KEY = 'leaderboard_last_rank';

// Mesma lógica de currentWeekStart() em cada app.js (segunda-feira da
// semana corrente, formato 'YYYY-MM-DD') -- duplicada aqui de propósito:
// este arquivo carrega ANTES de app.js (ver header), não pode depender de
// uma função definida só lá. Se a regra de "início de semana" mudar um
// dia, os dois lugares precisam mudar juntos.
function leaderboardCurrentWeekStart(){
  const d = new Date();
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
}

// "N dias restantes" até a semana reiniciar (segunda-feira que vem), como
// na referência original (Busuu/Duolingo) -- prioriza a sensação de prazo/
// competição em vez de uma data que a pessoa precisa fazer conta pra
// entender. Segunda-feira = 7 dias restantes (a semana inteira ainda pela
// frente), domingo = 1 (último dia antes do reset).
function leaderboardDaysRemaining(weekStart){
  const start = new Date(`${weekStart}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayIndex = Math.floor((Date.now() - start.getTime()) / msPerDay);
  const clamped = Math.min(Math.max(dayIndex, 0), 6);
  return 7 - clamped;
}

function leaderboardDaysRemainingLabel(weekStart){
  const days = leaderboardDaysRemaining(weekStart);
  return days === 1 ? '1 dia restante' : `${days} dias restantes`;
}

// Soma o XP de todas as linhas da semana (todos os idiomas, se scope
// 'all', ou só um language_app_key) por user_id, no CLIENTE -- supabase-js
// não faz GROUP BY sem uma view/RPC dedicada, e o público desta
// plataforma ainda é pequeno o suficiente pra isso (mesmo raciocínio de
// fetchAllProfiles() em shared/admin-badges.js: primeiro lugar a
// revisitar se crescer muito).
async function fetchLeaderboard(scope, weekStart){
  let query = supabaseClient.from('weekly_xp').select('user_id, amount').eq('week_start', weekStart);
  if (scope !== 'all') query = query.eq('language_app_key', scope);
  const { data, error } = await query;
  if (error){ console.error('Erro ao carregar ranking:', error); return []; }

  const totals = new Map();
  (data || []).forEach(row => totals.set(row.user_id, (totals.get(row.user_id) || 0) + row.amount));
  const ranked = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([user_id, amount]) => ({ user_id, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, LEADERBOARD_TOP_N);
  if (!ranked.length) return [];

  // featured_badge_id junto com o resto do perfil -- é o badge que a
  // própria pessoa escolheu destacar (ver "Badge em destaque" no modal de
  // editar perfil), não precisa de consulta separada.
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, featured_badge_id')
    .in('user_id', ranked.map(r => r.user_id));
  const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  return ranked.map((r, i) => ({ ...r, rank: i + 1, profile: byId[r.user_id] || null }));
}

// Card "Ranking" -- teaser dos 3 primeiros do ranking Geral da semana + a
// posição da própria pessoa se ela não estiver entre eles, reaproveitando
// fetchLeaderboard() (mesma fonte de dados do Ranking completo, sem
// duplicar a consulta/lógica de soma por usuário). Só existe na sidebar
// desktop -- a versão que vivia embutida dentro de Perfil foi removida por
// ser redundante (Ranking já tem aba própria, alcançável no celular pelo
// menu "Mais"). O alvo continua sendo resolvido por id (em vez de um único
// elemento fixo) só por simetria com renderDailyChallengesStrip(), caso um
// segundo alvo volte a existir no futuro.
async function renderSideRankingCard(){
  const targets = ['side-ranking-body']
    .map(id => document.getElementById(id))
    .filter(el => {
      if (!el) return false;
      // O card da sidebar sempre existe no DOM (escondido por CSS abaixo de
      // 900px) -- não vale gastar uma consulta ao Supabase pra um card que
      // o aluno no celular nunca vê.
      const cards = el.closest('.right-cards');
      return !cards || getComputedStyle(cards).display !== 'none';
    });
  if (!targets.length) return;
  targets.forEach(body => { body.innerHTML = loadingHTML(); });
  const rows = await fetchLeaderboard('all', leaderboardCurrentWeekStart());
  let html;
  if (!rows.length){
    html = `<p class="profile-empty-note">Ninguém pontuou essa semana ainda.</p>`;
  } else {
    const top3 = rows.slice(0, 3);
    const me = CURRENT_USER ? rows.find(r => r.user_id === CURRENT_USER.id) : null;
    const rowHTML = (r) => {
      const name = r.profile?.display_name || r.profile?.username || 'Aluno(a)';
      const isMe = !!(CURRENT_USER && r.user_id === CURRENT_USER.id);
      return `
        <div class="side-ranking-row ${isMe ? 'me' : ''}">
          <span class="side-ranking-rank">${leaderboardRankBadge(r.rank)}</span>
          <span class="side-ranking-name">${escapeHTML(name)}</span>
          <span>${r.amount}</span>
        </div>
      `;
    };
    html = top3.map(rowHTML).join('') + (me && me.rank > 3 ? rowHTML(me) : '');
  }
  html += `<button class="side-card-link">Ver ranking completo →</button>`;
  targets.forEach(body => {
    body.innerHTML = html;
    body.querySelector('.side-card-link').addEventListener('click', () => switchTab('leaderboard'));
  });
}

function leaderboardRankBadge(rank){
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

// Resolve um featured_badge_id pro ícone+nome certos -- procura em
// SPECIAL_BADGES (Fundadora/Beta Tester), no catálogo criado pela admin
// (badge_catalog) e em BADGES (gameplay, catálogo do idioma atualmente
// carregado nesta página). featured_badge_id é um campo só, compartilhado
// entre fr/zh (ver 001_create_profiles_table.sql) -- mas BADGES é
// DIFERENTE por idioma (ver o comentário de saveProfileEdits em
// shared/profile.js), então um id de badge de gameplay ganho num idioma
// pode simplesmente não resolver quando visto a partir do site do OUTRO
// idioma (a pessoa não vê o badge em destaque naquele contexto, mas nada
// quebra -- mesmo fallback gracioso de "não achou, não mostra" que já
// existia pra qualquer id desconhecido).
function resolveFeaturedBadge(badgeId, catalog){
  if (!badgeId) return null;
  const special = SPECIAL_BADGES.find(b => b.id === badgeId);
  if (special) return { icon: special.icon, name: special.name, desc: special.desc };
  const gameplay = (typeof BADGES !== 'undefined' ? BADGES : []).find(b => b.id === badgeId);
  if (gameplay) return { icon: gameplay.icon, name: gameplay.name, desc: gameplay.desc };
  const custom = (catalog || []).find(b => b.id === badgeId);
  if (custom) return { icon: custom.icon, name: custom.name, desc: custom.description };
  return null;
}

// Todos os badges de identidade concedidos a um user_id QUALQUER (não só
// CURRENT_USER, ao contrário de fetchGrantedBadgeIds() em shared/profile.js,
// que só serve pro próprio perfil) -- usado no popup de perfil público do
// Ranking pra listar TUDO que a pessoa já ganhou, não só o único badge "em
// destaque" que aparece na linha da lista. badge_grants tem RLS de leitura
// pública desde a criação (ver 002_create_badge_grants_table.sql).
async function fetchUserBadgeGrants(userId){
  const { data, error } = await supabaseClient
    .from('badge_grants')
    .select('badge_id')
    .eq('user_id', userId);
  if (error){ console.error('Erro ao carregar badges do perfil:', error); return []; }
  return (data || []).map(r => r.badge_id);
}

// Badges de GAMEPLAY (BADGES, catálogo do idioma atualmente carregado) já
// ganhos por um user_id QUALQUER -- ver shared/supabase_migrations/017 pro
// porquê de existir uma tabela pública separada de `progress` (privada).
// Só resolve contra o BADGES do idioma em que este site está rodando: ver
// resolveFeaturedBadge() pro mesmo raciocínio aplicado ao badge em destaque.
async function fetchUserEarnedBadges(userId){
  const { data, error } = await supabaseClient
    .from('earned_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('language_app_key', APP_KEY);
  if (error){ console.error('Erro ao carregar conquistas do perfil:', error); return []; }
  const ids = new Set((data || []).map(r => r.badge_id));
  return BADGES.filter(b => ids.has(b.id));
}

async function renderLeaderboardView(){
  const wrap = document.getElementById('leaderboard-content');
  if (!wrap) return;
  wrap.innerHTML = loadingHTML('Carregando ranking...');

  const weekStart = leaderboardCurrentWeekStart();
  const scope = LEADERBOARD_SCOPE;
  // Catálogo só é buscado se algum badge em destaque de fato precisar dele
  // -- fetchLeaderboard() já roda em paralelo com isso.
  const [rows, catalog] = await Promise.all([fetchLeaderboard(scope, weekStart), fetchBadgeCatalog()]);

  // role="tablist"/"tab": são páginas alternativas do mesmo painel (Geral /
  // um idioma por vez), não botões soltos -- deixa um leitor de tela
  // anunciar "aba X de Y, selecionada" em vez de só "botão".
  const scopeTabsHTML = [
    { key: 'all', label: 'Geral' },
    ...AVAILABLE_LANGUAGES.filter(l => l.enabled).map(l => ({ key: l.appKey, label: l.name })),
  ].map(t => `<button class="leaderboard-tab ${t.key === scope ? 'active' : ''}" role="tab" aria-selected="${t.key === scope}" data-scope="${t.key}">${t.label}</button>`).join('');

  const rowsHTML = rows.length ? rows.map(r => {
    const isMe = !!(CURRENT_USER && r.user_id === CURRENT_USER.id);
    // Sem @username na linha -- o username é gerado a partir do e-mail
    // (ver createInitialProfile) e não é o que a pessoa reconhece de si
    // mesma; o nome exibido (ou o próprio username como texto simples, se
    // ela nunca tiver escolhido um nome) já é suficiente.
    const name = r.profile?.display_name || r.profile?.username || 'Aluno(a)';
    const initials = avatarInitials(name);
    const color = avatarColor(r.user_id);
    const avatarHTML = r.profile?.avatar_url
      ? `<img class="leaderboard-avatar" src="${r.profile.avatar_url}" alt="">`
      : `<div class="leaderboard-avatar" style="background:${color};">${initials}</div>`;
    const featured = resolveFeaturedBadge(r.profile?.featured_badge_id, catalog);
    const badgeHTML = featured
      ? `<span class="leaderboard-featured-badge" aria-hidden="true" title="${escapeHTML(featured.name)}">${featured.icon}</span>`
      : '';
    // Uma única linha vira vários elementos visuais (rank/avatar/nome/badge/
    // XP) -- pra quem usa leitor de tela isso soaria como fragmentos soltos
    // sem essa descrição resumida na própria linha (role="listitem" +
    // aria-label), então os pedaços visuais internos ficam aria-hidden.
    const rowLabel = [
      `Posição ${r.rank}`,
      name,
      isMe ? 'você' : null,
      featured ? `badge ${featured.name}` : null,
      `${r.amount} XP`,
    ].filter(Boolean).join(', ');
    return `
      <div class="leaderboard-row ${isMe ? 'me' : ''}" role="listitem" aria-label="${escapeHTML(rowLabel)}" data-user-id="${r.user_id}">
        <div class="leaderboard-rank" aria-hidden="true">${leaderboardRankBadge(r.rank)}</div>
        ${avatarHTML}
        <div class="leaderboard-info">
          <div class="leaderboard-name" aria-hidden="true">
            <span class="leaderboard-name-text">${escapeHTML(name)}</span>${badgeHTML}${isMe ? ' <span class="leaderboard-you-tag">(você)</span>' : ''}
          </div>
        </div>
        <div class="leaderboard-xp" aria-hidden="true">⭐ ${r.amount}</div>
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">Ninguém pontuou nessa categoria ainda essa semana. Seja a primeira pessoa no ranking!</p>`;

  wrap.innerHTML = `
    <div class="leaderboard-week-label">${leaderboardDaysRemainingLabel(weekStart)}</div>
    <div class="leaderboard-tabs" role="tablist" aria-label="Escopo do ranking">${scopeTabsHTML}</div>
    <div class="leaderboard-list" role="list">${rowsHTML}</div>
    <p class="leaderboard-footnote">O ranking reinicia toda segunda-feira. Só aparece quem já ganhou XP essa semana.</p>
  `;

  wrap.querySelectorAll('[data-scope]').forEach(btn => {
    btn.addEventListener('click', () => {
      LEADERBOARD_SCOPE = btn.dataset.scope;
      renderLeaderboardView();
    });
  });

  // Clicar em qualquer linha (a própria incluída) abre o preview do
  // perfil -- "isso deve ser possível para todos". Reaproveita os dados já
  // buscados pra essa linha (row/catalog), sem consulta nova ao Supabase.
  wrap.querySelectorAll('.leaderboard-row[data-user-id]').forEach(el => {
    el.addEventListener('click', () => {
      const row = rows.find(r => r.user_id === el.dataset.userId);
      if (row) openPublicProfileModal(row, catalog);
    });
  });

  // Leva direto pra posição da pessoa ao abrir a tela -- "onde eu estou?"
  // sem precisar rolar manualmente uma lista que pode ter dezenas de
  // pessoas. Roda ANTES de qualquer transform de animação (abaixo) --
  // scrollIntoView usa a posição real renderizada, então precisa medir a
  // linha ainda no lugar final, não deslocada pelo início da animação.
  const meRow = wrap.querySelector('.leaderboard-row.me');
  meRow?.scrollIntoView({ block: 'center' });

  animateOwnRowRankChange(meRow, scope, weekStart, rows);
}

// "Bloco desliza ultrapassando quem estava acima/abaixo", como na
// referência -- compara a posição desta visita com a última vista NESTE
// dispositivo (mesma semana/escopo) e, se mudou, desloca a linha pra onde
// ela estava antes e anima de volta pro lugar (translateY), dando a
// sensação de ter subido ou caído. Sem posição anterior pra comparar
// (primeira vez vendo essa semana/escopo, ou pessoa fora do ranking) não
// tem o que animar -- só atualiza o valor guardado pra próxima vez.
function animateOwnRowRankChange(meRow, scope, weekStart, rows){
  if (!CURRENT_USER) return;
  const meRank = rows.find(r => r.user_id === CURRENT_USER.id)?.rank;
  if (!meRank) return;

  let prev = null;
  try{ prev = JSON.parse(localStorageSafeGet(LEADERBOARD_LAST_RANK_KEY) || 'null'); }catch(e){ prev = null; }

  const sameContext = prev && prev.scope === scope && prev.weekStart === weekStart;
  const rankChanged = sameContext && prev.rank !== meRank;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (meRow && rankChanged && !reduceMotion){
    const rowHeight = meRow.getBoundingClientRect().height;
    const offset = (prev.rank - meRank) * rowHeight; // positivo = subiu (linha começa deslocada pra baixo, desliza pra cima)
    meRow.style.transition = 'none';
    meRow.style.transform = `translateY(${offset}px)`;
    meRow.getBoundingClientRect(); // força reflow antes de religar a transição
    requestAnimationFrame(() => {
      meRow.style.transition = '';
      meRow.style.transform = 'translateY(0)';
    });
  }

  localStorageSafeSet(LEADERBOARD_LAST_RANK_KEY, JSON.stringify({ scope, weekStart, rank: meRank }));

  // Fase 4 do sistema de notificações (seção 18: "Ranking -- mudança de
  // posição"). Só no escopo Geral -- é o que a maioria das pessoas
  // acompanha; mudanças por idioma ficariam barulhentas demais (cada
  // troca de posição em cada idioma vira um evento). typeof guard porque
  // este arquivo roda em toda visita ao Ranking, inclusive antes de
  // shared/notifications.js existir em algum contexto de teste isolado.
  if (rankChanged && scope === 'all' && typeof fireNotificationEvent === 'function'){
    const eventType = meRank < prev.rank ? 'ranking_rank_up' : 'ranking_rank_down';
    fireNotificationEvent(eventType, 'ranking', { newRank: meRank }, 'leaderboard');
  }
}

// Incrementado a cada abertura do modal -- guarda contra a resposta
// assíncrona de fetchUserBadgeGrants() de um clique ANTERIOR chegar depois
// que a pessoa já fechou o modal ou clicou em outra linha, e escrever os
// badges de alguém errado no popup que está na tela agora.
let PUBLIC_PROFILE_MODAL_TOKEN = 0;

// ---------- Modal: perfil público (a partir de uma linha do Ranking) ----------
// Preview somente-leitura -- não é a tela de Meu Perfil completa, só o que
// já é confirmadamente público (profiles/badge_grants têm RLS de leitura
// pública desde a criação, ver 001/002_create_*_table.sql, pensando
// exatamente nesse cenário) mais o que a própria linha do ranking já trouxe
// (amount/rank da semana corrente). A lista de badges é a única parte que
// pede uma consulta nova (fetchUserBadgeGrants) -- o resto renderiza na
// hora com o que a linha já tinha.
//
// Mostra TODOS os badges de identidade da pessoa aqui (diferente da linha
// do Ranking, que mostra só o "em destaque" escolhido por ela) -- pensado
// pra quando existir um badge de usuário premium: a linha continua
// enxuta com o badge mais relevante, mas o popup do perfil deixa claro
// tudo que a pessoa já conquistou.
//
// Além disso, mostra a vitrine de CONQUISTAS de gameplay (BADGES) dessa
// pessoa, igual à seção "Conquistas" da própria Visão geral do Perfil
// (mesmo .profile-badge-showcase/.badge.earned) -- é justamente o pedido
// de "esse perfil com os badges seja visto por todos ao clicar no nome no
// Ranking": antes só os badges de IDENTIDADE apareciam aqui, os de
// gameplay ficavam de fora. Fonte: earned_badges (pública, ver
// fetchUserEarnedBadges), não a `progress` privada da outra pessoa.
async function openPublicProfileModal(row, catalog){
  const modal = document.getElementById('public-profile-modal');
  const body = document.getElementById('public-profile-modal-body');
  if (!modal || !body) return;
  const token = ++PUBLIC_PROFILE_MODAL_TOKEN;

  const name = row.profile?.display_name || row.profile?.username || 'Aluno(a)';
  const username = row.profile?.username;
  const initials = avatarInitials(name);
  const color = avatarColor(row.user_id);
  const avatarHTML = row.profile?.avatar_url
    ? `<img class="public-profile-avatar" src="${row.profile.avatar_url}" alt="">`
    : `<div class="public-profile-avatar" style="background:${color};">${initials}</div>`;
  const bio = row.profile?.bio;

  body.innerHTML = `
    <div class="public-profile-header">
      ${avatarHTML}
      <div class="public-profile-name">${escapeHTML(name)}</div>
      ${username ? `<div class="public-profile-username">@${escapeHTML(username)}</div>` : ''}
    </div>
    ${bio ? `<p class="public-profile-bio">${escapeHTML(bio)}</p>` : ''}
    <div class="public-profile-badges" id="public-profile-badges">${loadingHTML()}</div>
    <div class="public-profile-stats">
      <div class="public-profile-stat"><div class="value">${leaderboardRankBadge(row.rank)}</div><div class="label">Posição</div></div>
      <div class="public-profile-stat"><div class="value">⭐ ${row.amount}</div><div class="label">XP essa semana</div></div>
    </div>
    <div class="public-profile-conquests-section">
      <div class="section-label">Conquistas</div>
      <div class="public-profile-conquests" id="public-profile-conquests">${loadingHTML()}</div>
    </div>
  `;
  modal.style.display = 'flex';

  const [grantedIds, earnedBadges] = await Promise.all([
    fetchUserBadgeGrants(row.user_id),
    fetchUserEarnedBadges(row.user_id),
  ]);
  if (token !== PUBLIC_PROFILE_MODAL_TOKEN) return; // modal já fechado/trocado -- descarta

  // Une o que foi concedido via badge_grants com o badge em destaque
  // escolhido pela pessoa -- necessário porque "em destaque" pode ser um
  // badge por REGRA (Fundadora/Beta Tester, calculado, nunca gravado em
  // badge_grants), não só um concedido manualmente.
  const allIds = new Set(grantedIds);
  if (row.profile?.featured_badge_id) allIds.add(row.profile.featured_badge_id);
  const badges = [...allIds]
    .map(id => ({ id, ...resolveFeaturedBadge(id, catalog) }))
    .filter(b => b.icon);

  const badgesEl = document.getElementById('public-profile-badges');
  if (badgesEl){
    if (!badges.length){
      badgesEl.remove();
    } else {
      badgesEl.innerHTML = badges.map(b => `
        <button type="button" class="public-profile-badge-chip" data-badge-id="${b.id}">
          <span class="icon">${b.icon}</span><span>${escapeHTML(b.name)}</span>
        </button>
      `).join('');
      badgesEl.querySelectorAll('.public-profile-badge-chip').forEach(el => {
        el.addEventListener('click', () => {
          const b = badges.find(x => x.id === el.dataset.badgeId);
          if (b) showBadgeInfo(el, `${b.icon} ${b.name}`, b.desc || '');
        });
      });
    }
  }

  const conquestsEl = document.getElementById('public-profile-conquests');
  if (conquestsEl){
    const section = conquestsEl.closest('.public-profile-conquests-section');
    if (!earnedBadges.length){
      if (section) section.remove(); else conquestsEl.remove();
    } else {
      conquestsEl.innerHTML = earnedBadges.slice().reverse().map(b => `
        <div class="badge earned profile-badge" data-badge-id="${b.id}">
          <div class="icon">${b.icon}</div>
          <div class="name">${b.name}</div>
        </div>
      `).join('');
      conquestsEl.classList.add('profile-badge-showcase');
      conquestsEl.querySelectorAll('.profile-badge[data-badge-id]').forEach(el => {
        el.addEventListener('click', () => {
          const b = earnedBadges.find(x => x.id === el.dataset.badgeId);
          if (b) showBadgeInfo(el, `${b.icon} ${b.name}`, b.desc || '');
        });
      });
    }
  }
}

function closePublicProfileModal(){
  const modal = document.getElementById('public-profile-modal');
  if (modal) modal.style.display = 'none';
}

function wirePublicProfileModal(){
  const modal = document.getElementById('public-profile-modal');
  if (!modal) return;
  document.getElementById('public-profile-modal-close').addEventListener('click', closePublicProfileModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closePublicProfileModal(); });
}
wirePublicProfileModal();
