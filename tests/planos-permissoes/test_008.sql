-- 008 corrigida (Etapa 5): is_challenges_premium() pela permissão efetiva. Aplica 001 + 008 DENTRO de
-- begin ... rollback num Postgres LOCAL que já tem 075/116 (run.sh): nada fica, nada vai para Staging/produção.
\set ON_ERROR_STOP on
\pset tuples_only on
begin;
\i fr/scripts/supabase_migrations/001_create_challenges_table.sql
\i fr/scripts/supabase_migrations/008_challenges_server_side_premium_gating.sql
\set ON_ERROR_STOP off
create temp table r8(name text, ok boolean, info text);
grant all on r8 to public;
insert into challenges(id, type, level, status, data) values
 ('c-open', 'expression', 'A1', 'published', '{"q":"aberto"}'),
 ('c-prem', 'expression', 'A1', 'published', '{"moduleId":"A1-m1","unitId":1,"theme":"t","q":"segredo"}');
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000008a1','gratis8@x.com'), ('00000000-0000-0000-0000-0000000008a2','aluno8@x.com'),
 ('00000000-0000-0000-0000-0000000008a3','basic8@x.com'), ('00000000-0000-0000-0000-0000000008a4','prof8@x.com');
insert into profiles(user_id, username) select id, 'c'||right(id::text,4) from auth.users where id::text like '00000000-0000-0000-0000-0000000008a_' on conflict do nothing;
insert into account_roles(user_id, role) values ('00000000-0000-0000-0000-0000000008a3','premium_basic'), ('00000000-0000-0000-0000-0000000008a4','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values ('00000000-0000-0000-0000-0000000008a4','00000000-0000-0000-0000-0000000008a2','frances','active');
create function pg_temp.as8(p_uid uuid, p_email text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select jsonb_build_object('prem', public.is_challenges_premium(),
         'q', (select data->>'q' from public.get_published_challenges() where id = 'c-prem'),
         'direto', (select count(*) from public.challenges)) into r;
  reset role; return r;
end $$;
grant all on all functions in schema pg_temp to public;
create temp table v8 as select n, pg_temp.as8(u::uuid, e) j from (values
  ('gratis','00000000-0000-0000-0000-0000000008a1','gratis8@x.com'), ('aluno','00000000-0000-0000-0000-0000000008a2','aluno8@x.com'),
  ('basic','00000000-0000-0000-0000-0000000008a3','basic8@x.com'), ('professora','00000000-0000-0000-0000-0000000008a4','prof8@x.com')) x(n,u,e);
insert into r8 select '008 is_challenges_premium / '||n, (j->>'prem')::boolean = (n <> 'gratis'), j::text from v8;
insert into r8 select '008 conteúdo Premium / '||n, case when n = 'gratis' then j->>'q' is null else j->>'q' = 'segredo' end, j::text from v8;
insert into r8 select '008 select direto só vê o aberto / '||n, (j->>'direto')::int = 1, j::text from v8;
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true);
insert into r8 select '008 sem login: false', not coalesce((select public.is_challenges_premium()), false), '';
insert into r8 select '008 profiles.id não é usado', (select prosrc not ilike '%p.id%' and prosrc not ilike '%plan_tier%' from pg_proc where proname = 'is_challenges_premium'), '';
select case when ok then 'ok' else 'FALHA' end || '|' || name || case when ok then '' else ' :: ' || coalesce(info,'') end from r8 order by ok, name;
select 'TOTAL 008 ' || count(*) filter (where ok) || '/' || count(*) from r8;
rollback;
