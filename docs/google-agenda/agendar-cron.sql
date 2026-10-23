-- Google Agenda (117): leitura automática a cada 15 minutos. Rodar em cada projeto DEPOIS da migration 117.
-- 1) Segredos no Vault (uma vez; trocar <projeto>). A senha é sorteada aqui e nunca sai do banco: a Edge Function confere
--    com gcal_check_sync_token.
--    select vault.create_secret('https://<projeto>.supabase.co/functions/v1/google-calendar', 'gcal_sync_url');
--    select vault.create_secret(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'gcal_sync_token');
-- 2) Agendamento (idempotente: o mesmo nome atualiza).
select cron.schedule('gcal-sync', '*/15 * * * *', $$ select public._gcal_cron_post() $$);
-- Para pausar: select cron.unschedule('gcal-sync');
