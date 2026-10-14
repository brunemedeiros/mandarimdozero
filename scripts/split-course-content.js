// MIGRAÇÃO ÚNICA da E2 (já executada em 2026-10-12): separa o texto em português dos dados de conteúdo
// (camada do curso courses/<lang>-pt-BR/layer.js) e regrava a base só com o idioma estudado.
// Arquivos tratados: fr = content.js, dictations.js, conjugation-data.js (só o cabeçalho de rótulos);
//                    zh = content.js, stories.js, hanzi-data.js.
// Os originais, com todos os comentários de autoria, ficam em docs/historico/conteudo-original/<lang>-<arquivo>.js.txt
// e este script os relê. Uso: node scripts/split-course-content.js fr|zh
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const CourseLayer = require(path.join(ROOT, 'shared/course-layer.js'));
const APP_KEY = { fr: 'frances', zh: 'mandarim' };
const FILES = { fr: ['content', 'dictations', 'conjugation-data'], zh: ['content', 'stories', 'hanzi-data'] };
const lang = process.argv[2];
if (!APP_KEY[lang]) { console.error('uso: node scripts/split-course-content.js fr|zh'); process.exit(1); }
const orig = n => fs.readFileSync(path.join(ROOT, 'docs/historico/conteudo-original', lang + '-' + n + '.js.txt'), 'utf8');

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

// 1. avalia os originais juntos
const ctx = vm.createContext({});
vm.runInContext(FILES[lang].map(orig).join('\n;') + `;this.__c={
  units: UNITS,
  levels: typeof LEVELS !== "undefined" ? LEVELS : undefined,
  modules: typeof MODULES !== "undefined" ? MODULES : undefined,
  levelTests: typeof LEVEL_TESTS !== "undefined" ? LEVEL_TESTS : undefined,
  stories: typeof STORIES !== "undefined" ? STORIES : undefined,
  hanzi: typeof HANZI_LESSONS !== "undefined" ? HANZI_LESSONS : undefined,
  dictations: typeof DICTATIONS !== "undefined" ? DICTATIONS : undefined,
  conjugation: typeof CONJUGATION_GROUPS !== "undefined" ? { groups: CONJUGATION_GROUPS, verbTranslations: VERB_TRANSLATIONS } : undefined
};`, ctx);
const content = JSON.parse(JSON.stringify(ctx.__c));
const layer = CourseLayer.extract(JSON.parse(JSON.stringify(content)));
const base = CourseLayer.strip(JSON.parse(JSON.stringify(content)));

const cname = lang === 'fr' ? 'francês' : 'chinês';
const head = (what, extra) =>
`// ${what} do curso de ${cname} (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/${lang}-pt-BR/layer.js (português) e ${lang}/content.en.js (inglês).${extra || ''}
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/${lang}-<arquivo>.js.txt.

`;
const out = (name, text) => fs.writeFileSync(path.join(ROOT, lang, name), text.replace(/\n+$/, '\n'));

// 2. content.js
out('content.js', head('CONTEÚDO-BASE', `\n// Ids, ${lang === 'fr' ? 'frases em francês (f), respostas' : 'hanzi (c), pinyin (p)'}, tipos e ordem. Sozinho NÃO é exibível: a camada carrega logo depois e se aplica sobre ele.`) +
  decl('LEVELS', base.levels) + decl('UNITS', base.units) + decl('MODULES', base.modules) + decl('LEVEL_TESTS', base.levelTests));

if (lang === 'fr'){
  // 3. dictations.js (a flag de áudio em inglês é lógica e continua aqui)
  const flag = orig('dictations').match(/const DICTATION_AUDIO_EN_READY = (true|false);/)[0];
  out('dictations.js', head('DITADOS', '\n// `task` (descrição da tarefa em português) saiu daqui; `opening` e `text` são francês.') +
    '// Vira true depois de rodar a Action "Áudio TTS" no modo ditados-en (gera os dictation-<id>-guided.en.mp3).\n' + flag + '\n\n' + decl('DICTATIONS', base.dictations));
  // 4. conjugation-data.js: só o trecho de rótulos em português muda; as formas conjugadas ficam byte a byte
  const src = orig('conjugation-data');
  const a = src.indexOf('const CONJUGATION_GROUPS'), b = src.indexOf('const CONJUGATION_VERBS');
  const newHead = '// Rótulos dos grupos e traduções dos verbos em português: courses/fr-pt-BR/layer.js (a camada preenche estes objetos).\n' +
    decl('CONJUGATION_GROUPS', base.conjugation.groups) + 'const VERB_TRANSLATIONS = {};\n\n';
  out('conjugation-data.js', src.slice(0, a) + newHead + src.slice(b));
} else {
  out('stories.js', head('HISTÓRIAS', '\n// Linhas em hanzi (c) e pinyin (p), falantes (spk, nomes próprios), índice da resposta certa (correctIndex).') + decl('STORIES', base.stories));
  out('hanzi-data.js', head('BANCO DE HANZI', '\n// Caractere, pinyin e decomposição por radical (r); significado e mnemônico estão na camada.') +
    decl('HANZI_LESSONS', base.hanzi) + '// "Achata" a lista em um array único, também útil para buscas e contagem total\nconst HANZI_ALL = HANZI_LESSONS.flat();\n');
}

// 5. camada pt-BR
const globals = ['LEVELS', 'UNITS', 'MODULES', 'LEVEL_TESTS', 'STORIES', 'HANZI_LESSONS', 'DICTATIONS'];
const dir = path.join(ROOT, 'courses', lang + '-pt-BR');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'layer.js'),
`// CAMADA DO CURSO ${APP_KEY[lang]}@pt-BR (E2): todo o texto em português dos dados de ${lang}/ (${FILES[lang].map(f => f + '.js').join(', ')}).
// Carrega DEPOIS desses arquivos e de shared/course-layer.js e se aplica sozinha sobre o que existir na página.
// Formato: o mesmo do overlay de inglês (shared/content-i18n.js) mais dialogue.speakers, stories, hanzi, dictations e conjugation.
// Editar este arquivo para mudar texto em português; ids, frases do idioma estudado e ordem ficam em ${lang}/.
(function(){
  var L = ${pretty(layer, '  ')};
  var g = typeof window !== 'undefined' ? window : globalThis;
  g.COURSE_LAYERS = g.COURSE_LAYERS || {};
  g.COURSE_LAYERS['${APP_KEY[lang]}@pt-BR'] = L;
  CourseLayer.apply({
    units: typeof UNITS !== 'undefined' ? UNITS : undefined,
    levels: typeof LEVELS !== 'undefined' ? LEVELS : undefined,
    modules: typeof MODULES !== 'undefined' ? MODULES : undefined,
    levelTests: typeof LEVEL_TESTS !== 'undefined' ? LEVEL_TESTS : undefined,
    stories: typeof STORIES !== 'undefined' ? STORIES : undefined,
    hanzi: typeof HANZI_LESSONS !== 'undefined' ? HANZI_LESSONS : undefined,
    dictations: typeof DICTATIONS !== 'undefined' ? DICTATIONS : undefined,
    conjugation: typeof CONJUGATION_GROUPS !== 'undefined' ? { groups: CONJUGATION_GROUPS, verbTranslations: VERB_TRANSLATIONS } : undefined
  }, L);
})();
`);
console.log(lang + ': ' + FILES[lang].map(f => f + '.js ' + fs.statSync(path.join(ROOT, lang, f + '.js')).size + ' B').join(', ') + '; camada ' + fs.statSync(path.join(dir, 'layer.js')).size + ' B');
