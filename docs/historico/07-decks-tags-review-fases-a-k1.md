# Histórico: Decks, Tags, Painel de Tags, Review Core (Fases A-K1)

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Prompt-mestre "Decks, Tags e Painel" -- Fase A (auditoria pré-Deck
Engine, só leitura) + Fase B (modelo de dados de Deck)

Prompt-mestre novo, distinto da série CONSOLIDAÇÃO (que fechou o motor
Note/CardType/CardInstance) -- fonte de verdade é o documento externo
"Arquitetura Total -- Decks, Tags, Painel e Sistema de Estudo" (40
seções, entregue pela autora), nunca uma arquitetura alternativa. Mesma
disciplina de fatiamento por autorização explícita de toda a sessão:
Fase A (auditoria, zero código) -> Fase B (modelo de dados, esta
entrega) -> Fase C (Deck Engine, NÃO iniciada).

**Fase A -- achados principais (checkpoint entregue só no chat, sem
tocar em nenhum arquivo, confirmado por `git status` limpo)**: Note/
Field/CardType/CardInstance já existiam prontos desde as Fases 4-7j;
CardInstance nunca é persistido (sempre derivado em runtime via
`buildEngineCardsFromRow()`); FSRS já é global por conta; Tags já
pertencem à Note (`tags text[]`, migration 048); Anki Import já
calculava `deckTree`/`deckPath` em memória (`shared/anki-import.js`,
Fase 7j) mas descartava depois do resumo; **não existia nenhuma
entidade Deck, nenhuma coluna `deck_id`, nenhuma árvore** -- Study
Trail continuava com pipeline 100% próprio (`buildCardsFromUnits()`,
fora do banco) e o teto de 20 cartões grátis (Fase 5.1) contava
linhas/Notes, não CardInstances.

**Fase B -- o que foi feito**: migration `049_create_decks_table.sql`
(aplicada AO VIVO via `mcp__Supabase__apply_migration`, projeto
`eigjocalzwamisgqilhg`) -- só fundação de dados, nenhum Deck Engine,
seguindo à risca as 12 decisões arquiteturais já travadas pelo
prompt-mestre (Note continua fonte de verdade; CardInstance nunca
persistido; Deck nunca contém Fields/conteúdo/direção/Card Type; uma
Note tem no máximo 1 Deck efetivo; Cards irmãos -- Normal-reverso,
Cloze multi-marca -- sempre compartilham Deck porque a associação vive
na NOTE, nunca no CardInstance que nem existe persistido; `deck_id`
nunca no CardInstance; Curso ≠ Deck, `unitId`/nível/módulo/lição nunca
viram `deck_id`; Study Trail não migrado nesta fase; Teacher Deck só
schema, UI fica pra Fase H; Public Deck só suporte de dado, zero
experiência pública; Tags/FSRS intocados).

**Tabela `decks`** (auditada a convenção do schema real antes de
escrever -- `bigint generated always as identity`, `uuid references
auth.users(id) on delete cascade`, `text not null check (col in
(...))` pra todo enum-like, nunca tipo `enum` nativo, mesmo padrão de
`teacher_students`/`teacher_flashcards`/`profiles`): `id`, `owner_id`
(nullable -- de quem é a ÁRVORE; sempre populado exceto em `kind=
'course'`), `teacher_id` (nullable, só em `teacher_root`/`teacher` --
mesmo par de nomes que `teacher_flashcards.teacher_id`/`student_id` já
usa, `owner_id` fazendo o papel de "aluna" nesse caso), `parent_deck_id`
(self-FK, `on delete cascade`), `kind` (6 valores: `root`/
`personal_root`/`personal`/`course`/`teacher_root`/`teacher` --
**nenhum kind `'public'` separado**, "público" é sempre uma flag
`is_public` sobre um Deck pessoal já existente, nunca uma categoria
estrutural nova, decisão explícita da seção 10), `name`,
`language_app_key` (mesmo check de sempre, `frances`/`mandarim`/
`portugues`), `is_public boolean default false`, `created_at`. Único
CHECK direto na tabela: `parent_deck_id is null or parent_deck_id <>
id` (auto-parent nunca válido). Índices únicos parciais (`decks_unique_
root`/`decks_unique_personal_root`/`decks_unique_teacher_root`) --
no máximo 1 raiz/Meus Decks por (dono, idioma), 1 raiz de professora
por (aluna, professora, idioma). Índices normais em `parent_deck_id`/
`owner_id`/`teacher_id`/`language_app_key`/`kind`.

**Trigger `decks_validate_hierarchy()`** (BEFORE INSERT/UPDATE, não só
CHECK -- a validação cruza linhas: o parent precisa existir e ter kind/
dono/idioma compatíveis com o filho, e detecção de ciclo mais profundo
precisa andar a árvore) -- regras por `kind`: `root` nunca tem parent/
teacher_id, sempre owner_id, nunca `is_public`; `personal_root` sempre
filho de um `root` do MESMO dono/idioma; `personal` sempre filho de
`personal_root`/`personal` do mesmo dono/idioma; `teacher_root` sempre
filho de um `root` da MESMA aluna/idioma, sempre com owner_id (aluna) +
teacher_id (professora); `teacher` sempre filho de `teacher_root`/
`teacher` da mesma aluna+professora+idioma; `course` nunca tem owner_id/
teacher_id (conteúdo do sistema, não de conta -- nenhuma linha deste
`kind` é criada por esta migration, Study Trail continua fora do banco).
Detecção de ciclo mais profundo (walk pela cadeia de `parent_deck_id`,
limite de 100 níveis) -- só importa de verdade quando um futuro "mover
Deck" (Fase C) fizer UPDATE de `parent_deck_id`; testada e confirmada
funcionando via um cenário real (2 decks `personal` irmãos, kinds/dono/
idioma compatíveis entre si, só o walk de ancestralidade barra).

**RLS de `decks`** (auditadas antes as policies de `teacher_students`/
`teacher_flashcards`/`own_flashcards` pra seguir a mesma convenção --
nome `{tabela}_{qualificador}_{ação}`, admin via e-mail hardcoded):
`decks_owner_select`/`decks_teacher_select` (leitura ampla -- dono lê a
própria árvore inteira incluindo `teacher_root`/`teacher` que ELA é a
aluna, mesmo espírito de "aluno pode estudar/visualizar" da seção 15;
professora lê toda a árvore que controla, de qualquer aluna);
`decks_owner_write` (só `kind='personal'` que ela mesma possui -- nunca
`root`/`personal_root`, que são bootstrap-only); `decks_teacher_write`
(só `kind='teacher'` na própria árvore -- nunca `teacher_root`, mesmo
motivo); `decks_admin_write` (bypass total, mesmo padrão de sempre).
Confirmado por teste ao vivo (ver abaixo): aluno NUNCA tem write sobre
Teacher Deck (nem o próprio), curso não é alterável por ninguém além do
admin, conta B nunca lê/altera Deck pessoal de conta A.

**`own_flashcards`/`teacher_flashcards` ganham `deck_id bigint
references decks(id) on delete set null`** (nullable, indexado, `on
delete set null` -- NUNCA cascade, apagar um Deck não pode apagar a
Note/Fields/FSRS/progresso dela, só a organização volta a "sem Deck",
igual a uma linha Legacy hoje). **Mesma coluna serve Legacy e Nativo**
-- Deck é eixo de ORGANIZAÇÃO, ortogonal a Legacy x Nativo, mesmo
espírito de `tags` (migration 048) -- nenhuma segunda coluna/estrutura
pra Legacy, conforme a seção 12 exigia. Cards irmãos (Normal-reverso,
Cloze multi-marca) **sempre compartilham Deck estruturalmente** -- não
por nenhuma lógica nova, mas porque não existe (nunca existiu, nunca
vai existir) `deck_id` por CardInstance pra divergir: todas as
CardInstances de uma Note são derivadas em runtime da MESMA linha, que
só tem 1 `deck_id`.

**Triggers `own_flashcards_validate_deck()`/
`teacher_flashcards_validate_deck()`** (BEFORE INSERT/UPDATE, rodando
como o papel que já faz a escrita -- nunca SECURITY DEFINER -- porque a
RLS de leitura de `decks` já filtra naturalmente um `deck_id` de outra
conta, reforçando a segurança numa 2ª camada sem substituir a RLS de
escrita das duas tabelas): Note própria só aceita Deck `personal_root`/
`personal` do MESMO dono+idioma; Note de professora só aceita Deck
`teacher_root`/`teacher` da MESMA aluna+professora+idioma. Testado que
uma Note própria NUNCA consegue apontar pra Teacher Deck (nem o dela
mesma) e vice-versa.

**`ensure_user_decks(p_owner_id, p_language_app_key)`** (SECURITY
DEFINER, mesmo padrão de `get_teacher_student_metrics`, migration 029
-- precisa bypassar RLS porque cria `root`/`personal_root`, que a RLS
normal de escrita do usuário deliberadamente não permite) -- idempotente
(reconsulta antes de inserir, `on conflict do nothing` + releitura pra
corrida concorrente), checagem de autorização interna (só a própria
conta ou admin pode bootstrapar pra um `owner_id`). **Escopo desta
migration: só `root`+`personal_root`** -- `teacher_root` fica pra
quando a Fase H decidir o mecanismo de disparo (ex.: no momento em que
um vínculo `teacher_students` é criado), não implementado aqui de
propósito. **Não invocada nesta migration pra nenhuma das 22 contas
reais existentes** -- decisão documentada, não um bloqueio: nada
consome `root`/`personal_root` ainda (Deck Engine, o único consumidor
futuro, não existe), backfill silencioso seria especulativo; fica pra
quando a Fase C decidir se chama isto sob demanda (lazy, na 1ª leitura
de Decks) ou via backfill explícito.

**Testes realizados, todos ao vivo contra o Supabase real (transação +
`ROLLBACK`, nunca dado de teste sobrevivendo) -- 42 cenários, 0
falhas**: **Grupo 1 (16, hierarquia/integridade)** -- criar root/
personal_root/personal/personal aninhado/teacher_root/teacher child/
course OK; parent inexistente, self-parent (via UPDATE), kind inválido,
idioma inválido, `personal_root` com parent de kind errado, `personal_
root` de dono divergente do parent, `teacher_root` sem `teacher_id`,
`course` com `owner_id` setado -- todos rejeitados com a mensagem certa.
**Grupo 2 (10, Note -> Deck)** -- ciclo profundo real (2 decks
`personal` irmãos, kinds compatíveis, só o walk barra) rejeitado; own
Note aceita Deck pessoal certo, rejeita dono diferente/idioma
diferente/Teacher Deck; teacher Note aceita Teacher Deck certo, rejeita
professora errada/Deck pessoal; confirmado `deck_id` é coluna simples
(nunca array/N:N) e que uma Note nativa `normal_reversed` continua com
1 `deck_id` só (irmãos compartilham). **Grupo 3 (5, inicialização)** --
1ª chamada de `ensure_user_decks` cria root+personal_root; 2ª chamada
idempotente (mesmos ids); confirmado só 1 linha de cada kind no banco
depois das 2 chamadas; bootstrap por conta não-dona/não-admin rejeitado
com `not_authorized`; bootstrap por admin pra OUTRA conta (bypass)
funciona. **Grupo 4 (11, segurança/RLS, via `set local role
authenticated` + `set local request.jwt.claims` simulando sessões
reais de 3 contas distintas)** -- conta B não lê/não altera/não cria
Deck com `owner_id` de A (RLS bloqueia as 3 formas, nome de A nunca
mudou); aluna PODE ler seu próprio Teacher Deck mas NÃO pode alterá-lo;
professora lê+cria na própria árvore de Teacher Decks; aluno não altera
nem cria Deck de curso. **Compatibilidade** -- confirmado ao vivo que
`teacher_flashcards` (5 linhas) e `own_flashcards` (7 linhas) continuam
com a MESMA contagem e o MESMO hash agregado (id+front+back_trans+
fields+card_generation_mode+tags+revision) de antes de toda a sessão de
teste, `deck_id` NULL em 100% das linhas reais (nenhum backfill), 0
linhas em `decks` (todo teste rolou back), nenhuma tabela
`*card_instance*` criada. **Regressão** -- `git status`/`git diff
--stat` confirmam que só a migration foi adicionada, nenhum arquivo
cliente (`.js`/`.html`) tocado -- sem superfície de regressão client-side
pra testar.

