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

const ADMIN_PANEL_STATE = { section: 'badges' };
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

// ---------- Taxonomia de eventos (rótulos amigáveis + o que cada um é) ----------
// Áreas = abas de topo (tab_switch) -- a "casa" de cada funcionalidade.
const ANALYTICS_TAB_LABELS = {
  get path(){ return t('admin.analytics.tab.path'); },
  get review(){ return t('admin.analytics.tab.review'); },
  get conjugaison(){ return t('admin.analytics.tab.conjugaison'); },
  get dictation(){ return t('admin.analytics.tab.dictation'); },
  get challenges(){ return t('admin.analytics.tab.challenges'); },
  hanzi: '汉 Hanzi',
  get leaderboard(){ return t('admin.analytics.tab.leaderboard'); },
  get profile(){ return t('admin.analytics.tab.profile'); },
  get progress(){ return t('admin.analytics.tab.progress'); },
  get settings(){ return t('admin.analytics.tab.settings'); },
  get 'admin-badges'(){ return t('admin.analytics.tab.admin_badges'); },
};

// Funcionalidades = os tipos de exercício/lição de fato (lesson_start/
// lesson_complete) -- o que a pessoa efetivamente FAZ dentro de uma área,
// não a área em si.
const ANALYTICS_LESSON_EVENT_LABELS = {
  get vocab_lesson(){ return t('admin.analytics.lesson.vocab_lesson'); },
  get unit_checkpoint(){ return t('admin.analytics.lesson.unit_checkpoint'); },
  get flashcard_review(){ return t('admin.analytics.lesson.flashcard_review'); },
  get speed_review(){ return t('admin.analytics.lesson.speed_review'); },
  get match_game(){ return t('admin.analytics.lesson.match_game'); },
  get hanzi_lesson(){ return t('admin.analytics.lesson.hanzi_lesson'); },
  get hanzi_review(){ return t('admin.analytics.lesson.hanzi_review'); },
  get dictation(){ return t('admin.analytics.lesson.dictation'); },
  get conjugation_session(){ return t('admin.analytics.lesson.conjugation_session'); },
  get challenge(){ return t('admin.analytics.lesson.challenge'); },
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

const ANALYTICS_DEVICE_LABELS = {
  get mobile(){ return t('admin.analytics.device.mobile'); },
  tablet: '📟 Tablet',
  desktop: '🖥️ Desktop',
};

// Erros técnicos (ver shared/analytics.js:trackTechnicalError() e os
// pontos que chamam -- window.onerror/unhandledrejection globais,
// notifySaveFailure() em shared/auth.js, falhas de áudio em cada
// languages/<lang>/app.js:playPregeneratedAudio()). Não existe categoria
// de vídeo -- o app não tem conteúdo em vídeo, então "falhas de vídeo" do
// prompt-mestre não se aplica aqui (documentado, não fabricado).
const ANALYTICS_TECHNICAL_ERROR_LABELS = {
  get js_error(){ return t('admin.analytics.techErr.js_error'); },
  get unhandled_rejection(){ return t('admin.analytics.techErr.unhandled_rejection'); },
  get audio_load_failed(){ return t('admin.analytics.techErr.audio_load_failed'); },
  get audio_play_failed(){ return t('admin.analytics.techErr.audio_play_failed'); },
  get save_failed(){ return t('admin.analytics.techErr.save_failed'); },
};

// Abas que fazem uma consulta EXTRA (além da já feita pra Resumo/
// Atividade/etc.) só quando abertas pela primeira vez -- evita pagar o
// custo de Retenção/Engajamento/Tecnologia em toda troca de filtro se a
// autora nunca chega a olhar essas abas. Cache limpo a cada novo período/
// idioma/dispositivo/comparação (início de renderAdminAnalyticsView()).
const ANALYTICS_LAZY_TABS = new Set(['retencao', 'engajamento', 'tecnologia']);

// ---------- Período ----------
function analyticsStartOfDay(d){ const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function analyticsEndOfDay(d){ const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function analyticsDaysAgo(n){ return new Date(Date.now() - n * 86400000); }

const ANALYTICS_PERIOD_LABELS = {
  get today(){ return t('admin.analytics.period.today'); },
  get yesterday(){ return t('admin.analytics.period.yesterday'); },
  get last7(){ return t('admin.analytics.period.last7'); },
  get last30(){ return t('admin.analytics.period.last30'); },
  get thisMonth(){ return t('admin.analytics.period.thisMonth'); },
  get lastMonth(){ return t('admin.analytics.period.lastMonth'); },
  get last90(){ return t('admin.analytics.period.last90'); },
  get custom(){ return t('admin.analytics.period.custom'); },
};

const ANALYTICS_PERIOD_PRESETS = {
  today: () => ({ since: analyticsStartOfDay(new Date()), until: analyticsEndOfDay(new Date()) }),
  yesterday: () => { const y = analyticsDaysAgo(1); return { since: analyticsStartOfDay(y), until: analyticsEndOfDay(y) }; },
  last7: () => ({ since: analyticsStartOfDay(analyticsDaysAgo(6)), until: analyticsEndOfDay(new Date()) }),
  last30: () => ({ since: analyticsStartOfDay(analyticsDaysAgo(29)), until: analyticsEndOfDay(new Date()) }),
  thisMonth: () => { const n = new Date(); return { since: analyticsStartOfDay(new Date(n.getFullYear(), n.getMonth(), 1)), until: analyticsEndOfDay(n) }; },
  lastMonth: () => {
    const n = new Date();
    const since = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const until = new Date(n.getFullYear(), n.getMonth(), 0); // dia 0 do mês atual = último dia do mês anterior
    return { since: analyticsStartOfDay(since), until: analyticsEndOfDay(until) };
  },
  last90: () => ({ since: analyticsStartOfDay(analyticsDaysAgo(89)), until: analyticsEndOfDay(new Date()) }),
};

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

// Período anterior = mesma duração, imediatamente antes do período atual
// -- mesma regra pra todo preset (inclusive personalizado), consistente e
// previsível (ver Fase 3, item 2: "quando aplicável" -- aqui sempre é,
// dado que todo período tem uma duração bem definida).
function analyticsPreviousPeriod(since, until){
  const durationMs = until.getTime() - since.getTime();
  const prevUntil = new Date(since.getTime() - 1);
  const prevSince = new Date(prevUntil.getTime() - durationMs);
  return { since: prevSince, until: prevUntil };
}

function analyticsFormatDate(d){
  return fmtDate(d);
}

// K.0-A: valores de usage_events.actor_type que contam como atividade de
// aluno. 'user' é o valor atual (migration 044 renomeou 'student' -> 'user');
// 'student' é aceito de propósito por compatibilidade com clientes antigos /
// service worker em cache que ainda gravam o valor antigo. 'admin' fica de
// fora. Uma linha tem UM actor_type, então o IN nunca duplica evento.
const ANALYTICS_STUDENT_ACTOR_TYPES = ['user', 'student'];

function analyticsDayKey(iso){
  return (iso || '').slice(0, 10); // "2026-09-07T..." -> "2026-09-07"
}

// ---------- Consultas ----------
// Sem paginação por enquanto (mesma lógica de fetchAllGrantsWithUsernames
// em admin-badges.js), com um teto de segurança -- mas o limite real do
// "quanto tempo olhamos" é o período selecionado (gte/lte created_at), não
// o teto de linhas: assim todo dia dentro do período fica completo, em vez
// de truncar no meio de um dia se o teto de linhas fosse o único corte.
async function fetchUsageEventsForWindow(sinceIso, untilIso){
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
    .limit(5000);
  if (ANALYTICS_STATE.languageFilter !== 'all'){
    q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  }
  if (ANALYTICS_STATE.deviceFilter !== 'all'){
    q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  }
  const { data, error } = await q;
  if (error){ console.error('Erro ao carregar métricas de uso:', error); return []; }
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

// ---------- Retenção (Fase 4, item 1) ----------
// Coorte = alunos cuja conta (profiles.created_at) foi criada na mesma
// semana (segunda a domingo -- mesma fronteira de currentWeekStart() em
// cada app.js, replicada aqui pra não depender de um símbolo que só
// existe depois de app.js carregar). "Retornou no Dia N" = tem pelo menos
// um evento cujo dia civil é exatamente N dias corridos após a criação da
// conta. Só entra no denominador quem já tem N dias de conta -- uma
// coorte de 3 dias atrás não tem "Dia 30" ainda, e isso aparece como "—",
// nunca como 0%.
//
// Não respeita o filtro de PERÍODO (retenção é uma pergunta sobre todo o
// histórico, não uma janela) -- mas respeita idioma/dispositivo, e usa o
// mesmo teto de 5000 eventos das outras consultas. Documentado na própria
// aba: contas/atividade fora desse teto podem não aparecer certas nos
// números de Dia N mais distantes se a plataforma crescer muito.
const ANALYTICS_COHORT_OFFSETS = [1, 7, 14, 30];

function analyticsWeekStartKey(dateInput){
  const d = new Date(dateInput);
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
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
    .limit(5000);
  if (ANALYTICS_STATE.languageFilter !== 'all') q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  if (ANALYTICS_STATE.deviceFilter !== 'all') q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  const { data, error } = await q;
  if (error){ console.error('Erro ao carregar eventos para retenção:', error); return []; }
  return data || [];
}

function computeRetentionCohorts(profiles, events){
  const daysActiveByUser = {};
  events.forEach(e => {
    const day = analyticsDayKey(e.created_at);
    if (!day) return;
    (daysActiveByUser[e.user_id] ||= new Set()).add(day);
  });

  const cohortMembers = {};
  profiles.forEach(p => { (cohortMembers[analyticsWeekStartKey(p.created_at)] ||= []).push(p); });

  const now = Date.now();
  return Object.entries(cohortMembers)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, members]) => {
      const retention = {};
      ANALYTICS_COHORT_OFFSETS.forEach(offset => {
        let eligible = 0, returned = 0;
        members.forEach(p => {
          const signupTime = new Date(p.created_at).getTime();
          const targetTime = signupTime + offset * 86400000;
          if (targetTime > now) return; // coorte ainda não "completou" esse dia
          eligible += 1;
          const targetDay = analyticsDayKey(new Date(targetTime).toISOString());
          if (daysActiveByUser[p.user_id]?.has(targetDay)) returned += 1;
        });
        retention[offset] = eligible > 0 ? { pct: Math.round((returned / eligible) * 100), eligible, returned } : null;
      });
      return { week, size: members.length, retention };
    });
}

// ---------- Engajamento + Gamificação: XP/streak/conquistas ----------
// XP usa a MESMA definição já mostrada no Ranking (weekly_xp da semana
// corrente, ver shared/leaderboard.js e Fase "Leaderboard 9.x") -- não
// inventa uma segunda noção de "XP" divergente. weekly_xp já é de leitura
// pública (ver 006_create_weekly_xp_table.sql), nenhuma policy nova
// necessária. Streak "oficial" (com freeze days etc.) mora dentro de
// `progress`, que este painel não lê -- ver analyticsLongestStreak() pro
// proxy usado aqui.
function analyticsCurrentWeekStart(){
  const d = new Date();
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
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
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, event_type, event_name, meta, created_at')
    .in('actor_type', ANALYTICS_STUDENT_ACTOR_TYPES)
    .in('event_type', ['technical_error', 'technical_perf'])
    .gte('created_at', sinceIso)
    .lte('created_at', untilIso)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (ANALYTICS_STATE.languageFilter !== 'all') q = q.eq('language_app_key', ANALYTICS_STATE.languageFilter);
  if (ANALYTICS_STATE.deviceFilter !== 'all') q = q.eq('device_type', ANALYTICS_STATE.deviceFilter);
  const { data, error } = await q;
  if (error){ console.error('Erro ao carregar eventos técnicos:', error); return []; }
  return data || [];
}

function computeTechnicalStats(events){
  const errorCounts = {}, errorUsers = {};
  const perfSamples = [];
  events.forEach(e => {
    if (e.event_type === 'technical_error'){
      errorCounts[e.event_name] = (errorCounts[e.event_name] || 0) + 1;
      (errorUsers[e.event_name] ||= new Set()).add(e.user_id);
    } else if (e.event_type === 'technical_perf' && e.event_name === 'page_load' && typeof e.meta?.loadMs === 'number'){
      perfSamples.push(e.meta.loadMs);
    }
  });
  const errorRows = Object.entries(errorCounts)
    .map(([name, count]) => ({ name, count, uniqueStudents: errorUsers[name].size }))
    .sort((a, b) => b.count - a.count);
  perfSamples.sort((a, b) => a - b);
  const avgLoadMs = perfSamples.length ? Math.round(perfSamples.reduce((a, b) => a + b, 0) / perfSamples.length) : null;
  const medianLoadMs = perfSamples.length ? perfSamples[Math.floor(perfSamples.length / 2)] : null;
  return {
    errorRows,
    totalErrors: events.filter(e => e.event_type === 'technical_error').length,
    affectedStudents: new Set(events.filter(e => e.event_type === 'technical_error').map(e => e.user_id)).size,
    avgLoadMs,
    medianLoadMs,
    perfSampleCount: perfSamples.length,
  };
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

// Histograma genérico: pra cada userId em `userIds`, chama getValue(userId)
// e conta em qual balde cai. Reaproveitado por frequência de estudo,
// unidades concluídas e lições concluídas -- a MESMA função de
// "distribuir usuários em faixas", em vez de reescrever o loop 3 vezes
// (evita a duplicação que a revisão arquitetural da Fase 4 pediu pra
// caçar).
function analyticsBucketizeByUsers(userIds, bucketDefs, getValue){
  const buckets = bucketDefs.map(b => ({ ...b, count: 0 }));
  userIds.forEach(uid => {
    const n = getValue(uid);
    const bucket = buckets.find(b => n >= b.min && n <= b.max);
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

// Maior sequência de dias consecutivos com atividade, a partir do próprio
// conjunto de dias já calculado em daysByUser -- é uma APROXIMAÇÃO do
// streak que o app mostra (que tem regras próprias: freeze days, fuso
// específico etc., vivem em STATE.streak dentro de `progress`, que este
// painel não lê -- ver limitações). Serve como proxy honesto de
// engajamento sem duplicar a lógica de streak do app nem arriscar um
// número que pareça o streak "oficial" sem ser.
function analyticsLongestStreak(daySet){
  const days = [...daySet].sort();
  let longest = 0, current = 0, prevTime = null;
  days.forEach(d => {
    const t = new Date(d + 'T00:00:00Z').getTime();
    current = (prevTime !== null && t - prevTime === 86400000) ? current + 1 : 1;
    longest = Math.max(longest, current);
    prevTime = t;
  });
  return longest;
}

function computeAnalytics(events, newProfiles, activeProfiles, sinceIso){
  const byId = Object.fromEntries(activeProfiles.map(p => [p.user_id, p]));

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
  // dentro do período selecionado -- balde por contagem de dias, não uma
  // cadência "por semana" fabricada a partir de um período que pode não
  // ser uma semana exata.
  const activeUserIdsList = [...activeUserIds];
  const freqBuckets = analyticsBucketizeByUsers(activeUserIdsList, [
    { label: t('admin.analytics.freq.1'), min: 1, max: 1 },
    { label: t('admin.analytics.freq.2_4'), min: 2, max: 4 },
    { label: t('admin.analytics.freq.5_9'), min: 5, max: 9 },
    { label: t('admin.analytics.freq.10'), min: 10, max: Infinity },
  ], uid => daysByUser[uid]?.size || 0);

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
    const level = analyticsUnitLevel(e) || t('admin.analytics.levelUnknown');
    (levelUsers[level] ||= new Set()).add(e.user_id);
  });
  const levelRows = Object.entries(levelUsers)
    // {name, count} -- mesmo formato que todo outro *Rows daqui (deviceRows,
    // browserRows, areaRows...), porque analyticsBarRowsHTML() lê row.name.
    // Chave "level" aqui fazia row.name vir undefined e renderizar a
    // string literal "undefined" no rótulo da barra.
    .map(([level, users]) => ({ name: level, count: users.size }))
    .sort((a, b) => b.count - a.count);

  // ---- Progressão: unidades/lições concluídas por aluno ----
  // unit_checkpoint = concluiu o checkpoint da unidade inteira;
  // vocab_lesson = concluiu uma lição individual dentro dela (identificada
  // por unitId+lessonIdx, já que lessonIdx sozinho se repete entre
  // unidades). Contagem por aluno DISTINTA (um checkpoint refeito não
  // conta duas vezes), igual à filosofia de completeUsersByName acima.
  const unitsByUser = {}, lessonsByUser = {};
  events.forEach(e => {
    if (e.event_type !== 'lesson_complete') return;
    if (e.event_name === 'unit_checkpoint' && e.meta?.unitId != null){
      (unitsByUser[e.user_id] ||= new Set()).add(e.meta.unitId);
    }
    if (e.event_name === 'vocab_lesson' && e.meta?.unitId != null && e.meta?.lessonIdx != null){
      (lessonsByUser[e.user_id] ||= new Set()).add(`${e.meta.unitId}:${e.meta.lessonIdx}`);
    }
  });
  const unitsCompletedBuckets = analyticsBucketizeByUsers(activeUserIdsList, [
    { label: '0', min: 0, max: 0 },
    { label: '1–2', min: 1, max: 2 },
    { label: '3–5', min: 3, max: 5 },
    { label: '6+', min: 6, max: Infinity },
  ], uid => unitsByUser[uid]?.size || 0);
  const lessonsCompletedBuckets = analyticsBucketizeByUsers(activeUserIdsList, [
    { label: '0', min: 0, max: 0 },
    { label: '1–3', min: 1, max: 3 },
    { label: '4–9', min: 4, max: 9 },
    { label: '10+', min: 10, max: Infinity },
  ], uid => lessonsByUser[uid]?.size || 0);

  // ---- Dispositivos (Fase 4, item 6) ----
  // Colunas só existem pra eventos gravados depois da migration 009 --
  // eventos mais antigos ficam null, tratados como "desconhecido" abaixo
  // (nunca inventado).
  function analyticsGroupBy(field, fallback){
    const counts = {}, users = {};
    events.forEach(e => {
      const key = e[field] || fallback;
      counts[key] = (counts[key] || 0) + 1;
      (users[key] ||= new Set()).add(e.user_id);
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, uniqueStudents: users[name].size }))
      .sort((a, b) => b.count - a.count);
  }
  const unknownLabel = t('admin.analytics.unknown');
  const deviceRows = analyticsGroupBy('device_type', unknownLabel);
  const browserRows = analyticsGroupBy('browser', unknownLabel);
  const osRows = analyticsGroupBy('os', unknownLabel);

  // ---- Engajamento: exercícios por sessão, streak (proxy) ----
  const totalCompleted = Object.values(completeCounts).reduce((a, b) => a + b, 0);
  const exercisesPerSession = sessionIds.size ? Math.round((totalCompleted / sessionIds.size) * 10) / 10 : null;
  const streaks = activeUserIdsList.map(uid => analyticsLongestStreak(daysByUser[uid] || new Set()));
  const avgLongestStreak = streaks.length ? Math.round((streaks.reduce((a, b) => a + b, 0) / streaks.length) * 10) / 10 : 0;
  const maxLongestStreak = streaks.length ? Math.max(...streaks) : 0;

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
    unitsCompletedBuckets,
    lessonsCompletedBuckets,
    deviceRows,
    browserRows,
    osRows,
    exercisesPerSession,
    avgLongestStreak,
    maxLongestStreak,
    totalEvents: events.length,
  };
}

// ---------- Comparação (delta período atual x anterior) ----------
// previous === 0 é tratado à parte -- uma % de variação não faz sentido
// saindo de zero (seria sempre "infinito"), e mostrar "+100%" ali seria
// inventar uma leitura que os dados não sustentam. "novo" comunica a
// mesma ideia sem fingir precisão. current/previous nulos (ex: taxa de
// conclusão sem nenhum tipo rastreável no período) também não geram
// delta nenhum -- sem isso, `null` vira 0 em aritmética JS e a divisão
// produz um "▲ Infinity%" que pareceria um dado real sem ser.
function analyticsDelta(current, previous){
  if (typeof current !== 'number' || typeof previous !== 'number') return null;
  if (previous === 0) return current === 0 ? null : { kind: 'new' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { kind: 'flat' };
  return { kind: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) };
}

function analyticsDeltaBadgeHTML(delta){
  if (!delta) return '';
  if (delta.kind === 'new') return `<span class="analytics-delta analytics-delta-new">${t('admin.analytics.delta.new')}</span>`;
  if (delta.kind === 'flat') return `<span class="analytics-delta analytics-delta-flat">= </span>`;
  const arrow = delta.kind === 'up' ? '▲' : '▼';
  const cls = delta.kind === 'up' ? 'analytics-delta-up' : 'analytics-delta-down';
  return `<span class="analytics-delta ${cls}">${arrow} ${delta.pct}%</span>`;
}

// ---------- Render: componentes reutilizáveis ----------
function analyticsKpiTileHTML(num, label, note, delta){
  return `
    <div class="analytics-kpi-tile">
      <div class="analytics-kpi-num">${num}${analyticsDeltaBadgeHTML(delta)}</div>
      <div class="analytics-kpi-label">${label}</div>
      ${note ? `<div class="analytics-kpi-note">${note}</div>` : ''}
    </div>
  `;
}

function analyticsBarRowsHTML(rows, labels, extraNote){
  // Não pode assumir rows[0] como o maior -- vale pra *Rows já ordenados
  // por contagem (área, dispositivo, etc.), mas as distribuições de
  // unidades/lições concluídas mantêm ordem fixa (0, 1-3, 4-9, 10+) de
  // propósito, pra ler como progressão. Se o primeiro bucket for 0 e outro
  // não for, "rows[0].count" zerava "max" e TODAS as barras saíam com
  // largura 0%, mesmo as com contagem real.
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return rows.map(row => {
    const pct = max ? Math.round((row.count / max) * 100) : 0;
    const label = labels[row.name] || row.name;
    const usersNote = typeof row.uniqueStudents === 'number' ? ` · ${tp('admin.analytics.students', row.uniqueStudents)}` : '';
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

function analyticsEmptyNoteHTML(msg){
  return `<p class="profile-empty-note">${msg || t('admin.analytics.noData')}</p>`;
}

function analyticsFormatMinutes(mins){
  if (!mins) return '0min';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h ${m}min` : `${m}min`;
}

// ---------- Render: controles (período, comparação, idioma) ----------
function analyticsControlsHTML(since, until){
  const periodOptions = Object.entries(ANALYTICS_PERIOD_LABELS).map(([key, label]) =>
    `<option value="${key}" ${ANALYTICS_STATE.period === key ? 'selected' : ''}>${label}</option>`
  ).join('');
  const langOptions = AVAILABLE_LANGUAGES.map(l =>
    `<option value="${l.appKey}" ${ANALYTICS_STATE.languageFilter === l.appKey ? 'selected' : ''}>${l.name}</option>`
  ).join('');

  const customRangeHTML = ANALYTICS_STATE.period === 'custom' ? `
    <div class="analytics-custom-range">
      <input type="date" id="analytics-custom-since" class="profile-edit-input" value="${ANALYTICS_STATE.customSince}">
      <input type="date" id="analytics-custom-until" class="profile-edit-input" value="${ANALYTICS_STATE.customUntil}">
    </div>
  ` : '';

  const previous = analyticsPreviousPeriod(since, until);
  const rangeLabel = `${analyticsFormatDate(since)} – ${analyticsFormatDate(until)}`;
  const compareLabel = ANALYTICS_STATE.compare ? ` · ${t('admin.analytics.compareWith', { since: analyticsFormatDate(previous.since), until: analyticsFormatDate(previous.until) })}` : '';

  const deviceOptions = Object.entries(ANALYTICS_DEVICE_LABELS).map(([key, label]) =>
    `<option value="${key}" ${ANALYTICS_STATE.deviceFilter === key ? 'selected' : ''}>${label}</option>`
  ).join('');

  return `
    <div class="profile-section">
      <div class="analytics-filters-row">
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-period-select">${t('admin.analytics.filter.period')}</label>
          <select id="analytics-period-select" class="profile-edit-input">${periodOptions}</select>
        </div>
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-language-select">${t('fieldEditor.field.language')}</label>
          <select id="analytics-language-select" class="profile-edit-input">
            <option value="all" ${ANALYTICS_STATE.languageFilter === 'all' ? 'selected' : ''}>${t('admin.reports.filter.allLanguages')}</option>
            ${langOptions}
          </select>
        </div>
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-device-select">${t('admin.analytics.filter.device')}</label>
          <select id="analytics-device-select" class="profile-edit-input">
            <option value="all" ${ANALYTICS_STATE.deviceFilter === 'all' ? 'selected' : ''}>${t('admin.analytics.filter.allDevices')}</option>
            ${deviceOptions}
          </select>
        </div>
      </div>
      ${customRangeHTML}
      <div class="analytics-compare-row">
        <span class="pref-row-title">${t('admin.analytics.filter.compare')}</span>
        <button class="pref-switch" id="analytics-compare-switch" role="switch" aria-checked="${ANALYTICS_STATE.compare ? 'true' : 'false'}"><span class="pref-switch-knob"></span></button>
      </div>
      <p class="admin-badge-desc">${t('admin.analytics.filter.periodLine', { range: rangeLabel })}${compareLabel}</p>
    </div>
  `;
}

function wireAnalyticsControls(){
  const periodSel = document.getElementById('analytics-period-select');
  if (periodSel) periodSel.addEventListener('change', () => { ANALYTICS_STATE.period = periodSel.value; renderAdminAnalyticsView(); });

  const langSel = document.getElementById('analytics-language-select');
  if (langSel) langSel.addEventListener('change', () => { ANALYTICS_STATE.languageFilter = langSel.value; renderAdminAnalyticsView(); });

  const deviceSel = document.getElementById('analytics-device-select');
  if (deviceSel) deviceSel.addEventListener('change', () => { ANALYTICS_STATE.deviceFilter = deviceSel.value; renderAdminAnalyticsView(); });

  const sinceInput = document.getElementById('analytics-custom-since');
  const untilInput = document.getElementById('analytics-custom-until');
  if (sinceInput) sinceInput.addEventListener('change', () => { ANALYTICS_STATE.customSince = sinceInput.value; renderAdminAnalyticsView(); });
  if (untilInput) untilInput.addEventListener('change', () => { ANALYTICS_STATE.customUntil = untilInput.value; renderAdminAnalyticsView(); });

  const compareBtn = document.getElementById('analytics-compare-switch');
  if (compareBtn) compareBtn.addEventListener('click', () => {
    ANALYTICS_STATE.compare = compareBtn.getAttribute('aria-checked') !== 'true';
    renderAdminAnalyticsView();
  });
}

// ---------- Render: seções ----------
function renderResumoSectionHTML(stats, prev){
  const d = (key) => prev ? analyticsDelta(stats[key], prev[key]) : null;
  const rateNote = stats.overallCompletionRate === null
    ? `<p class="admin-badge-desc">${t('admin.analytics.resumo.rateNA')}</p>`
    : `<p class="admin-badge-desc">${t('admin.analytics.resumo.rateNote')}</p>`;
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.subtab.resumo')}</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.activeStudents, t('admin.analytics.kpi.activeStudents'), t('admin.analytics.kpi.activeStudentsNote'), d('activeStudents'))}
        ${analyticsKpiTileHTML(stats.newStudents, t('admin.analytics.kpi.newStudents'), t('admin.analytics.kpi.newStudentsNote'), d('newStudents'))}
        ${analyticsKpiTileHTML(stats.sessions, t('admin.analytics.kpi.sessions'), t('admin.analytics.kpi.sessionsNote'), d('sessions'))}
        ${analyticsKpiTileHTML(stats.exercisesStarted, t('admin.analytics.kpi.started'), t('admin.analytics.kpi.startedNote'), d('exercisesStarted'))}
        ${analyticsKpiTileHTML(stats.exercisesCompleted, t('admin.analytics.kpi.completed'), t('admin.analytics.kpi.completedNote'), d('exercisesCompleted'))}
        ${analyticsKpiTileHTML(stats.overallCompletionRate === null ? '—' : `${stats.overallCompletionRate}%`, t('admin.analytics.kpi.rate'), t('admin.analytics.kpi.rateNote'), stats.overallCompletionRate === null ? null : d('overallCompletionRate'))}
        ${analyticsKpiTileHTML(analyticsFormatMinutes(stats.estimatedStudyMinutes), t('admin.analytics.kpi.time'), t('admin.analytics.kpi.timeNote'))}
      </div>
      ${rateNote}
      <p class="admin-badge-desc">${t('admin.analytics.resumo.timeNote')}</p>
      <p class="admin-badge-desc">${t('admin.analytics.resumo.xpNote')}</p>
    </div>
  `;
}

function renderAtividadeSectionHTML(stats){
  const freqRows = stats.freqBuckets.map(b => ({ name: b.label, count: b.count }));
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.subtab.atividade')}</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.newActiveCount, t('admin.analytics.ativ.newActive'))}
        ${analyticsKpiTileHTML(stats.returningActiveCount, t('admin.analytics.ativ.returning'))}
      </div>
      <p class="admin-badge-desc">${t('admin.analytics.ativ.note')}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.ativ.activeByDay')}</div>
      ${stats.activeByDayRows.length ? analyticsBarRowsHTML(stats.activeByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.ativ.sessionsByDay')}</div>
      ${stats.sessionsByDayRows.length ? analyticsBarRowsHTML(stats.sessionsByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.ativ.frequency')}</div>
      ${freqRows.some(r => r.count) ? analyticsBarRowsHTML(freqRows, {}) : analyticsEmptyNoteHTML()}
    </div>
  `;
}

function renderNavegacaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.nav.areas')}</div>
      ${stats.areaRows.length ? analyticsBarRowsHTML(stats.areaRows, ANALYTICS_TAB_LABELS) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.nav.features')}</div>
      ${stats.featureRows.length ? analyticsBarRowsHTML(stats.featureRows, ANALYTICS_LESSON_EVENT_LABELS) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">${t('admin.analytics.nav.featuresNote')}</p>
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

  // Funil (Fase 4, item 2): reaproveita exerciseRows -- mesma consulta,
  // outra leitura. Só entram os tipos com evento de início (sem isso, o
  // funil "iniciou -> concluiu" não existe de verdade). "Acertou bem" =
  // nota média >= 80%, mesmo corte já usado no desafio "Pontue mais de
  // 80%" do app -- reaproveita um limiar que já existe em vez de inventar
  // um novo.
  const funnelRows = stats.exerciseRows.filter(r => r.started !== null && r.started > 0);
  const funnelHTML = funnelRows.map(r => {
    const label = ANALYTICS_LESSON_EVENT_LABELS[r.name] || r.name;
    const highScore = r.avgScore !== null && r.avgScore >= 80;
    return `
      <div class="analytics-funnel-row">
        <div class="analytics-funnel-label">${label}</div>
        <div class="analytics-funnel-stages">
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.started}</span><span class="analytics-funnel-stage-label">${t('admin.analytics.funnel.started')}</span></div>
          <div class="analytics-funnel-arrow">→</div>
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.completed}</span><span class="analytics-funnel-stage-label">${t('admin.analytics.funnel.completed')}${r.completionRate !== null ? ` (${r.completionRate}%)` : ''}</span></div>
          <div class="analytics-funnel-arrow">→</div>
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.avgScore === null ? '—' : r.avgScore + '%'}</span><span class="analytics-funnel-stage-label">${highScore ? t('admin.analytics.funnel.goodScore') : t('admin.analytics.funnel.avgScore')}</span></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.ex.byType')}</div>
      ${stats.exerciseRows.length ? `
        <div class="analytics-table-wrap">
          <table class="analytics-table">
            <thead><tr><th>${t('admin.analytics.ex.col.exercise')}</th><th>${t('admin.analytics.ex.col.started')}</th><th>${t('admin.analytics.ex.col.done')}</th><th>${t('admin.analytics.ex.col.rate')}</th><th>${t('admin.analytics.ex.col.score')}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="admin-badge-desc">${t('admin.analytics.ex.note')}</p>
      ` : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.funnel.title')}</div>
      ${funnelRows.length ? funnelHTML + `<p class="admin-badge-desc">${t('admin.analytics.funnel.note')}</p>` : analyticsEmptyNoteHTML(t('admin.analytics.funnel.empty'))}
    </div>
  `;
}

function renderIdiomaSectionHTML(stats){
  const langName = (appKey) => AVAILABLE_LANGUAGES.find(l => l.appKey === appKey)?.name || appKey;
  const rows = Object.entries(stats.byLanguageCounts)
    .map(([appKey, count]) => ({ name: appKey, count }))
    .sort((a, b) => b.count - a.count);
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.lang.events')}</div>
      ${rows.length ? analyticsBarRowsHTML(rows, Object.fromEntries(AVAILABLE_LANGUAGES.map(l => [l.appKey, l.name]))) : analyticsEmptyNoteHTML()}
      ${ANALYTICS_STATE.languageFilter !== 'all' ? `<p class="admin-badge-desc">${t('admin.analytics.lang.filterActive', { lang: langName(ANALYTICS_STATE.languageFilter) })}</p>` : ''}
      <p class="admin-badge-desc">${t('admin.analytics.lang.note')}</p>
    </div>
  `;
}

function renderProgressaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.prog.byLevel')}</div>
      ${stats.levelRows.length ? analyticsBarRowsHTML(stats.levelRows, {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">${t('admin.analytics.prog.levelNote')}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.prog.units')}</div>
      ${stats.unitsCompletedBuckets.some(b => b.count) ? analyticsBarRowsHTML(stats.unitsCompletedBuckets.map(b => ({ name: b.label, count: b.count })), {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">${t('admin.analytics.prog.unitsNote')}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.prog.lessons')}</div>
      ${stats.lessonsCompletedBuckets.some(b => b.count) ? analyticsBarRowsHTML(stats.lessonsCompletedBuckets.map(b => ({ name: b.label, count: b.count })), {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">${t('admin.analytics.prog.lessonsNote')}</p>
    </div>
  `;
}

function renderDispositivosSectionHTML(stats){
  const hasData = stats.deviceRows.some(r => r.name !== t('admin.analytics.unknown'));
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.dev.type')}</div>
      ${stats.deviceRows.length ? analyticsBarRowsHTML(stats.deviceRows, ANALYTICS_DEVICE_LABELS) : analyticsEmptyNoteHTML()}
      ${!hasData ? `<p class="admin-badge-desc">${t('admin.analytics.dev.noData')}</p>` : ''}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.dev.browser')}</div>
      ${stats.browserRows.length ? analyticsBarRowsHTML(stats.browserRows, {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.dev.os')}</div>
      ${stats.osRows.length ? analyticsBarRowsHTML(stats.osRows, {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">${t('admin.analytics.dev.osNote')}</p>
    </div>
  `;
}

// Engajamento + Gamificação (Fase 4, itens 4 e 5) -- unidos numa aba só:
// o próprio prompt-mestre lista XP/streak nos dois grupos, e mostrar as
// mesmas duas métricas em duas abas diferentes seria exatamente a
// duplicação que a revisão arquitetural desta fase pediu pra evitar.
function renderEngajamentoSectionHTML(stats, weeklyXp, badgeGrants){
  const totalXpThisWeek = weeklyXp.reduce((sum, r) => sum + (r.amount || 0), 0);
  // Divide por TODOS os alunos ativos no período (stats.activeStudents), não
  // só por weeklyXp.length (só quem tem linha em weekly_xp essa semana --
  // um aluno ativo no período que ainda não ganhou XP nesta semana
  // específica não tem linha nenhuma). Dividir só pelos "sobreviventes"
  // infla a média silenciosamente -- ex: 3 ativos, só 2 com XP essa
  // semana, dividir por 2 mostra uma média mais alta do que a real entre
  // todos os ativos.
  const avgXpThisWeek = stats.activeStudents ? Math.round(totalXpThisWeek / stats.activeStudents) : 0;
  const badgeCount = badgeGrants.length;
  const badgedStudents = new Set(badgeGrants.map(g => g.user_id)).size;
  const leaderboardViews = stats.areaRows.find(r => r.name === 'leaderboard')?.count || 0;

  const revisoesTypes = ['flashcard_review', 'speed_review', 'hanzi_review'];
  const revisoesTotal = stats.exerciseRows.filter(r => revisoesTypes.includes(r.name)).reduce((sum, r) => sum + r.completed, 0);
  const desafiosTotal = stats.exerciseRows.find(r => r.name === 'challenge')?.completed || 0;

  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.subtab.engajamento')}</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.sessions, t('admin.analytics.kpi.sessions'))}
        ${analyticsKpiTileHTML(stats.exercisesPerSession === null ? '—' : stats.exercisesPerSession, t('admin.analytics.eng.perSession'))}
        ${analyticsKpiTileHTML(revisoesTotal, t('admin.analytics.eng.reviewsDone'))}
        ${analyticsKpiTileHTML(desafiosTotal, t('admin.analytics.eng.challengesDone'))}
      </div>
      <p class="admin-badge-desc">${t('admin.analytics.eng.freqNote')}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.eng.gamification')}</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(totalXpThisWeek, t('admin.analytics.eng.xpTotal'))}
        ${analyticsKpiTileHTML(avgXpThisWeek, t('admin.analytics.eng.xpAvg'))}
        ${analyticsKpiTileHTML(stats.avgLongestStreak, t('admin.analytics.eng.streakAvg'), t('admin.analytics.eng.streakNote'))}
        ${analyticsKpiTileHTML(stats.maxLongestStreak, t('admin.analytics.eng.streakMax'))}
        ${analyticsKpiTileHTML(badgeCount, t('admin.analytics.eng.badges'))}
        ${analyticsKpiTileHTML(leaderboardViews, t('admin.analytics.eng.leaderboardViews'))}
      </div>
      <p class="admin-badge-desc">${t('admin.analytics.eng.xpNote1')} ${t('admin.analytics.eng.xpNote2')} ${badgedStudents ? `${tp('admin.analytics.eng.badgedStudents', badgedStudents)} ${t('admin.analytics.eng.badgedSuffix')}` : ''}</p>
    </div>
  `;
}

function renderTecnologiaSectionHTML(tech){
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.tech.errors')}</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(tech.totalErrors, t('admin.analytics.tech.total'))}
        ${analyticsKpiTileHTML(tech.affectedStudents, t('admin.analytics.tech.affected'))}
      </div>
      ${tech.errorRows.length ? analyticsBarRowsHTML(tech.errorRows, ANALYTICS_TECHNICAL_ERROR_LABELS) : analyticsEmptyNoteHTML(t('admin.analytics.tech.noErrors'))}
      <p class="admin-badge-desc">${t('admin.analytics.tech.note')}</p>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.tech.perf')}</div>
      ${tech.perfSampleCount ? `
        <div class="analytics-kpi-grid">
          ${analyticsKpiTileHTML(`${tech.avgLoadMs}ms`, t('admin.analytics.tech.loadAvg'))}
          ${analyticsKpiTileHTML(`${tech.medianLoadMs}ms`, t('admin.analytics.tech.loadMedian'))}
        </div>
        <p class="admin-badge-desc">${tp('admin.analytics.tech.samples', tech.perfSampleCount)}</p>
      ` : analyticsEmptyNoteHTML(t('admin.analytics.tech.noPerf'))}
    </div>

    <p class="admin-badge-desc">${t('admin.analytics.tech.separateNote')}</p>
  `;
}

function renderRetencaoSectionHTML(cohorts){
  if (!cohorts.length) return analyticsEmptyNoteHTML(t('admin.analytics.ret.empty'));
  const rows = cohorts.map(c => {
    const cells = ANALYTICS_COHORT_OFFSETS.map(offset => {
      const r = c.retention[offset];
      return `<td>${r === null ? '—' : `${r.pct}% <span class="admin-badge-desc" style="display:inline">(${r.returned}/${r.eligible})</span>`}</td>`;
    }).join('');
    return `<tr><td>${analyticsFormatDate(new Date(c.week + 'T00:00:00'))}</td><td>${c.size}</td>${cells}</tr>`;
  }).join('');
  return `
    <div class="profile-section">
      <div class="section-label">${t('admin.analytics.ret.title')}</div>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead><tr><th>${t('admin.analytics.ret.col.cohort')}</th><th>${t('admin.common.students')}</th><th>${t('admin.analytics.ret.col.d1')}</th><th>${t('admin.analytics.ret.col.d7')}</th><th>${t('admin.analytics.ret.col.d14')}</th><th>${t('admin.analytics.ret.col.d30')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="admin-badge-desc">${t('admin.analytics.ret.note')}</p>
    </div>
  `;
}

// ---------- Render: navegação interna (abas) ----------
// Escalável de propósito: uma aba nova é só mais uma entrada aqui e mais
// um botão no HTML gerado -- nenhuma outra parte do arquivo precisa saber
// quantas abas existem.
const ANALYTICS_TABS = [
  { key: 'resumo', get label(){ return t('admin.analytics.subtab.resumo'); } },
  { key: 'atividade', get label(){ return t('admin.analytics.subtab.atividade'); } },
  { key: 'retencao', get label(){ return t('admin.analytics.subtab.retencao'); } },
  { key: 'navegacao', get label(){ return t('admin.analytics.subtab.navegacao'); } },
  { key: 'exercicios', get label(){ return t('admin.analytics.subtab.exercicios'); } },
  { key: 'progressao', get label(){ return t('admin.analytics.subtab.progressao'); } },
  { key: 'engajamento', get label(){ return t('admin.analytics.subtab.engajamento'); } },
  { key: 'idioma', get label(){ return t('admin.analytics.subtab.idioma'); } },
  { key: 'dispositivos', get label(){ return t('admin.analytics.subtab.dispositivos'); } },
  { key: 'tecnologia', get label(){ return t('admin.analytics.subtab.tecnologia'); } },
];

function analyticsSubnavHTML(){
  const tabsHTML = ANALYTICS_TABS.map(t =>
    `<button class="leaderboard-tab ${ANALYTICS_STATE.tab === t.key ? 'active' : ''}" role="tab" aria-selected="${ANALYTICS_STATE.tab === t.key}" data-analytics-tab="${t.key}">${t.label}</button>`
  ).join('');
  return `<div class="leaderboard-tabs" role="tablist" aria-label="${t('admin.analytics.subnav.aria')}">${tabsHTML}</div>`;
}

// Abas em ANALYTICS_LAZY_TABS (Retenção/Engajamento/Tecnologia) só buscam
// dados na primeira vez que são abertas -- ver comentário de
// ANALYTICS_LAZY_CACHE. As demais só alternam visibilidade do que já foi
// renderizado, sem nenhuma consulta nova.
async function switchAnalyticsTab(tab){
  ANALYTICS_STATE.tab = tab;
  document.querySelectorAll('[data-analytics-tab]').forEach(btn => {
    const active = btn.dataset.analyticsTab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('[data-analytics-panel]').forEach(panel => {
    panel.style.display = panel.dataset.analyticsPanel === tab ? '' : 'none';
  });

  if (!ANALYTICS_LAZY_TABS.has(tab) || ANALYTICS_LAZY_CACHE[tab]) return;
  const panel = document.querySelector(`[data-analytics-panel="${tab}"]`);
  if (!panel) return;
  panel.innerHTML = loadingHTML();

  if (tab === 'retencao'){
    const [profiles, events] = await Promise.all([fetchAllStudentProfilesForRetention(), fetchAllStudentEventsForRetention()]);
    ANALYTICS_LAZY_CACHE.retencao = computeRetentionCohorts(profiles, events);
    panel.innerHTML = renderRetencaoSectionHTML(ANALYTICS_LAZY_CACHE.retencao);
  } else if (tab === 'engajamento'){
    const [weeklyXp, badgeGrants] = await Promise.all([
      fetchWeeklyXpForUsers(ANALYTICS_CURRENT.activeUserIds),
      fetchBadgeGrantsInWindow(ANALYTICS_CURRENT.sinceIso, ANALYTICS_CURRENT.untilIso),
    ]);
    ANALYTICS_LAZY_CACHE.engajamento = { weeklyXp, badgeGrants };
    panel.innerHTML = renderEngajamentoSectionHTML(ANALYTICS_CURRENT.stats, weeklyXp, badgeGrants);
  } else if (tab === 'tecnologia'){
    const events = await fetchTechnicalEventsForWindow(ANALYTICS_CURRENT.sinceIso, ANALYTICS_CURRENT.untilIso);
    ANALYTICS_LAZY_CACHE.tecnologia = computeTechnicalStats(events);
    panel.innerHTML = renderTecnologiaSectionHTML(ANALYTICS_LAZY_CACHE.tecnologia);
  }
}

function wireAnalyticsSubnav(){
  document.querySelectorAll('[data-analytics-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchAnalyticsTab(btn.dataset.analyticsTab));
  });
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
          <div class="pref-row-title">${t('admin.analytics.exclude.title')}</div>
          <div class="pref-row-sub">${t('admin.analytics.exclude.sub')}</div>
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
      ? t('admin.analytics.exclude.toastOn')
      : t('admin.analytics.exclude.toastOff'));
  });
}

// Toggle "Admin Mode" -- mesma fonte de verdade do pill da topbar
// (#admin-mode-toggle-btn, ver applyAdminModeUI em shared/auth.js e
// isAdminModeOn()/setAdminMode() em shared/profile.js). Não é uma segunda
// implementação: só um segundo PONTO DE ACESSO pro mesmo estado global
// (Fase 9 da spec de Admin Mode -- "Home -> Admin OFF também significa
// Analytics -> Admin OFF e vice-versa").
function adminModeToggleHTML(adminModeOn){
  return `
    <div class="profile-section">
      <div class="pref-row">
        <div class="pref-row-text">
          <div class="pref-row-title">${t('admin.mode.title')}</div>
          <div class="pref-row-sub">${t('admin.mode.sub')}</div>
        </div>
        <button class="pref-switch" id="admin-mode-analytics-switch" role="switch" aria-checked="${adminModeOn ? 'true' : 'false'}"><span class="pref-switch-knob"></span></button>
      </div>
    </div>
  `;
}

function wireAdminModeAnalyticsToggle(){
  const btn = document.getElementById('admin-mode-analytics-switch');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', next ? 'true' : 'false');
    const ok = await setAdminMode(next);
    if (!ok){ btn.setAttribute('aria-checked', next ? 'false' : 'true'); return; }
    if (typeof applyAdminModeUI === 'function') await applyAdminModeUI();
    if (typeof renderUnitsGrid === 'function') renderUnitsGrid();
    showToast(next
      ? t('admin.mode.toastOn')
      : t('admin.mode.toastOff'));
  });
}

async function renderAdminAnalyticsView(){
  const wrap = document.getElementById('admin-analytics-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const profile = await ensureProfileLoaded();
  const excludeOwn = profile ? profile.exclude_own_activity !== false : true;
  const adminModeOn = typeof isAdminModeOn === 'function' && isAdminModeOn();
  const toggleHTML = adminModeToggleHTML(adminModeOn) + analyticsExcludeOwnToggleHTML(excludeOwn);

  const { since, until } = analyticsResolvePeriod();
  const controlsHTML = analyticsControlsHTML(since, until);

  const { stats, activeUserIds } = await analyticsFetchStatsInput(since, until);
  let prevStats = null;
  if (ANALYTICS_STATE.compare){
    const prev = analyticsPreviousPeriod(since, until);
    prevStats = (await analyticsFetchStatsInput(prev.since, prev.until)).stats;
  }

  // Guardado pras abas de carregamento sob demanda (Retenção/Engajamento/
  // Tecnologia) reaproveitarem sem refazer a consulta principal. Cache de
  // aba limpo aqui -- período/idioma/dispositivo/comparação mudaram,
  // então qualquer coisa guardada de antes não vale mais.
  ANALYTICS_CURRENT.stats = stats;
  ANALYTICS_CURRENT.activeUserIds = activeUserIds;
  ANALYTICS_CURRENT.sinceIso = since.toISOString();
  ANALYTICS_CURRENT.untilIso = until.toISOString();
  Object.keys(ANALYTICS_LAZY_CACHE).forEach(k => delete ANALYTICS_LAZY_CACHE[k]);

  const emptyNote = stats.totalEvents === 0
    ? `<p class="profile-empty-note">${t('admin.analytics.noEvents')}</p>`
    : '';

  wrap.innerHTML = toggleHTML + controlsHTML + emptyNote + analyticsSubnavHTML()
    + `<div data-analytics-panel="resumo">${renderResumoSectionHTML(stats, prevStats)}</div>`
    + `<div data-analytics-panel="atividade">${renderAtividadeSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="retencao"></div>`
    + `<div data-analytics-panel="navegacao">${renderNavegacaoSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="exercicios">${renderExerciciosSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="progressao">${renderProgressaoSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="engajamento"></div>`
    + `<div data-analytics-panel="idioma">${renderIdiomaSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="dispositivos">${renderDispositivosSectionHTML(stats)}</div>`
    + `<div data-analytics-panel="tecnologia"></div>`;

  wireAdminModeAnalyticsToggle();
  wireAnalyticsExcludeOwnToggle();
  wireAnalyticsControls();
  wireAnalyticsSubnav();
  await switchAnalyticsTab(ANALYTICS_STATE.tab);
}

// Alterna entre as seções do Painel de Admin (Badges/Analytics/
// Notificações/Reports/Alunos) -- cada uma renderiza no seu próprio wrap
// (#admin-badges-content / #admin-analytics-content / ...), só um fica
// visível por vez.
function switchAdminPanelSection(section){
  ADMIN_PANEL_STATE.section = section;
  document.querySelectorAll('[data-admin-section]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminSection === section));
  document.getElementById('admin-badges-content').style.display = section === 'badges' ? '' : 'none';
  document.getElementById('admin-analytics-content').style.display = section === 'analytics' ? '' : 'none';
  document.getElementById('admin-notifications-content').style.display = section === 'notifications' ? '' : 'none';
  document.getElementById('admin-reports-content').style.display = section === 'reports' ? '' : 'none';
  document.getElementById('admin-students-content').style.display = section === 'students' ? '' : 'none';
  document.getElementById('admin-flashcards-content').style.display = section === 'flashcards' ? '' : 'none';
  document.getElementById('admin-classlogs-content').style.display = section === 'classlogs' ? '' : 'none';
  document.getElementById('admin-materials-content').style.display = section === 'materials' ? '' : 'none';
  document.getElementById('admin-premium-content').style.display = section === 'premium' ? '' : 'none';
  document.getElementById('admin-tags-content').style.display = section === 'tags' ? '' : 'none';
  if (section === 'badges') renderAdminBadgesView();
  else if (section === 'notifications') renderAdminNotificationsView();
  else if (section === 'reports') renderAdminReportsView();
  else if (section === 'students') renderAdminStudentsView();
  else if (section === 'flashcards') renderAdminFlashcardsView();
  else if (section === 'classlogs') renderAdminClassLogsView();
  else if (section === 'materials') renderAdminSupportMaterialsView();
  else if (section === 'premium') renderAdminPremiumView();
  else if (section === 'tags') renderAdminTagsView();
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
