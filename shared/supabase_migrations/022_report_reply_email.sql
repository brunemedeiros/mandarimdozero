-- Permite a admin responder por e-mail quem enviou um report -- motivado
-- pelo pedido: "queria poder agradecer/explicar o que foi feito com o
-- report, mesmo sem ter o e-mail à mão hoje".
--
-- reporter_email NUNCA é lido de auth.users direto pelo cliente (profiles
-- nunca guarda e-mail de propósito, ver migration 001) -- só chega aqui de
-- duas formas:
--   1. Convidado que digitou o próprio e-mail (campo opcional no
--      formulário, ver shared/reports.js) -- gravado direto no insert.
--   2. Conta logada: fica NULL até a primeira resposta -- a Edge Function
--      report-reply-send resolve o e-mail via auth.admin.getUserById()
--      (service role, mesmo padrão já usado em getUserEmail() dentro de
--      supabase/functions/notification-cron) e grava aqui como cache,
--      evitando bater na Admin API de novo numa resposta seguinte ao
--      mesmo report.
--
-- admin_reply/admin_reply_subject/admin_reply_sent_at guardam só a ÚLTIMA
-- resposta enviada (não um histórico completo -- um report tende a
-- receber no máximo 1-2 respostas; se isso mudar, vira tabela própria).
alter table public.reports
  add column if not exists reporter_email text,
  add column if not exists admin_reply text,
  add column if not exists admin_reply_subject text,
  add column if not exists admin_reply_sent_at timestamptz;

-- Sem mudança de RLS: reports_public_insert (with check true) já cobre
-- gravar reporter_email num insert de convidado, e reports_admin_update já
-- cobre a admin gravar admin_reply/admin_reply_sent_at -- as duas policies
-- existentes (migration 020) são de linha inteira, não por coluna.
