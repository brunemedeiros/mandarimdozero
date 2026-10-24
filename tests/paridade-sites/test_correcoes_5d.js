// Paridade 5d (docs/historico/30-paridade-quase-iguais.md): as duas correções de bug feitas de propósito na etapa, conferidas
// no navegador, na árvore de REF (main antes da etapa, worktree temporário: o bug aparece) e nesta (corrigido), no fr:
// 1) "Ver resultado" da unidade de gramática não fazia nada depois de um Ponto de verificação com erros na mesma sessão
//    (lessonRecapItems lia u.vocab de uma unidade sem vocabulário e a tela quebrava com TypeError);
// 2) a tradução da lacuna na Revisão (cartão de professora/próprio) entrava sem escapeHTML no fr.
// Rodar: node tests/paridade-sites/test_correcoes_5d.js   (REF padrão 2e229930; PARIDADE_5D_REF=<commit>)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const H = require('./quase-iguais-harness.js');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5D_REF || '2e229930';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

async function rodar(browser, root){
  const server = H.serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { ctx, page } = await H.abrir(browser, server.address().port, 'fr', { lang: 'pt-BR' });
  const r = await page.evaluate(() => {
    const out = {};
    // 1) erros de um Ponto de verificação anterior + unidade de gramática terminando
    const gram = UNITS.find(u => u.type === 'grammar');
    STEP_STATE.checkpointMisses = { 0: 2, 1: 1, 2: 1 };
    try { out.recap = JSON.stringify(lessonRecapItems(gram, null)); } catch (e) { out.recap = 'ERRO ' + e.constructor.name; }
    STATE.currentUnitId = gram.id;
    try { renderLessonCompleteScreen(gram, null, { challengesBefore: null, xpEarned: 3, scorePct: 80, trackHistory: false }); out.tela = /lesson-complete|Parabéns|parab/i.test(document.getElementById('step-content').innerHTML); }
    catch (e) { out.tela = 'ERRO ' + e.constructor.name; }
    // 2) tradução da lacuna com HTML
    const F = (id, v) => ({ id, lang: null, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
    const [card] = buildCardFromSelfFlashcard({ id: 9901, language_app_key: APP_KEY, status: 'active', revision: 0, owner_id: 'U', front: 'x', back_trans: 'y',
      front_is_target_language: true, card_generation_mode: 'cloze', fields: [F('a', 'Je {{c1::suis}} ici'), F('b', 'Eu <b>estou</b> aqui')] });
    const mount = document.createElement('div'); document.body.appendChild(mount);
    renderClozeCard(mount, card, { answered: true, wasCorrect: true, typedAnswer: 'suis' }, { onAnswered(){} });
    const tr = mount.querySelector('.cloze-trans');
    out.trans = tr ? tr.innerHTML : null;
    return out;
  });
  await ctx.close(); server.close();
  return r;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5d-corr-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    const antes = await rodar(browser, wt), depois = await rodar(browser, ROOT);
    console.log('  antes :', JSON.stringify(antes));
    console.log('  depois:', JSON.stringify(depois));
    check('antes: o bug da gramática existia (TypeError)', antes.recap === 'ERRO TypeError' && antes.tela === 'ERRO TypeError', antes);
    check('depois: sem erro, recapitulação vazia e a tela de resultado aparece', depois.recap === '[]' && depois.tela === true, depois);
    check('antes: a tradução da lacuna entrava como HTML', antes.trans === 'Eu <b>estou</b> aqui', antes.trans);
    check('depois: a tradução da lacuna sai escapada (texto)', depois.trans === 'Eu &lt;b&gt;estou&lt;/b&gt; aqui', depois.trans);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`correções da etapa 5d: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
