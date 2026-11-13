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
const { etapa7 } = require('./etapa7-neutro.js'); // Etapa 7 (2026-10-31): vocabulário aprovado pela dona
const REF = process.env.PARIDADE_5D_REF || '2e229930';
const SITES = (process.env.SITES || 'fr,zh').split(',');
// 1) "Ver resultado" da unidade de gramática depois de um Ponto de verificação com erros (lessonRecapItems sem vocab).
// (A outra correção, a tradução da lacuna da Revisão escapada no fr, não muda nada nas cenas: o conteúdo de teste não
// tem HTML. As duas são conferidas em tests/paridade-sites/test_correcoes_5d.js.)
const CORRECOES = [
  ['shared/core/exercicios-licao.js', '    .map(i => u.vocab[i])\n', '    .map(i => (u.vocab || [])[i])\n'],
  // Reforço de "Errei" (2026-11-06, caso da Rachel; tests/banco-revisao-limites/): no máximo UM reforço por cartão na sessão (antes o cartão
  // voltava sem fim enquanto sobrassem 3 à frente). Mudança de propósito: a sequência clica "Errei" várias vezes e a árvore nova tem menos cenas.
  ['shared/core/revisao-decks.js', '    if (remaining >= 3) STATE.reviewQueue.push(card);\n',
    '    if (!STATE.reviewRequeued) STATE.reviewRequeued = {};\n    if (remaining >= 3 && !STATE.reviewRequeued[card.id]){ STATE.reviewQueue.push(card); STATE.reviewRequeued[card.id] = true; }\n'],
  ['shared/core/revisao-decks.js', '  STATE.reviewSessionStartedAt = Date.now();\n  STATE.reviewCardState = null;\n  renderReviewView();\n}',
    '  STATE.reviewSessionStartedAt = Date.now();\n  STATE.reviewCardState = null;\n  STATE.reviewRequeued = {};\n  renderReviewView();\n}'],
];
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 900) : ''); } };

