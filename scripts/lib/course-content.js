// Carrega o conteúdo de um curso (base + camada pt-BR) em Node, no formato que <lang>/content.js tinha antes da E2.
//   composedSource('fr')  -> texto JS (base + course-layer + camada), drop-in para fs.readFileSync(<lang>/content.js)
//   load('fr')            -> { UNITS, LEVELS, MODULES, LEVEL_TESTS } já com a camada aplicada
// A camada se aplica sozinha ao carregar (courses/<par>/layer.js chama CourseLayer.apply).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const LAYER_DIR = { fr: 'courses/fr-pt-BR', zh: 'courses/zh-pt-BR' };
// arquivos de dados do curso (a camada se aplica sobre todos): ordem igual à dos <script> dos index.html
const DATA_FILES = { fr: ['content', 'conjugation-data', 'dictations'], zh: ['content', 'stories', 'hanzi-data'] };

function composedSource(lang){
  const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
  return DATA_FILES[lang].map(f => rd(lang + '/' + f + '.js')).join('\n;') + '\n;' + rd('shared/course-layer.js') + '\n;' + rd(LAYER_DIR[lang] + '/layer.js') + '\n';
}
function load(lang){
  const ctx = vm.createContext({ console });
  vm.runInContext(composedSource(lang) +
    ';this.__c={UNITS:UNITS,LEVELS:typeof LEVELS!=="undefined"?LEVELS:undefined,MODULES:typeof MODULES!=="undefined"?MODULES:undefined,LEVEL_TESTS:typeof LEVEL_TESTS!=="undefined"?LEVEL_TESTS:undefined,STORIES:typeof STORIES!=="undefined"?STORIES:undefined,HANZI_LESSONS:typeof HANZI_LESSONS!=="undefined"?HANZI_LESSONS:undefined,DICTATIONS:typeof DICTATIONS!=="undefined"?DICTATIONS:undefined,CONJUGATION_GROUPS:typeof CONJUGATION_GROUPS!=="undefined"?CONJUGATION_GROUPS:undefined,VERB_TRANSLATIONS:typeof VERB_TRANSLATIONS!=="undefined"?VERB_TRANSLATIONS:undefined};', ctx);
  return ctx.__c;
}
module.exports = { composedSource, load, ROOT };
