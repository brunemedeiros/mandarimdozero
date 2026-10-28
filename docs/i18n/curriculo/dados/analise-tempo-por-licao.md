# Por que cada lição "toma tanto tempo" nas estimativas? (análise estática)

Data: 2026-10-28. Pedido da dona (decisão 293 do `12`). **Só leitura** do código e dos documentos: nenhum dado de produção foi consultado,
nenhum arquivo do site mudou. Todos os tempos abaixo são **hipóteses**, não medições; cada número traz o nível de confiança.

## Resumo em uma tela

- **Ninguém mediu.** A origem é uma estimativa "minha, confiança baixa: não medida no site" do `08-revisao-por-funcao-comunicativa.md`
  (seção 4, 2026-10-17): unidade de vocabulário do A1 ~30 min, gramática ~18 min, Ponto de verificação + som do módulo ~13 min, A2
  ~40 min por vocabulário e ~25 min por gramática. Depois disso só vieram **regras de diferença** (+5 min por palavra, +10 min pela 4ª lição)
  aplicadas à mão sobre esses números (`dados/ACHADOS.md`, divergência 2; decisão 261 do `12`).
- **O código mostra uma lição bem mais curta.** A unidade publicada "Cumprimentar e se despedir" (`A1-1`, 10 palavras) tem **46 respostas**
  no total (3 lições + Revisão da unidade). Pela hipótese de tempo por tela da seção 3, ela leva **~9 a ~25 min** (ponto médio ~17),
  contra os ~30 min das estimativas. Uma lição de 3 palavras sem diálogo leva **~1,2 a ~4 min**; a lição com diálogo, **~3 a ~9 min**.
- **O módulo "Apresentar-se" (mapa, 62 cartões) daria ~1h00 a ~2h55**, contra **3h55** no mapa. O **A1 inteiro daria ~7h a ~20h**, contra **~31h**.
  Mesmo na hipótese lenta (aluna iniciante no celular, 20% de erro), as estimativas do mapa ficam **~50% acima**.
- **As regras de diferença são as mais infladas.** No código, uma palavra a mais custa **~20 s a ~1,3 min** (ficha, checagem, prática e,
  até a 10ª palavra, uma rodada na Revisão da unidade), não 5 min. A 4ª lição custa **~25 s a ~1 min** (abrir, ponte de 2 perguntas, tela de fim), não 10 min.
- **Provável sobra do *défi* (arquivado).** Os tempos de módulo do A1 no `08` original ficam 16 a 31 min acima da soma "30 + 18 + 13" das
  unidades; o mais provável é o *défi* de 20 a 40 min do `07`, arquivado no dia seguinte (decisão 16) sem que os tempos fossem refeitos (confiança média).
- **Já existe meio de medir**, sem migration: o evento `lesson_complete` / `vocab_lesson` tem horário do servidor (`created_at`) e `session_id`.
  A diferença entre duas lições seguidas da mesma unidade, na mesma sessão, dá a duração da segunda. Falta um evento de início e a duração ativa (seção 4).

---

## 1. Origem das estimativas

