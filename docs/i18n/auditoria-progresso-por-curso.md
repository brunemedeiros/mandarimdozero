# Auditoria: progresso por curso (idioma estudado × idioma do site)

Estado: **só leitura**. Nenhum código, banco ou migration foi alterado. Data: 2026-10-06.
Base: branch `claude/confident-brahmagupta-8v7rg0` (commit `7b63b89`). Decisão da dona do projeto (2026-10-06):
"Curso = idioma estudado × idioma do site"; XP por curso; streak por conta; ranking e conquistas da conta.

## Sumário (10 linhas)

1. Hoje o progresso vive em UMA linha por conta (`progress.data`), separado só pelo idioma estudado (`data.frances`, `data.mandarim`); o idioma do site fica em `data._meta.uiLanguage`.
2. Convidado **não salva progresso nenhum** (nem no navegador); o texto do portão diz o contrário (`index.html:318`).
3. Proposta de chave: manter `data.frances`/`data.mandarim` como os cursos "…para falantes de português" (zero migração para as 25 contas) e gravar cursos novos em chaves novas (`data["frances@en"]`), com um registro em `_meta.courses`.
4. Streak por conta exige tirar `streak`/`lastStudyDay`/`activityLog`/`hadStreakComeback` do bloco do idioma e levar para um bloco de conta (`data._account`); dá para calcular sem perda a partir da união dos `activityLog`.
5. XP por curso já é o formato atual (`xp` dentro do bloco do idioma); o ranking já soma tudo na aba "Todos" (`weekly_xp`, `shared/leaderboard.js:63-71`).
6. Conquistas hoje são por idioma (`earned_badges.language_app_key`, BADGES lidos do STATE do idioma); "da conta" exige definir quais badges são de conta e quais são de conteúdo de curso.
7. Servidor: 059, 070, 037 e o `notification-cron` leem `progress.data` pela chave do idioma; todos continuam funcionando para os cursos atuais, mas ignoram cursos novos (070 e cron têm listas fixas).
8. Decks, cartões próprios, cartões da professora e vínculos de professora são por idioma estudado (`language_app_key`); isso não precisa virar "curso", mas o FSRS desses cartões hoje mora dentro do bloco do idioma — pergunta aberta (seção 3/7).
9. A gaveta (`shared/card-variants.js`, `c0abfb5`) **não está na `main`** (nunca foi publicada) e deixa de ser necessária com cursos; pode ser revertida antes de qualquer merge.
10. Plano em 7 fases pequenas; a primeira que mexe em dados é a do streak por conta. Nada foi testado em navegador ou banco nesta auditoria.

---

## 1. Onde o progresso é guardado hoje

**Tabela `progress`**: uma linha por `user_id`, coluna `data jsonb` (migration 064 só versionou a tabela existente).

| O quê | Onde | Arquivo:linha |
|---|---|---|
| Chave do idioma | `const APP_KEY = 'frances'` / `'mandarim'` | `fr/app.js:963`, `zh/app.js:1214` |
| Montar o bloco | `serializeState()` (todo o STATE persistido do idioma) | `fr/app.js:1098-1128`, `zh/app.js:1245-1273` |
| Restaurar | `applySerializedState(data)` (merge campo a campo) | `fr/app.js:1130-1186`, `zh/app.js:1275+` |
| Ler | `loadState()` lê a linha inteira e aplica só `data.data[APP_KEY]` | `shared/auth.js:592-632` (aplica em 611-612) |
| Formato antigo do zh | `loadLegacyState()` quando não há `data.mandarim` (estado na raiz) | `zh/app.js:1226-1228`, chamado em `shared/auth.js:613-620` |
| Gravar | `saveState()` lê a linha fresca, troca só `[APP_KEY]`, faz upsert | `shared/auth.js:461-561` (merge em 523) |
| Guard-rail | Recusa gravar se `xp`/`totalReviews`/`totalAudioPlays` diminuírem **dentro do mesmo idioma** | `shared/auth.js:51`, `507-520` |
| Idioma do site da conta | `data._meta.uiLanguage`; leitura `uiLanguageFromProgressData` | `shared/language-pref.js:86-131`; aplicado em `shared/auth.js:326-415` |
| Idioma estudado atual | `data._meta.currentLearningLanguage` (+ inferência pelos blocos existentes) | `shared/language-pref.js:17-43`, `78-80` |
| Merge seguro de `_meta` | `mergeProgressMeta()` (nunca passa por `serializeState`) | `shared/language-pref.js:50-76` |
| Conta nova? | `progressAccountIsNew` = nenhuma chave fora de `_meta` | `shared/auth.js:610` |

