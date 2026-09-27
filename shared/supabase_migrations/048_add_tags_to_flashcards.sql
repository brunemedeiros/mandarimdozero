-- Fase 7j (fechamento dos 3 gaps, ver CLAUDE.md) -- Tags são propriedade
-- NATIVA da Note (arquitetura consolidada "Decks, Tags e Painel", seção
-- 6/10: "Tags pertencem à Note... Tags são globais na conta e
-- compartilhadas entre idiomas"), nunca um armazenamento paralelo
-- específico do importador Anki -- por isso a coluna vai nas 2 tabelas
-- que já são "Note" nesta arquitetura (teacher_flashcards/own_flashcards,
-- mesmo par que já ganhou fields/card_generation_mode juntas na migration
-- 045), não só na que o import Anki grava hoje.
--
-- Aditiva/sem risco -- mesmo padrão de toda coluna nova já adicionada
-- nestas 2 tabelas: default seguro ('{}'), NOT NULL, nenhuma linha
-- existente muda de comportamento (fields/tags continuam independentes;
-- um cartão sem tag nenhuma é '{}', nunca NULL, pra nunca precisar de
-- checagem de null em quem lê `.tags` depois).
alter table teacher_flashcards add column if not exists tags text[] not null default '{}'::text[];
alter table own_flashcards add column if not exists tags text[] not null default '{}'::text[];

comment on column teacher_flashcards.tags is 'Tags normalizadas da Note (normalizeNoteTags, shared/flashcard-model.js) -- globais na conta, compartilhadas entre idiomas, pertencem à Note, nunca ao CardInstance.';
comment on column own_flashcards.tags is 'Tags normalizadas da Note (normalizeNoteTags, shared/flashcard-model.js) -- globais na conta, compartilhadas entre idiomas, pertencem à Note, nunca ao CardInstance.';
