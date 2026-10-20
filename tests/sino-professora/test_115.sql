-- Teste da 115 (Etapa 4: avisos de vínculo sem "aluno/a", badge "Turma de X"). Transação + ROLLBACK, Postgres local
-- (tests/sino-professora/run_115.sh: banco da 108 + 115 aplicada duas vezes).
begin;
create temp table r(ok boolean, name text) on commit drop;
grant all on r to public;
create temp table v(k text primary key, val text) on commit drop;
grant all on v to public;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), true);
      perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true); end $$;
grant execute on function pg_temp.as_user(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;

-- ===== 1. Estrutura: mesmas permissões e segurança de antes =====
insert into r select not has_function_privilege('authenticated', 'public._notif_text_en(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._teacher_notice_params(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._teacher_badge_id(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public._teacher_badge_id(uuid)', 'EXECUTE'), 'funções internas continuam fechadas';
insert into r select has_function_privilege('authenticated', 'public.teacher_invite_student(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.respond_teacher_invite(bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.accept_invite_code(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.join_classroom_code(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.teacher_invite_student(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.join_classroom_code(text)', 'EXECUTE'), 'RPCs: authenticated sim, anon não';
insert into r select (select bool_and(prosecdef and proconfig::text like '%search_path=public%') from pg_proc
  where proname in ('teacher_invite_student', 'respond_teacher_invite', 'accept_invite_code', 'join_classroom_code', '_teacher_badge_id')),
  'security definer + search_path';
insert into r select not exists (select 1 from pg_proc where proname in ('teacher_invite_student', 'respond_teacher_invite', 'accept_invite_code',
  'join_classroom_code', '_teacher_badge_id') and prosrc like '%aluno/a%'), 'nenhuma RPC grava "aluno/a"';

-- ===== 2. Frases ANTIGAS (avisos já gravados) e NOVAS: tradução e params =====
insert into r select _notif_text_en('teacher_invite', 'Tereza te convidou para ser aluno/a de francês 🎓') = 'Tereza invited you to their French classes 🎓'
  and _notif_text_en('teacher_invite', 'Tereza te convidou para as aulas de francês 🎓') = 'Tereza invited you to their French classes 🎓'
  and _notif_text_en('teacher_invite', 'Professora te convidou para as aulas de chinês 🎓') = 'Your teacher invited you to their Chinese classes 🎓',
  'convite: frase antiga e nova traduzidas';
insert into r select _notif_text_en('teacher_invite_accepted', 'Ana aceitou seu convite e agora é seu aluno/a de português 🎉') = 'Ana accepted your invitation and now studies Portuguese with you 🎉'
  and _notif_text_en('teacher_invite_accepted', 'Ana aceitou seu convite e agora estuda português com você 🎉') = 'Ana accepted your invitation and now studies Portuguese with you 🎉'
  and _notif_text_en('teacher_invite_accepted', 'Caio entrou pelo seu link e agora é seu aluno/a de chinês 🎉') = 'Caio joined through your link and now studies Chinese with you 🎉'
  and _notif_text_en('teacher_invite_accepted', 'Caio entrou pelo seu link e agora estuda chinês com você 🎉') = 'Caio joined through your link and now studies Chinese with you 🎉',
  'aceitou / entrou pelo link: antiga e nova traduzidas';
insert into r select _notif_text_en('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado e agora é seu aluno/a de chinês 🎉') = '🏫 Caio joined the class Sábado through your link and now studies Chinese with you 🎉'
  and _notif_text_en('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado e agora estuda chinês com você 🎉') = '🏫 Caio joined the class Sábado through your link and now studies Chinese with you 🎉'
  and _notif_text_en('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado 🎉') = '🏫 Caio joined the class Sábado through your link 🎉'
  and _notif_text_en('mural_classroom_join', '🏫 Caio entrou pelo link na turma A e agora B 🎉') = '🏫 Caio joined the class A e agora B through your link 🎉',
  'entrou na turma: antiga, nova e sem vínculo novo';
insert into r select _teacher_notice_params('teacher_invite_accepted', 'Ana aceitou seu convite e agora é seu aluno/a de português 🎉') = '{"name":"Ana","via":"invite"}'::jsonb
  and _teacher_notice_params('teacher_invite_accepted', 'Ana aceitou seu convite e agora estuda português com você 🎉') = '{"name":"Ana","via":"invite"}'::jsonb
  and _teacher_notice_params('teacher_invite_accepted', 'Caio entrou pelo seu link e agora é seu aluno/a de chinês 🎉') = '{"name":"Caio","via":"link"}'::jsonb
  and _teacher_notice_params('teacher_invite_accepted', 'Caio entrou pelo seu link e agora estuda chinês com você 🎉') = '{"name":"Caio","via":"link"}'::jsonb,
  'params de aceitou / link: antiga e nova';
insert into r select _teacher_notice_params('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado e agora é seu aluno/a de português 🎉') = '{"name":"Caio","classroom":"Sábado","new_link":true}'::jsonb
  and _teacher_notice_params('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado e agora estuda português com você 🎉') = '{"name":"Caio","classroom":"Sábado","new_link":true}'::jsonb
  and _teacher_notice_params('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado 🎉') = '{"name":"Caio","classroom":"Sábado","new_link":false}'::jsonb,
  'params de entrou na turma: antiga, nova e sem vínculo novo';
insert into r select _teacher_notice_params('student_inactive_alert', 'Passou uns dias sem prática por aí: Ana (3 dias), Bia (5 dias). Um lembrete seu pode ajudar a retomar o ritmo.')
    = '{"students":[{"name":"Ana","days":3},{"name":"Bia","days":5}]}'::jsonb
  and _teacher_notice_params('student_inactive_alert', 'Uns dias sem prática por aí: Ana (3 dias), Bia (5 dias). Um recado seu pode ajudar a retomar o ritmo.')
    = '{"students":[{"name":"Ana","days":3},{"name":"Bia","days":5}]}'::jsonb,
  'aluno sumido: modelo antigo e o novo da 114 ("Uns dias... Um recado seu")';
insert into r select _notif_text_en('teacher_invite', 'qualquer coisa') is null and _teacher_notice_params('teacher_invite_accepted', 'qualquer coisa') is null,
  'frase desconhecida continua sem tradução/params';

-- ===== 3. Contas =====
insert into auth.users(id, email) values
 ('11500000-0000-0000-0000-0000000000a1','t115@x.invalid'), ('e1150000-0000-0000-0000-0000000000a2','e115@x.invalid'),
 ('11500000-0000-0000-0000-0000000000b1','a115@x.invalid'), ('11500000-0000-0000-0000-0000000000b3','c115@x.invalid'),
 ('11500000-0000-0000-0000-0000000000b4','d115@x.invalid');
insert into profiles(user_id, display_name) values
 ('11500000-0000-0000-0000-0000000000a1','Tereza Prof'), ('e1150000-0000-0000-0000-0000000000a2','Emma Teacher'),
 ('11500000-0000-0000-0000-0000000000b1','Ana'), ('11500000-0000-0000-0000-0000000000b3','Caio'), ('11500000-0000-0000-0000-0000000000b4','Duda')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into progress(user_id, data) values
 ('11500000-0000-0000-0000-0000000000a1', '{"_meta":{"uiLanguage":"pt-BR","currentCourse":"frances@pt-BR"},"frances":{}}'),
 ('e1150000-0000-0000-0000-0000000000a2', '{"_meta":{"uiLanguage":"en","currentCourse":"mandarim@en"},"mandarim@en":{}}'),
 ('11500000-0000-0000-0000-0000000000b1', '{"_meta":{"uiLanguage":"en","currentCourse":"portugues@en"},"portugues@en":{}}'),
 ('11500000-0000-0000-0000-0000000000b4', '{"_meta":{"uiLanguage":"pt-BR","currentCourse":"frances@pt-BR"},"frances":{}}')
 on conflict (user_id) do update set data = excluded.data;
insert into account_roles(user_id, role) values ('11500000-0000-0000-0000-0000000000a1','teacher'), ('e1150000-0000-0000-0000-0000000000a2','teacher');
insert into v values ('T','11500000-0000-0000-0000-0000000000a1'), ('E','e1150000-0000-0000-0000-0000000000a2'),
 ('A','11500000-0000-0000-0000-0000000000b1'), ('C','11500000-0000-0000-0000-0000000000b3'), ('D','11500000-0000-0000-0000-0000000000b4');

-- ===== 4. Convite e aceite (aluno de português, site em inglês; professora em português) =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (teacher_invite_student(pg_temp.g('A')::uuid, 'portugues') ->> 'ok') = 'true', 'professora convida';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and event_type = 'teacher_invite' and audience = 'self'
                       and body = 'Tereza Prof invited you to their Portuguese classes 🎓') = 1, 'aluno (site em inglês) recebe o convite novo em inglês';
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'L1', (select link_id::text from my_teacher_invites() limit 1);
insert into r select (respond_teacher_invite(pg_temp.g('L1')::bigint, true) ->> 'status') = 'active', 'aluno aceita';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'teacher_invite_accepted' and audience = 'teacher'
                       and body = 'Ana aceitou seu convite e agora estuda português com você 🎉' and params = '{"name":"Ana","via":"invite"}'::jsonb) = 1,
  'professora (português) recebe "agora estuda português com você", com params';

