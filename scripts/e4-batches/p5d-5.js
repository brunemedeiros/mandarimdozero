// Paridade 5d, parte 5 (docs/historico/30-paridade-quase-iguais.md): salvar/carregar o progresso e as métricas das conquistas.
// Base: o texto do fr. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-5.js
// O que cada site salva a mais vem do FORMATO DO STATE do site (o STATE continua no app.js de cada um): campo de recurso
// que nem todo site tem (hanzi e histórias no zh; Ditados e Desafios no fr) só é gravado e lido quando o STATE do site o
// declara, no mesmo lugar e na mesma ordem de antes. Assim um site novo que carregar Ditados/Desafios e declarar os campos
// no STATE já salva e carrega o progresso deles, sem lista para esquecer.
// Equivalências (semântica, provadas por tests/paridade-sites/test_quase_iguais.js e pelos testes de ida e volta):
//  - módulos: o fr gravava checkpointProgress/reviewMilestones/levelTestProgress direto e o zh por moduleSaveFields(); com
//    módulos (o fr) moduleSaveFields() devolve exatamente esses três, na mesma ordem; ao carregar, moduleLoadApply(data,
//    cur.checkpointProgress) faz o mesmo que as três linhas do fr (cur.checkpointProgress existe sempre que o save o tem);
//  - conquistas: modos usados e Ditados/Desafios contam só quando o site tem o recurso (no outro site o campo não existe e a
//    conta dá o mesmo que antes); nível e rótulo do curso vêm de LANG_HOOKS.badgeLevel.
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
module.exports = {
  batch: 'paridade 5d-5', file: 'estado-salvar',
  desc: 'salvar e carregar o progresso, métricas das conquistas (paridade 5d, parte 5)',
  functions: {
    serializeState: { semantic: true, unify: R([
      ['function serializeState(){\n  return {\n    cards: serializeCardsForSave(STATE.cards),\n',
       "function serializeState(){\n  // Recurso que nem todo site tem (hanzi e histórias no zh; Ditados e Desafios no fr): só grava o campo que o STATE do\n  // site declara, no mesmo lugar de sempre.\n  const se = (k) => (k in STATE) ? { [k]: STATE[k] } : {};\n  return {\n    cards: serializeCardsForSave(STATE.cards),\n    ...se('hanziCards'),\n"],
      ['    dailyLessonsLog: STATE.dailyLessonsLog,\n', "    dailyLessonsLog: STATE.dailyLessonsLog,\n    ...se('hanziLessonProgress'),\n"],
      ['    dictationsAced: STATE.dictationsAced,\n', "    ...se('dictationsAced'),\n"],
      ['    checkpointProgress: STATE.checkpointProgress,\n    reviewMilestones: STATE.reviewMilestones,\n    levelTestProgress: STATE.levelTestProgress,\n    completedChallenges: STATE.completedChallenges,\n    dictations: STATE.dictations,\n    challengeReviews: STATE.challengeReviews,\n',
       "    ...se('storyProgress'),\n    // Módulos (shared/core/modulos-niveis.js): sem módulos não grava nada.\n    ...moduleSaveFields(),\n    ...se('completedChallenges'),\n    ...se('dictations'),\n    ...se('challengeReviews'),\n"]]) },
    applySerializedState: { semantic: true, unify: R([
      ['  if (data.cardVariants) STATE.cardVariants', "  // Hanzi (zh): só o progresso volta (o texto vem da camada do curso); ver mergeSavedHanziCards.\n  if ('hanziCards' in STATE && Array.isArray(data.hanziCards)) mergeSavedHanziCards(STATE.hanziCards, data.hanziCards);\n  if (data.cardVariants) STATE.cardVariants"],
      ['  STATE.cards.forEach(migrateCardToFSRS);\n', "  STATE.cards.forEach(migrateCardToFSRS);\n  if ('hanziCards' in STATE) STATE.hanziCards.forEach(migrateCardToFSRS);\n"],
      ['  if (typeof data.totalReviews === \'number\')', "  if ('hanziLessonProgress' in STATE && data.hanziLessonProgress) Object.assign(STATE.hanziLessonProgress, data.hanziLessonProgress);\n  if (typeof data.totalReviews === 'number')"],
      ["  if (typeof data.dictationsAced === 'number') STATE.dictationsAced", "  if ('dictationsAced' in STATE && typeof data.dictationsAced === 'number') STATE.dictationsAced"],
      ['  if (data.checkpointProgress) Object.assign(STATE.checkpointProgress, cur.checkpointProgress);\n  if (data.reviewMilestones) Object.assign(STATE.reviewMilestones, data.reviewMilestones);\n  if (data.levelTestProgress) Object.assign(STATE.levelTestProgress, data.levelTestProgress);\n  if (data.completedChallenges)',
       "  if ('storyProgress' in STATE && data.storyProgress) Object.assign(STATE.storyProgress, data.storyProgress);\n  // Módulos (shared/core/modulos-niveis.js): só existe no save de quem já teve módulos; com as fusões de módulo de\n  // <site>/curriculum-changes.js já aplicadas (cur.checkpointProgress).\n  moduleLoadApply(data, cur.checkpointProgress);\n  if ('completedChallenges' in STATE && data.completedChallenges)"],
      ["  if (data.challengeReviews && typeof data.challengeReviews === 'object'){", "  if ('challengeReviews' in STATE && data.challengeReviews && typeof data.challengeReviews === 'object'){"],
      ["  if (data.dictations && typeof data.dictations === 'object'){", "  if ('dictations' in STATE && data.dictations && typeof data.dictations === 'object'){"],
      ['  // leva o save através de fr/curriculum-changes.js', '  // leva o save através de <site>/curriculum-changes.js']]) },
    badgeModesUsedCount: { semantic: true, unify: R([
      ['  if (Object.keys(s.dictations || {}).length) used.dictation = true;\n',
       "  if (Object.keys(s.dictations || {}).length) used.dictation = true;\n  if (Object.values(s.hanziLessonProgress || {}).some(p => p && p.completed)) used.hanzi = true;\n  if (Object.values(s.storyProgress || {}).some(p => p && p.completed)) used.stories = true;\n"]]) },
    collectBadgeMetrics: { semantic: true, unify: R([
      ["  const level = 'A1';", '  const level = LANG_HOOKS.badgeLevel.id;'],
      ['    dictationsAced: Math.max(s.dictationsAced || 0, dictAced),\n    challengesDone: challengeIds.size ? doneIds.filter(id => challengeIds.has(id)).length : doneIds.length,\n    challengesTotal: challengeIds.size,\n    comeback: !!s.hadStreakComeback, levelLabel: \'A1\'',
       "    // Ditados e Desafios só contam no site que tem o recurso (no outro, null como antes).\n    dictationsAced: ('dictations' in STATE) ? Math.max(s.dictationsAced || 0, dictAced) : null,\n    challengesDone: ('completedChallenges' in STATE) ? (challengeIds.size ? doneIds.filter(id => challengeIds.has(id)).length : doneIds.length) : null,\n    challengesTotal: ('completedChallenges' in STATE) ? challengeIds.size : 0,\n    comeback: !!s.hadStreakComeback, levelLabel: LANG_HOOKS.badgeLevel.label"]]) },
  },
  hooks: {
    fr: { badgeLevel: "{ id: 'A1', label: 'A1' }" },
    zh: { badgeLevel: "{ id: 'HSK1', label: 'HSK 1' }" },
  },
};
