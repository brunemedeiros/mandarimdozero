-- Teste da migration 073 (amigos + ranking). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;

insert into auth.users(id, email) values
  ('73000000-0000-0000-0000-0000000000a1','a@example.invalid'),
  ('73000000-0000-0000-0000-0000000000b1','b@example.invalid'),
  ('73000000-0000-0000-0000-0000000000c1','c@example.invalid'),
  ('73000000-0000-0000-0000-0000000000d1','d@example.invalid');
insert into profiles(user_id, username, display_name) values
  ('73000000-0000-0000-0000-0000000000a1','x','Ana Souza'),
  ('73000000-0000-0000-0000-0000000000b1','x','João Pereira'),
  ('73000000-0000-0000-0000-0000000000c1','x','Carla'),
  ('73000000-0000-0000-0000-0000000000d1','x',null);
update profiles set public_profile = false where user_id = '73000000-0000-0000-0000-0000000000b1';

-- semana corrente de teste
create temp table wk as select '2026-10-05'::date as w;
grant all on wk to public;
insert into weekly_xp(user_id, week_start, language_app_key, amount) values
  ('73000000-0000-0000-0000-0000000000a1','2026-10-05','frances',100),
  ('73000000-0000-0000-0000-0000000000b1','2026-10-05','frances',50),
  ('73000000-0000-0000-0000-0000000000b1','2026-10-05','mandarim',70),
  ('73000000-0000-0000-0000-0000000000c1','2026-10-05','frances',500);

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;

set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');

-- busca
insert into r select (select count(*) from search_profiles_for_friends('jo')) = 0, 'busca: menos de 3 letras não retorna';
insert into r select (select count(*) from search_profiles_for_friends('joao')) = 1, 'busca por nome sem acento acha João';
insert into r select (select count(*) from search_profiles_for_friends('PEREIRA')) = 1, 'busca case-insensitive';
insert into r select (select count(*) from search_profiles_for_friends('souza')) = 0, 'busca não retorna a própria pessoa';
insert into r select (select count(*) from search_profiles_for_friends('%%%')) = 0, 'busca: curinga % não lista todo mundo';
insert into r select (select count(*) from search_profiles_for_friends('___')) = 0, 'busca: curinga _ não lista todo mundo';
insert into r select (select count(*) from search_profiles_for_friends((select username from profiles where user_id='73000000-0000-0000-0000-0000000000c1'))) = 1, 'busca por username';
insert into r select (select count(*) from search_profiles_for_friends('@' || (select username from profiles where user_id='73000000-0000-0000-0000-0000000000c1'))) = 1, 'busca por @username';

-- pedido
insert into r select (send_friend_request('73000000-0000-0000-0000-0000000000b1') ->> 'status') = 'sent', 'A envia pedido a B (B é privado)';
insert into r select (send_friend_request('73000000-0000-0000-0000-0000000000b1') ->> 'error') = 'already_sent', 'pedido repetido -> already_sent';
insert into r select (send_friend_request('73000000-0000-0000-0000-0000000000a1') ->> 'error') = 'invalid_target', 'não dá para pedir a si mesmo';
insert into r select (send_friend_request(gen_random_uuid()) ->> 'error') = 'not_found', 'pessoa inexistente';
insert into r select (select relation from search_profiles_for_friends('joao')) = 'sent', 'relation = sent';
insert into r select (select count(*) from friendships) = 1, 'A vê só a própria linha';
-- A não consegue aceitar o próprio pedido
insert into r select (respond_friend_request('73000000-0000-0000-0000-0000000000b1', true) ->> 'error') = 'no_pending_request', 'quem pediu não aceita';

reset role;
insert into r select (select count(*) from notifications where user_id='73000000-0000-0000-0000-0000000000b1' and event_type='friend_request') = 2, 'B recebeu notificação do pedido (2 sites)';
insert into r select (select body from notifications where user_id='73000000-0000-0000-0000-0000000000b1' and event_type='friend_request' limit 1) like 'Ana Souza enviou%', 'texto usa o nome';
insert into r select (select action_tab from notifications where user_id='73000000-0000-0000-0000-0000000000b1' limit 1) = 'friends', 'clique abre friends';

