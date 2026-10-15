-- Teste da 109 (missão em dupla automática de 4 dias). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
select (now() at time zone 'America/Sao_Paulo')::date as d0, date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date as w0 \gset
-- A amigo de B e de C; C amigo de D; B amigo de E e de F. D e F não estudaram semana passada; E desligou as missões.
-- A e B já fizeram dupla 2 semanas atrás (então A deve cair com C).
create temp table ppl(x text, h text) on commit drop;
insert into ppl values ('a','a1'),('b','b1'),('c','c1'),('d','d1'),('e','e1'),('f','f1');
insert into auth.users(id, email) select ('10900000-0000-0000-0000-0000000000' || h)::uuid, x || '107@example.invalid' from ppl;
insert into profiles(user_id, username, display_name)
select ('10900000-0000-0000-0000-0000000000' || h)::uuid, 'u107' || x, 'Pessoa ' || upper(x) from ppl
on conflict (user_id) do update set display_name = excluded.display_name;
insert into friendships(requester_id, addressee_id, status, requested_at, responded_at)
select ('10900000-0000-0000-0000-0000000000' || a || '1')::uuid, ('10900000-0000-0000-0000-0000000000' || b || '1')::uuid, 'accepted', now(), now()
from (values ('a','b'),('a','c'),('c','d'),('b','e'),('b','f')) v(a,b);
insert into weekly_xp(user_id, week_start, language_app_key, amount)
select ('10900000-0000-0000-0000-0000000000' || h)::uuid, :'w0'::date - 7, 'frances', 50 from ppl where x not in ('d', 'f');
insert into friend_settings(user_id, join_duo_missions) values ('10900000-0000-0000-0000-0000000000e1', false);
insert into duo_missions(week_start, user_a, user_b, goal_xp, completed_at)
values (:'w0'::date - 14, '10900000-0000-0000-0000-0000000000a1', '10900000-0000-0000-0000-0000000000b1', 150, now() - interval '10 days');
insert into progress(user_id, data) values ('10900000-0000-0000-0000-0000000000c1', jsonb_build_object('_meta', jsonb_build_object('uiLanguage','en')));

-- sorteio
insert into r select duo_pair_week(:'w0') = 1, 'sorteio forma 1 dupla';
insert into r select exists (select 1 from duo_missions where week_start = :'w0' and auto and kind = 'days' and goal_days = 4
  and ((user_a = '10900000-0000-0000-0000-0000000000a1' and user_b = '10900000-0000-0000-0000-0000000000c1') or (user_b = '10900000-0000-0000-0000-0000000000a1' and user_a = '10900000-0000-0000-0000-0000000000c1'))),
  'A cai com C (A e B já foram dupla)';
insert into r select not exists (select 1 from duo_mission_members where week_start = :'w0' and user_id in ('10900000-0000-0000-0000-0000000000d1','10900000-0000-0000-0000-0000000000e1')),
  'D (não estudou) e E (desligou) ficam de fora';
insert into r select not exists (select 1 from duo_mission_members where week_start = :'w0' and user_id = '10900000-0000-0000-0000-0000000000b1'), 'B sem dupla (amigos ocupados ou fora)';
insert into r select duo_pair_week(:'w0') = -1, 'sorteio roda uma vez por semana';
insert into r select (select count(*) from notifications where event_type = 'duo_week_paired') = 4, 'aviso de dupla para A e C (2 sites cada)';
insert into r select (select body from notifications where event_type = 'duo_week_paired' and user_id = '10900000-0000-0000-0000-0000000000a1' limit 1)
  = 'Sua missão da semana: você e Pessoa C estudam 4 dias cada até domingo 🤝', 'aviso em português';
insert into r select (select body from notifications where event_type = 'duo_week_paired' and user_id = '10900000-0000-0000-0000-0000000000c1' limit 1)
  = 'Your mission this week: you and Pessoa A each study 4 days by Sunday 🤝', 'aviso em inglês para quem usa o site em inglês';

