-- 073 -- Amigos + Ranking de Amigos.
--
-- Decisões da autora: amizade com PEDIDO e ACEITE (não é "seguir"); busca por
-- @username OU nome; perfil privado também pode ser amigo; tudo grátis; limites
-- de 20 pedidos por dia e 100 amigos (checados aqui, no servidor); só
-- "desfazer amizade" (sem bloquear); notificações só entre amigos (o pedido em
-- si, o aceite e "um amigo te passou no ranking", no máximo 1 por dia).
--
-- Sem comandos destrutivos (a ferramenta de deploy trava com eles): só create, create or
-- replace e revoke/grant. Nenhuma linha existente é alterada.
--
-- Escrita SEMPRE por função SECURITY DEFINER (search_path=public). A tabela
-- tem RLS só de leitura (cada um vê só as próprias amizades); INSERT/UPDATE/
-- DELETE diretos são negados (sem policy + revoke).
--
-- ROLLBACK (manual): funções friend_*/search_profiles_for_friends/
-- friends_leaderboard/process_friend_overtakes/_friends_notify, tabelas
-- friend_rank_state e friendships, linha 'amigos' de notification_rules.

-- ---------- friendships ----------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Um par de pessoas tem no máximo UMA linha, qualquer que seja a direção.
create unique index if not exists friendships_unique_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status, requested_at desc);

alter table public.friendships enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'friendships' and policyname = 'friendships_participants_read') then
    create policy friendships_participants_read
      on public.friendships for select to authenticated
      using (auth.uid() = requester_id or auth.uid() = addressee_id);
  end if;
end $$;

revoke all on public.friendships from anon;
revoke insert, update, delete on public.friendships from authenticated;

-- ---------- estado interno do "te passou no ranking" ----------
-- Guarda, por (pessoa, amigo, semana), se o amigo estava À FRENTE na última
-- varredura. Só a função process_friend_overtakes (service_role) mexe aqui.
create table if not exists public.friend_rank_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  friend_ahead boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, friend_id, week_start)
);
alter table public.friend_rank_state enable row level security;
revoke all on public.friend_rank_state from anon, authenticated;

-- ---------- regra de notificação ----------
insert into public.notification_rules (category, priority, cooldown_minutes, daily_cap, active, required_plan)
values ('amigos', 2, 0, 20, true, 'free')
on conflict (category) do nothing;

-- ---------- helper: notificação para OUTRA conta ----------
-- notifications só aceita insert do próprio dono; para avisar um amigo é
-- preciso passar por aqui. Grava uma linha por site (o sino filtra por
-- language_app_key). Respeita a preferência da pessoa (se desligou in_app
-- para a categoria 'amigos').
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
begin
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

create or replace function public._friend_display_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(btrim(display_name), ''), username) from profiles where user_id = p_user
$$;
revoke all on function public._friend_display_name(uuid) from public, anon, authenticated;

create or replace function public._friend_count(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from friendships
  where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)
$$;
revoke all on function public._friend_count(uuid) from public, anon, authenticated;