set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000c1');
insert into r select (select count(*) from friendships) = 0, 'C não vê amizade alheia (RLS)';
insert into r select (respond_friend_request('73000000-0000-0000-0000-0000000000a1', true) ->> 'error') = 'no_pending_request', 'C não aceita pedido que não é dele';
do $$ begin
  begin insert into friendships(requester_id, addressee_id) values ('73000000-0000-0000-0000-0000000000c1','73000000-0000-0000-0000-0000000000d1'); insert into r values (false,'insert direto deveria falhar');
  exception when insufficient_privilege then insert into r values (true,'insert direto em friendships negado'); end;
end $$;

select pg_temp.as_user('73000000-0000-0000-0000-0000000000b1');
insert into r select (select count(*) from friendships) = 1, 'B vê o pedido recebido';
insert into r select (respond_friend_request('73000000-0000-0000-0000-0000000000a1', true) ->> 'status') = 'accepted', 'B aceita';
insert into r select (respond_friend_request('73000000-0000-0000-0000-0000000000a1', true) ->> 'error') = 'no_pending_request', 'aceite não repete';
reset role;
insert into r select (select count(*) from notifications where user_id='73000000-0000-0000-0000-0000000000a1' and event_type='friend_request_accepted') = 2, 'A recebeu notificação do aceite';

-- ranking de amigos
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');
insert into r select (select count(*) from friends_leaderboard('all', '2026-10-05')) = 2, 'ranking: eu + 1 amigo (C não é amigo, mesmo com 500 XP)';
insert into r select (select amount from friends_leaderboard('all','2026-10-05') where not is_me) = 120, 'ranking Geral soma idiomas (B=120)';
insert into r select (select amount from friends_leaderboard('mandarim','2026-10-05') where not is_me) = 70, 'ranking por idioma (B mandarim=70)';
insert into r select (select user_id from friends_leaderboard('all','2026-10-05') limit 1) = '73000000-0000-0000-0000-0000000000b1', 'ordem por XP (B 120 > A 100)';
insert into r select (select amount from friends_leaderboard('all','2000-01-03') where is_me) = 0, 'semana sem XP: eu apareço com 0';
-- amigo privado aparece para o amigo (já está na lista acima); não-amigo C não vê B
select pg_temp.as_user('73000000-0000-0000-0000-0000000000c1');
insert into r select (select count(*) from friends_leaderboard('all','2026-10-05')) = 1, 'C sem amigos: só ele mesmo';

