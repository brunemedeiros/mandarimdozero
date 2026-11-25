# 38. Animações do site (2026-11-25)

Pedido da dona (2026-11-25): melhorar as animações, só com princípios gerais de boas práticas (quando animar, duração, curva,
feedback, acessibilidade) e **código original**. Nada de texto, tabela, receita ou código de material de terceiros entra no repositório.
Vale para fr, zh e o futuro pt. Tudo grátis (é o jeito de o site responder ao aluno, não um recurso). Nenhum texto novo.

## Critério
Quantas vezes o aluno vê aquilo: o que se repete muito na sessão (responder, virar cartão, trocar de aba) é curto e discreto e nunca
atrasa um clique; festa só nos momentos raros (conquista, fim de unidade). Tempos e curvas nomeados em `shared/movimento.css` (`--mov-*`).

## Feito (branch `claude/jolly-shannon-jlhg70`, aguarda aprovação da dona para o PR)
Números = itens da lista entregue à dona.
1. **Menos movimento**: uma regra para o site inteiro (`shared/movimento.css`); tudo termina na hora no mesmo estado final; a rodinha de
   carregar continua girando devagar (antes parava e parecia travada).
2. Efeito de passar o mouse só com mouse de verdade (`@media (hover:hover) and (pointer:fine)`): opções de Verdadeiro ou Falso,
   Complete, blocos do Monte a frase e o 🔊 (`shared/audio-btn.css`).
3. `transition: all` trocado pela lista do que muda (fr/zh `index.html`, `desafios.css`, `modulos-niveis.css`, `gramatica-cenario.css`).
6. Aperto nas opções de resposta (`:active` com escala .97 ou .98).
7. Tremidinha do erro também na múltipla escolha da Revisão, no jogo de velocidade e nos Desafios.
8. Entrada igual da questão nova: cartão da Revisão, Ponto de verificação/Teste de Nível e gramática (`.gram-exercise`), jogos da Conjugação, resultado do Ditado.
9. Revisão: ao mostrar a resposta, só a parte nova aparece (`movimentoCartaoRevisao`, `shared/core/revisao-cartoes.js`).
10. Pares: o par certo encolhe e some. Monte a frase: o bloco voa de volta ao ser tirado da frase (`shared/core/licao-exercicios.js`).
11. Pop do ícone em todas as telas de conclusão (`conclusaoHTML`: `pop` ligado por padrão; `pop:false` desliga).
12. Janela da sequência entra com esmaecer e subidinha.
15. ✓ da missão do dia concluída entra carimbado.
18. A rodinha de carregar só aparece depois de 0,3 s.
19. Troca de aba mais curta e sem deslizar.

## Não feito
- 4 (barras de progresso por escala em vez de largura): 6 pontos do código e testes, sem ganho visível. Recomendação: deixar.
- Só prévia, esperam decisão da dona: 5 ("+XP" pequeno perto da barra na lição), 13 (festa maior só no último nível da conquista,
  escolha dela), 14 (unidade liberada no mapa), 16/17 (janelas, menus e gavetas; Painel).
- De propósito sem animação: sidebar, pulso no nó atual do mapa, acordeões, troca de tema.
- Rolagem até o painel de acerto/erro (lição, diálogo, Desafios, Ditado): sem rolagem suave com "menos movimento".

Prévia (privada): https://claude.ai/artifact/VWz2PXPd3Z1VVaGu2muVYw
