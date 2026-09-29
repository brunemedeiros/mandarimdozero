-- Fase C ("Decks, Tags e Painel" -- Deck Engine) -- fix de segurança pontual
-- encontrado durante o teste real de bootstrap (§18/§19 do prompt-mestre da
-- Fase C), não uma decisão de arquitetura nova.
--
-- Achado: `ensure_user_decks()` (migration 049) checava autorização com
--   if auth.uid() is distinct from p_owner_id
--      and (auth.jwt() ->> 'email') <> 'brunemed1310@gmail.com' then
--     raise exception 'not_authorized';
--   end if;
-- Em SQL, `NULL <> 'x'` avalia pra NULL (nunca TRUE), e um `IF NULL THEN`
-- em PL/pgSQL é tratado como FALSE -- ou seja, se `auth.jwt()->>'email'`
-- alguma vez vier NULL (JWT sem a claim 'email'), a checagem inteira
-- silenciosamente falha aberta e uma conta comum consegue bootstrapar
-- Decks (root/personal_root) em nome de QUALQUER outro owner_id.
--
-- Confirmado ao vivo, dentro de uma transação BEGIN...ROLLBACK (sem
-- nenhum dado permanente): simulando uma sessão da aluna (`sub` setado,
-- sem `email` na claim) chamando `ensure_user_decks(<outro_owner_id>,
-- 'frances')` -- a chamada teve sucesso quando deveria ter sido
-- rejeitada com 'not_authorized'.
--
-- Na prática, todo JWT real emitido pelo Supabase Auth pra uma conta
-- com e-mail carrega a claim 'email' (nunca NULL) -- então esse caminho
-- nunca foi alcançado em produção até hoje. Mas é uma falha real de
-- lógica (comparação NULL-unsafe), não uma reformulação de arquitetura --
-- corrigida aqui com `coalesce(...,'')`, o mínimo necessário pra fechar
-- a brecha, sem tocar em mais nada da função.
create or replace function public.ensure_user_decks(p_owner_id uuid, p_language_app_key text)
returns table(root_deck_id bigint, personal_root_deck_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_id bigint;
  v_personal_root_id bigint;
  v_language_label text;
begin
  if p_language_app_key not in ('frances', 'mandarim', 'portugues') then
    raise exception 'Idioma inválido: %', p_language_app_key;
  end if;
  if auth.uid() is distinct from p_owner_id
     and coalesce(auth.jwt() ->> 'email', '') <> 'brunemed1310@gmail.com' then
    raise exception 'not_authorized';
  end if;

  v_language_label := case p_language_app_key
    when 'frances' then 'Francês'
    when 'mandarim' then 'Mandarim'
    when 'portugues' then 'Português'
    else p_language_app_key
  end;

  select id into v_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
  if v_root_id is null then
    insert into public.decks (owner_id, kind, name, language_app_key)
    values (p_owner_id, 'root', v_language_label, p_language_app_key)
    on conflict do nothing
    returning id into v_root_id;
    if v_root_id is null then
      select id into v_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'root';
    end if;
  end if;

  select id into v_personal_root_id from public.decks
    where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
  if v_personal_root_id is null then
    insert into public.decks (owner_id, parent_deck_id, kind, name, language_app_key)
    values (p_owner_id, v_root_id, 'personal_root', 'Meus Decks', p_language_app_key)
    on conflict do nothing
    returning id into v_personal_root_id;
    if v_personal_root_id is null then
      select id into v_personal_root_id from public.decks
        where owner_id = p_owner_id and language_app_key = p_language_app_key and kind = 'personal_root';
    end if;
  end if;

  return query select v_root_id, v_personal_root_id;
end;
$$;
