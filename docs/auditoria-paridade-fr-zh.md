# Auditoria de paridade fr x zh (2026-10-23)

Pedido da dona: achar o que existe só no app de francês (que recebe mais pedidos e alterações), garantir que vale
também no chinês e que vai valer nos próximos sites (português `pt` e os seguintes).
Caso que motivou: a janela "Minha meta de estudo" (`shared/wizard.js`) usava classes de CSS que só estavam em
`fr/index.html`; no zh os botões saíam sem estilo (já corrigido no commit `b25fc6f`, com a guarda
`tests/paridade-sites/test_css_compartilhado.js`).

Esta auditoria **não mudou código**. Base: `main` em `153f5c3`.

## 1. Como foi feito

- Funções de nível superior: `grep -oE "^(async )?function [A-Za-z0-9_]+"` em `fr/app.js` (9651 linhas) e `zh/app.js`
  (5501 linhas). **263 funções só no fr** e 63 só no zh. Para cada uma das 263, conferi se o nome aparece em `zh/app.js`,
  `zh/index.html` ou `shared/` (equivalente com outro nome, chamada protegida por `typeof`, ou já extraída).
- Funções com o mesmo nome nos dois arquivos mas corpo diferente (43): comparei as maiores linha a linha, procurando
  comportamento que o fr tem e o zh não (fora da troca francês x hanzi/pinyin).
- Scripts: comparei as listas de `<script src>` dos dois `index.html` (`fr/index.html:6624-6758`, `zh/index.html:5650-5772`).
- HTML/CSS: classes usadas por scripts de `shared/` que o zh carrega e que só têm CSS no fr (script de varredura igual ao
  da guarda nova; resultado: só `level-test-highlight`, já na lista de exceções da guarda); ids de elementos só do fr
  (81, todos de Conjugação, Desafios, Ditados, Teste de Nível/seletor de nível e janelas Premium desses recursos).
- `if` por idioma dentro de `shared/` (`=== 'fr'`, `=== 'zh' ? ... : 'fr'`), pensando nos próximos sites.

## 2. Classificação das 263 funções só do fr (agrupadas por recurso)

| Grupo | Funções | Categoria |
|---|---|---|
| Desafios (Expressões, Ouça e traduza, Acentuação, Complete a frase gramatical, fila, revisão espaçada, admin, Premium, áudio lento, `tpZero`, comparador de tradução) | 138 | B |
| Ditados (player, correção palavra a palavra, "Revisão do A1" de ditados) | 39 | B |
| Sistema de módulos e níveis (Ponto de verificação do módulo, Revisão do módulo, Teste de Nível, seletor de nível, tela de módulo concluído, estrelas, pular unidades) | 32 | B |
| Conjugação (prática, busca de verbos, Jogos, contadores do dia) | 33 | A (para o zh); família latina para o pt |
| Teclado de acentos e correção com acento (`frAccentPickerHTML`, `lessonTypedAnswerResult`, `normalizeLoose`...) | 6 | A |
| Voz do francês (`speakFrench`, `canSpeakFrench`...) | 4 | A (o zh tem `speakChinese`, `canSpeakChinese`) |
| Unidade de gramática (`getStepDefsGrammar`, `renderGrammarExplanationStep`, `renderGrammarExerciseStep`, `renderGramTableHTML`, `unitOrdinalInfo`) | 5 | C (motor geral, o zh ainda não tem conteúdo) |
| Exercício de cenário (`renderScenarioExercise`, `scenarioSceneHTML`) | 2 | C (motor geral, o zh ainda não tem conteúdo) |
| Resposta digitada com as letras erradas marcadas (`typedAttemptHTML`) | 1 | C |
| Mesma função com outro nome no zh (`getStepDefs` = `STEP_DEFS` em `zh/app.js:1579`; `flashcardUnitTitleText` = `cardOriginTitle` em `zh/app.js:4122`, ligado por `fr/lang-hooks.js:9`; `stopMatchTimer`, função vazia em `fr/app.js:3800`, chamada com `typeof` em `shared/core/quase-iguais-simples.js:109`) | 3 | sem diferença |

