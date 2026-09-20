-- Fase 3 do sistema de alunas particulares (ver CLAUDE.md) -- integração
-- com revisão. Achado ao auditar o motor do zh antes de mesclar cartões de
-- professora em STATE.cards: diferente do fr (cards com um único campo
-- `front`), o zh guarda hanzi/pinyin/tradução em TRÊS campos separados
-- (`front_pinyin`, `back_hanzi`, `back_trans` -- ver buildCardsFromUnits()
-- em zh/app.js) porque o flashcard de revisão do zh sempre mostra o pinyin
-- junto do hanzi, nunca um sozinho. `teacher_flashcards` (migration 026)
-- só tinha `front`/`back_trans`/`note` -- suficiente pro fr, mas um cartão
-- de mandarim sem pinyin quebraria essa exibição (o pinyin apareceria
-- vazio/"undefined"). Coluna nova, opcional (só usada quando
-- language_app_key='mandarim'; fr/português nunca a leem).
alter table public.teacher_flashcards
  add column if not exists front_pinyin text;
