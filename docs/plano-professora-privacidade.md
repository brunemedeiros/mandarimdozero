# Plano: papel Professora, perfil privado e Analytics (decisões da autora, 2026-10-07)

Status: decisões tomadas, implementação NÃO iniciada. Cada etapa só começa com autorização da autora.
Visão de produto: no futuro, vender assinatura também para professoras de idiomas (Premium + funções de
professora), e o site virar quase um "Google Classroom" para a turma de cada professora.

## Ordem das etapas
1. **Papel Professora** (separar Admin x Professora). Vem primeiro: Fase K e o perfil privado dependem dele.
2. **Fase K final** (Analytics do aluno por Deck, botão no perfil, cópias de Deck público): `docs/K-analytics-contrato.md`.
3. **Perfil privado**.
4. **Mural da professora** (recado para a turma).

## 1. Papel Professora
Hoje: `profiles.role` já aceita `user | teacher | admin` (migrations 024/042), protegido contra autoalteração
(063/066). Mas as permissões de professora estão presas ao e-mail da autora (`auth.jwt() ->> 'email'`) em 14
migrations (020, 024, 025, 026, 049, 050, 063, 066, entre outras); dar o papel a outra pessoa não liberaria nada.

Decidido:
- Menu **Admin** (desligável pelo Admin Mode): Badges, Analytics, Notificações, Reports, Premium, Tags.
- Menu **Professora** (não desligável, só para `role = teacher`): Alunos, Flashcards, Aulas, Material de apoio.
- A admin concede/remove o papel Professora numa tela própria, como já concede Premium e vínculo de Aluno.
- A autora tem os dois papéis; o acesso dela não muda.
- Banco: trocar "é o e-mail da autora" por "tem papel Professora" nas policies/RPCs de professora e restringir cada
  professora aos próprios alunos e cartões (`teacher_id = auth.uid()`). Migrations com `DROP POLICY` vão pelo
  SQL Editor da autora (skill `migration-supabase`), Staging antes da produção.
- **Professora é Premium automaticamente** (no servidor: Premium = `plan_tier = 'premium'` ou `role = 'teacher'`).
- Regra "1 professora por aluno por idioma" passa a ser imposta no banco (índice único parcial), já que haverá
  várias professoras.
- Analytics do aluno segue o papel Professora, não o Admin Mode.

Ideias aprovadas pela autora para depois desta etapa ("amei"): várias professoras com turmas separadas; selo
"Professora" e "Decks da professora" no perfil público; convite de aluno por link/código; mural para a turma
(etapa 4, prioridade); admin de suporte sem acesso a dados pedagógicos.

## 3. Perfil privado
Hoje (chave "Perfil público", `profiles.public_profile`, padrão true desde a 041): privado esconde a página
`#/user/<nome>` (XP, sequência, progresso, cartões, tags) e os Decks públicos (invisíveis e não copiáveis). Não
esconde ranking (`weekly_xp` tem leitura pública, até `anon`), busca de amigos nem nome/@/avatar.

Decidido:
| Onde | Conta privada |
|---|---|
| Página `#/user/<nome>` | Só nome, @ e avatar + "Este perfil é privado"; amigos veem tudo |
| Ranking geral | **Continua aparecendo** para quem está logado; a conta pode se esconder só de visitantes sem login |
| XP e sequência | Continuam visíveis (restringir a amigos fica para quando houver mais usuários) |
| Busca de amigos | Só aparece para quem digitar o @ exato |
| Decks | Cada Deck pessoal tem a própria chave. Conta pública: Deck **nasce público** (botão "Tornar privado"). Conta privada: Deck nasce privado (botão "Tornar público"). Decidido em 2026-10-07 |
| Professora com vínculo | **Vê tudo; a privacidade nunca vale para a professora do aluno** |
- Contas novas continuam nascendo públicas.
- Grátis x Premium: perfil privado é grátis para todos.
- Futuro (com mais usuários): tirar a conta privada do ranking geral e mostrar XP/sequência só a amigos.

## Etapa 1 -- auditoria (2026-10-07, só leitura; repo + produção ao vivo)
Produção: 18 policies + 3 funções usam o e-mail da autora (`ensure_user_decks`, `profiles_protect_plan_role`,
`profiles_protect_plan_role_insert`; policies de badge_*, challenges, decks_admin_write, notification_*, reports,
teacher_flashcards_admin_write, teacher_students_admin_write, usage_events). profiles: 1 `admin` (a autora, também a
única `premium`), 26 `user`, nenhum `teacher`.

Já escopado por `teacher_id = auth.uid()` (sem checar papel): leitura de vínculos/cartões da professora, decks
`kind='teacher'`, `teacher_class_logs`, `teacher_support_materials`, buckets `flashcard-media`/`support-materials`,
RPCs 059/070/053 e triggers de vínculo ativo (055).

Achados:
- **Furo atual**: `teacher_class_logs_owner_all` e `teacher_support_materials_teacher_all` (confirmado ao vivo) só
  checam `teacher_id = auth.uid()`; qualquer conta logada pode gravar registro/material para qualquer `student_id`,
  sem vínculo, e o aluno passa a ver o material. Corrigir exigindo papel Professora + vínculo ativo.
