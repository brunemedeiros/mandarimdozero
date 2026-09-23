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
// Fase 2 (ver CLAUDE.md) acrescentou a LISTA de flashcards PRÓPRIOS
// públicos pra importar (grilling Q3/Q4/Q6/Q7/Q11): botão "Ver cartões",
// atrás de um gate de login (fundo embaçado + "Faça login..." quando não
// há CURRENT_USER -- cobre anônimo E convidado, os dois sem conta real pra
// importar PARA), multi-select com Selecionar todos/Limpar seleção, botão
// de pré-visualizar cada cartão (Q11) e de reportar (Q6, reaproveita
// shared/reports.js sem nenhuma mudança lá). Importar SEMPRE cria uma
// cópia independente (createOwnFlashcard) -- nunca uma referência viva ao
// cartão original (Q7: editar o original depois não altera a cópia já
// importada). Respeita o MESMO teto de 20 cartões do plano grátis já
// travado na Fase 5.1 (FREE_OWN_FLASHCARD_LIMIT/hasActiveTeacherLink) --
// importar não é uma forma de contornar esse limite.
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
//   - shared/roles.js           (hasActiveTeacherLink -- Fase 5.1)
//   - shared/student-flashcards.js (fetchMyOwnFlashcards, createOwnFlashcard)
//   - shared/reports.js         (openReportModal -- Q6, sem mudança lá)
//   - languages/index.js        (AVAILABLE_LANGUAGES, pra bandeira/nome por
//                                 languageAppKey)
// E (referenciados só dentro de função, nunca no top-level -- por isso este
// arquivo pode carregar antes de languages/<lang>/app.js):
//   - shared/toast.js  (showBadgeInfo/showToast, ver shared/utils.js)
//   - shared/router.js (routerNavigate -- só chamado quando existir)
//   - fr/zh app.js      (APP_KEY, addSelfFlashcardToState)

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

  // Fase 2 -- só existe o convite pra ver cartões quando o perfil É
  // público (mesmo interruptor mestre de sempre, ver Q1 do grilling da
  // Fase 1: conta privada esconde TUDO, cartões inclusive, não só as
  // estatísticas). get_public_flashcards() confere isso de novo no
  // servidor (defesa em profundidade), mas nem vale a pena mostrar o
  // botão/gastar clique se já se sabe aqui que a resposta vai ser vazia.
  const cardsHTML = isPublic ? `
    <div class="public-profile-cards-section">
      <div class="section-label">Flashcards</div>
      <button type="button" class="btn btn-secondary btn-block" id="public-profile-cards-toggle-btn">📇 Ver cartões criados por @${escapeHTML(profile.username)}</button>
      <div id="public-profile-cards-box" style="display:none; margin-top:10px;"></div>
    </div>
  ` : '';

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
    ${cardsHTML}
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

  if (isPublic){
    const toggleBtn = bodyEl.querySelector('#public-profile-cards-toggle-btn');
    const box = bodyEl.querySelector('#public-profile-cards-box');
    toggleBtn?.addEventListener('click', () => {
      const opening = box.style.display === 'none';
      box.style.display = opening ? 'block' : 'none';
      // Busca só na PRIMEIRA vez que abre -- reabrir/fechar depois disso é
      // só toggle de display, mesmo padrão de custo de rede já usado no
      // painel de métricas da Fase 6a (feature de alunas particulares).
      if (opening && !box.dataset.loaded){
        box.dataset.loaded = '1';
        renderPublicProfileCardsBox(bodyEl, profile.username);
      }
    });
  }
}

// ---------- Fase 2: lista de flashcards públicos + importação ----------
// Estado ÚNICO (não por bodyEl) -- diferente do WeakMap de corrida acima,
// só um container de cartões pode estar aberto de verdade por vez na
// prática (modal e página standalone nunca são populados na mesma sessão
// de página, ver comentário do topo do arquivo), então um objeto global
// simples é suficiente; guarda o que o formulário de importação precisa
// entre o clique de "Selecionar"/checkbox e o clique de "Adicionar".
const PUBLIC_PROFILE_IMPORT_STATE = { username: null, cardsCache: [], selectedIds: new Set(), remainingSlots: Infinity };

