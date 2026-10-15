-- 102 -- Amigos em dupla: sequência com amigo, cutucar e missão em dupla da semana (2026-10-15).
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
-- 4. (pedido da autora, 2026-10-15) Avisos de Amigos no idioma do site de quem recebe (site em inglês não tem
--    nada em português), inclusive os antigos; e push na hora para quem ainda não abriu o site (fila push_outbox +
--    Edge Function push-dispatch chamada pelo banco via pg_net). Ver a seção "idioma de quem recebe + push".
--
-- Sem DROP. Nenhuma linha existente muda; _friends_notify ganha os interruptores novos (mesma assinatura) e passa
-- texto pronto em português pelo idioma de quem recebe; as funções antigas que avisam (send_friend_request,
-- process_friend_overtakes, congratulate_friend, thank_friend_congrats) são recriadas iguais às da produção, trocando
-- só a linha do aviso. respond_friend_request fica como está (o aceite passa pela _friends_notify).
-- O gatilho em weekly_xp nunca impede o XP de ser salvo (erro dentro dele é engolido).
-- Depois de aplicar: segredos push_dispatch_url e push_dispatch_anon no Vault + deploy de push-dispatch
--   (docs/historico/18-amigos-em-dupla.md). Sem eles o sino funciona e a fila de push só acumula.
-- ROLLBACK (manual): drop trigger weekly_xp_duo_check on weekly_xp; drop das funções novas abaixo; drop table
--   duo_mission_members, duo_missions, friend_nudges, push_outbox; alter table friend_settings drop column
--   accept_nudges, drop column notify_missions; _friends_notify de volta à versão da 086; as 4 funções antigas de
--   volta às versões da 073/074/086/091.

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
  v_suffix text;
begin
  -- Quem ainda chama com o texto pronto em português (respond_friend_request, da 073: não é recriada aqui porque tem
  -- um DELETE e a ferramenta de migration trava esperando confirmação) passa pelo texto no idioma de quem recebe.
  v_suffix := case p_event when 'friend_request_accepted' then ' aceitou seu pedido de amizade 🎉'
                           when 'friend_request' then ' enviou um pedido de amizade 👋'
                           when 'friend_overtake' then ' passou você no ranking da semana 🏃'
                           when 'friend_thanks' then ' agradeceu seu parabéns 💛' end;
  if v_suffix is not null and right(coalesce(p_body, ''), length(v_suffix)) = v_suffix then
    perform _friends_notify_msg(p_user, p_event, jsonb_build_object('name', left(p_body, length(p_body) - length(v_suffix))), p_action_tab);
    return;
  end if;
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

-- ---------- idioma de quem recebe + push na hora (pedido da autora, 2026-10-15) ----------
-- 1. Site em inglês não pode ter nada em português: todo aviso de Amigos (inclusive os antigos: pedido, aceite,
--    "te passou", parabéns, obrigado) é escrito no idioma do site de QUEM RECEBE (progress.data._meta.uiLanguage),
--    num lugar só (_friends_msg).
-- 2. O aviso tem de chegar a quem ainda não abriu o site: além do sino, vai para a fila push_outbox e o banco chama
--    na hora a Edge Function push-dispatch (pg_net), que manda o push para os aparelhos da pessoa.
--    Push de Amigos vale para quem ativou notificações no aparelho (push_subscriptions) e não desligou a coluna
--    "Push" de Amigos em Configurações > Notificações; respeita o horário silencioso (hora de Brasília).
--    Sem os segredos push_dispatch_url/push_dispatch_anon no Vault, a fila só acumula (nada quebra).

