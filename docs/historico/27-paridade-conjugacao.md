# 27. Paridade, etapa 5a: tela da Conjugação em código comum (2026-10-23)

Pedido da dona (2026-10-23): mover para código compartilhado tudo o que é geral e hoje vive só no `fr/app.js`. Etapa 5a:
a **tela da Conjugação**. Branch `claude/friendly-hamilton-u4ssl2`, sem PR. Continua `26-paridade-b2-modulos-niveis.md`.
Grátis x Premium: igual ao fr de antes. A prática é grátis; os Jogos são Premium com o bloqueio desligado
(`CONJ_GAMES_PAYWALL_ENABLED = false`: só o selo ⭐ aparece e todo mundo joga; permissão `conj_games` em Admin > Planos).
Categoria A para o zh (chinês não conjuga verbo): o zh não carrega nada disto.

## O que foi para código comum

`shared/conjugacao.js` (novo, ao lado de `shared/conj-games.js`; não fica em `shared/core/` porque tudo de lá é carregado
por todos os sites, e o zh não tem Conjugação). As ~33 funções da Conjugação saíram do `fr/app.js` com o mesmo nome e o
mesmo texto (o `fr/app.js` perdeu ~780 linhas):

- Correção: `conjExpectedInfo`, `conjEvaluate`, `conjOtherFormOf`, `conjAlign`, `conjAnswerViewHTML`, `conjSpeakText`,
  `conjHintPlaceholder`, `getConjForms`, `conjPersonLabel`, `conjActiveMask`.
- Teclado de letras: `conjAccentLetters`, `conjAccentPickerHTML` (e `conjInsertAtCursor`, que usa o
  `insertAccentAtCursor` das lições quando o site tem).
- Escolha e busca: `CONJ_STATE`, `updateConjSizeHint`, `conjExampleHTML`, `conjFold`, `conjSearchVerbs`, `conjFlagHTML`,
  `renderConjSearchList`, `setConjSearchActive`, `pickConjVerb`, `renderConjPicked`, `renderConjSelectScreen`,
  `toggleConjRegularity`, `startConjFromSelection` (o clique do "Começar prática", que era anônimo), `startConjSession`.
- Prática e fim: `renderConjPracticeStep`, `renderConjSessionResult`.
- Abas e Jogos: `CONJ_GAMES_PAYWALL_ENABLED`, `conjGamesUnlocked`, `isConjGameLocked`, `openPremiumGamesModal`,
  `CONJ_GAMES_UI`, `refreshConjGamesSeal`, `setConjMode`.
- Missões do dia: `registerDailyConjugationSession/Correct/Tense` e as 3 missões (`CONJ_DAILY_MISSIONS`; o fr as põe no
  `REVISAO_CONJ_CHALLENGES` com `...CONJ_DAILY_MISSIONS`, mesmos objetos e mesma ordem).
- Novas: `registerConjugation(cfg)`, `conjCfg()`, `wireConjugationScreen()` (todos os listeners que eram de nível
  superior no `fr/app.js`, na mesma ordem; o fr chama no mesmo ponto do carregamento) e `conjScreenHTML()` (a marcação da
  seção, para site novo).

`shared/conj-games.js`: `createConjGames` aceita `lang` (atributo `lang=""` das frases; padrão `'fr'`, nada muda no fr).

`shared/conjugacao.css` (novo, `<link>` no fr depois do `<style>` e do `shared/modulos-niveis.css`): as 4 faixas de CSS
da Conjugação que estavam no `<style>` do `fr/index.html` (base `.conj-*`, passada de design `#view-conjugaison ...`, as
2 regras do modo foco e as abas/Jogos `.cg-*`), na mesma ordem. As capturas provam que a mudança de lugar na cascata não
mudou nada. Dois tons fixos do fr ficaram nas regras de base (`.conj-toggle-item.active` e `.conj-field.almost input`):
a passada de design cobre o primeiro e o segundo não aparece (depois de corrigir o campo vira `.conj-answer-view`).

## O que ficou na configuração do fr (`fr/conj-config.js`, carregado depois do motor e antes do `app.js`)

