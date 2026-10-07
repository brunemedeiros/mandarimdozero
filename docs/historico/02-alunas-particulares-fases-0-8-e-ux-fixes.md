# Histórico: Sistema de alunas particulares (Fases 0-8) e UX-fixes do admin

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Sistema de alunas particulares + conteúdo personalizado -- Fase 0/1 (2026-09-19/20)

Feature nova, grande, entregue em fases travadas por autorização explícita
da autora a cada etapa (não pular fase, não implementar funcionalidade de
fase futura adiantado). Princípio arquitetural central, definido no
prompt-mestre que abriu esta feature e que continua valendo pra todas as
fases futuras (flashcards de professora, criação de cartão pela própria
aluna, histórico de aula etc.): **uma só biblioteca de flashcards por
aluna, um só motor de revisão/memória** -- nunca construir um sistema de
revisão paralelo pra cartão de trilha vs. cartão de professora vs. cartão
próprio. "Origem" do cartão (`study`/`teacher`/`self`) é sempre metadado
de UM sistema, nunca vira sistema novo. Distinguir DONO do cartão
(biblioteca de quem) de ORIGEM (quem criou/recomendou) desde o desenho.

**Fase 0 (auditoria, só leitura, já concluída antes desta entrega)**
mapeou a arquitetura atual do app e identificou o bloqueio real pra
flashcards de professora existir no futuro: `STATE.cards` hoje NÃO é uma
entidade independente -- é reconstruído do zero a partir de `content.js`
(`UNITS`) a cada carregamento via `buildCardsFromUnits()`, com esquema de
id `u${unitId}-v${idx}`; `applySerializedState()` descarta silenciosamente
qualquer cartão salvo cujo id não bate mais com essa reconstrução. Isso
significa que um cartão "solto" (atribuído por uma professora, sem
unidade/índice correspondente em `content.js`) simplesmente desapareceria
do estado salvo hoje -- é o problema real que a Fase 2 (flashcards) vai
ter que resolver, registrado aqui pra não virar surpresa nessa hora.

**Fase 1 (modelo de dados aluna/papel, esta entrega) -- o que foi feito:**

- **Migration `024_add_role_to_profiles.sql`** -- coluna `profiles.role
  text not null default 'student' check (role in ('student', 'teacher',
  'admin'))`, aditiva/sem risco. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` (não
  é passo manual pendente pra autora). A mesma migration promove pra
  `role = 'admin'` a conta cujo e-mail é `brunemed1310@gmail.com` (a
  única `role` !== `'student'` hoje). Confirmado ao vivo: 1 admin, 21
  alunas.
- **Migration `025_create_teacher_students_table.sql`** -- tabela nova
  `teacher_students` (`teacher_id`, `student_id` -- ambos `auth.users`,
  `language_app_key` obrigatório em `('frances','mandarim','portugues')`,
  `status` em `('active','invited','removed')`, `unique(teacher_id,
  student_id, language_app_key)`), RLS com policies de leitura pra
  professora e pra aluna (cada uma só vê seus próprios vínculos) e de
  escrita só pro e-mail admin (mesmo padrão de `023`). Aplicada AO VIVO
  via MCP na mesma sessão -- não é passo manual pendente.
  `language_app_key` é obrigatório (não um vínculo "geral" de conta)
  porque a autora confirmou explicitamente: **"cada aluno vale para
  apenas 1 idioma"** -- ela pode ter uma Sandra de francês e uma Sandra de
  chinês como duas alunas DIFERENTES, cada vínculo escopado a um idioma.
- **`'portugues'` já é um valor aceito no enum de `language_app_key`**,
  decisão explícita da autora (via `AskUserQuestion`, opção "só o schema
  fica pronto"): ela é professora de Francês e de Português para
  Estrangeiros hoje, o Português ainda não existe como idioma no site.
  Isso é PURAMENTE de schema -- `languages/index.js` (`AVAILABLE_LANGUAGES`)
  não ganhou nenhuma entrada nova, nem "em breve"/desabilitada; zero
  mudança visual em qualquer lugar do site pra aluna/visitante comum.
  Só a tela nova de admin (`shared/admin-students.js`,
  `STUDENT_LANGUAGE_LABELS`) já lista "Português (em breve)" como opção
  de atribuição -- é justamente o "anexar a possibilidade" que a autora
  pediu, sem prometer um curso que ainda não existe.
- **`shared/roles.js`** (novo) -- só LÊ o papel novo, não substitui
  `isAdminUser()` em nenhum call site existente (decisão explícita, fora
  do escopo desta fase): `fetchMyRole()` (usa o `select('*')` que
  `ensureProfileLoaded()` já fazia, sem round-trip extra),
  `isTeacherOrAdmin()`, `fetchMyStudents()` (join manual em JS entre
  `teacher_students` e `profiles`, mesmo padrão de
  `fetchAllGrantsWithUsernames()` em `admin-badges.js`),
  `assignStudentToTeacher(username, languageAppKey)` (resolve @username
  via `resolveProfileByUsername()` reaproveitado de `admin-badges.js`,
  rejeita auto-atribuição, trata violação de unicidade -- `error.code ===
  '23505'` -- como "já é sua aluna nesse idioma" em vez de erro genérico),
  `removeStudentLink(linkId)` (delete simples -- ver nota abaixo sobre o
  que isso NÃO apaga).
- **`shared/admin-students.js`** (novo) + nova subseção "🎓 Alunos" no
  Painel de Admin (`fr/index.html`+`zh/index.html`, `#admin-students-content`,
  fiado em `switchAdminPanelSection()` de `shared/admin-analytics.js`,
  mesmo padrão de toggle das outras 4 subseções -- badges/analytics/
  notificações/reports). Form "Vincular aluna" (username com
  `<datalist>` de autocomplete + select de idioma) + lista "Suas alunas
  (N)" com botão de remover por vínculo. Gate-check de `isAdminUser()`
  no topo de `renderAdminStudentsView()`, mesmo padrão de toda tela de
  admin existente.

**Decisões arquiteturais tomadas nesta fase:**
1. Papel (`profiles.role`) é uma peça de dado NOVA e SEPARADA da
   identidade admin atual (`isAdminUser()`, e-mail hardcoded) -- nenhum
   call site existente foi migrado pra ler `role` em vez do e-mail. Os
   dois vão conviver até uma fase futura explícita decidir unificar (fora
   do escopo desta entrega, não decidido ainda).
2. Vínculo professora-aluna mora em tabela própria (`teacher_students`),
   não em coluna solta em `profiles` (ex: `profiles.teacher_id`) -- deixa
   aberto pra um dia uma aluna ter mais de uma professora, sem migração
   de schema nova quando isso acontecer.
3. `remover vínculo` (`removeStudentLink`) é `delete` na linha de
   `teacher_students` -- NÃO apaga nada de `profiles`/`progress` da
   aluna, nem histórico dela em nenhuma tabela. A aluna só some da lista
   "Suas alunas" da professora; o progresso dela continua intacto (regra
   geral do prompt-mestre desta feature: nunca apagar histórico/dado ao
   remover associação). O texto de confirmação no `confirm()` já deixa
   isso explícito pra autora no momento do clique.
4. Nenhuma tela nova é alcançável por conta comum -- só o Painel de Admin
   (que já é 100% gate-checked por `isAdminUser()`) ganhou a subseção
   nova. Uma aluna sendo vinculada não ganha nenhuma UI nova ainda (isso
   é fase futura -- ela nem fica sabendo que foi vinculada, por design
   desta fase específica).

**Gratuito x Premium (avaliado, não implementado):** feature inteira hoje
é ferramenta de gestão pra própria autora (professora/admin) sobre suas
próprias alunas -- não há conceito de "aluna paga por isso" nesta fase.
A pergunta relevante fica pra quando a Fase 2+ (flashcards de professora)
entrar: cada professora poder gerenciar SUAS PRÓPRIAS alunas é plano
core do produto (a autora É a professora), então não faz sentido premium
nesta ponta; o que pode virar premium mais adiante é limite de nº de
alunas simultâneas por professora, se a plataforma um dia tiver mais de
uma professora usando o sistema -- não travado em código, só registrado
aqui como pergunta em aberto pro dia em que isso for relevante.

**Testes realizados:** `node --check` em todos os arquivos JS tocados
(sem erro de sintaxe); suíte de regressão de respostas (11+31 testes)
sem quebras (não exercita este código, mas confirma que nada existente
quebrou). Validação funcional via Playwright (fr+zh) com stub de
`window.supabase.createClient()` (CDN do Supabase é bloqueado pelo proxy
de saída deste ambiente sandbox -- ver padrão já registrado em sessões
anteriores) simulando uma sessão logada como a conta admin: confirmado
`isAdminUser()===true`, `fetchMyRole()==='admin'`,
`isTeacherOrAdmin()===true`, `fetchMyStudents()` retorna o vínculo
semeado corretamente, `renderAdminStudentsView()` desenha form + lista,
fluxo de vincular nova aluna funciona (contagem sobe no banco fake e no
DOM), rejeição de duplicata/@username inexistente/auto-atribuição todas
retornam `ok:false` como esperado, fluxo de remover vínculo funciona
(contagem cai no banco fake e no DOM), e o gate de "não-admin" mostra a
mensagem de bloqueio em vez do form. Testado nos dois idiomas (fr/zh),
sem erro de console novo atribuível a este código (o único `pageerror`
capturado durante a validação -- `.is is not a function` -- vem de
`shared/notifications.js`, código pré-existente não tocado por esta
fase, e é uma limitação do mock de teste, não um bug real do app).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma UI de flashcard, revisão ou "cartão atribuído" -- isso é Fase 2.
- Nenhuma mudança em `getStudyQueue()`, FSRS ou qualquer motor de
  revisão -- Fase 3.
- Nenhum filtro por origem de cartão (`study`/`teacher`/`self`) -- Fase 4.
- Aluna não tem nenhuma tela nova pra ver que foi vinculada a uma
  professora, nem pra ver "minha professora" -- fora do escopo desta
  fase (a tela existe só do lado da professora/admin).
