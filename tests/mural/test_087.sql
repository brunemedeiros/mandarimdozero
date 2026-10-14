-- Etapa 4 (087, mural). Transação + ROLLBACK, Postgres local (tests/mural/run.sh).
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
-- leitura direta das tabelas (fechadas para authenticated) como dono do banco, no meio dos cenários
create or replace function pg_temp.sq(q text) returns text language plpgsql security definer as $$
declare v text; begin execute q into v; return v; end $$;
grant execute on function pg_temp.sq(text) to public;
grant usage on schema storage to authenticated;
grant select, insert, delete on storage.objects to authenticated;

-- T professora (fr), T2 outra professora, A/B/C alunos de T, D aluno de T2, X sem vínculo
insert into auth.users(id, email) values
 ('86000000-0000-0000-0000-0000000000a1','t86@x.invalid'), ('86000000-0000-0000-0000-0000000000a2','t2_86@x.invalid'),
 ('86000000-0000-0000-0000-0000000000b1','a86@x.invalid'), ('86000000-0000-0000-0000-0000000000b2','b86@x.invalid'),
 ('86000000-0000-0000-0000-0000000000b3','c86@x.invalid'), ('86000000-0000-0000-0000-0000000000b4','d86@x.invalid'),
 ('86000000-0000-0000-0000-0000000000b5','x86@x.invalid');
insert into profiles(user_id, display_name) values
 ('86000000-0000-0000-0000-0000000000a1','Tereza Prof'), ('86000000-0000-0000-0000-0000000000a2','Outra Prof'),
 ('86000000-0000-0000-0000-0000000000b1','Ana'), ('86000000-0000-0000-0000-0000000000b2','Bia'),
 ('86000000-0000-0000-0000-0000000000b3','Caio'), ('86000000-0000-0000-0000-0000000000b4','Davi'),
 ('86000000-0000-0000-0000-0000000000b5','Xavier')
 on conflict (user_id) do update set display_name = excluded.display_name;
insert into account_roles(user_id, role) values ('86000000-0000-0000-0000-0000000000a1','teacher'), ('86000000-0000-0000-0000-0000000000a2','teacher');
insert into teacher_students(teacher_id, student_id, language_app_key, status) values
 ('86000000-0000-0000-0000-0000000000a1','86000000-0000-0000-0000-0000000000b1','frances','active'),
 ('86000000-0000-0000-0000-0000000000a1','86000000-0000-0000-0000-0000000000b2','frances','active'),
 ('86000000-0000-0000-0000-0000000000a1','86000000-0000-0000-0000-0000000000b3','frances','active'),
 ('86000000-0000-0000-0000-0000000000a2','86000000-0000-0000-0000-0000000000b4','frances','active');
insert into v values ('T','86000000-0000-0000-0000-0000000000a1'), ('T2','86000000-0000-0000-0000-0000000000a2'),
 ('A','86000000-0000-0000-0000-0000000000b1'), ('B','86000000-0000-0000-0000-0000000000b2'), ('C','86000000-0000-0000-0000-0000000000b3'),
 ('D','86000000-0000-0000-0000-0000000000b4'), ('X','86000000-0000-0000-0000-0000000000b5');