**O que NÃO foi implementado nesta fase (confirmado explicitamente, §21
do prompt-mestre)**: Deck Engine; ancestors/descendants/subtree
aggregation; New/Learning/Review por Deck; Study now; Add card dentro
do Deck; move/delete Deck; Painel; Deck UI completa; migração de Study
Trail; Teacher Deck UI; Public Deck UI/import; Anki destination UI/
export hierárquico; mudança do teto Free (continua contando linhas, não
CardInstances -- `Fase D` vai calcular `generatedCardInstanceCount(Note)`
a partir de `card_generation_mode` via `buildEngineCardsFromRow(row,
opts).length`, sem campo `card_count` persistido); mudança de FSRS/
Review.

**Decisões tomadas nesta fase (só as necessárias pra transformar o
documento em schema, nenhuma delas reabre as 12 já travadas)**: (1)
`kind` como coluna `text check`, não enum nativo nem tabela de lookup --
mesma convenção já confirmada em todo o schema existente; (2)
`owner_id`+`teacher_id` (nunca um 3º vocabulário) -- mirror exato do par
que `teacher_flashcards` já usa; (3) `is_public` é flag sobre Deck
pessoal, nunca um `kind` próprio; (4) unicidade estrutural via índice
parcial, não `UNIQUE` simples (só se aplica a alguns `kind`); (5)
integridade cross-row via trigger, não só CHECK (parent precisa existir
com kind/dono/idioma compatíveis -- inexpressável num CHECK simples,
documentado explicitamente em vez de escondido só na UI); (6) `teacher_
root`/`root`/`personal_root` são bootstrap-only (só `ensure_user_decks`/
admin escrevem), nunca criáveis por ação normal do usuário -- decisão
implícita da própria arquitetura de RLS, não pedida à parte; (7) não
bootstrapar as 22 contas reais existentes nesta migration (documentado
acima, não um bloqueio -- nada consome ainda). Nenhuma decisão
bloqueou a migration -- não foi necessário parar e reportar impasse.

**Próxima fase (C -- Deck Engine)**: pré-requisitos já entregues por
esta fase -- tabela `decks` real, hierarquia íntegra, `deck_id` nas 2
tabelas de Note, RLS protegendo os 4 tipos de Deck, bootstrap
idempotente pronto (sem consumidor ainda). Decisões que a Fase C
ainda precisa tomar, não resolvidas aqui de propósito: quando/como
disparar `ensure_user_decks` (lazy vs. backfill, e se estende pra
`teacher_root` também); algoritmo de agregação de contagem por
subtree (ancestors/descendants); mecanismo de "mover Deck" (reparent
via UPDATE, que o trigger de ciclo já suporta, mas sem UI/API ainda);
como Study Trail (Fase E) se encaixa -- Deck de curso por aluna vs.
árvore global por idioma, deixado explicitamente em aberto na seção
`course` do trigger; cálculo de `generatedCardInstanceCount(Note)` pro
novo teto Free (Fase D).

Nenhum passo manual pendente pra autora -- migration `049` já aplicada
ao vivo via `mcp__Supabase__apply_migration`.

**PARE conforme instrução explícita -- Fase C (Deck Engine) NÃO
iniciada.** Próxima etapa só começa depois de autorização explícita da
autora, com este checkpoint já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-29), "FASE C — DECK
ENGINE".**

## Fase C -- Deck Engine (motor de hierarquia, escopo, agregação e
movimentação, sem UI)

Constrói o COMPORTAMENTO sobre o schema já criado na Fase B (`decks`,
`deck_id`, RLS, trigger de hierarquia, `ensure_user_decks()`) -- nenhum
redesenho de dado, nenhuma segunda entidade de organização,
`unitId`/`category`/`group` continuam nunca sendo tratados como Deck.

**Auditoria prévia (só leitura, sem alterar nada)** confirmou: `STATE.cards`
é construído por `buildEngineCardsFromRow()` (`shared/flashcard-model.js`,
Fase 4b) a partir de `buildCardFromTeacherFlashcard`/
`buildCardFromSelfFlashcard` (fr/zh `app.js`); CardInstances nunca são
persistidas, sempre derivadas em runtime via
`interpretNoteFromRow`/`interpretNativeNoteFromRow`; FSRS mora em
`shared/fsrs.js`/`shared/srs.js` (`applyMemoryGrade`,
`migrateCardToFSRS`, `cardsDueNow`); a fila de estudo central é
`getStudyQueue(pool, options)` (`shared/study-queue.js:34`), que recebe
um ARRAY de cards já construído -- nunca ela mesma decide quais cards
existem, só como priorizá-los; `eligibleReviewPool()` (fr/zh `app.js:5267`)
é o pool padrão (`STATE.cards.filter(isCardLessonCompleted).filter(matchesReviewOriginFilter)`)
que os 4 pontos de entrada de revisão (Flashcard/Palavras Difíceis/Speed
Review/Combinar) já consomem, desde a Fase 4.1/4.2. Isso confirma que o
ponto de integração certo pro Deck Engine é um PRÉ-FILTRO desse mesmo
array, nunca uma reescrita de `getStudyQueue()`.

### C1 -- `shared/deck-engine.js` (novo, módulo de domínio puro)

Zero chamada de rede (isso vive em `shared/deck-data.js`, ver C8/C9
abaixo) -- só funções puras sobre um array `decks` (linhas cruas da
tabela) e, quando aplicável, um array `cards` (o mesmo shape que
`STATE.cards` já usa). Compartilhado 100% entre fr e zh (1 arquivo só,
sem nenhum branch por idioma -- a árvore de Deck não depende de idioma
na LÓGICA, só no dado `language_app_key` de cada linha).

**Árvore** -- `getDeckById`/`getDeckChildren`/`getDeckParent`/
`getDeckAncestors` (mais próximo->mais distante, guard de 100 níveis)/
`getDeckDescendants` (BFS, TODOS os níveis, não só filhos diretos, guard
de 1000)/`getDeckSubtreeIds` (`[deckId, ...descendants]`)/
`isDescendantOf`/`getDeckRoot`. Proteção de ciclo é ESTRUTURAL (o walk de
ancestrais/descendentes tem guard de profundidade, nunca confia que o
dado já chegou sem ciclo) -- mesmo princípio já reforçado no banco pela
trigger `decks_validate_hierarchy()` da Fase B, aqui reforçado de novo no
cliente.

**Destino/permissões** -- `canUserAccessDeck`/`canPlaceOwnNoteInDeck`
(só `personal_root`/`personal`, mesmo dono, mesmo idioma)/
`canPlaceTeacherNoteInDeck` (só `teacher_root`/`teacher`, mesma
aluna+professora+idioma)/`canMoveDeck` (só `kind='personal'`, destino
`personal_root`/`personal`, mesmo dono/idioma, nunca ele mesmo, nunca um
descendente)/`canMoveOwnNote`/`canMoveTeacherNote` (delegam pras funções
`canPlace*` acima).

**Escopo de estudo (C3)** -- `getStudyScopeForDeck(decks, deckId, cards)`:
`cards.filter(c => c.deckId != null && subtreeIds.has(c.deckId))`. Clicar
num Deck = Deck + TODOS os descendentes, nunca a conta inteira nem só o
Deck sozinho -- exatamente a regra travada no prompt-mestre (seção 6).

**CardInstance (C4)** -- `generatedCardInstanceCount(row)` chama
`buildEngineCardsFromRow(row, {origin:'self', appKey:
row.language_app_key, idPrefix:'x'}).length` -- delega 100% ao motor já
existente (Fase 4b), NUNCA reimplementa a cardinalidade por Card Type:
Normal=1, Normal-reverso=2 (via `buildReversedCardInstancePair`, Fase 4a,
intocado), Cloze=N marcas (via `parseClozeMarks`, Fase 5, intocado),
Múltipla Escolha=1, Digite a resposta=1. **Legacy**: uma linha sem
`fields`/`card_generation_mode` cai no ramo `else` de
`interpretNoteFromRow()` (mesmo motor, sem nenhuma mudança) e sempre
produz exatamente 1 CardInstance -- `generatedCardInstanceCount()` nunca
inventa Card Type nem altera conteúdo pra Legacy, só pergunta ao motor
que já sabe interpretar essa linha.

**Contagens (C5/C6)** -- `bucketCardState(card)`: `relearning` conta como
`'learning'` (decisão travada explicitamente pelo prompt-mestre --
"um Card que já estava em Review e entrou em relearning deve ser
tratado como parte do estado de aprendizagem enquanto estiver em
relearning"; documentado no próprio código, nunca uma mudança no motor
FSRS em si, `shared/fsrs.js` intocado). `countNewCards`/`countLearningCards`
(new+learning+relearning)/`countReviewCards` (usa `cardsDueNow` de
`shared/srs.js` quando disponível, com fallback -- **disponibilidade,
não só estado**: um card em estado `review` mas ainda não due NÃO conta
aqui, exatamente a distinção que o prompt-mestre exigia). `getDeckCounts(decks,
deckId, cards)` = escopo de estudo + os 3 contadores, único agregador --
nenhum cálculo duplicado em Review/UI/Painel.

**Study Queue Integration (C7)** -- documentado, não implementado como
call site ainda (nenhuma tela consome Deck hoje): o fluxo real seria
`getStudyQueue(getStudyScopeForDeck(decks, deckId, eligibleReviewPool()),
options)` -- `getStudyScopeForDeck()` vira um PRÉ-FILTRO aplicado ANTES
de `getStudyQueue()`, nunca uma reescrita dela. Preserva de graça: origem
(`matchesReviewOriginFilter`, já dentro de `eligibleReviewPool()`), FSRS
(`getStudyQueue` intocado), teacher/self (já é o que popula `.deckId`
hoje). **Study Trail NÃO migrado nesta fase** (cards de trilha nunca têm
`.deckId`, `origin==='study'`, ficam de fora de qualquer escopo de Deck
até uma Fase E decidir como/se migrar) -- ponto de integração documentado
pra quando essa fase existir, nunca implementado agora.

**Movimentação de Notes (C8)** -- `validateNoteMove({note, destination,
decks, table})` (`table:'own'|'teacher'`) -- validação pura, nunca toca
`CardInstance`/FSRS/IDs/revision/Fields/Tags, delega pra
`canMoveOwnNote`/`canMoveTeacherNote`. A operação real (`note.deck_id =
Y`) é feita em `shared/deck-data.js` (`setOwnFlashcardDeck`/
`setTeacherFlashcardDeck`) -- validação ANTES do `UPDATE`, nunca depois;
se a validação falhar, `deck_id` original nunca é tocado (nenhum estado
intermediário inválido).

**Movimentação de Decks (C9)** -- `validateDeckMove({deck, destination,
decks})` -- só `kind='personal'` pode mover, só pra
`personal_root`/`personal` do mesmo dono/idioma, nunca root/personal_root/
Course/teacher_root/teacher/si-mesmo/descendente/outro-idioma/outro-dono
-- lista completa de rejeição implementada e testada (ver Testes).
Operação real em `shared/deck-data.js::moveDeck()`.

**Delete/destroy (C10)** -- só identificação, nenhuma UI/botão:
`isDeckDeletableKind(deck)` (só `kind==='personal'`),
`validateDeckDeletion({deck, hasChildren, hasNotes})` (rejeita
root/personal_root/course/teacher_root sempre; rejeita `personal` com
filhos ou Notes -- "impedir deleção que quebre Notes sem destino", regra
literal do prompt-mestre). Nenhuma operação destrutiva de fato
implementada.

**Bootstrap (C11)** -- estratégia única, já existente desde a Fase B
(`ensure_user_decks`, SECURITY DEFINER, idempotente via SELECT-antes-de-
INSERT + `on conflict do nothing` + reselect) -- `shared/deck-data.js::
ensureDecksForCurrentUser(languageAppKey)` é o único wrapper de cliente
proposto, mas **não foi ligado a nenhum boot flow nesta fase** (nenhuma
tela consome Deck ainda -- ligar isso ao carregamento do app seria
trabalho de uma fase futura, quando uma UI real precisar da árvore
existir). Recomendação registrada, não implementada: bootstrap
"preguiçoso" (lazy, só na primeira vez que uma tela de Deck for aberta),
nunca backfill em massa das 22 contas reais -- mesmo princípio já
seguido pela Fase B ("nada consome ainda"). `ensure_user_decks` continua
NUNCA bootstrapando `teacher_root` sozinho (só `root`+`personal_root`) --
criar Teacher Deck automaticamente sem vínculo ativo continua fora de
escopo, como já travado na Fase B.

### Achado de segurança real, corrigido (não uma decisão de arquitetura
nova -- um bug encontrado testando ao vivo)

