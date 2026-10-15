# XP: revisão reajustada e auditoria das outras fontes (2026-10-15)

## Decidido pela autora e feito
- Revisão (Flashcard, inclusive cartões da professora em Aluno > Revisão): **Errei 0, Difícil 2, Bom 4, Fácil 8** (primeiro ajuste foi 0/1/2/4; a autora dobrou por querer valorizar a revisão mais que o resto), sem redução
  para cartão maduro. Antes: 1, 4, 8, 10, com 70% a partir de 21 dias e 40% a partir de 60.
- Onde: `XP_PER_GRADE` em `shared/srs.js` e `reviewXP()` em `shared/core/revisao-decks.js` (fr e zh usam a mesma). `addXP(0)` não faz nada.
- Teste: `tests/xp/test_review_xp.js` (10/10).
- Modo aula (professora no Banco) não dá XP; o aluno estudando sozinho dá.

## Fontes de XP hoje (antes de qualquer mudança além da Revisão)
| Fonte | XP | Onde |
|---|---|---|
| Exercício de lição certo | 3 a 4 (2 se "quase" em digitar; -1, mínimo 1, se pediu "Não sei"); 0 ao refazer lição concluída | `exerciseXP` em `shared/core/exercicios-licao.js` |
| Fechar uma lição | 8 | `fr/app.js`, `zh/app.js` |
| Ponto de verificação (fim da unidade) | 25 | idem |
| Speed Review | 2 por acerto, 1x por dia, no fim da sessão | `SPEED_REVIEW_XP_PER_CORRECT` |
| Combinar (par certo) | 2 por par | `shared/core/quase-iguais-textos.js` |
| Conjugação (prática, só fr) | 1 por forma certa, 2 se verbo irregular; "quase" não conta | `fr/app.js` |
| Missões do dia, as 3 feitas | 30 | `shared/core/gamificacao.js` |
| zh: história | 5 por pergunta certa, 20 ao concluir | `zh/app.js` |
| zh: hanzi | 3 por escrita, 3 por acerto no teste, 20 ao concluir a lição | `zh/app.js` |
Sem XP: Desafios (fr), Jogos da Conjugação, Modo aula, pular Ponto de verificação.

## Efeitos colaterais da mudança na Revisão
- Missão "Ganhe 50 XP hoje" (`xp50`): 15 revisões "Bom" agora dão 60 em vez de 120.
- Notificação de XP (sino, não o toast): `min_xp_amount` da categoria `gamificacao` está em **15** na produção (conferido 2026-10-15; cooldown 15 min, 2 por dia). Nenhuma nota de revisão (máx. 8) chega ao sino. O toast "+N XP" aparece para qualquer ganho maior que 0.
- Conquistas por XP acumulado (100, 500...) e missão em dupla (por dias): ficam mais lentas só pelo XP de revisão.

## Regra de produto
Tudo o que for decidido sobre XP vale para todos os sites (fr, zh, pt e futuros). Ver `.claude/rules/xp.md`.
