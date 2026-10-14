// E4: parte do código de fr/app.js e zh/app.js passou para shared/core/*.js (carregado antes do app.js na página).
// Testes que extraem funções do TEXTO do app.js usam withCore(texto) para enxergar também o core.
const fs = require('fs'), path = require('path');
const CORE = path.resolve(__dirname, '../../shared/core');
function coreText(){
  if (!fs.existsSync(CORE)) return '';
  return fs.readdirSync(CORE).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(CORE, f), 'utf8')).join('\n');
}
module.exports = { coreText, withCore: (appSrc) => coreText() + '\n' + appSrc };
