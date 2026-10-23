# 29. Paridade, etapa 5c: Desafios em código comum (2026-10-23)

Pedido da dona (2026-10-23): mover para código compartilhado tudo o que é geral e hoje vive só no `fr/app.js`. Etapa 5c
(a última de mover código): os **Desafios**. Branch `claude/friendly-hamilton-u4ssl2`, sem PR. Continua
`28-paridade-ditados.md` (mesmo molde: motor em `shared/` fora de `shared/core/` + configuração do idioma em `fr/`, mesmos
nomes de função e mesmo texto, mesma ordem de carregamento, provas de equivalência e capturas pixel a pixel).
Grátis x Premium: igual ao fr de antes. Desafio com `moduleId` (Desafios do Módulo) é Premium, sem `moduleId` é Free; só
com o selo, porque a trava está desligada (`CHALLENGE_PAYWALL_ENABLED = false`, `CHALLENGES_SERVER_GATING = false`;
permissão `challenges_premium` em Admin > Planos). Os desafios não dão XP (como sempre) e contam para as conquistas
(`challengesDone`).
Categoria B para o zh: **o zh não carrega nada** (a dona decide se o chinês terá Desafios).

## O que foi para código comum

As **138 funções** dos Desafios saíram do `fr/app.js` com o mesmo nome e o mesmo texto (o `fr/app.js` foi de 7 118 para
4 103 linhas e de 198 para 60 funções). Três arquivos, carregados nesta ordem depois dos Ditados e antes do `app.js`:

- **Parte 1, `shared/desafios.js`** (lógica pura, catálogo e dados): `CHALLENGES`, `loadChallengesFromDB` (cache de
  5 min), `persistChallenge`, `challengeDataPayload`, tipos/status válidos, `CHALLENGE_CATEGORIES`, `isChallengesAdmin`,
  publicados/pendentes/fora do ar, filtro do módulo, Free x Premium (`challengeTier`, `tierBadgeHTML`,
  `isChallengeLocked`, `listedChallenges`, `playableChallenges`, `challengesPremiumUnlocked`, as duas chaves desligadas),
  os textos (`CHALLENGE_I18N`, `chT`, `applyChallengeI18n`, `tpZero`), a revisão espaçada (bloco
  `challenge-review-logic`: caixas 1/3/7/14 dias, `dueChallengeReviews`, `recordChallengeReviewOutcome`), a correção do
  Ouça e traduza (bloco `challenge-translation-logic`: comparador pt-BR com negação, número, troca de pessoa,
  `mustInclude`/`mustExclude`, marcação palavra a palavra; o comparador de outro idioma do site continua em
  `shared/translation-compare.js`), da Acentuação (bloco `accent-challenge-logic`) e do Complete a frase (bloco
  `cloze-grammar-logic`), a Expressão do dia (`expressionOfTheDay`), `expressionCardMeaning`, níveis e registros.
  Novas: `registerChallenges(cfg)`, `chCfg()`, `chHasConfig()`, `chFamilia()`, `chSiteTexts()` e
  `wireChallengesScreen()` (todos os listeners que eram de nível superior no `fr/app.js`, na mesma ordem; o fr chama no
  mesmo ponto do carregamento).
- **Parte 2, `shared/desafios-telas.js`** (telas do aluno): categorias (com o cartão Ditados quando o site tem Ditados),
  lista e álbum de Expressões (busca, filtros, nível recolhido, Expressão do dia, áudio), fila por nível (Ouça e traduza,
  Acentuação), `openChallengePlayer` e o player e a devolutiva de cada tipo, "Tentar de novo"/"Tentar mais tarde"/
  "Concluir", revisão dos erros, janela Premium, áudio lento (`SLOW_AUDIO_RATE`, `slowAudioBtnHTML`,
  `slowAudioIconBtnHTML`) e a linha "Desafios do Módulo N" da trilha (`fillModuleChallengeRows`,
  `buildModuleChallengesRow`). Novas: `chHasDictations()`, `appendModuleChallengesSlot(módulo, lista)` (o fr chama no
  gancho `afterModule` do `renderModuleTrailList` de `shared/core/modulos-niveis.js`), `challengesScreenHTML()`,
  `challengesPremiumModalHTML()` e `mountChallengesScreen()` (para site novo: monta a seção e a janela quando o
  `index.html` não as tem; no fr não faz nada).
- **Parte 3, `shared/desafios-admin.js`** (admin e importação): checklist de qualidade (áudio conferido pelo `md5Hex`
  do texto, duração do mp3), leitura e edição de cada tipo, recursos externos, aprovar (com e sem aviso), aprovar em
  lote, rejeitar, despublicar, prévia com o player do aluno, busca/filtros/paginação, `renderChallengesAdmin` e a
  importação (`parseChallengesImportInput`, `importChallengesFromJSON`). Novas: `wireChallengesAdminScreen()` (os
  listeners da barra e da janela, chamados por `wireChallengesScreen()` logo depois dos do aluno, como antes) e
  `challengesImportModalHTML()`.