- `fake_supabase.js`: o histórico de tarefas de sessões anteriores
  registrado no ambiente menciona esse arquivo várias vezes (ex.
  "Perfil 7.4: Update fake_supabase.js mock", "AdminMode 5: fake_supabase.js
  mock default admin_mode:true"), mas uma busca (`grep -rl
  "fake_supabase"`) neste checkout real do repositório não encontra
  nenhuma ocorrência -- o arquivo não existe aqui. Não recriei/inventei
  esse arquivo; a validação desta fase usou um stub Playwright ad-hoc em
  vez disso (ver "Testes realizados" acima). Uma sessão futura que
  encontrar essa mesma discrepância deve considerar isso um artefato de
  histórico de tarefas de sessões anteriores não aplicável a este
  checkout, não recriar o arquivo às cegas.

Próxima fase (2 -- flashcards) só começa depois de autorização explícita
da autora, com o relatório acima já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-20), "Pode seguir para a
fase 1" seguida depois por "Sim, e depois passe pra próxima fase" (após
aprovar abrir/mergear os PRs da Fase 1 e de um fix de streak em
paralelo).**

## Fase 2 (flashcards autorados por professora) -- só o modelo de dados + autoria, sem revisão ainda

**Escopo explicitamente restrito**, mesmo princípio de todas as fases
anteriores desta feature: Fase 2 no prompt-mestre é "flashcards", Fase 3
é "integração com revisão" -- são fases SEPARADAS de propósito. Esta
entrega cobre só a professora poder AUTORAR um cartão e atribuí-lo a uma
aluna específica; o cartão criado aqui **não entra em `STATE.cards`, não
participa de `getStudyQueue()`/FSRS, e a aluna não tem nenhuma tela que
leia isto ainda** -- isso é explicitamente Fase 3, ainda não iniciada.

**O bloqueio identificado na Fase 0** (`STATE.cards` reconstruído do zero
via `buildCardsFromUnits()` a cada carregamento; `applySerializedState()`
só faz `Object.assign` nos cartões que já existem nessa lista fresca,
então um cartão salvo sem correspondência em `content.js` é descartado
silenciosamente -- confirmado lendo o código de novo nesta fase,
`fr/app.js` linha ~813) **continua sem solução nesta entrega, de
propósito** -- resolver isso é justamente o primeiro passo da Fase 3
(fazer os cartões desta tabela sobreviverem ao ciclo save/load), não
desta.

**O que foi feito:**

- **Migration `026_create_teacher_flashcards_table.sql`** -- tabela
  `teacher_flashcards` (`teacher_id`, `student_id`, `language_app_key`
  -- mesmo par que `teacher_students` já usa --, `front`, `back_trans`,
  `note` opcional, `status` em `('active','archived')`). RLS: professora
  lê o que ela criou, aluna lê o que foi atribuído a ela (schema já
  pronto pra Fase 3 poder ler do lado da aluna, mesmo sem nenhuma tela
  hoje), escrita só pra administração (mesmo padrão de `023`/`025`).
  Aplicada AO VIVO nesta sessão via `mcp__Supabase__apply_migration` --
  não é passo manual pendente.
- **`status:'archived'` em vez de delete físico** -- mesmo princípio
  geral do prompt-mestre ("nunca apagar histórico/dado ao remover
  associação"), aplicado por precaução aqui: quando a Fase 3 ligar isto
  à revisão, um cartão arquivado não deveria levar embora nenhum estado
  de memória que a aluna já tenha acumulado nele.
- **`shared/teacher-flashcards.js`** (novo) -- `fetchFlashcardsForStudent`,
  `createFlashcard` (valida front/back não-vazios antes de gravar),
  `setFlashcardStatus` (usado tanto pra arquivar quanto pra reativar).
- **`shared/admin-flashcards.js`** (novo) + nova subseção "📇 Flashcards"
  no Painel de Admin (fr+zh), ao lado de "🎓 Alunos": select de aluna
  (populado por `fetchMyStudents()`, já existente da Fase 1) + form de
  criar cartão (frente/verso/nota opcional) + lista de cartões ativos e
  arquivados, com botão de arquivar/reativar por cartão. Reaproveita as
  mesmas classes CSS de `admin-students.js` (`admin-badge-row` etc.) --
  zero CSS novo.

**Decisões arquiteturais tomadas nesta fase:**
1. `languageAppKey` do cartão vem do vínculo já existente em
   `teacher_students` (a aluna selecionada), não é escolhido de novo no
   form -- consistente com "cada aluna vale pra 1 idioma" (Fase 1).
2. Tela de admin exige que já exista pelo menos uma aluna vinculada
   (aponta pra aba "🎓 Alunos" se não houver nenhuma) -- não duplica
   nenhuma lógica de vínculo aqui, só consome `fetchMyStudents()`.
3. Card "pertence" à aluna (biblioteca dela, quando a Fase 3 existir) mas
   tem ORIGEM na professora -- distinção já registrada no topo desta
   seção do CLAUDE.md, mantida consistente: `teacher_flashcards` é
   metadado de origem, não um sistema de revisão paralelo (que nunca vai
   existir, por princípio arquitetural central desta feature).

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão da
Fase 1 -- ferramenta de gestão da própria professora/admin sobre suas
próprias alunas, sem conceito de cobrança nesta ponta. Fica a mesma
pergunta em aberto pra quando existir mais de uma professora na
plataforma (ex: limite de cartões/alunas simultâneas por professora no
plano gratuito) -- não travado em código.

**Testes realizados:** `node --check` nos arquivos tocados, sem erro.
Validação funcional via Playwright (fr+zh), mesmo padrão de stub de
`window.supabase.createClient()` da Fase 1: seleção de aluna renderiza
corretamente, criação de cartão sobe a contagem no banco fake e no DOM,
rejeição de frente/verso vazio confirmada (`emptyFrontRejected===true`),
arquivar um cartão move ele pra seção "Arquivados" (`status` muda,
re-render reflete), gate de não-admin bloqueia com a mesma mensagem já
usada em "🎓 Alunos". Sem erro de console novo atribuível a este código
(mesmo `pageerror` pré-existente de `shared/notifications.js`/`.is()` já
registrado como limitação do mock na entrega da Fase 1, não bug real).

**O que ainda falta / não foi feito nesta fase (de propósito, é a Fase
3):**
- Cartão criado aqui não aparece em nenhuma tela da aluna, não entra em
  `STATE.cards`, não é revisável (FSRS/`getStudyQueue()`).
- O bloqueio arquitetural da Fase 0 (`applySerializedState()` descarta
  cartão sem correspondência em `content.js`) não foi tocado -- é
  trabalho da Fase 3, não desta.
- Nenhum filtro por origem (`study`/`teacher`/`self`) em nenhuma tela --
  Fase 4.
- Edição de um cartão já criado (só front/back/note, não status) não foi
  implementada -- só criar e arquivar/reativar. Se isso for necessário
  antes da Fase 3, é um adendo pequeno e contido a esta fase, não
  Fase 3 em si.

Próxima fase (3 -- integração com revisão) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-20), no mesmo pedido que
corrigiu o campo @username de "Alunos" pra virar `<select>` -- "Faça o
campo... Em seguida, continue para a fase 3".**

## Fase 3 (integração com revisão) -- resolve o bloqueio da Fase 0, cartão de professora vira revisável de verdade

**Isto é o núcleo arquitetural da feature inteira** -- as fases 0-2 só
prepararam o terreno (auditoria, modelo de dados, autoria). Esta fase
resolve o bloqueio identificado desde a Fase 0 e faz o cartão de
professora entrar no MESMO motor de memória/revisão que a trilha sempre
usou, sem criar um sistema paralelo (princípio central desta feature,
ver topo da seção anterior).

**O bloqueio, resolvido:** `STATE.cards` era reconstruído do zero a cada
carregamento via `buildCardsFromUnits()`, e `applySerializedState()` só
faz `Object.assign` nos cartões que JÁ existem nessa lista fresca --
qualquer cartão salvo sem correspondência era descartado em silêncio. A
fase anterior identificou isso; esta resolve **sem mudar o mecanismo de
merge em si** -- só passa a colocar os cartões de professora na lista
fresca também, antes do merge rodar:

- **`buildCardFromTeacherFlashcard(row)`** (novo, fr/zh `app.js`) --
  constrói um card com o MESMO shape que `buildCardsFromUnits()` produz
  (mesmos campos de FSRS: `ef`/`interval`/`reps`/`due`/`lapses`/
  `stability`/`difficulty`/`state`/`lastReview`/`fsrsReps`/`fsrsLapses`),
  id `t${row.id}` (namespace separado de `u${unitId}-v${idx}`, nunca
  colide), `origin: 'teacher'`, `unitId`/`vocabIdx: null` (não pertence a
  nenhuma unidade), `flashcardStatus` espelhando `status` da linha.
- **`mergeTeacherFlashcardsIntoState()`** (novo) -- busca os flashcards da
  aluna logada (`fetchFlashcardsForCurrentStudent`, novo em
  `shared/teacher-flashcards.js`, RLS já existente desde a migration 026:
  `student_id = auth.uid()`) e empurra pra `STATE.cards`. **Busca TODOS os
  status (ativo E arquivado) de propósito** -- arquivar não pode apagar
  progresso de memória já acumulado, só tirar da fila de revisão (ver
  abaixo). Chamado logo no INÍCIO de `loadStateAndRender()`, ANTES de
  `loadState()` -- exatamente pra que a lista fresca já contenha esses
  ids quando `applySerializedState()` rodar o merge por id. Idempotente
  dentro da sessão (não duplica se chamado 2x).
- **`isCardLessonCompleted(card)`** ganhou um caso à parte pro
  `origin==='teacher'`: em vez do gate de "lição concluída" (que não faz
  sentido pra um cartão que não pertence a nenhuma unidade), a
  elegibilidade é `flashcardStatus === 'active'`. Isso é o único ponto de
  checagem no app inteiro pra "este cartão entra hoje na fila de
  revisão" -- `eligibleReviewPool()`, `getStudyQueue()` e os 4 pontos de
  entrada de revisão (Flashcard/Palavras Difíceis/Speed Review/Combinar)
  já delegam pra cá, então nenhum deles precisou de mudança própria --
  a arquitetura de seleção centralizada da Fase 4 do projeto de motor de
  memória (ver seção "Fase4.1: projetar getStudyQueue() central" no
  histórico) já pagava esse dividendo.
- **Cartão de trilha também ganhou `origin: 'study'`** (antes não tinha
  campo de origem nenhum) -- explícito agora, mesmo princípio "dono x
  origem" travado no topo desta seção do CLAUDE.md.
- **Achado específico do zh, resolvido antes de mesclar**: diferente do
  fr (um único campo `front`), o cartão de revisão do zh exige hanzi e
  pinyin em campos SEPARADOS (`front_pinyin`/`back_hanzi` -- a tela
  sempre mostra os dois juntos, nunca um sozinho). `teacher_flashcards`
  (migration 026) só tinha `front`/`back_trans`/`note` -- suficiente pro
  fr, mas um cartão de mandarim sem pinyin mostraria a string literal
  "undefined" onde o pinyin deveria estar. **Migration
  `027_add_pinyin_to_teacher_flashcards.sql`** -- coluna opcional
  `front_pinyin`, aditiva/sem risco, aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` (não é passo manual pendente). UI de
  admin (`shared/admin-flashcards.js`) mostra o campo "Pinyin" só quando
  a aluna selecionada é de mandarim (progressive disclosure -- zero
  mudança visual pra quem só cria cartão de francês).

**Decisões arquiteturais tomadas nesta fase:**
1. Card arquivado continua em `STATE.cards` (nunca removido) -- só sai da
   fila de revisão. Preserva qualquer progresso de memória (`stability`/
   `reps`/etc.) que a aluna já tenha acumulado nele, caso a professora
   reative depois. Sem isso, arquivar apagaria dado histórico do próximo
   save -- contra a regra geral desta feature ("nunca apagar histórico/
   dado ao remover associação").
2. Nenhum `getStudyQueue()`/FSRS precisou de mudança -- só
   `isCardLessonCompleted()` (o único filtro que já existia especificamente
   pra "cartão pertence a uma unidade") ganhou o caso `origin==='teacher'`.
   Confirma que a arquitetura "um motor, uma fila central" das fases
   anteriores realmente absorve uma origem nova sem duplicar lógica --
   era a aposta arquitetural do prompt-mestre, validada na prática agora.
3. `unitTitle: 'Da sua professora'` (em vez de deixar `undefined`) --
   único texto novo visível pra aluna nesta fase: o "flashcard-tag" que já
   existia (mostra o nome da unidade em todo cartão de trilha) agora
   mostra essa string pro cartão de professora. Não é um filtro por
   origem (isso é Fase 4) -- é só o mesmo espaço de UI já preenchido com
   um valor que faz sentido em vez de vazar `undefined` pra tela.
4. `buildSpeedOptions()` (distratores de múltipla escolha do Speed
   Review) já tinha fallback pra quando a "unidade" de um cartão não tem
   3 outras cartas (`c.unitId === card.unitId` -- pra cartões de
   professora, todos compartilham `unitId: null`, então esse agrupamento
   os trata como "mesma unidade" entre si, com fallback pra
   `eligibleReviewPool()` geral quando insuficientes) -- não precisou de
   nenhuma mudança, o fallback já existente cobre o caso.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
Fases 1/2 -- o cartão em si é conteúdo autorado pela própria professora,
sem custo marginal de servir; a pergunta de premium continua em aberto
pra quando houver mais de uma professora na plataforma (ex: limite de
cartões ativos simultâneos), não travada em código.

**Testes realizados:** `node --check` sem erro nos arquivos tocados.
Validação funcional via Playwright (fr+zh), login como CONTA ALUNA
(diferente das fases anteriores, que validavam do lado admin) com
`teacher_flashcards` semeado (1 ativo + 1 arquivado no fr, 1 ativo com
pinyin no zh): confirmado `STATE.cards` ganha os cartões corretos
(`origin:'teacher'`, `flashcardStatus` espelhando o status),
`isCardLessonCompleted()` retorna `true` pro ativo e `false` pro
arquivado, `eligibleReviewPool()` inclui o ativo e exclui o arquivado,
`getStudyQueue(scope:'due')` inclui o cartão ativo (fila central
funciona ponta a ponta), cartão de trilha confirmado com `origin:'study'`.
Validação adicional só no fr: sessão de revisão real
(`startReviewSession()`/`renderReviewView()`) renderizada de ponta a
ponta pro cartão de professora -- tag "Da sua professora", frente "la
bibliothèque" com botão de áudio, verso "a biblioteca" após virar o
cartão, sem nenhum "undefined" na tela e sem erro de console novo
atribuível a este código (os `pageerror`/`insert`/`upsert`/`.is` vistos
nos logs são limitações do mock minimalista deste teste em chamadas de
fundo não relacionadas -- analytics/badges/notificações -- mesmo padrão
já registrado nas fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum filtro por origem (`study`/`teacher`/`self`) em nenhuma tela --
  isso é Fase 4 explicitamente. A aluna vê o cartão de professora
  misturado com os de trilha na mesma fila, sem indicação visual além da
  tag "Da sua professora" já existente no espaço que todo cartão usa.
- A aluna ainda não tem NENHUMA tela dedicada pra ver "meus cartões da
  professora" separadamente, nem sabe que foi vinculada a uma professora
  -- só vê os cartões aparecendo naturalmente na revisão normal.
- Edição de um cartão já criado pela professora não foi implementada
  nesta fase nem na anterior (só criar/arquivar/reativar).

Próxima fase (4 -- filtros por origem) só começa depois de autorização
explícita da autora, com este relatório já entregue antes de pedir luz
verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 4".**

## Fase 4 (filtro por origem) -- aluna pode escolher revisar só trilha ou só cartões da professora

**Escopo**: filtro puramente de UI/seleção, sem migração nenhuma --
`origin` já existia em todo cartão desde a Fase 3. A ideia é simples:
deixar a aluna escolher, na tela Revisão, se quer ver TODOS os cartões
(padrão), só os DA TRILHA, ou só os DA PROFESSORA.

**Onde entrou:** `eligibleReviewPool()` -- o único pool base que toda tela
de revisão/prática já usava (Flashcard, Palavras Difíceis, Speed Review,
Combinar, hero widget "Revisões pendentes", mode-select) -- ganhou mais um
`.filter()` (`matchesReviewOriginFilter`), na frente de
`STATE.studySettings.reviewOriginFilter` (`'all'` padrão | `'study'` |
`'teacher'`). Como era o único pool que todo mundo já usava (herança das
Fases 4/7 do projeto de motor de memória, ver histórico), bastou mexer
num lugar só pro filtro valer em toda tela -- mesma vitória arquitetural
já registrada como "aposta validada" na entrega da Fase 3.

**Achado durante a implementação, corrigido antes de finalizar:**
`startReviewSession()` (a função que de fato monta a fila jogada na tela
de Flashcard) tinha sua PRÓPRIA cópia inline do filtro
(`STATE.cards.filter(isCardLessonCompleted)`), sem passar por
`eligibleReviewPool()`. Se eu só tivesse mexido em `eligibleReviewPool()`,
o painel de configurações mostraria contagens filtradas corretamente mas
a sessão de revisão de verdade ignoraria o filtro -- a prévia mentiria
sobre o que a aluna ia receber. Corrigido trocando essa cópia por
`eligibleReviewPool()` também (só no ramo de revisão geral -- estudar
uma unidade específica da trilha, `STATE.reviewSessionUnitFilter`,
continua fora do filtro de origem de propósito: cartão de professora
nunca pertence a uma unidade mesmo, então nunca entraria ali de
qualquer forma).

**UI**: novo `<select id="review-origin-select">` no painel "⚙️
Configurar sessão" (mesmo painel de Filtro de fila/Frequência/Palavras
novas/Intensidade), com contagem entre parênteses em cada opção (mesmo
padrão do filtro de fila existente). **Só aparece pra quem TEM pelo
menos um cartão de origem `'teacher'`** (`review-origin-select-wrap`
com `hidden` controlado em `renderReviewSettingsView()`) -- pra
99%+ das alunas (sem professora vinculada ainda) esse controle seria
ruído puro, uma escolha sem nenhum efeito. Replicado fr+zh, mesma
estrutura de HTML/JS nos dois.

**Decisões arquiteturais tomadas nesta fase:**
1. Filtro é um `STATE.studySettings` normal (mesmo padrão de
   `reviewFilter`/`reviewFrequency`/etc.) -- persiste em
   `serializeState()`/`applySerializedState()` sem nenhuma mudança
   nelas (já serializam `studySettings` inteiro).
2. `matchesReviewOriginFilter()` é função própria (não inline dentro de
   `eligibleReviewPool()`) só pra manter o padrão de nomear cada
   critério de filtro isoladamente, mesmo espírito de
   `isCardLessonCompleted()`.
3. Contagens do filtro de fila (Todas/Mais difíceis primeiro/Mais
   antigas primeiro) dentro do painel de config JÁ herdam o filtro de
   origem automaticamente, porque todas elas partem de
   `eligibleReviewPool()` -- não precisou de nenhum ajuste adicional
   pra manter os dois filtros consistentes entre si.

**Gratuito x Premium (avaliado, não implementado):** filtro de
visualização puro, sem custo marginal -- mesma conclusão das fases
anteriores, nenhuma razão pra diferenciar por plano.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh), 2
cenários por idioma -- aluna COM cartão de professora e aluna SEM
nenhum: confirmado que o `<select>` fica oculto quando não há cartão de
professora (`originWrapHidden===true`) e visível com as 3 opções
corretas quando há (`"Todas (N)"`/`"Da trilha (N)"`/`"Da professora
(N)"`); filtrar por `'teacher'` retorna só cartões `origin==='teacher'`,
filtrar por `'study'` só `origin==='study'`, e a soma dos dois bate com
o total sem filtro (`sumMatches===true`); confirmado que
`startReviewSession()` (não só `eligibleReviewPool()`) respeita o
filtro -- a fila de revisão de verdade só contém cartões de professora
quando o filtro está em `'teacher'`. Sem erro de console novo atribuível
a este código (mesmo `pageerror` pré-existente de
`shared/notifications.js`/`.is()` já registrado nas fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma indicação de origem fora da tela de Revisão -- "Suas palavras"
  (fracas/medianas/fortes) e outros widgets continuam agregando as duas
  origens juntas, sem quebra por origem. Não foi pedido nesta fase.
- Filtro por origem só existe pra REVISÃO -- não afeta "Trilha"/Estudo
  normal (que nunca mostra cartão de professora mesmo, só vocabulário de
  unidade).
- Aluna continua sem nenhuma tela dedicada "meus cartões da professora"
  fora da fila de revisão normal -- a única forma de isolar é usar este
  filtro, não existe uma lista/galeria separada.

Próxima fase (5 -- criação de cartão pela própria aluna) só começa
depois de autorização explícita da autora, com este relatório já
entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 5".**

## Fase 5 (criação de cartão pela própria aluna) -- terceira origem no mesmo motor, "Meus Cartões" pra toda conta

**Escopo**: dar à ALUNA (qualquer conta logada, não só quem tem professora
vinculada) a possibilidade de autorar seus próprios flashcards -- palavras/
frases que ela quer memorizar mesmo que não estejam na trilha nem tenham
sido atribuídas por uma professora. Mesmo princípio arquitetural central de
toda a feature (topo da seção "Sistema de alunas particulares" acima): uma
terceira origem (`origin: 'self'`) no MESMO motor de cartão/revisão, nunca
um sistema paralelo -- irmã de `origin: 'teacher'` (Fase 2/3), não uma
reinvenção.

**O que foi feito:**

- **Migration `028_create_student_flashcards_table.sql`** -- tabela nova
  `student_flashcards` (`student_id`, `language_app_key`, `front`,
  `front_pinyin` opcional, `back_trans`, `note` opcional, `status` em
  `('active','archived')`). Diferente de `teacher_flashcards` (escrita só
  admin), aqui quem autora e quem é dona do cartão são a MESMA pessoa --
  RLS de uma linha só (`student_flashcards_owner_all`, `for all using/with
  check auth.uid() = student_id`), sem distinção leitura/escrita
  professora/aluna. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/student-flashcards.js`** (novo) -- irmão de
  `shared/teacher-flashcards.js`: `fetchMyOwnFlashcards` (todos os status,
  mesmo motivo de `fetchFlashcardsForCurrentStudent` -- preservar progresso
  de memória de cartão arquivado), `createOwnFlashcard` (mesma validação
  front/back não-vazios), `setOwnFlashcardStatus`.
- **`shared/my-flashcards.js`** (novo) -- tela "Meus Cartões"
  (`renderMyFlashcardsView`), irmã de `shared/admin-flashcards.js` mas SEM
  gate de admin e sem seletor de aluna/idioma (o idioma é sempre o do site
  em que a conta está, `APP_KEY` -- a aluna não escolhe pra quem é o
  cartão, é sempre pra ela mesma). Campo Pinyin só aparece quando
  `APP_KEY==='mandarim'` (mesmo padrão progressivo de
  `admin-flashcards.js`). Reaproveita as mesmas classes CSS
  (`admin-badge-row`/`profile-section`) -- zero CSS novo, mesmo padrão já
  usado em `admin-students.js`/`admin-flashcards.js`.
- **Nova entrada "📇 Meus cartões" no menu do avatar** (`#user-menu-dropdown`,
  fr+zh), entre "🏆 Ranking" e "⚙️ Configurações" -- SEM a classe
  `admin-only-nav` (diferente de "🛠️ Painel de Admin" logo abaixo), porque
  é uma feature pra QUALQUER conta, não só professora/admin. Nova
  `<div class="view" id="view-my-flashcards">` (fr+zh `index.html`), aba
  registrada em `tabHandlers` (`shared/tabs.js`/`createTabSwitcher`) como
  `'my-flashcards': renderMyFlashcardsView`.
- **`buildCardFromSelfFlashcard(row)`** (novo, fr/zh `app.js`) -- terceiro
  builder de card, ao lado de `buildCardsFromUnits()` (`origin:'study'`) e
  `buildCardFromTeacherFlashcard()` (`origin:'teacher'`). Mesmo shape
  completo de FSRS, `origin:'self'`, `unitId`/`vocabIdx: null`,
  `unitTitle: 'Meus cartões'`. id `s${row.id}` -- terceiro namespace,
  nunca colide com `u${unitId}-v${idx}` (trilha) nem `t${row.id}`
  (professora, tabela DIFERENTE -- ids numéricos podem coincidir entre as
  duas tabelas sem problema, o prefixo já resolve). No zh, mesmo
  mapeamento hanzi/pinyin separado já usado no cartão de professora
  (`front_pinyin`/`back_hanzi`, `|| ''` pra nunca renderizar "undefined").
- **`mergeSelfFlashcardsIntoState()`** (novo) -- busca os cartões da conta
  logada e mescla em `STATE.cards`, chamada logo depois de
  `mergeTeacherFlashcardsIntoState()` em `loadStateAndRender()`, ANTES de
  `loadState()` -- exatamente o mesmo mecanismo da Fase 3 (o merge por id
  de `applySerializedState()` só preserva progresso de cartão cuja id já
  esteja na lista fresca).
- **`isCardLessonCompleted(card)`** ganhou `origin==='self'` no MESMO
  `if` que já tratava `origin==='teacher'` (`return card.flashcardStatus
  === 'active'`) -- não um `else if` novo, o critério é idêntico pras
  duas origens (nenhuma pertence a unidade, elegibilidade = não estar
  arquivado). Confirma de novo a aposta arquitetural da Fase 3: uma
  origem nova só precisou tocar este ÚNICO ponto de checagem pra
  propagar corretamente a `eligibleReviewPool()`/`getStudyQueue()`/os 4
  pontos de entrada de revisão -- nenhum deles precisou de mudança
  própria.
- **`addSelfFlashcardToState(row)` / `updateSelfFlashcardStatusInState(id,
  status)`** (novos) -- diferença importante em relação à Fase 2/3: lá,
  quem cria/arquiva o cartão de professora é a PROFESSORA (outra sessão
  de navegador, sem `STATE.cards` da aluna carregado ali). Aqui, quem
  cria/arquiva é a PRÓPRIA aluna, na MESMA sessão de navegador que já tem
  `STATE.cards` carregado -- sem essas duas funções, o cartão recém-criado
  só entraria na fila de revisão (ou um arquivamento só sairia dela) no
  PRÓXIMO carregamento do app (`mergeSelfFlashcardsIntoState()` só roda no
  boot), fazendo o toast "já entra na sua fila de revisão" ser uma
  promessa vazia até a aluna recarregar a página. Chamadas direto de
  `shared/my-flashcards.js` depois de `createOwnFlashcard`/
  `setOwnFlashcardStatus` bem-sucedidos.
- **Filtro de origem da Fase 4 estendido pra 3 origens** -- `<option
  value="self">` no `#review-origin-select`, `REVIEW_ORIGIN_LABELS.self =
  'Meus cartões'`. Diferente da Fase 4 original (só 2 origens possíveis
  além de "Todas", sempre mostradas juntas quando `hasTeacherCards`), com
  3 origens possíveis mostrar uma opção sempre-zero seria confuso --
  `renderReviewSettingsView()` agora só inclui `<option value="teacher">`
  quando `hasTeacherCards` e `<option value="self">` quando
  `hasSelfCards`, independentemente uma da outra (uma aluna pode ter só
  cartão próprio, só de professora, os dois, ou nenhum). O wrap
  (`#review-origin-select-wrap`) fica visível se QUALQUER uma das duas
  origens especiais existir. `matchesReviewOriginFilter()` e
  `eligibleReviewPool()` (Fase 4) não precisaram de NENHUMA mudança --
  já eram genéricos (`card.origin === filter`), só passaram a valer pra
  um terceiro valor possível de origem automaticamente.

**Decisões arquiteturais tomadas nesta fase:**
1. `student_flashcards` é tabela PRÓPRIA, não uma extensão de
   `teacher_flashcards` com `teacher_id` nulo -- mantém a distinção clara
   de responsabilidade/RLS (uma tabela é "conteúdo que uma professora dá
   pra uma aluna administrar", a outra é "conteúdo que a aluna administra
   sozinha"), mesmo que o *shape* de card resultante em `STATE.cards`
   seja quase idêntico (reflexo do princípio "dono x origem": tabelas de
   origem podem ser plurais, o motor de revisão que consome o resultado é
   um só).
2. Sem seleção de idioma no formulário de "Meus Cartões" -- diferente do
   form de admin (`admin-flashcards.js`, onde a professora escolhe entre
   várias alunas de idiomas potencialmente diferentes), aqui a conta só
   tem UM idioma relevante no momento: o do site em que está (`APP_KEY`).
   Se a mesma pessoa estuda francês E mandarim (duas contas/perfis
   separados hoje, sem conceito de conta multi-idioma no app), cada
   cartão próprio criado em `fr/` ou `zh/` fica automaticamente escopado
   ao `language_app_key` certo, sem pergunta extra.
3. `addSelfFlashcardToState`/`updateSelfFlashcardStatusInState` só
   existem pro lado "self" (não pro lado "teacher") porque só aqui
   criador e "dona da sessão aberta" são a mesma pessoa -- reforça que
   Fase 2/3 não precisava disso: a professora nunca tem o `STATE.cards`
   da aluna carregado na própria sessão.

**Gratuito x Premium (avaliado, não implementado):** primeira vez nesta
feature em que a pergunta toca uma conta comum diretamente (não só
professora/admin) -- avaliada explicitamente, não pulada. Conclusão: sem
custo marginal de servir (é conteúdo escrito pela própria aluna, mesmo
raciocínio das fases anteriores), então tudo grátis por enquanto faz
sentido como padrão -- mas esta é a primeira peça da feature onde um
LIMITE por conta (ex: nº máximo de cartões próprios simultâneos no plano
gratuito, com um teto maior ou ilimitado no premium) seria uma alavanca de
monetização natural e direta, diferente das fases anteriores (onde o
"produto" ainda era só ferramenta de gestão da professora). Não travado em
código nesta entrega -- fica registrado aqui como a pergunta mais concreta
até agora pra quando a infraestrutura de assinatura (ainda inexistente,
ver seção "Considerar plano gratuito x premium" no topo deste arquivo)
existir de verdade.

**Testes realizados:** `node --check` sem erro em todos os arquivos
tocados/novos. Validação funcional via Playwright (fr+zh), login como
CONTA ALUNA com `student_flashcards` semeado (2 cartões no fr -- 1 ativo +
1 arquivado --, 1 cartão ativo com pinyin no zh): confirmado `STATE.cards`
ganha os cartões corretos (`origin:'self'`, `flashcardStatus` espelhando o
status), `isCardLessonCompleted()` concorda com `flashcardStatus` nos
dois casos. Fluxo de CRIAÇÃO AO VIVO testado de ponta a ponta: preencher o
formulário "Meus Cartões" e submeter sobe a contagem no banco fake E no
DOM, e -- ponto crítico desta fase -- o cartão novo já aparece em
`eligibleReviewPool()` IMEDIATAMENTE, sem precisar recarregar a página
(`addSelfFlashcardToState` confirmado funcionando, não só teórico).
Arquivar via UI confirmado atualizando `status` no banco E
`flashcardStatus` no `STATE.cards` já carregado na mesma sessão
(`updateSelfFlashcardStatusInState`), com o cartão saindo de
`isCardLessonCompleted()`/elegibilidade imediatamente, mesma lógica
"nunca some de `STATE.cards`, só sai da fila" das fases anteriores.
Filtro de origem confirmado mostrando a opção "Meus cartões" (não
"Da professora", que não existia neste cenário) quando só há cartão
próprio, com contagem correta. Testado nos dois idiomas (fr+zh), campo
Pinyin confirmado ausente no fr e presente no zh. Sem erro de console novo
atribuível a este código (mesmos dois `pageerror` pré-existentes de
`shared/notifications.js`/`.is()` e `shared/analytics.js`/`.upsert()` já
registrados como limitação do mock em todas as fases anteriores).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Edição de um cartão próprio já criado (só front/back/note/pinyin, não
  status) não foi implementada -- só criar e arquivar/reativar, mesmo
  escopo que `teacher_flashcards` ficou nas Fases 2/3.
- Nenhum limite de quantidade de cartões próprios por conta -- ver
  "Gratuito x Premium" acima, pergunta em aberto, não travada em código.
  **Resolvido logo em seguida, ver Fase 5.1 abaixo.**
- Filtro por origem (Fase 4) continua só na tela de Revisão -- "Meus
  Cartões" é uma tela de GESTÃO (criar/arquivar), não de revisão em si; a
  aluna revisa o cartão próprio misturado com os outros na fila normal,
  ou isolado via o filtro de origem já existente.
- Fase 6 do prompt-mestre original (supervisão da professora/métricas) e
  Fase 7 (histórico de "Aula") continuam não iniciadas.

## Fase 5.1 (limite de cartões próprios) -- grillada explicitamente, teto pro plano grátis em vez de bloqueio total

A autora pediu, logo após a entrega da Fase 5: "grave no código: criar
cartões próprios é uma feature premium ou de alunos... deve haver algum
ícone/stamp/selo e aviso pop up... ou acha melhor apenas limitar o número
de cartões próprios?" Antes de implementar, grillei 2 perguntas (via
`AskUserQuestion`) porque a resposta óbvia entraria em conflito direto com
a regra "não presumir infraestrutura ativa" (topo deste arquivo): não
existe Stripe/tabela de planos/checagem de tier em nenhum lugar do código
-- nenhuma das 21 contas reais é "premium" hoje, porque não há COMO uma
conta virar premium ainda.

**Perguntas e respostas da autora:**
1. *O que define "aluno" pra esse gate, já que toda conta nasce com
   `role='student'` por padrão?* → **Ter vínculo ativo com uma professora**
   (`teacher_students`, `status='active'`) -- reaproveita dado real já
   existente desde a Fase 1, não um conceito novo.
2. *Como aplicar a parte "premium" agora, sem assinatura real?* → **Só
   limite de quantidade, sem bloqueio total** -- rejeitou a opção de selo
   + popup bloqueando de vez (que, checada explicitamente na pergunta,
   deixaria "Meus Cartões" inutilizável pra praticamente todas as contas
   reais hoje, revertendo na prática o que a Fase 5 acabou de entregar).

**Síntese implementada, combinando as duas respostas:** `FREE_OWN_
FLASHCARD_LIMIT = 20` (`shared/my-flashcards.js`) -- teto de cartões
PRÓPRIOS ATIVOS pro plano grátis (a maioria das contas hoje). Uma aluna
com vínculo ativo com QUALQUER professora (`hasActiveTeacherLink()`, novo
em `shared/roles.js`, checa `teacher_students` onde `student_id=auth.uid()`
e `status='active'`) fica ISENTA do teto -- cartões ilimitados. Nenhuma
conta é bloqueada de usar a feature; só quem não tem vínculo e já criou 20
cartões ativos não consegue criar o 21º até arquivar algum ou vincular com
uma professora.

**O que foi feito:**

- **`hasActiveTeacherLink()`** (novo, `shared/roles.js`) -- único ponto de
  checagem pra "esta conta está isenta do teto". Eixo DIFERENTE de
  `fetchMyRole()`/`isTeacherOrAdmin()` (aqueles leem `profiles.role`; este
  lê o vínculo em `teacher_students` do lado da aluna).
- **Selo de tier** (não "premium" -- só comunica o que já é real hoje):
  `renderMyFlashcardsView()` mostra `✨ Aluna vinculada — cartões
  ilimitados` (reaproveita `.pill`, já existe no CSS pro streak/XP do
  topbar, zero CSS novo) quando `hasActiveTeacherLink()===true`, ou
  `🔒 Plano grátis — N/20 cartões` quando `false`.
- **Botão desabilitado + texto muda pra "Limite atingido"** quando
  `!hasLink && activeCards.length >= 20` -- feedback já visível antes de
  tentar submeter, não só no popup.
- **Popup de aviso** (`#flashcard-limit-modal`, novo em fr+zh
  `index.html`, mesmo padrão HTML/JS de todo modal existente no app --
  `.app-modal-overlay`/`.app-modal`, abrir com `style.display='flex'`,
  fechar via botão `✕` ou clique no fundo) -- aberto pelo handler de
  submit do formulário como checagem de verdade (não só o `disabled` do
  botão, que cobre o caminho normal mas não é a fonte da verdade). Texto
  explica o teto E a saída (arquivar um cartão, ou vínculo com professora
  remove o limite) -- nunca promete "upgrade pra premium" porque essa
  opção não existe no produto ainda.
- **Nada em `student_flashcards`/RLS mudou** -- o limite é checado só no
  cliente (client-side gate, mesmo nível de confiança de outros limites
  de UI no app hoje, ex: `newCardsPerDay` do motor de revisão). Não é uma
  fronteira de segurança (uma aluna tecnicamente poderia inserir na tabela
  direto via API) -- aceitável pro escopo desta feature (não é dado
  sensível, é o próprio conteúdo dela), mesmo nível de rigor de outros
  limites de UX já existentes no app.

**Gratuito x Premium (resolvido nesta entrega, substitui a pergunta em
aberto da Fase 5):** com a resposta da autora, "premium" nesta feature
específica não existe ainda como conceito formal -- o que existe é
"aluna vinculada a uma professora" vs. "conta sem vínculo", e o teto de
20 é hoje o único comportamento que distingue os dois. Quando a
plataforma tiver assinatura de verdade, este é o ponto exato a
substituir/estender (`hasActiveTeacherLink()` → checagem de tier real,
ou um segundo eixo além do vínculo) -- não reinventar do zero.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh), 4
cenários: (1) sem vínculo, poucos cartões -- badge mostra contagem,
criação funciona normalmente; (2) sem vínculo, EXATAMENTE no teto (20
ativos) -- badge `20/20`, botão desabilitado com texto "Limite atingido",
tentativa de submit não grava no banco (`dbCountDelta===0`) e abre o
popup (`limitModalVisible===true`), popup fecha corretamente pelo botão
✕; (3) COM vínculo ativo, 25 cartões (acima do teto) -- badge mostra
"ilimitado", criação funciona normalmente mesmo acima de 20
(`dbCountDelta===1`); (4) zh no cenário do teto, mesmo resultado do fr.
Sem erro de console novo atribuível a este código (mesmos dois
`pageerror` pré-existentes de mock já registrados na Fase 5).

