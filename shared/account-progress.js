// E3 / C2 (docs/i18n/auditoria-e3-progresso-por-curso.md): o que é da CONTA e não de um curso.
//
// Sequência de dias (`streak`, `lastStudyDay`, `activityLog`), `hadStreakComeback`, lições do dia (`dailyLessonsLog`) e o
// lembrete de revisão (`lastReviewReminderDay`) passam a morar em progress.data._account, somados entre todos os blocos de
// curso da conta. Os blocos continuam gravando os mesmos campos ("espelho"): 037, 059, 070 e o notification-cron leem
// por bloco e só passam a ler `_account` no C3.
//
// Regras de união (nunca perdem dado):
//   lastStudyDay, lastReviewReminderDay = o maior dia
//   activityLog, dailyLessonsLog        = união dos dias, maior valor por dia
//   hadStreakComeback                   = OU
//   streak = maior entre (dias seguidos no log terminando em lastStudyDay) e (streaks vivos cujo lastStudyDay é esse mesmo dia)
// NÃO entram aqui: studyGoal (objetivo e níveis são por idioma; hora do lembrete espera a decisão P2), dailyMinutesLog (legado).
//
// Funções puras, sem DOM nem rede. Depende de LanguageRegistry (languages/registry.js).
(function(root){
  'use strict';

  var ACCOUNT_FIELDS = ['streak', 'lastStudyDay', 'activityLog', 'hadStreakComeback', 'dailyLessonsLog', 'lastReviewReminderDay'];
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  function isDay(s){ return typeof s === 'string' && DAY_RE.test(s); }
  function maxDay(a, b){
    if (!isDay(a)) return isDay(b) ? b : null;
    if (!isDay(b)) return a;
    return a >= b ? a : b;
  }
  function isObj(o){ return !!o && typeof o === 'object' && !Array.isArray(o); }

  function unionMax(a, b){
    var out = {};
    [a, b].forEach(function(src){
      if (!isObj(src)) return;
      Object.keys(src).forEach(function(k){
        if (!isDay(k)) return;
        var v = Number(src[k]);
        if (!isFinite(v)) return;
        out[k] = (out[k] === undefined || v > out[k]) ? v : out[k];
      });
    });
    return out;
  }

  function prevDay(day){
    var d = new Date(day + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  // dias seguidos com atividade no log, terminando em `day`
  function consecutiveEndingAt(log, day){
    var n = 0, d = day;
    while (isDay(d) && Number(log[d]) > 0){ n++; d = prevDay(d); }
    return n;
  }

  // Só os campos da conta que existirem no bloco.
  function pickAccount(block){
    var out = {};
    if (!isObj(block)) return out;
    ACCOUNT_FIELDS.forEach(function(k){ if (block[k] !== undefined && block[k] !== null) out[k] = block[k]; });
    return out;
  }

  function mergeAccount(a, b){
    a = isObj(a) ? a : {}; b = isObj(b) ? b : {};
    var out = {};
    var last = maxDay(a.lastStudyDay, b.lastStudyDay);
    if (last) out.lastStudyDay = last;
    var rem = maxDay(a.lastReviewReminderDay, b.lastReviewReminderDay);
    if (rem) out.lastReviewReminderDay = rem;
    var log = unionMax(a.activityLog, b.activityLog);
    if (Object.keys(log).length || a.activityLog !== undefined || b.activityLog !== undefined) out.activityLog = log;
    var lessons = unionMax(a.dailyLessonsLog, b.dailyLessonsLog);
    if (Object.keys(lessons).length || a.dailyLessonsLog !== undefined || b.dailyLessonsLog !== undefined) out.dailyLessonsLog = lessons;
    if (a.hadStreakComeback || b.hadStreakComeback) out.hadStreakComeback = true;
    // streak
    var candidates = [];
    if (last){
      candidates.push(consecutiveEndingAt(log, last));
      [a, b].forEach(function(x){ if (x.lastStudyDay === last && typeof x.streak === 'number') candidates.push(x.streak); });
    } else {
      [a, b].forEach(function(x){ if (typeof x.streak === 'number') candidates.push(x.streak); });
    }
    if (candidates.length) out.streak = Math.max.apply(null, candidates);
    return out;
  }

  // Chaves de progress.data que são BLOCOS de curso (frances, mandarim, portugues, frances@en...). Nunca _meta, _account
  // nem campos soltos na raiz (formato antigo do chinês).
  function isBlockKey(k){
    if (typeof k !== 'string' || k.charAt(0) === '_') return false;
    var base = k.indexOf('@') > 0 ? k.slice(0, k.indexOf('@')) : k;
    return LanguageRegistry.isKnownAppKey(base);
  }

  // Conta inteira: _account (se houver) + todos os blocos + o formato antigo na raiz da linha (6 contas em produção em 2026-10-12).
  function deriveAccountFromRow(row){
    if (!isObj(row)) return {};
    var acc = isObj(row._account) ? mergeAccount({}, row._account) : {};
    Object.keys(row).forEach(function(k){ if (isBlockKey(k)) acc = mergeAccount(acc, pickAccount(row[k])); });
    var legacyRoot = pickAccount(row);
    if (Object.keys(legacyRoot).length) acc = mergeAccount(acc, legacyRoot);
    return acc;
  }

  // Aplica a conta no STATE do app (depois de applySerializedState do bloco). Só adiciona/aumenta; nunca apaga.
  function applyAccountToState(state, account){
    if (!state || !isObj(account)) return state;
    if (isDay(account.lastStudyDay)) state.lastStudyDay = account.lastStudyDay;
    if (typeof account.streak === 'number') state.streak = account.streak;
    if (account.hadStreakComeback) state.hadStreakComeback = true;
    if (isDay(account.lastReviewReminderDay)) state.lastReviewReminderDay = maxDay(state.lastReviewReminderDay, account.lastReviewReminderDay);
    if (isObj(account.activityLog)) state.activityLog = Object.assign(isObj(state.activityLog) ? state.activityLog : {}, unionMax(state.activityLog, account.activityLog));
    if (isObj(account.dailyLessonsLog)) state.dailyLessonsLog = Object.assign(isObj(state.dailyLessonsLog) ? state.dailyLessonsLog : {}, unionMax(state.dailyLessonsLog, account.dailyLessonsLog));
    return state;
  }

  // ---- espelho por idioma ----
  // O STATE carrega a UNIÃO dos dias de todos os idiomas (para a sequência continuar). Mas os leitores por idioma (painel da
  // professora, perfil, alerta de infrequência) querem os dias estudados NAQUELE idioma. Por isso o bloco grava só os dias do próprio
  // idioma: o que o bloco já tinha ao carregar + o que mudou nesta sessão em relação à união carregada.
  function copyDays(src){ var out = {}; if (isObj(src)) Object.keys(src).forEach(function(k){ var v = Number(src[k]); if (isDay(k) && isFinite(v)) out[k] = v; }); return out; }
  function snapshotBase(ownState, unionState){
    return {
      ownActivityLog: copyDays(ownState && ownState.activityLog), ownDailyLessonsLog: copyDays(ownState && ownState.dailyLessonsLog),
      ownLastStudyDay: isDay(ownState && ownState.lastStudyDay) ? ownState.lastStudyDay : null,
      unionActivityLog: copyDays(unionState && unionState.activityLog), unionDailyLessonsLog: copyDays(unionState && unionState.dailyLessonsLog),
      unionLastStudyDay: isDay(unionState && unionState.lastStudyDay) ? unionState.lastStudyDay : null
    };
  }
  function ownDaysSince(ownBase, unionBase, current){
    var out = copyDays(ownBase);
    var cur = copyDays(current);
    Object.keys(cur).forEach(function(d){ var delta = cur[d] - (Number(unionBase && unionBase[d]) || 0); if (delta > 0) out[d] = (out[d] || 0) + delta; });
    return out;
  }
  // Campos do bloco (idioma) que dependem só do que foi estudado nesse idioma.
  function mirrorForBlock(payload, base){
    if (!base || !isObj(payload)) return {};
    var out = {};
    out.activityLog = ownDaysSince(base.ownActivityLog, base.unionActivityLog, payload.activityLog);
    out.dailyLessonsLog = ownDaysSince(base.ownDailyLessonsLog, base.unionDailyLessonsLog, payload.dailyLessonsLog);
    var last = (isDay(payload.lastStudyDay) && payload.lastStudyDay !== base.unionLastStudyDay) ? payload.lastStudyDay : base.ownLastStudyDay;
    if (last) out.lastStudyDay = last;
    return out;
  }

  var api = { snapshotBase: snapshotBase, mirrorForBlock: mirrorForBlock, ACCOUNT_FIELDS: ACCOUNT_FIELDS, pickAccount: pickAccount, mergeAccount: mergeAccount, deriveAccountFromRow: deriveAccountFromRow, applyAccountToState: applyAccountToState, consecutiveEndingAt: consecutiveEndingAt };
  (typeof globalThis !== 'undefined' ? globalThis : root).AccountProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
