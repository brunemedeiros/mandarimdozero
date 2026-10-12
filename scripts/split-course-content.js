// MIGRAÇÃO ÚNICA da E2 (já executada em 2026-10-12): separa o texto em português de <lang>/content.js
// (camada do curso courses/<lang>-pt-BR/layer.js) e regrava a base só com o idioma estudado.
// O original, com todos os comentários de autoria, fica em docs/historico/conteudo-original/<lang>-content.js.txt.
// Uso: node scripts/split-course-content.js fr|zh   (lê o original de docs/historico/conteudo-original)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const CourseLayer = require(path.join(ROOT, 'shared/course-layer.js'));
const APP_KEY = { fr: 'frances', zh: 'mandarim' };
const lang = process.argv[2];
if (!APP_KEY[lang]) { console.error('uso: node scripts/split-course-content.js fr|zh'); process.exit(1); }

const src = fs.readFileSync(path.join(ROOT, 'docs/historico/conteudo-original', lang + '-content.js.txt'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(src + ';this.__c={units:UNITS,levels:typeof LEVELS!=="undefined"?LEVELS:undefined,modules:typeof MODULES!=="undefined"?MODULES:undefined,levelTests:typeof LEVEL_TESTS!=="undefined"?LEVEL_TESTS:undefined};', ctx);
const content = JSON.parse(JSON.stringify(ctx.__c));
const layer = CourseLayer.extract(JSON.parse(JSON.stringify(content)));
const base = CourseLayer.strip(JSON.parse(JSON.stringify(content)));


// JSON legível: objetos/arrays só de valores simples ficam numa linha; o resto abre uma linha por item.
function pretty(v, ind){
  ind = ind || '';
  const simple = x => x === null || typeof x !== 'object';
  if (simple(v)) return JSON.stringify(v);
  const vals = Array.isArray(v) ? v : Object.values(v);
  const flat = vals.every(simple);
  const one = Array.isArray(v) ? '[' + v.map(x => JSON.stringify(x)).join(', ') + ']'
    : '{ ' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + JSON.stringify(x)).join(', ') + ' }';
  if (flat && one.length <= 110) return one;
  const next = ind + '  ';
  if (Array.isArray(v)) return '[\n' + v.map(x => next + pretty(x, next)).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.entries(v).map(([k, x]) => next + JSON.stringify(k) + ': ' + pretty(x, next)).join(',\n') + '\n' + ind + '}';
}

const decl = (name, v) => v === undefined ? '' : `const ${name} = ${pretty(v)};\n\n`;
const baseJs =
`// CONTEÚDO-BASE do curso de ${lang === 'fr' ? 'francês' : 'chinês'} (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md).
// Só o IDIOMA ESTUDADO e a estrutura: ids, ${lang === 'fr' ? 'frases em francês (f), respostas' : 'hanzi (c), pinyin (p)'}, tipos, ordem.
// Todo texto em língua de origem (títulos, metas, traduções, explicações, cenários, rótulos, nomes de personagem)
// mora na CAMADA DO CURSO: courses/${lang}-pt-BR/layer.js (português) e ${lang}/content.en.js (inglês).
// Este arquivo sozinho NÃO é exibível: a camada carrega logo depois (index.html) e se aplica sobre ${lang === 'fr' ? 'LEVELS, UNITS, MODULES e LEVEL_TESTS' : 'LEVELS e UNITS'}.
// Os comentários de autoria do arquivo anterior (fluxo da lição, gatilhos de explicação) estão em
// docs/historico/conteudo-original/${lang}-content.js.txt.

` + decl('LEVELS', base.levels) + decl('UNITS', base.units) + decl('MODULES', base.modules) + decl('LEVEL_TESTS', base.levelTests);
fs.writeFileSync(path.join(ROOT, lang, 'content.js'), baseJs.replace(/\n+$/, '\n'));

const dir = path.join(ROOT, 'courses', lang + '-pt-BR');
fs.mkdirSync(dir, { recursive: true });
const layerJs =
`// CAMADA DO CURSO ${APP_KEY[lang]}@pt-BR (E2): texto em português do conteúdo-base ${lang}/content.js.
// Carrega DEPOIS de ${lang}/content.js e de shared/course-layer.js e se aplica sozinha sobre ${lang === 'fr' ? 'LEVELS, UNITS, MODULES e LEVEL_TESTS' : 'LEVELS e UNITS'}.
// Formato: o mesmo do overlay de inglês (shared/content-i18n.js) mais dialogue.speakers. Editar este arquivo para
// mudar texto em português; ids e frases do idioma estudado ficam em ${lang}/content.js.
(function(){
  var L = ${pretty(layer, '  ')};
  var g = typeof window !== 'undefined' ? window : globalThis;
  g.COURSE_LAYERS = g.COURSE_LAYERS || {};
  g.COURSE_LAYERS['${APP_KEY[lang]}@pt-BR'] = L;
  CourseLayer.apply({ units: UNITS, levels: typeof LEVELS !== 'undefined' ? LEVELS : undefined, modules: typeof MODULES !== 'undefined' ? MODULES : undefined, levelTests: typeof LEVEL_TESTS !== 'undefined' ? LEVEL_TESTS : undefined }, L);
})();
`;
fs.writeFileSync(path.join(dir, 'layer.js'), layerJs);
console.log(lang + ': base ' + fs.statSync(path.join(ROOT, lang, 'content.js')).size + ' B, camada ' + fs.statSync(path.join(dir, 'layer.js')).size + ' B');
