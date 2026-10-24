// Paridade 5d, parte 1 (docs/historico/30-paridade-quase-iguais.md): trilha, passos da lição, painel de resposta, telas simples da
// Revisão e Configurações. Base: o texto do fr (molde da família latina) salvo onde dito. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-1.js
// `reverse`: com os ganchos trocados pelo valor de cada idioma, o texto volta EXATAMENTE ao original daquele idioma (gate textual).
// `semantic`: a diferença não é só troca de valor; a justificativa está ao lado e a prova é o teste de equivalência no navegador
// (tests/paridade-sites/test_quase_iguais.js), que roda as duas árvores cena a cena.
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
const same = { fr: (s) => s, zh: (s) => s };
module.exports = {
  batch: 'paridade 5d-1', file: 'licao-base',
  desc: 'trilha, passos da lição, painel de resposta, telas simples da Revisão e Configurações (paridade 5d, parte 1)',
  functions: {
    // ---- idênticas (sem comentários) nos dois arquivos
    isAdminUser: { keep: true, reverse: same },
    currentStudentName: { keep: true, reverse: same },
    syncSidebarToggleLabel: { keep: true, reverse: same },
    renderSettingsView: { keep: true, reverse: same },
    switchSettingsSection: { keep: true, reverse: same },
    renderReviewView: { keep: true, reverse: same },
    finishCurrentLesson: { keep: true, reverse: same },
    // ---- só troca de valor por idioma (gancho)
    renderReviewViewInner: { unify: R([['<div class="big-emoji">☕</div>', '<div class="big-emoji">${LANG_HOOKS.reviewEmptyEmoji}</div>']]),
      reverse: { fr: R([['${LANG_HOOKS.reviewEmptyEmoji}', '☕']]), zh: R([['${LANG_HOOKS.reviewEmptyEmoji}', '🍵']]) } },
    renderSpeedReview: { unify: R([['<div class="big-emoji">☕</div>', '<div class="big-emoji">${LANG_HOOKS.reviewEmptyEmoji}</div>'],
        ['<div class="french">${cardPromptText(card)}</div>', '${LANG_HOOKS.speedPromptHTML(card)}']]),
      reverse: { fr: R([['${LANG_HOOKS.reviewEmptyEmoji}', '☕'], ['${LANG_HOOKS.speedPromptHTML(card)}', '<div class="french">${cardPromptText(card)}</div>']]),
        zh: R([['${LANG_HOOKS.reviewEmptyEmoji}', '🍵'], ['${LANG_HOOKS.speedPromptHTML(card)}', '<div class="hanzi">${cardPromptText(card)}</div> <div class="pinyin">${cardPromptPinyinText(card)}</div>']]) } },
    // ---- base zh (superconjunto): o fr nunca passa opts.toneOnly (showWrongAnswerPanel manda `opts.toneOnly || false`, e
    // nenhuma chamada do fr passa toneOnly) nem tem exercício 'fullsentence'; tirando esses dois ramos, o texto é o do fr.
    showAnswerPanel: { from: 'zh', keep: true,
      reverse: { zh: (s) => s, fr: R([["(opts.toneOnly ? (opts.toneOnly === 'wrong' ? t('feedback.tone.wrong') : t('feedback.tone.missing')) : t('feedback.header.notThisTime'))", "t('feedback.header.notThisTime')"],
        ["ex && (ex.format === 'cloze' || ex.format === 'fullsentence') ? (ex.format === 'cloze' ? t('feedback.label.fullSentence') : t('feedback.label.correctAnswer'))", "ex && ex.format === 'cloze' ? t('feedback.label.fullSentence')"]]) } },
    // ---- mesma regra escrita de outro jeito (semântica)
    // zh tem 1 nível (HSK1) com as 18 unidades: LEVELS.map(unitsOfLevel).filter(...) dá [todas as unidades na ordem] = [UNITS].
    trailGroups: { keep: true, semantic: true },
    // zh: com 1 nível, "primeiro nível não concluído, senão o último" é LEVELS[0]; unitsOfLevel(id) é o mesmo filtro por level.
    computeProgressSummary: { keep: true, semantic: true },
    // o fr procura também #queue-continue-btn (fila dos Desafios); no zh esse elemento não existe (getElementById devolve null).
    findEnterAdvanceTarget: { keep: true, semantic: true },
    // contador de gramática: o zh não passa isGrammar (sem unidade de gramática hoje); `|| 0` só importa quando o campo não
    // existe no dia (zh), para não gravar NaN quando o zh tiver unidade de gramática. No fr o campo sempre existe (dailyExtra).
    registerDailyLessonCompleted: { semantic: true, unify: R([['if (isGrammar) STATE.daily.grammarLessons += 1;', 'if (isGrammar) STATE.daily.grammarLessons = (STATE.daily.grammarLessons || 0) + 1;']]) },
    // marcação da resposta/frase por idioma (fr: texto; zh: hanzi + pinyin em phraseFeedbackDetailHTML) pelos ganchos.
    clozeFeedbackDetailHTML: { semantic: true, unify: R([
      ['  const p = ex.phrase;\n  const correct = withCorrect\n    ? `<div class="feedback-correct-line">${t(\'feedback.correctAnswerColon\')} <strong>${ex.correctBlock.f}</strong></div>`\n    : \'\';\n  return `${correct}<div class="feedback-phrase-zh"><strong>${p.f}</strong> ${audioBtnHTML(p.f)}</div><div class="feedback-phrase-trans">${p.t}</div>`;',
       '  const correct = withCorrect ? LANG_HOOKS.clozeCorrectHTML(ex.correctBlock) : \'\';\n  return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, correct);']]) },
    // como achar a frase que contém a palavra: fr sem maiúscula e sem o parêntese do vocabulário; zh pelo hanzi.
    findMatchingPhrase: { semantic: true, unify: R([
      ["  const needle = word.f.replace(/\\s*\\([^()]*\\)/g, '').trim().toLowerCase();\n\n  const inUnit = sourcesOf(unit).find(p => p.f.toLowerCase().includes(needle));",
       "  const contains = LANG_HOOKS.phraseHasWord(word);\n\n  const inUnit = sourcesOf(unit).find(contains);"],
      ['    const match = sourcesOf(UNITS[i]).find(p => p.f.toLowerCase().includes(needle));', '    const match = sourcesOf(UNITS[i]).find(contains);']]) },
    // passos da lição: zh recebia a unidade por argumento (sempre a atual) e usava STEP_DEFS (mesmas chaves e rótulos do
    // getStepDefs do fr); agora a unidade é opcional (padrão: a atual) e os passos vêm de getStepDefs.
    currentStepDefs: { semantic: true, unify: R([['function currentStepDefs(){\n  const u = UNITS.find(x => x.id === STATE.currentUnitId);\n  if (u && u.type === \'grammar\') return getStepDefsGrammar();',
      "function currentStepDefs(unit){\n  const u = unit || UNITS.find(x => x.id === STATE.currentUnitId);\n  if (isGrammarUnit(u)) return getStepDefsGrammar();"]]) },
    // fr escondia o "Continuar" geral antes de montar o exercício; todo exercício (dos dois sites) esconde de novo logo em
    // seguida, no mesmo instante, então a linha não muda nada no zh. 'fullsentence' (Frase completa) só existe no zh.
    renderExerciseStep: { semantic: true, unify: R([['const exhaustedKey = currentStepDefs()[STEP_STATE.currentStep].key;', 'const exhaustedKey = currentStepDefs(u)[STEP_STATE.currentStep].key;'],
      ["  } else if (ex.format === 'scenario'){", "  } else if (ex.format === 'fullsentence'){\n    renderFullSentenceExercise(ex, contentEl, nextBtn, total); // Frase completa (zh)\n  } else if (ex.format === 'scenario'){"]]) },
  },
  hooks: {
    fr: { reviewEmptyEmoji: "'☕'", speedPromptHTML: '(card) => `<div class="french">${cardPromptText(card)}</div>`',
      clozeCorrectHTML: '(b) => `<div class="feedback-correct-line">${t(\'feedback.correctAnswerColon\')} <strong>${b.f}</strong></div>`',
      phraseFeedbackHTML: '(p, trans, correct) => `${correct}<div class="feedback-phrase-zh"><strong>${p.f}</strong> ${audioBtnHTML(p.f)}</div><div class="feedback-phrase-trans">${trans}</div>`',
      phraseHasWord: "(word) => { const needle = word.f.replace(/\\s*\\([^()]*\\)/g, '').trim().toLowerCase(); return (p) => p.f.toLowerCase().includes(needle); }" },
    zh: { reviewEmptyEmoji: "'🍵'", speedPromptHTML: '(card) => `<div class="hanzi">${cardPromptText(card)}</div>\n      <div class="pinyin">${cardPromptPinyinText(card)}</div>`',
      clozeCorrectHTML: '(b) => `${t(\'feedback.correctAnswerColon\')} <strong>${b.c}</strong> <span class="pinyin">(${b.p})</span>`',
      phraseFeedbackHTML: '(p, trans, correct) => phraseFeedbackDetailHTML(p, trans, correct)',
      phraseHasWord: '(word) => (p) => p.c.includes(word.c)' },
  },
};
