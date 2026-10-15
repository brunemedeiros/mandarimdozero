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
  uiKey: (k) => 'fr.' + k,
  studyNotifKey: 'frances_last_study_notif',
  appKey: 'frances',
  chartLearnedDates: () => wordLevelFirstLearnedDates(STATE.cards),
  chartEmptyHTML: (msg) => `<div style="text-align:center; padding:30px 20px; color:var(--ink-soft);"><p>${msg}</p></div>`,
  setFlyContent: (el, v) => { el.textContent = v; },
  pregenRate: () => PREGEN_AUDIO_RATE,
  ttsLang: 'fr-FR',
  ttsRate: 0.9,
  conceptExampleHTML: (ex) => `<div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>`,
  tfPinyinHTML: () => '',
  promptClass: 'flashcard-french',
  promptPinyinHTML: () => '',
  canSpeak: (s) => canSpeakFrench(s),
  revisaoPool: () => REVISAO_CONJ_CHALLENGES,
  revisaoFallbackId: 'conj1',
  dailyExtra: () => ({ stars: 0, grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0, conjugationTenses: [] }),
// --- /E4 hooks ---
  // Família latina (shared/core/familias/latina.js): configuração do FRANCÊS. O português, quando o /pt existir,
  // terá a dele no pt/lang-hooks.js (rascunho em shared/core/familias/latina-idiomas.js). Ver docs/i18n/familia-latina-modulo.md.
  familiaLatina: {
    id: 'fr',
    ligaduras: [['œ', 'oe'], ['æ', 'ae']],
    hifen: true,
    apostrofo: true,
    elisao: true,                       // ditado: "j' ai" -> "j'ai" antes de comparar
    acentoNaDigitacao: 'tolerante',     // exercícios de digitar: acento NÃO conta (decisão de 2026-09-16)
    ligadurasNaDigitacao: true,         // "soeur" por "sœur" = Quase (decisão da dona, 2026-10-15)
  },
};
