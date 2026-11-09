#!/usr/bin/env node
// Gera index.html (página única, sem dependências) a partir de fonte.html:
// embute os áudios reais do site (fr/audio-manifest.js) como data: URIs, para a
// maquete abrir sozinha. Sem imagens dentro da lição (decisão 341).
// Uso: node docs/i18n/curriculo/maquete-licao-curta/gerar.js
const fs = require('fs');
const path = require('path');
const raiz = path.resolve(__dirname, '../../../..');
const fonte = fs.readFileSync(path.join(__dirname, 'fonte.html'), 'utf8');

const manifesto = fs.readFileSync(path.join(raiz, 'fr/audio-manifest.js'), 'utf8');
const AUD = {};
const frases = ['salut', 'bonjour', 'bonsoir', 'ça va', 'Salut ! Ça va bien ?'];
for (const f of frases) {
  const re = new RegExp('"' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*"([^"]+)"');
  const m = manifesto.match(re);
  if (!m) throw new Error('sem áudio no manifesto: ' + f);
  AUD[f] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(raiz, 'fr/audio', m[1])).toString('base64');
}

const saida = fonte.replace('/*__ASSETS__*/', 'const AUD=' + JSON.stringify(AUD) + ';');
if (saida === fonte) throw new Error('marcador /*__ASSETS__*/ não encontrado');
fs.writeFileSync(path.join(__dirname, 'index.html'), saida);
console.log('index.html:', Object.keys(AUD).length, 'áudios,', Math.round(saida.length / 1024), 'KB');
