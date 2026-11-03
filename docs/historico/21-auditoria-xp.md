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

## zh: hanzi e histórias (decidido e feito, 2026-10-16)
- Escrever hanzi 3 -> **2**; acerto no teste de hanzi 3 -> **1**; concluir lição de hanzi 20 -> **4** (= fechar lição); pergunta de história certa 5 -> **1**; concluir história **20** (mantido).
- Trava nova: lição de hanzi ou história já concluída não paga XP de novo (antes dava para repetir sem limite). Uma lição de hanzi (5 caracteres) vai de 50 para ~19 XP; uma história na 1ª vez de 35 para 23.
- Constantes `HANZI_WRITE_XP`, `HANZI_TEST_XP`, `STORY_QUESTION_XP`, `STORY_DONE_XP` em `shared/srs.js`. Teste: `tests/xp/test_xp_zh_hanzi_historias.js` (9/9, app zh real; a escrita de traços é conferida no código porque a biblioteca vem de CDN).
- Speed Review, Combinar e Conjugação não foram alterados (a autora pediu para não mexer).

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

## Etapa 6 (2026-10-26, decisões da dona; registro em `docs/i18n/etapa6-boas-vindas-proposta.md`, seção "Implementação")
- **Ícone**: XP tem um ícone só, a estrela ⭐ (topo, "XP ganho" das telas de Lição/Unidade concluída, missão "Ganhe 50 XP hoje").
  O raio ⚡ fica só para o Combo (acertos seguidos) e para o ícone da Revisão rápida (modo, não XP).
- **Estrelas aposentadas**: a tela "Módulo concluído!" do Ponto de verificação/Teste de Nível não mostra mais "Estrelas" nem
  caixa de recompensa (só a nota e "Agora você já sabe"). Conferido: pular pelo Ponto de verificação continua sem dar XP.
- **Aviso "+N XP"**: `addXP(n, { quiet: true })` soma igual e só não mostra o aviso. Usado num caso só: o +4 de fechar a
  1ª lição do curso, porque o bloco "Recado da Prof. Brune" já mostra o XP. Os avisos que estiverem na tela somem quando
  a janela da sequência abre (não ficam empilhados por cima dela). Valores de XP: nenhum mudou.
- Teste: `tests/boas-vindas/test_playwright.js`.

## 2026-10-26: Desafios, Expressões, "Sua vez"
- Decisão da autora: o passo "Sua vez" das Expressões (digitar a lacuna da microatividade) dá XP: certo `EXERCISE_XP_PRODUCE` (2), "quase" `EXERCISE_XP_ALMOST` (1),
  errou ou "Não sei" 0. Antes os Desafios de conteúdo não davam XP; os outros tipos continuam sem.
- Contra XP infinito: pago só ao tocar em Concluir e só na PRIMEIRA conclusão do desafio (refazer concluído e "Revisar erros" = 0).
  Código: `exprTurnXP` e `exprShowFinal` em `shared/desafios-telas.js`. Cobertura: `tests/desafios-expressoes-passos/` (2 XP certo, 1 XP quase, 0 errado/"Não sei", 0 ao refazer).

## 2026-10-29: XP da semana no topo, janelinha das semanas e avisos fora das telas de conclusão (decisões da dona)
- **Topo**: o contador ⭐ mostra o **XP da semana**, com "XP" ao lado do número no fr e no zh (antes: total no topo; o fr
  escondia "XP" no celular). O XP total continua no Perfil (cartão de estatísticas). Valores de XP: nenhum mudou.
- **Semana e soma = Ranking**: segunda a domingo no fuso do aparelho (mesma conta de `currentWeekStart()` e
  `leaderboardCurrentWeekStart()`), somando todos os idiomas da conta em `weekly_xp`, como o Ranking "Geral" (que é a aba
  que o Ranking abre). Conferido na produção (2026-10-29, só leitura): `week_start` é sempre segunda-feira; leitura pública.
- **Local x servidor**: até a leitura de `weekly_xp` chegar, o topo mostra `STATE.periodXp` (curso aberto); quando chega, o
  número sobe contando até o valor do servidor. XP ganho depois da leitura soma na hora; o idioma da página nunca fica abaixo
  do local (servidor atrasado em relação ao último save).
- **Janelinha** (botão com `aria-expanded`): semana atual em destaque + 3 anteriores, com datas e barras; abre com mouse por
  cima, clique, Enter/Espaço e toque; fecha com Esc (foco volta ao botão), clique fora e Tab. Código: `shared/xp-semana.js`,
  `shared/xp-semana.css`; chaves `xpWeek.*` (pt-BR e en).
- **Telas de conclusão**: aviso "+N XP" (`showToast(..., { kind: 'xp' })`) não aparece enquanto uma tela de conclusão está
  visível e os pendentes somem quando ela abre (a tela já mostra o XP ganho). Lista das telas: `COMPLETION_SCREEN_SELECTOR`
  em `shared/toast.js` (tela nova de conclusão entra lá ou usa `data-completion-screen`). Outros avisos continuam.
- Testes: `tests/xp-semana/` (cálculo e navegador fr/zh, claro/escuro, 390/1280, pt-BR/en).

## 2026-10-30: Expressões passam a dar XP por passo ("opção A")
- Motivo: a autora achou 2 XP pouco para uma sequência maior de exercícios (escolha, Monte a frase, Sua vez). Decisão: mesmo padrão da trilha.
- Valores: escolha certa `EXERCISE_XP_RECOGNIZE` 1, Monte a frase certo `EXERCISE_XP_PRODUCE` 2, Sua vez certa 2 / "quase" `EXERCISE_XP_ALMOST` 1, errou ou "Não sei" 0 (teto 5). Só na 1ª conclusão, pago no Concluir; refazer ou "Revisar erros" = 0.
- Código: `exprXPBreakdown` (substitui `exprTurnXP`) em `shared/desafios-telas.js`; a tela final mostra o total em destaque (+N XP) e o ganho de cada passo. Teste: `tests/desafios-expressoes-passos/` (175/175).
