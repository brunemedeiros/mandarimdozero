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
//   - languages/<lang>/app.js   (LANG_ID, STATE, BADGES, earnedBadgeIds,
//                                 computeProgressSummary, switchTab) -- por
//     isso vem depois de app.js no <body>, igual language-switcher.js.
//
// A identidade (username/display_name/bio/avatar) mora numa tabela própria
// -- `profiles`, uma linha por CONTA -- e não dentro do jsonb por-idioma da
// tabela `progress` (ver shared/supabase_migrations/001_create_profiles_table.sql
// pro porquê: um campo compartilhado entre fr/zh não pode viver num
// namespace que cada site sobrescreve independentemente).

let PROFILE_CACHE = null;
let OTHER_LANGUAGES_RAW_CACHE = null;

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

async function saveProfileEdits({ displayName, username, bio }){
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
  if (error || !data || !data.data){ OTHER_LANGUAGES_RAW_CACHE = {}; return {}; }
  OTHER_LANGUAGES_RAW_CACHE = data.data;
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
    const summary = raw[l.appKey]?.progressSummary;
    if (!summary) return null;
    return { id: l.id, name: l.name, flagSvg: l.flagSvg, levelLabel: summary.levelLabel, pct: summary.pct, isCurrent: false };
  }).filter(Boolean);
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

  if (!CURRENT_USER){
    renderProfileBody(wrap, { profile: null, langs, earnedBadges, featured, isGuest: true });
    return;
  }

  const profile = await ensureProfileLoaded();
  renderProfileBody(wrap, { profile, langs, earnedBadges, featured, isGuest: false });
}

function renderProfileBody(wrap, { profile, langs, earnedBadges, featured, isGuest }){
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
        <div class="profile-lang-level">${l.levelLabel} · ${l.pct}%</div>
        <div class="profile-lang-bar"><div style="width:${l.pct}%;"></div></div>
      </div>
    </div>
  `).join('');

  const badgesHTML = featured.length ? featured.map(b => `
    <div class="profile-badge" title="${b.name}">${b.icon}</div>
  `).join('') : `<p class="profile-empty-note">Nenhuma conquista ainda — sua primeira lição já desbloqueia uma.</p>`;

  wrap.innerHTML = `
    ${guestNote}
    <div class="profile-identity">
      <div class="profile-avatar" style="background:${color};">${initials}</div>
      <div class="profile-name">${name}</div>
      ${profile ? `<div class="profile-username">@${profile.username}</div>` : ''}
      ${bio ? `<p class="profile-bio">${escapeHTML(bio)}</p>` : ''}
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
  document.getElementById('profile-edit-btn')?.addEventListener('click', openEditProfileModal);
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

function openEditProfileModal(){
  const modal = document.getElementById('profile-edit-modal');
  const p = PROFILE_CACHE;
  document.getElementById('profile-edit-display-name').value = p?.display_name || '';
  document.getElementById('profile-edit-username').value = p?.username || '';
  document.getElementById('profile-edit-bio').value = p?.bio || '';
  document.getElementById('profile-edit-bio-count').textContent = `${(p?.bio || '').length}/160`;
  document.getElementById('profile-edit-error').textContent = '';
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
