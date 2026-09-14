# Arquitetura do sistema de revisão e memória

Este documento descreve a arquitetura resultante do projeto "Reestruturação
do sistema de revisão e memória" (Fases 1-15), que substituiu o motor SM-2
original por um motor de memória unificado inspirado no FSRS (o algoritmo
usado hoje pelo Anki). Cobre os dois idiomas (`fr/`, `zh/`), que
compartilham o mesmo motor via `shared/`.

```
VOCABULÁRIO
     ↓
ESTADO DE MEMÓRIA        (shared/fsrs.js)
     ↓
MOTOR DE AGENDAMENTO      (shared/fsrs.js: scheduleReview)
     ↓
FILA DE ESTUDO            (shared/study-queue.js: getStudyQueue)
     ↓
DIFERENTES MODOS DE APRESENTAÇÃO
  (Flashcard, Speed Review, Palavras Difíceis, Combinar)
```

Flashcard, Speed Review, Palavras Difíceis e Combinar não são quatro
sistemas independentes: são diferentes formas de trabalhar com o mesmo
universo de vocabulário e o mesmo estado de memória. Nenhuma delas mantém
seu próprio `due` ou histórico paralelo.

## MEMORY ENGINE — `shared/fsrs.js`

O motor de memória de verdade. Puro (não lê `STATE`, não conhece UI, não
conhece idioma) — recebe um `card` e uma nota, devolve o `card` atualizado.

- `scheduleReview(card, grade, now)` — a máquina de estados FSRS-6 em si.
  `grade` na escala 1-4 (1=Errei .. 4=Fácil). Lê/escreve
  `stability/difficulty/state/lastReview/due/fsrsReps/fsrsLapses`.
  `state` é `'new' | 'learning' | 'review' | 'relearning'`; `isNew` é
  decidido por `!card.state || card.state === 'new'` — por isso qualquer
  código que precise fazer um cartão "voltar a ser novo de verdade" tem
  que resetar `state` (e não só `reps`), senão o motor trata a próxima
  resposta como recall de uma stability antiga em vez de aprendizagem
  nova (bug real encontrado e corrigido na Fase 15 -- ver `wireKnowButtons`
  em `zh/app.js`/`fr/app.js`).
- `applyMemoryGrade(card, sm2Grade, now)` — o funil único de entrada usado
  por todas as atividades. Traduz a escala antiga da UI (0=Errei..3=Fácil,
  a mesma dos 4 botões do Flashcard) para a escala FSRS (1-4) e chama
  `scheduleReview`. Depois disso, mantém como **ponte de compatibilidade**
  os campos legados `reps/lapses/interval` (ainda lidos por
  `hardWordsPool()`/`vocabStrengthBuckets()`/`reviewXP()`) — `interval` é
  só um espelho de `stability` arredondada, não uma segunda fonte de
  verdade. Um erro (grade 0) NUNCA zera `reps` (Princípio 7: uma palavra
  aprendida que teve um lapso não volta a "nunca aprendida" — vira
  `state:'relearning'`).
- `migrateCardToFSRS(card)` — bridge SM-2 → FSRS, chamada uma vez por
  cartão no load (`loadStateAndRender`). Idempotente via `card.fsrsMigrated`
  (nunca inferido de `stability !== undefined`, porque um cartão novo de
  verdade também nasce com `stability:0`). Cartão nunca estudado
  (`reps===0`) migra igual a um cartão novo de verdade, sem inventar
  histórico. Cartão com histórico real aproxima `stability` a partir de
  `interval` e `difficulty` a partir de `ef`, sem recalcular do zero e sem
  fazer vencidas virarem avalanche (não recalcula `due`).
