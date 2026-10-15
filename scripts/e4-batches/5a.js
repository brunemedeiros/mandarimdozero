// Lote 5a: as quase iguais mais simples (diferença de 1 ou 2 linhas).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => a.split(x).join(y), s);
const same = (from, to) => R([[from, to]]);
module.exports = {
  batch: '5a', file: 'quase-iguais-simples',
  desc: 'quase iguais mais simples (áudio, voz, rótulos, passos, saída para a trilha, abertura de sessão de revisão)',
  functions: {
    playAudioPreview: { unify: same('speakFrenchAudioOnly(', 'LANG_HOOKS.speakAudioOnly('),
      reverse: { fr: same('LANG_HOOKS.speakAudioOnly(', 'speakFrenchAudioOnly('), zh: same('LANG_HOOKS.speakAudioOnly(', 'speakChineseAudioOnly(') } },
    wireAudioButtons: { unify: same('speakFrench(', 'LANG_HOOKS.speak('),
      reverse: { fr: same('LANG_HOOKS.speak(', 'speakFrench('), zh: same('LANG_HOOKS.speak(', 'speakChinese(') } },
    pollForVoices: { unify: same('loadFrenchVoice(', 'LANG_HOOKS.loadVoice('),
      reverse: { fr: same('LANG_HOOKS.loadVoice(', 'loadFrenchVoice('), zh: same('LANG_HOOKS.loadVoice(', 'loadChineseVoice(') } },
    customAudioBtnHTML: { unify: same("t('fr.audio.listen')", 't(LANG_HOOKS.audioListenKey)'),
      reverse: { fr: same('t(LANG_HOOKS.audioListenKey)', "t('fr.audio.listen')"), zh: same('t(LANG_HOOKS.audioListenKey)', "t('zh.audio.listenAudio')") } },
    reviewCardTagLabel: { unify: same('flashcardUnitTitleText(card)', 'LANG_HOOKS.cardOriginTitle(card)'),
      reverse: { fr: same('LANG_HOOKS.cardOriginTitle(card)', 'flashcardUnitTitleText(card)'), zh: same('LANG_HOOKS.cardOriginTitle(card)', 'cardOriginTitle(card)') } },
    maskWordInText: { unify: same('text.toLowerCase().indexOf(word.toLowerCase())', 'LANG_HOOKS.foldCase(text).indexOf(LANG_HOOKS.foldCase(word))'),
      reverse: { fr: (s) => s.replace(/LANG_HOOKS\.foldCase\((\w+)\)/g, '$1.toLowerCase()'), zh: (s) => s.replace(/LANG_HOOKS\.foldCase\((\w+)\)/g, '$1') } },
    // Daqui para baixo a diferença é uma linha que existe só num idioma; a versão unificada protege com typeof/in. Conferido à mão:
    // o idioma que não tem o recurso não tem a função/campo, então a guarda é falsa e o comportamento é o de antes.
    showWrongAnswerPanel: { from: 'zh', keep: true, semantic: true, unify: (s) => s },      // zh repassa toneOnly; o showAnswerPanel do fr ignora esse campo
    advanceUnitStep: { from: 'zh', keep: true, semantic: true, unify: (s) => s },           // zh passa u; o currentStepDefs() do fr ignora o argumento
    backToReviewModeSelect: { semantic: true, unify: same('stopMatchTimer();', "if (typeof stopMatchTimer === 'function') stopMatchTimer();") }, // zh não tem o jogo de pares cronometrado
    startDeckReviewSession: { semantic: true, unify: same('STATE.reviewSessionMilestone = null;', "if ('reviewSessionMilestone' in STATE) STATE.reviewSessionMilestone = null;") }, // zh não tem marco de módulo
    openReviewSession: { semantic: true, unify: same('STATE.reviewSessionMilestone = null;', "if ('reviewSessionMilestone' in STATE) STATE.reviewSessionMilestone = null;") },
    exitToPath: { semantic: true, unify: R([['STEP_STATE.onCheckpoint = null;', "if ('onCheckpoint' in STEP_STATE) STEP_STATE.onCheckpoint = null;"], ['STEP_STATE.onLevelTest = null;', "if ('onLevelTest' in STEP_STATE) STEP_STATE.onLevelTest = null;"]]) },
  },
  hooks: {
    fr: { speakAudioOnly: '(...a) => speakFrenchAudioOnly(...a)', speak: '(...a) => speakFrench(...a)', loadVoice: '() => loadFrenchVoice()', audioListenKey: "'fr.audio.listen'", cardOriginTitle: '(c) => flashcardUnitTitleText(c)', foldCase: '(s) => s.toLowerCase()' },
    zh: { speakAudioOnly: '(...a) => speakChineseAudioOnly(...a)', speak: '(...a) => speakChinese(...a)', loadVoice: '() => loadChineseVoice()', audioListenKey: "'zh.audio.listenAudio'", cardOriginTitle: '(c) => cardOriginTitle(c)', foldCase: '(s) => s' },
  },
};
