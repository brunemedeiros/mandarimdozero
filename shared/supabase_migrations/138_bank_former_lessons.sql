-- 138: aulas de ex-alunos SEM conta, ligadas ao aluno do Banco (pedido da autora, 2026-11-16: "sim, faça as aulas ligadas ao
-- aluno do Banco"; caso real: Jakob, português, só no Banco, arquivado, 31 eventos no Google Agenda).
-- Aplicada no Staging e na produção com os nomes 135a_class_logs_bank_target_check e 135_bank_former_lessons (2026-11-16/19);
-- no repo virou 138 porque outra conversa já tinha a 135 (135_agent_turma_cards_and_absences).
-- Ex-aluno sem conta = aluno do Banco ARQUIVADO e sem conta ligada (`_teacher_bank_former`).
-- 1) teacher_class_logs.bank_student_id (aula de ninguém com conta: sem aluno, sem turma, com aluno do Banco).
--    A checagem teacher_class_logs_target_check ganha esse terceiro caso (DROP + ADD da checagem, só ela; nenhum dado
--    muda; o MCP aplicou no Staging em 2026-11-16, ao contrário do que a skill previa para DROP).
-- 2) RLS das aulas: a professora edita aula de ex-aluno (com vínculo antigo ou ligado no Banco) e de ex-aluno sem conta.
--    Antes, editar uma aula da Carmen (ex-aluna) também seria barrado.
-- 3) Google Agenda: ação 'former_bank' em google_calendar_resolve (com "Lembrar" vira regra bank_student + history_only);
--    _gcal_apply/_gcal_apply_target/_gcal_materialize gravam a aula com bank_student_id, sem aviso no Mural.
-- 4) Mural: aula sem aluno e sem turma nunca gera aviso. Link de agenda: nome do aluno do Banco.
-- Fora a checagem, só ADD COLUMN / ALTER POLICY / CREATE OR REPLACE.

alter table public.teacher_class_logs add column if not exists bank_student_id uuid references public.review_bank_students(id) on delete restrict;
alter table public.teacher_class_logs drop constraint if exists teacher_class_logs_target_check;
alter table public.teacher_class_logs add constraint teacher_class_logs_target_check
  check ((student_id is not null and classroom_id is null)
      or (student_id is null and classroom_id is not null)
      or (student_id is null and classroom_id is null and bank_student_id is not null));
create index if not exists teacher_class_logs_bank_idx on public.teacher_class_logs (bank_student_id, class_date desc) where bank_student_id is not null;

create or replace function public._teacher_bank_former(p_teacher uuid, p_bank uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_teacher is not null and p_bank is not null and exists (select 1 from public.review_bank_students
    where id = p_bank and teacher_id = p_teacher and linked_student_id is null and classroom_id is null and status = 'arquivado');
$$;
revoke execute on function public._teacher_bank_former(uuid, uuid) from public, anon, authenticated;

alter policy teacher_class_logs_teacher_all on public.teacher_class_logs to authenticated
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher()
              and (
                (student_id is not null and (
                   exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid()
                     and ts.student_id = teacher_class_logs.student_id and ts.language_app_key = teacher_class_logs.language_app_key)
                   or exists (select 1 from public.review_bank_students b where b.teacher_id = auth.uid()
                     and b.linked_student_id = teacher_class_logs.student_id and b.language_app_key = teacher_class_logs.language_app_key)))
                or (classroom_id is not null and public._teacher_owns_classroom(teacher_class_logs.classroom_id, teacher_class_logs.language_app_key))
                or (student_id is null and classroom_id is null and bank_student_id is not null
                    and exists (select 1 from public.review_bank_students b where b.id = teacher_class_logs.bank_student_id
                                 and b.teacher_id = auth.uid() and b.linked_student_id is null and b.status = 'arquivado'
                                 and b.language_app_key = teacher_class_logs.language_app_key))
              )
              and (attendance_label_id is null or exists (select 1 from public.class_attendance_labels a
                     where a.id = teacher_class_logs.attendance_label_id and a.teacher_id = auth.uid())));

