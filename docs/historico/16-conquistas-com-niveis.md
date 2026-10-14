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
  Sem a 091, o site cai na lista antiga (`friends_activity`) sem botão.
- **Nomes ajustados na implementação** (a confirmar com a autora): Ouvido ganhou o nível "Ouvido Afiado" (2.000) porque
  as metas aprovadas têm 4 níveis; Vocabulário ficou com 4 níveis (sem "Vocabulário Afiado"); Fim de Semana usa o
  ícone de calendário.

## Migration 091 `badge_congrats`

`shared/supabase_migrations/091_badge_congrats.sql`: `congratulate_friend` aceita `badge` (nível ganho nos últimos 7 dias,
id no formato novo, nunca `friends.*`); `friends_badge_feed(p_limit)`. Sem DROP.
- Staging: aplicada em 2026-10-14 pela ferramenta (antes: `congratulate_friend` do Staging igual à 086, só sem um
  comentário). Conferido: função nova, anon sem EXECUTE, advisor sem alerta novo além do lint 0029 esperado.
- Produção: aplicada em 2026-10-14 a pedido da autora (versão `20261014175914`). Renomeada de 089 para 091 antes de
  aplicar: 089 e 090 já eram de outra conversa (`review_bank_agent`).

## Testes (2026-10-14)

- `tests/conquistas/test_badge_tracks.js` (catálogo puro): 66/66.
- `tests/conquistas/test_playwright.js` (fr/zh, claro/escuro, 1280 e 390): 64/64.
- `tests/conquistas/run.sh` (Postgres local, 091): 25/25. `tests/amigos/run.sh` com a 091: 125 ok, 0 falhas.
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

- (Feito depois do PR #313, ver abaixo) Trilha **Pódio**.
- Pioneiro/a com foguete: o ícone está em `badge_catalog` na produção (dado); muda junto com a troca geral de ícones.

## Pódio (depois do PR #313, 2026-10-14)

- Trilha `podium` (da conta): 1 · 5 · 10 semanas fechadas em 1º lugar entre os amigos. Nomes: Topo do Pódio · Quem Manda
  na Semana (Dona/Dono da Semana) · Reinado ✨. Ícone: troféu (Fluent `1f3c6`). Parabéns só no Reinado (máximo).
- Sem tabela nova: `my_podium_weeks()` (migration `092_podium_weeks.sql`) conta as semanas fechadas em `weekly_xp`
  (idiomas somados, como o Ranking de Amigos). Só vale amigo que já era amigo no fim da semana; empate não conta;
  precisa de pelo menos 1 amigo com XP. Nível que sobe aqui comemora (é uma semana que fechou); o que já estava
  gravado não repete.
- Testes: catálogo 71/71, navegador 66/66, SQL `tests/conquistas/run.sh` 31/31 (6 do Pódio), Amigos 210/210,
  `test_badges_i18n` 14/14, `test_conquistas_conta` 40/40, i18n 2034/2034.
- 092: Staging em 2026-10-14 (anon sem EXECUTE). Produção: pendente de autorização. Na produção hoje há 0 amizades
  aceitas, então ninguém começa com nível de Pódio.
