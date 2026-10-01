# Fase K — Analytics: contrato implementado (K.2)

Implementação: `shared/analytics-metrics.js` (puro, sem UI/rede/estado, ainda
não carregado nas páginas — a UI vem em K.3+). Testes: `tests/k2/test_analytics_metrics.js`.

## Unidades
- **CardInstance** = unidade estrutural (estudo, revisão, FSRS, contagens N/L/R/Devido).
  Reverso = 2 cartões; Cloze com N marcas = N cartões. A UI chama isto de "cartão".
- **Note** = unidade pedagógica (conteúdo, estudado, força). Irmãs pertencem ao mesmo
  conteúdo. Na Study Trail a Note é a "palavra".
- **Deck** = organização/escopo; esta camada não cria semântica paralela.
- A CardInstance tem identidade e estado FSRS persistido (em `progress`, por id); sua
  estrutura (Note, direção, Deck) é reconstruída a cada carga.

## Identidade da Note (nunca por sufixo de id nem por direção)
study = `unitId:vocabIdx`; teacher/self = `rowId`. Sem esses campos o card vira Note
própria (não funde por sufixo). Ids `-b`, `-cN`, `-rN` não participam.

## Métricas
| Métrica | Unidade | Função |
|---|---|---|
| Cartões, Novos, Aprendendo, Review (estado), Para revisar (Review vencido), Devidos (não-New vencido) | CardInstance | `structuralCounts` |
| Conteúdos, Estudados, Não iniciados | Note | `contentMetrics` |
| Força (não iniciada/fraca/medium/forte) | Note | `noteStrengthBucket` |
| Palavras aprendidas | Note, só Study Trail | `studyTrailWordProgress` |
| Conteúdos estudados | Note, Teacher **ou** Self | `ownContentProgress` |
| Arquivados (informativo) | CardInstance e Note | `archivedCounts` |
| Resumo por origem | ambas, isoladas por origem | `analyticsSummaryByOrigin` |

## Regras
- N/L/R vêm de `cardStudyBucket` (K1, fonte única). New = sem histórico (`reps===0`);
  Learning = learning+relearning; "Review" é estado, **não** sinônimo de Devido.
- Devido = não-New com `due <= agora`; New nunca é devido por `due=0`.
- 48h é regra de notificação do cron (K.0-C), não existe nesta camada.
- Estudado = alguma irmã com `reps>0`. Força = mais fraca entre as irmãs **estudadas**;
  nenhuma estudada = `not_started` (nunca "fraca"). Irmã New não rebaixa.
- Palavras aprendidas: denominador = curso inteiro (ou `courseWordTotal`), só Study Trail.
- Arquivados Teacher/Self ficam fora de numeradores/denominadores ativos.
- Sem total unificado da conta; cada origem é calculada isoladamente.
- Elegibilidade: o chamador passa o universo elegível; esta camada só exclui Teacher/Self
  arquivados e escopa por origem (não reimplementa o gate de lição).

## K.3 -- ligação à UI (Progresso e "Suas palavras", fr + zh)
- "Pendentes agora" (= `cardsDueNow(STATE.cards)`: qualquer card com `due<=agora`,
  incluindo New com due=0 e lições não concluídas) foi **aposentado**. Em Progresso:
  Novos / Aprendendo / Para revisar / Devidos (`structuralCounts` sobre
  `eligibleDeckReviewPool`, CardInstance) + **Para estudar hoje**.
- **Para revisar = estado Review** (não implica Devido); **Devidos** = não-New com `due<=agora`.
  (`reviewDue` do K.2 continua disponível mas não é exibido.)
- **Para estudar hoje** = definição pré-existente do hero da Revisão:
  `trueDueReviewCount(eligibleReviewPool())` (devidos + novas limitadas por `newCardsPerDay`,
  sem o teto de intensidade). Respeita filtros de sessão (origem/tag), como o hero.
- "Palavras aprendidas" = `studyTrailWordProgress` (só Study Trail, curso inteiro).
- "Suas palavras": `contentMetrics(eligibleReviewPool()).strength` -- Note-level, com
  **Não iniciadas** como grupo próprio; `wordLevelStrengthBuckets`/`studyWordStrengthBucket` removidos.
- Mantidos com lógica própria: `wordLevelLearnedCounts` (progresso por unidade, só trilha),
  gráfico histórico (por CardInstance/`firstLearnedDate`, fora desta fase), painel da professora
  (agregados do servidor por CardInstance; Note-level exigiria migration).

