-- 133 (ex-aluna sem nenhuma linha de vínculo: Notion, Google Agenda e Banco). Transação + ROLLBACK, Postgres local.
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
create or replace function pg_temp.ev(id text, title text, s text, e text, extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'title', title, 'start', s, 'end', e, 'time_zone', 'America/Sao_Paulo', 'all_day', false,
                            'status', 'confirmed', 'attendees', '[]'::jsonb) || extra $$;
grant execute on function pg_temp.ev(text, text, text, text, jsonb) to public;

-- T professora; C ex-aluna de português SEM nenhuma linha em teacher_students (vínculo apagado), com Banco "Carmen"
-- (ainda ativo, ligado à conta) e uma aula antiga; R ex-aluna só com aula antiga; X de fora.
insert into auth.users(id, email) values ('13300000-0000-0000-0000-0000000000a1','t133@x.invalid'),
 ('13300000-0000-0000-0000-0000000000c1','c133@x.invalid'), ('13300000-0000-0000-0000-0000000000c2','r133@x.invalid'),
 ('13300000-0000-0000-0000-0000000000c9','x133@x.invalid');
insert into profiles(user_id, username, display_name) values ('13300000-0000-0000-0000-0000000000a1','tereza133','Tereza'),
 ('13300000-0000-0000-0000-0000000000c1','margallo133','Carmen Margallo'), ('13300000-0000-0000-0000-0000000000c2','rosa133','Rosa Lima'),
 ('13300000-0000-0000-0000-0000000000c9','xavi133','Xavi')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13300000-0000-0000-0000-0000000000a1','teacher');
insert into v values ('T','13300000-0000-0000-0000-0000000000a1'), ('C','13300000-0000-0000-0000-0000000000c1'),
 ('R','13300000-0000-0000-0000-0000000000c2'), ('X','13300000-0000-0000-0000-0000000000c9');
insert into permission_catalog(key, kind, label_pt) values ('review_bank', 'bool', 'Banco') on conflict do nothing;
insert into role_permissions(role, permission_key, enabled) values ('teacher', 'review_bank', true) on conflict (role, permission_key) do update set enabled = true;
insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id) values (pg_temp.g('T')::uuid, 'Carmen', 'portugues', pg_temp.g('C')::uuid);
insert into v select 'RB', id::text from review_bank_students where name = 'Carmen' and teacher_id = pg_temp.g('T')::uuid;
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values
 (pg_temp.g('T')::uuid, pg_temp.g('C')::uuid, 'portugues', '2026-09-01', 'Aula antiga C'),
 (pg_temp.g('T')::uuid, pg_temp.g('R')::uuid, 'portugues', '2026-09-02', 'Aula antiga R');

-- 1) lista de ex-alunos: Carmen (só Banco + aula) e Rosa (só aula); Xavi não
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'FS', notion_former_students()::text;
reset role;
insert into r select exists (select 1 from jsonb_array_elements(pg_temp.g('FS')::jsonb -> 'data') e
   where e ->> 'student_id' = pg_temp.g('C') and e ->> 'name' = 'Carmen Margallo' and e ->> 'language_app_key' = 'portugues')
  and exists (select 1 from jsonb_array_elements(pg_temp.g('FS')::jsonb -> 'data') e where e ->> 'student_id' = pg_temp.g('R'))
  and not exists (select 1 from jsonb_array_elements(pg_temp.g('FS')::jsonb -> 'data') e where e ->> 'student_id' = pg_temp.g('X')),
  'ex-alunos: aparece quem não tem mais linha de vínculo (Banco ou aula antiga); quem nunca foi aluno, não';

-- 2) Banco: arquivar a Carmen (conta sem nenhuma linha de vínculo, mas com aulas) funciona
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
update review_bank_students set status = 'arquivado' where id = pg_temp.g('RB')::uuid;
reset role;
insert into r select (select status from review_bank_students where id = pg_temp.g('RB')::uuid) = 'arquivado', 'Banco: arquiva aluno cujo vínculo foi apagado';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try($q$update review_bank_students set status = 'ativo' where id = pg_temp.g('RB')::uuid$q$) <> 'ok'
  or (select status from review_bank_students where id = pg_temp.g('RB')::uuid) = 'arquivado', 'Banco: reativar com conta sem vínculo continua barrado';
insert into r select pg_temp.try($q$insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id, status) values (pg_temp.g('T')::uuid, 'Xavi', 'portugues', pg_temp.g('X')::uuid, 'arquivado')$q$) <> 'ok',
  'Banco: não liga conta de quem nunca foi aluno, nem arquivado';
reset role;

-- 3) Notion: ligar o nome da Carmen só para o histórico funciona
select notion_save_connection(pg_temp.g('T')::uuid, 'secret_tok', 'w1', 'Workspace', 'bot1');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'LF', notion_link_former('Carmen', pg_temp.g('C')::uuid, 'portugues')::text;
insert into v select 'LO', notion_link_former('Xavi', pg_temp.g('X')::uuid, 'portugues')::text;
reset role;
insert into r select (pg_temp.g('LF')::jsonb ->> 'ok')::boolean and pg_temp.g('LO')::jsonb ->> 'error' = 'not_your_student',
  'Notion: ligar ex-aluna sem linha de vínculo funciona; quem nunca foi aluno, não';

