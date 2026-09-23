// ---------- Perfil público (Fase 1 do prompt-mestre "perfil público / flashcards
// públicos", ver CLAUDE.md -- grilling completo em 2 rodadas antes de codar) ----------
//
// Objetivo confirmado no grilling: qualquer pessoa (logada OU sem conta) pode
// ver o perfil de alguém a partir de um link -- hash-based, já que este site
// é 100% estático no GitHub Pages e não existe caminho de servidor "/user/x"
// de verdade (só #/user/x, ver shared/router.js). Entrada principal: clicar
// no nome de alguém no Ranking (ver shared/leaderboard.js).
//
// Duas superfícies renderizam o MESMO conteúdo (renderPublicProfileInto):
//   - #public-profile-modal (já existia, ver shared/leaderboard.js) -- usado
//     quando quem está vendo já tem o app carregado (logada OU convidada).
//   - #public-profile-standalone (novo, fora de #app) -- usado quando quem
//     está vendo NÃO tem sessão nem modo convidado (bypass em initAuth(),
//     ver shared/auth.js) -- só assim um link compartilhado funciona sem
//     exigir login antes de ver o perfil, como a autora pediu no grilling.
//
// O QUE é sempre público (nenhuma checagem nova, RLS já é assim desde a
// criação dessas tabelas -- ver 001_create_profiles_table.sql/
// 002_create_badge_grants_table.sql/003_create_badge_catalog_table.sql/
// 017_create_earned_badges_table.sql): identidade (nome/@username/bio/
// avatar) e badges (identidade + conquistas de gameplay). O modal de
// Ranking (Rank1-4) já mostrava tudo isso pra qualquer linha do ranking,
// sem checar nada -- esta feature não abre superfície nova aí, só reusa.
//
// O QUE passou a existir NESTA fase, atrás de profiles.public_profile
// (migration 037, default false -- privado por padrão, ver grilling Q1):
// progresso/XP/streak POR IDIOMA. Nunca lido direto da tabela `progress`
// (permanece RLS owner-only) -- sempre via get_public_profile_stats(),
// function SECURITY DEFINER que checa public_profile ELA MESMA antes de
// devolver qualquer dado (mesmo padrão de get_teacher_student_metrics,
// migration 029, Fase 6a da feature de alunas particulares).
//
// A LISTA de flashcards próprios pra importar (grilling Q3/Q4 -- blur +
// "faça login pra ver/adicionar", multi-select com Selecionar todos/Limpar
// seleção) é Fase 2, ainda NÃO implementada aqui -- ver migration 037,
// comentário no topo. Esta fase é só identidade + estatísticas.
//
// Depende de (todos carregados antes deste arquivo):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/profile.js         (avatarInitials, avatarColor, fetchBadgeCatalog,
//                                 escapeHTML via shared/utils.js)
//   - shared/leaderboard.js     (fetchUserBadgeGrants, fetchUserEarnedBadges,
//                                 resolveFeaturedBadge -- todas já funcionam
//                                 pra QUALQUER user_id, não só CURRENT_USER)
//   - shared/srs.js             (effectiveStreakFor -- mesma regra de "streak
//                                 vivo" aplicada aqui sobre o par streak/
//                                 lastStudyDay de OUTRA conta, nunca duplicada)
//   - languages/index.js        (AVAILABLE_LANGUAGES, pra bandeira/nome por
//                                 languageAppKey)
// E (referenciados só dentro de função, nunca no top-level -- por isso este
// arquivo pode carregar antes de languages/<lang>/app.js):
//   - shared/toast.js  (showBadgeInfo, ver shared/utils.js)
//   - shared/router.js (routerNavigate -- só chamado quando existir)

// ---------- Busca ----------

// Username vindo de #/user/<username> -- mesmo alfabeto aceito por
// slugifyUsername() em shared/profile.js (minúsculas/números/./-/_), até 24
// chars. Case-insensitive na regex (a coluna `username` em si é sempre
// salva em minúsculo por slugifyUsername, mas um link colado/digitado à
// mão pode vir com maiúscula -- normaliza aqui, não deixa a query falhar
// silenciosamente por diferença de caixa).
const PUBLIC_PROFILE_HASH_RE = /^#\/user\/([a-z0-9_.-]{1,24})$/i;

