-- 150: regras da admin por is_admin() em vez do e-mail do token (P3 da auditoria de 2026-11-25,
-- docs/historico/36-auditoria-seguranca-2026-11.md). Não era brecha: eram duas formas de dizer "é a admin".
-- is_admin() = _is_admin_uid(auth.uid()): papel 'admin' em account_roles (não vencido) OU o e-mail da autora no
-- token. Hoje só a conta da autora tem o papel admin, então quem tem acesso não muda. As 16 regras abaixo são TODAS
-- as que citavam o e-mail (conferido nos dois projetos em 2026-11-26). ALTER POLICY no lugar: sem DROP, nome mantido.

alter policy badge_catalog_admin_delete on public.badge_catalog using (public.is_admin());
alter policy badge_catalog_admin_insert on public.badge_catalog with check (public.is_admin());
alter policy badge_catalog_admin_update on public.badge_catalog using (public.is_admin()) with check (public.is_admin());
alter policy badge_grants_admin_delete on public.badge_grants using (public.is_admin());
alter policy badge_grants_admin_insert on public.badge_grants with check (public.is_admin());
alter policy badge_grants_admin_update on public.badge_grants using (public.is_admin()) with check (public.is_admin());
alter policy challenges_admin_delete on public.challenges using (public.is_admin());
alter policy challenges_admin_read_all on public.challenges using (public.is_admin());
alter policy challenges_admin_update on public.challenges using (public.is_admin()) with check (public.is_admin());
alter policy challenges_admin_write on public.challenges with check (public.is_admin());
alter policy notification_events_admin_read on public.notification_events using (public.is_admin());
alter policy notification_rules_admin_write on public.notification_rules using (public.is_admin()) with check (public.is_admin());
alter policy notification_templates_admin_write on public.notification_templates using (public.is_admin()) with check (public.is_admin());
alter policy reports_admin_read_all on public.reports using (public.is_admin());
alter policy reports_admin_update on public.reports using (public.is_admin()) with check (public.is_admin());
alter policy usage_events_admin_read on public.usage_events using (public.is_admin());

-- Voltar atrás: trocar public.is_admin() por (auth.jwt() ->> 'email') = 'brunemed1310@gmail.com' nas mesmas regras.
