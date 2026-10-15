-- Teste da 108 (sino da professora). Transação + ROLLBACK, Postgres local (tests/sino-professora/run.sh).
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
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;

-- ===== 1. Estrutura =====
insert into r select exists (select 1 from information_schema.columns where table_name = 'notifications' and column_name = 'audience'
                              and is_nullable = 'NO' and column_default like '%self%'), 'coluna audience (not null, default self)';
insert into r select exists (select 1 from information_schema.columns where table_name = 'notifications' and column_name = 'params' and data_type = 'jsonb'), 'coluna params (jsonb)';
insert into r select pg_temp.try($q$insert into notifications(user_id, language_app_key, category, event_type, body, audience)
                                   values ('10500000-0000-0000-0000-0000000000f1', 'frances', 'x', 'x', 'x', 'outro')$q$) = '23514', 'audience só aceita self/teacher';
insert into r select (select count(*) from pg_trigger where tgname = 'notifications_audience_fill') = 1, 'gatilho criado uma vez só (108 aplicada duas vezes)';
insert into r select (select count(*) from pg_constraint where conname = 'notifications_audience_check') = 1, 'check criado uma vez só';
insert into r select exists (select 1 from pg_indexes where indexname = 'notifications_user_audience_created_idx'), 'índice do sino da professora';
insert into r select not has_function_privilege('authenticated', 'public._teacher_notify(uuid,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public._mural_notify(uuid,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._teacher_notice_params(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public._notifications_audience_fill()', 'EXECUTE'), 'funções internas fechadas';
insert into r select (select prosecdef from pg_proc where proname = '_teacher_notify') and (select prosecdef from pg_proc where proname = '_mural_notify')
  and (select proconfig::text from pg_proc where proname = '_teacher_notify') like '%search_path=public%', 'security definer + search_path';

-- ===== 2. Avisos antigos =====
insert into r select (select h from _t105_before) = (select md5(string_agg(concat_ws('|', id, user_id, language_app_key, category, event_type, title, body, action_tab, read_at, clicked_at, created_at), ',' order by id)) from notifications)
  and (select n from _t105_before) = (select count(*) from notifications), 'avisos antigos: textos, datas e leitura iguais (hash e contagem)';
insert into r select (select array_agg(event_type order by id)::text from notifications where user_id = '10500000-0000-0000-0000-0000000000f1' and audience = 'teacher')
  = '{student_inactive_alert,teacher_invite_accepted,mural_post}', 'antigos da professora (aluno sumido, convite aceito, post de aluno) foram para o sino dela';
insert into r select (select array_agg(event_type order by id)::text from notifications where audience = 'self' and user_id in ('10500000-0000-0000-0000-0000000000f1', '10500000-0000-0000-0000-0000000000f2'))
  = '{xp_earned,mural_post,teacher_invite}', 'antigos do aluno (XP, recado da professora, convite recebido) ficam no sino normal';
insert into r select (select array_agg(params::text order by id)::text from notifications where user_id = '10500000-0000-0000-0000-0000000000f1' and audience = 'teacher')
  = array['{"students": [{"days": 3, "name": "Ana"}]}', '{"via": "invite", "name": "Bia"}', '{"name": "Caio", "snippet": "Oi!"}']::text
  and (select count(*) from notifications where audience = 'self' and params is not null) = 0, 'antigos da professora ganham params lidos da frase (os do aluno, não)';
insert into r select (select read_at from notifications where event_type = 'teacher_invite_accepted' and user_id = '10500000-0000-0000-0000-0000000000f1') is not null
  and (select count(*) from notifications where user_id = '10500000-0000-0000-0000-0000000000f1' and audience = 'teacher' and read_at is null) = 2, 'antigo lido continua lido; não lidos continuam não lidos';
insert into r select (select h from _t105_tmpl_before) = (select md5(string_agg(concat_ws('|', id, event_type, channel, language_app_key, title, body, active, ui_language), ',' order by id))
                                                          from notification_templates where created_by is distinct from 'teacher-bell-108'), 'modelos antigos intocados';