Testando §19 (RLS real), a chamada `ensure_user_decks(<outro_owner_id>,
'frances')` simulando uma sessão da aluna (JWT com `sub` mas SEM a claim
`email`) **teve sucesso** quando deveria ter sido rejeitada com
`not_authorized`. Causa raiz: a checagem original (migration 049)
`if auth.uid() is distinct from p_owner_id and (auth.jwt()->>'email')
<> 'brunemed1310@gmail.com' then raise exception` -- em SQL, `NULL <>
'x'` avalia pra `NULL`, nunca `TRUE`, e um `IF NULL THEN` em PL/pgSQL é
tratado como `FALSE` -- ou seja, se `auth.jwt()->>'email'` vier `NULL`
(JWT sem a claim `email`), a checagem inteira falha ABERTA. **Em
produção isso nunca foi alcançável** (todo JWT real do Supabase Auth
pra uma conta com e-mail sempre carrega a claim `email`), mas é uma
falha real de lógica NULL-unsafe, não uma reformulação de arquitetura --
corrigida com uma migration mínima e cirúrgica.

**Migration `050_fix_ensure_user_decks_null_email_check.sql`** -- só
troca `(auth.jwt()->>'email') <> '...'` por `coalesce(auth.jwt()->>'email',
'') <> '...'` (garante que ausência de claim nunca é tratada como
"é admin"). Aplicada AO VIVO via `mcp__Supabase__apply_migration`,
projeto `eigjocalzwamisgqilhg`. Nenhuma outra linha da função tocada.
Reteste confirmou: cross-user bootstrap agora rejeitado com
`not_authorized`; auto-bootstrap (sub == owner_id, o único caminho que
`shared/deck-data.js` de fato usa) continua funcionando sem nenhuma
regressão.

### Testes realizados

**Node/VM, `test_fasec_deck_engine.js` (scratchpad, não commitado -- mesma
convenção de todo o projeto), 115/115** -- árvore (filhos/pai/ancestrais
na ordem exigida pelo exemplo literal do prompt-mestre/descendentes em
TODOS os níveis/isolamento de irmãos/Curso nunca mistura com Meus
Decks/subtreeIds/isDescendantOf assimétrico/getDeckRoot/isolamento
cross-idioma e cross-dono/segurança contra ciclo mesmo com array
construído à mão com ciclo real A↔B); permissões (own/teacher notes em
Deck certo/errado, incluindo rejeição explícita de root/Course/Teacher
Deck pra Note própria); escopo de estudo (Meus Decks inclui A+B+raiz,
exclui Curso e trilha; Deck filho só inclui o próprio subtree); contagem
de CardInstance pelos 5 Card Types (Legacy Normal=1, Legacy Cloze
1-lacuna=1, Native Normal=1, Native Normal-reverso=2, Native Cloze
2-marcas=2, Native Cloze 3-marcas=3, Native MC=1 independente de nº de
distratores, Native Digite-a-resposta=1); contagens New/Learning/Review
(bucket de `relearning` dentro de `learning`, `review` só conta due-agora,
agregador somando 10 cards reais espalhados por 3 Decks); movimentação de
Notes (válida own→personal, rejeitada own→course/teacher, rejeitada
teacher→personal, resultado de validação NUNCA contém chave
`cardInstance`/`fsrs`); movimentação de Decks (válida A→B irmão; rejeição
completa: root/personal_root/course-por-aluna/teacher_root/teacher-por-
aluna/si-mesmo/descendente-ciclo/idioma-cruzado/dono-cruzado/destino-
dentro-de-course); deletabilidade (root/personal_root/course/teacher_root
nunca deletáveis; personal com filhos/Notes rejeitado; personal-folha
liberado); regressão de `deckId` em `buildEngineCardsFromRow` (Legacy sem
coluna→null, Legacy com `deck_id`→o valor real, presença de todas as ~24
chaves do card, normal-reverso com as 2 metades compartilhando o MESMO
`deckId` mas ids distintos).

**7 suítes de regressão de fases anteriores, re-executadas depois da
mudança em `flashcard-model.js`, sem nenhuma falha** --
`test_fase4_engine.js` 34/34, `test_fase4d_regression.js` 30/30,
`test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js` 74/74,
`test_fase6d1_editor_state.js` 99/99, `test_fase7a_media_resolution.js`
45/45, `test_fase7b_field_audio_contract.js` 83/83 -- total desta fase +
histórico: **513/513** sem falha.

**Supabase real (`eigjocalzwamisgqilhg`), 3 transações
`BEGIN...ROLLBACK`, zero dado permanente confirmado por hash/contagem
byte-a-byte idênticos antes/depois** (`decks: 0`, `teacher_flashcards: 5`
hash `4decfc28b2abc4a897e4fa7a11e545f9`, `own_flashcards: 7` hash
`846ad51d3a5920c437dacdfa59094bac`, idênticos nas 3 checagens): (1)
árvore temporária real de 7 Decks (root/personal_root/2 personal
aninhados/personal irmão/teacher_root/teacher) + 2 Notes temporárias
(own+teacher) + moves válidos de Note (own A→A.B, teacher teacher→
teacher_root) + 3 tentativas de move inválido de Note rejeitadas pela
trigger da Fase B (`own→teacher_deck`, `own→root`, `teacher→personal`) +
confirmação de que nenhuma rejeição deixou mutação parcial + move válido
de Deck (A pra dentro de C) + 2 tentativas de move inválido de Deck
rejeitadas (ciclo C→B sendo B descendente de C; mover `personal_root`);
(2) RLS real com 3 personas simuladas (`set local role authenticated` +
`set local request.jwt.claims`, mesmo padrão já validado na Fase B):
conta terceira/não-relacionada lê 0 Decks da aluna e sua tentativa de
`UPDATE` na nota da aluna afeta 0 linhas; aluna lê a própria árvore
inteira (5 Decks, incluindo o Teacher Deck) mas sua tentativa de
renomear o Teacher Deck afeta 0 linhas, enquanto editar a própria Note
afeta 1 linha; professora renomeia o próprio Teacher Deck (1 linha) mas
não consegue renomear Deck pessoal da aluna (0 linhas) -- **achado
lateral, não um bug**: mover `teacher_flashcards.deck_id` da própria
professora deu 0 linhas nesse teste porque a RLS de escrita de
`teacher_flashcards` (migration 026) é **admin-only por e-mail**
(`teacher_flashcards_admin_write`), nunca `teacher_id = auth.uid()` --
diferente da RLS de `decks`, que É genuinamente `teacher_id = auth.uid()`
(`decks_teacher_write`); confirmado lendo `pg_policies` ao vivo, não
presumido -- é o mesmo padrão "escrita só pra administração" já
documentado desde a Fase 2 do sistema de alunas particulares, nunca uma
regressão desta fase; `setTeacherFlashcardDeck()` funcionará em produção
porque a professora real desta plataforma É a conta admin; (3) bootstrap
(usuário novo com self-bootstrap/2ª execução idempotente sem duplicar
linha/2 idiomas com árvores independentes pro mesmo usuário/índice único
bloqueando um 2º root simultâneo -- mesma proteção que impediria uma
corrida real/cross-user rejeitado após o fix de segurança).

### Dados preservados (confirmado)

Nenhum Card ID, valor de FSRS, Field, Tag, `revision`, `origin`, ou linha
Legacy foi alterado por nenhum código desta fase -- `shared/deck-engine.js`
nunca escreve em `STATE.cards`/banco (é puro); `shared/deck-data.js` só
grava `deck_id` (via `UPDATE`, nunca `INSERT`/`DELETE`) depois de validar,
nunca toca em nenhuma outra coluna. `buildEngineCardsFromRow()` ganhou
1 propriedade nova (`deckId`) no card retornado -- todas as ~35 chaves
anteriores permanecem idênticas, confirmado por teste de presença de
chave.

### O que NÃO foi implementado nesta fase (confirmado)

Nenhuma UI de Deck (seletor, árvore visual, botão "Estudar"/"Adicionar
cartão"/mover); nenhum Painel; nenhuma migração de Study Trail; nenhuma
UI de Teacher Deck; nenhum Public Deck; nenhuma mudança visual do limite
Free (só a função `generatedCardInstanceCount()` existe, nunca chamada
pelo limite hoje); nenhuma mudança no motor FSRS; nenhum redesenho de
Review; nenhum cache/materialized view/contagem persistida (nenhuma
necessidade de performance foi demonstrada -- contagens continuam
100% derivadas da fonte de verdade, conforme exigido).

### Próxima fase (D -- Integração Deck ↔ FSRS/Review)

Prontos: `getStudyScopeForDeck()` já produz exatamente o shape de array
que `getStudyQueue()` já consome via `eligibleReviewPool()`;
`getDeckCounts()` já devolve `{new, learning, review}` agregado por
subtree; `generatedCardInstanceCount()` pronta pro futuro limite Free;
movimentação de Notes/Decks validada e seguindo as regras completas de
"nunca permitir". Em aberto pra Fase D: qual tela vai de fato chamar
`ensureDecksForCurrentUser()` (lazy on first Deck screen, recomendado,
não decidido); se/quando Study Trail ganha uma representação de Deck
(Fase E, fora do escopo de D); nenhuma decisão nova travada aqui além do
que já está documentado.

Nenhum passo manual pendente pra autora -- migration `050` já aplicada
ao vivo via `mcp__Supabase__apply_migration`.

**PARE conforme instrução explícita -- Fase D NÃO iniciada.** Só começa
depois que a autora revisar este checkpoint.

**Atualização: autorizada e entregue (2026-09-29), "FASE D — INTEGRAÇÃO
DECK ↔ FSRS / REVIEW — D1–D7".**

## Fase D -- Integração Deck <-> FSRS/Review (contagens, escopo de
estudo e sessão por Deck)

Constrói o COMPORTAMENTO de Review em cima do Deck Engine da Fase C, sem
tocar em nenhuma linha de `shared/deck-engine.js`/`shared/deck-data.js`/
`shared/study-queue.js`/`shared/fsrs.js`/`shared/srs.js`/
`shared/flashcard-model.js` -- confirmado por leitura ANTES de codar que
toda a integração se resume a COMPOR peças puras já existentes, nunca
reescrever nenhuma delas. Regra central do prompt-mestre, cumprida:
"Deck define o ESCOPO; Review/FSRS continua dono do estado/due/
agendamento/grade/próxima revisão."

**Auditoria prévia (§3, só leitura)** confirmou: `getStudyScopeForDeck(decks,
deckId, cards)` (Fase C) já filtra `card.deckId != null &&
subtreeIds.has(card.deckId)` -- compõe perfeitamente com
`eligibleReviewPool()` (já existente, `STATE.cards.filter(isCardLessonCompleted).
filter(matchesReviewOriginFilter)`), sem precisar de nenhuma mudança em
nenhuma das duas; `getDeckCounts(decks, deckId, cards)` (Fase C) já
devolve `{new, learning, review}` agregado por subtree via
`bucketCardState`/`cardsDueNow` (shared/srs.js, intocado);
`reviewFilterQueue('oldest', pool)` (fr/zh app.js, já existente desde a
Prop 5, único valor real usado hoje) já preserva
`newCardsPerDay`/`sessionIntensity` como limites globais -- reaproveitado
sem mudança, satisfazendo D6 de graça; `gradeCurrentCard(grade)` nunca lê/
escreve `card.deckId` em lugar nenhum (confirmado por grep completo de
`fr/app.js`) -- Deck nunca participa do cálculo de grade, satisfazendo
D13; cards de trilha (`buildCardsFromUnits()`) NUNCA têm a propriedade
`.deckId` (ausente, não `null`) -- o filtro `c.deckId != null` já os
exclui de qualquer escopo de Deck sem nenhum código especial, satisfazendo
D3 por construção.

**O que foi feito -- só `fr/app.js`/`zh/app.js` (mudanças espelhadas,
nenhum outro arquivo tocado):**

- **`async function ensureDecksLoadedForReview()`** (novo) -- carrega
  `STATE.decks` sob demanda (`ensureDecksForCurrentUser`+
  `fetchDecksForLanguage`, Fase C, ambos intocados), cacheado em
  `STATE.decks` pra não recarregar a cada chamada.
- **`function deckCountsForReview(deckId)`** (novo) -- wrapper fino de
  `getDeckCounts(STATE.decks, deckId, eligibleReviewPool())`, nenhum
  algoritmo próprio.
