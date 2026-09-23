-- Prompt-mestre "7 propostas" (ver CLAUDE.md) -- Prop 1+2 (seletor de
-- direção: qual lado do cartão é o idioma estudado) + Prop 4 (editar um
-- cartão reinicia o progresso de revisão, via troca de id -- ver
-- flashcardIdForRow() em fr/app.js e zh/app.js).
--
-- front_is_target_language: default `true` preserva o comportamento de
-- todo cartão já existente (front sempre foi presumido = idioma
-- estudado). zh nunca lê este campo (par hanzi/pinyin inseparável, sem
-- back_pinyin pra completar a inversão) -- gravado por consistência de
-- schema, não por uso real do lado zh.
--
-- revision: default `0`. O id do cartão em STATE.cards só ganha o sufixo
-- `-r${revision}` quando revision > 0 (ver flashcardIdForRow) -- editar
-- um cartão pela primeira vez muda o id, o que faz applySerializedState()
-- descartar o progresso salvo sob o id antigo (mesmo mecanismo de
-- merge-por-id da Fase 0 desta feature) sem precisar de nenhum código de
-- "resetar progresso" dedicado.
alter table public.teacher_flashcards
  add column if not exists front_is_target_language boolean not null default true,
  add column if not exists revision integer not null default 0;

alter table public.student_flashcards
  add column if not exists front_is_target_language boolean not null default true,
  add column if not exists revision integer not null default 0;
