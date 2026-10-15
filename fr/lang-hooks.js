// E4: o que muda de um idioma estudado para outro e que o código compartilhado (shared/core) precisa saber.
// Carregado antes do app.js. Funções chamam as do app.js só na hora do uso (setas), então a ordem de carga não importa.
const LANG_HOOKS = {
// --- E4 hooks ---
  speakAudioOnly: (...a) => speakFrenchAudioOnly(...a),
  speak: (...a) => speakFrench(...a),
  loadVoice: () => loadFrenchVoice(),
  audioListenKey: 'fr.audio.listen',
  cardOriginTitle: (c) => flashcardUnitTitleText(c),
  foldCase: (s) => s.toLowerCase(),
  recapText: (i) => i.f,
  recapExtra: () => '',
// --- /E4 hooks ---
};
