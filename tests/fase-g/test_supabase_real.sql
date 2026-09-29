-- Fase G -- teste REAL no Postgres (Supabase): ensure_teacher_decks (migration
-- 053) + regras de Teacher Deck/RLS/triggers. Tudo numa transação terminada
-- em ROLLBACK (zero resíduo). Usa a professora real (admin), 2 alunos que ela
-- realmente tem vinculados em francês e mais 1 usuário qualquer como "outra
-- professora". Cada linha do SELECT final é um cenário; `ok` deve ser true.
begin;
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated;
do $$
declare
  ADMIN_EMAIL constant text := 'brunemed1310@gmail.com';
  t uuid; s1 uuid; s2 uuid; u uuid; nolink uuid;
  a1 bigint; a2 bigint; b1 bigint; troot2 bigint; troot_b bigint; sub1 bigint; sub2 bigint; subb bigint;
  v_root1 bigint; v_pr1 bigint; v_course bigint; v_id bigint; v_n int; v_hist bigint[];
  v_fields jsonb := '[{"id":"f1","lang":"fr","role":null,"content":{"value":"a"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"f2","lang":"pt-BR","role":null,"content":{"value":"b"},"audio":null,"image":null,"pinyinFieldId":null}]'::jsonb;
  r record; msg text; okflag boolean;
