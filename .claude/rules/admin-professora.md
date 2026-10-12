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
- Aba **Alunos** (Design System novo): quadro geral com situação (Em dia 0 a 3 dias, Atenção 4 a 6, Parado 7+) e ficha em página própria; peças HTML em `shared/teacher-students-ui.js`, dados e eventos em `shared/admin-students.js`. Vincular (janela) é só da admin; remover vínculo usa `PainelUI.confirmar`. Testes: `tests/painel-alunos/`.
- Aba **Aulas** (Design System novo): lista por mês + formulário ao lado; aula em grupo = 1 linha por aluno no banco, agrupadas na tela por conteúdo e instante de criação (`tclGroupLogs`); editar/apagar vale para o grupo. HTML em `shared/teacher-classlogs-ui.js`, dados e eventos em `shared/admin-class-logs.js`. Testes: `tests/painel-aulas/`.
- Visual dos painéis: classe `.panel-view` (seletor `.deck-topbar`, títulos `.panel-h`/`.section-label` sem caixa-alta).
- Vínculo professora↔aluno é por idioma (`teacher_students`, `status='active'`); remover vínculo nunca apaga progresso.
- Leitura de progresso de outra conta só por RPC `security definer` com checagem de vínculo (059, 070).
- Decisão de produto: um aluno tem no máximo 1 professora por idioma (ainda não imposto no banco; se impor, índice
  único parcial em `teacher_students (student_id, language_app_key) where status='active'`).
- Telas com seleção de alunos: seleção pode ficar vazia, filtro por idioma ativo, busca por nome/@usuário.
- Notificações: categorias em `notification_rules`; novas categorias precisam decidir se aparecem na matriz de
  Configurações > Notificações.
