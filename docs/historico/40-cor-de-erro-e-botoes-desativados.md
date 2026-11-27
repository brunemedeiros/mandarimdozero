# 40. Cor de erro legível e botões desativados em cinza (2026-11-27)

Origem: dois posts que a autora mandou sobre desenho de formulário (cor de erro que se lê; botão desativado
"apagado" que não diz o motivo). Prévia aprovada pela autora em 2026-11-27; publicado pelo PR #536
(publicação do GitHub verde, conferido no ar em app.profbrune.com.br no mesmo dia).

## Decisões da autora
- **Cor de erro em texto**: `var(--error-red-text)` (claro #B81F13, escuro #FF6B5C), nunca o `--error-red` puro, que no
  painel rosado do erro dava 3,6 a 4,1:1 (abaixo do mínimo de 4,5). O ✕ (ícone) continua no `--error-red` puro.
  Trocados 12 textos: `.wrong-feedback-header` (fr, zh), `.reorder-attempt-w.bad` (fr), `.deck-overview-danger` (fr, zh),
  `.uchoice-status.is-bad` (fr, zh), `.age-ack-note.err`, `.cg-verdict.no` (Conjugação), `.cloze-grammar-msg` (Desafios),
  `.dictation-sentence-flag` (Ditados), `.conj-x` (resposta riscada; o fundo rosado continua).
- **Botão desativado** = cinza sólido + texto cinza legível, nos dois temas, em vez de transparência. Tokens novos
  `--disabled-fill` / `--on-disabled-fill` nos 3 blocos de tema de `fr/index.html`, `zh/index.html` e `index.html`
  (texto sobre o cinza: 5,2 a 5,8:1). Aplicado em `.btn`, Excluir conta, tamanho do Combinar, confirmação de idade,
  Recomeçar o curso, Banco de Revisão (`.rb-btn`, notas da espiada) e botões do painel (Pico; ficam de fora os
  "sem caixa": ⋯ e as faixas da Visão Geral).
- **Cadastro e confirmação de idade**: o botão fica SEMPRE ligado; tocar sem a caixinha mostra
  "Marque a caixinha para continuar" (`gate.signup.ageAckRequired`, `ageAck.required`; en "Tick the box to continue.")
  e marca a caixinha em vermelho (`.cad-idade.is-invalid`, `.age-ack-label.is-invalid`, `aria-invalid`).
- **Recomeçar o curso e Excluir conta**: o botão continua desativado (ação sem volta), cinza, e uma linha embaixo diz o que falta
  (`.btn-motivo`; `restart.modal.hint`, `accountDelete.modal.hint`); a linha some quando o botão libera.
- Grátis x Premium: tudo grátis. Sem banco, Edge Function ou configuração.

## Testes (2026-11-27)
i18n 2333/2333, csp 12/12, paridade css 5/5, visual da lição 34/34 (expectativa do cabeçalho do erro trocada de propósito),
conta-excluir 20/20, login-obrigatorio 127/127, entrada bilíngue 166/166, janela de idade 42/42, painel-ds (tokens 88/88,
contraste 131/131, playwright 194/194), Conjugação 344/344, planos 105/105, consentimento 77/77, fase-f 50/50, jogos 224/224,
cores-marca (todas verdes).

## Conserto do teste do Recomeçar o curso (mesmo dia)
`tests/recomecar-curso/test_playwright.js` dava 3/4 já antes (também na `main`): a janela "Uma confirmação rápida"
(confirmação de idade, `shared/age-ack.js`) abria por cima da tela e cobria o botão "Recomeçar este curso", porque a conta
de teste nunca confirmou a idade. O teste agora dispensa essa janela na visita (`sessionStorage['age-ack-later']`) e espera
a transição de cor do botão (~0,2 s do Pico, do cinza ao vermelho) antes de medir. Resultado: 220/220.

## Cartões da Revisão e caixinhas do painel (2026-11-27, 2ª rodada)
Prévia vista pela autora; decisões:
- **Cartões da Revisão (Praticar)**: NADA de cinza ("não gostei de tudo cinza"); o cartão continua apagado como antes, mas o
  motivo vai no lugar da descrição e fica legível (só o ícone, o nome e o número ficam apagados): "Nenhum cartão para hoje"
  (`review.mode.speed.empty`), "Ainda não tem cartões difíceis" (`review.mode.hard.empty`; se alguma palavra já saiu da lista,
  continua "Já saíram da lista: N"), "Precisa de 10 palavras" (`review.mode.match.needWords`). Inglês: "No cards for today",
  "No hard words yet", "Needs {n} words".
- **Caixinhas e chavinhas do painel**: cinza só no que NÃO dá para clicar (pergunta da autora: "se é só liga/desliga, não precisa
  ser cinza"). Na tabela de Notificações: "Celular" num aviso que não vai ao celular, "E-mail" num aviso só por e-mail etc.; a
  marcada continua com o ✓, em cinza escuro. Chavinha fica cinza só no instante em que está salvando. As que ligam e desligam
  não mudaram. CSS em `shared/painel/painel-componentes.css`.
- Testes: i18n 2333/2333, painel-ds (88/88, 131/131, 194/194), revisao-proposta-a 60/60, quase iguais 2770/2770 (marcador
  novo para a descrição x motivo dos três modos, com data e motivo), push-convite 58/58, configuracoes 27/27, csp 12/12,
  recomecar-curso 220/220. `tests/k2f/` (falta o `sql.js` no ambiente) e `tests/deck-browser/` (tempo esgotado) já falhavam
  antes, igual na `main`.

## Testes de Decks e k2f consertados (2026-11-27, pedido da autora)
Os dois falhavam também na `main`, por mudanças posteriores a eles (nada de defeito para a aluna, salvo o item 4):
1. **k2f, bibliotecas**: os 3 testes de navegador buscavam sql.js e JSZip numa pasta temporária de uma sessão antiga
   (`/tmp/claude-0/k2f/node_modules`). Agora usam as cópias do próprio site em `shared/vendor/` (fixadas na auditoria).
2. **k2f, Revisão rápida**: desde 2026-11-13 as opções têm o número do atalho (1 a 4); o teste lia "olá 1" e errava a resposta.
   Lê o texto sem o `.kbd-hint`. O teste de unidade passou a carregar as funções do Combinar com áudio (2026-11-14).
3. **k2f, importação do Anki**: injetava a JSZip como código solto e buscava o `.wasm` em outro endereço; a lista de segurança
   da página (CSP, 2026-11-25) barra as duas coisas. Usa o que o site já carrega.
4. **Decks, Esc no Painel** (conserto no SITE, `shared/deck-browser.js`): a regra "Esc só fecha a janela de cima" contava a
   cópia de animação de saída (`.mov-fantasma`, 0,15 s, histórico 38) como janela aberta; quem reabrisse o Painel nesse
   instante não conseguia fechar com Esc. Agora o fantasma é ignorado.
5. **Decks, celular**: a largura da janela era medida durante a animação de entrada (cresce de 96% a 100%); mede `offsetWidth`.
Resultados: k2f 34/34, 52/52, 32/32, 58/58, 60/60; deck-browser 208/208; revisao-ajustes 48/48, janelas-revisao 40/40,
revisao-proposta-a 60/60, animações 40/40, quase iguais 2770/2770.
