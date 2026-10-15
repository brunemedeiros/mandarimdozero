-- 109 -- Missão em dupla automática da semana: 4 dias de estudo cada (2026-10-15).
--
-- Decisões da autora (2026-10-15, prévia https://claude.ai/artifact/MdWXEhK4cZN5REQLPAxXWY):
--   - toda segunda o site forma as duplas sozinho (sem formulário); meta = 4 dias de estudo de CADA um até domingo;
--   - aparece no quadro "Missões do dia", no fim da lição e na aba Amigos (com "Chamar para missão" no cartão do amigo);
--   - sem botão de recusar ou trocar dupla (agressivo para o outro). Saída silenciosa: "Participar das missões em dupla"
--     (friend_settings.join_duo_missions, ligada por padrão) tira a pessoa do sorteio a partir da segunda seguinte,
--     sem aviso para ninguém; quem não estudou na semana anterior não entra no sorteio; missão não cumprida termina
--     sem culpa (nada de "fulano não cumpriu");
--   - cumpriu: aviso para os dois e +1 na conquista Missões em Dupla; na segunda seguinte a dupla MUDA (preferência por
--     quem não fez dupla com a pessoa nas últimas semanas; com um só amigo ativo, repete).
-- Dia de estudo = dia (horário de Brasília) em que a conta ganhou XP (gatilho em weekly_xp grava study_days). Para não
-- começar zerado, study_days recebe os dias da sequência atual de cada conta dentro desta semana.
-- O sorteio roda segunda às 8h (pg_cron, 11h UTC) e também na primeira abertura da aba depois disso, se o cron não rodou.
-- "Chamar para missão" (start_duo_mission) agora cria missão de dias: meta = 4, ou os dias que faltam até domingo.
-- Missões antigas de XP (102) continuam valendo até o fim da semana em que foram criadas.
-- Sem DROP. Nenhuma linha existente muda (só colunas novas com padrão).
-- ROLLBACK: cron.unschedule('duo-pair-weekly'); drop das funções novas; drop table study_days, duo_pairing_runs;
--   colunas novas de duo_missions e friend_settings; funções recriadas de volta às versões da 102.

alter table public.friend_settings add column if not exists join_duo_missions boolean not null default true;
alter table public.duo_missions add column if not exists kind text not null default 'xp' check (kind in ('xp', 'days'));
alter table public.duo_missions add column if not exists goal_days int check (goal_days between 1 and 7);
alter table public.duo_missions add column if not exists start_day date;
alter table public.duo_missions add column if not exists auto boolean not null default false;
-- goal_xp continua obrigatória (check 150/300/600 da 102): nas missões de dias ela fica 150 e não é usada.

create table if not exists public.study_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.study_days enable row level security;
revoke all on public.study_days from anon, authenticated;

create table if not exists public.duo_pairing_runs (
  week_start date primary key,
  ran_at timestamptz not null default now(),
  pairs int not null default 0
);
alter table public.duo_pairing_runs enable row level security;
revoke all on public.duo_pairing_runs from anon, authenticated;

-- Dias desta semana já estudados (sequência atual de cada conta), para a primeira semana não começar zerada.
insert into public.study_days (user_id, day)
select g.user_id, d::date
from public.progress g
cross join lateral public._account_streak(g.user_id) s
cross join lateral generate_series(
  greatest(s.last_day - (s.streak - 1), date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date),
  s.last_day, interval '1 day') d
where s.streak > 0 and s.last_day is not null
on conflict do nothing;

create or replace function public._friends_msg(p_event text, p_lang text, p jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  en boolean := p_lang = 'en';
  n text := coalesce(p ->> 'name', case when p_lang = 'en' then 'A friend' else 'Um amigo' end);
  o int := coalesce((p ->> 'others')::int, 0);
  r text := coalesce(p ->> 'reaction', '');
begin
  return case p_event
    when '_title' then case when en then 'Friends' else 'Amigos' end
    when 'friend_request' then n || case when en then ' sent you a friend request 👋' else ' enviou um pedido de amizade 👋' end
    when 'friend_request_accepted' then n || case when en then ' accepted your friend request 🎉' else ' aceitou seu pedido de amizade 🎉' end
    when 'friend_overtake' then n || case when en then ' passed you in this week''s ranking 🏃' else ' passou você no ranking da semana 🏃' end
    when 'friend_thanks' then n || case when en then ' thanked you for your congrats 💛' else ' agradeceu seu parabéns 💛' end
    when 'friend_congrats' then case
      when o > 0 and en then n || ' and ' || o || ' more ' || case when o = 1 then 'friend' else 'friends' end || ' congratulated you ' || r
      when o > 0 then n || ' e mais ' || o || case when o = 1 then ' amigo' else ' amigos' end || ' parabenizaram você ' || r
      when p ->> 'kind' = 'streak' and en then n || ' congratulated you on your ' || (p ->> 'days') || '-day streak ' || r
      when p ->> 'kind' = 'streak' then n || ' parabenizou você por seus ' || (p ->> 'days') || ' dias seguidos ' || r
      when en then n || ' congratulated you on your achievement ' || r
      else n || ' parabenizou você por sua conquista ' || r end
    when 'friend_nudge' then case
      when o > 0 and en then n || ' and ' || o || ' more ' || case when o = 1 then 'friend' else 'friends' end || ' nudged you: time to study today? 👋'
      when o > 0 then n || ' e mais ' || o || case when o = 1 then ' amigo' else ' amigos' end || ' cutucaram você: bora estudar hoje? 👋'
      when coalesce((p ->> 'joint')::int, 0) >= 2 and en then n || ' nudged you: study today to keep your ' || (p ->> 'joint') || '-day streak together 👋'
      when coalesce((p ->> 'joint')::int, 0) >= 2 then n || ' cutucou você: estude hoje para manter os ' || (p ->> 'joint') || ' dias seguidos de vocês 👋'
      when en then n || ' nudged you: time to study today? 👋'
      else n || ' cutucou você: bora estudar hoje? 👋' end
    when 'duo_mission_started' then case
      when p ? 'days' and en then n || ' invited you to a duo mission: ' || (p ->> 'days') || ' study days each by Sunday 🤝'
      when p ? 'days' then n || ' chamou você para uma missão em dupla: ' || (p ->> 'days') || ' dias de estudo cada até domingo 🤝'
      when en then n || ' invited you to a duo mission: ' || (p ->> 'goal') || ' XP together by Sunday 🤝'
      else n || ' chamou você para uma missão em dupla: ' || (p ->> 'goal') || ' XP juntos até domingo 🤝' end
    when 'duo_week_paired' then case when en
      then 'Your mission this week: you and ' || n || ' each study ' || (p ->> 'days') || ' days by Sunday 🤝'
      else 'Sua missão da semana: você e ' || n || ' estudam ' || (p ->> 'days') || ' dias cada até domingo 🤝' end
    when 'duo_mission_done' then case
      when p ? 'days' and en then 'Duo mission complete! You and ' || n || ' each studied ' || (p ->> 'days') || ' days 🎉'
      when p ? 'days' then 'Missão em dupla cumprida! Você e ' || n || ' estudaram ' || (p ->> 'days') || ' dias cada 🎉'
      when en then 'Duo mission complete! You and ' || n || ' earned ' || (p ->> 'goal') || ' XP 🎉'
      else 'Missão em dupla cumprida! Você e ' || n || ' juntaram ' || (p ->> 'goal') || ' XP 🎉' end
    else null end;
end;
$$;
revoke all on function public._friends_msg(text, text, jsonb) from public, anon, authenticated;

create or replace function public._friends_notify_msg(p_user uuid, p_event text, p_params jsonb, p_action_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channels jsonb;
  v_lang text;
  v_set friend_settings%rowtype;
  v_body text;
begin
  select * into v_set from friend_settings where user_id = p_user;
  if found then
    if p_event = 'friend_request' and not v_set.notify_requests then return; end if;
    if p_event = 'friend_request_accepted' and not v_set.notify_accepts then return; end if;
    if p_event = 'friend_overtake' and not v_set.notify_overtakes then return; end if;
    if p_event in ('friend_congrats', 'friend_thanks') and not v_set.notify_congrats then return; end if;
    if p_event = 'friend_nudge' and not v_set.accept_nudges then return; end if;
    if p_event in ('duo_mission_started', 'duo_mission_done', 'duo_week_paired') and not v_set.notify_missions then return; end if;
  end if;
  select channels -> 'amigos' into v_channels from notification_preferences where user_id = p_user;
  if v_channels is not null and jsonb_typeof(v_channels) = 'array' and not (v_channels ? 'in_app') then
    return;
  end if;
  v_body := _friends_msg(p_event, _ui_lang(p_user), coalesce(p_params, '{}'::jsonb));
  if v_body is null then return; end if;
  foreach v_lang in array array['frances', 'mandarim'] loop
    insert into notifications (user_id, language_app_key, category, event_type, title, body, action_tab)
    values (p_user, v_lang, 'amigos', p_event, null, v_body, p_action_tab);
  end loop;
  perform _friends_push(p_user, v_body, p_action_tab);
end;
$$;
revoke all on function public._friends_notify_msg(uuid, text, jsonb, text) from public, anon, authenticated;

-- Dias de estudo da conta na semana da missão (a partir do dia em que ela começou).
create or replace function public._duo_days(p_user uuid, p_week date, p_from date)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from study_days s
  where s.user_id = p_user and s.day >= greatest(p_week, coalesce(p_from, p_week)) and s.day <= p_week + 6;
$$;
revoke all on function public._duo_days(uuid, date, date) from public, anon, authenticated;

-- Cumprida (uma vez só): XP somado (102) ou 4 dias de cada um (109).
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
  if m.kind = 'days' then
    if _duo_days(m.user_a, m.week_start, m.start_day) < m.goal_days or _duo_days(m.user_b, m.week_start, m.start_day) < m.goal_days then
      return;
    end if;
    update duo_missions set completed_at = now() where id = m.id;
    perform _friends_notify_msg(m.user_a, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_b), 'days', m.goal_days), 'friends');
    perform _friends_notify_msg(m.user_b, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_a), 'days', m.goal_days), 'friends');
    return;
  end if;
  v_total := greatest(_week_xp(m.user_a, m.week_start) - m.base_a, 0) + greatest(_week_xp(m.user_b, m.week_start) - m.base_b, 0);
  if v_total < m.goal_xp then return; end if;
  update duo_missions set completed_at = now() where id = m.id;
  perform _friends_notify_msg(m.user_a, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_b), 'goal', m.goal_xp), 'friends');
  perform _friends_notify_msg(m.user_b, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_a), 'goal', m.goal_xp), 'friends');