**Convidado**: `saveState()` retorna logo no início se não há `CURRENT_USER` (`shared/auth.js:462`). Não existe gravação de progresso em `localStorage` (busca por `localStorageSafeSet`/`setItem` em `fr/app.js`, `zh/app.js`, `shared/*.js` só achou preferências: cloze, som, sidebar, ranking, `ui-language`, `last_language`). O texto "Como convidado(a), seu progresso fica salvo só neste navegador" (`index.html:318`) **não corresponde ao código**: recarregar a página zera o convidado. Para cursos isso simplifica (nada a migrar no navegador), mas o texto deveria ser corrigido em qualquer caso.

**Idioma do site (convidado e conta)**: núcleo em `shared/i18n/i18n.js` (`getUiLang`, `setUiLang`, `localStorage['ui-language']`, linhas 29-79 e 247-256). Não existe `window.UI_LANG`; quem lê o idioma do site usa `getUiLang()` (ex.: `fr/app.js:938`, `8605`, `9925`).

### Proposta de chave por curso

Identificador lógico do curso: `courseId = "<appKey>@<uiLang>"` (ex.: `frances@pt-BR`, `frances@en`, futuramente `portugues@en`).

Chave de armazenamento (proposta **B**, recomendada):
- Os dois cursos que já existem guardam em `data.frances` e `data.mandarim`, exatamente como hoje: são `frances@pt-BR` e `mandarim@pt-BR`.
- Cursos novos usam a própria chave: `data["frances@en"]`, `data["mandarim@en"]`, `data["portugues@en"]`.
- Registro explícito em `_meta.courses`: `{ "frances@pt-BR": { storageKey: "frances", startedAt }, ... }` e `_meta.currentCourse`. A regra "pt-BR usa a chave sem sufixo" **não** deve ser deduzida no código (falha para `portugues`, cujo curso base é em inglês); a função única `courseStorageKey(courseId)` consulta o registro e só cai no legado para os dois cursos atuais.

Por que B e não A (`data.courses[courseId]`, simétrico, com migração):
- B não reescreve nenhuma linha das 25 contas; 059, 037, o painel do Perfil (`shared/profile.js:351-400`) e o cron continuam lendo `data.frances` como hoje.
- A exige migrar `progress` de todas as contas e mudar as 4 leituras do servidor ao mesmo tempo que o cliente — janela de quebra igual à do rollout 059–069.
- Custo de B: nomes assimétricos e listas fixas no servidor que precisam aprender as chaves novas (seção 4).

**Migração das contas atuais**: nenhuma cópia de dados para o progresso do curso. Só gravar `_meta.courses` (com `mergeProgressMeta`, que já preserva o resto) na primeira carga depois do deploy — ou nem isso, se `courseStorageKey` tratar ausência de registro como "curso pt-BR = chave legada". A única migração real é a do streak por conta (seção 3).

Tamanho da linha: cada curso novo acrescenta um bloco do tamanho do atual (o array `cards` do francês tem centenas de itens). `saveState` sempre lê e regrava a linha inteira; com 2-3 cursos isso continua aceitável, mas não foi medido.

## 2. Pontos que assumem "idioma estudado = chave"

