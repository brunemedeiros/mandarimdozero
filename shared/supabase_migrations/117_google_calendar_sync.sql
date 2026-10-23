-- 117 -- Google Agenda -> site (sincronização em UM sentido; decisão da autora, 2026-10-23).
-- O horário de verdade das aulas vive no Google Agenda da professora (agendas "Trabalho" e a principal, que também tem eventos
-- pessoais). O site lê os eventos (Edge Function google-calendar, a cada 15 min) e cria ou atualiza a aula do aluno no dia e na
-- hora certos. Nunca escreve no Google. O conteúdo da aula (Presença, Competências, tema, tarefa, anotações) é do site.
-- Ida e volta completa fica para depois: cada aula guarda o evento (teacher_class_logs.google_event_ref).
--
-- Reconhecer o aluno de um evento, nesta ordem: regra aprendida (e-mail do convidado ou título), e-mail do convidado = conta de
-- aluno com vínculo ativo, título (texto antes de " - ") = um dos "nomes na agenda" do Banco (review_bank_students.agenda_names)
-- ou o primeiro nome de um aluno com vínculo. Sem reconhecer: agenda "todas são aulas" -> caixa "Eventos para revisar";
-- agenda "só as reconhecidas" -> ignora (eventos pessoais), salvo se tiver convidado ou "agendamento" no título.
-- Aluno sem conta no site: o evento fica guardado (match_state 'no_account') e vira aula quando a conta for vinculada.
-- Evento de dia inteiro: ignorado. Evento apagado/cancelado no Google: a aula NÃO some; vai para revisão.
-- Aula antiga sem horário (importada do Notion) do mesmo aluno no mesmo dia: é LIGADA ao evento e ganha o horário dele.
--
-- Tokens do Google: só a Edge Function (service_role) lê; nenhuma policy para o app.
-- Aditiva, sem DROP. Rollback: drop table google_calendar_events, google_calendar_rules, google_calendar_sources,
-- google_calendar_connections, google_oauth_states (cascade); alter table teacher_class_logs drop column google_event_ref;
-- drop das funções gcal_* e google_calendar_*.

-- ---------------- Tabelas ----------------
create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  refresh_token text not null,
  scopes text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text
);
alter table public.google_calendar_connections enable row level security;
revoke all on public.google_calendar_connections from anon, authenticated;

create table if not exists public.google_calendar_sources (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  summary text,
  is_primary boolean not null default false,
  enabled boolean not null default false,
  mode text not null default 'matched' check (mode in ('all', 'matched')),
  sync_token text,
  last_synced_at timestamptz,
  unique (user_id, calendar_id)
);
alter table public.google_calendar_sources enable row level security;
revoke all on public.google_calendar_sources from anon, authenticated;

create table if not exists public.google_calendar_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  event_id text not null,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  time_zone text,
  all_day boolean not null default false,
  status text not null default 'confirmed',
  attendees jsonb not null default '[]'::jsonb,       -- [{email, name}] sem o próprio dono
  match_state text not null default 'pending'
    check (match_state in ('pending', 'linked', 'review', 'no_account', 'ignored', 'cancelled')),
  match_reason text,
  student_id uuid references auth.users(id) on delete set null,
  classroom_id bigint references public.classrooms(id) on delete set null,
  bank_student_id uuid references public.review_bank_students(id) on delete set null,
  language_app_key text,
  updated_at timestamptz not null default now(),
  unique (user_id, calendar_id, event_id)
);
create index if not exists google_calendar_events_state_idx on public.google_calendar_events (user_id, match_state, start_at);
alter table public.google_calendar_events enable row level security;
revoke all on public.google_calendar_events from anon, authenticated;

create table if not exists public.google_calendar_rules (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  key_type text not null check (key_type in ('title', 'email')),
  key text not null check (char_length(key) between 1 and 200),
  action text not null check (action in ('student', 'classroom', 'bank_student', 'ignore')),
  student_id uuid references auth.users(id) on delete cascade,
  classroom_id bigint references public.classrooms(id) on delete cascade,
  bank_student_id uuid references public.review_bank_students(id) on delete cascade,
  language_app_key text,
  created_at timestamptz not null default now(),
  unique (teacher_id, key_type, key)
);
alter table public.google_calendar_rules enable row level security;
revoke all on public.google_calendar_rules from anon, authenticated;