-- ===== 3. Contas =====
-- T professora (site em português), E professora (site em inglês), A aluno de português, B aluno de francês, C aluno de chinês
insert into auth.users(id, email) values
 ('10500000-0000-0000-0000-0000000000a1','t105@x.invalid'), ('10500000-0000-0000-0000-0000000000a2','e105@x.invalid'),
 ('10500000-0000-0000-0000-0000000000b1','a105@x.invalid'), ('10500000-0000-0000-0000-0000000000b2','b105@x.invalid'),
 ('10500000-0000-0000-0000-0000000000b3','c105@x.invalid');
insert into profiles(user_id, display_name) values
 ('10500000-0000-0000-0000-0000000000a1','Tereza Prof'), ('10500000-0000-0000-0000-0000000000a2','Emma Teacher'),
 ('10500000-0000-0000-0000-0000000000b1','Ana'), ('10500000-0000-0000-0000-0000000000b2','Bia'), ('10500000-0000-0000-0000-0000000000b3','Caio')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into progress(user_id, data) values
 ('10500000-0000-0000-0000-0000000000a1', '{"_meta":{"uiLanguage":"pt-BR","currentCourse":"frances@pt-BR"},"frances":{}}'),
 ('10500000-0000-0000-0000-0000000000a2', '{"_meta":{"uiLanguage":"en","currentCourse":"mandarim@en"},"mandarim@en":{}}'),
 ('10500000-0000-0000-0000-0000000000b1', '{"_meta":{"uiLanguage":"en","currentCourse":"portugues@en"},"portugues@en":{}}')
 on conflict (user_id) do update set data = excluded.data;
insert into account_roles(user_id, role) values ('10500000-0000-0000-0000-0000000000a1','teacher'), ('10500000-0000-0000-0000-0000000000a2','teacher');
insert into v values ('T','10500000-0000-0000-0000-0000000000a1'), ('E','10500000-0000-0000-0000-0000000000a2'),
 ('A','10500000-0000-0000-0000-0000000000b1'), ('B','10500000-0000-0000-0000-0000000000b2'), ('C','10500000-0000-0000-0000-0000000000b3');

-- ===== 4. Convite de aluno de PORTUGUÊS (antes: descartado) =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (teacher_invite_student(pg_temp.g('A')::uuid, 'portugues') ->> 'ok') = 'true', 'professora convida aluno de português';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and event_type = 'teacher_invite' and audience = 'self'
                       and language_app_key = 'portugues' and body = 'Tereza Prof invited you to be their Portuguese student 🎓') = 1,
  'aluno de português recebe o convite (no sino normal dele, em inglês)';
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'L1', (select link_id::text from my_teacher_invites() limit 1);
insert into r select (respond_teacher_invite(pg_temp.g('L1')::bigint, true) ->> 'status') = 'active', 'aluno de português aceita';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'teacher_invite_accepted'
                       and audience = 'teacher' and language_app_key = 'portugues'
                       and body = 'Ana aceitou seu convite e agora é seu aluno/a de português 🎉'
                       and params = '{"name":"Ana","via":"invite"}'::jsonb) = 1,
  'professora (site em português) recebe "aceitou" do aluno de português no sino dela, com params';

-- ===== 5. Recusa de aluno de francês, professora em inglês =====
select pg_temp.as_user(pg_temp.g('E')); set local role authenticated;
insert into r select (teacher_invite_student(pg_temp.g('B')::uuid, 'frances') ->> 'ok') = 'true', 'professora em inglês convida aluno de francês';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into v select 'L2', (select link_id::text from my_teacher_invites() limit 1);
insert into r select (respond_teacher_invite(pg_temp.g('L2')::bigint, false) ->> 'status') = 'removed', 'aluno recusa';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('E')::uuid and event_type = 'teacher_invite_declined'
                       and audience = 'teacher' and body = 'Bia declined the invitation to French classes.' and params = '{"name":"Bia"}'::jsonb) = 1,
  'professora em inglês: recusa no sino dela, texto em inglês, params';

