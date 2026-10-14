# Conquistas com níveis: entrega (2026-10-14)

Decisões e metas: `docs/conquistas-proposta-niveis.md` (aprovado pela autora em 2026-10-13/14). Ícones: `docs/icones-fluent.md`.

## O que mudou

- **Catálogo único** `shared/badge-tracks.js` (puro, igual para fr e zh): 14 trilhas, metas, molduras (bronze, prata,
  ouro; último nível = máximo dourado), mapa das conquistas antigas (`LEGACY`) e Multitarefa como clássica.
  Ids gravados em `earned_badges`: `<trilha>.<nível>` (ex.: `review.2`, `course1.3`). Nenhuma mudança de tabela.
- **Ligação com o app** `shared/badge-tracks-app.js`: `BADGES` (vazio em cada app.js) vira a lista de níveis montada
  por `rebuildTrackBadges()`; cartão de trilha (Progresso), vitrine (Perfil e perfil público), medalha com ícone
  Fluent (`shared/icons/fluent/`, licença MIT), contagem de amigos para a trilha Amigos.
- **Métricas por site** `collectBadgeMetrics(s)` em `fr/app.js` e `zh/app.js`. Contadores novos (contam a partir de
  agora): `unitProgress[id].checkpointAced` (100% no ponto de verificação da unidade), `dictationsAced` (fr, ditados
  com 90%+, refazer conta; começa no número de ditados distintos com 90%+), `modesUsed.conjugation` (fr).
  Desafios: metas 10·50·200 cortadas pelos publicados (231 em 2026-10-14); sem a lista carregada, metas cheias.
- **Conta x curso** (regra C4 mantida): trilhas da conta (Primeiro Passo, Revisão, Sequência, XP, Fim de Semana,
  De Volta ao Jogo, Amigos) valem em todos os idiomas (`AccountProgress.isAccountBadge` reconhece os níveis).
- **Sem enxurrada no feed**: níveis que a pessoa já tinha ao abrir o site entram em `earned_badges` com
  `earned_at = 2026-10-01` e `ignoreDuplicates` (`upsertEarnedBadges(ids, { backfill: true })`, `shared/auth.js`).
  Nível ganho estudando grava a hora real e comemora ("Nova conquista!" ou "Subiu de nível!").
- **Gênero**: nome no gênero do perfil (`.f`/`.m`), "(a)" sem gênero; nomes de outras pessoas sempre na forma neutra.
- **Atividade dos amigos**: só ouro e máximo; conquista de curso só no site do mesmo idioma; Parabéns por conquista
  (exceto Amigos) pela RPC nova `friends_badge_feed` e `congratulate_friend(..., 'badge', '<nível>', ...)`.
  Sem a 089, o site cai na lista antiga (`friends_activity`) sem botão.
- **Nomes ajustados na implementação** (a confirmar com a autora): Ouvido ganhou o nível "Ouvido Afiado" (2.000) porque
  as metas aprovadas têm 4 níveis; Vocabulário ficou com 4 níveis (sem "Vocabulário Afiado"); Fim de Semana usa o
  ícone de calendário.

## Migration 089 `badge_congrats`

`shared/supabase_migrations/089_badge_congrats.sql`: `congratulate_friend` aceita `badge` (nível ganho nos últimos 7 dias,
id no formato novo, nunca `friends.*`); `friends_badge_feed(p_limit)`. Sem DROP.
- Staging: aplicada em 2026-10-14 pela ferramenta (antes: `congratulate_friend` do Staging igual à 086, só sem um
  comentário). Conferido: função nova, anon sem EXECUTE, advisor sem alerta novo além do lint 0029 esperado.
- Produção: **pendente** (precisa de autorização da autora). Só faz efeito com o site publicado.

## Testes (2026-10-14)

- `tests/conquistas/test_badge_tracks.js` (catálogo puro): 66/66.
- `tests/conquistas/test_playwright.js` (fr/zh, claro/escuro, 1280 e 390): 64/64.
- `tests/conquistas/run.sh` (Postgres local, 089): 25/25. `tests/amigos/run.sh` com a 089: 125 ok, 0 falhas.
- `tests/i18n/test_i18n_unit.js` 2034/2034; `tests/i18n/test_badges_i18n.js` 14/14;
  `tests/curso-progresso/test_conquistas_conta.js` 40/40; `tests/trilha/test_skip_checkpoint_ui.js` 19/19.
- Testes antigos atualizados de propósito: `test_friends_086.sql` (conquista agora aceita parabéns),
  `test_skip_checkpoint_ui.js` (unidade pulada conta para "Nível A1", decisão de 2026-10-13),
  `test_conquistas_conta.js` e `test_badges_i18n.js` (catálogo virou trilhas; o segundo também deixou de bloquear
  `supabase-client.js` sem querer).

- Regressão ampla (40 arquivos de tests/): `tests/amigos/test_playwright.js` 210/210 depois de atualizar a atividade
  (o feed agora só mostra ouro/máximo, com o texto "chegou a"). Pré-existentes, iguais na `main`: desafios-progresso
  22/23 ("barra existe"), `i18n/test_card_variants_browser.js` 14/2 e `i18n/test_content_en.js` 29/30 (aviso
  "This lesson isn't available in English yet" fica com display none: `.lesson-unit-goal` some em `body.lesson-focus`).

## Fora desta entrega

- Trilha **Pódio** (semanas em 1º entre amigos): o banco não guarda o histórico semanal de vencedores; precisa de
  migration própria.
- Pioneiro/a com foguete: o ícone está em `badge_catalog` na produção (dado); muda junto com a troca geral de ícones.
