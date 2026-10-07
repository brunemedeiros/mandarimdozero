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