create or replace function public._mural_lesson_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.mural_skip', true), '') = 'on' then return new; end if;
  if new.student_id is null and new.classroom_id is null then return new; end if;  -- 138: ex-aluno sem conta
  if coalesce(btrim(new.topic), '') = '' and coalesce(btrim(new.homework), '') = '' then return new; end if;
  if tg_op = 'UPDATE' and new.topic is not distinct from old.topic and new.homework is not distinct from old.homework then
    return new;
  end if;
  begin
    perform public._mural_auto_post('lesson', new.id, new.teacher_id, new.language_app_key, new.classroom_id,
      case when new.classroom_id is null then new.student_id end,
      coalesce(nullif(btrim(new.topic), ''), new.homework));
  exception when others then
    raise warning 'mural: aviso da aula % não foi criado: %', new.id, sqlerrm;
  end;
  return new;
end $$;
revoke execute on function public._mural_lesson_trigger() from public, anon, authenticated;

create or replace function public.class_calendar_feed(p_token text)
returns table (id bigint, role text, language_app_key text, class_date date, start_at timestamptz,
               duration_minutes smallint, topic text, homework text, attendance_name text,
               who text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_has_google boolean;
begin
  if p_token is null or p_token !~ '^([0-9a-f]{64}|[a-z2-9]{16})$' then return; end if;
  update public.calendar_feed_tokens set last_fetched_at = now()
   where token = p_token returning user_id into v_user;
  if v_user is null then return; end if;
  v_has_google := exists (select 1 from public.google_calendar_connections where user_id = v_user);

  return query
  select l.id,
         case when l.teacher_id = v_user then 'teacher' else 'student' end,
         l.language_app_key, l.class_date,
         case when l.start_time is null then null
              else ((l.class_date + l.start_time) at time zone coalesce(l.time_zone, 'America/Sao_Paulo')) end,
         l.duration_minutes, l.topic, l.homework, a.name,
         case when l.teacher_id = v_user then coalesce(c.name, nullif(btrim(ps.display_name), ''), ps.username, b.name)
              else coalesce(c.name, nullif(btrim(pt.display_name), ''), pt.username) end,
         l.updated_at
    from public.teacher_class_logs l
    left join public.class_attendance_labels a on a.id = l.attendance_label_id
    left join public.classrooms c on c.id = l.classroom_id
    left join public.profiles ps on ps.user_id = l.student_id
    left join public.profiles pt on pt.user_id = l.teacher_id
    left join public.review_bank_students b on b.id = l.bank_student_id
   where l.class_date >= current_date - 120
     and ((l.teacher_id = v_user and not (v_has_google and l.google_event_ref is not null))
          or (l.teacher_id <> v_user
              and public.teacher_link_is_active(l.teacher_id, v_user, l.language_app_key)
              and (l.student_id = v_user
                   or (l.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                               where m.classroom_id = l.classroom_id and m.student_id = v_user)))))
   order by l.class_date, l.start_time nulls first, l.id;
end $$;
revoke execute on function public.class_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.class_calendar_feed(text) to service_role;

create or replace function public._gcal_materialize(p_event public.google_calendar_events)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_tz text := coalesce(nullif(p_event.time_zone, ''), 'America/Sao_Paulo');
  v_date date := (p_event.start_at at time zone v_tz)::date;
  v_time time := (p_event.start_at at time zone v_tz)::time;
  v_dur int := greatest(5, least(600, coalesce(round(extract(epoch from (p_event.end_at - p_event.start_at)) / 60)::int, 60)));
  v_log bigint;
