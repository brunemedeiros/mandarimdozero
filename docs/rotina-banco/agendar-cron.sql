-- Agendamentos do pg_cron da rotina do Banco de Revisão (rodar em cada projeto DEPOIS da migration 091 e dos segredos do Vault).
-- Idempotente: cron.schedule com o mesmo nome atualiza o agendamento. Horários em UTC (Brasília = UTC-3).
-- 1) reserva da caixa de entrada: a cada 5 minutos, reenvia linhas pendentes há mais de 1 minuto ou travadas há mais de 10.
select cron.schedule('rb-agent-sweep', '*/5 * * * *', $$ select public.agent_inbox_sweep() $$);
-- 2) rodada noturna sem a tarefa: 02:30 em Brasília (depois da tarefa das 01:50). Recap das aulas de hoje + cartões dos itens prontos.
select cron.schedule('rb-agent-nightly', '30 5 * * *', $$ select public._rb_agent_post('{"action":"nightly"}'::jsonb) $$);
-- Para pausar: select cron.unschedule('rb-agent-sweep'); select cron.unschedule('rb-agent-nightly');
