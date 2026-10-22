// Caixas de cor da marca (decisão da autora, 2026-10-19): toda caixa com texto na cor da marca usa --brand-fill (azul #2879B3 no fr,
// vermelho #C0231F no zh) com texto branco, nos dois temas. Varre as telas do app (fr e zh, claro e escuro) e confere:
//  1) todo elemento visível com fundo --brand-fill tem texto branco e contraste >= 4,5:1;
//  2) nenhum elemento com texto fica no azul/vermelho vivo antigo (--seal-red) nem no azul profundo fixo #1D5A82 como caixa.
const { abrir } = require('../painel-alunos/harness.js');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const TABS = ['path', 'review', 'conjugaison', 'challenges', 'profile', 'leaderboard', 'settings', 'teacher-panel', 'admin-badges'];
(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]) {
    const h = await abrir({ lang, scheme }); const p = h.page; let boxes = 0; const sobras = [], fracos = [];
    const brand = await p.evaluate(() => { const d = document.createElement('i'); d.style.background = 'var(--brand-fill)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
    L(`${lang} ${scheme}: --brand-fill definido`, /^rgb\(/.test(brand), brand);
    const tabs = lang === 'zh' ? TABS.filter(t => t !== 'conjugaison') : TABS;
    for (const tab of tabs) {
      await p.evaluate(t => { try { switchTab(t); } catch (e) {} }, tab).catch(() => {}); await p.waitForTimeout(400);
      const r = await p.evaluate(([brand]) => {
        const out = { boxes: 0, sobras: [], fracos: [] };
        const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
        const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
        const rz = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const B = parse(brand), vivos = []; const mk = (n) => { const d = document.createElement('i'); d.style.background = n; document.body.appendChild(d); const c = parse(getComputedStyle(d).backgroundColor); d.remove(); return c; };
        const vivo = mk('var(--seal-red)'), prof = mk('#1D5A82'); const eq = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b && a.a > .95;
        document.querySelectorAll('body *').forEach(e => {
          const r = e.getBoundingClientRect(); if (r.width < 14 || r.height < 14) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const bg = parse(cs.backgroundColor); if (!bg || bg.a < .95) return;
          const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); const txt = own || (e.children.length === 0 && (e.textContent || '').trim());
          if (!txt) return; const fg = parse(cs.color); const nome = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
          if (eq(bg, B)) { out.boxes++; if (!(fg.r === 255 && fg.g === 255 && fg.b === 255) || rz(fg, bg) < 4.5) out.fracos.push(nome + ' ' + cs.color); }
          else if (eq(bg, vivo) || eq(bg, prof)) out.sobras.push(nome + ' ' + cs.backgroundColor + '/' + cs.color);
        });
        return out;
      }, [brand]);
      boxes += r.boxes; sobras.push(...r.sobras.map(s => tab + ': ' + s)); fracos.push(...r.fracos.map(s => tab + ': ' + s));
    }
    L(`${lang} ${scheme}: há caixas na cor da marca nas telas varridas (${boxes})`, boxes > 0, boxes);
    L(`${lang} ${scheme}: toda caixa da marca tem texto branco e contraste >= 4,5:1`, fracos.length === 0, [...new Set(fracos)].slice(0, 8));
    L(`${lang} ${scheme}: nenhuma caixa com texto no azul/vermelho vivo antigo nem no azul profundo fixo`, sobras.length === 0, [...new Set(sobras)].slice(0, 8));
    L(`${lang} ${scheme}: sem erros de JS`, h.errors.length === 0, h.errors); await h.close();
  }
  console.log(`cores-marca: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
