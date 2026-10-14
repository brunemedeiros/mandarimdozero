-- 094 -- Registro de aula: Presença (rótulos coloridos editáveis), Competências e aula de TURMA.
-- Decisões da autora (2026-10-14): Presença com cor (verde = presente, vermelho = faltou, outros rótulos criados
-- por ela depois), Competências como no Notion (Conversação, Gramática, Escrita, Leitura, Vocabulário, Escuta,
-- Pronúncia); Pontualidade e Uso da L1 ficam de fora. Aula de turma = 1 linha com classroom_id (sem aluno), vista
-- por todos os membros da turma com vínculo ativo (ex.: dupla em que só um aluno tem conta).
--
-- Aditiva. Única parte com DROP: "student_id drop not null" (aula de turma não tem aluno).
-- Rollback: alter table teacher_class_logs drop column attendance_label_id, drop column skills, drop column classroom_id
-- (só depois de apagar as aulas de turma), set not null em student_id; drop table class_attendance_labels;
-- drop function ensure_class_attendance_labels(), get_my_class_log_entries(text), _teacher_owns_classroom(bigint, text).

-- ---------- Rótulos de Presença (por professora) ----------
create table if not exists public.class_attendance_labels (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null check (color in ('green', 'red', 'yellow', 'orange', 'blue', 'purple', 'gray')),
  -- Para contagens futuras (frequência): o rótulo conta como presença, falta ou nenhum dos dois.
  counts_as text not null default 'other' check (counts_as in ('present', 'absent', 'other')),
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);
create index if not exists class_attendance_labels_teacher_idx on public.class_attendance_labels (teacher_id, sort_order);

alter table public.class_attendance_labels enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'class_attendance_labels' and policyname = 'class_attendance_labels_teacher_all') then
    create policy class_attendance_labels_teacher_all on public.class_attendance_labels to authenticated
      using (auth.uid() = teacher_id and public.is_teacher())
      with check (auth.uid() = teacher_id and public.is_teacher());
  end if;
end $$;
revoke all on public.class_attendance_labels from anon;
grant select, insert, update on public.class_attendance_labels to authenticated;

-- Cria os 2 rótulos padrão (Presente/verde, Faltou/vermelho) na primeira vez e devolve a lista da professora.
create or replace function public.ensure_class_attendance_labels()
returns setof public.class_attendance_labels
language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  if not exists (select 1 from public.class_attendance_labels where teacher_id = v_me) then
    insert into public.class_attendance_labels (teacher_id, name, color, counts_as, sort_order)
    values (v_me, 'Presente', 'green', 'present', 1), (v_me, 'Faltou', 'red', 'absent', 2);
  end if;
  return query select * from public.class_attendance_labels where teacher_id = v_me order by sort_order, id;
end $$;
revoke execute on function public.ensure_class_attendance_labels() from public, anon;
grant execute on function public.ensure_class_attendance_labels() to authenticated;

-- ---------- Aulas: novas colunas ----------
alter table public.teacher_class_logs
  add column if not exists attendance_label_id bigint references public.class_attendance_labels(id) on delete set null,
  add column if not exists skills text[] not null default '{}',
  -- restrict: apagar uma turma com aulas registradas falha (o histórico nunca some junto com a turma).
  add column if not exists classroom_id bigint references public.classrooms(id) on delete restrict;
alter table public.teacher_class_logs alter column student_id drop not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'teacher_class_logs_skills_check') then
    alter table public.teacher_class_logs add constraint teacher_class_logs_skills_check
      check (skills <@ array['conversacao', 'gramatica', 'escrita', 'leitura', 'vocabulario', 'escuta', 'pronuncia']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teacher_class_logs_target_check') then
    alter table public.teacher_class_logs add constraint teacher_class_logs_target_check
      check ((student_id is not null and classroom_id is null) or (student_id is null and classroom_id is not null));
  end if;
end $$;
create index if not exists teacher_class_logs_classroom_idx on public.teacher_class_logs (classroom_id, class_date desc) where classroom_id is not null;

-- classrooms não tem policy (087: tudo por RPC); a policy das aulas consulta a turma por esta função.
create or replace function public._teacher_owns_classroom(p_classroom_id bigint, p_language_app_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classrooms c
                  where c.id = p_classroom_id and c.teacher_id = auth.uid() and c.language_app_key = p_language_app_key);
$$;
revoke execute on function public._teacher_owns_classroom(bigint, text) from public, anon;
grant execute on function public._teacher_owns_classroom(bigint, text) to authenticated;

-- Escrita: aula de aluno exige vínculo ativo (como antes); aula de turma exige a turma ser dela, no mesmo idioma.
-- O rótulo de Presença precisa ser da própria professora.
alter policy teacher_class_logs_teacher_all on public.teacher_class_logs to authenticated
  using (auth.uid() = teacher_id and public.is_teacher())
  with check (auth.uid() = teacher_id and public.is_teacher()
              and (
                (student_id is not null and exists (select 1 from public.teacher_students ts where ts.teacher_id = auth.uid()
                     and ts.student_id = teacher_class_logs.student_id
                     and ts.language_app_key = teacher_class_logs.language_app_key and ts.status = 'active'))
                or (classroom_id is not null and public._teacher_owns_classroom(teacher_class_logs.classroom_id, teacher_class_logs.language_app_key))
              )
              and (attendance_label_id is null or exists (select 1 from public.class_attendance_labels a
                     where a.id = teacher_class_logs.attendance_label_id and a.teacher_id = auth.uid())));

-- ---------- Leitura do aluno (substitui get_my_class_logs no app; a antiga continua existindo) ----------
-- Aulas dele + aulas das turmas de que é membro, sempre com vínculo ativo com a professora no idioma.
-- Nunca devolve "notes" (Anotações, nota privada da professora).
create or replace function public.get_my_class_log_entries(p_language_app_key text)
returns table (id bigint, class_date date, topic text, homework text, observations text, skills text[],
               attendance_name text, attendance_color text, classroom_id bigint, classroom_name text,
               created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.class_date, l.topic, l.homework, l.observations, l.skills,
         a.name, a.color, l.classroom_id, c.name, l.created_at, l.updated_at
    from public.teacher_class_logs l
    left join public.class_attendance_labels a on a.id = l.attendance_label_id
    left join public.classrooms c on c.id = l.classroom_id
   where l.language_app_key = p_language_app_key
     and public.teacher_link_is_active(l.teacher_id, auth.uid(), l.language_app_key)
     and (l.student_id = auth.uid()
          or (l.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                       where m.classroom_id = l.classroom_id and m.student_id = auth.uid())))
   order by l.class_date desc, l.id desc;
$$;
revoke execute on function public.get_my_class_log_entries(text) from public, anon;
grant execute on function public.get_my_class_log_entries(text) to authenticated;
