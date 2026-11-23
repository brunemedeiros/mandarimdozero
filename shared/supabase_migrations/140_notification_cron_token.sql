-- 140: senha no agendamento do robô de avisos (auditoria de segurança de 2026-11-19,
-- docs/historico/36-auditoria-seguranca-2026-11.md, achado 4).
--
-- Antes: o cron `notification-cron-diario` chamava a Edge Function com a chave
-- secreta do projeto escrita em texto puro no comando do cron, e a função não
-- conferia nada além do JWT (que a chave pública do site também passa). Qualquer
-- pessoa com a chave pública disparava os avisos fora de hora.
-- Agora: o cron chama public._notif_cron_post(), que lê do Vault o endereço, a
-- chave pública e a senha (`notif_cron_token`) e manda a senha no cabeçalho
-- `x-cron-token`; a função (supabase/functions/notification-cron) recusa quem
-- não manda a senha igual ao secret NOTIFICATION_CRON_TOKEN. Mesmo molde de
-- _rb_agent_post (rotina do Banco). A chave secreta sai do comando do cron.
--
-- Os VALORES não ficam no repositório. Antes desta migration, criar no Vault
-- (mesmo projeto): notif_cron_url, notif_cron_anon, notif_cron_token; e o
-- secret NOTIFICATION_CRON_TOKEN da Edge Function com o mesmo valor do token.
-- Horário igual ao de antes (22h UTC = 19h em Brasília). Sem DROP.

create or replace function public._notif_cron_post()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url   text := public._rb_agent_secret('notif_cron_url');
  v_anon  text := public._rb_agent_secret('notif_cron_anon');
  v_token text := public._rb_agent_secret('notif_cron_token');
begin
  if coalesce(v_url, '') = '' or coalesce(v_anon, '') = '' or coalesce(v_token, '') = '' then
    raise exception 'notif_cron_nao_configurado: faltam segredos no Vault (notif_cron_url, notif_cron_anon, notif_cron_token)';
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon, 'x-cron-token', v_token),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
end;
$$;

revoke execute on function public._notif_cron_post() from public, anon, authenticated;

-- Mesmo nome de job: cron.schedule troca o comando do job que já existe.
select cron.schedule('notification-cron-diario', '0 22 * * *', 'select public._notif_cron_post()');