Além das funções soltas, a comparação das funções de mesmo nome e dos arquivos de dados achou mais 5 itens C
(seção 5) e 7 itens D (seção 6).

## 3. Categoria A: próprio do idioma (não se aplica ao zh)

- **Conjugação** (`fr/app.js:5196-5980`, dados em `fr/conjugation-data.js`, 16 668 linhas; jogos em `fr/conj-games.js`
  com motor já comum em `shared/conj-games.js`). Chinês não conjuga verbo. **Atenção para o pt**: a dona já decidiu que a
  Conjugação é um dos módulos do começo do português (`docs/i18n/auditoria-app-portugues.md`, seção 7). Hoje a tela de
  prática (33 funções) mora em `fr/app.js`; só o motor dos Jogos está em `shared/`. Ver seção 8.
- **Teclado de acentos, "oe" por "œ" valendo meio ponto, apóstrofo curvo** (`fr/app.js:3253-3275`, `5700-5735`; regras em
  `shared/core/familias/latina.js` com a configuração em `fr/lang-hooks.js`). O zh tem o equivalente próprio:
  `pinyinTonePickerHTML`, `normalizePinyinAnswer`, `acceptedFormsTyped` + `typedVariants`, `isToneOnlyMiss`
  (`zh/app.js:3173-3200`, `3351-3354`). A diferença de nota é proposital: no zh tom errado é erro (`fr/app.js:5690-5696`
  explica a decisão "tom não é decoração").
- **Voz** (`loadFrenchVoice`, `speakFrench`, `speakFrenchAudioOnly`), **números por extenso do francês**
  (`frenchNumberWords`, `fr/app.js:6350`, usado no Ditado), **destaque de vocabulário no diálogo sem artigo**
  (`dlgVocabTerms`, `fr/app.js:2345`, tira "le/la/un/une"), **gênero da nacionalidade falado** (`speakableProfileText`).
- Missões e contadores do dia de Conjugação (`registerDailyConjugation*`, `fr/app.js:845-860`); o zh tem os de hanzi
  (`registerDailyHanziLesson`).

## 4. Categoria B: depende de decisão ou conteúdo da dona

### B1. Desafios (138 funções) e Ditados (39)
Pendência da dona "módulos/aba de Desafios do chinês"; regra de `.claude/rules/frontend-fr-zh.md`: "Desafios e Ditados só
existem no fr". Arquivos só do fr: `fr/dictations.js`, `shared/translation-compare.js` (comparador do "Ouça e traduza").
Itens que parecem gerais mas só são usados aqui, e por isso ficam em B:
- **Áudio lento 🐢** (`slowAudioBtnHTML`/`slowAudioIconBtnHTML`, `fr/app.js:207-212`, `SLOW_AUDIO_RATE = 0.65`): o próprio
  comentário diz que é companheiro do "Écouter" manual dos Desafios; os únicos usos são `fr/app.js:8036`, `8111`, `8117`,
  `8483`, `8562`, `8609`, `8646`, todos em Desafios. Nas lições (fr e zh) não existe botão lento. Se a dona quiser o 🐢 nas
  lições, é pedido novo para os dois sites.
- **`tpZero`** (`fr/app.js:194`, plural com zero): só usado nas linhas de Desafios da trilha (`fr/app.js:1414`, `1447`).
  Função genérica; pode ir para `shared/core/` quando Desafios chegarem ao zh.
- `chT`, `md5Hex`, `tierBadgeHTML`, `translation*`: internos de Desafios.

### B2. Sistema de módulos e níveis (32 funções)
O zh não tem módulos: `zh/content.js:6-8` tem um único nível (`HSK1`) e nenhuma constante `MODULES` (o fr tem
`fr/content.js:4218`). Pendência "módulos do chinês". Tudo abaixo depende disso:
- **Ponto de verificação do módulo** com palavra, frase, escuta e gramática (`shared/checkpoint-exam.js`, chamado em
  `fr/app.js:4606-4610`; `openCheckpoint` em `fr/app.js:4640`). O zh tem o ponto de verificação **da unidade** (última
  lição, `zh/app.js:1593-1597`), que é igual ao do fr.