-- ===== 6. Link de convite (chinês), professora em inglês =====
select pg_temp.as_user(pg_temp.g('E')); set local role authenticated;
insert into v select 'CODE', teacher_invite_link('mandarim') ->> 'code';
reset role;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (accept_invite_code(pg_temp.g('CODE')) ->> 'ok') = 'true', 'aluno de chinês entra pelo link';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('E')::uuid and event_type = 'teacher_invite_accepted' and audience = 'teacher'
                       and language_app_key = 'mandarim' and params = '{"name":"Caio","via":"link"}'::jsonb
                       and body = 'Caio joined through your link and is now your Chinese student 🎉') = 1, 'entrou pelo link: sino da professora, via=link';

-- ===== 7. Mural de português =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (mural_create_post('portugues', null, null, 'Hi teacher, see my homework', '[]'::jsonb) ->> 'ok') = 'true', 'aluno de português posta no mural';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'mural_post' and audience = 'teacher'
                       and language_app_key = 'portugues' and action_tab = 'teacher-mural'
                       and params = '{"name":"Ana","snippet":"Hi teacher, see my homework"}'::jsonb) = 1, 'post de aluno: sino da professora, com nome e trecho';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K', mural_save_classroom('portugues', null, 'Turma PT') ->> 'id';
insert into r select (mural_set_classroom_members(pg_temp.g('K')::bigint, array[pg_temp.g('A')]::uuid[]) ->> 'ok') = 'true', 'professora põe o aluno na turma';
insert into r select (mural_create_post('portugues', pg_temp.g('K')::bigint, null, 'Welcome!', '[]'::jsonb) ->> 'ok') = 'true', 'professora posta na turma';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and event_type in ('mural_post', 'mural_classroom')
                       and audience = 'self' and params is null) = 2, 'recado da professora e "colocou você na turma": sino normal do aluno, sem params';
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'P', (select (x ->> 'id') from jsonb_array_elements(mural_feed('portugues', pg_temp.g('K')::bigint) -> 'posts') x limit 1);
insert into r select (mural_add_comment(pg_temp.g('P')::bigint, 'Thanks!') ->> 'ok') = 'true', 'aluno comenta o recado da turma';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'mural_comment' and audience = 'teacher'
                       and params = '{"name":"Ana","snippet":"Thanks!"}'::jsonb) = 1, 'comentário de aluno: sino da professora';

-- ===== 8. Gatilho vale para quem grava pelo app e pela notification-cron =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into notifications(user_id, language_app_key, category, event_type, body, action_tab)
values (pg_temp.g('T')::uuid, 'frances', 'gamificacao', 'xp_earned', '+10 XP', null);
reset role;
insert into r select (select audience from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'xp_earned') = 'self', 'aviso do app (XP da própria professora): sino normal';
-- a cron grava com service role (aqui: dono do banco), categoria supervisao, aba admin-badges
insert into notifications(user_id, language_app_key, category, event_type, body, action_tab)
values (pg_temp.g('T')::uuid, 'portugues', 'supervisao', 'student_inactive_alert',
        'Passou uns dias sem prática por aí: Ana (3 dias), Bia Souza (7 dias). Um lembrete seu pode ajudar a retomar o ritmo.', 'admin-badges');
insert into r select (select audience from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_inactive_alert') = 'teacher', 'aluno sumido (cron, sem deploy novo): sino da professora';
insert into r select (select params from notifications where user_id = pg_temp.g('T')::uuid and event_type = 'student_inactive_alert')
  = '{"students":[{"name":"Ana","days":3},{"name":"Bia Souza","days":7}]}'::jsonb, 'aluno sumido: gatilho lê a lista de alunos (params)';
insert into r select _teacher_notice_params('student_inactive_alert', 'Haven''t shown up in a few days: Ana (1 day), Caio (14 days). Maybe it''s time to say hi 👋')
  = '{"students":[{"name":"Ana","days":1},{"name":"Caio","days":14}]}'::jsonb
  and _teacher_notice_params('student_inactive_alert', 'A few days without practice over there: student (7 days). A reminder from you might help them get back into rhythm.')
  = '{"students":[{"name":"student","days":7}]}'::jsonb
  and _teacher_notice_params('student_inactive_alert', 'Sem aparecer há alguns dias: Zé (P.) (3 dias). Talvez seja hora de mandar um alô 👋')
  = '{"students":[{"name":"Zé (P.)","days":3}]}'::jsonb
  and _teacher_notice_params('student_inactive_alert', 'Modelo novo da admin: Ana (3 dias).') is null,
  'aluno sumido: os 4 modelos (português e inglês), nome com parênteses; modelo desconhecido = sem params';
-- o app (authenticated) gravando um aviso de supervisão: o gatilho (security definer) não pode barrar o insert
select pg_temp.as_user(pg_temp.g('E')); set local role authenticated;
insert into r select pg_temp.try($q$insert into notifications(user_id, language_app_key, category, event_type, body, action_tab)
  values ('10500000-0000-0000-0000-0000000000a2', 'frances', 'supervisao', 'teacher_invite_declined', 'Bia recusou o convite para as aulas de francês.', 'teacher-panel')$q$) = 'ok',
  'insert do app numa categoria da professora passa pelo gatilho sem erro de permissão';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('E')::uuid and event_type = 'teacher_invite_declined' and audience = 'teacher' and params = '{"name":"Bia"}'::jsonb) = 2,
  'gatilho preenche params de aviso gravado sem params';

