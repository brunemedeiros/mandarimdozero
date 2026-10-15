---
paths:
  - "shared/srs.js"
  - "shared/core/**"
  - "fr/app.js"
  - "zh/app.js"
---
# XP (vale para TODOS os sites: fr, zh, pt e os futuros)

Decisão da autora (2026-10-15): o que for decidido aqui é padrão de todos os sites. Código compartilhado em `shared/` já vale para todos;
site novo parte do molde da família (ver `docs/i18n/e4-plano-de-extracao.md`) e herda estes valores. Nada de valor próprio por idioma sem a autora aprovar.

- **Revisão** (`XP_PER_GRADE`, `shared/srs.js`; `reviewXP()`): Errei 0, Difícil 2, Bom 4, Fácil 8. Valor fixo, sem redução para cartão maduro.
  Vale também para cartões da professora em Aluno > Revisão. Modo aula (professora no Banco) NÃO dá XP.
- O toast "+N XP" aparece para todo ganho maior que 0. A notificação do sino usa `notification_rules.min_xp_amount` (categoria `gamificacao`, 15 na produção).
- Demais fontes e valores atuais, e o que está em revisão: `docs/historico/21-auditoria-xp.md`. Ao mexer em qualquer XP, atualizar esse arquivo e o teste `tests/xp/`.
