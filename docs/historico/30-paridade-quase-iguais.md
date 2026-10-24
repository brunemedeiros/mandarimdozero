# 30. Paridade, etapa 5d: as funções em dobro do fr/app.js e do zh/app.js em código comum (2026-10-23/24)

Pedido da dona (2026-10-23): mover para código compartilhado TUDO o que é compartilhado entre os sites. As etapas 5a a 5c
levaram Conjugação, Ditados e Desafios; esta (5d) levou o que restava em dobro nos dois `app.js`: lição em passos,
exercícios, diálogo, Revisão e Revisão rápida, voz, teclado/acento, estado e conquistas, trilha, configurações e a casca do
app. Branch `claude/friendly-hamilton-u4ssl2`, sem PR, 9 partes com commit e push cada (f8d01ee1 ... 27e18be3).
Grátis x Premium: nada muda (só moveu código; nenhuma regra de acesso foi tocada).

Método (igual às etapas 23 a 29): mesmo nome global de cada função, o que muda por idioma em `LANG_HOOKS`
(`fr/lang-hooks.js`, `zh/lang-hooks.js`), manifesto por parte em `scripts/e4-batches/p5d-N.js` rodado por
`scripts/e4-unify-near.js` (com o gate textual onde a troca é só de valor; nas demais a equivalência está escrita no
manifesto e provada no navegador). Molde: o fr (família latina); onde o zh tinha mais (ramos de tom, Frase completa, nota
de uso), o comum ficou com o superconjunto, sem ligar nada novo no fr.

## O que foi para código comum (por parte)

1. `shared/core/licao-base.js` (19): `isAdminUser`, `currentStudentName`, `syncSidebarToggleLabel`,
   `renderSettingsView`, `switchSettingsSection`, `renderReviewView`, `finishCurrentLesson` (eram idênticas),
   `renderReviewViewInner`, `renderSpeedReview` (gancho do emoji e do enunciado), `showAnswerPanel` (com o aviso de tom do
   zh), `trailGroups`, `computeProgressSummary`, `findEnterAdvanceTarget`, `registerDailyLessonCompleted`,
   `clozeFeedbackDetailHTML`, `findMatchingPhrase`, `currentStepDefs` + `getStepDefs` (o `STEP_DEFS` do zh tinha os mesmos
   passos), `renderExerciseStep`.
