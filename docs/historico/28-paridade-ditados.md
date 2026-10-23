# 28. Paridade, etapa 5b: Ditados em código comum (2026-10-23)

Pedido da dona (2026-10-23): mover para código compartilhado tudo o que é geral e hoje vive só no `fr/app.js`. Etapa 5b:
os **Ditados**. Branch `claude/friendly-hamilton-u4ssl2`, sem PR. Continua `27-paridade-conjugacao.md` (mesmo molde:
motor em `shared/` + configuração do idioma em `fr/`, mesmos nomes de função, mesma ordem de carregamento, provas de
equivalência e capturas pixel a pixel).
Grátis x Premium: igual ao fr de antes. Um ditado Free por módulo (e o Free da "Revisão do A1"); os outros são Premium só
com o selo, porque a trava está desligada (`CHALLENGE_PAYWALL_ENABLED = false`). O ditado não dá XP (como sempre) e conta
para as conquistas (trilha Ditado, nota 90 ou mais).
Categoria B para o zh: **o zh não carrega nada** (a dona decide se o chinês terá Ditados).

## O que foi para código comum

`shared/ditados.js` (novo; não fica em `shared/core/` porque tudo de lá é carregado por todos os sites, e o zh não tem
Ditados). As **39 funções** dos Ditados saíram do `fr/app.js` com o mesmo nome e o mesmo texto (o `fr/app.js` perdeu ~770
linhas):

- Lista e Free x Premium: `dictationModuleFilter`, `pendingDictationModuleFilter`, `dictationTier`, `dictationsVisible`,
  `isDictationLocked`, `isDictationDone`, `dictationTask`, `isLevelReviewId`, `moduleTitleFor`, `escapeHtmlDictation`,
  `dictationCardProgressHTML`, `renderDictationList`.
- Linha da trilha "Revisão do A1" (só de ditados): `buildLevelReviewRow`. A linha "Desafios do Módulo N"
  (`buildModuleChallengesRow`) ficou no fr: é dos Desafios (só conta os ditados do módulo).
- Player e áudio: `dictationAudioPath`, `dictationSentenceAudioPath`, `stopDictationSentenceAudio`,
  `playDictationSentence`, `stopDictationAudio`, `openDictationPlayer`.
- Correção (bloco `dictation-answer-logic`, com os marcadores, que os testes extraem): `normalizeDictationWord`,
  `dictLooseNorm`, `dictLightReason`, `frenchNumberWords` (nome antigo mantido; usa o número por extenso da família do
  idioma), `prepareDictationUserText`, `tokenizeDictationText`, `mergeSplitCompoundWords`, `diffDictationWords`,
  `mergeDictationDiff`, `evaluateDictation`, `classifyDictationError`, `dictDisplayWord`, `dictationWrongWords`,
  `sanitizeDictationRecord`, `updateDictationRecord`, `dictIsAbbreviation`, `splitDictationSentences`,
  `dictationSentenceErrorFlags`. A comparação em si continua em `shared/core/familias/latina.js` (fase 2 da família latina).
- Resultado: `dictationScoreColorVar`, `dictationWordHtml`, `dictationLightNoteText`, `renderDictationResult`.
- Novas: `registerDictations(cfg)`, `dictCfg()`, `dictLatina()`, `dictSentAbbreviations()`, `dictTpZero()`, `dictT()` e
  `DICTATION_I18N` (os 46 textos `dict.*` de pt-BR e de en que estavam no `CHALLENGE_I18N` do `fr/app.js`, mesmos
  textos e mesma ordem; o `chT` dos Desafios procura lá também, então os textos fixos da seção continuam traduzidos pelo
  `applyChallengeI18n`; `dict.count.*` ficou nos Desafios, que é quem usa), `dictationScreenHTML()` (a marcação da seção,
  para site novo), `applyDictationI18n()` e `wireDictationScreen()` (os listeners que eram de nível superior no
  `fr/app.js`: os 2 da janela para arrastar a barra e os 3 botões da seção, na mesma ordem; o fr chama no mesmo ponto).

