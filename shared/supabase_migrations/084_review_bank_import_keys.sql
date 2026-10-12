-- Banco de Revisão, parte 4: índices únicos COMPLETOS para o upsert da importação (PostgREST `on_conflict` não
-- consegue inferir índice parcial; os da 082 eram `where import_key is not null`). NULLs são distintos num índice
-- único, então itens e alunos criados à mão (sem import_key) continuam livres.
-- Aditiva e idempotente; nenhum DROP (os parciais da 082 ficam, redundantes e inofensivos).
create unique index if not exists review_bank_students_import_key_uq on public.review_bank_students (teacher_id, import_key);
create unique index if not exists review_bank_items_import_key_uq on public.review_bank_items (bank_student_id, import_key);
