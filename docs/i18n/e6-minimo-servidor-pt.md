# E6 mínima: o que o servidor precisa para o português (`pt`) existir

Auditoria só de leitura do código, 2026-10-15. Nenhuma migration aplicada, nenhum deploy, nenhum dado alterado,
nenhuma consulta ao banco ao vivo. Base: `docs/i18n/arquitetura-multi-idioma-cursos.md` (E6, Q-04, Q-06, Q-17, Dv-4),
`docs/i18n/auditoria-app-portugues.md` (na branch `claude/confident-brahmagupta-8v7rg0`), regras `supabase`,
`admin-professora`, `i18n` e a skill `migration-supabase`.

Idioma novo: id `pt`, chave `portugues`, curso único `portugues@en` (Q-04: o `/pt` só oferece o site em inglês).

## 0. O fato que muda tudo: onde mora o progresso do `pt`

`languages/registry.json` dá ao `pt` `legacyStorage: []`. Pela regra de `shared/course-storage.js:27-35`, o progresso de
quem estuda português fica em `progress.data["portugues@en"]`, **nunca** em `progress.data.portugues`.
Toda função do servidor que lê `data -> 'portugues'` direto não encontra nada. As que já entendem chave de curso
(`split_part(key,'@',1)`, ou `blockForLanguage` no cron) funcionam.

Já `weekly_xp`, `earned_badges`, `notifications`, `notification_templates`, `push_subscriptions` e `teacher_students`
usam a chave do idioma estudado (`portugues`, sem `@en`): `shared/auth.js:604-614` e `:643-647`.

## 1. O que já funciona com `portugues` (não mexer)

| Peça | Por quê |
|---|---|
| CHECK de `language_app_key` em `teacher_students` (025), `teacher_flashcards` (026), `own_flashcards` (028), `teacher_class_logs` (031), `teacher_support_materials` (033), `decks` (049), `teacher_invite_codes` (077), Banco de Revisão (081, 082), mural (087) | Todas as listas fixas já têm `'portugues'`. Nada quebra ao criar o `pt` |
| `ensure_user_decks` (076), `ensure_course_decks` (051), `ensure_teacher_decks` (053) | Aceitam `portugues` |
| `get_teacher_student_overview` (075:54), `get_public_profile_stats` (075:219), `friends_extras` (086:93), `_account_streak` (086:26) | Já leem chave de curso (`portugues@en`) |
| `friends_leaderboard` (073:335), `my_podium_weeks` (092), `_week_xp` (102:418), `friends_badge_feed` (091), `friend_suggestions` (095) | Genéricas, sem lista de idiomas |
| `weekly_xp`, `earned_badges`, `notifications`, `notification_templates`, `push_subscriptions`, `usage_events`, `reports` | `language_app_key` é texto livre |
| `notification_templates.ui_language` CHECK `('pt-BR','en')` (056) | O curso do `pt` é `en` |
| `_ui_lang` / `_friends_msg` (102) | Escolhem `en` pelo `_meta.uiLanguage` de quem recebe |
| `class-calendar-feed` (`index.ts:31-38`) | Já tem `portugues` nos textos `pt`/`en` e o caminho `/pt/` |
| `review-bank-agent/core.mjs:64`, `shared/review-bank*.js` | Já aceitam `portugues` |
| `tts-generate/tts_core.mjs:13-24` | Voz `pt-BR` (Chirp 3 HD) e o apelido `pt` já existem |

## 2. Achados, por gravidade

Gravidade: **quebra** = a função não entrega o que deveria para o `pt`; **texto errado** = sai português no site em
inglês, ou o rótulo/destino fica errado; **estética** = rótulo cru ou detalhe sem perda.
"Mig." = exige migration. "SQL Editor" = tem `DROP`/`DELETE` no arquivo ou no corpo de função recriada (a ferramenta MCP
trava; vai pelo SQL Editor da dona). "Local" = dá para testar sem rede.

### 2.1 Quebra

