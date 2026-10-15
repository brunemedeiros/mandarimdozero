# E4, passo 2: plano de extração do núcleo compartilhado

Base: `docs/i18n/e4-levantamento-funcoes.md` (passo 1). Estratégia aprovada na arquitetura: **incremental** (Q-13), `<script>` globais, sem build (Q-14). Nada de código foi movido ainda.

## 1. O que o levantamento mostrou

- Funções de topo: 536 nomes distintos (fr 474, zh 299 declarações; 237 só do francês, 62 só do mandarim).
- **163 funções são idênticas** (1.971 linhas no fr, 21% das linhas de função; 30% no zh). **55 são quase iguais** (2.541 linhas). **19 divergem**.
- Se só as idênticas saírem, `fr/app.js` perde ~2.000 linhas e `zh/app.js` ~1.970; com as quase iguais, perto de 4.500 em cada. A conta da meta "duplicação abaixo de 30%" será refeita a cada área com o mesmo script.
- 43% do francês e 21% do mandarim são peças de um idioma só (Desafios, conjugação e ditados no francês; hanzi e traços no mandarim): viram módulos opcionais declarados no registro (passo 6), não duplicação.

## 2. Descoberta que simplifica o método

`<script>` clássicos compartilham o mesmo escopo global, inclusive `const`/`let` de topo (`STATE`, `UNITS`, `APP_KEY`...). Uma função idêntica movida para `shared/core/<área>.js` e carregada **antes** do `app.js` continua achando `STATE` e os outros nomes na hora da chamada, **sem mudar nenhuma chamada**. Por isso a proposta é **manter os nomes globais** nas extrações das idênticas (zero alias, zero risco de renomeação) e usar o namespace `Core` só em código novo e nas quase iguais que ganharem parâmetro. *Divergência em relação à arquitetura (que previa namespace e alias):* aguarda a aprovação da dona.

## 3. Mecânica de cada lote (mecânica e verificável)

1. Script `scripts/e4-extract.js` (a criar no lote 1): recebe a lista de funções, **copia o texto exato** (com comentários) de `fr/app.js` e `zh/app.js` para `shared/core/<área>.js`, apaga do `app.js` e adiciona o `<script>` nos dois `index.html` antes do `app.js`.
2. Gate automático antes de commitar: o conjunto de declarações de topo (fr + zh + shared/core) é o mesmo de antes; cada função extraída tem texto idêntico ao original; o levantamento gerado de novo mostra a diferença esperada.
3. Regressão completa da bateria (114 suítes) comparada com a da `main`; capturas dos 4 cenários (fr/zh x claro/escuro) para os lotes que mexem em tela.
4. Um PR pequeno por lote, com a `main` trazida antes (R-17: outras sessões editam `app.js`); em conflito, manter os dois lados. Aviso à dona antes de uma área grande.

## 4. Ordem proposta (menos arriscado primeiro)

| Lote | Conteúdo | Funções | Linhas (fr) | Risco |
|---|---|---:|---:|---|
| 1 | idênticas de **áudio e fala** e de **perfil, ranking e social** (conquistas, celebrações, missões) | 25 | ~220 | baixo |
| 2 | idênticas de **revisão e decks** | 42 | ~500 | médio (cartões e FSRS; regressão da Revisão) |
| 3 | idênticas de **exercícios de lição** | 39 | ~420 | médio (telas de lição) |
| 4 | idênticas de **estado e persistência**, **mapa da trilha**, **checkpoint**, **desafios**, **outros** | 57 | ~835 | médio/alto (salvar e carregar) |
| 5 | **quase iguais** (55), uma área por vez, com ponto de extensão (nome do falante, função de fala, teclado) | 55 | ~2.540 | alto |
| 6 | **divergentes** (19), uma a uma: unificar ou assumir como regra do idioma (E5) | 19 | ~730 | alto |
| 7 | **módulos opcionais** (conjugação, Desafios, ditados) declarados no registro; `index.html` por idioma vira casca | — | — | alto |

O lote 4 inclui o que toca salvar e carregar: só entra com teste de ida e volta do progresso (como o `test_course_storage`) e a bateria inteira.