begin
  select id into t from auth.users where email = ADMIN_EMAIL;
  select student_id into s1 from teacher_students where teacher_id = t and language_app_key = 'frances' and status = 'active' order by student_id limit 1;
  select student_id into s2 from teacher_students where teacher_id = t and language_app_key = 'frances' and status = 'active' and student_id <> s1 order by student_id limit 1;
  select id into u from auth.users where id not in (t, s1, s2) order by created_at limit 1;
  select id into nolink from auth.users where id not in (t, s1, s2, u)
     and id not in (select student_id from teacher_students where teacher_id = t) order by created_at limit 1;
  select array_agg(id) into v_hist from teacher_flashcards where deck_id is null;
  -- "outra professora" u: vínculo ativo com s1 em francês (só dentro da transação)
  insert into teacher_students(teacher_id, student_id, language_app_key, status) values (u, s1, 'frances', 'active');
  insert into decks(kind, name, language_app_key) values ('course', 'curso-teste-g', 'frances') returning id into v_course;

  -- ===== A. bootstrap (sessão da professora = admin) =====
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  select teacher_root_deck_id into a1 from ensure_teacher_decks(s1, 'frances');
  select teacher_root_deck_id into a2 from ensure_teacher_decks(s1, 'frances');
  insert into results values ('1. ensure_teacher_decks 2x devolve o mesmo teacher_root', a1 is not null and a1 = a2, null);
  select count(*) into v_n from decks where kind = 'teacher_root' and owner_id = s1 and teacher_id = t and language_app_key = 'frances';
  insert into results values ('1b. 2 chamadas não duplicam nada (1 teacher_root)', v_n = 1, v_n::text);
  select count(*) into v_n from decks where kind = 'root' and owner_id = s1 and language_app_key = 'frances';
  insert into results values ('1c. root do aluno criado via ensure_user_decks (1 só)', v_n = 1, v_n::text);
  select count(*) into v_n from decks d where d.id = a1 and d.owner_id = s1 and d.teacher_id = t and d.language_app_key = 'frances' and d.parent_deck_id = (select id from decks where kind='root' and owner_id = s1 and language_app_key='frances');
  insert into results values ('2. teacher_root: aluno/professora/idioma/pai(root) corretos', v_n = 1, null);
  select teacher_root_deck_id into troot2 from ensure_teacher_decks(s2, 'frances');
  insert into results values ('9/10. dois alunos: teacher_roots (árvores) diferentes', troot2 is not null and troot2 <> a1, null);
  select count(*) into v_n from decks where id = troot2 and owner_id = s2 and teacher_id = t;
  insert into results values ('10b. teacher_root do aluno 2 pertence ao aluno 2', v_n = 1, null);

  -- ===== B. autorização do bootstrap =====
  for r in select * from (values
      ('idioma sem vínculo (mandarim)', s1, 'mandarim'),
      ('aluno sem vínculo ativo', nolink, 'frances'),
      ('idioma inválido', s1, 'klingon')) x(n, sid, lang) loop
    begin
      perform ensure_teacher_decks(r.sid, r.lang);
      insert into results values ('rejeitado: ' || r.n, false, 'PASSOU');
    exception when others then
      insert into results values ('rejeitado: ' || r.n, true, sqlerrm);
    end;
  end loop;

  -- ===== C. sessão da "outra professora" u (não-admin, vínculo só com s1) =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'outra@example.com')::text, true);
  set local role authenticated;
  begin
    perform ensure_teacher_decks(s2, 'frances');
    insert into results values ('4b. professora B não cria árvore p/ aluno de outra professora', false, 'PASSOU');
  exception when others then insert into results values ('4b. professora B não cria árvore p/ aluno de outra professora', sqlerrm = 'not_authorized', sqlerrm); end;
  begin
    select teacher_root_deck_id into troot_b from ensure_teacher_decks(s1, 'frances');
    insert into results values ('4c. professora B (com vínculo) cria a SUA árvore p/ o mesmo aluno, separada da de A', troot_b is not null and troot_b <> a1, null);
  exception when others then insert into results values ('4c. professora B (com vínculo) cria a SUA árvore p/ o mesmo aluno, separada da de A', false, sqlerrm); end;
  -- B não vê/edita/cria na árvore de A
  select count(*) into v_n from decks where id = a1;
  insert into results values ('2b. professora B não enxerga o teacher_root da professora A', v_n = 0, v_n::text);
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, u, a1, 'teacher', 'invasao', 'frances');
    insert into results values ('2c. professora B não cria Deck sob a árvore de A', false, 'INSERIU');
  exception when others then insert into results values ('2c. professora B não cria Deck sob a árvore de A', true, sqlerrm); end;
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, a1, 'teacher', 'falsa-identidade', 'frances');
    insert into results values ('2d. professora B não cria Deck com teacher_id de A', false, 'INSERIU');
  exception when others then insert into results values ('2d. professora B não cria Deck com teacher_id de A', true, sqlerrm); end;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, u, troot_b, 'teacher', 'sub-b', 'frances') returning id into subb;
  insert into results values ('16b. professora B cria subdeck na própria árvore', subb is not null, null);

  -- ===== D. aluno s1 =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated', 'email', 'aluno@example.com')::text, true);
  set local role authenticated;
  for r in select * from (values ('aluno cria árvore p/ si', s1), ('aluno cria árvore p/ outro', s2)) x(n, sid) loop
    begin
      perform ensure_teacher_decks(r.sid, 'frances');
      insert into results values ('4. rejeitado: ' || r.n, false, 'PASSOU');
    exception when others then insert into results values ('4. rejeitado: ' || r.n, sqlerrm = 'not_authorized', sqlerrm); end;
  end loop;
  select count(*) into v_n from decks where id in (a1, troot_b) and owner_id = s1;
  insert into results values ('15a. aluno LÊ os Teacher Decks que recebeu (de A e de B)', v_n = 2, v_n::text);
  update decks set name = 'hack' where id = a1;
  get diagnostics v_n = row_count;
  insert into results values ('15b. aluno não renomeia Teacher Deck (0 linhas)', v_n = 0, v_n::text);
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, a1, 'teacher', 'aluno-cria', 'frances');
    insert into results values ('15c. aluno não cria subdeck de professora', false, 'INSERIU');
  exception when others then insert into results values ('15c. aluno não cria subdeck de professora', true, sqlerrm); end;
  delete from decks where id = a1;
  get diagnostics v_n = row_count;
  insert into results values ('15d. aluno não apaga Teacher Deck (0 linhas)', v_n = 0, v_n::text);

  -- ===== E. professora A organiza a própria árvore =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, a1, 'teacher', 'Aulas', 'frances') returning id into sub1;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, sub1, 'teacher', 'Verbos', 'frances') returning id into sub2;
  insert into results values ('7/16. subdeck sob teacher_root e sob outro subdeck', sub1 is not null and sub2 is not null, null);
  select id into b1 from decks where kind = 'teacher' and owner_id = s2 limit 1;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s2, t, troot2, 'teacher', 'Aulas', 'frances') returning id into b1;
  for r in select * from (values
      ('mover p/ Deck da árvore de OUTRO aluno', format('update decks set parent_deck_id = %s where id = %s', b1, sub2)),
      ('mover p/ teacher_root de outra professora', format('update decks set parent_deck_id = %s where id = %s', troot_b, sub2)),
      ('mover p/ Course Deck', format('update decks set parent_deck_id = %s where id = %s', v_course, sub2)),
      ('mover p/ personal_root (Personal)', format('update decks set parent_deck_id = (select id from decks where kind=''personal_root'' and owner_id=%L limit 1) where id = %s', s1, sub2)),
      ('mover sob o próprio descendente (ciclo)', format('update decks set parent_deck_id = %s where id = %s', sub2, sub1)),
      ('mudar de aluno (owner_id)', format('update decks set owner_id = %L where id = %s', s2, sub2)),
      ('mudar de professora (teacher_id)', format('update decks set teacher_id = %L where id = %s', u, sub2)),
      ('mudar idioma', format('update decks set language_app_key = ''mandarim'' where id = %s', sub2)),
      ('transformar teacher em personal', format('update decks set kind = ''personal'', teacher_id = null where id = %s', sub2)),
      ('teacher_root movido p/ outra árvore', format('update decks set parent_deck_id = %s where id = %s', sub1, a1))) x(n, q) loop
    begin
      execute r.q;
      get diagnostics v_n = row_count;
      insert into results values ('rejeitado: ' || r.n, v_n = 0, 'rows=' || v_n);
    exception when others then insert into results values ('rejeitado: ' || r.n, true, sqlerrm); end;
  end loop;
  -- movimento válido: sub2 (Verbos) passa a filho direto do teacher_root
  update decks set parent_deck_id = a1 where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('16c. mover Teacher Deck dentro da própria árvore', v_n = 1, null);
  update decks set name = 'Verbos 2' where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('16d. professora renomeia o próprio subdeck', v_n = 1, null);

  -- ===== F. cartões (escrita de teacher_flashcards é admin-only -- modelo atual) =====
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
    values (t, s1, 'frances', a1, 'a', 'b', v_fields, 'normal') returning id into v_id;
  insert into results select '6. cartão novo no teacher_root do aluno (destino padrão)', deck_id = a1, null from teacher_flashcards where id = v_id;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
    values (t, s1, 'frances', sub1, 'a', 'b', v_fields, 'normal_reversed') returning id into v_id;
  insert into results select '7b. subdeck é destino válido (reverso)', deck_id = sub1 and card_generation_mode = 'normal_reversed', null from teacher_flashcards where id = v_id;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
    values (t, s2, 'frances', troot2, 'a', 'b', v_fields, 'normal') returning id into v_id;
  insert into results select '9b. aluno 2 recebe deck_id diferente do aluno 1', deck_id = troot2 and deck_id <> a1, null from teacher_flashcards where id = v_id;
  for r in select * from (values
      ('Personal Deck do aluno', (select id from decks where kind='personal_root' and owner_id = s1 limit 1)),
      ('root do aluno', (select id from decks where kind='root' and owner_id = s1 limit 1)),
      ('Course Deck', v_course),
      ('Teacher Deck de OUTRO aluno', troot2),
      ('Teacher Deck de OUTRA professora', troot_b),
      ('Deck inexistente', 999999999::bigint)) x(n, did) loop
    begin
      insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode)
        values (t, s1, 'frances', r.did, 'a', 'b', v_fields, 'normal');
      insert into results values ('8. destino proibido rejeitado: ' || r.n, false, 'INSERIU');
    exception when others then insert into results values ('8. destino proibido rejeitado: ' || r.n, true, sqlerrm); end;
  end loop;
  -- mover Note existente: entre Teacher Decks do mesmo aluno OK; p/ Personal rejeitado
  update teacher_flashcards set deck_id = sub1 where id = v_id - 2 and student_id = s1;
  get diagnostics v_n = row_count;
  insert into results values ('16e. mover Note entre Teacher Decks do mesmo aluno', v_n = 1, null);
  begin
    update teacher_flashcards set deck_id = (select id from decks where kind='personal_root' and owner_id = s1 limit 1) where id = v_id - 2;
    insert into results values ('8b. mover Note p/ Personal rejeitado', false, 'MOVEU');
  exception when others then insert into results values ('8b. mover Note p/ Personal rejeitado', true, sqlerrm); end;

  -- ===== G. aluno não mexe em Teacher Card =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated', 'email', 'aluno@example.com')::text, true);
  set local role authenticated;
  update teacher_flashcards set deck_id = sub1 where student_id = s1;
  get diagnostics v_n = row_count;
  insert into results values ('15e. aluno não muda o Deck de um Teacher Card (0 linhas)', v_n = 0, v_n::text);
  select count(*) into v_n from teacher_flashcards where student_id = s1 and deck_id is not null;
  insert into results values ('15f. aluno enxerga os Teacher Cards que recebeu', v_n >= 2, v_n::text);

  -- ===== H. exclusão: Deck vazio pela professora; com filhos/notas o banco NÃO protege (regra é do domínio) =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  delete from decks where id = b1;
  get diagnostics v_n = row_count;
  insert into results values ('16f. professora apaga Teacher Deck vazio da própria árvore', v_n = 1, null);
  -- 17: professora NAO-admin (B) nao apaga o proprio teacher_root (RLS so libera kind=teacher).
  -- Obs.: o admin (hoje a professora real) passa por decks_admin_write e PODE apagar qualquer
  -- Deck; a protecao "Deck com cartoes/filhos" fica no dominio (validateDeckDeletion).
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'outra@example.com')::text, true);
  set local role authenticated;
  delete from decks where id = troot_b;
  get diagnostics v_n = row_count;
  insert into results values ('17. teacher_root nunca e apagavel por professora nao-admin (RLS: so kind=teacher)', v_n = 0, 'rows=' || v_n);
  delete from decks where id = subb;
  get diagnostics v_n = row_count;
  insert into results values ('16g. professora B apaga subdeck vazio proprio', v_n = 1, 'rows=' || v_n);

  reset role;
  -- ===== I. históricos =====
  select count(*) into v_n from teacher_flashcards where id = any(v_hist) and deck_id is null;
  insert into results values ('13. cartoes historicos (ids originais) continuam com deck_id nulo', v_n = coalesce(array_length(v_hist, 1), 0), v_n || ' de ' || coalesce(array_length(v_hist, 1), 0));
  -- anon (a tabela de resultados só é gravável fora do papel anon)
  set local role anon;
  msg := null;
  begin
    perform ensure_teacher_decks(s1, 'frances');
    msg := 'EXECUTOU';
  exception when others then msg := sqlerrm; end;
  reset role;
  insert into results values ('5b. anon não executa ensure_teacher_decks', msg <> 'EXECUTOU', msg);
end $$;
select name, ok, detail from results order by 1;
rollback;
