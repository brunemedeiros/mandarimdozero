// Paridade de estilo entre os sites (2026-10-23, pedido da autora). O fr recebe mais pedidos e o CSS de peças
// compartilhadas acabava só no fr/index.html: a janela "Minha meta de estudo" (shared/wizard.js) saía sem estilo no zh.
// Regra: toda classe usada por um script de shared/ que o site carrega, e que tem CSS em OUTRO site, precisa ter CSS
// neste site também (ou ir para um .css de shared/). Variável de cor usada sem fallback precisa estar definida.
// Os sites são descobertos sozinhos (pasta com index.html e app.js), então o pt e os próximos entram sem mexer aqui.
// Rodar: node tests/paridade-sites/test_css_compartilhado.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Exceções de propósito: a classe só faz sentido num recurso que o site ainda não tem. Sempre com o motivo.
const ALLOW = {
  zh: {
    'level-test-highlight': 'Teste de Nível (módulos) ainda não existe no zh: pendência da autora "módulos do chinês".',
  },
};

const sites = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'index.html')) && fs.existsSync(path.join(ROOT, d, 'app.js')));

function siteInfo(site){
  const html = read(`${site}/index.html`);
  let css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  for (const m of html.matchAll(/href="\.\.\/(shared\/[^"]+\.css)"/g)) css += read(m[1]);
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]));
  const vars = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const sharedScripts = [...html.matchAll(/<script src="\.\.\/(shared\/[^"]+\.js)"/g)].map(m => m[1]).filter(p => fs.existsSync(path.join(ROOT, p)));
  return { html, css, classes, vars, sharedScripts };
}

function classesInJs(src){
  const out = new Set();
  for (const m of src.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]*)/g))
  {
    // ${...} completo vira espaço; um ${ que ficou aberto (aspas dentro da expressão) corta o resto.
    let list = m[1].replace(/\$\{[^}]*\}/g, ' ');
    if (list.includes('${')) list = list.slice(0, list.indexOf('${'));
    for (const tok of list.split(/\s+/)) if (/^[A-Za-z_][\w-]*$/.test(tok)) out.add(tok);
  }
  for (const m of src.matchAll(/classList\.(?:add|toggle|remove|contains)\(\s*['"]([\w-]+)/g)) out.add(m[1]);
  return out;
}

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const info = Object.fromEntries(sites.map(s => [s, siteInfo(s)]));
check('achou pelo menos fr e zh', sites.includes('fr') && sites.includes('zh'), sites);

for (const site of sites){
  const me = info[site], others = sites.filter(s => s !== site);
  const missing = [];
  for (const script of me.sharedScripts){
    for (const cls of classesInJs(read(script))){
      if (me.classes.has(cls) || (ALLOW[site] || {})[cls]) continue;
      const where = others.filter(o => info[o].classes.has(cls));
      if (where.length) missing.push(`${cls} (${script}; tem CSS em ${where.join(', ')})`);
    }
  }
  check(`${site}: toda classe de shared/ com CSS em outro site tem CSS aqui também`, missing.length === 0, missing);

  // var(--x) sem fallback, no CSS e nos scripts do site: precisa estar definida (variável ligada na hora pelo JS é exceção).
  let js = read(`${site}/app.js`);
  for (const p of me.sharedScripts) js += read(p);
  const runtime = new Set([...(me.html + js).matchAll(/(?:setProperty\(\s*['"]|style="[^"]*?|--)(--[\w-]+)\s*[:'"]/g)].map(m => m[1]));
  const inlineSet = new Set([...(me.html + js).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  // var(--x) que é o fallback de outra var(--y, var(--x)) não conta: a de fora já resolve.
  const undef = [...new Set([...(me.css + me.html + js).matchAll(/(?<!,\s*)var\((--[\w-]+)\s*\)/g)].map(m => m[1]))]
    .filter(v => !me.vars.has(v) && !runtime.has(v) && !inlineSet.has(v));
  check(`${site}: toda variável de cor usada sem fallback está definida`, undef.length === 0, undef);
}

// As exceções precisam continuar valendo: se o site ganhou o CSS, a exceção sai da lista.
for (const [site, list] of Object.entries(ALLOW)) for (const cls of Object.keys(list))
  check(`${site}: exceção "${cls}" ainda é necessária`, info[site] && !info[site].classes.has(cls), cls);

console.log(`Paridade de CSS entre sites (${sites.join(', ')}): ${passed}/${passed + failed} verificações${failed ? ' — FALHOU' : ' — OK'}`);
process.exit(failed ? 1 : 0);
