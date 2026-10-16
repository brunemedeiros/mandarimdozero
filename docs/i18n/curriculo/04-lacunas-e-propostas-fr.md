# Lacunas e propostas do currículo de francês (A1 revisado e A2 novo), versão 2

Data: 2026-10-16. **Versão 2**, reescrita a partir do retorno da dona sobre a v1. A v1 está guardada em
`04-v1-lacunas-e-propostas-fr.md` (a matriz de cobertura completa e o molde para o português continuam lá e valem como estão,
salvo o que a seção 0 lista). Documento de proposta: **nenhum arquivo do site foi alterado**.
Base: `01-auditoria-fr-atual.md`, `02-referencia-livros-fr.md` (já com a atualização de 2026-10-16: seções 8.4 a 8.7, linhas ⟳ e seção 12),
`03-delf-cefr-a1-a2.md`, mais conferências feitas agora no código (citadas com arquivo e linha) e dois scripts rodados nesta sessão
(listados onde usados).

Siglas das fontes (as do `02`, seção 9): **AE** Alter Ego+ 1; **D1** Défi 1; **D2** Défi 2; **D3** Défi 3 (B1, só como teto); **GP** Grammaire
Progressive A1; **GPI** Grammaire Progressive Intermédiaire A2-B1; **GEF** Grammaire Essentielle A1-A2; **GeDD** Grammaire en Dialogues
Débutant; **VP** / **VPI** Vocabulaire Progressif A1 / Intermédiaire; **CPD** / **CPI** Communication Progressive Débutant / Intermédiaire.
Siglas do site: unidade `A1-N` (vocabulário), `A1-gN` (gramática), módulo `A1-mN`. Ids novos nunca reaproveitam um id que já existiu.

