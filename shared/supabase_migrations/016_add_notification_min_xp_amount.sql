-- Limite mínimo de XP pra disparar a notificação "XP ganho" (evento
-- xp_earned, categoria gamificacao). Motivação real da autora: revisões
-- maduras dão XP bem baixo de propósito (reviewXP() em app.js reduz o XP
-- de palavras já bem sabidas -- Fase 4.4), e cada uma dessas revisões
-- pequenas ainda disparava a notificação, virando ruído no sino mesmo
-- dentro do cooldown/limite diário já existentes (que controlam
-- FREQUÊNCIA, não o TAMANHO do ganho).
--
-- Nullable/opcional de propósito -- só faz sentido pro evento que carrega
-- "amount" no payload (hoje só xp_earned); as outras categorias continuam
-- sem esse corte, controladas só por cooldown_minutes/daily_cap como já
-- eram.
alter table public.notification_rules
  add column if not exists min_xp_amount integer check (min_xp_amount is null or min_xp_amount >= 0);

update public.notification_rules
  set min_xp_amount = 5
  where category = 'gamificacao' and min_xp_amount is null;
