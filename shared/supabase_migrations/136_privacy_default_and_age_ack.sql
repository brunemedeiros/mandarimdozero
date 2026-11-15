-- 136: privacidade por padrão para contas novas + confirmação de idade (Fase P, decisão da dona em 2026-11-15).
--
-- Opção C escolhida pela dona (docs/historico/35-google-analytics-consentimento.md):
--   * contas NOVAS nascem com o perfil privado (public_profile = false). Desconhecidos veem só nome, @ e badge e só acham
--     a pessoa pelo @ exato (regras da 080). Ranking e Amigos continuam ligados. Quem quiser abre o perfil em
--     "Editar perfil > Compartilhe sua jornada".
--   * contas que já existem NÃO mudam (sem UPDATE): a 041 tornou todas públicas a pedido da dona e isso fica.
--   * caixinha obrigatória no cadastro ("Tenho 18 anos ou mais, ou tenho autorização do meu responsável"): a data do
--     aceite fica em profile_private.age_ack_at (só a própria pessoa lê, policies da 073), gravada pelo servidor
--     (ack_my_age), para servir de registro.
--
-- Aditiva e idempotente: muda só o DEFAULT de uma coluna, acrescenta uma coluna e uma função.
-- Rollback (manual): alter column public_profile set default true; drop function ack_my_age(); drop column age_ack_at.

alter table public.profiles
  alter column public_profile set default false;

alter table public.profile_private
  add column if not exists age_ack_at timestamptz null;

comment on column public.profile_private.age_ack_at is
  'Quando a pessoa marcou "Tenho 18 anos ou mais, ou tenho autorização do meu responsável" (136). Nulo = ainda não confirmou.';

-- Grava a confirmação com a hora do servidor. A primeira data fica (confirmar de novo não muda o registro).
create or replace function public.ack_my_age()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.profile_private (user_id, age_ack_at, updated_at)
  values (v_uid, now(), now())
  on conflict (user_id) do update
    set age_ack_at = coalesce(public.profile_private.age_ack_at, excluded.age_ack_at),
        updated_at = case when public.profile_private.age_ack_at is null then now() else public.profile_private.updated_at end
  returning age_ack_at into v_at;
  return v_at;
end;
$$;

revoke all on function public.ack_my_age() from public, anon;
grant execute on function public.ack_my_age() to authenticated;
