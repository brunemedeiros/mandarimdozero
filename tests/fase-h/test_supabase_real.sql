-- Fase H -- teste REAL no Postgres (Supabase): experiência de Teacher Decks +
-- migration 055 (vínculo ativo obrigatório) sobre 053/054. Transação + ROLLBACK
-- (zero resíduo). Personagens: professora A = admin real; professora B =
-- usuário qualquer (não-admin) vinculado ao aluno s1 só dentro da transação;
-- alunos s1/s2 reais de A; vínculo t-s1 em mandarim criado só aqui.
begin;
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated;
do $$
declare
  ADMIN_EMAIL constant text := 'brunemed1310@gmail.com';
  t uuid; s1 uuid; s2 uuid; u uuid; tmp uuid := gen_random_uuid();
  a1 bigint; a2 bigint; am bigint; b1 bigint; sub1 bigint; sub2 bigint; sub3 bigint; subb bigint; p1 bigint; course bigint;
  c1 bigint; c2 bigint; c3 bigint; v_n int; v_troot_tmp bigint;
  v_hist bigint[]; v_h0 text; v_h1 text; v_row0 text; v_row1 text;
  v_fields jsonb := '[{"id":"f1","lang":"fr","role":null,"content":{"value":"a"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"f2","lang":"pt-BR","role":null,"content":{"value":"b"},"audio":null,"image":null,"pinyinFieldId":null}]'::jsonb;
