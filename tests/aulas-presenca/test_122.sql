-- 122 (aviso da aula conta os cartões do Banco daquela aula). Transação + ROLLBACK, Postgres local.
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
create or replace function pg_temp.cards(p_lesson bigint) returns int language sql as $$
  select (public._mural_ref('lesson', p_lesson) ->> 'bank_cards')::int $$;

-- T professora; A aluna (vínculo ativo, na turma K); B aluna sem itens
insert into auth.users(id, email) values ('12200000-0000-0000-0000-0000000000a1','t122@x.invalid'),
 ('12200000-0000-0000-0000-0000000000b1','a122@x.invalid'), ('12200000-0000-0000-0000-0000000000b2','b122@x.invalid');
insert into profiles(user_id, display_name) values ('12200000-0000-0000-0000-0000000000a1','Tereza Prof'),
 ('12200000-0000-0000-0000-0000000000b1','Ana'), ('12200000-0000-0000-0000-0000000000b2','Bia')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('12200000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('12200000-0000-0000-0000-0000000000a1','12200000-0000-0000-0000-0000000000b1','frances','active'),
 ('12200000-0000-0000-0000-0000000000a1','12200000-0000-0000-0000-0000000000b2','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('12200000-0000-0000-0000-0000000000a1','frances','Turma 122');
insert into v values ('T','12200000-0000-0000-0000-0000000000a1'), ('A','12200000-0000-0000-0000-0000000000b1'), ('B','12200000-0000-0000-0000-0000000000b2');
insert into v select 'K', id::text from classrooms where name = 'Turma 122';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid);

-- Alunos do Banco: SA ligado à conta da Ana; SK ligado à turma
insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id) values (pg_temp.g('T')::uuid, 'Ana (banco)', 'frances', pg_temp.g('A')::uuid);
insert into review_bank_students(teacher_id, name, language_app_key, classroom_id) values (pg_temp.g('T')::uuid, 'Turma (banco)', 'frances', pg_temp.g('K')::bigint);
insert into v select 'SA', id::text from review_bank_students where name = 'Ana (banco)';
insert into v select 'SK', id::text from review_bank_students where name = 'Turma (banco)';

-- Itens da Ana: 2 aprovados com cartão ativo em 22/10, 1 aprovado com cartão arquivado, 1 pendente, 1 aprovado de outro dia
create or replace function pg_temp.item(p_bank text, p_date date, p_status text, p_card text, p_student uuid) returns void language plpgsql as $$
declare v_id uuid;
begin
  insert into review_bank_items(teacher_id, student_id, language_app_key, bank_student_id, class_date, item_type, question, answer, status)
  values (pg_temp.g('T')::uuid, p_student, 'frances', p_bank::uuid, p_date, 'vocabulario', 'q', 'a', p_status) returning id into v_id;
  if p_card is not null then
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, status, bank_item_id)
    values (pg_temp.g('T')::uuid, coalesce(p_student, pg_temp.g('A')::uuid), 'frances', 'q', 'a', p_card, v_id);
  end if;
end $$;
select pg_temp.item(pg_temp.g('SA'), '2026-10-22', 'aprovado', 'active', pg_temp.g('A')::uuid);
select pg_temp.item(pg_temp.g('SA'), '2026-10-22', 'aprovado', 'active', pg_temp.g('A')::uuid);
select pg_temp.item(pg_temp.g('SA'), '2026-10-22', 'aprovado', 'archived', pg_temp.g('A')::uuid);
select pg_temp.item(pg_temp.g('SA'), '2026-10-22', 'pendente', null, pg_temp.g('A')::uuid);
select pg_temp.item(pg_temp.g('SA'), '2026-10-21', 'aprovado', 'active', pg_temp.g('A')::uuid);
-- Item da turma em 23/10 (cartão entregue à Ana como membro)
select pg_temp.item(pg_temp.g('SK'), '2026-10-23', 'aprovado', 'active', null);

insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', '2026-10-22', 'Passé composé');
insert into v select 'LA', max(id)::text from teacher_class_logs where student_id = pg_temp.g('A')::uuid;
insert into teacher_class_logs(teacher_id, classroom_id, language_app_key, class_date, topic) values (pg_temp.g('T')::uuid, pg_temp.g('K')::bigint, 'frances', '2026-10-23', 'Imparfait');
insert into v select 'LK', max(id)::text from teacher_class_logs where classroom_id = pg_temp.g('K')::bigint;
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values (pg_temp.g('T')::uuid, pg_temp.g('B')::uuid, 'frances', '2026-10-22', 'Sem Banco');
insert into v select 'LB', max(id)::text from teacher_class_logs where student_id = pg_temp.g('B')::uuid;

insert into r select pg_temp.cards(pg_temp.g('LA')::bigint) = 2, 'aula da Ana: só os aprovados com cartão ativo do mesmo dia (2)';
insert into r select pg_temp.cards(pg_temp.g('LK')::bigint) = 1, 'aula da turma: cartões do Banco ligado à turma (1)';
insert into r select pg_temp.cards(pg_temp.g('LB')::bigint) = 0, 'aluna sem Banco: 0';

-- A rotina aprova mais um item depois: o número muda sozinho
select pg_temp.item(pg_temp.g('SA'), '2026-10-22', 'aprovado', 'active', pg_temp.g('A')::uuid);
insert into r select pg_temp.cards(pg_temp.g('LA')::bigint) = 3, 'cartão novo da mesma aula aparece ao vivo (3)';

-- Feed da Ana traz o número; a contagem não muda o resto do aviso
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'FA', mural_feed('frances')::text;
reset role;
insert into r select (select (e -> 'ref' ->> 'bank_cards')::int from jsonb_array_elements(pg_temp.g('FA')::jsonb -> 'posts') e where e ->> 'kind' = 'lesson') = 3
  and (select e -> 'ref' ->> 'topic' from jsonb_array_elements(pg_temp.g('FA')::jsonb -> 'posts') e where e ->> 'kind' = 'lesson') = 'Passé composé',
  'feed da aluna: aviso com tema e bank_cards';
insert into r select has_function_privilege('authenticated', '_mural_ref(text,bigint)', 'execute') = false, 'contagem só pelo feed (sem execute direto)';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (122)';
rollback;
