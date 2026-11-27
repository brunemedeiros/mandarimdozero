// Guarda das decisões visuais da autora de 2026-11-15 (paridade fr x zh): painel de erro/acerto, negrito das explicações,
// "Não sei" do ordene a frase, vermelho de erro e topo no celular. Lê o CSS de PRODUÇÃO de cada site (todos os <style> do
// index.html + os .css de shared/ ligados nele) e confere que as regras valem igual em todos os sites.
// Uso: node tests/paridade-sites/test_visual_licao_topo.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const SITES = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'index.html')) && fs.existsSync(path.join(ROOT, d, 'app.js')));
let ok = 0, bad = 0;
const check = (nome, cond, info) => { if (cond) ok++; else { bad++; console.log('FALHOU:', nome, info === undefined ? '' : JSON.stringify(info)); } };
const norm = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};:,])\s*/g, '$1').trim();

function cssDoSite(site){
  const html = fs.readFileSync(path.join(ROOT, site, 'index.html'), 'utf8');
  let css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  for (const m of html.matchAll(/href="\.\.\/(shared\/[^"]+\.css)"/g)) css += '\n' + fs.readFileSync(path.join(ROOT, m[1]), 'utf8');
  return norm(css);
}
// Última declaração de uma propriedade numa regra de topo com esse seletor exato (fora de @media).
function valor(css, sel, prop){
  let v = null;
  const semMedia = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const rx = new RegExp('(?:^|[}])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^{}]*)\\}', 'g');
  for (const m of semMedia.matchAll(rx)) for (const d of m[1].split(';')) { const i = d.indexOf(':'); if (i > 0 && d.slice(0, i) === prop) v = d.slice(i + 1); }
  return v;
}

check('há pelo menos 2 sites (fr e zh)', SITES.includes('fr') && SITES.includes('zh'), SITES);
const CSS = Object.fromEntries(SITES.map(s => [s, cssDoSite(s)]));
const IGUAIS = [
  ['.wrong-feedback-why-label', 'color', 'var(--ink-soft)'],
  ['button.correct-feedback-continue', 'background', 'var(--success-fill)'],
  ['button.correct-feedback-continue', 'box-shadow', '0 var(--btn-depth) 0 color-mix(in srgb,var(--success-fill) 62%,#000)'],
  ['button.wrong-feedback-continue', 'background', 'var(--error-fill)'],
  ['button.wrong-feedback-continue', 'color', 'var(--on-error-fill)'],
  ['button.wrong-feedback-continue', 'box-shadow', '0 var(--btn-depth) 0 color-mix(in srgb,var(--error-fill) 62%,#000)'],
  ['.gram-block-body strong', 'color', 'var(--seal-red-dark)'],
  ['.reorder-blocks ~ .exercise-dontknow', 'border', '1px solid var(--paper-line)'],
  ['.exercise-option.incorrect', 'border-color', 'var(--error-red)'],
  ['.wrong-feedback-header', 'color', 'var(--error-red-text)'] /* 2026-11-27: texto de erro com o vermelho legível (decisão da autora) */,
  ['.dlg-name', 'max-width', '64px'],
];
for (const site of SITES){
  const css = CSS[site];
  for (const [sel, prop, esperado] of IGUAIS) check(`${site}: ${sel} { ${prop} }`, valor(css, sel, prop) === norm(esperado), { tem: valor(css, sel, prop), esperado: norm(esperado) });
  check(`${site}: --error-fill e --on-error-fill definidos`, /--error-fill:#D62619;--on-error-fill:#FFFFFF/.test(css));
  check(`${site}: --error-red-text definido`, /--error-red-text:/.test(css));
  check(`${site}: erro não usa o vermelho da marca`, !/--error-red:var\(--seal-red\)/.test(css));
  const cel = (css.match(/@media \(max-width:480px\)\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || []).join('');
  check(`${site}: celular esconde o nome do idioma só da vista (leitor de tela continua lendo)`, /\.brand-text\{position:absolute;width:1px;height:1px;[^}]*clip:rect\(0 0 0 0\)/.test(cel));
  check(`${site}: celular com sino e ⚑ de 44 px`, /\.notifications-pill,\.report-topbar-pill\{min-width:44px/.test(cel));
}
check('tabela de nota de gramática do painel de erro em shared/licao-feedback.css', /\.wrong-feedback-why \.grammar-note-table\{/.test(norm(fs.readFileSync(path.join(ROOT, 'shared/licao-feedback.css'), 'utf8'))));
console.log(`visual da lição e do topo (paridade): ${ok}/${ok + bad} verificações` + (bad ? '' : ' — OK'));
process.exit(bad ? 1 : 0);
