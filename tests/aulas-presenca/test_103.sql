-- 103 (link de agenda ICS). Transação + ROLLBACK, Postgres local (tests/aulas-presenca/run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;
-- T professora; A e B alunos; X sem vínculo (membro da turma, mas sem vínculo ativo)
insert into auth.users(id, email) values ('10300000-0000-0000-0000-0000000000a1','t103@x.invalid'), ('10300000-0000-0000-0000-0000000000b1','a103@x.invalid'),
 ('10300000-0000-0000-0000-0000000000b2','b103@x.invalid'), ('10300000-0000-0000-0000-0000000000c1','x103@x.invalid');
insert into profiles(user_id, display_name) values ('10300000-0000-0000-0000-0000000000a1','Prof Brune'), ('10300000-0000-0000-0000-0000000000b1','Ana'),
 ('10300000-0000-0000-0000-0000000000b2','Bia'), ('10300000-0000-0000-0000-0000000000c1','Xis')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('10300000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b1','frances','active'),
 ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b2','frances','active');

select pg_temp.as_user('10300000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into v select 'K1', mural_save_classroom('frances', null, 'Dupla') ->> 'id';
select mural_set_classroom_members(pg_temp.g('K1')::bigint, array['10300000-0000-0000-0000-0000000000b1','10300000-0000-0000-0000-0000000000b2']::uuid[]);
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, start_time, duration_minutes, time_zone, topic, notes, observations)
 values ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b1','frances', current_date + 7, '19:30', 90, 'America/Sao_Paulo', 'Subjonctif', 'nota privada', 'obs');
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic)
 values ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b1','frances', current_date - 3, 'Sem horário');
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic)
 values ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b1','frances', current_date - 200, 'Muito antiga');
insert into teacher_class_logs(teacher_id, classroom_id, language_app_key, class_date, start_time, duration_minutes, time_zone, topic)
 values ('10300000-0000-0000-0000-0000000000a1', pg_temp.g('K1')::bigint, 'frances', current_date + 1, '10:00', 60, 'America/New_York', 'Aula da dupla');
insert into v select 'TT', my_calendar_feed_token();
insert into r select pg_temp.g('TT') ~ '^[0-9a-f]{64}$', 'token com 64 hex';
insert into r select my_calendar_feed_token() = pg_temp.g('TT'), 'pedir de novo devolve o mesmo link';
insert into r select pg_temp.try('select * from calendar_feed_tokens') = '42501', 'tabela de tokens fechada para authenticated';
insert into r select pg_temp.try(format('select * from class_calendar_feed(%L)', pg_temp.g('TT'))) = '42501', 'authenticated não lê o feed direto';
reset role;

select pg_temp.as_user('10300000-0000-0000-0000-0000000000b1'); set local role authenticated;
insert into v select 'TA', my_calendar_feed_token();
reset role;
select pg_temp.as_user('10300000-0000-0000-0000-0000000000c1'); set local role authenticated;
insert into v select 'TX', my_calendar_feed_token();
reset role;
-- X entra na turma, sem vínculo ativo
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K1')::bigint, '10300000-0000-0000-0000-0000000000c1') on conflict do nothing;

set local role service_role;
insert into r select (select string_agg(role || ':' || topic || ':' || coalesce(who, '-'), ' | ' order by class_date) from class_calendar_feed(pg_temp.g('TT')))
  = 'teacher:Sem horário:Ana | teacher:Aula da dupla:Dupla | teacher:Subjonctif:Ana', 'professora: as aulas dela, com nome do aluno/turma, sem as de 200 dias atrás';
insert into r select (select string_agg(role || ':' || topic || ':' || coalesce(who, '-'), ' | ' order by class_date) from class_calendar_feed(pg_temp.g('TA')))
  = 'student:Sem horário:Prof Brune | student:Aula da dupla:Dupla | student:Subjonctif:Prof Brune', 'aluna: as dela e as da turma';
insert into r select (select count(*) from class_calendar_feed(pg_temp.g('TX'))) = 0, 'membro da turma sem vínculo ativo não vê nada';
insert into r select (select start_at from class_calendar_feed(pg_temp.g('TT')) where topic = 'Subjonctif') = ((current_date + 7) + time '19:30') at time zone 'America/Sao_Paulo', 'início convertido do fuso da aula para UTC';
insert into r select (select start_at from class_calendar_feed(pg_temp.g('TT')) where topic = 'Aula da dupla') = ((current_date + 1) + time '10:00') at time zone 'America/New_York', 'fuso de Nova York respeitado';
insert into r select (select start_at from class_calendar_feed(pg_temp.g('TT')) where topic = 'Sem horário') = ((current_date - 3) + time '07:00') at time zone 'America/Sao_Paulo', 'aula sem horário entra às 7h (São Paulo)';
insert into r select pg_temp.try(format('select notes from class_calendar_feed(%L)', pg_temp.g('TT'))) = '42703', 'nunca devolve as Anotações';
insert into r select pg_temp.try(format('select observations from class_calendar_feed(%L)', pg_temp.g('TT'))) = '42703', 'nem as Observações';
insert into r select (select count(*) from class_calendar_feed(repeat('0', 64))) = 0, 'token inexistente: vazio';
reset role;
update profiles set display_name = '' where user_id = '10300000-0000-0000-0000-0000000000b2';
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values ('10300000-0000-0000-0000-0000000000a1','10300000-0000-0000-0000-0000000000b2','frances', current_date, 'Bia sem nome');
set local role service_role;
insert into r select (select who from class_calendar_feed(pg_temp.g('TT')) where topic = 'Bia sem nome') = (select username from profiles where user_id = '10300000-0000-0000-0000-0000000000b2'), 'sem nome de exibição: usa o @usuário';
insert into r select (select count(*) from class_calendar_feed('abc'' or 1=1 --')) = 0, 'token malformado: vazio';
reset role;
insert into r select (select last_fetched_at is not null from calendar_feed_tokens where token = pg_temp.g('TT')), 'registra a última leitura';

select pg_temp.as_user('10300000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into v select 'TT2', my_calendar_feed_token(true);
reset role;
insert into r select pg_temp.g('TT2') <> pg_temp.g('TT'), 'gerar outro link troca o token';
set local role service_role;
insert into r select (select count(*) from class_calendar_feed(pg_temp.g('TT'))) = 0, 'link antigo para de funcionar';
insert into r select (select count(*) from class_calendar_feed(pg_temp.g('TT2'))) = 4, 'link novo funciona';
reset role;
insert into r select has_function_privilege('anon', 'class_calendar_feed(text)', 'execute') = false, 'anon sem execute no feed';
insert into r select has_function_privilege('anon', 'my_calendar_feed_token(boolean)', 'execute') = false, 'anon sem execute no token';
select pg_temp.as_user(null); set local role authenticated;
insert into r select pg_temp.try('select my_calendar_feed_token()') = 'P0001', 'sem login não gera link';
reset role;
select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (103)';
rollback;
