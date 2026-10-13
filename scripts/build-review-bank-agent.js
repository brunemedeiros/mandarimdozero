// Gera supabase/functions/review-bank-agent/engine.generated.mjs: o MESMO código do navegador (motor de cartões nativos +
// modelo do Banco + parser da importação), empacotado como módulo para a Edge Function rodar sem eval.
// Rodar: node scripts/build-review-bank-agent.js        Conferir sem gravar: node scripts/build-review-bank-agent.js --check
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'supabase/functions/review-bank-agent/engine.generated.mjs');
const FILES = ['shared/flashcard-model.js', 'shared/flashcard-editor-state.js', 'shared/flashcard-field-editor.js', 'shared/flashcard-native-persistence.js',
  'shared/flashcard-cloze-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/review-bank-model.js', 'shared/review-bank-import.js'];
const EXPORTS = ['rbBuildCard', 'rbReadyToDeliver', 'rbReadyForAuto', 'rbSelectRecap', 'rbItemIssues', 'rbNormalizeItem', 'rbiParse', 'RB_RECAP_SIZE', 'RB_STATUSES', 'RB_ITEM_TYPES'];
// No navegador cada arquivo é um <script> e a ÚLTIMA função de mesmo nome vence; num módulo isso é erro de sintaxe.
// Renomeia as declarações anteriores (nada as chama pelo nome antigo, porque as chamadas resolvem para a última).
const DECL = /^(async\s+)?function\s+(\w+)/gm;
function dedupe(sources){
  const last = {};
  sources.forEach((src, i) => { for (const m of src.matchAll(DECL)) last[m[2]] = i; });
  return sources.map((src, i) => src.replace(DECL, (all, asyncKw, name) => (last[name] !== i ? `${asyncKw || ''}function ${name}__sombra${i}` : all)));
}
function build(){
  const sources = dedupe(FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')));
  const parts = FILES.map((f, i) => `// ===== ${f} =====\n` + sources[i]);
  return `// GERADO por scripts/build-review-bank-agent.js a partir de ${FILES.join(', ')}. NÃO edite: mude o arquivo de origem e rode o script.\n` +
    `const window = globalThis;\nconst escapeHTML = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));\n` +
    parts.join('\n') + `\nexport { ${EXPORTS.join(', ')} };\n`;
}
const out = build();
if (process.argv.includes('--check')){
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out){ console.error('engine.generated.mjs está desatualizado: rode node scripts/build-review-bank-agent.js'); process.exit(1); }
  console.log('engine.generated.mjs em dia');
} else { fs.writeFileSync(OUT, out); console.log('gerado', OUT, out.length, 'bytes'); }