end;
$$;
revoke all on function public._duo_check(bigint) from public, anon, authenticated;

-- Gatilho em weekly_xp: XP subiu = dia de estudo (study_days) e confere a missão. Nunca bloqueia o XP.
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
    -- Só XP da semana atual: sincronizar uma semana antiga não é estudar hoje.
    if new.week_start = date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date
       and ((tg_op = 'INSERT' and new.amount > 0) or (tg_op = 'UPDATE' and new.amount > coalesce(old.amount, 0))) then
      insert into study_days (user_id, day) values (new.user_id, (now() at time zone 'America/Sao_Paulo')::date)
      on conflict do nothing;
    end if;
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

-- Sorteio da semana: duplas entre amigos aceitos que estudaram na semana anterior, participam (join_duo_missions) e
-- ainda não estão em missão. Prioridade: par que nunca fez dupla, depois o que fez há mais tempo; empate no acaso.
-- Uma vez por semana (duo_pairing_runs); trava para duas chamadas ao mesmo tempo não sortearem duas vezes.
create or replace function public.duo_pair_week(p_week date default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := coalesce(p_week, date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date);
  v_pairs int := 0;
  v_id bigint;
  e record;
begin
  perform pg_advisory_xact_lock(hashtextextended('duo_pair:' || v_week::text, 0));
  if exists (select 1 from duo_pairing_runs r where r.week_start = v_week) then return -1; end if;
  for e in
    with elig as (
      select w.user_id as uid from weekly_xp w
      where w.week_start = v_week - 7
      group by w.user_id having sum(w.amount) > 0
    ),
    ok as (
      select el.uid from elig el
      where not exists (select 1 from friend_settings s where s.user_id = el.uid and s.join_duo_missions = false)
    ),
    edges as (
      select f.requester_id as a, f.addressee_id as b,
        (select max(d.week_start) from duo_missions d
          where (d.user_a = f.requester_id and d.user_b = f.addressee_id) or (d.user_a = f.addressee_id and d.user_b = f.requester_id)) as last_week
      from friendships f
      join ok oa on oa.uid = f.requester_id
      join ok ob on ob.uid = f.addressee_id
      where f.status = 'accepted'
    )
    select * from edges order by last_week nulls first, random()
  loop
    if exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id in (e.a, e.b)) then
      continue;
    end if;
    insert into duo_missions (week_start, user_a, user_b, goal_xp, kind, goal_days, start_day, auto)
    values (v_week, e.a, e.b, 150, 'days', 4, v_week, true)
    returning id into v_id;
    insert into duo_mission_members (week_start, user_id, mission_id) values (v_week, e.a, v_id), (v_week, e.b, v_id);
    perform _friends_notify_msg(e.a, 'duo_week_paired', jsonb_build_object('name', _friend_display_name(e.b), 'days', 4), 'friends');
    perform _friends_notify_msg(e.b, 'duo_week_paired', jsonb_build_object('name', _friend_display_name(e.a), 'days', 4), 'friends');
    v_pairs := v_pairs + 1;
  end loop;
  insert into duo_pairing_runs (week_start, pairs) values (v_week, v_pairs);
  return v_pairs;
