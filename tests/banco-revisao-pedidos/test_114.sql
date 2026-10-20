-- 114 (pedidos da aluna). Transação + ROLLBACK, Postgres local.
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
 ('97000000-0000-0000-0000-0000000000a1','t114@x.invalid'),
 ('97000000-0000-0000-0000-0000000000b1','a114@x.invalid'), ('97000000-0000-0000-0000-0000000000b2','b114@x.invalid'),
 ('97000000-0000-0000-0000-0000000000b3','c114@x.invalid');
insert into profiles(user_id, display_name) values
 ('97000000-0000-0000-0000-0000000000a1','Tereza'), ('97000000-0000-0000-0000-0000000000b1','Ana'),
 ('97000000-0000-0000-0000-0000000000b2','Bia'), ('97000000-0000-0000-0000-0000000000b3','Caio')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('97000000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000b1','frances','active'),
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000b2','frances','active'),
 ('97000000-0000-0000-0000-0000000000a1','97000000-0000-0000-0000-0000000000b3','frances','active');
insert into v values ('T','97000000-0000-0000-0000-0000000000a1'), ('A','97000000-0000-0000-0000-0000000000b1'),
 ('B','97000000-0000-0000-0000-0000000000b2'), ('C','97000000-0000-0000-0000-0000000000b3'),
 ('S1','bbbbbbbb-1140-0000-0000-000000000001'), ('S2','bbbbbbbb-1140-0000-0000-000000000002'),
 ('i1','cccccccc-1140-0000-0000-000000000001'), ('i2','cccccccc-1140-0000-0000-000000000002'),
 ('i3','cccccccc-1140-0000-0000-000000000003');

