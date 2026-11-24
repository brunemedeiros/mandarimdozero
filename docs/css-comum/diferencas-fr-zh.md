# Diferenças de estilo entre fr e zh: levantamento e decisões (2026-11-10 a 2026-11-24)

Levantamento feito antes do plano `docs/css-comum/plano.md`, para não levar para `shared/` uma diferença que era esquecimento.
Comparação por nome de regra (seletor), dentro dos `<style>` de `fr/index.html` e `zh/index.html`, incluindo as regras de
dentro de `@media`. Base: `main` em `dacbf67` (2026-11-10).

Resultado: 335 nomes diferiam. 68 existiam nos dois com valores diferentes, 44 só no fr, 223 só no zh.

## A. De propósito: identidade visual de cada site (continua diferente)

Cores e degradês da marca (fr azul/rosa/roxo, zh vermelho/dourado): paleta `:root` (claro e escuro), fundo da página e da
tela de login (hoje só mostra "Redirecionando…"; a mancha de cor quase não aparece), pílulas 🔥 e ⭐ do topo (mesma forma,
só a cor muda), faixa da fase de aquisição, bloco final da gramática, título do bloco de gramática, aviso de revisão no fim
da lição, brilho do cartão de Revisão, mapa de calor do Progresso, área do gráfico, faixa de visitante.
**Decisão da autora (2026-11-15):** a cor continua por site, mas a regra não precisa ser repetida: no plano do CSS ela vira uma
só em `shared/` e cada site informa a sua cor por variável.

## B. De propósito: escrita do idioma (continua diferente)

- zh: 188 regras só do chinês: hanzi (57), histórias (35), pinyin (29), radicais (18), busca de vocabulário (15), Manual da
  unidade (12), traços (8), Frase completa (8), tons (6); mais o vocabulário em tabela e o diálogo antigo do `zh/app.js`.
- fr: textos em francês maiores, teclado de acentos, lacuna e blocos mais largos para palavras latinas.
- zh: opções com pinyin em cima do hanzi; letra própria do hanzi.
- fr: Ponto de verificação e Revisão do módulo com bordas próprias no mapa. Quando o zh tiver módulos, essas regras precisam
  valer lá também (o lugar certo é `shared/modulos-niveis.css`).

## C. Vermelho de erro com nomes trocados: FEITO

No zh, "errado" usava a cor da marca (vermelho mais escuro) e havia uma linha que forçava `--error-red` a ser a cor da marca.
**Decisão (2026-11-15):** o zh usa a cor de erro do fr. Feito: 22 regras (opção errada em todos os exercícios, painel de erro,
barra de tempo, palavra fraca, mensagens de erro do Perfil, do login e da exportação, "Sair" no menu, apagar selo no Admin),
`--error-red-text` criado no zh e o guia do painel (`shared/painel/guia-paletas.css`) atualizado.

## D. Esquecidos (conserto feito num site só): FEITO

| Item | Decisão da autora (2026-11-15) | Como ficou |
|---|---|---|
| D1. Topo no celular | Sugestão dela: tirar o nome do idioma no celular, a bandeira basta | Até 480 px só o logo (o nome continua para leitor de tela); sino, ⚑ e bandeira redondos com 44 px; nada cortado em 360 px. Antes: fr achatava o sino e a ⚑ (30 px); zh cortava a bandeira |
| D2. "Não sei" do ordene a frase | Igualar pelo fr | Botão com borda também no zh |
| D3. Rótulo do painel de erro ("Por que não foi essa", "Resposta") | Cinza nos dois; só o título fica vermelho | `.wrong-feedback-why-label` cinza nos dois |
| D4. Continuar do acerto e do erro | Sem o degrau azul; sombra num tom mais escuro do próprio botão | Degrau verde-escuro e vermelho-escuro (mesma receita do `.btn-primary`); fundo fixo nos dois temas (`--error-fill` novo; antes, no escuro do fr, o vermelho claro com texto branco tinha pouco contraste) |
| D5. Negrito nas explicações | Na cor de destaque de cada site | Azul no fr, vermelho no zh |
| D6. Medidas pequenas | Igualar | Nome no balão do diálogo (64 px) e espaço da cena do verdadeiro ou falso. Mantido de propósito: espaço abaixo da meta da unidade no zh (lá tem o botão "Manual da unidade") |

## E. Sobras sem uso: FEITO

- zh: 10 regras apagadas (indicador antigo de "salvando…", marca antiga do login, cartão dos Desafios, aviso antigo da
  Revisão rápida, nome do diálogo do fr, cor base dos botões de nota).
- fr: a tabela de nota de gramática do painel de erro **não foi apagada** (a autora quer poder usar tabela de verbos ali): foi
  para `shared/licao-feedback.css` e vale para todos os sites. Conferido no banco de produção em 2026-11-15 (só leitura):
  nenhum Desafio, cartão, item do Banco ou material usa essa tabela hoje.

## Provas

- Capturas antes x depois (claro) e depois (escuro), fr e zh, celular: topo, painel de erro, painel de acerto, explicação,
  ordene a frase; 0 erros de página.
- Regressão antes e depois: 36 arquivos de teste, todos passando (o `tests/painel-ds/test_tokens.js` acusou o guia do painel
  com a cor antiga e foi corrigido no mesmo PR).
- Guarda nova: `tests/paridade-sites/test_visual_licao_topo.js` (34/34; a versão de antes dá 11/34).
