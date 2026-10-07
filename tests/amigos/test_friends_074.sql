-- Teste da migration 074 (preferências + atividade). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('74000000-0000-0000-0000-0000000000a1','a@example.invalid'),
  ('74000000-0000-0000-0000-0000000000b1','b@example.invalid'),
  ('74000000-0000-0000-0000-0000000000c1','c@example.invalid');
insert into profiles(user_id, username, display_name) values
  ('74000000-0000-0000-0000-0000000000a1','x','Ana'),
  ('74000000-0000-0000-0000-0000000000b1','x','Beto'),
  ('74000000-0000-0000-0000-0000000000c1','x','Caio');
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
-- B e C desligam coisas
insert into friend_settings(user_id, notify_requests, accept_requests) values ('74000000-0000-0000-0000-0000000000b1', false, true);
insert into friend_settings(user_id, accept_requests) values ('74000000-0000-0000-0000-0000000000c1', false);
-- conquistas
insert into earned_badges(user_id, language_app_key, badge_id, earned_at) values
  ('74000000-0000-0000-0000-0000000000b1','frances','first_lesson', now() - interval '1 day'),
  ('74000000-0000-0000-0000-0000000000b1','mandarim','first_lesson', now() - interval '1 day'),
  ('74000000-0000-0000-0000-0000000000b1','frances','old_one', now() - interval '45 days'),
  ('74000000-0000-0000-0000-0000000000c1','frances','c_badge', now() - interval '2 days');

set local role authenticated;
select pg_temp.as_user('74000000-0000-0000-0000-0000000000a1');

-- A envia pedido a B (B desligou aviso de pedidos): funciona, mas sem aviso
select send_friend_request('74000000-0000-0000-0000-0000000000b1') as s1 \gset
reset role;
insert into r select (select count(*) from notifications where user_id='74000000-0000-0000-0000-0000000000b1' and event_type='friend_request') = 0, 'B desligou aviso de pedidos: nada gravado';
insert into r select (select count(*) from friendships where status='pending') = 1, 'pedido foi criado mesmo assim';
set local role authenticated;
-- A pede a C (C não aceita pedidos novos)
select pg_temp.as_user('74000000-0000-0000-0000-0000000000a1');
insert into r select (send_friend_request('74000000-0000-0000-0000-0000000000c1') ->> 'error') = 'not_accepting_requests', 'C não aceita pedidos: erro específico';
reset role;
insert into r select (select count(*) from friend_request_log where addressee_id='74000000-0000-0000-0000-0000000000c1') = 0, 'pedido recusado por "não aceita" não gasta o limite diário';
set local role authenticated;

-- C pede a A: C não aceita pedidos mas pode ENVIAR; A recebe aviso (padrão ligado)
select pg_temp.as_user('74000000-0000-0000-0000-0000000000c1');
insert into r select (send_friend_request('74000000-0000-0000-0000-0000000000a1') ->> 'status') = 'sent', 'C consegue enviar pedido (só não recebe)';
-- A manda de volta para C com pedido pendente de C: vira aceite mesmo com accept_requests=false
select pg_temp.as_user('74000000-0000-0000-0000-0000000000a1');
insert into r select (send_friend_request('74000000-0000-0000-0000-0000000000c1') ->> 'status') = 'accepted', 'pedido cruzado vira aceite mesmo com "não aceita pedidos"';
-- B aceita A: A é avisado do aceite
select pg_temp.as_user('74000000-0000-0000-0000-0000000000b1');
select respond_friend_request('74000000-0000-0000-0000-0000000000a1', true) as s2 \gset
reset role;
insert into r select (select count(*) from notifications where user_id='74000000-0000-0000-0000-0000000000a1' and event_type='friend_request_accepted') = 2, 'A é avisado do aceite de B (1 por site)';
-- A desliga avisos de aceite; C aceita... já são amigos; teste direto
insert into friend_settings(user_id, notify_accepts) values ('74000000-0000-0000-0000-0000000000a1', false);
delete from notifications;
select _friends_notify('74000000-0000-0000-0000-0000000000a1','friend_request_accepted',null,'x','friends');
insert into r select (select count(*) from notifications) = 0, 'aviso de aceite desligado não grava';
select _friends_notify('74000000-0000-0000-0000-0000000000a1','friend_overtake',null,'x','leaderboard');
insert into r select (select count(*) from notifications) = 2, 'outros avisos continuam (te passou ligado)';

-- atividade: A é amiga de B e C
set local role authenticated;
select pg_temp.as_user('74000000-0000-0000-0000-0000000000a1');
insert into r select (select count(*) from friends_activity('frances', 30)) = 2, 'atividade: só idioma pedido, só últimos 30 dias (b first_lesson + c_badge)';
insert into r select (select count(*) from friends_activity('mandarim', 30)) = 1, 'atividade: mandarim separado';
insert into r select (select count(*) from friends_activity('frances', 1)) = 1, 'atividade respeita o limite';
select pg_temp.as_user('74000000-0000-0000-0000-0000000000b1');
insert into r select (select count(*) from friends_activity('frances', 30) where user_id = '74000000-0000-0000-0000-0000000000c1') = 0, 'atividade: B não vê conquista de quem não é amigo (C)';
insert into r select (select count(*) from friends_activity('frances', 30)) = 0, 'B é amigo só de A (sem conquistas): vazio';
-- RLS das preferências
select pg_temp.as_user('74000000-0000-0000-0000-0000000000a1');
insert into r select (select count(*) from friend_settings) = 1, 'RLS: A só lê a própria linha de preferências';
select pg_temp.as_user('74000000-0000-0000-0000-0000000000c1');
update friend_settings set accept_requests = true where user_id = '74000000-0000-0000-0000-0000000000a1';
reset role;
insert into r select (select accept_requests from friend_settings where user_id='74000000-0000-0000-0000-0000000000c1') = false, 'RLS: C não altera a linha de A (a de C segue intacta)';
insert into r select (select count(*) from friend_settings where user_id='74000000-0000-0000-0000-0000000000a1' and accept_requests) = 1, 'RLS: linha de A continua como estava';
insert into r select not has_function_privilege('anon','public.friends_activity(text,integer)','execute'), 'anon não executa friends_activity';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
rollback;
