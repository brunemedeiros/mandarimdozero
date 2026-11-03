// Perfil > Progresso, cartões de números (#stat-cards): o ícone (.stat-card::before, absoluto à esquerda) não pode
// ficar por cima do número nem do rótulo. Bug achado em 2026-10-31: `#view-progress .stat-card{ padding:14px 16px }`
// (painel de números, commit 4d8618c2) vencia o `padding-left:64px` dos cartões com ícone (commit 2a78a0b6).
// Roda fr/zh x claro/escuro x 390px/1280px e salva capturas em tests/perfil-progresso/capturas/ (fora do git).
// Rodar: node tests/perfil-progresso/test_stat_cards_playwright.js
const { abrir } = require('../painel-alunos/harness.js');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'capturas'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
(async () => {
  for (const lang of ['fr', 'zh']) for (const scheme of ['light', 'dark']) for (const width of [390, 1280]) {
    const tag = `${lang} ${scheme} ${width}px`;
    const h = await abrir({ lang, scheme, width, height: 1000 }); const p = h.page;
    await p.evaluate(() => switchTab('progress')); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('#view-progress #stat-cards .stat-card')].filter(c => c.getBoundingClientRect().width > 0);
      const sobre = [];
      cards.forEach(c => {
        const cr = c.getBoundingClientRect(), b = getComputedStyle(c, '::before');
        if (b.content === 'none' || b.display === 'none') return;
        const iconRight = cr.left + parseFloat(b.left) + parseFloat(b.width);
        ['.num', '.label'].forEach(s => { const e = c.querySelector(s); if (!e) return;
          // mede o texto de verdade (Range), não a caixa do bloco
          const rg = document.createRange(); rg.selectNodeContents(e); const tr = rg.getBoundingClientRect();
          if (tr.width > 0 && tr.left < iconRight + 4) sobre.push(`${c.dataset.stat || '?'}${s} texto em ${Math.round(tr.left - cr.left)}px, ícone até ${Math.round(iconRight - cr.left)}px`);
          if (tr.right > cr.right + 1) sobre.push(`${c.dataset.stat || '?'}${s} passa da borda`); });
      });
      return { n: cards.length, sobre };
    });
    L(`${tag}: há cartões de números (${r.n})`, r.n >= 4, r.n);
    L(`${tag}: ícone não cobre número nem rótulo`, r.sobre.length === 0, r.sobre.slice(0, 6));
    const el = await p.$('#view-progress #stat-cards');
    await el.screenshot({ path: path.join(OUT, `${lang}-${scheme}-${width}.png`) });
    L(`${tag}: sem erros de JS`, h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`\n${ok}/${ok + bad} checks`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
