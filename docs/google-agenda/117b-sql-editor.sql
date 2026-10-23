-- 117, parte B (as 3 funções com "delete" que a ferramenta não consegue aplicar). Colar no SQL Editor do projeto e clicar em Run.
-- Staging: https://supabase.com/dashboard/project/ilfjzizjfcmhibkhwber/sql/new   Produção: https://supabase.com/dashboard/project/eigjocalzwamisgqilhg/sql/new

create or replace function public.gcal_new_state(p_user uuid, p_return_url text)
returns text language plpgsql security definer set search_path = public as $$
declare v_state text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  delete from public.google_oauth_states where created_at < now() - interval '1 hour';
  insert into public.google_oauth_states (state, user_id, return_url) values (v_state, p_user, p_return_url);
  return v_state;
end $$;

create or replace function public.gcal_take_state(p_state text)
returns table (user_id uuid, return_url text) language plpgsql security definer set search_path = public as $$
begin
  return query delete from public.google_oauth_states s
   where s.state = p_state and s.created_at > now() - interval '15 minutes'
   returning s.user_id, s.return_url;
end $$;

create or replace function public.google_calendar_disconnect()
returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or not public.is_teacher() then raise exception 'not_authorized'; end if;
  -- Aulas continuam no site (google_event_ref vira null pelo on delete set null); regras ficam para uma reconexão.
  delete from public.google_calendar_events where user_id = v_me;
  delete from public.google_calendar_sources where user_id = v_me;
  delete from public.google_calendar_connections where user_id = v_me;
end $$;

revoke execute on function public.gcal_new_state(uuid, text) from public, anon, authenticated;
grant execute on function public.gcal_new_state(uuid, text) to service_role;
revoke execute on function public.gcal_take_state(text) from public, anon, authenticated;
grant execute on function public.gcal_take_state(text) to service_role;
revoke execute on function public.google_calendar_disconnect() from public, anon;
grant execute on function public.google_calendar_disconnect() to authenticated;
