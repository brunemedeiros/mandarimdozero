// E4: o que muda de um idioma estudado para outro e que o código compartilhado (shared/core) precisa saber.
// Carregado antes do app.js. Funções chamam as do app.js só na hora do uso (setas), então a ordem de carga não importa.
const LANG_HOOKS = {
// --- E4 hooks ---
  speakAudioOnly: (...a) => speakChineseAudioOnly(...a),
  speak: (...a) => speakChinese(...a),
  loadVoice: () => loadChineseVoice(),
  audioListenKey: 'zh.audio.listenAudio',
  cardOriginTitle: (c) => cardOriginTitle(c),
  foldCase: (s) => s,
  recapText: (i) => i.c,
  recapExtra: (i) => `<span class="lesson-recap-pinyin">${i.p}</span>`,
  uiKey: (k) => 'zh.' + k,
  studyNotifKey: 'mandarim_last_study_notif',
  appKey: 'mandarim',
  chartLearnedDates: () => [...wordLevelFirstLearnedDates(STATE.cards), ...STATE.hanziCards.filter(c => c.firstLearnedDate).map(c => c.firstLearnedDate)],
  chartEmptyHTML: (msg) => `<div class="manual-empty" style="padding:30px 20px;"><p>${msg}</p></div>`,
  setFlyContent: (el, v) => { el.innerHTML = v; },
  // Velocidade do mp3 pré-gravado: 0,9 como no fr (decisão da dona, 2026-10-23: o que vale para um site vale para todos).
  pregenRate: () => 0.9,
  ttsLang: 'zh-CN',
  ttsRate: 0.85,
  conceptExampleHTML: (ex) => `<div class="hanzi">${ex.c} ${audioBtnHTML(ex.c)}</div>
          <div class="pinyin">${ex.p}</div>`,
  tfPinyinHTML: (ex) => `<div class="tf-pinyin">${ex.pinyin || ''}</div>`,
  promptClass: 'flashcard-hanzi',
  promptPinyinHTML: (view) => `<div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>`,
  canSpeak: (s) => canSpeakChinese(s),
  revisaoPool: () => REVISAO_HANZI_CHALLENGES,
  revisaoFallbackId: 'hanzi1',
  dailyExtra: () => ({ hanziLessons: 0 }),
  // Dica do Verdadeiro ou Falso (trueFalseHint, shared/core/licao-feedback.js): chaves de texto deste site.
  trueFalseHintKeys: { seen: 'zh.hint.trueFalseUsage', generic: 'zh.hint.trueFalseDefault' },
  // "Sua resposta" (typedAttemptHTML): mostra e compara na forma do veredito (pinyin numerado vira marca de tom,
  // sem pontuação; maiúscula não conta), para a marcação vermelha concordar com o veredito.
  typedAttemptForm: (s) => pinyinAttemptDisplayForm(s),
  // Unidade de gramática e exercício de cenário (shared/core/gramatica-cenario.js, paridade C6). Hoje o zh não tem
  // conteúdo desses tipos; quando tiver, abre e funciona. Exercício de digitar da gramática: compara como os outros
  // exercícios de digitar do zh (pinyin numerado vale, maiúscula e pontuação não contam, forma dupla "X / Y");
  // só o tom errado = 'almost' (meio ponto, como o acento no fr).
  grammarAnswerVerdict: (given, forms) => {
    const strip = pinyinAnswerCompareForm;
    const all = forms.flatMap(f => acceptedFormsTyped(f));
    const typedAll = typedVariants(given, forms[0]).map(strip);
    if (all.some(f => typedAll.includes(strip(f)))) return 'ok';
    return isToneOnlyMiss(typedAll[0], all, strip) ? 'almost' : 'wrong';
  },
  grammarInputExtraHTML: () => pinyinTonePickerHTML(),
  wireGrammarInputExtra: (wrapEl, inputEl) => wirePinyinTonePicker(wrapEl.querySelector('.pinyin-tone-picker'), inputEl),
  // Opção do cenário: pinyin em cima do hanzi (como no "Frase completa"); o pinyin some com "esconder pinyin".
  scenarioOptionHTML: (p) => { const f = phraseForExercise(p); return `<span class="pinyin opt-pinyin-sentence">${f.p}</span><span class="opt-hanzi-sentence">${f.c}</span>`; },
  phraseAnswerHTML: (p) => { const f = phraseForExercise(p); return `<strong>${f.c}</strong> ${audioBtnHTML(f.c)} <span class="pinyin">(${f.p})</span>`; },
  // Ponto de verificação do módulo e Teste de Nível (shared/core/modulos-niveis.js, paridade B2). Hoje o zh não tem
  // módulos; quando tiver, a prova pede o PINYIN (digitado como nos outros exercícios: numerado vale, tom errado = meio
  // ponto, como o acento no fr), a escuta toca o hanzi pela voz do zh, e a correção mostra hanzi + pinyin.
  // Frase com marcador de perfil ({nome}...) fica fora da prova (a resposta dependeria do nome de cada aluno).
  checkpointExam: {
    keys: { word: 'zh.checkpoint.exam.word', phrase: 'zh.checkpoint.exam.phrase', listen: 'zh.checkpoint.exam.listen' },
    word: (v) => (v && v.c && v.p && v.t) ? { answer: v.p, meaning: v.t, extra: { hanzi: v.c, shown: `${v.c} (${v.p})` } } : null,
    phrase: (p) => {
      if (!p || !p.c || !p.p || !p.t || p.c.includes('{')) return null;
      const f = phraseForExercise(p);
      return { answer: f.p, meaning: p.t, audioText: f.c, extra: { hanzi: f.c, shown: `${f.c} (${f.p})` } };
    },
  },
  checkpointScore: (given, ex) => {
    const plain = (s) => String(s || '').replace(/[\s。！？，、.!?,]/g, '');
    if (ex.hanzi && plain(given) && plain(given) === plain(ex.hanzi)) return { score: 1, status: 'ok' };
    const v = LANG_HOOKS.grammarAnswerVerdict(String(given == null ? '' : given), [ex.answer]);
    if (v === 'ok') return { score: 1, status: 'ok' };
    if (v === 'almost') return { score: 0.5, status: 'almost' };
    return { score: 0, status: 'wrong' };
  },
  levelTestKeys: { sub: 'zh.levelTest.sub', intro: 'zh.levelTest.intro' },
  // O "Manual da unidade" é da lição de uma unidade; na prova do módulo/nível ele some (openUnitDetail o mostra de novo).
  examScreenOpened: () => { const b = document.getElementById('unit-manual-btn'); if (b) b.style.display = 'none'; },
  reviewEmptyEmoji: '🍵',
  speedPromptHTML: (card) => `<div class="hanzi">${cardPromptText(card)}</div>
      <div class="pinyin">${cardPromptPinyinText(card)}</div>`,
  clozeCorrectHTML: (b) => `${t('feedback.correctAnswerColon')} <strong>${b.c}</strong> <span class="pinyin">(${b.p})</span>`,
  phraseFeedbackHTML: (p, trans, correct) => phraseFeedbackDetailHTML(p, trans, correct),
  phraseHasWord: (word) => (p) => p.c.includes(word.c),
  dlgLineText: (l) => l.c,
  dlgLineHTML: (l, terms) => `<div class="dlg-py">${dlgHighlightPinyin(l.c, l.p, terms)}</div>
          <div class="dlg-hz">${dlgHighlight(l.c, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>`,
  dlgSide: (dlg, spk) => dlgSpeakerSide(dlg, spk),
  dlgWordToast: (d) => `${d.w}${d.py ? ' (' + d.py + ')' : ''} = ${d.tr}`,
  dlgBubbleHTML: (l, blank) => blank ? '<div class="dlg-hz"><span class="dlg-blank">· · · · ·</span></div>' : `<div class="dlg-py">${escapeHTML(l.p)}</div><div class="dlg-hz">${escapeHTML(l.c)}</div>`,
  dlgOptionHTML: (o) => `<span class="dlg-py">${escapeHTML(o.p)}</span><span class="dlg-hz">${escapeHTML(o.c)}</span>`,
  textOf: (x) => x.c,
  lessonKeys: { counter: 'zh.exercise.counter', whatMeans: 'zh.exercise.whatMeans', listenChoose: 'zh.exercise.listenChoose', tapAgain: 'zh.exercise.tapToListenAgain',
    typeHeard: 'zh.exercise.typePinyinHeard', typePlaceholder: 'zh.exercise.typePinyinPlaceholder', clozePlaceholder: 'zh.review.cloze.placeholder',
    translateTo: 'zh.exercise.translateToChinese', orderSentence: 'zh.exercise.orderSentence', reorderTapHint: 'zh.reorder.tapHint',
    hintThinkWhen: 'zh.hint.thinkWhenUse', hintListenAgain: 'zh.hint.listenAgain', hintThinkContext: 'zh.hint.thinkContext',
    hintReorderTranslate: 'fr.hint.reorderTranslate', hintReorderOrder: 'zh.hint.reorder', hintCloze: 'zh.hint.cloze', hintFullSentence: 'zh.hint.fullsentence',
    expandLessons: 'zh.path.unit.expandLessons', unitDone: 'zh.toast.unitDone',
    reviewClozePlaceholder: 'zh.review.cloze.placeholder', reviewTypePlaceholder: 'zh.review.typeAnswer.placeholder' },
  itemPromptHTML: (i) => `<div class="prompt-hanzi">${i.c}</div>
        <div class="prompt-pinyin">${i.p}</div>`,
  itemAnswerHTML: (i) => `<div class="feedback-correct-line">${t('feedback.correctAnswerColon')} <strong>${i.c}</strong> ${audioBtnHTML(i.c)} <span class="pinyin">(${i.p})</span></div><div class="feedback-phrase-trans">${i.t}</div>`,
  originPhraseHTML: (o) => `<strong>${o.c}</strong><br><span class="pinyin">${o.p}</span><br>${o.t}`,
  typedAnswer: {
    verdict: (given, x) => {
      const strip = pinyinAnswerCompareForm;
      const typedAll = typedVariants(given, x.p).map(strip), typed = typedAll[0];
      const forms = acceptedFormsTyped(x.p);
      const ok = forms.some(form => typedAll.includes(strip(form)));
      return { ok, almost: false, toneOnly: !ok && isToneOnlyMiss(typed, forms, strip) };
    },
    expected: (x) => x.p,
    inputExtraHTML: () => pinyinTonePickerHTML(),
    wireInputExtra: (root, inputEl) => wirePinyinTonePicker(root.querySelector('.pinyin-tone-picker'), inputEl),
  },
  clozeSentenceHTML: (ex) => `
        <div class="cloze-hanzi">${ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.c
  ).join('')}</div>
        <div class="cloze-pinyin">${ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '___' : b.p
  ).join(' ')}</div>
      `,
  clozeOptionsHTML: (options) => options.map((opt, i) => `
          <button class="cloze-option" data-idx="${i}">
            <span class="cloze-option-pinyin">${opt.p}</span>
            <span class="cloze-option-hanzi">${opt.c}</span>
          </button>
        `).join(''),
  clozeSpoken: (ex) => clozeExercisePhrase(ex).c,
  phraseSpoken: (p) => phraseForExercise(p).c,
  reorderBlockHTML: (b) => `<div class="pinyin">${b.p}</div><div class="hanzi">${b.c}</div>`,
  reorderSlotHTML: (b) => `<div class="pinyin">${b.p}</div><div class="hanzi">${b.c}</div>`,
  reorderAttemptSep: '',
  flySource: (btn) => btn.innerHTML,
  reorderDoneHTML: (p) => phraseFeedbackDetailHTML(p, p.t),
  fullSentenceExercises: (u) => buildFullSentenceExercises(u),
  unitEyebrow: (u) => isGrammarUnit(u) ? t('trail.eyebrow.grammar') : t('zh.path.unit.eyebrow', { id: u.id, total: UNITS.length }),
  afterOpenUnit: (u) => { const manualBtn = document.getElementById('unit-manual-btn'); if (manualBtn) manualBtn.style.display = isGrammarUnit(u) ? 'none' : ''; },
  trailAfterUnit: (u) => buildStoryCheckpointCard(u),
  trailMap: (root) => renderTrailMapView(root),
  introWordHTML: (v) => `<div class="vocab-card-pinyin">${v.p}</div>
      <div class="vocab-card-hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>`,
  introPhraseHTML: (p) => `<div class="vocab-phrase-pinyin">${p.p}</div>
      <div class="vocab-phrase-hanzi">${p.c} ${audioBtnHTML(p.c)}</div>`,
  wireIntroCard: (el) => wireStrokeButtons(el),
  badgeLevel: { id: 'HSK1', label: 'HSK 1' },
  reviewTargetHTML: (text, audioUrl, pinyinText, isBack) => `
      <div class="flashcard-hanzi">${escapeHTML(text)} ${audioBtnHTML(text, 'audio-btn-lg')}${audioUrl ? customAudioBtnHTML(audioUrl) : ''}</div>
      <div class="flashcard-pinyin pinyin">${escapeHTML(pinyinText || '')}</div>${isBack ? '' : '\n    '}`,
  reviewPromptHTML: (view, inner) => `<div class="flashcard-hanzi">${inner}</div>
      <div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>`,
  reviewClozeSentenceHTML: (s, view, answered) => `
        <div class="cloze-hanzi">${s}</div>
        ${answered ? `<div class="cloze-pinyin pinyin">${escapeHTML(view.compareAnswerText)}</div>` : ''}
      `,
  reviewTyped: {
    inputExtraHTML: () => pinyinTonePickerHTML(),
    wireInputExtra: (root, inputEl) => wirePinyinTonePicker(root.querySelector('.pinyin-tone-picker'), inputEl),
    check: (given, expected, st) => {
      const strip = pinyinAnswerCompareForm;
      const typedAll = typedVariants(given, expected).map(strip), typed = typedAll[0];
      const forms = acceptedFormsTyped(expected);
      st.wasCorrect = forms.some(form => typedAll.includes(strip(form)));
      st.toneOnly = st.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);
    },
    hintHTML: (st) => toneHintHTML(st),
    wrongGrade: () => 0,
  },
  vocabCardSwap: (c, v) => { CardVariants.swapCardWordProgress(c, c.back_hanzi, v.c, STATE.cardVariants); c.front_pinyin = v.p; c.back_hanzi = v.c; },
  refreshExtraCards: () => refreshHanziCardTexts(),
  // Voz do idioma estudado (shared/core/voz.js): texto que vai para a voz do navegador e avisos deste site.
  ttsText: (text) => text,
  voiceMissingKey: 'zh.toast.chineseVoiceMissing',
  audioRetryFailedKey: 'zh.toast.operaAudioFailed',
// --- /E4 hooks ---
};
