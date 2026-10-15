// E4 lote 5d: renderConceptStep, renderTrueFalseExercise e renderMultipleChoiceCard (core + ganchos) geram a marcação de cada idioma.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../..');
let ok = 0, bad = 0; const check = (c, m) => { if (c) ok++; else { bad++; console.log('FALHOU:', m); } };
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const core = read('shared/core/quase-iguais-pinyin.js');
const norm = (s) => s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
function load(lang) {
  const spoken = [];
  const el = () => ({ style: {}, innerHTML: '', textContent: '', classList: { add() {}, remove() {} }, querySelector: () => el(), querySelectorAll: () => [], addEventListener() {} });
  const nodes = {};
  const ctx = { console, spoken, document: { getElementById: (id) => nodes[id] || (nodes[id] = el()) }, STEP_STATE: { conceptQueue: [{ kind: 'x', blocks: [{ title: 'T', body: 'B', examples: [{ f: 'bonjour', c: '你好', p: 'nǐ hǎo', t: 'olá' }] }] }], conceptIdx: 0, conceptBlockIdx: 0, exerciseIndex: 0 },
    REALITY_NOTE_BANNER_TEXT: {}, CULTURE_NOTE_BANNER_TEXT: {}, setAcqPhaseBanner() {}, t: (k) => `[${k}]`, audioBtnHTML: (x) => `<btn ${x}>`, wireAudioButtons() {}, wireDontKnowButton() {},
    escapeHTML: (x) => x, reviewProgressBarHTML: () => '', reviewCardTagLabel: () => 'tag', customAudioBtnHTML: () => '', reviewObservationHTML: () => '', isStudyLanguageField: () => true, APP_KEY: 'k',
    resolveCardContentView: () => ({ prompt: { text: 'PROMPT', pinyinText: 'PY' }, correctText: 'c', distractorTexts: ['d'] }), shuffle: (a) => a, wireCustomAudioButtons() {},
    canSpeakFrench: () => true, canSpeakChinese: () => true, speakFrench: (x) => spoken.push('fr:' + x), speakChinese: (x) => spoken.push('zh:' + x) };
  vm.createContext(ctx);
  vm.runInContext(read(lang + '/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS') + '\n' + core.replace(/\bfunction (\w+)/g, 'var $1 = function $1'), ctx);
  return ctx;
}
for (const l of ['fr', 'zh']) {
  const c = load(l), zh = l === 'zh';
  vm.runInContext('renderConceptStep()', c);
  const h = norm(c.document.getElementById('step-content').innerHTML);
  check(zh ? h.includes('<div class="hanzi">你好 <btn 你好></div><div class="pinyin">nǐ hǎo</div><div class="trans">olá</div>') : h.includes('<div class="french">bonjour <btn bonjour></div><div class="trans">olá</div>'), l + ' exemplo do conceito');
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: () => ({ classList: { add() {} } }), };
  c.host = host; vm.runInContext('renderTrueFalseExercise({ subject: "S", pinyin: "P", claim: "C", answer: true }, host, { style: {} }, 3)', c);
  const tf = norm(host.innerHTML);
  check(tf.includes(`[${l}.exercise.counter]`) && tf.includes(`[${l}.exercise.true]`) && tf.includes(`[${l}.exercise.false]`), l + ' V/F usa as chaves do idioma');
  check(zh ? tf.includes('<div class="tf-subject">S</div><div class="tf-pinyin">P</div>') : (tf.includes('<div class="tf-subject">S</div><btn S>') && !tf.includes('tf-pinyin')), l + ' V/F pinyin');
  const mount = { innerHTML: '', querySelectorAll: () => [], querySelector: () => ({}) }; c.mount = mount;
  vm.runInContext('renderMultipleChoiceCard(mount, { __isPreviewCard: false }, {}, {})', c);
  const mc = norm(mount.innerHTML);
  check(zh ? mc.includes('<div class="flashcard-hanzi">PROMPT <btn PROMPT></div><div class="flashcard-pinyin pinyin">PY</div>') : (mc.includes('<div class="flashcard-french">PROMPT <btn PROMPT></div>') && !mc.includes('pinyin')), l + ' múltipla escolha');
  check(c.spoken.length === 1 && c.spoken[0] === l + ':PROMPT', l + ' fala automática com a voz do idioma');
}
for (const f of ['fr/app.js', 'zh/app.js']) { const s = read(f); check(!/function (renderConceptStep|renderTrueFalseExercise|renderMultipleChoiceCard)\(/.test(s), f + ' não declara mais as 3 funções'); }
console.log(`lote 5d pinyin: ${ok} passaram, ${bad} falharam`); process.exit(bad ? 1 : 0);
