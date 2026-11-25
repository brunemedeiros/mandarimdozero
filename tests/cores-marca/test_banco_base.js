// Base escura nos botões coloridos do Banco de Revisão (decisão da autora, 2026-11-25): sombra sólida de 3px embaixo, na própria cor misturada com
// preto (62%), igual nos dois temas e idiomas; ao apertar, desce 2px (base de 1px). Neutros (bege) ficam sem base.
const { abrir } = require('../painel-alunos/harness.js');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const PECAS = [['rb-btn rb-btn-blue', true], ['rb-btn rb-btn-ok', true], ['rb-big is-blue', true], ['rb-big is-ok', true], ['rb-big is-help', true], ['rb-big is-good', true], ['rb-big is-bad', true], ['rb-btn', false], ['rb-big', false]];
(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]) {
    const h = await abrir({ lang, scheme }); const p = h.page;
    for (const [cls, colorido] of PECAS) {
      const r = await p.evaluate((cls) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:5px;left:5px;z-index:99999'; d.innerHTML = '<button class="' + cls + '" id="t-b">Teste</button>'; document.body.appendChild(d);
        const b = document.getElementById('t-b'); const cs = getComputedStyle(b); const o = { bg: cs.backgroundColor, sombra: cs.boxShadow }; d.remove(); return o; }, cls);
      const mc = r.sombra.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\) 0px (\d+)px 0px/), mr = r.sombra.match(/rgb\((\d+), (\d+), (\d+)\) 0px (\d+)px 0px/), f = r.bg.match(/\d+/g).map(Number);
      const m = mc ? [0, mc[1] * 255, mc[2] * 255, mc[3] * 255, mc[4]] : mr;   // color-mix volta como color(srgb ...) com valores de 0 a 1
      if (colorido) L(`${lang} ${scheme}: ${cls}: base de 3px mais escura que o fundo`, !!m && +m[4] === 3 && [1, 2, 3].every(i => +m[i] < f[i - 1]) && [1, 2, 3].some(i => +m[i] < f[i - 1] * 0.7), r);
      else L(`${lang} ${scheme}: ${cls}: neutro sem base`, r.sombra === 'none', r);
    }
    L(`${lang} ${scheme}: sem erros de JS`, h.errors.length === 0, h.errors); await h.close();
  }
  console.log(`cores-marca banco base: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
