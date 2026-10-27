# 25. Paridade C6: unidade de gramática e exercício de cenário em código comum (2026-10-23)

Plano: item C6 de `docs/auditoria-paridade-fr-zh.md`, etapa 3 do pedido da dona de 2026-10-23 ("mover para código
compartilhado tudo o que é geral e hoje vive só no `fr/app.js`, para o zh e os próximos sites herdarem"). Branch
`claude/friendly-hamilton-u4ssl2`. Continua `24-paridade-c2-c5-d6-licao.md`.
Grátis x Premium: tudo grátis (unidade da trilha e exercício de lição, como já eram no fr).

## O que foi para código comum

`shared/core/gramatica-cenario.js` (novo, carregado por `fr/index.html` e `zh/index.html` antes do `app.js`; o service worker
dos dois sites não lista arquivos, nada a mudar lá):

- Unidade de gramática (`type: "grammar"`): `isGrammarUnit`, `getStepDefsGrammar` (passos "Explicação" + "Exercícios"),
  `grammarStepFraction` (barra de progresso), `unitFinalScore` (nota final: exercícios da gramática ou da consolidação),
  `grammarShowBack`, `grammarStepBack`, `grammarStepNext` (Voltar/Continuar bloco a bloco), `renderGrammarUnitStep` (o desvio
  do `renderStep`), `renderGramTableHTML`, `renderGrammarExplanationStep`, `renderGrammarExerciseStep`.
- Exercício de cenário: `SCENARIO_FLAG_SVG`, `scenarioSceneHTML`, `buildScenarioExercise` (a regra da montagem que estava
  dentro do `buildExerciseSet`: frase ímpar com `scenario`, pelo menos 3 na unidade, 2 distratores; sem cenário não sorteia
  nada), `scenarioHint`, `scenarioExplanationHTML` (painel de erro/revelação), `renderScenarioExercise`.

`shared/gramatica-cenario.css` (novo, `<link>` nos dois sites): `.gram-tables`, `.gram-table*`, `.gram-exercise*`, `.scenario-*`
e `.conj-progress`, tirados do `fr/index.html`. Os blocos da explicação (`.gram-block*`) continuam no `index.html` de cada
site: são os mesmos dos cartões de conceito, com o visual próprio de cada site.

Ganchos novos em `LANG_HOOKS` (`fr/lang-hooks.js`, `zh/lang-hooks.js`):

| Gancho | fr | zh |
|---|---|---|
| `grammarAnswerVerdict(given, forms)` | `latinaFr().avaliarComSeparadores` (igual a antes: acento = quase; hífen, espaço e apóstrofo iguais) | pinyin como nos outros exercícios de digitar (numerado vale, maiúscula/pontuação não contam, forma dupla); só tom errado = quase |
| `grammarInputExtraHTML()` / `wireGrammarInputExtra` | não tem | teclado de tons do pinyin |
| `scenarioOptionHTML(p)` | `p.f` | pinyin em cima do hanzi (classes do "Frase completa") |
| `phraseAnswerHTML(p)` | frase em negrito + som | hanzi em negrito + som + (pinyin) |

O exemplo do bloco usa o gancho que já existia `conceptExampleHTML` (fr: frase + som; zh: hanzi + som + pinyin) e o contador do
cenário usa `uiKey('exercise.counter')` (`fr.exercise.counter` / `zh.exercise.counter`, mesmo texto).

Cor: o cabeçalho da tabela é caixa com texto. Na peça comum ele usa `--gram-table-head`/`--on-gram-table-head` se o site
definir, senão `--brand-fill`/`--on-brand-fill` (regra "Caixas da marca com texto"). O fr define os dois tokens no `:root`
com o roxo e a cor do papel de sempre (nada muda na tela); o zh fica vermelho com branco. O fundo do "Quase" segue o mesmo
esquema (`--gram-almost-bg`: no fr o rosado de sempre; sem o token, 10% do dourado do site).

## zh

`zh/app.js` liga as peças: `currentStepDefs` desvia para a gramática, `STEP_STATE` ganhou os campos da explicação/exercício,
`renderStep`/Voltar/Continuar/barra/nota final chamam as comuns, o olho da unidade diz "Gramática" (sem numeração, como no fr),
o botão "Manual da unidade" some na unidade de gramática, e o `buildExerciseSet`, o `renderExerciseStep`, a dica e a
explicação do painel conhecem o `format: 'scenario'`. Robustez: busca de vocabulário, aparições do hanzi, pool cumulativo e
Manual não quebram com unidade sem `vocab`/`phrases`.

Hoje o zh não tem unidade de gramática nem frase com `scenario`: **nada muda na tela do zh**. Quando a dona criar esse
conteúdo, ele precisa nascer em pt-BR e em inglês (regra "Conteúdo nasce traduzido"): é decisão de conteúdo dela. A
unidade de gramática do zh ainda não ganha selo próprio na trilha do zh (o mapa e o bloco da unidade do zh não têm o chip
"Gramática" do fr): fica para quando houver conteúdo.

## Provas (2026-10-23)

- Equivalência (`tests/paridade-sites/test_gramatica_cenario.js`, 45/45), contra o `fr/app.js` da main antes da mudança
  (commit `9b616494`), com o conteúdo real do fr (base + camada pt-BR): 41 blocos de explicação de 10 unidades de gramática e
  10 tabelas com o mesmo HTML; 407 respostas digitadas (certa, sem acento, separador trocado, apóstrofo curvo, `alt`,
  errada, vazia) com o mesmo HTML, classe, texto "Quase!"/"→", nota, som e botão; tela de resultado igual; 80 exercícios de
  cenário (tela, explicação, dica) iguais; 60 montagens do `buildExerciseSet` com 3 sementes iguais (120 cenários
  sorteados). zh: 36 montagens (18 unidades x 2 sementes) com o conteúdo real iguais às de antes (nenhuma frase do zh tem cenário); unidade e cenário
  falsos com pinyin e tom.
- Capturas Playwright do fr antes (worktree da origin/main) x depois (`tests/paridade-sites/capturas_gramatica_cenario.js` +
  `tests/e4/comparar-capturas.js`, tolerância 0): explicação, bloco com tabela, exercício vazio/errado/quase/certo, cenário com
  bandeira e cenário errado com o painel, claro/escuro, 390px e 1200px: **32/32 iguais** (0,000% dos pixels; nos 2 "quase" de
  390px a maior diferença de canal é 1 de 255, arredondamento). Capturas gerais das abas (`tests/e4/capturas.js`): 18/18 iguais.
- zh no navegador (`tests/paridade-sites/test_gramatica_cenario_zh_playwright.js`, 54/54): unidade de gramática e cenário
  FALSOS injetados na página (sem mexer no `zh/content.js`), claro e escuro: abre, pagina, Voltar, tabela vermelha com
  branco, teclado de tons escreve no campo, "shì" certo, "shi" quase, hanzi errado, resultado e conclusão da unidade; o
  `buildExerciseSet` do zh monta o cenário, opções com pinyin + hanzi, painel com hanzi + pinyin, som pela voz do zh, sem
  rolagem horizontal; e o fr segue abrindo a A1-g1 real.

## Regressão (2026-10-23)

Rodadas na branch e, as que falharam, na origin/main em worktree: tests/e4 (6 arquivos), familia-latina (4), paridade-sites
(5), trilha (12), modo-foco, cores-marca (3), curriculo-ids (9), checkpoint-zh, i18n (18, inclui unit 2343/2343 e
sem_portugues_en 6/6) e os testes que citam grammar/scenario (k2, k2c-k2g, k3, k4, k7, fase-e, camada-curso, curso-progresso,
desafios-cloze, placeholders, trilha-tags, respostas-digitadas, xp). Tudo passa, menos falhas que já existiam na main
(iguais na main): `tests/e4/test_lote5b_textos.js` (9/11), `tests/i18n/test_card_variants_browser.js` (14/16),
`tests/i18n/test_content_en.js` (29/30), `tests/k2c/test_playwright.js` (12/14), `tests/k2f/test_playwright*.js` (falta
`sql.js` no sandbox), `tests/trilha-tags/test_unit.js` (`isClassReviewCard` não definido).

Teste antigo ajustado de propósito: `tests/familia-latina/extrair-fr.js` conferia que o `fr/app.js` chamava
`latinaFr().avaliarComSeparadores(given, forms)`; agora confere a chamada do core ao gancho e o gancho do fr.
`tests/paridade-sites/test_css_compartilhado.js` passou sem exceção nova (6/6).

## Cabeçalho da tabela de gramática no fr: azul da marca (2026-10-26)
- A autora viu a prévia (roxo de hoje x azul com branco, claro e escuro) e aprovou o azul. Saíram `--gram-table-head` e
  `--on-gram-table-head` do `:root` do fr; o cabeçalho usa `--brand-fill`/`--on-brand-fill`, como manda a regra "Caixas da
  marca com texto" (no zh já era assim, em vermelho).