async function fetchPublicFlashcardsByUsername(username, languageAppKey){
  const { data, error } = await supabaseClient.rpc('get_public_flashcards', { p_username: username, p_language_app_key: languageAppKey });
  if (error || !data){ console.error('Erro ao carregar cartões públicos:', error); return { cards: [] }; }
  if (data.error) return { cards: [] }; // not_found/not_public -- silencioso, o botão só aparece quando isPublic já é true
  return { cards: data.cards || [] };
}

// Q3 do grilling: ver E importar cartões exige LOGIN de verdade -- cobre
// tanto visitante totalmente anônimo (página standalone, CURRENT_USER
// sempre null ali) quanto modo convidado (CURRENT_USER===false) -- os
// dois sem uma conta real em que gravar a cópia importada. Fundo
// "embaçado" (filter:blur numa lista de linhas fictícias) + convite pra
// entrar, exatamente como pedido.
function publicProfileCardsLoginGateHTML(){
  const fakeRow = `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">•••••• → ••••••</div>
        <div class="admin-badge-desc">••••••••••••</div>
      </div>
    </div>
  `;
  return `
    <div class="public-profile-cards-gate">
      <div class="public-profile-cards-gate-skeleton">${fakeRow}${fakeRow}${fakeRow}</div>
      <div class="public-profile-cards-gate-overlay">
        <div class="public-profile-cards-gate-card">
          <p>🔒 Faça login para ver os cartões e adicionar ao seu perfil.</p>
          <a href="../" class="btn btn-primary btn-block">Fazer login →</a>
        </div>
      </div>
    </div>
  `;
}

function publicProfileFlashcardRowHTML(c){
  return `
    <div class="admin-badge-row" data-card-row="${c.id}">
      <input type="checkbox" class="public-profile-card-check" data-card-id="${c.id}">
      <div class="admin-badge-info">
        <div class="admin-badge-name">${escapeHTML(c.front)}${c.frontPinyin ? ` (${escapeHTML(c.frontPinyin)})` : ''} → ${escapeHTML(c.backTrans)}</div>
        ${c.note ? `<div class="admin-badge-desc">${escapeHTML(c.note)}</div>` : ''}
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="admin-badge-delete-btn" data-preview-card="${c.id}" title="Ver detalhes, sem editar">👁</button>
        <button type="button" class="admin-badge-delete-btn" data-report-card="${c.id}" title="Reportar este cartão">🚩</button>
      </div>
    </div>
  `;
}

async function renderPublicProfileCardsBox(bodyEl, username){
  const box = bodyEl.querySelector('#public-profile-cards-box');
  if (!box) return;

  // !CURRENT_USER cobre os 3 estados possíveis desta variável (null na
  // página standalone, false em modo convidado, objeto quando logada de
  // verdade) -- só o terceiro caso passa.
  if (!CURRENT_USER){
    box.innerHTML = publicProfileCardsLoginGateHTML();
    return;
  }

  box.innerHTML = loadingHTML();

  const [cardsRes, hasLink, myCards] = await Promise.all([
    fetchPublicFlashcardsByUsername(username, APP_KEY),
    (typeof hasActiveTeacherLink === 'function') ? hasActiveTeacherLink() : Promise.resolve(false),
    (typeof fetchMyOwnFlashcards === 'function') ? fetchMyOwnFlashcards(APP_KEY) : Promise.resolve([]),
  ]);

  PUBLIC_PROFILE_IMPORT_STATE.username = username;
  PUBLIC_PROFILE_IMPORT_STATE.cardsCache = cardsRes.cards;
  PUBLIC_PROFILE_IMPORT_STATE.selectedIds = new Set();
  // Mesmo teto da Fase 5.1 (FREE_OWN_FLASHCARD_LIMIT, shared/my-flashcards.js)
  // -- importar cartão alheio não é uma forma de contornar o limite do
  // plano grátis, é só mais uma forma de CRIAR um cartão próprio.
  const activeMyCount = myCards.filter(c => c.status === 'active').length;
  PUBLIC_PROFILE_IMPORT_STATE.remainingSlots = hasLink
    ? Infinity
    : Math.max(0, (typeof FREE_OWN_FLASHCARD_LIMIT === 'number' ? FREE_OWN_FLASHCARD_LIMIT : 20) - activeMyCount);

  if (!cardsRes.cards.length){
    box.innerHTML = `<p class="profile-empty-note">Este usuário ainda não tem nenhum cartão público.</p>`;
    return;
  }

  box.innerHTML = `
    <div class="admin-recipients-summary">
      <span class="pill" id="public-profile-cards-counter">Nenhum cartão selecionado</span>
      <div class="admin-recipients-actions">
        <a href="#" class="admin-select-link" id="public-profile-cards-select-all">Selecionar todos</a>
        <a href="#" class="admin-select-link" id="public-profile-cards-clear">Limpar seleção</a>
      </div>
    </div>
    <div id="public-profile-cards-list">${cardsRes.cards.map(publicProfileFlashcardRowHTML).join('')}</div>
    <button type="button" class="btn btn-primary btn-block" id="public-profile-cards-import-btn" disabled style="margin-top:10px;">Adicionar aos meus cartões</button>
    <p class="profile-edit-error" id="public-profile-cards-import-error"></p>
  `;

  wirePublicProfileCardsBox(box);
}

