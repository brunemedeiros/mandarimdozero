// ---------- Meu Perfil (compartilhado) ----------
// Identidade do aluno -- avatar/iniciais, nome exibido, @username, bio,
// idiomas em estudo, streak/XP, conquistas em destaque. Ver a arquitetura
// aprovada: Perfil != Configurações (conta/senha/preferências continuam
// só em Configurações, nada daqui é editável de lá).
//
// Depende de (todos carregados antes deste arquivo):
//   - languages/index.js        (AVAILABLE_LANGUAGES, cada item com .appKey)
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
// E de (referenciados só dentro de função, nunca no top-level deste
// arquivo -- por isso pode vir ANTES de app.js no <body>, igual
// shared/wizard.js -- ver comentário lá):
//   - languages/<lang>/app.js   (LANG_ID, STATE, BADGES, earnedBadgeIds,
//                                 ADMIN_EMAIL, computeProgressSummary,
//                                 switchTab)
//
// A identidade (username/display_name/bio/avatar) mora numa tabela própria
// -- `profiles`, uma linha por CONTA -- e não dentro do jsonb por-idioma da
// tabela `progress` (ver shared/supabase_migrations/001_create_profiles_table.sql
// pro porquê: um campo compartilhado entre fr/zh não pode viver num
// namespace que cada site sobrescreve independentemente).
//
// SPECIAL_BADGES (Fundadora, Beta Tester...) é um catálogo à parte do
// BADGES por gameplay de cada app.js -- são badges de IDENTIDADE (contam
// quem a pessoa é pra plataforma, não o que ela jogou), calculados por
// regra (e-mail, data de criação da conta) ou concedidos manualmente via
// a tabela `badge_grants` (ver 002_create_badge_grants_table.sql), nunca
// por STATE/progresso.

let PROFILE_CACHE = null;
let OTHER_LANGUAGES_RAW_CACHE = null;

// ---------- Badges especiais (identidade, não gameplay) ----------
// Coroa desenhada em SVG, não emoji -- mesma razão das bandeiras (ver
// shared/language-switcher.js): renderização consistente em qualquer
// navegador/SO, sem depender da fonte de emoji do sistema ter um glifo
// de coroa "bonito o suficiente".
const FOUNDER_CROWN_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coroa de fundadora"><path d="M3,18 L5.5,7 L9,13 L12,5 L15,13 L18.5,7 L21,18 Z" fill="#F0BF3A" stroke="#B8860B" stroke-width="0.6" stroke-linejoin="round"/><rect x="2.5" y="17" width="19" height="3" rx="1.2" fill="#E0A825" stroke="#B8860B" stroke-width="0.4"/><circle cx="5.5" cy="7.2" r="1.15" fill="#D6483A"/><circle cx="12" cy="5.2" r="1.3" fill="#3D6FBF"/><circle cx="18.5" cy="7.2" r="1.15" fill="#3F8F5C"/><circle cx="12" cy="18.5" r="1" fill="#D6483A"/></svg>';

// "Beta tester" = qualquer conta criada antes do lançamento deste sistema
// de badges -- ou seja, todo mundo que já estava usando o app e ajudando a
// testar/reportar erros/sugerir mudanças antes de existir uma recompensa
// formal por isso. Comparado contra CURRENT_USER.created_at (data real de
// criação da conta no Supabase Auth), não profile.created_at (que só
// marca quando a pessoa abriu o Perfil pela primeira vez -- datas
// diferentes).
const BETA_TESTER_CUTOFF = '2026-09-05T00:00:00Z';

const SPECIAL_BADGES = [
  { id: 'founder', name: 'Fundadora', icon: FOUNDER_CROWN_SVG, desc: 'Criadora da plataforma' },
  { id: 'beta_tester', name: 'Beta Tester', icon: '🧪', desc: 'Ajudou a testar o app antes do lançamento oficial' },
];

