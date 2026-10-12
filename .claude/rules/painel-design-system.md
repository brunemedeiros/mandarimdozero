---
paths:
  - "shared/painel/**"
  - "scripts/painel-ds/**"
  - "tests/painel-ds/**"
  - "docs/design-system-previa/**"
---

# Design System do painel (Pico CSS escopado)

Histórico e decisão: `docs/historico/15-*`, `docs/levantamento-design-system-painel.md`. Catálogo: `shared/painel/guia-de-estilo.html`.

- Tudo do painel vive dentro de um elemento `.painel`. Ordem de carga: `vendor/pico.painel.css`, `painel-tokens.css`, `painel-componentes.css`.
- `vendor/pico.painel.css` é GERADO (`scripts/painel-ds/escopar-pico.mjs`): nunca editar à mão.
- Cor nunca escrita à mão: só tokens `--p-*` (que leem os tokens do site). Fonte única: `--font-body`, nunca `--font-display`.
- Peça nova entra primeiro no guia de estilo e só depois nas telas; classes do painel usam o prefixo `p-`.
- Mudou token, cor ou componente: rodar `bash tests/painel-ds/run.sh` e olhar fr/zh x claro/escuro (e 390px).
- `guia-paletas.css` é cópia das paletas só para o guia; `test_tokens.js` falha se divergir de `fr/index.html` e `zh/index.html`.
- Gamificação (sequência, XP, conquistas) é do site do aluno, não do painel.
