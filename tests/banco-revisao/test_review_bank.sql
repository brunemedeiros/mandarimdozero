\set ON_ERROR_STOP 0
\set QUIET on
create temp table r(name text, ok boolean, got text);
grant all on r to authenticated, anon;
create or replace function pg_temp.u(uid text, email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',email)::text, false); end $$;
-- a=autora(admin+prof), b=aluna da a, c=gratis, d=professora nova, e=aluna da d (fr)
insert into auth.users values ('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into profiles(user_id, username) values ('00000000-0000-0000-0000-00000000000e','e');
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000d','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances');
reset role;
insert into r select 'catalogo: review_bank so no teacher', (select count(*) from role_permissions where permission_key='review_bank')=5
  and (select count(*) from role_permissions where permission_key='review_bank' and enabled)=1, '';

select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
-- lista do Banco: aluna SEM conta e aluna da conta e (ainda nao vinculada)
insert into review_bank_students(id, teacher_id, name, language_app_key, reference_language, import_key) values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d','Sem Conta','portugues','en','semconta'),
 ('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000d','Aluna E','frances','pt','alunae');
insert into r select 'professora cria alunos do Banco (com e sem conta)', (select count(*) from review_bank_students)=2, '';
do $$ begin insert into review_bank_students(teacher_id, name, language_app_key, import_key) values ('00000000-0000-0000-0000-00000000000d','Dup','frances','alunae');
 insert into r values ('import_key duplicado bloqueado', false, 'passou'); exception when others then insert into r values ('import_key duplicado bloqueado', true, sqlerrm); end $$;
do $$ begin insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id) values ('00000000-0000-0000-0000-00000000000d','Falsa','frances','00000000-0000-0000-0000-00000000000b');
 insert into r values ('nao cria aluno ligado a conta sem vinculo ativo', false, 'passou'); exception when others then insert into r values ('nao cria aluno ligado a conta sem vinculo ativo', true, sqlerrm); end $$;

-- itens para aluno SEM conta funcionam; para conta nao vinculada tambem
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer, wrong_form, explanation, check_note, class_date)
 values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','erro','Eu fui ao mercado','Je suis allée','Je suis allé','Concordância do particípio','conferir','2026-09-11'),
        ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000001','portugues','vocabulario','to run (code)','rodar',null,'Nesse momento, a IA está rodando.',null,'2026-10-07');
insert into r select 'itens para aluno sem conta e para aluno nao vinculado', (select count(*) from review_bank_items)=2, '';
do $$ begin insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','portugues','vocabulario','x','y');
 insert into r values ('idioma do item precisa bater com o do aluno', false, 'passou'); exception when others then insert into r values ('idioma do item precisa bater com o do aluno', true, sqlerrm); end $$;
do $$ begin insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','tipo_ruim','x','y');
 insert into r values ('item_type invalido bloqueado', false, 'passou'); exception when others then insert into r values ('item_type invalido bloqueado', true, sqlerrm); end $$;

-- sem vinculo nao gera cartao; aprovar so marca
do $$ begin perform approve_review_bank_item('11111111-1111-1111-1111-111111111111','a','b','[{"id":"f1"}]'::jsonb,'type_answer',array['t'],'n');
 insert into r values ('aprovar sem conta vinculada nao gera cartao', false, 'passou'); exception when others then insert into r values ('aprovar sem conta vinculada nao gera cartao', sqlerrm='student_not_linked', sqlerrm); end $$;
select set_review_bank_item_status('33333333-3333-3333-3333-333333333333','aprovado');
insert into r select 'aluno sem conta: aprovar marca o item, sem cartao', (select status='aprovado' and teacher_flashcard_id is null from review_bank_items where id='33333333-3333-3333-3333-333333333333') and (select count(*) from teacher_flashcards)=0, '';

-- vincular: so com vinculo ativo no mesmo idioma
do $$ begin perform link_review_bank_student('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000e');
 insert into r values ('vincular exige vinculo ativo no idioma do aluno do Banco', false, 'passou'); exception when others then insert into r values ('vincular exige vinculo ativo no idioma do aluno do Banco', sqlerrm='link_inactive', sqlerrm); end $$;
