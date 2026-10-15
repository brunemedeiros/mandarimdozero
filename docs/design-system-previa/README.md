# Prévia comparativa de Design Systems (painel interno)

Gera a página que compara seis alternativas na mesma tela do painel da professora, com os tokens do site (paleta de cada idioma, fonte única Nunito). Contexto e decisão: `docs/levantamento-design-system-painel.md`.

Versão publicada (privada): https://claude.ai/artifact/LVKZUBhegthKLwHbtiFGmG

## Como recriar

Precisa de Node 20 ou mais novo, npm, Python 3 e internet.

```
bash docs/design-system-previa/montar.sh
cd docs/design-system-previa/ds/out && python3 -m http.server 8000
```

Depois abra http://localhost:8000/index.html. Leva cerca de 25 segundos. O resultado fica em `ds/out/` e não vai para o Git.

## O que está aqui

| Pasta ou arquivo | O que é |
|---|---|
| `estatico/index.html` | Página principal: abas, seletor de tela, idioma e tema, tabelas de comparação e recomendação |
| `estatico/brune.css` | Tokens do site (cores fr e zh, claro e escuro, raio, sombra, fonte). **Todas as alternativas leem daqui** |
| `estatico/game.css` | Peças de gamificação (sequência, XP, anel de meta, conquistas, ranking) e da galeria de componentes |
| `estatico/bridge.js` | Recebe idioma e tema da página principal e aplica nas telas |
| `ds/gen.py` | Gera a tela "Alunos" do Pico, daisyUI, Tabler e Open Props |
| `ds/gen2.py` | Gera "Detalhe do aluno" e "Componentes" dessas quatro |
| `build/src/` | Fontes React do shadcn/ui e do Material UI (as três telas de cada). `ui/` tem os componentes oficiais do shadcn (licença MIT, copiados do repositório `shadcn-ui/ui`) |
| `build/package.json` | Versões exatas: Pico 2.1.1, daisyUI 5.7.47, Tabler 1.6.1, Open Props 1.7.23, React 19.3, Material UI 9.5, Tailwind 4.3 |
| `montar.sh` | Instala, compila e monta tudo |

## O que não está versionado, de propósito

As bibliotecas baixadas, os JS compilados e o `ds/out/` somam cerca de 4 MB, e o GitHub Pages publica o repositório inteiro. Tudo isso é recriado pelo `montar.sh`.

## Como mudar algo

- **Cor, fonte ou raio:** edite `estatico/brune.css`. Cada idioma e tema tem o seu bloco.
- **Uma peça nova na galeria:** adicione o método na classe de cada biblioteca em `ds/gen2.py` (CSS) ou o componente em `build/src/*-comp.tsx` (React) e rode o `montar.sh`.
- **Texto das telas:** os dados de exemplo (alunos fictícios) estão em `ds/gen.py`, `ds/gen2.py` e `build/src/data.ts`.

## Limites

Tela estática com dados fictícios, sem menus suspensos, janelas reais nem gráficos. Os sites de documentação do Pico, daisyUI, Tabler, Open Props e Material UI não puderam ser abertos durante a montagem; contagens de componentes vêm dos pacotes do npm.
