// Plano do CSS comum (docs/css-comum/plano.md), prova nº 1 de cada etapa: a LISTA DE REGRAS que o navegador montou
// (CSSOM), na ordem da cascata, tem que ser IDÊNTICA entre a árvore de referência (antes) e a de agora (depois).
// Mover um trecho do <style> para um .css de shared/ ligado no mesmo lugar não muda nada nessa lista; se mudar a ordem,
// tirar ou alterar uma regra, este teste mostra onde. O nome do arquivo de onde a regra veio é ignorado de propósito.
//
// Rodar: node tests/css-comum/test_cascata.js
//   REF padrão: origin/main (a versão publicada). Outra referência: CSS_COMUM_REF=<commit ou branch>.
//   Sites: todos os que têm index.html e app.js (hoje fr e zh).
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const H = require('../paridade-sites/quase-iguais-harness.js');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.CSS_COMUM_REF || 'origin/main';
const SITES = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'index.html')) && fs.existsSync(path.join(ROOT, d, 'app.js')));
let ok = 0, bad = 0;
const check = (nome, cond, info) => { if (cond) ok++; else { bad++; console.log('  FALHOU:', nome, info === undefined ? '' : info); } };

// Regras na ordem da cascata: folhas na ordem do documento, @media/@supports por dentro, @keyframes e @font-face inteiros.
const COLETAR = () => {
  const out = []; let fora = 0;
  const norm = (t) => t.replace(/\s+/g, ' ').trim();
  const walk = (rules, ctx) => {
    for (const r of rules){
      if (r.type === 1) out.push(ctx + norm(r.cssText));
      else if (r.cssRules && (r.type === 4 || r.type === 12)) walk(r.cssRules, ctx + '@' + (r.conditionText || (r.media && r.media.mediaText)) + ' » ');
      else out.push(ctx + norm(r.cssText));
    }
  };
  for (const sh of document.styleSheets){
    let rules; try { rules = sh.cssRules; } catch (e) { fora++; continue; }
    walk(rules, '');
  }
  return { regras: out, fora };
};

async function coletar(browser, root, site){
  const server = H.serve(root); await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const { ctx, page, errors } = await H.abrir(browser, server.address().port, site, { width: 1200 });
    const r = await page.evaluate(COLETAR);
    await ctx.close();
    return Object.assign(r, { errors });
  } finally { server.close(); }
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'css-comum-ref-'));
  execFileSync('git', ['-C', ROOT, 'worktree', 'add', '--detach', '-f', tmp, REF], { stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const site of SITES){
      if (!fs.existsSync(path.join(tmp, site, 'index.html'))){ console.log(`  ${site}: não existe em ${REF}, pulado`); continue; }
      const antes = await coletar(browser, tmp, site), depois = await coletar(browser, ROOT, site);
      check(`${site}: página abre sem erro (antes e depois)`, !antes.errors.length && !depois.errors.length, JSON.stringify({ antes: antes.errors.slice(0, 2), depois: depois.errors.slice(0, 2) }));
      check(`${site}: nenhuma folha de estilo ilegível`, !antes.fora && !depois.fora, JSON.stringify({ antes: antes.fora, depois: depois.fora }));
      const A = antes.regras, B = depois.regras;
      let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
      const iguais = i === A.length && i === B.length;
      check(`${site}: mesmas ${A.length} regras na mesma ordem`, iguais,
        iguais ? '' : `\n    antes tem ${A.length}, depois tem ${B.length}; primeira diferença na regra nº ${i + 1}:\n    antes : ${(A[i] || '(acabou)').slice(0, 300)}\n    depois: ${(B[i] || '(acabou)').slice(0, 300)}`);
      console.log(`  ${site}: ${A.length} regras antes, ${B.length} depois`);
    }
  } finally {
    await browser.close();
    execFileSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', tmp], { stdio: 'ignore' });
  }
  console.log(`cascata do CSS (${REF} x agora): ${ok}/${ok + bad} verificações` + (bad ? '' : ' — OK'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
