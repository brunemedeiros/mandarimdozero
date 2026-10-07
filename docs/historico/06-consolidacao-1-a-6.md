# Histórico: Série CONSOLIDAÇÃO

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## CONSOLIDAÇÃO-2 -- Fronteira Legacy -> Native / Conversão explícita
(segue a CONSOLIDAÇÃO-1, "criação sempre nativa" -- ver seção anterior no
histórico deste arquivo, não reproduzida aqui por já estar registrada)

Prompt-mestre de 25 seções, escopo estrito: **só a fronteira entre um
cartão Legacy já existente e o modelo Native** -- nunca migração em massa,
nunca um botão "Converter todos", nunca automatismo (load da lista, abrir
pra editar, abrir Preview, trocar de versão, salvar OUTRO cartão). O único
gatilho continua sendo o clique explícito em "🧪 Usar o novo editor de
campos (nativo)", já existente desde a Fase 6D.8 -- esta consolidação não
criou esse botão, auditou e corrigiu o que acontece a partir dele.

### 1) Auditoria (antes de qualquer código)

Confirmado por leitura, não presumido: o conversor já existia
(`nativeNoteEditorStateFromLegacyRow()`, `shared/flashcard-native-
persistence.js`, Fase 6D.8) e já preservava `noteId`/`revision`/
`languageAppKey`/`origin`/`privateNote` corretamente, nunca inventando
`normal_reversed`/`type_answer` a partir de dado legado (só produz
`normal`/`multiple_choice`/`cloze` -- os outros 2 só existem trocando o
Card Type DENTRO do editor nativo depois da conversão, mecanismo já
existente desde a Fase 6D.2/6D.4, não novo). `legacyFlashcardConversionPreflight()`
já bloqueava os 2 casos indetermináveis (Cloze sem exatamente 1 `"___"`;
MC sem `back_trans`). `updateFlashcardContent`/`updateOwnFlashcardContent`
(`shared/teacher-flashcards.js`/`shared/own-flashcards.js`) já faziam UM
único `UPDATE` atômico via `nativeState` -- nenhuma segunda escrita, nunca
um `INSERT` (id sempre preservado, nunca uma linha nova).

**O que a auditoria encontrou faltando -- decisão de `revision` na
conversão em si** (§4, "crítico"): antes desta fase,
`wireFlashcardNativeEditForm`/`wireMyFlashcardNativeEditForm` sempre
incrementavam `revision` em QUALQUER salvamento pós-conversão, mesmo sem
nenhuma edição -- resetando FSRS/histórico de um cartão que a professora/
aluna só queria "abrir no editor novo", sem mudar nada. Contra §4 ("nunca
perda silenciosa de histórico", "preservar identidade/revision" pra
Normal/MC quando não editado).

