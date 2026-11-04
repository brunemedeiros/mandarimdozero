// A voz do navegador não lê a pronúncia anotada entre barras (stripPronunciationHints, shared/core/voz.js).
// Rodar: node tests/audio-sem-ipa/test_strip.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'core', 'voz.js'), 'utf8');
const m = src.match(/function stripPronunciationHints\(text\)\{[\s\S]*?\n\}\n/);
if (!m) { console.log('função não encontrada'); process.exit(1); }
const strip = new Function(m[0] + '; return stripPronunciationHints;')();
let ok = 0; const falhas = [];
const T = (entrada, esperado) => { const r = strip(entrada); if (r === esperado) ok++; else falhas.push(JSON.stringify(entrada) + ' -> ' + JSON.stringify(r) + ' (esperado ' + JSON.stringify(esperado) + ')'); };

// o caso da tela
T('brésiliens /bʁe.zi.ljɛ̃/ × brésiliennes /bʁe.zi.ljɛn/', 'brésiliens × brésiliennes');
T('Je m\'appelle… /jeuh-ma-pél/', 'Je m\'appelle…');
T('moi /mwa/ / toi /twa/ / comment /kɔmɑ̃/', 'moi / toi / comment');
T('vous /u/ / tu /y/', 'vous / tu');
T('Moi, c\'est Bia. /Muá, sé Bia/', 'Moi, c\'est Bia.');
T('accent /ak.sãn/', 'accent');
T('/bɔn/ bonne', 'bonne');
T('bon /bõ/, bonne /bɔn/.', 'bon, bonne.');
T('(la lettre /i.gRék/) Y', '(la lettre) Y');
// o que NÃO é pronúncia fica como está
T('tu / vous', 'tu / vous');
T('et/ou', 'et/ou');
T('Je suis / Tu es / Il est', 'Je suis / Tu es / Il est');
T('http://exemplo.com/a/b', 'http://exemplo.com/a/b');
T('sem barra nenhuma', 'sem barra nenhuma');
T('', '');

console.log(falhas.length ? 'FALHAS:\n' + falhas.join('\n') : 'ok');
console.log(ok + ' passaram, ' + falhas.length + ' falharam');
process.exit(falhas.length ? 1 : 0);
