# 39. Passaporte de estudos e conquistas como selos (2026-11-11 a 2026-11-25)

Pedido da autora: aplicar a skill `frontend-design` ao Perfil > Visão geral. Várias prévias (v1 a v6) até a aprovação.

## Decisões da autora
- **Visão geral = passaporte**: foto como retrato de documento, nome e @, bio, linha picotada, campos "Dias seguidos" e
  "XP acumulado", um **carimbo por idioma** (cor da marca; mais claro no tema escuro) e a barra **"Rumo ao próximo nível"**
  (= unidades do nível atual completadas, `computeProgressSummary().pct`).
- **Conquistas como selos** (`shared/selos.js`, `shared/selos.css`):
  - formato = qual trilha (16 formatos, `SELO_POR_TRILHA`; ex.: escudo = Revisão, selo postal picotado = Nível A1);
  - cor da borda = nível, **escala B** (aprovada em 2026-11-24): bronze, prata, esmeralda, safira, ametista, rubi;
    **ouro é sempre o nível máximo** (tabela por número de níveis em `SELO_ESCALA`). Escalas A (só metais) e C (graus II/III)
    foram rejeitadas por terem cores vizinhas parecidas;
  - borda preenchida = progresso até o próximo nível; **nível máximo = selo inteiro em ouro** (como o Duolingo);
  - ícone com as cores originais, sem o círculo da medalha; nome reto, "Nível N de M" numa faixa da cor do metal (contraste >= 4,5:1);
  - **data só nas conquistas novas**: as gravadas em lote têm a data fictícia `BADGE_BACKFILL_EARNED_AT` (2026-10-01) e ficam sem data;
  - inclinação de carimbo (sem animação), igual no celular e no computador.
- **Progresso**: só o ícone do cartão da trilha vira o selo pequeno; barra e meta continuam. Etiqueta do nível na cor do selo.
- **Perfil público**: mesmos selos; sem dado de progresso da outra pessoa, a borda fica cheia.
- Grátis x Premium: tudo grátis.

## Técnica
- Cores = tokens `--selo-<metal>-1..3` e `--on-selo-<metal>` nos três blocos de tema; os gradientes do SVG leem os tokens.
- Conteúdo dentro do selo garantido por medição (`isPointInFill` na borda de dentro), nos 16 formatos e em todos os estados.
- Testes: `tests/selos/test_selos_playwright.js` (152/152). Paridade: `SELOS_PERFIL` em `tests/paridade-sites/test_quase_iguais.js`.
- De passagem: o nome exibido no Perfil passou a ser escapado (`escapeHTML`).
