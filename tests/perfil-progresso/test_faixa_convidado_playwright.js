// Faixa do modo convidado (Perfil > Progresso e Perfil > Visão geral), conserto de 2026-11-10:
//  1) a frase é um bloco só: o "não"/"not" em negrito fica a um espaço normal das palavras vizinhas
//     (antes, texto e <strong> viravam itens do flex e ganhavam 10px de gap de cada lado);
//  2) o botão "Entrar com Google para salvar" usa --brand-fill com --on-brand-fill (branco) e contraste >= 4,5:1
//     nos dois temas (antes, no escuro, era letra dourada clara sobre fundo claro).
// fr/zh x claro/escuro x 390/1280px x pt-BR/en; capturas em tests/perfil-progresso/capturas/ (fora do git).
// Rodar: node tests/perfil-progresso/test_faixa_convidado_playwright.js
const { abrir } = require('../painel-alunos/harness.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const medir = (p, sel) => p.evaluate((sel) => {
  const box = document.querySelector(sel); if (!box || !box.getBoundingClientRect().width) return { existe: false };
  const strong = box.querySelector('strong'), btn = box.querySelector('.guest-warning-link');
  // distância entre o fim da palavra antes do <strong> e o começo dele (e do fim dele até a palavra seguinte)
  const gaps = [];
  if (strong){
    const rs = strong.getBoundingClientRect();
    const antes = strong.previousSibling, depois = strong.nextSibling;
    const rangeFim = (n) => { const r = document.createRange(); const t = n.textContent.replace(/\s+$/, ''); r.setStart(n, t.length - 1); r.setEnd(n, t.length); return r.getBoundingClientRect(); };
    const rangeIni = (n) => { const t = n.textContent; const i = t.search(/\S/); const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); return r.getBoundingClientRect(); };
    if (antes && antes.nodeType === 3){ const a = rangeFim(antes); if (Math.abs(a.top - rs.top) < 6) gaps.push(Math.round(rs.left - a.right)); }
    if (depois && depois.nodeType === 3){ const d = rangeIni(depois); if (Math.abs(d.top - rs.top) < 6) gaps.push(Math.round(d.left - rs.right)); }
  }
  const parse = s => s.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const cs = getComputedStyle(btn), fg = parse(cs.color), bg = parse(cs.backgroundColor);
  const contraste = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05);
  const ref = document.createElement('i'); ref.style.background = 'var(--brand-fill)'; document.body.appendChild(ref);
  const brand = getComputedStyle(ref).backgroundColor; ref.remove();
  return { existe: true, temStrong: !!strong, gaps, contraste: +contraste.toFixed(2), corBotao: cs.backgroundColor, brand, textoBranco: cs.color === 'rgb(255, 255, 255)' };
}, sel);
(async () => {
  for (const lang of ['fr', 'zh']) for (const scheme of ['light', 'dark']) for (const width of [390, 1280]) for (const ui of ['pt-BR', 'en']) {
    const tag = `${lang} ${scheme} ${width}px ${ui}`;
    const h = await abrir({ lang, scheme, width, height: 850 }); const p = h.page;
    // Idioma do site: gravado no navegador e a página recarregada (o app volta como convidado, guest_mode do harness).
    if (ui === 'en'){
      await p.evaluate(() => localStorage.setItem('ui-language', 'en'));
      await p.reload();
      await p.waitForFunction(() => typeof switchTab === 'function' && typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 20000 });
    }
    const idioma = await p.evaluate(() => { CURRENT_USER = false; return document.documentElement.lang || ''; }); // convidado
    L(`${tag}: idioma do site certo (${idioma})`, ui === 'en' ? /^en/.test(idioma) : /^pt/.test(idioma), idioma);
    for (const [aba, sel] of [['progress', '#view-progress .guest-warning'], ['profile', '#view-profile .guest-warning']]) {
      await p.evaluate(async (aba) => { switchTab(aba); if (aba === 'profile' && typeof renderProfileView === 'function') await renderProfileView(); }, aba);
      await p.waitForTimeout(500);
      const m = await medir(p, sel);
      L(`${tag} ${aba}: faixa de convidado aparece`, m.existe, m);
      if (!m.existe) continue;
      if (m.temStrong) L(`${tag} ${aba}: o negrito fica a um espaço normal das palavras (< 7px)`, m.gaps.length > 0 && m.gaps.every(g => g >= 0 && g < 7), m.gaps);
      L(`${tag} ${aba}: botão na cor da marca com texto branco`, m.corBotao === m.brand && m.textoBranco, m);
      L(`${tag} ${aba}: contraste do botão >= 4,5:1`, m.contraste >= 4.5, m.contraste);
      if (width === 390 && ui === 'pt-BR') { const el = await p.$(sel); await el.screenshot({ path: path.join(OUT, `faixa-${aba}-${lang}-${scheme}.png`) }); }
    }
    L(`${tag}: sem erros de JS`, h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`\n${ok}/${ok + bad} checks`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
