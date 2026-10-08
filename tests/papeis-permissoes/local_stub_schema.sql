-- Schema MÍNIMO para testar a 075 num Postgres local (não é o schema real do Supabase).
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as
$$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
end $$;
create table if not exists public.profiles (user_id uuid primary key, username text,
  plan_tier text not null default 'free' check (plan_tier in ('free','premium')),
  role text not null default 'user' check (role in ('user','teacher','admin')));
create table if not exists public.teacher_students (id bigint generated always as identity primary key,
  teacher_id uuid not null, student_id uuid not null, language_app_key text not null, status text not null default 'active');
grant usage on schema public, auth to authenticated, anon;
grant select on all tables in schema public to authenticated, anon;
grant execute on all functions in schema auth to authenticated, anon;
-- dados: autora (premium/admin), aluna vinculada, conta grátis, professora futura
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'),
 ('00000000-0000-0000-0000-00000000000b','aluna@x.com'),
 ('00000000-0000-0000-0000-00000000000c','gratis@x.com'),
 ('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into public.profiles(user_id, username, plan_tier, role) values
 ('00000000-0000-0000-0000-00000000000a','brune','premium','admin'),
 ('00000000-0000-0000-0000-00000000000b','aluna','free','user'),
 ('00000000-0000-0000-0000-00000000000c','gratis','free','user'),
 ('00000000-0000-0000-0000-00000000000d','prof','free','user');
insert into public.teacher_students(teacher_id, student_id, language_app_key) values
 ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','fr');
