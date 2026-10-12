# Auditoria da E3: progresso por curso e dados da conta

Data: 2026-10-12. **Só leitura**: nenhum código, banco ou migration foi alterado. Atualiza `auditoria-progresso-por-curso.md`
(2026-10-06, que continua valendo como base de raciocínio) contra o código de hoje (HEAD com E1 e E2) e contra o banco de
produção (`eigjocalzwamisgqilhg`), consultado só com agregados (sem nomes, e-mails ou dados individuais).
Etapa: E3 de `arquitetura-multi-idioma-cursos.md`. Nada da E3 foi implementado.

## 1. Resumo

1. O desenho da auditoria antiga se sustenta: chave por curso com os dois cursos atuais nas chaves de hoje (`data.frances`, `data.mandarim`), registro em
   `_meta.courses`, bloco `_account` para o que é da conta. **Nenhuma conta precisa de migração de progresso.**
2. Os dados reais deixam a migração do streak sem risco: `activityLog` completo em 100% dos blocos, streak máximo de 2 dias, e a regra "união dos
   logs" reproduz o streak atual nas contas que têm os dois idiomas.
3. **Um bug novo e provável, que já existe hoje**: o `zh` grava `hanziCards` mas não restaura (removido na K2-C, commit `49692ff`, 2026-09-30). Se confirmado, o
   progresso dos cartões de hanzi não volta ao recarregar. Precisa de teste e correção antes da E3 (passo C0).
4. **Um bug que a E3 criaria**: `weekly_xp` tem chave `(user, semana, idioma estudado)` e o `saveState` faz upsert do XP do bloco atual. Com dois cursos do mesmo
   idioma (`frances@pt-BR` e `frances@en`) um sobrescreveria o outro. Solução: gravar a soma dos blocos do idioma.
5. A "gaveta" (`cardVariants`) **já está na `main` e em produção** (a auditoria antiga dizia que não). Mas está **vazia em todas as 13 contas** que têm o campo.
   Pode ser removida, só que depois do curso próprio (C5), não antes, porque até lá ela ainda protege o FSRS ao trocar o idioma do site.
6. Conquistas "da conta" não precisam de migração: basta tratar a união por `badge_id` na tela (7 pares repetidos entre idiomas hoje).
7. Servidor: só 3 RPCs leem `progress` (`get_public_profile_stats`, `get_teacher_student_metrics`, `get_teacher_student_overview`) mais o `notification-cron`.
   Todos continuam certos para os cursos atuais e ignoram cursos novos. A próxima migration livre é a **075**.
8. Tamanho da linha não é problema: bloco médio de ~100 KB (fr) e ~144 KB (zh) em texto; com 3 a 4 cursos a linha fica abaixo de 1 MB (R-13 resolvido).
9. Ordem de entrega: servidor primeiro, cliente depois, Staging antes da produção, nada em produção sem sua autorização.

## 2. O que mudou desde a auditoria de 2026-10-06

