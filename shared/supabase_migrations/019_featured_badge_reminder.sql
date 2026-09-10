-- Lembrete "escolha um badge em destaque" -- decisão explícita da autora:
-- quem já ganhou um badge ESPECIAL (Fundadora/Beta Tester/concedido por
-- admin/premium quando existir -- nunca uma Conquista de gameplay, ver o
-- comentário de saveProfileEdits em shared/profile.js) mas ainda não
-- escolheu nenhum pra aparecer no Ranking recebe um empurrão a cada 5 dias,
-- até escolher um. Reaproveita o mecanismo de cooldown/daily_cap que já
-- existe pra qualquer categoria (notification_rules) -- 5 dias = 7200
-- minutos de cooldown é o "a cada 5 dias" pedido, sem precisar de nenhum
-- controle de data extra: o cron (ver processFeaturedBadgeReminders em
-- supabase/functions/notification-cron/index.ts) simplesmente tenta
-- notificar todo dia, e o cooldown da categoria 'perfil' é quem decide se
-- essa tentativa vira notificação de verdade ou é descartada.
--
-- Não dispara pra quem não tem NENHUM badge especial disponível -- lembrar
-- alguém de escolher algo que ela não pode escolher seria só ruído.
insert into public.notification_rules (category, priority, cooldown_minutes, daily_cap, schedule_days)
values
  ('perfil', 3, 7200, 1, null)
on conflict (category) do nothing;

insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('featured_badge_reminder', 'in_app', 'frances', 'Mostre sua conquista! 🏅', 'Você já ganhou um badge especial, mas ainda não escolheu um pra aparecer ao lado do seu nome no Ranking. Que tal escolher agora?', '🏅', 'seed'),
  ('featured_badge_reminder', 'in_app', 'frances', 'Não esqueça!', 'Seu badge em destaque no Ranking ainda está vazio -- ative um em Editar perfil.', '🏅', 'seed'),
  ('featured_badge_reminder', 'in_app', 'mandarim', 'Mostre sua conquista! 🏅', 'Você já ganhou um badge especial, mas ainda não escolheu um pra aparecer ao lado do seu nome no Ranking. Que tal escolher agora?', '🏅', 'seed'),
  ('featured_badge_reminder', 'in_app', 'mandarim', 'Não esqueça!', 'Seu badge em destaque no Ranking ainda está vazio -- ative um em Editar perfil.', '🏅', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
