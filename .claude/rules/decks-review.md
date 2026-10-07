---
paths:
  - "shared/deck-*.js"
  - "shared/review-extras.js"
  - "shared/study-queue.js"
  - "shared/srs.js"
  - "shared/fsrs.js"
  - "shared/study-trail-model.js"
  - "shared/tag-manager.js"
  - "shared/trail-*.js"
---

# Decks, Review e FSRS

Fonte de verdade: `docs/arquitetura-total-decks-tags-painel.md` (30 invariantes, seção 38). Histórico: `docs/historico/07-*`, `12-*`.

- Deck pertence à Note (`deck_id`); kinds `root`, `personal_root`, `personal`, `course`, `teacher_root`, `teacher`.
  `teacher_root`/`root`/`personal_root` nunca movem/apagam; triggers 054/055 protegem Teacher Decks e exigem vínculo ativo.
- Deck Engine é puro (`shared/deck-engine.js`); acesso a dados em `shared/deck-data.js`. Escopo de Deck =
  Deck + subárvore, como PRÉ-FILTRO de `getStudyQueue()`; nunca reescrever a fila.
- Estados (fonte única `cardStudyBucket`): New = sem histórico; Learning = learning + relearning; Review = due.
  "Errei" = meia-noite seguinte (regra de produto, PR #219).
- Sessão iniciada por Deck ignora `reviewOriginFilter`; filtro de tag não se aplica mais à sessão (só ao Painel).
  Contagens de Deck são estruturais (sem filtros de sessão).
- Trilha: Course Decks por unidade (`course_unit_id`), cartões "Na frase" (1 por frase de exemplo, ids `u{u}-p{i}`/
  `u{u}-d{i}`), tags derivadas não salvas. Cartão só entra na revisão quando a lição terminou (`isCardLessonCompleted`).
- Tela da Revisão: tabela estilo Anki (`shared/deck-browser.js`), Painel em janela, rotas `#/review/decks/...`.