2. `shared/core/licao-dialogo.js`: `renderDialogueStep`, `renderDialogueCheckStep`, `renderDialogueCheck`, o estado `DLG`
   e `dlgSpeakerSide` (motor do zh, ligado só no zh). Destaque do vocabulário do fr (`dlgVocabTerms`, `dlgHighlight`) em
   `shared/core/familias/latina-licao.js`, com os artigos na configuração da família (`familiaLatina.artigos`: fr le, la, les,
   l', un, une, des; rascunho do pt em `latina-idiomas.js`: o, a, os, as, um, uma, uns, umas, confiança alta).
3. `shared/core/licao-exercicios.js` (9): `buildExerciseSet`, `buildReorderDistractors`, `renderMultipleChoiceExercise`,
   `renderVocabTypeExercise`, `renderClozeExercise`, `renderReorderExercise`, `answerExplanationHTML`, `buildExerciseHint`,
   `noteOrConceptReviewHTML`. Ganchos: `textOf`, `lessonKeys` (as chaves de texto de cada site, texto igual), marcação com ou
   sem pinyin, texto falado, `typedAnswer` (correção do digitar: família latina no fr, pinyin e tom no zh; veredito
   `{ ok, almost, toneOnly }`), `fullSentenceExercises` (só zh).
4. `shared/core/trilha-licao.js` (7): `renderUnitsGrid` (com módulos segue o fr; sem módulos segue o zh, com as
   histórias), `buildUnitBlock`, `openUnitDetail`, `renderStep` (com o passo `usage` do zh), `renderStepProgress`,
   `renderBlockIntroCard` (traços do hanzi pelo gancho), `markUnitCompleted`. O zh ganhou o CSS e o token `--brand-purple` da
   unidade de gramática (igual ao fr; sem efeito hoje, o zh não tem unidade de gramática).
5. `shared/core/estado-salvar.js` (4): `serializeState`, `applySerializedState`, `collectBadgeMetrics`,
   `badgeModesUsedCount`. Campo de recurso que nem todo site tem (hanzi e histórias no zh; Ditados e Desafios no fr) só é
   gravado/lido quando o `STATE` do site o declara, no mesmo lugar e ordem de antes: um site novo que carregar
   Ditados/Desafios e declarar os campos já salva o progresso deles.
6. `shared/core/revisao-cartoes.js` (4 + 2): `renderNormalCard`, `renderClozeCard`, `renderTypeAnswerCard`,
   `refreshStudyCardTexts` (hanzi do zh por `refreshHanziCardTexts`, que fica no zh), `cardOriginTitle` (era
   `flashcardUnitTitleText` no fr, igual) e `stopMatchTimer`.
7. `shared/core/voz.js`: a voz (mp3 pré-gravado ou voz do navegador, escolha da voz, 2ª tentativa, avisos, resume
   periódico) virou `loadStudyVoice`/`canSpeakStudy`/`speakStudy*` com `ttsLang`, `ttsRate`, `ttsText`,
   `voiceMissingKey`, `audioRetryFailedKey`; `speakFrench`/`speakChinese` etc. ficam no `app.js` como repasses de 1 linha.
   Teclado de acentos e correção do digitar do fr (`frAccentPickerHTML`, `wireFrAccentPicker`, `insertAccentAtCursor`,
   bloco `accent-answer-logic`) em `shared/core/familias/latina-licao.js` (o pt herda com a configuração dele).
8. `shared/core/app-comum.js`: o que os dois `app.js` tinham igual no nível de cima (STEP_STATE, SPEED_STATE, MATCH_STATE,
   filas de elogio/combo, conquistas em espera, constantes das notas de realidade/culturais, missões fáceis...) e as ligações
   iguais da casca (menu, lembrete de revisão, atalhos de teclado, Voltar/Continuar da lição, abas e barra lateral,
   configurações da Revisão), como funções chamadas no mesmo ponto do carregamento.
9. Correção de bug (abaixo).

Ordem de carregamento (antes do `app.js`, depois dos `quase-iguais-*`): `licao-base`, `licao-dialogo`,
`licao-exercicios`, `trilha-licao`, `estado-salvar`, `revisao-cartoes`, `app-comum`, `voz`; o fr carrega também
`familias/latina-licao.js` logo depois de `familias/latina.js`.

## O que ficou em cada app.js e por quê

- `fr/app.js`: de 4 103 para **697 linhas**, e de 60 para 4 funções (os repasses da voz). Ficou o que é dado/configuração do
  francês: `STATE` (o formato decide o que é salvo), camada do curso (`CONTENT_I18N`), chaves de `localStorage`, ícones das
  unidades, missões de conjugação, descrições de nível, guia de nível das notas de realidade, abas (`switchTab` com as
  telas do fr), exportação Anki (nomes dos campos), botões do menu Mais e as chamadas `wire*` no ponto de sempre.
- `zh/app.js`: de 5 609 para **2 312 linhas** (de 116 para 70 funções). Ficou o que é do chinês (categoria iii, módulo
  logográfico só quando houver um 2º idioma da família): hanzi (traços, cartões, lições, revisão, radicais, teste),
  pinyin (mostrar/esconder, teclado de tons, conversão numerada, correção, tom), histórias-checkpoint, busca de
  vocabulário, save antigo, destaque do diálogo com pinyin, "Manual da unidade" (`renderUnitSummaryHTML`), "Frase
  completa" (`buildFullSentenceExercises`, `renderFullSentenceExercise`: as regras usam hanzi, 不/没 e o pinyin; virar motor
  geral pede regras da família latina, como "ne ... pas"), `phraseForExercise`, exportação Anki com pinyin, os repasses da voz.

## Recursos do zh que podem ser ligados no fr (decisão da dona; ligar muda a tela do fr)

- Lado do balão pelo primeiro falante (`dlgSpeakerSide`, já no motor comum): no fr, trocar `LANG_HOOKS.dlgSide`.
  Importa para "diálogos com personagens nomeados".
- "Manual da unidade" e "Frase completa": hoje só no zh (ver acima); para o fr, virar motor geral com as regras da família.
- Passo `usage` (nota de uso) e o aviso de "tom" já estão no motor comum (o fr não tem conteúdo que os use).

## Correções de bug (listadas, as únicas mudanças de comportamento)

1. **"Ver resultado" da unidade de gramática** (fr, existe na main): depois de um Ponto de verificação com erros na mesma
   sessão, `lessonRecapItems` lia `u.vocab` de uma unidade sem vocabulário (TypeError) e a tela de resultado não aparecia.
   Achado pelo teste de equivalência. Agora a recapitulação vem vazia e a tela aparece (`shared/core/exercicios-licao.js`).
2. **Tradução da lacuna na Revisão sem `escapeHTML` no fr** (cartão de professora/próprio): o zh já escapava; agora os dois
   (regra "texto vindo de autor: sempre escapeHTML"). Nada muda no conteúdo de hoje.
