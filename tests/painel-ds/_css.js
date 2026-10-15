// Utilitários mínimos de CSS para os testes (sem dependências): extrai seletores, declarações e blocos.
const fs = require('fs');
function semComentarios(css){ return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
// Percorre o CSS e chama cb(seletores[], corpo, contexto[]) para cada regra comum; @keyframes são ignorados.
function regras(css, cb, contexto = []){
  css = semComentarios(css); let i = 0;
  while (i < css.length){
    const ab = css.indexOf('{', i); if (ab < 0) break;
    const prelude = css.slice(i, ab).trim();
    let nivel = 1, j = ab + 1;
    while (j < css.length && nivel > 0){ if (css[j] === '{') nivel++; else if (css[j] === '}') nivel--; j++; }
    const corpo = css.slice(ab + 1, j - 1);
    if (prelude.startsWith('@')){
      if (/^@(media|supports|layer)/.test(prelude)) regras(corpo, cb, contexto.concat(prelude));
    } else if (prelude){
      cb(dividir(prelude), corpo, contexto);
    }
    i = j;
  }
}
function dividir(lista){
  const out = []; let nivel = 0, atual = '';
  for (const c of lista){
    if (c === '(' || c === '[') nivel++; if (c === ')' || c === ']') nivel--;
    if (c === ',' && nivel === 0){ out.push(atual.trim()); atual = ''; } else atual += c;
  }
  if (atual.trim()) out.push(atual.trim());
  return out.map(s => s.replace(/\s+/g, ' '));
}
function declaracoes(corpo){
  const d = {}; const re = /(--[\w-]+|[\w-]+)\s*:\s*([^;]+);?/g; let m;
  while ((m = re.exec(corpo))) d[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  return d;
}
function ler(p){ return fs.readFileSync(p, 'utf8'); }
// Paleta efetiva do site: { light:{--x:v}, dark:{--x:v} } lida dos <style> de fr/zh (mesma regra de precedência do navegador).
function paletaSite(ROOT, curso){
  const html = ler(require('path').join(ROOT, curso, 'index.html'));
  const luz = {}, esc = {};
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)){
    regras(m[1], (sels, corpo, ctx) => {
      const d = declaracoes(corpo); const media = ctx.some(c => /prefers-color-scheme:\s*dark/.test(c));
      for (const s of sels){
        if (s === ':root' && !media) Object.assign(luz, d);
        else if (s === ':root:not([data-theme="light"])' && media) Object.assign(esc, d);
        else if (s === ':root[data-theme="dark"]') Object.assign(esc, d);
      }
    });
  }
  return { luz, esc: Object.assign({}, luz, esc) };
}
module.exports = { regras, declaracoes, semComentarios, ler, paletaSite };
