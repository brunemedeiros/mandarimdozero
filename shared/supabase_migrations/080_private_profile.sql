-- 080 -- Etapa 3b: perfil privado no banco (docs/plano-professora-privacidade.md, "Decisões finais da Etapa 3").
--
-- * _profile_full_access(dono): quem vê tudo de uma conta privada: a própria conta, a admin, amigo aceito e
--   professora/aluno com vínculo ATIVO (nos dois sentidos).
-- * profiles: leitura só para quem está logado; linha de conta privada só para quem tem acesso total
--   (policy profiles_public_read, alterada sem DROP). Colunas sensíveis (country, admin_mode,
--   exclude_own_activity) deixam de ser legíveis por qualquer um; a própria conta lê tudo por get_my_profile().
--   Plano e papel continuam públicos (decisão da autora).
-- * profile_cards(ids): nome/@/badge em destaque de qualquer conta (ranking, pedidos de amizade, convites);
--   foto só se o perfil é público ou há acesso total.
-- * get_profile_card(@): cartão da página do perfil (também sem login): foto/bio escondidas no perfil privado.
-- * search_profiles_for_friends e search_accounts: conta privada só pelo @ exato; admin vê todas.
-- * Perfil e Decks públicos: amigos e professora com vínculo veem os da conta privada (stats, lista de Decks,
--   Deck, cartões, checagem, mídia e cópia). A troca é feita NO CORPO QUE ESTÁ NO AR (pg_get_functiondef +
--   replace exato, conferido): cada função recebe só a condição nova e nada mais muda. Idempotente: se a
--   condição nova já está lá, pula; se nem a velha nem a nova aparecem, a migration falha sem mudar nada.
-- * Sem login: ranking, badges e conquistas fecham para anon (policies alteradas para authenticated);
--   RPCs de perfil/Deck público perdem anon, menos get_public_deck (cartão do link) e get_profile_card.
-- Sem mudança de dado. Desfazer: reaplicar as versões anteriores (061/062/068/073/079 e a policy com
-- `to anon, authenticated using (true)`) e `grant select on public.profiles to anon, authenticated`.