## 5. O que fica de fora de propósito

- `challenges.js` e a conjugação (só francês): E9.
- Nada em CSS (a regra de cores e os 4 cenários continuam valendo).
- Nenhum nome de função muda nos lotes 1 a 4.

## 6. Perguntas para a dona

- **Q-13** (confirmar): extração incremental, por lotes pequenos.
- **Q-14** (confirmar): `<script>` globais, sem build, e **manter os nomes globais** nos lotes 1 a 4 (descoberta da seção 2).
- **Começar pelo lote 1?** Cada lote é um PR separado; nenhum PR é aberto sem pedido.

## 7. Registro dos lotes

### Lote 1 (2026-10-14): feito, na branch, **sem PR**
- 22 funções idênticas: `shared/core/audio-fala.js` (8: som de acerto/erro, aquecimento do TTS, botões de áudio) e `shared/core/gamificacao.js` (14: conquistas, celebração de sequência, missões do dia). Cerca de 250 linhas a menos em cada `app.js`.
- Ficaram de fora de propósito `renderSettingsView`, `switchSettingsSection` e `isAdminUser` (Configurações e painel estão sendo editados por outras sessões) e as constantes/`let` idênticas (só funções neste lote).
- Ferramenta: `scripts/e4-extract.js` (copia o texto exato; se o comentário difere entre fr e zh, fica o mais longo; aborta se o texto de uma função diferir ou se o conjunto de declarações de topo não bater).
- Bateria completa (115 suítes) antes e depois: as mesmas 14 falhas de antes; a `test_i18n_unit` precisou ignorar os `<script>` novos na comparação de HTML (ajustado); `fase-j` falhou uma vez no lote e passou 62/62 em duas rodadas isoladas (instável).

### Lote 2 (2026-10-14): feito, na branch, **sem PR**
- 42 funções idênticas de revisão e decks (fila de revisão, sessão, resumos, filtros por tag e origem, humor/ajuda de cartão, missões de revisão, cartões de professora e próprios) para `shared/core/revisao-decks.js` (cerca de 800 linhas com comentários). Em 13 funções o comentário diferia entre fr e zh; ficou o mais longo (o outro está no histórico do git).
- Os testes que extraem funções do TEXTO do `app.js` (12 arquivos, harness e unitários) passaram a usar `tests/e4/app-source.js` (`withCore`), que acrescenta `shared/core/*.js` ao texto. Novo `tests/e4/test_core_carregado.js`: o core está carregado antes do `app.js`, todas as funções existem como função global em fr e zh e nenhuma foi repetida no `app.js`.
- Bateria completa (119 suítes) antes: 15 falhas. Depois do lote, 23 suítes novas falharam só por lerem o `app.js` sem o core; depois do ajuste, as falhas voltaram às mesmas 15 de antes (nenhuma nova).

### Lote 3 (2026-10-14): feito, na branch, **sem PR**
- 39 funções idênticas de exercícios de lição (reconhecimento, jogo de pares, rodada de velocidade, conceitos, foco da lição, frases de feedback, modo de digitar, diálogo) para `shared/core/exercicios-licao.js` (569 linhas com comentários). Em 10 funções o comentário diferia entre fr e zh; ficou o mais longo.
- Bateria completa (119 suítes) antes e depois: as mesmas falhas de antes, **nenhuma nova**; `test_ui_language_confirm_browser` (instável) passou desta vez. `tests/e4/test_core_carregado.js` 15/15. Os testes já leem o core via `tests/e4/app-source.js`, então este lote não precisou mexer em teste nenhum.
- Capturas de tela fr/zh claro/escuro: não refeitas (o lote só move código; as telas de lição são exercitadas pelos testes Playwright da bateria).

