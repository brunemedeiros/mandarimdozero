-- 134 ("Lembrar" pelo e-mail também vale pelo nome do evento, se o nome for só daquela pessoa). Transação + ROLLBACK.
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
create or replace function pg_temp.ev(id text, title text, s text, extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'title', title, 'start', s, 'end', (s::timestamptz + interval '1 hour')::text, 'time_zone', 'America/Sao_Paulo',
                            'all_day', false, 'status', 'confirmed', 'attendees', '[]'::jsonb) || extra $$;
grant execute on function pg_temp.ev(text, text, text, jsonb) to public;
create or replace function pg_temp.st(eid text) returns text language sql as $$
  select match_state || '/' || coalesce(match_reason, '') from google_calendar_events where event_id = eid $$;
grant execute on function pg_temp.st(text) to public;

insert into auth.users(id, email) values ('13400000-0000-0000-0000-0000000000a1','t134@x.invalid');
insert into profiles(user_id, display_name) values ('13400000-0000-0000-0000-0000000000a1','Prof') on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('13400000-0000-0000-0000-0000000000a1','teacher');
set local role service_role;
select gcal_save_connection('13400000-0000-0000-0000-0000000000a1', 'p@gmail.invalid', 'rf', 'calendar.readonly', '[{"id":"c@x","summary":"Aulas","primary":true}]');
reset role;
select pg_temp.as_user('13400000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_set_source('c@x', true, 'all');
reset role;
set local role service_role;
select gcal_ingest('13400000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(
  pg_temp.ev('j1', 'Jakob', '2026-10-01T10:00:00-03:00', '{"attendees":[{"email":"jakob@x.invalid"}]}'),
  pg_temp.ev('j2', 'Jakob', '2026-10-08T10:00:00-03:00', '{"attendees":[{"email":"jakob@x.invalid"}]}'),
  pg_temp.ev('j3', 'Jakob', '2026-10-15T10:00:00-03:00'),
  pg_temp.ev('a1', 'Aulas de francês', '2026-10-02T10:00:00-03:00', '{"attendees":[{"email":"ana@x.invalid"}]}'),
  pg_temp.ev('a2', 'Aulas de francês', '2026-10-03T10:00:00-03:00', '{"attendees":[{"email":"bia@x.invalid"}]}'),
  pg_temp.ev('a3', 'Aulas de francês', '2026-10-04T10:00:00-03:00')), 't1', true);
reset role;
insert into v select event_id, id::text from google_calendar_events where user_id = '13400000-0000-0000-0000-0000000000a1';
-- j3 pulado antes (como a autora fez)
select pg_temp.as_user('13400000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_resolve(pg_temp.g('j3')::bigint, 'skip');
select google_calendar_resolve(pg_temp.g('j1')::bigint, 'outside', null, null, true);
select google_calendar_resolve(pg_temp.g('a1')::bigint, 'outside', null, null, true);
reset role;
insert into r select pg_temp.st('j1') = 'ignored/regra: fora do site' and pg_temp.st('j2') = 'ignored/regra: fora do site',
  'Fora do site com Lembrar: os eventos com o e-mail dele';
insert into r select pg_temp.st('j3') = 'ignored/regra: fora do site', 'e também o evento só com o nome (mesmo pulado antes)';
insert into r select (select count(*) from google_calendar_rules where teacher_id = '13400000-0000-0000-0000-0000000000a1' and key = 'jakob' and key_type = 'title') = 1,
  'regra pelo nome criada junto com a do e-mail';
insert into r select pg_temp.st('a2') = 'review/não reconhecido' and pg_temp.st('a3') = 'review/não reconhecido'
  and not exists (select 1 from google_calendar_rules where teacher_id = '13400000-0000-0000-0000-0000000000a1' and key_type = 'title' and key = _gcal_key('Aulas de francês')),
  'título usado por outras pessoas ("Aulas de francês") não vira regra de nome';
-- próxima leitura: evento novo só com o nome também cai na regra
set local role service_role;
select gcal_ingest('13400000-0000-0000-0000-0000000000a1', 'c@x', jsonb_build_array(pg_temp.ev('j4', 'Jakob', '2026-10-22T10:00:00-03:00')), 't2', false);
reset role;
insert into r select pg_temp.st('j4') = 'ignored/regra: fora do site', 'evento novo com o nome dele cai na mesma regra';
-- Trazer de volta desliga as duas regras
select pg_temp.as_user('13400000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_resolve(pg_temp.g('j1')::bigint, 'restore');
reset role;
insert into r select not exists (select 1 from google_calendar_rules where teacher_id = '13400000-0000-0000-0000-0000000000a1' and active and action = 'ignore' and (key = 'jakob' or key = 'jakob@x.invalid'))
  and pg_temp.st('j3') like 'review/%', 'Trazer de volta desfaz as duas regras';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (134)';
rollback;