function isFounder(){
  return !!(CURRENT_USER && typeof ADMIN_EMAIL !== 'undefined' && CURRENT_USER.email === ADMIN_EMAIL);
}

function isBetaTester(){
  return !!(CURRENT_USER?.created_at && new Date(CURRENT_USER.created_at) < new Date(BETA_TESTER_CUTOFF));
}

// badge_grants é o "espaço" pra conceder um badge especial a uma conta
// específica quando não existe regra automática possível -- ver
// shared/supabase_migrations/002_create_badge_grants_table.sql. Os badges
// concedidos por esse caminho são definidos (nome/ícone/descrição) na
// tabela badge_catalog (ver 003), criada pela admin na tela "Badges
// (admin)" -- shared/admin-badges.js.
async function fetchGrantedBadgeIds(){
  if (!CURRENT_USER) return new Set();
  const { data, error } = await supabaseClient
    .from('badge_grants')
    .select('badge_id')
    .eq('user_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao carregar badges concedidos:', error); return new Set(); }
  return new Set((data || []).map(r => r.badge_id));
}

async function fetchBadgeCatalog(){
  const { data, error } = await supabaseClient
    .from('badge_catalog')
    .select('*')
    .order('created_at', { ascending: true });
  if (error){ console.error('Erro ao carregar catálogo de badges:', error); return []; }
  return data || [];
}

async function computeEarnedSpecialBadges(){
  if (!CURRENT_USER) return [];
  const granted = await fetchGrantedBadgeIds();
  const earned = SPECIAL_BADGES.filter(b => {
    if (b.id === 'founder') return isFounder();
    if (b.id === 'beta_tester') return isBetaTester();
    return granted.has(b.id);
  });
  // Badges manuais (criados por admin no catálogo, concedidos via
  // badge_grants) -- só busca o catálogo inteiro se há algo concedido,
  // pra não gastar uma consulta à toa pra quem não tem nenhum.
  if (granted.size){
    const catalog = await fetchBadgeCatalog();
    catalog.forEach(cb => {
      if (granted.has(cb.id) && !earned.some(e => e.id === cb.id)){
        earned.push({ id: cb.id, name: cb.name, icon: cb.icon, desc: cb.description });
      }
    });
  }
  return earned;
}

// Só minúsculas/números/ponto/traço/underscore -- mesmo padrão do check
// constraint da tabela (esta função é a validação de verdade; o check no
// banco é só o cinto de segurança).
function slugifyUsername(raw){
  const cleaned = String(raw || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24);
  return cleaned;
}

