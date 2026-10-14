-- Teste da migration 086 (foguinho, marcos de sequência, parabéns e obrigado). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table snap(k text, v text) on commit drop;
grant all on snap to public;
insert into auth.users(id, email) values
  ('78000000-0000-0000-0000-0000000000a1','a@example.invalid'),
  ('78000000-0000-0000-0000-0000000000b1','b@example.invalid'),
  ('78000000-0000-0000-0000-0000000000c1','c@example.invalid'),
  ('78000000-0000-0000-0000-0000000000d1','d@example.invalid');
insert into profiles(user_id, username, display_name, public_profile) values
  ('78000000-0000-0000-0000-0000000000a1','ua78','Ana Souza', true),
  ('78000000-0000-0000-0000-0000000000b1','ub78','Beto Lima', true),
  ('78000000-0000-0000-0000-0000000000c1','uc78','Caio Reis', true),
  ('78000000-0000-0000-0000-0000000000d1','ud78','Duda Privada', false);
-- A amiga de B e de D; C não é amigo de ninguém
insert into friendships(requester_id, addressee_id, status, responded_at) values
  ('78000000-0000-0000-0000-0000000000a1','78000000-0000-0000-0000-0000000000b1','accepted', now()),
  ('78000000-0000-0000-0000-0000000000d1','78000000-0000-0000-0000-0000000000a1','accepted', now());
