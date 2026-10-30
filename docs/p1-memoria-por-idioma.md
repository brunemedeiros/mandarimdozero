# P1: memória dos cartões da professora e próprios por idioma estudado

Decisão da dona (P1, aprovada em 2026-10-12, reafirmada em 2026-10-29; ver `docs/i18n/auditoria-e3-progresso-por-curso.md`, P1 e Q-11,
e `docs/recomecar-curso-opcoes.md`, achado 2). Este documento é o desenho e o registro da implementação (branch
`claude/p1-memoria-por-idioma`). Código: `shared/lang-card-memory.js`; testes: `tests/p1-memoria-por-idioma/`.

Grátis x Premium: **tudo grátis** (é correção de dado; nada muda de acesso).

## 1. O problema

A memória FSRS de cada cartão fica no array `cards` do bloco do CURSO em `progress.data` (`frances`, `frances@en`, ...), junto com os
cartões da trilha (`serializeCardsForSave`, `shared/study-trail-model.js`). Os cartões da professora (`origin: 'teacher'`, ids `t...`) e
os próprios (`origin: 'self'`, ids `s...`) são os MESMOS nos dois cursos do francês (as tabelas `teacher_flashcards` e
`own_flashcards` são por idioma estudado), mas cada curso guardava a sua memória. Quem abriu o curso "French" (site em inglês) via esses
cartões do zero. Produção em 2026-10-29: 4 contas com os dois blocos do francês; em 2 delas os cartões da professora/próprios têm
histórico só no bloco `frances` (34 + 6 cartões) e nenhum no `frances@en`.

## 2. Onde a memória passa a ficar

```
progress.data._lang = {
  frances:  { v: 1, cards: [ { id, origin, rowId, flashcardStatus, teacherId, ef, interval, reps, due, lapses,
                               stability, difficulty, state, lastReview, fsrsReps, fsrsLapses, fsrsMigrated,
                               firstLearnedDate, lastDirection?, reviewDirection? }, ... ], updatedAt },
  mandarim: { ... }, portugues: { ... }
}
```

- Uma chave por idioma estudado (`appKey`: `frances`, `mandarim`, `portugues`). Só entram entradas de professora/próprios.
- Entrada ENXUTA: identidade + campos de progresso. O conteúdo (texto, deck, tags, status) continua vindo do banco a cada carregamento
  (`NOTE_LEVEL_FRESH_FIELDS` em `mergeSavedCards`), então não precisa ser copiado; isso também mantém a linha pequena.
- O nome começa com `_` de propósito: todo leitor de blocos do cliente e do servidor já pula chaves `_` ou só aceita chaves `frances`,
  `mandarim`, `portugues` e `<appKey>@...` (ver seção 6). `_lang` não tem `xp`, `streak`, `lastStudyDay` nem `progressSummary` no topo,
  então as funções que procuram blocos por esses campos não o confundem com um curso.
- **Espelho**: o bloco de cada curso continua com a cópia das entradas dentro de `cards` (como hoje). É o que o servidor e as abas
  abertas com o código antigo leem. A fonte de verdade passa a ser "a cópia de mais histórico entre `_lang` e os blocos do idioma", e
  `_lang` é onde ela fica guardada.

Cartões da trilha (`u...`) continuam por curso, sem mudança nenhuma.

## 3. Carregar (`shared/auth.js`, `loadState`)

- Curso com bloco: `applySerializedState(LangCardMemory.blockForLoad(data, APP_KEY, blockKey))`. `blockForLoad` devolve o bloco com as
  entradas de professora/próprios trocadas pelo PROGRESSO do vencedor (seção 5) entre `_lang[APP_KEY]`, o próprio bloco e os outros
  cursos do idioma; entradas que o bloco não tinha são acrescentadas no fim (enxutas). O resto do bloco (trilha, xp...) não muda.
  Sem `_lang` e sem outro curso do idioma, devolve o MESMO objeto (nada muda para quem tem um curso só).
