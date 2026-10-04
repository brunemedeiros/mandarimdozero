-- 069 -- Public Deck: `duplicates_changed` deixa de usar SQLSTATE 40001 (retry automático infinito).
--
-- Defeito (P8.2/P8.5, Staging, 2026-10-03): a rejeição deliberada `duplicates_changed` era levantada
-- com errcode 40001 (serialization_failure). O PostgREST trata 40001 como conflito transacional
-- e REPETE a transação automaticamente; como a recusa é determinística, repete sem fim:
--   * Staging: ~16.000 execuções em ~7 min (uma a cada ~10 ms), só pararam quando o Deck foi
--     despublicado; o cliente recebeu HTTP 504 em vez de `duplicates_changed`;
--   * o app trata 504 como resultado incerto e, de propósito, não apaga a mídia já copiada
--     (órfãos no F4 e no tab perdedor da P8.2c). Nenhuma Note/Deck foi criada pelo perdedor.
-- Reproduzido localmente com o PostgREST 12.2.12 real: 40001 => milhares de execuções e o loop
-- continua depois que o cliente desiste; 40P01, P0001, PT409, 22023 e 55P03 => uma execução.
--
-- Correção: SÓ o SQLSTATE das duas ocorrências em _public_deck_resolve_selection muda para PT409.
--   * PT409 é o mecanismo documentado do PostgREST para escolher o status HTTP de um erro
--     ('PT' + status): a resposta vira HTTP 409 Conflict, que é exatamente o significado
--     ("o estado mudou desde o plano; refaça a análise"). Não pertence à classe 40 (transaction
--     rollback), então não é tratado como retryable.
--   * A MENSAGEM continua 'duplicates_changed'; é por ela que o cliente reconhece o erro
--     (shared/public-deck.js, publicDeckErrorCode). Nada no app nem nas migrations depende de 40001.
-- Corpo, assinatura, volatilidade (immutable), search_path e grants idênticos à 062. Lock,
-- seleção, regras EXACT/VARIANT/cross-family, atribuição, mídia, limites e policies inalterados.

create or replace function public._public_deck_resolve_selection(p_plan_sigs text[], p_plan_cls text[], p_selection jsonb, p_strict boolean)
returns text[]   -- assinaturas a criar
language plpgsql immutable
set search_path = public
as $$
declare
  v_out text[] := '{}';
  el jsonb;
  v_sig text; v_cls text; v_idx int;
begin
  if p_selection is null then
    select coalesce(array_agg(s), '{}') into v_out
      from unnest(p_plan_sigs, p_plan_cls) t(s, c) where c = 'none';
    return v_out;
  end if;
  if jsonb_typeof(p_selection) <> 'array' then
    raise exception 'invalid_selection' using errcode = '22023';
  end if;
  for el in select * from jsonb_array_elements(p_selection) loop
    v_sig := el ->> 'sig'; v_cls := el ->> 'cls';
    if v_sig is null or v_cls not in ('none', 'variant') then
      raise exception 'invalid_selection' using errcode = '22023';
    end if;
    v_idx := array_position(p_plan_sigs, v_sig);
    if v_idx is null then
      continue;                       -- Nota saiu do Public Deck: simplesmente não existe mais para criar
    end if;
    if p_strict and p_plan_cls[v_idx] is distinct from v_cls then
      raise exception 'duplicates_changed' using errcode = 'PT409';
    end if;
    if not (p_plan_cls[v_idx] in ('none', 'variant')) then
      raise exception 'duplicates_changed' using errcode = 'PT409';
    end if;
    v_out := v_out || v_sig;
  end loop;
  return v_out;
end;
$$;
revoke all on function public._public_deck_resolve_selection(text[], text[], jsonb, boolean) from public, anon, authenticated;
