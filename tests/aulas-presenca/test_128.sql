-- 128 (Conectar Notion). Transação + ROLLBACK, Postgres local.
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
insert into auth.users(id, email) values ('12800000-0000-0000-0000-0000000000a1','t128@x.invalid'),
 ('12800000-0000-0000-0000-0000000000b1','a128@x.invalid'), ('12800000-0000-0000-0000-0000000000b5','x128@x.invalid');
insert into profiles(user_id, username, display_name) values ('12800000-0000-0000-0000-0000000000a1','tereza128','Tereza Prof'),
 ('12800000-0000-0000-0000-0000000000b1','anabela128','Anabela Souza'), ('12800000-0000-0000-0000-0000000000b5','xavi128','Xavi')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('12800000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('12800000-0000-0000-0000-0000000000a1','12800000-0000-0000-0000-0000000000b1','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('12800000-0000-0000-0000-0000000000a1','frances','Turma Jeanne');
insert into v values ('T','12800000-0000-0000-0000-0000000000a1'), ('A','12800000-0000-0000-0000-0000000000b1'), ('X','12800000-0000-0000-0000-0000000000b5');
insert into v select 'K', id::text from classrooms where name = 'Turma Jeanne';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid);
insert into class_attendance_labels(teacher_id, name, color, counts_as) values (pg_temp.g('T')::uuid, 'Presente', 'green', 'present');
-- Aula de hoje da Ana já criada pelo Google Agenda (só data e hora)
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, start_time) values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', pg_temp.today(), '16:00');
insert into v select 'L1', max(id)::text from teacher_class_logs where student_id = pg_temp.g('A')::uuid;

-- Professora sem conexão não escolhe banco; com conexão, escolhe
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'S0', notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a","student":"b"}', pg_temp.today() - 20)::text;
reset role;
select notion_save_connection(pg_temp.g('T')::uuid, 'secret_tok', 'w1', 'Workspace', 'bot1');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'S1', notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a"}', pg_temp.today() - 20)::text;
insert into v select 'S2', notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas',
  '{"date":"a","student":"b","topic":"c","homework":"d","attendance":"e","skills":"f"}', pg_temp.today() - 20)::text;
reset role;
insert into r select pg_temp.g('S0')::jsonb ->> 'error' = 'not_connected' and pg_temp.g('S1')::jsonb ->> 'error' = 'need_date_and_student'
  and (pg_temp.g('S2')::jsonb ->> 'ok')::boolean, 'escolher o banco: precisa estar conectada e ter Data e Aluno';

-- Leitura
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('p1', 'Anabela 🇧🇷', pg_temp.today(), 'Passé composé', 'Exercícios 3 e 4', 'Aula dada✅', array['Gramática','Escuta','Pontualidade'], '2026-11-05T10:00:00Z'),
  pg_temp.row('p2', 'Anabela 🇧🇷', pg_temp.today() - 10, 'Imparfait', null, 'Remarcada', null, '2026-11-05T10:00:00Z'),
  pg_temp.row('p3', 'Desconhecida 🇧🇷', pg_temp.today(), 'Algo', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('p4', 'Anabela', pg_temp.today() - 60, 'Antiga demais', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('p5', 'Turma Jeanne', pg_temp.today(), 'Subjonctif', null, null, null, '2026-11-05T10:00:00Z', '19:30')
), '2026-11-05T10:00:00Z');

insert into r select (select topic = 'Passé composé' and homework = 'Exercícios 3 e 4' and skills = array['escuta','gramatica']::text[]
    and attendance_label_id = (select id from class_attendance_labels where teacher_id = pg_temp.g('T')::uuid and name = 'Presente')
    and start_time = '16:00' and notion_page_ref is not null
  from teacher_class_logs where id = pg_temp.g('L1')::bigint), 'linha nova completa a aula do Google do mesmo dia (tema, tarefa, Presente, Competências; horário do Google)';
