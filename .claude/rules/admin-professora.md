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
