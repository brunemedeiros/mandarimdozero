-- 148: deixar a conta ATUALIZAR a inscrição de push do próprio aparelho.
--
-- Conferência das notificações (2026-11-25, docs/historico/36-auditoria-seguranca-2026-11.md):
-- shared/push.js grava a inscrição com upsert (INSERT ... ON CONFLICT (user_id, endpoint) DO UPDATE).
-- A 013 só criou regras de SELECT, INSERT e DELETE; sem regra de UPDATE, a 1ª ativação gravava,
-- mas ativar de novo no MESMO aparelho dava "new row violates row-level security policy (USING
-- expression)" e a tela mostrava "não foi possível salvar". Teste no Staging, transação desfeita.
--
-- Só a própria linha (user_id = quem está logado), antes e depois da mudança. Aditiva, sem DROP.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_owner_update'
  ) then
    create policy push_subscriptions_owner_update on public.push_subscriptions
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Voltar atrás (SQL Editor; tem DROP):
-- drop policy push_subscriptions_owner_update on public.push_subscriptions;