| O quê | Onde foi definido | Base declarada | Mediu? | Confiança |
|---|---|---|---|---|
| Unidade de vocabulário A1 ~30 min (4 lições), gramática A1 ~18 min, Ponto de verificação + som do módulo ~13 min, *défi* "conforme o `07`" | `08-revisao-por-funcao-comunicativa.md`, seção 4 "Carga e curva" (commit `75a8892`, 2026-10-17) | "minha, confiança **baixa**: não medida no site" | não | baixa (dita pelo próprio autor) |
| A2 ~40 min por vocabulário (12 palavras + exercícios E4/E5), ~25 min por gramática | mesmo lugar | idem; E4 (compreensão oral graduada) e E5 (documento com perguntas) são propostas do `04-v1`, não existem no código | não | baixa |
| Tempos por módulo do A1 (M1 3h35, M2 3h00 etc., total ~24h no v3) | `08-revisao...`, tabela 4.1 | soma à mão; não fecha com a fórmula por unidade (ver abaixo) | não | baixa |
| "+5 min por palavra", "+10 min quando a unidade passa de 10 palavras e ganha a 4ª lição", "−10 min" | primeiras aparições no `12` (decisões 139, 140, 202, 207, 214, 244, 251) e depois no `08-mapa-final` seção 1 | regra de diferença, sem justificativa escrita; aplicada sobre os tempos à mão | não | baixa |
| A1 ~31h00, M1 3h55 (decisão 270), teto de 3h55 por módulo (regra 16 do `15`) | `08-mapa-final-a1-a2-v2.md`, seção 1, linha "A1: tempo de trilha" | as duas regras de diferença acima | não | baixa |
| A2 ~33h10 | `08-mapa-final`, linha "A2: tempo de trilha"; `fr/scripts/curriculo_mapa.js` (`REGRAS.tempoA2`) | 40 × vocabulário + 25 × gramática (a regra reproduz os 10 tempos) | não | baixa |
| "Tempo do A1 = número estimado e digitado (`tempo_08_min`), sem fórmula inventada" | decisão 261 do `12`; `dados/ACHADOS.md`, divergência 2 | registra que **não existe** regra absoluta para o A1; "medir de verdade exige dados de uso reais (produção): só com autorização" | não | alta (sobre o fato de não haver base) |

**Conta que mostra a sobra do *défi*** (confiança média: é dedução, nenhum documento diz isso). Pela fórmula do próprio `08-revisao`
(30 min × vocabulário + 18 min × gramática + 13 min do Ponto de verificação e som), os módulos do v3 dariam:
M1 3h19 (a tabela diz 3h35, +16), M2 2h37 (3h00, +23), M3 2h19 (2h40, +21), M4 2h31 (2h55, +24), M5 1h49 (2h15, +26), M6 2h37 (3h05, +28),
M7 3h01 (3h30, +29), M8 2h19 (2h50, +31). A sobra de 16 a 31 min por módulo bate com o *défi* "conforme o `07`" (o `07` fala em atividades
de 20 a 40 min). O *défi* foi **arquivado** pela decisão 16 do `12` (2026-10-18), mas os tempos seguiram sendo somados a partir desses números.
O "som do módulo" (~3 a 4 min, `06`) também não existe no código e a decisão 291 levou a pronúncia para um curso à parte.

**Incoerência interna da regra de diferença** (confiança alta, é aritmética): se 10 palavras custam ~30 min, a média é **3 min por palavra**,
já contando diálogo, notas e Revisão da unidade. Uma palavra a mais não pode custar **5 min**, mais que a média: o que cresce com a palavra é
só a parte variável (ficha e exercícios), e a parte fixa (diálogo, Revisão da unidade, telas de fim) não cresce.

## 2. Composição real de uma unidade de vocabulário do A1 (código de hoje)

Exemplo: `A1-1` publicada (`fr/content.js`, linhas 19 a 221; textos em `courses/fr-pt-BR/layer.js`). Lições: 1 *bonjour, bonsoir, au revoir*;
2 *salut, merci, de rien*; 3 *s'il vous plaît, pardon, ça va, à bientôt* + diálogo; 4 Revisão da unidade (no código ainda "Ponto de verificação").

### 2.1 Uma lição, passo a passo

O passo `vocab` de uma lição monta **um bloco só** com as palavras da lição (`freshAcquisitionState`, `shared/core/quase-iguais-chaves.js:185`),
então a fase "misturando com o que você já viu" (`mixed`) **nunca roda** dentro de lições (`acqPhaseSequence`, `shared/core/estado-trilha-desafios.js:569`).

