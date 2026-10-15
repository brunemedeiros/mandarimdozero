-- 096 (Banco de Revisão ligado a uma Turma). Transação + ROLLBACK, Postgres local (tests/banco-revisao-turmas/run.sh).
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

-- T professora (fr), T2 outra professora; A, B, C alunos de T; X sem vínculo (entra pelo link); Z aluna de T no mandarim
insert into auth.users(id, email) values
 ('95000000-0000-0000-0000-0000000000a1','t95@x.invalid'), ('95000000-0000-0000-0000-0000000000a2','t2_95@x.invalid'),
 ('95000000-0000-0000-0000-0000000000b1','a95@x.invalid'), ('95000000-0000-0000-0000-0000000000b2','b95@x.invalid'),
 ('95000000-0000-0000-0000-0000000000b3','c95@x.invalid'), ('95000000-0000-0000-0000-0000000000b5','x95@x.invalid');
insert into profiles(user_id, display_name) values
 ('95000000-0000-0000-0000-0000000000a1','Tereza'), ('95000000-0000-0000-0000-0000000000a2','Outra'),
 ('95000000-0000-0000-0000-0000000000b1','Ana'), ('95000000-0000-0000-0000-0000000000b2','Bia'),
 ('95000000-0000-0000-0000-0000000000b3','Caio'), ('95000000-0000-0000-0000-0000000000b5','Xavier')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('95000000-0000-0000-0000-0000000000a1','teacher'), ('95000000-0000-0000-0000-0000000000a2','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-0000000000b1','frances','active'),
 ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-0000000000b2','frances','active'),
 ('95000000-0000-0000-0000-0000000000a1','95000000-0000-0000-0000-0000000000b3','frances','active');
insert into v values ('T','95000000-0000-0000-0000-0000000000a1'), ('T2','95000000-0000-0000-0000-0000000000a2'),
 ('A','95000000-0000-0000-0000-0000000000b1'), ('B','95000000-0000-0000-0000-0000000000b2'),
 ('C','95000000-0000-0000-0000-0000000000b3'), ('X','95000000-0000-0000-0000-0000000000b5'),
 ('S1','bbbbbbbb-0000-0000-0000-000000000001'), ('S2','bbbbbbbb-0000-0000-0000-000000000002'),
 ('S3','bbbbbbbb-0000-0000-0000-000000000003'),
 ('i1','cccccccc-0000-0000-0000-000000000001'), ('i2','cccccccc-0000-0000-0000-000000000002'),
 ('i3','cccccccc-0000-0000-0000-000000000003'), ('i4','cccccccc-0000-0000-0000-000000000004'),
 ('i5','cccccccc-0000-0000-0000-000000000005'), ('i6','cccccccc-0000-0000-0000-000000000006');