function avatarInitials(name){
  const clean = String(name || '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (initials || clean[0]).toUpperCase();
}

// Hash simples só pra escolher, de forma ESTÁVEL, uma cor entre um punhado
// fixo do tema -- a mesma pessoa sempre vê o mesmo avatar, não é
// aleatório a cada carregamento.
function avatarColor(seed){
  const palette = ['#2C4A6E', '#3F7D5C', '#A6402E', '#8B5FBF', '#B8860B', '#4A6FA5'];
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

async function createInitialProfile(){
  const localPart = (CURRENT_USER.email || 'aluno').split('@')[0];
  const base = slugifyUsername(localPart) || 'aluno';
  const displayName = CURRENT_USER.user_metadata?.full_name || null;
  let candidate = base;
  for (let attempt = 0; attempt < 30; attempt++){
    const { data, error } = await supabaseClient
      .from('profiles')
      .insert({ user_id: CURRENT_USER.id, username: candidate, display_name: displayName })
      .select()
      .single();
    if (!error) return data;
    // 23505 = unique_violation (username já existe) -- tenta o próximo
    // sufixo numérico até achar um livre.
    if (error.code === '23505'){
      candidate = `${base}${attempt + 2}`;
      continue;
    }
    console.error('Erro ao criar perfil:', error);
    return null;
  }
  return null;
}

async function ensureProfileLoaded(){
  if (!CURRENT_USER) return null;
  if (PROFILE_CACHE) return PROFILE_CACHE;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', CURRENT_USER.id)
    .maybeSingle();
  if (error){ console.error('Erro ao carregar perfil:', error); return null; }
  PROFILE_CACHE = data || await createInitialProfile();
  return PROFILE_CACHE;
}

async function isUsernameAvailable(candidate){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id')
    .eq('username', candidate)
    .neq('user_id', CURRENT_USER.id)
    .maybeSingle();
  if (error){ console.error('Erro ao checar username:', error); return false; }
  return !data;
}

async function saveProfileEdits({ displayName, username, bio, featuredBadgeId }){
  const cleanUsername = slugifyUsername(username);
  if (cleanUsername.length < 3){
    return { ok: false, error: 'Nome de usuário precisa ter pelo menos 3 caracteres (letras, números, ponto, traço ou _).' };
  }
  if (cleanUsername !== PROFILE_CACHE?.username){
    const available = await isUsernameAvailable(cleanUsername);
    if (!available) return { ok: false, error: 'Esse nome de usuário já está em uso.' };
  }
  const payload = {
    display_name: (displayName || '').trim().slice(0, 60) || null,
    username: cleanUsername,
    bio: (bio || '').trim().slice(0, 160) || null,
    // Badge que aparece junto do nome no Ranking (ver shared/leaderboard.js).
    // Só badges especiais (Fundadora/Beta Tester/concedidos por admin) podem
    // ser destacados aqui -- nunca um badge de gameplay (BADGES em cada
    // app.js), porque esse conjunto é DIFERENTE por idioma e featured_badge_id
    // é um campo só, compartilhado entre fr/zh (ver 001) -- destacar um badge
    // que só existe no vocabulário de um idioma quebraria a leitura no outro.
    featured_badge_id: featuredBadgeId || null,
  };
  const { data, error } = await supabaseClient
    .from('profiles')
    .update(payload)
    .eq('user_id', CURRENT_USER.id)
    .select()
    .single();
  if (error){
    console.error('Erro ao salvar perfil:', error);
    return { ok: false, error: 'Não foi possível salvar agora. Verifique sua conexão e tente de novo.' };
  }
  PROFILE_CACHE = data;
  return { ok: true, profile: data };
}

// ---------- Avatar (upload de foto) ----------
// "Crop simples" (ver "Priorização" na arquitetura aprovada): corta pro
// quadrado central automaticamente, sem UI de arrastar/ajustar -- e
// redimensiona no CLIENTE antes de subir, então uma foto de câmera de
// vários MB nunca vai inteira pro Storage.
const AVATAR_MAX_DIMENSION = 480;
const AVATAR_MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // limite do arquivo ORIGINAL, antes do resize

function resizeImageToSquareBlob(file){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_MAX_DIMENSION;
      canvas.height = AVATAR_MAX_DIMENSION;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao processar imagem.')), 'image/jpeg', 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler essa imagem.')); };
    img.src = url;
  });
}

// Path fixo por conta (não por upload) -- upsert:true sempre sobrescreve o
// mesmo arquivo, então não acumula lixo no bucket a cada troca de foto.
function avatarStoragePath(){
  return `${CURRENT_USER.id}/avatar.jpg`;
}

