// E4 (docs/i18n/e4-plano-de-extracao.md): move funções IDÊNTICAS de fr/app.js e zh/app.js para shared/core/<arquivo>.js,
// com o texto exato (e o comentário colado em cima), apaga dos dois app.js e põe o <script> antes do app.js nos dois index.html.
// Uso: NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-extract.js <lote> <arquivo-sem-.js> <nome1,nome2,...> "<descrição>"
// Gate embutido: antes de gravar, confere que cada função tem o MESMO texto (sem comentários) nos dois idiomas e que, depois, o
// conjunto de declarações de topo (fr, zh, shared/core) é o de antes. Qualquer divergência aborta sem gravar nada.
const fs = require('fs'), path = require('path');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const [batch, outName, namesArg, desc] = process.argv.slice(2);
if (!batch || !outName || !namesArg){ console.error('uso: e4-extract.js <lote> <arquivo> <nomes> "<descrição>"'); process.exit(1); }
const NAMES = namesArg.split(',').map(s => s.trim()).filter(Boolean);
const LANGS = { fr: 'fr/app.js', zh: 'zh/app.js' };
const printer = ts.createPrinter({ removeComments: true });
const norm = (node, sf) => printer.printNode(ts.EmitHint.Unspecified, node, sf).replace(/\s+/g, ' ').trim();

function load(file){
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const decls = new Map();
  sf.statements.forEach(st => { if (ts.isFunctionDeclaration(st) && st.name) decls.set(st.name.text, st); });
  return { src, sf, decls };
}
function topNames(src, file){
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const out = [];
  sf.statements.forEach(st => {
    if (ts.isFunctionDeclaration(st) && st.name) out.push(st.name.text);
    else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => ts.isIdentifier(d.name) && out.push(d.name.text));
    else if (ts.isClassDeclaration(st) && st.name) out.push(st.name.text);
  });
  return out;
}
// início do trecho = primeiro comentário colado na função (sem linha em branco entre eles)
function startOf(src, node){
  const full = node.getFullStart();
  const ranges = ts.getLeadingCommentRanges(src, full) || [];
  let start = node.getStart();
  for (let i = ranges.length - 1; i >= 0; i--){
    const between = src.slice(ranges[i].end, start);
    if (/\n\s*\n/.test(between)) break;
    start = ranges[i].pos;
  }
  // volta ao começo da linha
  while (start > 0 && src[start - 1] !== '\n') start--;
  return start;
}
function endOf(src, node){ let e = node.getEnd(); while (e < src.length && src[e] !== '\n') e++; return e + 1; }

const data = {};
for (const [lang, file] of Object.entries(LANGS)) data[lang] = load(file);

// gate 1: existe nos dois, é função de topo e o texto é idêntico
const problems = [];
NAMES.forEach(n => {
  const a = data.fr.decls.get(n), b = data.zh.decls.get(n);
  if (!a || !b){ problems.push(`${n}: não é declaração de função de topo nos dois arquivos`); return; }
  if (norm(a, data.fr.sf) !== norm(b, data.zh.sf)) problems.push(`${n}: texto diferente entre fr e zh`);
});
if (problems.length){ console.error('ABORTADO:\n' + problems.join('\n')); process.exit(2); }

const before = {}; for (const [lang, file] of Object.entries(LANGS)) before[lang] = new Set(topNames(data[lang].src, file));
const frTexts = NAMES.map(n => ({ n, node: data.fr.decls.get(n) }));
// ordem do arquivo do francês
frTexts.sort((x, y) => x.node.getStart() - y.node.getStart());
const chunkOf = (lang, n) => data[lang].src.slice(startOf(data[lang].src, data[lang].decls.get(n)), endOf(data[lang].src, data[lang].decls.get(n))).replace(/\s+$/, '');
// o código é idêntico; se o comentário difere, fica o MAIS LONGO (não perde explicação de nenhum idioma)
const chunks = frTexts.map(({ n }) => { const a = chunkOf('fr', n), b = chunkOf('zh', n); return b.length > a.length ? b : a; });
const commentDiff = NAMES.filter(n => {
  const a = data.fr.src.slice(startOf(data.fr.src, data.fr.decls.get(n)), endOf(data.fr.src, data.fr.decls.get(n))).trim();
  const b = data.zh.src.slice(startOf(data.zh.src, data.zh.decls.get(n)), endOf(data.zh.src, data.zh.decls.get(n))).trim();
  return a !== b;
});

const header = `// E4 lote ${batch}: ${desc || outName}.
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

`;
const outFile = path.join(ROOT, 'shared/core', outName + '.js');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const outText = header + chunks.join('\n\n') + '\n';

// grava app.js sem as funções (de trás para frente)
const newSrc = {};
for (const [lang, file] of Object.entries(LANGS)){
  let s = data[lang].src;
  const ranges = NAMES.map(n => { const node = data[lang].decls.get(n); return [startOf(s, node), endOf(s, node)]; }).sort((a, b) => b[0] - a[0]);
  ranges.forEach(([a, b]) => { s = s.slice(0, a) + s.slice(b); });
  s = s.replace(/\n{4,}/g, '\n\n\n');
  newSrc[lang] = s;
}
// gate 2: depois = antes - movidas; shared/core tem todas; textos iguais ao original
const sfOut = ts.createSourceFile('out.js', outText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const outDecls = new Map(); sfOut.statements.forEach(st => ts.isFunctionDeclaration(st) && st.name && outDecls.set(st.name.text, st));
const bad = [];
NAMES.forEach(n => {
  if (!outDecls.has(n)) bad.push(`${n}: ausente no arquivo novo`);
  else if (norm(outDecls.get(n), sfOut) !== norm(data.fr.decls.get(n), data.fr.sf)) bad.push(`${n}: texto mudou na cópia`);
});
for (const lang of Object.keys(LANGS)){
  const after = new Set(topNames(newSrc[lang], LANGS[lang]));
  const expect = new Set([...before[lang]].filter(x => !NAMES.includes(x)));
  if (after.size !== expect.size || [...after].some(x => !expect.has(x))) bad.push(`${lang}: conjunto de declarações de topo não bate`);
}
if (bad.length){ console.error('ABORTADO no gate 2:\n' + bad.join('\n')); process.exit(3); }

fs.writeFileSync(outFile, outText);
for (const [lang, file] of Object.entries(LANGS)) fs.writeFileSync(path.join(ROOT, file), newSrc[lang]);
for (const lang of Object.keys(LANGS)){
  const html = path.join(ROOT, lang, 'index.html');
  let h = fs.readFileSync(html, 'utf8');
  const tag = `<script src="../shared/core/${outName}.js"></script>`;
  if (!h.includes(tag)){ h = h.replace('<script src="app.js"></script>', tag + '\n<script src="app.js"></script>'); fs.writeFileSync(html, h); }
}
console.log(`lote ${batch}: ${NAMES.length} funções para shared/core/${outName}.js (${outText.split('\n').length} linhas); fr ${before.fr.size} -> ${topNames(newSrc.fr, LANGS.fr).length} decl., zh ${before.zh.size} -> ${topNames(newSrc.zh, LANGS.zh).length}`);
if (commentDiff.length) console.log('Comentários diferentes entre fr e zh (ficou o mais longo): ' + commentDiff.join(', '));