| Ponto | Arquivo:linha | Vira "curso"? |
|---|---|---|
| `APP_KEY` usado como chave de `progress.data` | `shared/auth.js:507`, `523`, `611` | **Sim** — trocar por `COURSE_STORAGE_KEY` só nestes 3 pontos. |
| `MONOTONIC_PROGRESS_FIELDS` compara dentro do bloco | `shared/auth.js:509` | Sim (compara no bloco do curso); `streak` não está na lista, sem efeito. |
| `loadLegacyState` (zh) | `zh/app.js:1226` | Só para `mandarim@pt-BR`; nunca para um curso novo. |
| `weekly_xp.language_app_key = APP_KEY` | `shared/auth.js:548` | Ver seção 4 (XP por curso no ranking). |
| `earned_badges.language_app_key = APP_KEY` | `shared/auth.js:576` | Ver seção 3/4 (conquistas da conta). |
| Notificações, push, analytics, reports | `shared/notifications.js:116,170,198`, `shared/push.js:80`, `shared/analytics.js:90`, `shared/reports.js:568` | **Não**: continuam idioma estudado; `ui_language` já é escolhido pelo `_meta` no cron. Para analytics, pode-se acrescentar o idioma do site em `meta` (opcional). |
| Cartões da professora e próprios | `fr/app.js:520,542,579,590` | **Não** (tabelas por idioma estudado). |
| Decks e Course Decks | `fr/app.js:6376-6393` | **Não** (por idioma estudado). |
| Fala/áudio do campo | `fr/app.js:6583,6765,7028,7058` (`isStudyLanguageField(…, APP_KEY)`) | Não. |
| Perfil público, Public Deck, Anki | `shared/public-profile.js:399-564`, `shared/public-deck.js:45,337,507`, `shared/anki-export.js:125` | Não. |
| Preferências locais com prefixo do idioma | `fr/app.js:992` (`frances_cloze_mode`), `1315` (`frances_last_study_notif`); equivalentes em `zh/app.js:1118,1447` | Não (preferência do aparelho). |
| `LAST_LANGUAGE_KEY` e `currentLearningLanguage` | `languages/index.js:57`, `shared/language-switcher.js:69-89`, `index.html:273-325` | Viram "último curso" / `_meta.currentCourse`. |

Contagem: `APP_KEY` aparece 16 vezes em `fr/app.js`, 16 em `zh/app.js` e em 18 arquivos de `shared/`. Só os 3 usos de `shared/auth.js` acima tocam a chave do progresso; o resto é idioma estudado de verdade.

## 3. Campos do STATE: por conta, por curso ou ambíguo

Campos persistidos (lista de `serializeState`, `fr/app.js:1098-1128`; zh acrescenta `hanziCards`, `hanziLessonProgress`, `storyProgress` e não tem checkpoints/desafios/ditados, `zh/app.js:1245-1273`).

