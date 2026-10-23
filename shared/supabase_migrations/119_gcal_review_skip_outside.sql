-- 119 -- Google Agenda: caixa "Eventos para revisar" com Pular por agora e Fora do site (pedido da autora, 2026-10-23).
-- Pular por agora: o evento sai da lista principal e vai para "Pulados" (skipped_at); continua sendo tentado a cada leitura
-- (118), então entra sozinho quando a aluna ganhar vínculo (ex.: conta no site ainda sem vínculo).
-- Fora do site: aluno que não usa o site e não está no Banco, ou ex-aluno. Não vira aula; com "lembrar", vale para os
-- próximos eventos da mesma pessoa (e-mail do convidado, senão o título). Guardado sem título nem convidados (privacidade).
-- Regra nova = action 'ignore' + ignore_kind 'outside' (sem mexer no check da 117). Aditiva, sem DROP.
-- google_calendar_review_items: a caixa inteira (sem o limite de 300), com skipped_at, para filtrar e paginar na tela.

alter table public.google_calendar_events add column if not exists skipped_at timestamptz;
alter table public.google_calendar_rules add column if not exists ignore_kind text
  check (ignore_kind is null or ignore_kind in ('not_lesson', 'outside'));

create or replace function public._gcal_apply(p_event_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare
  e public.google_calendar_events;
  v_mode text;
  v_key text;
  v_emails text[];
  r public.google_calendar_rules;
  v_student uuid; v_classroom bigint; v_bank uuid; v_lang text; v_reason text;
  v_n int;
  v_linked bigint;
begin
  select * into e from public.google_calendar_events where id = p_event_id;
  if not found then return null; end if;
  select mode into v_mode from public.google_calendar_sources where user_id = e.user_id and calendar_id = e.calendar_id;
  select id into v_linked from public.teacher_class_logs where google_event_ref = e.id;

  -- Cancelado/apagado: nunca apaga a aula; se havia aula, vai para revisão.
  if e.status = 'cancelled' then
    update public.google_calendar_events set match_state = case when v_linked is null then 'ignored' else 'cancelled' end,
           match_reason = 'cancelado no Google' where id = e.id;
    return 'cancelled';
  end if;
  if e.all_day or e.start_at is null then
    update public.google_calendar_events set match_state = 'ignored', match_reason = 'dia inteiro' where id = e.id;
    return 'ignored';
  end if;

  v_key := public._gcal_key(e.title);
  select coalesce(array_agg(lower(a ->> 'email')), '{}') into v_emails
    from jsonb_array_elements(e.attendees) a where coalesce(a ->> 'email', '') <> '';

  -- 1) regra aprendida: e-mail, depois título
  select * into r from public.google_calendar_rules
   where teacher_id = e.user_id and ((key_type = 'email' and key = any(v_emails)) or (key_type = 'title' and key = v_key))
   order by (key_type = 'email') desc limit 1;
  if found then
    if r.action = 'ignore' then
      update public.google_calendar_events set match_state = 'ignored',
             match_reason = case when r.ignore_kind = 'outside' then 'regra: fora do site' else 'regra: ignorar' end,
             student_id = null, classroom_id = null, bank_student_id = null where id = e.id;
      return 'ignored';
    end if;
    v_student := r.student_id; v_classroom := r.classroom_id; v_bank := r.bank_student_id; v_lang := r.language_app_key;
    v_reason := 'regra (' || r.key_type || ')';
  end if;

  -- 2) e-mail do convidado = aluno com vínculo ativo
  if v_reason is null and array_length(v_emails, 1) > 0 then
    select count(distinct ts.student_id), min(ts.student_id::text)::uuid, min(ts.language_app_key)
      into v_n, v_student, v_lang
      from public.teacher_students ts join auth.users u on u.id = ts.student_id
     where ts.teacher_id = e.user_id and ts.status = 'active' and lower(u.email) = any(v_emails);
    if v_n = 1 then v_reason := 'e-mail do convidado'; else v_student := null; v_lang := null; end if;
  end if;

  -- 3) título = "nome na agenda" do Banco
  if v_reason is null and v_key is not null then
    select count(*), min(s.id::text)::uuid into v_n, v_bank from public.review_bank_students s
     where s.teacher_id = e.user_id and s.status = 'ativo'
       and exists (select 1 from unnest(s.agenda_names || s.name) n where public._gcal_key(n) = v_key);
    if v_n = 1 then
      select s.linked_student_id, s.classroom_id, s.language_app_key into v_student, v_classroom, v_lang
        from public.review_bank_students s where s.id = v_bank;
      v_reason := 'nome na agenda';
    elsif v_n > 1 then
      v_bank := null; v_reason := null;
      update public.google_calendar_events set match_state = 'review', match_reason = 'mais de um aluno com esse nome' where id = e.id;
      return 'review';
    else
      v_bank := null;
    end if;
  end if;

  -- 4) título = primeiro nome de um aluno com vínculo ativo (único)
  if v_reason is null and v_key is not null then
    select count(distinct ts.student_id), min(ts.student_id::text)::uuid, min(ts.language_app_key)
      into v_n, v_student, v_lang
      from public.teacher_students ts join public.profiles p on p.user_id = ts.student_id
     where ts.teacher_id = e.user_id and ts.status = 'active'
       and (public._gcal_key(split_part(p.display_name, ' ', 1)) = v_key or public._gcal_key(p.display_name) = v_key);
    if v_n = 1 then v_reason := 'primeiro nome do aluno'; else v_student := null; v_lang := null; end if;
  end if;

  if v_reason is null then
    update public.google_calendar_events
       set match_state = case when v_mode = 'all' or array_length(v_emails, 1) > 0 or coalesce(v_key, '') like '%agendamento%'
                              then 'review' else 'ignored' end,
           match_reason = 'não reconhecido', student_id = null, classroom_id = null, bank_student_id = null
     where id = e.id;
    return 'unmatched';
  end if;

  -- Aluno sem conta (só no Banco): guarda e espera o vínculo.
  if v_student is null and v_classroom is null then
    update public.google_calendar_events set match_state = 'no_account', match_reason = v_reason,
           bank_student_id = v_bank, student_id = null, classroom_id = null, language_app_key = v_lang where id = e.id;
    return 'no_account';
  end if;
  -- Idioma: o da regra/Banco; senão o vínculo ativo (precisa ser um só).
  if v_lang is null and v_student is not null then
    select count(*), min(language_app_key) into v_n, v_lang from public.teacher_students
     where teacher_id = e.user_id and student_id = v_student and status = 'active';
    if v_n <> 1 then
      update public.google_calendar_events set match_state = 'review', match_reason = 'aluno com mais de um idioma' where id = e.id;
      return 'review';
    end if;
  end if;
  -- Aluno com conta mas sem vínculo ativo naquele idioma: espera (não cria aula que ele não poderia ver).
  if v_student is not null and not public.teacher_link_is_active(e.user_id, v_student, v_lang) then
    update public.google_calendar_events set match_state = 'no_account', match_reason = 'sem vínculo ativo',
           bank_student_id = v_bank, student_id = v_student, language_app_key = v_lang where id = e.id;
    return 'no_account';
  end if;

  update public.google_calendar_events
     set match_state = 'linked', match_reason = v_reason, student_id = case when v_classroom is null then v_student end,
         classroom_id = v_classroom, bank_student_id = v_bank, language_app_key = v_lang
   where id = e.id returning * into e;
  perform public._gcal_materialize(e);
  return 'linked';
