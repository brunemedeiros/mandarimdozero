-- 147: report só em nome de quem envia, sem campos da admin.
--
-- Auditoria de segurança de 2026-11-25 (docs/historico/36-auditoria-seguranca-2026-11.md):
-- a regra reports_public_insert era WITH CHECK (true) para anon e authenticated. No
-- Staging (transação desfeita), uma conta A e um visitante sem conta gravaram report com
-- o user_id de outra aluna, status 'resolvido', prioridade, nota interna, "resposta" e
-- reporter_email forjados (a resposta da admin iria para esse e-mail).
--
-- Agora:
--   visitante  -> user_id nulo (o e-mail de contato digitado continua permitido)
--   logado     -> user_id = a própria conta e reporter_email nulo (a Edge Function
--                 report-reply-send busca o e-mail da conta)
--   ninguém    -> preenche status (fica 'novo'), priority, internal_note, admin_reply*
-- O formulário do site (shared/reports.js) já manda exatamente isso: nada muda para ele.
--
-- ALTER POLICY no lugar (sem DROP): mesma regra, nome mantido.

alter policy reports_public_insert on public.reports
  to anon, authenticated
  with check (
    (
      (auth.uid() is null and user_id is null)
      or (auth.uid() is not null and user_id = auth.uid() and reporter_email is null)
    )
    and coalesce(status, 'novo') = 'novo'
    and priority is null
    and internal_note is null
    and admin_reply is null
    and admin_reply_subject is null
    and admin_reply_sent_at is null
  );

-- Voltar atrás (se o formulário quebrar):
-- alter policy reports_public_insert on public.reports to anon, authenticated with check (true);
