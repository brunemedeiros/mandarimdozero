// ---------- Analytics (painel de Admin): rótulos, constantes e cálculos puros ----------
// Tudo aqui é função pura (dado -> dado) ou tabela de rótulos (só chama t()): sem rede e sem DOM, por isso é testado em Node
// (tests/painel-admin/test_analytics_calc_unit.js). Saiu de shared/admin-analytics.js sem mudar nenhuma regra de cálculo.
// A busca de dados e a orquestração da tela ficam em shared/admin-analytics.js; o HTML em shared/admin-analytics-ui.js.
//
// Lê, só em tempo de uso: shared/i18n (t, fmtDate), APP_KEY e UNITS (languages/<lang>/app.js, só para o nível das unidades).

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

function analyticsFormatMinutes(mins){
  if (!mins) return '0min';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h ${m}min` : `${m}min`;
}
