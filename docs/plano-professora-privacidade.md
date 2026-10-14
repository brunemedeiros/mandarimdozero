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
- Produção (2026-10-08): `apply_migration` estourou o tempo 2 vezes (nada aplicado, conferido: sem tabelas novas,
  hash de profiles igual). Provável bloqueio da ferramenta por haver `delete` no corpo de `admin_revoke_role`.
  Caminho: SQL Editor da autora com `docs/rollout-sql/075_sql_editor.sql`.
- **Produção: aplicada pela autora no SQL Editor em 2026-10-08** (não aparece em `schema_migrations`). Verificado só
  leitura: 12 permissões, 60 linhas na matriz, autora com admin+premium_basic+teacher (3 linhas em account_roles),
  14 funções definer com `search_path=public`, nenhuma executável por anon, internas fechadas, 3 policies; hash de
  profiles igual ao de antes (`a2f735fe…`). Simulação com JWT (transação desfeita): autora admin/professora com
  cartões ilimitados; aluno vinculado = `user,student`, ilimitado; conta grátis = `user`, limite 20.

## Migration 076 (regras da professora pelo papel) -- 2026-10-08
- Arquivo `shared/supabase_migrations/076_teacher_role_policies.sql`, sem DROP/DELETE (ALTER POLICY + create or replace),
  para a ferramenta conseguir aplicar. Testes locais `tests/papeis-permissoes/run_local_076.sh` 25/25 (075: 29/29).
- Achado no Staging: `teacher_link_is_active()` não tem EXECUTE para authenticated (055); as policies passaram a
  conferir o vínculo com `exists` em teacher_students, colunas qualificadas pelo nome da tabela.
- Status de vínculo no banco: `active`, `invited`, `removed` (o convite já tem status previsto).
- Aulas: o aluno lê pela RPC `get_my_class_logs(lang)`, sem o campo "Anotações" (nota privada da professora).
- **Staging: aplicada** (`teacher_role_policies` + correção `teacher_role_policies_link_check`). Verificado com JWT
  simulado (transação desfeita): professora grava aula/material para aluna vinculada; aluna lê material e aula
  (sem anotações); depois de `removed` não lê mais; conta comum não grava material para ninguém; autopromoção
  bloqueada; estranho não cria Decks de outra conta; anon continua lendo Decks de curso.
- Staging: versões `20261008020957` (teacher_role_policies) e `20261008021111` (link_check).
- **Produção: aplicada pela ferramenta em 2026-10-12** (versão `20261012123457`, arquivo final já com a correção).
  Conferido antes: policies iguais às de 2026-10-08, os 2 materiais existentes são da autora com vínculo ativo.
  Verificado depois (transação desfeita): anon lê os 40 Decks de curso; aluna lê o material dela e os cartões da
  professora; conta comum não grava aula nem material para ninguém e não lê material alheio; autopromoção bloqueada;
  autora vê os 13 vínculos e grava aula para aluna vinculada.

## Etapa 1 -- telas (2026-10-12)
Entregue (pedido da autora: separar menus, melhorar a busca por @, aplicar a skill frontend-design nos painéis):
- **Painel de Admin** (Admin Mode): Badges, Analytics, Notificações, Reports, **Planos** (antiga ⭐ Premium). A aba Tags
  foi removida a pedido da autora (2026-10-12): Tags se editam no próprio cartão/Deck.
- **Painel da professora** (novo, papel Professora, não desliga com o Admin Mode): Alunos, Cartões, Aulas, Material
  de apoio. Item "Professora" na barra lateral e "🎓 Painel da professora" no menu do avatar. Link antigo para o
  Admin (ex.: notificação de supervisão com rota `admin-badges`) leva quem só é professora ao painel dela.
- **Planos**: busca por nome ou @ com sugestões enquanto digita (setas, Enter, Esc; quem começa com o termo vem
  primeiro); conta escolhida mostra interruptores Premium Basic / Premium Pro / Professora (RPCs da 075) e Aluno
  (só leitura, vem do vínculo). Tabela "O que cada plano libera" editável célula a célula (limite vazio = sem limite).
