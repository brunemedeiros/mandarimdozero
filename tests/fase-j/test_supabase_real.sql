-- Fase J (Painel de Tags) -- teste REAL no Postgres (Supabase). O bloco DO termina SEMPRE
-- com RAISE EXCEPTION 'RESULTS: <json>' -> rollback automático, ZERO resíduo; o JSON
-- traz cada cenário {n, ok, d}. Rodar via execute_sql (um único statement).
do $$
declare
  t uuid; s1 uuid; s2 uuid; u uuid; w uuid; l1 text; l2 text; dk bigint;
  v_email text := 'brunemed1310@gmail.com';
  v_res jsonb := '[]'::jsonb; v_json jsonb; v_n bigint; v_tags text[]; v_cnt bigint;
  o1 bigint; o2 bigint; o3 bigint; o4 bigint; o5 bigint; o6 bigint; o7 bigint; o8 bigint; o9 bigint; oboom bigint;
  tc1 bigint; tc2 bigint; tcb bigint;
  v_snap_before text; v_snap_after text; v_hist_t text; v_hist_o text; v_hist_t2 text; v_hist_o2 text;
  v_idx_t bigint; v_idx_o bigint; v_txt text; v_20 text[];
begin
  select id into t from auth.users where email = v_email;
  select student_id, language_app_key into s1, l1 from teacher_students where teacher_id = t and status = 'active' order by student_id limit 1;
  select student_id, language_app_key into s2, l2 from teacher_students where teacher_id = t and status = 'active' and student_id <> s1 order by student_id limit 1;
  select id into u from auth.users where id not in (t, s1, s2) order by created_at limit 1;
  select id into w from auth.users where id not in (t, s1, s2, u) order by created_at limit 1;
  select md5(string_agg(x::text, ',' order by id)) into v_hist_t from teacher_flashcards x;
  select md5(string_agg(x::text, ',' order by id)) into v_hist_o from own_flashcards x;
  select array_agg('n' || i) into v_20 from generate_series(1, 19) i; v_20 := array_append(v_20, 'old20');

  -- ===== fixtures (como postgres) =====
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'u@example.com')::text, true);
  set local role authenticated;
  select personal_root_deck_id into dk from ensure_user_decks(u, 'frances');
  reset role;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags, deck_id, revision) values (u, 'frances', 'o1', 'b', array['a1','saudacao','verbos'], dk, 3) returning id into o1;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags, revision) values (u, 'mandarim', 'o2', 'b', array['saudacao'], 2) returning id into o2;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags, deck_id) values (u, 'frances', 'o3', 'b', array['a1','cumprimentos','saudacao'], dk) returning id into o3;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags) values (u, 'frances', 'o4', 'b', array['saudacao','a1','cumprimentos']) returning id into o4;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags) values (u, 'frances', 'o5', 'b', '{}') returning id into o5;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags) values (u, 'frances', 'o6', 'b', array['saudacao-x','x-saudacao','saudacaox']) returning id into o6;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags, status) values (u, 'frances', 'o8', 'b', array['saudacao','z'], 'archived') returning id into o8;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags) values (u, 'frances', 'o9', 'b', v_20) returning id into o9;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, tags) values (w, 'frances', 'o7', 'b', array['saudacao','a1']) returning id into o7;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, tags, revision) values (t, s1, l1, 'tc1', 'b', array['saudacao','a1'], 4) returning id into tc1;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, tags) values (t, s2, l2, 'tc2', 'b', array['saudacao']) returning id into tc2;
  insert into teacher_students(teacher_id, student_id, language_app_key, status) values (u, s2, l2, 'active');
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, tags) values (u, s2, l2, 'tcb', 'b', array['saudacao']) returning id into tcb;
  update own_flashcards set note = 'FJ-FIXTURE' where id in (o1,o2,o3,o4,o5,o6,o8,o9,o7);
  update teacher_flashcards set note = 'FJ-FIXTURE' where id in (tc1,tc2,tcb);
  select md5(string_agg((to_jsonb(x) - 'tags')::text, ',' order by id)) into v_snap_before from own_flashcards x where id in (o1,o2,o3,o4,o5,o6,o8,o9,o7);

  -- ===== aluna/usuária u: escopo own =====
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'u@example.com')::text, true);
  set local role authenticated;
  select notes into v_cnt from list_note_tags('own') where tag = 'saudacao';
  v_res := v_res || jsonb_build_object('n', 'J1 list own: contagem de Notes da Tag (inclui idiomas e arquivada; exclui outra conta)', 'ok', coalesce((v_cnt = 5), false), 'd', ('saudacao=' || v_cnt)::text);
  select count(*) into v_cnt from list_note_tags('own') where tag = 'x-saudacao';
  v_res := v_res || jsonb_build_object('n', 'J1b list own: variantes são Tags distintas', 'ok', coalesce((v_cnt = 1), false), 'd', (v_cnt)::text);
  select count(*) into v_cnt from list_note_tags('teacher');
  v_res := v_res || jsonb_build_object('n', 'J1c list teacher por usuária: só o teacher_id dela (tcb), nada além', 'ok', coalesce((v_cnt <= 1), false), 'd', (v_cnt)::text);

  v_json := rename_note_tag('own', 'saudacao', 'cumprimentos');
  v_res := v_res || jsonb_build_object('n', 'J2 rename own: 5 Notes afetadas, 2 fundidas (destino já existia)', 'ok', coalesce(((v_json->>'affected')::int = 5 and (v_json->>'merged')::int = 2), false), 'd', (v_json)::text);
  select tags into v_tags from own_flashcards where id = o1;
  v_res := v_res || jsonb_build_object('n', 'J2a ordem das demais preservada, troca in-place', 'ok', coalesce((v_tags = array['a1','cumprimentos','verbos']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o3;
  v_res := v_res || jsonb_build_object('n', 'J3a colisão: sem duplicata (a1,cumprimentos,saudacao -> a1,cumprimentos)', 'ok', coalesce((v_tags = array['a1','cumprimentos']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o4;
  v_res := v_res || jsonb_build_object('n', 'J3b colisão: fusão na posição da 1ª ocorrência', 'ok', coalesce((v_tags = array['cumprimentos','a1']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o2;
  v_res := v_res || jsonb_build_object('n', 'J2b outro idioma renomeado também', 'ok', coalesce((v_tags = array['cumprimentos']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o8;
  v_res := v_res || jsonb_build_object('n', 'J2c Note arquivada também é renomeada', 'ok', coalesce((v_tags = array['cumprimentos','z']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o6;
  v_res := v_res || jsonb_build_object('n', 'J4 substring/variantes intactas (igualdade exata)', 'ok', coalesce((v_tags = array['saudacao-x','x-saudacao','saudacaox']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o5;
  v_res := v_res || jsonb_build_object('n', 'J4b Note sem tags intacta', 'ok', coalesce((v_tags = '{}'), false), 'd', (array_to_string(v_tags, ','))::text);
  select count(*) into v_cnt from (select 1 from own_flashcards where id in (o1,o2,o3,o4,o8) and (select count(*) from unnest(tags) x) <> (select count(distinct x) from unnest(tags) x)) q;
  v_res := v_res || jsonb_build_object('n', 'J3c nenhum array com duplicata', 'ok', coalesce((v_cnt = 0), false), 'd', (v_cnt)::text);

  v_json := rename_note_tag('own', 'cumprimentos', 'cumprimentos');
  v_res := v_res || jsonb_build_object('n', 'J5 mesmo slug: unchanged, 0 alterações', 'ok', coalesce(((v_json->>'unchanged')::boolean and (v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  v_json := rename_note_tag('own', 'inexistente', 'outro');
  v_res := v_res || jsonb_build_object('n', 'J5b rename de Tag inexistente: 0 linhas', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);

  begin
    perform rename_note_tag('own', 'a1', 'Saudação');
    v_res := v_res || jsonb_build_object('n', 'J6a slug não canônico (maiúscula/acento) rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6a slug não canônico (maiúscula/acento) rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_tag')::text);
  end;
  begin
    perform rename_note_tag('own', 'a1', repeat('a', 51));
    v_res := v_res || jsonb_build_object('n', 'J6b 51 caracteres rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6b 51 caracteres rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_tag')::text);
  end;
  begin
    perform rename_note_tag('own', 'a1', '');
    v_res := v_res || jsonb_build_object('n', 'J6c vazio rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6c vazio rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_tag')::text);
  end;
  begin
    perform rename_note_tag('own', 'a1', '-x-');
    v_res := v_res || jsonb_build_object('n', 'J6d hífen nas pontas rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6d hífen nas pontas rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_tag')::text);
  end;
  begin
    perform rename_note_tag('todos', 'a1', 'b');
    v_res := v_res || jsonb_build_object('n', 'J6e escopo inválido rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6e escopo inválido rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_scope')::text);
  end;
  begin
    perform delete_note_tag('own', 'A1');
    v_res := v_res || jsonb_build_object('n', 'J6f delete: slug não canônico rejeitado', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when sqlstate '22023' then
    v_res := v_res || jsonb_build_object('n', 'J6f delete: slug não canônico rejeitado', 'ok', coalesce((true), false), 'd', ('invalid_tag')::text);
  end;

  v_json := rename_note_tag('own', 'old20', 'new20');
  select cardinality(tags) into v_cnt from own_flashcards where id = o9;
  v_res := v_res || jsonb_build_object('n', 'J7 limite 20: rename mantém 20 e passa no CHECK', 'ok', coalesce((v_cnt = 20 and (v_json->>'affected')::int = 1), false), 'd', (v_cnt)::text);
  v_json := rename_note_tag('own', 'new20', repeat('b', 50));
  select tags[20] into v_txt from own_flashcards where id = o9;
  v_res := v_res || jsonb_build_object('n', 'J7b tag de 50 chars aceita', 'ok', coalesce((v_txt = repeat('b', 50)), false), 'd', (length(v_txt))::text);

  v_json := delete_note_tag('own', 'a1');
  v_res := v_res || jsonb_build_object('n', 'J8 delete own: Notas afetadas (o1,o3,o4)', 'ok', coalesce(((v_json->>'affected')::int = 3), false), 'd', (v_json)::text);
  select tags into v_tags from own_flashcards where id = o1;
  v_res := v_res || jsonb_build_object('n', 'J8a delete remove só a Tag e preserva as outras', 'ok', coalesce((v_tags = array['cumprimentos','verbos']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from own_flashcards where id = o4;
  v_res := v_res || jsonb_build_object('n', 'J8b delete: ordem das restantes', 'ok', coalesce((v_tags = array['cumprimentos']), false), 'd', (array_to_string(v_tags, ','))::text);
  v_json := delete_note_tag('own', 'a1');
  v_res := v_res || jsonb_build_object('n', 'J8c delete de Tag que já não existe: 0', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  select tags into v_tags from own_flashcards where id = o5;
  v_res := v_res || jsonb_build_object('n', 'J8d Note sem tags intacta no delete', 'ok', coalesce((v_tags = '{}'), false), 'd', (array_to_string(v_tags, ','))::text);

  -- ===== fronteira de propriedade: usuária u tentando teacher =====
  v_json := rename_note_tag('teacher', 'saudacao', 'hack');
  v_res := v_res || jsonb_build_object('n', 'J9 usuária não-admin NÃO renomeia nem o próprio teacher_id (RLS admin-only): 0 linhas', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  v_json := delete_note_tag('teacher', 'saudacao');
  v_res := v_res || jsonb_build_object('n', 'J9b usuária NÃO exclui Tag de Teacher Cards', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  reset role;
  select tags into v_tags from teacher_flashcards where id = tcb;
  v_res := v_res || jsonb_build_object('n', 'J9c Teacher Card cujo teacher_id = u (não admin) permanece intacto: RLS admin-only', 'ok', coalesce((v_tags = array['saudacao']), false), 'd', (array_to_string(v_tags, ','))::text);

  -- ===== aluno s1 com Teacher Card: não altera =====
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated', 'email', 'aluno@example.com')::text, true);
  set local role authenticated;
  v_json := rename_note_tag('teacher', 'saudacao', 'hack');
  v_res := v_res || jsonb_build_object('n', 'J10 aluno do Teacher Card NÃO renomeia', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  v_json := rename_note_tag('own', 'saudacao', 'hack');
  v_res := v_res || jsonb_build_object('n', 'J10b aluno com scope own só atinge as próprias (0)', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  select count(*) into v_cnt from list_note_tags('teacher');
  v_res := v_res || jsonb_build_object('n', 'J10c aluno não lista Tags de teacher no painel', 'ok', coalesce((v_cnt = 0), false), 'd', (v_cnt)::text);
  reset role;
  select tags into v_tags from teacher_flashcards where id = tc1;
  v_res := v_res || jsonb_build_object('n', 'J10d Teacher Card do aluno intacto', 'ok', coalesce((v_tags = array['saudacao','a1']), false), 'd', (array_to_string(v_tags, ','))::text);

  -- ===== professora (admin): escopo teacher, todos alunos/idiomas =====
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', v_email)::text, true);
  set local role authenticated;
  select notes into v_cnt from list_note_tags('teacher') where tag = 'saudacao';
  v_res := v_res || jsonb_build_object('n', 'J11 professora lista com contagem cobrindo TODOS os alunos (tc1+tc2; sem o de outra professora)', 'ok', coalesce((v_cnt >= 2), false), 'd', (v_cnt)::text);
  v_json := rename_note_tag('teacher', 'saudacao', 'cumprimentos');
  v_res := v_res || jsonb_build_object('n', 'J12 professora renomeia em vários alunos/idiomas sem escolher aluno', 'ok', coalesce(((v_json->>'affected')::int >= 2), false), 'd', (v_json)::text);
  select tags into v_tags from teacher_flashcards where id = tc1;
  v_res := v_res || jsonb_build_object('n', 'J12a tc1 renomeado, ordem preservada', 'ok', coalesce((v_tags = array['cumprimentos','a1']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from teacher_flashcards where id = tc2;
  v_res := v_res || jsonb_build_object('n', 'J12b tc2 (outro aluno/idioma) renomeado', 'ok', coalesce((v_tags = array['cumprimentos']), false), 'd', (array_to_string(v_tags, ','))::text);
  select tags into v_tags from teacher_flashcards where id = tcb;
  v_res := v_res || jsonb_build_object('n', 'J12c Teacher Card de OUTRA professora intacto', 'ok', coalesce((v_tags = array['saudacao']), false), 'd', (array_to_string(v_tags, ','))::text);
  v_json := delete_note_tag('teacher', 'a1');
  select tags into v_tags from teacher_flashcards where id = tc1;
  v_res := v_res || jsonb_build_object('n', 'J13 professora exclui só a Tag escolhida', 'ok', coalesce((v_tags = array['cumprimentos']), false), 'd', (array_to_string(v_tags, ','))::text);
  v_json := delete_note_tag('teacher', 'cumprimentos');
  select tags into v_tags from teacher_flashcards where id = tc2;
  v_res := v_res || jsonb_build_object('n', 'J13b delete atravessa alunos; Note fica com tags vazias', 'ok', coalesce((v_tags = '{}'), false), 'd', (array_to_string(v_tags, ','))::text);
  select count(*) into v_cnt from own_flashcards where owner_id = u and tags @> array['cumprimentos'];
  v_res := v_res || jsonb_build_object('n', 'J14 professora NÃO atinge own_flashcards (a professora não enxerga own de outra conta)', 'ok', coalesce((v_cnt = 0), false), 'd', (v_cnt)::text);
  reset role;
  select count(*) into v_cnt from own_flashcards where id in (o2,o3) and tags @> array['cumprimentos'];
  v_res := v_res || jsonb_build_object('n', 'J14b own de u continua com ''cumprimentos'' (escopo teacher não cruza)', 'ok', coalesce((v_cnt = 2), false), 'd', (v_cnt)::text);

  -- ===== outra conta w: não afeta u =====
  select tags into v_tags from own_flashcards where id = o7;
  v_res := v_res || jsonb_build_object('n', 'J15 conta w (o7) nunca foi alterada pelas operações de u', 'ok', coalesce((v_tags = array['saudacao','a1']), false), 'd', (array_to_string(v_tags, ','))::text);
  perform set_config('request.jwt.claims', json_build_object('sub', w, 'role', 'authenticated', 'email', 'w@example.com')::text, true);
  set local role authenticated;
  v_json := rename_note_tag('own', 'cumprimentos', 'x');
  v_res := v_res || jsonb_build_object('n', 'J15b conta w renomeando ''cumprimentos'' atinge 0 linhas (só tem as dela)', 'ok', coalesce(((v_json->>'affected')::int = 0), false), 'd', (v_json)::text);
  reset role;

  -- ===== integridade: só `tags` muda =====
  select md5(string_agg((to_jsonb(x) - 'tags')::text, ',' order by id)) into v_snap_after from own_flashcards x where id in (o1,o2,o3,o4,o5,o6,o8,o9,o7);
  v_res := v_res || jsonb_build_object('n', 'J16 own: id/revision/deck_id/fields/status/FSRS-não-tags idênticos (hash exceto tags)', 'ok', coalesce((v_snap_before = v_snap_after), false), 'd', (v_snap_before || ' / ' || v_snap_after)::text);
  select revision into v_n from own_flashcards where id = o1;
  v_res := v_res || jsonb_build_object('n', 'J16b revision preservada (o1 = 3)', 'ok', coalesce((v_n = 3), false), 'd', (v_n)::text);
  select revision into v_n from teacher_flashcards where id = tc1;
  v_res := v_res || jsonb_build_object('n', 'J16c revision preservada em teacher (tc1 = 4)', 'ok', coalesce((v_n = 4), false), 'd', (v_n)::text);
  select deck_id into v_idx_o from own_flashcards where id = o1;
  v_res := v_res || jsonb_build_object('n', 'J16d deck_id preservado', 'ok', coalesce((v_idx_o = dk), false), 'd', (v_idx_o)::text);

  -- ===== segurança =====
  v_res := v_res || jsonb_build_object('n', 'J17 anon sem EXECUTE nas 3 RPCs', 'ok', coalesce((not has_function_privilege('anon', 'rename_note_tag(text,text,text)', 'execute') and not has_function_privilege('anon', 'delete_note_tag(text,text)', 'execute') and not has_function_privilege('anon', 'list_note_tags(text)', 'execute')), false), 'd', ('ok')::text);
  v_res := v_res || jsonb_build_object('n', 'J17b RPCs são SECURITY INVOKER (não DEFINER)', 'ok', coalesce((not exists (select 1 from pg_proc where proname in ('rename_note_tag','delete_note_tag','list_note_tags') and prosecdef)), false), 'd', ('ok')::text);
  v_res := v_res || jsonb_build_object('n', 'J17c RLS continua ativa nas 2 tabelas', 'ok', coalesce(((select bool_and(relrowsecurity) from pg_class where relname in ('own_flashcards','teacher_flashcards'))), false), 'd', ('ok')::text);
  v_res := v_res || jsonb_build_object('n', 'J17d nenhuma tabela `tags` criada', 'ok', coalesce((not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name ilike '%tag%')), false), 'd', ('ok')::text);

  -- ===== atomicidade: erro no meio não deixa metade =====
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, note, tags) values (u, 'frances', 'az1', 'b', 'FJ-FIXTURE', array['zz','k']) returning id into oboom;
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, note, tags) values (u, 'frances', 'az2', 'b', 'FJ-FIXTURE', array['zz']);
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, note, tags) values (u, 'frances', 'boom', 'b', 'FJ-FIXTURE', array['zz']);
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, note, tags) values (u, 'frances', 'az3', 'b', 'FJ-FIXTURE', array['zz','k']);
  execute 'create or replace function public.tg_boom_tmp() returns trigger language plpgsql as $f$ begin if new.front = ''boom'' then raise exception ''boom''; end if; return new; end $f$';
  create trigger zz_boom before update on own_flashcards for each row execute function public.tg_boom_tmp();
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'u@example.com')::text, true);
  set local role authenticated;
  begin
    perform rename_note_tag('own', 'zz', 'yy');
    v_res := v_res || jsonb_build_object('n', 'J18 erro forçado deveria abortar', 'ok', coalesce((false), false), 'd', ('passou')::text);
  exception when others then
    v_res := v_res || jsonb_build_object('n', 'J18 erro no meio abortou a operação', 'ok', coalesce((sqlerrm = 'boom'), false), 'd', (sqlerrm)::text);
  end;
  reset role;
  select count(*) into v_cnt from own_flashcards where owner_id = u and front in ('az1','az2','boom','az3') and tags @> array['zz'];
  v_res := v_res || jsonb_build_object('n', 'J18b rollback: TODAS as 4 linhas continuam com ''zz'' (nenhuma metade)', 'ok', coalesce((v_cnt = 4), false), 'd', (v_cnt)::text);
  select count(*) into v_cnt from own_flashcards where owner_id = u and tags @> array['yy'];
  v_res := v_res || jsonb_build_object('n', 'J18c nenhuma linha com o destino ''yy''', 'ok', coalesce((v_cnt = 0), false), 'd', (v_cnt)::text);
  drop trigger zz_boom on own_flashcards;

  -- ===== nenhum dado histórico alterado =====
  select md5(string_agg(x::text, ',' order by id)) into v_hist_t2 from teacher_flashcards x where note is distinct from 'FJ-FIXTURE';
  select md5(string_agg(x::text, ',' order by id)) into v_hist_o2 from own_flashcards x where note is distinct from 'FJ-FIXTURE';
  v_res := v_res || jsonb_build_object('n', 'J19 linhas históricas de teacher_flashcards idênticas', 'ok', coalesce((v_hist_t is not distinct from v_hist_t2), false), 'd', (v_hist_t)::text);
  v_res := v_res || jsonb_build_object('n', 'J19b linhas históricas de own_flashcards idênticas', 'ok', coalesce((v_hist_o is not distinct from v_hist_o2), false), 'd', (v_hist_o)::text);

  raise exception 'RESULTS: %', v_res::text;
end $$;