| Ordem | Tela | Quantidade | Código |
|---|---|---|---|
| 0 | Abrir a lição na Trilha (modo foco) | 1 | `openUnitDetail`, `fr/app.js` |
| 1 | **Ponte** "Lembrando da lição anterior": "O que significa?" com 4 opções | 2 perguntas, só da 2ª lição em diante | `startBridgeQueue` (`estado-trilha-desafios.js:620`) |
| 2 | **Ficha da palavra**: palavra, áudio automático, tradução, "Já sei?", "Na frase" com áudio | 1 por palavra | `renderBlockIntroCard` (`fr/app.js`) |
| 3 | **Notas** cujo gatilho é uma palavra desta lição (`trigger.afterVocabIdx`); caixa com título, texto de ~50 a 60 palavras e 1 a 2 exemplos com áudio | conforme o conteúdo | `pendingConceptsForBlock` + `renderConceptStep` |
| 4 | **Checagem rápida**: "O que significa?" com 4 opções | 1 por palavra | `buildBlockCheckpointQueue` |
| 5 | **Praticando o que você acabou de ver**: "O que significa?" ou "Ouça e escolha o significado certo"; "Digite o que ouviu" só se a palavra já tinha evidência (SRS ou "Já sei?") | 1 por palavra | `buildPracticeQueue` → `pickVocabFormat` (`shared/core/exercicios-licao.js:143`) |
| 6 | **Diálogo** (4 falas com áudio em sequência, pausa de 0,38 s entre falas) | só na lição com `includesDialogue` | `renderDialogueStep` |
| 7 | **Você entendeu?**: completar a fala, ouvir uma fala, pergunta de compreensão; não dá para pular | 3 perguntas | `renderDialogueCheckStep` |
| 8 | Nota com gatilho "depois do diálogo" (em `A1-1`, *la bise*) | conforme o conteúdo | `pendingConceptsAfterDialogue` |
| 9 | **Lição concluída!** (XP, %, palavras da lição). Se havia cartões devidos, "Continuar" leva **direto ao Flashcard** | 1 | `renderLessonCompleteScreen`; `fr/app.js:2648` |

Detalhe que pesa no tempo: **todo acerto abre um painel com "Continuar"** (`showCorrectFeedbackPanel`), e todo erro ou "Não sei" abre o painel
"por que não foi essa" com a resposta, a frase de origem ou a nota (`showAnswerPanel`). Cada resposta custa, portanto, dois toques e uma leitura.

**V/F depois das notas** (previsto no mapa: "V/F logo depois das notas de explicação e de realidade") **não existe no código**: hoje o V/F só aparece na Revisão da unidade.

### 2.2 Revisão da unidade (última lição)

`buildExerciseSet` (`fr/app.js:2792`), embaralhado:

| Parte | Quantidade em `A1-1` | Regra |
|---|---|---|
| Rodada por palavra ("O que significa?", "Ouça e escolha" ou "Digite o que ouviu") | 10 | `CONSOLIDATION_CAP = 10` (`fr/app.js:2753`): **nunca passa de 10**, mesmo com 16 palavras; prioriza as palavras erradas nas lições |
| Ordenar / traduzir com blocos-isca | 4 | `REORDER_EXERCISE_CAP = 4` |
| Cenário (3 opções em francês) | 2 | frases de índice ímpar com cenário, se houver 3 ou mais com cenário |
| Verdadeiro ou falso | 1 | `trueFalseExercises` |
| Lacuna ("Complete a frase") | 2 | sempre 2 |
| **Total** | **19** | |
| Antes, "Revisão dos erros" | 1 por palavra errada | só se o aluno errou 3 palavras ou mais nas lições |
| Depois: tela de resultado, "Unidade concluída!" e "Desafios de hoje" | 3 telas | `finishCurrentLesson`, `markUnitCompleted` |

### 2.3 Contagem da unidade `A1-1` publicada

