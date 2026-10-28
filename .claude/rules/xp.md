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
- **Trilha** (constantes em `shared/srs.js`; `exerciseXP()` em `shared/core/exercicios-licao.js`): exercício de lição certo = reconhecer (múltipla escolha)
  `EXERCISE_XP_RECOGNIZE` 1, produzir (digitar, lacuna, ordenar, cenário) `EXERCISE_XP_PRODUCE` 2, "quase" (erro só de acento) `EXERCISE_XP_ALMOST` 1;
  "Não sei" tira 1 (mínimo 1); refazer lição concluída 0; fechar lição `LESSON_CLOSE_XP` 4. Ponto de verificação 25 e bônus das Missões 30 ficam como estavam
  (decisão de 2026-10-15). Meta "Ganhe 50 XP hoje" mantida de propósito: uma lição sozinha não fecha, incentiva lição + revisão.
  Nunca escrever número solto em `addXP(...)` de exercício ou de fechar lição: usar as constantes.
- **Hanzi e histórias** (hoje só no zh; valem para qualquer site que ganhe essas atividades; constantes em `shared/srs.js`): escrever hanzi `HANZI_WRITE_XP` 2, acerto no teste
  de hanzi `HANZI_TEST_XP` 1, concluir lição de hanzi `LESSON_CLOSE_XP` 4, pergunta de história certa `STORY_QUESTION_XP` 1, concluir história `STORY_DONE_XP` 20.
  Lição de hanzi ou história JÁ concluída não paga XP de novo (mesma regra de "refazer lição" da trilha).
- **Desafios, Expressões, "Sua vez"** (decisão da autora, 2026-10-26; só este passo dá XP, o resto dos Desafios continua sem XP): digitar certo
  `EXERCISE_XP_PRODUCE` 2, "quase" `EXERCISE_XP_ALMOST` 1, errou ou "Não sei" 0. Só na PRIMEIRA conclusão do desafio, pago ao tocar em Concluir
  (`exprTurnXP`, `shared/desafios-telas.js`); refazer desafio concluído ou "Revisar erros" = 0, para não virar fonte infinita. Teste: `tests/desafios-expressoes-passos/`.
- O toast "+N XP" aparece para todo ganho maior que 0. A notificação do sino usa `notification_rules.min_xp_amount` (categoria `gamificacao`, 15 na produção).
- Demais fontes e valores atuais, e o que está em revisão: `docs/historico/21-auditoria-xp.md`. Ao mexer em qualquer XP, atualizar esse arquivo e o teste `tests/xp/`.
