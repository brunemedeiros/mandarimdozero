-- Banco de Revisão, parte 3: agendamento do Récap da professora e modo de cada resposta do Modo aula.
-- Aditiva e idempotente; nenhum DROP. O agendamento do Banco (nível, próxima data, último resultado) é DA PROFESSORA
-- e serve para montar o Récap; é independente do FSRS do aluno (esse vive só em progress do aluno).
-- Desfazer (manual): remover as colunas abaixo.
alter table public.review_bank_items
  add column if not exists level integer not null default 0 check (level between 0 and 9),
  add column if not exists due_date date,
  add column if not exists last_result text check (last_result is null or last_result in ('acertou', 'ajuda', 'errou')),
  add column if not exists last_review_date date;
create index if not exists review_bank_items_due_idx on public.review_bank_items (bank_student_id, due_date) where status = 'aprovado';

alter table public.review_bank_reviews
  add column if not exists mode text check (mode is null or mode in ('recap', 'ultima', 'erros')),
  add column if not exists review_date date not null default current_date;
create index if not exists review_bank_reviews_date_idx on public.review_bank_reviews (bank_student_id, review_date desc);
