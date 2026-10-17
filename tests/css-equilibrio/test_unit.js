// Chaves do CSS equilibradas em cada <style> de fr/zh/pt index.html. Um "@media (hover:hover){" sem fechar (merge de
// 2026-10-12, achado em 2026-10-16) fez todo o CSS seguinte valer só em aparelho com mouse: no celular os painéis e o
// cartão do convite ficavam sem estilo. Os testes de navegador não pegam (Chromium de teste tem hover).
// Rodar: node tests/css-equilibrio/test_unit.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
for (const app of ['fr', 'zh', 'pt']){
  const f = path.join(ROOT, app, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  blocks.forEach((css, i) => {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    let depth = 0, min = 0, line = 1, firstNeg = null;
    for (const ch of clean){
      if (ch === '\n') line++;
      if (ch === '{') depth++;
      if (ch === '}'){ depth--; if (depth < min){ min = depth; if (firstNeg === null) firstNeg = line; } }
    }
    const ok = depth === 0 && min === 0;
    if (ok) passed++; else { failed++; console.log(`  FALHOU: ${app}/index.html <style> nº ${i + 1}: profundidade final ${depth}${firstNeg ? `, fecha a mais na linha ${firstNeg} do bloco` : ''}`); }
  });
}
console.log(`CSS equilibrado: ${passed} ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