| # | Arquivo:linha | O que supõe | Efeito no `pt` | Correção mínima | Mig. | Local |
|---|---|---|---|---|---|---|
| Q1 | `supabase/functions/notification-cron/index.ts:93-96` (`LANGUAGES`), usado em `:607` (`primaryLanguageAppKey`) e `:868` (laço principal) | Só `frances` e `mandarim` | Conta que só estuda português não recebe NENHUM aviso automático (revisão atrasada, sequência em risco, meta do dia, reengajamento no sino e por e-mail, missões) | Acrescentar `{ appKey: 'portugues', id: 'pt' }`. `blockForLanguage` (`:579`) já acha `portugues@en` | Não; **deploy** da `notification-cron` | Sim: padrão de `tests/curso-progresso/test_cron_account.js` (vm + `stripTypeScriptTypes`) |
| Q2 | `shared/supabase_migrations/059_teacher_metrics_note_level.sql:66` (`get_teacher_student_metrics`) e `078_teacher_student_deck_counts.sql:41` (`get_teacher_student_deck_counts`) | `data -> p_language_app_key` (bloco sem `@`) | Painel da professora mostra o aluno de português sem nenhum cartão estudado, sem FSRS e sem `lastStudyDay` (o bloco real é `portugues@en`). Já acontece hoje com quem estuda fr/zh no site em inglês (`frances@en`) | Função auxiliar `_progress_block(data jsonb, app_key text)` com a MESMA regra de `blockForLanguage` (curso atual em `_meta.currentCourse` → chave legada → primeiro `app_key@...`) e `create or replace` das duas RPCs, mesma assinatura e mesmos grants | Sim, sem DROP/DELETE (MCP) | Sim: Postgres local, padrão `tests/painel-alunos/run.sh` |
| Q3 | `shared/supabase_migrations/102_friends_duo.sql:73` (`_friends_notify`) e `:261` (`_friends_notify_msg`) | `foreach v_lang in array['frances','mandarim']` | Aviso de Amigos (pedido, aceite, "te passou", parabéns, cutucar, missão em dupla) nunca aparece no sino do `/pt`: o sino filtra por `APP_KEY` (`shared/notifications.js:116`). O push sai (vai por `push_outbox`), o sino não | Trocar a lista fixa: gravar nos idiomas em que a pessoa tem bloco em `progress.data` (por `split_part(key,'@',1)`), e nos 3 se não tiver nenhum. Alternativa mais simples: acrescentar `'portugues'` à lista (3 linhas por aviso). Ver pergunta P4 | Sim, sem DROP/DELETE (MCP) | Sim: `tests/amigos-dupla/run.sh` |
| Q4 | `notification_templates` (seeds 010, 011, 012, 014, 015, 018, 019, 030) | Modelos só para `frances`/`mandarim` | Mesmo com Q1 corrigido, nenhum aviso sai para `portugues`: o cron (`pickFromPool`, `:490`) e o cliente (`pickNotificationTemplate`, `shared/notifications.js:106`) procuram `language_app_key = 'portugues'` e não acham nada. Inclui XP, sequência, conquista e missão do cliente, ranking semanal (`:719`) e o alerta de aluno sumido para a professora (`:823`) | Migration de seed (só `INSERT`) com modelos `ui_language='en'` para `portugues`, escritos para falantes de inglês (D-04), na ordem da Q-17: sequência e lembrete de estudo primeiro | Sim, só INSERT (MCP) | Sim: contagem por evento no Postgres local |
| Q5 | `shared/supabase_migrations/077_teacher_invites_and_badges.sql:77` (`_teacher_notify`) | `if p_lang not in ('frances','mandarim') then return` | Convite de professora para aluno de português não gera aviso (nem para o aluno, nem "aceitou/recusou" para a professora) | **Só listado**: convites são tratados em outra sessão | (outra sessão) | (outra sessão) |

### 2.2 Texto errado

