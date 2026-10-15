-- Teste da migration 101 (sequência com amigo, cutucar, missão em dupla). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
select (now() at time zone 'America/Sao_Paulo')::date as d0, date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date as w0 \gset
-- A = eu; B amiga (sequência 10, estudou hoje); C amigo (sequência 4 até ontem, não estudou hoje);
-- D amiga sem sequência; E amigo que não aceita cutucadas; F não é amigo; G amiga de A já em missão com H
create temp table ppl(x text, h text) on commit drop;
insert into ppl values ('a','a1'),('b','b1'),('c','c1'),('d','d1'),('e','e1'),('f','f1'),('g','11'),('h','12');
insert into auth.users(id, email) select ('10000000-0000-0000-0000-0000000000' || h)::uuid, x || '100@example.invalid' from ppl;
insert into profiles(user_id, username, display_name, public_profile)
select ('10000000-0000-0000-0000-0000000000' || h)::uuid, 'u100' || x, 'Pessoa ' || upper(x), false from ppl
on conflict (user_id) do update set display_name = excluded.display_name;
insert into friendships(requester_id, addressee_id, status, requested_at, responded_at)
select '10000000-0000-0000-0000-0000000000a1', ('10000000-0000-0000-0000-0000000000' || h)::uuid, 'accepted', now(), now()
from ppl where x in ('b','c','d','e','g');
insert into friendships(requester_id, addressee_id, status, requested_at, responded_at) values
  ('10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000012','accepted', now(), now());
-- A: sequência 6 até hoje
insert into progress(user_id, data) values
  ('10000000-0000-0000-0000-0000000000a1', jsonb_build_object('_account', jsonb_build_object('streak', 6, 'lastStudyDay', to_char(:'d0'::date, 'YYYY-MM-DD')))),
  ('10000000-0000-0000-0000-0000000000b1', jsonb_build_object('_account', jsonb_build_object('streak', 10, 'lastStudyDay', to_char(:'d0'::date, 'YYYY-MM-DD')))),
  ('10000000-0000-0000-0000-0000000000c1', jsonb_build_object('frances', jsonb_build_object('streak', 4, 'lastStudyDay', to_char(:'d0'::date - 1, 'YYYY-MM-DD')))),
  ('10000000-0000-0000-0000-0000000000d1', jsonb_build_object('_account', jsonb_build_object('streak', 9, 'lastStudyDay', to_char(:'d0'::date - 3, 'YYYY-MM-DD'))));
insert into friend_settings(user_id, accept_nudges) values ('10000000-0000-0000-0000-0000000000e1', false);
insert into weekly_xp(user_id, week_start, language_app_key, amount) values
  ('10000000-0000-0000-0000-0000000000a1', :'w0', 'frances', 100),
  ('10000000-0000-0000-0000-0000000000c1', :'w0', 'frances', 40);
create temp table snap as select md5(string_agg(user_id::text || data::text, ',' order by user_id)) h from progress;
grant all on snap to public;

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
set local role authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-0000000000a1');
create temp table fd on commit drop as select * from friends_duo();

-- sequência com amigo
insert into r select (select joint_streak from fd where user_id = '10000000-0000-0000-0000-0000000000b1') = 6, 'A(6) x B(10), os dois hoje: 6 dias juntos';
insert into r select (select joint_streak from fd where user_id = '10000000-0000-0000-0000-0000000000c1') = 4, 'A(6 até hoje) x C(4 até ontem): 4 dias juntos';
insert into r select (select joint_streak from fd where user_id = '10000000-0000-0000-0000-0000000000d1') = 0, 'D perdeu a sequência: 0';
insert into r select (select joint_streak from fd where user_id = '10000000-0000-0000-0000-0000000000e1') = 0, 'E sem progresso: 0';
insert into r select (select count(*) from fd) = 5, 'só amigos aceitos aparecem (B, C, D, E, G)';

