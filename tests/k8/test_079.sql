-- K.8 (079) -- contador de pessoas que adicionaram um Deck público. Postgres LOCAL (tests/k8/run.sh).
\set ON_ERROR_STOP off
\pset tuples_only on
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
create function pg_temp.q_as(p_role text, p_uid uuid, p_email text, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql into r; exception when others then reset role; return jsonb_build_object('exc', sqlerrm || '|' || sqlstate); end;
  reset role; return r;
end $$;
grant all on all functions in schema pg_temp to public;

-- atores: k1 autor (grátis), k2 e k3 copiam (Premium), k4 grátis; admin
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000081','k8autor@example.com'), ('00000000-0000-0000-0000-000000000082','k8a@example.com'),
 ('00000000-0000-0000-0000-000000000083','k8b@example.com'), ('00000000-0000-0000-0000-000000000084','k8free@example.com')
 on conflict do nothing;
insert into auth.users(id,email) select '00000000-0000-0000-0000-00000000008a','brunemed1310@gmail.com'
 where not exists (select 1 from auth.users where email='brunemed1310@gmail.com');
select pg_temp.q_as('authenticated',id,email,'select to_jsonb(public.ensure_my_profile())') from auth.users where id::text like '00000000-0000-0000-0000-00000000008_';
update profiles set plan_tier='premium' where user_id in ('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000083');
select pg_temp.q_as('authenticated',id,email,format('select to_jsonb(1) from public.ensure_user_decks(%L,''frances'')', id)) from auth.users where id::text like '00000000-0000-0000-0000-00000000008_';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id)
 select owner_id,'personal','K8 Viagem',language_app_key,id from decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-000000000081' and language_app_key='frances';
create temp table k as select (select id from decks where name='K8 Viagem' and owner_id='00000000-0000-0000-0000-000000000081') deck;
grant all on k to public;
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,tags) values
 ('00000000-0000-0000-0000-000000000081','frances',(select deck from k),'aéroport','aeroporto','{}'),
 ('00000000-0000-0000-0000-000000000081','frances',(select deck from k),'billet','passagem','{}');
select pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000081','k8autor@example.com', format($$ select public.publish_deck(%s,'x','book','gray') $$, (select deck from k)));
alter table k add column pid uuid; update k set pid = (select public_id from decks where id = deck);

select pg_temp.chk('tabela sem leitura direta', (select not has_table_privilege('authenticated','public.public_deck_copies','select')));
select pg_temp.chk('autor grátis não vê o contador', pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000081','k8autor@example.com', format('select public.get_public_deck_copy_count(%s)', (select deck from k)))->>'error' = 'not_allowed');
-- k2 copia 2x, k3 copia 1x
select pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000082','k8a@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k)));
select pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000082','k8a@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k)));
select pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000083','k8b@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k)));
-- grátis tenta copiar: falha (premium_required) e não conta
select pg_temp.chk('cópia barrada não conta', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000084','k8free@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k))) ? 'exc')
  and not exists (select 1 from public_deck_copies where user_id='00000000-0000-0000-0000-000000000084'));
select pg_temp.chk('uma linha por pessoa (2 pessoas)', (select count(*) from public_deck_copies where deck_id=(select deck from k)) = 2);
-- Deck ganha uma Note nova; k2 copia de novo (agora com algo a criar): soma em copies
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,tags) values
 ('00000000-0000-0000-0000-000000000081','frances',(select deck from k),'valise','mala','{}');
select pg_temp.chk('recópia com Note nova funciona', not (pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000082','k8a@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k))) ? 'exc'));
select pg_temp.chk('recópia bem-sucedida soma em copies', (select copies from public_deck_copies where user_id='00000000-0000-0000-0000-000000000082') = 2);
select pg_temp.chk('recópia não vira pessoa nova', (select count(*) from public_deck_copies where user_id='00000000-0000-0000-0000-000000000082') = 1);
select pg_temp.chk('a cópia continua criando os cartões', (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-000000000083') = 2);
-- autor vira Premium Basic (075): vê o contador
select pg_temp.q_as('authenticated',(select id from auth.users where email='brunemed1310@gmail.com'),'brunemed1310@gmail.com',
  $$ select public.admin_grant_role('00000000-0000-0000-0000-000000000081','premium_basic') $$);
select pg_temp.chk('autor Premium vê 2 pessoas', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000081','k8autor@example.com', format('select public.get_public_deck_copy_count(%s)', (select deck from k)))->>'people')::int = 2,
  pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000081','k8autor@example.com', format('select public.get_public_deck_copy_count(%s)', (select deck from k)))::text);
select pg_temp.chk('Premium que não é o dono não vê', pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000082','k8a@example.com', format('select public.get_public_deck_copy_count(%s)', (select deck from k)))->>'error' = 'not_allowed');
-- dono copiando o próprio Deck não conta
select pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000081','k8autor@example.com', format($$ select public.copy_public_deck(%L) $$, (select pid from k)));
select pg_temp.chk('dono copiando o próprio Deck não conta', not exists (select 1 from public_deck_copies where user_id='00000000-0000-0000-0000-000000000081'));
-- admin
select pg_temp.chk('admin vê o contador de qualquer Deck', (pg_temp.q_as('authenticated',(select id from auth.users where email='brunemed1310@gmail.com'),'brunemed1310@gmail.com', format('select public.get_public_deck_copy_count(%s)', (select deck from k)))->>'people')::int = 2);
select pg_temp.chk('lista da admin traz o Deck com 2 pessoas', exists (select 1 from jsonb_array_elements(pg_temp.q_as('authenticated',(select id from auth.users where email='brunemed1310@gmail.com'),'brunemed1310@gmail.com', 'select public.admin_public_deck_copy_stats()')->'decks') e
  where (e->>'id')::bigint = (select deck from k) and (e->>'people')::int = 2 and (e->>'copies')::int = 3));
select pg_temp.chk('lista só para a admin', pg_temp.q_as('authenticated','00000000-0000-0000-0000-000000000082','k8a@example.com', 'select public.admin_public_deck_copy_stats()')->>'error' = 'not_allowed');
select pg_temp.chk('anon sem execute', not has_function_privilege('anon','public.get_public_deck_copy_count(bigint)','execute') and not has_function_privilege('anon','public.admin_public_deck_copy_stats()','execute'));

select case when ok then 'ok' else 'FALHA' end || '|' || name || case when ok then '' else '  ' || coalesce(info,'') end from res order by ok, name;
select 'RESULTADO 079 ' || count(*) filter (where ok) || '/' || count(*) from res;