- **Aluno**: "📝 Minhas aulas" (novo, RPC `get_my_class_logs`, sem as notas privadas) e "📚 Material de apoio" só
  aparecem no menu com vínculo ativo e pelo menos 1 item.
- Professora que não é admin: não vê o formulário de vincular (aviso do convite que vem aí); desvincular marca
  `removed` (a admin continua apagando); vincular de novo reativa o registro `removed`.
- Notas da aula: o campo diz "Notas só suas, o aluno não vê". **Decidido pela autora (2026-10-12): ficam só para a professora.**
- Design (skill frontend-design, mesma linguagem da Revisão): seletor segmentado numa linha (sem emoji),
  sub-abas sublinhadas (Analytics), títulos de seção sem caixa-alta, botões do tamanho do conteúdo no computador,
  formulários com largura de leitura, links de seleção com estilo, "--" e "pra" fora de 62 textos dos painéis.
- Código: `shared/permissions.js`, `shared/teacher-panel.js` (novos), `shared/admin-premium.js` (reescrito),
  `admin-analytics.js` (troca de seção), gates em admin-students/flashcards/class-logs/support-materials, `roles.js`.
- Testes: `tests/painel-professora/test_playwright.js` 162/162 (fr/zh, claro/escuro, 1200/390); regressão:
  painel-alunos 48, plano-admin 26, fase-j 62 (bloco da aba Tags do Admin trocado por checagem de que ela saiu), fase-g 68, fase-h 68, fase-i 48, fase-k6 28, k5 18, k7 40, fase-f 50,
  deck-browser 206, amigos 158, revisao-proposta-a 58, i18n unit 2039/2039 (65 chaves da passada de design saem da
  comparação byte a byte, listadas em DESIGN_PASS_KEYS). `tests/i18n/test_playwright.js` falha no modal de limite
  de cartões também SEM esta entrega (pré-existente, conferido com git stash).
- Testes antigos que abriam Alunos/Cartões pelo Admin passaram a abrir pelo Painel da professora (mudança deliberada).
- Pendente: badge "Aluno/a do/a Prof. {nome}", convite de aluno, rota da notificação de supervisão na Edge Function
  (`notification-cron`, hoje 'admin-badges', funciona pelo redirecionamento; trocar exige deploy).

## Convite de aluno + badge por professora (2026-10-12)

Decisões da autora: convite bloqueado se o aluno já tem professora naquele idioma; vale 14 dias; **o aluno não sai
sozinho** (só a professora encerra o vínculo); **o badge some quando o vínculo acaba**; a admin continua vinculando
direto, as outras professoras só convidam; link de convite com cartão caprichado; limite de 30 convites por dia.

- **Migration 077** `teacher_invites_and_badges` (Staging `20261012182754`; produção `20261012184454`, 2026-10-12):
  `invited_at`/`responded_at` em `teacher_students`; índice único parcial "1 professora ativa por aluno por idioma";
  `badge_catalog.teacher_id` (o `student` da autora vira o badge dela); tabelas `teacher_invite_codes` (link por
  professora e idioma, código de 10 letras/números) e `teacher_invite_log` (limite diário), sem acesso direto;
  trigger em `teacher_students` que dá o badge da professora quando o vínculo fica ativo e tira quando não sobra
  vínculo ativo com ela (vale também para o vínculo direto da admin e para apagar o vínculo); RPCs
  `teacher_invite_student`, `my_teacher_invites`, `respond_teacher_invite`, `teacher_invite_link`,
  `invite_code_info` (também sem login) e `accept_invite_code`. A policy `teacher_students_teacher_update` agora só
  deixa a professora gravar `removed` (antes aceitava `invited` direto, sem limite e sem aviso).
  Badge de professora nova: "Aluno/a do/a Prof. {primeiro nome}", 🎓, criado no primeiro aceite.
  Avisos no sino: aluno (`sistema`, abre a Trilha); professora (`supervisao`: aceitou, recusou, entrou pelo link).
