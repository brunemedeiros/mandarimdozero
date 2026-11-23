-- 132 (ex-aluna no histórico, linha ligada à mão, Banco arquiva ex-aluna). Transação + ROLLBACK, Postgres local.
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
insert into auth.users(id, email) values ('13200000-0000-0000-0000-0000000000a1','t132@x.invalid'),
 ('13200000-0000-0000-0000-0000000000b1','a132@x.invalid'), ('13200000-0000-0000-0000-0000000000b5','x132@x.invalid');
insert into profiles(user_id, username, display_name) values ('13200000-0000-0000-0000-0000000000a1','tereza132','Tereza Prof'),
 ('13200000-0000-0000-0000-0000000000b1','anabela132','Anabela Souza'), ('13200000-0000-0000-0000-0000000000b5','xavi132','Xavi')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13200000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('13200000-0000-0000-0000-0000000000a1','13200000-0000-0000-0000-0000000000b1','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('13200000-0000-0000-0000-0000000000a1','frances','Turma Jeanne');
insert into v values ('T','13200000-0000-0000-0000-0000000000a1'), ('A','13200000-0000-0000-0000-0000000000b1'), ('X','13200000-0000-0000-0000-0000000000b5');
insert into v select 'K', id::text from classrooms where name = 'Turma Jeanne';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid);
insert into class_attendance_labels(teacher_id, name, color, counts_as) values (pg_temp.g('T')::uuid, 'Presente', 'green', 'present');
-- Aula de hoje da Ana já criada pelo Google Agenda (só data e hora)
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, start_time) values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', pg_temp.today(), '16:00');
insert into v select 'L1', max(id)::text from teacher_class_logs where student_id = pg_temp.g('A')::uuid;


-- E ex-aluna de francês (vínculo removido); Banco com a "Carmen" ligada à conta dela
insert into auth.users(id, email) values ('13200000-0000-0000-0000-0000000000e1','e132@x.invalid');
insert into profiles(user_id, username, display_name) values ('13200000-0000-0000-0000-0000000000e1','carmen132','Carmen da Silva')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into teacher_students(teacher_id, student_id, language_app_key, status) values (pg_temp.g('T')::uuid, '13200000-0000-0000-0000-0000000000e1', 'frances', 'removed');
insert into v values ('E','13200000-0000-0000-0000-0000000000e1');
insert into permission_catalog(key, kind, label_pt) values ('review_bank', 'bool', 'Banco') on conflict do nothing;
insert into role_permissions(role, permission_key, enabled) values ('teacher', 'review_bank', true) on conflict (role, permission_key) do update set enabled = true;
insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id) values (pg_temp.g('T')::uuid, 'Carmen', 'frances', pg_temp.g('E')::uuid);
insert into v select 'RB', id::text from review_bank_students where name = 'Carmen' and teacher_id = pg_temp.g('T')::uuid;

-- 1) Banco: arquivar a Carmen (conta sem vínculo ativo) agora funciona; ativar de novo com a conta sem vínculo, não
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
update review_bank_students set status = 'arquivado' where id = pg_temp.g('RB')::uuid;
reset role;
insert into r select (select status from review_bank_students where id = pg_temp.g('RB')::uuid) = 'arquivado', 'Banco: arquiva aluno cuja conta saiu do vínculo';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
do $$ begin
  begin update review_bank_students set status = 'ativo' where id = (select val from v where k = 'RB')::uuid; insert into r values (false, 'Banco: reativar com conta sem vínculo continua barrado');
  exception when others then insert into r values (true, 'Banco: reativar com conta sem vínculo continua barrado'); end;
end $$;
reset role;

