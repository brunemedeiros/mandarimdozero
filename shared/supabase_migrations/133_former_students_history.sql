-- 133: ex-alunas, pedido da autora (2026-11-10): "O nome da Carmen não aparece" e "no Google Agenda também não consigo
-- marcar as aulas de ex-alunos". A 132 só reconhecia ex-aluna por uma linha em teacher_students; quando o vínculo é
-- APAGADO (caso da Carmen), não sobra linha. Agora "já teve história com a professora no idioma" é qualquer um de:
-- vínculo em teacher_students (qualquer situação), aluno do Banco ligado à conta, ou aula registrada com ela.
-- 1) _teacher_had_student (nova, interna) usada no Notion (lista de ex-alunos, ligar nome, ligar linha, gravar). A RLS do
--    Banco (arquivar aluno cuja conta saiu do vínculo) aceita vínculo em qualquer situação OU aula registrada com ela
--    (por extenso: a função interna não é executável por authenticated, e olhar a própria tabela na política daria recursão).
-- 2) Google Agenda: ação 'former' em google_calendar_resolve (ex-aluna, só histórico; com "lembrar" vira regra
--    history_only). A aula entra no histórico dela sem aviso no Mural.
-- Só ADD COLUMN / ALTER POLICY / CREATE OR REPLACE; nada é apagado.

create or replace function public._teacher_had_student(p_teacher uuid, p_student uuid, p_lang text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_teacher is not null and p_student is not null and p_lang is not null and (
    exists (select 1 from public.teacher_students where teacher_id = p_teacher and student_id = p_student and language_app_key = p_lang)
    or exists (select 1 from public.review_bank_students where teacher_id = p_teacher and linked_student_id = p_student and language_app_key = p_lang)
    or exists (select 1 from public.teacher_class_logs where teacher_id = p_teacher and student_id = p_student and language_app_key = p_lang));
$$;
revoke execute on function public._teacher_had_student(uuid, uuid, text) from public, anon, authenticated;

alter policy review_bank_students_teacher_all on public.review_bank_students
  with check ((auth.uid() = teacher_id) and is_teacher() and has_permission('review_bank'::text)
    and ((linked_student_id is null)
      or (exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
                    and ts.language_app_key = review_bank_students.language_app_key and ts.status = 'active'))
      or (review_bank_students.status = 'arquivado'
          and (exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
                         and ts.language_app_key = review_bank_students.language_app_key)
               or exists (select 1 from public.teacher_class_logs l where l.teacher_id = auth.uid() and l.student_id = review_bank_students.linked_student_id
                         and l.language_app_key = review_bank_students.language_app_key))))
    and ((classroom_id is null) or _teacher_owns_classroom(classroom_id, language_app_key)));

alter table public.google_calendar_rules add column if not exists history_only boolean not null default false;
alter table public.google_calendar_events add column if not exists history_only boolean not null default false;

create or replace function public._notion_apply(p_page bigint, p_force boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  pg public.notion_pages;
  src public.notion_sources;
  r public.notion_name_links;
  v_key text; v_student uuid; v_classroom bigint; v_bank uuid; v_lang text; v_reason text; v_n int;
  v_log bigint; v_label bigint; v_history boolean := false;
begin
  select * into pg from public.notion_pages where id = p_page;
  if not found then return null; end if;
  select * into src from public.notion_sources where user_id = pg.user_id;
  -- 131: linha descartada pela professora fica descartada, mesmo relida ou editada no Notion.
  if pg.discarded_at is not null then
    update public.notion_pages set match_state = 'ignored', match_reason = 'descartada pela professora' where id = pg.id;
    return 'ignored';
  end if;
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

  -- 132: linha ligada à mão pela professora (ex.: linha sem nome no Notion) vale antes do nome.
  if pg.manual_action is not null then
    v_reason := 'ligada à mão';
    v_history := coalesce(pg.manual_history, false);
    v_student := pg.manual_student; v_classroom := pg.manual_classroom; v_lang := pg.manual_lang;
    if pg.manual_action = 'bank_student' then
      v_bank := pg.manual_bank;
      select s.linked_student_id, s.classroom_id, s.language_app_key into v_student, v_classroom, v_lang
        from public.review_bank_students s where s.id = pg.manual_bank;
    end if;
  end if;

  v_key := public._notion_key(pg.name);
  if v_key is null and v_reason is null then
    update public.notion_pages set match_state = 'review', match_reason = 'sem aluno' where id = pg.id;
    return 'review';
  end if;

  -- 1) nome ligado pela professora
  if v_reason is null then select * into r from public.notion_name_links where teacher_id = pg.user_id and key = v_key; end if;
  if v_reason is null and r.id is not null then
    if r.action = 'ignore' then
      update public.notion_pages set match_state = 'ignored', match_reason = 'nome ignorado' where id = pg.id;
      return 'ignored';
    end if;
    v_student := r.student_id; v_classroom := r.classroom_id; v_bank := r.bank_student_id; v_lang := r.language_app_key;
    v_reason := 'nome ligado';
    v_history := coalesce(r.history_only, false);
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
  -- 132/133: ex-aluna ligada "só para o histórico": grava a aula se ela já teve história com a professora nesse idioma.
  if v_history and v_student is not null and not public._teacher_had_student(pg.user_id, v_student, v_lang) then
    v_history := false;
  end if;
  if v_student is not null and not v_history and not public.teacher_link_is_active(pg.user_id, v_student, v_lang) then
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
  -- Histórico de ex-aluna: sem aviso no Mural (ela não vê mais o Mural da professora).
  if v_history then perform set_config('app.mural_skip', 'on', true); end if;
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
  if v_history then perform set_config('app.mural_skip', '', true); end if;
  update public.notion_pages set match_state = 'linked', class_log_id = v_log, applied_edited = last_edited, updated_at = now(),
         match_reason = case when v_history then 'ex-aluna (histórico)' else match_reason end
   where id = pg.id;
  return 'linked';