Os dados (`CONJUGATION_VERBS`, `CONJUGATION_GROUPS`, `VERB_TRANSLATIONS`, `CONJ_TENSE_EXAMPLES`, `CONJ_GAMES`) continuam nos
arquivos de dados de sempre; a config só os aponta. Próprio do francês: a lista e a ordem dos 8 tempos com os rótulos, as
pessoas, `personLabel` (je -> j' antes de vogal ou h, "que je / qu'il" no subjonctif), impératif só tu/nous/vous
(`activeMask`, `pronounlessTenses`), futur proche montado na hora (`forms`), concordância do particípio com être
(`expectedInfo`: allé(e), allé(e)s), grupos regulares/irregulares, números dos filtros, busca sem o "se"/"s'" do verbo
pronominal (`searchStrip`), bandeiras fr/pt e as chaves dos nomes, letras do teclado (`LANG_HOOKS.familiaLatina`) e a voz
(`speakFrench`). A família latina (`shared/core/familias/latina.js`) não mudou: o motor usa dela, por padrão, a busca sem
acento (`dobrarBusca`), o "quase" (`normalizarFrouxo`), o teclado (`htmlTecladoDeAcentos`) e a inserção no cursor.

## Configuração (o "gancho" de cada idioma)

`registerConjugation({...})`: obrigatórios `verbs`, `groups`, `tenses`, `persons`; o resto tem padrão. Campos: `lang`,
`translations`, `tenseExamples` (frase em `ex[lang]`), `exampleTranslationLang`, `personLabel`, `activeMask`,
`pronounlessTenses`, `forms`, `expectedInfo`, `regularGroups`, `irregularGroups`, `topNOptions`, `sessionSizes`,
`sessionSize`, `pickMax`, `fold`, `looseNormalize`, `searchStrip`, `searchLangs` ({ target, translation }), `flags`,
`flagLabelKeys`, `accentGroups`, `speak`, `games`, `keys` (chaves de texto que citam o idioma: `searchLabel`, `searchPh`).
A lista comentada está no topo de `shared/conjugacao.js`.

## Como o site de português liga a Conjugação

1. Dados: `pt/conjugation-data.js` (mesmo formato do fr: `{ infinitivo: { g, f: { tempo: [6 formas] } } }`, do mais
   comum para o mais raro) e, se tiver Jogos, `pt/conj-games.js`. Conteúdo nasce traduzido (regra do projeto): rótulos
   dos grupos, traduções dos verbos e textos dos jogos em cada idioma de site do curso (hoje só en no /pt).
2. `pt/conj-config.js` com `registerConjugation({ lang: 'pt', ... })`: tempos, pessoas (eu, você, ele / ela...), grupos,
   `searchLangs: { target: 'pt', translation: 'en' }`, `flags`, `exampleTranslationLang: 'en'`, `accentGroups` (as letras
   do português já estão em `shared/core/familias/latina-idiomas.js`), `speak`, `keys` com chaves próprias para o rótulo e
   o exemplo da busca (as `fr.conj.sel.searchLabel/searchPh` citam o francês).
3. `pt/index.html`: `<div class="view" id="view-conjugaison"></div>` vazio (o motor monta a marcação com
   `conjScreenHTML()` e traduz com `applyDomI18n`), `<link rel="stylesheet" href="../shared/conjugacao.css">` depois do
   `<style>`, os scripts na ordem dados -> `shared/conj-games.js` -> `shared/conjugacao.js` -> `conj-config.js` -> `app.js`;
   no `app.js`, `wireConjugationScreen()` e `conjugaison: renderConjSelectScreen` nos `tabHandlers`; no
   `LANG_HOOKS.dailyExtra` os campos `conjugationSessions`, `conjugationCorrect`, `conjugationTenses` (como o fr) e as
   missões no sorteio (`...CONJ_DAILY_MISSIONS`). Se tiver Jogos, a janela `#premium-games-modal` do fr.
4. Textos: as chaves `fr.conj.*`, `ui.conj.*`, `games.*` são genéricas (já têm pt-BR e en); só as duas da busca e os
   nomes das bandeiras citam idioma.

## Provas (2026-10-23)

- Equivalência (`tests/paridade-sites/test_conjugacao.js`, 343/343): a mesma sequência no fr da main (`f22bda99`,
  worktree temporário) e no fr desta árvore, no navegador. **331 de 331 cenas iguais**: a correção de **138 816
  respostas** (241 verbos x 8 tempos x 6 pessoas x 12 variações: certa, sem acento, maiúscula, com espaços, letra a menos,
  letra trocada, acento trocado, feminino e plural com être, forma de outro tempo, vazia), com rótulo da pessoa (je/j',
  que je/qu'il), texto falado, dica, forma do futur proche e o HTML "Sua resposta"; a busca (todos os prefixos de verbos e
  traduções e consultas soltas: "comer", "etre", "se lever"...) e o HTML da lista; a tela de escolha depois de cada clique
  (filtros, teclado, chips, Esc, Backspace); uma sessão inteira pelo DOM (dica, acento pelo teclado, Enter, corrigir,
  voltar, resultado, "Praticar só os que errei", sessão perfeita, nova sessão) com `CONJ_STATE`, `STATE.daily`, XP,
  missões e o estado salvo depois de cada passo; a aba Jogos (selo com a trava ligada e desligada, janela Premium) e um
  jogo inteiro; o site em inglês sem a tradução em português.
- Capturas antes x depois (`tests/paridade-sites/capturas_conjugacao.js` + `tests/e4/comparar-capturas.js`, tolerância 0),
  claro/escuro, 390 e 1200px: **44/44 iguais** (0,000% dos pixels). Cenas: escolha, busca "comer" com a lista aberta, chips,
  prática com 2 tempos, erro com acentos marcados (e "quase" e feminino com être), dica, resultado, aba Jogos, jogo
  (pergunta, resposta errada com a explicação, resultado). Arquivos em `scratchpad/etapa5a/antes` e `depois` da sessão.
- Motor independente do francês (`tests/paridade-sites/test_conjugacao_motor.js`, 45/45): o motor não cita verbo, tempo,
  pronome nem voz do francês; `conjScreenHTML()` é igual à seção do `fr/index.html` (tags, atributos e textos); o zh não
  carrega nada; e um **português de mentira** (2 verbos, presente e pretérito, eu/você/ele, busca pela tradução em inglês)
  ligado na página do fr só com `registerConjugation` e a seção vazia, claro e escuro a 390px: escolha (tempos, exemplo
  com `lang="pt"`, grupos, Top N), busca "speak" -> falar e "SER" -> ser, chips, limite de verbos, prática com as pessoas
  do português, teclado só com "ã é", certa / "quase" (maiúscula, sem acento) / errada com a letra marcada, áudio "eu
  falo", XP (regular 1, irregular 2), missões, resultado com a revisão e "Praticar só os que errei", aba Jogos vazia, sem
  rolagem horizontal, nenhum texto do francês e nenhum erro de página.

## Regressão (2026-10-23)

Passam: `tests/conjugacao` 80/80, `paridade-sites` (css 5/5, gramática 45/45 e zh 54/54, lição 43/43 e 16/16, módulos
90/90 e zh 95/95, Conjugação 343/343 e 45/45), `familia-latina` (run.sh: paridade 1 483 871 comparações, francês 60/60,
português 121/121, navegador 23/23), `fr/scripts/test_answer_validation.js` 176/176, `respostas-digitadas` (guarda 6/6,
formas duplas 17/17, navegador 10/10), `modo-foco` 19/19, `i18n` (unit 2343/2343, sem_portugues_en 6/6, playwright
209/209 e os demais), `cores-marca` (20/20, 6/6, 26/26), `xp` (10/10, 18/18, 10/10, 9/9), `e4` (core 35/35, ida e volta
26/26, lotes 5c-5e), `planos-permissoes` 105/105, `acessibilidade` 60/60, `icones` 43/43, `menu-mais` 89/89,
`css-equilibrio` 2/2 e 2/2.
Falhas que já existiam (iguais na main, conferidas no worktree): `tests/e4/test_lote5b_textos.js` 9/11,
`tests/i18n/test_card_variants_browser.js` 14/16, `tests/i18n/test_content_en.js` 29/30. `tests/conjugacao` às vezes dá
79/80 nos dois lados (sorteio do jogo: a frase em que a pista fica dentro da resposta, ou o verbo sorteado no 1º teste);
na main deu 79/80 duas vezes seguidas, aqui 80/80 e 79/80.

Testes antigos ajustados de propósito (a Conjugação mudou de arquivo, não de comportamento):
- `tests/respostas-digitadas/test_guarda.js`: conferia "acceptedForms() cru só nas 2 funções da Conjugação" no
  `fr/app.js`. Agora confere que o `fr/app.js` não tem nenhum e que `shared/conjugacao.js` tem um só, o de
  `conjExpectedInfo` (5/5 -> 6/6).
- `tests/familia-latina/extrair-fr.js`: o código "novo" (fr/app.js + core) passa a incluir `shared/conjugacao.js`, de onde
  vêm `conjAlign` e `conjFold`.
- `tests/paridade-sites/test_licao_feedback.js`: a verificação "conjAlign usa alinharLetras comum" lê
  `shared/conjugacao.js` em vez do `fr/app.js`.

## Riscos e pendências

- O `fr/index.html` continua com a marcação da seção (igual à de `conjScreenHTML()`, com guarda no teste do motor). Se
  alguém mudar uma, tem de mudar a outra (o teste avisa).
- Chaves de texto com prefixo `fr.` (`fr.conj.*`, `fr.mission.conj*`) seguem usadas pelo motor comum: o texto é geral; só
  `fr.conj.sel.searchLabel`/`searchPh`/`langFr`/`langPt` citam idioma, e o site novo troca por `keys`/`flagLabelKeys`.
- `shared/conj-games.js` ainda põe um espaço inquebrável antes de `? ! : ;` (tipografia francesa): só age onde já há
  espaço antes do sinal, então não muda texto em português; rever quando houver jogos do pt.
- Bandeira sem desenho em `SCENARIO_FLAG_SVG` (ex.: a dos EUA, para a busca em inglês do /pt) aparece como emoji.