- **`function deckReviewSummary(deckId)`** (novo) -- resolve os 7 casos
  de estado vazio exigidos pelo §15 (Deck vazio/sem due/só novas/só
  aprendendo/sem elegíveis/com arquivados/subtree sem cards) devolvendo
  `{deckId, totalCards, eligibleCards, archivedCards, new, learning,
  review}` -- nunca só `[]`, sempre contexto suficiente pra UI futura
  diferenciar os 7 casos sem recalcular nada.
- **`async function startDeckReviewSession(deckId)`** (novo) -- ÚNICO
  ponto de entrada pra "Estudar este Deck": carrega Decks (se
  necessário) -> `getStudyScopeForDeck(decks, deckId, eligibleReviewPool())`
  -> `reviewFilterQueue('oldest', pool)` (mesmo motor de fila de sempre,
  preserva newCardsPerDay/intensidade) -> seta `STATE.reviewSessionDeckId
  = deckId` (campo novo em `STATE`, mesmo padrão de
  `STATE.reviewSessionUnitFilter` já existente -- nunca uma variável de
  módulo solta, nunca um boolean disperso) -> monta
  `STATE.reviewQueue`/`reviewIndex`/`reviewCardState` exatamente como
  `startReviewSession()` já fazia -> chama `renderReviewView()`. Direção
  de card legado (`!card.cardInstance`) continua via
  `nextCardDirection()`, mesmo mecanismo de sempre -- `isReverse`/
  `reviewDirection` NUNCA reintroduzidos como mecanismo de card nativo
  (cartão nativo `normal_reversed` continua resolvendo direção só via
  `resolveNormalCardView()`/CardInstance, Fase 4a, intocado).
- **`STATE.reviewSessionDeckId = null;`** adicionado no objeto `STATE`
  inicial e nos MESMOS 2 pontos de reset que já limpavam
  `reviewSessionUnitFilter` (`openReviewSession('flashcard'/'hard')`) +
  nos 2 handlers de fim de sessão (`#review-again`/`#review-go-practice`)
  -- mesmo ciclo de vida, nunca serializado em `serializeState()` (é
  estado transitório de sessão, não progresso persistido, mesma regra já
  aplicada a `reviewSessionUnitFilter`).
- Título do estado vazio de "fila zerada" (`renderReviewView()`) ganhou
  um 3º ramo: `STATE.reviewSessionDeckId ? 'Nenhum cartão neste Deck
  ainda' : (...)` -- mensagem específica pra sessão de Deck, sem alterar
  o texto dos outros 2 casos já existentes (trilha/revisão geral).

**Testes realizados:**
- `node --check` sem erro em `fr/app.js`/`zh/app.js`.
- `test_fasec_deck_engine.js` (Fase C, pré-existente) re-executado,
  **115/115 sem regressão**.
- **Suíte Node/VM nova, `test_fased_scope_and_counts.js`, 59/59** -- os 7
  blocos do §20: escopo por tipo de Deck (root/personal_root/personal-
  filho/filho-aninhado/course/teacher); isolamento de escopo (Deck A vs.
  B -- zero card de B aparece/é alterado/é contado, FSRS de B intacto);
  os 10 cenários controlados de Card Type (Normal Novo/Aprendendo/
  Devido/Não-devido/Relearning, Normal-reverso, Cloze-2-marcas,
  Cloze-3-marcas, MC, Digite-a-resposta) confirmando o bucket exato de
  cada um; independência de Normal-reverso (as 2 metades entram
  independentemente quando ambas due, só a due entra quando só uma
  está); agendamento independente de Cloze (3 marcas -> 3 CardInstances,
  FSRS próprio de cada, Deck count=3, só as due entram na fila); escopo
  de Teacher Card (aluna pode estudar, FSRS pertence ao card da aluna);
  Study Trail nunca no escopo de nenhum Deck (sem `.deckId`, nunca
  associado artificialmente); cartão arquivado nunca entra em escopo/
  contagem mesmo com Deck válido.
- **Browser smoke, FR+ZH, `test_fased_browser_smoke.js`, 70/70** --
  Playwright/Chromium real, servidor estático local, boot em modo
  convidado com stub mínimo de `window.supabase.createClient()`. 9
  blocos numerados: (1) Contagens -- `deckCountsForReview`/
  `deckReviewSummary` batendo com fixtures reais construídas via
  `buildEngineCardsFromRow()` de produção (nunca objeto fabricado à
  mão), incluindo agregação correta de subtree (Deck A soma A + A.nested,
  Deck A.nested isolado dos 3 cards próprios de A); (2) Isolamento --
  Deck A vs. B, zero vazamento; (3) Grading real -- `gradeCurrentCard()`
  chamado de dentro de uma sessão `startDeckReviewSession()`, `reps`/
  `due` mudam de verdade, `card.deckId` nunca tocado; (4) Reverse nos 2
  sentidos -- com `newCardsPerDay=0` forçado pra determinismo, confirmado
  que só a metade due entra quando só uma está due, as 2 entram quando
  ambas due, FSRS de cada metade mutando independentemente; (5) Teacher
  Card -- aparece na fila com `origin==='teacher'`, gradeia normalmente,
  Deck nunca muda de dono; (6) Origem/D2 -- filtro de origem
  (`STATE.studySettings.reviewOriginFilter`) continua funcionando DENTRO
  do escopo do Deck, nunca escapa nem é limpo silenciosamente ao
  selecionar um Deck; (7) Estados vazios/D15 -- 2 cenários distintos
  confirmados com a mensagem certa: Deck genuinamente vazio (nunca teve
  cards, "Nenhum cartão neste Deck ainda") vs. Deck com cards mas fila
  esgotada via grading ("Revisão concluída!") -- os 2 textos NUNCA
  confundidos um pelo outro; (8) Regressão do fluxo legado --
  `startReviewSession()` (sem Deck) continua funcionando exatamente como
  antes, cartões nativos continuam renderizando (Normal/MC/Cloze/Digite-
  a-resposta) via os 4 renderers da Fase 6C, sem nenhum erro novo; (9)
  zero erro de console novo em qualquer um dos 2 idiomas (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, filtrados por regex já documentados em toda a sessão).
- **Achado, não corrigido, documentado**: `test_apply_memory_grade.js`
  (suíte pré-existente, não desta fase) falha um cenário
  ("state vira 'relearning', não 'new'") -- confirmado via `git stash`
  contra o commit ANTERIOR a esta fase que a falha já existia antes de
  qualquer mudança desta entrega (idêntica com e sem o stash) -- é
  consistente com o próprio comentário já registrado em
  `shared/deck-engine.js` (Fase C) explicando que "Errei"/grade-0 sempre
  reseta pra `state='new'` direto, nunca produz `'relearning'` pelo
  caminho de grading real (`relearning` só surge hoje via o adaptador
  `migrateCardToFSRS()`, nunca via `applyMemoryGrade()`) -- script de
  teste desatualizado de uma fase anterior, não um bug desta entrega, não
  corrigido por estar fora do escopo (§23 não pede correção de testes
  legados).
- **Teste real Supabase (§21) -- executado nesta entrega** (a conexão
  MCP, que tinha caído durante a sessão anterior, foi restabelecida).
  Duas transações reais contra o projeto `eigjocalzwamisgqilhg`, ambas
  com `BEGIN`...`ROLLBACK`: **(1)** snapshot antes (`decks:0`,
  `teacher_flashcards:5` hash `339a5341...`, `own_flashcards:7` hash
  `6e415c53...`) -> árvore real (root->personal_root->Deck A->
  A.nested, + Deck B irmão, + teacher_root->Teacher Deck, + Deck de
  curso órfão) + Notes reais (own em Deck A, own em A.nested, teacher em
  Teacher Deck), usando 2 contas reais (professora admin + uma aluna com
  vínculo `teacher_students` ativo em francês) -> confirmado: escopo do
  subtree inclui as 2 Notes de A+A.nested e exclui a de fora; move válido
  de Note (A->A.nested) aceito; moves inválidos rejeitados pela trigger
  da Fase B/C (Note própria -> Teacher Deck, Note própria -> Curso, Note
  de professora -> Deck pessoal, Deck A -> dentro do próprio filho
  -- ciclo, `personal_root` -> Curso) -- todas as 5 rejeições confirmadas
  com a mensagem exata da trigger, nenhuma delas quebrou a transação
  (capturadas via `EXCEPTION WHEN OTHERS`); move válido de Deck (A pra
  dentro de B, irmão) aceito. **(2)** 2ª transação, dedicada a RLS real
  (`SET LOCAL ROLE authenticated` + `request.jwt.claims` simulando 3
  contas reais distintas -- aluna/professora/uma 3ª conta sem relação
  nenhuma): **8/8 confirmados** -- conta terceira lê 0 Decks da árvore e
  não consegue renomear nenhum; aluna lê a árvore inteira (5 Decks,
  incluindo o Teacher Deck) mas só consegue renomear o próprio Deck
  pessoal (0 linhas afetadas tentando renomear o Teacher Deck);
  professora renomeia o próprio Teacher Deck mas não consegue renomear o
  Deck pessoal da aluna (0 linhas afetadas). **Achado do próprio processo
  de teste, corrigido no script antes do resultado final**: a 1ª
  tentativa desses testes de RLS falhava com "permission denied for
  table test_results" -- causa raiz era o próprio SCRIPT DE TESTE
  (`INSERT INTO test_results` sendo chamado ainda sob `role=authenticated`,
  que não tem permissão na tabela temp criada pelo role de serviço) --
  nunca um bug de produção; corrigido adiando toda escrita em
  `test_results` pra depois do `RESET ROLE`. **Zero resíduo confirmado**:
  snapshot depois (`decks:0`, `teacher_flashcards:5` hash `339a5341...`,
  `own_flashcards:7` hash `6e415c53...`) byte a byte idêntico ao de
  antes, nas 2 transações.

**Dados preservados (confirmado)**: nenhum Card ID, valor de FSRS
(`state`/`due`/`reps`/`lapses`/`stability`/`difficulty`), Field, Tag,
`revision`, `origin`, ou `deck_id` foi alterado por nenhuma linha desta
fase -- toda a integração é só LEITURA de `STATE.cards`/`STATE.decks` +
orquestração de UI de sessão (`STATE.reviewQueue`/`reviewIndex`/
`reviewSessionDeckId`), nunca escrita em Note/Field/CardInstance/banco.

**O que NÃO foi implementado nesta fase (confirmado, §23)**: nenhuma
tela de Deck (estilo Anki), nenhuma nova homepage de Review, nenhum
Painel, nenhuma UI de Tags, nenhuma migração de Study Trail, nenhuma UI
de Teacher Deck, nenhum Public Deck, nenhuma UI de destino Anki, nenhum
export hierárquico Anki, nenhuma mudança visual do limite Free, nenhum
preset de FSRS, nenhuma configuração de FSRS por Deck, nenhum redesenho
de Review -- `startDeckReviewSession()`/`deckCountsForReview()`/
`deckReviewSummary()` são hoje só FUNÇÕES, sem nenhum botão/tela que as
chame (nenhum ponto de entrada de UI foi criado nesta fase).

**Próxima fase (E -- integração do Study Trail com Decks)**: fundação
pronta -- `getStudyScopeForDeck()`/`getDeckCounts()`/
`startDeckReviewSession()` já compõem corretamente com qualquer card que
tenha `.deckId`; a decisão de SE/COMO a trilha ganha uma representação
de Deck (Deck-por-curso? Deck-por-unidade? não migrar, deixar os 2
sistemas paralelos pra sempre?) continua inteiramente em aberto, não
tocada nesta fase, conforme D3 exigia.

Nenhum passo manual pendente pra autora -- nenhuma migração nova nesta
fase, teste real Supabase (§21) executado e confirmado com zero
resíduo.

**PARE conforme instrução explícita -- Fase E NÃO iniciada.** Só começa
depois que a autora revisar este checkpoint.

## Migration 051 (`051_create_course_decks`) -- reconciliação Git <-> Supabase (2026-09-29)

**O que aconteceu:** a migration `051_create_course_decks` (versão
`20260929145614`, 29/09/2026 14:56 UTC) foi aplicada ao Supabase
(`eigjocalzwamisgqilhg`) ANTES desta integração e nunca foi versionada --
nenhuma ref Git a continha (`git log --all -S course_decks` vazio). A
branch das Fases B-D (`claude/test-previous-changes-bo5atv`) termina na
`050`. O próprio cabeçalho do SQL a descreve como "Fase E" e cita uma
seção "Fase E -- Study Trail <-> Decks" do CLAUDE.md que NÃO existe em
nenhuma ref Git.

