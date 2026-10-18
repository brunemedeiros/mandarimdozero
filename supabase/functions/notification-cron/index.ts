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
//     "Missões do dia" mas não terminou todas -- lê a atribuição já
//     congelada pelo cliente em state.daily.missions (ver
//     MISSION_FIELD_BY_ID/computeMissionProgress abaixo; desde o grilling
//     "missões do dia" este arquivo não sorteia mais nada sozinho)
//
// Fase 5 (agora): primeiro canal 'email' de verdade, via Resend (API HTTP
// simples, sem SDK -- mesma filosofia do fetch cru já usado no resto do
// arquivo). Completa o calendário de reengajamento: os dias 15/20/30, que
// ficaram de fora até aqui de propósito (só 1-9 rodavam, ver comentário
// antigo removido), agora disparam -- e o dia 9 ganha um e-mail além do
// in_app que já tinha desde a Fase 2. Diferente de push (que reaproveita o
// texto do in_app, "pendura" nele), e-mail tem POOL DE TEXTO PRÓPRIO
// (channel='email' em notification_templates, seed na migration 015) --
// título vira assunto, corpo vira a mensagem; só dispara se essa variante
// existir pro evento, senão não faz nada (não força um in_app genérico
// virar e-mail sozinho).
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

// Secrets da Fase 5 (Resend, https://resend.com) -- RESEND_FROM_EMAIL
// precisa ser um remetente de um domínio VERIFICADO na conta Resend (ver
// PR); sem isso a API recusa o envio. Ausência de qualquer um dos dois só
// desliga o envio de e-mail (log + return cedo em sendEmailToUser), nunca
// derruba o resto do cron -- mesmo espírito de robustez do push.
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

// Mesmos appKey de languages/index.js -- duplicado aqui de propósito (este
// arquivo roda em runtime Deno separado, não importa módulos do site).
const LANGUAGES = [
  { appKey: 'frances', id: 'fr' },
  { appKey: 'mandarim', id: 'zh' },
  // E6 (2026-10-15): português. O progresso mora em `portugues@en` (registro: legacyStorage []); blockForLanguage já acha.
  { appKey: 'portugues', id: 'pt' },
];

// Mesmos valores de ADMIN_EMAIL (languages/<lang>/app.js) e
// BETA_TESTER_CUTOFF (shared/profile.js) -- duplicados aqui pelo mesmo
// motivo de LANGUAGES acima. Usados só pra decidir quem é ELEGÍVEL pro
// lembrete de badge em destaque (ver processFeaturedBadgeReminders):
// destacar um badge só faz sentido pra quem já tem pelo menos um badge
// ESPECIAL (Fundadora/Beta Tester/concedido por admin) pra escolher.
const FOUNDER_EMAIL = 'brunemed1310@gmail.com';
const BETA_TESTER_CUTOFF = '2026-09-05T00:00:00Z';

