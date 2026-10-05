#!/usr/bin/env node
// Junta docs/i18n/content-<lang>/*.json (um arquivo por unidade + _meta.json)
// no overlay carregado pelo app: fr/content.<lang>.js.
// Uso: node scripts/build-content-overlay.js [en]
const fs = require('fs'), path = require('path');
const lang = process.argv[2] || 'en';
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'docs', 'i18n', 'content-' + lang);
const meta = JSON.parse(fs.readFileSync(path.join(dir, '_meta.json'), 'utf8'));
const overlay = { levels: meta.levels || {}, modules: meta.modules || {}, levelTests: meta.levelTests || {}, units: {} };
fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_meta.json').sort().forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  overlay.units[d.unit] = d[lang];
});
const out = '// GERADO por scripts/build-content-overlay.js a partir de docs/i18n/content-' + lang +
  '/*.json -- não edite à mão.\nwindow.CONTENT_OVERLAYS = window.CONTENT_OVERLAYS || {};\nwindow.CONTENT_OVERLAYS[' +
  JSON.stringify(lang) + '] = ' + JSON.stringify(overlay) + ';\n';
fs.writeFileSync(path.join(ROOT, 'fr', 'content.' + lang + '.js'), out);
console.log('fr/content.' + lang + '.js:', Object.keys(overlay.units).length, 'unidades');