function updatePublicProfileCardsCounter(box){
  const n = PUBLIC_PROFILE_IMPORT_STATE.selectedIds.size;
  const counter = box.querySelector('#public-profile-cards-counter');
  if (counter) counter.textContent = n === 0 ? 'Nenhum cartão selecionado' : `${n} cartão(ões) selecionado(s)`;
  const importBtn = box.querySelector('#public-profile-cards-import-btn');
  if (importBtn) importBtn.disabled = n === 0;
}

function wirePublicProfileCardsBox(box){
  box.querySelectorAll('.public-profile-card-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.cardId);
      if (cb.checked) PUBLIC_PROFILE_IMPORT_STATE.selectedIds.add(id);
      else PUBLIC_PROFILE_IMPORT_STATE.selectedIds.delete(id);
      updatePublicProfileCardsCounter(box);
    });
  });

  box.querySelector('#public-profile-cards-select-all')?.addEventListener('click', (e) => {
    e.preventDefault();
    PUBLIC_PROFILE_IMPORT_STATE.selectedIds = new Set(PUBLIC_PROFILE_IMPORT_STATE.cardsCache.map(c => c.id));
    box.querySelectorAll('.public-profile-card-check').forEach(cb => { cb.checked = true; });
    updatePublicProfileCardsCounter(box);
  });
  box.querySelector('#public-profile-cards-clear')?.addEventListener('click', (e) => {
    e.preventDefault();
    PUBLIC_PROFILE_IMPORT_STATE.selectedIds = new Set();
    box.querySelectorAll('.public-profile-card-check').forEach(cb => { cb.checked = false; });
    updatePublicProfileCardsCounter(box);
  });

  box.querySelectorAll('[data-preview-card]').forEach(btn => {
    btn.addEventListener('click', () => openPublicFlashcardPreview(Number(btn.dataset.previewCard)));
  });
  box.querySelectorAll('[data-report-card]').forEach(btn => {
    btn.addEventListener('click', () => reportPublicFlashcard(Number(btn.dataset.reportCard)));
  });

  box.querySelector('#public-profile-cards-import-btn')?.addEventListener('click', () => importSelectedPublicFlashcards(box));
}

// Q11 do grilling: "ver cada cartão como se fosse editá-lo, mas sem
// permitir a edição" -- reaproveita o mesmo vocabulário visual dos forms
// de edição (.profile-edit-label) só que como texto estático, nunca
// campos editáveis nem botão de salvar.
function openPublicFlashcardPreview(cardId){
  const c = PUBLIC_PROFILE_IMPORT_STATE.cardsCache.find(x => x.id === cardId);
  const modal = document.getElementById('public-flashcard-preview-modal');
  const body = document.getElementById('public-flashcard-preview-body');
  if (!c || !modal || !body) return;
  const direction = c.frontIsTargetLanguage === false
    ? 'Frente na tradução, verso no idioma estudado'
    : 'Frente no idioma estudado, verso na tradução';
  body.innerHTML = `
    <div class="profile-edit-label">Frente</div>
    <p>${escapeHTML(c.front)}</p>
    ${c.frontPinyin ? `<div class="profile-edit-label">Pinyin</div><p>${escapeHTML(c.frontPinyin)}</p>` : ''}
    <div class="profile-edit-label">Verso</div>
    <p>${escapeHTML(c.backTrans)}</p>
    ${c.note ? `<div class="profile-edit-label">Nota</div><p>${escapeHTML(c.note)}</p>` : ''}
    <div class="profile-edit-label">Direção</div>
    <p>${direction}</p>
  `;
  modal.style.display = 'flex';
}

