// E4 lote paridade 5d-5: salvar e carregar o progresso, métricas das conquistas (paridade 5d, parte 5).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function serializeState(){
  // Recurso que nem todo site tem (hanzi e histórias no zh; Ditados e Desafios no fr): só grava o campo que o STATE do
  // site declara, no mesmo lugar de sempre.
  const se = (k) => (k in STATE) ? { [k]: STATE[k] } : {};
  return {
    // A2: + entradas de cartões cuja busca falhou neste carregamento (progresso guardado até a próxima busca boa).
    cards: serializeCardsForSave(STATE.cards, typeof PRESERVED_SAVED_CARDS !== 'undefined' ? PRESERVED_SAVED_CARDS : null),
    ...se('hanziCards'),
    cardVariants: STATE.cardVariants,
    // Mudanças de currículo (shared/core/curriculo-progresso.js): arquivo de aposentados, versão e id da lição atual.
    ...curriculumSaveFields(),
    unitProgress: STATE.unitProgress,
    xp: STATE.xp,
    streak: STATE.streak,
    lastStudyDay: STATE.lastStudyDay,
    lastReviewReminderDay: STATE.lastReviewReminderDay,
    activityLog: STATE.activityLog,
    reviewRecords: STATE.reviewRecords,
    reviewTimeStats: STATE.reviewTimeStats,
    studyGoal: STATE.studyGoal,
    studySettings: STATE.studySettings,
    dailyMinutesLog: STATE.dailyMinutesLog,
    dailyLessonsLog: STATE.dailyLessonsLog,
    ...se('hanziLessonProgress'),
    totalReviews: STATE.totalReviews,
    hadStreakComeback: STATE.hadStreakComeback,
    totalAudioPlays: STATE.totalAudioPlays,
    everUsedSpeedReview: STATE.everUsedSpeedReview,
    everUsedMatchGame: STATE.everUsedMatchGame,
    modesUsed: STATE.modesUsed,
    ...se('dictationsAced'),
    periodXp: STATE.periodXp,
    daily: STATE.daily,
    ...se('storyProgress'),
    // Módulos (shared/core/modulos-niveis.js): sem módulos não grava nada.
    ...moduleSaveFields(),
    ...se('completedChallenges'),
    ...se('dictations'),
    ...se('challengeReviews'),
    // Boas-vindas da 1ª lição (shared/core/boas-vindas.js): por curso, só existe depois de aparecer.
    ...(STATE.welcome && Object.keys(STATE.welcome).length ? { welcome: STATE.welcome } : {}),
    // Só leitura pro Perfil (ver computeProgressSummary) -- nunca restaurado
    // de volta em applySerializedState, é recalculado a cada save.
    progressSummary: computeProgressSummary()
  };
}

