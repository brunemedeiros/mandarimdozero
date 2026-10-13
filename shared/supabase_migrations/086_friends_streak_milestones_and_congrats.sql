-- 086 -- Amigos: foguinho/bandeiras, marcos de sequência e "Parabenizar" com "Obrigado".
--
-- Cara de jogo, passo 5a (docs/historico/15-cara-de-jogo.md). Decisões da autora (2026-10-13):
--   * marcos de sequência: 5, 10, 15, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 365 dias;
--   * parabéns por reação fixa (🎉 👏 💪 ❤️), 1 por pessoa por marco, e quem recebe pode dizer "Obrigado";
--   * por enquanto só marcos de sequência recebem parabéns; conquistas (badges) entram quando o critério
--     for definido (a tabela já aceita target_kind = 'badge', mas a função recusa até lá).
--   * tudo grátis.
-- Privacidade: amigos aceitos veem a sequência e os marcos mesmo de quem tem perfil privado. Mesma regra
-- do perfil privado (080_private_profile, _profile_full_access: dono, admin, amigos aceitos e professora/aluno
-- veem o perfil completo). Quem não é amigo não chega a nenhuma destas funções.
-- Número 086: 078 a 085 já foram usados por outras conversas no Staging.
--
-- Só create / create or replace / alter ... add column if not exists / revoke / grant. Nenhuma linha
-- existente é alterada; nenhuma função existente muda de assinatura (sem DROP).
-- ROLLBACK (manual): tabelas streak_milestones e friend_congrats, coluna friend_settings.notify_congrats,
-- funções novas abaixo, e _friends_notify de volta à versão da 074.

-- ---------- preferências: aviso de parabéns/obrigado ----------
alter table public.friend_settings add column if not exists notify_congrats boolean not null default true;