| Lição | Fichas | Notas | Respostas (ponte + checagem + prática + "Você entendeu?" + Revisão) |
|---|---|---|---|
| 1 | 3 | 1 | 0 + 3 + 3 = **6** |
| 2 | 3 | 0 | 2 + 3 + 3 = **8** |
| 3 (com diálogo) | 4 | 3 | 2 + 4 + 4 + 3 = **13** |
| 4 Revisão da unidade | 0 | 0 | **19** |
| **Unidade** | **10** | **4** | **46** |

Para comparar: o piloto (`piloto-m1/A1-1/A1-1.md`) leva a unidade a 8 notas, V/F depois de algumas notas e uma Revisão de 23 itens
(10 + 4 + 5 cenários + 2 V/F + 2 lacunas): ~54 respostas. A decisão 292 (14 a 16 cartões, 4 lições, ~9 notas) daria ~69.

## 3. Tempo por tela, por lição, por unidade e por módulo (hipóteses)

### 3.1 Hipóteses por tela

Faixa **baixa**: adulta motivada, no computador, acerta quase tudo (5% de erro), lê rápido, não repete áudio.
Faixa **alta**: iniciante no celular, ouve o áudio de novo, toca nos exemplos, lê o painel de erro (20% de erro).
Leitura de português considerada: ~200 palavras por minuto. Nenhum número veio de medição.

| Tela | Baixa | Alta | Hipótese | Confiança |
|---|---|---|---|---|
| Abrir a lição | 3 s | 10 s | toque na Trilha e carregamento | média |
| Ficha da palavra | 6 s | 20 s | áudio de ~1,5 s toca sozinho; leitura da tradução; na alta, ouve a palavra e a frase de novo | média |
| Nota (1 bloco) | 15 s | 45 s | ~55 palavras = ~17 s de leitura; na alta, toca 2 exemplos e relê | média |
| V/F (depois de nota ou na Revisão) | 5 s | 12 s | frase curta, 2 botões, painel com "Continuar" | média |
| "O que significa?" (ponte e checagem) | 5 s | 12 s | 4 opções curtas + painel de acerto + "Continuar" | média |
| Praticando (significado ou ouvir) | 6 s | 15 s | igual à de cima, com áudio na versão "Ouça e escolha" | média |
| Diálogo de 4 falas | 20 s | 60 s | ~8 a 10 s de áudio em sequência + leitura das traduções; na alta, ouve de novo | média |
| Cada pergunta de "Você entendeu?" | 8 s | 20 s | uma delas toca áudio | média |
| Lição concluída | 5 s | 15 s | animação de 0,75 s + leitura | média |
| Rodada por palavra da Revisão | 6 s | 16 s | na alta, 1 em 3 vira "Digite o que ouviu" (teclado de acentos) | média |
| Ordenar / traduzir com iscas | 15 s | 40 s | 2 a 3 blocos certos + iscas; "traduzir" pede lembrar o francês | baixa |
| Cenário | 10 s | 20 s | ~20 palavras em português + 3 frases em francês | média |
| Lacuna | 8 s | 18 s | frase + 4 blocos | média |
| Fim da unidade (resultado, "Unidade concluída!", Desafios de hoje) | 10 s | 30 s | 3 telas | média |
| Cada erro ou "Não sei" (a mais) | 10 s | 20 s | leitura do painel "por que não foi essa" | baixa |

### 3.2 Por lição (unidade `A1-1` publicada)

| Lição | Baixa | Alta | Confiança |
|---|---|---|---|
| 1 (3 palavras, 1 nota) | ~1,3 min | ~3,9 min | média |
| 2 (3 palavras, ponte, sem nota) | ~1,2 min | ~3,7 min | média |
| 3 (4 palavras, ponte, 3 notas, diálogo e "Você entendeu?") | ~3,0 min | ~9,1 min | média |
| 4 Revisão da unidade (19 itens) | ~3,1 min | ~8,7 min | média |
| **Unidade** | **~8,6 min** | **~25,4 min** | média |

### 3.3 Por unidade e por módulo

