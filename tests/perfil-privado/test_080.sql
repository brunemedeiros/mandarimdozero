-- Etapa 3b (080) -- perfil privado no banco. Transação + ROLLBACK, Postgres local (tests/perfil-privado/run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;

-- A pública, P privada (com Deck publicado), F amiga de P, T professora de P, S estranha
insert into auth.users(id, email) values
 ('80000000-0000-0000-0000-0000000000a1','a80@x.invalid'), ('80000000-0000-0000-0000-0000000000b1','p80@x.invalid'),
 ('80000000-0000-0000-0000-0000000000c1','f80@x.invalid'), ('80000000-0000-0000-0000-0000000000d1','t80@x.invalid'),
 ('80000000-0000-0000-0000-0000000000e1','s80@x.invalid');
insert into profiles(user_id, username, display_name, avatar_url, bio, country) values
 ('80000000-0000-0000-0000-0000000000a1','pub80','Ana Pública','https://x/a.png','bio pública','BR'),
 ('80000000-0000-0000-0000-0000000000b1','priv80','Paula Privada','https://x/p.png','bio secreta','FR'),
 ('80000000-0000-0000-0000-0000000000c1','amiga80','Fernanda',null,null,null),
 ('80000000-0000-0000-0000-0000000000d1','prof80','Tereza',null,null,null),
 ('80000000-0000-0000-0000-0000000000e1','estranha80','Sara',null,null,'PT')
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name,
   avatar_url = excluded.avatar_url, bio = excluded.bio, country = excluded.country;
update profiles set public_profile = false where user_id = '80000000-0000-0000-0000-0000000000b1';
-- o @ é gerado pelo banco (060): guarda o real
create temp table un as select (select username from profiles where user_id = '80000000-0000-0000-0000-0000000000b1') p,
  (select username from profiles where user_id = '80000000-0000-0000-0000-0000000000a1') a;
grant all on un to public;
insert into friendships(requester_id, addressee_id, status) values ('80000000-0000-0000-0000-0000000000b1','80000000-0000-0000-0000-0000000000c1','accepted');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values ('80000000-0000-0000-0000-0000000000d1','80000000-0000-0000-0000-0000000000b1','frances','active');
insert into weekly_xp(user_id, week_start, language_app_key, amount) values ('80000000-0000-0000-0000-0000000000b1','2026-10-05','frances',80);
-- Deck publicado da conta privada
select public.ensure_user_decks('80000000-0000-0000-0000-0000000000b1','frances') from (select pg_temp.as_user('80000000-0000-0000-0000-0000000000b1')) x;
insert into decks(owner_id, kind, name, language_app_key, parent_deck_id)
 select owner_id, 'personal', 'Viagem80', language_app_key, id from decks where kind = 'personal_root' and owner_id = '80000000-0000-0000-0000-0000000000b1';
select pg_temp.as_user('80000000-0000-0000-0000-0000000000b1');
set local role authenticated;
select publish_deck((select id from decks where name = 'Viagem80'), 'x', 'book', 'gray');
reset role;
create temp table k as select (select public_id from decks where name = 'Viagem80') pid;
grant all on k to public;

-- ===== estranha logada =====
select pg_temp.as_user('80000000-0000-0000-0000-0000000000e1'); set local role authenticated;
insert into r select (select count(*) from profiles where user_id = '80000000-0000-0000-0000-0000000000b1') = 0, 'estranha não lê a linha da conta privada';
insert into r select (select count(*) from profiles where user_id = '80000000-0000-0000-0000-0000000000a1') = 1, 'estranha lê a conta pública';
insert into r select (select plan_tier is not null and role is not null from profiles where user_id = '80000000-0000-0000-0000-0000000000a1'), 'plano e papel continuam públicos';
insert into r select pg_temp.try('select country from profiles limit 1') = '42501', 'país não é legível por outra conta';
insert into r select pg_temp.try('select admin_mode, exclude_own_activity from profiles limit 1') = '42501', 'admin_mode/exclude_own_activity fechados';
insert into r select (get_my_profile() ->> 'country') = 'PT', 'a própria conta lê tudo por get_my_profile';
insert into r select pg_temp.try($$update profiles set display_name = 'Sara Nova' where user_id = '80000000-0000-0000-0000-0000000000e1'$$) = 'ok', 'a própria conta continua editando o perfil';
insert into r select (select display_name = 'Paula Privada' and avatar_url is null and is_private from profile_cards(array['80000000-0000-0000-0000-0000000000b1']::uuid[])), 'cartão: nome sim, foto não (privada)';
insert into r select (select avatar_url = 'https://x/a.png' from profile_cards(array['80000000-0000-0000-0000-0000000000a1']::uuid[])), 'cartão: foto da pública';
insert into r select (get_profile_card((select p from un)) ->> 'bio') is null and (get_profile_card((select p from un)) ->> 'avatar_url') is null and (get_profile_card((select p from un)) ->> 'display_name') = 'Paula Privada', 'página: privada sem foto e bio';
insert into r select (select count(*) from search_profiles_for_friends('paula')) = 0, 'busca de amigos: privada não aparece por pedaço';
insert into r select (select count(*) from search_profiles_for_friends((select p from un))) = 1, 'busca de amigos: privada aparece com o @ exato';
insert into r select (select avatar_url is null from search_profiles_for_friends('@' || (select p from un))), 'busca de amigos: sem foto da privada';
insert into r select (select count(*) from search_accounts('paula')) = 0 and (select count(*) from search_accounts((select p from un))) = 1, 'busca de contas (convite): só @ exato';
insert into r select (get_public_profile_stats((select p from un)) ->> 'error') = 'not_public', 'progresso da privada fechado para estranha';
insert into r select jsonb_array_length(list_public_decks_for_user((select p from un)) -> 'decks') = 0, 'Decks da privada fechados para estranha';
insert into r select (get_public_deck((select pid from k)) ->> 'error') = 'unavailable', 'Deck da privada indisponível para estranha';
insert into r select (select count(*) from weekly_xp where user_id = '80000000-0000-0000-0000-0000000000b1') = 1, 'ranking: privada continua para quem está logado';
reset role;

-- ===== amiga =====
select pg_temp.as_user('80000000-0000-0000-0000-0000000000c1'); set local role authenticated;
insert into r select (select count(*) from profiles where user_id = '80000000-0000-0000-0000-0000000000b1') = 1, 'amiga lê a conta privada';
insert into r select (get_profile_card((select p from un)) ->> 'bio') = 'bio secreta' and (get_profile_card((select p from un)) ->> 'full_access')::boolean, 'amiga vê foto e bio';
insert into r select (get_public_profile_stats((select p from un)) ->> 'error') is null, 'amiga vê o progresso';
insert into r select jsonb_array_length(list_public_decks_for_user((select p from un)) -> 'decks') = 1, 'amiga vê os Decks públicos';
insert into r select (get_public_deck((select pid from k)) ->> 'error') is null, 'amiga abre o Deck da privada';
insert into r select (select count(*) from search_profiles_for_friends('paula')) = 1, 'amiga acha por nome';
reset role;

-- ===== professora com vínculo ativo =====
select pg_temp.as_user('80000000-0000-0000-0000-0000000000d1'); set local role authenticated;
insert into r select (get_public_profile_stats((select p from un)) ->> 'error') is null, 'professora vê o progresso da aluna privada';
insert into r select (select count(*) from profiles where user_id = '80000000-0000-0000-0000-0000000000b1') = 1, 'professora lê a aluna privada';
reset role;
update teacher_students set status = 'removed' where teacher_id = '80000000-0000-0000-0000-0000000000d1';
select pg_temp.as_user('80000000-0000-0000-0000-0000000000d1'); set local role authenticated;
insert into r select (get_public_profile_stats((select p from un)) ->> 'error') = 'not_public', 'vínculo encerrado: a privacidade volta a valer';
reset role;

-- ===== sem login =====
select pg_temp.as_user(null); set local role anon;
insert into r select pg_temp.try('select username from profiles limit 1') = '42501', 'sem login: tabela de perfis fechada';
insert into r select (select count(*) from weekly_xp) = 0, 'sem login: ranking fechado';
insert into r select (select count(*) from badge_grants) = 0 and (select count(*) from earned_badges) = 0, 'sem login: badges e conquistas fechados';
insert into r select (get_profile_card((select a from un)) ->> 'avatar_url') = 'https://x/a.png' and (get_profile_card((select p from un)) ->> 'avatar_url') is null, 'sem login: cartão do link (foto só da pública)';
insert into r select pg_temp.try(format('select get_public_profile_stats(%L)', (select a from un))) = '42501', 'sem login: progresso exige conta';
insert into r select pg_temp.try($$select get_public_deck('00000000-0000-0000-0000-000000000000')$$) <> '42501', 'sem login: cartão do Deck público continua';
reset role;

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 080 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
