// Toda variável de CSS usada sem valor reserva (var(--x) sem vírgula) no <style> de fr/zh/pt index.html precisa estar
// definida em algum lugar: no próprio index, nos CSS de shared/ ou em JS/HTML que a escreve (style="--x:..." ou
// setProperty('--x')). Achado de 2026-10-17: --ink-faint era usada no Reportar problema e em Configurações e nunca
// existiu, então o texto saía na cor normal em vez do cinza pretendido.
// Rodar: node tests/css-equilibrio/test_variaveis.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const walk = (dir, exts, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })){
    if (['node_modules', '.git', '.claude', 'tests', 'docs'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out); else if (exts.includes(path.extname(e.name))) out.push(p);
  }
  return out;
};
// Definições: "--x:" em qualquer CSS/HTML/JS do site (tokens, estilos em linha e setProperty).
const defined = new Set();
for (const f of walk(ROOT, ['.css', '.html', '.js'])){
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
  for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) defined.add(m[1]);
}
let passed = 0, failed = 0;
for (const app of ['fr', 'zh', 'pt']){
  const f = path.join(ROOT, app, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const missing = new Set();
  for (const m of css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) if (!defined.has(m[1])) missing.add(m[1]);
  if (missing.size){ failed++; console.log(`  FALHOU: ${app}/index.html usa sem definir: ${[...missing].join(', ')}`); } else passed++;
}
console.log(`Variáveis de CSS definidas: ${passed} ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