async function uploadAvatar(file){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta pra salvar uma foto.' };
  if (!file.type.startsWith('image/')) return { ok: false, error: 'Escolha um arquivo de imagem (JPG, PNG...).' };
  if (file.size > AVATAR_MAX_UPLOAD_BYTES) return { ok: false, error: 'Imagem muito grande (máx. 8MB).' };

  let blob;
  try{
    blob = await resizeImageToSquareBlob(file);
  }catch(e){
    console.error('Erro ao processar imagem:', e);
    return { ok: false, error: 'Não foi possível processar essa imagem. Tente outra.' };
  }

  const path = avatarStoragePath();
  const { error: uploadError } = await supabaseClient.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (uploadError){
    console.error('Erro ao subir avatar:', uploadError);
    return { ok: false, error: 'Não foi possível enviar a foto agora. Tente de novo.' };
  }

  const { data: pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
  // Cache-busting: o path é sempre o mesmo (upsert), então sem isso o
  // navegador continuaria mostrando a foto antiga em cache depois de trocar.
  const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;

  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('user_id', CURRENT_USER.id)
    .select()
    .single();
  if (error){
    console.error('Erro ao salvar avatar no perfil:', error);
    return { ok: false, error: 'Foto enviada, mas não foi possível salvar no perfil. Tente de novo.' };
  }
  PROFILE_CACHE = data;
  return { ok: true, profile: data };
}

async function removeAvatar(){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  // Best-effort: mesmo se o arquivo já não existir no Storage (ou a
  // remoção falhar por algum motivo), ainda limpamos avatar_url no
  // perfil -- o dado que a UI realmente lê é a coluna, não o arquivo.
  await supabaseClient.storage.from('avatars').remove([avatarStoragePath()]);
  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ avatar_url: null })
    .eq('user_id', CURRENT_USER.id)
    .select()
    .single();
  if (error){
    console.error('Erro ao remover avatar:', error);
    return { ok: false, error: 'Não foi possível remover a foto agora.' };
  }
  PROFILE_CACHE = data;
  return { ok: true, profile: data };
}

// Lê a linha inteira de `progress` (todos os idiomas, não só o deste site)
// -- é o que permite mostrar "Francês · A1 · 42%" enquanto a pessoa está
// dentro do site de chinês, sem carregar o content.js do francês.
async function fetchOtherLanguagesRaw(){
  if (!CURRENT_USER) return {};
  if (OTHER_LANGUAGES_RAW_CACHE) return OTHER_LANGUAGES_RAW_CACHE;
  const { data, error } = await supabaseClient
    .from('progress')
    .select('data')
    .eq('user_id', CURRENT_USER.id)
    .maybeSingle();
  // Um ERRO (rede, RLS etc.) nunca fica em cache -- só "de fato não há
  // linha salva" (data ausente, sem erro) é um resultado estável o
  // suficiente pra cachear como {}. Sem essa distinção, uma falha
  // transitória na primeira chamada "envenenava" o cache com {} pro resto
  // da sessão, escondendo o progresso do outro idioma mesmo que ele
  // existisse de verdade no Supabase.
  if (error){ console.error('Erro ao carregar progresso de outros idiomas:', error); return {}; }
  OTHER_LANGUAGES_RAW_CACHE = (data && data.data) || {};
  return OTHER_LANGUAGES_RAW_CACHE;
}

// Um cartão por idioma habilitado: o deste site vem do STATE ao vivo
// (sempre o mais atual); os outros vêm do progressSummary que cada
// app.js já grava dentro do próprio serializeState() -- só aparecem se a
// pessoa já tiver ALGUM progresso salvo naquele idioma (senão não faz
// sentido mostrar "0%" de um idioma que ela nunca abriu).
async function buildLanguagesSummary(){
  const raw = await fetchOtherLanguagesRaw();
  return AVAILABLE_LANGUAGES.filter(l => l.enabled).map(l => {
    if (l.id === LANG_ID){
      const s = computeProgressSummary();
      return { id: l.id, name: l.name, flagSvg: l.flagSvg, levelLabel: s.levelLabel, pct: s.pct, isCurrent: true };
    }
    const other = raw[l.appKey];
    if (!other) return null;
    if (other.progressSummary){
      const s = other.progressSummary;
      return { id: l.id, name: l.name, flagSvg: l.flagSvg, levelLabel: s.levelLabel, pct: s.pct, isCurrent: false };
    }
    // Progresso salvo ANTES de progressSummary existir (contas com
    // histórico anterior a este recurso) -- sem isto, o card do outro
    // idioma simplesmente nunca aparecia até a pessoa reabrir aquele site
    // pelo menos uma vez (o próximo saveState() de lá já grava o campo de
    // verdade). Calcula um resumo aproximado só com o que SEMPRE existiu em
    // unitProgress -- todo id de unidade já vem pré-populado desde a
    // inicialização do STATE daquele idioma -- sem precisar carregar o
    // content.js do outro site.
    const fallback = fallbackSummaryFromUnitProgress(other.unitProgress);
    if (!fallback) return null;
    return { id: l.id, name: l.name, flagSvg: l.flagSvg, levelLabel: null, pct: fallback.pct, isCurrent: false };
  }).filter(Boolean);
}

