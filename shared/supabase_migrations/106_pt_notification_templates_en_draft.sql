-- 106 -- Modelos de aviso do português (`portugues`) em inglês: RASCUNHO, TODOS INATIVOS (2026-10-15).
--
-- Contexto: docs/i18n/e6-minimo-servidor-pt.md (achado Q4, pergunta P3) e docs/i18n/modelos-aviso-pt-en-revisao.md
-- (tabela legível para a dona revisar). O curso de português é só em inglês (Q-04): linhas `ui_language = 'en'`.
-- Escopo (decisão da dona): sequência em risco, meta do dia e reengajamento, no sino (in_app) e no e-mail
-- (e-mail só no reengajamento dos dias 9, 15, 20 e 30, como já é no francês/mandarim). Mesmo formato das seeds
-- 012 (streak_at_risk, study_goal_remaining), 010 (user_inactive_N in_app) e 015 (user_inactive_N email), com o
-- texto na linha de docs/i18n/notif-en.json (francês trocado por português). Tom caloroso e curto.
--
-- TUDO INATIVO (`active = false`): nada sai para ninguém até a dona revisar e ativar. Só INSERT, sem DROP e sem
-- apagar linhas, aplicável pela ferramenta de migration. Pode rodar de novo (on conflict do nothing).
-- Marca das linhas: created_by = 'i18n-pt-en-rascunho'.
-- ATENÇÃO: nenhum aviso automático de português sai só com estas linhas. O `notification-cron` ainda não conhece
-- `portugues` (E6 Q1: `LANGUAGES` em supabase/functions/notification-cron/index.ts); sem o deploy dele elas ficam
-- paradas, mesmo depois de ativadas. As variáveis {{days}} e {{lessonsRemaining}} são as do cron.
--
-- Para ativar depois da revisão (SQL Editor ou MCP, Staging antes):
--   update public.notification_templates set active = true
--    where language_app_key = 'portugues' and ui_language = 'en' and created_by = 'i18n-pt-en-rascunho';
-- (para ativar só um evento, acrescentar `and event_type = '...'`; para trocar um texto, atualizar a linha pelo Painel
-- de Admin > Notificações, sem nova migration).
-- ROLLBACK: remover as linhas com created_by = 'i18n-pt-en-rascunho' (nenhuma outra tabela é tocada).

insert into public.notification_templates (event_type, channel, language_app_key, icon, title, body, active, ui_language, created_by) values
  ('streak_at_risk', 'in_app', 'portugues', '🔥', '🔥 Your streak is at risk!', 'You haven''t studied today yet. Your {{days}}-day streak is waiting for 5 little minutes from you.', false, 'en', 'i18n-pt-en-rascunho'),
  ('streak_at_risk', 'in_app', 'portugues', '🔥', 'Don''t let it go out!', 'Only today is missing to keep your {{days}}-day streak going. There''s still time!', false, 'en', 'i18n-pt-en-rascunho'),
  ('study_goal_remaining', 'in_app', 'portugues', '🎯', 'Almost at today''s goal', 'Lessons left to hit your daily goal: {{lessonsRemaining}}. You''ve got this!', false, 'en', 'i18n-pt-en-rascunho'),
  ('study_goal_remaining', 'in_app', 'portugues', '🎯', 'Almost there!', 'You''ve already done part of today''s goal. Lessons left: {{lessonsRemaining}}.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_1', 'in_app', 'portugues', null, null, 'Hey, did you forget about me? 🥺 Just five little minutes and your daily Portuguese is done.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_1', 'in_app', 'portugues', null, null, 'Your Portuguese is right here, waiting for you (with puppy-dog eyes) 🐶', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_3', 'in_app', 'portugues', null, null, '3 days without showing up... I already miss you! Come say a quick hi? 👋', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_3', 'in_app', 'portugues', null, null, 'Psst. Your Portuguese is getting lonely.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_5', 'in_app', 'portugues', null, null, 'Where are you? Your Portuguese is still here, on the same page you left it 📖', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_5', 'in_app', 'portugues', null, null, '5 days! How about just one quick exercise to keep the rhythm?', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_7', 'in_app', 'portugues', null, null, 'A whole week... is everything okay over there? Come on, we''ll pick it back up together 🫶', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_7', 'in_app', 'portugues', null, null, 'Your streak is sleeping. How about waking it up with 5 little minutes?', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_9', 'in_app', 'portugues', null, null, 'It''s been a little while! No rush, just reminding you that your progress is waiting 🙂', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_9', 'in_app', 'portugues', null, null, 'Want to pick up where you left off? We''ll help you remember quickly.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_15', 'in_app', 'portugues', null, null, 'No rush at all, but if you feel like it, your progress is waiting for you here.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_20', 'in_app', 'portugues', null, null, 'Your Portuguese is still safely stored, just the way you left it. Come back whenever you like 🙂', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_30', 'in_app', 'portugues', null, null, 'Your progress is still safely stored here, just the way you left it.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_9', 'email', 'portugues', '👋', 'We miss you in Portuguese 👋', 'It''s been 9 days since you studied here. No rush at all. Your progress is still saved, exactly as you left it. Whenever you want, just come back.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_15', 'email', 'portugues', '📖', 'Your Portuguese is waiting for you', '15 days away, and that''s okay, life happens. Just a reminder that your progress is safely stored here, ready for whenever you want to pick it back up.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_20', 'email', 'portugues', '🙂', 'Still there? Your Portuguese is waiting', '20 days already! No pressure at all, just stopping by to remind you that you can pick up right where you left off, at your own pace.', false, 'en', 'i18n-pt-en-rascunho'),
  ('user_inactive_30', 'email', 'portugues', '🫶', 'A month without Portuguese. Everything okay?', 'It''s been a month since you last stopped by. Your progress is still saved, just the way you left it. Whenever you feel like coming back, we''re here.', false, 'en', 'i18n-pt-en-rascunho')
on conflict (event_type, channel, language_app_key, body) do nothing;
