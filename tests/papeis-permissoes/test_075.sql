\set ON_ERROR_STOP 0
create temp table r(name text, ok boolean, got text);
grant all on r to authenticated, anon;
-- simula o padrão de grants do Supabase (065): SELECT liberado, RLS decide
grant select on account_roles, permission_catalog, role_permissions to authenticated, anon;
create or replace function pg_temp.as_user(uid text, email text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',uid,'email',email)::text, false); end $$;

-- 1. autora
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
set role authenticated;
insert into r select 'autora is_admin', is_admin(), is_admin()::text;
insert into r select 'autora is_teacher', is_teacher(), is_teacher()::text;
insert into r select 'autora tts ilimitado', permission_limit('tts_monthly_quota') is null, coalesce(permission_limit('tts_monthly_quota')::text,'null');
insert into r select 'autora roles', (my_permissions()->'roles') ?& array['user','teacher','premium_basic'], (my_permissions()->'roles')::text;
-- 2. aluna vinculada = nível Basic + coisas de aluno
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','aluna@x.com');
insert into r select 'aluna nao admin', not is_admin(), is_admin()::text;
insert into r select 'aluna nao teacher', not is_teacher(), is_teacher()::text;
insert into r select 'aluna role student', (my_permissions()->'roles') ? 'student', (my_permissions()->'roles')::text;
insert into r select 'aluna formatos ricos', has_permission('rich_card_formats'), '';
insert into r select 'aluna tts 300', permission_limit('tts_monthly_quota') = 300, permission_limit('tts_monthly_quota')::text;
insert into r select 'aluna cartoes ilimitados', permission_limit('own_cards_limit') is null, coalesce(permission_limit('own_cards_limit')::text,'null');
insert into r select 'aluna sem menu professora', not has_permission('teacher_panel'), '';
-- 3. gratis
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c','gratis@x.com');
insert into r select 'gratis limite 20', permission_limit('own_cards_limit') = 20, permission_limit('own_cards_limit')::text;
insert into r select 'gratis sem tts', permission_limit('tts_monthly_quota') = 0, permission_limit('tts_monthly_quota')::text;
insert into r select 'gratis sem formatos', not has_permission('rich_card_formats'), '';
-- 4. nao-admin nao concede nem le roles alheios, nem escreve direto
do $$ begin perform admin_grant_role('00000000-0000-0000-0000-00000000000c','teacher'); insert into r values ('gratis grant bloqueado', false, 'passou');
exception when others then insert into r values ('gratis grant bloqueado', sqlerrm = 'not_authorized', sqlerrm); end $$;
do $$ begin perform admin_set_role_permission('user','rich_card_formats',true); insert into r values ('gratis matriz bloqueada', false, 'passou');
exception when others then insert into r values ('gratis matriz bloqueada', sqlerrm = 'not_authorized', sqlerrm); end $$;
do $$ begin insert into account_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000c','teacher'); insert into r values ('gratis insert direto bloqueado', false, 'passou');
exception when others then insert into r values ('gratis insert direto bloqueado', true, sqlerrm); end $$;
do $$ begin perform _has_permission('00000000-0000-0000-0000-00000000000a','teacher_panel'); insert into r values ('helper interno fechado', false, 'passou');
exception when others then insert into r values ('helper interno fechado', true, sqlerrm); end $$;
insert into r select 'gratis nao ve roles alheios', (select count(*) from account_roles) = 0, (select count(*) from account_roles)::text;
-- 5. e-mail de reserva: autora sem linha admin continua admin
reset role;
delete from account_roles where role='admin';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
set role authenticated;
insert into r select 'reserva por e-mail', is_admin(), is_admin()::text;
reset role;
insert into account_roles(user_id, role) select id,'admin' from auth.users where email='brunemed1310@gmail.com';
-- 6. admin concede professora + espelho
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000d','teacher');
select admin_set_role_permission('premium_pro','tts_monthly_quota',true,600);
reset role;
insert into r select 'espelho prof', (select plan_tier='premium' and role='teacher' from profiles where username='prof'), (select plan_tier||'/'||role from profiles where username='prof');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d','prof@x.com');
set role authenticated;
insert into r select 'prof is_teacher', is_teacher(), '';
insert into r select 'prof menu', has_permission('teacher_panel'), '';
insert into r select 'prof nao admin', not is_admin(), '';
-- 7. pro com 600 + aluno 300 = 600 (o maior)
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
set role authenticated;
select admin_grant_role('00000000-0000-0000-0000-00000000000b','premium_pro');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','aluna@x.com');
insert into r select 'soma: maior limite', permission_limit('tts_monthly_quota') = 600, permission_limit('tts_monthly_quota')::text;
-- 8. revogar volta espelho; expirado nao conta
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','brunemed1310@gmail.com');
select admin_revoke_role('00000000-0000-0000-0000-00000000000d','teacher');
reset role;
insert into r select 'revogar espelho', (select plan_tier='free' and role='user' from profiles where username='prof'), (select plan_tier||'/'||role from profiles where username='prof');
update account_roles set expires_at = now() - interval '1 day' where role='premium_pro';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','aluna@x.com');
set role authenticated;
insert into r select 'expirado nao conta', permission_limit('tts_monthly_quota') = 300, permission_limit('tts_monthly_quota')::text;
-- 9. desvincular: volta a user
reset role;
update teacher_students set status='inactive';
set role authenticated;
insert into r select 'desvinculada = gratis', permission_limit('own_cards_limit') = 20 and not ((my_permissions()->'roles') ? 'student'), (my_permissions()->'roles')::text;
reset role;
-- 10. anon sem execute
set role anon;
do $$ begin perform my_permissions(); insert into r values ('anon bloqueado', false, 'passou');
exception when others then insert into r values ('anon bloqueado', true, sqlerrm); end $$;
reset role;
select count(*) filter (where ok) as passed, count(*) filter (where not ok or ok is null) as failed from r;
select name, got from r where not ok or ok is null;