| Caso | Respostas | Baixa | Alta | Estimativa dos documentos | Confiança |
|---|---|---|---|---|---|
| `A1-1` publicada (10 palavras, 3 lições + Revisão, 4 notas) | 46 | ~9 min | ~25 min | ~30 min (`09`, A.1) | média |
| `A1-1` do piloto (10 palavras, 8 notas, 4 V/F de nota, Revisão de 23) | 54 | ~11 min | ~31 min | ~30 min | baixa (V/F de nota e cenários a mais ainda não existem) |
| `A1-1` da decisão 292 (16 cartões, 4 lições, 9 notas, 5 V/F) | 69 | ~13 min | ~38 min | 30 + 6 × 5 + 10 = ~70 min pela regra de diferença | baixa |
| Unidade típica de 10 palavras (4 notas, 2 V/F) | 49 | ~9 min | ~26 min | ~30 min | média |
| Unidade típica de 12 palavras (4 lições) | 55 | ~10 min | ~29 min | ~30 + 2 × 5 + 10 = ~50 min | média |
| Unidade de gramática (4 telas + 6 exercícios de digitar) | 6 | ~3 min | ~8 min | ~18 min (A1), ~25 min (A2) | baixa |
| Ponto de verificação do módulo (12 itens digitados) | 12 | ~3 min | ~8 min | ~13 min com o som | baixa |
| **Módulo "Apresentar-se" do mapa** (5 vocabulários com 12, 13, 14, 13 e 10 cartões; 24 notas; 2 gramáticas; Ponto de verificação; lição de pronúncia da `A1-2` contada como 3 a 6 min) | | **~1h00** | **~2h55** | **3h55** | baixa |
| **A1 inteiro** (34 vocabulários, 23 gramáticas, 9 Pontos de verificação, notas do `mapa.json`) | | **~6h40** | **~19h55** | **~31h00** | baixa |

Modelo usado (para refazer): `por unidade = abrir × (lições + 1) + ponte 2 × (lições − 1) + palavras × (ficha + checagem + prática) + notas + V/F
+ diálogo + 3 × "Você entendeu?" + telas de fim + Revisão (mín(palavras, 10) + 4 ordenar + cenários + V/F + 2 lacunas) + erros`.

**Conclusão (confiança média para o sentido, baixa para o tamanho):** as estimativas do mapa estão **altas**. A unidade ficou com ~30 min
porque esse foi o chute inicial, sem conta de telas; os módulos do A1 parecem carregar ainda o *défi* arquivado; e as regras de diferença
cobram por palavra e por lição bem mais do que o código acrescenta.

**O que poderia deixar o tempo real maior que a faixa alta** (não está no modelo): refazer lição (o modo revisão de lição concluída não grava evento),
pausas com a lição aberta, o desvio para o Flashcard entre lições (é tempo de Revisão de cartões, não da trilha, mas a aluna sente como parte da lição),
Desafios, ditados e Conjugação, e recursos ainda não feitos (V/F depois de nota, "Grave e compare", cenários nas lições, E4/E5 do A2).

## 4. O que o app já grava e como medir o tempo real

### 4.1 O que existe

