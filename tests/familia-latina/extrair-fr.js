// Extrai do TEXTO do fr/app.js as funções de acento/ditado e roda num VM, em duas versões:
//  - ANTIGA: o fr/app.js (e o shared/core) do commit de referência (antes da fase 2, ver REF abaixo):
//    é o "gabarito" do comportamento de antes, para a paridade continuar comparando com o código antigo
//    depois que as funções do fr/app.js viraram repasses para shared/core/familias/latina.js.
//  - NOVA: o fr/app.js de agora + shared/core/familias/latina.js + fr/lang-hooks.js (como a página carrega).
// As duas devolvem a MESMA interface (ver INTERFACE), para test_paridade_fr.js comparar entrada por entrada.
// Nada é copiado à mão.
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const { withCore } = require('../e4/app-source.js');
const { installT } = require('../i18n/vm-t.js');
// Commit de referência = main antes da fase 2 da família latina (2026-10-15). Trocar só de propósito.
const REF = process.env.FAMILIA_LATINA_REF || '675f824';

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
function fonteAntiga() {
  const core = git(['ls-tree', '--name-only', REF, 'shared/core/']).split('\n').filter(f => /^shared\/core\/[^/]+\.js$/.test(f)).sort();
  return core.map(f => git(['show', REF + ':' + f])).join('\n') + '\n' + git(['show', REF + ':fr/app.js']);
}
function fonteNova() { return withCore(fs.readFileSync(path.join(ROOT, 'fr/app.js'), 'utf8')); }
const ler = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function ferramentas(SRC, nomeArquivo) {
  const bloco = (nome) => {
    const ini = SRC.indexOf('// BEGIN ' + nome), fim = SRC.indexOf('// END ' + nome);
    if (ini < 0 || fim < 0) throw new Error('marcadores ' + nome + ' não encontrados (' + nomeArquivo + ')');
    return SRC.slice(ini, fim);
  };
  // Declaração de topo pelo nome: function X(...) {...} até o "}" da coluna 0; const X = [...] até "];";
  // const X = ... ; numa linha só.
  const declaracao = (nome) => {
    const re = new RegExp('^(?:function ' + nome + '\\(|const ' + nome + '\\b)', 'm');
    const m = re.exec(SRC);
    if (!m) throw new Error('declaração ' + nome + ' não encontrada (' + nomeArquivo + ')');
    const resto = SRC.slice(m.index);
    const primeira = resto.split('\n')[0];
    if (/^const /.test(primeira) && /;\s*(\/\/.*)?$/.test(primeira) && !/[\[{]\s*$/.test(primeira)) return primeira;
    const fim = /\n(\}|\];|\};)[^\n]*/.exec(resto);
    return resto.slice(0, fim.index + fim[0].length);
  };
  const tem = (nome) => new RegExp('^(?:function ' + nome + '\\(|const ' + nome + '\\b)', 'm').test(SRC);
  // Setas internas de funções de render (não são de topo): pega a LINHA exata.
  const linhas = (re) => SRC.split('\n').filter(l => re.test(l)).map(l => l.trim());
  return { bloco, declaracao, tem, linhas };
}

const INTERFACE = ['normalizeLoose', 'acceptedForms', 'conjAlign', 'conjFold', 'vocab', 'lacuna', 'gram',
  'isAccentAnswerCorrect', 'accentAnswerOutcome', 'normalizeDictationWord', 'dictLooseNorm', 'dictLightReason',
  'frenchNumberWords', 'prepareDictationUserText', 'tokenizeDictationText', 'evaluateDictation', 'classifyDictationError',
  'dictationLightNoteText', 'accentGroups', 'accentPickerHTML', 'wireAccentPicker'];

function rodar(codigo, prelude) {
  const ctx = installT({});
  vm.createContext(ctx);
  if (prelude) prelude(ctx);
  vm.runInContext(codigo + '\n;this.__fr = { ' + INTERFACE.map(n => n + ': typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined').join(', ') + ' };', ctx);
  const fr = ctx.__fr;
  INTERFACE.forEach(n => { if (fr[n] === undefined) throw new Error('interface sem ' + n); });
  return fr;
}

// fr/app.js do commit de referência (antes da fase 2).
function carregarAntigo() {
  const SRC = fonteAntiga();
  const { bloco, declaracao, linhas } = ferramentas(SRC, REF + ':fr/app.js');
  const strips = linhas(/const strip = s => normalizeLoose\(s\)/);
  const canon = linhas(/const canonSep = s =>/), loose = linhas(/const looseSep = s =>/);
  if (strips.length !== 2 || canon.length !== 1 || loose.length !== 1) throw new Error('setas de comparação inesperadas no fr/app.js de ' + REF);
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
    'const __vs = __vocabStrip(), __ls = __lacunaStrip(), __gs = __gramSep();',
    "const vocab = (typed, alvo) => acceptedForms(alvo).some(f => __vs(f) === __vs(typed)) ? 'ok' : 'errou';",
    "const lacuna = (typed, alvo) => acceptedForms(alvo).some(f => __ls(f) === __ls(typed)) ? 'ok' : 'errou';",
    "const gram = (given, forms) => forms.some(f => __gs.canonSep(given) === __gs.canonSep(f)) ? 'ok' : forms.some(f => __gs.looseSep(given) === __gs.looseSep(f)) ? 'almost' : 'wrong';",
    'const accentGroups = FR_ACCENT_GROUPS, accentPickerHTML = frAccentPickerHTML, wireAccentPicker = wireFrAccentPicker;',
  ].join('\n');
  return rodar(codigo);
}