`shared/desafios.css` (novo, `<link>` no fr **logo depois do `<style>`**, antes do `shared/modulos-niveis.css`, o lugar
mais perto do de antes): as 340 regras dos Desafios que estavam no `<style>` do `fr/index.html` (12 dentro de `@media`),
na mesma ordem, mais a parte dos Desafios de 2 regras de seletor misto (a outra parte ficou no lugar). Inclui o áudio
lento (`.dictation-play-btn-slow`, `.audio-btn-slow`, `.audio-btn-row`) e a linha `.module-challenges` da trilha. Ficou
no fr a `.challenges-screen`, que apesar do nome é a tela das Missões do dia (`shared/core/estado-trilha-desafios.js`).

## O que ficou na configuração do fr (`fr/desafios-config.js`, carregado depois do motor e antes do `app.js`)

Os desafios continuam na tabela `challenges` do Supabase (lotes em `fr/scripts/challenges_import/`) e a tradução do
conteúdo para o inglês em `fr/challenges.en.js` (`window.CHALLENGES_I18N`, pela camada do curso). Próprio do francês:
`lang: 'fr'` (o sentido da Expressão em `meaning.fr`), a família latina com a configuração do francês
(`familia: () => latinaFr()`: na Acentuação o acento é exigido e "oe" por "œ" é quase), o teclado de letras
(`frAccentPickerHTML`/`wireFrAccentPicker`) e os 4 textos que citam o francês, em pt-BR e en, iguais aos de antes:
`ch.sub` ("Pratique francês de verdade..."), `ch.verify` ("Vérifier"), `ch.knowMore` ("En savoir plus") e
`ch.goFurther` ("Pour aller plus loin"). O `chT` procura primeiro nos textos do site, depois nos comuns
(`CHALLENGE_I18N`), depois nos dos Ditados; as chaves não se repetem, então o resultado é o mesmo de antes.

## Configuração (o "gancho" de cada idioma)

`registerChallenges({...})`: obrigatórios `lang` e `familia`; o resto tem padrão. Campos: `texts`, `table` (padrão
`'challenges'`), `publishedRpc` (padrão `'get_published_challenges'`), `accentPickerHTML`, `wireAccentPicker`. A lista
comentada está no topo de `shared/desafios.js`. Sem Ditados no site, a tela de categorias não mostra o cartão Ditados e
a linha do módulo não fala em ditados (`chHasDictations()`); no fr nada muda.

## Como o site de português liga os Desafios (quando a dona quiser)

1. Dados: os desafios do português numa tabela própria (ou uma coluna de idioma na `challenges`, decisão de banco com
   a dona: hoje a tabela só tem os do francês), com o mesmo formato (`data` com `sentenceFr` = frase no idioma
   estudado, nome de campo antigo mantido; `meaning.pt` = sentido em português), os mp3 em `pt/audio/challenges/`
   (nome = md5 do texto, como o pipeline) e a tradução de cada desafio em cada idioma de site do curso (conteúdo nasce
   traduzido; hoje só en no /pt) em `window.CHALLENGES_I18N`. A correção do Ouça e traduza em inglês já existe
   (`shared/translation-compare.js`).
2. `pt/desafios-config.js` com `registerChallenges({ lang: 'pt', familia: () => latinaPt(), table, publishedRpc, texts,
   accentPickerHTML, wireAccentPicker })` (a família latina do português já existe em
   `shared/core/familias/latina-idiomas.js`).
3. `pt/index.html`: `<div class="view" id="view-challenges"></div>` vazio (o motor monta a seção, a janela Premium e a de
   importação), `<link>` do `shared/desafios.css` logo depois do `<style>` (e o `shared/ditados.css`, de onde vem o botão
   "Ouvir" `.dictation-play-btn`), scripts na ordem `shared/desafios.js` -> `shared/desafios-telas.js` ->
   `shared/desafios-admin.js` -> `desafios-config.js` -> `app.js`; no `app.js`, `wireChallengesScreen()`, a aba
   `challenges` como no fr (`applyChallengeI18n()`, `challengesModuleFilter = pendingChallengesModuleFilter;
   pendingChallengesModuleFilter = null; return renderChallengeCategories();`), `STATE.completedChallenges` e
   `STATE.challengeReviews` (com `sanitizeChallengeReviewEntry` ao juntar o progresso) e, se quiser a linha do módulo,
   `appendModuleChallengesSlot` no `afterModule` + `fillModuleChallengeRows()`.

## Provas (2026-10-23)