**Conflito arquitetural real, encontrado e documentado (não resolvido
silenciosamente, conforme §4/§IMPORTANTE exigia)**: Cloze é o ÚNICO
Card Type onde isso é estruturalmente IMPOSSÍVEL de preservar mesmo sem
nenhuma edição. Confirmado lendo os dois ramos de `shared/flashcard-
model.js`: o Cloze LEGADO (frase com 1 `"___"`) gera a CardInstance com
id `cardId` puro (sem sufixo); o Cloze NATIVO (`interpretNativeNoteFromRow`,
qualquer marca `{{cN::...}}`, inclusive uma única) gera SEMPRE
`${cardId}-${mark.id}` (ex.: `-c1`). Ou seja: mesmo com `revision`
perfeitamente preservada, a simples TROCA de representação (legado ->
nativa) já muda o id do CardInstance -- e é esse id, não `revision`
isolada, que o merge-por-id de `applySerializedState()` usa pra encontrar
o FSRS salvo. Preservar `revision` sem mudar esse esquema de id não
resolveria nada (o merge continuaria não encontrando o cartão antigo);
mudar o esquema de id do Cloze NATIVO pra acomodar isso afetaria TODO
cartão Cloze nativo já existente (nunca só os convertidos), fora do
escopo desta fase (§23: "nenhuma mudança em Review/FSRS/renderer").
**Decisão, registrada aqui em vez de escondida**: Cloze continua
CONVERSÍVEL (não regredir uma capacidade já entregue e testada desde a
Fase 6D.8), mas `revision` SEMPRE incrementa nesse caso específico,
mesmo sem edição -- o toast honesto ("...progresso de revisão foi
reiniciado.") reflete o que de fato acontece, nunca finge preservação
que a arquitetura atual não permite entregar.

### 2) Conversão explícita, por linha só -- confirmado, não modificado

Nenhum novo caminho de conversão automática foi criado. `noteId`/
`revision`/`languageAppKey`/`origin` continuam vindo só de
`nativeNoteEditorStateFromLegacyRow(c)`, chamada só dentro do handler de
clique do botão -- nunca ao carregar a lista, abrir Review, abrir
Preview, ou salvar outro cartão.

### 3) O que foi implementado

- **`nextRevisionForNativeSave(c, editorState, conversionBaseline)`**
  (novo, `shared/flashcard-native-persistence.js`) -- ÚNICO ponto de
  decisão de `revision`, reutilizado pelos dois editores (nunca
  duplicado): cartão JÁ nativo -> compara contra o estado ORIGINAL
  (`createNativeNoteEditorStateFromRow`) via `noteEditorStateRequiresNewRevision()`
  (Fase 6D.1, reaproveitada -- nunca uma segunda função de comparação);
  cartão RECÉM-convertido de Legacy -> compara contra o `conversionBaseline`
  (clone do editorState capturado NO INSTANTE do clique em "Usar o novo
  editor", antes de qualquer edição) -- preserva `revision` se nada
  mudou, **exceto quando o baseline é Cloze**, caso em que sempre
  incrementa (a exceção documentada acima, com comentário completo no
  próprio código explicando o motivo -- não um número mágico).
- **`ADMIN_FLASHCARDS_STATE.editingNativeConversionBaseline`/
  `MY_FLASHCARDS_STATE.editingNativeConversionBaseline`** (novo, os dois
  arquivos de UI) -- clone (`cloneNoteEditorState`, round-trip JSON já
  existente desde a Fase 6D.1) capturado no clique de "Usar o novo
  editor", limpo em todo ponto que já limpava `editingNativeState`
  (cancelar, salvar com sucesso, começar nova edição, render completo) --
  nunca um estado órfão sobrevivendo entre edições.
- Os dois blocos de decisão de revision, antes duplicados inline (um em
  cada arquivo), foram substituídos por uma ÚNICA chamada a
  `nextRevisionForNativeSave(...)` -- mesma disciplina de centralização
  já usada em toda a Fase 6D (`classifyFlashcardRowModel`/
  `legacyFlashcardConversionPreflight`/`validateNoteEditorStateForSave`).

**Bug real encontrado e corrigido, fora do que foi pedido inicialmente
mas necessário pro próprio objetivo desta fase valer pro lado da aluna
(§17, "testar professora e aluno separadamente")**: `renderMyFlashcardsView()`
(`shared/my-flashcards.js`) resetava `MY_FLASHCARDS_STATE.editingNativeState`/
`editingNativeConversionBaseline` pra `null` INCONDICIONALMENTE, logo no
topo da função, ANTES de qualquer `await` -- e o handler de "Usar o novo
editor" seta esses dois campos e IMEDIATAMENTE chama
`renderMyFlashcardsView()`. Como o corpo síncrono de uma função `async`
roda no MESMO tick de quem a chama (só cede controle no primeiro
`await`), o reset acontecia ANTES de qualquer render de fato ocorrer --
a conversão nunca aparecia na tela pra aluna: clicar o botão
silenciosamente reexibia o MESMO formulário legado de novo, sem erro
visível nenhum. **Este bug é pré-existente à CONSOLIDAÇÃO-2** (existia
desde que o botão foi introduzido na Fase 6D.8/6D.6) -- nunca tinha sido
exercitado por nenhum teste de navegador real antes (a suíte de smoke da
Fase 6D.8 cobria só `admin-flashcards.js`, que usa um caminho DIFERENTE
e sem esse problema -- reconstrói só `#admin-flashcards-cards-box` via
`buildFlashcardsCardsBoxHTML`, nunca chama o `renderAdminFlashcardsView()`
completo de dentro desse handler). Corrigido com o mínimo de mudança:
`renderMyFlashcardsView(opts)` ganhou um parâmetro
`opts.preserveEditingNativeState` (default `false`, preserva 100% o
comportamento de todo call site existente); só o handler de "Usar o novo
editor" passa `{ preserveEditingNativeState: true }` -- os outros
(cancelar, salvar, começar nova edição) continuam sem passar `opts`
porque já QUEREM `null` nesses casos (nenhuma mudança de comportamento
neles).

### 4) Tipos Legacy -- classificação (§6)

- **Normal, Normal-reverso** (via troca de Card Type pós-conversão),
  **Múltipla Escolha**, **zh Hanzi/Pinyin/tradução** -- seguros:
  `revision`/id do CardInstance preservados quando não editados (o id
  do CardInstance nesses tipos é `cardId` puro nos dois ramos, legado e
  nativo -- confirmado idêntico por leitura, sem o mesmo problema do
  Cloze).
- **Cloze** -- seguro-com-perda-documentada: conversível, mas SEMPRE
  reseta `revision`/histórico mesmo sem edição (achado arquitetural
  acima). O toast já avisa; nenhum comportamento escondido.
- **Type Answer** -- nunca existiu no schema legado (não é um tipo pra
  "classificar" na conversão -- só alcançável trocando Card Type depois,
  mesma mecânica de Normal-reverso).
- **Estruturas ambíguas** (Cloze sem `"___"` exato, MC sem resposta) --
  continuam rejeitadas pelo preflight já existente, sem nenhuma mudança.

### 5) Identidade (§3) -- preservada, confirmado

`c.id` nunca muda (sempre `UPDATE ... WHERE id = c.id`, nunca `INSERT`);
`teacher_id`/`student_id`/`owner_id`/`language_app_key`/`status`/
`created_at`/`origin` nunca tocados pelo payload de conversão -- só
colunas de CONTEÚDO (`fields`/`card_generation_mode`/`note`/`front`/
`back_trans` etc.) são gravadas.

### 6) Mídia (§7)

Áudio/imagem já existentes na linha legada continuam preservados pelo
mesmo `attachLegacyMediaToFields()` (Fase 6D.8, intocado nesta fase) --
vinculados ao Field cujo idioma é o estudado. Gap conhecido, não
resolvido aqui (fora de escopo, §7 explícito): imagem preservada no
dado, mas ainda não exibida na Revisão pro caminho nativo -- o toast de
aviso (já existente) continua avisando disso no momento da conversão.

### 7) Testes realizados

- **Node/VM, `test_consolidacao2_unit.js` (novo), 60/60** -- cenários A-T:
  Normal (revision preservada quando não editado, bump quando editado);
  Normal-reverso (conversão produz Normal simples, nunca duplica Fields;
  trocar pra `normal_reversed` DEPOIS bumpa revision corretamente, gera
  2 CardInstances via `buildReversedCardInstancePair`, FSRS genuinamente
  independente); Cloze (SEMPRE bumpa mesmo sem edição -- provado via
  `buildEngineCardsFromRow` que o id do CardInstance de fato muda,
  `t503-r3` -> `t503-r4-c1`, confirmando a necessidade real da exceção);
  MC (revision preservada quando não editado; MC sem resposta rejeitado);
  Type Answer (nunca produzido direto da conversão, só via troca de Card
  Type depois, bump correto); zh Hanzi/Pinyin (revision preservada,
  `pinyinFieldId` correto); áudio/imagem preservados; professora
  (`student_id`/`origin` preservados) e aluna (`origin:'self'`
  preservado) testadas separadamente; falha de preflight nunca muta
  estado; payload de save nunca contém `"id"` (nunca `INSERT`);
  `nativeNoteEditorStateFromLegacyRow()` nunca toca campo de FSRS;
  classificação Native/Legacy correta pós-conversão/sem-conversão;
  `reviewDirection`/`frontIsTargetLanguage`/`isReverse` nunca aparecem
  no editorState convertido; payload nunca inclui `status`/`created_at`
  (conversão nunca pode contar 2x no limite de cartões, é sempre
  `UPDATE`, nunca `INSERT`).
- **`test_fase6d8_legacy_conversion.js` (Fase 6D.8, pré-existente),
  92/92** -- sem regressão.
- **`node --check`** limpo nos 3 arquivos tocados.
- **Regressão ampla** -- re-executadas as suítes de Fases 4 a 7j
  já existentes no scratchpad da sessão, sem nenhuma falha NOVA. 2
  falhas confirmadas PRÉ-EXISTENTES e não-relacionadas (via
  `git stash`/`git stash pop`, reproduzidas identicamente contra o
  commit anterior a esta fase): `test_fase6d2_state.js` ("renderMyFlashcardsView()
  de fato referencia CARD_TYPE_UI_META") e
  `test_fase6d4b_typeanswer_editor.js` ("15. só as chaves esperadas de
  Note editor state existem") -- scripts de teste desatualizados de
  fases anteriores (provavelmente da remoção do formulário legado de
  CRIAÇÃO na CONSOLIDAÇÃO-1), não tocados aqui por estarem fora do
  escopo desta fase.

### 8) Testes Supabase/live DB (§21)

Transação única (`begin` ... `rollback`, mesma técnica já usada em toda
a sessão -- MCP `execute_sql` isola cada chamada, então tudo precisa
caber numa só), projeto `eigjocalzwamisgqilhg`: INSERT real de uma linha
legada em `teacher_flashcards`, UPDATE real com o payload EXATO que
`nativeContentColumnsFromEditorState()` produziria (via `RETURNING`,
confirmado `fields`/`card_generation_mode` populados, `front`/`choices`/
`cloze_sentence` corretamente nulificados, `teacher_id`/`student_id`/
`status`/`created_at` intactos) -- `rollback` ao final, zero dado de
teste permanente (contagem/hash de `teacher_flashcards` idênticos antes
e depois). Confirmado também que a constraint `teacher_flashcards_fields_paired`
(migration 045) segue ativa como rede de segurança de banco.

### 9) Testes Playwright (§22)

**`test_consolidacao2_browser_smoke.js` (novo), FR+ZH, 36/36 checks**,
cobrindo especificamente o que a suíte de smoke da 6D.8 (já existente)
não cobria -- a PRESERVAÇÃO de revision em si, com cliques reais
(nenhum estado forjado por atribuição direta):
- Professora, Normal convertido + salvo SEM edição -> `revision`
  preservada, SEM modal de confirmação de reset, toast sem "reiniciado".
- Professora, Cloze convertido + salvo SEM edição -> `revision` SEMPRE
  bump (a exceção documentada), modal aparece, toast com "reiniciado" --
  confirmado também via `buildEngineCardsFromRow` real no navegador que
  o id da CardInstance muda de fato.
- Aluna (`my-flashcards.js`, gated `premium`), mesmo par Normal/Cloze --
  é este fluxo que expôs o bug real do reset síncrono, corrigido acima;
  confirmado funcionando de ponta a ponta depois do fix.
- "Recarregar" (reabrir a edição a partir da linha já salva) confirma
  classificação Native, ausência do botão "Usar o novo editor", e
  NENHUMA linha duplicada (contagem idêntica antes/depois) -- nos 2
  papéis (professora/aluna) e nos 2 idiomas.
- Zero erro de console novo (só os mesmos `ERR_TUNNEL_CONNECTION_FAILED`
  pré-existentes do proxy de saída deste sandbox, documentados
  repetidamente nesta sessão).

### 10) Casos deliberadamente deixados Legacy / fora de escopo (§13)

Nenhum -- todo tipo Legacy que já era convertível continua convertível;
nenhum novo bloqueio foi introduzido. O único "não resolvido" é o
achado arquitetural do Cloze (item 1 acima), que não bloqueia a
conversão -- só torna explícito que ela reseta progresso nesse caso
específico, documentado no código e aqui, nunca escondido.

### 11) Débito técnico descoberto (§25.14)

1. **Esquema de id do Cloze nativo (`-c{mark}` sempre, mesmo com 1
   marca só) difere do Cloze legado (sem sufixo)** -- é a causa raiz de
   por que Cloze nunca pode preservar FSRS na conversão. Unificar isso
   exigiria mudar `interpretNativeNoteFromRow()` (afeta TODO cartão
   Cloze nativo, não só conversões) -- fora do escopo desta fase, fica
   registrado como candidato de uma fase futura dedicada, se algum dia
   a perda de histórico do Cloze-na-conversão for considerada um
   problema que vale essa mudança maior.
2. **2 scripts de teste desatualizados** (`test_fase6d2_state.js`,
   `test_fase6d4b_typeanswer_editor.js`) -- falham contra o código atual
   por motivos não relacionados a esta fase (provavelmente resquício da
   CONSOLIDAÇÃO-1), confirmados pré-existentes via `git stash`. Não
   corrigidos aqui, fora do escopo.
3. **O bug de reset síncrono em `my-flashcards.js`** (item 3 acima) era
   pré-existente desde a Fase 6D.6/6D.8 -- registrado aqui não como
   débito NOVO, mas como um lembrete de que a única suíte de smoke que
   existia pra essa fase nunca exercitou o lado da aluna via clique
   real, só via atribuição direta de estado -- daí o bug ter passado
   despercebido até esta fase testar com cliques de verdade.

**Critério de sucesso (§24) confirmado**: Legacy continua Legacy até
conversão explícita; "Usar o novo editor" converte 1 cartão por vez,
com FSRS preservado sempre que a arquitetura permite (Normal/MC/zh) e
reset honesto e documentado quando não permite (Cloze); nenhum estado
híbrido, nenhuma duplicata, nenhuma conversão silenciosa.

**Escopo respeitado (§23)**: nenhuma migração em massa, nenhum botão
"Converter todos", nenhuma remoção de schema/coluna/adapter legado,
nenhum sistema de Archive/Tags novo, nenhum upload de imagem novo,
nenhum redesign de áudio, nenhum Deck, nenhuma mudança em Review/FSRS/
renderer/matriz de planos. Nenhuma migração SQL nesta fase -- 100%
client-side, nenhum passo manual pendente pra autora.

**PARE conforme instrução explícita -- CONSOLIDAÇÃO-3 (ARQUIVAMENTO) NÃO
iniciada.** Próxima etapa só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

## CONSOLIDAÇÃO-3 -- ARQUIVAMENTO: encerrar o modelo antigo sem destruir
histórico

Terceira fase da série CONSOLIDAÇÃO (CONSOLIDAÇÃO-1 = unificar criação de
cartão só no editor nativo; CONSOLIDAÇÃO-2 = fronteira explícita
Legacy→Native, ver seções anteriores). Escopo desta fase, travado pelo
prompt-mestre: remover "Arquivar" de toda a UX normal, sem nunca destruir,
migrar em massa, resetar contagem, ou auto-converter nenhum cartão já
arquivado -- e sem confundir arquivamento (visibilidade/gestão) com
suspensão de Review/FSRS (elegibilidade de estudo), que são eixos
completamente separados desde que `status` foi criado (migrations 026/028).

### §1 -- Auditoria (código-livre, feita antes de qualquer edição)

Confirmado por leitura, não presumido: o mecanismo de arquivamento inteiro
se resume a **1 coluna** (`status text not null default 'active' check
(status in ('active','archived'))`, idêntica em `teacher_flashcards`
-- migration 026 -- e `own_flashcards`, ex-`student_flashcards`, migration
028) e **2 funções de escrita** (`setFlashcardStatus(id,status)` em
`shared/teacher-flashcards.js`, `setOwnFlashcardStatus(id,status)` em
`shared/own-flashcards.js`) -- nenhuma outra tabela, view, function SQL ou
Edge Function toca nesse campo. Quem LÊ `status`:
- **UI de gestão** -- `shared/admin-flashcards.js` (professora) e
  `shared/my-flashcards.js` (aluna), cada um com uma lista "Cartões
  ativos" + seção "Arquivados" separada, e um botão único por linha que
  alternava 🗃 Arquivar / ↺ Reativar (`data-toggle-flashcard`/
  `data-toggle-own-flashcard`, `data-next-status` dinâmico).
- **Review/FSRS (eixo TOTALMENTE separado, nunca tocado nesta fase)** --
  `note.status = row.status` (`shared/flashcard-model.js`, nos dois ramos
  de interpretação, nativo e legado) vira `flashcardStatus: note.status`
  em `buildEngineCardsFromRow()`, e o ÚNICO consumidor é
  `isCardLessonCompleted()` (fr/zh `app.js`, linha ~6011):
  `if (card.origin==='teacher'||card.origin==='self') return
  card.flashcardStatus==='active';` -- é isto (não uma coluna dedicada)
  que já mantém cartão arquivado fora da fila de revisão, desde a Fase 3
  do sistema de alunas particulares.
- **Limite de 20 cartões grátis** -- `FREE_OWN_FLASHCARD_LIMIT`
  (`shared/my-flashcards.js`) e `computeAnkiImportRemainingSlots()`
  (`shared/anki-import.js`) já filtram estritamente por
  `status==='active'` -- comportamento correto pré-existente, confirmado
  por leitura, nunca alterado.
- **Métricas da professora** -- o painel expandível de "🎓 Alunos"
  (`shared/admin-students.js`) já mostra "N ativos, M arquivados" como
  contagem pura, sem nenhuma ação de arquivar ali.
- **Não relacionado, confirmado explicitamente pra não confundir** --
  `hidden_from_profile` (Fase 1 do prompt-mestre "perfil público", eixo
  de visibilidade PÚBLICA por cartão, independente); `teacher_students.status`
  (`'active'/'invited'/'removed'`, vínculo professora-aluna, outra
  tabela); `challenges.status` (feature de Desafios, francês, sem
  relação); `teacher_class_logs` (delete físico de verdade, nunca usou
  `status`, decisão consciente desde a Fase 7 por não ter progresso FSRS
  dependente).
- **Teste de cobertura pré-existente**: nenhum teste Node/VM ou
  Playwright de nenhuma fase anterior exercitava especificamente o botão
  Arquivar/Reativar em si (as suítes de Fase 6D+ focam no motor
  Note/CardType) -- esta fase precisou escrever a primeira suíte
  dedicada.

### §2 -- Regra absoluta (cumprida)

Nenhum cartão já arquivado foi tocado por código nesta fase --
confirmado ao vivo (ver §Testes/Live-DB abaixo): id, Note/Fields, Card
Type, CardInstances (derivadas em runtime, nunca persistidas -- intocado),
`revision`, campos FSRS, `origin`, `teacher_id`/`student_id`/`owner_id`,
tags (migration 048), timestamps, e o próprio `status` de todo cartão
já arquivado antes desta fase permanecem exatamente como estavam. Nenhuma
migração de dado, nenhum backfill, nenhuma remoção de coluna, nenhuma
alteração em massa de `status`, nenhum reset de contagem, nenhuma
auto-conversão archived→active.

### §3 -- "Arquivar" removido de toda UX normal (sem substituto renomeado)

**`shared/admin-flashcards.js`** (professora) -- a linha de botões de um
cartão ATIVO deixou de renderizar QUALQUER botão de status. O botão
"Reativar" (↺) só é renderizado quando `c.status==='archived'` (condição
adicionada, nunca um segundo mecanismo):
```js
${c.status === 'archived' ? `<button class="admin-badge-delete-btn"
  data-toggle-flashcard="${c.id}" data-next-status="active"
  title="Reativar (tirar do arquivo histórico)">↺</button>` : ''}
```
Nenhum "Ocultar"/"Esconder"/"Suspender"/"Desativar"/"Mover para arquivo"
foi introduzido como substituto -- confirmado por grep dedicado (ver
§16 abaixo) que os únicos usos dessas palavras no arquivo são comentários
explicando o que NÃO foi feito, ou o toggle `hidden_from_profile`
(👁️/🙈, eixo de visibilidade pública, completamente separado). Uma vez
reativado, um cartão nunca mais ganha nenhum botão de status --
indistinguível de um cartão que nunca foi arquivado.

**`shared/my-flashcards.js`** (aluna) -- mudança espelhada
(`data-toggle-own-flashcard`), mesma condição, mesmo raciocínio. O botão
👁️/🙈 de `hidden_from_profile` ao lado permanece intocado (eixo
diferente, confirmado na auditoria).

`wireFlashcardsCardsBox()`/`wireMyFlashcardsCardButtons()` (os
listeners de clique do botão `[data-toggle-flashcard]`/
`[data-toggle-own-flashcard]`) não precisaram de nenhuma mudança --
são genéricos, chamam `setFlashcardStatus`/`setOwnFlashcardStatus` com o
que `data-next-status` disser, e como a UI agora só produz
`data-next-status="active"`, eles nunca mais recebem `'archived'` vindo
de um clique real.

`setFlashcardStatus`/`setOwnFlashcardStatus` (as 2 funções de escrita)
**não foram alteradas** -- continuam aceitando `'archived'` como valor
válido (é a fonte de verdade do schema, `status in
('active','archived')`), só ninguém na UI as chama mais com esse
argumento.

### §5 -- Área histórica separada (reuso, não reconstrução)

A seção "Arquivados" já existia visualmente separada em ambas as telas
desde a Fase 2/5 do sistema de alunas particulares -- satisfaz §5 sem
nenhuma arquitetura nova. Único ajuste: o rótulo mudou de `Arquivados
(${n})` para `Arquivados historicamente (${n})` nos dois arquivos, pra
deixar explícito que é histórico, nunca "escondido"/"suspenso". A lista
continua paginada/renderizada pelo mesmo `buildFlashcardsCardsBoxHTML()`/
render equivalente de `my-flashcards.js` -- reaproveitado, não
duplicado.

### §4/§6/§7 -- confirmados intocados

`flashcardStatus`/`isCardLessonCompleted()` -- zero linha alterada.
`classifyFlashcardRowModel()` (Native vs. Legacy) -- independente de
`status`, não tocado. Fluxo de criação (`nativeContentColumnsFromEditorState()`,
`createFlashcard`/`createOwnFlashcard`) -- nenhum dos dois jamais incluiu
uma chave `status` no payload de INSERT; "novo cartão sempre ativo" é o
DEFAULT DO BANCO (`status text not null default 'active'`), nunca uma
escolha ativa do código -- confirmado por teste dedicado (ver abaixo) que
o payload nunca contém `status`/`archived`.

### §8/§9/§10 -- professora e aluna, sem quebrar nada adjacente

Professora perde a ação normal de arquivar; cartões já arquivados de
alunas suas permanecem preservados, não recriados, não reatribuídos.
Aluna: teto de 20 cartões grátis (Fase 5.1) confirmado imune --
arquivado nunca conta como ativo, nunca reduz capacidade de criação,
nunca infla o limite; `hasActiveTeacherLink()` (isenção de teto)
inalterado; Native/Legacy/conversão explícita (CONSOLIDAÇÃO-2) inalterados.

### §11/§12 -- schema e Anki, confirmados sem impacto

Nenhuma tabela de archive nova, nenhuma coluna removida, nenhum backfill.
Verificado quanto ao Anki export/import (Fases 7i/7j): nenhum dos dois
lê/filtra por `status` -- `own_flashcards`/`teacher_flashcards` só
alimentam export/import via `fields`/`card_generation_mode`/conteúdo,
nunca por estado de arquivamento (um cartão arquivado que a professora
selecionar pra exportar seria exportado normalmente, comportamento
idêntico a antes desta fase, sem necessidade de mudança). Nenhum
problema de compatibilidade real encontrado, nenhuma mudança feita.

### §13 -- Testes

**Node/VM** (`test_consolidacao3_unit.js`, 12/12 passando) -- 3 grupos:
Modelo/dados (cartão arquivado preserva id/revision/status/classificação
Native-vs-Legacy através do motor real, `buildEngineCardsFromRow`);
Criação (payload de criação nativa nunca inclui `status`/`archived`,
`editorState` nunca ganha propriedade de status); Limite (fórmula real de
`remainingSlots` confirma que 5 ou 50 cartões arquivados nunca reduzem o
teto de 20).

**Playwright browser-smoke** (`test_consolidacao3_browser_smoke.js`,
48/48 passando, FR+ZH, professora+aluna) -- ausência total de "Arquivar"
em qualquer lugar da UI (nenhum botão, nenhum menu, nenhuma ação em
massa); linhas arquivadas permanecem visíveis, rotuladas "Arquivados
historicamente", com botão Reativar funcional; cartão reativado nunca
recupera botão de status; fluxo real de criação de cartão (clique real,
não estado forjado) confirma `status:'active'` sempre; matemática do
teto de 20 confirmada imune a cartões arquivados; gate de Review
(`isCardLessonCompleted`/`flashcardStatus`) confirmado idêntico pra
cartão ativo e arquivado, nos dois idiomas e papéis.

**Live-DB (Supabase real, `eigjocalzwamisgqilhg`)** -- confirmado ao
vivo que `status` (`teacher_flashcards`/`own_flashcards`) segue com
default `'active'`/`not null`, sem alteração pela migration 045/046/047/
048 de fases anteriores. Transação real `BEGIN; INSERT(status='archived')
RETURNING; UPDATE(status='active') WHERE id=...; ROLLBACK;` executada
com sucesso nas duas tabelas (usando `auth.users` diretamente pra
`teacher_id`/`student_id`/`owner_id`, já que são as FKs reais, não
`profiles`) -- confirma que o próprio mecanismo de reativação da UI
(`UPDATE ... SET status='active' WHERE id=?`) funciona contra o schema
real. Contagem de linhas antes e depois idêntica nas duas tabelas
(`teacher_flashcards`: 5, `own_flashcards`: 7) -- zero rastro permanente
de teste.

### §16 -- Busca final por referências restantes de archive/archived

`grep` project-wide por `arquiv|archive` (case-insensitive) retorna 77
arquivos -- maioria falsos-positivos (português "arquivo" = "file",
nomes de cache do service worker/PWA, `ARCHITECTURE.md`, pipeline de TTS
offline). Restringindo a padrões reais do mecanismo de arquivamento
(`'archived'`, `status===`, `Arquivar`, `Arquivado`), classificação:

- **(a) código de compatibilidade necessário** -- `setFlashcardStatus`/
  `setOwnFlashcardStatus` (ainda a única via de escrita de `status`,
  usada agora só com `'active'` pela UI, mas preservada como está por
  ser a fonte de verdade do schema); os filtros `status==='active'` em
  listagens/teto/import Anki; o gate `flashcardStatus` de Review; as
  migrations 026/028 (registro histórico, nunca reescritas); o contador
  "N ativos, M arquivados" em `admin-students.js`; os comentários
  explicativos desta fase e da Fase 2/5 nos arquivos de UI/schema; menções
  em CLAUDE.md (histórico de decisões).
- **(b) código morto** -- nenhum encontrado.
- **(c) UI de arquivamento ainda ativa** -- nenhuma encontrada; confirmado
  por grep dedicado que `🗃` (emoji do botão antigo) e
  `data-next-status="archived"` não existem em lugar nenhum do
  repositório.

### O que ficou deliberadamente de fora desta fase (§14, confirmado)

Decks, suspensão de CardInstance, estados "congelados" novos, nova lógica
FSRS, novo sistema de hide/status, migração em massa, conversão automática
Legacy→Native, redesenho completo de listagem, nova arquitetura de Tags,
nova UX de áudio, novos limites de cartão, mudanças de plano/assinatura --
nenhum destes foi tocado, criado, ou mesmo mencionado como necessário.

### Débito técnico / achados fora do escopo

Nenhum encontrado nesta fase -- a auditoria (§1) confirmou que o
mecanismo já era mínimo e bem isolado (1 coluna, 2 funções de escrita, 1
consumidor de Review) antes mesmo de qualquer código ser tocado.

**Escopo desta entrega**: `shared/admin-flashcards.js`,
`shared/my-flashcards.js` (só a renderização do botão de status + o
rótulo da seção "Arquivados"). Nenhuma migração, nenhum passo manual
pendente pra autora.

**PARE conforme instrução explícita -- CONSOLIDAÇÃO-4 (simplificação de
UX de áudio, sem alterar o motor) é a próxima fase da série e NÃO foi
implementada nesta entrega.** Próxima etapa só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

## CONSOLIDAÇÃO-4 -- ÁUDIO: simplificar a UX sem alterar o motor

Quarta fase da série CONSOLIDAÇÃO. Escopo travado pelo prompt-mestre:
reorganizar a APRESENTAÇÃO do editor de áudio por Field (Fases 7e/7f/7g/
7h.1/7h.2) num fluxo de 2 passos -- "o usuário decide SE quer áudio antes
de decidir COMO" -- sem tocar em nenhuma linha do motor (upload/TTS/
gravação/URL/persistência/contrato `Field.audio`), sem reconstruir nada.

### Auditoria (feita antes de qualquer código)

Confirmado por leitura, não presumido: **todo o estado e toda a lógica de
áudio por Field vivem num único arquivo**, `shared/flashcard-field-
editor.js` -- `renderFieldAudioBlockHTML()` (render puro) +
`wireFieldAudioBlockFor()` (os 4 corredores técnicos: upload, URL, TTS,
gravação, mais o botão de remover). Esse componente é reutilizado
IDENTICAMENTE pelos 4 Card Types que hoje têm campos de texto: Normal/
Normal com reverso/Múltipla Escolha/Digite a resposta via
`renderFieldEditorHTML()` (genérico), e Cloze via uma chamada direta
(`shared/flashcard-cloze-editor.js`, que tem UI própria de seleção de
texto e não passa pelo Field editor genérico). Nunca há uma segunda
implementação -- confirmado por grep, os dois admin (`shared/admin-
flashcards.js`) e aluna (`shared/my-flashcards.js`) só chamam
`refreshNativeCardTypeBox(...)` passando `uploadFn`/`deleteFn`/`ttsFn`/
`noteId`/`allowedAudioOrigins` -- nunca reimplementam nada do editor de
áudio em si.

**A matriz Free/Premium (Seção 10 do prompt-mestre) já estava
implementada** desde a Fase 7h.1 -- `allowedAudioOrigins` já filtrava
`upload`/`url` pro plano grátis e `tts`/`recording` pra Premium, com a
mesma regra "a origem JÁ SALVA continua acessível mesmo se a conta
baixar de tier, só não pode ESCOLHER de novo" já em vigor. Admin/
professora nunca passa `allowedAudioOrigins` (sempre irrestrito, "vê
tudo sempre"). Nada disso precisou de mudança nesta fase -- só a UI que
CONSOME esse filtro precisava ser redesenhada.

**O problema real, confirmado**: `renderFieldAudioBlockHTML()` mostrava
um `<select>` técnico com as 5 origens (`Sem áudio`/`URL externa`/
`Arquivo (upload)`/`Texto para voz`/`Gravação`) + um parágrafo explicando
o que cada uma significa + o painel INTEIRO do método atualmente
selecionado, tudo de uma vez, mesmo pra um Field que nunca teve áudio
nenhum -- exatamente a "lista de opções técnicas expostas" que o
prompt-mestre pedia pra eliminar.

### O que foi feito (só `shared/flashcard-field-editor.js`)

**Nova UX em 3 estados, controlados só por um atributo de DOM
(`data-field-audio-ui-state`, nunca persistido -- puramente
apresentacional):**

1. **`summary`** (estado inicial de sempre, inclusive depois de qualquer
   sucesso) -- sem áudio: texto "Sem áudio." + botão único "+ Adicionar
   áudio". Com áudio: `<audio controls>` + o texto de status já existente
   (`fieldAudioIndicatorText()`, intocado) + botões "Substituir" e "🗑
   Remover".
2. **`picker`** (aberto por "+ Adicionar áudio" ou "Substituir") -- lista
   de botões só com os MÉTODOS permitidos pela entitlement
   (`FIELD_AUDIO_METHOD_UI_META`, novo: 📁 Enviar arquivo / 🔗 Usar link /
   🔊 Texto para voz / 🎙️ Gravar áudio, na mesma ordem do mockup aprovado
   -- grátis primeiro) + "Cancelar" (nunca muta `field.audio`).
3. **`panel`** -- o painel técnico do método escolhido (upload/URL/TTS/
   gravação), com um link "← Voltar" no topo. **Os 4 painéis são BYTE A
   BYTE os mesmos elementos/ids/data-attributes de antes desta fase** --
   só passaram a viver dentro de um wrapper que a nova camada de UI
   esconde/mostra; nenhuma linha da lógica que decide QUAL painel
   corresponde à origem atual foi tocada.

**O `<select>` técnico continua existindo** (`data-field-audio-origin`,
agora `style="display:none" aria-hidden="true" tabindex="-1"`) -- é o
motor por baixo: escolher um método no picker só faz
`originSelect.value = method; originSelect.dispatchEvent(new
Event('change'))`, reaproveitando 100% o listener de `change` já
existente (que decide visibilidade de painel + invalida operações em
voo via `beginAudioOp()`, Fase 7h.2) -- nunca uma segunda implementação
da mesma decisão.

**Único ajuste real na lógica** (não cosmético): `data-field-audio-
status` (usado só pelo corredor de upload pra mostrar "Enviando
áudio..."/mensagens de descarte por corrida) foi promovido pra um
elemento PRÓPRIO dentro do painel de upload
(`data-field-audio-upload-status`), porque o parágrafo de status
genérico que existia antes virou parte do estado `summary` (escondido
enquanto o usuário está no painel de upload) -- sem essa mudança, o
feedback de "Enviando áudio..." ficaria escrito num elemento invisível.
As 3 chamadas que escreviam nesse elemento (`shared/flashcard-field-
editor.js`, corredor de upload) foram atualizadas pro novo seletor;
nenhuma outra lógica de upload/TTS/gravação/URL foi tocada.

### Confirmações (pedidas explicitamente na Seção 28 do prompt-mestre)

1. **Arquivos alterados**: só `shared/flashcard-field-editor.js` (+162/
   -53 linhas, confirmado por `git diff --stat`). Nenhum outro arquivo
   (motor, Review, Preview, editores de MC/Type Answer/Cloze, admin/
   aluna) precisou de nenhuma mudança -- os dois integradores continuam
   chamando exatamente as mesmas funções (`renderFieldAudioBlockHTML`/
   `wireFieldAudioBlockFor`/`refreshNativeCardTypeBox`) com a mesma
   assinatura de sempre.
2. **Antes**: `<select>` técnico visível com 5 opções + hint explicando
   cada uma + painel inteiro do método atual sempre exposto, mesmo pra
   Field sem áudio nenhum.
3. **Depois**: resumo (toca/substitui/remove, ou "Sem áudio"+"Adicionar")
   → picker de método (só os permitidos pela entitlement) → painel só do
   método escolhido, com "Voltar"/"Cancelar" em cada passo.
4. **Modelo Native intocado**: `Field.audio` continua exatamente o
   contrato da Fase 7b (`{type, url/generatedUrl/..., }`), nenhum campo
   novo, nenhuma tabela nova, nenhum `audioType` paralelo -- confirmado
   por leitura, a única mudança em qualquer estrutura de dado foi
   renomear o SELETOR de um elemento de status de UI
   (`data-field-audio-status` → `data-field-audio-upload-status`), nunca
   um campo de `Field`/`editorState`.
5. **Motor de áudio não reconstruído**: `resolveFieldAudioUrl`/
   `isValidFieldAudio`/`computeTtsGenerationKey`/`isTtsAudioStale`/
   `validateFieldAudioUrl`/`validateFieldAudioUploadFile`/
   `validateTtsGenerationRequest` (`shared/flashcard-model.js`), a Edge
   Function `tts-generate`, `shared/flashcard-field-audio-recorder.js`
   (máquina de estados de gravação, Fase 7g), `uploadFlashcardMedia`/
   `uploadOwnFlashcardMedia`/`requestFieldAudioTTS`/
   `requestOwnFieldAudioTTS` -- nenhum destes foi tocado, confirmado por
   `git diff --stat` (só 1 arquivo mudou) e por leitura de cada um antes
   de decidir não mexer.
6. **Matriz Free/Premium confirmada intacta**: FREE continua só
   upload+URL, PREMIUM continua ganhando TTS+gravação, mesmo mecanismo
   `allowedAudioOrigins` já existente desde a Fase 7h.1, agora só
   controlando quais BOTÕES aparecem no picker em vez de quais `<option>`
   aparecem no `<select>` escondido. Testado explicitamente (ver abaixo)
   que uma conta FREE nunca vê "Texto para voz"/"Gravar áudio" no picker,
   e que professora/admin (sem `allowedAudioOrigins`) sempre vê os 4.
7. **Áudio existente preservado**: `resolveFieldAudioUrl`/
   `fieldAudioIndicatorText` continuam sendo a única fonte do que o
   `summary` mostra -- um Field com áudio já salvo nunca precisa do
   picker pra o usuário descobrir que ele existe (Seção 9 do
   prompt-mestre), confirmado visualmente (ver screenshots) e via teste.
8. **Legacy → Native**: `nativeNoteEditorStateFromLegacyRow()` (Fase
   6D.8) não foi tocada -- continua populando `field.audio` a partir de
   `audio_url` legado exatamente como antes; como o novo `summary` lê
   `field.audio`/`resolveFieldAudioUrl()` do mesmo jeito que o código
   antigo já lia, um Field convertido do legado com áudio já aparece
   corretamente na tela nova sem nenhuma adaptação.
9. **Preview/Review confirmados intocados**: `fr/app.js`/`zh/app.js`/
   `shared/flashcard-preview.js` não aparecem no diff -- Preview e Review
   continuam lendo só `card.cardInstance`/`resolveCardContentView()`,
   nunca o editor de Field em si; a UX nova é estritamente sobre a tela
   de EDIÇÃO/CRIAÇÃO, nunca sobre como o áudio é consumido depois de
   salvo.

### Testes realizados

- `node --check` sem erro em `shared/flashcard-field-editor.js` e nos 7
  arquivos adjacentes que consomem/compartilham o componente
  (`admin-flashcards.js`/`my-flashcards.js`/`flashcard-mc-editor.js`/
  `flashcard-typeanswer-editor.js`/`flashcard-cloze-editor.js`/
  `flashcard-field-audio-recorder.js`/`flashcard-model.js`) -- nenhum
  regrediu.
- **Playwright real, Chromium real, FR+ZH, 43 verificações por idioma
  (86 no total) através do app de produção servido estático** (boot
  guest bypassado via `CURRENT_USER` fake + monkey-patch só das funções
  de REDE -- `fetchMyOwnFlashcards`/`hasActiveTeacherLink`/
  `fetchMyPlanTier`/`uploadOwnFlashcardMedia`/`deleteOwnFlashcardMedia`/
  `requestOwnFieldAudioTTS`/`createOwnFlashcard` -- nunca uma segunda
  implementação do editor): estado inicial = `summary` com "Sem áudio."+
  "+ Adicionar áudio"; `<select>` técnico confirmado escondido; picker
  FREE mostra só Enviar arquivo/Usar link, nunca TTS/Gravar; Cancelar no
  picker volta pra summary sem mutar `field.audio`; fluxo de upload
  REAL (arquivo de verdade via `setInputFiles`) -- painel certo aparece,
  upload disparado exatamente 1 vez, sucesso volta sozinho pra summary
  com `<audio>`/Substituir/Remover; Substituir reabre o picker (nunca
  exige remover primeiro); URL inválida (`http://`) rejeitada sem tocar
  no áudio já existente; URL válida aplicada de verdade (substituição
  funcionando, `<audio src>` novo confirmado); Remover volta pra "Sem
  áudio" sem recriar o Field (id preservado); salvar um cartão SEM áudio
  continua funcionando (persistência real confirmada: `fields`/
  `card_generation_mode` gravados corretamente, payload sem `audio` em
  nenhum Field); PREMIUM mostra os 4 métodos no picker; TTS sem `noteId`
  (rascunho ainda não salvo) mostra o aviso "Salve o cartão primeiro..."
  de sempre, nunca chama a rede; "Voltar" retorna pra summary sem mutar
  nada; painel de gravação alcançável (botão Gravar presente, Parar
  escondido até começar); Professora/admin (`renderFieldAudioBlockHTML`
  sem `allowedAudioOrigins`) sempre mostra os 4 métodos, nunca gateado.
  Os únicos 2 `pageerror` capturados (1 por idioma) são
  `TypeError: ...createClient`/`supabaseClient is not defined` -- a
  MESMA classe de erro pré-existente documentada dezenas de vezes nesta
  sessão inteira (CDN do Supabase bloqueado pelo proxy de saída deste
  sandbox, nunca relacionado a código deste app), não um erro novo.
- **Inspeção visual real** (screenshot Playwright, fr, 480px -- largura
  de telefone): confirmado que o estado `summary` sem áudio mostra só
  "Sem áudio." + 1 botão; o `picker` (Premium) mostra os 4 métodos com
  ícone+rótulo, sem nenhum campo técnico visível; o `summary` com áudio
  mostra o player nativo + status + Substituir/Remover -- nenhum ID,
  path de storage, ou detalhe de implementação exposto em nenhum dos 3
  estados, confirmando visualmente (não só via assert) que a
  complexidade técnica interna permanece, mas a complexidade EXPOSTA ao
  usuário caiu como pedido.

### Limitações conhecidas / débito técnico (nenhum bloqueante)

- A ordenação exata dos 4 métodos no picker (grátis primeiro, Premium
  depois) é a mesma do mockup aprovado no prompt-mestre -- não foi
  perguntado se a autora prefere agrupar visualmente os 2 grupos com
  algum separador; ficou como uma lista simples, mesma disciplina de
  "não inventar componente novo" já usada no resto da fase.
  Reconsiderar só se a autora pedir.
- "Substituir" sempre reabre o picker completo (nunca pré-seleciona o
  método atual) -- decisão deliberada (Seção 10 do prompt-mestre: "não
  force o usuário a remover primeiro", nunca disse "pule direto pro
  mesmo método"); se escolher o MESMO método de novo, o painel técnico
  já vem pré-preenchido com o valor atual (comportamento herdado sem
  mudança, confirmado no teste de URL).
- Nenhuma auditoria de acessibilidade além do pedido explícito (labels/
  estados disabled/loading/foco continuam os mesmos de antes, nada
  removido) -- não foi feita uma auditoria completa de acessibilidade do
  editor inteiro, só confirmado que esta mudança não introduz regressão
  óbvia (Seção 20 do prompt-mestre, "não é uma auditoria de
  acessibilidade do projeto inteiro").
- Não foi feito um teste interativo separado clicando através de
  `shared/admin-flashcards.js` (professora) além da verificação
  estrutural direta de `renderFieldAudioBlockHTML()` sem
  `allowedAudioOrigins` -- justificativa: é literalmente o MESMO
  componente que já foi testado interativamente do lado da aluna (código
  compartilhado, confirmado por leitura), então o risco de comportamento
  divergente é baixo, mas registrando por completude/honestidade, mesmo
  padrão já usado repetidas vezes nesta feature quando uma entrega
  validou só um dos dois lados.

**Escopo desta entrega**: só `shared/flashcard-field-editor.js`. Nenhuma
migração, nenhum passo manual pendente pra autora.

**PARE conforme instrução explícita -- CONSOLIDAÇÃO-5 (Tags + correção/
validação do Anki export) é a próxima fase da série e NÃO foi
implementada nesta entrega.** Próxima etapa só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

## CONSOLIDAÇÃO-5 -- Tags no Anki Export + correção do "unidadenull" na
origem

Última fase da série CONSOLIDAÇÃO. Precedida de uma auditoria só-leitura
apresentada antes de qualquer código (regra explícita da autora: "antes de
codificar, faça a auditoria e me mostre o diagnóstico... implemente
somente o que o diagnóstico justificar"). O diagnóstico confirmou 2
achados: (1) `shared/anki-export.js` sempre gravava
`` `unidade${card.unitId} ` `` na coluna `notes.tags` do Anki, incondicional
-- e `card.unitId` é SEMPRE `null` pra qualquer cartão teacher/self (Fase
4, `buildEngineCardsFromRow()`), produzindo a string literal
`"unidadenull "` pra todo cartão autorado por professora/aluna; (2) a
feature real de Tags (migration 048, `teacher_flashcards.tags`/
`own_flashcards.tags`, já normalizada via `normalizeTagSlug`/
`normalizeNoteTags` desde o fechamento da Fase 7j) nunca chegava ao
`card` em runtime -- `buildEngineCardsFromRow()` lia `rowId`/`teacherNote`/
`imageUrl` de `row`/`note`, mas nunca `row.tags`. Autorizado exatamente
como diagnosticado, com 14 restrições explícitas (ver abaixo).

**Correção, 2 arquivos, cirúrgica:**

- **`shared/flashcard-model.js`, `buildEngineCardsFromRow(row, opts)`** --
  ganhou `const tags = normalizeNoteTags(row.tags);` computado 1x por
  linha (nunca por CardInstance), incluído no objeto retornado dentro do
  `.map()` -- mesmo "bucket" de metadado Note-level que `rowId`/
  `teacherNote`/`imageUrl` já usavam. `interpretNoteFromRow()`/
  `interpretNativeNoteFromRow()` continuam SEM ler tags (restrição 1,
  intocadas) -- tags nunca viram Field nem propriedade de direção.
  Como o cálculo é feito 1x fora do `.map()`, `normal_reversed` (2
  CardInstances) e Cloze multi-marca (N CardInstances) recebem a MESMA
  referência normalizada -- nunca tags divergentes entre irmãs da mesma
  Note (restrição 6).
- **`shared/anki-export.js`** -- nova função `ankiNoteTagsString(card)`:
  `card.unitId != null` (cartão de trilha) preserva EXATAMENTE
  `` `unidade${card.unitId} ` `` (restrição 4, byte a byte, nunca tocado);
  `card.unitId == null` (professora/aluna) usa `card.tags` real,
  formatado no padrão canônico do Anki (`" tag1 tag2 "`, compatível com
  `shared/anki-parser.js:150`, `(row[3]||'').trim().split(/\s+/)`) --
  sem tags reais, string vazia, **nunca** "unidadenull" nem nenhum outro
  placeholder (restrição 5/10 -- corrigido na origem, nunca um
  `.replace()` posterior). A única chamada `db.run('INSERT INTO notes...')`
  trocou `` `unidade${card.unitId} ` `` por `ankiNoteTagsString(card)`.

**Testes executados, números reais (nunca inventados):**
- **Node/VM, `test_consolidacao5_tags_export.js` (novo), 52/52** --
  cobre `normalizeTagSlug`/`normalizeNoteTags` isolados (acentos, case,
  dedup); propagação de tags via `buildEngineCardsFromRow()` real pra
  Native+Legacy × teacher+own × sem-tags/1-tag/múltiplas-tags/duplicatas;
  os 5 Card Types (Normal, Normal com reverso -- 2 CardInstances com as
  MESMAS tags mesmo com FSRS mutado independentemente --, Cloze
  multi-marca -- 2 CardInstances com as MESMAS tags --, Múltipla Escolha,
  Digite a resposta); `ankiNoteTagsString()` isolada (trilha preservada
  byte a byte inclusive `unitId===0`; tags reais formatadas; sem tags ->
  vazio; regressão explícita "nunca produz a string unidadenull", com e
  sem `card.tags` definido); um **round-trip REAL** Import→Storage→Export
  -- `.apkg` genuíno construído com sql.js+JSZip (`notes.tags` = `"
  Vocab A1 café-com-leite vocab "`), parseado por `parseApkgFile()` +
  `buildAnkiImportPlan()` (produção real, `shared/anki-parser.js`/
  `shared/anki-import.js`, intocados nesta fase), o `editorState`
  resultante convertido pra linha via `nativeContentColumnsFromEditorState()`
  (simulando "armazenamento"), realimentado em `buildEngineCardsFromRow()`
  + `ankiNoteTagsString()` -- confirma `['vocab','a1','cafe-com-leite']`
  preservado semanticamente (dedup Vocab/vocab, acento normalizado) do
  Import até a string `.apkg` final, nunca "unidadenull" mesmo vindo de
  um cartão 100% importado do Anki, e que reimportar a string exportada
  produz o MESMO conjunto (round-trip estável/idempotente).
- **Regressão de todas as fases anteriores que tocam `shared/flashcard-
  model.js`/`shared/anki-export.js`, re-executadas sem nenhuma mudança de
  comportamento**: `test_fase4_engine.js` 34/34, `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74, `test_fase6d1_editor_state.js` 99/99, `test_fase6d3_field_editor.js`
  65/65, `test_fase6d4a_mc_editor.js` 92/92, `test_fase6d5_cloze_editor.js`
  71/71, `test_fase6d6_native_persistence.js` 85/85,
  `test_fase6d7_preview_logic.js` 59/59, `test_fase6d8_legacy_conversion.js`
  92/92, `test_fase7a_media_resolution.js` 45/45,
  `test_fase7b_field_audio_contract.js` 83/83, `test_fase7f_impl_tts.js`
  41/41, `test_fase7g_recording.js` 118/118,
  `test_fase7i_anki_export_unit.js` 49/49, `test_consolidacao1_unit.js`
  62/62, `test_consolidacao2_unit.js` 60/60, `test_consolidacao3_unit.js`
  12/12 -- **total 1057/1057 sem nenhuma regressão**. 2 falhas
  pré-existentes e NÃO-relacionadas (`test_fase6d2_state.js`,
  `test_fase6d4b_typeanswer_editor.js`) confirmadas idênticas contra o
  commit anterior via `git stash`/`git stash pop` -- já documentadas
  desde o fechamento da CONSOLIDAÇÃO-2 como scripts de teste
  desatualizados, não código de produção.
- **Supabase real, transação + rollback (projeto `eigjocalzwamisgqilhg`)**
  -- confirmado ao vivo que `teacher_flashcards.tags`/`own_flashcards.tags`
  (migration 048) já existem (`text[] not null default '{}'::text[]`).
  Snapshot antes: `teacher_flashcards` 5 linhas (hash
  `fb70341cdae90af70f90613b7445b12c`), `own_flashcards` 7 linhas (hash
  `bb393e2d0e27534c956ad9e67a3caf09`). `BEGIN`; INSERT real em
  `teacher_flashcards` reaproveitando `teacher_id`/`student_id`/
  `language_app_key` de uma linha existente, com `tags:
  ARRAY['Vocab','A1',' café-com-leite ','vocab']`; INSERT real em
  `own_flashcards` com `tags: ARRAY['Professora','unidade-1']`,
  `RETURNING` confirmado; `ROLLBACK`. Snapshot depois: MESMAS contagens
  E MESMOS hashes (byte a byte idênticos ao antes), `leftover_test_rows:0`
  -- confirma que o schema aceita o payload real de `tags` sem violar
  constraint nenhuma, e que nenhum dado de teste ficou de pé em produção.
- **Browser smoke mínimo, `test_consolidacao5_browser_smoke.js` (novo),
  FR+ZH, 32/32, zero UI nova** -- página real servida estática, só as 3
  dependências externas (Supabase, sql.js/JSZip, `fetch`) fakeadas.
  Confirma, através do código de produção real (nunca uma cópia):
  `buildCardFromTeacherFlashcard()` propaga `card.tags` normalizado;
  `buildCardFromSelfFlashcard()` (Legacy, sem tags) devolve `[]`, nunca
  `undefined`; `ankiNoteTagsString()` acessível globalmente com o
  comportamento correto nos 4 casos (trilha preservada, sem tags,
  com tags, `card.tags` ausente); `generateApkg()` completo continua
  funcionando de ponta a ponta, com o card sintético exportado carregando
  as tags REAIS no `.apkg` (`" professora "`, nunca "unidadenull").

**Comportamento das Tags -- matriz confirmada por teste:**

| Origem | unitId | Antes (bug) | Depois (correção) |
|---|---|---|---|
| Trilha (`origin:'study'`) | número real | `"unidade{N} "` | **Inalterado**, `"unidade{N} "` |
| Professora/Aluna, Native, sem tags | `null` | `"unidadenull "` | `""` (vazio) |
| Professora/Aluna, Legacy, sem tags | `null` | `"unidadenull "` | `""` (vazio) |
| Professora/Aluna, com 1+ tags | `null` | `"unidadenull "` | `" tag1 tag2 "` |
| Normal com reverso (2 CardInstances) | `null` nas 2 | `"unidadenull "` nas 2 | mesmas tags reais nas 2 |
| Cloze multi-marca (N CardInstances) | `null` em todas | `"unidadenull "` em todas | mesmas tags reais em todas |
| Múltipla Escolha / Digite a resposta | `null` | `"unidadenull "` | tags reais |

**Problemas fora de escopo, registrados sem correção (nenhuma
implementada nesta fase, conforme restrições 2/7/8/9)**:
- Nenhuma UI de Tags nova (busca/filtro/gestão/autocomplete) -- as tags
  continuam só legíveis via `card.tags`, sem nenhuma tela pra
  visualizar/editar além do que já existia (Anki Import, que já
  gravava tags desde o fechamento da Fase 7j).
- Nenhum Deck Engine/Deck-0, nenhuma mudança no limite de 20 cartões
  grátis, nenhuma mudança em FSRS/Review/Preview/renderer/áudio,
  nenhuma mudança de arquitetura Native/Legacy, nenhuma migração/
  backfill de dado existente, nenhuma coluna legada removida.
- `shared/anki-parser.js`/`shared/anki-import.js` não foram tocados --
  já corretos desde o fechamento da Fase 7j, só reutilizados pelo
  teste de round-trip.

**Arquivos alterados**: `shared/flashcard-model.js` (+12/-0),
`shared/anki-export.js` (+34/-1). Nenhuma migração SQL nesta fase --
`tags` já existia desde a migration 048 (fechamento da Fase 7j). Nenhum
passo manual pendente pra autora.

**Commit**: `92b3d39` (branch `claude/test-previous-changes-bo5atv`).

## CONSOLIDAÇÃO-6 -- limpeza do Legacy e encerramento do caminho de
criação antigo

Sexta e (por ora) última fase da série CONSOLIDAÇÃO. Regra de ouro do
prompt-mestre, confirmada e cumprida: **PODE remover** código cujo único
propósito é criar um cartão NOVO no formato Legacy (branches de INSERT
soltos, formulários mortos, testes que só validam essa criação).
**NUNCA remove**: ler/editar um cartão Legacy já existente, a conversão
explícita Legacy->Native (Fase 6D.8), export de cartão Legacy, colunas/
dado Legacy no banco, os adapters que interpretam dado histórico.

### Auditoria inicial

A auditoria (feita ANTES de qualquer código, apresentada como diagnóstico
via chat e só implementada após autorização explícita) confirmou que a
CONSOLIDAÇÃO-1 já tinha eliminado o formulário de criação Legacy da UI --
restavam só **2 call sites reais** que ainda criavam um cartão novo pelo
branch Legacy de `createOwnFlashcard()`, os dois em fluxos de IMPORTAÇÃO
de cartão externo, nunca no formulário manual "+ Criar cartão":
1. `confirmAndImportMyFlashcards()` (`shared/my-flashcards.js`) -- import
   de arquivo `.json`/link entre alunas (Prop 6, "7 propostas").
2. `importSelectedPublicFlashcards()` (`shared/public-profile.js`) --
   importar um cartão do perfil público de outra conta (Fase 2 do
   prompt-mestre "perfil público").

Os dois chamavam `createOwnFlashcard({languageAppKey, front, backTrans,
note, frontPinyin, frontIsTargetLanguage})` -- sem `nativeState`, caindo
direto no branch Legacy de INSERT (linha sem `fields`/
`card_generation_mode`), fora do princípio "todo cartão novo é Native"
que o resto do app já seguia desde a CONSOLIDAÇÃO-1.

**Pergunta feita à autora antes de tocar em código** (via
`AskUserQuestion`, 2 rodadas -- a 1ª pergunta era técnica demais, a
autora pediu mais detalhe; reexplicado em linguagem simples com os 2
trechos de código reais antes de reperguntar): "deixar como está" vs.
"migrar pro formato novo". **Resposta explícita: "Migrar pro formato
novo."**

### Limpeza realizada

- **`shared/flashcard-native-persistence.js`** -- nova função
  `nativeNoteEditorStateFromImportPayload(payload, languageAppKey)`,
  reaproveitando 100% `nativeNoteEditorStateFromLegacyRow()` (a MESMA
  função que já converte um cartão Legacy JÁ EXISTENTE quando a
  professora/aluna clica "Usar o novo editor", Fase 6D.8) -- constrói um
  "row" sintético Legacy-shaped (`id:null, revision:0, origin:'self'`,
  nunca choices/cloze_sentence/mídia -- nenhum dos 2 formatos de import
  jamais carregou isso) e devolve um Note editorState Native pronto. `id:
  null` deixa explícito que é uma CRIAÇÃO nova, nunca aponta pra linha
  existente.
- **`shared/my-flashcards.js`**/**`shared/public-profile.js`** -- os 2
  call sites passaram a construir `nativeState` via a função acima ANTES
  de chamar `createOwnFlashcard({languageAppKey, nativeState})` -- mesmo
  resultado visual de sempre (frente/verso simples), agora gravado no
  modelo nativo. Um comentário stale em `my-flashcards.js` (que ainda
  implicava a existência da assinatura Legacy de criação) foi corrigido
  na mesma auditoria de grep pós-edição.

**Extrapolação registrada explicitamente, além da pergunta literal
respondida**: a partir da confirmação de que os 2 únicos chamadores
restantes tinham sido migrados, uma auditoria de grep no repositório
inteiro confirmou que **nenhum outro caller real** chamava mais
`createFlashcard()`/`createOwnFlashcard()` sem `nativeState` -- ou seja,
o branch Legacy de INSERT dessas 2 funções tinha virado código
genuinamente morto. Isso já estava coberto pela Seção 9 do próprio
prompt-mestre ("existe algum fluxo legítimo que ainda chama isto pra
CRIAR um cartão? Se não, e for genuinamente morto -> remover"), então o
branch foi removido nesta mesma sessão:
- **`createFlashcard()`** (`shared/teacher-flashcards.js`) --
  `nativeState` agora é sempre obrigatório; a bifurcação `if
  (nativeState){...}else{...INSERT Legacy solto...}` foi eliminada,
  sobra só o caminho nativo.
- **`createOwnFlashcard()`** (`shared/own-flashcards.js`) -- mesma
  limpeza, mesmo raciocínio.
- `_validateFlashcardContent()`/`_validateOwnFlashcardContent()`
  (validadores privados de conteúdo Legacy) **não foram removidos** --
  ganharam só um comentário esclarecendo que agora são chamados
  exclusivamente pelo branch Legacy de EDIÇÃO, nunca mais por criação.

### Legacy

**Intocado, confirmado por leitura e por teste**: `updateFlashcardContent()`/
`updateOwnFlashcardContent()` continuam com os 2 branches (nativo e
Legacy) exatamente como antes -- editar um cartão Legacy já existente
sem `nativeState` continua gravando só colunas soltas
(`front`/`back_trans`/etc.), nunca cria uma linha nova, nunca é forçado
a virar Native sozinho (Seção 6 do prompt-mestre, "não é o mesmo tipo de
mudança que criar um cartão novo"). `flashcardEditFormHTML`/
`wireFlashcardEditForm` (admin) e `myFlashcardEditFormHTML`/
`wireMyFlashcardEditForm` (aluna) continuam intactos. A conversão
explícita Legacy->Native (`legacyFlashcardConversionPreflight()`,
`nativeNoteEditorStateFromLegacyRow()`, botão "🧪 Usar o novo editor de
campos", Fase 6D.8) não foi tocada -- confirmado que
`test_fase6d8_legacy_conversion.js` (a suíte canônica dessa capacidade,
que constrói linhas Legacy via um helper próprio, nunca via
`createFlashcard()`) continua 92/92 sem nenhuma falha.

### Native

Nenhuma migração de schema, nenhum backfill de dado existente. Confirmado
via query real (transação + `rollback`, projeto `eigjocalzwamisgqilhg`)
que um INSERT no shape exato que `nativeNoteEditorStateFromImportPayload()`
+ `nativeContentColumnsFromEditorState()` produzem grava `fields`/
`card_generation_mode` corretamente e todas as colunas Legacy (`choices`/
`cloze_sentence`/`front_pinyin`) como `null` -- e que a MESMA constraint
que já protegia `teacher_flashcards` (`own_flashcards_fields_paired`,
migration 045) segue rejeitando um estado híbrido (fields sem
card_generation_mode) na tabela `own_flashcards` também. Confirmado que
o UPDATE do branch Legacy de edição continua funcionando numa linha real
já existente, sem tocar `fields`/`card_generation_mode`. Nenhum dado de
teste ficou de pé -- hash/contagem de `teacher_flashcards` (5 linhas) e
`own_flashcards` (7 linhas) idênticos antes/depois de toda a validação.

### Testes

**Suíte Node/vm nova, `test_consolidacao6_unit.js`, 78/78** -- cobre:
mapeamento correto de `nativeNoteEditorStateFromImportPayload()` (fr/zh,
com/sem pinyin, `frontIsTargetLanguage` true/false/ausente, nota
presente/ausente, mídia nunca inventada); round-trip REAL pelo motor
(`nativeContentColumnsFromEditorState` -> linha simulada ->
`buildEngineCardsFromRow` -> `resolveCardContentView`) confirmando
resultado visual idêntico a um flip simples de sempre e FSRS em estado
default (`reps:0`/`lapses:0`/`state:'new'`); `createFlashcard()`/
`createOwnFlashcard()` SEM `nativeState` agora falham de forma clara
(via o guard estrutural de `noteEditorStateToRow()`), sem nenhuma
chamada de rede antes disso; COM `nativeState` real, o payload que
chega no INSERT bate exatamente com o esperado (`teacher_id`/
`owner_id` certos, `fields`/`card_generation_mode` presentes,
`choices` sempre null); `updateFlashcardContent()`/
`updateOwnFlashcardContent()` confirmadas intocadas, exercitando de
fato o branch Legacy de edição sobre um cartão existente; auditoria
arquitetural embutida no próprio teste (grep contra o código de
produção real) confirmando ausência de `if(nativeState)` residual nas 2
funções de criação e **zero call site, no repositório inteiro, de
`createFlashcard(`/`createOwnFlashcard(` sem `nativeState`**.

**Regressão re-executada, números reais**: `test_consolidacao1_unit.js`
62/62, `test_consolidacao2_unit.js` 60/60, `test_consolidacao3_unit.js`
12/12, `test_consolidacao5_tags_export.js` 52/52,
`test_fase6d8_legacy_conversion.js` 92/92 -- todas sem regressão.
**Uma falha pré-existente reproduzida e classificada, não corrigida**:
`test_fase6d6_native_persistence.js` (suíte da Fase 6D.6, anterior a
toda a série CONSOLIDAÇÃO) quebra nos cenários 9-12 -- eles usavam
`createFlashcard()` SEM `nativeState` só pra SEMEAR uma linha Legacy de
teste (não pra testar a criação Legacy em si na maioria dos casos, mas
dependiam do mecanismo que acabou de ser removido). Confirmado por
leitura que é exatamente o comportamento que esta fase foi autorizada a
eliminar -- não é um bug, é a consequência direta e esperada da
limpeza. Vive só no scratchpad (nunca commitado, `git ls-files` confirma
zero teste rastreado neste repo), não editada -- é um artefato histórico
de uma fase anterior, não uma spec viva; a capacidade real que ela
tentava validar (seed de linha Legacy + conversão) continua 100%
coberta por `test_fase6d8_legacy_conversion.js`, que nunca dependeu de
`createFlashcard()` pra isso.

### Auditoria global final

Re-grep de todo o repositório (`shared/`, `fr/`, `zh/`) pelos termos do
prompt-mestre, classificados A(Native, devia sumir)/B(Legacy compat,
correto permanecer)/C(doc/comentário)/D(morto):
- `frontIsTargetLanguage` -- todas as ocorrências restantes são **B**
  (branch Legacy de edição em `updateFlashcardContent`/
  `updateOwnFlashcardContent`/`shared/admin-flashcards.js`/
  `shared/my-flashcards.js`, ou leitura de dado Legacy pra export/preview
  em `shared/public-profile.js`/`myFlashcardsExportPayload`) ou **C**
  (comentários documentando que Native nunca usa isso).
- `reviewDirection`/`isReverse`/`nextCardDirection` -- todas **B**,
  exclusivas do mecanismo de trilha (`!card.cardInstance`), já
  confirmado desde a Fase 4/7a que cartão nativo nunca recebe nenhum dos
  3; nenhuma ocorrência nova, nenhuma introduzida por esta fase.
- `legacyFlashcard*`/`createLegacy*` -- `createLegacyNoteEditorStateFromRow`
  (wrap de exibição/comparação de um Legacy existente, Fase 6D.1),
  `legacyFlashcardConversionPreflight` (o gate da conversão explícita,
  Fase 6D.8) -- ambos **B**, exatamente o que deve permanecer. Menções a
  `legacyFlashcardRowToCard`/`bridgeNoteCardsToLegacyShape` são só **C**
  (comentários históricos, essas funções já tinham sido eliminadas nas
  Fases 3/4, muito antes desta série).
- **Nenhum call site D (morto) sobrou** -- confirmado que, no
  repositório inteiro, só 3 pontos fazem `INSERT` em
  `teacher_flashcards`/`own_flashcards`: `createFlashcard()`,
  `createOwnFlashcard()` (as 2 agora Native-only) e
  `persistAnkiImportBatches()` (`shared/anki-import.js`, Fase 7j) --
  confirmado por leitura que esta terceira já constrói seu payload via
  `nativeContentColumnsFromEditorState()`, sempre Native, nunca dependeu
  do branch removido.

**Achado incidental, fora do escopo desta fase, registrado sem
correção**: `myFlashcardsExportPayload()` (`shared/my-flashcards.js`,
export JSON/link entre alunas, Prop 6) lê `c.front_is_target_language`
de uma linha crua pra montar o payload de export -- mas
`nativeContentColumnsFromEditorState()` sempre grava esse mirror como
`true` FIXO (nunca reflete a direção real escolhida pelos `Field.lang`
do cartão Native). Resultado: exportar um cartão Native cuja direção
foi invertida no editor (front=tradução, back=idioma estudado) produz
um payload de export com `frontIsTargetLanguage:true` errado -- o texto
em si (`front`/`backTrans`, via o mirror posicional) continua correto,
só a direção pode ficar invertida na cópia importada por outra conta.
Pré-existente a esta sessão (não causado pela limpeza de hoje), tangente
ao objetivo desta fase (que é sobre CRIAÇÃO, não sobre fidelidade do
export/import), não corrigido -- registrado aqui pra uma sessão futura
que mexer em `myFlashcardsExportPayload()`/`deriveLegacyMirrorFromNoteEditorState()`.

### Documentação

Esta seção.

### Fora de escopo (Seção 15, confirmado não tocado)

Nenhuma migração de dado em massa, nenhuma coluna Legacy removida,
nenhum dado apagado, nenhuma mudança em FSRS/Review/Preview/renderer/
áudio/Tags/Anki/Decks/limite de 20 cartões grátis além do estritamente
necessário, nenhuma UI nova, nenhuma refatoração estética ampla, nenhuma
reescrita do motor Native. `shared/flashcard-model.js` não foi tocado.

### Commit

Branch `claude/test-previous-changes-bo5atv`. Arquivos alterados
(`git diff --numstat`): `shared/flashcard-native-persistence.js`
(+46/-0, novo helper), `shared/teacher-flashcards.js` (+25/-38,
bifurcação Legacy de criação removida), `shared/own-flashcards.js`
(+20/-30, mesma limpeza), `shared/my-flashcards.js` (+17/-13, import
migrado + comentário corrigido), `shared/public-profile.js` (+7/-8,
import migrado) -- 115 inserções/89 deleções no total, mais esta seção
do CLAUDE.md.

