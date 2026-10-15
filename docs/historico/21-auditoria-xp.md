# XP: revisão reajustada e auditoria das outras fontes (2026-10-15)

## Decidido pela autora e feito
- Revisão (Flashcard, inclusive cartões da professora em Aluno > Revisão): **Errei 0, Difícil 2, Bom 4, Fácil 8** (primeiro ajuste foi 0/1/2/4; a autora dobrou por querer valorizar a revisão mais que o resto), sem redução
  para cartão maduro. Antes: 1, 4, 8, 10, com 70% a partir de 21 dias e 40% a partir de 60.
- Onde: `XP_PER_GRADE` em `shared/srs.js` e `reviewXP()` em `shared/core/revisao-decks.js` (fr e zh usam a mesma). `addXP(0)` não faz nada.
- Teste: `tests/xp/test_review_xp.js` (10/10).
- Modo aula (professora no Banco) não dá XP; o aluno estudando sozinho dá.

## Trilha: exercícios e fechar lição (decidido e feito, 2026-10-15)
- Reconhecer (múltipla escolha) 3 -> **1**; produzir (digitar, lacuna, ordenar, cenário) 4 -> **2**; "quase" 2 -> **1**; fechar lição 8 -> **4**.
  "Não sei" tira 1 (mínimo 1) e refazer lição concluída dá 0, como antes. Uma lição (~12 exercícios) vai de ~50 para ~25 XP.
- Ponto de verificação (25), Missões do dia (30) e a meta "Ganhe 50 XP hoje" ficam como estavam, por decisão da autora (uma lição sozinha não fecha a meta: incentiva lição + revisão).
- Constantes em `shared/srs.js` (`EXERCISE_XP_*`, `LESSON_CLOSE_XP`); fr, zh e `shared/core/quase-iguais-pinyin.js` usam as constantes. Testes: `tests/xp/test_trilha_xp.js` (18/18), `tests/xp/test_xp_navegador.js` (fr e zh, 10/10).

## Fontes de XP (tabela abaixo = valores ANTES desta rodada; a rodada da trilha está acima)
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