- Equivalência (`tests/paridade-sites/test_desafios.js`, 2242/2242; harness `desafios-harness.js` com um Supabase de
  mentira que serve os **200 desafios dos lotes reais**, 120 publicados, e registra as gravações; relógio fixo): a mesma
  sequência no fr da main (`3035549c`, worktree temporário) e no fr desta árvore, no navegador. **2227 de 2227 cenas
  iguais**: correção de **912 respostas do Ouça e traduza** (38 desafios x 22 variações: referências, minúsculas, sem
  acento, sem pontuação, negação posta e tirada, número trocado, dígitos, troca de pessoa, "a gente vamos", palavra
  faltando, metade, palavra a mais, digitação, ordem trocada, flexão, inglês, lixo, vazio, espaços), com a análise, os
  alertas, a marcação palavra a palavra e o comparador do inglês (site em inglês); **782 respostas da Acentuação** (46 x
  17: certa, sem acento, acento trocado, sem cedilha, œ -> oe, trema, maiúsculas, espaços, apóstrofo curvo, hífen,
  digitação, letra a mais, ponto, vazio); todas as combinações do Complete a frase e itens estragados na validação; a
  revisão espaçada (60 sequências de 14 resultados em dias variados e registros estragados); a Expressão do dia em 30
  dias; catálogo, filtros por módulo e trava; todas as 134 chaves de texto em pt-BR/en/fr/desconhecido; as telas pelo
  DOM (categorias, 4 listas, álbum com busca/filtros/recolher/áudio, **616 devolutivas** de todos os publicados com
  "Concluir"/"Tentar de novo"/"Tentar mais tarde" e o estado salvo, XP, missões e conquistas depois de cada uma; fila
  por nível até o fim; revisão dos erros; Desafios do Módulo, cartão Ditados e os "voltar"; linha da trilha; janela
  Premium; falha de carregamento e "Tentar de novo"); o admin (filtros, busca, paginação, seleção, lote com confirmação
  recusada e aceita, editar e salvar cada tipo, aprovar com aviso recusado e aceito, rejeitar, recursos, despublicar,
  prévia de cada tipo com "mostrar resposta", voltar e aprovar, checklist e md5 de todos) e a importação (vazia, JSON
  inválido, objeto sem lista, válida, com repetido/sem tipo/tipo e nível errados/registro errado/repetido no lote, falha
  do banco), com o que foi gravado no banco; e uma segunda carga com o site em inglês (categorias, listas, um terço dos
  players com devolutiva, janela, trilha).
- Cascata do CSS (`tests/paridade-sites/test_desafios_css.js`, 25/25): as regras da página (cada seletor separado, com
  `@media`) são as mesmas antes e depois; dos **249 072 pares** com a ordem trocada que empatam (mesma especificidade,
  mesma propriedade, valor diferente), **nenhum** pega um mesmo elemento nas 324 cenas (81 por tema/largura, sem os
  `:hover`/`:focus`/`::before`, para pegar todos os estados). Controle: sem a condição de ordem trocada, a busca acha 118
  pares (`CONTROLE=1`), então ela enxerga empates de verdade.
- Capturas antes x depois (`tests/paridade-sites/capturas_desafios.js` + `tests/e4/comparar-capturas.js`, tolerância 0),
  claro/escuro, 390 e 1200px: **180/180 iguais** (0 pixel diferente). Cenas: categorias (e com o mouse em cima), álbum
  (novo, com concluídas, filtro, busca, nível recolhido), listas/fila do Ouça e traduza, da Acentuação e do Complete a
  frase, cada player em pergunta (Expressão também revelada, Acentuação com foco e letra do teclado) e devolutiva
  certa/quase/errada (e a microatividade), "Continuar" da fila, nível concluído, progresso da fila, revisão (cartão e
  fim), Desafios do Módulo e sua lista, linha da trilha, janela Premium, admin (barra, lista, filtro, edição, seleção,
  prévia), importação e erro da importação. Arquivos em `scratchpad/etapa5c/antes` e `depois` da sessão. A main contra
  ela mesma também dá 180/180. Para isso a foto espera dois quadros de pintura (um ícone Fluent em máscara CSS da faixa
  lateral saía com outro antisserrilhado numa cena só, nas duas árvores, conforme o momento da foto; estilos e posições
  de todos os elementos daquela cena conferidos iguais).