- **Pular pelo Ponto de verificação** (`trailSkipAllowed`, `fr/app.js:4583`, com `TRAIL_SKIP_PAYWALL_ENABLED = false`) e
  **`ensureTrailTeacherLink`** (`fr/app.js:4588`; apesar do nome, só pede a tabela de permissões do plano quando a trava de
  pular estiver ligada). O zh chama `trailSkipAllowed()`/`openCheckpoint()` em `zh/app.js:1326` sem ter as funções, mas só
  quando `moduleId` existe, e o zh sempre passa `null` (`zh/app.js:1362`): não quebra hoje. **Quebraria** no dia em que o zh
  ganhar módulos e alguém passar o `moduleId` sem trazer as funções. Anotado como risco na seção 9.
- **Revisão do módulo** (`shared/review-milestone.js`, `fr/app.js:3956-4010`), **Teste de Nível** (`fr/app.js:4761-4830`;
  `languages/registry.js` marca `hasLevelTest: false` para o zh; `shared/auth.js:169` já ignora quando não há
  `LEVEL_TESTS`), **seletor de nível** (`renderLevelSelect`/`renderLevelModalList`, `fr/app.js:1010-1077`), **tela de
  módulo concluído** com estrelas (`renderModuleCompleteScreen`, `fr/app.js:2094`; `lessonStars`/`registerDailyStars`
  existem só por causa dela, ver `fr/app.js:825-836`), **unidade pulada que depois é estudada de verdade**
  (`markUnitCompleted`, `fr/app.js:4524-4532`).
- Conquistas: `collectBadgeMetrics` do fr conta pontos de verificação de módulo, ditados e desafios
  (`fr/app.js:930-955`); o do zh manda `null` para esses (`zh/app.js:984-1000`). Correto enquanto o zh não tiver os recursos.

**Recomendação para B2**: quando a dona decidir os módulos do zh, **não copiar** esse bloco para `zh/app.js`. Antes, mover o
motor (são funções que só leem `MODULES`, `UNITS` e `STATE`) para `shared/core/`, com ganchos `LANG_HOOKS` para a voz
(`canSpeak`) e os textos. Assim o pt também herda.

## 5. Categoria C: recurso geral que está só no fr (o que a dona pediu para achar)

### C1. Chave estável por item e mudanças de currículo (prioridade alta, invisível para o aluno) -- FEITO (2026-10-23)
- **Feito** na Etapa 1 do plano da dona, branch `claude/friendly-hamilton-u4ssl2` (registro:
  `docs/historico/23-paridade-c1-chave-estavel-zh.md`): `k` em 305 itens do `zh/content.js` (nenhum id mudou),
  `zh/curriculum-changes.js`, `zh/published_ids.json`, scripts e testes descobrindo os sites, e o carregar/salvar com mudanças
  de currículo em `shared/core/curriculo-progresso.js`, chamado pelos dois app.js. O texto abaixo é o diagnóstico de antes.
- **O que o aluno perde no zh**: hoje, nada que ele veja. O risco é de **progresso de memória (FSRS) ir para o cartão
  errado** no dia em que o conteúdo do zh mudar (palavra inserida no meio de uma unidade, unidade dividida, módulos do zh).
