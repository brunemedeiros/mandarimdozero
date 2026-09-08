// ---------- Notification Cron ----------
//
// A peça que hoje simplesmente não existe na plataforma: código rodando
// FORA do navegador de qualquer aluno, com acesso de service role ao
// Supabase. Sem isso, nenhuma notificação "de ausência" (streak em risco,
// revisão atrasada, reengajamento) é possível -- o app só roda quando
// alguém abre a aba, e ninguém abre a aba pra ser avisado que devia abrir
// a aba (ver seção 3 da arquitetura aprovada, "por que hoje não escala").
//
// Fase 0 (concluída): só provou que o encanamento funciona -- deploy,
// invocação, leitura das tabelas novas com service role. Nenhuma lógica
// de negócio.
//
// Fase 2: ligou a lógica real dos 3 eventos "Cron" de maior valor
// pedagógico (seção 14) + o início do calendário de reengajamento (seção
// 13, só os dias 1-9 -- 15/20/30 são e-mail, Fase 5):
//   - review_overdue        -- revisão parada há dias, ninguém abriu o app
//   - streak_at_risk        -- não estudou hoje, tem sequência a perder
//   - study_goal_remaining  -- hoje é dia de meta e ela não foi batida
//   - user_inactive_N       -- sumiu há N dias (N ∈ {1,3,5,7,9})
//
// Fase 3 (agora): quando a conta tiver push habilitado pra categoria E
// pelo menos uma inscrição de navegador salva (push_subscriptions,
// migration 013), este arquivo TAMBÉM envia push direto -- diferente do
// motor client-side (shared/notifications.js), que precisa chamar a Edge
// Function push-send à parte, este já roda no servidor, então envia sem
// intermediário.
//
// LIMITAÇÃO CONHECIDA (fuso horário): a plataforma não guarda o fuso de
// ninguém. O cliente grava `lastStudyDay`/`dailyLessonsLog` no fuso LOCAL
// do navegador (ver todayStr() em shared/srs.js); este arquivo roda uma
// vez por dia num horário FIXO em UTC e usa UTC pra calcular "hoje". Pra
// minimizar o descasamento pro público majoritariamente brasileiro
// (UTC-3), agende a invocação diária entre 21h-23h UTC (18h-20h em
// horário de Brasília) -- nesse intervalo a data em UTC e a data local no
// Brasil ainda coincidem. Não é uma correção de verdade (só funciona bem
// pra quem está nesse fuso), mas é a mitigação possível sem coletar
// timezone por conta -- fica registrado como próximo refinamento.
//
// Sem {{word}} ainda (nomear a palavra específica, seção 14): os cards em
// `progress` só guardam um id técnico (ex: "u3-v7"), o texto em si vive em
// content.js (estático, por idioma, sem acesso do lado do servidor hoje).
// As notificações desta fase são por CONTAGEM.
//
// Fase 4: Ranking/Desafios (seção 18 -- "menor prioridade pedagógica, mas
// dado já existe"). Mudança de posição no ranking é evento CLIENTE (ver
// shared/leaderboard.js:animateOwnRowRankChange -- dispara ao abrir a
// tela, não precisa de cron). Este arquivo ganha os outros dois:
//   - ranking_weekly_result   -- toda segunda (UTC), soma weekly_xp da
//     semana que terminou e avisa a posição final de cada participante
//   - daily_missions_reminder -- a pessoa começou pelo menos 1 das 3
//     "Missões do dia" mas não terminou todas -- pools/sorteio determinís-
//     tico portados de languages/<lang>/app.js (MISSION_POOLS abaixo),
//     mesmo dailySeed()/pickDailyFromPool()
//
// Deploy + agendamento são passos manuais (ver PR).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Mesmos 3 secrets manuais de supabase/functions/push-send (ver comentário
// lá) -- os dois arquivos enviam push, cada um do seu próprio contexto.
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:brunemed1310@gmail.com';
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

// Mesmos appKey de languages/index.js -- duplicado aqui de propósito (este
// arquivo roda em runtime Deno separado, não importa módulos do site).
const LANGUAGES = [
  { appKey: 'frances' },
  { appKey: 'mandarim' },
];

