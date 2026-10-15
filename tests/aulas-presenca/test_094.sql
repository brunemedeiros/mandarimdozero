-- 094 (Presença, Competências, aula de turma). Transação + ROLLBACK, Postgres local (tests/aulas-presenca/run.sh).
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
begin execute q; return 'ok'; exception when others then return sqlstate; end $$;
grant execute on function pg_temp.try(text) to public;
create or replace function pg_temp.g(key text) returns text language sql as $$ select val from v where k = key $$;
grant execute on function pg_temp.g(text) to public;

-- T professora (fr), T2 outra professora, A e B alunos de T, X sem vínculo
insert into auth.users(id, email) values
 ('94000000-0000-0000-0000-0000000000a1','t94@x.invalid'), ('94000000-0000-0000-0000-0000000000a2','t2_94@x.invalid'),
 ('94000000-0000-0000-0000-0000000000b1','a94@x.invalid'), ('94000000-0000-0000-0000-0000000000b2','b94@x.invalid'),
 ('94000000-0000-0000-0000-0000000000b5','x94@x.invalid');
insert into profiles(user_id, display_name) values
 ('94000000-0000-0000-0000-0000000000a1','Tereza Prof'), ('94000000-0000-0000-0000-0000000000a2','Outra Prof'),
 ('94000000-0000-0000-0000-0000000000b1','Ana'), ('94000000-0000-0000-0000-0000000000b2','Bia'), ('94000000-0000-0000-0000-0000000000b5','Xavier')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('94000000-0000-0000-0000-0000000000a1','teacher'), ('94000000-0000-0000-0000-0000000000a2','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('94000000-0000-0000-0000-0000000000a1','94000000-0000-0000-0000-0000000000b1','frances','active'),
 ('94000000-0000-0000-0000-0000000000a1','94000000-0000-0000-0000-0000000000b2','frances','active');
insert into v values ('T','94000000-0000-0000-0000-0000000000a1'), ('T2','94000000-0000-0000-0000-0000000000a2'),
 ('A','94000000-0000-0000-0000-0000000000b1'), ('B','94000000-0000-0000-0000-0000000000b2'), ('X','94000000-0000-0000-0000-0000000000b5');

-- ===== rótulos =====
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select pg_temp.try('select ensure_class_attendance_labels()') = 'P0001', 'conta sem papel Professora não cria rótulos';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (select string_agg(name || ':' || color || ':' || counts_as, ',' order by sort_order) from ensure_class_attendance_labels()) = 'Presente:green:present,Faltou:red:absent', 'padrão: Presente verde e Faltou vermelho';
insert into r select (select count(*) from ensure_class_attendance_labels()) = 2, 'chamar de novo não duplica';
insert into class_attendance_labels(teacher_id, name, color, sort_order) values (pg_temp.g('T')::uuid, 'Remarcada', 'yellow', 3);
insert into r select pg_temp.try($q$insert into class_attendance_labels(teacher_id, name, color) values ('94000000-0000-0000-0000-0000000000a1', 'Rosa', 'magenta')$q$) = '23514', 'cor fora da lista recusada';
insert into r select pg_temp.try($q$insert into class_attendance_labels(teacher_id, name, color) values ('94000000-0000-0000-0000-0000000000a2', 'Hack', 'red')$q$) = '42501', 'não cria rótulo em nome de outra professora';
insert into v select 'L_PRES', id::text from class_attendance_labels where name = 'Presente';
insert into v select 'L_FALT', id::text from class_attendance_labels where name = 'Faltou';
update class_attendance_labels set name = 'Presente ✅' where id = pg_temp.g('L_PRES')::bigint;
insert into r select (select name from class_attendance_labels where id = pg_temp.g('L_PRES')::bigint) = 'Presente ✅', 'professora renomeia o rótulo';
reset role;
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into r select (select count(*) from class_attendance_labels) = 0, 'outra professora não vê os rótulos';
insert into v select 'L_T2', (select id::text from ensure_class_attendance_labels() limit 1);
reset role;

-- ===== turma =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K1', mural_save_classroom('frances', null, 'Dupla') ->> 'id';
select mural_set_classroom_members(pg_temp.g('K1')::bigint, array[pg_temp.g('A')]::uuid[]);

-- ===== aulas =====
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic, attendance_label_id, skills, notes)
values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', '2026-10-01', 'Passé composé', pg_temp.g('L_PRES')::bigint, array['gramatica','conversacao'], 'nota privada');
insert into r select true, 'aula de aluno com Presença e Competências';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, student_id, language_app_key, skills) values ('%s', '%s', 'frances', array['pontualidade'])$q$, pg_temp.g('T'), pg_temp.g('A'))) = '23514', 'competência fora da lista recusada';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, student_id, language_app_key, attendance_label_id) values ('%s', '%s', 'frances', %s)$q$, pg_temp.g('T'), pg_temp.g('A'), pg_temp.g('L_T2'))) = '42501', 'rótulo de outra professora recusado';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, student_id, language_app_key) values ('%s', '%s', 'frances')$q$, pg_temp.g('T'), pg_temp.g('X'))) = '42501', 'aluno sem vínculo recusado (como antes)';
insert into teacher_class_logs(teacher_id, classroom_id, language_app_key, class_date, topic, attendance_label_id, skills, notes)
values (pg_temp.g('T')::uuid, pg_temp.g('K1')::bigint, 'frances', '2026-10-02', 'Aula da dupla', pg_temp.g('L_FALT')::bigint, array['escuta'], 'nota da turma');
insert into r select true, 'aula de turma (sem aluno)';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, classroom_id, language_app_key) values ('%s', %s, 'mandarim')$q$, pg_temp.g('T'), pg_temp.g('K1'))) = '42501', 'turma de outro idioma recusada';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, language_app_key, topic) values ('%s', 'frances', 'x')$q$, pg_temp.g('T'))) in ('23514', '42501'), 'aula sem aluno e sem turma recusada';
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, student_id, classroom_id, language_app_key) values ('%s', '%s', %s, 'frances')$q$, pg_temp.g('T'), pg_temp.g('A'), pg_temp.g('K1'))) = '23514', 'aluno e turma ao mesmo tempo recusado';
insert into r select (select count(*) from teacher_class_logs where classroom_id = pg_temp.g('K1')::bigint) = 1, 'professora lê a aula da turma';
reset role;
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into r select pg_temp.try(format($q$insert into teacher_class_logs(teacher_id, classroom_id, language_app_key) values ('%s', %s, 'frances')$q$, pg_temp.g('T2'), pg_temp.g('K1'))) = '42501', 'outra professora não registra na turma';
insert into r select (select count(*) from teacher_class_logs) = 0, 'outra professora não vê as aulas';
reset role;