| # | Arquivo:linha | O que supõe | Efeito no `pt` | Correção mínima | Mig. | Local |
|---|---|---|---|---|---|---|
| T1 | `notification-cron/index.ts:492` (`pickFromPool`) e `shared/notifications.js:110` (`pickNotificationTemplate`) | Sem modelo `en` ativo, cai no `pt-BR` | Viola "site em inglês não tem nada em português". No `pt` só aparece se alguém semear modelo `pt-BR` para `portugues`; no fr/zh em inglês já acontece se a linha `en` estiver inativa (056 criou as `en` com `active=false`; **conferir ao vivo** quantas foram ativadas) | Para `en`: sem modelo `en` ativo = sem aviso (nunca `pt-BR`). Muda também fr/zh: ver P2 | Não; deploy + front | Sim (Node) |
| T2 | `087_mural.sql:321`, `:324`, `:378`, `:441`, `:504` (chamadas de `_mural_notify`, `:131`) | Frase pronta em português ("postou no mural", "turma") | Todo aluno de português está no site em inglês (Q-04): todo aviso do Mural chega em português. Já é pendência no `CLAUDE.md` para fr/zh | `_mural_msg(evento, idioma, parâmetros)` + `_ui_lang(quem recebe)`, no molde de `_friends_msg` (102). Recriar `mural_create_post`, `mural_add_comment`, `join_classroom_code` e `mural_set_classroom_members` | Sim; **SQL Editor** (`mural_set_classroom_members` tem `DELETE`, 087:437) | Sim: `tests/mural/run.sh` |
| T3 | `077:82-84` (`_lang_label`) e textos dos convites (`077:159-197`, `087:506`) | Rótulos e frases em português | Mesmo problema de T2 nos convites | **Só listado** (outra sessão) | (outra sessão) | (outra sessão) |
| T4 | Destino dos avisos PARA a professora: `notification-cron/index.ts:823-829` (`student_inactive_alert`), `087:324` (post de aluno no mural), `077:191-197` | Grava com o `language_app_key` do ALUNO | Aviso sobre aluno de português vai para o sino do `/pt`, que só existe em inglês, enquanto a professora trabalha no `/fr`. Ela não vê | Decisão da dona (P1): por exemplo, aviso de supervisão no sino do idioma do site/curso que a professora usa | Depende de P1 | Sim |
| T5 | `notification-cron/index.ts:764` (`processFeaturedBadgeReminders`) | Só olha `frances`/`mandarim`; cai em `frances` | Conta só de português recebe o lembrete no sino do `/fr` | Usar `primaryLanguageAppKey(state) ?? 'frances'` | Não; deploy | Sim |
| T6 | `supabase/functions/report-reply-send/index.ts:53-55` e `:120` | Mapa só fr/zh; rodapé fixo em português | Resposta a report de aluno do `/pt` sai com nome genérico e rodapé em português | Acrescentar `portugues: 'Portuguese with Prof. Brune'` e rodapé pelo `_meta.uiLanguage` de quem recebe | Não; deploy | Sim (função pura) |
| T7 | `docs/email/supabase/*.html` (modelos do Supabase Auth: confirmar conta, link mágico, senha, troca de e-mail) | Um modelo só, em português | Todo aluno do `/pt` recebe o e-mail de cadastro em português | Condicional do modelo do Supabase (`{{ if eq .Data.<idioma> "en" }}`) com o idioma do site gravado no metadado do cadastro, ou texto bilíngue. A dona cola no painel | Não | Parcial (renderizar o HTML) |
| T8 | `071_public_deck_hardening.sql:21-22`, `:69`, `:83-84`, `:122-125` (`public_note_native`) | `v_study` só fr/zh; tradução sempre `'pt-BR'` | Só cartão LEGADO (sem `fields`): deck público de português sai com Field de idioma nulo e tradução rotulada `pt-BR` (com mídia, vira "incompatível") | Mapear `portugues → 'pt'` e tradução pelo curso (`en`). Cartões novos (com `fields`) não passam por aqui | Sim, sem DROP | Sim (`tests/fase-public-deck/run.sh`) |
| T9 | `shared/mural.js:20` e `:500` (`MURAL_LANG_DIR`, `muralClassroomURL`) | Só fr/zh; usa o site aberto, não o idioma da turma | Link de turma de português criado no `/fr` leva o aluno ao `/fr` | `MURAL_LANG_DIR` pelo registro e pelo idioma da turma | Não (front) | Sim |
| T10 | `shared/teacher-invites.js:26`, `:71` (`TINVITE_LANG_DIR`) | Só fr/zh | Mesmo caso de T9 nos links de convite | **Só listado** (outra sessão) | | |
| T11 | Banco de Revisão: motor gerado (`review-bank-agent/engine.generated.mjs`, origem `shared/flashcard-native-persistence.js:380-436`) | Tradução sempre `'pt-BR'` | Cartão gerado para aluno de português com `reference_language='en'` fica com o Field de tradução rotulado `pt-BR` | **Só listado** (Banco: outra sessão) | | |

