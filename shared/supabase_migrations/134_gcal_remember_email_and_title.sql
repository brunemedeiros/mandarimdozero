-- 134: Google Agenda, pedido da autora (2026-11-11): "faça o Lembrar de um nome de aluno valer para os dois" (e-mail e nome).
-- Antes, escolher com "Lembrar" num evento com convidado criava regra só pelo e-mail; os eventos da mesma pessoa sem convidado
-- (ex.: 28 "Jakob" com o e-mail dele e 3 "Jakob" sem convidado) ficavam para trás. Agora cria também a regra pelo título,
-- desde que o título seja só dessa pessoa (nenhum evento com esse título tem outro convidado; não é "agendamento"; não existe
-- regra de título ativa). Só CREATE OR REPLACE.

create or replace function public.google_calendar_resolve(p_event_id bigint, p_action text, p_target text default null,
                                                          p_language text default null, p_remember boolean default true)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid(); e public.google_calendar_events; v_key text; v_key_type text; v_email text;
  v_student uuid; v_classroom bigint; v_bank uuid; v_res text; v_other bigint; v_title text; v_title_rule boolean := false;
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  select * into e from public.google_calendar_events where id = p_event_id and user_id = v_me;
  if not found then raise exception 'not_found'; end if;

  -- Pular por agora / voltar para a lista: só marca; o evento continua sendo tentado a cada leitura (118).
  if p_action in ('skip', 'unskip') then
    update public.google_calendar_events set skipped_at = case when p_action = 'skip' then now() end where id = e.id;
    return p_action;
  end if;

  -- Trazer de volta (aba Fora do site): desliga a regra da pessoa (se houver) e reavalia os eventos dela.
  if p_action = 'restore' then
    select lower(a ->> 'email') into v_email from jsonb_array_elements(e.attendees) a where coalesce(a ->> 'email', '') <> '' limit 1;
    v_key := public._gcal_key(e.title);
    update public.google_calendar_rules set active = false
     where teacher_id = v_me and active and action = 'ignore' and ignore_kind = 'outside'
       and ((key_type = 'email' and key = v_email) or (key_type = 'title' and key = v_key));
    for v_other in select x.id from public.google_calendar_events x
                    where x.user_id = v_me and x.match_state = 'ignored' and x.match_reason in ('fora do site', 'regra: fora do site')
                      and ((v_email is not null and x.attendees @> jsonb_build_array(jsonb_build_object('email', v_email)))
                           or (v_key is not null and public._gcal_key(x.title) = v_key)) loop
      perform public._gcal_apply(v_other);
    end loop;
    return 'restore';
  end if;

  if p_action in ('keep', 'unlink') then
    if p_action = 'unlink' then
      update public.teacher_class_logs set google_event_ref = null, updated_at = now() where google_event_ref = e.id and teacher_id = v_me;
    end if;
    update public.google_calendar_events set match_state = 'ignored', match_reason = 'ignorado pela professora' where id = e.id;
    return p_action;
  end if;

  select lower(a ->> 'email') into v_email from jsonb_array_elements(e.attendees) a where coalesce(a ->> 'email', '') <> '' limit 1;
  -- "Não é aula" vale pelo título; aluno, turma e "fora do site" valem pela pessoa (e-mail do convidado), se houver.
  v_key_type := case when v_email is not null and p_action <> 'ignore' then 'email' else 'title' end;
  v_key := case when v_key_type = 'email' then v_email else public._gcal_key(e.title) end;

  if p_action = 'former' then
    -- 133: ex-aluna, só para o histórico (sem vínculo ativo; precisa já ter tido história com a professora no idioma).
    v_student := p_target::uuid;
    if p_language is null or not public._teacher_had_student(v_me, v_student, p_language) then raise exception 'not_your_student'; end if;
  elsif p_action = 'student' then
    v_student := p_target::uuid;
    if not exists (select 1 from public.teacher_students where teacher_id = v_me and student_id = v_student and status = 'active'
                    and (p_language is null or language_app_key = p_language)) then raise exception 'not_your_student'; end if;
  elsif p_action = 'classroom' then
    v_classroom := p_target::bigint;
    if not exists (select 1 from public.classrooms where id = v_classroom and teacher_id = v_me) then raise exception 'not_your_classroom'; end if;
  elsif p_action = 'bank_student' then
    v_bank := p_target::uuid;
    if not exists (select 1 from public.review_bank_students where id = v_bank and teacher_id = v_me) then raise exception 'not_found'; end if;
  elsif p_action not in ('ignore', 'outside') then
    raise exception 'invalid_action';
  end if;

  if p_remember and v_key is not null then
    insert into public.google_calendar_rules (teacher_id, key_type, key, action, ignore_kind, student_id, classroom_id, bank_student_id, language_app_key, history_only)
    values (v_me, v_key_type, v_key, case when p_action = 'outside' then 'ignore' when p_action = 'former' then 'student' else p_action end,
            case when p_action = 'outside' then 'outside' when p_action = 'ignore' then 'not_lesson' end,
            v_student, v_classroom, v_bank, p_language, p_action = 'former')
    on conflict (teacher_id, key_type, key) do update set action = excluded.action, ignore_kind = excluded.ignore_kind, active = true,
      history_only = excluded.history_only,
      student_id = excluded.student_id, classroom_id = excluded.classroom_id, bank_student_id = excluded.bank_student_id,
      language_app_key = excluded.language_app_key;
    -- 134: regra pelo e-mail também vale pelo nome do evento (eventos da mesma pessoa sem convidado), se o título for
    -- só dela: nenhum outro evento com esse título tem convidado diferente, não é "agendamento" e não há regra de título.
    v_title := public._gcal_key(e.title);
    if v_key_type = 'email' and v_title is not null and v_title not like '%agendamento%'
       and not exists (select 1 from public.google_calendar_events x, jsonb_array_elements(x.attendees) a
                        where x.user_id = v_me and public._gcal_key(x.title) = v_title
                          and coalesce(a ->> 'email', '') <> '' and lower(a ->> 'email') <> v_email)
       and not exists (select 1 from public.google_calendar_rules where teacher_id = v_me and key_type = 'title' and key = v_title and active) then
      insert into public.google_calendar_rules (teacher_id, key_type, key, action, ignore_kind, student_id, classroom_id, bank_student_id, language_app_key, history_only)
      values (v_me, 'title', v_title, case when p_action = 'outside' then 'ignore' when p_action = 'former' then 'student' else p_action end,
              case when p_action = 'outside' then 'outside' end, v_student, v_classroom, v_bank, p_language, p_action = 'former')
      on conflict (teacher_id, key_type, key) do update set action = excluded.action, ignore_kind = excluded.ignore_kind, active = true,
        history_only = excluded.history_only, student_id = excluded.student_id, classroom_id = excluded.classroom_id,
        bank_student_id = excluded.bank_student_id, language_app_key = excluded.language_app_key;
      v_title_rule := true;
    end if;
    v_res := public._gcal_apply(e.id);
    -- A regra vale também para os outros eventos esperando com a mesma chave (e o mesmo nome, pela 134).
    for v_other in select x.id from public.google_calendar_events x
                    where x.user_id = v_me and x.id <> e.id and x.match_state in ('review', 'pending', 'no_account')
                      and ((v_key_type = 'title' and public._gcal_key(x.title) = v_key)
                           or (v_title_rule and public._gcal_key(x.title) = v_title)
                           or (v_key_type = 'email' and x.attendees @> jsonb_build_array(jsonb_build_object('email', v_email)))) loop
      perform public._gcal_apply(v_other);
    end loop;
    return v_res;
  end if;

  -- Só este evento, sem regra.
  if p_action in ('ignore', 'outside') then
    update public.google_calendar_events set match_state = 'ignored', skipped_at = null,
           match_reason = case when p_action = 'outside' then 'fora do site' else 'ignorado pela professora' end where id = e.id;
    return 'ignored';
  end if;
  -- Escolha só para este evento: fica gravada no próprio evento (match_reason 'escolhido pela professora') e as próximas
  -- leituras do Google a mantêm (gcal_ingest / gcal_retry_waiting).
  update public.google_calendar_events set history_only = (p_action = 'former') where id = e.id;
  return public._gcal_apply_target(e.id, v_student, v_classroom, v_bank, p_language);
end $$;

revoke execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) from public, anon;
grant execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) to authenticated;
