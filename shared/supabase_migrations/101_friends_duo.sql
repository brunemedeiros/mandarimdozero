-- 101 -- Amigos em dupla: sequência com amigo, cutucar e missão em dupla da semana (2026-10-15).
--
-- Aprovado pela autora em 2026-10-14 (docs/amigos-seguir-x-amizade.md, seção 3) e liberado em 2026-10-15 ("pode fazer
-- todos eles"). Detalhes decididos na implementação: docs/historico/18-amigos-em-dupla.md. Tudo grátis.
--
-- 1. Sequência com amigo: dias seguidos em que os dois estudaram. Não precisa de tabela: a sequência de cada conta
--    (_account_streak, 086) é um bloco de dias seguidos terminando no último dia de estudo; os dias em que os dois
--    estudaram seguidos são a interseção dos dois blocos. Automática entre amigos aceitos (amigos já veem a sequência
--    um do outro, 086).
-- 2. Cutucar: lembrete para o amigo que ainda não estudou hoje. 1 por amigo por dia, no máximo 20 por dia; quem não
--    quer receber desliga em Configurações (friend_settings.accept_nudges). Aviso agrupado, como os parabéns.
-- 3. Missão em dupla: meta de XP juntos até domingo (150, 300 ou 600). Uma missão por pessoa por semana. Começa na
--    hora (já são amigos) e o amigo recebe aviso. Conta só o XP feito depois de começar (base gravada na criação).
--    Cumprida = aviso para os dois e +1 na conquista "Missões em Dupla" (my_duo_missions_done).
--    Se a amizade acabar antes de cumprir, a missão é desfeita e os dois ficam livres.
--
-- Sem DROP. Nenhuma linha existente muda; _friends_notify ganha os interruptores novos (mesma assinatura).
-- O gatilho em weekly_xp nunca impede o XP de ser salvo (erro dentro dele é engolido).
-- ROLLBACK (manual): drop trigger weekly_xp_duo_check on weekly_xp; drop das funções novas abaixo; drop table
--   duo_mission_members, duo_missions, friend_nudges; alter table friend_settings drop column accept_nudges,
--   drop column notify_missions; _friends_notify de volta à versão da 086.

alter table public.friend_settings add column if not exists accept_nudges boolean not null default true;
alter table public.friend_settings add column if not exists notify_missions boolean not null default true;

-- ---------- avisos: interruptores novos ----------
create or replace function public._friends_notify(
  p_user uuid, p_event text, p_title text, p_body text, p_action_tab text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channels jsonb;
  v_lang text;
  v_set friend_settings%rowtype;
begin
  select * into v_set from friend_settings where user_id = p_user;
  if found then
    if p_event = 'friend_request' and not v_set.notify_requests then return; end if;
    if p_event = 'friend_request_accepted' and not v_set.notify_accepts then return; end if;
    if p_event = 'friend_overtake' and not v_set.notify_overtakes then return; end if;
    if p_event in ('friend_congrats', 'friend_thanks') and not v_set.notify_congrats then return; end if;
    if p_event = 'friend_nudge' and not v_set.accept_nudges then return; end if;
    if p_event in ('duo_mission_started', 'duo_mission_done') and not v_set.notify_missions then return; end if;
  end if;
  select channels -> 'amigos' into v_channels from notification_preferences where user_id = p_user;
  if v_channels is not null and jsonb_typeof(v_channels) = 'array' and not (v_channels ? 'in_app') then
    return;
  end if;
  foreach v_lang in array array['frances', 'mandarim'] loop
    insert into notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
    values (p_user, v_lang, 'amigos', p_event, p_title, p_body, p_action_tab);
  end loop;
end;
$$;
revoke all on function public._friends_notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public._are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from friendships f where f.status = 'accepted'
    and ((f.requester_id = p_a and f.addressee_id = p_b) or (f.requester_id = p_b and f.addressee_id = p_a)));
$$;
revoke all on function public._are_friends(uuid, uuid) from public, anon, authenticated;

-- ---------- sequência com amigo ----------
-- Interseção dos blocos de dias seguidos das duas contas. 0 se algum dos dois perdeu a sequência.
create or replace function public._joint_streak(p_a uuid, p_b uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a record;
  b record;
  v int;
begin
  select * into a from public._account_streak(p_a);
  select * into b from public._account_streak(p_b);
  if coalesce(a.streak, 0) <= 0 or coalesce(b.streak, 0) <= 0 then return 0; end if;
  v := (least(a.last_day, b.last_day) - greatest(a.last_day - (a.streak - 1), b.last_day - (b.streak - 1))) + 1;
  return greatest(v, 0);
end;
$$;
revoke all on function public._joint_streak(uuid, uuid) from public, anon, authenticated;

-- ---------- cutucar ----------
create table if not exists public.friend_nudges (
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day),
  check (from_user <> to_user)
);
alter table public.friend_nudges enable row level security;
revoke all on public.friend_nudges from anon, authenticated;
create index if not exists friend_nudges_to_idx on public.friend_nudges (to_user, day);

create or replace function public.nudge_friend(p_friend uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_s record;
  v_joint int;
  v_name text;
  v_others int;
  v_body text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_friend is null or p_friend = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if not _are_friends(v_me, p_friend) then return jsonb_build_object('error', 'not_friends'); end if;
  if exists (select 1 from friend_settings s where s.user_id = p_friend and s.accept_nudges = false) then
    return jsonb_build_object('error', 'nudges_off');
  end if;
  select * into v_s from _account_streak(p_friend);
  if v_s.studied_today then return jsonb_build_object('error', 'already_studied'); end if;
  if exists (select 1 from friend_nudges n where n.from_user = v_me and n.to_user = p_friend and n.day = v_today) then
    return jsonb_build_object('ok', true, 'status', 'already');
  end if;
  if (select count(*) from friend_nudges n where n.from_user = v_me and n.day = v_today) >= 20 then
    return jsonb_build_object('error', 'daily_nudge_limit');
  end if;
  insert into friend_nudges (from_user, to_user, day) values (v_me, p_friend, v_today);

  v_name := _friend_display_name(v_me);
  v_joint := _joint_streak(v_me, p_friend);
  select count(*) - 1 into v_others from friend_nudges n where n.to_user = p_friend and n.day = v_today;
  v_body := case
    when v_others > 0 then v_name || ' e mais ' || v_others || case when v_others = 1 then ' amigo' else ' amigos' end
      || ' cutucaram você: bora estudar hoje? 👋'
    when v_joint >= 2 then v_name || ' cutucou você: estude hoje para manter os ' || v_joint || ' dias seguidos de vocês 👋'
    else v_name || ' cutucou você: bora estudar hoje? 👋' end;
  if v_others > 0 and exists (
    select 1 from notifications n where n.user_id = p_friend and n.event_type = 'friend_nudge'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
  ) then
    update notifications n set body = v_body, created_at = now()
    where n.user_id = p_friend and n.event_type = 'friend_nudge'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today;
  else
    perform _friends_notify(p_friend, 'friend_nudge', null, v_body, 'friends');
  end if;
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;
revoke all on function public.nudge_friend(uuid) from public, anon;
grant execute on function public.nudge_friend(uuid) to authenticated;

-- ---------- missão em dupla ----------
create table if not exists public.duo_missions (
  id bigint generated always as identity primary key,
  week_start date not null,
  user_a uuid not null references auth.users(id) on delete cascade, -- quem chamou
  user_b uuid not null references auth.users(id) on delete cascade,
  goal_xp int not null check (goal_xp in (150, 300, 600)),
  base_a int not null default 0 check (base_a >= 0),
  base_b int not null default 0 check (base_b >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (user_a <> user_b)
);
alter table public.duo_missions enable row level security;
revoke all on public.duo_missions from anon, authenticated;

-- Uma missão por pessoa por semana (a chave garante, mesmo com dois cliques ao mesmo tempo).
create table if not exists public.duo_mission_members (
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id bigint not null references public.duo_missions(id) on delete cascade,
  primary key (week_start, user_id)
);
alter table public.duo_mission_members enable row level security;
revoke all on public.duo_mission_members from anon, authenticated;
create index if not exists duo_mission_members_mission_idx on public.duo_mission_members (mission_id);
create index if not exists duo_missions_done_idx on public.duo_missions (user_a, user_b) where completed_at is not null;

create or replace function public._week_xp(p_user uuid, p_week date)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(w.amount), 0)::int from weekly_xp w where w.user_id = p_user and w.week_start = p_week;
$$;
revoke all on function public._week_xp(uuid, date) from public, anon, authenticated;

-- Marca como cumprida (uma vez só) e avisa os dois.
create or replace function public._duo_check(p_mission bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m duo_missions%rowtype;
  v_total int;
begin
  select * into m from duo_missions where id = p_mission for update;
  if not found or m.completed_at is not null then return; end if;
  v_total := greatest(_week_xp(m.user_a, m.week_start) - m.base_a, 0) + greatest(_week_xp(m.user_b, m.week_start) - m.base_b, 0);
  if v_total < m.goal_xp then return; end if;
  update duo_missions set completed_at = now() where id = m.id;
  perform _friends_notify(m.user_a, 'duo_mission_done', null,
    'Missão em dupla cumprida! Você e ' || _friend_display_name(m.user_b) || ' juntaram ' || m.goal_xp || ' XP 🎉', 'friends');
  perform _friends_notify(m.user_b, 'duo_mission_done', null,
    'Missão em dupla cumprida! Você e ' || _friend_display_name(m.user_a) || ' juntaram ' || m.goal_xp || ' XP 🎉', 'friends');
end;
$$;
revoke all on function public._duo_check(bigint) from public, anon, authenticated;

-- Gatilho: a cada XP salvo, confere a missão da semana de quem salvou. Nunca bloqueia o XP.
create or replace function public._weekly_xp_duo_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission bigint;
begin
  begin
    select mm.mission_id into v_mission from duo_mission_members mm
    where mm.week_start = new.week_start and mm.user_id = new.user_id;
    if v_mission is not null then perform _duo_check(v_mission); end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;
revoke all on function public._weekly_xp_duo_check() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'weekly_xp_duo_check' and tgrelid = 'public.weekly_xp'::regclass) then
    create trigger weekly_xp_duo_check after insert or update of amount on public.weekly_xp
      for each row execute function public._weekly_xp_duo_check();
  end if;
end $$;

create or replace function public.start_duo_mission(p_friend uuid, p_goal int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  v_id bigint;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_friend is null or p_friend = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if p_goal is null or p_goal not in (150, 300, 600) then return jsonb_build_object('error', 'invalid_goal'); end if;
  if not _are_friends(v_me, p_friend) then return jsonb_build_object('error', 'not_friends'); end if;
  if exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = v_me) then
    return jsonb_build_object('error', 'already_in_mission');
  end if;
  if exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = p_friend) then
    return jsonb_build_object('error', 'friend_in_mission');
  end if;
  insert into duo_missions (week_start, user_a, user_b, goal_xp, base_a, base_b)
  values (v_week, v_me, p_friend, p_goal, _week_xp(v_me, v_week), _week_xp(p_friend, v_week))
  returning id into v_id;
  begin
    insert into duo_mission_members (week_start, user_id, mission_id) values (v_week, v_me, v_id), (v_week, p_friend, v_id);
  exception when unique_violation then
    delete from duo_missions where id = v_id;
    return jsonb_build_object('error', 'friend_in_mission');
  end;
  perform _friends_notify(p_friend, 'duo_mission_started', null,
    _friend_display_name(v_me) || ' chamou você para uma missão em dupla: ' || p_goal || ' XP juntos até domingo 🤝', 'friends');
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.start_duo_mission(uuid, int) from public, anon;
grant execute on function public.start_duo_mission(uuid, int) to authenticated;

-- A missão desta semana (ou null). Volátil de propósito: confere se foi cumprida e desfaz a missão se a amizade acabou.
create or replace function public.my_duo_mission()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  m duo_missions%rowtype;
  v_partner uuid;
  v_mine int;
  v_theirs int;
  p profiles%rowtype;
begin
  if v_me is null then return null; end if;
  select d.* into m from duo_mission_members mm join duo_missions d on d.id = mm.mission_id
  where mm.week_start = v_week and mm.user_id = v_me;
  if not found then return null; end if;
  v_partner := case when m.user_a = v_me then m.user_b else m.user_a end;
  if m.completed_at is null and not _are_friends(v_me, v_partner) then
    delete from duo_missions where id = m.id; -- membros saem junto (on delete cascade)
    return null;
  end if;
  perform _duo_check(m.id);
  select * into m from duo_missions where id = m.id;
  v_mine := greatest(_week_xp(v_me, v_week) - case when m.user_a = v_me then m.base_a else m.base_b end, 0);
  v_theirs := greatest(_week_xp(v_partner, v_week) - case when m.user_a = v_me then m.base_b else m.base_a end, 0);
  select * into p from profiles where user_id = v_partner;
  return jsonb_build_object(
    'id', m.id, 'week_start', m.week_start, 'goal_xp', m.goal_xp, 'started_by_me', m.user_a = v_me,
    'my_xp', v_mine, 'partner_xp', v_theirs, 'completed_at', m.completed_at,
    'partner', jsonb_build_object('user_id', v_partner, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url));
end;
$$;
revoke all on function public.my_duo_mission() from public, anon;
grant execute on function public.my_duo_mission() to authenticated;

-- Conquista "Missões em Dupla": quantas missões a pessoa já cumpriu (o site grava o nível em earned_badges, 'duo.N').
create or replace function public.my_duo_missions_done()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then 0 else (
    select count(*)::int from duo_missions d
    where d.completed_at is not null and (d.user_a = auth.uid() or d.user_b = auth.uid())) end;
$$;
revoke all on function public.my_duo_missions_done() from public, anon;
grant execute on function public.my_duo_missions_done() to authenticated;

-- ---------- o que a tela de Amigos precisa por amigo ----------
-- joint_streak: dias seguidos juntos; studied_today: o amigo já estudou hoje; can_nudge: dá para cutucar agora;
-- nudged_today: eu já cutuquei hoje; in_mission: o amigo já está numa missão em dupla esta semana.
create or replace function public.friends_duo()
returns table(user_id uuid, joint_streak int, studied_today boolean, can_nudge boolean, nudged_today boolean, in_mission boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  if v_me is null then return; end if;
  return query
  with fr as (
    select case when f.requester_id = v_me then f.addressee_id else f.requester_id end as uid
    from friendships f where f.status = 'accepted' and (f.requester_id = v_me or f.addressee_id = v_me)
  )
  select fr.uid,
    _joint_streak(v_me, fr.uid),
    s.studied_today,
    (not s.studied_today and coalesce(fs.accept_nudges, true) and n.from_user is null),
    n.from_user is not null,
    exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = fr.uid)
  from fr
  cross join lateral _account_streak(fr.uid) s
  left join friend_settings fs on fs.user_id = fr.uid
  left join friend_nudges n on n.from_user = v_me and n.to_user = fr.uid and n.day = v_today;
end;
$$;
revoke all on function public.friends_duo() from public, anon;
grant execute on function public.friends_duo() to authenticated;
