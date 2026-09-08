-- Fase 2 do sistema de notificações: seed de notification_templates pros 3
-- eventos "Cron" que a Fase 2 liga (ver seção 14/18 da arquitetura
-- aprovada): revisão atrasada, sequência em risco, meta do dia não batida.
-- As tabelas já existem desde a 010; a lógica de negócio real (ler
-- `progress`, decidir quem recebe o quê) vem junto neste PR em
-- supabase/functions/notification-cron/index.ts.
--
-- Sem placeholder de palavra específica ({{word}}) ainda -- os cards
-- guardados em `progress` só têm um id técnico (ex: "u3-v7"), não o texto
-- em si (isso vive em content.js, arquivo estático de cada idioma, sem
-- acesso do lado do servidor hoje). Fica como refinamento de uma fase
-- futura; por enquanto a notificação é por CONTAGEM (ex: "8 palavras"),
-- que já é a metade "alta valor pedagógico" descrita na seção 14 (a outra
-- metade, nomear a palavra, depende dessa plumbing adicional).
insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('review_overdue', 'in_app', 'frances', 'Revisão pendente', '{{dueCount}} palavras estão esperando revisão -- algumas já há uns dias 📚', '🔄', 'seed'),
  ('review_overdue', 'in_app', 'frances', 'Hora de revisar', 'Você tem {{dueCount}} palavras prontas pra revisar. Vamos lá?', '🔄', 'seed'),
  ('review_overdue', 'in_app', 'mandarim', 'Revisão pendente', '{{dueCount}} palavras estão esperando revisão -- algumas já há uns dias 📚', '🔄', 'seed'),
  ('review_overdue', 'in_app', 'mandarim', 'Hora de revisar', 'Você tem {{dueCount}} palavras prontas pra revisar. Vamos lá?', '🔄', 'seed'),

  ('streak_at_risk', 'in_app', 'frances', '🔥 Sua sequência tá em risco!', 'Você ainda não estudou hoje -- {{days}} dias de sequência esperando por 5 minutinhos seus.', '🔥', 'seed'),
  ('streak_at_risk', 'in_app', 'frances', 'Não deixa apagar!', 'Faltou só hoje pra manter sua sequência de {{days}} dias. Dá tempo!', '🔥', 'seed'),
  ('streak_at_risk', 'in_app', 'mandarim', '🔥 Sua sequência tá em risco!', 'Você ainda não estudou hoje -- {{days}} dias de sequência esperando por 5 minutinhos seus.', '🔥', 'seed'),
  ('streak_at_risk', 'in_app', 'mandarim', 'Não deixa apagar!', 'Faltou só hoje pra manter sua sequência de {{days}} dias. Dá tempo!', '🔥', 'seed'),

  ('study_goal_remaining', 'in_app', 'frances', 'Falta pouco pra meta de hoje', 'Faltam {{lessonsRemaining}} lições pra bater sua meta diária de hoje.', '🎯', 'seed'),
  ('study_goal_remaining', 'in_app', 'frances', 'Quase lá!', 'Você já fez parte da meta de hoje -- só faltam {{lessonsRemaining}} lições.', '🎯', 'seed'),
  ('study_goal_remaining', 'in_app', 'mandarim', 'Falta pouco pra meta de hoje', 'Faltam {{lessonsRemaining}} lições pra bater sua meta diária de hoje.', '🎯', 'seed'),
  ('study_goal_remaining', 'in_app', 'mandarim', 'Quase lá!', 'Você já fez parte da meta de hoje -- só faltam {{lessonsRemaining}} lições.', '🎯', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
