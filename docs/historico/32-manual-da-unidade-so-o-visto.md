# 32. Manual da unidade (zh) só com o que a aluna já viu (2026-10-26)

Pedido da dona: o botão "📖 Manual da unidade" do zh mostrava a unidade inteira (vocabulário, frases e diálogo), inclusive
o que a aluna ainda não tinha visto. Agora mostra só o que já apareceu para ela naquela unidade. O fr não tem esse botão e
não muda (decisão da dona).

## Regra adotada

Função pura `unitSeenContent(unit, seen)` em `shared/core/trilha-licao.js` (sem STATE nem DOM, serve para qualquer site);
`unitSeenContentNow(u)` lê o estado do app e chama a regra. `zh/app.js` (`renderUnitSummaryHTML(u, seen)`) só desenha.

- **Tudo**: unidade concluída (inclui pulada por prova), releitura e revisão de lição (`STEP_STATE.lessonReview` da unidade).
- **Vocabulário**: palavras das lições concluídas (`unitProgress[id].lessonIdx`, o ponteiro real) + palavras já apresentadas
  na lição em andamento (`STEP_STATE.acq.introduced`, marcada quando o cartão da palavra aparece) + palavras da unidade com
  evidência de estudo (`studyWordHasEvidence`, cobre recarregar a página no meio da lição).
- **Frases**: a frase da unidade que aparece em "Na frase" no cartão de uma palavra já vista (mesma escolha de
  `findMatchingPhrase`: a primeira frase da unidade que contém a palavra, `LANG_HOOKS.phraseHasWord`). As demais frases só
  aparecem nos exercícios do Ponto de verificação, então entram com a unidade concluída.
- **Diálogo**: entra quando a lição que tem o diálogo foi concluída, ou quando a lição em andamento já passou do passo do
  diálogo (no próprio passo do diálogo ainda não entra).
- Seção sem nada visto não aparece. Nada visto: frase nova `zh.manual.empty` (classe `.unit-manual-empty`, cor `--ink-soft`).

Texto novo (para a dona aprovar):
- pt-BR: "Ainda não tem nada aqui: o manual vai sendo preenchido conforme você avança na unidade."
- en: "Nothing here yet: the manual fills in as you work through the unit." (confiança alta)

Observação: o botão fica dentro da lição, e ao abrir a unidade o 1º cartão já aparece; por isso, na prática, a frase de
manual vazio quase não aparece (fica como proteção).

## Provas

- `tests/zh-manual/test_playwright.js`: 35/35 com capturas (27/27 sem a pasta de capturas): regra pura com o conteúdo real
  (todas as unidades: todas as lições concluídas = todo o vocabulário), unidade nova, meio da 1ª lição (2 palavras), lição
  concluída, passo do diálogo (antes e depois), unidade concluída, revisão de lição, site em inglês sem português,
  capturas claro/escuro em 390 e 1200px sem rolagem horizontal.
- Regressão: paridade-sites `test_contrato_lang_hooks` 29/29, `test_css_compartilhado` 5/5, `test_quase_iguais` 2768/2768,
  `test_gramatica_cenario_zh_playwright` 54/54, `test_modulos_niveis_zh_playwright` 95/95; i18n `test_i18n_unit` 2343/2343
  (chave nova registrada em `NEW_KEYS`), `test_sem_portugues_en` 6/6; checkpoint-zh 25/25; modo-foco 19/19; e4
  `test_core_carregado` 55/55, `test_progresso_ida_e_volta` 26/26, lotes 5c 20/20, 5d 12/12, 5e 10/10; lote 5b 9/11 com as
  mesmas 2 falhas na origin/main (`review.match.attempts`, pré-existente).

## Grátis x Premium

Tudo grátis (o manual já era).
