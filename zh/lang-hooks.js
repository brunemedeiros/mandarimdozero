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
  pregenRate: () => 0,
  ttsLang: 'zh-CN',
  ttsRate: 0.85,
  conceptExampleHTML: (ex) => `<div class="hanzi">${ex.c} ${audioBtnHTML(ex.c)}</div>
          <div class="pinyin">${ex.p}</div>`,
  tfPinyinHTML: (ex) => `<div class="tf-pinyin">${ex.pinyin || ''}</div>`,
  promptClass: 'flashcard-hanzi',
  promptPinyinHTML: (view) => `<div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>`,
  canSpeak: (s) => canSpeakChinese(s),
// --- /E4 hooks ---
};