- **Conceder Premium pela aba ⭐ Premium provavelmente não funciona**: `setPlanTier` faz UPDATE em profiles de outra
  conta e só existe `profiles_owner_update`; deve afetar 0 linhas sem erro. Conferir no Staging; trocar por RPC.
- `ensure_user_decks` bloqueia quem não é a autora: uma professora nova falharia ao criar os Decks da aluna.
- `profiles_public_read` (anon) expõe `role`, `plan_tier`, `admin_mode`.
- `assignStudentToTeacher` dá o badge "Aluno/a da Prof. Brune" (admin-only); outra professora falharia em silêncio.
- TTS: só a admin é isenta da cota mensal (Edge Function `tts-generate`).
- "1 professora por aluno por idioma" não existe no banco (só `unique (teacher_id, student_id, language_app_key)`).

Plano de migrations (proposto):
- 075 (sem DROP, ferramenta): `is_admin()` (e-mail OU role admin, e-mail fica de reserva), `is_teacher()` (role
  teacher ou admin), `has_premium(uid)` (premium OU teacher/admin); RPCs `admin_set_role`, `admin_set_plan_tier`.
- 076 (com DROP POLICY, SQL Editor da autora): policies de teacher_students/teacher_flashcards/class_logs/materials
  com `is_teacher()` + vínculo ativo; `ensure_user_decks` liberado para professora com vínculo; 063/066 via
  `is_admin()`; as 5 checagens Premium de Deck público via `has_premium()`.
- 077: índice único parcial `teacher_students (student_id, language_app_key) where status='active'`.
- JS: menu Professora (Alunos, Flashcards, Aulas, Material de apoio, abre em Alunos) separado do menu Admin;
  `isTeacherUser()`; `effectivePlanTier` = premium para professora; aba Admin para conceder Professora.

## Etapa 1 -- decisões da autora sobre a auditoria (2026-10-07)
- Corrigir o furo de Aulas/Material de apoio (papel Professora + vínculo ativo). Hoje: "📚 Material de apoio" aparece
  no menu de toda conta logada (lista vazia se não houver material); "📝 Aulas" é só da professora (aluno não lê).
  Proposto: Material de apoio só aparece para quem tem vínculo ativo.
- A autora fica com **Admin E Professora** ao mesmo tempo (papéis acumuláveis, não um valor único).
- Decks da aluna: só a professora **vinculada** à aluna pode criá-los (além da admin).
- Badge ao vincular: "Aluno/a do/a Prof. {nome da professora}". Futuro: destacar o badge da autora.
- TTS: admin isenta da cota; professora pode ter cota maior que o Premium (valor a decidir).
- Vínculo por **convite**: a professora convida, o aluno aceita.
- "1 professora por aluno por idioma" = um aluno tem no máximo 1 professora ativa em cada idioma; a professora pode
  ter quantos alunos quiser.
- **Matriz de permissões**: a admin concede/revoga permissões por tipo de conta (user free, premium basic, premium pro,
  student, teacher) na aba ⭐ Premium (que também concede/remove Professora; separar depois se crescer). Uma conta
  com vários tipos fica com a soma das permissões (vale sempre a mais generosa; limites numéricos = o maior).
  Professora é um Premium com mais permissões (assinatura mais cara no futuro).

## Etapa 1 -- modelo de papéis (decisões da autora, 2026-10-07, 2ª rodada)
- **Aulas e Material de apoio iguais**: o aluno com vínculo ativo **lê** os registros de aula ("O que aconteceu nesta
  aula") e os materiais dele; só a professora edita. Sem vínculo ativo, não aparece. Material de apoio só aparece no
  menu quando houver pelo menos 1 material.
- **Papéis somados**: toda conta tem Usuário. Vínculo ativo acrescenta Aluno (desvincular volta a só Usuário).
  Professora é concedida pela admin. Assinatura concede Premium. Permissões = soma dos papéis (vale a mais generosa).
- "Premium" continua sendo o nome geral (quem não é grátis); Basic e Pro são as duas faixas dentro dele.

## Migration 075 (papéis somados + matriz de permissões) -- 2026-10-08
- Arquivo `shared/supabase_migrations/075_account_roles_and_permissions.sql`; testes locais
  `tests/papeis-permissoes/run_local.sh` (29/29, inclui reaplicar = idempotente).
- Decisão da autora: alunos ganham só o nível Premium Basic (upsell para Pro); Professora também é plano
  (assinatura ou concessão, como o Premium); Premium de hoje vira Premium Basic.
- **Staging: aplicada** (versão `20261008011037`). Verificado: 12 permissões, 60 linhas na matriz, autora com
  admin+teacher+premium_basic, 14 funções definer com `search_path=public`, internas sem EXECUTE, nenhuma
  executável por anon; hash de profiles igual antes/depois; simulação com JWT: autora admin/professora/TTS
  ilimitado, conta grátis só `user` e limite 20.
- Confirmado no Staging: o botão atual de dar Premium (`setPlanTier`) afeta 0 linhas (falha silenciosa).
- Produção: NÃO aplicada (aguarda autorização).
- Produção (2026-10-08): `apply_migration` estourou o tempo 2 vezes (nada aplicado, conferido: sem tabelas novas,
  hash de profiles igual). Provável bloqueio da ferramenta por haver `delete` no corpo de `admin_revoke_role`.
  Caminho: SQL Editor da autora com `docs/rollout-sql/075_sql_editor.sql`.
