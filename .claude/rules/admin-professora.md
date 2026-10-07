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

- Tudo do Painel de Admin é gate-checked por `isAdminUser()`; Admin Mode ON/OFF decide o plano efetivo da autora
  na interface (`effectivePlanTier()`).
- Vínculo professora↔aluno é por idioma (`teacher_students`, `status='active'`); remover vínculo nunca apaga progresso.
- Leitura de progresso de outra conta só por RPC `security definer` com checagem de vínculo (059, 070).
- Decisão de produto: um aluno tem no máximo 1 professora por idioma (ainda não imposto no banco; se impor, índice
  único parcial em `teacher_students (student_id, language_app_key) where status='active'`).
- Telas com seleção de alunos: seleção pode ficar vazia, filtro por idioma ativo, busca por nome/@usuário.
- Notificações: categorias em `notification_rules`; novas categorias precisam decidir se aparecem na matriz de
  Configurações > Notificações.
