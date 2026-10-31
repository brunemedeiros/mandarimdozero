-- 124 (aba Turma no Ranking). Transação + ROLLBACK, Postgres local.
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;

-- T professora; A, B, C alunas de francês (A e B na turma K, C não); D na turma mas com vínculo encerrado; X de fora
insert into auth.users(id, email) values ('12400000-0000-0000-0000-0000000000a1','t124@x.invalid'),
 ('12400000-0000-0000-0000-0000000000b1','a124@x.invalid'), ('12400000-0000-0000-0000-0000000000b2','b124@x.invalid'),
 ('12400000-0000-0000-0000-0000000000b3','c124@x.invalid'), ('12400000-0000-0000-0000-0000000000b4','d124@x.invalid'),
 ('12400000-0000-0000-0000-0000000000b5','x124@x.invalid');
insert into profiles(user_id, username, display_name, avatar_url, public_profile) values
 ('12400000-0000-0000-0000-0000000000a1','tereza124','Tereza Prof', null, true),
 ('12400000-0000-0000-0000-0000000000b1','ana124','Ana', 'https://x/a.png', false),
 ('12400000-0000-0000-0000-0000000000b2','bia124','Bia', 'https://x/b.png', false),
 ('12400000-0000-0000-0000-0000000000b3','cris124','Cris', null, true),
 ('12400000-0000-0000-0000-0000000000b4','dani124','Dani', null, true),
 ('12400000-0000-0000-0000-0000000000b5','xavi124','Xavi', null, true)
 on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name,
   avatar_url = excluded.avatar_url, public_profile = excluded.public_profile;
insert into account_roles(user_id, role) values ('12400000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('12400000-0000-0000-0000-0000000000a1','12400000-0000-0000-0000-0000000000b1','frances','active'),
 ('12400000-0000-0000-0000-0000000000a1','12400000-0000-0000-0000-0000000000b2','frances','active'),
 ('12400000-0000-0000-0000-0000000000a1','12400000-0000-0000-0000-0000000000b3','frances','active'),
 ('12400000-0000-0000-0000-0000000000a1','12400000-0000-0000-0000-0000000000b4','frances','removed');
insert into classrooms(teacher_id, language_app_key, name) values ('12400000-0000-0000-0000-0000000000a1','frances','Turma 124');
insert into v values ('T','12400000-0000-0000-0000-0000000000a1'), ('A','12400000-0000-0000-0000-0000000000b1'),
 ('B','12400000-0000-0000-0000-0000000000b2'), ('C','12400000-0000-0000-0000-0000000000b3'),
 ('D','12400000-0000-0000-0000-0000000000b4'), ('X','12400000-0000-0000-0000-0000000000b5');
insert into v select 'K', id::text from classrooms where name = 'Turma 124';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid),
 (pg_temp.g('K')::bigint, pg_temp.g('B')::uuid), (pg_temp.g('K')::bigint, pg_temp.g('D')::uuid);

-- XP da semana: Ana 30 fr + 50 zh (zh não conta), Bia 0 (sem linha), Cris 90 (fora da turma), Dani 70 (vínculo encerrado)
insert into weekly_xp(user_id, language_app_key, week_start, amount) values
 (pg_temp.g('A')::uuid, 'frances', '2026-10-26', 30), (pg_temp.g('A')::uuid, 'mandarim', '2026-10-26', 50),
 (pg_temp.g('C')::uuid, 'frances', '2026-10-26', 90), (pg_temp.g('D')::uuid, 'frances', '2026-10-26', 70),
 (pg_temp.g('B')::uuid, 'frances', '2026-10-19', 40);

-- Ana
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'RA', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from classroom_ranking_rooms() x)::text;
insert into v select 'LA', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from classroom_leaderboard(pg_temp.g('K')::bigint, '2026-10-26') x)::text;
reset role;
-- Cris (fora da turma) e Dani (vínculo encerrado)
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into v select 'RC', (select count(*) from classroom_ranking_rooms())::text;
insert into v select 'LC', (select count(*) from classroom_leaderboard(pg_temp.g('K')::bigint, '2026-10-26'))::text;
reset role;
select pg_temp.as_user(pg_temp.g('D')); set local role authenticated;
insert into v select 'RD', (select count(*) from classroom_ranking_rooms())::text;
reset role;
-- Professora
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'RT', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from classroom_ranking_rooms() x)::text;
insert into v select 'LT', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from classroom_leaderboard(pg_temp.g('K')::bigint, '2026-10-26') x)::text;
reset role;
select pg_temp.as_user(null); set local role anon;
insert into v select 'ANON', has_function_privilege('anon', 'classroom_leaderboard(bigint,date)', 'execute')::text;
reset role;

insert into r select jsonb_array_length(pg_temp.g('RA')::jsonb) = 1 and pg_temp.g('RA')::jsonb -> 0 ->> 'name' = 'Turma 124'
  and (pg_temp.g('RA')::jsonb -> 0 ->> 'is_teacher')::boolean = false, 'aluna da turma: a aba aparece com a turma dela';
insert into r select pg_temp.g('RC') = '0' and pg_temp.g('RD') = '0', 'fora da turma ou com vínculo encerrado: sem aba';
insert into r select jsonb_array_length(pg_temp.g('LA')::jsonb) = 2, 'lista só com as alunas da turma com vínculo ativo (Ana e Bia)';
insert into r select pg_temp.g('LA')::jsonb -> 0 ->> 'display_name' = 'Ana' and (pg_temp.g('LA')::jsonb -> 0 ->> 'amount')::int = 30
  and (pg_temp.g('LA')::jsonb -> 0 ->> 'is_me')::boolean, 'Ana em 1º com 30 XP de francês (o XP de mandarim não conta)';
insert into r select pg_temp.g('LA')::jsonb -> 1 ->> 'display_name' = 'Bia' and (pg_temp.g('LA')::jsonb -> 1 ->> 'amount')::int = 0,
  'Bia sem XP nesta semana aparece no fim com 0 (XP da semana passada não conta)';
insert into r select pg_temp.g('LA')::jsonb -> 1 ->> 'avatar_url' is null and pg_temp.g('LA')::jsonb -> 0 ->> 'avatar_url' = 'https://x/a.png',
  'perfil privado da colega sem foto; a própria foto aparece';
insert into r select pg_temp.g('LC') = '0', 'quem não é da turma não lê o ranking dela';
insert into r select (pg_temp.g('RT')::jsonb -> 0 ->> 'is_teacher')::boolean and jsonb_array_length(pg_temp.g('LT')::jsonb) = 2
  and not exists (select 1 from jsonb_array_elements(pg_temp.g('LT')::jsonb) e where e ->> 'user_id' = pg_temp.g('T')),
  'professora vê o ranking da turma, sem entrar na lista';
insert into r select (select avatar_url from jsonb_to_recordset(pg_temp.g('LT')::jsonb) as y(display_name text, avatar_url text) where display_name = 'Bia') = 'https://x/b.png',
  'professora vê a foto da aluna dela (acesso total)';
insert into r select pg_temp.g('ANON') = 'false' and not has_function_privilege('anon', 'classroom_ranking_rooms()', 'execute'), 'sem acesso sem login';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (124)';
rollback;
