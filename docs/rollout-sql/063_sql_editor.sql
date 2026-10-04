begin;
-- 063 -- Protege profiles.plan_tier e profiles.role contra auto-promoção (achado P8, auditoria 062).
-- Antes: profiles_owner_update deixava qualquer usuário autenticado fazer UPDATE da própria linha, inclusive
-- plan_tier='premium' (contorna o gate Premium de Public Deck) e role. Só o admin (e-mail do JWT) ou papéis
-- internos (postgres/service_role) podem alterar essas duas colunas. Aditiva; não altera dados nem policies.
create or replace function public.profiles_protect_plan_role()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (new.plan_tier is distinct from old.plan_tier or new.role is distinct from old.role)
     and current_user in ('anon','authenticated','authenticator')
     and coalesce(auth.jwt()->>'email','') <> 'brunemed1310@gmail.com' then
    raise exception 'plan_role_protected' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.profiles_protect_plan_role() from public, anon, authenticated;
drop trigger if exists trg_profiles_protect_plan_role on public.profiles;
create trigger trg_profiles_protect_plan_role before update on public.profiles
  for each row execute function public.profiles_protect_plan_role();
-- rollback: drop trigger trg_profiles_protect_plan_role on public.profiles; drop function public.profiles_protect_plan_role();
commit;