// Mudanças de propósito da Etapa 6 (decisões da dona, 2026-10-26; docs/i18n/etapa6-boas-vindas-proposta.md, seção 7), iguais
// nas duas árvores para a comparação provar que o resto não mudou: o último cartão de palavra diz "Continuar →"; o XP usa
// ⭐ (o ⚡ ficou só no Combo); e a janela da sequência (agora depois do Continuar) limpa os avisos "+N XP" da tela, então
// numa cena a árvore nova pode ter a lista de avisos vazia onde a antiga ainda tinha avisos.
const ETAPA6 = (v) => etapa7(PROGRESSO_ORDEM(FAIXA_CONVIDADO(v))).split('Ver o que você aprendeu →').join('Continuar →').split('See what you learned →').join('Continue →')
  .replace(/26a1\.svg(&quot;\);\\?">)⚡/g, '2b50.svg$1⭐')
  // Recomeçar o curso (2026-10-30, migration 123): caixa nova e vazia (hidden) em Configurações > Geral, montada por shared/recomecar-curso.js.
  .replace(/<!-- Recomeçar este curso.*?-->(\\n|\n)\s*<article id=\\?"settings-restart-box\\?"[^>]*><\/article>(\\n|\n)\s*/g, '')
  // Lacuna dos cartões de completar sem os três tracinhos (2026-11-03, pedido da dona: a borda já é o sublinhado): a árvore nova
  // traz só um espaço dentro de <span class="cloze-blank">; a antiga trazia ___. Mesmo resto da cena.
  .replace(/(<span class=\\?"cloze-blank\\?" id=\\?"cloze-blank\\?">)&nbsp;(<\/span>)/g, '$1___$2')
  // Botão "‹ Voltar" dos cartões da professora (2026-11-04, PRs #436/#438; docs/historico/15-auditoria-banco-revisao.md):
  // syncReviewPrevRow cria a linha logo depois de #review-content em toda sessão da Revisão, VAZIA e escondida fora da sessão
  // da professora. Só a linha vazia e hidden sai; com o botão dentro a cena continua diferente.
  .replace(/<div id=\\?"review-prev-row\\?" class=\\?"review-prev-row\\?" hidden=\\?"\\?"><\/div>/g, '')
  // Aviso "esta lição ainda não está no idioma do site" saiu (2026-11-11, decisão da dona): unidade sem tradução nem aparece nem
  // abre. O elemento sai da árvore antiga; o resto da cena continua comparado.
  .replace(/(?:\\n|\n)\s*<p class=(\\*)"lesson-unit-goal\1" id=\1"ud-lang-notice\1"(?: hidden=\1"\1")? style=\1"font-style:\s*italic;\s*opacity:\s*\.8\1">[^<]*<\/p>/g, '')
  // Palavra dona do progresso no save (2026-11-11, defeito 1 da varredura; ver também quase-iguais-harness.js): só a árvore nova tem.
  .replace(/,(\\*)"variantWord\1":\1"[^"\\]*\1"/g, '');
// Faixa do modo convidado (conserto de 2026-11-10, pedido da dona): a frase ganhou um <span class="guest-warning-text"> em volta,
// para o "não" em negrito não ganhar o espaço do flex; e "username" virou "nome de usuário". Na comparação, a etiqueta sai das duas árvores; o texto continua comparado.
const FAIXA_CONVIDADO = (v) => v.replace(/<span class=\\?"guest-warning-text\\?">([\s\S]*?)<\/span>(?=(\\n|\n)\s*<button class=\\?"guest-warning-link)/g, '$1')
  .split('perfil salvo (username, bio)').join('perfil salvo (nome de usuário, bio)'); // texto da faixa do Perfil, aprovado pela dona
// Perfil > Progresso (decisão da dona, 2026-10-31): Conquistas saíram de cima dos números e foram para o fim da tela.
// Na árvore antiga, o bloco (título + grade) é movido para o fim; na nova, sai o comentário que explica a ordem.
// Assim a comparação continua provando que números, gráficos e conquistas têm o mesmo conteúdo.
const CONQ_INI = '<div data-i18n=\\"profile.sectionBadges\\"', STATS_INI = '<div class=\\"stat-cards\\"', NL4 = '\\n    ', FIM = '\\n  "}';
const PROGRESSO_ORDEM = (v) => {
  v = v.replace(/<!-- Conquistas no fim[\s\S]*?-->\\n\s*/, '');
  const i = v.indexOf(CONQ_INI), j = v.indexOf(STATS_INI), k = v.lastIndexOf(FIM);
  if (i < 0 || j < 0 || k < 0 || i > j) return v;
  const bloco = v.slice(i, j); // título + grade + quebra de linha antes dos números
  if (!bloco.endsWith(NL4)) return v;
  const resto = v.slice(0, i) + v.slice(j), k2 = resto.lastIndexOf(FIM);
  return resto.slice(0, k2) + NL4 + bloco.slice(0, -NL4.length) + resto.slice(k2);
};
const SEM_TOAST = (v) => v.replace(/\\?"toast\\?":\\?"[^"\\]*\\?"/, 'T');
const TOAST_VAZIO = /\\?"toast\\?":\\?"\\?"/;
const igualEtapa6 = (a, b) => { const x = ETAPA6(a), y = ETAPA6(b); return x === y || (TOAST_VAZIO.test(y) && SEM_TOAST(x) === SEM_TOAST(y)); };

function comparar(rotulo, antes, depois){
  check(`${rotulo}: a sequência rodou (${antes.cenas.length} cenas)`, antes.cenas.length > 100, antes.cenas.length);
  check(`${rotulo}: mesmos erros de página antes e depois`, JSON.stringify(antes.errors) === JSON.stringify(depois.errors), { antes: antes.errors.slice(0, 3), depois: depois.errors.slice(0, 3) });
  check(`${rotulo}: mesmo número de cenas`, antes.cenas.length === depois.cenas.length, [antes.cenas.length, depois.cenas.length]);
  let iguais = 0, mostradas = 0;
  const escondidas = [];
  const n = Math.min(antes.cenas.length, depois.cenas.length);
  for (let i = 0; i < n; i++){
    const a = antes.cenas[i], b = depois.cenas[i];
    if ((a.n === b.n || ETAPA6(a.n) === ETAPA6(b.n)) && (a.v === b.v || igualEtapa6(a.v, b.v))){ iguais++; continue; } // o nome da cena traz o texto do botão clicado
    if (mostradas++ < 3){
      // O trecho mostrado é a diferença que SOBRA depois das neutralizações (ETAPA6 nas duas árvores). Mostrar a primeira
      // diferença crua engana: ela costuma cair numa mudança já aprovada e neutralizada (caso de 2026-11-04: apontava para o
      // nome "Speed Review", e a diferença real era outra, mais adiante).
      const x = ETAPA6(a.v), y = ETAPA6(b.v);
      let j = 0; while (j < x.length && x[j] === y[j]) j++;
      check(`${rotulo}: cena ${i} igual (${a.n})`, false, { depoisNome: b.n, posicao: j, antesNeutro: x.slice(Math.max(0, j - 150), j + 250), depoisNeutro: y.slice(Math.max(0, j - 150), j + 250) });
    } else { failed++; escondidas.push(`${i} (${a.n})`); }
  }
  if (escondidas.length) console.log(`  ${rotulo}: mais ${escondidas.length} cena(s) diferente(s), sem trecho: ${escondidas.join(', ')}`);
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