- `FSRS_REFERENCE_RETENTION` (fixo, 0.9) vs `FSRS_DESIRED_RETENTION`
  (configurável pelo aluno via "Frequência de revisão") — **não são a
  mesma constante**: a primeira é a definição matemática do que
  "stability" significa (usada no denominador da fórmula de intervalo); a
  segunda só entra no numerador. Trocar uma pela outra faz `interval`
  colapsar para `=== stability` sempre, cancelando o efeito da
  configuração (bug real da Fase 10, corrigido).

## STUDY QUEUE — `shared/study-queue.js`

`getStudyQueue(pool, options)` é o único lugar que decide "quem entra numa
sessão". Nenhuma tela tem lógica de seleção própria.

- `scope:'due'` (Flashcard, revisão geral) — devidas = só cartões já
  estudados (`reps>0`) com `due<=now`; cartões novos entram só pela raia
  limitada de `options.newCardsLimit` (padrão 10, configurável). Cartões
  com `due:0` não "sempre contam como devidos" (bug real da Fase 4/10,
  corrigido na Fase 10 quando a config de novas/dia virou visível).
- `scope:'unit'` (Flashcard estudando uma unidade específica) — due
  primeiro, resto depois, sem teto de novas (o aluno escolheu focar
  naquela unidade inteira).
- `scope:'hard'` (Palavras Difíceis) — **não depende de due**: due
  ("precisa revisar agora") e difícil ("é uma palavra difícil") são
  dimensões independentes (Fase 7). Critério: `reps>0 && (lapses>0 ||
  difficulty>=6)`, ordenado por difficulty/lapses decrescente.
- `scope:'all'` (Combinar) — pool inteiro, sem filtro de due (atividade de
  prática sempre disponível, independente do que está devido). Speed
  Review **não** usa mais `scope:'all'` desde o projeto "Reorganização da
  experiência de revisão e prática" -- ver seção dedicada abaixo.
- `options.limit` — teto genérico de tamanho de sessão (Fase 10,
  "Intensidade da sessão": leve/normal/intensa).

## ACTIVITY RESULT — quem escreve memória e quem só lê

| Atividade | Escreve memória? | Quando |
|---|---|---|
| Flashcard / revisão de hanzi | Sim, sempre | Toda resposta (`gradeCurrentCard`/`gradeHanziCard` → `applyMemoryGrade`) — é recuperação ativa (Princípio 4), sempre reagenda. |
| Exercícios de lição | Sim, só na 1ª vez | `registerExerciseCorrect` → `applyMemoryGrade(card, 2)` só se `reps===0` (promove cartão novo; não reagenda um já aprendido). |
| Speed Review | **Sim, sempre** (mudou no projeto "Reorganização") | `answerSpeedQuestion`: toda resposta chama `applyMemoryGrade(card, isCorrect ? 2 : 0)`, incondicional. Deixou de ser "só promove cartão novo" porque a fila deixou de ser `scope:'all'` e passou a ser a fila DEVIDA (`buildDueReviewQueue`, idêntica à do Flashcard) — ver seção dedicada abaixo. |
| Combinar | Sim, só cartão novo | Mesma regra do Speed Review, em `onMatchTileClick`. |
| "Já sei?" | Sim, ao marcar | `applyMemoryGrade(card, 3)`. Ao desmarcar, reseta memória por completo (`state:'new'`, `stability:0` etc. — Fase 15) pra não deixar o cartão num estado inconsistente. |
| "Rever mais" | **Não** | `reviewMoreCurrentCard()` só reinsere o cartão mais à frente na fila da SESSÃO atual — nunca chama `applyMemoryGrade`/`addXP`. Praticar não é o mesmo que revisar (Fase 11). |

Nenhuma atividade cria um segundo `due` ou histórico paralelo. `SPEED_STATE`
(Speed Review) e `MATCH_STATE` (Combinar) guardam só estado de UI/sessão do
jogo (hearts, score, timer, tiles) — nunca stability/due/histórico.

## XP SYSTEM — separado do motor de memória

