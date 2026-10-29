// Botões de nota da Revisão e do Banco (decisão da autora, 2026-10-28): cores FIXAS, iguais nos dois temas e nos dois idiomas, texto branco:
// Errei #D62619, Difícil #C9973A (amarelo exato da Revisão no escuro; branco dá 2,6:1, escolha da autora), Bom #2879B3, Fácil #3A7359.
const { abrir } = require('../painel-alunos/harness.js');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const COR = { again: 'rgb(214, 38, 25)', hard: 'rgb(201, 151, 58)', good: 'rgb(40, 121, 179)', easy: 'rgb(58, 115, 89)' };
const PECAS = [
  ['Revisão: Errei', 'grade-again', 'again'], ['Revisão: Difícil', 'grade-hard', 'hard'], ['Revisão: Bom', 'grade-good', 'good'], ['Revisão: Fácil', 'grade-easy', 'easy'],
  ['Banco: Não lembrei', 'rb-big is-bad', 'again'], ['Banco: Difícil', 'rb-big is-help', 'hard'], ['Banco: Bom', 'rb-big is-good', 'good'], ['Banco: Fácil', 'rb-big is-ok', 'easy'],
];
(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]) {
    const h = await abrir({ lang, scheme }); const p = h.page;
    for (const [nome, cls, k] of PECAS) {
      const r = await p.evaluate((cls) => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:5px;left:5px;z-index:99999'; d.innerHTML = '<button class="' + cls + '" id="t-ok">Teste</button>'; document.body.appendChild(d);
        const cs = getComputedStyle(document.getElementById('t-ok')); const o = { bg: cs.backgroundColor, fg: cs.color }; d.remove(); return o; }, cls);
      L(`${lang} ${scheme}: ${nome}: fundo fixo e texto branco`, r.bg === COR[k] && r.fg === 'rgb(255, 255, 255)', r);
    }
    L(`${lang} ${scheme}: sem erros de JS`, h.errors.length === 0, h.errors); await h.close();
  }
  console.log(`cores-marca notas: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
