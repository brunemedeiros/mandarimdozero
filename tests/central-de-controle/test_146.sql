-- 146 (Central de Controle, Visão Geral do Admin). Transação + ROLLBACK, Postgres LOCAL (nunca produção).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return coalesce(nullif(sqlerrm, ''), sqlstate); end $$;
grant execute on function pg_temp.try(text) to public;
-- horário de São Paulo -> timestamptz (d = dias atrás, hm = hora local)
create or replace function pg_temp.sp(d int, hm text) returns timestamptz language sql as $$
  select (((now() at time zone 'America/Sao_Paulo')::date - d) + hm::time) at time zone 'America/Sao_Paulo' $$;
grant execute on function pg_temp.sp(int, text) to public;

-- AD admin; T2 outra professora; A e B alunos da admin (frances); C conta sem vínculo, criada há 2 dias.
insert into auth.users(id, email) values
 ('14200000-0000-0000-0000-0000000000ad','ad142@x.invalid'), ('14200000-0000-0000-0000-0000000000f2','t2142@x.invalid'),
 ('14200000-0000-0000-0000-0000000000a1','a142@x.invalid'), ('14200000-0000-0000-0000-0000000000b1','b142@x.invalid'),
 ('14200000-0000-0000-0000-0000000000c1','c142@x.invalid');
insert into profiles(user_id, username, display_name) values
 ('14200000-0000-0000-0000-0000000000ad','ad142','Admin'), ('14200000-0000-0000-0000-0000000000f2','t2142','Outra prof'),
 ('14200000-0000-0000-0000-0000000000a1','ana142','Ana'), ('14200000-0000-0000-0000-0000000000b1','bia142','Bia'),
 ('14200000-0000-0000-0000-0000000000c1','caio142','Caio')
 on conflict (user_id) do update set display_name = excluded.display_name, username = excluded.username;
update profiles set created_at = now() - interval '60 days' where user_id::text like '14200000-%';
update profiles set created_at = pg_temp.sp(2, '10:00') where user_id = '14200000-0000-0000-0000-0000000000c1';
insert into account_roles(user_id, role) values ('14200000-0000-0000-0000-0000000000ad','admin'),
 ('14200000-0000-0000-0000-0000000000f2','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000a1','frances','active'),
 ('14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000b1','frances','active');

-- Ana: lição HOJE às 22:30 de Brasília (em UTC já é amanhã) + revisão há 3 dias = 2 dias; class_mode ontem e tab_switch
-- anteontem NÃO contam. Caio: estudou nos 6 dias de 0 a 5 = Altíssimo. Outra prof: estudou (fica fora de tudo).
insert into usage_events(user_id, language_app_key, event_type, event_name, actor_type, session_id, created_at) values
 ('14200000-0000-0000-0000-0000000000a1','frances','lesson_complete','vocab_lesson','user','aaaaaaaa-0000-0000-0000-000000000001', pg_temp.sp(0,'22:30')),
 ('14200000-0000-0000-0000-0000000000a1','frances','review_answer','flashcard','user','aaaaaaaa-0000-0000-0000-000000000002', pg_temp.sp(3,'09:00')),
 ('14200000-0000-0000-0000-0000000000a1','frances','review_answer','flashcard','user','aaaaaaaa-0000-0000-0000-000000000002', pg_temp.sp(3,'09:05')),
 ('14200000-0000-0000-0000-0000000000a1','frances','review_answer','class_mode','user','aaaaaaaa-0000-0000-0000-000000000003', pg_temp.sp(1,'08:00')),
 ('14200000-0000-0000-0000-0000000000a1','frances','tab_switch','review','user','aaaaaaaa-0000-0000-0000-000000000004', pg_temp.sp(2,'08:00')),
 ('14200000-0000-0000-0000-0000000000f2','frances','lesson_complete','vocab_lesson','user','aaaaaaaa-0000-0000-0000-000000000005', pg_temp.sp(0,'10:00'));
insert into usage_events(user_id, language_app_key, event_type, event_name, actor_type, session_id, created_at)
 select '14200000-0000-0000-0000-0000000000c1','mandarim','lesson_complete','hanzi_lesson','user', gen_random_uuid(), pg_temp.sp(d,'12:00')
   from generate_series(0,5) d;

-- Banco: Ana com conta. Na aula (modo_aula) 2; em casa 1 e importada 1 NÃO entram no "Na aula".
insert into review_bank_students(id, teacher_id, name, language_app_key, linked_student_id) values
 ('14200000-0000-0000-0000-00000000b5a1','14200000-0000-0000-0000-0000000000ad','Ana banco','frances','14200000-0000-0000-0000-0000000000a1');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values
 ('14200000-0000-0000-0000-00000000117e','14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-00000000b5a1','frances','vocabulario','q','a');
insert into review_bank_reviews(item_id, teacher_id, student_id, bank_student_id, language_app_key, outcome, source, via, created_at) values
 ('14200000-0000-0000-0000-00000000117e','14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000a1','14200000-0000-0000-0000-00000000b5a1','frances','acertou','modo_aula','aula', pg_temp.sp(1,'15:00')),
 ('14200000-0000-0000-0000-00000000117e','14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000a1','14200000-0000-0000-0000-00000000b5a1','frances','errou','modo_aula','aula', pg_temp.sp(1,'15:01')),
 ('14200000-0000-0000-0000-00000000117e','14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000a1','14200000-0000-0000-0000-00000000b5a1','frances','acertou','modo_aula','casa', pg_temp.sp(2,'15:00')),
 ('14200000-0000-0000-0000-00000000117e','14200000-0000-0000-0000-0000000000ad','14200000-0000-0000-0000-0000000000a1','14200000-0000-0000-0000-00000000b5a1','frances','acertou','importado','aula', pg_temp.sp(2,'15:00'));