### Lote 4 (2026-10-14): feito, na branch, **sem PR**
- 58 funções idênticas para `shared/core/estado-trilha-desafios.js` (1.164 linhas com comentários): estado e persistência (carregar e montar o estado, mesclar cartões da professora e próprios, bucket diário, XP da semana), mapa da trilha (progresso, desbloqueio, estado de bloco), checkpoint, desafios do dia, fase de aquisição, fila mista, celebrações e utilidades. Em 22 funções o comentário diferia entre fr e zh; ficou o mais longo. Ficaram de fora `renderSettingsView`, `switchSettingsSection` e `isAdminUser` (outras sessões).
- **Gates novos deste lote (além da bateria completa):**
  1. `tests/e4/test_progresso_ida_e_volta.js` (22/22, fr e zh): muda o estado de verdade, salva pelo caminho real (`saveState` na tabela falsa), zera o estado, carrega pelo caminho real (`loadState`) e compara. FSRS dos cartões estudados idêntico, unidades iguais, segundo ciclo salvar/carregar não muda nenhum campo. Passa antes e depois do lote.
  2. `tests/e4/capturas.js` e `tests/e4/comparar-capturas.js`: 18 capturas (fr/zh x claro/escuro x trilha, revisão, progresso, metas, Desafios só no fr) com tempo congelado e animações desligadas, comparadas pixel a pixel antes x depois: 18 de 18 iguais.
- Bateria completa antes (119 suítes, 15 falhas) e depois (120 suítes com o teste novo): as mesmas falhas; a única diferença foi `test_conquistas_conta` por ler o texto do `app.js` (ajustado para ler o core junto; passa).

## 8. Fase das quase iguais

Ferramentas: `scripts/e4-diff-near.js` (relatório `docs/i18n/e4-quase-iguais.md`: diferença linha a linha de cada função, das menores para as maiores) e `scripts/e4-unify-near.js` com um manifesto por lote em `scripts/e4-batches/`. O que muda por idioma vai para `LANG_HOOKS` (`fr/lang-hooks.js`, `zh/lang-hooks.js`, carregados antes do `app.js`, com setas que só chamam o `app.js` na hora do uso) ou vira uma guarda explícita (`typeof`, `in`) no código compartilhado. Gate textual: com os ganchos trocados pelo valor de cada idioma, a função unificada tem de ser igual à original; onde a diferença é uma linha que só existe num idioma, o manifesto justifica e a bateria confere.

### Lote 5a (2026-10-15): feito, na branch, **sem PR**
- 12 funções com diferença de 1 ou 2 linhas para `shared/core/quase-iguais-simples.js`: `playAudioPreview`, `wireAudioButtons`, `pollForVoices`, `customAudioBtnHTML`, `reviewCardTagLabel`, `maskWordInText` (com ganchos); `showWrongAnswerPanel`, `advanceUnitStep`, `backToReviewModeSelect`, `startDeckReviewSession`, `openReviewSession`, `exitToPath` (com guarda ou argumento ignorado).
- Bateria completa (122 suítes) antes e depois: as mesmas falhas, nenhuma nova (`test_ui_language_first_access_browser`, instável, passou). Ida e volta do progresso 22/22; 18 capturas iguais antes e depois; teste de i18n 2033/2033 (ignora `lang-hooks.js`).
- Próximos lotes (diferença de 2 a 3 linhas com texto de interface ou marcação por idioma): textos de toast e plural (`addXP`, `answerSpeedQuestion`, `onMatchTileClick`: conferir os catálogos), recapitulação da lição com pinyin (`renderLessonCompleteScreen`, `renderUnitCompleteScreen`: gancho de marcação), assinatura diferente (`noteOrConceptReviewHTML`).

### Lote 5b (2026-10-15): feito, na branch, **sem PR**
- 5 funções para `shared/core/quase-iguais-textos.js`: `addXP` e `answerSpeedQuestion` (o zh escrevia `+N XP` e `+N pts` direto; as chaves `toast.xpGain` e `toast.pointsGain` valem exatamente isso em pt-BR e en, então o texto não muda), `onMatchTileClick` (fr usava `t`, zh usa `tp`; a chave é texto simples, igual até 999 tentativas; a unificada usa `tp`), `renderLessonCompleteScreen` e `renderUnitCompleteScreen` (ganchos `recapText` e `recapExtra`: o zh mostra o pinyin ao lado do hanzi).
- Português: nenhum texto mudou (conferido nos catálogos pelo teste `tests/e4/test_lote5b_textos.js`, 11 checks).
- Bateria completa (123 suítes) antes e depois: nenhuma falha nova (16 antes, 15 depois, por instabilidade). Ida e volta do progresso 22/22; core carregado 21/21; 18 capturas iguais.