-- cutucar
insert into r select (select can_nudge from fd where user_id = '10000000-0000-0000-0000-0000000000b1') = false, 'B já estudou hoje: sem cutucar';
insert into r select (select can_nudge from fd where user_id = '10000000-0000-0000-0000-0000000000c1'), 'C não estudou hoje: pode cutucar';
insert into r select (select can_nudge from fd where user_id = '10000000-0000-0000-0000-0000000000e1') = false, 'E desligou as cutucadas';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000b1') ->> 'error' = 'already_studied', 'cutucar quem já estudou: recusado';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000e1') ->> 'error' = 'nudges_off', 'cutucar quem desligou: recusado';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000f1') ->> 'error' = 'not_friends', 'cutucar quem não é amigo: recusado';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000a1') ->> 'error' = 'invalid_target', 'cutucar a si mesma: recusado';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000c1') ->> 'status' = 'sent', 'cutucar C: enviado';
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000c1') ->> 'status' = 'already', 'cutucar C de novo hoje: sem segundo aviso';
insert into r select (select nudged_today and not can_nudge from friends_duo() where user_id = '10000000-0000-0000-0000-0000000000c1'), 'C aparece como já cutucado';
select pg_temp.as_user('10000000-0000-0000-0000-0000000000b1');
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000a1') ->> 'error' = 'already_studied', 'B não cutuca A (A estudou hoje)';
reset role;
insert into r select (select count(*) from notifications where user_id = '10000000-0000-0000-0000-0000000000c1' and event_type = 'friend_nudge') = 2, 'C recebeu 1 aviso (nos 2 sites)';
insert into r select (select body from notifications where user_id = '10000000-0000-0000-0000-0000000000c1' and event_type = 'friend_nudge' limit 1) like 'Pessoa A cutucou você: estude hoje para manter os 4 dias seguidos de vocês%', 'aviso cita os 4 dias juntos';
-- segundo amigo cutuca C: aviso agrupado (reescreve o não lido)
insert into friendships(requester_id, addressee_id, status, requested_at, responded_at) values
  ('10000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-0000000000c1','accepted', now(), now());
set local role authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-0000000000b1');
insert into r select nudge_friend('10000000-0000-0000-0000-0000000000c1') ->> 'status' = 'sent', 'B cutuca C';
reset role;
insert into r select (select count(*) from notifications where user_id = '10000000-0000-0000-0000-0000000000c1' and event_type = 'friend_nudge') = 2
  and (select bool_and(body like 'Pessoa B e mais 1 amigo cutucaram você%') from notifications where user_id = '10000000-0000-0000-0000-0000000000c1' and event_type = 'friend_nudge'), 'aviso agrupado: "B e mais 1 amigo cutucaram você"';

-- missão em dupla
set local role authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-000000000011');
insert into r select (start_duo_mission('10000000-0000-0000-0000-000000000012', 300) ->> 'ok')::boolean, 'G começa missão com H';
select pg_temp.as_user('10000000-0000-0000-0000-0000000000a1');
insert into r select (select in_mission from friends_duo() where user_id = '10000000-0000-0000-0000-000000000011'), 'G aparece como já em missão';
insert into r select start_duo_mission('10000000-0000-0000-0000-000000000011', 300) ->> 'error' = 'friend_in_mission', 'A não chama G (já em missão)';
insert into r select start_duo_mission('10000000-0000-0000-0000-0000000000c1', 250) ->> 'error' = 'invalid_goal', 'meta fora de 150/300/600: recusada';
insert into r select start_duo_mission('10000000-0000-0000-0000-0000000000f1', 300) ->> 'error' = 'not_friends', 'missão com quem não é amigo: recusada';
insert into r select my_duo_mission() is null, 'A sem missão: null';
insert into r select (start_duo_mission('10000000-0000-0000-0000-0000000000c1', 150) ->> 'ok')::boolean, 'A começa missão de 150 com C';
insert into r select start_duo_mission('10000000-0000-0000-0000-0000000000b1', 150) ->> 'error' = 'already_in_mission', 'A não começa segunda missão';
insert into r select (select (m ->> 'my_xp')::int = 0 and (m ->> 'partner_xp')::int = 0 and (m ->> 'goal_xp')::int = 150 and (m -> 'partner' ->> 'user_id') = '10000000-0000-0000-0000-0000000000c1'
  from (select my_duo_mission() m) x), 'XP de antes da missão não conta (base gravada)';