create table if not exists public.google_oauth_states (
  state text primary key check (state ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text not null,
  created_at timestamptz not null default now()
);
alter table public.google_oauth_states enable row level security;
revoke all on public.google_oauth_states from anon, authenticated;

alter table public.teacher_class_logs
  add column if not exists google_event_ref bigint references public.google_calendar_events(id) on delete set null;
create unique index if not exists teacher_class_logs_google_event_ref_key
  on public.teacher_class_logs (google_event_ref) where google_event_ref is not null;

-- ---------------- Funções internas ----------------
-- Chave do título: texto antes do primeiro " - ", sem acento, minúsculo, espaços simples. "Cat - Prof. Brune" -> "cat".
create or replace function public._gcal_key(p_text text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(lower(translate(split_part(coalesce(p_text, ''), ' - ', 1),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '\s+', ' ', 'g')), '');
$$;

-- Liga um evento reconhecido (aluno ou turma) a uma aula: atualiza a já ligada, liga uma aula sem horário do mesmo dia
-- (importada) ou cria uma nova. Devolve o id da aula.
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
            or (p_event.classroom_id is not null and l.classroom_id = p_event.classroom_id))
     order by (l.start_time is null) desc, l.start_time, l.id
     limit 1;
  end if;
  if v_log is not null then
    update public.teacher_class_logs
       set google_event_ref = p_event.id, class_date = v_date, start_time = v_time, duration_minutes = v_dur,
           time_zone = v_tz, updated_at = now()
     where id = v_log;
  else
    insert into public.teacher_class_logs (teacher_id, student_id, classroom_id, language_app_key, class_date, start_time,
                                           duration_minutes, time_zone, google_event_ref)
    values (p_event.user_id, p_event.student_id, p_event.classroom_id, p_event.language_app_key, v_date, v_time,
            v_dur, v_tz, p_event.id)
    returning id into v_log;
  end if;
  return v_log;
end $$;
revoke execute on function public._gcal_materialize(public.google_calendar_events) from public, anon, authenticated;

-- Reconhece um evento e grava o resultado (e a aula, quando dá).
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
      update public.google_calendar_events set match_state = 'ignored', match_reason = 'regra: ignorar',
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

-- Aplica um alvo escolhido à mão para um evento só (sem regra por título).
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
  if v_student is not null and v_lang is null then
    select count(*), min(language_app_key) into n, v_lang from public.teacher_students
     where teacher_id = e.user_id and student_id = v_student and status = 'active';
    if n <> 1 then
      update public.google_calendar_events set match_state = 'review', match_reason = 'aluno com mais de um idioma' where id = e.id;
      return 'review';
    end if;
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
  perform public._gcal_materialize(e);
  return 'linked';
end $$;
revoke execute on function public._gcal_apply_target(bigint, uuid, bigint, uuid, text) from public, anon, authenticated;

-- ---------------- Para a Edge Function (service_role) ----------------
create or replace function public.gcal_new_state(p_user uuid, p_return_url text)
returns text language plpgsql security definer set search_path = public as $$
declare v_state text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  delete from public.google_oauth_states where created_at < now() - interval '1 hour';
  insert into public.google_oauth_states (state, user_id, return_url) values (v_state, p_user, p_return_url);
  return v_state;
end $$;

create or replace function public.gcal_take_state(p_state text)
returns table (user_id uuid, return_url text) language plpgsql security definer set search_path = public as $$
begin
  return query delete from public.google_oauth_states s
   where s.state = p_state and s.created_at > now() - interval '15 minutes'
   returning s.user_id, s.return_url;
end $$;

create or replace function public.gcal_save_connection(p_user uuid, p_email text, p_refresh text, p_scopes text, p_calendars jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.google_calendar_connections (user_id, google_email, refresh_token, scopes)
  values (p_user, p_email, p_refresh, p_scopes)
  on conflict (user_id) do update set google_email = excluded.google_email, refresh_token = excluded.refresh_token,
    scopes = excluded.scopes, connected_at = now(), last_error = null;
  perform public.gcal_save_calendars(p_user, p_calendars);
end $$;

-- Lista de agendas vinda do Google ({id, summary, primary}); não muda as escolhas já feitas.
create or replace function public.gcal_save_calendars(p_user uuid, p_calendars jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.google_calendar_sources (user_id, calendar_id, summary, is_primary)
  select p_user, c ->> 'id', c ->> 'summary', coalesce((c ->> 'primary')::boolean, false)
    from jsonb_array_elements(coalesce(p_calendars, '[]'::jsonb)) c where coalesce(c ->> 'id', '') <> ''
  on conflict (user_id, calendar_id) do update set summary = excluded.summary, is_primary = excluded.is_primary;
end $$;

-- O que sincronizar: conexões com pelo menos uma agenda ligada (p_user null = todas).
create or replace function public.gcal_sync_plan(p_user uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', c.user_id, 'refresh_token', c.refresh_token,
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('calendar_id', s.calendar_id, 'sync_token', s.sync_token,
                                                             'last_synced_at', s.last_synced_at)), '[]'::jsonb)
                  from public.google_calendar_sources s where s.user_id = c.user_id and s.enabled))), '[]'::jsonb)
    from public.google_calendar_connections c
   where (p_user is null or c.user_id = p_user)
     and exists (select 1 from public.google_calendar_sources s where s.user_id = c.user_id and s.enabled);
