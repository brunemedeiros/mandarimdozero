# Teclado na Revisão da aluna (2026-11-05)

Pedido da autora (grilling + prévia aprovada). Mesmo código para fr e zh (e pt, quando existir): `shared/core/revisao-cartoes.js`
(`wireReviewKeyboard`), `shared/core/app-comum.js` (um só listener), `shared/core/licao-base.js` (Enter no "Continuar"), CSS em `shared/revisao-teclado.css`.

**Decisões**
- Espaço e Enter mostram a resposta do cartão Normal; depois de revelar não fazem nada (nota por reflexo é erro).
- Números pela POSIÇÃO do botão na tela: 4 notas = 1 Errei, 2 Difícil, 3 Bom, 4 Fácil; digitar/lacuna com acerto em cheio (só Bom e Fácil) = 1 Bom, 2 Fácil
  (3 e 4 não fazem nada); múltipla escolha = 1 a 4 nas opções (antes de responder).
- Telas com "Continuar" (digitar com erro/quase, depois da múltipla escolha): só Enter aciona (Espaço não, para não pular a correção sem ler).
- Só números: sem setas e sem `h`. O Modo aula da professora (`rbcKey`) não foi mexido.
- Proteção: tecla segurada (`e.repeat`) ignorada; nenhuma tecla vale nos primeiros 300 ms de cada cartão/tela nova (o clique segue imediato).
- Visual: número em cada botão e opção, etiqueta "Enter" no Continuar e dica "Espaço mostra a resposta" no lugar de "toque para ver a resposta",
  tudo só com mouse e teclado de verdade (`@media (hover:hover) and (pointer:fine)`); no celular nada muda.
- Preview do editor (`__isPreviewCard`) e Revisão escondida nunca respondem às teclas.
- Grátis: tudo. XP não muda. Texto novo: `review.pressToReveal` (pt-BR e en).
- Fora desta entrega: desfazer a última nota (medir antes se nota errada é problema).

**Testes**: `tests/teclado-revisao/test_playwright.js` (fr e zh, 66 verificações).
