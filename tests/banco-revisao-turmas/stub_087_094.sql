-- Stub mínimo de Turmas (087) e do helper da 094, só para rodar a suíte antiga do Banco (stubs de tests/papeis-permissoes)
-- com a 096 por cima. A suíte completa com as migrations reais é run.sh.
create table if not exists public.classrooms (
  id bigint generated always as identity primary key,
  teacher_id uuid not null, language_app_key text not null, name text not null, join_code text unique,
  created_at timestamptz not null default now());
create table if not exists public.classroom_members (
  classroom_id bigint not null references public.classrooms(id) on delete cascade, student_id uuid not null,
  added_at timestamptz not null default now(), primary key (classroom_id, student_id));
create or replace function public._teacher_owns_classroom(p_classroom_id bigint, p_language_app_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classrooms c
                  where c.id = p_classroom_id and c.teacher_id = auth.uid() and c.language_app_key = p_language_app_key);
$$;