-- convite em português para aluna com site em português
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (teacher_invite_student(pg_temp.g('D')::uuid, 'frances') ->> 'ok') = 'true', 'professora convida aluna de francês';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('D')::uuid and event_type = 'teacher_invite'
                       and body = 'Tereza Prof te convidou para as aulas de francês 🎓') = 1, 'aluna (português) recebe "te convidou para as aulas de francês"';

-- ===== 5. Link de convite (chinês), professora em inglês =====
select pg_temp.as_user(pg_temp.g('E')); set local role authenticated;
insert into v select 'CODE', teacher_invite_link('mandarim') ->> 'code';
reset role;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (accept_invite_code(pg_temp.g('CODE')) ->> 'ok') = 'true', 'aluno entra pelo link';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('E')::uuid and event_type = 'teacher_invite_accepted' and audience = 'teacher'
                       and params = '{"name":"Caio","via":"link"}'::jsonb
                       and body = 'Caio joined through your link and now studies Chinese with you 🎉') = 1, 'professora em inglês: "now studies Chinese with you", via=link';

-- ===== 6. Link da turma (francês), professora em português =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K', mural_save_classroom('frances', null, 'Sábado') ->> 'id';
insert into v select 'KC', mural_classroom_link(pg_temp.g('K')::bigint) ->> 'code';
reset role;
insert into auth.users(id, email) values ('11500000-0000-0000-0000-0000000000b5','x115@x.invalid');
insert into profiles(user_id, display_name) values ('11500000-0000-0000-0000-0000000000b5','Xavier') on conflict (user_id) do update set display_name = excluded.display_name;
select pg_temp.as_user('11500000-0000-0000-0000-0000000000b5'); set local role authenticated;
insert into r select (join_classroom_code(pg_temp.g('KC')) ->> 'new_link') = 'true', 'aluno entra pela turma (vínculo novo)';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'mural_classroom_join' and audience = 'teacher'
                       and body = '🏫 Xavier entrou pelo link na turma Sábado e agora estuda francês com você 🎉'
                       and params = '{"name":"Xavier","classroom":"Sábado","new_link":true}'::jsonb) = 1, 'turma: "agora estuda francês com você", params new_link';

