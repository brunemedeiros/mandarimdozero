// Carrega o conteúdo de um curso (base + camada pt-BR) em Node, no formato que <lang>/content.js tinha antes da E2.
//   composedSource('fr')  -> texto JS (base + course-layer + camada), drop-in para fs.readFileSync(<lang>/content.js)
//   load('fr')            -> { UNITS, LEVELS, MODULES, LEVEL_TESTS } já com a camada aplicada
// A camada se aplica sozinha ao carregar (courses/<par>/layer.js chama CourseLayer.apply).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const LAYER_DIR = { fr: 'courses/fr-pt-BR', zh: 'courses/zh-pt-BR' };

function composedSource(lang){
  const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
  return rd(lang + '/content.js') + '\n;' + rd('shared/course-layer.js') + '\n;' + rd(LAYER_DIR[lang] + '/layer.js') + '\n';
}
function load(lang){
  const ctx = vm.createContext({ console });
  vm.runInContext(composedSource(lang) +
    ';this.__c={UNITS:UNITS,LEVELS:typeof LEVELS!=="undefined"?LEVELS:undefined,MODULES:typeof MODULES!=="undefined"?MODULES:undefined,LEVEL_TESTS:typeof LEVEL_TESTS!=="undefined"?LEVEL_TESTS:undefined};', ctx);
  return ctx.__c;
}
module.exports = { composedSource, load, ROOT };
