-- 156 -- Google Agenda e Notion: a ligação só vale depois de confirmada pela sessão logada (achado A5 da auditoria de
-- segurança, docs/historico/36-auditoria-seguranca-2026-11.md).
--
-- Antes: a volta do login (callback) já gravava a ligação para o dono do `state`. Se a professora A mandasse o link de
-- consentimento para outra pessoa B e B aceitasse, a agenda/Notion de B ficava ligada à conta de A.
-- Agora: a volta guarda o resultado como PENDENTE (esta tabela, sem tocar na ligação ativa) com um código de confirmação
-- (só o hash SHA-256 fica aqui; o código vai no endereço de volta ao site). O site, com a sessão de quem está logado, chama
-- a ação 'confirm' da Edge Function, que chama oauth_pending_confirm: só ativa se quem confirma é o MESMO dono, dentro de
-- 15 minutos e uma vez só. Qualquer outro caso descarta a pendência (os tokens pendentes são apagados).
--
-- Sem apagar nada (a ferramenta MCP trava com comandos de apagar): pendência usada/descartada fica só como registro, com
-- payload = null. Aditiva. Volta atrás: republicar as Edge Functions anteriores (google-calendar v5, notion-sync v3 na
-- produção); a tabela e as 2 funções podem ficar (ninguém mais as chama) ou ser removidas pelo SQL Editor.

create table if not exists public.oauth_pending_links (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  provider text not null check (provider in ('google', 'notion')),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb,                  -- tokens da volta do login; null depois de usada ou descartada
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  consumed_at timestamptz,
  outcome text check (outcome is null or outcome in ('confirmed', 'not_same_user', 'expired', 'replaced'))
);
create index if not exists oauth_pending_links_open_idx on public.oauth_pending_links (user_id, provider) where consumed_at is null;
alter table public.oauth_pending_links enable row level security;
revoke all on public.oauth_pending_links from public, anon, authenticated;

-- Volta do login (Edge Function, service_role): guarda a pendência. Uma pendência aberta anterior do mesmo dono e serviço
-- é descartada; pendências vencidas de qualquer um perdem os tokens.
create or replace function public.oauth_pending_save(p_provider text, p_user uuid, p_code_hash text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_provider not in ('google', 'notion') then raise exception 'invalid_provider'; end if;
  if p_user is null or p_payload is null or coalesce(p_code_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_args'; end if;
  update public.oauth_pending_links set payload = null, consumed_at = now(), outcome = 'expired'
   where consumed_at is null and expires_at <= now();
  update public.oauth_pending_links set payload = null, consumed_at = now(), outcome = 'replaced'
   where consumed_at is null and user_id = p_user and provider = p_provider;
  insert into public.oauth_pending_links (code_hash, provider, user_id, payload) values (p_code_hash, p_provider, p_user, p_payload);
end $$;

-- Ação 'confirm' (Edge Function, service_role): p_caller = usuário do JWT de quem está logado no site.
-- Retorna {ok:true} ou {ok:false, error: not_found | already_used | expired | not_same_user}. Uso único: qualquer
-- resposta além de not_found/already_used marca a pendência como usada e apaga os tokens pendentes.
create or replace function public.oauth_pending_confirm(p_provider text, p_code_hash text, p_caller uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.oauth_pending_links;
begin
  select * into r from public.oauth_pending_links
   where code_hash = coalesce(p_code_hash, '') and provider = p_provider for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.consumed_at is not null then return jsonb_build_object('ok', false, 'error', 'already_used'); end if;
  if r.expires_at <= now() then
    update public.oauth_pending_links set payload = null, consumed_at = now(), outcome = 'expired' where code_hash = r.code_hash;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if p_caller is null or p_caller <> r.user_id then
    update public.oauth_pending_links set payload = null, consumed_at = now(), outcome = 'not_same_user' where code_hash = r.code_hash;
    return jsonb_build_object('ok', false, 'error', 'not_same_user');
  end if;
  if r.provider = 'google' then
    perform public.gcal_save_connection(r.user_id, r.payload ->> 'email', r.payload ->> 'refresh_token',
                                        r.payload ->> 'scopes', coalesce(r.payload -> 'calendars', '[]'::jsonb));
  else
    perform public.notion_save_connection(r.user_id, r.payload ->> 'access_token', r.payload ->> 'workspace_id',
                                          r.payload ->> 'workspace_name', r.payload ->> 'bot_id');
  end if;
  update public.oauth_pending_links set payload = null, consumed_at = now(), outcome = 'confirmed' where code_hash = r.code_hash;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.oauth_pending_save(text, uuid, text, jsonb), public.oauth_pending_confirm(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.oauth_pending_save(text, uuid, text, jsonb), public.oauth_pending_confirm(text, text, uuid)
  to service_role;
