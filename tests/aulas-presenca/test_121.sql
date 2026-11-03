-- 121 (Mural estilo Classroom: avisos automáticos de aula e material, capa da turma). Transação + ROLLBACK, Postgres local.
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

-- T professora; A e B alunas de T (A na turma K); X sem vínculo
insert into auth.users(id, email) values ('12100000-0000-0000-0000-0000000000a1','t121@x.invalid'),
 ('12100000-0000-0000-0000-0000000000b1','a121@x.invalid'), ('12100000-0000-0000-0000-0000000000b2','b121@x.invalid'),
 ('12100000-0000-0000-0000-0000000000b5','x121@x.invalid');
insert into profiles(user_id, display_name) values ('12100000-0000-0000-0000-0000000000a1','Tereza Prof'),
 ('12100000-0000-0000-0000-0000000000b1','Ana'), ('12100000-0000-0000-0000-0000000000b2','Bia'), ('12100000-0000-0000-0000-0000000000b5','Xavier')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('12100000-0000-0000-0000-0000000000a1','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('12100000-0000-0000-0000-0000000000a1','12100000-0000-0000-0000-0000000000b1','frances','active'),
 ('12100000-0000-0000-0000-0000000000a1','12100000-0000-0000-0000-0000000000b2','frances','active');
insert into classrooms(teacher_id, language_app_key, name) values ('12100000-0000-0000-0000-0000000000a1','frances','Turma 121');
insert into v values ('T','12100000-0000-0000-0000-0000000000a1'), ('A','12100000-0000-0000-0000-0000000000b1'),
 ('B','12100000-0000-0000-0000-0000000000b2'), ('X','12100000-0000-0000-0000-0000000000b5');
insert into v select 'K', id::text from classrooms where name = 'Turma 121';
insert into classroom_members(classroom_id, student_id) values (pg_temp.g('K')::bigint, pg_temp.g('A')::uuid);

-- ===== avisos de aula =====
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date) values (pg_temp.g('T')::uuid, pg_temp.g('A')::uuid, 'frances', '2026-10-22');
insert into v select 'L0', max(id)::text from teacher_class_logs where teacher_id = pg_temp.g('T')::uuid;
insert into r select not exists (select 1 from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L0')::bigint), 'aula sem tema nem tarefa (como as do Google) não gera aviso';
update teacher_class_logs set start_time = '10:00', duration_minutes = 60 where id = pg_temp.g('L0')::bigint;
insert into r select not exists (select 1 from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L0')::bigint), 'mudar só o horário não gera aviso';
update teacher_class_logs set topic = 'Passé composé' where id = pg_temp.g('L0')::bigint;
insert into r select (select count(*) from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L0')::bigint and student_id = pg_temp.g('A')::uuid and classroom_id is null) = 1,
  'tema preenchido: aviso no mural individual da aluna';
insert into r select (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and body like '📅 Tereza Prof registrou uma aula no mural: Passé composé%' and action_tab = 'my-mural') = 1,
  'sino da aluna com o tema';
update teacher_class_logs set homework = 'Exercícios 3 e 4' where id = pg_temp.g('L0')::bigint;
update teacher_class_logs set start_time = '11:00' where id = pg_temp.g('L0')::bigint;
insert into r select (select count(*) from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('L0')::bigint) = 1
  and (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and body like '📅%') = 1, 'editar de novo não repete aviso nem sino';

-- aula de turma
insert into teacher_class_logs(teacher_id, classroom_id, language_app_key, class_date, homework)
 values (pg_temp.g('T')::uuid, pg_temp.g('K')::bigint, 'frances', '2026-10-23', 'Ler o texto');
insert into v select 'LK', max(id)::text from teacher_class_logs where classroom_id = pg_temp.g('K')::bigint;
insert into r select (select count(*) from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('LK')::bigint and classroom_id = pg_temp.g('K')::bigint and student_id is null) = 1
  and (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and body like '📅%Ler o texto%') = 1
  and not exists (select 1 from notifications where user_id = pg_temp.g('B')::uuid and body like '📅%'), 'aula de turma: aviso no mural da turma, sino só para quem está nela';

-- aluno sem vínculo: nada
insert into teacher_class_logs(teacher_id, student_id, language_app_key, class_date, topic) values (pg_temp.g('T')::uuid, pg_temp.g('X')::uuid, 'frances', '2026-10-24', 'Sem vínculo');
insert into r select not exists (select 1 from mural_posts p join teacher_class_logs l on l.id = p.ref_id where p.kind = 'lesson' and l.student_id = pg_temp.g('X')::uuid), 'aluno sem vínculo ativo: sem aviso';

-- ===== material =====
insert into teacher_support_materials(teacher_id, student_id, language_app_key, title, link_url)
 values (pg_temp.g('T')::uuid, pg_temp.g('B')::uuid, 'frances', 'Vídeo do passé composé', 'https://exemplo.com/v');
insert into v select 'M', max(id)::text from teacher_support_materials where student_id = pg_temp.g('B')::uuid;
insert into r select (select count(*) from mural_posts where kind = 'material' and ref_id = pg_temp.g('M')::bigint and student_id = pg_temp.g('B')::uuid) = 1
  and (select count(*) from notifications where user_id = pg_temp.g('B')::uuid and body like '📎 Tereza Prof publicou um material no mural: Vídeo%') = 1, 'material novo: aviso e sino para a aluna';

-- ===== feed =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'FA', mural_feed('frances')::text;
insert into v select 'FK', mural_feed('frances', pg_temp.g('K')::bigint)::text;
reset role;
insert into r select (select count(*) from jsonb_array_elements(pg_temp.g('FA')::jsonb -> 'posts') e
                       where e ->> 'kind' = 'lesson' and e -> 'ref' ->> 'topic' = 'Passé composé' and e -> 'ref' ->> 'homework' = 'Exercícios 3 e 4'
                         and (e ->> 'can_edit')::boolean = false) = 1, 'feed da aluna: aviso com tema e tarefa da aula, sem editar';
insert into r select (pg_temp.g('FK')::jsonb -> 'classroom' ? 'cover_color') and (select count(*) from jsonb_array_elements(pg_temp.g('FK')::jsonb -> 'posts') e where e ->> 'kind' = 'lesson') = 1,
  'feed da turma: aviso da aula e a capa';
update teacher_class_logs set topic = 'Passé composé com être' where id = pg_temp.g('L0')::bigint;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'FA2', mural_feed('frances')::text;
reset role;
insert into r select (select e -> 'ref' ->> 'topic' from jsonb_array_elements(pg_temp.g('FA2')::jsonb -> 'posts') e where e ->> 'kind' = 'lesson') = 'Passé composé com être',
  'editar a aula muda o texto do aviso';
delete from teacher_class_logs where id = pg_temp.g('L0')::bigint;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'FA3', mural_feed('frances')::text;
reset role;
insert into r select not exists (select 1 from jsonb_array_elements(pg_temp.g('FA3')::jsonb -> 'posts') e where e ->> 'kind' = 'lesson'), 'aula apagada: aviso some do feed';
insert into v select 'PK', id::text from mural_posts where kind = 'lesson' and ref_id = pg_temp.g('LK')::bigint;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'CM', mural_add_comment(pg_temp.g('PK')::bigint, 'Feito!')::text;
reset role;
insert into r select (pg_temp.g('CM')::jsonb ->> 'ok')::boolean, 'aluna comenta no aviso automático';

-- ===== capa =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'C1', mural_set_cover(pg_temp.g('K')::bigint, '#C0392B', pg_temp.g('T') || '/' || pg_temp.g('T') || '/capa-1.jpg')::text;
insert into v select 'C2', mural_set_cover(pg_temp.g('K')::bigint, 'vermelho', null)::text;
insert into v select 'C3', mural_set_cover(pg_temp.g('K')::bigint, null, pg_temp.g('A') || '/x.jpg')::text;
reset role;
insert into r select (pg_temp.g('C1')::jsonb ->> 'ok')::boolean and pg_temp.g('C2')::jsonb ->> 'error' = 'invalid_color' and pg_temp.g('C3')::jsonb ->> 'error' = 'invalid_path'
  and (select cover_color from classrooms where id = pg_temp.g('K')::bigint) = '#C0392B', 'professora troca a capa; cor e caminho conferidos';
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'C4', mural_set_cover(pg_temp.g('K')::bigint, '#000000', null)::text;
insert into v select 'RA', _mural_can_read_file(pg_temp.g('T') || '/' || pg_temp.g('T') || '/capa-1.jpg')::text;
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into v select 'RB', _mural_can_read_file(pg_temp.g('T') || '/' || pg_temp.g('T') || '/capa-1.jpg')::text;
reset role;
insert into r select pg_temp.g('C4')::jsonb ->> 'error' = 'not_authorized', 'aluna não troca a capa';
insert into r select pg_temp.g('RA') = 'true' and pg_temp.g('RB') = 'false', 'foto da capa: quem está na turma lê, quem não está não';
insert into r select has_function_privilege('anon', 'mural_set_cover(bigint,text,text)', 'execute') = false
  and has_function_privilege('authenticated', '_mural_auto_post(text,bigint,uuid,text,bigint,uuid,text)', 'execute') = false, 'permissões fechadas';

select case when ok then 'ok   ' else 'FALHOU ' end || name from r;
select (select count(*) from r where ok) || '/' || (select count(*) from r) || ' verificações (121)';
rollback;
