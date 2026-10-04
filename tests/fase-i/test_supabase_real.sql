-- Fase I (Tags) -- teste REAL no Postgres (Supabase). Transação + ROLLBACK
-- (zero resíduo). Cobre: limites 20/50 no banco (migration 056) nas 2 tabelas,
-- permissões de tags de Teacher Card (RLS existente: aluno só lê; professora
-- admin edita; outra professora não), cópia própria e RPC pública com tags,
-- e que nenhuma linha histórica foi alterada.
begin;
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated;
do $$
declare
  t uuid; s1 uuid; u uuid; v_n int; tc bigint; oc bigint; a1 bigint;
  v_hist_t text; v_hist_o text; v_h_t text; v_h_o text; v_tags text[]; v_json jsonb;
  v_fields jsonb := '[{"id":"f1","lang":"fr","role":null,"content":{"value":"a"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"f2","lang":"pt-BR","role":null,"content":{"value":"b"},"audio":null,"image":null,"pinyinFieldId":null}]'::jsonb;
  v_email text := 'brunemed1310@gmail.com';
  many21 text[]; long51 text;
begin
  select id into t from auth.users where email = v_email;
  select student_id into s1 from teacher_students where teacher_id = t and language_app_key = 'frances' and status = 'active' order by student_id limit 1;
  select id into u from auth.users where id not in (t, s1) order by created_at limit 1;
  select md5(string_agg(x::text, ',' order by id)) into v_hist_t from teacher_flashcards x;
  select md5(string_agg(x::text, ',' order by id)) into v_hist_o from own_flashcards x;
  select array_agg('t' || i) into many21 from generate_series(1, 21) i;
  long51 := repeat('a', 51);

  -- ===== professora (admin real) cria Teacher Card com tags =====
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', v_email)::text, true);
  set local role authenticated;
  select teacher_root_deck_id into a1 from ensure_teacher_decks(s1, 'frances');
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, deck_id, front, back_trans, fields, card_generation_mode, tags)
    values (t, s1, 'frances', a1, 'a', 'b', v_fields, 'normal', array['saudacao','a1']) returning id into tc;
  select tags into v_tags from teacher_flashcards where id = tc;
  insert into results values ('T1. professora cria Teacher Card com tags', v_tags = array['saudacao','a1'], array_to_string(v_tags, ','));
  update teacher_flashcards set tags = array['saudacao','a1','verbos'] where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('T2. professora edita as tags do próprio Teacher Card', v_n = 1, 'rows=' || v_n);
  update teacher_flashcards set tags = array['verbos'] where id = tc;
  select tags into v_tags from teacher_flashcards where id = tc;
  insert into results values ('T3. professora remove tags (sobra só a restante)', v_tags = array['verbos'], array_to_string(v_tags, ','));
  update teacher_flashcards set tags = array['saudacao','a1'] where id = tc;

  -- ===== limites no banco (migration 056) =====
  begin
    update teacher_flashcards set tags = many21 where id = tc;
    insert into results values ('L1. teacher_flashcards rejeita 21 tags', false, 'PASSOU');
  exception when check_violation then insert into results values ('L1. teacher_flashcards rejeita 21 tags', true, 'check_violation'); end;
  begin
    update teacher_flashcards set tags = array[long51] where id = tc;
    insert into results values ('L2. teacher_flashcards rejeita tag de 51 chars', false, 'PASSOU');
  exception when check_violation then insert into results values ('L2. teacher_flashcards rejeita tag de 51 chars', true, 'check_violation'); end;
  update teacher_flashcards set tags = (select array_agg('t' || i) from generate_series(1, 20) i) where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('L3. teacher_flashcards aceita exatamente 20 tags', v_n = 1, 'rows=' || v_n);
  update teacher_flashcards set tags = array[repeat('a', 50)] where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('L4. teacher_flashcards aceita tag de 50 chars', v_n = 1, 'rows=' || v_n);
  update teacher_flashcards set tags = array['saudacao','a1'] where id = tc;

  -- ===== aluno: só lê =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated', 'email', 'aluno@example.com')::text, true);
  set local role authenticated;
  select tags into v_tags from teacher_flashcards where id = tc;
  insert into results values ('S1. aluno VÊ as tags do Teacher Card', v_tags = array['saudacao','a1'], array_to_string(v_tags, ','));
  update teacher_flashcards set tags = array['hack'] where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('S2. aluno NÃO edita tags de Teacher Card (RLS: 0 linhas)', v_n = 0, 'rows=' || v_n);
  update teacher_flashcards set tags = '{}' where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('S3. aluno NÃO remove tags de Teacher Card (RLS: 0 linhas)', v_n = 0, 'rows=' || v_n);
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, tags) values (s1, s1, 'frances', 'x', 'y', array['a']);
    insert into results values ('S4. aluno não cria Teacher Card', false, 'PASSOU');
  exception when others then insert into results values ('S4. aluno não cria Teacher Card', true, sqlerrm); end;

  -- ===== aluno: cartão próprio com tags =====
  insert into own_flashcards(owner_id, language_app_key, front, back_trans, fields, card_generation_mode, tags)
    values (s1, 'frances', 'a', 'b', v_fields, 'normal', array['minha','a1']) returning id into oc;
  update own_flashcards set tags = array['minha','a1','extra'] where id = oc;
  get diagnostics v_n = row_count;
  insert into results values ('O1. dono edita tags do cartão próprio', v_n = 1, 'rows=' || v_n);
  begin
    update own_flashcards set tags = many21 where id = oc;
    insert into results values ('L5. own_flashcards rejeita 21 tags', false, 'PASSOU');
  exception when check_violation then insert into results values ('L5. own_flashcards rejeita 21 tags', true, 'check_violation'); end;
  begin
    update own_flashcards set tags = array[long51] where id = oc;
    insert into results values ('L6. own_flashcards rejeita tag de 51 chars', false, 'PASSOU');
  exception when check_violation then insert into results values ('L6. own_flashcards rejeita tag de 51 chars', true, 'check_violation'); end;
  select tags into v_tags from own_flashcards where id = oc;
  insert into results values ('O2. tags do cartão próprio intactas após tentativas inválidas', v_tags = array['minha','a1','extra'], array_to_string(v_tags, ','));

  -- ===== outra conta não mexe nas tags do cartão próprio =====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'outra@example.com')::text, true);
  set local role authenticated;
  update own_flashcards set tags = array['invasao'] where id = oc;
  get diagnostics v_n = row_count;
  insert into results values ('O3. outra conta NÃO edita tags de cartão alheio (0 linhas)', v_n = 0, 'rows=' || v_n);
  update teacher_flashcards set tags = array['invasao'] where id = tc;
  get diagnostics v_n = row_count;
  insert into results values ('O4. outra conta NÃO edita tags de Teacher Card (0 linhas)', v_n = 0, 'rows=' || v_n);

  -- ===== RPC pública devolve as tags (cópia preserva) =====
  reset role;
  update profiles set public_profile = true where user_id = s1;
  select username into v_email from profiles where user_id = s1;
  v_json := get_public_flashcards(v_email, 'frances');
  insert into results values ('P1. RPC pública devolve tags do cartão', (select bool_or(c->'tags' = '["minha","a1","extra"]'::jsonb) from jsonb_array_elements(v_json->'cards') c), v_json::text);

  -- ===== nada histórico foi alterado =====
  reset role;
  delete from own_flashcards where id = oc;
  delete from teacher_flashcards where id = tc;
  select md5(string_agg(x::text, ',' order by id)) into v_h_t from teacher_flashcards x;
  select md5(string_agg(x::text, ',' order by id)) into v_h_o from own_flashcards x;
  insert into results values ('H1. linhas históricas de teacher_flashcards/own_flashcards idênticas (hash)', v_h_t = v_hist_t and v_h_o = v_hist_o, null);
end $$;
select name, ok, detail from results order by (regexp_match(name, '^([A-Z])(\d+)'))[1], ((regexp_match(name, '^([A-Z])(\d+)'))[2])::int;
rollback;
