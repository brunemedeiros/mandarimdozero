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

## Pendências fechadas (2026-10-12)

- **Dourado nas opções de múltipla escolha da lição**: `.exercise-option` (o formato mais comum) ainda usava
  `--imperial-gold` (rosa no fr) e valia no toque. Agora usa `--hover-gold` só com `@media (hover:hover)`, como cenário,
  speed review e cartão; opção respondida não reage ao mouse. Regra no bloco do fim do `<style>` (fr/zh).
- **Conferência visual** (fr/zh × claro/escuro + 390px): dourado ao passar o mouse, grade 2×2 (múltipla escolha e cenário)
  e painel "Errei" (resposta certa + tradução abaixo da linha tracejada + "Onde você já viu isso") OK. zh não tem cenário.
- Texto `toast.audioTapSpeaker`: "pra ouvir" virou "para ouvir" (regra do projeto; em `DELIBERATE_PT_CHANGES`).
- `tests/trilha/test_trail_state_model.js`: o sandbox ganhou `t` (só monta o texto do aviso, que é stub). 37/37.
- `tests/i18n/test_playwright.js`: "Meus Cartões" virou a janela Adicionar; o teste abre a janela (`openAddCardModal`) e,
  como hoje Premium não tem teto, força o caminho do teto para conferir só o texto. Achado e corrigido um bug real:
  `openFlashcardLimitModal` guardava o título/corpo do 1º uso e, depois de trocar o site para inglês, reabria em português;
  agora monta o texto padrão com `t()` a cada abertura. 209/209.
- `tests/k2h/test_playwright.js`: falhava também na main. Sair de uma sessão iniciada por um Deck volta para a tela
  daquele Deck (mudança deliberada, como no Anki), não para a tela de modos; asserção atualizada (escopo limpo, sessão
  escondida, tela do Deck aberta). 30/30.
- Regressão: trilha UI 86/86, celular 108/108, checkpoint zh 25/25, i18n unit 2107/2107, limite-corte 30/30 + 26/26,
  fase-f 50/50, deck-browser 206/206.

## Passada de design na Conjugação (fr, 2026-10-13)

Só CSS, num bloco "Conjugação: passada de design" no fim do `<style>` de `fr/index.html` (zh não tem Conjugação).

- Prática como página de livro de conjugação: pronome à esquerda do campo (itálico, alinhado à direita), singular
  (je, tu, il) numa coluna e plural (nous, vous, ils) na outra (`grid-auto-flow: column`; a ordem do DOM e do Tab não
  muda). Um tempo só ocupa a largura toda. A correção embaixo de um campo errado não desalinha a linha vizinha.
  No celular, uma coluna só (je ... ils).
- Verbo atual em destaque (32px, "Regular/Irregular" como selo); "Próximo verbo" vira cartão tracejado e leve.
- Escolha: tempos e grupos de verbos em listas agrupadas num painel (linhas de 44px, marcado com fundo leve),
  títulos sem caixa alta.
- Resultado da sessão num cartão.
- Teste novo `tests/conjugacao/test_playwright.js` (22/22; 8/22 sem a mudança). Regressão: trilha UI 86/86,
  celular 108/108, deck-browser 206/206, amigos 158/158, i18n navegador 209/209.
- `tests/i18n/test_i18n_unit.js` está 2090/2273 na main (chaves `rb.*` do Banco de Revisão sem registro no teste e
  comparação do HTML), igual sem esta mudança.

## Conjugação, fase 1 pedagógica (fr, 2026-10-13)

Decisões da autora: ordem dos tempos por modo (Présent, Passé composé, Imparfait, Plus-que-parfait, Futur simple,
Conditionnel présent, Subjonctif présent, Impératif), sem futur proche, sem o cartão "Próximo verbo", sem selo de
nível. Mapa da francofonia descartado. Jogos e busca de verbo ficam para as próximas fases.

- Correção (bug): passé composé e plus-que-parfait com être aceitam a concordância (allée, allés, allées); a correção
  mostra "allé(e)" / "allé(e)s" / "allé(e)(s)" (`conjExpectedInfo`). il/elle/on e vous aceitam as quatro formas.
- Subjonctif com "que": que je / que j' / que tu / qu'il / qu'elle / qu'on / que nous / que vous / qu'ils / qu'elles.
- Dado corrigido: s'asseoir tinha "assiss" no plural (`fr/conjugation-data.js`).
- Letras erradas em vermelho: depois de corrigir, o campo errado mostra o que foi digitado com só as letras erradas
  marcadas e um traço onde faltou letra (alinhamento por distância de edição, `conjAlign`, como no Jogo de Conjugações);
  a forma certa continua embaixo. Campo vazio mostra "—".
- Áudio em cada forma depois de corrigir, com o pronome ("nous parlons").
- Teclas de acento (as mesmas das lições) escrevem no campo com o cursor; Enter passa para o próximo campo e, no
  último, corrige; depois de corrigir, o foco vai para "Próximo verbo".
- Tamanho da sessão: 3, 5, 8 ou 12 verbos (8 marcado), com "≈ N formas para preencher". Barra de progresso ao lado de
  "Verbo i de N" (avança a cada verbo corrigido).
- Fim da sessão: "Formas para revisar (N)" com o que foi digitado (letras marcadas) e a forma certa, e
  "Praticar só os que errei" (só esses verbos, só esses tempos).
- Um tempo por linha (com vários tempos, duas tabelas lado a lado ficavam ilegíveis).
- A correção virou uma função só (`conjEvaluate`), usada ao corrigir e ao voltar a um verbo já corrigido.
- Textos novos (pt/en): `fr.conj.sessionSize`, `sessionForms`, `reviewTitle`, `practiceMistakes`.
- Testes: `tests/conjugacao/test_playwright.js` 37/37 (15 novos), `fr/scripts/test_answer_validation.js` 154/154,
  i18n unit 2040/2040, i18n navegador 209/209, celular 108/108.
- Pendente de decisão: "radical | terminação" em destaque (prévia comparativa enviada à autora).
