-- 118 -- Google Agenda: evento "para revisar" é reconhecido sozinho quando a aluna aparece (2026-10-23).
-- Antes, só os eventos esperando conta (no_account/pending) eram tentados de novo; um evento que não foi reconhecido
-- (aluna sem conta e fora do Banco) ficava na caixa "Eventos para revisar" para sempre, mesmo depois do vínculo.
-- Agora a cada leitura (15 min) os eventos da caixa também são tentados de novo. Os cancelados no Google (state
-- 'cancelled') e as decisões da professora (linked/ignored) não mudam. Aditiva, sem DROP.
create or replace function public.gcal_retry_waiting(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare e public.google_calendar_events; n int := 0;
begin
  for e in select * from public.google_calendar_events where user_id = p_user and match_state in ('no_account', 'pending', 'review') loop
    if e.match_reason = 'escolhido pela professora' then
      perform public._gcal_apply_target(e.id, e.student_id, e.classroom_id, e.bank_student_id, e.language_app_key);
    else
      perform public._gcal_apply(e.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.gcal_retry_waiting(uuid) from public, anon, authenticated;
grant execute on function public.gcal_retry_waiting(uuid) to service_role;
