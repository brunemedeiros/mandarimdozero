-- 089 -- Parabéns para conquistas com níveis (2026-10-14).
--
-- Decisões da autora (docs/conquistas-proposta-niveis.md): conquistas viram trilhas com níveis; amigos podem dar
-- parabéns a partir do ouro e no nível máximo (Amigos nunca). A 086 deixou target_kind 'badge' preparado e recusado.
--
-- 1. congratulate_friend: aceita p_kind 'badge' com p_ref = id do nível ('review.3'), ganho pelo amigo nos últimos
--    7 dias (earned_badges.earned_at). O resto (amizade, 1 reação por pessoa, 20 por dia, aviso agrupado) é o da 086.
-- 2. friends_badge_feed: conquistas com níveis dos amigos nos últimos 7 dias, uma linha por pessoa e nível (a mesma
--    conquista da conta é gravada em cada idioma), com os idiomas, a minha reação e o total de reações.
--
-- Níveis que a pessoa já tinha ao abrir o site entram em earned_badges com earned_at = 2026-10-01 (shared/auth.js,
-- backfill), então não aparecem como novidade aqui.
-- Sem DROP: só create or replace (assinaturas iguais) e uma função nova.
-- ROLLBACK: reaplicar congratulate_friend da 086; drop function public.friends_badge_feed(int);

create or replace function public.congratulate_friend(p_friend uuid, p_kind text, p_ref text, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_days int;
  v_run date;
  v_existing friend_congrats%rowtype;
  v_name text;
  v_others int;
  v_body text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_friend is null or p_friend = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if p_reaction is null or p_reaction not in ('🎉', '👏', '💪', '❤️') then return jsonb_build_object('error', 'invalid_reaction'); end if;
  if not exists (
    select 1 from friendships f where f.status = 'accepted'
      and ((f.requester_id = v_me and f.addressee_id = p_friend) or (f.requester_id = p_friend and f.addressee_id = v_me))
  ) then
    return jsonb_build_object('error', 'not_friends');
  end if;
  if p_kind = 'badge' then
    -- 089: conquista com níveis. p_ref = id do nível ('review.3'); o amigo tem de ter ganhado nos últimos 7 dias.
    -- O site só oferece o botão no ouro e no nível máximo (shared/badge-tracks.js, allowsCongrats); Amigos nunca.
    if p_ref is null or p_ref !~ '^[a-z][a-z0-9]*\.[0-9]{1,2}$' or p_ref like 'friends.%' then
      return jsonb_build_object('error', 'invalid_target');
    end if;
    if not exists (
      select 1 from earned_badges e
      where e.user_id = p_friend and e.badge_id = p_ref and e.earned_at > now() - interval '7 days'
    ) then
      return jsonb_build_object('error', 'target_not_found');
    end if;
  else
    if p_kind is distinct from 'streak' or p_ref !~ '^\d{1,3}@\d{4}-\d{2}-\d{2}$' then
      return jsonb_build_object('error', 'invalid_target');
    end if;
    v_days := split_part(p_ref, '@', 1)::int;
    v_run := split_part(p_ref, '@', 2)::date;
    if not exists (
      select 1 from streak_milestones s
      where s.user_id = p_friend and s.days = v_days and s.run_start = v_run and s.reached_at > now() - interval '7 days'
    ) then
      return jsonb_build_object('error', 'target_not_found');
    end if;
  end if;

  select * into v_existing from friend_congrats c
  where c.from_user = v_me and c.to_user = p_friend and c.target_kind = p_kind and c.target_ref = p_ref;
  if found then
    update friend_congrats set reaction = p_reaction where id = v_existing.id;
    return jsonb_build_object('ok', true, 'status', 'updated');
  end if;

  if (select count(*) from friend_congrats c
      where c.from_user = v_me and (c.created_at at time zone 'America/Sao_Paulo')::date = v_today) >= 20 then
    return jsonb_build_object('error', 'daily_congrats_limit');
  end if;

  insert into friend_congrats (from_user, to_user, target_kind, target_ref, reaction)
  values (v_me, p_friend, p_kind, p_ref, p_reaction);

  v_name := _friend_display_name(v_me);
  select count(distinct c.from_user) - 1 into v_others from friend_congrats c
  where c.to_user = p_friend and (c.created_at at time zone 'America/Sao_Paulo')::date = v_today;
  v_body := case when v_others > 0
    then v_name || ' e mais ' || v_others || case when v_others = 1 then ' amigo' else ' amigos' end || ' parabenizaram você ' || p_reaction
    else v_name || ' parabenizou você por ' || _congrats_target_label(p_kind, p_ref) || ' ' || p_reaction end;

  if v_others > 0 and exists (
    select 1 from notifications n where n.user_id = p_friend and n.event_type = 'friend_congrats'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
  ) then
    update notifications n set body = v_body, created_at = now()
    where n.user_id = p_friend and n.event_type = 'friend_congrats'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today;
  else
    perform _friends_notify(p_friend, 'friend_congrats', null, v_body, 'friends');
  end if;
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;
revoke all on function public.congratulate_friend(uuid, text, text, text) from public, anon;
grant execute on function public.congratulate_friend(uuid, text, text, text) to authenticated;

-- Conquistas com níveis dos amigos (últimos 7 dias), com a minha reação e se a pessoa agradeceu.
create or replace function public.friends_badge_feed(p_limit int default 30)
returns table(user_id uuid, username text, display_name text, avatar_url text, badge_id text, langs text[],
              earned_at timestamptz, my_reaction text, my_congrats_thanked boolean, total_reactions int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then return; end if;
  return query
  with b as (
    select e.user_id, e.badge_id, min(e.earned_at) as earned_at, array_agg(distinct e.language_app_key) as langs
    from earned_badges e
    join friendships f on f.status = 'accepted'
      and ((f.requester_id = v_me and f.addressee_id = e.user_id) or (f.addressee_id = v_me and f.requester_id = e.user_id))
    where e.earned_at > now() - interval '7 days' and e.badge_id ~ '^[a-z][a-z0-9]*\.[0-9]{1,2}$'
    group by e.user_id, e.badge_id
  )
  select b.user_id, p.username, p.display_name, p.avatar_url, b.badge_id, b.langs, b.earned_at,
    mine.reaction, mine.thanked_at is not null,
    (select count(*)::int from friend_congrats c where c.to_user = b.user_id and c.target_kind = 'badge' and c.target_ref = b.badge_id)
  from b
  left join profiles p on p.user_id = b.user_id
  left join friend_congrats mine on mine.from_user = v_me and mine.to_user = b.user_id and mine.target_kind = 'badge'
    and mine.target_ref = b.badge_id
  order by b.earned_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 60);
end;
$$;
revoke all on function public.friends_badge_feed(int) from public, anon;
grant execute on function public.friends_badge_feed(int) to authenticated;