end;
$$;
revoke all on function public.duo_pair_week(date) from public, anon, authenticated;

-- Sorteio sob demanda (se o cron ainda não rodou): só a partir de segunda às 8h, para não mandar aviso de madrugada.
create or replace function public._duo_maybe_pair()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_week date := date_trunc('week', v_now)::date;
begin
  if v_now::date = v_week and extract(hour from v_now) < 8 then return; end if;
  if exists (select 1 from duo_pairing_runs r where r.week_start = v_week) then return; end if;
  perform duo_pair_week(v_week);
exception when others then
  null;
end;
$$;
revoke all on function public._duo_maybe_pair() from public, anon, authenticated;

-- "Chamar para missão": missão de dias com um amigo, começando hoje. Meta = 4 dias ou os que faltam até domingo.
create or replace function public.start_duo_mission(p_friend uuid, p_goal int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  v_days int;
  v_id bigint;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_friend is null or p_friend = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if not _are_friends(v_me, p_friend) then return jsonb_build_object('error', 'not_friends'); end if;
  if exists (select 1 from friend_settings s where s.user_id = p_friend and s.join_duo_missions = false) then
    return jsonb_build_object('error', 'friend_in_mission'); -- mesma resposta de "já está em missão": não expõe a escolha da pessoa
  end if;
  if exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = v_me) then
    return jsonb_build_object('error', 'already_in_mission');
  end if;
  if exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = p_friend) then
    return jsonb_build_object('error', 'friend_in_mission');
  end if;
  v_days := least(4, (v_week + 6) - v_today + 1);
  insert into duo_missions (week_start, user_a, user_b, goal_xp, kind, goal_days, start_day, auto)
  values (v_week, v_me, p_friend, 150, 'days', v_days, v_today, false)
  returning id into v_id;
  begin
    insert into duo_mission_members (week_start, user_id, mission_id) values (v_week, v_me, v_id), (v_week, p_friend, v_id);
  exception when unique_violation then
    delete from duo_missions where id = v_id;
    return jsonb_build_object('error', 'friend_in_mission');
  end;
  perform _friends_notify_msg(p_friend, 'duo_mission_started', jsonb_build_object('name', _friend_display_name(v_me), 'days', v_days), 'friends');
  perform _duo_check(v_id);
  return jsonb_build_object('ok', true, 'id', v_id, 'goal_days', v_days);
