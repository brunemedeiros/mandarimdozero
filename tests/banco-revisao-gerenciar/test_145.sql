-- 145 (juntar fichas sem perder histórico). Transação + ROLLBACK, Postgres local (tests/banco-revisao-gerenciar/run.sh (test_145.sql)).
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
begin execute q; return 'ok'; exception when others then return coalesce(nullif(sqlerrm, ''), sqlstate); end $$;
grant execute on function pg_temp.try(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$
declare v text; begin execute q into v; return v; end $$;
grant execute on function pg_temp.sq(text) to public;
-- cartões de um item por aluno (como dono do banco)
create or replace function pg_temp.cards(item text) returns text language plpgsql security definer as $$
declare v text; begin
  select string_agg(p.display_name || ':' || t.status, ',' order by p.display_name) into v
    from teacher_flashcards t join profiles p on p.user_id = t.student_id where t.bank_item_id = item::uuid;
  return coalesce(v, ''); end $$;
grant execute on function pg_temp.cards(text) to public;



-- T professora; A aluna com conta (vínculo ativo); B outra conta; U1 aluna que pede mudanças nos itens
insert into auth.users(id, email) values
 ('97000000-0000-0000-0000-0000000000a1','t145@x.invalid'), ('97000000-0000-0000-0000-0000000000b1','a145@x.invalid'),
 ('97000000-0000-0000-0000-0000000000b2','b145@x.invalid'), ('97000000-0000-0000-0000-0000000000c1','u145@x.invalid'), ('97000000-0000-0000-0000-0000000000e1','e145@x.invalid');
insert into profiles(user_id, display_name) values
 ('97000000-0000-0000-0000-0000000000a1','Tereza'), ('97000000-0000-0000-0000-0000000000b1','Ana'), ('97000000-0000-0000-0000-0000000000b2','Bia'), ('97000000-0000-0000-0000-0000000000c1','Ursula'), ('97000000-0000-0000-0000-0000000000e1','Eva')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('97000000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000b1','frances','active'),
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000b2','frances','active'),
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000e1','frances','active');
insert into v values ('T','97000000-0000-0000-0000-0000000000a1'), ('A','97000000-0000-0000-0000-0000000000b1'), ('B','97000000-0000-0000-0000-0000000000b2'), ('E','97000000-0000-0000-0000-0000000000e1'), ('U1','97000000-0000-0000-0000-0000000000c1'),
 ('K','ffffffff-0000-0000-0000-000000000001'), ('D','ffffffff-0000-0000-0000-000000000002'),
 ('KL','ffffffff-0000-0000-0000-000000000003'), ('DL','ffffffff-0000-0000-0000-000000000004'),
 ('LA','ffffffff-0000-0000-0000-000000000005'), ('LB','ffffffff-0000-0000-0000-000000000006'),
 ('x1','11111111-0000-0000-0000-000000000001'), ('y1','11111111-0000-0000-0000-000000000002'), ('y2','11111111-0000-0000-0000-000000000003'),
 ('z1','11111111-0000-0000-0000-000000000004'), ('la1','11111111-0000-0000-0000-000000000005'), ('lb1','11111111-0000-0000-0000-000000000006');

-- ficha que FICA (K) e ficha que SAI (D), sem conta; x1 e y1 são o MESMO item (mesma import_key k1); y2 é só da que sai
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language, lesson_dates, last_entry_read) values
 (pg_temp.g('K')::uuid, pg_temp.g('T')::uuid, 'Luana Baionne', 'frances', 'pt', array['2026-11-01']::date[], '2026-11-05'),
 (pg_temp.g('D')::uuid, pg_temp.g('T')::uuid, 'Luana', 'frances', 'pt', array['2026-11-02']::date[], '2026-11-09');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key, status, fsrs, level, due_date, last_result, last_review_date) values
 (pg_temp.g('x1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('K')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché', 'k1', 'aprovado', '{"reps":1,"lastReview":"2026-10-01"}'::jsonb, 1, '2026-10-02', 'acertou', '2026-10-01'),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché', 'k1', 'aprovado', '{"reps":5,"lastReview":"2026-11-10"}'::jsonb, 4, '2026-11-20', 'acertou', '2026-11-10'),
 (pg_temp.g('y2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', 'vocabulario', 'pão', 'le pain', 'k2', 'pendente', null, 0, null, null, null);
-- histórico: x1 tem 1 resposta e 1 pedido aberto da U1; y1 tem 3 respostas e 2 pedidos (1 aberto da MESMA U1, 1 já decidido)
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome, created_at) values
 (pg_temp.g('x1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('K')::uuid, 'frances', 'acertou', now()),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', 'acertou', now()),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', 'errou', now()),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', 'ajuda', now());
insert into review_bank_requests(item_id, teacher_id, requester_id, bank_student_id, kind, status) values
 (pg_temp.g('x1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('U1')::uuid, pg_temp.g('K')::uuid, 'errado', 'pendente'),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('U1')::uuid, pg_temp.g('D')::uuid, 'cortar', 'pendente'),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('B')::uuid, pg_temp.g('D')::uuid, 'errado', 'mantido');
-- Récaps: mesma data (d1) nas duas fichas, e uma data só da que sai (d2) que cita o item repetido
insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date, item_ids) values
 (pg_temp.g('T')::uuid, pg_temp.g('K')::uuid, 'frances', '2026-11-01', array[pg_temp.g('x1')::uuid]),
 (pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', '2026-11-01', array[pg_temp.g('y1')::uuid, pg_temp.g('y2')::uuid]),
 (pg_temp.g('T')::uuid, pg_temp.g('D')::uuid, 'frances', '2026-11-02', array[pg_temp.g('y1')::uuid]);

create temp table antes as select
  (select count(*) from review_bank_reviews where bank_student_id in (pg_temp.g('K')::uuid, pg_temp.g('D')::uuid)) rev,
  (select count(*) from review_bank_requests where bank_student_id in (pg_temp.g('K')::uuid, pg_temp.g('D')::uuid)) req;

select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'prev', merge_review_bank_students(pg_temp.g('D')::uuid, pg_temp.g('K')::uuid, true)::text;
reset role;
insert into r select (pg_temp.g('prev')::jsonb ->> 'reviews_moved') = '3' and (pg_temp.g('prev')::jsonb ->> 'requests_moved') = '2' and (pg_temp.g('prev')::jsonb ->> 'items_duplicate') = '1' and (pg_temp.g('prev')::jsonb ->> 'items_moved') = '1' and (pg_temp.g('prev')::jsonb ->> 'recaps_merged') = '1' and (pg_temp.g('prev')::jsonb ->> 'recaps_moved') = '1' and (pg_temp.g('prev')::jsonb ->> 'link_moves') = 'false' and (pg_temp.g('prev')::jsonb ->> 'blocked') is null, 'prévia: 3 respostas e 2 pedidos vão para o item que fica, 1 repetido, 1 item novo, Récaps (1 unido, 1 trazido), conta não muda';
insert into r select pg_temp.sq('select count(*)::text from review_bank_students where name = ''Luana''') = '1' and pg_temp.sq('select count(*)::text from review_bank_reviews') = '4', 'prévia não muda nada';

select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select merge_review_bank_students(pg_temp.g('D')::uuid, pg_temp.g('K')::uuid, false);
reset role;
insert into r select pg_temp.sq('select count(*)::text from review_bank_students where id = ' || quote_literal(pg_temp.g('D'))) = '0', 'juntar: a ficha que sai some';
insert into r select (select rev from antes) = (select count(*) from review_bank_reviews where bank_student_id = pg_temp.g('K')::uuid), 'NENHUMA resposta do Modo aula some (4 antes = 4 depois, todas na ficha que fica)';
insert into r select (select count(*) from review_bank_reviews where item_id = pg_temp.g('x1')::uuid) = 4, 'as 4 respostas ficam no item que fica (x1), inclusive as 3 do repetido';
insert into r select (select req from antes) = (select count(*) from review_bank_requests where bank_student_id = pg_temp.g('K')::uuid), 'NENHUM pedido da aluna some (3 antes = 3 depois)';
insert into r select (select count(*) from review_bank_requests where item_id = pg_temp.g('x1')::uuid and status = 'pendente') = 1 and (select count(*) from review_bank_requests where item_id = pg_temp.g('x1')::uuid and status = 'recusado' and reason like '%repetido ao juntar%') = 1 and (select count(*) from review_bank_requests where item_id = pg_temp.g('x1')::uuid and status = 'mantido') = 1, 'pedido aberto repetido da mesma aluna vira "recusado" com a razão; o aberto do item que fica e o já decidido continuam';
insert into r select pg_temp.sq(format('select (fsrs->>''reps'' = ''5'' and level = 4 and due_date = date ''2026-11-20'' and last_review_date = date ''2026-11-10'')::text from review_bank_items where id = %L', pg_temp.g('x1'))) = 'true', 'memória (FSRS e escada) do item revisado mais recentemente fica no item que fica';
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_items where id = %L', pg_temp.g('y1'))) = '0' and pg_temp.sq(format('select (bank_student_id = %L)::text from review_bank_items where id = %L', pg_temp.g('K'), pg_temp.g('y2'))) = 'true', 'o item repetido sai e o item só da ficha que sai vem para a que fica';
insert into r select pg_temp.sq(format('select item_ids::text from review_bank_recaps where bank_student_id = %L and class_date = date ''2026-11-01''', pg_temp.g('K'))) in ('{' || pg_temp.g('x1') || ',' || pg_temp.g('y2') || '}', '{' || pg_temp.g('y2') || ',' || pg_temp.g('x1') || '}'), 'Récap com a mesma data: os itens dos dois são unidos (o repetido vira o que ficou)';
insert into r select pg_temp.sq(format('select item_ids::text from review_bank_recaps where bank_student_id = %L and class_date = date ''2026-11-02''', pg_temp.g('K'))) = '{' || pg_temp.g('x1') || '}', 'Récap só da ficha que sai vem inteiro e o id do repetido apagado vira o que ficou';
insert into r select pg_temp.sq(format('select (last_entry_read = date ''2026-11-09'' and agenda_names @> array[''Luana''])::text from review_bank_students where id = %L', pg_temp.g('K'))) = 'true', 'ficha que fica: última leitura é a mais recente e o nome que saiu vira nome de agenda';

-- conta que passa para a ficha que fica (a que fica não tinha conta); itens e cartões não somem
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language) values
 (pg_temp.g('KL')::uuid, pg_temp.g('T')::uuid, 'Sem conta', 'frances', 'pt'), (pg_temp.g('DL')::uuid, pg_temp.g('T')::uuid, 'Com conta', 'frances', 'pt');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key) values
 (pg_temp.g('la1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('DL')::uuid, 'frances', 'vocabulario', 'queijo', 'le fromage', 'kl1');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select link_review_bank_student(pg_temp.g('DL')::uuid, pg_temp.g('A')::uuid);
select approve_review_bank_item(pg_temp.g('la1')::uuid, 'queijo', 'le fromage', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
insert into v select 'prevL', merge_review_bank_students(pg_temp.g('DL')::uuid, pg_temp.g('KL')::uuid, true)::text;
reset role;
insert into r select (pg_temp.g('prevL')::jsonb ->> 'link_moves') = 'true' and (pg_temp.g('prevL')::jsonb ->> 'blocked') is null, 'prévia avisa que a conta vinculada passa para a ficha que fica (e o item com cartão não bloqueia)';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select merge_review_bank_students(pg_temp.g('DL')::uuid, pg_temp.g('KL')::uuid, false);
reset role;
insert into r select pg_temp.sq(format('select (linked_student_id = %L)::text from review_bank_students where id = %L', pg_temp.g('A'), pg_temp.g('KL'))) = 'true', 'juntar com conta: a conta vinculada passa para a ficha que fica (o vínculo NÃO se desfaz)';
insert into r select pg_temp.sq(format('select (bank_student_id = %L and student_id = %L and teacher_flashcard_id is not null)::text from review_bank_items where id = %L', pg_temp.g('KL'), pg_temp.g('A'), pg_temp.g('la1'))) = 'true' and pg_temp.sq(format('select count(*)::text from teacher_flashcards where bank_item_id = %L and student_id = %L', pg_temp.g('la1'), pg_temp.g('A'))) = '1', 'o item com cartão vem junto e o cartão da aluna continua';

-- duas fichas com contas DIFERENTES: não junta
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language) values
 (pg_temp.g('LA')::uuid, pg_temp.g('T')::uuid, 'Conta A', 'frances', 'pt'), (pg_temp.g('LB')::uuid, pg_temp.g('T')::uuid, 'Conta B', 'frances', 'pt');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select link_review_bank_student(pg_temp.g('LA')::uuid, pg_temp.g('B')::uuid);
select link_review_bank_student(pg_temp.g('LB')::uuid, pg_temp.g('E')::uuid);
insert into v select 'prevX', merge_review_bank_students(pg_temp.g('LB')::uuid, pg_temp.g('LA')::uuid, false)::text;
reset role;
insert into r select (pg_temp.g('prevX')::jsonb ->> 'blocked') = 'different_targets' and pg_temp.sq('select count(*)::text from review_bank_students where name in (''Conta A'', ''Conta B'')') = '2', 'duas fichas com contas diferentes: bloqueia (different_targets) e nada muda';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 145 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
