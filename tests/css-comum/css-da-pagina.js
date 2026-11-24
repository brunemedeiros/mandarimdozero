// CSS de uma página na ordem em que o navegador aplica: os blocos <style> do index.html e os .css de shared/ ligados por
// <link rel="stylesheet" href="../shared/...">, intercalados como aparecem no arquivo. Plano do CSS comum
// (docs/css-comum/plano.md): as regras saem do <style> para shared/ no MESMO lugar, então quem lê "o CSS do site" precisa
// ler os dois, na ordem. Usado por tests/css-equilibrio/test_variaveis.js e tests/painel-ds/_css.js.
const fs = require('fs'), path = require('path');

// [{ origem: '<style> nº N' | 'shared/x.css', css }] na ordem do documento. Só CSS do próprio repositório (fontes e
// bibliotecas de fora não entram).
function cssDaPagina(ROOT, site){
  const html = fs.readFileSync(path.join(ROOT, site, 'index.html'), 'utf8');
  const out = []; let n = 0;
  const rx = /<style[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*\brel="stylesheet"[^>]*>/g;
  for (const m of html.matchAll(rx)){
    if (m[1] !== undefined){ out.push({ origem: `<style> nº ${++n}`, css: m[1] }); continue; }
    const href = (m[0].match(/\bhref="([^"]+)"/) || [])[1] || '';
    const rel = href.match(/^\.\.\/(shared\/[^"?#]+\.css)/);
    if (!rel) continue;
    const f = path.join(ROOT, rel[1]);
    if (fs.existsSync(f)) out.push({ origem: rel[1], css: fs.readFileSync(f, 'utf8') });
  }
  return out;
}
module.exports = { cssDaPagina };
