-- 144: protege a data da confirmação de idade (profile_private.age_ack_at, migration 136).
--
-- Achado da revisão diária, confirmado pela dona (2026-11-24): a policy de update da 073 deixa a dona da linha mudar
-- qualquer coluna de profile_private pela API, inclusive age_ack_at. Isso enfraquece o registro do aceite para o advogado.
-- Regra nova (trigger, vale para qualquer caminho):
--   * pela API (papéis authenticated e anon): ninguém grava, troca nem apaga age_ack_at; apagar a linha que já tem a data
--     também é recusado. O gênero (gender) continua editável pela própria pessoa, como antes.
--   * a data só nasce pela ack_my_age() (security definer, roda como a dona da função), e uma vez só: depois de gravada,
--     nem a função nem o servidor conseguem trocá-la. Apagar a linha inteira continua possível fora da API (exclusão de
--     conta pela Edge Function delete-my-account ou em cascata de auth.users).
-- Aditiva e idempotente (create or replace). Rollback (manual, SQL Editor): drop trigger profile_private_age_ack_guard on
-- public.profile_private; drop function public._guard_age_ack().

create or replace function public._guard_age_ack()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.age_ack_at is not null then
      raise exception 'age_ack_at_protected' using errcode = '42501', hint = 'Use ack_my_age().';
    elsif tg_op = 'UPDATE' and new.age_ack_at is distinct from old.age_ack_at then
      raise exception 'age_ack_at_protected' using errcode = '42501', hint = 'Use ack_my_age().';
    elsif tg_op = 'DELETE' and old.age_ack_at is not null then
      raise exception 'age_ack_at_protected' using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' and old.age_ack_at is not null and new.age_ack_at is distinct from old.age_ack_at then
    raise exception 'age_ack_at_protected' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public._guard_age_ack() from public, anon, authenticated;

create or replace trigger profile_private_age_ack_guard
  before insert or update or delete on public.profile_private
  for each row execute function public._guard_age_ack();
