# Etapa D das telas de exercício: Desafios restantes, Ditados e Revisão (proposta, 2026-11-04)

Continuação de `docs/historico/23-auditoria-telas-de-exercicio.md` (etapas A, B e C já publicadas). Regra:
`.claude/rules/frontend-fr-zh.md`, "Telas de exercício seguem o molde da trilha". Nada codado ainda; aguarda a dona.

## Como está hoje (capturas do código atual, 390 px, claro)

| Tela | Saída | Barra no topo (progresso, ⚑, ⌨️, ✕) | Comando no idioma do site | Opções 1-N + teclas | "Não sei" | Fim |
|---|---|---|---|---|---|---|
| Expressões (molde) | ✕ | sim (6 passos) | "O que significa?" | sim | n/a (palpite livre) | Continuar → final |
| Ouça e traduza | "← Voltar aos desafios" | não (só ⚑ solta) | "🎧 Ouça e traduza" (título) | n/a (digitar) | não ("Mostrar dica") | "Concluir" |
| Acentuação | idem | não | título | n/a (digitar) | não | "Concluir" |
| Complete a frase | idem | não | "Escolha a forma certa para cada lacuna:" | não (botões sem número) | não | "Concluir" |
| Ditados | "← Voltar aos ditados" | não; e SEM modo foco (topo e menu de baixo ficam na tela) | tarefa do ditado (título) | n/a | n/a | "Verificar" → resultado + "Tentar de novo" |
| Revisão (sessão) | "← Voltar aos modos" | barra própria dentro do cartão | sem comando | autoavaliação (fica) | n/a (intencional) | "Continuar" |

Fila por nível dos Desafios ("Nível A1 · Continuar"): entre um desafio e o próximo aparece a tela "✅ Feito! · 1/29 concluídos · Continuar".

## Proposta (recomendação)

1. **Desafios: Ouça e traduza, Acentuação, Complete a frase** (lote 1, um PR)
   - Barra do topo igual à das Expressões (progresso, ⚑, ⌨️, ✕) no lugar do "← Voltar aos desafios".
   - Progresso por passo dentro do desafio, como nas Expressões: pergunta = metade, devolutiva = cheia. O "1/29 concluídos" do nível
     continua na tela entre um desafio e outro da fila (a barra não fica parada em 3%).
   - Comando pequeno no idioma do site acima do exercício ("Ouça e traduza", "Escreva com os acentos", "Complete a frase"), com o
     cabeçalho "Desafios · A1 / nome da categoria" igual ao das Expressões.
   - Complete a frase: opções com número (1, 2, 3...) e seleção pelo teclado; com mais de uma lacuna, o número vale para a lacuna da vez.
   - "Não sei" abaixo da resposta nos 3 tipos: mostra a resposta certa e conta como erro na revisão espaçada dos Desafios (igual à trilha).
     O "Mostrar dica" do Ouça e traduza fica.
   - Fim: "Continuar" (verde no acerto, como na trilha) no lugar de "Concluir"; Enter avança.
2. **Ditados** (lote 2)
   - Entram no modo foco (topo e menu de baixo somem, como na lição) e ganham a mesma barra (progresso: escrevendo = metade, resultado = cheia).
   - Sem "Não sei" (não faz sentido num ditado); "Tentar de novo" e o player de áudio ficam como estão.
3. **Revisão** (lote 3)
   - A barra própria vira a barra do topo (cartão N de total), com ⚑, ⌨️ e ✕ no lugar do "← Voltar aos modos".
   - Errei/Difícil/Bom/Fácil, a autoavaliação e o Modo aula do Banco NÃO mudam.

Grátis x Premium: nada muda (só a moldura da tela). Paridade: tudo em `shared/` (Desafios e Ditados só existem no fr; Revisão vale para fr e zh).

## Decisões da dona
- D1: progresso por passo dentro do desafio (recomendado) ou pela fila do nível?
- D2: "Não sei" conta como erro na revisão espaçada dos Desafios (recomendado)?
- D3: "Continuar" no lugar de "Concluir" no fim de cada desafio (recomendado)?
- D4: ordem dos lotes: Desafios, Ditados, Revisão, um PR cada, com prévia antes de publicar (recomendado)?
