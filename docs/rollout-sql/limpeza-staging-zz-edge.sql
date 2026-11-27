-- STAGING (ilfjzizjfcmhibkhwber) SOMENTE. Apaga a conta fictícia zz-edge-b@example.invalid e o que o teste de IDOR das
-- Edge Functions criou para ela em 2026-11-27 (docs/historico/36-auditoria-seguranca-2026-11.md). Nenhum dado real.
-- Colar no SQL Editor do Staging e rodar.
begin;
delete from public.push_subscriptions where user_id = '4ed09878-034f-4cfe-959a-c98d76e0dc3f';
delete from public.own_flashcards where owner_id = '4ed09878-034f-4cfe-959a-c98d76e0dc3f';
delete from public.reports where id = 31 and description like 'ZZ teste IDOR edge%';
delete from public.profiles where user_id = '4ed09878-034f-4cfe-959a-c98d76e0dc3f';
delete from auth.users where email like 'zz-edge-%@example.invalid';
commit;
-- Conferência (deve dar 0): select count(*) from auth.users where email like 'zz-edge-%@example.invalid';
