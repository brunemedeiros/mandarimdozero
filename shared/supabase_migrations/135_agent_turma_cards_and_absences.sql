-- 135: a rotina da madrugada passa a (1) gerar os cartões de aluno do Banco ligado a uma TURMA (hoje só gerava para conta vinculada e a
-- professora tinha de clicar em "Gerar cartões" na tela) e (2) saber das faltas: `review_bank_agent_state()` devolve, por aluno,
-- `absent_dates` (aulas dos últimos 14 dias cujo rótulo de presença conta como falta, ex.: "Faltou", nas Aulas do site), para a rotina não avisar "aula sem caderno" de aula faltada.
-- Aditiva (create or replace, mesmas assinaturas); nenhum DROP. Desfazer (manual): reaplicar a 090 (agent_approve_review_bank_item) e a 129 (state).

-- Datas de falta de um aluno do Banco (conta vinculada ou turma). Só números/datas. Se as tabelas de Aulas não existirem, devolve lista vazia.
create or replace function public._rb_absent_dates(p_bank_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(d order by d) from (
      select distinct l.class_date as d
        from public.review_bank_students s
        join public.teacher_class_logs l on l.teacher_id = s.teacher_id
         and ((s.linked_student_id is not null and l.student_id = s.linked_student_id)
              or (s.classroom_id is not null and l.classroom_id = s.classroom_id))
        join public.class_attendance_labels al on al.id = l.attendance_label_id
       where s.id = p_bank_student_id and al.counts_as = 'absent'
         and l.class_date >= (now() at time zone 'America/Sao_Paulo')::date - 14
         and l.class_date <= (now() at time zone 'America/Sao_Paulo')::date + 1
    ) x), '[]'::jsonb);
exception when undefined_table or undefined_column then
  return '[]'::jsonb;
end;
$$;
revoke execute on function public._rb_absent_dates(uuid) from public, anon, authenticated;
grant execute on function public._rb_absent_dates(uuid) to service_role;

create or replace function public.review_bank_agent_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_teacher uuid := nullif(public._rb_agent_secret('rb_agent_teacher'), '')::uuid;
begin
  if v_teacher is null then raise exception 'not_configured'; end if;
  return jsonb_build_object(
    'ok', true,
    'today', (now() at time zone 'America/Sao_Paulo')::date,
    'manual_markdown', coalesce((select manual_markdown from public.review_bank_settings where teacher_id = v_teacher), ''),
    'auto_generate', coalesce((select auto_generate from public.review_bank_settings where teacher_id = v_teacher), true),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'language_app_key', s.language_app_key, 'reference_language', s.reference_language,
        'notebook_id', s.notebook_id, 'agenda_names', to_jsonb(s.agenda_names), 'lesson_dates', to_jsonb(s.lesson_dates),
        'last_entry_read', s.last_entry_read, 'started_on', s.started_on,
        'linked_email', (select u.email from auth.users u where u.id = s.linked_student_id),
        'item_count', (select count(*) from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher),
        'pending_total', (select count(*) from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher and i.status = 'pendente'),
        'pending_recent', (select count(*) from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher and i.status = 'pendente' and i.created_at > now() - interval '7 days'),
        'pending_sensitive', (select count(*) from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher and i.status = 'pendente' and i.sensitive),
        'absent_dates', public._rb_absent_dates(s.id)
      ) order by s.name)
      from public.review_bank_students s
     where s.teacher_id = v_teacher and s.agent_managed and s.status = 'ativo'), '[]'::jsonb),
    'other_students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', s.name, 'language_app_key', s.language_app_key, 'notebook_id', s.notebook_id, 'agenda_names', to_jsonb(s.agenda_names), 'status', s.status
      ) order by s.name)
      from public.review_bank_students s
     where s.teacher_id = v_teacher and not s.agent_managed), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.review_bank_agent_state() from public, anon, authenticated;
grant execute on function public.review_bank_agent_state() to service_role;

-- Cartão do aluno do Banco gerado pela rotina: conta vinculada (como na 090, sem mudança) OU Turma (uma cópia para cada membro com vínculo
-- ativo, igual à tela "Gerar cartões": approve_review_bank_item da 096).
create or replace function public.agent_approve_review_bank_item(
  p_teacher uuid, p_item_id uuid, p_front text, p_back_trans text, p_fields jsonb, p_mode text, p_tags text[], p_note text
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_item public.review_bank_items%rowtype;
  v_s public.review_bank_students%rowtype;
  v_deck bigint;
  v_card bigint;
  v_first bigint;
  v_r record;
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
  if not found then raise exception 'student_not_linked'; end if;

  if v_s.classroom_id is not null then
    for v_r in select * from public._rb_recipients(v_s.id) loop
      v_card := public._rb_deliver(v_item, v_r.student_id, p_front, p_back_trans, p_fields, p_mode, p_tags, p_note, 0);
      v_first := coalesce(v_first, v_card);
    end loop;
    if v_first is null then raise exception 'no_recipients'; end if;
    update public.review_bank_items
       set status = 'aprovado', teacher_flashcard_id = v_first, student_id = null, updated_at = now()
     where id = p_item_id;
    return v_first;
  end if;

  if v_s.linked_student_id is null then raise exception 'student_not_linked'; end if;
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
