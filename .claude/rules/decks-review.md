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
- Id do cartão da trilha = chave estável do item (`studyItemCardId`: `u{k}` em fr e zh; item sem `k`, regra antiga por posição);
  nunca montar `u${unit.id}-v${idx}` na mão. Fusão/exclusão: `<site>/curriculum-changes.js`; arquivo `STATE.retiredStudyCards`;
  marca `released` no portão. Carregar/salvar com mudanças de currículo: `shared/core/curriculo-progresso.js` (as duas
  `applySerializedState`/`serializeState` chamam; nunca copiar no app.js). Testes: `tests/curriculo-ids` (livro-razão
  `<site>/published_ids.json` bloqueia id perdido).
  Course Deck de unidade que saiu do conteúdo: fica no banco (vazio) e escondido na tabela (`deckBrowserUnitVisible`).
- Cartões da professora (origin 'teacher') ficam FORA da Revisão geral (pool, tabela de Decks, Painel, opção de origem):
  só na aba Aluno > Revisão (`startClassReviewSession`, `STATE.reviewSessionClassReview`, rota `#/review/class`). 2026-10-14.
- Tela da Revisão: tabela estilo Anki (`shared/deck-browser.js`), Painel em janela, rotas `#/review/decks/...`.
- Memória FSRS (P1, 2026-10-29): trilha por CURSO (bloco do curso); professora e próprios por IDIOMA ESTUDADO em `progress.data._lang[<appKey>]`,
  com espelho em `cards` de cada bloco do idioma. Carregar/salvar passam por `shared/lang-card-memory.js` (fica a cópia de mais revisões); nunca
  ler/gravar essas entradas direto do bloco. Recomeço que zere essa memória tem de zerar `_lang` e todos os blocos juntos. `docs/p1-memoria-por-idioma.md`.