Próxima fase (6 -- supervisão da professora/métricas, conforme o
prompt-mestre original) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 6" +
grilling de escopo (o nome "supervisão da professora/métricas" nunca
tinha sido detalhado no prompt-mestre original) + segunda confirmação
explícita antes de tocar em dado sensível (ver abaixo).**

## Fase 6a (painel de métricas por aluna) -- primeira vez que uma professora lê dado de progresso de uma aluna

**Escopo, grillado em 2 rodadas antes de codar:** a Fase 6 nunca teve
descrição além do nome no prompt-mestre original. Perguntei explicitamente
o que ela deveria cobrir -- a autora escolheu a opção maior
("Painel + alertas de infrequência"), mas eu já tinha sinalizado na
própria pergunta que isso provavelmente merecia virar duas entregas
separadas. Auditando (só leitura) antes de codar, achei um motivo
CONCRETO pra isso, não só disciplina de escopo: o "painel" esbarra num
bloqueio de dados real que o "alerta" não esbarra (alerta cruza pro
`notification-cron`, sistema já existente, sem essa questão). Por isso
esta entrega é só o painel (**Fase 6a**) -- alertas de infrequência ficam
pra uma **Fase 6b** explicitamente separada, só depois de autorização de
novo.

**O bloqueio encontrado (auditoria ao vivo via Supabase MCP, antes de
qualquer código):** `progress` é uma tabela de UMA linha por conta
(`user_id`, `data` jsonb, `updated_at`) -- `data` é o `STATE` inteiro
serializado, namespaced por idioma (`{ frances: {...}, mandarim: {...} }`,
confirmado lendo `shared/auth.js` `saveState()`/`loadState()`). RLS de
`progress` hoje: só `auth.uid() = user_id`, pra leitura E escrita --
**nenhuma professora, vinculada ou não, tinha (ou tem agora, ver abaixo)
acesso a ler o progresso de nenhuma aluna.** Isso significa que "painel
de métricas" não é só UI -- é a PRIMEIRA vez nesta feature (e no app
inteiro) que uma conta passaria a enxergar dado de progresso de outra
conta. Reconheci isso como uma fronteira de privacidade nova, não uma
feature de UI comum, e voltei pra autora com uma segunda confirmação
explícita antes de tocar em RLS/dado sensível -- ela confirmou
"Sim, com o escopo mínimo".

**Decisão de design pra manter o escopo mínimo prometido:** em vez de uma
RLS policy de `SELECT` direta em `progress` (que exporia a linha INTEIRA
-- os dois idiomas juntos, todas as respostas/histórico granular,
inclusive os cartões que a ALUNA criou sozinha, que não são da
professora), o único ponto de acesso é uma **function `SECURITY DEFINER`**
(`get_teacher_student_metrics(p_student_id, p_language_app_key)`,
migration `029_create_teacher_student_metrics_function.sql`) que:
1. Checa o vínculo ativo (`teacher_students`, `status='active'`,
   `teacher_id = auth.uid()`) ELA MESMA, antes de tocar em qualquer dado
   -- se não autorizada, devolve `{"error": "not_authorized"}`, nunca a
   linha. **Testado ao vivo**: chamando a function pra um par
   aluna/idioma qualquer sem contexto de professora autenticada, o
   retorno foi exatamente `{"error":"not_authorized"}` -- confirma que o
   bloqueio é real, não só teórico.
2. Escopa ao idioma do vínculo (`data -> p_language_app_key`), nunca ao
   outro idioma que a mesma conta possa ter.
3. Filtra `cards[]` só pelos ids que pertencem a `teacher_flashcards`
   DESTA professora especificamente pra ESTA aluna (`id = 't' ||
   teacher_flashcards.id`) -- nunca cartão de trilha (`origin:'study'`)
   nem auto-criado pela aluna (`origin:'self'`, Fase 5).
4. Devolve só AGREGADOS (contagens) -- nunca a frente/verso de um cartão
   específico, nunca uma resposta/histórico granular: `lastStudyDay`,
   `teacherCardsTotal/Active/Archived/NeverReviewed`, e uma classificação
   `Weak/Medium/Strong` que reaproveita **a mesma regra exata** de
   `vocabStrengthBuckets()` (fr/zh `app.js`: `reps===0||lapses>=2` =
   fraca, `reps>0&&lapses<2&&interval>=60` = forte, resto = mediana) --
   não inventei um critério novo.
- RLS de `progress` continua **sem nenhuma policy nova** -- toda a
  autorização mora dentro da function, não na tabela.
- Migration aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente.

**O que foi feito no cliente:**
- **`shared/student-metrics.js`** (novo) -- `fetchTeacherStudentMetrics(studentId,
  languageAppKey)`, único call site que chama a RPC. Trata `data.error`
  (não-autorizado) e erro de rede da mesma forma -- devolve `null`, UI
  mostra fallback genérico em vez de vazar qual dos dois aconteceu.
- **`shared/admin-students.js`** estendido -- cada linha de "Suas alunas"
  (aba "🎓 Alunos") ganhou um botão "📊" que expande/recolhe um painel
  inline logo abaixo da própria linha (mesmo padrão visual de
  `admin-badge-row`, zero CSS novo). Busca via RPC só na PRIMEIRA vez que
  aquele vínculo é aberto na sessão (`STUDENT_METRICS_CACHE`, chave =
  id do vínculo, não do aluno -- evita colisão se a mesma aluna tiver mais
  de um vínculo/idioma) -- clique de fechar/abrir depois disso é só
  toggle de `display`, sem nova chamada de rede.
- 3 estados de exibição tratados explicitamente: com dado (contagens
  reais), sem nenhum cartão da professora ainda pra essa aluna (aponta
  pra aba "📇 Flashcards"), e falha/não-autorizado (mensagem genérica).

**Decisões arquiteturais tomadas nesta fase:**
1. Métricas escopadas SÓ aos cartões que a PRÓPRIA professora autorou --
   não é um "raio-x" da conta inteira da aluna (que incluiria trilha e
   cartões próprios da Fase 5). Reflexo direto do "escopo mínimo"
   aprovado: a professora só precisa saber como ESTÁ INDO O QUE ELA
   ENSINOU, não vigiar tudo que a aluna faz no app.
2. `lastStudyDay`/"última atividade geral" É a única informação que sai
   do escopo "só cartões da professora" -- decisão deliberada: sem saber
   se a aluna ainda está ativa no app, os números de "fracas/medianas/
   fortes" ficam sem contexto (uma aluna com 0 "fracas" porque sumiu há 3
   semanas não é a mesma coisa que uma com 0 fracas porque está
   estudando bem). Não expõe streak (`STATE.streak`, hoje sabidamente
   "congelável", ver seção anterior deste arquivo) nem XP nem nenhum
   outro campo de `data`.
3. `SECURITY DEFINER` + checagem de autorização DENTRO da function (não
   uma RLS policy declarativa) foi escolha deliberada, não atalho -- uma
   RLS policy em `progress` só consegue controlar acesso por LINHA
   inteira; o requisito de "só o idioma do vínculo, só agregado, nunca o
   cartão auto-criado" precisa de lógica além do que `USING`/`WITH CHECK`
   conseguem expressar sozinhos.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
Fases 1-3 -- ferramenta de gestão da própria professora sobre suas
próprias alunas, sem conceito de cobrança nesta ponta (a professora É a
autora/admin hoje). Fica a mesma pergunta em aberto já registrada nas
fases anteriores pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `node --check` sem erro. Verificação ao vivo da
function no banco real (`mcp__Supabase__execute_sql`) confirmando que uma
chamada sem professora autenticada retorna `{"error":"not_authorized"}`
-- a fronteira de segurança é real, testada contra o Postgres de
produção, não só assumida pela leitura do SQL. Validação funcional via
Playwright (fr), 3 cenários mockando a resposta da RPC: (1) com dado
completo -- painel mostra "2 dias atrás"/"4 ativos, 1 arquivados"/
"2 nunca revisados"/"3 fracas · 1 medianas · 1 forte", todos os números
batendo com o mock; (2) resposta `not_authorized` -- painel mostra a
mensagem de fallback genérica, sem crash; (3) zero cartões da professora
ainda -- painel mostra o estado vazio apontando pra "📇 Flashcards".
Toggle abrir/fechar confirmado nos 3 cenários. Sem erro de console novo
atribuível a este código (mesmo `pageerror` de `.maybeSingle` já
registrado em fases anteriores como limitação do mock, não deste código).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- **Fase 6b (alertas de infrequência)** -- a metade que a autora também
  pediu, mas que cruza pro `notification-cron` (Edge Function já em
  produção) em vez de só UI/RLS -- escopo e mecanismo (novo tipo de
  notificação pra professora? novo `event_type`? dispara quando?) ainda
  não desenhados, só nomeados. Próxima entrega explícita, não começada.
- Painel só mostra métricas dos cartões DA PROFESSORA -- nenhuma
  visibilidade sobre progresso geral da trilha ou cartões próprios da
  aluna (Fase 5), decisão deliberada (ver acima), não esquecimento.
- Nenhuma exportação/histórico ao longo do tempo -- é um snapshot do
  estado atual, sem gráfico de evolução.
- zh não foi validado separadamente nesta entrega (só fr) -- a tela
  "🎓 Alunos"/painel de métricas é 100% compartilhada entre os dois
  idiomas (mesmo `shared/admin-students.js`, sem nenhum branch por
  idioma), então o risco de regressão zh-específica é baixo, mas registrar
  aqui por completude -- mesmo padrão de honestidade já usado quando uma
  fase anterior valida só um idioma.

Próxima fase (6b -- alertas de infrequência pra professora) só começa
depois de autorização explícita da autora, com este relatório já
entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Pode seguir".**

## Fase 6b (alerta de infrequência pra professora) -- segundo evento cruzando pra `notification-cron`, primeiro com destinatário ≠ sujeito

**Escopo**: avisar a professora quando uma aluna vinculada some por um
número de dias, dentro do `notification-cron` (Edge Function já em
produção) -- diferente da Fase 6a (painel puxado sob demanda pela
professora), aqui é a plataforma que avisa PROATIVAMENTE, mesmo mecanismo
de `review_overdue`/`streak_at_risk`/reengajamento já existentes, só que o
DESTINATÁRIO da notificação não é o SUJEITO do dado -- primeira vez que
isso acontece no arquivo inteiro. Antes de codar, reli `maybeNotify()`
(a função central de disparo) e confirmei que ela já era agnóstica quanto
a isso -- `userId` é só "pra quem grava/envia", nunca presumido como "de
quem é o progresso lido" -- então nenhuma mudança de mecanismo foi
necessária, só uma categoria nova + um processador novo que lê o progresso
de UMA conta (aluna) e notifica OUTRA (professora).

**O que foi feito:**

