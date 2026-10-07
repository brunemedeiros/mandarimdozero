# Histórico: Note/CardType/CardInstance: Fases 4, 5, 6A-6D

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 4
(motor de tipos/templates): a ponte legada é REALMENTE eliminada

Prompt-mestre grande, fatiado em fases próprias travadas por autorização
explícita a cada etapa (Fase 1: auditoria só-leitura; Fase 2: modelo
Note/Field/CardType/CardInstance + `interpretNoteFromRow()`; Fase 3:
camada de compatibilidade -- `bridgeNoteCardsToLegacyShape()`, adapter
temporário pros renderizadores antigos continuarem funcionando sem
reescrever tudo de uma vez). A autora aprovou a Fase 3 só depois de um
smoke test real de navegador (Playwright, fr+zh, adapter carregado,
`buildCardFromTeacherFlashcard()` funcionando via adapter, os 4 formatos
existentes confirmados -- normal/normal-invertido/múltipla-escolha/cloze
com e sem áudio próprio, Speed Review/Combinar continuando elegíveis) --
e avisou, ao aprovar, que a Fase 4 NÃO poderia simplesmente empilhar mais
funcionalidade em cima da ponte: "o `bridgeNoteCardsToLegacyShape()` é
uma ponte temporária, não parte da arquitetura final... esse é
provavelmente o principal risco de a implementação 'funcionar' e o
Claude depois ficar tentado a manter a ponte indefinidamente."

**Autorização da Fase 4, 8 restrições obrigatórias, travadas ANTES de
codar (verbatim resumido, todas cumpridas nesta entrega):**
1. **OPÇÃO B** -- a ponte devia ser REALMENTE eliminada ao final da Fase
   4, não substituída por um helper equivalente que reconstrói o shape
   antigo. Fluxo final exigido: `Note + CardInstance → resolveCardField()
   → renderer/feature`, nunca `Note + CardInstance → shape intermediário
   → renderer/feature`. Isso exigia migrar Speed Review, Combinar e
   exportação Anki também, não só os 3 renderizadores de revisão.
2. **"Normal com reverso" = 2 CardInstances independentes** (direções
   opostas, cada um com seu próprio FSRS/histórico, ambos derivados da
   mesma Note) -- nunca um toggle de direção em nível de sessão.
3. **`isReverse`/`nextCardDirection()` não podiam continuar como
   mecanismo estrutural de direção**, nem dentro do tipo `normal` --
   direção decidida pelo próprio CardInstance via os campos que ele
   referencia (`frontFieldIndex`/`backFieldIndex`), nunca pela sessão de
   revisão escolhendo/alternando.
4. `fieldOrder` continua sendo só a ordem de campos no editor -- nunca
   usado pra decidir direção de revisão.
5. `lang` continua propriedade do Field -- nunca usado pra decidir
   automaticamente qual lado é front/back, se deve haver áudio, ou qual
   template usar.