create or replace function public._ui_lang(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case when (select g.data #>> '{_meta,uiLanguage}' from progress g where g.user_id = p_user) = 'en' then 'en' else 'pt-BR' end;
$$;
revoke all on function public._ui_lang(uuid) from public, anon, authenticated;

-- Texto de cada aviso de Amigos. p: name, others, days, kind ('streak' | 'badge'), reaction, joint, goal.
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
    when 'duo_mission_started' then case when en
      then n || ' invited you to a duo mission: ' || (p ->> 'goal') || ' XP together by Sunday 🤝'
      else n || ' chamou você para uma missão em dupla: ' || (p ->> 'goal') || ' XP juntos até domingo 🤝' end
    when 'duo_mission_done' then case when en
      then 'Duo mission complete! You and ' || n || ' earned ' || (p ->> 'goal') || ' XP 🎉'
      else 'Missão em dupla cumprida! Você e ' || n || ' juntaram ' || (p ->> 'goal') || ' XP 🎉' end
    else null end;
end;
$$;
revoke all on function public._friends_msg(text, text, jsonb) from public, anon, authenticated;

create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  action_tab text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;
create index if not exists push_outbox_pending_idx on public.push_outbox (id) where sent_at is null;

-- plpgsql (e não sql) de propósito: o corpo só é conferido ao rodar, então a migration aplica mesmo onde não há Vault.
create or replace function public._push_secret(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = public, vault
as $$
begin
  return (select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1);
exception when others then
  return null;
end;
$$;
revoke all on function public._push_secret(text) from public, anon, authenticated;

-- Chama a Edge Function push-dispatch (assíncrono: o pg_net manda depois do commit). Nunca derruba quem chamou.
create or replace function public._push_kick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_anon text;
begin
  begin
    v_url := _push_secret('push_dispatch_url');
    v_anon := _push_secret('push_dispatch_anon');
    if coalesce(v_url, '') = '' or coalesce(v_anon, '') = '' then return; end if;
    perform net.http_post(url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon),
      body := '{}'::jsonb, timeout_milliseconds := 15000);
  exception when others then
    null;
  end;
end;
$$;
revoke all on function public._push_kick() from public, anon, authenticated;

-- Põe o push na fila se a pessoa pode receber: tem aparelho inscrito, não desligou push de Amigos e não está no
-- horário silencioso (hora de Brasília).
create or replace function public._friends_push(p_user uuid, p_body text, p_action_tab text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefs notification_preferences%rowtype;
  v_ch jsonb;
  v_hour int := extract(hour from (now() at time zone 'America/Sao_Paulo'))::int;
  v_quiet boolean;
begin
  if p_user is null or coalesce(p_body, '') = '' then return; end if;
  if not exists (select 1 from push_subscriptions s where s.user_id = p_user) then return; end if;
  select * into v_prefs from notification_preferences where user_id = p_user;
  if found then
    v_ch := v_prefs.channels -> 'amigos';
    if v_ch is not null and jsonb_typeof(v_ch) = 'array' and not (v_ch ? 'push') then return; end if;
    v_quiet := v_prefs.quiet_hours_start is not null and v_prefs.quiet_hours_end is not null
       and v_prefs.quiet_hours_start <> v_prefs.quiet_hours_end
       and ((v_prefs.quiet_hours_start < v_prefs.quiet_hours_end and v_hour >= v_prefs.quiet_hours_start and v_hour < v_prefs.quiet_hours_end)
         or (v_prefs.quiet_hours_start > v_prefs.quiet_hours_end and (v_hour >= v_prefs.quiet_hours_start or v_hour < v_prefs.quiet_hours_end)));
    if v_quiet then return; end if;
  end if;
  insert into push_outbox (user_id, title, body, action_tab)
  values (p_user, _friends_msg('_title', _ui_lang(p_user), '{}'::jsonb), p_body, p_action_tab);
  perform _push_kick();
end;
$$;
revoke all on function public._friends_push(uuid, text, text) from public, anon, authenticated;

-- Aviso de Amigos no idioma de quem recebe: sino (nos sites) + push na hora. Mesmos interruptores de _friends_notify.
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
    if p_event in ('duo_mission_started', 'duo_mission_done') and not v_set.notify_missions then return; end if;
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

-- Usada só pela Edge Function push-dispatch (service role): pega os pushes pendentes e marca como enviados de uma
-- vez (skip locked: duas chamadas ao mesmo tempo nunca mandam o mesmo push duas vezes).
create or replace function public.push_outbox_claim(p_limit int default 50)
returns setof public.push_outbox
language sql
security definer
set search_path = public
as $$
  update push_outbox o set sent_at = now()
  where o.id in (
    select x.id from push_outbox x
    where x.sent_at is null and x.created_at > now() - interval '1 day'
    order by x.id
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update skip locked)
  returning o.*;
$$;
revoke all on function public.push_outbox_claim(int) from public, anon, authenticated;
grant execute on function public.push_outbox_claim(int) to service_role;

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
  v_body := _friends_msg('friend_nudge', _ui_lang(p_friend), jsonb_build_object('name', v_name, 'others', v_others, 'joint', v_joint));
  if v_others > 0 and exists (
    select 1 from notifications n where n.user_id = p_friend and n.event_type = 'friend_nudge'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
  ) then
    update notifications n set body = v_body, created_at = now()
    where n.user_id = p_friend and n.event_type = 'friend_nudge'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today;
    perform _friends_push(p_friend, v_body, 'friends');
  else
    perform _friends_notify_msg(p_friend, 'friend_nudge', jsonb_build_object('name', v_name, 'others', 0, 'joint', v_joint), 'friends');
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
  perform _friends_notify_msg(m.user_a, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_b), 'goal', m.goal_xp), 'friends');
  perform _friends_notify_msg(m.user_b, 'duo_mission_done', jsonb_build_object('name', _friend_display_name(m.user_a), 'goal', m.goal_xp), 'friends');
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
  perform _friends_notify_msg(p_friend, 'duo_mission_started', jsonb_build_object('name', _friend_display_name(v_me), 'goal', p_goal), 'friends');
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

-- ---------- avisos antigos de Amigos no idioma de quem recebe (073/074/086/091) ----------
-- Mesmas funções que estavam na produção em 2026-10-15 (lidas de lá), trocando SÓ a linha do aviso:
-- _friends_notify(texto em português) -> _friends_notify_msg(evento, parâmetros). Nenhuma regra muda.

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
  v_existing boolean;
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
  v_existing := found;

  if v_existing then
    if v_row.status = 'accepted' then return jsonb_build_object('error', 'already_friends'); end if;
    if v_row.status = 'pending' and v_row.requester_id = v_me then return jsonb_build_object('error', 'already_sent'); end if;
    if v_row.status = 'pending' then
      if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
      if public._friend_count(p_addressee) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
      update friendships set status = 'accepted', responded_at = now() where id = v_row.id;
      v_name := public._friend_display_name(v_me);
      perform public._friends_notify_msg(p_addressee, 'friend_request_accepted', jsonb_build_object('name', v_name), 'friends');
      return jsonb_build_object('ok', true, 'status', 'accepted');
    end if;
    if v_row.requester_id = v_me and v_row.responded_at > now() - interval '7 days' then
      return jsonb_build_object('error', 'declined_recently');
    end if;
  end if;

  if exists (select 1 from friend_settings where user_id = p_addressee and accept_requests = false) then
    return jsonb_build_object('error', 'not_accepting_requests');
  end if;
  if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
  if public._friend_count(p_addressee) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
  perform pg_advisory_xact_lock(hashtextextended('friendreq:' || v_me::text, 0));
  if (select count(*) from friend_request_log
      where requester_id = v_me and sent_at > now() - interval '24 hours') >= 20 then
    return jsonb_build_object('error', 'daily_request_limit');
  end if;
  insert into friend_request_log (requester_id, addressee_id) values (v_me, p_addressee);

  if v_existing then
    update friendships
      set requester_id = v_me, addressee_id = p_addressee, status = 'pending',
          requested_at = now(), responded_at = null
      where id = v_row.id;
  else
    insert into friendships (requester_id, addressee_id) values (v_me, p_addressee);
  end if;

  v_name := public._friend_display_name(v_me);
  perform public._friends_notify_msg(p_addressee, 'friend_request', jsonb_build_object('name', v_name), 'friends');
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;

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
    perform public._friends_notify_msg(r.u, 'friend_overtake', jsonb_build_object('name', public._friend_display_name(r.f)), 'leaderboard');
    v_notified := v_notified + 1;
  end loop;

  insert into friend_rank_state (user_id, friend_id, week_start, friend_ahead, updated_at)
  select c.u, c.f, v_week, c.ahead, now() from public._friend_pairs_xp(v_week) c
  on conflict (user_id, friend_id, week_start)
  do update set friend_ahead = excluded.friend_ahead, updated_at = now();

  return jsonb_build_object('week', v_week, 'pairs', v_pairs, 'notified', v_notified);
end;
$$;

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
  perform _friends_notify_msg(v_row.from_user, 'friend_thanks', jsonb_build_object('name', _friend_display_name(v_me)), 'friends');
  return jsonb_build_object('ok', true, 'status', 'thanked');
end;
$$;

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
    -- 091: conquista com níveis. p_ref = id do nível ('review.3'); o amigo tem de ter ganhado nos últimos 7 dias.
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
  v_body := _friends_msg('friend_congrats', _ui_lang(p_friend), jsonb_build_object('name', v_name, 'others', v_others,
    'kind', p_kind, 'days', split_part(p_ref, '@', 1), 'reaction', p_reaction));

  if v_others > 0 and exists (
    select 1 from notifications n where n.user_id = p_friend and n.event_type = 'friend_congrats'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today
  ) then
    update notifications n set body = v_body, created_at = now()
    where n.user_id = p_friend and n.event_type = 'friend_congrats'
      and n.read_at is null and (n.created_at at time zone 'America/Sao_Paulo')::date = v_today;
    perform _friends_push(p_friend, v_body, 'friends');
  else
    perform _friends_notify_msg(p_friend, 'friend_congrats', jsonb_build_object('name', v_name, 'others', 0,
      'kind', p_kind, 'days', split_part(p_ref, '@', 1), 'reaction', p_reaction), 'friends');
  end if;
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;
revoke all on function public.congratulate_friend(uuid, text, text, text) from public, anon;
grant execute on function public.congratulate_friend(uuid, text, text, text) to authenticated;