`shared/ditados.css` (novo, `<link>` no fr depois do `<style>` e do `shared/conjugacao.css`): todas as regras do Ditado
que estavam no `<style>` do `fr/index.html`, na mesma ordem (base, passada de design dos Desafios, lista, "mesma
linguagem das atividades"). As 24 regras de seletor misto (`.challenge-card, .dictation-card`...) foram divididas: a parte
dos Desafios ficou no lugar, a do Ditado foi para o arquivo novo. `.dictation-play-btn` também é usado pelos Desafios do fr
(Ouça e traduza, Acentuação, exemplos) e vem do arquivo comum; o áudio lento (`.dictation-play-btn-slow`, `.audio-btn-*`)
ficou no fr. As capturas provam que a mudança de lugar na cascata não mudou nada.

## O que ficou na configuração do fr (`fr/ditados-config.js`, carregado depois do motor e antes do `app.js`)

Os dados continuam em `fr/dictations.js` (`DICTATIONS`, `DICTATION_AUDIO_EN_READY`) e a tarefa em inglês em
`fr/challenges.en.js` (`DICTATIONS_I18N`). Próprio do francês: `lang: 'fr'`, a família latina com a configuração do
francês (`familia: () => latinaFr()`: pontuação falada, números por extenso, homófonos, concordância, ligadura œ, elisão
e as explicações), os caminhos dos mp3 (o guiado com a versão em inglês quando existir, e o de cada frase), as
abreviações que não fecham frase (`M.`, `Mme.`... iguais às de `fr/scripts/dictation_sentences.py`, com guarda no teste
do motor), a voz (`canSpeakFrench`/`speakFrench`), o teclado (`frAccentPickerHTML`/`wireFrAccentPicker`) e os ganchos dos
Desafios (trava Premium, selo, barra de progresso, janela Premium, o "voltar aos desafios"), porque no fr os Ditados
vivem dentro da aba Desafios.

## Configuração (o "gancho" de cada idioma)

`registerDictations({...})`: obrigatórios `dictations` e `familia`; o resto tem padrão. Campos: `lang`,
`taskTranslations`, `audioPath`, `sentenceAudioPath`, `sentenceAbbreviations`, `canSpeak`, `speak`, `accentPickerHTML`,
`wireAccentPicker`, `paywallEnabled`, `premiumUnlocked`, `tierBadgeHTML`, `progressHTML`, `openPremium`,
`backToChallenges`, `clearChallengesFilter`, `staticI18n`. A lista comentada está no topo de `shared/ditados.js`.

## Como o site de português liga os Ditados (quando a dona quiser)

1. Dados: `pt/dictations.js` (mesmo formato: `{ id, moduleId, level, text, free }`), a tarefa em cada idioma de site do
   curso (conteúdo nasce traduzido; hoje só en no /pt) e os mp3 (`audio/dictation-<id>-guided.mp3` e por frase), com
   abreviações do português no gerador das frases.
2. `pt/ditados-config.js` com `registerDictations({ lang: 'pt', dictations, familia: () => latinaPt(), ... })`: a
   configuração do português da família latina já existe (`shared/core/familias/latina-idiomas.js`, que vai para
   `pt/lang-hooks.js`), com números, contrações, reforma ortográfica, homófonos e as explicações em inglês.
3. `pt/index.html`: `<div class="view" id="view-dictation"></div>` vazio (o motor monta e traduz), `<link>` do
   `shared/ditados.css` depois do `<style>`, scripts na ordem dados -> `shared/ditados.js` -> `ditados-config.js` ->
   `app.js`; no `app.js`, `wireDictationScreen()`, `dictation: () => { dictationModuleFilter = pendingDictationModuleFilter;
   pendingDictationModuleFilter = null; renderDictationList(); }` nos `tabHandlers`, `stopDictationAudio()` ao trocar de
   aba, `STATE.dictations` e `STATE.dictationsAced` (com `sanitizeDictationRecord` ao juntar o progresso) e, se quiser, a
   linha `buildLevelReviewRow(nível)` na trilha.
4. Sem aba Desafios, o "voltar" da lista vai para a trilha (padrão) e não há trava nem selo (padrão).

## Provas (2026-10-23)

- Equivalência (`tests/paridade-sites/test_ditados.js`, 828/828): a mesma sequência no fr da main (`11ddcb84`, worktree
  temporário) e no fr desta árvore, no navegador. **820 de 820 cenas iguais**: a correção de **735 respostas** (21 ditados
  x 35 variações: certa, minúsculas, maiúsculas, sem acento, acento trocado, sem pontuação, sem pontuação final, sem
  hífen, hífen colado, sem apóstrofo, apóstrofo com espaço, apóstrofo e aspas curvos, œ -> oe, espaços e quebras, número
  em dígito, pontuação falada, homófonos nos dois sentidos, concordância, palavra faltando, palavra a mais, trocadas, erros
  de digitação com semente, só metade, frases invertidas, repetida, uma palavra, lixo, abreviações, "etc.", sem espaço
  antes da pontuação, ponto e vírgula), com notas, frases marcadas, palavras para revisar e o registro encadeado; os
  casos soltos (erro leve de hífen/apóstrofo/ligadura/acento, números 0 a 100 por extenso, registros estragados, divisão
  de frases com M./Mme./iniciais/etc./n°.); a lista (geral, por módulo, "Revisão do A1", progresso, os "voltar"); a linha
  "Revisão do A1" da trilha (A1, A2 e o clique); o player (tocar, pausar, -15/+15, tempo, barra arrastada, velocidade,
  volume e mudo, voltar ao início, erro de áudio, teclado de letras, Verificar vazio); **as 735 respostas renderizadas
  pelo DOM** com `STATE.dictations`, `STATE.dictationsAced`, XP, missões, estado salvo e conquistas depois de cada
  ditado; áudio por frase (mp3 e 404 caindo na voz); site em inglês. Só a hora do `lastAt` é trocada por DATA (o
  relógio do teste anda com o tempo real).
- Capturas antes x depois (`tests/paridade-sites/capturas_ditados.js` + `tests/e4/comparar-capturas.js`, tolerância 0),
  claro/escuro, 390 e 1200px: **52/52 iguais** (0 pixel diferente). Cenas: aba Desafios (cartão Ditados), lista,
  explicação aberta, cartão com o mouse em cima, lista do módulo com progresso, "Revisão do A1", player, campo com foco e
  letra do teclado, resultado com erros marcados, frase tocando, resultado perfeito, resultado com erros leves e a linha
  da trilha. A main contra ela mesma também dá 52/52 (o mp3 fica sem resposta e a rolagem do resultado sem animação,
  porque o tempo total do áudio e a rolagem suave chegavam em momentos diferentes). Arquivos em
  `scratchpad/etapa5b/antes` e `depois` da sessão.
- Motor independente do francês (`tests/paridade-sites/test_ditados_motor.js`, 41/41): o motor não cita dado, voz,
  teclado, abreviação nem função do francês ou dos Desafios do fr; as abreviações do fr são as do gerador dos mp3;
  `dictationScreenHTML()` é igual à seção do `fr/index.html`; o `<style>` do fr não tem mais regra do Ditado; o zh não
  carrega nada; e um **português de mentira com 1 ditado** (site em inglês, como o /pt) ligado na página do fr só com
  `registerDictations` (família latina do português) e a seção vazia, claro e escuro a 390px: textos fixos em inglês,
  lista com a tarefa em inglês, player com `lang="pt"` e o teclado do português, correção com as regras do português
  (acento = erro leve em Olá/São/está, número 25 -> "vinte e cinco", contração "em o" -> "no", homófono esta/está,
  troca Anna/Ana), notas em inglês, 4 frases marcadas, frase sem mp3 na voz do idioma, registro e conquistas, trava
  Premium de um 2º ditado abrindo a janela do site, "voltar" para a trilha, sem rolagem horizontal, nenhum texto do
  francês e nenhum erro de página.

## Regressão (2026-10-23)

Comparada com a main (`11ddcb84`) num worktree, mesmos números dos dois lados: `tests/ditado` 58/58, `desafios-album`
66/66, `desafios-cloze` 38/38, `desafios-conclusao` 19/19, `desafios-modulo` 75/75, `modo-foco` 19/19,
`paridade-sites` (Conjugação 343/343 e 45/45, css 5/5, gramática 45/45 e zh 54/54, lição 43/43 e 16/16, módulos 90/90 e
zh 95/95), `familia-latina` (run.sh: paridade 1 483 871 comparações, francês 60/60, português 121/121, navegador 23/23),
`i18n` (unit 2343/2343, sem_portugues_en 6/6), `cores-marca` (20/20, 6/6, 26/26), `fr/scripts/test_answer_validation.js`
176/176. `xp` (10/10, 18/18, 10/10, 9/9),
`conquistas` (catálogo 76/76, navegador 66/66), `e4` (core 35/35, ida e volta 26/26, lotes 5c 20/20, 5d 12/12, 5e 10/10),
`tests/conjugacao` 80/80.

Falhas que já existiam (iguais na main, conferidas no worktree): `tests/desafios-progresso` 22/23 ("progresso: barra
existe"). `tests/e4/test_lote5b_textos.js` 9/11, `tests/i18n/test_content_en.js` 29/30,
`tests/i18n/test_card_variants_browser.js` 14/16.

Testes antigos ajustados de propósito (os Ditados mudaram de arquivo, não de comportamento):
- `fr/scripts/test_answer_validation.js`: extrai o bloco `dictation-answer-logic` de `shared/ditados.js` (o texto lido
  passa a ser motor + `fr/app.js`) e carrega o começo do motor e a `fr/ditados-config.js` antes do bloco, como a página.
- `tests/familia-latina/extrair-fr.js`: o código "novo" inclui `shared/ditados.js` (de onde vêm o bloco do ditado e
  `dictationLightNoteText`), com o mesmo começo do motor e a configuração do francês.

## Riscos e pendências

- O `fr/index.html` continua com a marcação da seção (igual à de `dictationScreenHTML()`, com guarda no teste do motor).
  Se alguém mudar uma, tem de mudar a outra (o teste avisa).
- Chaves com prefixo `fr.` usadas pelo motor (`fr.dict.punctMissing`, `fr.dictation.levelReviewTitle`,
  `fr.trail.freeDictation`, `fr.trail.premiumDictationsOnly`) têm texto geral; `dict.static.sub` fala em "tarefas reais de
  cada módulo", também geral. O nome `frenchNumberWords` ficou por causa dos testes e do histórico.
- `.dictation-play-btn` (botão "Ouvir" dos Desafios do fr) agora vem de `shared/ditados.css`: se um site tiver Desafios sem
  Ditados, precisa carregar o CSS também (hoje só o fr tem os dois).
- As abreviações da divisão em frases estão em dois lugares (configuração do fr e `fr/scripts/dictation_sentences.py`);
  o teste do motor confere que são iguais.
- A trava Premium dos Ditados continua desligada; com ela ligada (`CHALLENGE_PAYWALL_ENABLED`, const no fr), o caminho do
  cadeado foi provado só no português de mentira.