begin
  select id into v_log from public.teacher_class_logs where google_event_ref = p_event.id;
  if v_log is null then
    select l.id into v_log from public.teacher_class_logs l
     where l.teacher_id = p_event.user_id and l.google_event_ref is null and l.class_date = v_date
       and l.language_app_key = p_event.language_app_key
       and ((p_event.student_id is not null and l.student_id = p_event.student_id)
            or (p_event.classroom_id is not null and l.classroom_id = p_event.classroom_id)
            or (p_event.student_id is null and p_event.classroom_id is null and p_event.bank_student_id is not null
                and l.bank_student_id = p_event.bank_student_id))
     order by (l.start_time is null) desc, l.start_time, l.id
     limit 1;
  end if;
  if v_log is not null then
    update public.teacher_class_logs
       set google_event_ref = p_event.id, class_date = v_date, start_time = v_time, duration_minutes = v_dur,
           time_zone = v_tz, updated_at = now()
     where id = v_log;
  else
    insert into public.teacher_class_logs (teacher_id, student_id, classroom_id, bank_student_id, language_app_key, class_date, start_time,
                                           duration_minutes, time_zone, google_event_ref)
    values (p_event.user_id, p_event.student_id, p_event.classroom_id,
            case when p_event.student_id is null and p_event.classroom_id is null then p_event.bank_student_id end,
            p_event.language_app_key, v_date, v_time, v_dur, v_tz, p_event.id)
    returning id into v_log;
  end if;
  return v_log;
end $$;
revoke execute on function public._gcal_materialize(public.google_calendar_events) from public, anon, authenticated;

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
  v_history boolean := false;
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
   where teacher_id = e.user_id and active and ((key_type = 'email' and key = any(v_emails)) or (key_type = 'title' and key = v_key))
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
    v_history := coalesce(r.history_only, false);
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

  -- 138: ex-aluno sem conta (aluno do Banco arquivado, regra "só histórico"): grava a aula ligada ao aluno do Banco.
  if v_history and v_student is null and v_classroom is null and public._teacher_bank_former(e.user_id, v_bank) then
    update public.google_calendar_events
       set match_state = 'linked', student_id = null, classroom_id = null, bank_student_id = v_bank, history_only = true,
           language_app_key = coalesce(v_lang, (select language_app_key from public.review_bank_students where id = v_bank)),
           match_reason = 'ex-aluno sem conta (histórico)'
     where id = e.id returning * into e;
    perform set_config('app.mural_skip', 'on', true);
    perform public._gcal_materialize(e);
    perform set_config('app.mural_skip', '', true);
    return 'linked';
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
  -- 133: regra de ex-aluna (só histórico) vale se ela já teve história com a professora nesse idioma.
  if v_history and (v_student is null or not public._teacher_had_student(e.user_id, v_student, v_lang)) then
    v_history := false;
  end if;
  -- Aluno com conta mas sem vínculo ativo naquele idioma: espera (não cria aula que ele não poderia ver).
  if v_student is not null and not v_history and not public.teacher_link_is_active(e.user_id, v_student, v_lang) then
    update public.google_calendar_events set match_state = 'no_account', match_reason = 'sem vínculo ativo',
           bank_student_id = v_bank, student_id = v_student, language_app_key = v_lang where id = e.id;
    return 'no_account';
  end if;

  update public.google_calendar_events
     set match_state = 'linked', student_id = case when v_classroom is null then v_student end,
         classroom_id = v_classroom, bank_student_id = v_bank, language_app_key = v_lang, history_only = v_history,
         match_reason = case when v_history then 'ex-aluna (histórico)' else v_reason end
   where id = e.id returning * into e;
  -- Histórico de ex-aluna: sem aviso no Mural.
  if v_history then perform set_config('app.mural_skip', 'on', true); end if;
  perform public._gcal_materialize(e);
  if v_history then perform set_config('app.mural_skip', '', true); end if;
  return 'linked';
end $$;
revoke execute on function public._gcal_apply(bigint) from public, anon, authenticated;