- **Telas**: Painel da professora > Alunos ganhou "Convidar aluno" (idioma em chips; busca por nome/@ igual à aba
  Planos; link com Copiar, Mandar no WhatsApp e Gerar outro link), "Convites pendentes" (vence em N dias, Cancelar,
  Reenviar o vencido) e, só para a admin, "Vincular direto" recolhido. Aluno: faixa no topo da Trilha com o convite
  e o cartão (capa colorida, foto da professora, o que muda, Aceitar/Recusar). Link `?convite=` funciona sem login
  (cartão com "Entrar para aceitar"; o código fica guardado e o cartão volta depois do login).
  Código: `shared/teacher-invites.js` (novo), `admin-students.js`, `roles.js` (sem o insert do badge pelo cliente;
  `fetchMyStudents` só ativos, `fetchMyPendingInvites`), `auth.js`, CSS `.tinv-*` nos dois `index.html`.
- **Grátis x Premium**: convidar é do plano Professora; aceitar é grátis para qualquer conta.
- **Testes**: `tests/papeis-permissoes/run_local_077.sh` 47/47 (Postgres local, 077 aplicada 2x); Staging ponta a
  ponta dentro de transação desfeita (convite, aceite, badge, link já aceito, desvínculo tira badge);
  `tests/painel-professora/test_playwright.js` 277/277; regressão: fase-f 50, fase-g 68+134, fase-h 68+78, fase-i 48,
  fase-k6 28, painel-alunos 48, deck-browser 206, revisao-ajustes 48, revisao-proposta-a 58, i18n unit 2039/2039,
  papeis 076 25/25. `tests/painel-alunos/test_student_panel_unit.js` já quebrava antes (`t` ausente no VM).
- Atenção: outra conversa aplicou `course_keys_and_account_streak_readers` no Staging hoje sem arquivo na `main`;
  se ela também usar o número 077, renumerar a dela (esta já está no repo).

## Etapa 3 (perfil privado) -- auditoria (2026-10-12, só leitura; repo + produção ao vivo)

Produção: 27 perfis, **todos públicos**; 14 Decks pessoais, **nenhum público**; 0 amizades. Nada muda para quem já
existe ao ligar as regras novas.

O que respeita `public_profile` hoje: `get_public_profile_stats` (037), `list_public_decks_for_user`, `get_public_deck`,
`get_public_deck_notes`, `copy_public_flashcard` (061), `check_public_deck_duplicates` (062), manifest (068),
`copy_public_deck` (079). **Nenhuma tem exceção para amigos nem para a professora com vínculo.**

Furos em relação às decisões da tabela acima:
1. `profiles` tem leitura pública total (`profiles_public_read`, 001, inclusive anon). Expõe bio, país, plano, papel,
   admin_mode, exclude_own_activity e o próprio public_profile. Qualquer busca direta na tabela (Planos, convite de
   aluno) acha conta privada por pedaço do nome: a regra "só pelo @ exato" não se sustenta sem fechar a tabela.
2. `search_profiles_for_friends` (073) ignora a privacidade (busca por pedaço, 3 letras).
3. Página do perfil privado ainda mostra bio, badges (inclusive o da professora) e conquistas
   (`fetchPublicProfileByUsername` lê profiles/badge_grants/earned_badges direto). Decidido: só nome, @ e avatar.
4. `weekly_xp`, `badge_grants`, `earned_badges`, `badge_catalog`: leitura pública até para anon. Ranking geral
   aparece no modo convidado sem filtro.
5. Decks: `is_public default false`; o trigger `decks_public_guard` (061) impede o cliente de criar Deck já público
   (precisa de RPC/trigger no servidor que gere public_id/published_at). Publicar é grátis; abrir/copiar é Premium.
   Decks criados por cópia de Deck público, import Anki e `ensure_user_decks` também nascem privados.
6. Textos de publicar estão fixos em português (sem `t()`); subtítulo da chave do perfil fala de "cartões próprios"
   (seção desligada).
Sem teste hoje: stats `not_public`, tela do perfil privado, exceções de amigo/professora.

