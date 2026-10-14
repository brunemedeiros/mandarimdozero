// E4, passo 1 (docs/i18n/arquitetura-multi-idioma-cursos.md): levantamento por função de fr/app.js x zh/app.js.
// Só leitura: lê os dois arquivos com o parser do TypeScript (AST, não regex), classifica cada declaração de topo e grava
// docs/i18n/e4-levantamento-funcoes.json (dados) e .md (relatório). Rodar: NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-classify-functions.js
const fs = require('fs'), path = require('path');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const FILES = { fr: 'fr/app.js', zh: 'zh/app.js' };

// Área (heurística pelo nome; a lista de áreas é a do plano da E4)
const AREAS = [
  ['estado e persistência', /^(serializeState|applySerializedState|loadState|saveState|STATE|migrate|normalize|ensure|load[A-Z]|save[A-Z]|init(State|Store))|State$|Persist|Storage|LegacyState/i],
  ['revisão e decks', /Review|Deck|Flashcard|Card(Type|Instance)?|Fsrs|Retention|Due|Overdue|Anki|Tag|Note/i],
  ['exercícios de lição', /Lesson|Exercise|Exercicio|Quiz|Option|Answer|Gate|Reorder|Fill|Cloze|Translate|Match|Speed|Dialog|Dlg|Concept|Grammar|Vocab|Phrase|TrueFalse|Scenario/i],
  ['mapa da trilha e unidades', /Trail|Trilha|Map\b|Unit|Level|Module|Path|Progress|Locked|Unlock|Goal/i],
  ['desafios e ditados', /Challenge|Desafio|Dictation|Ditado|Expression|Expr[A-Z]|Accent|Tone/i],
  ['checkpoint e testes', /Checkpoint|LevelTest|Placement/i],
  ['conjugação', /Conj/i],
  ['áudio e fala', /Audio|Speak|Speech|Tts|Voice|Play|Sound|Pinyin|Hanzi|Stroke/i],
  ['perfil, ranking e social', /Profile|Rank|Leader|Friend|Badge|Streak|Xp|Mission|Daily|Notif|Admin|Teacher|Student|Report|Settings|Theme|Toast/i],
];
const areaOf = (name) => { for (const [a, re] of AREAS) if (re.test(name)) return a; return 'outros'; };

function parse(file){
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const printer = ts.createPrinter({ removeComments: true });
  const items = new Map();
  const norm = (node) => printer.printNode(ts.EmitHint.Unspecified, node, sf).replace(/\s+/g, ' ').trim();
  const lines = (node) => sf.getLineAndCharacterOfPosition(node.getEnd()).line - sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const put = (name, kind, node) => { if (!items.has(name)) items.set(name, { name, kind, lines: lines(node), text: norm(node) }); };
  sf.statements.forEach(st => {
    if (ts.isFunctionDeclaration(st) && st.name) put(st.name.text, 'function', st);
    else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => {
      if (!ts.isIdentifier(d.name)) return;
      const init = d.initializer;
      const isFn = init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
      put(d.name.text, isFn ? 'function' : 'dados', d);
    });
    else if (ts.isClassDeclaration(st) && st.name) put(st.name.text, 'classe', st);
  });
  return { items, totalLines: src.split('\n').length };
}