XP e memória são sistemas independentes por construção (Princípio 5):
`applyMemoryGrade`/`scheduleReview` nunca tocam `STATE.xp`/`STATE.periodXp`,
e `addXP()` nunca toca campos de cartão. Uma mesma resposta pode gerar
ambos (ex: Flashcard chama `applyMemoryGrade` e, separadamente, `addXP`
via `reviewXP()`), mas alterar um não quebra o outro.

- `addXP(n)` — soma em `STATE.xp` e `STATE.periodXp.amount` (usado pelo
  Ranking).
- `saveState()` (`shared/auth.js`) — grava `STATE.periodXp.amount` em
  `weekly_xp` (upsert por `user_id + week_start + language_app_key`) a
  cada save; é o único caminho que alimenta o Ranking, sem atalhos.
- Speed Review concede XP real (uma vez por sessão, sem farm repetindo);
  Combinar concede XP por par certo; ambos sem toast individual por XP
  durante o jogo (acumula e mostra ao final).

## MIGRATION — SM-2 → FSRS

Migração feita uma vez por cartão, no load, via `migrateCardToFSRS`
(chamada em `loadStateAndRender`, depois de `loadState()`). Não apaga
nenhum dado (Regra 7): os campos legados `reps/interval/lapses/ef`
continuam no objeto do cartão, só passam a ser escritos apenas pela ponte
de compatibilidade em `applyMemoryGrade` (nunca mais por um motor SM-2
separado). `applySM2()` (o motor original) foi removido do código na Fase
15 — não tinha mais nenhum call site desde a Fase 5.

## CONFIGURAÇÕES — `STATE.studySettings`

Três controles simples (Fase 10), sem nenhum parâmetro técnico exposto:

- `reviewFrequency` (`'frequent'|'balanced'|'spaced'`) →
  `reviewFrequencyToRetention()` → `FSRS_DESIRED_RETENTION`.
- `newCardsPerDay` (número) → `getStudyQueue`'s `newCardsLimit`.
- `sessionIntensity` (`'light'|'normal'|'intense'`) →
  `sessionIntensityToLimit()` → `getStudyQueue`'s `limit`.

### Política de retenção (projeto "Aprimoramento do Flashcard")

Auditoria dedicada (rastreando `resposta → applyMemoryGrade → scheduleReview
→ due`, com simulação antes de mexer em qualquer número) confirmou que o
mapeamento `frequent→0.95 / balanced→0.90 / spaced→0.85` já é adequado —
não foi alterado. Intervalos reais produzidos por "Bom" numa palavra nova,
por nível:

| Frequência | Retenção | Bom (palavra nova) | Bom→Bom→Bom |
|---|---|---|---|
| Mais frequente | 0.95 | 1 dia | 1→3→8 dias |
| Equilibrada (padrão) | 0.90 | 2 dias | 2→11→46 dias |
| Mais espaçada | 0.85 | 4 dias | 4→31→173 dias |

Simulação em escala (10/50/100 palavras novas/dia, sempre "Bom", 60 dias)
confirma que a carga diária de revisões converge pra um patamar estável
(~3x o número de palavras novas/dia) em vez de crescer sem limite — sem
avalanche de revisões sob a política padrão.

**O sintoma relatado ("Bom parece agendar 6-8 dias") não era um problema
do motor.** Os 4 botões de resposta tinham o `<small>` com texto ESTÁTICO
(`"Bom<small>6-8d</small>"`), sobrado de antes da migração pro FSRS — nunca
ligado ao cálculo real. Corrigido: `previewNextIntervalDays(card, sm2Grade,
now)` (shared/fsrs.js) reaproveita a MESMA função de estabilidade que
`scheduleReview()` usa de verdade (`fsrsNextStability`, extraída uma vez pra
eliminar cálculo duplicado), então o marcador nunca pode divergir do due
real que seria salvo. `formatReviewInterval(days)` traduz pra texto humano
(`min/h/dia(s)/sem./mês(es)/ano(s)`, com 1 casa decimal em anos pra não
esconder diferenças entre cartões muito maduros). `gradeButtonsHTML(card)`
(zh/app.js, fr/app.js) é o único lugar que monta os 4 botões — usado tanto
pelo Flashcard de vocabulário quanto pela revisão de hanzi (zh).

