-- 138 (aulas de ex-aluno sem conta, ligadas ao aluno do Banco). Transação + ROLLBACK, Postgres local.
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
create or replace function pg_temp.ev(id text, title text, s text, extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'title', title, 'start', s, 'end', (s::timestamptz + interval '1 hour')::text, 'time_zone', 'America/Sao_Paulo',
                            'all_day', false, 'status', 'confirmed', 'attendees', '[]'::jsonb) || extra $$;
grant execute on function pg_temp.ev(text, text, text, jsonb) to public;

-- T professora; J (Jakob) no Banco, português, arquivado e sem conta; A aluna ativa (conta); C ex-aluna com vínculo removido
insert into auth.users(id, email) values ('13500000-0000-0000-0000-0000000000a1','t135@x.invalid'),
 ('13500000-0000-0000-0000-0000000000b1','a135@x.invalid'), ('13500000-0000-0000-0000-0000000000c1','c135@x.invalid');
insert into profiles(user_id, display_name) values ('13500000-0000-0000-0000-0000000000a1','Prof'), ('13500000-0000-0000-0000-0000000000b1','Ana'),
 ('13500000-0000-0000-0000-0000000000c1','Carmen') on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13500000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('13500000-0000-0000-0000-0000000000a1','13500000-0000-0000-0000-0000000000b1','portugues','active'),
 ('13500000-0000-0000-0000-0000000000a1','13500000-0000-0000-0000-0000000000c1','portugues','removed');
insert into permission_catalog(key, kind, label_pt) values ('review_bank', 'bool', 'Banco') on conflict do nothing;
insert into role_permissions(role, permission_key, enabled) values ('teacher', 'review_bank', true) on conflict (role, permission_key) do update set enabled = true;
insert into review_bank_students(teacher_id, name, language_app_key, status) values
 ('13500000-0000-0000-0000-0000000000a1', 'Jakob', 'portugues', 'arquivado'),
 ('13500000-0000-0000-0000-0000000000a1', 'Lia', 'portugues', 'ativo');
insert into v select 'J', id::text from review_bank_students where name = 'Jakob' and teacher_id = '13500000-0000-0000-0000-0000000000a1';
insert into v select 'L', id::text from review_bank_students where name = 'Lia' and teacher_id = '13500000-0000-0000-0000-0000000000a1';
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values
 ('13500000-0000-0000-0000-0000000000a1', '13500000-0000-0000-0000-0000000000c1', 'portugues', '2026-09-01', 'Aula antiga da Carmen');
insert into v select 'LC', id::text from teacher_class_logs where topic = 'Aula antiga da Carmen';

set local role service_role;
select gcal_save_connection('13500000-0000-0000-0000-0000000000a1', 'p@gmail.invalid', 'rf', 'calendar.readonly', '[{"id":"c@x","summary":"Aulas","primary":true}]');
reset role;
select pg_temp.as_user('13500000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_set_source('c@x', true, 'all');
reset role;
set local role service_role;
select gcal_ingest('13500000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(
  pg_temp.ev('j1', 'Jakob', '2026-10-01T10:00:00-03:00', '{"attendees":[{"email":"jakob@x.invalid"}]}'),
  pg_temp.ev('j2', 'Jakob', '2026-10-08T10:00:00-03:00', '{"attendees":[{"email":"jakob@x.invalid"}]}'),
  pg_temp.ev('j3', 'Jakob', '2026-10-15T10:00:00-03:00'),
  pg_temp.ev('k1', 'Kai', '2026-10-02T10:00:00-03:00')), 't1', true);
reset role;
insert into v select event_id, id::text from google_calendar_events where user_id = '13500000-0000-0000-0000-0000000000a1';

