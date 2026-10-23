// E4 lote 5c: funções unificadas com ganchos por idioma (chave de texto, appKey, áudio/voz, gráfico) se comportam como antes em fr e zh.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../..');
let ok = 0, bad = 0; const check = (c, m) => { if (c) ok++; else { bad++; console.log('FALHOU:', m); } };
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const core = read('shared/core/quase-iguais-chaves.js');
function load(lang) {
  const calls = [];
  const ctx = { console, calls, STATE: { cards: [], hanziCards: [{ firstLearnedDate: '2026-01-02' }], xp: 5 }, t: (k) => `[${k}]`, tp: (k) => `[${k}]`,
    wordLevelFirstLearnedDates: () => ['2026-01-01'], PREGEN_AUDIO_RATE: 0.9,
    buildStudyWordCards: (u, v, i, appKey) => [{ appKey }], buildStudyPhraseCards: () => [], loadFrenchVoice: () => calls.push('fr-voice'), loadChineseVoice: () => calls.push('zh-voice') };
  vm.createContext(ctx);
  vm.runInContext(read(lang + '/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS') + '\n' + core.replace(/\bfunction (\w+)/g, 'var $1 = function $1'), ctx);
  return ctx;
}
for (const l of ['fr', 'zh']) {
  const c = load(l), p = l;
  const btn = vm.runInContext('audioBtnHTML("a\\"b", "x")', c);
  check(btn.includes(`aria-label="[${p}.audio.listenPronunciation]"`) && btn.includes('data-speak="a&quot;b"') && btn.includes('audio-btn x'), l + ' audioBtnHTML');
  const cards = vm.runInContext('buildCardsFromUnits([{ vocab: [1, 2], type: "x" }])', c);
  check(cards.length === 2 && cards[0].appKey === (l === 'fr' ? 'frances' : 'mandarim'), l + ' buildCardsFromUnits usa o appKey do idioma');
  check(vm.runInContext('LANG_HOOKS.studyNotifKey', c) === (l === 'fr' ? 'frances_last_study_notif' : 'mandarim_last_study_notif'), l + ' chave do lembrete');
  check(vm.runInContext('LANG_HOOKS.uiKey("progress.chartTotalSuffix")', c) === `${p}.progress.chartTotalSuffix`, l + ' sufixo do gráfico');
  check(vm.runInContext('LANG_HOOKS.chartLearnedDates().length', c) === (l === 'fr' ? 1 : 2), l + ' datas do gráfico (zh soma hanzi)');
  check(vm.runInContext('LANG_HOOKS.chartEmptyHTML("m")', c).includes(l === 'fr' ? 'color:var(--ink-soft)' : 'manual-empty'), l + ' gráfico vazio');
  check(vm.runInContext('LANG_HOOKS.ttsLang', c) === (l === 'fr' ? 'fr-FR' : 'zh-CN') && vm.runInContext('LANG_HOOKS.ttsRate', c) === (l === 'fr' ? 0.9 : 0.85), l + ' voz sintética do diálogo');
  // Paridade C5 (2026-10-23, decisão da dona): o mp3 pré-gravado toca a 0,9 nos dois sites (antes o zh tocava a 1,0).
  check(vm.runInContext('LANG_HOOKS.pregenRate()', c) === 0.9, l + ' velocidade do áudio gravado');
  const el = { textContent: '', innerHTML: '' }; c.el = el; vm.runInContext('LANG_HOOKS.setFlyContent(el, "<b>x</b>")', c);
  check(l === 'fr' ? el.textContent === '<b>x</b>' && el.innerHTML === '' : el.innerHTML === '<b>x</b>' && el.textContent === '', l + ' conteúdo do bloco que voa');
}
for (const f of ['fr/app.js', 'zh/app.js']) { const s = read(f); check(!/function (audioBtnHTML|wireDontKnowButton|maybeSendStudyReminder|renderMatchGame|renderProgressLineChart|buildCardsFromUnits|freshAcquisitionState|playPregeneratedAudio|flyBlockToSlot|dlgPlayLine)\(/.test(s), f + ' não declara mais as 10 funções'); }
console.log(`lote 5c chaves: ${ok} passaram, ${bad} falharam`); process.exit(bad ? 1 : 0);
