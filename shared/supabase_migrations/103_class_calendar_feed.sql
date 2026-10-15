-- 103 -- Link de agenda (assinatura ICS): as aulas aparecem sozinhas no Google Agenda / Apple / Outlook.
-- Decisão da autora (2026-10-15): primeiro o link de assinatura (sem login no Google, sem OAuth); o botão
-- "Adicionar ao Google Agenda" de uma aula avulsa fica para depois.
-- 1 link por conta (serve para professora e aluno: a professora vê as aulas que deu; o aluno, as dele e as das
-- turmas dele, com vínculo ativo). O link é o segredo (64 hex, 256 bits); "Gerar outro link" invalida o antigo.
-- O feed é lido só pela Edge Function class-calendar-feed com a service role (nem anon nem authenticated executam).
-- Nunca sai no feed: Anotações (nota privada da professora) nem Observações.
-- Aditiva, sem DROP. Rollback: drop function class_calendar_feed(text), my_calendar_feed_token(boolean);
-- drop table calendar_feed_tokens.

create table if not exists public.calendar_feed_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);
alter table public.calendar_feed_tokens enable row level security;
-- Sem policy: só as funções abaixo leem/escrevem.
revoke all on public.calendar_feed_tokens from anon, authenticated;

-- Devolve o token da conta (cria na primeira vez). p_regenerate = true troca por um novo (o link antigo para).
create or replace function public.my_calendar_feed_token(p_regenerate boolean default false)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_new text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_tok text;
begin
  if v_me is null then raise exception 'not_authorized'; end if;
  if p_regenerate then
    insert into public.calendar_feed_tokens (user_id, token) values (v_me, v_new)
      on conflict (user_id) do update set token = excluded.token, created_at = now(), last_fetched_at = null
      returning token into v_tok;
  else
    insert into public.calendar_feed_tokens (user_id, token) values (v_me, v_new)
      on conflict (user_id) do nothing;
    select token into v_tok from public.calendar_feed_tokens where user_id = v_me;
  end if;
  return v_tok;
end $$;
revoke execute on function public.my_calendar_feed_token(boolean) from public, anon;
grant execute on function public.my_calendar_feed_token(boolean) to authenticated;

-- Aulas do dono do token, de 120 dias atrás em diante. role = 'teacher' (aula que ela deu) ou 'student'.
-- start_at = início em UTC (só quando há horário; sem horário = evento de dia inteiro em class_date).
create or replace function public.class_calendar_feed(p_token text)
returns table (id bigint, role text, language_app_key text, class_date date, start_at timestamptz,
               duration_minutes smallint, topic text, homework text, attendance_name text,
               who text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return; end if;
  update public.calendar_feed_tokens set last_fetched_at = now()
   where token = p_token returning user_id into v_user;
  if v_user is null then return; end if;

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
     and (l.teacher_id = v_user
          or (public.teacher_link_is_active(l.teacher_id, v_user, l.language_app_key)
              and (l.student_id = v_user
                   or (l.classroom_id is not null and exists (select 1 from public.classroom_members m
                                                               where m.classroom_id = l.classroom_id and m.student_id = v_user)))))
   order by l.class_date, l.start_time nulls first, l.id;
end $$;
revoke execute on function public.class_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.class_calendar_feed(text) to service_role;