| Campo | Hoje | Recomendação | Motivo |
|---|---|---|---|
| `cards` (trilha) | idioma | **Curso** | Texto e, para variantes (país, hanzi), a palavra mudam por idioma do site. É o que elimina a gaveta. |
| `cards` com `origin:'teacher'`/`'self'` (FSRS de cartões das tabelas) | idioma (mesmo array) | **Ambíguo** | O conteúdo é por idioma estudado (tabelas); se ficar no bloco do curso, trocar de curso zera o FSRS desses cartões. Recomendo guardar o FSRS deles em um bloco por idioma estudado (`data.frances` continua sendo também esse bloco) — decisão da dona. |
| `hanziCards`, `hanziLessonProgress`, `storyProgress` (zh) | idioma | Curso | Mesmo raciocínio da trilha. |
| `unitProgress`, `checkpointProgress`, `levelTestProgress` | idioma | Curso | Progresso de conteúdo. |
| `xp`, `periodXp` | idioma | **Curso** (decisão) | Já é o formato atual. |
| `totalReviews`, `totalAudioPlays`, `everUsedSpeedReview`, `everUsedMatchGame` | idioma | Curso, somados para badges de conta | São contadores vitalícios usados por badges (`fr/app.js:1756-1778`). |
| `streak`, `lastStudyDay`, `hadStreakComeback`, `pendingStreakCelebration` (sessão) | idioma | **Conta** (decisão) | Exige migração (abaixo). |
| `activityLog` | idioma | **Conta** (união) | É a base do streak e do gráfico semanal (`fr/app.js:1195`, `1253`, `7735`). |
| `dailyLessonsLog`, `dailyMinutesLog` | idioma | Ambíguo → recomendo **conta** | Meta diária é de quem estuda, não do curso. |
| `studyGoal` (meta diária, dias, hora do lembrete) | idioma | Ambíguo → recomendo **conta** | Um único lembrete por pessoa. |
| `studySettings` (frequência, novas por dia, filtros) | idioma | Ambíguo → recomendo **idioma estudado** | É ajuste do motor de memória; não muda com o idioma do site. |
| `lastReviewReminderDay` | idioma | Conta | Evitar 2 lembretes no mesmo dia. |
| `daily` (missões do dia) | idioma | Ambíguo → recomendo **curso** | O cron lê `state.daily.missions` por idioma (`notification-cron` 125-160). |
| `completedChallenges`, `dictations`, `challengeReviews` (fr) | idioma | Curso | Conteúdo/explicação dependem do idioma do site. |
| `cardVariants` | idioma (só nesta branch) | **Remover** | Ver seção 6. |
| `progressSummary` (derivado) | idioma | Curso | Lido por Perfil, 037 e 070. |
| Badges (`BADGES` checados sobre o STATE do idioma; `earned_badges` por `language_app_key`) | idioma | **Conta** (decisão), com exceção | `unit_1`, `unit_half`, `unit_all` (🇫🇷) são de conteúdo de curso; `streak_3/7`, `comeback`, `weekend`, `xp_*`, `reviews_100` podem ser de conta. Precisa de lista da dona. |
| Notificações, preferências de notificação | tabela por `language_app_key` | Idioma estudado (sem mudança) | |

**Migração do streak para a conta (sem perda)**: para cada conta, `activityLogConta = união(dias de data.frances.activityLog, data.mandarim.activityLog)`; `lastStudyDay = máx(...)`; `streak` recalculado a partir da união (dias consecutivos terminando em `lastStudyDay`), nunca menor que o maior `streak` vivo atual (regra de `effectiveStreakFor`, `shared/srs.js`); `hadStreakComeback = OR`. Gravar em `data._account`, mantendo os campos antigos dentro dos blocos por compatibilidade com 059/070/037/cron até eles serem atualizados. Não verifiquei se o `activityLog` de todas as contas está completo desde o início (se alguma conta tem streak maior que os dias registrados, a regra "nunca menor" protege).

## 4. Servidor

