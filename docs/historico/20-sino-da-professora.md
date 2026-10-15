# 20 -- Sino da professora (migration 108), 2026-10-15

Decisão da dona (2026-10-15): os avisos sobre ALUNOS ficam num sino próprio dentro do Painel da professora, separados do
sino do topo (estudo da própria conta), e chegam de alunos de QUALQUER idioma de estudo, seja qual for o site aberto.
Responde ao achado Q5 e à pergunta P1/T4 de `docs/i18n/e6-minimo-servidor-pt.md`.

## Mapa do sistema de avisos (antes da 108)

| Peça | Onde | O que faz |
|---|---|---|
| Tabela `notifications` | 010 | Uma linha por aviso do sino; RLS: dono lê/marca/grava os próprios |
| Sino do topo | `shared/notifications.js` | Lê TODAS as linhas da conta (sem filtro de idioma), conta não lidos, "Ler todas" |
| `_teacher_notify` | 077, 104 | Convite (para o aluno, `sistema`), aceitou/recusou/entrou pelo link (para a professora, `supervisao`, aba `teacher-panel`). Descartava `portugues` |
| `_mural_notify` | 087, 104 | Post, comentário, "colocou você na turma", "entrou pelo link na turma". Para a professora: aba `teacher-mural` |
| "Aluno sumido" | `notification-cron` (`processTeacherStudentAlerts`) | `student_inactive_alert`, categoria `supervisao`, aba `admin-badges`, 1 por professora/idioma/dia. Sem modelo para `portugues` |

## O que a 108 faz

- `notifications.audience` (`self`/`teacher`) + gatilho `notifications_audience_fill`: categoria `supervisao` ou aba
  `teacher-mural`/`teacher-panel` = `teacher`. Vale para a cron sem novo deploy.
- `notifications.params` (jsonb): nome, turma, trecho, lista de alunos sumidos. O sino da professora monta a frase pelo
  `t()` no idioma do site de quem lê. Sem params, mostra o body gravado.
- `_teacher_notify` aceita `portugues`; `_mural_notify` grava params.
- Modelos de `student_inactive_alert` para `portugues` (cópia dos de `frances`, mesmo `ui_language` e `active`).
- Avisos antigos da professora: `audience='teacher'` e params lidos da frase (só as colunas novas mudam).

## App

- `shared/teacher-panel.js`: bloco "Sino da professora" (botão "Avisos dos alunos" com contador, lista, marcar como lido,
  marcar todos, clique leva a Alunos ou Mural; mural de outro idioma só marca como lido e diz onde responder), ponto no
  item do menu e no "Mais" do celular. Some sozinho se a 108 não estiver aplicada.
- `shared/notifications.js`: o sino do topo filtra `audience <> 'teacher'`; sem a coluna, volta a mostrar tudo.
- `shared/permissions.js`: `applyRoleNavUI` atualiza o contador do sino da professora.
- Chaves `panel.tbell.*` (pt-BR e en). Grátis x Premium: tudo grátis (ferramenta do papel Professora).

## Testes

`tests/sino-professora/run.sh` (Postgres local, 108 duas vezes, avisos antigos semeados antes) e
`tests/sino-professora/test_playwright.js` (fr/zh, claro/escuro, 1200 e 390 px).

## Pendente

- Aplicar a 108 no Staging e na produção (sem DROP/DELETE: ferramenta de migration). Desfazer:
  `docs/rollout-sql/108_rollback_sql_editor.sql`.
