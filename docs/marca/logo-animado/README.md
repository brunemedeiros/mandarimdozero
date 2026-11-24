# Logo animado "duas cobrinhas"

Escolhido pela dona em 2026-11-24 (versão 5, velocidade "devagar", repetindo): a cobrinha azul sai de baixo, sobe a haste,
contorna a barriga de cima e chega ao topo; dali a rosa desce, contorna a barriga de baixo e fecha o "B". As duas andam na
mesma velocidade. Ciclo de 3,85 s: 1,27 s azul, 1,33 s rosa, 0,9 s pronto, 0,35 s some.

| Arquivo | Para que serve |
|---|---|
| `prof-brune-B-animado.svg` | Só o "B", fundo transparente, qualquer tamanho (abre no navegador) |
| `prof-brune-logo-animado.svg` | "B" com @prof.brune, fundo transparente |
| `*.gif` | Repete sem parar, fundo bege do site (#FAF5EA) |
| `*.mp4` | 3 voltas (11,6 s), fundo bege, para redes sociais |

No site: a tela de abertura de `fr/index.html` e `zh/index.html` (`#login-screen`) usa o mesmo desenho, embutido (sem script
nem biblioteca). Quem pede menos movimento no aparelho vê o "B" pronto e parado.

Regerar os SVGs: `python3 scripts/gerar_logo_animado.py`. Para MP4/GIF, tirar os quadros (30 por segundo) com o
Playwright usando `svg.pauseAnimations(); svg.setCurrentTime(t)` e juntar com o `ffmpeg`.