-- ===== leitura do aluno =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select string_agg(coalesce(topic,'') || '|' || coalesce(attendance_name,'') || '|' || coalesce(attendance_color,'') || '|' || array_to_string(skills, '+') || '|' || coalesce(classroom_name,'-'), ' ; ' order by class_date) from get_my_class_log_entries('frances'))
  = 'Passé composé|Presente ✅|green|gramatica+conversacao|- ; Aula da dupla|Faltou|red|escuta|Dupla', 'aluno A vê a aula dele e a da turma, com Presença e Competências';
insert into r select pg_temp.try('select notes from get_my_class_log_entries(''frances'')') = '42703', 'nunca devolve as Anotações (nota privada)';
insert into r select (select count(*) from teacher_class_logs) = 0, 'aluno não lê a tabela direto';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (select count(*) from get_my_class_log_entries('frances')) = 0, 'aluno B (fora da turma) não vê nada';
reset role;
update teacher_students set status = 'removed' where student_id = pg_temp.g('A')::uuid;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (select count(*) from get_my_class_log_entries('frances')) = 0, 'sem vínculo ativo o aluno não vê mais';
reset role;
update teacher_students set status = 'active' where student_id = pg_temp.g('A')::uuid;

-- ===== apagar turma com aula / rótulo =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select pg_temp.try(format('select mural_delete_classroom(%s)', pg_temp.g('K1'))) = '23503', 'turma com aula registrada não é apagada (histórico preservado)';
reset role;
delete from class_attendance_labels where id = pg_temp.g('L_FALT')::bigint;
insert into r select (select attendance_label_id from teacher_class_logs where classroom_id = pg_temp.g('K1')::bigint) is null, 'rótulo apagado: aula fica sem Presença, não some';
insert into r select (select count(*) from teacher_class_logs where teacher_id = pg_temp.g('T')::uuid) = 2, 'aulas continuam lá';
insert into r select has_function_privilege('anon', 'get_my_class_log_entries(text)', 'execute') = false
  and has_function_privilege('anon', 'ensure_class_attendance_labels()', 'execute') = false, 'anon sem execute nas funções novas';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações';
rollback;
