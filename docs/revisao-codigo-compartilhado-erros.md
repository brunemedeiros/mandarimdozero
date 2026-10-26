# Revisão do código compartilhado: erros e robustez (2026-10-24)

Escopo: `shared/core/*.js` (com `familias/`), `shared/desafios*.js`, `shared/ditados.js`, `shared/conjugacao.js`,
`shared/conj-games.js`, `shared/checkpoint-exam.js`, `shared/review-milestone.js`, `shared/study-trail-model.js`,
`fr/*-config.js`, `fr/lang-hooks.js`, `zh/lang-hooks.js`, o que restou de `fr/app.js` e `zh/app.js` e a ordem dos
`<script>` em `fr/index.html` e `zh/index.html`. Foco: erros e robustez (arquitetura fica com o outro revisor).
Nenhum código foi alterado nesta revisão. Commit da `main` revisado: `1559776e`. **C1, A1, A2 e A3 foram corrigidos depois
(2026-10-24); registro em `docs/historico/31-revisao-codigo-compartilhado.md`.**

Os scripts de prova ficam no scratchpad da sessão
(`/tmp/claude-0/-home-user-mandarimdozero/4c1eb048-5257-5fef-a1a8-50fce44b465c/scratchpad/revisao/`): carregam os
arquivos de produção no Chromium (Playwright), com o Supabase de mentira, como os testes de `tests/paridade-sites/`.

## Resumo

| Gravidade | Quantos |
|---|---|
| Crítico | 1 |
| Alto | 3 |
| Médio | 3 |
| Baixo | 8 |

Críticos e altos, em uma linha cada:

1. **C1** XSS por URL de imagem/áudio do cartão (atributo sem escape), alcançável pelo Deck público de outra conta.
2. **A1** XSS por texto do cartão no Combinar e na Revisão rápida (cartões próprios, inclusive os copiados de Deck público).
3. **A2** Falha de rede ao buscar cartões da professora/próprios no carregamento apaga o progresso FSRS deles no próximo save.
4. **A3** Revisão rápida continua dando "Errei" em cartões depois que a aluna sai da sessão.

---

## Crítico

### C1. URL de imagem e de áudio do cartão entram crus em atributo HTML (XSS entre contas pelo Deck público)

> **CORRIGIDO** (2026-10-24, branch `claude/friendly-hamilton-u4ssl2`): `shared/core/midia-segura.js` (`safeMediaUrl`,
> `flashcardImageHTML`) nos 4 renderers e no `customAudioBtnHTML`. Prova: `tests/revisao-seguranca/test_c1_*.js`.
> A parte do banco (validar URL em `fields`/na publicação do Deck público) continua proposta, não feita.

- **Gravidade**: crítico. **Confiança**: alta no cliente (provado); média na cadeia completa pelo banco (lida no SQL, não
  executada ao vivo).
- **Onde**:
  - `shared/core/revisao-cartoes.js:77`, `:148`, `:153`, `:302`, `:306`: `<img src="${...ImageUrl}">` sem escape.
  - `shared/core/quase-iguais-pinyin.js:187`: o mesmo no renderer de Múltipla escolha.
  - `shared/core/quase-iguais-simples.js:51`: `customAudioBtnHTML(url)` põe a URL crua em `data-audio-url="${url}"`.
  - A URL vem de `field.image.url` / `field.audio.url` sem validação (`shared/flashcard-model.js:1165`, `:226`).
- **Caminho entre contas**: qualquer conta grava `own_flashcards.fields` pela API REST (RLS do dono) com
  `image.url = 'https://x/a.png" onerror="..."'`. Ao publicar o Deck, `public_note_native` (migration 071, linhas 39 a 50)
  só tira `storagePath`/`generationKey`; a própria 071 diz que URL de outro host "fica como link externo". A outra aluna
  abre o Deck público e toca em "Ver" (`shared/public-deck.js:427-431` chama `openFlashcardPreviewFromRow`), que usa os
  mesmos renderers. Copiar o Deck leva o cartão para o `own_flashcards` dela e o código roda de novo em toda Revisão.
- **Impacto para a aluna**: script roda na sessão dela: lê o token do Supabase do `localStorage`, age como ela
  (progresso, perfil, amigos), e na conta da professora/admin abre o painel inteiro.
- **Prova**: `xss_img.js` monta uma Note com essa URL e chama `openFlashcardPreviewFromRow` no fr e no zh:
  `{"pwned":1,"imgAttrs":["src","onerror","class","alt"]}` nos dois sites, sem erro de página.
