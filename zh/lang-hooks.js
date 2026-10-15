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
// --- /E4 hooks ---
};