- **Migration `030_add_teacher_supervisao_notification.sql`** -- nova
  linha em `notification_rules` (categoria `supervisao`, `priority:3`,
  `cooldown_minutes:1440`/`daily_cap:1` -- mesmo padrão de
  `reengajamento`, no máximo 1 aviso por professora por dia, ver abaixo
  por quê basta) + 4 linhas em `notification_templates`
  (`event_type:'student_inactive_alert'`, só canal `in_app`, 2 variantes
  x 2 `language_app_key`). `schedule_days: [3,7,14]` -- reaproveita o
  MESMO mecanismo de marco de dias do calendário de reengajamento (só
  dispara quando `daysSince(lastStudyDay)` bate EXATAMENTE um desses
  números, não em todo dia depois disso) -- marcos mais curtos que o
  autorreengajamento da própria aluna (1..30), porque aqui quem decide
  agir é a professora, faz sentido ela saber mais cedo. **Números
  escolhidos por mim, não confirmados com a autora** -- são um parâmetro
  de UMA linha (`UPDATE notification_rules SET schedule_days=... WHERE
  category='supervisao'`), ajustável a qualquer momento sem deploy de
  código novo; sinalizando aqui pra ela poder pedir outro valor se achar
  os marcos muito cedo/tarde. Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente.
- **`processTeacherStudentAlerts()`** (novo, `supabase/functions/
  notification-cron/index.ts`) -- roda 1x por invocação (mesmo padrão de
  `processWeeklyRankingResults`/`processFeaturedBadgeReminders`, não por
  usuário/idioma como `processUserLanguage`): lê todos os vínculos ativos
  de `teacher_students`, agrupa por `(teacher_id, language_app_key)`, e
  pra cada aluna do grupo cujo `daysSince(lastStudyDay)` bate um marco de
  `schedule_days`, acumula um "hit". Se o grupo tiver pelo menos 1 hit,
  busca os nomes em `profiles` (join manual em JS, mesmo padrão de
  `fetchMyStudents()`/`admin-badges.js`) e dispara UMA ÚNICA
  `maybeNotify()` pro grupo inteiro, com `studentList` já formatado
  ("Nome (N dias)", separado por vírgula quando há mais de uma). **Por
  que agrupar em vez de 1 notificação por aluna**: evita que uma
  professora com várias alunas sumindo no mesmo dia estoure o
  `daily_cap` da categoria e perca avisos -- e evita spam mesmo dentro do
  cap. `actionTab: 'admin-badges'` -- mesmo id de aba que "🛠️ Painel de
  Admin" usa (`renderAdminPanelView`, que já mostra a subseção "🎓 Alunos"
  quando é essa a selecionada); não existe deep-link pra uma subseção
  específica do painel hoje, então cai na mesma aba que os outros eventos
  de admin (`featured_badge_reminder` usa `'profile-edit'` por um motivo
  parecido -- entra na aba mais próxima que já existe, sem inventar
  roteamento novo).
- **`NOTIFICATION_CATEGORY_ICON.supervisao = '🎓'`** (`shared/
  notifications.js`) -- ícone de fallback no sino/dropdown quando o
  template não tiver um `icon` próprio (mesmo emoji já usado na aba "🎓
  Alunos", consistência visual).
- **`'supervisao'` de propósito NÃO entrou em `NOTIFICATION_PREF_
  CATEGORIES`** (`shared/notification-preferences.js`) -- mesmo
  precedente já usado por `'perfil'` (lembrete de badge em destaque):
  categoria de baixíssimo volume, só afeta contas professora/admin,
  `categoryAllowsInApp()` já retorna `true` por padrão quando não há
  preferência salva pra ela, então funciona sem exigir um toggle
  dedicado nesta fase. Sem variante de e-mail também (só `in_app`) --
  mesmo critério de várias outras categorias que não têm pool de e-mail
  próprio ainda.

**Deploy da Edge Function**: feito AO VIVO nesta sessão via
`mcp__Supabase__deploy_edge_function` (`notification-cron` v15→v16,
mesmo `verify_jwt:true`) -- não é passo manual pendente pra esta
correção, mesmo princípio já registrado na seção "Edge Functions: um fix
no código só vale em produção depois de um novo deploy" acima (aqui é
feature nova, não fix, mas o mesmo raciocínio de deploy-é-parte-da-
entrega se aplica).

**Achado durante a validação, FORA do escopo desta fase, reportado sem
corrigir:** invoquei a function v16 ao vivo (`curl` direto contra a URL
de produção, com a anon key só pra passar o `verify_jwt`) pra confirmar
que `processTeacherStudentAlerts()` não quebra o resto do cron.
`usersScanned:18`, sem erro atribuível ao código novo (a função rodou e
devolveu `notificationsCreated:0` pra essa parte, correto -- confirmei
com `select count(*) from teacher_students where status='active'` que
existem 11 vínculos reais ativos hoje, nenhum deles bateu exatamente nos
marcos 3/7/14 no momento do teste, o que é esperado, não um bug). Mas a
resposta trouxe **3 erros PRÉ-EXISTENTES, não relacionados a esta fase**:
`TypeError: Cannot read properties of undefined (reading 'split')` pra 3
contas distintas, sempre em `frances`. Rastreei a origem sem alterar
nada: `computeMissionProgress()` → `missionCurrent()` →
`getFieldValue(daily, def.field!)` -- quando `state.daily.missions`
contém um `id` de missão que não existe em `MISSION_FIELD_BY_ID` (o mapa
duplicado server-side, ver comentário já existente no arquivo sobre essa
duplicação), `def` vira `{}`, `def.field` vira `undefined`, e
`field.split('.')` quebra. Isso derruba a "Missão 5" (`daily_missions_
reminder`) pra essas 3 contas/idioma a cada execução -- não afeta os
passos 1-4 de `processUserLanguage` (já rodaram e já gravaram suas
notificações antes do crash no passo 5), então não é um bloqueio total,
mas é uma notificação real perdida silenciosamente pra 3 contas, todo
dia, desde antes desta sessão (não introduzi isso -- não toquei em
nenhuma dessas 3 funções). **Não corrigi** por disciplina de escopo desta
fase (é um bug de outra feature -- missões do dia -- não de alertas de
infrequência); registrando aqui pra uma sessão futura investigar qual
`id` de missão está desalinhado entre o cliente e
`MISSION_FIELD_BY_ID`.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
fases 1-6a -- alerta sobre as PRÓPRIAS alunas da professora/admin, sem
conceito de cobrança nesta ponta. Mesma pergunta em aberto já registrada
repetidamente pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `npx tsc --noEmit` sobre o arquivo editado
confirmou zero erro de sintaxe/tipo novo (só os erros pré-existentes de
`Cannot find name 'Deno'`, esperados sem as ambient types do Deno
carregadas -- mesmos erros que o arquivo já tinha antes desta edição).
Invocação real da function v16 em produção (ver "Achado" acima) confirma
que o código novo roda sem lançar exceção e não interfere no resto do
cron. **Não testei o caminho "notificação realmente disparada"
ponta-a-ponta** (nenhuma aluna real bateu um marco de `schedule_days` no
momento do teste) -- a lógica foi validada por leitura + tipo-checagem +
execução real sem erro, não por uma notificação de fato criada e vista no
sino. Uma sessão futura que quiser confirmar o caminho feliz pode
temporariamente ajustar `lastStudyDay` de uma conta de teste pra bater um
marco, invocar a function, e checar a tabela `notifications`.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum canal de e-mail/push pra `supervisao` -- só in-app.
- Marcos de dias (3/7/14) são um palpite meu, não confirmados com a
  autora -- ver nota acima, ajustável com um UPDATE simples.
- Bug pré-existente de `computeMissionProgress` (3 contas, categoria
  `desafios`) encontrado mas não corrigido, ver "Achado" acima --
  trabalho de outra fase.
- Fase 7 (histórico de "Aula") e Fase 8 (outros tipos de conteúdo) do
  prompt-mestre original continuam não iniciadas.

Próxima fase (7 -- histórico de "Aula", conforme o prompt-mestre
original) só começa depois de autorização explícita da autora, com este
relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-21), "Siga para a fase 7" +
grilling de escopo prévio (3 perguntas, ver abaixo).**

## Fase 7 (histórico de "Aula") -- diário de bordo da professora, fora do motor de cartões/revisão

**Escopo, grillado em 1 rodada antes de codar:** a Fase 7 nunca teve
descrição além do nome ("histórico de Aula") no prompt-mestre original --
mesma situação da Fase 6 antes do grilling daquela vez. 3 perguntas via
`AskUserQuestion`:

1. *O que a professora registra por aula?* → **opções 1+2 combinadas**
   (texto livre + campos estruturados), mas com uma correção importante
   da autora sobre a Opção 1: **só DATA, sem hora automática** -- ela
   registra várias aulas juntas no fim do dia, então uma hora "de
   criação" gravada automaticamente ficaria errada pra todas as entradas
   de um mesmo lote (ex: 3 aulas de manhãs diferentes, todas ganhando a
   hora de quando ela sentou pra digitar à noite). Os 4 campos de
   conteúdo (tópico/lição de casa/observações/texto livre) são todos
   opcionais INDIVIDUALMENTE -- exemplo dado por ela: aula de passé
   composé → tópico="passé composé", lição de casa=se houver, observações
   =material/página usada, texto livre=vocabulário e gramática
   trabalhados.
2. *Quem vê?* → **só a professora** (mesmo escopo mínimo já usado no
   painel de métricas da Fase 6a) -- não existe NENHUM caminho pra aluna
   ver isto, diferente de "🎓 Alunos"/"📇 Flashcards".
3. *Editar/apagar?* → **desde já**, diferente de teacher_flashcards/
   student_flashcards (que usam `status:'archived'`, nunca deletam, pra
   preservar progresso de memória FSRS acumulado): uma entrada de aula
   não tem NENHUM estado de memória dependente dela, então DELETE físico
   é seguro aqui -- primeira vez nesta feature que uma tabela usa delete
   de verdade em vez do padrão de arquivamento.

**O que foi feito:**

- **Migration `031_create_teacher_class_logs_table.sql`** -- tabela nova
  `teacher_class_logs` (`teacher_id`, `student_id`, `language_app_key` --
  mesmo trio que `teacher_students`/`teacher_flashcards` já usam --,
  `class_date` DATE (não timestamptz, ver decisão 1 acima, default
  `current_date`), `topic`/`homework`/`observations`/`notes` todos
  nullable). RLS de UMA política só (`teacher_class_logs_owner_all`, `for
  all using/with check auth.uid() = teacher_id`) -- mesmo padrão "dono
  único" de `student_flashcards`, mas aqui o dono é a PROFESSORA, não a
  aluna (que não tem NENHUMA policy de leitura nesta tabela, ver decisão
  2). Aplicada AO VIVO nesta sessão via `mcp__Supabase__apply_migration`
  -- não é passo manual pendente.
- **`shared/teacher-class-logs.js`** (novo) -- `fetchClassLogs`,
  `createClassLog` (valida que pelo menos 1 dos 4 campos de conteúdo
  esteja preenchido, senão rejeita com mensagem explícita -- nenhum CHECK
  constraint no banco pra isso, mesmo nível de rigor de outras validações
  de conteúdo já existentes no app), `updateClassLog` (mesma validação),
  `deleteClassLog` (DELETE físico, ver decisão 3).
- **`shared/admin-class-logs.js`** (novo) + nova subseção "📝 Aulas" no
  Painel de Admin (fr+zh), ao lado de "📇 Flashcards": select de aluna
  (populado por `fetchMyStudents()`, já existente da Fase 1) + form de
  nova aula (data pré-preenchida com hoje, editável; tópico/lição de
  casa/observações/notas) + lista de aulas já registradas, mais recente
  primeiro, cada uma com botões Editar (abre um form inline no lugar da
  própria linha, com Salvar/Cancelar) e Apagar (com `confirm()`).
  Reaproveita as mesmas classes CSS de `admin-flashcards.js`
  (`admin-badge-row`/`profile-section`) -- zero CSS novo.

**Decisões arquiteturais tomadas nesta fase:**
1. `teacher_class_logs` é **completamente desconectado** de
   `STATE.cards`/FSRS/`getStudyQueue()` -- nenhum builder de card, nenhum
   merge no boot do app, nenhuma origem nova (`study`/`teacher`/`self`
   continuam sendo as únicas 3). É puramente um diário de bordo da
   professora sobre suas próprias aulas -- diferente de TODAS as fases
   anteriores desta feature (1 a 6), que sempre giravam em torno do motor
   único de cartão/revisão. Fase 7 é a primeira peça da feature que vive
   inteiramente fora dele, por natureza (não é conteúdo revisável pela
   aluna).
2. **Primeira tabela desta feature com DELETE físico de verdade** (ver
   decisão 3 do grilling) -- todas as anteriores (`teacher_flashcards`,
   `student_flashcards`) usam `status:'archived'` porque têm progresso de
   memória FSRS acumulado dependente da linha continuar existindo. Uma
   entrada de aula não tem essa dependência, então a regra geral do
   prompt-mestre ("nunca apagar histórico/dado ao remover associação")
   não se aplica aqui -- ela existe pra proteger PROGRESSO DE MEMÓRIA da
   aluna, não qualquer linha de qualquer tabela; a autora confirmou
   explicitamente que quer edição/exclusão reais pra este diário
   específico.
3. `class_date` é DATE puro (sem hora), default `current_date`, mas
   EDITÁVEL no formulário -- não travado como "hoje" imutável. Permite a
   professora registrar uma aula de um dia anterior (ela relatou que
   registra em lote no fim do dia, o que sugere que pode querer voltar
   uma aula pro dia real em que aconteceu).
4. Edição é inline (troca a própria linha por um form, não um modal) --
   mesmo padrão de "editar no lugar" já visto em outras telas simples do
   Painel de Admin, sem introduzir um componente de modal novo pra isso.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão das
fases 1-6b -- ferramenta de gestão da própria professora sobre as
próprias aulas, sem conceito de cobrança nesta ponta (a professora É a
autora/admin hoje). Mesma pergunta em aberto já registrada repetidamente
pra quando houver mais de uma professora na plataforma.

**Testes realizados:** `node --check` sem erro em `shared/teacher-class-
logs.js`, `shared/admin-class-logs.js` e `shared/admin-analytics.js`
(editado pra rotear a nova seção). Validação funcional via Playwright
(fr+zh), stub de `window.supabase.createClient()` no mesmo padrão das
fases anteriores: gate de não-admin bloqueia com a mensagem padrão;
validação de "pelo menos 1 campo preenchido" rejeita uma tentativa
totalmente vazia sem gravar no banco; criar uma aula pelo formulário sobe
a contagem no banco fake E aparece na lista imediatamente, com a data
pré-preenchida em hoje; editar (abrir form inline, mudar o tópico, salvar)
atualiza o banco E a exibição, fechando o form de edição; cancelar a
edição fecha o form sem gravar; apagar remove do banco E da lista,
voltando ao estado vazio. **Achado durante a validação, só no harness de
teste (não no código do app)**: o mock minimalista usado nesta sessão
tinha um `update()` que não encadeava `.eq()` corretamente (bug só do
script de teste, replicado do template usado em fases anteriores que
nunca tinha exercitado `.update().eq()` numa tabela nova) -- corrigido no
script de validação antes de reportar os resultados acima; **não é um bug
no código de produção**, `shared/teacher-class-logs.js` sempre usou o
mesmo padrão `.update(payload).eq('id', id)` já usado em
`setFlashcardStatus` (Fase 2), que é a forma correta de chamar o
Supabase real. Sem erro de console novo atribuível a este código (mesmo
`pageerror` de `.is()` já registrado em fases anteriores como limitação
do mock, não deste código).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma exportação/impressão do histórico de aulas -- é só uma lista na
  tela, sem PDF/CSV.
- Nenhuma busca/filtro por tópico ou período dentro da lista de aulas de
  uma aluna -- lista simples ordenada por data, mais recente primeiro.
- Nenhuma contagem/resumo de aulas no painel de métricas da Fase 6a --
  são features irmãs mas não integradas uma à outra; a professora não vê
  "N aulas registradas" no card de métricas expandido de uma aluna.
- Fase 8 (outros tipos de conteúdo, conforme o prompt-mestre original)
  continua não iniciada.

Próxima fase (8) só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-22), "Siga para a fase 8" +
grilling de escopo em 2 rodadas (ver Fase 8a abaixo).**

## Fase 8 (outros tipos de conteúdo) -- grillada em 2 rodadas, escopo travado antes de codar

A Fase 8 nunca teve descrição além do nome ("outros tipos de conteúdo") no
prompt-mestre original -- mesma situação já registrada nas Fases 6 e 7
antes do grilling daquela vez. 2 rodadas via `AskUserQuestion`:

1. *O que "outros tipos de conteúdo" deve cobrir concretamente?* -- a
   autora selecionou as **3 opções** oferecidas (multiSelect): novos
   formatos de flashcard, material de apoio não-revisável, exercício
   interativo novo.
2. *Em que ordem, e qual o escopo do primeiro sub-passo?* -- ordem
   confirmada **formatos de flashcard → material de apoio →
   exercício interativo**; pro primeiro sub-passo (Fase 8a), a autora
   selecionou os **3 formatos** oferecidos (multiSelect): imagem, áudio,
   múltipla escolha.

Como "múltipla escolha" muda MECÂNICA de revisão (não só conteúdo
passivo como imagem/áudio), rodei uma 3ª pergunta focada só nisso antes
de codar (ver Fase 8a abaixo) -- disciplina já usada nas fases 6/7: nunca
presumir o design de uma peça que muda comportamento, mesmo com a opção
já selecionada num round anterior.

Fase 8 inteira segue fatiada em sub-fases próprias (8a/8b/8c), cada uma
com seu próprio relatório e autorização antes da próxima -- mesmo
princípio de todo o resto desta feature.

## Fase 8a (novos formatos de flashcard: imagem, áudio, múltipla escolha)

**Escopo confirmado num 3º grilling, focado só na múltipla escolha** (a
única peça das 3 que muda mecânica, não só conteúdo):

1. *Em que modo de revisão o cartão de múltipla escolha aparece?* --
   **sempre múltipla escolha, em qualquer modo** (não só Speed Review) --
   a autora rejeitou a opção mais conservadora (só Speed Review, que já é
   nativamente múltipla escolha) em favor de fazer o cartão virar quiz
   onde quer que ele apareça (Flashcard, Palavras Difíceis, inclusive).
2. *Como mapear acerto/erro pra nota FSRS?* -- **acerto = Bom (grade 2),
   erro = Errei (grade 0)** (recomendado) -- reaproveita a mesma escala
   de graus já usada em toda a revisão, sem inventar um 5º grau.

**Escopo explicitamente restrito a `teacher_flashcards`** -- não
`student_flashcards` (Fase 5). A pergunta original que abriu a Fase 8
falou em "novos formatos de flashcard" no genérico, mas cada fase desta
feature trabalha num ponto de dado por vez; estender os 3 formatos novos
pro cartão que a PRÓPRIA aluna cria é trabalho natural de uma fase futura
(o dado seria praticamente idêntico -- `image_url`/`audio_url`/`choices`
em `student_flashcards` também), mas não decidido nem começado aqui.

**O que foi feito:**

