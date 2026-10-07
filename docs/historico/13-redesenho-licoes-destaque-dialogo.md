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