-- progresso: B com sequência da conta 12 (estudou hoje), D privada com 30, C velho (quebrou)
insert into progress(user_id, data) values
  ('78000000-0000-0000-0000-0000000000b1', jsonb_build_object(
     '_account', jsonb_build_object('streak', 12, 'lastStudyDay', to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD')),
     'frances', jsonb_build_object('xp', 300, 'streak', 3, 'lastStudyDay', '2026-01-01'),
     'mandarim', jsonb_build_object('xp', 0))),
  ('78000000-0000-0000-0000-0000000000d1', jsonb_build_object(
     'frances@pt-BR', jsonb_build_object('xp', 50, 'streak', 30, 'lastStudyDay', to_char((now() at time zone 'America/Sao_Paulo')::date - 1, 'YYYY-MM-DD')))),
  ('78000000-0000-0000-0000-0000000000c1', jsonb_build_object(
     'mandarim', jsonb_build_object('xp', 10, 'streak', 40, 'lastStudyDay', '2026-01-01')));

insert into snap select 'progress', md5(string_agg(user_id::text || data::text, ',' order by user_id)) from progress;
insert into snap select 'friendships', count(*)::text from friendships;

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;

set local role authenticated;
select pg_temp.as_user('78000000-0000-0000-0000-0000000000a1');

-- ---------- friends_extras ----------
insert into r select (select count(*) from friends_extras()) = 3, 'extras: eu + 2 amigos (C fica de fora)';
insert into r select (select streak from friends_extras() where user_id='78000000-0000-0000-0000-0000000000b1') = 12, 'extras: B usa a sequência da conta (12)';
insert into r select (select studied_today from friends_extras() where user_id='78000000-0000-0000-0000-0000000000b1'), 'extras: B estudou hoje';
insert into r select (select languages from friends_extras() where user_id='78000000-0000-0000-0000-0000000000b1') = array['frances'], 'extras: bandeiras só de idioma com XP (mandarim com 0 fica de fora)';
insert into r select (select streak from friends_extras() where user_id='78000000-0000-0000-0000-0000000000d1') = 30, 'extras: amiga com perfil privado mostra a sequência (amigo vê o perfil completo)';
insert into r select (select languages from friends_extras() where user_id='78000000-0000-0000-0000-0000000000d1') = array['frances'], 'extras: chave frances@pt-BR vira frances';
insert into r select (select streak from friends_extras() where user_id='78000000-0000-0000-0000-0000000000a1') = 0, 'extras: eu sem progresso = 0';
reset role;
insert into r select (select streak from _account_streak('78000000-0000-0000-0000-0000000000c1')) = 0, 'sequência quebrada (último dia antigo) = 0';
insert into r select (select streak from _account_streak('78000000-0000-0000-0000-0000000000d1')) = 30, 'ontem ainda conta (30)';
set local role authenticated;

-- ---------- record_streak_milestone ----------
select pg_temp.as_user('78000000-0000-0000-0000-0000000000b1');
insert into r select (record_streak_milestone(4, (now() at time zone 'America/Sao_Paulo')::date) ->> 'recorded') is null, 'marco: 4 dias não registra';
insert into r select (record_streak_milestone(12, (now() at time zone 'America/Sao_Paulo')::date) ->> 'recorded') = '10', 'marco: com 12 dias registra só o 10 (o maior)';
insert into r select (record_streak_milestone(13, (now() at time zone 'America/Sao_Paulo')::date + 1) ->> 'recorded') is null, 'marco: 13 na mesma sequência não repete o 10';
insert into r select (record_streak_milestone(15, (now() at time zone 'America/Sao_Paulo')::date) ->> 'recorded') = '15', 'marco: 15 com outro dia de início é outra sequência e registra';
insert into r select (record_streak_milestone(500, '2020-01-01') ->> 'recorded') is null, 'marco: data fora da janela é ignorada';
select pg_temp.as_user('78000000-0000-0000-0000-0000000000d1');
insert into r select (record_streak_milestone(30, (now() at time zone 'America/Sao_Paulo')::date - 1) ->> 'recorded') = '25', 'marco: D registra 25';
reset role;
insert into r select (select count(*) from streak_milestones where user_id='78000000-0000-0000-0000-0000000000b1') = 2, 'B tem 2 marcos (10 e 15 de sequências com início diferente)';
set local role authenticated;

-- ---------- feed ----------
select pg_temp.as_user('78000000-0000-0000-0000-0000000000a1');
insert into r select (select count(*) from friends_streak_feed(20) where user_id='78000000-0000-0000-0000-0000000000b1') = 2, 'feed: A vê os marcos de B';
insert into r select (select count(*) from friends_streak_feed(20) where user_id='78000000-0000-0000-0000-0000000000d1') = 1, 'feed: marco de amiga com perfil privado aparece';
select pg_temp.as_user('78000000-0000-0000-0000-0000000000c1');
insert into r select (select count(*) from friends_streak_feed(20)) = 0, 'feed: C (sem amigos) não vê nada';

-- ---------- congratulate_friend ----------
select pg_temp.as_user('78000000-0000-0000-0000-0000000000a1');
select ref as b_ref from friends_streak_feed(20) where user_id='78000000-0000-0000-0000-0000000000b1' and days = 10 \gset
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b_ref', '🎉') ->> 'status') = 'sent', 'parabéns: A parabeniza B';
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b_ref', '💪') ->> 'status') = 'updated', 'parabéns: tocar de novo troca a reação';
insert into r select (select my_reaction from friends_streak_feed(20) where ref = :'b_ref') = '💪', 'feed mostra minha reação nova';
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b_ref', '🍕') ->> 'error') = 'invalid_reaction', 'parabéns: reação fora da lista é recusada';
-- 089 (2026-10-14) liga os parabéns por conquista; id antigo ('frances:unit_1') continua recusado.
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'badge', 'frances:unit_1', '🎉') ->> 'error') in ('kind_not_enabled', 'invalid_target'), 'parabéns: id de conquista antigo é recusado';
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', '50@2020-01-01', '🎉') ->> 'error') = 'target_not_found', 'parabéns: marco inexistente';
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000a1', 'streak', :'b_ref', '🎉') ->> 'error') = 'invalid_target', 'parabéns: não dá para parabenizar a si mesmo';
select pg_temp.as_user('78000000-0000-0000-0000-0000000000c1');
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b_ref', '🎉') ->> 'error') = 'not_friends', 'parabéns: C não é amigo de B';
reset role;
insert into r select (select count(*) from notifications where user_id='78000000-0000-0000-0000-0000000000b1' and event_type='friend_congrats') = 2, 'aviso para B (1 por site, sem duplicar ao trocar a reação)';
insert into r select (select bool_and(body = 'Ana Souza parabenizou você por seus 10 dias seguidos 🎉') from notifications where user_id='78000000-0000-0000-0000-0000000000b1' and event_type='friend_congrats'), 'texto do aviso';
-- segundo amigo no mesmo dia: o aviso é reescrito, não duplicado
insert into friendships(requester_id, addressee_id, status, responded_at) values
  ('78000000-0000-0000-0000-0000000000d1','78000000-0000-0000-0000-0000000000b1','accepted', now());