-- dias de estudo pelo XP
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
insert into weekly_xp(user_id, week_start, language_app_key, amount) values ('10900000-0000-0000-0000-0000000000a1', :'w0', 'frances', 10);
insert into r select exists (select 1 from study_days where user_id = '10900000-0000-0000-0000-0000000000a1' and day = :'d0'), 'XP de hoje vira dia de estudo';
insert into r select not exists (select 1 from study_days where user_id = '10900000-0000-0000-0000-0000000000c1'), 'XP gravado numa semana antiga não vira dia de estudo hoje';
update weekly_xp set amount = amount where user_id = '10900000-0000-0000-0000-0000000000a1' and week_start = :'w0';
insert into r select (select count(*) from study_days where user_id = '10900000-0000-0000-0000-0000000000a1') = 1, 'salvar sem ganhar XP não cria dia';
-- A com 4 dias, C com 3: não cumprida; C completa o 4º: cumprida
insert into study_days(user_id, day) select '10900000-0000-0000-0000-0000000000a1', :'w0'::date + i from generate_series(0, 6) i where :'w0'::date + i <> :'d0'::date limit 3;
insert into study_days(user_id, day) select '10900000-0000-0000-0000-0000000000c1', :'w0'::date + i from generate_series(0, 2) i;
set local role authenticated;
select pg_temp.as_user('10900000-0000-0000-0000-0000000000a1');
create temp table m1 on commit drop as select my_duo_mission() m;
insert into r select (select (m->>'kind') = 'days' and (m->>'goal_days')::int = 4 and jsonb_array_length(m->'my_days') = 4
  and jsonb_array_length(m->'partner_days') = 3 and m->>'completed_at' is null and (m->'partner'->>'user_id') = '10900000-0000-0000-0000-0000000000c1' from m1),
  'A vê 4 de 4, C 3 de 4, ainda não cumprida';
reset role;
insert into weekly_xp(user_id, week_start, language_app_key, amount)
select '10900000-0000-0000-0000-0000000000c1', :'w0', 'mandarim', 5
where not exists (select 1 from study_days where user_id = '10900000-0000-0000-0000-0000000000c1' and day = :'d0');
insert into study_days(user_id, day) select '10900000-0000-0000-0000-0000000000c1', :'w0'::date + 3 where :'w0'::date + 3 <> :'d0'::date on conflict do nothing;
update weekly_xp set amount = amount + 5 where user_id = '10900000-0000-0000-0000-0000000000c1' and week_start = :'w0' and language_app_key = 'mandarim';
insert into r select (select completed_at is not null from duo_missions where week_start = :'w0' and auto), 'os dois com 4 dias: cumprida';
insert into r select (select body from notifications where event_type = 'duo_mission_done' and user_id = '10900000-0000-0000-0000-0000000000a1' limit 1)
  = 'Missão em dupla cumprida! Você e Pessoa C estudaram 4 dias cada 🎉', 'aviso de cumprida (dias)';
insert into r select (select body from notifications where event_type = 'duo_mission_done' and user_id = '10900000-0000-0000-0000-0000000000c1' limit 1)
  = 'Duo mission complete! You and Pessoa A each studied 4 days 🎉', 'aviso de cumprida em inglês';
set local role authenticated;
select pg_temp.as_user('10900000-0000-0000-0000-0000000000a1');
insert into r select my_duo_missions_done() = 2, 'conquista conta a nova (+ a antiga)';

-- chamar para missão (B sem dupla)
select pg_temp.as_user('10900000-0000-0000-0000-0000000000b1');
create temp table fs on commit drop as select * from friends_duo_state();
insert into r select (select can_invite from fs where user_id = '10900000-0000-0000-0000-0000000000a1') = false, 'A já em missão: não dá para chamar';
insert into r select (select can_invite from fs where user_id = '10900000-0000-0000-0000-0000000000e1') = false, 'E desligou: não dá para chamar (sem dizer por quê)';
insert into r select (select can_invite from fs where user_id = '10900000-0000-0000-0000-0000000000f1'), 'F livre: dá para chamar';
insert into r select start_duo_mission('10900000-0000-0000-0000-0000000000e1', 0) ->> 'error' = 'friend_in_mission', 'chamar E: mesma resposta de "já em missão"';
insert into r select (start_duo_mission('10900000-0000-0000-0000-0000000000f1', 0) ->> 'goal_days')::int = least(4, (:'w0'::date + 6) - :'d0'::date + 1), 'meta = 4 ou os dias que faltam até domingo';
reset role;
insert into r select (select kind = 'days' and not auto and start_day = :'d0' from duo_missions where user_a = '10900000-0000-0000-0000-0000000000b1' and week_start = :'w0'), 'missão manual de dias, começando hoje';
set local role authenticated;
select pg_temp.as_user('10900000-0000-0000-0000-0000000000b1');
insert into r select (select can_invite from friends_duo_state() where user_id = '10900000-0000-0000-0000-0000000000f1') = false, 'B já em missão: botão some';
reset role;
insert into r select (select body from notifications where event_type = 'duo_mission_started' and user_id = '10900000-0000-0000-0000-0000000000f1' limit 1)
  like 'Pessoa B chamou você para uma missão em dupla: _ dias de estudo cada até domingo 🤝', 'aviso de chamado (dias)';
-- permissões
insert into r select not has_function_privilege('authenticated', 'public.duo_pair_week(date)', 'EXECUTE') and not has_function_privilege('anon', 'public.friends_duo_state()', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.study_days', 'SELECT') and not has_table_privilege('authenticated', 'public.duo_pairing_runs', 'SELECT'), 'funções e tabelas fechadas';
select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