| Peça | O que faz hoje | Arquivo:linha | Muda com cursos? |
|---|---|---|---|
| `get_teacher_student_metrics` (059) | `progress.data -> p_language_app_key`, cartões da professora | `059_teacher_metrics_note_level.sql:66-70`, `128` | Continua certa para o curso pt-BR. Para cursos novos, precisa decidir qual bloco ler (do idioma estudado, se o FSRS dos cartões da professora for por idioma — seção 3). |
| `get_teacher_student_overview` (070) | `jsonb_each` filtrado por `l.key in ('frances','mandarim','portugues')` | `070_teacher_student_overview.sql:65-71`, `159`, `164` | **Ignora chaves novas** (`frances@en`). Nova migration para listar cursos via `_meta.courses` e rotular "Francês (inglês)". |
| `get_public_profile_stats` (037) | Percorre todas as chaves que têm `progressSummary`/`xp` | `037_public_profile.sql:70-88` | Cursos novos aparecem automaticamente, mas com `languageAppKey = "frances@en"`; o cliente (`shared/public-profile.js`) precisa entender o formato. Streak ainda viria por curso. |
| Ranking (`weekly_xp`) | PK `(user_id, week_start, language_app_key)`; cliente soma tudo na aba "Todos" e filtra por idioma nas outras | `006_create_weekly_xp_table.sql`; `shared/auth.js:543-552`; `shared/leaderboard.js:63-71`, `195` | Duas opções: (a) gravar `language_app_key = 'frances@en'` (sem migration, a coluna é texto livre; abas por idioma passam a precisar de `like 'frances%'`); (b) manter o idioma estudado e somar XP de todos os cursos dele na mesma linha (exige ler os 2 blocos ao salvar). Ranking "da conta" = aba "Todos", já existe. |
| `earned_badges` | PK `(user_id, language_app_key, badge_id)` | `017_create_earned_badges_table.sql:24-27`; `shared/auth.js:574-581` | Para conquistas da conta: gravar com uma chave fixa (ex.: `'conta'`) ou nova migration; a vitrine pública lê por `APP_KEY` (`shared/public-profile.js:89`). |
| `notification-cron` | Loop por `LANGUAGES = [frances, mandarim]` sobre `row.data[appKey]`; streak_at_risk, inatividade, metas e missões por bloco; idioma do site via `_meta.uiLanguage` | `supabase/functions/notification-cron/index.ts:93-95`, `478-500`, `587-620`, `710`, `753`, `805-820` | Com streak por conta, `streak_at_risk` e inatividade devem ler `data._account`, senão manda 2 avisos (um por idioma). Cursos novos não são lidos (lista fixa). Mudança exige novo deploy da Edge Function. |
| `usage_events` | `language_app_key` = idioma estudado | `007_create_usage_events_table.sql:23`; `shared/analytics.js:90` | Não precisa mudar; opcional `meta.uiLanguage`. |
| `teacher_students` | Vínculo por idioma estudado (check `frances/mandarim/portugues`) | `025_create_teacher_students_table.sql:21-24` | Não muda (professora ensina o idioma, não o idioma do site). |
| `decks`, `own_flashcards`, `teacher_flashcards`, Course Decks | `language_app_key` = idioma estudado; Course Decks com nome em PT e `course_unit_id` por idioma | `049_create_decks_table.sql:61-92`, `051_create_course_decks.sql:26-38`, `215-230` | Não muda a chave. Os nomes dos Course Decks precisam ser exibidos traduzidos no cliente (já listado como bloqueio na fase 7 do roadmap). |
| `notification_templates.ui_language` | Já escolhe texto por idioma do site | `056_notification_templates_ui_language.sql` | Sem mudança. |

## 5. Navegação e interface

Hoje:
- Um site estático por idioma estudado: `fr/index.html`, `zh/index.html`, cada um com seu `app.js` e `APP_KEY`. Lista central em `languages/index.js:18-55` (`AVAILABLE_LANGUAGES`, com `id`, `appKey`, `path`).
- Portão da raiz (`index.html`): login, depois `getCurrentLearningLanguage` → redireciona para `fr/` ou `zh/`; conta nova escolhe idioma estudado e nível (`index.html:255-325`). O portão é sempre em português.
- Trocar idioma estudado: seletor do topo (`shared/language-switcher.js:69-89`) grava `currentLearningLanguage` e navega para `../<id>/`.
- Trocar idioma do site: Configurações, `#ui-language-select` (`fr/index.html:3655`, `zh/index.html:3220`), com modal `#ui-language-confirm-modal` (`fr/index.html:4139`, `zh/index.html:3673`; lógica `shared/i18n/i18n.js:287-339`). Texto atual: "…Seu progresso continua salvo." (`shared/i18n/pt-BR.js:85-86`). Com cursos, esse texto fica **errado**.
- Primeiro acesso da conta: `askUiLanguageOnFirstAccess()` pergunta o idioma do site dentro do app (`shared/auth.js:381-400`), depois da escolha do idioma estudado.