end $$;
revoke execute on function public._notion_apply(bigint, boolean) from public, anon, authenticated;

-- Ex-alunos da professora (sem vínculo ativo no idioma, mas com história), para o grupo "Ex-alunos (só histórico)".
create or replace function public.notion_former_students()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or not public.is_teacher() then jsonb_build_object('error', 'not_authorized')
  else jsonb_build_object('data', coalesce((select jsonb_agg(jsonb_build_object('student_id', x.student_id, 'language_app_key', x.language_app_key,
      'name', x.name) order by x.name) from (
    select distinct h.student_id, h.language_app_key, coalesce(nullif(p.display_name, ''), p.username, '?') as name
      from (select student_id, language_app_key from public.teacher_students where teacher_id = auth.uid()
            union select linked_student_id, language_app_key from public.review_bank_students where teacher_id = auth.uid() and linked_student_id is not null
            union select student_id, language_app_key from public.teacher_class_logs where teacher_id = auth.uid() and student_id is not null) h
      join public.profiles p on p.user_id = h.student_id
     where h.language_app_key is not null
       and not exists (select 1 from public.teacher_students a where a.teacher_id = auth.uid() and a.student_id = h.student_id
                         and a.language_app_key = h.language_app_key and a.status = 'active')) x), '[]'::jsonb)) end;
$$;

-- Ligar um nome a uma ex-aluna, só para o histórico.
create or replace function public.notion_link_former(p_name text, p_student uuid, p_lang text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_key text := public._notion_key(p_name); v_id bigint; v_n int := 0;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if v_key is null or p_student is null or p_lang is null then return jsonb_build_object('error', 'invalid'); end if;
  if not public._teacher_had_student(v_me, p_student, p_lang) then
    return jsonb_build_object('error', 'not_your_student');
  end if;
  insert into public.notion_name_links (teacher_id, key, action, student_id, language_app_key, history_only)
  values (v_me, v_key, 'student', p_student, p_lang, true)
  on conflict (teacher_id, key) do update set action = 'student', student_id = excluded.student_id, classroom_id = null,
    bank_student_id = null, language_app_key = excluded.language_app_key, history_only = true;
  for v_id in select id from public.notion_pages where user_id = v_me and public._notion_key(name) = v_key
                 and match_state in ('review', 'no_account', 'pending', 'ignored') and discarded_at is null
                 and coalesce(match_reason, '') not in ('apagada no Notion', 'antes de importar desde') loop
    perform public._notion_apply(v_id); v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- Ligar só esta linha (sem mexer no nome): aluno, ex-aluna (histórico), turma ou aluno do Banco.
create or replace function public.notion_assign_page(p_id bigint, p_action text, p_student uuid default null, p_classroom bigint default null,
                                                    p_bank uuid default null, p_lang text default null, p_history boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_res text;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if not exists (select 1 from public.notion_pages where id = p_id and user_id = v_me) then return jsonb_build_object('error', 'not_found'); end if;
  if p_action not in ('student', 'classroom', 'bank_student') then return jsonb_build_object('error', 'invalid'); end if;
  if p_action = 'student' and (p_lang is null or not (public.teacher_link_is_active(v_me, p_student, p_lang)
       or (coalesce(p_history, false) and public._teacher_had_student(v_me, p_student, p_lang)))) then
    return jsonb_build_object('error', 'not_your_student');
  end if;
  if p_action = 'classroom' and not exists (select 1 from public.classrooms where id = p_classroom and teacher_id = v_me) then
    return jsonb_build_object('error', 'not_your_classroom');
  end if;
  if p_action = 'bank_student' and not exists (select 1 from public.review_bank_students where id = p_bank and teacher_id = v_me) then
    return jsonb_build_object('error', 'not_your_bank_student');
  end if;
  update public.notion_pages set manual_action = p_action,
    manual_student = case when p_action = 'student' then p_student end,
    manual_classroom = case when p_action = 'classroom' then p_classroom end,
    manual_bank = case when p_action = 'bank_student' then p_bank end,
    manual_lang = case when p_action = 'student' then p_lang when p_action = 'classroom' then (select language_app_key from public.classrooms where id = p_classroom) end,
    manual_history = (p_action = 'student' and coalesce(p_history, false)),
    discarded_at = null
   where id = p_id;
  v_res := public._notion_apply(p_id);
  return jsonb_build_object('ok', true, 'state', v_res);
end $$;

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

-- Aplica um alvo escolhido à mão para um evento só (sem regra por título).
-- 133: evento marcado history_only (ex-aluna, só histórico) grava a aula sem aviso no Mural e sem exigir vínculo ativo.
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
  if e.history_only and (v_student is null or v_lang is null or not public._teacher_had_student(e.user_id, v_student, v_lang)) then
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
    v_res := public._gcal_apply(e.id);
    -- A regra vale também para os outros eventos esperando com a mesma chave.
    for v_other in select x.id from public.google_calendar_events x
                    where x.user_id = v_me and x.id <> e.id and x.match_state in ('review', 'pending', 'no_account')
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
  update public.google_calendar_events set history_only = (p_action = 'former') where id = e.id;
  return public._gcal_apply_target(e.id, v_student, v_classroom, v_bank, p_language);
end $$;

revoke execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) from public, anon;
grant execute on function public.google_calendar_resolve(bigint, text, text, text, boolean) to authenticated;
