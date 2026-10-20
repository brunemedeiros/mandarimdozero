-- 112 (agendamento único do Banco: Modo aula em FSRS + estudo em casa). Transação + ROLLBACK, Postgres local.
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

insert into auth.users(id, email) values
 ('96000000-0000-0000-0000-0000000000a1','t112@x.invalid'),
 ('96000000-0000-0000-0000-0000000000b1','a112@x.invalid'), ('96000000-0000-0000-0000-0000000000b2','b112@x.invalid'),
 ('96000000-0000-0000-0000-0000000000b3','c112@x.invalid');
insert into profiles(user_id, display_name) values
 ('96000000-0000-0000-0000-0000000000a1','Tereza'), ('96000000-0000-0000-0000-0000000000b1','Ana'),
 ('96000000-0000-0000-0000-0000000000b2','Bia'), ('96000000-0000-0000-0000-0000000000b3','Caio')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('96000000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('96000000-0000-0000-0000-0000000000a1','96000000-0000-0000-0000-0000000000b1','frances','active'),
 ('96000000-0000-0000-0000-0000000000a1','96000000-0000-0000-0000-0000000000b2','frances','active'),
 ('96000000-0000-0000-0000-0000000000a1','96000000-0000-0000-0000-0000000000b3','frances','active');
insert into v values ('T','96000000-0000-0000-0000-0000000000a1'), ('A','96000000-0000-0000-0000-0000000000b1'),
 ('B','96000000-0000-0000-0000-0000000000b2'), ('C','96000000-0000-0000-0000-0000000000b3'),
 ('S1','bbbbbbbb-1120-0000-0000-000000000001'), ('S2','bbbbbbbb-1120-0000-0000-000000000002'),
 ('i1','cccccccc-1120-0000-0000-000000000001'), ('i2','cccccccc-1120-0000-0000-000000000002');

-- S1: turma (Ana e Bia); S2: Caio sozinho (conta individual)
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K', mural_save_classroom('frances', null, 'Ana e Bia') ->> 'id';
select mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A'), pg_temp.g('B')]::uuid[]);
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language) values
 (pg_temp.g('S1')::uuid, pg_temp.g('T')::uuid, 'Ana e Bia', 'frances', 'pt'),
 (pg_temp.g('S2')::uuid, pg_temp.g('T')::uuid, 'Caio sozinho', 'frances', 'pt');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values
 (pg_temp.g('i1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché'),
 (pg_temp.g('i2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', 'vocabulario', 'queijo', 'le fromage');
select link_review_bank_classroom(pg_temp.g('S1')::uuid, pg_temp.g('K')::bigint);
select link_review_bank_student(pg_temp.g('S2')::uuid, pg_temp.g('C')::uuid);
select approve_review_bank_item(pg_temp.g('i1')::uuid, 'mercado', 'le marché', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
insert into v select 'cC', approve_review_bank_item(pg_temp.g('i2')::uuid, 'queijo', 'le fromage', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null)::text;
reset role;
update classroom_members set added_at = now() - interval '2 hours' where classroom_id = pg_temp.g('K')::bigint;
insert into v select 'cA', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i1')::uuid and student_id = pg_temp.g('A')::uuid;
insert into v select 'cB', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i1')::uuid and student_id = pg_temp.g('B')::uuid;

-- ===== Estudo em casa: conta individual (Caio) =====
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 2, true,
  jsonb_build_object('stability', 4.5, 'difficulty', 5.1, 'state', 'review', 'lastReview', 1760000000000, 'due', 1760400000000,
                     'reps', 3, 'lapses', 0, 'interval', 4, 'fsrsReps', 3, 'fsrsLapses', 0, 'lixo', 'x')), 'Caio registra "Bom" digitado em casa';
reset role;
insert into r select pg_temp.sq(format($q$select (outcome = 'acertou' and grade = 2 and typed and via = 'casa' and applied_at is not null and source = 'modo_aula')::text
  from review_bank_reviews where item_id = %L and student_id = %L$q$, pg_temp.g('i2'), pg_temp.g('C'))) = 'true', 'linha da resposta: outcome, nota, digitado, via casa, já aplicada';
insert into r select pg_temp.sq(format($q$select ((fsrs ->> 'stability')::numeric = 4.5 and fsrs ->> 'state' = 'review' and not (fsrs ? 'lixo')
  and last_result = 'acertou' and last_source = 'casa' and last_review_date is not null and due_date is not null)::text from review_bank_items where id = %L$q$, pg_temp.g('i2'))) = 'true',
  'item de conta individual espelha o FSRS (só campos conhecidos), resultado, origem e data';
insert into r select pg_temp.sq(format('select (due_date = (to_timestamp(1760400000) at time zone ''America/Sao_Paulo'')::date)::text from review_bank_items where id = %L', pg_temp.g('i2'))) = 'true', 'due_date vem do due do FSRS (fuso de São Paulo)';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 0, false, jsonb_build_object('state', 'relearning', 'due', 1760500000000)), 'Errei em casa';
insert into r select pg_temp.sq(format('select last_result from review_bank_items where id = %L', pg_temp.g('i2'))) = 'errou', 'último resultado vira errou';
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, null, false, jsonb_build_object('state', 'review', 'due', 1760600000000)), 'grade null só espelha';
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_reviews where item_id = %L', pg_temp.g('i2'))) = '2', 'grade null não cria linha de resposta';
insert into r select pg_temp.sq(format('select (fsrs ->> ''state'' = ''review'' and last_result = ''errou'')::text from review_bank_items where id = %L', pg_temp.g('i2'))) = 'true', 'grade null atualiza o estado mas mantém o último resultado';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select pg_temp.try(format('select log_my_bank_review(%s, 4, false, null)', pg_temp.g('cC'))) = 'grade_invalido', 'nota inválida é recusada';
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 2, false, '{"stability":"abc","due":"x"}'::jsonb), 'FSRS malformado não derruba o registro';
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_reviews where item_id = %L', pg_temp.g('i2'))) = '3', 'linha gravada mesmo com FSRS malformado';