| Ponto | Antes | Agora |
|---|---|---|
| Gaveta `c0abfb5` / `cardVariants` | "não está na `main`" | **Está** (PR #296, publicada). Vazia em produção. Usos: `fr/app.js:891,964,1114,1153`, `zh/app.js:992,1049,1059,1255,1290`, os 2 `<script>`, 2 testes. |
| Conteúdo | português embutido, overlay em inglês por cima | E2: base sem português + camada `courses/<par>-pt-BR/layer.js` aplicada no carregamento; `content.en.js` continua por cima |
| Registro de idiomas | listas fixas | E1: `languages/registry.js` com `courseIdOf`, `parseCourseId`, `layerDir`, `courseStatus` (ninguém chama ainda) |
| `_meta.courses`, `courseStorageKey`, `_account` | propostos | **não existem em nenhum arquivo executável** |
| Migrations | até 071 | até 074; números 072 e 073 duplicados; **próxima livre: 075** |
| Consumidores de `language_app_key` | ranking, vitrine | + `friends_leaderboard` (073:358-361, 383) e `friends_activity` (074:159-163, `shared/friends.js:359`) |
| `notification-cron` | lista fixa de idiomas | + `state?.frances ? 'frances' : ...` em `index.ts:712` (lembrete do badge em destaque); `LANGUAGES` fixo em `93-96`; `streak_at_risk` em `589-590` |
| Linhas de `auth.js` | 461-632 | `APP_KEY` do progresso em `510-520`, `526`, `614-615` (3 pontos, como antes); `weekly_xp` em `547-554`; `earned_badges` em `579-582` |
| Texto do aviso de troca de idioma | "Seu progresso continua salvo." | igual (`shared/i18n/pt-BR.js:84-85`), vira errado com cursos |
| Texto do portão para convidado | afirma salvar no navegador | igual (`index.html:319`), continua errado |

## 3. Fatos ao vivo (produção, 2026-10-12, só agregados)

| Medida | Valor |
|---|---|
| Linhas em `progress` | 33 (25 com bloco de idioma, 8 sem nenhum) |
| Blocos | 20 `frances`, 5 `mandarim`, 2 contas com os dois, 0 `portugues` |
| `_meta` | em 25 linhas; `currentLearningLanguage` em 25; `uiLanguage` em **1** (en); nenhuma tem `courses`, `_account` ou `currentCourse` |
| Tamanho do bloco (texto) | fr: média ~100 KB, máx ~137 KB; zh: média ~144 KB, máx ~165 KB; linha inteira: máx ~386 KB (47 KB comprimida) |
| Streak | máximo 2 (fr) e 1 (zh); 14 blocos fr e 4 zh com streak > 0 |
| `activityLog` | objeto `dia -> número` em 100% dos blocos; último dia do log = `lastStudyDay` em todos; nenhum streak maior que os dias do log; 6 blocos fr e 1 zh com log vazio (nunca estudaram) |
| Contas com os dois idiomas | 2; em uma delas fr = 2 e zh = 1, e a união dos logs dá 2, igual ao maior streak |
| `weekly_xp` | 63 linhas, 20 contas, só chaves `frances` e `mandarim` |
| `earned_badges` | 102 linhas, 13 contas, 14 tipos de badge, 7 pares (conta, badge) repetidos entre idiomas |
| RPCs que leem `progress` | 3: `get_public_profile_stats` (lê `streak`), `get_teacher_student_metrics` (lê cartões), `get_teacher_student_overview` (cita `'frances'`, percorre as chaves, lê `streak` e `activityLog`) |
| `cardVariants` | chave presente em 13 blocos (10 fr, 3 zh), **todos `{}`** |
| `zh.hanziCards` | gravado em 5 contas (até 198 itens), **0 com histórico de estudo** (compatível com o bug, ver seção 6) |

O que não foi possível medir: quantas pessoas realmente usaram o site em inglês no passado (só 1 conta tem `uiLanguage` gravado).

## 4. Modelo de dados proposto

**Curso e armazenamento (como na auditoria antiga, proposta B)**
- `courseId = "<appKey>@<idiomaDoSite>"`. `frances@pt-BR` e `mandarim@pt-BR` ficam em `data.frances` e `data.mandarim`; os novos em `data["frances@en"]`.
- `courseStorageKey(courseId)` consulta `_meta.courses` e só cai na chave legada para os dois cursos atuais quando não há registro. Ligar só nos 3 pontos de
  `shared/auth.js` (`510-520`, `526`, `614-615`).
- Conta antiga sem `_meta.courses`: registro montado **só para os blocos que existem**, `startedAt: null`.
- `_meta.uiLanguage` continua da conta e manda; `currentCourse` é derivado dele e do idioma estudado da página (contrato da E0, seção 5).

**Bloco da conta (`data._account`)**: `streak`, `lastStudyDay`, `activityLog`, `hadStreakComeback`, `dailyLessonsLog`, `studyGoal`, `lastReviewReminderDay`.
Merge por campo, nunca sobrescrita: `lastStudyDay` = máximo, `activityLog` = união (e nunca perde dias), `hadStreakComeback` = OU. Os campos antigos continuam
espelhados nos blocos de idioma até o servidor (037, 070, cron) ler `_account`.

**Classificação dos campos** (recomendação; decisões em pedido na seção 5)

| Campo | Dono | Observação |
|---|---|---|
| `cards` de trilha, `unitProgress`, `checkpointProgress`, `levelTestProgress`, `hanziLessonProgress`, `storyProgress`, `completedChallenges`, `dictations`, `challengeReviews`, `progressSummary` | **curso** | |
| `xp`, `periodXp`, `totalReviews`, `totalAudioPlays`, `everUsed*` | **curso** | badges de conta somam os cursos |
| `streak`, `lastStudyDay`, `activityLog`, `hadStreakComeback`, `lastReviewReminderDay`, `dailyLessonsLog`, `studyGoal` | **conta** | `dailyMinutesLog` é legado sem leitor: congelar |
| `studySettings` | **idioma estudado** | ajuste do motor de memória |
| `daily` (missões do dia) | **curso** | o cron lê `state.daily.missions` por bloco |
| `cards` com `origin:'teacher'`/`'self'` (FSRS) | **idioma estudado** | hoje no mesmo array; ver pergunta 1 |
| `cardVariants` | remover depois do C5 | vazio em produção |

## 5. Decisões e perguntas (cada uma com recomendação)

Da arquitetura: **Q-10** conquistas, **Q-11** cartões próprios, **Q-12** Course Decks. Mais as perguntas abertas da auditoria antiga, agora respondidas com dados.

| # | Pergunta | Recomendação |
|---|---|---|
| Q-10 | Quais conquistas são da conta? | Sequência (`streak_*`, `comeback`, `weekend`), XP (`xp_*`), `reviews_100`, `first_step` e amizade: **conta**. `unit_1`, `unit_half`, `unit_all`, `unit_7`, `explorer`, `trained_ear`, `multitasker`: **curso**. **Sem migration**: continuam gravadas por idioma estudado; a tela mostra a união por `badge_id` para as da conta. |
| Q-11 | `own_flashcards` pertencem a quê? | **Idioma estudado.** O FSRS desses cartões fica no bloco do idioma estudado, não do curso (trocar de curso não zera). |
| Q-12 | Course Decks pertencem a quê? | **Idioma estudado** (unidades iguais); o título vem da camada do curso na exibição e não é gravado em português no banco. |
| P1 | FSRS de cartões da professora e próprios: por curso ou por idioma estudado? | Por idioma estudado (igual Q-11). |
| P2 | `studySettings`, meta diária, hora do lembrete | `studySettings` por idioma estudado; meta diária e lembrete por **conta** (um lembrete por pessoa). |
| P3 | Ranking semanal | Só "Todos" (conta) como ranking principal; abas por idioma estudado continuam. `weekly_xp` segue por idioma estudado e grava a **soma dos cursos** daquele idioma (evita sobrescrita). Sem migration. |
| P4 | Regra de "curso disponível" | `status` do registro: `publicado` aparece para todos; `beta` só com aviso; `rascunho` só admin e professora. Conta com `uiLanguage = en` abre `frances@en` em `beta` (hoje é o comportamento). |
| P5 | Interface em inglês sem curso em inglês (zh) | Hoje o zh já tem overlay em inglês (`beta`): permitir. Só bloquear quando o `status` for `rascunho`. |
| P6 | Missões do dia | Por **curso** (o cron já lê por bloco). |
| P7 | Trocar de curso na interface | **Recarregar a página** ao trocar (o STATE é montado no carregamento; menos risco), com o aviso novo "cada curso tem progresso próprio". |
| P8 | Aviso de troca de idioma | Texto novo (a revisar pela dona): "Você vai trocar para o curso Francês para falantes de inglês. O progresso de cada curso é separado: o que você fez no curso atual continua salvo e volta quando você voltar a ele. Sua sequência de dias e suas conquistas continuam as mesmas." Confiança: alta no conteúdo; a redação é sua. |

Grátis x Premium: **tudo grátis.** Trocar de curso, ter vários cursos e o idioma do site nunca são Premium (regra já existente do idioma do site).

## 6. Achados que pedem ação

1. **`hanziCards` do zh não restaura (provável bug atual).** `serializeState` grava `hanziCards` (`zh/app.js:1254`); `applySerializedState` (`zh/app.js:1283-1325`) não lê esse campo (o único `if (data.hanziCards ...)` está no caminho legado, `1233`, e chama a mesma função, que não o restaura). Removido pelo commit `49692ff` (K2-C). Efeito esperado: o FSRS e `firstLearnedDate` dos cartões de hanzi voltam ao zero a cada carregamento, e o próximo salvamento grava o zero por cima. Os dados batem (5 contas com `hanziCards` gravado, nenhuma com histórico). **Não foi reproduzido em navegador.** Vale um teste e uma correção independentes da E3, antes de começar.
2. **Corrida de `weekly_xp` entre cursos do mesmo idioma** (seção 1, item 4). Só passa a existir quando houver o 2º curso do mesmo idioma.
3. **Cron com chave fixa em mais um ponto** (`index.ts:712`) e leitura de streak por bloco: com `_account` o `streak_at_risk` e a inatividade têm de ler a conta, senão a pessoa com dois idiomas recebe dois avisos.
4. **`friends_activity` e `friends_leaderboard`** são consumidores novos de `language_app_key`: continuam certos enquanto a chave for o idioma estudado, que é o que se propõe.
5. **Convidado**: o texto do portão (`index.html:319`) afirma salvar no navegador; o código não salva nada. Corrigir.
6. **Migrations 072 e 073 duplicadas**: qualquer migration nova da E3 usa **075** ou mais.

## 7. Plano de execução da E3 (passos pequenos, cada um com gate)

**C0, C1, C2 e C3 prontos em 2026-10-12 (C3 só no Staging)** (ver `docs/historico/15-i18n-cursos-por-par-e0.md`): C0 = bug do `hanziCards` corrigido e texto do convidado; C1 = `courseStorageKey` com flag desligada, comportamento idêntico (diferencial em 28 cenários); C2 = `_account` (sequência da conta), ensaio em produção sem nenhum streak diminuindo.

| Passo | O quê | Banco | Pronto quando | Rollback |
|---|---|---|---|---|
| C0 | Teste e correção do `hanziCards` no zh; corrigir o texto do convidado | não | teste de gravar, recarregar e comparar FSRS verde; texto do portão correto | reverter o commit |
| C1 | `courseStorageKey()` puro em `shared/` e uso nos 3 pontos de `auth.js`; só pt-BR, comportamento idêntico | não | hash do bloco gravado idêntico ao de antes (conta antiga); V-06 | reverter o commit |
| C2 | Bloco `_account` (streak etc.) no cliente com espelho nos blocos antigos; regra de merge por campo; guard-rail próprio | não | streak igual antes e depois em cópia das linhas reais (SQL com ROLLBACK, Staging) | desligar a leitura de `_account` (espelho mantém tudo) |
| C3 | Servidor entende `_meta.courses` e `_account`: 070, 037, 059 e `notification-cron` (deploy novo da Edge Function) | **sim**, migration 075+ sem DROP | RPCs devolvem o mesmo resultado para as contas atuais; curso fictício aparece rotulado | migration de volta; cron anterior |
| C4 | Conquistas da conta: só tela (união por `badge_id`) | não | nenhum badge ganho some | reverter o commit |
| C5 | Curso novo atrás de flag (`frances@en`): "Meus cursos", aviso novo, recarregar ao trocar; XP somado por idioma no `weekly_xp`; remoção da gaveta | não | trocar de curso e voltar preserva os dois progressos; nenhuma sobrescrita de XP | desligar a flag |
| C6 | Portão "Eu falo..." e lista de cursos disponíveis | não | conta nova escolhe idioma e curso; contas atuais entram direto | desligar a flag |

Ordem no mundo real: servidor (C3) antes de qualquer conta ter dado novo; Staging antes da produção; **nada em produção sem sua autorização explícita**
(regra do projeto). Testes a criar em `tests/curso-progresso/`: chave por curso e conta antiga sem `_meta.courses`, merge de `_account` (concorrência entre duas abas),
guard-rail de `_account` (`activityLog` nunca perde dias), `weekly_xp` somado por idioma, caminho do hanzi, SQL com ROLLBACK para 037/059/070.

## 8. Riscos (novos e mantidos)

| Risco | Mitigação |
|---|---|
| R-10 corrida de `_meta` com o salvar | `_meta` e `_account` só por merge seguro; teste de concorrência |
| R-11 perda de streak | regra "máximo entre o streak vivo e o da união dos logs"; ensaio em cópia; comparação conta a conta antes de aplicar |
| R-12 guard-rail monotônico | compara dentro do bloco do curso; regra separada para `_account` |
| R-13 tamanho da linha | resolvido pela medição (seção 3) |
| R-34 `weekly_xp` sobrescrito entre cursos | gravar a soma dos blocos do idioma |
| R-35 FSRS dos cartões da professora zerado ao trocar de curso | FSRS no bloco do idioma estudado |
| R-36 hanzi sem restauração | passo C0 |
| R-37 aviso de troca de idioma e texto do portão desatualizados | passos C0 e C5 |

## 9. O que NÃO foi verificado

- Nada rodou em navegador nesta auditoria; o achado do `hanziCards` vem de leitura do código, do histórico do git e de dados do banco.
- Staging e as RPCs/migrations 073 e 074 aplicadas lá: só conferi produção (lista de migrations e as 3 RPCs que leem `progress`).
- O comportamento real de quem trocou o idioma do site (só 1 conta tem `uiLanguage` gravado).
- Os números de linha de `zh/index.html` para o seletor de idioma do site.
