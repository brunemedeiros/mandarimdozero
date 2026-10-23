-- 117 (Google Agenda -> site). Transação + ROLLBACK, Postgres local (tests/aulas-presenca/run.sh).
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
-- evento no formato que a Edge Function manda
create or replace function pg_temp.ev(id text, title text, s text, e text, extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'title', title, 'start', s, 'end', e, 'time_zone', 'America/Sao_Paulo', 'all_day', false,
                            'status', 'confirmed', 'attendees', '[]'::jsonb) || extra $$;
grant execute on function pg_temp.ev(text, text, text, text, jsonb) to public;

-- T professora; A (Ana, conta, francês, "Cat" no Banco); E (Evan, português, sem conta no começo)
insert into auth.users(id, email) values ('11700000-0000-0000-0000-0000000000a1','t117@x.invalid'),
 ('11700000-0000-0000-0000-0000000000b1','ana117@x.invalid'), ('11700000-0000-0000-0000-0000000000c1','evan117@x.invalid'),
 ('11700000-0000-0000-0000-0000000000d1','outro117@x.invalid');
insert into profiles(user_id, display_name) values ('11700000-0000-0000-0000-0000000000a1','Prof'), ('11700000-0000-0000-0000-0000000000b1','Catharina Soares'),
 ('11700000-0000-0000-0000-0000000000c1','Evan E'), ('11700000-0000-0000-0000-0000000000d1','Outro')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('11700000-0000-0000-0000-0000000000a1','teacher'), ('11700000-0000-0000-0000-0000000000d1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('11700000-0000-0000-0000-0000000000a1','11700000-0000-0000-0000-0000000000b1','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('11700000-0000-0000-0000-0000000000a1','frances','Sandra e Eduardo');
insert into v select 'K', id::text from classrooms where name = 'Sandra e Eduardo' and teacher_id = '11700000-0000-0000-0000-0000000000a1';
insert into review_bank_students(teacher_id, name, language_app_key, agenda_names, linked_student_id) values
 ('11700000-0000-0000-0000-0000000000a1','Catharina','frances', array['Cat','Catharina'], '11700000-0000-0000-0000-0000000000b1');
insert into review_bank_students(teacher_id, name, language_app_key, agenda_names) values
 ('11700000-0000-0000-0000-0000000000a1','Evan','portugues', array['Evan']);
insert into review_bank_students(teacher_id, name, language_app_key, agenda_names, classroom_id) values
 ('11700000-0000-0000-0000-0000000000a1','Sandra e Eduardo','frances', array['Sandra e Eduardo'], pg_temp.g('K')::bigint);
insert into v select 'BE', id::text from review_bank_students where name = 'Evan' and teacher_id = '11700000-0000-0000-0000-0000000000a1';
-- aula antiga importada do Notion, sem horário, mesma data do evento da Cat
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic)
 values ('11700000-0000-0000-0000-0000000000a1','11700000-0000-0000-0000-0000000000b1','frances','2026-10-26','Tema do Notion');
insert into v select 'LOLD', id::text from teacher_class_logs where topic = 'Tema do Notion';

-- conexão (como a Edge Function faria, com service_role)
set local role service_role;
select gcal_save_connection('11700000-0000-0000-0000-0000000000a1', 'brune@gmail.invalid', 'refresh-xyz', 'calendar.readonly',
  '[{"id":"primary@x","summary":"Brune Medeiros","primary":true},{"id":"trab@x","summary":"Trabalho"}]');
reset role;
select pg_temp.as_user('11700000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_set_source('trab@x', true, 'all');
select google_calendar_set_source('primary@x', true, 'matched');
insert into r select pg_temp.try('select * from google_calendar_connections') = '42501', 'app não lê os tokens do Google';
insert into r select pg_temp.try($q$select gcal_ingest('11700000-0000-0000-0000-0000000000a1','trab@x','[]',null,true)$q$) = '42501', 'app não grava eventos direto';
reset role;

set local role service_role;
insert into r select jsonb_array_length(gcal_sync_plan(null)) = 1 and (gcal_sync_plan(null) -> 0 ->> 'refresh_token') = 'refresh-xyz', 'plano de sincronização com as 2 agendas';
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  pg_temp.ev('e1', 'Cat - Prof. Brune', '2026-10-26T16:00:00-03:00', '2026-10-26T17:00:00-03:00'),
  pg_temp.ev('e3', 'Aulas de francês', '2026-10-27T14:00:00-03:00', '2026-10-27T15:00:00-03:00'),
  pg_temp.ev('e5', 'Sandra e Eduardo - Prof. Brune', '2026-10-26T11:00:00-03:00', '2026-10-26T12:30:00-03:00')
), 'tok1', true);
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'primary@x', jsonb_build_array(
  pg_temp.ev('p1', 'Almoço', '2026-10-26T12:00:00-03:00', '2026-10-26T13:00:00-03:00'),
  pg_temp.ev('p2', 'Evan', '2026-10-26T10:00:00-03:00', '2026-10-26T11:00:00-03:00'),
  pg_temp.ev('p3', 'Aniversário Ana', '2026-10-26', '2026-10-27', '{"all_day":true,"start":null,"end":null}'),
  pg_temp.ev('p4', 'Agendamento - Prof. Brune', '2026-10-28T15:00:00-03:00', '2026-10-28T16:00:00-03:00',
             '{"attendees":[{"email":"ana117@x.invalid","name":"Ana"}]}'),
  pg_temp.ev('p5', 'Life Dance - Prof. Lara', '2026-10-26T09:00:00-03:00', '2026-10-26T10:00:00-03:00')
), 'tokp', true);
reset role;
create temp view st as select event_id, match_state, match_reason from google_calendar_events;
insert into r select (select match_state from st where event_id='e1') = 'linked', '"Cat - Prof. Brune" reconhecida pelo nome na agenda do Banco';
insert into r select (select google_event_ref is not null and start_time = '16:00' and duration_minutes = 60 and topic = 'Tema do Notion'
                        from teacher_class_logs where id = pg_temp.g('LOLD')::bigint), 'aula antiga do Notion ligada ao evento e ganhou 16:00 / 60 min, sem perder o tema';