end;
$$;
revoke all on function public.start_duo_mission(uuid, int) from public, anon;
grant execute on function public.start_duo_mission(uuid, int) to authenticated;

-- A missão desta semana (ou null). Faz o sorteio se ainda não houve; confere cumprida; desfaz se a amizade acabou.
-- Missão de dias: my_days/partner_days = datas estudadas na semana (para a grade da aba Amigos).
create or replace function public.my_duo_mission()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo')::date)::date;
  m duo_missions%rowtype;
  v_partner uuid;
  v_mine int;
  v_theirs int;
  p profiles%rowtype;
  v_from date;
begin
  if v_me is null then return null; end if;
  perform _duo_maybe_pair();
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
  select * into p from profiles where user_id = v_partner;
  if m.kind = 'days' then
    v_from := greatest(v_week, coalesce(m.start_day, v_week));
    return jsonb_build_object(
      'id', m.id, 'kind', 'days', 'week_start', m.week_start, 'start_day', v_from, 'goal_days', m.goal_days, 'auto', m.auto,
      'today', (now() at time zone 'America/Sao_Paulo')::date, 'completed_at', m.completed_at,
      'my_days', (select coalesce(jsonb_agg(s.day order by s.day), '[]'::jsonb) from study_days s
                  where s.user_id = v_me and s.day >= v_from and s.day <= v_week + 6),
      'partner_days', (select coalesce(jsonb_agg(s.day order by s.day), '[]'::jsonb) from study_days s
                  where s.user_id = v_partner and s.day >= v_from and s.day <= v_week + 6),
      'partner', jsonb_build_object('user_id', v_partner, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url));
  end if;
  v_mine := greatest(_week_xp(v_me, v_week) - case when m.user_a = v_me then m.base_a else m.base_b end, 0);
  v_theirs := greatest(_week_xp(v_partner, v_week) - case when m.user_a = v_me then m.base_b else m.base_a end, 0);
  return jsonb_build_object(
    'id', m.id, 'kind', 'xp', 'week_start', m.week_start, 'goal_xp', m.goal_xp, 'started_by_me', m.user_a = v_me,
    'my_xp', v_mine, 'partner_xp', v_theirs, 'completed_at', m.completed_at,
    'partner', jsonb_build_object('user_id', v_partner, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url));