-- ===== turmas =====
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (mural_save_classroom('frances', null, 'Hack') ->> 'error') = 'not_authorized', 'conta sem papel Professora não cria turma';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'K1', mural_save_classroom('frances', null, '  Turma de quinta  ') ->> 'id';
insert into v select 'K2', mural_save_classroom('frances', null, 'Conversação') ->> 'id';
insert into r select pg_temp.sq(format('select name from classrooms where id = %s', pg_temp.g('K1'))) = 'Turma de quinta', 'cria turma (nome sem espaços nas pontas)';
insert into r select (mural_save_classroom('frances', null, '') ->> 'error') = 'invalid_name', 'nome vazio recusado';
insert into r select (mural_set_classroom_members(pg_temp.g('K1')::bigint, array[pg_temp.g('A'), pg_temp.g('B'), pg_temp.g('D'), pg_temp.g('X')]::uuid[]) ->> 'ok') = 'true', 'define alunos da turma';
insert into r select pg_temp.sq(format('select array_agg(student_id::text order by student_id)::text from classroom_members where classroom_id = %s', pg_temp.g('K1'))) = array[pg_temp.g('A'), pg_temp.g('B')]::text, 'só entram alunos com vínculo ativo (D e X fora)';
insert into r select (mural_set_classroom_members(pg_temp.g('K2')::bigint, array[pg_temp.g('A')]::uuid[]) ->> 'ok') = 'true', 'aluno em mais de uma turma';
reset role;
insert into r select (select count(*) from notifications where user_id = pg_temp.g('A')::uuid and event_type = 'mural_classroom') = 2, 'aluno avisado no sino ao entrar em cada turma';
select pg_temp.as_user(pg_temp.g('T2')); set local role authenticated;
insert into r select (mural_set_classroom_members(pg_temp.g('K1')::bigint, array[pg_temp.g('D')]::uuid[]) ->> 'error') = 'not_found', 'outra professora não mexe na turma';
insert into r select (mural_save_classroom('frances', pg_temp.g('K1')::bigint, 'Roubada') ->> 'error') = 'not_found', 'outra professora não renomeia';
reset role;

-- ===== posts da professora =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'P1', mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'Aula de quinta remarcada', '[]') ->> 'id';
insert into v select 'P2', mural_create_post('frances', pg_temp.g('K1')::bigint, pg_temp.g('A')::uuid, 'Ana, revise a unidade 3', '[]') ->> 'id';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, pg_temp.g('C')::uuid, 'oi', '[]') ->> 'error') = 'not_member', 'recado para um aluno só exige aluno da turma';
insert into v select 'P3', mural_create_post('frances', null, pg_temp.g('C')::uuid, 'Caio, mural individual', '[]') ->> 'id';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, null, '   ', '[]') ->> 'error') = 'empty', 'post vazio recusado';
insert into r select (mural_create_post('frances', null, pg_temp.g('D')::uuid, 'oi', '[]') ->> 'error') = 'not_authorized', 'professora não posta para aluno de outra';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'x', ('[{"path":"' || pg_temp.g('T2') || '/' || pg_temp.g('T') || '/a.pdf","name":"a.pdf","type":"application/pdf","size":10}]')::jsonb) ->> 'error') = 'invalid_attachments', 'anexo fora da pasta da professora recusado';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'x', ('[{"path":"' || pg_temp.g('T') || '/' || pg_temp.g('T') || '/a.exe","name":"a.exe","type":"application/x-msdownload","size":10}]')::jsonb) ->> 'error') = 'invalid_attachments', 'tipo de arquivo fora de PDF/imagem recusado';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'x', ('[{"path":"' || pg_temp.g('T') || '/' || pg_temp.g('T') || '/a.pdf","name":"a.pdf","type":"application/pdf","size":10485761}]')::jsonb) ->> 'error') = 'invalid_attachments', 'arquivo acima de 10 MB recusado';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'x', (select jsonb_agg(jsonb_build_object('path', pg_temp.g('T') || '/' || pg_temp.g('T') || '/f' || i || '.png', 'name', 'f.png', 'type', 'image/png', 'size', 5)) from generate_series(1, 6) i)) ->> 'error') = 'invalid_attachments', 'mais de 5 anexos recusado';
insert into v select 'P4', mural_create_post('frances', pg_temp.g('K1')::bigint, null, '', ('[{"path":"' || pg_temp.g('T') || '/' || pg_temp.g('T') || '/aula-3.pdf","name":"Aula 3.pdf","type":"application/pdf","size":2048}]')::jsonb) ->> 'id';
insert into r select pg_temp.g('P4') is not null, 'post só com anexo aceito';
reset role;
insert into r select (select count(*) from notifications where event_type = 'mural_post' and user_id in (pg_temp.g('A')::uuid, pg_temp.g('B')::uuid)) = 5, 'turma toda avisada (A 3x, B 2x: recado só da Ana não vai para a Bia)';
insert into r select (select count(*) from notifications where event_type = 'mural_post' and user_id = pg_temp.g('C')::uuid) = 1 and (select action_tab from notifications where event_type = 'mural_post' and user_id = pg_temp.g('C')::uuid) = 'my-mural', 'aluno individual avisado, link para o mural';
insert into r select (select category from notifications where event_type = 'mural_post' limit 1) = 'mural', 'categoria mural no sino';