## HOME / WIDGET DE VOCABULÁRIO (Fase 12)

- **Revisões de hoje** (`renderReviewTodayWidget`, dentro de
  `renderReviewModeSelect()`) — o mesmo número usado pelo tile do
  Flashcard (via `todaysReviewCount`, que chama `getStudyQueue` com as
  mesmas opções de `startReviewSession` — Fase 14, corrige uma
  inconsistência real onde o widget usava `cardsDueNow` sem teto e a
  sessão de fato usava o teto configurado).
- **Suas palavras** (`renderVocabStrengthWidget` / `vocabStrengthBuckets()`)
  — estado geral do vocabulário (fraca/mediana/forte), independente de
  due. Desde o projeto "Reorganização da experiência de revisão e
  prática" (ver seção abaixo) não vive mais na aba Revisão — mora em
  Progresso (`renderProgressView()`), porque responde "como está meu
  vocabulário", não "o que eu devo fazer agora".

## REVISAR / PRATICAR / PROGRESSO — projeto "Reorganização da experiência de revisão e prática"

Projeto de UX/arquitetura que reorganizou a experiência em torno do motor
de memória já existente (Fases 1-15 + "Aprimoramento do Flashcard"), sem
alterar o motor em si. Problema de origem: Flashcard, Speed Review,
Palavras Difíceis e Combinar pareciam ferramentas independentes — o aluno
não conseguia responder "o que eu devo estudar agora?" de relance, e Speed
Review podia mostrar uma bateria de palavras diferente da fila real de
revisão (porque usava `scope:'all'`, não a fila devida).

Novo modelo mental, aplicado em `renderReviewModeSelect()` (zh/app.js,
fr/app.js) e no markup de `#review-mode-select-wrap` (zh/index.html,
fr/index.html):

- **REVISAR** — o que o motor de memória diz que está devido agora. A
  ÚNICA fonte de verdade é `buildDueReviewQueue(pool)` (wrapper de
  `getStudyQueue(pool, {scope:'due', newCardsLimit, limit})`). Flashcard e
  Speed Review são duas APRESENTAÇÕES da mesma fila, nunca duas fontes de
  dados diferentes:
  - Flashcard (`startReviewSession`) chama `buildDueReviewQueue(pool)`.
  - Speed Review (`buildSpeedQueue`) chama exatamente a mesma função.
  - Isso obrigou uma mudança de contrato do Speed Review: antes só
    promovia cartão nunca estudado (`reps===0`) que acertasse; agora, como
    a fila é a fila devida (pode conter cartões já aprendidos mas
    atrasados), toda resposta grada de verdade
    (`applyMemoryGrade(card, isCorrect ? 2 : 0)`), senão seria impossível
    "zerar" a fila devida jogando Speed Review.
  - `dueReviewQueueOptions()`/`trueDueReviewCount(pool)`/
    `todaysReviewCount(pool)` são as únicas funções que decidem "quantas
    revisões existem hoje" — `trueDueReviewCount` é o total real (sem o
    teto de intensidade de sessão), `todaysReviewCount` é o que cabe nesta
    sessão; a UI mostra os dois quando divergem, nunca esconde a diferença
    (Fase 8: "contagem honesta").
  - Quando `dueCount===0`, a seção Revisar vira um único card
    `.review-mode-empty` ("Você está em dia!") — nunca dois tiles
    desabilitados fingindo que ainda há uma decisão a tomar.