- **Correção proposta**: um helper único `safeMediaUrl(u)` (só `https:` e, opcionalmente, só o host do Storage) mais
  `escapeHTML` em todo `src`/`data-audio-url`; no banco, um CHECK/validação das URLs de `fields` (ou recusar URL de fora
  do bucket na publicação do Deck público). Corrigir os dois lados: o cliente protege também os cartões já gravados.

## Alto

### A1. Texto do cartão vira HTML no Combinar e na Revisão rápida

> **CORRIGIDO** (2026-10-24): `escapeHTML` nos 3 pontos (+ pinyin do zh). Prova: `tests/revisao-seguranca/test_a1_texto.js`.
> A marcação da opção certa por índice (B3) não foi mexida: com o texto escapado, a comparação por `textContent` acerta.

- **Gravidade**: alto. **Confiança**: alta (provado).
- **Onde**:
  - `shared/core/exercicios-licao.js:530`: `<div class="match-tile-face match-tile-front">${t.text}</div>` (Combinar).
  - `shared/core/licao-base.js:428`: `${cardAnswerText(opt)}` nas opções da Revisão rápida.
  - `fr/lang-hooks.js:41` e `zh/lang-hooks.js:78-79`: `speedPromptHTML` põe `cardPromptText(card)` (e o pinyin) cru.
- **Origem do texto**: cartões próprios entram no Combinar e na Revisão rápida (`eligibleReviewPool`); o texto é da aluna
  ou de quem publicou o Deck que ela copiou. O resto da Revisão (os 4 renderers) já escapa; só estes dois modos não.
- **Impacto**: o mesmo de C1 quando o cartão veio de Deck público copiado; com cartão próprio, ao menos quebra a tela
  (um `<` ou `&` no texto some ou vira tag).
- **Prova**: `xss_match.js` cria 10 cartões próprios com `<img src=x onerror=...>` no texto: 5 execuções ao abrir o
  Combinar e mais 1 na Revisão rápida, no fr e no zh.
- **Correção proposta**: `escapeHTML` nos três pontos. Junto: `shared/core/quase-iguais-textos.js:56` compara
  `btn.textContent === correctText` para pintar a certa; com o texto escapado continua funcionando, mas o certo é marcar
  pelo índice da opção (ver B3).

### A2. Busca de cartões da professora/próprios que falha no carregamento apaga o progresso FSRS deles

> **CORRIGIDO** (2026-10-24): falha de busca = `null`; entradas salvas sem par guardadas em `PRESERVED_SAVED_CARDS` e
> regravadas no save até a próxima busca boa. Prova: `tests/revisao-seguranca/test_a2_progresso.js`.

- **Gravidade**: alto. **Confiança**: alta (provado).
- **Onde**: `shared/core/estado-trilha-desafios.js:210-218` (`loadStateAndRender`) chama
  `mergeTeacherFlashcardsIntoState`/`mergeSelfFlashcardsIntoState` antes do `loadState`. As buscas devolvem `[]` em caso
  de erro (`shared/teacher-flashcards.js:49`, `shared/own-flashcards.js:30`), igual a "não há cartões". Depois,
  `mergeSavedCards` (`shared/study-trail-model.js:295`) só percorre `STATE.cards`: o progresso salvo de cartão que não está
  lá é descartado. `loadState` marca `progressLoadedOk = true` mesmo assim, e o próximo `saveState` grava o bloco sem
  esses cartões.
- **Impacto para a aluna**: um erro de rede, timeout ou falha passageira do Supabase só nessa consulta (o `loadState` tem
  3 tentativas; essas buscas não têm nenhuma) zera a memória de todos os cartões da professora e dos próprios. No próximo
  acesso eles voltam como New. Fere a regra "nunca apagar progresso de memória (FSRS) por engano". O guarda de
  `MONOTONIC_PROGRESS_FIELDS` (`shared/auth.js:51`) não pega: olha só `xp`, `totalReviews`, `totalAudioPlays`.
- **Prova**: `perda_prof.js` (fr): progresso salvo com o cartão `t77` (9 revisões, stability 42), `teacher_flashcards`
  responde erro, `loadStateAndRender()` e depois `saveState()`: `teacherCardsInState: 0`, `progressLoadedOk: true`,
  o bloco gravado não tem mais o `t77`.
- **Correção proposta** (qualquer uma das duas, de preferência as duas): (a) as buscas devolvem `null` no erro e,
  nesse caso, `loadStateAndRender` tenta de novo e, se ainda falhar, não deixa salvar (`progressLoadedOk = false`) ou
  guarda à parte as entradas salvas sem par; (b) `mergeSavedCards` passa a guardar as entradas `teacher`/`self` sem par
  numa lista (ex.: `STATE.unmatchedSavedCards`) que `serializeCardsForSave` regrava, para que só uma exclusão explícita
  as remova.

