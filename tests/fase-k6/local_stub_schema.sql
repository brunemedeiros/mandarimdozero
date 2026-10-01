-- K.6 -- schema MÍNIMO só para rodar a RPC num Postgres local (fora do Supabase).
-- Reproduz apenas o que get_teacher_student_metrics usa: auth.uid(),
-- teacher_students, teacher_flashcards, progress. NÃO é o schema real.
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as
$$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $$;
create table if not exists teacher_students(
  id bigint generated always as identity primary key,
  teacher_id uuid not null, student_id uuid not null, language_app_key text not null,
  status text not null default 'active');
create table if not exists teacher_flashcards(
  id bigint generated always as identity primary key,
  teacher_id uuid not null, student_id uuid not null, language_app_key text not null,
  front text, back_trans text, status text not null default 'active');
create table if not exists progress(user_id uuid primary key, data jsonb not null default '{}'::jsonb);