-- ---------- permissões ----------
select pg_temp.as_user(null); set local role anon;
insert into r select pg_temp.try('select admin_overview_stats(30,''mine'',''all'')') like '%permission denied%', 'anônimo não executa stats';
reset role;
select pg_temp.as_user('14200000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into r select pg_temp.try('select admin_overview_stats(30,''mine'',''all'')') = 'not_authorized', 'aluna recebe not_authorized';
insert into r select pg_temp.try('select admin_overview_reviews(30,''all'')') = 'not_authorized', 'aluna não lê revisões';
insert into r select pg_temp.try('select * from _admin_overview_accounts(''all'',''all'')') like '%permission denied%', 'ajudante interno fechado';
reset role;
select pg_temp.as_user('14200000-0000-0000-0000-0000000000f2'); set local role authenticated;
insert into r select pg_temp.try('select admin_overview_stats(30,''all'',''all'')') = 'not_authorized', 'professora (não admin) recebe not_authorized';
reset role;

-- ---------- admin ----------
select pg_temp.as_user('14200000-0000-0000-0000-0000000000ad'); set local role authenticated;
insert into r select pg_temp.try('select admin_overview_stats(15,''mine'',''all'')') = 'invalid_days', 'período fora da lista recusado';
insert into r select pg_temp.try('select admin_overview_stats(30,''x'',''all'')') = 'invalid_scope', 'categoria fora da lista recusada';
insert into r select pg_temp.try('select admin_overview_stats(30,''mine'',''klingon'')') = 'invalid_language', 'idioma fora da lista recusado';

create temp table s on commit drop as select admin_overview_stats(30,'mine','all') j;
insert into r select (j->'totals'->>'accounts')::int = 2, 'Meus alunos = Ana e Bia (sem admin)' from s;
insert into r select (j->'totals'->>'active')::int = 1, 'ativas no período = só Ana' from s;
insert into r select jsonb_array_length(j->'series') = 30, 'série com 30 dias (dia vazio incluído)' from s;
insert into r select (j->'series'->-1->>'day') = to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD')
  and (j->'series'->-1->>'active')::int = 1, 'lição às 22:30 de Brasília cai HOJE (não amanhã em UTC)' from s;
insert into r select (j->'series'->-2->>'active')::int = 0, 'class_mode de ontem não é dia com estudo' from s;
insert into r select (j->'series'->-3->>'active')::int = 0 and (j->'series'->-3->>'sessions')::int = 1, 'tab_switch conta acesso, não estudo' from s;
insert into r select (j->'engagement'->'medio'->0->>'display_name') = 'Ana' and (j->'engagement'->'medio'->0->>'days')::int = 2, 'Ana: 2 dias = Médio' from s;
insert into r select (j->'engagement'->'nenhum'->0->>'display_name') = 'Bia', 'Bia: 0 dias = Nenhum' from s;
insert into r select (j->'totals'->>'engagement_avg')::numeric = 1.0, 'engajamento médio = (2+0)/2' from s;
insert into r select (j->'plans'->>'premium')::int = 0, 'Plano: admin não conta como Premium' from s;
insert into r select position('email' in j::text) = 0 and position('a142@x.invalid' in j::text) = 0, 'nenhum e-mail na resposta' from s;

create temp table o on commit drop as select admin_overview_stats(7,'others','all') j;
insert into r select (j->'totals'->>'accounts')::int = 1, 'Outras contas = só Caio (sem professora)' from o;
insert into r select (j->'engagement'->'altissimo'->0->>'display_name') = 'Caio' and (j->'engagement'->'altissimo'->0->>'new_account')::boolean,
  'Caio: 6 dias = Altíssimo, marcado conta nova' from o;
insert into r select (j->'totals'->>'new_accounts')::int = 1, 'cadastro novo no período' from o;
insert into r select (admin_overview_stats(7,'all','all')->'totals'->>'accounts')::int = 3, 'Todas = Ana, Bia, Caio';
insert into r select (admin_overview_stats(7,'all','mandarim')->'totals'->>'accounts')::int = 1, 'filtro mandarim = só Caio';
insert into r select (admin_overview_stats(7,'mine','mandarim')->'totals'->>'accounts')::int = 0, 'Meus alunos em mandarim = 0';

create temp table rv on commit drop as select admin_overview_reviews(30,'all') j;
insert into r select (j->'totals'->>'home')::int = 2, 'Em casa = 2 (sem class_mode)' from rv;
insert into r select (j->'totals'->>'class')::int = 2, 'Na aula = 2 (sem via casa e sem importada)' from rv;
insert into r select (j->'students'->0->>'display_name') = 'Ana' and jsonb_array_length(j->'students') = 2, 'lista dos 2 alunos, Ana primeiro' from rv;
reset role;

-- grants e segurança das funções
insert into r select bool_and(p.prosecdef and array_to_string(p.proconfig, ',') like '%search_path=public%'), 'security definer com search_path'
  from pg_proc p where p.proname in ('admin_overview_stats','admin_overview_reviews','_admin_overview_accounts');

select case when ok then 'ok   ' else 'FALHA' end || ' ' || name from r;
select count(*) filter (where ok) || '/' || count(*) || ' passaram' from r;
rollback;
