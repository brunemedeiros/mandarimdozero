// Notification Cron (versão publicada: mesma lógica de supabase/functions/notification-cron/index.ts do repositório, com os comentários longos encurtados).
// E3/C3 (2026-10-12): + sequência da conta (_account) para streak_at_risk, meta do dia e reengajamento, uma vez por pessoa.
// Roda fora do navegador com service role; fuso: usa UTC (agendar entre 21h-23h UTC).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:brunemed1310@gmail.com';
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

const LANGUAGES = [
  { appKey: 'frances', id: 'fr' },
  { appKey: 'mandarim', id: 'zh' },
];

const FOUNDER_EMAIL = 'brunemed1310@gmail.com';
const BETA_TESTER_CUTOFF = '2026-09-05T00:00:00Z';

const DAY_KEY_BY_UTC_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Missões do dia: o cliente congela as 3 missões em state.daily.missions; aqui só mapeamos id -> campo para calcular o progresso.
type MissionFieldDef = { field?: string; special?: 'lastStudyDay' };
const MISSION_FIELD_BY_ID: Record<string, MissionFieldDef> = {
  streak: { special: 'lastStudyDay' },
  firstLesson: { field: 'lessons' },
  conj1: { field: 'conjugationSessions' },
  conjCorrect10: { field: 'conjugationCorrect' },
  conjTenses2: { field: 'conjugationTenses.length' },
  hanzi1: { field: 'hanziLessons' },
  hanzi2: { field: 'hanziLessons' },
  reviews15: { field: 'reviewsDone' },
  speedReview1: { field: 'speedReviewSessions' },
  matchGame1: { field: 'matchGamesPlayed' },
  overdue3: { field: 'overdueReviewsDone' },
  stars40: { field: 'stars' },
  highscore2: { field: 'highScoreLessons' },
  perfect1: { field: 'perfectLessons' },
  grammar1: { field: 'grammarLessons' },
  listen10: { field: 'audioPlaysToday' },
  translateBlocks2: { field: 'exerciseFormatCounts.reorder' },
};

function getFieldValue(daily: any, field: string): number {
  const raw = field.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), daily);
  return Number(raw) || 0;
}

function missionCurrent(def: MissionFieldDef, state: any): number {
  if (def.special === 'lastStudyDay') return state.lastStudyDay === state.daily?.date ? 1 : 0;
  return getFieldValue(state.daily, def.field!);
}

function computeMissionProgress(state: any): { current: number; target: number }[] | null {
  const missions = state.daily?.missions;
  if (!Array.isArray(missions) || missions.length === 0 || !state.daily?.date) return null;
  return missions.map((m: { id: string; target: number }) => {
    const def = MISSION_FIELD_BY_ID[m.id] || {};
    return { current: Math.min(missionCurrent(def, state), m.target), target: m.target };
  });
}

function mondayUTCDateKey(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

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

// Portado de UNITS[].lessons[].vocabIdx (fr/content.js, zh/content.js) para replicar isCardLessonCompleted() no servidor.
const LESSON_VOCAB_MAP: Record<string, Record<string, number[][]>> = {
  frances: {
    "A1-1": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-2": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-3": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g1": [],
    "A1-4": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g2": [],
    "A1-5": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-6": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g3": [],
    "A1-7": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-8": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g4": [],
    "A1-9": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-10": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13], []],
    "A1-g10": [],
    "A1-11": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-12": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-13": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-14": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g5": [],
    "A1-15": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g6": [],
    "A1-16": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g7": [],
    "A1-17": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-18": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-19": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g8": [],
    "A1-20": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g9": []
  },
  mandarim: {
    "1": [[0,1,2], [3,4,5], [6,7], []],
    "2": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "3": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13], []],
    "4": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], []],
    "5": [[0,1,2], [3,4,5], [6,7,8], [9,10], []],
    "6": [[0,1,2], [3,4,5], [6,7,8], []],
    "7": [[0,1,2], [3,4,5], [6,7,8], []],
    "8": [[0,1,2], [3,4,5], [6,7,8], [9,10], []],
    "9": [[0,1,2], [3,4,5,6], []],
    "10": [[0,1,2], [3,4,5], [6,7], []],
    "11": [[0,1,2], [3,4,5], [6,7], []],
    "12": [[0,1,2], [3,4,5], [6,7], []],
    "13": [[0,1,2], [3,4,5,6], []],
    "14": [[0,1,2], [3,4,5], []],
    "15": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "16": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "17": [[0,1,2], [3,4,5], [6,7], []],
    "18": [[0,1,2], [3,4,5], [6,7,8,9], []]
  },
};