### A3. Revisão rápida continua corrigindo cartões depois que a aluna sai

> **CORRIGIDO** (2026-10-24): `stopSpeedSession()` (troca de aba, Voltar, outro modo, sessão nova) e passagem de 700 ms
> presa à sessão. Prova: `tests/revisao-seguranca/test_a3_revisao_rapida.js`.

- **Gravidade**: alto. **Confiança**: alta (provado).
- **Onde**: `shared/core/quase-iguais-textos.js:91`: depois de cada resposta, `setTimeout(() => renderSpeedReview(), 700)`
  sem guardar o identificador e sem conferir se a sessão continua aberta. `backToReviewModeSelect`
  (`shared/core/quase-iguais-simples.js:108`) e a troca de aba (`fr/app.js:503`, `zh/app.js:1553`) param o cronômetro,
  mas não esse `setTimeout`. Ele chama `renderSpeedReview` (`shared/core/licao-base.js:291`), que liga um cronômetro
  novo (`runSpeedTimer`) na tela escondida; ao esgotar, `answerSpeedQuestion(false)` dá nota 0 com `applyMemoryGrade`,
  e o ciclo se repete até acabarem os corações. No fim ainda roda `registerStudyToday` e XP.
- **Impacto para a aluna**: responde um cartão, sai em menos de 0,7 s (Voltar ou outra aba) e, sem ver nada, até 3
  cartões levam "Errei" no FSRS (voltam para aprendizagem, ganham lapso) e a sequência do dia conta estudo que não houve.
- **Prova**: `speed_race.js` (fr): acerta o 1º, chama `backToReviewModeSelect()` e `switchTab('path')`; 15 s depois os
  cartões `s801` e `s802` passaram de `new` para `learning` com `fsrsLapses: 1`; `SPEED_STATE.active` já era `false`.
- **Correção proposta**: guardar o handle do `setTimeout` em `SPEED_STATE` e limpar em `stopSpeedTimer`; e no começo de
  `renderSpeedReview`/no callback, sair se `!SPEED_STATE.active` ou se `#speed-review-content` não está visível.

## Médio

### M1. Cartões de hanzi (zh) ainda têm id pela posição

- **Gravidade**: médio. **Confiança**: alta no mecanismo; o dano depende de alguém editar `zh/hanzi-data.js`.
- **Onde**: `zh/app.js:138` (`id: \`h${lessonIdx}-c${charIdx}\``) e `mergeSavedHanziCards`
  (`shared/study-trail-model.js:556`), que casa por esse id. O livro-razão `zh/published_ids.json` não tem nenhum id `h...`,
  então `tests/curriculo-ids` não barra mudança.
- **Impacto**: inserir, tirar ou reordenar um hanzi numa lição passa o progresso de um caractere para outro (ou o perde),
  o mesmo problema que a chave `k` resolveu na trilha.
- **Correção proposta**: chave congelada por hanzi (o próprio caractere + lição, ou `k`), com fusão para os ids antigos, e
  os ids `h...` no livro-razão.

### M2. Nova tentativa da voz do navegador não pode ser cancelada e corta o áudio do cartão seguinte

- **Gravidade**: médio. **Confiança**: média (lido no código; não reproduzido num navegador com voz real).
- **Onde**: `shared/core/voz.js:99-116`: se `onstart` não disparou em 800 ms, o
  `setTimeout` chama `stopExerciseAudio()` (que faz `speechSynthesis.cancel()` e pausa o mp3 atual) e fala de novo o
  texto ANTIGO. O handle não é guardado; trocar de cartão ou de aba não o cancela.
- **Impacto**: em celular/Chromium com a voz lenta para começar (caso que o próprio código descreve), a aluna avança e o
  áudio do cartão novo é cortado e trocado pela palavra anterior. Só afeta texto sem mp3 (cartões da professora/próprios,
  frases com nome da aluna). Já era assim antes da paridade.
- **Correção proposta**: guardar o timer, limpar em `stopExerciseAudio`, e na nova tentativa conferir se o botão ainda
  está no documento (`btnEl.isConnected`).

### M3. Desafios no site em inglês caem no português quando falta a tradução do item

- **Gravidade**: médio. **Confiança**: média (o código é claro; não dá para conferir aqui se todo desafio publicado na
  produção tem entrada em `fr/challenges.en.js`, que hoje tem 216 ids).
