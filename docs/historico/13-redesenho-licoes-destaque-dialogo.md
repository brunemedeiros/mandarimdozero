# Histórico: redesenho das lições (Onda 0/5) e regra de destaque no diálogo

> Trazido da branch `claude/optimistic-ramanujan-tercxc` (ainda não mergeada na main) em 2026-10-07, texto original.

## Onda 0/5 do redesenho das lições -- atualização (2026-10-07)

- **Nunito**: o fr já carregava os 4 pesos locais (`shared/fonts/nunito-latin-*.woff2`); o zh agora também (antes era só `local('Nunito')`). Anton foi abandonada (não existe no código).
- **Pinyin acima do hanzi** (decisão da autora, vale para zh): balões do diálogo, opções e bolhas da micro-checagem agora põem `.dlg-py` antes de `.dlg-hz`.
- **"Ordene a frase" no zh** igual ao fr: modos alternados `translate` ("Traduza para o chinês", só o português) e `order` (tradução + áudio + dica), com dica própria no modo `translate`. CSS `.reorder-target`/`.reorder-wrap-hint`/`.prompt-translation` copiado para `zh/index.html`.
- Ondas 3 (família de opções) e 6 (conclusão) seguem sem decisão; testado visualmente só a unidade 3 (claro/escuro); as 18 unidades passam em teste automático de renderização.

## Regra do diálogo: palavras da unidade ficam em COR, nunca sublinhadas (todos os idiomas)

Decisão da autora (2026-10-07), vale para francês, chinês e qualquer idioma futuro.

- Nos balões de diálogo, as palavras do vocabulário da unidade são destacadas com **cor + negrito** (classe `.dlg-new`, cor `var(--seal-red-dark)`, a cor de destaque do idioma). **Nunca sublinhado.** Sublinhado fica reservado a "faltou pontuação" (ditado) e "bloco certo no lugar errado" (Ordene a frase).
- Se o idioma mostra uma transcrição (pinyin no chinês; romanização/furigana em idiomas futuros), a **transcrição das palavras destacadas também recebe o destaque** (`.dlg-new-py`, mesma cor), em vez de só o texto original. A transcrição vem agrupada por palavra, então o alinhamento é por busca da transcrição do vocabulário (ver `dlgHighlightPinyin` em `zh/app.js`), nunca por posição.
- A legenda abaixo do diálogo diz "As palavras coloridas são do vocabulário desta unidade. Toque numa delas para ver o significado."
- Toque numa palavra destacada continua mostrando o significado (`data-tr`). Contraste conferido em claro e escuro (a cor vem de token, não de hex fixo).
- Ao criar o diálogo de um idioma novo: reutilizar `.dlg-new`/`.dlg-new-py` do CSS, não criar outro estilo de destaque.

## Opções de resposta e painel "Errei" padronizados (2026-10-07)

- **Hover das opções (só desktop, `@media (hover:hover)`)**: dourado em todas as opções (múltipla escolha, cenário, speed review, pergunta da história no zh). Token `--hover-gold` nos 3 blocos de tema de fr e zh (fr não usa `--imperial-gold`, que lá é rosa); borda dourada + fundo `color-mix` 14%.
- **Múltipla escolha e cenário em grade 2×2** a partir de 600px; no celular continuam em lista.
- **Painel "Errei" com um padrão só** (decisão da autora: resposta certa + onde já viu + tradução abaixo da linha tracejada, como o "Complete a frase"): cenário (fr), vocabulário de palavra solta (fr/zh) e frase genérica (fr) passaram a usar `.feedback-correct-line` + `.feedback-phrase-trans`. Verdadeiro/falso continua com o `whyNote`.
- **Merge com a main (i18n)**: textos do redesenho passaram por `t()`; chaves novas em pt-BR/en: `lesson.step.dialogueCheck`, `lesson.vocabDots.aria`, `feedback.label.yourAnswer`, `zh.exercise.translateToChinese`, `zh.reorder.tapHint` (en confiança alta). `tests/i18n/test_i18n_unit.js` ganhou `PREV3` (ponta desta branch, 8631db5) e `MAIN3` (main no merge, a88d0d3): o HTML atual precisa ser o merge de 3 vias das duas pontas, com cada conflito resolvido como "nosso", "deles" ou os dois. Resolução: toast da main; CSS de reorder desta branch + CSS da Revisão da main; botão de tom do zh com 44px (desta branch).
- Testes: i18n unit 2107/2107; trilha UI 86/86, mobile shell 108/108, helpers 6/6, histórias zh 4/4; checkpoint zh 25/25. `tests/i18n/test_playwright.js` dá timeout também na main (pré-existente). Visual claro/escuro do hover/2×2/painel ainda não conferido no navegador.
