-- 092 -- Trilha Pódio das conquistas com níveis (2026-10-14).
--
-- Decisão da autora (docs/conquistas-proposta-niveis.md): Pódio = semanas em 1º lugar entre os amigos (1, 5, 10).
-- Não cria tabela: weekly_xp já guarda o XP de cada semana (todos os idiomas somados, como o Ranking de Amigos).
--
-- my_podium_weeks(): quantas semanas JÁ FECHADAS a pessoa terminou em 1º entre ela e os amigos. Regras:
--   - só contam amigos cuja amizade já estava aceita no fim daquela semana (adicionar amigo hoje não dá pódio antigo);
--   - precisa de pelo menos 1 desses amigos com XP > 0 na semana (sem disputa não é pódio);
--   - 1º lugar = XP maior que o de cada amigo (empate não conta) e maior que 0.
-- O site grava o nível ganho em earned_badges ('podium.N'); se a amizade acabar depois, o nível não some.
-- Sem DROP. ROLLBACK: drop function public.my_podium_weeks();

create or replace function public.my_podium_weeks()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  v_count integer;
begin
  if v_me is null then return 0; end if;
  with mine as (
    select w.week_start, sum(w.amount)::int as amt
    from weekly_xp w
    where w.user_id = v_me and w.week_start < v_week
    group by w.week_start
    having sum(w.amount) > 0
  ),
  friends as (
    select case when f.requester_id = v_me then f.addressee_id else f.requester_id end as uid,
           coalesce(f.responded_at, f.requested_at) as since
    from friendships f
    where f.status = 'accepted' and (f.requester_id = v_me or f.addressee_id = v_me)
  ),
  rivals as (
    select w.week_start, w.user_id, sum(w.amount)::int as amt
    from weekly_xp w
    join friends fr on fr.uid = w.user_id
    where w.week_start < v_week
      and fr.since < (w.week_start + 7)::timestamp at time zone 'America/Sao_Paulo'
    group by w.week_start, w.user_id
    having sum(w.amount) > 0
  )
  select count(*)::int into v_count
  from mine m
  where exists (select 1 from rivals r where r.week_start = m.week_start)
    and m.amt > (select max(r.amt) from rivals r where r.week_start = m.week_start);
  return coalesce(v_count, 0);
end;
$$;
revoke all on function public.my_podium_weeks() from public, anon;
grant execute on function public.my_podium_weeks() to authenticated;
