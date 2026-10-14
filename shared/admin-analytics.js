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
// SEMPRE filtra actor_type IN ANALYTICS_STUDENT_ACTOR_TYPES ('user'+'student' legado) (ver migration 008 e trackEvent()):
// atividade da própria autora nunca aparece nestas métricas, por padrão
// nem chega a ser gravada -- ver o toggle "Excluir minha atividade dos
// Analytics" logo no topo da seção.
//
// Fase 3 (interface): filtro de período com 7 predefinições + período
// personalizado, comparação com o período anterior (mesma duração,
// deslocada pra trás -- vale pra qualquer preset, inclusive
// personalizado), e navegação interna por abas que só alterna visibilidade
// dos blocos já renderizados, sem refazer a consulta. Cada troca de
// período/idioma/dispositivo/comparação refaz a consulta principal;
// trocar de aba interna não (exceto as 3 abas "lazy" -- ver
// ANALYTICS_LAZY_TABS -- que buscam dados extra só na primeira vez que
// são abertas).
//
// Fase 4 (camadas avançadas): Retenção (coortes semanais, Dia 1/7/14/30),
// Funil (dentro de Exercícios: iniciou -> concluiu -> acertou bem),
// Progressão expandida (unidades/lições concluídas por aluno),
// Engajamento+Gamificação (uma aba só -- o prompt-mestre lista XP/streak
// nos dois grupos, juntar evita mostrar o mesmo número duas vezes),
// Dispositivos (mobile/tablet/desktop, navegador, SO -- migration 009) e
// Tecnologia (erros/performance, deliberadamente separada do Learning
// Analytics -- ver shared/analytics.js:trackTechnicalError()).
//
// Nenhuma agregação daqui muda a SEMÂNTICA dos eventos gravados nas fases
// anteriores -- são só leituras/somas diferentes sobre os mesmos
// event_type/event_name/meta já existentes.
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - languages/index.js        (AVAILABLE_LANGUAGES, pra nomear/segmentar idiomas)
//   - languages/<lang>/app.js   (isAdminUser, UNITS -- só do idioma deste app)
//   - shared/profile.js         (PROFILE_CACHE, ensureProfileLoaded, setExcludeOwnActivity)
//   - shared/toast.js           (showToast)

const ANALYTICS_STATE = {
  languageFilter: 'all',
  deviceFilter: 'all',    // 'mobile' | 'tablet' | 'desktop' | 'all'
  period: 'last30',       // uma chave de ANALYTICS_PERIOD_PRESETS, ou 'custom'
  customSince: '',        // "YYYY-MM-DD", só usado quando period === 'custom'
  customUntil: '',
  compare: false,
  tab: 'resumo',
};
// Guarda o resultado da consulta principal (período atual) pra abas que
// carregam sob demanda (ver ANALYTICS_LAZY_TABS) reaproveitarem sem
// refazer a mesma busca. Limpo a cada renderAdminAnalyticsView() novo.
const ANALYTICS_CURRENT = { stats: null, activeUserIds: [], sinceIso: null, untilIso: null };
const ANALYTICS_LAZY_CACHE = {};
// O Supabase devolve no máximo 1000 linhas por pedido, mesmo se a consulta pedir mais. Por isso as consultas buscam em páginas de 1000
// até acabar ou até o teto abaixo. Se bater no teto, os números dessa parte podem estar abaixo do real: a tela avisa (ANALYTICS_TRUNCATED)
// em vez de mostrar como se fosse completo.
const ANALYTICS_PAGE_SIZE = 1000;
const ANALYTICS_EVENT_LIMIT = 50000;
const ANALYTICS_TECH_LIMIT = 10000;