- **Onde**: `shared/desafios-telas.js:758` (`c.meaning.pt`), `:1028-1029` (`c.translationPt`, `c.explanation`),
  `shared/desafios.js:771` (`c.explanation` do Ouça e traduza), `checkAccentAnswer` via `challengeText`.
- **Impacto**: desafio publicado sem a tradução mostra explicação/sentido em português no site em inglês (regra da autora:
  nada em português no site em inglês). Também: `c.meaning.pt` sem `meaning` derruba a tela com TypeError.
- **Correção proposta**: no site que não é pt-BR, desafio sem overlay não entra na lista (ou mostra só o que é do idioma
  estudado) e um teste compara os ids publicados no banco com o overlay antes de publicar.

## Baixo

- **B1. Áudio automático conta como áudio tocado.** `speakStudy` (`shared/core/voz.js:119-122`) sempre chama
  `registerAudioPlay`, e os renderers chamam `LANG_HOOKS.speak(..., true)` no autoplay (`shared/core/revisao-cartoes.js:172`,
  `:341`). O comentário de `registerAudioPlay` (`shared/core/audio-fala.js:36-40`) diz "clique manual ou atalho r". Infla
  a trilha "Ouvido treinado" e `audioPlaysToday`. Já era assim no fr/zh antes da extração (commit `89c5b66b^`).
  Confiança alta. Correção: só registrar quando `!isAutoplay`, se for essa a regra.
- **B2. `playPregeneratedAudio` acusa falha falsa.** `shared/core/quase-iguais-chaves.js:234-263`: `stopExerciseAudio()`
  pausa o áudio anterior, cujo `play()` ainda pendente rejeita com AbortError; o `catch` mostra "toque no alto-falante"
  (autoplay) ou grava `audio_play_failed` (manual) sem falha real. Confiança média. Correção: ignorar `e.name === 'AbortError'`.
- **B3. Revisão rápida pinta a opção certa pelo texto.** `shared/core/quase-iguais-textos.js:56`: duas opções com o mesmo
  texto ficam as duas verdes; texto com `&`/`<` não casa e nenhuma fica verde. Confiança alta. Correção: marcar pelo índice.
- **B4. Áudio próprio do cartão não para ao avançar.** `shared/core/audio-fala.js:79` cria `new Audio(url)` fora de
  `exerciseAudioEl`, então `stopExerciseAudio` não o alcança; o áudio da professora continua tocando no cartão seguinte ou
  em outra aba. Confiança alta. Correção: passar por `playPregeneratedAudio`/`exerciseAudioEl`.
- **B5. `audioBtnHTML` frágil.** `shared/core/quase-iguais-chaves.js:7` só troca `"`; `&` não é escapado (texto com
  `&lt;` muda ao ser lido de volta do `data-speak`) e `text` nulo derruba a tela. Confiança alta. Correção: `escapeHTML(String(text ?? ''))`.
- **B6. `Object.assign` com save que traz `__proto__`.** `shared/core/estado-salvar.js:83-107` copia objetos do JSON salvo
  com `Object.assign`; uma chave `"__proto__"` troca o protótipo do sub-objeto (testado em Node: `modesUsed.polluted === 1`,
  `{}` intacto). Só afeta a própria conta (o dado é dela); `dictations` e o arquivo de currículo já filtram. Confiança alta.
- **B7. Links dos Desafios sem conferir o esquema.** `shared/desafios-telas.js:220` e `shared/desafios-admin.js:254` usam
  `href="${escapeHtmlChallenge(r.url)}"`; um `javascript:` passaria. Só a admin grava desafios, por isso baixo.
- **B8. Robustez para o próximo site (pt).** `buildCardsFromUnits` (`shared/core/quase-iguais-chaves.js:176`) faz
  `u.vocab.forEach` sem checar (unidade não gramatical sem `vocab` derruba o boot); `shared/desafios-telas.js:41`, `:265` e
  `shared/ditados.js:271` usam `MODULES` sem `typeof` (site com Desafios/Ditados e sem módulos quebra); `shared/conjugacao.js:264`
  lê `LANG_HOOKS.familiaLatina.gruposDeAcentos` sem checar. Hoje fr e zh não chegam nesses caminhos.

Observação (não conta como achado, é decisão já registrada em `docs/historico/21-auditoria-xp.md`): o Combinar dá
`addXP(2)` por par em toda partida, sem limite diário, e soma os pares em `totalReviews`
(`shared/core/quase-iguais-textos.js:119`, `:138`); dá para subir no ranking semanal repetindo a partida.

## O que foi conferido e está em ordem