insert into r select (select count(*) from teacher_class_logs where student_id = '11700000-0000-0000-0000-0000000000b1' and class_date = '2026-10-26') = 1, 'não duplicou a aula do dia';
insert into r select (select match_state from st where event_id='e3') = 'review', 'agenda Trabalho: título desconhecido vai para revisar';
insert into r select (select match_state from st where event_id='e5') = 'linked'
  and (select count(*) from teacher_class_logs where classroom_id = pg_temp.g('K')::bigint and start_time = '11:00' and duration_minutes = 90) = 1, 'turma Sandra e Eduardo: aula de turma criada às 11:00 com 90 min';
insert into r select (select match_state from st where event_id='p1') = 'ignored', 'agenda principal: "Almoço" ignorado sem incomodar';
insert into r select (select match_state from st where event_id='p5') = 'ignored', 'agenda principal: "Life Dance" ignorado';
insert into r select (select match_state from st where event_id='p3') = 'ignored', 'dia inteiro (aniversário) ignorado';
insert into r select (select title is null and attendees = '[]'::jsonb from google_calendar_events where event_id = 'p1')
  and (select title is null from google_calendar_events where event_id = 'p3'), 'evento pessoal ignorado não guarda título nem convidados';
insert into r select (select title from google_calendar_events where event_id = 'e3') = 'Aulas de francês', 'evento para revisar mantém o título (a professora precisa ver)';
insert into r select (select match_state from st where event_id='p2') = 'no_account', 'Evan sem conta no site: guardado esperando';
insert into r select (select match_state from st where event_id='p4') = 'linked'
  and exists (select 1 from teacher_class_logs where student_id = '11700000-0000-0000-0000-0000000000b1' and class_date = '2026-10-28' and start_time = '15:00'),
  'agendamento reconhecido pelo e-mail do convidado';
insert into r select (select sync_token from google_calendar_sources where calendar_id = 'trab@x') = 'tok1', 'guarda o sync token para a próxima leitura';

-- mesma leitura de novo, nada mudou: não reprocessa
set local role service_role;
insert into r select (gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  pg_temp.ev('e1', 'Cat - Prof. Brune', '2026-10-26T16:00:00-03:00', '2026-10-26T17:00:00-03:00')), null, false) -> 'counts' ->> 'same') = '1', 'evento sem mudança não é reprocessado';
reset role;
-- arrastou no Google: 16:00 -> 17:30
set local role service_role;
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  pg_temp.ev('e1', 'Cat - Prof. Brune', '2026-10-26T17:30:00-03:00', '2026-10-26T18:30:00-03:00')), 'tok2', false);
reset role;
insert into r select (select start_time = '17:30' from teacher_class_logs where id = pg_temp.g('LOLD')::bigint), 'mudou no Google, o site acompanha (mesma aula)';

-- professora resolve "Aulas de francês" = Catharina, lembrando a regra
insert into v select 'E_' || event_id, id::text from google_calendar_events;
select pg_temp.as_user('11700000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into r select (select count(*) from google_calendar_review_list()) = 1, 'caixa de revisar mostra 1 evento';
insert into r select google_calendar_resolve(pg_temp.g('E_e3')::bigint, 'student', '11700000-0000-0000-0000-0000000000b1', 'frances', true) = 'linked', 'resolver vira aula';
insert into r select pg_temp.try($q$select google_calendar_resolve(pg_temp.g('E_p1')::bigint, 'student', '11700000-0000-0000-0000-0000000000d1', 'frances', true)$q$) = 'P0001', 'não deixa ligar a quem não é aluno';
reset role;
set local role service_role;
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  pg_temp.ev('e7', 'Aulas de francês', '2026-11-03T14:00:00-03:00', '2026-11-03T15:00:00-03:00')), 'tok3', false);
reset role;
insert into r select (select match_state from st where event_id='e7') = 'linked', 'regra aprendida: o próximo "Aulas de francês" já entra sozinho';