select link_review_bank_student('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000e');
insert into r select 'vincular grava a conta no aluno do Banco', (select linked_student_id='00000000-0000-0000-0000-00000000000e' from review_bank_students where id='aaaaaaaa-0000-0000-0000-000000000002'), '';
do $$ begin insert into review_bank_students(teacher_id, name, language_app_key, linked_student_id) values ('00000000-0000-0000-0000-00000000000d','Outra E','frances','00000000-0000-0000-0000-00000000000e');
 insert into r values ('mesma conta nao liga a 2 alunos do Banco no idioma', false, 'passou'); exception when others then insert into r values ('mesma conta nao liga a 2 alunos do Banco no idioma', true, sqlerrm); end $$;

-- aprovar agora: cria o cartao no deck Cartoes da professora, idempotente
create temp table ids(k text, v bigint); grant all on ids to authenticated;
insert into ids select 'c1', approve_review_bank_item('11111111-1111-1111-1111-111111111111','Je suis allé','Je suis allée','[{"id":"f1"}]'::jsonb,'type_answer',array['aula-2026-09-11'],'Concordância do particípio');
insert into ids select 'c2', approve_review_bank_item('11111111-1111-1111-1111-111111111111','Je suis allé','Je suis allée','[{"id":"f1"}]'::jsonb,'type_answer',array['aula-2026-09-11'],'x');
insert into r select 'aprovar 2x gera 1 cartao so', (select count(*) from teacher_flashcards where bank_item_id='11111111-1111-1111-1111-111111111111')=1 and (select count(distinct v) from ids)=1, '';
insert into r select 'cartao no deck Cartoes da professora, ativo, com observacao, para a conta vinculada',
  (select d.kind='teacher_root' and d.name='Cartões da professora' and t.status='active' and t.note='Concordância do particípio' and t.student_id='00000000-0000-0000-0000-00000000000e' and t.language_app_key='frances'
     from teacher_flashcards t join decks d on d.id=t.deck_id where t.bank_item_id='11111111-1111-1111-1111-111111111111'), '';

-- cortar arquiva (nunca apaga); reaprovar reativa o mesmo cartao; aluno vinculado: aprovar sem cartao exige approve
select set_review_bank_item_status('11111111-1111-1111-1111-111111111111','cortado');
insert into r select 'cortar arquiva o cartao', (select t.status='archived' from teacher_flashcards t where t.bank_item_id='11111111-1111-1111-1111-111111111111') and (select status='cortado' from review_bank_items where id='11111111-1111-1111-1111-111111111111'), '';
select set_review_bank_item_status('11111111-1111-1111-1111-111111111111','aprovado');
insert into r select 'reaprovar reativa o mesmo cartao', (select count(*)=1 and bool_and(status='active') from teacher_flashcards where bank_item_id='11111111-1111-1111-1111-111111111111'), '';
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','vocabulario','escolher','choisir');
do $$ begin perform set_review_bank_item_status('22222222-2222-2222-2222-222222222222','aprovado');
 insert into r values ('aluno vinculado: aprovar sem cartao exige approve', false, 'passou'); exception when others then insert into r values ('aluno vinculado: aprovar sem cartao exige approve', sqlerrm='use_approve_review_bank_item', sqlerrm); end $$;

-- Modo aula: respostas; a aluna consome so o que virou cartao
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome, reason) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','errou','concordancia');
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','acertou');
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome) values ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000001','portugues','acertou');
insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date, item_ids) values ('00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','2026-09-11',array['11111111-1111-1111-1111-111111111111']::uuid[]);
do $$ begin insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date) values ('00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','2026-09-11');
 insert into r values ('1 recap por aluno e aula', false, 'passou'); exception when others then insert into r values ('1 recap por aluno e aula', true, sqlerrm); end $$;
insert into review_bank_settings(teacher_id, auto_generate, manual_markdown) values ('00000000-0000-0000-0000-00000000000d', true, '# Manual');
insert into r select 'professora grava respostas (inclusive de aluno sem conta), recap e manual', (select count(*) from review_bank_reviews)=3 and (select count(*) from review_bank_recaps)=1 and (select count(*) from review_bank_settings)=1, '';

