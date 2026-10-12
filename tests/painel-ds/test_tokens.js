// Os tokens do painel só leem tokens que o site já define, e a cópia das paletas do guia não diverge do site.
// Rodar: node tests/painel-ds/test_tokens.js
const path = require('path'); const { regras, declaracoes, ler, paletaSite: _ps } = require('./_css');
const ROOT = path.resolve(__dirname, '..', '..'), D = path.join(ROOT, 'shared/painel');
let ok = 0, ruim = 0; const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const paletaSite = c => _ps(ROOT, c);
const norm = v => v == null ? v : v.toLowerCase().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();

function paletaGuia(curso){
  const css = ler(path.join(D, 'guia-paletas.css')); const luz = {}, esc = {};
  regras(css, (sels, corpo) => {
    const d = declaracoes(corpo);
    for (const s of sels){
      if (s === ':root') Object.assign(luz, d);                        // base (vale para todos os cursos, como o :root do site)
      if (s === `:root[data-curso="${curso}"]`) Object.assign(luz, d);
      if (s === `:root[data-curso="${curso}"][data-theme="dark"]`) Object.assign(esc, d);
    }
  });
  for (const o of [luz, esc]) for (const k of Object.keys(o)) if (o[k] === 'initial') delete o[k]; // "initial" = o curso não define
  return { luz, esc: Object.assign({}, luz, esc) };
}
const TOKENS = ['--seal-red','--seal-red-dark','--on-seal-red','--imperial-gold','--paper','--paper-warm','--paper-line','--ink','--ink-soft','--jade','--error-red','--grade-again-bg','--grade-hard-bg','--on-vivid','--count-new'];
for (const curso of ['fr', 'zh']){
  const s = paletaSite(curso), g = paletaGuia(curso);
  for (const tema of ['luz', 'esc']){
    for (const t of TOKENS){
      check(`${curso} ${tema} ${t}: guia = site`, norm(s[tema][t]) === norm(g[tema][t]), { site: s[tema][t], guia: g[tema][t] });
    }
  }
  check(`${curso}: --radius e --shadow-card iguais`, norm(s.luz['--radius']) === norm(g.luz['--radius']) && norm(s.luz['--shadow-card']) === norm(g.luz['--shadow-card']), [s.luz['--radius'], g.luz['--radius']]);
  check(`${curso}: --font-body é Nunito`, /nunito/i.test(s.luz['--font-body'] || '') && /nunito/i.test(g.luz['--font-body'] || ''));
}
// Referências: tudo que painel-tokens.css lê do site precisa existir nos DOIS cursos, ou ter fallback explícito.
const tokensCss = ler(path.join(D, 'painel-tokens.css'));
const usados = new Set(); for (const m of tokensCss.matchAll(/var\(\s*(--[\w-]+)/g)) usados.add(m[1]);
const doSite = [...usados].filter(n => !n.startsWith('--p-') && !n.startsWith('--pico-'));
const fr = paletaSite('fr').luz, zh = paletaSite('zh').luz;
const OPCIONAIS = { '--error-red': 'zh usa --grade-again-bg', '--grade-again-bg': 'só fallback no zh' };
for (const n of doSite){
  const emAmbos = n in fr && n in zh;
  check(`site define ${n} nos dois cursos${OPCIONAIS[n] ? ' (ou tem fallback)' : ''}`, emAmbos || !!OPCIONAIS[n], { fr: n in fr, zh: n in zh });
}
check('--p-erro tem fallback para o curso sem --error-red', /--p-erro:\s*var\(--error-red,\s*var\(--grade-again-bg\)\)/.test(tokensCss));
check('painel não usa --font-display (fonte única)', !/--font-display/.test((tokensCss + ler(path.join(D, 'painel-componentes.css'))).replace(/\/\*[\s\S]*?\*\//g, '')));
check('painel-componentes.css não tem cor escrita à mão', !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(ler(path.join(D, 'painel-componentes.css')).replace(/\/\*[\s\S]*?\*\//g, '')));
const tk = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '');
check('painel-tokens.css não tem cor hex escrita à mão', !/#[0-9a-fA-F]{3,8}\b/.test(tk));
// --p-elevado: única cor nova, precisa existir nos 3 blocos de tema (regra do projeto).
check('--p-elevado definido nos 3 blocos de tema', (tokensCss.match(/--p-elevado:/g) || []).length === 3);
console.log(`tokens: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
