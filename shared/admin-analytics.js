// ---------- Painel de Admin: Analytics (métricas de uso) ----------
// Segunda seção do Painel de Admin (a primeira é Badges, em
// shared/admin-badges.js -- este arquivo cuida só da troca entre as duas
// seções e do dashboard de Analytics). Lê `usage_events` (migration
// 007+008), alimentada por shared/analytics.js:trackEvent() a cada troca
// de aba e conclusão de exercício. Tela só visível/alcançável pra conta da
// autora (isAdminUser) -- e mesmo que alguém force a navegação até aqui, a
// política de SELECT de usage_events já restringe a leitura ao e-mail da
// autora (ver 007_create_usage_events_table.sql), então o pior que
// acontece é a tela ficar vazia.
//
// SEMPRE filtra actor_type='student' (ver migration 008 e trackEvent()):
// atividade da própria autora nunca aparece nestas métricas, por padrão
// nem chega a ser gravada -- ver o toggle "Excluir minha atividade dos
// Analytics" logo abaixo, que é o único jeito de mudar isso.
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - languages/index.js        (AVAILABLE_LANGUAGES, pra nomear os idiomas)
//   - languages/<lang>/app.js   (isAdminUser)
//   - shared/profile.js         (PROFILE_CACHE, ensureProfileLoaded, setExcludeOwnActivity)
//   - shared/toast.js           (showToast)

const ADMIN_PANEL_STATE = { section: 'badges' };

const ANALYTICS_TAB_LABELS = {
  path: '🗺️ Trilha',
  review: '🔁 Revisão (flashcards)',
  conjugaison: '📝 Conjugação',
  dictation: '🎧 Ditados',
  challenges: '🎯 Desafios',
  hanzi: '汉 Hanzi',
  leaderboard: '🏆 Ranking',
  profile: '👤 Meu perfil',
  progress: '📈 Progresso',
  settings: '⚙️ Configurações',
  'admin-badges': '🛠️ Painel de admin',
};

const ANALYTICS_LESSON_EVENT_LABELS = {
  vocab_lesson: '📘 Lição de vocabulário',
  unit_checkpoint: '✅ Checkpoint de unidade',
  flashcard_review: '🔁 Sessão de flashcards',
  speed_review: '⚡ Revisão rápida',
  match_game: '🧩 Jogo da memória',
  hanzi_lesson: '汉 Lição de hanzi',
  hanzi_review: '汉 Revisão de hanzi',
  dictation: '🎧 Ditado',
  conjugation_session: '📝 Sessão de conjugação',
  challenge: '🎯 Desafio concluído',
};

// Sem paginação por enquanto (mesma lógica de fetchAllGrantsWithUsernames em
// admin-badges.js), mas com um teto -- ao contrário de badges/concessões,
// usage_events cresce a cada troca de aba, então limitamos aos 5000 eventos
// mais recentes pra manter a agregação rápida no navegador.
async function fetchUsageEvents(){
  const { data, error } = await supabaseClient
    .from('usage_events')
    .select('user_id, language_app_key, event_type, event_name, meta, created_at')
    .eq('actor_type', 'student')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error){ console.error('Erro ao carregar métricas de uso:', error); return []; }
  return data || [];
}