- **Migration `032_add_flashcard_media_and_choices.sql`** -- 3 colunas
  novas em `teacher_flashcards` (`image_url`, `audio_url`, `choices`
  jsonb -- array de 1-3 respostas ERRADAS; a certa continua sendo
  `back_trans`, nunca duplicada) + bucket de Storage novo
  `flashcard-media` (público pra leitura, escrita restrita à pasta do
  próprio `auth.uid()` -- mesmo padrão RLS do bucket `avatars`, Fase
  Perfil 7.1 -- mas com path com componente aleatório, mesmo padrão do
  bucket `report-screenshots`, não path fixo/upsert, porque um cartão
  pode ter sua própria mídia sem sobrescrever a de outro). Aplicada AO
  VIVO nesta sessão via `mcp__Supabase__apply_migration` -- não é passo
  manual pendente pra autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()` estendido com
  `imageUrl`/`audioUrl`/`choices` (todos opcionais e independentes entre
  si -- um cartão pode ter imagem sem ser múltipla escolha, ou múltipla
  escolha sem imagem). Nova `uploadFlashcardMedia(file, kind)` -- sobe
  pro bucket `flashcard-media` e devolve a URL pública já pronta pra
  gravar junto no `createFlashcard()`; não grava nada no banco sozinha.
- **`shared/admin-flashcards.js`** -- form ganhou 2 campos de arquivo
  (`<input type="file">` pra imagem/áudio) + um checkbox "Múltipla
  escolha" que revela 3 campos de texto (1 obrigatório, 2 opcionais) pra
  digitar respostas erradas. Submit faz upload de imagem/áudio ANTES de
  criar o cartão (aborta com erro se um upload falhar, sem criar cartão
  pela metade) e valida que pelo menos 1 opção errada esteja preenchida
  quando o checkbox de múltipla escolha está marcado. Lista de cartões
  ganhou badges curtos (`🖼️ imagem`/`🎧 áudio`/`🔤 múltipla escolha`) só
  quando o formato está presente -- cartão comum não ganha nenhum badge
  novo.
- **`fr/app.js`/`zh/app.js`** (mudanças espelhadas nos dois, com o
  ajuste zh de sempre pro shape hanzi/pinyin):
  - `buildCardFromTeacherFlashcard(row)` ganhou `imageUrl`/`audioUrl`/
    `choices` no card construído.
  - `customAudioBtnHTML()`/`wireCustomAudioButtons()` (novo) -- botão
    🎧 separado do botão de pronúncia automática (TTS) que o app já
    tinha -- áudio próprio da professora é um arquivo real tocado via
    `new Audio(url).play()`, não geração de voz.
  - `buildSpeedOptions(card)` ganhou um branch no topo: se o cartão tem
    `choices`, devolve as opções AUTORADAS pela professora em vez de
    calcular distratores de cartões-irmãos -- Speed Review (que já era
    nativamente múltipla escolha) simplesmente passou a preferir o
    conteúdo autorado quando ele existe, zero mudança na mecânica do
    Speed Review em si.
  - `renderReviewView()` ganhou um branch logo no início: se
    `card.choices` existe, desvia pra `renderMultipleChoiceReviewCard(card)`
    em vez do fluxo de virar cartão -- vale em QUALQUER lugar que passa
    por esta função (Flashcard e Palavras Difíceis, que compartilham a
    mesma tela -- grillado, decisão 1 acima). **Fora do escopo,
    deliberadamente: Combinar** (jogo de pareamento, arquitetura
    incompatível com "1 pergunta, N opções" -- não foi perguntado à
    autora explicitamente se Combinar deveria tentar suportar múltipla
    escolha de alguma forma; ficou de fora por não caber na mecânica do
    jogo, não por decisão consciente dela).
  - `renderMultipleChoiceReviewCard(card)` (novo) -- reaproveita
    `gradeCurrentCard(wasCorrect ? 2 : 0)` pra aplicar a nota FSRS depois
    que a aluna clica "Continuar", herdando de graça toda a plumbing já
    existente (XP, streak, requeue-em-erro, save, avanço de índice) sem
    reimplementar nada disso -- mesma disciplina de "um motor só" já
    usada em toda a feature. As opções (`card.mcOptions`) são embaralhadas
    1x e cacheadas no próprio cartão -- embaralhar de novo a cada
    re-render (ex: depois de clicar) trocaria a posição dos botões debaixo
    do dedo da aluna.
  - Flip-mode do flashcard tradicional ganhou `<img class="flashcard-image">`
    (quando `card.imageUrl` existe) e o botão de áudio próprio (quando
    `card.audioUrl` existe) -- um cartão pode ter imagem/áudio SEM ser
    múltipla escolha, e continua virando normalmente.
- **`fr/index.html`/`zh/index.html`** -- CSS novo pra `.flashcard-image`,
  `.mc-options`/`.mc-option` (+ estados `.correct`/`.incorrect`/
  `.disabled`) e `.mc-continue-btn`; seletor `.audio-btn` estendido pra
  `.audio-btn, .custom-audio-btn` (mesmo estilo visual, dois botões
  physicamente diferentes na tela quando os dois existem).

**Erro de token de cor pego e corrigido durante a própria implementação
(auto-detectado, não reportado pela autora)** -- mesmo tipo de erro já
registrado na seção "Tokens de cor de marca vs. semânticos" no topo
deste arquivo: a primeira versão de `.mc-option.correct`/`.incorrect`
usava `color: var(--on-vivid)` (calibrado especificamente pra texto
sobre as cores SÓLIDAS `--jade`/`--error-red`) só que aplicado sobre um
FUNDO CLARO com tinta rgba dessas mesmas cores (`rgba(58,115,89,0.12)`/
`rgba(214,38,25,0.1)`) -- contraste incorreto no caso geral, mesmo que
não tenha chegado a virar screenshot ilegível de fato porque `--ink` e
`--on-vivid` coincidem em alguns temas. Corrigido pra `color: var(--ink)`
nos dois arquivos, igualando o idioma visual já usado por
`.gram-exercise.ok`/`.wrong` (borda + tinta clara + texto `--ink` simples,
sem token de contraste especial) que já existia nos mesmos arquivos.
Validado nos 4 cenários obrigatórios (ver Testes abaixo) antes de
reportar como pronto.

**Decisões arquiteturais tomadas nesta fase:**
1. `choices` é array de respostas ERRADAS apenas (1-3) -- a resposta
   certa nunca é duplicada, continua sendo `back_trans` (a mesma fonte
   que o cartão tradicional já usa pro verso). Evita os dois campos
   discordarem se um dia só um dos dois for editado.
2. Upload de mídia acontece ANTES do insert do cartão (2 chamadas de
   rede sequenciais quando os dois arquivos estão presentes) -- mantém
   `createFlashcard()` simples (só grava URLs já prontas, nunca lida com
   `File`), e a UI aborta cedo com erro claro se um upload falhar, em vez
   de criar um cartão com mídia quebrada.
3. Botão de áudio próprio (`.custom-audio-btn`, 🎧) é visualmente
   distinto do botão de pronúncia automática (`.audio-btn`, alto-falante)
   quando os dois aparecem juntos -- são fontes de áudio semanticamente
   diferentes (voz real da professora/gravação vs. TTS do navegador), a
   aluna não deveria confundir qual é qual.
4. Nenhuma mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS --
   múltipla escolha é só uma forma de APRESENTAR e RESPONDER o cartão
   (a fila que decide QUAIS cartões aparecem continua idêntica); a
   integração inteira ficou contida em `renderReviewView()` (desvio de
   render) + `renderMultipleChoiceReviewCard()` (chama
   `gradeCurrentCard()` como qualquer outro fluxo).

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a Fase 2 em diante -- conteúdo autorado pela própria professora pras
próprias alunas, sem custo marginal de servir (mídia é hospedada no
Storage do próprio Supabase, sem serviço pago de terceiros envolvido).
Mesma pergunta em aberto já registrada repetidamente pra quando houver
mais de uma professora na plataforma (aqui, especificamente, um limite de
espaço de Storage usado por professora seria a alavanca mais natural, já
que mídia ocupa espaço de forma que texto não ocupa) -- não travada em
código.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão
de stub de `window.supabase.createClient()` das fases anteriores,
estendido com um stub de `storage.from(bucket).upload()`/`getPublicUrl()`
que grava as chamadas de upload num array pra inspeção: (1) fluxo de
CRIAÇÃO no admin -- upload de imagem+áudio confirmado chamando o bucket
certo (`uploadCallsCount:2`, `uploadBuckets:['flashcard-media',
'flashcard-media']`), URLs gravadas no cartão criado
(`plainCardHasImageUrl`/`plainCardHasAudioUrl:true`), badges de formato
aparecendo na lista (`🖼️ imagem · 🎧 áudio`); (2) toggle de múltipla
escolha -- campos escondidos por padrão, revelados ao marcar o checkbox;
submeter com o checkbox marcado e todas as 3 opções vazias é REJEITADO
com mensagem clara, sem gravar no banco (`dbCountAfterEmptyChoicesReject:0`);
preencher 1-2 opções e submeter cria o cartão com `choices` correto; (3)
lado da aluna -- cartão com `choices` confirmado desviando pra
`renderMultipleChoiceReviewCard()` em vez de virar
(`mcOptionsRendered:3`, imagem e botão de áudio próprio renderizados
junto do quiz), clicar a opção certa aplica a classe `.correct` e
desabilita todas as opções, botão "Continuar" aparece só depois de
responder, clicar "Continuar" chama `gradeCurrentCard()` de verdade
(`dueChangedAfterGrading`/`repsIncremented:true`, sessão avança); (4)
cartão de professora SEM `choices` (mas com imagem/áudio) confirmado
continuando a virar normalmente, com imagem e botão de áudio próprio
presentes no flip tradicional; (5) `buildSpeedOptions()` confirmado
preferindo `card.choices` autorados em vez de calcular distratores de
cartões-irmãos quando `choices` existe. Testado nos dois idiomas (fr+zh),
incluindo o shape hanzi/pinyin específico do zh no card de múltipla
escolha. Sem erro de console novo atribuível a este código (os 2
`pageerror` vistos na fase de admin -- `.is()`/`.upsert()` -- são a mesma
limitação de mock já registrada em todas as fases anteriores, não deste
código; a fase de revisão do lado da aluna não teve NENHUM erro de
console).

**Validação visual dos 4 cenários obrigatórios** (regra explícita deste
arquivo pra qualquer cor de fundo customizada nova, ver seção "Tokens de
cor de marca vs. semânticos" no topo): screenshot Playwright de
`.mc-option.correct` (fundo verde-claro/`--jade` tintado + texto `--ink`)
em fr-claro, fr-escuro, zh-claro, zh-escuro -- texto legível nos 4,
nenhum problema de contraste encontrado (foi exatamente essa verificação
que pegou o erro de `--on-vivid` descrito acima, antes de reportar como
pronto).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não ganhou
  nenhum dos 3 formatos novos -- decisão de escopo, não esquecimento (ver
  "Escopo" acima).
- Combinar (jogo de pareamento) não tenta suportar múltipla escolha de
  forma alguma -- arquitetura incompatível, fora do escopo grillado.
- Edição de um cartão já criado com imagem/áudio/múltipla escolha (só
  trocar/remover a mídia, ou editar as opções) não foi implementada --
  mesmo escopo que `teacher_flashcards` já tinha desde as Fases 2/3 (só
  criar e arquivar/reativar, sem editar o conteúdo em si).
- Nenhum limite de tamanho de arquivo de upload aplicado no cliente --
  confia no limite que o próprio bucket do Supabase Storage aplica, sem
  validação adicional de tamanho/dimensão antes do upload.
- Fase 8b (material de apoio não-revisável) e Fase 8c (exercício
  interativo novo) continuam não iniciadas -- ordem já travada no
  grilling acima.

Próxima fase (8b -- material de apoio não-revisável) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização (2026-09-22, mesmo dia): campo "Aluna" virou multi-seleção,
pedido direto da autora logo após a entrega acima.** "Ao criar um
flashcard, quero poder atribuir a mais pessoas ao mesmo tempo. O campo
'Aluna' no menu de criação Flashcards, podia ter um multiselect ao invés
de select individual." -- pequeno adendo de UX à Fase 8a (não uma fase
nova, não mexeu em schema).

`shared/admin-flashcards.js`: o `<select>` único virou uma lista de
checkboxes (`ADMIN_FLASHCARDS_STATE.studentId` → `.studentIds` um `Set`),
com links "Selecionar todas"/"Limpar seleção". Ao submeter, cria **uma
linha em `teacher_flashcards` por aluna marcada** (mesmo front/back/nota/
imagem/áudio/choices), cada uma com o `language_app_key` da PRÓPRIA aluna
-- uma seleção pode misturar francês e mandarim na mesma turma sem
problema (testado explicitamente: 2 alunas fr + 1 aluna zh na mesma
seleção → 3 linhas, cada uma no idioma certo). Upload de imagem/áudio
acontece só 1 vez (mesmo arquivo reaproveitado pras N linhas, não
reenviado por aluna). O campo Pinyin (visível quando QUALQUER aluna
selecionada é de mandarim) só é gravado nas linhas cujo `language_app_key`
é `'mandarim'` -- nunca em linha de francês, pra não sujar dado que o fr
nunca lê.

A lista de cartões abaixo do formulário também passou a agregar as
alunas selecionadas (antes só mostrava a aluna do `<select>` único) --
com `@username` prefixado em cada linha só quando há MAIS de uma aluna
selecionada (evita ruído visual no caso comum de 1 só). Nunca deixa a
seleção ficar vazia (recai pra 1ª aluna se `studentIds` esvaziar) -- sem
isso, "Limpar seleção" deixaria o formulário sem alvo válido pra criar
cartão nenhum.

**Testado (Playwright, fr+zh):** seleção múltipla mista fr+zh confirmada
criando 3 linhas com `language_app_key` corretos cada, pinyin só na linha
zh, prefixo `@username` aparecendo nas 3 linhas da lista quando 3
selecionadas e sumindo quando volta pra 1 só, "Limpar seleção" nunca
zera de verdade (sempre sobra ≥1 marcada), "Selecionar todas" marca as 3.
Sem erro de console novo (mesmos 2 `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a Fase 8a). `node --check` sem
erro. Nenhuma mudança em `shared/teacher-flashcards.js`/migration/schema
-- só orquestração no cliente, reaproveitando `createFlashcard()` como já
era chamado.

## Fase 8b (material de apoio não-revisável) -- terceiro tipo de conteúdo, primeiro visível pra aluna que ela não cria

**Escopo grillado em 1 rodada (4 perguntas) antes de codar** -- mesma
disciplina das Fases 6/7/8 (nome sem descrição no prompt-mestre original):

1. *Que forma o material deve ter?* -- **texto + link + arquivo, todos
   opcionais individualmente** (recomendado) -- a professora usa o que
   fizer sentido pra cada material, sem formato único forçado.
2. *Quem vê, e onde?* -- **aluna vê numa tela nova dedicada** (recomendado)
   -- "📚 Material de apoio" no menu do avatar, mesma visibilidade de
   "📇 Meus Cartões" (Fase 5).
3. *Multi-atribuição desde já?* -- **sim** (recomendado) -- mesmo padrão
   recém-adicionado aos flashcards (ver adendo da Fase 8a acima): a
   professora marca 1+ alunas, o mesmo material vai pra todas de uma vez.
4. *Editar/apagar?* -- **de verdade, desde já** (recomendado) -- mesmo
   raciocínio da Fase 7 (`teacher_class_logs`): sem estado de memória FSRS
   dependente da linha, DELETE físico é seguro.

**"Não-revisável" ≠ "só a professora vê"** -- diferença importante em
relação à Fase 7 ("📝 Aulas", só professora): aqui a aluna TEM uma tela
pra ver o material (grillado, pergunta 2 acima). "Não-revisável" significa
só que o conteúdo NUNCA entra em `STATE.cards`/FSRS/`getStudyQueue()` --
é conteúdo passivo compartilhado, não algo que a aluna precisa memorizar
num ciclo de repetição espaçada. Primeira peça desta feature que é ao
mesmo tempo (a) visível pra aluna e (b) completamente fora do motor de
revisão -- `teacher_flashcards`/`student_flashcards` são (a)+dentro do
motor, `teacher_class_logs` é fora do motor mas não-(a).

**O que foi feito:**