-- XP depois: A +80 (upsert), C +50
update weekly_xp set amount = 180 where user_id = '10000000-0000-0000-0000-0000000000a1' and week_start = :'w0';
select pg_temp.as_user('10000000-0000-0000-0000-0000000000c1');
update weekly_xp set amount = 60 where user_id = '10000000-0000-0000-0000-0000000000c1' and week_start = :'w0';
insert into r select (select (m ->> 'my_xp')::int = 20 and (m ->> 'partner_xp')::int = 80 and m ->> 'completed_at' is null and (m ->> 'started_by_me')::boolean = false
  from (select my_duo_mission() m) x), 'C vê 20 + 80 de 150, ainda não cumprida';
insert into weekly_xp(user_id, week_start, language_app_key, amount) values ('10000000-0000-0000-0000-0000000000c1', :'w0', 'mandarim', 50);
reset role;
insert into r select (select completed_at is not null from duo_missions where user_a = '10000000-0000-0000-0000-0000000000a1'), 'gatilho marca cumprida ao passar de 150 (XP de outro idioma soma)';
insert into r select (select count(*) from notifications where event_type = 'duo_mission_done' and user_id in ('10000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000c1')) = 4, 'aviso de cumprida para os dois';
insert into r select (select count(*) from notifications where event_type = 'duo_mission_started' and user_id = '10000000-0000-0000-0000-0000000000c1') = 2, 'C recebeu o aviso de missão começada';
update weekly_xp set amount = 400 where user_id = '10000000-0000-0000-0000-0000000000a1' and week_start = :'w0';
insert into r select (select count(*) from notifications where event_type = 'duo_mission_done' and user_id = '10000000-0000-0000-0000-0000000000a1') = 2, 'cumprida avisa uma vez só';
set local role authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-0000000000a1');
insert into r select my_duo_missions_done() = 1, 'A tem 1 missão cumprida';
-- amizade acaba antes de cumprir: missão desfeita
select pg_temp.as_user('10000000-0000-0000-0000-000000000011');
reset role;
delete from friendships where requester_id = '10000000-0000-0000-0000-000000000011' and addressee_id = '10000000-0000-0000-0000-000000000012';
set local role authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-000000000011');
insert into r select my_duo_mission() is null, 'amizade desfeita: missão some';
insert into r select (start_duo_mission('10000000-0000-0000-0000-0000000000a1', 600) ->> 'error') = 'friend_in_mission', 'G livre de novo (A ocupada com C)';
reset role;
insert into r select not exists (select 1 from duo_mission_members where user_id = '10000000-0000-0000-0000-000000000012'), 'H livre de novo';
-- gatilho nunca bloqueia o XP
insert into r select (select count(*) from weekly_xp where user_id = '10000000-0000-0000-0000-0000000000c1') = 2, 'XP salvo normalmente';
-- permissões e dados
insert into r select not has_function_privilege('anon', 'public.friends_duo()', 'EXECUTE') and not has_function_privilege('anon', 'public.nudge_friend(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.start_duo_mission(uuid,integer)', 'EXECUTE') and not has_function_privilege('anon', 'public.my_duo_mission()', 'EXECUTE'), 'anon sem acesso às funções';
insert into r select not has_table_privilege('authenticated', 'public.friend_nudges', 'SELECT') and not has_table_privilege('authenticated', 'public.duo_missions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.duo_mission_members', 'SELECT'), 'tabelas sem leitura direta';
insert into r select not has_function_privilege('authenticated', 'public._duo_check(bigint)', 'EXECUTE') and not has_function_privilege('authenticated', 'public._joint_streak(uuid,uuid)', 'EXECUTE'), 'funções internas fechadas';
insert into r select (select h from snap) = (select md5(string_agg(user_id::text || data::text, ',' order by user_id)) from progress), 'progresso intacto';
select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
