-- 132: Notion e Banco, pedidos da autora (2026-11-10).
-- 1) Banco: arquivar (ou editar) aluno do Banco cuja conta ligada saiu do vínculo. A checagem da RLS exigia vínculo ATIVO
--    da conta ligada em todo UPDATE; agora aluno ARQUIVADO aceita conta que já teve vínculo (qualquer situação).
--    ALTER POLICY (sem DROP). Cartão continua só para vínculo ativo (approve_review_bank_item confere).
-- 2) Notion: ligar um nome a uma ex-aluna "só para o histórico" (notion_name_links.history_only; RPC notion_link_former):
--    a aula entra no histórico dela, sem aviso no Mural. Só com quem já teve vínculo com a professora nesse idioma.
-- 3) Notion: linha sem nome (ou qualquer linha para revisar) pode ser ligada à mão só ela (notion_assign_page) ou
--    descartada (notion_discard, vale para sempre como a 131).
-- Só ADD COLUMN / ALTER POLICY / CREATE OR REPLACE; nada é apagado.

alter policy review_bank_students_teacher_all on public.review_bank_students
  with check ((auth.uid() = teacher_id) and is_teacher() and has_permission('review_bank'::text)
    and ((linked_student_id is null)
      or (exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
                    and ts.language_app_key = review_bank_students.language_app_key and ts.status = 'active'))
      or (review_bank_students.status = 'arquivado'
          and exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid() and ts.student_id = review_bank_students.linked_student_id
                        and ts.language_app_key = review_bank_students.language_app_key)))
    and ((classroom_id is null) or _teacher_owns_classroom(classroom_id, language_app_key)));

alter table public.notion_name_links add column if not exists history_only boolean not null default false;
alter table public.notion_pages add column if not exists manual_action text check (manual_action is null or manual_action in ('student', 'classroom', 'bank_student'));
alter table public.notion_pages add column if not exists manual_student uuid references auth.users(id) on delete set null;
alter table public.notion_pages add column if not exists manual_classroom bigint references public.classrooms(id) on delete set null;
alter table public.notion_pages add column if not exists manual_bank uuid references public.review_bank_students(id) on delete set null;
alter table public.notion_pages add column if not exists manual_lang text check (manual_lang is null or manual_lang in ('frances', 'mandarim', 'portugues'));
alter table public.notion_pages add column if not exists manual_history boolean not null default false;

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
  -- 132: ex-aluna ligada "só para o histórico": grava a aula se ela já teve vínculo com a professora nesse idioma.
  if v_history and v_student is not null and not exists (select 1 from public.teacher_students ts
       where ts.teacher_id = pg.user_id and ts.student_id = v_student and ts.language_app_key = v_lang) then
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

-- Ex-alunos da professora (vínculo que não está ativo), para o grupo "Ex-alunos (só histórico)".
create or replace function public.notion_former_students()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or not public.is_teacher() then jsonb_build_object('error', 'not_authorized')
  else jsonb_build_object('data', coalesce((select jsonb_agg(jsonb_build_object('student_id', x.student_id, 'language_app_key', x.language_app_key,
      'name', x.name) order by x.name) from (
    select distinct ts.student_id, ts.language_app_key, coalesce(nullif(p.display_name, ''), p.username, '?') as name
      from public.teacher_students ts left join public.profiles p on p.user_id = ts.student_id
     where ts.teacher_id = auth.uid()
       and not exists (select 1 from public.teacher_students a where a.teacher_id = ts.teacher_id and a.student_id = ts.student_id
                         and a.language_app_key = ts.language_app_key and a.status = 'active')) x), '[]'::jsonb)) end;
$$;

-- Ligar um nome a uma ex-aluna, só para o histórico.
create or replace function public.notion_link_former(p_name text, p_student uuid, p_lang text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_key text := public._notion_key(p_name); v_id bigint; v_n int := 0;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  if v_key is null or p_student is null or p_lang is null then return jsonb_build_object('error', 'invalid'); end if;
  if not exists (select 1 from public.teacher_students where teacher_id = v_me and student_id = p_student and language_app_key = p_lang) then
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
  if p_action = 'student' and (p_lang is null or not exists (select 1 from public.teacher_students where teacher_id = v_me and student_id = p_student
       and language_app_key = p_lang and (status = 'active' or coalesce(p_history, false)))) then
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

-- Descartar linhas (qualquer estado menos já ligada): ficam descartadas para sempre (131).
create or replace function public.notion_discard(p_ids bigint[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_n int;
begin
  if v_me is null or not public.is_teacher() then return jsonb_build_object('error', 'not_authorized'); end if;
  update public.notion_pages set match_state = 'ignored', match_reason = 'descartada pela professora', discarded_at = now()
   where user_id = v_me and id = any(coalesce(p_ids, '{}')) and match_state <> 'linked';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

revoke execute on function public.notion_former_students(), public.notion_link_former(text, uuid, text),
  public.notion_assign_page(bigint, text, uuid, bigint, uuid, text, boolean), public.notion_discard(bigint[]) from public, anon;
grant execute on function public.notion_former_students(), public.notion_link_former(text, uuid, text),
  public.notion_assign_page(bigint, text, uuid, bigint, uuid, text, boolean), public.notion_discard(bigint[]) to authenticated;
