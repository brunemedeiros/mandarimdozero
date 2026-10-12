\set ON_ERROR_STOP 0
\set QUIET on
create temp table r(name text, ok boolean, got text);
grant all on r to authenticated, anon;
create or replace function pg_temp.u(uid text, email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',email)::text, false); end $$;
-- a=autora(admin), c=gratis, d=professora nova, e=aluna da d (fr), b=aluna da a
insert into auth.users values ('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into profiles(user_id, username) values ('00000000-0000-0000-0000-00000000000e','e');
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000d','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances');
reset role;
insert into r select 'catalogo: review_bank so no teacher', (select count(*) from role_permissions where permission_key='review_bank')=5
  and (select count(*) from role_permissions where permission_key='review_bank' and enabled)=1
  and (select enabled from role_permissions where permission_key='review_bank' and role='teacher'), '';

-- professora d cria item para a aluna e
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
insert into review_bank_items(id, teacher_id, student_id, language_app_key, item_type, question, answer, wrong_form, explanation, check_note, class_date)
 values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','erro','Eu fui ao mercado','Je suis allée','Je suis allé','Concordância do particípio','conferir','2026-09-11');
insert into r select 'professora cria item', (select count(*) from review_bank_items)=1, '';
do $$ begin insert into review_bank_items(teacher_id, student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000b','frances','vocabulario','x','y');
 insert into r values ('item para aluno de outra professora bloqueado', false, 'passou'); exception when others then insert into r values ('item para aluno de outra professora bloqueado', true, sqlerrm); end $$;
do $$ begin insert into review_bank_items(teacher_id, student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','tipo_ruim','x','y');
 insert into r values ('item_type invalido bloqueado', false, 'passou'); exception when others then insert into r values ('item_type invalido bloqueado', true, sqlerrm); end $$;

-- aprovar: cria o cartão, liga ao item, usa o deck Cartões da professora; idempotente
create temp table ids(k text, v bigint); grant all on ids to authenticated;
insert into ids select 'c1', approve_review_bank_item('11111111-1111-1111-1111-111111111111','Je suis allé','Je suis allée','[{"id":"f1"}]'::jsonb,'type_answer',array['aula-2026-09-11'],'Concordância do particípio');
insert into ids select 'c2', approve_review_bank_item('11111111-1111-1111-1111-111111111111','Je suis allé','Je suis allée','[{"id":"f1"}]'::jsonb,'type_answer',array['aula-2026-09-11'],'x');
insert into r select 'aprovar 2x gera 1 cartao so', (select count(*) from teacher_flashcards where bank_item_id='11111111-1111-1111-1111-111111111111')=1 and (select count(distinct v) from ids)=1, '';
insert into r select 'cartao no deck Cartoes da professora, ativo, com observacao',
  (select d.kind='teacher_root' and d.name='Cartões da professora' and t.status='active' and t.note='Concordância do particípio' and t.card_generation_mode='type_answer' and t.tags=array['aula-2026-09-11']
     from teacher_flashcards t join decks d on d.id=t.deck_id where t.bank_item_id='11111111-1111-1111-1111-111111111111'), '';
insert into r select 'item fica aprovado e ligado', (select status='aprovado' and teacher_flashcard_id=(select v from ids limit 1) from review_bank_items), '';

-- cortar arquiva o cartão (nunca apaga); reaprovar reativa o MESMO cartão
select set_review_bank_item_status('11111111-1111-1111-1111-111111111111','cortado');
insert into r select 'cortar arquiva o cartao', (select t.status='archived' from teacher_flashcards t where t.bank_item_id='11111111-1111-1111-1111-111111111111') and (select status='cortado' from review_bank_items), '';
select set_review_bank_item_status('11111111-1111-1111-1111-111111111111','aprovado');
insert into r select 'reaprovar reativa o mesmo cartao', (select count(*)=1 and bool_and(status='active') from teacher_flashcards where bank_item_id='11111111-1111-1111-1111-111111111111'), '';
insert into review_bank_items(id, teacher_id, student_id, language_app_key, item_type, question, answer) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','vocabulario','escolher','choisir');
do $$ begin perform set_review_bank_item_status('22222222-2222-2222-2222-222222222222','aprovado');
 insert into r values ('aprovar sem cartao exige approve_review_bank_item', false, 'passou'); exception when others then insert into r values ('aprovar sem cartao exige approve_review_bank_item', sqlerrm='use_approve_review_bank_item', sqlerrm); end $$;

-- Modo aula: respostas da professora; o aluno consome
insert into review_bank_reviews(item_id, teacher_id, student_id, language_app_key, outcome, reason) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','errou','concordancia');
insert into review_bank_reviews(item_id, teacher_id, student_id, language_app_key, outcome) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','acertou');
insert into review_bank_recaps(teacher_id, student_id, language_app_key, class_date, item_ids) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','2026-09-11',array['11111111-1111-1111-1111-111111111111']::uuid[]);
insert into r select 'professora grava respostas e recap', (select count(*) from review_bank_reviews)=2 and (select count(*) from review_bank_recaps)=1, '';

-- aluna e: nao le tabelas do Banco, nao escreve; recebe so eventos de item entregue
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'aluna nao le itens (nem a observacao privada, nem recap, nem respostas)', (select count(*) from review_bank_items)=0 and (select count(*) from review_bank_recaps)=0 and (select count(*) from review_bank_reviews)=0, '';
do $$ begin insert into review_bank_reviews(item_id, teacher_id, student_id, language_app_key, outcome) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','acertou');
 insert into r values ('aluna nao forja resposta', false, 'passou'); exception when others then insert into r values ('aluna nao forja resposta', true, sqlerrm); end $$;
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('aluna nao aprova', false, 'passou'); exception when others then insert into r values ('aluna nao aprova', sqlerrm='not_authorized', sqlerrm); end $$;
create temp table pend(id uuid); grant all on pend to authenticated;
insert into pend select id from get_my_pending_bank_reviews('frances');
insert into r select 'aluna ve 1 evento pendente (so o item entregue)', (select count(*) from pend)=1, '';
-- (o item 2 ainda nao tem cartao: so aparece depois de entregue)
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
insert into r select 'outra conta nao recebe nem confirma eventos alheios', (select count(*) from get_my_pending_bank_reviews('frances'))=0 and ack_my_bank_reviews(array(select id from pend))=0, '';
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'aluna confirma o evento', ack_my_bank_reviews(array(select id from pend))=1, '';
insert into r select 'aluna nao recebe de novo', (select count(*) from get_my_pending_bank_reviews('frances'))=0, '';

-- FUROS: conta gratis e outra professora
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
do $$ begin insert into review_bank_items(teacher_id, student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000e','frances','vocabulario','x','y');
 insert into r values ('conta gratis nao cria item', false, 'passou'); exception when others then insert into r values ('conta gratis nao cria item', true, sqlerrm); end $$;
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('autora nao aprova item de outra professora', false, 'passou'); exception when others then insert into r values ('autora nao aprova item de outra professora', sqlerrm='not_authorized', sqlerrm); end $$;

-- sem a permissao (admin desliga review_bank do teacher), a professora perde acesso
select admin_set_role_permission('teacher','review_bank',false,null);
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'sem a permissao nao le o banco', (select count(*) from review_bank_items)=0, '';
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('sem a permissao nao aprova', false, 'passou'); exception when others then insert into r values ('sem a permissao nao aprova', sqlerrm='not_authorized', sqlerrm); end $$;
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_set_role_permission('teacher','review_bank',true,null);
reset role;
select count(*) filter (where ok) passed, count(*) filter (where not ok or ok is null) failed from r;
select name, got from r where not ok or ok is null;
