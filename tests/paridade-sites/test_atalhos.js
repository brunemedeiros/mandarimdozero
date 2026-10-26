// Paridade 5d, parte 8 (docs/historico/30-paridade-quase-iguais.md): o "Voltar"/"Continuar" da lição e os atalhos de teclado
// (1-4, Enter, r) passaram para shared/core/app-comum.js. O teste de equivalência clica nos botões; este usa o TECLADO e o
// "Voltar", na árvore de REF (main antes da etapa, worktree temporário) e nesta, nos dois sites, e compara a tela e o estado
// depois de cada tecla.
// Rodar: node tests/paridade-sites/test_atalhos.js   (REF padrão 2e229930; PARIDADE_5D_REF=<commit>)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const H = require('./quase-iguais-harness.js');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5D_REF || '2e229930';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 900) : ''); } };

async function rodar(browser, root, site){
  const server = H.serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { ctx, page, errors } = await H.abrir(browser, server.address().port, site, { lang: 'pt-BR' });
  const cenas = [];
  const foto = async (n) => cenas.push([n, (await page.evaluate(() => document.getElementById('unit-detail-wrap').innerHTML + '|' + JSON.stringify(__estado()))).replace(/127\.0\.0\.1:\d+/g, 'HOST')
    /* Etapa 6 (2026-10-26, decisão da dona): o último cartão de palavra diz "Continuar →" em vez de "Ver o que você aprendeu →" */
    .split('Ver o que você aprendeu →').join('Continuar →')
    /* Etapa 6: XP só com ⭐ (o ⚡ ficou só no Combo); a troca vale para as duas árvores, então só iguala o ícone */
    .split('fluent/26a1.svg&quot;);">⚡').join('fluent/2b50.svg&quot;);">⭐').replace(/style="([^"]*)"/g, (m, c) => 'style="' + c.replace(/:\s+/g, ':') + '"'),
    // Etapa 6: janela da sequência aberta nesta cena (os avisos "+N XP" somem quando ela abre; ver a comparação abaixo)
    await page.evaluate(() => { const o = document.getElementById('streak-modal-overlay'); return !!o && getComputedStyle(o).display !== 'none'; })]);
  const tecla = async (k) => { await page.keyboard.press(k); await page.clock.runFor(1200); await foto('tecla ' + k); };
  await page.evaluate(() => { switchTab('path'); openUnitDetail(UNITS[0].id); }); await page.clock.runFor(1200); await foto('abre');
  // introdução: Enter avança palavra a palavra; Voltar recua
  await tecla('Enter'); await tecla('Enter');
  await page.evaluate(() => document.getElementById('step-back-btn').click()); await page.clock.runFor(1200); await foto('voltar');
  for (let i = 0; i < 40; i++){
    const k = ['Enter', '1', '2', 'r', '3', 'Enter', '4', 'Enter'][i % 8];
    await tecla(k);
  }
  await ctx.close(); server.close();
  return { cenas, errors };
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5d-atalhos-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    for (const site of ['fr', 'zh']){
      const a = await rodar(browser, wt, site), b = await rodar(browser, ROOT, site);
      check(`${site}: mesmos erros de página`, JSON.stringify(a.errors) === JSON.stringify(b.errors), [a.errors, b.errors]);
      let iguais = 0;
      // Etapa 6 (decisão da dona, 2026-10-26): a janela da sequência abre depois do Continuar e limpa os avisos "+N XP" que
      // estavam na tela; nessa cena, a árvore nova pode diferir da antiga só no campo "toast".
      const semToast = (x) => String(x).replace(/"toast":"[^"]*"/, '"toast":""');
      a.cenas.forEach(([n, v], i) => { const ok = b.cenas[i] && (b.cenas[i][1] === v || (b.cenas[i][2] && semToast(b.cenas[i][1]) === semToast(v))); if (ok) iguais++; check(`${site}: ${i} ${n} igual`, ok); });
      if (process.env.DUMP) a.cenas.forEach(([n, v], i) => { const w = b.cenas[i] && b.cenas[i][1]; if (w !== v){ let k = 0; while (v[k] === w[k]) k++; console.log('DIFF', site, i, JSON.stringify(v.slice(Math.max(0,k-200), k+300)), JSON.stringify(String(w).slice(Math.max(0,k-200), k+300))); } });
      const distintas = new Set(b.cenas.map(c => c[1])).size;
      check(`${site}: as teclas mudaram a tela (${distintas} telas diferentes)`, distintas > 10, distintas);
      console.log(`  ${site}: ${iguais}/${a.cenas.length} cenas iguais, ${distintas} telas diferentes`);
    }
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`atalhos de teclado e Voltar (antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