- Curso sem bloco ainda (curso novo de um idioma que a conta já estuda): `applyLanguageCardMemory(LangCardMemory.memoryEntriesForLoad(...))`
  (em `shared/core/estado-salvar.js`). Só sobe progresso: cartão que já tem mais histórico no STATE fica como está. Com a busca de
  cartões falhando (A2), as entradas sem par vão para `PRESERVED_SAVED_CARDS`, como no carregamento normal.
- `progressAccountIsNew` ignora `_lang` (conta só com `_meta`, `_account` e `_lang` continua "nova").

## 4. Salvar (`shared/auth.js`, `saveState`)

Depois do guarda-corpo de campos vitalícios e do espelho da conta, com a linha LIDA AGORA do servidor:

```
mem = LangCardMemory.prepareSave(existing.data, APP_KEY, blockKey, blockPayload, agora)
merged[blockKey] = mem.payload         // o bloco desta página
Object.assign(merged, mem.otherBlocks) // espelho dos outros cursos do idioma, só se precisou subir
merged._lang = mem.lang                // _lang[APP_KEY] novo; os outros idiomas ficam como estavam
```

- `payload`: as entradas de professora/próprios recebem o progresso da cópia de mais histórico (uma aba de outro curso que revisou
  depois desta abrir). Empate fica com a desta página. Nada a mudar = o MESMO objeto: para quem tem um curso só, o bloco gravado é
  idêntico ao do código antigo (teste 5).
- `_lang[APP_KEY].cards`: todas as entradas desta página, mais as que só existiam no servidor COM histórico (cartão apagado no banco,
  ou entregue numa aba de outro curso). Entrada só do servidor e sem histórico é descartada (não há memória a perder). Ordem estável.
- `otherBlocks`: nos outros cursos do idioma, cada entrada com MENOS histórico que o vencedor recebe o progresso dele (o resto da
  entrada fica); entram no fim as que faltam e têm histórico. Nunca tira entrada, nunca mexe na trilha, nem em `xp` e afins.

## 5. Regra de fusão (por cartão, `compareHistory`)

Para cada id, entre todas as cópias (`_lang`, bloco atual, outros cursos do idioma; no salvar, a da página primeiro):

1. vence a de **mais revisões** (`reps`);
2. empate: a de **última revisão mais recente** (`lastReview`, número ou texto ISO);
3. empate: a de **maior `stability`**;
4. empate total: a que veio primeiro na ordem de preferência (no carregar: `_lang`, bloco atual, outros; no salvar: a página, `_lang`,
   bloco atual salvo, outros).

`firstLearnedDate` fica a mais antiga entre as cópias (igual à fusão da trilha). Por que `reps` antes da data: o caso real é "10 revisões
no curso pt" contra "2 revisões novas no curso en que começou do zero por causa deste bug"; a memória verdadeira é a de 10 (a de 2 é um
recomeço falso). Numa linha do tempo normal (sem bifurcação) as duas regras dão o mesmo, porque cada revisão soma 1 em `reps`.
Consequência aceita: numa bifurcação, as revisões do ramo com menos `reps` são descartadas (a memória fica a do ramo maior).

## 6. Servidor: quem lê `cards` do bloco e se precisa mudar

Nada no servidor muda nesta entrega. Levantamento (definições lidas da produção em 2026-10-29 com SELECT):

| Leitor | Como escolhe o bloco | Lê professora/próprios? | Precisa mudar? |
|---|---|---|---|
| `notification-cron` `computeReviewOverdueCount` (revisão atrasada) | `blockForLanguage`: curso atual (`_meta.currentCourse`), senão `frances`, senão o 1º `frances@...` | sim (`flashcardStatus === 'active'`, `reps > 0`, `due`) | **Não**: o espelho do bloco do curso atual passa a ter a memória do idioma. Antes, quem estava no curso en tinha 0 vencidos da professora contados (teste C). |
| `notification-cron` `STUDY_ITEM_GATE` | só cartões da trilha | não | Não |
| `get_teacher_student_metrics` (painel da professora) | `_progress_block(data, appKey)` = curso atual | sim (`rowId`/`origin`/`id`, `reps`, `due`, `state`, `lapses`, `interval`) | **Não** (espelho). A entrada enxuta acrescentada num bloco tem `id`, `origin`, `rowId`, `flashcardStatus` e o progresso, que é tudo o que a função usa. |
| `get_teacher_student_deck_counts` | `_progress_block` | sim (mesmos campos) | Não (espelho) |
| `get_teacher_student_overview` | itera TODOS os blocos `frances`/`frances@...` | `queue` conta todos os `cards` de cada bloco | Não. Cada curso continua mostrando a sua fila; os cartões da professora aparecem com a mesma memória nos dois. |
| `_account_streak`, `friends_extras`, `get_public_profile_stats`, `_studied_languages`, `_progress_block` | iteram chaves | não leem `cards` | Não: ignoram `_lang` (sem `streak`/`xp`/`progressSummary`; filtro por `frances`/`mandarim`/`portugues`) |
| `review-bank-agent` (Edge Function) | não lê `progress` | não | Não |
| `log_my_bank_review` / `get_my_pending_bank_grades` (Banco) | não lê `progress.cards` (estado FSRS vem do cliente) | não | Não |

