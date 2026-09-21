-- Fase 6b do sistema de alunas particulares (ver CLAUDE.md) -- primeiro
-- evento de notification-cron cujo DESTINATÁRIO não é o sujeito do dado
-- (professora recebe um aviso sobre a INATIVIDADE DA ALUNA, não sobre si
-- mesma). maybeNotify() já era agnóstico quanto a isso (userId é só "quem
-- recebe"), então nenhuma mudança de mecanismo foi necessária -- só uma
-- nova categoria + templates, iguais em espírito às demais.
--
-- Categoria nova: 'supervisao'. cooldown_minutes/daily_cap = 1440/1 (mesmo
-- padrão de 'reengajamento' -- no máximo 1 aviso por professora por dia,
-- já que o processador bate TODAS as alunas inativas da mesma professora/
-- idioma numa notificação só, ver notification-cron/index.ts). schedule_days
-- reaproveita o MESMO mecanismo de marco de dias do calendário de
-- reengajamento (dispara só quando daysSince(lastStudyDay) bate exatamente
-- um desses números, não em todo dia a partir daí) -- [3,7,14]: marcos mais
-- curtos que o autorreengajamento da própria aluna (1..30), porque aqui
-- quem decide agir é a professora, faz sentido ela saber mais cedo. Ajustável
-- depois com um UPDATE simples nesta linha, sem precisar de código novo.
insert into notification_rules (category, priority, cooldown_minutes, daily_cap, active, required_plan, schedule_days)
values ('supervisao', 3, 1440, 1, true, 'free', '[3,7,14]'::jsonb)
on conflict (category) do nothing;

-- Só canal in_app por enquanto (mesmo critério de várias outras categorias
-- -- nem todo evento tem variante de e-mail, ver pickEmailTemplate). Texto
-- evita concordância verbal amarrada a singular/plural (ver regra de
-- "português real" no CLAUDE.md) -- {{studentList}} já vem formatado como
-- "Nome (N dias)" ou "Nome1 (N dias), Nome2 (M dias)" do lado do servidor.
-- 'supervisao' de propósito NÃO entra em NOTIFICATION_PREF_CATEGORIES
-- (shared/notification-preferences.js) -- mesmo precedente já usado por
-- 'perfil' (lembrete de badge em destaque): categoria de baixíssimo volume,
-- só afeta contas professora/admin, in-app sempre permitido por padrão
-- (categoryAllowsInApp retorna true quando não há preferência salva), sem
-- necessidade de expor um toggle dedicado nesta fase.
insert into notification_templates (event_type, channel, language_app_key, title, body, icon, active)
values
  ('student_inactive_alert', 'in_app', 'frances', null, 'Sem aparecer há alguns dias: {{studentList}}. Talvez seja hora de mandar um alô 👋', '🎓', true),
  ('student_inactive_alert', 'in_app', 'frances', null, 'Passou uns dias sem prática por aí: {{studentList}}. Um lembrete seu pode ajudar a retomar o ritmo.', '🎓', true),
  ('student_inactive_alert', 'in_app', 'mandarim', null, 'Sem aparecer há alguns dias: {{studentList}}. Talvez seja hora de mandar um alô 👋', '🎓', true),
  ('student_inactive_alert', 'in_app', 'mandarim', null, 'Passou uns dias sem prática por aí: {{studentList}}. Um lembrete seu pode ajudar a retomar o ritmo.', '🎓', true)
on conflict do nothing;
