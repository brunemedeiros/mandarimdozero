-- 130 (Conectar Notion). Transação + ROLLBACK, Postgres local.
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
insert into auth.users(id, email) values ('13000000-0000-0000-0000-0000000000a1','t130@x.invalid'),
 ('13000000-0000-0000-0000-0000000000b1','a130@x.invalid'), ('13000000-0000-0000-0000-0000000000b5','x130@x.invalid');
insert into profiles(user_id, username, display_name) values ('13000000-0000-0000-0000-0000000000a1','tereza130','Tereza Prof'),
 ('13000000-0000-0000-0000-0000000000b1','anabela130','Anabela Souza'), ('13000000-0000-0000-0000-0000000000b5','xavi130','Xavi')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13000000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('13000000-0000-0000-0000-0000000000a1','13000000-0000-0000-0000-0000000000b1','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('13000000-0000-0000-0000-0000000000a1','frances','Turma Jeanne');
insert into v values ('T','13000000-0000-0000-0000-0000000000a1'), ('A','13000000-0000-0000-0000-0000000000b1'), ('X','13000000-0000-0000-0000-0000000000b5');
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
-- 1ª leitura com a coluna antiga: q1 sem aluno; q2 da Anabela vira aula
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('q1', null, pg_temp.today(), 'Subjonctif', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('q2', 'Anabela', pg_temp.today(), 'Passé composé', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-05T10:00:00Z');
insert into r select (select match_state from notion_pages where page_id = 'q1') = 'review'
  and (select match_state from notion_pages where page_id = 'q2') = 'linked', 'coluna antiga: sem aluno vai para revisar';
-- a professora edita o tópico no site
update teacher_class_logs set topic = 'Editado no site' where id = (select class_log_id from notion_pages where page_id = 'q2');

-- Salvar as MESMAS colunas não relê nada
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a","student":"b","topic":"c"}', pg_temp.today() - 20);
reset role;
insert into r select (select last_edited from notion_pages where page_id = 'q1') is not null
  and (select cursor from notion_sources where user_id = pg_temp.g('T')::uuid) is not null, 'mesmas colunas: nada muda';

-- Troca para a Ficha do Aluno: a mesma linha (sem mudança no Notion) agora vem com o nome e é lida
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a","student":"ficha","topic":"c"}', pg_temp.today() - 20);
reset role;
insert into r select (select count(*) from notion_pages where user_id = pg_temp.g('T')::uuid and last_edited is null) = 2
  and (select cursor from notion_sources where user_id = pg_temp.g('T')::uuid) is null, 'outra coluna: cursor zerado e linhas marcadas para ler de novo';
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('q1', 'Anabela Souza', pg_temp.today(), 'Subjonctif', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('q2', 'Anabela Souza', pg_temp.today(), 'Passé composé', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-05T10:00:00Z');
insert into r select (select name from notion_pages where page_id = 'q1') = 'Anabela Souza'
  and (select match_state from notion_pages where page_id = 'q1') = 'linked', 'linha que não mudou no Notion é lida de novo e reconhecida';
insert into r select (select topic from teacher_class_logs where id = (select class_log_id from notion_pages where page_id = 'q2')) = 'Editado no site',
  'aula já ligada não é regravada (a edição no site fica)';

-- Conserto único da migration: linha "sem aluno" já lida volta a ser lida
update notion_pages set match_state = 'review', match_reason = 'sem aluno', last_edited = '2026-11-05T10:00:00Z' where page_id = 'q1';
update notion_sources set cursor = '2026-11-05T10:00:00Z' where user_id = pg_temp.g('T')::uuid;
update notion_pages set last_edited = null where match_state = 'review' and match_reason = 'sem aluno';
update notion_sources s set cursor = null where exists (select 1 from notion_pages p where p.user_id = s.user_id and p.last_edited is null);
insert into r select (select last_edited from notion_pages where page_id = 'q1') is null
  and (select cursor from notion_sources where user_id = pg_temp.g('T')::uuid) is null, 'conserto: sem aluno volta a ser lida';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (130)';
rollback;