-- ---------- busca ----------
-- Por @username (com ou sem @) OU nome. Mínimo 3 letras, no máximo 20
-- resultados, sem acento/maiúscula. Só entrega o que o perfil público já
-- mostra (username, nome, foto). 'relation' diz o que já existe entre vocês.
create or replace function public.search_profiles_for_friends(p_query text)
returns table (user_id uuid, username text, display_name text, avatar_url text, relation text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_q text;
  v_pat text;
begin
  if v_me is null then return; end if;
  v_q := translate(lower(btrim(coalesce(p_query, ''))), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  v_q := regexp_replace(v_q, '^@+', '');
  if char_length(v_q) < 3 then return; end if;
  v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select p.user_id, p.username, p.display_name, p.avatar_url,
    case
      when f.id is null then 'none'
      when f.status = 'accepted' then 'friends'
      when f.status = 'pending' and f.requester_id = v_me then 'sent'
      when f.status = 'pending' then 'received'
      else 'none'
    end as relation
  from profiles p
  left join friendships f
    on least(f.requester_id, f.addressee_id) = least(v_me, p.user_id)
   and greatest(f.requester_id, f.addressee_id) = greatest(v_me, p.user_id)
  where p.user_id <> v_me
    and (
      p.username ilike v_pat escape '\'
      or translate(lower(coalesce(p.display_name, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') like v_pat escape '\'
    )
  order by (p.username = v_q) desc, p.display_name nulls last, p.username
  limit 20;
end;
$$;

-- ---------- enviar pedido ----------
create or replace function public.send_friend_request(p_addressee uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row friendships%rowtype;
  v_name text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if p_addressee is null or p_addressee = v_me then return jsonb_build_object('error', 'invalid_target'); end if;
  if not exists (select 1 from profiles where user_id = p_addressee) then
    return jsonb_build_object('error', 'not_found');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('friend:' || least(v_me, p_addressee)::text || greatest(v_me, p_addressee)::text, 0));

  select * into v_row from friendships
  where (requester_id = v_me and addressee_id = p_addressee)
     or (requester_id = p_addressee and addressee_id = v_me);

  if found then
    if v_row.status = 'accepted' then return jsonb_build_object('error', 'already_friends'); end if;
    if v_row.status = 'pending' and v_row.requester_id = v_me then return jsonb_build_object('error', 'already_sent'); end if;
    if v_row.status = 'pending' then
      -- A outra pessoa já tinha pedido: mandar o pedido de volta = aceitar.
      if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
      if public._friend_count(p_addressee) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
      update friendships set status = 'accepted', responded_at = now() where id = v_row.id;
      v_name := public._friend_display_name(v_me);
      perform public._friends_notify(p_addressee, 'friend_request_accepted', null, v_name || ' aceitou seu pedido de amizade 🎉', 'friends');
      return jsonb_build_object('ok', true, 'status', 'accepted');
    end if;
    -- declined
    if v_row.requester_id = v_me and v_row.responded_at > now() - interval '7 days' then
      return jsonb_build_object('error', 'declined_recently');
    end if;
  end if;

  if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
  if public._friend_count(p_addressee) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
  -- 20 pedidos por dia; pedido recusado não conta contra quem enviou.
  if (select count(*) from friendships
      where requester_id = v_me and status <> 'declined' and requested_at > now() - interval '24 hours') >= 20 then
    return jsonb_build_object('error', 'daily_request_limit');
  end if;

  if found then
    update friendships
      set requester_id = v_me, addressee_id = p_addressee, status = 'pending',
          requested_at = now(), responded_at = null
      where id = v_row.id;
  else
    insert into friendships (requester_id, addressee_id) values (v_me, p_addressee);
  end if;

  v_name := public._friend_display_name(v_me);
  perform public._friends_notify(p_addressee, 'friend_request', null, v_name || ' enviou um pedido de amizade 👋', 'friends');
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;

-- ---------- aceitar / recusar ----------
create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row friendships%rowtype;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  perform pg_advisory_xact_lock(hashtextextended('friend:' || least(v_me, p_requester)::text || greatest(v_me, p_requester)::text, 0));
  select * into v_row from friendships
  where requester_id = p_requester and addressee_id = v_me and status = 'pending';
  if not found then return jsonb_build_object('error', 'no_pending_request'); end if;

  if p_accept then
    if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
    if public._friend_count(p_requester) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
    update friendships set status = 'accepted', responded_at = now() where id = v_row.id;
    perform public._friends_notify(p_requester, 'friend_request_accepted', null,
      public._friend_display_name(v_me) || ' aceitou seu pedido de amizade 🎉', 'friends');
    return jsonb_build_object('ok', true, 'status', 'accepted');
  end if;

  update friendships set status = 'declined', responded_at = now() where id = v_row.id;
  return jsonb_build_object('ok', true, 'status', 'declined');
end;
$$;

-- ---------- cancelar pedido enviado / desfazer amizade ----------
create or replace function public.cancel_friend_request(p_addressee uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid(); v_n int;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  delete from friendships where requester_id = v_me and addressee_id = p_addressee and status = 'pending';
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('error', 'no_pending_request'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_friend(p_friend uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid(); v_n int;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  delete from friendships
  where status = 'accepted'
    and ((requester_id = v_me and addressee_id = p_friend) or (requester_id = p_friend and addressee_id = v_me));
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('error', 'not_friends'); end if;
  -- limpa o estado do "te passou" entre os dois
  delete from friend_rank_state
  where (user_id = v_me and friend_id = p_friend) or (user_id = p_friend and friend_id = v_me);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- ranking de amigos ----------
-- Você + seus amigos aceitos, XP da semana p_week (segunda-feira, como o
-- ranking Geral), 'all' = soma de todos os idiomas ou um language_app_key.
-- Amigos com 0 XP aparecem no fim (num grupo pequeno, é útil ver quem ainda
-- não pontuou); quem NÃO é amigo nunca aparece, nem com perfil privado ou
-- público.
create or replace function public.friends_leaderboard(p_scope text default 'all', p_week date default null)
returns table (user_id uuid, amount integer, username text, display_name text,
               avatar_url text, featured_badge_id text, is_me boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_week date := coalesce(p_week, date_trunc('week', current_date)::date);
begin
  if v_me is null then return; end if;
  return query
  with members as (
    select v_me as uid
    union
    select case when f.requester_id = v_me then f.addressee_id else f.requester_id end
    from friendships f
    where f.status = 'accepted' and (f.requester_id = v_me or f.addressee_id = v_me)
  ),
  xp as (
    select w.user_id as uid, sum(w.amount)::int as amt
    from weekly_xp w
    where w.week_start = v_week
      and w.user_id in (select uid from members)
      and (p_scope = 'all' or w.language_app_key = p_scope)
    group by w.user_id
  )
  select m.uid, coalesce(x.amt, 0), p.username, p.display_name, p.avatar_url, p.featured_badge_id, (m.uid = v_me)
  from members m
  left join xp x on x.uid = m.uid
  left join profiles p on p.user_id = m.uid
  order by coalesce(x.amt, 0) desc, p.username;
end;
$$;

-- ---------- varredura diária: "um amigo te passou no ranking" ----------
-- Pares (pessoa, amigo) aceitos, com o XP da semana de cada um (todos os
-- idiomas) e se o amigo está à frente. Helper da varredura abaixo.
create or replace function public._friend_pairs_xp(p_week date)
returns table (u uuid, f uuid, xu integer, xf integer, ahead boolean)
language sql
stable
security definer
set search_path = public
as $$
  with xp as (
    select user_id, sum(amount)::int as amt from weekly_xp where week_start = p_week group by user_id
  ),
  pairs as (
    select requester_id as u, addressee_id as f from friendships where status = 'accepted'
    union all
    select addressee_id, requester_id from friendships where status = 'accepted'
  )
  select p.u, p.f, coalesce(xu.amt, 0), coalesce(xf.amt, 0), (coalesce(xf.amt, 0) > coalesce(xu.amt, 0))
  from pairs p
  left join xp xu on xu.user_id = p.u
  left join xp xf on xf.user_id = p.f
$$;
revoke all on function public._friend_pairs_xp(date) from public, anon, authenticated;

-- Chamada pelo notification-cron (service_role). Compara, por par de amigos,
-- se o amigo estava à frente na última varredura. Quando passa a estar à
-- frente (e você já tinha XP na semana), vira candidato; cada pessoa recebe
-- no máximo 1 aviso por dia (o do amigo com mais XP). Primeira varredura de
-- um par/semana só registra o estado (ninguém "passou" ninguém ainda).
create or replace function public.process_friend_overtakes(p_week date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := coalesce(p_week, date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date);
  v_notified int := 0;
  v_pairs int := 0;
  r record;
begin
  select count(*) into v_pairs from public._friend_pairs_xp(v_week);

  for r in
    select distinct on (c.u) c.u, c.f, c.xf
    from public._friend_pairs_xp(v_week) c
    join friend_rank_state s
      on s.user_id = c.u and s.friend_id = c.f and s.week_start = v_week and s.friend_ahead = false
    where c.ahead and c.xu > 0
      and not exists (
        select 1 from notifications n
        where n.user_id = c.u and n.event_type = 'friend_overtake' and n.created_at > now() - interval '23 hours'
      )
    order by c.u, c.xf desc, c.f
  loop
    perform public._friends_notify(r.u, 'friend_overtake', null,
      public._friend_display_name(r.f) || ' passou você no ranking da semana 🏃', 'leaderboard');
    v_notified := v_notified + 1;
  end loop;

  insert into friend_rank_state (user_id, friend_id, week_start, friend_ahead, updated_at)
  select c.u, c.f, v_week, c.ahead, now() from public._friend_pairs_xp(v_week) c
  on conflict (user_id, friend_id, week_start)
  do update set friend_ahead = excluded.friend_ahead, updated_at = now();

  return jsonb_build_object('week', v_week, 'pairs', v_pairs, 'notified', v_notified);
end;
$$;

-- ---------- permissões ----------
revoke all on function public.search_profiles_for_friends(text) from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.friends_leaderboard(text, date) from public, anon;
revoke all on function public.process_friend_overtakes(date) from public, anon, authenticated;
grant execute on function public.search_profiles_for_friends(text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.friends_leaderboard(text, date) to authenticated;
grant execute on function public.process_friend_overtakes(date) to service_role;