| Fonte | O que guarda | Serve para tempo de lição? |
|---|---|---|
| Tabela `usage_events` (`shared/supabase_migrations/007` e `008`; gravada por `trackEvent`, `shared/analytics.js:68`) | `user_id`, `language_app_key`, `event_type`, `event_name`, `meta` (jsonb), `created_at` (hora do servidor), `session_id` (um por carregamento de página), `device_type`, `browser`, `os`, `actor_type` | **sim, por diferença de horários** |
| `lesson_complete` / `vocab_lesson` (`fr/app.js:1961`) | `meta: { unitId, lessonIdx, scorePct }` no fim de cada lição intermediária | marca o **fim**; não há `lesson_start` para lição da trilha |
| `lesson_complete` / `unit_checkpoint` (`markUnitCompleted`, `fr/app.js:4535`) | `meta: { unitId, scorePct }` no fim da Revisão da unidade (e também de unidade de gramática, e quando a unidade se completa pelo Flashcard ou "Já sei?") | marca o fim da Revisão da unidade |
| `tab_switch`, `review_answer` (só na Revisão de cartões), `lesson_start`/`lesson_complete` de Flashcard, ditado, Conjugação, jogos | horários | ajudam a achar o começo da sessão e os desvios para o Flashcard |
| `technical_perf` / `page_load` | um por sessão | marca o começo da sessão |
| Painel Admin, Analytics (`shared/admin-analytics-calc.js:406`) | "minutos estimados" = soma de (último − primeiro evento) por `session_id` | só tempo de sessão, não de lição |
| `progress.data` (estado sincronizado): `dailyMinutesLog` | **estimado**, 20 s por exercício acertado (`ESTIMATED_SECONDS_PER_EXERCISE`, `fr/app.js:2999`); legado, não é lido | não (não é cronômetro) |
| `progress.data`: `reviewTimeStats` | tempo **real** das sessões de Flashcard (`recordReviewSessionTime`, `shared/review-extras.js:100`, no máximo 60 s por cartão) | não (só Revisão de cartões), mas é o modelo a copiar |
| `unitProgress[unidade].completedAt` | só a data | não |

Não existe tabela `analytics_events`; o nome certo é `usage_events`. O Ponto de verificação do **módulo** não grava evento.

### 4.2 Como medir com o que já é gravado (consulta só com autorização da dona)

1. Pegar os eventos de cada `user_id` e `session_id` em ordem de `created_at`, com `actor_type = 'user'`.
2. **Lição n (n ≥ 1)**: tempo = `created_at` do `vocab_lesson` com `lessonIdx = n` menos o do `vocab_lesson` com `lessonIdx = n − 1` da mesma unidade e sessão.
3. **Revisão da unidade**: `unit_checkpoint` da unidade menos o `vocab_lesson` da última lição.
4. **Descartar** o par quando houver, entre os dois, `lesson_start` de Flashcard ou outro evento de outra área (desvio para o Flashcard ou outra aba),
   ou quando a diferença passar de 30 min (pausa). Usar **mediana** e quartis, não média.
5. Lição 0 de cada unidade: só dá para estimar quando vem logo depois do `unit_checkpoint` da unidade anterior (inclui as telas de fim e a navegação).
6. Cruzar com `device_type` (celular x computador) e com `scorePct` (quem erra mais demora mais).

Limites: só contas logadas e não excluídas; o tempo inclui aba escondida e pausas curtas; a primeira lição de cada sessão fica sem medida;
`unit_checkpoint` também nasce fora da Revisão (Flashcard, "Já sei?"), então só vale quando vem depois de um `vocab_lesson` da mesma unidade.

### 4.3 O que faltaria gravar (sem migration: tudo cabe no `meta`)

- `lesson_start` / `vocab_lesson` com `{ unitId, lessonId, lessonIdx, palavras }` ao abrir a lição; o mesmo para a Revisão da unidade e para a gramática.
- No `lesson_complete`: `durationMs` (relógio), `activeMs` (sem o tempo com a aba escondida e com teto por tela, como `recordReviewSessionTime`),
  `respostas`, `erros`, `naoSei`, `notas` vistas, e o tempo por fase (`ponte`, `fichas`, `notas`, `checagem`, `pratica`, `dialogo`, `entendeu`, `revisao`).
- `lesson_abandon` ao sair no meio (`exitToPath`), com a fase em que saiu.
- `lesson_complete` também na revisão de lição já concluída (hoje sai sem evento).
- Uma versão do conteúdo da unidade (ex.: quantidade de palavras e notas) para comparar antes x depois de uma mudança.

Grátis x Premium: a medição é interna e vale para todos; nada muda na tela do aluno.

## 5. O que faz o tempo crescer com os cartões, e as alavancas

### 5.1 O que cresce