// domingo=0 .. sábado=6, mesma convenção de DAY_KEY_BY_JS_INDEX em
// shared/wizard.js -- aqui aplicada sobre getUTCDay() (ver limitação de
// fuso acima).
const DAY_KEY_BY_UTC_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Portado de EASY_CHALLENGES/REVISAO_CONJ_CHALLENGES/REVISAO_HANZI_CHALLENGES/
// GENERAL_CHALLENGES em languages/<lang>/app.js -- só id/target/campo (o
// texto do label não importa aqui, a notificação não nomeia a missão em
// si, só conta quantas faltam). "special: 'lastStudyDay'" é a única
// missão que não lê um campo de STATE.daily.
type MissionDef = { id: string; target: number; field?: string; special?: 'lastStudyDay' };
const MISSION_POOLS: Record<string, { easy: MissionDef[]; secondary: MissionDef[]; general: MissionDef[] }> = {
  frances: {
    easy: [
      { id: 'streak', target: 1, special: 'lastStudyDay' },
      { id: 'firstLesson', target: 1, field: 'lessons' },
    ],
    secondary: [
      { id: 'conj1', target: 1, field: 'conjugationSessions' },
      { id: 'conjCorrect10', target: 10, field: 'conjugationCorrect' },
      { id: 'conjTenses2', target: 2, field: 'conjugationTenses.length' },
      { id: 'reviews15', target: 15, field: 'reviewsDone' },
      { id: 'speedReview1', target: 1, field: 'speedReviewSessions' },
      { id: 'matchGame1', target: 1, field: 'matchGamesPlayed' },
      { id: 'overdue3', target: 3, field: 'overdueReviewsDone' },
    ],
    general: [
      { id: 'stars40', target: 40, field: 'stars' },
      { id: 'highscore2', target: 2, field: 'highScoreLessons' },
      { id: 'perfect1', target: 1, field: 'perfectLessons' },
      { id: 'grammar1', target: 1, field: 'grammarLessons' },
      { id: 'listen10', target: 10, field: 'audioPlaysToday' },
      { id: 'translateBlocks2', target: 2, field: 'exerciseFormatCounts.reorder' },
    ],
  },
  mandarim: {
    easy: [
      { id: 'streak', target: 1, special: 'lastStudyDay' },
      { id: 'firstLesson', target: 1, field: 'lessons' },
    ],
    secondary: [
      { id: 'hanzi1', target: 1, field: 'hanziLessons' },
      { id: 'reviews15', target: 15, field: 'reviewsDone' },
      { id: 'speedReview1', target: 1, field: 'speedReviewSessions' },
      { id: 'matchGame1', target: 1, field: 'matchGamesPlayed' },
      { id: 'overdue3', target: 3, field: 'overdueReviewsDone' },
    ],
    general: [
      { id: 'stars40', target: 40, field: 'stars' },
      { id: 'highscore2', target: 2, field: 'highScoreLessons' },
      { id: 'perfect1', target: 1, field: 'perfectLessons' },
      { id: 'hanzi2', target: 2, field: 'hanziLessons' },
      { id: 'listen10', target: 10, field: 'audioPlaysToday' },
      { id: 'translateBlocks2', target: 2, field: 'exerciseFormatCounts.reorder' },
    ],
  },
};

// Idêntico a dailySeed()/pickDailyFromPool() em languages/<lang>/app.js --
// mesma fórmula, senão sortearia missões DIFERENTES das que a pessoa vê
// na tela dela.
function dailySeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pickDailyFromPool<T>(pool: T[], dateKey: string, salt: string): T {
  return pool[dailySeed(`${dateKey}:${salt}`) % pool.length];
}

function getFieldValue(daily: any, field: string): number {
  const raw = field.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), daily);
  return Number(raw) || 0;
}

// state.lastStudyDay/state.daily.date são gravados no fuso LOCAL do
// navegador (ver limitação de fuso no topo do arquivo) -- comparar os dois
// ENTRE SI (em vez de contra o "hoje" em UTC deste cron) mede exatamente a
// mesma coisa que o cliente mediria, sem herdar o descasamento de fuso.
function missionCurrent(mission: MissionDef, state: any): number {
  if (mission.special === 'lastStudyDay') return state.lastStudyDay === state.daily?.date ? 1 : 0;
  return getFieldValue(state.daily, mission.field!);
}

// null = sem bucket de hoje pra este idioma (state.daily.date ausente) --
// nada a avaliar, bem diferente de "começou e não terminou".
function computeMissionProgress(languageAppKey: string, state: any): { current: number; target: number }[] | null {
  const pools = MISSION_POOLS[languageAppKey];
  const dateKey = state.daily?.date;
  if (!pools || !dateKey) return null;
  const missions = [
    pickDailyFromPool(pools.easy, dateKey, 'easy'),
    pickDailyFromPool(pools.secondary, dateKey, 'revcon'),
    pickDailyFromPool(pools.general, dateKey, 'general'),
  ];
  return missions.map((m) => ({ current: Math.min(missionCurrent(m, state), m.target), target: m.target }));
}

