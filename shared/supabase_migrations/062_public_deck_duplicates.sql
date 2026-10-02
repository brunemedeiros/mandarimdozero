-- 062 -- Public Deck: duplicatas / reimportação (V1). SÓ FUNÇÕES: nenhuma tabela, coluna, índice ou backfill.
-- Contrato: docs/public-decks-duplicatas-contrato.md (rev.3).
--
--  * Identidade = a NOTE na forma NATIVA (public_note_native). Calculada SOMENTE aqui (o JS nunca calcula).
--  * Normalização v1: NFC, trim, espaços colapsados, case-fold (lower), acentos e pontuação PRESERVADOS.
--    (lower() depende do lc_ctype do banco; produção/Supabase é UTF-8.)
--  * Fora da assinatura: autor, Deck, Tags, attribution, mídia, FSRS, ids, lang, role (fora de MC), revision.
--  * Classes: EXACT (ativa/arquivada) | VARIANT | CROSS_FAMILY | NONE | SOURCE_DUPLICATE.
--  * V1 NUNCA altera Note existente. Importar = criar nova árvore com só as Notes novas/selecionadas.
--  * Concorrência: pg_advisory_xact_lock por copiador; a equivalência é recalculada SOB o lock e comparada
--    com o plano confirmado (assinatura + classe). Divergiu => 'duplicates_changed', nada criado.
--  * Limite Free de 20 CardInstances: Free não importa Public Deck (premium_required, inalterado); o custo em
--    CardInstances é calculado no plano (normal=1, reverso=2, cloze=N marcas, mc=1, type_answer=1).
--  * Guardrail técnico 2000 (Notes/mídias da árvore de ORIGEM) segue separado do limite Free.
-- NÃO aplicar em produção sem aprovação.

-- ---------------------------------------------------------------------------
-- 1. Normalização e assinatura (única implementação)
-- ---------------------------------------------------------------------------
create or replace function public._note_norm(t text) returns text
language sql immutable
as $$
  select lower(regexp_replace(
           regexp_replace(normalize(coalesce(t, ''), NFC), '^[\s  -​　]+|[\s  -​　]+$', '', 'g'),
           '[\s  -​　]+', ' ', 'g'))
$$;