-- 083: agendamento do Récap e modo da resposta
update review_bank_items set level = 2, due_date = '2026-10-20', last_result = 'acertou', last_review_date = '2026-10-12' where id = '11111111-1111-1111-1111-111111111111';
insert into r select 'item guarda nivel, proxima data e ultimo resultado', (select level=2 and due_date='2026-10-20' and last_result='acertou' from review_bank_items where id='11111111-1111-1111-1111-111111111111'), '';
do $$ begin update review_bank_items set last_result = 'talvez' where id = '11111111-1111-1111-1111-111111111111';
 insert into r values ('ultimo resultado invalido bloqueado', false, 'passou'); exception when others then insert into r values ('ultimo resultado invalido bloqueado', true, sqlerrm); end $$;
update review_bank_reviews set mode = 'recap' where outcome = 'errou';
do $$ begin update review_bank_reviews set mode = 'prova' where outcome = 'errou';
 insert into r values ('modo de resposta invalido bloqueado', false, 'passou'); exception when others then insert into r values ('modo de resposta invalido bloqueado', true, sqlerrm); end $$;
insert into r select 'resposta guarda modo e data', (select count(*)=1 from review_bank_reviews where mode='recap' and review_date is not null), '';

-- 085: marca de sensível
update review_bank_items set sensitive = true where id = '22222222-2222-2222-2222-222222222222';
insert into r select 'item guarda a marca de sensivel (padrao falso)', (select sensitive from review_bank_items where id='22222222-2222-2222-2222-222222222222') and (select not sensitive from review_bank_items where id='11111111-1111-1111-1111-111111111111'), '';
update review_bank_items set sensitive = false where id = '22222222-2222-2222-2222-222222222222';

-- 084: o upsert da importação (ON CONFLICT nas colunas de import_key) funciona e não duplica nem sobrescreve
insert into review_bank_students(teacher_id, name, language_app_key, import_key) values ('00000000-0000-0000-0000-00000000000d','Importada','portugues','imp1') on conflict (teacher_id, import_key) do nothing;
insert into review_bank_students(teacher_id, name, language_app_key, import_key) values ('00000000-0000-0000-0000-00000000000d','Outro nome','portugues','imp1') on conflict (teacher_id, import_key) do nothing;
insert into r select 'importar aluno 2x nao duplica nem sobrescreve', (select count(*)=1 and min(name)='Importada' from review_bank_students where import_key='imp1'), '';
insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', 'vocabulario', 'q', 'a', 'i001' from review_bank_students where import_key='imp1' on conflict (bank_student_id, import_key) do nothing;
insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer, import_key) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', 'vocabulario', 'q2', 'a2', 'i001' from review_bank_students where import_key='imp1' on conflict (bank_student_id, import_key) do nothing;
insert into r select 'importar item 2x nao duplica nem sobrescreve', (select count(*)=1 and min(question)='q' from review_bank_items where import_key='i001'), '';
insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', 'vocabulario', 'a', 'b' from review_bank_students where import_key='imp1';
insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', 'vocabulario', 'c', 'd' from review_bank_students where import_key='imp1';
insert into r select 'itens criados a mao (sem import_key) nao colidem entre si', (select count(*)=3 from review_bank_items where bank_student_id=(select id from review_bank_students where import_key='imp1')), '';
insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date, item_ids) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', '2026-10-09', '{}' from review_bank_students where import_key='imp1' on conflict (bank_student_id, class_date) do nothing;
insert into review_bank_recaps(teacher_id, bank_student_id, language_app_key, class_date, item_ids) select '00000000-0000-0000-0000-00000000000d', id, 'portugues', '2026-10-09', '{}' from review_bank_students where import_key='imp1' on conflict (bank_student_id, class_date) do nothing;
insert into r select 'importar recap 2x nao duplica', (select count(*)=1 from review_bank_recaps where bank_student_id=(select id from review_bank_students where import_key='imp1')), '';
insert into review_bank_reviews(item_id, teacher_id, bank_student_id, language_app_key, outcome, source, applied_at) select i.id, i.teacher_id, i.bank_student_id, i.language_app_key, 'errou', 'importado', now() from review_bank_items i where import_key='i001';
delete from review_bank_reviews where bank_student_id=(select id from review_bank_students where import_key='imp1') and source='importado';
insert into r select 'respostas importadas podem ser apagadas e regravadas', (select count(*)=0 from review_bank_reviews where source='importado'), '';
insert into r select 'respostas importadas nao chegam ao aluno como pendentes', (select count(*)=0 from review_bank_reviews where source='importado' and applied_at is null), '';