create or replace function public._gcal_apply_target(p_event_id bigint, p_student uuid, p_classroom bigint, p_bank uuid, p_lang text)
returns text language plpgsql security definer set search_path = public as $$
declare e public.google_calendar_events; v_lang text := p_lang; v_student uuid := p_student; v_classroom bigint := p_classroom; n int;
begin
  select * into e from public.google_calendar_events where id = p_event_id;
  if p_bank is not null and v_student is null and v_classroom is null then
    select linked_student_id, classroom_id, coalesce(v_lang, language_app_key) into v_student, v_classroom, v_lang
      from public.review_bank_students where id = p_bank;
  end if;
  if v_classroom is not null and v_lang is null then select language_app_key into v_lang from public.classrooms where id = v_classroom; end if;
  if e.history_only and not (p_bank is not null and v_student is null and v_classroom is null and public._teacher_bank_former(e.user_id, p_bank))
     and (v_student is null or v_lang is null or not public._teacher_had_student(e.user_id, v_student, v_lang)) then
    update public.google_calendar_events set history_only = false where id = e.id returning * into e;
  end if;
  if v_student is not null and v_lang is null then
    select count(*), min(language_app_key) into n, v_lang from public.teacher_students
     where teacher_id = e.user_id and student_id = v_student and status = 'active';
    if n <> 1 then
      update public.google_calendar_events set match_state = 'review', match_reason = 'aluno com mais de um idioma' where id = e.id;
      return 'review';
    end if;
  end if;
  if e.history_only and v_student is null and v_classroom is null and public._teacher_bank_former(e.user_id, p_bank) then
    update public.google_calendar_events set match_state = 'linked', match_reason = 'escolhido pela professora',
           student_id = null, classroom_id = null, bank_student_id = p_bank, language_app_key = v_lang
     where id = e.id returning * into e;
    perform set_config('app.mural_skip', 'on', true);
    perform public._gcal_materialize(e);
    perform set_config('app.mural_skip', '', true);
    return 'linked';
  end if;
  if v_student is null and v_classroom is null then
    update public.google_calendar_events set match_state = 'no_account', match_reason = 'escolhido pela professora',
           bank_student_id = p_bank, language_app_key = v_lang where id = e.id;
    return 'no_account';
  end if;
  update public.google_calendar_events set match_state = 'linked', match_reason = 'escolhido pela professora',
         student_id = case when v_classroom is null then v_student end, classroom_id = v_classroom, bank_student_id = p_bank,
         language_app_key = v_lang
   where id = e.id returning * into e;
  if e.history_only then perform set_config('app.mural_skip', 'on', true); end if;
  perform public._gcal_materialize(e);
  if e.history_only then perform set_config('app.mural_skip', '', true); end if;
  return 'linked';
end $$;
revoke execute on function public._gcal_apply_target(bigint, uuid, bigint, uuid, text) from public, anon, authenticated;

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

  if p_action = 'former_bank' then
    -- 138: ex-aluno sem conta = aluno do Banco ARQUIVADO e sem conta ligada; a aula fica ligada a ele, só para o histórico.
    v_bank := p_target::uuid;
    if not public._teacher_bank_former(v_me, v_bank) then raise exception 'not_your_student'; end if;
  elsif p_action = 'former' then
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
    values (v_me, v_key_type, v_key, case when p_action = 'outside' then 'ignore' when p_action = 'former' then 'student' when p_action = 'former_bank' then 'bank_student' else p_action end,
            case when p_action = 'outside' then 'outside' when p_action = 'ignore' then 'not_lesson' end,
            v_student, v_classroom, v_bank, p_language, p_action in ('former', 'former_bank'))
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
      values (v_me, 'title', v_title, case when p_action = 'outside' then 'ignore' when p_action = 'former' then 'student' when p_action = 'former_bank' then 'bank_student' else p_action end,
              case when p_action = 'outside' then 'outside' end, v_student, v_classroom, v_bank, p_language, p_action in ('former', 'former_bank'))
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
  update public.google_calendar_events set history_only = (p_action in ('former', 'former_bank')) where id = e.id;
  return public._gcal_apply_target(e.id, v_student, v_classroom, v_bank, p_language);
end $$;

revoke execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) from public, anon;
grant execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) to authenticated;
