// Paridade 5d, parte 3 (docs/historico/30-paridade-quase-iguais.md): exercícios da lição (montagem da série, múltipla escolha,
// digitar o que ouviu, completar a frase, ordenar/traduzir) e a explicação/dica do erro. Base: o texto do fr. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-3.js
// O que é do idioma vem de LANG_HOOKS:
//  - textOf(x): forma escrita no idioma estudado (fr x.f; zh x.c, o hanzi);
//  - lessonKeys: chaves de texto de cada site (os textos continuam os mesmos);
//  - marcação (itemPromptHTML, clozeSentenceHTML, clozeOptionsHTML, reorderBlockHTML, reorderSlotHTML, reorderDoneHTML,
//    itemAnswerHTML, originPhraseHTML; zh com pinyin) e texto falado (phraseSpoken, clozeSpoken: o zh usa só a 1ª forma
//    de frase com "/");
//  - typedAnswer: correção da resposta digitada (fr: família latina, "oe" por "œ" = quase/meio ponto; zh: pinyin, tom
//    errado = erro com aviso "tom"), o que comparar no "Sua resposta" e o teclado de letras/tons;
//  - fullSentenceExercises(unit): "Frase completa" (só zh; no fr devolve [] sem sortear nada).
// Equivalências usadas (semântica, provadas no navegador por tests/paridade-sites/test_quase_iguais.js):
//  - finish(...) recebe um veredito { ok, almost, toneOnly }: fr almost = 'quase' (meio ponto), zh toneOnly = tom errado;
//    no zh almost é sempre false e no fr toneOnly é sempre false (showWrongAnswerPanel já fazia `toneOnly || false`);
//  - montagem da série: o zh fazia "filtra o cenário, depois monta o ordenar" e o fr fazia os dois na mesma volta; sem
//    frase com cenário (o zh hoje) a ordem dos sorteios é a mesma;
//  - explicação final sem frase e sem palavra: o fr chamava sem vocabIdx e o zh com `ex && ex.vocabIdx`; só exercício de
//    palavra (que tem `item`, outro ramo) tem vocabIdx, então dá o mesmo.
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
const K = (k) => "t(LANG_HOOKS.lessonKeys." + k;
module.exports = {
  batch: 'paridade 5d-3', file: 'licao-exercicios',
  desc: 'exercícios da lição, explicação e dica do erro (paridade 5d, parte 3)',
  functions: {
    noteOrConceptReviewHTML: { keep: true, semantic: true },
    answerExplanationHTML: { semantic: true, unify: R([
      ["  if (ex && ex.format === 'fullsentence'){\n    // tradução completa já aparece no prompt e na frase preenchida — repeti-la aqui é redundante\n    return '';\n  }",
       "  if (ex && ex.format === 'fullsentence') return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, ''); // Frase completa (zh)"],
      ["    return `<div class=\"feedback-phrase-zh\"><strong>${ex.phrase.f}</strong> ${audioBtnHTML(ex.phrase.f)}</div><div class=\"feedback-phrase-trans\">${ex.phrase.t}</div>${noteOrConceptReviewHTML(u) || ''}`;",
       "    return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, '') + (noteOrConceptReviewHTML(u) || '');"],
      ["<p class=\"usage-note-body\"><strong>${origin.f}</strong><br>${origin.t}</p>`", "<p class=\"usage-note-body\">${LANG_HOOKS.originPhraseHTML(origin)}</p>`"],
      ["    return `<div class=\"feedback-correct-line\">${t('feedback.correctAnswerColon')} <strong>${ex.item.f}</strong> ${audioBtnHTML(ex.item.f)}</div><div class=\"feedback-phrase-trans\">${ex.item.t}</div>${originHTML}`;",
       "    return LANG_HOOKS.itemAnswerHTML(ex.item) + originHTML;"],
      ["  const u = UNITS.find(x => x.id === STATE.currentUnitId);\n  return noteOrConceptReviewHTML(u) || '';", "  const u = UNITS.find(x => x.id === STATE.currentUnitId);\n  return noteOrConceptReviewHTML(u, ex && ex.vocabIdx) || '';"]]) },
    buildExerciseHint: { semantic: true, unify: R([
      ["      const masked = maskWordInText(phrase.f, item.f) || phrase.f;\n      return t('fr.hint.thinkWhen', { masked });",
       "      const masked = maskWordInText(LANG_HOOKS.textOf(phrase), LANG_HOOKS.textOf(item)) || LANG_HOOKS.textOf(phrase);\n      return " + K('hintThinkWhen') + ", { masked });"],
      ["return t('fr.hint.listenAgain');", "return " + K('hintListenAgain') + ");"],
      ["return t('fr.hint.thinkContext', { title: unit.title });", "return " + K('hintThinkContext') + ", { title: unit.title });"],
      ["      ? t('fr.hint.reorderTranslate')\n      : t('fr.hint.reorderOrder');", "      ? " + K('hintReorderTranslate') + ")\n      : " + K('hintReorderOrder') + ");"],
      ["  if (ex.format === 'scenario'){", "  if (ex.format === 'fullsentence'){\n    return " + K('hintFullSentence') + "); // Frase completa (zh)\n  }\n  if (ex.format === 'scenario'){"],
      ["return t('fr.hint.cloze');", "return " + K('hintCloze') + ");"]]) },
    buildReorderDistractors: { semantic: true, unify: R([
      ['correctBlocks.map(b => b.f)', 'correctBlocks.map(LANG_HOOKS.textOf)'],
      ['if (correctTexts.has(b.f) || seen.has(b.f)) return false;\n      seen.add(b.f);', 'const k = LANG_HOOKS.textOf(b);\n      if (correctTexts.has(k) || seen.has(k)) return false;\n      seen.add(k);'],
      ['picked.map(b => b.f)', 'picked.map(LANG_HOOKS.textOf)']]) },
    buildExerciseSet: { semantic: true, unify: R([
      ['.filter(b => b.f !== correctBlock.f);', '.filter(b => LANG_HOOKS.textOf(b) !== LANG_HOOKS.textOf(correctBlock));'],
      ['.filter(b => b.f !== correctBlock.f && !distractors.includes(b));', '.filter(b => LANG_HOOKS.textOf(b) !== LANG_HOOKS.textOf(correctBlock) && !distractors.includes(b));'],
      ['  return shuffle([...vocabExercises, ...cappedReorderExercises, ...scenarioExercises, ...trueFalseExercises, ...clozeExercises]);',
       '  // "Frase completa" (escolher a frase certa entre 4): só o zh tem; no fr a lista vem vazia, sem sortear nada.\n  const fullSentenceExercises = LANG_HOOKS.fullSentenceExercises(unit);\n  return shuffle([...vocabExercises, ...cappedReorderExercises, ...scenarioExercises, ...trueFalseExercises, ...clozeExercises, ...fullSentenceExercises]);']]) },
    renderMultipleChoiceExercise: { semantic: true, unify: R([
      ["${t('fr.exercise.whatMeans')}", "${" + K('whatMeans') + ")}"],
      ['        <div class="prompt-french">${ex.item.f}</div>\n        ${audioBtnHTML(ex.item.f)}', '        ${LANG_HOOKS.itemPromptHTML(ex.item)}\n        ${audioBtnHTML(LANG_HOOKS.textOf(ex.item))}'],
      ["${t('fr.exercise.listenChooseMeaning')}", "${" + K('listenChoose') + ")}"],
      ["${audioBtnHTML(ex.item.f, 'audio-btn-lg')}", "${audioBtnHTML(LANG_HOOKS.textOf(ex.item), 'audio-btn-lg')}"],
      ["${t('fr.exercise.tapToHearAgain')}", "${" + K('tapAgain') + ")}"],
      ["${t('fr.exercise.counter', {", "${" + K('counter') + ", {"],
      ["canSpeakFrench(ex.item.f)){", "LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(ex.item))){"],
      ["    speakFrench(ex.item.f, audioEl, true);", "    LANG_HOOKS.speak(LANG_HOOKS.textOf(ex.item), audioEl, true);"]]) },
    renderVocabTypeExercise: { semantic: true, unify: R([
      ["${t('fr.exercise.counter', {", "${" + K('counter') + ", {"],
      ["${t('fr.exercise.typeWhatYouHeard')}", "${" + K('typeHeard') + ")}"],
      ["${audioBtnHTML(ex.item.f, 'audio-btn-lg')}", "${audioBtnHTML(LANG_HOOKS.textOf(ex.item), 'audio-btn-lg')}"],
      ["${t('fr.exercise.tapToHearAgain')}", "${" + K('tapAgain') + ")}"],
      ["placeholder=\"${t('fr.exercise.typeInFrench')}\">\n        ${frAccentPickerHTML(ex.item.f)}", "placeholder=\"${" + K('typePlaceholder') + ")}\">\n        ${LANG_HOOKS.typedAnswer.inputExtraHTML(ex.item)}"],
      ["  if (canSpeakFrench(ex.item.f)) speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'), true);",
       "  if (LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(ex.item))) LANG_HOOKS.speak(LANG_HOOKS.textOf(ex.item), contentEl.querySelector('.audio-btn-lg'), true);"],
      ["  wireFrAccentPicker(contentEl.querySelector('.fr-accent-picker'), inputEl);", "  LANG_HOOKS.typedAnswer.wireInputExtra(contentEl, inputEl);"],
      ["  // isCorrect: true | false | 'quase' (só \"oe\" no lugar de \"œ\": meio ponto, mostra a forma certa).\n  function finish(isCorrect, typed){\n    const almost = isCorrect === 'quase';\n    STEP_STATE.exerciseAnswered = true;\n    playFeedbackSound(!!isCorrect);",
       "  // v = { ok, almost, toneOnly } (LANG_HOOKS.typedAnswer.verdict). almost: \"quase\" do fr (\"oe\" no lugar de \"œ\": meio\n  // ponto, mostra a forma certa); toneOnly: erro só de tom do zh (é erro, com o aviso do tom).\n  function finish(v, typed){\n    const almost = !!v.almost;\n    STEP_STATE.exerciseAnswered = true;\n    playFeedbackSound(!!v.ok);"],
      ["    if (isCorrect){\n      STEP_STATE.exerciseScore += almost ? 0.5 : 1;", "    if (v.ok){\n      STEP_STATE.exerciseScore += almost ? 0.5 : 1;"],
      ["<strong>${ex.item.f}</strong> ${audioBtnHTML(ex.item.f)}`), 500);", "<strong>${LANG_HOOKS.textOf(ex.item)}</strong> ${audioBtnHTML(LANG_HOOKS.textOf(ex.item))}`), 500);"],
      ["      showWrongAnswerPanel(contentEl, ex, { attemptHTML: typedAttemptHTML(typed, ex.item.f) });", "      showWrongAnswerPanel(contentEl, ex, { toneOnly: v.toneOnly, attemptHTML: typedAttemptHTML(typed, LANG_HOOKS.typedAnswer.expected(ex.item)) });"],
      ["    const result = lessonTypedAnswerResult(inputEl.value, ex.item.f);\n    finish(result === 'ok' ? true : result === 'quase' ? 'quase' : false, inputEl.value);",
       "    finish(LANG_HOOKS.typedAnswer.verdict(inputEl.value, ex.item), inputEl.value);"]]) },
    renderClozeExercise: { semantic: true, unify: R([
      ["  const sentenceHTML = ex.phrase.blocks.map((b, i) =>\n    i === ex.blankIdx ? '<span class=\"cloze-blank\" id=\"cloze-blank\">___</span>' : b.f\n  ).join(' ');",
       "  const sentenceHTML = LANG_HOOKS.clozeSentenceHTML(ex);"],
      ["${t('fr.exercise.counter', {", "${" + K('counter') + ", {"],
      ["placeholder=\"${t('review.cloze.placeholder')}\">\n          ${frAccentPickerHTML(ex.correctBlock.f)}", "placeholder=\"${" + K('clozePlaceholder') + ")}\">\n          ${LANG_HOOKS.typedAnswer.inputExtraHTML(ex.correctBlock)}"],
      ["<div class=\"cloze-options\">${ex.options.map((opt, i) => `<button class=\"cloze-option\" data-idx=\"${i}\">${opt.f}</button>`).join('')}</div>", "<div class=\"cloze-options\">${LANG_HOOKS.clozeOptionsHTML(ex.options)}</div>"],
      ["document.getElementById('cloze-blank').textContent = ex.correctBlock.f;", "document.getElementById('cloze-blank').textContent = LANG_HOOKS.textOf(ex.correctBlock);"],
      ["    audioRow.innerHTML = audioBtnHTML(ex.phrase.f);\n    wireAudioButtons(audioRow);\n    if (canSpeakFrench(ex.phrase.f)) speakFrench(ex.phrase.f, audioRow.querySelector('.audio-btn'), true);",
       "    const spoken = LANG_HOOKS.clozeSpoken(ex);\n    audioRow.innerHTML = audioBtnHTML(spoken);\n    wireAudioButtons(audioRow);\n    if (LANG_HOOKS.canSpeak(spoken)) LANG_HOOKS.speak(spoken, audioRow.querySelector('.audio-btn'), true);"],
      ["  // isCorrect: true | false | 'quase' (lacuna digitada com \"oe\" no lugar de \"œ\": meio ponto, mostra a forma certa).\n  function finish(isCorrect, typed){\n    const almost = isCorrect === 'quase';\n    STEP_STATE.exerciseAnswered = true;\n    playFeedbackSound(!!isCorrect);\n    revealBlank(isCorrect ? 'ok' : 'wrong');\n\n    if (isCorrect){",
       "  // v = { ok, almost, toneOnly } (LANG_HOOKS.typedAnswer.verdict; na múltipla escolha só `ok`). almost: lacuna digitada\n  // com \"oe\" no lugar de \"œ\" (fr): meio ponto, mostra a forma certa. toneOnly: erro só de tom (zh).\n  function finish(v, typed){\n    const almost = !!v.almost;\n    STEP_STATE.exerciseAnswered = true;\n    playFeedbackSound(!!v.ok);\n    revealBlank(v.ok ? 'ok' : 'wrong');\n\n    if (v.ok){"],
      ["      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { attemptHTML: typedAttemptHTML(typed, ex.correctBlock.f) }), 500);", "      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { toneOnly: v.toneOnly, attemptHTML: typedAttemptHTML(typed, LANG_HOOKS.typedAnswer.expected(ex.correctBlock)) }), 500);"],
      ["    wireFrAccentPicker(contentEl.querySelector('.fr-accent-picker'), inputEl);", "    LANG_HOOKS.typedAnswer.wireInputExtra(contentEl, inputEl);"],
      ["      const result = lessonTypedAnswerResult(inputEl.value, ex.correctBlock.f);\n      finish(result === 'ok' ? true : result === 'quase' ? 'quase' : false, inputEl.value);",
       "      finish(LANG_HOOKS.typedAnswer.verdict(inputEl.value, ex.correctBlock), inputEl.value);"],
      ["        finish(isCorrect);", "        finish({ ok: isCorrect, almost: false, toneOnly: undefined });"]]) },
    renderReorderExercise: { semantic: true, unify: R([
      ["${t('fr.exercise.counter', {", "${" + K('counter') + ", {"],
      ["${isTranslate ? t('fr.exercise.translateToFrench') : t('fr.exercise.orderSentence')}", "${isTranslate ? " + K('translateTo') + ") : " + K('orderSentence') + ")}"],
      ["${audioBtnHTML(ex.phrase.f, 'audio-btn-lg')}", "${audioBtnHTML(LANG_HOOKS.phraseSpoken(ex.phrase), 'audio-btn-lg')}"],
      ["${t('fr.reorder.tapHint')}", "${" + K('reorderTapHint') + ")}"],
      ['return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="french">${block.f}</div></div>`;', 'return `<div class="reorder-slot filled" data-seq-pos="${i}">${LANG_HOOKS.reorderSlotHTML(block)}</div>`;'],
      ["        ${block.f}\n      </button>`;", "        ${LANG_HOOKS.reorderBlockHTML(block)}\n      </button>`;"],
      ['        const sourceText = btn.textContent.trim();', '        const sourceText = LANG_HOOKS.flySource(btn);'],
      ['      const detail = `<div class="reorder-final"><div class="reorder-final-fr">${ex.phrase.f} ${audioBtnHTML(ex.phrase.f)}</div><div class="reorder-final-tr">${ex.phrase.t}</div></div>`;', '      const detail = LANG_HOOKS.reorderDoneHTML(ex.phrase);'],
      ["        return `<span class=\"reorder-attempt-w ${reorderBlockStatus(block, pos, correctOrder)}\">${block.f}</span>`;\n      }).join(' ')}</div>`;",
       "        return `<span class=\"reorder-attempt-w ${reorderBlockStatus(block, pos, correctOrder)}\">${LANG_HOOKS.reorderBlockHTML(block)}</span>`;\n      }).join(LANG_HOOKS.reorderAttemptSep)}</div>`;"],
      ['      `<div class="reorder-slot filled correct"><div class="french">${block.f}</div></div>`', '      `<div class="reorder-slot filled correct">${LANG_HOOKS.reorderSlotHTML(block)}</div>`']]) },
  },
  hooks: {
    fr: {
      textOf: '(x) => x.f',
      lessonKeys: "{ counter: 'fr.exercise.counter', whatMeans: 'fr.exercise.whatMeans', listenChoose: 'fr.exercise.listenChooseMeaning', tapAgain: 'fr.exercise.tapToHearAgain',\n    typeHeard: 'fr.exercise.typeWhatYouHeard', typePlaceholder: 'fr.exercise.typeInFrench', clozePlaceholder: 'review.cloze.placeholder',\n    translateTo: 'fr.exercise.translateToFrench', orderSentence: 'fr.exercise.orderSentence', reorderTapHint: 'fr.reorder.tapHint',\n    hintThinkWhen: 'fr.hint.thinkWhen', hintListenAgain: 'fr.hint.listenAgain', hintThinkContext: 'fr.hint.thinkContext',\n    hintReorderTranslate: 'fr.hint.reorderTranslate', hintReorderOrder: 'fr.hint.reorderOrder', hintCloze: 'fr.hint.cloze', hintFullSentence: 'zh.hint.fullsentence' }",
      itemPromptHTML: '(i) => `<div class="prompt-french">${i.f}</div>`',
      itemAnswerHTML: "(i) => `<div class=\"feedback-correct-line\">${t('feedback.correctAnswerColon')} <strong>${i.f}</strong> ${audioBtnHTML(i.f)}</div><div class=\"feedback-phrase-trans\">${i.t}</div>`",
      originPhraseHTML: '(o) => `<strong>${o.f}</strong><br>${o.t}`',
      // correção da resposta digitada: família latina (lessonTypedAnswerResult: 'ok' | 'quase' | 'errado')
      typedAnswer: "{\n    verdict: (given, x) => { const r = lessonTypedAnswerResult(given, x.f); return { ok: r === 'ok' || r === 'quase', almost: r === 'quase', toneOnly: false }; },\n    expected: (x) => x.f,\n    inputExtraHTML: (x) => frAccentPickerHTML(x.f),\n    wireInputExtra: (root, inputEl) => wireFrAccentPicker(root.querySelector('.fr-accent-picker'), inputEl),\n  }",
      clozeSentenceHTML: "(ex) => ex.phrase.blocks.map((b, i) =>\n    i === ex.blankIdx ? '<span class=\"cloze-blank\" id=\"cloze-blank\">___</span>' : b.f\n  ).join(' ')",
      clozeOptionsHTML: '(options) => options.map((opt, i) => `<button class="cloze-option" data-idx="${i}">${opt.f}</button>`).join(\'\')',
      clozeSpoken: '(ex) => ex.phrase.f',
      phraseSpoken: '(p) => p.f',
      reorderBlockHTML: '(b) => b.f',
      reorderSlotHTML: '(b) => `<div class="french">${b.f}</div>`',
      reorderAttemptSep: "' '",
      flySource: '(btn) => btn.textContent.trim()',
      reorderDoneHTML: '(p) => `<div class="reorder-final"><div class="reorder-final-fr">${p.f} ${audioBtnHTML(p.f)}</div><div class="reorder-final-tr">${p.t}</div></div>`',
      fullSentenceExercises: '() => []',
    },
    zh: {
      textOf: '(x) => x.c',
      lessonKeys: "{ counter: 'zh.exercise.counter', whatMeans: 'zh.exercise.whatMeans', listenChoose: 'zh.exercise.listenChoose', tapAgain: 'zh.exercise.tapToListenAgain',\n    typeHeard: 'zh.exercise.typePinyinHeard', typePlaceholder: 'zh.exercise.typePinyinPlaceholder', clozePlaceholder: 'zh.review.cloze.placeholder',\n    translateTo: 'zh.exercise.translateToChinese', orderSentence: 'zh.exercise.orderSentence', reorderTapHint: 'zh.reorder.tapHint',\n    hintThinkWhen: 'zh.hint.thinkWhenUse', hintListenAgain: 'zh.hint.listenAgain', hintThinkContext: 'zh.hint.thinkContext',\n    hintReorderTranslate: 'fr.hint.reorderTranslate', hintReorderOrder: 'zh.hint.reorder', hintCloze: 'zh.hint.cloze', hintFullSentence: 'zh.hint.fullsentence' }",
      itemPromptHTML: '(i) => `<div class="prompt-hanzi">${i.c}</div>\n        <div class="prompt-pinyin">${i.p}</div>`',
      itemAnswerHTML: "(i) => `<div class=\"feedback-correct-line\">${t('feedback.correctAnswerColon')} <strong>${i.c}</strong> ${audioBtnHTML(i.c)} <span class=\"pinyin\">(${i.p})</span></div><div class=\"feedback-phrase-trans\">${i.t}</div>`",
      originPhraseHTML: '(o) => `<strong>${o.c}</strong><br><span class="pinyin">${o.p}</span><br>${o.t}`',
      // correção da resposta digitada em pinyin (numerado vale; forma dupla "X / Y"; tom errado = erro com o aviso do tom)
      typedAnswer: "{\n    verdict: (given, x) => {\n      const strip = pinyinAnswerCompareForm;\n      const typedAll = typedVariants(given, x.p).map(strip), typed = typedAll[0];\n      const forms = acceptedFormsTyped(x.p);\n      const ok = forms.some(form => typedAll.includes(strip(form)));\n      return { ok, almost: false, toneOnly: !ok && isToneOnlyMiss(typed, forms, strip) };\n    },\n    expected: (x) => x.p,\n    inputExtraHTML: () => pinyinTonePickerHTML(),\n    wireInputExtra: (root, inputEl) => wirePinyinTonePicker(root.querySelector('.pinyin-tone-picker'), inputEl),\n  }",
      clozeSentenceHTML: "(ex) => `\n        <div class=\"cloze-hanzi\">${ex.phrase.blocks.map((b, i) =>\n    i === ex.blankIdx ? '<span class=\"cloze-blank\" id=\"cloze-blank\">___</span>' : b.c\n  ).join('')}</div>\n        <div class=\"cloze-pinyin\">${ex.phrase.blocks.map((b, i) =>\n    i === ex.blankIdx ? '___' : b.p\n  ).join(' ')}</div>\n      `",
      clozeOptionsHTML: "(options) => options.map((opt, i) => `\n          <button class=\"cloze-option\" data-idx=\"${i}\">\n            <span class=\"cloze-option-pinyin\">${opt.p}</span>\n            <span class=\"cloze-option-hanzi\">${opt.c}</span>\n          </button>\n        `).join('')",
      clozeSpoken: '(ex) => clozeExercisePhrase(ex).c',
      phraseSpoken: '(p) => phraseForExercise(p).c',
      reorderBlockHTML: '(b) => `<div class="pinyin">${b.p}</div><div class="hanzi">${b.c}</div>`',
      reorderSlotHTML: '(b) => `<div class="pinyin">${b.p}</div><div class="hanzi">${b.c}</div>`',
      reorderAttemptSep: "''",
      flySource: '(btn) => btn.innerHTML',
      reorderDoneHTML: '(p) => phraseFeedbackDetailHTML(p, p.t)',
      fullSentenceExercises: '(u) => buildFullSentenceExercises(u)',
    },
  },
};
