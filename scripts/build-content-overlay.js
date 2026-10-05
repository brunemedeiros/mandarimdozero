#!/usr/bin/env node
// Junta docs/i18n/content-<lang>/*.json (um arquivo por unidade + _meta.json)
// no overlay carregado pelo app: fr/content.<lang>.js.
// Uso: node scripts/build-content-overlay.js [en] [fr|zh]   (padrão fr; zh lê docs/i18n/content-zh-<lang>/ e escreve zh/content.<lang>.js)
const fs = require('fs'), path = require('path');
const lang = process.argv[2] || 'en';
const site = process.argv[3] || 'fr';
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'docs', 'i18n', site === 'fr' ? 'content-' + lang : 'content-' + site + '-' + lang);
const meta = JSON.parse(fs.readFileSync(path.join(dir, '_meta.json'), 'utf8'));
const overlay = { levels: meta.levels || {}, modules: meta.modules || {}, levelTests: meta.levelTests || {}, units: {} };
// Mandarim: _stories.json ({"1":{...}}) e _hanzi.json ({"你":{...}}) viram overlay.stories/hanzi.
const optional = (f) => { const q = path.join(dir, f); return fs.existsSync(q) ? JSON.parse(fs.readFileSync(q, 'utf8')) : null; };
const _st = optional('_stories.json'), _hz = optional('_hanzi.json');
if (_st) overlay.stories = _st;
if (_hz) overlay.hanzi = _hz;
fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_meta.json' && !f.startsWith('_')).sort().forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  overlay.units[d.unit] = d[lang];
});
const out = '// GERADO por scripts/build-content-overlay.js a partir de docs/i18n/content-' + lang +
  '/*.json -- não edite à mão.\nwindow.CONTENT_OVERLAYS = window.CONTENT_OVERLAYS || {};\nwindow.CONTENT_OVERLAYS[' +
  JSON.stringify(lang) + '] = ' + JSON.stringify(overlay) + ';\n';
fs.writeFileSync(path.join(ROOT, site, 'content.' + lang + '.js'), out);
console.log(site + '/content.' + lang + '.js:', Object.keys(overlay.units).length, 'unidades');