// Segunda-feira (UTC) da semana que contém `date` -- mesma regra de
// leaderboardCurrentWeekStart() (shared/leaderboard.js), só que sobre
// getUTCDay() em vez do fuso local do navegador.
function mondayUTCDateKey(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

// "Devida" (due <= agora) já é coberta pelo banner in-app existente
// (maybeShowReviewReminder, 15+ cartas) quando alguém abre o app --
// "atrasada" aqui é mais forte: due há mais de 48h E pelo menos 3 cartas,
// pra não notificar por 1 carta perdida ou por algo que ficou due há 10
// minutos.
const REVIEW_OVERDUE_STALE_MS = 48 * 60 * 60 * 1000;
const REVIEW_OVERDUE_MIN_COUNT = 3;

function todayDateKeyUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

function computeReviewOverdueCount(cards: any[] | undefined): number {
  const now = Date.now();
  return (cards || []).filter((c) => c && c.reps > 0 && c.due && (now - c.due) > REVIEW_OVERDUE_STALE_MS).length;
}

function fillPlaceholders(text: string | null | undefined, payload: Record<string, unknown>): string {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (payload && payload[key] != null ? String(payload[key]) : ''));
}

function categoryAllowsInApp(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return true; // sem preferência salva ainda -- não bloqueia (mesmo default da coluna)
  return channels.includes('in_app');
}

function categoryAllowsPush(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return false; // push exige opt-in explícito, mesmo critério de shared/notifications.js
  return channels.includes('push');
}

// Envia push pra TODAS as inscrições de navegador da conta (pode ter mais
// de uma -- celular + notebook). Poda inscrição morta (404/410) igual
// supabase/functions/push-send -- os dois arquivos têm essa lógica
// duplicada de propósito (contextos de execução diferentes: um usa
// service role sobre TODAS as contas, o outro roda como o próprio
// usuário) -- extrair um módulo compartilhado exigiria um terceiro
// arquivo importado pelos dois, mais complexidade do que a duplicação de
// ~15 linhas justifica aqui.
async function sendPushToUser(supabase: any, userId: string, title: string, body: string, actionTab: string): Promise<void> {
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  if (error || !subs?.length) return;

  const messagePayload = JSON.stringify({ title, body, actionTab: actionTab || null });
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, messagePayload);
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('notification-cron: falha ao enviar push', userId, String(e?.message || e));
      }
    }
  }
}

// Horário silencioso só vale pra eventos calculados automaticamente (este
// arquivo) -- os imediatos (XP, badge...) continuam em shared/notifications.js,
// sem checar isto (ver copy da tela de preferências). Números tratados
// como hora UTC (mesma aproximação/limitação documentada acima).
function isWithinQuietHours(prefs: any): boolean {
  const start = prefs?.quiet_hours_start;
  const end = prefs?.quiet_hours_end;
  if (start == null || end == null || start === end) return false;
  const hour = new Date().getUTCHours();
  return start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
}

async function getPrefs(supabase: any, cache: Map<string, any>, userId: string): Promise<any> {
  if (cache.has(userId)) return cache.get(userId);
  const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) console.error('notification-cron: erro ao ler preferências', userId, error);
  cache.set(userId, data || null);
  return data || null;
}

// Mesmo anti-spam do motor client-side (shared/notifications.js:passesAntiSpam),
// portado pra cá -- reusa as MESMAS regras (notification_rules) e a MESMA
// tabela notifications pra contar cooldown/limite diário, então um evento
// imediato e um de cron da mesma categoria competem pelo mesmo limite
// (correto: é uma pessoa só recebendo, não dois orçamentos separados).
async function passesAntiSpam(supabase: any, rules: Map<string, any>, userId: string, category: string): Promise<boolean> {
  const rule = rules.get(category);
  if (!rule || !rule.active) return false;

  const startOfDayIso = `${todayDateKeyUTC()}T00:00:00.000Z`;
  const todayCount = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('category', category).gte('created_at', startOfDayIso);
  if (rule.daily_cap > 0 && (todayCount.count || 0) >= rule.daily_cap) return false;

  if (rule.cooldown_minutes > 0) {
    const since = new Date(Date.now() - rule.cooldown_minutes * 60000).toISOString();
    const cooldownCount = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('category', category).gte('created_at', since);
    if ((cooldownCount.count || 0) > 0) return false;
  }
  return true;
}