- **Migration `033_create_teacher_support_materials.sql`** -- tabela nova
  `teacher_support_materials` (`teacher_id`, `student_id`,
  `language_app_key` -- mesmo trio de sempre --, `title` obrigatório,
  `description`/`link_url`/`file_url`/`file_name` todos opcionais). RLS:
  professora gerencia tudo que criou (`for all`, mesmo padrão "dono
  único" de `teacher_class_logs`), aluna só LÊ o que foi atribuído a ela
  (`for select`, `auth.uid() = student_id`). Bucket de Storage novo
  `support-materials` (leitura pública, escrita restrita à pasta do
  próprio `auth.uid()`, path aleatório -- mesmo padrão RLS do bucket
  `flashcard-media`, Fase 8a). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente pra
  autora.
- **`shared/teacher-support-materials.js`** (novo) --
  `fetchSupportMaterialsForStudent`/`fetchSupportMaterialsForCurrentStudent`
  (lado professora/lado aluna, mesmo par de sempre), `uploadSupportMaterialFile`
  (bucket `support-materials`, sem restrição de tipo -- PDF/imagem/doc,
  guarda o `fileName` original porque a URL pública é um path opaco),
  `createSupportMaterial` (título obrigatório + pelo menos 1 de
  descrição/link/arquivo, mesmo rigor de `createClassLog`),
  `updateSupportMaterial` (título/descrição/link -- não o arquivo, mesmo
  escopo restrito de edição que `teacher_flashcards` já tinha),
  `deleteSupportMaterial` (DELETE físico, grillado).
- **`shared/admin-support-materials.js`** (novo) + nova subseção "📚
  Material de apoio" no Painel de Admin (fr+zh), ao lado de "📝 Aulas":
  combina o multi-select de checkboxes recém-adicionado aos flashcards
  (adendo da Fase 8a acima) com o padrão de edição inline + apagar da
  Fase 7 (`admin-class-logs.js`) -- primeira tela desta feature a herdar
  os dois padrões ao mesmo tempo. Cria uma linha por aluna selecionada
  (mesmo arquivo/conteúdo, upload feito 1 vez só), lista agregada com
  `@username` prefixado quando >1 selecionada.
- **`shared/support-materials-view.js`** (novo) -- tela SÓ LEITURA pro
  lado da aluna (`renderSupportMaterialsView`), sem nenhum controle de
  edição/exclusão (esses ficam só no Painel de Admin). Card por material:
  título, descrição, link clicável (`target="_blank"`), arquivo como link
  de download (nome original ou "Baixar arquivo" como fallback), data.
- **Nova entrada "📚 Material de apoio" no menu do avatar** (fr+zh,
  `#support-materials-btn`), entre "📇 Meus cartões" e "⚙️
  Configurações" -- SEM `admin-only-nav`, mesma visibilidade de "Meus
  Cartões" (qualquer conta). Nova `<div class="view"
  id="view-support-materials">`, aba registrada em `tabHandlers` como
  `'support-materials': renderSupportMaterialsView`.

**Decisões arquiteturais tomadas nesta fase:**
1. `teacher_support_materials` é **completamente desconectada** de
   `STATE.cards`/FSRS -- nenhum builder de card, nenhum merge no boot,
   nenhuma origem nova (`study`/`teacher`/`self` continuam sendo as
   únicas 3) -- mesmo princípio da Fase 7, mas com uma tela nova pro
   lado da aluna (diferença chave já registrada acima).
2. Entrada de menu "📚 Material de apoio" fica **sempre visível**, mesmo
   pra quem nunca vai ter nada lá (maioria das contas sem professora
   vinculada) -- mesmo raciocínio já usado em "📇 Meus Cartões" (Fase 5),
   não o raciocínio de "esconder quando irrelevante" já usado no filtro
   de origem da Fase 4. Decisão deliberada: gastar uma chamada de rede
   extra no BOOT do app só pra decidir se esconde um item de menu não
   valeria a pena pelo ganho de UX -- o estado vazio já é claro o
   suficiente ("sua professora ainda não enviou nada").
3. Edição de material cobre título/descrição/link, não o arquivo anexado
   -- trocar/remover mídia de um material já criado não foi pedido no
   grilling; mesmo escopo restrito que `teacher_flashcards` já tinha
   desde as Fases 2/3 (criar não-vazio + editar campos de texto, nunca
   trocar mídia já enviada).
4. Upload de arquivo não distingue tipo (imagem/áudio/PDF/doc) -- ao
   contrário de `uploadFlashcardMedia` (Fase 8a, que separa `image`/
   `audio` só pra nomear o path), aqui é sempre "um arquivo anexo
   genérico", sem necessidade de diferenciação.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a feature desde a Fase 2 -- conteúdo autorado pela própria
professora pras próprias alunas, sem custo marginal de servir (Storage
do próprio Supabase). Mesma pergunta em aberto já registrada
repetidamente pra quando houver mais de uma professora na plataforma
(aqui, de novo, um limite de espaço de Storage por professora seria a
alavanca mais natural) -- não travada em código.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-support-materials.js`, `shared/admin-support-materials.js`,
`shared/support-materials-view.js`, `shared/admin-analytics.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh pro lado admin,
fr pro lado aluna -- ver nota de cobertura abaixo), mesmo padrão de stub
de `window.supabase.createClient()` já usado em toda a feature: (1)
multi-seleção de 2 alunas confirmada criando 2 linhas
(`createdStudentIds` batendo com as 2 alunas selecionadas), submeter só
com título (sem descrição/link/arquivo) é REJEITADO sem gravar no banco
(`dbCountAfterEmptyReject:0`), lista mostra `@username` prefixado nas 2
linhas quando 2 selecionadas e some quando volta pra 1 só; (2) edição
inline confirmada atualizando o título no banco de verdade
(`editedTitleInDb` reflete o valor editado); (3) apagar confirmado
removendo do banco (`stillInDbAfterDelete:false`); (4) lado da aluna --
`fetchSupportMaterialsForCurrentStudent` confirmado retornando os 2
materiais semeados, título/link/arquivo renderizados corretamente na
tela (`linkRendered`/`fileLinkRendered:true`), nenhum botão de
editar/apagar presente (`noEditOrDeleteButtons:true`, confirma que é
mesmo só-leitura), estado vazio mostrando a mensagem certa quando a
aluna não tem nenhum material. Sem erro de console novo atribuível a
este código (mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature; o lado da aluna não teve NENHUM erro de
console). **Achado de harness, não de produção**: o mock desta sessão
tinha o mesmo bug já documentado na Fase 7 (`.update().eq()` exigindo 2
chamadas encadeadas em vez de 1) -- corrigido no script de validação
antes de reportar os resultados acima; `updateSupportMaterial` sempre
usou o padrão `.update(payload).eq('id', id)` correto, mesmo já usado em
`setFlashcardStatus`/`updateClassLog`.

**Nota de cobertura**: validação do lado da aluna rodou só em fr (não
zh) -- `shared/support-materials-view.js` é 100% compartilhado entre os
dois idiomas, sem nenhum branch por idioma, então o risco de regressão
zh-específica é baixo, mas registrando aqui por completude, mesmo padrão
de honestidade já usado quando a Fase 6a validou só fr.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhum limite de tamanho/tipo de arquivo aplicado no cliente -- confia
  no limite que o bucket do Supabase Storage aplica, mesmo critério já
  registrado na Fase 8a.
- Nenhuma contagem/resumo de materiais no painel de métricas da Fase 6a
  -- são features irmãs mas não integradas, mesmo padrão já registrado
  quando a Fase 7 (Aulas) fez a mesma observação.
- Fase 8c (exercício interativo novo) continua não iniciada -- último
  sub-passo da Fase 8, ordem já travada no grilling da Fase 8 original.

Próxima fase (8c -- exercício interativo novo) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-22, mesmo dia), "Siga para
a fase 8c" + grilling de 4 perguntas antes de codar (ver Fase 8c abaixo);
seguida no mesmo dia por um pedido de reorganização visual da própria
tela de Flashcards (crítica detalhada com print real, ver "UX-fix:
formulário de flashcard" logo depois da Fase 8c).**

**Atualização: autorizada e entregue (2026-09-22, mesmo dia), "Siga para
a fase 8c" + grilling de 4 perguntas antes de codar (ver Fase 8c
abaixo).**

## Fase 8c (exercício interativo novo: "completar a frase") -- último sub-passo da Fase 8

**Escopo grillado em 1 rodada (4 perguntas) antes de codar**, mesma
disciplina de toda a Fase 8:

1. *Que tipo de exercício?* -- **Completar a frase (recomendado)** --
   professora escreve uma frase com uma lacuna (`___`), a aluna digita a
   palavra que falta.
2. *Arquitetura de dado?* -- **Estender `teacher_flashcards`
   (recomendado)** -- colunas novas opcionais, nunca uma tabela nova,
   mesmo padrão aditivo de imagem/áudio/múltipla escolha (Fase 8a).
3. *Integração com revisão/FSRS?* -- **Mesma fila/FSRS (recomendado)** --
   acerto=Bom(2), erro=Errei(0), mesma convenção da múltipla escolha
   (Fase 8a), reaproveitando `gradeCurrentCard()`.
4. *Multi-atribuição?* -- **Sim (recomendado)** -- mesmo padrão de
   checkboxes multi-select já usado em flashcards (adendo da Fase 8a) e
   material de apoio (Fase 8b).

**Quarto formato de `teacher_flashcards`, mutuamente exclusivo com
`choices` (múltipla escolha)** -- os dois mudam a MECÂNICA de revisão do
cartão (como o aluno responde), então não fazem sentido coexistindo no
mesmo cartão; imagem/áudio continuam livres pra combinar com qualquer um
dos dois (ou nenhum), por não mudarem mecânica nenhuma.

**O que foi feito:**

- **Migration `034_add_cloze_to_teacher_flashcards.sql`** -- 3 colunas
  novas em `teacher_flashcards`: `cloze_sentence` (a frase com a lacuna
  marcada literalmente como `___`, 3 underscores), `cloze_answer` (a
  resposta certa -- aceita "/" pra mais de uma forma, mesma convenção de
  `acceptedForms()` já usada pelos exercícios digitados da trilha),
  `cloze_answer_pinyin` (só relevante pro zh -- o que a aluna
  efetivamente DIGITA; teclado latino não digita hanzi, mesmo motivo
  pelo qual o cloze da trilha em zh já pede pinyin, não hanzi -- fica
  sempre `null` no fr). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` -- não é passo manual pendente pra
  autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()` estendido com
  `clozeSentence`/`clozeAnswer`/`clozeAnswerPinyin` (todos opcionais,
  vazio = cartão sem esse formato). Validação: se `clozeSentence` foi
  preenchida, precisa conter EXATAMENTE um `___` (senão não há onde a
  aluna digitar, ou é ambíguo qual lacuna é a certa), `clozeAnswer` não
  pode ficar vazia, e -- só quando `languageAppKey==='mandarim'` --
  `clozeAnswerPinyin` também é obrigatório (sem ele o cartão não teria
  como ser comparado contra o que a aluna digita).
- **`shared/admin-flashcards.js`** -- checkbox "Completar a frase" no
  formulário, ao lado do de múltipla escolha (Fase 8a), revelando 2-3
  campos (frase com `___`, resposta certa, +pinyin só quando alguma aluna
  selecionada é de mandarim). **Mutuamente exclusivo na própria UI, não
  só na validação do submit** -- marcar "Múltipla escolha" desmarca e
  esconde "Completar a frase" automaticamente, e vice-versa (mesmo
  raciocínio de UX já usado em outras exclusividades do app: melhor
  impedir o estado ambíguo de existir do que só rejeitar no fim). Badge
  novo na lista de cartões (`📝 completar frase`) ao lado dos já
  existentes de imagem/áudio/múltipla escolha. Submit handler estendido
  pra ler os 3 campos e passá-los em cada chamada de `createFlashcard()`
  do loop multi-aluna (mesmo padrão de `frontPinyin`: `clozeAnswerPinyin`
  só vai junto nas linhas cujo idioma é mandarim).
- **`fr/app.js`/`zh/app.js`**:
  - `buildCardFromTeacherFlashcard(row)` ganhou `clozeSentence`/
    `clozeAnswer` (+ `clozeAnswerPinyin` só no zh) no card construído.
  - `startReviewSession()` ganhou `STATE.reviewClozeAnswered = null;`,
    mesmo espírito do reset de `STATE.reviewMCPicked`/`reviewMCCorrect`
    já existente (zera estado transitório de uma pergunta que possa ter
    ficado "respondida, aguardando Continuar" de uma sessão anterior
    interrompida no meio).
  - `renderReviewView()` ganhou um novo desvio, logo depois do de
    `card.choices` (múltipla escolha): se `card.clozeSentence &&
    card.clozeAnswer`, chama `renderClozeReviewCard(card)` em vez do
    flip tradicional -- nunca coexistem (garantido na criação).
  - **`renderClozeReviewCard(card)`** (nova função, fr+zh) -- reaproveita
    100% do idioma visual já existente do cloze da trilha
    (`.cloze-sentence`/`.cloze-blank`/`.cloze-type-wrap`,
    `frAccentPickerHTML()`/`pinyinTonePickerHTML()`) dentro do wrapper
    `.flashcard` já usado por todo cartão de revisão (mesma tag "Da sua
    professora", imagem/áudio próprio quando presentes, igual à Fase
    8a). Estado não respondido: input de texto + teclinha de
    acento/tom + botão "Verificar". Ao verificar, compara o texto
    digitado (normalizado -- `normalizeLoose()` no fr,
    `normalizePinyinAnswer()` no zh -- e sem pontuação, mesma função
    `strip()` já usada pelo cloze da trilha) contra
    `acceptedForms(card.clozeAnswer)` no fr ou
    `acceptedForms(card.clozeAnswerPinyin)` no zh (a aluna SEMPRE digita
    pinyin no zh, nunca hanzi -- mesmo motivo do cloze da trilha).
    Estado respondido: revela a resposta certa dentro do próprio espaço
    da lacuna (`.cloze-blank.correct`/`.incorrect`, reaproveitando as
    MESMAS classes CSS -- já calibradas -- do cloze da trilha, zero CSS
    novo), mostra a tradução, e troca pro botão "Continuar"
    (`.mc-continue-btn`, reaproveitado da Fase 8a) que chama
    `gradeCurrentCard(wasCorrect ? 2 : 0)` -- herda de graça toda a
    plumbing já existente (XP, streak, requeue-em-erro, save, avanço de
    índice), mesma disciplina de "um motor só" de toda a feature.
  - `buildSpeedOptions()` **não precisou de nenhuma mudança** -- um
    cartão só-cloze (sem `choices`) continua caindo no mesmo fallback de
    distratores computados que já existia antes da Fase 8a pra cartão
    de professora sem múltipla escolha própria; o desvio pra
    "completar a frase" só existe dentro de `renderReviewView()`
    (Flashcard/Palavras Difíceis), nunca no Speed Review -- mesmo escopo
    que a múltipla escolha já teve (grillado na Fase 8a, não reaberto
    aqui).
- **Zero CSS novo** -- `.cloze-sentence`/`.cloze-hanzi`/`.cloze-pinyin`/
  `.cloze-blank`/`.cloze-type-wrap`/`.pinyin-tone-picker` já existiam nos
  dois `index.html` (do cloze da trilha) e o botão "Continuar" reaproveita
  `.mc-continue-btn` (Fase 8a) -- confirmado por leitura antes de
  escrever qualquer linha de CSS (regra deste arquivo sobre reaproveitar
  tokens/classes existentes em vez de duplicar).

**Decisões arquiteturais tomadas nesta fase:**
1. `cloze_sentence`/`cloze_answer` são a fonte de verdade do formato --
   `front`/`back_trans` continuam obrigatórios e sempre presentes (regra
   de schema desde a Fase 2), então um cartão cloze também tem um
   front/back "normal" por baixo, só que a tela de revisão nunca mostra
   esse par quando o cloze está presente (mesmo princípio já usado pela
   múltipla escolha, que também não descarta `back_trans` -- ele vira a
   opção certa dentro de `card.mcOptions`).
2. Mutuamente exclusivo com `choices` decidido e IMPOSTO NA UI (toggle
   exclusivo), não só documentado como convenção -- mesma escolha de
   design já tomada pela Fase 8a entre si e agora estendida ao par
   MC/cloze, evitando um estado ambíguo (as duas mudam a mesma coisa:
   como a aluna responde) chegar a existir no banco.
3. zh compara contra pinyin (`clozeAnswerPinyin`), nunca hanzi
   (`clozeAnswer`) -- decisão derivada diretamente de como o cloze da
   trilha já funciona (`normalizePinyinAnswer`/teclado latino), não uma
   escolha nova; `clozeAnswer` (hanzi) só é usado pra REVELAR a resposta
   depois de julgada, nunca pra comparação.
4. Nenhuma mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS --
   mesma conclusão já validada pela múltipla escolha na Fase 8a: um
   formato novo de APRESENTAÇÃO/RESPOSTA não precisa tocar a fila que
   decide QUAIS cartões aparecem, só o ponto de RENDER
   (`renderReviewView()`) e o motor de nota permanece
   `gradeCurrentCard()` de sempre.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão de
toda a Fase 2 em diante -- conteúdo autorado pela própria professora pras
próprias alunas, sem custo marginal de servir. Mesma pergunta em aberto
já registrada repetidamente pra quando houver mais de uma professora na
plataforma -- nada específico a este formato (texto puro, sem mídia) que
mudasse essa conclusão.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`
e `zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão
de stub de `window.supabase.createClient()` de toda a feature: (1) toggle
"Completar a frase" revela os campos certos e é mutuamente exclusivo com
"Múltipla escolha" nos dois sentidos (marcar um desmarca e esconde o
outro); (2) validação rejeita frase sem `___`, frase com `___` mas sem
resposta, e (zh) resposta sem pinyin -- nenhum dos 3 grava no banco
(`dbCountAfter*Reject:0` em todos os casos); (3) submit válido cria o
cartão com `cloze_sentence`/`cloze_answer`/`cloze_answer_pinyin`
corretos e sem `choices`, badge "📝 completar frase" aparece na lista;
(4) lado da aluna -- cartão com `clozeSentence`+`clozeAnswer` confirmado
desviando pra `renderClozeReviewCard()` (nunca vira card normal, nunca
mostra `.mc-option`), sentença renderiza com a lacuna como `___`; digitar
uma resposta ERRADA aplica `.cloze-blank.incorrect`, revela a resposta
certa no próprio espaço da lacuna, `gradeCurrentCard(0)` confirmado
disparando de verdade (`due`/`reps` do cartão mudam); digitar a resposta
CERTA (fr: a palavra; zh: o pinyin) aplica `.cloze-blank.correct`,
`gradeCurrentCard(2)` confirmado (`due`/`reps` mudam); `buildSpeedOptions()`
confirmado continuando a funcionar normalmente pra um cartão só-cloze
(sem `choices`), sem erro. Testado nos dois idiomas (fr+zh). Sem erro de
console novo atribuível a este código (mesmos 2 `pageerror` de mock --
`.is()`/`.upsert()` -- já registrados em toda a feature).

**Validação visual das 4 combinações obrigatórias** (regra deste arquivo
pra qualquer elemento com cor de fundo customizada, ver seção "Tokens de
cor de marca vs. semânticos" -- aplicada aqui mesmo sem CSS novo, por
prudência, já que o contexto visual -- dentro do wrapper `.flashcard` --
era novo mesmo reaproveitando classes antigas): screenshot Playwright de
fr-claro, fr-escuro, zh-claro, zh-escuro, nos 3 estados (não respondido /
resposta errada / resposta certa) -- texto legível em todos, nenhum
problema de contraste encontrado; `.cloze-blank.correct`/`.incorrect`
herdam as MESMAS cores já calibradas pelo cloze da trilha (nunca
recalculadas aqui), então o risco que motivou aquela seção do arquivo
(sobrescrever só `background` sem revisar `color` junto) não se aplica --
nenhum dos dois foi tocado nesta fase.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não ganhou o
  formato cloze -- mesma decisão de escopo já tomada na Fase 8a pros
  outros 3 formatos (imagem/áudio/múltipla escolha): estender pro cartão
  auto-criado é trabalho natural de uma fase futura, não decidido nem
  começado aqui.
- Combinar (jogo de pareamento) não tenta suportar cloze de forma
  alguma -- mesma exclusão já registrada na Fase 8a pra múltipla escolha,
  mesmo motivo (arquitetura incompatível com "1 pergunta, 1 resposta
  digitada" dentro de um jogo de pares).
- Edição de um cartão já criado com cloze (só trocar a frase/resposta)
  não foi implementada -- mesmo escopo restrito que todo o resto de
  `teacher_flashcards` já tem desde as Fases 2/3 (só criar e
  arquivar/reativar).
- **Esta era a última sub-fase nomeada no grilling original da Fase 8**
  (8a formatos de flashcard → 8b material de apoio → 8c exercício
  interativo, ordem travada e cumprida). Com 8c entregue, a Fase 8 do
  prompt-mestre original ("outros tipos de conteúdo") está com todo o
  escopo grillado até aqui completo -- qualquer trabalho além disso
  (estender cloze/MC/mídia pra `student_flashcards`, editar conteúdo já
  criado, integrar `gramatica-coloquial` das notas de realidade à
  correção de exercícios digitados, Fase 6b/7 já entregues mas com itens
  em aberto próprios) é fora do prompt-mestre original desta feature e
  precisa de autorização/escopo explícitos numa sessão futura, não
  presumido como próximo passo automático.

## UX-fix: formulário de "Novo flashcard" -- bug de seleção nunca-vazia + hierarquia visual

Mesmo dia da entrega da Fase 8c, a autora revisou a tela real (print
anexado) e mandou uma crítica de UX detalhada, ponto a ponto (17 itens).
Não é uma fase nova do prompt-mestre da feature "alunas particulares" --
é uma correção pontual de UX na tela de admin que a Fase 8a/8c já tinham
construído, motivada por um problema real que ela identificou, não só
preferência estética.

**O achado principal, tratado como bug real, não só gosto**: desde a
Fase 8a, a seleção de alunas (checkboxes multi-seleção) nunca podia ficar
genuinamente vazia -- o código caía de volta pra "a primeira aluna já
vem marcada" toda vez que o `Set` esvaziava, inclusive imediatamente
depois de clicar "Limpar seleção". A autora identificou exatamente o
risco: um erro do tipo "selecionar outra pessoa e esquecer que a
primeira continuou marcada" é especialmente perigoso numa ferramenta
administrativa (criar um cartão pra aluna errada por engano). Como ela
descreveu: "o estado inicial deve representar zero destinatários
selecionados" -- e "Limpar seleção" deve sempre resultar em exatamente
zero, nunca reverter pra ninguém.

**Decisões tomadas, sem nova rodada de grilling** (a crítica da autora já
veio com 17 pontos concretos e justificados; distingui os que eram bug
real/pedido direto dos que eram sugestão especulativa antes de
implementar, sem devolver pergunta pra ela sobre cada um):

1. **Corrigido nos 2 lugares onde o mesmo padrão existia**
   (`shared/admin-flashcards.js` e `shared/admin-support-materials.js`,
   ambos documentados desde a Fase 8b/8a addendum como "mesmo padrão
   copiado de propósito"): removida a linha que recaía pra "primeira
   aluna" quando o Set esvaziava. Seleção vazia agora é um estado válido
   e persistente. Botão "Criar cartão"/"Enviar material" fica
   `disabled` nesse estado (com contador visível acima do form: "Nenhuma
   aluna selecionada" / "N aluna(s) selecionada(s)"), e a validação de
   submit já existente continua como cinto-de-segurança extra caso o
   `disabled` seja contornado de algum jeito.
2. **Hierarquia visual em `admin-flashcards.js`** (única tela que a
   autora efetivamente screenshotou e criticou em detalhe -- a de
   Material de apoio só recebeu o fix de bug acima, não o redesenho
   completo, por não ter sido a tela mostrada): reorganizado em 3 blocos
   rotulados -- "Destinatários" (fora do `<form>`, como já era) →
   "Conteúdo" (com um sub-rótulo "Recursos opcionais" agrupando nota/
   imagem/áudio) → "Modo de prática" (dentro do mesmo `<form>`, agora
   como um **radio group nativo** `name="admin-flashcard-mode"` com 3
   opções -- Flashcard normal / Múltipla escolha / Completar a frase --
   em vez dos 2 checkboxes independentes da Fase 8c que precisavam de JS
   forçando a exclusividade um no outro. A exclusividade MC/cloze
   (decidida na Fase 8c) agora é o próprio HTML, não uma regra imposta
   por cima. Reaproveita `.section-label` (já existente no CSS, usado
   como cabeçalho de `.profile-section`) como cabeçalho de cada
   sub-bloco dentro do mesmo painel -- **zero CSS novo**.

**Pontos da crítica da autora explicitamente NÃO implementados, com
justificativa registrada aqui pra não parecer esquecimento:**
- **Renomear "Alunas" → "Alunos"**: ela sugeriu isso pra neutralidade de
  gênero futura. Não implementado -- "aluna"/"alunas" é usado
  consistentemente em dezenas de arquivos desta feature desde a Fase 1
  (reflete o roster real e 100% feminino da autora hoje, confirmado ao
  vivo: "1 admin, 21 alunas"). É uma mudança de terminologia grande e
  transversal ao produto inteiro, não uma correção de UX pontual --
  fica pra decisão explícita futura, não presumida numa sessão que
  estava corrigindo outra coisa.
- **Bloquear seleção de alunas com idiomas diferentes na mesma
  criação**: a crítica presumia que isso já era um bug ("isso não pode
  ser atribuído aos dois"). Investigado e confirmado que NÃO é um bug --
  desde o adendo da Fase 8a, o código já cria uma linha por aluna no
  idioma DELA (`language_app_key` de cada uma, nunca misturado), testado
  explicitamente com seleção mista fr+zh na época. Bloquear seria
  remover uma feature que já foi pedida e testada, não corrigir algo
  quebrado -- por isso não implementado. O título "Novo flashcard --
  Português (em breve)" do print da autora só mostra o idioma quando
  EXATAMENTE 1 aluna está selecionada (comportamento correto); com 2+,
  já mostrava "N alunas selecionadas" sem citar idioma nenhum.
- **Busca/paginação na lista de alunas**: prematuro com ~22 alunas reais
  hoje (a lista já tem scroll interno de 180px). Fica pra quando o
  volume justificar.
- **Largura/alinhamento do botão "Criar cartão"**: ela sugeriu
  encurtar/alinhar à direita. Não alterado -- `btn btn-primary
  btn-block` (largura total) é a convenção usada em TODO submit
  primário desta feature inteira (Fases 2 a 8b, dezenas de forms);
  mudar só este botão quebraria a consistência visual do Painel de
  Admin como um todo, não seria uma melhoria isolada.
- **Copy do rótulo de "Áudio próprio"**: ela sugeriu encurtar. Mantido o
  texto original ("Áudio próprio (além da pronúncia automática)") --
  confirmado no código que o áudio próprio TOCA JUNTO com a pronúncia
  automática (TTS), não a substitui, então o texto já descreve o
  comportamento real; risco de simplificar demais e a frase parar de
  ser precisa.

**Testes realizados:** `node --check` sem erro nos 2 arquivos tocados.
Validação funcional via Playwright (fr), cobrindo especificamente o bug
relatado: estado inicial com 0 alunas marcadas, contador "Nenhuma aluna
selecionada", botão desabilitado; selecionar 1 aluna atualiza o
contador e habilita o botão; "Selecionar todas" marca todas; "Limpar
seleção" zera de verdade (`checkedCountAfterClear:0`); selecionar uma
aluna DIFERENTE logo depois de limpar resulta SÓ nela marcada
(`pickedIsSecondOnly:true` -- o cenário exato que a autora descreveu como
perigoso, confirmado corrigido); radio group testado nos 3 sentidos
(flip→mc→cloze→flip, campos certos aparecendo/escondendo, exclusividade
nativa sem JS extra); fluxo de criação completo ainda funciona
(`cardCreated:true`, atribuído à aluna certa). Mesmo fix replicado e
testado em "📚 Material de apoio". Sem erro de console novo atribuível a
este código (mesmos 2 `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature). Validação visual (screenshot Playwright,
fr claro + escuro, estado vazio e estado com seleção mista fr+zh em modo
múltipla escolha) confirma a hierarquia nova legível nos dois temas --
esperado, já que reaproveita só classes CSS já calibradas, nenhuma cor
nova introduzida.