end;
$$;
revoke all on function public.my_duo_mission() from public, anon;
grant execute on function public.my_duo_mission() to authenticated;

-- O que a tela de Amigos precisa por amigo (friends_duo da 102 + can_invite: dá para chamar para missão agora).
-- can_invite = falso quando o amigo já está em missão ou não participa (sem dizer qual dos dois).
create or replace function public.friends_duo_state()
returns table(user_id uuid, joint_streak int, studied_today boolean, can_nudge boolean, nudged_today boolean,
              in_mission boolean, can_invite boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
begin
  if v_me is null then return; end if;
  return query
  select d.user_id, d.joint_streak, d.studied_today, d.can_nudge, d.nudged_today, d.in_mission,
    (not d.in_mission
     and not exists (select 1 from friend_settings s where s.user_id = d.user_id and s.join_duo_missions = false)
     and not exists (select 1 from duo_mission_members mm where mm.week_start = v_week and mm.user_id = v_me))
  from public.friends_duo() d;
end;
$$;
revoke all on function public.friends_duo_state() from public, anon;
grant execute on function public.friends_duo_state() to authenticated;

-- Agendamento: segunda às 8h de Brasília (11h UTC). Só onde existe pg_cron (local não tem).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if not exists (select 1 from cron.job where jobname = 'duo-pair-weekly') then
      perform cron.schedule('duo-pair-weekly', '0 11 * * 1', 'select public.duo_pair_week()');
    end if;
  end if;
end $$;