function fallbackSummaryFromUnitProgress(unitProgress){
  if (!unitProgress) return null;
  const ids = Object.keys(unitProgress);
  if (!ids.length) return null;
  const done = ids.filter(id => unitProgress[id]?.completed).length;
  if (done === 0) return null;
  return { pct: Math.round((done / ids.length) * 100) };
}

function profileDisplayName(profile){
  return profile?.display_name || CURRENT_USER?.user_metadata?.full_name || (CURRENT_USER ? CURRENT_USER.email?.split('@')[0] : 'Convidado');
}

async function renderProfileView(){
  const wrap = document.getElementById('profile-content');
  if (!wrap) return;
  wrap.innerHTML = `<p class="profile-loading">Carregando perfil...</p>`;

  const langs = await buildLanguagesSummary();
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.has(b.id));
  const featured = earnedBadges.slice(-4).reverse();
  const specialBadges = await computeEarnedSpecialBadges();

  if (!CURRENT_USER){
    renderProfileBody(wrap, { profile: null, langs, earnedBadges, featured, specialBadges, isGuest: true });
    return;
  }

  const profile = await ensureProfileLoaded();
  renderProfileBody(wrap, { profile, langs, earnedBadges, featured, specialBadges, isGuest: false });
}

function renderProfileBody(wrap, { profile, langs, earnedBadges, featured, specialBadges, isGuest }){
  const name = profileDisplayName(profile);
  const initials = avatarInitials(name);
  const color = avatarColor(profile?.user_id || CURRENT_USER?.email || 'convidado');
  const bio = profile?.bio;

  const guestNote = isGuest ? `
    <div class="guest-warning">
      ⚠️ Modo convidado — crie uma conta pra ter um perfil salvo (username, bio) e visível entre sessões.
      <button class="guest-warning-link" id="profile-guest-login-prompt">Entrar com Google para salvar</button>
    </div>
  ` : '';

  const langsHTML = langs.map(l => `
    <div class="profile-lang-card">
      <div class="profile-lang-flag">${l.flagSvg}</div>
      <div class="profile-lang-info">
        <div class="profile-lang-name">${l.name}</div>
        <div class="profile-lang-level">${l.levelLabel ? `${l.levelLabel} · ` : ''}${l.pct}%</div>
        <div class="profile-lang-bar"><div style="width:${l.pct}%;"></div></div>
      </div>
    </div>
  `).join('');

  const badgesHTML = featured.length ? featured.map(b => `
    <div class="profile-badge" title="${b.name}">${b.icon}</div>
  `).join('') : `<p class="profile-empty-note">Nenhuma conquista ainda — sua primeira lição já desbloqueia uma.</p>`;

  // Badges especiais (Fundadora, Beta Tester...) ficam junto da identidade,
  // não misturados com a grade de conquistas por gameplay -- são sobre
  // QUEM a pessoa é pra plataforma, não o que ela jogou (ver SPECIAL_BADGES).
  const specialBadgesHTML = specialBadges?.length ? `
    <div class="profile-special-badges">
      ${specialBadges.map(b => `
        <div class="profile-special-badge" title="${b.desc}">
          <span class="profile-special-badge-icon">${b.icon}</span>
          <span class="profile-special-badge-name">${b.name}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const avatarHTML = profile?.avatar_url
    ? `<img class="profile-avatar" src="${profile.avatar_url}" alt="Foto de perfil">`
    : `<div class="profile-avatar" style="background:${color};">${initials}</div>`;

  wrap.innerHTML = `
    ${guestNote}
    <div class="profile-identity">
      ${avatarHTML}
      <div class="profile-name">${name}</div>
      ${profile ? `<div class="profile-username">@${profile.username}</div>` : ''}
      ${bio ? `<p class="profile-bio">${escapeHTML(bio)}</p>` : ''}
      ${specialBadgesHTML}
      ${profile ? `<button class="profile-edit-btn" id="profile-edit-btn">Editar perfil</button>` : ''}
    </div>

    <div class="profile-section">
      <div class="section-label">Idiomas &amp; progresso</div>
      <div class="profile-langs-row">${langsHTML}</div>
      <div class="profile-nums-row">
        <div class="profile-num"><div class="v">🔥 ${STATE.streak}</div><div class="l">dias seguidos</div></div>
        <div class="profile-num"><div class="v">${STATE.xp}</div><div class="l">XP acumulado</div></div>
      </div>
      <button class="profile-stats-link" id="profile-stats-link">Ver estatísticas completas →</button>
    </div>

    <div class="profile-section">
      <div class="section-label">Conquistas <span class="conquests-count">${earnedBadges.length}/${BADGES.length}</span></div>
      <div class="profile-badges-row">${badgesHTML}</div>
      <button class="profile-stats-link" id="profile-badges-link">Ver todas →</button>
    </div>
  `;

  document.getElementById('profile-stats-link')?.addEventListener('click', () => switchTab('progress'));
  document.getElementById('profile-badges-link')?.addEventListener('click', () => switchTab('progress'));
  document.getElementById('profile-edit-btn')?.addEventListener('click', () => openEditProfileModal(specialBadges));
  document.getElementById('profile-guest-login-prompt')?.addEventListener('click', () => {
    sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
    CURRENT_USER = null;
    showLoginScreen();
  });
}

