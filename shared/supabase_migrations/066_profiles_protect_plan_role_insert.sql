-- 066 -- Fecha o INSERT de profiles contra auto-promoção (complementa a 063, que só cobre UPDATE).
--
-- Lacuna: a policy profiles_owner_insert só confere auth.uid() = user_id, e a 063 é BEFORE UPDATE. Uma conta
-- autenticada que ainda NÃO tem linha em profiles podia fazer o primeiro INSERT já com role='admin' e/ou
-- plan_tier='premium' (provado em banco local 2026-10-02; prova no Staging real em tests/fase-grants).
--
-- Correção: trigger BEFORE INSERT com a MESMA regra da 063 -- anon/authenticated/authenticator só inserem
-- o perfil com os valores iniciais legítimos (role='user', plan_tier='free'), exceto o admin identificado
-- pelo e-mail do JWT (mesmo critério da 063). Papéis internos (postgres, service_role, funções SECURITY
-- DEFINER como ensure_my_profile(), que é o caminho que o app usa) não são afetados. Rejeita (42501) em vez
-- de corrigir em silêncio, igual à 063. Não altera policies, dados nem a função/trigger da 063.
create or replace function public.profiles_protect_plan_role_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (new.role is distinct from 'user' or new.plan_tier is distinct from 'free')
     and current_user in ('anon','authenticated','authenticator')
     and coalesce(auth.jwt()->>'email','') <> 'brunemed1310@gmail.com' then
    raise exception 'plan_role_protected' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.profiles_protect_plan_role_insert() from public, anon, authenticated;
drop trigger if exists trg_profiles_protect_plan_role_insert on public.profiles;
create trigger trg_profiles_protect_plan_role_insert before insert on public.profiles
  for each row execute function public.profiles_protect_plan_role_insert();
-- rollback: drop trigger trg_profiles_protect_plan_role_insert on public.profiles;
--           drop function public.profiles_protect_plan_role_insert();
