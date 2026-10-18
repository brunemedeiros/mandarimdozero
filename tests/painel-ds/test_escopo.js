// Garante que NENHUM seletor do Pico do painel (nem dos nossos arquivos) vaza para fora de .painel.
// Se vazasse, carregar o CSS restilizaria o site inteiro (a, h1, *, :root, body...).
// Rodar: node tests/painel-ds/test_escopo.js
const path = require('path'); const { regras, ler } = require('./_css');
const ROOT = path.resolve(__dirname, '..', '..'), D = path.join(ROOT, 'shared/painel');
let ok = 0, ruim = 0; const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
for (const arq of ['vendor/pico.painel.css', 'painel-tokens.css', 'painel-componentes.css']){
  let total = 0; const vazando = [];
  regras(ler(path.join(D, arq)), (sels) => sels.forEach(s => { total++; if (!s.includes('.painel')) vazando.push(s); }));
  check(`${arq}: tem seletores`, total >= 3, total);
  check(`${arq}: nenhum seletor fora de .painel (${total} seletores)`, vazando.length === 0, vazando.slice(0, 5));
}
// O Pico oficial não pode ter sido editado à mão: o cabeçalho de geração tem que estar lá.
const pico = ler(path.join(D, 'vendor/pico.painel.css'));
check('pico.painel.css: cabeçalho de geração presente', /Pico CSS v2\.1\.1/.test(pico) && /escopar-pico\.mjs/.test(pico));
check('pico.painel.css: sem @charset', !/@charset/.test(pico));
// Nomes de @keyframes do Pico não podem colidir com os do site.
const kf = [...pico.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
const fs = require('fs'); const siteCss = ['fr/index.html', 'zh/index.html'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n') + fs.readdirSync(path.join(ROOT, 'shared')).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(ROOT, 'shared', f), 'utf8')).join('\n');
check('@keyframes do Pico não colidem com o site', kf.every(n => !new RegExp('@keyframes\\s+' + n + '\\b').test(siteCss)), kf);
console.log(`escopo: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
