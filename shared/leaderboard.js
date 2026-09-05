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

function leaderboardRankBadge(rank){
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

// Resolve um featured_badge_id pro ícone+nome certos -- só procura em
// SPECIAL_BADGES (Fundadora/Beta Tester) e no catálogo criado pela admin
// (badge_catalog), NUNCA em BADGES (gameplay): esse conjunto é diferente
// por idioma, e featured_badge_id é um campo só, compartilhado entre fr/zh
// (ver o comentário de saveProfileEdits em shared/profile.js).
function resolveFeaturedBadge(badgeId, catalog){
  if (!badgeId) return null;
  const special = SPECIAL_BADGES.find(b => b.id === badgeId);
  if (special) return { icon: special.icon, name: special.name };
  const custom = (catalog || []).find(b => b.id === badgeId);
  if (custom) return { icon: custom.icon, name: custom.name };
  return null;
}

async function renderLeaderboardView(){
  const wrap = document.getElementById('leaderboard-content');
  if (!wrap) return;
  wrap.innerHTML = `<p class="profile-loading">Carregando ranking...</p>`;

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
      <div class="leaderboard-row ${isMe ? 'me' : ''}" role="listitem" aria-label="${escapeHTML(rowLabel)}">
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
}