-- ===== 7. Badge da professora =====
-- (o id do badge sai dos 24 primeiros dígitos do uuid: E tem prefixo próprio para não colidir com T)
insert into r select (select name = 'Turma de Tereza' and description = 'Estuda com esta professora.' from badge_catalog where teacher_id = pg_temp.g('T')::uuid),
  'badge criado no aceite: "Turma de Tereza"';
insert into r select (select count(*) from badge_catalog where teacher_id = pg_temp.g('E')::uuid) = 1
  and (select name = 'Turma de Emma' and description = 'Estuda com esta professora.' and icon = '🎓' from badge_catalog where teacher_id = pg_temp.g('E')::uuid),
  'badge criado no link: "Turma de Emma" / "Estuda com esta professora."';
insert into v select 'BID', (select id from badge_catalog where teacher_id = pg_temp.g('E')::uuid);
insert into r select _teacher_badge_id(pg_temp.g('E')::uuid) = pg_temp.g('BID') and (select count(*) from badge_catalog where teacher_id = pg_temp.g('E')::uuid) = 1,
  'chamar de novo devolve o mesmo badge (não cria outro nem muda o nome)';
insert into r select not exists (select 1 from badge_catalog where teacher_id in (pg_temp.g('T')::uuid, pg_temp.g('E')::uuid) and (name like '%/%' or description like '%/%')),
  'nenhum badge novo com barra de gênero';

select name from r where not ok;
select 'RESULTADO 115 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
