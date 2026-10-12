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
- (Pendência K.6 resolvida -- ver seção K.6.)

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
- Fora de K.5: painel da professora -> K.6.

## K.6 -- Teacher Analytics (`get_teacher_student_metrics`, migration 059)
Superfície: botão 📊 existente em "🎓 Alunos" (`shared/admin-students.js`); nenhuma tela nova.
Escopo: UM aluno x UMA professora (auth.uid()) x UM idioma, vínculo `active`; só `origin='teacher'`.
Study Trail, Self, XP, streak e dados de outros alunos/professoras/idiomas nunca saem do servidor.

**Identidade da Note no servidor**: `card.rowId` = id da linha de `teacher_flashcards` (gravado pelo motor
em TODA CardInstance da linha: `-b`, `-cN`, `-rN` e combinações). Revisões `-rN` NÃO criam conteúdo novo
(mesmo rowId). Saves antigos sem rowId: id da linha lido do formato ancorado `t{n}(-r{n})?(-b|-c{n})?`, só
vale se {n} é linha real desta professora/aluno/idioma (validação K.0-B). Nenhuma outra heurística de id,
`lastDirection`, `reviewDirection` ou `isReverse`.
**Atividade/arquivamento** vêm do `status` da LINHA no banco, não do `flashcardStatus` salvo no progresso.

| Campo retornado | Unidade | Definição |
|---|---|---|
| `contentsTotal` | Note | linhas ATIVAS (inclui Notes ainda sem card no progresso) |
| `contentsStudied` / `contentsNotStarted` | Note | alguma irmã ativa com `reps>0` / nenhuma |
| `contentsStrengthNotStarted/Weak/Medium/Strong` | Note | não iniciada = nenhuma irmã estudada; senão a MAIS FRACA entre as estudadas (irmã New não rebaixa); por card: `lapses>=2` fraca, `lapses<2 e interval>=60` forte, resto média (mesma regra de `cardStrengthBucket`, sem fórmula nova) |
| `cardsTotal` | CardInstance | cards ativos presentes no progresso do aluno (Reverso=2, Cloze=N) |
| `cardsNew/Learning/Review` | CardInstance | mesma semântica K1: New=sem histórico; Learning=learning+relearning (e `state new` com `reps>0`); Review=estado Review |
| `cardsDue` | CardInstance | não-New com `due>0` e `due<=agora`; sem 48h, sem `review_overdue` |
| `archivedNotes` / `archivedCards` | Note / CardInstance | informativo, nunca somado ao ativo |
| `lastStudyDay` | conta | atividade da CONTA no idioma (decisão da Fase 6a), NÃO do conteúdo |

Invariantes (testadas): estudados+não iniciados=total; soma da força=total; N+L+R=cardsTotal; Due<=L+R.
Tela: "Conteúdos" = Notes, "Cartões" = CardInstances; "fracos" nunca inclui não iniciados.
Limitações de dado: (1) `cardsTotal` só enxerga cards que o aluno já sincronizou no progresso (uma Note
nova ainda não aberta pelo aluno conta em `contentsTotal` e como Não iniciada, com 0 cartões);
(2) sem histórico Note-level nem "última atividade do conteúdo" (`lastReview` migrado é aproximado,
por isso não é retornado); (3) a função antiga (058) falhava com números fracionários/malformados no
progresso; a 059 os trata como 0. Aplicar a 059 ANTES de publicar o front.
Testes: `tests/fase-k6/` (SQL em Postgres local, Playwright com respostas geradas pela RPC real).