### Respostas da autora à auditoria (2026-10-12)
- Fechar a leitura aberta de `profiles` e abrir só o necessário por funções: **sim**.
- Deck nasce público em conta pública: **sim** (confirmado).
- País é dado sensível (fecha). **Plano e papel ficam públicos** (estimulam: Premium, Professora).
- Proposta nova da autora: **fechar o acesso de convidado** (site exige login, como o Duolingo), melhorar o login
  com confirmação por e-mail/SMS e deixar o modo sem login só para o sistema (testes e capturas de tela).
  Com isso a pergunta "ranking para visitante sem login" deixa de existir.
- Dados de produção: 1 Deck criado por usuário (1 conta), 13 "Meus Decks" automáticos, 7 cartões próprios de 2 contas.

### Decisões finais da Etapa 3 (2026-10-12)
| Tema | Decisão |
|---|---|
| Convidado | Acaba. Site exige login. Quem estudava como convidado perde o progresso local (decisão da autora). Modo sem login fica escondido, só para testes e prints (sem botão). |
| Cadastro por e-mail | Confirmação com **código** enviado por e-mail (Resend, profbrune.com.br). Google já vem confirmado. SMS fica para depois (custo). |
| Links compartilhados sem login (perfil, Deck público, convite) | Abrem um cartão de apresentação + "Entrar para ver"; conteúdo exige login. |
| `profiles` | Leitura aberta fechada; abre só o necessário por funções. País fecha. Plano e papel continuam públicos. |
| Página do perfil privado (estranhos) | Mostra nome, @, **badges e conquistas**. Esconde **foto, bio**, progresso e Decks. Amigos e a professora com vínculo veem tudo. |
| Busca | Conta privada só pelo @ exato na busca de amigos e no convite de aluno; a admin (Planos) vê todos. |
| Decks | Conta pública: Deck novo nasce público; conta privada: nasce privado. Deck vindo de cópia de Deck público ou de import Anki nasce privado. Botões "Tornar público"/"Tornar privado"; descrição/ícone/cor em "Editar página do Deck". O único Deck existente continua privado. |
| Conta vira privada | Decks públicos somem para estranhos e continuam visíveis para amigos e para a professora; voltam se a conta voltar a ser pública. |
| Ordem | 3a) fechar convidado + confirmação por código; 3b) perfil privado no banco e nas telas. |
| Grátis x Premium | Tudo grátis (login, confirmação, perfil privado, Tornar público/privado). Abrir/copiar Deck de outra pessoa continua Premium. |

### Etapa 3a -- login obrigatório (2026-10-12, branch; sem migration)
- Portão (`index.html`): sem "Continuar sem conta"; quem já tinha estudado como convidado vê o login; a flag
  `guest_mode` é zerada (o modo sem login só existe para testes, ligado direto no sessionStorage).
- Cadastro por e-mail: tela "Confirme seu e-mail" com código (6 a 10 dígitos), "Reenviar código" com espera de 60 s,
  "Usar outro e-mail"; login de conta não confirmada manda código novo e abre a mesma tela.
- Perfil aberto sem login: só nome e @ (foto só se o perfil for público) + "Entrar ou criar conta"; Deck público
  sem login já era só o cartão + botão. O botão guarda a rota e, depois do login, a pessoa volta ao perfil/Deck
  (`rememberRouteForLogin`/`consumePendingRouteAfterLogin`, `shared/router.js`).
- Passo manual: modelo do e-mail com `{{ .Token }}` e SMTP do Resend -- `docs/auth/confirmacao-por-codigo.md`.
- Testes: `tests/login-obrigatorio/test_playwright.js` 43/43; regressão i18n 2039, identity 22, k10 114,
  painel-professora 277, Deck público 152, amigos 158, placeholders 45.
- Importante: fechar o portão não fecha o banco (a chave anon é pública). Isso é a Etapa 3b.