-- componente de um Field de conteúdo: texto normalizado + texto do satélite de pinyin (se houver)
create or replace function public._note_field_component(p_fields jsonb, p_field jsonb) returns text
language sql immutable
as $$
  select public._note_norm(p_field #>> '{content,value}') || chr(31) ||
         coalesce((select public._note_norm(x #>> '{content,value}')
                     from jsonb_array_elements(p_fields) x
                    where p_field ->> 'pinyinFieldId' is not null and x ->> 'id' = p_field ->> 'pinyinFieldId'
                    limit 1), '')
$$;

-- partes de identidade de uma forma nativa: {family, mode, sig, vkey, pkey}
create or replace function public._note_dup_parts(p_nat jsonb, p_lang text) returns jsonb
language plpgsql immutable
set search_path = public
as $$
declare
  v_mode text := p_nat ->> 'mode';
  v_fields jsonb := p_nat -> 'fields';
  cf jsonb;
  c0 jsonb; c1 jsonb;
  s0 text; s1 text; raw0 text;
  v_family text; v_sig text; v_vkey text; v_pkey text;
  v_prompt text; v_answer text; v_dis text;
begin
  select jsonb_agg(e order by ord) into cf
    from jsonb_array_elements(v_fields) with ordinality t(e, ord)
   where not exists (select 1 from jsonb_array_elements(v_fields) x
                      where x ->> 'pinyinFieldId' is not null and x ->> 'pinyinFieldId' = e ->> 'id');
  c0 := cf -> 0; c1 := cf -> 1;

  if v_mode = 'multiple_choice' then
    v_family := 'mc';
    select public._note_field_component(v_fields, e) into v_prompt
      from jsonb_array_elements(cf) e where e ->> 'role' = 'prompt' limit 1;
    select public._note_field_component(v_fields, e) into v_answer
      from jsonb_array_elements(cf) e where e ->> 'role' = 'answer' limit 1;
    select coalesce(string_agg(public._note_norm(e #>> '{content,value}'), chr(29) order by public._note_norm(e #>> '{content,value}')), '')
      into v_dis from jsonb_array_elements(cf) e where e ->> 'role' = 'distractor';
    v_sig := 'mc' || chr(30) || p_lang || chr(30) || coalesce(v_prompt, '') || chr(30) || coalesce(v_answer, '') || chr(30) || v_dis;
    v_vkey := 'mc' || chr(30) || p_lang || chr(30) || coalesce(v_prompt, '');
  elsif v_mode = 'cloze' then
    v_family := 'cloze';
    s0 := public._note_field_component(v_fields, c0);
    s1 := case when c1 is null then '' else public._note_field_component(v_fields, c1) end;
    raw0 := public._note_norm(regexp_replace(coalesce(c0 #>> '{content,value}', ''),
              '\{\{c[0-9]+::([^|}]*)(\|[^}]*)?\}\}', '\1', 'g'));
    v_sig := 'cloze' || chr(30) || p_lang || chr(30) || s0 || chr(30) || s1;
    v_vkey := 'cloze' || chr(30) || p_lang || chr(30) || raw0;
  else
    -- família pair: normal, normal_reversed, type_answer (2 slots de conteúdo, posição importa)
    v_family := 'pair';
    s0 := case when c0 is null then '' else public._note_field_component(v_fields, c0) end;
    s1 := case when c1 is null then '' else public._note_field_component(v_fields, c1) end;
    v_sig := 'pair' || chr(30) || p_lang || chr(30) || coalesce(v_mode, '') || chr(30) || s0 || chr(30) || s1;
    v_vkey := 'pair' || chr(30) || p_lang || chr(30) || s0;
    v_pkey := 'pair' || chr(30) || p_lang || chr(30) || s0 || chr(30) || s1;
  end if;
  return jsonb_build_object(
    'family', v_family, 'mode', v_mode,
    'sig', encode(sha256(convert_to(v_sig, 'UTF8')), 'hex'),
    'vkey', encode(sha256(convert_to(v_vkey, 'UTF8')), 'hex'),
    'pkey', case when v_pkey is null then null else encode(sha256(convert_to(v_pkey, 'UTF8')), 'hex') end);
end;
$$;
revoke all on function public._note_dup_parts(jsonb, text) from public, anon, authenticated;
revoke all on function public._note_norm(text) from public, anon, authenticated;
revoke all on function public._note_field_component(jsonb, jsonb) from public, anon, authenticated;

-- assinatura pública de uma Note (forma nativa; NULL = não comparável)
create or replace function public.note_content_signature(r public.own_flashcards) returns text
language plpgsql stable
set search_path = public
as $$
declare nat jsonb := public.public_note_native(r);
begin
  if nat is null then return null; end if;
  return public._note_dup_parts(nat, r.language_app_key) ->> 'sig';
end;
$$;
create or replace function public.note_variant_key(r public.own_flashcards) returns text
language plpgsql stable
set search_path = public
as $$
declare nat jsonb := public.public_note_native(r);
begin
  if nat is null then return null; end if;
  return public._note_dup_parts(nat, r.language_app_key) ->> 'vkey';
end;
$$;
revoke all on function public.note_content_signature(public.own_flashcards) from public, anon, authenticated;
revoke all on function public.note_variant_key(public.own_flashcards) from public, anon, authenticated;

-- custo da Note em CardInstances (regra do limite Free; derivado do modo, nunca persistido)
create or replace function public._note_instance_count(p_nat jsonb) returns int
language plpgsql immutable
set search_path = public
as $$
declare v_mode text := p_nat ->> 'mode'; v_text text; n int;
begin
  if v_mode = 'normal_reversed' then return 2; end if;
  if v_mode = 'cloze' then
    select e #>> '{content,value}' into v_text
      from jsonb_array_elements(p_nat -> 'fields') with ordinality t(e, ord)
     where not exists (select 1 from jsonb_array_elements(p_nat -> 'fields') x
                        where x ->> 'pinyinFieldId' is not null and x ->> 'pinyinFieldId' = e ->> 'id')
     order by ord limit 1;
    select count(distinct m[1]) into n from regexp_matches(coalesce(v_text, ''), '\{\{c([0-9]+)::', 'g') m;
    return greatest(coalesce(n, 0), 1);
  end if;
  return 1;
end;
$$;
revoke all on function public._note_instance_count(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Plano: classifica cada Note ATIVA da árvore pública contra a coleção do copiador
--    (mesmo idioma; ativas E arquivadas; qualquer Deck). Nunca escreve.
-- ---------------------------------------------------------------------------
create or replace function public._public_deck_plan(p_uid uuid, p_ids bigint[], p_lang text)
returns table (pos bigint, f_id bigint, src_deck_id bigint, mode text, sig text, cls text,
               local_archived boolean, local_deck_id bigint, instances int, nat jsonb)
language plpgsql stable
set search_path = public
as $$
begin
  return query
  with loc as (
    select f.id, f.status, f.deck_id, public._note_dup_parts(n.nat, f.language_app_key) p
      from public.own_flashcards f
      cross join lateral (select public.public_note_native(f) as nat) n
     where f.owner_id = p_uid and f.language_app_key = p_lang and n.nat is not null
  ), src as (
    select f.id, f.deck_id, n.nat, public._note_dup_parts(n.nat, p_lang) p,
           row_number() over (order by f.created_at, f.id) rn
      from public.own_flashcards f
      cross join lateral (select public.public_note_native(f) as nat) n
     where f.deck_id = any(p_ids) and f.status = 'active' and n.nat is not null
  ), s2 as (
    select src.*, row_number() over (partition by src.p ->> 'sig' order by src.rn) as sig_rn from src
  )
  select s2.rn, s2.id, s2.deck_id, s2.p ->> 'mode', s2.p ->> 'sig',
         case
           when exists (select 1 from loc where loc.p ->> 'sig' = s2.p ->> 'sig' and loc.status = 'active') then 'exact'
           when exists (select 1 from loc where loc.p ->> 'sig' = s2.p ->> 'sig') then 'exact_archived'
           when s2.sig_rn > 1 then 'source_duplicate'
           when s2.p ->> 'pkey' is not null and exists (
                  select 1 from loc where loc.p ->> 'pkey' = s2.p ->> 'pkey' and loc.p ->> 'mode' <> s2.p ->> 'mode') then 'cross_family'
           when exists (select 1 from loc where loc.p ->> 'family' = s2.p ->> 'family' and loc.p ->> 'vkey' = s2.p ->> 'vkey') then 'variant'
           else 'none'
         end,
         (exists (select 1 from loc where loc.p ->> 'sig' = s2.p ->> 'sig' and loc.status = 'active') = false
            and exists (select 1 from loc where loc.p ->> 'sig' = s2.p ->> 'sig')),
         (select loc.deck_id from loc where loc.p ->> 'sig' = s2.p ->> 'sig' order by (loc.status = 'active') desc, loc.id limit 1),
         public._note_instance_count(s2.nat),
         s2.nat
    from s2
   order by s2.rn;
end;
$$;
revoke all on function public._public_deck_plan(uuid, bigint[], text) from public, anon, authenticated;

-- plano materializado como jsonb (funções STABLE não podem criar tabela temporária)
create or replace function public._public_deck_plan_json(p_uid uuid, p_ids bigint[], p_lang text) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.pos), '[]'::jsonb) from public._public_deck_plan(p_uid, p_ids, p_lang) p
$$;
revoke all on function public._public_deck_plan_json(uuid, bigint[], text) from public, anon, authenticated;

-- Quais Notes serão criadas dado o "plano confirmado" (p_selection = [{sig, cls}]), ou o padrão
-- (somente NONE) quando p_selection é NULL. Valida (sob lock, no copy) contra a classificação atual.
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
      raise exception 'duplicates_changed' using errcode = '40001';
    end if;
    if not (p_plan_cls[v_idx] in ('none', 'variant')) then
      raise exception 'duplicates_changed' using errcode = '40001';
    end if;
    v_out := v_out || v_sig;
  end loop;
  return v_out;
end;
$$;
revoke all on function public._public_deck_resolve_selection(text[], text[], jsonb, boolean) from public, anon, authenticated;

-- nome único entre irmãos (case-fold): Nome, Nome (2), Nome (3)...
create or replace function public._unique_deck_name(p_parent bigint, p_owner uuid, p_name text) returns text
language plpgsql stable
set search_path = public
as $$
declare n int := 1; v_cand text := p_name;
begin
  loop
    exit when not exists (select 1 from public.decks
                           where owner_id = p_owner and parent_deck_id is not distinct from p_parent
                             and lower(name) = lower(v_cand));
    n := n + 1;
    v_cand := p_name || ' (' || n || ')';
  end loop;
  return v_cand;
end;
$$;
revoke all on function public._unique_deck_name(bigint, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. check_public_deck_duplicates -- somente leitura. Premium (ou dono) exigido, como o manifest.
-- ---------------------------------------------------------------------------
create or replace function public.check_public_deck_duplicates(p_public_id uuid, p_dest_deck_id bigint default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  dest public.decks;
  v_ids bigint[];
  v_total int;
  v_parent bigint;
  v_notes jsonb; v_decks jsonb; v_counts jsonb;
  v_plan jsonb;
  v_create_n int; v_create_inst int; v_incompat int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;
  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  select count(*) into v_total from public.own_flashcards where deck_id = any(v_ids) and status = 'active';
  if v_total > public.public_deck_copy_max_notes() then raise exception 'deck_too_large' using errcode = '54000'; end if;

  if p_dest_deck_id is null then
    select id into v_parent from public.decks
     where owner_id = v_uid and kind = 'personal_root' and language_app_key = src.language_app_key;
  else
    select * into dest from public.decks where id = p_dest_deck_id;
    if not found or dest.owner_id is distinct from v_uid or dest.kind not in ('personal_root','personal')
       or dest.language_app_key <> src.language_app_key then
      raise exception 'invalid_destination' using errcode = '22023';
    end if;
    v_parent := dest.id;
  end if;

  v_plan := public._public_deck_plan_json(v_uid, v_ids, src.language_app_key);
  v_incompat := v_total - jsonb_array_length(v_plan);

  select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) into v_counts
    from (select p.cls c, count(*) n from jsonb_to_recordset(v_plan) as p(cls text) group by p.cls) q;

  select coalesce(jsonb_agg(jsonb_build_object(
           'pos', q.rn, 'sig', q.sig, 'cls', q.cls, 'mode', q.mode, 'deck', q.src_deck_id,
           'instances', q.instances,
           'selectable', q.cls in ('none','variant'),
           'selected_default', q.cls = 'none',
           'local_deck_id', q.local_deck_id, 'local_archived', q.local_archived,
           'preview', left(coalesce((select e #>> '{content,value}' from jsonb_array_elements(q.nat -> 'fields') e
                                      where e ->> 'role' is distinct from 'distractor' limit 1), ''), 80),
           'fields', case when q.cls in ('variant','cross_family') then
                       (select jsonb_agg(case when jsonb_typeof(e -> 'audio') = 'object'
                                              then jsonb_set(e, '{audio}', (e -> 'audio') - 'storagePath' - 'generationKey') else e end)
                          from jsonb_array_elements(q.nat -> 'fields') e) end)
           order by q.rn), '[]'::jsonb)
    into v_notes
    from (select p.pos rn, p.* from jsonb_to_recordset(v_plan) as p(pos bigint, f_id bigint, src_deck_id bigint, mode text, sig text,
            cls text, local_archived boolean, local_deck_id bigint, instances int, nat jsonb)) q;

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'parent_id', case when d.id = src.id then null else d.parent_deck_id end, 'name', d.name)
                            order by d.id), '[]'::jsonb)
    into v_decks from public.decks d where d.id = any(v_ids);

  select count(*), coalesce(sum(p.instances), 0) into v_create_n, v_create_inst
    from jsonb_to_recordset(v_plan) as p(cls text, instances int) where p.cls = 'none';

  return jsonb_build_object(
    'language', src.language_app_key,
    'source_total', v_total,
    'incompatible', v_incompat,
    'counts', v_counts,
    'create_default', v_create_n,
    'instances_default', v_create_inst,
    'root_final_name', public._unique_deck_name(v_parent, v_uid, src.name),
    'root_id', src.id,
    'decks', v_decks,
    'notes', v_notes);
end;
$$;
revoke all on function public.check_public_deck_duplicates(uuid, bigint) from public, anon;
grant execute on function public.check_public_deck_duplicates(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Manifest de mídia: só das Notes que serão criadas (substitui a versão da 061)
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_deck_media_manifest(uuid);
create or replace function public.get_public_deck_media_manifest(p_public_id uuid, p_selection jsonb default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  v_ids bigint[];
  v_items jsonb;
  v_count int;
  v_plan jsonb;
  v_sigs text[]; v_cls text[]; v_sel text[];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;
  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  v_plan := public._public_deck_plan_json(v_uid, v_ids, src.language_app_key);
  select array_agg(p.sig order by p.pos), array_agg(p.cls order by p.pos) into v_sigs, v_cls
    from jsonb_to_recordset(v_plan) as p(pos bigint, sig text, cls text);
  v_sel := public._public_deck_resolve_selection(coalesce(v_sigs, '{}'), coalesce(v_cls, '{}'), p_selection, false);

  select coalesce(jsonb_agg(jsonb_build_object('url', u, 'path', public.flashcard_media_path(u)) order by u), '[]'::jsonb)
    into v_items
    from (select distinct m as u
            from jsonb_to_recordset(v_plan) as p(sig text, cls text, nat jsonb)
            cross join lateral public.native_fields_media_urls(p.nat -> 'fields') m
           where p.sig = any(v_sel) and p.cls in ('none','variant')) q;
  v_count := jsonb_array_length(v_items);
  if v_count > public.public_deck_copy_max_media() then
    raise exception 'deck_media_too_large' using errcode = '54000';
  end if;
  return jsonb_build_object('count', v_count, 'items', v_items);
end;
$$;
revoke all on function public.get_public_deck_media_manifest(uuid, jsonb) from public, anon;
grant execute on function public.get_public_deck_media_manifest(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. copy_public_deck V1: nova árvore independente, só Notes novas/selecionadas
-- ---------------------------------------------------------------------------
drop function if exists public.copy_public_deck(uuid, bigint, jsonb);
create or replace function public.copy_public_deck(
  p_public_id uuid, p_dest_deck_id bigint default null,
  p_media_map jsonb default '{}'::jsonb, p_selection jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_premium boolean;
  src public.decks;
  dest public.decks;
  v_root_id bigint;
  v_parent_id bigint;
  v_map jsonb := '{}'::jsonb;
  v_queue bigint[];
  v_cur public.decks;
  v_new_id bigint;
  v_notes_copied int := 0;
  v_skipped int := 0;
  v_media_remapped int := 0;
  v_ids bigint[];
  v_total int := 0;
  f public.own_flashcards;
  nat jsonb;
  v_attr text;
  v_front text;
  v_back text;
  c public.decks;
  v_plan jsonb;
  v_sigs text[]; v_cls text[]; v_sel text[];
  v_need bigint[];
  v_plan_row record;
  v_decks_created int := 0;
  v_name text;
  v_ex int := 0; v_exa int := 0; v_nsel int := 0; v_srcdup int := 0; v_cross int := 0; v_var_unsel int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select (plan_tier = 'premium') into v_premium from public.profiles where user_id = v_uid;
  if not coalesce(v_premium, false) then raise exception 'premium_required' using errcode = '42501'; end if;

  select dk.* into src from public.decks dk join public.profiles pr on pr.user_id = dk.owner_id
   where dk.public_id = p_public_id and dk.is_public and dk.kind = 'personal' and pr.public_profile;
  if not found then raise exception 'unavailable' using errcode = 'P0002'; end if;
  if src.owner_id = v_uid then raise exception 'cannot_copy_own_deck' using errcode = '22023'; end if;

  -- SERIALIZAÇÃO por copiador: duas abas / dois imports do mesmo usuário esperam aqui
  perform pg_advisory_xact_lock(hashtextextended('public_deck_import:' || v_uid::text, 0));

  perform public.ensure_user_decks(v_uid, src.language_app_key);
  if p_dest_deck_id is null then
    select id into v_parent_id from public.decks
     where owner_id = v_uid and kind = 'personal_root' and language_app_key = src.language_app_key;
  else
    select * into dest from public.decks where id = p_dest_deck_id;
    if not found or dest.owner_id is distinct from v_uid or dest.kind not in ('personal_root','personal')
       or dest.language_app_key <> src.language_app_key then
      raise exception 'invalid_destination' using errcode = '22023';
    end if;
    v_parent_id := dest.id;
  end if;

  v_ids := public.public_deck_subtree_ids(src.id, src.owner_id);
  select count(*) into v_total from public.own_flashcards where deck_id = any(v_ids) and status = 'active';
  if v_total > public.public_deck_copy_max_notes() then raise exception 'deck_too_large' using errcode = '54000'; end if;
  perform public._validate_media_map(coalesce(p_media_map, '{}'::jsonb), v_uid);

  -- equivalência RECALCULADA sob o lock; comparada com o plano confirmado (assinatura + classe)
  v_plan := public._public_deck_plan_json(v_uid, v_ids, src.language_app_key);
  select array_agg(p.sig order by p.pos), array_agg(p.cls order by p.pos) into v_sigs, v_cls
    from jsonb_to_recordset(v_plan) as p(pos bigint, sig text, cls text);
  v_sel := public._public_deck_resolve_selection(coalesce(v_sigs, '{}'), coalesce(v_cls, '{}'), p_selection, true);

  select count(*) filter (where p.cls = 'exact'), count(*) filter (where p.cls = 'exact_archived'),
         count(*) filter (where p.cls = 'source_duplicate'), count(*) filter (where p.cls = 'cross_family'),
         count(*) filter (where p.cls = 'variant' and not (p.sig = any(v_sel))),
         count(*) filter (where p.cls = 'none' and not (p.sig = any(v_sel)))
    into v_ex, v_exa, v_srcdup, v_cross, v_var_unsel, v_nsel
    from jsonb_to_recordset(v_plan) as p(sig text, cls text);
  v_skipped := v_total - jsonb_array_length(v_plan);

  -- Decks necessários: os que têm Note a criar + ancestrais (dentro da árvore pública)
  select coalesce(array_agg(distinct id), '{}') into v_need from (
    with recursive anc(id) as (
      select distinct p.src_deck_id from jsonb_to_recordset(v_plan) as p(src_deck_id bigint, sig text, cls text)
       where p.sig = any(v_sel) and p.cls in ('none','variant')
      union
      select d.parent_deck_id from public.decks d join anc on d.id = anc.id
       where d.id <> src.id and d.parent_deck_id = any(v_ids)
    ) select id from anc where id is not null) q;

  if coalesce(array_length(v_need, 1), 0) = 0 then
    return jsonb_build_object('deck_id', null, 'notes_copied', 0, 'skipped_incompatible', v_skipped,
      'skipped_exact', v_ex, 'skipped_exact_archived', v_exa, 'skipped_source_duplicates', v_srcdup,
      'cross_family', v_cross, 'variants_not_selected', v_var_unsel, 'decks_created', 0,
      'decks_omitted', (select count(*) from public.decks where id = any(v_ids)),
      'media_remapped', 0, 'root_name', null);
  end if;

  v_name := public._unique_deck_name(v_parent_id, v_uid, src.name);
  insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
  values (v_uid, 'personal', v_name, src.language_app_key, v_parent_id)
  returning id into v_root_id;
  v_decks_created := 1;
  v_map := jsonb_build_object(src.id::text, v_root_id);
  v_queue := array[src.id];

  while coalesce(array_length(v_queue, 1), 0) > 0 loop
    v_cur := null;
    select * into v_cur from public.decks where id = v_queue[1];
    v_queue := v_queue[2:];

    for f in select * from public.own_flashcards
              where deck_id = v_cur.id and status = 'active' order by created_at, id loop
      select p.* into v_plan_row from jsonb_to_recordset(v_plan) as p(f_id bigint, sig text, cls text, nat jsonb) where p.f_id = f.id;
      if not found then continue; end if;                                  -- incompatível (já contada)
      if not (v_plan_row.sig = any(v_sel) and v_plan_row.cls in ('none','variant')) then continue; end if;
      -- 1 Note por assinatura selecionada: a 1ª ocorrência (cls none/variant) é a única com essa classe
      nat := v_plan_row.nat;
      v_attr := public.note_attribution_tag(f.tags, f.owner_id, v_uid);
      with cf as (
        select e, ord from jsonb_array_elements(nat -> 'fields') with ordinality t(e, ord)
         where not exists (select 1 from jsonb_array_elements(nat -> 'fields') x where x ->> 'pinyinFieldId' = e ->> 'id')
      )
      select
        case when nat ->> 'mode' = 'cloze' then null
             when nat ->> 'mode' = 'multiple_choice'
               then (select e #>> '{content,value}' from cf where e ->> 'role' = 'prompt' limit 1)
             else (select e #>> '{content,value}' from cf order by ord limit 1) end,
        case when nat ->> 'mode' = 'multiple_choice'
               then (select e #>> '{content,value}' from cf where e ->> 'role' = 'answer' limit 1)
             else (select e #>> '{content,value}' from cf order by ord offset 1 limit 1) end
        into v_front, v_back;
      v_media_remapped := v_media_remapped + (select count(*) from public.native_fields_media_urls(nat -> 'fields'));
      nat := jsonb_set(nat, '{fields}', public.native_fields_remap_media(nat -> 'fields', coalesce(p_media_map, '{}'::jsonb)));
      insert into public.own_flashcards
        (owner_id, language_app_key, fields, card_generation_mode, tags, note,
         front, back_trans, front_pinyin, choices, cloze_sentence, cloze_answer, cloze_answer_pinyin,
         front_is_target_language, deck_id, status, revision)
      values
        (v_uid, f.language_app_key, nat -> 'fields', nat ->> 'mode', public.note_copy_tags(f.tags, v_attr), null,
         v_front, coalesce(nullif(v_back, ''), '(sem tradução)'), null, null, null, null, null,
         true, (v_map ->> v_cur.id::text)::bigint, 'active', 0);
      v_notes_copied := v_notes_copied + 1;
    end loop;

    for c in select * from public.decks
              where parent_deck_id = v_cur.id and is_public and kind = 'personal' and owner_id = src.owner_id
                and id = any(v_need)
              order by name, id loop
      insert into public.decks (owner_id, kind, name, language_app_key, parent_deck_id)
      values (v_uid, 'personal', public._unique_deck_name((v_map ->> v_cur.id::text)::bigint, v_uid, c.name),
              c.language_app_key, (v_map ->> v_cur.id::text)::bigint)
      returning id into v_new_id;
      v_decks_created := v_decks_created + 1;
      v_map := v_map || jsonb_build_object(c.id::text, v_new_id);
      v_queue := v_queue || c.id;
    end loop;
  end loop;

  return jsonb_build_object(
    'deck_id', v_root_id,
    'notes_copied', v_notes_copied,
    'skipped_incompatible', v_skipped,
    'skipped_exact', v_ex,
    'skipped_exact_archived', v_exa,
    'skipped_source_duplicates', v_srcdup,
    'cross_family', v_cross,
    'variants_not_selected', v_var_unsel,
    'decks_created', v_decks_created,
    'decks_omitted', (select count(*) from public.decks where id = any(v_ids)) - v_decks_created,
    'media_remapped', v_media_remapped,
    'root_name', v_name);
end;
$$;

revoke all on function public.copy_public_deck(uuid, bigint, jsonb, jsonb) from public, anon;
grant execute on function public.copy_public_deck(uuid, bigint, jsonb, jsonb) to authenticated;
