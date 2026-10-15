---
paths:
  - shared/badge-tracks.js
  - shared/badge-tracks-app.js
  - shared/core/gamificacao.js
  - shared/icons/**
---
# Conquistas com níveis

- Catálogo único em `shared/badge-tracks.js` (trilhas, metas, molduras, mapa das antigas); critério para toda conquista
  nova: `docs/conquistas-proposta-niveis.md` seção 2 (8 regras). Entrega: `docs/historico/16-conquistas-com-niveis.md`.
- Id gravado = `<trilha>.<nível>`; nunca reaproveitar id antigo (`streak_3` etc. continuam valendo pelo `LEGACY`).
- Métrica nova entra em `collectBadgeMetrics` dos dois app.js; nome com gênero usa chaves `.f`/`.m` (en igual nas três).
- Nível semeado ao abrir o site grava com `{ backfill: true }` (data no passado); só nível ganho estudando comemora.
- Trilhas que vêm do banco (Pódio `my_podium_weeks` 092, Missões em Dupla `my_duo_missions_done` 102): variável `null` até carregar
  (a trilha some), carregadas em `seedEarnedBadges` (`shared/core/gamificacao.js`) e incluídas na chave do memo.