Como ficaria (sem implementar):
- **Portão**: primeiro "Eu falo…" (idioma do site; sugestão pelo navegador, `uiLanguageSuggestionFromBrowser`, `shared/auth.js:374`), depois a lista de cursos disponíveis para esse idioma. Disponível = conteúdo traduzido existe: hoje existem `fr/content.en.js`, `fr/challenges.en.js`, `zh/content.en.js`; `ContentI18n.isUnitTranslated` (`shared/content-i18n.js:297`) dá a cobertura por unidade. Falta a regra de corte (ex.: "todas as unidades do A1").
- **Meus cursos** (bandeira no topo, substitui/estende `shared/language-switcher.js`): lista os cursos de `_meta.courses` + "Adicionar curso". Trocar de curso = gravar `_meta.currentCourse`, setar o idioma do site e ir para `../<id>/` (se mudar o idioma estudado) ou recarregar o STATE do outro bloco (se mudar só o idioma do site). Recarregar a página é o caminho mais seguro: o STATE é montado no carregamento (`fr/app.js:811`) e `loadState` aplica um bloco só.
- **Configurações**: o seletor de idioma do site vira "trocar de curso" com o aviso. Texto sugerido (pt-BR): "Você vai trocar para o curso Francês para falantes de inglês. O progresso de cada curso é separado: o que você fez no curso atual continua salvo e volta quando você voltar para ele. Sua sequência de dias e suas conquistas continuam as mesmas." (confiança alta no conteúdo; redação a revisar pela dona.)
- Idioma do site **sem curso** (ex.: interface em inglês no zh antes de haver conteúdo): precisa de decisão — bloquear ou deixar só a interface trocar.

## 6. A gaveta (`shared/card-variants.js`, `STATE.cardVariants`, `c0abfb5`)

- `c0abfb5` **não está na `main`** (`git merge-base --is-ancestor c0abfb5 origin/main` → falso; só `origin/claude/confident-brahmagupta-8v7rg0` contém). O deploy só publica a `main` (`.github/workflows/deploy-pages.yml:10`). Logo nenhuma conta real tem `cardVariants` salvo.
- Usos: `fr/app.js:882`, `951`, `1101`, `1137`; `zh/app.js:988`, `1043`, `1053`, `1249`, `1282`; `fr/index.html`/`zh/index.html` (tag de script); testes `tests/i18n/test_card_variants.js`, `tests/i18n/test_card_variants_browser.js`.
- Com cursos: cada curso tem seu próprio array `cards`, a palavra de um slot nunca troca dentro do curso, e a gaveta não tem função. **Pode ser removida** (todos os usos acima + o módulo + os 2 testes) — preferência: reverter antes de levar a branch para a `main`, para não publicar um campo que depois teria de ser migrado.
- **Fica**: `refreshStudyCardTexts()` (`fr/app.js:946-956`, equivalente em zh) sem a chamada a `swapCardWordProgress` — ainda é necessária porque os cartões salvos guardam o texto do idioma em que foram salvos, e o overlay de conteúdo chega depois.
- Até os cursos existirem, a gaveta é a proteção contra misturar histórico ao trocar o idioma do site nesta branch. Se a branch for para a `main` antes dos cursos, a gaveta deve ir junto (ou o seletor de idioma do site fica escondido).

## 7. Riscos, fases e perguntas

### Riscos
1. **Quebra silenciosa no servidor**: 070 e o cron ignoram chaves novas; 037 mostraria `frances@en` cru. Mitigação: servidor primeiro, cliente depois (mesma ordem do rollout 059–069).
2. **Streak duplicado/perdido** na migração para a conta (dois idiomas com streaks diferentes). Mitigação: regra "união dos dias, nunca menor que o maior streak vivo"; testar com cópias das linhas reais em transação com ROLLBACK.
3. **FSRS de cartões da professora/próprios zerado** ao trocar de curso, se ficarem no bloco do curso (seção 3).
4. **`saveState` concorrente** entre duas abas em cursos diferentes: o merge por chave já protege (cada aba troca só a sua chave), mas `_account` passa a ser escrito por todas — precisa de merge de campo (máximo de `lastStudyDay`, união de `activityLog`), não sobrescrita.
5. **Guard-rail monotônico**: continua por bloco; não cobre `_account`. Acrescentar regra própria (streak pode cair legitimamente quando quebra; `activityLog` nunca perde dias).
6. **Texto do aviso e do portão** desatualizados ("progresso continua salvo"; "salvo neste navegador").
7. Tamanho da linha de `progress` cresce por curso (não medido).

