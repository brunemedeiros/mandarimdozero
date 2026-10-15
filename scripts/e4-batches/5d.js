// Lote 5d: quase iguais em que o mandarim mostra o pinyin e o francês não (marcação por gancho).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => a.split(x).join(y), s);
const keyBack = (lang) => (s) => s.replace(/LANG_HOOKS\.uiKey\('([^']+)'\)/g, (m, k) => `'${lang}.${k}'`);
const EX_FR = '<div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>';
const EX_UNI = '${LANG_HOOKS.conceptExampleHTML(ex)}';
const EX_ZH = '<div class="hanzi">${ex.c} ${audioBtnHTML(ex.c)}</div>\n          <div class="pinyin">${ex.p}</div>';
const TF_UNI = '${LANG_HOOKS.tfPinyinHTML(ex)}';
const TF_ZH = '<div class="tf-pinyin">${ex.pinyin || \'\'}</div>';
const MC_FR = '<div class="flashcard-french">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, \'audio-btn-lg\')}` : \'\'}${customAudioUrl ? customAudioBtnHTML(customAudioUrl) : \'\'}</div>';
const MC_UNI = '<div class="${LANG_HOOKS.promptClass}">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, \'audio-btn-lg\')}` : \'\'}${customAudioUrl ? customAudioBtnHTML(customAudioUrl) : \'\'}</div>\n      ${LANG_HOOKS.promptPinyinHTML(view)}';
const MC_ZH_PY = '<div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || \'\')}</div>';
module.exports = {
  batch: '5d', file: 'quase-iguais-pinyin',
  desc: 'quase iguais em que o mandarim mostra o pinyin e o francês não',
  functions: {
    renderConceptStep: { unify: R([[EX_FR, EX_UNI]]),
      reverse: { fr: R([[EX_UNI, EX_FR]]), zh: R([[EX_UNI, EX_ZH]]) } },
    renderTrueFalseExercise: { unify: R([["t('fr.exercise.counter',", "t(LANG_HOOKS.uiKey('exercise.counter'),"], ["t('fr.exercise.true')", "t(LANG_HOOKS.uiKey('exercise.true'))"], ["t('fr.exercise.false')", "t(LANG_HOOKS.uiKey('exercise.false'))"],
      ['<div class="tf-subject">${ex.subject}</div>', '<div class="tf-subject">${ex.subject}</div>\n        ' + TF_UNI]]),
      reverse: { fr: (s) => R([[TF_UNI, '']])(keyBack('fr')(s)), zh: (s) => R([[TF_UNI, TF_ZH]])(keyBack('zh')(s)) } },
    renderMultipleChoiceCard: { unify: R([[MC_FR, MC_UNI], ['canSpeakFrench(view.prompt.text)) speakFrench(', 'LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(']]),
      reverse: { fr: R([['${LANG_HOOKS.promptPinyinHTML(view)}', ''], ['${LANG_HOOKS.promptClass}', 'flashcard-french'], ['LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(', 'canSpeakFrench(view.prompt.text)) speakFrench(']]),
        zh: R([['${LANG_HOOKS.promptPinyinHTML(view)}', MC_ZH_PY], ['${LANG_HOOKS.promptClass}', 'flashcard-hanzi'], ['LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(', 'canSpeakChinese(view.prompt.text)) speakChinese(']]) } },
  },
  hooks: {
    fr: { conceptExampleHTML: '(ex) => `<div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>`', tfPinyinHTML: "() => ''",
      promptClass: "'flashcard-french'", promptPinyinHTML: "() => ''", canSpeak: '(s) => canSpeakFrench(s)' },
    zh: { conceptExampleHTML: '(ex) => `<div class="hanzi">${ex.c} ${audioBtnHTML(ex.c)}</div>\n          <div class="pinyin">${ex.p}</div>`', tfPinyinHTML: "(ex) => `<div class=\"tf-pinyin\">${ex.pinyin || ''}</div>`",
      promptClass: "'flashcard-hanzi'", promptPinyinHTML: "(view) => `<div class=\"flashcard-pinyin pinyin\">${escapeHTML(view.prompt.pinyinText || '')}</div>`", canSpeak: '(s) => canSpeakChinese(s)' },
  },
};
