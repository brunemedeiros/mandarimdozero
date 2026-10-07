#!/usr/bin/env node
// Gera fr/challenges.<lang>.js (desafios + ditados no idioma do site) a partir de
// docs/i18n/challenges-<lang>.json e docs/i18n/dictations-<lang>.json.
// Uso: node scripts/build-challenges-overlay.js [en]
const fs = require('fs'), path = require('path');
const lang = process.argv[2] || 'en';
const ROOT = path.resolve(__dirname, '..');
const ch = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'i18n', 'challenges-' + lang + '.json'), 'utf8'));
const di = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'i18n', 'dictations-' + lang + '.json'), 'utf8'));
const out = '// GERADO por scripts/build-challenges-overlay.js -- não edite à mão.\n' +
  'window.CHALLENGES_I18N = window.CHALLENGES_I18N || {};\nwindow.CHALLENGES_I18N[' + JSON.stringify(lang) + '] = ' + JSON.stringify(ch) + ';\n' +
  'window.DICTATIONS_I18N = window.DICTATIONS_I18N || {};\nwindow.DICTATIONS_I18N[' + JSON.stringify(lang) + '] = ' + JSON.stringify(di) + ';\n';
fs.writeFileSync(path.join(ROOT, 'fr', 'challenges.' + lang + '.js'), out);
console.log('fr/challenges.' + lang + '.js:', Object.keys(ch).length, 'desafios,', Object.keys(di).length, 'ditados');