begin
  select id into t from auth.users where email = ADMIN_EMAIL;
  select student_id into s1 from teacher_students where teacher_id = t and language_app_key = 'frances' and status = 'active' order by student_id limit 1;
  select student_id into s2 from teacher_students where teacher_id = t and language_app_key = 'frances' and status = 'active' and student_id <> s1 order by student_id limit 1;
  select id into u from auth.users where id not in (t, s1, s2) order by created_at limit 1;
  select array_agg(id order by id) into v_hist from teacher_flashcards where deck_id is null;
  select md5(string_agg(t2::text, ',' order by id)) into v_h0 from teacher_flashcards t2 where id = any(v_hist);
  insert into teacher_students(teacher_id, student_id, language_app_key, status) values (u, s1, 'frances', 'active'), (t, s1, 'mandarim', 'active');
  insert into decks(kind, name, language_app_key) values ('course', 'curso-teste-h', 'frances') returning id into course;
  -- ===== A. professora A =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  select teacher_root_deck_id into a1 from ensure_teacher_decks(s1, 'frances');
  select teacher_root_deck_id into a2 from ensure_teacher_decks(s2, 'frances');
  select teacher_root_deck_id into am from ensure_teacher_decks(s1, 'mandarim');
  insert into results values ('A1. teacher_root por aluno+idioma (3 contextos, 3 raízes distintas)', a1 is not null and a2 is not null and am is not null and a1 <> a2 and a1 <> am and a2 <> am, null);
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, a1, 'teacher', 'Aulas', 'frances') returning id into sub1;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, sub1, 'teacher', 'Verbos', 'frances') returning id into sub2;
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s2, t, a2, 'teacher', 'S2-vazio', 'frances') returning id into sub3;
  insert into results values ('A2. subdeck sob teacher_root e sob subdeck', sub1 is not null and sub2 is not null and sub3 is not null, null);
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s1, 'frances', a1, 'a', 'b', v_fields, 'normal') returning id into c1;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s1, 'frances', sub1, 'a', 'b', v_fields, 'normal_reversed') returning id into c2;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s2, 'frances', a2, 'a', 'b', v_fields, 'normal') returning id into c3;
  insert into results values ('A3. Teacher Cards criados no Deck do próprio aluno (deck_id no INSERT)', (select deck_id from teacher_flashcards where id = c1) = a1 and (select deck_id from teacher_flashcards where id = c2) = sub1 and (select deck_id from teacher_flashcards where id = c3) = a2, null);
  -- ===== B. professora B (não-admin) =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'outra@example.com')::text, true);
  set local role authenticated;
  select teacher_root_deck_id into b1 from ensure_teacher_decks(s1, 'frances');
  insert into results values ('B1. B tem a SUA raiz para o mesmo aluno/idioma, distinta da de A', b1 is not null and b1 <> a1, null);
  insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, u, b1, 'teacher', 'B-sub', 'frances') returning id into subb;
  insert into results values ('B2. B cria subdeck na própria árvore', subb is not null, null);
  select count(*) into v_n from decks where id in (a1, sub1, sub2, a2);
  insert into results values ('B3. B não enxerga a árvore de A', v_n = 0, v_n::text);
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, u, a1, 'teacher', 'invasao', 'frances');
    insert into results values ('B4. B não cria Deck sob a árvore de A', false, 'PASSOU');
  exception when others then insert into results values ('B4. B não cria Deck sob a árvore de A', sqlerrm like '%', sqlerrm); end;
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, b1, 'teacher', 'falso', 'frances');
    insert into results values ('B5. B não cria Deck com teacher_id de A', false, 'PASSOU');
  exception when others then insert into results values ('B5. B não cria Deck com teacher_id de A', sqlerrm like '%', sqlerrm); end;
  begin
    perform ensure_teacher_decks(s2, 'frances');
    insert into results values ('B6. B não cria árvore p/ aluno sem vínculo com B', false, 'PASSOU');
  exception when others then insert into results values ('B6. B não cria árvore p/ aluno sem vínculo com B', sqlerrm like '%not_authorized%', sqlerrm); end;
  update teacher_flashcards set deck_id = b1 where id = c1;
  get diagnostics v_n = row_count;
  insert into results values ('B7. B não move Teacher Card de A (RLS 0 linhas)', v_n = 0, 'rows=' || v_n);
  delete from decks where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('B8. B não apaga Deck de A (RLS 0 linhas)', v_n = 0, 'rows=' || v_n);
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (u, s1, 'frances', b1, 'a', 'b', v_fields, 'normal');
    insert into results values ('B9. B (não-admin) não cria Teacher Card', false, 'PASSOU');
  exception when others then insert into results values ('B9. B (não-admin) não cria Teacher Card', sqlerrm like '%', sqlerrm); end;
  -- ===== C. mover Note / Deck (professora A) =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  select md5((t2.*)::text) into v_row0 from teacher_flashcards t2 where id = c1;
  update teacher_flashcards set deck_id = sub2 where id = c1;
  get diagnostics v_n = row_count;
  insert into results values ('C1. mover Note entre Teacher Decks do mesmo aluno', v_n = 1, 'rows=' || v_n);
  select md5((t2.*)::text) into v_row1 from teacher_flashcards t2 where id = c1;
  update teacher_flashcards set deck_id = a1 where id = c1;
  insert into results values ('C2. mover a Note muda SÓ deck_id (voltar restaura a linha idêntica; revision 0)', v_row0 <> v_row1 and md5((select t2::text from teacher_flashcards t2 where id = c1)) = v_row0 and (select revision from teacher_flashcards where id = c1) = 0, null);
  update teacher_flashcards set deck_id = sub2 where id = c2;
  get diagnostics v_n = row_count;
  insert into results values ('C3. Note reversa (2 CardInstances derivados) move como 1 linha', v_n = 1, 'rows=' || v_n);
  update teacher_flashcards set deck_id = sub1 where id = c2;
  begin
    update teacher_flashcards set deck_id = b1 where id = c1;
    insert into results values ('C4. mover Note p/ outra professora (árvore de B) rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C4. mover Note p/ outra professora (árvore de B) rejeitado', sqlerrm like '%', sqlerrm); end;
  begin
    update teacher_flashcards set deck_id = a2 where id = c1;
    insert into results values ('C4. mover Note p/ outro aluno rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C4. mover Note p/ outro aluno rejeitado', sqlerrm like '%', sqlerrm); end;
  begin
    update teacher_flashcards set deck_id = am where id = c1;
    insert into results values ('C4. mover Note p/ outro idioma (mandarim do mesmo aluno) rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C4. mover Note p/ outro idioma (mandarim do mesmo aluno) rejeitado', sqlerrm like '%', sqlerrm); end;
  begin
    update teacher_flashcards set deck_id = course where id = c1;
    insert into results values ('C4. mover Note p/ Course Deck rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C4. mover Note p/ Course Deck rejeitado', sqlerrm like '%', sqlerrm); end;
  begin
    update teacher_flashcards set deck_id = 999999999 where id = c1;
    insert into results values ('C4. mover Note p/ Deck inexistente rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C4. mover Note p/ Deck inexistente rejeitado', sqlerrm like '%', sqlerrm); end;
  insert into results values ('C5. Note continua no Deck original após as tentativas', (select deck_id from teacher_flashcards where id = c1) = a1, null);
  begin
    update decks set parent_deck_id = b1 where id = sub2;
    insert into results values ('C6. subdeck não muda p/ árvore de B', false, 'PASSOU');
  exception when others then insert into results values ('C6. subdeck não muda p/ árvore de B', sqlerrm like '%', sqlerrm); end;
  begin
    update decks set parent_deck_id = a2 where id = sub2;
    insert into results values ('C7. subdeck não muda p/ outro aluno', false, 'PASSOU');
  exception when others then insert into results values ('C7. subdeck não muda p/ outro aluno', sqlerrm like '%', sqlerrm); end;
  begin
    update decks set parent_deck_id = course where id = sub2;
    insert into results values ('C8. subdeck não muda p/ Course', false, 'PASSOU');
  exception when others then insert into results values ('C8. subdeck não muda p/ Course', sqlerrm like '%', sqlerrm); end;
  begin
    update decks set parent_deck_id = sub2 where id = sub1;
    insert into results values ('C9. ciclo (pai sob o próprio descendente)', false, 'PASSOU');
  exception when others then insert into results values ('C9. ciclo (pai sob o próprio descendente)', sqlerrm like '%', sqlerrm); end;
  begin
    update decks set owner_id = s2 where id = sub2;
    insert into results values ('C10. subdeck não muda de aluno', false, 'PASSOU');
  exception when others then insert into results values ('C10. subdeck não muda de aluno', sqlerrm like '%', sqlerrm); end;
  begin
    update decks set language_app_key = 'mandarim' where id = sub2;
    insert into results values ('C11. subdeck não muda de idioma', false, 'PASSOU');
  exception when others then insert into results values ('C11. subdeck não muda de idioma', sqlerrm like '%', sqlerrm); end;
  update decks set name = 'Verbos 2' where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('C12. professora renomeia o próprio subdeck', v_n = 1, 'rows=' || v_n);
  -- ===== D. aluno s1 (somente leitura) =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated', 'email', 'aluno@example.com')::text, true);
  set local role authenticated;
  perform ensure_user_decks(s1, 'frances');
  select id into p1 from decks where kind = 'personal_root' and owner_id = s1 and language_app_key = 'frances';
  select count(*) into v_n from decks where kind in ('teacher_root','teacher') and owner_id = s1;
  insert into results values ('D1. aluno LÊ seus Teacher Decks (A, B, idiomas)', v_n >= 5 and p1 is not null, v_n::text);
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, a1, 'teacher', 'aluno-cria', 'frances');
    insert into results values ('D2. aluno não cria Teacher Deck', false, 'PASSOU');
  exception when others then insert into results values ('D2. aluno não cria Teacher Deck', sqlerrm like '%', sqlerrm); end;
  update decks set name = 'x' where id = sub1;
  get diagnostics v_n = row_count;
  insert into results values ('D3. aluno não renomeia Teacher Deck (0)', v_n = 0, 'rows=' || v_n);
  update decks set parent_deck_id = a1 where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('D4. aluno não move Teacher Deck (0)', v_n = 0, 'rows=' || v_n);
  delete from decks where id = sub1;
  get diagnostics v_n = row_count;
  insert into results values ('D5. aluno não apaga Teacher Deck (0)', v_n = 0, 'rows=' || v_n);
  update teacher_flashcards set deck_id = sub1 where id = c1;
  get diagnostics v_n = row_count;
  insert into results values ('D6. aluno não move Teacher Card (0)', v_n = 0, 'rows=' || v_n);
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s1, 'frances', a1, 'a', 'b', v_fields, 'normal');
    insert into results values ('D7. aluno não cria Teacher Card', false, 'PASSOU');
  exception when others then insert into results values ('D7. aluno não cria Teacher Card', sqlerrm like '%', sqlerrm); end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  begin
    update teacher_flashcards set deck_id = p1 where id = c1;
    insert into results values ('C13. mover Note p/ Deck pessoal do aluno rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('C13. mover Note p/ Deck pessoal do aluno rejeitado', sqlerrm like '%', sqlerrm); end;
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s1, 'frances', p1, 'a', 'b', v_fields, 'normal');
    insert into results values ('C14. Note nova direto no Deck pessoal rejeitada', false, 'PASSOU');
  exception when others then insert into results values ('C14. Note nova direto no Deck pessoal rejeitada', sqlerrm like '%', sqlerrm); end;
  -- ===== E. exclusão (054) =====
  begin
    delete from decks where id = a1;
    insert into results values ('E1. admin não apaga teacher_root', false, 'PASSOU');
  exception when others then insert into results values ('E1. admin não apaga teacher_root', sqlerrm like '%teacher_root%', sqlerrm); end;
  begin
    delete from decks where id = sub1;
    insert into results values ('E2. teacher com subdeck protegido', false, 'PASSOU');
  exception when others then insert into results values ('E2. teacher com subdeck protegido', sqlerrm like '%subdecks%', sqlerrm); end;
  delete from decks where id = sub2;
  get diagnostics v_n = row_count;
  insert into results values ('E3. teacher vazio (folha) deletável', v_n = 1, 'rows=' || v_n);
  begin
    delete from decks where id = sub1;
    insert into results values ('E4. teacher com Teacher Card protegido (sub1 só tem cartão agora)', false, 'PASSOU');
  exception when others then insert into results values ('E4. teacher com Teacher Card protegido (sub1 só tem cartão agora)', sqlerrm like '%cartoes%', sqlerrm); end;
  insert into results values ('E5. cartão continua em sub1 (nada virou NULL)', (select deck_id from teacher_flashcards where id = c2) = sub1, null);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'outra@example.com')::text, true);
  set local role authenticated;
  delete from decks where id = b1;
  get diagnostics v_n = row_count;
  insert into results values ('E6. professora B (não-admin) não apaga o próprio teacher_root (RLS 0)', v_n = 0, 'rows=' || v_n);
  delete from decks where id = subb;
  get diagnostics v_n = row_count;
  insert into results values ('E7. professora B apaga o próprio subdeck vazio', v_n = 1, 'rows=' || v_n);
  -- ===== F. vínculo inativo (055) =====
  reset role;
  update teacher_students set status = 'removed' where teacher_id = t and student_id = s2 and language_app_key = 'frances';
  update teacher_students set status = 'invited' where teacher_id = t and student_id = s1 and language_app_key = 'mandarim';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
  set local role authenticated;
  begin
    perform ensure_teacher_decks(s2, 'frances');
    insert into results values ('F1. sem vínculo ativo: ensure_teacher_decks rejeitado (removed)', false, 'PASSOU');
  exception when others then insert into results values ('F1. sem vínculo ativo: ensure_teacher_decks rejeitado (removed)', sqlerrm like '%not_authorized%', sqlerrm); end;
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s2, t, a2, 'teacher', 'novo', 'frances');
    insert into results values ('F2. removed: não cria Teacher Deck', false, 'PASSOU');
  exception when others then insert into results values ('F2. removed: não cria Teacher Deck', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    update decks set name = 'z' where id = sub3;
    insert into results values ('F3. removed: não renomeia Teacher Deck', false, 'PASSOU');
  exception when others then insert into results values ('F3. removed: não renomeia Teacher Deck', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    update decks set parent_deck_id = a2 where id = sub3;
    insert into results values ('F4. removed: não move Teacher Deck', false, 'PASSOU');
  exception when others then insert into results values ('F4. removed: não move Teacher Deck', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    delete from decks where id = sub3;
    insert into results values ('F5. removed: não apaga Teacher Deck vazio', false, 'PASSOU');
  exception when others then insert into results values ('F5. removed: não apaga Teacher Deck vazio', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s2, 'frances', a2, 'a', 'b', v_fields, 'normal');
    insert into results values ('F6. removed: não cria Teacher Card (com Deck)', false, 'PASSOU');
  exception when others then insert into results values ('F6. removed: não cria Teacher Card (com Deck)', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, s2, 'frances', null, 'a', 'b', v_fields, 'normal');
    insert into results values ('F7. removed: não cria Teacher Card (sem Deck)', false, 'PASSOU');
  exception when others then insert into results values ('F7. removed: não cria Teacher Card (sem Deck)', sqlerrm like '%vinculo%', sqlerrm); end;
  begin
    update teacher_flashcards set deck_id = sub3 where id = c3;
    insert into results values ('F8. removed: não move Teacher Card entre Decks', false, 'PASSOU');
  exception when others then insert into results values ('F8. removed: não move Teacher Card entre Decks', sqlerrm like '%vinculo%', sqlerrm); end;
  update teacher_flashcards set front = 'editado' where id = c3;
  get diagnostics v_n = row_count;
  insert into results values ('F9. removed: cartão histórico NÃO é destruído; edição de conteúdo continua permitida', v_n = 1, 'rows=' || v_n);
  insert into results values ('F10. removed: árvore e cartão continuam existindo', exists (select 1 from decks where id = sub3) and (select deck_id from teacher_flashcards where id = c3) = a2, null);
  begin
    perform ensure_teacher_decks(s1, 'mandarim');
    insert into results values ('F11. invited (mandarim): ensure_teacher_decks rejeitado', false, 'PASSOU');
  exception when others then insert into results values ('F11. invited (mandarim): ensure_teacher_decks rejeitado', sqlerrm like '%not_authorized%', sqlerrm); end;
  begin
    insert into decks(owner_id, teacher_id, parent_deck_id, kind, name, language_app_key) values (s1, t, am, 'teacher', 'x', 'mandarim');
    insert into results values ('F12. invited: não cria Teacher Deck sob a raiz existente', false, 'PASSOU');
  exception when others then insert into results values ('F12. invited: não cria Teacher Deck sob a raiz existente', sqlerrm like '%vinculo%', sqlerrm); end;
  update teacher_flashcards set deck_id = sub1 where id = c1;
  get diagnostics v_n = row_count;
  insert into results values ('F13. outro vínculo ativo (s1 frances) segue operável: mover Note', v_n = 1, 'rows=' || v_n);
  -- ===== G. remoção de conta não é travada =====
  reset role;
  begin
    insert into auth.users(id, instance_id, aud, role, email) values (tmp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tmp-fase-h@example.invalid');
    insert into teacher_students(teacher_id, student_id, language_app_key, status) values (t, tmp, 'frances', 'active');
    perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', ADMIN_EMAIL)::text, true);
    set local role authenticated;
    select teacher_root_deck_id into v_troot_tmp from ensure_teacher_decks(tmp, 'frances');
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode) values (t, tmp, 'frances', v_troot_tmp, 'a', 'b', v_fields, 'normal');
    reset role;
    delete from auth.users where id = tmp;
    select count(*) into v_n from decks where owner_id = tmp;
    insert into results values ('G1. remoção da conta do aluno leva a árvore e os cartões junto', v_n = 0 and not exists (select 1 from teacher_flashcards where student_id = tmp), 'restantes=' || v_n);
  exception when others then
    reset role;
    insert into results values ('G1. remoção da conta do aluno leva a árvore e os cartões junto', false, sqlerrm);
  end;
  -- ===== H. históricos =====
  reset role;
  select md5(string_agg(t2::text, ',' order by id)) into v_h1 from teacher_flashcards t2 where id = any(v_hist);
  insert into results values ('H1. os 5 Teacher Cards históricos (deck_id nulo) byte a byte idênticos', v_h1 = v_h0 and coalesce(array_length(v_hist,1),0) = 5, coalesce(array_length(v_hist,1),0)::text);
end $$;
select name, ok, detail from results order by (regexp_match(name, '^([A-Z])(\d+)'))[1], ((regexp_match(name, '^([A-Z])(\d+)'))[2])::int, name;
rollback;
