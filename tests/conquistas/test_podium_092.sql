-- Teste da migration 092 (trilha Pódio). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
-- semana atual (segunda) e as anteriores
select date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date as w0 \gset
insert into auth.users(id, email) values
  ('92000000-0000-0000-0000-0000000000a1','a92@example.invalid'),
  ('92000000-0000-0000-0000-0000000000b1','b92@example.invalid'),
  ('92000000-0000-0000-0000-0000000000c1','c92@example.invalid'),
  ('92000000-0000-0000-0000-0000000000d1','d92@example.invalid');
-- A amiga de B desde 5 semanas atrás; A amiga de C só desde ontem; D não é amigo
insert into friendships(requester_id, addressee_id, status, requested_at, responded_at) values
  ('92000000-0000-0000-0000-0000000000a1','92000000-0000-0000-0000-0000000000b1','accepted', :'w0'::date - 40, :'w0'::date - 35),
  ('92000000-0000-0000-0000-0000000000c1','92000000-0000-0000-0000-0000000000a1','accepted', now() - interval '1 day', now() - interval '1 day');
-- semana -1: A 300 (fr 200 + zh 100) x B 250 -> A em 1º (soma dos idiomas)
-- semana -2: A 100 x B 100 -> empate, não conta
-- semana -3: A 500 x B 0 (sem linha) e C 900 (ainda não era amigo) -> sem disputa, não conta
-- semana -4: A 50 x B 40 x D 999 (não é amigo) -> A em 1º
-- semana atual: A 900 x B 10 -> semana não fechou, não conta
insert into weekly_xp(user_id, week_start, language_app_key, amount) values
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date - 7, 'frances', 200),
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date - 7, 'mandarim', 100),
  ('92000000-0000-0000-0000-0000000000b1', :'w0'::date - 7, 'frances', 250),
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date - 14, 'frances', 100),
  ('92000000-0000-0000-0000-0000000000b1', :'w0'::date - 14, 'frances', 100),
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date - 21, 'frances', 500),
  ('92000000-0000-0000-0000-0000000000c1', :'w0'::date - 21, 'frances', 900),
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date - 28, 'frances', 50),
  ('92000000-0000-0000-0000-0000000000b1', :'w0'::date - 28, 'frances', 40),
  ('92000000-0000-0000-0000-0000000000d1', :'w0'::date - 28, 'frances', 999),
  ('92000000-0000-0000-0000-0000000000a1', :'w0'::date, 'frances', 900),
  ('92000000-0000-0000-0000-0000000000b1', :'w0'::date, 'frances', 10);

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
set local role authenticated;
select pg_temp.as_user('92000000-0000-0000-0000-0000000000a1');
insert into r select my_podium_weeks() = 2, 'A: 2 semanas em 1º (-1 somando idiomas e -4; empate, sem disputa e semana atual não contam)';
select pg_temp.as_user('92000000-0000-0000-0000-0000000000b1');
insert into r select my_podium_weeks() = 0, 'B: nunca terminou acima de A';
select pg_temp.as_user('92000000-0000-0000-0000-0000000000c1');
insert into r select my_podium_weeks() = 0, 'C: semana -3 não conta (amizade com A é de ontem)';
select pg_temp.as_user('92000000-0000-0000-0000-0000000000d1');
insert into r select my_podium_weeks() = 0, 'D: sem amigos, sem pódio';
reset role;
insert into r select not has_function_privilege('anon', 'public.my_podium_weeks()', 'EXECUTE'), 'anon não executa';
insert into r select has_function_privilege('authenticated', 'public.my_podium_weeks()', 'EXECUTE'), 'logado executa';
select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
rollback;