// domingo=0 .. sábado=6, mesma convenção de DAY_KEY_BY_JS_INDEX em
// shared/wizard.js -- aqui aplicada sobre getUTCDay() (ver limitação de
// fuso acima).
const DAY_KEY_BY_UTC_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Grilling "missões do dia" (ver CLAUDE.md): o cliente (languages/<lang>/
// app.js, assignTodaysMissions()) agora congela as 3 missões do dia --
// incluindo a resolução de feasibility de reviews15/overdue3/matchGame1/
// speedReview1 contra o estoque real de cartas pra revisar -- e persiste
// em state.daily.missions ([{id, target}, ...]). Este arquivo NÃO sorteia
// mais nada sozinho: fazer isso de novo aqui exigiria replicar a mesma
// lógica de feasibility (que já não é um simples dailySeed()/pickDaily
// FromPool() determinístico) e arriscaria divergir do que a pessoa vê na
// tela dela. Só falta mapear id -> campo de STATE.daily (ou 'special')
// pra calcular o PROGRESSO de cada missão já escolhida -- isso sim precisa
// ficar duplicado (content/campos não são importáveis neste runtime, ver
// comentário no topo do arquivo), mas ids/targets são só metadata estável,
// nunca a lógica de sorteio/feasibility em si.
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

// state.lastStudyDay/state.daily.date são gravados no fuso LOCAL do
// navegador (ver limitação de fuso no topo do arquivo) -- comparar os dois
// ENTRE SI (em vez de contra o "hoje" em UTC deste cron) mede exatamente a
// mesma coisa que o cliente mediria, sem herdar o descasamento de fuso.
function missionCurrent(def: MissionFieldDef, state: any): number {
  if (def.special === 'lastStudyDay') return state.lastStudyDay === state.daily?.date ? 1 : 0;
  return getFieldValue(state.daily, def.field!);
}

// null = sem atribuição congelada pra hoje ainda (state.daily.missions
// ausente/vazio, ex.: quem não abriu o app hoje) -- nada a avaliar, bem
// diferente de "começou e não terminou".
function computeMissionProgress(state: any): { current: number; target: number }[] | null {
  const missions = state.daily?.missions;
  if (!Array.isArray(missions) || missions.length === 0 || !state.daily?.date) return null;
  return missions.map((m: { id: string; target: number }) => {
    const def = MISSION_FIELD_BY_ID[m.id] || {};
    return { current: Math.min(missionCurrent(def, state), m.target), target: m.target };
  });
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

// Portão de lição no servidor: espelha isCardLessonCompleted() do cliente (shared/core/revisao-decks.js) -- content.js
// não é importável neste runtime (ver comentário no topo do arquivo).
//
// Bug real que isto corrige (relatado pela autora, 2026-09-15): um cartão ganha reps>0 e due<=now assim que é
// praticado dentro da PRÓPRIA lição que ensina a palavra -- antes de "lição concluída" avançar. Sem o portão, a
// notificação "N palavras prontas pra revisar" batia numa tela Revisão vazia.
//
// Etapa 0b do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 e 2.4): o id do cartão vem da chave
// estável do item (`u{k}`, fr) e não diz mais onde a palavra mora; por isso unidade e lição saem do mapa GERADO abaixo
// (antes: regex no id + LESSON_VOCAB_MAP regerado à mão). Item aposentado não está no mapa (não conta); chave fundida
// conta como o sobrevivente. Mudou o conteúdo: `node scripts/gerar_mapa_cron.js` e novo deploy desta função.
// >>> GERADO: STUDY_ITEM_GATE (scripts/gerar_mapa_cron.js, a partir de fr/content.js, fr/curriculum-changes.js e zh/content.js; NÃO editar à mão)
// [unidade atual, índice da lição que ensina a palavra (-1 = nenhuma)] ou, chave fundida, [unidade, lição, id do sobrevivente].
const STUDY_ITEM_GATE: Record<string, Record<string, [string, number, string?]>> = {
  frances: {
    "uA1-1-v0": ["A1-1", 0], "uA1-1-v1": ["A1-1", 0], "uA1-1-v2": ["A1-1", 0], "uA1-1-v3": ["A1-1", 1], "uA1-1-v4": ["A1-1", 1], "uA1-1-v5": ["A1-1", 1], "uA1-1-v6": ["A1-1", 2], "uA1-1-v7": ["A1-1", 2], "uA1-1-v8": ["A1-1", 2], "uA1-1-v9": ["A1-1", 2],
    "uA1-2-v0": ["A1-2", 0], "uA1-2-v1": ["A1-2", 0], "uA1-2-v2": ["A1-2", 0], "uA1-2-v3": ["A1-2", 1], "uA1-2-v4": ["A1-2", 1], "uA1-2-v5": ["A1-2", 1], "uA1-2-v6": ["A1-2", 2], "uA1-2-v7": ["A1-2", 2], "uA1-2-v8": ["A1-2", 2], "uA1-2-v9": ["A1-2", 2],
    "uA1-3-v0": ["A1-3", 0], "uA1-3-v1": ["A1-3", 0], "uA1-3-v2": ["A1-3", 0], "uA1-3-v3": ["A1-3", 1], "uA1-3-v4": ["A1-3", 1], "uA1-3-v5": ["A1-3", 1], "uA1-3-v6": ["A1-3", 2], "uA1-3-v7": ["A1-3", 2], "uA1-3-v8": ["A1-3", 2], "uA1-3-v9": ["A1-3", 2],
    "uA1-4-v0": ["A1-4", 0], "uA1-4-v1": ["A1-4", 0], "uA1-4-v2": ["A1-4", 0], "uA1-4-v3": ["A1-4", 1], "uA1-4-v4": ["A1-4", 1], "uA1-4-v5": ["A1-4", 1], "uA1-4-v6": ["A1-4", 2], "uA1-4-v7": ["A1-4", 2], "uA1-4-v8": ["A1-4", 2], "uA1-4-v9": ["A1-4", 2],
    "uA1-5-v0": ["A1-5", 0], "uA1-5-v1": ["A1-5", 0], "uA1-5-v2": ["A1-5", 0], "uA1-5-v3": ["A1-5", 1], "uA1-5-v4": ["A1-5", 1], "uA1-5-v5": ["A1-5", 1], "uA1-5-v6": ["A1-5", 2], "uA1-5-v7": ["A1-5", 2], "uA1-5-v8": ["A1-5", 2], "uA1-5-v9": ["A1-5", 2],
    "uA1-6-v0": ["A1-6", 0], "uA1-6-v1": ["A1-6", 0], "uA1-6-v2": ["A1-6", 0], "uA1-6-v3": ["A1-6", 1], "uA1-6-v4": ["A1-6", 1], "uA1-6-v5": ["A1-6", 1], "uA1-6-v6": ["A1-6", 2], "uA1-6-v7": ["A1-6", 2], "uA1-6-v8": ["A1-6", 2], "uA1-6-v9": ["A1-6", 2],
    "uA1-7-v0": ["A1-7", 0], "uA1-7-v1": ["A1-7", 0], "uA1-7-v2": ["A1-7", 0], "uA1-7-v3": ["A1-7", 1], "uA1-7-v4": ["A1-7", 1], "uA1-7-v5": ["A1-7", 1], "uA1-7-v6": ["A1-7", 2], "uA1-7-v7": ["A1-7", 2], "uA1-7-v8": ["A1-7", 2], "uA1-7-v9": ["A1-7", 2],
    "uA1-8-v0": ["A1-8", 0], "uA1-8-v1": ["A1-8", 0], "uA1-8-v2": ["A1-8", 0], "uA1-8-v3": ["A1-8", 1], "uA1-8-v4": ["A1-8", 1], "uA1-8-v5": ["A1-8", 1], "uA1-8-v6": ["A1-8", 2], "uA1-8-v7": ["A1-8", 2], "uA1-8-v8": ["A1-8", 2], "uA1-8-v9": ["A1-8", 2],
    "uA1-9-v0": ["A1-9", 0], "uA1-9-v1": ["A1-9", 0], "uA1-9-v2": ["A1-9", 0], "uA1-9-v3": ["A1-9", 1], "uA1-9-v4": ["A1-9", 1], "uA1-9-v5": ["A1-9", 1], "uA1-9-v6": ["A1-9", 2], "uA1-9-v7": ["A1-9", 2], "uA1-9-v8": ["A1-9", 2], "uA1-9-v9": ["A1-9", 2],
    "uA1-10-v0": ["A1-10", 0], "uA1-10-v1": ["A1-10", 0], "uA1-10-v2": ["A1-10", 0], "uA1-10-v3": ["A1-10", 1], "uA1-10-v4": ["A1-10", 1], "uA1-10-v5": ["A1-10", 1], "uA1-10-v6": ["A1-10", 2], "uA1-10-v7": ["A1-10", 2], "uA1-10-v8": ["A1-10", 2], "uA1-10-v9": ["A1-10", 3], "uA1-10-v10": ["A1-10", 3], "uA1-10-v11": ["A1-10", 3], "uA1-10-v12": ["A1-10", 4], "uA1-10-v13": ["A1-10", 4],
    "uA1-11-v0": ["A1-11", 0], "uA1-11-v1": ["A1-11", 0], "uA1-11-v2": ["A1-11", 0], "uA1-11-v3": ["A1-11", 1], "uA1-11-v4": ["A1-11", 1], "uA1-11-v5": ["A1-11", 1], "uA1-11-v6": ["A1-11", 2], "uA1-11-v7": ["A1-11", 2], "uA1-11-v8": ["A1-11", 2], "uA1-11-v9": ["A1-11", 2],
    "uA1-12-v0": ["A1-12", 0], "uA1-12-v1": ["A1-12", 0], "uA1-12-v2": ["A1-12", 0], "uA1-12-v3": ["A1-12", 1], "uA1-12-v4": ["A1-12", 1], "uA1-12-v5": ["A1-12", 1], "uA1-12-v6": ["A1-12", 2], "uA1-12-v7": ["A1-12", 2], "uA1-12-v8": ["A1-12", 2], "uA1-12-v9": ["A1-12", 2],
    "uA1-13-v0": ["A1-13", 0], "uA1-13-v1": ["A1-13", 0], "uA1-13-v2": ["A1-13", 0], "uA1-13-v3": ["A1-13", 1], "uA1-13-v4": ["A1-13", 1], "uA1-13-v5": ["A1-13", 1], "uA1-13-v6": ["A1-13", 2], "uA1-13-v7": ["A1-13", 2], "uA1-13-v8": ["A1-13", 2], "uA1-13-v9": ["A1-13", 2],
    "uA1-14-v0": ["A1-14", 0], "uA1-14-v1": ["A1-14", 0], "uA1-14-v2": ["A1-14", 0], "uA1-14-v3": ["A1-14", 1], "uA1-14-v4": ["A1-14", 1], "uA1-14-v5": ["A1-14", 1], "uA1-14-v6": ["A1-14", 2], "uA1-14-v7": ["A1-14", 2], "uA1-14-v8": ["A1-14", 2], "uA1-14-v9": ["A1-14", 2],
    "uA1-15-v0": ["A1-15", 0], "uA1-15-v1": ["A1-15", 0], "uA1-15-v2": ["A1-15", 0], "uA1-15-v3": ["A1-15", 1], "uA1-15-v4": ["A1-15", 1], "uA1-15-v5": ["A1-15", 1], "uA1-15-v6": ["A1-15", 2], "uA1-15-v7": ["A1-15", 2], "uA1-15-v8": ["A1-15", 2], "uA1-15-v9": ["A1-15", 2],
    "uA1-16-v0": ["A1-16", 0], "uA1-16-v1": ["A1-16", 0], "uA1-16-v2": ["A1-16", 0], "uA1-16-v3": ["A1-16", 1], "uA1-16-v4": ["A1-16", 1], "uA1-16-v5": ["A1-16", 1], "uA1-16-v6": ["A1-16", 2], "uA1-16-v7": ["A1-16", 2], "uA1-16-v8": ["A1-16", 2], "uA1-16-v9": ["A1-16", 2],
    "uA1-17-v0": ["A1-17", 0], "uA1-17-v1": ["A1-17", 0], "uA1-17-v2": ["A1-17", 0], "uA1-17-v3": ["A1-17", 1], "uA1-17-v4": ["A1-17", 1], "uA1-17-v5": ["A1-17", 1], "uA1-17-v6": ["A1-17", 2], "uA1-17-v7": ["A1-17", 2], "uA1-17-v8": ["A1-17", 2], "uA1-17-v9": ["A1-17", 2],
    "uA1-18-v0": ["A1-18", 0], "uA1-18-v1": ["A1-18", 0], "uA1-18-v2": ["A1-18", 0], "uA1-18-v3": ["A1-18", 1], "uA1-18-v4": ["A1-18", 1], "uA1-18-v5": ["A1-18", 1], "uA1-18-v6": ["A1-18", 2], "uA1-18-v7": ["A1-18", 2], "uA1-18-v8": ["A1-18", 2], "uA1-18-v9": ["A1-18", 2],
    "uA1-19-v0": ["A1-19", 0], "uA1-19-v1": ["A1-19", 0], "uA1-19-v2": ["A1-19", 0], "uA1-19-v3": ["A1-19", 1], "uA1-19-v4": ["A1-19", 1], "uA1-19-v5": ["A1-19", 1], "uA1-19-v6": ["A1-19", 2], "uA1-19-v7": ["A1-19", 2], "uA1-19-v8": ["A1-19", 2], "uA1-19-v9": ["A1-19", 2],
    "uA1-20-v0": ["A1-20", 0], "uA1-20-v1": ["A1-20", 0], "uA1-20-v2": ["A1-20", 0], "uA1-20-v3": ["A1-20", 1], "uA1-20-v4": ["A1-20", 1], "uA1-20-v5": ["A1-20", 1], "uA1-20-v6": ["A1-20", 2], "uA1-20-v7": ["A1-20", 2], "uA1-20-v8": ["A1-20", 2], "uA1-20-v9": ["A1-20", 2],
  },
  mandarim: {
    "u1-v0": ["1", 0], "u1-v1": ["1", 0], "u1-v2": ["1", 0], "u1-v3": ["1", 1], "u1-v4": ["1", 1], "u1-v5": ["1", 1], "u1-v6": ["1", 2], "u1-v7": ["1", 2],
    "u2-v0": ["2", 0], "u2-v1": ["2", 0], "u2-v2": ["2", 0], "u2-v3": ["2", 1], "u2-v4": ["2", 1], "u2-v5": ["2", 1], "u2-v6": ["2", 2], "u2-v7": ["2", 2], "u2-v8": ["2", 2], "u2-v9": ["2", 2],
    "u3-v0": ["3", 0], "u3-v1": ["3", 0], "u3-v2": ["3", 0], "u3-v3": ["3", 1], "u3-v4": ["3", 1], "u3-v5": ["3", 1], "u3-v6": ["3", 2], "u3-v7": ["3", 2], "u3-v8": ["3", 2], "u3-v9": ["3", 3], "u3-v10": ["3", 3], "u3-v11": ["3", 3], "u3-v12": ["3", 4], "u3-v13": ["3", 4],
    "u4-v0": ["4", 0], "u4-v1": ["4", 0], "u4-v2": ["4", 0], "u4-v3": ["4", 1], "u4-v4": ["4", 1], "u4-v5": ["4", 1], "u4-v6": ["4", 2], "u4-v7": ["4", 2], "u4-v8": ["4", 2], "u4-v9": ["4", 3], "u4-v10": ["4", 3], "u4-v11": ["4", 3],
    "u5-v0": ["5", 0], "u5-v1": ["5", 0], "u5-v2": ["5", 0], "u5-v3": ["5", 1], "u5-v4": ["5", 1], "u5-v5": ["5", 1], "u5-v6": ["5", 2], "u5-v7": ["5", 2], "u5-v8": ["5", 2], "u5-v9": ["5", 3], "u5-v10": ["5", 3],
    "u6-v0": ["6", 0], "u6-v1": ["6", 0], "u6-v2": ["6", 0], "u6-v3": ["6", 1], "u6-v4": ["6", 1], "u6-v5": ["6", 1], "u6-v6": ["6", 2], "u6-v7": ["6", 2], "u6-v8": ["6", 2],
    "u7-v0": ["7", 0], "u7-v1": ["7", 0], "u7-v2": ["7", 0], "u7-v3": ["7", 1], "u7-v4": ["7", 1], "u7-v5": ["7", 1], "u7-v6": ["7", 2], "u7-v7": ["7", 2], "u7-v8": ["7", 2],
    "u8-v0": ["8", 0], "u8-v1": ["8", 0], "u8-v2": ["8", 0], "u8-v3": ["8", 1], "u8-v4": ["8", 1], "u8-v5": ["8", 1], "u8-v6": ["8", 2], "u8-v7": ["8", 2], "u8-v8": ["8", 2], "u8-v9": ["8", 3], "u8-v10": ["8", 3],
    "u9-v0": ["9", 0], "u9-v1": ["9", 0], "u9-v2": ["9", 0], "u9-v3": ["9", 1], "u9-v4": ["9", 1], "u9-v5": ["9", 1], "u9-v6": ["9", 1],
    "u10-v0": ["10", 0], "u10-v1": ["10", 0], "u10-v2": ["10", 0], "u10-v3": ["10", 1], "u10-v4": ["10", 1], "u10-v5": ["10", 1], "u10-v6": ["10", 2], "u10-v7": ["10", 2],
    "u11-v0": ["11", 0], "u11-v1": ["11", 0], "u11-v2": ["11", 0], "u11-v3": ["11", 1], "u11-v4": ["11", 1], "u11-v5": ["11", 1], "u11-v6": ["11", 2], "u11-v7": ["11", 2],
    "u12-v0": ["12", 0], "u12-v1": ["12", 0], "u12-v2": ["12", 0], "u12-v3": ["12", 1], "u12-v4": ["12", 1], "u12-v5": ["12", 1], "u12-v6": ["12", 2], "u12-v7": ["12", 2],
    "u13-v0": ["13", 0], "u13-v1": ["13", 0], "u13-v2": ["13", 0], "u13-v3": ["13", 1], "u13-v4": ["13", 1], "u13-v5": ["13", 1], "u13-v6": ["13", 1],
    "u14-v0": ["14", 0], "u14-v1": ["14", 0], "u14-v2": ["14", 0], "u14-v3": ["14", 1], "u14-v4": ["14", 1], "u14-v5": ["14", 1],
    "u15-v0": ["15", 0], "u15-v1": ["15", 0], "u15-v2": ["15", 0], "u15-v3": ["15", 1], "u15-v4": ["15", 1], "u15-v5": ["15", 1], "u15-v6": ["15", 2], "u15-v7": ["15", 2], "u15-v8": ["15", 2], "u15-v9": ["15", 2],
    "u16-v0": ["16", 0], "u16-v1": ["16", 0], "u16-v2": ["16", 0], "u16-v3": ["16", 1], "u16-v4": ["16", 1], "u16-v5": ["16", 1], "u16-v6": ["16", 2], "u16-v7": ["16", 2], "u16-v8": ["16", 2], "u16-v9": ["16", 2],
    "u17-v0": ["17", 0], "u17-v1": ["17", 0], "u17-v2": ["17", 0], "u17-v3": ["17", 1], "u17-v4": ["17", 1], "u17-v5": ["17", 1], "u17-v6": ["17", 2], "u17-v7": ["17", 2],
    "u18-v0": ["18", 0], "u18-v1": ["18", 0], "u18-v2": ["18", 0], "u18-v3": ["18", 1], "u18-v4": ["18", 1], "u18-v5": ["18", 1], "u18-v6": ["18", 2], "u18-v7": ["18", 2], "u18-v8": ["18", 2], "u18-v9": ["18", 2],
  },
};
// <<< GERADO: STUDY_ITEM_GATE

// Entrada do mapa para um cartão da trilha (A `u{k}` ou B `u{k}-b`); null = não é palavra da trilha deste idioma
// (cartão "Na frase", professora/aluna, aposentado, idioma sem mapa). `base` identifica a PALAVRA: A e B (e a chave
// fundida e a sobrevivente) contam uma vez só em "palavras prontas pra revisar".
function studyWordGate(card: any, languageAppKey: string): { base: string; unitId: string; lessonIdx: number } | null {
  if (!card || typeof card.id !== 'string') return null;
  // origin explícito diferente de 'study' nunca é trilha. Saves da trilha não gravam `origin` (só id + progresso).
  if (card.origin != null && card.origin !== 'study') return null;
  const gate = STUDY_ITEM_GATE[languageAppKey];
  if (!gate) return null;
  let base = card.id;
  let e = Object.prototype.hasOwnProperty.call(gate, base) ? gate[base] : undefined;
  if (!e && base.endsWith('-b')) {
    base = base.slice(0, -2);
    e = Object.prototype.hasOwnProperty.call(gate, base) ? gate[base] : undefined;
  }
  if (!e) return null;
  return { base: e[2] || base, unitId: e[0], lessonIdx: e[1] };
}

// isCardLessonCompleted() do cliente para a palavra da trilha: `released` (o cartão já passou pelo portão uma vez)
// passa sempre; unidade concluída libera tudo (A0, 06/10/2026); senão só as lições já feitas.
function isStudyWordReleasedServer(card: any, gate: { unitId: string; lessonIdx: number }, unitProgress: any): boolean {
  if (card?.released) return true;
  const prog = unitProgress?.[gate.unitId];
  if (prog?.completed) return true;
  if (!prog?.started) return false;
  if (gate.lessonIdx === -1) return !!prog.completed;
  return gate.lessonIdx < prog.lessonIdx;
}

function computeReviewOverdueCount(cards: any[] | undefined, unitProgress: any, languageAppKey: string): number {
  const now = Date.now();
  let count = 0;
  const seenStudyWords = new Set<string>();
  for (const c of (cards || [])) {
    if (!(c && c.reps > 0 && c.due && (now - c.due) > REVIEW_OVERDUE_STALE_MS)) continue;
    // K.0-C: Teacher/Self não pertencem a nenhuma unidade: só flashcardStatus==='active' os libera (arquivado fica de
    // fora). Cada CardInstance conta individualmente (sem dedup por Note). New já foi excluído acima (reps>0).
    if (c.origin === 'teacher' || c.origin === 'self') {
      if (c.flashcardStatus === 'active') count++;
      continue;
    }
    const word = studyWordGate(c, languageAppKey);
    if (!word) continue;
    if (!isStudyWordReleasedServer(c, word, unitProgress)) continue;
    if (seenStudyWords.has(word.base)) continue;
    seenStudyWords.add(word.base);
    count++;
  }
  return count;
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

function categoryAllowsEmail(prefs: any, category: string): boolean {
  const channels = prefs?.channels?.[category];
  if (!Array.isArray(channels)) return false; // mesmo critério de push -- e-mail exige opt-in explícito
  return channels.includes('email');
}

// Busca o e-mail da conta via Admin API (supabase.auth.admin.getUserById) --
// não dá pra ler auth.users direto pelo query builder (schema separado, sem
// view pública), e profiles NUNCA guarda e-mail de propósito (ver comentário
// na migration 001). Só a service role (este arquivo) tem acesso a essa API;
// cacheado por invocação, já que review_overdue/streak_at_risk/etc podem
// rodar pra frances E mandarim da mesma conta no mesmo dia.
async function getUserEmail(supabase: any, cache: Map<string, string | null>, userId: string): Promise<string | null> {
  if (cache.has(userId)) return cache.get(userId)!;
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const email = error ? null : (data?.user?.email || null);
  if (error) console.error('notification-cron: falha ao buscar e-mail da conta', userId, error.message);
  cache.set(userId, email);
  return email;
}

// Envia via a API HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email)
// -- fetch cru, sem SDK (Resend não precisa de um pacote como o web-push
// precisa pra assinatura VAPID). Sem RESEND_API_KEY/RESEND_FROM_EMAIL
// configurados (secrets manuais, ver PR), só loga e sai -- nunca derruba o
// resto da varredura por falta de um secret opcional.
async function sendEmailToUser(supabase: any, cache: Map<string, string | null>, userId: string, subject: string, body: string): Promise<void> {
  if (!resendApiKey || !resendFromEmail) return;
  const to = await getUserEmail(supabase, cache, userId);
  if (!to) return;

  const html = `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <p style="font-size:15px;line-height:1.6;color:#241A15;">${body}</p>
    <p style="font-size:12px;color:#93856F;margin-top:32px;">${uiLangFor(userId) === 'en' ? 'You can adjust which emails you receive in Settings &gt; Notifications, inside the app.' : 'Você pode ajustar quais e-mails recebe em Configurações &gt; Notificações, dentro do app.'}</p>
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

// Idioma do SITE de cada conta (progress.data._meta.uiLanguage, Fase 11 i18n).
// Preenchido no handler a partir da leitura de `progress`; conta sem valor
// (ou valor desconhecido) usa 'pt-BR'. Nunca é Premium nem muda o idioma estudado.
const UI_LANG_BY_USER = new Map<string, string>();
function uiLangFor(userId: string): string {
  return UI_LANG_BY_USER.get(userId) === 'en' ? 'en' : 'pt-BR';
}

// Escolhe a variante no idioma do site. Decisão da dona (2026-10-15, vale para fr, zh e pt): site em inglês sem variante
// ATIVA em inglês para o evento = SEM aviso (nunca cai no texto em português). Mesma regra de shared/notifications.js.
function templateLangsFor(uiLang: string): string[] {
  return uiLang === 'en' ? ['en'] : ['pt-BR'];
}

async function pickFromPool(supabase: any, channel: string, userId: string, eventType: string, languageAppKey: string): Promise<any> {
  for (const lang of templateLangsFor(uiLangFor(userId))) {
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

// Igual a pickTemplate, mas no pool PRÓPRIO do canal 'email' (ver cabeçalho
// do arquivo -- diferente de push, e-mail não reaproveita o texto do
// in_app). Retorna null quando não há variante de e-mail pro evento --
// maybeNotify trata isso como "sem e-mail pra esse evento", nunca cai de
// volta pro texto do in_app.
async function pickEmailTemplate(supabase: any, userId: string, eventType: string, languageAppKey: string): Promise<any> {
  return pickFromPool(supabase, 'email', userId, eventType, languageAppKey);
}

// Ponto único de disparo -- espelha fireNotificationEvent() do cliente
// (shared/notifications.js), com source:'cron' em vez de 'client'. Sempre
// grava o evento bruto em notification_events, mesmo quando descartado
// depois (preferência, silêncio ou anti-spam) -- é o log de auditoria.
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

  // Push "pendura" no in-app aqui também -- mesma simplificação documentada
  // em shared/notifications.js:fireNotificationEvent (anti-spam só existe
  // sobre `notifications`, então desligar in_app desliga push junto nesta
  // fase). AWAIT de propósito (diferente do client, que dispara e segue
  // sem esperar): esta function roda até o fim antes de responder, sem
  // nenhum "waitUntil" que garanta uma promise solta terminar depois da
  // resposta -- e uma falha de push aqui já está isolada em try/catch
  // dentro de sendPushToUser, não derruba o resto da varredura.
  if (categoryAllowsPush(prefs, category)) await sendPushToUser(supabase, userId, title || (uiLangFor(userId) === 'en' ? 'Notification' : 'Notificação'), body, actionTab);

  // E-mail (Fase 5) -- só dispara se existir uma variante PRÓPRIA pra esse
  // evento (ver pickEmailTemplate); a maioria dos eventos não tem uma ainda
  // (só o calendário de reengajamento, migration 015), então isto é um
  // no-op silencioso pra eles, não um erro.
  if (categoryAllowsEmail(prefs, category)) {
    const emailTemplate = await pickEmailTemplate(supabase, userId, eventType, languageAppKey);
    if (emailTemplate) {
      const emailSubject = fillPlaceholders(emailTemplate.title, payload) || title || (uiLangFor(userId) === 'en' ? 'Notification' : 'Notificação');
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

  // 1) Revisão atrasada
  const dueCount = computeReviewOverdueCount(state.cards, state.unitProgress, languageAppKey);
  if (dueCount >= REVIEW_OVERDUE_MIN_COUNT) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'review_overdue', 'revisao', { dueCount }, 'review')) created++;
  }

  // 2) Sequência em risco -- tem sequência (algo a perder) e ainda não
  // estudou "hoje" (ver limitação de fuso no topo do arquivo).
  if (accountEvents && (acct.streak || 0) > 0 && acct.lastStudyDay !== today) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'streak_at_risk', 'streak', { days: acct.streak }, 'path')) created++;
  }

  // 3) Meta do dia não batida -- só nos dias que a própria pessoa escolheu
  // no assistente de meta (studyGoal.days), mesma fonte que o app já usa
  // pro lembrete local (maybeSendStudyReminder).
  const goal = state.studyGoal?.dailyLessonsGoal || 0;
  const todayWeekdayKey = DAY_KEY_BY_UTC_INDEX[new Date().getUTCDay()];
  if (accountEvents && goal > 0 && state.studyGoal?.days?.[todayWeekdayKey]) {
    const done = acct.dailyLessonsLog?.[today] || 0;
    if (done < goal) {
      const lessonsRemaining = goal - done;
      if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'study_goal_remaining', 'estudo', { lessonsRemaining, goal }, 'path')) created++;
    }
  }

  // 4) Reengajamento -- calendário completo desde a Fase 5 (antes só os
  // dias 1-9 rodavam; 15/20/30 ficavam de fora até e-mail existir de
  // verdade). daysSince(null) é null pra quem nunca estudou -- de propósito
  // fora do calendário: reengajamento é sobre quem sumiu, não quem nunca
  // começou.
  const inactiveDays = accountEvents ? daysSince(acct.lastStudyDay) : null;
  const reengRule = rules.get('reengajamento');
  const scheduleDays: number[] = reengRule?.schedule_days || [];
  if (inactiveDays !== null && scheduleDays.includes(inactiveDays)) {
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, `user_inactive_${inactiveDays}`, 'reengajamento', {}, 'path')) created++;
  }

  // 5) Missões do dia começadas, não terminadas (Fase 4) -- "começou"
  // exige progresso > 0 em pelo menos uma; sem isso, alguém que nem abriu
  // o app hoje receberia isto JUNTO com streak_at_risk/study_goal_remaining
  // (redundante -- essas duas já cobrem "não estudou hoje").
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

// Roda 1x por invocação (não por usuário/idioma) -- só faz sentido às
// segundas (UTC), quando uma semana acabou de virar. Ranking "Geral" (soma
// de todos os idiomas por conta), mesmo cálculo de
// shared/leaderboard.js:fetchLeaderboard('all', weekStart) -- só que sobre
// a semana que TERMINOU ontem, não a atual.
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
    // Idioma "dominante" da conta na semana -- só decide em qual
    // language_app_key a notificação fica registrada (o texto do template
    // é idêntico nos dois, ver migration 014), não afeta o cálculo do rank.
    const langMap = langTotalsByUser.get(userId);
    const dominantLang = langMap ? [...langMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : 'frances';
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, dominantLang, 'ranking_weekly_result', 'ranking', { rank, totalParticipants: ranked.length }, 'leaderboard')) created++;
  }
  return created;
}

// Roda 1x por invocação (não por usuário/idioma -- featured_badge_id é um
// campo só em `profiles`, compartilhado entre fr/zh, ver 001). Elegível =
// featured_badge_id ainda vazio E a conta já tem pelo menos um badge
// ESPECIAL disponível pra escolher (concedido via badge_grants, OU
// Fundadora/Beta Tester por regra -- nunca uma Conquista de gameplay, ver
// 019_featured_badge_reminder.sql). progressByUserId só decide em qual
// language_app_key a notificação fica registrada (mesma simplificação de
// dominantLang em processWeeklyRankingResults) -- 'frances' como fallback
// pra quem nunca estudou em nenhum idioma ainda (raro: quem chegou até
// criar um badge_grant/ser Fundadora já teria alguma linha em progress).
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
    // E6/T5: idioma principal da conta (portugues incluído); 'frances' só para quem não tem bloco nenhum.
    const languageAppKey = primaryLanguageAppKey(state) ?? 'frances';
    if (await maybeNotify(supabase, rules, prefsCache, emailCache, userId, languageAppKey, 'featured_badge_reminder', 'perfil', {}, 'profile-edit')) created++;
  }
  return created;
}

// Fase 6b do sistema de alunas particulares (ver CLAUDE.md) -- alerta de
// infrequência pra professora. Primeiro evento em que o DESTINATÁRIO
// (userId passado a maybeNotify) não é o SUJEITO do dado -- a professora
// recebe um aviso sobre a INATIVIDADE DA ALUNA, não sobre si mesma.
// maybeNotify() já era agnóstico quanto a isso (userId é só "quem
// recebe"), então nenhuma mudança de mecanismo foi necessária -- só uma
// categoria nova ('supervisao') + templates (migration 030).
//
// Roda 1x por invocação (mesmo padrão de processWeeklyRankingResults/
// processFeaturedBadgeReminders), não por usuário/idioma como
// processUserLanguage -- porque agrupa TODAS as alunas inativas de uma
// mesma professora/idioma numa notificação só, em vez de uma por aluna
// (evita spam quando várias somem no mesmo dia; também é por isso que
// notification_rules.supervisao.daily_cap=1 já basta).
//
// Marco de dias (não cooldown corrido) -- mesmo mecanismo do calendário
// de reengajamento: só dispara quando daysSince(lastStudyDay) bate
// EXATAMENTE um dos números em schedule_days, uma vez por marco, não
// todo dia depois disso.
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

  // Chave "teacher_id|language_app_key" -- cada grupo vira NO MÁXIMO uma
  // notificação (uma professora com alunas de francês E mandarim recebe
  // até 2, uma por idioma, nunca uma por aluna).
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
    const en = uiLangFor(group.teacherId) === 'en'; // idioma do site de QUEM RECEBE (a professora)
    const studentList = group.hits
      .map((h) => `${nameById.get(h.studentId) || (en ? 'student' : 'aluna')} (${h.days} ${en ? (h.days === 1 ? 'day' : 'days') : 'dias'})`)
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

  // service role ignora RLS -- lê o progresso de TODAS as contas, é
  // exatamente o motivo dessa peça existir (ver cabeçalho do arquivo).
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
      if (!state) continue; // conta nunca usou este idioma
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

  // Amigos: "um amigo te passou no ranking" (no máximo 1 por pessoa por dia). A
  // lógica toda vive na função SQL process_friend_overtakes (migration 073), que
  // grava as notificações direto; aqui só a disparamos. Só funciona depois da
  // migration 073 aplicada -- sem ela o rpc falha e entra em errors, sem derrubar o resto.
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
    errors: errors.slice(0, 10), // não devolve a lista inteira se algo deu muito errado
  };

  console.log('notification-cron summary:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