## K.7 -- Student Analytics (métricas do próprio aluno)
Auditoria das superfícies do aluno (sem API nova; tudo client-side, sobre `STATE.cards`):
| Superfície | Métrica / unidade | Origem | Helper |
|---|---|---|---|
| Progresso: Palavras aprendidas | Note, learned/curso inteiro | só Study | `studyTrailWordProgress` (K.3) |
| Progresso: Novos/Aprendendo/Para revisar/Devidos | CardInstance | universo estudável | `structuralCounts(eligibleDeckReviewPool())` |
| Progresso: Para estudar hoje | fila de sessão | respeita filtros origem/tag | `trueDueReviewCount(eligibleReviewPool())` (inalterado) |
| Progresso: **Conteúdos da professora / Meus conteúdos estudados** (NOVO K.7) | Note, estudados/Notes ativas | Teacher e Self SEPARADOS, só aparece a origem com conteúdo | `ownContentProgress` |
| "Suas palavras" (força) | Note, 4 categorias | origens estudáveis | `contentMetrics` (K.3) |
| Decks (Meus Decks / Cartões da professora) | CardInstance | subárvore | `getDeckCounts` (K.5) |
| Streak, XP, Revisões totais | contadores de conta | -- | inalterados (fora do contrato) |
| Gráfico de palavras ao longo do tempo | palavra, só Study | -- | `wordLevelFirstLearnedDates` (K.4, inalterado) |

Divergências corrigidas (contavam New com `due=0` como pendente -- a mesma família do antigo "Pendentes agora"):
- **Lembrete de revisão** (`maybeShowReviewReminder`, banner "N cartões esperando"): usava `cardsDueNow(eligibleReviewPool())`;
  20 cartões New disparavam o lembrete. Agora `structuralCounts(eligibleReviewPool()).due`. O texto passou de
  "palavras" para "cartões" (a unidade contada é CardInstance).
- **Fronteira de lição** e **`unitCardCounts().dueForReview`**: usavam `reps>0` + `cardsDueNow`; agora a mesma definição
  de Devido (`structuralCounts(...).due`). Resultado equivalente, uma só fórmula.
Sem mudança: Review Core, FSRS, `eligibleReviewPool`/`eligibleDeckReviewPool`, XP/streak, SQL. Nenhuma RPC nova: o aluno
não recebe o payload de `get_teacher_student_metrics` (Teacher Analytics é só da professora).
Não alterado de propósito: `todaysReviewCount`/"Tudo em dia" (derivam da fila de Review) e a revisão de 汉字 do zh
(recurso próprio). Limitação: o gráfico histórico segue por `firstLearnedDate` de CardInstance (K.4).
Testes: `tests/k7/test_k7_student_analytics.js` (Playwright FR+ZH, 40).

## K.8 -- Public Analytics: auditoria de 2026-09 (DESBLOQUEADA em 2026-10-07: Deck público existe desde a 061; plano em "Fase K final" abaixo)
Auditoria de prontidão (só leitura; nenhum código, migration, RPC ou UI criados).
Existe (Perfil Público, Fases 1-2 do prompt-mestre "perfil público"): `profiles.public_profile` (default true),
rota `#/user/<username>` (`shared/router.js`, `shared/public-profile.js`), página sem login, RPCs
`get_public_profile_stats` e `get_public_flashcards` (SECURITY DEFINER, `grant ... to anon`, filtro no servidor,
`status='active'` e `hidden_from_profile=false`, por idioma), gate de login para ver/importar cartões, cópia
independente via `createOwnFlashcard` (respeita o teto Free e o `#flashcard-limit-modal`), reporte via
`openReportModal`, `own_flashcards.hidden_from_profile`.
NÃO existe: Public Deck (só a coluna `decks.is_public`, que nada lê nem escreve; as triggers rejeitam público em
root/teacher/course), rota ou RPC de Deck público, visibilidade por Deck, `source_user_id`/`source_card_id`
(zero ocorrências no repositório), "Já adicionado", importação de Deck inteiro. Os cartões públicos de hoje são
por CONTA (todos os ativos não escondidos), não por Deck.
Por que bloqueia: "Public Analytics" do contrato = contagens por Deck público (CardInstance x Note) e estabilidade
de atribuição; sem Deck público e sem origem do cartão copiado não há unidade nem fonte autorizada para publicar.
Criar agora seria solução provisória (proibido).
Achado para a auditoria consolidada (não alterado): o perfil público JÁ publica, por decisão da Fase 1, XP e
streak por idioma e % de progresso (`get_public_profile_stats`), isto é, agregados de Private Analytics sob a flag
da conta. Não expõe FSRS/due/N-L-R nem cartões de Teacher; vale revisar se XP/streak devem continuar públicos
por padrão (hoje `public_profile` é true para todas as contas).
Retomar quando: Public Decks (flag + RPC autorizada + rota) e `source_user_id/source_card_id` existirem.

