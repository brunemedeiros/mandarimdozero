-- 136 (gerenciar alunos e itens do Banco). Transação + ROLLBACK, Postgres local (tests/banco-revisao-gerenciar/run.sh).
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


-- T professora, T2 outra professora, A aluna de T (fr), U usuária comum
insert into auth.users(id, email) values
 ('96000000-0000-0000-0000-0000000000a1','t136@x.invalid'), ('96000000-0000-0000-0000-0000000000a2','t2_136@x.invalid'),
 ('96000000-0000-0000-0000-0000000000b1','a136@x.invalid');
insert into profiles(user_id, display_name) values
 ('96000000-0000-0000-0000-0000000000a1','Tereza'), ('96000000-0000-0000-0000-0000000000a2','Outra'), ('96000000-0000-0000-0000-0000000000b1','Ana')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('96000000-0000-0000-0000-0000000000a1','teacher'), ('96000000-0000-0000-0000-0000000000a2','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('96000000-0000-0000-0000-0000000000a1','96000000-0000-0000-0000-0000000000b1','frances','active');
insert into v values ('T','96000000-0000-0000-0000-0000000000a1'), ('T2','96000000-0000-0000-0000-0000000000a2'), ('A','96000000-0000-0000-0000-0000000000b1'),
 ('S1','dddddddd-0000-0000-0000-000000000001'), ('S2','dddddddd-0000-0000-0000-000000000002'), ('S3','dddddddd-0000-0000-0000-000000000003'), ('S4','dddddddd-0000-0000-0000-000000000004'),
 ('x1','eeeeeeee-0000-0000-0000-000000000001'), ('x2','eeeeeeee-0000-0000-0000-000000000002'), ('y1','eeeeeeee-0000-0000-0000-000000000003'),
 ('y2','eeeeeeee-0000-0000-0000-000000000004'), ('x3','eeeeeeee-0000-0000-0000-000000000007'), ('z1','eeeeeeee-0000-0000-0000-000000000005'), ('m1','eeeeeeee-0000-0000-0000-000000000006');

select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language, agenda_names, lesson_dates, last_entry_read, notebook_id) values
 (pg_temp.g('S1')::uuid, pg_temp.g('T')::uuid, 'Luana Baionne', 'frances', 'pt', array['Luana B'], array['2026-11-01']::date[], '2026-11-05', 'NB1'),
 (pg_temp.g('S2')::uuid, pg_temp.g('T')::uuid, 'Luana', 'frances', 'pt', array['Lu'], array['2026-11-02']::date[], '2026-11-09', 'NB1'),
 (pg_temp.g('S3')::uuid, pg_temp.g('T')::uuid, 'Maxi', 'portugues', 'en', '{}', '{}', null, null),
 (pg_temp.g('S4')::uuid, pg_temp.g('T')::uuid, 'Sem nada', 'frances', 'pt', '{}', '{}', null, null);
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key) values
 (pg_temp.g('x1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché', 'k1'),
 (pg_temp.g('x2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'pão', 'le pain', 'k2'),
 (pg_temp.g('y1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché', 'k1'),
 (pg_temp.g('y2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', 'vocabulario', 'queijo', 'le fromage', 'k3'),
 (pg_temp.g('z1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S4')::uuid, 'frances', 'vocabulario', 'sal', 'le sel', null),
 (pg_temp.g('m1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S3')::uuid, 'portugues', 'vocabulario', 'a casa', 'the house', null);
insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date) values
 (pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', '2026-11-01'), (pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', '2026-11-01'), (pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', '2026-11-02');
select link_review_bank_student(pg_temp.g('S1')::uuid, pg_temp.g('A')::uuid);
select approve_review_bank_item(pg_temp.g('x1')::uuid, 'mercado', 'le marché', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
reset role;
insert into google_calendar_rules(teacher_id, key_type, key, action, bank_student_id, language_app_key) values (pg_temp.g('T')::uuid, 'title', 'luana', 'bank_student', pg_temp.g('S2')::uuid, 'frances');

-- ===== pegada =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (review_bank_student_footprint(pg_temp.g('S1')::uuid) ->> 'delivered_cards') = '1' and (review_bank_student_footprint(pg_temp.g('S1')::uuid) ->> 'items') = '2', 'pegada: conta itens e cartões entregues';
-- ===== apagar item =====
insert into r select pg_temp.try(format('select delete_review_bank_item(%L)', pg_temp.g('x1'))) = 'has_card', 'item com cartão não se apaga (cortar)';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select delete_review_bank_item(pg_temp.g('z1')::uuid);
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_items where id = %L', pg_temp.g('z1'))) = '0', 'item sem cartão é apagado';
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key) values
 (pg_temp.g('x3')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'leite', 'le lait', 'k9');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select approve_review_bank_item(pg_temp.g('x3')::uuid, 'leite', 'le lait', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
reset role;
-- ===== apagar aluno =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select delete_review_bank_student(%L)', pg_temp.g('S1'))) = 'has_progress', 'aluno com cartão entregue não se apaga (arquivar)';
select delete_review_bank_student(pg_temp.g('S4')::uuid);
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_students where id = %L', pg_temp.g('S4'))) = '0', 'aluno sem cartão, memória nem respostas é apagado';
-- ===== mover =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select move_review_bank_item(%L, %L)', pg_temp.g('y2'), pg_temp.g('S3'))) = 'language_mismatch', 'mover: outro idioma recusa';
insert into r select pg_temp.try(format('select move_review_bank_item(%L, %L)', pg_temp.g('y1'), pg_temp.g('S1'))) = 'duplicate_in_target', 'mover: item repetido no destino recusa';
insert into r select pg_temp.try(format('select move_review_bank_item(%L, %L)', pg_temp.g('x3'), pg_temp.g('S2'))) = 'has_card_other_recipient', 'mover: item com cartão para quem entrega a outro destinatário recusa';
insert into r select pg_temp.try(format('select move_review_bank_item(%L, %L)', pg_temp.g('x1'), pg_temp.g('S1'))) = 'same_student', 'mover: para o mesmo aluno recusa';
reset role;
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into r select pg_temp.try(format('select move_review_bank_item(%L, %L)', pg_temp.g('y2'), pg_temp.g('S2'))) = 'not_authorized', 'mover: outra professora não mexe';
insert into r select pg_temp.try(format('select review_bank_student_footprint(%L)', pg_temp.g('S1'))) = 'not_authorized', 'pegada: outra professora não vê';
insert into r select pg_temp.try(format('select delete_review_bank_student(%L)', pg_temp.g('S2'))) = 'not_authorized', 'apagar aluno: outra professora não apaga';
insert into r select pg_temp.try(format('select delete_review_bank_item(%L)', pg_temp.g('y2'))) = 'not_authorized', 'apagar item: outra professora não apaga';
insert into r select pg_temp.try(format('select merge_review_bank_students(%L, %L, false)', pg_temp.g('S2'), pg_temp.g('S1'))) = 'not_authorized', 'juntar: outra professora não junta';
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select pg_temp.try(format('select merge_review_bank_students(%L, %L, true)', pg_temp.g('S2'), pg_temp.g('S1'))) = 'not_authorized', 'juntar: aluna não junta';
reset role;
set local role anon;
insert into r select pg_temp.try(format('select merge_review_bank_students(%L, %L, true)', pg_temp.g('S2'), pg_temp.g('S1'))) <> 'ok', 'anon não executa';
reset role;
-- ===== juntar =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select merge_review_bank_students(%L, %L, false)', pg_temp.g('S3'), pg_temp.g('S1'))) = 'language_mismatch', 'juntar: idiomas diferentes recusa';
insert into v select 'prev', merge_review_bank_students(pg_temp.g('S1')::uuid, pg_temp.g('S2')::uuid, true)::text;
insert into r select (pg_temp.g('prev')::jsonb ->> 'blocked') = 'duplicate_has_card', 'juntar: item repetido que já virou cartão fica bloqueado (nada de progresso se perde)';
insert into v select 'dry', merge_review_bank_students(pg_temp.g('S2')::uuid, pg_temp.g('S1')::uuid, true)::text;
reset role;
insert into r select (pg_temp.g('dry')::jsonb ->> 'items_moved') = '1' and (pg_temp.g('dry')::jsonb ->> 'items_duplicate') = '1' and (pg_temp.g('dry')::jsonb ->> 'recaps_moved') = '1' and (pg_temp.g('dry')::jsonb ->> 'recaps_duplicate') = '1' and (pg_temp.g('dry')::jsonb ->> 'blocked') is null, 'juntar: prévia conta 1 item novo, 1 repetido, 1 Récap novo, 1 repetido';
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_students where id = %L', pg_temp.g('S2'))) = '1', 'juntar: prévia não muda nada';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select merge_review_bank_students(pg_temp.g('S2')::uuid, pg_temp.g('S1')::uuid, false);
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_students where id = %L', pg_temp.g('S2'))) = '0', 'juntar: a ficha que sai some';
insert into r select pg_temp.sq(format('select string_agg(question, '','' order by question) from review_bank_items where bank_student_id = %L', pg_temp.g('S1'))) = 'leite,mercado,pão,queijo', 'juntar: itens ficam todos no aluno que fica, sem repetir o mercado';
insert into r select pg_temp.sq(format('select (student_id = %L)::text from review_bank_items where id = %L', pg_temp.g('A'), pg_temp.g('y2'))) = 'true', 'juntar: item trazido passa a apontar para a conta do aluno que fica';
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_recaps where bank_student_id = %L', pg_temp.g('S1'))) = '2', 'juntar: Récap do dia 02 foi trazido, o repetido do dia 01 não duplica';
insert into r select pg_temp.sq(format('select (bank_student_id = %L)::text from google_calendar_rules where key = ''luana''', pg_temp.g('S1'))) = 'true', 'juntar: regra do Google Agenda segue a ficha que fica';
insert into r select pg_temp.sq(format($q$select (agenda_names @> array['Lu','Luana','Luana B'] and lesson_dates = array['2026-11-01','2026-11-02']::date[] and last_entry_read = '2026-11-09' and notebook_id = 'NB1')::text from review_bank_students where id = %L$q$, pg_temp.g('S1'))) = 'true', 'juntar: une nomes de agenda e datas, última leitura é a mais recente e o caderno não muda';
insert into r select pg_temp.sq(format('select count(*)::text from teacher_flashcards where bank_item_id = %L', pg_temp.g('x1'))) = '1', 'juntar: cartão entregue continua (nada de progresso apagado)';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 136 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