-- cancelou no Google: a aula não some
set local role service_role;
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  jsonb_build_object('id','e1','status','cancelled')), 'tok4', false);
reset role;
insert into r select (select match_state from st where event_id='e1') = 'cancelled' and exists (select 1 from teacher_class_logs where id = pg_temp.g('LOLD')::bigint),
  'cancelado no Google: aula continua e vai para revisar';
select pg_temp.as_user('11700000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into r select google_calendar_resolve(pg_temp.g('E_e1')::bigint, 'keep') = 'keep', 'resolver cancelado: manter a aula';
insert into r select not exists (select 1 from google_calendar_review_list() x where x.id = pg_temp.g('E_e1')::bigint), 'manter a aula tira da caixa';
insert into r select true, 'na caixa: ' || coalesce((select string_agg(title || '/' || match_state, ', ') from google_calendar_review_list()), '(vazia)');
insert into r select (google_calendar_status() -> 'counts' ->> 'no_account')::int = 1 and google_calendar_status() ->> 'google_email' = 'brune@gmail.invalid', 'status para a tela';
reset role;

-- Evan ganha conta e vínculo: o evento guardado vira aula
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('11700000-0000-0000-0000-0000000000a1','11700000-0000-0000-0000-0000000000c1','portugues','active');
update review_bank_students set linked_student_id = '11700000-0000-0000-0000-0000000000c1' where id = pg_temp.g('BE')::uuid;
set local role service_role;
select gcal_retry_waiting('11700000-0000-0000-0000-0000000000a1');
reset role;
insert into r select (select match_state from st where event_id='p2') = 'linked'
  and exists (select 1 from teacher_class_logs where student_id = '11700000-0000-0000-0000-0000000000c1' and start_time = '10:00'), 'Evan vinculado: aula aparece com 10:00';

-- 118: evento não reconhecido (aluna fora da lista) fica na caixa e entra sozinho quando a aluna ganha conta e vínculo
set local role service_role;
select gcal_ingest('11700000-0000-0000-0000-0000000000a1', 'trab@x', jsonb_build_array(
  pg_temp.ev('z1', 'Zoe - aula', '2026-10-28T14:00:00-03:00', '2026-10-28T15:00:00-03:00')), null, false);
reset role;
insert into r select (select match_state from google_calendar_events where event_id = 'z1') = 'review', '118: aluna fora da lista: evento fica para revisar';
insert into auth.users(id, email) values ('11700000-0000-0000-0000-0000000000e1','zoe117@x.invalid');
insert into profiles(user_id, display_name) values ('11700000-0000-0000-0000-0000000000e1','Zoe Lima')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('11700000-0000-0000-0000-0000000000a1','11700000-0000-0000-0000-0000000000e1','frances','active');
set local role service_role;
select gcal_retry_waiting('11700000-0000-0000-0000-0000000000a1');
reset role;
insert into r select (select match_state from google_calendar_events where event_id = 'z1') = 'linked'
  and exists (select 1 from teacher_class_logs where student_id = '11700000-0000-0000-0000-0000000000e1' and class_date = '2026-10-28' and start_time = '14:00'),
  '118: Zoe vinculada: o evento da caixa vira aula na próxima leitura';

-- link de agenda: professora conectada não recebe as aulas do Google (já estão na agenda dela); sem horário = dia inteiro
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic)
 values ('11700000-0000-0000-0000-0000000000a1','11700000-0000-0000-0000-0000000000b1','frances', current_date - 2, 'Sem horário, sem Google');
insert into calendar_feed_tokens(user_id, token) values ('11700000-0000-0000-0000-0000000000a1', 'abcdefghjkmnpqrs'), ('11700000-0000-0000-0000-0000000000b1', 'stuvwxyz23456789');
set local role service_role;
insert into r select (select count(*) from class_calendar_feed('abcdefghjkmnpqrs') f where f.topic = 'Tema do Notion') = 0
  and (select start_at is null from class_calendar_feed('abcdefghjkmnpqrs') f where f.topic = 'Sem horário, sem Google'), 'link da professora: sem as aulas do Google; sem horário = dia inteiro';
insert into r select (select count(*) from class_calendar_feed('stuvwxyz23456789') f where f.topic = 'Tema do Notion') = 1, 'link da aluna continua com a aula (com o horário do Google)';
reset role;

-- desconectar: aulas ficam
select pg_temp.as_user('11700000-0000-0000-0000-0000000000a1'); set local role authenticated;
select google_calendar_disconnect();
reset role;
insert into r select not exists (select 1 from google_calendar_connections where user_id = '11700000-0000-0000-0000-0000000000a1')
  and exists (select 1 from teacher_class_logs where id = pg_temp.g('LOLD')::bigint and google_event_ref is null), 'desconectar apaga tokens e eventos, as aulas ficam';
select pg_temp.as_user(null); set local role authenticated;
insert into r select pg_temp.try('select google_calendar_status()') = 'P0001', 'sem login: não autorizado';
reset role;
insert into r select has_function_privilege('anon', 'google_calendar_status()', 'execute') = false and has_function_privilege('authenticated', 'gcal_sync_plan(uuid)', 'execute') = false, 'permissões fechadas';
select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (117)';
rollback;
