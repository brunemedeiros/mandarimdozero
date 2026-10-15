---
paths:
  - "shared/admin-*.js"
  - "shared/student-metrics.js"
  - "shared/teacher-*.js"
  - "shared/support-materials-view.js"
  - "shared/friends.js"
  - "shared/leaderboard.js"
  - "shared/notification*.js"
---

# Painel de Admin, professora/alunos, social

Histórico: `docs/historico/02-*`, `03-*`, `11-*`.

- Dois painéis: **Admin** (`#view-admin-badges`: Badges, Analytics, Notificações, Reports, Planos; sem Tags, que se editam no cartão/Deck) gate
  `isAdminUser()` + Admin Mode; **Professora** (`#view-teacher-panel`, `shared/teacher-panel.js`: Alunos, Cartões, Aulas,
  Material) gate `isTeacherUser()` (papel, `shared/permissions.js` + RPC `my_permissions`), nunca o Admin Mode.
- Papéis/permissões vêm do banco (075/076: `account_roles`, `role_permissions`); a tela só esconde, quem barra é RLS/RPC.
  Dar/tirar plano só pelas RPCs `admin_grant_role`/`admin_revoke_role` (UPDATE direto em `profiles.plan_tier` falha).
- Visual dos painéis: classe `.panel-view` (seletor `.deck-topbar`, títulos `.panel-h`/`.section-label` sem caixa-alta).
- Vínculo professora↔aluno é por idioma (`teacher_students`, `status='active'`); remover vínculo nunca apaga progresso.
- Leitura de progresso de outra conta só por RPC `security definer` com checagem de vínculo (059, 070).
- Um aluno tem no máximo 1 professora ativa por idioma (índice único parcial da 077). Professora convida (busca ou
  link, `shared/teacher-invites.js`) e o aluno aceita; só a admin vincula direto; o aluno não sai sozinho.
- Badge de aluno é por professora (`badge_catalog.teacher_id`) e acompanha o vínculo ativo pelo trigger da 077:
  nunca dar/tirar esse badge pelo cliente.
- Telas com seleção de alunos: seleção pode ficar vazia, filtro por idioma ativo, busca por nome/@usuário.
- Notificações: categorias em `notification_rules`; novas categorias precisam decidir se aparecem na matriz de
  Configurações > Notificações.
- Sino da professora (108, `shared/teacher-panel.js`): aviso sobre aluno = `notifications.audience='teacher'` (gatilho: categoria
  `supervisao` ou aba `teacher-mural`/`teacher-panel`), de qualquer idioma; o sino do topo filtra `audience<>'teacher'`.
  Aviso novo para a professora: frase nova também em `_teacher_notice_params` + chave `panel.tbell.ev.*`. Doc: `docs/historico/20-*`.
- Banco de Revisão (`shared/review-bank*.js`, permissão `review_bank` do plano Professora, migrations 081 a 086): aluno do Banco
  (`review_bank_students`) existe com ou sem conta; só `linked_student_id` (conta com vínculo ativo, mesmo idioma) gera cartão em
  "Cartões da professora". Aprovar = RPC `approve_review_bank_item` (atômica, 1 cartão por item); cortar arquiva, nunca apaga.
  Item sensível ou com "Para conferir" nunca vira cartão sozinho. Doc: `docs/historico/15-auditoria-banco-revisao.md`.
- Mural (087, `shared/mural.js`): turmas (`classrooms`) e murais individuais; tabelas sem policy, tudo por RPC `mural_*`.
  Aluno só vê com vínculo ativo; recado "só para um aluno" exige o aluno na turma. Anexos no bucket privado `mural`
  (`<professora>/<autor>/<arquivo>`), lidos por link assinado; apagar post devolve os caminhos e o app limpa o Storage.
- Aulas (094, `shared/teacher-class-logs.js`, `admin-class-logs.js`): Presença = rótulo da professora (`class_attendance_labels`,
  9 cores do Notion, seletor no próprio campo como no Notion, sem seção separada; arquivar em vez de apagar), Competências = lista fixa `CLASS_LOG_SKILLS`. Aula de turma = 1 linha com
  `classroom_id` e sem aluno; turma com aula registrada não se apaga (FK restrict). Aluno lê por `get_my_class_log_entries`.
- Calendário (101): horário opcional + duração + `time_zone` de quem registrou; mostrar sempre no fuso de quem vê
  (`classLogViewerSlot`). Grade do mês comum a professora e aluno: `classCalendarHTML` em `shared/teacher-class-logs.js`.
  Duração = seletor 30 min a 5h (`CLASS_LOG_DURATIONS`). Link de agenda (103): `class_calendar_feed` + Edge Function
  `class-calendar-feed` (verify_jwt false, token de 256 bits); o feed nunca leva Anotações nem Observações.
- Rotina automática do Banco (`supabase/functions/review-bank-agent`, migrations 089, 090 e 097 a 100): a tarefa da madrugada só INSERE itens/recaps de alunos
  com `agent_managed = true` e gera cartões pelo mesmo motor do site; `engine.generated.mjs` é GERADO (`node scripts/build-review-bank-agent.js`,
  nunca editar à mão). Mudou `shared/review-bank*.js` ou o motor de cartões: regerar, rodar `tests/banco-revisao/test_agent_core.js`, novo deploy.
  Doc: `docs/historico/18-rotina-automatica-banco.md`.
