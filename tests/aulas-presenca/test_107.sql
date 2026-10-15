-- 107 (senha curta do link de agenda). Transação + ROLLBACK, Postgres local (tests/aulas-presenca/run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;
insert into auth.users(id, email) values ('10500000-0000-0000-0000-0000000000a1','t105@x.invalid'), ('10500000-0000-0000-0000-0000000000b1','a105@x.invalid');
insert into profiles(user_id, display_name) values ('10500000-0000-0000-0000-0000000000a1','Prof'), ('10500000-0000-0000-0000-0000000000b1','Ana')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('10500000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('10500000-0000-0000-0000-0000000000a1','10500000-0000-0000-0000-0000000000b1','frances','active');
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic)
 values ('10500000-0000-0000-0000-0000000000a1','10500000-0000-0000-0000-0000000000b1','frances', current_date + 2, 'Futura');
-- senha antiga (64 hex) já gravada, como a da autora na produção
insert into calendar_feed_tokens(user_id, token) values ('10500000-0000-0000-0000-0000000000a1', repeat('a', 64));
set local role service_role;
insert into r select (select count(*) from class_calendar_feed(repeat('a', 64))) = 1, 'senha antiga continua valendo até ser trocada';
reset role;

select pg_temp.as_user('10500000-0000-0000-0000-0000000000a1'); set local role authenticated;
insert into v select 'T1', my_calendar_feed_token();
insert into r select pg_temp.g('T1') ~ '^[abcdefghjkmnpqrstuvwxyz23456789]{16}$', 'abrir o bloco troca a senha antiga por 16 caracteres sem i/l/o/0/1';
insert into r select my_calendar_feed_token() = pg_temp.g('T1'), 'pedir de novo devolve a mesma senha curta';
insert into v select 'T2', my_calendar_feed_token(true);
insert into r select pg_temp.g('T2') <> pg_temp.g('T1') and pg_temp.g('T2') ~ '^[a-z2-9]{16}$', 'gerar outro link dá outra senha curta';
reset role;
set local role service_role;
insert into r select (select count(*) from class_calendar_feed(repeat('a', 64))) = 0, 'senha antiga parou depois da troca';
insert into r select (select count(*) from class_calendar_feed(pg_temp.g('T1'))) = 0, 'senha curta anterior parou';
insert into r select (select count(*) from class_calendar_feed(pg_temp.g('T2'))) = 1, 'senha curta atual funciona';
insert into r select (select count(*) from class_calendar_feed('ABCDEFGHJKMNPQRS')) = 0, 'maiúsculas não valem';
insert into r select class_calendar_feed_lang(pg_temp.g('T2')) = 'pt-BR', 'idioma do link: português por padrão';
insert into r select class_calendar_feed_lang('zzzzzzzzzzzzzzzz') is null, 'idioma: senha inexistente = vazio';
reset role;
insert into progress(user_id, data) values ('10500000-0000-0000-0000-0000000000a1', '{"_meta":{"uiLanguage":"en"}}')
  on conflict (user_id) do update set data = excluded.data;
set local role service_role;
insert into r select class_calendar_feed_lang(pg_temp.g('T2')) = 'en', 'idioma: site em inglês = en';
reset role;
insert into r select pg_temp.try($q$insert into calendar_feed_tokens(user_id, token) values ('10500000-0000-0000-0000-0000000000b1', 'curta')$q$) = '23514', 'formato inválido recusado';
-- 2000 senhas: todas com 16 caracteres e sem repetição
insert into r select (select count(distinct t) = 2000 and bool_and(t ~ '^[a-z2-9]{16}$') from (select _calendar_feed_new_token() t from generate_series(1, 2000)) s), '2000 senhas novas, todas diferentes';
insert into r select has_function_privilege('anon', 'class_calendar_feed_lang(text)', 'execute') = false
  and has_function_privilege('authenticated', 'class_calendar_feed_lang(text)', 'execute') = false
  and has_function_privilege('authenticated', '_calendar_feed_new_token()', 'execute') = false, 'funções internas fechadas para o app';
select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (107)';
rollback;
