-- 131: Conectar Notion, "Descartar" vale para sempre (correção da 128/130).
-- Problema: descartar só marcava match_state = 'ignored'; quando a linha era relida (edição no Notion, troca de coluna da 130),
-- _notion_apply recalculava o estado e a aula descartada voltava para "Para aprovar".
-- Correção: coluna discarded_at (só ADD COLUMN, sem DROP/DELETE); notion_approve(.., false) grava a data e _notion_apply respeita.

alter table public.notion_pages add column if not exists discarded_at timestamptz;
update public.notion_pages set discarded_at = coalesce(discarded_at, now())
 where match_state = 'ignored' and match_reason = 'descartada pela professora';

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
      update public.notion_pages set match_state = 'ignored', match_reason = 'descartada pela professora', discarded_at = now() where id = v_id;
    end if;
    v_n := v_n + 1;
  end loop;
  perform set_config('app.mural_skip', '', true);
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;
revoke execute on function public.notion_approve(bigint[], boolean) from public, anon;
grant execute on function public.notion_approve(bigint[], boolean) to authenticated;