select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'aluna nao le nada do Banco (itens, recaps, respostas, alunos, config)',
  (select count(*) from review_bank_items)=0 and (select count(*) from review_bank_recaps)=0 and (select count(*) from review_bank_reviews)=0
  and (select count(*) from review_bank_students)=0 and (select count(*) from review_bank_settings)=0, '';
do $$ begin update review_bank_students set linked_student_id = null;
 insert into r values ('aluna nao mexe no vinculo', (select count(*) from review_bank_students)=0, 'sem erro mas 0 linhas'); exception when others then insert into r values ('aluna nao mexe no vinculo', true, sqlerrm); end $$;
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('aluna nao aprova', false, 'passou'); exception when others then insert into r values ('aluna nao aprova', sqlerrm='not_authorized', sqlerrm); end $$;
create temp table pend(id uuid); grant all on pend to authenticated;
insert into pend select id from get_my_pending_bank_reviews('frances');
insert into r select 'aluna ve 1 evento pendente (so o item que virou cartao, no idioma dela)', (select count(*) from pend)=1 and (select count(*) from get_my_pending_bank_reviews('portugues'))=0, '';
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
insert into r select 'outra conta nao recebe nem confirma eventos alheios', (select count(*) from get_my_pending_bank_reviews('frances'))=0 and ack_my_bank_reviews(array(select id from pend))=0, '';
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'aluna confirma o evento', ack_my_bank_reviews(array(select id from pend))=1, '';
insert into r select 'aluna nao recebe de novo', (select count(*) from get_my_pending_bank_reviews('frances'))=0, '';

-- desvincular: o cartao e o progresso ficam; novos eventos deixam de chegar
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
select unlink_review_bank_student('aaaaaaaa-0000-0000-0000-000000000002');
insert into r select 'desvincular mantem o cartao entregue', (select count(*)=1 from teacher_flashcards where bank_item_id='11111111-1111-1111-1111-111111111111'), '';
select link_review_bank_student('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000e');

-- FUROS: conta gratis e outra professora
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
do $$ begin insert into review_bank_students(teacher_id, name, language_app_key) values ('00000000-0000-0000-0000-00000000000c','x','frances');
 insert into r values ('conta gratis nao cria aluno do Banco', false, 'passou'); exception when others then insert into r values ('conta gratis nao cria aluno do Banco', true, sqlerrm); end $$;
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('autora nao aprova item de outra professora', false, 'passou'); exception when others then insert into r values ('autora nao aprova item de outra professora', sqlerrm='not_authorized', sqlerrm); end $$;
do $$ begin perform link_review_bank_student('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b');
 insert into r values ('autora nao vincula aluno de outra professora', false, 'passou'); exception when others then insert into r values ('autora nao vincula aluno de outra professora', sqlerrm='not_authorized', sqlerrm); end $$;
do $$ begin insert into review_bank_items(teacher_id, bank_student_id, language_app_key, item_type, question, answer) values ('00000000-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-000000000002','frances','vocabulario','x','y');
 insert into r values ('autora nao cria item no aluno de outra professora', false, 'passou'); exception when others then insert into r values ('autora nao cria item no aluno de outra professora', true, sqlerrm); end $$;