- Motor independente do francês (`tests/paridade-sites/test_desafios_motor.js`, 49/49): o motor não cita voz, teclado,
  família, dado, tabela nem texto do francês; `CHALLENGE_I18N` com as mesmas chaves em pt-BR e en e sem citar o
  francês; as 11 chaves `fr.*` que o motor usa existem e não citam o francês; o `fr/app.js` não tem mais os Desafios e
  liga a linha da trilha pelo `afterModule`; a ordem de carregamento; o `<style>` do fr sem regra dos Desafios; o zh não
  carrega nada; `challengesScreenHTML()` e as duas janelas iguais às do `fr/index.html`; e um **português de mentira com
  1 desafio de cada tipo** (site em inglês, tabela `pt_challenges`, sem Ditados) ligado na página do fr só com
  `registerChallenges` e a seção vazia, claro e escuro a 390px: seção e janelas montadas, categorias em inglês sem o
  cartão Ditados, álbum e Expressão do dia, Expressão com o sentido em português e em inglês, Ouça e traduza corrigido em
  inglês com o botão "Check" da configuração, Acentuação com as regras do português (avó certa, avo/avô quase, ave
  errada) e o teclado dele (ã õ ç, sem è œ), Complete a frase com tradução e explicação em inglês, estado, revisão dos
  erros e conquistas, fila por nível, linha da trilha sem falar em ditados, sem rolagem horizontal, nenhum texto do
  francês, admin listando e aprovando na tabela do site e a importação gravando lá como pendente, nenhum erro de página.

## Regressão (2026-10-23)

Mesmos números da main (`3035549c`): `tests/desafios-album` 66/66, `desafios-cloze` 38/38, `desafios-conclusao` 19/19,
`desafios-modulo` 75/75, `tests/ditado` 58/58, `fr/scripts/test_answer_validation.js` 176/176, `paridade-sites`
(Ditados 828/828 e 41/41, Conjugação 343/343 e 45/45, css 5/5, gramática 45/45 e zh 54/54, lição 43/43 e 16/16, módulos
90/90 e zh 95/95), `familia-latina` (paridade 1 483 871 comparações, francês 60/60, português 121/121, navegador 23/23),
`modo-foco` 19/19, `i18n` (unit 2343/2343, sem_portugues_en 6/6, playwright 209/209, comparador 18/18, adversarial en sem
falha nova), `cores-marca` (20/20, 6/6, 26/26), `xp` (10/10, 18/18, 10/10, 9/9), `conquistas` (76/76, 66/66), `e4`
(core 35/35, ida e volta 26/26, lotes 5c 20/20, 5d 12/12, 5e 10/10), `conjugacao` 80/80, `planos-permissoes`
(playwright 105/105), `painel-admin` (12 arquivos, todos iguais à main).

Falhas que já existiam (iguais na main): `tests/desafios-progresso` 22/23 ("progresso: barra existe"),
`tests/e4/test_lote5b_textos.js` 9/11, `tests/painel-admin/test_reports_ui_unit.js` 29/30 (conferido no worktree da
main). Não rodados nesta etapa (fora da área): `i18n/test_content_en` 29/30, `test_card_variants_browser` 14/16, `k2c`,
`k2f`, `trilha-tags/test_unit` (falham na main, segundo o pedido).

Testes antigos ajustados de propósito (os Desafios mudaram de arquivo, não de comportamento):
- `fr/scripts/test_answer_validation.js`: os blocos `accent-challenge-logic`, `challenge-translation-logic`,
  `challenge-review-logic` e `cloze-grammar-logic` vêm de `shared/desafios.js` (o texto lido passa a ser Ditados +
  Desafios + `fr/app.js`); a Acentuação carrega o começo do motor e a `fr/desafios-config.js`, como a página.
- `tests/familia-latina/extrair-fr.js`: o código "novo" inclui `shared/desafios.js` (bloco da Acentuação), com o começo
  do motor e a configuração do francês.

## Riscos e pendências

- O `fr/index.html` continua com a marcação da seção e das duas janelas (iguais às do motor, com guarda no teste do
  motor; a única diferença de propósito é o subtítulo, que no motor vem de `ch.sub` da configuração). Se alguém mudar
  uma, tem de mudar a outra (o teste avisa).
- Os Ditados usam duas classes que agora vêm do `shared/desafios.css`: `.module-challenges` (aparência da linha
  "Revisão do A1" da trilha) e `.challenge-card-check` (cadeado do ditado Premium). Um site com Ditados e sem Desafios
  precisa carregar o `shared/desafios.css` também (hoje só o fr tem os dois). O contrário já valia: os Desafios usam o
  `.dictation-play-btn` do `shared/ditados.css`.
- Chaves com prefixo `fr.` usadas pelo motor (`fr.trail.*`, `fr.challenges.levelName`, `fr.challenges.cat.*`,
  `fr.audio.listenSlower/Slowly`, `fr.step.explanation`) têm texto geral (conferido no teste). Os nomes de campo
  `sentenceFr` e `translationPt` e o marcador `{fr}` de `ch.expr.signifies` ficaram por causa dos dados no banco.
- A trava Premium continua desligada (`CHALLENGE_PAYWALL_ENABLED`, const no motor); o caminho do cadeado não pode ser
  ligado de fora nos testes, então o código dele foi movido sem mudança, mas não exercitado.
- O texto da janela de importação (só admin) tem português fixo no HTML, como antes.
