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

const ANALYTICS_DEVICE_LABELS = { mobile: '📱 Celular', tablet: '📟 Tablet', desktop: '🖥️ Desktop' };

// Erros técnicos (ver shared/analytics.js:trackTechnicalError() e os
// pontos que chamam -- window.onerror/unhandledrejection globais,
// notifySaveFailure() em shared/auth.js, falhas de áudio em cada
// languages/<lang>/app.js:playPregeneratedAudio()). Não existe categoria
// de vídeo -- o app não tem conteúdo em vídeo, então "falhas de vídeo" do
// prompt-mestre não se aplica aqui (documentado, não fabricado).
const ANALYTICS_TECHNICAL_ERROR_LABELS = {
  js_error: '🐞 Erro de JavaScript',
  unhandled_rejection: '🐞 Promise rejeitada sem tratamento',
  audio_load_failed: '🔇 Falha ao carregar áudio',
  audio_play_failed: '🔇 Falha ao tocar áudio (clique manual)',
  save_failed: '💾 Falha ao salvar progresso',
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
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
  thisMonth: 'Este mês',
  lastMonth: 'Mês passado',
  last90: 'Últimos 90 dias',
  custom: 'Personalizado',
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
  return d.toLocaleDateString('pt-BR');
}

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
    .eq('actor_type', 'student')
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
    .eq('actor_type', 'student')
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
// Mesmo actor_type='student' (a atividade de teste da autora tampouco
// deve contar como "alunos tendo problemas técnicos").
async function fetchTechnicalEventsForWindow(sinceIso, untilIso){
  let q = supabaseClient
    .from('usage_events')
    .select('user_id, event_type, event_name, meta, created_at')
    .eq('actor_type', 'student')
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
    { label: '1 dia', min: 1, max: 1 },
    { label: '2–4 dias', min: 2, max: 4 },
    { label: '5–9 dias', min: 5, max: 9 },
    { label: '10+ dias', min: 10, max: Infinity },
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
    const level = analyticsUnitLevel(e) || 'Nível desconhecido';
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
  const deviceRows = analyticsGroupBy('device_type', 'desconhecido');
  const browserRows = analyticsGroupBy('browser', 'desconhecido');
  const osRows = analyticsGroupBy('os', 'desconhecido');

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
  if (delta.kind === 'new') return `<span class="analytics-delta analytics-delta-new">novo</span>`;
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

function analyticsEmptyNoteHTML(msg){
  return `<p class="profile-empty-note">${msg || 'Sem dados no período selecionado.'}</p>`;
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
  const compareLabel = ANALYTICS_STATE.compare ? ` · comparando com ${analyticsFormatDate(previous.since)} – ${analyticsFormatDate(previous.until)}` : '';

  const deviceOptions = Object.entries(ANALYTICS_DEVICE_LABELS).map(([key, label]) =>
    `<option value="${key}" ${ANALYTICS_STATE.deviceFilter === key ? 'selected' : ''}>${label}</option>`
  ).join('');

  return `
    <div class="profile-section">
      <div class="analytics-filters-row">
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-period-select">Período</label>
          <select id="analytics-period-select" class="profile-edit-input">${periodOptions}</select>
        </div>
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-language-select">Idioma</label>
          <select id="analytics-language-select" class="profile-edit-input">
            <option value="all" ${ANALYTICS_STATE.languageFilter === 'all' ? 'selected' : ''}>Todos os idiomas</option>
            ${langOptions}
          </select>
        </div>
        <div class="analytics-filter-item">
          <label class="profile-edit-label" for="analytics-device-select">Dispositivo</label>
          <select id="analytics-device-select" class="profile-edit-input">
            <option value="all" ${ANALYTICS_STATE.deviceFilter === 'all' ? 'selected' : ''}>Todos os dispositivos</option>
            ${deviceOptions}
          </select>
        </div>
      </div>
      ${customRangeHTML}
      <div class="analytics-compare-row">
        <span class="pref-row-title">Comparar com período anterior</span>
        <button class="pref-switch" id="analytics-compare-switch" role="switch" aria-checked="${ANALYTICS_STATE.compare ? 'true' : 'false'}"><span class="pref-switch-knob"></span></button>
      </div>
      <p class="admin-badge-desc">Período: ${rangeLabel}${compareLabel}</p>
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
    ? '<p class="admin-badge-desc">Taxa de conclusão indisponível: nenhum dos tipos com evento de início teve atividade no período.</p>'
    : `<p class="admin-badge-desc">Calculada só sobre os tipos com evento de início (flashcards, revisão rápida, jogo da memória, hanzi, ditado, conjugação) -- ver aba Exercícios.</p>`;
  return `
    <div class="profile-section">
      <div class="section-label">Resumo</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.activeStudents, 'Alunos ativos', null, d('activeStudents'))}
        ${analyticsKpiTileHTML(stats.newStudents, 'Novos alunos', null, d('newStudents'))}
        ${analyticsKpiTileHTML(stats.sessions, 'Sessões', null, d('sessions'))}
        ${analyticsKpiTileHTML(stats.exercisesStarted, 'Exercícios iniciados', 'só tipos com evento de início', d('exercisesStarted'))}
        ${analyticsKpiTileHTML(stats.exercisesCompleted, 'Exercícios concluídos', null, d('exercisesCompleted'))}
        ${analyticsKpiTileHTML(stats.overallCompletionRate === null ? '—' : `${stats.overallCompletionRate}%`, 'Taxa de conclusão', null, stats.overallCompletionRate === null ? null : d('overallCompletionRate'))}
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
        ${analyticsKpiTileHTML(stats.newActiveCount, 'Novos (ativos no período)')}
        ${analyticsKpiTileHTML(stats.returningActiveCount, 'Recorrentes')}
      </div>
      <p class="admin-badge-desc">"Novo" = conta criada dentro do período selecionado (via profiles.created_at); "recorrente" = já existia antes disso. Ver limitações sobre contas anteriores à criação automática de perfil.</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Alunos ativos por dia</div>
      ${stats.activeByDayRows.length ? analyticsBarRowsHTML(stats.activeByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">Sessões por dia</div>
      ${stats.sessionsByDayRows.length ? analyticsBarRowsHTML(stats.sessionsByDayRows.map(r => ({ name: r.day, count: r.count })), {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">Frequência de estudo (dias ativos no período)</div>
      ${freqRows.some(r => r.count) ? analyticsBarRowsHTML(freqRows, {}) : analyticsEmptyNoteHTML()}
    </div>
  `;
}

function renderNavegacaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">Áreas (abas)</div>
      ${stats.areaRows.length ? analyticsBarRowsHTML(stats.areaRows, ANALYTICS_TAB_LABELS) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">Funcionalidades (tipos de exercício)</div>
      ${stats.featureRows.length ? analyticsBarRowsHTML(stats.featureRows, ANALYTICS_LESSON_EVENT_LABELS) : analyticsEmptyNoteHTML()}
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
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.started}</span><span class="analytics-funnel-stage-label">Iniciou</span></div>
          <div class="analytics-funnel-arrow">→</div>
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.completed}</span><span class="analytics-funnel-stage-label">Concluiu${r.completionRate !== null ? ` (${r.completionRate}%)` : ''}</span></div>
          <div class="analytics-funnel-arrow">→</div>
          <div class="analytics-funnel-stage"><span class="analytics-funnel-num">${r.avgScore === null ? '—' : r.avgScore + '%'}</span><span class="analytics-funnel-stage-label">${highScore ? 'Acertou bem ✓' : 'Nota média'}</span></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="profile-section">
      <div class="section-label">Exercícios por tipo</div>
      ${stats.exerciseRows.length ? `
        <div class="analytics-table-wrap">
          <table class="analytics-table">
            <thead><tr><th>Exercício</th><th>Iníc.</th><th>Feitos</th><th>Taxa</th><th>Nota</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="admin-badge-desc">"—" = sem evento de início (vocab_lesson/unit_checkpoint/challenge) ou sem conceito de nota pra esse tipo. Popularidade (concluídos) e desempenho (nota média) são colunas separadas de propósito -- um exercício muito feito não é necessariamente um exercício com nota alta.</p>
      ` : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">Funil: iniciou → concluiu → acertou bem</div>
      ${funnelRows.length ? funnelHTML + `<p class="admin-badge-desc">Só os tipos com evento de início entram no funil (mesma limitação da taxa de conclusão geral). "Respondeu" (por pergunta individual) não existe como evento -- o funil vai direto de "iniciou" pra "concluiu". "Acertou bem" = nota média ≥ 80%, mesmo corte do desafio "Pontue mais de 80%".</p>` : analyticsEmptyNoteHTML('Nenhum tipo com evento de início teve atividade no período.')}
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
      <div class="section-label">Eventos por idioma</div>
      ${rows.length ? analyticsBarRowsHTML(rows, Object.fromEntries(AVAILABLE_LANGUAGES.map(l => [l.appKey, l.name]))) : analyticsEmptyNoteHTML()}
      ${ANALYTICS_STATE.languageFilter !== 'all' ? `<p class="admin-badge-desc">Filtro de idioma ativo (${langName(ANALYTICS_STATE.languageFilter)}) -- pra comparar idiomas lado a lado, selecione "Todos os idiomas" no filtro acima.</p>` : ''}
      <p class="admin-badge-desc">Segmentação por nível/funcionalidade/exercício/coorte/tipo de usuário já existe nas abas Progressão, Exercícios, Retenção e no toggle "Excluir minha atividade" -- não repetidas aqui como filtros globais pra não criar combinações sem sentido (ex: nível não se aplica a um "tab_switch").</p>
    </div>
  `;
}

function renderProgressaoSectionHTML(stats){
  return `
    <div class="profile-section">
      <div class="section-label">Alunos por nível</div>
      ${stats.levelRows.length ? analyticsBarRowsHTML(stats.levelRows, {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">Só cobre unidades do idioma do app em que este Painel está aberto agora -- eventos do outro idioma caem em "Nível desconhecido" (cada site só carrega o conteúdo do próprio idioma).</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Unidades concluídas por aluno (checkpoints)</div>
      ${stats.unitsCompletedBuckets.some(b => b.count) ? analyticsBarRowsHTML(stats.unitsCompletedBuckets.map(b => ({ name: b.label, count: b.count })), {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">Nem toda unidade tem lições internas (ex: unidades de gramática no francês) -- essas pontuam como um bloco único de exercícios, e concluí-las gera um checkpoint sem nenhuma "lição concluída" correspondente. Já unidades com lições só geram o checkpoint depois de passar por todas elas. Por isso um aluno pode aparecer aqui com mais unidades concluídas do que lições concluídas.</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Lições concluídas por aluno</div>
      ${stats.lessonsCompletedBuckets.some(b => b.count) ? analyticsBarRowsHTML(stats.lessonsCompletedBuckets.map(b => ({ name: b.label, count: b.count })), {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">"Avanço de nível" (velocidade de progressão entre níveis ao longo do tempo) fica pra uma etapa futura -- exigiria acompanhar a mesma conta em vários períodos, não só um recorte.</p>
    </div>
  `;
}

function renderDispositivosSectionHTML(stats){
  const hasData = stats.deviceRows.some(r => r.name !== 'desconhecido');
  return `
    <div class="profile-section">
      <div class="section-label">Tipo de dispositivo</div>
      ${stats.deviceRows.length ? analyticsBarRowsHTML(stats.deviceRows, ANALYTICS_DEVICE_LABELS) : analyticsEmptyNoteHTML()}
      ${!hasData ? '<p class="admin-badge-desc">Todos os eventos no período são de antes da coleta de dispositivo existir (migration 009) -- por isso caem em "desconhecido". Dados novos já vêm classificados.</p>' : ''}
    </div>

    <div class="profile-section">
      <div class="section-label">Navegador</div>
      ${stats.browserRows.length ? analyticsBarRowsHTML(stats.browserRows, {}) : analyticsEmptyNoteHTML()}
    </div>

    <div class="profile-section">
      <div class="section-label">Sistema operacional</div>
      ${stats.osRows.length ? analyticsBarRowsHTML(stats.osRows, {}) : analyticsEmptyNoteHTML()}
      <p class="admin-badge-desc">Classificação por navigator.userAgent (heurística simples, sem biblioteca) -- não é 100% precisa, mas é o padrão aceitável sem telemetria de terceiros.</p>
    </div>
  `;
}

// Engajamento + Gamificação (Fase 4, itens 4 e 5) -- unidos numa aba só:
// o próprio prompt-mestre lista XP/streak nos dois grupos, e mostrar as
// mesmas duas métricas em duas abas diferentes seria exatamente a
// duplicação que a revisão arquitetural desta fase pediu pra evitar.
function renderEngajamentoSectionHTML(stats, weeklyXp, badgeGrants){
  const totalXpThisWeek = weeklyXp.reduce((sum, r) => sum + (r.amount || 0), 0);
  const avgXpThisWeek = weeklyXp.length ? Math.round(totalXpThisWeek / weeklyXp.length) : 0;
  const badgeCount = badgeGrants.length;
  const badgedStudents = new Set(badgeGrants.map(g => g.user_id)).size;
  const leaderboardViews = stats.areaRows.find(r => r.name === 'leaderboard')?.count || 0;

  const revisoesTypes = ['flashcard_review', 'speed_review', 'hanzi_review'];
  const revisoesTotal = stats.exerciseRows.filter(r => revisoesTypes.includes(r.name)).reduce((sum, r) => sum + r.completed, 0);
  const desafiosTotal = stats.exerciseRows.find(r => r.name === 'challenge')?.completed || 0;

  return `
    <div class="profile-section">
      <div class="section-label">Engajamento</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(stats.sessions, 'Sessões')}
        ${analyticsKpiTileHTML(stats.exercisesPerSession === null ? '—' : stats.exercisesPerSession, 'Exercícios/sessão')}
        ${analyticsKpiTileHTML(revisoesTotal, 'Revisões concluídas')}
        ${analyticsKpiTileHTML(desafiosTotal, 'Desafios concluídos')}
      </div>
      <p class="admin-badge-desc">Frequência de estudo (dias ativos por aluno) já está na aba Atividade -- não repetida aqui.</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Gamificação</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(totalXpThisWeek, 'XP total (semana atual)')}
        ${analyticsKpiTileHTML(avgXpThisWeek, 'XP médio/aluno (semana atual)')}
        ${analyticsKpiTileHTML(stats.avgLongestStreak, 'Sequência média (dias)', 'proxy calculado a partir dos eventos')}
        ${analyticsKpiTileHTML(stats.maxLongestStreak, 'Maior sequência (dias)')}
        ${analyticsKpiTileHTML(badgeCount, 'Conquistas concedidas')}
        ${analyticsKpiTileHTML(leaderboardViews, 'Visualizações do Ranking')}
      </div>
      <p class="admin-badge-desc">XP usa a mesma semana (segunda a domingo) já mostrada no Ranking -- não é "XP gerado no período selecionado acima", é sempre a semana corrente. Sequência é uma aproximação calculada a partir dos dias com atividade registrada, não o streak "oficial" do app (que tem regras próprias como dias de folga e mora fora do alcance deste painel). ${badgedStudents ? `${badgedStudents} ${badgedStudents === 1 ? 'aluno(a) recebeu' : 'alunos(as) receberam'} pelo menos uma conquista no período.` : ''}</p>
    </div>
  `;
}

function renderTecnologiaSectionHTML(tech){
  return `
    <div class="profile-section">
      <div class="section-label">Erros e falhas</div>
      <div class="analytics-kpi-grid">
        ${analyticsKpiTileHTML(tech.totalErrors, 'Erros registrados')}
        ${analyticsKpiTileHTML(tech.affectedStudents, 'Alunos(as) afetados(as)')}
      </div>
      ${tech.errorRows.length ? analyticsBarRowsHTML(tech.errorRows, ANALYTICS_TECHNICAL_ERROR_LABELS) : analyticsEmptyNoteHTML('Nenhum erro técnico registrado no período.')}
      <p class="admin-badge-desc">Cobre erro de JavaScript, promise rejeitada, falha ao carregar/tocar áudio e falha ao salvar progresso -- todos com deduplicação por sessão (um erro que se repete não infla a contagem). Não há categoria de vídeo: o app não tem conteúdo em vídeo.</p>
    </div>

    <div class="profile-section">
      <div class="section-label">Performance</div>
      ${tech.perfSampleCount ? `
        <div class="analytics-kpi-grid">
          ${analyticsKpiTileHTML(`${tech.avgLoadMs}ms`, 'Carregamento médio')}
          ${analyticsKpiTileHTML(`${tech.medianLoadMs}ms`, 'Carregamento mediano')}
        </div>
        <p class="admin-badge-desc">${tech.perfSampleCount} ${tech.perfSampleCount === 1 ? 'sessão medida' : 'sessões medidas'} (Navigation Timing API, um registro por carregamento de página).</p>
      ` : analyticsEmptyNoteHTML('Nenhuma medição de performance no período.')}
    </div>

    <p class="admin-badge-desc">Esta aba é conceitualmente separada de Aprendizagem/Produto -- nunca soma erros técnicos junto com taxa de conclusão, nota média etc. Uma nota TÉCNICA baixa aqui não significa que o conteúdo é difícil, e o contrário também vale.</p>
  `;
}

function renderRetencaoSectionHTML(cohorts){
  if (!cohorts.length) return analyticsEmptyNoteHTML('Nenhuma conta encontrada pra montar coortes.');
  const rows = cohorts.map(c => {
    const cells = ANALYTICS_COHORT_OFFSETS.map(offset => {
      const r = c.retention[offset];
      return `<td>${r === null ? '—' : `${r.pct}% <span class="admin-badge-desc" style="display:inline">(${r.returned}/${r.eligible})</span>`}</td>`;
    }).join('');
    return `<tr><td>${analyticsFormatDate(new Date(c.week + 'T00:00:00'))}</td><td>${c.size}</td>${cells}</tr>`;
  }).join('');
  return `
    <div class="profile-section">
      <div class="section-label">Retenção por coorte (semana de cadastro)</div>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead><tr><th>Coorte</th><th>Alunos</th><th>Dia 1</th><th>Dia 7</th><th>Dia 14</th><th>Dia 30</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="admin-badge-desc">Coorte = alunos cuja conta foi criada na mesma semana (segunda a domingo). "Dia N" = teve pelo menos uma atividade registrada no dia civil que cai exatamente N dias após a criação da conta -- "—" quando a coorte ainda não completou esse número de dias (nunca mostrado como 0%). Usa todo o histórico disponível (até 5000 eventos mais recentes), não o filtro de período dos controles acima -- retenção é uma pergunta sobre o tempo todo, não uma janela.</p>
    </div>
  `;
}

// ---------- Render: navegação interna (abas) ----------
// Escalável de propósito: uma aba nova é só mais uma entrada aqui e mais
// um botão no HTML gerado -- nenhuma outra parte do arquivo precisa saber
// quantas abas existem.
const ANALYTICS_TABS = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'atividade', label: 'Atividade' },
  { key: 'retencao', label: 'Retenção' },
  { key: 'navegacao', label: 'Navegação' },
  { key: 'exercicios', label: 'Exercícios' },
  { key: 'progressao', label: 'Progressão' },
  { key: 'engajamento', label: 'Engajamento' },
  { key: 'idioma', label: 'Idioma' },
  { key: 'dispositivos', label: 'Dispositivos' },
  { key: 'tecnologia', label: 'Tecnologia' },
];

function analyticsSubnavHTML(){
  const tabsHTML = ANALYTICS_TABS.map(t =>
    `<button class="leaderboard-tab ${ANALYTICS_STATE.tab === t.key ? 'active' : ''}" role="tab" aria-selected="${ANALYTICS_STATE.tab === t.key}" data-analytics-tab="${t.key}">${t.label}</button>`
  ).join('');
  return `<div class="leaderboard-tabs" role="tablist" aria-label="Seção do Analytics">${tabsHTML}</div>`;
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
  panel.innerHTML = `<p class="profile-loading">Carregando...</p>`;

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
  const toggleHTML = analyticsExcludeOwnToggleHTML(excludeOwn);

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
    ? `<p class="profile-empty-note">Nenhum evento de aluno registrado no período selecionado.</p>`
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

  wireAnalyticsExcludeOwnToggle();
  wireAnalyticsControls();
  wireAnalyticsSubnav();
  await switchAnalyticsTab(ANALYTICS_STATE.tab);
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