- **PRATICAR** — atividades adicionais, disponíveis independente de due:
  Palavras Difíceis (`getStudyQueue(scope:'hard')`, critério de
  dificuldade/histórico, não de agendamento) e Combinar
  (`getStudyQueue(scope:'all')`, reconhecimento livre). Nenhuma das duas
  cria um scheduler paralelo nem altera due/stability de cartão já
  aprendido (só promovem cartão nunca estudado, mesma regra de antes).
- **PROGRESSO** (`renderProgressView()`) — só estatísticas, nunca um
  comando de estudo: XP, streak, heatmap, gráfico de evolução e agora
  também "Suas palavras" (fracas/medianas/fortes), que saiu da aba Revisão
  porque não respondia "o que eu faço agora" (Fase 3).

Outras mudanças de UX decorrentes:

- **Fim do "Jogar de novo" pós-revisão** (Fase 6) — terminar uma sessão de
  Flashcard ou Speed Review nunca mais oferece repetir a mesma bateria.
  Tela de conclusão vira sempre o par `.review-complete-actions`: "Voltar"
  (→ `switchTab('path')`) e "Praticar mais" (→ `backToReviewModeSelect()`,
  que leva pra PRATICAR — Combinar/Palavras difíceis — nunca reabre a
  revisão que acabou de terminar). `backToReviewModeSelect()` é a função
  central reaproveitada por todo botão "Praticar mais"/back-link da tela
  de Revisão. Combinar continua tendo seu próprio "Jogar de novo"
  (`match-restart-btn`) — ele é PRÁTICA, não revisão, então repetir a
  mesma atividade não viola a regra (que vale só pra telas de conclusão de
  REVISÃO).
- **"Rever mais" continua distinto de revisão agendada** (Fase 7,
  inalterado) — `reviewMoreCurrentCard()` só reinsere o cartão na fila da
  sessão atual, nunca chama `applyMemoryGrade`.

## Free vs. Premium

Nenhuma feature deste projeto foi condicionada a plano pago — não existe
hoje infraestrutura de assinatura/pagamento no código (sem Stripe, sem
tabela de planos, sem checagem de tier em lugar nenhum). Avaliado e
registrado como "tudo grátis por enquanto" (CLAUDE.md), não ignorado por
padrão.

## Onde ficam os testes

- `test_fsrs_engine.js`, `test_study_queue.js`, `test_apply_memory_grade.js`
  — testes puros de motor (Node + `vm`, sem browser).
- `validate_fase*.js` — Playwright, um arquivo por fase do projeto (Fases
  3-14), cobrindo os cenários específicos de cada uma.
- `validate_vocab_strength.js`, `validate_speed_review_xp.js`,
  `validate_speed_review_leak.js` — regressão de features adjacentes que o
  projeto tocou indiretamente.
- `validate_flashcard_dynamic_intervals.js` — projeto "Aprimoramento do
  Flashcard": marcador dos 4 botões == due real, em qualquer estado de
  cartão; reprodução do problema original relatado (Bom numa palavra nova);
  Difícil <= Bom <= Fácil; as 3 opções de Frequência produzem intervalos
  reais diferentes.
- `validate_fase6_speed_review_memory.js`, `validate_fase12_review_today_widget.js`
  — reescritos pro projeto "Reorganização da experiência de revisão e
  prática" (o contrato antigo que testavam foi intencionalmente
  substituído; ver seção REVISAR/PRATICAR/PROGRESSO acima).
  `validate_fase14_consistency_checklist.js` — cobre os itens da checklist
  de consistência do mesmo projeto que não tinham teste dedicado (palavra
  difícil-mas-não-devida fica fora da fila de revisão; palavra
  forte-mas-devida continua na fila; "Praticar mais" não mexe em
  due/stability; Speed Review não depende de "palavras medianas").
  `smoke_revisao_zh.js`/`smoke_revisao_fr.js` (scratchpad da sessão, não
  versionados) — fluxo visual completo Revisão→Speed Review→conclusão→
  Praticar mais, com screenshots.