function isCardLessonCompletedServer(card: any, unitProgress: any, languageAppKey: string): boolean {
  const prog = unitProgress?.[card?.unitId];
  if (prog?.completed) return true;
  if (!prog?.started) return false;
  const lessons = LESSON_VOCAB_MAP[languageAppKey]?.[String(card.unitId)];
  const lessonIdx = lessons ? lessons.findIndex((vocabIdxList) => vocabIdxList.includes(card.vocabIdx)) : -1;
  if (lessonIdx === -1) return !!prog.completed;
  return lessonIdx < prog.lessonIdx;
}

const STUDY_CARD_ID_RE = /^(u.+-v(\d+))(-b)?$/;

function studyWordIdentity(card: any): { baseId: string; vocabIdx: number } | null {
  if (!card) return null;
  if (card.origin != null && card.origin !== 'study') return null;
  const m = typeof card.id === 'string' ? STUDY_CARD_ID_RE.exec(card.id) : null;
  if (!m) return null;
  return { baseId: m[1], vocabIdx: Number(m[2]) };
}

function computeReviewOverdueCount(cards: any[] | undefined, unitProgress: any, languageAppKey: string): number {
  const now = Date.now();
  let count = 0;
  const seenStudyWords = new Set<string>();
  for (const c of (cards || [])) {
    if (!(c && c.reps > 0 && c.due && (now - c.due) > REVIEW_OVERDUE_STALE_MS)) continue;
    if (c.origin === 'teacher' || c.origin === 'self') {
      if (c.flashcardStatus === 'active') count++;
      continue;
    }
    const word = studyWordIdentity(c);
    let gateCard = c;
    if (word && (c.unitId == null || c.vocabIdx == null)) {
      gateCard = { ...c, unitId: c.unitId ?? word.baseId.slice(1, word.baseId.lastIndexOf('-v')), vocabIdx: c.vocabIdx ?? word.vocabIdx };
    }
    if (!isCardLessonCompletedServer(gateCard, unitProgress, languageAppKey)) continue;
    if (word) {
      if (seenStudyWords.has(word.baseId)) continue;
      seenStudyWords.add(word.baseId);
    }
    count++;
  }
  return count;
}

function fillPlaceholders(text: string | null | undefined, payload: Record<string, unknown>): string {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (payload && payload[key] != null ? String(payload[key]) : ''));
}

function categoryAllowsInApp(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return true;
  return channels.includes('in_app');
}

function categoryAllowsPush(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return false;
  return channels.includes('push');
}

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

function categoryAllowsEmail(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return false;
  return channels.includes('email');
}

async function getUserEmail(supabase: any, cache: Map<string, string | null>, userId: string): Promise<string | null> {
  if (cache.has(userId)) return cache.get(userId)!;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const email = error ? null : (data?.user?.email || null);
  if (error) console.error('notification-cron: falha ao buscar e-mail da conta', userId, error.message);
  cache.set(userId, email);
  return email;
}

