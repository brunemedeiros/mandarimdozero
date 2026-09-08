-- Fase 4 do sistema de notificações: seed de notification_templates pros
-- eventos de Ranking e Desafios (ver seção 18 da arquitetura aprovada --
-- "menor prioridade pedagógica, mas dado já existe"):
--   - ranking_rank_up / ranking_rank_down -- evento "Cliente", disparado ao
--     abrir o Ranking (shared/leaderboard.js) e a posição ter mudado desde
--     a última visita.
--   - ranking_weekly_result -- evento "Cron", disparado pelo
--     notification-cron toda segunda-feira com a posição final da semana
--     que terminou.
--   - daily_missions_reminder -- evento "Cron": a pessoa teve alguma
--     atividade hoje mas não completou as 3 missões do dia.
insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('ranking_rank_up', 'in_app', 'frances', '📈 Você subiu no ranking!', 'Você agora está em Nº{{newRank}} no ranking geral da semana 🎉', '🏆', 'seed'),
  ('ranking_rank_up', 'in_app', 'mandarim', '📈 Você subiu no ranking!', 'Você agora está em Nº{{newRank}} no ranking geral da semana 🎉', '🏆', 'seed'),

  ('ranking_rank_down', 'in_app', 'frances', 'Alguém te ultrapassou', 'Você caiu pra Nº{{newRank}} no ranking geral. Bora recuperar? 💪', '🏆', 'seed'),
  ('ranking_rank_down', 'in_app', 'mandarim', 'Alguém te ultrapassou', 'Você caiu pra Nº{{newRank}} no ranking geral. Bora recuperar? 💪', '🏆', 'seed'),

  ('ranking_weekly_result', 'in_app', 'frances', '🏆 Resultado da semana', 'Você terminou a semana em Nº{{rank}} de {{totalParticipants}} no ranking geral. Uma nova semana já começou!', '🏆', 'seed'),
  ('ranking_weekly_result', 'in_app', 'mandarim', '🏆 Resultado da semana', 'Você terminou a semana em Nº{{rank}} de {{totalParticipants}} no ranking geral. Uma nova semana já começou!', '🏆', 'seed'),

  ('daily_missions_reminder', 'in_app', 'frances', 'Falta pouco pras missões de hoje', 'Você já começou hoje -- faltam {{missing}} missões do dia pra terminar tudo 🎯', '🎯', 'seed'),
  ('daily_missions_reminder', 'in_app', 'frances', 'Quase lá!', '{{missing}} missões de hoje ainda esperando por você.', '🎯', 'seed'),
  ('daily_missions_reminder', 'in_app', 'mandarim', 'Falta pouco pras missões de hoje', 'Você já começou hoje -- faltam {{missing}} missões do dia pra terminar tudo 🎯', '🎯', 'seed'),
  ('daily_missions_reminder', 'in_app', 'mandarim', 'Quase lá!', '{{missing}} missões de hoje ainda esperando por você.', '🎯', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
