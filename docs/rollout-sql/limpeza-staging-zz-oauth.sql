-- STAGING (ilfjzizjfcmhibkhwber) SOMENTE. Apaga as 2 contas fictícias do teste da confirmação do Google Agenda/Notion
-- (migration 156, 2026-11-27; docs/historico/36-auditoria-seguranca-2026-11.md). Nenhum dado real.
-- A ligação de teste do Google/Notion (tokens falsos "ZZ-FAKE-*") e as pendências saem junto (on delete cascade);
-- o perfil também (profiles_protect_delete só deixa o perfil sair junto com a conta).
-- Colar no SQL Editor do Staging e rodar.
begin;
delete from auth.users where email in ('zz-oauth-a@example.invalid', 'zz-oauth-b@example.invalid');
commit;
-- Conferência (devem dar 0):
-- select count(*) from auth.users where email like 'zz-oauth-%@example.invalid';
-- select count(*) from public.oauth_pending_links;