Passo futuro (opcional, só com autorização): o servidor ler `_lang` direto e o espelho sair dos blocos. Enquanto houver aba antiga ou
servidor lendo o bloco, o espelho fica.

## 7. Compatibilidade e guarda-corpos

- **Aba antiga aberta (código de antes)**: ela grava `Object.assign({}, existente, { [bloco]: payload })` com a linha lida na hora, então
  NÃO apaga `_lang` nem os outros blocos. Ela pode gravar no próprio bloco uma cópia velha (reps menor) de um cartão; no próximo
  carregamento do código novo a cópia de `_lang` vence (mais histórico) e o salvar seguinte corrige o bloco (teste 3). Única perda
  possível: uma revisão feita NA aba antiga sobre um cartão que lá estava sem histórico (o próprio bug de hoje), por cair na regra 1.
- **Duas abas novas (pt e en) ao mesmo tempo**: cada salvar junta com a leitura fresca; a revisão de uma não regride a da outra (teste 4).
  A aba que ficou para trás continua mostrando o valor velho na tela até recarregar (não é gravado por cima).
- **Guarda-corpo de campos vitalícios** (`MONOTONIC_PROGRESS_FIELDS`, `shared/auth.js`): compara `xp`, `totalReviews` e `totalAudioPlays`
  do bloco desta página; não muda. A memória dos cartões ganha o seu próprio "nunca diminui" pela fusão (seção 5).
- **`progressLoadedOk`**: continua barrando qualquer salvar antes de ler o servidor.
- **A2 (busca de cartões que falha)**: entradas guardadas em `PRESERVED_SAVED_CARDS` vão no payload; e `_lang` guarda tudo o que tem
  histórico mesmo que a página não tenha o cartão (teste 7).
- **Recomeçar o curso (futuro)**: qualquer recomeço que queira zerar memória de professora/próprios precisa zerar `_lang[appKey]` e as
  cópias de TODOS os blocos do idioma de uma vez, no servidor; senão a fusão traz a memória de volta. O recomeço aprovado (só a trilha)
  não toca nessas entradas e fica mais simples: o curso pode ser zerado sem medo, a memória do idioma está em `_lang`.

## 8. Migração do que já existe

É feita **no navegador, ao carregar, por conta e idioma**, sem script na produção: o 1º carregamento junta as cópias de todos os blocos
do idioma (regra da seção 5) e o 1º salvar grava `_lang` e sobe os espelhos. Nenhuma cópia antiga é apagada: os blocos só recebem
progresso MAIOR. Repetir é inofensivo (idempotente).

Simulação com dados reais (2026-10-29, só SELECT na produção; dados no scratchpad, fora do repositório): as 4 contas com `frances` e
`frances@en`. Rodar: `node tests/p1-memoria-por-idioma/simular_migracao.js <arquivo>`. SELECT usado (por conta e bloco, só as entradas
de professora/próprios e a trilha como contagem + md5):