// make() devolve uma consulta nova a cada chamada (o construtor do Supabase não pode ser reaproveitado entre páginas).
async function analyticsFetchPaged(make, cap){
  const rows = [];
  while (rows.length < cap){
    const from = rows.length;
    const want = Math.min(ANALYTICS_PAGE_SIZE, cap - from);
    const { data, error } = await make().range(from, from + want - 1);
    if (error) return { data: rows, error, truncated: false };
    const page = data || [];
    rows.push(...page);
    if (page.length < want) return { data: rows, error: null, truncated: false };
  }
  return { data: rows, error: null, truncated: true };
}
const ANALYTICS_TRUNCATED = { main: false, retencao: false, tecnologia: false };







// Abas que fazem uma consulta EXTRA (além da já feita pra Resumo/
// Atividade/etc.) só quando abertas pela primeira vez -- evita pagar o
// custo de Retenção/Engajamento/Tecnologia em toda troca de filtro se a
// autora nunca chega a olhar essas abas. Cache limpo a cada novo período/
// idioma/dispositivo/comparação (início de renderAdminAnalyticsView()).
const ANALYTICS_LAZY_TABS = new Set(['retencao', 'engajamento', 'tecnologia']);




// Resolve o período selecionado (preset ou personalizado) em datas de
// verdade. Período personalizado sem as duas datas preenchidas cai de
// volta pro dia de hoje -- nunca manda uma consulta com bound inválido.
function analyticsResolvePeriod(){
  if (ANALYTICS_STATE.period === 'custom'){
    const since = ANALYTICS_STATE.customSince ? analyticsStartOfDay(new Date(ANALYTICS_STATE.customSince + 'T00:00:00')) : analyticsStartOfDay(new Date());
    const until = ANALYTICS_STATE.customUntil ? analyticsEndOfDay(new Date(ANALYTICS_STATE.customUntil + 'T00:00:00')) : analyticsEndOfDay(new Date());
    return until >= since ? { since, until } : { since: until, until: since };
  }
  const preset = ANALYTICS_PERIOD_PRESETS[ANALYTICS_STATE.period] || ANALYTICS_PERIOD_PRESETS.last30;
  return preset();
}





// ---------- Consultas ----------
// Sem paginação por enquanto (mesma lógica de fetchAllGrantsWithUsernames
// em admin-badges.js), com um teto de segurança -- mas o limite real do
// "quanto tempo olhamos" é o período selecionado (gte/lte created_at), não
// o teto de linhas: assim todo dia dentro do período fica completo, em vez
// de truncar no meio de um dia se o teto de linhas fosse o único corte.
async function fetchUsageEventsForWindow(sinceIso, untilIso){
  const make = () => {
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, language_app_key, event_type, event_name, meta, created_at, session_id, device_type, browser, os')
    .in('actor_type', ANALYTICS_STUDENT_ACTOR_TYPES)
    // technical_error/technical_perf são Technical Analytics, não Product/
    // Learning Analytics -- ficam de fora daqui pra não contaminar "Alunos
    // ativos", "Sessões", exercisesPerSession, etc. com eventos que não são
    // atividade de aprendizagem de verdade (ex: um page_load automático
    // não deveria contar como uma sessão de estudo). A própria aba
    // Tecnologia busca esses event_types separadamente, com sua própria
    // consulta (ver fetchTechnicalEventsForWindow).
    .neq('event_type', 'technical_error')
    .neq('event_type', 'technical_perf')
    .gte('created_at', sinceIso)
    .lte('created_at', untilIso)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (ANALYTICS_STATE.languageFilter !== 'all'){
    q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  }
  if (ANALYTICS_STATE.deviceFilter !== 'all'){
    q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  }
  return q;
};
  const { data, error, truncated } = await analyticsFetchPaged(make, ANALYTICS_EVENT_LIMIT);
  if (error){ console.error('Erro ao carregar métricas de uso:', error); return []; }
  ANALYTICS_TRUNCATED.main = truncated;
  return data || [];
}