3. Latente no zh, sem efeito hoje: o `renderStep` do zh escondia o "Continuar" logo depois de montar o exercício, o que
   escondia também o da tela de lição concluída se a série viesse vazia; o comum segue o fr.

## Provas

- **Equivalência** (`tests/paridade-sites/test_quase_iguais.js` + `quase-iguais-harness.js`): a main (`2e229930`,
  worktree temporário; com a correção 1 aplicada também nela) e esta árvore rodam, no navegador, a mesma sequência nos dois
  sites, com o site em pt-BR (inteira) e em inglês (curta): relógio falso parado (e conferido), sorteio com semente,
  rede cortada. Um "andador" responde cada passo escolhendo com a semente entre os botões da tela ou digitando a resposta
  certa, quase certa ou errada: trilha (lista e Mapa), várias unidades até o fim (introdução, checagens, prática, diálogo,
  "Você entendeu?", consolidação, Ponto de verificação, gramática no fr, Frase completa no zh, pinyin escondido),
  Revisão (flashcard, palavras difíceis, Revisão rápida, Combinar), cada tipo de cartão (trilha, próprio normal/com
  reverso/digitar/lacuna nativa e antiga/múltipla escolha), Perfil, Progresso, Configurações e conquistas. Cada cena
  compara o HTML, o hash do estado salvo, XP, contadores do dia, missões, ponteiros da lição, avisos e áudios pedidos.
  **2768/2768 cenas iguais** (fr pt-BR 1004, fr en 382, zh pt-BR 1007, zh en 363). Controle: uma mudança de 1 caractere
  num gancho do zh faz o teste falhar.
- `tests/paridade-sites/test_voz.js` 34/34 (voz de mentira: escolha da voz, texto/idioma/velocidade, mp3, avisos),
  `test_atalhos.js` 92/92 (teclado e Voltar), `test_correcoes_5d.js` 4/4 (as correções, antes x depois).
- **Capturas** (`tests/paridade-sites/capturas_quase_iguais.js` + `tests/e4/comparar-capturas.js`, tolerância 0): ~100
  telas por combinação (trilha, lição em cada tipo de passo e exercício com devolutiva, diálogo, Revisão e cada cartão,
  Revisão rápida, Combinar, Perfil, Progresso, Configurações), fr e zh, claro e escuro, 390 e 1200px: **834/834 iguais** em
  cada parte (parte 9: fr 408/408 contra a main com a correção). Arquivos em
  `scratchpad/etapa5d/antes` e `depois` da sessão. Uma foto (parte 3) teve 8 pixels de antisserrilhado; refeita, igual.
- **Ida e volta do progresso**: `tests/e4/test_progresso_ida_e_volta.js` 26/26 e `tests/curriculo-ids/test_save_antigo_browser.js`
  29/29 em todas as partes.
- **Regressão** (219 arquivos de teste de tests/e4, paridade-sites, curriculo-ids, curso-progresso, modo-foco, i18n,
  cores-marca, xp, conquistas, respostas-digitadas, familia-latina, checkpoint-zh, banco-revisao, deck-browser, fase-*,
  k*, trilha*, revisao*, janelas-revisao, acessibilidade, icones, metas-wizard, amigos*, configuracoes, perfil*, painel-*,
  desafios-*, ditado, conjugacao e outros), main x cada parte: **nenhuma falha nova**. Falham igual na main:
  desafios-progresso 22/23, e4/test_lote5b_textos 9/11, i18n/test_content_en 29/30, i18n/test_card_variants_browser
  14/16, k2c 12/14, k2f (sem sql.js), trilha-tags/test_unit, painel-admin/test_reports_ui_unit 29/30,
  banco-revisao/test_agent_core (motor gerado desatualizado), fase-h 66/68 e 76/78, k2i 14/16,
  respostas-digitadas/test_guarda 5/6 (Acentuação), fase-identity (2), fase-public-deck/test_legacy_parity (sem
  Postgres), painel-cartoes 256/264, pt-servidor 68/69, registro 88/89. Oscilam nas duas árvores:
  paridade-sites/test_ditados (tempo do áudio; 1 em 3 na main), i18n/test_ui_language_confirm_browser e
  first_access, fase-j. `test_desafios_css` não foi rodado (demora mais de 5 min; nenhum CSS dos Desafios mudou).
- Testes ajustados por lerem o texto do `app.js` (agora leem o core): paridade-sites (gramática, lição, Desafios motor),
  trilha/test_trail_state_model, xp/test_trilha_xp, curriculo-ids (carregamento, unidade nova), respostas-digitadas/test_guarda,
  familia-latina/extrair-fr.js, fr/scripts/test_answer_validation.js. Nenhum teste mudou de expectativa.