> ### Dúvidas respondidas
>
> **(a) O que é a "etiqueta de nível" no jogo "Passé composé ou Imparfait?" e nos tempos da Conjugação?**
> Um selinho só informativo, tipo **A2** ou **B1**, ao lado do nome do jogo e ao lado de cada tempo no seletor da Conjugação
> (ex.: "Imparfait · A2", "Subjonctif · B1"). Ele **não tranca nada**: o aluno do A1 continua podendo abrir o jogo e praticar qualquer tempo.
> Serve para o aluno entender por que aquilo parece difícil ("isso é matéria do A2, normal estranhar").
> **Alternativa:** não mostrar selo nenhum (como hoje) e só ordenar os tempos do mais básico ao mais avançado, ou pôr uma frase na
> abertura do jogo ("Este jogo treina um tempo do A2."). A decisão fica registrada aqui (decisão 15) e o trabalho vai para a sessão
> da Conjugação (`05-mensagem-sessao-conjugacao.md`).
>
> **(b) O que são as "5 notas iguais sobre pergunta in situ" e por que encurtar?**
> "In situ" quer dizer "no lugar": na fala, o francês costuma deixar a palavra de pergunta **no fim**, sem inverter a frase
> (*Tu t'appelles comment ?* em vez de *Comment tu t'appelles ?*). O site tem **5 notas de realidade** que explicam exatamente isso, cada uma
> com outra pergunta: A1-2 (*tu t'appelles comment ?*), A1-3 (*t'as quel âge ?*), A1-9 (*tu es d'où ?*), A1-10 (*ça coûte combien ?*) e
> A1-20 (*t'as fait quoi hier ?*) (`01`, linha 426; ids `comment-tappelles-wh-in-situ`, `quel-age-wh-in-situ`, `dou-viens-tu-wh-in-situ`,
> `combien-ca-coute-wh-in-situ`, `quest-ce-que-tu-as-fait-wh-in-situ` em `fr/content.js`). São 5 das 15 notas de realidade do A1: o aluno lê o
> mesmo parágrafo 5 vezes, e a regra da skill `notas-de-realidade` pede nota nova só quando ensina algo novo.
> Proposta: a 1ª (A1-2) fica inteira; a do A1-20 fica (é a única no passado e traz *quoi*); as 3 do meio viram **uma linha** que aponta para a
> primeira; e, quando existir a gramática de perguntas (A1-g12), a regra mora numa tela própria lá.
> Exemplo de como ficaria a do A1-3, hoje com título + parágrafo de 3 frases:
> *Título:* "Na fala: **t'as quel âge ?**" · *Texto:* "Igual a *tu t'appelles comment ?* (unidade 2): na conversa, a pergunta vai para o fim."
>
> **(c) Por que o A2 da v1 ficou menor que o A1, e qual é a correção?**
> Você tem razão: era incoerente. Eu dimensionei o A2 copiando o molde de uma unidade por tema e listando só os temas que as fontes
> marcavam claramente como A2, sem olhar a carga de horas. O CEFR estima ~60 a 100 horas guiadas para chegar ao A1 e ~180 a 200 horas
> acumuladas para o A2: o A2 sozinho pede **mais horas que o A1 inteiro**. A v2 refaz o cálculo (seção 6.1) com um fator ajustável:
> recomendo **10 módulos, 60 unidades e ~408 palavras** (contra 8 módulos, 44 unidades e ~291 palavras do A1 revisado), com mais
> competências por unidade.

---

## 0. O que mudou da v1 para a v2

| Ponto | v1 | v2 |
|---|---|---|
| Ids de cartão | "Só acrescentar no fim; nunca reordenar, mover, fundir ou apagar" | **Etapa 0 nova (seção 2):** chave estável por item + tabela de fusões + arquivo de progresso. Libera reordenar, mover, fundir, excluir e reescrever |
| Unidade inserida antes de unidade já concluída | precisava de "reparo de desbloqueio" como bloqueio | regra simples: **nasce aberta, não concluída** (seção 2.10) |
| Zona cinza A1/A2 | futuro simples, imperfeito, COI, *en*, relativos como "A1+" | **decidido pela dona: tudo isso é A2**, como no Défi 1 (seção 1) |
| A1 revisado | 43 unidades, 8 módulos, "só acrescentar" | **44 unidades, 8 módulos recompostos**, com fusões, movimentos e reordenações (seções 4, 5 e 11) |
| A2 | 8 módulos, 34 unidades, ~190 palavras | **10 módulos, 60 unidades, ~408 palavras**, com cálculo e parâmetro (seção 6) |
| Fim de módulo | mini-prova DELF opcional | **atividade final Premium em cada módulo** (formulário, soletrar, cartão-postal...), com análise da correção (seção 7) |
| Exercícios novos | tabela curta | cada um com descrição e **exemplo concreto** (seção 9) |
| Conjugação | seção 6.1 da v1 | **fora deste plano**: mensagem para outra sessão em `05-mensagem-sessao-conjugacao.md` |
| Fontes | `02` de 2026-10-15 | `02` com GPI, GeDD, CPD e Défi 3: subjuntivo só em fórmula no fim do A2, gerúndio no fim do A2, passiva = B1, protestar/desculpar-se/negar no fim do A1 → A2 |
| Decisões | 17 | 26, consolidadas e renumeradas, com a origem de cada uma (seção 13) |

Matriz de cobertura (v1, seção 2): continua válida. Mudanças de rótulo por causa das decisões e do `02` novo: G24, G29, G34 a G36, G39 e G40
deixam de ser "A1+" e passam a **A2**; C40 (reclamar, desculpar-se) passa a **fim do A1 → A2** (CPD 13, 22, 25); G43 ganha a separação
"discurso indireto no presente = A2, no passado = B1" e "*si* + presente/futuro = A2, *si* + imperfeito = B1" (`02`, 12.3); a linha da
Conjugação (v1, 2.6) sai deste documento.

---

## 1. Critérios (atualizados)

| Rótulo | Regra | Exemplo |
|---|---|---|
| **A1** | Aparece nos dois métodos A1 (AE dossiês 0 a 6 **e** D1) ou é exigido por uma tarefa do DELF A1. Para gramática/léxico puro, GP/VP + um método | artigos, *ne... pas*, futuro próximo, passé composé, dados pessoais |
| **A2** | Fontes A2 (D2, CPI, VPI, GPI até o cap. 47) ou tarefa típica do DELF A2. **Inclui, por decisão da dona (2026-10-16), o que só o AE põe no A1: futuro simples, imperfeito, COI, *en*, relativos *qui/que/où*** ("eu também prefiro deixar para depois") | imperfeito x passé composé, condicional, *si* + presente, discurso indireto no presente |
| **Teto do A2** | Os "rappels" do Défi 3 (futuro simples, COD/COI, *en/y*, condicional presente, imperfeito x PC) = o que se espera no fim do A2 (`02`, 8.7 e 12.3) | |
| **B1** | O que o Défi 3 introduz como novo: subjuntivo como sistema, relativos compostos e *dont*, *si* + imperfeito, mais-que-perfeito, **passiva**, discurso relatado no passado, condicional passado | |

Consequências diretas para o A1 revisado: **nada de futuro simples, imperfeito, COI, *en* nem relativos no A1** (nem como tela de gramática).
O que já aparece em frase continua como fórmula memorizada sem explicação de sistema (ex.: *je voudrais*). O COD *je la prends* (A1-10) fica
como fórmula com nota curta de reconhecimento (o D1 traz COD no A1: D1 7.1). O *y* de lugar fica como fórmula (*On y va !*), também no D1.
O comparativo não foi citado pela dona: segue como decisão aberta (decisão 9), com recomendação de ficar no A1.

**Prioridades P0 confirmadas pela dona:** números 4 a 19, artigos e gênero, negação, perguntas, *aller* + futuro próximo.
Os outros itens que a v1 marcava P0 (dados pessoais e formulário, produção escrita, ordem do passé composé, dias e meses, profissões) aparecem
abaixo como **P0 proposto** até a dona confirmar ou rebaixar (decisão 12).

**Grammaire Essentielle:** a dona confirmou que o livro não tem divisão A1/A2 definida. Ele não decide fronteira; vale como lista de tópicos.

---

## 2. ETAPA 0: ids estáveis (antes de qualquer mudança de conteúdo)

### 2.1 Como funciona hoje (conferido no código)

**Onde o id nasce**

| Item | Id | Onde é montado |
|---|---|---|
| Palavra (cartão A, frente → verso) | `u{unit.id}-v{posição}` (ex.: `uA1-3-v5`) | `shared/study-trail-model.js:31` (`studyNoteRowForWord`) e `:124` (`buildStudyWordCards`, `idPrefix`) |
| Palavra (cartão B, verso → frente) | `u{unit.id}-v{posição}-b` | mesmo lugar (motor `buildEngineCardsFromRow`) |
| Frase "Na frase" | `u{unidade-fonte}-p{posição}` ou `-d{posição}` (fala do diálogo) | `shared/study-trail-model.js:203-231` (`buildStudyPhraseCards`) |
| Id refeito "na mão" a partir da posição | `` `u${unit.id}-v${idx}` `` | `shared/srs.js:25` (`registerExerciseCorrect`), `shared/core/exercicios-licao.js:144`, `fr/app.js:1850` (introdução da palavra) |

Hoje há 204 palavras (408 cartões A/B), 182 frases e 87 falas de diálogo no francês (contagem feita agora com Node sobre `fr/content.js`).

**Onde o progresso é salvo e lido**

- Só no servidor: tabela `progress`, uma linha por conta, um bloco por curso dentro de `progress.data` (`frances` para o curso antigo,
  `frances@en` etc.; chave escolhida por `progressBlockKey`, `shared/auth.js:67`). Não existe progresso local persistente
  (convidado não salva; login é obrigatório).
- Save: `saveState` (`shared/auth.js:519`) → `serializeState` (`fr/app.js:642`) → `serializeCardsForSave`
  (`shared/study-trail-model.js:244`): cartão da trilha vira só `{id, ...progresso}` (lista `STUDY_PROGRESS_FIELDS`, linha 21).
- Load: `loadState` (`shared/auth.js:694`) → `applySerializedState` (`fr/app.js:679`) → `mergeSavedCards`
  (`shared/study-trail-model.js:258`): copia o progresso **por id** para os cartões recém-construídos a partir do `content.js`.
- Servidor que lê os cartões do save: `notification-cron` (`supabase/functions/notification-cron/index.ts`: regex de id na linha 299,
  mapa `LESSON_VOCAB_MAP` na linha 223, portão de lição na 280: "N palavras prontas para revisar"); painel da professora e visão geral
  (`get_teacher_student_metrics`, migrations 059/070/075/105, função `_progress_block`): só contam buckets, não leem o formato do id.

**Achado importante: hoje, um item apagado perde o progresso para sempre no save seguinte.** `mergeSavedCards` só aplica o que bate com um
cartão que existe; o save seguinte grava só `STATE.cards`. Um id que sumiu do conteúdo some do banco na próxima ação do aluno. Por isso a
v1 travou tudo.

**O que depende da posição (`vocabIdx` / `phraseIdx`)**

| Dependência | Onde | Efeito de reordenar hoje |
|---|---|---|
| Id do cartão e FSRS | acima | histórico vai para a palavra errada ou some |
| Lições (`lessons[].vocabIdx`) | `fr/content.js` | lição ensina outra palavra |
| Gatilho de nota `trigger.afterVocabIdx` | 32 notas em `fr/content.js` | nota aparece depois da palavra errada |
| Camadas de texto (`vocab: [...]`, `phrases: [...]` por posição) | `courses/fr-pt-BR/layer.js`, `fr/content.en.js` | tradução trocada |
| Portão "cartão só entra na revisão depois da lição" | `isCardLessonCompleted`, `shared/core/revisao-decks.js:569` | cartão some da revisão ou entra antes da hora |
| Portão no servidor | `LESSON_VOCAB_MAP` (cron, regerado à mão) | contagem de notificação errada |
| Tags `licao-N` | `studyTrailTags` (derivada, não salva) | só exibição |
| "Na frase": qual frase é exemplo de qual palavra | `findStudyExamplePhrase` busca a **1ª frase que contém a palavra**, na ordem do conteúdo | reordenar ou reescrever frases pode trocar a frase-exemplo: o cartão da frase antiga deixa de existir |
| Gaveta de palavras que trocam por idioma (`STATE.cardVariants`) | `shared/card-variants.js`, `fr/app.js:533` | chaveada por id do cartão |
| `reviewRecords.hardSeenIds` | `shared/review-extras.js` | ids de cartão |
| `unitProgress[unitId].lessonIdx` | posição da lição | aluno no meio da unidade cai em outra lição |
| Métricas por palavra | `studyWordKey` (`unitId:vocabIdx`, derivado a cada carga) | nada salvo |

**O que NÃO depende da posição:** áudio pré-gerado (`AUDIO_MANIFEST` é por **texto**, `fr/app.js:110`), Desafios (por `unitId`/`moduleId`),
ditados (por módulo, validados por texto), Course Decks (por `course_unit_id` = id da unidade, `shared/deck-engine.js:460`), conquistas e
XP (contadores do bloco), `unitProgress`/`checkpointProgress`/`levelTestProgress` (por id de unidade/módulo/teste).

**Gancho que já existe:** "o progresso segue a palavra, não a posição" (`shared/card-variants.js`, `docs/i18n/roadmap-i18n-l1.md` item 3):
quando o idioma do site troca a palavra de um slot (país do aluno), o progresso vai para uma gaveta e volta quando a palavra volta.
É o mesmo princípio (progresso pertence ao item) e o mesmo formato de whitelist de campos. E a arquitetura de cursos já previa
"camada por id estável de item" (Q-08 / Dv-2 em `docs/i18n/arquitetura-multi-idioma-cursos.md`; `keyBy: 'index'|'id'` no contrato
`docs/i18n/contratos-registro-e-camada-do-curso.md`), ainda não implementada (`grep keyBy` em `shared/` não acha nada).
O teste de ida e volta do progresso (`tests/e4/test_progresso_ida_e_volta.js`) salva e carrega pelo caminho real com um cliente falso do
Supabase: é a base dos testes da Etapa 0.

### 2.2 Opções avaliadas

| Opção | Como funciona | Reordenar | Mover | Fundir | Excluir | Reescrever | Problema |
|---|---|---|---|---|---|---|---|
| (a) **Chave estável por item** | cada palavra/frase/fala ganha `k` congelado; id do cartão = derivado de `k` | sim, sem migração | sim, sem migração | **não** (duas chaves viram uma) | só some (precisa de arquivo) | sim (mesmo sentido mantém `k`) | sozinha não resolve fusão nem guarda o excluído |
| (b) **Tabela de aliases** id antigo → id novo, ids continuam por posição | a cada versão, um mapa traduz ids do save | só com alias para todo item deslocado | idem | sim | descartar ou arquivar | sim | cada reordenação gera dezenas de aliases encadeados por versão (v1→v2→v3), o servidor também precisa deles; fácil errar |
| (c) **Combinação (recomendada)** | (a) para a identidade + (b) **só para fusões** + arquivo para exclusões | sim | sim | sim | sim, com volta | sim | pequena: um formato a mais de dado e um passo no carregamento |

### 2.3 Desenho recomendado (c)

1. **Chave congelada `k` em cada item da base** (`fr/content.js`): `vocab[i].k`, `phrases[i].k`, `dialogue.lines[i].k`.
   O valor inicial é **exatamente o id de hoje sem o `u`**: `"A1-3-v5"`, `"A1-3-p2"`, `"A1-3-d4"`. Resultado: na Etapa 0 **nenhum id muda**
   (zero migração de dado para quem já estuda). Um script (`fr/scripts/congelar_chaves.js`) escreve as chaves a partir das posições atuais
   uma única vez e um teste garante unicidade e formato.
2. **O id do cartão passa a vir da chave:** palavra = `u{k}` e `u{k}-b`; frase = `u{k}`. Função única `studyItemCardId(item)` usada por todos
   os pontos da tabela 2.1 (fim do `` `u${unit.id}-v${idx}` `` espalhado). Item sem `k` (zh hoje) cai na regra antiga: o zh continua igual.
3. **Item novo ganha chave nova**, nunca reaproveitada: `"{unidade onde nasceu}-v{próximo número livre}"`. Um registro
   (`fr/scripts/item_keys_registry.json`) guarda o maior número já usado por unidade, inclusive de chaves aposentadas. O formato continua
   casando com a regex do cron (`^(u.+-v(\d+))(-b)?$`).
4. **Mover** um item (mudar de lugar na mesma unidade, ir para outra unidade, ir para o A2): a chave vai junto. O id fica igual; só
   `unitId`, `vocabIdx` (posição atual), lição, tags e Course Deck mudam, e todos já são derivados a cada carregamento.
   A chave guarda a unidade de **origem** (`uA1-10-v6` pode morar no A1-28): isso é só um rótulo opaco, nunca lido como lógica.
5. **Reescrever:** correção de texto com o mesmo sentido (*Ça coûte combien ?* → *Ça coûte combien, ce pantalon ?*) mantém `k`.
   Mudança de sentido (trocar *Je vais détester ce plat* por *Je vais prendre un café*) = item novo com `k` novo; o antigo é aposentado.
   A regra fica escrita no cabeçalho do `content.js` e na skill de conteúdo.
6. **Fundir** (o mesmo item em dois lugares, ex.: *français/française* no A1-2 e no A1-9): fica a chave sobrevivente; a outra entra num
   arquivo novo de dados `fr/curriculum-changes.js` como `STUDY_KEY_MERGES = { "A1-9-v0": "A1-2-v7", ... }`. No carregamento, se o save tem
   os dois, aplica-se a **regra de fusão FSRS**: fica o estado do cartão com a revisão mais recente (`lastReview` maior); empate → maior
   `stability`; `firstLearnedDate` = a mais antiga das duas; o perdedor vai para o arquivo (item 7). A e B se fundem separadamente
   (A com A, B com B). Se o save só tem o antigo, ele é renomeado para o sobrevivente.
7. **Excluir:** a chave vai para `STUDY_RETIRED_KEYS` em `fr/curriculum-changes.js`. No carregamento, o progresso de cartão aposentado (e de
   qualquer cartão salvo que não exista mais, por qualquer motivo) vai para `STATE.retiredStudyCards[id] = {...progresso, retiredAt}` e é
   salvo no bloco (whitelist de progresso, poucos bytes por item). Se a chave voltar a existir, o progresso volta. Cartão aposentado não
   conta em métrica, fila, notificação nem painel. Isso também fecha o achado da 2.1 (perda silenciosa).
8. **Portão de lição sem armadilha:** mover uma palavra já estudada de uma unidade concluída para uma unidade nova (não concluída) a
   tiraria da revisão até o aluno fazer a lição nova. Correção: guardar `released: true` no progresso do cartão (campo novo na whitelist)
   na primeira vez que `isCardLessonCompleted` deixar o cartão passar; cartão com `released` passa sempre. A Etapa 0 publica isso **antes**
   de qualquer movimento, então no primeiro carregamento todos os cartões já liberados ganham a marca.
9. **Lições:** salvar também `unitProgress[u].lessonId` (as lições já têm id: `ola-e-tchau`, `checkpoint`...). Ao carregar, se o id da
   lição salva estiver noutra posição, `lessonIdx` é recalculado; se a lição sumiu, volta para a 1ª lição que tem palavra ainda não
   liberada.
10. **Unidades e módulos fundidos ou excluídos:** `UNIT_MERGES` / `MODULE_MERGES` no mesmo arquivo (progresso de unidade: concluída se
    qualquer uma das duas estava; Ponto de verificação: mantém aprovado). Nenhuma fusão de unidade está proposta hoje; o mecanismo fica pronto.
11. **"Na frase" estável:** a frase-exemplo de cada palavra deixa de depender da ordem: o conteúdo pode fixar `exampleK` na palavra; sem
    isso, continua a busca de hoje. Se uma frase deixar de ser exemplo, o progresso dela vai para o arquivo (item 7) e volta se ela voltar.
12. **Camadas (texto em português e em inglês):** continuam por posição na Etapa 0, mas toda mudança de ordem passa por um **script de
    operações** (item 13) que reordena base, `layer.js` e `content.en.js` juntos, mais `lessons` e `afterVocabIdx`. A camada por chave
    (Q-08) fica para quando o app de português precisar (o pt já nasce com chave desde o 1º item).
13. **Script de operações** `fr/scripts/curriculo_ops.js` (lê um arquivo `ops.json` revisável pela dona): operações `reorder`, `move`,
    `merge`, `retire`, `insert`, `retext`. Aplica tudo de uma vez, atualiza `curriculum-changes.js`, regera o mapa do cron e roda os
    validadores (`check_grammar_input.js`, `check_dictation_vocab.py`, camadas). Nenhuma mudança de currículo é feita à mão no arquivo.

### 2.4 Arquivos e funções a mudar

| Arquivo | Mudança |
|---|---|
| `fr/content.js` | campo `k` em 473 itens (script); cabeçalho com a regra de chave |
| `fr/curriculum-changes.js` (novo, dado) | `STUDY_KEY_MERGES`, `STUDY_RETIRED_KEYS`, `UNIT_MERGES`, `MODULE_MERGES`, `CURRICULUM_VERSION` |
| `shared/study-trail-model.js` | `studyItemCardId`; `studyNoteRowForWord`, `buildStudyWordCards`, `buildStudyPhraseCards` usando a chave; `released` em `STUDY_PROGRESS_FIELDS`; `mergeSavedCards` chama antes `applyStudyKeyChanges(saved)` (função pura nova: fusões, aposentados, arquivo) e devolve o que não casou para o arquivo |
| `shared/srs.js:25`, `shared/core/exercicios-licao.js:144`, `fr/app.js:1850` (e equivalentes do zh) | trocar o id montado na mão por `studyItemCardId` |
| `shared/core/revisao-decks.js:569` | `isCardLessonCompleted`: liberar se `card.released`; marcar `released` quando passar |
| `fr/app.js` `serializeState` / `applySerializedState` (linhas 642 e 679) | salvar e ler `retiredStudyCards`; mover gavetas de `cardVariants` e `hardSeenIds` na fusão; recalcular `lessonIdx` por `lessonId`; regra de desbloqueio da 2.10 |
| `shared/deck-browser.js` | esconder Course Deck cuja unidade não existe mais (fica vazio no banco; sem apagar) |
| `supabase/functions/notification-cron/index.ts` | trocar `LESSON_VOCAB_MAP` por um mapa gerado `STUDY_ITEM_GATE` {id base → [unidade atual, lição]}, ignorar aposentados, respeitar `released`. **Exige novo deploy** (registrar) |
| `fr/scripts/congelar_chaves.js`, `fr/scripts/curriculo_ops.js`, `fr/scripts/item_keys_registry.json` (novos) | scripts da 2.3 |
| `tests/fase-e/test_course_decks_unit.js:125` | hoje exige `id === u{unitId}-v{vocabIdx}`; passa a exigir `id === u{k}` |
| `.claude/rules/decks-review.md`, skill de conteúdo | registrar a regra de chave (1 linha cada) |

### 2.5 Migração dos dados dos alunos

- **Etapa 0 em si não migra nada:** as chaves iniciais reproduzem os ids de hoje byte a byte. O que muda no save é só o acréscimo de
  `released`, `lessonId` e `retiredStudyCards`.
- Cada mudança de currículo depois disso é migrada **no cliente, no carregamento, por bloco de curso** (`frances`, `frances@en`...),
  de forma idempotente (aplicar duas vezes dá o mesmo resultado) e registrada com `_curriculumVersion` no bloco.
- **Não exige migration SQL.** O servidor só lê os cartões (cron e painel), e o cron passa a usar o mapa gerado. Enquanto um aluno não abre o
  app, o bloco dele fica com os ids antigos: como os ids não mudam (só fusões e aposentados), as contagens ficam certas, exceto o cartão
  fundido que conta 2 vezes até ele entrar. Aceitável.
- **Opcional, não recomendado agora:** um backfill no servidor (SQL Editor) aplicando as fusões em todos os blocos. Mexe em dado de produção:
  só com autorização explícita da dona e depois do Staging.
- Course Decks: unidade nova ganha deck sozinha (`ensure_course_decks`); deck de unidade que deixar de existir fica vazio e escondido.

### 2.6 Plano de testes

Pasta nova `tests/curriculo-ids/`:
1. **Congelamento sem efeito:** constrói `STATE.cards` antes e depois das chaves e compara o conjunto de ids (tem de ser idêntico) e o texto.
2. **Contas simuladas reais:** 5 saves sintéticos com o formato real (aluno no começo, no meio de uma unidade, A1 quase completo, curso
   `frances` + `frances@en`, conta com cartões da professora e próprios), gerados a partir do conteúdo atual com FSRS variado.
   Opcional e melhor: 3 saves de produção anonimizados (só com autorização da dona; ler sem gravar).
3. **Conteúdo v2 de teste** com as operações da seção 5 (reordenar A1-3, mover números do A1-10, fundir *français*, *manger*, *hier*,
   aposentar *récemment*, inserir A1-21) e verificação, item a item: mesmo `stability`, `difficulty`, `due`, `reps`, `lapses`, `state`,
   `lastReview` para todo item mantido ou movido; regra de fusão aplicada; aposentado no arquivo; nada some.
4. **Ida e volta** (molde de `tests/e4/test_progresso_ida_e_volta.js`): carregar → salvar → zerar → carregar duas vezes = estado igual.
5. **Volta de item aposentado:** aposentar e "desaposentar" devolve o progresso.
6. **Portão:** palavra estudada movida para unidade não iniciada continua na revisão; palavra nova na mesma unidade não entra antes da lição.
7. **Cron:** contagem de "palavras prontas para revisar" antes x depois igual para os saves simulados (Deno test sobre a função pura).
8. Regressão das áreas tocadas: `tests/trilha`, `tests/trilha-tags`, `tests/fase-e`, `tests/k2*`, `tests/curso-progresso`, `tests/e4`,
   `tests/camada-curso`, `tests/i18n`; navegador nos 4 cenários (skill `teste-navegador`).

### 2.7 Riscos

| Risco | Mitigação |
|---|---|
| Chave congelada errada muda um id | teste 1 bloqueia o merge; script determinístico; revisão do diff só de `"k"` |
| Aba antiga (código antigo em cache) salva por cima do bloco e apaga `retiredStudyCards` | subir a versão dos arquivos para forçar recarga; o código antigo não conhece fusões, mas também não apaga cartões existentes; o arquivo perdido só afeta itens já excluídos |
| Fusão escolhe o estado "errado" | regra simples e documentada (revisão mais recente vence); o perdedor fica no arquivo e pode ser restaurado |
| Cron sem novo deploy conta errado | o deploy faz parte da etapa; até lá, nada se move (Etapa 0 não muda ids) |
| zh quebra | item sem `k` usa a regra antiga; testes do zh rodam na regressão |
| Esquecer o script e editar à mão | teste novo compara posições x chaves x camadas; o PR de conteúdo sem `ops.json` falha |

### 2.8 Esforço

Médio. Código ~300 a 400 linhas (modelo, carregamento, portão, cron), 2 scripts, ~10 testes novos. Estimativa: **2 PRs** (0a: chaves +
id derivado + arquivo + `released` + testes; 0b: script de operações + mapa do cron + deploy), 2 a 4 sessões de trabalho.
Grátis x Premium: infraestrutura, **nada muda para o aluno** (tudo grátis, invisível).

### 2.9 O que a Etapa 0 libera

Com ela publicada, as propostas deste documento deixam de se limitar a "só acrescentar": **reordenar** palavras dentro da unidade, **mover**
itens entre unidades (e para o A2), **fundir** repetições, **excluir** o que não serve e **reescrever** frases. As seções 4, 5 e 11 já usam isso.
Nenhuma mudança de conteúdo entra antes da Etapa 0.

### 2.10 Unidade nova antes de unidade já concluída (decisão da dona)

Regra simples: **a unidade nova nasce aberta, mas não concluída.** No carregamento, para cada nível, uma unidade fica aberta se ela é a 1ª do
nível, se a anterior está concluída **ou se alguma unidade depois dela no mesmo nível já está aberta**. Não é bloqueio nem tarefa obrigatória:
o aluno vê a unidade no mapa, pode fazer quando quiser, e ela não exige nada para ele seguir. Ponto de verificação e Teste de Nível já
aprovados continuam aprovados. Efeito visível: a porcentagem do módulo cai um pouco (há uma unidade a mais por fazer). São poucas linhas em
`applySerializedState` (a mesma ideia de `markUnitCompleted`, `fr/app.js:4485-4501`), sem campo novo no save.

---

## 3. FALTAS no A1 (priorizadas, v2)

P0c = P0 **confirmado pela dona**; P0 = proposto; P1 = núcleo A1 que falta; P2 = ajuste. Coluna "Operação" usa o vocabulário da Etapa 0.

| # | Prio. | Falta | Proposta concreta | Operação | Fontes |
|---|---|---|---|---|---|
| 1 | P0c | Números 4 a 9 nunca são vocabulário | A1-3 vira "Números de 0 a 10": *zéro, un/une, deux, trois, **quatre, cinq, six, sept, huit, neuf**, dix, combien* **na ordem natural**; 3 lições de 4 | inserir 6 no meio; reordenar; mover *vingt, l'âge, avoir, ans* para A1-21 | AE 0; D1 1.1; GP 28 |
| 2 | P0c | Números 11 a 19 | nova **A1-21 "Números de 11 a 20 e a idade"**: *onze... dix-neuf, vingt, l'âge, avoir, ans* (13); frases e diálogo de idade **movidos** do A1-3; 21 a 29 numa nota ("*vingt et un*, depois sem *et*") | nova + mover | AE 0; D1 1.1 |
| 3 | P0c | Gênero, artigos, plural | nova **A1-g11** "Artigos, gênero e plural" (v1 item 4, igual) | nova | AE 0, 1.2; D1 1.1, 2.2; GP 10-12; GeDD 2 |
| 4 | P0c | Negação e perguntas | nova **A1-g12** "Frase negativa e perguntas": *ne... pas*; 3 jeitos de perguntar (entonação, *est-ce que*, inversão só para reconhecer); interrogativos; *quel*; **tela "o jeito da rua"** que absorve as notas *in situ* (Dúvida b) | nova | AE 1.1-2.2; D1 2.1-2.2; GP 5, 51-52; GPI 3 |
| 5 | P0c | *aller* + futuro próximo + contraídos | nova **A1-g13** (v1 item 6, igual) | nova | AE 2.2, 4.2; D1 6.1, 7.1; GeDD 5, 13 |
| 6 | P0 | Dados pessoais, soletrar | nova **A1-23** (v1 item 7) + atividade final do módulo 2 (formulário e soletrar, seção 7) | nova | DELF A1 PE1 |
| 7 | P0 | Produção escrita | cartão-postal e outras tarefas viram **atividade final Premium dos módulos** (seção 7) | | DELF A1 PE2 |
| 8 | P0 | Passé composé antes da hora | A1-20 vira "primeiro contato" (objetivo e nota novos), A1-g9 só com *avoir*, nova **A1-g16** com *être* e pronominais, frase "Você concluiu o A1" vai para o Teste de Nível (v1 item 9) | texto + nova | AE 4.3, 5.3; D1 8.2; GeDD 16-20 |
| 9 | P0 | Dias e meses incompletos | A1-7 vira "Dias da semana": *lundi... dimanche* **na ordem**, *aujourd'hui, demain, hier, la semaine* (11); nova **A1-24 "Meses e datas"**: *le mois, la date* (movidos do A1-7), *janvier* e *décembre* (movidos) + os 10 meses que faltam, **na ordem** (14) | inserir, reordenar, mover | AE 1.1-1.2; D1 5.2; VP 15 |
| 10 | P0 | Profissões | nova **A1-22** (v1 item 11) | nova | AE 3.1; D1 1.2; VP 17 |
| 11 | P1 | Números 30 a 100 misturados com roupas no A1-10 (14 palavras) | nova **A1-28 "Números de 30 a 100 e preços"**: *trente... cent* (8, **movidos** do A1-10) + *mille, le prix*; o A1-10 vira "Roupas e compras" com *la chemise, le pull, les chaussures, essayer* (10) | mover + inserir | AE 0, 1.2; VP 9, 13; CPD 6 |
| 12 | P1 | Imperativo | telas novas no A1-g6 (v1 item 12) | | AE 4.2, 5.2; D1 7.2 |
| 13 | P1 | Partitivos e quantidade | nova **A1-g14** (v1 item 13) | | AE 7.1, 8.1; D1 8.1 |
| 14 | P1 | Adjetivos, demonstrativos, *c'est* x *il est* | nova **A1-g15** (v1 item 14) | | AE 2.3, 3.2, 5.3; GPI 5 |
| 15 | P1 | Pronomes tônicos | tela no A1-g1 (v1 item 15) | | AE 3.2; GPI 29 |
| 16 | P1 | Convidar, aceitar, recusar **e desculpar-se** | nova **A1-27** "Convites, festas e desculpas": *la fête, l'anniversaire, inviter, le cadeau, libre, d'accord, avec plaisir, volontiers, désolé / désolée, dommage* + frases *Excusez-moi, je suis en retard. Pardon, je ne peux pas.* (o `02` 12.3 põe desculpar-se e negar no fim do A1) | nova | AE 4.2, 5.1; CPD 22, 25, 26 |
| 17 | P1 | Viagem e hospedagem | nova **A1-26** (v1 item 17) | | AE 2.2-6.3; CPD 5 |
| 18 | P1 | Refeições e restaurante | nova **A1-25** (v1 item 18) | | AE 7.1; D1 8.1; CPD 4 |
| 19 | P1 | Fonética | 7 notas de explicação (v1 item 19 e 8.3) | | AE, D1 |
| 20 | P1 | Francofonia | notas (v1 seção 8) | | AE, D1 |
| 21 | P1 | Gostos | *adorer* no A1-19 (depois de *chanter*, na lição dos verbos de lazer) + nota *aimer* + infinitivo e *moi non plus* | inserir | AE 1.3; CPD 30 |
| 22 | P1 | Causa (*pourquoi / parce que*) | A1-27 (nota) | | AE 2.1; D1 6.1 |
| 23 | P1 | Rotina sem *se coucher* | A1-6: *se coucher* entra no lugar de *manger* (fundido com o do A1-5, item R7) | fundir + inserir | AE 3.3; VP 11 |
| 24 | P1 | Onde se mora | A1-9 ganha *habiter* e *la ville* no lugar de *français* e *brésilien* (fundidos com o A1-2) | fundir + inserir | AE 1.2; D1 1.2 |
| 25 a 33 | P2 | iguais à v1 (descrição física, pagamento, *y*, COD, família, horários, telefone, V/F nas 12 unidades, frases em A1-9 e A1-18) | v1 itens 24 a 33, sem a restrição "no fim" | | |

Correções de texto e gancho (v1, 3.1) continuam iguais, com uma mudança: a reordenação das lições do A1-2 (anomalia 28) agora pode
reordenar também as **palavras** (L1 *je, tu, s'appeler, le nom*; L2 *être, le pays, la France, le Brésil*; L3 *français, brésilien* + diálogo).

---

## 4. Remoções, fusões, deslocamentos e reordenações (liberados pela Etapa 0)

### 4.1 Fusões de repetições

| Repetição (`01` 5.2) | Fica | Sai (vira fusão) | O que entra no lugar |
|---|---|---|---|
| *français / française* | A1-2 (`A1-2-v7`) | A1-9 (`A1-9-v0`) | A1-9: *habiter* |
| *brésilien / brésilienne* | A1-2 (`A1-2-v8`) | A1-9 (`A1-9-v1`) | A1-9: *la ville* |
| *manger* | A1-5 (`A1-5-v7`) | A1-6 (`A1-6-v6`) | A1-6: *se coucher* |
| *hier* | A1-7 (`A1-7-v4`) | A1-20 (`A1-20-v0`) | A1-20: *tôt* e *tard* (usadas no A1-g9: *Je me suis levé tôt.*) |
| 70, 80, 90 em A1-10 e A1-g10 | sem fusão: o A1-g10 é gramática (não gera cartão) | | |
| Frases repetidas ("Combien ça coûte ?", "Je suis {nacionalidade}.") | 1ª ocorrência | 2ª: reescrita com variação, **mesma chave** (mesmo sentido) | |

Regra de fusão do FSRS: seção 2.3, item 6. O diálogo do A1-9 deixa de repetir "Je suis brésilien" e passa a falar de origem e moradia de terceiros.

### 4.2 Exclusões

| Item | Por quê | Para onde vai o progresso |
|---|---|---|
| *récemment* (A1-20) | baixa frequência na fala de A1, difícil de pronunciar, nenhuma frase depende dela | **movida para o A2** (A2-6, relato), progresso intacto. Se a dona preferir excluir de vez: arquivo (volta se a palavra voltar) |
| Frase "Je vais détester ce plat" (A1-5) | sentido estranho para a 1ª aparição do futuro próximo | aposentada; entra *Je vais prendre un café.* com chave nova; regenerar áudio |
| 3 notas *in situ* (A1-3, A1-9, A1-10) | repetidas (Dúvida b) | notas não têm FSRS: encurtar para 1 linha agora; tirar as do A1-9 e A1-10 quando o A1-g12 existir (decisão 13) |

### 4.3 Deslocamentos (unidades e itens)

| # | O quê | De | Para | Por quê |
|---|---|---|---|---|
| D1 | *vingt, l'âge, avoir, ans* + frases e diálogo de idade | A1-3 | A1-21 | A1-3 só com 0 a 10 (o aluno aprende a contar antes de dizer a idade); A1-21 fecha "números até 20 + idade" e já vem colada no A1-g1 (*avoir*) |
| D2 | *le mois, la date, janvier, décembre* | A1-7 | A1-24 | meses juntos e em ordem |
| D3 | *trente... cent* (8) | A1-10 | A1-28 | o A1-10 tinha 14 palavras e misturava roupa com número |
| D4 | A1-14 Transporte e A1-g5 (*faire, prendre*) | A1-m4 | A1-m3 (cidade) | transporte é cidade; *prendre le métro* fecha o módulo da cidade |
| D5 | A1-9 e A1-g4 | ordem A1-g4 → A1-9 | **A1-9 → A1-g4** | input antes da gramática (o validador acusava 0 input para o A1-g4) |
| D6 | A1-10, A1-11, A1-12, A1-g10 | A1-m3 | novo módulo **A1-m8 "Compras"** | o m3 tinha 7 unidades |
| D7 | A1-4 e A1-g2 | A1-m1 | novo módulo **A1-m7 "Quem é você"** | igual à v1 |
| D8 | A1-13 Clima | A1-m4 | continua no A1-m4, que vira "Viagem, tempo e saúde" (clima entra no cartão-postal) | |
| D9 | Mensagem de fim do A1 | A1-g9 | Teste de Nível | anomalia 27 |
| D10 | Passé composé com *être* | dentro do A1-g9 | nova A1-g16 | v1 D1 |

### 4.4 O que sai do A1 ou ganha selo de outro nível

- Jogo "Passé composé ou Imparfait?" e tempos A2/B1 da Conjugação: selo de nível (Dúvida a, decisão 15), tratado em `05-...`.
- Nada do núcleo A1 sai. O passé composé fica no A1 (todas as fontes fecham o A1 com ele; GeDD 16-20 confirma).
- O comparativo (A1-g7) fica no A1 se a dona aprovar a decisão 9.

### 4.5 Tamanho das unidades

Padrão 10 palavras. Exceções aceitas por serem **conjuntos fechados** que se aprendem juntos: A1-3 (12), A1-21 (13), A1-7 (11),
A1-24 (14), A1-19 (11). Decisão 11.

---

## 5. Lista de operações da reorganização do A1 (para o `ops.json`)

Ordem de aplicação, todas depois da Etapa 0. Itens novos ganham chave nova; nada aqui muda id de item que já existe.

1. `insert` A1-3: *quatre, cinq, six, sept, huit, neuf* entre *trois* e *dix*; `move` *vingt, l'âge, avoir, ans* → A1-21 (*combien* fica no A1-3).
2. `insert` unidade A1-21 depois do A1-3; `move` frases/falas de idade do A1-3 → A1-21; frases novas de 0 a 10 no A1-3 (só com vocabulário visto).
3. `reorder` A1-2 (lições e palavras, anomalia 28).
4. `merge` A1-9-v0 → A1-2-v7; A1-9-v1 → A1-2-v8; `insert` A1-9 *habiter, la ville*.
5. `merge` A1-6-v6 → A1-5-v7; `insert` A1-6 *se coucher*.
6. `insert` A1-7 *mercredi, jeudi, vendredi, samedi, dimanche* (na ordem, depois de *mardi*); `move` *le mois, la date, janvier, décembre* → A1-24.
7. `insert` unidade A1-24 depois do A1-7 com os 10 meses restantes, em ordem.
8. `insert` unidade A1-28; `move` A1-10-v6 a v13 → A1-28; `insert` *mille, le prix*; `insert` A1-10 *la chemise, le pull, les chaussures, essayer*.
9. `merge` A1-20-v0 → A1-7-v4; `move` *récemment* → A2-6; `insert` A1-20 *tôt, tard*.
10. `insert` *adorer* no A1-19.
11. `retext` (mesma chave): frases repetidas; `retire` + `insert`: frase R4 do A1-5.
12. `insert` unidades A1-22, A1-23, A1-25, A1-26, A1-27 e gramáticas A1-g11 a A1-g16.
13. Módulos: recompor conforme a seção 11 (ids de módulo antigos mantidos; 2 novos).

Cada operação gera, no relatório do script, a lista de alunos afetados (simulada no teste) e o que muda no áudio (texto novo = mp3 novo,
skill `audio-tts`) e nos Desafios/ditados (módulo de cada linha).

---

## 6. PROPOSTA DE A2 (redimensionada)

### 6.1 Cálculo do tamanho

| Evidência | Valor | Confiança |
|---|---|---|
| Horas guiadas CEFR (estimativas de editoras e da Alliance Française) | A1: ~60 a 100 h; A2: ~180 a 200 h **acumuladas** → o A2 sozinho = ~80 a 140 h | média (números de mercado, não do Conselho da Europa) |
| Razão A2 / A1 em horas (pontos médios) | (190 − 80) / 80 ≈ **1,4** (faixa possível 0,8 a 2,3) | média |
| Vocabulário (regra prática citada por editoras) | A1 ~500 a 700 palavras; A2 ~1.000 a 1.500 acumuladas → o A2 acrescenta **pelo menos tanto quanto o A1** | baixa a média (estimativas variam muito) |
| Tópicos novos de gramática no A2 (`02` 9.2, 10.4, 12.3; D2 1-8; GPI 17-47; rappels do D3) | ~26 pontos (lista na 6.3) contra 16 do A1 revisado | alta |
| Temas de comunicação novos (D2 1-8, CPI 6 blocos, VPI, CPD IV-VI, DELF A2) | ~34 situações (lista na 6.3) contra 28 do A1 revisado | média-alta |
| Competências exigidas a mais no DELF A2 | relato no passado, carta com função, monólogo de 2 min, interação com negociação (`03` seção 3) | alta |

A1 revisado (seção 11): 44 unidades (28 de vocabulário + 16 de gramática), ~291 palavras-cartão, 8 módulos.

**Parâmetro F (tamanho do A2 em relação ao A1):**

| F | Módulos | Unidades | Palavras-cartão | Quando escolher |
|---|---|---|---|---|
| 1,2 | 9 | ~52 (30 + 22) | ~360 (30 × 12) | se a dona quiser publicar o A2 mais cedo |
| **1,4 (recomendado)** | **10** | **60 (34 + 26)** | **~408 (34 × 12)** | bate com a razão de horas e cobre os 26 pontos de gramática sem fundir temas |
| 1,6 | 11 | ~70 (40 + 30) | ~480 | se a dona quiser A2 forte (A2+) e mais revisão |

Mais denso em competências que o A1 (proposta, vale para todo o A2): **12 palavras por unidade** (A1: 10); 12 frases (A1: 8 a 12);
diálogo com 4 checagens (A1: 3); **compreensão oral sem texto antes do diálogo** em toda unidade (E4); 1 documento para ler por unidade
(E5); atividade final Premium por módulo no formato DELF A2 (seção 7); Teste de Nível A2 = simulado DELF A2 completo.

### 6.2 Fora do A2 (teto)

B1: mais-que-perfeito, futuro anterior, pronomes duplos, relativos compostos e *dont*, *si* + imperfeito/condicional, **passiva** (só a GeDD
e a GPI trazem; nenhum método A1/A2), discurso indireto no passado, condicional passado, subjuntivo como sistema, pronomes possessivos
(*le mien*: D3 U1). **No fim do A2 entra só** *il faut que / je veux que* + subjuntivo dos verbos mais frequentes, como fórmula (`02` 12.3, GEF 34).

### 6.3 Mapa do A2 (10 módulos, 60 unidades)

Léxico = proposta minha a partir dos temas das fontes (confiança média; para a dona revisar). Nenhuma palavra repete o A1 revisado.
Cada módulo termina com a atividade final Premium (seção 7.4). Notas: as da v1 (seção 5) continuam valendo para as unidades equivalentes.

**A2-m1 · Lembranças e fases da vida** (DELF A2 PO2: "fale da sua infância")

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-1 Minha infância | descrever como era e o que fazia | *l'enfance, l'enfant, le souvenir, se souvenir de, le jouet, le copain / la copine, l'école primaire, la récréation, la maîtresse / le maître, grandir, autrefois, d'habitude* |
| A2-g1 O imperfeito | formação e usos (descrição, hábito) | |
| A2-2 Antes e agora | comparar a vida de antes e de hoje | *la campagne, le village, le bruit, calme, bruyant / bruyante, la vie, changer, avant, maintenant, moderne, ancien / ancienne, à l'époque* |
| A2-g2 Momentos da ação | *venir de, être en train de, être sur le point de, commencer à, arrêter de* | |
| A2-3 Fases da vida | nascimento, casamento, mudança | *naître, la naissance, le bébé, l'adolescent / l'adolescente, jeune, vieux / vieille, se marier, le mariage, divorcer, déménager, la retraite, mourir* |

**A2-m2 · Contar uma experiência** (DELF A2 PE1: relato de 60 palavras; CO: anúncios)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-4 Uma viagem inesquecível | contar uma viagem | *le voyage, le séjour, l'avion, l'aéroport, le vol, le paysage, la visite, découvrir, inoubliable, rater, faire escale, le décalage horaire* |
| A2-g3 Passé composé x imperfeito | ação pontual x cenário | |
| A2-5 Um imprevisto | contar um problema e a solução | *perdre, oublier, tomber en panne, être en retard, la grève, le problème, heureusement, malheureusement, soudain, tout à coup, réparer, se tromper* |
| A2-g4 Passé composé a fundo | concordância do particípio, negação, pronominais | |
| A2-6 Acontecimentos | contar um fato do bairro (acidente, roubo) | *l'accident, le vol (roubo), voler, le voleur / la voleuse, le témoin, la police, porter plainte, blessé / blessée, l'incendie, les pompiers, se passer, arriver (acontecer)* + *récemment* (movida do A1-20) |
| A2-g5 Tempo, duração e conectores | *il y a, depuis, pendant, en, ça fait... que*; *d'abord, ensuite, puis, enfin* | |

**A2-m3 · Objetos e consumo** (DELF A2 PO3: trocar um produto; CE: anúncio)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-7 Descrever um objeto | forma, matéria, função | *l'objet, la forme, rond / ronde, carré / carrée, en bois, en métal, en plastique, en verre, léger / légère, lourd / lourde, pratique, servir à* |
| A2-g6 Relativos *qui, que, où* | | |
| A2-8 Comprar on-line e reclamar | encomendar, reclamar, trocar, reembolso | *la livraison, livrer, le colis, rembourser, le remboursement, échanger, le ticket de caisse, abîmé / abîmée, marcher (funcionar), la réclamation, le service client, en ligne* |
| A2-g7 Comparativo e superlativo | | |
| A2-9 Consumo responsável | segunda mão, desperdício | *d'occasion, le vide-grenier, vendre, jeter, garder, utile, inutile, gaspiller, le gaspillage, la marque, la qualité, la mode* |
| A2-g8 Pronomes demonstrativos | *celui, celle, ceux, celles (-ci, -là)* | |

**A2-m4 · Saúde e bem-estar** (DELF A2 PO3: consulta; CO: recado de consultório)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-10 Na consulta | marcar, descrever sintomas, entender a receita | *le rendez-vous, l'ordonnance, le médicament, le comprimé, la douleur, tousser, le rhume, la grippe, se faire mal, allergique, guérir, la carte Vitale* |
| A2-g9 Pronomes COD | *le, la, les* no presente, PC, futuro próximo | |
| A2-11 Corpo e emergências | partes do corpo, acidente, pronto-socorro | *le bras, la jambe, le dos, la gorge, la dent, l'œil / les yeux, le cœur, se casser, les urgences, l'ambulance, le dentiste, le pansement* |
| A2-g10 Pronomes COI | *lui, leur* + *me, te, nous, vous* | |
| A2-12 Esporte e hábitos saudáveis | hábitos, conselhos | *la forme, être en forme, courir, nager, la salle de sport, l'entraînement, le match, gagner, l'équipe, le sommeil, le stress, équilibré / équilibrée* |
| A2-g11 Condicional presente | cortesia e conselho (*tu devrais*) | |

**A2-m5 · À mesa** (DELF A2 PO3: reservar e pedir; CE: cardápio)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-13 No restaurante | reservar, pedir, apreciar, reclamar do prato | *la réservation, le plat du jour, la spécialité, saignant, à point, bien cuit, le pourboire, délicieux / délicieuse, fade, salé / salée, sucré / sucrée, épicé / épicée* |
| A2-g12 Pronome *en* | quantidade e *de* + coisa | |
| A2-14 Receitas | explicar uma receita | *la recette, couper, mélanger, cuire, ajouter, faire bouillir, la poêle, le four, la casserole, la cuillère, l'ingrédient, la farine* |
| A2-g13 Imperativo com pronomes e negativo | *Prends-le ! Ne le prends pas !* | |
| A2-15 Os sentidos e o gosto | descrever sabores e cheiros | *le goût, goûter, l'odeur, sentir (cheirar), toucher, doux / douce, amer / amère, acide, croustillant / croustillante, moelleux / moelleuse, avoir l'air, le parfum* |
| A2-g14 Advérbios | intensidade (*assez, plutôt, trop*), *-ment*, *de plus en plus* | |

**A2-m6 · Estudos e projetos** (DELF A2 PO2: monólogo sobre estudos e planos)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-16 Estudos e formação | contar a formação | *les études, la fac, le lycée, le diplôme, l'examen, réussir, échouer, le stage, la formation, s'inscrire, la matière, la note* |
| A2-g15 Futuro simples | regulares e irregulares | |
| A2-17 Aprender línguas | falar do próprio aprendizado | *apprendre, la langue étrangère, le cours, le niveau, le vocabulaire, la prononciation, l'accent, la faute, bilingue, l'échange, progresser, réviser* |
| A2-g16 *quand* + futuro e *si* + presente/futuro | | |
| A2-18 Projetos e sonhos | planos, desejos | *le projet, le rêve, rêver de, l'avenir, espérer, avoir envie de, un jour, plus tard, prochain / prochaine, décider de, réaliser, le but* |
| A2-g17 *savoir* x *connaître* e verbos com *à / de* | cumpre a promessa do A1-g6 (anomalia 22) | |

**A2-m7 · Trabalho e dinheiro** (DELF A2 PO2/PO3; CE: oferta de emprego)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-19 O mundo do trabalho | falar do trabalho | *le / la collègue, le / la chef, le salaire, l'emploi, le poste, le contrat, la réunion, les congés, à temps plein, à temps partiel, le boulot, embaucher* |
| A2-20 Procurar emprego | CV, candidatura, entrevista | *le CV, la lettre de motivation, l'offre d'emploi, postuler, l'entretien, le candidat / la candidate, l'expérience, la compétence, motivé / motivée, sérieux / sérieuse, le chômage, démissionner* |
| A2-g18 Obrigação, proibição, permissão | *il est interdit de, avoir le droit de, il ne faut pas* | |
| A2-21 Regras e avisos | ler placas e regulamentos | *interdit / interdite, autorisé / autorisée, avoir le droit de, le règlement, respecter, obligatoire, permettre, défendre (proibir), le panneau, l'amende, fumer, stationner* |
| A2-22 Banco e dinheiro | conta, cartão, economizar | *la banque, le compte, la carte bancaire, le distributeur, retirer, le code, le virement, dépenser, économiser, les économies, prêter, emprunter* |
| A2-g19 Discurso indireto no presente | *il dit que, il demande si / ce que / où* | |

**A2-m8 · Moradia e cidade** (DELF A2 CE: classificado; PO3: combinar com um vizinho)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-23 Procurar moradia | ler anúncio, perguntar, visitar | *louer, le loyer, l'annonce, l'agence immobilière, meublé / meublée, les charges, la caution, le / la propriétaire, le / la locataire, le quartier, lumineux / lumineuse, l'ascenseur* |
| A2-24 Dividir apartamento e vizinhos | regras da casa, reclamar do barulho | *la colocation, le / la colocataire, le voisin / la voisine, partager, faire le ménage, faire la vaisselle, sortir les poubelles, ranger, sale, propre, déranger, se plaindre* |
| A2-g20 Pronome *y* | lugar e *à* + coisa (*j'y pense*) | |
| A2-25 Serviços e papelada | correio, prefeitura, formulários | *la poste, la lettre, le timbre, envoyer, la mairie, le formulaire, remplir, signer, le dossier, la carte d'identité, le permis de conduire, la file d'attente* |
| A2-26 Trânsito e carro | dirigir, estacionar | *la route, l'autoroute, la circulation, le bouchon, conduire, le feu, le carrefour, le parking, se garer, l'essence, le péage, le covoiturage* |
| A2-g21 Indefinidos | *quelqu'un, quelque chose, tout / tous / toute(s), chaque, plusieurs* | |

**A2-m9 · Comunicar e se relacionar** (DELF A2 PE2: carta com função; CO: mensagens de voz)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-27 Telefonar e deixar recado | ligar, atender, recado | *allô, rappeler, laisser un message, la messagerie, ne quittez pas, de la part de qui, décrocher, raccrocher, occupé / occupée, le répondeur, joindre, la ligne* |
| A2-28 Escrever para convidar, recusar, agradecer | carta e mensagem com função | *cher / chère, l'invitation, remercier, s'excuser, accepter, refuser, regretter, la réponse, amitiés, bisous, cordialement, à très vite* |
| A2-g22 Pergunta formal e interrogativos | inversão produzida, *lequel / laquelle* | |
| A2-29 Sentimentos e reações | felicitar, consolar, surpresa | *content / contente, triste, fâché / fâchée, inquiet / inquiète, surpris / surprise, déçu / déçue, fier / fière, jaloux / jalouse, féliciter, consoler, félicitations, la nouvelle* |
| A2-30 Internet e redes | publicar, comentar (CEFR CV: interação on-line A2) | *le réseau social, publier, la publication, le commentaire, commenter, s'abonner, le lien, télécharger, le mot de passe, l'appli, l'écran, l'ordinateur* |
| A2-g23 Negação complexa e *ne... que* | *plus, rien, personne, aucun, jamais* (revisão) | |

**A2-m10 · Opinião, cultura e mundo** (DELF A2 PO2: "um filme/livro"; CE: artigo curto)

| Unidade | Objetivo | Léxico (12) ou conteúdo |
|---|---|---|
| A2-31 Livro, filme, exposição | apresentar e opinar | *le roman, l'auteur / l'autrice, le personnage, l'histoire, la bande dessinée, l'exposition, le tableau, le / la peintre, le spectacle, raconter, émouvant / émouvante, ennuyeux / ennuyeuse* |
| A2-g24 Opinar e ligar ideias | *je pense que, à mon avis*; causa, consequência, finalidade (*comme, donc, pour* + inf., *grâce à, à cause de*) | |
| A2-32 Patrimônio e festas | monumentos, 14 de julho, tradições | *le monument, le château, l'église, le patrimoine, la tradition, la fête nationale, le feu d'artifice, le défilé, célébrer, historique, le siècle, le roi / la reine* |
| A2-33 Meio ambiente | o que faço, concordar e discordar | *l'environnement, la planète, la nature, le climat, le réchauffement climatique, trier, recycler, les déchets, la pollution, polluer, l'énergie, protéger* |
| A2-g25 Gerúndio | *en + -ant* (simultaneidade, modo) | |
| A2-34 Viajar pela francofonia | paisagens e pontos cardeais | *le nord, le sud, l'est, l'ouest, la côte, l'île, le fleuve, la forêt, le désert, la région, la frontière, francophone* |
| A2-g26 *Il faut que / je veux que* | subjuntivo só em fórmula, verbos frequentes (`02` 12.3) | |

**Totais:** 10 módulos, 60 unidades (34 de vocabulário + 26 de gramática), 408 palavras-cartão + *récemment* movida do A1.
Ordem de construção recomendada: m1 → m2 (passado = coração do DELF A2) → m9 (carta) → os demais.
Grátis x Premium: trilha do A2 **grátis** (como o A1); atividade final de cada módulo e Desafios **Premium** (paywall desligado hoje:
todos usam); 1 ditado grátis por módulo.

---

## 7. Atividade final Premium de cada módulo (ideia da dona)

### 7.1 O que é

Cada módulo termina com uma **tarefa de verdade**, no formato do DELF, que junta o que o módulo ensinou: preencher uma ficha, soletrar
nome e e-mail, escrever um cartão-postal, mandar um convite, contar o fim de semana, gravar uma apresentação. Ela mora nos **Desafios**,
aparece na trilha **depois do Ponto de verificação**, como o último nó do módulo, e **não bloqueia** o módulo seguinte (o Ponto de
verificação continua sendo o que destrava). Os módulos passam a ser desenhados **de trás para a frente**: primeiro a tarefa final, depois
as unidades que dão o vocabulário e a gramática que ela exige.

Privacidade: tarefas de dados pessoais usam um **personagem fictício** ("Preencha a ficha de hotel da Sophie Martin"), nunca os dados reais
do aluno (LGPD; o DELF faz o mesmo). Decisão 22.

### 7.2 Como corrigir: comparação

| Forma | Como funciona | Custo | Qualidade | Esforço de implementação | Encaixe grátis x Premium |
|---|---|---|---|---|---|
| **Automática** | campos com gabarito (data no formato certo, *né / née* concordando, e-mail com @), soletrar letra a letra com comparação exata, frases curtas com o comparador tolerante (`shared/translation-compare.js` e o comparador da família latina para acentos) | zero | alta em tarefa fechada (formulário, soletrar, ditado de números); inútil em texto livre | baixo: reusa `type_answer`, ditado e comparadores | parte de toda atividade |
| **Semiautomática** | o sistema confere **peças obrigatórias** (cumprimento, fecho, mínimo de palavras, 1 verbo no passé composé...) por regras simples (`mustInclude`, que já existe no Ouça e traduza, `fr/app.js`), mostra uma **resposta-modelo** e uma **rubrica de 4 itens** em que o aluno se autoavalia | zero | média: pega o que falta, não pega erro de gramática | baixo a médio: renderer de texto livre + checklist | parte de toda atividade |
| **Por IA** | Edge Function nova (ex.: `writing-feedback`) manda o texto + a rubrica DELF A1/A2 para o modelo e devolve nota por critério e 3 correções comentadas | **Claude Haiku 5.5** (US$ 0,10 / 1M tokens de entrada, US$ 0,50 / 1M de saída): ~US$ 0,0004 por correção de ~1.500 + 500 tokens, ~US$ 0,40 por 1.000; **Claude Sonnet 5.5** (US$ 2 / US$ 10): ~US$ 0,008 por correção, ~US$ 8 por 1.000 (preços da tabela de 2026-10-06) | boa para A1/A2 se calibrada; risco de corrigir demais ou aceitar erro | médio: função, chave secreta no servidor, cota por conta, registro de uso, texto de privacidade (o texto do aluno vai para a API) | só Premium com cota (ex.: 10 por mês), **depois** que existir paywall; sem paywall o custo não tem teto |
| **Pela professora** | o envio cai numa **fila de correção** na aba Professora (só alunos vinculados em `teacher_students`), ela marca a rubrica, escreve um comentário ou grava um áudio; o aluno recebe no sino | tempo da professora | a melhor | alto: tabela nova de envios + RLS + migration (Staging antes) + tela + aviso no sino no idioma de quem recebe (`_ui_lang`) + bucket de áudio para tarefa oral | grátis para aluno vinculado (é parte da aula), independente de Premium |
| **Combinação (recomendada)** | automática + semiautomática em toda atividade; professora para vinculados; IA depois como Premium | ver acima | | em fases | ver 7.3 |

### 7.3 Recomendação

1. **Fase 1 (junto com a 1ª atividade final):** só automática + semiautomática + resposta-modelo. Custo zero, funciona sem login de
   professora, cobre bem formulário, soletrar, ditado de números e diálogo em turnos; para texto livre, o aluno se autoavalia com a rubrica.
2. **Fase 2:** fila de correção da professora para alunos vinculados (13 dos 24 alunos atuais estudam português; a fila serve aos dois
   idiomas). Precisa de migration e de autorização para criar a tabela em produção.
3. **Fase 3 (só depois do paywall):** feedback por IA como benefício Premium, com cota, Haiku 5.5 primeiro; antes de ligar, piloto com
   30 a 50 textos reais corrigidos pela professora para medir concordância. Sem nome nem e-mail no texto enviado.

**Grátis x Premium:** a atividade final é **Premium** (nos Desafios); com o paywall desligado (`CHALLENGE_PAYWALL_ENABLED=false`), todos
usam e ela aparece com o selo Premium, como os Jogos da Conjugação. Correção automática e semiautomática vêm junto (Premium). Correção da
professora: aluno vinculado. IA: Premium com cota, só com paywall. A trilha continua inteira grátis.

### 7.4 Atividades finais por módulo

| Módulo | Atividade final (Premium) | Correção (fase 1) | Competência DELF |
|---|---|---|---|
| A1 · 1 Primeiros contatos | **Mensagem de apresentação** no grupo da turma (20 a 30 palavras: cumprimentar, nome, nacionalidade, idade, despedir-se) + entrevista gravada de 3 perguntas | checklist de 5 peças + modelo; gravação autoavaliada | PE / PO1 |
| A1 · 2 Quem é você | **Ficha de inscrição** de um personagem (8 campos) + **soletrar** nome e e-mail ouvidos | automática por campo; soletrar exato | PE1 / CO |
| A1 · 3 Rotina e calendário | **Marcar um encontro**: mensagem com dia, hora e lugar respondendo a um convite | checklist (dia da semana, hora, *à* + hora) + modelo | PE |
| A1 · 4 Na cidade | **Explicar o caminho** a um amigo (mensagem com 3 instruções) + mediação: repassar em português o horário de um aviso | checklist + automática na mediação (comparador) | PE / mediação |
| A1 · 5 Compras | **Diálogo em turnos na loja** (pedir, perguntar preço e tamanho, pagar) + ditado de preços | automática (escolhas e números) | PO3 / CO |
| A1 · 6 Viagem, tempo e saúde | **Cartão-postal** de 40 palavras (onde está, o tempo, o que faz, despedida) | checklist de 5 peças + contagem + modelo | PE2 |
| A1 · 7 Casa e descrição | **Anúncio do seu apartamento** ou **descrição de uma pessoa** (30 a 40 palavras) | checklist + modelo | PE |
| A1 · 8 Lazer, convites e passado | **Convite e resposta** (aceitar ou recusar com motivo) + **"Conte seu fim de semana"** em 5 frases no passé composé | checklist (*parce que*, 3 verbos no PC) + modelo | PE / PO |
| A2 · 1 a 10 | uma tarefa DELF A2 por módulo: monólogo da infância (m1), relato de 60 palavras (m2), reclamação de produto (m3), consulta por telefone (m4), reserva e pedido (m5), monólogo sobre estudos (m6), candidatura curta (m7), mensagem ao proprietário (m8), carta com função (m9), opinião sobre um filme (m10) | semiautomática; professora para vinculados | PE / PO / CE / CO |

O mini-simulado DELF por módulo da v1 (E9) sai: a atividade final ocupa esse lugar. O simulado completo fica só no Teste de Nível (decisão 17).

---

## 8. Desafios e ditados (Conjugação fora deste plano)

**Conjugação:** fora do escopo; achados e plano em `05-mensagem-sessao-conjugacao.md`.

Desafios (regra da skill `criar-desafios`, igual à v1 6.2): `challengeChecklist` por unidade/módulo novo; Ditado = trilha (1 grátis + 2
Premium por módulo); Ouça e traduza, Acentuação, Expressões, Complete a frase = Premium; tudo entra `needs_review` com `.md`.
Mudanças da v2:
- **Atividade final** (seção 7) vira uma categoria nova de Desafio (`module_task`), 1 por módulo, Premium.
- Complete a frase para todas as gramáticas (A1-g1 a A1-g16): ~70 novos (v1).
- Recomposição dos módulos (seção 11) muda o `moduleId` de mais linhas que na v1: unidades A1-10, A1-11, A1-12 (→ A1-m8) e A1-14 (→ A1-m3).
  O número exato sai do checklist depois da Etapa 0. **Dado em produção: só com autorização explícita** e Staging antes (decisão 21).
- A1-24 (meses) torna *février* e *août* alvos legítimos de Acentuação (anomalia 25 resolvida).
- Ditados: 3 por módulo novo (A1-m7, A1-m8); formatos novos "ditado de números" (A1-m1, A1-m8) e "ditado de soletrar" (A1-m7, também
  usado na atividade final); rodar `check_dictation_vocab.py` depois das operações (palavras mudam de módulo); revisão do A1 (r1 a r3) refeita.
- A2: ~10 módulos × (OT ~8, Acentuação ~6, Expressões ~5, Complete a frase ~18) ≈ 370 desafios + 33 ditados (3 por módulo + 3 de revisão).

---

## 9. Exercícios novos (para a dona ler um por um)

O motor hoje gera tudo a partir dos campos da unidade (vocabulário, frases com blocos, cenário, V/F, diálogo com `check`, telas de gramática,
consolidação, Ponto de verificação, Teste de Nível). Regra de grátis x Premium dos exercícios: **dentro da trilha = grátis**; quando o mesmo
formato é a atividade final do módulo = Premium (seção 7).

### E1 · Produção escrita guiada

- **O que é:** o aluno escreve um texto curto com destinatário e objetivo claros. Antes de escrever, vê as "peças obrigatórias"; depois de
  enviar, o sistema marca as peças encontradas, mostra a resposta-modelo e pede a autoavaliação em 4 itens (cumpri a tarefa? usei o
  vocabulário? frases compreensíveis? ortografia?).
- **Exemplo (A1-26, Férias e hotel; versão curta na trilha, 25 palavras):**
  1. Tela: "Você está de férias em Nice. Escreva uma mensagem curta para a sua amiga Léa." Peças: cumprimentar · dizer onde está ·
     dizer como está o tempo · dizer uma coisa que faz · despedir-se.
  2. O aluno escreve: *Salut Léa ! Je suis à Nice. Il fait beau. Je vais à la plage. Bisous !*
  3. Correção: as peças são procuradas por listas de formas (cumprimento: *salut, bonjour, coucou*; tempo: *il fait, il pleut*; despedida:
     *bisous, à bientôt, au revoir*...) → 5 de 5 ✓; contagem de palavras 15 (mínimo 12) ✓; aparece o modelo
     *Coucou Léa ! Je suis en vacances à Nice. Il fait chaud et je vais à la plage tous les jours. À bientôt !*; o aluno marca a rubrica.
- **Onde:** 1 por módulo dentro de uma unidade (versão curta, grátis) + a atividade final (versão DELF, Premium).
- **Motor:** campo novo `writingTask` na unidade e um renderer simples (área de texto + lista de peças); a busca de peças reaproveita a lógica de
  `mustInclude` do Ouça e traduza. Sem FSRS.

### E2 · Formulário

- **O que é:** uma ficha (hotel, inscrição, cadastro) com campos que o aluno preenche a partir de uma pequena ficha de personagem ou de
  um áudio.
- **Exemplo (A1-23, Dados pessoais):**
  1. Tela: ficha de personagem em imagem/texto: "Sophie Martin, née le 3 mars 1998 à Lyon, française, 12 rue des Lilas, 69003 Lyon,
     sophie.martin@mail.fr".
  2. Formulário *Fiche d'inscription*: *Nom* · *Prénom* · *Date de naissance* · *Nationalité* · *Adresse* · *Code postal* · *Ville* · *E-mail*.
  3. Respostas esperadas: MARTIN · Sophie · 03/03/1998 (aceita *3 mars 1998*) · *française* (com *e*: a ficha é de mulher) · 12 rue des
     Lilas · 69003 · Lyon · sophie.martin@mail.fr.
  4. Correção automática por campo: caixa e acento tolerados no nome; *français* em vez de *française* = "quase: a Sophie é mulher".
- **Onde:** A1-23 (trilha, grátis) e atividade final do A1-m7 (Premium).
- **Motor:** vários `type_answer` numa tela; normalização de data e e-mail; nada de dado real do aluno.

### E3 · Tarefa final do módulo

- **O que é:** o fecho do módulo (seção 7), montado com E1, E2, E6, E7 ou ditado, conforme o módulo.
- **Exemplo (A1-m6, Viagem, tempo e saúde, cartão-postal DELF A1 PE2):**
  1. Tela: foto de um cartão-postal; "Você está de férias. Escreva um cartão-postal para um amigo francês (40 palavras): onde você está,
     o tempo, o que você faz, o que você comeu, despedida."
  2. Resposta esperada (modelo): *Cher Paul, je suis à Marseille avec ma famille. Il fait très chaud ! Le matin, je vais à la plage et
     l'après-midi, je visite la ville. Hier, j'ai mangé une bouillabaisse. C'est délicieux ! À bientôt, Ana.*
  3. Correção: checklist de 5 peças + mínimo de 35 palavras + 1 verbo no passé composé → modelo → rubrica DELF simplificada (cumprir a
     tarefa, léxico, gramática, ortografia, 0 a 2 pontos cada).
- **Onde:** depois do Ponto de verificação de cada módulo. **Premium.**
- **Motor:** um tipo de Desafio novo (`module_task`) com os blocos acima; registro em `completedChallenges` (já existe).

### E4 · Compreensão oral antes do texto

- **O que é:** o aluno ouve o diálogo **sem ver o texto**, duas vezes (como no DELF), responde 3 perguntas e só então vê o diálogo com as
  checagens de hoje.
- **Exemplo (A1-14, Transporte):**
  1. Tela "Ouça a conversa (2 vezes)". Áudio do diálogo da unidade (já existe mp3).
  2. Perguntas: *Où va la femme ?* (a) *à la gare* (b) *au musée* (c) *à l'hôpital*; *Elle prend quel transport ?* (a) *le bus* (b) *le
     métro* (c) *le train*; *Le billet coûte...* (a) 2 € (b) 12 € (c) 20 €.
  3. Correção automática (múltipla escolha); depois, o texto aparece com a resposta destacada.
- **Onde:** A1 a partir do módulo 2; todo o A2. **Grátis.**
- **Motor:** passo novo `listenFirst` antes do passo `dialogue`, perguntas num campo `listenQuestions` do diálogo; reusa áudio e múltipla escolha.

### E5 · Compreensão escrita com documento

- **O que é:** um "documento" do dia a dia (placa, cardápio, horário, anúncio) desenhado em HTML, com 3 perguntas.
- **Exemplo (A1-25, Refeições e restaurante):**
  1. Card estilo lousa: *Menu du jour · 15 € · Entrée + plat ou plat + dessert · Entrée : salade de tomates · Plat : poulet rôti, frites ·
     Dessert : tarte aux pommes · Boisson non comprise*.
  2. Perguntas: *Le menu coûte combien ?* (15 €) · *La boisson est comprise ?* (não) · *Quel est le dessert ?* (a torta de maçã).
  3. Correção automática (múltipla escolha e verdadeiro/falso).
- **Onde:** A1-10 (etiqueta de preço), A1-14 (horário de trem), A1-25 (cardápio); A2: 1 por unidade. **Grátis.**
- **Motor:** campo `readingDocs` (HTML simples, estilos do próprio arquivo com tokens de cor validados nos 4 cenários) + múltipla escolha.

### E6 · Produção oral com gravação

- **O que é:** o aluno ouve uma pergunta da entrevista DELF, grava a resposta, ouve o modelo e se autoavalia.
- **Exemplo (A1-22, Profissões):**
  1. Áudio: *Qu'est-ce que vous faites dans la vie ?*
  2. O aluno grava (até 30 s). Resposta esperada: *Je suis infirmière. Je travaille dans un hôpital.*
  3. Ouve a própria gravação e o modelo; marca: "respondi à pergunta", "usei *je suis* + profissão sem artigo", "dá para entender".
  4. Sem correção automática da pronúncia (reconhecimento de fala no navegador é instável; fica para depois).
- **Onde:** A1-m1 e A1-m7 (entrevista), A2 (monólogo de 2 min). Grátis na trilha; Premium na atividade final.
- **Motor:** reusa o gravador do editor de cartões (`shared/flashcard-field-audio-recorder.js`, `audio.type='recording'`); a gravação fica só
  no aparelho na fase 1 (sem envio, sem custo de armazenamento); envio para a professora na fase 2.

### E7 · Diálogo em turnos

- **O que é:** o cenário de hoje ("o que você diz?") em sequência, construindo a conversa inteira.
- **Exemplo (A1-10, Roupas e compras):**
  1. Vendedora: *Bonjour, je peux vous aider ?* → escolha: (a) *Oui, je cherche un pull.* ✓ (b) *Non, il fait froid.* (c) *Je suis vendeuse.*
  2. *Quelle taille ?* → (a) *Rouge.* (b) *Du 38.* ✓ (c) *Trente euros.*
  3. *Il coûte 30 euros.* → (a) *C'est cher ! Vous avez moins cher ?* ✓ (b) *Je m'appelle Ana.* (c) *À droite.*
  4. *Celui-ci coûte 20 euros.* → (a) *Je le prends.* ✓ (b) *Je prends le bus.* (c) *J'ai vingt ans.*
  5. Correção automática; errar mostra por quê e repete o turno.
- **Onde:** A1-10, A1-25, A1-26; A2-8, A2-13, A2-23. **Grátis.**
- **Motor:** lista de `scenario` encadeados (formato atual) com o diálogo como roteiro; sem renderer novo.

### E8 · Pares mínimos (fonética)

- **O que é:** ouvir uma palavra e escolher entre duas que soam parecido.
- **Exemplo (A1-8, nota [y] x [u]):** áudio *la rue* → (a) *la rue* ✓ (b) *la roue*; áudio *tout* → (a) *tu* (b) *tout* ✓; áudio *ils ont* →
  (a) *ils sont* (b) *ils ont* ✓. 6 itens; correção automática; o erro toca as duas palavras em seguida.
- **Onde:** nas unidades das notas de fonética (v1, 8.3). **Grátis.**
- **Motor:** escuta + múltipla escolha. **Risco:** a voz do TTS precisa diferenciar bem cada par; testar no laboratório de áudio antes (skill
  `audio-tts`); par que a voz não diferencia não entra.

### E9 · Simulado DELF no Teste de Nível

- **O que é:** o Teste de Nível A1 (e depois o A2) ganha um modo "simulado DELF": CO (2 documentos), CE (2), PE (E1), PO (E6), 25 pontos
  cada; aprovação com 50/100 e mínimo 5/25 por parte, como o DELF.
- **Exemplo (fim do A1):** CO: anúncio de estação (*Le train pour Lyon partira du quai 3 à 10 h 15*) → "De que plataforma sai o trem?";
  CE: convite de aniversário → "Que dia é a festa?"; PE: cartão-postal; PO: 3 perguntas gravadas. CO e CE automáticas; PE e PO pela rubrica.
- **Onde:** só no Teste de Nível (o mini-simulado por módulo sai, seção 7.4). Grátis (decisão 17).
- **Motor:** reusa E1, E4, E5, E6; o Teste de Nível atual continua sendo o que vale para "concluir o nível".

### E10 · Mediação ("repasse a informação")

- **O que é:** ler ou ouvir um aviso em francês e responder em português a alguém que pergunta.
- **Exemplo (A1-6, Horas e rotina):** placa *Pharmacie · Ouvert du lundi au samedi de 9 h à 19 h 30 · Fermé le dimanche*. Pergunta da mãe
  do aluno (em português): "Que horas a farmácia fecha no sábado?" Resposta esperada: "Às sete e meia da noite" (aceita "19h30", "às 19:30").
  Correção pelo comparador de tradução (`shared/translation-compare.js`) com lista de respostas aceitas.
- **Onde:** A1-6, A1-14, A1-25; A2 com textos maiores. **Grátis.**
- **Motor:** compatível (comparador já existe). No site em inglês a pergunta e a resposta são em inglês (regra do site em inglês).

**Ordem de implementação:** E7 e E4 (só dados) → E1/E2/E3 (renderer simples; dão a atividade final) → E5 → E10 → E8 → E6 → E9.

---

## 10. Notas de realidade e culturais

Continuam as propostas da v1 (seções 8.1 a 8.3), com três mudanças:
- **Notas *in situ*:** encurtar as do A1-3, A1-9 e A1-10 já; tirar as do A1-9 e A1-10 quando o A1-g12 existir (Dúvida b, decisão 13).
- **Regional de números:** a parte *septante / nonante / huitante* sai do A1-3 e vai para o A1-21 (gatilho *dix-sept* ou *vingt*); a do
  A1-3 fica só "a contagem muda depois do 69, você vai ver no A1-28".
- **Desculpar-se:** nota de realidade no A1-27: *Désolé(e) !* x *Pardon !* x *Excusez-moi* (alta).

Toda nota nova ou editada sai com nível de confiança no chat (regra do projeto) e segue a skill `notas-de-realidade`.

---

## 11. Mapa do A1 revisado (v2)

Status: **M** mantida; **A** alterada; **N** nova; **→** mudou de módulo. Todas as mudanças de item passam pelas operações da seção 5.

| Módulo (posição · id · título) | Unidades na ordem | Status | Palavras | O que muda |
|---|---|---|---|---|
| **1 · A1-m1 · Primeiros contatos** | A1-1 | A | 10 | nota Quebec *bienvenue* |
| | A1-2 | A | 10 | palavras e lições reordenadas |
| | A1-3 Números de 0 a 10 | A | 12 | +6 números na ordem; idade sai |
| | **A1-21 Números de 11 a 20 e a idade** | N | 13 | recebe idade e frases do A1-3 |
| | A1-g1 | A | | + pronomes tônicos |
| | *Atividade final: mensagem de apresentação + entrevista* | N | | Premium |
| **2 · A1-m7 (novo) · Quem é você** | A1-4 → | A/→ | 10 | + frases de família |
| | **A1-g11 Artigos, gênero e plural** | N | | P0c |
| | A1-g2 → | M/→ | | |
| | **A1-22 Profissões** | N | 10 | |
| | **A1-23 Dados pessoais** | N | 10 | E2 |
| | **A1-g12 Negação e perguntas** | N | | P0c |
| | *Atividade final: ficha + soletrar* | N | | Premium |
| **3 · A1-m2 · Rotina e calendário** | A1-5 | A | 10 | frase R4 trocada |
| | A1-6 | A | 10 | *manger* fundido, + *se coucher* |
| | A1-g3 | A | | + letras mudas |
| | A1-7 Dias da semana | A | 11 | dias completos na ordem; meses saem |
| | **A1-24 Meses e datas** | N | 14 | |
| | *Atividade final: marcar um encontro* | N | | Premium |
| **4 · A1-m3 · Na cidade** | A1-8 | A | 10 | |
| | **A1-g13 aller, futuro próximo, contraídos** | N | | P0c |
| | A1-9 | A | 10 | fusões; + *habiter, la ville* |
| | A1-g4 | M | | agora depois do A1-9 |
| | A1-14 → | A/→ | 10 | vem do m4 |
| | A1-g5 → | M/→ | | vem do m4 |
| | *Atividade final: explicar o caminho + mediação* | N | | Premium |
| **5 · A1-m8 (novo) · Compras** | **A1-28 Números de 30 a 100 e preços** | N | 10 | 8 movidos do A1-10 |
| | A1-g10 → | M/→ | | |
| | A1-10 Roupas e compras → | A/→ | 10 | + 4 roupas; números saem |
| | A1-11 → | A/→ | 10 | |
| | A1-12 → | A/→ | 10 | |
| | **A1-g14 Partitivos e quantidade** | N | | |
| | *Atividade final: diálogo na loja + ditado de preços* | N | | Premium |
| **6 · A1-m4 · Viagem, tempo e saúde** | **A1-25 Refeições e restaurante** | N | 10 | |
| | A1-13 | A | 10 | |
| | **A1-26 Férias e hotel** | N | 10 | |
| | A1-15 | A | 10 | |
| | A1-g6 | A | | + imperativo |
| | *Atividade final: cartão-postal* | N | | Premium |
| **7 · A1-m5 · Casa e descrição** | A1-16 | A | 10 | + descrição física |
| | **A1-g15 Adjetivos e demonstrativos** | N | | |
| | A1-17 | A | 10 | |
| | A1-18 | A | 10 | |
| | A1-g7 | A | | decisão 9 |
| | *Atividade final: anúncio do apartamento* | N | | Premium |
| **8 · A1-m6 · Lazer, convites e passado** | A1-19 | A | 11 | + *adorer* |
| | A1-g8 | M | | |
| | **A1-27 Convites, festas e desculpas** | N | 10 | |
| | A1-20 | A | 10 | *hier* fundido, *récemment* → A2, + *tôt, tard* |
| | A1-g9 | A | | só *avoir* |
| | **A1-g16 Passé composé com être** | N | | |
| | *Atividade final: convite + fim de semana* | N | | Premium |
| **Teste de Nível A1** | A1-final | A | | 40 itens + modo simulado DELF (E9) |

**Totais:** 8 módulos, **44 unidades** (28 de vocabulário + 16 de gramática), **~291 palavras-cartão** (204 de hoje − 4 fundidas − 1 movida
para o A2 + 92 novas), 8 atividades finais. **Versão só com P0 confirmado:** A1-3, A1-21, A1-g11, A1-g12, A1-g13 + correções de texto
(34 unidades, sem mudar módulos).

---

## 12. O molde para o português

Igual à v1 (seção 10 de `04-v1-...`), com dois acréscimos: (1) o curso de português **nasce com chave estável em cada item** (formato da
Etapa 0) e camada por chave, sem passar pela fase "por posição"; (2) a atividade final por módulo vale também para o pt, no espírito das
tarefas integradas do Celpe-Bras (gênero, interlocutor e propósito).

---

## 13. Decisões consolidadas (numeração nova)

Situação: **RESOLVIDA** (pela dona), **MUDOU** (a pergunta mudou com o retorno), **NOVA**, **CONTINUA**. "antiga nº X" = número da v1.

| Nº | Decisão | Situação | Recomendação |
|---|---|---|---|
| 1 | Fronteira A1/A2: zona cinza (futuro simples, imperfeito, COI, *en*, relativos) | RESOLVIDA (antiga nº 1): tudo no A2, como no Défi 1 | aplicada no mapa |
| 2 | Política "só acrescentar" | RESOLVIDA (antiga nº 5): inaceitável; substituída pela 3 | |
| 3 | **Estratégia de ids estáveis**: chave congelada + fusões + arquivo (opção c) | NOVA | aprovar a opção (c) e fazer a Etapa 0 antes de qualquer conteúdo |
| 4 | Regra de fusão do FSRS (revisão mais recente vence; perdedor no arquivo) | NOVA | aprovar |
| 5 | Item excluído: arquivar (volta se o item voltar) ou descartar | NOVA | arquivar |
| 6 | Unidade inserida antes de unidade concluída | RESOLVIDA (antiga nº 6): nasce aberta, não concluída | aplicada (2.10) |
| 7 | Prioridades P0 | RESOLVIDA em parte: números 4-19, artigos/gênero, negação, perguntas, *aller* + futuro próximo | aplicada |
| 8 | Tamanho e forma do A1 revisado (44 unidades, 8 módulos recompostos) | MUDOU (antigas nº 3 e 4) | aprovar o mapa completo; executar em ondas, P0 confirmado primeiro |
| 9 | Comparativo (A1-g7) no A1 | CONTINUA (antiga nº 2) | fica no A1, com input; superlativo no A2 |
| 10 | Módulos recompostos e 2 novos (o "Módulo N" exibido muda para quem já estuda) | MUDOU (antiga nº 4) | sim, com aviso no Mural |
| 11 | Conjuntos fechados com mais de 10 palavras (A1-3 12, A1-21 13, A1-7 11, A1-24 14) | NOVA | aceitar |
| 12 | Os outros itens que a v1 chamava P0 (dados pessoais, produção escrita, ordem do passé composé, dias/meses, profissões) | NOVA | manter P0 (são tarefas do DELF A1) |
| 13 | Notas *in situ* repetidas | CONTINUA (antiga nº 12), explicada na Dúvida b | encurtar 3 já; tirar 2 quando houver o A1-g12 |
| 14 | Nota de feminização das profissões: categoria | CONTINUA (antiga nº 13) | explicação |
| 15 | Selo de nível no jogo PC x Imparfait e nos tempos da Conjugação | MUDOU (antigas nº 10 e 11): sai deste plano, vai para a sessão da Conjugação | mostrar o selo (sem trancar); alternativa: não mostrar |
| 16 | Tamanho do A2 (fator F) | NOVA (substitui a antiga nº 14) | F = 1,4: 10 módulos, 60 unidades, ~408 palavras |
| 17 | Mini-prova DELF | MUDOU (antiga nº 8) | só no Teste de Nível; por módulo vale a atividade final |
| 18 | Atividade final Premium por módulo e a ordem dos módulos desenhada a partir dela | NOVA | sim |
| 19 | **Correção da atividade final** | NOVA (substitui a antiga nº 7) | fase 1 automática + semiautomática; fase 2 professora (vinculados); fase 3 IA Premium com cota, só com paywall |
| 20 | Grátis x Premium do que é novo | MUDOU (antiga nº 9) | trilha e exercícios da trilha grátis; atividade final e Desafios Premium (paywall desligado); professora para vinculados; IA Premium |
| 21 | Atualizar `moduleId` de Desafios e ditados na produção | CONTINUA (antiga nº 17), com mais linhas | sim, no Staging antes, junto com a publicação |
| 22 | Formulário com personagem fictício (sem dado real do aluno) | NOVA | sim |
| 23 | *savoir* x *connaître* | MUDOU (antiga nº 15) | unidade A2-g17 |
| 24 | GEF e Beacco como fonte de nível | RESOLVIDA (antiga nº 16): GEF sem divisão A1/A2; Beacco opcional | não comprar agora |
| 25 | *récemment*: mover para o A2 ou excluir | NOVA | mover para A2-6 |
| 26 | Saves reais anonimizados para o teste da Etapa 0 (só leitura) | NOVA | autorizar 3 contas |

Saíram do plano: antiga nº 10 (Conjugação) → `05-mensagem-sessao-conjugacao.md`; antiga nº 14 (aprovar o A2 de 34 unidades) → nº 16.

---

## 14. Plano de execução em etapas

Regras que valem para todas: Staging antes da produção; dado de produção só com autorização; texto novo nas duas camadas (o site em
inglês não tem nada em português); português existente que muda passa por `DELIBERATE_PT_CHANGES`; texto novo com áudio = mp3 novo;
regressão da área tocada com números reais; teste no navegador nos 4 cenários; nada de PR/merge sem pedido.

| Etapa | O que | Esforço | Risco | Testes | Grátis x Premium |
|---|---|---|---|---|---|
| **0. Ids estáveis** | seção 2: chaves, id derivado, fusões, arquivo, `released`, `lessonId`, regra de desbloqueio, script de operações, mapa do cron + **deploy do `notification-cron`** | médio (2 PRs) | médio, mas **sem mudança visível** (ids iguais) | `tests/curriculo-ids` (8 grupos da 2.6) + regressão de trilha, decks, progresso, i18n | invisível |
| **1. Texto e gramática P0** | correções de texto e gancho (v1 3.1), notas *in situ* encurtadas, A1-g11, A1-g12, A1-g13, A1-g16, telas novas em A1-g1/g3/g6/g9, frase R4 | médio | baixo (gramática não gera cartão) | `check_grammar_input.js`, `tests/camada-curso`, `tests/i18n`, Ponto de verificação | grátis |
| **2. Reorganização do A1 (P0)** | operações 1 a 11 da seção 5 (números, dias/meses, fusões, A1-21, A1-24, A1-28), recomposição dos módulos, desbloqueio | médio-alto | médio (primeira vez que o progresso real é migrado) | testes da Etapa 0 com o `ops.json` real, `check_dictation_vocab.py`, navegador | grátis |
| **3. Unidades novas P0/P1** | A1-22, A1-23, A1-25, A1-26, A1-27, A1-g14, A1-g15, notas da seção 10 | alto (conteúdo + áudio + 2 camadas) | baixo para o progresso | idem + `tests/desafios-*` | grátis |
| **4. Atividades finais (Desafios)** | 4a: tipo `module_task` + E1/E2/E3 com correção automática e semiautomática para os 8 módulos do A1; 4b: fila da professora (migration nova, RLS, tela, sino bilíngue); 4c: IA, só depois do paywall | 4a médio; 4b alto; 4c médio | 4b mexe em banco (migration, Staging antes) | testes novos em `tests/atividade-final/`, `tests/desafios-*`, `tests/painel-professora` | atividade **Premium** (paywall desligado); professora para vinculados; IA Premium com cota |
| **5. Exercícios na trilha** | E7, E4, E5, E10, E8, E6, E9 (nesta ordem) | alto | médio (UI nova) | testes novos por tipo + navegador | grátis |
| **6. Desafios e ditados do A1** | Complete a frase das 16 gramáticas; Expressões que faltam; OT/Acentuação/Expressões das unidades novas; ditados dos módulos novos; `moduleId` na produção (autorização) | médio | baixo (`needs_review`) | `fr/scripts/test_answer_validation.js`, `tests/desafios-*`, `tests/ditado` | ditado 1 grátis + 2 Premium; o resto Premium |
| **7. A2** | módulo a módulo (m1, m2, m9, depois os outros), cada um com unidades, notas, Desafios, ditados e atividade final | muito alto | baixo para o A1 (nível novo, chaves desde o 1º item) | idem às etapas 2 a 6 | trilha grátis; Desafios e atividade final Premium |

Ordem: **0 → 1 → 2 → 3 → 4a → 6 → 5 → 4b → 7** (4c só com paywall). Nenhuma etapa avança sem a autorização da dona.

Passos manuais da dona quando chegar a hora: deploy do `notification-cron` (Etapa 0, se for pelo painel); autorizar a leitura de 3 saves
anonimizados (decisão 26); autorizar a atualização de `moduleId` dos Desafios na produção (Etapa 6); aplicar a migration da fila da
professora no SQL Editor (Etapa 4b). Pendências acumuladas que continuam valendo (CLAUDE.md, "Estado atual"): 072 de país não aplicada;
008 dos Desafios só com paywall; e-mails bilíngues do Supabase Auth; 107 (Mural) opcional; `report-reply-send`.

---

## Resumo

- **O que mudou da v1:** a regra "só acrescentar" caiu; entra a **Etapa 0 (ids estáveis)** antes de qualquer conteúdo; unidade nova nasce
  aberta; zona cinza resolvida a favor do Défi 1; A1 revisado com fusões e movimentos (44 unidades, ~291 palavras, 8 módulos recompostos);
  A2 redimensionado; atividade final Premium por módulo com análise de correção; 10 exercícios com exemplo; Conjugação foi para o `05`;
  `02` novo incorporado (subjuntivo só em fórmula no fim do A2, gerúndio no A2, passiva no B1, desculpar-se no fim do A1).
- **Ids em 3 linhas:** cada palavra/frase ganha uma chave congelada igual ao id de hoje (zero migração inicial) e o id do cartão passa a vir
  da chave, não da posição; mover, reordenar e reescrever não mudam mais o id; fusões vão numa tabela aplicada no carregamento (revisão mais
  recente vence) e itens excluídos vão para um arquivo de progresso que volta se o item voltar. Sem migration SQL; o `notification-cron` muda e precisa de deploy.
- **A2 novo:** F = 1,4 → **10 módulos, 60 unidades (34 + 26), ~408 palavras**, 12 palavras por unidade, E4/E5 em toda unidade (parâmetro: F 1,2 a 1,6).
- **Correção da atividade final:** automática + semiautomática já; professora para vinculados depois; IA (Haiku 5.5, ~US$ 0,40 por 1.000
  correções) só como Premium com cota, depois do paywall.
- **Decisões abertas:** 3, 4, 5 (ids), 8, 9, 10, 11, 12 (A1), 13, 14 (notas), 15 (selo), 16 (tamanho do A2), 17 a 20 e 22 (atividade final,
  correção, grátis x Premium, privacidade), 21 e 26 (dados de produção), 23, 25.
