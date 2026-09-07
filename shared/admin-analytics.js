// ---------- Painel de Admin: Analytics (Product + Learning Analytics) ----------
// Segunda seção do Painel de Admin (a primeira é Badges, em
// shared/admin-badges.js -- este arquivo cuida da troca entre as duas
// seções e de todo o dashboard de Analytics). Lê `usage_events` (migration
// 007+008), alimentada por shared/analytics.js:trackEvent(). Tela só
// visível/alcançável pra conta da autora (isAdminUser) -- e mesmo que
// alguém force a navegação até aqui, a política de SELECT de usage_events
// já restringe a leitura ao e-mail da autora (ver
// 007_create_usage_events_table.sql), então o pior que acontece é a tela
// ficar vazia.
//
// SEMPRE filtra actor_type='student' (ver migration 008 e trackEvent()):
// atividade da própria autora nunca aparece nestas métricas, por padrão
// nem chega a ser gravada -- ver o toggle "Excluir minha atividade dos
// Analytics" logo no topo da seção.
//
// Fase 2 (Product + Learning Analytics, V1): Resumo, Atividade, Navegação
// (áreas x funcionalidades), Exercícios (iniciados/concluídos/conclusão/
// nota) e segmentação por idioma -- tudo sobre uma janela fixa de 30 dias
// (ainda sem seletor de período -- isso é uma etapa futura). Cada consulta
// é refeita quando o filtro de idioma muda; não há paginação/cache além do
// teto de linhas por consulta.
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - languages/index.js        (AVAILABLE_LANGUAGES, pra nomear/segmentar idiomas)
//   - languages/<lang>/app.js   (isAdminUser, UNITS -- só do idioma deste app)
//   - shared/profile.js         (PROFILE_CACHE, ensureProfileLoaded, setExcludeOwnActivity)
//   - shared/toast.js           (showToast)

const ADMIN_PANEL_STATE = { section: 'badges' };
const ANALYTICS_STATE = { languageFilter: 'all' };
const ANALYTICS_WINDOW_DAYS = 30;

