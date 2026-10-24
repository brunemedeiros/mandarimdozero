// Paridade, etapa 5d: capturas de tela de uma árvore (antes ou depois), para comparar pixel a pixel com
// tests/e4/comparar-capturas.js (tolerância 0). Mesma sequência do teste de equivalência
// (tests/paridade-sites/quase-iguais-harness.js): trilha (lista e Mapa), lição em cada tipo de passo e de exercício (com a
// devolutiva certa/errada), diálogo e "Você entendeu?", gramática (fr), Frase completa e Manual (zh), Revisão (cada tipo
// de cartão, frente e verso), Revisão rápida, Combinar, Perfil, Progresso e Configurações; fr e zh, claro e escuro, 390 e
// 1200px. A foto é tirada na PRIMEIRA vez que cada "tipo de tela" aparece (assinatura pela classe dos elementos), com
// limite por rodada.
// Uso: node tests/paridade-sites/capturas_quase_iguais.js <árvore> <pasta-de-saída> [sites=fr,zh] [temas=light,dark] [larguras=390,1200]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path');
const H = require('./quase-iguais-harness.js');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/capturas-5d');
const SITES = (process.argv[4] || 'fr,zh').split(','), TEMAS = (process.argv[5] || 'light,dark').split(','), LARG = (process.argv[6] || '390,1200').split(',').map(Number);
const LIMITE = Number(process.env.LIMITE || 45); // telas de lição/revisão por rodada (as telas com nome fixo não contam)
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let total = 0;
  for (const site of SITES) for (const theme of TEMAS) for (const width of LARG){
    const vistos = new Set(); let n = 0;
    const onCena = async (nome, page, idx) => {
      const fixa = /^(trilha_zerada|trilha_mapa|trilha_depois_A1-1$|trilha_depois_1$|revisao_|perfil|progresso|config|cartao_self:)/.test(nome);
      if (!fixa && n >= LIMITE) return;
      const chave = await page.evaluate((nome) => {
        const v = [...document.querySelectorAll('.view.active')].map(x => x.id).join(',');
        const modal = [...document.querySelectorAll('.modal, [id$="-modal"]')].filter(m => __vis(m)).map(m => m.id).join(',');
        const sc = ['#step-content', '#review-content', '#speed-review-content', '#match-review-content'].map(s => document.querySelector(s)).find(e => e && __vis(e));
        const sig = sc ? [...sc.querySelectorAll('[class]')].filter(e => __vis(e)).slice(0, 8).map(e => String(e.className).split(' ')[0]).join('.') : '';
        const fb = document.querySelector('.wrong-feedback, .correct-feedback, .feedback-card');
        return [v, modal, sig, fb && __vis(fb) ? fb.className.split(' ')[0] : '', /^(trilha|revisao|perfil|progresso|config|cartao_self)/.test(nome) ? nome : ''].join('|');
      }, nome);
      if (vistos.has(chave)) return;
      vistos.add(chave); if (!fixa) n++;
      await page.clock.runFor(50);
      const buf = await page.screenshot({ fullPage: true });
      const arq = `${site}-${theme}-${width}-${String(idx).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(OUT, arq), buf);
      fs.appendFileSync(path.join(OUT, 'indice.txt'), `${arq}\t${nome.slice(0, 120)}\n`);
      total++;
    };
    const r = await H.sequencia(browser, ROOT, site, 'pt-BR', { width, theme, onCena, maxLicoes: 4, maxRevisao: 60 });
    console.log(`${site} ${theme} ${width}: ${n} capturas (${r.cenas.length} cenas, ${r.errors.length} erros de página)`);
  }
  await browser.close();
  console.log(total + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