### 2.3 Só estética ou atenção (não bloqueia)

| # | Arquivo:linha | O que supõe | Efeito | Correção | Mig. | Local |
|---|---|---|---|---|---|---|
| E1 | `class-calendar-feed/index.ts:38`, `:80` | `/pt/` existe | Enquanto o `/pt` não existir, o link das aulas de português na agenda dá 404 (vale hoje, se houver aula de português no feed) | Nenhuma (some com a E7) ou cair em `/` enquanto `pt.enabled=false` | Não; deploy | Sim |
| E2 | `notification-cron/index.ts:221` (`LESSON_VOCAB_MAP`) | Só fr/zh | Para o `pt`, "revisão atrasada" usa o caminho de segurança (só conta unidade concluída): avisa menos, nunca errado | Gerar a entrada `portugues` quando houver unidades (E7/E9) | Não; deploy | Sim |
| E3 | `tts-generate/tts_core.mjs` (regras de texto falado) | Regras só de `fr-FR` | Sem regra de pronúncia para o português (E5) | E5, não E6 | Não; deploy | Sim (`tests/tts-google`) |
| E4 | `049:399-401`, `050:48-50`, `051:234-236`, `076:116-118` e `'Meus Decks'` | Nome de Deck gravado em português | O cliente troca o rótulo da raiz do curso, de "Meus Decks" e de "Cartões da professora" por `t()` (`shared/deck-browser.js:127-133`); conferir na E7 se algum outro nome gravado aparece | Nenhuma agora | Não | Sim |
| E5 | Fuso: `073:345`, `092:22`, `102:211` (`America/Sao_Paulo`); cron em UTC | Aluno no Brasil | Para quem estuda português fora do Brasil, "semana", "hoje" e horário silencioso ficam deslocados | Decisão da dona (P5) | Talvez | Sim |
| E6 | `shared/admin-reports.js:51` | Rótulo só fr/zh | Report do `/pt` mostra a chave crua `portugues` | Acrescentar `portugues` | Não | Sim |
| E7 | `shared/admin-notifications.js:219-220` | Só fr/zh no "novo modelo" | A admin não cria modelo de português pela tela (a seed de Q4 resolve o começo) | Opções pelo registro | Não | Sim |
| E8 | Q-06: 15 CHECKs/validações com lista fixa de 3 valores (seção 1) | Lista fechada | Nada quebra para o `pt`; só para o 4º idioma | Regra aberta numa migration única. Tem `DROP CONSTRAINT`: **SQL Editor**. Recomendação Dv-4: adiar | Sim, SQL Editor | Sim |
| E9 | `fr/scripts/supabase_migrations/001_create_challenges_table.sql:19-24` | `challenges` sem coluna de idioma (tudo é francês) | Nada agora (Desafios do `pt` entram depois) | Coluna `language_app_key` ou prefixo no id quando os Desafios do `pt` começarem | Sim, depois | Sim |

### 2.4 Fora da E6 (front-end, para a E7; só registro)

`shared/flashcard-field-editor.js:47-50`, `:146-148`, `:985-987` (idiomas de Field e de TTS sem `pt`/`en`);
`shared/flashcard-native-persistence.js:380-436` (tradução `pt-BR` fixa); `shared/profile-placeholders.js:75`, `:141`;
`shared/my-flashcards.js:72-75`, `:419`; `shared/leaderboard.js:351` e `shared/admin-analytics.js:828`, `:1030`
(só idiomas `enabled`, o `pt` aparece quando for habilitado); `shared/admin-analytics.js:490`.

## 3. Lista mínima para o `pt` existir no servidor

O que é grátis e o que é Premium: tudo desta etapa é grátis (avisos, painel da professora, Amigos). Nada novo é Premium.

### 3.1 Indispensável (antes da E7)

1. **Migration `NNN_pt_server_minimum`** (próximo número livre, hoje 104; conferir na hora), sem DROP/DELETE, aplicável pela
   ferramenta MCP:
   - `_progress_block(jsonb, text)` (pura, `immutable`, sem `security definer`);
   - `get_teacher_student_metrics` (Q2) e `get_teacher_student_deck_counts` (Q2) com o bloco certo; mesma assinatura e grants;
   - `_friends_notify` e `_friends_notify_msg` (Q3) sem a lista fixa.
   Para as contas de hoje (só chaves `frances`/`mandarim`) o resultado tem de ser idêntico: provar com hash antes e depois.