-- ---------- sequência efetiva de uma conta ----------
-- Mesma leitura de get_public_profile_stats (075, sequência da conta): usa data._account, a menos que um
-- idioma tenha lastStudyDay mais novo. "Efetiva" = zera se o último dia de estudo foi antes de ontem
-- (horário de Brasília; o site grava a data local do aparelho).
create or replace function public._account_streak(p_user uuid)
returns table(streak int, last_day date, studied_today boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_s int;
  v_d text;
  l record;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select data into v from progress where user_id = p_user;
  v := coalesce(v, '{}'::jsonb);
  if jsonb_typeof(v #> '{_account,streak}') = 'number' and jsonb_typeof(v #> '{_account,lastStudyDay}') = 'string' then
    v_s := (v #>> '{_account,streak}')::int;
    v_d := v #>> '{_account,lastStudyDay}';
  end if;
  for l in select key, value from jsonb_each(v) where key <> '_account' and jsonb_typeof(value) = 'object' loop
    if jsonb_typeof(l.value -> 'streak') = 'number' and jsonb_typeof(l.value -> 'lastStudyDay') = 'string'
       and (l.value ->> 'lastStudyDay') ~ '^\d{4}-\d{2}-\d{2}$'
       and (v_d is null or (l.value ->> 'lastStudyDay') > v_d) then
      v_s := (l.value ->> 'streak')::int;
      v_d := l.value ->> 'lastStudyDay';
    end if;
  end loop;
  if v_d is null or v_d !~ '^\d{4}-\d{2}-\d{2}$' then
    return query select 0, null::date, false;
    return;
  end if;
  last_day := v_d::date;
  streak := case when last_day >= v_today - 1 then greatest(coalesce(v_s, 0), 0) else 0 end;
  studied_today := last_day >= v_today;
  return next;
end;
$$;
revoke all on function public._account_streak(uuid) from public, anon, authenticated;

-- ---------- foguinho e bandeiras de você + amigos ----------
create or replace function public.friends_extras()
returns table(user_id uuid, streak int, studied_today boolean, languages text[])
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
  with people as (
    select v_me as uid
    union
    select case when f.requester_id = v_me then f.addressee_id else f.requester_id end
    from friendships f
    where f.status = 'accepted' and (f.requester_id = v_me or f.addressee_id = v_me)
  )
  select p.uid,
    s.streak,
    s.studied_today,
    coalesce((
      select array_agg(distinct split_part(k.key, '@', 1) order by split_part(k.key, '@', 1))
      from progress g, jsonb_each(coalesce(g.data, '{}'::jsonb)) k
      where g.user_id = p.uid and k.key <> '_account' and jsonb_typeof(k.value) = 'object'
        and split_part(k.key, '@', 1) in ('frances', 'mandarim', 'portugues')
        and (coalesce((k.value ->> 'xp') ~ '^\d+(\.\d+)?$' and (k.value ->> 'xp')::numeric > 0, false)
             or coalesce((k.value -> 'progressSummary' ->> 'pct') ~ '^\d+(\.\d+)?$' and (k.value -> 'progressSummary' ->> 'pct')::numeric > 0, false))
    ), array[]::text[])
  from people p
  cross join lateral public._account_streak(p.uid) s;
end;
$$;
revoke all on function public.friends_extras() from public, anon;
grant execute on function public.friends_extras() to authenticated;

-- ---------- marcos de sequência ----------
-- Uma linha por marco por "sequência": se a pessoa perde a sequência e volta a chegar a 5 dias, é um marco
-- novo (run_start diferente). Ninguém lê nem escreve direto: só pelas funções abaixo.
create table if not exists public.streak_milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  days int not null check (days in (5, 10, 15, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 365)),
  run_start date not null,
  reached_at timestamptz not null default now(),
  primary key (user_id, days, run_start)
);
alter table public.streak_milestones enable row level security;
revoke all on public.streak_milestones from anon, authenticated;
create index if not exists streak_milestones_reached_idx on public.streak_milestones (reached_at desc);

-- Chamada pelo site logo depois de a sequência mudar (registerStudyToday). Registra só o MAIOR marco
-- alcançado ainda não registrado nesta sequência, para quem já tinha 40 dias não gerar 5 marcos de uma vez.
-- O valor vem do aparelho (como todo o progresso): só aceita datas de ontem a amanhã e no máximo 3650 dias.
create or replace function public.record_streak_milestone(p_streak int, p_last_day date)
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
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_streak is null or p_streak < 5 or p_streak > 3650 or p_last_day is null
     or p_last_day < v_today - 1 or p_last_day > v_today + 1 then
    return jsonb_build_object('ok', true, 'recorded', null);
  end if;
  v_run := p_last_day - (p_streak - 1);
  select max(m) into v_days
  from unnest(array[5, 10, 15, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 365]) m
  where m <= p_streak;
  if exists (select 1 from streak_milestones s where s.user_id = v_me and s.run_start = v_run and s.days >= v_days) then
    return jsonb_build_object('ok', true, 'recorded', null);
  end if;
  insert into streak_milestones (user_id, days, run_start) values (v_me, v_days, v_run)
  on conflict do nothing;
  return jsonb_build_object('ok', true, 'recorded', v_days);
end;
$$;
revoke all on function public.record_streak_milestone(int, date) from public, anon;
grant execute on function public.record_streak_milestone(int, date) to authenticated;

-- ---------- parabéns ----------
create table if not exists public.friend_congrats (
  id bigint generated always as identity primary key,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('streak', 'badge')),
  target_ref text not null check (length(target_ref) between 1 and 80),
  reaction text not null check (reaction in ('🎉', '👏', '💪', '❤️')),
  created_at timestamptz not null default now(),
  thanked_at timestamptz,
  unique (from_user, to_user, target_kind, target_ref),
  check (from_user <> to_user)
);
alter table public.friend_congrats enable row level security;
revoke all on public.friend_congrats from anon, authenticated;
create index if not exists friend_congrats_to_idx on public.friend_congrats (to_user, created_at desc);
create index if not exists friend_congrats_from_idx on public.friend_congrats (from_user, created_at desc);

-- Avisos: mesma _friends_notify da 074, com o interruptor novo (parabéns e obrigado).
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

-- Texto do que foi parabenizado, para o aviso ("seus 25 dias seguidos").
create or replace function public._congrats_target_label(p_kind text, p_ref text)
returns text
language sql
immutable
set search_path = public
as $$
  select case when p_kind = 'streak' then 'seus ' || split_part(p_ref, '@', 1) || ' dias seguidos'
              else 'sua conquista' end;
$$;
revoke all on function public._congrats_target_label(text, text) from public, anon, authenticated;

-- Dar parabéns. Regras: só para amigo aceito; o marco tem de existir e ser dos últimos 7 dias; 1 reação por
-- pessoa por marco (tocar de novo troca a reação, sem novo aviso); no máximo 20 parabéns novos por dia.
-- Aviso agrupado: se a pessoa ainda não leu o aviso de parabéns de hoje, ele é reescrito ("Bia e mais 2
-- amigos parabenizaram você 🎉") em vez de criar outro.
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
    return jsonb_build_object('error', 'kind_not_enabled'); -- conquistas entram quando o critério for definido
  end if;
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

-- "Obrigado": só quem recebeu, uma vez por parabéns. Avisa quem mandou.
create or replace function public.thank_friend_congrats(p_congrats_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row friend_congrats%rowtype;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  select * into v_row from friend_congrats where id = p_congrats_id and to_user = v_me;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if v_row.thanked_at is not null then return jsonb_build_object('ok', true, 'status', 'already'); end if;
  update friend_congrats set thanked_at = now() where id = v_row.id;
  perform _friends_notify(v_row.from_user, 'friend_thanks', null,
    _friend_display_name(v_me) || ' agradeceu seu parabéns 💛', 'friends');
  return jsonb_build_object('ok', true, 'status', 'thanked');
end;
$$;
revoke all on function public.thank_friend_congrats(bigint) from public, anon;
grant execute on function public.thank_friend_congrats(bigint) to authenticated;

-- Marcos dos amigos (últimos 7 dias), com a minha reação e se a pessoa agradeceu.
create or replace function public.friends_streak_feed(p_limit int default 20)
returns table(user_id uuid, username text, display_name text, avatar_url text, days int, ref text,
              reached_at timestamptz, my_reaction text, my_congrats_thanked boolean, total_reactions int)
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
  select s.user_id, p.username, p.display_name, p.avatar_url, s.days,
    s.days || '@' || to_char(s.run_start, 'YYYY-MM-DD'),
    s.reached_at,
    mine.reaction, mine.thanked_at is not null,
    (select count(*)::int from friend_congrats c where c.to_user = s.user_id and c.target_kind = 'streak'
       and c.target_ref = s.days || '@' || to_char(s.run_start, 'YYYY-MM-DD'))
  from streak_milestones s
  join friendships f on f.status = 'accepted'
    and ((f.requester_id = v_me and f.addressee_id = s.user_id) or (f.addressee_id = v_me and f.requester_id = s.user_id))
  left join profiles p on p.user_id = s.user_id
  left join friend_congrats mine on mine.from_user = v_me and mine.to_user = s.user_id and mine.target_kind = 'streak'
    and mine.target_ref = s.days || '@' || to_char(s.run_start, 'YYYY-MM-DD')
  where s.reached_at > now() - interval '7 days'
  order by s.reached_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;
revoke all on function public.friends_streak_feed(int) from public, anon;
grant execute on function public.friends_streak_feed(int) to authenticated;

-- Parabéns que eu recebi (últimos 7 dias), para o botão "Obrigado".
create or replace function public.my_received_congrats(p_limit int default 20)
returns table(id bigint, from_user uuid, username text, display_name text, avatar_url text,
              target_kind text, target_ref text, reaction text, created_at timestamptz, thanked boolean)
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
  select c.id, c.from_user, p.username, p.display_name, p.avatar_url, c.target_kind, c.target_ref, c.reaction,
    c.created_at, c.thanked_at is not null
  from friend_congrats c
  left join profiles p on p.user_id = c.from_user
  where c.to_user = v_me and c.created_at > now() - interval '7 days'
  order by c.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;
revoke all on function public.my_received_congrats(int) from public, anon;
grant execute on function public.my_received_congrats(int) to authenticated;
