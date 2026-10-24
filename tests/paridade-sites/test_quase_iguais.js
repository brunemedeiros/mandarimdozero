// Paridade, etapa 5d (docs/historico/30-paridade-quase-iguais.md): prova de equivalência das funções que saíram do
// fr/app.js e do zh/app.js para shared/core/. Roda a mesma sequência (tests/paridade-sites/quase-iguais-harness.js) na
// árvore de REF (main antes da etapa, num worktree temporário) e nesta árvore, nos DOIS sites, com o site em pt-BR
// (sequência inteira) e em inglês (sequência curta), e compara cena a cena: HTML da tela, estado salvo (hash do
// serializeState), XP, contadores do dia, missões, ponteiros da lição e os áudios pedidos (arquivo e velocidade).
// Rodar: node tests/paridade-sites/test_quase_iguais.js   (REF padrão 2e229930; PARIDADE_5D_REF=<commit> para outro;
//        SITES=fr ou SITES=zh para um só)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const H = require('./quase-iguais-harness.js');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5D_REF || '2e229930';
const SITES = (process.env.SITES || 'fr,zh').split(',');
// 1) "Ver resultado" da unidade de gramática depois de um Ponto de verificação com erros (lessonRecapItems sem vocab).
// (A outra correção, a tradução da lacuna da Revisão escapada no fr, não muda nada nas cenas: o conteúdo de teste não
// tem HTML. As duas são conferidas em tests/paridade-sites/test_correcoes_5d.js.)
const CORRECOES = [
  ['shared/core/exercicios-licao.js', '    .map(i => u.vocab[i])\n', '    .map(i => (u.vocab || [])[i])\n'],
];
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 900) : ''); } };

function comparar(rotulo, antes, depois){
  check(`${rotulo}: a sequência rodou (${antes.cenas.length} cenas)`, antes.cenas.length > 100, antes.cenas.length);
  check(`${rotulo}: mesmos erros de página antes e depois`, JSON.stringify(antes.errors) === JSON.stringify(depois.errors), { antes: antes.errors.slice(0, 3), depois: depois.errors.slice(0, 3) });
  check(`${rotulo}: mesmo número de cenas`, antes.cenas.length === depois.cenas.length, [antes.cenas.length, depois.cenas.length]);
  let iguais = 0, mostradas = 0;
  const n = Math.min(antes.cenas.length, depois.cenas.length);
  for (let i = 0; i < n; i++){
    const a = antes.cenas[i], b = depois.cenas[i];
    if (a.n === b.n && a.v === b.v){ iguais++; continue; }
    if (mostradas++ < 3){
      let j = 0; while (j < a.v.length && a.v[j] === b.v[j]) j++;
      check(`${rotulo}: cena ${i} igual (${a.n})`, false, { depoisNome: b.n, antes: a.v.slice(Math.max(0, j - 150), j + 250), depois: b.v.slice(Math.max(0, j - 150), j + 250) });
    } else failed++;
  }
  passed += iguais;
  console.log(`  ${rotulo}: ${iguais}/${antes.cenas.length} cenas iguais`);
  return iguais;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const resumo = [];
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5d-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    // Correções de bug feitas de propósito na etapa (docs/historico/30-paridade-quase-iguais.md): aplicadas também na REF,
    // para a comparação provar que todo o resto continua igual.
    for (const [arq, de, para] of CORRECOES){
      const f = path.join(wt, arq), txt = fs.readFileSync(f, 'utf8');
      if (!txt.includes(de)) throw new Error('correção não aplicável na REF: ' + arq);
      fs.writeFileSync(f, txt.replace(de, para));
    }
    for (const site of SITES){
      for (const [lang, opts] of [['pt-BR', {}], ['en', { maxLicoes: 2, maxRevisao: 40 }]]){
        const antes = await H.sequencia(browser, wt, site, lang, opts);
        const depois = await H.sequencia(browser, ROOT, site, lang, opts);
        const r = `${site} ${lang}`;
        const ig = comparar(r, antes, depois);
        resumo.push(`${r}: ${ig}/${antes.cenas.length}`);
        if (process.env.DUMP) fs.writeFileSync(path.join(process.env.DUMP, `${site}-${lang}.json`), JSON.stringify({ antes, depois }));
      }
    }
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log('cenas iguais: ' + resumo.join('; '));
  console.log(`quase iguais (antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
