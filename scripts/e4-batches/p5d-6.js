// Paridade 5d, parte 6 (docs/historico/30-paridade-quase-iguais.md): cartões da Revisão (normal, lacuna, digitar a resposta) e
// o texto dos cartões da trilha no idioma do site. Base: o texto do fr. Uso:
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/p5d-6.js
// O que é do idioma vem de LANG_HOOKS: lado do idioma estudado do cartão (reviewTargetHTML: fr texto; zh hanzi + pinyin),
// enunciado do digitar (reviewPromptHTML), frase da lacuna (reviewClozeSentenceHTML: zh mostra o pinyin da resposta depois de
// responder), correção da resposta digitada (reviewTyped: fr família latina, "quase" = Difícil automático; zh pinyin, tom
// errado = Errei com o aviso do tom), chaves de texto e o texto do cartão da trilha (vocabCardSwap, refreshExtraCards: hanzi).
// Correção de bug (listada no registro): a tradução da lacuna (cartão de professora/próprio) entrava SEM escapeHTML no fr;
// agora escapa nos dois sites, como o zh já fazia (regra "texto vindo de autor: sempre escapeHTML").
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => { if (!a.includes(x)) throw new Error('não achei: ' + x.slice(0, 80)); return a.split(x).join(y); }, s);
const VERIFY_FR = "      localState.typedAnswer = inputEl.value;\n      localState.answered = true;\n      const verdict = typedAnswerVerdictForExpected(inputEl.value, view.compareAnswerText);\n      localState.wasCorrect = verdict !== 'errou';\n      localState.almost = verdict === 'quase';\n      localState.almostKind = localState.almost ? typedAlmostKind(inputEl.value, acceptedForms(view.compareAnswerText)) : null;\n";
const VERIFY_NEW = "      localState.typedAnswer = inputEl.value;\n      localState.answered = true;\n      LANG_HOOKS.reviewTyped.check(inputEl.value, view.compareAnswerText, localState); // wasCorrect + quase (fr) ou tom (zh)\n";
const TYPED_COMMON = [
  ["        ${frAccentPickerHTML(view.compareAnswerText)}", "        ${LANG_HOOKS.reviewTyped.inputExtraHTML(view.compareAnswerText)}"],
  ["` : `${reviewAlmostHTML(localState)}${reviewObservationHTML(card)}", "` : `${LANG_HOOKS.reviewTyped.hintHTML(localState)}${reviewObservationHTML(card)}"],
  ["    wireFrAccentPicker(mountEl.querySelector('.fr-accent-picker'), inputEl);", "    LANG_HOOKS.reviewTyped.wireInputExtra(mountEl, inputEl);"],
  [VERIFY_FR, VERIFY_NEW],
  ["    // Errei e Difícil (quase) são automáticos; acerto em cheio escolhe Bom ou Fácil (typedResultActionsHTML).\n    wireTypedResultActions(mountEl, callbacks, localState, typedAnswerGrade(localState.almost ? 'quase' : 'errou'));",
   "    // Errei (e o Difícil do \"quase\", no fr) são automáticos; acerto em cheio escolhe Bom ou Fácil (typedResultActionsHTML).\n    wireTypedResultActions(mountEl, callbacks, localState, LANG_HOOKS.reviewTyped.wrongGrade(localState));"],
];
module.exports = {
  batch: 'paridade 5d-6', file: 'revisao-cartoes',
  desc: 'cartões da Revisão e texto dos cartões da trilha (paridade 5d, parte 6)',
  functions: {
    refreshStudyCardTexts: { semantic: true, unify: R([
      ["    CardVariants.swapCardWordProgress(c, c.front, u.vocab[c.vocabIdx].f, STATE.cardVariants);\n    c.front = u.vocab[c.vocabIdx].f; // o overlay `src` pode localizar a palavra estudada\n",
       "    LANG_HOOKS.vocabCardSwap(c, u.vocab[c.vocabIdx]); // o overlay `src` pode localizar a palavra estudada\n"],
      ["    c.unitTitle = u.title;\n  });\n}", "    c.unitTitle = u.title;\n  });\n  LANG_HOOKS.refreshExtraCards(); // zh: cartões de hanzi\n}"]]) },
    renderClozeCard: { semantic: true, unify: R(TYPED_COMMON.concat([
      ['      <div class="cloze-sentence">${sentenceHTML}</div>', '      <div class="cloze-sentence">${LANG_HOOKS.reviewClozeSentenceHTML(sentenceHTML, view, answered)}</div>'],
      ['<div class="cloze-trans">${view.translation.text}</div>', '<div class="cloze-trans">${escapeHTML(view.translation.text)}</div>'],
      ["placeholder=\"${t('review.cloze.placeholder')}\"", "placeholder=\"${t(LANG_HOOKS.lessonKeys.reviewClozePlaceholder)}\""]])) },
    renderTypeAnswerCard: { semantic: true, unify: R(TYPED_COMMON.concat([
      ["      <div class=\"flashcard-french\">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}</div>",
       "      ${LANG_HOOKS.reviewPromptHTML(view, `${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}`)}"],
      ["placeholder=\"${t('review.typeAnswer.placeholder')}\"", "placeholder=\"${t(LANG_HOOKS.lessonKeys.reviewTypePlaceholder)}\""],
      ["canSpeakFrench(view.prompt.text)) speakFrench(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);", "LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);"]])) },
    renderNormalCard: { semantic: true, unify: R([
      ['  let targetText, nativeText, frontAudioUrl, backAudioUrl, frontImageUrl, backImageUrl, targetIsSpeakable;', '  let targetText, nativeText, frontAudioUrl, backAudioUrl, frontImageUrl, backImageUrl, targetIsSpeakable, frontPinyin;'],
      ['    nativeText = view.back.text;\n', '    nativeText = view.back.text;\n    frontPinyin = view.front.pinyinText; // zh mostra o pinyin embaixo do hanzi\n'],
      ["  const frenchSideHTML = `<div class=\"flashcard-french\">${escapeHTML(targetText)} ${audioBtnHTML(targetText, 'audio-btn-lg')}${frontAudioUrl ? customAudioBtnHTML(frontAudioUrl) : ''}</div>`;",
       '  const frenchSideHTML = LANG_HOOKS.reviewTargetHTML(targetText, frontAudioUrl, frontPinyin, false);'],
      ["      backHTML = `<div class=\"flashcard-french\">${escapeHTML(v.back.text)} ${audioBtnHTML(v.back.text, 'audio-btn-lg')}${backAudioUrl ? customAudioBtnHTML(backAudioUrl) : ''}</div>`;",
       '      backHTML = LANG_HOOKS.reviewTargetHTML(v.back.text, backAudioUrl, v.back.pinyinText, true);'],
      ['  if (!card.__isPreviewCard && frenchVisibleNow && targetIsSpeakable && canSpeakFrench(speakText)){\n    speakFrench(speakText, mountEl.querySelector(\'.audio-btn-lg\'), true);',
       "  if (!card.__isPreviewCard && frenchVisibleNow && targetIsSpeakable && LANG_HOOKS.canSpeak(speakText)){\n    LANG_HOOKS.speak(speakText, mountEl.querySelector('.audio-btn-lg'), true);"]]) },
  },
  hooks: {
    fr: {
      reviewTargetHTML: "(text, audioUrl) => `<div class=\"flashcard-french\">${escapeHTML(text)} ${audioBtnHTML(text, 'audio-btn-lg')}${audioUrl ? customAudioBtnHTML(audioUrl) : ''}</div>`",
      reviewPromptHTML: '(view, inner) => `<div class="flashcard-french">${inner}</div>`',
      reviewClozeSentenceHTML: '(s) => s',
      reviewTyped: "{\n    inputExtraHTML: (expected) => frAccentPickerHTML(expected),\n    wireInputExtra: (root, inputEl) => wireFrAccentPicker(root.querySelector('.fr-accent-picker'), inputEl),\n    check: (given, expected, st) => {\n      const verdict = typedAnswerVerdictForExpected(given, expected);\n      st.wasCorrect = verdict !== 'errou';\n      st.almost = verdict === 'quase';\n      st.almostKind = st.almost ? typedAlmostKind(given, acceptedForms(expected)) : null;\n    },\n    hintHTML: (st) => reviewAlmostHTML(st),\n    wrongGrade: (st) => typedAnswerGrade(st.almost ? 'quase' : 'errou'),\n  }",
      vocabCardSwap: '(c, v) => { CardVariants.swapCardWordProgress(c, c.front, v.f, STATE.cardVariants); c.front = v.f; }',
      refreshExtraCards: '() => {}',
    },
    zh: {
      reviewTargetHTML: "(text, audioUrl, pinyinText, isBack) => `\n      <div class=\"flashcard-hanzi\">${escapeHTML(text)} ${audioBtnHTML(text, 'audio-btn-lg')}${audioUrl ? customAudioBtnHTML(audioUrl) : ''}</div>\n      <div class=\"flashcard-pinyin pinyin\">${escapeHTML(pinyinText || '')}</div>${isBack ? '' : '\\n    '}`",
      reviewPromptHTML: "(view, inner) => `<div class=\"flashcard-hanzi\">${inner}</div>\n      <div class=\"flashcard-pinyin pinyin\">${escapeHTML(view.prompt.pinyinText || '')}</div>`",
      reviewClozeSentenceHTML: "(s, view, answered) => `\n        <div class=\"cloze-hanzi\">${s}</div>\n        ${answered ? `<div class=\"cloze-pinyin pinyin\">${escapeHTML(view.compareAnswerText)}</div>` : ''}\n      `",
      reviewTyped: "{\n    inputExtraHTML: () => pinyinTonePickerHTML(),\n    wireInputExtra: (root, inputEl) => wirePinyinTonePicker(root.querySelector('.pinyin-tone-picker'), inputEl),\n    check: (given, expected, st) => {\n      const strip = pinyinAnswerCompareForm;\n      const typedAll = typedVariants(given, expected).map(strip), typed = typedAll[0];\n      const forms = acceptedFormsTyped(expected);\n      st.wasCorrect = forms.some(form => typedAll.includes(strip(form)));\n      st.toneOnly = st.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);\n    },\n    hintHTML: (st) => toneHintHTML(st),\n    wrongGrade: () => 0,\n  }",
      vocabCardSwap: '(c, v) => { CardVariants.swapCardWordProgress(c, c.back_hanzi, v.c, STATE.cardVariants); c.front_pinyin = v.p; c.back_hanzi = v.c; }',
      refreshExtraCards: '() => refreshHanziCardTexts()',
    },
  },
};
