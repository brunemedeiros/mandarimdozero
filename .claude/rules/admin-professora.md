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
- Aba **Alunos** (Design System novo): quadro geral com situação (Em dia 0 a 3 dias, Atenção 4 a 6, Parado 7+) e ficha em página própria; peças HTML em `shared/teacher-students-ui.js`, dados e eventos em `shared/admin-students.js`. Vincular direto (janela) é só da admin; a professora convida pela seção "Convidar aluno" (`shared/teacher-invites.js`, DS: busca, link, pendentes; confirmações pelo `PainelUI.confirmar`). Ficha tem Decks do aluno em árvore; `fetchStudentPanelData`/`renderStudentPanelHTML` alimentam o Analytics do perfil público. Remover vínculo usa `PainelUI.confirmar`. Testes: `tests/painel-alunos/`, `tests/k10/`.
- Aba **Aulas** (Design System novo): lista por mês + formulário ao lado; aula em grupo = 1 linha por aluno no banco, agrupadas na tela por conteúdo e instante de criação (`tclGroupLogs`); editar/apagar vale para o grupo. Presença (rótulos coloridos do Notion, `.att-pill` do site), Competências e aula de turma (bloco Turmas na janela de pessoas); bloco "Revisar do Notion" ainda com visual antigo. HTML em `shared/teacher-classlogs-ui.js`, dados e eventos em `shared/admin-class-logs.js`. Testes: `tests/painel-aulas/`.
- Aba **Cartões** (Design System novo): abas Criar cartão / Cartões criados; o Banco de Revisão é a sub-navegação "Cartões | Banco de Revisão" do painel e mantém o visual antigo. HTML em `shared/teacher-cards-ui.js`, dados e eventos em `shared/admin-flashcards.js` (ganchos `data-*` preservados; testes fase-g/h/i usam `tests/painel-cartoes/helpers.js`). Testes: `tests/painel-cartoes/`.
- Aba **Material de apoio** (Design System novo): lista por mês de envio + formulário ao lado; envio a várias pessoas = 1 linha por aluno, agrupadas na tela (`tmtGroupMaterials`); editar/apagar vale para o envio todo; editar não troca o arquivo; link só vira href se for http(s) (também na vista da aluna). HTML em `shared/teacher-materials-ui.js`, dados e eventos em `shared/admin-support-materials.js`. Testes: `tests/painel-materiais/`.
- **Painel de Admin** (Design System novo, 5 abas): navegação em `shared/admin-panel.js`; cada aba tem peças de HTML `shared/admin-<aba>-ui.js` (dado -> string, testadas em Node) e controlador `shared/admin-<aba>.js` (dados, eventos delegados). Analytics ainda divide cálculos em `admin-analytics-calc.js`. Janelas são `<dialog class="p-dialogo">` montadas pela tela (nada de modais no index.html); apagar/tirar acesso/enviar e-mail usam `PainelUI.confirmar`. Admin Mode só no botão 🔒 do topo. Manter `data-admin-section`, `#view-admin-badges` e `isAdminUser` (testes antigos). Testes: `tests/painel-admin/` (harness com banco em memória). Analytics busca em páginas de 1000 (teto 50000 eventos, 10000 técnicos) e Reports tem teto de 200: os dois avisam na tela quando cortam.
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
- Rotina automática do Banco (`supabase/functions/review-bank-agent`, migrations 089, 090 e 097 a 100): a tarefa da madrugada só INSERE itens/recaps de alunos
  com `agent_managed = true` e gera cartões pelo mesmo motor do site; `engine.generated.mjs` é GERADO (`node scripts/build-review-bank-agent.js`,
  nunca editar à mão). Mudou `shared/review-bank*.js` ou o motor de cartões: regerar, rodar `tests/banco-revisao/test_agent_core.js`, novo deploy.
  Doc: `docs/historico/18-rotina-automatica-banco.md`.
