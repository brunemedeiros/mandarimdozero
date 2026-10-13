-- 088 -- Fecha ensure_user_decks para quem não está logado (anon).
--
-- Achado (2026-10-13, advisor de segurança da PRODUÇÃO, lint 0028): ensure_user_decks(uuid, text) é
-- SECURITY DEFINER e estava executável por anon na produção. A 049 fez "revoke ... from public" e
-- "grant ... to authenticated", mas o Supabase dá grant direto a anon (default privileges), e esse grant
-- ficou na produção. No Staging o anon já não executa (mesma definição da função nos dois).
--
-- Risco real era baixo: a função já recusa por dentro quando auth.uid() <> p_owner_id (anon tem
-- auth.uid() nulo, então caía em 'not_authorized' antes de criar qualquer Deck). Mesmo assim, anon não
-- tem motivo para chamar: o site só chama depois do login (shared/deck-data.js, ensureDecksForCurrentUser).
--
-- Só revoke/grant: nenhuma linha muda, a função não muda. No Staging é um no-op.
-- ROLLBACK: grant execute on function public.ensure_user_decks(uuid, text) to anon;  (não recomendado)
-- Número 088: 086 e 087 já foram usados por outras conversas.

revoke all on function public.ensure_user_decks(uuid, text) from public, anon;
grant execute on function public.ensure_user_decks(uuid, text) to authenticated;