function publicProfileUsernameFromHash(hash){
  const h = (typeof hash === 'string') ? hash : window.location.hash;
  const m = (h || '').match(PUBLIC_PROFILE_HASH_RE);
  return m ? m[1].toLowerCase() : null;
}

// Busca tudo que o perfil público precisa numa só chamada composta:
// identidade (profiles, RLS pública), badges (badge_grants+badge_catalog,
// RLS pública), conquistas de gameplay (earned_badges, RLS pública, já
// escopada por APP_KEY dentro de fetchUserEarnedBadges) e estatísticas por
// idioma (get_public_profile_stats, só devolve dado se public_profile=true
// -- ver migration 037). notFound cobre tanto @username inexistente quanto
// erro de rede na consulta de identidade -- nunca deixa a UI tentar
// desenhar um perfil parcial sem nome/avatar.
async function fetchPublicProfileByUsername(username){
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return { notFound: true };

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, bio, featured_badge_id')
    .eq('username', clean)
    .maybeSingle();
  if (error){ console.error('Erro ao carregar perfil público:', error); return { notFound: true }; }
  if (!profile) return { notFound: true };

  const [catalog, grantedIds, earnedBadges, statsRes] = await Promise.all([
    fetchBadgeCatalog(),
    fetchUserBadgeGrants(profile.user_id),
    fetchUserEarnedBadges(profile.user_id),
    supabaseClient.rpc('get_public_profile_stats', { p_username: clean }),
  ]);

  // Une badge_grants (concessão manual) com o featured_badge_id escolhido
  // pela pessoa -- mesma lógica de openPublicProfileModal (shared/
  // leaderboard.js), badge "em destaque" pode ser calculado por regra
  // (Fundadora/Beta Tester) e nunca aparecer em badge_grants sozinho.
  const allBadgeIds = new Set(grantedIds);
  if (profile.featured_badge_id) allBadgeIds.add(profile.featured_badge_id);
  const badges = [...allBadgeIds]
    .map(id => ({ id, ...resolveFeaturedBadge(id, catalog) }))
    .filter(b => b.icon);

  const stats = (statsRes && !statsRes.error) ? statsRes.data : null;
  const isPublic = !!(stats && !stats.error);

  return {
    notFound: false,
    profile,
    badges,
    earnedBadges,
    isPublic,
    languages: isPublic ? (stats.languages || []) : [],
  };
}

// ---------- Render (container-agnostic -- ver comentário do topo do arquivo) ----------

// Um card por idioma com progresso > 0% (get_public_profile_stats já filtra
// isso no servidor, ver migration 037) -- streak/XP daquele idioma
// especificamente, nunca somado entre idiomas (confirmado no grilling Q8:
// STATE.xp/streak são por site, cada idioma tem sua própria conta em
// progress.data[langKey]; misturar os dois num só número seria inventar um
// dado que o app nunca calculou). effectiveStreakFor() (shared/srs.js)
// aplica a MESMA regra de "streak vivo" já usada pro streak da própria
// conta -- sem isso, o streak de alguém que sumiu ficaria congelado no
// último valor salvo em vez de mostrar 0 (mesmo bug já corrigido na seção
// "Streak (🔥) no topbar/perfil ficava CONGELADO", ver CLAUDE.md).
function publicProfileLangCardHTML(l){
  const lang = (typeof AVAILABLE_LANGUAGES !== 'undefined') ? AVAILABLE_LANGUAGES.find(x => x.appKey === l.languageAppKey) : null;
  const flagSvg = lang ? lang.flagSvg : '';
  const name = lang ? lang.name : l.languageAppKey;
  const streak = effectiveStreakFor(l.streak, l.lastStudyDay);
  return `
    <div class="public-profile-lang-card">
      <div class="public-profile-lang-top">
        <div class="profile-lang-flag">${flagSvg}</div>
        <div class="profile-lang-info">
          <div class="profile-lang-name">${escapeHTML(name)}</div>
          <div class="profile-lang-level">${l.levelLabel ? `${escapeHTML(l.levelLabel)} · ` : ''}${l.pct}%</div>
          <div class="profile-lang-bar"><div style="width:${l.pct}%;"></div></div>
        </div>
      </div>
      <div class="public-profile-lang-stats">
        <div class="public-profile-lang-stat"><span class="v">🔥 ${streak}</span><span class="l">dias seguidos</span></div>
        <div class="public-profile-lang-stat"><span class="v">${l.xp}</span><span class="l">XP acumulado</span></div>
      </div>
    </div>
  `;
}