async function pickTemplate(supabase: any, eventType: string, languageAppKey: string): Promise<any> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('event_type', eventType).eq('channel', 'in_app').eq('language_app_key', languageAppKey).eq('active', true);
  if (error || !data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

// Ponto único de disparo -- espelha fireNotificationEvent() do cliente
// (shared/notifications.js), com source:'cron' em vez de 'client'. Sempre
// grava o evento bruto em notification_events, mesmo quando descartado
// depois (preferência, silêncio ou anti-spam) -- é o log de auditoria.
async function maybeNotify(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>,
  userId: string, languageAppKey: string, eventType: string, category: string,
  payload: Record<string, unknown>, actionTab: string,
): Promise<boolean> {
  await supabase.from('notification_events').insert({
    user_id: userId, language_app_key: languageAppKey, event_type: eventType, payload, source: 'cron',
  });

  const prefs = await getPrefs(supabase, prefsCache, userId);
  if (!categoryAllowsInApp(prefs, category)) return false;
  if (isWithinQuietHours(prefs)) return false;
  if (!(await passesAntiSpam(supabase, rules, userId, category))) return false;

  const template = await pickTemplate(supabase, eventType, languageAppKey);
  if (!template) return false;

  const title = fillPlaceholders(template.title, payload);
  const body = fillPlaceholders(template.body, payload);
  if (!body) return false;

  const { error } = await supabase.from('notifications').insert({
    user_id: userId, language_app_key: languageAppKey, category, event_type: eventType,
    title: title || null, body, action_tab: actionTab || null,
  });
  if (error) return false;

  // Push "pendura" no in-app aqui também -- mesma simplificação documentada
  // em shared/notifications.js:fireNotificationEvent (anti-spam só existe
  // sobre `notifications`, então desligar in_app desliga push junto nesta
  // fase). AWAIT de propósito (diferente do client, que dispara e segue
  // sem esperar): esta function roda até o fim antes de responder, sem
  // nenhum "waitUntil" que garanta uma promise solta terminar depois da
  // resposta -- e uma falha de push aqui já está isolada em try/catch
  // dentro de sendPushToUser, não derruba o resto da varredura.
  if (categoryAllowsPush(prefs, category)) await sendPushToUser(supabase, userId, title || 'Notificação', body, actionTab);

  return true;
}

async function processUserLanguage(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>,
  userId: string, languageAppKey: string, state: any,
): Promise<number> {
  let created = 0;
  const today = todayDateKeyUTC();

  // 1) Revisão atrasada
  const dueCount = computeReviewOverdueCount(state.cards);
  if (dueCount >= REVIEW_OVERDUE_MIN_COUNT) {
    if (await maybeNotify(supabase, rules, prefsCache, userId, languageAppKey, 'review_overdue', 'revisao', { dueCount }, 'review')) created++;
  }

  // 2) Sequência em risco -- tem sequência (algo a perder) e ainda não
  // estudou "hoje" (ver limitação de fuso no topo do arquivo).
  if ((state.streak || 0) > 0 && state.lastStudyDay !== today) {
    if (await maybeNotify(supabase, rules, prefsCache, userId, languageAppKey, 'streak_at_risk', 'streak', { days: state.streak }, 'path')) created++;
  }

  // 3) Meta do dia não batida -- só nos dias que a própria pessoa escolheu
  // no assistente de meta (studyGoal.days), mesma fonte que o app já usa
  // pro lembrete local (maybeSendStudyReminder).
  const goal = state.studyGoal?.dailyLessonsGoal || 0;
  const todayWeekdayKey = DAY_KEY_BY_UTC_INDEX[new Date().getUTCDay()];
  if (goal > 0 && state.studyGoal?.days?.[todayWeekdayKey]) {
    const done = state.dailyLessonsLog?.[today] || 0;
    if (done < goal) {
      const lessonsRemaining = goal - done;
      if (await maybeNotify(supabase, rules, prefsCache, userId, languageAppKey, 'study_goal_remaining', 'estudo', { lessonsRemaining, goal }, 'path')) created++;
    }
  }

  // 4) Reengajamento -- só dias 1-9 nesta fase (15/20/30 são canal e-mail,
  // Fase 5). daysSince(null) é null pra quem nunca estudou -- de propósito
  // fora do calendário: reengajamento é sobre quem sumiu, não quem nunca
  // começou.
  const inactiveDays = daysSince(state.lastStudyDay);
  const reengRule = rules.get('reengajamento');
  const scheduleDays: number[] = (reengRule?.schedule_days || []).filter((d: number) => d <= 9);
  if (inactiveDays !== null && scheduleDays.includes(inactiveDays)) {
    if (await maybeNotify(supabase, rules, prefsCache, userId, languageAppKey, `user_inactive_${inactiveDays}`, 'reengajamento', {}, 'path')) created++;
  }

  // 5) Missões do dia começadas, não terminadas (Fase 4) -- "começou"
  // exige progresso > 0 em pelo menos uma; sem isso, alguém que nem abriu
  // o app hoje receberia isto JUNTO com streak_at_risk/study_goal_remaining
  // (redundante -- essas duas já cobrem "não estudou hoje").
  const missions = computeMissionProgress(languageAppKey, state);
  if (missions) {
    const anyStarted = missions.some((m) => m.current > 0);
    const missing = missions.filter((m) => m.current < m.target).length;
    if (anyStarted && missing > 0) {
      if (await maybeNotify(supabase, rules, prefsCache, userId, languageAppKey, 'daily_missions_reminder', 'desafios', { missing }, 'path')) created++;
    }
  }

  return created;
}

// Roda 1x por invocação (não por usuário/idioma) -- só faz sentido às
// segundas (UTC), quando uma semana acabou de virar. Ranking "Geral" (soma
// de todos os idiomas por conta), mesmo cálculo de
// shared/leaderboard.js:fetchLeaderboard('all', weekStart) -- só que sobre
// a semana que TERMINOU ontem, não a atual.
async function processWeeklyRankingResults(supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>): Promise<number> {
  if (new Date().getUTCDay() !== 1) return 0;

  const endedWeekStart = mondayUTCDateKey(new Date(Date.now() - 7 * 86400000));
  const { data: rows, error } = await supabase.from('weekly_xp').select('user_id, language_app_key, amount').eq('week_start', endedWeekStart);
  if (error || !rows?.length) return 0;

  const totals = new Map<string, number>();
  const langTotalsByUser = new Map<string, Map<string, number>>();
  for (const row of rows) {
    totals.set(row.user_id, (totals.get(row.user_id) || 0) + row.amount);
    const langMap = langTotalsByUser.get(row.user_id) || new Map<string, number>();
    langMap.set(row.language_app_key, (langMap.get(row.language_app_key) || 0) + row.amount);
    langTotalsByUser.set(row.user_id, langMap);
  }

  const ranked = [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  let created = 0;
  for (let i = 0; i < ranked.length; i++) {
    const [userId] = ranked[i];
    const rank = i + 1;
    // Idioma "dominante" da conta na semana -- só decide em qual
    // language_app_key a notificação fica registrada (o texto do template
    // é idêntico nos dois, ver migration 014), não afeta o cálculo do rank.
    const langMap = langTotalsByUser.get(userId);
    const dominantLang = langMap ? [...langMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : 'frances';
    if (await maybeNotify(supabase, rules, prefsCache, userId, dominantLang, 'ranking_weekly_result', 'ranking', { rank, totalParticipants: ranked.length }, 'leaderboard')) created++;
  }
  return created;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rulesResult = await supabase.from('notification_rules').select('*');
  if (rulesResult.error) {
    console.error('notification-cron: falha ao ler notification_rules', rulesResult.error);
    return new Response(JSON.stringify({ ok: false, error: rulesResult.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const rules = new Map<string, any>(rulesResult.data.map((r: any) => [r.category, r]));

  // service role ignora RLS -- lê o progresso de TODAS as contas, é
  // exatamente o motivo dessa peça existir (ver cabeçalho do arquivo).
  const progressResult = await supabase.from('progress').select('user_id, data');
  if (progressResult.error) {
    console.error('notification-cron: falha ao ler progress', progressResult.error);
    return new Response(JSON.stringify({ ok: false, error: progressResult.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const prefsCache = new Map<string, any>();
  let usersScanned = 0;
  let notificationsCreated = 0;
  const errors: string[] = [];

  for (const row of progressResult.data ?? []) {
    for (const lang of LANGUAGES) {
      const state = row.data?.[lang.appKey];
      if (!state) continue; // conta nunca usou este idioma
      usersScanned++;
      try {
        notificationsCreated += await processUserLanguage(supabase, rules, prefsCache, row.user_id, lang.appKey, state);
      } catch (e) {
        errors.push(`${row.user_id}/${lang.appKey}: ${String(e)}`);
      }
    }
  }

  try {
    notificationsCreated += await processWeeklyRankingResults(supabase, rules, prefsCache);
  } catch (e) {
    errors.push(`ranking semanal: ${String(e)}`);
  }

  const summary = {
    ok: true,
    ranAt: new Date().toISOString(),
    phase: 'Fase 4 -- review_overdue, streak_at_risk, study_goal_remaining, reengajamento (1-9), daily_missions_reminder, ranking_weekly_result',
    usersScanned,
    notificationsCreated,
    errorCount: errors.length,
    errors: errors.slice(0, 10), // não devolve a lista inteira se algo deu muito errado
  };

  console.log('notification-cron summary:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
