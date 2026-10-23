// Caixas de sucesso com texto/check (decisão da autora, 2026-10-22): verde --success-fill com texto branco --on-success-fill nos dois temas
// (no escuro o verde claro do tema não aguenta branco: 2,5:1). Monta cada peça no app real (fr e zh) e confere fundo, texto e contraste.
const { abrir } = require('../painel-alunos/harness.js');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const PECAS = [
  ['Continuar do acerto', '<button class="btn btn-primary correct-feedback-continue" id="t-ok">Continuar →</button>'],
  ['check da unidade', '<span class="unit-skill-check" id="t-ok">✓</span>'],
  ['check do módulo (só fr)', '<span class="module-skill-check" id="t-ok">✓</span>', 'fr'],
  ['bolinha de lição feita', '<span class="ub-lesson-dot done" id="t-ok">✓</span>'],
  ['dia da sequência', '<div class="streak-day-item done"><div class="streak-day-circle" id="t-ok">✓</div></div>'],
  ['check da semana', '<span class="week-check is-done" id="t-ok">✓</span>'],
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
      L(`${lang} ${scheme}: ${nome}: verde #3A7359 com branco, contraste >= 4,5:1`, r && r.bg === 'rgb(58, 115, 89)' && r.fg === 'rgb(255, 255, 255)' && r.c >= 4.5, r);
    }
    L(`${lang} ${scheme}: sem erros de JS`, h.errors.length === 0, h.errors); await h.close();
  }
  console.log(`cores-marca verde: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