-- ===== Situação de hoje: aluno do Banco ligado a UMA conta (Ana), 1 item já entregue =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K', mural_save_classroom('frances', null, 'Ana e Bia') ->> 'id';
insert into v select 'K2', mural_save_classroom('frances', null, 'Turma vazia') ->> 'id';
select mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A'), pg_temp.g('B')]::uuid[]);
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language) values
 (pg_temp.g('S1')::uuid, pg_temp.g('T')::uuid, 'Ana e Bia', 'frances', 'pt'),
 (pg_temp.g('S2')::uuid, pg_temp.g('T')::uuid, 'Caio sozinho', 'frances', 'pt'),
 (pg_temp.g('S3')::uuid, pg_temp.g('T')::uuid, 'Turma vazia', 'frances', 'pt');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values
 (pg_temp.g('i1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché'),
 (pg_temp.g('i2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'pão', 'le pain'),
 (pg_temp.g('i3')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', 'vocabulario', 'queijo', 'le fromage'),
 (pg_temp.g('i4')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'leite', 'le lait'),
 (pg_temp.g('i5')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'ovo', 'l''oeuf'),
 (pg_temp.g('i6')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S3')::uuid, 'frances', 'vocabulario', 'sal', 'le sel');
select link_review_bank_student(pg_temp.g('S1')::uuid, pg_temp.g('A')::uuid);
insert into v select 'cardA1', approve_review_bank_item(pg_temp.g('i1')::uuid, 'mercado', 'le marché', '[{"id":"f1"}]'::jsonb, 'normal', array['aula-2026-10-01'], 'nota')::text;
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) = 'Ana:active', 'antes: aluno ligado a uma conta gera 1 cartão (como hoje)';
-- Ana já estudou o cartão: o progresso vive no app; o que importa aqui é o cartão dela não mudar de id
update teacher_flashcards set revision = 0 where id = pg_temp.g('cardA1')::bigint;

-- ===== Ligar à turma =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select link_review_bank_classroom(pg_temp.g('S1')::uuid, pg_temp.g('K')::bigint) = 1, 'ligar à turma entrega o item já aprovado a quem não tinha (Bia: 1)';
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) = 'Ana:active,Bia:active', 'turma de 2: cada uma com a sua cópia';
insert into r select pg_temp.sq(format('select id::text from teacher_flashcards where bank_item_id = %L and student_id = %L', pg_temp.g('i1'), pg_temp.g('A'))) = pg_temp.g('cardA1'),
  'quem já tinha o cartão continua com o MESMO cartão (progresso preservado)';
insert into r select pg_temp.sq(format('select (classroom_id = %s and linked_student_id is null)::text from review_bank_students where id = %L', pg_temp.g('K'), pg_temp.g('S1'))) = 'true',
  'aluno do Banco fica ligado à turma, sem conta';
insert into r select pg_temp.sq(format($q$select (d.kind = 'teacher_root' and d.owner_id = t.student_id)::text from teacher_flashcards t join decks d on d.id = t.deck_id
  where t.bank_item_id = %L and t.student_id = %L$q$, pg_temp.g('i1'), pg_temp.g('B'))) = 'true', 'cópia da Bia no deck Cartões da professora DELA';
insert into r select pg_temp.sq(format('select fields::text || card_generation_mode || note || array_to_string(tags, '','') from teacher_flashcards where bank_item_id = %L and student_id = %L', pg_temp.g('i1'), pg_temp.g('B')))
  = '[{"id": "f1"}]normalnotaaula-2026-10-01', 'cópia com o mesmo conteúdo (campos, tipo, observação, tags)';

-- ===== Aprovar com turma =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'c2', approve_review_bank_item(pg_temp.g('i2')::uuid, 'pão', 'le pain', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null)::text;
insert into v select 'c2b', approve_review_bank_item(pg_temp.g('i2')::uuid, 'pão', 'le pain', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null)::text;
reset role;
insert into r select pg_temp.cards(pg_temp.g('i2')) = 'Ana:active,Bia:active', 'aprovar entrega uma cópia a cada membro';
insert into r select pg_temp.g('c2') = pg_temp.g('c2b'), 'aprovar 2x não duplica (mesmo cartão de referência)';
insert into r select pg_temp.sq(format('select (teacher_flashcard_id = %s and student_id is null and status = ''aprovado'')::text from review_bank_items where id = %L', pg_temp.g('c2'), pg_temp.g('i2'))) = 'true',
  'item marca o cartão de referência, sem conta única';

-- ===== Corrigir vale para todos =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select sync_review_bank_item_cards(pg_temp.g('i2')::uuid, 'pão (francês)', 'le pain', '[{"id":"f1"}]'::jsonb, 'normal', '{}', 'baguete', false) = 2, 'corrigir atualiza as 2 cópias';
reset role;
insert into r select pg_temp.sq(format('select string_agg(front || ''/'' || note || ''/'' || revision, '','') from teacher_flashcards where bank_item_id = %L', pg_temp.g('i2'))) = 'pão (francês)/baguete/0,pão (francês)/baguete/0',
  'correção chega às duas e não reinicia o progresso';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select sync_review_bank_item_cards(pg_temp.g('i2')::uuid, 'pão', 'le pain', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null, true);
reset role;
insert into r select pg_temp.sq(format('select string_agg(revision::text, '','') from teacher_flashcards where bank_item_id = %L', pg_temp.g('i2'))) = '1,1', '"mudou o sentido" reinicia nas duas';

-- ===== Cortar / reaprovar valem para todos =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select set_review_bank_item_status(pg_temp.g('i2')::uuid, 'cortado');
reset role;
insert into r select pg_temp.cards(pg_temp.g('i2')) = 'Ana:archived,Bia:archived', 'cortar arquiva as cópias de todos';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select set_review_bank_item_status(pg_temp.g('i2')::uuid, 'aprovado');
reset role;
insert into r select pg_temp.cards(pg_temp.g('i2')) = 'Ana:active,Bia:active', 'reaprovar reativa as cópias de todos';

-- ===== Modo aula: resposta vale para todos; cada um confirma a sua =====
-- Ana e Bia estão na turma desde 2 horas atrás; a resposta "antiga" é de 1 hora atrás.
update classroom_members set added_at = now() - interval '2 hours' where classroom_id = pg_temp.g('K')::bigint;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into review_bank_reviews(id, item_id, teacher_id, bank_student_id, language_app_key, outcome, source, created_at) values
 ('dddddddd-0000-0000-0000-000000000001', pg_temp.g('i1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'errou', 'modo_aula', now() - interval '1 hour'),
 ('dddddddd-0000-0000-0000-000000000002', pg_temp.g('i2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'acertou', 'importado', now() - interval '1 hour');
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select count(*) = 1 and min(teacher_flashcard_id) = pg_temp.g('cardA1')::bigint from get_my_pending_bank_reviews('frances')),
  'Ana recebe a resposta do Modo aula no cartão DELA (resposta importada não entra)';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (select count(*) = 1 and min(teacher_flashcard_id) = pg_temp.sq(format('select id::text from teacher_flashcards where bank_item_id = %L and student_id = %L', pg_temp.g('i1'), pg_temp.g('B')))::bigint
  from get_my_pending_bank_reviews('frances')), 'Bia recebe a mesma resposta no cartão DELA';
insert into r select ack_my_bank_reviews(array['dddddddd-0000-0000-0000-000000000001']::uuid[]) = 1, 'Bia confirma a resposta';
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 0, 'Bia não recebe de novo';
insert into r select pg_temp.try('select count(*) from review_bank_review_acks') <> 'ok', 'tabela de confirmações fechada para leitura direta';
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 1, 'confirmação da Bia não tira a resposta da Ana';
reset role;

-- ===== Quem entra depois: recebe todos os cartões, não as respostas antigas =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A'), pg_temp.g('B'), pg_temp.g('C')]::uuid[]);
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) = 'Ana:active,Bia:active,Caio:active' and pg_temp.cards(pg_temp.g('i2')) = 'Ana:active,Bia:active,Caio:active',
  'Caio entra pela professora e recebe todos os cartões já aprovados';
insert into r select pg_temp.cards(pg_temp.g('i4')) = '', 'item ainda pendente não vai para ninguém';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 0, 'Caio não herda a resposta de uma aula em que não estava';
reset role;
-- Xavier (sem vínculo) entra pelo link da turma: ganha o vínculo e os cartões
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'code', mural_classroom_link(pg_temp.g('K')::bigint) ->> 'code';
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (join_classroom_code(pg_temp.g('code')) ->> 'ok') = 'true', 'Xavier entra pelo link da turma';
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) = 'Ana:active,Bia:active,Caio:active,Xavier:active', 'quem entra pelo link também recebe todos os cartões';
insert into r select pg_temp.sq(format($q$select (d.kind = 'teacher_root' and t.teacher_id = %L)::text from teacher_flashcards t join decks d on d.id = t.deck_id
  where t.bank_item_id = %L and t.student_id = %L$q$, pg_temp.g('T'), pg_temp.g('i2'), pg_temp.g('X'))) = 'true', 'cartão do Xavier é da professora, no deck dele';
-- resposta nova (agora): vale para os 4
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome, source) values
 (pg_temp.g('i2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'ajuda', 'modo_aula');
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 1, 'resposta da aula de hoje chega a quem entrou depois';
reset role;

-- ===== Quem sai fica com o que recebeu; não recebe os novos =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A'), pg_temp.g('C'), pg_temp.g('X')]::uuid[]);
select approve_review_bank_item(pg_temp.g('i4')::uuid, 'leite', 'le lait', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) like '%Bia:active%', 'Bia saiu da turma e continua com os cartões';
insert into r select pg_temp.cards(pg_temp.g('i4')) = 'Ana:active,Caio:active,Xavier:active', 'Bia não recebe os itens novos';
-- Caio perde o vínculo: sai da turma (087), fica com os cartões, não recebe os novos
update teacher_students set status = 'removed' where teacher_id = pg_temp.g('T')::uuid and student_id = pg_temp.g('C')::uuid;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select approve_review_bank_item(pg_temp.g('i5')::uuid, 'ovo', 'l''oeuf', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
reset role;
insert into r select pg_temp.cards(pg_temp.g('i1')) like '%Caio:active%' and pg_temp.cards(pg_temp.g('i5')) = 'Ana:active,Xavier:active',
  'quem perde o vínculo fica com os cartões e não recebe os novos';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 0, 'sem vínculo não recebe respostas do Modo aula';
reset role;

-- ===== Conta única continua igual =====
update teacher_students set status = 'active' where teacher_id = pg_temp.g('T')::uuid and student_id = pg_temp.g('C')::uuid;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select link_review_bank_student(pg_temp.g('S2')::uuid, pg_temp.g('C')::uuid);
select approve_review_bank_item(pg_temp.g('i3')::uuid, 'queijo', 'le fromage', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
insert into review_bank_reviews(id, item_id, teacher_id, student_id, bank_student_id, language_app_key, outcome, source) values
 ('dddddddd-0000-0000-0000-000000000003', pg_temp.g('i3')::uuid, pg_temp.g('T')::uuid, pg_temp.g('C')::uuid, pg_temp.g('S2')::uuid, 'frances', 'acertou', 'modo_aula');
reset role;
insert into r select pg_temp.cards(pg_temp.g('i3')) = 'Caio:active', 'aluno de conta única: 1 cartão, como antes';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (select count(*) from get_my_pending_bank_reviews('frances')) = 1, 'conta única recebe a resposta do Modo aula';
insert into r select ack_my_bank_reviews(array['dddddddd-0000-0000-0000-000000000003']::uuid[]) = 1, 'conta única confirma';
reset role;
insert into r select pg_temp.sq('select (applied_at is not null)::text from review_bank_reviews where id = ''dddddddd-0000-0000-0000-000000000003''') = 'true', 'conta única: resposta marcada como aplicada (como antes)';

-- ===== Turma vazia, segurança =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
select link_review_bank_classroom(pg_temp.g('S3')::uuid, pg_temp.g('K2')::bigint);
insert into r select pg_temp.try(format('select approve_review_bank_item(%L, ''sal'', ''le sel'', ''[{"id":"f1"}]''::jsonb, ''normal'', ''{}'', null)', pg_temp.g('i6'))) = 'no_recipients', 'turma vazia: aprovar avisa que não há para quem entregar';
insert into r select pg_temp.try(format('update review_bank_students set linked_student_id = %L where id = %L', pg_temp.g('A'), pg_temp.g('S1'))) <> 'ok', 'não dá para ligar a uma conta E a uma turma ao mesmo tempo';
reset role;
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into v select 'KT2', mural_save_classroom('frances', null, 'Turma da outra') ->> 'id';
insert into r select pg_temp.try(format('select link_review_bank_classroom(%L, %s)', pg_temp.g('S1'), pg_temp.g('KT2'))) = 'not_authorized', 'outra professora não liga o aluno do Banco dela';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select link_review_bank_classroom(%L, %s)', pg_temp.g('S3'), pg_temp.g('KT2'))) = 'classroom_invalid', 'não liga a turma de outra professora';
insert into v select 'KZH', mural_save_classroom('mandarim', null, 'Mandarim') ->> 'id';
insert into r select pg_temp.try(format('select link_review_bank_classroom(%L, %s)', pg_temp.g('S3'), pg_temp.g('KZH'))) = 'classroom_invalid', 'não liga a turma de outro idioma';
insert into r select pg_temp.try(format('update review_bank_students set classroom_id = %s where id = %L', pg_temp.g('KT2'), pg_temp.g('S3'))) <> 'ok', 'escrita direta também não aceita turma de outra professora';
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select pg_temp.try(format('select link_review_bank_classroom(%L, %s)', pg_temp.g('S1'), pg_temp.g('K'))) = 'not_authorized', 'aluno não liga nada';
insert into r select pg_temp.try(format('select sync_review_bank_item_cards(%L, ''x'', ''y'', ''[]''::jsonb, ''normal'', ''{}'', null, false)', pg_temp.g('i1'))) = 'not_authorized', 'aluno não corrige cartões';
reset role;
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into r select pg_temp.try(format('select sync_review_bank_item_cards(%L, ''x'', ''y'', ''[]''::jsonb, ''normal'', ''{}'', null, false)', pg_temp.g('i1'))) = 'not_authorized', 'outra professora não corrige cartões';
reset role;
set local role anon;
insert into r select pg_temp.try('select get_my_pending_bank_reviews(''frances'')') <> 'ok' and pg_temp.try(format('select link_review_bank_classroom(%L, 1)', pg_temp.g('S1'))) <> 'ok', 'anon não executa';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select _rb_backfill_student(%L, %L)', pg_temp.g('S1'), pg_temp.g('T'))) <> 'ok', 'funções internas fechadas';
reset role;
insert into r select pg_temp.sq('select count(*)::text from (select bank_item_id, student_id from teacher_flashcards where bank_item_id is not null group by 1, 2 having count(*) > 1) d') = '0', 'nunca 2 cartões do mesmo item para o mesmo aluno';
insert into r select pg_temp.sq('select count(*)::text from pg_indexes where indexname = ''teacher_flashcards_bank_item_uidx''') = '0', 'índice antigo (1 cartão por item) removido';

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 096 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
