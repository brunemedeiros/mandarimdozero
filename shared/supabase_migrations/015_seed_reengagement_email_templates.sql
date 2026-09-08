-- Fase 5 do sistema de notificações: primeiro conteúdo de canal 'email' de
-- verdade -- extensão do calendário de reengajamento (seção 13) pros dias
-- 9/15/20/30, que ficaram reservados a e-mail desde a Fase 2 (ver comentário
-- no topo de supabase/functions/notification-cron/index.ts).
--
-- Diferente de 'push' (que só "pendura" no texto do in_app, sem pool
-- próprio -- ver fireNotificationEvent/maybeNotify), 'email' tem conteúdo
-- PRÓPRIO aqui: title vira o assunto do e-mail, body vira a mensagem. É
-- mais formal/completo que a versão in_app do mesmo dia porque chega numa
-- caixa de entrada, não numa lista dentro do app -- precisa fazer sentido
-- sozinho, sem o contexto visual do sino ao redor.
--
-- channel já aceitava 'email' desde a 010 (check constraint), e
-- notification_preferences.channels já tinha "email" no default da
-- categoria "reengajamento" -- esta migration só adiciona as VARIANTES DE
-- TEXTO que faltavam pra esse canal deixar de ser teórico.
insert into public.notification_templates (event_type, channel, language_app_key, title, body, icon, created_by) values
  ('user_inactive_9', 'email', 'frances', 'Sentimos sua falta no francês 👋', 'Já faz 9 dias que você não estuda por aqui. Sem pressa nenhuma -- seu progresso continua guardado, exatamente como você deixou. Quando quiser, é só voltar.', '👋', 'seed'),
  ('user_inactive_9', 'email', 'mandarim', 'Sentimos sua falta no mandarim 👋', 'Já faz 9 dias que você não estuda por aqui. Sem pressa nenhuma -- seu progresso continua guardado, exatamente como você deixou. Quando quiser, é só voltar.', '👋', 'seed'),

  ('user_inactive_15', 'email', 'frances', 'Seu francês está esperando por você', '15 dias sem aparecer -- tudo bem, a vida acontece. Só um lembrete de que seu progresso está guardadinho aqui, pronto pra quando você quiser retomar.', '📖', 'seed'),
  ('user_inactive_15', 'email', 'mandarim', 'Seu mandarim está esperando por você', '15 dias sem aparecer -- tudo bem, a vida acontece. Só um lembrete de que seu progresso está guardadinho aqui, pronto pra quando você quiser retomar.', '📖', 'seed'),

  ('user_inactive_20', 'email', 'frances', 'Ainda por aí? Seu francês te espera', '20 dias já! Sem cobrança nenhuma -- só passando pra lembrar que dá pra retomar de onde parou, no seu tempo.', '🙂', 'seed'),
  ('user_inactive_20', 'email', 'mandarim', 'Ainda por aí? Seu mandarim te espera', '20 dias já! Sem cobrança nenhuma -- só passando pra lembrar que dá pra retomar de onde parou, no seu tempo.', '🙂', 'seed'),

  ('user_inactive_30', 'email', 'frances', 'Um mês sem estudar francês -- tudo bem?', 'Faz um mês que você não aparece por aqui. Seu progresso continua guardado, do jeitinho que você deixou. Quando bater a vontade de voltar, a gente está aqui.', '🫶', 'seed'),
  ('user_inactive_30', 'email', 'mandarim', 'Um mês sem estudar mandarim -- tudo bem?', 'Faz um mês que você não aparece por aqui. Seu progresso continua guardado, do jeitinho que você deixou. Quando bater a vontade de voltar, a gente está aqui.', '🫶', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;
