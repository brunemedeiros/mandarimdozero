# Histórico: Reestruturação do editor do admin, 7 propostas, perfil público, gratuito x premium, roles

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Prompt-mestre "reestruturação do formulário de flashcards do admin" -- Fase 0 (auditoria) + Fase 1 (Modo de prática antes de Conteúdo, front deixa de ser obrigatório no cloze)

Prompt-mestre grande, fatiado em fases próprias travadas por autorização
explícita a cada etapa (mesmo padrão já usado em toda a feature de alunas
particulares) -- o comando de ativação exigia rodar SÓ a Fase 0 (auditoria
de leitura, sem código) e esperar autorização explícita antes de tocar em
qualquer arquivo.

**Fase 0 (auditoria) -- achado central, reportado antes de codar**: a
tela de admin (`shared/admin-flashcards.js`) já tinha Frente/Verso/
Recursos opcionais ANTES de Modo de prática no HTML/DOM -- ordem oposta à
pedida no prompt-mestre. Mais importante: Frente/Verso eram lidos e
gravados INCONDICIONALMENTE em todo modo, inclusive Completar a frase --
mas `renderClozeReviewCard` (fr/zh `app.js`) nunca lê `card.front`/
`card.back_hanzi` em NENHUMA tela de revisão pra esse modo. Ou seja: todo
cartão cloze já criado tinha um `front` gravado no banco que nunca era
mostrado a ninguém -- dado morto só pra satisfazer a constraint `not null`
de `teacher_flashcards.front` (migration 026). Reportado como decisão em
aberto antes de tocar em schema: opção (a) copiar algo pra `front`
automaticamente, ou (b) relaxar a constraint e não exigir mais o campo
nesse modo. A autora escolheu explicitamente a opção (b), com instrução
verbatim de NÃO inventar valor substituto nenhum ("Isso criaria dado
redundante/artificial").

**Checklist de verificação pedido pela autora antes de tocar em
`teacher-flashcards.js`** (respondido com leitura real do código, não
suposição, antes de escrever qualquer linha):
1. `front` aceitava NULL no banco? Não -- `not null` desde a migration
   026, nunca relaxado.
2. Todos os locais que leem `front` de `teacher_flashcards`? Mapeados via
   grep: `shared/admin-flashcards.js` (lista "Cartões ativos"),
   `fr/app.js`+`zh/app.js` (`buildCardFromTeacherFlashcard`, Combinar --
   `MATCH_STATE.pairs`, Speed Review -- `buildSpeedQueue`/render, export
   Anki -- `ANKI_EXPORT_CONFIG`), `shared/reports.js` (contexto de
   report, já tinha fallback `card.front || card.back_hanzi || null`,
   sem risco). `renderClozeReviewCard` -- o único que NUNCA lê `front` --
   confirmado por leitura direta do código.
3. `buildFlashcardsCardsBoxHTML` depende de `front`? Sim, via
   `flashcardCardRowHTML` -- ajustado (ver abaixo).
4. Edição/exclusão/filtros administrativos dependem de `front`? Edição de
   cartão já criado nunca foi implementada (nem nesta fase nem nas
   anteriores -- só criar/arquivar), então não há UI de edição pra
   ajustar. Exclusão (`setFlashcardStatus`) e filtros (busca/idioma de
   ALUNO, não de cartão) não tocam `front`.
5. Outro consumidor além de `renderClozeReviewCard`? Sim, achados
   CRÍTICOS não óbvios à primeira vista: **Combinar** (jogo de
   pareamento) e **Speed Review** nunca sabem o que é "cloze" -- os dois
   pressupõem um par frente/verso simples e leem `card.front`/
   `card.back_hanzi` sem checar `clozeSentence`. Um cartão cloze SEM
   `front` quebraria a exibição deles (tile/prompt em branco). Mesmo
   achado na exportação de baralho Anki (`ANKI_EXPORT_CONFIG.noteFields`)
   -- um cartão sem front geraria uma nota do Anki com a frente vazia.
6. Cartões cloze já existentes continuam funcionando sem alteração?
   Sim, confirmado -- nenhuma migração de dado, nenhum backfill; a
   migration só relaxa a constraint, cartões antigos mantêm `front`
   preenchido como sempre, e o filtro novo (ver abaixo) só passa a
   excluir cartões NOVOS sem front dos poucos lugares que dependem dele.
7. Interface de edição de cartões cloze precisaria respeitar a regra?
   Não se aplica -- não existe edição de conteúdo de cartão já criado em
   nenhuma fase desta feature até aqui (só criar/arquivar/reativar).

**O que foi feito:**

- **Migration `035_allow_null_front_teacher_flashcards.sql`** --
  `alter table teacher_flashcards alter column front drop not null`.
  Aditiva/sem risco (só relaxa uma constraint, não migra nenhuma linha
  existente). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration` no projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/teacher-flashcards.js`** -- `createFlashcard()`: `front` só é
  exigido quando NÃO é um cartão cloze (`isCloze = !!cleanClozeSentence`).
  `back_trans` continua obrigatório em TODO modo, sem exceção (é o que
  `renderClozeReviewCard` mostra como tradução depois de responder, além
  de ser o verso normal/opção certa nos outros 2 modos). Insert grava
  `front: cleanFront || null` -- nunca um valor substituto, gravação real
  de `NULL` quando o modo é cloze.
- **`shared/admin-flashcards.js` reestruturado** -- ordem visual agora é
  Destinatários (Alunos) → Modo de prática (radios) → Conteúdo →
  Recursos opcionais → Criar cartão → Cartões ativos, exatamente a ordem
  pedida. "Conteúdo" virou 2 blocos MUTUAMENTE EXCLUSIVOS (nunca os dois
  visíveis juntos, controlados pelo `change` do radio "Modo de prática"):
  - `#admin-flashcard-content-main` -- Frente + pinyin (mandarim) +
    Verso, reaproveitado tanto por "Flashcard normal" quanto por
    "Múltipla escolha" (só os RÓTULOS trocam entre os 2 -- "Frente"/
    "Verso" vira "Pergunta/termo"/"Resposta correta" no modo mc, via
    `textContent` nos 2 `<label>` com id próprio). "Outras opções"
    (`choices`) fica dentro deste bloco, visível só no modo mc.
  - `#admin-flashcard-content-cloze` -- Frase com lacuna + Resposta
    certa + pinyin da resposta (mandarim) + **Tradução** (campo NOVO,
    `#admin-flashcard-cloze-trans`, mapeado pra `back_trans` no submit).
    Campo de Tradução foi inferência minha, não estava explícito na
    lista de campos por modo que a autora mandou (que listava só "Frase
    com lacuna"/"Resposta correta" pro modo cloze) -- mas a MESMA
    mensagem dela, 2 linhas acima dessa lista, travava explicitamente
    "Completar a frase → cloze_sentence + cloze_answer + **back_trans**"
    como a semântica de dado certa do modo, e `back_trans` continua
    hard-obrigatório no banco (é o que a tela de revisão mostra como
    tradução ao aluno). Resolvi a aparente omissão a favor da frase mais
    precisa (a semântica de dado), não deixei o campo de fora -- sinalizando
    aqui explicitamente pra revisão da autora, caso a intenção real fosse
    outra.
  - Campos que não pertencem ao modo selecionado ficam GENUINAMENTE
    escondidos (`display:none` no bloco inteiro), não só reordenados --
    no modo cloze, nem o campo Frente existe na tela.
- **`flashcardFrontSummaryHTML()`** (novo, `shared/admin-flashcards.js`)
  -- a lista "Cartões ativos" mostrava `c.front` cru; agora cai pra
  mostrar a frase-cloze resolvida (`"Je [viens] de Paris."`, resposta
  certa entre colchetes) quando `front` é `null`. Cartões cloze com
  `front` preenchido (todos os já existentes) continuam mostrando o
  front normalmente, ZERO mudança visual pra eles -- o fallback só entra
  pra cartões novos sem front.
- **`hasPlainFrontBack(card)`** (novo, fr+zh `app.js`, mesma função
  espelhada com a adaptação de idioma de sempre -- checa `card.front` no
  fr, `card.back_hanzi` no zh) -- exclui um cartão cloze SEM front dos 3
  consumidores que nunca entendem cloze: `buildSpeedQueue()` (Speed
  Review), `startMatchGame()` (Combinar) e `ANKI_EXPORT_CONFIG.cards()`
  (exportação de baralho). **`eligibleReviewPool()` em si NÃO leva esse
  filtro** -- Revisão (Flashcard/Palavras Difíceis) é o lugar CERTO pro
  cartão cloze aparecer, com ou sem front; só os 3 consumidores que
  pressupõem par frente/verso simples precisavam do filtro. Cartões
  cloze já existentes (front preenchido) continuam elegíveis nos 3
  lugares, sem mudança de comportamento.

**Decisões arquiteturais tomadas nesta fase:**
1. `front` nullable é específico ao modo cloze -- não virou opcional pros
   outros 2 modos (flip/mc continuam exigindo Frente, mesmo
   comportamento de sempre).
2. Reaproveitar os MESMOS inputs de Frente/Verso entre Flashcard normal
   e Múltipla escolha (só trocando rótulo) em vez de duplicar campos --
   evita 2 fontes de verdade pro mesmo dado e é consistente com o motor
   de dado já existente (MC já usava `front`/`back_trans` como
   pergunta/resposta certa desde a Fase 8a, só a UI não deixava isso
   claro visualmente).
3. Tradução do modo cloze ganhou input PRÓPRIO
   (`#admin-flashcard-cloze-trans`) em vez de tentar reaproveitar
   `#admin-flashcard-back` via reparenting/DOM move -- mantém o padrão já
   estabelecido no arquivo (MC e cloze já tinham cada um seus próprios
   sub-campos, ex: `admin-flashcard-mc-1/2/3`), sem introduzir
   complexidade de mover elementos de lugar no DOM.
4. Filtro de "front ausente" (`hasPlainFrontBack`) ficou fora de
   `eligibleReviewPool()` de propósito -- aplicar lá excluiria cartão
   cloze inteiro da Revisão, que é exatamente o lugar onde ele DEVE
   aparecer; o filtro só pertence aos 3 consumidores que não entendem
   cloze mecanicamente.

**Gratuito x Premium (avaliado, não implementado):** nenhuma mudança de
conceito nesta fase -- é reorganização de UI + relaxamento de constraint,
sem nova superfície de produto. Mesma conclusão de todas as fases
anteriores desta feature.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/admin-flashcards.js`, `fr/app.js`,
`zh/app.js`. Validação funcional via Playwright (fr+zh), mesmo padrão de
stub de sempre: (1) ordem visual confirmada via
`compareDocumentPosition` -- "Modo de prática" vem antes de "Conteúdo" no
DOM; (2) troca de modo confirmada via `getComputedStyle().display` --
flip mostra bloco principal com rótulos "Frente"/"Verso", mc mostra o
MESMO bloco com rótulos "Pergunta/termo"/"Resposta correta" + "Outras
opções" visível, cloze esconde o bloco principal inteiro e mostra só
Frase/Resposta/Pinyin(mandarim)/Tradução; (3) submit cloze sem tradução
rejeitado (`dbDelta:0`, erro "Digite a tradução..."); sem `___`
rejeitado; zh sem pinyin da resposta rejeitado; (4) submit cloze válido
sem preencher Frente confirma `front === null` gravado de verdade no
banco (`frontIsNull:true`), nunca um valor inventado; (5) lista "Cartões
ativos" confirmada mostrando o cartão cloze legado (front preenchido,
"Tu es → ...") normalmente E o cartão novo sem front como
"Je [viens] de Paris. → Eu venho de Paris." (fallback funcionando); (6)
`hasPlainFrontBack()` chamada diretamente confirma `true` pro cartão
cloze legado (front preenchido), `false` pro cartão novo sem front,
`true` pro cartão flip comum -- nos dois idiomas; (7) do lado da ALUNA
(sessão separada, `mergeTeacherFlashcardsIntoState` real): confirmado
`eligibleReviewPool()` inclui os DOIS cartões cloze (legado e sem front),
enquanto `eligibleReviewPool().filter(hasPlainFrontBack)` (Speed/
Combinar) exclui só o sem front; sessão de revisão real
(`renderReviewView`/`renderClozeReviewCard`/`gradeCurrentCard`) rodada
de ponta a ponta pro cartão SEM front -- lacuna renderiza, resposta
errada aplica `.incorrect` e revela a resposta certa, `gradeCurrentCard`
dispara de verdade (`reps`/`due` mudam); (8) regressão de Múltipla
escolha confirmada -- criar cartão mc com front/back/choices continua
funcionando sem nenhuma mudança de comportamento. Validação visual
(screenshot Playwright, fr, claro+escuro) dos 3 modos confirma a nova
hierarquia legível nos dois temas, zero CSS novo (reaproveita classes já
calibradas). Sem erro de console novo atribuível a este código (mesmos
`pageerror` de mock -- `.is()`/`.upsert()`/`insert().then()` -- já
registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito, é escopo
de fase futura se pedido):**
- `student_flashcards` (cartão da própria aluna, Fase 5) não foi tocado
  -- a reestruturação e o relaxamento de `front` são só pra
  `teacher_flashcards`, mesmo escopo restrito já usado em toda a Fase 8.
- Edição de conteúdo de um cartão já criado continua não implementada --
  fora do escopo desta fase (era sobre reestruturar CRIAÇÃO, não
  adicionar edição).
- `shared/admin-support-materials.js`/`admin-class-logs.js` não foram
  tocados -- não têm o conceito de "modo de prática", fora do escopo
  deste prompt-mestre específico.

Esta é a Fase 1 de um prompt-mestre que travou explicitamente "não avance
automaticamente" após cada fase. Próxima fase só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23), "Siga para a fase 2".**
Não tinha o texto literal das Fases 2+ do prompt-mestre original salvo
nesta sessão (só um resumo genérico sobrevive de sessões anteriores) --
em vez de adivinhar o escopo numa tela administrativa já corrigida
várias vezes por bug real, perguntei à autora via `AskUserQuestion` com 3
opções concretas + "outra coisa". Ela escolheu **"Validação contextual
mais rica / mensagens de erro por campo"**.

## Fase 2 (validação contextual por campo) -- borda + mensagem específica embaixo de cada campo, tempo real no blur

**O que foi feito**, só em `shared/admin-flashcards.js` +
`fr/index.html`/`zh/index.html` (CSS):

- **`.field-invalid`** (novo, fr+zh `index.html`) -- reaproveita o MESMO
  par `border-color: var(--error-red)` + `background: rgba(214,38,25,
  0.08)` já usado em `.gram-exercise.wrong input`/`.conj-field.wrong
  input` (fr) e `.mc-option.incorrect` (fr+zh) -- zero cor nova, mesmo
  princípio de reaproveitar tokens já calibrados em vez de inventar.
  `.profile-edit-field-error` (novo) -- mesma cor/tamanho de
  `.profile-edit-error` (rodapé), só menor/mais próximo do campo.
- **`<p class="profile-edit-field-error">` embaixo de cada campo
  obrigatório** (Frente/Verso/1ª opção errada MC/Frase-cloze/Resposta-
  cloze/Pinyin-cloze/Tradução-cloze) -- vazio por padrão, populado só
  quando aquele campo específico falha.
- **`validateFlashcardForm(wrap)`** -- validação completa/definitiva,
  rodada no SUBMIT, ANTES do upload de mídia (evita subir imagem/áudio à
  toa se o resto do formulário ainda está inválido -- melhoria real, não
  só cosmética). Só valida os campos que pertencem ao MODO atualmente
  selecionado -- nunca marca "Frente" como inválida no modo cloze
  (esse campo nem existe pra esse modo, ver Fase 1 acima). Foca o
  primeiro campo inválido automaticamente.
- **`wireFlashcardFieldValidation(wrap)`** -- validação em TEMPO REAL:
  cada campo obrigatório valida no `blur` (assim que a professora sai
  dele, não só no clique de "Criar cartão") e limpa o próprio erro
  assim que ela volta a digitar (`input`). Pedido explícito da autora
  ("validação em tempo real... em vez de só no clique") -- antes disso,
  só existia uma frase genérica no rodapé, só depois do clique.
- **`clearAllFlashcardFieldErrors()`** chamada em 2 pontos extras, pra
  nenhum erro ficar "preso" num estado que não faz mais sentido: (1) ao
  trocar de "Modo de prática" (um campo que estava marcado inválido no
  modo anterior pode nem existir mais no modo novo -- ex: trocar de flip
  pra cloze escondendo "Frente" com erro ainda visível seria confuso);
  (2) em `updateFlashcardsSelectionDependentUI()`, ao mudar a seleção de
  alunos -- desmarcar o único aluno de mandarim da seleção deveria
  limpar um erro "Pinyin obrigatório pra aluno(s) de mandarim" que não
  se aplica mais.
- **Mensagens específicas por tipo de falha**, não uma genérica pra
  tudo: "Obrigatório." pros campos vazios simples; "Precisa ter
  exatamente um espaço marcado com ___." quando a frase-cloze não tem
  a lacuna certa (distinto de "vazio"); "Digite pelo menos 1 opção
  errada." pro grupo de múltipla escolha; "Obrigatório pra aluno(s) de
  mandarim." pro pinyin-cloze quando a seleção inclui mandarim.
- **Removido o check redundante pós-upload** de "múltipla escolha sem
  nenhuma opção errada" que existia desde a Fase 8a -- já coberto por
  `validateFlashcardForm()` ANTES do upload agora, então rodar de novo
  depois seria trabalho morto (e a validação nova já roda mais cedo,
  então esse caminho de código nunca mais seria alcançado com choices
  vazio).

**Decisões arquiteturais tomadas nesta fase:**
1. `createFlashcard()` (`shared/teacher-flashcards.js`) NÃO foi tocado --
   continua sendo a fonte de verdade da validação (mesma validação
   server-side de antes). A validação de campo desta fase é só uma
   camada de UX na frente, mesmo nível de confiança de outros gates de
   UI já existentes no app (ex: teto de 20 cartões da Fase 5.1) -- não
   uma fronteira de segurança nova.
2. Validação em tempo real É por campo individual (blur/input), não uma
   chamada de `validateFlashcardForm()` completa a cada tecla -- rodar a
   validação completa a cada blur marcaria campos que a professora ainda
   nem chegou a preencher (ex: sair do campo Frente já marcaria "Verso"
   vazio como erro, antes dela sequer ter chance de preenchê-lo). Cada
   campo só valida a SI MESMO no seu próprio blur.
3. Mensagem do rodapé (`#admin-create-flashcard-error`) não sumiu --
   agora mostra um resumo genérico ("Corrija os campos destacados
   acima.") só quando `validateFlashcardForm()` falha no submit, servindo
   de âncora visual pra quem não notar os campos individuais de cara.

**Gratuito x Premium (avaliado, não implementado):** validação de UI
pura, sem custo marginal -- mesma conclusão de toda a Fase 1 e de todo o
resto desta feature, nenhuma razão pra diferenciar por plano.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh),
mesmo padrão de stub de sempre: (1) blur num campo vazio marca
`.field-invalid` + mensagem "Obrigatório.", digitar limpa os dois
imediatamente; (2) submeter com Frente preenchida mas Verso vazio marca
SÓ o Verso (Frente permanece sem erro), foca o Verso, mostra o resumo no
rodapé, `dbDelta:0`; (3) trocar de modo (flip→mc) confirma que o erro de
Frente não persiste (`frontStillInvalid:false`), e que o campo de
múltipla escolha (1ª opção errada) valida corretamente no blur e limpa
ao corrigir; (4) modo cloze -- frase sem `___` recebe a mensagem
ESPECÍFICA ("Precisa ter exatamente um..."), não a genérica
"Obrigatório.", enquanto Resposta/Tradução (ainda vazias mas não
tocadas nesse teste) não são marcadas incorretamente; (5) submit
completo e válido em cloze cria o cartão de verdade (`dbDelta:1`) nos
dois idiomas -- no zh, confirmado que o pinyin-cloze É exigido (aluno
mandarim selecionado) e barra o submit até ser preenchido
(`pinyinInvalidBeforeFill:true`), depois passa. Validação visual
(screenshot Playwright, fr, claro+escuro) do estado de 2 campos
inválidos ao mesmo tempo (Frente+Verso) confirma legibilidade nos dois
temas -- esperado, já que reaproveita só o par border-color/background
já calibrado em `.gram-exercise.wrong input`/`.mc-option.incorrect`,
nenhuma cor nova. Sem erro de console novo atribuível a este código
(mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já registrados em
toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito, é escopo
de fase futura se pedido):**
- Nenhuma validação client-side de formato de arquivo/tamanho de
  imagem/áudio antes do upload -- fora do escopo desta fase (era sobre
  campos de texto/seleção).
- `student_flashcards`/`admin-support-materials.js`/`admin-class-logs.js`
  não ganharam o mesmo padrão de validação por campo -- fora do escopo
  deste prompt-mestre específico (que é só o formulário de flashcards do
  admin).
- Não foi confirmado com a autora se as 3 outras opções descartadas na
  pergunta inicial (reestruturar Destinatários visualmente; Recursos
  opcionais contextual por modo) fazem parte de uma Fase 3 futura --
  ficam como candidatas, não decididas.

Próxima fase só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para
a fase 3: reestruturar Destinatários visualmente" -- escopo já vinha
explícito na própria instrução, sem precisar de outra rodada de
`AskUserQuestion`.**

## Fase 3 (reestruturar Destinatários visualmente) -- contador vira pill no topo, corrige de passagem contraste dos links "Selecionar todos/Limpar seleção"

**O que foi feito**, só em `shared/admin-flashcards.js` +
`fr/index.html`/`zh/index.html` (CSS):

- **Contador de seleção virou `.pill`** (classe já existente, reaproveitada
  do streak/XP da topbar e do selo "Aluno vinculado" de `my-flashcards.js`
  -- zero CSS novo pro chip em si) e **subiu pro TOPO do bloco "Alunos"**,
  logo abaixo do hint -- antes era um `<p>` de texto solto embaixo da
  lista rolável de checkboxes, obrigando a rolar até o fim pra saber
  quantos alunos estavam marcados.
- **"Selecionar todos"/"Limpar seleção" viraram uma linha (`.admin-
  recipients-actions`) ao lado do pill**, dentro do mesmo toolbar
  (`.admin-recipients-summary`, `display:flex; justify-content:space-
  between; flex-wrap:wrap` -- quebra pra 2 linhas em telas estreitas sem
  overflow, confirmado no screenshot) -- antes ficavam soltos entre a
  busca e a lista, sem relação visual com o contador.
- **`.admin-select-link`** (novo, fr+zh `index.html`) -- reaproveita
  `--seal-red-dark`, o MESMO token já usado por `.side-card-link` ("Ver
  ranking completo →") -- corrige de passagem um contraste baixo real: os
  2 links não tinham cor própria antes, herdavam o azul padrão do
  navegador, que ficava pouco legível no tema escuro -- pendência já
  registrada na UX-fix 4/5 ("achado incidental, não corrigido... registrar
  pra sessão futura tratar"). Só aplicado em `shared/admin-flashcards.js`
  -- `admin-support-materials.js`/`admin-class-logs.js` têm o MESMO
  markup sem cor própria, mas não foram tocados aqui (fora do escopo
  desta fase -- só a tela de Flashcards é o alvo deste prompt-mestre,
  mesmo princípio já usado desde a Fase 1).

**Decisões arquiteturais tomadas nesta fase:**
1. Nenhuma mudança em `updateFlashcardsSelectionDependentUI()` --
   `counterEl.textContent = ...` já funcionava independente da tag/classe
   do elemento, então trocar `<p class="profile-edit-hint">` por `<span
   class="pill">` não exigiu nenhuma mudança de lógica, só de template.
2. Fixar o contraste dos 2 links foi decisão minha, não pedida
   explicitamente nesta instrução -- mas diretamente adjacente ao que
   estava sendo tocado (os mesmos 2 elementos, movidos de posição) e já
   estava registrado como pendência conhecida no CLAUDE.md; corrigir
   enquanto mexia no mesmo HTML foi mais barato que deixar pra depois.
   Escopo explicitamente NÃO estendido às outras 2 telas com o mesmo
   markup (ver acima).

**Gratuito x Premium (avaliado, não implementado):** reorganização de UI
pura, sem custo marginal -- mesma conclusão de toda a Fase 1/2.

**Testes realizados:** `node --check` sem erro. Playwright (fr): ordem
confirmada via `compareDocumentPosition` (toolbar de contador+ações vem
ANTES da lista de checkboxes no DOM); contador é `<span class="pill">` de
verdade; `.admin-select-link` aplicado com cor computada `rgb(29,90,130)`
(fr, claro -- bate com `--seal-red-dark` já calibrado, mesmo valor usado
na correção dos botões de grau registrada anteriormente neste arquivo);
contador atualiza corretamente em 3 cenários (selecionar 1, "Selecionar
todos", "Limpar seleção"); fluxo de submit completo (criar cartão)
confirmado continuando a funcionar sem nenhuma regressão
(`dbDelta:1`) depois da reestruturação. Validação visual (screenshot
Playwright, fr+zh, claro+escuro) confirma o toolbar novo legível nos 4
cenários -- destaque pro tema escuro, onde os 2 links agora usam a cor
calibrada certa em vez do azul padrão do navegador (fr) / ficam no tom
vermelho de marca do zh, ambos claramente legíveis, confirmando visualmente
a correção do contraste. Sem erro de console novo atribuível a este
código (mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já
registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- `admin-support-materials.js`/`admin-class-logs.js` continuam com os
  mesmos 2 links sem cor própria (baixo contraste no escuro) -- a classe
  `.admin-select-link` já existe e está pronta pra ser aplicada lá também
  quando/se uma sessão futura for autorizada a tocar essas 2 telas.
- Nenhuma outra mudança visual no bloco "Alunos" além do reposicionamento
  do contador/ações -- pills de filtro de idioma, busca e lista de
  checkboxes continuam com o mesmo layout de antes (não fizeram parte do
  pedido).

Próxima fase só começa depois de autorização explícita da autora, com
este relatório já entregue antes de pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para:
Recursos opcionais contextual por modo" -- investigação prévia invalidou a
leitura literal do pedido (ver Fase 4 abaixo), resolvida com uma pergunta
antes de codar (`AskUserQuestion`).**

## Fase 4 (Recursos opcionais contextual por modo) -- investigação invalida a leitura literal, texto de apoio muda por modo

**Investigação antes de codar** (mesma disciplina de "investigação antes de
mudar qualquer coisa" já usada em UX-fix 4/6 deste arquivo): antes de tocar
em qualquer campo do bloco "Recursos opcionais" (Nota/Imagem/Áudio, hoje
mode-independente, sempre visível nos 3 modos), confirmei por leitura direta
do código de revisão (fr/zh `app.js`) se algum dos 3 campos realmente varia
por modo hoje:
- **Imagem/Áudio** (`card.imageUrl`/`card.audioUrl`) já renderizam
  corretamente nos 3 modos -- `renderReviewView()` (flip),
  `renderMultipleChoiceReviewCard()` (mc) e `renderClozeReviewCard()`
  (cloze), fr+zh, todos mostram os dois quando presentes. Escondê-los por
  modo seria REGRESSÃO contra comportamento que já funciona, não uma
  melhoria.
- **Nota** (`card.note`/`teacherNote`) nunca aparece pro aluno em NENHUM
  modo -- mas não é um bug de modo: o único ponto de leitura confirmado
  (`grep` em `shared/admin-flashcards.js:187`) é a própria lista "Cartões
  ativos" da PROFESSORA -- um lembrete privado dela, nunca destinado ao
  aluno. Funciona como projetado, uniformemente nos 3 modos.

Ou seja: nenhum dos 3 campos genuinamente varia por modo hoje -- a premissa
literal por trás de "Recursos opcionais contextual por modo" (esconder
algo dependendo do modo) não se sustenta contra o código real. Implementá-la
ao pé da letra arriscaria esconder Imagem/Áudio, que já funcionam
corretamente nos 3 modos.

**Resolvido com uma pergunta à autora** (`AskUserQuestion`, 3 opções: só
texto de apoio contextual / nada a fazer / outra ideia), reportando o
achado acima antes de propor qualquer mudança. Resposta: **"Só texto de
apoio contextual"** -- manter os 3 campos sempre visíveis nos 3 modos
(comportamento atual, correto), mas trocar o texto de hint da seção
conforme o modo selecionado, explicando ONDE cada recurso aparece
NAQUELE modo especificamente. Nenhuma mudança funcional.

**O que foi feito**, só em `shared/admin-flashcards.js`:

- **`FLASHCARD_RESOURCES_HINT`** (novo, objeto com uma entrada por modo:
  `flip`/`mc`/`cloze`) -- 3 textos, cada um descrevendo onde Imagem/Áudio
  aparecem NAQUELE modo (ex: "junto da pergunta, acima das opções de
  múltipla escolha" no modo mc) e reafirmando que Nota é um lembrete
  privado que o aluno nunca vê, nos 3.
- **`<p class="profile-edit-hint" id="admin-flashcard-resources-hint">`**
  (novo) logo abaixo do rótulo "Recursos opcionais", inicializado com o
  texto do modo padrão (`flip`, já `checked` por padrão no radio group).
- **Listener de `change` do radio "Modo de prática"** (já existente desde
  a Fase 1, mesmo bloco que troca rótulos Frente/Verso e visibilidade dos
  blocos de Conteúdo) ganhou mais uma linha: atualiza
  `#admin-flashcard-resources-hint` com `FLASHCARD_RESOURCES_HINT[mode]` --
  reaproveita o mesmo mecanismo já existente, não um listener novo.

**Decisões arquiteturais tomadas nesta fase:**
1. Zero mudança de visibilidade/comportamento dos 3 campos -- eles
   continuam sempre presentes nos 3 modos, exatamente como confirmado
   correto na investigação. "Contextual" aqui é estritamente sobre texto
   explicativo, não sobre esconder/mostrar.
2. Nenhuma mudança em `createFlashcard()`/schema/migração -- é uma
   mudança 100% de UI (um texto que troca de conteúdo), sem novo dado
   sendo capturado ou persistido.
3. Reaproveita a classe `.profile-edit-hint` já usada por todo hint do
   formulário (zero CSS novo), e o mesmo listener de `change` do radio
   group já existente desde a Fase 1 -- não um sistema de hint contextual
   novo, só mais uma linha nesse listener.

**Gratuito x Premium (avaliado, não implementado):** mudança de texto de
UI pura, sem custo marginal -- mesma conclusão de toda a Fase 1/2/3.

**Testes realizados:** `node --check` sem erro. Playwright (fr+zh): hint
inicial confirmado batendo com o modo `flip` (padrão `checked`); trocar
pra `mc` e depois `cloze` confirma o texto mudando pra cada um; voltar pra
`flip` confirma o texto original restaurado (`===` com o inicial); os 3
campos (Nota/Imagem/Áudio) confirmados **continuando visíveis
(`offsetParent !== null`) nos 3 modos** -- a checagem específica pra
garantir que a regressão que esta investigação identificou como risco não
foi introduzida; fluxo de submit completo (criar cartão) confirmado
continuando a funcionar sem nenhuma regressão (`dbDelta:1`) depois da
mudança, nos dois idiomas. Validação visual (screenshot Playwright, fr,
claro+escuro, modo múltipla escolha) confirma o hint novo legível nos dois
temas -- esperado, já que reaproveita só a classe `.profile-edit-hint` já
calibrada, nenhuma cor nova introduzida. Sem erro de console novo
atribuível a este código (mesmos `pageerror` de mock -- `.is()`/
`.upsert()` -- já registrados em toda a feature).

**O que ainda falta / não foi feito nesta fase (de propósito):**
- Nenhuma mudança nos 3 campos em si (Nota/Imagem/Áudio) -- só o texto de
  apoio acima deles.
- `admin-support-materials.js`/`admin-class-logs.js` não têm o conceito
  de "Modo de prática" (não se aplica -- fora do escopo deste
  prompt-mestre, que é só o formulário de flashcards do admin).
- **Este era o último dos 3 candidatos oferecidos na pergunta que abriu a
  Fase 2** (reestruturar Destinatários -> Fase 3; validação por campo ->
  Fase 2; Recursos opcionais contextual -> esta fase). Com os 3
  endereçados, não há mais nenhum item pendente conhecido deste
  prompt-mestre específico -- qualquer trabalho além disso precisa de
  escopo/autorização explícitos numa sessão futura, não presumido como
  próximo passo automático.

Próxima fase (se houver) só começa depois de autorização explícita da
autora, com este relatório já entregue antes de pedir luz verde.

## "7 propostas" -- grilling completo (15 perguntas) sobre feedback real de uso, todas implementadas numa sessão só

A autora testou o app de verdade (2 screenshots reais anexados -- tela de
revisão de múltipla escolha e formulário de criação de flashcard) e trouxe
7 propostas numeradas de uma vez, pedindo "faça um grilling dessas
propostas" antes de implementar -- mesma disciplina de toda sessão desta
feature. Grilling de 15 perguntas rodado (`AskUserQuestion`), respostas
resumidas abaixo por proposta; a autora fechou a rodada com "Todo o resto
foi aprovado, pode implementar", autorizando as 7 de uma vez (quebra do
padrão usual "1 fase por vez" desta feature, porque ela pediu
explicitamente).

**Prop 1+2 (áudio automático erra o idioma + rótulos fixos "no idioma
estudado"/"(tradução)", quer poder inverter):** grillado junto porque são
a mesma causa raiz -- o app sempre presumiu `front`=idioma estudado.
Decisão: campo novo `front_is_target_language` (boolean, default `true` --
zero regressão em cartão existente) em `teacher_flashcards` E
`student_flashcards` (migration `036_flashcard_direction_and_revision`,
aplicada AO VIVO via `mcp__Supabase__apply_migration`, projeto
`eigjocalzwamisgqilhg`). Decide (a) rótulo dos campos Frente/Verso na
tela de admin/Meus Cartões -- viraram "Frente"/"Verso" puros, sem
parênteses, porque agora dependem de um seletor visível ao lado ("Idioma
de cada lado"), não fixos; (b) qual lado recebe pronúncia automática
(TTS) no flip e no quiz de múltipla escolha.

**Achado arquitetural que restringiu o escopo, não presumido -- zh não
suporta inversão**: `fr` tem forma simétrica (`front`/`back_trans`, duas
strings soltas, qualquer uma pode ser o idioma estudado). `zh` é
ASSIMÉTRICO -- `front_pinyin`+`back_hanzi` são um par inseparável (hanzi
sempre mostrado junto do pinyin), `back_trans` é uma string solta sem
contraparte de pinyin. Não existe `back_pinyin` pra completar o par se a
direção invertesse. **Decisão: Prop 1+2 não se aplica ao zh** -- a coluna
`front_is_target_language` ainda é gravada nas linhas zh (consistência de
schema), mas `zh/app.js` NUNCA lê esse campo (sempre assume
`back_hanzi`=idioma estudado, mesmo comportamento hardcoded de sempre); o
seletor de direção fica genuinamente escondido na UI (admin e Meus
Cartões) sempre que a seleção envolve mandarim.

**Escopo da Prop 2 estendido pela autora no grilling** (Q2): eu recomendei
só o modo flip; ela pediu explicitamente que múltipla escolha TAMBÉM
tivesse seletor ("front em português pra tentar adivinhar a resposta
certa entre as opções em francês") -- implementado: quando invertido, a
pergunta do quiz mostra o texto NATIVO (`front`) e as opções (`back_trans`
+ `choices`) ficam no idioma estudado. **Sem áudio automático nenhum
quando invertido** (nem no front, nem em nenhuma opção) -- tocar a
pronúncia certa antes da aluna responder entregaria a resposta; decisão
minimalista, não inventei um botão de áudio por opção que não foi pedido.

**Prop 3 (mover "Meus Cartões" do menu do avatar pra dentro de
Revisão):** a autora relatou que ninguém clica no botão de perfil/avatar,
fica escondido demais. Grillado o local exato (Q5) -- ela pediu
explicitamente "um botão no topo dentro de Revisão, assim como
Badges/Notificações/Analytics dentro do Painel de Admin, ou Visão
Geral/Metas/Progresso no Perfil" (um pill de atalho, não um item de
sub-navegação). Implementado como `#review-my-flashcards-btn`
(`.leaderboard-tab`, reaproveitando a MESMA classe de pill já usada pra
essas sub-navegações -- zero CSS novo), logo abaixo do título "Revisão".
**Removido do dropdown do avatar** (Q6, override da minha recomendação de
manter os dois) -- ela pediu remoção explícita: "no momento eu quero até
remover esse menu do topbar já que ele já está na sidebar" (a parte da
sidebar não foi tocada nesta sessão -- fora do escopo desta proposta
específica, registrado só como contexto dela, não instrução de ação).

**Prop 4 (não dá pra editar/excluir cartão próprio, só arquivar --
autora quer editar de verdade E poder deletar):** a maior mudança
arquitetural das 7. Grilling em 3 perguntas (Q7-Q10):
- Q7 confirmou a leitura do bug: hoje só arquivar/reativar existe, sem
  editar/excluir, tanto pro cartão da PRÓPRIA aluna quanto pro cartão
  autorado pela professora.
- Q9 (quais campos editáveis + como avisar sobre reset de progresso): eu
  recomendei só texto (front/back/nota); ela pediu TODOS os campos
  editáveis (inclusive modo/mídia/direção), com um popup de confirmação
  EXATO: "Esta edição irá reiniciar o progresso de revisão deste cartão.
  Deseja continuar?" + botões "Sim"/"Descartar edições" -- texto
  implementado literal, novo `#flashcard-reset-confirm-modal`
  (compartilhado entre `admin-flashcards.js` e `my-flashcards.js`, mesmo
  padrão HTML/JS de todo modal do app).
- Q10 (arquivar não resolve o caso "adicionei um cartão errado por
  engano e só percebi depois" -- ela quer DELETE de verdade, mesmo com
  histórico de revisão): autorizado explicitamente perder o histórico
  FSRS nesse caso -- e ela mesma sugeriu, se fosse mais simples pro
  código, que EDITAR também resetasse o progresso (não só criar um
  "editar sem resetar" complexo).

**Mecanismo escolhido pra "editar reseta progresso" -- reaproveita
infraestrutura já existente, não inventa um reset novo**: coluna
`revision integer not null default 0` (mesma migration `036`) em
`teacher_flashcards`/`student_flashcards`. `flashcardIdForRow(prefix,
row)` (novo, fr+zh `app.js`) -- `row.revision > 0 ? '${prefix}${row.id}
-r${row.revision}' : '${prefix}${row.id}'`. Ou seja, o id do card SÓ MUDA
na primeira edição -- antes disso, comportamento idêntico a sempre (zero
regressão pra cartão nunca editado). Quando editado, o id novo não bate
com nenhum id salvo no `STATE` serializado, e o mecanismo de merge-por-id
de `applySerializedState()` (documentado desde a Fase 0 desta feature
inteira -- "cartão salvo sem correspondência na lista fresca é descartado
em silêncio") já faz o reset sozinho, sem nenhum código de "resetar
progresso" novo. `card.rowId` (novo campo) guarda o id numérico puro (sem
sufixo de revisão) pra `updateSelfFlashcardStatusInState`/
`removeSelfFlashcardFromState` conseguirem casar o cartão certo mesmo
depois de já ter sido editado uma vez.

**DELETE físico de verdade** -- `deleteFlashcardPermanently`
(`shared/teacher-flashcards.js`) e `deleteOwnFlashcardPermanently`
(`shared/student-flashcards.js`), botão 🗑 com `confirm()` nativo
("Isso vai apagar o cartão e todo o histórico de revisão permanentemente.
Não pode ser desfeito. Continuar?") nas duas telas (admin e Meus
Cartões). `removeSelfFlashcardFromState()` (novo) tira o cartão do
`STATE.cards` já carregado na MESMA sessão, mesmo motivo de sempre
(sem isso, o cartão só sumiria da fila no próximo boot).

**Prop 5 (remover "Filtro de fila", mover "Origem" pro topo da lista de
ajustes):** implementado como pedido -- `<select id="review-filter-
select">` removido inteiro do painel "⚙️ Configurar sessão" (fr+zh
`index.html`), bloco `#review-origin-select-wrap` movido pra ser o
PRIMEIRO filho do painel (antes de Frequência/Novas palavras/
Intensidade). **Autocorreção registrada durante a implementação, não
depois**: eu disse a ela no grilling (Q11) que o comportamento padrão
pós-remoção seria `'all'` (mostrar tudo). Ao implementar, percebi que
`'all'` IGNORA completamente "Intensidade da sessão" (não passa `limit`
pro `getStudyQueue()`), o que tornaria esse controle -- que continua
visível na tela -- um no-op silencioso pra sempre. Corrigi pra
hardcodar `'oldest'` em vez de `'all'` (`reviewFilterQueue()`,
`buildSpeedQueue()`, `startReviewSession()`, fr+zh `app.js`) -- é o
único dos 3 valores antigos do filtro que ainda respeita Intensidade,
e era o padrão real que a maioria das contas já usava de qualquer jeito.
**Registrando aqui explicitamente porque diverge do que falei pra ela
durante o grilling** -- 'oldest' (mais antigas primeiro) no lugar de
'all' (tudo, sem ordenação por intensidade).

**Prop 6 (exportar/importar cartões PRÓPRIOS entre alunos):** Q13
perguntou o mecanismo -- ela pediu OS DOIS ("pode ser um arquivo .json se
for mais fácil, mas gosto de ter um link de compartilhamento também"), não
só um. Implementado em `shared/my-flashcards.js`:
`myFlashcardsExportPayload(cards)` monta `{languageAppKey, cards:
[{front, frontPinyin, backTrans, note, frontIsTargetLanguage}, ...]}` --
nunca ids/timestamps/status (toda importação sempre cria linhas NOVAS na
conta de quem importa, nunca tenta sincronizar/sobrescrever). Modal de
exportação com 2 botões: "⬇️ Baixar .json" (`Blob`+`URL.createObjectURL`)
e "🔗 Copiar link" (mesmo payload em base64 no fragmento da URL,
`#import=...`, sem backend novo nenhum). Importação por 2 caminhos:
upload de arquivo (`<input type="file">`) OU auto-detecção do parâmetro
`#import=` na URL ao carregar a tela (`maybeAutoImportFromUrl()`) -- os
dois passam por `confirmAndImportMyFlashcards()`, que sempre pede
confirmação com a contagem ("Importar N cartão(ões) pra sua conta?") e
**rejeita explicitamente se `languageAppKey` do payload não bater com o
idioma do site atual** (`APP_KEY`) -- um cartão de mandarim não pode
entrar numa conta de francês e vice-versa, mensagem de erro clara em vez
de falha silenciosa.

**Prop 7 (não dá pra apertar Enter/quebrar linha num campo de
flashcard):** causa raiz óbvia -- Frente/Verso/Nota eram `<input
type="text">` (single-line por definição do próprio elemento HTML), não
`<textarea>`. Trocados pra `<textarea class="profile-edit-input
profile-edit-textarea" rows="2">` nos 2 formulários (admin e Meus
Cartões, criação E edição) -- `.profile-edit-input, .profile-edit-
textarea{...}` já era um seletor combinado no CSS (herda border/padding/
resize/min-height sem precisar de nenhuma regra nova).

**Achado incidental durante a investigação de Prop 7, confirmado com a
autora antes de corrigir (Q15, "confirmado")**: `card.front`/
`card.back_trans` (fr) e `card.back_hanzi`/`card.front_pinyin`/
`card.back_trans`/`card.clozeAnswerPinyin` (zh) eram interpolados SEM
`escapeHTML()` no render de flip e múltipla escolha -- um cartão com
`<img src=x onerror=...>` no front executaria HTML/JS arbitrário na tela
de revisão de QUALQUER aluno que revisasse aquele cartão (o professor
autora do cartão já é uma conta confiável hoje, mas o princípio de nunca
confiar em texto solto interpolado direto continua valendo, e cartões
PRÓPRIOS -- Fase 5 -- são autorados pela própria aluna sem revisão
nenhuma). Corrigido (`escapeHTML()` adicionado nos 2 pontos, fr+zh)
**deliberadamente NÃO estendido a `card.clozeSentence`** -- essa
interpolação já é antiga (pré-existente a esta sessão), fora do escopo
literal da Prop 7, e estruturalmente entrelaçada com HTML injetado pro
blank (`blankHTML`) -- um fix ingênuo ali arriscaria quebrar o
comportamento intencional em vez de só fechar um buraco de segurança;
registrado aqui como candidato pra uma sessão futura tratar isoladamente,
não esquecido.

**Bug real encontrado e corrigido durante a implementação, fora do que
foi pedido (auto-detectado, não reportado pela autora)**:
`MY_FLASHCARDS_STATE.editingCardId` (`shared/my-flashcards.js`) era
atribuído direto de `btn.dataset.editOwnFlashcard` (sempre STRING, por
natureza de todo `dataset`), mas comparado com `===` contra `c.id` (
SEMPRE NÚMERO, como o Supabase devolve uma coluna inteira) em 2 pontos
(`myFlashcardRowHTML()`/`renderMyFlashcardsView()`) -- comparação
`"1006" === 1006` é sempre `false` em JS, então o formulário de edição da
própria aluna NUNCA teria aparecido em produção (o botão ✏️ pareceria
simplesmente não fazer nada). `shared/admin-flashcards.js` já fazia
`Number(btn.dataset.editFlashcard)` corretamente desde que essa tela foi
escrita -- o mesmo padrão não tinha sido replicado no arquivo irmão.
Corrigido com `Number(...)` no ponto de atribuição, mesmo padrão do
arquivo admin. Achado via teste automatizado (Playwright com mock que
clona objetos por chamada, não compartilha referência -- ver "Testes
realizados" abaixo), não por inspeção visual.

**Segundo bug de robustez encontrado e corrigido, também via teste
automatizado**: `wireMyFlashcardEditForm()` computava `(c.revision ||
0) + 1` em DUAS expressões separadas (uma pro payload de
`updateOwnFlashcardContent`, outra pro payload de
`replaceSelfFlashcardInState`) -- funcionalmente correto em produção
(supabase-js real nunca muta o objeto JS local que foi lido antes),
mas frágil por definição: duas leituras separadas da mesma derivação,
sem garantia estrutural de que `c.revision` não muda entre elas.
Corrigido pra computar `nextRevision` UMA vez e reaproveitar nos dois
lugares -- mesmo princípio de `note`/`frontPinyinValue` (lidos do DOM
uma vez só, não relidos depois do `await`).

**Decisões arquiteturais desta sessão:**
1. `front_is_target_language`/`revision` são colunas genuinamente
   aditivas com default seguro -- nenhuma migração de dado, cartão já
   existente continua se comportando exatamente como antes (front=idioma
   estudado, id sem sufixo de revisão) até que alguém explicitamente
   inverta a direção ou edite o cartão pela primeira vez.
2. `flashcardIdForRow()` é a ÚNICA função que decide o id de um cartão de
   professora/aluna em todo o app -- reaproveitada nos 4 pontos que antes
   construíam a string manualmente (`buildCardFromTeacherFlashcard`,
   `buildCardFromSelfFlashcard`, `mergeTeacherFlashcardsIntoState`,
   `mergeSelfFlashcardsIntoState`, `addSelfFlashcardToState`) -- nunca
   duas fontes de verdade pro mesmo cálculo.
3. Direção (Prop 1+2) e formato de conteúdo (Fase 8a: imagem/áudio/MC/
   cloze) são eixos ORTOGONAIS -- um cartão cloze não tem seletor de
   direção (não existe noção de "frente"/"verso" numa lacuna), mas
   imagem/áudio continuam livres de combinar com qualquer coisa, mesmo
   comportamento de antes desta sessão.
4. `student_flashcards` (Fase 5) e `teacher_flashcards` (Fase 2+) ganharam
   as 7 propostas EM PARALELO, não uma de cada vez -- diferente do padrão
   normal desta feature (uma tabela por vez), porque as propostas da
   autora vieram sobre as duas telas juntas (ela usa as duas) e a maioria
   do código (validação, revisão, direção) já era espelhado entre elas
   desde antes.

**Gratuito x Premium (avaliado, não implementado):** nenhuma proposta
desta rodada muda o cálculo já registrado nas fases anteriores -- edição/
exclusão/direção são melhorias de UX sobre conteúdo que já existe (sem
custo marginal novo de servir); export/import é puramente client-side
(sem novo dado no servidor, só reorganiza o que já está lá). Mesma
pergunta em aberto já registrada repetidamente (limite por professora
quando houver mais de uma na plataforma) continua válida, sem mudança.

**Testes realizados:** `node --check` sem erro em
`shared/teacher-flashcards.js`, `shared/student-flashcards.js`,
`shared/admin-flashcards.js`, `shared/my-flashcards.js`, `fr/app.js`,
`zh/app.js`. Validação funcional via Playwright (fr+zh), mock
propositalmente mais rigoroso que o de fases anteriores -- linhas
retornadas por `select()` são CLONADAS (`{...r}`), não a mesma referência
do array interno do banco fake, replicando o comportamento real do
supabase-js (foi exatamente essa mudança no mock que expôs o bug de
dupla-leitura de `c.revision` acima, que um mock com referência
compartilhada mascarava). Cenários cobertos: (1) seletor de direção
visível só quando não-mandarim e não-cloze, escondido corretamente pro
zh e pro modo cloze; (2) rótulos "Frente"/"Verso" sem parênteses fixos;
(3) criação com direção invertida grava `front_is_target_language:false`
de verdade no banco; (4) lista de cartões do admin escapa HTML
corretamente (`<img src=x onerror=...>` nunca aparece cru no DOM); (5)
fluxo de edição -- modal de confirmação aparece, clicar "Sim" salva e
incrementa `revision` pra 1; (6) delete físico remove a linha do banco de
verdade; (7) lado da aluna -- seletor de direção presente em fr/ausente
em zh, criação com quebra de linha preservada, edição com o MESMO fluxo
de confirmação + `STATE.cards` refletindo o novo id com sufixo `-r1`
IMEDIATAMENTE (sem esperar reload), delete removendo de `STATE.cards`
também; (8) export/import roundtrip -- payload exportado de N cartões
importa de volta N cartões novos; import com `languageAppKey` errado
rejeitado sem gravar nada; (9) painel "⚙️ Configurar sessão" -- confirmado
sem `#review-filter-select`, botão "📇 Meus Cartões" presente dentro de
Revisão e AUSENTE do dropdown do avatar, clique navega pra "Meus
Cartões" de verdade. Validação adicional isolada da tela de Revisão
(cartão semeado direto em `STATE.cards`, sem passar pelo formulário):
modo flip invertido mostra o texto-alvo (`la bibliothèque`) com botão de
áudio e o texto nativo (`a biblioteca`) sem áudio, sem nenhuma chamada de
`speakFrench()` automática; modo múltipla escolha invertido mostra a
PERGUNTA em português (`a biblioteca`), SEM botão de áudio ao lado dela,
opções embaralhadas no idioma estudado incluindo a resposta certa, sem
nenhuma chamada de TTS automática (confirmando que a resposta nunca
vaza por áudio antes da aluna responder). Validação visual (screenshot
Playwright, fr, claro) do formulário de admin com o seletor de direção +
textareas + rótulos corrigidos -- layout limpo, sem quebra visual; zero
CSS novo introduzido nesta sessão inteira (radio group/textarea/pill
reaproveitam classes já calibradas em fases anteriores), então o risco de
regressão de contraste tema escuro é baixo, mas não foi comparado
lado-a-lado explicitamente nos 4 cenários (claro/escuro x fr/zh) desta
vez -- registrando por completude, mesmo padrão de honestidade já usado
quando outras entregas validaram só um subconjunto.

**O que ainda falta / não foi feito nesta rodada (de propósito):**
- `card.clozeSentence` continua sem `escapeHTML()` -- achado registrado
  acima, fora do escopo literal da Prop 7, candidato pra sessão futura.
- Nenhuma migração de dado pros cartões já existentes -- todos continuam
  com `front_is_target_language=true`/`revision=0` (comportamento
  idêntico a antes desta sessão).
- Export/import (Prop 6) é só pra `student_flashcards` (Meus Cartões) --
  não existe um export equivalente pro lado da professora
  (`teacher_flashcards`), não foi pedido.
- Nenhuma validação de tema escuro lado-a-lado nos 4 cenários
  obrigatórios (fr/zh x claro/escuro) -- risco considerado baixo (zero
  CSS novo), mas não confirmado visualmente desta vez.

Nenhuma migração pendente de passo manual -- a `036_flashcard_direction_
and_revision.sql` foi aplicada ao vivo nesta sessão via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg`.

## Prompt-mestre "perfil público / flashcards públicos" -- Fase 1 (identidade + progresso por idioma, sem lista de cartões ainda)

Pedido original da autora, verbatim: "Opção de tornar os flashcards
criados por você públicos ou privados no seu perfil. Quando forem
públicos, as pessoas podem adicionar os flashcards que você criou na
conta/deck delas. (privados por default) Como alguém pode entrar no seu
perfil? Clicando no seu nome no ranking. Verificar como haver no site um
/user/username para que as pessoas possam compartilhar seus perfis e,
consequentemente, disponibilizar seus flashcards. Uma espécie de 'quero
compartilhar meus flashcards com você, entre aqui no meu perfil e
adicione nos seus: Link do perfil'" -- pedido explicitamente pra "fazer
um grilling dessas propostas" antes de codar, mesma disciplina de toda
esta feature/repositório.

**Grilling completo, 2 rodadas (12 perguntas), cada uma precedida de
investigação real no código -- nunca perguntado o que já dava pra
responder lendo o repositório.** Achados relevantes ANTES de perguntar:

- `/user/username` como PATH de servidor é literalmente impossível neste
  site (GitHub Pages estático, sem rewrite) -- a única forma real é
  hash-based, `fr/#/user/username`, mesmo padrão já usado por toda a
  navegação interna (`shared/router.js`). Confirmado com a autora e
  aprovado (Q2).
- **Achado que reduziu MUITO o escopo real desta fase**: `profiles` já
  tem `profiles_public_read` (`to anon, authenticated using (true)`)
  desde a migration 001 -- ou seja, nome/@usuário/bio/avatar JÁ eram
  publicamente legíveis, inclusive sem login, desde o início do projeto
  (o comentário da própria migration 001 já antecipava essa feature
  futura). O mesmo vale pra `badge_grants`/`badge_catalog`/`earned_badges`
  (migrations 002/003/017). O modal de perfil público que abre ao clicar
  num nome no Ranking (Rank1-4, já existia) já mostrava tudo isso pra
  QUALQUER linha do ranking, sem checar nada. Ou seja: identidade e
  badges não precisavam de NENHUMA peça de segurança nova -- só
  progresso/XP/streak (que vive em `progress`, RLS owner-only) exigia
  algo novo.
- `STATE.xp`/`STATE.streak`/`STATE.lastStudyDay` são escopados POR SITE
  (cada idioma lê/grava seu próprio namespace em `progress.data[langKey]`)
  -- nunca somados entre francês e mandarim. Isso mudou o desenho final
  do perfil público: um card POR IDIOMA (com sua própria barra/XP/streak),
  nunca um número único combinado.

**Perguntas e respostas do grilling (resumo -- as 12 completas, com a
recomendação numerada de cada uma, estão no histórico desta sessão):**
1. Interruptor de privacidade: **conta inteira** (`profiles.public_profile`,
   default `false` -- privado por padrão) + **cada cartão próprio** ganha
   um botão de esconder individual, no lugar onde já fica o botão de
   Arquivar. Cascata: conta privada = todo cartão implicitamente escondido;
   conta pública = todo cartão público, EXCETO os marcados
   individualmente como escondidos. Nunca o contrário.
2. Conteúdo do perfil público: foto, nome, conquistas (já existia via
   Rank1-4) + **XP ACUMULADO** (trocado de "XP da semana", que já dá pra
   ver no Ranking) + **progresso e streak por idioma** (novo).
3. Ver/adicionar cartões de alguém exige login -- "Faça o login pra ver
   os cartões e adicionar ao seu perfil" com fundo embaçado. **Não
   implementado nesta fase** (ver "O que fica pra Fase 2" abaixo).
4. Reaproveitar o mesmo modal/página do perfil público com um botão "Ver
   cartões criados pelo usuário", multi-select com Selecionar
   todos/Limpar seleção pra importar. **Não implementado nesta fase**
   (mesma razão do item 3).
5. Popup de limite ao tentar importar acima do teto do plano grátis, com
   link pra uma pág de upgrade (Stripe/pagamento) que ainda não existe --
   "vamos adicionar isso agora após essa tarefa". **Fica pra uma Fase 3
   futura, explicitamente fora desta entrega** -- não presumir que
   infraestrutura de pagamento existe (ver seção "Considerar plano
   gratuito x premium" no topo deste arquivo).
6. Botão de reportar problema no perfil público de alguém: aprovado,
   **não implementado nesta fase** (cai na mesma Fase 2 da lista de
   cartões, já que reportar é sobre um cartão específico da lista).
7. Cartão importado guarda só uma REFERÊNCIA-cópia -- editar o cartão
   original depois de já ter sido importado NÃO altera a cópia já salva
   na conta de quem importou (vira, na prática, um cartão novo e
   independente a partir da importação). Decisão de design confirmada,
   implementação fica pra Fase 2.
8. XP/streak no perfil público: **por idioma**, nunca somado -- confirma
   o achado técnico acima.
9. Card de idioma só aparece se `pct > 0` -- "se a pessoa só estuda
   francês, mostrar só a barra de francês". Confirmado explicitamente
   depois que eu sinalizei a diferença entre isso e o layout ATUAL do
   perfil privado (que separa streak+XP combinados de uma lista de barras
   por idioma) -- a autora aprovou o design novo e mais coerente ("esconda
   o XP e streak de idiomas com progresso zero; se houver progresso, esse
   idioma ganha seu cartão com barra + XP + streak").
10-12. Detalhes de UI adicionais do botão "ver cartão como se fosse
   editar, sem poder editar" (Q11) -- fica pra Fase 2 (é sobre a LISTA de
   cartões, não implementada ainda).

**Fatiamento em 3 fases proposto e autorizado ("Pode seguir para a fase
1")**: Fase 1 = modelo de dados + identidade/progresso público (esta
entrega). Fase 2 = lista de cartões + importação + gate de login + popup
de reportar. Fase 3 = integração com pagamento/Stripe quando essa
infraestrutura existir. Mesmo padrão de fatiamento por autorização
explícita já usado em toda a feature de alunas particulares.

**O que foi feito (Fase 1):**

- **Migration `037_public_profile.sql`** -- `profiles.public_profile
  boolean not null default false` (interruptor mestre, grillado como
  privado por padrão) + `student_flashcards.hidden_from_profile boolean
  not null default false` (exceção por cartão, só tem efeito quando a
  conta já é pública) + function `get_public_profile_stats(p_username)`
  SECURITY DEFINER, mesmo padrão de `get_teacher_student_metrics`
  (migration 029, Fase 6a da feature de alunas particulares): checa
  `public_profile=true` ELA MESMA antes de tocar em qualquer dado,
  devolve só agregados (`pct`/`levelLabel`/`xp`/`streak`/`lastStudyDay`
  por idioma, nunca resposta/histórico granular), só inclui um idioma se
  `pct>0`. Reaproveita o campo `progressSummary` que `serializeState()`
  já grava em todo save (não recalcula % em SQL). **Diferença chave em
  relação a `get_teacher_student_metrics`**: esta é a única function
  SECURITY DEFINER da plataforma concedida também a `anon` (`grant
  execute ... to anon, authenticated`) -- precisa funcionar SEM login,
  já que a página em si funciona sem login (ver abaixo). RLS de
  `progress` continua sem nenhuma policy nova. Aplicada AO VIVO nesta
  sessão via `mcp__Supabase__apply_migration`, projeto
  `eigjocalzwamisgqilhg` -- não é passo manual pendente pra autora.
- **`shared/srs.js`** -- `effectiveStreak()` refatorado em
  `effectiveStreakFor(streak, lastStudyDay)` (mesma regra de "streak
  vivo" -- hoje ou ontem = vivo, senão 0 -- já usada pro streak da
  própria conta desde o bugfix registrado na seção "Streak (🔥)...
  ficava CONGELADO" acima) + `effectiveStreak()` que chama a nova função
  com `STATE.streak/STATE.lastStudyDay`. Reaproveitada agora também pro
  streak de OUTRA conta (par bruto devolvido pela RPC) -- nunca duplicar
  a mesma data-math em dois lugares.
- **`shared/public-profile.js`** (novo) -- `fetchPublicProfileByUsername(username)`
  (busca `profiles` + badges de identidade/gameplay via as funções já
  existentes em `shared/leaderboard.js`/`shared/profile.js` + a RPC de
  stats), `renderPublicProfileInto(bodyEl, username)` (container-agnóstico
  -- preenche TANTO o modal (`#public-profile-modal-body`) QUANTO a
  página standalone (`#public-profile-page-body`), nunca duas
  implementações de render), `openPublicProfileModalForUsername(username)`
  (usada de dentro do app, logada ou convidada) e
  `renderStandalonePublicProfile(username)` (usada quando NÃO há sessão
  nem modo convidado). `publicProfileUsernameFromHash()` extrai o
  username de `#/user/<username>`. Token de corrida por container
  (`WeakMap`, um por `bodyEl`) -- clicar rápido em 2 nomes diferentes no
  Ranking não deixa a resposta do primeiro sobrescrever o conteúdo do
  segundo.
- **`shared/auth.js`** -- `initAuth()` ganhou um desvio, só no ramo "sem
  sessão E sem modo convidado": se o hash bate `#/user/username`, chama
  `renderStandalonePublicProfile()` em vez de `goToNeutralGate()`.
  Primeira vez que qualquer tela deste app precisa funcionar pra um
  visitante totalmente anônimo (sem conta, sem modo convidado) -- link de
  perfil compartilhado por outra pessoa. Qualquer outra rota interna
  continua exigindo login/convidado como sempre.
- **`shared/router.js`** -- rota nova `{type:'publicProfile', username}`
  (`#/user/<username>` ↔ hash), mesma estrutura de `unit`/`unitResult` já
  existentes. `renderRoute()` chama `openPublicProfilePage(username)`
  (shared/public-profile.js) -- que hoje só abre o MESMO modal do Ranking
  por cima do que já estava na tela (nunca troca de aba por baixo), pra
  um F5 em cima de `#/user/x` com sessão ativa restaurar corretamente.
- **`fr/index.html`+`zh/index.html`** -- `#public-profile-standalone`
  (novo, FORA de `#app`, ao lado de `#login-screen`) com
  `#public-profile-page-body` + um rodapé "Criar minha conta →". CSS
  novo: `.public-profile-lang-card`/`.public-profile-lang-stats` (card
  por idioma, estende `.profile-lang-card`/etc. já existentes com
  XP+streak embutidos) e `.public-profile-page`/`.public-profile-page-inner`/
  `.public-profile-page-footer` (moldura da página standalone) --
  zero token de cor novo, só `var(--paper)`/`var(--paper-warm)`/
  `var(--paper-line)`/`var(--ink-soft)`/`var(--seal-red-dark)`/
  `var(--shadow-lift)`/`var(--radius)` já calibrados. Script tag de
  `shared/public-profile.js` adicionado logo depois de
  `shared/leaderboard.js` (de quem depende) e antes de `shared/auth.js`
  (que o chama).
- **`shared/leaderboard.js`** -- o modal antigo (`openPublicProfileModal(row,
  catalog)`, mostrava posição+XP da semana do Ranking) foi REMOVIDO --
  substituído por uma chamada a `openPublicProfileModalForUsername(username)`
  no clique da linha (agora com identidade+badges+progresso/XP
  acumulado/streak por idioma, conforme Q2 do grilling). `PUBLIC_PROFILE_MODAL_TOKEN`
  (guard de corrida antigo) também removido -- o guard equivalente agora
  vive dentro de `renderPublicProfileInto` (WeakMap por container, ver
  acima).
- **`shared/profile.js`** -- `saveProfileEdits()` ganhou o parâmetro
  `publicProfile`, gravado como `profiles.public_profile`.
  `openEditProfileModal()` inicializa um novo `.pref-switch` ("Perfil
  público", mesma classe já usada por Modo escuro/Cloze/Som -- zero CSS
  novo) a partir de `p?.public_profile`. O switch só ALTERA visualmente
  (`aria-checked`) no clique -- só é lido e persistido junto com nome/
  username/bio no Salvar do formulário, mesmo padrão dos outros campos
  deste modal (diferente de Modo escuro/Admin Mode, que salvam na hora,
  fora de um form).
- **`shared/student-flashcards.js`** -- `setOwnFlashcardHidden(id, hidden)`
  (novo), grava `student_flashcards.hidden_from_profile`. Eixo
  DELIBERADAMENTE separado de `status` (active/archived, que decide fila
  de revisão) -- um cartão pode estar ativo na revisão mas escondido do
  perfil, ou arquivado mas ainda visível no perfil, os dois nunca se
  misturam.
- **`shared/my-flashcards.js`** -- botão de olho (👁️ visível / 🙈
  escondido) adicionado na linha de cada cartão, **ao lado do botão de
  Arquivar** (posição pedida explicitamente no grilling Q1, não em cima
  dele). Nenhuma atualização em `STATE.cards` precisa acontecer ao
  clicar -- diferente de arquivar/apagar/criar (que afetam a fila de
  revisão via `addSelfFlashcardToState`/etc.), esconder do perfil não
  toca em FSRS/revisão de forma alguma, só no dado que
  `renderPublicProfileInto` vai ler quando a Fase 2 existir.

**Decisões arquiteturais desta fase:**
1. Identidade (nome/@usuário/bio/avatar) e badges continuam SEMPRE
   públicos pra qualquer username existente, independente de
   `public_profile` -- não é uma peça nova desta fase, é um fato do RLS
   desde o dia 1 (ver achado acima), só agora reaproveitado numa tela
   nova. Só progresso/XP/streak fica atrás do interruptor.
2. `get_public_profile_stats` é a ÚNICA porta de leitura de `progress`
   pra outra conta -- nenhuma RLS policy declarativa nova na tabela (ela
   continua absolutamente owner-only), mesmo princípio já validado na
   Fase 6a da feature de alunas particulares.
3. O modal do Ranking (Rank1-4) e a página standalone (`#/user/username`
   sem sessão) renderizam o MESMO conteúdo através da MESMA função
   (`renderPublicProfileInto`) -- nunca duas implementações divergentes
   do "perfil público" dentro do mesmo app.
4. `hidden_from_profile` é um eixo NOVO e INDEPENDENTE de `status`
   (Fase 2/3/5 do sistema de alunas particulares) -- reforça o padrão já
   estabelecido nesta feature inteira de nunca misturar dois conceitos
   diferentes numa coluna só.

**Gratuito x Premium (avaliado, não implementado):** a pergunta mais
concreta já registrada é a do próprio grilling (item 5 acima) -- teto de
importação de cartões alheios acima de um limite do plano grátis, com
link pra uma futura página de upgrade/Stripe. **Não implementado nesta
fase** de propósito -- não existe infraestrutura de pagamento nenhuma no
código ainda (mesma regra do topo deste arquivo), e a própria lista de
cartões pra importar (onde esse limite se aplicaria) é Fase 2, não Fase
1. A visibilidade do perfil em si (público/privado) não tem nenhuma razão
pra virar premium -- é controle de privacidade, não uma feature paga.

**Testes realizados:** `node --check` sem erro em todos os arquivos
tocados (`shared/srs.js`, `shared/public-profile.js`, `shared/router.js`,
`shared/auth.js`, `shared/leaderboard.js`, `shared/profile.js`,
`shared/my-flashcards.js`, `shared/student-flashcards.js`). Validação
funcional via Playwright (fr+zh), stub de `window.supabase.createClient()`
mesmo padrão de toda a feature: (1) **visitante anônimo, perfil público
com progresso** -- `#public-profile-standalone` visível,
`#login-screen` escondido, nome/@usuário renderizados, card de francês
com `A1 · 42%`/`🔥 3`/`120` XP batendo com o mock; (2) **visitante
anônimo, perfil PRIVADO** -- mensagem "optou por manter o progresso
privado" mostrada, ZERO card de idioma renderizado, e confirmado que o
XP/streak reais daquela conta (999/99, propositalmente distintos no
mock) NUNCA aparecem em lugar nenhum do DOM -- a barreira de segurança
é real, não só teórica; (3) **username inexistente** -- "Perfil não
encontrado"; (4) mesmo cenário (1) validado em zh também; (5) **logada,
clique equivalente ao do Ranking** -- `openPublicProfileModalForUsername()`
abre o modal com o mesmo conteúdo (identidade+progresso), fecha
corretamente; (6) **toggle "Perfil público" no Editar Perfil** -- estado
inicial `false`, clique muda visualmente pra `true`, salvar grava
`public_profile:true` de verdade no banco fake, reabrir o modal confirma
o estado persistido (leu de `PROFILE_CACHE` atualizado); (7) **botão de
olho em Meus Cartões** -- ícone inicial 👁️, clique grava
`hidden_from_profile:true` no banco e troca o ícone pra 🙈, clique de
novo reverte os dois. Sem erro de console novo atribuível a este código
(mesmo `pageerror` de `.is()` já registrado repetidas vezes nesta feature
como limitação de mock em chamadas de fundo não relacionadas --
notificações --, não deste código). Validação visual (screenshot
Playwright, claro+escuro) da página standalone confirma legibilidade nos
dois temas -- esperado, zero cor nova introduzida, só tokens já
calibrados.

**O que ainda falta / não foi feito nesta fase (de propósito, é Fase 2
ou 3):**
- **Fase 2 inteira**: lista de cartões públicos de alguém, gate de login
  pra ver/importar (fundo embaçado + "Faça login pra ver os cartões"),
  multi-select com Selecionar todos/Limpar seleção pra importar, botão
  de reportar um cartão específico, botão "ver como se fosse editar,
  sem poder editar". `hidden_from_profile` já existe no schema e já tem
  UI pra marcar (esta fase), mas nada ainda LÊ esse campo pra filtrar
  uma lista -- porque a lista em si não existe ainda.
- **Fase 3**: popup de limite de importação + link de upgrade/Stripe --
  não existe conceito de plano pago no código ainda, nem faria sentido
  antes da Fase 2 existir (não há o que importar em excesso sem a lista).
- Nenhuma mudança em `STATE.cards`/FSRS/fila de revisão -- confirmado
  intacto, esta fase inteira é sobre identidade/visibilidade, não
  conteúdo de estudo.

Nenhum passo manual pendente pra autora nesta entrega -- as duas
migrations desta sessão (`036` reconstruída/salva no repo, `037` nova)
já foram aplicadas ao vivo via `mcp__Supabase__apply_migration`.

Próxima fase (2 -- lista de cartões + importação) só começa depois de
autorização explícita da autora, com este relatório já entregue antes de
pedir luz verde.

**Atualização: autorizada e entregue (2026-09-23, mesmo dia), "Siga para
a próxima fase".**

## Fase 2 (lista de flashcards públicos + importação, gate de login, preview, report)

Cobre os itens explicitamente adiados na Fase 1: lista de cartões
PRÓPRIOS (`student_flashcards`, `origin:'self'`) de um perfil público,
atrás de um gate de login (Q3), multi-select com Selecionar todos/Limpar
seleção (Q4), importação como cópia independente (Q7), botão de
pré-visualizar sem editar (Q11) e botão de reportar (Q6). Fase 3 (popup
de limite com link de upgrade/Stripe) continua fora do escopo -- sem
infraestrutura de pagamento no código ainda.

**O que foi feito:**

- **Migration `038_public_profile_flashcards.sql`** -- function
  `get_public_flashcards(p_username, p_language_app_key)`, mesmo padrão
  SECURITY DEFINER de `get_public_profile_stats` (Fase 1)/
  `get_teacher_student_metrics` (Fase 6a da feature de alunas
  particulares): checa `public_profile=true` ela mesma antes de tocar em
  qualquer linha, devolve só os campos necessários pra exibir/importar um
  cartão (`front`/`frontPinyin`/`backTrans`/`note`/
  `frontIsTargetLanguage`), nunca a linha inteira. Filtra
  `status='active'` e `hidden_from_profile=false` (cascata da Fase 1: só
  o que a própria dona não escondeu individualmente) e por
  `language_app_key` -- um visitante em `fr/#/user/x` só pode ver/
  importar cartões de francês daquela pessoa, nunca os de mandarim que
  ela possa ter em outra conta/site (mesma regra que a importação manual
  via arquivo/link, Prop 6 do prompt-mestre "7 propostas", já aplicava).
  Concedida a `anon` também (mesmo motivo da 037 -- a página standalone
  chama o mesmo código, mesmo que na prática o cliente só invoque isto
  depois de confirmar login). RLS de `student_flashcards` continua
  intocada (owner-only, migration 028). Aplicada AO VIVO nesta sessão via
  `mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg` --
  não é passo manual pendente pra autora.
- **`shared/public-profile.js`** estendido -- `renderPublicProfileInto()`
  ganhou uma seção "Flashcards" (só quando `isPublic===true`, mesmo
  raciocínio da seção de Progresso: conta privada esconde tudo, não só
  as estatísticas) com um botão "📇 Ver cartões criados por @username"
  que expande uma caixa carregada sob demanda (busca só na primeira
  abertura, mesmo padrão de custo de rede já usado no painel de métricas
  da Fase 6a).
  - **Gate de login (Q3)**: `!CURRENT_USER` cobre os 3 estados possíveis
    dessa variável (`null` na página standalone, `false` em modo
    convidado, objeto quando logada de verdade) com uma única checagem --
    tanto visitante anônimo quanto convidado caem no gate, porque nenhum
    dos dois tem uma conta real em que gravar a cópia importada. Mostra
    linhas fictícias borradas (`filter:blur`) atrás de um cartão
    centralizado "🔒 Faça login para ver os cartões e adicionar ao seu
    perfil" + link `../` (mesmo link já usado no rodapé "Criar minha
    conta" da Fase 1). **Nenhuma chamada de rede acontece nesse caminho**
    -- a checagem é 100% client-side, antes de `fetchPublicFlashcardsByUsername`
    ser sequer chamada (confirmado no teste: `get_public_flashcards`
    nunca aparece nas chamadas de RPC quando o gate está ativo).
  - **Multi-select (Q4)**: reaproveita 100% o par
    `.admin-recipients-summary`/`.admin-recipients-actions`/
    `.admin-select-link` já calibrado em `shared/admin-flashcards.js`
    (Fase 3 do prompt-mestre "reestruturação do formulário de
    flashcards") -- zero CSS novo pro toolbar. Contador
    ("Nenhum cartão selecionado"/"N cartão(ões) selecionado(s)"),
    "Selecionar todos"/"Limpar seleção", botão de importar desabilitado
    com 0 selecionados.
  - **Importação (Q7)**: `importSelectedPublicFlashcards()` chama
    `createOwnFlashcard()` (já existente desde a Fase 5 do sistema de
    alunas particulares) uma vez por cartão selecionado -- sempre cria
    uma linha NOVA e independente na conta de quem importa, nunca uma
    referência viva ao cartão original (confirmado no grilling: editar o
    original depois não altera a cópia). `addSelfFlashcardToState()`
    chamado a cada sucesso, mesmo motivo de sempre -- sem isso o cartão
    só entraria na fila de revisão no próximo carregamento do app, não
    nesta mesma sessão.
  - **Teto de 20 cartões (Fase 5.1) respeitado na importação** -- decisão
    minha, não pedida explicitamente no grilling da Fase 1 (que só falou
    do popup de upgrade, adiado pra Fase 3), mas necessária por
    coerência: importar é só mais uma forma de CRIAR um cartão próprio,
    então precisa respeitar o MESMO limite que criar manualmente em
    "Meus Cartões" já respeita (`FREE_OWN_FLASHCARD_LIMIT`/
    `hasActiveTeacherLink()`, ambos reaproveitados sem nenhuma mudança).
    Se a seleção excede o espaço restante, a importação inteira é
    bloqueada ANTES de criar qualquer cartão (nunca uma importação
    parcial) e reabre o MESMO popup `#flashcard-limit-modal` já usado em
    Meus Cartões -- nenhum popup novo, nenhuma menção a upgrade/Stripe
    (esse texto mais rico fica pra Fase 3, quando essa infraestrutura
    existir).
  - **Preview sem editar (Q11)**: `openPublicFlashcardPreview()`, modal
    novo (`#public-flashcard-preview-modal`, fr+zh `index.html`) com
    campos totalmente estáticos (`<p>`, nunca `<input>`/`<textarea>`) --
    Frente, Pinyin (só quando existe), Verso, Nota (só quando existe),
    Direção. Reaproveita `.profile-edit-label` como rótulo, zero CSS
    novo.
  - **Reportar (Q6)**: `reportPublicFlashcard()` chama
    `openReportModal({source:'public_profile_flashcard',
    flashcard_owner_username, flashcard_front, flashcard_back})` --
    reaproveita o sistema de report global já existente
    (`shared/reports.js`) sem NENHUMA mudança lá, só um `source` novo e
    o conteúdo do cartão como contexto extra (o mecanismo já suporta
    isso via `Object.assign` no `extraContext`, desenhado desde o
    "projeto Report global" justamente pra aceitar contexto arbitrário
    do chamador).

**Decisões arquiteturais desta fase:**
1. `public_profile` continua sendo o ÚNICO interruptor -- não criei um
   segundo campo tipo "cartões públicos" separado de "perfil público".
   A cascata já travada na Fase 1 (conta pública = tudo público exceto o
   marcado individualmente como escondido) vale igual pra identidade,
   progresso E cartões.
2. `get_public_flashcards` nunca devolve `id` como algo sensível (é só
   um inteiro sequencial, sem valor de exploração), mas devolve só os
   campos que a UI realmente precisa pra exibir/copiar um cartão -- nunca
   `student_id`/`created_at`/`status`/`hidden_from_profile` (esses
   últimos dois, inclusive, são exatamente os campos que decidem se o
   cartão aparece ali pra começo de conversa -- não fazia sentido
   devolvê-los de novo pro cliente).
3. O botão "Ver cartões" e toda a seção só existem quando `isPublic`
   (calculado a partir da MESMA resposta de `get_public_profile_stats`
   já buscada pra seção de Progresso) -- evita uma consulta extra
   (`get_public_flashcards`) a um perfil que já se sabe ser privado, e
   mantém as duas seções (Progresso/Flashcards) sempre consistentes
   entre si sem duas fontes de verdade sobre "este perfil é público?".
4. Teto de 20 cartões (ver acima) tratado como parte natural desta fase,
   não como a Fase 3 antecipada -- Fase 3 é especificamente sobre a
   PARTE PAGA (link de upgrade, texto sobre plano), o limite em si já
   existia desde a Fase 5.1 e só precisava ser respeitado neste novo
   caminho de criação de cartão.

**Gratuito x Premium (avaliado, não implementado):** mesma conclusão da
Fase 1 -- nenhuma peça nova desta fase muda o cálculo. A única
alavanca concreta continua sendo o teto de cartões próprios (já
existente desde a Fase 5.1, só estendido pra este novo caminho, ver
acima) -- a Fase 3 (popup com link de upgrade/Stripe) é onde essa
alavanca ganharia uma saída de monetização de verdade, ainda sem
infraestrutura de pagamento no código.

**Testes realizados:** `node --check` sem erro em
`shared/public-profile.js`. Validação funcional via Playwright (fr+zh),
mesmo padrão de stub de `window.supabase.createClient()` de toda a
feature, estendido com um mock de `get_public_flashcards`: (1)
**visitante anônimo (página standalone)** -- gate mostrado com fundo
embaçado + link de login, e confirmado que `get_public_flashcards`
NUNCA é chamada nesse caminho (`A_noCardsRpcCalled`); (2) **logada,
lista filtrada corretamente** -- de 4 cartões semeados (2 visíveis, 1
`hidden_from_profile:true`, 1 `status:'archived'`), só os 2 corretos
aparecem no DOM, os outros 2 confirmados ausentes
(`B_hiddenRowAbsent`/`B_archivedRowAbsent`); "Selecionar todos"/"Limpar
seleção" atualizam contador e estado do botão de importar
corretamente; (3) **preview (Q11)** -- modal mostra frente/nota
corretos, fecha corretamente; (4) **reportar (Q6)** -- modal de report
abre com `source:'public_profile_flashcard'` e o front do cartão certo
no contexto; (5) **importação bem-sucedida** -- 1 cartão selecionado e
importado grava de verdade no banco fake
(`E_dbCountAfterImport===1`) E entra em `STATE.cards` imediatamente
com `origin:'self'` (`E_stateCardsHasImported`), sem esperar reload;
(6) **teto de 20 respeitado** -- com 19 cartões próprios ativos já
existentes, selecionar 2 cartões públicos (19+2=21>20) abre o popup de
limite e NÃO grava nada (`F_dbCountUnchanged`); reduzir a seleção pra 1
(19+1=20) permite a importação, banco confirma 20 cartões depois
(`F_dbCountAfterAllowedImport`); (7) **vínculo com professora = sem
teto** -- com 25 cartões próprios já existentes e vínculo ativo,
importar 2 cartões funciona normalmente e o popup de limite nunca abre
(`G_dbCountAfterImport===27`, `G_limitModalStayedHidden`); (8)
**perfil privado -- nem o botão aparece** -- confirmado
`#public-profile-cards-toggle-btn` ausente do DOM quando
`public_profile=false` (`H_noCardsButton`). Testado nos dois idiomas
(fr completo, zh com o cenário núcleo -- botão + gate -- confirmado sem
erro de console). Sem erro de console novo atribuível a este código
(mesmos `pageerror` de mock -- `.is()`/`.upsert()` -- já registrados
repetidas vezes nesta feature, chamadas de fundo não relacionadas).
Validação visual (screenshot Playwright, fr, claro+escuro) do estado de
gate (fundo embaçado + cartão de login) confirma legibilidade nos dois
temas -- esperado, zero cor nova introduzida (`--paper`/`--paper-line`/
`--shadow-lift`/`--ink`, todos já calibrados).

**O que ainda falta / não foi feito nesta fase (de propósito, é Fase 3
ou fora do escopo original):**
- **Fase 3**: popup de limite com link de upgrade/Stripe -- continua
  reaproveitando o popup genérico já existente (Fase 5.1), sem menção a
  pagamento, porque essa infraestrutura não existe no código ainda.
- Edição/exclusão de um cartão IMPORTADO segue as mesmas regras que
  qualquer outro cartão próprio em "Meus Cartões" (Prop 4 do
  prompt-mestre "7 propostas") -- nada novo criado aqui, a cópia
  importada é indistinguível de um cartão criado manualmente depois que
  a importação termina.
- Nenhuma notificação/aviso pro dono original do cartão avisando que
  alguém importou uma cópia dele -- não foi pedido, e o design de
  "cópia independente" (Q7) nem precisaria disso pra funcionar
  corretamente.
- `note` é copiado junto na importação (mesmo campo que `createOwnFlashcard`
  já aceita) -- decisão minha, não detalhada no grilling, mas
  consistente com o que Prop 6 (export/import manual via arquivo/link)
  já fazia antes desta fase.

Nenhum passo manual pendente pra autora nesta entrega -- a migration
`038` já foi aplicada ao vivo via `mcp__Supabase__apply_migration`.

Com a Fase 2 entregue, o prompt-mestre "perfil público / flashcards
públicos" original está com todo o escopo grillado (Fases 1 e 2)
completo -- só a Fase 3 (integração com pagamento/Stripe) continua em
aberto, explicitamente bloqueada até essa infraestrutura existir de
verdade no produto, não porque falta trabalho de UI.

## Prompt-mestre "reformulação gratuito x premium" -- infraestrutura de plano
(sem cobrança real), valor concreto = formatos ricos em cartão próprio

Pedido da autora: "Confirme se está tudo funcionando na produção e siga
para a fase 3" -- referência à Fase 3 do prompt-mestre "perfil público"
(pagamento/Stripe, registrada acima como explicitamente bloqueada até
existir infraestrutura de assinatura). Antes de tocar em código de
pagamento, grillado em 3 rodadas (`AskUserQuestion`) porque essa fase
cruza uma linha que nenhuma anterior cruzou -- é a primeira vez que este
produto toca dinheiro de verdade, e o CLAUDE.md já travava explicitamente
"não presumir infraestrutura de assinatura/pagamento" (ver seção
"Considerar plano gratuito x premium" no topo deste arquivo).

**Confirmação de produção, feita antes do grilling**: deploy do commit
mais recente (`07bee67`, Fase 2 do perfil público) confirmado com
`conclusion:"success"` no workflow "Deploy to GitHub Pages" (GitHub
Actions) + migrations `037`/`038` confirmadas ao vivo no Supabase
(`list_migrations`) + colunas/functions novas confirmadas existindo de
verdade no banco real (`execute_sql`). Curl direto em
`app.profbrune.com.br` continua bloqueado pelo proxy de saída deste
sandbox (mesma limitação já documentada neste arquivo pra domínios
externos) -- as duas confirmações acima (Actions + Supabase) são o
substituto real dessa vez.

**Rodada 1 do grilling -- decisões**: Stripe como provedor (quando
integração real existir); "redesenhar do zero" o desenho de gratuito x
premium em vez de só remendar o teto de 20 cartões já existente (Fase
5.1); só infraestrutura nesta entrega, **nenhuma cobrança real ainda**.

**Rodada 2 -- decisões**: cliente pagante = **qualquer conta registrada**
(não só quem tem vínculo pedagógico formal com uma professora -- hoje 11
pessoas vinculadas via "🎓 Alunos", de um total maior de contas
registradas no app; a autora corrigiu explicitamente uma confusão minha
de terminologia aqui, ver abaixo); auditoria completa feature por
feature antes de fixar a alavanca (conclusão: só a categoria de AUTORIA/
CAPACIDADE PESSOAL de conteúdo -- "Meus Cartões", Fase 5 -- tem uma razão
real pra virar alavanca de monetização; todo o núcleo pedagógico --
trilha, FSRS, notas de realidade/cultura, badges, ranking -- fica sempre
grátis, e ferramentas do lado da professora ficam fora do escopo desta
fase, que é especificamente o eixo "aluno individual", não o eixo
hipotético "professora-inquilina/multi-tenant"); um único nível pago
(binário free/premium, sem tiers).

**Correção de terminologia da autora, registrada explicitamente porque
quase contaminou o desenho inteiro**: eu usei "21 alunas" pra descrever o
universo de contas na Rodada 2, misturando dois conceitos que o CLAUDE.md
já distinguia em seções anteriores (migration 024) mas que eu mesmo
confundi na hora de perguntar -- "aluna" no sentido da feature de alunas
particulares é só quem está EXPLICITAMENTE vinculada no Painel de Admin
("🎓 Alunos", `teacher_students`, vínculo ativo -- **11 pessoas hoje**,
confirmado pela autora); "usuária"/conta registrada é qualquer perfil no
app (`profiles`, nasce com `role='student'` só pra dizer "não é admin",
sem nenhuma relação com vínculo pedagógico -- o "21" que citei era esse
número). A resposta da Rodada 1 ("aluno individual paga por si mesma") já
implicava a resposta certa (qualquer conta, não só as 11 vinculadas), mas
a pergunta como formulada por mim poderia ter travado o desenho errado se
ela não tivesse corrigido -- registrado aqui pra não se repetir.

**Rodada 3 -- decisões**: vínculo com professora continua isentando do
TETO DE QUANTIDADE de cartões próprios (Fase 5.1, ninguém perde o que já
tem hoje) -- Premium é um eixo NOVO e SEPARADO cujo valor real é
desbloquear FORMATOS RICOS (imagem/áudio/múltipla escolha/completar
frase) em cartão próprio, algo que nenhuma conta tem hoje mesmo com
vínculo; ativação manual via botão no Painel de Admin (sem checkout
Stripe ainda); todas as contas existentes começam `'free'` por padrão,
sem grandfathering.

**O que foi feito:**

- **Migration `039_add_plan_tier_to_profiles.sql`** -- `profiles.plan_tier
  text not null default 'free' check (plan_tier in ('free','premium'))`.
  Aditiva/sem risco, mesmo padrão de `profiles.role` (migration 024) --
  nenhuma conta muda de comportamento com esta migration. Aplicada AO
  VIVO nesta sessão via `mcp__Supabase__apply_migration`, projeto
  `eigjocalzwamisgqilhg` -- não é passo manual pendente pra autora.
- **Migration `040_student_flashcards_rich_formats.sql`** -- as mesmas
  colunas que `teacher_flashcards` já tinha desde a Fase 8a/8c
  (`image_url`/`audio_url`/`choices`/`cloze_sentence`/`cloze_answer`/
  `cloze_answer_pinyin`) replicadas em `student_flashcards` (que nunca
  tinha ganho esses formatos -- Fase 8a/8c registraram isso
  explicitamente como "fora do escopo, fase futura"), + `front` vira
  nullable (mesmo motivo/mesma migration-irmã de
  `allow_null_front_teacher_flashcards`, 035 -- cartão cloze não tem
  front tradicional). Aplicada AO VIVO nesta sessão -- não é passo manual
  pendente.
- **`shared/roles.js`** -- `fetchMyPlanTier()`/`isPremium()` (eixo NOVO,
  separado de `hasActiveTeacherLink()` -- ver Rodada 3 acima, os dois
  podem coexistir independentemente numa mesma conta), `setPlanTier(userId,
  tier)` (ativação/remoção manual, só chamada do Painel de Admin),
  `searchAnyProfileByUsername(username)` (busca QUALQUER conta por
  @username, com select próprio incluindo `plan_tier` -- diferente de
  `resolveProfileByUsername()` de `admin-badges.js`, que os outros
  chamadores não precisam desse campo extra).
- **`shared/student-flashcards.js`** -- `createOwnFlashcard()` estendido
  com `imageUrl`/`audioUrl`/`choices`/`clozeSentence`/`clozeAnswer`/
  `clozeAnswerPinyin` (mesma validação de `_validateFlashcardContent` de
  `teacher-flashcards.js`, copiada aqui de propósito -- mesmo padrão de
  duplicação intencional já usado nas telas de admin, não uma tentativa
  de compartilhar módulo novo). Nova `uploadOwnFlashcardMedia(file,
  kind)` -- reaproveita o MESMO bucket `flashcard-media` (migration 032)
  que já era "qualquer autenticado, restrito à própria pasta" -- nunca
  escopado a professora --, então funcionou pra cartão próprio sem
  nenhuma migração de Storage nova, só um prefixo `self-` no path pra
  facilitar auditoria manual do bucket.
- **`shared/my-flashcards.js`** -- formulário "Meus Cartões" ganhou o
  radio group "Modo de prática" (flip/mc/cloze) + campos de imagem/áudio,
  só renderizados quando `isPremium()===true`; conta free vê uma única
  linha de aviso honesto ("🔒 Premium desbloqueia imagem, áudio, múltipla
  escolha e completar a frase... Fale com a administração pra ativar" --
  nunca promete um checkout que não existe) no lugar dos controles, sem
  nenhuma mudança no formulário básico que já tinha (frente/verso/nota
  continuam funcionando exatamente como antes pra qualquer conta). Escopo
  deliberadamente mais simples que `shared/admin-flashcards.js`
  (destinatário-múltiplo, validação por campo com blur) -- aqui é sempre
  "pra mim mesma", então a validação roda só no submit, mesmo nível de
  rigor de `createOwnFlashcard()` server-side.
- **`fr/app.js`/`zh/app.js`** -- `buildCardFromSelfFlashcard()` ganhou os
  mesmos 4-5 campos que `buildCardFromTeacherFlashcard()` já tinha desde
  a Fase 8a/8c. **Nenhuma mudança no motor de revisão** --
  `renderReviewView()`/`buildSpeedOptions()`/`hasPlainFrontBack()` já
  eram origin-agnósticos (checam `card.choices`/`card.clozeSentence`
  direto, nunca `card.origin`), confirmado por leitura antes de escrever
  qualquer linha nova -- a mesma aposta arquitetural "um motor só"
  validada em cada fase anterior desta feature (alunas particulares)
  paga o dividendo de novo aqui, dessa vez pra origem `'self'`.
- **`shared/admin-premium.js`** (novo) + nova subseção "⭐ Premium" no
  Painel de Admin (fr+zh, ao lado de "📚 Material de apoio"): busca por
  @username (`searchAnyProfileByUsername` -- funciona pra QUALQUER
  conta, vinculada ou não, diferente de "🎓 Alunos" que só lista quem já
  tem vínculo formal) + botão "Tornar Premium"/"Remover Premium". Sem
  listagem de "todas as contas" -- não existe isso em nenhum lugar do
  admin hoje e construir um navegador de usuários seria escopo maior que
  o pedido ("botão no Painel de Admin", não um CRM de usuários).

**Decisões arquiteturais desta fase:**
1. `plan_tier` e `hasActiveTeacherLink()` (vínculo) são dois eixos
   ORTOGONAIS que ambos podem "desbloquear coisa" em Meus Cartões, mas
   nunca a MESMA coisa -- vínculo isenta do teto de QUANTIDADE (Fase
   5.1, inalterado), Premium desbloqueia FORMATOS (novo). Uma conta pode
   ter os dois, um só, ou nenhum -- os dois selos aparecem juntos quando
   aplicável (`tierBadgeHTML` em `my-flashcards.js`).
2. Reaproveitar o bucket `flashcard-media` já existente (em vez de criar
   um novo escopado a "cartão próprio") funcionou porque a RLS dele já
   era "qualquer autenticado, pasta própria" desde a Fase 8a -- nunca
   dependeu de papel de professora, só de dono da pasta (`auth.uid()`).
   Confirmado por leitura da migration 032 antes de decidir, não
   assumido.
3. `searchAnyProfileByUsername()` tem select PRÓPRIO (não reaproveita
   `resolveProfileByUsername()` de `admin-badges.js`) só pra poder trazer
   `plan_tier` junto -- evita carregar esse campo extra em todos os
   outros lugares que já usam a função original e não precisam dele.
4. Ativação de Premium é 100% manual (SQL via este botão de admin) até
   Stripe existir -- nenhuma tentativa de simular checkout, trial, ou
   qualquer fluxo de autoatendimento que sugira que pagamento real já
   funciona. Mesmo princípio de honestidade já usado no teto de 20
   cartões (Fase 5.1): a UI nunca promete infraestrutura que não existe.

**Gratuito x Premium (é o assunto desta fase inteira, não uma nota à
margem)**: núcleo pedagógico (trilha, exercícios, FSRS, notas de
realidade/cultura, badges, ranking, notificações) fica **sempre grátis**
pra qualquer conta -- gatear isso contradiria a missão do produto já
registrada neste arquivo ("ensinar o idioma real"). Ferramentas do lado
da professora (Fases 1-3/6a/6b/7/8 do sistema de alunas particulares)
ficam **fora do escopo desta fase** -- são o eixo hipotético "professora-
inquilina/multi-tenant" já registrado repetidamente como pergunta em
aberto, e hoje só existe 1 professora real (a autora) usando essas
ferramentas, então não geraria receita ainda. A única alavanca real
nesta entrega é a capacidade de AUTORIA PESSOAL em "Meus Cartões":
quantidade (já existia, Fase 5.1) e agora formatos ricos (novo). Preço/
moeda/período de cobrança **não foram definidos** -- essa é
explicitamente a Fase 3 de verdade (checkout Stripe), ainda bloqueada
até a autora decidir ativar.

**Testes realizados:** `node --check` sem erro em
`shared/roles.js`/`shared/student-flashcards.js`/`shared/my-flashcards.js`/
`shared/admin-premium.js`/`shared/admin-analytics.js`/`fr/app.js`/
`zh/app.js`. Validação funcional via Playwright (fr+zh), boot completo do
app (não só chamada isolada de função) com `getSession()` mockada
devolvendo uma sessão real -- mesmo padrão de fidelidade mais alto já
usado em fases anteriores desta feature: (1) **conta free** -- sem radio
de "Modo de prática", sem campo de imagem, aviso de upsell presente,
criação de cartão comum (sem campos ricos) continua funcionando
normalmente (`dbCount:1`); (2) **conta premium, fr** -- radios presentes,
cartão de múltipla escolha criado com 2 opções erradas gravadas
corretamente, cartão cloze criado com `front:null` confirmado no banco
(nunca um valor inventado, mesmo princípio da migration 035),
`buildCardFromSelfFlashcard()` confirmado populando `choices`/
`clozeSentence` corretamente e com `origin:'self'` preservado,
`hasPlainFrontBack()` confirmado `true` pro cartão MC (tem front) e
`false` pro cloze (sem front) -- a mesma exclusão de Speed Review/
Combinar/Anki export que já protegia cartão de professora sem front
agora protege cartão próprio também, sem nenhuma mudança de código
nessas 3 funções; upload de imagem confirmado batendo no bucket
`flashcard-media` com path prefixado `self-`; (3) **zh premium** --
cloze sem pinyin da resposta REJEITADO (`dbCount:0`, mensagem específica
"Digite o pinyin da resposta..."), com pinyin ACEITO e gravado
corretamente; (4) **Painel de Admin, "⭐ Premium"** -- busca por
@username encontra a conta certa mostrando o plano atual, clique em
"Tornar Premium" grava `plan_tier:'premium'` de verdade no banco e o
botão vira "Remover Premium". Sem erro de console novo atribuível a
este código nos cenários premium/admin; o cenário free só mostrou os
`ERR_TUNNEL_CONNECTION_FAILED` já esperados (CDN do Supabase bloqueado
pelo proxy de saída deste sandbox, mesma limitação documentada em
sessões anteriores). Não foi feita validação visual de tema
claro/escuro nesta entrega -- zero CSS novo introduzido (reaproveita
`.pill`/`.profile-edit-*`/`.btn-*` já calibrados em todas as fases
anteriores de flashcards), risco considerado baixo mas registrando por
completude, mesmo padrão de honestidade já usado quando outras entregas
validaram só um subconjunto.

**O que ainda falta / não foi feito nesta fase (de propósito):**
- **Checkout Stripe real / cobrança de verdade** -- continua
  explicitamente fora do escopo, é a Fase 3 de verdade do prompt-mestre
  original, só desbloqueada quando a autora decidir ativar (precisa de
  conta Stripe, preço definido, e provavelmente uma Edge Function nova
  pro webhook, no mesmo padrão já usado pra Resend).
- **Eixo "professora-inquilina" (multi-tenant)** -- pergunta em aberto
  registrada repetidamente nas fases anteriores (limite de alunas/
  Storage por professora quando houver mais de uma na plataforma) --
  não tocado aqui, fora do escopo desta fase de propósito.
- **Formatos ricos em cartão próprio não têm edição** -- só criar; editar
  um cartão próprio já criado (Prop 4, "7 propostas") continua limitado a
  front/back/note/direção, não ganhou os campos novos nesta entrega
  (mesmo escopo restrito que `teacher_flashcards` teve entre as Fases
  8a/8c e a integração de edição -- que lá também não cobriu modo/mídia
  além do que já existia quando a edição foi implementada).
- Nenhuma listagem/navegador de "todas as contas registradas" no admin --
  só busca pontual por @username, suficiente pro pedido ("botão", não um
  CRM).
- Nenhuma notificação avisando a conta quando ela vira Premium -- não foi
  pedido.

Nenhum passo manual pendente pra autora nesta entrega -- as duas
migrations (`039`/`040`) já foram aplicadas ao vivo via
`mcp__Supabase__apply_migration`.

## UX-fix: rótulo do seletor de direção do cartão ("Idioma de cada lado")
ganha o nome real do idioma em vez de "idioma estudado"/"tradução" genéricos

Pedido da autora, com print da tela (antes de mergear o PR #264): trocar
"Frente no idioma estudado, verso na tradução (padrão)" / "Frente na
tradução, verso no idioma estudado" por texto com o nome real do idioma
-- ex: "Frente em francês (com áudio), verso com tradução em português".
Ela também perguntou explicitamente se os rótulos precisariam mudar
conforme o aluno selecionado -- grillado em 4 perguntas antes de codar,
porque a resposta é DIFERENTE em cada tela que usa este seletor.

**Achado antes de perguntar**: "Meus Cartões" (`shared/my-flashcards.js`)
só mostra este bloco quando `!isMandarim` -- ou seja, sempre
francês↔português, sem ambiguidade, texto fixo sem lógica nenhuma.
"Flashcards" do admin (`shared/admin-flashcards.js`, a tela do print)
tem seletor de MÚLTIPLOS alunos, que pode incluir um vinculado em
`portugues` (aceito no schema desde a Fase 1, mesmo sem site próprio
ainda) -- é aí que mora a complexidade real: o que mostrar se a seleção
tiver alunos de idiomas diferentes, ou nenhum selecionado ainda?

**Decisões do grilling:**
1. As duas telas recebem a mudança.
2. Idioma nativo pareado com `portugues` -- **"inglês", decisão explícita
   da autora**, mesmo sem confirmação nenhuma no código (eu recomendei
   esconder o seletor pra português até o site existir de verdade, mesmo
   princípio de "não presumir infraestrutura" já travado neste arquivo --
   ela optou por travar "inglês" já, sabendo que pode mudar quando o site
   de português existir). Registrado aqui pra não parecer suposição minha.
3. Sem seleção nenhuma no admin -> texto genérico de sempre, como
   fallback (não esconde o bloco).
4. Formato exato: "Frente em {idioma} (com áudio), verso com tradução em
   {nativo}" / "Frente na tradução em {nativo}, verso em {idioma} (com
   áudio)".

**Decisão minha, não coberta explicitamente no grilling**: quando a
seleção do admin é MISTA entre 2+ idiomas elegíveis (hoje só
possível entre francês e português, já que mandarim já esconde o bloco
inteiro por conta própria) -- caiu pro MESMO fallback genérico do "sem
seleção" (regra 3 acima), em vez de mostrar um rótulo ambíguo ou inventar
um formato novo pra esse caso. Funcionalmente nada muda (o campo
`frontIsTargetLanguage` já era um booleano único aplicado por linha,
cada linha resolve "alvo" a partir do PRÓPRIO `language_app_key`,
correto mesmo com seleção mista) -- só o rótulo mostrado fica genérico
nesse caso raro.

**O que foi feito:**

- **`FLASHCARD_DIRECTION_LANGUAGE_LABELS`** (novo, `shared/admin-
  students.js`, ao lado de `STUDENT_LANGUAGE_LABELS` já existente) --
  `{ frances: {target:'francês', native:'português'}, portugues:
  {target:'português', native:'inglês'} }`. `mandarim` deliberadamente
  fora do mapa (nunca precisa de rótulo, o bloco já não se aplica a ele).
- **`shared/my-flashcards.js`** -- `myFlashcardDirectionLabels()` (novo)
  usa `FLASHCARD_DIRECTION_LANGUAGE_LABELS[APP_KEY]` direto (site fixo =
  1 idioma só) nos 2 radios do formulário de criação E nos 2 do formulário
  de edição -- 4 pontos no total, todos trocados.
- **`shared/admin-flashcards.js`** -- `adminFlashcardDirectionLabels
  (selectedStudents)` (novo) calcula o conjunto de idiomas elegíveis
  presentes na seleção (`language_app_key` filtrado pelo mapa acima);
  só devolve rótulo concreto quando esse conjunto tem exatamente 1
  idioma, senão cai pro texto genérico (regras 3+4 acima). Usado em 3
  pontos: o `<span>` com id próprio no render inicial (recalculado
  também em `updateFlashcardsSelectionDependentUI()` a cada mudança de
  seleção, sem re-render do form inteiro -- mesmo padrão incremental já
  usado nesta tela desde a UX-fix 5), e o formulário de EDIÇÃO de um
  cartão já existente (`flashcardEditFormHTML(c)`, que edita 1 cartão só
  -- usa `adminFlashcardDirectionLabels([c])`, sempre um idioma único e
  concreto, nunca cai no fallback genérico).

**Gratuito x Premium**: não se aplica -- é só texto de rótulo, sem mudança
de comportamento/dado.

**Testes realizados:** `node --check` sem erro em `shared/admin-
students.js`/`shared/admin-flashcards.js`/`shared/my-flashcards.js`.
Validação via Playwright (fr): "Meus Cartões" (conta premium) confirmado
mostrando os 2 rótulos exatos ("Frente em francês (com áudio), verso com
tradução em português" / "Frente na tradução em português, verso em
francês (com áudio)"). `adminFlashcardDirectionLabels()` chamada
diretamente com 5 cenários -- sem seleção (genérico), só francês
(dinâmico), só português (dinâmico, "inglês" confirmado), francês+
português misto (genérico, decisão registrada acima), francês+mandarim
misto (mostra o rótulo de francês -- correto, ainda que essa combinação
nunca fique visível de fato porque `anyMandarim` já esconde o bloco
inteiro por outro caminho). Não foi feita validação end-to-end da tela
completa do admin (checkboxes clicados de verdade) nem de zh -- o
seletor não existe em zh (mandarim sempre exclui o bloco) e a lógica do
admin foi validada como função pura, risco considerado baixo dado que
`updateFlashcardsSelectionDependentUI()`/render inicial não foram
alterados estruturalmente, só ganharam 2 linhas a mais escrevendo
`textContent`.

**O que ainda falta / não foi feito (de propósito):** nada pendente --
escopo pontual de texto, sem migração, sem passo manual.

## Badge "Aluno/a da Prof. Brune" concedido automaticamente ao vincular

Pedido da autora: "Tem como atribuir o Badge de aluno automaticamente
para todo aluno vinculado por mim?" -- confirmado que o badge já existia
(`badge_catalog`, id `student`, "Aluno/a da Prof. Brune" 🎓, criado numa
sessão anterior) mas era só concedido manualmente via "🎖️ Badges". Ao
conferir o estado real (`badge_grants` x `teacher_students` ativos): 10
dos 11 vínculos ativos já tinham o badge (concedido manualmente antes),
só `@hirschbarae` estava sem -- **concedido agora, ao vivo, via SQL**
(`mcp__Supabase__execute_sql`, mesmo padrão de "aplicar direto quando é
aditivo/baixo risco" já usado neste arquivo pra migrations).

**O que foi feito**: `assignStudentToTeacher()` (`shared/roles.js`)
ganhou um segundo insert, logo depois do insert em `teacher_students` ter
sucesso -- concede o badge `student` pro `target.user_id` automaticamente,
toda vez que a autora vincular alguém como aluno(a) daqui pra frente
(qualquer tela que chame essa função -- hoje só "🎓 Alunos"). Erro
`23505` (já tem o badge -- ex: a mesma pessoa sendo vinculada num
SEGUNDO idioma) é esperado e ignorado, não reportado como falha. Um erro
de qualquer outro tipo no badge é logado no console mas **nunca desfaz
nem reporta falha no vínculo em si** -- a aluna já foi vinculada com
sucesso antes dessa linha rodar, um problema no badge é secundário.

**Decisão arquitetural**: nenhuma tabela/coluna nova -- reaproveita
`badge_grants` (migration 002) e o badge `student` já existente no
catálogo, só automatiza a concessão que já existia manualmente.

**Testes**: `node --check` sem erro em `shared/roles.js`. Não testado via
Playwright nesta entrega (mudança pequena e direta, mesmo padrão de
código já usado em `grantBadgeByUsername`/`admin-badges.js`, risco baixo)
-- confirmado ao vivo que o backfill retroativo funcionou (10/11 já
tinham, o 11º recebeu agora).

## Perfil público virou o padrão -- reversão explícita e confirmada da
decisão de privacidade original, INCLUSIVE retroativa

A autora perguntou: "Tem como tornar todo perfil público (cartões,
progresso, conquistas etc) dos usuários por default ao invés de
privado por default?" -- reverte uma decisão de privacidade que tinha
sido grillada explicitamente (Fase 1 do prompt-mestre "perfil público /
flashcards públicos", ver seção acima -- "privados por default" foi
resposta a uma pergunta direta do grilling na época, não um default
arbitrário), então antes de tocar em qualquer coisa perguntei o escopo
exato: só contas NOVAS, ou também as 23 já registradas (que nunca
opinaram sobre isso, sem nenhum canal de notificação existente pra
avisá-las). **Ela confirmou explicitamente: também as 23 já
existentes.**

**Executado ao vivo, migration `041_public_profile_default_true.sql`**
(`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg`): (1)
`alter column public_profile set default true` -- toda conta nova a
partir de agora já nasce pública; (2) `update profiles set
public_profile = true where public_profile = false` -- as 23 contas já
existentes na época (inclusive as 11 alunas formalmente vinculadas)
viraram públicas na mesma migration. Confirmado ao vivo depois:
`23 total, 23 now_public`.

**Nenhuma mudança de código foi necessária** -- toda a UI/lógica de
perfil público (Fase 1/2 do prompt-mestre) já lia `profiles.
public_profile` dinamicamente desde que foi construída, sem nenhum
hardcode assumindo "privado" (conferido antes de rodar a migration:
`shared/profile.js`/`fr/index.html`/`zh/index.html`, o toggle e o texto
de apoio já refletem o valor real da conta, nunca um texto estático
"privado por padrão"). Só o DADO mudou.

**O que continua igual, de propósito**: `student_flashcards.hidden_from_profile`
(o botão de olho por cartão, Fase 1 do perfil público) não foi tocado --
uma aluna que já tinha marcado algum cartão como escondido continua com
ele escondido mesmo agora que a conta inteira é pública por padrão; os
dois eixos continuam independentes, exatamente como desenhado.

**Sem passo manual pendente** -- migration já aplicada ao vivo. Nenhuma
das 23 contas foi notificada sobre a mudança (não existe canal pra isso
hoje) -- risco reconhecido e aceito explicitamente pela autora ao
confirmar o escopo "também as já existentes".

## Auditoria de terminologia "aluno/student" x "usuário/user" (2026-09-24)

Pedido da autora, depois do mal-entendido registrado na entrega anterior
("Fase 3", onde confundi "aluna" com "usuária" numa pergunta de
grilling): mapear onde o código usa cada termo, pra confirmar que os dois
conceitos continuam bem separados. Feito só como auditoria de leitura
(grep + inspeção), sem nenhuma mudança de código.

**Os dois conceitos, e onde cada um mora:**
- **"Aluno/a"** = vínculo FORMAL numa linha ativa de `teacher_students`
  (quem a autora vinculou explicitamente em "🎓 Alunos"). Funções-chave:
  `fetchMyStudents()`, `assignStudentToTeacher()`, `removeStudentLink()`,
  `hasActiveTeacherLink()` (todas em `shared/roles.js`). Telas que usam
  esse termo na UI, sempre nesse sentido correto: "🎓 Alunos"
  (`admin-students.js`), "Flashcards"/"Aulas"/"Material de apoio" do
  admin (`admin-flashcards.js`/`admin-class-logs.js`/
  `admin-support-materials.js` -- os 3 seletores de destinatário "Nenhum
  aluno selecionado"/"N alunos selecionados"), e o selo "Aluno vinculado"
  em "Meus Cartões" (`my-flashcards.js`, referindo-se à PRÓPRIA aluna
  logada, sempre correto).
- **"Usuário/conta"** = QUALQUER perfil registrado (`profiles`), sem
  nenhuma relação com vínculo pedagógico. Funções-chave:
  `fetchAllProfiles()` (`admin-badges.js`), `fetchMyRole()`,
  `fetchMyPlanTier()`/`isPremium()`/`setPlanTier()`/
  `searchAnyProfileByUsername()` (todas em `shared/roles.js`, Fase
  "reformulação gratuito x premium"). UI: "Nome de usuário" (campo de
  perfil), "Conta"/"Sua conta"/"Sair da conta" (menu de Configurações) --
  todos genéricos, sem confusão com vínculo pedagógico.

**Conferido, nenhuma inconsistência encontrada**: busquei especificamente
por texto visível na UI (`grep` em `fr/index.html`/`zh/index.html` e nos
template strings de `shared/*.js`) que dissesse "aluno" fora de um
contexto de vínculo formal, ou "usuário"/"conta" num contexto que na
verdade devesse dizer "aluno vinculado" -- não achei nenhum. A confusão
da entrega anterior aconteceu numa PERGUNTA MINHA de grilling (texto que
eu escrevi na hora, não um bug em código já existente) -- não há
equivalente disso "gravado" no código pra corrigir. Registrando aqui como
auditoria concluída, não como lista de bugs -- nada foi mudado.

**O que fica pra próximas sessões evitarem o mesmo erro**: ao escrever
qualquer pergunta de grilling ou texto novo que precise se referir a "os
alunos"/"as contas" da autora, checar explicitamente qual dos dois
conceitos acima é o pretendido antes de escrever a frase -- "aluno" sem
qualificação sempre significa vínculo formal em `teacher_students`, nunca
"toda conta registrada".

## Fix: seleção mista de idiomas em "📇 Flashcards" causava pronúncia errada (TTS)

Pedido da autora: impedir que a seleção de destinatários em "📇
Flashcards" (Painel de Admin) misture alunos de idiomas diferentes (ex:
francês + português) na mesma criação de cartão -- um cartão tem UM
idioma-alvo só (Prop 1+2, "7 propostas", ver seção acima: direção +
pronúncia automática/TTS dependem de qual lado é o idioma estudado), então
uma seleção mista faz o TTS tocar no idioma errado pra quem não é do
idioma escolhido. Pedido concreto: remover a pill "Todos" do filtro de
idioma e manter só as pills por idioma.

**Achado antes de mexer**: o filtro de idioma (`ADMIN_FLASHCARDS_STATE.langFilter`,
introduzido na Fase "5.1"/"reformulação gratuito x premium" da tela) já
existia, mas era só uma LENTE DE VISUALIZAÇÃO -- trocar de pill escondia
linhas via `style.display`, mas nunca tocava em `studentIds`. Um aluno
marcado enquanto o filtro estava em "Francês" continuava marcado (só
invisível) depois de trocar pra "Português" -- ou seja, mesmo com a pill
"Todos" removida, a seleção mista continuaria possível pela combinação
marcar→trocar de pill→marcar de novo. Corrigir só a pill sem tocar nisso
teria resolvido a superfície mas não a causa raiz.

**O que foi feito**, só em `shared/admin-flashcards.js` (linhas da função
`renderAdminFlashcardsView`, mesma tela; `admin-class-logs.js`/
`admin-support-materials.js` têm o mesmo padrão de pills mas nenhuma
lógica de TTS/direção -- fora do escopo, forçar a mesma trava lá removeria
funcionalidade que já funciona sem corrigir nada):

1. Pill "Todos" removida de `langFilterHTML` -- só pills por idioma
   restam quando há 2+ idiomas presentes entre os alunos da professora.
2. `ADMIN_FLASHCARDS_STATE.langFilter` deixa de poder ficar em `'all'`
   quando há 2+ idiomas -- se o valor guardado não está mais na lista de
   idiomas presentes (primeiro carregamento, ou uma sessão anterior que
   ainda tinha `'all'`), a tela auto-corrige pro primeiro idioma da lista.
3. **Trocar de pill agora zera `studentIds` de verdade** (e desmarca os
   checkboxes no DOM) -- é isto que garante a invariante, não só a
   ausência da pill "Todos". Clicar na MESMA pill já ativa é no-op
   (não reseta a seleção à toa).
4. **"Selecionar todos" passou a respeitar o filtro de idioma ativo** --
   achado durante a implementação, não pedido explicitamente: sem isso,
   marcar "Selecionar todos" ainda juntaria alunos de idiomas diferentes
   pela porta dos fundos (a função selecionava `students` inteiro, sem
   filtrar por `langFilter`). Agora, com 2+ idiomas presentes, só marca
   quem pertence ao idioma da pill ativa no momento do clique.

**Decisão de escopo**: nenhuma mudança em `createFlashcard()`/schema --
é 100% client-side (estado de seleção + filtro de DOM), mesmo nível de
"trava de UI, não fronteira de segurança" já usado noutros limites desta
feature (ex: teto de 20 cartões da Fase 5.1). A trava evita o erro por
acidente na UI normal; não impede alguém de inserir direto via API (fora
do modelo de ameaça desta tela, que é ferramenta interna da própria
professora/admin).

**Testes realizados:** `node --check` sem erro. Playwright (fr, roster
misto 2 francês + 1 mandarim): confirmado só 2 pills (sem "Todos"), pill
padrão já ativa no primeiro idioma presente (`frances`); marcar uma aluna
de francês e trocar pra pill de mandarim zera a seleção
(`afterSwitchToZhCount: "Nenhum aluno selecionado"`, checkbox
desmarcado); "Selecionar todos" com o filtro em mandarim marca só o aluno
de mandarim (não o de francês, mesmo ele estando escondido pelo filtro);
trocar de volta pra francês e "Selecionar todos" marca os 2 alunos de
francês, sem incluir o de mandarim; clicar na pill já ativa não reseta
uma seleção em andamento. Não validado em zh nem tema escuro nesta
entrega -- mudança é 100% JS de estado/filtro, zero CSS novo e zero
diferença de idioma na lógica (o arquivo é compartilhado sem branch por
idioma), risco considerado baixo, registrando por completude mesmo
padrão de honestidade já usado quando outras entregas validaram só um
subconjunto.

**Escopo**: só `shared/admin-flashcards.js`. Nenhuma migração, nenhum
passo manual pendente pra autora.

## Rename `profiles.role`: `'student'` → `'user'` (schema, não texto de UI)

A autora perguntou se o default `'student'` de `profiles.role` (migration
024) não era exatamente o mesmo tipo de colisão de terminologia já
auditado na entrega anterior ("aluno/a" = vínculo formal em
`teacher_students`, nunca "toda conta registrada"). Confirmado que sim,
lendo a migration 024 de novo: o próprio comentário dela dizia "toda
conta existente hoje já é implicitamente aluna", reusando a mesma palavra
que o resto do código reserva estritamente pro vínculo formal. **Sem bug
funcional** -- grep confirmou que nenhum call site fazia `role ===
'student'` pra decidir vínculo (isso sempre leu `teacher_students`/
`hasActiveTeacherLink()`) -- mas a colisão de NOME era real e podia
confundir uma sessão futura, exatamente o risco que a auditoria anterior
existia pra prevenir. Pedido direto da autora: "Rename it, run the
migration. From 'student' to 'user'".

**Migration `042_rename_role_student_to_user.sql`** -- `profiles.role`:
constraint antiga (`profiles_role_check`, confirmada ao vivo via
`pg_constraint` antes de escrever a migration) trocada por `role in
('user','teacher','admin')`; `update ... set role='user' where
role='student'` (22 linhas migradas, confirmado ao vivo -- as mesmas 22
contas que eram `'student'`, 1 admin intacta); `default` da coluna
também trocado pra `'user'`. Aplicada AO VIVO via
`mcp__Supabase__apply_migration`, projeto `eigjocalzwamisgqilhg` -- não é
passo manual pendente pra autora. `shared/roles.js` (`fetchMyRole()`)
ajustado pro mesmo fallback (`|| 'user'`).

**Escopo explicitamente NÃO estendido a 2 outras ocorrências de
`'student'` no código, confirmadas como sistemas DIFERENTES antes de
decidir não tocar**:
- `badge_catalog.badge_id`/`badge_grants.badge_id = 'student'` -- é o id
  do badge "Aluno/a da Prof. Brune" (`shared/roles.js`,
  `assignStudentToTeacher()`), uma tabela e conceito totalmente
  diferentes de `profiles.role`. Renomear isto seria uma migração de
  dado separada e mais arriscada (referenciado por linhas já existentes
  de `badge_grants`), não pedida.
- `usage_events.actor_type = 'student'` (`shared/analytics.js`/
  `shared/admin-analytics.js`) -- classificação de analytics
  ("atividade real" vs. `'admin'`, quando `isAdminUser()===true`), outra
  coluna/tabela sem relação nenhuma com `profiles.role`.

Nenhuma mudança de UI/texto visível nesta entrega -- é puramente uma
correção de nome de valor de enum no schema, sem efeito em nenhuma tela.

**Testes**: `node --check` sem erro em `shared/roles.js`. Verificação ao
vivo pós-migration confirma as 3 partes -- `select role, count(*) ...`
mostra `admin:1, user:22` (nenhuma linha ficou em `'student'`);
`pg_get_constraintdef` confirma a nova constraint;
`information_schema.columns` confirma `column_default = 'user'::text`.

**Escopo**: `shared/supabase_migrations/042_rename_role_student_to_user.sql`
(nova) + `shared/roles.js`. Nenhum passo manual pendente pra autora --
migration já aplicada ao vivo.

## Mesmo tratamento nos 2 outros "student" que não eram vínculo formal
(`usage_events.actor_type` e a tabela `student_flashcards`)

A entrega anterior (rename de `profiles.role`) já tinha identificado e
deliberadamente deixado de fora 2 outras ocorrências de `'student'` no
schema. A autora perguntou explicitamente se essas duas também deveriam
seguir "o mesmo raciocínio" -- e apontou o contraste que já estava
implícito: o badge automático concedido em `assignStudentToTeacher()`
(`badge_catalog`/`badge_grants`, id `'student'`) está certo do jeito que
está, porque só é concedido quando alguém é vinculada de verdade em
"🎓 Alunos" (vínculo formal em `teacher_students`) -- não é a mesma
colisão de nome. As duas ocorrências restantes, porém, eram exatamente
esse tipo de colisão: usar "student" pra rotular QUALQUER conta, não só
quem tem vínculo formal.

Como a pergunta envolvia 2 mudanças técnicas (uma tabela inteira sendo
renomeada, não só um valor de enum), perguntei antes de executar (pedido
explícito da autora: "não entendi direito, mas explique de um jeito que
não-desenvolvedores entendam") -- resposta: **"Both"**, fazer as duas.

**1) `usage_events.actor_type`** -- coluna que classifica cada linha de
analytics como `'admin'` (quando `isAdminUser()===true`) ou `'student'`
(qualquer outra conta, mesmo sem vínculo formal nenhum -- a MESMA colisão
de nome já corrigida em `profiles.role`, só que numa tabela diferente).
**Migration `044_rename_actor_type_student_to_user.sql`** -- `alter
column actor_type set default 'user'` + `update ... set
actor_type='user' where actor_type='student'`. Aditiva/sem risco, mesmo
padrão de sempre. Aplicada AO VIVO via `mcp__Supabase__apply_migration`,
projeto `eigjocalzwamisgqilhg` -- confirmado depois: `admin:183,
user:939` (era `admin:183, student:939`). Nenhuma mudança de código
necessária -- `shared/analytics.js`/`shared/admin-analytics.js` nunca
comparavam contra a string `'student'` (só contra `'admin'`), então o
valor no outro ramo era só o que sobrava no banco, sem lógica
dependendo do nome exato.

**2) Tabela `student_flashcards` (Fase 5 do sistema de alunas
particulares, "Meus Cartões")** -- essa era a colisão mais séria: uma
tabela INTEIRA, com uma coluna `student_id`, usada pra guardar os
cartões que a PRÓPRIA CONTA cria pra si mesma -- sem nenhuma relação com
vínculo formal de professora (qualquer conta, vinculada ou não, sempre
pôde usar "Meus Cartões" desde a Fase 5, confirmado de novo nesta
sessão: `shared/my-flashcards.js` nunca chama `fetchMyStudents()`/
`teacher_students`). Diferente de `teacher_flashcards` (que SIM é
"cartão que uma professora atribui a uma aluna vinculada" -- esse nome
está certo e não foi tocado).

**Migration `043_rename_student_flashcards_to_own_flashcards.sql`** --
`alter table student_flashcards rename to own_flashcards` + `alter table
own_flashcards rename column student_id to owner_id` + as 4 constraints
+ a policy RLS (`student_flashcards_owner_all` →
`own_flashcards_owner_all`) renomeadas junto. **Achado técnico
importante, verificado ao vivo antes de escrever a migration**: um
`RENAME TABLE`/`RENAME COLUMN` no Postgres atualiza sozinho tudo que
referencia por OID (constraints, índices, policies) -- mas NÃO atualiza o
corpo de uma function PL/pgSQL, que é guardado como texto literal. A
function `get_public_flashcards()` (migration 038, usada pelo perfil
público) tinha `from student_flashcards where student_id = ...` escrito
no corpo -- precisou de um `CREATE OR REPLACE FUNCTION` explícito dentro
da mesma migration, ou teria continuado apontando pro nome antigo (que
não existiria mais) e quebrado em produção. Aplicada AO VIVO via
`mcp__Supabase__apply_migration` -- verificado depois: 3 linhas
preservadas, constraints/policy renomeadas, function chamável e
devolvendo o erro `not_authorized`/`not_found` esperado pra um username
inexistente.

**Lado do cliente**: `shared/student-flashcards.js` (8 funções --
`fetchMyOwnFlashcards`, `createOwnFlashcard`, `uploadOwnFlashcardMedia`,
`setOwnFlashcardStatus`, `setOwnFlashcardHidden`,
`updateOwnFlashcardContent`, `deleteOwnFlashcardPermanently` + validação
interna) apagado e recriado como **`shared/own-flashcards.js`** -- mesma
lógica exata, só trocando `.from('student_flashcards')`→
`.from('own_flashcards')` e `student_id`→`owner_id` em todo lugar (nomes
de FUNÇÃO nunca mudaram -- só o arquivo/tabela/coluna por baixo -- então
nenhum call site em `shared/my-flashcards.js` precisou de nenhuma
mudança, só os 2 comentários que citavam o nome antigo do arquivo).
`fr/index.html`/`zh/index.html`: tag `<script src="../shared/
student-flashcards.js">` → `own-flashcards.js`. Comentários corrigidos
(sem mudança funcional) em `fr/app.js`, `zh/app.js` (2 blocos cada, perto
de `buildCardFromSelfFlashcard`/`isCardLessonCompleted`),
`shared/teacher-class-logs.js` e `shared/public-profile.js`.

**O que ficou de fora, de propósito** (mesmo critério da entrega
anterior -- migrar o arquivo histórico da migration quebraria o registro
do que rodou de verdade naquela data): as migrations antigas
(`028`/`031`/`032`/`033`/`036`/`037`/`038`/`040`) continuam com
`student_flashcards`/`student_id` no texto SQL -- são o registro real do
que foi executado então, nunca reescritas.

**Testes realizados**: `node --check` sem erro em todos os arquivos
tocados. Grep completo do repositório (fora das migrations antigas)
confirma zero referência sobrando a `student_flashcards`/
`student-flashcards.js`. Validação funcional via Playwright: carreguei
`shared/own-flashcards.js` isolado num browser real (Chromium) com um
`supabaseClient` fake que registra cada chamada -- confirmado que as 7
funções exportadas existem e que `fetchMyOwnFlashcards`/
`createOwnFlashcard`/`setOwnFlashcardStatus`/`setOwnFlashcardHidden`/
`deleteOwnFlashcardPermanently` todas chamam `.from('own_flashcards')`
e filtram/gravam por `owner_id` (nunca `student_id`), inclusive o
`insert()` de `createOwnFlashcard` confirmado gravando `owner_id`
corretamente no payload. Não foi possível validar a tela completa "Meus
Cartões" ponta-a-ponta neste ambiente porque carregar `fr/index.html`/
`zh/index.html` direto (sem passar pela seleção de idioma da raiz do
site) dispara um redirect da própria arquitetura do app (não relacionado
a esta mudança) -- a validação isolada do módulo (acima) cobre o risco
real desta entrega, que é 100% renomeação mecânica sem lógica nova.

**Escopo**: `shared/supabase_migrations/043_rename_student_flashcards_to_own_flashcards.sql`
+ `044_rename_actor_type_student_to_user.sql` (novas) +
`shared/own-flashcards.js` (novo, substitui `shared/student-flashcards.js`,
apagado) + `fr/index.html`/`zh/index.html`/`fr/app.js`/`zh/app.js`/
`shared/teacher-class-logs.js`/`shared/public-profile.js` (só
referências/comentários). Nenhum passo manual pendente pra autora --
as duas migrations já foram aplicadas ao vivo via
`mcp__Supabase__apply_migration`.

