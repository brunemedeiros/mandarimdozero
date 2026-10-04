-- Fase J (hardening) -- documenta com teste REAL a regra vigente: rename/delete de Tag
-- é edição de METADADO de Teacher Cards já existentes (como editar conteúdo), portanto
-- NÃO exige vínculo ativo (055 só barra INSERT e mudança de deck_id). Criar/mover
-- continuam bloqueados. Termina em RAISE EXCEPTION -> rollback, zero resíduo.
do $$
declare
  t uuid; s1 uuid; l1 text; tc bigint; dk bigint; v_res jsonb := '[]'::jsonb; v_json jsonb; r record; v_msg text;
  v_email text := 'brunemed1310@gmail.com'; v_before text; v_after text;
begin
  select id into t from auth.users where email = v_email;
  select student_id, language_app_key into s1, l1 from teacher_students where teacher_id = t and status = 'active' limit 1;
  insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans, tags, revision, note)
    values (t, s1, l1, 'hx', 'b', array['aa','bb'], 7, 'FJ-HARD') returning id into tc;
  -- vínculo passa a inativo (dentro da transação)
  update teacher_students set status = 'removed' where teacher_id = t and student_id = s1 and language_app_key = l1;
  select md5((to_jsonb(x) - 'tags')::text) into v_before from teacher_flashcards x where id = tc;

  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated', 'email', v_email)::text, true);
  set local role authenticated;
  v_json := rename_note_tag('teacher', 'aa', 'cc');
  v_res := v_res || jsonb_build_object('n','K1 rename em card de vínculo inativo: edita só metadado (regra 055 preservada)','ok',(v_json->>'affected')::int = 1,'d',v_json::text);
  v_json := delete_note_tag('teacher', 'bb');
  v_res := v_res || jsonb_build_object('n','K2 delete idem','ok',(v_json->>'affected')::int = 1,'d',v_json::text);
  reset role;
  select md5((to_jsonb(x) - 'tags')::text) into v_after from teacher_flashcards x where id = tc;
  v_res := v_res || jsonb_build_object('n','K3 id/revision/deck_id/fields/status/FSRS intactos','ok',v_before = v_after,'d','');

  -- contraste: com vínculo inativo, CRIAR e MOVER seguem bloqueados
  begin
    insert into teacher_flashcards(teacher_id, student_id, language_app_key, front, back_trans) values (t, s1, l1, 'novo', 'b');
    v_res := v_res || jsonb_build_object('n','K4 criar card com vínculo inativo deveria falhar','ok',false,'d','passou');
  exception when others then
    v_res := v_res || jsonb_build_object('n','K4 criar card com vínculo inativo segue bloqueado (055)','ok',sqlstate = '42501','d',sqlerrm);
  end;
  raise exception 'RESULTS: %', v_res::text;
end $$;