**Como foi recuperada:** lida diretamente do banco
(`supabase_migrations.schema_migrations.statements`, 1 statement, 13.974
bytes, md5 `f4a481f60ec9c26ebfb27b9c43ee06b0`) e gravada em
`shared/supabase_migrations/051_create_course_decks.sql` byte a byte
igual (mesmo tamanho e md5 conferidos). Nenhuma linha foi reescrita,
simplificada ou "melhorada". NÃO foi reaplicada ao banco -- já estava
aplicada; o arquivo só reconcilia o histórico versionado com o estado real.

**O que ela contém (aditiva sobre 049/050):**
- coluna `decks.course_unit_id text` (nullable);
- índices únicos parciais `decks_unique_course_unit` e
  `decks_unique_course_root` (1 raiz de curso por idioma, 1 Deck por
  Unit por idioma);
- `create or replace` de `decks_validate_hierarchy()` -- só o ramo
  `course` mudou (owner/teacher nulos, não público, raiz sem parent, Deck
  por Unit com a raiz do mesmo idioma como parent);
- policy `decks_course_select` (`for select using (kind = 'course')`);
- função `ensure_course_decks(p_language_app_key, p_units jsonb)`,
  `security definer`, só `authenticated`.
Idempotente (`add column if not exists`, `create ... index if not
exists`, `drop policy if exists`, `create or replace`).

**Estado do banco verificado (só leitura) antes e depois da integração:**
`decks` com 0 linhas; nenhum Course Deck criado; nenhum `deck_id`
preenchido em `own_flashcards` (7) nem em `teacher_flashcards` (5). A
função `ensure_course_decks` nunca foi chamada. A 051 não produziu dados.

**Relação com as Fases B-D:** independente -- o código de B-D
(`shared/deck-engine.js`, `shared/deck-data.js`) não referencia
`course_unit_id`, `ensure_course_decks` nem `decks_course_select`.

**Status da Fase E:** a 051 é só a infraestrutura de banco inicial dos
Course Decks. A implementação cliente da Fase E NÃO foi realizada nesta
etapa: nenhuma chamada a `ensure_course_decks`, nenhum Course Deck criado,
nenhum `deckId` atribuído a cartões da Study Trail, nenhuma alteração em
Review/Study Trail/UI. A Study Trail continua NÃO integrada aos Course
Decks. A Fase E será retomada separadamente.

## Projeto de melhoria do sistema de áudio (TTS) -- camada de "texto falado", passo 1 (2026-09-29)

Motivado por 3 reports (áudio de `un / une`, `français / française` e `l'œuf`
lidos errado) + pedido da autora de resolver o **critério de geração**, não só
os mp3 pontuais.

**Achado (forense por MD5):** o nome de cada mp3 do manifest é o MD5 do texto
enviado ao TTS. Em fr, 741 de 750 entradas batem com o texto exibido; as 9
que NÃO batem são exatamente as 9 com ` / ` -- e batem só com a **1ª forma**
(`"un / une"` foi gerado como `"un"`). O gerador original (nunca commitado)
cortava o texto na barra. Em zh, 424/424 batem (nunca houve pré-processamento).
Não existia correção anterior para `brésilien / brésilienne`.

**Regras aprovadas pela autora (camada 1):** ` / ` -> `, ` (pausa curta);
`(de)` lido, sem parênteses e sem a pausa grande; `l'œuf` lido como uma
palavra só (forma a escolher OUVINDO variantes -- regra pendente e desligada).

**Feito nesta entrega (só `fr/scripts/`, `.gitignore`; zero mudança em app.js):**
- `challenges_pipeline/spoken_text.py` -- tabela de regras POR IDIOMA
  (`to_spoken_text`, `explain_spoken_text`, `report_affected_entries`,
  `SPOKEN_RULES_VERSION`, overrides manuais). Português/outros idiomas entram
  como mais uma lista, sem misturar regras (ex.: sandhi de "os carros azuis").
- `tts.synthesize()` passa a enviar `to_spoken_text(text, lang)`; arquivo
  continua nomeado pelo hash do texto EXIBIDO (chave do manifest); o STT
  valida contra o texto falado.
- `test_spoken_text.py` (31 testes, sem rede) e `audio_lab.py` (gera variantes
  e uma página HTML pra ouvir; `--dry-run` não usa rede).
- Relatório: `python3 fr/scripts/challenges_pipeline/spoken_text.py` -> 12
  entradas fr mudam (9 com barra + 3 com `(de)`), 203 caracteres; 0 em zh.

**Custo (pesquisado, conferir na página de preços do Google antes de rodar em
massa):** Chirp 3 HD tem 1 milhão de caracteres/mês gratuitos, depois ~US$30
por milhão. O site inteiro (fr 12.009 + zh 1.461 caracteres) usa ~1,3% da cota.

**Ainda NÃO feito (passos seguintes):** ouvir o laboratório e decidir `l'œuf`
e `(de)`; regenerar os mp3 afetados (exige `GCP_TTS_KEY`, ainda não
disponível -- proposta: rodar via GitHub Actions com a chave em Secrets, sem
terminal); camada 5 (validar contra o texto falado + pico de volume no
pipeline geral); exemplo de frase para `un kilo (de)`/`une tranche (de)`/
`une bouteille (de)` (conteúdo em fr/content.js, e o cartão de vocabulário
não tem campo de exemplo -- mudança de app.js, fora desta entrega).

## Fase E -- Study Trail <-> Course Decks (2026-09-29)

**Correção de checkpoint**: o checkpoint citava `21eb99f`, que não existe; o commit real das Fases B-D é **`21ebf99`**, que estava só em `origin/claude/fervent-einstein-emwqjg`. Foi integrado à branch de trabalho por **merge normal** (`d2e5199`), sem rebase/reset. A 051 foi
conferida: 13.974 bytes, md5 `f4a481f60ec9c26ebfb27b9c43ee06b0`, não alterada.

**Modelo**: `Course → Course root (1/idioma) → Unit Deck (1/unidade com
vocabulário)`. Cada card de trilha (`origin:'study'`) ganha `deckId` via
`unitId → String(unitId) = course_unit_id → decks.id`. **Nunca pelo nome**;
`unitId` (identidade pedagógica) e `deckId` (destino organizacional)
coexistem, nenhum substitui o outro.

**Código**
- `shared/deck-engine.js` (puro): `courseUnitsForDecks(units)` (payload da RPC;
  só units que geram cards -- grammar/sem vocab ficam de fora),
  `isCourseDeck`, `buildCourseDeckIndex(decks, lang)`, `courseDeckIdForUnit`,
  `assignCourseDeckIds(cards, index)` (só mexe em `deckId` de cards `study`).
  Nenhum 2º Deck Engine.
- `shared/deck-data.js`: `fetchCourseDecksForLanguage` (SELECT, funciona para
  guest) e `ensureCourseDecksForCurrentUser` (RPC, exige `CURRENT_USER`).
- `fr/app.js` e `zh/app.js` (espelhados): `deckId:null` no card de trilha;
  `ensureCourseDecksLoaded()` chamada por `ensureDecksLoadedForReview()`
  (**sob demanda, nunca no boot**); `STATE.courseDecksLoaded`;
  `applySerializedState` agora preserva o `deckId` fresco (é dado derivado do
  banco -- um save antigo não pode sobrescrevê-lo; vale também para cards
  nativos, correção mínima necessária).
- **Migration 052** (aplicada ao vivo): `revoke execute ... from anon` em
  `ensure_course_decks`. O teste real mostrou que a 051 deixava o guest
  executar a função (o `revoke from public` não remove o grant direto que o
  Supabase dá a `anon`): um anônimo podia criar/renomear Course Decks.
  Corrigido e reverificado (`permission denied`). Observação NÃO corrigida
  (fora do escopo): `ensure_user_decks` também é executável por `anon`
  (tem checagem interna de auth desde a 050).

**Guest/auth**: guest só LÊ Course Decks (RLS `decks_course_select`); nunca
chama a RPC. Autenticado: 1 bootstrap idempotente por sessão com a lista REAL
de `UNITS`. Sem Course Decks (ou antes do bootstrap) os cards ficam com
`deckId:null` e Study Trail/Review funcionam exatamente como antes.

**Review**: sem fila/FSRS/scheduler novos. `startDeckReviewSession` já usava
`getStudyScopeForDeck(eligibleReviewPool())`; pertencer ao Deck NÃO torna
elegível -- `isCardLessonCompleted` continua mandando. Contagens por
CardInstance (reverso=2, cloze=N).

**Testes versionados** em `tests/fase-e/`: `test_course_decks_unit.js`
(Node/VM, 75/75), `test_supabase_real.sql` (Postgres real, transação com
rollback; todos ok após a 052; sem resíduo: 0 decks antes e depois),
`test_playwright.js` (FR+ZH, 38/38). "Autenticado" no Playwright é simulado
(`CURRENT_USER` + stub com o contrato da 051/052; o CDN do Supabase é
bloqueado no sandbox). Regressão: answer_validation fr/zh e spoken_text ok.

**Limitações / não feito**: Course Decks ainda NÃO existem no banco (criados
no primeiro uso autenticado); filtro de origem do Review (`self`/`teacher`)
ainda se aplica ao pool do Deck; sem Painel, Tags UI, Teacher/Public Decks,
import Anki com hierarquia, movimentação/delete de Course Deck, mudança de
FSRS ou do limite Free. Fase F não iniciada.

## Fase F -- Add Card + destino em Deck (2026-09-29)

**Fluxo**: `Note → Fields → Card Type → CardInstances → Deck → Review/FSRS`.
Reaproveita o editor nativo da Fase 6D (nada de 2º editor/gerador/limite/
fila). Sem migration nem mudança de schema (`own_flashcards.deck_id` e o
trigger `own_flashcards_validate_deck` já existiam desde a 049/050).

**Achados da auditoria** (antes do código): (1) `deck_id` nunca era gravado
na criação -- todo cartão novo ficava NULL e o Deck Engine (que escopa por
`deckId != null`) nunca o achava; (2) o teto Free contava LINHAS, em 4
lugares (criação manual, import arquivo/link, Anki, perfil público), não
CardInstances; (3) Course Decks só para units com vocab (units `grammar`
ficam de fora) é intencional e compatível -- não gera cards, Add Card não
usa Course Deck; nada reaberto da Fase E.

**Implementado**
- `shared/deck-engine.js`: regra canônica ÚNICA do limite:
  `cardInstanceCountForRow`, `ownCardInstanceUsage` (só linhas ativas),
  `cardInstanceCountForEditorState`, `preflightOwnCardInstanceCreation`
  (delegam a `generatedCardInstanceCount` -> motor real). Normal=1,
  reverso=2, Cloze=N. `computeAnkiImportRemainingSlots` foi REMOVIDA.
- `shared/deck-data.js`: `resolveOwnCreationDeck` -- bootstrap idempotente
  (`ensure_user_decks`) + destino; padrão = `personal_root` ("Meus Decks",
  Deck real aceito pelo trigger); valida via `canPlaceOwnNoteInDeck`
  (regras não replicadas; RLS/trigger seguem a autoridade final).
- `shared/own-flashcards.js`: `createOwnFlashcard({languageAppKey,
  nativeState, deckId?, decks?})` grava `deck_id` no MESMO INSERT da Note
  (atômico). `deck_id` NÃO entra em `nativeContentColumnsFromEditorState`
  (usado também na edição -- editar não muda Deck).
- `shared/my-flashcards.js`: seletor "Deck de destino" (só personal_root +
  subdecks pessoais), preflight antes de gravar (falha = nada persistido,
  nenhum limite consumido), seção "Meus Decks" (lista, criar subdeck via
  `createPersonalDeck`, botão **"Estudar este Deck"** ->
  `startDeckReviewSession`, fora do formulário), selo `N/20` por
  CardInstance. `STATE.decks` atualizado.
- Imports de arquivo/link, Anki e perfil público: mesmo preflight e Deck
  padrão (`personal_root`) resolvido antes de qualquer escrita
  (`anki-import-ui.js`, `public-profile.js`).

**Não feito (de propósito)**: sem backfill -- as 7 linhas antigas com
`deck_id NULL` continuam fora de Deck até uma ação explícita futura;
sem Teacher Decks/Tags UI/Painel/perfil público de Decks; sem mudança em
FSRS/Review/Study Trail/áudio (`fr/app.js` e `zh/app.js` NÃO foram
tocados; a linha `(de)` de `findMatchingPhrase` segue intacta). Import
Anki continua inserindo em lotes de 40 (não é tudo-ou-nada entre lotes --
comportamento pré-existente; o preflight cobre a seleção inteira).
Limitação: o teto conta o uso já persistido; corrida entre duas abas
poderia ultrapassá-lo (é trava de UI, como desde a Fase 5.1).