function aggregateUsageEvents(events){
  const totalEvents = events.length;
  const uniqueUsers = new Set(events.map(e => e.user_id)).size;
  const dates = events.map(e => e.created_at).filter(Boolean).sort();
  const oldest = dates[0] || null;
  const newest = dates[dates.length - 1] || null;

  const byLanguage = {};
  events.forEach(e => { byLanguage[e.language_app_key] = (byLanguage[e.language_app_key] || 0) + 1; });

  function groupBy(type){
    const counts = {};
    events.filter(e => e.event_type === type).forEach(e => {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  // Nota média por tipo de exercício, só pra event_names cujo meta costuma
  // trazer scorePct (vocab_lesson/unit_checkpoint) -- complementa a
  // contagem com "e como foi o desempenho", não só "quantas vezes".
  const avgScoreByName = {};
  events
    .filter(e => e.event_type === 'lesson_complete' && typeof e.meta?.scorePct === 'number')
    .forEach(e => {
      if (!avgScoreByName[e.event_name]) avgScoreByName[e.event_name] = { sum: 0, count: 0 };
      avgScoreByName[e.event_name].sum += e.meta.scorePct;
      avgScoreByName[e.event_name].count += 1;
    });

  return {
    totalEvents, uniqueUsers, oldest, newest, byLanguage, avgScoreByName,
    tabCounts: groupBy('tab_switch'),
    lessonCounts: groupBy('lesson_complete'),
  };
}

function analyticsBarRowsHTML(entries, labels, extraNote){
  const max = entries.length ? entries[0][1] : 0;
  return entries.map(([name, count]) => {
    const pct = max ? Math.round((count / max) * 100) : 0;
    const label = labels[name] || name;
    return `
      <div class="analytics-bar-row">
        <div class="analytics-bar-top">
          <span class="analytics-bar-label">${label}</span>
          <span class="analytics-bar-count">${count}${extraNote ? extraNote(name) : ''}</span>
        </div>
        <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

// Toggle "Excluir minha atividade dos Analytics" -- ver comentário de
// trackEvent() em shared/analytics.js. Renderizado SEMPRE (mesmo sem
// nenhum evento ainda), porque é uma preferência de conta, não parte do
// relatório.
function analyticsExcludeOwnTogglesHTML(excludeOwn){
  return `
    <div class="profile-section">
      <div class="pref-row">
        <div class="pref-row-text">
          <div class="pref-row-title">Excluir minha atividade dos Analytics</div>
          <div class="pref-row-sub">Sua navegação e lições como admin não entram nas métricas dos alunos. Desligue só se quiser gerar dados de teste de propósito, usando sua própria conta.</div>
        </div>
        <button class="pref-switch" id="analytics-exclude-own-switch" role="switch" aria-checked="${excludeOwn ? 'true' : 'false'}"><span class="pref-switch-knob"></span></button>
      </div>
    </div>
  `;
}

function wireAnalyticsExcludeOwnToggle(){
  const btn = document.getElementById('analytics-exclude-own-switch');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', next ? 'true' : 'false');
    const ok = await setExcludeOwnActivity(next);
    if (!ok){ btn.setAttribute('aria-checked', next ? 'false' : 'true'); return; }
    showToast(next
      ? '✓ Sua atividade não vai mais ser registrada no Analytics.'
      : '✓ Sua atividade passa a ser registrada no Analytics (marcada como admin).');
  });
}

async function renderAdminAnalyticsView(){
  const wrap = document.getElementById('admin-analytics-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = `<p class="profile-loading">Carregando...</p>`;

  const profile = await ensureProfileLoaded();
  const excludeOwn = profile ? profile.exclude_own_activity !== false : true;
  const toggleHTML = analyticsExcludeOwnTogglesHTML(excludeOwn);

  const events = await fetchUsageEvents();
  if (!events.length){
    wrap.innerHTML = toggleHTML + `<p class="profile-empty-note">Nenhum evento de uso registrado ainda.</p>`;
    wireAnalyticsExcludeOwnToggle();
    return;
  }

  const stats = aggregateUsageEvents(events);
  const langName = (appKey) => AVAILABLE_LANGUAGES.find(l => l.appKey === appKey)?.name || appKey;
  const scoreNote = (name) => {
    const s = stats.avgScoreByName[name];
    return s ? ` · média ${Math.round(s.sum / s.count)}%` : '';
  };

  const langRowsHTML = Object.entries(stats.byLanguage).sort((a, b) => b[1] - a[1]).map(([appKey, count]) => `
    <div class="analytics-bar-row">
      <div class="analytics-bar-top"><span class="analytics-bar-label">${langName(appKey)}</span><span class="analytics-bar-count">${count}</span></div>
    </div>
  `).join('');

  wrap.innerHTML = toggleHTML + `
    <div class="profile-section">
      <div class="section-label">Resumo</div>
      <div class="analytics-stat-row"><span class="analytics-stat-num">${stats.totalEvents}</span><span class="analytics-stat-label">eventos registrados${events.length === 5000 ? ' (últimos 5000)' : ''}</span></div>
      <div class="analytics-stat-row"><span class="analytics-stat-num">${stats.uniqueUsers}</span><span class="analytics-stat-label">${stats.uniqueUsers === 1 ? 'aluno(a) ativo(a)' : 'alunos(as) ativos(as)'}</span></div>
      ${stats.oldest ? `<p class="admin-badge-desc">Período: ${new Date(stats.oldest).toLocaleDateString('pt-BR')} até ${new Date(stats.newest).toLocaleDateString('pt-BR')}</p>` : ''}
    </div>

    <div class="profile-section">
      <div class="section-label">Abas mais navegadas</div>
      ${stats.tabCounts.length ? analyticsBarRowsHTML(stats.tabCounts, ANALYTICS_TAB_LABELS) : '<p class="profile-empty-note">Sem dados ainda.</p>'}
    </div>

    <div class="profile-section">
      <div class="section-label">Exercícios mais concluídos</div>
      ${stats.lessonCounts.length ? analyticsBarRowsHTML(stats.lessonCounts, ANALYTICS_LESSON_EVENT_LABELS, scoreNote) : '<p class="profile-empty-note">Sem dados ainda.</p>'}
    </div>

    <div class="profile-section">
      <div class="section-label">Por idioma</div>
      ${langRowsHTML}
    </div>
  `;
  wireAnalyticsExcludeOwnToggle();
}

// Alterna entre as duas seções do Painel de Admin (Badges/Analytics) --
// cada uma renderiza no seu próprio wrap (#admin-badges-content /
// #admin-analytics-content), só um fica visível por vez.
function switchAdminPanelSection(section){
  ADMIN_PANEL_STATE.section = section;
  document.querySelectorAll('[data-admin-section]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminSection === section));
  document.getElementById('admin-badges-content').style.display = section === 'badges' ? '' : 'none';
  document.getElementById('admin-analytics-content').style.display = section === 'analytics' ? '' : 'none';
  if (section === 'badges') renderAdminBadgesView();
  else renderAdminAnalyticsView();
}

// tabHandlers['admin-badges'] chama esta função (em vez de
// renderAdminBadgesView direto) pra sempre reabrir na seção que a autora
// deixou selecionada da última vez.
function renderAdminPanelView(){
  switchAdminPanelSection(ADMIN_PANEL_STATE.section);
}

function wireAdminPanelTabs(){
  document.querySelectorAll('[data-admin-section]').forEach(btn => {
    btn.addEventListener('click', () => switchAdminPanelSection(btn.dataset.adminSection));
  });
}
wireAdminPanelTabs();