### Fases (pequenas e reversíveis)

| Fase | O quê | Banco/migration | Critério de pronto | Testes |
|---|---|---|---|---|
| C0 | Reverter a gaveta nesta branch; corrigir o texto do convidado no portão | Não | `grep cardVariants` vazio; testes i18n passam sem os 2 de variantes | unit i18n, Playwright fr/zh de troca de idioma |
| C1 | `courseId`/`courseStorageKey()` em `shared/` (puro) e uso nos 3 pontos de `shared/auth.js`; com só pt-BR, comportamento idêntico | Não | Save/load de conta real byte a byte igual (hash do bloco) | Node/VM (função pura), Playwright com stub, regressão fase-k1/k6 |
| C2 | Bloco `_account` (streak, lastStudyDay, activityLog, comeback, meta diária) lido/escrito pelo cliente, mantendo espelho nos blocos antigos | Não (só `jsonb`) | Streak igual antes/depois para as 25 contas (simulação em SQL com ROLLBACK) | SQL real em transação, Node/VM da regra de união, Playwright |
| C3 | Servidor: 070 e 037 entendem `_meta.courses`; cron lê `_account` para streak/inatividade; 059 lê o bloco certo | **Sim** (migration 072 sem DROP) + deploy da Edge Function | RPCs devolvem o mesmo resultado para as contas atuais; curso fictício aparece rotulado | SQL local 001..072, Staging antes da produção |
| C4 | Conquistas da conta: lista de badges de conta × de curso; `earned_badges` com chave de conta | Talvez (migration de backfill) | Nenhum badge já ganho some | SQL com ROLLBACK, Playwright |
| C5 | Curso novo de verdade (`frances@en`) atrás de flag: "Meus cursos", aviso novo, `_meta.currentCourse` | Não | Trocar de curso e voltar preserva os dois progressos | Playwright fr/zh × pt-BR/en |
| C6 | Portão "Eu falo…" + lista de cursos disponíveis; ranking por curso | Não (ou opção (a) do ranking, sem migration) | Conta nova escolhe idioma e curso; contas atuais entram direto | Playwright do portão |

### Perguntas para a dona do projeto
1. FSRS dos cartões próprios e da professora: separado por curso ou compartilhado por idioma estudado? (recomendação: por idioma estudado)
2. `studySettings`, meta diária e hora do lembrete: por conta, por idioma estudado ou por curso?
3. Quais conquistas são da conta e quais são do curso (ex.: "Terminou o A1" com 🇫🇷)?
4. Ranking semanal: só "Todos" (conta), ou também abas por curso e por idioma estudado?
5. Regra de "curso disponível": quanto do conteúdo precisa estar traduzido (todo o A1? todo o nível?)?
6. Interface em inglês sem curso em inglês (ex.: mandarim hoje): permitir só trocar a interface, ou esconder?
7. Missões do dia: por curso (como hoje por idioma) ou por conta?
8. Pode começar com recarregar a página ao trocar de curso (mais simples e seguro)?

### O que NÃO foi verificado
- Nada rodou em navegador, Postgres local ou Supabase (só leitura de arquivos e `git`).
- `zh/app.js` não foi lido linha a linha (só STATE, serialize/apply e usos de `APP_KEY`/`cardVariants`).
- Não conferi se o `activityLog` das contas reais cobre todos os dias de streak, nem o tamanho real das linhas de `progress`.
- Não li `shared/admin-analytics.js`, `shared/analytics-metrics.js` e o painel de estatísticas completo quanto a streak/XP agregados.
- Não verifiquei a versão publicada das RPCs em produção além do que dizem os arquivos e o CLAUDE.md.
- A cobertura real de tradução de `fr/content.en.js`/`zh/content.en.js` não foi medida.