**Escopo**: só `shared/admin-flashcards.js` (redesenho completo) e
`shared/admin-support-materials.js` (só o fix de bug, sem redesenho --
não foi a tela criticada). `shared/admin-class-logs.js` ("📝 Aulas") não
tem o mesmo padrão -- usa um `<select>` de aluna única, que sempre tem um
valor por natureza do próprio elemento HTML, não o mesmo bug.

## UX-fix 3: "aluna"→"aluno" em todo texto visível + busca por @usuário na seleção de destinatários

Mesmo dia da UX-fix 2 acima, 3 instruções diretas e curtas da autora, sem
grilling (eram claras o bastante pra não precisar de rodada de perguntas):
"Siga para a próxima aba que você quiser ajustar.", "Mude aluna para
alunos.", "Busca é mais interessante do que paginação." -- a 3ª reabre e
inverte explicitamente minha própria decisão anterior (UX-fix 2 registrada
acima) de adiar busca/paginação como "prematuro".

**Escopo do rename "aluna"→"aluno", decisão minha não detalhada pela
autora, registrada aqui pra ficar auditável**: só texto VISÍVEL (labels,
hints, placeholders, botões, toasts, mensagens de erro, `title`/tooltip,
texto de modal) -- comentários de código e todo o histórico já escrito
neste CLAUDE.md (inclusive as seções acima, que usam "aluna"/"alunas"
consistentemente desde a Fase 1) foram deixados como estão. Motivo: são
registro histórico de como a decisão foi tomada, não UI que a professora
ou a aluno vê -- reescrever retroativamente o histórico deste arquivo
apagaria o contexto real de quando/por que cada escolha foi feita. Seções
NOVAS daqui pra frente (como esta) já nascem usando "aluno"/"alunos" como
termo corrente.

Arquivos com texto visível corrigido: `shared/admin-flashcards.js`,
`shared/admin-support-materials.js`, `shared/admin-class-logs.js`,
`shared/admin-students.js`, `shared/admin-analytics.js` (pill de Admin
Mode: descrição + toast), `shared/my-flashcards.js` (pill "Aluno
vinculado"), `shared/teacher-flashcards.js` (erro de validação de
pinyin), `shared/auth.js` (toast de Admin Mode), `fr/index.html`+
`zh/index.html` (`title` do botão de Admin Mode + texto do modal de
limite de cartões, Fase 5.1). Cada troca revisada pra concordância de
gênero nas palavras vizinhas (`vinculada`→`vinculado`,
`nenhuma`→`nenhum`, `esta`→`este`, `ela`→`ele`, `selecionada(s)`→
`selecionado(s)`, etc.) -- nunca find-replace cego. Conferido por grep
completo no fim: todas as ocorrências restantes de "aluna" no
repositório são comentário de código, HTML `<!-- -->`/CSS `/* */`, ou
texto histórico deste arquivo -- nenhuma some de tela nenhuma.