insert into r select (select count(*) from teacher_class_logs where student_id = pg_temp.g('A')::uuid and class_date = pg_temp.today()) = 1, 'não duplica a aula do dia';
insert into r select exists (select 1 from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L1')::bigint), 'aula nova do Notion gera o aviso do Mural';
insert into r select (select match_state from notion_pages where page_id = 'p2') = 'approval'
  and not exists (select 1 from teacher_class_logs where student_id = pg_temp.g('A')::uuid and class_date = pg_temp.today() - 10),
  'aula de antes da ligação fica para aprovar e não mexe em nada';
insert into r select (select match_state || '|' || match_reason from notion_pages where page_id = 'p3') = 'review|nome não reconhecido', 'nome desconhecido vai para revisar';
insert into r select (select match_state from notion_pages where page_id = 'p4') = 'ignored', 'linha antes de "importar desde" é ignorada';
insert into r select (select topic = 'Subjonctif' and student_id is null and start_time = '19:30' from teacher_class_logs
  where classroom_id = pg_temp.g('K')::bigint and class_date = pg_temp.today()), 'nome da turma: aula de turma criada no site (sem Google), com o horário do Notion';

-- Edição no Notion: só grava se a linha mudou lá
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(pg_temp.row('p1', 'Anabela', pg_temp.today(), 'Velho', null, null, null, '2026-11-05T09:00:00Z')), null);
insert into r select (select topic from teacher_class_logs where id = pg_temp.g('L1')::bigint) = 'Passé composé', 'linha com edição mais antiga não sobrescreve';
update teacher_class_logs set topic = 'Editado no site' where id = pg_temp.g('L1')::bigint;
select pg_temp.as_user(null);
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('p1', 'Anabela', pg_temp.today(), 'Passé composé e être', 'Exercícios 3 e 4', 'Aula dada✅', array['Gramática'], '2026-11-05T12:00:00Z')), '2026-11-05T12:00:00Z');
insert into r select (select topic from teacher_class_logs where id = pg_temp.g('L1')::bigint) = 'Passé composé e être', 'mudou no Notion depois: o Notion grava de novo na aula';
insert into r select (select count(*) from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L1')::bigint) = 1, 'sem aviso repetido';

-- Ligar o nome desconhecido à Ana
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'LN', notion_link_name('Desconhecida 🇧🇷', 'student', pg_temp.g('A')::uuid, null, null, 'frances')::text;
insert into v select 'LX', notion_link_name('Outro', 'student', pg_temp.g('X')::uuid, null, null, 'frances')::text;
reset role;
insert into r select (pg_temp.g('LN')::jsonb ->> 'n')::int = 1 and (select match_state from notion_pages where page_id = 'p3') = 'linked'
  and pg_temp.g('LX')::jsonb ->> 'error' = 'not_your_student', 'ligar o nome reprocessa a linha; não liga a quem não é aluno';

-- Aprovar a aula antiga: grava sem aviso nem sino; Presença nova vira rótulo
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'IT', notion_review_items()::text;
insert into v select 'AP', notion_approve(null, true)::text;
reset role;
insert into r select exists (select 1 from jsonb_array_elements(pg_temp.g('IT')::jsonb -> 'data') e where e ->> 'state' = 'approval' and e ->> 'topic' = 'Imparfait' and e ->> 'target' = 'Anabela Souza'),
  'caixa mostra a aula para aprovar com o nome do aluno';
insert into v select 'LA', id::text from teacher_class_logs where student_id = pg_temp.g('A')::uuid and class_date = pg_temp.today() - 10;
insert into r select pg_temp.g('LA') is not null and (select topic from teacher_class_logs where id = pg_temp.g('LA')::bigint) = 'Imparfait'
  and not exists (select 1 from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('LA')::bigint)
  and (select name from class_attendance_labels l join teacher_class_logs c on c.attendance_label_id = l.id where c.id = pg_temp.g('LA')::bigint) = 'Remarcada',
  'aprovar grava a aula sem aviso no Mural; Presença nova vira rótulo';
insert into r select (select match_state from notion_pages where page_id = 'p2') = 'linked', 'aprovada sai da caixa';
update teacher_class_logs set homework = 'Depois' where id = pg_temp.g('LA')::bigint;
insert into r select exists (select 1 from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('LA')::bigint), 'fora da aprovação, o aviso volta a funcionar';

-- Status, desconectar e permissões
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'ST', notion_status()::text;
insert into v select 'DC', notion_disconnect()::text;
insert into v select 'ST2', notion_status()::text;
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into v select 'SX', notion_status()::text;
reset role;
insert into r select (pg_temp.g('ST')::jsonb ->> 'connected')::boolean and (pg_temp.g('ST')::jsonb -> 'counts' ->> 'linked')::int = 4
  and not (pg_temp.g('ST2')::jsonb ->> 'connected')::boolean and (select access_token from notion_connections where user_id = pg_temp.g('T')::uuid) = ''
  and exists (select 1 from teacher_class_logs where id = pg_temp.g('L1')::bigint), 'status; desconectar apaga o token e as aulas ficam';
insert into r select pg_temp.g('SX')::jsonb ->> 'error' = 'not_authorized', 'aluno não vê o status do Notion';
insert into r select not has_function_privilege('authenticated', 'notion_ingest(uuid,jsonb,timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'notion_token(uuid)', 'execute')
  and not has_function_privilege('anon', 'notion_status()', 'execute')
  and not has_table_privilege('authenticated', 'notion_connections', 'select'), 'token e leitura fechados para o app';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (128)';
rollback;
