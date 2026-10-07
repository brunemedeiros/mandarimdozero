// shared/review-extras.js -- extras da aba Revisão (Proposta A + partes da B,
// aprovadas em 07/10/2026): total de hoje com tempo estimado, sessão de 5
// minutos, semana de revisão com meta de 5 dias, recordes dos modos e força
// da memória por Deck.
//
// Nada aqui muda o motor de revisão: as filas continuam vindo de
// getStudyQueue() (shared/study-queue.js), o estado de cada cartão de
// cardStudyBucket() (shared/srs.js) e a força da memória de contentMetrics()
// (shared/analytics-metrics.js, a mesma conta de "Suas palavras").
//
// Dados novos (salvos com o resto do progresso, por idioma):
//   STATE.reviewRecords   = { speedBestScore, speedBestStreak, matchBestMs, hardSeenIds[] }
//   STATE.reviewTimeStats = { cards, ms }  (tempo médio por cartão)

const REVIEW_WEEK_GOAL_DAYS = 5;
const REVIEW_SHORT_SESSION_SECONDS = 300;
const REVIEW_DEFAULT_SECONDS_PER_CARD = 10;
const REVIEW_MAX_SECONDS_PER_CARD = 60;
// Rótulos dos dias vêm do idioma do site (shared/i18n), segunda a domingo.
const REVIEW_WEEKDAY_KEYS = ['review.week.day.mon', 'review.week.day.tue', 'review.week.day.wed', 'review.week.day.thu', 'review.week.day.fri', 'review.week.day.sat', 'review.week.day.sun'];
function reviewWeekdayLabel(i){ return t(REVIEW_WEEKDAY_KEYS[i]); }