2. **`notification-cron`** (deploy): Q1 (`LANGUAGES` com `portugues`) e T5 (lembrete de badge pelo idioma principal).
   Sem modelo de `portugues` isso não manda nada (só grava `notification_events`), então pode ir antes da seed.

### 3.2 Antes de abrir o `/pt` para alunos

3. **Migration de seed dos modelos `en` de `portugues`** (Q4, só INSERT): Q-17, começar por `streak_at_risk`,
   `study_goal_remaining`, `user_inactive_*` (sino) e `user_inactive_9/15/20/30` (e-mail); depois `review_overdue`, XP,
   conquista, missões e ranking; `student_inactive_alert` depende de P1. Texto com nível de confiança e revisão da dona.
4. **T1** (sem cair no português para quem usa o site em inglês): deploy do cron + `shared/notifications.js`. Depende de P2.
5. **T2** (Mural no idioma de quem recebe): migration pelo **SQL Editor** (tem `DELETE`).
6. **T6** (`report-reply-send`, deploy) e **T7** (modelos do Supabase Auth, colados pela dona).
7. **T4** conforme a resposta de P1.

### 3.3 Pode esperar

T8 (cartão legado em deck público), T9 (link de turma), E1, E2 (com o conteúdo), E3 (E5), E5 (fuso), E6, E7,
E8 (Q-06, regra aberta, Dv-4), E9 (Desafios do `pt`). Q5, T3, T10 e T11 ficam com a outra sessão.

## 4. Ordem segura

1. **Só leitura ao vivo** (antes de escrever qualquer SQL): `get_project` e `list_migrations` no Staging e na produção;
   quantos `teacher_students` ativos em `portugues`; quantas linhas `en` de `notification_templates` estão `active`;
   se já existe algum bloco `portugues*` em `progress.data` (esperado: zero); quantas aulas de português no feed de agenda.
2. **Local, sem rede**: escrever a migration 3.1, rodar os testes da seção 5, comparar o resultado das RPCs para contas
   só fr/zh antes e depois (devem ser iguais).
3. **Staging**: aplicar a migration 3.1 pela MCP; conferir objetos, `security definer`, `search_path`, grants; deploy da
   `notification-cron` no Staging e uma chamada de teste.
4. **Produção**: só com a autorização da dona NESSA etapa; mesma migration pela MCP; deploy da `notification-cron`;
   registrar número → versão gravada em `docs/historico/` e o deploy feito (regra: Edge Function só muda após deploy).
5. Seed de modelos (3.2, item 3) depois de a dona aprovar os textos: Staging, depois produção.
6. Mural (3.2, item 5): `docs/rollout-sql/NNN_sql_editor.sql` para a dona colar no SQL Editor, Staging antes; registro à mão.

Desfazer a 3.1: reaplicar as definições de 059, 078 e 102 (são `create or replace` com a mesma assinatura) e o deploy
anterior da `notification-cron`.

## 5. Testes possíveis sem rede

| Teste | Como | Cobre |
|---|---|---|
| RPCs do painel com `portugues@en` | Postgres local (`/tmp/pg`, porta 54329, `tests/fase-identity/build_db.sh` + migrations até a nova), transação + `ROLLBACK`; contas fictícias com blocos `frances`, `frances@en`, `portugues@en`, vínculo ativo em `portugues` | Q2; igualdade para contas só fr/zh (hash antes e depois) |
| Amigos no `/pt` | `tests/amigos-dupla/run.sh` + caso novo: conta só com `portugues@en` recebe a linha `portugues` | Q3 |
| Seed de modelos | Contagem por `(event_type, channel, language_app_key, ui_language)`; nenhum `pt-BR` para `portugues` | Q4 |
| Cron | Node, no molde de `tests/curso-progresso/test_cron_account.js`: conta só `portugues@en` gera eventos em `portugues`; conta fr+pt manda os avisos da conta uma vez só; `pickFromPool` com `en` nunca devolve `pt-BR` (stub de Supabase) | Q1, T1, T5 |
| Mural em inglês | `tests/mural/run.sh` + casos com `_meta.uiLanguage='en'` | T2 |
| `report-reply-send` | Função pura do rodapé/nome do curso em Node | T6 |
| TTS | `tests/tts-google` (já existe) | E3 |

