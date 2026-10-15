// Gera shared/painel/vendor/pico.painel.css: o CSS OFICIAL do Pico, sem editar, com todo seletor limitado a `.painel`.
// Motivo: carregado solto, o Pico restilizaria o site inteiro (`*`, `a`, `h1`, `:root`, `body`...). Aqui nada vaza.
// Tema: os blocos claro e escuro do Pico viram `.painel` e `:root[data-theme="dark"] .painel` (padrão do site:
// atributo data-theme no <html> + prefers-color-scheme). As cores reais vêm de shared/painel/painel-tokens.css.
// Uso: cd scripts/painel-ds && npm install && node escopar-pico.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const entrada = path.join(aqui, "node_modules/@picocss/pico/css/pico.css");
const saida = path.join(aqui, "../../shared/painel/vendor/pico.painel.css");
const versao = JSON.parse(fs.readFileSync(path.join(aqui, "node_modules/@picocss/pico/package.json"), "utf8")).version;

const P = ".painel";
const ESCURO_ATTR = `:root[data-theme="dark"] ${P}`;
const ESCURO_MEDIA = `:root:not([data-theme="light"]) ${P}`;

// Cada regra: [regex no começo do seletor, substituição]. A primeira que casar vale.
const REGRAS = [
  [/^:root:not\(\[data-theme\]\)/, ESCURO_MEDIA],                 // dentro de @media (prefers-color-scheme: dark)
  [/^:host\(:not\(\[data-theme\]\)\)/, ESCURO_MEDIA],
  [/^\[data-theme=dark\]/, ESCURO_ATTR],
  [/^\[data-theme=light\]/, P],
  [/^:root:not\(\[data-theme=dark\]\)/, P],
  [/^:host\(:not\(\[data-theme=dark\]\)\)/, P],
  [/^:where\(:root\)/, P],
  [/^:where\(:host\)/, P],
  [/^:root/, P],
  [/^:host/, P],
  [/^html\b/, P],
  [/^body\b/, P],
];

function escopar(sel) {
  sel = sel.trim().replace(/\s+/g, " ");
  for (const [re, sub] of REGRAS) {
    if (re.test(sel)) return sel.replace(re, sub);
  }
  return `${P} ${sel}`;
}

// Divide a lista de seletores só nas vírgulas de nível 0 (ignora as de dentro de :not(), :is(), [attr]).
function dividir(lista) {
  const out = []; let nivel = 0, atual = "";
  for (const c of lista) {
    if (c === "(" || c === "[") nivel++;
    if (c === ")" || c === "]") nivel--;
    if (c === "," && nivel === 0) { out.push(atual); atual = ""; } else atual += c;
  }
  if (atual.trim()) out.push(atual);
  return out;
}

const css = fs.readFileSync(entrada, "utf8");
const raiz = postcss.parse(css);
raiz.walkAtRules("charset", (a) => a.remove());
raiz.walkRules((r) => {
  const pai = r.parent;
  if (pai && pai.type === "atrule" && /keyframes$/.test(pai.name)) return;
  // Tamanho de fonte responsivo do :root (106%, 112%...) fora: o painel é desktop primeiro e usa o tamanho do site.
  if (pai && pai.type === "atrule" && pai.name === "media" && /min-width/.test(pai.params) &&
      r.nodes.every((n) => n.type === "decl" && n.prop === "--pico-font-size")) { r.remove(); return; }
  r.selectors = dividir(r.selector).map(escopar);
});
raiz.walkAtRules("media", (a) => { if (!a.nodes || a.nodes.length === 0) a.remove(); });

const cabecalho = `/* Pico CSS v${versao} (MIT, https://picocss.com), limitado a .painel por scripts/painel-ds/escopar-pico.mjs.
   NÃO editar à mão: regenerar com o script. Cores reais: shared/painel/painel-tokens.css. */\n`;
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, cabecalho + raiz.toString().replace(/\n{3,}/g, "\n\n"));
console.log(`OK: ${saida} (${fs.statSync(saida).size} bytes, Pico ${versao})`);
