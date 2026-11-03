-- 124 -- Aba Turma no Ranking (plano da professora, docs/plano-professora-privacidade.md; pedido da autora, 2026-10-31).
-- A aba só aparece para quem está em alguma turma (aluno com vínculo ativo) e para a professora dona da turma.
-- Ranking da turma = os alunos da turma com vínculo ativo, XP da semana no idioma da turma (a professora não entra na lista).
-- Quem ainda não ganhou XP na semana aparece no fim, como no ranking de Amigos.
-- Foto só de perfil público ou de quem tem acesso total (mesma regra de profile_cards, 080); o nome aparece sempre (o Mural
-- da turma já mostra os colegas).
-- Só cria funções novas. Sem DROP e sem apagar dado.

create or replace function public.classroom_ranking_rooms()
returns table (id bigint, name text, language_app_key text, is_teacher boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.language_app_key, c.teacher_id = auth.uid()
    from public.classrooms c
   where auth.uid() is not null
     and (c.teacher_id = auth.uid()
          or (exists (select 1 from public.classroom_members m where m.classroom_id = c.id and m.student_id = auth.uid())
              and public._mural_active_link(c.teacher_id, auth.uid(), c.language_app_key)))
   order by (c.teacher_id = auth.uid()), c.name, c.id
$$;
revoke execute on function public.classroom_ranking_rooms() from public, anon;
grant execute on function public.classroom_ranking_rooms() to authenticated;

create or replace function public.classroom_leaderboard(p_classroom_id bigint, p_week date default null)
returns table (user_id uuid, amount integer, username text, display_name text,
               avatar_url text, featured_badge_id text, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_c public.classrooms%rowtype;
  v_week date := coalesce(p_week, date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date);
begin
  if v_me is null then return; end if;
  select * into v_c from public.classrooms where classrooms.id = p_classroom_id;
  if not found then return; end if;
  if not (v_c.teacher_id = v_me
          or (exists (select 1 from public.classroom_members m where m.classroom_id = v_c.id and m.student_id = v_me)
              and public._mural_active_link(v_c.teacher_id, v_me, v_c.language_app_key))) then
    return;
  end if;
  return query
  with members as (
    select m.student_id as uid
      from public.classroom_members m
     where m.classroom_id = v_c.id
       and public._mural_active_link(v_c.teacher_id, m.student_id, v_c.language_app_key)
  ),
  xp as (
    select w.user_id as uid, sum(w.amount)::int as amt
      from public.weekly_xp w
     where w.week_start = v_week and w.language_app_key = v_c.language_app_key
       and w.user_id in (select uid from members)
     group by w.user_id
  )
  select mb.uid, coalesce(x.amt, 0), p.username, p.display_name,
         case when p.public_profile or public._profile_full_access(p.user_id) or mb.uid = v_me then p.avatar_url end,
         p.featured_badge_id, (mb.uid = v_me)
    from members mb
    left join xp x on x.uid = mb.uid
    left join public.profiles p on p.user_id = mb.uid
   order by coalesce(x.amt, 0) desc, coalesce(nullif(btrim(p.display_name), ''), p.username);
end;
$$;
revoke execute on function public.classroom_leaderboard(bigint, date) from public, anon;
grant execute on function public.classroom_leaderboard(bigint, date) to authenticated;