// profiles tem leitura pública (ver 001_create_profiles_table.sql) -- não
// precisa de nenhuma policy nova pra isto. Usado tanto pra "novos alunos"
// (todo mundo criado no período) quanto pra separar, dentro de quem esteve
// ativo, quem é novo de quem é recorrente.
async function fetchNewProfilesInWindow(sinceIso, untilIso){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, created_at')
    .gte('created_at', sinceIso)
    .lte('created_at', untilIso)
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

// Busca tudo que uma "rodada" de estatísticas precisa (eventos + perfis)
// pra um intervalo [since, until] já resolvido. Devolve activeUserIds
// junto (não só as stats agregadas) pra quem chamar poder reaproveitar a
// lista de alunos ativos sem precisar refazer a mesma consulta (ver
// ANALYTICS_CURRENT em renderAdminAnalyticsView).
async function analyticsFetchStatsInput(since, until){
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();
  const events = await fetchUsageEventsForWindow(sinceIso, untilIso);
  const activeUserIds = [...new Set(events.map(e => e.user_id))];
  const [newProfiles, activeProfiles] = await Promise.all([
    fetchNewProfilesInWindow(sinceIso, untilIso),
    fetchProfilesByUserIds(activeUserIds),
  ]);
  const stats = computeAnalytics(events, newProfiles, activeProfiles, sinceIso);
  return { stats, activeUserIds };
}



async function fetchAllStudentProfilesForRetention(){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('user_id, created_at')
    .neq('user_id', CURRENT_USER.id)
    .order('created_at', { ascending: true });
  if (error){ console.error('Erro ao carregar perfis para retenção:', error); return []; }
  return data || [];
}

async function fetchAllStudentEventsForRetention(){
  const make = () => {
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, created_at')
    .in('actor_type', ANALYTICS_STUDENT_ACTOR_TYPES)
    // Mesma exclusão de fetchUsageEventsForWindow: "retornou" precisa
    // significar atividade de aprendizagem de verdade, não só um
    // page_load automático ou um erro técnico -- senão a definição de
    // retenção fica inconsistente com a de "Alunos ativos" no Resumo.
    .neq('event_type', 'technical_error')
    .neq('event_type', 'technical_perf')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (ANALYTICS_STATE.languageFilter !== 'all') q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  if (ANALYTICS_STATE.deviceFilter !== 'all') q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  return q;
};
  const { data, error, truncated } = await analyticsFetchPaged(make, ANALYTICS_EVENT_LIMIT);
  if (error){ console.error('Erro ao carregar eventos para retenção:', error); return []; }
  ANALYTICS_TRUNCATED.retencao = truncated;
  return data || [];
}



async function fetchWeeklyXpForUsers(userIds){
  if (!userIds.length) return [];
  let q = supabaseClient
    .from('weekly_xp')
    .select('user_id, amount, language_app_key')
    .eq('week_start', analyticsCurrentWeekStart())
    .in('user_id', userIds);
  if (ANALYTICS_STATE.languageFilter !== 'all') q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  const { data, error } = await q;
  if (error){ console.error('Erro ao carregar XP semanal:', error); return []; }
  return data || [];
}

// badge_grants também é de leitura pública (ver 002_create_badge_grants_table.sql)
async function fetchBadgeGrantsInWindow(sinceIso, untilIso){
  const { data, error } = await supabaseClient
    .from('badge_grants')
    .select('user_id, badge_id, granted_at')
    .gte('granted_at', sinceIso)
    .lte('granted_at', untilIso);
  if (error){ console.error('Erro ao carregar badges concedidos:', error); return []; }
  return data || [];
}

// ---------- Technical Analytics (Fase 4, item 7) ----------
// Conceitualmente separado do Learning/Product Analytics: consulta
// PRÓPRIA, filtrando só event_type IN ('technical_error','technical_perf')
// -- nunca misturada com lesson_complete/tab_switch na mesma agregação.
// Mesmo actor_type (user/student) (a atividade de teste da autora tampouco
// deve contar como "alunos tendo problemas técnicos").
async function fetchTechnicalEventsForWindow(sinceIso, untilIso){
  const make = () => {
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, event_type, event_name, meta, created_at')
    .in('actor_type', ANALYTICS_STUDENT_ACTOR_TYPES)
    .in('event_type', ['technical_error', 'technical_perf'])
    .gte('created_at', sinceIso)
    .lte('created_at', untilIso)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (ANALYTICS_STATE.languageFilter !== 'all') q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  if (ANALYTICS_STATE.deviceFilter !== 'all') q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  return q;
};
  const { data, error, truncated } = await analyticsFetchPaged(make, ANALYTICS_TECH_LIMIT);
  if (error){ console.error('Erro ao carregar eventos técnicos:', error); return []; }
  ANALYTICS_TRUNCATED.tecnologia = truncated;
  return data || [];
}

// ---------- Tela: sub-abas, filtros e orquestração ----------
// O HTML vem de shared/admin-analytics-ui.js (peças puras). Aqui ficam o estado, a busca de dados e os eventos.
// Trocar período, idioma, dispositivo ou comparação busca tudo de novo (como antes); trocar de sub-aba só mostra/esconde, e as três
// que fazem consulta extra (ANALYTICS_LAZY_TABS) buscam na primeira vez que são abertas.
function analyticsWrap(){ return document.getElementById('admin-analytics-content'); }

function analyticsControlsState(since, until){
  const S = ANALYTICS_STATE;
  return { period: S.period, languageFilter: S.languageFilter, deviceFilter: S.deviceFilter, compare: S.compare, customSince: S.customSince, customUntil: S.customUntil, since, until, previous: analyticsPreviousPeriod(since, until) };
}

async function switchAnalyticsTab(tab){
  ANALYTICS_STATE.tab = tab;
  document.querySelectorAll('[data-analytics-tab]').forEach(a => {
    const active = a.dataset.analyticsTab === tab;
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    a.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-analytics-panel]').forEach(panel => { panel.style.display = panel.dataset.analyticsPanel === tab ? '' : 'none'; });

  if (!ANALYTICS_LAZY_TABS.has(tab) || ANALYTICS_LAZY_CACHE[tab]) return;
  const panel = document.querySelector(`[data-analytics-panel="${tab}"]`);
  if (!panel) return;
  panel.innerHTML = tanPanelLoadingHTML();
  const token = ANALYTICS_VIEW.token;
  let html = '';
  if (tab === 'retencao'){
    const [profiles, events] = await Promise.all([fetchAllStudentProfilesForRetention(), fetchAllStudentEventsForRetention()]);
    ANALYTICS_LAZY_CACHE.retencao = computeRetentionCohorts(profiles, events);
    html = (ANALYTICS_TRUNCATED.retencao ? tanTruncatedHTML('analytics.truncated.retention', ANALYTICS_EVENT_LIMIT) : '') + tanRetencaoHTML(ANALYTICS_LAZY_CACHE.retencao);
  } else if (tab === 'engajamento'){
    const [weeklyXp, badgeGrants] = await Promise.all([
      fetchWeeklyXpForUsers(ANALYTICS_CURRENT.activeUserIds),
      fetchBadgeGrantsInWindow(ANALYTICS_CURRENT.sinceIso, ANALYTICS_CURRENT.untilIso),
    ]);
    ANALYTICS_LAZY_CACHE.engajamento = { weeklyXp, badgeGrants };
    html = tanEngajamentoHTML(ANALYTICS_CURRENT.stats, weeklyXp, badgeGrants);
  } else if (tab === 'tecnologia'){
    const events = await fetchTechnicalEventsForWindow(ANALYTICS_CURRENT.sinceIso, ANALYTICS_CURRENT.untilIso);
    ANALYTICS_LAZY_CACHE.tecnologia = computeTechnicalStats(events);
    html = (ANALYTICS_TRUNCATED.tecnologia ? tanTruncatedHTML('analytics.truncated.tech', ANALYTICS_TECH_LIMIT) : '') + tanTecnologiaHTML(ANALYTICS_LAZY_CACHE.tecnologia);
  }
  if (token === ANALYTICS_VIEW.token) panel.innerHTML = html;   // a tela pode ter sido refeita (filtro novo) enquanto buscava
}

const ANALYTICS_VIEW = { token: 0, ligado: false };

async function renderAdminAnalyticsView(){
  const wrap = analyticsWrap();
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  analyticsBind(wrap);
  const token = ++ANALYTICS_VIEW.token;
  wrap.innerHTML = tanLoadingHTML();

  const profile = await ensureProfileLoaded();
  const excludeOwn = profile ? profile.exclude_own_activity !== false : true;
  const { since, until } = analyticsResolvePeriod();
  ANALYTICS_TRUNCATED.main = false; ANALYTICS_TRUNCATED.retencao = false; ANALYTICS_TRUNCATED.tecnologia = false;

  const { stats, activeUserIds } = await analyticsFetchStatsInput(since, until);
  let prevStats = null;
  if (ANALYTICS_STATE.compare){
    const prev = analyticsPreviousPeriod(since, until);
    prevStats = (await analyticsFetchStatsInput(prev.since, prev.until)).stats;
  }
  if (token !== ANALYTICS_VIEW.token) return;

  // Guardado para as sub-abas de carregamento sob demanda reaproveitarem sem refazer a consulta principal. O cache delas é
  // limpo aqui: período, idioma, dispositivo ou comparação mudaram, então o que estava guardado não vale mais.
  ANALYTICS_CURRENT.stats = stats;
  ANALYTICS_CURRENT.activeUserIds = activeUserIds;
  ANALYTICS_CURRENT.sinceIso = since.toISOString();
  ANALYTICS_CURRENT.untilIso = until.toISOString();
  Object.keys(ANALYTICS_LAZY_CACHE).forEach(k => delete ANALYTICS_LAZY_CACHE[k]);

  wrap.innerHTML = tanPageHTML({ controls: analyticsControlsState(since, until), excludeOwn, tab: ANALYTICS_STATE.tab, stats, prevStats,
    truncated: ANALYTICS_TRUNCATED.main, limit: ANALYTICS_EVENT_LIMIT, emptyEvents: stats.totalEvents === 0 });
  await switchAnalyticsTab(ANALYTICS_STATE.tab);
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function analyticsBind(wrap){
  if (ANALYTICS_VIEW.ligado) return;
  ANALYTICS_VIEW.ligado = true;
  const S = ANALYTICS_STATE;
  wrap.addEventListener('click', (e) => {
    const a = e.target.closest('[data-analytics-tab]');
    if (a){ e.preventDefault(); switchAnalyticsTab(a.dataset.analyticsTab); }
  });
  wrap.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'analytics-period-select'){ S.period = el.value; renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-language-select'){ S.languageFilter = el.value; renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-device-select'){ S.deviceFilter = el.value; renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-custom-since'){ S.customSince = el.value; renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-custom-until'){ S.customUntil = el.value; renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-compare-switch'){ S.compare = el.checked; el.setAttribute('aria-checked', String(el.checked)); renderAdminAnalyticsView(); }
    else if (el.id === 'analytics-exclude-own-switch'){
      // Excluir minha atividade dos Analytics: preferência de conta (ver trackEvent() em shared/analytics.js), não parte do relatório.
      const next = el.checked;
      el.setAttribute('aria-checked', String(next));
      const ok = await setExcludeOwnActivity(next);
      if (!ok){ el.checked = !next; el.setAttribute('aria-checked', String(!next)); return; }
      showToast(next ? t('admin.analytics.exclude.toastOn') : t('admin.analytics.exclude.toastOff'));
    }
  });
}