function applySerializedState(data){
  if (!data) return;
  // Mudanças de currículo (shared/core/curriculo-progresso.js, igual em todos os sites): antes de aplicar o progresso,
  // leva o save através de <site>/curriculum-changes.js (fusões, aposentados e órfãos para o arquivo, volta de arquivado,
  // unidades/módulos fundidos). Idempotente; sem mudança nenhuma não altera nada.
  const cur = curriculumLoadPrepare(data);
  if (cur.hasCards) {
    // K2-C: cards da trilha só recebem a whitelist de progresso; ver
    // mergeSavedCards (shared/study-trail-model.js).
    mergeSavedCards(STATE.cards, cur.cards);
    // A2: busca dos cartões da professora/próprios falhou -> guarda as entradas salvas que ficaram sem par (nunca apagar progresso).
    if (typeof cardOriginsWithFailedFetch === 'function'){
      const failed = cardOriginsWithFailedFetch();
      PRESERVED_SAVED_CARDS = failed.length ? unmatchedSavedCardsOfOrigins(STATE.cards, cur.cards, failed) : [];
    }
  }
  // Hanzi (zh): só o progresso volta (o texto vem da camada do curso); ver mergeSavedHanziCards.
  if ('hanziCards' in STATE && Array.isArray(data.hanziCards)) mergeSavedHanziCards(STATE.hanziCards, data.hanziCards);
  if (data.cardVariants) STATE.cardVariants = CardVariants.normalizeCardVariants(cur.cardVariants);
  // Fase 3 (reestruturação do motor de memória): migração SM2->FSRS,
  // idempotente (migrateCardToFSRS só age se `stability` ainda não existe).
  STATE.cards.forEach(migrateCardToFSRS);
  if ('hanziCards' in STATE) STATE.hanziCards.forEach(migrateCardToFSRS);
  if (typeof refreshStudyCardTexts === 'function') refreshStudyCardTexts();
  if (data.unitProgress) {
    Object.assign(STATE.unitProgress, cur.unitProgress);
    // Saves de antes das lições (Modelo B) não têm lessonIdx/lessonMisses.
    Object.values(STATE.unitProgress).forEach(p => {
      if (typeof p.lessonIdx !== 'number') p.lessonIdx = 0;
      if (!p.lessonMisses) p.lessonMisses = {};
    });
    curriculumLoadReconcileUnits();
  }
  curriculumLoadStampReleased();
  if (typeof data.xp === 'number') STATE.xp = data.xp;
  if (typeof data.streak === 'number') STATE.streak = data.streak;
  // Recorde de dias seguidos (gravado por saveState em shared/auth.js; janela da sequência do topo, 2026-10-30).
  if (typeof data.bestStreak === 'number') STATE.bestStreak = Math.max(Number(STATE.bestStreak) || 0, data.bestStreak);
  if (data.lastStudyDay) STATE.lastStudyDay = data.lastStudyDay;
  if (data.lastReviewReminderDay) STATE.lastReviewReminderDay = data.lastReviewReminderDay;
  if (data.studyGoal) Object.assign(STATE.studyGoal, data.studyGoal);
  if (data.studySettings) Object.assign(STATE.studySettings, data.studySettings);
  if (data.dailyMinutesLog) Object.assign(STATE.dailyMinutesLog, data.dailyMinutesLog);
  if (data.dailyLessonsLog) Object.assign(STATE.dailyLessonsLog, data.dailyLessonsLog);
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (data.reviewRecords && typeof data.reviewRecords === 'object'){
    STATE.reviewRecords = Object.assign({ speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] }, data.reviewRecords);
    if (cur.hardSeenIds) STATE.reviewRecords.hardSeenIds = cur.hardSeenIds;
  }
  if (data.reviewTimeStats && typeof data.reviewTimeStats === 'object') STATE.reviewTimeStats = { cards: Number(data.reviewTimeStats.cards) || 0, ms: Number(data.reviewTimeStats.ms) || 0 };
  if ('hanziLessonProgress' in STATE && data.hanziLessonProgress) Object.assign(STATE.hanziLessonProgress, data.hanziLessonProgress);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.hadStreakComeback) STATE.hadStreakComeback = true;
  if (typeof data.totalAudioPlays === 'number') STATE.totalAudioPlays = data.totalAudioPlays;
  if (data.everUsedSpeedReview) STATE.everUsedSpeedReview = true;
  if (data.everUsedMatchGame) STATE.everUsedMatchGame = true;
  if (data.modesUsed && typeof data.modesUsed === 'object') Object.assign(STATE.modesUsed, data.modesUsed);
  if ('dictationsAced' in STATE && typeof data.dictationsAced === 'number') STATE.dictationsAced = Math.max(STATE.dictationsAced || 0, data.dictationsAced);
  if (data.periodXp) Object.assign(STATE.periodXp, data.periodXp);
  if (data.daily) Object.assign(STATE.daily, data.daily);
  // Boas-vindas da 1ª lição (por curso): só acrescenta marcas, nunca apaga.
  if (data.welcome && typeof data.welcome === 'object') STATE.welcome = Object.assign({}, STATE.welcome, data.welcome);
  if ('storyProgress' in STATE && data.storyProgress) Object.assign(STATE.storyProgress, data.storyProgress);
  // Módulos (shared/core/modulos-niveis.js): só existe no save de quem já teve módulos; com as fusões de módulo de
  // <site>/curriculum-changes.js já aplicadas (cur.checkpointProgress).
  moduleLoadApply(data, cur.checkpointProgress);
  if ('completedChallenges' in STATE && data.completedChallenges) Object.assign(STATE.completedChallenges, data.completedChallenges);
  if ('challengeReviews' in STATE && data.challengeReviews && typeof data.challengeReviews === 'object'){
    Object.keys(data.challengeReviews).forEach(id => {
      const e = sanitizeChallengeReviewEntry(data.challengeReviews[id], id);
      if (e) STATE.challengeReviews[id] = e;
    });
  }
  // Save antigo não tem o campo (nada a fazer); registros malformados são
  // saneados pela mesma função que atualiza (bestScore nunca diminui).
  if ('dictations' in STATE && data.dictations && typeof data.dictations === 'object'){
    Object.keys(data.dictations).forEach(id => {
      if (id === '__proto__' || id === 'constructor' || id === 'prototype') return;
      const cur = STATE.dictations[id], inc = sanitizeDictationRecord(data.dictations[id]);
      STATE.dictations[id] = cur ? Object.assign({}, inc, { bestScore: Math.max(inc.bestScore, cur.bestScore || 0) }) : inc;
    });
  }
}