- **Evidência**: no fr cada palavra/frase/fala tem a chave congelada `k` (`fr/content.js`, 533 ocorrências de `"k":`) e o
  carregamento passa o save pelas mudanças de currículo: `fr/app.js:648` (`stampUnitLessonIds`), `653`
  (`_curriculumVersion`), `692-725` (`applyStudyKeyChanges`, `applyUnitModuleMerges`, `reconcileUnitLessonIdx`), com o
  livro-razão `fr/published_ids.json`, `fr/curriculum-changes.js` e a guarda `tests/curriculo-ids/test_ids_publicados.js`.
  No zh, os itens não têm `k` (os 54 `"k":` de `zh/content.js` são tipos de pergunta do diálogo, como `"fill"`), então o id
  do cartão é pela **posição**: `shared/study-trail-model.js:31-44` ("Item SEM `k` (zh hoje) usa a regra antiga por posição:
  `u{unidade}-{v|p|d}{posição}`"). `applySerializedState` do zh (`zh/app.js:810-835`) não chama nenhuma dessas funções e
  `serializeState` (`zh/app.js:777`) não grava a versão nem o arquivo de aposentados. A lição atual também é guardada só
  pelo número (`lessonIdx`): lição nova no meio da unidade desloca a aluna.
- **Por que ficou assim**: a Etapa 0a foi escopada para o fr ("O zh não mudou", `docs/historico/21-etapa-0a-ids-estaveis-fr.md:23`).
  A regra em si é geral (o motor em `shared/study-trail-model.js` já serve qualquer idioma).
- **Como levar**: médio. Gerar `k` em `zh/content.js` com o valor de hoje sem o "u" (assim **nenhum id muda**, como foi
  feito no fr), criar `zh/curriculum-changes.js` vazio e `zh/published_ids.json`, repetir as 5 chamadas do carregamento e
  do save, generalizar `fr/scripts/ids_publicados.js` e o teste para descobrir os sites sozinhos, e regenerar o mapa do
  cron (`scripts/gerar_mapa_cron.js:27` já trata o zh com `changes: null`; com `k` igual ao id atual o mapa não muda).
- **Risco**: médio a alto se feito errado (mexe no save), baixo se feito com o teste de ida e volta do progresso e a
  conferência de que nenhum id mudou. Fazer **antes** de qualquer reestruturação do conteúdo do zh (módulos).

### C2. "Sua resposta" com as letras erradas em vermelho nas lições (prioridade alta, visível) -- FEITO (2026-10-23)
- **Feito** (registro: `docs/historico/24-paridade-c2-c5-d6-licao.md`): `alinharLetras` e `typedAttemptHTML` em `shared/core/licao-feedback.js`, CSS em
  `shared/licao-feedback.css`; o zh compara o pinyin convertido (`LANG_HOOKS.typedAttemptForm`). O texto abaixo é o diagnóstico de antes.
- **O que o aluno perde no zh**: no fr, ao errar um "Digite o que ouviu" ou a lacuna digitada, o painel mostra o que ela
  digitou com só as letras erradas em vermelho e um traço onde faltou letra. No zh o painel mostra só a resposta certa
  (e o aviso de tom, quando é só o tom).
- **Evidência**: fr `typedAttemptHTML` em `fr/app.js:5299-5311`, usado em `fr/app.js:3331` e `3487`; CSS só em
  `fr/index.html:3999-4002` (`.typed-attempt`, `.conj-x`, `.conj-gap`). zh `zh/app.js:3340` e `3561` chamam
  `showWrongAnswerPanel(contentEl, ex, { toneOnly })` sem `attemptHTML`, embora o painel do zh já saiba mostrar
  `attemptHTML` (`zh/app.js:3145-3148`, usado no Ordenar em `3809-3814`). A regra de `.claude/rules/frontend-fr-zh.md` já
  fala do recurso como geral ("Erro marcado em vermelho: `typedAttemptHTML`").
- **Como levar**: pequeno a médio. O alinhamento letra a letra (`alinharLetras`, `shared/core/familias/latina.js:197`) não
  tem nada de latino: é distância de edição. Mover para `shared/core/` e criar `typedAttemptHTML` comum com um gancho para
  as formas aceitas (fr `acceptedForms`, zh `acceptedFormsTyped`). Adaptação do zh: decidir se compara o pinyin como a
  aluna digitou (com número de tom, "ni3") ou já convertido para marca de tom (`convertNumberedPinyin`), e mover o CSS
  para os dois sites.
- **Risco**: baixo (só apresentação do erro). Muda o que a aluna vê: precisa de aprovação da dona.

### C3. Dica do Verdadeiro ou Falso cita a explicação vista (prioridade média, visível, trivial) -- FEITO (2026-10-23)
- **Feito**: `trueFalseHint` em `shared/core/licao-feedback.js`, usado pelos dois `buildExerciseHint` (registro: `docs/historico/24-paridade-c2-c5-d6-licao.md`).
- **O que o aluno perde no zh**: no fr a dica diz "Pense na explicação: '<título do conceito>'" quando ela já viu o
  conceito na lição. No zh sai sempre a dica genérica.
- **Evidência**: fr `fr/app.js:1838-1842` usa `unit.concepts`; zh `zh/app.js:1887-1891` usa `unit.usageNote`, que nenhuma
  unidade do zh tem mais (`usageNote`: 0 em `courses/zh-pt-BR/layer.js`; `concepts`: 18 em `zh/content.js`). O ramo bom
  do zh nunca roda.
- **Como levar**: trivial (3 linhas no zh; a chave `zh.hint.trueFalseUsage` já tem o mesmo texto da do fr). Pode ir junto
  para `shared/core/` como `buildExerciseHint` comum.
- **Risco**: baixo. Muda texto visível (texto já aprovado no fr): confirmar com a dona.

### C4. Ordenar frase: blocos no lugar certo ficam verdes quando a frase está errada (prioridade média, visível) -- FEITO (2026-10-23)
- **Feito**: `markReorderSlots` e `reorderBlockStatus` em `shared/core/licao-feedback.js` (registro: `docs/historico/24-paridade-c2-c5-d6-licao.md`).
- **O que o aluno perde no zh**: no fr, ao errar o Ordenar, os blocos que já estavam na posição certa ficam verdes e só os
  outros ficam vermelhos ("dica de onde errou"). No zh todos ficam vermelhos.
- **Evidência**: fr `fr/app.js:3637-3642`; zh `zh/app.js:3788-3790`. A linha "Sua resposta" com cores por bloco existe
  nos dois.
- **Como levar**: trivial (mesma condição de uma linha). **Risco**: baixo. Visível: aprovação da dona.

### C5. Velocidade do áudio pré-gravado (prioridade média, audível) -- FEITO (2026-10-23)
- **Feito**: `LANG_HOOKS.pregenRate()` é a fonte única; fr 0,9 e zh 0,9 por decisão da dona (registro: `docs/historico/24-paridade-c2-c5-d6-licao.md`).
- **O que o aluno perde no zh**: no fr, depois de reclamações reais de alunos ("o áudio está muito rápido"), o mp3
  pré-gravado passou a tocar a 0,9 (`PREGEN_AUDIO_RATE`, `fr/app.js:91-112`). No zh o mp3 toca a 1,0
  (`zh/app.js:96-99`, sem o argumento `rate`), enquanto a voz do navegador do próprio zh já toca a 0,85 (`zh/app.js:128`).
  É exatamente a situação que gerou a queixa no fr.
- **Como levar**: trivial tecnicamente (o `playPregeneratedAudio` comum já aceita `rate`, ver
  `docs/i18n/e4-plano-de-extracao.md`, lote 5c), mas a dona precisa ouvir e decidir o valor para o chinês (tons). Para os
  próximos sites, virar um campo do idioma em `LANG_HOOKS` (`pregenRate`, que o `dlgPlayLine` já usa).
- **Risco**: baixo. Muda o que a aluna ouve: aprovação da dona.

### C6. Motores gerais da lição que só existem no fr (o zh não perde hoje porque não tem conteúdo)
- **Unidade de gramática** (passos "Explicação" paginada + "Exercícios", tabela): `fr/app.js:1571`, `1585`, `2026-2093` e `2144-2200` (telas),
  `2242-2258` (desvio em `renderStep`). O zh tem 0 unidades `type: "grammar"`; a gramática do zh entra como conceitos dentro das lições
  (`zh/app.js:1975-1985`). Se a dona criar uma unidade de gramática no zh, ela **não abre**: o zh não tem esses passos.
- **Exercício de cenário** ("qual frase serve nesta situação?", com emoji/bandeira): `fr/app.js:2818-2826` (montagem),
  `3357-3400` (tela), `1832` (dica), `3040` (explicação). O texto da situação mora na camada do curso
  (`courses/fr-pt-BR/layer.js`, `fr/content.en.js`); no zh nenhuma frase tem `scenario`. O CSS `.scenario-*` está quase
  todo só no fr (`zh/index.html:1337` tem só `.scenario-options`).
- **Como levar**: médio cada um. Mover para `shared/core/` (família latina primeiro, porque o pt usa o fr como molde, ver
  `docs/i18n/e4-plano-de-extracao.md` seção 10) e só depois o zh. O conteúdo novo do zh (situações, unidades de
  gramática) precisa nascer em pt-BR e em inglês (regra "Conteúdo nasce traduzido"): **é decisão de conteúdo da dona**.
- **Risco**: baixo para o zh (sem conteúdo, nada muda); é sobretudo preparação para o pt.

### C7. Evento de análise da Revisão sem a unidade (prioridade baixa, invisível)
- fr `fr/app.js:4264-4266` grava `unitId` no evento `lesson_complete`/`flashcard_review` quando a Revisão foi aberta de uma
  unidade (`STATE.reviewSessionUnitFilter`, definido por `shared/router.js:150` nos dois sites); zh
  `zh/app.js:4360` grava só a contagem. O Admin > Analytics usa `meta.unitId` para achar o nível
  (`shared/admin-analytics-calc.js:263`). Trivial; invisível.

## 6. Categoria D: o zh tem e o fr não (só o que chama atenção)

1. **Português no site em inglês, no fr** (bug, prioridade alta, trivial): a dica do Ordenar no fr é texto fixo
   "Toque nas palavras na ordem certa. Toque numa já colocada para devolvê-la." (`fr/app.js:3564`); o zh usa
   `t('zh.reorder.tapHint')` (`zh/app.js:3713`), que já tem inglês em `shared/i18n/en.js:2157`. Fere a regra "site em inglês
   não tem nada em português". A varredura `tests/i18n/scan_pt_literais.js` já aponta essa linha (entre 481 literais), mas não
   barra o merge.
2. **Manual da unidade** (botão "📖 Manual da unidade" na lição, com vocabulário, frases e diálogo):
   `zh/index.html:4848`, `zh/app.js:1759-1806`. O fr não tem. Recurso geral; decisão da dona se o fr deve ganhar.
3. **Exercício "Frase completa"** (escolher a frase certa entre 4, com distratores trocando palavra ou negação):
   `zh/app.js:2718-2760` e `3625`. O fr tem só um resto de código para ele (`fr/app.js:3036`).
4. **Lado do balão no diálogo pelo primeiro falante** (`dlgSpeakerSide`, `zh/app.js:2255`): aceita falante com qualquer
   nome. O fr só põe à direita quem se chama `B` (`fr/app.js:2390`, `2525`). Importa para a pendência "diálogos com
   personagens nomeados".
5. **Histórias-checkpoint** (`zh/stories.js`, `zh/app.js:1428-1570`) e **busca de vocabulário** (pronta, mas sem botão
   visível por pedido: `zh/index.html:4704-4707`). Conteúdo e decisão da dona.
6. **FEITO (2026-10-23)**, ver `docs/historico/24-paridade-c2-c5-d6-licao.md` (o fr também tinha um "pts" fixo no placar ao vivo, trocado). Textos fixos no zh que o fr já traduz: selo "⏭ 跳过" (`zh/app.js:1234`; o fr usa `t('trail.unit.skippedBadge')`;
   inalcançável hoje porque o zh não pula unidade) e "pts" na Revisão rápida (`zh/app.js:4010`, `4056`, `4078`; o fr usa
   `t('review.speed.points')`, mesmo texto). Triviais.
7. Hanzi, radicais, traços, pinyin visível ou escondido, tons: próprios do chinês (A no sentido contrário).

## 7. HTML e CSS de componentes

- Com a guarda nova, nenhuma classe usada por `shared/` falta no zh (`node tests/paridade-sites/test_css_compartilhado.js`:
  6/6, exceção única `level-test-highlight`, do Teste de Nível).
- CSS que hoje só existe no fr e terá de ir junto quando o recurso for levado: ~~`.typed-attempt`, `.conj-x`, `.conj-gap`
  (C2)~~ (feito: `shared/licao-feedback.css`), `.scenario-*` (C6), `.gram-*` (C6), `.module-label`/`.ml-*`/`.checkpoint-*` (B2),
  `.cg-*` dos Jogos (`shared/conj-games.js`), `.reorder-final-*` (`fr/index.html:1675-1676`).
- Ids só do fr (81): todos de Conjugação (28), Desafios (27), Ditado (10), janelas Premium de Desafios/Jogos (6), seletor
  de nível e Teste de Nível (5), menu Mais (2) e `path-level-title`. Nenhum é usado por `shared/` fora desses recursos
  (os de `shared/activity-focus.js` são de Desafios e Conjugação, procurados com `getElementById` que aceita ausência).

## 8. Próximos sites: o que um site novo herda hoje e o que se perde

**Herda** (está em `shared/`, `shared/core/` ou `languages/`): conta, perfil, amigos, ranking, conquistas, notificações,
mural, painel da professora/admin, Banco de Revisão, Revisão (motor FSRS, decks, tags, filtros, Combinar, Revisão rápida),
editor de cartões, importação/exportação Anki, meta de estudo, modo foco, roteamento, PWA, i18n, as ~190 funções da trilha
e dos exercícios já extraídas nos lotes 1 a 5e da E4 (com `LANG_HOOKS`), o motor de id estável por item
(`shared/study-trail-model.js`), o motor dos Jogos da Conjugação (`shared/conj-games.js`), o motor da prova do Ponto de
verificação (`shared/checkpoint-exam.js`) e da Revisão do módulo (`shared/review-milestone.js`), e as regras da família
latina (`shared/core/familias/latina.js`).

**Perde** (está só em `fr/app.js` e teria de ser copiado, o que recria o problema desta auditoria):
- Toda a tela da Conjugação (33 funções). O pt precisa dela desde o começo.
- Toda a parte de módulos e níveis (32 funções): o pt vai ter módulos.
- Unidade de gramática e exercício de cenário (C6).
- ~~`typedAttemptHTML` (C2)~~: feito, `shared/core/licao-feedback.js` (2026-10-23).
- Desafios e Ditados (177 funções): entram no pt "aos poucos depois", pela decisão da dona.
- ~~O carregamento com mudanças de currículo (C1)~~: feito, `shared/core/curriculo-progresso.js` (2026-10-23).

**Pontos de `shared/` que ainda supõem só fr/zh** (já listados em `docs/i18n/arquitetura-multi-idioma-cursos.md:74` para a
E1): `shared/profile-placeholders.js:141` e `:147` (`studyLang === 'zh' ? 'zh' : 'fr'`: no site de português o
`{nacionalidade}` sairia em francês, "brésilienne") e `:201`; `shared/flashcard-field-editor.js:146`.

Resumo: a decisão já tomada (o `fr/app.js` é o molde da família latina e a extração dos exercícios grandes vem junto com o
pt) cobre o pt **se** a extração incluir os itens da lista "Perde". Recomendo que o plano da E5/E7 cite esta lista.

## 9. Riscos anotados

- `zh/app.js:1326` chama `trailSkipAllowed()` e `openCheckpoint()`, que não existem no zh; seguro só porque `moduleId` é
  sempre `null` (`zh/app.js:1362`). Ao levar módulos ao zh, levar as funções junto (ou movê-las para `shared/core/`).
- ~~Sem C1, qualquer edição de ordem em `zh/content.js` move o progresso FSRS de uma palavra para outra, em silêncio.~~
  Resolvido pelo C1 (2026-10-23): o zh também segue a chave `k`.

## 10. Resumo por categoria

| Categoria | Itens (recursos) | Funções só do fr envolvidas |
|---|---|---|
| A. Próprio do idioma | 4 (Conjugação, acentos, voz, números/artigos) | 43 |
| B. Depende da dona | 3 (Desafios, Ditados, módulos e níveis) | 209 |
| C. Geral, esquecido no zh | 7 (C1 a C7) | 8 (mais trechos dentro de funções de mesmo nome) |
| D. zh tem, fr não | 7 | (funções do zh) |
| Mesma função com outro nome | 3 | 3 |
| **Total de funções só do fr** | | **263** |

## 11. Itens C em ordem de prioridade, com proposta

| # | Item | Proposta | Esforço | Muda o que a aluna vê? |
|---|---|---|---|---|
| 1 | **FEITO (2026-10-23)** C1 chave estável por item e mudanças de currículo no zh | `k` = id atual em `zh/content.js`; `zh/curriculum-changes.js` vazio; mover as chamadas de `fr/app.js:648-725` para uma função comum em `shared/study-trail-model.js` chamada pelos dois `applySerializedState`; livro-razão e teste descobrindo os sites | médio | não (teste de ida e volta obrigatório) |
| 2 | **FEITO (2026-10-23)** C2 "Sua resposta" com letras erradas | `alinharLetras` e `typedAttemptHTML` para `shared/core/` com gancho de formas aceitas; CSS nos dois sites; decidir como mostrar o pinyin | pequeno a médio | sim, aprovação |
| 3 | D1 português fixo no Ordenar do fr (bug) | usar `t()` (a chave `zh.reorder.tapHint` diz "blocos"; criar `fr.reorder.tapHint` ou uma chave comum) | trivial | só no site em inglês, corrige a regra |
| 4 | **FEITO (2026-10-23)** C3 dica do V ou F com o conceito | trocar `usageNote` por `concepts` no zh (`zh/app.js:1887-1891`) | trivial | sim (texto já aprovado no fr) |
| 5 | **FEITO (2026-10-23)** C4 blocos certos verdes no Ordenar | uma condição em `zh/app.js:3789` | trivial | sim, aprovação |
| 6 | **FEITO (2026-10-23)** C5 velocidade do mp3 | `pregenRate` por idioma em `LANG_HOOKS`; dona ouve e decide o valor do zh | trivial | sim (som), aprovação |
| 7 | C6 unidade de gramática e cenário | mover para `shared/core/` junto com a extração da família latina (pt); zh só quando houver conteúdo | médio | não, até existir conteúdo |
| 8 | C7 `unitId` no evento da Revisão | uma linha no zh | trivial | não |

Itens B2 (módulos) e Conjugação: não são esquecimento, mas a recomendação é mover o motor para `shared/core/` **antes** de
levar ao zh ou ao pt, em vez de copiar.

## 12. Guarda automática sugerida

Já existe `tests/paridade-sites/test_css_compartilhado.js` (CSS de peças comuns). Sugiro somar, na mesma pasta:

1. **`test_funcoes_so_de_um_site.js`**: descobre os sites (pasta com `index.html` e `app.js`, como a guarda de CSS), lista as
   funções de nível superior de cada `app.js` e falha se aparecer uma função que só um site tem e que **não está
   classificada** num arquivo `tests/paridade-sites/funcoes-classificadas.json` (`{ "nome": { "site": "fr", "cat": "A|B",
   "motivo": "..." } }`). A lista inicial são as 252 funções A e B desta auditoria (mais as 3 equivalentes). Função nova só no fr obriga quem a escreveu
   a decidir: é do idioma (A), espera a dona (B, citando a pendência) ou vai para `shared/`. Barato e pega o caso na hora.
2. **Chamada sem definição**: no mesmo teste, procurar nomes chamados em `zh/app.js` (e nos próximos `app.js`) que não
   estão definidos no site nem em `shared/` (o caso de `zh/app.js:1326`). Aceitar só chamadas protegidas por
   `typeof X === 'function'`.
3. **Literais em português no `app.js`**: transformar a varredura `tests/i18n/scan_pt_literais.js` em guarda só para texto
   dentro de `class="...-hint"`, `exercise-prompt-label` e afins (onde o D1 escapou), ou ao menos para literais **novos**
   (comparando com uma lista congelada de hoje), já que os 481 atuais não deixam a varredura barrar o merge.
4. **Linha na regra** `.claude/rules/frontend-fr-zh.md`: "Recurso novo no fr: dizer no PR se vale para o zh e o pt; se vale,
   nasce em `shared/core/` (com `LANG_HOOKS`) ou entra nos dois `app.js` no mesmo PR."

O que é grátis e o que é Premium: esta auditoria não cria recurso; os itens C propostos são todos de lição e Revisão,
grátis como no fr hoje.
