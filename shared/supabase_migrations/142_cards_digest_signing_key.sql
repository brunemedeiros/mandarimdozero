-- 142: chave PRÓPRIA para assinar o link "Parar de receber" do e-mail de cartões da professora (pedido da revisão do PR 491, 2026-11-24).
-- Antes a assinatura usava a senha do agendamento (NOTIFICATION_CRON_TOKEN); agora usa um segredo só desta função, gerado AQUI no banco
-- (nunca aparece no repositório nem na conversa) e guardado no Vault (`cards_digest_signing_key`). A Edge Function lê pela função abaixo,
-- que só a service role executa. Links já enviados (assinados com a senha antiga) continuam valendo por conferência na função.
-- Aditiva e idempotente (não recria a chave se já existe). Sem DROP. Desfazer (manual): apagar o segredo do Vault e a função.

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cards_digest_signing_key') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'cards_digest_signing_key',
      'Chave de assinatura do link "Parar de receber" do e-mail de cartões da professora');
  end if;
end $$;

create or replace function public.cards_digest_signing_key()
returns text
language sql
security definer
set search_path = public
as $$
  select public._rb_agent_secret('cards_digest_signing_key')
$$;
revoke execute on function public.cards_digest_signing_key() from public, anon, authenticated;
grant execute on function public.cards_digest_signing_key() to service_role;
