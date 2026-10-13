// Gera languages/registry.js a partir de languages/registry.json + languages/registry-api.js.
// Uso: node scripts/build-registry.js          (grava)
//      node scripts/build-registry.js --check  (falha se languages/registry.js estiver desatualizado)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'languages/registry.json'), 'utf8'));
const api = fs.readFileSync(path.join(root, 'languages/registry-api.js'), 'utf8');
const { _comment, ...rest } = data;
const out =
  '// ARQUIVO GERADO por scripts/build-registry.js -- NÃO editar. Fonte: languages/registry.json + languages/registry-api.js.\n' +
  'const LANGUAGE_REGISTRY_DATA = ' + JSON.stringify(rest, null, 2) + ';\n\n' + api;
const target = path.join(root, 'languages/registry.js');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (cur !== out) { console.error('languages/registry.js desatualizado: rode node scripts/build-registry.js'); process.exit(1); }
  console.log('registry.js em dia');
} else { fs.writeFileSync(target, out); console.log('gravado languages/registry.js'); }
