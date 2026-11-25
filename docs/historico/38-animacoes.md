# 38. Animações do site (2026-11-25)

Pedido da dona (2026-11-25): melhorar as animações, só com princípios gerais de boas práticas (quando animar, duração, curva,
feedback, acessibilidade) e **código original**. Nada de texto, tabela, receita ou código de material de terceiros entra no repositório.
Vale para fr, zh e o futuro pt. Tudo grátis (é o jeito de o site responder ao aluno, não um recurso). Nenhum texto novo.

## Critério
Quantas vezes o aluno vê aquilo: o que se repete muito na sessão (responder, virar cartão, trocar de aba) é curto e discreto e nunca
atrasa um clique; festa só nos momentos raros (conquista, fim de unidade). Tempos e curvas nomeados em `shared/movimento.css` (`--mov-*`).

## Primeira leva (branch `claude/jolly-shannon-jlhg70`)
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

## Segunda leva (aprovada pela dona em 2026-11-25, mesma branch)
5. Na lição da trilha, o aviso "+N XP" virou um "+N" pequeno (pílula verde) acima do fim da barra, que sobe e some em 0,9 s
   (`xpPertoDaBarra`, `shared/toast.js`; chamado por `addXP`). Fora da lição, com a barra fora da tela ou com "menos movimento": o aviso de sempre.
13. Conquista no ÚLTIMO nível da trilha (`tier: 'max'`): anel dourado (`--medal-gold`) passa 2 vezes e confete pequeno sai do ícone
    (`confeteDoIcone`, `shared/core/estado-trilha-desafios.js`). Os outros níveis continuam como antes. Escolha da dona: só no último.
14. Unidade recém-liberada: carimbo no ícone e halo, na lista e no Mapa, uma vez só; a tela rola até ela (`UNIDADE_RECEM_LIBERADA`,
    `marcarUnidadeLiberada` em `shared/core/trilha-licao.js`; `shared/trail-map.js`). Fica só na memória da página (nada gravado no progresso).
16/17. Janelas, menus e gavetas: entrada só com CSS; saída por uma cópia só de desenho (`.mov-fantasma`: sem id, inert, aria-hidden, sem clique)
    posta por `shared/janelas-movimento.js` no lugar da janela, que fecha de verdade na hora. Nenhum código de abrir/fechar mudou.
    Painel (janela nativa `<dialog>`): só a entrada.
12 (pedido novo da dona): na janela da sequência a chama balança de leve sem parar enquanto ela está no ar, e os dias estudados da semana
    se preenchem um a um (o de hoje por último, com carimbo e anel). Com "menos movimento", parados e prontos.

## Testes novos e ajustados
- Novo: `tests/animacoes/test_playwright.js` (40/40): menos movimento, +N, conquista no último nível, carimbo uma vez só, cópia das janelas.
- Ajustados (mudança de propósito, com data e motivo no próprio teste): `tests/paridade-sites/test_quase_iguais.js` e `quase-iguais-harness.js`
  (classe de movimento; par certo que some em 0,2 s), `test_desafios_css.js` (transition nomeada e regras do movimento.css), `tests/cores-marca/test_verde.js`
  e `tests/janelas-revisao/test_playwright.js` (medem depois de terminar a animação de entrada).
- `tests/css-comum/test_cascata.js` falha de propósito até a branch entrar na `main` (compara o CSS com o da `main`).

## Não feito
- 4 (barras de progresso por escala em vez de largura): 6 pontos do código e testes, sem ganho visível. Recomendação: deixar.
- De propósito sem animação: sidebar, pulso no nó atual do mapa, acordeões, troca de tema.

Prévia (privada): https://claude.ai/artifact/VWz2PXPd3Z1VVaGu2muVYw
