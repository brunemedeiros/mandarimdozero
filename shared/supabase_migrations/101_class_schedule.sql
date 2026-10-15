-- 101 -- Calendário de aulas: horário, duração e fuso de cada aula (agenda e, depois, link do Google Agenda).
-- Decisão da autora (2026-10-14/15): calendário como o do Notion, com datas futuras (aula avulsa ou repetida toda
-- semana). Data continua em class_date; horário é opcional (aula sem horário = dia inteiro). O fuso é o da professora
-- no momento do registro, para mostrar ao aluno no fuso dele (há alunos nos EUA).
-- Aditiva, sem DROP. Rollback: drop function get_my_class_schedule(text); alter table teacher_class_logs drop column
-- start_time, drop column duration_minutes, drop column time_zone.

alter table public.teacher_class_logs
  add column if not exists start_time time,
  add column if not exists duration_minutes smallint,
  add column if not exists time_zone text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'teacher_class_logs_duration_check') then
    alter table public.teacher_class_logs add constraint teacher_class_logs_duration_check
      check (duration_minutes is null or duration_minutes between 5 and 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teacher_class_logs_time_zone_check') then
    alter table public.teacher_class_logs add constraint teacher_class_logs_time_zone_check
      check (time_zone is null or char_length(time_zone) between 1 and 64);
  end if;
end $$;
create index if not exists teacher_class_logs_teacher_date_idx on public.teacher_class_logs (teacher_id, class_date);

-- Leitura do aluno com horário (get_my_class_log_entries da 094 continua igual; o app usa esta quando existe).
create or replace function public.get_my_class_schedule(p_language_app_key text)
returns table (id bigint, class_date date, start_time time, duration_minutes smallint, time_zone text,
               topic text, homework text, observations text, skills text[],
               attendance_name text, attendance_color text, classroom_id bigint, classroom_name text,
               created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.class_date, l.start_time, l.duration_minutes, l.time_zone,
         l.topic, l.homework, l.observations, l.skills,
         a.name, a.color, l.classroom_id, c.name, l.created_at, l.updated_at
    from public.teacher_class_logs l
    left join public.class_attendance_labels a on a.id = l.attendance_label_id
    left join public.classrooms c on c.id = l.classroom_id
   where l.language_app_key = p_language_app_key
     and public.teacher_link_is_active(l.teacher_id, auth.uid(), l.language_app_key)
     and (l.student_id = auth.uid()
          or (l.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                       where m.classroom_id = l.classroom_id and m.student_id = auth.uid())))
   order by l.class_date desc, l.start_time desc nulls last, l.id desc;
$$;
revoke execute on function public.get_my_class_schedule(text) from public, anon;
grant execute on function public.get_my_class_schedule(text) to authenticated;