-- limite de 20 pedidos/dia e recusa
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
reset role;
insert into auth.users(id, email) select ('73100000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'u'||g||'@example.invalid' from generate_series(1,22) g;
insert into profiles(user_id, username) select ('73100000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'x' from generate_series(1,22) g;
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
do $$ declare i int; res jsonb; okc int := 0; begin
  for i in 1..22 loop
    res := send_friend_request(('73100000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid);
    if res ? 'ok' then okc := okc + 1; end if;
  end loop;
  insert into r values (okc = 20, '20 pedidos/dia: enviou ' || okc);
  insert into r values ((res ->> 'error') = 'daily_request_limit', 'o 21º/22º -> daily_request_limit');
end $$;
-- recusa: não conta contra quem enviou, mas bloqueia reenvio por 7 dias
select pg_temp.as_user('73100000-0000-0000-0000-000000000001');
insert into r select (respond_friend_request('73000000-0000-0000-0000-0000000000d1', false) ->> 'status') = 'declined', 'recusar';
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
insert into r select (send_friend_request('73100000-0000-0000-0000-000000000001') ->> 'error') = 'declined_recently', 'reenvio em < 7 dias bloqueado';
-- depois do recuo (simulado) já pode reenviar? (e a recusa liberou 1 vaga no limite diário)
reset role;
update friendships set responded_at = now() - interval '8 days' where addressee_id = '73100000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
insert into r select (send_friend_request('73100000-0000-0000-0000-000000000001') ->> 'status') = 'sent', 'reenvio após 7 dias';

-- pedido cruzado vira aceite
select pg_temp.as_user('73100000-0000-0000-0000-000000000002');
insert into r select (send_friend_request('73000000-0000-0000-0000-0000000000d1') ->> 'status') = 'accepted', 'pedido cruzado = aceite';

-- cancelar e desfazer
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
insert into r select (cancel_friend_request('73100000-0000-0000-0000-000000000003') ->> 'ok')::boolean, 'cancelar pedido enviado';
insert into r select (cancel_friend_request('73100000-0000-0000-0000-000000000003') ->> 'error') = 'no_pending_request', 'cancelar de novo -> erro';
insert into r select (remove_friend('73100000-0000-0000-0000-000000000002') ->> 'ok')::boolean, 'desfazer amizade';
insert into r select (remove_friend('73100000-0000-0000-0000-000000000002') ->> 'error') = 'not_friends', 'desfazer sem amizade -> erro';
-- após desfazer, pode pedir de novo
reset role;
delete from friend_request_log where requester_id = '73000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000d1');
insert into r select (send_friend_request('73100000-0000-0000-0000-000000000002') ->> 'status') = 'sent', 'após desfazer pode pedir de novo';
reset role;

-- limite de 100 amigos
insert into auth.users(id, email) select ('73200000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'f'||g||'@example.invalid' from generate_series(1,101) g;
insert into profiles(user_id, username) select ('73200000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'x' from generate_series(1,101) g;
insert into friendships(requester_id, addressee_id, status, responded_at)
  select '73000000-0000-0000-0000-0000000000c1', ('73200000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'accepted', now() from generate_series(1,100) g;
set local role authenticated;
select pg_temp.as_user('73200000-0000-0000-0000-000000000101');
insert into r select (send_friend_request('73000000-0000-0000-0000-0000000000c1') ->> 'error') = 'target_friend_limit', 'alvo com 100 amigos';
select pg_temp.as_user('73000000-0000-0000-0000-0000000000c1');
insert into r select (send_friend_request('73200000-0000-0000-0000-000000000101') ->> 'error') = 'friend_limit_reached', 'eu com 100 amigos';
reset role;

-- permissões
insert into r select not has_function_privilege('anon','public.send_friend_request(uuid)','execute'), 'anon sem EXECUTE (send)';
insert into r select not has_function_privilege('anon','public.search_profiles_for_friends(text)','execute'), 'anon sem EXECUTE (busca)';
insert into r select not has_function_privilege('authenticated','public.process_friend_overtakes(date)','execute'), 'authenticated sem EXECUTE (varredura)';
insert into r select has_function_privilege('service_role','public.process_friend_overtakes(date)','execute'), 'service_role executa varredura';
insert into r select not has_function_privilege('authenticated','public._friends_notify(uuid,text,text,text,text)','execute'), 'helper de notificação fechado';
insert into r select not has_table_privilege('anon','public.friendships','select'), 'anon sem SELECT em friendships';


-- cancelar/desfazer NÃO burlam o limite de 20 pedidos/dia (registro separado)
reset role;
delete from friend_request_log; delete from friendships;
delete from notifications;
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');
do $$ declare i int; res jsonb; okc int := 0; begin
  for i in 1..30 loop
    res := send_friend_request('73000000-0000-0000-0000-0000000000c1');
    if res ? 'ok' then okc := okc + 1; end if;
    perform cancel_friend_request('73000000-0000-0000-0000-0000000000c1');
  end loop;
  insert into r values (okc = 20, 'enviar+cancelar em loop: no máximo 20 pedidos (' || okc || ')');
end $$;
reset role;
insert into r select (select count(*) from notifications where user_id = '73000000-0000-0000-0000-0000000000c1') = 40, 'vítima recebeu no máximo 20 pedidos x 2 sites de notificação';
-- recusa devolve a vaga (apaga o registro mais recente)
delete from friend_request_log; delete from friendships;
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');
select send_friend_request('73000000-0000-0000-0000-0000000000c1');
select pg_temp.as_user('73000000-0000-0000-0000-0000000000c1');
select respond_friend_request('73000000-0000-0000-0000-0000000000a1', false);
reset role;
insert into r select (select count(*) from friend_request_log where requester_id = '73000000-0000-0000-0000-0000000000a1') = 0, 'recusa não conta no limite de quem enviou';
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');
insert into r select (select relation from search_profiles_for_friends('carla') where user_id = '73000000-0000-0000-0000-0000000000c1') = 'declined_recently', 'busca: recusado há <7 dias -> declined_recently';
-- busca devolve no máximo 20
reset role;
insert into auth.users(id, email) select ('73300000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 's'||g||'@example.invalid' from generate_series(1,30) g;
insert into profiles(user_id, username, display_name) select ('73300000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, 'x', 'Zuleide ' || g from generate_series(1,30) g;
set local role authenticated;
select pg_temp.as_user('73000000-0000-0000-0000-0000000000a1');
insert into r select (select count(*) from search_profiles_for_friends('zuleide')) = 20, 'busca: no máximo 20 resultados';
reset role;
insert into r select not has_table_privilege('authenticated','public.friend_request_log','select'), 'registro de pedidos fechado ao cliente';

-- varredura "te passou"
delete from notifications; delete from friendships; delete from friend_rank_state;
insert into friendships(requester_id, addressee_id, status) values
  ('73000000-0000-0000-0000-0000000000a1','73000000-0000-0000-0000-0000000000b1','accepted'),
  ('73000000-0000-0000-0000-0000000000a1','73000000-0000-0000-0000-0000000000d1','accepted');
delete from weekly_xp;
insert into weekly_xp values
  ('73000000-0000-0000-0000-0000000000a1','2026-10-05','frances',100,now()),
  ('73000000-0000-0000-0000-0000000000b1','2026-10-05','frances',50,now()),
  ('73000000-0000-0000-0000-0000000000d1','2026-10-05','frances',10,now());
select process_friend_overtakes('2026-10-05');
insert into r select (select count(*) from notifications) = 0, 'varredura 1: só registra estado, ninguém notificado';
update weekly_xp set amount = 150 where user_id = '73000000-0000-0000-0000-0000000000b1';
update weekly_xp set amount = 130 where user_id = '73000000-0000-0000-0000-0000000000d1';
select process_friend_overtakes('2026-10-05');
insert into r select (select count(*) from notifications where user_id='73000000-0000-0000-0000-0000000000a1' and event_type='friend_overtake') = 2, 'varredura 2: A notificado 1x por site (2 linhas), só 1 aviso';
insert into r select (select body from notifications where event_type='friend_overtake' limit 1) like 'João Pereira passou%', 'avisa o amigo com mais XP (B=150, não D=130)';
select process_friend_overtakes('2026-10-05');
insert into r select (select count(*) from notifications where event_type='friend_overtake') = 2, 'varredura 3 no mesmo estado: não repete';
-- quem nunca pontuou não é avisado
delete from notifications; update friend_rank_state set friend_ahead = false;
update weekly_xp set amount = 0 where user_id = '73000000-0000-0000-0000-0000000000a1';
select process_friend_overtakes('2026-10-05');
insert into r select (select count(*) from notifications) = 0, 'eu com 0 XP: ninguém "me passou"';
-- preferência desligada
insert into notification_preferences(user_id, channels) values ('73000000-0000-0000-0000-0000000000a1', '{"amigos":["push"]}'::jsonb);
select _friends_notify('73000000-0000-0000-0000-0000000000a1','friend_request',null,'x','friends');
insert into r select (select count(*) from notifications) = 0, 'respeita preferência (in_app desligado em amigos)';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
rollback;
