-- 128 -- Conectar Notion: aulas do Notion da professora entram sozinhas no site (decisões da autora, 2026-11-03/05).
-- Plano: docs/notion/plano-conectar-notion.md. Sincronização em UM sentido: o site lê o Notion (Edge Function notion-sync,
-- a cada hora) e nunca escreve lá. Serve para qualquer professora, com ou sem Google Agenda.
--
-- Cada linha do banco de aulas do Notion (notion_pages) é ligada a um aluno ou turma pelo nome da coluna "Aluno":
-- regra salva pela professora, "nomes na agenda" do Banco, nome do aluno do Banco ou primeiro nome de um aluno com vínculo.
-- Depois casa com a aula do mesmo aluno/turma, dia e idioma (a do Google Agenda, se houver); sem aula, cria a aula no site.
-- Se o Google trouxer o evento depois, a 117 liga o evento a essa mesma aula (mesmo aluno e dia). Sem nome reconhecido: caixa
-- "Para revisar". Aluno do Banco sem conta: espera o vínculo.
-- Campos copiados (só os que a professora ligou na tela de colunas): Tópico, Para a próxima aula, Presença (rótulo de mesmo
-- nome; "Aula dada" = Presente, "Faltou/Cancelada" = Faltou; rótulo novo é criado), Competências e horário (se a data tiver hora).
-- Regra de edição: o Notion só grava na aula quando a linha muda lá (last_edited_time novo); editar no site não volta ao Notion.
-- Linhas com data anterior ao dia em que a professora ligou o Notion (e a partir de "importar desde") entram como
-- "para aprovar": nada muda na aula nem aparece para o aluno até ela aprovar, e aprovar não gera aviso no Mural nem sino.
-- Linhas novas (do dia da ligação em diante) entram direto e geram o aviso do Mural como se ela tivesse escrito no site.
-- Linha apagada/arquivada no Notion: a aula NÃO some.
--
-- Token do Notion: só a Edge Function (service_role) lê; nenhuma policy para o app.
-- Aditiva, sem DROP e sem apagar dado. Troca _mural_lesson_trigger (121) só para respeitar "aprovar sem aviso".

-- ---------------- Tabelas ----------------
create table if not exists public.notion_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id text,
  workspace_name text,
  bot_id text,
  access_token text not null,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text
);
alter table public.notion_connections enable row level security;
revoke all on public.notion_connections from anon, authenticated;

create table if not exists public.notion_sources (
  user_id uuid primary key references auth.users(id) on delete cascade,
  database_id text not null check (database_id ~ '^[0-9a-f-]{32,36}$'),
  title text,
  column_map jsonb not null default '{}'::jsonb,   -- {date, student, topic, homework, attendance, skills, language}: id da propriedade
  import_from date not null,                        -- linhas com data anterior são ignoradas
  linked_on date not null,                          -- linhas com data anterior a esta (e >= import_from) vêm "para aprovar"
  enabled boolean not null default true,
  cursor timestamptz,                               -- maior last_edited_time já lido
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.notion_sources enable row level security;
revoke all on public.notion_sources from anon, authenticated;

create table if not exists public.notion_oauth_states (
  state text primary key check (state ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  return_url text not null,
  created_at timestamptz not null default now()
);
alter table public.notion_oauth_states enable row level security;
revoke all on public.notion_oauth_states from anon, authenticated;

create table if not exists public.notion_name_links (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 200),
  action text not null check (action in ('student', 'classroom', 'bank_student', 'ignore')),
  student_id uuid references auth.users(id) on delete cascade,
  classroom_id bigint references public.classrooms(id) on delete cascade,
  bank_student_id uuid references public.review_bank_students(id) on delete cascade,
  language_app_key text check (language_app_key is null or language_app_key in ('frances', 'mandarim', 'portugues')),
  created_at timestamptz not null default now(),
  unique (teacher_id, key)
);
alter table public.notion_name_links enable row level security;
revoke all on public.notion_name_links from anon, authenticated;

create table if not exists public.notion_pages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  name text,                 -- texto da coluna Aluno, como está no Notion
  class_date date,
  start_time time,
  time_zone text,
  topic text,
  homework text,
  attendance text,
  skills text[] not null default '{}',
  language_hint text,        -- coluna Idioma, se houver
  archived boolean not null default false,
  last_edited timestamptz,
  applied_edited timestamptz,  -- last_edited que já foi gravado na aula
  match_state text not null default 'pending'
    check (match_state in ('pending', 'linked', 'approval', 'review', 'no_account', 'ignored')),
  match_reason text,
  student_id uuid references auth.users(id) on delete set null,
  classroom_id bigint references public.classrooms(id) on delete set null,
  bank_student_id uuid references public.review_bank_students(id) on delete set null,
  language_app_key text,
  class_log_id bigint references public.teacher_class_logs(id) on delete set null,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, page_id)
);
create index if not exists notion_pages_state_idx on public.notion_pages (user_id, match_state, class_date);
alter table public.notion_pages enable row level security;
revoke all on public.notion_pages from anon, authenticated;