async function sendEmailToUser(supabase: any, cache: Map<string, string | null>, userId: string, subject: string, body: string): Promise<void> {
  if (!resendApiKey || !resendFromEmail) return;
  const to = await getUserEmail(supabase, cache, userId);
  if (!to) return;

  const html = `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <p style="font-size:15px;line-height:1.6;color:#241A15;">${body}</p>
    <p style="font-size:12px;color:#93856F;margin-top:32px;">Você pode ajustar quais e-mails recebe em Configurações &gt; Notificações, dentro do app.</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: resendFromEmail, to, subject, html, text: body }),
    });
    if (!res.ok) console.error('notification-cron: falha ao enviar e-mail', userId, res.status, await res.text());
  } catch (e: any) {
    console.error('notification-cron: erro ao chamar Resend', userId, String(e?.message || e));
  }
}

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

// Idioma do SITE de cada conta (progress.data._meta.uiLanguage); conta sem valor usa 'pt-BR'. Preenchido no handler.
const UI_LANG_BY_USER = new Map<string, string>();
function uiLangFor(userId: string): string {
  return UI_LANG_BY_USER.get(userId) === 'en' ? 'en' : 'pt-BR';
}

// Escolhe a variante no idioma do site; se esse idioma não tiver variante ATIVA para o evento, cai pro pt-BR.
async function pickFromPool(supabase: any, channel: string, userId: string, eventType: string, languageAppKey: string): Promise<any> {
  const uiLang = uiLangFor(userId);
  for (const lang of uiLang === 'pt-BR' ? ['pt-BR'] : [uiLang, 'pt-BR']) {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('event_type', eventType).eq('channel', channel).eq('language_app_key', languageAppKey)
      .eq('ui_language', lang).eq('active', true);
    if (error) return null;
    if (data?.length) return data[Math.floor(Math.random() * data.length)];
  }
  return null;
}

async function pickTemplate(supabase: any, userId: string, eventType: string, languageAppKey: string): Promise<any> {
  return pickFromPool(supabase, 'in_app', userId, eventType, languageAppKey);
}

async function pickEmailTemplate(supabase: any, userId: string, eventType: string, languageAppKey: string): Promise<any> {
  return pickFromPool(supabase, 'email', userId, eventType, languageAppKey);
}

async function maybeNotify(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>, emailCache: Map<string, string | null>,
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

  const template = await pickTemplate(supabase, userId, eventType, languageAppKey);
  if (!template) return false;

  const title = fillPlaceholders(template.title, payload);
  const body = fillPlaceholders(template.body, payload);
  if (!body) return false;

  const { error } = await supabase.from('notifications').insert({
    user_id: userId, language_app_key: languageAppKey, category, event_type: eventType,
    title: title || null, body, action_tab: actionTab || null,
  });
  if (error) return false;

  if (categoryAllowsPush(prefs, category)) await sendPushToUser(supabase, userId, title || 'Notificação', body, actionTab);

  if (categoryAllowsEmail(prefs, category)) {
    const emailTemplate = await pickEmailTemplate(supabase, userId, eventType, languageAppKey);
    if (emailTemplate) {
      const emailSubject = fillPlaceholders(emailTemplate.title, payload) || title || 'Notificação';
      const emailBody = fillPlaceholders(emailTemplate.body, payload);
      if (emailBody) await sendEmailToUser(supabase, emailCache, userId, emailSubject, emailBody);
    }
  }

  return true;
}

// E3/C3 -- sequência da CONTA (progress.data._account, ver shared/account-progress.js). Vale por cima do bloco do idioma quando
// existe e não está atrás dele; senão devolve o próprio bloco (comportamento de antes).
// E3/C5: o bloco de um idioma pode ser o legado (`frances`) ou de um curso por idioma do site (`frances@en`). Cada idioma
// é processado UMA vez, pelo curso aberto por último (_meta.currentCourse) quando ele é deste idioma; senão o legado; senão o
// primeiro curso `@` que existir. Assim a revisão atrasada e as missões continuam saindo uma vez por idioma.
function blockForLanguage(data: any, appKey: string): any {
  if (!data) return null;
  const cur = data?._meta?.currentCourse;
  if (typeof cur === 'string' && cur.split('@')[0] === appKey) {
    const key = data?._meta?.courses?.[cur]?.storageKey ?? (cur === appKey + '@pt-BR' ? appKey : cur);
    if (data[key]) return data[key];
  }
  if (data[appKey]) return data[appKey];
  const other = Object.keys(data).find((k) => k.startsWith(appKey + '@') && data[k]);
  return other ? data[other] : null;
}

function withAccountProgress(state: any, account: any): any {
  if (!account || typeof account !== 'object') return state;
  const accLast = typeof account.lastStudyDay === 'string' ? account.lastStudyDay : null;
  const blockLast = typeof state?.lastStudyDay === 'string' ? state.lastStudyDay : null;
  if (!accLast || typeof account.streak !== 'number' || (blockLast && accLast < blockLast)) return state;
  const lessons: Record<string, number> = { ...(state?.dailyLessonsLog || {}) };
  for (const [d, v] of Object.entries(account.dailyLessonsLog || {})) {
    const n = Number(v);
    if (Number.isFinite(n) && n > (lessons[d] || 0)) lessons[d] = n;
  }
  return { ...state, streak: account.streak, lastStudyDay: accLast, dailyLessonsLog: lessons };
}

// Idioma "principal" da conta: onde os avisos da CONTA (sequência em risco, meta do dia, reengajamento) são entregues, uma vez só.
// 1) o idioma atual da conta (_meta.currentLearningLanguage); 2) o bloco estudado mais recentemente; 3) o primeiro que existir.
function primaryLanguageAppKey(data: any): string | null {
  const present = LANGUAGES.filter((l) => blockForLanguage(data, l.appKey));
  if (!present.length) return null;
  const current = data?._meta?.currentLearningLanguage;
  const byCurrent = present.find((l) => l.id === current);
  if (byCurrent) return byCurrent.appKey;
  let best = present[0];
  let bestDay = '';
  for (const l of present) {
    const d = blockForLanguage(data, l.appKey)?.lastStudyDay;
    if (typeof d === 'string' && d > bestDay) { best = l; bestDay = d; }
  }
  return best.appKey;
}

async function processUserLanguage(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>, emailCache: Map<string, string | null>,
  userId: string, languageAppKey: string, state: any,
  account: any = null, isPrimary: boolean = true,
): Promise<number> {
  let created = 0;
  const today = todayDateKeyUTC();
  // Com _account (conta já migrada pelo cliente), os avisos da CONTA saem uma vez só, pelo idioma principal; sem _account,
  // tudo igual a antes (um por idioma).
  const accountEvents = !account || isPrimary;
  const acct = accountEvents ? withAccountProgress(state, account) : state;

  const dueCount = computeReviewOverdueCount(state.cards, state.unitProgress, languageAppKey);
  if (dueCount >= REVIEW_OVERDUE_MIN_COUNT) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'review_overdue', 'revisao', { dueCount }, 'review')) created++;
  }

  if (accountEvents && (acct.streak || 0) > 0 && acct.lastStudyDay !== today) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'streak_at_risk', 'streak', { days: acct.streak }, 'path')) created++;
  }

  const goal = state.studyGoal?.dailyLessonsGoal || 0;
  const todayWeekdayKey = DAY_KEY_BY_UTC_INDEX[new Date().getUTCDay()];
  if (accountEvents && goal > 0 && state.studyGoal?.days?.[todayWeekdayKey]) {
    const done = acct.dailyLessonsLog?.[today] || 0;
    if (done < goal) {
      const lessonsRemaining = goal - done;
      if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'study_goal_remaining', 'estudo', { lessonsRemaining, goal }, 'path')) created++;
    }
  }

  const inactiveDays = accountEvents ? daysSince(acct.lastStudyDay) : null;
  const reengRule = rules.get('reengajamento');
  const scheduleDays: number[] = reengRule?.schedule_days || [];
  if (inactiveDays !== null && scheduleDays.includes(inactiveDays)) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, `user_inactive_${inactiveDays}`, 'reengajamento', {}, 'path')) created++;
  }

  const missions = computeMissionProgress(state);
  if (missions) {
    const anyStarted = missions.some((m) => m.current > 0);
    const missing = missions.filter((m) => m.current < m.target).length;
    if (anyStarted && missing > 0) {
      if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'daily_missions_reminder', 'desafios', { missing }, 'path')) created++;
    }
  }

  return created;
}

async function processWeeklyRankingResults(supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>, emailCache: Map<string, string | null>): Promise<number> {
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
    const langMap = langTotalsByUser.get(userId);
    const dominantLang = langMap ? [...langMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : 'frances';
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, dominantLang, 'ranking_weekly_result', 'ranking', { rank, totalParticipants: ranked.length }, 'leaderboard')) created++;
  }
  return created;
}

async function processFeaturedBadgeReminders(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>, emailCache: Map<string, string | null>,
  progressByUserId: Map<string, any>,
): Promise<number> {
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('user_id')
    .is('featured_badge_id', null);
  if (error || !candidates?.length) return 0;

  const ids = candidates.map((p: any) => p.user_id);
  const { data: grants } = await supabase.from('badge_grants').select('user_id').in('user_id', ids);
  const grantedSet = new Set((grants || []).map((g: any) => g.user_id));

  let created = 0;
  for (const p of candidates) {
    const userId = p.user_id as string;
    let eligible = grantedSet.has(userId);
    if (!eligible) {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (!authError && authData?.user) {
        const email = authData.user.email;
        const createdAt = authData.user.created_at;
        eligible = email === FOUNDER_EMAIL || (!!createdAt && new Date(createdAt) < new Date(BETA_TESTER_CUTOFF));
      }
    }
    if (!eligible) continue;

    const state = progressByUserId.get(userId);
    const languageAppKey = blockForLanguage(state, 'frances') ? 'frances' : (blockForLanguage(state, 'mandarim') ? 'mandarim' : 'frances');
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'featured_badge_reminder', 'perfil', {}, 'profile-edit')) created++;
  }
  return created;
}

async function processTeacherStudentAlerts(
  supabase: any, rules: Map<string, any>, prefsCache: Map<string, any>, emailCache: Map<string, string | null>,
  progressByUserId: Map<string, any>,
): Promise<number> {
  const scheduleDays: number[] = rules.get('supervisao')?.schedule_days || [];
  if (!scheduleDays.length) return 0;

  const { data: links, error } = await supabase
    .from('teacher_students')
    .select('teacher_id, student_id, language_app_key')
    .eq('status', 'active');
  if (error || !links?.length) return 0;

  const groups = new Map<string, { teacherId: string; languageAppKey: string; hits: { studentId: string; days: number }[] }>();
  for (const link of links) {
    const state = blockForLanguage(progressByUserId.get(link.student_id), link.language_app_key);
    const days = daysSince(state?.lastStudyDay);
    if (days === null || !scheduleDays.includes(days)) continue;
    const key = `${link.teacher_id}|${link.language_app_key}`;
    const group = groups.get(key) || { teacherId: link.teacher_id, languageAppKey: link.language_app_key, hits: [] };
    group.hits.push({ studentId: link.student_id, days });
    groups.set(key, group);
  }
  if (!groups.size) return 0;

  const allStudentIds = [...new Set([...groups.values()].flatMap((g) => g.hits.map((h) => h.studentId)))];
  const { data: profiles } = await supabase.from('profiles').select('user_id, username, display_name').in('user_id', allStudentIds);
  const nameById = new Map<string, string>((profiles || []).map((p: any) => [p.user_id, p.display_name || (p.username ? `@${p.username}` : 'aluna')]));

  let created = 0;
  for (const group of groups.values()) {
    const studentList = group.hits
      .map((h) => `${nameById.get(h.studentId) || 'aluna'} (${h.days} dias)`)
      .join(', ');
    if (await maybeNotify(
      supabase, rules, prefsCache, emailCache, group.teacherId, group.languageAppKey,
      'student_inactive_alert', 'supervisao', { count: group.hits.length, studentList }, 'admin-badges',
    )) created++;
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

  const progressResult = await supabase.from('progress').select('user_id, data');
  if (progressResult.error) {
    console.error('notification-cron: falha ao ler progress', progressResult.error);
    return new Response(JSON.stringify({ ok: false, error: progressResult.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const prefsCache = new Map<string, any>();
  const emailCache = new Map<string, string | null>();
  let usersScanned = 0;
  let notificationsCreated = 0;
  const errors: string[] = [];

  const progressByUserId = new Map<string, any>((progressResult.data ?? []).map((row: any) => [row.user_id, row.data]));
  UI_LANG_BY_USER.clear();
  for (const row of progressResult.data ?? []) {
    const ul = row.data?._meta?.uiLanguage;
    if (typeof ul === 'string') UI_LANG_BY_USER.set(row.user_id, ul);
  }

  for (const row of progressResult.data ?? []) {
    const primaryAppKey = primaryLanguageAppKey(row.data);
    for (const lang of LANGUAGES) {
      const state = blockForLanguage(row.data, lang.appKey);
      if (!state) continue;
      usersScanned++;
      try {
        notificationsCreated += await processUserLanguage(supabase, rules, prefsCache, emailCache, row.user_id, lang.appKey, state, row.data?._account ?? null, lang.appKey === primaryAppKey);
      } catch (e) {
        errors.push(`${row.user_id}/${lang.appKey}: ${String(e)}`);
      }
    }
  }

  try {
    notificationsCreated += await processWeeklyRankingResults(supabase, rules, prefsCache, emailCache);
  } catch (e) {
    errors.push(`ranking semanal: ${String(e)}`);
  }

  try {
    notificationsCreated += await processFeaturedBadgeReminders(supabase, rules, prefsCache, emailCache, progressByUserId);
  } catch (e) {
    errors.push(`lembrete de badge em destaque: ${String(e)}`);
  }

  try {
    notificationsCreated += await processTeacherStudentAlerts(supabase, rules, prefsCache, emailCache, progressByUserId);
  } catch (e) {
    errors.push(`alerta de infrequência pra professora: ${String(e)}`);
  }

  // Amigos: "um amigo te passou no ranking" (no máximo 1 por pessoa por dia); a lógica vive na função SQL process_friend_overtakes (migration 073).
  let friendOvertakes = 0;
  try {
    const { data, error } = await supabase.rpc('process_friend_overtakes');
    if (error) throw error;
    friendOvertakes = Number((data as { notified?: number } | null)?.notified ?? 0);
  } catch (e) {
    errors.push(`amigos (te passou no ranking): ${String((e as Error)?.message ?? e)}`);
  }

  const summary = {
    ok: true,
    friendOvertakes,
    ranAt: new Date().toISOString(),
    phase: 'Fase 6b -- + student_inactive_alert (alerta de infrequência pra professora, categoria supervisao); demais eventos desde Fase 5: review_overdue, streak_at_risk, study_goal_remaining, reengajamento (calendário completo 1-30, 9/15/20/30 também por e-mail), daily_missions_reminder, ranking_weekly_result, featured_badge_reminder',
    usersScanned,
    notificationsCreated,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  };

  console.log('notification-cron summary:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