**Testes versionados** (`tests/fase-f/`): `test_add_card_unit.js` (Node/VM,
68/68), `test_supabase_real.sql` (Postgres real, transação + ROLLBACK, 14
cenários ok: Course/Teacher/teacher_root/root/outro usuário/outro idioma/
inexistente rejeitados, RLS; zero resíduo: decks 0, own_flashcards 7, hash
igual), `test_playwright.js` (FR+ZH, 48/48: criar Deck -> Card Type ->
Fields -> Deck -> Preview -> salvar -> Estudar este Deck -> grade FSRS;
limite Free/Premium/vínculo; import de arquivo). Fase E re-executada:
unit 75/75, playwright 38/38.

**Atualização (2026-09-29): passo 1 concluído e em produção (PRs #274 e #275,
já mergeados). Decisões e estado atual, substituem a lista "Ainda NÃO feito"
acima.**

- **Regras de texto falado vigentes (`SPOKEN_RULES_VERSION = 4`, só `fr`):**
  `fr.slash-alternatives` (` / ` -> `, `), `fr.parenthetical-particle`
  (`(de)` lido; exceção em `SPOKEN_OVERRIDES` para "une bouteille (de)"),
  `fr.oe-ligature-elision` (`œuf` -> `oeuf`) e `fr.age-elision`
  (`l'âge` -> `l'age`, só depois de `l'`; "quel âge" não muda). zh: nenhuma
  regra. Nova regra = nova entrada em `RULES_BY_LANG` + subir a versão +
  atualizar o conjunto esperado em `test_spoken_text.py` (16 entradas afetadas
  hoje). Só o texto enviado ao TTS muda, nunca o exibido nem a chave do manifest.
- **Como regenerar (sem terminal):** GitHub Actions > "Áudio TTS"
  (`.github/workflows/audio-tts.yml`), modos `laboratorio` (só variantes para
  ouvir), `regenerar` (refaz TODAS as entradas afetadas pelas regras, não só a
  nova) e `gerar-faltantes` (cria mp3 de itens do manifest ausentes). O robô
  commita mp3/manifest na branch e dispara o deploy (commits do GITHUB_TOKEN
  não disparam outros workflows sozinhos). A chave vive SÓ no Secret
  `GCP_TTS_KEY`; nunca em arquivo, commit, PR ou chat. Voz: Chirp 3 HD
  Achernar (fr-FR e cmn-CN); cota grátis 1M caracteres/mês (site inteiro usa
  ~1,3%).
- **Validação do gerador (`tts.py`):** comparação STT tolerante a elisão
  (t'as = tu as, t'es = tu es) + checagem física do mp3 (`audio_is_healthy`,
  volume/duração), não só reconhecimento de fala. Bug corrigido: o manifest
  não era atualizado para pares com barra (hash sem ".mp3"); hoje todo hash
  do manifest bate com o texto exibido.
- **Também entregue:** 67 áudios de exemplo zh (inclui 拜拜), 25 itens fr,
  3 frases coloquiais ("t'es français ?", "t'as quel âge ?", "t'as fait quoi
  hier ?"), e uma linha em `fr/app.js` (`findMatchingPhrase` ignora `(de)`
  para achar a frase de exemplo de "un kilo (de)").
- **Regra de processo desta frente:** NÃO abrir PR nem mergear por iniciativa
  própria (há outro chat editando flashcards/Anki/`app.js`/`index.html`/este
  arquivo); só quando a autora pedir. Se outro chat também editar este
  arquivo, manter os dois blocos.
- **Pendente:** (1) relatório #5 -- opções do checkpoint do zh sem áudio;
  desejo: mostrar a frase chinesa correta com áudio e depois a tradução,
  diferenciadas visualmente (mudança só nessa tela de `zh/app.js`; precisa do
  print e do layout preferido); (2) segurança -- a chave de API foi colada em
  chat; a autora JÁ rotacionou a chave em 29/09/2026 (confirmado por ela em
  03/10/2026), então não é mais pendência; (3) camada de "texto
  falado" para português e outros idiomas entra como nova lista em
  `RULES_BY_LANG`, sem misturar regras (ex.: sandhi de "os carros azuis").

## Fase G -- Teacher Decks: cartões da professora no Deck Engine (2026-09-29)

**Modelo**: `Note → Fields → Card Type → CardInstances → Teacher Deck → Review/FSRS`,
sem arquitetura paralela. Teacher Deck = Deck real (`decks`, kinds `teacher_root`/
`teacher`) que pertence ao RELACIONAMENTO professora→aluno→idioma
(`owner_id` = aluno, `teacher_id` = professora). Schema/RLS/triggers já existiam
(049); a única migration nova é a **053** (aplicada ao vivo).

**Decisões confirmadas pela autora**: (1) Teacher Cards NÃO entram no limite de 20
(o teto continua só sobre `own_flashcards`; preflight da Fase F intocado; a matriz
de Card Types Free/Premium segue valendo); (2) `teacher_root` é o destino padrão
("aluno → idioma → teacher_root → criar cartão"), subdeck é opcional.

**Migration `053_ensure_teacher_decks.sql`** (aditiva, sem backfill, idempotente):
`ensure_teacher_decks(p_student_id, p_language_app_key)`, SECURITY DEFINER,
`revoke` de public e anon, `grant` a authenticated. Chamador = sempre `auth.uid()`
(a professora); exige vínculo `teacher_students` ATIVO (professora+aluno+idioma) --
sem vínculo, idioma sem vínculo, aluno de outra professora, ou o próprio aluno
chamando → `not_authorized`. **Não duplica o bootstrap do `root`**: se o root do
aluno não existe, chama `ensure_user_decks()` (fonte única; efeito colateral:
cria também o `personal_root` do aluno). Consequência registrada: como
`ensure_user_decks` só aceita "a própria conta ou o admin", uma professora
NÃO-admin cujo aluno ainda nunca abriu o app receberia `not_authorized` nesse
passo -- não ampliamos permissões (hoje a professora real é o admin). O arquivo
versionado tem comentários a mais que o SQL aplicado; a lógica é idêntica.

**Código** (fr/app.js e zh/app.js NÃO foram tocados; linha `(de)` preservada):
- `shared/deck-engine.js`: `getTeacherDecksForStudent`, `getTeacherRootDeck`,
  `orderedTeacherDecks`, `canCreateTeacherSubdeck`, `canMoveTeacherDeck`;
  `canMoveDeck` delega `kind='teacher'`; `isDeckDeletableKind` inclui `teacher`
  (`teacher_root` nunca move nem apaga).
- `shared/deck-data.js`: `ensureTeacherDecksForStudent` (lazy, só ao selecionar o
  aluno), `resolveTeacherCreationDeck` (padrão = teacher_root; valida com
  `canPlaceTeacherNoteInDeck`), `createTeacherDeck`, `moveTeacherDeck`,
  `deleteTeacherDeck` (só vazio: sem filhos e sem Notes -- `deck_id` tem
  `on delete set null`, então checa antes).
- `shared/teacher-flashcards.js`: `createFlashcard({..., deckId})` grava `deck_id`
  no MESMO INSERT da Note (atômico por aluno). Editar não muda Deck.
- `shared/admin-flashcards.js` (UI mínima): seção "Destino (Deck de cada aluno)"
  com UM seletor por aluno selecionado (nunca um global), criar subdeck, Deck do
  cartão visível na lista, "Mover para…" (entre Decks do mesmo aluno). Editor
  nativo reutilizado; nenhum editor novo.
- `shared/my-flashcards.js`: seção **somente leitura** "Cartões da professora"
  (só "Estudar este Deck" → `startDeckReviewSession`; nenhum controle de
  criar/mover/apagar; some se a conta não recebeu Teacher Decks).

**Multi-aluno**: uma linha independente POR aluno (como já era), cada uma com o
`deck_id` do PRÓPRIO aluno. `Promise.all` → **pode haver sucesso parcial**
(sem atomicidade global entre alunos); cada criação individual é atômica e uma
falha nunca atribui o cartão ao Deck de outro aluno (toast lista os @usuários
que falharam).

**Review/FSRS/contagem**: nada novo -- escopo = `getStudyScopeForDeck` sobre o
subtree; contagem por CardInstance (reverso=2, Cloze=N); FSRS do CardInstance do
aluno. "Estudar" não existe no lado da professora (o FSRS é do aluno).

**Históricos**: as 5 linhas de `teacher_flashcards` com `deck_id NULL` NÃO foram
migradas (mesma regra da Fase F); um cartão histórico só recebe Deck se a
professora o mover explicitamente.

**Limitações registradas**: (a) `teacher_flashcards` continua com escrita só do
admin por e-mail (026) e `decks_admin_write` deixa o admin apagar QUALQUER Deck
(inclusive `teacher_root`, cascateando filhos e zerando `deck_id` dos cartões por
`on delete set null`) -- a proteção "só Deck vazio" vive no domínio
(`validateDeckDeletion`), não no banco; o teste SQL mostra que professora
não-admin não apaga `teacher_root`; (b) sem UI para mover/apagar Teacher Deck (as
funções existem e são testadas); (c) `teacher_root` se chama sempre "Cartões da
professora" (aluno com 2 professoras vê 2 raízes com o mesmo nome); (d) cópia
Teacher Card→Meus Decks NÃO implementada; (e) concorrência de 2 abas no limite
Free, Tags e Painel não tocados.

**Testes versionados** (`tests/fase-g/`): `test_teacher_decks_unit.js` (Node/VM,
134/134, fr+zh), `test_supabase_real.sql` (Postgres real, transação + ROLLBACK,
52/52; rodado com aluno 1/2 reais vinculados à professora, mais uma "outra
professora" criada só dentro da transação), `test_playwright.js` (FR+ZH,
68/68). Regressão: Fase F unit 68/68 + Playwright 46/46; Fase E unit 75/75 +
Playwright 38/38. Suítes antigas de consolidação/6D/Anki/áudio NÃO estão
versionadas -- não foram executadas. Banco após os testes: `decks` 0,
`teacher_flashcards` 5 (5 com `deck_id` nulo), `own_flashcards` 7, vínculos 12 --
idêntico ao início, zero resíduo.

## Fase G -- hardening: proteção estrutural dos Teacher Decks contra DELETE (2026-09-29)

**Lacuna**: `decks_admin_write` (ALL) deixava o admin apagar qualquer Deck, inclusive `teacher_root`; como `teacher_flashcards.deck_id` é `ON DELETE SET NULL`, isso desassociaria cartões em silêncio. Auditado ao vivo antes de alterar: FK `teacher_flashcards_deck_id_fkey` = `ON DELETE SET NULL`; `decks_parent_deck_id_fkey` = `ON DELETE CASCADE`; único trigger de `decks` era `decks_validate_hierarchy` (sem DELETE); policies intactas (`decks_admin_write` ALL por e-mail, `decks_teacher_write` só `kind='teacher'`, `decks_owner_write` só `personal`).

**Migration `054_protect_teacher_decks_delete.sql`** (aditiva, aplicada ao vivo; nenhuma policy/FK/migration antiga alterada): trigger `BEFORE DELETE` em `decks` (`decks_protect_teacher_delete`, SECURITY DEFINER, `search_path=public,auth`, sem EXECUTE para public/anon/authenticated):
- `teacher_root`: nunca apagável (vazio ou não), por qualquer papel (admin, professora, SQL direto, função);
- `teacher`: só apagável se vazio (sem subdecks e sem `teacher_flashcards`); senão exceção `23503`;
- exceção única: remoção da CONTA (cascata de `auth.users`) -- se aluno ou professora do Deck já não existe em `auth.users`, o Deck pode ir junto (testado com usuário temporário);
- `personal`/`personal_root`/`root`/`course`: sem mudança. SECURITY DEFINER foi necessário: o trigger roda como quem apaga e `authenticated` não lê `auth.users` (o 1º teste real falhou com `permission denied for table users`; corrigido).

