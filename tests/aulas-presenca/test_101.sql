-- 101 (horário, duração e fuso das aulas). Transação + ROLLBACK, Postgres local (tests/aulas-presenca/run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;
insert into auth.users(id, email) values ('10100000-0000-0000-0000-0000000000a1','t101@x.invalid'), ('10100000-0000-0000-0000-0000000000b1','a101@x.invalid'), ('10100000-0000-0000-0000-0000000000b2','b101@x.invalid');
insert into profiles(user_id, display_name) values ('10100000-0000-0000-0000-0000000000a1','Prof'), ('10100000-0000-0000-0000-0000000000b1','Ana'), ('10100000-0000-0000-0000-0000000000b2','Bia')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('10100000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('10100000-0000-0000-0000-0000000000a1','10100000-0000-0000-0000-0000000000b1','frances','active'),
 ('10100000-0000-0000-0000-0000000000a1','10100000-0000-0000-0000-0000000000b2','frances','active');
select pg_temp.as_user('10100000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, start_time, duration_minutes, time_zone, topic)
 values ('10100000-0000-0000-0000-0000000000a1','10100000-0000-0000-0000-0000000000b1','frances','2026-11-03','19:00',60,'America/Sao_Paulo','Aula futura');
insert into r select true, 'professora agenda aula futura com horário, duração e fuso';
insert into r select pg_temp.try($q$insert into teacher_class_logs(teacher_id, student_id, language_app_key, duration_minutes) values ('10100000-0000-0000-0000-0000000000a1','10100000-0000-0000-0000-0000000000b1','frances', 2)$q$) = '23514', 'duração fora de 5 a 600 recusada';
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values ('10100000-0000-0000-0000-0000000000a1','10100000-0000-0000-0000-0000000000b1','frances','2026-10-01','Sem horário');
insert into r select true, 'aula sem horário continua valendo';
reset role;
select pg_temp.as_user('10100000-0000-0000-0000-0000000000b1'); set local role authenticated;
insert into r select (select string_agg(class_date || ' ' || coalesce(start_time::text,'-') || ' ' || coalesce(duration_minutes::text,'-') || ' ' || coalesce(time_zone,'-'), ' | ' order by class_date) from get_my_class_schedule('frances'))
  = '2026-10-01 - - - | 2026-11-03 19:00:00 60 America/Sao_Paulo', 'aluno vê horário, duração e fuso';
insert into r select pg_temp.try('select notes from get_my_class_schedule(''frances'')') = '42703', 'nunca devolve as Anotações';
reset role;
select pg_temp.as_user('10100000-0000-0000-0000-0000000000b2'); set local role authenticated;
insert into r select (select count(*) from get_my_class_schedule('frances')) = 0, 'outro aluno não vê as aulas da Ana';
reset role;
insert into r select has_function_privilege('anon', 'get_my_class_schedule(text)', 'execute') = false, 'anon sem execute';
select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (101)';
rollback;