### Etapa 3b -- perfil privado no banco e nas telas (2026-10-12)
- **Migration 080** `private_profile` (Staging aplicada; produção **só depois do PR publicado**, porque o site
  atual lê o próprio perfil com `select('*')`, que a 080 fecha. O site novo funciona com e sem a 080):
  `_profile_full_access` (própria conta, admin, amigo aceito, professora/aluno com vínculo ativo); policy
  `profiles_public_read` só para logado e só linhas públicas ou com acesso total; colunas `country`, `admin_mode`,
  `exclude_own_activity` fechadas para todos (a conta lê tudo por `get_my_profile`); plano e papel seguem públicos;
  RPCs `profile_cards`, `get_profile_card` (também sem login), `search_accounts`; `search_profiles_for_friends` com
  privada só pelo @ exato e sem foto; stats/Decks/Deck/cartões/checagem/mídia/cópia liberados para amigos e
  professora (troca feita no corpo que está no ar, por `pg_get_functiondef` + replace conferido); ranking, badges
  e conquistas fechados para anon; RPCs de perfil público perdem anon (menos o cartão do Deck e do perfil).
- **Site**: `fetchMyProfileRow`/`updateMyProfile`/`fetchProfileCards` (`shared/profile.js`); ranking, amizades e
  alunos usam `profile_cards`; convite usa `search_accounts`; página do perfil usa `get_profile_card`; Deck
  criado à mão nasce público em conta pública (`createPersonalDeck({source:'manual'})` + `publish_deck`), import
  do Anki e cópia nascem privados; caixa do Deck com "Tornar público"/"Tornar privado" e "Editar página do Deck";
  texto novo da chave "Perfil público".
- **Testes**: `tests/perfil-privado/run.sh` (080 33/33 + Deck público 87/48/20/9/72/9 + cópias 15/15 + amigos 63+18
  sobre o banco com a 080); `tests/perfil-privado/test_playwright.js` 16/16. Regressão de telas: painel-professora
  277, k10 114, login 52, deck-browser 206, Deck público 152, amigos 158, identity 22, placeholders 45,
  painel-alunos 48, fase-i 48, anki-destino 38, i18n 2036. Testes antigos ajustados de propósito: amigos (busca por
  nome de conta privada), Deck público SQL (visitante sem login) e Playwright ("Publicar" virou "🔒 Privado",
  campos em "Editar página do Deck"), deck-browser (rótulo do botão).

### Publicação (2026-10-12)
PR #304 mergeado e publicado (convite, Fase K final, login obrigatório, e-mails, perfil privado); em seguida a 080
foi aplicada na produção (`20261012210455`). Próxima etapa do plano: 4) mural.

## Etapa 4 (mural) -- respostas da autora (2026-10-12, antes da auditoria)

- **Destinatários**: a professora seleciona alunos (todos, vários ou um só). O recado aparece no mural de cada
  selecionado como se fosse só dele: o aluno não sabe quem mais recebeu.
- **Respostas**: o aluno pode responder e comentar.
- **Aviso**: o recado chega no sino e mostra um pill "+N" (mensagens novas) na aba Perfil e num submenu Aulas ou
  Mural, ou num menu próprio de Aluno (a decidir na auditoria).
- **Anexo**: sim.
- 2ª rodada (2026-10-12):
  - **Mural por aluno** (como no Google Classroom): cada aluno tem a sua aba Mural. Alunos de uma mesma **turma**
    podem compartilhar o mural: aí veem os recados e comentários uns dos outros, só dentro da turma.
  - **Anexo**: PDF e imagem (tamanho sugerido: até 10 MB por arquivo e até 5 por recado; imagem reduzida no
    navegador antes de subir).
  - **Editar/apagar**: a professora edita e apaga recados; o aluno só apaga o próprio comentário.
  - **Aviso**: só no sino + sinalizador no menu Perfil. Sem e-mail.
- Em aberto para a auditoria: o que é uma turma (quem cria, aluno em várias turmas), quem liga o compartilhamento
  (professora ou aluno), recado individual dentro de turma compartilhada, Grátis x Premium.
