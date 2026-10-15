// Alinhamento vertical no guia de estilo: itens da barra de ferramentas e do menu com painéis devem ficar na mesma linha.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
(async () => {
  const b = await chromium.launch(); 
  for (const scheme of ['light', 'dark']) {
    const p = await (await b.newContext({ colorScheme: scheme, viewport: { width: 1000, height: 900 } })).newPage();
    await p.goto('file://' + path.resolve(__dirname, '../../shared/painel/guia-de-estilo.html'));
    const r = await p.evaluate(() => {
      const centro = e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
      const f = [...document.querySelectorAll('.p-ferramentas')][0];
      const nav = document.querySelector('.p-menunav');
      return { ferr: [...f.children].map(centro), menu: [nav.querySelector('summary'), nav.querySelector('a.p-menunav-link')].map(centro) };
    });
    const iguais = a => Math.max(...a) - Math.min(...a) < 1;
    L('barra de ferramentas: campo, seletor e interruptor no mesmo eixo (' + scheme + ')', iguais(r.ferr), r.ferr);
    L('menu com painéis: link simples no mesmo eixo dos itens com painel (' + scheme + ')', iguais(r.menu), r.menu);
  }
  await b.close();
  console.log(`painel-ds alinhamento: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})();
