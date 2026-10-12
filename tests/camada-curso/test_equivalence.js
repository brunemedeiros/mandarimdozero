// E2: base + camada do curso reconstroem EXATAMENTE o conteúdo original (fr e zh), e a base
// fica sem texto de língua de origem. Rodar: node tests/camada-curso/test_equivalence.js
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..');
const CourseLayer = require(path.join(ROOT, 'shared/course-layer.js'));
const CourseContent = require(path.join(ROOT, 'scripts/lib/course-content.js'));
let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) pass++; else { fail++; console.log('FALHOU:', m, x !== undefined ? x : ''); } };

// ORIGINAL de antes da E2 (com o português embutido), guardado em docs/historico/conteudo-original.
function load(lang){
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'docs/historico/conteudo-original', lang + '-content.js.txt'), 'utf8') +
    ';this.__c={units:UNITS,levels:typeof LEVELS!=="undefined"?LEVELS:undefined,modules:typeof MODULES!=="undefined"?MODULES:undefined,levelTests:typeof LEVEL_TESTS!=="undefined"?LEVEL_TESTS:undefined};', ctx);
  return JSON.parse(JSON.stringify(ctx.__c)); // cópia limpa
}
// Canônico: chaves de objeto ordenadas, EXCETO tabelas de conjugação (a ordem das colunas é conteúdo).
function canon(v, inTable){
  if (Array.isArray(v)) return v.map(x => canon(x, false));
  if (v && typeof v === 'object'){
    const keys = Object.keys(v);
    return inTable ? keys.map(k => [k, canon(v[k], false)]) : Object.fromEntries(keys.sort().map(k => [k, canon(v[k], k === 'table')]));
  }
  return v;
}
const hash = o => crypto.createHash('sha256').update(String(JSON.stringify(canon(o)))).digest('hex').slice(0, 12);

// campos de string que PODEM ficar na base (idioma estudado ou chave de lógica)
const BASE_KEYS = new Set(['id','level','f','c','p','answer','alt','form','subject','pinyin','emoji','scenarioEmoji','kind','category','after','type']);

for (const lang of ['fr', 'zh']){
  const orig = load(lang);
  const layer = CourseLayer.extract(JSON.parse(JSON.stringify(orig)));
  const layerRt = JSON.parse(JSON.stringify(layer)); // como seria o arquivo gerado
  const base = CourseLayer.strip(JSON.parse(JSON.stringify(orig)));

  // 1. base sem língua de origem
  const leftovers = new Set();
  (function walk(o, key){
    if (typeof o === 'string'){ if (!BASE_KEYS.has(key)) leftovers.add(key); }
    else if (Array.isArray(o)) o.forEach(v => walk(v, key));
    else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => walk(v, /^\d+$/.test(k) ? key : k));
  })(base.units, 'units');
  ok(leftovers.size === 0, lang + ': base ainda tem campos de texto fora da lista', [...leftovers].join(','));
  ok(JSON.stringify(base).length < JSON.stringify(orig).length, lang + ': base menor que o original');

  // 2. recomposição idêntica, por unidade (hash) e no total
  const composed = CourseLayer.apply(JSON.parse(JSON.stringify(base)), layerRt);
  orig.units.forEach((u, i) => ok(hash(u) === hash(composed.units[i]), lang + ': unidade ' + u.id + ' idêntica após base+camada', hash(u) + ' != ' + hash(composed.units[i])));
  ok(hash(orig) === hash(composed), lang + ': conteúdo inteiro idêntico');
  ok(hash(orig.levels) === hash(composed.levels), lang + ': levels idênticos');
  ok(hash(orig.modules) === hash(composed.modules), lang + ': modules idênticos');
  ok(hash(orig.levelTests) === hash(composed.levelTests), lang + ': levelTests idênticos');
  // ordem das colunas das tabelas de conjugação
  const tablesOf = c => c.units.flatMap(u => (u.grammar ? u.grammar.blocks : []).filter(b => b.table).map(b => Object.keys(b.table).join('|')));
  ok(JSON.stringify(tablesOf(orig)) === JSON.stringify(tablesOf(composed)), lang + ': ordem das colunas das tabelas');

  // 3. camada completa: nada da camada fica de fora (aplicar duas vezes dá o mesmo)
  const twice = CourseLayer.apply(JSON.parse(JSON.stringify(composed)), layerRt);
  ok(hash(twice) === hash(composed), lang + ': aplicar a camada é idempotente');
  ok(Object.keys(layer.units).length === orig.units.length, lang + ': camada cobre todas as unidades');

  // 4. ARQUIVOS REAIS em disco: <lang>/content.js (base) + courses/<lang>-pt-BR/layer.js == original
  const disk = CourseContent.load(lang);
  const diskContent = { units: disk.UNITS, levels: disk.LEVELS, modules: disk.MODULES, levelTests: disk.LEVEL_TESTS };
  ok(hash(orig) === hash(JSON.parse(JSON.stringify(diskContent))), lang + ': arquivos em disco (base + camada) == original');
  const diskBaseOnly = (() => { const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(ROOT, lang, 'content.js'), 'utf8') + ';this.U=UNITS;', ctx); return JSON.parse(JSON.stringify(ctx.U)); })();
  ok(JSON.stringify(diskBaseOnly).indexOf('"title"') === -1 && JSON.stringify(diskBaseOnly).indexOf('"goal"') === -1, lang + ': content.js em disco não tem title/goal (sem texto de língua de origem)');
  ok(hash(diskBaseOnly) === hash(base.units), lang + ': content.js em disco == strip(original)');

  console.log(lang + ': ' + orig.units.length + ' unidades; base ' + JSON.stringify(base).length + ' B + camada ' + JSON.stringify(layer).length + ' B (original ' + JSON.stringify(orig).length + ' B)');
}
console.log(`camada-curso: ${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
