\set ON_ERROR_STOP 0
\set QUIET on
create temp table r(name text, ok boolean, got text);
grant all on r to authenticated, anon;
create or replace function pg_temp.u(uid text, email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',email)::text, false); end $$;
-- ids: a=autora(admin), b=aluna da autora (fr), c=gratis, d=professora nova, e=conta nova
insert into auth.users values ('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into profiles(user_id, username) values ('00000000-0000-0000-0000-00000000000e','e');
update profiles set display_name = 'Carla Souza' where username = 'prof';
insert into r select 'badge student vira da autora', (select teacher_id = '00000000-0000-0000-0000-00000000000a' from badge_catalog where id='student'), '';

select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com'); set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000d','teacher');

-- conta grátis não convida
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
insert into r select 'gratis nao convida', teacher_invite_student('00000000-0000-0000-0000-00000000000e','frances')->>'error' = 'not_authorized', '';
insert into r select 'gratis nao gera link', teacher_invite_link('frances')->>'error' = 'not_authorized', '';

-- professora d
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'bloqueia aluno com professora', (select x->>'error' = 'student_has_teacher' from teacher_invite_student('00000000-0000-0000-0000-00000000000b','frances') x), '';
insert into r select 'nao convida a si mesma', teacher_invite_student('00000000-0000-0000-0000-00000000000d','frances')->>'error' = 'invalid_target', '';
insert into r select 'convite ok', (select x->>'status' = 'invited' from teacher_invite_student('00000000-0000-0000-0000-00000000000c','frances') x), '';
insert into r select 'convite repetido barrado', teacher_invite_student('00000000-0000-0000-0000-00000000000c','frances')->>'error' = 'already_invited', '';
insert into r select 'vinculo invited criado', (select count(*)=1 from teacher_students where student_id='00000000-0000-0000-0000-00000000000c' and status='invited' and invited_at is not null), '';
do $$ begin update teacher_students set status='active' where student_id='00000000-0000-0000-0000-00000000000c';
 insert into r values ('professora nao ativa sozinha', false, 'passou'); exception when others then insert into r values ('professora nao ativa sozinha', true, sqlerrm); end $$;
do $$ begin insert into teacher_students(teacher_id, student_id, language_app_key, status) values ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e','frances','invited');
 insert into r values ('professora nao insere invited direto', false, 'passou'); exception when others then insert into r values ('professora nao insere invited direto', true, sqlerrm); end $$;
do $$ begin perform 1 from teacher_invite_codes; insert into r values ('tabela de codigos fechada', false, 'passou');
 exception when others then insert into r values ('tabela de codigos fechada', true, sqlerrm); end $$;

-- a autora (admin) tenta convidar b, que já é aluna dela
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
insert into r select 'ja e aluna', teacher_invite_student('00000000-0000-0000-0000-00000000000b','frances')->>'error' = 'already_student', '';

-- aluna c: vê e aceita
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com');
insert into r select 'aluno ve notificacao', (select count(*)=1 from notifications where event_type='teacher_invite' and body like 'Carla Souza te convidou%'), '';
insert into r select 'aluno ve convite', (select count(*)=1 and min(teacher_name)='Carla Souza' from my_teacher_invites()), '';
do $$ begin update teacher_students set status='removed' where student_id='00000000-0000-0000-0000-00000000000c';
 insert into r values ('aluno nao mexe no vinculo', (select count(*)=1 from teacher_students where student_id='00000000-0000-0000-0000-00000000000c' and status='invited'), 'sem erro, 0 linhas');
 exception when others then insert into r values ('aluno nao mexe no vinculo', true, sqlerrm); end $$;
insert into r select 'aceitar', respond_teacher_invite((select link_id from my_teacher_invites()), true)->>'status' = 'active', '';
insert into r select 'badge da professora criado', (select name='Aluno/a do/a Prof. Carla' and icon='🎓' from badge_catalog where teacher_id='00000000-0000-0000-0000-00000000000d'), '';
insert into r select 'badge concedido', (select count(*)=1 from badge_grants g join badge_catalog c on c.id=g.badge_id where c.teacher_id='00000000-0000-0000-0000-00000000000d' and g.user_id='00000000-0000-0000-0000-00000000000c'), '';
insert into r select 'aceitar de novo falha', respond_teacher_invite((select id from teacher_students where student_id='00000000-0000-0000-0000-00000000000c'), true)->>'error' = 'no_pending_invite', '';

-- professora vê aviso; outro convite para c no mesmo idioma é barrado (1 professora por idioma)
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'professora avisada do aceite', (select count(*)=1 from notifications where event_type='teacher_invite_accepted'), '';
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
insert into r select 'outra professora barrada', teacher_invite_student('00000000-0000-0000-0000-00000000000c','frances')->>'error' = 'student_has_teacher', '';
do $$ begin insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000c','frances');
 insert into r values ('indice 1 professora por idioma', false, 'passou'); exception when others then insert into r values ('indice 1 professora por idioma', sqlstate='23505', sqlerrm); end $$;
insert into r select 'outro idioma pode', teacher_invite_student('00000000-0000-0000-0000-00000000000c','mandarim')->>'status' = 'invited', '';

-- recusa: e recusa convite de d
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
select teacher_invite_student('00000000-0000-0000-0000-00000000000e','mandarim');
select pg_temp.u('00000000-0000-0000-0000-00000000000e','e@x.com');
insert into r select 'recusar', respond_teacher_invite((select link_id from my_teacher_invites()), false)->>'status' = 'removed', '';
insert into r select 'recusa sem badge', (select count(*)=0 from badge_grants where user_id='00000000-0000-0000-0000-00000000000e'), '';
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'professora avisada da recusa', (select count(*)=1 from notifications where event_type='teacher_invite_declined'), '';
insert into r select 'reconvidar depois da recusa', teacher_invite_student('00000000-0000-0000-0000-00000000000e','mandarim')->>'status' = 'invited', '';
-- cancelar convite
update teacher_students set status='removed' where student_id='00000000-0000-0000-0000-00000000000e' and language_app_key='mandarim';
insert into r select 'professora cancela convite', (select status='removed' from teacher_students where student_id='00000000-0000-0000-0000-00000000000e' and language_app_key='mandarim'), '';

-- desvincular: badge some
update teacher_students set status='removed' where student_id='00000000-0000-0000-0000-00000000000c' and language_app_key='frances';
insert into r select 'desvincular tira badge', (select count(*)=0 from badge_grants g join badge_catalog c on c.id=g.badge_id where c.teacher_id='00000000-0000-0000-0000-00000000000d'), '';

-- link de convite
create temp table k(code text); grant all on k to authenticated, anon;
insert into k select teacher_invite_link('frances')->>'code';
insert into r select 'link tem 10 caracteres', (select code ~ '^[a-z0-9]{10}$' from k), '';
insert into r select 'link estavel', teacher_invite_link('frances')->>'code' = (select code from k), '';
reset role; select set_config('request.jwt.claims', '', false); set role anon;
insert into r select 'anon ve cartao do convite', (select (invite_code_info(code))->>'teacher_name' = 'Carla Souza' from k), '';
do $$ begin perform teacher_invite_student('00000000-0000-0000-0000-00000000000e','frances'); insert into r values ('anon nao convida', false, 'passou');
 exception when others then insert into r values ('anon nao convida', true, sqlerrm); end $$;
reset role;
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com'); set role authenticated;
insert into r select 'aceitar pelo link', (select (accept_invite_code(upper(code)))->>'status' = 'active' from k), '';
insert into r select 'badge volta pelo link', (select count(*)=1 from badge_grants g join badge_catalog c on c.id=g.badge_id where c.teacher_id='00000000-0000-0000-0000-00000000000d'), '';
insert into r select 'link de novo = ja aluno', (select (accept_invite_code(code))->>'error' = 'already_student' from k), '';
select pg_temp.u('00000000-0000-0000-0000-00000000000b','aluna@x.com');
insert into r select 'link barra quem ja tem professora', (select (accept_invite_code(code))->>'error' = 'student_has_teacher' from k), '';
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com');
insert into r select 'professora nao usa o proprio link', (select (accept_invite_code(code))->>'error' = 'invalid_target' from k), '';
insert into r select 'resetar link troca codigo', teacher_invite_link('frances', true)->>'code' <> (select code from k), '';
insert into r select 'link antigo invalido', (select (invite_code_info(code))->>'error' = 'invalid_code' from k), '';

-- vínculo direto da admin continua e dá/tira o badge da autora
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
insert into teacher_students(teacher_id, student_id, language_app_key) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000e','frances');
insert into r select 'vinculo direto da badge student', (select count(*)=1 from badge_grants where user_id='00000000-0000-0000-0000-00000000000e' and badge_id='student'), '';
delete from teacher_students where teacher_id='00000000-0000-0000-0000-00000000000a' and student_id='00000000-0000-0000-0000-00000000000e';
insert into r select 'apagar vinculo tira badge', (select count(*)=0 from badge_grants where user_id='00000000-0000-0000-0000-00000000000e'), '';
insert into r select 'badge de b intacto', (select count(*)=1 from badge_grants where user_id='00000000-0000-0000-0000-00000000000b' and badge_id='student'), '';

-- validade de 14 dias
reset role;
update teacher_students set invited_at = now() - interval '15 days' where student_id='00000000-0000-0000-0000-00000000000c' and language_app_key='mandarim';
select pg_temp.u('00000000-0000-0000-0000-00000000000c','gratis@x.com'); set role authenticated;
insert into r select 'convite vencido some', (select count(*)=0 from my_teacher_invites()), '';
insert into r select 'convite vencido nao aceita', respond_teacher_invite((select id from teacher_students where student_id='00000000-0000-0000-0000-00000000000c' and language_app_key='mandarim'), true)->>'error' = 'no_pending_invite', '';
select pg_temp.u('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
insert into r select 'reconvidar vencido', teacher_invite_student('00000000-0000-0000-0000-00000000000c','mandarim')->>'status' = 'invited', '';

-- limite de 30 por dia
reset role;
insert into teacher_invite_log(teacher_id, student_id) select '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000e' from generate_series(1, 30);
select pg_temp.u('00000000-0000-0000-0000-00000000000d','prof@x.com'); set role authenticated;
insert into r select 'limite diario', teacher_invite_student('00000000-0000-0000-0000-00000000000e','frances')->>'error' = 'daily_invite_limit', '';

reset role;
select count(*) filter (where ok) as passou, count(*) as total from r;
select name, got from r where not ok or ok is null;