## Fase K final -- decisões da autora (2026-10-07); plano aguardando autorização, implementação NÃO iniciada

O que já existe e não se refaz: painel 📊 do aluno (Painel de Admin > 🎓 Alunos, RPCs 070 e 059, ambas aplicadas
na produção), Analytics de produto (`shared/admin-analytics.js`), contrato K.2 (`shared/analytics-metrics.js`).

Decisões da autora:
- Botão "📊 Analytics" do aluno em dois lugares: aba 🎓 Alunos (já existe) e perfil público `#/user/<username>`
  (aqui só para a professora do aluno). A aba Alunos já some com Admin Mode OFF, então não muda nada nela agora;
  a autora propôs separar o menu em "Admin" (desligável) e "Professora" (papel próprio, não desligável), em
  discussão -- se aprovado, Alunos/Flashcards/Aulas/Material de apoio vão para "Professora" e o Analytics do aluno
  segue o papel Professora, não o Admin Mode.
- Decks pessoais do aluno: a professora vê **nome + Novo/Aprendendo/Revisar**, sem abrir os cartões.
- Quantas pessoas adicionaram um Deck público: veem a admin (Analytics) e o autor do Deck.
- Grátis x Premium: Analytics do aluno é ferramenta da professora (hoje só a autora); o contador do autor é **só Premium**
  (checado no servidor por `profiles.plan_tier = 'premium'`, como a 061; hoje todas as contas são free, então
  nenhum autor vê o contador até existir Premium).

Etapas (cada uma com autorização própria):
- **K.9 -- Decks do aluno (servidor)**: RPC nova `SECURITY DEFINER` `get_teacher_student_deck_counts(student, lang)`,
  mesma porta da 059 (vínculo ativo em `teacher_students` com quem chama).
  Devolve a árvore de Decks do aluno (curso, Meus Decks e subdecks, Cartões da Professora) com contagens por
  subárvore, nas regras de `cardStudyBucket`/`structuralCounts` (Novo = sem histórico; Aprendendo = learning +
  relearning; Revisar = review vencido). Deck do cartão: `own_flashcards.deck_id`, `teacher_flashcards.deck_id`,
  trilha pelo Deck de curso da unidade. Sem conteúdo dos cartões. Limitação herdada da 059: só conta o que o aluno
  já sincronizou em `progress`. Teste de paridade SQL x `getDeckCounts` com as mesmas fixtures.
- **K.10 -- UI**: seção "Decks" no painel 📊 (tabela Deck / Novo / Aprendendo / Revisar); botão no perfil público
  (só para a professora com vínculo ativo com aquele aluno), abrindo o mesmo painel. Validar fr/zh × claro/escuro.
- **K.8 -- cópias de Deck público**: tabela `public_deck_copies (deck_id, user_id, first_copied_at, last_copied_at)`,
  uma linha por pessoa (recópia só atualiza a data), gravada dentro de `copy_public_deck` (novo `create or replace`
  sobre o corpo da 068, sem `DROP`). Sem leitura direta (RLS fechada); RPC `get_public_deck_copy_count(deck)` para o
  dono Premium ou admin, e lista para a subaba nova "Decks públicos" do Analytics da admin. Unidade: **pessoas
  distintas**. Cópias feitas antes da migration não entram (o dado não existe). Autor vê "N pessoas adicionaram"
  na tela do próprio Deck público.
- Ordem: K.9 → K.10 → K.8. Migrations novas (números a partir de 075) sempre Staging antes da produção
  (skill `migration-supabase`). Testes em `tests/k8/`, `tests/k9/`, `tests/k10/`.

## Fora desta fase
- Histórico por Note e "última atividade" (`firstLearnedDate`/`lastReview` são por
  CardInstance; `lastReview` de cartões migrados é aproximado).
