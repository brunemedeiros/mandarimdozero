-- Admin Mode ON/OFF: única fonte de verdade pro estado ON/OFF da conta
-- admin, separado de "é admin" (isAdminUser(), calculado no cliente a
-- partir do e-mail autenticado -- nunca muda). Mesmo padrão de
-- exclude_own_activity (migration 008): preferência de CONTA, então vive
-- em profiles, uma linha por conta.
--
-- Default true (ON) -- preserva o comportamento admin de sempre pra quem
-- já tinha a conta (e pra qualquer sessão que ainda não carregou o
-- profile): zero regressão até a autora desligar manualmente pela
-- primeira vez.
alter table public.profiles
  add column if not exists admin_mode boolean not null default true;