function reviewDateKey(d){
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function reviewStartOfDay(d){
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

// Segunda a domingo da semana de `now` (horário local).
function reviewWeekDates(now){
  const today = reviewStartOfDay(now || new Date());
  const offset = (today.getDay() + 6) % 7; // segunda = 0
  const monday = new Date(today.getTime());
  monday.setDate(today.getDate() - offset);
  const out = [];
  for (let i = 0; i < 7; i++){
    const d = new Date(monday.getTime());
    d.setDate(monday.getDate() + i);
    out.push(d);
  }
  return out;
}

function reviewNewCardsCap(){
  const n = (typeof STATE !== 'undefined' && STATE.studySettings) ? Number(STATE.studySettings.newCardsPerDay) : NaN;
  return Number.isFinite(n) ? n : Infinity;
}

// Semana de revisão. Dias que passaram: estudou ou não (activityLog). Hoje:
// a mesma fila de "Estudar tudo" (novos em azul, o resto em verde). Dias que
// vêm: cartões já estudados que vencem naquele dia (verde) + palavras novas do
// dia, até o limite de "Novas palavras por dia" e enquanto houver novas (azul).
function reviewWeekForecast(pool, opts){
  opts = opts || {};
  const now = opts.now || new Date();
  const log = opts.activityLog || ((typeof STATE !== 'undefined' && STATE.activityLog) || {});
  const cap = opts.newCardsPerDay != null ? opts.newCardsPerDay : reviewNewCardsCap();
  const todayKey = reviewDateKey(now);
  const todayQueue = getStudyQueue(pool, { scope: 'due', newCardsLimit: cap });
  const todayNew = todayQueue.filter(c => cardStudyBucket(c) === 'new').length;
  let remainingNew = Math.max(0, pool.filter(c => cardStudyBucket(c) === 'new').length - todayNew);
  const studied = pool.filter(c => cardStudyBucket(c) !== 'new');
  const endOfToday = reviewStartOfDay(now).getTime() + 86400000;
  let studiedDays = 0;
  const days = reviewWeekDates(now).map((d, i) => {
    const key = reviewDateKey(d);
    const day = { key, label: reviewWeekdayLabel(i), isToday: key === todayKey, isPast: key < todayKey, studied: !!log[key], newCount: 0, dueCount: 0 };
    if (day.studied && key <= todayKey) studiedDays++;
    if (day.isToday){
      day.newCount = todayNew;
      day.dueCount = todayQueue.length - todayNew;
    } else if (!day.isPast){
      const start = d.getTime();
      const end = start + 86400000;
      day.dueCount = studied.filter(c => c.due >= Math.max(start, endOfToday) && c.due < end).length;
      day.newCount = Math.min(cap, remainingNew);
      remainingNew -= day.newCount;
    }
    return day;
  });
  return { days, studiedDays, goal: REVIEW_WEEK_GOAL_DAYS };
}

// ---------- tempo por cartão e sessão de 5 minutos ----------

function reviewTimeStats(){
  if (typeof STATE === 'undefined') return { cards: 0, ms: 0 };
  if (!STATE.reviewTimeStats || typeof STATE.reviewTimeStats !== 'object') STATE.reviewTimeStats = { cards: 0, ms: 0 };
  return STATE.reviewTimeStats;
}

// Soma o tempo de uma sessão de revisão terminada. Cada cartão conta no
// máximo 60 s (uma pausa longa não estraga a média).
function recordReviewSessionTime(cardCount, ms){
  if (!(cardCount > 0) || !(ms > 0)) return;
  const stats = reviewTimeStats();
  stats.cards += cardCount;
  stats.ms += Math.min(ms, cardCount * REVIEW_MAX_SECONDS_PER_CARD * 1000);
}

// Sem histórico suficiente (menos de 10 cartões), usa 10 s por cartão.
function reviewSecondsPerCard(stats){
  stats = stats || reviewTimeStats();
  if (!stats || stats.cards < 10) return REVIEW_DEFAULT_SECONDS_PER_CARD;
  const avg = stats.ms / stats.cards / 1000;
  return Math.min(REVIEW_MAX_SECONDS_PER_CARD, Math.max(3, avg));
}

// Fila curta: os cartões já estudados primeiro (mais erros, depois mais
// atrasados), as palavras novas por último; corta quando a soma do tempo
// médio passa de 5 minutos. Nunca devolve vazio se a fila tinha cartões.
function shortReviewQueue(queue, stats){
  const spc = reviewSecondsPerCard(stats);
  const max = Math.max(1, Math.floor(REVIEW_SHORT_SESSION_SECONDS / spc));
  const old = queue.filter(c => cardStudyBucket(c) !== 'new')
    .sort((a, b) => ((b.lapses || 0) - (a.lapses || 0)) || ((a.due || 0) - (b.due || 0)));
  const fresh = queue.filter(c => cardStudyBucket(c) === 'new');
  return old.concat(fresh).slice(0, max);
}

// ---------- recordes ----------

function reviewRecords(){
  if (typeof STATE === 'undefined') return { speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] };
  const r = STATE.reviewRecords && typeof STATE.reviewRecords === 'object' ? STATE.reviewRecords : {};
  STATE.reviewRecords = {
    speedBestScore: Number(r.speedBestScore) || 0,
    speedBestStreak: Number(r.speedBestStreak) > 0 ? Number(r.speedBestStreak) : 0,
    matchBestMs: Number(r.matchBestMs) > 0 ? Number(r.matchBestMs) : null,
    hardSeenIds: Array.isArray(r.hardSeenIds) ? r.hardSeenIds : []
  };
  return STATE.reviewRecords;
}

// Devolvem true quando o resultado é um recorde novo.
function recordSpeedReviewScore(score){
  const r = reviewRecords();
  if (!(score > r.speedBestScore)) return false;
  r.speedBestScore = score;
  return true;
}

// Speed Review: maior sequência de acertos seguidos numa rodada (decisão da
// autora, 2026-10-07). Conta também a rodada que termina com as 3 vidas
// perdidas; responder devagar não ajuda (só acertar conta). Substituiu o
// recorde de tempo total (speedBestMs), que premiava rodadas curtas.
function recordSpeedReviewStreak(streak){
  const r = reviewRecords();
  if (!(streak > r.speedBestStreak)) return false;
  r.speedBestStreak = streak;
  return true;
}

function speedRecordText(rec){
  const pts = t('review.speed.points', { n: rec.speedBestScore || 0 });
  const n = rec.speedBestStreak || 0;
  if (!(n > 0)) return pts;
  return `${pts} · ${n} ${t(n === 1 ? 'review.records.streakWord.one' : 'review.records.streakWord.other')}`;
}

function recordMatchTime(ms){
  const r = reviewRecords();
  if (!(ms > 0)) return false;
  if (r.matchBestMs != null && ms >= r.matchBestMs) return false;
  r.matchBestMs = ms;
  return true;
}

function formatRecordSeconds(ms){
  return `${Math.max(1, Math.round(ms / 1000))} s`;
}

// "Já saíram da lista": palavras que já estiveram em Palavras difíceis e hoje
// não estão mais. Guarda os ids vistos na lista; a contagem é derivada.
function updateHardSeen(hardCards){
  const r = reviewRecords();
  const seen = new Set(r.hardSeenIds);
  let changed = false;
  hardCards.forEach(c => { if (!seen.has(c.id)){ seen.add(c.id); changed = true; } });
  if (changed) r.hardSeenIds = Array.from(seen);
  return changed;
}

function hardLeftCount(pool, hardCards){
  const r = reviewRecords();
  if (!r.hardSeenIds.length) return 0;
  const inPool = new Set(pool.map(c => c.id));
  const hard = new Set(hardCards.map(c => c.id));
  return r.hardSeenIds.filter(id => inPool.has(id) && !hard.has(id)).length;
}

// ---------- força da memória por Deck ----------

// Mesma conta de "Suas palavras" (contentMetrics: por Note, a irmã mais
// fraca), filtrada pelos cartões do Deck. Cartões "Na frase" ficam de fora,
// como no Perfil. Nunca estudados não entram na barra.
function deckMemoryStrength(cards){
  const isPhrase = c => typeof isStudyTrailPhraseCard === 'function' && isStudyTrailPhraseCard(c);
  const st = contentMetrics((cards || []).filter(c => !isPhrase(c))).strength;
  return { weak: st.weak, medium: st.medium, strong: st.strong, notStarted: st.not_started };
}

function deckMemoryStrengthHTML(cards){
  const s = deckMemoryStrength(cards);
  const total = s.weak + s.medium + s.strong;
  if (!total) return '';
  const seg = (n, tier) => n ? `<span class="mem-bar-seg" data-tier="${tier}" style="flex-grow:${n};"></span>` : '';
  const item = (n, tier, label) => `<span class="mem-legend-item"><i class="mem-swatch" data-tier="${tier}"></i>${escapeHTML(label)} <b>${n}</b></span>`;
  return `<div class="deck-memory" aria-label="${escapeHTML(t('review.memory.aria', { weak: s.weak, medium: s.medium, strong: s.strong }))}">
    <div class="deck-memory-title">${escapeHTML(t('review.memory.title'))}</div>
    <div class="mem-bar">${seg(s.weak, 'weak')}${seg(s.medium, 'mid')}${seg(s.strong, 'strong')}</div>
    <div class="mem-legend">${item(s.weak, 'weak', t('review.memory.weak'))}${item(s.medium, 'mid', t('review.memory.medium'))}${item(s.strong, 'strong', t('review.memory.strong'))}</div>
  </div>`;
}

// ---------- semana (HTML) ----------

function reviewWeekHTML(pool){
  const w = reviewWeekForecast(pool);
  const max = Math.max(1, ...w.days.map(d => d.newCount + d.dueCount));
  const done = w.studiedDays >= w.goal;
  const cols = w.days.map(d => {
    const label = d.isToday ? t('review.week.today') : d.label;
    let body;
    if (d.isPast){
      body = `<span class="week-check${d.studied ? ' is-done' : ''}" aria-hidden="true">${d.studied ? '✓' : ''}</span>`;
    } else {
      const total = d.newCount + d.dueCount;
      const h = n => n ? Math.max(6, Math.round(n / max * 64)) : 0;
      body = `<span class="week-total${total ? '' : ' is-zero'}">${total}</span>
        <span class="week-bar">${d.dueCount ? `<span class="week-bar-due" style="height:${h(d.dueCount)}px;"></span>` : ''}${d.newCount ? `<span class="week-bar-new" style="height:${h(d.newCount)}px;"></span>` : ''}</span>
        ${d.isToday && d.studied ? '<span class="week-check is-done week-check-small" aria-hidden="true">✓</span>' : ''}`;
    }
    const aria = d.isPast
      ? `${d.label}: ${t(d.studied ? 'review.week.studied' : 'review.week.notStudied')}`
      : `${t('review.week.ariaFuture', { day: label, due: d.dueCount, new: d.newCount })}${d.isToday && d.studied ? t('review.week.alreadyStudied') : ''}`;
    return `<li class="week-day${d.isToday ? ' is-today' : ''}${d.isPast ? ' is-past' : ''}" aria-label="${escapeHTML(aria)}">
      <div class="week-day-body">${body}</div>
      <div class="week-day-label">${escapeHTML(label)}</div>
    </li>`;
  }).join('');
  return `<div class="review-week">
    <div class="review-week-head">
      <div class="review-week-title">${escapeHTML(t('review.week.title'))}</div>
      <div class="review-week-goal${done ? ' is-done' : ''}">${escapeHTML(t(done ? 'review.week.goalDone' : 'review.week.goal'))}${t('review.week.goalCount', { n: Math.min(w.studiedDays, 7), goal: w.goal })}</div>
    </div>
    <ol class="review-week-days">${cols}</ol>
    <p class="review-week-legend">${escapeHTML(t('review.week.legendPast'))}<span class="week-key week-key-due"></span>${escapeHTML(t('review.week.legendDue'))}<span class="week-key week-key-new"></span>${escapeHTML(t('review.week.legendNew'))}</p>
  </div>`;
}