- **Ordem de carregamento e globais**: análise com acorn de todos os `<script>` locais das duas páginas (153 no fr, 140
  no zh): nenhum `let`/`const`/`class` repetido entre arquivos. Única função declarada em mais de um arquivo:
  `refreshNativeCardTypeBox` (`flashcard-mc-editor.js`, `flashcard-typeanswer-editor.js`, `flashcard-cloze-editor.js`),
  fora do escopo; a última carregada é a mais completa, então não causa erro.
- **Globais não definidas** (ESLint `no-undef` com os nomes de cada página): todo uso de `MODULES`, `LEVEL_TESTS`,
  `CHALLENGES`, `isChallengesAdmin`, funções de Desafios/Ditados no zh e `renderFullSentenceExercise` no fr está protegido
  por `typeof`/`in STATE` ou num caminho que o site não alcança.
- **LANG_HOOKS**: os ganchos que só o zh tem (`checkpointExam`, `checkpointScore`, `examScreenOpened`, `levelTestKeys`,
  `grammarInputExtraHTML`, `wireGrammarInputExtra`) são sempre chamados com checagem; os obrigatórios existem nos dois.
- **i18n**: toda chave literal de `t()`/`tp()` dos arquivos do escopo e as de `lessonKeys`/`uiKey` existem em pt-BR e en;
  `CHALLENGE_I18N` (129) e `DICTATION_I18N` (47) têm as mesmas chaves em pt-BR e en. Varredura das abas no site em inglês
  (fr e zh, convidado) não achou texto em português visível; 0 erros de página.
- **wire\***: cada `wire...()` de `shared/core/app-comum.js` é chamado uma vez em cada `app.js`; listeners globais
  (teclado, `i18n:change`, voz) registrados uma vez.
- **Currículo**: todas as palavras, frases e falas de `fr/content.js` e `zh/content.js` têm `k`; nenhuma unidade não
  gramatical sem `vocab`. A lógica de arquivo/fusão (`applyStudyKeyChanges`) é idempotente e recupera o que volta.
- **Escape**: Desafios, Ditados, Conjugação e os 4 renderers da Revisão escapam o texto (o problema é só URL, C1, e os
  dois modos de A1).

## Testes rodados (números reais)

Rodados um por vez nesta árvore (uma primeira rodada em paralelo deu falsos erros porque os testes "antes x depois"
disputam o mesmo worktree temporário):

| Teste | Resultado |
|---|---|
| `tests/paridade-sites/test_atalhos.js` | 92 passaram, 0 falharam |
| `tests/paridade-sites/test_conjugacao.js` | 343 passaram, 0 falharam |
| `tests/paridade-sites/test_conjugacao_motor.js` | 45/45 |
| `tests/paridade-sites/test_correcoes_5d.js` | 4/4 |
| `tests/paridade-sites/test_css_compartilhado.js` | 5/5 |
| `tests/paridade-sites/test_desafios.js` | 2242 passaram, 0 falharam |
| `tests/paridade-sites/test_desafios_css.js` | 25/25 |
| `tests/paridade-sites/test_desafios_motor.js` | 49/49 |
| `tests/paridade-sites/test_ditados.js` | 828 passaram, 0 falharam |
| `tests/paridade-sites/test_ditados_motor.js` | 41/41 |
| `tests/paridade-sites/test_gramatica_cenario.js` | 46/46 |
| `tests/paridade-sites/test_licao_feedback.js` | 43/43 |
| `tests/paridade-sites/test_modulos_niveis.js` | 90 passaram, 0 falharam |
| `tests/paridade-sites/test_quase_iguais.js` | 2768 passaram, 0 falharam (fr pt-BR 1004, fr en 382, zh pt-BR 1007, zh en 363 cenas iguais) |
| `tests/paridade-sites/test_voz.js` | 34 passaram, 0 falharam |
| `tests/curriculo-ids/test_*.js` (7 arquivos) | 125/125, 38/38, 29/29, 9/9, 24/24, 29/29, 39/39 |
| `tests/e4/test_core_carregado.js` | 51/51 |
| `tests/e4/test_lote5b_textos.js` | 9 passaram, 2 falharam (teste desatualizado: espera `review.match.attempts` como texto simples, mas o catálogo virou plural `{one, other}`; o código usa `tp()` e está certo) |
| `tests/e4/test_lote5c_chaves.js` | 20/20 |
| `tests/e4/test_lote5d_pinyin.js` | 12/12 |
| `tests/e4/test_lote5e_dados.js` | 10/10 |
| `tests/e4/test_progresso_ida_e_volta.js` | 26/26 |

Os testes existentes não pegam C1, A1, A2 nem A3: nenhum usa URL/texto hostil nos cartões, simula falha só da busca de
cartões, nem sai da Revisão rápida no meio da transição.
