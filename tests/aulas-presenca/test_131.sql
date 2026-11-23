-- 131 (Notion: descartar vale para sempre). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;
create or replace function pg_temp.today() returns date language sql as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
grant execute on function pg_temp.today() to public;
create or replace function pg_temp.row(p_page text, p_name text, p_date date, p_topic text, p_hw text, p_att text, p_skills text[], p_edited text, p_time text default null)
returns jsonb language sql as $$
  select jsonb_build_object('page_id', p_page, 'name', p_name, 'date', p_date, 'start_time', p_time, 'time_zone', 'America/Sao_Paulo',
    'topic', p_topic, 'homework', p_hw, 'attendance', p_att, 'skills', to_jsonb(coalesce(p_skills, '{}'::text[])),
    'archived', false, 'last_edited', p_edited) $$;

-- T professora; A aluna (francês); turma K com A; X de fora
insert into auth.users(id, email) values ('13100000-0000-0000-0000-0000000000a1','t131@x.invalid'),
 ('13100000-0000-0000-0000-0000000000b1','a131@x.invalid'), ('13100000-0000-0000-0000-0000000000b5','x131@x.invalid');
insert into profiles(user_id, username, display_name) values ('13100000-0000-0000-0000-0000000000a1','tereza131','Tereza Prof'),
 ('13100000-0000-0000-0000-0000000000b1','anabela131','Anabela Souza'), ('13100000-0000-0000-0000-0000000000b5','xavi131','Xavi')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13100000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('13100000-0000-0000-0000-0000000000a1','13100000-0000-0000-0000-0000000000b1','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('13100000-0000-0000-0000-0000000000a1','frances','Turma Jeanne');
insert into v values ('T','13100000-0000-0000-0000-0000000000a1'), ('A','13100000-0000-0000-0000-0000000000b1'), ('X','13100000-0000-0000-0000-0000000000b5');
insert into v select 'K', id::text from classrooms where name = 'Turma Jeanne';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid);
insert into class_attendance_labels(teacher_id, name, color, counts_as) values (pg_temp.g('T')::uuid, 'Presente', 'green', 'present');
-- Aula de hoje da Ana já criada pelo Google Agenda (só data e hora)
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, start_time) values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', pg_temp.today(), '16:00');
insert into v select 'L1', max(id)::text from teacher_class_logs where student_id = pg_temp.g('A')::uuid;


select notion_save_connection(pg_temp.g('T')::uuid, 'secret_tok', 'w1', 'Workspace', 'bot1');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a","student":"b","topic":"c"}', pg_temp.today() - 20);
reset role;
-- aula antiga (antes da ligação) fica para aprovar
update notion_sources set linked_on = pg_temp.today() where user_id = pg_temp.g('T')::uuid;
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('d1', 'Anabela', pg_temp.today() - 5, 'Imparfait', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('d2', 'Anabela', pg_temp.today() - 6, 'Subjonctif', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-05T10:00:00Z');
insert into r select (select count(*) from notion_pages where page_id in ('d1','d2') and match_state = 'approval') = 2, 'aulas antigas ficam para aprovar';
insert into v select 'D1', id::text from notion_pages where page_id = 'd1';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select notion_approve(array[pg_temp.g('D1')::bigint], false);
reset role;
insert into r select (select match_state from notion_pages where page_id = 'd1') = 'ignored'
  and (select discarded_at from notion_pages where page_id = 'd1') is not null, 'descartar grava a data do descarte';
-- relê tudo (como a troca de coluna da 130) e a linha foi editada no Notion
update notion_pages set last_edited = null where user_id = pg_temp.g('T')::uuid;
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('d1', 'Anabela', pg_temp.today() - 5, 'Imparfait editado', null, null, null, '2026-11-06T10:00:00Z'),
  pg_temp.row('d2', 'Anabela', pg_temp.today() - 6, 'Subjonctif', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-06T10:00:00Z');
insert into r select (select match_state from notion_pages where page_id = 'd1') = 'ignored'
  and (select topic from notion_pages where page_id = 'd1') = 'Imparfait editado', 'descartada continua descartada depois de reler e editar no Notion';
insert into r select (select match_state from notion_pages where page_id = 'd2') = 'approval', 'a outra continua para aprovar';
insert into r select not exists (select 1 from teacher_class_logs where topic like 'Imparfait%'), 'descartada não vira aula';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (131)';
rollback;
