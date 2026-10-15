// E4, fase das "quase iguais": para cada função classificada como quase igual no levantamento, grava a diferença LINHA A LINHA entre
// fr/app.js e zh/app.js (código impresso sem comentários, uma instrução por linha). Saída: docs/i18n/e4-quase-iguais.md (ordenado do
// menor para o maior diff) e o JSON correspondente. Rodar depois de scripts/e4-classify-functions.js.
const fs = require('fs'), path = require('path'), ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const data = require(path.join(ROOT, 'docs/i18n/e4-levantamento-funcoes.json'));
const near = data.itens.filter(r => r.cls === 'quase igual' && r.kind === 'function').map(r => r.name);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
function load(file){
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const m = new Map();
  sf.statements.forEach(st => {
    if (ts.isFunctionDeclaration(st) && st.name) m.set(st.name.text, printer.printNode(ts.EmitHint.Unspecified, st, sf));
    else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => { if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) m.set(d.name.text, printer.printNode(ts.EmitHint.Unspecified, st, sf)); });
  });
  return m;
}
const FR = load('fr/app.js'), ZH = load('zh/app.js');
function lcsDiff(a, b){
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m){
    if (a[i] === b[j]){ out.push([' ', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]){ out.push(['-', a[i]]); i++; }
    else { out.push(['+', b[j]]); j++; }
  }
  while (i < n) out.push(['-', a[i++]]); while (j < m) out.push(['+', b[j++]]);
  return out;
}
const rows = near.map(name => {
  const a = (FR.get(name) || '').split('\n'), b = (ZH.get(name) || '').split('\n');
  const d = lcsDiff(a, b), changed = d.filter(x => x[0] !== ' ').length;
  return { name, linesFr: a.length, linesZh: b.length, changed, diff: d };
}).sort((x, y) => x.changed - y.changed || x.linesFr - y.linesFr);
fs.writeFileSync(path.join(ROOT, 'docs/i18n/e4-quase-iguais.json'), JSON.stringify(rows.map(r => ({ name: r.name, linesFr: r.linesFr, linesZh: r.linesZh, changed: r.changed })), null, 1));
let md = `# E4, fase das quase iguais: diferença por função\n\nGerado por \`scripts/e4-diff-near.js\`. Ordem: menos linhas diferentes primeiro. \`-\` = só no francês, \`+\` = só no mandarim.\n\n| # | Função | Linhas fr/zh | Linhas diferentes |\n|---:|---|---:|---:|\n`;
rows.forEach((r, i) => { md += `| ${i + 1} | \`${r.name}\` | ${r.linesFr}/${r.linesZh} | ${r.changed} |\n`; });
rows.forEach(r => {
  md += `\n## \`${r.name}\` (${r.changed} linhas diferentes)\n\n\`\`\`diff\n`;
  // só mostra as linhas diferentes com 1 linha de contexto
  const d = r.diff; const keep = new Set();
  d.forEach((x, i) => { if (x[0] !== ' '){ for (let k = i - 1; k <= i + 1; k++) if (k >= 0 && k < d.length) keep.add(k); } });
  let last = -2;
  d.forEach((x, i) => { if (!keep.has(i)) return; if (i !== last + 1) md += '...\n'; md += x[0] + ' ' + x[1] + '\n'; last = i; });
  md += '```\n';
});
fs.writeFileSync(path.join(ROOT, 'docs/i18n/e4-quase-iguais.md'), md);
console.log(rows.length + ' funções; menores diffs:'); rows.slice(0, 20).forEach(r => console.log(String(r.changed).padStart(3), r.name, r.linesFr + '/' + r.linesZh));
