-- 111 -- Escolher o @ uma única vez, no primeiro acesso (2026-10-17).
--
-- Decisões da autora (2026-10-17):
--   - no primeiro acesso a pessoa informa o nome e escolhe o @ (vem sugerido a partir do nome); só pode escolher nesse
--     momento, depois o @ não muda mais; não dá para pular (a sugestão já vem preenchida);
--   - vale para quem tem o @ aleatório da 060 (u + 10 hex) e ainda não escolheu; as contas antigas, com @ tirado do
--     e-mail, ficam como estão;
--   - o @ aceita letras minúsculas, números e ponto entre eles (ex.: raissa.lima), de 3 a 24 caracteres.
-- A tag de autoria dos decks (attribution_tag_for_username, 060) troca o ponto por hífen: para ela continuar única,
-- um @ novo é recusado se outro @ já existente gera a mesma tag (ex.: raissa.lima x raissa_lima antigo).
-- O @ continua imutável para todo o resto (profiles_protect_identity): a única exceção é a troca feita por
-- claim_my_username, uma vez, de um @ aleatório para o escolhido.
-- Sem DROP. Grátis x Premium: tudo grátis.
-- ROLLBACK: recriar profiles_protect_identity da 060; drop das funções novas e da coluna username_chosen_at.

alter table public.profiles add column if not exists username_chosen_at timestamptz;

create or replace function public._username_is_generated(p text)
returns boolean
language sql
immutable
as $$ select coalesce(p, '') ~ '^u[0-9a-f]{10}$' $$;

-- 'ok' | 'invalid' | 'reserved' | 'taken'
create or replace function public._username_problem(p_username text, p_self uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text := lower(btrim(coalesce(p_username, '')));
  v_tag text;
begin
  if v !~ '^[a-z0-9]+(\.[a-z0-9]+)*$' or length(v) < 3 or length(v) > 24 then return 'invalid'; end if;
  if public._username_is_generated(v) then return 'invalid'; end if;
  if v in ('admin', 'administrador', 'adm', 'root', 'suporte', 'support', 'sistema', 'system', 'moderador',
           'prof', 'professor', 'professora', 'profbrune', 'prof.brune', 'brune', 'convidado', 'guest', 'aluno',
           'aluna', 'null', 'undefined', 'anonimo', 'anonymous', 'equipe', 'team', 'oficial', 'official') then
    return 'reserved';
  end if;
  v_tag := public.attribution_tag_for_username(v);
  if exists (select 1 from profiles p where p.user_id <> coalesce(p_self, '00000000-0000-0000-0000-000000000000'::uuid)
             and (p.username = v or public.attribution_tag_for_username(p.username) = v_tag)) then
    return 'taken';
  end if;
  return 'ok';
end;
$$;
revoke all on function public._username_problem(text, uuid) from public, anon, authenticated;

-- Para a tela: o @ está livre? (só para quem ainda pode escolher; não serve para sondar contas à vontade)
create or replace function public.check_username(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then return 'not_authenticated'; end if;
  return public._username_problem(p_username, v_me);
end;
$$;
revoke all on function public.check_username(text) from public, anon;
grant execute on function public.check_username(text) to authenticated;

-- A conta ainda precisa escolher o @? (perfil com @ aleatório e sem escolha registrada)
create or replace function public.my_username_choice_pending()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.username_chosen_at is null and public._username_is_generated(p.username)
                   from profiles p where p.user_id = auth.uid()), false)
$$;
revoke all on function public.my_username_choice_pending() from public, anon;
grant execute on function public.my_username_choice_pending() to authenticated;

-- O @ continua imutável, com uma única exceção: de um @ aleatório (060) para o escolhido, uma vez, pela
-- claim_my_username (que marca a transação). Fora disso, igual à 060.
create or replace function public.profiles_protect_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    if not (coalesce(current_setting('app.username_claim', true), '') = 'on'
            and old.username_chosen_at is null
            and public._username_is_generated(old.username)
            and new.username_chosen_at is not null) then
      raise exception 'username_immutable' using errcode = '42501';
    end if;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id_immutable' using errcode = '42501';
  end if;
  if old.username_chosen_at is not null and new.username_chosen_at is distinct from old.username_chosen_at then
    raise exception 'username_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Escolha do @ e do nome (uma vez). Devolve {ok, username} ou {error}.
create or replace function public.claim_my_username(p_username text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v text := lower(btrim(coalesce(p_username, '')));
  v_name text := nullif(left(btrim(coalesce(p_display_name, '')), 60), '');
  r profiles%rowtype;
  v_problem text;
begin
  if v_me is null then return jsonb_build_object('error', 'not_authenticated'); end if;
  if v_name is null then return jsonb_build_object('error', 'name_required'); end if;
  perform public.ensure_my_profile();
  select * into r from profiles where user_id = v_me for update;
  if r.username_chosen_at is not null or not public._username_is_generated(r.username) then
    return jsonb_build_object('error', 'already_chosen');
  end if;
  v_problem := public._username_problem(v, v_me);
  if v_problem <> 'ok' then return jsonb_build_object('error', v_problem); end if;
  perform set_config('app.username_claim', 'on', true);
  begin
    update profiles set username = v, display_name = v_name, username_chosen_at = now() where user_id = v_me;
  exception when unique_violation then
    perform set_config('app.username_claim', '', true);
    return jsonb_build_object('error', 'taken');
  end;
  perform set_config('app.username_claim', '', true);
  return jsonb_build_object('ok', true, 'username', v, 'display_name', v_name);
end;
$$;
revoke all on function public.claim_my_username(text, text) from public, anon;
grant execute on function public.claim_my_username(text, text) to authenticated;
