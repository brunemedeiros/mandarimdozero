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
- Peças com comportamento (selects, menus, diálogo, combobox, data, questionário, anexo, `PainelUI.toast/mensagem/confirmar/anexo`) vivem em `painel-ui.js` (IIFE, só `window.PainelUI`, eventos delegados, texto externo sempre via `textContent`). Teste em `tests/painel-ds/test_ui.js`.
- Botão primário: pílula, peso 800, fundo da marca com texto branco (igual às abas do Ranking). No francês claro isso dá 3,2:1 (abaixo de 4,5): exceção documentada, o teste de contraste tem piso 3. Alternativa de azul mais escuro está no guia, seção Botões.
- Fonte Nunito é hospedada (`shared/fonts/`), igual em todos os cursos; só a paleta muda.
- Em uso no app: `fr/index.html` e `zh/index.html` carregam o CSS do painel e `painel-ui.js` (a home não). Configurações (Geral/Notificações/Exportar) e as janelas da Revisão (Configurar, Adicionar, Painel, Exportar) estão no painel desde 2026-10-17 (`docs/historico/13-*`). A aba Alunos (`shared/teacher-students-ui.js` + `shared/admin-students.js`) é a primeira tela no sistema novo; texto visível sempre por `t()` (chaves `students.*`). O painel da professora ocupa a largura toda (regra `#app[data-active-tab="teacher-panel"]` nos dois index).
- Plural com zero: usar `tsuTp` (zero vai para a forma plural; o Intl em pt-BR diz "0 dia"). Dentro do app o `.painel` fica sem fundo próprio (`.panel-view .painel`).

## Prévia antes de implementar (decisão da autora, 2026-10-15)
Toda tela ou mudança visual nova passa por uma prévia (imagens com dados de exemplo, fr claro e zh escuro) que a autora
aprova ANTES do código. Banco de Revisão: fica com a aparência atual dentro do Cartões; a parte do aluno
(`review-bank-student.js`) fica para depois.

## Estética "janela rica" (padrão da autora, 2026-10-18)
Janelas de comunicação do aluno (confirmações, avisos, formulários curtos, conversão) seguem as imagens de referência da
autora, sempre com as cores de cada curso (nunca o roxo das imagens): título forte com subtítulo, ícone Fluent em
quadrado tingido (`.jp-icone`, tom por `.jp-tom-marca/ouro/verde/rosa`), blocos de informação tingidos (`.jp-bloco`),
opções com título e descrição (`.jp-opcao`), chips com ícone (`.jp-chip`), campos com ícone (`.jp-campo`) e botões
largos do mesmo tamanho. Peças no bloco "janela rica" dos dois index (classe `.janela-painel` no `.app-modal`).
Sem ilustrações grandes sem função; texto e ícones só com o que o produto faz de verdade. Avisos Premium/Limite seguem a
mesma linha (`docs/historico/13-*`). Prévia antes do código continua valendo para tela nova.
