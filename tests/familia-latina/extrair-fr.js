// Extrai do TEXTO do fr/app.js (e do shared/core) as funções de acento/ditado de hoje e roda num VM,
// para comparar com shared/core/familias/latina.js. Nada é copiado à mão: se o fr/app.js mudar, o teste
// de paridade passa a comparar com a versão nova.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const { withCore } = require('../e4/app-source.js');
const SRC = withCore(fs.readFileSync(path.join(ROOT, 'fr/app.js'), 'utf8'));

function bloco(nome) {
  const ini = SRC.indexOf('// BEGIN ' + nome), fim = SRC.indexOf('// END ' + nome);
  if (ini < 0 || fim < 0) throw new Error('marcadores ' + nome + ' não encontrados no fr/app.js');
  return SRC.slice(ini, fim);
}

// Declaração de topo pelo nome: function X(...) {...} até o "}" da coluna 0; const X = [...] até "];";
// const X = ... ; numa linha só.
function declaracao(nome) {
  const re = new RegExp('^(?:function ' + nome + '\\(|const ' + nome + '\\b)', 'm');
  const m = re.exec(SRC);
  if (!m) throw new Error('declaração ' + nome + ' não encontrada');
  const resto = SRC.slice(m.index);
  const primeira = resto.split('\n')[0];
  if (/^const /.test(primeira) && /;\s*$/.test(primeira) && !/[\[{]\s*$/.test(primeira)) return primeira;
  const fim = /\n(\}|\];|\};)[^\n]*/.exec(resto);
  return resto.slice(0, fim.index + fim[0].length);
}

// Setas internas de funções de render (não são de topo): pega a LINHA exata do fr/app.js.
function linhas(re) {
  return SRC.split('\n').filter(l => re.test(l)).map(l => l.trim());
}

function carregarFr() {
  const strips = linhas(/const strip = s => normalizeLoose\(s\)/);
  const canon = linhas(/const canonSep = s =>/), loose = linhas(/const looseSep = s =>/);
  if (strips.length !== 2 || canon.length !== 1 || loose.length !== 1) throw new Error('setas de comparação mudaram no fr/app.js: ' + strips.length + '/' + canon.length + '/' + loose.length);
  const codigo = [
    bloco('accent-answer-logic'),
    declaracao('acceptedForms'),
    bloco('dictation-answer-logic'),
    bloco('accent-challenge-logic'),
    declaracao('conjAlign'),
    declaracao('conjFold'),
    declaracao('FR_ACCENT_GROUPS'),
    declaracao('frAccentPickerHTML'),
    declaracao('wireFrAccentPicker'),
    declaracao('dictationLightNoteText'),
    'function __vocabStrip(){ ' + strips[0] + ' return strip; }',
    'function __lacunaStrip(){ ' + strips[1] + ' return strip; }',
    'function __gramSep(){ ' + canon[0] + ' ' + loose[0] + ' return { canonSep, looseSep }; }',
  ].join('\n');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(codigo + '\n;this.__fr = { normalizeLoose, acceptedForms, normalizeDictationWord, dictLooseNorm, dictLightReason, frenchNumberWords, prepareDictationUserText, tokenizeDictationText, mergeSplitCompoundWords, diffDictationWords, mergeDictationDiff, evaluateDictation, classifyDictationError, normalizeForAccentCompare, isAccentAnswerCorrect, stripDiacriticsForAccentCompare, accentAnswerOutcome, conjAlign, conjFold, FR_ACCENT_GROUPS, frAccentPickerHTML, wireFrAccentPicker, dictationLightNoteText, vocabStrip: __vocabStrip(), lacunaStrip: __lacunaStrip(), gramSep: __gramSep() };', ctx);
  return ctx.__fr;
}

// Conteúdo real do curso de francês (para ter muitas entradas de verdade).
function corpusFr() {
  const ctx = {};
  vm.createContext(ctx);
  for (const f of ['fr/content.js', 'fr/dictations.js', 'fr/challenges.js', 'fr/conjugation-data.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx);
  const textos = new Set();
  const visitar = (v, chave) => {
    if (typeof v === 'string') { if (/\p{L}/u.test(v) && v.length < 400 && !/\.(mp3|png|svg)$/.test(v) && chave !== 'id') textos.add(v); return; }
    if (Array.isArray(v)) return v.forEach(x => visitar(x, chave));
    if (v && typeof v === 'object') for (const k of Object.keys(v)) visitar(v[k], k);
  };
  visitar({ U: ctx.UNITS, D: ctx.DICTATIONS, C: ctx.CHALLENGES, V: ctx.CONJUGATION_VERBS, T: ctx.CONJ_TENSE_EXAMPLES });
  return { textos: [...textos], ditados: ctx.DICTATIONS.map(d => d.text).filter(Boolean), verbos: ctx.CONJUGATION_VERBS };
}

module.exports = { carregarFr, corpusFr, ROOT };