// P1 (docs/p1-memoria-por-idioma.md): curso que ainda não tem bloco salvo recebe a memória dos cartões da professora e
// próprios do IDIOMA (LangCardMemory.memoryEntriesForLoad). Só sobe progresso: um cartão que já tem mais histórico no STATE
// fica como está. Cartões da trilha não são tocados (as entradas são só de professora/próprios).
function applyLanguageCardMemory(entries){
  if (!Array.isArray(entries) || !entries.length || typeof LangCardMemory === 'undefined') return;
  const byId = {};
  STATE.cards.forEach(c => { if (c && c.id != null) byId[String(c.id)] = c; });
  const better = entries.filter(e => {
    const c = byId[String(e.id)];
    return !c || LangCardMemory.compareHistory(e, c) > 0;
  });
  mergeSavedCards(STATE.cards, better);
  // A2: busca falhou -> as entradas sem par ficam guardadas para o próximo save (nunca apagar progresso).
  if (typeof cardOriginsWithFailedFetch === 'function'){
    const failed = cardOriginsWithFailedFetch();
    if (failed.length){
      const keep = unmatchedSavedCardsOfOrigins(STATE.cards, entries, failed);
      const ids = new Set(PRESERVED_SAVED_CARDS.map(s => s && s.id));
      keep.forEach(s => { if (!ids.has(s.id)) PRESERVED_SAVED_CARDS.push(s); });
    }
  }
  STATE.cards.forEach(c => { if (c && (c.origin === 'teacher' || c.origin === 'self')) migrateCardToFSRS(c); });
}

function badgeModesUsedCount(s){
  const used = Object.assign({}, s.modesUsed || {});
  if (s.totalReviews > 0) used.review = true;
  if (s.everUsedSpeedReview) used.speed = true;
  if (s.everUsedMatchGame) used.match = true;
  if (Object.keys(s.completedChallenges || {}).length) used.challenges = true;
  if (Object.keys(s.dictations || {}).length) used.dictation = true;
  if (Object.values(s.hanziLessonProgress || {}).some(p => p && p.completed)) used.hanzi = true;
  if (Object.values(s.storyProgress || {}).some(p => p && p.completed)) used.stories = true;
  return BADGE_MODES.filter(k => used[k]).length;
}

// Métricas das trilhas neste site (francês). Unidade pulada pelo ponto de verificação conta para o nível.
function collectBadgeMetrics(s){
  const level = LANG_HOOKS.badgeLevel.id;
  const units = UNITS.filter(u => u.level === level);
  const cpUnits = units.filter(u => (u.lessons || []).some(l => l.isCheckpoint));
  const mods = (typeof MODULES !== 'undefined' ? MODULES : []).filter(m => m.level === level);
  const checkpointsTotal = cpUnits.length + mods.length;
  const checkpointsAced = cpUnits.filter(u => s.unitProgress[u.id]?.checkpointAced).length
    + mods.filter(m => (s.checkpointProgress?.[m.id]?.bestScore || 0) >= 100).length;
  const words = studyTrailWordProgress(s.cards);
  const dictAced = Object.values(s.dictations || {}).filter(r => (r && r.bestScore || 0) >= 90).length;
  // Desafios vêm do banco (loadChallengesFromDB, ao abrir a aba): sem a lista, conta tudo o que foi concluído.
  const published = (typeof CHALLENGES !== 'undefined' && Array.isArray(CHALLENGES) ? CHALLENGES : []).filter(c => c.status === 'published');
  const challengeIds = new Set(published.map(c => c.id));
  const doneIds = Object.keys(s.completedChallenges || {}).filter(id => s.completedChallenges[id]);
  return {
    studyDays: Object.keys(s.activityLog || {}).filter(k => s.activityLog[k] > 0).length,
    reviews: s.totalReviews || 0, streak: s.streak || 0, xp: s.xp || 0,
    courseDone: units.filter(u => s.unitProgress[u.id]?.completed).length, courseTotal: units.length,
    courseAced: checkpointsTotal > 0 && checkpointsAced >= checkpointsTotal,
    audioPlays: s.totalAudioPlays || 0, modesUsed: badgeModesUsedCount(s), modesTotal: BADGE_MODES.length,
    weekends: countStudyWeekends(s.activityLog), wordsLearned: words.learned, wordsTotal: words.total,
    checkpointsAced, checkpointsTotal,
    // Ditados e Desafios só contam no site que tem o recurso (no outro, null como antes).
    dictationsAced: ('dictations' in STATE) ? Math.max(s.dictationsAced || 0, dictAced) : null,
    challengesDone: ('completedChallenges' in STATE) ? (challengeIds.size ? doneIds.filter(id => challengeIds.has(id)).length : doneIds.length) : null,
    challengesTotal: ('completedChallenges' in STATE) ? challengeIds.size : 0,
    comeback: !!s.hadStreakComeback, levelLabel: LANG_HOOKS.badgeLevel.label
  };
}