select pg_temp.as_user('13500000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into v values ('R1', (select google_calendar_resolve(pg_temp.g('j1')::bigint, 'former_bank', pg_temp.g('J'), null, true)));
insert into v values ('RL', pg_temp.try($q$select google_calendar_resolve(pg_temp.g('k1')::bigint, 'former_bank', pg_temp.g('L'), null, false)$q$));
reset role;
insert into r select pg_temp.g('R1') = 'linked'
  and (select count(*) from google_calendar_events where user_id = '13500000-0000-0000-0000-0000000000a1' and event_id like 'j%' and match_state = 'linked') = 3,
  'ex-aluno sem conta com Lembrar: os 3 eventos dele (e-mail e só o nome) ficam ligados';
insert into r select (select count(*) from teacher_class_logs where bank_student_id = pg_temp.g('J')::uuid and student_id is null and classroom_id is null
                        and language_app_key = 'portugues' and google_event_ref is not null) = 3,
  'viram 3 aulas ligadas ao aluno do Banco (sem aluno e sem turma), em português';
insert into r select pg_temp.g('RL') = 'P0001', 'aluno do Banco ativo (não arquivado) não é ex-aluno';

-- a professora edita a aula dele e a da ex-aluna Carmen; nenhum aviso no Mural
select pg_temp.as_user('13500000-0000-0000-0000-0000000000a1'); set local role authenticated;
update teacher_class_logs set topic = 'Pretérito perfeito' where bank_student_id = pg_temp.g('J')::uuid and class_date = '2026-10-01';
update teacher_class_logs set topic = 'Aula antiga da Carmen (editada)' where id = pg_temp.g('LC')::bigint;
insert into v values ('INS_ATIVO', pg_temp.try($q$insert into teacher_class_logs(teacher_id, bank_student_id, language_app_key, class_date, topic) values ('13500000-0000-0000-0000-0000000000a1', pg_temp.g('L')::uuid, 'portugues', '2026-10-03', 'x')$q$));
insert into v values ('INS_SEM', pg_temp.try($q$insert into teacher_class_logs(teacher_id, language_app_key, class_date, topic) values ('13500000-0000-0000-0000-0000000000a1', 'portugues', '2026-10-03', 'x')$q$));
reset role;
insert into r select (select topic from teacher_class_logs where bank_student_id = pg_temp.g('J')::uuid and class_date = '2026-10-01') = 'Pretérito perfeito',
  'professora edita a aula do ex-aluno sem conta';
insert into r select (select topic from teacher_class_logs where id = pg_temp.g('LC')::bigint) = 'Aula antiga da Carmen (editada)',
  'professora edita a aula da ex-aluna com conta (antes a RLS barrava)';
insert into r select not exists (select 1 from mural_posts where kind = 'lesson' and ref_id in (select id from teacher_class_logs where bank_student_id = pg_temp.g('J')::uuid)),
  'aula de ex-aluno sem conta não gera aviso no Mural';
insert into r select pg_temp.g('INS_ATIVO') <> 'ok' and pg_temp.g('INS_SEM') <> 'ok',
  'aula sem ninguém, ou de aluno do Banco que não é ex-aluno sem conta, continua barrada';

-- próxima leitura do Google: continua ligado; evento novo só com o nome cai na regra
set local role service_role;
select gcal_ingest('13500000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(
  pg_temp.ev('j2', 'Jakob', '2026-10-08T11:00:00-03:00', '{"attendees":[{"email":"jakob@x.invalid"}]}'),
  pg_temp.ev('j4', 'Jakob', '2026-10-22T10:00:00-03:00')), 't2', false);
select gcal_retry_waiting('13500000-0000-0000-0000-0000000000a1');
reset role;
insert into r select (select count(*) from teacher_class_logs where bank_student_id = pg_temp.g('J')::uuid) = 4
  and (select start_time from teacher_class_logs l join google_calendar_events e on e.id = l.google_event_ref where e.event_id = 'j2') = '11:00',
  'depois de reler: horário novo e o evento novo dele também vira aula';

-- só este evento (sem Lembrar)
set local role service_role;
select gcal_ingest('13500000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(pg_temp.ev('x1', 'Reposição', '2026-10-30T10:00:00-03:00')), 't3', false);
reset role;
insert into v select 'x1', id::text from google_calendar_events where event_id = 'x1' and user_id = '13500000-0000-0000-0000-0000000000a1';
select pg_temp.as_user('13500000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into v values ('RX', (select google_calendar_resolve(pg_temp.g('x1')::bigint, 'former_bank', pg_temp.g('J'), null, false)));
reset role;
set local role service_role;
select gcal_ingest('13500000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(pg_temp.ev('x1', 'Reposição', '2026-10-30T11:00:00-03:00')), 't4', false);
reset role;
insert into r select pg_temp.g('RX') = 'linked' and (select match_state from google_calendar_events where id = pg_temp.g('x1')::bigint) = 'linked'
  and (select bank_student_id from teacher_class_logs where google_event_ref = pg_temp.g('x1')::bigint) = pg_temp.g('J')::uuid,
  'só este evento: vira aula dele e continua depois de reler';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (138)';
rollback;
