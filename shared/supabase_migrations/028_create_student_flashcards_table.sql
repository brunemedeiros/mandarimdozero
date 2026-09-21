-- Fase 5 do sistema de alunas particulares (ver CLAUDE.md) -- cartão
-- autorado pela PRÓPRIA aluna (diferente de teacher_flashcards, migration
-- 026, onde quem autora é a professora). Mesmo par de decisões já usado lá:
-- status 'active'/'archived' em vez de delete físico (arquivar não pode
-- apagar progresso de memória já acumulado no cartão, mesma regra geral do
-- prompt-mestre desta feature); RLS restrita ao dono.
create table if not exists public.student_flashcards (
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances','mandarim','portugues')),
  front text not null,
  front_pinyin text,
  back_trans text not null,
  note text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

alter table public.student_flashcards enable row level security;

-- Só a própria aluna lê/escreve seus cartões -- diferente de
-- teacher_flashcards (onde escrita é só admin), aqui a autora É a dona.
create policy student_flashcards_owner_all
  on public.student_flashcards
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
