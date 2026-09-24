-- Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md) -- valor
-- concreto do plano Premium: os mesmos 2 formatos ricos que só cartão de
-- PROFESSORA tinha até aqui (Fase 8a: imagem/áudio/múltipla escolha,
-- migration 032; Fase 8c: completar a frase, migration 034) passam a
-- existir também em student_flashcards (cartão autorado pela PRÓPRIA
-- aluna, Fase 5). Mesmas colunas, mesmo significado -- só replicadas pra
-- uma segunda tabela. Aditiva/sem risco, nenhuma linha existente muda.
--
-- `front` também vira nullable aqui, mesmo motivo/mesma migration-irmã de
-- allow_null_front_teacher_flashcards (035): um cartão "completar a frase"
-- não tem front/verso tradicional, todo o conteúdo mora em
-- cloze_sentence/cloze_answer -- exigir front forçaria dado morto.
alter table public.student_flashcards
  alter column front drop not null;

alter table public.student_flashcards
  add column if not exists image_url text,
  add column if not exists audio_url text,
  add column if not exists choices jsonb,
  add column if not exists cloze_sentence text,
  add column if not exists cloze_answer text,
  add column if not exists cloze_answer_pinyin text;
