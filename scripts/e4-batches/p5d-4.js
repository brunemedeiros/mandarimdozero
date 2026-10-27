// Paridade 5d, parte 4 (docs/historico/30-paridade-quase-iguais.md): trilha (lista, Mapa, bloco da unidade) e a lição (abrir a
// unidade, passos, barra de progresso, cartão de palavra nova, unidade concluída). Base: o texto do fr. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-4.js
// O que é do idioma vem de LANG_HOOKS: rótulo da unidade (unitEyebrow: fr "Unidade N de M · A1"; zh "Unidade N/M"), o que
// aparece depois de uma unidade na trilha (trailAfterUnit: histórias do zh), o Mapa (trailMap: fr por módulos; zh renderTrailMapView, com as histórias),
// o depois de abrir a unidade (afterOpenUnit: botão "Manual da unidade" do zh), o cartão da palavra nova (introWordHTML,
// introPhraseHTML, wireIntroCard: traços do hanzi no zh) e as chaves de texto (lessonKeys.expandLessons/unitDone).
// Equivalências usadas (semântica, provadas no navegador por tests/paridade-sites/test_quase_iguais.js):
//  - trilha: com módulos segue o fr (seletor de nível, nível vazio, Desafios do Módulo e "Revisão do A1" quando o site tem
//    esses recursos); sem módulos (o zh hoje) segue o zh (unidade a unidade, com as histórias). O selo de nível concluído só
//    existe no zh (o fr não tem o elemento);
//  - desbloqueio da próxima unidade: fr pelo nível (unitsOfLevel), zh pela lista toda; o zh tem 1 nível com todas as unidades;
//  - unidade de gramática: o zh não tem, então os ramos de gramática do fr (selo, contador do dia) não mudam nada no zh;
//  - openUnitDetail: o fr mostrava #step-progress-wrap/#step-back-btn; ninguém esconde o primeiro e o renderStep acerta o
//    segundo logo depois (nos dois sites);
//  - renderStep: o zh escondia o "Continuar" geral depois de montar o exercício; todo exercício já esconde (e a tela de
//    lição concluída o mostra de propósito); o passo 'usage' (nota de uso) só aparece em unidade com usageNote (nenhuma hoje).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
module.exports = {
  batch: 'paridade 5d-4', file: 'trilha-licao',
  desc: 'trilha e lição: abrir a unidade, passos, progresso, palavra nova, unidade concluída (paridade 5d, parte 4)',
  functions: {
    renderStepProgress: { semantic: true, unify: R([
      ["  const defs = currentStepDefs();\n  const stepCount = defs.length;\n  const stepKey = defs[STEP_STATE.currentStep].key;\n  const u = UNITS.find(x => x.id === STATE.currentUnitId);",
       "  const u = UNITS.find(x => x.id === STATE.currentUnitId);\n  const defs = currentStepDefs(u);\n  const stepCount = defs.length;\n  const stepKey = defs[STEP_STATE.currentStep].key;"],
      ['(isLessonUnit(u) ? (acq.blocks[0] || []).length : u.vocab.length)', '(isLessonUnit(u) ? (acq.blocks[0] || []).length : (u.vocab || []).length)']]) },
    renderBlockIntroCard: { semantic: true, unify: R([
      ['      <div class="vocab-phrase-french">${matchingPhrase.f} ${audioBtnHTML(matchingPhrase.f)}</div>', '      ${LANG_HOOKS.introPhraseHTML(matchingPhrase)}'],
      ['      <div class="vocab-card-word">${v.f} ${audioBtnHTML(v.f)}</div>', '      ${LANG_HOOKS.introWordHTML(v)}'],
      ['  wireAudioButtons(contentEl);\n  wireKnowButtons(contentEl);', '  wireAudioButtons(contentEl);\n  LANG_HOOKS.wireIntroCard(contentEl);\n  wireKnowButtons(contentEl);'],
      ['  if (canSpeakFrench(v.f)){', '  if (LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(v))){'],
      ['    speakFrench(v.f, mainAudioBtn, true);', '    LANG_HOOKS.speak(LANG_HOOKS.textOf(v), mainAudioBtn, true);']]) },
    buildUnitBlock: { semantic: true, unify: R([["aria-label=\"${t('fr.trail.expandLessons')}\"", 'aria-label="${t(LANG_HOOKS.lessonKeys.expandLessons)}"']]) },
    openUnitDetail: { semantic: true, unify: R([
      ["  const levelUnits = unitsOfLevel(u.level);\n", ''],
      ["  const eyebrowLabel = u.type === 'grammar'\n    ? t('trail.eyebrow.grammar')\n    : t('trail.eyebrow.unit', { num: unitOrdinalInfo(u, levelUnits).num, total: unitOrdinalInfo(u, levelUnits).total });\n  document.getElementById('ud-eyebrow').textContent = `${eyebrowLabel} · ${u.level}`;",
       "  document.getElementById('ud-eyebrow').textContent = LANG_HOOKS.unitEyebrow(u);"],
      ["  document.getElementById('ud-goal').textContent = u.goal;\n", "  document.getElementById('ud-goal').textContent = u.goal;\n  LANG_HOOKS.afterOpenUnit(u); // zh: botão \"Manual da unidade\" (some na unidade de gramática)\n"]]) },
    renderStep: { semantic: true, unify: R([
      ['  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;', '  const stepKey = currentStepDefs(u)[STEP_STATE.currentStep].key;'],
      ["  } else if (stepKey === 'dialogueCheck'){\n    renderDialogueCheckStep(u, contentEl, nextBtn);\n\n  }",
       "  } else if (stepKey === 'dialogueCheck'){\n    renderDialogueCheckStep(u, contentEl, nextBtn);\n\n  } else if (stepKey === 'usage'){\n    // Nota de uso da unidade (unidade antiga com `usageNote`; nenhuma unidade de hoje tem).\n    const note = u.usageNote;\n    contentEl.innerHTML = `\n      <div class=\"usage-note\">\n        <div class=\"usage-note-title\">${note.title} 🤔</div>\n        <p class=\"usage-note-body\">${note.body}</p>\n      </div>\n    `;\n    nextBtn.textContent = t('common.continueArrow');\n    nextBtn.style.display = 'flex';\n  }"]]) },
    renderUnitsGrid: { semantic: true, unify: R([
      ["  recalculateUnlockedUnits();\n  ensureTrailTeacherLink();\n  // Fase 2: enquanto o aluno não escolheu um nível à mão, a trilha abre no\n  // nível da unidade atual (antes voltava ao A1 a cada carregamento).\n  if (!STATE.levelUserPicked){\n    const nx = nextTrailItem(trailGroups(), STATE.unitProgress);\n    const nu = nx && UNITS.find(x => x.id === nx.unitId);\n    if (nu && nu.level) STATE.currentLevel = nu.level;\n  }\n  renderLevelSelect();\n  renderDailyGoalChip();\n  renderDailyChallengesStrip();\n  renderSideRankingCard();\n\n  const grid = document.getElementById('units-grid');\n  const levelModules = modulesOfLevel(STATE.currentLevel);\n\n  if (!levelModules.length){",
       "  recalculateUnlockedUnits();\n  // Trilha com módulos (fr): seletor de nível, Pontos de verificação etc. (shared/core/modulos-niveis.js). Sem módulos (zh\n  // hoje): unidade a unidade, com o que o site põe depois de cada uma (histórias do zh).\n  const modular = trailHasModules();\n  if (modular){\n    ensureTrailTeacherLink();\n    // Fase 2: enquanto o aluno não escolheu um nível à mão, a trilha abre no\n    // nível da unidade atual (antes voltava ao A1 a cada carregamento).\n    if (!STATE.levelUserPicked){\n      const nx = nextTrailItem(trailGroups(), STATE.unitProgress);\n      const nu = nx && UNITS.find(x => x.id === nx.unitId);\n      if (nu && nu.level) STATE.currentLevel = nu.level;\n    }\n    renderLevelSelect();\n  }\n  renderDailyGoalChip();\n  renderDailyChallengesStrip();\n  renderSideRankingCard();\n  // Selo de nível concluído no título fixo da trilha (zh: sem seletor de nível); o fr não tem esse elemento.\n  const levelBadge = document.getElementById('level-done-badge');\n  if (levelBadge) levelBadge.style.display = UNITS.every(u => STATE.unitProgress[u.id]?.completed) ? '' : 'none';\n\n  const grid = document.getElementById('units-grid');\n  const levelModules = modular ? modulesOfLevel(STATE.currentLevel) : [];\n\n  if (modular && !levelModules.length){"],
      ["    renderModulesTrailMap(mapRoot, levelModules);\n    return;", "    // Mapa: fr = módulos do nível (shared/core/modulos-niveis.js); zh = renderTrailMapView (módulos ou não, com as histórias).\n    LANG_HOOKS.trailMap(mapRoot, levelModules);\n    return;\n  }\n\n  if (!modular){\n    UNITS.forEach((u) => {\n      grid.appendChild(buildUnitBlock(u));\n      // Checkpoint de história (zh): aparece logo após a unidade que a desbloqueia, como um marco na trilha.\n      const extra = LANG_HOOKS.trailAfterUnit(u);\n      if (extra) grid.appendChild(extra);\n    });\n    return;"],
      ["  renderModuleTrailList(grid, levelModules, {\n", "  renderModuleTrailList(grid, levelModules, {\n    afterUnit(u, list){\n      const extra = LANG_HOOKS.trailAfterUnit(u); // histórias (zh); o fr não põe nada\n      if (extra) list.appendChild(extra);\n    },\n"],
      ["      appendModuleChallengesSlot(module, list); // shared/desafios-telas.js", "      if (typeof appendModuleChallengesSlot === 'function') appendModuleChallengesSlot(module, list); // shared/desafios-telas.js (site com Desafios)"],
      ["  fillModuleChallengeRows();\n\n  const reviewRow = buildLevelReviewRow(STATE.currentLevel);", "  if (typeof fillModuleChallengeRows === 'function') fillModuleChallengeRows();\n\n  const reviewRow = typeof buildLevelReviewRow === 'function' ? buildLevelReviewRow(STATE.currentLevel) : null; // shared/ditados.js (site com Ditados)"]]) },
    markUnitCompleted: { semantic: true, unify: R([
      ["registerDailyLessonCompleted(scorePct, u.type === 'grammar');", 'registerDailyLessonCompleted(scorePct, isGrammarUnit(u));'],
      ["setTimeout(() => showToast(t('toast.unitComplete')), 450);", 'setTimeout(() => showToast(t(LANG_HOOKS.lessonKeys.unitDone)), 450);']]) },
  },
  hooks: {
    fr: {
      unitEyebrow: "(u) => { const levelUnits = unitsOfLevel(u.level); const eyebrowLabel = u.type === 'grammar' ? t('trail.eyebrow.grammar') : t('trail.eyebrow.unit', { num: unitOrdinalInfo(u, levelUnits).num, total: unitOrdinalInfo(u, levelUnits).total }); return `${eyebrowLabel} · ${u.level}`; }",
      afterOpenUnit: '() => {}',
      trailAfterUnit: '() => null',
      trailMap: '(root, mods) => renderModulesTrailMap(root, mods)',
      introWordHTML: '(v) => `<div class="vocab-card-word">${v.f} ${audioBtnHTML(v.f)}</div>`',
      introPhraseHTML: '(p) => `<div class="vocab-phrase-french">${p.f} ${audioBtnHTML(p.f)}</div>`',
      wireIntroCard: '() => {}',
    },
    zh: {
      unitEyebrow: "(u) => isGrammarUnit(u) ? t('trail.eyebrow.grammar') : t('zh.path.unit.eyebrow', { id: u.id, total: UNITS.length })",
      afterOpenUnit: "(u) => { const manualBtn = document.getElementById('unit-manual-btn'); if (manualBtn) manualBtn.style.display = isGrammarUnit(u) ? 'none' : ''; }",
      trailAfterUnit: '(u) => buildStoryCheckpointCard(u)',
      trailMap: '(root) => renderTrailMapView(root)',
      introWordHTML: '(v) => `<div class="vocab-card-pinyin">${v.p}</div>\n      <div class="vocab-card-hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>`',
      introPhraseHTML: '(p) => `<div class="vocab-phrase-pinyin">${p.p}</div>\n      <div class="vocab-phrase-hanzi">${p.c} ${audioBtnHTML(p.c)}</div>`',
      wireIntroCard: '(el) => wireStrokeButtons(el)',
    },
  },
};
