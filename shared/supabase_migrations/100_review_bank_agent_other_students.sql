-- Correção do estado da rotina: a tarefa só via os alunos gerenciados, então tratou alunos que JÁ existem no Banco (ainda do artifact) como novos e
-- cadastrou duplicatas ("Luana Baionne" ao lado de "Luana", "Makena Bento de Azevedo" ao lado de "Makena"; achado na primeira execução em produção, 2026-10-15).
-- Agora `review_bank_agent_state()` também devolve `other_students`: os alunos ativos que NÃO são gerenciados (id, nome, idioma, caderno, nomes na agenda), sem itens e sem
-- dados pessoais, só para a tarefa saber que eles existem e NÃO cadastrar nem mexer. (A função `register_student` da Edge Function também passou a recusar duplicata por caderno/nome/agenda.)
-- Aditiva (create or replace); nenhum DROP.
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