**Testes** (`tests/fase-g/test_supabase_real.sql`, seção J, transação + ROLLBACK; rodada ao vivo em versão enxuta com admin + professora B não-admin criada na transação + aluno + vínculo ativo, 19/19 ok: J1 admin não apaga teacher_root; J2 teacher com filho; J3 teacher com cartão e nenhum `deck_id` virou NULL; J4 folha vazia apagável; J5 não-admin protegida por RLS+trigger; J6 SQL direto; J7 pessoal segue regra anterior; J8 curso segue regra anterior; J9 cascata de conta; J10 5 históricos intactos). O arquivo versionado completo (seção J embutida no cenário maior) NÃO foi executado inteiro nesta rodada -- só a versão enxuta acima. Node/VM G 134/134, Playwright G 68/68 (FR+ZH), regressão F 68/68 + 46/46, E 75/75 + 38/38. `node --check` ok. Banco antes/depois idêntico: decks 0; teacher_flashcards 5 (hash `c903f626...`, 5 com `deck_id` nulo); own_flashcards 7 (hash `86fbf5d2...`); sem usuário temporário.

**Confirmações**: `fr/app.js`/`zh/app.js` intocados (linha `(de)` intacta); `ec7f513` inexistente; nenhum cartão histórico alterado; nenhum `deck_id` zerado.

**Limitações restantes**: escrita de `teacher_flashcards` segue admin-only (026); a UI ainda não oferece mover/apagar Teacher Deck (funções existem e passam pelo trigger); `teacher_root` sempre chamado "Cartões da professora"; cópia Teacher Card→Meus Decks, Tags e Painel não implementados; conta com 2 professoras vê 2 raízes de mesmo nome.

## Fase H -- experiência completa de Teacher Decks (2026-09-29)

Fecha a experiência funcional sobre B–G (Deck Engine, 053, 054, Review por Deck), **sem reescrever o Deck Engine, sem tocar `fr/app.js`/`zh/app.js`/áudio/FSRS**. Modelo intacto: `Note → Card Type → CardInstances → Review/FSRS` e `Note → Deck` (Note-level; irmãos ficam juntos).

**Auditoria (achados reais, corrigidos sem mudar regra de produto)**
1. *Banco*: nada impedia professora com vínculo inativo (ou admin sem vínculo) de criar/renomear/mover/apagar Teacher Decks ou criar Teacher Cards -- só `ensure_teacher_decks` validava vínculo.
2. *UI*: `fetchMyStudents` traz vínculos `removed/invited` e eles eram selecionáveis; a seleção era por `student_id` (aluno em 2 idiomas selecionava as 2 linhas → cartão criado nos dois idiomas); o destino era guardado por `student_id` sem idioma; `_ensuredKeys` não era por professora; não existia visualização da árvore nem exclusão de Teacher Deck; o aluno via só o total de cartões.
3. Já existiam e foram reutilizados (nenhuma 2ª implementação): `createTeacherDeck`, `moveTeacherDeck`, `deleteTeacherDeck`, `setTeacherFlashcardDeck`, `resolveTeacherCreationDeck`, `getDeckCounts`, `getStudyScopeForDeck`, `startDeckReviewSession`.

**Migration `055_teacher_decks_require_active_link.sql`** (aditiva, aplicada ao vivo; não altera policies/FK/linhas): triggers `SECURITY DEFINER` -- `decks` (teacher_root/teacher) exige vínculo `teacher_students` (professora+aluno+idioma) `active` em INSERT/UPDATE/DELETE (DELETE liberado só na cascata de remoção de conta, como na 054); `teacher_flashcards` exige vínculo ativo em INSERT e em UPDATE que muda `deck_id` para um Deck (deck_id inalterado ou NULL -- inclui o `SET NULL` de cascata -- e edição de conteúdo NÃO são bloqueados; cartões históricos nunca são destruídos). Vale para qualquer papel, admin inclusive.

**Código**
- `shared/deck-data.js`: `setTeacherFlashcardDeck` só move Note da PRÓPRIA professora (`teacher_id`), UPDATE único de `deck_id`; `createTeacherDeck` limita nome a 60; `deleteTeacherDeck` devolve mensagem por motivo (a checagem é só UX; 054/055 são a autoridade).
- `shared/admin-flashcards.js`: `adminSelectedStudents()` (seleção efetiva = aluno + idioma ativo), `adminDestKey()` (destino por aluno+idioma), só vínculos `active` no seletor, `_ensuredKeys` por professora, `fillTeacherTreeLists()` (árvore por aluno/idioma com contagem de cartões por Deck e 🗑 só em `teacher` vazio; teacher_root sem botão; recarrega após mover/apagar cartão). Bug de regressão pego pelo Playwright durante a fase (`langsPresent` fora de escopo no render) corrigido.
- `shared/my-flashcards.js`: árvore do aluno (somente leitura) com New/Aprendendo/Revisar via `getDeckCounts` sobre o pool elegível (CardInstances, nunca Notes).
- Nenhuma UI para mover/renomear Teacher Deck (funções existem e são testadas; não pedido), nenhuma para copiar Teacher Card.

**Regras vigentes de Teacher Deck**: teacher_root nunca move/apaga; `teacher` só apaga vazio; mover Note só entre Teacher Decks do mesmo aluno+professora+idioma; destino nunca é global entre alunos (multi-aluno = uma Note e um `deck_id` por aluno, sucesso parcial possível e reportado); vínculo inativo não opera a árvore nem cria cartões; aluno somente leitura; Review de Teacher Deck = mesmo `startDeckReviewSession`/FSRS (escopo do subtree, só cards `teacher` do aluno).

**Testes (versionados em `tests/fase-h/`)**: Node/VM `test_teacher_experience_unit.js` 78/78 (fr+zh); SQL real `test_supabase_real.sql` (transação+ROLLBACK, professora A admin real, B não-admin, aluno, vínculos ativo/removed/invited, cross-teacher/student/language, personal/course/inexistente, mover Note só `deck_id`, DELETE protegido, cascata de conta, 5 históricos byte a byte) 59/59; Playwright `test_playwright.js` 68/68 (FR+ZH). Regressões: G unit 134/134, G Playwright 68/68 (mock ganhou `status` e usa `adminDestKey`), G SQL completo 71/71 (comentários stale atualizados), F unit 68/68 + Playwright 46/46, E unit 75/75 + Playwright 38/38. SQL de E/F não reexecutado (não tocam teacher decks/cards). Banco antes/depois idêntico: decks 0; teacher_flashcards 5 (hash `c903f626…`, 5 com `deck_id` nulo); own_flashcards 7 (`86fbf5d2…`); 12 vínculos; sem usuários temporários. `ec7f513` inexistente; linha `(de)` intacta.

**Limitações / decisões pendentes**: (a) filtro de origem do Review (`reviewOriginFilter`) continua valendo dentro de Deck (decisão da Fase D): com filtro `self`, um Teacher Deck estuda 0 cards -- não alterado (exigiria mexer em `fr/app.js`/`zh/app.js`); (b) aluno com 2 professoras vê 2 raízes de mesmo nome ("Cartões da professora"); (c) sem regra de nome único por nível (a arquitetura atual não exige); (d) escrita de `teacher_flashcards` segue admin-only (026); (e) sem cópia Teacher Card→Meus Decks, Tags, Painel, Public; (f) 5 Teacher Cards históricos sem Deck (sem backfill); (g) Playwright usa mock (CDN bloqueado) -- as regras reais estão no SQL.

## Fase H (hardening final) -- Deck é o escopo autoritativo; `reviewOriginFilter` só vale no Review geral (2026-09-30)

**Regra**: uma sessão iniciada EXPLICITAMENTE por um Deck (`startDeckReviewSession`) estuda os CardInstances do Deck (+ subtree) com elegibilidade normal (`isCardLessonCompleted`: lição concluída / não arquivado) e as regras normais de Review (FSRS, New/Learning/Review, `newCardsPerDay`, intensidade), **sem exclusão adicional por `STATE.studySettings.reviewOriginFilter`**. Antes, um Teacher Deck rendia 0 cartões se o filtro global estivesse em "Meus cartões".

**Auditoria**: o filtro é aplicado num único ponto, `eligibleReviewPool()` (`isCardLessonCompleted` + `matchesReviewOriginFilter`), e vazava para o fluxo de Deck em 4 lugares (`startDeckReviewSession`, `deckCountsForReview`, `deckReviewSummary`, contagens da árvore do aluno em `shared/my-flashcards.js`). Nada refiltra depois de a fila ser montada. O seletor de origem só existe em "Configurar sessão" (fora da sessão), então não há controle a desabilitar.

**Implementação (estrutural, sem novo mecanismo de filtros)**: nova `eligibleDeckReviewPool()` (fr/zh `app.js`, = `STATE.cards.filter(isCardLessonCompleted)`, sem origem) usada pelas 3 funções de Deck e pela árvore do aluno. `eligibleReviewPool()` e o Review geral ficam byte a byte iguais. O valor persistido de `reviewOriginFilter` nunca é lido/alterado na sessão de Deck. Não é autorização (continua sendo do Deck Engine/RLS). Sem migration, sem mudança de dados/RLS, Deck Engine/FSRS/áudio intocados (linha `(de)` preservada).

**Testes** (`tests/fase-h/test_deck_origin_filter.js`, Playwright FR+ZH, 52/52; cobre Teacher/Pessoal/Course Deck × todos os filtros, Review geral, persistência do filtro, arquivado/não-vencido/FSRS/Deck alheio). Verificado que reverter o fix faz o teste falhar. Harness da Fase E ganhou `eligibleDeckReviewPool` na lista de funções extraídas.

## Fase H -- checkpoint final: verificação SQL real concluída, Fase H ENCERRADA (2026-09-30)

- **Commit da Fase H (hardening final):** `0fce4c5` (permanece como está; nenhum código de produção alterado nesta verificação). `ec7f513` não existe no repositório (`git cat-file` -> "Not a valid object name").
- **SQL real completo e versionado** (`tests/fase-h/test_supabase_real.sql`, projeto `eigjocalzwamisgqilhg`, transação única + ROLLBACK, executado integralmente e sem alteração): **59/59 cenários ok** (A1-A3, B1-B9, C1-C14 incl. 5x C4, D1-D7, E1-E7, F1-F13, G1, H1).
- **Snapshot antes x depois (idênticos, byte a byte via md5):** `decks` 0 linhas; `teacher_flashcards` 5 (hash `cf25493d4524c50496b543763ac5d946`, 5 com `deck_id` nulo, 0 com `deck_id`); `own_flashcards` 7 (hash `c2626c2898060830bad8f8bd19690257`, 0 com `deck_id`); `teacher_students` 12 (hash `32da7077...`); `auth.users` 41 (hash `f14ff9bf...`); `profiles` 26 (hash `70a2e5d6...`); `tts_generation_log` 0.
- **Resíduo zero:** nenhum usuário temporário (`tmp-fase-h@example.invalid`: 0), nenhum Deck, nenhum vínculo criado. Os 5 Teacher Cards históricos seguem sem alteração e nenhum `deck_id` foi criado ou modificado.
- **Testes já executados:** unit G 134/134; unit H 78/78; Playwright filtro de origem 52/52 (fr+zh); Playwright G 68/68 e H 68/68 (sessão anterior); regressões F (68/68, 46/46) e E (75/75, 38/38).
- Working tree limpa. Sem migration nova, sem mudança de RLS. Próxima fase do roadmap apenas em nova tarefa (Tags NÃO iniciadas).

## Fase I -- Tags (2026-09-30)

Decisões de produto (fechadas): **Tags pertencem à Note**, nunca ao CardInstance --
CardInstances irmãos (Normal com reverso, Cloze multi-marca) compartilham
exatamente a mesma lista (`buildEngineCardsFromRow` calcula `tags` uma vez por
linha); mover a Note de Deck não muda as Tags. São **globais na conta** e
independentes de idioma, **sem hierarquia**, sem tabela `tags`: a fonte
persistida continua `tags text[]` em `own_flashcards`/`teacher_flashcards`
(migration 048, default `{}`, sem backfill). **Gratuitas** e fora do teto Free
de 20 CardInstances.

- **Normalização canônica única**: `normalizeTagSlug`/`normalizeNoteTags`
  (`shared/flashcard-model.js`) -- minúsculas, sem acento, espaço/`::` -> `-`,
  inválidos removidos, dedup mantendo a 1ª ocorrência. Ninguém reimplementa.
- **Limites**: 20 tags por Note e 50 caracteres por tag normalizada
  (`TAG_MAX_PER_NOTE`/`TAG_MAX_LENGTH`), validados em UM ponto
  (`validateNoteTags`, chamado por `validateNoteEditorStateForSave` e pelo editor).
  Nunca truncam nem descartam em silêncio: o editor mostra o motivo; em lote
  (Anki, cópia/importação) `partitionNoteTagsByLimits` mantém as válidas e a UI
  AVISA quantas ficaram de fora. Rede de segurança no banco: migration
  **056** (CHECK `*_tags_limits` via `note_tags_within_limits`, aplicada ao vivo;
  aditiva, sem tocar dados nem RLS).