set local role authenticated;
select pg_temp.as_user('78000000-0000-0000-0000-0000000000d1');
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b_ref', '👏') ->> 'status') = 'sent', 'parabéns: D também parabeniza B';
reset role;
insert into r select (select count(*) from notifications where user_id='78000000-0000-0000-0000-0000000000b1' and event_type='friend_congrats') = 2, 'aviso agrupado: continua 1 por site';
insert into r select (select bool_and(body like 'Duda Privada e mais 1 amigo parabenizaram você%') from notifications where user_id='78000000-0000-0000-0000-0000000000b1' and event_type='friend_congrats'), 'aviso agrupado: "Duda Privada e mais 1 amigo"';
-- B desliga aviso de parabéns: novo parabéns não gera aviso
insert into friend_settings(user_id, notify_congrats) values ('78000000-0000-0000-0000-0000000000a1', false);

-- ---------- recebidos + obrigado ----------
set local role authenticated;
select pg_temp.as_user('78000000-0000-0000-0000-0000000000b1');
insert into r select (select count(*) from my_received_congrats(20)) = 2, 'B vê 2 parabéns recebidos';
select id as c_id from my_received_congrats(20) where from_user='78000000-0000-0000-0000-0000000000a1' \gset
insert into r select (thank_friend_congrats(:c_id) ->> 'status') = 'thanked', 'obrigado: B agradece A';
insert into r select (thank_friend_congrats(:c_id) ->> 'status') = 'already', 'obrigado: segunda vez não repete';
select pg_temp.as_user('78000000-0000-0000-0000-0000000000a1');
insert into r select (thank_friend_congrats(:c_id) ->> 'error') = 'not_found', 'obrigado: só quem recebeu pode agradecer';
insert into r select (select my_congrats_thanked from friends_streak_feed(20) where ref = :'b_ref'), 'feed de A mostra que B agradeceu';
reset role;
insert into r select (select count(*) from notifications where user_id='78000000-0000-0000-0000-0000000000a1' and event_type='friend_thanks') = 0, 'A desligou o aviso: obrigado não gera aviso';
-- limite diário
set local role authenticated;
select pg_temp.as_user('78000000-0000-0000-0000-0000000000d1');
reset role;
insert into friend_congrats(from_user, to_user, target_kind, target_ref, reaction)
  select '78000000-0000-0000-0000-0000000000d1', '78000000-0000-0000-0000-0000000000a1', 'streak', 'fake' || g || '@2026-01-01', '🎉' from generate_series(1, 19) g;
select ref as b15 from streak_milestones s, lateral (select s.days || '@' || to_char(s.run_start, 'YYYY-MM-DD') as ref) x
  where s.user_id='78000000-0000-0000-0000-0000000000b1' and s.days = 15 \gset
set local role authenticated;
select pg_temp.as_user('78000000-0000-0000-0000-0000000000d1');
insert into r select (congratulate_friend('78000000-0000-0000-0000-0000000000b1', 'streak', :'b15', '🎉') ->> 'error') = 'daily_congrats_limit', 'limite de 20 parabéns por dia';

-- ---------- acesso direto ----------
insert into r select not has_table_privilege('authenticated', 'public.friend_congrats', 'SELECT'), 'friend_congrats sem leitura direta';
insert into r select not has_table_privilege('authenticated', 'public.streak_milestones', 'INSERT'), 'streak_milestones sem escrita direta';
reset role;
insert into r select not has_function_privilege('anon', 'public.congratulate_friend(uuid,text,text,text)', 'EXECUTE'), 'anon não parabeniza';
insert into r select not has_function_privilege('authenticated', 'public._account_streak(uuid)', 'EXECUTE'), '_account_streak é interna';
insert into r select (select md5(string_agg(user_id::text || data::text, ',' order by user_id)) from progress) = (select v from snap where k='progress'), 'progress não foi alterado';

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