```sql
with b as (select p.user_id, e.key, e.value v from progress p, jsonb_each(p.data) e
            where jsonb_typeof(e.value)='object' and split_part(e.key,'@',1)='frances' and jsonb_typeof(e.value->'cards')='array'),
c as (select b.user_id, b.key, x.c, x.ord, (coalesce(x.c->>'origin','') in ('teacher','self')
             or (x.c->>'origin' is null and x.c->>'id' ~ '^[ts][0-9]')) ts
        from b, jsonb_array_elements(b.v->'cards') with ordinality x(c, ord))
select user_id, key, count(*) filter (where ts) n_ts, count(*) filter (where ts and coalesce((c->>'reps')::numeric,0)>0) n_hist,
       md5(string_agg(c::text,'|' order by ord) filter (where not ts)) trail_md5 from c group by 1,2;
```

| Conta | Curso atual | Antes `frances` | Antes `frances@en` | Depois (os dois blocos e `_lang.frances`) |
|---|---|---|---|---|
| A | frances@pt-BR | 278 entradas (277 prof., 1 própria), 34 com histórico, 72 reps | 269, 0 com histórico | 278, 34 com histórico, 72 reps |
| B | frances@en | 6 próprias, 6 com histórico, 15 reps | 6, 0 com histórico | 6, 6 com histórico, 15 reps |
| C | frances@pt-BR | 0 | 0 | 0 (só a estrutura nova) |
| D | frances@en | 0 | 0 | 0 (só a estrutura nova) |

Em todas: nenhum histórico perdido, trilha de cada bloco igual byte a byte, conteúdo das entradas mantido, salvar de novo não muda nada.

## 9. Por que é seguro

- Só acrescenta: `_lang` é chave nova; nos blocos, só sobe progresso de entrada de professora/próprio (nunca desce, nunca apaga).
- A trilha, `xp`, sequência, missões e o resto do bloco não passam pelo código novo.
- Conta com um curso só: o bloco gravado é igual ao de antes (teste 5); a única diferença na linha é `_lang`.
- Tudo é idempotente e determinístico; aplicar em qualquer ordem e quantas vezes for dá o mesmo resultado (teste de propriedade, 300 casos).
- Servidor: sem mudança; os leitores que escolhem um bloco passam a ver a memória certa (antes, o curso en via zero).

## 10. Como desfazer

- **Código**: reverter o commit. O código antigo lê o bloco do curso como sempre; `_lang` fica na linha e é ignorado (nenhum leitor
  antigo o usa). Os espelhos que subiram continuam certos (são a memória de verdade).
- **Dado**: nada a desfazer por obrigação. Se for preciso tirar `_lang` (por exemplo, para medir tamanho), dá para apagar a chave pelo
  SQL Editor com autorização (`update progress set data = data - '_lang'`), sem perder memória, porque os blocos têm o espelho.
- **Por conta, de emergência**: não há chave de desligar no navegador; o fallback `typeof LangCardMemory === 'undefined'` em
  `shared/auth.js` faz o site voltar ao comportamento antigo se o arquivo não carregar.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Tamanho da linha (`_lang` repete as entradas) | entrada enxuta (~280 bytes); a conta A (278 cartões) ganha ~80 KB |
| Bifurcação real (revisou o mesmo cartão em pt e en antes desta entrega) | regra 1 (mais revisões) fica com a memória maior; registrado na seção 5 |
| Aba antiga grava cópia velha no bloco | fusão no próximo carregamento; teste 3 |
| Recomeço futuro que zere memória de professora/próprios | precisa zerar `_lang` e todos os blocos do idioma juntos (seção 7) |
| `_lang` confundido com curso por algum leitor novo | regra: chave de bloco nunca começa com `_` (`isBlockKey`, `languageBlockKeys`) |

## 12. Testes

- `tests/p1-memoria-por-idioma/test_memoria_por_idioma.js`: regras puras e propriedades; integração com os arquivos de produção
  (`shared/auth.js`, `shared/core/estado-salvar.js`, `shared/study-trail-model.js`, `shared/fsrs.js`, `shared/review-bank-student.js`):
  ida e volta pt e en, migração escolhendo o de mais histórico, aba antiga, duas abas, conta de um curso só (diff zero), curso novo sem
  bloco, busca que falha, Banco de Revisão (nota do Modo aula), outro idioma intocado; leitores do servidor (cron real).
- `tests/p1-memoria-por-idioma/simular_migracao.js <arquivo>`: simulação com cópia da produção (seção 8).
