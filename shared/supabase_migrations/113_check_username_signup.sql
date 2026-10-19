-- 113 -- Conferir o @ na tela de cadastro, antes de a conta existir (2026-10-18).
--
-- Decisão da autora (2026-10-18): no cadastro por e-mail a pessoa escolhe nome e @ na mesma tela e já vê se o @
-- está livre. Até a 111, check_username só funcionava com login.
-- Esta função responde, sem login, só "livre / inválido / reservado / já é de outra pessoa" e, quando não está
-- livre, até 3 sugestões livres. Não devolve nome nem nenhum dado da conta. Não expõe nada novo: o @ já é público
-- (o link #/user/<@> abre o cartão de apresentação sem login, migration 080).
-- As regras do @ são as da 111 (_username_problem): letras minúsculas, números e ponto entre eles, de 3 a 24,
-- palavras reservadas, tag de autoria única. A gravação continua sendo claim_my_username (111), depois do login:
-- se alguém pegar o mesmo @ entre a checagem e a confirmação do código, a claim recusa e a tela oferece sugestões.
-- Só aditiva, sem DROP. Grátis x Premium: tudo grátis.
-- Entrada com mais de 40 caracteres nem é consultada; reservado ou em uso devolve até 3 sugestões livres
-- (sem pontos; com número no fim).
-- ROLLBACK: drop function public.check_username_signup(text);

create or replace function public.check_username_signup(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
  v_status text;
  v_base text;
  v_cand text;
  v_out text[] := '{}';
  i int;
begin
  if length(v) > 40 then return jsonb_build_object('status', 'invalid', 'suggestions', '[]'::jsonb); end if;
  v_status := public._username_problem(v, null);
  if v_status in ('ok', 'invalid') then
    return jsonb_build_object('status', v_status, 'suggestions', '[]'::jsonb);
  end if;
  v_base := left(v, 22);
  v_cand := replace(v, '.', '');
  if v_cand <> v and public._username_problem(v_cand, null) = 'ok' then v_out := v_out || v_cand; end if;
  i := 2;
  while array_length(v_out, 1) is distinct from 3 and i <= 99 loop
    v_cand := v_base || i::text;
    if public._username_problem(v_cand, null) = 'ok' then v_out := v_out || v_cand; end if;
    i := i + 1;
  end loop;
  return jsonb_build_object('status', v_status, 'suggestions', to_jsonb(v_out));
end;
$$;
revoke all on function public.check_username_signup(text) from public;
grant execute on function public.check_username_signup(text) to anon, authenticated;
