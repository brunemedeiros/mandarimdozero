#!/usr/bin/env node
// Gera fr/challenges.<lang>.js (desafios + ditados no idioma do site) a partir de
// docs/i18n/challenges-<lang>.json e docs/i18n/dictations-<lang>.json.
// Uso: node scripts/build-challenges-overlay.js [en]
// Campos por tipo (chave = id do desafio): expression {meaning, example, secondExample (tradução do exemplo), literal, literalNote, microActivity (tradução da frase da Sua vez), options (as 4 opções no idioma do site, mesma ordem) -- opcionais}; listen_translate {referenceTranslations,
// explanation}; accent {explanation}; cloze_grammar {translation (da translationPt), explanation}.
// Conferência completa contra as fontes: node scripts/validate-challenges-en.js
const fs = require('fs'), path = require('path');
const lang = process.argv[2] || 'en';
const ROOT = path.resolve(__dirname, '..');
const ch = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'i18n', 'challenges-' + lang + '.json'), 'utf8'));
const di = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'i18n', 'dictations-' + lang + '.json'), 'utf8'));
// Complete a frase (cloze_grammar): a tela troca translationPt e explanation pelo overlay; entrada pela metade
// mostraria a tradução em inglês e a explicação em português, então não gera.
const halfCloze = Object.entries(ch).filter(([id, e]) => /^cloze-/.test(id) && (!e.translation || !e.explanation)).map(([id]) => id);
if (halfCloze.length){ console.error('cloze_grammar sem translation/explanation: ' + halfCloze.join(', ')); process.exit(1); }
const out = '// GERADO por scripts/build-challenges-overlay.js -- não edite à mão.\n' +
  'window.CHALLENGES_I18N = window.CHALLENGES_I18N || {};\nwindow.CHALLENGES_I18N[' + JSON.stringify(lang) + '] = ' + JSON.stringify(ch) + ';\n' +
  'window.DICTATIONS_I18N = window.DICTATIONS_I18N || {};\nwindow.DICTATIONS_I18N[' + JSON.stringify(lang) + '] = ' + JSON.stringify(di) + ';\n';
fs.writeFileSync(path.join(ROOT, 'fr', 'challenges.' + lang + '.js'), out);
console.log('fr/challenges.' + lang + '.js:', Object.keys(ch).length, 'desafios,', Object.keys(di).length, 'ditados');
