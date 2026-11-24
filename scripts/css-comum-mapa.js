// Plano do CSS comum (docs/css-comum/plano.md), etapa 0: mapa dos trechos de CSS IGUAIS, na mesma ordem, entre os
// <style> de fr/index.html e zh/index.html, com as linhas do dia (elas mudam toda semana, por isso o mapa é gerado).
// Só lê; grava docs/css-comum/mapa.md. Rodar: node scripts/css-comum-mapa.js [mínimo de linhas por trecho, padrão 30]
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIN = Number(process.argv[2] || 30);

// Blocos de topo (regra, @media inteiro, @keyframes...) de todos os <style>, com linha inicial/final no arquivo e os
// títulos de seção (comentário "/* ---------- Título") que aparecem antes deles.
function blocos(site){
  const src = fs.readFileSync(path.join(ROOT, site, 'index.html'), 'utf8');
  const lineAt = (() => { const nl = []; for (let i = 0; i < src.length; i++) if (src[i] === '\n') nl.push(i);
    return (pos) => { let lo = 0, hi = nl.length; while (lo < hi){ const m = (lo + hi) >> 1; if (nl[m] < pos) lo = m + 1; else hi = m; } return lo + 1; }; })();
  const out = []; let nStyle = 0;
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)){
    nStyle++;
    const base = m.index + m[0].indexOf('>') + 1, css = m[1];
    let i = 0, depth = 0, start = 0, titulo = null;
    while (i < css.length){
      if (css.startsWith('/*', i)){
        const j = css.indexOf('*/', i) + 2;
        if (depth === 0){ const t = css.slice(i + 2, j - 2).match(/^\s*-{3,}\s*([^\n]*?)\s*-*\s*$/m); if (t && t[1]) titulo = t[1].slice(0, 80); start = j; }
        i = j; continue;
      }
      const c = css[i];
      if (c === '{') depth++;
      else if (c === '}'){ depth--; if (depth === 0){
        const txt = css.slice(start, i + 1);
        const off = start + (txt.length - txt.trimStart().length);
        out.push({ norm: txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim(), ini: lineAt(base + off), fim: lineAt(base + i), style: nStyle, titulo });
        titulo = null; start = i + 1;
      } }
      else if (depth === 0 && /\s/.test(c) && start === i) start = i + 1;
      i++;
    }
  }
  return out;
}

// Maior subsequência comum (DP) entre as duas listas de blocos.
function iguais(A, B){
  const n = A.length, m = B.length, W = m + 1, dp = new Int32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i * W + j] = A[i].norm === B[j].norm ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  const pares = []; let i = 0, j = 0;
  while (i < n && j < m){ if (A[i].norm === B[j].norm){ pares.push([i, j]); i++; j++; } else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++; else j++; }
  return pares;
}

const F = blocos('fr'), Z = blocos('zh');
const pares = iguais(F, Z);
// Trechos contínuos (blocos vizinhos nos dois arquivos e no mesmo <style>).
const trechos = [];
for (const [i, j] of pares){
  const t = trechos[trechos.length - 1];
  if (t && t.fi + t.n === i && t.zj + t.n === j && F[i].style === F[t.fi].style && Z[j].style === Z[t.zj].style) t.n++;
  else trechos.push({ fi: i, zj: j, n: 1 });
}
const linhas = (t) => F[t.fi + t.n - 1].fim - F[t.fi].ini + 1;
const grandes = trechos.filter(t => linhas(t) >= MIN);
const totLinhas = (arr) => arr.reduce((s, t) => s + linhas(t), 0);
const titulos = (t) => [...new Set(F.slice(t.fi, t.fi + t.n).map(b => b.titulo).filter(Boolean))].slice(0, 4).join(' · ') || '(sem título de seção)';

let md = `# Mapa dos trechos de CSS iguais entre fr e zh

Gerado por \`node scripts/css-comum-mapa.js ${MIN}\` em ${new Date().toISOString().slice(0, 10)} (só leitura). Plano: \`docs/css-comum/plano.md\`.
As linhas mudam toda semana: gerar de novo no começo de cada etapa.

- Blocos de estilo (regra, \`@media\` inteiro...): fr ${F.length}, zh ${Z.length}; **${pares.length} iguais e na mesma ordem**
  (${(100 * pares.length / F.length).toFixed(1)}% do fr).
- Trechos contínuos iguais: ${trechos.length}; com ${MIN} linhas ou mais: **${grandes.length}**, somando ${totLinhas(grandes)} linhas do fr
  (o resto são trechos curtos entre regras que só existem num site).

| # | fr (linhas) | zh (linhas) | Blocos | Linhas | Seções |
|---|---|---|---|---|---|
`;
grandes.forEach((t, k) => {
  md += `| ${k + 1} | ${F[t.fi].ini}-${F[t.fi + t.n - 1].fim} (\`<style>\` ${F[t.fi].style}) | ${Z[t.zj].ini}-${Z[t.zj + t.n - 1].fim} (\`<style>\` ${Z[t.zj].style}) | ${t.n} | ${linhas(t)} | ${titulos(t).replace(/\|/g, '/')} |\n`;
});
fs.writeFileSync(path.join(ROOT, 'docs/css-comum/mapa.md'), md);
console.log(`fr ${F.length} blocos, zh ${Z.length}; iguais na mesma ordem ${pares.length}; trechos >= ${MIN} linhas: ${grandes.length} (${totLinhas(grandes)} linhas) -> docs/css-comum/mapa.md`);
