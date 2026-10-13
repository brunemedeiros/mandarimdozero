\set ON_ERROR_STOP 0
\set QUIET on
create temp table r(name text, ok boolean, got text);
grant all on r to authenticated, anon;
create or replace function pg_temp.u(uid text, email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',email)::text, false); end $$;
-- ids: a=autora(admin), b=aluna da autora (fr), c=gratis, d=professora nova, e=aluna da d
insert into auth.users values ('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into profiles(user_id, username) values ('00000000-0000-0000-0000-00000000000e','e');
reset role;
-- autora concede professora para d (pela RPC da 075)
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000d','teacher');
-- admin cria vínculo d->e (fr) e a->b já existe
insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances');
update teacher_students set language_app_key='frances' where student_id='00000000-0000-0000-0000-00000000000b';
insert into r select 'admin cria vinculo', (select count(*)=2 from teacher_students where status='active'), '';
-- autora (admin+prof) grava aula e material para b
insert into teacher_class_logs(teacher_id, student_id, language_app_key, topic, notes) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','frances','Passé composé','nota privada');
insert into teacher_support_materials(teacher_id, student_id, language_app_key, title) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','frances','PDF');
insert into r select 'autora grava aula/material', (select count(*) from teacher_class_logs)=1 and (select count(*) from teacher_support_materials)=1, '';

-- FURO: conta grátis c tenta gravar aula/material para b
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
do $$ begin insert into teacher_class_logs(teacher_id, student_id, language_app_key, topic) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b','frances','spam');
 insert into r values ('furo aula fechado', false, 'passou'); exception when others then insert into r values ('furo aula fechado', true, sqlerrm); end $$;
do $$ begin insert into teacher_support_materials(teacher_id, student_id, language_app_key, title) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b','frances','spam');
 insert into r values ('furo material fechado', false, 'passou'); exception when others then insert into r values ('furo material fechado', true, sqlerrm); end $$;
do $$ begin insert into storage.objects(bucket_id, name) values ('support-materials','00000000-0000-0000-0000-00000000000c/x.pdf');
 insert into r values ('upload material so professora', false, 'passou'); exception when others then insert into r values ('upload material so professora', true, sqlerrm); end $$;
do $$ begin insert into teacher_flashcards(teacher_id, student_id, language_app_key, front) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b','frances','x');
 insert into r values ('gratis nao cria cartao de professora', false, 'passou'); exception when others then insert into r values ('gratis nao cria cartao de professora', true, sqlerrm); end $$;
do $$ begin insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b','mandarim');
 insert into r values ('gratis nao cria vinculo', false, 'passou'); exception when others then insert into r values ('gratis nao cria vinculo', true, sqlerrm); end $$;
do $$ begin update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-00000000000c';
 insert into r values ('autopromocao bloqueada', false, 'passou'); exception when others then insert into r values ('autopromocao bloqueada', sqlerrm='plan_role_protected', sqlerrm); end $$;
do $$ begin perform ensure_user_decks('00000000-0000-0000-0000-00000000000b','frances');
 insert into r values ('estranho nao cria decks do aluno', false, 'passou'); exception when others then insert into r values ('estranho nao cria decks do aluno', sqlerrm='not_authorized', sqlerrm); end $$;

-- professora nova d
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into teacher_class_logs(teacher_id, student_id, language_app_key, topic, notes) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','Aula 1','so minha');
insert into teacher_flashcards(teacher_id, student_id, language_app_key, front) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','bonjour');
insert into storage.objects(bucket_id, name) values ('support-materials','00000000-0000-0000-0000-00000000000d/a.pdf');
insert into r select 'prof grava para aluna dela', (select count(*) from teacher_class_logs where teacher_id='00000000-0000-0000-0000-00000000000d')=1, '';
do $$ begin insert into teacher_class_logs(teacher_id, student_id, language_app_key, topic) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000b','frances','x');
 insert into r values ('prof nao grava para aluna alheia', false, 'passou'); exception when others then insert into r values ('prof nao grava para aluna alheia', true, sqlerrm); end $$;
do $$ begin insert into teacher_support_materials(teacher_id, student_id, language_app_key, title) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000b','frances','x');
 insert into r values ('prof nao grava material para aluna alheia', false, 'passou'); exception when others then insert into r values ('prof nao grava material para aluna alheia', true, sqlerrm); end $$;
insert into teacher_support_materials(teacher_id, student_id, language_app_key, title) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','PDF da d');
insert into r select 'prof nao ve aulas alheias', (select count(*) from teacher_class_logs)=1, (select count(*) from teacher_class_logs)::text;
insert into r select 'prof cria decks da aluna dela', (select count(*) from ensure_user_decks('00000000-0000-0000-0000-00000000000e','frances'))=1, '';
do $$ begin perform ensure_user_decks('00000000-0000-0000-0000-00000000000b','frances');
 insert into r values ('prof nao cria decks de aluna alheia', false, 'passou'); exception when others then insert into r values ('prof nao cria decks de aluna alheia', sqlerrm='not_authorized', sqlerrm); end $$;
do $$ begin update teacher_students set status='active', language_app_key='mandarim' where teacher_id='00000000-0000-0000-0000-00000000000d';
 insert into r values ('prof nao reativa/mexe vinculo ativo', false, 'passou'); exception when others then insert into r values ('prof nao reativa/mexe vinculo ativo', true, sqlerrm); end $$;

-- aluna e: lê aula sem notes e material; depois de desvinculada não lê
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'aluna le aula', (select count(*) from get_my_class_logs('frances'))=1, '';
insert into r select 'aula sem anotacoes', not exists (select 1 from information_schema.routines where routine_name='get_my_class_logs' and routine_definition ilike '%l.notes%'), '';
insert into r select 'aluna e le so o material dela', (select count(*) from teacher_support_materials)=1, (select count(*) from teacher_support_materials)::text;
insert into r select 'aluna nao le tabela de aulas direto', (select count(*) from teacher_class_logs)=0, (select count(*) from teacher_class_logs)::text;
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
update teacher_students set status='inactive' where teacher_id='00000000-0000-0000-0000-00000000000d';
insert into r select 'prof desativa vinculo dela', (select status from teacher_students where teacher_id='00000000-0000-0000-0000-00000000000d')='inactive', '';
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'ex-aluna nao le material', (select count(*) from teacher_support_materials)=0, (select count(*) from teacher_support_materials)::text;
insert into r select 'ex-aluna nao le aula', (select count(*) from get_my_class_logs('frances'))=0, '';
-- aluna b lê material da autora
select pg_temp.u('00000000-0000-0000-0000-00000000000b','aluna@x.com');
insert into r select 'aluna b le material', (select count(*) from teacher_support_materials)=1, '';
-- anon continua lendo decks de curso
reset role; set role anon; select set_config('request.jwt.claims', '', false);
insert into r select 'anon le deck de curso', (select count(*) from decks where kind='course')=1, '';
reset role;
select count(*) filter (where ok) passed, count(*) filter (where not ok or ok is null) failed from r;
select name, got from r where not ok or ok is null;