| Fator | Como cresce | Custo por unidade (faixa) | Confiança |
|---|---|---|---|
| Cada palavra | ficha + checagem + prática = 1 tela + 2 respostas | ~17 a ~45 s | média |
| Rodada por palavra da Revisão | +1 resposta por palavra **até a 10ª** (`CONSOLIDATION_CAP`); da 11ª em diante, zero | ~6 a ~16 s por palavra (até 10) | alta (regra do código) |
| Lição a mais (a 4ª) | abrir + ponte de 2 perguntas + "Lição concluída" | ~25 s a ~1 min | média |
| Notas | 1 tela por nota; o piloto dobra (4 → 8) e a decisão 292 chega a ~9 | ~15 a ~45 s cada | média |
| V/F depois de nota (previsto) | 1 resposta por nota de explicação ou realidade | ~5 a ~12 s cada | média |
| Erros | sem fase `mixed` nas lições, o erro não repete a palavra na lição; mas abre o painel e, com 3 palavras erradas ou mais, cria a "Revisão dos erros" | ~10 a ~20 s por erro | baixa |
| Parte fixa da Revisão da unidade | 4 ordenar + cenários + V/F + 2 lacunas, **não depende** do número de palavras | ~1,5 a ~4,5 min | média |
| Desvio para o Flashcard entre lições | se havia cartões devidos, "Continuar" abre o Flashcard; com mais palavras, mais cartões | fora da trilha | média |

Resumo: com o código de hoje, **12 palavras custam ~1 a ~3 min a mais que 10**, não os ~20 min que as regras somam.

### 5.2 Alavancas que reduzem o tempo sem perder a Revisão

Em ordem de ganho por esforço (ganhos para uma unidade de 12 palavras, confiança baixa):

1. **Refazer a estimativa antes de cortar conteúdo.** Tirar a sobra do *défi* arquivado dos tempos do A1 e trocar "+5 min por palavra / +10 pela
   4ª lição" por algo perto de "+1 min por palavra / +1 min por lição" até haver medição. Só isso já tira de 5 a 10 h do A1 e pode desfazer a pressão
   do teto de 3h55 (regra 16) sobre o tamanho das unidades. Sem código.
2. **Medir** (seção 4.2 agora, 4.3 depois) e só então decidir o limite de palavras por unidade.
3. **Ordenar / traduzir 4 → 2** na Revisão da unidade: é o exercício mais caro. Ganho ~30 s a ~1,3 min. Mantém a Revisão.
4. **Cenários e V/F com teto** na Revisão (piloto: 5 cenários + 2 V/F): por exemplo 3 + 1. Ganho ~25 s a ~50 s.
5. **Prática só para quem errou a checagem** (função pura em `shared/core/`, com teste): palavra acertada na checagem pula a prática na lição e
   continua na rodada da Revisão e nos cartões. Ganho ~6 a ~15 s por palavra (~1 a ~3 min por unidade). Perde uma exposição: decisão pedagógica da dona.
6. **Ponte de 2 → 1 pergunta.** Ganho ~5 a ~12 s por lição.
7. **Notas secundárias só na lâmpada 💡** (abre quem quer) e a regra da "primeira aparição breve". Ganho ~15 a ~45 s por nota tirada do fluxo.
8. **Lições menores** (3 palavras em vez de 4): cada lição fica mais curta (melhor para a sensação de "acabou rápido"), mas o total sobe um pouco (~25 s a ~1 min por lição a mais).
9. **Desvio para o Flashcard opcional** ("Revisar agora" ou "Voltar à Trilha"): não muda o tempo da trilha, mas separa as duas coisas na cabeça da aluna e na medição.

O que **não** precisa mudar para proteger a Revisão: a rodada por palavra já tem teto de 10 e prioriza as palavras erradas; os cartões FSRS
continuam todos. Qualquer mudança de regra (3, 5, 6) entra como função pura em `shared/core/` com teste em `tests/<tema>/`, conforme `.claude/rules/qualidade-de-codigo.md`.
