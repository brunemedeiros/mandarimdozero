# 26. Paridade B2: sistema de módulos e níveis em código comum (2026-10-23)

Plano: item B2 de `docs/auditoria-paridade-fr-zh.md`, etapa 4 do pedido da dona de 2026-10-23 ("mover para código
compartilhado tudo o que é geral e hoje vive só no `fr/app.js`, para o zh e os próximos sites herdarem"). Branch
`claude/friendly-hamilton-u4ssl2`, sem PR. Continua `25-paridade-c6-gramatica-cenario.md`.
Grátis x Premium: igual ao fr de antes. Pular unidades pelo Ponto de verificação ou pelo Teste de Nível só fica Premium
quando `TRAIL_SKIP_PAYWALL_ENABLED` for ligado (hoje está desligado: todo mundo pode pular); o resto é grátis.

## O que foi para código comum

`shared/core/modulos-niveis.js` (novo, carregado por `fr/index.html` e `zh/index.html` antes do `app.js`). O zh passou a
carregar também `shared/checkpoint-exam.js` e `shared/review-milestone.js` (antes só o fr). 35 funções saíram do
`fr/app.js` com o texto de antes (9364 -> 8643 linhas):

- Helpers: `isFirstOfLevel`, `unitsOfLevel`, `unitOrdinalInfo`, `modulesOfLevel`, `moduleUnlocked`, `moduleProgressPct`,
  `moduleCompleted`, `levelCompleted`, `levelTestsOfLevel`.
- Seletor de nível: `renderLevelSelect`, `renderLevelModalList` e os cliques do botão/janela (`wireLevelSelector`, chamado
  pelo fr no mesmo ponto de antes; sem `#level-modal` não faz nada).
- Linhas da trilha: `buildCheckpointRow`, `buildModuleReviewRow`, `buildLevelTestCard` e o laço dos módulos
  (`renderModuleTrailList`, com `afterUnit`/`afterModule` para o site acrescentar o que é dele). Modo Mapa:
  `mapUnitDescribe` (a do fr, que já cobria o caso sem módulo; a cópia do zh saiu) e o mapa por módulos
  (`renderModulesTrailMap`, era o `renderTrailMapView` do fr, com `afterUnitNodes`/`describeExtra`).
- Ponto de verificação: `CHECKPOINT_PASS_THRESHOLD`, `TRAIL_SKIP_PAYWALL_ENABLED`, `trailSkipAllowed`,
  `ensureTrailTeacherLink`, `showTrailSkipLocked`, `CHECKPOINT_STATE`, `buildCheckpointQueue`, `recordCheckpointAttempt`,
  `completeModuleUnits`, `openCheckpoint`, `renderCheckpointQuizStep`.
- Revisão do módulo: `moduleReviewSelection`, `recordModuleReviewDone`, `startModuleReviewSession`.
- Teste de Nível: `LEVEL_TEST_*`, `buildLevelTestQueue`, `recordLevelTestAttempt`, `completeLevelTest`, `openLevelTest`,
  `renderLevelTestQuizStep`.
- Tela de módulo/nível concluído: `renderModuleCompleteScreen`, `lessonStars` e `registerDailyStars` (só dela; hoje
  nenhum código chama `registerDailyStars`, veio como estava).
- Novas, para os sites sem módulos e para não repetir código: `trailModules`/`trailLevelTests`/`trailHasModules` (lista
  vazia sem `MODULES`/`LEVEL_TESTS`), `initModuleProgressState`, `moduleSaveFields`/`moduleLoadApply` (o zh só grava os
  campos de módulo quando tem módulos: o save de hoje não muda), `renderExamQuestion` (a pergunta da prova, igual no
  Ponto de verificação e no Teste de Nível), `checkpointAnswerScore`, `handleModuleStepNext` (o "Continuar" da tela
  final, que estava no clique do `step-next-btn` do fr), `examScreenOpened`, `levelTestKey`, `moduleOfUnit`.

`shared/checkpoint-exam.js`: aceita `opts.item` (como virar palavra/frase em item da prova) e `opts.keys` (chaves do
enunciado). Sem eles a prova é a do francês, como sempre.

`shared/modulos-niveis.css` (novo, `<link>` nos dois sites DEPOIS do `<style>` do site, para manter a ordem que as regras
tinham no fr: elas vêm depois das regras gerais de `.unit-block`): `.level-toggle-*`, `.level-list*`, `.level-skip-chip`,
`.level-empty`, `.module-label`, `.ml-*`, `.module-units-list`, `.review-milestone`, `.ub-type-chip.review`, `.skip-locked`,
`.unit-block.checkpoint`, `.level-test-*` (com o `levelTestPulse`), `.module-complete*`, `.module-skill*`,
`.module-retry-note` e o carimbo `.tier-stamp`. A exceção `level-test-highlight` saiu de
`tests/paridade-sites/test_css_compartilhado.js`.
Cor: o chip "Pular" é caixa com texto. Na peça comum ele usa `--level-skip-bg`/`--on-level-skip-bg` se o site definir,
senão `--brand-fill`/`--on-brand-fill`. O fr define no `:root` o roxo com a cor do papel de sempre, o rosado do Ponto de
verificação (`--checkpoint-tint`, `--checkpoint-icon-tint`) e o pulso roxo (`--level-test-pulse`): nada muda na tela.
Sem os tokens (zh), os tons saem do dourado do site.

Fica no `fr/app.js` (Desafios e Ditados, item B1, etapa 5): `fillModuleChallengeRows`, `buildModuleChallengesRow`,
`buildLevelReviewRow` ("Revisão do A1" de ditados), `isLevelReviewId`, `moduleTitleFor`. O gancho para eles já existe:
o fr passa `afterModule` ao `renderModuleTrailList` para pôr o slot dos Desafios do Módulo. Também ficam por site
`computeProgressSummary` e `collectBadgeMetrics` (o do zh conta `null` em pontos de verificação: correto enquanto o zh
não tiver módulos; quando tiver, contar como o fr).

## Ganchos novos em `LANG_HOOKS`

| Gancho | fr | zh |
|---|---|---|
| `checkpointExam` (`keys`, `word(v)`, `phrase(p)`) | não define (prova de sempre, em francês) | pede o PINYIN; sentido pela tradução; escuta toca o hanzi; correção mostra "hanzi (pinyin)"; frase com `{nome}` fica fora |
| `checkpointScore(digitado, item)` | não define (`scoreCheckpointAnswer`) | igual aos exercícios de digitar do zh (`grammarAnswerVerdict`: pinyin numerado vale, só o tom errado = "quase", meio ponto); hanzi digitado também vale |
| `levelTestKeys` | não define (`trail.levelTest.*`, que cita o francês) | `zh.levelTest.sub` / `zh.levelTest.intro` |
| `examScreenOpened()` | não define | esconde o "Manual da unidade" durante a prova |

Reaproveitados: `canSpeak`, `speak` (voz), `grammarInputExtraHTML`/`wireGrammarInputExtra` (teclado de tons no campo).
Textos novos (pt-BR e en, só aparecem quando o zh tiver módulos, para a dona revisar; tradução com confiança alta):
`zh.checkpoint.exam.word` "Como se diz "{w}" em chinês? Escreva em pinyin.", `zh.checkpoint.exam.phrase` "Escreva em
pinyin: "{p}"", `zh.checkpoint.exam.listen` "Ouça e escreva em pinyin o que você ouviu", `zh.levelTest.sub` e
`zh.levelTest.intro` (os do fr com "chinês" no lugar de "francês").

## zh

`zh/app.js` liga as peças: `initModuleProgressState()` no início, `reviewSessionMilestone` no `STATE`,
`onCheckpoint`/`onLevelTest` no `STEP_STATE` (zerados no `openUnitDetail`), `handleModuleStepNext()` no "Continuar", o
fim da Revisão grava o marco do módulo (e manda `moduleId`/`unitIds` no evento, como o fr), `moduleSaveFields()` no save
e `moduleLoadApply()` no carregar, `markUnitCompleted` trata a unidade pulada estudada depois (como o fr), e a trilha e
o Mapa desviam para a versão por módulos quando há `MODULES` (com as histórias no mesmo lugar, logo depois da unidade;
`buildStoryCheckpointCard`, `storyMapNodes` e `storyMapDescribe` saíram de dentro das funções para servirem aos dois
caminhos). O risco da seção 9 da auditoria (`zh/app.js` chamava `trailSkipAllowed()`/`openCheckpoint()` sem tê-las)
deixou de existir: as funções agora existem no zh.

Hoje o zh não tem `MODULES` nem `LEVEL_TESTS`: **nada muda na tela do zh**. Quando a dona decidir os módulos do zh
(pendência "módulos do chinês"), basta declarar `MODULES` (e, se quiser, `LEVEL_TESTS`) no conteúdo do zh, com os títulos
em pt-BR e en (regra "Conteúdo nasce traduzido"), e ligar `hasLevelTest` em `languages/registry.js` se for o caso. O zh
ainda não tem seletor de nível (só um nível).

## Provas (2026-10-23)

- Equivalência (`tests/paridade-sites/test_modulos_niveis.js`, 90/90): a mesma sequência roda no fr da main antes da
  mudança (commit `adf10b82`, worktree temporário que o teste cria e apaga) e no fr desta árvore, no navegador, e **79 de
  79 cenas são iguais**: HTML da trilha zerada, do título e da janela do seletor de nível, nível A2 vazio, filas da prova
  dos 6 módulos e do Teste de Nível (mesma semente), helpers, Ponto de verificação aprovado (cada pergunta e cada correção,
  com uma "quase" e uma errada) e reprovado, telas finais, estado salvo (`serializeState`) depois de cada um, Revisão do
  módulo (fila, fim, marco), Mapa com 16 painéis abertos, Teste de Nível aprovado, regras de bloqueio (flag ligada x
  desligada, Free, Premium, aluno vinculado) e unidade pulada estudada depois. A comparação ignora só a porta do servidor
  nas URLs dos ícones e a classe `tc-sticky` (vem de um IntersectionObserver, varia com o tempo).
- Capturas Playwright antes (worktree da main) x depois (`tests/paridade-sites/capturas_modulos_niveis.js` +
  `tests/e4/comparar-capturas.js`, tolerância 0), claro/escuro, 390 e 1200px: **64/64 iguais** (0,000% dos pixels).
  fr (12 cenas): trilha com módulos, seletor de nível, Mapa com o painel do Ponto de verificação, pergunta, errada,
  "quase", módulo concluído, "Quase lá", pergunta do Teste de Nível, nível concluído, trilha depois e 1º cartão da Revisão
  do módulo. zh (4 cenas, sem módulos): trilha, Mapa, lição e Revisão. Capturas gerais das abas (`tests/e4/capturas.js`):
  18/18 iguais. Arquivos no scratchpad da sessão (`etapa4/antes`, `etapa4/depois`, `etapa4/abas-*`, `etapa4/zh-com-modulos`).
- zh no navegador (`tests/paridade-sites/test_modulos_niveis_zh_playwright.js`, 95/95): sem módulos, trilha igual (18
  unidades e histórias, sem módulo), save sem campo novo, Mapa sem "pular", funções do risco existem. Com `MODULES` e
  `LEVEL_TESTS` FALSOS injetados na página (sem mexer no `zh/content.js`), claro e escuro, 390px: 3 módulos com Revisão
  e Ponto de verificação, histórias dentro do módulo, Teste de Nível com "chinês", CSS carregado; Mapa com as seções e o
  "pular"; o Ponto de verificação abre pela linha, 12 perguntas (palavra, frase, escuta), teclado de tons, escuta pela voz
  do zh falando o hanzi, sem tom = "quase", errada mostra "hanzi (pinyin)", tela com estrelas, aprova, pula as unidades sem
  XP, salva e carrega; Revisão do módulo grava o marco; Teste de Nível (hanzi digitado vale) conclui o nível; sem rolagem
  horizontal; nenhum erro de página.

## Regressão (2026-10-23)

Rodadas na branch e, as que falharam, na main em worktree: e4 (core 35/35, ida e volta 26/26, lotes 5c-5e), familia-latina
(run.sh: 4 suítes), paridade-sites (7), trilha (12), modo-foco 19/19, cores-marca (3), curriculo-ids (9), checkpoint-zh
25/25, xp (4), conquistas (2 em Node/navegador), k2-k10 (19 arquivos), fase-e (2), camada-curso, painel-alunos,
planos-permissoes 105/105, desafios-* (5), curso-progresso (9), i18n (18, inclui unit 2343/2343 e sem_portugues_en 6/6).
Tudo passa, menos falhas que já existiam na main (iguais na main): `tests/e4/test_lote5b_textos.js` (9/11),
`tests/i18n/test_card_variants_browser.js` (14/16), `tests/i18n/test_content_en.js` (29/30), `tests/k2c/test_playwright.js`
(12/14), `tests/k2f/test_playwright*.js` (falta `sql.js`), `tests/trilha-tags/test_unit.js` (`isClassReviewCard`) e
`tests/desafios-progresso/test_playwright.js` (22/23, "barra existe"; também falha na main).

Testes antigos ajustados de propósito: `tests/fase-e/harness.js` extrai `moduleSaveFields`/`moduleLoadApply` e os
acessores (o `applySerializedState`/`serializeState` do zh chamam); `tests/i18n/test_i18n_unit.js` lista as 5 chaves
novas do zh como texto novo; `tests/paridade-sites/test_css_compartilhado.js` perdeu a exceção `level-test-highlight`.

## Para a dona decidir

- Os textos novos do zh (enunciado da prova em pinyin e do Teste de Nível) e o jeito da prova no zh (resposta em pinyin,
  tom errado = meio ponto, hanzi digitado também vale). Só aparecem quando o zh tiver módulos.
- Quais módulos o zh terá (e se terá Teste de Nível): conteúdo dela; o motor está pronto.