## 9. Levantamento do lote 5c (2026-10-15, só leitura, nada mudou no código)
Restam 38 quase iguais (`docs/i18n/e4-quase-iguais.md`; as 5 primeiras linhas dessa tabela, com 0 diferenças, são as do lote 5b, já unificadas). Por tipo de diferença:

**A. Só a chave de texto muda (`fr.*` x `zh.*`) ou um valor fixo por idioma. Mais fácil, proposta do 5c.**
- `audioBtnHTML`, `wireDontKnowButton`, `renderMatchGame`: as chaves `fr.*` e `zh.*` têm o MESMO texto em pt-BR e en (conferido: `audio.listenPronunciation`, `hint.label/retry/reveal`). O `renderMatchGame` do fr tem "Pares:" e "Tentativas:" escritos direto; o do zh usa as chaves `zh.review.match.*` (mesmo texto). Unificar com as chaves comuns, sem mudar o que a aluna lê.
- `maybeSendStudyReminder`: título do lembrete e chave do localStorage por idioma (o texto é diferente por ser "francês" x "mandarim": vira gancho, texto igual ao de hoje).
- `renderProgressLineChart` (`chartTotalSuffix` diverge de propósito: "palavras aprendidas" x "palavras e caracteres aprendidos") e `buildCardsFromUnits` (`appKey` padrão): ganchos simples. `renderProgressLineChart` ainda soma `hanziCards` só no zh.
- `freshAcquisitionState`: só a ORDEM das chaves do objeto muda; unificável direto (o conteúdo é o mesmo).
- `playPregeneratedAudio` (fr aceita `rate`; zh ignora), `flyBlockToSlot` (fr `textContent`, zh `innerHTML` por causa do pinyin), `dlgPlayLine` (voz, `lang`, velocidade 0,9 x 0,85, e `PREGEN_AUDIO_RATE` só no fr): ganchos de áudio/voz, mesmo estilo do 5a.

**B. Marcação com pinyin (zh mostra o pinyin, fr não). Padrão do 5b, com gancho de marcação.**
- `renderConceptStep`, `renderTrueFalseExercise`, `renderMultipleChoiceCard` (esta ainda troca `canSpeakFrench`/`speakFrench` por `canSpeakChinese`/`speakChinese`, que já têm gancho).

**C. A lição tem estrutura diferente por idioma (gramática do fr, cenário do fr, frase completa do zh). Mais arriscado: pede decisão minha caso a caso, com teste de comportamento.**
- `currentStepDefs`, `finishCurrentLesson`, `renderExerciseStep`, `mapUnitDescribe`, `findEnterAdvanceTarget`, `noteOrConceptReviewHTML`, `renderDialogueCheckStep`, `showAnswerPanel` (o zh tem "tom errado/faltando" e "frase completa"), `assignTodaysMissions` (revisão de conjugação x de hanzi), `freshDailyBucket` (campos diferentes por idioma).

**D. Grandes (10 a 42 linhas diferentes): `serializeState`, `renderBlockIntroCard`, `renderSpeedReview`, `renderStepProgress`, `buildUnitBlock`, `renderReviewView`, `renderMultipleChoiceExercise`, `renderDialogueStep`, `renderClozeCard`, `renderTypeAnswerCard`, `renderVocabTypeExercise`, `renderReorderExercise`, `renderDialogueCheck`, `renderClozeExercise`.** Não vale forçar uma versão única: a recomendação é decidir uma a uma depois dos lotes A e B, e talvez deixar parte delas separada de propósito (cada idioma com o seu jeito de exercício).

**Proposta:** lote 5c = grupo A (10 funções), com os mesmos gates dos anteriores (bateria completa antes/depois, ida e volta do progresso, capturas, e um teste de que os textos saem iguais). Lote 5d = grupo B (3 funções). Os grupos C e D só depois de uma conversa com a dona.
