// Prepara uma página HTML do repositório para ser publicada como Artefato (visualização ao vivo no app da Claude).
// Motivo: abrir o .html do repositório na visualização de código mostra a página quebrada, porque o CSS e o JS ficam em
// arquivos vizinhos que essa visualização não carrega. O Artefato recebe a página + esses arquivos e funciona de verdade.
// O que faz: tira <!doctype>/<html>/<head>/<body> (o Artefato põe os dele), copia os CSS e imagens referenciados com o caminho
// relativo à RAIZ do repositório e reescreve os links para esse caminho.
// Uso: node scripts/painel-ds/preparar-artefato.mjs <entrada.html> <pasta-de-saida>
// Depois: publicar <pasta-de-saida>/pagina.html com files = os CSS listados em <pasta-de-saida>/arquivos.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) { console.error("Uso: node preparar-artefato.mjs <entrada.html> <pasta-de-saida>"); process.exit(1); }
const arqEntrada = path.resolve(entrada), dirEntrada = path.dirname(arqEntrada);
let html = fs.readFileSync(arqEntrada, "utf8");
const titulo = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "Página";

const arquivos = {};
// Arquivos usados dentro de um CSS por url(...) (fontes, imagens) e CSS importados: vão junto, com o mesmo caminho relativo à raiz.
function copiarUrls(absCss, relCss){
  const css = fs.readFileSync(absCss, "utf8");
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)){
    const u = m[1]; if (/^(https?:|data:|#)/.test(u)) continue;
    const abs = path.resolve(path.dirname(absCss), u.split("?")[0]), rel = path.relative(raiz, abs).split(path.sep).join("/");
    if (arquivos[rel] || !fs.existsSync(abs)) continue;
    fs.mkdirSync(path.dirname(path.join(saida, rel)), { recursive: true });
    fs.copyFileSync(abs, path.join(saida, rel)); arquivos[rel] = path.join(path.resolve(saida), rel);
  }
}
// Os <script src="..."> locais são copiados com o caminho relativo à raiz.
html = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (tag, src) => {
  if (/^(https?:)?\/\//.test(src)) return tag;
  const abs = path.resolve(dirEntrada, src), rel = path.relative(raiz, abs).split(path.sep).join("/");
  fs.mkdirSync(path.dirname(path.join(saida, rel)), { recursive: true });
  fs.copyFileSync(abs, path.join(saida, rel)); arquivos[rel] = path.join(path.resolve(saida), rel);
  return tag.replace(src, rel);
});
// Os <script> ficam de fora da troca: o guia mostra exemplos de <link> dentro de strings de código.
const scripts = [];
html = html.replace(/<script\b[\s\S]*?<\/script>/gi, (m) => { scripts.push(m); return `\u0000SCRIPT${scripts.length - 1}\u0000`; });
html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g, (tag) => {
  const href = (tag.match(/href=["']([^"']+)["']/) || [])[1];
  if (!href || /^(https?:)?\/\//.test(href)) return tag;               // fontes e CDN ficam como estão
  const abs = path.resolve(dirEntrada, href);
  const rel = path.relative(raiz, abs).split(path.sep).join("/");
  fs.mkdirSync(path.dirname(path.join(saida, rel)), { recursive: true });
  fs.copyFileSync(abs, path.join(saida, rel));
  arquivos[rel] = path.join(path.resolve(saida), rel);
  copiarUrls(abs, rel);
  return tag.replace(href, rel);
});
// Imagens locais (<img src="...">) também vão junto, com o mesmo caminho relativo à raiz.
html = html.replace(/<img\b[^>]*>/g, (tag) => {
  const src = (tag.match(/src=["']([^"']+)["']/) || [])[1];
  if (!src || /^(https?:|data:)/.test(src)) return tag;
  const abs = path.resolve(dirEntrada, src);
  const rel = path.relative(raiz, abs).split(path.sep).join("/");
  fs.mkdirSync(path.dirname(path.join(saida, rel)), { recursive: true });
  fs.copyFileSync(abs, path.join(saida, rel));
  arquivos[rel] = path.join(path.resolve(saida), rel);
  return tag.replace(src, rel);
});
html = html.replace(/\u0000SCRIPT(\d+)\u0000/g, (_, i) => scripts[+i]);
html = html
  .replace(/<!doctype[^>]*>/i, "").replace(/<\/?html[^>]*>/gi, "").replace(/<\/?head>/gi, "").replace(/<\/?body[^>]*>/gi, "")
  .replace(/<meta\s+charset[^>]*>/gi, "").replace(/<meta\s+name=["']viewport["'][^>]*>/gi, "");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "pagina.html"), html.trim() + "\n");
fs.writeFileSync(path.join(saida, "arquivos.json"), JSON.stringify(arquivos, null, 2));
console.log(`OK: ${path.join(saida, "pagina.html")} (título: ${titulo.trim()}) + ${Object.keys(arquivos).length} arquivos`);
console.log(Object.keys(arquivos).join("\n"));
