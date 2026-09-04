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
//   - shared/profile.js         (avatarInitials, avatarColor, escapeHTML)

const LEADERBOARD_TOP_N = 50;
let LEADERBOARD_SCOPE = 'all'; // 'all' ou o appKey de um idioma específico

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

function leaderboardWeekLabel(weekStart){
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return `Semana de ${fmt(start)} a ${fmt(end)}`;
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

  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('user_id, username, display_name, avatar_url')
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

async function renderLeaderboardView(){
  const wrap = document.getElementById('leaderboard-content');
  if (!wrap) return;
  wrap.innerHTML = `<p class="profile-loading">Carregando ranking...</p>`;

  const weekStart = leaderboardCurrentWeekStart();
  const scope = LEADERBOARD_SCOPE;
  const rows = await fetchLeaderboard(scope, weekStart);

  const scopeTabsHTML = [
    { key: 'all', label: 'Geral' },
    ...AVAILABLE_LANGUAGES.filter(l => l.enabled).map(l => ({ key: l.appKey, label: l.name })),
  ].map(t => `<button class="leaderboard-tab ${t.key === scope ? 'active' : ''}" data-scope="${t.key}">${t.label}</button>`).join('');

  const rowsHTML = rows.length ? rows.map(r => {
    const isMe = !!(CURRENT_USER && r.user_id === CURRENT_USER.id);
    const name = r.profile?.display_name || (r.profile ? `@${r.profile.username}` : 'Aluno(a)');
    const initials = avatarInitials(name);
    const color = avatarColor(r.user_id);
    const avatarHTML = r.profile?.avatar_url
      ? `<img class="leaderboard-avatar" src="${r.profile.avatar_url}" alt="">`
      : `<div class="leaderboard-avatar" style="background:${color};">${initials}</div>`;
    return `
      <div class="leaderboard-row ${isMe ? 'me' : ''}">
        <div class="leaderboard-rank">${leaderboardRankBadge(r.rank)}</div>
        ${avatarHTML}
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapeHTML(name)}${isMe ? ' (você)' : ''}</div>
          ${r.profile?.username ? `<div class="leaderboard-username">@${r.profile.username}</div>` : ''}
        </div>
        <div class="leaderboard-xp">⚡ ${r.amount}</div>
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">Ninguém pontuou nessa categoria ainda essa semana. Seja a primeira pessoa no ranking!</p>`;

  wrap.innerHTML = `
    <div class="leaderboard-week-label">${leaderboardWeekLabel(weekStart)}</div>
    <div class="leaderboard-tabs">${scopeTabsHTML}</div>
    <div class="leaderboard-list">${rowsHTML}</div>
    <p class="leaderboard-footnote">O ranking reinicia toda segunda-feira. Só aparece quem já ganhou XP essa semana.</p>
  `;

  wrap.querySelectorAll('[data-scope]').forEach(btn => {
    btn.addEventListener('click', () => {
      LEADERBOARD_SCOPE = btn.dataset.scope;
      renderLeaderboardView();
    });
  });
}
