-- 126_etapa7_aviso_para_hoje
-- Etapa 7 (vocabulário único), lote "para hoje", aprovado pela dona: o que vence hoje é "para hoje" (en "due today"),
-- e o aviso não chama de "revisão rápida" (o aviso abre a Revisão normal; "Revisão rápida" é outro modo).
-- Só UPDATE de texto em 4 linhas de notification_templates (body, review_overdue). O título ("Revisão do dia" /
-- "Today's review") fica. Nada de esquema, nada de progresso.
--
-- Texto antigo (para desfazer):
--   update public.notification_templates set body = '{{dueCount}} palavras estão prontas para uma revisão rápida 📚'
--     where id in (39, 41) and event_type = 'review_overdue' and body = '{{dueCount}} palavras para hoje na Revisão 📚';
--   update public.notification_templates set body = '{{dueCount}} words are ready for a quick review 📚'
--     where id in (119, 120) and event_type = 'review_overdue' and body = '{{dueCount}} words due today in Review 📚';
--
-- Idempotente: só troca se o texto ainda for o antigo (no Staging as linhas 119 e 120 não existem).

update public.notification_templates
   set body = '{{dueCount}} palavras para hoje na Revisão 📚', updated_at = now()
 where id in (39, 41)
   and event_type = 'review_overdue'
   and body = '{{dueCount}} palavras estão prontas para uma revisão rápida 📚';

update public.notification_templates
   set body = '{{dueCount}} words due today in Review 📚', updated_at = now()
 where id in (119, 120)
   and event_type = 'review_overdue'
   and body = '{{dueCount}} words are ready for a quick review 📚';
