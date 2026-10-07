-- 074 -- Amigos: preferências, atividade dos amigos.
--
-- Pedido da autora: interruptores de notificação para pedidos, aceites e "te
-- passou" + um para não receber pedidos novos; linha do tempo com o que os
-- amigos conquistaram (só o que o perfil público já mostra: earned_badges).
-- Sem comandos destrutivos: só create, create or replace e revoke/grant.
-- Nenhuma linha existente é alterada.
--
-- ROLLBACK (manual): tabela friend_settings, função friends_activity, e voltar
-- _friends_notify/send_friend_request para as versões da 073.

create table if not exists public.friend_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_requests boolean not null default true,
  notify_accepts boolean not null default true,
  notify_overtakes boolean not null default true,
  accept_requests boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.friend_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'friend_settings' and policyname = 'friend_settings_owner_select') then
    create policy friend_settings_owner_select on public.friend_settings for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'friend_settings' and policyname = 'friend_settings_owner_insert') then
    create policy friend_settings_owner_insert on public.friend_settings for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'friend_settings' and policyname = 'friend_settings_owner_update') then
    create policy friend_settings_owner_update on public.friend_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
revoke all on public.friend_settings from anon;

-- Avisos: respeita os interruptores de friend_settings (por tipo de aviso) além
-- da preferência antiga de notification_preferences.
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
  v_existing := found; -- FOUND é sobrescrito pelos comandos seguintes

  if v_existing then
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

  -- Quem desligou "aceitar novos pedidos" não recebe pedidos novos (o aceite de
  -- um pedido que ELE já enviou, acima, continua funcionando).
  if exists (select 1 from friend_settings where user_id = p_addressee and accept_requests = false) then
    return jsonb_build_object('error', 'not_accepting_requests');
  end if;
  if public._friend_count(v_me) >= 100 then return jsonb_build_object('error', 'friend_limit_reached'); end if;
  if public._friend_count(p_addressee) >= 100 then return jsonb_build_object('error', 'target_friend_limit'); end if;
  -- 20 pedidos por dia (contados no registro, que sobrevive a cancelar/desfazer);
  -- pedido recusado não conta contra quem enviou. Lock por quem envia para duas
  -- chamadas simultâneas não passarem do limite.
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
  perform public._friends_notify(p_addressee, 'friend_request', null, v_name || ' enviou um pedido de amizade 👋', 'friends');
  return jsonb_build_object('ok', true, 'status', 'sent');
end;
$$;

-- Atividade dos amigos: conquistas (earned_badges, já públicas) dos amigos
-- aceitos nos últimos 30 dias, de um idioma. Só amigos; no máximo 50 linhas.
create or replace function public.friends_activity(p_language text, p_limit integer default 30)
returns table (user_id uuid, username text, display_name text, avatar_url text,
               language_app_key text, badge_id text, earned_at timestamptz)
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
  select eb.user_id, p.username, p.display_name, p.avatar_url, eb.language_app_key, eb.badge_id, eb.earned_at
  from earned_badges eb
  join friendships f
    on f.status = 'accepted'
   and ((f.requester_id = v_me and f.addressee_id = eb.user_id) or (f.addressee_id = v_me and f.requester_id = eb.user_id))
  left join profiles p on p.user_id = eb.user_id
  where eb.language_app_key = p_language
    and eb.earned_at > now() - interval '30 days'
  order by eb.earned_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
end;
$$;
revoke all on function public.friends_activity(text, integer) from public, anon;
grant execute on function public.friends_activity(text, integer) to authenticated;

revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