alter table public.teacher_class_logs
  add column if not exists notion_page_ref bigint references public.notion_pages(id) on delete set null;
create unique index if not exists teacher_class_logs_notion_page_ref_key
  on public.teacher_class_logs (notion_page_ref) where notion_page_ref is not null;

-- ---------------- Funções internas ----------------
-- Chave do nome: sem acento, minúsculo, sem emoji/bandeira/pontuação, espaços simples. "Carol 🇧🇷" -> "carol".
create or replace function public._notion_key(p_text text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(regexp_replace(lower(translate(coalesce(p_text, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')), '');
$$;

-- Rótulo de Presença pelo nome do Notion (cria se não houver). "Aula dada" = Presente; "Faltou..." = Faltou.
create or replace function public._notion_label(p_teacher uuid, p_name text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_key text := public._notion_key(p_name); v_id bigint; v_name text;
begin
  if v_key is null then return null; end if;
  if v_key like 'aula dada%' then v_key := 'presente';
  elsif v_key like 'faltou%' then v_key := 'faltou'; end if;
  select id into v_id from public.class_attendance_labels
   where teacher_id = p_teacher and public._notion_key(name) = v_key order by archived, id limit 1;
  if v_id is not null then return v_id; end if;
  v_name := left(btrim(regexp_replace(p_name, '[^[:alnum:][:space:]/()-]', '', 'g')), 40);
  if coalesce(v_name, '') = '' then return null; end if;
  insert into public.class_attendance_labels (teacher_id, name, color, counts_as, sort_order)
  values (p_teacher, v_name, 'gray', 'other', 50)
  on conflict (teacher_id, name) do update set archived = false
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public._notion_label(uuid, text) from public, anon, authenticated;

-- Competências do Notion -> lista fixa do site (o que não casa fica de fora).
create or replace function public._notion_skills(p_names text[])
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct k) filter (where k is not null), '{}')
    from (select case public._notion_key(n)
                   when 'conversacao' then 'conversacao' when 'gramatica' then 'gramatica' when 'escrita' then 'escrita'
                   when 'leitura' then 'leitura' when 'vocabulario' then 'vocabulario' when 'escuta' then 'escuta'
                   when 'pronuncia' then 'pronuncia' end as k
            from unnest(coalesce(p_names, '{}')) n) s
$$;

-- Reconhece de quem é a linha e grava o resultado; quando dá, grava na aula (ou deixa "para aprovar").
create or replace function public._notion_apply(p_page bigint, p_force boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  pg public.notion_pages;
  src public.notion_sources;
  r public.notion_name_links;
  v_key text; v_student uuid; v_classroom bigint; v_bank uuid; v_lang text; v_reason text; v_n int;
  v_log bigint; v_label bigint;
begin
  select * into pg from public.notion_pages where id = p_page;
  if not found then return null; end if;
  select * into src from public.notion_sources where user_id = pg.user_id;
  if pg.archived then
    update public.notion_pages set match_state = 'ignored', match_reason = 'apagada no Notion' where id = pg.id;
    return 'ignored';
  end if;
  if pg.class_date is null then
    update public.notion_pages set match_state = 'review', match_reason = 'sem data' where id = pg.id;
    return 'review';
  end if;
  if src.user_id is not null and pg.class_date < src.import_from then
    update public.notion_pages set match_state = 'ignored', match_reason = 'antes de importar desde' where id = pg.id;
    return 'ignored';
  end if;

  v_key := public._notion_key(pg.name);
  if v_key is null then
    update public.notion_pages set match_state = 'review', match_reason = 'sem aluno' where id = pg.id;
    return 'review';
  end if;

  -- 1) nome ligado pela professora
  select * into r from public.notion_name_links where teacher_id = pg.user_id and key = v_key;
  if found then
    if r.action = 'ignore' then
      update public.notion_pages set match_state = 'ignored', match_reason = 'nome ignorado' where id = pg.id;
      return 'ignored';
    end if;
    v_student := r.student_id; v_classroom := r.classroom_id; v_bank := r.bank_student_id; v_lang := r.language_app_key;
    v_reason := 'nome ligado';
  end if;

  -- 2) aluno do Banco (nome ou "nomes na agenda")
  if v_reason is null then
    select count(*), min(s.id::text)::uuid into v_n, v_bank from public.review_bank_students s
     where s.teacher_id = pg.user_id and s.status = 'ativo'
       and exists (select 1 from unnest(s.agenda_names || s.name) n where public._notion_key(n) = v_key);
    if v_n = 1 then
      select s.linked_student_id, s.classroom_id, s.language_app_key into v_student, v_classroom, v_lang
        from public.review_bank_students s where s.id = v_bank;
      v_reason := 'nome no Banco';
    elsif v_n > 1 then
      update public.notion_pages set match_state = 'review', match_reason = 'mais de um aluno com esse nome' where id = pg.id;
      return 'review';
    else
      v_bank := null;
    end if;
  end if;

  -- 3) turma da professora com esse nome
  if v_reason is null then
    select count(*), min(c.id), min(c.language_app_key) into v_n, v_classroom, v_lang from public.classrooms c
     where c.teacher_id = pg.user_id and public._notion_key(c.name) = v_key;
    if v_n = 1 then v_reason := 'nome da turma'; else v_classroom := null; v_lang := null; end if;
  end if;

  -- 4) primeiro nome (ou nome inteiro) de um aluno com vínculo ativo
  if v_reason is null then
    select count(distinct ts.student_id), min(ts.student_id::text)::uuid into v_n, v_student
      from public.teacher_students ts join public.profiles p on p.user_id = ts.student_id
     where ts.teacher_id = pg.user_id and ts.status = 'active'
       and (public._notion_key(split_part(p.display_name, ' ', 1)) = split_part(v_key, ' ', 1)
            or public._notion_key(p.display_name) = v_key);
    if v_n = 1 then v_reason := 'nome do aluno'; else v_student := null; end if;
  end if;

  if v_reason is null then
    update public.notion_pages set match_state = 'review', match_reason = 'nome não reconhecido',
           student_id = null, classroom_id = null, bank_student_id = null where id = pg.id;
    return 'review';
  end if;

  if v_student is null and v_classroom is null then
    update public.notion_pages set match_state = 'no_account', match_reason = v_reason, bank_student_id = v_bank,
           language_app_key = v_lang where id = pg.id;
    return 'no_account';
  end if;

  -- Idioma: o da regra/Banco/turma; senão a coluna Idioma; senão o único vínculo ativo do aluno.
  if v_lang is null and v_student is not null then
    v_lang := case public._notion_key(pg.language_hint)
                when 'frances' then 'frances' when 'portugues' then 'portugues' when 'mandarim' then 'mandarim'
                when 'chines' then 'mandarim' end;
    if v_lang is null then
      select count(*), min(language_app_key) into v_n, v_lang from public.teacher_students
       where teacher_id = pg.user_id and student_id = v_student and status = 'active';
      if v_n <> 1 then
        update public.notion_pages set match_state = 'review', match_reason = 'aluno com mais de um idioma',
               student_id = v_student where id = pg.id;
        return 'review';
      end if;
    end if;
  end if;
  if v_student is not null and not public.teacher_link_is_active(pg.user_id, v_student, v_lang) then
    update public.notion_pages set match_state = 'no_account', match_reason = 'sem vínculo ativo', student_id = v_student,
           bank_student_id = v_bank, language_app_key = v_lang where id = pg.id;
    return 'no_account';
  end if;

  update public.notion_pages set student_id = v_student, classroom_id = v_classroom, bank_student_id = v_bank,
         language_app_key = v_lang, match_reason = v_reason where id = pg.id;

  -- Aula antiga (antes do dia em que ligou o Notion) e ainda não aprovada: espera a professora.
  if not p_force and pg.approved_at is null and src.user_id is not null and pg.class_date < src.linked_on then
    update public.notion_pages set match_state = 'approval' where id = pg.id;
    return 'approval';
  end if;
  -- Nada novo desde a última gravação.
  if not p_force and pg.applied_edited is not null and pg.last_edited is not null and pg.last_edited <= pg.applied_edited
     and pg.class_log_id is not null then
    update public.notion_pages set match_state = 'linked' where id = pg.id;
    return 'linked';
  end if;

  -- Aula: a já ligada, ou a do mesmo aluno/turma, dia e idioma ainda sem Notion (a do Google primeiro), ou uma nova.
  select id into v_log from public.teacher_class_logs where notion_page_ref = pg.id;
  if v_log is null then
    select l.id into v_log from public.teacher_class_logs l
     where l.teacher_id = pg.user_id and l.notion_page_ref is null and l.class_date = pg.class_date
       and l.language_app_key = v_lang
       and ((v_student is not null and l.student_id = v_student) or (v_classroom is not null and l.classroom_id = v_classroom))
     order by (l.google_event_ref is not null) desc,
              (pg.start_time is not null and l.start_time = pg.start_time) desc, l.start_time nulls last, l.id
     limit 1;
  end if;
  v_label := case when src.column_map ? 'attendance' and coalesce(pg.attendance, '') <> '' then public._notion_label(pg.user_id, pg.attendance) end;
  if v_log is null then
    insert into public.teacher_class_logs (teacher_id, student_id, classroom_id, language_app_key, class_date, start_time,
                                           time_zone, topic, homework, attendance_label_id, skills, notion_page_ref)
    values (pg.user_id, case when v_classroom is null then v_student end, v_classroom, v_lang, pg.class_date, pg.start_time,
            coalesce(pg.time_zone, 'America/Sao_Paulo'),
            case when src.column_map ? 'topic' then nullif(btrim(pg.topic), '') end,
            case when src.column_map ? 'homework' then nullif(btrim(pg.homework), '') end,
            v_label, case when src.column_map ? 'skills' then public._notion_skills(pg.skills) else '{}' end, pg.id)
    returning id into v_log;
  else
    update public.teacher_class_logs l set
      notion_page_ref = pg.id,
      topic = case when src.column_map ? 'topic' then nullif(btrim(pg.topic), '') else l.topic end,
      homework = case when src.column_map ? 'homework' then nullif(btrim(pg.homework), '') else l.homework end,
      attendance_label_id = case when src.column_map ? 'attendance' then coalesce(v_label, l.attendance_label_id) else l.attendance_label_id end,
      skills = case when src.column_map ? 'skills' and cardinality(pg.skills) > 0 then public._notion_skills(pg.skills) else l.skills end,
      -- horário do Notion só para aula que não veio do Google (o Google manda no horário)
      start_time = case when l.google_event_ref is null and pg.start_time is not null then pg.start_time else l.start_time end,
      time_zone = case when l.google_event_ref is null and pg.start_time is not null then coalesce(pg.time_zone, l.time_zone) else l.time_zone end,
      updated_at = now()
     where l.id = v_log;
  end if;
  update public.notion_pages set match_state = 'linked', class_log_id = v_log, applied_edited = last_edited, updated_at = now()
   where id = pg.id;
  return 'linked';
end $$;
revoke execute on function public._notion_apply(bigint, boolean) from public, anon, authenticated;

-- Aviso do Mural da aula (121) respeita "aprovar sem aviso": app.mural_skip = 'on' na transação.
create or replace function public._mural_lesson_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.mural_skip', true), '') = 'on' then return new; end if;
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

-- ---------------- Edge Function (service_role) ----------------
create or replace function public.notion_new_state(p_user uuid, p_return_url text)
returns text language plpgsql security definer set search_path = public as $$
declare v_state text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.notion_oauth_states (state, user_id, return_url) values (v_state, p_user, p_return_url);
  return v_state;
end $$;

create or replace function public.notion_take_state(p_state text)
returns table (user_id uuid, return_url text) language sql security definer set search_path = public as $$
  update public.notion_oauth_states s set created_at = '-infinity'
   where s.state = p_state and s.created_at > now() - interval '15 minutes'
  returning s.user_id, s.return_url
$$;

create or replace function public.notion_save_connection(p_user uuid, p_token text, p_workspace_id text, p_workspace_name text, p_bot_id text)
returns void language sql security definer set search_path = public as $$
  insert into public.notion_connections (user_id, access_token, workspace_id, workspace_name, bot_id, connected_at, last_error)
  values (p_user, p_token, p_workspace_id, p_workspace_name, p_bot_id, now(), null)
  on conflict (user_id) do update set access_token = excluded.access_token, workspace_id = excluded.workspace_id,
    workspace_name = excluded.workspace_name, bot_id = excluded.bot_id, connected_at = now(), last_error = null
$$;

create or replace function public.notion_token(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select nullif(access_token, '') from public.notion_connections where user_id = p_user
$$;

create or replace function public.notion_sync_plan(p_user uuid default null)
returns table (user_id uuid, access_token text, database_id text, column_map jsonb, import_from date, cursor timestamptz)
language sql stable security definer set search_path = public as $$
  select c.user_id, c.access_token, s.database_id, s.column_map, s.import_from, s.cursor
    from public.notion_connections c join public.notion_sources s on s.user_id = c.user_id
   where s.enabled and c.access_token <> '' and (p_user is null or c.user_id = p_user)
$$;

create or replace function public.notion_set_error(p_user uuid, p_error text)
returns void language sql security definer set search_path = public as $$
  update public.notion_connections set last_error = left(p_error, 300) where user_id = p_user
$$;

-- Recebe as linhas já lidas (só as colunas ligadas, em texto simples) e aplica as que mudaram.
-- p_rows: [{page_id, name, date, start_time, time_zone, topic, homework, attendance, skills[], language, archived, last_edited}]
create or replace function public.notion_ingest(p_user uuid, p_rows jsonb, p_cursor timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare x jsonb; v_id bigint; v_old timestamptz; v_res text; v_counts jsonb := '{}'::jsonb;
begin
  for x in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    select id, last_edited into v_id, v_old from public.notion_pages where user_id = p_user and page_id = x ->> 'page_id';
    if v_id is not null and v_old is not null and (x ->> 'last_edited')::timestamptz <= v_old then continue; end if;
    insert into public.notion_pages (user_id, page_id, name, class_date, start_time, time_zone, topic, homework, attendance,
                                     skills, language_hint, archived, last_edited, updated_at)
    values (p_user, x ->> 'page_id', left(x ->> 'name', 200), nullif(x ->> 'date', '')::date, nullif(x ->> 'start_time', '')::time,
            nullif(x ->> 'time_zone', ''), left(x ->> 'topic', 2000), left(x ->> 'homework', 2000), left(x ->> 'attendance', 100),
            coalesce((select array_agg(left(v, 60)) from jsonb_array_elements_text(coalesce(x -> 'skills', '[]'::jsonb)) v), '{}'),
            left(x ->> 'language', 60), coalesce((x ->> 'archived')::boolean, false), (x ->> 'last_edited')::timestamptz, now())
    on conflict (user_id, page_id) do update set name = excluded.name, class_date = excluded.class_date,
      start_time = excluded.start_time, time_zone = excluded.time_zone, topic = excluded.topic, homework = excluded.homework,
      attendance = excluded.attendance, skills = excluded.skills, language_hint = excluded.language_hint,
      archived = excluded.archived, last_edited = excluded.last_edited, updated_at = now()
    returning id into v_id;
    v_res := public._notion_apply(v_id);
    v_counts := jsonb_set(v_counts, array[coalesce(v_res, 'none')], to_jsonb(coalesce((v_counts ->> coalesce(v_res, 'none'))::int, 0) + 1));
  end loop;
  update public.notion_sources set cursor = greatest(coalesce(cursor, p_cursor), p_cursor), last_synced_at = now()
   where user_id = p_user and p_cursor is not null;
  update public.notion_sources set last_synced_at = now() where user_id = p_user;
  update public.notion_connections set last_sync_at = now(), last_error = null where user_id = p_user;
  return jsonb_build_object('ok', true, 'counts', v_counts);
end $$;

-- Linhas que estavam esperando (aluno sem conta/vínculo): tenta de novo.
create or replace function public.notion_retry_waiting(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_n int := 0;
begin
  for v_id in select id from public.notion_pages where user_id = p_user and match_state in ('no_account', 'pending') loop
    perform public._notion_apply(v_id); v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke execute on function public.notion_new_state(uuid, text), public.notion_take_state(text),
  public.notion_save_connection(uuid, text, text, text, text), public.notion_token(uuid), public.notion_sync_plan(uuid),
  public.notion_set_error(uuid, text), public.notion_ingest(uuid, jsonb, timestamptz), public.notion_retry_waiting(uuid)
  from public, anon, authenticated;
grant execute on function public.notion_new_state(uuid, text), public.notion_take_state(text),
  public.notion_save_connection(uuid, text, text, text, text), public.notion_token(uuid), public.notion_sync_plan(uuid),
  public.notion_set_error(uuid, text), public.notion_ingest(uuid, jsonb, timestamptz), public.notion_retry_waiting(uuid)
  to service_role;

-- ---------------- Professora (app) ----------------
create or replace function public.notion_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); c public.notion_connections; s public.notion_sources;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  select * into c from public.notion_connections where user_id = v_me and access_token <> '';
  if not found then return jsonb_build_object('connected', false); end if;
  select * into s from public.notion_sources where user_id = v_me;
  return jsonb_build_object('connected', true, 'workspace', c.workspace_name, 'connected_at', c.connected_at,
    'last_sync_at', c.last_sync_at, 'last_error', c.last_error,
    'source', case when s.user_id is null then null else jsonb_build_object('database_id', s.database_id, 'title', s.title,
      'column_map', s.column_map, 'import_from', s.import_from, 'linked_on', s.linked_on, 'enabled', s.enabled) end,
    'counts', (select jsonb_build_object(
        'linked', count(*) filter (where match_state = 'linked'),
        'approval', count(*) filter (where match_state = 'approval'),
        'review', count(*) filter (where match_state = 'review'),
        'no_account', count(*) filter (where match_state = 'no_account'),
        'recent', count(*) filter (where match_state = 'linked' and updated_at > now() - interval '7 days'))
      from public.notion_pages where user_id = v_me));
end $$;

-- Escolher o banco do Notion e as colunas. Primeira vez: linked_on = hoje (o que é de antes vem "para aprovar").
create or replace function public.notion_save_source(p_database_id text, p_title text, p_column_map jsonb, p_import_from date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_keys text[];
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if not exists (select 1 from public.notion_connections where user_id = v_me and access_token <> '') then return jsonb_build_object('error', 'not_connected'); end if;
  if coalesce(p_database_id, '') !~ '^[0-9a-f-]{32,36}$' then return jsonb_build_object('error', 'invalid_database'); end if;
  if jsonb_typeof(p_column_map) <> 'object' or not (p_column_map ? 'date') or not (p_column_map ? 'student') then
    return jsonb_build_object('error', 'need_date_and_student');
  end if;
  select array_agg(k) into v_keys from jsonb_object_keys(p_column_map) k;
  if exists (select 1 from unnest(v_keys) k where k not in ('date', 'student', 'topic', 'homework', 'attendance', 'skills', 'language')) then
    return jsonb_build_object('error', 'invalid_column');
  end if;
  if p_import_from is null or p_import_from > v_today or p_import_from < v_today - 400 then
    return jsonb_build_object('error', 'invalid_date');
  end if;
  insert into public.notion_sources (user_id, database_id, title, column_map, import_from, linked_on)
  values (v_me, p_database_id, left(p_title, 200), p_column_map, p_import_from, v_today)
  on conflict (user_id) do update set
    -- trocar de banco ou de colunas faz ler tudo de novo (cursor zerado); o dia da ligação fica o primeiro
    cursor = case when notion_sources.database_id = excluded.database_id and notion_sources.column_map = excluded.column_map
                  and notion_sources.import_from = excluded.import_from then notion_sources.cursor end,
    database_id = excluded.database_id, title = excluded.title, column_map = excluded.column_map,
    import_from = excluded.import_from, enabled = true, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Itens da caixa: para aprovar (aulas antigas), para revisar (nome não reconhecido etc.) e esperando conta.
create or replace function public.notion_review_items()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or not public.is_teacher() then jsonb_build_object('error', 'not_authorized')
  else jsonb_build_object('data', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'state', p.match_state, 'reason', p.match_reason, 'name', p.name, 'class_date', p.class_date,
      'start_time', p.start_time, 'topic', p.topic, 'homework', p.homework, 'attendance', p.attendance, 'skills', p.skills,
      'student_id', p.student_id, 'classroom_id', p.classroom_id, 'language_app_key', p.language_app_key,
      'target', coalesce((select c.name from public.classrooms c where c.id = p.classroom_id),
                         (select coalesce(nullif(pr.display_name, ''), pr.username) from public.profiles pr where pr.user_id = p.student_id),
                         (select b.name from public.review_bank_students b where b.id = p.bank_student_id)))
      order by p.class_date desc, p.id desc)
    from public.notion_pages p
   where p.user_id = auth.uid() and p.match_state in ('approval', 'review', 'no_account')), '[]'::jsonb)) end
$$;

-- Aprovar (grava na aula sem aviso no Mural nem sino) ou descartar uma linha "para aprovar".
create or replace function public.notion_approve(p_ids bigint[], p_approve boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id bigint; v_n int := 0; v_res text;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  perform set_config('app.mural_skip', 'on', true);
  for v_id in select id from public.notion_pages where user_id = v_me and match_state = 'approval'
                 and (p_ids is null or id = any(p_ids)) order by class_date, id loop
    if p_approve then
      update public.notion_pages set approved_at = now() where id = v_id;
      v_res := public._notion_apply(v_id, true);
    else
      update public.notion_pages set match_state = 'ignored', match_reason = 'descartada pela professora' where id = v_id;
    end if;
    v_n := v_n + 1;
  end loop;
  perform set_config('app.mural_skip', '', true);
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- Ligar um nome do Notion a um aluno, turma ou aluno do Banco (ou ignorar) e reprocessar as linhas desse nome.
create or replace function public.notion_link_name(p_name text, p_action text, p_student uuid default null,
                                                  p_classroom bigint default null, p_bank uuid default null, p_lang text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_key text := public._notion_key(p_name); v_id bigint; v_n int := 0;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if v_key is null or p_action not in ('student', 'classroom', 'bank_student', 'ignore') then return jsonb_build_object('error', 'invalid'); end if;
  if p_action = 'student' and (p_lang is null or not public.teacher_link_is_active(v_me, p_student, p_lang)) then
    return jsonb_build_object('error', 'not_your_student');
  end if;
  if p_action = 'classroom' and not exists (select 1 from public.classrooms where id = p_classroom and teacher_id = v_me) then
    return jsonb_build_object('error', 'not_your_classroom');
  end if;
  if p_action = 'bank_student' and not exists (select 1 from public.review_bank_students where id = p_bank and teacher_id = v_me) then
    return jsonb_build_object('error', 'not_your_bank_student');
  end if;
  insert into public.notion_name_links (teacher_id, key, action, student_id, classroom_id, bank_student_id, language_app_key)
  values (v_me, v_key, p_action, case when p_action = 'student' then p_student end, case when p_action = 'classroom' then p_classroom end,
          case when p_action = 'bank_student' then p_bank end,
          case when p_action = 'student' then p_lang when p_action = 'classroom' then (select language_app_key from public.classrooms where id = p_classroom) end)
  on conflict (teacher_id, key) do update set action = excluded.action, student_id = excluded.student_id,
    classroom_id = excluded.classroom_id, bank_student_id = excluded.bank_student_id, language_app_key = excluded.language_app_key;
  for v_id in select id from public.notion_pages where user_id = v_me and public._notion_key(name) = v_key
                 and match_state in ('review', 'no_account', 'pending', 'ignored') and coalesce(match_reason, '') <> 'apagada no Notion'
                 and coalesce(match_reason, '') <> 'descartada pela professora' and coalesce(match_reason, '') <> 'antes de importar desde' loop
    perform public._notion_apply(v_id); v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- Desconectar: apaga o token (fica vazio) e desliga a leitura; as aulas e o que já foi gravado nelas ficam.
create or replace function public.notion_disconnect()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  update public.notion_sources set enabled = false, cursor = null where user_id = v_me;
  update public.notion_connections set access_token = '', last_error = null where user_id = v_me;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.notion_status(), public.notion_save_source(text, text, jsonb, date), public.notion_review_items(),
  public.notion_approve(bigint[], boolean), public.notion_link_name(text, text, uuid, bigint, uuid, text), public.notion_disconnect()
  from public, anon;
grant execute on function public.notion_status(), public.notion_save_source(text, text, jsonb, date), public.notion_review_items(),
  public.notion_approve(bigint[], boolean), public.notion_link_name(text, text, uuid, bigint, uuid, text), public.notion_disconnect()
  to authenticated;