// ---------- Taxonomia de eventos (rótulos amigáveis + o que cada um é) ----------
// Áreas = abas de topo (tab_switch) -- a "casa" de cada funcionalidade.
const ANALYTICS_TAB_LABELS = {
  path: '🗺️ Trilha',
  review: '🔁 Revisão',
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

// Funcionalidades = os tipos de exercício/lição de fato (lesson_start/
// lesson_complete) -- o que a pessoa efetivamente FAZ dentro de uma área,
// não a área em si.
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

// Nem todo tipo tem um evento de INÍCIO (lesson_start) ainda -- só onde
// existe um ponto de entrada único e inequívoco no código (ver
// languages/<lang>/app.js: startReviewSession/startSpeedReview/
// startMatchGame/startHanziReviewSession/openHanziLesson/
// openDictationPlayer/o botão "Começar" da Conjugação). vocab_lesson e
// unit_checkpoint (motor de lição Model B, com fases bridge/intro/
// checkpoint/practice) e challenge (concluído como efeito colateral de
// outra ação, nunca "iniciado" de propósito) ficam de fora por ora --
// documentado como limitação, não aproximado.
const ANALYTICS_STARTABLE_EVENT_NAMES = new Set([
  'flashcard_review', 'speed_review', 'match_game',
  'hanzi_review', 'hanzi_lesson', 'dictation', 'conjugation_session',
]);

// Nem todo tipo de conclusão carrega uma nota/precisão no meta -- só estes
// quatro (nome do campo varia: scorePct em vocab_lesson/unit_checkpoint,
// score em dictation, pct em conjugation_session -- todos já 0-100).
// speed_review tem "score" também, mas é pontuação do jogo, não um
// percentual de acerto -- não entra aqui pra não virar comparação
// enganosa. flashcard_review/match_game/hanzi_review/hanzi_lesson/
// challenge não têm nenhum conceito de "nota" (SRS bom/ruim, sempre
// termina 100% pareado, ou pass/fail sem nota parcial).
const ANALYTICS_SCORE_FIELD_BY_EVENT_NAME = {
  vocab_lesson: 'scorePct',
  unit_checkpoint: 'scorePct',
  dictation: 'score',
  conjugation_session: 'pct',
};

function analyticsWindowSinceIso(){
  return new Date(Date.now() - ANALYTICS_WINDOW_DAYS * 86400000).toISOString();
}

function analyticsDayKey(iso){
  return (iso || '').slice(0, 10); // "2026-09-07T..." -> "2026-09-07"
}

// ---------- Consultas ----------
// Sem paginação por enquanto (mesma lógica de fetchAllGrantsWithUsernames
// em admin-badges.js), com um teto de segurança -- mas o limite real do
// "quanto tempo olhamos" é a janela de 30 dias (gte created_at), não o
// teto de linhas: assim todo dia dentro da janela fica completo, em vez
// de truncar no meio de um dia se o teto de linhas fosse o único corte.
async function fetchUsageEventsForWindow(){
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, language_app_key, event_type, event_name, meta, created_at, session_id')
    .eq('actor_type', 'student')
    .gte('created_at', analyticsWindowSinceIso())
    .order('created_at', { ascending: false })
    .limit(5000);
  if (ANALYTICS_STATE.languageFilter !== 'all'){
    q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  }
  const { data, error } = await q;
  if (error){ console.error('Erro ao carregar métricas de uso:', error); return []; }
  return data || [];
}

// profiles tem leitura pública (ver 001_create_profiles_table.sql) -- não
// precisa de nenhuma policy nova pra isto. Usado tanto pra "novos alunos"
// (todo mundo criado na janela) quanto pra separar, dentro de quem esteve
// ativo, quem é novo de quem é recorrente.
async function fetchNewProfilesInWindow(){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, created_at')
    .gte('created_at', analyticsWindowSinceIso())
    .neq('user_id', CURRENT_USER.id); // nunca conta a própria conta admin
  if (error){ console.error('Erro ao carregar novos perfis:', error); return []; }
  return data || [];
}

async function fetchProfilesByUserIds(userIds){
  if (!userIds.length) return [];
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, created_at')
    .in('user_id', userIds);
  if (error){ console.error('Erro ao carregar perfis:', error); return []; }
  return data || [];
}

// ---------- Agregação ----------
function analyticsScoreFor(ev){
  const field = ANALYTICS_SCORE_FIELD_BY_EVENT_NAME[ev.event_name];
  const val = field ? ev.meta?.[field] : undefined;
  return typeof val === 'number' ? val : null;
}

// unitId -> nível (content.js UNITS), só funciona pros eventos do MESMO
// idioma do app de onde o Painel de Admin está sendo visto -- cada site só
// carrega o content.js do seu próprio idioma (ver comentário no topo do
// arquivo). Eventos de outro idioma ficam em "nível desconhecido" aqui;
// documentado como limitação, não é um bug de agregação.
function analyticsUnitLevel(ev){
  if (typeof APP_KEY === 'undefined' || ev.language_app_key !== APP_KEY) return null;
  const unitId = ev.meta?.unitId;
  if (!unitId || typeof UNITS === 'undefined') return null;
  return UNITS.find(u => u.id === unitId)?.level || null;
}

function computeAnalytics(events, newProfiles, activeProfiles){
  const byId = Object.fromEntries(activeProfiles.map(p => [p.user_id, p]));
  const sinceIso = analyticsWindowSinceIso();

  const activeUserIds = new Set(events.map(e => e.user_id));
  const sessionIds = new Set(events.filter(e => e.session_id).map(e => e.session_id));

  const newActiveCount = [...activeUserIds].filter(id => byId[id] && byId[id].created_at >= sinceIso).length;
  const returningActiveCount = activeUserIds.size - newActiveCount;

  // ---- Exercícios: iniciados/concluídos por tipo ----
  const startCounts = {};
  const completeCounts = {};
  const completeUsersByName = {};
  const scoreByName = {};
  events.forEach(e => {
    if (e.event_type === 'lesson_start'){
      startCounts[e.event_name] = (startCounts[e.event_name] || 0) + 1;
    } else if (e.event_type === 'lesson_complete'){
      completeCounts[e.event_name] = (completeCounts[e.event_name] || 0) + 1;
      (completeUsersByName[e.event_name] ||= new Set()).add(e.user_id);
      const score = analyticsScoreFor(e);
      if (score !== null){
        (scoreByName[e.event_name] ||= { sum: 0, count: 0 }).sum += score;
        scoreByName[e.event_name].count += 1;
      }
    }
  });
  const allExerciseNames = new Set([...Object.keys(startCounts), ...Object.keys(completeCounts)]);
  const exerciseRows = [...allExerciseNames].map(name => {
    const started = startCounts[name] || 0;
    const completed = completeCounts[name] || 0;
    const trackable = ANALYTICS_STARTABLE_EVENT_NAMES.has(name);
    const completionRate = (trackable && started > 0) ? Math.min(100, Math.round((completed / started) * 100)) : null;
    const score = scoreByName[name];
    return {
      name,
      started: trackable ? started : null,
      completed,
      uniqueStudents: completeUsersByName[name]?.size || 0,
      completionRate,
      avgScore: score ? Math.round(score.sum / score.count) : null,
    };
  }).sort((a, b) => b.completed - a.completed);

  // Taxa de conclusão GERAL: só soma iniciados/concluídos dos tipos com
  // evento de início (ver ANALYTICS_STARTABLE_EVENT_NAMES) -- misturar com
  // os tipos sem "iniciado" tornaria a razão sem sentido (numerador de um
  // conjunto, denominador de outro).
  const trackableStarted = [...ANALYTICS_STARTABLE_EVENT_NAMES].reduce((sum, n) => sum + (startCounts[n] || 0), 0);
  const trackableCompleted = [...ANALYTICS_STARTABLE_EVENT_NAMES].reduce((sum, n) => sum + (completeCounts[n] || 0), 0);
  const overallCompletionRate = trackableStarted > 0 ? Math.min(100, Math.round((trackableCompleted / trackableStarted) * 100)) : null;

  // ---- Navegação: áreas (tab_switch) ----
  const areaCounts = {};
  const areaUsers = {};
  events.filter(e => e.event_type === 'tab_switch').forEach(e => {
    areaCounts[e.event_name] = (areaCounts[e.event_name] || 0) + 1;
    (areaUsers[e.event_name] ||= new Set()).add(e.user_id);
  });
  const areaRows = Object.entries(areaCounts)
    .map(([name, count]) => ({ name, count, uniqueStudents: areaUsers[name].size }))
    .sort((a, b) => b.count - a.count);

  // Funcionalidades: soma iniciados+concluídos por tipo (uso total), não
  // só concluídos -- reflete melhor "quanto essa ferramenta foi tocada".
  const featureRows = [...allExerciseNames]
    .map(name => ({
      name,
      count: (startCounts[name] || 0) + (completeCounts[name] || 0),
      uniqueStudents: completeUsersByName[name]?.size || 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ---- Atividade: ativos por dia, sessões por dia, frequência ----
  const activeByDay = {};
  const sessionsByDay = {};
  const daysByUser = {};
  events.forEach(e => {
    const day = analyticsDayKey(e.created_at);
    if (!day) return;
    (activeByDay[day] ||= new Set()).add(e.user_id);
    if (e.session_id) (sessionsByDay[day] ||= new Set()).add(e.session_id);
    (daysByUser[e.user_id] ||= new Set()).add(day);
  });
  const activeByDayRows = Object.entries(activeByDay)
    .map(([day, users]) => ({ day, count: users.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const sessionsByDayRows = Object.entries(sessionsByDay)
    .map(([day, sess]) => ({ day, count: sess.size }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Frequência de estudo: quantos DIAS distintos cada aluno esteve ativo
  // dentro da janela de 30 dias -- balde por contagem de dias, não uma
  // cadência "por semana" fabricada a partir de uma janela que não é uma
  // semana exata.
  const freqBuckets = [
    { label: '1 dia', min: 1, max: 1, count: 0 },
    { label: '2–4 dias', min: 2, max: 4, count: 0 },
    { label: '5–9 dias', min: 5, max: 9, count: 0 },
    { label: '10+ dias', min: 10, max: Infinity, count: 0 },
  ];
  Object.values(daysByUser).forEach(daysSet => {
    const n = daysSet.size;
    const bucket = freqBuckets.find(b => n >= b.min && n <= b.max);
    if (bucket) bucket.count += 1;
  });

  // ---- Sessões / tempo estimado ----
  const sessionSpans = {};
  events.forEach(e => {
    if (!e.session_id) return;
    const t = new Date(e.created_at).getTime();
    const cur = sessionSpans[e.session_id];
    if (!cur) sessionSpans[e.session_id] = { min: t, max: t };
    else { cur.min = Math.min(cur.min, t); cur.max = Math.max(cur.max, t); }
  });
  const spanMinutesList = Object.values(sessionSpans).map(s => (s.max - s.min) / 60000);
  const estimatedStudyMinutes = Math.round(spanMinutesList.reduce((a, b) => a + b, 0));

  // ---- Por idioma ----
  const byLanguageCounts = {};
  events.forEach(e => { byLanguageCounts[e.language_app_key] = (byLanguageCounts[e.language_app_key] || 0) + 1; });

  // ---- Progressão (estrutura inicial): alunos por nível ----
  // Só cobre unidades do idioma do app atual (ver analyticsUnitLevel) --
  // eventos de outro idioma caem em "nível desconhecido".
  const levelUsers = {};
  events.filter(e => e.event_type === 'lesson_complete').forEach(e => {
    const level = analyticsUnitLevel(e) || 'Nível desconhecido';
    (levelUsers[level] ||= new Set()).add(e.user_id);
  });
  const levelRows = Object.entries(levelUsers)
    .map(([level, users]) => ({ level, count: users.size }))
    .sort((a, b) => b.count - a.count);

  return {
    activeStudents: activeUserIds.size,
    newStudents: newProfiles.length,
    newActiveCount,
    returningActiveCount,
    sessions: sessionIds.size,
    exercisesStarted: trackableStarted,
    exercisesCompleted: Object.values(completeCounts).reduce((a, b) => a + b, 0),
    overallCompletionRate,
    estimatedStudyMinutes,
    exerciseRows,
    areaRows,
    featureRows,
    activeByDayRows,
    sessionsByDayRows,
    freqBuckets,
    byLanguageCounts,
    levelRows,
    totalEvents: events.length,
  };
}

// ---------- Render ----------
function analyticsKpiTileHTML(num, label, note){
  return `
    <div class="analytics-kpi-tile">
      <div class="analytics-kpi-num">${num}</div>
      <div class="analytics-kpi-label">${label}</div>
      ${note ? `<div class="analytics-kpi-note">${note}</div>` : ''}
    </div>
  `;
}

function analyticsBarRowsHTML(rows, labels, extraNote){
  const max = rows.length ? rows[0].count : 0;
  return rows.map(row => {
    const pct = max ? Math.round((row.count / max) * 100) : 0;
    const label = labels[row.name] || row.name;
    const usersNote = typeof row.uniqueStudents === 'number' ? ` · ${row.uniqueStudents} ${row.uniqueStudents === 1 ? 'aluno(a)' : 'alunos(as)'}` : '';
    return `
      <div class="analytics-bar-row">
        <div class="analytics-bar-top">
          <span class="analytics-bar-label">${label}</span>
          <span class="analytics-bar-count">${row.count}${usersNote}${extraNote ? extraNote(row) : ''}</span>
        </div>
        <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function analyticsFormatMinutes(mins){
  if (!mins) return '0min';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h ${m}min` : `${m}min`;
}

function analyticsLanguageSelectHTML(){
  const options = AVAILABLE_LANGUAGES.map(l =>
    `<option value="${l.appKey}" ${ANALYTICS_STATE.languageFilter === l.appKey ? 'selected' : ''}>${l.name}</option>`
  ).join('');
  return `
    <div class="profile-section">
      <label class="profile-edit-label" for="analytics-language-select">Idioma</label>
      <select id="analytics-language-select" class="profile-edit-input">
        <option value="all" ${ANALYTICS_STATE.languageFilter === 'all' ? 'selected' : ''}>Todos os idiomas</option>
        ${options}
      </select>
    </div>
  `;
}

function renderResumoSectionHTML(stats){
  const rateNote = stats.overallCompletionRate === null
    ? '<p class="admin-badge-desc">Taxa de conclusão indisponível: nenhum dos tipos com evento de início teve atividade na janela.</p>'
    : `<p class="admin-badge-desc">Calculada só sobre os tipos com evento de início (flashcards, revisão rápida, jogo da memória, hanzi, ditado, conjugação) -- ver seção Exercícios.</p>`;
  return `
    <div class="profile-section">
      <div class="section-label">Resumo · últimos ${ANALYTICS_WINDOW_DAYS} dias</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.activeStudents, 'Alunos ativos')}
        ${analyticsKpiTileHTML(stats.newStudents, 'Novos alunos')}
        ${analyticsKpiTileHTML(stats.sessions, 'Sessões')}
        ${analyticsKpiTileHTML(stats.exercisesStarted, 'Exercícios iniciados', 'só tipos com evento de início')}
        ${analyticsKpiTileHTML(stats.exercisesCompleted, 'Exercícios concluídos')}
        ${analyticsKpiTileHTML(stats.overallCompletionRate === null ? '—' : `${stats.overallCompletionRate}%`, 'Taxa de conclusão')}
        ${analyticsKpiTileHTML(analyticsFormatMinutes(stats.estimatedStudyMinutes), 'Tempo de estudo (estimado)', 'intervalo entre 1º e último evento de cada sessão')}
      </div>
      ${rateNote}
      <p class="admin-badge-desc">XP não é mostrado aqui ainda -- nenhum evento registra o XP ganho por ação (ver limitações no relatório da Fase 2).</p>
    </div>
  `;
}

function renderAtividadeSectionHTML(stats){
  const freqRows = stats.freqBuckets.map(b => ({ name: b.label, count: b.count }));
  return `
    <div class="profile-section">
      <div class="section-label">Atividade</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.newActiveCount, 'Novos (ativos na janela)')}
        ${analyticsKpiTileHTML(stats.returningActiveCount, 'Recorrentes')}
      </div>
      <p class="admin-badge-desc">"Novo" = conta criada dentro dos últimos ${ANALYTICS_WINDOW_DAYS} dias (via profiles.created_at); "recorrente" = já existia antes disso. Ver limitações sobre contas anteriores à criação automática de perfil.</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Alunos ativos por dia</div>
      ${stats.activeByDayRows.length ? analyticsBarRowsHTML(stats.activeByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
    </div>

    <div class="profile-section">
      <div class="section-label">Sessões por dia</div>
      ${stats.sessionsByDayRows.length ? analyticsBarRowsHTML(stats.sessionsByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
    </div>

    <div class="profile-section">
      <div class="section-label">Frequência de estudo (dias ativos em ${ANALYTICS_WINDOW_DAYS} dias)</div>
      ${freqRows.some(r => r.count) ? analyticsBarRowsHTML(freqRows, {}) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
    </div>
  `;
}

function renderNavegacaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">Áreas (abas)</div>
      ${stats.areaRows.length ? analyticsBarRowsHTML(stats.areaRows, ANALYTICS_TAB_LABELS) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
    </div>

    <div class="profile-section">
      <div class="section-label">Funcionalidades (tipos de exercício)</div>
      ${stats.featureRows.length ? analyticsBarRowsHTML(stats.featureRows, ANALYTICS_LESSON_EVENT_LABELS) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
      <p class="admin-badge-desc">Conta início + conclusão somados (uso total), não só conclusões.</p>
    </div>
  `;
}

function renderExerciciosSectionHTML(stats){
  const rows = stats.exerciseRows.map(r => {
    const label = ANALYTICS_LESSON_EVENT_LABELS[r.name] || r.name;
    return `
      <tr>
        <td>${label}</td>
        <td>${r.started === null ? '—' : r.started}</td>
        <td>${r.completed}</td>
        <td>${r.completionRate === null ? '—' : r.completionRate + '%'}</td>
        <td>${r.avgScore === null ? '—' : r.avgScore + '%'}</td>
      </tr>
    `;
  }).join('');
  return `
    <div class="profile-section">
      <div class="section-label">Exercícios por tipo</div>
      ${stats.exerciseRows.length ? `
        <div class="analytics-table-wrap">
          <table class="analytics-table">
            <thead><tr><th>Exercício</th><th>Iniciados</th><th>Concluídos</th><th>Conclusão</th><th>Nota média</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="admin-badge-desc">"—" = sem evento de início (vocab_lesson/unit_checkpoint/challenge) ou sem conceito de nota pra esse tipo. Popularidade (concluídos) e desempenho (nota média) são colunas separadas de propósito -- um exercício muito feito não é necessariamente um exercício com nota alta.</p>
      ` : '<p class="profile-empty-note">Sem dados na janela.</p>'}
    </div>
  `;
}

function renderIdiomaSectionHTML(stats){
  const langName = (appKey) => AVAILABLE_LANGUAGES.find(l => l.appKey === appKey)?.name || appKey;
  const rows = Object.entries(stats.byLanguageCounts)
    .map(([appKey, count]) => ({ name: appKey, count }))
    .sort((a, b) => b.count - a.count);
  if (!rows.length) return '';
  return `
    <div class="profile-section">
      <div class="section-label">Eventos por idioma</div>
      ${analyticsBarRowsHTML(rows, Object.fromEntries(AVAILABLE_LANGUAGES.map(l => [l.appKey, l.name])))}
    </div>
  `;
}

function renderProgressaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">Progressão · alunos por nível (estrutura inicial)</div>
      ${stats.levelRows.length ? analyticsBarRowsHTML(stats.levelRows, {}) : '<p class="profile-empty-note">Sem dados na janela.</p>'}
      <p class="admin-badge-desc">Só cobre unidades do idioma do app em que este Painel está aberto agora -- eventos do outro idioma caem em "Nível desconhecido" (cada site só carrega o conteúdo do próprio idioma). Streak/XP/avanço de nível ficam pra uma etapa futura.</p>
    </div>
  `;
}

// Toggle "Excluir minha atividade dos Analytics" -- ver comentário de
// trackEvent() em shared/analytics.js. Renderizado SEMPRE (mesmo sem
// nenhum evento ainda), porque é uma preferência de conta, não parte do
// relatório.
function analyticsExcludeOwnToggleHTML(excludeOwn){
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

function wireAnalyticsLanguageSelect(){
  const sel = document.getElementById('analytics-language-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    ANALYTICS_STATE.languageFilter = sel.value;
    renderAdminAnalyticsView();
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
  const toggleHTML = analyticsExcludeOwnToggleHTML(excludeOwn);
  const langSelectHTML = analyticsLanguageSelectHTML();

  const events = await fetchUsageEventsForWindow();
  if (!events.length){
    wrap.innerHTML = toggleHTML + langSelectHTML + `<p class="profile-empty-note">Nenhum evento de aluno registrado nos últimos ${ANALYTICS_WINDOW_DAYS} dias.</p>`;
    wireAnalyticsExcludeOwnToggle();
    wireAnalyticsLanguageSelect();
    return;
  }

  const activeUserIds = [...new Set(events.map(e => e.user_id))];
  const [newProfiles, activeProfiles] = await Promise.all([
    fetchNewProfilesInWindow(),
    fetchProfilesByUserIds(activeUserIds),
  ]);
  const stats = computeAnalytics(events, newProfiles, activeProfiles);

  wrap.innerHTML = toggleHTML + langSelectHTML
    + renderResumoSectionHTML(stats)
    + renderAtividadeSectionHTML(stats)
    + renderNavegacaoSectionHTML(stats)
    + renderExerciciosSectionHTML(stats)
    + (ANALYTICS_STATE.languageFilter === 'all' ? renderIdiomaSectionHTML(stats) : '')
    + renderProgressaoSectionHTML(stats);

  wireAnalyticsExcludeOwnToggle();
  wireAnalyticsLanguageSelect();
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