- 3ª rodada (2026-10-13), **turmas**:
  - A professora cria a turma e põe os alunos, ou manda o link da turma (o aluno entra ou cria a conta já dentro dela).
    Estar numa turma não dá permissão especial nenhuma.
  - O mural é da professora; o aluno é inserido nele. O aluno não compartilha nada.
  - Numa turma, o mural é um só para todos os alunos da turma (como no Google Classroom). Recado vai para a turma
    toda por padrão, com opção de escolher um aluno só: aí só ele vê.
  - **Grátis** para alunos vinculados a uma professora.

### Proposta de desenho (2026-10-13; aprovada, ver a entrega abaixo)

- Tabelas novas: `classrooms` (professora, idioma, nome, código do link), `classroom_members`, `mural_posts`
  (professora, turma OU aluno, texto, anexos, editado_em), `mural_comments` (autor, texto; apagar = do autor ou da
  professora), `mural_reads` (o que cada um já viu, para o "+N"). Tudo com RLS: vê quem é a professora dona, o aluno
  destinatário, ou membro ativo da turma.
- Anexos no Storage num bucket privado `mural` (PDF e imagem, 10 MB por arquivo, até 5 por recado), lidos por link
  temporário assinado.
- Sino: cada recado novo gera uma notificação in-app (sem e-mail), reaproveitando `shared/notifications.js`.
- Link da turma reaproveita o convite da 077: entrar pelo link cria o vínculo com a professora (se ainda não houver)
  e já põe o aluno na turma.
- Telas: Professora ganha "Turmas" no painel (criar, pôr alunos, link, mural da turma). Aluno: "Mural" dentro de
  "Minhas aulas", com o "+N" lá e no menu Perfil.
- 4ª rodada (2026-10-13): na professora, área própria "Mural" (não "Turmas") com seletor **Turmas | Alunos**: Turmas lista
  as turmas; Alunos lista só quem não está em turma (os nomes de todos ficam na aba Alunos). Aluno pode estar em mais
  de uma turma. Aluno também **cria** post (não só comenta). Concordou com o resto das sugestões (turma de um idioma,
  mural individual para aluno sem turma, desvincular tira das turmas). "Minhas aulas" fica no menu Mais.

### Entrega da Etapa 4 (2026-10-13, branch; migration 087)

- **087_mural.sql** (número 086 já usado por outras conversas): tabelas `classrooms`, `classroom_members`, `mural_posts`,
  `mural_comments`, `mural_seen`, todas sem policy (só RPCs security definer): `mural_list`, `mural_feed` (marca visto),
  `mural_create_post`, `mural_update_post` (só a professora, só o dela), `mural_delete_post` (autor ou professora),
  `mural_add_comment`, `mural_delete_comment`, `mural_save_classroom`, `mural_delete_classroom`,
  `mural_set_classroom_members`, `mural_classroom_link`, `classroom_code_info` (anon), `join_classroom_code` (cria o
  vínculo se faltar). Trigger tira o aluno das turmas ao desvincular. Bucket privado `mural` (PDF/JPEG/PNG/WebP, 10 MB)
  com policies `mural_files_*`. Sino: categoria `mural`, `action_tab` `my-mural` (aluno) e `teacher-mural` (abre o
  Painel da professora na seção Mural). Limites: 50 posts e 200 comentários por pessoa por dia, 50 turmas.
- **Telas** (`shared/mural.js`): Painel da professora > Mural; aluno: item "📌 Mural" no menu Mais, "+N" no Perfil (barra
  e sidebar) e no Mais, atalho no topo do Perfil; link `?turma=CODIGO` com cartão (com e sem login).
- **Grátis x Premium**: grátis para alunos vinculados; criar turma e postar como professora exige o papel Professora.
- **Testes**: `tests/mural/run.sh` 80/80 (banco local, 087 aplicada duas vezes); `tests/mural/test_playwright.js`
  235/235 (fr/zh, claro/escuro, 1200/390); regressão: painel-professora 277/277 (teste de "4 abas" virou 5),
  login 100/100, perfil-privado 16/16, k10 114/114, painel-alunos 48/48, amigos 158/158, banco-revisao 387/387;
  i18n unit sem falha nova (183 falhas já existiam na main).