select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K', mural_save_classroom('frances', null, 'Ana e Bia') ->> 'id';
select mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A'), pg_temp.g('B')]::uuid[]);
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language) values
 (pg_temp.g('S1')::uuid, pg_temp.g('T')::uuid, 'Ana e Bia', 'frances', 'pt'),
 (pg_temp.g('S2')::uuid, pg_temp.g('T')::uuid, 'Caio sozinho', 'frances', 'pt');
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values
 (pg_temp.g('i1')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'mercado', 'le marché'),
 (pg_temp.g('i3')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S1')::uuid, 'frances', 'vocabulario', 'pão', 'le pain'),
 (pg_temp.g('i2')::uuid, pg_temp.g('T')::uuid, pg_temp.g('S2')::uuid, 'frances', 'vocabulario', 'queijo', 'le fromage');
select link_review_bank_classroom(pg_temp.g('S1')::uuid, pg_temp.g('K')::bigint);
select link_review_bank_student(pg_temp.g('S2')::uuid, pg_temp.g('C')::uuid);
select approve_review_bank_item(pg_temp.g('i1')::uuid, 'mercado', 'le marché', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
select approve_review_bank_item(pg_temp.g('i3')::uuid, 'pão', 'le pain', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
select approve_review_bank_item(pg_temp.g('i2')::uuid, 'queijo', 'le fromage', '[{"id":"f1"}]'::jsonb, 'normal', '{}', null);
reset role;
insert into v select 'cA', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i1')::uuid and student_id = pg_temp.g('A')::uuid;
insert into v select 'cB', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i1')::uuid and student_id = pg_temp.g('B')::uuid;
insert into v select 'cA3', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i3')::uuid and student_id = pg_temp.g('A')::uuid;
insert into v select 'cC', id::text from teacher_flashcards where bank_item_id = pg_temp.g('i2')::uuid and student_id = pg_temp.g('C')::uuid;

-- ===== Ana pede corte: só o cartão dela pausa =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'rA', request_bank_item_change(pg_temp.g('cA')::bigint, 'cortar', null, 'repetido')::text;
insert into r select pg_temp.g('rA') is not null, 'Ana pede corte do mercado';
reset role;
insert into r select pg_temp.sq(format('select status from teacher_flashcards where id = %s', pg_temp.g('cA'))) = 'archived', 'cartão da Ana pausa';
insert into r select pg_temp.sq(format('select status from teacher_flashcards where id = %s', pg_temp.g('cB'))) = 'active', 'cartão da Bia continua ativo';
insert into r select pg_temp.sq(format('select status from review_bank_items where id = %L', pg_temp.g('i1'))) = 'aprovado', 'item continua aprovado (sem corte individual)';

-- pedido repetido atualiza o mesmo (1 aberto por item e aluna); "corrigir" não pausa e devolve o cartão
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
select request_bank_item_change(pg_temp.g('cA')::bigint, 'corrigir', '{"answer":"le marché ","lixo":"x"}'::jsonb, null);
reset role;
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_requests where item_id = %L', pg_temp.g('i1'))) = '1', 'pedido repetido não duplica';
insert into r select pg_temp.sq(format('select (kind = ''corrigir'' and proposal ->> ''answer'' = ''le marché'' and not (proposal ? ''lixo''))::text from review_bank_requests where id = %L', pg_temp.g('rA'))) = 'true', 'vira correção, só campos conhecidos';
insert into r select pg_temp.sq(format('select status from teacher_flashcards where id = %s', pg_temp.g('cA'))) = 'active', 'correção devolve o cartão da Ana';

-- Bia também pede corte; a professora corta uma vez e vale para todos
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
select request_bank_item_change(pg_temp.g('cB')::bigint, 'errado', null, null);
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (select count(*) from review_bank_requests where status = 'pendente') = 2, 'professora vê os 2 pedidos abertos';
insert into r select decide_bank_request(pg_temp.g('rA')::uuid, 'cortar') = 'aprovado', 'professora aprova o corte';
reset role;
insert into r select pg_temp.sq(format('select status from review_bank_items where id = %L', pg_temp.g('i1'))) = 'cortado', 'item cortado';
insert into r select pg_temp.sq(format('select count(*)::text from teacher_flashcards where bank_item_id = %L and status = ''active''', pg_temp.g('i1'))) = '0', 'cartões de todos arquivados';
insert into r select pg_temp.sq(format('select count(*)::text from review_bank_requests where item_id = %L and status = ''pendente''', pg_temp.g('i1'))) = '0', 'pedidos do item resolvidos junto';

-- ===== Recusar / manter devolve o cartão =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'rA3', request_bank_item_change(pg_temp.g('cA3')::bigint, 'errado', null, 'acho que é "le pain" sem artigo')::text;
reset role;
insert into r select pg_temp.sq(format('select status from teacher_flashcards where id = %s', pg_temp.g('cA3'))) = 'archived', 'errado pausa o cartão da Ana';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select decide_bank_request(pg_temp.g('rA3')::uuid, 'recusar') = 'mantido', '"parece errado" recusado vira mantido';
insert into r select decide_bank_request(pg_temp.g('rA3')::uuid, 'cortar') = 'mantido', 'decidir de novo não muda nada';
reset role;
insert into r select pg_temp.sq(format('select status from teacher_flashcards where id = %s', pg_temp.g('cA3'))) = 'active', 'cartão da Ana volta';
insert into r select pg_temp.sq(format('select status from review_bank_items where id = %L', pg_temp.g('i3'))) = 'aprovado', 'item continua aprovado';

-- ===== Conta individual: resolver =====
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into v select 'rC', request_bank_item_change(pg_temp.g('cC')::bigint, 'corrigir', '{"question":"le fromage?"}'::jsonb, null)::text;
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select decide_bank_request(pg_temp.g('rC')::uuid, 'resolver') = 'aprovado', 'correção aplicada marca o pedido como aprovado';
reset role;

-- ===== Segurança =====
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select pg_temp.try(format('select request_bank_item_change(%s, ''cortar'', null, null)', pg_temp.g('cC'))) = 'not_authorized', 'aluna não pede pelo cartão de outra';
insert into r select pg_temp.try(format('select request_bank_item_change(%s, ''cortar'', null, null)', pg_temp.g('cB'))) = 'not_authorized', 'item já cortado não aceita pedido';
insert into r select pg_temp.try(format('select request_bank_item_change(%s, ''apagar'', null, null)', pg_temp.g('cA3'))) = 'kind_invalido', 'tipo inválido';
insert into r select pg_temp.try(format('select decide_bank_request(%L, ''cortar'')', pg_temp.g('rC'))) = 'not_authorized', 'aluna não decide';
insert into r select (select count(*) from review_bank_requests) = 0, 'aluna não lê a tabela de pedidos';
insert into r select pg_temp.try('insert into review_bank_requests(item_id,teacher_id,requester_id,bank_student_id,kind) select item_id,teacher_id,requester_id,bank_student_id,kind from review_bank_requests') <> 'ok', 'aluna não escreve direto';
reset role;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select pg_temp.try(format('select decide_bank_request(%L, ''cortar'')', pg_temp.g('rC'))) = 'not_authorized', 'outra aluna também não decide';
reset role;
select pg_temp.as_user(null); set local role anon;
insert into r select pg_temp.try('select request_bank_item_change(1, ''cortar'', null, null)') like '%permission denied%', 'anon sem execute';
reset role;
update teacher_students set status = 'removed' where teacher_id = pg_temp.g('T')::uuid and student_id = pg_temp.g('A')::uuid;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select pg_temp.try(format('select request_bank_item_change(%s, ''errado'', null, null)', pg_temp.g('cA3'))) = 'not_authorized', 'sem vínculo ativo não pede';
reset role;

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 114 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