create or replace function public._profile_full_access(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_owner is not null and (
    auth.uid() = p_owner
    or public._is_admin_uid(auth.uid())
    or exists (select 1 from public.friendships f where f.status = 'accepted'
                and ((f.requester_id = auth.uid() and f.addressee_id = p_owner)
                  or (f.addressee_id = auth.uid() and f.requester_id = p_owner)))
    or exists (select 1 from public.teacher_students t where t.status = 'active'
                and ((t.teacher_id = auth.uid() and t.student_id = p_owner)
                  or (t.student_id = auth.uid() and t.teacher_id = p_owner))))
$$;
revoke execute on function public._profile_full_access(uuid) from public, anon;
grant execute on function public._profile_full_access(uuid) to authenticated;

-- ---------- profiles ----------
alter policy profiles_public_read on public.profiles to authenticated
  using (public_profile or public._profile_full_access(user_id));
revoke select on public.profiles from anon, authenticated;
grant select (user_id, username, display_name, bio, avatar_url, featured_badge_id, created_at, updated_at,
              role, public_profile, plan_tier) on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(p) from public.profiles p where p.user_id = auth.uid()
$$;

create or replace function public.profile_cards(p_ids uuid[])
returns table (user_id uuid, username text, display_name text, avatar_url text, featured_badge_id text, is_private boolean)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.username, p.display_name,
         case when p.public_profile or public._profile_full_access(p.user_id) then p.avatar_url end,
         p.featured_badge_id, not p.public_profile
    from public.profiles p
   where auth.uid() is not null and p.user_id = any(p_ids[1:200])
$$;

create or replace function public.get_profile_card(p_username text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', p.user_id, 'username', p.username, 'display_name', p.display_name,
    'avatar_url', case when p.public_profile or public._profile_full_access(p.user_id) then p.avatar_url end,
    'bio', case when p.public_profile or public._profile_full_access(p.user_id) then p.bio end,
    'featured_badge_id', p.featured_badge_id,
    'is_public', p.public_profile,
    'full_access', p.public_profile or public._profile_full_access(p.user_id))
    from public.profiles p where p.username = lower(btrim(p_username))
$$;

create or replace function public.search_accounts(p_query text, p_limit int default 8)
returns table (user_id uuid, username text, display_name text, avatar_url text, plan_tier text, role text)
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_q text; v_pat text; v_admin boolean;
begin
  if v_me is null then return; end if;
  v_admin := public._is_admin_uid(v_me);
  v_q := translate(lower(btrim(coalesce(p_query, ''))), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  v_q := regexp_replace(v_q, '^@+', '');
  if char_length(v_q) < 2 then return; end if;
  v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  select p.user_id, p.username, p.display_name,
         case when v_admin or p.public_profile or public._profile_full_access(p.user_id) then p.avatar_url end,
         p.plan_tier, p.role
    from public.profiles p
   where (v_admin or p.public_profile or public._profile_full_access(p.user_id) or lower(p.username) = v_q)
     and (p.username ilike v_pat escape '\'
          or translate(lower(coalesce(p.display_name, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') like v_pat escape '\')
   order by (lower(p.username) = v_q) desc, (lower(p.username) like v_q || '%') desc, p.username
   limit least(greatest(coalesce(p_limit, 8), 1), 20);
end $$;

revoke execute on function public.get_my_profile(), public.profile_cards(uuid[]), public.search_accounts(text, int)
  from public, anon;
grant execute on function public.get_my_profile(), public.profile_cards(uuid[]), public.search_accounts(text, int)
  to authenticated;
revoke execute on function public.get_profile_card(text) from public;
grant execute on function public.get_profile_card(text) to anon, authenticated;

-- ---------- ranking, badges e conquistas: só logado ----------
alter policy weekly_xp_public_read on public.weekly_xp to authenticated;
alter policy badge_grants_public_read on public.badge_grants to authenticated;
alter policy earned_badges_public_read on public.earned_badges to authenticated;

-- ---------- perfil e Decks públicos: amigos e professora veem os da conta privada ----------
do $patch$
declare
  r record;
  v_def text;
  v_new text;
  k int;
begin
  for r in
    select * from (values
      ('public.get_public_profile_stats(text)',
       'if not v_public then',
       'if not v_public and not public._profile_full_access(v_user_id) then'),
      ('public.list_public_decks_for_user(text,text)',
       'if v_owner is null or not coalesce(v_public, false) then',
       'if v_owner is null or not (coalesce(v_public, false) or public._profile_full_access(v_owner)) then'),
      ('public.get_public_deck(uuid)',
       'and dk.is_public and dk.kind = ''personal'' and pr.public_profile;',
       'and dk.is_public and dk.kind = ''personal'' and (pr.public_profile or public._profile_full_access(dk.owner_id));'),
      ('public.get_public_deck_notes(uuid)',
       'and dk.is_public and dk.kind = ''personal'' and pr.public_profile;',
       'and dk.is_public and dk.kind = ''personal'' and (pr.public_profile or public._profile_full_access(dk.owner_id));'),
      ('public.check_public_deck_duplicates(uuid,bigint)',
       'and dk.is_public and dk.kind = ''personal'' and pr.public_profile;',
       'and dk.is_public and dk.kind = ''personal'' and (pr.public_profile or public._profile_full_access(dk.owner_id));'),
      ('public.get_public_deck_media_manifest(uuid,jsonb)',
       'and dk.is_public and dk.kind = ''personal'' and pr.public_profile;',
       'and dk.is_public and dk.kind = ''personal'' and (pr.public_profile or public._profile_full_access(dk.owner_id));'),
      ('public.copy_public_deck(uuid,bigint,jsonb,jsonb)',
       'and dk.is_public and dk.kind = ''personal'' and pr.public_profile;',
       'and dk.is_public and dk.kind = ''personal'' and (pr.public_profile or public._profile_full_access(dk.owner_id));'),
      ('public.search_profiles_for_friends(text)',
       'select p.user_id, p.username, p.display_name, p.avatar_url,',
       'select p.user_id, p.username, p.display_name, case when p.public_profile or public._profile_full_access(p.user_id) then p.avatar_url end,'),
      ('public.search_profiles_for_friends(text)',
       E'where p.user_id <> v_me\n    and (',
       E'where p.user_id <> v_me\n    and (p.public_profile or public._profile_full_access(p.user_id) or lower(p.username) = v_q)\n    and (')
    ) as t(fn, old_txt, new_txt)
  loop
    v_def := replace(pg_get_functiondef(r.fn::regprocedure), E'\r\n', E'\n');
    if position(r.new_txt in v_def) > 0 then
      continue;                                   -- já aplicado
    end if;
    k := (char_length(v_def) - char_length(replace(v_def, r.old_txt, ''))) / char_length(r.old_txt);
    if k <> 1 then
      raise exception '080: % tem % ocorrências do trecho esperado (esperava 1)', r.fn, k;
    end if;
    v_new := replace(v_def, r.old_txt, r.new_txt);
    execute v_new;
  end loop;
end
$patch$;

-- ---------- sem login: só o cartão do Deck (link) e o cartão do perfil ----------
revoke execute on function public.get_public_profile_stats(text) from anon;
revoke execute on function public.get_public_flashcards(text, text) from anon;
revoke execute on function public.list_public_decks_for_user(text, text) from anon;
revoke execute on function public.get_public_deck_notes(uuid) from anon;