## K.4 -- consolidação de progresso (Note x CardInstance)
Superfícies de progresso e a unidade de cada uma:
| Superfície | Unidade | Numerador / denominador | Helper |
|---|---|---|---|
| Palavras aprendidas (Progresso) | Note, só trilha | Notes com irmã `reps>0` / todas as Notes do curso | `studyTrailWordProgress` |
| Progresso da unidade (`unitCardCounts`, `unitProgressFraction`) | Note, só trilha (por `unitId`) | palavras com evidência / palavras da unidade | `studyTrailWordProgress(pool)`; `totalCards`/`dueForReview` permanecem CardInstance |
| Conclusão da unidade (`checkUnitCompletion`) | Note | toda palavra com evidência em A ou B (B New não bloqueia) | `studyWordGroups` + `studyWordHasEvidence` |
| Progresso de unidades/módulo/nível (`computeProgressSummary`) | unidade | unidades concluídas / unidades | regra de unidade, sem relação com cartões |
| Novos/Aprendendo/Para revisar/Devidos | CardInstance | -- | `structuralCounts` |
| Força ("Suas palavras") | Note, todas as origens estudáveis | por categoria | `contentMetrics` |
| Gráfico "Palavras aprendidas ao longo do tempo" | palavra, só trilha | uma data por palavra (a mais antiga das irmãs) | `wordLevelFirstLearnedDates` |
- K.4 removeu `wordLevelLearnedCounts`/`wordLevelUnits` (misturavam Teacher/Self como "palavras")
  e restringiu o gráfico à trilha. Teacher/Self nunca entram em palavras aprendidas.
- O gráfico segue baseado em `firstLearnedDate` por CardInstance (aproximação existente, não é
  histórico Note-level); no zh soma também 汉字 (`hanziCards`), recurso próprio do zh, inalterado.
- **Para estudar hoje** reutiliza `trueDueReviewCount(eligibleReviewPool())` de propósito: respeita os
  filtros de sessão (origem/tag); Novos/Devidos ignoram esses filtros. Não são diretamente comparáveis.
- Pendência K.6: `get_teacher_student_metrics` conta força/"fracas" por CardInstance (nunca revisados
  entram como fracos); corrigir exige RPC Note-level no servidor.

## K.5 -- Analytics de Deck
- **Deck = organização** (árvore); não cria unidade de conteúdo. Estudar/contar um Deck = o Deck
  + toda a subárvore (`getStudyScopeForDeck`), sobre o pool ELEGÍVEL (`eligibleDeckReviewPool`:
  arquivado/lição não concluída fora). Contagem e "Estudar este Deck" usam o mesmo universo.
- **Estrutural (CardInstance)** -- `getDeckCounts` agora delega a `structuralCounts` (única fonte):
  `total`, `new` (sem histórico), `learning` (learning+relearning), `review` (ESTADO Review),
  `due` (não-New com `due<=agora`), `reviewDue` (Review vencido). Reverso = 2 cartões, Cloze = N.
- **MUDANÇA K.5**: `review` do Deck era "Review E vencido" (`countReviewCards`); agora é o estado Review,
  igual a "Para revisar" em Progresso (K.3). O antigo valor é `reviewDue`; Devidos é `due`. Os wrappers
  `countNewCards/countLearningCards/countReviewCards` foram removidos (duplicavam `structuralCounts`).
  As listas "Meus Decks" e "Cartões da professora" mostram: total · novos · aprendendo · para revisar · devidos;
  `total` agora exclui arquivados/inelegíveis (antes contava `STATE.cards` cru).
- **Pedagógico (Note)** -- `getDeckContentMetrics` devolve `{study, teacher, self}` (cada um `contentMetrics`
  ou `null`): Reverso = 1 conteúdo, Cloze = 1 conteúdo, força Note-level (Não iniciada/Fraca/Média/Forte).
  **Nunca há total de conteúdo que misture origens.** Course Deck = Study Trail, Teacher Deck = Teacher,
  Meus Decks = Self. Nenhuma tela exibe conteúdo/força por Deck hoje (helper preparado, sem UI nova).
- Progresso/percentual de Deck: não existe; nenhum percentual novo foi criado.
- Due de Deck não usa o limiar de 48h (só do cron) nem se confunde com "Para estudar hoje" (fila de sessão).
- Fora de K.5: painel da professora (`get_teacher_student_metrics`, força por CardInstance no servidor) -> K.6.

## Fora desta fase
- Histórico por Note e "última atividade" (`firstLearnedDate`/`lastReview` são por
  CardInstance; `lastReview` de cartões migrados é aproximado).