$$;

-- Recebe um lote de eventos de uma agenda e reconhece cada um. p_events: [{id, title, start, end, time_zone, all_day,
-- status, attendees:[{email,name}]}]. p_full = leitura completa (sem sync token).
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
    elsif v_old.id is not null and v_old.match_reason = 'ignorado pela professora'
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
       and match_reason in ('não reconhecido', 'dia inteiro', 'regra: ignorar', 'ignorado pela professora');
    v_counts := jsonb_set(v_counts, array[coalesce(v_res, 'none')], to_jsonb(coalesce((v_counts ->> coalesce(v_res, 'none'))::int, 0) + 1));
  end loop;
  update public.google_calendar_sources set sync_token = coalesce(p_next_sync_token, sync_token), last_synced_at = now()
   where user_id = p_user and calendar_id = p_calendar_id;
  update public.google_calendar_connections set last_sync_at = now(), last_error = null where user_id = p_user;
  return jsonb_build_object('ok', true, 'counts', v_counts);
end $$;

-- Sync token expirado (410 do Google): zera para a próxima leitura ser completa.
create or replace function public.gcal_reset_sync_token(p_user uuid, p_calendar_id text)
returns void language sql security definer set search_path = public as $$
  update public.google_calendar_sources set sync_token = null where user_id = p_user and calendar_id = p_calendar_id;
$$;

create or replace function public.gcal_set_error(p_user uuid, p_error text)
returns void language sql security definer set search_path = public as $$
  update public.google_calendar_connections set last_error = left(p_error, 500), last_sync_at = now() where user_id = p_user;
$$;