-- 2) Notion: nome da ex-aluna ligado só para o histórico vira aula sem aviso no Mural
select notion_save_connection(pg_temp.g('T')::uuid, 'secret_tok', 'w1', 'Workspace', 'bot1');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select notion_save_source('0123456789abcdef0123456789abcdef', 'Calendário de Aulas', '{"date":"a","student":"b","topic":"c"}', pg_temp.today() - 20);
insert into v select 'FS', notion_former_students()::text;
reset role;
insert into r select exists (select 1 from jsonb_array_elements(pg_temp.g('FS')::jsonb -> 'data') e where e ->> 'student_id' = pg_temp.g('E') and e ->> 'name' = 'Carmen da Silva'),
  'ex-alunos: Carmen aparece na lista (vínculo removido)';
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('c1', 'Carmen da Silva M de Castro', pg_temp.today(), 'Les pancartes', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('s1', null, pg_temp.today(), 'Pitch - Maxi', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('s2', null, pg_temp.today(), 'Aula sem ficha', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-05T10:00:00Z');
insert into r select (select match_state from notion_pages where page_id = 'c1') = 'review', 'nome da ex-aluna não é reconhecido sozinho';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'LX', notion_link_name('Carmen da Silva M de Castro', 'student', pg_temp.g('E')::uuid, null, null, 'frances')::text;
insert into v select 'LF', notion_link_former('Carmen da Silva M de Castro', pg_temp.g('E')::uuid, 'frances')::text;
insert into v select 'LO', notion_link_former('Outro', pg_temp.g('X')::uuid, 'frances')::text;
reset role;
insert into r select pg_temp.g('LX')::jsonb ->> 'error' = 'not_your_student' and pg_temp.g('LO')::jsonb ->> 'error' = 'not_your_student'
  and (pg_temp.g('LF')::jsonb ->> 'ok')::boolean, 'ligar como aluna ativa barra; como ex-aluna (histórico) só quem já teve vínculo';
insert into r select (select match_state from notion_pages where page_id = 'c1') = 'linked'
  and (select student_id from teacher_class_logs where id = (select class_log_id from notion_pages where page_id = 'c1')) = pg_temp.g('E')::uuid
  and (select topic from teacher_class_logs where id = (select class_log_id from notion_pages where page_id = 'c1')) = 'Les pancartes',
  'ex-aluna: a aula entra no histórico dela com o tópico';
insert into r select not exists (select 1 from mural_posts where kind = 'lesson' and ref_id = (select class_log_id from notion_pages where page_id = 'c1')),
  'ex-aluna: sem aviso no Mural';

-- 3) linha sem nome: ligar só ela a uma aluna ativa; descartar a outra
insert into v select 'S1', id::text from notion_pages where page_id = 's1';
insert into v select 'S2', id::text from notion_pages where page_id = 's2';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'AS', notion_assign_page(pg_temp.g('S2')::bigint, 'student', pg_temp.g('A')::uuid, null, null, 'frances')::text;
insert into v select 'AX', notion_assign_page(pg_temp.g('S2')::bigint, 'student', pg_temp.g('X')::uuid, null, null, 'frances')::text;
insert into v select 'DS', notion_discard(array[pg_temp.g('S1')::bigint])::text;
reset role;
insert into r select pg_temp.g('AS')::jsonb ->> 'state' = 'linked' and pg_temp.g('AX')::jsonb ->> 'error' = 'not_your_student'
  and (select student_id from teacher_class_logs where id = (select class_log_id from notion_pages where page_id = 's2')) = pg_temp.g('A')::uuid,
  'linha sem nome ligada à mão vira aula da aluna escolhida (e só aluna da professora)';
insert into r select exists (select 1 from mural_posts where kind = 'lesson' and ref_id = (select class_log_id from notion_pages where page_id = 's2')),
  'aluna ativa: a aula ligada à mão gera o aviso no Mural (o "sem aviso" é só da ex-aluna)';
insert into r select (select match_state from notion_pages where page_id = 's1') = 'ignored' and (select discarded_at from notion_pages where page_id = 's1') is not null,
  'linha sem nome descartada';
-- relida depois: as duas continuam como ficaram
update notion_pages set last_edited = null where user_id = pg_temp.g('T')::uuid;
select notion_ingest(pg_temp.g('T')::uuid, jsonb_build_array(
  pg_temp.row('s1', null, pg_temp.today(), 'Pitch - Maxi', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('s2', null, pg_temp.today(), 'Aula sem ficha', null, null, null, '2026-11-05T10:00:00Z'),
  pg_temp.row('c1', 'Carmen da Silva M de Castro', pg_temp.today(), 'Les pancartes', null, null, null, '2026-11-05T10:00:00Z')), '2026-11-05T10:00:00Z');
insert into r select (select match_state from notion_pages where page_id = 's1') = 'ignored' and (select match_state from notion_pages where page_id = 's2') = 'linked'
  and (select match_state from notion_pages where page_id = 'c1') = 'linked', 'depois de reler: descartada continua descartada, ligadas continuam ligadas';
insert into r select not has_function_privilege('anon', 'notion_assign_page(bigint,text,uuid,bigint,uuid,text,boolean)', 'execute')
  and not has_function_privilege('anon', 'notion_discard(bigint[])', 'execute') and not has_function_privilege('anon', 'notion_link_former(text,uuid,text)', 'execute'), 'sem acesso sem login';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (132)';
rollback;