- **Staging**: aplicadas pela ferramenta só as partes sem `DELETE` (`087_mural` tabelas+helpers, `087b_mural_list`,
  `087c_mural_feed`, `087d_mural_create_post`); o resto trava a ferramenta: a autora roda `docs/rollout-sql/087_sql_editor.sql`.

### Menu Aluno e revisão Mural x Aulas x Material (2026-10-13)

- Autora: item **"Aluno"** (como "Professora"), com o "+N" do mural; o Perfil deixa de mostrar o número.
  Feito: item "🎒 Aluno" na barra lateral e no menu Mais (só para quem tem professora ou já recebeu aula/material),
  painel com abas Mural | Aulas | Material de apoio; os 3 itens soltos saíram do menu Mais; abas antigas e avisos do sino
  (`my-mural`, `my-class-logs`, `support-materials`) caem no painel Aluno na seção certa.
- Revisão pedagógica e estrutural pedida pela autora (dados da produção em 2026-10-13: 0 aulas registradas, 2 materiais,
  13 vínculos ativos):
  - Mural = conversa e avisos (fluxo cronológico, duas vias, some com o tempo).
  - Aulas = diário estruturado de cada aula (data, tema, tarefa, observações; notas privadas da professora fora),
    só a professora escreve, por aluno; serve para rever o que foi visto e acompanhar a tarefa.
  - Material = biblioteca de consulta (título, descrição, link/arquivo), por aluno; o aluno volta nela.
  - Sobreposição: com anexo, um recado do Mural já entrega um material; um registro de aula pode virar recado. O risco de
    juntar tudo num fluxo é o material e a tarefa sumirem no meio da conversa (o Google Classroom separa Mural de
    Atividades por isso).
  - Proposta: tudo no Mural, com tipos de cartão (Recado, Aula, Material) e filtros "Tudo | Aulas | Materiais"; o "+N"
    passa a contar aula e material novos. Aguardando a escolha da autora (A manter 3 abas, B 2 abas, C tudo no Mural).

### 087 na produção e nova rodada (2026-10-14)

- 087 rodada pela autora no SQL Editor da produção; conferido: 24 funções, 5 tabelas sem acesso direto, bucket `mural`
  privado (10 MB, PDF/JPEG/PNG/WebP), 3 policies, trigger; teste real com professora e aluna da produção dentro de
  transação desfeita (turma, membros, post, link, +1, comentário, aluno não apaga post da professora): tudo ok, sem resíduo.
- Pedidos da autora:
  - Aulas com **visão de calendário**, como o "Calendário de Aulas" dela no Notion (campos lá: Data, Tópico, Aluno/a,
    Presença [aula dada, remarcação, faltou/cancelada, cancelada com antecedência, cancelada pela professora, remarcada],
    Pontualidade, Para a próxima aula, Competências, Uso da L1, Idioma).
  - Tirar os **Cartões da professora** do menu Revisão e criar a aba **Revisão** no Aluno, no formato do Banco de Revisão
    original (revisão do que foi trabalhado em aula, não é trilha nem flashcard comum).
  - Indecisa entre B (Mural | Aulas e materiais) e C (tudo no Mural com filtros).
- Proposta enviada: B + avisos automáticos no Mural ("nova aula registrada", "novo material") e Revisão como 4ª aba:
  **Mural | Aulas e materiais (Calendário | Lista + biblioteca) | Revisão**. Perguntas abertas no chat.

### Decisões da rodada de 2026-10-14 (reorganização do Aluno; nada codado ainda)

- Estrutura **B** com avisos automáticos no Mural: **Mural | Aulas e materiais | Revisão**.
- **"+N"**: o item Aluno soma tudo; dentro do Aluno cada aba tem o seu: Mural = mensagens novas, Revisão = cartões
  para revisar hoje.
- **Registro de aula** ganha **Presença** (cores: verde = presente, vermelho = faltou; a autora vai criar outros
  rótulos depois, então os rótulos devem ser editáveis) e **Competências** (Conversação, Gramática, Escrita, Leitura,
  Vocabulário, Escuta, Pronúncia, como no Notion). Pontualidade e Uso da L1 ficam de fora por enquanto.