-- ===== 9. Modelos de "aluno sumido" para português =====
insert into r select (select count(*) from notification_templates where event_type = 'student_inactive_alert' and language_app_key = 'portugues')
                   = (select count(*) from notification_templates where event_type = 'student_inactive_alert' and language_app_key = 'frances')
  and (select count(*) from notification_templates where event_type = 'student_inactive_alert' and language_app_key = 'portugues') > 0,
  'modelos de aluno sumido para português = os do francês (mesma quantidade)';
insert into r select not exists (
  select ui_language, body, active from notification_templates where event_type = 'student_inactive_alert' and language_app_key = 'frances'
  except select ui_language, body, active from notification_templates where event_type = 'student_inactive_alert' and language_app_key = 'portugues'),
  'mesmos textos, mesmo idioma do site e mesmo active (inglês só ativo se o do francês estiver)';

-- ===== 10. Regras antigas mantidas =====
select _teacher_notify(pg_temp.g('T')::uuid, 'espanhol', 'supervisao', 'teacher_invite_accepted', 'z', 'teacher-panel');
insert into r select not exists (select 1 from notifications where body = 'z'), 'idioma fora da lista continua ignorado';
select _teacher_notify(null, 'frances', 'supervisao', 'teacher_invite_accepted', 'z2', 'teacher-panel');
insert into r select not exists (select 1 from notifications where body = 'z2'), 'conta nula ignorada';
insert into r select _teacher_notice_params('mural_post', 'frase nova qualquer') is null, 'frase desconhecida: sem params (o app mostra o body)';
insert into r select _teacher_notice_params('mural_post', '📌 Ana postou no mural (turma A: b): oi') = '{"name":"Ana","classroom":"A: b","snippet":"oi"}'::jsonb
  and _teacher_notice_params('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado e agora é seu aluno/a de português 🎉') = '{"name":"Caio","classroom":"Sábado","new_link":true}'::jsonb
  and _teacher_notice_params('mural_classroom_join', '🏫 Caio entrou pelo link na turma Sábado 🎉') = '{"name":"Caio","classroom":"Sábado","new_link":false}'::jsonb,
  'params: turma com dois-pontos, entrou pela turma com e sem vínculo novo';
-- RLS: cada um só lê os próprios avisos (o sino da professora lê direto da tabela)
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select count(*) from notifications where audience = 'teacher') = 0, 'aluno não enxerga avisos da professora (RLS)';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (select count(*) from notifications where audience = 'teacher') = 4, 'professora lê os 4 avisos do sino dela (aceitou, post, comentário, aluno sumido)';
update notifications set read_at = now() where audience = 'teacher' and read_at is null;
insert into r select (select count(*) from notifications where audience = 'teacher' and read_at is null) = 0
  and (select count(*) from notifications where audience = 'self' and read_at is null) = 1, '"marcar todos como lidos" do sino da professora não mexe no sino normal';
reset role;

select (case when ok then 'ok|' else 'FALHOU|' end) || name from r;
select 'RESULTADO 108 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
