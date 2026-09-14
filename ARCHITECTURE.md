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
- `scope:'all'` (Speed Review, Combinar) — pool inteiro, sem filtro de due
  (são atividades de prática sempre disponíveis).
- `options.limit` — teto genérico de tamanho de sessão (Fase 10,
  "Intensidade da sessão": leve/normal/intensa).

## ACTIVITY RESULT — quem escreve memória e quem só lê

| Atividade | Escreve memória? | Quando |
|---|---|---|
| Flashcard / revisão de hanzi | Sim, sempre | Toda resposta (`gradeCurrentCard`/`gradeHanziCard` → `applyMemoryGrade`) — é recuperação ativa (Princípio 4), sempre reagenda. |
| Exercícios de lição | Sim, só na 1ª vez | `registerExerciseCorrect` → `applyMemoryGrade(card, 2)` só se `reps===0` (promove cartão novo; não reagenda um já aprendido). |
| Speed Review | Sim, só cartão novo | `answerSpeedQuestion`: se `card.reps===0` e acertou, `applyMemoryGrade(card, 2)`. Cartão já aprendido responde certo/errado no jogo sem tocar due/stability — reconhecimento não é recuperação ativa completa (Princípio 4). |
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

Dois blocos visualmente separados em `renderReviewModeSelect()`:

- **Revisões de hoje** (`renderReviewTodayWidget`) — o mesmo número usado
  pelo tile do Flashcard (via `todaysReviewCount`, que chama
  `getStudyQueue` com as mesmas opções de `startReviewSession` — Fase 14,
  corrige uma inconsistência real onde o widget usava `cardsDueNow` sem
  teto e a sessão de fato usava o teto configurado).
- **Suas palavras** (`renderVocabStrengthWidget` /
  `vocabStrengthBuckets()`) — estado geral do vocabulário (fraca/mediana/
  forte), independente de due. As duas legendas deixam explícito que são
  perguntas diferentes: pode haver palavras medianas mesmo com 0 revisões
  pendentes hoje, e isso não é erro.

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