- **Calendário**: opção de lançar datas futuras (agenda), inclusive data avulsa. Verificar integração com Google Agenda
  para quem entrou com Google.
- **Histórico do Notion** ("Calendário de Aulas"): autorizado trazer para o site (alunos com conta e vínculo). Verificar
  integração com o Notion só leitura ou leitura e escrita, para ela e outras professoras.
- PR #312 (Mural, turmas, painel Aluno) mergeado e publicado em 2026-10-14.

### Aba Aluno > Revisão (2026-10-14, branch; sem migration)

- Cartões da professora (Banco de Revisão, origin 'teacher') saíram da Revisão geral: Estudar tudo, modos, contagens,
  "Suas palavras", tabela de Decks, Painel e a opção de origem em Configurar (filtro salvo "teacher" vale como todos).
- Nova aba **Revisão** no Aluno (depois de Mural, Aulas, Material de apoio): Novo/Aprendendo/Revisar e "Revisar (N)",
  que abre a MESMA sessão de Flashcard (modos de resposta e Observação do Banco) só com esses cartões; "Voltar ao Aluno".
- "+N": aba Revisão = cartões para hoje; item Aluno e botão Mais = Mural + Revisão. FSRS intacto (só muda onde aparece).
- Grátis x Premium: tudo grátis para aluno vinculado.
- Testes: banco-revisao Playwright 465/465 (78 novas); atualizados por mudança intencional: mural 255/255,
  deck-browser 208/208, fase-h origem 54/54, fase-i Playwright 48/48 e unit 67/67 (o unit já falhava 4 antes, reescrito
  para o comportamento atual), k7 40/40, i18n unit 2040/2040. Sem mudança: painel-professora 277/277, fase-g, k2h, k3,
  k9, k10, revisao-ajustes, revisao-proposta-a, k4, k2. Pré-existentes: i18n card_variants_browser 14/16, content_en 29/30.

### Presença, Competências e aula de turma (2026-10-14, branch; migration 094 no Staging)

- Professora > Aulas: Presença com rótulos coloridos (padrão Presente/verde e Faltou/vermelho; criar, renomear, trocar a cor,
  dizer se conta como presença/falta/outro e arquivar em "Rótulos de Presença") e Competências (Conversação, Gramática,
  Escrita, Leitura, Vocabulário, Escuta, Pronúncia). Pontualidade e Uso da L1 fora, como decidido.
- Turmas (as mesmas do Mural) entram no seletor: aula de turma é registrada uma vez e aparece para todos os membros com
  vínculo (resolve "Sandra e Eduardo": Sandra vê quando criar conta e entrar na turma). Turma com aula não pode ser apagada.
- Aluno > Aulas mostra a Presença colorida, as Competências e o nome da turma. Anotações continuam só da professora.
- Grátis x Premium: registrar aulas faz parte do plano Professora (como antes); ver as aulas é grátis para aluno vinculado.
- Testes: SQL local 27/27; painel-professora Playwright 367/367 (90 novas); mural 255/255, Banco 465/465, k10 114/114,
  i18n unit 2033/2033 e Playwright 209/209, e4 13/13.
- Próximo: aplicar a 094 na produção (com autorização), publicar; depois importação do Notion (Presença do Notion vira
  rótulo: Aula dada = Presente, Faltou/Cancelada = Faltou, os outros viram rótulos novos), calendário, avisos no Mural.
- Ajuste pedido pela autora (2026-10-14): sem seção separada de rótulos. A Presença funciona como o seletor do Notion: clicar
  escolhe, digitar + Enter cria, "⋯" renomeia, troca a cor (as 9 do Notion, com rosa e marrom) e arquiva. "Conta como"
  (presença/falta/outro) ficou só no banco (Presente e Faltou já vêm marcados), sem tela. Painel-professora 409/409.
- 094 na produção em 2026-10-14 (autorizada). Aba Turma no Ranking: só aparece para quem está em alguma turma.
