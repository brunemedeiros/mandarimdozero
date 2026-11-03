// Peças pequenas na cor da marca (decisão de 2026-10-19; achadas em 2026-10-27): --brand-fill com texto branco nos dois temas
// (no escuro o verde claro do tema não aguenta branco: 2,5:1). Monta cada peça no app real (fr e zh) e confere fundo, texto e contraste.
const { abrir } = require('../painel-alunos/harness.js');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const PECAS = [
  ['check do dia no plano de estudos', '<button class="wizard-day-chip active"><span class="wizard-day-check" id="t-ok">✓</span></button>'],
];
(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]) {
    const h = await abrir({ lang, scheme }); const p = h.page;
    for (const [nome, html, so] of PECAS) {
      if (so && so !== lang) continue;
      const r = await p.evaluate((html) => {
        document.querySelectorAll('#t-box').forEach(e => e.remove());
        const box = document.createElement('div'); box.id = 't-box'; box.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999;background:var(--paper);padding:20px'; box.innerHTML = html; document.body.appendChild(box);
        const e = document.getElementById('t-ok'); if (!e) return null; const cs = getComputedStyle(e);
        const P = s => s.match(/[\d.]+/g).map(Number); const l = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const bg = cs.backgroundColor, fg = cs.color; const a = l(P(bg)), c = l(P(fg)); box.remove();
        return { bg, fg, c: +((Math.max(a, c) + .05) / (Math.min(a, c) + .05)).toFixed(2) };
      }, html).catch(() => null);
      L(`${lang} ${scheme}: ${nome}: cor da marca com branco, contraste >= 4,5:1`, r && r.bg === (lang === 'fr' ? 'rgb(40, 121, 179)' : 'rgb(192, 35, 31)') && r.fg === 'rgb(255, 255, 255)' && r.c >= 4.5, r);
    }
    L(`${lang} ${scheme}: sem erros de JS`, h.errors.length === 0, h.errors); await h.close();
  }
  console.log(`cores-marca peças da marca: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
