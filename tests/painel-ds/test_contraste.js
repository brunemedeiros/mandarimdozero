// Contraste WCAG 2.x das combinações reais do painel, nos 4 cenários (fr/zh x claro/escuro), com as cores LIDAS de
// fr/index.html e zh/index.html. Texto: mínimo 4,5. Elementos de interface: mínimo 3.
// Rodar: node tests/painel-ds/test_contraste.js
const path = require('path'); const { paletaSite } = require('./_css');
const ROOT = path.resolve(__dirname, '..', '..');
let ok = 0, ruim = 0; const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const rgb = h => { h = h.trim(); if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join(''); const m = h.match(/^#([0-9a-f]{6})/i); if (!m) throw new Error('cor não hex: ' + h); const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
// o site pode definir um token como var(--outro) (ex.: --error-red no zh claro = --seal-red): segue a referência até a cor
const viaVar = (s, v) => { for (let i = 0; i < 5 && v && /^var\(/.test(v.trim()); i++) v = s[v.trim().match(/var\((--[\w-]+)/)[1]]; return v; };
const mix = (a, b, pa) => a.map((v, i) => v * pa + b[i] * (1 - pa)); // color-mix(in srgb, a pa%, b)
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const BRANCO = [255, 255, 255];
// Trava: as misturas usadas aqui são as MESMAS do CSS. Se alguém mudar um percentual no CSS, este teste avisa.
const css = require('fs').readFileSync(path.join(ROOT, 'shared/painel/painel-tokens.css'), 'utf8');
check('CSS: --p-elevado claro = paper-warm + 45% branco', /--p-elevado: color-mix\(in srgb, var\(--paper-warm\), white 45%\)/.test(css));
check('CSS: --p-elevado escuro = paper-warm + 8% branco (2 blocos)', (css.match(/--p-elevado: color-mix\(in srgb, var\(--paper-warm\), white 8%\)/g) || []).length === 2);
check('CSS: hover do botão = --brand-fill-hover (claro e escuro)', /--p-botao-hover: var\(--brand-fill-hover\)/.test(css));
check('CSS: dark não redefine mais o hover do botão', !/--p-botao-hover: color-mix/.test(css));
check('CSS: texto do botão é --on-brand-fill (branco) nos dois temas', /--p-texto-botao: var\(--on-brand-fill\)/.test(css) && !/--p-texto-botao: var\(--on-seal-red\)/.test(css));
check('CSS: borda de campo = linha + 60% tinta suave', /--p-borda-campo: color-mix\(in srgb, var\(--p-linha\), var\(--p-tinta-suave\) 60%\)/.test(css));
check('CSS: alerta usa 14% da cor sobre o fundo', /color-mix\(in srgb, var\(--c\) 14%, var\(--p-bg\)\)/.test(require('fs').readFileSync(path.join(ROOT, 'shared/painel/painel-componentes.css'), 'utf8')));
for (const curso of ['fr', 'zh']){
  const P = paletaSite(ROOT, curso);
  for (const [tema, rot] of [['luz', 'claro'], ['esc', 'escuro']]){
    const s = P[tema], c = k => rgb(s[k]);
    const bg = c('--paper'), sup = c('--paper-warm'), linha = c('--paper-line'), tinta = c('--ink'), suave = c('--ink-soft');
    const marca = c('--brand-fill'), marcaEsc = c('--seal-red-dark'), sobreMarca = c('--on-brand-fill');
    const ok_ = c('--jade'), aviso = c('--grade-hard-bg'), erro = rgb(viaVar(s, s['--error-red'] || s['--grade-again-bg'])), info = c('--count-new'), vivo = c('--on-vivid');
    const elev = tema === 'luz' ? mix(sup, BRANCO, .55) : mix(sup, BRANCO, .92);   // = --p-elevado
    const textoBotao = sobreMarca;                                                    // = --p-texto-botao (branco nos dois temas, 2026-10-19)
    const marcaHover = c('--brand-fill-hover');                                       // = --p-botao-hover
    const T = (nome, fg, bgc, min = 4.5) => { const r = razao(fg, bgc); check(`${curso} ${rot}: ${nome} ${r.toFixed(2)}:1 (mín ${min})`, r >= min, r.toFixed(2)); };
    T('texto principal em fundo', tinta, bg); T('texto principal em bloco', tinta, sup); T('texto principal em campo', tinta, elev);
    T('texto secundário em fundo', suave, bg); T('texto secundário em bloco', suave, sup); T('placeholder em campo', suave, elev);
    T('link (marca escura) em fundo', marcaEsc, bg); T('link (marca escura) em bloco', marcaEsc, sup);
    // Decisão da autora: botão primário igual ao do Ranking (branco sobre o azul). No francês claro dá 3,2:1, abaixo do AA (4,5),
    // então ali o piso é 3 (vale para texto grande/negrito) e o número real aparece no nome do check.
    const minBotao = 4.5;   // 2026-10-19: --brand-fill (azul #2879B3 / vermelho #C0231F) com branco passa o AA nos dois temas, sem exceção
    T('botão primário' + (minBotao === 3 ? ' (exceção da autora, igual ao Ranking)' : ''), textoBotao, marca, minBotao);
    T('botão primário em hover' + (minBotao === 3 ? ' (exceção da autora)' : ''), textoBotao, marcaHover, minBotao);
    // balão enviado: texto sempre branco; no escuro o fundo é a cor do curso a 55% sobre preto (--p-balao-enviada)
    const balao = tema === 'luz' ? marca : mix(marca, [0, 0, 0], .55);
    T('balão enviado (texto branco)' + (minBotao === 3 ? ' (exceção da autora, igual ao Ranking)' : ''), BRANCO, balao, minBotao);
    T('botão secundário e contorno (pílula bege)', suave, elev); T('botão secundário em hover', tinta, linha);
    T('botão contraste', bg, tinta); T('dica (tooltip)', bg, tinta);
    T('selo ok', vivo, ok_); T('selo aviso', vivo, aviso); T('selo erro', vivo, erro); T('selo info', vivo, info); T('selo neutro', tinta, linha);
    if (tema === 'luz') T('avatar (iniciais)', bg, marcaEsc); else T('avatar (iniciais)', tinta, elev);
    for (const [nome, cor] of [['aviso', aviso], ['ok', ok_], ['erro', erro], ['info', info]]) T(`texto em alerta ${nome}`, tinta, mix(cor, bg, .14));
    // elementos de interface (WCAG 1.4.11, mínimo 3:1)
    const borda = mix(suave, linha, .60);                                            // = --p-borda-campo
    const U = (nome, a, b) => { const r = razao(a, b); check(`${curso} ${rot}: ${nome} ${r.toFixed(2)}:1 (mín 3)`, r >= 3, r.toFixed(2)); };
    U('anel de foco (marca escura) vs fundo', marcaEsc, bg);
    U('preenchimento da barra (marca escura) vs trilho', marcaEsc, linha);
    U('interruptor ligado (marca escura) vs fundo', marcaEsc, bg);
    U('interruptor desligado (borda de campo) vs fundo', borda, bg);
    U('borda de campo vs campo', borda, elev); U('borda de campo vs fundo', borda, bg);
  }
}
console.log(`contraste: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
