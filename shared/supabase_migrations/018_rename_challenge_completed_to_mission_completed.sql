-- "Desafio concluído" (challenge_completed) disparava ao concluir QUALQUER
-- desafio -- inclusive os de conteúdo (Expressões/Ouça e traduza/
-- Acentuação, ver CHALLENGE_CATEGORIES em fr/app.js), que desde a auditoria
-- de XP nem dão mais recompensa nenhuma. Decisão explícita da autora: essa
-- notificação deve ser só sobre as 3 Missões do dia (todaysChallenges() em
-- cada app.js) -- renomeada aqui pra "Missão concluída", disparada uma vez
-- por MISSÃO individual completada (não pelo conjunto das 3, que já tem seu
-- próprio evento/bônus). fr/app.js e zh/app.js passam a chamar
-- fireNotificationEvent('mission_completed', ...) em vez de
-- 'challenge_completed'.
--
-- As Missões do dia existem nos DOIS idiomas (diferente dos desafios de
-- conteúdo, que eram só FR) -- por isso os variantes de mandarim são
-- inseridos do zero aqui, não só atualizados.
--
-- Usa {{mission_label}} como placeholder (ver payload em
-- checkDailyMissionCompletions()): diferente do desafio de conteúdo antigo,
-- uma Missão do dia TEM um texto estável (c.label, ex.: "Complete sua
-- primeira lição do dia"), então dá pra ser específico em vez de genérico.

update public.notification_templates
set event_type = 'mission_completed',
    title = 'Missão concluída! 🎯',
    body = '{{mission_label}} — feito! Bora pra próxima?'
where event_type = 'challenge_completed' and language_app_key = 'frances' and title = 'Desafio concluído! 🎯';

update public.notification_templates
set event_type = 'mission_completed',
    title = 'Boa!',
    body = '{{mission_icon}} Missão concluída: {{mission_label}}'
where event_type = 'challenge_completed' and language_app_key = 'frances' and title = 'Boa!' and body = 'Desafio concluído com sucesso 🎯';

insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('mission_completed', 'in_app', 'mandarim', 'Missão concluída! 🎯', '{{mission_label}} — feito! Bora pra próxima?', '🎯', 'seed'),
  ('mission_completed', 'in_app', 'mandarim', 'Boa!', '{{mission_icon}} Missão concluída: {{mission_label}}', '🎯', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