-- 4) Google Agenda: conexão e eventos
set local role service_role;
select gcal_save_connection(pg_temp.g('T')::uuid, 'prof@gmail.invalid', 'refresh-133', 'calendar.readonly', '[{"id":"cal@x","summary":"Aulas","primary":true}]');
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select google_calendar_set_source('cal@x', true, 'all');
reset role;
set local role service_role;
select gcal_ingest(pg_temp.g('T')::uuid, 'cal@x', jsonb_build_array(
  pg_temp.ev('g1', 'Rosinha - aula', '2026-10-05T10:00:00-03:00', '2026-10-05T11:00:00-03:00'),
  pg_temp.ev('g2', 'Rosinha - aula', '2026-10-12T10:00:00-03:00', '2026-10-12T11:00:00-03:00'),
  pg_temp.ev('g3', 'Reposição C.', '2026-10-07T09:00:00-03:00', '2026-10-07T10:00:00-03:00'),
  pg_temp.ev('g4', 'Alguém', '2026-10-08T09:00:00-03:00', '2026-10-08T10:00:00-03:00')), 'tk1', true);
reset role;
insert into v select 'G1', id::text from google_calendar_events where event_id = 'g1';
insert into v select 'G2', id::text from google_calendar_events where event_id = 'g2';
insert into v select 'G3', id::text from google_calendar_events where event_id = 'g3';
insert into v select 'G4', id::text from google_calendar_events where event_id = 'g4';
insert into r select (select count(*) from google_calendar_events where user_id = pg_temp.g('T')::uuid and match_state = 'review') = 4, 'eventos das ex-alunas ficam para revisar';

select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
-- lembrar: os dois eventos "Rosinha" entram no histórico da Rosa
insert into v select 'RG1', google_calendar_resolve(pg_temp.g('G1')::bigint, 'former', pg_temp.g('R'), 'portugues', true);
-- só este: a reposição da Carmen
insert into v select 'RG3', google_calendar_resolve(pg_temp.g('G3')::bigint, 'former', pg_temp.g('C'), 'portugues', false);
insert into v select 'RG4', pg_temp.try($q$select google_calendar_resolve(pg_temp.g('G4')::bigint, 'former', pg_temp.g('X'), 'portugues', true)$q$);
insert into v select 'RG4b', pg_temp.try($q$select google_calendar_resolve(pg_temp.g('G4')::bigint, 'former', pg_temp.g('R'), null, true)$q$);
reset role;
insert into r select pg_temp.g('RG1') = 'linked'
  and (select match_state from google_calendar_events where id = pg_temp.g('G2')::bigint) = 'linked'
  and (select count(*) from teacher_class_logs where student_id = pg_temp.g('R')::uuid and google_event_ref is not null) = 2,
  'Google: ex-aluna com "lembrar" liga este evento e os outros com o mesmo título';
insert into r select (select history_only from google_calendar_rules where teacher_id = pg_temp.g('T')::uuid and key = _gcal_key('Rosinha - aula')),
  'Google: a regra fica marcada como só histórico';
insert into r select pg_temp.g('RG3') = 'linked'
  and (select student_id from teacher_class_logs where google_event_ref = pg_temp.g('G3')::bigint) = pg_temp.g('C')::uuid
  and (select match_reason from google_calendar_events where id = pg_temp.g('G3')::bigint) = 'escolhido pela professora',
  'Google: ex-aluna "só este evento" vira aula dela';
insert into r select pg_temp.g('RG4') = 'P0001' and pg_temp.g('RG4b') = 'P0001'
  and (select match_state from google_calendar_events where id = pg_temp.g('G4')::bigint) = 'review',
  'Google: ex-aluna exige quem já foi aluno e o idioma';

-- 5) próxima leitura do Google (horário mudou): continua ligado, sem aviso
set local role service_role;
select gcal_ingest(pg_temp.g('T')::uuid, 'cal@x', jsonb_build_array(
  pg_temp.ev('g2', 'Rosinha - aula', '2026-10-12T11:00:00-03:00', '2026-10-12T12:00:00-03:00'),
  pg_temp.ev('g3', 'Reposição C.', '2026-10-07T10:00:00-03:00', '2026-10-07T11:00:00-03:00')), 'tk2', false);
select gcal_retry_waiting(pg_temp.g('T')::uuid);
reset role;
insert into r select (select match_state from google_calendar_events where id = pg_temp.g('G2')::bigint) = 'linked'
  and (select match_state from google_calendar_events where id = pg_temp.g('G3')::bigint) = 'linked'
  and (select start_time from teacher_class_logs where google_event_ref = pg_temp.g('G3')::bigint) = '10:00'
  and (select start_time from teacher_class_logs where google_event_ref = pg_temp.g('G2')::bigint) = '11:00',
  'Google: depois de reler, as aulas das ex-alunas continuam ligadas com o horário novo';

insert into r select not has_function_privilege('authenticated', '_teacher_had_student(uuid,uuid,text)', 'execute')
  and not has_function_privilege('anon', '_teacher_had_student(uuid,uuid,text)', 'execute')
  and not has_function_privilege('anon', 'google_calendar_resolve(bigint,text,text,text,boolean)', 'execute'), 'funções internas fechadas';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (133)';
rollback;
