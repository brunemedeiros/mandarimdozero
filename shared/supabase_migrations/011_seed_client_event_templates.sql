-- Fase 1 do sistema de notificações: seed de notification_templates pros 4
-- eventos "Cliente" (disparados na hora, sem precisar do cron -- ver seção
-- 7/18 da arquitetura aprovada): XP ganho, badge desbloqueado, desafio
-- concluído, streak batida. As tabelas já existem desde a 010 -- esta
-- migration só adiciona variantes de texto, mesmo padrão do seed de
-- reengajamento (010), com placeholders {{amount}}/{{badge_name}}/
-- {{badge_icon}}/{{days}} substituídos no client (shared/notifications.js)
-- a partir do payload gravado em notification_events.
--
-- challenge_completed não usa placeholder de título: o desafio concluído
-- não tem um campo de título único e estável em todos os tipos (ver
-- CHALLENGES em languages/fr/app.js) -- texto genérico evita mostrar
-- "undefined" caso o payload não carregue esse dado.
insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('xp_earned', 'in_app', 'frances', 'Pontos ganhos!', 'Você ganhou +{{amount}} XP ⭐ Continue assim!', '⭐', 'seed'),
  ('xp_earned', 'in_app', 'frances', 'Boa!', '+{{amount}} XP no bolso 💪', '⭐', 'seed'),
  ('xp_earned', 'in_app', 'mandarim', 'Pontos ganhos!', 'Você ganhou +{{amount}} XP ⭐ Continue assim!', '⭐', 'seed'),
  ('xp_earned', 'in_app', 'mandarim', 'Boa!', '+{{amount}} XP no bolso 💪', '⭐', 'seed'),

  ('achievement_unlocked', 'in_app', 'frances', 'Nova conquista! 🏅', 'Você desbloqueou o badge "{{badge_name}}" {{badge_icon}}', '🏅', 'seed'),
  ('achievement_unlocked', 'in_app', 'mandarim', 'Nova conquista! 🏅', 'Você desbloqueou o badge "{{badge_name}}" {{badge_icon}}', '🏅', 'seed'),

  ('challenge_completed', 'in_app', 'frances', 'Desafio concluído! 🎯', 'Mais um desafio no currículo. Bora pro próximo?', '🎯', 'seed'),
  ('challenge_completed', 'in_app', 'frances', 'Boa!', 'Desafio concluído com sucesso 🎯', '🎯', 'seed'),

  ('streak_completed', 'in_app', 'frances', '🔥 Sequência mantida!', 'Você já está há {{days}} dias seguidos estudando. Não deixa esfriar!', '🔥', 'seed'),
  ('streak_completed', 'in_app', 'frances', '🔥 Estudou hoje!', '{{days}} dias de sequência. Você tá voando!', '🔥', 'seed'),
  ('streak_completed', 'in_app', 'mandarim', '🔥 Sequência mantida!', 'Você já está há {{days}} dias seguidos estudando. Não deixa esfriar!', '🔥', 'seed'),
  ('streak_completed', 'in_app', 'mandarim', '🔥 Estudou hoje!', '{{days}} dias de sequência. Você tá voando!', '🔥', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