end $$;
revoke execute on function public._gcal_apply(bigint) from public, anon, authenticated;

create or replace function public.gcal_ingest(p_user uuid, p_calendar_id text, p_events jsonb, p_next_sync_token text, p_full boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ev jsonb; v_id bigint; v_res text; v_counts jsonb := '{}'::jsonb; v_old public.google_calendar_events;
begin
  if not exists (select 1 from public.google_calendar_sources where user_id = p_user and calendar_id = p_calendar_id and enabled) then
    return jsonb_build_object('ok', false, 'error', 'source_disabled');
  end if;
  for ev in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    select * into v_old from public.google_calendar_events where user_id = p_user and calendar_id = p_calendar_id and event_id = ev ->> 'id';
    insert into public.google_calendar_events (user_id, calendar_id, event_id, title, start_at, end_at, time_zone, all_day, status, attendees, updated_at)
    values (p_user, p_calendar_id, ev ->> 'id', left(ev ->> 'title', 300), (ev ->> 'start')::timestamptz, (ev ->> 'end')::timestamptz,
            nullif(ev ->> 'time_zone', ''), coalesce((ev ->> 'all_day')::boolean, false), coalesce(ev ->> 'status', 'confirmed'),
            coalesce(ev -> 'attendees', '[]'::jsonb), now())
    on conflict (user_id, calendar_id, event_id) do update set
      title = coalesce(excluded.title, google_calendar_events.title),
      start_at = coalesce(excluded.start_at, google_calendar_events.start_at),
      end_at = coalesce(excluded.end_at, google_calendar_events.end_at),
      time_zone = coalesce(excluded.time_zone, google_calendar_events.time_zone),
      all_day = excluded.all_day, status = excluded.status, attendees = excluded.attendees, updated_at = now()
    returning id into v_id;
    -- Nada mudou no Google desde a última leitura: não reprocessa (a leitura diária completa reenvia tudo).
    if v_old.id is not null and v_old.match_state <> 'pending'
       and v_old.title is not distinct from left(ev ->> 'title', 300)
       and v_old.start_at is not distinct from (ev ->> 'start')::timestamptz
       and v_old.end_at is not distinct from (ev ->> 'end')::timestamptz
       and v_old.status = coalesce(ev ->> 'status', 'confirmed')
       and v_old.attendees = coalesce(ev -> 'attendees', '[]'::jsonb) then
      v_res := 'same';
    -- Decisão manual para este evento ("ignorar só este" / aluno escolhido à mão): mantém, atualizando o horário.
    elsif v_old.id is not null and v_old.match_reason in ('ignorado pela professora', 'fora do site')
       and coalesce(ev ->> 'status', 'confirmed') <> 'cancelled' then
      v_res := 'kept';
    elsif v_old.id is not null and v_old.match_reason = 'escolhido pela professora'
       and coalesce(ev ->> 'status', 'confirmed') <> 'cancelled' then
      v_res := public._gcal_apply_target(v_id, v_old.student_id, v_old.classroom_id, v_old.bank_student_id, v_old.language_app_key);
    else
      v_res := public._gcal_apply(v_id);
    end if;
    -- Privacidade: evento que não é aula (pessoal, dia inteiro, "não é aula") não guarda título nem convidados.
    update public.google_calendar_events set title = null, attendees = '[]'::jsonb
     where id = v_id and match_state = 'ignored'
       and match_reason in ('não reconhecido', 'dia inteiro', 'regra: ignorar', 'ignorado pela professora',
                            'fora do site', 'regra: fora do site');
    v_counts := jsonb_set(v_counts, array[coalesce(v_res, 'none')], to_jsonb(coalesce((v_counts ->> coalesce(v_res, 'none'))::int, 0) + 1));
  end loop;
  update public.google_calendar_sources set sync_token = coalesce(p_next_sync_token, sync_token), last_synced_at = now()
   where user_id = p_user and calendar_id = p_calendar_id;
  update public.google_calendar_connections set last_sync_at = now(), last_error = null where user_id = p_user;
  return jsonb_build_object('ok', true, 'counts', v_counts);
end $$;
revoke execute on function public.gcal_ingest(uuid, text, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.gcal_ingest(uuid, text, jsonb, text, boolean) to service_role;

create or replace function public.google_calendar_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); c public.google_calendar_connections;
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  select * into c from public.google_calendar_connections where user_id = v_me;
  return jsonb_build_object(
    'connected', c.user_id is not null,
    'google_email', c.google_email, 'last_sync_at', c.last_sync_at, 'last_error', c.last_error,
    'sources', coalesce((select jsonb_agg(jsonb_build_object('calendar_id', s.calendar_id, 'summary', s.summary, 'is_primary', s.is_primary,
                                                             'enabled', s.enabled, 'mode', s.mode, 'last_synced_at', s.last_synced_at)
                                          order by s.is_primary desc, s.summary)
                           from public.google_calendar_sources s where s.user_id = v_me), '[]'::jsonb),
    'counts', (select jsonb_build_object(
                 'linked', count(*) filter (where match_state = 'linked'),
                 'review', count(*) filter (where match_state in ('review', 'cancelled') and skipped_at is null),
                 'skipped', count(*) filter (where match_state in ('review', 'cancelled') and skipped_at is not null),
                 'no_account', count(*) filter (where match_state = 'no_account'))
                 from public.google_calendar_events where user_id = v_me),
    'waiting', coalesce((select jsonb_agg(jsonb_build_object('name', w.name, 'n', w.n, 'reason', w.reason) order by w.n desc)
                           from (select coalesce(bs.name, p.display_name, '?') as name, e.match_reason as reason, count(*) n
                                   from public.google_calendar_events e
                                   left join public.review_bank_students bs on bs.id = e.bank_student_id
                                   left join public.profiles p on p.user_id = e.student_id
                                  where e.user_id = v_me and e.match_state = 'no_account'
                                  group by 1, 2) w), '[]'::jsonb)
  );
end $$;

create or replace function public.google_calendar_resolve(p_event_id bigint, p_action text, p_target text default null,
                                                          p_language text default null, p_remember boolean default true)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid(); e public.google_calendar_events; v_key text; v_key_type text; v_email text;
  v_student uuid; v_classroom bigint; v_bank uuid; v_res text; v_other bigint;
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  select * into e from public.google_calendar_events where id = p_event_id and user_id = v_me;
  if not found then raise exception 'not_found'; end if;

  -- Pular por agora / voltar para a lista: só marca; o evento continua sendo tentado a cada leitura (118).
  if p_action in ('skip', 'unskip') then
    update public.google_calendar_events set skipped_at = case when p_action = 'skip' then now() end where id = e.id;
    return p_action;
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

  if p_action = 'student' then
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
    insert into public.google_calendar_rules (teacher_id, key_type, key, action, ignore_kind, student_id, classroom_id, bank_student_id, language_app_key)
    values (v_me, v_key_type, v_key, case when p_action = 'outside' then 'ignore' else p_action end,
            case when p_action = 'outside' then 'outside' when p_action = 'ignore' then 'not_lesson' end,
            v_student, v_classroom, v_bank, p_language)
    on conflict (teacher_id, key_type, key) do update set action = excluded.action, ignore_kind = excluded.ignore_kind,
      student_id = excluded.student_id, classroom_id = excluded.classroom_id, bank_student_id = excluded.bank_student_id,
      language_app_key = excluded.language_app_key;
    v_res := public._gcal_apply(e.id);
    -- A regra vale também para os outros eventos esperando com a mesma chave.
    for v_other in select x.id from public.google_calendar_events x
                    where x.user_id = v_me and x.id <> e.id and x.match_state in ('review', 'pending')
                      and ((v_key_type = 'title' and public._gcal_key(x.title) = v_key)
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
  return public._gcal_apply_target(e.id, v_student, v_classroom, v_bank, p_language);
end $$;


create or replace function public.google_calendar_review_items()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'start_at', e.start_at, 'end_at', e.end_at, 'time_zone', e.time_zone,
      'match_state', e.match_state, 'match_reason', e.match_reason, 'attendees', e.attendees, 'skipped_at', e.skipped_at,
      'calendar_summary', s.summary,
      'class_log_id', (select l.id from public.teacher_class_logs l where l.google_event_ref = e.id))
      order by e.start_at desc nulls last)
    from public.google_calendar_events e
    left join public.google_calendar_sources s on s.user_id = e.user_id and s.calendar_id = e.calendar_id
   where e.user_id = v_me and e.match_state in ('review', 'cancelled')), '[]'::jsonb);
end $$;
revoke execute on function public.google_calendar_review_items() from public, anon;
grant execute on function public.google_calendar_review_items() to authenticated;