-- Reprocessa eventos esperando conta/vínculo (rodar depois de vincular um aluno; a função de sync chama sempre).
create or replace function public.gcal_retry_waiting(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare e public.google_calendar_events; n int := 0;
begin
  for e in select * from public.google_calendar_events where user_id = p_user and match_state in ('no_account', 'pending') loop
    if e.match_reason = 'escolhido pela professora' then
      perform public._gcal_apply_target(e.id, e.student_id, e.classroom_id, e.bank_student_id, e.language_app_key);
    else
      perform public._gcal_apply(e.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

do $$ declare f text; begin
  foreach f in array array['gcal_new_state(uuid, text)', 'gcal_take_state(text)', 'gcal_save_connection(uuid, text, text, text, jsonb)',
    'gcal_save_calendars(uuid, jsonb)', 'gcal_sync_plan(uuid)', 'gcal_ingest(uuid, text, jsonb, text, boolean)',
    'gcal_reset_sync_token(uuid, text)', 'gcal_set_error(uuid, text)', 'gcal_retry_waiting(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- ---------------- Para a tela da professora (authenticated) ----------------
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
                 'review', count(*) filter (where match_state in ('review', 'cancelled')),
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

create or replace function public.google_calendar_set_source(p_calendar_id text, p_enabled boolean, p_mode text)
returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  if p_mode not in ('all', 'matched') then raise exception 'invalid_mode'; end if;
  update public.google_calendar_sources set enabled = p_enabled, mode = p_mode,
         sync_token = case when enabled is distinct from p_enabled or mode is distinct from p_mode then null else sync_token end
   where user_id = v_me and calendar_id = p_calendar_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Caixa "Eventos para revisar": não reconhecidos e cancelados no Google com aula ligada.
create or replace function public.google_calendar_review_list()
returns table (id bigint, title text, start_at timestamptz, end_at timestamptz, time_zone text, match_state text, match_reason text,
               attendees jsonb, calendar_summary text, class_log_id bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  return query
  select e.id, e.title, e.start_at, e.end_at, e.time_zone, e.match_state, e.match_reason, e.attendees, s.summary,
         (select l.id from public.teacher_class_logs l where l.google_event_ref = e.id)
    from public.google_calendar_events e
    left join public.google_calendar_sources s on s.user_id = e.user_id and s.calendar_id = e.calendar_id
   where e.user_id = v_me and e.match_state in ('review', 'cancelled')
   order by e.start_at desc nulls last
   limit 300;
end $$;

-- Resolver um evento da caixa.
--   p_action: 'student' (p_target = uuid do aluno), 'classroom' (p_target = id da turma), 'bank_student' (p_target = id no Banco),
--             'ignore' (p_remember = true cria a regra "sempre ignorar esse título"), 'keep' (cancelado: manter a aula),
--             'unlink' (cancelado: soltar a aula do evento; a aula continua no site).
--   p_remember: grava a regra para os próximos eventos com o mesmo título (ou e-mail do convidado, se houver).
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

  if p_action in ('keep', 'unlink') then
    if p_action = 'unlink' then
      update public.teacher_class_logs set google_event_ref = null, updated_at = now() where google_event_ref = e.id and teacher_id = v_me;
    end if;
    update public.google_calendar_events set match_state = 'ignored', match_reason = 'ignorado pela professora' where id = e.id;
    return p_action;
  end if;

  select lower(a ->> 'email') into v_email from jsonb_array_elements(e.attendees) a where coalesce(a ->> 'email', '') <> '' limit 1;
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
  elsif p_action <> 'ignore' then
    raise exception 'invalid_action';
  end if;

  if p_remember and v_key is not null then
    insert into public.google_calendar_rules (teacher_id, key_type, key, action, student_id, classroom_id, bank_student_id, language_app_key)
    values (v_me, v_key_type, v_key, p_action, v_student, v_classroom, v_bank, p_language)
    on conflict (teacher_id, key_type, key) do update set action = excluded.action, student_id = excluded.student_id,
      classroom_id = excluded.classroom_id, bank_student_id = excluded.bank_student_id, language_app_key = excluded.language_app_key;
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
  if p_action = 'ignore' then
    update public.google_calendar_events set match_state = 'ignored', match_reason = 'ignorado pela professora' where id = e.id;
    return 'ignored';
  end if;
  -- Escolha só para este evento: fica gravada no próprio evento (match_reason 'escolhido pela professora') e as próximas
  -- leituras do Google a mantêm (gcal_ingest / gcal_retry_waiting).
  return public._gcal_apply_target(e.id, v_student, v_classroom, v_bank, p_language);
end $$;


create or replace function public.google_calendar_disconnect()
returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  -- Aulas continuam no site (google_event_ref vira null pelo on delete set null); regras ficam para uma reconexão.
  delete from public.google_calendar_events where user_id = v_me;
  delete from public.google_calendar_sources where user_id = v_me;
  delete from public.google_calendar_connections where user_id = v_me;
end $$;

do $$ declare f text; begin
  foreach f in array array['google_calendar_status()', 'google_calendar_set_source(text, boolean, text)', 'google_calendar_review_list()',
    'google_calendar_resolve(bigint, text, text, text, boolean)', 'google_calendar_disconnect()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------- Link de agenda (103/107) ----------------
-- Aula sem horário volta a ser "dia inteiro" (decisão da autora, 2026-10-23: as antigas nunca tiveram horário; o horário
-- certo vem do Google). Para quem conectou o Google, as aulas ligadas a um evento saem do link da PRÓPRIA professora
-- (já estão na agenda dela; evita duplicar). Alunos continuam recebendo tudo.
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
         case when l.teacher_id = v_user then coalesce(c.name, nullif(btrim(ps.display_name), ''), ps.username)
              else coalesce(c.name, nullif(btrim(pt.display_name), ''), pt.username) end,
         l.updated_at
    from public.teacher_class_logs l
    left join public.class_attendance_labels a on a.id = l.attendance_label_id
    left join public.classrooms c on c.id = l.classroom_id
    left join public.profiles ps on ps.user_id = l.student_id
    left join public.profiles pt on pt.user_id = l.teacher_id
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

-- ---------------- Leitura automática (pg_cron a cada 15 min; agendamento em docs/google-agenda/agendar-cron.sql) ----------------
-- Lê a URL e a senha do Vault (gcal_sync_url, gcal_sync_token) pelo leitor da 097 e chama a Edge Function por dentro do Supabase.
-- Sem nenhuma agenda ligada, não chama nada.
create or replace function public._gcal_cron_post()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text := public._rb_agent_secret('gcal_sync_url');
  v_token text := public._rb_agent_secret('gcal_sync_token');
begin
  if coalesce(v_url, '') = '' or coalesce(v_token, '') = '' then return; end if;
  if not exists (select 1 from public.google_calendar_sources where enabled) then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-token', v_token),
    body := '{"action":"sync"}'::jsonb,
    timeout_milliseconds := 120000);
end $$;
revoke execute on function public._gcal_cron_post() from public, anon, authenticated;

-- A Edge Function confere a senha do cron por aqui (a senha nasce e fica no Vault; nunca sai do banco).
create or replace function public.gcal_check_sync_token(p_token text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce(length(p_token) >= 32 and p_token = public._rb_agent_secret('gcal_sync_token'), false);
end $$;
revoke execute on function public.gcal_check_sync_token(text) from public, anon, authenticated;
grant execute on function public.gcal_check_sync_token(text) to service_role;
