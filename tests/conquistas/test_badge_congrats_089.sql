-- Teste da migration 089 (Parabéns para conquistas com níveis). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
insert into auth.users(id, email) values
  ('89000000-0000-0000-0000-0000000000a1','a89@example.invalid'),
  ('89000000-0000-0000-0000-0000000000b1','b89@example.invalid'),
  ('89000000-0000-0000-0000-0000000000c1','c89@example.invalid');
insert into profiles(user_id, username, display_name, public_profile) values
  ('89000000-0000-0000-0000-0000000000a1','ua89','Ana Souza', true),
  ('89000000-0000-0000-0000-0000000000b1','ub89','Beto Lima', true),
  ('89000000-0000-0000-0000-0000000000c1','uc89','Caio Reis', true);
-- A e B amigos; C não é amigo de ninguém
insert into friendships(requester_id, addressee_id, status, responded_at) values
  ('89000000-0000-0000-0000-0000000000a1','89000000-0000-0000-0000-0000000000b1','accepted', now());
-- B: review.3 hoje em dois idiomas (conquista da conta), streak.7 antiga (backfill), conquista antiga 'xp_500' hoje,
-- friends.3 hoje. C: review.4 hoje (não é amigo).
insert into earned_badges(user_id, language_app_key, badge_id, earned_at) values
  ('89000000-0000-0000-0000-0000000000b1','frances','review.3', now() - interval '2 hours'),
  ('89000000-0000-0000-0000-0000000000b1','mandarim','review.3', now() - interval '1 hour'),
  ('89000000-0000-0000-0000-0000000000b1','frances','streak.7', '2026-10-01T00:00:00Z'),
  ('89000000-0000-0000-0000-0000000000b1','frances','xp_500', now()),
  ('89000000-0000-0000-0000-0000000000b1','frances','friends.3', now()),
  ('89000000-0000-0000-0000-0000000000c1','frances','review.4', now());

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
set local role authenticated;
select pg_temp.as_user('89000000-0000-0000-0000-0000000000a1');

-- ---------- friends_badge_feed ----------
insert into r select (select count(*) from friends_badge_feed(30)) = 2, 'feed: só review.3 e friends.3 de B (antiga, backfill e não amigo ficam de fora)';
insert into r select (select langs from friends_badge_feed(30) where badge_id = 'review.3') @> array['frances','mandarim'], 'feed: uma linha por nível, com os dois idiomas';
insert into r select (select earned_at from friends_badge_feed(30) where badge_id = 'review.3') < now() - interval '90 minutes', 'feed: data = a primeira vez que ganhou';
insert into r select (select display_name from friends_badge_feed(30) where badge_id = 'review.3') = 'Beto Lima', 'feed: nome do amigo';
insert into r select (select total_reactions from friends_badge_feed(30) where badge_id = 'review.3') = 0, 'feed: sem reações ainda';

-- ---------- congratulate_friend (badge) ----------
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'review.3', '👏') ->> 'status') = 'sent', 'parabéns por conquista: enviado';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'review.3', '🎉') ->> 'status') = 'updated', 'tocar de novo troca a reação';
insert into r select (select my_reaction from friends_badge_feed(30) where badge_id = 'review.3') = '🎉', 'feed mostra a minha reação';
insert into r select (select total_reactions from friends_badge_feed(30) where badge_id = 'review.3') = 1, 'feed conta 1 reação';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'friends.3', '🎉') ->> 'error') = 'invalid_target', 'Amigos não recebe parabéns';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'xp_500', '🎉') ->> 'error') = 'invalid_target', 'conquista antiga (sem nível) não recebe';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'streak.7', '🎉') ->> 'error') = 'target_not_found', 'nível antigo (mais de 7 dias) não recebe';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'xp.6', '🎉') ->> 'error') = 'target_not_found', 'nível que o amigo não tem não recebe';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000c1', 'badge', 'review.4', '🎉') ->> 'error') = 'not_friends', 'quem não é amigo não recebe';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'review.3', '🙂') ->> 'error') = 'invalid_reaction', 'reação fora da lista é recusada';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'badge', 'review.3; drop', '🎉') ->> 'error') = 'invalid_target', 'id inválido é recusado';
reset role;
insert into r select (select count(*) from notifications where user_id = '89000000-0000-0000-0000-0000000000b1' and event_type = 'friend_congrats') = 2, 'B recebeu 1 aviso por site (a troca de reação não gera outro)';
insert into r select (select bool_and(body like '%sua conquista%') from notifications where user_id = '89000000-0000-0000-0000-0000000000b1' and event_type = 'friend_congrats'), 'aviso fala de "sua conquista"';
-- B vê o parabéns recebido e agradece
set local role authenticated;
select pg_temp.as_user('89000000-0000-0000-0000-0000000000b1');
insert into r select (select target_kind || ':' || target_ref from my_received_congrats(20) limit 1) = 'badge:review.3', 'B vê o parabéns pela conquista';
insert into r select (thank_friend_congrats((select id from my_received_congrats(20) limit 1)) ->> 'status') = 'thanked', 'B agradece';
select pg_temp.as_user('89000000-0000-0000-0000-0000000000a1');
insert into r select (select my_congrats_thanked from friends_badge_feed(30) where badge_id = 'review.3'), 'feed de A mostra que B agradeceu';
-- streak continua igual à 086
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'streak', '10@2026-01-01', '🎉') ->> 'error') = 'target_not_found', 'marco de sequência continua validado como na 086';
insert into r select (congratulate_friend('89000000-0000-0000-0000-0000000000b1', 'outro', 'x', '🎉') ->> 'error') = 'invalid_target', 'tipo desconhecido é recusado';
reset role;
insert into r select not has_function_privilege('anon', 'public.friends_badge_feed(integer)', 'EXECUTE'), 'anon não lê o feed';
insert into r select has_function_privilege('authenticated', 'public.friends_badge_feed(integer)', 'EXECUTE'), 'logado lê o feed';

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