// Q6 do grilling: aprovado sem ressalva -- reaproveita 100% o sistema de
// report já existente (shared/reports.js), só com um `source` e o
// conteúdo do cartão como contexto extra. Nenhuma mudança em reports.js.
function reportPublicFlashcard(cardId){
  const c = PUBLIC_PROFILE_IMPORT_STATE.cardsCache.find(x => x.id === cardId);
  if (!c || typeof openReportModal !== 'function') return;
  openReportModal({
    source: 'public_profile_flashcard',
    flashcard_owner_username: PUBLIC_PROFILE_IMPORT_STATE.username,
    flashcard_front: c.front,
    flashcard_back: c.backTrans,
  });
}

async function importSelectedPublicFlashcards(box){
  const errorEl = box.querySelector('#public-profile-cards-import-error');
  if (errorEl) errorEl.textContent = '';
  const ids = [...PUBLIC_PROFILE_IMPORT_STATE.selectedIds];
  if (!ids.length) return;

  if (ids.length > PUBLIC_PROFILE_IMPORT_STATE.remainingSlots){
    const modal = document.getElementById('flashcard-limit-modal');
    if (modal) modal.style.display = 'flex';
    else if (errorEl) errorEl.textContent = 'Você atingiu o limite de cartões do plano grátis.';
    return;
  }

  const btn = box.querySelector('#public-profile-cards-import-btn');
  if (btn){ btn.disabled = true; btn.textContent = 'Adicionando...'; }

  let importedCount = 0;
  for (const id of ids){
    const c = PUBLIC_PROFILE_IMPORT_STATE.cardsCache.find(x => x.id === id);
    if (!c) continue;
    // Q7 do grilling: SEMPRE uma cópia independente -- createOwnFlashcard()
    // cria uma linha NOVA na conta de quem importa, nunca uma referência
    // viva ao cartão original. Editar o original depois disso não altera
    // esta cópia.
    const result = await createOwnFlashcard({
      languageAppKey: APP_KEY,
      front: c.front,
      backTrans: c.backTrans,
      note: c.note,
      frontPinyin: c.frontPinyin,
      frontIsTargetLanguage: c.frontIsTargetLanguage,
    });
    if (result.ok){
      importedCount++;
      // Mesmo motivo de sempre (ver comentário de addSelfFlashcardToState
      // em fr/zh app.js) -- sem isto, o cartão só entraria na fila de
      // revisão no PRÓXIMO carregamento do app.
      if (typeof addSelfFlashcardToState === 'function') addSelfFlashcardToState(result.card);
    }
  }

  if (importedCount > 0 && typeof showToast === 'function'){
    showToast(`✓ ${importedCount} cartão(ões) adicionado(s) à sua conta.`);
  }
  if (importedCount < ids.length && errorEl){
    errorEl.textContent = 'Alguns cartões não puderam ser adicionados. Tente de novo.';
  }
  // Re-renderiza a caixa inteira -- reflete o espaço restante novo (pode
  // ter zerado) e limpa a seleção, mesmo padrão de "só um submit
  // bem-sucedido reseta o estado" já usado em Meus Cartões. box.parentElement
  // é `.public-profile-cards-section`, e o pai DELE é sempre o bodyEl
  // (modal ou página standalone) -- estrutura fixa montada acima, nunca
  // varia por contexto.
  await renderPublicProfileCardsBox(box.parentElement.parentElement, PUBLIC_PROFILE_IMPORT_STATE.username);
}

document.getElementById('public-flashcard-preview-close')?.addEventListener('click', () => {
  const modal = document.getElementById('public-flashcard-preview-modal');
  if (modal) modal.style.display = 'none';
});
document.getElementById('public-flashcard-preview-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'public-flashcard-preview-modal') e.target.style.display = 'none';
});

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