-- ===== leitura =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select ((mural_list('frances') -> 'as_student' -> 'classrooms' -> 0 ->> 'unread')::int + (mural_list('frances') -> 'as_student' -> 'classrooms' -> 1 ->> 'unread')::int) = 3, 'A: +3 novidades nas turmas antes de abrir';
insert into r select jsonb_array_length(mural_feed('frances', pg_temp.g('K1')::bigint) -> 'posts') = 3, 'A vê os 3 posts da turma (inclui o recado só dela)';
insert into r select (select sum((c ->> 'unread')::int) from jsonb_array_elements(mural_list('frances') -> 'as_student' -> 'classrooms') c) = 0, 'depois de abrir, +0';
insert into r select (mural_list('frances') -> 'as_teacher') = 'null'::jsonb, 'aluno não recebe lista de professora';
insert into r select (mural_feed('frances', null, null) -> 'posts') = '[]'::jsonb, 'A: mural individual vazio (o do Caio não aparece)';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select jsonb_array_length(mural_feed('frances', pg_temp.g('K1')::bigint) -> 'posts') = 2, 'B não vê o recado só da Ana';
insert into r select (mural_feed('frances', pg_temp.g('K2')::bigint) ->> 'error') = 'not_authorized', 'B não abre turma em que não está';
insert into v select 'P5', mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'Alguém tem o PDF da aula?', '[]') ->> 'id';
insert into r select pg_temp.g('P5') is not null, 'aluno cria post na turma';
insert into r select (mural_create_post('frances', pg_temp.g('K1')::bigint, pg_temp.g('A')::uuid, 'psiu', '[]') ->> 'error') = 'not_authorized', 'aluno não manda recado privado para colega';
insert into r select (mural_update_post(pg_temp.g('P5')::bigint, 'editado', '[]') ->> 'error') = 'not_authorized', 'aluno não edita o próprio post (só apaga)';
insert into r select (mural_delete_post(pg_temp.g('P1')::bigint) ->> 'error') = 'not_authorized', 'aluno não apaga post da professora';
reset role;
insert into r select (select count(*) from notifications where event_type = 'mural_post' and user_id = pg_temp.g('T')::uuid and action_tab = 'teacher-mural') = 1, 'professora avisada do post do aluno';
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (mural_feed('frances', pg_temp.g('K1')::bigint) ->> 'error') = 'not_authorized', 'C (fora da turma) não abre a turma';
insert into r select jsonb_array_length(mural_feed('frances') -> 'posts') = 1, 'C vê o próprio mural individual';
insert into v select 'P6', mural_create_post('frances', null, null, 'Professora, tenho uma dúvida', '[]') ->> 'id';
insert into r select pg_temp.sq(format('select teacher_id::text || student_id::text from mural_posts where id = %s', pg_temp.g('P6'))) = pg_temp.g('T') || pg_temp.g('C'), 'post do aluno no mural individual vai para a professora dele';
insert into r select (mural_add_comment(pg_temp.g('P1')::bigint, 'oi') ->> 'error') = 'not_authorized', 'C não comenta em post de turma alheia';
reset role;
select pg_temp.as_user(pg_temp.g('D')); set local role authenticated;
insert into r select (mural_feed('frances', pg_temp.g('K1')::bigint) ->> 'error') = 'not_authorized', 'aluno de outra professora não abre a turma';
insert into r select (mural_feed('frances', null, pg_temp.g('C')::uuid) ->> 'error') = 'not_authorized', 'aluno não abre mural individual de outro';
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (mural_feed('frances') ->> 'error') = 'no_teacher', 'sem professora: sem mural';
insert into r select (mural_list('frances') -> 'as_student') = 'null'::jsonb, 'sem professora: lista vazia';
reset role;