// Escapa o campo "Sobre mim" antes de renderizar -- texto livre digitado
// pelo aluno, nunca deve ser interpretado como HTML.
function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Preview do avatar dentro do modal de edição -- mesma regra de fallback
// pra iniciais/cor do avatar principal (avatarInitials/avatarColor),
// chamada tanto ao abrir o modal quanto depois de um upload/remoção bem-
// sucedidos (sem precisar fechar e reabrir o modal pra ver o resultado).
function renderAvatarPreview(profile){
  const preview = document.getElementById('profile-edit-avatar-preview');
  const removeBtn = document.getElementById('profile-edit-avatar-remove-btn');
  if (!preview) return;
  if (profile?.avatar_url){
    preview.innerHTML = `<img src="${profile.avatar_url}" alt="Foto de perfil">`;
    if (removeBtn) removeBtn.style.display = '';
  } else {
    const name = profileDisplayName(profile);
    const initials = avatarInitials(name);
    const color = avatarColor(profile?.user_id || CURRENT_USER?.email || 'convidado');
    preview.innerHTML = `<div class="profile-edit-avatar-initials" style="background:${color};">${initials}</div>`;
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

// Popula o seletor de "badge em destaque" (aparece no Ranking, ver
// shared/leaderboard.js) com os badges ESPECIAIS que a pessoa já ganhou --
// nunca um badge de gameplay (BADGES), ver o porquê no comentário de
// saveProfileEdits(). Só mostra a seção se houver pelo menos 1 badge
// especial: sem isso, quem ainda não ganhou nenhum veria um seletor vazio
// sem função nenhuma.
function renderFeaturedBadgeSelect(specialBadges, currentId){
  const row = document.getElementById('profile-edit-featured-badge-row');
  const select = document.getElementById('profile-edit-featured-badge');
  if (!row || !select) return;
  if (!specialBadges?.length){
    row.style.display = 'none';
    return;
  }
  row.style.display = '';
  const options = specialBadges.map(b => {
    // <option> só renderiza texto puro -- o ícone da Fundadora é um SVG
    // inline (não dá pra colocar dentro de <option>), então só prefixa com
    // o emoji quando o ícone realmente for um emoji simples.
    const iconText = (b.icon && !b.icon.startsWith('<')) ? `${b.icon} ` : '';
    return `<option value="${b.id}" ${b.id === currentId ? 'selected' : ''}>${iconText}${b.name}</option>`;
  }).join('');
  select.innerHTML = `<option value="">Nenhum</option>${options}`;
}

function openEditProfileModal(specialBadges){
  const modal = document.getElementById('profile-edit-modal');
  const p = PROFILE_CACHE;
  document.getElementById('profile-edit-display-name').value = p?.display_name || '';
  document.getElementById('profile-edit-username').value = p?.username || '';
  document.getElementById('profile-edit-bio').value = p?.bio || '';
  document.getElementById('profile-edit-bio-count').textContent = `${(p?.bio || '').length}/160`;
  document.getElementById('profile-edit-error').textContent = '';
  document.getElementById('profile-edit-avatar-error').textContent = '';
  renderFeaturedBadgeSelect(specialBadges, p?.featured_badge_id || '');
  renderAvatarPreview(p);
  modal.style.display = 'flex';
}

function closeEditProfileModal(){
  document.getElementById('profile-edit-modal').style.display = 'none';
}

function wireProfileEditModal(){
  const modal = document.getElementById('profile-edit-modal');
  if (!modal) return;

  document.getElementById('profile-edit-modal-close').addEventListener('click', closeEditProfileModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditProfileModal(); });

  // Avatar sobe/remove NA HORA (não espera o "Salvar" do form, que só cobre
  // nome/username/bio) -- mesmo padrão de "clicar já aplica" que o resto do
  // app usa pra ações de um clique só (ex. troca de tema, toggle de pinyin).
  const avatarInput = document.getElementById('profile-edit-avatar-input');
  const avatarError = document.getElementById('profile-edit-avatar-error');
  const changeBtn = document.getElementById('profile-edit-avatar-change-btn');
  const removeBtn = document.getElementById('profile-edit-avatar-remove-btn');

  changeBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    avatarInput.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    avatarError.textContent = '';
    changeBtn.disabled = true;
    changeBtn.textContent = 'Enviando...';
    const result = await uploadAvatar(file);
    changeBtn.disabled = false;
    changeBtn.textContent = 'Alterar foto';
    if (!result.ok){
      avatarError.textContent = result.error;
      return;
    }
    renderAvatarPreview(result.profile);
    renderProfileView();
    showToast('✓ Foto atualizada.');
  });

  removeBtn.addEventListener('click', async () => {
    avatarError.textContent = '';
    removeBtn.disabled = true;
    const result = await removeAvatar();
    removeBtn.disabled = false;
    if (!result.ok){
      avatarError.textContent = result.error;
      return;
    }
    renderAvatarPreview(result.profile);
    renderProfileView();
    showToast('✓ Foto removida.');
  });

  const bioInput = document.getElementById('profile-edit-bio');
  bioInput.addEventListener('input', () => {
    document.getElementById('profile-edit-bio-count').textContent = `${bioInput.value.length}/160`;
  });

  document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('profile-edit-save-btn');
    const errorEl = document.getElementById('profile-edit-error');
    errorEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    const result = await saveProfileEdits({
      displayName: document.getElementById('profile-edit-display-name').value,
      username: document.getElementById('profile-edit-username').value,
      bio: bioInput.value,
      featuredBadgeId: document.getElementById('profile-edit-featured-badge')?.value,
    });

    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar';

    if (!result.ok){
      errorEl.textContent = result.error;
      return;
    }
    closeEditProfileModal();
    renderProfileView();
    showToast('✓ Perfil atualizado.');
  });
}

wireProfileEditModal();
