-- Correção da 089: ensure_teacher_decks (a função que cria/acha o deck "Cartões da professora") confere auth.uid(), que é NULO
-- quando a Edge Function chama com service role, então agent_approve_review_bank_item falhava com not_authorized (achado no teste ao vivo
-- do Staging; o teste local não pegou porque a sessão de teste ainda carregava as claims de uma professora).
-- Agora a função, DEPOIS de conferir a professora e a permissão, assume a identidade dela só dentro desta transação (claims locais) para
-- reaproveitar ensure_teacher_decks sem copiá-la, e restaura as claims anteriores ao terminar.
-- Aditiva e idempotente (create or replace); nenhum DROP.
create or replace function public.agent_approve_review_bank_item(
  p_teacher uuid, p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
  v_deck bigint;
  v_card bigint;
  v_prev_claims text := current_setting('request.jwt.claims', true);
  v_prev_sub text := current_setting('request.jwt.claim.sub', true);
begin
  if p_teacher is null or not (public._is_admin_uid(p_teacher) or 'teacher' = any(public._account_role_keys(p_teacher)))
     or not public._has_permission(p_teacher, 'review_bank') then
    raise exception 'not_authorized';
  end if;
  select * into v_item from public.review_bank_items where id = p_item_id and teacher_id = p_teacher for update;
  if not found then raise exception 'not_authorized'; end if;
  if v_item.teacher_flashcard_id is not null then
    return v_item.teacher_flashcard_id;
  end if;
  select * into v_s from public.review_bank_students where id = v_item.bank_student_id and teacher_id = p_teacher;
  if not found or v_s.linked_student_id is null then raise exception 'student_not_linked'; end if;
  if not public.teacher_link_is_active(p_teacher, v_s.linked_student_id, v_s.language_app_key) then raise exception 'link_inactive'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', p_teacher::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_teacher::text, true);
  select teacher_root_deck_id into v_deck from public.ensure_teacher_decks(v_s.linked_student_id, v_s.language_app_key);
  perform set_config('request.jwt.claims', coalesce(v_prev_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_prev_sub, ''), true);
  insert into public.teacher_flashcards
    (teacher_id, student_id, language_app_key, front, back_trans, note, status, fields, card_generation_mode, tags, deck_id, bank_item_id)
  values
    (p_teacher, v_s.linked_student_id, v_s.language_app_key, p_front, p_back_trans, nullif(btrim(coalesce(p_note, '')), ''),
     'active', p_fields, p_mode, coalesce(p_tags, '{}'::text[]), v_deck, p_item_id)
  returning id into v_card;
  update public.review_bank_items
     set status = 'aprovado', teacher_flashcard_id = v_card, student_id = v_s.linked_student_id, updated_at = now()
   where id = p_item_id;
  return v_card;
end;
$$;

revoke execute on function public.agent_approve_review_bank_item(uuid, uuid, text, text, jsonb, text, text[], text) from public, anon, authenticated;
grant execute on function public.agent_approve_review_bank_item(uuid, uuid, text, text, jsonb, text, text[], text) to service_role;