## 6. Perguntas para a dona

- **P1.** Avisos sobre alunos de português PARA a professora (aluno sumido, aluno postou no mural, convite aceito): devem
  aparecer no sino do `/fr`, onde você trabalha, em vez do `/pt` (que é só em inglês)? Sugestão: sim, no idioma/site em que a
  professora estuda ou usa o painel.
- **P2.** Quem usa o site em inglês e não tem modelo de aviso em inglês ativo: hoje recebe o aviso em português. Posso trocar
  para "sem modelo em inglês, sem aviso", valendo também para francês e chinês?
- **P3.** Avisos do curso de português (Q-17): começar com sequência em risco, meta do dia e reengajamento (sino + e-mail),
  certo? Entram ativos logo ou inativos até a sua revisão? Eu rascunho em inglês e você revisa?
- **P4.** Avisos de Amigos: gravar só nos idiomas que a pessoa estuda (recomendado) ou em todos os idiomas?
- **P5.** Para alunos de português fora do Brasil: "hoje", "semana" e horário silencioso continuam pelo horário de Brasília?
- **P6.** E-mails de cadastro/senha (Supabase Auth) em inglês para quem usa o site em inglês: aceita um modelo com condição
  por idioma, que você cola no painel do Supabase?
- **P7.** Q-06 (regra aberta nos CHECKs): confirma adiar até o 4º idioma, já que `portugues` passa em todos (Dv-4)?

## 7. Implementação do mínimo (2026-10-15, branch `e6-pt-servidor-minimo`, NADA aplicado nem publicado)

Autorizado pela dona: Q1, Q2, Q3, T1 (decisão: site em inglês sem modelo em inglês ativo = sem aviso, para fr, zh e pt) e T5.

- `shared/supabase_migrations/105_pt_server_minimum.sql` (só `create or replace`, sem DROP/DELETE, aplicável pela MCP):
  `_progress_block(data, idioma, idioma_do_site?)` com a regra de `blockForLanguage` (cron) e `blockFor`
  (`shared/course-storage.js`); `get_teacher_student_metrics` e `get_teacher_student_deck_counts` leem o bloco por ela;
  `_studied_languages(conta)` + `_friends_notify`/`_friends_notify_msg` gravam o aviso de Amigos só nos idiomas com bloco
  (conta sem bloco: 1 linha, no idioma atual ou em `frances`).
- `notification-cron` (repo e `docs/deploy/notification-cron-para-colar-no-painel.ts`, que vira a v25 quando colado):
  `portugues` em `LANGUAGES`; `templateLangsFor` (en só en, pt-BR só pt-BR, também no e-mail); lembrete de badge pelo idioma
  principal. A cópia do painel ganhou também os 3 textos em inglês que já estavam no repo e faltavam na v24 (rodapé do e-mail,
  título do push, alerta da professora).
- `shared/notifications.js` (`pickNotificationTemplate`): mesma regra T1 no cliente (vale depois do merge na `main`).
- Testes: `tests/pt-servidor/run.sh` (SQL com a 105 aplicada dentro da transação + ROLLBACK, comparação antes x depois; e o
  Node `test_cron_pt.js`, que roda o handler real do cron com banco falso nos dois arquivos e confere os mesmos casos de
  `progress_block_cases.json` contra o cron e o `course-storage.js`).
- Achado: o sino (`fetchRecentNotifications`) NÃO filtra por idioma: mostra todas as linhas da conta. Por isso o aviso de
  Amigos gravado em 2 idiomas já aparecia 2 vezes para quem tem 2 blocos (antes da 105: para TODO mundo). A 105 reduz isso
  a 1 linha para quem estuda 1 idioma; quem estuda 2 ainda vê 2. Correção possível (não feita, decisão da dona): 1 linha só
  no idioma principal, ou o sino agrupar linhas iguais.
- Depende de Q4 (modelos `en` de `portugues`): sem eles o cron só grava `notification_events` para o português.