// fr/app.js de agora, com o módulo e o lang-hooks.js carregados antes (como no fr/index.html).
function carregarNovo() {
  const SRC = fonteNova();
  const { bloco, declaracao, tem, linhas } = ferramentas(SRC, 'fr/app.js');
  // Os exercícios de digitar e o de gramática chamam o módulo direto: confere que o fr/app.js usa mesmo estas chamadas.
  const usoDigitar = linhas(/lessonTypedAnswerResult\(inputEl\.value, /);
  const usoGram = linhas(/latinaFr\(\)\.avaliarComSeparadores\(given, forms\)/);
  if (usoDigitar.length !== 2 || usoGram.length !== 1) throw new Error('chamadas do módulo mudaram no fr/app.js: ' + usoDigitar.length + '/' + usoGram.length);
  const opcional = (nome) => tem(nome) ? declaracao(nome) : '';
  const codigo = [
    bloco('accent-answer-logic'),
    declaracao('acceptedForms'),
    bloco('dictation-answer-logic'),
    bloco('accent-challenge-logic'),
    // alinharLetras saiu do módulo latino para shared/core/licao-feedback.js (paridade C2, 2026-10-23): vem do core.
    opcional('alinharLetras'),
    declaracao('conjAlign'),
    declaracao('conjFold'),
    opcional('FR_ACCENT_GROUPS'),
    opcional('insertAccentAtCursor'),
    declaracao('frAccentPickerHTML'),
    declaracao('wireFrAccentPicker'),
    declaracao('dictationLightNoteText'),
    'const vocab = (typed, alvo) => lessonTypedAnswerResult(typed, alvo);',
    'const lacuna = (typed, alvo) => lessonTypedAnswerResult(typed, alvo);',
    'const gram = (given, forms) => latinaFr().avaliarComSeparadores(given, forms);',
    "const accentGroups = typeof FR_ACCENT_GROUPS !== 'undefined' ? FR_ACCENT_GROUPS : LANG_HOOKS.familiaLatina.gruposDeAcentos;",
    'const accentPickerHTML = frAccentPickerHTML, wireAccentPicker = wireFrAccentPicker;',
  ].join('\n');
  return rodar(codigo, (ctx) => {
    vm.runInContext(ler('shared/core/familias/latina.js'), ctx, { filename: 'latina.js' });
    vm.runInContext(ler('fr/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS'), ctx, { filename: 'fr/lang-hooks.js' });
  });
}

// t() de um catálogo de shared/i18n (com o pt-BR como reserva, como o i18n.js faz).
function tDoCatalogo(lang) {
  const sb = { window: {} }; sb.window = sb;
  vm.runInNewContext(ler('shared/i18n/pt-BR.js'), sb);
  if (lang !== 'pt-BR') vm.runInNewContext(ler('shared/i18n/' + lang + '.js'), sb);
  const cat = Object.assign({}, sb.I18N_CATALOG['pt-BR'], sb.I18N_CATALOG[lang] || {});
  return (k, p) => (k in cat) ? String(cat[k]).replace(/\{(\w+)\}/g, (m, x) => (p && p[x] !== undefined && p[x] !== null) ? String(p[x]) : m) : k;
}

// Configuração do francês como a página usa (fr/lang-hooks.js), para os testes do módulo.
// lang = idioma do SITE dos textos de explicação ('pt-BR' padrão, ou 'en').
function configFr(lang) {
  const ctx = installT({});
  if (lang) ctx.t = tDoCatalogo(lang);
  vm.createContext(ctx);
  vm.runInContext(ler('fr/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS'), ctx, { filename: 'fr/lang-hooks.js' });
  return ctx.LANG_HOOKS.familiaLatina;
}

// Conteúdo real do curso de francês (para ter muitas entradas de verdade).
function corpusFr() {
  const ctx = {};
  vm.createContext(ctx);
  for (const f of ['fr/content.js', 'fr/dictations.js', 'fr/challenges.js', 'fr/conjugation-data.js'])
    vm.runInContext(ler(f).replace(/^(const|let) /gm, 'var '), ctx);
  const textos = new Set();
  const visitar = (v, chave) => {
    if (typeof v === 'string') { if (/\p{L}/u.test(v) && v.length < 400 && !/\.(mp3|png|svg)$/.test(v) && chave !== 'id') textos.add(v); return; }
    if (Array.isArray(v)) return v.forEach(x => visitar(x, chave));
    if (v && typeof v === 'object') for (const k of Object.keys(v)) visitar(v[k], k);
  };
  visitar({ U: ctx.UNITS, D: ctx.DICTATIONS, C: ctx.CHALLENGES, V: ctx.CONJUGATION_VERBS, T: ctx.CONJ_TENSE_EXAMPLES });
  return { textos: [...textos], ditados: ctx.DICTATIONS.map(d => d.text).filter(Boolean), verbos: ctx.CONJUGATION_VERBS };
}

module.exports = { carregarAntigo, carregarNovo, configFr, corpusFr, ROOT, REF };
