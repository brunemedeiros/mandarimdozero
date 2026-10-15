-- Rotina automática, plano B: o estado devolvia TODOS os itens de TODOS os alunos gerenciados (centenas de KB depois de alguns meses), pesado demais
-- para a tarefa ler. Agora `review_bank_agent_state()` traz só os dados dos alunos (com `item_count`) e a tarefa pede os itens de cada aluno com aula no dia
-- por `review_bank_agent_items(p_student)`. Aditiva (create or replace); nenhum DROP. Mesmas travas: só service_role executa; teacher vem do Vault.
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
        'item_count', (select count(*) from public.review_bank_items i where i.bank_student_id = s.id and i.teacher_id = v_teacher)
      ) order by s.name)
      from public.review_bank_students s
     where s.teacher_id = v_teacher and s.agent_managed and s.status = 'ativo'), '[]'::jsonb)
  );
end;
$$;

-- Itens de UM aluno gerenciado (compactos, para a tarefa não repetir nem refazer o que a professora já mexeu).
create or replace function public.review_bank_agent_items(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_teacher uuid := nullif(public._rb_agent_secret('rb_agent_teacher'), '')::uuid;
begin
  if v_teacher is null then raise exception 'not_configured'; end if;
  if not exists (select 1 from public.review_bank_students s where s.id = p_student and s.teacher_id = v_teacher and s.agent_managed) then
    raise exception 'not_managed';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', i.import_key, 'id', i.id, 'type', i.item_type, 'q', i.question, 'a', i.answer,
                                        'status', i.status, 'class_date', i.class_date, 'has_card', i.teacher_flashcard_id is not null)
                     order by i.created_at)
      from public.review_bank_items i where i.bank_student_id = p_student and i.teacher_id = v_teacher), '[]'::jsonb);
end;
$$;

revoke execute on function public.review_bank_agent_state(), public.review_bank_agent_items(uuid) from public, anon, authenticated;
grant execute on function public.review_bank_agent_state(), public.review_bank_agent_items(uuid) to service_role;
