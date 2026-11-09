#!/usr/bin/env node
// Gera index.html (página única, sem dependências) a partir de fonte.html:
// embute os ícones Fluent Emoji (shared/icons/fluent, MIT) e os áudios reais
// do site (fr/audio-manifest.js) como data: URIs, para a maquete abrir sozinha.
// Uso: node docs/i18n/curriculo/maquete-licao-curta/gerar.js
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../../../..');
const fonte = fs.readFileSync(path.join(__dirname, 'fonte.html'), 'utf8');

const icones = [...new Set([...fonte.matchAll(/['"]([0-9a-f]{4,5})['"]/g)].map(m => m[1]))]
  .filter(k => fs.existsSync(path.join(raiz, 'shared/icons/fluent', k + '.svg')));
const IMG = {};
for (const k of icones) {
  const svg = fs.readFileSync(path.join(raiz, 'shared/icons/fluent', k + '.svg'));
  IMG[k] = 'data:image/svg+xml;base64,' + svg.toString('base64');
}

const manifesto = fs.readFileSync(path.join(raiz, 'fr/audio-manifest.js'), 'utf8');
const AUD = {};
const frases = ['salut', 'bonjour', 'bonsoir', 'Salut ! Ça va bien ?'];
for (const f of frases) {
  const re = new RegExp('"' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*"([^"]+)"');
  const m = manifesto.match(re);
  if (!m) throw new Error('sem áudio no manifesto: ' + f);
  AUD[f] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(raiz, 'fr/audio', m[1])).toString('base64');
}

const saida = fonte.replace('/*__ASSETS__*/', 'const IMG=' + JSON.stringify(IMG) + ';\nconst AUD=' + JSON.stringify(AUD) + ';');
if (saida === fonte) throw new Error('marcador /*__ASSETS__*/ não encontrado');
fs.writeFileSync(path.join(__dirname, 'index.html'), saida);
console.log('index.html:', icones.length, 'ícones,', Object.keys(AUD).length, 'áudios,', Math.round(saida.length / 1024), 'KB');
