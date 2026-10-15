// E4, fase das "quase iguais" (docs/i18n/e4-plano-de-extracao.md, seção 4, lote 5+): unifica funções que diferem só em detalhes de idioma.
// Uso: NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-unify-near.js scripts/e4-batches/<lote>.js
// O manifesto do lote (module.exports) diz, por função: como gerar a versão UNIFICADA a partir do texto do francês, e como "desfazer"
// os ganchos para cada idioma. Gate textual: para as funções com `reverse`, a versão unificada com os ganchos trocados pelo valor de
// cada idioma TEM de ser igual (sem comentários) à função original daquele idioma; as marcadas `semantic` têm a justificativa no manifesto
// e são conferidas pelos testes. Os ganchos de cada idioma moram em <idioma>/lang-hooks.js (const LANG_HOOKS), carregado antes do app.js.
const fs = require('fs'), path = require('path'), ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const manifest = require(path.resolve(process.argv[2]));
const LANGS = { fr: 'fr/app.js', zh: 'zh/app.js' };
const printer = ts.createPrinter({ removeComments: true });
const norm = (node, sf) => printer.printNode(ts.EmitHint.Unspecified, node, sf).replace(/\s+/g, ' ').trim();
const normText = (txt) => { const sf = ts.createSourceFile('x.js', txt, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); return sf.statements.map(s => norm(s, sf)).join(' '); };
function load(file){
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const decls = new Map(); sf.statements.forEach(st => { if (ts.isFunctionDeclaration(st) && st.name) decls.set(st.name.text, st); });
  return { src, sf, decls };
}
function startOf(src, node){
  const ranges = ts.getLeadingCommentRanges(src, node.getFullStart()) || []; let start = node.getStart();
  for (let i = ranges.length - 1; i >= 0; i--){ if (/\n\s*\n/.test(src.slice(ranges[i].end, start))) break; start = ranges[i].pos; }
  while (start > 0 && src[start - 1] !== '\n') start--; return start;
}
const endOf = (src, node) => { let e = node.getEnd(); while (e < src.length && src[e] !== '\n') e++; return e + 1; };
const data = {}; for (const [l, f] of Object.entries(LANGS)) data[l] = load(f);
const text = (l, n) => data[l].src.slice(startOf(data[l].src, data[l].decls.get(n)), endOf(data[l].src, data[l].decls.get(n))).replace(/\s+$/, '');
const problems = [], unified = [];
for (const [name, spec] of Object.entries(manifest.functions)){
  if (!data.fr.decls.get(name) || !data.zh.decls.get(name)){ problems.push(`${name}: não existe nos dois arquivos`); continue; }
  const base = spec.from === 'zh' ? text('zh', name) : text('fr', name);
  const uni = spec.unify ? spec.unify(base) : base;
  if (uni === base && !spec.keep) problems.push(`${name}: a unificação não mudou nada`);
  if (spec.reverse){
    for (const l of ['fr', 'zh']){
      const back = spec.reverse[l](uni);
      if (normText(back) !== normText(text(l, name))) problems.push(`${name}: com os ganchos trocados pelo ${l}, não volta ao original`);
    }
  } else if (!spec.semantic) problems.push(`${name}: sem reverse e sem semantic`);
  unified.push({ name, uni });
}
if (problems.length){ console.error('ABORTADO:\n' + problems.join('\n')); process.exit(2); }
// grava: arquivo do core
const outFile = path.join(ROOT, 'shared/core', manifest.file + '.js');
const header = `// E4 lote ${manifest.batch}: ${manifest.desc}.\n// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS\n// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.\n// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.\n\n`;
fs.writeFileSync(outFile, header + unified.map(u => u.uni).join('\n\n') + '\n');
// remove dos dois app.js
const names = Object.keys(manifest.functions);
for (const [l, f] of Object.entries(LANGS)){
  let s = data[l].src;
  names.map(n => [startOf(s, data[l].decls.get(n)), endOf(s, data[l].decls.get(n))]).sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { s = s.slice(0, a) + s.slice(b); });
  s = s.replace(/\n{4,}/g, '\n\n\n'); fs.writeFileSync(path.join(ROOT, f), s);
}
// ganchos por idioma
for (const l of ['fr', 'zh']){
  const hp = path.join(ROOT, l, 'lang-hooks.js');
  let h = fs.existsSync(hp) ? fs.readFileSync(hp, 'utf8') : `// E4: o que muda de um idioma estudado para outro e que o código compartilhado (shared/core) precisa saber.\n// Carregado antes do app.js. Funções chamam as do app.js só na hora do uso (setas), então a ordem de carga não importa.\nconst LANG_HOOKS = {\n// --- E4 hooks ---\n// --- /E4 hooks ---\n};\n`;
  h = h.replace('// --- /E4 hooks ---', Object.entries(manifest.hooks[l]).map(([k, v]) => `  ${k}: ${v},`).join('\n') + '\n// --- /E4 hooks ---');
  fs.writeFileSync(hp, h);
  const html = path.join(ROOT, l, 'index.html'); let t = fs.readFileSync(html, 'utf8');
  const tagH = `<script src="lang-hooks.js"></script>`, tagC = `<script src="../shared/core/${manifest.file}.js"></script>`;
  if (!t.includes(tagH)) t = t.replace('<script src="app.js"></script>', tagH + '\n<script src="app.js"></script>');
  if (!t.includes(tagC)) t = t.replace('<script src="app.js"></script>', tagC + '\n<script src="app.js"></script>');
  fs.writeFileSync(html, t);
}
console.log(`lote ${manifest.batch}: ${names.length} funções unificadas em shared/core/${manifest.file}.js`);