-- sem a permissao, a professora perde acesso
select admin_set_role_permission('teacher','review_bank',false,null);
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'sem a permissao nao le o banco', (select count(*) from review_bank_items)=0 and (select count(*) from review_bank_students)=0, '';
do $$ begin perform approve_review_bank_item('22222222-2222-2222-2222-222222222222','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('sem a permissao nao aprova', false, 'passou'); exception when others then insert into r values ('sem a permissao nao aprova', sqlerrm='not_authorized', sqlerrm); end $$;
reset role; select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_set_role_permission('teacher','review_bank',true,null);
reset role;

-- ---------- 089: rotina automática (Edge Function com service role) ----------
grant all on r to service_role;
reset role;
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values
 ('bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','vocabulario','the door','la porte'),
 ('bbbbbbbb-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000001','portugues','vocabulario','traffic','o trânsito');
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000001','a','b','[{"id":"f1"}]'::jsonb,'normal',array['t'],'n');
 insert into r values ('089: professora logada NAO executa a funcao da rotina', false, 'passou'); exception when others then insert into r values ('089: professora logada NAO executa a funcao da rotina', sqlstate='42501', sqlerrm); end $$;
reset role; set role anon;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000001','a','b','[{"id":"f1"}]'::jsonb,'normal',array['t'],'n');
 insert into r values ('089: anon NAO executa a funcao da rotina', false, 'passou'); exception when others then insert into r values ('089: anon NAO executa a funcao da rotina', sqlstate='42501', sqlerrm); end $$;
reset role;
select set_config('request.jwt.claims', '', false);  -- service_role de verdade chega SEM claims (o teste antigo herdava as da professora)
set role service_role;
create temp table card_ids(n int, id bigint); grant all on card_ids to service_role;
insert into card_ids select 1, agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000001','the door','la porte','[{"id":"f1","role":null}]'::jsonb,'normal',array['banco-de-revisao'],'Fem.');
insert into card_ids select 2, agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000001','OUTRO','OUTRO','[]'::jsonb,'normal',null,null);
reset role;
insert into r select '089: rotina gera o cartao da aluna vinculada, no deck da professora, ligado ao item',
  (select count(*) from teacher_flashcards where bank_item_id='bbbbbbbb-0000-0000-0000-000000000001')=1
  and (select student_id='00000000-0000-0000-0000-00000000000e' and teacher_id='00000000-0000-0000-0000-00000000000d' and note='Fem.' and deck_id is not null and status='active' from teacher_flashcards where bank_item_id='bbbbbbbb-0000-0000-0000-000000000001')
  and (select status='aprovado' and teacher_flashcard_id is not null from review_bank_items where id='bbbbbbbb-0000-0000-0000-000000000001'), '';
insert into r select '089: repetir nao cria segundo cartao (idempotente, mesmo id)', (select count(distinct id) from card_ids)=1 and (select count(*) from teacher_flashcards where bank_item_id='bbbbbbbb-0000-0000-0000-000000000001')=1, '';
set role service_role;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000002','a','b','[{"id":"f1"}]'::jsonb,'normal',null,null);
 insert into r values ('089: aluno sem conta nao gera cartao pela rotina', false, 'passou'); exception when others then insert into r values ('089: aluno sem conta nao gera cartao pela rotina', sqlerrm='student_not_linked', sqlerrm); end $$;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-000000000001','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('089: conta sem permissao/papel nao usa a rotina', false, 'passou'); exception when others then insert into r values ('089: conta sem permissao/papel nao usa a rotina', sqlerrm='not_authorized', sqlerrm); end $$;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-000000000002','a','b','[]'::jsonb,'normal',null,null);
 insert into r values ('089: professora errada (item de outra) nao aprova', false, 'passou'); exception when others then insert into r values ('089: professora errada (item de outra) nao aprova', sqlerrm='not_authorized', sqlerrm); end $$;
reset role;
-- vinculo encerrado: a rotina nao entrega
update teacher_students set status='inactive' where teacher_id='00000000-0000-0000-0000-00000000000d' and student_id='00000000-0000-0000-0000-00000000000e';
insert into review_bank_items(id, teacher_id, bank_student_id, language_app_key, item_type, question, answer) values ('bbbbbbbb-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000d','aaaaaaaa-0000-0000-0000-000000000002','frances','vocabulario','window','la fenetre');
set role service_role;
do $$ begin perform agent_approve_review_bank_item('00000000-0000-0000-0000-00000000000d','bbbbbbbb-0000-0000-0000-000000000003','a','b','[{"id":"f1"}]'::jsonb,'normal',null,null);
 insert into r values ('089: vinculo encerrado nao recebe cartao da rotina', false, 'passou'); exception when others then insert into r values ('089: vinculo encerrado nao recebe cartao da rotina', sqlerrm='link_inactive', sqlerrm); end $$;
reset role;
update teacher_students set status='active' where teacher_id='00000000-0000-0000-0000-00000000000d' and student_id='00000000-0000-0000-0000-00000000000e';
-- agent_managed e registro das rodadas
insert into r select '089: agent_managed nasce desligado (aluno e do artifact ate migrar)', (select bool_and(agent_managed = false) from review_bank_students), '';
insert into review_bank_agent_runs(teacher_id, summary) values ('00000000-0000-0000-0000-00000000000d','{"ok":true}'),('00000000-0000-0000-0000-00000000000a','{"ok":true}');
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
insert into r select '089: professora le so as rodadas dela', (select count(*) from review_bank_agent_runs)=1, '';
do $$ begin insert into review_bank_agent_runs(teacher_id, summary) values ('00000000-0000-0000-0000-00000000000d','{}');
 insert into r values ('089: professora nao grava rodada (so a funcao)', false, 'passou'); exception when others then insert into r values ('089: professora nao grava rodada (so a funcao)', true, sqlerrm); end $$;
reset role;

-- ---------- 097: caixa de entrada (plano B: a tarefa fala só com o conector do Supabase) ----------
reset role;
select set_config('request.jwt.claims', '', false);
update review_bank_students set agent_managed = true where id = 'aaaaaaaa-0000-0000-0000-000000000002';
insert into vault.decrypted_secrets(name, decrypted_secret) values
  ('rb_agent_teacher','00000000-0000-0000-0000-00000000000d'), ('rb_agent_url','https://projeto.test/functions/v1/review-bank-agent'),
  ('rb_agent_anon','anon-jwt-publico'), ('rb_agent_token','token-secreto-de-teste-1234567890') on conflict (name) do nothing;
insert into r select '097: state devolve so aluno gerenciado, com e-mail da conta vinculada e itens compactos',
  (review_bank_agent_state() ->> 'ok') = 'true' and jsonb_array_length(review_bank_agent_state() -> 'students') = 1
  and (review_bank_agent_state() -> 'students' -> 0 ->> 'linked_email') = 'e@x.com'
  and (review_bank_agent_state() -> 'students' -> 0 ->> 'item_count')::int >= 1
  and not ((review_bank_agent_state() -> 'students' -> 0) ? 'items')
  and (review_bank_agent_items('aaaaaaaa-0000-0000-0000-000000000002') -> 0 ? 'has_card')
  and (review_bank_agent_state() ->> 'today') ~ '^\d{4}-\d{2}-\d{2}$', '';
insert into r select '097: state nao vaza segredo nem dados de aluno nao gerenciado',
  position('token-secreto' in review_bank_agent_state()::text) = 0 and position('Sem Conta' in review_bank_agent_state()::text) = 0, '';
create temp table sub(id uuid); grant all on sub to service_role;
insert into sub select agent_inbox_submit('{"students":[{"student_id":"aaaaaaaa-0000-0000-0000-000000000002","items":[{"type":"vocabulario","q":"a","a":"b"}]}]}'::jsonb);
insert into r select '097: entrega valida cai na caixa como pendente, da professora do segredo',
  (select status = 'pendente' and teacher_id = '00000000-0000-0000-0000-00000000000d' and attempts = 0 from review_bank_agent_inbox where id = (select id from sub)), '';
insert into r select '097: o gatilho avisa a funcao por dentro do Supabase (url, anon e token do Vault, corpo process_inbox com o id)',
  (select count(*) = 1 and bool_and(url = 'https://projeto.test/functions/v1/review-bank-agent' and body ->> 'action' = 'process_inbox' and (body ->> 'inbox_id')::uuid = (select id from sub)
     and headers ->> 'x-agent-token' = 'token-secreto-de-teste-1234567890' and headers ->> 'Authorization' = 'Bearer anon-jwt-publico') from net.calls), '';
insert into r select '097: o token nao fica gravado na caixa', (select count(*) = 0 from review_bank_agent_inbox where payload::text like '%token-secreto%' or coalesce(result::text,'') like '%token-secreto%'), '';
do $$ begin perform agent_inbox_submit('[]'::jsonb); insert into r values ('097: payload que nao e objeto e recusado', false, 'passou'); exception when others then insert into r values ('097: payload que nao e objeto e recusado', sqlerrm = 'invalid_payload', sqlerrm); end $$;
do $$ begin perform agent_inbox_submit('{"x":1}'::jsonb); insert into r values ('097: payload sem students/register_students e recusado', false, 'passou'); exception when others then insert into r values ('097: payload sem students/register_students e recusado', sqlerrm = 'invalid_payload', sqlerrm); end $$;
do $$ begin perform agent_inbox_submit(jsonb_build_object('students', jsonb_build_array(repeat('x', 3100000)))); insert into r values ('097: payload gigante e recusado', false, 'passou'); exception when others then insert into r values ('097: payload gigante e recusado', sqlerrm = 'payload_too_large', sqlerrm); end $$;
-- permissões: nenhum cliente executa
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
do $$ begin perform agent_inbox_submit('{"students":[]}'::jsonb); insert into r values ('097: professora logada NAO entrega pela funcao da tarefa', false, 'passou'); exception when others then insert into r values ('097: professora logada NAO entrega pela funcao da tarefa', sqlstate = '42501', sqlerrm); end $$;
do $$ begin perform review_bank_agent_state(); insert into r values ('097: professora logada NAO le o state da tarefa', false, 'passou'); exception when others then insert into r values ('097: professora logada NAO le o state da tarefa', sqlstate = '42501', sqlerrm); end $$;
do $$ begin perform review_bank_agent_items('aaaaaaaa-0000-0000-0000-000000000002'); insert into r values ('097: professora logada NAO lê itens pela funcao da tarefa', false, 'passou'); exception when others then insert into r values ('097: professora logada NAO lê itens pela funcao da tarefa', sqlstate = '42501', sqlerrm); end $$;
do $$ begin perform _rb_agent_secret('rb_agent_token'); insert into r values ('097: ninguem logado le segredo do Vault', false, 'passou'); exception when others then insert into r values ('097: ninguem logado le segredo do Vault', sqlstate = '42501', sqlerrm); end $$;
do $$ begin insert into review_bank_agent_inbox(teacher_id, payload) values ('00000000-0000-0000-0000-00000000000d', '{"students":[]}'::jsonb); insert into r values ('097: professora nao grava direto na caixa', false, 'passou'); exception when others then insert into r values ('097: professora nao grava direto na caixa', true, sqlerrm); end $$;
insert into r select '097: professora le so a propria caixa', (select count(*) from review_bank_agent_inbox) = 1, '';
reset role; set role anon;
do $$ begin perform agent_inbox_submit('{"students":[]}'::jsonb); insert into r values ('097: anon NAO entrega na caixa', false, 'passou'); exception when others then insert into r values ('097: anon NAO entrega na caixa', sqlstate = '42501', sqlerrm); end $$;
reset role;
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
insert into r select '097: outra professora (admin) nao ve a caixa da primeira', (select count(*) from review_bank_agent_inbox) = 0, '';
reset role; select set_config('request.jwt.claims', '', false);
do $$ begin perform review_bank_agent_items('aaaaaaaa-0000-0000-0000-000000000001'); insert into r values ('099: itens de aluno NAO gerenciado sao recusados', false, 'passou'); exception when others then insert into r values ('099: itens de aluno NAO gerenciado sao recusados', sqlerrm = 'not_managed', sqlerrm); end $$;
-- reivindicar: 3 tentativas, depois erro
set role service_role;
insert into r select '097: reivindicar devolve a linha como processando (tentativa 1) e nao entrega 2 vezes', (select count(*) = 1 and bool_and(status = 'processando' and attempts = 1) from agent_inbox_claim('00000000-0000-0000-0000-00000000000d', (select id from sub))), '';
insert into r select '097: linha em processamento nao e reivindicada de novo', (select count(*) = 0 from agent_inbox_claim('00000000-0000-0000-0000-00000000000d', (select id from sub))), '';
insert into r select '097: outra professora nao reivindica a caixa alheia', (select count(*) = 0 from agent_inbox_claim('00000000-0000-0000-0000-00000000000a', (select id from sub))), '';
reset role;
update review_bank_agent_inbox set claimed_at = now() - interval '11 minutes' where id = (select id from sub);
set role service_role;
insert into r select '097: linha travada ha mais de 10 min volta (tentativa 2)', (select count(*) = 1 and bool_and(attempts = 2) from agent_inbox_claim('00000000-0000-0000-0000-00000000000d', (select id from sub))), '';
reset role; update review_bank_agent_inbox set claimed_at = now() - interval '11 minutes' where id = (select id from sub); set role service_role;
insert into r select '097: tentativa 3', (select count(*) = 1 and bool_and(attempts = 3) from agent_inbox_claim('00000000-0000-0000-0000-00000000000d', (select id from sub))), '';
reset role; update review_bank_agent_inbox set claimed_at = now() - interval '11 minutes' where id = (select id from sub); set role service_role;
create temp table claim4(n int); grant all on claim4 to service_role;
insert into claim4 select count(*) from agent_inbox_claim('00000000-0000-0000-0000-00000000000d', (select id from sub));
insert into r select '097: depois de 3 tentativas a linha vira erro e para de ser reenviada', (select n = 0 from claim4) and (select status = 'erro' from review_bank_agent_inbox where id = (select id from sub)), '';
reset role;
-- sweep: só reenvia o que está parado
delete from net.calls;
insert into review_bank_agent_inbox(teacher_id, payload, created_at) values ('00000000-0000-0000-0000-00000000000d', '{"students":[]}'::jsonb, now() - interval '5 minutes');
delete from net.calls;
select agent_inbox_sweep();
insert into r select '097: sweep reenvia quando ha linha pendente parada', (select count(*) = 1 and bool_and(body ->> 'action' = 'process_inbox' and not (body ? 'inbox_id')) from net.calls), '';
update review_bank_agent_inbox set status = 'feito';
delete from net.calls; select agent_inbox_sweep();
insert into r select '097: sweep nao chama a funcao quando nao ha nada parado', (select count(*) = 0 from net.calls), '';
-- sem segredos, entregar falha e o gatilho nunca derruba nada
delete from vault.decrypted_secrets where name = 'rb_agent_url'; delete from net.calls;
insert into review_bank_agent_inbox(teacher_id, payload) values ('00000000-0000-0000-0000-00000000000d', '{"students":[]}'::jsonb);
insert into r select '097: sem a url no Vault a entrega ainda grava, nenhuma chamada sai e o motivo fica na linha', (select count(*) = 0 from net.calls) and (select count(*) = 1 and bool_and(error like 'envio: rb_agent_nao_configurado%' and status = 'pendente') from review_bank_agent_inbox where id = (select id from review_bank_agent_inbox order by created_at desc limit 1)), '';
delete from vault.decrypted_secrets where name = 'rb_agent_teacher';
do $$ begin perform review_bank_agent_state(); insert into r values ('097: sem professora configurada o state recusa', false, 'passou'); exception when others then insert into r values ('097: sem professora configurada o state recusa', sqlerrm = 'not_configured', sqlerrm); end $$;
do $$ begin perform agent_inbox_submit('{"students":[]}'::jsonb); insert into r values ('097: sem professora configurada a entrega recusa', false, 'passou'); exception when others then insert into r values ('097: sem professora configurada a entrega recusa', sqlerrm = 'not_configured', sqlerrm); end $$;
select count(*) filter (where ok) passed, count(*) filter (where not ok or ok is null) failed from r;
select name, got from r where not ok or ok is null;
select count(*) filter (where name like '089:%') as checks_089, count(*) filter (where name like '097:%' or name like '099:%') as checks_097_099, count(*) as total from r;
