# Revisão de arquitetura do código compartilhado (shared/core, motores, LANG_HOOKS)

Última atualização: 2026-10-24
Base: `main` em `1559776e` (depois da paridade 5d, PR #397).
Escopo: `shared/core/*.js` (com `familias/`), `shared/desafios*.js`, `shared/ditados.js`, `shared/conjugacao.js`,
`shared/conj-games.js`, `shared/checkpoint-exam.js`, `shared/review-milestone.js`, `shared/study-trail-model.js`, os `.css` novos
de `shared/`, `fr/*-config.js`, `fr/lang-hooks.js`, `zh/lang-hooks.js`, o que restou de `fr/app.js` e `zh/app.js`, e os dois `index.html`.
Foco: arquitetura e manutenção (bugs e segurança ficam com outro revisor). **Nenhum código foi alterado nesta revisão.**
**Propostas 1 a 4 da seção 9 feitas em 2026-10-26** (branch `claude/friendly-hamilton-u4ssl2`; registro em
`docs/historico/31-revisao-codigo-compartilhado.md`).

Grátis x Premium: esta revisão não cria recurso; nenhuma proposta muda o que é grátis ou Premium.

## 1. Resumo executivo

A extração deu certo no que importava: o `fr/app.js` caiu para 697 linhas de dados/configuração, os motores de Desafios,
Ditados e Conjugação têm configuração própria e documentada (`registerChallenges`, `registerDictations`, `registerConjugation`),
e não há função global repetida entre os scripts de uma página (conferido: 2264 funções globais no fr, 2076 no zh, só
`refreshNativeCardTypeBox` repetida, e de propósito). O que falta agora é **consolidar o contrato** e **tirar as suposições de
"só fr/zh"** antes que o pt seja o terceiro site a copiar tudo. Os pontos principais:

1. **`LANG_HOOKS` não tem contrato escrito em um lugar só.** São 74 ganchos de topo comuns aos dois sites, mais 1 só do fr
   (`familiaLatina`) e 6 só do zh, com cerca de 35 subchaves aninhadas (`lessonKeys` sozinha tem 24). A documentação está
   espalhada em comentários de cada arquivo de `shared/core/` e em 11 manifestos de lote (`scripts/e4-batches/*.js`). Não há
   padrões (defaults) nem validação: um gancho esquecido só aparece como `TypeError` quando a aluna chega na tela.
2. **Padrões silenciosos em francês.** Onde há padrão, ele é o texto do francês: `checkpoint-exam.js:32` cai em
   `fr.checkpoint.exam.*` ("How do you say X in French?"), `modulos-niveis.js:285` cai em `trail.levelTest.*` ("Already know
   French..."). Um site pt que esquecer `checkpointExam.keys`/`levelTestKeys` mostra "French" para a aluna, sem erro.
3. **Nomes de arquivo contam a história da refatoração, não o domínio.** `quase-iguais-simples/textos/chaves/pinyin/dados.js`,
   `estado-trilha-desafios.js`, `licao-base.js` (que tem `renderSettingsView` e `isAdminUser`) e `exercicios-licao.js` x
   `licao-exercicios.js` obrigam quem mantém a fazer `grep` para achar onde mora cada coisa.
4. **HTML e CSS ainda estão quase inteiros em dobro.** Dos ~4700 linhas de `<body>` de cada `index.html`, 4113 são iguais
   nos dois sites; das regras de CSS do `<style>` (linhas 60 a 4409 em cada site), 2348 são idênticas (~234 KB). O pt, hoje,
   nasceria copiando um `index.html` de 5,7 mil linhas.
5. **Pontos de `shared/` que só conhecem fr e zh** (o pt quebraria ou mostraria francês): `shared/study-trail-model.js:61-64`
   e `:223-226` (Field `lang:'fr'` e tradução `'pt-BR'` fixos para todo idioma não CJK), `shared/profile-placeholders.js:75,141,147,201`,
   `shared/flashcard-field-editor.js:146-149`, e listas fixas `['frances','portugues','mandarim']` em 6 arquivos, embora o
   `languages/registry.json` já tenha tudo isso (`fieldLang`, `family`, `tts.voice`, `appKey`, `modules`).
6. **Carregamento:** 153 scripts locais no fr (3,7 MB sem compressão) e 140 no zh (3,1 MB), todos em toda abertura, inclusive
   ~870 KB de painel de Admin/Professora/Banco/Anki que a aluna nunca usa. E o service worker busca tudo com
   `cache: 'no-store'` (`fr/service-worker.js:60`), o que desliga até a revalidação por ETag: cada abertura baixa tudo de novo.

## 2. Problemas críticos (antes do pt)

### C1. Contrato de `LANG_HOOKS` sem dono, sem padrões e sem validação
- Evidência: `fr/lang-hooks.js` e `zh/lang-hooks.js` são objetos literais sem cabeçalho de contrato; os comentários dizem só
  "o que muda de um idioma estudado para outro". Uso em `shared/`: `lessonKeys` (25 leituras), `textOf` (22), `familiaLatina`
  (19), `uiKey` (11), `speak` (11), `typedAnswer` (10), `reviewTyped` (10), `canSpeak` (10) e mais 70 ganchos com 1 a 4 leituras.
- Opcionais existem, mas cada arquivo trata do seu jeito: `typeof LANG_HOOKS.grammarInputExtraHTML === 'function'`
  (`gramatica-cenario.js:160`), `(typeof LANG_HOOKS !== 'undefined' && LANG_HOOKS.checkpointExam) || null` (`modulos-niveis.js:549`),
  `LANG_HOOKS.typedAttemptForm || (s => s)` (`licao-feedback.js:46`). Os obrigatórios simplesmente são chamados.
- Há 73 guardas `typeof X === 'function'` em `shared/core/`, ou seja, dependências opcionais implícitas que nenhum teste lista.
- Consequência para o pt: a lista do que fornecer está em `docs/i18n/e4-plano-de-extracao.md:139` como "os mesmos ganchos do fr
  (a lista comentada está em cada manifesto `p5d-*.js`)". Isso não é um contrato utilizável.

### C2. Chaves de texto com prefixo de idioma usadas como genéricas
- `fr/lang-hooks.js:56` usa `hintFullSentence: 'zh.hint.fullsentence'`; `zh/lang-hooks.js:95` usa
  `hintReorderTranslate: 'fr.hint.reorderTranslate'`. Código comum chama chaves `zh.path.*` e `fr.mission.*`/`fr.step.*`
  para os dois sites (`trilha-licao.js:74,90,301,331`, `licao-base.js:605-627`, `app-comum.js:123`, `quase-iguais-textos.js:211-229`,
  `estado-trilha-desafios.js:62-72,653,805,842`, `modulos-niveis.js:400-426`).
- `LANG_HOOKS.uiKey(k)` monta `'fr.'+k` / `'zh.'+k` para 9 sufixos; das 19 chaves com o mesmo sufixo nos dois prefixos em
  `shared/i18n/pt-BR.js`, **12 têm o texto idêntico** (`exercise.true`, `exercise.false`, `hint.label`, `hint.retry`, `hint.reveal`,
  `audio.listenPronunciation`, `exercise.counter`...). O pt teria de criar `pt.exercise.true` etc. só para repetir o mesmo texto.
- Não é bug hoje, mas ninguém consegue saber, olhando a chave, se ela é do francês ou genérica. É exatamente o tipo de
  coisa que gera "texto do francês no site de português".

### C3. `study-trail-model.js` supõe que todo idioma não CJK é o francês com tradução em pt-BR
- `shared/study-trail-model.js:61-64` e `:223-226`: `fields = [f(0, 'fr', vocab.f), f(1, 'pt-BR', vocab.t)]`.
- Para o pt (curso `portugues@en`), o Field do idioma estudado sairia com `lang:'fr'` e a tradução com `lang:'pt-BR'` (que, no
  pt, é justamente o idioma estudado). O `lang` do Field decide a voz sugerida no editor (`flashcard-field-editor.js:146`:
  `'fr'` vira `fr-FR`) e a exportação. O registro já tem `LanguageRegistry.studyLangOf(appKey)` (`languages/registry-api.js:43`).
- Mesmo padrão em `shared/profile-placeholders.js:141` (`studyLang === 'zh' ? 'zh' : 'fr'`), `:75` e `:201`: no pt,
  `{nacionalidade}` sairia em francês ("brésilienne"). Já estava anotado em `docs/auditoria-paridade-fr-zh.md` e na E1.

## 3. Melhorias importantes

### I1. Arquivos de `shared/core/` nomeados pelo lote da extração
| Arquivo | O que tem de fato | Nome sugerido / destino |
|:-|:-|:-|
| `quase-iguais-chaves.js` | `audioBtnHTML`, `renderMatchGame`, `renderProgressLineChart`, `buildCardsFromUnits`, `playPregeneratedAudio`, `dlgPlayLine`, lembrete de estudo | dividir: áudio para `voz.js`/`audio-fala.js`; jogo da memória e gráfico para `revisao-jogos.js`/`progresso.js`; `buildCardsFromUnits` para `trilha-licao.js` |
| `quase-iguais-dados.js` (34 linhas) | `assignTodaysMissions`, `freshDailyBucket` | `missoes.js` (junto com `EASY_CHALLENGES` de `app-comum.js:122`) |
| `quase-iguais-pinyin.js` | `renderConceptStep`, `renderTrueFalseExercise`, `renderMultipleChoiceCard` | `licao-exercicios.js` e `revisao-cartoes.js` (o nome "pinyin" engana: é comum) |
| `quase-iguais-simples.js` | prévia de áudio, máscara de palavra, abrir sessões de Revisão, sair para a trilha | `revisao-sessao.js` + `voz.js` |
| `quase-iguais-textos.js` | `addXP`, Revisão rápida, jogo da memória, telas de lição/unidade concluída | `gamificacao.js` (`addXP`) + `licao-fim.js` |
| `estado-trilha-desafios.js` (1234 linhas) | mescla de cartões da professora/próprios, missões do dia, semana/XP, conquistas, desbloqueio da trilha | `cartoes-origem.js`, `missoes.js`, `gamificacao.js`, `trilha-estado.js` |
| `licao-base.js` | Configurações, `isAdminUser`, Revisão, fim de lição, passos | `configuracoes.js` + `revisao-tela.js` + `licao-passos.js` |
| `exercicios-licao.js` x `licao-exercicios.js` | dois arquivos de exercícios com nomes espelhados | um vira `licao-montagem.js` (montar fila/XP), o outro `licao-exercicios.js` (desenhar) |

- Benefício: achar o lugar certo sem `grep`; arquivos de 200 a 600 linhas por tema; as regras de `.claude/rules/` passam a
  apontar para nomes estáveis. Como são `function` globais em scripts clássicos, mover entre arquivos não muda comportamento
  desde que (a) o novo arquivo seja carregado antes do `app.js` e (b) `const`/`let` de topo não mudem de ordem relativa ao uso.
  As capturas da 5d (`tests/paridade-sites/capturas_quase_iguais.js`) servem de prova.
- Regra que está incoerente: `shared/ditados.js:7` e `shared/desafios.js:10` dizem "não fica em `shared/core/` porque tudo de lá
  é carregado por todos os sites", mas `shared/core/familias/latina-licao.js` está em `shared/core/` e só o fr carrega. Proposta:
  `shared/core/` = carregado por todo site; `shared/core/familias/<familia>/` = por família; `shared/modulos/<recurso>/` (ou manter
  `shared/desafios*.js` etc.) = opcional por site. Escrever isso numa linha da regra `frontend-fr-zh.md`.

### I2. Nomes de função com o idioma dentro de código da família
- `latinaFr()`, `frAccentPickerHTML()`, `wireFrAccentPicker()` e a classe `.fr-accent-picker` estão em
  `shared/core/familias/latina-licao.js:69,85,114` e são chamados pelos configs. No pt, `latinaFr()` devolveria a instância do
  português. Proposta: `familiaDoSite()`, `accentPickerHTML()`, `wireAccentPicker()`, com os nomes antigos como repasse por um
  tempo (o fr continua igual). Mesmo caso em `revisao-cartoes.js:274` (`frenchSideHTML`).
- Os 4 repasses `speakFrench`/`canSpeakFrench`... (`fr/app.js:16-19`) e `speakChinese`... (`zh/app.js:12-15`) existem só para
  manter nomes antigos. Os configs e `LANG_HOOKS` podem chamar `speakStudy` direto; os repasses ficam só onde algum teste antigo
  ainda depende.

### I3. Configuração duplicada entre `LANG_HOOKS`, constantes do `app.js` e o registro de idiomas
- `LANG_HOOKS.appKey` (`fr/lang-hooks.js:15`) repete `APP_KEY` (`fr/app.js:241`), que repete `registry.json` `appKey`.
  `ttsLang` repete `tts.voice`; `LANG_ID` repete `id`; `LANGUAGE_STUDY_NAME = 'francês'` (`fr/app.js:243`, usado em
  `shared/wizard.js:156`) é texto em português fixo, quando o registro já tem `names[siteLang].short`.
- `studyNotifKey`, `FEEDBACK_SOUND_KEY`, `CLOZE_MODE_KEY`, `TRAIL_VIEW_KEY`, `CHALLENGES_STRIP_COLLAPSE_KEY` seguem todas o
  padrão `<appKey>_<nome>`; podem virar `siteKey('cloze_mode')` em `shared/` e sair dos `app.js`.
- `pregenRate` e `ttsRate` (0,9 nos dois, por decisão de 2026-10-23) são regra de produto, não de idioma: deveriam ser constantes
  comuns, com `registry.json` `tts.baseRate` como exceção aprovada.
- Proposta: um `shared/core/site.js` que lê `LanguageRegistry.byId(LANG_ID)` e expõe `SITE = { id, appKey, locale, fieldLang,
  family, studyName(), key(nome) }`. O site declara só `LANG_ID`.

### I4. Listas fixas de idiomas em `shared/`
`['frances','portugues','mandarim']` ou equivalente em `review-bank.js:141,419,629`, `review-bank-import.js:15`,
`teacher-panel.js:106`, `teacher-invites.js:47,77`; e regras `=== 'mandarim'` em `review-bank-model.js:66,81,116`,
`review-bank.js:457`, `my-flashcards.js:89`. Trocar por `LanguageRegistry.appKeys()` e por uma propriedade do registro
(ex.: `needsTranscription: true` no zh, em vez de `=== 'mandarim'`). Assim o 4º idioma não exige caçar listas.

### I5. `STATE` e listas de missões quase iguais nos dois `app.js`
- O `STATE` do fr (`fr/app.js:100-235`) e o do zh (`zh/app.js:211-357`) diferem em ~10 campos (hanzi, histórias, ditados,
  `levels`); o resto (mais de 100 linhas) é igual, comentários incluídos. Proposta: `createBaseState()` em `shared/core/` e o site
  faz `Object.assign(createBaseState(), { hanziCards: ..., hanziLessonProgress: {} })`.
- `GENERAL_CHALLENGES` (`fr/app.js:348`, `zh/app.js:493`): 5 de 6 missões iguais; a lista de Revisão (`REVISAO_*_CHALLENGES`)
  divide 4 de 5. Pela regra "decisão vale para todos os sites", missões são regra de produto: a lista comum vai para
  `shared/core/missoes.js` e o site só acrescenta as próprias (conjugação no fr, hanzi no zh).
- `estado-salvar.js:12-38,62,93,103,132` grava/lê `hanziCards`, `hanziLessonProgress`, `storyProgress` pelo nome. Funciona
  (testa `'campo' in STATE`), mas é o núcleo comum conhecendo recurso do zh. Alternativa: `registerStateSlice({ name, save, load })`
  que o recurso registra. Prioridade baixa: só vale quando aparecer o 3º recurso com estado próprio.

### I6. `switchTab` do fr conhece variáveis internas dos motores
`fr/app.js:499-540`: a aba `dictation` mexe em `dictationModuleFilter`/`pendingDictationModuleFilter` e a aba `challenges` em
`challengesModuleFilter`/`pendingChallengesModuleFilter` e chama `applyChallengeI18n()`. São detalhes dos motores. Proposta:
cada motor expõe `openDictationTab()` / `openChallengesTab()` e o site só liga `dictation: openDictationTab`. Mesmo para
`stopDictationAudio` no `onBeforeSwitch`: um registro `onLeaveTab` dos motores.
- Acoplamento Ditados x Desafios: `fr/ditados-config.js` passa 7 ganchos que apontam para os Desafios (`paywallEnabled`,
  `premiumUnlocked`, `tierBadgeHTML`, `progressHTML`, `openPremium`, `backToChallenges`, `clearChallengesFilter`) e
  `staticI18n: false` porque `applyChallengeI18n` já traduz os textos dos Ditados. É razoável (os Ditados moram dentro da aba
  Desafios), mas o pt vai precisar copiar esses 7 ganchos iguais. Proposta: `shared/desafios.js` oferecer
  `dictationsInsideChallenges()` que devolve esses 7 ganchos prontos, e o config faz `...dictationsInsideChallenges()`.

### I7. HTML estático duplicado (index.html x `*ScreenHTML`)
- `challengesScreenHTML()` (`shared/desafios-telas.js:1055`), `dictationScreenHTML()` (`shared/ditados.js:873`) e `conjScreenHTML()`
  (`shared/conjugacao.js:779`) são cópias das seções `#view-challenges` (`fr/index.html:5025`), `#view-dictation` (`:4996`) e
  `#view-conjugaison` (`:4700`). O motor só monta se a seção estiver vazia. Duas fontes da mesma marcação; a guarda
  (`test_*_motor.js`) prova que são iguais, mas toda mudança precisa ser feita duas vezes.
- Proposta (pequena): esvaziar as três seções no `fr/index.html` e deixar o motor montar, como o pt fará. A guarda passa a
  conferir só que a seção está vazia. Risco baixo: o `mountChallengesScreen` já roda antes dos listeners e aplica i18n; validar
  com as capturas existentes (`capturas_desafios.js`, `capturas_ditados.js`, `capturas_conjugacao.js`). Detalhe a corrigir junto:
  `challengesScreenHTML` usa `data-i18n="fr.dictation.backToChallenges"` (chave com prefixo fr em marcação comum).

### I8. `index.html` de 5,7 mil linhas por site
- Corpo: 4113 de ~4700 linhas iguais. CSS: 2348 de 2463 regras do fr idênticas às do zh (~234 KB). Os `.css` de `shared/` novos
  (`desafios.css`, `ditados.css`, `conjugacao.css`, `modulos-niveis.css`, `gramatica-cenario.css`, `licao-feedback.css`) mostram o
  caminho, mas o grosso continua inline.
- Proposta em duas fases, sem bundler:
  1. **CSS**: mover as regras idênticas para `shared/app.css` (carregado logo depois do `<style>` de tokens do site); cada site fica
     só com `:root` (tokens de cor) e o que é dele. Ganho extra: o CSS passa a ser cacheável e comum aos sites.
  2. **HTML**: um gerador `scripts/gerar-index.js` que monta `<site>/index.html` a partir de `shared/html/*.html` (casca, Revisão,
     Perfil, Configurações, painéis) e `<site>/html/*.html` (abas próprias), e grava o resultado no repositório, como já se faz
     com `languages/registry.js` ("ARQUIVO GERADO"). O site continua estático e sem build na publicação; um teste confere que o
     arquivo gravado é igual ao gerado. Alternativa sem gerador: o mesmo mecanismo `mount*Screen` para cada aba comum.
- Visível para a aluna: não (se as capturas forem iguais). Risco médio: ordem de CSS (especificidade) e ids que scripts leem no
  carregamento.

## 4. Sugestões menores

- `fr/conj-games.js` (dados) e `shared/conj-games.js` (motor) têm o mesmo nome; renomear os dados para `fr/conj-games-data.js`
  (como `conjugation-data.js`).
- Cabeçalho do `fr/app.js:1-13` ainda descreve o app de antes ("Adaptado do motor do app de chinês", "Aba Manual removida",
  `docs/PARIDADE.md`). Trocar por 5 linhas: o que este arquivo é hoje e o que um site novo precisa ter nele.
- `fr/service-worker.js` e `zh/service-worker.js` são iguais fora o nome do cache e a lista de pré-cache; a lista do fr ainda
  inclui `./challenges.js`, que não é mais carregado (`fr/index.html:5536`). Proposta: `shared/sw-base.js` via `importScripts`,
  e o `<site>/service-worker.js` só declara nome e lista.
- `refreshNativeCardTypeBox` definida 3 vezes (`flashcard-mc-editor.js:309`, `flashcard-typeanswer-editor.js:288`,
  `flashcard-cloze-editor.js:739`), "a última vence" pela ordem dos scripts. Fora do escopo desta extração, mas é o único caso
  e é frágil: trocar por um registro `registerCardTypeEditor(mode, fn)`.
- `ANKI_EXPORT_CONFIG` (`fr/app.js:559-650`, `zh/app.js:1610-1715`) tem cores fixas (`#1D5A82`, `#FAF5EA`) e estrutura quase igual
  nos dois; candidato a `buildAnkiExportConfig({ fields, colors, guidPrefix })` em `shared/anki-export.js`.
- `UNIT_ICONS` é dado de conteúdo dentro do `app.js`; caberia em `content.js` (campo `icon` da unidade) ou na camada.
- O supabase-js vem de `@supabase/supabase-js@2` (versão maior, não exata) no CDN; fixar a versão evita mudança silenciosa e
  melhora o cache.

## 5. Contrato único proposto para `LANG_HOOKS`

### 5.1. Onde
Um arquivo só, `shared/core/lang-hooks-contrato.js`, carregado antes de `<site>/lang-hooks.js`, com:
```js
// Cada entrada: tipo, se é obrigatória, o padrão (só quando o padrão é NEUTRO, nunca texto de um idioma) e onde é usada.
const LANG_HOOKS_CONTRATO = {
  speak:            { tipo: 'function', obrigatorio: true,  usadoEm: 'voz.js, licao-*' },
  textOf:           { tipo: 'function', obrigatorio: true,  usadoEm: 'licao-exercicios.js (22 usos)' },
  lessonKeys:       { tipo: 'object',   obrigatorio: true,  chaves: ['counter', 'whatMeans', /* ... as 24 */] },
  typedAttemptForm: { tipo: 'function', padrao: (s) => s },
  checkpointExam:   { tipo: 'object',   obrigatorioSe: 'MODULES ou LEVEL_TESTS' },
  levelTestKeys:    { tipo: 'object',   obrigatorioSe: 'LEVEL_TESTS' },
  familiaLatina:    { tipo: 'object',   obrigatorioSe: 'family === "latin"' },
  // ...
};
function defineLangHooks(site){ /* aplica padrões, confere obrigatórios, congela, devolve */ }
```
E o site passa a escrever `const LANG_HOOKS = defineLangHooks({ ... })`. Em produção, gancho obrigatório faltando gera
`console.error` com o nome (e o resto do app continua); nos testes, falha.

### 5.2. O que entra (inventário de hoje)
- **Obrigatórios para todo site (74 de topo):** voz (`speak`, `speakAudioOnly`, `loadVoice`, `canSpeak`, `ttsText`,
  `voiceMissingKey`, `audioRetryFailedKey`, `audioListenKey`); texto do item (`textOf`, `recapText`, `dlgLineText`, `phraseSpoken`,
  `clozeSpoken`, `foldCase`); marcação (cerca de 30 `*HTML`); correção (`typedAnswer` com 4, `reviewTyped` com 5,
  `grammarAnswerVerdict`); chaves (`lessonKeys` com 24, `trueFalseHintKeys` com 2, `uiKey`); trilha (`unitEyebrow`, `trailMap`,
  `trailAfterUnit`, `afterOpenUnit`, `fullSentenceExercises`); dados (`revisaoPool`, `revisaoFallbackId`, `dailyExtra`,
  `chartLearnedDates`, `badgeLevel`, `vocabCardSwap`, `refreshExtraCards`).
- **Com padrão neutro (deveriam deixar de ser obrigatórios):** `recapExtra: () => ''`, `tfPinyinHTML: () => ''`,
  `promptPinyinHTML: () => ''`, `wireIntroCard: () => {}`, `afterOpenUnit: () => {}`, `trailAfterUnit: () => null`,
  `fullSentenceExercises: () => []`, `refreshExtraCards: () => {}`, `typedAttemptForm: s => s`, `cardOriginTitle` (o fr e o zh
  passam a função comum de `revisao-cartoes.js:356`, então o gancho nem precisa existir), `chartEmptyHTML`, `reviewEmptyEmoji`.
- **Opcionais por recurso:** `checkpointExam`, `checkpointScore`, `levelTestKeys`, `examScreenOpened`, `grammarInputExtraHTML`,
  `wireGrammarInputExtra` (hoje só o zh declara; o fr cai nos padrões de francês).
- **Por família:** `familiaLatina` (fr hoje; pt amanhã).
- **Sair do `LANG_HOOKS` e ir para o registro:** `appKey`, `studyNotifKey`, `ttsLang`, `ttsRate`, `pregenRate` (ver I3).

### 5.3. Regra de padrões
Padrão só quando é neutro (vazio, identidade, `null`). Nunca padrão com texto do francês: hoje `checkpoint-exam.js:32` e
`modulos-niveis.js:285` fazem isso. Mudar para: o fr declara `checkpointExam.keys` e `levelTestKeys` explicitamente
(com as mesmas chaves de hoje: nada muda para a aluna), e o padrão vira "obrigatório quando o site tem módulos/Teste de Nível".

### 5.4. Teste que falha quando um site novo esquece um gancho
`tests/paridade-sites/test_contrato_lang_hooks.js` (Node, sem navegador):
1. Descobre os sites como `test_css_compartilhado.js` (pasta com `index.html` + `app.js`).
2. Carrega `shared/core/lang-hooks-contrato.js` e o `<site>/lang-hooks.js` num `vm` com `t`, `escapeHTML` etc. de mentira.
3. Para cada entrada do contrato: confere tipo, obrigatoriedade (lendo `registry.json` para `family`/`modules`/`hasLevelTest`),
   e cada subchave de `lessonKeys`/`typedAnswer`/`reviewTyped`.
4. Confere que toda chave de texto devolvida (`lessonKeys.*`, `*Key`, `levelTestKeys.*`, `checkpointExam.keys.*`) existe em
   `shared/i18n/pt-BR.js` e `en.js` **e** não tem prefixo de outro site (`'zh.'` no fr, `'fr.'` no zh e no pt).
5. Varre `shared/**/*.js` por `LANG_HOOKS\.(\w+)` e falha se aparecer um gancho que não está no contrato (gancho novo sem
   documentação).

## 6. Prontidão para o site de português (pt)

### 6.1. O que um site novo precisa fornecer (lista exata, hoje)
| Item | Arquivo | Observação |
|:-|:-|:-|
| Entrada no registro | `languages/registry.json` (já existe, `enabled:false`) + `node scripts/build-registry.js` | `modules: []` hoje; o campo não é lido por nenhum código |
| Conteúdo base | `pt/content.js` (`UNITS`, `LEVELS`, `MODULES`, `LEVEL_TESTS` se houver) com `k` congelado | formato do fr (campo `f` = texto no idioma estudado) |
| Camada do curso | `courses/pt-en/layer.js` | o pt só tem site em inglês |
| Currículo | `pt/curriculum-changes.js` e `pt/published_ids.json` | regra de `conteudo-trilha.md` |
| Áudio | `pt/audio-manifest.js` e `pt/audio/` | `tts.voice` pt-BR |
| Ganchos | `pt/lang-hooks.js` com os 74 ganchos + `familiaLatina` do pt (rascunho em `shared/core/familias/latina-idiomas.js`) + `checkpointExam.keys` e `levelTestKeys` se tiver módulos | sem contrato escrito (C1) |
| App | `pt/app.js`: `STATE`, `APP_KEY`, `LANG_ID`, `LANGUAGE_STUDY_NAME`, `LEVEL_DESCRIPTIONS`, `REALITY_NOTE_LEVEL_GUIDANCE`, listas de missões, `BADGE_MODES`, `UNIT_ICONS`, chaves de `localStorage`, `switchTab` com `tabHandlers`, `ANKI_EXPORT_CONFIG`, os 10 `wire*()` e `initAuth()` | cerca de 600 linhas copiadas do fr; I3 e I5 reduzem a ~150 |
| HTML | `pt/index.html` inteiro (5,7 mil linhas, ~4100 iguais às dos outros) com a ordem exata de ~150 `<script>` | I8 |
| CSS | `:root` com tokens do pt (3 blocos de tema) + cópia do `<style>` comum + os 6 `.css` de `shared/` | I8 |
| Chaves de texto | `pt.*` em `shared/i18n/en.js` para os 9 sufixos de `uiKey` e as 24 de `lessonKeys`, mais as de missões, Teste de Nível, prova do módulo, voz faltando, Anki | hoje há 0 chaves `pt.*` |
| PWA | `pt/manifest.json`, `pt/service-worker.js`, ícones e logo | SW duplicado |
| Recursos opcionais | `pt/conj-config.js` + dados; `pt/ditados-config.js` + `pt/dictations.js`; `pt/desafios-config.js` + dados de desafios | motores prontos |
| Testes | incluir `pt` nas listas fixas de ~30 testes | só `test_css_compartilhado.js` descobre sites sozinho |

### 6.2. O que ainda supõe só fr/zh (o pt quebraria ou mostraria francês)
1. `shared/study-trail-model.js:61-64,223-226`: Field `lang:'fr'` e tradução `'pt-BR'` fixos (C3).
2. `shared/profile-placeholders.js:75,141,147,201`: nacionalidade em francês para todo não zh.
3. `shared/flashcard-field-editor.js:146-149`: `suggestedTtsLanguageForFieldLang` sem `'pt'` (o Field do pt é `'pt'` no registro).
4. `shared/checkpoint-exam.js:32` e `shared/core/modulos-niveis.js:285`: padrões com texto que cita o francês (C1).
5. Chaves comuns com o francês no texto, sem chave por site: `toast.voiceMissingFr` (o fr usa; o pt precisa da sua),
   `settings.export.descFr`, `ankiExport.field.french`, `trail.levelTest.*`, `admin.analytics.prog.unitsNote` ("grammar units in French").
6. `LANGUAGE_STUDY_NAME` em português fixo (`fr/app.js:243`); no pt o site é em inglês.
7. Listas fixas de idiomas no Banco e no painel (I4); `review-bank-model.js` decide pinyin por `=== 'mandarim'`.
8. `familiaLatina.textos` do fr chama `t('fr.dict.*')`; o pt precisa de `pt.dict.*` em `en.js` (o rascunho do pt tem os textos em
   inglês no próprio arquivo: decidir um padrão só).
9. A tabela `challenges` só tem desafios do fr (`registerChallenges` aceita `table`/`publishedRpc`, então o motor está pronto; o
   banco não). Pendente da dona ("aos poucos depois").
10. Cerca de 30 testes com `['fr','zh']` fixo (lista na seção 7).

## 7. Testes: o que a rede de paridade cobre e o que falta

Cobre bem: equivalência antes x depois (`test_quase_iguais.js`, cena a cena contra a REF `2e229930`), CSS de classes usadas por
`shared/` (`test_css_compartilhado.js`, descobre sites), cada motor (`test_*_motor.js`), função de `shared/core` redefinida num
`app.js` (`tests/e4/test_core_carregado.js`).

Limites:
- `test_quase_iguais.js` compara com um commit fixo; cada mudança legítima de comportamento vai exigir mover a REF ou listar
  "correções" (já tem uma em `CORRECOES`). Serve para refatorações, não como guarda permanente. Registrar isso no cabeçalho.
- Nada confere o conjunto de ganchos (seção 5.4).
- Cerca de 30 testes têm `['fr','zh']` ou `'fr,zh'` fixos (ex.: `tests/paridade-sites/test_voz.js`, `test_atalhos.js`,
  `test_licao_feedback*.js`, `test_gramatica_cenario.js`, `tests/placeholders/test_placeholders_unit.js`, `tests/trilha-tags/*`,
  `tests/conquistas/test_playwright.js`). Quando o pt existir, eles passam sem testar o pt.

Guardas propostas (todas pequenas):
1. `test_contrato_lang_hooks.js` (seção 5.4).
2. `tests/lib/sites.js` com `descobrirSites()` (mesma regra do teste de CSS) e trocar as listas fixas por ela, começando pelos de
   `tests/paridade-sites/`.
3. `test_ordem_scripts.js`: os scripts de `shared/` que todo site carrega aparecem na mesma ordem relativa em todos os
   `index.html`, e `lang-hooks.js` vem antes do primeiro arquivo de `shared/core/` que lê `LANG_HOOKS` no topo.
4. `test_globais_unicas.js`: nenhuma função global definida em dois scripts da mesma página (lista de exceção com motivo:
   `refreshNativeCardTypeBox`). Foi exatamente o que conferi à mão nesta revisão.
5. `test_sem_idioma_fixo.js`: em `shared/` (fora de `i18n/`), barrar novas ocorrências de `=== 'fr'`, `=== 'zh'`, `'frances'`,
   `'mandarim'`, `'portugues'` e de chaves `'fr.`/`'zh.` fora de uma lista de exceções conhecida (a de hoje, para reduzir com o tempo).
6. `test_cabecalho_motores.js`: cada `register*` documenta obrigatórios e padrões no cabeçalho (já é assim em Ditados) e falha
   cedo, no `register*`, se faltar um obrigatório (hoje `registerChallenges` e `registerConjugation` não conferem nada;
   `registerConjugation` lê `cfg.groups`/`cfg.tenses` direto e quebra com mensagem genérica).

## 8. Desempenho de carregamento (sem bundler)

Medido: fr carrega 153 scripts locais (3775 KB sem compressão) + 3 de CDN (jszip, sql.js, supabase-js); zh 140 (3120 KB) + 4.

| Grupo | Tamanho aprox. | Quem usa | Proposta |
|:-|:-|:-|:-|
| Admin, Professora, Banco de Revisão, materiais, analytics, `desafios-admin.js`, `painel-ui.js`, Anki import/export | ~870 KB | professora/admin; Anki raramente | carregar sob demanda ao abrir o painel ou a importação (`loadScriptsOnce([...])` com uma Promise), mesmo padrão que `i18n.js:238` já usa para `en.js` |
| jszip + sql.js (CDN) | ~1 MB com wasm | só importar/exportar Anki | sob demanda no clique |
| `fr/conjugation-data.js` | 312 KB | só a aba Conjugação | sob demanda ao abrir a aba |
| Desafios/Ditados/Conjugação (motores e dados, fr) | ~600 KB | abas próprias | segunda fase, depois de medir |
| `shared/i18n/pt-BR.js` | 272 KB | site em pt-BR | já é carregado sempre; o `en.js` já é sob demanda: ok |

E o ponto que mais pesa, com mudança de uma linha: o service worker usa `fetch(event.request, { cache: 'no-store' })`
(`fr/service-worker.js:60`, `zh/service-worker.js:59`). Isso ignora o cache HTTP inteiro, sem nem revalidar por ETag: cada
abertura baixa os ~150 arquivos completos. Trocar por `cache: 'no-cache'` mantém o "sempre a versão nova" (o navegador
pergunta ao servidor) e devolve 304 sem corpo para o que não mudou. Invisível para a aluna, exceto pela abertura mais rápida.
Validar com `teste-navegador` (SW ligado) e na publicação.

## 9. Propostas em ordem de prioridade

| # | Proposta | Benefício | Esforço | Risco | Muda algo visível? |
|:-|:-|:-|:-|:-|:-|
| 1 | **FEITO (2026-10-26)** Contrato único `LANG_HOOKS` com `defineLangHooks` + `test_contrato_lang_hooks.js` (5.x) | pt nasce com lista exata; gancho esquecido falha no teste | médio | baixo | não |
| 2 | **FEITO (2026-10-26)** Tirar padrões com texto do francês (fr declara `checkpointExam.keys`/`levelTestKeys`; padrão vira obrigatório) | evita "French" no pt | pequeno | baixo | não |
| 3 | **FEITO (2026-10-26)** `study-trail-model.js` e `profile-placeholders.js` lendo o registro (`studyLangOf`, idioma do site) + `'pt'` no editor de Field | pt funcional na Revisão, no editor e nos placeholders | pequeno | médio (ids/fields dos cartões da trilha: provar com ida e volta) | não no fr/zh |
| 4 | **FEITO (2026-10-26)** `cache: 'no-cache'` no service worker | abertura muito mais leve | pequeno | baixo | só velocidade |
| 5 | `tests/lib/sites.js` + guardas 3, 4 e 5 da seção 7 | testes passam a incluir o pt sozinhos; barra regressão a "só fr/zh" | pequeno | nenhum | não |
| 6 | Chaves de texto neutras: renomear `zh.path.*`/`fr.mission.*`/`fr.step.*` usadas por código comum e os 12 `uiKey` idênticos para um prefixo comum (com apelidos antigos durante a transição) | o pt não precisa repetir textos; fim das chaves cruzadas | médio | baixo (texto igual) | não |
| 7 | `shared/core/site.js` (I3) + listas de idiomas pelo registro (I4) | menos constantes por site; 4º idioma sem caça a listas | médio | baixo | não |
| 8 | Reorganizar `shared/core/` por domínio (I1) + nomes neutros na família latina (I2) | manutenção; regras apontam para nomes estáveis | médio | baixo (funções globais; provar com as capturas 5d) | não |
| 9 | CSS comum em `shared/app.css` e HTML comum gerado/montado (I8, I7) | pt sem copiar 5,7 mil linhas; mudança de tela em um lugar | grande | médio (ordem de CSS, ids lidos no boot) | não, se as capturas baterem |
| 10 | Carregamento sob demanda do painel/Anki/conjugação (seção 8) | ~2 MB a menos na abertura da aluna | médio | médio (ordem de dependências; `typeof` nas chamadas) | não |

Depois desses: `createBaseState()` e missões comuns (I5), `openDictationTab`/`dictationsInsideChallenges` (I6), SW base, Anki config
comum, registro de editores de cartão.

## 10. Próximos passos sugeridos
1. A dona escolhe quais propostas entram e em que ordem; nada foi implementado.
2. Se aprovadas 1, 2, 3 e 5, fazê-las num PR só, antes da E5 do pt: é o que transforma "copiar o fr" em "preencher um contrato".
3. 6, 7 e 8 podem andar em paralelo com o piloto do pt (são mecânicas e provadas pelas capturas).
4. 9 e 10 pedem prévia e medição (capturas fr/zh claro/escuro/celular; tempo de abertura com SW ligado).
