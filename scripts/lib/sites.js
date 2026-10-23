// Sites de idioma do repositório, descobertos sozinhos: toda pasta da raiz com index.html E app.js (hoje fr e zh;
// o pt entra sem mexer aqui). appKey vem do registro de idiomas (languages/registry.js), pelo `path` da pasta.
// Usado pelos scripts de currículo (congelar_chaves, ids_publicados, gerar_mapa_cron) e pelos testes de paridade.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

function discoverSites(root){
  const r = root || ROOT;
  const { LanguageRegistry } = require(path.join(r, 'languages/registry.js'));
  return fs.readdirSync(r, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
    .filter(d => fs.existsSync(path.join(r, d.name, 'index.html')) && fs.existsSync(path.join(r, d.name, 'app.js')))
    .map(d => {
      const lang = LanguageRegistry.all().find(l => l.path.replace(/\/$/, '') === d.name);
      if (!lang) throw new Error(`site ${d.name}/ sem idioma em languages/registry.json (path "${d.name}/")`);
      return { site: d.name, appKey: lang.appKey };
    })
    .sort((a, b) => (a.site < b.site ? -1 : a.site > b.site ? 1 : 0));
}

module.exports = { discoverSites, ROOT };