**Achado incidental, corrigido de graça pelo rename**: o texto de estado
vazio de `admin-flashcards.js` tinha um bug de português pré-existente
(`` `Nenhum cartão ainda pra${n>1 ? 's essas alunas' : ...}` ``, que
concatenava pra "pras essas alunas" -- duplo artigo errado, "para as
essas alunas"). A troca pro texto novo (`' esses alunos'`) já corrige
isso de passagem, não foi um fix buscado deliberadamente.

**"Próxima aba" escolhida por mim (escopo aberto na instrução da
autora, sem ela nomear qual)**: "📚 Material de apoio" -- estruturalmente
quase idêntica a "📇 Flashcards" (mesmo padrão de checkboxes
multi-seleção + formulário único), por isso foi a candidata natural pra
herdar a mesma melhoria de hierarquia/busca sem trabalho de design novo.
"📝 Aulas" ficou de fora de propósito -- usa um `<select>` de aluno único,
que por natureza do próprio elemento HTML nunca fica "vazio sem querer"
e não tem lista pra buscar, então não se beneficia do mesmo fix.
Registrando aqui explicitamente porque foi decisão minha sobre uma
instrução aberta ("a próxima aba que você quiser") -- se a intenção era
outra aba, é só redirecionar.

**Busca por @usuário, adicionada em `admin-flashcards.js` E
`admin-support-materials.js`** (as duas telas com lista de checkboxes de
alunos): `<input type="text">` (reaproveita `.profile-edit-input`, zero
CSS novo) que filtra as linhas via `style.display` direto no DOM
(`row.style.display = !q || username.includes(q) ? '' : 'none'`), SEM
re-renderizar a view inteira -- decisão técnica deliberada: as funções de
render são `async` e mostram um estado de loading antes de resolver a
busca de rede, então re-renderizar a cada tecla digitada perderia o foco
do campo de busca (o cursor "sumiria" do input a cada letra). Filtro
puro client-side sobre a lista já carregada, sem chamada de rede nova.

**Testes realizados**: `node --check` sem erro em todos os arquivos
tocados. Playwright (fr): confirmado texto "Selecione os alunos..." (não
"alunas"), contador "Nenhum aluno selecionado"/"N alunos selecionados"
(singular/plural corretos), "Selecionar todos"/"Vincular aluno"/"Seus
alunos (N)" nas 3 abas (Flashcards/Alunos/Material de apoio); busca
digitando "joa" filtra pra só a linha de @joao (`visibleAfterSearch`),
foco do input preservado durante a filtragem (`focusRetained:true`),
limpar a busca restaura todas as linhas; mesmo padrão replicado e
validado em "📚 Material de apoio" (busca por "marc" filtra pra só
@marconi). Screenshot (fr, tema claro) confirma visualmente a seção
"DESTINATÁRIOS" com busca funcionando (digitado "li", só `@li_wei --
Chinês` visível) sem defeito de layout. Sem erro de console novo
atribuível a este código (mesmos `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a feature). **Não foi tirado
screenshot de tema escuro nesta rodada** -- risco considerado baixo
porque nenhuma cor/CSS nova foi introduzida (só texto e um `<input>`
reaproveitando classe já calibrada nos dois temas), mas registrando aqui
por completude/honestidade, mesmo padrão já usado quando outras entregas
desta feature validaram só um cenário.

**O que ainda falta / não foi feito nesta rodada (de propósito)**:
- Nenhuma migração de schema -- mudança 100% client-side (texto + filtro
  DOM).
- "📝 Aulas" não ganhou busca (ver justificativa acima -- `<select>` não
  se beneficia do mesmo padrão).
- Nenhum passo manual pendente pra autora nesta entrega.

## UX-fix 4: "Aulas" ganha o mesmo multi-select das outras 2 telas + rótulo "Alunos" unificado nas 3

A autora testou a entrega da UX-fix 3 acima e voltou com 2 pontos: (1)
"Aulas" deveria ter o mesmo multi-select de Flashcards/Material de apoio
-- a justificativa da UX-fix 3 ("`<select>` não se beneficia do mesmo
padrão") tratava só a ausência de busca, não considerou que a autora
queria a MESMA MECÂNICA de seleção (múltiplos alunos de uma vez) nas 3
telas, não só em 2; (2) unificar "Alunos"/"Destinatários" como "Alunos"
nas 3 telas -- eram 2 rótulos diferentes pro mesmo bloco (Flashcards/
Material de apoio diziam "Destinatários", Aulas dizia "Aluno"); (3) ela
relatou não estar vendo a caixa de busca em Flashcards/Material de apoio.

**Investigação do ponto 3 antes de mudar qualquer coisa**: reli
`shared/admin-flashcards.js` e `shared/admin-support-materials.js` -- a
caixa de busca (`#admin-flashcard-search`/`#admin-material-search`) já
estava no código desde a UX-fix 3, corretamente wireada. Validado ao vivo
via Playwright (`offsetParent !== null`, ou seja renderizada e visível no
DOM, não `display:none`) nos dois arquivos -- a busca funciona no código
atual. A explicação mais provável é a autora ter testado antes do cache
do navegador/service worker pegar o deploy mais recente (o app já tem um
fix de auto-reload em atualização de service worker, mas pode haver uma
janela entre o merge e o primeiro carregamento novo) -- não um bug
reintroduzido. Se ela continuar sem ver a busca depois de um F5/recarregar
forçado, é uma regressão real e vale investigar de novo com mais detalhe
(print da tela, inspecionar o DOM ao vivo).

**O que foi feito pros pontos 1 e 2:**

- **`shared/admin-class-logs.js` reescrito** pro mesmo padrão de
  `ADMIN_FLASHCARDS_STATE`/`ADMIN_MATERIALS_STATE`: `ADMIN_CLASS_LOGS_
  STATE.studentId` (único) virou `.studentIds` (`Set`), com checkboxes +
  busca por `@usuário` + "Selecionar todos"/"Limpar seleção" + contador
  ("Nenhum aluno selecionado"/"N aluno(s) selecionado(s)"), idêntico ao
  bloco já usado nas outras 2 telas. Registrar uma aula com vários alunos
  marcados cria **uma linha em `teacher_class_logs` por aluno selecionado**
  (mesmo conteúdo pra todos) -- mesmo padrão já usado em
  `teacher_flashcards`/`teacher_support_materials`, e faz sentido aqui
  também: uma aula em grupo tem o mesmo tópico/lição de casa pra todo
  mundo. A lista "Aulas registradas" agora agrega os logs de TODOS os
  alunos selecionados (antes só o do `<select>` único), com `@username`
  prefixado quando há mais de um selecionado -- mesmo critério visual já
  usado nas outras 2 telas.
- **Rótulo unificado como "Alunos"** (era "Destinatários" em Flashcards/
  Material de apoio, "Aluno" em Aulas) -- as 3 seções agora dizem só
  "Alunos", texto de hint específico por tela continua diferente ("...que
  vão receber este cartão"/"...este material"/"...desta aula").
- **`shared/teacher-class-logs.js` não precisou de NENHUMA mudança** --
  `createClassLog({studentId, ...})` já aceitava um `studentId` por
  chamada; a tela de admin só passou a chamá-la em `Promise.all()` uma
  vez por aluno selecionado, mesmo padrão já usado em `createFlashcard`/
  `createSupportMaterial`.
- Edição/exclusão de uma aula já registrada continuam operando em UMA
  linha por vez (por `id`), sem relação com a seleção multi-aluno do
  formulário "Nova aula" -- não precisou de mudança, `updateClassLog`/
  `deleteClassLog` já recebiam só o `id`.

**Testado (Playwright, fr, mesmo padrão de stub das entregas
anteriores):** as 3 telas mostram "Alunos" como rótulo; busca confirmada
presente E VISÍVEL (`offsetParent !== null`) em Flashcards e Material de
apoio; em Aulas -- checkboxes presentes (`classLogsCheckboxCount:3`),
contador "Nenhum aluno selecionado" no estado vazio, botão desabilitado;
selecionar 2 alunos (clique sequencial, aguardando o re-render entre um
clique e outro -- clicar os dois sem esperar bate num nó já substituído
pelo re-render anterior, artefato só do script de teste, não do app real)
confirma contador "2 alunos selecionados" e texto do botão "Registrar
aula pra 2 alunos"; submeter cria 2 linhas no banco
(`dbCountAfterCreate:2`), lista mostra as 2 com `@sandra`/`@joao`
prefixados; "Limpar seleção" zera de verdade; busca por "pri" filtra pra
só `@priscila`. Screenshot (fr, claro E escuro) confirma a tela
renderizando corretamente nos dois temas, sem quebra visual -- validado
mesmo sem CSS novo (reaproveita 100% as classes já calibradas de
Flashcards/Material de apoio). Sem erro de console novo atribuível a
este código (mesmos 2 `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature). `node --check` sem erro.

**Achado incidental, não corrigido nesta entrega (fora do pedido)**: os
links "Selecionar todos"/"Limpar seleção" (`<a href="#">` sem cor
customizada, herdando a cor padrão de link do navegador) ficam com
contraste baixo no tema escuro -- visível no screenshot desta entrega,
mas é o MESMO markup já usado em Flashcards/Material de apoio desde a
UX-fix 3 (não introduzido por esta mudança), e aquela entrega não tinha
validado tema escuro (registrado lá como pendência). Não corrigido aqui
por estar fora do escopo do pedido desta rodada -- registrando pra uma
sessão futura tratar como um ajuste de contraste pontual nas 3 telas
juntas (reaproveitar um token `--link`/similar em vez de cor padrão do
navegador), não uma urgência.

**Escopo**: só `shared/admin-class-logs.js` foi reescrito. Nenhuma
migração, nenhum passo manual pendente pra autora.

## UX-fix 5: bug crítico -- digitar no formulário e marcar mais um aluno APAGAVA o texto digitado

A autora reportou um bug sério, testando a entrega da UX-fix 4: "As soon
as I start to type in the field boxes, when I check one student (or one
more student if one was already selected) it ERASES what I had been
writing!!" -- confirmado real ao reler o código, não uma percepção errada.

**Causa raiz**: nas 3 telas (Flashcards/Material de apoio/Aulas), TODA
mudança de seleção de aluno (marcar/desmarcar checkbox, "Selecionar
todos", "Limpar seleção") chamava a função de render COMPLETA de novo
(`renderAdminFlashcardsView()` etc.), que reconstrói `wrap.innerHTML`
inteiro -- inclusive o `<form>` de "Novo cartão"/"Novo material"/"Nova
aula" que estava logo ao lado, com qualquer texto que a professora já
tivesse digitado nele. Existia desde a Fase 8a (quando o `<select>` de
aluno único virou checkboxes multi-seleção) -- um `<select>` só muda de
valor numa ação isolada (clicar a opção nova), então o mesmo padrão de
"toda mudança = re-render completo" nunca tinha causado esse problema
antes; com checkboxes, marcar MAIS de um aluno é o fluxo normal, e cada
clique adicional apagava o formulário.

**Fix, mesmo princípio nas 3 telas**: reestruturado o render em CAIXAS
independentes dentro do mesmo `wrap` -- "Alunos" (busca+checkboxes),
"Conteúdo"/form (nunca mais recriado por causa de seleção), e a lista de
itens existentes (cartões/materiais/aulas, numa caixa própria). Mudar a
seleção agora chama uma função nova
(`updateFlashcardsSelectionDependentUI()`/`updateMaterialsSelectionDependentUI()`/
`updateClassLogsSelectionDependentUI()`) que atualiza SÓ o que realmente
depende da seleção -- contador, subtítulo, visibilidade do campo pinyin
(flashcards), texto/disabled do botão de submit, e a lista de itens
existentes (essa sim precisa ser re-buscada, mas vive numa caixa
separada do form, então recriar SÓ ela nunca toca no texto digitado) --
tudo via manipulação direta do DOM (`textContent`/`style.display`/
`.disabled`/`.placeholder`), nunca via `innerHTML =` no `<form>`. O
`<form>` em si só é recriado (e portanto só "limpa") em 2 momentos
intencionais: o carregamento inicial da aba, e depois de um submit bem
sucedido (aí sim o formulário deve mesmo esvaziar). `ADMIN_*_STATE.
_studentsCache` guarda a lista de alunos entre esses updates
incrementais -- evita um round-trip de rede (`fetchMyStudents()`) a cada
clique de checkbox, já que a lista de alunos em si não muda nesse meio
tempo (só a seleção muda).

**Decisão de arquitetura, registrada explicitamente**: o hook desta
sessão recomendou o subagent "code architecture reviewer" pra esta
tarefa. Optei por implementar diretamente em vez de delegar -- o
histórico completo de decisões destas 3 telas (por que cada campo existe,
por que certas exclusões foram feitas, etc.) está só nesta conversa/neste
CLAUDE.md, e um subagent novo perderia esse contexto. Mantive também a
convenção já estabelecida no resto desta feature (Fases 2-8): as 3 telas
continuam com lógica DUPLICADA de propósito (cada uma com seu próprio
`ADMIN_*_STATE`, sua própria função de render, seu próprio conjunto de
funções incrementais) em vez de extrair um módulo compartilhado novo --
consistente com o padrão já usado em toda a feature até aqui (nunca
houve uma tentativa de abstrair as 3 telas num componente genérico, e
introduzir isso só agora, no meio de um fix de bug, seria uma mudança
arquitetural maior do que o pedido em si).

## Pedidos relacionados, mesma entrega: busca por nome + filtro por idioma

A mesma mensagem trouxe 2 pedidos de UX adicionais, tratados na mesma
entrega por tocarem o mesmo código:

1. **Busca agora casa por NOME, não só por @usuário** -- a autora decora
   o nome das alunas, não o username. Cada linha de checkbox ganhou
   `data-searchtext` (nome + username, minúsculo, combinados) em vez de
   só `data-username`; o filtro de busca (mesmo mecanismo de DOM já
   existente, `style.display`, sem re-render) passou a casar contra essa
   string combinada. O rótulo do checkbox também mudou de "@usuário" pra
   "Nome (@usuário)" (com fallback pro @usuário sozinho quando não há
   `display_name` cadastrado) -- exatamente o formato "nome com o usuário
   entre parênteses" que ela pediu.
2. **Filtro por idioma** (pills reaproveitando `.leaderboard-tab`/
   `.active` -- mesma classe já usada nas sub-abas do Painel de Admin,
   zero CSS novo) nas 3 telas. **Construído dinamicamente a partir dos
   idiomas REALMENTE presentes na lista de alunos da professora**, nunca
   hardcoded fr/pt -- a autora pediu especificamente "francês" e
   "português" como exemplo, mas hardcodear só esses dois teria sido o
   mesmo tipo de erro genérico já evitado em outras partes desta feature
   (ex: `STUDENT_LANGUAGE_LABELS` já cobre os 3 valores do enum). As
   pills só aparecem quando há mais de 1 idioma presente (ruído puro com
   só 1) -- hoje, com o roster real dela (só fr, sem pt/mandarim ainda),
   elas não apareceriam; passam a aparecer sozinhas assim que ela vincular
   a primeira aluna de português. Filtro de idioma e busca combinam (E
   lógico) via o mesmo mecanismo puro de DOM, sem re-render.

**Confirmação pedida pela autora, verificada no código antes de
responder**: ela perguntou explicitamente se o campo de seleção de
aluno (que só cobre francês/português, nunca mandarim, por ela nunca ter
aluna de mandarim) bloquearia usuários de QUALQUER idioma -- inclusive
mandarim -- de criar os PRÓPRIOS flashcards. **Não bloqueia, confirmado
lendo `shared/my-flashcards.js`**: "📇 Meus Cartões" (Fase 5) é uma
feature completamente separada da gestão de alunas da professora --
`renderMyFlashcardsView()` não chama `fetchMyStudents()`/`teacher_
students` em nenhum momento, é escopada só por `APP_KEY` (o idioma do
site em que a conta está logada, `fr`/`zh`/futuramente `pt`) e por
`CURRENT_USER`. Qualquer conta logada em `zh/index.html` continua
podendo criar seus próprios cartões de mandarim normalmente, vinculada
ou não a alguma professora -- `hasActiveTeacherLink()` (Fase 5.1) só
decide se o TETO de 20 cartões se aplica, nunca se a feature em si está
disponível. O filtro de idioma desta entrega vive só dentro do Painel de
Admin (ferramenta de gestão da professora sobre SUAS alunas vinculadas),
nunca na tela "Meus Cartões" (que nem tem seleção de aluno pra começo de
conversa -- ver Fase 5 acima).

**Testes realizados**: `node --check` sem erro nos 3 arquivos. Playwright
(fr), cobrindo especificamente o bug relatado: digitar frente/verso/nota
no formulário de Flashcards, depois marcar um SEGUNDO aluno -- texto
confirmado intacto (`frontSurvived`/`backSurvived`/`noteSurvived` batendo
com o digitado); desmarcar um aluno depois -- texto ainda intacto; buscar
por nome ("joão", casando com "João Pereira") -- texto ainda intacto;
aplicar o filtro de idioma (Português) -- texto ainda intacto; "Limpar
seleção" -- texto ainda intacto, botão fica desabilitado; re-selecionar e
submeter -- cartão criado de verdade no banco (`dbCountAfterSubmit:1`) E
o formulário reseta (`frontValueAfterSubmit:''`, correto e intencional --
só um submit bem-sucedido deve limpar). Mesmo teste do bug crítico
replicado e confirmado em Material de apoio (`materialsTitleSurvived`) e
Aulas (`classLogTopicSurvived`). Pills de idioma confirmadas aparecendo
com contagem certa (`"Todos (3)"`/`"Francês (2)"`/`"Português (em breve)
(1)"`) e filtrando corretamente nas 3 telas quando o roster de teste
mistura fr+pt. Screenshot (fr, claro e escuro) confirma a hierarquia
nova (pills + rótulo "Nome (@usuário)") legível nos dois temas -- zero
CSS novo, reaproveita `.leaderboard-tab` já calibrada. Sem erro de
console novo atribuível a este código (mesmos 2 `pageerror` de mock já
registrados em toda a feature).

**Escopo**: `shared/admin-flashcards.js`, `shared/admin-support-
materials.js`, `shared/admin-class-logs.js` reescritos com a mesma
estrutura incremental. Nenhuma migração, nenhuma mudança de schema,
nenhum passo manual pendente pra autora.

## UX-fix 6: bug de layout -- checkboxes de aluno aparecendo lado a lado em vez de lista vertical

A autora mandou um print (`ALUNOS`, aba Flashcards) mostrando os
checkboxes de aluno quebrando como texto corrido -- lado a lado,
"wrapando" na linha de baixo -- em vez de uma linha por aluno. Pedido:
"fix the problem where (in both languages) students are shown side by
side instead of a vertical list".

**Não consegui reproduzir o bug localmente, registrado aqui com
honestidade em vez de inflar certeza**: rodei 2 tentativas via
Playwright/`getComputedStyle()`/`getBoundingClientRect()` -- a primeira
com 3 alunos fake, a segunda com 11 alunos fake usando os MESMOS nomes/
@usuários do print real dela (Virgínia Veneri, Priscila de Mello,
Marconi Patterson etc.). Nas duas, `display:flex` já calculava
corretamente em cada `<label>` e as linhas já apareciam empilhadas
verticalmente (`top` crescente, mesmo `left`/`width`) -- o bug não se
manifestou no meu ambiente de teste com o código então já mergeado (PR
#253). Tentei checar a produção real (`app.profbrune.com.br`) direto via
`curl`, mas o proxy de saída deste sandbox bloqueia domínios externos
(mesma limitação já documentada neste arquivo pro CDN do Supabase) --
não consegui confirmar o que está de fato servido lá.

**Fix aplicado mesmo sem causa raiz confirmada**: em vez de continuar
tentando reproduzir uma discrepância que não bati, apliquei um fix
estrutural defensivo nos 3 arquivos (`shared/admin-flashcards.js`,
`shared/admin-support-materials.js`, `shared/admin-class-logs.js`) --
mesmo padrão nos 3: o container da lista de checkboxes (`<div
class="profile-edit-input" style="...">`) tinha só `display:block;`
(deixando o empilhamento vertical depender de cada `<label>` filho
calcular block-level sozinho); trocado pra `display:flex;
flex-direction:column;` explícito -- isso torna o empilhamento vertical
uma GARANTIA estrutural do container flex (itens de um
`flex-direction:column` sem `flex-wrap` não podem ficar lado a lado, por
definição), independente de qualquer causa que eu não consegui isolar.
Also adicionado `width:100%; box-sizing:border-box;` em cada `<label
data-student-row>` -- reforço extra, garante que cada linha ocupa a
largura inteira do container mesmo que algum navegador/cascade calcule o
`width` do `<label>` de um jeito que eu não previ.

**Testado (Playwright, fr+zh, mesmo roster de 11 alunos do print real da
autora)**: nas 3 telas (Flashcards/Material de apoio/Aulas) x 2 idiomas
(6 combinações), confirmado via `getBoundingClientRect()` que as 11
linhas ficam empilhadas verticalmente (`top` estritamente crescente,
mesmo `left`/`width` em todas) -- nenhuma lado a lado. Screenshot
(fr, claro e escuro) confirma visualmente a lista vertical limpa nos
dois temas. `node --check` sem erro nos 3 arquivos. Sem erro de console
novo atribuível a este código.

**Honestidade sobre o que isso significa**: o fix é estruturalmente
sólido (elimina essa CLASSE inteira de bug, não só um sintoma pontual),
mas como não reproduzi o bug original, não posso confirmar com certeza
que era exatamente essa a causa do que a autora viu. Se ela continuar
vendo o mesmo problema depois de um recarregamento forçado (F5/hard
refresh, pra garantir que não é cache do navegador/service worker
servindo a versão anterior), é sinal de que a causa real é outra e
precisa de mais investigação -- print novo + inspeção do DOM ao vivo
seria o próximo passo, não repetir o mesmo fix.

**Escopo**: só os 3 arquivos já citados. Nenhuma migração, nenhum passo
manual pendente pra autora.

## Perguntas de acompanhamento na tela de Revisão + bug real de contraste nos botões de grau (fr)

Mesma sessão da UX-fix 6 acima, 3 perguntas/pedidos da autora sobre 2
prints diferentes da tela de Revisão:

**1. "Onde fica Meus cartões?"** -- confirmado ao vivo (Playwright,
`#my-flashcards-btn` dentro de `#user-menu-dropdown`): fica no menu do
avatar/nome (canto superior direito), entre "🏆 Ranking" e "⚙️
Configurações" -- exatamente como a Fase 5 entregou, nada mudou.

**2. "Filtro de fila não devia ter mudado?"** -- JÁ MUDOU, confirmado
lendo o código (comentários "3ª rodada"/"4ª rodada de grilling" em
`fr/index.html`, por volta da linha 1436): o botão "⚙️ Configurar
sessão" saiu de solto no meio da tela pra um ícone circular ao lado do
título "Revisão" (`.review-header-settings-btn`, dentro de
`.review-path-header-row` -- confirmado ao vivo no DOM); "Filtro de
fila" entrou como 1º controle DENTRO desse painel (junto de "Novas
palavras por dia" -- renome de "Frequência de revisão" numa rodada
anterior -- e "Intensidade da sessão"); a legenda redundante "N palavras
prontas pra revisar" virou um rótulo estático sem número. O print que a
autora mandou (`FILTRO DE FILA`/`NOVAS PALAVRAS POR DIA`/`INTENSIDADE DA
SESSÃO` dentro do mesmo painel) já É o resultado dessas mudanças -- não
uma tela desatualizada esperando a mudança acontecer.

**3. "Por que tem 2 botões com contraste diferente dos outros? É bug?
Fix it."** -- confirmado bug real, mas só de CONSISTÊNCIA (não de
acessibilidade -- os 2 botões "diferentes" já passavam WCAG AA antes,
verificado por cálculo: 5.48:1/6.76:1 claro/escuro pro "Bom", 7.94:1 pro
"Difícil"). O problema real: no tema CLARO, "Errei"/"Fácil" usavam texto
branco (`--on-vivid`) enquanto "Difícil"/"Bom" usavam texto escuro
(`--on-seal-red`, fixo nos 2 temas) -- 2 estilos visuais diferentes nos 4
botões da mesma linha, exatamente o que a autora viu no print (fr,
`.grade-hard`/`.grade-good` em `fr/index.html`).

**Causa raiz**: `.grade-hard` usava um hex solto (`#E0A526`, ouro) e
`.grade-good` reaproveitava `var(--seal-red)` -- a cor de MARCA (azul em
fr, ver seção "Tokens de cor de marca vs. semânticos" acima) -- os dois
pareados com `--on-seal-red` (texto escuro FIXO nos 2 temas, calibrado
especificamente pra ler bem sobre a cor de marca). Já `.grade-again`/
`.grade-easy` usam `var(--error-red)`/`var(--jade)` + `--on-vivid` (texto
que ALTERNA branco/escuro conforme o tema, porque essas 2 cores clareiam
no escuro). Resultado: no claro, 2 brancos + 2 escuros lado a lado; por
coincidência, no escuro os 4 já convergiam pra texto escuro (--on-vivid
escuro + --on-seal-red sempre escuro) -- só o tema claro tinha o defeito
visível, o que bate com o print da autora ser claro.

**Fix**: `.grade-hard`/`.grade-good` ganharam cor PRÓPRIA
(`--grade-hard-bg`/`--grade-good-bg`, novas variáveis no `:root` claro E
nos 2 blocos de tema escuro de `fr/index.html`, mesmo padrão de 3
declarações já usado por `--seal-red`/`--jade`/etc.) -- não reaproveitam
mais `--seal-red` (marca) nem um hex solto -- e passaram a usar
`var(--on-vivid)` como os outros 2, em vez de `--on-seal-red`. Valores
calculados (não chutados) pra manter >=4.5:1 nos 2 sentidos: claro
`#8C5F0E`/`#1D5A82` vs branco = 5.59:1/7.42:1; escuro `#C9973A`/`#5FA8D3`
vs `--on-vivid` escuro (`#201335`) = 6.61:1/6.65:1. Resultado: os 4
botões concordam agora nos 2 temas -- texto branco no claro, texto
escuro no escuro -- em vez de 2 fixos + 2 que alternavam.

**zh não tem esse bug** -- checado antes de mexer em fr: `zh/index.html`
usa uma abordagem totalmente diferente e já consistente pros 4 botões
(`.grade-btn{ color:white; }` uma vez só, cores de fundo fixas e
propositalmente escuras nos 4 -- `#A83A2E`/`#C07A1F`/`var(--jade)`/
`#2E7D4F` -- nunca clareiam por tema). zh não foi tocado nesta entrega.

**Testes realizados**: contraste calculado manualmente (fórmula WCAG,
luminância relativa) pros 4 botões nos 2 temas antes de escrever
qualquer cor nova -- não chutado. Playwright (fr, claro+escuro):
`getComputedStyle()` confirma as 4 cores de fundo/texto computadas
batendo com o esperado (`rgb(255,255,255)` texto nos 4 no claro,
`rgb(32,19,53)` nos 4 no escuro); screenshot dos 4 botões nos 2 temas
confirma visualmente a paleta unificada, sem quebra de layout. Não
validado em zh porque zh não foi tocado (já estava correto).

**Escopo**: só `fr/index.html` (3 blocos de variáveis CSS + 2 regras de
classe). Nenhuma migração, nenhum arquivo JS tocado, nenhum passo manual
pendente pra autora.

## Filtro de aluno já vinculado no select + achado real por trás do menu do avatar "gigante"

Mesma sessão da entrega acima, 2 pedidos/perguntas sobre 2 prints
diferentes da tela "🎓 Alunos" e do menu do avatar (canto superior
direito):

**1. "Tem como tirar do select quem já é 'Seus alunos', pra saber quem
falta adicionar?"** -- pedido concreto, implementado. `renderAdminStudentsView()`
(`shared/admin-students.js`) montava a lista `usernameOptionsHTML` a
partir de TODOS os `profiles`, sem checar contra `students` (já
vinculados) -- sempre mostrava a lista inteira, obrigando a autora a
lembrar de cor quem já tinha vinculado. Corrigido com um cuidado
importante: o filtro não pode ser "sumir de vez" -- "cada aluno vale pra
1 idioma" (Fase 1) significa que a MESMA conta pode ser vinculada de
novo, legitimamente, pra um idioma DIFERENTE (ex: Sandra de francês +
Sandra de mandarim como 2 vínculos separados). Por isso o filtro
(`linkedUsernamesByLang`, novo) é por IDIOMA -- reconstrói a lista de
contas disponíveis a cada troca do `<select>` de idioma (`change`
listener novo), excluindo só quem já está vinculado NAQUELE idioma
específico, nunca uma exclusão global de "quem já é aluno em qualquer
idioma".

**2. "Por que esse menu abriu tão grande???"** -- não era bug de CSS (já
descartei isso investigando a UX-fix 6 anterior, nesta mesma sessão) --
era uma REGRESSÃO real de arquitetura de navegação, achada ao comparar o
dropdown do avatar com a sidebar de desktop lado a lado. `#user-menu-dropdown`
tem uma regra já existente e comentada (`.mais-extra-tab{ display:none }`
só em `@media (min-width:900px)`) que esconde do dropdown, no desktop,
qualquer item que a sidebar já cobre -- hoje só aplicada a
Conjugação/Desafios (fr) / 汉字 (zh). Mas 4 outros itens do MESMO dropdown
-- "👤 Meu perfil", "🏆 Ranking", "⚙️ Configurações", "🛠️ Painel de
Admin" -- são 100% redundantes com `data-tab="profile"/"leaderboard"/
"settings"/"admin-badges"` que a sidebar (`.sidebar-nav-secondary`) JÁ
tem, e disparam exatamente o mesmo `switchTab(...)` (confirmado lendo
`fr/app.js` linhas 914-943) -- só que ninguém tinha aplicado a mesma
classe `mais-extra-tab` a eles. Resultado: no desktop, a autora via 8
itens no dropdown quando só 4 (Meus cartões/Material de apoio/Reportar
problema/Sair) não existem em lugar nenhum da sidebar -- os outros 4
eram puro ruído duplicado, um acúmulo silencioso de fases anteriores
(Fase 5/8b adicionaram Meus Cartões/Material de apoio ao dropdown sem
ninguém reconferir se os itens PRÉ-EXISTENTES continuavam justificados
ali).

**Fix**: adicionada a classe `mais-extra-tab` a `#user-profile-btn`/
`#leaderboard-btn`/`#user-settings-btn`/`#admin-badges-btn`, em
`fr/index.html` E `zh/index.html` -- zero CSS novo, reaproveita a regra
já existente. No MOBILE nada muda (Perfil já tinha seu próprio
`#user-profile-btn{display:none}` específico ali, por ter aba fixa
própria na barra inferior; os outros 3 continuam alcançáveis via "Mais",
que é exatamente pra isso -- itens sem aba fixa/sidebar equivalente).

**Testado (Playwright, fr+zh)**: filtro do select -- vincular em
"Francês" exclui quem já está vinculado em francês mas mantém quem só
tem vínculo em outro idioma; trocar pra "Mandarim" (idioma sem
ninguém vinculado no cenário de teste) mostra a lista cheia de novo;
trocar pra "Português" exclui só quem tem vínculo EM português.
Dropdown do avatar -- desktop (1400px): confirmado só 4 itens visíveis
(`my-flashcards-btn`/`support-materials-btn`/`report-menu-btn`/
`logout-btn`), altura caiu de ~380px pra 203px; mobile (480px):
confirmado que TODOS os 8-9 itens continuam visíveis ali (nada
regrediu no "Mais"). Screenshot do dropdown desktop confirma visualmente
o menu compacto, sidebar ao lado mostrando os mesmos 4 itens que
sumiram do dropdown. `node --check` sem erro em `shared/admin-students.js`.

**Escopo**: `shared/admin-students.js` + `fr/index.html` + `zh/index.html`
(só classe CSS adicionada em 4 botões existentes, zero CSS novo).
Nenhuma migração, nenhum passo manual pendente pra autora.