- **Editor**: `shared/flashcard-tags-editor.js` (`mountNoteTagsEditor`) -- mount
  próprio, irmão da caixa de Campos (trocar Card Type/Field não perde tags), usado
  em criar/editar de Meus Cartões e do admin. Edição legada não toca `tags`
  (conversão Legacy->Native as preserva).
- **Teacher Cards**: a professora (admin) edita as tags; a aluna só **vê** (chips
  sem remover) e **filtra**. Garantia no backend: escrita de `teacher_flashcards`
  segue admin-only (RLS 026 + triggers 054/055) -- verificado em SQL real (aluna e
  terceiros: 0 linhas afetadas). Sem cópia editável do lado da aluna.
- **Review por Tag**: estado próprio `STATE.studySettings.reviewTagFilter`
  (lista de slugs; nunca reutiliza `reviewOriginFilter`). `[]` = "Todas" (sem
  restrição); 1+ tags = **OR** (pelo menos uma; sem AND/NOT). **Deck + Tag = AND**:
  o Deck define o universo (`startDeckReviewSession`), a Tag só reduz -- nunca
  traz card de outro Deck. A correção da Fase H (sessão de Deck ignora
  `reviewOriginFilter`) continua valendo. Filtro só seleciona cards elegíveis:
  não altera FSRS, contagens do Deck (`deckCountsForReview` ignora o filtro) nem
  `deck_id`. UI: chips no painel "Configurar sessão" (universo = Review geral
  sem o próprio filtro; tags já selecionadas ficam visíveis para poder limpar),
  botão Limpar, aviso em "Meus Decks" quando o filtro está ativo. Cards da
  trilha (sem tags) só passam com o filtro vazio.
- **Anki**: import normaliza, respeita limites e avisa; export leva as tags da
  Note (uma vez por nota, sem tags de direção; trilha continua `unidadeN`);
  round-trip testado. **Cópias** (arquivo/link, perfil público): as tags viajam
  como valor, sem vínculo vivo; `get_public_flashcards` passou a devolver `tags`.
- **Futuro (não implementado)**: Panel de gerenciamento global (renomear/excluir
  Tag em todas as Notes) -- a estrutura atual permite. **Public Cards**: a cópia
  deverá preservar as tags públicas e receber a tag permanente não removível
  `criado-por-[username]` (username imutável, nunca display name); ponto de
  integração: `nativeNoteEditorStateFromImportPayload` (cópia de perfil público) +
  o editor de tags (marcar a tag de autoria como não removível).

Testes versionados em `tests/fase-i/`: `test_tags_unit.js` (Node/VM, 67),
`test_playwright.js` (FR+ZH, 64), `test_supabase_real.sql` (Postgres real,
transação + ROLLBACK, 19/19, zero resíduo). Harness da Fase E ganhou as funções
do filtro de tag.

## Fase J -- Painel de Tags (2026-09-30)

Gerenciamento global de Tags (listar, renomear, excluir) sobre a arquitetura da
Fase I, **sem tabela `tags`, sem coluna nova, sem índice**. Migration **057**
(aplicada ao vivo): 3 RPCs **SECURITY INVOKER** + 1 helper imutável -- a RLS
existente continua a autoridade; nenhum bypass; `revoke` de `anon`.

- **Armazenamento**: Tags seguem `tags text[]` em `own_flashcards` /
  `teacher_flashcards` (048/056). Não existe entidade Tag.
- **"Global" = global dentro do universo de PROPRIEDADE** (independe de idioma,
  Deck e CardInstance). Dois universos, nunca cruzados:
  - **Aluna/usuária** (`scope='own'`, `owner_id = auth.uid()`): gerencia só as
    Tags de `own_flashcards`. Tags de Teacher Cards NÃO aparecem no gerenciador e
    continuam somente leitura (visíveis/filtráveis no Review). Uma mesma string
    em `own` e em Teacher Card é a mesma string só para o FILTRO do Review, não
    para o gerenciamento (renomear a dela não altera a da professora).
  - **Professora/admin** (`scope='teacher'`, `teacher_id = auth.uid()`): todos os
    Teacher Cards dela, todos os alunos e idiomas, numa única operação (não
    escolhe aluno). Escrita de `teacher_flashcards` segue admin-only (RLS 026):
    uma professora não-admin atinge 0 linhas.
- **RPCs** (`shared/supabase_migrations/057_note_tag_management_rpcs.sql`):
  `list_note_tags(scope)` → (tag, notas); `rename_note_tag(scope, old, new)` →
  `{affected, merged, unchanged}`; `delete_note_tag(scope, tag)` → `{affected}`.
  Um `UPDATE` atômico por chamada (tudo ou nada, verificado com erro forçado no
  meio). Igualdade EXATA do slug (nunca LIKE/substring). Os slugs chegam já
  normalizados pelo cliente (`normalizeNoteTags`/`validateNoteTags`, única
  normalização); o servidor só valida o formato canônico e os 50 caracteres. O
  CHECK 20/50 (056) continua valendo. Notes arquivadas também são renomeadas.
- **Rename com fusão** (decisão de produto fechada): se a Note já tem o destino,
  fica UMA ocorrência, na posição da 1ª ocorrência; ordem das demais preservada;
  nunca duplicata. A UI avisa antes ("N notas já usam #destino; serão
  unificadas") e não bloqueia. Slug normalizado igual ao antigo = nenhuma
  alteração (sem RPC).
- **Delete**: `array_remove` da Tag exata; confirmação mostra nome, nº de notas e
  que é irreversível/global no escopo.
- **Só `tags` muda**: não altera `revision`, `deck_id`, `fields`, `status`, IDs,
  Card Type, direção, FSRS nem histórico. **Não reutiliza o editor** (no editor,
  mudar Tag conta como conteúdo e incrementa `revision`; o Painel é metadata).
- **`reviewTagFilter`**: após rename/delete (scope `own`) o cliente atualiza
  `STATE.cards` (origem `self`) e reescreve/limpa o filtro salvo via
  `updateStudySetting` (rename troca o slug; delete o remove; fusão deduplica).
  Scope `teacher` não altera o filtro da conta da professora. Outra sessão/aparelho
  não é sincronizada em tempo real: o filtro antigo continua visível e removível
  (`renderReviewTagFilter` mostra selecionadas + disponíveis), então nunca fica
  preso.
- **UI**: aluna -- seção "🏷️ Gerenciar tags" em **Meus Cartões**; professora --
  aba "🏷️ Tags" no **Painel de Admin** (`shared/tag-manager.js`, reutiliza
  `.admin-badge-row`/`.pill`/`.profile-edit-*`, zero CSS novo). Rename inline com
  pré-visualização do slug, contagem e colisão; delete com confirmação inline;
  loading/vazio/erro (com "tentar de novo")/sucesso; duplo clique = 1 RPC.
- **Fora do escopo (futuro)**: `criado-por-[username]` será Tag de **sistema**
  (não renomeável, não removível pelo receptor) e chega junto de **Public
  Cards** -- o Painel ainda não tem conceito de Tag protegida; quando existir,
  basta filtrar/bloquear esse prefixo na lista e nas RPCs. Sem hierarquia,
  aliases, histórico de renomeações, índice GIN (só se a escala pedir) nem
  contagem por idioma/Deck no Painel.
- **Limitações registradas**: o Painel da professora só lista o que a RLS admin
  permite (professora não-admin não escreve); vínculo inativo não bloqueia
  rename (o trigger só barra mudança de `deck_id`); após renomear na aluna, a
  view de Meus Cartões é re-renderizada (rascunho do formulário de criação é
  descartado).

Testes versionados em `tests/fase-j/`: `test_tag_manager_unit.js` (85),
`test_supabase_real.sql` (Postgres real, um `DO` que termina em
`RAISE EXCEPTION 'RESULTS: ...'` → rollback automático, 58 cenários ok, zero
resíduo), `test_playwright.js` (FR+ZH, 76). Regressão E/F/G/H/I (unit e
Playwright) verde.

## Fase J -- hardening final (2026-09-30): nenhuma alteração de RPC

- **Vínculo inativo**: a 055 exige vínculo ativo só para INSERT de Teacher Card e para UPDATE que muda `deck_id` para um Deck; edição de conteúdo de cartão histórico é deliberadamente liberada (o histórico não pode travar). Rename/delete de Tag é edição de metadado (só `tags`), mesma categoria de editar conteúdo, não de criar/mover -- então NÃO se exige vínculo ativo; alterar isso seria regra nova por analogia. Provado em SQL real (`tests/fase-j/test_inactive_link.sql`, 4/4, rollback): com vínculo `removed`, rename/delete atingem o card sem tocar id/revision/deck_id/fields/status; criar card segue bloqueado (42501).
- **Permissão da professora**: `teacher_flashcards_admin_write` (026) é decisão intencional ("escrita só para a administração", padrão 023/025), reafirmada em toda a feature; ownership é `teacher_id` (filtro das RPCs). Não-admin atinge 0 linhas por desenho. Preservado; sem mudança de RLS.

## Fase K1 -- Review Core: estados, fila e contagens (2026-09-30)

- **Causa raiz**: `applyMemoryGrade` grade 0 ("Errei") forçava `state='new'` e zerava stability/difficulty/fsrsReps/fsrsLapses, mas mantinha `reps>0`. A fila (`getStudyQueue`) tratava esse card como devido (`reps>0`), a contagem de Deck (`bucketCardState`) como New (`state`) e `newCards()` (`reps===0&&due===0`) como não-New: três classificações divergentes.
- **Semântica final**: **New** = cartão SEM histórico (`reps===0` e state new/ausente). **Learning** = `learning` + `relearning` (sem 4ª categoria). **Review** = `review` (na contagem, só os vencidos, via `cardsDueNow`). "Errei" usa `scheduleReview(grade 1)`: novo -> `learning`; já estudado -> `relearning`; stability/difficulty pelas fórmulas de lapso do FSRS (não zeradas), fsrsReps/fsrsLapses e reps/lapses acumulam. Regra de produto mantida (PR #219): due de "Errei" = meia-noite seguinte (`previewNextIntervalDays` já espelha).
- **Fonte única**: `cardStudyBucket(card)` (`shared/srs.js`) é usada por `newCards`, `getStudyQueue` (devidos = não-New vencidos), `reviewFilterQueue` (ordenação `oldest`) e `bucketCardState` (`shared/deck-engine.js`). Save antigo com `state='new'` e `reps>0` (Errei da versão anterior) conta como Learning, sem migration. "Errei" não consome a cota `newCardsPerDay`.
- **Contagens de Deck são estruturais**: não respeitam `reviewOriginFilter`, `reviewTagFilter` nem filtros de sessão; a contagem da sessão pode diferir (coberto em teste).
- Testes: `tests/fase-k1/` (unit 86, Playwright FR+ZH 24). Sem migration.
- **K1 hardening**: o Playwright de "Errei" agora clica o botão real (`#flashcard .flashcard-hint` para revelar, depois `.grade-btn.grade-again[data-grade="0"]`), sem fallback a `gradeCurrentCard(0)`; falha se o botão não existir. Due de "Errei" = meia-noite seguinte é regra de scheduling deliberadamente preservada (PR #219), comentada em `shared/fsrs.js`; preview do botão, due real e teste usam a mesma regra.

## Fonte de verdade de arquitetura: Decks, Tags, Painel e Sistema de Estudo

O documento "Arquitetura Total -- Decks, Tags, Painel e Sistema de Estudo" (2026-09-27, 40 seções,
enviado pela autora) está versionado em **`docs/arquitetura-total-decks-tags-painel.md`**. É a fonte de
verdade para Decks, Tags, Painel, Review, Anki, Decks públicos, atribuição, limite Free por CardInstance e
as 30 invariantes (seção 38). Ler esse arquivo ANTES de auditar ou implementar qualquer coisa nessa área;
não substituir o contrato por uma solução conveniente no código atual. A auditoria
`docs/public-decks-auditoria.md` foi escrita sem este arquivo e precisa ser revisada contra ele (ex.: a
atribuição é a Tag permanente `criado-por-[username]`; importar Deck público é Premium; limite Free corta
e informa; só Decks dentro de Meus Decks são públicos; Deck público tem ícone/cor, sem upload).