6. Checkpoint técnico obrigatório depois da Fase 4a (motor aditivo),
   ANTES de tocar em qualquer renderizador -- entregue e reportado nesta
   mesma sessão, sem correção da autora (só um lembrete automático de
   commit) -- prossegui pra 4b→4d sem pedir nova autorização, conforme a
   própria instrução dela ("desde que o modelo continue exatamente
   dentro das decisões acima").
7. Não implementar nesta fase: novo editor; TTS/AwesomeTTS; templates
   customizáveis pelo usuário; novos recursos de criação; mudanças no
   FSRS; customização de Card Types. **Nada disso foi tocado.**
8. Manter compatibilidade com dados existentes -- não alterar IDs/
   histórico/FSRS já existentes sem necessidade.

**O que foi feito, por subfase:**

- **4a (aditiva, checkpoint entregue)** -- `shared/flashcard-model.js`
  ganhou, sem tocar em nada pré-existente: `CARD_TYPE_IDS` (`normal`,
  `type_answer`, `cloze`, `multiple_choice` -- só 4 `cardTypeId`
  distintos; "Normal com reverso" de propósito NÃO tem `cardTypeId`
  próprio, reaproveita `'normal'` duas vezes -- mesmo espírito do Anki
  real, cujo note type "Basic and reversed card" usa o MESMO template
  "Card" pros dois lados); `resolveCardField(note, fieldIndex)` (ponto
  único de projeção Field→exibição, nunca decide direção, resolve pinyin
  automaticamente via `field.pinyinFieldIndex`); `resolveNormalCardView`/
  `resolveMultipleChoiceCardView`/`resolveTypeAnswerCardView`/
  `resolveClozeCardView` (um resolver por Card Type);
  `buildReversedCardInstancePair(noteId, frontFieldIndex, backFieldIndex)`
  (utilitário puro, ainda não wireado em `interpretNoteFromRow()` --
  nenhuma coluna legada pede "reversível" hoje -- retorna 2
  CardInstances com ids `noteId`/`${noteId}-b`, cada um com seu PRÓPRIO
  bloco `FLASHCARD_MODEL_FSRS_DEFAULTS` completo, testado que mutar um
  nunca vaza pro outro).
- **4b** -- `buildEngineCardsFromRow(row, opts)` (caminho de construção
  real: chama `interpretNoteFromRow()`, DESTRÓI os campos FSRS de cada
  CardInstance cru antes de guardá-lo em `card.cardInstance` -- evita uma
  segunda cópia defasada de FSRS depois que `shared/fsrs.js` começa a
  mutar só o card top-level, testado explicitamente que mutar o FSRS
  top-level nunca vaza pro `cardInstance` guardado); `resolveCardContentView(card)`
  (dispatcher único por `card.cardInstance.cardTypeId` -- o ponto que
  TODO consumidor devia chamar, satisfazendo a restrição 1).
- **4c** -- migração de fato dos consumidores, nos dois idiomas:
  `buildCardFromTeacherFlashcard`/`buildCardFromSelfFlashcard` →
  `buildEngineCardsFromRow`; `hasPlainFrontBack` reescrito (`normal`/
  `multiple_choice` = par curto exportável/comparável, `cloze`/
  `type_answer` ficam de fora -- resposta aberta, sem texto curto fixo);
  novas `cardPromptText`/`cardAnswerText` (+ `cardPromptPinyinText` no
  zh) -- ponto único que Speed Review/Combinar/export Anki usam pra
  extrair texto de QUALQUER card (trilha OU nativo OU pseudo-objeto de
  opção errada de MC); `renderMultipleChoiceReviewCard`/
  `renderClozeReviewCard` reescritos pra `resolveCardContentView()`;
  `renderTypeAnswerReviewCard` (NOVO -- "digite a resposta", 4º Card
  Type que nenhum dado legado nunca gerou, mas o motor já suporta);
  `renderReviewView()` dispatcher reescrito (`cardInstance.cardTypeId` →
  renderizador certo; corpo de flip usa `resolveNormalCardView()` quando
  `card.cardInstance` existe, preserva o mecanismo antigo `isReverse`/
  `card.reviewDirection` **só no ramo `else` de trilha**, que nunca
  passou pelo modelo Note/CardInstance); `startReviewSession()`:
  `queue.forEach(c => { if (!c.cardInstance) c.reviewDirection =
  nextCardDirection(c); })` -- cartão nativo NUNCA recebe
  `reviewDirection` (restrição 3 cumprida: a sessão não escolhe/alterna
  direção de cartão nativo, só de trilha); `buildSpeedOptions`/
  `startMatchGame`/`ANKI_EXPORT_CONFIG.noteFields`/`.sortField`
  migrados pra `resolveCardContentView()`/`cardPromptText`/
  `cardAnswerText` (restrição 1, Speed Review/Combinar/Anki também
  migrados, não só os 3 renderizadores).
- **4d** -- `legacyRaw` removido de `interpretNoteFromRow()` (não
  existe mais objeto legado intermediário nenhum); `bridgeNoteCardsToLegacyShape()`
  e `legacyFlashcardRowToCard()` **DELETADOS por completo** (confirmado
  via grep, antes de apagar, que zero call site restante dependia
  deles). `bridgeNoteCardsToLegacyShape`/`legacyRaw` não existem mais em
  lugar nenhum do repositório -- restrição 1 cumprida de verdade, não só
  nominalmente.

**Mudança de comportamento real, visível pra quem usa o app hoje --
disclosed explicitamente, não só uma nota técnica**: antes desta fase,
um cartão nativo "Normal" da professora/aluna alternava front↔back de
sessão pra sessão (mesmo mecanismo `isReverse`/`nextCardDirection` que a
trilha sempre usou). A restrição 3 da própria autora proíbe exatamente
esse mecanismo pra cartão nativo -- a direção agora é decidida pelo
CardInstance (`frontFieldIndex`/`backFieldIndex`), nunca pela sessão. Como
nenhum dado legado hoje gera um par "normal com reverso" (isso exigiria
um editor que ainda não existe -- explicitamente fora do escopo desta
fase, restrição 7), **todo cartão "Normal" já existente passou a mostrar
sempre na MESMA direção fixa** (a que o `front_is_target_language`
daquela linha já codificava), perdendo a variedade de sessão que tinha
antes. É consequência direta e deliberada da restrição 3, não um bug --
mas muda o que a professora/aluna realmente vê hoje, então precisa ficar
registrado aqui, não só nos comentários do código. Quando um editor
futuro permitir autorar "normal com reverso" de propósito, a variedade
volta -- só que agora como 2 cartões genuinamente independentes (2 FSRS,
2 históricos), não um toggle raso.

**Bug real encontrado e corrigido durante a validação desta fase (não
reportado pela autora -- achado no smoke test de browser real, ver
abaixo):** `buildSpeedOptions()` (Speed Review) tinha um fallback de
distratores por "cartões da mesma unidade" (`STATE.cards.filter(c => c
!== card && c.unitId === card.unitId)`) que nunca filtrava por
`hasPlainFrontBack()`. Cartões nativos SEMPRE compartilham `unitId:
null` entre si (não pertencem a nenhuma unidade) -- então esse
agrupamento tratava TODOS os cartões nativos como "mesma unidade",
inclusive um cloze/"digite a resposta" podendo ser sorteado como
distrator de um cartão 'normal'. Antes da Fase 4 isso nunca quebrava (a
ponte legada sempre populava `back_trans` plano em QUALQUER tipo,
inclusive cloze); depois de 4d, `resolveClozeCardView()`/
`resolveTypeAnswerCardView()` não têm campo `.back`, e `cardAnswerText()`
quebraria tentando ler `view.back.text` de um distrator desse tipo --
exatamente o que o smoke test capturou (TypeError real, não teórico).
Corrigido nos dois pontos de fallback de `buildSpeedOptions()` (pool
principal + extra de `eligibleReviewPool()`), fr+zh, acrescentando
`hasPlainFrontBack(c)` ao filtro -- mesmo critério que `buildSpeedQueue()`
e `startMatchGame()` já aplicavam no pool DE ENTRADA, só que faltava
também no fallback de distratores.

**Segundo achado, sem código pra corrigir (confirmado seguro por
leitura)**: `shared/reports.js` (contexto do modal "Reportar problema",
2 blocos -- modo Flashcard e modo Speed Review) lia `card.front`/
`card.back_hanzi`/`card.back_trans` direto -- campos que não existem
mais num card nativo pós-4d. Envolto em try/catch (nunca quebrava a
tela), mas degradava silenciosamente o contexto do report pra `null`/
`undefined` quando o report era feito durante a revisão de um cartão
nativo. Corrigido pra usar `cardPromptText`/`cardAnswerText` (com
fallback defensivo pro campo antigo, caso essas funções globais não
existam por algum motivo).

**Suítes de teste**: `test_fase4_engine.js` (novo, motor Fase 4a/4b --
`resolveCardField`/`fieldHasAudio`/os 4 resolvers/`buildReversedCardInstancePair`/
`buildEngineCardsFromRow`/`resolveCardContentView`, 32/32) +
`test_fase4d_regression.js` (novo, porta os MESMOS cenários de dado de
entrada de `test_flashcard_model.js` -- Fase 3, agora aposentada porque
testava `legacyFlashcardRowToCard()` que foi deliberadamente deletada --
validados contra a API real de hoje, 30/30). `test_flashcard_model.js`
(Fase 3) fica no disco só como histórico, não é mais executada -- chamar
`legacyFlashcardRowToCard` nela agora dá erro por desenho, não é
regressão. **Smoke test de navegador real** (Playwright, fr+zh, mesmo
padrão exigido pela autora na aprovação da Fase 3): boot em modo
convidado (evita mockar profiles/badges/notificações -- só a sessão
Supabase é stubada, CDN bloqueado neste sandbox) + injeção direta dos 5
Card Types em `STATE.cards` (normal, normal-invertido com áudio custom,
múltipla escolha, cloze, "digite a resposta" sintético -- nenhum dado
legado gera esse tipo hoje) + par "normal com reverso" via
`buildReversedCardInstancePair` + `startReviewSession()`/`renderReviewView()`
reais rodando ponta a ponta pra cada um. Confirmado: fila de revisão
inclui todos os cartões injetados; par invertido com 2 ids distintos e
FSRS genuinamente independente; nenhum "undefined" vazando em nenhum
HTML renderizado, nos 5 tipos, nos 2 idiomas; múltipla escolha renderiza
opções e o clique+"Continuar" dispara `gradeCurrentCard()` de verdade
(due/reps mudam); cloze renderiza a lacuna; áudio próprio aparece
corretamente no lado invertido (mesmo comportamento `||`-fallback que a
ponte antiga tinha, replicado de propósito); `hasPlainFrontBack` exclui
cloze/type_answer corretamente; `ANKI_EXPORT_CONFIG.cards('all')` exclui
cloze e inclui normal; `buildSpeedOptions()` não quebra mais com pool
misto (confirma o fix acima); mecanismo `nextCardDirection` continua
presente (trilha inalterada). **Zero erro de JavaScript no console em
nenhum dos dois idiomas** (só 2-3 avisos de rede `ERR_TUNNEL_CONNECTION_FAILED`,
mesma limitação de proxy de saída já documentada neste arquivo, não
relacionada ao código).

**Utilitário construído mas não usado no final, registrado por
transparência**: `fieldHasAudio()` (Fase 4a) foi pensado pra decidir
elegibilidade de pronúncia automática consultando `lang` -- mas os
renderizadores finais (4b/4c) acabaram reaproveitando `isStudyLanguageField()`
(já existente desde a Fase 2/3, já aprovada pela autora como "helper pra
regras que genuinamente dependem do idioma do app") em vez de
`fieldHasAudio()`, por operar sobre o mesmo shape `{lang}` com o mesmo
propósito. `fieldHasAudio()` continua no arquivo, testada (32 testes
cobrem ela), mas sem nenhum call site real hoje -- não removida por
enquanto (baixo custo de manter, pode ganhar um chamador quando um
próximo formato precisar da checagem "upload sempre conta, TTS só se
`lang` bate"), mas registrando aqui pra não parecer uma peça esquecida
por acidente.

**Compatibilidade com dados existentes (restrição 8)**: nenhuma
migração de schema, nenhum id/histórico/FSRS alterado. `serializeState()`/
`applySerializedState()` continuam fazendo merge raso por id --
confirmado que isso só depende dos NOMES dos campos FSRS (inalterados,
`shared/fsrs.js` não foi tocado), nunca do formato dos campos de
conteúdo -- o câmbio de shape (campos legados soltos → `note`+
`cardInstance`) é seguro pro progresso real já salvo no Supabase.

**Gratuito x Premium (avaliado, não implementado):** mudança
arquitetural pura, sem nova superfície de produto -- mesma conclusão de
toda fase de infraestrutura sem feature nova visível.

**O que ainda falta / não foi feito nesta fase (de propósito, restrição
7):** novo editor de cartão (é o que permitiria autorar "normal com
reverso"/"digite a resposta"/cloze de verdade pela UI -- hoje só
`buildReversedCardInstancePair`/`resolveTypeAnswerCardView` existem como
motor, sem nenhum formulário que os produza); TTS/AwesomeTTS; templates
customizáveis; novos recursos de criação; mudanças no FSRS; customização
de Card Type. `student_flashcards`/`teacher_flashcards` (as tabelas)
não ganharam nenhuma coluna nova -- é reestruturação do motor que já lê
as colunas existentes, não do schema.

Esta é a Fase 4 completa (4a→4d) de um prompt-mestre que travou
explicitamente "não avance automaticamente" após o checkpoint da 4a --
cumprido (prossegui só depois da própria autorização da autora dizer
"prossiga... sem pedir nova autorização"). Próxima fase só começa depois
de autorização explícita da autora, com este relatório já entregue antes
de pedir luz verde.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 5
(cartões gerados): normal_reversed e Cloze multi-marca atravessam o
pipeline real de geração

Fase 5 nunca teve descrição além do nome antes desta sessão -- travada
como "FASE 5 -- CARTÕES GERADOS: implementar Note → Card Type → Card
Instance(s), especialmente Normal→1 card / Normal com reverso→2 cards
independentes com FSRS próprio, e decidir/explicitar como Cloze gera
cartões quando houver c1/c2/c3 antes de implementar." Só depois de
`AskUserQuestion` (2 perguntas concretas, achados do código real embutidos
nas próprias opções) veio a autorização -- e mesmo assim a autora pediu um
PLANO por escrito (8 pontos + as duas decisões de sintaxe Cloze) antes de
qualquer código, aprovado com 7 ajustes explícitos antes de codar de
verdade.

**Os 7 ajustes da autora, travados antes de codar (cumpridos nesta
entrega):**
1. `cardGenerationMode` explícito tem prioridade sobre a inferência
   legada -- nunca o contrário. Sem coluna SQL definitiva nesta fase; o
   nome físico fica pra Fase 6.
2. Cloze múltiplo aprovado exatamente como proposto -- 1 Field de texto,
   múltiplos `cN` no mesmo Field, 1 CardInstance independente por `cN`,
   FSRS próprio, ids `${cardId}-${markId}`. Sintaxe interna
   `{{cN::texto}}`/`{{cN::texto|compareAnswer}}` -- a professora NUNCA
   digita isso à mão, é trabalho do editor visual da Fase 6.
3. Se o Field contiver marcação nativa `{{cN::...}}`, ela é a ÚNICA fonte
   de verdade -- nunca misturar com `cloze_answer`/`cloze_answer_pinyin`
   legados da mesma linha.
4. "Os dois formatos coexistem pra sempre" NÃO é requisito definitivo --
   só "preservar dado legado + não migrar destrutivamente nesta fase". Se
   um dia tudo migrar pro formato nativo, é decisão de uma fase futura,
   não travada aqui.
5. Teste de persistência precisa verificar explicitamente: ids diferentes
   pra c1/c2, FSRS próprio de cada um, mutar um não afeta o outro,
   reload preserva os dois separadamente.
6. `normal_reversed` precisa ser exercitado pelo caminho REAL
   (`interpretNoteFromRow()` → `buildReversedCardInstancePair()` → 2
   CardInstances) -- não só um teste direto da função isolada. Isso é o
   próprio objetivo da fase: provar que a informação de tipo atravessa o
   pipeline de geração inteiro.
7. Nada de editor, checkbox, seletor de tipo na UI, coluna SQL
   definitiva, rich text, botão Cloze, interface de pinyin, ou qualquer
   outra parte da Fase 6 -- só o motor de geração/persistência e os
   testes necessários.

**O que foi feito, tudo em `shared/flashcard-model.js` (único arquivo
tocado):**

- **`cardGenerationMode`** -- `interpretNoteFromRow()` ganhou uma checagem
  no topo: se `row.cardGenerationMode` for um dos 4 valores reconhecidos
  (`normal`/`normal_reversed`/`multiple_choice`/`cloze`), ele decide o
  tipo, sobre a inferência implícita de sempre (`cloze_sentence`
  populado→cloze, `choices` populado→mc, senão→normal). Nenhuma linha
  real hoje tem esse campo (não existe coluna SQL pra ele) -- 100% do
  dado legado cai sempre no caminho de inferência, comportamento
  idêntico a antes desta fase. `cloze`/`multiple_choice` já eram
  auto-descritivos pelos próprios dados (`cloze_sentence`/`choices`); é
  só `normal_reversed` quem genuinamente PRECISA do campo, porque nada
  no dado consegue sinalizar "sou reversível" sozinho.
- **`normal_reversed` wireado no caminho real** -- depois de montar
  `fields`/`frontFieldIndex`/`backFieldIndex` (mesmo código de sempre pro
  par normal/MC), se `explicitMode === 'normal_reversed'`,
  `interpretNoteFromRow()` chama `buildReversedCardInstancePair(cardId,
  frontFieldIndex, backFieldIndex)` (função já existente desde a Fase
  4a, agora finalmente invocada por dentro da função de produção, não
  isolada) e devolve os 2 CardInstances direto. Testado explicitamente
  via `buildEngineCardsFromRow()` (o caminho que STATE.cards de verdade
  usa): 2 cards no array, ids `t9020`/`t9020-b`, front/back trocados
  entre si, FSRS default idêntico nos 2 no nascimento, e mutar
  due/reps/stability de um confirmado NÃO vazando pro outro.
- **Cloze nativo multi-marca** -- detecção estrutural (não depende de
  `cardGenerationMode`): se `cloze_sentence` já contém `{{c\d+::`, é o
  caminho nativo -- gera 1 CardInstance por marca distinta encontrada via
  `parseClozeMarks()`, ids `${cardId}-${markId}` pra TODAS (mesmo com 1
  marca só -- formato novo, nunca colide com dado legado porque o schema
  antigo nunca produziu `{{c` em `cloze_sentence`). Sem `{{c`, cai no
  caminho legado de sempre (`___` + `cloze_answer`), byte a byte
  idêntico ao que já existia -- id sem sufixo, `markId:'c1'` fixo.
- **Sintaxe `{{cN::texto|compareAnswer}}`** -- `splitClozeMarkRaw()`
  (novo) separa, no `::`, o texto que fica embutido na frase (sempre
  mostrado ao revelar) do valor de comparação opcional depois do `|`
  (pinyin no zh). `parseClozeMarks()` agora devolve `{id, answer,
  compareAnswer}` por marca (`compareAnswer:null` quando não há `|`);
  `renderClozeText()` nunca deixa a parte pós-`|` vazar no texto
  renderizado (nem oculto nem revelado) -- só `answer`.
  `resolveClozeCardView()` ganhou a prioridade: `cardInstance.
  compareAnswer` explícito (caminho legado, `cloze_answer_pinyin`) vence
  se presente; senão cai pro `compareAnswer` da própria marca (caminho
  nativo); senão usa o próprio texto da marca (fr sem pinyin, nos dois
  caminhos) -- nunca mistura as duas fontes na mesma nota (ajuste 3).
- Mudança de shape em `parseClozeMarks()` (nova chave `compareAnswer` no
  objeto por marca) quebrou 2 asserções por igualdade estrita de JSON na
  suíte de regressão da Fase 4d (esperado, disclosed no plano antes de
  codar) -- atualizadas pra incluir `compareAnswer: null`, sem mudança
  de comportamento real (só o shape do teste).

**Achado relevante, reportado sem corrigir nesta fase**:
`buildCardFromTeacherFlashcard(row)`/`buildCardFromSelfFlashcard(row)`
(fr/zh `app.js`) chamam `buildEngineCardsFromRow(row, opts)[0]` --
pegam só o PRIMEIRO card do array, e `mergeTeacherFlashcardsIntoState()`/
`mergeSelfFlashcardsIntoState()` empurram só esse 1 card pra
`STATE.cards` por linha. Ou seja: o motor de geração (`shared/
flashcard-model.js`) já sabe produzir 2+ CardInstances por Note (provado
pelos testes desta fase), mas o ponto de consumo em `STATE.cards` ainda
trunca pro primeiro -- se uma linha real algum dia carregar
`cardGenerationMode:'normal_reversed'` ou `cloze_sentence` com 2+ marcas
nativas, só a 1ª CardInstance chegaria de fato à fila de revisão da
aluna, silenciosamente perdendo as demais. **Não é um bug ativo hoje**
(nenhuma linha real produz mais de 1 card, então `[0]` sempre pega tudo)
-- é um ponto de integração que só passa a importar quando o editor da
Fase 6 conseguir gravar essas linhas de verdade. Fora do escopo desta
fase por estar em `fr/app.js`/`zh/app.js`, não em `shared/flashcard-
model.js` (o único arquivo que as 7 restrições autorizavam tocar) --
registrando aqui explicitamente pra não virar surpresa na Fase 6: o
loop de merge vai precisar iterar o array inteiro (`.forEach`), não só
pegar `[0]`.

**Decisões arquiteturais desta fase:**
1. `cardGenerationMode` mora como propriedade normalizada do objeto de
   entrada (`row`), lida defensivamente -- não uma coluna SQL real ainda.
   Funciona hoje só com linhas construídas em teste; funcionará sem
   nenhuma mudança de código quando a Fase 6 escrever uma coluna real
   com esse nome (ou outro -- o nome físico é decisão da Fase 6, este
   código só lê `row.cardGenerationMode`, agnóstico à origem do campo).
2. Detecção de Cloze nativo é ESTRUTURAL (regex sobre o conteúdo), não
   via `cardGenerationMode` -- um texto com `{{c` já se autodescreve,
   não precisa de um campo extra dizendo "isto é cloze".
   `cardGenerationMode` só é load-bearing pra `normal_reversed`.
3. Zero mudança em `buildEngineCardsFromRow()`/`resolveCardContentView()`
   -- ambos já operavam sobre array de qualquer tamanho desde a Fase 4b,
   confirmando de novo a aposta arquitetural de "um motor só" (mesma
   conclusão já registrada em várias fases anteriores desta feature).
4. Nenhuma migração, nenhuma mudança de schema, nenhuma mudança em
   `fr/app.js`/`zh/app.js`/qualquer renderer -- 100% contido em
   `shared/flashcard-model.js`, exatamente como as 7 restrições pediam.

**Gratuito x Premium (avaliado, não implementado):** mudança de motor
pura, sem nova superfície de produto -- mesma conclusão de toda fase de
infraestrutura desta feature.

**Testes realizados:** `node --check` sem erro. Suíte nova
`test_fase5_generation.js` (43 cenários): `cardGenerationMode` ausente →
dado legado 100% inalterado (id, `cardTypeId`, `displayAnswerText`);
`cardGenerationMode` reconhecido vence a inferência mesmo quando os dados
"pareceriam" outro tipo (linha com `choices` forçada pra `normal`);
`cardGenerationMode` não reconhecido cai na inferência sem quebrar;
`normal_reversed` via `interpretNoteFromRow`+`buildEngineCardsFromRow`
reais -- 2 cards, ids corretos, front/back trocados, FSRS independente
(mutação testada nos dois sentidos); Cloze multi-marca fr (2 marcas sem
`|`) -- 2 CardInstances, ids `-c1`/`-c2`, `compareAnswerText` cai no
próprio texto, FSRS independente; Cloze nativo zh (1 marca com `|pinyin`)
-- `displayAnswerText` é o hanzi, `compareAnswerText` é o pinyin, e o
pinyin confirmado NUNCA vazando no texto que `renderClozeText()`
realmente produz (nem oculto nem revelado); marca nativa confirmada
ignorando `cloze_answer`/`cloze_answer_pinyin` legados da mesma linha
(ajuste 3, valores-sentinela no teste que nunca deveriam aparecer,
confirmados ausentes); teste de persistência dedicado (ajuste 5) --
serializa/reconstrói uma nota com 2 marcas simulando reload real via
merge-por-id (mesmo mecanismo de `applySerializedState()`), confirma
ids diferentes, progresso de c1 preservado (due/reps/stability), c2
continua intocado. Suítes anteriores re-executadas sem regressão:
`test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30 (2
asserções atualizadas pro novo shape de `parseClozeMarks`, disclosed
acima, sem mudança de comportamento real). Não foi feita validação de
navegador (Playwright) nesta fase -- não fazia sentido pro escopo (motor
puro, sem nenhum dado real ou caminho de UI capaz de produzir
`normal_reversed`/Cloze multi-marca hoje; o smoke test de browser da
Fase 4 já cobriu o caminho legado, que continua bit-a-bit idêntico).

**O que ficou de fora nesta entrega original (de propósito, restrição
7):** editor visual; checkbox/seletor de tipo em qualquer UI; coluna SQL
real pra `cardGenerationMode`; rich text; botão "Cloze" de
selecionar-texto; interface de definir pinyin sem expor sintaxe. O loop
de merge em `fr/app.js`/`zh/app.js` continuar truncando pro primeiro
card foi relatado como um achado a resolver -- a autora recusou
explicitamente deixar isso pra Fase 6, ver fechamento abaixo.

## Fase 5 (fechamento) -- `build...From...()` deixa de truncar pro
primeiro CardInstance, `STATE.cards` passa a carregar 1..N por nota

A autora aprovou o motor da Fase 5, mas recusou deixar pendente um ponto
que eu tinha relatado como "não é bug ativo hoje, mas é ponto de
integração da Fase 6": `buildCardFromTeacherFlashcard()`/
`buildCardFromSelfFlashcard()` (fr/zh `app.js`) ainda pegavam só
`array[0]` do resultado de `interpretNoteFromRow()`/
`buildEngineCardsFromRow()` -- o motor já sabia produzir `normal_reversed`
→ 2 CardInstances e Cloze multi-marca → 2+ CardInstances, mas o
consumidor real descartava tudo além do primeiro. Instrução literal:
"A Fase 5 deve terminar com o pipeline de geração capaz de transportar
1..N CardInstances até `STATE.cards`", com 9 restrições (não alterar a
arquitetura Note/CardInstance; não criar UI; não criar coluna SQL; não
alterar o editor; não alterar FSRS; não criar bridge/shape legado novo) e
o contrato-alvo explícito: `build...From...() → Card[]`, com o merge
fazendo o flatten apropriado pra `STATE.cards`.

**Contrato antes/depois, `fr/app.js` e `zh/app.js` (os dois espelhados,
idênticos na estrutura):**

```js
// ANTES -- truncava pro primeiro CardInstance
function buildCardFromTeacherFlashcard(row){
  return buildEngineCardsFromRow(row, { origin:'teacher', appKey:APP_KEY, idPrefix:'t' })[0];
}
// DEPOIS -- devolve o array completo, contrato build...() -> Card[]
function buildCardFromTeacherFlashcard(row){
  return buildEngineCardsFromRow(row, { origin:'teacher', appKey:APP_KEY, idPrefix:'t' });
}
```

Mesma mudança em `buildCardFromSelfFlashcard()`. As 4 funções que
consomem esses builders foram ajustadas pra lidar com array em vez de
card único:

- **`mergeTeacherFlashcardsIntoState()`/`mergeSelfFlashcardsIntoState()`**
  -- de checar 1 id "representante" por linha (`flashcardIdForRow`)
  contra `existingIds`, pra iterar CADA card devolvido pelo builder e
  checar/empurrar por id individual. Necessário porque o id
  "representante" de uma linha de Cloze nativo multi-marca
  (`t${row.id}`, sem sufixo) nunca corresponde a nenhum card real
  (todos os ids reais saem sufixados `-c1`/`-c2`) -- o check antigo nunca
  bateria, o que duplicaria cartões numa hipotética 2ª chamada de merge
  na mesma sessão.
- **`addSelfFlashcardToState(row)`** -- de 1 check + 1 `.push()` de um
  card único, pra iterar todos os cards do array e empurrar cada um
  individualmente. Sem este fix, a mudança de contrato faria este ponto
  empurrar o ARRAY INTEIRO como um único elemento corrompido de
  `STATE.cards` -- achado proativo, não pedido explicitamente pela
  autora, mas necessário pra a mudança de contrato não quebrar a criação
  de cartão na mesma sessão (Fase 5 do sistema de alunas particulares).
- **`updateSelfFlashcardStatusInState(rowId, status)`** -- de `.find()`
  (só atualiza o primeiro card que bate o `rowId`) pra `.forEach()`
  (atualiza TODOS os cards que compartilham aquele `rowId`). Necessário
  porque múltiplos CardInstances (as 2 metades de um `normal_reversed`,
  ou `c1`/`c2`/... de um Cloze multi-marca) agora compartilham o mesmo
  `rowId` -- `.find()` deixaria os cards seguintes com `flashcardStatus`
  desatualizado dentro da mesma sessão (autocorrigia no próximo reload,
  mas era uma inconsistência real enquanto isso).
- **`removeSelfFlashcardFromState(rowId)`** -- já usava `.filter()`,
  que lida corretamente com múltiplos cards do mesmo `rowId` sem
  nenhuma mudança.
- **`replaceSelfFlashcardInState(rowId, updatedRow)`** -- já chama
  `removeSelfFlashcardFromState` seguido de `addSelfFlashcardToState`,
  os dois já corrigidos -- nenhum fix separado necessário, a correção
  já cascateia.

**Testes realizados**, exatamente como a autora exigiu -- suíte Node
completa + testes de regressão + smoke test de navegador real, nos dois
idiomas:

- `node --check fr/app.js`/`zh/app.js` sem erro.
- Suíte Node completa re-executada, sem nenhuma regressão (esperado --
  as 3 suítes só exercitam `shared/flashcard-model.js`, não tocado nesta
  correção): `test_fase4_engine.js` 32/32, `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 43/43 -- **105/105**.
- **Smoke test de navegador real** (Playwright, fr+zh, modo convidado,
  CDN do Supabase stubado, `fetchFlashcardsForCurrentStudent`/
  `fetchMyOwnFlashcards` monkey-patchadas com fixtures sintéticas
  cobrindo os 6 cenários exigidos: normal→1, normal_reversed→2, cloze
  c1+c2→2, múltipla escolha→1, "digite a resposta"→1, cloze legado de
  uma lacuna só→1) -- resultados reais, capturados da execução:
  - **fr**: `teacherCardCount:7` (ids `t80001, t80002, t80002-b,
    t80003-c1, t80003-c2, t80004, t80005`) -- confirma normal(1) +
    normal_reversed(2) + cloze-multi(2) + mc(1) + cloze-legado(1) = 7;
    `teacherCardCountAfterSecondMerge:7` (idempotente, sem duplicar
    numa 2ª chamada de merge); `selfCardCount:7`;
    `totalCardCountAfterBothMerges:14`; `reversedBothPresent:true`,
    `reversedIdsDistinct:true`, `reversedFsrsIndependent:true`;
    `clozeMultiBothPresent:true`, `clozeMultiIdsDistinct:true`,
    `clozeMultiFsrsIndependent:true`; `normalSingleCard:1`,
    `mcSingleCard:1`, `legacyClozeSingleCard:1`,
    `legacyClozeIdUnsuffixed:true` (confirma que o legado continua sem
    sufixo, id idêntico a antes); **cartão pré-existente preservado**:
    `preExistingCardStillPresent:true`, `preExistingCardIdUnchanged:true`,
    `preExistingCardNotDuplicated:true`,
    `preExistingCardProgressPreserved:true` (due:33/reps:2 preservados
    exatamente -- nenhum cartão legado desaparece, muda de id ou perde
    progresso); `addSelfReversedCount:2`,
    `addSelfReversedIds:["s90002","s90002-b"]` (confirma o fix de
    `addSelfFlashcardToState` na mesma sessão, sem reload);
    `allArchivedAfterUpdate:true` (confirma o fix de
    `updateSelfFlashcardStatusInState`, as 2 metades arquivadas juntas).
    2 erros de console, ambos `ERR_TUNNEL_CONNECTION_FAILED`
    pré-existentes (proxy de saída deste sandbox, já documentado em
    toda a sessão, não deste código).
  - **zh**: mesmos resultados/flags, todos `true`, `teacherCardCount:5`
    (fixture zh sem mc/cloze-legado), `addSelfReversedIds:["s90002",
    "s90002-b"]`, `allArchivedAfterUpdate:true`. 3 erros de console,
    mesmo padrão pré-existente.

**Decisão arquitetural desta correção**: nenhuma bridge/shape legado
novo foi criada (restrição 9) -- o merge só passou a iterar o que o
motor já produzia desde a Fase 5 original; nenhuma mudança em
`shared/flashcard-model.js` (motor intocado); nenhuma UI, coluna SQL,
editor ou FSRS tocados (restrições 5-8). O mecanismo de persistência
(merge-por-id em `applySerializedState()`, já existente desde a Fase 0
do sistema de alunas particulares) não precisou de nenhuma mudança --
funciona automaticamente pra N cards por nota desde que cada
CardInstance tenha id estável e único, o que já era garantido pelo
motor da Fase 5 original.

Com esta correção, a Fase 5 está encerrada -- pipeline completo
(Note→CardType→CardInstance(s)→`STATE.cards`) capaz de transportar 1..N
cards por nota, sem nenhuma ponte/atalho temporário. Próxima fase (6 --
editor visual) só começa depois de autorização explícita da autora --
não avançar automaticamente.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 6A
(auditoria do editor atual, só leitura) + Fase 6B (Note nativa: fields +
card_generation_mode persistidos no motor, `type_answer` completo)

**Fase 6A (auditoria, sem código)** -- mapeamento completo do editor atual
(`shared/admin-flashcards.js`/`shared/my-flashcards.js`) contra o modelo
Note/Field/CardType pretendido. Achado central: o editor hoje nunca passa
por `shared/flashcard-model.js` -- escreve direto nas colunas legadas
(`front`/`back_trans`/`cloze_sentence`/`choices`/etc.) via
`createFlashcard()`/`createOwnFlashcard()`, sem nenhum conceito de Field/
CardType. O motor (Fase 4/5) já sabia interpretar `cardGenerationMode` e
Cloze nativo multi-marca, mas nada no editor podia produzir uma linha
assim -- motor e editor evoluíram em paralelo, sem se tocar. Relatório
completo (14 pontos: campos atuais, mapa pro modelo novo, UX por Card
Type, fluxo de Cloze visual, compareAnswer no zh, proposta de
persistência, compatibilidade, Preview, impacto em cada arquivo, riscos)
entregue e revisado pela autora, que corrigiu a arquitetura em 8 pontos
antes de autorizar código -- ver Fase 6B abaixo pra tudo que foi
efetivamente implementado.

**Escopo da Fase 6B, travado explicitamente pela autora**: só
`shared/flashcard-model.js` (camada de modelo/motor). Nada de editor,
UI, rich text, TTS, comportamento visual de áudio/imagem, Preview, ou
migration SQL executada nesta entrega -- confirmado no `git status` ao
final: **só `shared/flashcard-model.js` foi tocado**.

**O que foi feito:**

- **Note nativa: `fields` + `card_generation_mode`, sempre pareados** --
  `isNoteFieldsPresent(row)`/`isCardGenerationModePresent(row)` (novos)
  decidem se uma linha é nativa; `validateNativeNoteRow(row)` valida a
  estrutura inteira ANTES de qualquer geração (nunca confia só no CHECK
  constraint proposto pra migration, ainda não aplicada): pareamento
  ambos-ou-nenhum, `fields` array não vazio, `card_generation_mode`
  reconhecido, todo Field com `id`, ids únicos dentro da Note,
  `pinyinFieldId` sempre apontando pra um Field real da mesma Note, e
  (novo achado, ver abaixo) pelo menos 2 "slots" de conteúdo pros 4 modos
  posicionais. `interpretNoteFromRow()` chama essa validação e **lança um
  Error de verdade** pra Note nativa inválida (não degrada silenciosamente
  -- não existe hoje nenhum dado real que possa disparar isso, já que não
  há editor ainda, então falhar alto é seguro e correto nesta fase).
- **`role` NÃO decide direção** (correção explícita da autora em relação
  à minha proposta original da Fase 6A/6B-primeira-versão, que sugeria
  `role:'front'`/`'back'` como fallback) -- `normal`/`normal_reversed`/
  `type_answer`/`cloze` são **sempre posicionais** (nunca consultam
  `role`); só `multiple_choice` usa `role` (`'prompt'`/`'answer'`/
  `'distractor'`), porque é o único tipo com mais de 2 Fields
  semanticamente distintos -- posição sozinha não bastaria pra
  desambiguar prompt/answer/1-3 distratores.
- **Achado corrigido ANTES de escrever os testes, não depois**: a
  primeira versão do código posicional usava índices fixos `0`/`1` pra
  front/back -- funciona pra uma Note fr simples (2 Fields), mas quebra
  pra uma Note zh nativa de 3 Fields (hanzi+pinyin+tradução, mesmo
  formato que o caminho legado já usa) -- `back` cairia no Field de
  PINYIN (índice 1) em vez da tradução (índice 2). Corrigido com
  `contentFieldIndices(rawFields)` (novo) -- pula qualquer Field que seja
  alvo do `pinyinFieldId` de outro Field ao montar a lista de "slots" de
  conteúdo (mesmo espírito de `audio`/`image`: um Field de pinyin é
  satélite de outro Field, nunca uma posição própria). Pra uma Note fr de
  2 Fields (sem pinyin), `contentFieldIndices` devolve `[0,1]`,
  comportamento idêntico ao design original. Pra uma Note zh de 3 Fields,
  devolve `[0,2]` -- front=hanzi, back=tradução, pulando o pinyin do
  meio, igual ao legado. Testado explicitamente (normal zh 3-fields,
  normal_reversed zh confirmando que o pareamento hanzi/pinyin sobrevive
  à troca de lado -- metade B tem `back`=hanzi com pinyin resolvendo
  certo, não perde a informação).
- **`buildNativeRuntimeFields(rawFields)`** (novo) -- converte
  `row.fields` (persistido, `pinyinFieldId` por ID ESTÁVEL) pro shape
  runtime que `resolveCardField()` já consumia sem NENHUMA mudança
  (`pinyinFieldIndex` por índice) -- traduz id→índice uma vez, na
  leitura. Continua válido mesmo se a ordem dos Fields mudar no editor
  (testado explicitamente: pinyin ANTES do hanzi no array persistido,
  resolve corretamente do mesmo jeito).
- **5 Card Types gerados nativamente** (`interpretNativeNoteFromRow`,
  novo): `normal`, `normal_reversed` (via `buildReversedCardInstancePair`,
  já existente desde a Fase 4a, reaproveitada sem mudança), `cloze` (via
  Field nativo em vez da coluna `cloze_sentence` -- mesmo
  `parseClozeMarks`/`renderClozeText` da Fase 5, sem nenhuma mudança),
  `multiple_choice` (via `role`, com **validação de cardinalidade no
  motor, não só na UI** -- `validateMultipleChoiceFields()`: exatamente 1
  `role:'prompt'`, exatamente 1 `role:'answer'` nunca no mesmo Field, 1 a
  3 `role:'distractor'`), e **`type_answer`** (novo, ver abaixo).
- **`type_answer` completo, incluído nesta fase como a autora exigiu** --
  `cardGenerationMode:'type_answer'` → CardInstance (`promptFieldIndex`/
  `answerFieldIndex`) → `resolveTypeAnswerCardView()` (existente desde a
  Fase 4a, ganhou uma linha nova) → renderer já existente
  (`renderTypeAnswerReviewCard`, fr+zh, construído na Fase 4 mas nunca
  alcançável por dado real até agora). **compareAnswer pro zh reaproveita
  o MESMO pareamento hanzi/pinyin que Normal já usa via
  `pinyinFieldIndex`** -- não um canal de comparação novo: a cadeia de
  prioridade agora é `cardInstance.compareAnswer` explícito (mantido por
  compatibilidade com o teste da Fase 4a que já testava isso) → senão
  `answer.pinyinText` (novo) → senão `displayAnswerText`. Testado fr (sem
  pinyin, cai pro texto) e zh (com `pinyinFieldId`, resolve pro pinyin)
  como a autora pediu explicitamente ("faça testes específicos para os
  dois casos"). `type_answer` é 100% nativo -- nenhum dado legado jamais
  representou "digite a resposta", então não existe (nem precisa existir)
  um caso correspondente no ramo `else` (legado).
- **Imagem virou propriedade do Field** (decisão revisada explicitamente
  pela autora -- minha proposta original da rodada anterior mantinha
  imagem só no nível da Note; ela rejeitou: "o renderer atual poder
  tratar imagem como propriedade global é uma limitação do renderer
  legado, não uma razão pra perpetuar isso no modelo nativo").
  `buildNativeRuntimeFields()` carrega `field.image` através sem
  transformação (só modelagem/persistência, **nenhuma mudança de
  `resolveCardField()`/renderer** -- confirmado deliberadamente: estender
  `resolveCardField()` pra expor `imageUrl` quebraria várias asserções de
  shape exato já existentes em `test_fase4_engine.js`, e não era
  necessário pra "modelar e persistir corretamente" -- só pra uma
  lógica visual que é explicitamente Fase 6C/D). `note.image`
  (Note-level) continua existindo só pro caminho LEGADO, nunca populado
  pelo caminho nativo (`image: null` fixo em `interpretNativeNoteFromRow`).
  Testado que imagem/áudio ficam genuinamente independentes por Field
  (um Field com imagem e sem áudio, outro com áudio e sem imagem, nenhum
  vaza pro outro).
- **Áudio TTS explícito modelado, sem efeito de runtime novo** --
  `field.audio` (`{source:'upload',url,...}` ou `{source:'tts',enabled}`)
  é passado através sem transformação; `resolveCardField()` já lê `.url`
  defensivamente, então `source:'tts'` (sem url, porque é gerado em
  runtime) corretamente nunca produz `audioUrl` automático -- comportamento
  correto sem precisar de nenhuma mudança na função. Testado
  explicitamente.
- **Mecanismo `row.cardGenerationMode` (camelCase) da Fase 5 RETIRADO** --
  achado importante, não presumido: a Fase 5 permitia `normal_reversed`
  sobre colunas legadas SOLTAS (sem `fields`), via um campo camelCase que
  a própria Fase 5 já registrava como provisório ("o nome físico da
  coluna fica pra Fase 6"). A Fase 6B decide o nome real
  (`card_generation_mode`, snake_case) e trava que ele SEMPRE anda
  pareado com `fields` -- o estado que o mecanismo antigo produzia
  (`card_generation_mode` setado, `fields` ausente) virou EXPLICITAMENTE
  INVÁLIDO pela nova regra de pareamento. Manter os 2 mecanismos vivos ao
  mesmo tempo criaria duas fontes de verdade pro mesmo conceito -- por
  isso retirado do motor, não deixado como código morto. Nenhuma linha
  real jamais usou o campo camelCase (a própria Fase 5 já confirmava
  isso), então a retirada não tem impacto em produção. Os 2 cenários de
  teste da Fase 5 que exercitavam esse mecanismo
  (`test_fase5_generation.js`) foram **repropostos**, não só apagados --
  agora testam exatamente o novo estado inválido (`card_generation_mode`
  sem `fields`, e vice-versa) sendo rejeitado, que é um dos cenários que
  a autora pediu explicitamente pra esta fase.

**Testes realizados:**

- **`node --check shared/flashcard-model.js`** sem erro.
- **4 suítes Node, 169/169 passando**: `test_fase4_engine.js` 32/32,
  `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33
  (2 cenários repropostos, ver acima -- confirmando que nenhuma linha
  real jamais usava o mecanismo retirado), `test_fase6b_native_notes.js`
  74/74 (novo -- cobre TODOS os cenários pedidos explicitamente pela
  autora: pareamento fields/card_generation_mode nos dois sentidos
  rejeitado; normal nativo fr sem role e zh com pinyin 3-fields;
  normal_reversed nativo fr e zh -- este último confirmando que o
  pareamento pinyin sobrevive à troca de lado; múltipla escolha com 1, 2
  e 3 distractors válidos; múltipla escolha inválido -- sem prompt, sem
  answer, 0 distractors, 4 distractors, role conflitante -- todos os 5
  rejeitados pelo motor, não só pela UI; Cloze nativo marca única e
  multi-marca, fr e zh com compareAnswer embutido; type_answer fr e zh;
  pinyinFieldId válido, inválido, e sobrevivendo a uma reordenação física
  do array `fields`; imagem e áudio armazenados independentemente por
  Field, inclusive TTS explícito nunca produzindo `audioUrl` automático;
  regressão confirmando que dado legado continua 100% intocado).
- **Smoke test de navegador real** (Playwright, fr+zh, mesmo padrão de
  sempre -- modo convidado, CDN do Supabase stubado,
  `fetchFlashcardsForCurrentStudent` monkey-patchada com 5 linhas
  nativas sintéticas, uma por Card Type) -- prova que
  `mergeTeacherFlashcardsIntoState()`/`buildCardFromTeacherFlashcard()`
  (fr/zh `app.js`, **nenhuma mudança nesta fase**) absorvem o caminho
  nativo de graça, exatamente como o fechamento da Fase 5 previa:
  `STATE.cards` recebeu os 7 cards esperados (normal + 2×reversed + mc +
  2×cloze-multi + type_answer) nos dois idiomas, idempotente numa 2ª
  chamada de merge, `origin:'teacher'` em todos, conteúdo resolvido
  corretamente pra cada tipo (incluindo zh: front=hanzi correto, cloze
  revelando hanzi via compareAnswer=pinyin, type_answer
  displayAnswerText=hanzi/compareAnswerText=pinyin), e
  `hasPlainFrontBack()` (Fase 4b, intocada) continuando a incluir
  normal/mc e excluir cloze/type_answer corretamente também pro caminho
  nativo. Zero erro de console novo nos dois idiomas -- só os mesmos 2-3
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes (proxy de saída deste
  sandbox, documentado em toda a sessão, não relacionado a este código).

**Achado reportado, não corrigido nesta entrega (fora do escopo "só
`shared/flashcard-model.js`" que a autora travou)**: `mergeTeacherFlashcardsIntoState()`/
`mergeSelfFlashcardsIntoState()` (fr/zh `app.js`) chamam
`buildCardFromTeacherFlashcard(row)`/`buildCardFromSelfFlashcard(row)`
dentro de um `.forEach()` SEM `try/catch` -- como `interpretNoteFromRow()`
agora pode **lançar** pra uma Note nativa inválida (decisão desta fase,
ver acima), uma ÚNICA linha nativa malformada quebraria o `forEach`
inteiro, derrubando o carregamento de TODOS os cartões daquela
conta/idioma (nativos E legados) no boot do app -- não só o cartão
problemático. Hoje isso é inofensivo (nenhuma linha real tem `fields`
populado, nenhum editor existe ainda pra escrever uma nativa por engano),
mas vale endereçar antes do editor (Fase 6D) existir de verdade -- fica
como candidato explícito pra Fase 6C (que já vai mexer no caminho de
merge/renderer) ou uma fase própria, não corrigido agora porque exigiria
tocar em `fr/app.js`/`zh/app.js`, fora do escopo que a autora travou
("nesta entrega quero somente a camada de modelo/motor").

**O que ficou de fora nesta entrega, de propósito (restrição explícita da
autora):** editor visual; checkbox/seletor de tipo em qualquer UI; rich
text; TTS de verdade (só modelado, sem gerar áudio); novo comportamento
visual de áudio/imagem; Preview; migration SQL **não executada** (proposta
pronta, revisada e aprovada na rodada anterior, aguardando autorização
explícita pra rodar).

Antes de qualquer migration: pare. A autora pediu explicitamente relatório
+ parada antes de tocar no banco -- nenhuma chamada ao Supabase foi feita
nesta entrega.

Próxima etapa (rodar a migration `fields`/`card_generation_mode` +
CHECK constraints, conforme já revisada e aprovada na rodada anterior) só
acontece depois de autorização explícita da autora pra isso especificamente
-- distinta da autorização de código desta entrega.

**Atualização: migration `045` aprovada e aplicada (2026-09-25).** A
autora aprovou a proposta exatamente como revisada (`fields jsonb NULL` +
`card_generation_mode text NULL` nas duas tabelas, CHECK de pareamento,
CHECK fechado do enum de 5 valores, sem validação estrutural adicional em
SQL, sem backfill) e pediu execução com validação pós-migration em 7
pontos, usando transação/rollback pros testes de rejeição pra não deixar
dado de teste no banco -- e travou explicitamente "NÃO avance para a Fase
6C" depois.

**Migration aplicada AO VIVO** via `mcp__Supabase__apply_migration`,
projeto `eigjocalzwamisgqilhg`, arquivo
`shared/supabase_migrations/045_add_native_note_fields_to_flashcards.sql`
(já commitado antes, byte a byte igual ao que rodou). Snapshot antes:
`teacher_flashcards` 5 linhas (hash agregado `254729e4...`), `own_flashcards`
7 linhas (hash `34a7b80c...`).

**Validação pós-migration, os 7 pontos pedidos:**
1. Schema confirmado via `information_schema.columns` -- `fields`
   (jsonb, nullable) e `card_generation_mode` (text, nullable) presentes
   nas duas tabelas.
2. `NULL`/`NULL` continua válido pra todo registro legado -- 5/5 linhas
   de `teacher_flashcards` e 7/7 de `own_flashcards` com os dois campos
   `NULL`.
3. Note nativa válida persiste com sucesso -- insert de teste (2 Fields,
   `card_generation_mode:'normal'`) dentro de `BEGIN`/`ROLLBACK`: o
   `RETURNING` confirmou o insert passando pelas duas CHECK constraints
   (id 6 gerado), e a consulta pós-`ROLLBACK` confirmou zero linha
   remanescente (`total:5`, `leftover_test_rows:0`).
4. `fields` preenchido + `card_generation_mode NULL` -- rejeitado,
   `23514 check_violation` em `teacher_flashcards_fields_paired`, nada
   commitado.
5. `fields NULL` + `card_generation_mode` preenchido -- rejeitado, mesma
   constraint (`teacher_flashcards_fields_paired`), simétrico ao ponto 4.
6. `card_generation_mode` fora dos 5 valores (`'invalid_mode_xyz'`) --
   rejeitado por uma constraint DIFERENTE
   (`teacher_flashcards_card_generation_mode_check`), confirmando que as
   duas CHECKs disparam de forma independente e correta cada uma pro seu
   caso.
7. Nenhum registro existente foi alterado -- hash agregado + contagem
   pós-migration IDÊNTICOS ao snapshot pré-migration nas duas tabelas
   (`teacher_flashcards`: 5 linhas, hash `254729e4...`; `own_flashcards`:
   7 linhas, hash `34a7b80c...`), e varredura final confirma
   `leftover_test_rows:0` -- nenhum dos 4 inserts de teste (1 válido + 3
   de rejeição) deixou rastro.

**Testes do motor + smoke test, re-executados sem nenhuma mudança de
código**: as 4 suítes Node (`test_fase4_engine.js` 32/32,
`test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
`test_fase6b_native_notes.js` 74/74 -- **169/169**) e o smoke test de
navegador real (`fase6b_native_smoke.js`, Playwright fr+zh) -- resultados
idênticos à rodada anterior (7 cards cada idioma, ids/FSRS/conteúdo
corretos, `hasPlainFrontBack` correto, idempotência confirmada), mesmos
`ERR_TUNNEL_CONNECTION_FAILED` pré-existentes no console (proxy de saída
do sandbox), nenhum erro novo. Esperado -- a migration só torna a coluna
disponível no banco real, o motor/testes já validavam a lógica sobre
linhas construídas em memória desde a entrega anterior.

**Escopo desta entrega**: só a migration aplicada + validação -- nenhuma
alteração de código/UI (`git status` confirma árvore de trabalho limpa
antes e depois desta rodada, além do arquivo da migration já commitado
na rodada anterior).

Parando aqui conforme instrução explícita -- **Fase 6C (renderer +
Preview) NÃO iniciada**, aguardando autorização separada da autora.

## Prompt-mestre "reestruturação Note/CardType/CardInstance" -- Fase 6C
(auditoria do renderer + proposta técnica de `localState`, AINDA NÃO
IMPLEMENTADA)

**Objetivo da fase, travado pela autora**: eliminar a dependência
estrutural do renderer atual em mecanismos legados e preparar um renderer
ÚNICO usado tanto pelo Review real quanto pelo Preview do editor (Fase
6D, ainda não iniciada) -- "Preview e Review devem usar o MESMO
renderer", nunca dois renderers/HTML/lógica de reveal/alternativas/áudio/
Cloze duplicados. Pedido explícito: só auditoria + proposta nesta rodada,
zero código alterado -- confirmado `git status` limpo nas duas entregas
que compõem esta fase (auditoria inicial e este refinamento).

### 1. Auditoria completa do Review atual

**Call graph mapeado:**
```
startReviewSession()                                    [SESSÃO]
  -- monta STATE.reviewQueue, decide reviewDirection SÓ pra cartão legado
  -- (nextCardDirection() só roda quando !c.cardInstance -- confirmado
  --  que cartão nativo NUNCA recebe reviewDirection, restrição da Fase 4
  --  continua 100% respeitada hoje, sem precisar de mudança)
  -> renderReviewView()                                  [DISPATCHER]
     -- estados vazios/fim-de-sessão: pura tela de status, session-owned
     -- dispatch por card.cardInstance.cardTypeId:
        multiple_choice -> renderMultipleChoiceReviewCard(card)
        type_answer     -> renderTypeAnswerReviewCard(card)
        cloze           -> renderClozeReviewCard(card)
        normal (default)-> bloco INLINE dentro do próprio renderReviewView()
                           (achado: "normal" não tem função própria hoje --
                            único tipo sem render dedicado)
     -> cada render*: resolveCardContentView(card) [MODEL, já limpo]
                    -> innerHTML em #review-content (id FIXO, 1 instância só)
                    -> lê/escreve STATE.review* pra saber "já respondeu?"
                    -> wireAudioButtons/wireCustomAudioButtons/speakFrench
                       [puros -- só tomam `container`/`text`/`btnEl` como
                        parâmetro, nunca leem STATE, já 100% reaproveitáveis]
                    -> on-confirm: chama gradeCurrentCard(grade) DIRETO
                                                          [pula pra SESSÃO]
```

`gradeCurrentCard()` é 100% motor de sessão, zero relevância pra Preview:
aplica FSRS (`applyMemoryGrade`), XP, streak, contador de atrasadas,
requeue em erro, avança `STATE.reviewIndex`, `saveState()`, re-renderiza.

**STATE lido/escrito direto dentro das funções de render (a acoplagem
real que bloqueava reuso, achado central desta auditoria)**:
- `STATE.reviewQueue`/`reviewIndex` -- % de progresso, card atual
- `STATE.reviewShowingAnswer` -- flip do tipo "normal"
- `STATE.reviewMCPicked`/`reviewMCCorrect` -- resposta transitória do MC
- `STATE.reviewClozeAnswered` -- **compartilhado entre Cloze E Type
  Answer** (mesmo boolean, reaproveitado só porque "os dois nunca
  coexistem no mesmo cartão" -- acoplamento por convenção, não por dois
  estados locais independentes)
- `card.mcOptions` -- shuffle cacheado *no próprio objeto do card*
  (também global, só que preso de outro jeito -- mutação direta de uma
  entrada de `STATE.cards`)
- `card.reviewDirection` -- confirmado exclusivo de `!card.cardInstance`
  (trilha legada), nunca setado pra cartão nativo.

### 2. CardInstance -> View Model -> Renderer -> DOM

```
CardInstance (card.cardInstance, ausente pra trilha)
    v resolveCardContentView(card)         [shared/flashcard-model.js -- LIMPO]
      view = {kind, front/back | prompt/correct/distractorTexts | rawSentenceText/markId/...}
    v render*ReviewCard() / bloco inline    [fr/zh app.js -- MISTURADO]
      mistura: (a) desenhar DOM a partir da view
               (b) guardar "já respondeu, o quê" em STATE global
               (c) decidir o que acontece ao confirmar = chamada
                   hardcoded a gradeCurrentCard()
    v innerHTML de #review-content (id fixo)
```

`resolveCardContentView`/os 4 resolvers já estão limpos (nunca tocam DOM,
nunca leem STATE) -- alvo real da Fase 6C é só a camada (b)+(c) acima.

**Achado paralelo, fora do escopo**: `openPublicFlashcardPreview()`
(`shared/public-profile.js`, Fase 2 do prompt-mestre "perfil público") já
é um "preview" -- mas de contexto totalmente diferente (cartão importável
de outra conta, campos legados soltos vindos de `get_public_flashcards()`,
nunca Note/CardInstance). Não usa e não deve usar o renderer unificado --
registrado só pra não confundir com o alvo real desta fase.

### 3. Contrato do renderer, aprovado

```
renderer(mountEl, card, localState, callbacks)
```
- `mountEl` -- substitui o id fixo `#review-content`, permite Review e
  Preview existirem na tela ao mesmo tempo.
- `card` -- mesmo shape de sempre.
- `localState` -- ver seção 4 abaixo (refinamento desta rodada).
- `callbacks` -- `{onAnswered(wasCorrect, grade)}`. Review's callback
  chama `gradeCurrentCard(grade)`; Preview's callback só re-renderiza
  mostrando o resultado, nunca grava nada. **O renderer nunca sabe em que
  contexto está** -- zero `if (isPreview)` dentro dele.

4 funções candidatas (sem sufixo "Review" no nome, já que passam a
servir os dois contextos): `renderNormalCard`/`renderMultipleChoiceCard`/
`renderClozeCard`/`renderTypeAnswerCard`. "Normal com reverso" continua
reaproveitando `renderNormalCard`, como já reaproveita
`resolveNormalCardView` hoje.

**O que muda**: assinatura das 4 funções (+mountEl/localState/callbacks);
`STATE.reviewMCPicked`/`reviewMCCorrect`/`reviewClozeAnswered` deixam de
ser campos globais lidos direto pelo renderer; `#review-content` vira
parâmetro; `gradeCurrentCard()` deixa de ser chamado hardcoded de dentro
do renderer.

**O que NÃO muda**: `resolveCardContentView`/resolvers; separação fr/zh
em arquivos próprios (Fase 6C não tenta unificar fr/zh, é outro projeto);
`reviewDirection`/`isReverse`/`nextCardDirection` (mecanismo intocado,
exclusivo de trilha); `gradeCurrentCard`/FSRS/XP/streak/`saveState`
(motor de sessão, fora do renderer); `getStudyQueue`/`eligibleReviewPool`/
`startReviewSession` (fila continua responsabilidade da sessão).

### 4. Refinamento do `localState` (esta rodada) -- ownership e ciclo de vida

A autora rejeitou explicitamente a versão implícita da proposta original
("substituir os 3 campos STATE.review* por 1 objeto global maior") --
"isso apenas mudaria o nome do acoplamento". A resposta correta não é
sobre QUANTOS campos existem, é sobre **granularidade, ownership e
ciclo de vida explícitos**, e sobre o `localState` nunca ser lido/escrito
pelo renderer via `STATE.*` direto -- só recebido como parâmetro.

**1. Quem é o dono do `localState` no Review?** A camada de SESSÃO
(as mesmas funções que já são donas de `STATE.reviewQueue`/`reviewIndex`
-- `renderReviewView()`/`gradeCurrentCard()`/`reviewMoreCurrentCard()`),
nunca o renderer. O renderer só recebe a referência como parâmetro e muta
campos NELA -- nunca sabe (nem precisa saber) que existe um `STATE` por
trás.

**2. Quem cria o `localState`?** `renderReviewView()`, e só ela --
único ponto de criação, mesmo espírito de `resolveCardContentView()` ser
o único ponto de leitura de conteúdo.

**3. Em que momento é criado?** No instante em que `STATE.reviewQueue[STATE.reviewIndex]`
aponta pra um card DIFERENTE do que o `localState` armazenado
representa (rastreado por uma pequena identidade -- ex:
`STATE.reviewCardState.forQueuePosition !== STATE.reviewIndex`) --
ANTES da primeira renderização daquele card. Re-renderizações do MESMO
card (ex: depois de marcar uma opção de MC) NUNCA recriam -- reaproveitam/
mutam o objeto já existente.

**4. Em que momento é descartado?** No instante em que `STATE.reviewIndex`
avança -- dentro de `gradeCurrentCard()` e de `reviewMoreCurrentCard()`,
que já são os 2 únicos pontos que mexem em `reviewIndex` hoje. Cada um
seta `STATE.reviewCardState = null` explicitamente antes de chamar
`renderReviewView()` de novo -- não é "deixar a próxima renderização
sobrescrever silenciosamente", é um descarte ativo e visível no código,
no mesmo lugar que já reseta `STATE.reviewShowingAnswer = false` hoje.

**5. Por CardInstance, por renderização, ou por sessão?** **Nenhum dos
3** -- é **por EXIBIÇÃO** (um "turno": o intervalo entre um card virar
`STATE.reviewQueue[STATE.reviewIndex]` e deixar de ser). Não pode ser
por CardInstance (identidade) porque o MESMO CardInstance pode aparecer
2x na mesma sessão (requeue de "Errei", `remaining>=3` em
`gradeCurrentCard`; ou "Rever mais",
`reviewMoreCurrentCard`) -- a 2ª aparição precisa nascer "não respondida"
de novo, então amarrar por identidade de CardInstance faria a 2ª
aparição herdar erroneamente o estado da 1ª. Não pode ser por
renderização (recriar a cada chamada da função de render) porque MC/
Cloze/TypeAnswer precisam SOBREVIVER a várias re-renderizações
intermediárias da mesma pergunta (marcar opção -> re-render pra mostrar
cor -> clicar Continuar). Não pode ser por sessão (1 objeto vivendo a
sessão inteira) porque é exatamente esse o erro já cometido por
`STATE.reviewClozeAnswered` (campo único reaproveitado entre 2 tipos
diferentes por convenção, nunca por desenho).

**6. Como o renderer é re-renderizado após cada interação?**
- **Multiple Choice**: clicar opção -> muta `localState.selectedIndex`/
  `answered`/`wasCorrect` -> o PRÓPRIO renderer se chama de novo
  (`rendererFn(mountEl, card, localState, callbacks)`, auto-recursão,
  **sem envolver a sessão** -- exatamente como `renderMultipleChoiceReviewCard(card)`
  já se autochama hoje) -> só ao clicar "Continuar" (interação FINAL) o
  renderer chama `callbacks.onAnswered(wasCorrect, 2|0)`.
- **Type Answer**: digitar não re-renderiza (input nativo captura o
  valor sozinho); clicar "Verificar" muta `localState` e o renderer se
  autochama pra mostrar revelado/colorido; clicar "Continuar" chama
  `callbacks.onAnswered`.
- **Cloze**: mesmo padrão exato de Type Answer.
- **Normal (reveal)**: clicar no flashcard -> muta `localState.revealed=true`
  -> renderer se autochama pra mostrar o verso + botões de grau; clicar
  um botão de grau chama `callbacks.onAnswered(null, grade)` direto --
  pra Normal não existe um veredito certo/errado calculado pelo
  renderer, a aluna autorrelata via o botão de grau clicado (mesmo
  comportamento de hoje, só formalizado no contrato).

  Ou seja: **re-renderização intermediária (dentro da mesma pergunta) é
  responsabilidade do renderer, via auto-chamada com os mesmos 4
  parâmetros** -- nunca pede pra sessão re-renderizar por ele. Só a
  transição FINAL (que dispara grade/avanço de fila/descarte de
  localState) sobe pra sessão via `callbacks.onAnswered`.

**7. Como o Review mantém esse estado sem colocá-lo no CardInstance?**
Um único slot ownado pela sessão -- `STATE.reviewCardState` -- criado/
lido/escrito só pelas 3 funções de sessão (seção 2-4 acima), NUNCA pelo
renderer via `STATE.*` direto. O renderer recebe a referência como
`localState` e muta campos nela; como é a MESMA referência que a sessão
guarda em `STATE.reviewCardState`, a mutação "persiste" sem o renderer
saber que `STATE` existe.

**8. Como o Preview terá seu próprio estado, independente do Review?**
Uma variável local PRÓPRIA do módulo/componente de Preview (Fase 6D,
`shared/admin-flashcards.js` -- ex: `let previewCardState = null;` no
escopo do editor, nunca um campo em `STATE`). Criada quando o Preview
monta um card sintético; **descartada e recriada sempre que o formulário
muda materialmente** (trocar Card Type, editar frase/opções) -- mesmo
princípio de "descarta e recria" do Review, só que o gatilho é edição do
formulário em vez de avanço de fila. Nenhuma leitura/escrita cruzada com
`STATE.reviewQueue`/`reviewIndex`/`reviewCardState` -- armazenamento
completamente disjunto do Review, ainda que a FORMA de cada tipo (seção
12) seja idêntica -- é o mesmo contrato de dados, nunca a mesma
instância.

**9. O que pertence ao `localState` (efêmero de interação) vs. outro
lugar?** Confirmado: SÓ estado efêmero de interação/exibição --
`revealed`/`typedAnswer`/`selectedIndex`/`answered`/`wasCorrect`/
opções embaralhadas. NUNCA dado durável (texto de front/back/opções em
si -- isso vem de `view` via `resolveCardContentView()`, recalculado do
zero a cada render, nunca copiado pro `localState`) e NUNCA
contabilidade de sessão (posição na fila, resultado FSRS já aplicado,
XP) -- isso continua ownado pela camada de sessão, fora do `localState`.

**10. `card.mcOptions` -- deve sair do card object?** **Sim,
explicitamente.** Hoje é mutação direta de uma entrada real de
`STATE.cards` (objeto durável, com id, potencialmente serializado se
alguém esquecer de limpar) -- mesma categoria de problema dos outros
campos `STATE.review*`, só escondida num objeto diferente. Vira
`localState.shuffledOptions`, com o MESMO ciclo de vida do resto do
`localState` (criado quando o card vira atual, descartado quando deixa
de ser) -- garante que (a) nunca vaza pro shape que `serializeState()`
salva de verdade, e (b) o Preview ganha seu próprio shuffle independente
sem nunca tocar um card real de `STATE.cards`.

**11. `reviewClozeAnswered` compartilhado entre Cloze e Type Answer --
estados independentes propostos.** Cada tipo ganha seu PRÓPRIO conjunto
de campos, no PRÓPRIO objeto de `localState` (nunca a mesma referência/
mesmo campo de `STATE` lido pelos 2 renderers) -- mesmo que a FORMA saia
igual (`answered`/`wasCorrect`/`typedAnswer`), o discriminador de tipo é
estrutural (o `kind` do próprio `localState`, batendo com
`card.cardInstance.cardTypeId`), nunca uma convenção implícita de "os
dois nunca coexistem no mesmo cartão". Um dia que um dos dois ganhar um
campo novo (ex: Cloze querer guardar "quantas tentativas"), o outro tipo
não corre risco nenhum de herdar isso por acidente.

**12. Exemplo concreto de `localState` por tipo:**

Normal:
```js
{
  kind: 'normal',
  revealed: false,       // flip -- verso já foi mostrado?
}
```

Multiple Choice:
```js
{
  kind: 'multiple_choice',
  shuffledOptions: null,   // [{text, correct}], gerado 1x na 1ª renderização
  selectedIndex: null,     // null = ainda não respondeu
  answered: false,
  wasCorrect: null,
}
```

Type Answer:
```js
{
  kind: 'type_answer',
  typedAnswer: '',
  answered: false,
  wasCorrect: null,
}
```

Cloze:
```js
{
  kind: 'cloze',
  typedAnswer: '',
  answered: false,
  wasCorrect: null,
}
```

**13. Diagrama conceitual:**

Review:
```
startReviewSession()
  -> monta STATE.reviewQueue/reviewIndex (sessão)
renderReviewView()
  -> card = STATE.reviewQueue[STATE.reviewIndex]
  -> se STATE.reviewCardState ausente OU não é deste card/posição:
       STATE.reviewCardState = createLocalStateFor(cardTypeId)  [fresh, tipado]
  -> view = resolveCardContentView(card)
  -> callbacks = { onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade) }
  -> renderer(mountEl, card, STATE.reviewCardState, callbacks)
       -- interação intermediária (ex: clicar opção MC): renderer muta
          STATE.reviewCardState e CHAMA A SI MESMO de novo (auto-render,
          sem envolver a sessão)
       -- interação final (Continuar/botão de grau): renderer chama
          callbacks.onAnswered(...)
gradeCurrentCard(grade)
  -> aplica FSRS/XP/streak/save (SESSÃO)
  -> STATE.reviewIndex += 1
  -> STATE.reviewCardState = null  (descarta -- próximo card começa do zero)
  -> renderReviewView()  (recria localState pro próximo card, ciclo reinicia)
```

Preview:
```
Editor (shared/admin-flashcards.js, Fase 6D, ainda não construída)
  -> monta card sintético via interpretNoteFromRow()/buildEngineCardsFromRow()
     sobre os dados atuais do formulário (nunca um objeto paralelo que só
     imita o shape real -- é a MESMA função de produção)
  -> previewCardState = createLocalStateFor(cardTypeId)  (variável local
     do módulo de preview, NUNCA STATE.review*, NUNCA STATE.cards)
  -> callbacks = { onAnswered: (wasCorrect) => { /* só re-renderiza
       mostrando o resultado -- SEM FSRS, SEM XP, SEM saveState */ } }
  -> renderer(previewMountEl, syntheticCard, previewCardState, callbacks)
       -- mesma função, mesmo contrato, comportamento idêntico -- o
          renderer não sabe (nem precisa saber) que está em Preview
  -> quando o formulário muda (trocar Card Type, editar frase/opções):
       previewCardState = createLocalStateFor(novoTipo)  (descarta e recria)
```

**Decisão em aberto, não travada nesta rodada**: onde mora fisicamente
`createLocalStateFor(cardTypeId)` -- candidata natural é
`shared/flashcard-model.js` (já é dono de `CARD_TYPE_IDS`, e a função é
pura -- só mapeia tipo -> shape inicial, sem DOM/STATE) versus morar
junto dos renderers em fr/zh `app.js` (que já são arquivos espelhados,
um por idioma). Decisão de implementação, não arquitetural -- fica pra
quando a Fase 6C for de fato autorizada a virar código.

**Nesta entrega (refinamento)**: zero código alterado, zero arquivo
tocado além deste `CLAUDE.md` -- `git status` confirma árvore limpa.

Aguardando autorização explícita da autora pra Fase 6C virar código
(extrair as 4 funções de renderer com o contrato acima + o ciclo de vida
de `localState` detalhado nesta seção).

## Fase 6C.1 -- extração do renderer de Normal (primeira das 4 funções,
escopo estrito)

Primeira subfase de código da Fase 6C, restrita EXPLICITAMENTE a extrair
só o renderer de "Normal" (inclusive as 2 metades de "Normal com
reverso") pro contrato aprovado -- MC/Cloze/TypeAnswer, editor, Preview,
FSRS, banco, Card Type e pipeline de geração ficaram fora de propósito,
sem nenhuma alteração.

**Arquivos alterados**: só `fr/app.js` + `zh/app.js` (`git diff --stat`:
137/138 linhas, +213/-62 no total). Nenhum outro arquivo tocado --
confirmado que `shared/admin-flashcards.js`/`shared/my-flashcards.js`/
`shared/public-profile.js`/`shared/flashcard-model.js` continuam
intactos.

**O que foi feito, nos dois idiomas (mudanças espelhadas):**

1. **`renderNormalCard(mountEl, card, localState, callbacks)`** (novo) --
   extraído do bloco que antes vivia inline dentro de `renderReviewView()`.
   Corpo idêntico ao original (mesma lógica de direção/HTML/áudio), só
   trocando `document.getElementById('review-content')`→`mountEl`,
   `STATE.reviewShowingAnswer`→`localState.revealed`, e as 2 chamadas
   diretas (`gradeCurrentCard(grade)`/`reviewMoreCurrentCard()`) por
   `callbacks.onAnswered(null, grade)`/`callbacks.onReviewMore()`.
2. **`STATE.reviewCardState`** (novo campo, substitui
   `STATE.reviewShowingAnswer` -- removido, confirmado por grep antes de
   apagar que era usado EXCLUSIVAMENTE dentro do bloco de Normal, nunca
   por MC/Cloze/TypeAnswer nem por `hanziReviewShowingAnswer` -- feature
   de revisão de hanzi do zh, totalmente separada, não tocada). Ciclo de
   vida exatamente como definido na seção anterior deste CLAUDE.md:
   criado preguiçosamente em `renderReviewView()` (só quando `null`,
   nunca recriado numa re-renderização do MESMO cartão), descartado
   (`= null`) nos 3 únicos pontos que avançam `STATE.reviewIndex` --
   `gradeCurrentCard()`, `reviewMoreCurrentCard()`, e os 2 pontos de
   início de sessão (`startReviewSession()`/`openReviewSession('hard')`).
3. **`callbacks.onReviewMore()`** -- extensão além do `onAnswered` único
   esboçado na auditoria da Fase 6C, necessária porque "Rever mais" é uma
   3ª transição que não grada nada (nunca é "resposta", só pedido de mais
   exposição) -- disclosed explicitamente no código e aqui, não decidida
   em silêncio.
4. **Direção**: nem `isReverse` nem `reviewDirection` nem
   `nextCardDirection()` foram reintroduzidos como mecanismo NATIVO --
   pra cartão com `card.cardInstance`, `isReverse` continua sempre
   `false` (a `resolveNormalCardView()` já devolve front/back na ordem
   certa); pra cartão legado (`!card.cardInstance`), `card.reviewDirection`
   (setado 1x em `startReviewSession()`) continua 100% intocado --
   mesmíssimo código, só movido pra dentro da função extraída.
5. **Progresso** (`STATE.reviewIndex`/`reviewQueue.length`): continua
   lido direto de `STATE` dentro de `renderNormalCard()` -- decisão
   deliberada, disclosed no código: é contabilidade de SESSÃO, não
   "estado efêmero de interação" (a restrição da Fase 6C é
   especificamente sobre não ler `STATE` pra saber "revelado?"/
   "respondido?"). Uniformizar isso fica pra quando os 4 renderers forem
   extraídos juntos, não resolvido isoladamente só pro Normal pra não
   introduzir um mecanismo (parâmetro de contexto de sessão) que os
   outros 3 ainda não teriam.

**Busca final por lógica paralela de Preview (pedida explicitamente)**:
`grep -n "function.*[Nn]ormal.*("` confirma **um único** `renderNormalCard`
por idioma (mais `resolveNormalCardView` no motor, já existente desde a
Fase 4a, intocado). `grep -rn "Preview"` em `fr/app.js`/`zh/app.js`
mostra só (a) os 3 comentários novos desta entrega citando o Preview
futuro (Fase 6D, sem código), e (b) `challengePreviewMode`/
`openChallengePreview` -- feature pré-existente e totalmente sem relação
(banner de preview de Desafios), não tocada. Nenhuma segunda
implementação de renderer criada.

**Testes realizados:**
- `node --check fr/app.js`/`zh/app.js` sem erro.
- 4 suítes Node re-executadas, **169/169 sem regressão** (esperado --
  exercitam só `shared/flashcard-model.js`, não tocado nesta subfase):
  `test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js` 74/74.
- **Suíte nova `test_fase6c1_normal_renderer.js`** (Playwright, fr+zh),
  cobrindo item a item o que a autora pediu:
  1. `reviewShowingAnswerRemoved:true` -- confirmado via
     `!Object.prototype.hasOwnProperty.call(STATE, 'reviewShowingAnswer')`
     (campo global removido de fato, não só sem uso).
  2. **Normal nativo**: `localStateCreated` (`{kind:'normal',
     revealed:false}` na primeira renderização), front visível, revelar
     -> `localState.revealed===true` E `card.due`/`card.reps`
     **inalterados** (confirma que revelar sozinho nunca aciona FSRS/XP
     por conta própria do renderer -- só o clique num botão de grau, via
     `callbacks.onAnswered`, chama `gradeCurrentCard` de verdade: `due`/
     `reps` mudam só DEPOIS desse clique), `STATE.reviewIndex` avança,
     `STATE.reviewCardState` descartado.
  3. **Normal reverso**: `resolveCardContentView()` das 2 metades
     confirma front/back trocados entre si; ids distintos; cada metade
     renderizada via `renderNormalCard()` (não uma função separada);
     graduar a 1ª metade NÃO muta `reps`/`due` da 2ª (FSRS genuinamente
     independente, mesma garantia já validada desde a Fase 4a, agora
     também através do renderer extraído).
  4. **Cartão legado** (`!card.cardInstance`, `reviewDirection:
     'back-to-front'`): confirmado caindo no mesmo `renderNormalCard()`
     (não um caminho separado), tradução aparece primeiro (direção
     legada respeitada), grau clicado grada de verdade (`reps`/`due`
     mudam).
  5. **Regressão MC** (não tocado nesta subfase): `.mc-option` continua
     renderizando, `STATE.reviewMCPicked` continua `null` no boot
     (campo próprio intocado, nunca leu/gravou `STATE.reviewCardState`).
  - Console: só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes
    (proxy de saída do sandbox), zero erro novo, nos dois idiomas.

**Problemas encontrados**: nenhum -- implementação direta a partir do
contrato já aprovado, sem surpresas durante a extração (o bloco original
já era isolável quase 1:1, confirmando que a auditoria da Fase 6C tinha
mapeado a fronteira certa).

**O que ainda falta / não foi feito nesta subfase (de propósito)**:
MC/Cloze/TypeAnswer continuam com `STATE.reviewMCPicked`/`reviewMCCorrect`/
`reviewClozeAnswered` sem tocar -- extração deles é subfase futura
(6C.2/6C.3/6C.4, não nomeadas/autorizadas ainda). Nenhum editor/Preview
construído -- `renderNormalCard()` está pronto pra ser chamado pelo
Preview quando a Fase 6D existir, mas nada chama ainda. `mountEl` ainda é
sempre `#review-content` fixo na chamada de dentro de `renderReviewView()`
-- o PARÂMETRO já existe e o renderer não hardcoda mais o id
internamente, mas o Review continua passando o mesmo elemento de sempre
(esperado, só o Preview vai passar um `mountEl` diferente).

Escopo estrito respeitado -- nenhuma 6C.2/6C.3 iniciada. Parando aqui,
aguardando revisão da autora antes de continuar.

## Fase 6C.2 -- extração dos renderers de Multiple Choice e Type Answer

Segunda subfase de código da Fase 6C, autorizada explicitamente pela
autora depois de revisar a 6C.1 ("A Fase 6C.1 foi revisada e aprovada. [...]
Agora implemente SOMENTE a Fase 6C.2"). Mesmo contrato aprovado na
auditoria da Fase 6C -- `renderer(mountEl, card, localState, callbacks)`
-- estendido agora pra Múltipla escolha e Digite a resposta, com uma
lista de 7 proibições explícitas dadas pela autora antes de codar (nunca
acessar `STATE` direto pra estado efêmero, nunca chamar
`gradeCurrentCard()`/`reviewMoreCurrentCard()` direto, nunca executar
FSRS/XP/save, nunca decidir direção de CardInstance) -- todas cumpridas,
ver detalhamento abaixo.

**Arquivos alterados**: só `fr/app.js` (+152/-63, confirmado por
`git diff --stat`) e `zh/app.js` (+149/-60). Nenhum outro arquivo tocado
-- `shared/flashcard-model.js`/`shared/admin-flashcards.js`/
`shared/my-flashcards.js`/`shared/public-profile.js` continuam intactos,
confirmado por `git status --short` mostrando só os 2 arquivos.

**O que foi feito, nos dois idiomas (mudanças espelhadas):**

1. **`renderMultipleChoiceCard(mountEl, card, localState, callbacks)`**
   (novo, substitui `renderMultipleChoiceReviewCard(card)`) -- mesmo
   corpo visual de sempre (opções embaralhadas, feedback certo/errado,
   botão "Continuar"), agora lendo/escrevendo tudo em `localState` em vez
   de `STATE.reviewMCPicked`/`STATE.reviewMCCorrect`/`card.mcOptions`
   (os 3 eliminados por completo -- confirmado via grep, sem sobrar
   nenhuma referência fora de comentário). `localState.shuffledOptions`
   é gerado 1x na 1ª renderização desta EXIBIÇÃO (nunca mais mutação
   direta de uma entrada real de `STATE.cards`) -- interação intermediária
   (marcar uma opção) muta `localState.selectedIndex`/`answered`/
   `wasCorrect` e o renderer se autochama com os mesmos 4 parâmetros, sem
   envolver a sessão; só o clique em "Continuar" chama
   `callbacks.onAnswered(wasCorrect, grade)`.
2. **`renderTypeAnswerCard(mountEl, card, localState, callbacks)`** (novo,
   substitui `renderTypeAnswerReviewCard(card)`) -- mesma lógica de
   comparação/revelação/confirmar de sempre (`acceptedForms`,
   `compareAnswerText`, teclinha de acento/tom), agora usando
   `localState.typedAnswer`/`answered`/`wasCorrect` em vez de
   `STATE.reviewClozeAnswered` -- a MESMA variável global que o Cloze usa,
   compartilhada só por convenção ("os dois nunca coexistem no mesmo
   cartão", nunca por desenho estrutural, ver auditoria da Fase 6C). Cloze
   (`renderClozeReviewCard`, fora do escopo desta subfase) continua
   intocado, usando `STATE.reviewClozeAnswered` exatamente como antes --
   confirmado por teste dedicado que o TypeAnswer NUNCA mais toca esse
   campo (ver Testes abaixo).
3. **`renderReviewView()`** -- dispatch de `multiple_choice`/`type_answer`
   passou a criar `STATE.reviewCardState` preguiçosamente (só quando
   ausente, tipado por `kind`) e passar `callbacks.onAnswered` que chama
   `gradeCurrentCard(grade)` -- exatamente o mesmo padrão já usado pro
   dispatch de `normal` desde a 6C.1. Cloze permanece com seu dispatch
   antigo (`renderClozeReviewCard(card)`, sem `localState`/`callbacks`).
4. **`startReviewSession()`** -- removidas as 2 linhas que inicializavam
   `STATE.reviewMCPicked`/`STATE.reviewMCCorrect` (não existem mais em
   lugar nenhum do código); `STATE.reviewClozeAnswered = null` continua
   (ainda usado pelo Cloze). Comentário da declaração de `STATE.reviewCardState`
   (no objeto default do estado) atualizado pra documentar os 3 shapes
   possíveis hoje.

**Ajuste ao shape documentado na auditoria, avisado antes de codar (pedido
explícito da autora, "se perceber que o shape precisa de um pequeno
ajuste, documente")**: nenhum ajuste foi necessário -- os 2 shapes
implementados batem exatamente com o que a auditoria da Fase 6C já tinha
travado:
```js
// Multiple Choice
{ kind: 'multiple_choice', shuffledOptions: null, selectedIndex: null, answered: false, wasCorrect: null }
// Type Answer
{ kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null }
```

**Decisões arquiteturais desta subfase:**
1. Mesmo padrão de auto-recursão da 6C.1 (Normal) -- interação
   intermediária nunca sobe pra sessão, o renderer se rechama sozinho com
   os mesmos 4 parâmetros. Confirma que o padrão estabelecido na 6C.1
   generaliza sem ajuste pros outros 2 tipos, não precisou de nenhum
   mecanismo novo.
2. `localState.typedAnswer` guarda o texto bruto digitado (não usado por
   nenhum consumidor hoje, mas parte do shape já travado na auditoria) --
   mantido por fidelidade ao contrato aprovado, não removido por não ter
   uso imediato.
3. `mountEl.querySelector(...)` substituiu `document.getElementById(...)`
   em toda função extraída (mesmo padrão já usado por `renderNormalCard`
   na 6C.1) -- necessário pro contrato valer de verdade quando o Preview
   (Fase 6D) passar um `mountEl` diferente de `#review-content`.

**Testes realizados** (os 15 itens pedidos, numerados):
1. **4 suítes Node completas** -- `test_fase4_engine.js` 32/32,
   `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
   `test_fase6b_native_notes.js` 74/74 (**169/169**, sem regressão --
   esperado, nenhuma exercita `fr/app.js`/`zh/app.js`).
2. **Smoke test de navegador real, FR+ZH** -- novo
   `test_fase6c2_mc_typeanswer_renderer.js` (Playwright), mesmo padrão de
   stub/boot da 6C.1.
3. **Múltipla escolha nativa** -- `STATE.reviewCardState` criado com
   `kind:'multiple_choice'` na 1ª renderização, confirmado nos 2 idiomas.
4. **1, 2 e 3 distratores** -- 3 cartões nativos com `role:'distractor'`
   variando de 1 a 3, contagem de `.mc-option` confirmada em 2/3/4
   (1 certa + N erradas) nos 2 idiomas.
5. **Seleção -> feedback -> grade** -- clicar uma opção marca
   `localState.answered`/`selectedIndex`/`wasCorrect`, aplica classe
   `.correct`/`.incorrect` no botão certo (reconsultado do DOM vivo pós
   auto-render, já que o clique original troca o `innerHTML`), revela o
   botão "Continuar"; clicar "Continuar" confirma `reps`/`due` mudando de
   verdade (FSRS aplicado via `gradeCurrentCard`).
6. **`shuffledOptions` fora de `card`/`STATE.cards`** -- confirmado
   `!('mcOptions' in card)` e `!('shuffledOptions' in card)` no
   CardInstance real após toda a interação, só `STATE.reviewCardState.
   shuffledOptions` existe.
7. **Type Answer em francês** -- prompt="Où habites-tu ?", resposta
   digitada comparada contra `compareAnswerText`, fluxo completo
   validado.
8. **Type Answer em chinês, `pinyinFieldId`** -- `compareAnswerText`
   resolve pro pinyin (`"nǐ zhù zài nǎlǐ?"`), `displayAnswerText`
   permanece hanzi (`"你住在哪里？"`) -- exatamente a distinção que o
   motor (`resolveTypeAnswerCardView`, Fase 4a/6B, intocado) já garantia;
   este teste confirma que o renderer extraído continua respeitando essa
   distinção.
9. **Resposta certa** -- MC (clicar a opção certa) e Type Answer (digitar
   o `compareAnswerText` exato) -- `wasCorrect:true`, classe `.correct`
   aplicada, `gradeCurrentCard(2)` disparado só após "Continuar".
10. **Resposta errada** -- MC (clicar opção errada) e Type Answer (digitar
    texto incorreto) -- `wasCorrect:false`, classe `.incorrect` aplicada,
    `lapses` incrementado após "Continuar".
11. **Revelação** -- Type Answer errado confirma que o texto certo
    (`displayAnswerText`) aparece na tela assim que `answered:true`, antes
    mesmo de "Continuar" ser clicado.
12. **Interação antes do grade não altera FSRS/XP** -- confirmado
    explicitamente nos 2 formatos: `due`/`reps` do CardInstance
    idênticos ANTES e DEPOIS de selecionar uma opção MC ou verificar uma
    resposta digitada (só mudam depois do clique em "Continuar").
13. **`gradeCurrentCard()` só alcançado via callback/sessão** --
    confirmado indiretamente pelo item 12 (nada muda até "Continuar") e
    diretamente pelo `STATE.reviewIndex` só avançando após esse clique,
    nunca na seleção/verificação em si.
14. **Nenhum renderer paralelo de Preview** -- confirmado
    `typeof renderMultipleChoiceReviewCard === 'undefined'` e
    `typeof renderTypeAnswerReviewCard === 'undefined'` (funções antigas
    removidas de verdade, não só substituídas por atalho) e que só existe
    UMA função `renderMultipleChoiceCard`/`renderTypeAnswerCard` por
    idioma (grep confirma, mesma disciplina da 6C.1).
15. **Normal sem regressão** -- fluxo completo (revelar + graduar) rodado
    de novo neste mesmo teste, `due`/`reps` mudando corretamente via
    `renderNormalCard` (6C.1, intocado nesta subfase).

Teste adicional, além dos 15 pedidos: confirmado que TypeAnswer NUNCA
mais toca `STATE.reviewClozeAnswered` (setado a `null` simulando o que
`startReviewSession()` faz, permanece `null` depois de 2 fluxos completos
de TypeAnswer, certo e errado) -- prova concreta de que a dependência
compartilhada por convenção com o Cloze (existente desde a Fase 4) foi
eliminada de vez deste lado.

Console: só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes
(proxy de saída deste sandbox bloqueando o CDN do Supabase, já
documentado em toda a sessão), zero erro novo atribuível a este código,
nos dois idiomas.

**O que ainda falta / não foi feito nesta subfase (de propósito, restrição
explícita da autora):** Cloze não foi tocado -- extração dele fica pra uma
Fase 6C.3 futura, ainda não autorizada. Nenhum editor/Preview construído
-- `renderMultipleChoiceCard`/`renderTypeAnswerCard` estão prontos pra
serem chamados pelo Preview quando a Fase 6D existir, mas nada os chama
ainda fora do Review. Áudio/imagem, banco/migration, Card Types e
geração de cartão não foram tocados.

Escopo estrito respeitado -- nenhuma 6C.3/Preview/editor iniciados.
Parando aqui, aguardando revisão da autora antes de continuar.

## Fase 6C.3 -- extração do renderer de Cloze

Terceira e última subfase de código da Fase 6C, autorizada explicitamente
pela autora depois de revisar a 6C.2 ("A Fase 6C.2 foi revisada e
aprovada. [...] Agora implemente SOMENTE a Fase 6C.3"). Mesmo contrato
`renderer(mountEl, card, localState, callbacks)` aprovado na auditoria da
Fase 6C, agora estendido pro último dos 4 Card Types em uso hoje --
Cloze -- com a mesma lista de proibições já cumpridas em 6C.1/6C.2 (nunca
acessar `STATE` pra estado efêmero, nunca chamar `gradeCurrentCard()`/
`reviewMoreCurrentCard()` direto, nunca executar FSRS/XP/save, nunca
decidir direção de CardInstance) e mais uma restrição nova, específica
desta subfase: não criar um boolean genérico compartilhado com Type
Answer -- cada Cloze precisa de estado identificado pelo `markId`.

**Leitura obrigatória feita antes de codar** (pedido explícito da
autora): reli o renderer atual de Cloze em `fr/app.js`/`zh/app.js`,
`resolveClozeCardView`/`parseClozeMarks`/`renderClozeText`/
`splitClozeMarkRaw` em `shared/flashcard-model.js`, a geração de
múltiplas CardInstances por Note na Fase 5 (`interpretNativeNoteFromRow`,
ramo `mode === 'cloze'`, e o caminho legado equivalente em
`interpretNoteFromRow`), e os relatórios da Fase 6C (auditoria) e das
6C.1/6C.2 no CLAUDE.md. Confirmado, não presumido: `resolveClozeCardView`
já devolve a view escopada a UMA marca (`cardInstance.markId`) -- mesmo
quando a Note tem 2+ marcas, cada CardInstance/posição de fila carrega
só a sua própria marca; o renderer nunca precisa (nem pode) "descobrir"
outras marcas da mesma Note.

**Arquivos alterados**: só `fr/app.js` (+82/-61, `git diff --numstat`) e
`zh/app.js` (+84/-66). Nenhum outro arquivo tocado --
`shared/flashcard-model.js` (parser/sintaxe Cloze, resolvers) continua
100% intocado, nenhum bug concreto foi encontrado que justificasse
alterá-lo nesta subfase.

**O que foi feito, nos dois idiomas (mudanças espelhadas, com as
particularidades reais de cada idioma preservadas -- zh mantém
`.cloze-hanzi`/`.cloze-pinyin`, `pinyinTonePickerHTML`,
`normalizePinyinAnswer`; fr mantém `frAccentPickerHTML`,
`normalizeLoose`; nenhuma tentativa de unificação):**

1. **`renderClozeCard(mountEl, card, localState, callbacks)`** (novo,
   substitui `renderClozeReviewCard(card)`) -- mesmo corpo visual de
   sempre (frase com lacuna via `renderClozeText`, feedback certo/errado
   no próprio espaço da lacuna, tradução revelada, áudio próprio quando
   existe, botão "Continuar"), agora lendo/escrevendo tudo em
   `localState` em vez de `STATE.reviewClozeAnswered` (eliminado por
   completo -- confirmado via grep, nenhuma atribuição restante em
   `fr/app.js`/`zh/app.js`, só comentários históricos). Interação
   intermediária (clicar "Verificar") muta `localState.typedAnswer`/
   `answered`/`wasCorrect` e o renderer se autochama com os mesmos 4
   parâmetros, sem envolver a sessão; só o clique em "Continuar" chama
   `callbacks.onAnswered(wasCorrect, grade)`.
2. **`renderReviewView()`** -- dispatch de `cloze` passou a criar
   `STATE.reviewCardState` preguiçosamente (só quando ausente, tipado por
   `kind:'cloze'`, com `markId: card.cardInstance.markId` já embutido na
   criação) e passar `callbacks.onAnswered` que chama
   `gradeCurrentCard(grade)` -- exatamente o mesmo padrão já usado pros
   outros 3 tipos desde 6C.1/6C.2. Não há mais nenhum `cardTypeId` com
   dispatch "antigo" -- os 4 tipos suportados hoje (normal/
   multiple_choice/type_answer/cloze) usam 100% o contrato novo.
3. **`startReviewSession()`** -- removida a linha que inicializava
   `STATE.reviewClozeAnswered = null` (não existe mais em lugar nenhum do
   código). Comentário da declaração de `STATE.reviewCardState` (objeto
   default do estado) atualizado pra documentar os 4 shapes possíveis
   hoje -- nenhum campo solto de tipo restante em `STATE`.

**Ajuste ao shape documentado na auditoria, avisado antes de codar**
(pedido explícito da autora): o shape que a auditoria da Fase 6C tinha
esboçado pra Cloze era campo-a-campo IDÊNTICO ao de Type Answer
(`{kind:'cloze', typedAnswer, answered, wasCorrect}`) -- literalmente o
"boolean genérico compartilhado" que esta subfase foi instruída a evitar,
mesmo sabendo que desde a 6C.2 os dois já são objetos/instâncias
estruturalmente distintos (nunca a mesma referência de `STATE.
reviewCardState`, `kind` sempre discrimina qual é qual). Adicionei
`markId` ao shape de Cloze:
```js
{ kind: 'cloze', markId, typedAnswer: '', answered: false, wasCorrect: null }
```
`markId` é preenchido no momento da criação (`card.cardInstance.markId`)
e identifica explicitamente a QUAL CardInstance/marca aquele estado
pertence -- mesmo sabendo que hoje só existe 1 markId por exibição (cada
`{{cN::...}}` de uma Note vira sua PRÓPRIA CardInstance/posição de fila
desde a Fase 5, nunca 2 marcas mostradas juntas na mesma tela). Sem essa
adição, o shape voltaria a ser estruturalmente idêntico ao de Type
Answer -- exatamente o risco que a instrução da autora apontava.

**Achado sobre lógica já pertencente ao resolver, não movida pro
renderer**: confirmado por leitura, não presumido -- `resolveClozeCardView`
já centraliza 100% da regra de comparação (`compareAnswerText`, com a
prioridade `cardInstance.compareAnswer` explícito > `mark.compareAnswer`
embutido no `{{cN::texto|compareAnswer}}` > texto puro da marca) e da
revelação (`displayAnswerText`). O renderer só CONSOME esses 2 campos
prontos -- nunca recalcula nada que o resolver já fornece. A única lógica
que continua no renderer (como já documentado desde a Fase 4b, e
preservada intocada aqui) é a decisão de OCULTAR/REVELAR a lacuna na
frase (`renderClozeText(view.rawSentenceText, view.markId, {reveal})`) --
decisão de APRESENTAÇÃO (o quê aparece na tela agora), não de
COMPARAÇÃO (se a resposta está certa) -- distinção que já estava correta
antes desta subfase, nenhuma mudança necessária.

**Áudio e imagem**: comportamento 100% preservado, nenhuma mudança de
arquitetura -- `card.imageUrl`/`view.audioUrl`/`customAudioBtnHTML`
continuam exatamente onde estavam, só com `mountEl` no lugar de
`document.getElementById('review-content')`.

**Decisões arquiteturais desta subfase:**
1. Mesmo padrão de auto-recursão de 6C.1/6C.2 -- interação intermediária
   (verificar resposta) nunca sobe pra sessão, o renderer se rechama
   sozinho com os mesmos 4 parâmetros. Terceira confirmação de que o
   padrão estabelecido na 6C.1 generaliza sem ajuste pra todos os 4 tipos.
2. `mountEl.querySelector(...)` substituiu `document.getElementById(...)`
   em toda a função extraída (mesmo padrão já usado por
   `renderNormalCard`/`renderMultipleChoiceCard`/`renderTypeAnswerCard`)
   -- necessário pro contrato valer de verdade quando o Preview (Fase 6D)
   passar um `mountEl` diferente de `#review-content`.
3. Comentários que citavam `renderClozeReviewCard`/`STATE.
   reviewClozeAnswered` em outros pontos do arquivo (não no renderer em
   si -- ex: comentário de `hasPlainFrontBack`/filtro de Speed Review/
   Combinar na Fase 8a, e o comentário do próprio `renderTypeAnswerCard`
   da 6C.2 que descrevia o campo compartilhado como "ainda em uso por
   Cloze") foram atualizados pra refletir o estado atual -- evita que uma
   sessão futura leia um comentário desatualizado e presuma que o campo
   antigo ainda existe.

**Testes realizados** (os 18 itens pedidos, numerados):
1. **4 suítes Node completas** -- `test_fase4_engine.js` 32/32,
   `test_fase4d_regression.js` 30/30, `test_fase5_generation.js` 33/33,
   `test_fase6b_native_notes.js` 74/74 (**169/169**, sem regressão --
   esperado, nenhuma exercita `fr/app.js`/`zh/app.js`).
2. **Smoke test de navegador real, FR+ZH** -- novo
   `test_fase6c3_cloze_renderer.js` (Playwright), mesmo padrão de
   stub/boot das subfases anteriores.
3. **Cloze nativo simples em francês** -- "Je suis {{c1::brésilien}}."
   -> 1 CardInstance, `markId:'c1'`, lacuna oculta (`___`) na 1ª
   renderização, `localState` criado com `kind:'cloze'`/`markId`
   corretos.
4. **Cloze nativo com múltiplas marcas** -- "{{c1::Je}} {{c2::suis}}
   brésilienne." (fr) e "{{c1::你|nǐ}}{{c2::好|hǎo}}" (zh) -> 2
   CardInstances cada, ids e `markId` distintos confirmados.
5. **Cloze nativo em chinês** -- "我{{c1::是|shì}}巴西人。" ->
   `displayAnswerText` hanzi ("是"), `compareAnswerText` pinyin ("shì"),
   mesma distinção hanzi-revelado/pinyin-comparado de sempre, renderizada
   corretamente via `renderClozeCard`.
6. **Cloze com `compareAnswer`** -- confirmado por marca, não misturado:
   no cenário multi-marca zh, `compareAnswer0:"nǐ"`/`compareAnswer1:"hǎo"`,
   cada CardInstance resolvendo só o seu próprio `mark.compareAnswer`
   (extraído do `|` por `parseClozeMarks`, `shared/flashcard-model.js`
   intocado).
7. **Resposta correta** -- digitar o `compareAnswerText` exato marca
   `wasCorrect:true`, aplica classe `.correct` no espaço da lacuna,
   `gradeCurrentCard(2)` disparado só após "Continuar".
8. **Resposta incorreta** -- digitar texto errado marca
   `wasCorrect:false`, classe `.incorrect` aplicada, `lapses`
   incrementado após "Continuar".
9. **Reveal** -- confirmado que `displayAnswerText` (a forma REVELADA,
   nunca o texto digitado) aparece no espaço da lacuna assim que
   `answered:true`, antes mesmo de "Continuar" ser clicado.
10. **Re-render após resposta sem perder estado** -- chamada explícita a
    `renderReviewView()` de novo, SEM avançar `STATE.reviewIndex`,
    confirma que `answered`/`wasCorrect`/a revelação continuam
    exatamente como estavam (a mesma referência de `localState` é
    reaproveitada, nunca recriada por uma re-renderização do MESMO
    cartão).
11. **Estado de cada cloze independente** -- confirmado nos 2 níveis: (a)
    localState fresh e tipado com o `markId` certo ao entrar na 2ª marca
    (`answered:false` de novo, mesmo a 1ª tendo sido respondida); (b)
    FSRS -- graduar a 1ª marca não altera `due`/`reps` da 2ª (ainda em 0
    reps), e graduar a 2ª (errada) não desfaz o resultado já persistido
    da 1ª (continua em 1 rep) -- 2 CardInstances genuinamente
    independentes, mesma garantia já validada pra "Normal com reverso"
    na Fase 6C.1.
12. **`STATE.reviewClozeAnswered` não é mais usado** -- confirmado via
    `!Object.prototype.hasOwnProperty.call(STATE, 'reviewClozeAnswered')`
    em tempo real de navegador, nos 2 idiomas, E via a "busca final"
    (grep) descrita abaixo -- nenhuma atribuição restante no código,
    só comentários históricos explicando a migração.
13. **CardInstance não mutado pelo renderer** -- `JSON.stringify(card.
    cardInstance)` capturado antes de qualquer interação e comparado
    depois de responder (antes do grade): idêntico. Depois do grade (que
    SÓ muta os campos FSRS, via `applyMemoryGrade`, fora do renderer),
    o conjunto de CHAVES do CardInstance (`Object.keys`, excluindo
    valores) continua idêntico -- nenhuma propriedade nova (`typedAnswer`/
    `answered`/etc.) vazou pro objeto real de `STATE.cards`.
14. **FSRS/XP intocados antes do callback final** -- `due`/`reps`
    idênticos ANTES e DEPOIS de digitar+verificar uma resposta (certa ou
    errada), só mudam depois do clique em "Continuar".
15. **`gradeCurrentCard()` só alcançado pela sessão/callback** --
    confirmado indiretamente pelo item 14 (nada muda até "Continuar") e
    diretamente por `STATE.reviewIndex` só avançando após esse clique,
    nunca na verificação em si.
16. **Normal, Multiple Choice e Type Answer continuam funcionando** --
    fluxo completo de cada um rodado de novo neste mesmo teste (revelar+
    graduar Normal; renderizar MC com `localState.kind` correto;
    renderizar Type Answer com input presente) -- nenhuma regressão nos
    3 renderers das subfases anteriores.
17. **Nenhum renderer paralelo de Preview** -- confirmado
    `typeof renderClozeReviewCard === 'undefined'` (função antiga
    removida de verdade) e que só existe UMA função `renderClozeCard` por
    idioma (grep confirma, mesma disciplina de 6C.1/6C.2).
18. **Ausência de novos erros de console** -- só os mesmos
    `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes (proxy de saída deste
    sandbox bloqueando o CDN do Supabase, já documentado em toda a
    sessão), zero erro novo atribuível a este código, nos dois idiomas.

**Busca final** (pedida explicitamente, executada via grep sobre
`fr/app.js`/`zh/app.js` completos):
- `reviewClozeAnswered` -- 3 ocorrências restantes em cada arquivo, todas
  dentro de COMENTÁRIOS explicando a migração ("Fase 6C.2 eliminou...",
  "Fase 6C.3 eliminou..."), zero em código executável.
- Acessos a `STATE` dentro de `renderClozeCard` -- só
  `STATE.reviewIndex`/`STATE.reviewQueue.length` (2 ocorrências, pra
  calcular `pct`/contagem de progresso) -- mesma exceção documentada e já
  aceita desde a 6C.1 pra Normal/MC/TypeAnswer: é contabilidade de
  SESSÃO (posição na fila), não estado efêmero de interação -- a
  proibição da Fase 6C é especificamente sobre não ler `STATE` pra saber
  "respondido?"/"revelado?"/"o quê foi digitado?", nunca uma proibição
  geral de qualquer leitura. Nenhum outro campo de `STATE` acessado.
- Mutações de `card` feitas pelo renderer -- nenhuma encontrada (confirmado
  também pelo teste de snapshot do item 13 acima).
- Chamadas diretas a `gradeCurrentCard`/`reviewMoreCurrentCard` dentro do
  renderer -- nenhuma; só existe a chamada de `callbacks.onAnswered(...)`,
  que a SESSÃO (dentro de `renderReviewView()`) é quem mapeia pra
  `gradeCurrentCard(grade)`.
- `reviewDirection`/`nextCardDirection`/`isReverse` dentro do renderer --
  nenhuma ocorrência; Cloze nunca teve direção (não existe conceito de
  "frente"/"verso" numa lacuna), então esse mecanismo nunca foi relevante
  pra este tipo, nem antes nem depois da extração.

**O que ainda falta / não foi feito nesta subfase (de propósito,
restrição explícita da autora):** nenhum editor/Preview construído --
`renderClozeCard` está pronto pra ser chamado pelo Preview quando a Fase
6D existir, mas nada o chama ainda fora do Review. Banco/migration, Card
Types, FSRS, parser/sintaxe de Cloze (nenhum bug concreto encontrado que
justificasse mexer), rich text, e qualquer nova arquitetura de áudio/
imagem não foram tocados.

Com a extração de Cloze, os 4 Card Types em uso hoje (normal/
multiple_choice/type_answer/cloze) seguem 100% o mesmo contrato
`renderer(mountEl, card, localState, callbacks)` -- a Fase 6C (extração
dos renderers) está completa. Próxima etapa (Fase 6D -- Preview/editor,
ou qualquer outra) só começa depois de autorização explícita da autora,
com este relatório já entregue antes de pedir luz verde.

Escopo estrito respeitado -- nenhum Preview/editor/migração/mudança de
Card Type iniciados. Parando aqui, aguardando revisão da autora antes de
continuar.

## Fase 6D -- EDITOR: auditoria e especificação (só leitura, zero código)

Pedido explícito da autora, confirmando a Fase 6C concluída (`ee7b829`):
migrar o editor de flashcards (`shared/admin-flashcards.js`/
`shared/my-flashcards.js`) pra trabalhar nativamente com o modelo
Note/Fields já pronto no motor desde a Fase 6B, **sem implementar nada
nesta rodada** -- só ler, mapear e propor. `git status`/`git diff`
confirmados limpos do início ao fim desta auditoria -- nenhum arquivo de
implementação foi tocado.

### 1. Mapa do editor atual

`shared/admin-flashcards.js` (professora, ~1160 linhas) e
`shared/my-flashcards.js` (aluna, ~600 linhas) são **completamente
alheios ao modelo Note/Field** -- nenhum dos dois importa/chama nada de
`shared/flashcard-model.js`. Escrevem direto nas colunas legadas via
`createFlashcard()`/`updateFlashcardContent()`
(`shared/teacher-flashcards.js`) e `createOwnFlashcard()`/
`updateOwnFlashcardContent()` (`shared/own-flashcards.js`): `front`,
`front_pinyin`, `back_trans`, `front_is_target_language`, `choices`,
`cloze_sentence`, `cloze_answer`, `cloze_answer_pinyin`, `note`,
`image_url`, `audio_url`. O motor (`interpretNoteFromRow`) já sabe
INTERPRETAR essas colunas (ramo legado) E interpretar `fields`+
`card_generation_mode` (ramo nativo) -- só ninguém escreve o ramo nativo
ainda.

Estado do formulário: 2 objetos globais mutáveis,
`ADMIN_FLASHCARDS_STATE{studentIds:Set, langFilter, _studentsCache,
editingCardId, _cardsCache}` e `MY_FLASHCARDS_STATE{editingCardId,
_cardsCache}` -- sem nenhuma noção de Note/Field, só um "modo" solto
(`radio[name=admin-flashcard-mode]` com valores `flip`/`mc`/`cloze`,
UI-only, nunca persistido como tal) que decide quais blocos de HTML
aparecem. Criação: 1 `<form>` com blocos mutuamente exclusivos por modo
(`#admin-flashcard-content-main` pra flip/mc, `#admin-flashcard-content-
cloze` pro cloze) + "Recursos opcionais" (nota/imagem/áudio, sempre
visível) + radio de direção (`target-front`/`target-back`, escondido pra
zh/cloze). Edição: `flashcardEditFormHTML(c)`/`myFlashcardEditFormHTML(c)`
-- MESMA estrutura visual, ids próprios (`edit-flashcard-*`), reconstrói o
"modo" a partir dos dados (`isCloze = !!c.cloze_sentence`, `isMC =
!!(c.choices&&c.choices.length)`) porque não há campo que diga isso
explicitamente. Salvar: sempre grava TODAS as colunas de novo (não é um
PATCH parcial), incrementa `revision` (`(c.revision||0)+1`, calculado
pelo CHAMADOR) -- é o único "versionamento" que existe: um id novo
(`flashcardIdForRow`, fr/zh app.js) nunca bate com nenhum salvo em
`STATE.cards`, então o merge-por-id de `applySerializedState()` descarta
o progresso antigo sozinho, sem código de reset dedicado. Reset: não
existe um "reset" formal -- é a MESMA mecânica do revision acima.
Apagar/arquivar: `deleteFlashcardPermanently`/`setFlashcardStatus` (DELETE
físico vs. soft-status), sem relação com Note/Field.

`teacher_flashcards` (professora) vs. `own_flashcards` (aluna): mesmo
schema de colunas, 2 diferenças reais no editor -- (a) professora escolhe
1+ alunos via checkboxes multi-seleção (`buildFlashcardsCardsBoxHTML`
busca por vários `student_id`, cria 1 linha POR aluno selecionado,
mesmo conteúdo) e o idioma vem do vínculo da aluna (`s.language_app_key`,
nunca escolhido à mão); aluna sempre cria "pra si mesma", idioma é sempre
`APP_KEY` fixo do site. (b) `my-flashcards.js` só mostra modo/mídia/
múltipla escolha/cloze quando `fetchMyPlanTier()==='premium'` (gate
Premium, prompt-mestre "reformulação gratuito x premium") -- conta free
só cria flip simples. `admin-flashcards.js` não tem esse gate (é
ferramenta da própria professora/admin).

Como o editor distingue os 5 Card Types hoje: **não distingue 5, só 3**
-- `flip`/`mc`/`cloze` (radio group). "Normal com reverso" e "Digite a
resposta" não têm NENHUMA UI -- só existem no motor (Fase 4a/6B),
alcançáveis hoje só por teste direto (`buildReversedCardInstancePair`,
`cardGenerationMode:'type_answer'`), nunca por um clique real.

### 2. Mapa pro contrato nativo (Fase 6B)

O motor já define e valida (`validateNativeNoteRow`, `shared/flashcard-
model.js:148`) exatamente o shape que o editor precisa produzir --
nenhum campo novo precisa ser inventado, só popular o que já existe:

```
row.fields = [
  { id: <string estável>, lang: <string>, role: <'prompt'|'answer'|'distractor'|null>,
    content: { value: <string> }, audio: {url,source}|{source:'tts',enabled}|null,
    image: {url}|null, pinyinFieldId: <id de outro Field>|null },
  ...
]
row.card_generation_mode = 'normal'|'normal_reversed'|'multiple_choice'|'type_answer'|'cloze'
```

Regras já travadas e ENFORÇADAS pelo motor (não pela UI -- o editor só
precisa produzir dado que passa por elas, a validação de verdade já
existe): `fields`/`card_generation_mode` sempre pareados (`validateNativeNoteRow`);
todo Field com `id` único dentro da Note; `pinyinFieldId` sempre aponta
pra um `id` real da mesma Note; múltipla escolha exige exatamente 1
`role:'prompt'`, exatamente 1 `role:'answer'` (nunca o mesmo Field nos
dois), 1-3 `role:'distractor'` (`validateMultipleChoiceFields`); os
outros 4 modos são POSICIONAIS (`contentFieldIndices` -- slot 0/1, pulando
Fields que são satélite de `pinyinFieldId` de outro) e exigem pelo menos
2 slots de conteúdo. `fieldOrder` é só ordem de exibição no editor (nunca
lido pra decidir direção -- confirmado, ninguém no motor consulta esse
campo pra outra coisa).

### 3. Estrutura de campos por Card Type

- **Normal**: 2 Fields de conteúdo (mais 1 opcional de pinyin, satélite
  de um deles, no zh) -- `slots[0]`=front, `slots[1]`=back. A professora
  escolhe o IDIOMA de cada Field (não uma direção abstrata "estudado/
  nativo") -- é essa escolha que decide `lang` de cada Field; a Note não
  guarda "direção", guarda 2 Fields com `lang` próprio cada. Áudio/imagem
  já são propriedade de FIELD no schema (`field.audio`/`field.image`) --
  mas ver achado crítico na seção 6 abaixo: o pipeline de leitura ainda
  não expõe imagem por Field em lugar nenhum.
- **Normal com reverso**: **a Note é UMA SÓ** (mesmo par de 2 Fields do
  Normal) -- `card_generation_mode:'normal_reversed'` é o que diz ao
  motor "gere as 2 CardInstances" (`buildReversedCardInstancePair`, já
  pronta, nunca chamada por nenhum editor). O editor NUNCA duplica
  conteúdo -- é literalmente o MESMO formulário do Normal, só um modo
  diferente selecionado.
- **Múltipla escolha**: 1 Field `role:'prompt'`, 1 `role:'answer'`, 1-3
  `role:'distractor'` -- hoje o form já tem essa forma de fato (front=
  pergunta, back=resposta certa, mc-1/2/3=erradas), só falta gravar
  `role` explícito em vez de posição implícita (front/back) +
  `choices[]`. Validação de cardinalidade já existe no motor
  (`validateMultipleChoiceFields`) -- o editor não precisa reimplementar,
  só não pode contar só com a validação de tela (já é a postura atual,
  ver `validateFlashcardForm`, mas hoje ela valida contagem de
  `choices[]`, não Fields com role).
- **Digite a resposta**: `promptFieldIndex`/`answerFieldIndex`,
  estruturalmente idêntico ao Normal (2 slots posicionais) -- só o
  `card_generation_mode` muda. `pinyinFieldId` no Field de resposta
  decide o que a aluna zh compara contra (reaproveita o MESMO mecanismo
  hanzi/pinyin do Normal, não um canal próprio -- `resolveTypeAnswerCardView`).
  Nenhuma UI hoje pra este tipo -- seria um 4º radio.
- **Cloze**: **1 Field de texto só**, com marcação `{{cN::resposta}}` ou
  `{{cN::resposta|compareAnswer}}` embutida (`shared/flashcard-model.js`,
  `parseClozeMarks`/`splitClozeMarkRaw`) -- múltiplas marcas na MESMA
  frase geram automaticamente 1 CardInstance por `cN` distinto
  (`interpretNativeNoteFromRow`, ramo `cloze`). **A sintaxe é 100%
  interna** -- a professora nunca deveria digitar `{{c1::...}}` à mão
  (confirmado pela própria intenção documentada no motor, comentário em
  `interpretNativeNoteFromRow`). O editor precisa de um mecanismo de
  SELEÇÃO DE TEXTO ("selecione a palavra, clique 'Cloze'") que:
  (a) insere a marcação na string armazenada em `content.value` por
  baixo dos panos; (b) numera automaticamente `c1`/`c2`/... conforme
  marcas já existentes na frase; (c) permite editar uma marca já feita
  (trocar a palavra marcada, ou seu `compareAnswer`) sem reconstituir a
  frase inteira à mão; (d) permite REMOVER uma marca (reverter o trecho
  pra texto puro). O caso zh (`compareAnswer` = pinyin da resposta,
  diferente do hanzi revelado) precisa de um campo de entrada PRÓPRIO no
  momento de marcar o texto (não um campo solto como hoje
  `#admin-flashcard-cloze-pinyin`) -- ex: um popover/inline-editor que
  abre ao selecionar texto, com "Resposta" (preenchida com a seleção) +
  "Pinyin (o que a aluna digita)" quando o idioma é mandarim.

### 4. Direção -- ponto crítico

Achados, todos por leitura direta do código (nenhum presumido):

- `frontIsTargetLanguage`/`front_is_target_language`: existe SÓ no
  schema legado (`teacher_flashcards`/`own_flashcards`), lido pelo
  ADAPTER (`interpretNoteFromRow`, ramo legado) pra decidir `lang` de
  cada Field na hora de CONSTRUIR a Note a partir da linha antiga -- é
  puramente um mecanismo de INTERPRETAÇÃO de dado histórico. No modelo
  nativo esse campo **não existe e não deve existir** -- a professora
  escolhe o idioma de CADA Field diretamente (Field.lang), não um
  booleano de "qual lado está invertido".
- `isReverse`/`reviewDirection`/`nextCardDirection()`: confirmado (Fase
  4, restrição 3, já cumprida) que são exclusivos da TRILHA
  (`!card.cardInstance`) -- nenhum cartão nativo jamais recebe
  `reviewDirection`. O editor não precisa (nem pode) tocar nesse
  mecanismo -- ele simplesmente não existe pro que o editor produz.
- O editor ATUAL já não decide direção "por idioma" de forma automática
  -- o radio `target-front`/`target-back` é uma escolha EXPLÍCITA da
  professora, gravada em `front_is_target_language`. Isso é
  estruturalmente compatível com o modelo nativo: a única mudança é que,
  em vez de um booleano interpretado por um adapter, o editor nativo
  grava `lang` diretamente em cada Field (a escolha vira "qual Field é
  qual idioma", não "front é o estudado ou não").
- Pra `normal_reversed`: a autora escolhe o CARD TYPE explicitamente (o
  radio/seletor de modo) -- não uma "direção" à parte. Uma vez
  escolhido `normal_reversed`, não existe mais pergunta de "qual lado
  fica na frente" (as duas CardInstances cobrem as duas ordens).
- **O que precisa DESAPARECER do editor**: o radio `target-front`/
  `target-back` como está hoje (um booleano pós-hoc sobre 2 campos
  fixos "Frente"/"Verso"). **O que substitui**: um seletor de idioma por
  Field (ex: dropdown "francês"/"português" em cada campo de texto), sem
  nenhuma noção de "frente"/"verso" embutida no PRÓPRIO conceito de
  direção -- a UI pode continuar mostrando 2 caixas de texto lado a lado
  (isso é só posição na tela, `fieldOrder`), só que cada uma pergunta seu
  próprio idioma, e a ORDEM em que elas viram slot 0/1 é o que o motor lê
  como "front"/"back" (nunca o idioma decide isso).

### 5. Áudio -- auditoria, sem implementar nada novo

Hoje: `<input type="file" accept="audio/*">` -> upload real
(`uploadFlashcardMedia`/`uploadOwnFlashcardMedia`, bucket
`flashcard-media`) -> URL pública gravada em `audio_url` (coluna única,
nível de LINHA, não de campo). É **áudio próprio explícito** (gravação/
arquivo da professora), sempre um upload -- **não existe TTS gravado em
lugar nenhum do editor** (TTS é gerado em runtime pelo motor de
pronúncia já existente do app -- `speakFrench()`/`AUDIO_MANIFEST` --,
nunca uma URL persistida). O adapter legado (`interpretNoteFromRow`,
ramo `else`) vincula esse `audio_url` único ao Field cujo idioma é o
estudado via heurística (`isStudyLanguageField`) -- é dado histórico
reinterpretado, o editor nunca expressou essa escolha diretamente.

O modelo nativo (`field.audio: {url,source:'upload'}` ou
`{source:'tts',enabled:true}`) já é POR FIELD -- é estritamente mais
expressivo que a coluna única de hoje (poderia ter áudio em cada lado
separadamente, algo impossível hoje). O que precisa mudar no editor
(fase futura, não aqui): o campo de upload de áudio deixa de ser 1 input
solto no formulário e passa a viver DENTRO de cada Field (upload próprio
por campo de texto). Nenhuma mudança na mecânica de TTS em si -- resolver
"o áudio automático de pronúncia tenta este campo?" já é decidido por
`isStudyLanguageField(field, appKey)` no runtime (não no editor, não
precisa mudar).

### 6. Imagem -- achado crítico, não presumido

`image_url` legado é NOTE-level (`note.image = {url}`,
`buildEngineCardsFromRow`: `imageUrl: note.image ? note.image.url :
null`) -- confirmado que os 4 renderers (`renderNormalCard`/
`renderMultipleChoiceCard`/`renderTypeAnswerCard`/`renderClozeCard`, os 4
em fr+zh) leem `card.imageUrl` (card-level, vindo de `note.image`), nunca
por Field. A decisão da Fase 6B (CLAUDE.md, "Fase 6A/6B") foi
explicitamente que "imagem é propriedade do FIELD, não da Note" --
`buildNativeRuntimeFields` já ARMAZENA `field.image` por Field -- **mas
nada no pipeline de LEITURA (`resolveCardField`/`buildEngineCardsFromRow`)
resolve ou expõe esse dado**. Ou seja: o schema já suporta imagem por
Field, mas a via de consumo (resolver -> view -> renderer) continua 100%
Note-global, idêntica ao legado. **Isto é um gap real entre Fase 6B e o
que os renderers da Fase 6C de fato leem** -- registrado aqui, não
corrigido (fora do escopo desta auditoria E do que a autora autorizou
tocar: `shared/flashcard-model.js` e os renderers da Fase 6C estão
travados). Uma fase futura de "imagem por Field" precisaria: (a) estender
`resolveCardField()` pra incluir `imageUrl` na projeção de cada Field
resolvido; (b) decidir, por Card Type, qual Field(s) mostram imagem (ex:
Normal -- imagem do lado front? dos dois?); (c) só DEPOIS disso o editor
ganharia um upload de imagem por Field em vez do único solto de hoje.
Até lá, o editor nativo pode continuar oferecendo só 1 upload de imagem
por Note (grava em `note.image`, exatamente como o legado) sem
contradizer o schema -- só não realiza ainda a promessa "imagem é do
Field" que o schema já permite.

### 7. Rich text -- análise técnica, não implementado

`Field.content` hoje é `{value: <string>}` -- uma STRING PURA (nenhuma
marcação, nenhum range, nenhum nó). `resolveCardField()` devolve
`field.text` cru pra dentro de `escapeHTML()` nos renderers (fr/zh
app.js) -- ou seja, hoje o pipeline inteiro trata conteúdo como texto
puro, escapado como HTML por segurança (achado da sessão "7 propostas":
antes disso havia um XSS real por falta de `escapeHTML`, já corrigido).
Pra suportar negrito/itálico/sublinhado/tachado/cor/destaque/remover
formatação/imagem inline/áudio inline/Cloze dentro do texto, `content`
precisaria deixar de ser `{value:string}` e virar uma estrutura com
marcação -- 2 caminhos tecnicamente viáveis, nenhum decidido aqui:
(a) `content.value` continua string, mas passa a ser HTML sanitizado
(mais simples de integrar com o `escapeHTML()`/render atual, mas mistura
apresentação com dado, e formatação livre em HTML cru é risco de XSS se
o sanitizador tiver brecha); (b) `content` vira `{value: <doc
estruturado>}` (tipo ProseMirror/Slate JSON, ou um Markdown restrito) --
mais seguro e mais alinhado ao espírito "Field é dado, não HTML", mas
exige um renderer de rich text novo em CADA um dos 4 Card Type renderers
(fr+zh, 8 pontos de render) pra desenhar o texto formatado, além de
mudar `resolveCardField()` (hoje devolve `.text` cru). Cloze inteiro
dentro de rich text é o caso mais delicado: a marcação `{{cN::...}}`
hoje é regex sobre string plana -- se `content.value` virar um documento
estruturado, `parseClozeMarks`/`renderClozeText` precisariam operar
sobre esse documento (não mais regex), ou o texto cloze precisaria
continuar sendo string plana MESMO que outros Card Types ganhem rich
text (2 representações de `content` coexistindo por Card Type -- viável,
mas é uma decisão de design própria, não decidida aqui). **Nenhuma linha
de código foi escrita pra isso nesta auditoria** -- é puramente a análise
pedida.

### 8. Preview -- auditoria, distinção importante

Existe HOJE um "preview" (`openPublicFlashcardPreview`, `shared/public-
profile.js:465`) -- **confirmado que NÃO é o Preview-alvo da Fase 6C/6D**:
é uma modal read-only pro fluxo de "ver cartão público de outra conta
antes de importar" (prompt-mestre "perfil público"), que renderiza campos
LEGADOS soltos (`c.front`/`c.frontPinyin`/`c.backTrans`/`c.note`/
`c.frontIsTargetLanguage`) vindos direto da RPC `get_public_flashcards()`
-- nunca passa por Note/CardInstance, nunca chama `resolveCardContentView`,
nunca reaproveita nenhum renderer da Fase 6C. É puro texto estático em
`<p>` tags, sem interatividade nenhuma (nem vira/nem responde). **Duplica
conceito, não código** -- ele mostra "o que É o cartão" (metadado), nunca
"como seria estudar esse cartão" (o que os 4 renderers da Fase 6C fazem).
Não é candidato a virar a base do Preview do editor.

O Preview real (Fase 6C, decisão já travada: "Preview e Review devem
usar o MESMO renderer") **não existe ainda em nenhum lugar do código**.
O que os 4 renderers (`renderNormalCard`/`renderMultipleChoiceCard`/
`renderTypeAnswerCard`/`renderClozeCard`, fr+zh) já suportam, confirmado
na auditoria da Fase 6C (seção "3. Contrato do renderer" e "8. Como o
Preview terá seu próprio estado"): assinatura `renderer(mountEl, card,
localState, callbacks)`, mount explícito (não mais `#review-content`
fixo), `localState` que o CHAMADOR cria/descarta (não `STATE.reviewCardState`
-- pro Preview seria uma variável local do módulo do editor), `callbacks.
onAnswered` que o Preview implementaria como um NO-OP de gravação (só
re-renderiza mostrando o resultado, nunca `gradeCurrentCard`/FSRS/XP/
save). Adaptação necessária pro editor conseguir montar um Preview:
form -> `row` sintético (mesmo shape que `createFlashcard()` grava) ->
`buildEngineCardsFromRow(row, opts)` (a MESMA função de produção, sem
round-trip de rede -- o `row` é construído em memória a partir do estado
do formulário, nunca salvo primeiro) -> escolhe o card certo do array
(pra Normal-com-reverso/Cloze-multi-marca, o Preview mostraria só o
primeiro, ou um seletor entre eles -- decisão de UX pra fase futura) ->
`renderer(previewMountEl, card, previewLocalState, previewCallbacks)`.
Nenhuma chamada de rede nem gravação em nenhum ponto desse fluxo.

### 9. Persistência -- mapeamento

Onde o submit constrói o objeto: dentro do handler `submit` de
`#admin-create-flashcard-form`/`#my-create-flashcard-form`
(`admin-flashcards.js`/`my-flashcards.js`), lê cada `<input>`/`<textarea>`
por id, monta um objeto plano `{front, backTrans, note, frontPinyin,
imageUrl, audioUrl, choices, clozeSentence, clozeAnswer,
clozeAnswerPinyin, frontIsTargetLanguage}` passado direto pra
`createFlashcard()`/`createOwnFlashcard()`. Supabase é chamado só DENTRO
de `shared/teacher-flashcards.js`/`shared/own-flashcards.js` (nunca
direto do editor) -- `supabaseClient.from('teacher_flashcards'|
'own_flashcards').insert({...}).select().single()`. Colunas gravadas
hoje: as 12 legadas listadas na seção 1, mais `teacher_id`/`student_id`
(ou `owner_id`)/`language_app_key`/`status` (default `'active'`) -- `id`/
`created_at`/`revision` (default 0) são geridos pelo banco. `fields`/
`card_generation_mode` (migration 045, já aplicada ao vivo, ver seção
"Fase 6B" acima) existem na tabela mas NUNCA são escritos por nenhum
código cliente hoje -- só lidos pelo motor quando presentes (o schema
está pronto, o editor é quem falta escrever neles).

Quando `revision` incrementa: só em EDIÇÃO
(`updateFlashcardContent`/`updateOwnFlashcardContent`, chamador calcula
`(c.revision||0)+1`, nunca o servidor). Pra uma Note nativa, a mesma regra
vale -- qualquer alteração ESTRUTURAL (trocar Card Type, adicionar/
remover Field, mudar `pinyinFieldId`) precisa incrementar `revision`
exatamente como hoje, pelo MESMO motivo (id novo -> reset de progresso
via merge-por-id, sem código de reset dedicado). Uma edição que só
corrige um erro de digitação sem mudar estrutura poderia, em teoria, não
incrementar `revision` -- mas hoje o editor NÃO distingue "mudança de
conteúdo" de "mudança estrutural" (sempre incrementa) -- se isso deveria
mudar é uma decisão de UX pra fase futura, não decidida aqui.

Como uma edição deveria passar a gravar `fields`+`card_generation_mode`:
o submit do editor nativo montaria `row.fields` a partir dos Fields
editados na tela (cada um com `id` estável -- ver seção 10) e
`row.card_generation_mode` a partir do Card Type selecionado, em vez de
montar o objeto plano de 12 colunas de hoje. As 12 colunas legadas
continuariam existindo no schema (nunca removidas, ver seção 10), mas um
cartão criado/editado pelo editor NOVO gravaria `null` nelas (ou as
deixaria como estavam, se for uma edição de um cartão que já era legado
-- decisão da seção 10) e populares só `fields`/`card_generation_mode`.
Nenhuma execução de SQL/migration foi feita nesta auditoria.

### 10. Compatibilidade -- proposta, não implementada

- **Editor de cartão NOVO -> sempre nativo**: todo cartão criado do zero
  pelo editor migrado grava `fields`+`card_generation_mode` desde o
  primeiro save, nunca as 12 colunas legadas (exceto que elas continuam
  `NOT NULL`-livres pelo schema atual -- só `back_trans`/`front`
  parcialmente obrigatórios hoje, migration 035/040 já tornou `front`
  opcional; as demais já são nullable desde sempre).
- **Edição de um cartão LEGADO existente**: 2 estratégias possíveis, sem
  decisão travada aqui --
  (a) **conversão no OPEN**: ao abrir o form de edição, o editor já
  reconstrói `fields`/`card_generation_mode` EM MEMÓRIA a partir das
  colunas legadas (mesma lógica que `interpretNoteFromRow()` já faz no
  motor, só espelhada no client antes de mostrar o form) -- a professora
  edita já no modelo novo, mas o SAVE só grava de fato como nativo se ela
  confirmar (ou sempre, silenciosamente). Risco: se ela cancelar sem
  salvar, nada muda (bom); se salvar, o cartão "migra" de propósito.
  (b) **conversão no SAVE**: o form de edição continua mostrando/editando
  as colunas legadas como hoje (zero mudança de UX pra cartão antigo),
  e só ganha um botão explícito "Migrar pro editor novo" que, quando
  clicado, reconstrói e grava `fields`/`card_generation_mode` (mantendo
  as colunas legadas como estavam, só ADICIONANDO os campos novos) --
  edição posterior desse mesmo cartão já cai automaticamente no editor
  nativo (porque `fields` já está presente). Esta opção é mais
  conservadora (nunca migra sem ação explícita), mas duplica esforço de
  UI (2 editores convivendo por um tempo).
  Nenhuma das duas foi escolhida -- fica pra a autora decidir (ver seção
  "decisões pendentes" abaixo).
- **Nunca conversão AUTOMÁTICA em massa/silenciosa de todo o histórico**
  -- nenhuma migration de dado proposta aqui, consistente com o
  princípio geral já travado (Fase 6B: "nunca migrar destrutivamente").
- **Preservar IDs/histórico FSRS/origin/metadados**: a migração de UMA
  linha de legado pra nativo (seja (a) ou (b) acima) só populariza
  `fields`/`card_generation_mode` -- NUNCA muda `id` da linha, `teacher_id`/
  `student_id`/`owner_id`, `language_app_key`, `status`, `created_at`.
  Como `flashcardIdForRow()` (fr/zh app.js) deriva o id do CARD a partir
  de `row.id`+`row.revision` (nunca do conteúdo/`fields`), migrar uma
  linha pro shape nativo SEM incrementar `revision` preservaria o id do
  card e portanto o progresso FSRS -- só precisaria incrementar
  `revision` se a ESTRUTURA (não só a representação) mudar de fato (ex:
  virar Cloze multi-marca onde antes era mono-marca, mudando quantos
  CardInstances a linha produz). Migrar um Normal legado pra um Normal
  nativo com os MESMOS 2 campos, na MESMA ordem, não precisaria de
  `revision++` -- o card resultante teria o mesmo `id`/`unitTitle`/
  `frontFieldIndex`/`backFieldIndex` de antes.

### 11. Validações -- lista completa, por categoria

**Estrutural (Note/Field, universal a todo Card Type)**:
- `fields` não vazio.
- Todo Field com `id` único dentro da Note.
- `pinyinFieldId` (quando presente) aponta pra um `id` real da mesma Note.
- `card_generation_mode` é um dos 5 valores reconhecidos.
- `fields`/`card_generation_mode` sempre pareados (nunca só um).
- (Já ENFORÇADO pelo motor, `validateNativeNoteRow` -- o editor só
  precisa produzir dado que passa, não reimplementar a checagem, mas
  DEVE validar client-side também pra dar feedback rápido, mesmo nível
  de confiança já usado hoje: client valida por UX, servidor/motor é a
  fonte de verdade.)

**Por Card Type**:
- **Normal**: os 2 slots de conteúdo não-vazios; se algum Field tem
  `pinyinFieldId`, o Field alvo existe e tem conteúdo (senão pinyin
  aponta pra um campo vazio).
- **Normal com reverso**: mesma validação do Normal (é a mesma Note) --
  nenhuma validação adicional própria, o motor já trata os 2
  CardInstances como 2 Normals independentes.
- **Múltipla escolha**: exatamente 1 `prompt`, exatamente 1 `answer`
  (nunca o mesmo Field), 1-3 `distractor`, todos com conteúdo não-vazio
  (já enforçado no motor, `validateMultipleChoiceFields` -- o editor
  precisa mostrar essas mensagens ANTES do submit, mesmo padrão já
  usado hoje pra `choices[]`).
- **Type Answer**: prompt e answer não-vazios; se `languageAppKey===
  'mandarim'`, o Field de resposta precisa ter `pinyinFieldId` apontando
  pra um Field com conteúdo (senão a comparação zh não tem contra o que
  comparar -- mesma regra que Cloze já aplica pro zh hoje).
- **Cloze**: o texto do Field precisa conter pelo menos 1 marca
  `{{cN::...}}` válida (o editor NUNCA deixa o texto sem marca nenhuma
  chegar no submit, já que a marcação é feita via UI, não digitada);
  cada marca com `answer` não-vazio; se `languageAppKey==='mandarim'`,
  cada marca precisa de `compareAnswer` (pinyin) preenchido (mesma regra
  que `clozeAnswerPinyin` já aplica hoje, só que por MARCA em vez de por
  cartão inteiro -- diferença real: hoje só 1 marca por cartão existe,
  múltiplas marcas cada uma precisaria da própria checagem).
- `pinyinFieldId`: quando o idioma da Note é mandarim e um Field é
  `lang:'zh'`, o editor deveria pedir (não necessariamente EXIGIR) um
  Field de pinyin pareado -- hoje isso é implícito (front_pinyin sempre
  ao lado de front no zh); no editor nativo isso vira "adicionar Field
  de pinyin" como uma ação explícita por Field zh.

**UX (não bloqueiam o motor, mas evitam erro óbvio antes de gastar uma
chamada de rede)**: mesmo padrão já em uso hoje (`wireFlashcardFieldValidation`,
borda vermelha + mensagem no blur) -- replicar por Field em vez de por
input fixo; desabilitar "Criar"/"Salvar" enquanto a seleção de
destinatários (professora) ou Card Type está incompleto; avisar ANTES do
submit se um upload de mídia falhar (já existe, mantém).

### 12. FR e ZH -- comparação

**Compartilhável sem adaptação**: toda a ESTRUTURA de estado/orquestração
do editor (`ADMIN_FLASHCARDS_STATE`/multi-seleção de alunos/busca/filtro
de idioma/mecânica de re-render incremental) -- não depende de idioma
nenhum, já é escrita 1x e só existe em cada arquivo por causa da
convenção espelhada fr/zh do repo (`shared/admin-flashcards.js` já É
compartilhado entre os 2 sites -- confirmado no cabeçalho do arquivo:
"Depende de... languages/<lang>/app.js" -- é o `fr/app.js`/`zh/app.js`
que diferem, não o admin-flashcards.js em si). **Continua compartilhado
no editor nativo** sem mudança.

**Precisa ficar específico**: (a) o mecanismo de pinyin -- zh SEMPRE quer
um Field de pinyin pareado a qualquer Field `lang:'zh'` (via UI: "esse
campo é chinês? adicione o pinyin dele"), fr nunca tem esse conceito; (b)
o seletor de direção (seção 4) -- fr oferece a escolha de idioma por
Field livremente (`FLASHCARD_DIRECTION_LANGUAGE_LABELS.frances`), zh HOJE
esconde o bloco inteiro (hanzi+pinyin é par inseparável, sem forma de
"inverter" sem um `back_pinyin` que não existe) -- essa restrição
continua válida no modelo nativo: um Field zh com `pinyinFieldId` só faz
sentido como slot FIXO (não pode virar "back" com um pinyin correspondente
inexistente do outro lado), então a UI de "trocar qual Field é front/
back" precisa CONTINUAR desabilitada quando qualquer Field envolvido
tem `pinyinFieldId`/é alvo de um -- não é uma limitação nova, é a MESMA
que já existe hoje, só reexpressa em termos de Field em vez de
`front_is_target_language`.
`compareAnswer` (Cloze/Type Answer): entra igual nos 2 idiomas
estruturalmente (é sempre "o que a aluna digita, se for diferente do
texto revelado") -- só o zh tipicamente PRECISA dele (pinyin != hanzi),
fr tipicamente não (mesma string pros 2 papéis) -- o editor pode pedir o
campo sempre, mas só EXIGIR preenchido quando `languageAppKey===
'mandarim'` (mesma regra condicional já usada hoje).

### 13. Arquitetura proposta -- divisão em subfases

Estrutura sugerida pela autora, ajustada com achados desta auditoria (só
1 ajuste: 6D.4 dividido em 6D.4a/6D.4b porque "Múltipla escolha" e "Type
Answer" têm complexidade bem diferente -- MC já tem quase toda a UI
pronta hoje, Type Answer não tem NENHUMA):

- **6D.1 -- Estado/modelo do editor**: trocar o objeto de estado plano
  (`{front, backTrans, ...}`) por um objeto que já modela `{fields:[],
  cardGenerationMode}` na memória do formulário -- SEM mudar nenhuma UI
  visível ainda, só a representação interna. Menor risco possível,
  puramente refatoração de dado.
- **6D.2 -- Seleção de Card Type**: substitui o radio `flip/mc/cloze`
  por um seletor que cobre os 5 tipos reais (incluindo `normal_reversed`
  e `type_answer`, hoje sem UI nenhuma) -- ainda sem editor de Field
  completo, só a escolha + esqueleto de campos por tipo.
- **6D.3 -- Editor de Field**: componente reaproveitável "1 Field" (texto
  + seletor de idioma + upload de áudio próprio + upload de imagem +
  toggle de pinyin pareado) -- usado por Normal (2x)/Normal-reversed
  (2x, mesmo componente)/Type Answer (2x).
- **6D.4a -- Múltipla escolha**: adapta o componente de Field pra
  `role` (prompt/answer/distractor) em vez de posição -- menor esforço,
  UI já existe quase pronta hoje.
- **6D.4b -- Type Answer**: primeiro tipo 100% novo na UI -- reaproveita
  o componente de Field de 6D.3, sem UI própria significativa além de
  ligar `promptFieldIndex`/`answerFieldIndex`.
- **6D.5 -- Cloze visual**: o item mais grande/arriscado (seleção de
  texto + inserção de marca + numeração automática + editar/remover
  marca + popover de `compareAnswer` pro zh) -- merece ficar sozinho,
  sem competir com nenhuma outra mudança na mesma entrega.
- **6D.6 -- Persistência nativa**: submit passa a gravar `fields`+
  `card_generation_mode` de verdade (em vez de só simular em memória
  desde 6D.1) -- só DEPOIS que 6D.1-6D.5 já provaram a UI inteira contra
  dado em memória, reduz risco de gravar lixo no banco por um bug de UI
  ainda não pego.
- **6D.7 -- Preview**: monta `row` sintético a partir do estado do
  formulário (já no shape nativo desde 6D.1) e chama
  `buildEngineCardsFromRow`+o renderer certo (Fase 6C) num
  `previewMountEl` dedicado, com `callbacks.onAnswered` no-op -- só faz
  sentido depois que 6D.1-6D.5 garantem que o `row` sintético é
  representativo do que será salvo de verdade.
- **6D.8 -- Compatibilidade/migração de edição**: decide e implementa
  (a) ou (b) da seção 10 pra cartão legado sendo editado -- deliberadamente
  por ÚLTIMO, depois que o editor nativo já está provado em cartão NOVO;
  editar cartão antigo é o caminho de maior risco (dado real, histórico
  FSRS real).

### Decisões que precisam de aprovação explícita da autora antes de
qualquer código (nenhuma travada nesta auditoria)

1. **Imagem por Field** (seção 6): o schema já suporta, o pipeline de
   leitura não resolve ainda -- decidir se uma fase própria estende
   `resolveCardField()`/renderers ANTES do editor tentar oferecer upload
   de imagem por Field, ou se o editor nativo continua com 1 imagem por
   Note (como o legado) até essa fase existir.
2. **Rich text** (seção 7): qual dos 2 caminhos técnicos (HTML
   sanitizado vs. documento estruturado) -- ou se rich text fica de fora
   do escopo da Fase 6D inteira e vira uma Fase 9 própria mais adiante.
3. **Compatibilidade de edição de cartão legado** (seção 10): estratégia
   (a) conversão no open vs. (b) conversão explícita via botão -- ou uma
   terceira opção que a autora prefira.
4. **`revision` em edição não-estrutural** (seção 9): manter sempre
   incrementando (comportamento atual, simples) ou distinguir edição de
   conteúdo (não reseta progresso) de edição estrutural (reseta) -- mais
   fiel à intenção original do mecanismo, mas exige o editor saber
   classificar o tipo de mudança.
5. **Ordem/escopo das subfases** (seção 13): confirmar a divisão 6D.1-
   6D.8 acima, ou repriorizar (ex: `type_answer`/`normal_reversed` podem
   ficar pra depois se a prioridade real for só polir os 3 tipos que já
   têm UI hoje).
6. **Cloze multi-marca na UI** (seção 3): confirmar que o editor deve
   suportar MÚLTIPLAS marcas por frase desde já (o motor já suporta
   desde a Fase 5), ou se o MVP da 6D.5 cobre só 1 marca por frase
   (paridade com o legado) e multi-marca fica pra depois.

Nenhuma implementação foi feita nesta auditoria -- `git status` limpo do
início ao fim (confirmado). Próxima fase (6D.1, ou a ordem que a autora
preferir) só começa depois de autorização explícita sobre as 6 decisões
acima, com este relatório já entregue antes de pedir luz verde.

## Fase 6D.1 -- estado/modelo nativo do editor (fundação, zero UI nova)

Primeira subfase de código da Fase 6D, autorizada com 6 decisões já
travadas (ver mensagem completa): imagem é propriedade do Field (não do
Note); rich text explicitamente adiado, `Field.content` continua
`{value: string}`; cartão legado NUNCA convertido automaticamente (abrir
+ cancelar não pode gravar nada); `revision` incrementa em QUALQUER
alteração de conteúdo persistível (regra coarse, de propósito, mesma
disciplina do editor legado hoje); ordem 6D.1→6D.8 confirmada; Cloze
multi-marca faz parte do MVP da 6D.5 (fora do escopo desta subfase).

**Reauditoria antes de codar** (pedido explícito): reli
`shared/admin-flashcards.js`, `shared/my-flashcards.js`,
`shared/teacher-flashcards.js`, `shared/own-flashcards.js`, `fr/app.js`,
`zh/app.js` e `shared/flashcard-model.js` de novo -- confirmado que nada
mudou desde a auditoria da Fase 6D (mesma estrutura, mesmo achado
central: editor legado nunca toca `interpretNoteFromRow`/o modelo
Note/Field).

**O que foi feito -- um único arquivo novo, `shared/flashcard-editor-state.js`**
(script-global plano, mesma convenção de todo `shared/*.js` do repo --
sem IIFE/módulo, carregado logo depois de `shared/flashcard-model.js` em
`fr/index.html`/`zh/index.html`, ANTES de `shared/teacher-flashcards.js`).
**Nenhum call site real chama nada deste arquivo ainda** -- é fundação
pura, sem efeito em produção. Os 4 baldes pedidos, cada um com sua
própria seção no arquivo:

1. **Note editor state** (o que É persistível) -- `createFieldState()`
   (Field: `id`/`lang`/`role`/`content:{value}`/`audio`/`image`/
   `pinyinFieldId`, EXATAMENTE o shape que `validateNativeNoteRow`/
   `buildNativeRuntimeFields` do motor já consomem, nenhuma propriedade
   extra); `createNativeNoteEditorState()` (estado novo, do zero);
   `createNativeNoteEditorStateFromRow(row)` (a partir de uma linha JÁ
   nativa -- reaproveita `isNoteFieldsPresent`/`isCardGenerationModePresent`/
   `validateNativeNoteRow` do motor pra validar/rejeitar, nunca
   reimplementa a checagem).
2. **"Note" o conceito** (`fields`+`cardGenerationMode`) -- vive DENTRO
   do state acima, não confundido com o balde 3. `cardGenerationMode`
   validado contra `CARD_GENERATION_MODES` (mesma constante do motor,
   nunca uma cópia).
3. **Estado de UI efêmero** -- `createEditorUiState()`, objeto
   TOTALMENTE SEPARADO (nunca mesclado no Note editor state) --
   deliberadamente mínimo (`selectedFieldId`/`focusedFieldId`), reservado
   pras subfases 6D.2+. Testado explicitamente que mutar esse objeto
   nunca muda o snapshot do Note editor state (são objetos disjuntos, a
   garantia é estrutural, não uma convenção).
4. **Legacy row** -- `createLegacyNoteEditorStateFromRow(row)` embrulha
   as 10 colunas legadas relevantes (`front`/`back_trans`/
   `front_pinyin`/`front_is_target_language`/`note`/`image_url`/
   `audio_url`/`choices`/`cloze_sentence`/`cloze_answer`/
   `cloze_answer_pinyin`) num `{kind:'legacy', legacyRow:{...}}` --
   NUNCA converte pra native. Testado explicitamente: abrir (criar o
   estado) + clonar + descartar não muta nem o clone-original nem a
   linha (`row`) de origem, bit a bit.

**Dispatcher único** -- `createNoteEditorStateFromRow(row)` decide
native vs. legacy com o MESMO critério de pareamento que
`interpretNoteFromRow()` (motor) já usa; `isNativeNoteEditorState()`/
`isLegacyNoteEditorState()` são os únicos pontos de checagem do
discriminador `state.kind`.

**Clonagem/snapshot/comparação** -- `cloneNoteEditorState()` (round-trip
JSON, seguro porque todo state é dado 100% plano); `snapshotNoteEditorState()`
(string estável, NUNCA comparação por referência de objeto JS -- pedido
explícito da autora); `noteEditorStatesEqual()`/`noteEditorStateChanged()`/
`noteEditorStateRequiresNewRevision()` (as duas últimas hoje são
IDÊNTICAS de propósito -- regra coarse da decisão 4 -- expostas com
nomes próprios pra quando uma taxonomia mais fina existir, só essa função
mudar).

**Achado de design não trivial, resolvido antes de escrever os testes**:
a comparação de conteúdo (`noteEditorStateContentForComparison()`,
função interna) EXCLUI `noteId`/`revision`/`origin` do que é comparado --
são identidade/versão/proveniência, não conteúdo. Incluir `revision` na
comparação seria circular (o valor que se está decidindo se deve
incrementar já estaria dentro do critério que decide isso). Não estava
explícito no pedido, mas é necessário pra a API fazer sentido -- documentado
no código com essa justificativa.

**`noteEditorStateToRow(state, extra)`** -- transform de dado PURO
(nenhuma chamada de rede), devolve o shape de linha que
`interpretNoteFromRow()`/`buildEngineCardsFromRow()` (motor real) já
sabem interpretar. Preparação explícita pra 6D.6 (persistência)/6D.7
(Preview) -- usado nos testes desta subfase pra confirmar ROUND-TRIP
REAL contra o motor (não uma cópia/simulação): um estado construído por
este arquivo, convertido pra "linha", passado pelo `buildEngineCardsFromRow()`
de produção, produz o CardInstance certo.

**Decisões arquiteturais desta subfase:**
1. `Field.content` permanece `{value: string}` -- nenhum campo `type`
   especulativo adicionado (um teste de sessão anterior, Fase 6B, já
   usava `content:{type:'plain', value}` como convenção só de teste,
   nunca lida pelo motor -- decidido NÃO copiar essa convenção aqui, pra
   não fechar nem abrir a decisão de rich text ainda em aberto, ver
   seção 7 da auditoria da Fase 6D).
2. `privateNote` (nota privada da professora, coluna `note` legada)
   mora no Note editor state, não em nenhum Field -- não é conteúdo
   pedagógico do cartão. ENTRA na comparação de conteúdo/revision
   (decisão 4, coarse) -- editar só a nota privada hoje já reseta
   `revision` no editor legado (`updateFlashcardContent` sempre
   incrementa, não importa o campo), então incluir `privateNote` aqui
   mantém paridade com esse comportamento, não é uma regressão nova.
3. Um único arquivo compartilhado fr+zh (não duas cópias) -- a
   estrutura de estado não depende de idioma nenhum (confirmado na
   auditoria da Fase 6D, seção 12: "compartilhável sem adaptação"); as
   regras específicas de zh (pinyin sempre pareado, seletor de direção
   desabilitado) ficam pra quando a UI de fato existir (6D.2+), não
   precisam de nenhuma duplicação nesta camada de estado puro.
4. Nenhuma mutação de `CardInstance` em lugar nenhum do arquivo --
   confirmado por busca final (ver abaixo) -- CardInstances continuam
   100% derivados/não-persistidos, este arquivo nunca toca em `card.
   cardInstance`/`STATE.cards`.

**Testes realizados:**
- `node --check shared/flashcard-editor-state.js` sem erro.
- **Suíte Node nova, `test_fase6d1_editor_state.js`, 99/99** -- cobre
  TODOS os itens pedidos explicitamente (Field state/geração de id/
  normalização de content; criação native nova com múltiplos Fields/
  role/audio/image/pinyinFieldId; criação a partir de linha real pros 5
  Card Types -- `normal`/`normal_reversed`/`multiple_choice`/
  `type_answer`/`cloze` -- via `buildEngineCardsFromRow()`+
  `resolveCardContentView()` REAIS do motor, não simulados, inclusive
  `normal_reversed` com FSRS confirmadamente independente entre as 2
  metades e Cloze multi-marca gerando 2 CardInstances reais; legacy
  embrulhado sem converter, com teste dedicado de "abrir+clonar+descartar
  nunca muta a linha original"; dispatcher roteando native/legacy/
  pareamento-quebrado corretamente; UI efêmera comprovadamente disjunta
  do Note editor state; snapshot/comparação nos 8 tipos de alteração
  pedidos -- conteúdo, idioma, Field adicionado, Field removido, Card
  Type, áudio, imagem, `pinyinFieldId` -- mais o caso "só `noteId`/
  `revision` mudou não conta como mudança de conteúdo"; `noteEditorStateToRow`
  com round-trip real através do motor; varredura final confirmando
  ausência de `isReverse`/`reviewDirection`/`nextCardDirection` em
  qualquer estado gerado, e confirmando que `front_is_target_language`
  só existe dentro de `legacyRow` (nunca como mecanismo native).
- Suítes anteriores re-executadas sem nenhuma regressão (esperado --
  `shared/flashcard-model.js` não foi tocado): `test_fase4_engine.js`
  32/32, `test_fase4d_regression.js` 30/30, `test_fase5_generation.js`
  33/33, `test_fase6b_native_notes.js` 74/74 -- **169/169**.
- **Smoke test de navegador real, FR+ZH** (`test_fase6d1_browser_smoke.js`,
  Playwright, mesmo padrão de boot/stub de todas as subfases anteriores)
  -- confirma que introduzir o novo `<script>` (sem nenhum call site
  ainda) NÃO quebrou nada: as 15 funções do módulo novo acessíveis
  globalmente na página real (confirma ordem de `<script>` certa --
  `CARD_GENERATION_MODES` do motor acessível); o módulo novo funciona
  de ponta a ponta no contexto real da página (não só isolado em `vm`);
  `ADMIN_FLASHCARDS_STATE`/`MY_FLASHCARDS_STATE`/`flashcardIdForRow()`
  do editor ATUAL continuam com a mesma forma/comportamento de sempre;
  os 4 renderers da Fase 6C (`renderNormalCard`/`renderMultipleChoiceCard`/
  `renderTypeAnswerCard`/`renderClozeCard`) continuam presentes e
  `renderNormalCard()` chamado de verdade sobre um cartão legado real
  produz o HTML esperado (Review 100% intacto); cartão nativo (Fase 6B)
  continua gerável via `buildEngineCardsFromRow()`; e um estado
  construído por este arquivo a partir da MESMA linha nativa bate em
  contagem de Fields com o que o motor de fato lê -- nos dois idiomas,
  todos os checks `true`. Zero erro de console novo (só os mesmos
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, já documentados em toda a sessão).
- **Busca final**: `isReverse`/`reviewDirection`/`nextCardDirection` --
  só 1 ocorrência no arquivo novo, dentro de um COMENTÁRIO listando o
  que é proibido, zero em código executável;
  `frontIsTargetLanguage`/`front_is_target_language` -- só na prosa do
  comentário e dentro do shape de `legacyRow` (exatamente onde deveria
  estar -- é a coluna legada real, preservada como está, nunca um
  mecanismo native); `note.audio`/`note.image`/`card.audio`/`card.image`
  -- só num comentário explicando que são intencionalmente ausentes,
  nunca criados de fato; nenhuma chamada `supabaseClient`/`.insert(`/
  `.update(`/`.from(` no arquivo novo (zero I/O, confirmado); `git diff`
  de `fr/index.html`/`zh/index.html` mostra EXATAMENTE as 2 linhas de
  `<script>` adicionadas, nada mais.

**Escopo respeitado**: só `shared/flashcard-editor-state.js` (novo) +
2 linhas de `<script>` em `fr/index.html`/`zh/index.html`. Nenhum
renderer da Fase 6C tocado, nenhum Review, FSRS, TTS, Preview, migration,
ou UI nova (seletor de Card Type/editor de Field/toolbar/Cloze visual/MC/
Type Answer/upload) implementados -- todos explicitamente reservados pra
6D.2+.

**O que fica pra 6D.2+ (nada disto foi feito aqui, de propósito):**
- Nenhum call site real (`admin-flashcards.js`/`my-flashcards.js`) chama
  `createNoteEditorStateFromRow`/`createNativeNoteEditorState`/etc.
  ainda -- o editor continua 100% no shape legado plano hoje.
- Nenhum mutador de Field (`addField`/`removeField`/`updateField`) --
  decisão consciente de não antecipar isso, pertence à 6D.3 (editor de
  Field reutilizável), que vai decidir a forma certa de mutar em cima de
  UI real, não adivinhada agora sem um call site.
- Nenhuma UI nova de nenhum tipo (seletor de Card Type, editor de Field,
  Cloze visual, upload de mídia, Preview) -- confirmado zero-CSS/zero-DOM
  novo nesta entrega.
- Persistência (INSERT/UPDATE gravando `fields`/`card_generation_mode`
  de verdade) -- `noteEditorStateToRow()` já existe como preparação, mas
  nada chama Supabase com ele ainda -- 6D.6.
- Estratégia de conversão legacy→native no editar (decisão (a) vs (b) da
  auditoria da Fase 6D, seção 10) -- ainda não escolhida, fica pra 6D.8.

Nenhum passo manual pendente pra autora -- zero migração/mudança de
schema nesta subfase. Próxima subfase (6D.2 -- seletor de Card Type) só
começa depois de autorização explícita, com este relatório já entregue
antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-25), "A Fase 6D.1 foi
concluída e commitada em `b786e12`... Agora implemente SOMENTE a subfase
6D.2: introduzir no editor a seleção explícita de Card Type. NÃO avance
para a 6D.3."**

## Fase 6D.2 -- seletor explícito de Card Type (aditivo, 5 tipos, zero
efeito na persistência real ainda)

**Escopo travado pela autora antes de codar**: os 5 Card Types oficiais
são `normal`/`normal_reversed`/`multiple_choice`/`type_answer`/`cloze`
(mesmos `CARD_GENERATION_MODES` do motor); o seletor escreve DIRETO em
`editorState.cardGenerationMode`, nunca cria um campo paralelo
(`selectedCardType`/`cardType`/`type`/`isReverse`); `normal_reversed`
gera 2 CardInstances mas o editor continua criando só UMA Note (nunca
duplica Fields, nunca cria 2 Notes, nunca monta CardInstance manualmente
-- isso é geração, que já é do motor); default de cartão novo permanece
`normal`, nunca `normal_reversed` silencioso; trocar de tipo nesta fase
NÃO precisa reconstruir os Fields (sem editor de alternativas MC, sem UI
de marcação Cloze, sem UI de Type Answer -- fica pra 6D.4a/6D.4b/6D.5);
nenhum mecanismo de reversão via `frontIsTargetLanguage`/`isReverse`/
`reviewDirection`/`nextCardDirection`; cartão legado nunca é
auto-convertido só por abrir a edição, e mesmo selecionar um tipo
só-nativo nesta fase não implementa a conversão (isso é 6D.8); controles
legados existentes NÃO são removidos (documentar o que fica obsoleto, não
apagar); seletor existe nos 2 editores (`admin-flashcards.js`/
`my-flashcards.js`), compartilhando lógica onde genuinamente comum, sem
forçar refactor grande; nenhuma mudança em `shared/flashcard-model.js`,
geração de CardInstance, resolvers, renderers, Review ou FSRS; nenhuma
persistência nativa (sem INSERT/UPDATE gravando `fields`/
`card_generation_mode` de verdade -- isso é 6D.6); nenhum Preview, TTS,
upload de imagem/áudio, rich text, seleção visual de Cloze/múltiplos
Clozes, alternativas completas de Múltipla escolha, ou UI completa de
Type Answer.

**O que foi feito, só em `shared/admin-flashcards.js` +
`shared/my-flashcards.js` (nenhum outro arquivo tocado, confirmado por
`git status`/`git diff --stat`):**

- **`CARD_TYPE_UI_META`** (novo, `shared/admin-flashcards.js`) -- array
  com os 5 ids + rótulo, só pra popular o `<select>` novo. Declarado UMA
  vez só (não redeclarado em `my-flashcards.js`, que já reaproveita
  globais de `admin-flashcards.js` desde sempre -- `openFlashcardResetConfirm`
  já documentava esse padrão) -- **achado técnico importante, corrigido
  ANTES de rodar qualquer teste**: os dois arquivos são carregados como
  `<script>` separados na MESMA página (fr/zh `index.html`, confirmado
  via grep antes de escrever qualquer linha), e top-level `const`/`let`
  de scripts diferentes que compartilham o mesmo escopo global de
  documento colidem -- um segundo `const CARD_TYPE_UI_META` em
  `my-flashcards.js` teria lançado `SyntaxError: Identifier ... has
  already been declared` assim que esse `<script>` rodasse, quebrando a
  página inteira. Corrigido projetando a constante como pertencente só a
  `admin-flashcards.js` desde o início (mesmo padrão já usado por
  `openFlashcardResetConfirm`), com o comentário do "Depende de" em
  `my-flashcards.js` atualizado pra documentar essa dependência
  explicitamente.
- **`ADMIN_FLASHCARDS_STATE.nativeCardState`/
  `MY_FLASHCARDS_STATE.nativeCardState`** (novo campo, nos 2 objetos de
  estado) -- `createNativeNoteEditorState({cardGenerationMode:'normal'})`
  (Fase 6D.1), sempre default `normal`. Reiniciado (nova instância) no
  TOPO de `renderAdminFlashcardsView()`/`renderMyFlashcardsView()` --
  mesmo ciclo de vida do resto do formulário (carregamento inicial +
  depois de um submit bem sucedido), nunca resetado pelo re-render
  incremental de seleção de aluno/idioma.
- **Novo `<select id="admin-flashcard-card-type-preview">`/
  `<select id="my-flashcard-card-type-preview">`** -- ADITIVO, inserido
  logo abaixo do bloco "Idioma de cada lado" e ANTES de "Conteúdo",
  claramente rotulado "Card Type (novo motor -- pré-visualização, Fase
  6D)" com um hint explícito ("ainda não afeta o cartão criado... o Modo
  de prática acima continua sendo o que decide o cartão salvo de fato").
  Em `my-flashcards.js`, gated por `premium` -- mesmo critério do bloco
  "Modo de prática" legado (conta free não vê nenhum dos dois, consistente
  com o resto da tela).
- **Listener de `change`** -- só muta `nativeCardState.cardGenerationMode`,
  nada mais: não toca `#admin-flashcard-content-main`/`-cloze`, não
  dispara `clearAllFlashcardFieldErrors()`, não chama rede/Supabase, não
  interage de forma alguma com o radio "Modo de prática" legado.
- **Submit handler NÃO TOCADO** -- continua lendo só
  `wrap.querySelector('input[name="admin-flashcard-mode"]:checked')`/
  `input[name="my-flashcard-mode"]:checked'` (radios legados), nunca
  `nativeCardState`. Confirmado via teste (ver abaixo): selecionar
  `cloze`/`normal_reversed` no seletor NOVO e submeter com o radio legado
  ainda em `flip` cria um cartão comum de front/back, ignorando
  completamente o valor do seletor novo.
- **Form de EDIÇÃO (`flashcardEditFormHTML`/`myFlashcardEditFormHTML`)
  não foi tocado** -- decisão de escopo: abrir um cartão legado pra
  editar continua 100% no caminho legado de sempre, sem nenhum `<select
  id="...card-type-preview">` nem leitura de `nativeCardState` -- "nunca
  auto-converter ao abrir" cumprido por simplesmente não existir nenhum
  código novo nesse caminho ainda, não por uma checagem condicional.

**Testes realizados:**
- `node --check` sem erro nos 2 arquivos.
- **Suíte Node/vm nova `test_fase6d2_state.js`, 31/31** -- carregar
  `admin-flashcards.js`+`my-flashcards.js` juntos no MESMO sandbox (mesma
  ordem/mesmo escopo global de fr/zh `index.html`) não lança erro de
  redeclaração; `CARD_TYPE_UI_META` cobre exatamente os 5
  `CARD_GENERATION_MODES`; `nativeCardState` default `normal` nos 2
  estados, `fields:[]`, sem `cardInstance`/`cardInstances`, sem
  `isReverse`/`reviewDirection`/`frontIsTargetLanguage`; os 2
  `nativeCardState` são instâncias DISTINTAS (mutar um não vaza pro
  outro); os 5 ids do `CARD_TYPE_UI_META` são todos aceitos por
  `createNativeNoteEditorState()` sem lançar, um id desconhecido continua
  rejeitado (validação da 6D.1 não enfraquecida); confirmado por leitura
  estática que `my-flashcards.js` de fato referencia `CARD_TYPE_UI_META`
  dentro de `renderMyFlashcardsView()` (a dependência documentada é real,
  não presumida).
- **Smoke test de navegador real, FR+ZH** (`test_fase6d2_browser_smoke.js`,
  Playwright) -- **achado técnico não trivial durante a escrita do
  teste**: `window.CURRENT_USER = {...}` não funciona pra sobrescrever a
  variável global `CURRENT_USER` (`let CURRENT_USER = null;`,
  `shared/auth.js`) -- em JS de navegador, `let`/`const` top-level de um
  script clássico criam um binding no registro léxico do documento,
  SEPARADO do objeto `window`; escrever em `window.CURRENT_USER` só cria
  uma propriedade nova no objeto `window`, que nenhuma referência de
  identificador `CURRENT_USER` dentro do código do app enxerga -- a
  atribuição precisa ser feita SEM o prefixo `window.` (`CURRENT_USER =
  {...}`, resolução normal de identificador, que atualiza o binding
  léxico certo). `isAdminUser`/`fetchMyStudents`/`createFlashcard`/etc.
  (declarados via `function`) não sofrem desse problema (declaração de
  função top-level sincroniza com o objeto global), mas troquei TODOS os
  monkey-patches do teste pra atribuição sem `window.` por consistência
  e segurança, não só o de `CURRENT_USER`. Confirmado nos 2 idiomas: (1)
  seletor novo existe, começa em `normal`, options batem exatamente com
  `CARD_GENERATION_MODES`; (2) legacy "Modo de prática" continua em
  `flip` por padrão, blocos de Conteúdo legados visíveis normalmente; (3)
  selecionar CADA um dos 5 tipos via o DOM real (`select.value=...` +
  `dispatchEvent('change')`) atualiza SÓ `nativeCardState.
  cardGenerationMode` -- radio/blocos legados nunca mudam por causa
  disso, `fields` continua vazio, sem `cardInstance`, ZERO chamada de
  rede (`createFlashcard`/`createOwnFlashcard` nunca chamados só por
  trocar o seletor); (4) submit real com o seletor novo em `cloze`/
  `normal_reversed` ainda cria um cartão comum via o radio legado --
  persistência 100% desacoplada do seletor novo nesta fase; (5) render
  COMPLETO pós-submit reinicia `nativeCardState` de volta pra `normal`,
  seletor no DOM também volta pra `normal`; (6) abrir o form de edição de
  um cartão legado existente não cria nenhum `<select
  id="...card-type-preview">` dentro dele e não toca `nativeCardState`
  (confere: JSON idêntico antes/depois de abrir a edição); (7) conta
  FREE em "Meus Cartões" não tem nem o seletor novo nem o radio legado
  (mesmo gate `premium` dos dois), `nativeCardState` continua existindo/
  resetado mesmo sem UI visível pra ele. Zero `pageerror` novo em
  qualquer um dos 2 idiomas -- só os mesmos `ERR_TUNNEL_CONNECTION_FAILED`
  pré-existentes (proxy de saída deste sandbox bloqueando o CDN do
  Supabase, documentado em toda a sessão).
- **4 suítes anteriores + 6D.1 re-executadas, 169+99=268/268 sem
  regressão**: `test_fase4_engine.js` 32/32, `test_fase4d_regression.js`
  30/30, `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
  74/74, `test_fase6d1_editor_state.js` 99/99.
- **Busca final, os 12 padrões proibidos** -- todas as ocorrências de
  `selectedCardType`/`cardType`/`isReverse` são só dentro de COMENTÁRIOS
  explicando o que NÃO foi feito, nunca código executável;
  `reviewDirection`/`nextCardDirection` -- zero ocorrências nos 2
  arquivos; `frontIsTargetLanguage` -- só nos pontos LEGADOS
  pré-existentes (radio de direção do submit real, nunca ligado a
  `nativeCardState`); nenhuma chamada a `buildReversedCardInstancePair`/
  `buildEngineCardsFromRow`/`interpretNoteFromRow`/`cardInstance` em
  nenhum dos 2 arquivos (editor nunca cria CardInstance);
  `createNativeNoteEditorState` chamado só nos 2 pontos esperados por
  arquivo (declaração do estado + reset no render completo) -- nunca
  duas Notes pra `normal_reversed`; nenhum `.insert(`/`.update(` novo nos
  2 arquivos (persistência intocada); `git diff --stat -- shared/fsrs.js
  fr/app.js zh/app.js` vazio (motor/renderers/FSRS 100% intocados);
  `CARD_TYPE_UI_META` declarado exatamente 1 vez (`admin-flashcards.js`),
  0 vezes em `my-flashcards.js`.

**O que ainda falta / não foi feito nesta subfase (de propósito, restrição
explícita da autora):** editor de Field reutilizável (texto+idioma+áudio+
imagem+pinyin) -- 6D.3; UI de alternativas de Múltipla escolha via `role`
-- 6D.4a; UI de Type Answer -- 6D.4b; seleção visual de texto pra marcar
Cloze (incluindo múltiplas marcas) -- 6D.5; persistência nativa (INSERT/
UPDATE gravando `fields`/`card_generation_mode` de verdade) -- 6D.6;
Preview reaproveitando os 4 renderers da Fase 6C -- 6D.7; estratégia de
conversão legacy→native ao editar um cartão já existente -- 6D.8.

Nenhum passo manual pendente pra autora -- zero migração/mudança de
schema nesta subfase (100% client-side). Próxima subfase (6D.3 -- editor
de Field) só começa depois de autorização explícita, com este relatório
já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-25), "Agora implemente
SOMENTE a subfase 6D.3: criar o editor reutilizável de Fields nativos e
conectá-lo ao estado nativo do editor. NÃO avance para 6D.4a, 6D.4b,
6D.5, 6D.6, 6D.7 ou 6D.8" -- instrução veio com 21 restrições
arquiteturais numeradas, todas cumpridas nesta entrega, ver abaixo.**

## Fase 6D.3 -- editor de Fields nativos, reutilizável (texto + idioma,
sem rich text/mídia/pinyin completos ainda)

**Auditoria obrigatória feita antes de qualquer código** (pedido explícito
no início da instrução): reli por completo `shared/flashcard-editor-
state.js` (Fase 6D.1), `shared/admin-flashcards.js` (1219 linhas, inteiro
-- inclusive a parte não lida numa auditoria anterior desta sessão),
`shared/my-flashcards.js` (649 linhas, inteiro), `shared/teacher-
flashcards.js`, `shared/own-flashcards.js`, e os trechos relevantes de
`fr/app.js` (`buildCardFromTeacherFlashcard`/`buildCardFromSelfFlashcard`/
`mergeTeacherFlashcardsIntoState`/`mergeSelfFlashcardsIntoState`/
`addSelfFlashcardToState`/`updateSelfFlashcardStatusInState`/
`removeSelfFlashcardFromState`) -- confirmando pontos que a auditoria da
Fase 6D já tinha mapeado e que continuavam válidos: nenhum dos dois
editores toca `shared/flashcard-model.js` hoje (escrevem só nas 12
colunas legadas); o par `fields`/`card_generation_mode` (migration 045)
existe na tabela mas nunca é escrito por código cliente; o discipline de
"nunca re-renderizar o form inteiro por causa de seleção" (UX-fix 5) é
crítico de preservar; o form de EDIÇÃO de um cartão já existente
(`flashcardEditFormHTML`/`myFlashcardEditFormHTML`) é um caminho
COMPLETAMENTE separado do de criação, e nunca foi tocado pela Fase 6D.2
-- confirmado que continua assim nesta subfase também (ver decisão 16
abaixo).

**O que foi feito -- 1 arquivo novo, `shared/flashcard-field-editor.js`:**

- **Opera DIRETAMENTE sobre o Field state da 6D.1** (`createFieldState()`
  -- `{id, lang, role, content:{value}, audio, image, pinyinFieldId}`) --
  nenhuma estrutura paralela (`frontText`/`backText`/`fieldValue`/
  `fieldLanguage`) foi criada como fonte de verdade (restrição 3).
- **`FIELD_LANG_OPTIONS`** -- lista fechada mas extensível dos idiomas já
  conhecidos pelo motor (`fr`/`zh`/`zh-pinyin`/`pt-BR`, os mesmos valores
  literais que `STUDY_LANG_FOR_APP_KEY`/`isStudyLanguageField`
  (`shared/flashcard-model.js`) já usam) -- nunca inferidos a partir de
  `APP_KEY`/direção (isso seria recriar `frontIsTargetLanguage`, restrição
  6). Reutilizável nos dois idiomas do site sem nenhuma bifurcação por
  arquivo (restrição 15).
- **`renderFieldEditorHTML(field, index, opts)`/`renderFieldEditorListHTML(editorState, opts)`**
  -- render puro (HTML string, sem side-effect), com `escapeHTML()` em todo
  conteúdo interpolado (mesmo cuidado de segurança já documentado na
  sessão "7 propostas" pra outros campos de flashcard). Mostra um
  indicador textual (não editável) quando `field.audio`/`field.image`/
  `field.pinyinFieldId` já existem -- nenhuma UI de upload/TTS/player/
  pinyin completo (restrições 8/9/10).
- **`addFieldToEditorState`/`removeFieldFromEditorState`/
  `updateFieldInEditorState`/`cloneFieldIntoEditorState`** -- os 4
  mutadores puros:
  - `addFieldToEditorState` -- sempre um Field NOVO (id gerado por
    `createFieldState`), adicionado ao FIM de `editorState.fields` --
    `fields` continua sendo só a ordem estrutural/editorial, nunca
    interpretada como frente/verso por este módulo (restrição 5).
  - `removeFieldFromEditorState` -- remove por **ID**, nunca por índice
    (restrição 4) -- os Fields restantes preservam id/conteúdo/lang/
    role/audio/image/pinyinFieldId intactos.
  - `updateFieldInEditorState` -- casa por id, faz um `Object.assign`
    raso com o `patch` recebido -- campos NÃO mencionados no patch (ex:
    editar só `content` nunca toca `audio`/`image`/`role`/
    `pinyinFieldId`) continuam exatamente como estavam. É isto que
    garante as restrições 8/9/10/7 (preservar áudio/imagem/pinyin/role
    ao editar texto/idioma) -- **nunca cria um Field novo nem gera um id
    novo** (restrição 4, "editar conteúdo NÃO cria novo ID").
  - `cloneFieldIntoEditorState` -- o ÚNICO caso em que um id novo é
    esperado (restrição 4, "clonar um Field deliberadamente DEVE criar um
    novo ID") -- copia lang/role/content/audio/image do original, mas
    **nunca copia `pinyinFieldId`** (apontaria pro Field ORIGINAL, não
    faria sentido dentro do clone -- criaria uma referência cruzada entre
    2 Fields que ninguém pediu).
- **`wireFieldEditorList(container, editorState, onChange)`** -- liga o
  DOM (`data-field-content`/`data-field-lang`/`data-field-remove`/
  `data-field-add`) aos mutadores acima. `onChange(kind, fieldId)` avisa
  quem integra sobre `'content'`/`'lang'`/`'remove'`/`'add'` -- decisão
  explícita: edição de texto/idioma **NUNCA** dispara re-render (o próprio
  input/select já reflete a mutação, e re-renderizar apagaria o que a
  pessoa está digitando -- mesma disciplina da UX-fix 5, "toda mudança de
  seleção = re-render completo = apaga o formulário" era exatamente o bug
  daquela entrega); só `'add'`/`'remove'` precisam de re-render (a LISTA
  de linhas mudou de tamanho).
- **`refreshNativeFieldsBox(boxEl, editorState, opts)`** -- helper de
  integração reutilizado pelos dois editores: renderiza a caixa + rewire,
  reconstruindo a si mesma só quando `wireFieldEditorList` reporta
  `'add'`/`'remove'`.
- **`isValidFieldState(field)`** -- validação básica pedida na restrição
  21 (`id` string não-vazia, `content.value` string) -- **não é chamada
  por nenhum fluxo de submit nesta subfase** (submit continua 100%
  legacy, restrição 18) -- fica pronta pra quando 6D.6+ precisar dela.

**Integração nos 2 editores existentes** (restrição 17 -- conectar aos 2
fluxos, sem misturar seleção de alunos/permissões/origem teacher-self com
o componente genérico):

- **`shared/admin-flashcards.js`** -- novo bloco "Campos nativos (novo
  motor -- pré-visualização, Fase 6D)" logo abaixo do seletor de Card
  Type da 6D.2, ANTES de "Conteúdo" (legacy). `refreshNativeFieldsBox(...)`
  chamado 1x no fim de `renderAdminFlashcardsView()` (mesmo ciclo de vida
  de `ADMIN_FLASHCARDS_STATE.nativeCardState` -- reset completo no
  carregamento inicial e depois de um submit bem sucedido, nunca tocado
  pelo re-render incremental de seleção de aluno/idioma).
- **`shared/my-flashcards.js`** -- mesmo bloco, gated por `premium`
  (mesmo critério do seletor de Card Type da 6D.2 -- sem isso, conta
  grátis veria um editor de Fields sem nenhuma linha de contexto sobre
  o que ele faz).
- **`fr/index.html`/`zh/index.html`** -- `<script src="../shared/
  flashcard-field-editor.js">` inserido logo depois de `flashcard-editor-
  state.js` e antes de `teacher-flashcards.js` (nos dois idiomas, mesma
  posição relativa).

**Decisão explícita: sem auto-seed de Fields.** Um Note nativo novo
começa com `fields:[]` (mesmo default já travado desde a 6D.1/6D.2) --
NÃO populei 2 Fields em branco automaticamente pra `normal`/
`normal_reversed`/`type_answer` (que estruturalmente precisam de 2 slots).
Motivo: qualquer heurística de "quantos Fields por Card Type" seria regra
de CARD TYPE, não de Field editor -- exatamente a mistura que a restrição
14 proíbe ("Field editor = edição de Field; Card Type editor = regras do
tipo; não colocar toda a lógica dos 5 tipos dentro do Field editor").
Adicionar/remover Fields é 100% manual nesta subfase, via o botão "+
Adicionar campo" -- funciona igual pra qualquer Card Type (2 pra normal, 1
pra cloze, mais pra MC), sem o Field editor precisar saber qual é qual.

**Decisão explícita: `role` fica de fora da UI, mas preservado no
dado.** Nenhum controle de `role` foi renderizado nesta subfase (restrição
7 -- "para Normal nesta fase, não inventar roles desnecessárias"; UI de
`role` pra Múltipla Escolha/Type Answer é 6D.4a/6D.4b). Mas
`updateFieldInEditorState` nunca apaga um `role` já presente ao editar
texto/idioma (testado explicitamente, item 14 da suíte -- ver Testes
abaixo) -- o dado sobrevive mesmo sem controle visível pra ele ainda.

**Decisão explícita: form de EDIÇÃO de cartão legado NÃO ganhou este
editor.** `flashcardEditFormHTML`/`myFlashcardEditFormHTML` continuam
100% no caminho legacy, sem nenhum `<select id="...card-type-preview">`
nem Field editor -- cumpre a restrição 16 por construção: **abrir um
cartão legado pra editar nunca aciona nenhum código relacionado a
`fields`/`nativeCardState`**, então não há como "converter automaticamente"
nada -- o mecanismo simplesmente não existe nesse caminho ainda. Conversão
formal (decisão (a) vs (b) já esboçada na auditoria da Fase 6D, seção 10)
continua sendo trabalho da Fase 6D.8, não desta.

**Decisão explícita: submit continua 100% legacy.** Nem
`shared/admin-flashcards.js` nem `shared/my-flashcards.js` tiveram seus
handlers de submit tocados -- continuam lendo só o radio "Modo de
prática" legado e as 12 colunas de sempre (`createFlashcard()`/
`createOwnFlashcard()`), exatamente como confirmado pela busca final
abaixo (restrição 18: "o submit atual não deve começar a gravar fields/
card_generation_mode só porque o Field editor existe"). O estado nativo
(`nativeCardState.fields`) É atualizado em tempo real conforme a
professora/aluna edita (confirmado via testes D/E/F do smoke, ver
abaixo) -- só não é persistido em lugar nenhum ainda.

**Testes realizados (26 itens pedidos, todos cobertos):**

- `node --check` sem erro em `shared/flashcard-field-editor.js`,
  `shared/admin-flashcards.js`, `shared/my-flashcards.js`.
- **Suíte Node/vm nova `test_fase6d3_field_editor.js`, 65/65** -- criar
  Field (id gerado, content/lang corretos); editar Field (conteúdo,
  idioma) preservando id; adicionar Field (2 ids distintos); remover
  Field por ID (não por índice, o restante intacto); reordenar Fields
  (conjunto de ids não muda, só a ordem); clonar Field deliberadamente
  (id NOVO, copia lang/role/content/audio, NUNCA copia pinyinFieldId);
  Normal com múltiplos Fields (2 Fields, cardGenerationMode inalterado
  pelo Field editor); normal_reversed sem duplicação (2 Fields
  continuam 2, sem cardInstance/cardInstances/isReverse/reviewDirection
  no editorState); áudio preservado através de 2 edições seguidas
  (conteúdo + idioma); imagem preservada; pinyinFieldId preservado
  (inclusive: remover um Field NÃO relacionado não quebra a referência de
  outro); role preservado mesmo sem UI de role nesta fase; estado de UI
  efêmero (`createEditorUiState`, 6D.1) confirmado DISJUNTO do Note editor
  state; nenhum `note.audio`/`note.image` criado; nenhuma chamada a
  `buildEngineCardsFromRow`/`interpretNoteFromRow`/`supabaseClient`/
  `.insert(`/`.update(`/`.from(` no módulo (via leitura de código,
  ignorando comentários); render puro escapa HTML perigoso; lista vazia
  não quebra o render; validação básica (`isValidFieldState`) aceita
  Field válido e rejeita `null`/sem id/sem `content.value` string; reset
  produz `fields:[]` e NUNCA reaproveita um id de uma instância anterior;
  FR (acentos/apóstrofo sobrevivem à edição); ZH (Field hanzi + Field
  pinyin, os dois preservados juntos, `pinyinFieldId` sobrevive a uma
  edição de `lang`).
- **4 suítes anteriores re-executadas, 268/268 sem regressão**
  (esperado -- nenhuma toca `shared/flashcard-field-editor.js`):
  `test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js` 74/74,
  `test_fase6d1_editor_state.js` 99/99, `test_fase6d2_state.js` 31/31.
- **Browser smoke, FR+ZH, `test_fase6d3_browser_smoke.js`, 46/46 checks**
  -- editor abre (caixa de Fields existe, começa vazia, mostra mensagem de
  estado vazio -- confirma a decisão de "sem auto-seed"); seletor de Card
  Type da 6D.2 continua funcionando (regressão); Fields aparecem no DOM
  via clique real no botão "+ Adicionar campo" (2 cliques -> 2 Fields, 2
  linhas no DOM); conteúdo pode ser alterado via `input` real (reflete em
  `nativeCardState.fields` de verdade); idioma pode ser alterado via
  `change` real; **IDs permanecem ESTÁVEIS durante toda essa edição**
  (confirmado comparando o conjunto de ids antes/depois de editar
  conteúdo E idioma dos 2 Fields); o input editado continua sendo o
  MESMO nó do DOM (nunca recriado por um re-render inteiro -- confirma
  que `updateFieldInEditorState`/`wireFieldEditorList` não disparam
  `refreshNativeFieldsBox` em edição de texto/idioma); remover 1 de 2
  Fields funciona, o OUTRO preserva seu próprio conteúdo intacto; **mudar
  pra `normal_reversed` NÃO duplica Fields** (continuam 1, sem
  `cardInstance`/`cardInstances` no `nativeCardState`); **submit legacy
  atual continua funcionando EXATAMENTE como antes** nos dois editores
  (`createFlashcard`/`createOwnFlashcard` chamados 1x cada, cartão criado
  de verdade) MESMO com o editor nativo tendo Fields soltos não
  persistidos -- confirma que os 2 caminhos são genuinamente
  independentes; `nativeCardState` reseta (`fields:[]`) depois de um
  submit bem-sucedido (mesmo ciclo de vida de sempre); **Review continua
  funcionando** -- um cartão de TRILHA real (`origin:'study'`, já
  construído pelo boot normal a partir de `content.js`) foi colocado na
  fila e `renderReviewView()` rodou sem erro, nos 2 idiomas (achado
  técnico: o primeiro rascunho do teste tentava um card sintético
  fr-shaped em zh, o que quebrou `audioBtnHTML()` -- **bug do script de
  teste, não do código de produção** -- corrigido reaproveitando um card
  real de `STATE.cards` em vez de inventar um shape à mão). **Zero erro
  de console novo** em nenhum dos dois idiomas (excluindo os
  `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
  sandbox, documentados em toda a sessão).
- **Busca final (12 categorias pedidas)** -- todas as ocorrências de
  `frontText`/`backText`/`frontLanguage`/`backLanguage`/`isReverse`/
  `reviewDirection`/`nextCardDirection`/`frontIsTargetLanguage` no arquivo
  novo estão SÓ dentro de comentários (confirmado programaticamente,
  removendo linhas `//` antes de checar); zero `note.audio`/`note.image`
  criados; zero chamada a `buildEngineCardsFromRow(`/`interpretNoteFromRow(`
  (parênteses reais, não citação em comentário); zero `supabaseClient`/
  `.insert(`/`.update(`/`.from(` no módulo inteiro (sem I/O de rede, sem
  gravação de `fields`/`card_generation_mode` antes da 6D.6); zero
  duplicação de Field pra `normal_reversed` (confirmado no smoke real
  acima); zero id baseado em índice (`removeFieldFromEditorState`/
  `updateFieldInEditorState` sempre casam por `f.id`, nunca por posição
  do array). Diff completo de `shared/admin-flashcards.js`/
  `shared/my-flashcards.js` inspecionado linha a linha -- só HTML aditivo
  + 1 chamada a `refreshNativeFieldsBox(...)` por arquivo, nenhuma das 12
  categorias proibidas presente nas linhas adicionadas.

**O que ainda falta / não foi feito nesta subfase (de propósito, restrição
25 -- escopo estrito):**
- Nenhuma UI de `role` (prompt/answer/distractor) pra Múltipla Escolha --
  6D.4a.
- Nenhuma UI de Type Answer (promptFieldIndex/answerFieldIndex) -- 6D.4b.
- Nenhuma seleção visual de texto pra marcar Cloze, incluindo múltiplas
  marcas -- 6D.5.
- Nenhum upload real de áudio/imagem, nenhum TTS, nenhum player -- só o
  indicador textual de que já existem (quando existirem) e a garantia de
  que editar o resto do Field não os apaga.
- Nenhuma UI completa de pinyin/`compareAnswer` -- só a preservação de
  `pinyinFieldId` através de edições.
- Nenhuma persistência nativa (INSERT/UPDATE gravando `fields`/
  `card_generation_mode` de verdade) -- 6D.6.
- Nenhum Preview reaproveitando os 4 renderers da Fase 6C -- 6D.7.
- Nenhuma conversão legacy→native ao abrir um cartão já existente pra
  editar -- 6D.8.
- Nenhuma migração de schema, nenhum passo manual pendente pra autora --
  100% client-side, confirmado por `git status` limpo antes/depois além
  dos arquivos já listados no escopo.

Próxima subfase (6D.4a -- regras de Múltipla Escolha via `role`) só
começa depois de autorização explícita da autora, com este relatório já
entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-25), "FASE 6D.4a —
MULTIPLE CHOICE... Agora implemente SOMENTE a subfase 6D.4a: editor
nativo de Multiple Choice. NÃO avance para 6D.4b, 6D.5, 6D.6, 6D.7 ou
6D.8" -- instrução veio com 25 seções numeradas de restrições/pedidos,
todas cumpridas nesta entrega, ver abaixo.**

## Fase 6D.4a -- editor nativo de Multiple Choice (via `role`, sem
persistência/Preview/legacy migration)

**Auditoria obrigatória feita antes de qualquer código**: reli
`shared/flashcard-editor-state.js`, `shared/flashcard-field-editor.js`
(6D.3), `shared/admin-flashcards.js`, `shared/my-flashcards.js`, e as
seções de `shared/flashcard-model.js` relativas a Múltipla Escolha
(`validateMultipleChoiceFields`, `validateNativeNoteRow`,
`interpretNativeNoteFromRow` ramo `multiple_choice`,
`buildNativeRuntimeFields`, `resolveCardField`,
`resolveMultipleChoiceCardView`, e o ramo legado `else` de
`interpretNoteFromRow` que lê `row.choices`). Achados:

- **Como MC é representado hoje**: legado -- `choices` é array de STRINGS
  planas (não Fields), gravado direto na coluna `teacher_flashcards.
  choices`/`own_flashcards.choices`; o CardInstance legado grava
  `promptFieldIndex: frontFieldIndex, correctFieldIndex: backFieldIndex,
  distractors: row.choices` (reaproveitando os mesmos 2 Fields de
  front/back que `normal` já usa, mais o array de choices cru). **Nativo
  (já existente desde a Fase 6B, nunca alcançável por nenhuma UI até
  agora)** -- `interpretNativeNoteFromRow()` já sabe montar o CardInstance
  a partir de `role`: `promptFieldIndex`/`correctFieldIndex` vêm de
  `fieldIndexByRole(rawFields, 'prompt'/'answer')`, e `distractors` é um
  array de STRINGS extraído de `rawFields.filter(f => f.role ===
  'distractor').map(f => f.content.value)` -- ou seja, **o shape do
  CardInstance É IDÊNTICO entre legado e nativo** (`distractors` sempre
  vira array de texto puro na hora de gerar o CardInstance, nunca uma
  referência a Field) -- o renderer (`resolveMultipleChoiceCardView`,
  `renderMultipleChoiceCard` da Fase 6C.2) não precisa (e não pode) saber
  se veio de `choices` legado ou de Fields nativos com role.
- **Como a resposta correta é identificada**: legado, por posição
  (`correctFieldIndex = backFieldIndex`, sempre o "verso"); nativo, por
  `role === 'answer'` -- já validado (`validateMultipleChoiceFields`,
  Fase 6B) como exatamente 1 Field, nunca o mesmo Field que `role ===
  'prompt'`.
- **Cardinalidade já validada pelo motor**: `validateMultipleChoiceFields(fields)`
  (shared/flashcard-model.js linha 133, já existente desde a Fase 6B, sem
  nenhuma UI que a alcançasse até agora) -- exatamente 1 prompt, exatamente
  1 answer, 1-3 distractors, chamada de dentro de `validateNativeNoteRow()`
  sempre que `card_generation_mode==='multiple_choice'`.
- **Nenhum bug real encontrado no pipeline** que impedisse o editor
  nativo de funcionar -- a engine já suportava Múltipla Escolha nativa
  corretamente, só faltava uma UI que a alcançasse. Nenhuma refatoração
  preventiva foi feita em `shared/flashcard-model.js` (intocado nesta
  subfase, confirmado por `git diff --stat`).
- **Gap real identificado (não um bug, uma lacuna de escopo)**:
  `validateNativeNoteRow()`/`validateMultipleChoiceFields()` NUNCA
  validam CONTEÚDO de Field (só estrutura/cardinalidade/ids) -- um Field
  de múltipla escolha com `content.value` vazio é estruturalmente válido
  pro motor, mas pedagogicamente sem sentido. Resolvido nesta subfase
  pela camada de validação PRÓPRIA do editor (ver abaixo), sem tocar o
  motor.

**O que foi feito -- 1 arquivo novo, `shared/flashcard-mc-editor.js`:**

- **`MC_ROLES = ['prompt', 'answer', 'distractor']`**, `MC_MAX_DISTRACTORS
  = 3`, `MC_MIN_DISTRACTORS = 1` -- os únicos 3 roles que este editor
  atribui/reconhece (restrição explícita: "não introduzir outros roles
  nesta subfase").
- **`validateNativeMultipleChoiceStructure(editorState)`** -- validação
  explícita, **reutilizável pela 6D.6**: converte `editorState` pra shape
  de linha via `noteEditorStateToRow()` (já existente desde a 6D.1 --
  literalmente o MESMO transform que a 6D.6 vai usar pra persistir) e
  passa direto pra `validateNativeNoteRow()` do motor -- **nunca uma
  segunda implementação** da regra de cardinalidade/pareamento/ids
  únicos/pinyinFieldId, só reaproveita o que já existe. Duas checagens A
  MAIS, que o motor não faz (tempo de edição, não geração de
  CardInstance): **"todos os roles reconhecidos"** (qualquer Field com
  role fora de prompt/answer/distractor, ou sem role nenhuma, numa Note
  `multiple_choice` é tratado como estrutura AMBÍGUA/incompleta -- nunca
  ignorado silenciosamente) e **"conteúdo válido"** (pergunta/resposta/
  todo distrator precisam de texto não-vazio depois de `.trim()`).
- **`transitionToMultipleChoice(editorState)`** (restrição 14, "normal →
  multiple_choice") -- reaproveita, de forma DETERMINÍSTICA, os Fields
  que já existiam: o 1º Field SEM role nenhuma vira `prompt` (se ainda
  não houver nenhum), o 2º SEM role vira `answer` (se ainda não houver
  nenhum) -- **nunca sobrescreve um role já definido** (um Field que já
  era `distractor` de uma edição MC anterior permanece `distractor` numa
  transição idempotente). **Nunca inventa distractor** -- se não sobrar
  nenhum Field pra virar um, a estrutura fica EXPLICITAMENTE incompleta
  (a validação reporta isso) até o usuário adicionar via "+ Adicionar
  distrator". Achado durante os testes: numa transição a partir de um
  Note zh de 3 Fields (hanzi + pinyin satélite + tradução), só os 2
  primeiros SEM role viram prompt/answer -- o 3º fica "sobrando" sem
  role, e a UI mostra isso numa seção própria "Outros campos" (ver
  abaixo) em vez de escondê-lo silenciosamente.
- **`addMultipleChoicePromptField`/`addMultipleChoiceAnswerField`/
  `addMultipleChoiceDistractorField`** -- wrappers finos sobre
  `addFieldToEditorState()` (6D.3, reaproveitado, nunca duplicado) que só
  fixam `role`. `removeMultipleChoiceDistractorField` -- idem sobre
  `removeFieldFromEditorState()`. Restrição 15 ("adicionar distractor
  cria novo ID... remover remove só aquele Field... não renumerar IDs")
  já é garantida de graça pelos próprios primitivos da 6D.3, sem código
  novo.
- **`promoteDistractorToAnswer(editorState, distractorFieldId)`**
  (restrição 7 -- "trocar answer↔distractor altera só a semântica do
  Field, não deve criar/deletar CardInstances") -- rebaixa a resposta
  ATUAL (se existir) a `distractor` e promove o Field escolhido a
  `answer`, **preservando os ids/conteúdo/lang/audio/image/pinyinFieldId
  dos DOIS** -- só `role` troca. Funciona também quando ainda não existe
  nenhuma resposta certa (equivale a "usar este distrator como resposta"
  direto). Esta é a ÚNICA forma de mudar role que o editor oferece nesta
  subfase -- não existe UI pra reatribuir `prompt` (não descrito nas
  restrições, e não haveria caso de uso claro já que só 1 Field pode ter
  esse role e ele é criado explicitamente via "+ Criar campo de
  pergunta").
- **`renderMultipleChoiceEditorHTML(editorState, opts)`** -- 3 seções
  semanticamente rotuladas ("Pergunta/Prompt", "Resposta correta",
  "Distratores (N/3)"), cada Field individual renderizado via o MESMO
  `renderFieldEditorHTML()` da 6D.3 (nunca um editor textual paralelo,
  restrições 3/4/6) -- prompt/answer com `removable:false` (únicos
  criados via botão dedicado, nunca removidos diretamente -- só trocados
  via `promoteDistractorToAnswer` no caso do answer), distratores com
  botões próprios "✓ Marcar como resposta certa"/"🗑 Remover distrator".
  Fields "sobrando" (role fora de prompt/answer/distractor, ex: o Field
  de pinyin satélite numa transição zh) aparecem numa seção "Outros
  campos (sem papel definido)" com o botão de remover GENÉRICO da 6D.3
  (`data-field-remove`, reaproveitado, nunca um botão novo) -- nunca
  escondidos silenciosamente, já que esconder um Field que ainda existe
  no estado deixaria a mensagem de validação incompreensível. Rodapé
  mostra a mensagem de `validateNativeMultipleChoiceStructure()` (✓
  completo, ou o erro específico).
- **`wireMultipleChoiceEditor(container, editorState, onChange)`** --
  reaproveita `wireFieldEditorList()` (6D.3) pra TODO conteúdo/idioma
  editável aqui dentro (nunca reimplementa), mais os 5 botões próprios
  (`data-mc-add-prompt`/`-add-answer`/`-add-distractor`/
  `-remove-distractor`/`-promote-distractor`). `onChange(kind)` distingue
  `'content'`/`'lang'` (nunca re-renderiza -- mesma disciplina da UX-fix
  5/6D.3, preserva foco durante digitação) de `'structure'` (add/remove/
  promote -- SEMPRE re-renderiza, porque o conjunto de linhas visíveis ou
  a mensagem de validação mudou).
- **`refreshMultipleChoiceEditorBox(boxEl, editorState, opts)`** --
  helper de integração, mesmo padrão de `refreshNativeFieldsBox` (6D.3).
- **`refreshNativeCardTypeBox(boxEl, editorState, opts)`** -- dispatcher
  único que os 2 editores chamam pra desenhar a caixa "Campos nativos":
  Múltipla Escolha → UI estruturada desta subfase; qualquer outro Card
  Type → o Field editor genérico da 6D.3 (`refreshNativeFieldsBox`), sem
  nenhuma mudança. Vive neste arquivo MC-específico (não em
  `flashcard-field-editor.js`) de propósito -- o Field editor genérico
  continua sem NENHUM conhecimento de Card Type (restrição 14), é este
  arquivo que sabe "pra multiple_choice, use a UI estruturada; pro resto,
  caia no genérico".

**Integração em `shared/admin-flashcards.js`/`shared/my-flashcards.js`**
(restrição 17, "integrar FR/ZH"): o listener de `change` do `<select>`
de Card Type (já existente desde a 6D.2) passou a, ao selecionar
`multiple_choice`, chamar `transitionToMultipleChoice()` em vez de só
atribuir o modo direto (qualquer OUTRA troca continua sendo a atribuição
simples de sempre -- `normal_reversed`/`type_answer`/`cloze` não
ganharam transição própria, fora do escopo, restrição 11), e a caixa
"Campos nativos" passou a ser desenhada por `refreshNativeCardTypeBox()`
em vez de `refreshNativeFieldsBox()` direto (2 call sites por arquivo:
o listener de `change` e o render inicial). `my-flashcards.js` continua
gated por `premium` (mesmo critério de sempre). **Trocar de Card Type
NUNCA apaga Fields** -- confirmado explicitamente no browser smoke (ver
abaixo): voltar de `multiple_choice` pra `normal` preserva os 3 Fields
já criados, só muda qual UI os mostra (o Field editor genérico da 6D.3
passa a listá-los, sem role nenhum sendo interpretado como frente/verso
por ele).

**Decisão explícita: sem UI pra reatribuir o role de `prompt`.** As
restrições descrevem só a troca `answer↔distractor` (via
`promoteDistractorToAnswer`) -- não há descrição de um caso de uso pra
"trocar qual Field é a pergunta" (só 1 pode existir, criado
explicitamente). Não inventei essa ação nesta subfase.

**Decisão explícita: `choices` legado continua 100% intocado.**
`shared/teacher-flashcards.js`/`shared/own-flashcards.js`
(`createFlashcard`/`createOwnFlashcard`, coluna `choices`) e o submit
handler de ambos os editores não foram tocados -- nenhuma linha nova é
gravada com `fields`/`card_generation_mode` por causa desta subfase
(confirmado no browser smoke: `createFlashcard`/`createOwnFlashcard`
continuam sendo chamados exatamente 1x por submit, só com as colunas
legadas de sempre). Abrir um cartão de múltipla escolha LEGADO pra editar
continua no caminho 100% legacy (`flashcardEditFormHTML`/
`myFlashcardEditFormHTML`, não tocados) -- sem auto-conversão, sem
destruir `choices`, exatamente como a restrição 10 exige.

**Testes realizados:**

- `node --check` sem erro em `shared/flashcard-mc-editor.js`,
  `shared/admin-flashcards.js`, `shared/my-flashcards.js`.
- **Suíte Node/vm nova `test_fase6d4a_mc_editor.js`, 91/91** -- os 11
  cenários de ESTRUTURA pedidos (1+1+1/1+1+2/1+1+3 válidos; 0 e 4
  distractors inválidos; 0 e 2 prompts inválidos; 0 e 2 answers
  inválidos; role desconhecido inválido; ids duplicados inválido -- mais
  3 extras: conteúdo vazio em prompt/answer/distractor invalida;
  pinyinFieldId quebrado invalida via reuso do motor; Card Type errado
  nunca "aprova" via esta validação); os 13 cenários de EDITOR (criar MC
  do zero; editar prompt/answer; adicionar/editar/remover distractor;
  preservar IDs através de várias operações; `promoteDistractorToAnswer`
  nos dois sentidos -- com e sem resposta prévia, preservando conteúdo/
  ids dos 2 Fields envolvidos, nunca criando CardInstance/isReverse/
  reviewDirection; mudar idioma sem afetar role/direção; preservar
  audio/image/pinyinFieldId através de edições de conteúdo;
  `transitionToMultipleChoice` a partir de `normal` fr -- reaproveita 2
  Fields deterministicamente, nunca inventa distractor, estrutura fica
  explicitamente incompleta; mesma transição em zh com 3 Fields --
  confirma que o Field de pinyin satélite fica "sobrando" sem role
  (testado isolando a checagem de cardinalidade da checagem de role,
  completando com 1 distractor válido antes de checar a mensagem
  específica); transição idempotente não sobrescreve role já definida;
  "múltipla escolha existente → edição" via
  `createNativeNoteEditorStateFromRow()` real -- reconstrói ids/lang/
  role/audio/image corretamente, `revision` não incrementa só por
  carregar; reset produz `normal`/`fields:[]`, nunca reaproveita id de
  sessão anterior); os 10 itens de ARQUITETURA (fields é a única fonte
  de verdade -- nenhum `choices[]`/`multipleChoiceOptions`/
  `correctChoice` no editorState; nenhum cardInstance/cardInstances;
  nenhum isReverse/reviewDirection/frontIsTargetLanguage; nenhum
  note.audio/note.image; busca por código, ignorando comentários,
  confirma zero chamada real a `buildEngineCardsFromRow(`/
  `interpretNoteFromRow(`/`supabaseClient`/`.insert(`/`.update(`/
  `.from(`/id-por-índice); mais os testes de REVISION (mudar prompt/
  adicionar distractor/remover distractor/alterar role via promote/
  alterar idioma -- todos detectáveis por `noteEditorStateChanged()`
  sem nenhum código novo, só por reaproveitar os mesmos primitivos da
  6D.3; clone idêntico não conta como mudança).
- **7 suítes anteriores re-executadas, 334/334 sem regressão** (esperado
  -- nenhuma toca `shared/flashcard-mc-editor.js`): `test_fase4_engine.js`
  32/32, `test_fase4d_regression.js` 30/30, `test_fase5_generation.js`
  33/33, `test_fase6b_native_notes.js` 74/74, `test_fase6d1_editor_
  state.js` 99/99, `test_fase6d2_state.js` 31/31,
  `test_fase6d3_field_editor.js` 65/65.
- **Browser smoke, FR+ZH, `test_fase6d4a_browser_smoke.js`, 62/62
  checks** -- selecionar Múltipla Escolha via o `<select>` real; editor
  de MC aparece no DOM (`[data-mc-editor]`); estrutura vazia mostra
  botões de criar prompt/answer e "Distratores (0/3)"; criar prompt via
  clique real -> aparece no state E no DOM; criar answer -> aparece;
  adicionar distractor -> aparece, "Distratores (1/3)"; editar conteúdo
  via `input` real reflete no state, o input editado continua sendo o
  MESMO nó do DOM (nunca recriado); mínimo/máximo respeitados -- 3
  distractors escondem o botão "+ Adicionar", remover 1 volta pra 2/3 e
  reexibe o botão, IDs dos distratores restantes permanecem estáveis;
  `promoteDistractorToAnswer` via clique real -- o distrator promovido
  vira answer, a resposta antiga vira distrator, sempre exatamente 1
  answer depois; editor legado ("Modo de prática", 3 radios) continua
  presente/intacto; **voltar pra `normal` troca a caixa pro Field editor
  genérico SEM apagar os 3 Fields já criados** (achado confirmado
  explicitamente: trocar de Card Type nunca destrói dado); submit legacy
  continua criando cartão exatamente como antes (`createFlashcard`
  chamado 1x, `nativeCardState` reseta pra `fields:[]`/`normal` só
  DEPOIS do submit, mesmo ciclo de vida de sempre); mesmo fluxo completo
  replicado em "Meus Cartões" (gated por premium); **Review continua
  funcionando** (cartão de trilha real renderizado sem erro, nos 2
  idiomas). **Zero erro de console novo** em nenhum dos dois idiomas
  (excluindo os `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de
  saída deste sandbox).
- **Busca final (14 categorias pedidas)** -- `choices`/
  `selectedCorrectChoice`/`multipleChoiceOptions`/`isReverse`/
  `reviewDirection`/`nextCardDirection`/`frontIsTargetLanguage`/
  `cardInstance`/`CardInstance`/`note.audio`/`note.image`/`.insert(`/
  `.update(`/`.from(`/id-por-índice-só: **ZERO ocorrências** em
  `shared/flashcard-mc-editor.js` inteiro (nem em comentário, confirmado
  removendo comentários antes de checar -- diferente da 6D.3, onde
  alguns desses termos apareciam em comentários explicando o que NÃO foi
  feito, aqui nem isso: o arquivo nunca precisou mencioná-los). Diff
  completo de `shared/admin-flashcards.js`/`shared/my-flashcards.js`
  inspecionado linha a linha -- só a troca de `refreshNativeFieldsBox`
  por `refreshNativeCardTypeBox` + a chamada a
  `transitionToMultipleChoice` no listener de `change`, nenhuma das 14
  categorias proibidas presente.

**O que ainda falta / não foi feito nesta subfase (de propósito,
restrição 22 -- escopo estrito):**
- Nenhuma UI de Type Answer -- 6D.4b.
- Nenhuma seleção visual de texto pra marcar Cloze -- 6D.5.
- Nenhuma persistência nativa (INSERT/UPDATE gravando `fields`/
  `card_generation_mode` de verdade) -- 6D.6.
- Nenhum Preview reaproveitando os renderers da Fase 6C -- 6D.7.
- Nenhuma conversão legacy→native ao abrir um cartão MC já existente pra
  editar -- 6D.8.
- Nenhuma UI pra reatribuir o role de `prompt` (só `answer↔distractor`
  via promote, ver decisão acima).
- Nenhuma migração de schema, nenhum passo manual pendente pra autora --
  100% client-side, confirmado por `git status` limpo antes/depois além
  dos arquivos já listados no escopo.

Próxima subfase (6D.4b -- Type Answer) só começa depois de autorização
explícita da autora, com este relatório já entregue antes de pedir luz
verde.

**Atualização: autorizada e entregue (2026-09-25), "FASE 6D.4b —
IMPLEMENTAÇÃO: EDITOR NATIVO DE TYPE ANSWER" -- instrução com 18 seções
numeradas de restrições/pedidos, todas cumpridas nesta entrega, ver
abaixo.**

## Fase 6D.4b -- editor nativo de Type Answer ("Digite a resposta")

**Achado arquitetural encontrado ANTES de codar, reportado aqui em vez de
resolvido em silêncio (Seção 11/17 da própria instrução exigiam isso)**:
a instrução pedia explicitamente `role:'prompt'`/`role:'answer'` pros 2
Fields de Type Answer, no mesmo espírito de Multiple Choice (6D.4a). Reli
o motor (`shared/flashcard-model.js`) ANTES de escrever qualquer linha e
confirmei que `type_answer` é gerado de forma **POSICIONAL**
(`interpretNativeNoteFromRow`, ramo `type_answer`:
`promptFieldIndex:slots[0], answerFieldIndex:slots[1]`, o MESMO mecanismo
de `contentFieldIndices`/slots que `normal` já usa) -- o motor NUNCA
consulta `field.role` pra decidir o CardInstance de Type Answer, decisão
já travada desde a Fase 6B ("só multiple_choice usa role, porque é o
único tipo com mais de 2 Fields semanticamente distintos -- posição
sozinha não bastaria pra desambiguar prompt/answer/1-3 distratores").
**Resolução, sem alterar o motor** (restrição 11 da instrução: "não
alterar o motor a menos que exista incompatibilidade objetiva e
inevitável" -- não havia): marcar os 2 Fields com `role:'prompt'`/
`role:'answer'` na camada de EDITOR é seguro e não-destrutivo -- o motor
continua gerando o CardInstance só por posição/índice, `role` aqui é só
metadado informativo pro EDITOR saber "qual Field já é a pergunta, qual
já é a resposta" entre re-renders (mesmo princípio "role é apenas
semântico; nunca determina direção" já travado na Fase 6B). Nenhuma
mudança em `shared/flashcard-model.js` -- confirmado por `git status`/
`git diff` no fim da entrega (só `shared/flashcard-typeanswer-editor.js`
novo + 2 arquivos de integração + 2 `<script>` tags).

**O que foi feito -- 1 arquivo novo, `shared/flashcard-typeanswer-editor.js`,
mesmo padrão arquitetural de `shared/flashcard-mc-editor.js` (6D.4a),
adaptado pras diferenças reais de Type Answer:**

- **`TYPE_ANSWER_ROLES = ['prompt', 'answer']`** -- só 2 roles, nunca
  distractors (Type Answer é estruturalmente idêntico a `normal`, 2 slots
  de conteúdo -- só muda como a aluna responde, digitando em vez de virar
  o cartão).
- **`validateNativeTypeAnswerStructure(editorState)`** -- reutiliza, sem
  duplicar, a validação estrutural do motor (`noteEditorStateToRow()` +
  `validateNativeNoteRow()`, o MESMO transform que a 6D.6 vai usar pra
  persistir, mesmo padrão de `validateNativeMultipleChoiceStructure`).
  Checagens A MAIS, de tempo de edição, que o motor não faz: (a)
  self-reference de `pinyinFieldId` (`f.pinyinFieldId === f.id`) -- o
  motor só confirma que o id referenciado EXISTE na Note, e o próprio id
  do Field também está nessa lista, então essa checagem é só nossa; (b)
  Fields satélite de pinyin (apontados por `pinyinFieldId` de outro
  Field) nunca contam como prompt/answer/campo sem papel -- são
  complemento de outro Field, não uma pergunta/resposta adicional; (c)
  exatamente 1 prompt, exatamente 1 answer entre os Fields NÃO-satélite;
  (d) conteúdo não-vazio nos dois.
- **`transitionToTypeAnswer(editorState)`** -- mesma disciplina
  determinística de `transitionToMultipleChoice`: reaproveita os
  primeiros 2 Fields SEM role (nunca sobrescreve um role já atribuído,
  nunca inventa conteúdo, nunca copia o mesmo texto pros dois lados só
  pra "tornar o estado válido"). Sem Fields suficientes, a estrutura fica
  EXPLICITAMENTE incompleta até o usuário adicionar via "+ Criar campo
  de pergunta"/"+ Criar campo de resposta" -- nunca preenchida
  automaticamente.
- **Sem UI de reatribuição de role** (restrição 4 -- "não invente uma
  nova UX complexa") -- diferente de MC (que tem `promoteDistractorToAnswer`
  porque existe um 3º papel, `distractor`, pra promover), Type Answer só
  tem 2 papéis, cada um criado uma vez só; nenhuma ação de "trocar quem é
  prompt/quem é answer" foi construída.
- **Suporte a Field satélite de pinyin (`pinyinFieldId`), restrição 5** --
  a Fase 6D.3 já tinha decidido não construir UI de ATRIBUIR pinyin ainda
  (só preservar o que já existir, reconstruído de uma linha nativa real
  via `createNativeNoteEditorStateFromRow`) -- esta subfase seguiu a
  MESMA decisão: o render mostra o Field satélite quando ele já existe no
  estado (numa seção própria "Pinyin (satélite de outro campo)",
  removível, nunca contado como 3º prompt/answer), mas não introduz
  nenhum botão novo de "associar pinyin" -- fora de escopo, mesmo
  critério já usado pela 6D.3. `resolveTypeAnswerCardView()` (motor, não
  tocado) já resolve `compareAnswerText` pro pinyin via o MESMO
  mecanismo hanzi/pinyin que Normal já usa (`pinyinFieldIndex`) -- não um
  canal de comparação próprio.
- **`renderTypeAnswerEditorHTML`/`wireTypeAnswerEditor`/
  `refreshTypeAnswerEditorBox`** -- mesmo padrão de MC: 2 seções
  ("Pergunta/Prompt"/"Resposta esperada"), cada Field renderizado via o
  MESMO `renderFieldEditorHTML()` da 6D.3 (nunca um editor textual
  paralelo), re-renderiza só em mudança 'structure' (criar prompt/
  answer -- nunca em edição de texto/idioma, mesma disciplina anti-UX-fix-5
  já usada em toda a feature).
- **`refreshNativeCardTypeBox()` estendido** com um 3º branch
  (`type_answer` → `refreshTypeAnswerEditorBox`) -- a função é
  REDEFINIDA neste arquivo (que carrega DEPOIS de
  `shared/flashcard-mc-editor.js`, mesma posição de `<script>`), mantendo
  o branch de `multiple_choice` intacto e o fallback pro Field editor
  genérico (normal/normal_reversed/cloze) sem nenhuma mudança.

**Integração nos 2 editores existentes** (`shared/admin-flashcards.js`/
`shared/my-flashcards.js`) -- só o `if/else` do listener de `change` do
`<select>` de Card Type ganhou um `else if (newMode === 'type_answer')
transitionToTypeAnswer(...)`, entre o `if` de `multiple_choice` (6D.4a) e
o `else` genérico (normal_reversed/cloze, sem transição própria ainda).
Nenhuma outra linha tocada nesses 2 arquivos. `fr/index.html`/
`zh/index.html` ganharam `<script src="../shared/flashcard-typeanswer-editor.js">`,
logo depois de `flashcard-mc-editor.js`.

**FR e ZH (restrição 13)**: um único arquivo compartilhado, sem nenhum
branch por idioma -- a estrutura de Type Answer (prompt/answer + pinyin
satélite opcional) não depende de idioma nenhum na camada de EDITOR; a
diferença real (zh compara contra pinyin, fr contra o próprio texto) já
é resolvida inteiramente pelo motor (`resolveTypeAnswerCardView`, não
tocado), consumindo o `pinyinFieldId` que o editor só precisa preservar
corretamente.

**Confirmação explícita (restrição 6): nenhum estado paralelo de
resposta** -- `editorState` nunca ganha `answer`/`expectedAnswer`/
`correctAnswer`/`typeAnswerAnswer`/`pinyinAnswer`/`choices` (testado
programaticamente, ver Testes abaixo); `editorState.fields` continua
sendo a única fonte de verdade, exatamente como MC.

**Legacy (restrição 8)**: nenhuma conversão automática -- abrir um
cartão legacy continua no caminho 100% legado de sempre
(`flashcardEditFormHTML`/`myFlashcardEditFormHTML`, não tocados por esta
subfase); selecionar Type Answer no seletor novo entra no fluxo nativo em
memória, mas o submit continua lendo só o radio "Modo de prática"
legado -- persistência nativa é a 6D.6, não tocada aqui.

**Testes Node/vm (`test_fase6d4b_typeanswer_editor.js`, novo, 62/62)** --
os 19 cenários pedidos na restrição 14, todos cobertos: (1) válido 1
prompt+1 answer; (2) prompt vazio rejeitado; (3) answer vazio (só
espaços) rejeitado; (4) 2 prompts rejeitados; (5) 2 answers rejeitados;
(6) role desconhecida (`distractor`) rejeitada pra type_answer; (7)
pinyinFieldId válido aceito; (8) pinyinFieldId inexistente rejeitado; (9)
pinyinFieldId auto-referenciado rejeitado; (10) Field satélite de pinyin
não conta como prompt/answer adicional (testado com os 2 papéis + 1
satélite = ainda válido, e confirmando que a mensagem de erro não cita
"sem papel definido" pro satélite); (11) IDs de prompt/answer estáveis
através de várias edições; (12) áudio no prompt e imagem no answer
sobrevivem à edição de conteúdo, sem vazar entre os 2 Fields; (13)
transição normal->type_answer não inventa conteúdo (3 sub-casos: reaproveita
os 2 Fields existentes com texto original intacto; com só 1 Field
disponível, vira só prompt e fica explicitamente inválido -- nunca
inventa um 2º; idempotente, não sobrescreve um Field já roleado
`distractor` de uma sessão MC anterior); (14) nenhuma propriedade
paralela de resposta criada no editorState; (15) `fields` continua a
única fonte de verdade (chaves do editorState conferidas uma a uma);
(16) estado legacy nunca convertido -- `createLegacyNoteEditorStateFromRow`
+ clone + descarte nunca mutam a linha original; (17)
`noteEditorStateToRow()` produz estrutura compatível com o pipeline
nativo, validado com **round-trip REAL através do motor**
(`buildEngineCardsFromRow`+`resolveCardContentView`, não só a validação
estrutural) -- confirma que a linha produzida pelo editor realmente vira
um CardInstance `type_answer` utilizável; (18) FR aceita Type Answer
baseado em texto puro (`compareAnswerText` cai no próprio texto, sem
pinyin); (19) ZH aceita Type Answer com `pinyinFieldId`
(`displayAnswerText` continua sendo o hanzi, `compareAnswerText` resolve
pro pinyin -- exatamente o que a aluna digita). Busca arquitetural
embutida no próprio arquivo de teste confirma ausência de todo padrão
proibido (`correctAnswer`/`expectedAnswer`/`typeAnswerAnswer`/
`pinyinAnswer`/`choices`/`multipleChoiceOptions`/`frontIsTargetLanguage`/
`reviewDirection`/`isReverse`/`nextCardDirection`/chamada direta a
CardInstance) no código executável de `shared/flashcard-typeanswer-editor.js`,
e ausência de qualquer chamada `supabaseClient`/`.insert(`/`.update(`/
`.from(` (zero I/O). **8 suítes anteriores re-executadas, 455/455 sem
regressão** (`test_fase4_engine.js` 32/32, `test_fase4d_regression.js`
30/30, `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js`
74/74, `test_fase6d1_editor_state.js` 99/99, `test_fase6d2_state.js`
31/31, `test_fase6d3_field_editor.js` 65/65, `test_fase6d4a_mc_editor.js`
91/91) -- total **517/517** incluindo esta subfase.

**Browser smoke, FR+ZH (`test_fase6d4b_browser_smoke.js`, novo, 76/76
checks)** -- os itens pedidos na restrição 15: abrir editor + selecionar
Type Answer via o `<select>` real; estrutura vazia mostra os 2 botões de
criar campo e é INVÁLIDA; criar prompt (aparece no DOM/state, ainda
inválida por falta de answer); criar answer (aparece, ainda inválida por
conteúdo vazio); editar prompt via `input` real (reflete no state, MESMO
nó do DOM -- nunca recriado por um re-render inteiro); editar answer via
`input` real (idem, estrutura fica VÁLIDA depois dos 2 preenchidos);
áudio anexado ao prompt e imagem anexada ao answer sobrevivem a uma nova
edição de conteúdo, sem vazar entre os 2 Fields; adicionar um Field
"solto" (via estado direto, simulando um satélite futuro) aparece como
"outro campo" removível, invalida a estrutura até ser removido/roleado, e
removê-lo restaura a validade sem afetar os ids de prompt/answer;
transição a partir de Normal reaproveita os MESMOS 2 Fields (ids
idênticos antes/depois, inclusive numa 2ª ida-e-volta Normal↔Type
Answer); Multiple Choice (6D.4a) continua funcionando sem quebra depois
de toda a interação com Type Answer, e o dispatcher roteia certo entre
os 2 (nunca os 2 editores no DOM ao mesmo tempo); editor legado ("Modo de
prática", 3 radios) continua presente; submit legacy (Admin Flashcards e
Meus Cartões) continua criando cartão exatamente como antes
(`createFlashcardCalls===1`/`createOwnFlashcardCalls===1`), mesmo depois
de toda a interação com o editor nativo, e `nativeCardState` reseta
corretamente pro padrão (`fields:[]`/`normal`) só depois do submit bem
sucedido; Review continua renderizando sem erro pra um cartão de trilha
real (`origin:'study'`). **Zero erro de console novo** em nenhum dos dois
idiomas (excluindo os `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do
proxy de saída deste sandbox, documentados em toda a sessão).

**Busca arquitetural final (restrição 16)** -- confirmada nos arquivos de
produção reais (não só no teste): `grep` em
`shared/flashcard-typeanswer-editor.js` por `correctAnswer`/
`expectedAnswer`/`typeAnswerAnswer`/`pinyinAnswer`/`choices\[`/
`multipleChoiceOptions`/`frontIsTargetLanguage`/`reviewDirection`/
`isReverse`/`nextCardDirection` -- zero ocorrência em código executável
(só 1 menção, dentro de um COMENTÁRIO explicando o que NÃO foi feito).
`git diff`/`git status` confirmam que só 5 arquivos foram tocados no
total (`shared/flashcard-typeanswer-editor.js` novo,
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, `fr/index.html`,
`zh/index.html`) -- nenhuma linha em `fr/app.js`, `zh/app.js`,
`shared/flashcard-model.js`, nenhum renderer da Fase 6C, `gradeCurrentCard`,
FSRS, ou qualquer arquivo de schema/migration. O diff dos 2 arquivos de
integração é mínimo (2-4 linhas cada, um `else if` a mais no listener de
`change` + comentário atualizado).

**O que ainda falta / não foi feito nesta subfase (de propósito,
restrição 17 -- escopo estrito):**
- Nenhuma persistência nativa (INSERT/UPDATE gravando `fields`/
  `card_generation_mode` de verdade) -- 6D.6.
- Nenhum Preview reaproveitando os renderers da Fase 6C -- 6D.7.
- Nenhuma conversão legacy→native ao abrir um cartão de Type Answer já
  existente pra editar -- 6D.8.
- Nenhuma UI pra reatribuir role de prompt/answer -- não descrita como
  necessária no grilling desta subfase (Type Answer só tem 2 papéis,
  cada um criado uma vez só, sem 3º papel pra "promover").
- Nenhuma migração de schema, nenhum passo manual pendente pra autora --
  100% client-side, confirmado por `git status` limpo antes/depois além
  dos 5 arquivos já listados no escopo.

Próxima subfase (6D.5 -- Cloze visual) só começa depois de autorização
explícita da autora, com este relatório já entregue antes de pedir luz
verde. **Não avançar automaticamente**, conforme instrução explícita
desta entrega.

**Atualização: autorizada e entregue (2026-09-25), "FASE 6D.5 --
IMPLEMENTAÇÃO: CLOZE VISUAL NATIVO" -- instrução com 26 seções numeradas
de restrições/pedidos, todas cumpridas nesta entrega, ver abaixo.**

## Fase 6D.5 -- editor visual nativo de Cloze (seleção de texto real,
múltiplas lacunas, sem persistência/Preview/Review tocados)

Última das 4 subfases de código da Fase 6D.4/6D.5 (Normal já era coberto
desde a 6D.1-6D.3; Multiple Choice na 6D.4a; Type Answer na 6D.4b; Cloze
aqui) -- com esta entrega, os 4 Card Types de `shared/flashcard-model.js`
(exceto `normal_reversed`, que reaproveita o mesmo Field editor genérico
de Normal, sem UI própria) têm um editor visual dedicado.

**Achado arquitetural, verificado ANTES de codar (não presumido)**: a
instrução (Seção 1) diz que Cloze usa "exatamente 1 Field de conteúdo
textual" -- mas `validateNativeNoteRow()` (motor, `shared/flashcard-
model.js`, ramo `else` que cobre normal/normal_reversed/type_answer/
cloze) já exige `contentFieldIndices(row.fields).length >= 2` pra
QUALQUER um desses 4 modos, cloze incluído -- confirmado por leitura
direta, não assumido. Resolvido interpretando "exatamente 1 Field de
conteúdo textual" como o Field que carrega a frase com as marcas
`{{cN::...}}` -- um 2º Field de conteúdo comum (a TRADUÇÃO, mostrada à
aluna depois de responder, `resolveClozeCardView().translationFieldIndex`)
é exigido ao lado dele, exatamente o mesmo par posicional que `normal` já
usa pro front/back. Nenhuma mudança no motor por causa disso (restrição
19, confirmado por `git status`/`git diff` no fim -- só
`shared/flashcard-cloze-editor.js` novo + 4 arquivos de integração
tocados).

**O que foi feito -- 1 arquivo novo, `shared/flashcard-cloze-editor.js`:**

- **Camada de "segmentos" pura, sem DOM** (`parseClozeSegments`/
  `serializeClozeSegments`/`coalesceClozeSegments`) -- ponte entre a
  string canônica do motor (`{{cN::resposta}}`/`{{cN::resposta|
  compareAnswer}}`, reaproveitando `CLOZE_MARK_RE`/`splitClozeMarkRaw` já
  existentes desde a Fase 4a/5, NUNCA duplicados -- confirmado por busca
  final que `parseClozeMarks` completo não foi reimplementado) e uma
  representação `[{kind:'text', text} | {kind:'mark', markId, answer,
  compareAnswer}]` fácil de desenhar/editar. `Field.content.value`
  continua sendo a ÚNICA fonte de verdade persistível -- segmentos só
  existem em memória enquanto o editor está aberto, sempre re-derivados/
  re-serializados a partir da string canônica (restrição 4/14).
- **`nextClozeMarkId(segments)`** -- sempre `max(existente)+1`, nunca
  reaproveita um "buraco" deixado por uma marca removida (restrição 5,
  decisão explícita porque a instrução deixava em aberto qual das 2
  leituras usar).
- **`insertClozeMarkAtLogicalOffsets(segments, start, end, compareAnswer)`**
  -- função pura que decide se um intervalo de OFFSETS LÓGICOS (posição
  no "texto visível", nunca offset na string canônica com sintaxe) pode
  virar uma lacuna nova. Regras determinísticas e conservadoras
  (restrição 8): seleção vazia -> bloqueia; só espaço em branco ->
  bloqueia; intersecta QUALQUER marca já existente -- parcial, contendo a
  marca inteira, ou dentro dela -- sempre bloqueia (aninhamento
  explicitamente fora do MVP, nunca um caso especial tratado diferente).
- **`domRangeToLogicalOffsets(containerEl, range)`** -- a função EXPLÍCITA
  de conversão DOM Selection/Range -> offsets lógicos pedida na restrição
  7: percorre os childNodes reais do container somando o comprimento
  visível de cada um (span atômico de marca conta como `answer.length`,
  nunca seu HTML) até achar o nó/offset alvo -- nunca assume que a
  seleção é um simples offset de string plana.
- **`renderClozeSegmentsHTML`/`domToClozeSegments`** -- o par simétrico
  de conversão segmentos<->DOM: marcas viram `<span contenteditable=
  "false" data-cloze-mark-id="cN">answer</span>` (técnica padrão de
  "token atômico" dentro de um container `contenteditable="true"` maior --
  mesmo padrão usado por editores tipo Notion/Gmail pra chips inline --
  o navegador trata o span como unidade indivisível pro cursor, nunca
  deixando o usuário digitar sintaxe bruta dentro dele, restrição 4). O
  texto VISÍVEL de uma marca é sempre `seg.answer`, nunca `{{cN::...}}`.
- **`updateClozeMarkText`/`updateClozeMarkCompareAnswer`/`removeClozeMark`**
  -- mutações pontuais numa marca já existente (restrição 6: editar texto
  dentro de uma lacuna, editar/limpar o pinyin, remover uma lacuna
  revertendo pro próprio texto -- nunca desaparece, só perde a marcação).
- **`stripClozeMarkupToPlainText`** -- usado só ao SAIR do modo cloze pra
  outro Card Type (restrição 12): reverte TODAS as marcas pro próprio
  texto (`answer`), reaproveitando o parser/serializer já existentes,
  nunca escreve sintaxe cloze presa num Field que outro Card Type vai ler
  como texto puro.
- **`validateNativeClozeStructure(editorState)`** -- reutilizável pela
  6D.6 (mesmo padrão de `validateNativeMultipleChoiceStructure`/
  `validateNativeTypeAnswerStructure`): converte o `editorState` pra
  shape de linha via `noteEditorStateToRow()` (Fase 6D.1) e passa direto
  pra `validateNativeNoteRow()` do motor -- nunca uma 2ª implementação da
  regra de `>=2` slots/pareamento/ids únicos. Checagens A MAIS, de tempo
  de edição, que o motor não faz: texto/tradução não-vazios, sintaxe sem
  chave solta (`hasMalformedClozeSyntax`, restrição 13), pelo menos 1
  marca, ids de marca únicos, toda marca com `answer` não-vazio, e --
  só quando `editorState.languageAppKey === 'mandarim'` -- toda marca com
  `compareAnswer` não-vazio (regra JÁ existente pro caso legado
  `cloze_answer_pinyin`, reaproveitada aqui por marca em vez de por
  cartão inteiro, restrição 9: nunca uma regra nova inventada).
- **`transitionToCloze(editorState)`** -- reaproveita os Fields JÁ
  EXISTENTES (o de texto vira o Field cloze, o outro vira tradução),
  nunca inventa conteúdo (restrição 11) -- funcionalmente idêntica ao
  ramo genérico que já tratava essa transição antes desta subfase, agora
  nomeada explicitamente.
- **`renderClozeEditorHTML`/`wireClozeEditor`/`refreshClozeEditorBox`** --
  3 seções: "Frase com lacunas" (toolbar "✂️ Marcar seleção como lacuna" +
  `.cloze-editor-text` contenteditable + painel inline de edição de marca
  quando uma está selecionada), "Tradução" (reaproveita
  `renderFieldEditorHTML()`/`wireFieldEditorList()` da Fase 6D.3, SEM
  nenhum editor textual paralelo), "Outros campos" (Fields sobrando de
  uma transição, ex: satélite de pinyin de outro modo -- removíveis via o
  mesmo botão genérico da 6D.3, nunca escondidos silenciosamente). Digitar
  texto normal (fora de uma marca) NUNCA re-renderiza -- só re-deriva os
  segmentos do DOM real e serializa de volta, mesma disciplina anti-
  "UX-fix 5" já usada em toda a feature, agora aplicada a um
  `contenteditable` em vez de `<input>`/`<textarea>`. Clicar "Marcar
  seleção como lacuna" lê `window.getSelection()`, converte via
  `domRangeToLogicalOffsets`, chama `insertClozeMarkAtLogicalOffsets`, e
  mostra mensagens de erro específicas por `reason` (nunca uma genérica)
  quando bloqueado.
- **`refreshNativeCardTypeBox()` REDEFINIDO com um 4º branch** (mesmo
  padrão de cascata das 2 subfases anteriores -- `flashcard-mc-editor.js`
  → `flashcard-typeanswer-editor.js` → aqui, cada arquivo redefine a
  função acrescentando seu próprio Card Type, preservando os anteriores):
  `cloze` → `refreshClozeEditorBox`; os outros 3 branches (multiple_choice/
  type_answer/fallback genérico) continuam intactos.

**Integração** (`shared/admin-flashcards.js`/`shared/my-flashcards.js`,
diff mínimo nos dois): o listener de `change` do `<select>` de Card Type
ganhou (a) checagem `wasCloze` ANTES de trocar de modo -- se estava em
`cloze` e o novo modo não é, chama `stripClozeMarksFromEditorState()`
primeiro (restrição 12, nunca sintaxe presa); (b) `else if (newMode ===
'cloze') transitionToCloze(...)`. `<script src="../shared/flashcard-
cloze-editor.js">` adicionado em `fr/index.html`/`zh/index.html`, logo
depois de `flashcard-typeanswer-editor.js` e antes de `teacher-
flashcards.js` -- mesma posição de carregamento das 2 subfases
anteriores. **`nativeCardState.languageAppKey` passou a ser preenchido**
(achado necessário pra `validateNativeClozeStructure` saber se exige
`compareAnswer`, nunca existia antes porque MC/TypeAnswer não dependiam
dele): em `admin-flashcards.js`, espelha o mesmo sinal `anyMandarim`
(booleano) já usado no resto da tela pra decidir pinyin -- nunca escolhe
um idioma "representante" arbitrário pra uma seleção mista de alunos,
só o booleano relevante -- setado no render inicial E dentro de
`updateFlashcardsSelectionDependentUI()` (mutação pura de estado, nunca
dispara re-render da caixa de Cloze); em `my-flashcards.js`, é sempre
`APP_KEY` direto (conta só tem 1 idioma relevante, o do site).

**CSS novo** (`.cloze-editor-text`/`.cloze-editor-mark`/`.cloze-editor-
mark-panel`/`.cloze-editor-mark-panel-actions`/`.cloze-editor-toolbar`,
fr+zh `index.html`, idêntico nos 2 arquivos) -- **zero cor nova**: reusa
`--jade`/rgba(58,115,89,0.12) (mesmo par já calibrado de `.mc-option.
correct`/`.cloze-blank.correct` da Fase 6C/8a) pra marca inline,
`--paper`/`--paper-warm`/`--paper-line`/`--ink`/`--seal-red` (todos já
existentes) pro resto -- confirmado por leitura antes de escrever
qualquer regra, mesma disciplina já travada no CLAUDE.md ("Tokens de cor
de marca vs. semânticos").

**Decisões arquiteturais desta subfase:**
1. `>=2` Fields de conteúdo pra Cloze (achado acima) -- decisão de
   interpretação, não de arquitetura nova: o motor já exigia isso desde a
   Fase 6B, esta subfase só constrói a UI que respeita a exigência já
   existente.
2. Painel de edição de marca é um mecanismo ÚNICO pra criar/editar
   pinyin E pra editar/remover uma marca já existente (clicar QUALQUER
   marca, nova ou antiga, abre o mesmo painel) -- simplificação
   deliberada em relação à leitura mais literal da instrução ("abre
   automaticamente" um campo de pinyin no momento de marcar), que teria
   exigido um popup modal bloqueante; a validação (`validateNativeClozeStructure`)
   já sinaliza claramente quando falta pinyin, direcionando o usuário a
   clicar na marca.
3. `CLOZE_EDITOR_ACTIVE_MARK_ID` (estado efêmero de "qual marca está
   sendo editada agora") é uma variável de MÓDULO, não `STATE.review*`
   nem CardInstance -- mesmo princípio já travado na auditoria da Fase
   6C pro `localState`/Preview futuro: nunca usar armazenamento do Review
   pra estado de editor. Reseta sozinho quando a marca ativa deixa de
   existir nos segmentos atuais (ex: removida por Backspace direto no
   contenteditable).
4. Cloze nunca ganhou UI de reatribuir/mover uma marca de lugar -- só
   criar (via seleção), editar texto/pinyin, remover. Mover seria
   equivalente a remover+recriar, sem perda de expressividade real.

**Gratuito x Premium**: nenhuma mudança de conceito -- é extensão de UI
sobre um Card Type que já existia no motor desde a Fase 4a/6B, mesmo gate
`premium` que o resto do editor nativo já usa em "Meus Cartões" desde a
"reformulação gratuito x premium".

**Testes realizados:**
- `node --check shared/flashcard-cloze-editor.js` sem erro.
- **Suíte Node nova `test_fase6d5_cloze_editor.js`, 71/71** -- os 20
  cenários pedidos explicitamente (Seção 22): normal→cloze preserva
  conteúdo (ids estáveis); 1ª/2ª seleção geram c1/c2 com ids
  determinísticos (`max+1`, nunca reaproveita); texto normal fora das
  lacunas preservado; edição do texto ao redor preserva marca já
  existente; remover 1 marca não corrompe as outras (reverte pro próprio
  texto); seleção vazia bloqueada; seleção só espaço em branco bloqueada;
  seleção parcialmente sobreposta a marca existente bloqueada; seleção
  aninhada (contida OU englobando uma marca) bloqueada nos 2 sentidos;
  sintaxe malformada (`{{` sem fechar) rejeitada pela validação;
  `{{c1::汉字|pinyin}}` preservado, hanzi/pinyin separados corretamente,
  round-trip de serialização idêntico; compareAnswer vazio OK em fr,
  exigido em zh (regra já existente, não nova); nenhuma estrutura
  paralela (`cloze_sentence`/`cloze_answer`/`clozeAnswers[]`/
  `clozeSelections[]`) criada no editorState; Field ID estável através de
  2 marcações seguidas; mídia (áudio) do Field sobrevive a marcar uma
  lacuna; legacy nunca convertido (clone+mutação nunca afeta o original);
  **round-trip REAL através do motor** (`noteEditorStateToRow`+
  `buildEngineCardsFromRow`+`resolveCardContentView`, não só validação
  estrutural) confirmando 2 CardInstances com ids `t900-c1`/`t900-c2`,
  FSRS genuinamente independente (mutar um nunca vaza pro outro), e o
  mesmo round-trip repetido pro caso zh com compareAnswer; FR+ZH
  carregando no MESMO sandbox sem conflito de scripts (confirma que
  `refreshNativeCardTypeBox` foi redefinido em cascata sem
  `SyntaxError`); múltiplas lacunas cobertas com profundidade (3 marcas
  na mesma frase, edição/remoção de uma sem afetar as outras 2). Busca
  arquitetural embutida no próprio arquivo de teste confirma zero padrão
  proibido em código executável do arquivo de produção.
- **4 suítes anteriores + 4 subfases da 6D re-executadas, 517/517 sem
  regressão** (esperado -- nenhuma toca o arquivo novo):
  `test_fase4_engine.js` 32/32, `test_fase4d_regression.js` 30/30,
  `test_fase5_generation.js` 33/33, `test_fase6b_native_notes.js` 74/74,
  `test_fase6d1_editor_state.js` 99/99, `test_fase6d2_state.js` 31/31,
  `test_fase6d3_field_editor.js` 65/65, `test_fase6d4a_mc_editor.js`
  91/91, `test_fase6d4b_typeanswer_editor.js` 62/62.
- **Browser smoke, FR+ZH, `test_fase6d5_browser_smoke.js`, 84/84
  checks** -- os itens da Seção 23 cobertos com SELEÇÃO DE TEXTO REAL
  (`window.getSelection()`/`Range`, nunca campo de índice nem digitação
  de sintaxe): abrir editor + selecionar Cloze via o `<select>` real;
  estrutura vazia mostra botão de criar frase; criar frase + digitar via
  `input` real no `contenteditable` (mesmo nó do DOM nunca recriado);
  **seleção real do 1º trecho + clique em "Marcar seleção como lacuna"**
  cria `{{c1::Je}}`/`{{c1::我}}` de verdade no `Field.content.value`
  (conteúdo SERIALIZADO confirmado, não só aparência do DOM), texto
  visível da marca no DOM é sempre `answer`, nunca a sintaxe bruta;
  criar tradução (Field genérico da 6D.3); **2ª seleção real** cria
  `{{c2::suis}}`/`{{c2::是}}` sem apagar `c1`; estrutura em zh
  corretamente INVÁLIDA sem pinyin nas 2 marcas, válida em fr sem
  pinyin nenhum; clicar numa marca abre o painel inline, em zh o campo
  de pinyin salva de verdade DENTRO da sintaxe (`{{c1::我|wǒ}}`),
  estrutura fica totalmente válida depois das 2 marcas terem pinyin;
  **seleção vazia mostra erro, sem gravar nada**; **seleção parcialmente
  sobreposta a uma marca existente (span atômico) mostra erro,
  contagem de marcas inalterada**; remover 1 marca reverte pro próprio
  texto preservando a outra marca intacta; **transição Cloze→Normal
  remove TODA a sintaxe `{{cN::...}}`** (confirmado via regex sobre o
  `Field.content.value` real) preservando o texto plano e os 2 Fields;
  Multiple Choice e Type Answer (6D.4a/6D.4b) continuam funcionando
  depois de toda a interação com Cloze, inclusive voltando pra Cloze de
  novo; editor legado ("Modo de prática", 3 radios) continua presente;
  submit legacy (Admin Flashcards e Meus Cartões) continua criando
  cartão exatamente como antes, `nativeCardState` reseta corretamente
  pro padrão depois do submit; Review continua renderizando sem erro pra
  um cartão de trilha real. **Zero erro de console novo** em nenhum dos
  dois idiomas (excluindo os `ERR_TUNNEL_CONNECTION_FAILED` pré-
  existentes do proxy de saída deste sandbox, documentados em toda a
  sessão). Achado técnico durante a escrita do teste, não do produto:
  pra validar corretamente a exigência de pinyin em zh, a seleção de
  aluno (que alimenta `nativeCardState.languageAppKey`) precisa
  acontecer ANTES de interagir com o editor de Cloze -- comportamento
  correto e esperado (o sinal só existe depois de um aluno selecionado),
  só um ajuste na ORDEM do script de teste, não um bug.
- **Validação visual dos 4 cenários obrigatórios** (CLAUDE.md, "Tokens de
  cor de marca vs. semânticos") -- screenshot Playwright de
  `.cloze-editor-mark`/`.cloze-editor-mark-panel` em fr-claro,
  fr-escuro, zh-claro, zh-escuro, com uma marca já criada e o painel de
  edição aberto: texto/bordas legíveis nos 4 cenários, nenhum problema
  de contraste -- esperado, zero cor nova introduzida (só tokens já
  calibrados por `.mc-option.correct`/`.cloze-blank.correct` desde a
  Fase 6C/8a).

**Busca arquitetural final** (Seção 24): confirmado por `grep`
programático (removendo comentários antes de checar, mesmo rigor das
subfases anteriores) que `shared/flashcard-cloze-editor.js` NUNCA contém,
em código executável: `cloze_sentence`/`cloze_answer`/
`cloze_answer_pinyin` (colunas legadas), `clozeAnswers`/`clozeSelections`
(estrutura paralela hipotética que a instrução proibia), `frontIsTargetLanguage`/
`reviewDirection`/`isReverse`/`nextCardDirection` (mecanismo de direção
da trilha/legado, nunca relevante pra Cloze), `STATE.review*` (estado de
sessão do Review), ou uma reimplementação de `parseClozeMarks`/
`renderClozeText` (usa só `CLOZE_MARK_RE`/`splitClozeMarkRaw`, os
primitivos mais baixos do motor). A sintaxe `{{cN::...}}` do motor está
presente E ESPERADA (só em `serializeClozeSegments`, o único ponto que
produz a string canônica). `git status`/`git diff` confirmam que só 5
arquivos foram tocados no total (`shared/flashcard-cloze-editor.js`
novo, `shared/admin-flashcards.js`, `shared/my-flashcards.js`,
`fr/index.html`, `zh/index.html`) -- nenhuma linha em `fr/app.js`,
`zh/app.js`, `shared/flashcard-model.js`, nenhum renderer da Fase 6C,
`gradeCurrentCard`, FSRS, ou qualquer arquivo de schema/migration.

**Confirmações pedidas explicitamente na Seção 26:**
- Arquivos alterados: listados acima (1 novo + 4 tocados).
- Arquitetura visual: seleção real (Selection/Range API) sobre um
  `contenteditable`, marcas viram spans atômicos inline, clique numa
  marca abre painel de edição -- nada de campos de índice/digitação de
  sintaxe/modal obrigatório.
- Como a seleção DOM vira conteúdo serializado: `domRangeToLogicalOffsets`
  (DOM Range → offsets no "texto visível") → `insertClozeMarkAtLogicalOffsets`
  (pura, decide se é válido e onde cortar os segmentos) →
  `serializeClozeSegments` (segmentos → string canônica `{{cN::...}}`) →
  gravado em `Field.content.value` via `updateFieldInEditorState`.
- Múltiplos clozes: cada `{{cN::...}}` distinto na mesma frase já vira 1
  CardInstance própria no motor (Fase 5, reaproveitado sem mudança) --
  esta subfase só constrói a UI que permite criar/editar/remover cada
  marca independentemente, com ids `c1`/`c2`/... sempre determinísticos.
- Chinês/pinyin/compareAnswer: nunca um Field separado -- vive dentro da
  própria marcação (`|compareAnswer`), editável só através do painel
  inline da marca correspondente; `pinyinFieldId` (mecanismo de Fields
  satélite doutros Card Types) nunca é usado/confundido aqui.
- Sintaxe interna nunca exposta ao usuário: confirmado no browser smoke
  -- o texto visível de uma marca é sempre `seg.answer`.
- `fields` continua a única fonte de verdade: confirmado pelo teste
  arquitetural (nenhuma propriedade paralela no `editorState`).
- Testes Node/VM: 71/71 novos + 517/517 das subfases anteriores, 0
  falhas.
- Browser smoke FR+ZH: 84/84 checks.
- Pageerrors/console errors: zero novos em ambos os idiomas.
- Busca arquitetural final: limpa, listada acima.

**O que ainda falta / não foi feito nesta subfase (de propósito,
restrição 17/25 -- escopo estrito):**
- Nenhuma persistência nativa (INSERT/UPDATE gravando `fields`/
  `card_generation_mode` de verdade) -- 6D.6.
- Nenhum Preview reaproveitando os renderers da Fase 6C -- 6D.7.
- Nenhuma conversão legacy→native ao abrir um cartão Cloze já existente
  pra editar -- 6D.8.
- Nenhum rich text/toolbar geral (bold/italic/underline/color/highlight)
  -- fora do escopo desde a auditoria da Fase 6D (seção 7), nunca parte
  desta subfase.
- Nenhuma migração de schema, nenhum passo manual pendente pra autora --
  100% client-side, confirmado por `git status` limpo antes/depois além
  dos 5 arquivos já listados no escopo.

Com Cloze entregue, os 4 Card Types que já têm dado real (normal/
multiple_choice/type_answer/cloze -- `normal_reversed` reaproveita o
editor de Normal, sem UI própria) têm um editor visual dedicado dentro
do estado nativo -- ainda sem persistência (6D.6), sem Preview (6D.7), e
sem conversão de cartão legado (6D.8), todas explicitamente fora do
escopo desta subfase.

Próxima subfase (6D.6 -- persistência nativa) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde. **Não avançar automaticamente.**

## Fase 6D.6 -- persistência nativa do editor (Editor State -> validação
-> Supabase, 1 rota só, legado nunca migrado sozinho)

Última peça que faltava pro editor nativo (Fases 6D.1-6D.5) deixar de ser
"pré-visualização" e passar a gravar de verdade em `fields`/
`card_generation_mode`. Instrução com 29 seções numeradas, regra central
repetida em várias delas: **"legacy aberto != automaticamente migrado"**
-- abrir/salvar um cartão legado sem tocar no editor novo nunca grava
`fields`/`card_generation_mode`; conversão só acontece quando a
professora/aluna explicitamente usa o editor nativo (seleciona um Card
Type e preenche Campos nativos, ou clica "Usar o novo editor de campos"
num cartão já existente) e confirma salvando.

**Arquivos alterados** (confirmado por `git status`/`git diff --stat`,
nenhum arquivo fora desta lista foi tocado): `shared/flashcard-native-
persistence.js` (novo), `shared/teacher-flashcards.js`,
`shared/own-flashcards.js`, `shared/admin-flashcards.js`,
`shared/my-flashcards.js`, `fr/index.html`+`zh/index.html` (só a tag
`<script>` do arquivo novo, posicionada depois de `flashcard-cloze-
editor.js` e antes de `teacher-flashcards.js`). Nenhuma migração SQL
nesta subfase -- as colunas/constraints já existiam desde a migration
045 (Fase 6B), aplicada numa sessão anterior.

**A rota única, ponta a ponta**: `ADMIN_FLASHCARDS_STATE.nativeCardState`/
`MY_FLASHCARDS_STATE.nativeCardState` (o mesmo Editor State que 6D.2-6D.5
já mutavam em memória) -> `validateNoteEditorStateForSave(editorState)`
(novo, `shared/flashcard-native-persistence.js` -- dispatcher único que
NUNCA reimplementa validação, só decide qual validador de Card Type já
existente chamar: `validateNativeMultipleChoiceStructure`/
`validateNativeTypeAnswerStructure`/`validateNativeClozeStructure`
-- Fases 6D.4a/6D.4b/6D.5 -- ou, pra `normal`/`normal_reversed` -- que
nunca tiveram validador próprio, só editavam Fields soltos sem exigir
conteúdo --, `validateNativeNoteRow()` do motor + uma checagem de
conteúdo não-vazio nos 2 slots, escrita nesta subfase) -> se `ok`,
`nativeContentColumnsFromEditorState(editorState)` (novo, mesmo arquivo
-- monta as colunas nativas a partir de `noteEditorStateToRow()`, o MESMO
transform já existente desde a 6D.1, nunca duplicado) -> `createFlashcard()`/
`updateFlashcardContent()` (`shared/teacher-flashcards.js`) ou
`createOwnFlashcard()`/`updateOwnFlashcardContent()`
(`shared/own-flashcards.js`), cada uma agora aceitando um parâmetro
opcional `nativeState` -- quando presente, é a ÚNICA fonte de conteúdo do
INSERT/UPDATE (os parâmetros legados do mesmo call são ignorados por
completo, nunca misturados como 2ª fonte de verdade); quando ausente
(toda chamada já existente antes desta fase), o comportamento é BYTE A
BYTE idêntico a antes.

**Legado permanece intacto**: nenhuma mudança em `_validateFlashcardContent`/
`_validateOwnFlashcardContent` nem no corpo do ramo `else` (sem
`nativeState`) de nenhuma das 4 funções -- confirmado por diff, o código
legado só ganhou uma checagem `if (nativeState){ ...; return; }` NO TOPO
da função, antes de qualquer lógica antiga. O formulário de criação
("Modo de prática"/Frente/Verso) e o formulário de edição legado
(`flashcardEditFormHTML`/`myFlashcardEditFormHTML`) continuam 100%
funcionais sem nenhuma alteração de comportamento. O gatilho de "isto
deve salvar nativo" é só `nativeCardState.fields.length > 0` (a
professora/aluna precisa ter adicionado pelo menos 1 campo em "Campos
nativos") -- com 0 campos (o estado inicial de toda tela), o submit cai
no caminho legado de sempre, sem `nativeCardState` sequer ser consultado
além dessa checagem de tamanho. O texto de apoio de "Card Type"/"Campos
nativos" (que dizia "não afeta o cartão criado ainda") foi atualizado pra
refletir a nova realidade -- única mudança de UI fora do fluxo de
salvar/editar em si.

**Legacy -> Native, só explícito**: um cartão que JÁ é nativo
(`fields`+`card_generation_mode` presentes) sempre edita no editor novo
(seedado via `createNativeNoteEditorStateFromRow(c)`, já existente desde
a 6D.1) -- não haveria pra onde mais editá-lo, já que `choices`/
`cloze_sentence` legados ficam `null` numa linha nativa. Um cartão LEGADO
continua abrindo no form legado de sempre; um botão novo, "🧪 Usar o
novo editor de campos (nativo)" (só aparece nesse caso -- em
`my-flashcards.js`, também só quando `premium`, mesmo gate do resto do
editor nativo nessa tela), constrói o editor nativo a partir do conteúdo
JÁ EXISTENTE via `nativeNoteEditorStateFromLegacyRow(row)` (novo) --
nunca uma tela em branco. Essa função replica a MESMA leitura de shape
que `interpretNoteFromRow()` (motor) já usa pro ramo legado (front/
back_trans simples -> Normal com Field de pinyin satélite se zh+
front_pinyin; `choices` -> Múltipla escolha com role; `cloze_sentence`+
`cloze_answer`(+pinyin) -> Cloze nativo, sintetizando `{{c1::resposta}}`
ou `{{c1::resposta|pinyin}}`) -- só que constrói um EDITOR STATE (pra
revisão antes de salvar), nunca grava nada sozinha. Clicar o botão é
navegação pura (sem chamada de rede); só o clique em "Salvar" do
formulário nativo resultante persiste de verdade.

**ID sempre preservado**: nem a conversão explícita nem uma edição comum
geram uma linha nova -- `updateFlashcardContent(id, ...)`/
`updateOwnFlashcardContent(id, ...)` sempre fazem `UPDATE ... WHERE id =
id` na MESMA linha (`id` vem de `c.id`, nunca recalculado). Confirmado
tanto nos testes Node (cenário 11 -- id antes/depois idêntico) quanto no
smoke de navegador (`afterConvert.id === legacyCardId`) quanto na
migration 045 (que só adicionou colunas, nunca uma tabela nova).

**Revision**: reaproveita `noteEditorStateRequiresNewRevision()` (Fase
6D.1, já existente, nunca uma 2ª implementação) pra decidir se uma EDIÇÃO
de um cartão JÁ nativo precisa incrementar -- compara o estado original
(`createNativeNoteEditorStateFromRow(c)`) contra o estado editado; só
incrementa se `fields`/`cardGenerationMode`/`privateNote`/`languageAppKey`
genuinamente mudaram (confirmado no smoke: editar sem tocar em nada e
clicar Salvar NÃO incrementa `revision`, não mostra o modal de reset,
nada é regravado). Uma conversão Legacy->Native SEMPRE incrementa
(estrutura muda de fato -- colunas soltas viram Note/Field -- mesmo
espírito de "editar sempre reseta progresso" já em vigor desde a Prop 4/
"7 propostas"). O modal de confirmação de reset (`openFlashcardResetConfirm`,
já existente) só é mostrado quando um reset vai de fato acontecer --
melhoria de honestidade em relação ao form legado (que sempre mostra,
porque sempre incrementa).

**FSRS/histórico preservados**: nenhuma linha desta subfase toca
`shared/fsrs.js` nem os campos `ef`/`interval`/`reps`/`due`/`lapses`/
`stability`/`difficulty`/`state`/`lastReview` -- persistência é só sobre
as colunas de CONTEÚDO (`fields`/`card_generation_mode`/`note`/`front`/
`back_trans`). O mecanismo de "reset via id novo" continua sendo
inteiramente `flashcardIdForRow(prefix, row)` (fr/zh app.js, não tocado)
-- `revision` incrementando é o que já fazia o merge-por-id de
`applySerializedState()` descartar o progresso antigo, sem nenhum código
de reset dedicado nesta subfase nem antes dela.

**Os 5 Card Types, o que é persistido pra cada um**:
- **normal**/**normal_reversed** -- `fields` (2 Fields posicionais) +
  `card_generation_mode`. `normal_reversed` persiste a MESMA Note de 2
  Fields que `normal` -- nunca duas linhas, nunca 4 Fields (confirmado no
  teste 2 do smoke: `fields.length === 2` depois de criar via UI). As 2
  CardInstances continuam 100% derivadas em runtime por
  `buildReversedCardInstancePair()` (motor, Fase 4a, não tocado).
- **multiple_choice** -- `fields` com `role` (`prompt`/`answer`/
  `distractor`) + `card_generation_mode`. `choices` legado gravado como
  `null` sempre que `nativeState` está presente -- nunca um 2º lugar onde
  a resposta certa/erradas poderiam divergir.
- **type_answer** -- `fields` (`role` prompt/answer) + `card_generation_mode`.
  `cloze_sentence` legado sempre `null`.
- **cloze** -- `fields` com a sintaxe `{{cN::resposta}}`/
  `{{cN::resposta|pinyin}}` embutida no Field de texto + `card_generation_mode`.
  `cloze_answer`/`cloze_sentence` legados sempre `null`. Múltiplas marcas
  na mesma frase continuam dentro do MESMO Field (nunca uma lista
  separada) -- confirmado no teste 21 do Node suite gerando 2
  CardInstances em runtime a partir de 1 única linha.

**Mirror legado write-only, só pra `front`/`back_trans`**: achado
importante desta subfase, não presumido -- `back_trans text not null`
NUNCA foi relaxado em nenhuma migration (diferente de `front`, relaxado
nas migrations 035/040) e esta subfase não altera schema (Seção 28). Um
INSERT nativo precisa de ALGUM valor ali. `deriveLegacyMirrorFromNoteEditorState()`
(novo) deriva `front`/`back_trans` a partir dos Fields (prompt/answer pra
MC, slots posicionais pros demais, `front:null` pra Cloze -- mesmo
convênio do Cloze legado) -- confirmado por leitura do motor ANTES de
escrever isto que `interpretNoteFromRow()` (`shared/flashcard-model.js`)
curto-circuita pro ramo nativo sempre que `fields` está presente e NUNCA
lê `front`/`back_trans`/`choices`/`cloze_sentence` nesse caso -- este
mirror é genuinamente write-only/decorativo pro motor (nunca uma 2ª fonte
de verdade de LEITURA), só mantém a lista "Cartões ativos"
(`flashcardCardRowHTML`) legível sem precisar reescrevê-la pra entender
`fields`/`role`/sintaxe cloze. `image_url`/`audio_url`/`front_pinyin`
nunca são mirrorados (ficam `null`) -- confirmado por leitura que
`interpretNativeNoteFromRow()` (ramo nativo) sempre grava `note.image:
null` e lê mídia só de `field.audio`/`field.image`, então essas 2 colunas
legadas não têm nenhum efeito funcional pro caminho nativo.

**CardInstances nunca persistidas**: confirmado por leitura de todo o
código novo (nenhuma referência a `cardInstance`/`buildEngineCardsFromRow`/
`interpretNoteFromRow` em `shared/flashcard-native-persistence.js`) e
pela busca final (ver Auditoria de duplicação abaixo) -- `normal_reversed`
continua gerando as 2 CardInstances em runtime via
`buildReversedCardInstancePair()`; Cloze multi-marca continua gerando N
CardInstances em runtime via `parseClozeMarks()`. Nenhuma linha extra é
gravada por CardInstance -- a Note é a unidade de persistência, sempre.

**Atomicidade (Seção 12)**: cada cenário de save é 1 ÚNICA chamada
`supabaseClient.from(table).insert(payload)`/`.update(patch).eq('id',
id)`, com `fields`+`card_generation_mode` sempre dentro do MESMO objeto
`payload`/`patch` -- nunca duas chamadas separadas. Isso já garante
atomicidade real (1 `INSERT`/`UPDATE` Postgres é sempre atômico por
natureza do protocolo, sem precisar de transação/RPC explícita) --
confirmado no teste Node #6 (`exatamente 1 chamada insert`) e no smoke de
navegador (nenhum estado intermediário "só fields, sem card_generation_mode"
observado em nenhum momento).

**Testes Node/VM** (`test_fase6d6_native_persistence.js`, novo, **85/85**
passando) -- cobre os 26 cenários pedidos, numerados 1-26 no arquivo:
Normal/Normal Reversed/MC/Type Answer/Cloze novos (payload correto,
1-5); atomicidade (6); Card Type inválido nunca persiste (7); Native Note
inválida nunca passa (8); legacy aberto sem mudança continua legado (9);
legacy salvo via caminho legado permanece legado (10); legacy
explicitamente convertido preserva ID (11); metadados preservados na
conversão -- `teacher_id`/`student_id`/`language_app_key`/`status`/
`created_at` intactos, pinyin preservado como Field satélite (12);
revision incrementa quando conteúdo muda (13) e NÃO incrementa quando não
muda (14); IDs de Field estáveis através de um insert+update (15);
`pinyinFieldId` válido após save, confirmado via ROUND-TRIP REAL pelo
motor (`buildEngineCardsFromRow`+`resolveNormalCardView`, não só
inspeção do payload) (16); MC/Type Answer/Cloze nunca geram
`choices`/`expectedAnswer`/`cloze_answer` paralelos (17-19); Normal
Reversed nunca gera `isReverse`/`reviewDirection`, CardInstances sempre
derivadas em runtime (20); múltiplos clozes num único Field, round-trip
real confirma 2 CardInstances a partir de 1 linha (21); mídia por Field
preservada no save (22); erro de rede preserva o editorState sem mutação
(23, via `snapshotNoteEditorState` antes/depois); FR e ZH compartilham o
MESMO formato nativo (24); Admin e Meus Cartões usam a MESMA serialização
(25); validação central bloqueia ANTES de qualquer chamada de rede (26).
**8 suítes anteriores (Fases 4-6D.5) re-executadas, 588/588 sem
regressão** -- total desta entrega + histórico: **673/673**.

**Testes de integração/DB** (Seção 24, contra o Supabase real do projeto
`eigjocalzwamisgqilhg`, via `mcp__Supabase__execute_sql`, mesmo padrão
transação+rollback já usado na validação ao vivo da migration 045):
snapshot antes (`teacher_flashcards: 5 linhas, hash afe805e5a3c3ec7fa05
645a6a2a6e607`); dentro de uma única transação -- INSERT nativo válido
(sucesso), UPDATE nativo válido na mesma linha (sucesso, `card_generation_mode`
trocado pra `cloze`), INSERT legado NULL/NULL (sucesso) -- `ROLLBACK`
no final, confirma que os 3 primeiros cenários passaram (uma violação de
constraint teria abortado a transação inteira antes de chegar no 3º);
3 transações separadas pros cenários de rejeição -- `fields` sem
`card_generation_mode` rejeitado por `teacher_flashcards_fields_paired`
(23514), `card_generation_mode` sem `fields` rejeitado pela MESMA
constraint, `card_generation_mode='nao_existe'` rejeitado por
`teacher_flashcards_card_generation_mode_check` -- as 3 confirmadas por
mensagem de erro real do Postgres. Snapshot depois: `teacher_flashcards:
5 linhas, MESMO hash` -- confirma que nenhuma linha de teste sobreviveu
(o `id` sequence avançou, comportamento esperado/inofensivo de
`GENERATED ALWAYS AS IDENTITY`, sequences não são transacionais).

**Browser smoke FR+ZH** (`test_fase6d6_browser_smoke.js`, novo, Playwright,
mesmo padrão de stub de `window.supabase.createClient()` de toda a
feature, agora com um fake `teacher_flashcards` em memória que simula
INSERT/UPDATE reais -- **82/82 checks passando nos 2 idiomas**): criação
nativa via clique real na UI pros 5 Card Types (Normal -- 2 campos
adicionados via "+ Adicionar campo"; Normal Reversed -- idem, confirma
`fields.length===2`; Múltipla escolha -- `data-mc-add-prompt/answer/
distractor`; Digite a resposta -- `data-ta-add-prompt/answer`; Cloze --
seleção de texto REAL via `Selection`/`Range` API + `data-cloze-mark-btn`
+ `data-cloze-add-translation`, com painel de pinyin real no zh via
`data-cloze-edit-compare`+`data-cloze-edit-save`); atomicidade (5 cartões
criados, `fields`/`card_generation_mode` sempre pareados); edição nativa
de um cartão Normal já criado (abre direto no editor novo, ids de Field
preservados, revision incrementa, modal de reset mostrado só quando
relevante); edição sem mudança NÃO incrementa revision; criação legada
(sem tocar em Campos nativos) grava `fields:null`; abrir e salvar um
cartão legado SEM clicar em "Usar o novo editor" continua legado (nunca
auto-converte); clicar "Usar o novo editor" preserva o conteúdo
digitado, salvar converte de verdade preservando `id`/`teacher_id`;
regressão -- um cartão nativo persistido (`normal_reversed` do teste 2)
passado pelo pipeline REAL (`buildCardFromTeacherFlashcard` ->
`STATE.cards` -> `renderReviewView()`) confirma 2 CardInstances com ids
distintos, sufixo `-b`, FSRS genuinamente independente, Review renderiza
sem erro, `buildSpeedOptions()`/`hasPlainFrontBack()` não quebram com um
cartão nativo. **Zero pageerror/console.error novo** em nenhum dos 2
idiomas (só os mesmos `ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do
proxy de saída deste sandbox, documentados em toda a sessão).

**3 achados de bug reais no PRÓPRIO SCRIPT DE TESTE, corrigidos antes de
reportar como passando** (nunca no código de produção, registrados por
transparência): (1) a seleção de alunos NÃO é limpa por um submit bem-
sucedido (comportamento intencional já existente desde antes desta fase
-- só o formulário de conteúdo/modo limpa, pra permitir criar vários
cartões seguidos pro mesmo aluno) -- o teste assumia erroneamente que
clicaria; corrigido trocando `page.click()` por `page.check()`
(idempotente) no helper de seleção; (2) o sinal certo de "o re-render
completo do submit terminou" não é o contador de seleção (nunca some) --
corrigido pra esperar `ADMIN_FLASHCARDS_STATE.nativeCardState.fields.length
=== 0` (só true depois que `renderAdminFlashcardsView()` de fato recria o
estado do zero); (3) os seletores de "adicionar tradução" no editor de
Cloze são `data-cloze-add-translation` (próprio do editor de Cloze,
Fase 6D.5), não `data-field-add` (genérico) -- confundidos na 1ª versão
do teste.

**Auditoria de duplicação** (Seção 27, via grep sobre os arquivos
tocados): `fields:` array nunca montado manualmente fora de
`shared/flashcard-native-persistence.js`; `card_generation_mode` nunca
atribuído como string literal em `admin-flashcards.js`/`my-flashcards.js`/
`teacher-flashcards.js`/`own-flashcards.js` (só aparece em comentários/
hint text); zero ocorrência de `correctChoice`/`expectedAnswer`/
`typeAnswerAnswer`/`pinyinAnswer`/`multipleChoiceOptions` no módulo novo;
`isReverse`/`reviewDirection`/`nextCardDirection` -- 1 única ocorrência
em todo o diff, dentro de um COMENTÁRIO pré-existente da Fase 6D.2
explicando o que NUNCA foi feito; `validateNoteEditorStateForSave()`
chamada exatamente 4 vezes (2 em cada arquivo de UI -- submit de criação
+ salvar edição nativa), nunca uma 2ª rota de validação. `git diff
--stat` confirma só os 6 arquivos + 1 novo, nenhum arquivo fora do
escopo desta subfase tocado.

**O que ainda falta / não foi feito nesta subfase (de propósito, Seção
28 -- escopo estrito):** nenhum Preview reaproveitando os renderers da
Fase 6C (6D.7); nenhuma migração em massa/automática de cartões legados
existentes -- só conversão pontual, explícita, 1 cartão por vez; nenhum
rich text/TTS/upload de mídia novo (o indicador textual de áudio/imagem
já vinculados continua só leitura, mesmo escopo da 6D.3); nenhuma
mudança em `getStudyQueue()`/`eligibleReviewPool()`/FSRS/renderers da
Fase 6C -- confirmado que persistência nativa não precisou tocar em
nenhum deles, mesma aposta arquitetural "um motor só" validada de novo;
`student_flashcards`/`teacher_flashcards` (as tabelas) não ganharam
nenhuma coluna nova -- migration 045 (Fase 6B) já bastava. Achado fora do
escopo, reportado sem corrigir: nenhum -- não foi encontrado nenhum
problema real fora do que a instrução já antecipava (o mirror write-only
de `front`/`back_trans`, necessário pela constraint NOT NULL de
`back_trans`, já discutido acima).

Escopo estrito respeitado -- nenhuma 6D.7/6D.8/rich text/migração em
massa iniciados. Parando aqui, aguardando revisão da autora antes de
continuar.

## Fase 6D.7 -- Preview nativo do editor (mesmo pipeline, mesmos 4
renderers da Fase 6C, zero persistência)

Última peça do editor nativo antes da conversão legacy->native (6D.8):
um botão "👁️ Pré-visualizar" que mostra exatamente como um cartão vai
aparecer na Revisão de verdade, sem gravar nada. Instrução com 25 seções
numeradas, regra central: **nunca duplicar renderer** -- proibido criar
`renderPreviewNormalCard`/`renderPreviewMultipleChoiceCard`/etc.; o
Preview precisa chamar os MESMOS `renderNormalCard`/`renderMultipleChoiceCard`/
`renderTypeAnswerCard`/`renderClozeCard` (fr/zh `app.js`, Fase 6C) que o
Review real usa.

**Arquivos alterados**: `shared/flashcard-preview.js` (novo),
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, `fr/app.js`,
`zh/app.js`, `fr/index.html`, `zh/index.html`. Nenhuma migração, nenhum
arquivo fora desta lista tocado (confirmado por `git status`).

**Achado que exigiu o único ajuste no motor de render (Fase 6C), feito
ANTES desta fase (sessão anterior) e concluído no início desta**: os 4
renderers liam `STATE.reviewIndex`/`STATE.reviewQueue.length` direto pra
desenhar a barra de progresso ("N / M") -- fora de uma sessão de Review
de verdade (o caso do Preview), isso valeria `0/undefined`/`NaN`.
Resolvido com a extração MÍNIMA necessária: `reviewProgressBarHTML(card)`
(novo, fr+zh `app.js`, mesma posição nos dois -- logo antes de
`renderMultipleChoiceCard`) -- quando `card.__isPreviewCard` é
verdadeiro, devolve um rótulo estático "👁️ Pré-visualização" em vez da
barra; quando ausente/falso (SEMPRE o caso pra cartão real de
`STATE.cards`), devolve exatamente o HTML de antes, byte a byte
idêntico -- confirmado nos 4 call sites (`renderNormalCard`/
`renderMultipleChoiceCard`/`renderTypeAnswerCard`/`renderClozeCard`) nos
2 idiomas. Nenhuma outra mudança nos 4 renderers -- eles continuam
recebendo `(mountEl, card, localState, callbacks)` exatamente como desde
a Fase 6C, sem saber (nem precisar saber) se estão em Review ou Preview.

**O pipeline, ponta a ponta**: `editorState` (rascunho não salvo do
formulário) OU `row` já persistida (nativa ou legada, vinda da lista
"Cartões ativos") -> `noteEditorStateToRow()`/row crua -> a MESMA
`buildEngineCardsFromRow()` que `buildCardFromTeacherFlashcard()`/
`buildCardFromSelfFlashcard()` (fr/zh `app.js`) já usam em produção,
sem nenhum atalho paralelo -> 1..N cards com `card.cardInstance` -> os 4
renderers globais da Fase 6C, via um dispatcher local
(`renderFlashcardPreviewCard()`) que espelha -- nunca duplica -- o mesmo
despacho por `cardTypeId` que `renderReviewView()` já faz.

**2 pontos de entrada**, cobrindo os 2 casos pedidos:
- **`openFlashcardPreviewFromEditorState(editorState, opts)`** -- a
  partir do RASCUNHO ATUAL do editor nativo (não salvo). Reaproveita a
  MESMA validação central da Fase 6D.6 (`validateNoteEditorStateForSave`)
  -- um estado inválido bloqueia o Preview com a MESMA mensagem que
  bloquearia o Salvar, nunca tenta renderizar um CardInstance
  incompleto. Ligado a 4 botões novos: "👁️ Pré-visualizar" no formulário
  de CRIAÇÃO (admin e Meus Cartões) e no formulário de EDIÇÃO nativa
  (`flashcardNativeEditFormHTML`/`myFlashcardNativeEditFormHTML`, admin
  e Meus Cartões) -- 4 no total.
- **`openFlashcardPreviewFromRow(row, opts)`** -- a partir de uma linha
  JÁ PERSISTIDA (nativa OU legada), usada pelo botão "👁"/"🔎" de cada
  linha em "Cartões ativos"/"Arquivados". Cobre o caso legado sem
  inventar um rastreador de estado ao vivo pro formulário legado (que
  hoje só lê valores no momento do submit) -- reflete a linha exatamente
  como está salva; `interpretNoteFromRow()` (chamado por dentro de
  `buildEngineCardsFromRow()`, motor intocado) já lida com os 2 formatos
  sem diferença nenhuma pro chamador, nunca converte pro modelo nativo
  silenciosamente.

**Estado local do Preview, estruturalmente separado do Review real**:
`FLASHCARD_PREVIEW_SESSION` (`{cards, index, localState}`), variável
módulo-local em `shared/flashcard-preview.js` -- NUNCA
`STATE.reviewQueue`/`STATE.reviewIndex`/`STATE.reviewCardState`/
`STATE.reviewShowingAnswer`/`STATE.reviewMCPicked`/
`STATE.reviewClozeAnswered`. `createFlashcardPreviewLocalState(card)`
reaproveita os MESMOS 4 shapes que `renderReviewView()` já cria pra
`STATE.reviewCardState` (Fases 6C.1-6C.3) -- nunca reinventados.
Navegação "Cartão N de M" (Normal com reverso -> 2 CardInstances, Cloze
multi-marca -> N) descarta o `localState` a cada troca de card -- mesmo
ciclo de vida de `STATE.reviewCardState` no Review real (card diferente
= estado novo).

**Callbacks são no-ops de persistência/FSRS de propósito**:
`callbacks.onAnswered`/`onReviewMore` passados aos 4 renderers só dão um
`showToast()` leve ("👁️ Pré-visualização -- nada foi salvo ou
avaliado.") -- nunca `gradeCurrentCard()`, nunca
`reviewMoreCurrentCard()`, nunca `saveState()`, nenhum efeito colateral
real. O renderer não sabe -- nem precisa saber -- se está em Review ou
Preview (mesma disciplina "um motor só" de toda a Fase 6).

**Fechar o Preview nunca toca no formulário**: `closeFlashcardPreview()`
só zera `FLASHCARD_PREVIEW_SESSION` -- `ADMIN_FLASHCARDS_STATE.
nativeCardState`/`MY_FLASHCARDS_STATE.nativeCardState` (Fields já
digitados, seleção de alunos, Card Type escolhido) continuam intactos.

**Modal singleton compartilhado** (`#flashcard-preview-modal`, fr+zh
`index.html`, mesmo padrão `.app-modal-overlay`/`.app-modal` de todo
modal do app, zero CSS novo) -- vive em `shared/flashcard-preview.js`
(não em `admin-flashcards.js` nem `my-flashcards.js`, já que é usado
pelos dois), com wiring de fechar por botão ✕ ou clique fora já ligado
no próprio arquivo (mesmo padrão de todo modal singleton já existente,
ex: `#flashcard-reset-confirm-modal`).

**Testes realizados:**
- **Suíte Node/VM `test_fase6d7_preview_logic.js`, 59/59** -- construção
  de cards via o motor real (Normal, Normal Reversed com FSRS
  independente, Múltipla Escolha, Cloze multi-marca, Type Answer zh com
  pinyin) a partir de `editorState`/`row`; isolamento (zero chamada de
  persistência/grade durante o Preview); auditoria arquitetural embutida
  (grep contra o próprio `shared/flashcard-preview.js` real, confirmando
  ausência de padrões proibidos); estado inválido/vazio bloqueado antes
  de qualquer render; `buildPreviewCardsFromRow` pra linha legada e
  nativa; shape de `createFlashcardPreviewLocalState` por tipo;
  navegação multi-card; preservação do `editorState` original
  (`snapshotNoteEditorState` antes/depois do Preview, idêntico).
- **`node --check`** sem erro em `shared/flashcard-preview.js`,
  `shared/admin-flashcards.js`, `shared/my-flashcards.js`, `fr/app.js`,
  `zh/app.js`.
- **Browser smoke, FR+ZH, `test_fase6d7_browser_smoke.js`, 31/31 checks
  em cada idioma** (Playwright, Chromium real) -- os 5 Card Types
  testados com interação real (clique/seleção/digitação real, nunca
  simulado por atribuição direta de estado): Normal (revelar não muda
  `due`, graduar via clique real, fechar preserva o `editorState`
  intacto); Múltipla Escolha (criação via clique real nos botões
  `data-mc-add-*`, seleção de opção aplica classe de feedback, botão
  Continuar aparece); Type Answer (input real, revelação após
  verificar); Cloze (seleção de texto REAL via `Selection`/`Range` API
  pra marcar a lacuna, revelação após verificar); Normal Reversed
  (navegação "Cartão 1 de 2"/"Cartão 2 de 2" via clique real no botão
  "Próximo", ids distintos, FSRS confirmadamente independente entre as 2
  metades); isolamento confirmado nos 3 eixos (zero chamada de
  persistência, zero `gradeCurrentCard`, zero `reviewMoreCurrentCard`
  disparadas por qualquer interação dentro do Preview); Preview por
  LINHA da lista (legado E nativo) confirmado funcionando nos 2 casos;
  Preview em "Meus Cartões" (aluna) confirmado com o mesmo isolamento;
  **regressão do Review real** -- um cartão de trilha genuíno
  (`origin:'study'`) colocado em `STATE.reviewQueue`/renderizado via
  `renderReviewView()` de verdade, clicado e graduado via clique real,
  com `STATE.cards[0].reps` confirmado incrementando de fato através de
  `gradeCurrentCard()` -- prova que a extração de `reviewProgressBarHTML()`
  não regrediu o caminho real. Zero `pageErrors` (exceções não
  capturadas) em qualquer um dos 2 idiomas -- os únicos `consoleErrors`
  restantes são os já documentados repetidamente nesta feature
  (`ERR_TUNNEL_CONNECTION_FAILED` do proxy de saída deste sandbox,
  `saveState: recusado...` -- guard defensivo esperado nesse cenário de
  teste que pula o boot normal de carregamento do progresso -- e um erro
  de notificação por limitação do mock de RPC, mesma categoria de
  `.is()`/`.upsert()` já registrada em toda a feature).
- **Teste negativo explícito de persistência**: `window.__calls.insert`
  (spy sobre `createFlashcard`/`createOwnFlashcard`/
  `updateFlashcardContent`/`updateOwnFlashcardContent`) confirmado
  `length === 0` depois de toda a interação com o Preview nos 3 pontos
  de entrada (formulário de criação, formulário de edição nativa, linha
  da lista) -- nenhuma chamada de gravação disparada só por abrir/usar o
  Preview.
- **Auditoria arquitetural** (grep contra os arquivos de produção reais,
  não só o teste): zero ocorrência de `gradeCurrentCard`/
  `reviewMoreCurrentCard`/`startReviewSession` em código executável de
  `shared/flashcard-preview.js` (só em comentários explicando o que
  NUNCA é feito); zero `STATE.reviewQueue`/`STATE.reviewIndex`/
  `STATE.reviewCardState` mutados por este arquivo; zero
  `supabaseClient`/`.insert(`/`.update(`/`.from(` -- nenhuma chamada de
  rede em lugar nenhum do módulo; `renderFlashcardPreviewChrome`/
  `renderFlashcardPreviewCard` são os únicos 2 nomes de função com
  prefixo `render*` no arquivo -- nenhum `renderPreview<CardType>Card`
  duplicando um dos 4 renderers da Fase 6C.

**Gratuito x Premium (avaliado, não implementado):** ferramenta de
visualização pura sobre conteúdo que a própria professora/aluna já
estava autorando -- sem custo marginal, sem nova superfície de produto.
Mesma conclusão de toda a Fase 6D.

**O que ainda falta / não foi feito nesta fase (de propósito, escopo
travado pela própria instrução -- Seção 24):**
- Nenhuma migração legada em massa/automática -- só Preview, que já lida
  com linha legada sem convertê-la.
- Nenhum redesenho geral do editor, rich text, upload novo, TTS
  gravado, cartões públicos, Card Type novo, template customizável,
  mudança de FSRS, ou refatoração ampla do Review.
- Combinar (jogo de pareamento) continua sem Preview -- nunca teve
  (mesma exclusão já registrada desde a Fase 8a: arquitetura
  incompatível com "1 pergunta, 1 resposta").
- Fase 6D.8 (conversão legacy->native ao editar um cartão legado)
  continua não iniciada.

Próxima subfase (6D.8) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde. **Não
avançar para 6D.8 automaticamente.**

## Fase 6D.8 -- Legacy → Native (edição/conversão explícita de cards
legados) -- FECHA A FASE 6D INTEIRA

Última subfase do prompt-mestre de reestruturação Note/CardType/
CardInstance. Instrução com 27 seções, regra central repetida em várias
delas: **não é migração em massa** -- nenhum UPDATE em lote, nenhum
script de backfill, nenhuma migration SQL convertendo conteúdo, nenhuma
conversão automática no load/login/save-legado. A conversão só acontece
via ação explícita do usuário no editor, um cartão de cada vez -- exatamente
o botão "🧪 Usar o novo editor de campos (nativo)" já introduzido (não
inventado agora) na Fase 6D.6.

**Arquivos alterados** (6 no total, confirmado por `git diff --stat` --
nenhuma migração, nenhum outro arquivo tocado): `shared/flashcard-native-
persistence.js` (+165/-9, o grosso do trabalho), `shared/admin-
flashcards.js` (+29/-6), `shared/my-flashcards.js` (+22/-6),
`shared/flashcard-field-editor.js` (+17, novo helper compartilhado),
`shared/flashcard-mc-editor.js` (+18/-4), `shared/flashcard-typeanswer-
editor.js` (+9/-2).

### O mapeamento Legacy → Native, por Card Type

`nativeNoteEditorStateFromLegacyRow(row)` (já existia desde a Fase 6D.6,
usada nesta fase pra corrigir 2 gaps reais -- ver "Achados" abaixo) é o
ÚNICO ponto de conversão, chamado só de dentro dos 2 handlers de clique
("Usar o novo editor", `admin-flashcards.js`/`my-flashcards.js`) --
nunca em nenhum outro call site (confirmado por grep: só 2 chamadas
reais no repositório inteiro, cada uma dentro do handler certo).

- **Normal** (fr/pt) -- 2 Fields posicionais (front/back, MESMA posição
  do banco -- `front` sempre índice 0). `front_is_target_language` é
  interpretado SÓ nesta função pra decidir o `lang` de cada Field
  (`'fr'`/`'pt-BR'`, usando `STUDY_LANG_FOR_APP_KEY` -- mesmo mapa que o
  motor legado já usa) -- **nunca persiste como propriedade do
  editorState nativo** (confirmado por teste: `JSON.stringify(editorState)`
  nunca contém `front_is_target_language`). Depois de convertido, a
  direção do cartão vem só de `lang`+posição de cada Field -- exatamente
  o mesmo mecanismo que um cartão nativo criado do zero (Fase 6D.2/6D.3)
  já usa.
- **Normal (zh)** -- mesmo par de 2 Fields, sempre `lang:'zh'`/`'pt-BR'`
  fixos (zh nunca inverte, decisão já travada desde a sessão "7
  propostas" -- sem `back_pinyin` pra completar uma inversão). Se
  `front_pinyin` existir, um 3º Field `zh-pinyin` é criado como satélite
  (`frontField.pinyinFieldId = pinyinField.id`) -- nunca conta como slot
  de conteúdo (`contentFieldIndices()`, motor, já pula satélites).
- **Normal com reverso** -- a Note convertida é SEMPRE Normal (2 Fields);
  o usuário escolhe "Normal com reverso" DEPOIS, trocando o Card Type
  dentro do editor nativo já aberto (mesmo mecanismo de sempre, Fase
  6D.2) -- `card_generation_mode='normal_reversed'` sobre os MESMOS 2
  Fields, nunca uma Note/linha nova, nunca `isReverse`/`reviewDirection`
  criados (confirmado: 0 ocorrências em código executável do arquivo,
  só em comentários explicando o que nunca foi feito).
- **Múltipla escolha** -- legado é INEQUÍVOCO sobre quem é a resposta
  certa (sempre `back_trans`, nunca `choices[]`) -- mapeamento 1:1 direto,
  nunca uma adivinhação: `front`→`role:'prompt'`, `back_trans`→
  `role:'answer'`, `choices[]`→até 3 `role:'distractor'`. `choices`
  nunca sobra como fonte nativa (sempre `null` no save, ver "Legacy
  columns" abaixo). ZH também preserva `front_pinyin` do prompt como
  satélite (achado durante esta fase -- o formulário legado sempre
  mostrava o campo Pinyin pra `isMandarim` independente do modo, inclusive
  MC, confirmado por leitura de `admin-flashcards.js` antes de presumir).
- **Digite a resposta** -- legado nunca representou este tipo. A
  conversão produz sempre Normal; o usuário troca pra "Digite a
  resposta" DENTRO do editor (mesmo mecanismo de `normal_reversed`
  acima) -- `transitionToTypeAnswer()` (já existente desde a 6D.4b)
  reaproveita os MESMOS 2-3 Fields, nunca inventa conteúdo novo. ZH
  preserva pinyin via `pinyinFieldId` (o MESMO mecanismo hanzi/pinyin de
  Normal, nunca um `answerPinyin` paralelo -- confirmado ausente por
  grep).
- **Cloze** -- `cloze_sentence`/`cloze_answer`/`cloze_answer_pinyin`
  NUNCA sobrevivem como fonte nativa. Convertido pra sintaxe embutida
  `{{c1::resposta}}` (fr) ou `{{c1::resposta|pinyin}}` (zh) dentro do
  ÚNICO Field de texto -- sempre `c1` só (legado nunca teve mais de 1
  lacuna, nunca inventamos uma 2ª). Depois de convertido, a EDIÇÃO usa o
  editor visual de Cloze de sempre (seleção de texto, Fase 6D.5) -- não
  existe mais sintaxe crua visível em lugar nenhum da UI.

### Achados reais encontrados e corrigidos durante esta fase (não
presumidos, descobertos escrevendo os testes)

**1. `front_is_target_language`/áudio/imagem nunca eram tratados antes
desta fase** -- a versão da função herdada da 6D.6 não interpretava
`front_is_target_language` (gravava `lang:null` sempre em fr, perdendo o
botão de pronúncia automática -- `isStudyLanguageField()` depende de
`lang` bater com o idioma estudado) e nunca preservava `audio_url`/
`image_url` em NENHUM Card Type. Corrigido com
`attachLegacyMediaToFields(fields, row, languageAppKey)` (novo) --
vincula áudio/imagem ao Field cujo `lang` é o idioma estudado, MESMA
heurística que `interpretNoteFromRow()` (motor, ramo legado) já usa pra
interpretar esse dado histórico (`isStudyLanguageField`), nunca uma
regra nova inventada.

**Ressalva sobre imagem, documentada e comunicada ao usuário, não
escondida**: o pipeline de LEITURA nativo (`resolveCardField()`) só
resolve imagem no nível da NOTE (`note.image`), nunca de `field.image` --
gap arquitetural já identificado na auditoria da Fase 6D (seção 6) e
explicitamente fora do escopo de 6D.8 (Seção 26 proíbe estender
renderers aqui). `field.image` É preenchido (a URL nunca é descartada --
fica visível no indicador textual do Field editor da Fase 6D.3, pronta
pra quando um projeto futuro estender o pipeline), mas a imagem NÃO
aparece de fato na Revisão depois da conversão até essa extensão
existir. Pra nunca deixar isso implícito: um toast não-bloqueante ("⚠️ A
imagem deste cartão foi preservada nos dados, mas ainda não aparece na
tela de Revisão pra cartões do novo editor.") aparece assim que a
conversão é feita, se o cartão tinha `image_url`. Áudio não tem essa
ressalva -- `resolveCardField()` já resolve `field.audio.url`
corretamente pro caminho nativo, confirmado por leitura do motor antes
de presumir.

**2. Cloze sem "___" era um bug de falha silenciosa, não só "conteúdo
incompleto"** -- `sentence.replace('___', marcação)` não faz NADA se
"___" não existir (comportamento padrão de `String.replace`), produzindo
um Field com a frase crua e ZERO marcas `{{cN::...}}` -- exatamente o
"Note nativo que parece válido mas está semanticamente errado" que a
Seção 18 proíbe. Resolvido com `legacyFlashcardConversionPreflight(row)`
(novo), chamado ANTES de `nativeNoteEditorStateFromLegacyRow()` nos 2
handlers de clique -- bloqueia a conversão inteira (sem trocar de tela)
com mensagem específica ("não tem nenhum / tem mais de um '___'") quando
a frase não tem exatamente 1 lacuna. MC sem resposta determinável
(`back_trans` vazio/só espaço) também bloqueado pelo mesmo preflight,
com mensagem própria.

**Distinção deliberada, registrada explicitamente**: o preflight NUNCA
bloqueia por conteúdo simplesmente INCOMPLETO (ex: Normal com
front/back vazios, Cloze zh sem pinyin ainda) -- isso é papel da
validação de SAVE já existente (`validateNoteEditorStateForSave()`,
6D.6), que mostra os campos já convertidos pro usuário completar antes
de salvar ("a UI pode apresentar os dados existentes pra correção
manual", texto literal da Seção 7). O preflight só bloqueia os 2 casos
em que o MAPEAMENTO em si é indeterminável (onde fica a lacuna? qual é a
resposta certa?) -- distinção testada explicitamente (item 23/24 da
suíte Node).

**3. `transitionToMultipleChoice()`/`transitionToTypeAnswer()` (Fases
6D.4a/6D.4b, pré-existentes) nunca excluíam um satélite de pinyin ao
escolher qual Field vira prompt/answer** -- bug latente desde a 6D.4a/
6D.4b, nunca triggado antes porque nenhum código anterior produzia um
estado com satélite de pinyin ANTES de trocar de Card Type. A conversão
desta fase é o primeiro código que faz exatamente isso (Normal zh com
`front_pinyin` → trocar pra Type Answer/Multiple Choice dentro do
editor) -- sem o fix, o Field de PINYIN virava `answer` por engano,
perdendo a tradução real (achado confirmado ao vivo no browser smoke,
não só hipotético). Corrigido com `fieldIsPinyinSatellite(field, fields)`
(novo, `shared/flashcard-field-editor.js`, reutilizado pelos 2
`transitionTo*` -- nunca duplicado) -- mesmo critério que
`contentFieldIndices()` (motor) já usa pra nunca tratar um satélite como
slot de conteúdo. `validateNativeMultipleChoiceStructure()` também
precisou da mesma exceção (sem ela, o satélite ficaria pra sempre
"Field sem papel definido", bloqueando o SAVE de um MC zh com pinyin
preservado -- o próprio caso que a Seção 7 desta fase pede pra suportar).
Este achado NÃO é fora do escopo de 6D.8 -- é uma correção necessária
pra que o próprio requisito desta fase (Seção 8, "ZH: preservar pinyin
existente... usando pinyinFieldId") funcione de fato através do fluxo
real de edição (converter → trocar Card Type → salvar), não só em teoria.

**Teste pré-existente da Fase 6D.4a corrigido em consequência** --
`test_fase6d4a_mc_editor.js` tinha um cenário que testava e ATESTAVA o
comportamento ANTIGO (buggy) como se fosse intencional ("hanzi vira
answer, pinyin vira prompt, tradução fica sobrando"). Reescrito pra
refletir o comportamento CORRETO (pinyin nunca vira prompt/answer,
hanzi vira prompt, tradução vira answer, estrutura fica válida com o
satélite presente) -- não foi enfraquecido, foi corrigido pra parar de
validar um bug.

### Preservação de ID/histórico/FSRS

- **ID nunca muda** -- `updateFlashcardContent(c.id, ...)`/
  `updateOwnFlashcardContent(c.id, ...)` (já existentes desde a 6D.6)
  sempre fazem `UPDATE ... WHERE id = c.id` -- confirmado ao vivo contra
  o Supabase real (ver "Testes de banco" abaixo): mesmo `id` antes e
  depois da conversão.
- **Nenhuma linha nova, nenhum CardInstance persistido** -- a Note é
  sempre a unidade de persistência; `normal_reversed`/Cloze multi-marca
  continuam gerando CardInstances só EM RUNTIME (`buildReversedCardInstancePair`/
  `parseClozeMarks`, motor, intocados) -- nunca uma 2ª linha no banco.
- **Revision segue a MESMA regra já travada desde a Fase 6D.6** -- uma
  conversão Legacy→Native SEMPRE incrementa `revision` (a estrutura
  muda de fato -- colunas soltas viram Note/Field -- mesmo espírito de
  "editar sempre reseta progresso" desde a Prop 4/"7 propostas"). Isso
  NÃO foi inventado nesta fase -- `wireFlashcardNativeEditForm`/
  `wireMyFlashcardNativeEditForm` (6D.6) já tinham essa regra
  (`wasNative ? condicional : sempre incrementa`); 6D.8 só a EXERCITA
  pela primeira vez através do caminho real de conversão. O reset de
  FSRS que resulta disso é o MESMO mecanismo de sempre
  (`flashcardIdForRow` gera um novo id sintético `-r{revision}` pro
  merge-por-id de `applySerializedState()` descartar sozinho) -- nunca
  um reset inventado de propósito nesta fase, nunca um campo FSRS tocado
  diretamente (confirmado: `reps`/`due`/`lapses`/`stability`/
  `difficulty`/`lastReview` não aparecem em nenhuma linha executável de
  `shared/flashcard-native-persistence.js`).
- **Metadados preservados** -- `teacher_id`/`student_id`/`owner_id`/
  `language_app_key`/`status`/`created_at`/`origin` nunca são tocados
  pela conversão (o payload de save só inclui as colunas de CONTEÚDO,
  nunca identidade/proveniência) -- confirmado ao vivo no teste de banco.

### Legacy columns após a conversão

Nenhuma coluna legada foi apagada nesta fase (sem migração nova). Depois
de uma conversão nativa: `fields`/`card_generation_mode` são a fonte de
verdade; `front`/`back_trans` recebem um mirror WRITE-ONLY mínimo (já
existente desde a 6D.6, só pra lista "Cartões ativos"/export Anki
continuarem legíveis sem reescrever esses 2 consumidores) --
`choices`/`cloze_sentence`/`cloze_answer`/`cloze_answer_pinyin`/
`front_pinyin` sempre gravados como `null` no save nativo (nunca ficam
com lixo de uma edição legada anterior). **Nenhuma sincronização
bidirecional** -- editar um Field nativo nunca reconstrói as 12 colunas
legadas por completo a cada edição; só o mirror mínimo já definido na
6D.6, reafirmado (não estendido) nesta fase.

### Reconhecimento de modelo (Seção 15)

`classifyFlashcardRowModel(row)` (novo) -- `'native'|'legacy'|'invalid'`,
único ponto de checagem, substitui o padrão implícito
`isNoteFieldsPresent(c) && isCardGenerationModePresent(c)` usado em 4
call sites (`admin-flashcards.js`×2, `my-flashcards.js`×2). O CHECK
constraint da migration 045 já torna `'invalid'` estruturalmente
impossível numa linha real vinda do Supabase (confirmado ao vivo, ver
"Testes de banco") -- esta função existe mesmo assim como ponto único,
auditável, de checagem defensiva no cliente, exatamente como a Seção 15
pede ("não aceitar um estado híbrido silencioso"), nunca reimplementando
`validateNativeNoteRow()` (motor).

### Cancelamento e fluxo em memória (Seções 16-17)

Confirmado (Node + browser smoke): clicar "Usar o novo editor" NUNCA
salva nada -- só monta `editingNativeState` em memória
(`ADMIN_FLASHCARDS_STATE.editingNativeState`/`MY_FLASHCARDS_STATE.
editingNativeState`). Editar os campos do rascunho e clicar "Cancelar"
descarta o rascunho inteiro -- a linha no banco fica byte-a-byte idêntica
a antes (confirmado via snapshot JSON antes/depois no browser smoke).
Fechar sem salvar (navegar pra outra tela) tem o mesmo efeito -- nenhum
handler de navegação chama `updateFlashcardContent`/
`updateOwnFlashcardContent`. Preview (Fase 6D.7, reaproveitado sem
mudança) também nunca salva -- confirmado com um teste dedicado
(contagem de linhas no banco antes/depois de abrir e usar o Preview
durante uma conversão em andamento, idêntica).

### Admin e Meus Cartões (Seção 19) -- mesma lógica compartilhada

Os 2 arquivos chamam exatamente as MESMAS funções de
`shared/flashcard-native-persistence.js` (`nativeNoteEditorStateFromLegacyRow`/
`legacyFlashcardConversionPreflight`/`classifyFlashcardRowModel`) -- zero
lógica de mapeamento duplicada ou divergente entre professora/aluna.
Única diferença de comportamento (não de LÓGICA de conversão): o toast
de aviso de imagem e o preflight são idênticos nos 2; o que difere é só
orquestração de UI já existente desde a 6D.6 (admin reconstrói a lista
inteira após converter, `my-flashcards` reaproveita `renderMyFlashcardsView()`
completo) -- mesma assimetria já documentada desde a 6D.6, não nova.

### Testes realizados

**Node/VM** -- `test_fase6d8_legacy_conversion.js` (novo), **92/92**,
cobrindo os 25 cenários da Seção 21 (Normal fr preserva conteúdo/id;
`front_is_target_language` decide só `lang`, nunca posição, nunca
persiste como mecanismo nativo; Normal Reversed via motor real com FSRS
independente confirmado; MC com resposta determinável -> prompt/answer/
distractors sem nunca usar `choices[]` como fonte; MC sem resposta
bloqueado no preflight com e sem espaços; Type Answer fr/zh com pinyin
via `pinyinFieldId`, sem `answerPinyin` paralelo; Cloze fr/zh ->
`{{c1::...}}`/`{{c1::...|pinyin}}` via round-trip real do motor
`resolveCardContentView`; Cloze sem "___" e com "___" duplicado
bloqueados com mensagens específicas; áudio/imagem vinculados ao Field
certo, nunca duplicados no lado errado, seguindo o IDIOMA não a posição;
Field IDs estáveis entre 2 conversões da mesma linha, sem mutação
cruzada; conversão nunca cria novo Card ID/CardInstance; FSRS nunca
aparece no editorState nativo; colunas legadas nunca mutadas pela
conversão em si -- função pura; cancelamento (documentado, testado de
verdade no browser smoke); conversão explícita confirmada via leitura de
código; abrir sem converter não altera `fields`/`card_generation_mode`;
cartão já nativo nunca passa pelo conversor legado -- usa
`createNativeNoteEditorStateFromRow`; estado híbrido sempre `'invalid'`,
nunca `'native'`; FR e ZH compartilham a mesma função; `nativeContentColumnsFromEditorState`
nunca reescreve `choices`/`cloze_sentence`/`cloze_answer`). **8 suítes
anteriores (Fases 4-6D.7) re-executadas, 642/642 sem regressão**
(incluindo o teste da 6D.4a corrigido, ver "Achados" acima) -- total
desta entrega + histórico: **734/734**.

**Testes de banco/integração** (transação+rollback, mesmo padrão da
6D.6, projeto `eigjocalzwamisgqilhg`, snapshot antes/depois idêntico
confirmado -- `teacher_flashcards: 5 linhas, hash afe805e5a3c3ec7fa05645a6a2a6e607`;
`own_flashcards: 7 linhas, hash 62f9c84cebecc3d6805163082c837b21`, ambos
IDÊNTICOS antes e depois de todos os 3 cenários): (1) **legacy untouched**
-- `select` puro numa linha real confirma `fields`/`card_generation_mode`
`null`, antes e depois de qualquer tentativa de conversão na mesma
sessão; (2) **conversão explícita** -- `UPDATE` simulando exatamente o
payload de `nativeContentColumnsFromEditorState()` numa linha real,
dentro de transação com `ROLLBACK`: `RETURNING` confirma MESMO `id`,
`fields`/`card_generation_mode` populados, `teacher_id`/`student_id`/
`language_app_key`/`status`/`created_at` preservados intactos, `revision`
incrementado de 0→1; (3) **conversão falha** -- tentativa de gravar
`fields` SEM `card_generation_mode` (estado híbrido) rejeitada de
verdade pelo Postgres (`23514`, `teacher_flashcards_fields_paired`),
confirmado que NENHUM UPDATE parcial ficou de pé (hash/contagem
idênticos ao original depois). Nenhum registro real de produção foi
alterado permanentemente.

**Browser smoke FR+ZH** -- 2 suítes: `test_fase6d6_browser_smoke.js`
(regressão, já existente, **82/82** -- confirma que o preflight/fix novo
não quebrou o fluxo de conversão Normal simples já validado na 6D.6) +
`test_fase6d8_browser_smoke.js` (novo, **66/66**, FR+ZH), cobrindo os
itens da Seção 23 que a regressão da 6D.6 ainda não exercitava: (A)
preflight bloqueia MC sem resposta, permanece no formulário legado, erro
visível; (B) preflight bloqueia Cloze sem "___", mensagem menciona
"___" especificamente; (C) conversão de MC com resposta determinável --
Card Type correto, prompt/distractors preservados, `id` preservado,
`choices` nulificado no save; (D) conversão pra Type Answer (trocando
Card Type dentro do editor já aberto) preserva prompt/answer, ZH
confirma pinyin preservado (prova ao vivo do fix do achado 3); (E)
conversão de Cloze -- marca visual renderiza mostrando a RESPOSTA (nunca
a sintaxe `{{`), ZH confirma `|pinyin` embutido corretamente,
`cloze_sentence` nulificado no save; (F) cancelar no meio da conversão
(editando um campo e clicando Cancelar) -- linha no banco byte-a-byte
idêntica à original; (G) mídia -- áudio e imagem confirmados vinculados
ao Field de idioma estudado (nunca ao lado errado), toast de aviso de
imagem confirmado aparecendo; (H) Preview durante uma conversão em
andamento -- modal abre, renderiza o cartão, ZERO chamada de save
disparada; (I) abrir legado sem clicar em converter -- `fields`/
`card_generation_mode` continuam `null`; (J) regressão -- um cartão MC
convertido nesta mesma sessão (passo C) entra em `STATE.cards` via o
pipeline real (`buildCardFromTeacherFlashcard`) e Review/Speed Review/
`hasPlainFrontBack` continuam funcionando sem erro. **Zero
pageerror/console error novo** em nenhum dos 2 idiomas (só os mesmos
`ERR_TUNNEL_CONNECTION_FAILED` pré-existentes do proxy de saída deste
sandbox, documentados em toda a sessão).

### Auditoria final (Seção 25)

Busca programática (grep, removendo comentários antes de checar, mesmo
rigor de toda a Fase 6D) confirma, nos 6 arquivos tocados: (1) conversão
NUNCA acontece sem ação explícita -- só 2 call sites reais de
`nativeNoteEditorStateFromLegacyRow()`, ambos dentro dos handlers de
clique dos botões "Usar o novo editor"; (2) nenhum novo ID criado --
`UPDATE ... WHERE id = c.id` sempre, confirmado também ao vivo no
Supabase; (3) nenhuma nova linha de CardInstance -- Note continua sendo
a única unidade persistida; (4) nenhum reset de FSRS inventado -- o
reset que ACONTECE é o mesmo mecanismo de merge-por-id já existente
desde antes da Fase 6, disparado pela regra de revision já travada na
6D.6, nunca um campo FSRS tocado direto; (5) nenhuma metadata legada
apagada -- zero coluna de identidade/proveniência tocada pelo payload de
conversão; (6) `choices`/`cloze_answer`/`cloze_sentence` NUNCA usados
como fonte nativa -- só lidos pra INTERPRETAR o legado, sempre gravados
`null` no save nativo; (7) `frontIsTargetLanguage` nunca vira mecanismo
nativo -- interpretado só durante a conversão, nunca persistido no
editorState; (8) `reviewDirection`/`isReverse` -- 0 ocorrências em
código executável; (9) nenhuma sincronização bidirecional -- só o
mirror write-only mínimo, já existente desde a 6D.6, não estendido.
Resultado confirmado: **Legacy → conversão explícita → Native → editor/
persistência nativa, sem nenhum caminho automático de volta.**

### Escopo respeitado (Seção 26) -- nada disto foi tocado

Migração em massa; SQL migration nova; cartões públicos; rich text; TTS
gravado; upload novo (o upload de mídia já existente desde a Fase 8a
continua intocado -- esta fase só PRESERVA URLs já existentes, nunca
implementa upload novo); templates customizados; novos Card Types (os 5
já existentes desde a Fase 6B são os únicos usados); redesign; mudanças
no FSRS; novas regras de Review.

**Achados fora do escopo, registrados sem correção automática** (Seção
26, "registrar, não corrigir, continuar se não bloquear"): nenhum
encontrado nesta fase além dos 3 já descritos acima em "Achados reais"
-- todos os 3 foram corrigidos porque bloqueavam diretamente um
requisito EXPLÍCITO desta própria fase (Seções 5/6/8/10/18), não por
iniciativa de ir além do escopo pedido.

### O que ainda falta / não foi feito nesta fase (de propósito)

- Imagem de cartão convertido não aparece na Revisão ainda (limitação
  conhecida, documentada, comunicada via toast -- ver "Achados" acima) --
  requer estender `resolveCardField()` pra ler `field.image`, fora do
  escopo de 6D.8.
- Nenhuma migração/backfill de cartões legados existentes -- todos os 5
  `teacher_flashcards`/7 `own_flashcards` reais continuam 100% legados
  até que a professora/aluna clique em "Usar o novo editor" em cada um,
  um de cada vez.
- Edição de conteúdo (não-estrutural) de um cartão já nativo continua
  com o mesmo escopo de sempre (front/back/opções/etc.) -- nada novo
  adicionado aqui.

**Com esta entrega, a Fase 6D inteira (6D.1 a 6D.8) está concluída** --
o editor nativo cobre os 5 Card Types de ponta a ponta: estado (6D.1),
seleção de tipo (6D.2), edição de Field (6D.3), Múltipla Escolha
(6D.4a), Digite a resposta (6D.4b), Cloze visual (6D.5), persistência
(6D.6), Preview (6D.7) e agora conversão explícita de cartão legado
(6D.8) -- sem nenhuma migração em massa, sem nenhum caminho automático
de conversão, sem nenhuma ponte/atalho temporário sobrevivendo (a ponte
legada da Fase 3 foi eliminada de vez na Fase 4d).

**Nenhuma fase posterior foi iniciada** -- não existe "6D.9" no
prompt-mestre original; qualquer trabalho além deste ponto (editor pra
`student_flashcards`, rich text, templates customizáveis, migração de
dado legado em massa, integração de imagem por Field na Revisão)
precisa de escopo e autorização explícitos numa sessão futura.