function bigrams(text){
  const toks = text.match(/[A-Za-z_$][\w$]*|\d+|\S/g) || [];
  const m = new Map();
  for (let i = 0; i < toks.length - 1; i++){ const k = toks[i] + '\u0001' + toks[i + 1]; m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function similarity(a, b){
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, uni = 0;
  const keys = new Set([...A.keys(), ...B.keys()]);
  keys.forEach(k => { const x = A.get(k) || 0, y = B.get(k) || 0; inter += Math.min(x, y); uni += Math.max(x, y); });
  return uni ? inter / uni : 1;
}

const fr = parse(FILES.fr), zh = parse(FILES.zh);
const NEAR = 0.75;
const rows = [];
const names = new Set([...fr.items.keys(), ...zh.items.keys()]);
names.forEach(name => {
  const a = fr.items.get(name), b = zh.items.get(name);
  let cls, sim = null;
  if (a && b){
    if (a.text === b.text){ cls = 'idêntica'; sim = 1; }
    else { sim = similarity(a.text, b.text); cls = sim >= NEAR ? 'quase igual' : 'divergente'; }
  } else cls = a ? 'só fr' : 'só zh';
  rows.push({ name, kind: (a || b).kind, area: areaOf(name), cls, similarity: sim === null ? null : Math.round(sim * 100) / 100, linesFr: a ? a.lines : 0, linesZh: b ? b.lines : 0 });
});
rows.sort((x, y) => (y.linesFr + y.linesZh) - (x.linesFr + x.linesZh));

const summary = (filter) => {
  const out = {};
  ['idêntica', 'quase igual', 'divergente', 'só fr', 'só zh'].forEach(c => { out[c] = { n: 0, linesFr: 0, linesZh: 0 }; });
  rows.filter(filter).forEach(r => { const o = out[r.cls]; o.n++; o.linesFr += r.linesFr; o.linesZh += r.linesZh; });
  return out;
};
const pct = (x, tot) => (tot ? Math.round(1000 * x / tot) / 10 : 0);

const all = rows, fns = rows.filter(r => r.kind === 'function');
const S = { funcoes: summary(r => r.kind === 'function'), dados: summary(r => r.kind !== 'function') };
const byArea = {};
rows.filter(r => r.kind === 'function').forEach(r => { (byArea[r.area] = byArea[r.area] || []).push(r); });

const data = { gerado: 'script: scripts/e4-classify-functions.js', limiteQuaseIgual: NEAR, linhasArquivo: { fr: fr.totalLines, zh: zh.totalLines }, resumo: S, itens: rows };
fs.writeFileSync(path.join(ROOT, 'docs/i18n/e4-levantamento-funcoes.json'), JSON.stringify(data, null, 1));

const frTot = fns.reduce((s, r) => s + r.linesFr, 0), zhTot = fns.reduce((s, r) => s + r.linesZh, 0);
let md = `# E4, passo 1: levantamento por função de \`fr/app.js\` x \`zh/app.js\`

Gerado por \`scripts/e4-classify-functions.js\` (parser do TypeScript sobre o código real; só leitura). Dados completos em \`docs/i18n/e4-levantamento-funcoes.json\`.
Declarações de topo: ${fr.items.size} em \`fr/app.js\` (${fr.totalLines} linhas) e ${zh.items.size} em \`zh/app.js\` (${zh.totalLines} linhas). "Quase igual" = pelo menos ${Math.round(NEAR * 100)}% de semelhança em pares de símbolos do código (sem comentários e espaços).

## 1. Resumo das funções (declarações de função)

| Classe | Funções | Linhas no fr | Linhas no zh | % das linhas de função do fr | % do zh |
|---|---:|---:|---:|---:|---:|
`;
['idêntica', 'quase igual', 'divergente', 'só fr', 'só zh'].forEach(c => { const o = S.funcoes[c]; md += `| ${c} | ${o.n} | ${o.linesFr} | ${o.linesZh} | ${pct(o.linesFr, frTot)}% | ${pct(o.linesZh, zhTot)}% |\n`; });
md += `\nTotal de linhas em funções: fr ${frTot}, zh ${zhTot}. Os blocos de dados e constantes (não função) somam ${Object.values(S.dados).reduce((s, o) => s + o.n, 0)} declarações e ficam fora desta conta.

## 2. Por área (funções)

| Área | Idênticas | Quase iguais | Divergentes | Só fr | Só zh |
|---|---:|---:|---:|---:|---:|
`;
Object.keys(byArea).sort().forEach(a => { const c = k => byArea[a].filter(r => r.cls === k).length; md += `| ${a} | ${c('idêntica')} | ${c('quase igual')} | ${c('divergente')} | ${c('só fr')} | ${c('só zh')} |\n`; });
const list = (cls, limit) => rows.filter(r => r.kind === 'function' && r.cls === cls).slice(0, limit || 9999);
md += `\n## 3. Idênticas (candidatas ao passo 3, extração primeiro)\n\n`;
const idn = list('idêntica');
md += idn.length ? idn.map(r => `- \`${r.name}\` (${r.linesFr} linhas, ${r.area})`).join('\n') : '(nenhuma)';
md += `\n\n## 4. Quase iguais (passo 4: extrair com ponto de extensão)\n\n| Função | Semelhança | Linhas fr / zh | Área |\n|---|---:|---:|---|\n`;
list('quase igual').forEach(r => { md += `| \`${r.name}\` | ${Math.round(r.similarity * 100)}% | ${r.linesFr} / ${r.linesZh} | ${r.area} |\n`; });
md += `\n## 5. Divergentes (passo 5: unificar ou assumir como regra do idioma)\n\n| Função | Semelhança | Linhas fr / zh | Área |\n|---|---:|---:|---|\n`;
list('divergente').forEach(r => { md += `| \`${r.name}\` | ${Math.round(r.similarity * 100)}% | ${r.linesFr} / ${r.linesZh} | ${r.area} |\n`; });
md += `\n## 6. Só de um idioma (passo 6: módulos opcionais por idioma)\n\n### Só no francês (${list('só fr').length})\n\n`;
md += list('só fr').map(r => `\`${r.name}\` (${r.linesFr}, ${r.area})`).join(', ');
md += `\n\n### Só no mandarim (${list('só zh').length})\n\n`;
md += list('só zh').map(r => `\`${r.name}\` (${r.linesZh}, ${r.area})`).join(', ');
md += `\n\n## 7. Como reproduzir\n\n\`NODE_PATH=/opt/node22/lib/node_modules node scripts/e4-classify-functions.js\` regrava este relatório e o JSON. A classificação por área é heurística pelo nome da função (lista em \`AREAS\` no script); conferir à mão antes de mover código.\n`;
fs.writeFileSync(path.join(ROOT, 'docs/i18n/e4-levantamento-funcoes.md'), md);
const f = S.funcoes;
console.log(`fr ${fr.items.size} decl., zh ${zh.items.size} decl.`);
['idêntica', 'quase igual', 'divergente', 'só fr', 'só zh'].forEach(c => console.log(c.padEnd(12), String(f[c].n).padStart(4), 'fr', String(f[c].linesFr).padStart(6), 'zh', String(f[c].linesZh).padStart(6)));