// Preenche QUALQUER container (modal ou página standalone, ver comentário
// do topo) com o perfil de `username` -- nunca usa document.getElementById
// com id fixo pros pedaços internos (badges/conquistas), só
// bodyEl.querySelectorAll, exatamente pra poder existir nas DUAS telas ao
// mesmo tempo no mesmo documento (uma delas sempre escondida) sem id
// duplicado colidir.
// WeakMap (não uma variável só) -- o modal (#public-profile-modal-body) e a
// página standalone (#public-profile-page-body) podem, em teoria, existir
// no mesmo documento (ver comentário do topo do arquivo); cada container
// precisa da sua PRÓPRIA corrida descartada, nunca uma cancelando a outra.
// Mesmo princípio de PUBLIC_PROFILE_MODAL_TOKEN, que este substitui (clique
// rápido em 2 nomes diferentes no Ranking não pode deixar a resposta do
// primeiro clique sobrescrever o conteúdo do segundo, que já está na tela).
const PUBLIC_PROFILE_RENDER_TOKENS = new WeakMap();

async function renderPublicProfileInto(bodyEl, username){
  if (!bodyEl) return;
  const token = (PUBLIC_PROFILE_RENDER_TOKENS.get(bodyEl) || 0) + 1;
  PUBLIC_PROFILE_RENDER_TOKENS.set(bodyEl, token);

  bodyEl.innerHTML = loadingHTML('Carregando perfil...');

  const result = await fetchPublicProfileByUsername(username);
  if (PUBLIC_PROFILE_RENDER_TOKENS.get(bodyEl) !== token) return; // corrida perdida -- outro clique já assumiu este container

  if (result.notFound){
    bodyEl.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🔍</div>
        <h3>Perfil não encontrado</h3>
        <p>Não existe nenhuma conta com o nome @${escapeHTML(username)}.</p>
      </div>
    `;
    return;
  }

  const { profile, badges, earnedBadges, isPublic, languages } = result;
  const name = profile.display_name || profile.username || 'Aluno(a)';
  const initials = avatarInitials(name);
  const color = avatarColor(profile.user_id);
  const avatarHTML = profile.avatar_url
    ? `<img class="public-profile-avatar" src="${profile.avatar_url}" alt="Foto de perfil">`
    : `<div class="public-profile-avatar" style="background:${color};">${initials}</div>`;

  const badgesHTML = badges.length ? `
    <div class="public-profile-badges">
      ${badges.map(b => `
        <button type="button" class="public-profile-badge-chip" data-badge-id="${b.id}">
          <span class="icon">${b.icon}</span><span>${escapeHTML(b.name)}</span>
        </button>
      `).join('')}
    </div>
  ` : '';

  // 3 estados possíveis pra esta seção: privado (conta com public_profile
  // false -- grillado como padrão, Q1), público sem nenhum progresso ainda
  // (conta nova/nunca estudou), público com 1+ idioma. Nunca confunde os
  // dois primeiros -- "privado" e "zero progresso" são informações
  // diferentes, mensagens diferentes.
  const langsHTML = !isPublic
    ? `<p class="profile-empty-note">🔒 Esta pessoa optou por manter o progresso privado.</p>`
    : (languages.length
        ? `<div class="public-profile-langs-row">${languages.map(publicProfileLangCardHTML).join('')}</div>`
        : `<p class="profile-empty-note">Ainda sem progresso registrado em nenhum idioma.</p>`);

  const conquestsHTML = earnedBadges.length ? `
    <div class="public-profile-conquests profile-badge-showcase">
      ${earnedBadges.slice().reverse().map(b => `
        <div class="badge earned profile-badge" data-badge-id="${b.id}">
          <div class="icon">${b.icon}</div>
          <div class="name">${b.name}</div>
        </div>
      `).join('')}
    </div>
  ` : `<p class="profile-empty-note">Nenhuma conquista ainda.</p>`;

  bodyEl.innerHTML = `
    <div class="public-profile-header">
      ${avatarHTML}
      <div class="public-profile-name">${escapeHTML(name)}</div>
      <div class="public-profile-username">@${escapeHTML(profile.username)}</div>
      ${profile.bio ? `<p class="public-profile-bio">${escapeHTML(profile.bio)}</p>` : ''}
    </div>
    ${badgesHTML}
    <div class="public-profile-langs-section">
      <div class="section-label">Progresso</div>
      ${langsHTML}
    </div>
    <div class="public-profile-conquests-section">
      <div class="section-label">Conquistas</div>
      ${conquestsHTML}
    </div>
  `;

  bodyEl.querySelectorAll('.public-profile-badge-chip').forEach(el => {
    el.addEventListener('click', () => {
      const b = badges.find(x => x.id === el.dataset.badgeId);
      if (b) showBadgeInfo(el, `${b.icon} ${b.name}`, b.desc || '');
    });
  });
  bodyEl.querySelectorAll('.public-profile-conquests .profile-badge[data-badge-id]').forEach(el => {
    el.addEventListener('click', () => {
      const b = earnedBadges.find(x => x.id === el.dataset.badgeId);
      if (b) showBadgeInfo(el, `${b.icon} ${b.name}`, b.desc || '');
    });
  });
}

// ---------- Entrada 1: dentro do app (logada ou convidada) ----------
// Reaproveita o MESMO modal que o Ranking já usava (#public-profile-modal,
// Rank1-4) -- não um "modal novo" e uma "página nova" separados: é a única
// superfície de perfil público que existe DENTRO do app, chamada tanto por
// um clique no Ranking (shared/leaderboard.js) quanto pelo router quando a
// URL abre direto em #/user/username com sessão/convidado já ativos (ver
// shared/router.js, rota 'publicProfile').
async function openPublicProfileModalForUsername(username){
  const modal = document.getElementById('public-profile-modal');
  const body = document.getElementById('public-profile-modal-body');
  if (!modal || !body) return;
  modal.style.display = 'flex';
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'publicProfile', username });
  await renderPublicProfileInto(body, username);
}

// Chamado por shared/router.js (renderRoute, rota 'publicProfile') -- nome
// próprio (em vez de chamar openPublicProfileModalForUsername direto lá)
// só pra manter o mesmo padrão de indireção que openUnitDetail/switchTab já
// seguem, caso uma fase futura queira uma tela de página inteira em vez de
// modal sem precisar mexer em router.js de novo.
function openPublicProfilePage(username){
  openPublicProfileModalForUsername(username);
}

// ---------- Entrada 2: SEM sessão nem modo convidado (link compartilhado) ----------
// Chamado por shared/auth.js (initAuth(), bypass ANTES de goToNeutralGate())
// -- #app nem chegou a existir na tela ainda, então usa o container próprio
// #public-profile-standalone (fora de #app, ver fr/zh index.html) em vez do
// modal. Esconde #login-screen (que senão ficaria com "Redirecionando..."
// atrás por cima) e nunca chama loadStateAndRender()/enterGuestMode() --
// ninguém aqui tem STATE nenhum, é uma página de leitura pura.
async function renderStandalonePublicProfile(username){
  const loginScreen = document.getElementById('login-screen');
  const wrap = document.getElementById('public-profile-standalone');
  const body = document.getElementById('public-profile-page-body');
  if (loginScreen) loginScreen.style.display = 'none';
  if (wrap) wrap.style.display = 'block';
  await renderPublicProfileInto(body, username);
}