-- ===== Segurança =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 2, false, null) = false, 'cartão de outro aluno: false';
insert into r select log_my_bank_review(999999999, 2, false, null) = false, 'cartão inexistente: false';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 2, false, null) = false, 'professora chamando: false';
reset role;
set local role anon;
insert into r select pg_temp.try('select log_my_bank_review(1, 2, false, null)') <> 'ok'
  and pg_temp.try('select get_my_pending_bank_grades(''frances'')') <> 'ok', 'anon não executa';
reset role;

-- ===== Turma: estudo em casa vira linha, mas não mexe no item nem vaza =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cA')::bigint, 3, true, jsonb_build_object('state', 'review', 'due', 1760400000000)), 'Ana (turma) registra "Fácil" em casa';
reset role;
insert into r select pg_temp.sq(format('select (fsrs is null and last_source is null and last_result is null)::text from review_bank_items where id = %L', pg_temp.g('i1'))) = 'true', 'item da turma não é alterado pelo estudo individual';
insert into r select pg_temp.sq(format('select (grade = 3 and via = ''casa'' and student_id = %L)::text from review_bank_reviews where item_id = %L', pg_temp.g('A'), pg_temp.g('i1'))) = 'true', 'linha da Ana guardada para as estatísticas';
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 0 and (select count(*) from get_my_pending_bank_grades('frances')) = 0, 'estudo da Ana em casa não vira "resposta da aula" da Bia';
reset role;

-- ===== Modo aula: nota 0..3 chega aos alunos; ack some =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into review_bank_reviews(id, item_id, teacher_id, bank_student_id, language_app_key, outcome, grade, source) values
 ('dddddddd-1120-0000-0000-000000000001', pg_temp.g('i1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'acertou', 3, 'modo_aula');
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (select count(*) = 1 and min(grade) = 3 and min(teacher_flashcard_id) = pg_temp.g('cB')::bigint from get_my_pending_bank_grades('frances')), 'Bia recebe a nota 3 da aula no cartão dela';
insert into r select (select count(*) = 1 from get_my_pending_bank_reviews('frances')), 'função antiga continua devolvendo a resposta da aula';
insert into r select ack_my_bank_reviews(array['dddddddd-1120-0000-0000-000000000001']::uuid[]) = 1, 'Bia confirma';
insert into r select (select count(*) from get_my_pending_bank_grades('frances')) = 0, 'confirmada some da lista com nota';
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_grades('frances')) = 1, 'a da Ana continua pendente';
reset role;

-- ===== Vínculo inativo =====
update teacher_students set status = 'removed' where teacher_id = pg_temp.g('T')::uuid and student_id = pg_temp.g('C')::uuid;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select log_my_bank_review(pg_temp.g('cC')::bigint, 2, false, null) = false, 'sem vínculo ativo: false';
reset role;

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 112 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