-- ===== comentários =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into v select 'C1', mural_add_comment(pg_temp.g('P1')::bigint, 'Combinado!') ->> 'id';
insert into v select 'C2', mural_add_comment(pg_temp.g('P5')::bigint, 'Está no material de apoio') ->> 'id';
insert into r select (mural_add_comment(pg_temp.g('P1')::bigint, '   ') ->> 'error') = 'empty', 'comentário vazio recusado';
reset role;
insert into r select (select count(*) from notifications where event_type = 'mural_comment' and user_id = pg_temp.g('T')::uuid) = 2, 'professora avisada dos comentários';
insert into r select (select count(*) from notifications where event_type = 'mural_comment' and user_id = pg_temp.g('B')::uuid) = 1, 'autora do post (Bia) avisada do comentário';
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (mural_feed('frances', pg_temp.g('K1')::bigint) #>> '{posts,0,comments,0,body}') = 'Está no material de apoio', 'colega da turma vê o comentário';
insert into r select (mural_delete_comment(pg_temp.g('C1')::bigint) ->> 'error') = 'not_authorized', 'aluno não apaga comentário de outro';
reset role;
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (mural_delete_comment(pg_temp.g('C1')::bigint) ->> 'ok') = 'true', 'aluno apaga o próprio comentário';
reset role;
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (mural_delete_comment(pg_temp.g('C2')::bigint) ->> 'ok') = 'true', 'professora apaga comentário no mural dela';

-- ===== edição e exclusão (professora) =====
insert into r select (mural_update_post(pg_temp.g('P1')::bigint, 'Aula de quinta remarcada para sexta', '[]') ->> 'ok') = 'true', 'professora edita o próprio recado';
insert into r select pg_temp.sq(format('select (edited_at is not null)::text from mural_posts where id = %s', pg_temp.g('P1'))) = 'true', 'marca editado';
insert into r select (mural_update_post(pg_temp.g('P4')::bigint, 'sem anexo agora', '[]') -> 'removed_paths' ->> 0) = pg_temp.g('T') || '/' || pg_temp.g('T') || '/aula-3.pdf', 'edição devolve o anexo removido';
insert into r select (mural_update_post(pg_temp.g('P5')::bigint, 'x', '[]') ->> 'error') = 'not_authorized', 'professora não edita post de aluno';
insert into r select (mural_delete_post(pg_temp.g('P5')::bigint) ->> 'ok') = 'true', 'professora apaga post de aluno no mural dela';
insert into r select (mural_list('frances') -> 'as_teacher') <> 'null'::jsonb, 'lista da professora';
insert into r select jsonb_array_length(mural_list('frances') #> '{as_teacher,classrooms}') = 2, 'professora vê as 2 turmas';
insert into r select (select count(*) from jsonb_array_elements(mural_list('frances') #> '{as_teacher,roster}') x where (x ->> 'in_classroom')::boolean = false) = 1, 'fora de turma: só o Caio';
insert into r select (select (x ->> 'unread')::int from jsonb_array_elements(mural_list('frances') #> '{as_teacher,roster}') x where x ->> 'id' = pg_temp.g('C')) = 1, 'professora vê +1 no mural do Caio';
insert into r select jsonb_array_length(mural_feed('frances', null, pg_temp.g('C')::uuid) -> 'posts') = 2, 'professora abre o mural individual do Caio';
reset role;

-- ===== Storage =====
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select pg_temp.try(format($q$insert into storage.objects(bucket_id, name) values ('mural', '%s/%s/foto.jpg')$q$, pg_temp.g('T'), pg_temp.g('A'))) = 'ok', 'aluno envia arquivo na pasta dele dentro da professora';
insert into r select pg_temp.try(format($q$insert into storage.objects(bucket_id, name) values ('mural', '%s/%s/foto.jpg')$q$, pg_temp.g('T'), pg_temp.g('B'))) = '42501', 'aluno não envia na pasta de outro';
insert into r select pg_temp.try(format($q$insert into storage.objects(bucket_id, name) values ('mural', '%s/%s/foto.jpg')$q$, pg_temp.g('T2'), pg_temp.g('A'))) = '42501', 'aluno não envia para professora que não é a dele';
reset role;
insert into storage.objects(bucket_id, name) values ('mural', pg_temp.g('T') || '/' || pg_temp.g('T') || '/turma.pdf');
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'P7', mural_create_post('frances', pg_temp.g('K1')::bigint, null, 'Material', ('[{"path":"' || pg_temp.g('T') || '/' || pg_temp.g('T') || '/turma.pdf","name":"turma.pdf","type":"application/pdf","size":100}]')::jsonb) ->> 'id';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (select count(*) from storage.objects where bucket_id = 'mural' and name like '%/turma.pdf') = 1, 'aluno da turma lê o anexo';
reset role;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (select count(*) from storage.objects where bucket_id = 'mural' and name like '%/turma.pdf') = 0, 'quem não vê o post não lê o anexo';
reset role;

-- ===== link da turma =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into v select 'CODE', mural_classroom_link(pg_temp.g('K2')::bigint) ->> 'code';
insert into r select pg_temp.g('CODE') ~ '^[a-z0-9]{10}$', 'gera código da turma';
insert into r select (mural_classroom_link(pg_temp.g('K2')::bigint) ->> 'code') = pg_temp.g('CODE'), 'mesmo código sem pedir outro';
reset role;
select pg_temp.as_user(null); set local role anon;
insert into r select (classroom_code_info(pg_temp.g('CODE')) ->> 'classroom_name') = 'Conversação', 'cartão da turma sem login';
insert into r select pg_temp.try('select mural_list(''frances'')') = '42501', 'sem login não chama o mural';
reset role;
select pg_temp.as_user(pg_temp.g('X')); set local role authenticated;
insert into r select (join_classroom_code(upper(pg_temp.g('CODE'))) ->> 'new_link') = 'true', 'entrar pelo link cria o vínculo';
insert into r select pg_temp.sq(format('select status from teacher_students where student_id = %L', pg_temp.g('X'))) = 'active', 'vínculo ativo';
insert into r select pg_temp.sq(format('select count(*)::text from classroom_members where classroom_id = %s and student_id = %L', pg_temp.g('K2'), pg_temp.g('X'))) = '1', 'e já está na turma';
insert into r select (join_classroom_code(pg_temp.g('CODE')) ->> 'already_member') = 'true', 'entrar de novo não duplica';
reset role;
select pg_temp.as_user(pg_temp.g('D')); set local role authenticated;
insert into r select (join_classroom_code(pg_temp.g('CODE')) ->> 'error') = 'student_has_teacher', 'aluno de outra professora não entra';
reset role;
select pg_temp.as_user(pg_temp.g('C')); set local role authenticated;
insert into r select (join_classroom_code(pg_temp.g('CODE')) ->> 'new_link') = 'false', 'aluno da própria professora só entra na turma';
reset role;
insert into r select (select count(*) from notifications where event_type = 'mural_classroom_join' and user_id = pg_temp.g('T')::uuid) = 2, 'professora avisada de quem entrou pelo link';
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select (mural_classroom_link(pg_temp.g('K2')::bigint, true) ->> 'code') <> pg_temp.g('CODE'), 'gerar outro link troca o código';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select (join_classroom_code(pg_temp.g('CODE')) ->> 'error') = 'invalid_code', 'link antigo para de funcionar';
reset role;

-- ===== desvincular =====
update teacher_students set status = 'removed' where student_id = pg_temp.g('A')::uuid;
insert into r select not exists (select 1 from classroom_members where student_id = pg_temp.g('A')::uuid), 'desvincular tira o aluno das turmas';
select pg_temp.as_user(pg_temp.g('A')); set local role authenticated;
insert into r select (mural_feed('frances', pg_temp.g('K1')::bigint) ->> 'error') = 'not_authorized', 'ex-aluno não abre mais a turma';
reset role;

-- ===== apagar turma =====
select pg_temp.as_user(pg_temp.g('T')); set local role authenticated;
insert into r select jsonb_array_length(mural_delete_classroom(pg_temp.g('K1')::bigint) -> 'removed_paths') = 1, 'apagar turma devolve os anexos para limpar';
insert into r select pg_temp.sq(format('select count(*)::text from mural_posts where classroom_id = %s', pg_temp.g('K1'))) = '0', 'posts da turma apagados junto';
reset role;
select pg_temp.as_user(pg_temp.g('B')); set local role authenticated;
insert into r select pg_temp.try('select count(*) from mural_posts') = '42501', 'tabelas fechadas para leitura direta';
reset role;

select (case when ok then 'ok|' else 'FALHA|' end) || name from r;
select 'RESULTADO 087 ' || count(*) filter (where ok) || '/' || count(*) from r;
rollback;
